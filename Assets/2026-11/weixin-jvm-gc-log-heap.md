# 一行 log.info 打掉 8G 堆：每秒 500MB 大对象，是怎么把老年代喂满的

> 来源：<https://mp.weixin.qq.com/s/m8-jUMxd-_GUG6BXbl_J9A>（微信公众号文章抓取正文）

## 引言

09:02，告警群里跳出一条：`jvm_gc_pause_seconds` P99 = 2.8 秒。

09:12，作者先拍脑袋扩了两台实例——没用，CPU 只有 20%，瓶颈不在算力。

09:20，`jstat` 显示老年代从 45% 涨到 99%，Full GC 每两分钟一次，每次 STW 2.5 秒。接口 P99 从 60ms 变成 3.1s，网关 5xx 占到 12%。

09:40，摘掉一台机器做堆分析，才发现占着 2.1GB 老年代的既不是缓存，也不是连接池，是**日志**——一个报表接口把 35MB 的 JSON 塞进了 `log.info`，而异步日志的队列把它钉在了老年代里。

这篇复盘讲清一条链：**一行看起来人畜无害的日志，怎么在 40 分钟里喂满 8G 堆，把 GC 变成"空转"；以及用三条命令，怎么在 10 分钟内从"怀疑内存泄漏"走到那行代码。**

先给结论：**Full GC 频繁有两种，一种是垃圾太多，一种是活对象太多。前者加内存加机器能缓解，后者只能靠改代码。判据只有一个——Full GC 之后老年代有没有明显下降。**

## 一、第一反应：按内存泄漏查了一圈

上周刚上线 Caffeine 本地缓存，第一嫌疑就是它。查下来：命中率 96%，估算条目 48 万，`maximumSize` 10 万没被突破，没有"缓存无限增长"。

第二嫌疑是连接池和 MyBatis 二级缓存。连接池活跃数稳定在 8 左右；二级缓存线上是全关的（踩过的坑写在《MyBatis 一级二级缓存实战：坑在哪、什么场景必须关掉》），配置也确认了 `cache-enabled: false`。

第三嫌疑是经典 ThreadLocal 泄漏。全局搜 `static final ThreadLocal` 和线程池里的大对象引用，没有任何一处带大字段。线程数稳定，没有线程暴涨。

三条都排除后盯着 `jstat` 的输出看了一会儿，发现一个决定性细节：**Full GC 前后老年代只从 98% 掉到 95%。**

如果是真正的"内存泄漏"，对象会一直涨到 OOM；如果是"垃圾太多"，Full GC 应该能收下去一大截。现在这个形态是第三种——**指针一直有效，GC 每次都白干**。说服团队理解这件事用的一句话：GC 不是变慢了，是它每次都找不到能扔的东西。

顺带解释为什么扩机器完全没用：CPU 只用 20%，说明瓶颈不是算力，而是 STW 期间所有线程都停着。加两台实例，只是多了两台在制造同样的大对象，反而让 Full GC 来得更快。**GC 类故障里，水平扩容经常是负收益，先看 GC 回收后的水位，再决定加不加机器。**

## 二、排查：三条命令把内存拆开看

### 2.1 jstat：先分清是垃圾多还是活对象多

第一步永远是 `jstat`，因为它不停机、不触发 GC。

```
$ jstat -gcutil 8231 1000 10
 S0     S1     E      O      M     CCS   YGC   YGCT   FGC   FGCT   GCT
0.00  45.20   8.31  98.42  96.10  93.8  482  18.60   17  42.50  61.10
0.00   0.00   5.10  98.86  96.12  93.8  483  18.63   18  45.10  63.73
```

两个数字最值得看：`YGC` 482 次配合 6 分钟的采样窗口，意味着 **Young GC 每 3 秒一次**，说明分配速率极高（正常服务一般是分钟级一次）；`FGC` 17 次、`FGCT` 42.5 秒，说明 6 分钟里有 42 秒在 STW。

再把前后两次采样对比：`O` 从 98.42% 到 98.86%，Full GC 之后没降。结合 `E` 每次都能回收到 5%，可以断定：年轻代没问题，**老年代被强引用钉住了**。

### 2.2 histo：看老年代里到底是谁

`jcmd <pid> GC.class_histogram` 会触发一次 Full GC，生产上别直接在流量机器上跑。作者先摘掉一台的流量、确认没有会话状态才执行。输出第一行就锁死了方向：`[C`（char[]）有 476 万个实例、3.8GB，第二名 `java.lang.String` 1.2GB。

`[C` 是 `char[]`，一个 35MB 的字符串底层的字符数组就是 1750 万个 char、占 35MB 堆。单个数组大不算异常，异常的是 **char[] 和 String 合计吃掉了约 70% 的老年代**。这就把嫌疑人从"业务对象"缩小到了"字符串"。

顺带提一句，`jmap -histo:live` 和 `GC.class_histogram` 都会触发 Full GC，而且在大堆上做完这一次 GC 本身就可能耗掉十几秒。**线上优先用 `jstat` 做初筛，确认要动 dump 了再摘流量**——这条规矩救过两次。

### 2.3 dump + MAT：沿引用链找到持有者

`jcmd 8231 GC.heap_dump /tmp/heap.hprof`，8G 堆导出了 10 分钟（当时已经摘流，可以慢）。MAT 里先看 Dominator Tree，第一名是一个 35MB 的 `char[]`；再点 Path to GC Roots（排除弱引用），引用链是这样的：

`char[]` ← `String.value` ← `Object[] argumentArray` ← `LoggingEvent` ← `ArrayBlockingQueue` ← `AsyncAppenderBase` ← `AsyncAppender-Worker-0` 线程。

看到 `LoggingEvent` 的第一反应是不敢信——日志是异步的，写完就该释放了。数了一下队列里的对象：**62 个 LoggingEvent，每个挂着一份 32～38MB 的 JSON 字符串，合计 2.1GB。**

`AsyncAppender` 的 `queueSize` 默认是 256，队列的消费者只有一个线程，磁盘落盘速度根本追不上每秒几百 MB 的生产速度。队列没满，所以没有丢日志、也没有阻塞业务线程，**它只是把 62 个临时大字符串稳稳地存了下来**。

## 三、根因：一次查询结果，被复制成了日志

出事的代码在报表导出接口里，业务逻辑很朴素：

```java
public ReportResult export(ReportQuery query) {
    List<Row> rows = reportMapper.select(query);  // 一次查出 5000 多行
    log.info("report result: {}", JSON.toJSONString(rows));  // ← 就是这行
    return build(rows);
}
```

单次 `JSON.toJSONString(rows)` 的结果在 32～38MB 之间，接口 QPS 15，**约 500MB/s 的分配速率**，折算下来每次 Young GC 只隔 3 秒——和 `jstat` 完全吻合。

真正让 Full GC 频繁的是两步放大：

第一步，**G1 把大对象直接放进老年代**。这台机器 `-Xmx8g`，G1 默认分了 2048 个 region，每个 4MB；单个对象超过 region 一半（2MB）就按 humongous 分配，**不经过年轻代**，也就享受不到"朝生夕死"的筛选。一个 35MB 的 JSON 字符串，横跨 9 个 region，直接算进老年代占用。

第二步，**异步日志队列把它的生命周期拉长了**。正常情况业务方法返回，这个字符串就是垃圾；但它被 `LoggingEvent` 的 `argumentArray` 引用，event 又躺在队列里等落盘，所以它在老年代里一直是"活"的。活对象是收不掉的，于是 Full GC 反复触发、反复收不回来——这就是空转。

还有个容易被忽略的细节：为什么 Young GC 每 3 秒一次，却没能把内存搞定？因为 humongous region 的空间要等一次并发标记周期结束才真正释放，而在分配速率跑赢回收速率时，标记还没走完，老年代又满了，JVM 只能退回 Full GC 兜底。所以 GC 日志里出现 `Humongous allocation` 或 `To-space exhausted` 这类字样时，别犹豫，直接往"谁在分配大对象"上查。

## 四、修复：从"打印全量"到"打印三件套"

### 4.1 止血：先改级别，不改代码

线上代码走发布流程，最快的路径是用 Arthas 动态调级别：`logger --name com.example.report.ReportService --level WARN`。这条命令对 logback 生效，不重启、不掉流量，一分钟后 Full GC 频率从 2 分钟一次降到 40 分钟一次。压制住之后才从容发版，这也是一直建议团队把 Arthas 预装在镜像里的原因——出事时省下的不是几分钟，是决定先止血还是先定位的判断空间。

### 4.2 根治：日志只留摘要

```java
// 改后：条数 + 耗时 + 一条裁剪过的样本
long cost = System.currentTimeMillis() - start;
log.info("report done, size={}, cost={}ms, sample={}",
         rows.size(), cost, Sample.of(rows));

// Sample.of 只取首行，并把单字段截断到 200 字符
static String of(List<Row> rows) {
    if (rows.isEmpty()) return "-";
    return StringUtils.abbreviate(rows.get(0).toString(), 200);
}
```

这里有个最容易误解的点：**`log.info("x: {}", JSON.toJSONString(rows))` 里的 `toJSONString` 是提前执行的**，和 INFO 级别开不开、异步不同步都无关，参数先算完才交给框架。想真的延迟求值，用 SLF4J 2.0 的 fluent API：`logger.atInfo().addArgument(() -> heavy()).log("x={}")`，或者老实地套 `if (logger.isInfoEnabled())`。团队最后选的是最简单的一条——**日志参数里禁止出现任何序列化调用**。

队列配置也跟着调，但别指望它兜底：

```xml
<appender name="ASYNC" class="ch.qos.logback.classic.AsyncAppender">
  <queueSize>1024</queueSize>
  <!-- 0 表示队列快满也不丢弃 INFO，宁可阻塞业务线程 -->
  <discardingThreshold>0</discardingThreshold>
  <neverBlock>false</neverBlock>
  <appender-ref ref="ROLLING"/>
</appender>
```

反直觉的地方在于：`queueSize` 从 256 调到 1024，**如果对象还是大的，只是允许把 1024 × 35MB 钉在内存里**，不是解决问题，是把爆炸当量放大。队列只能缓冲"小对象 + 尖峰"，大对象必须从源头掐掉。

发版后没只看告警消失，连续三天盯了两个指标：`jvm_gc_pause_seconds` 的 5 分钟均值是否回到 0.05 以下；老年代在 GC 后的峰值有没有缓慢爬升的锯齿。第二天锯齿又出现了——另一个接口在异常分支里打印完整请求体，单次只有 3MB，但下游批量失败时每秒能触发上百次，一并改掉才真正平了。**大日志往往不止一处，第一处只是最容易触发告警的那处。**

| 指标 | 修复前 | 修复后 |
| --- | --- | --- |
| 老年代占用 | 98%～99% | 12%～18% |
| Full GC | 每 2 分钟一次 | 0 次/天 |
| 单次 STW | 2.5 秒 | 无 Full GC |
| 分配速率 | 约 500MB/s | 约 5MB/s |
| 接口 P99 | 3.1 秒 | 55 毫秒 |

## 五、同类预防：把"大日志"变成能被拦住的问题

### 5.1 监控与工具

告警要能看出"回收不掉"，不能只看 GC 次数：`rate(jvm_gc_pause_seconds_sum[5m]) > 0.3` 抓频繁停顿，同时用 `jvm_memory_used_bytes{area="heap",id="G1 Old Gen"}` 看 Full GC 后的水位——**回收后仍高于 85% 就该查活对象，而不是继续加堆**。

定位分配热点不要只靠 dump。JFR 用 profile 模板常开，开销低于 1%，`jdk.ObjectAllocationSample` 能直接告诉你哪个方法在制造大对象（`jcmd <pid> JFR.start duration=3m filename=alloc.jfr settings=profile`），比抓 8G 堆快得多。这条后来加进了 SOP（原文此处有 JFR 分配采样结果配图，`JSON.toJSONString` 占据最大样本占比）。

规范层面落成了三条能写进 review 检查表的硬规则：日志参数里不出现任何序列化调用；集合、响应体、SQL 结果集一律走统一的 summary 工具；异常分支只打异常栈和业务主键，不打请求体。最后一条是这次事故的衍生品——异常路径的日志量平时看不见，一旦下游批量失败，它会在几秒内把分配速率重新打起来。

### 5.2 避坑清单

- **参数位置的方法调用一定会执行**。日志级别、异步、`isDebugEnabled` 都救不了已经算完的参数，只有 Supplier 或显式守卫能救。
- **别用日志打印集合、响应体、SQL 结果集**。MyBatis 把 `log-impl` 配成 SLF4J 且日志级别是 DEBUG 时，会打印完整结果集，和生产大日志是同一个坑。
- **异步队列不是内存保护**。它是有界队列，钉住的是强引用；队列扩容只会让"活对象"更多。
- **不要拿 `jmap -histo:live` 在高峰机器上试手**，它本身触发一次 Full GC，大堆上可能直接把服务拖死。
- **看到 Full GC 先看"回收后水位"**，别看次数。次数高可能是垃圾多，水位降不下去才是活对象多。

## 收尾

> 大日志引发的内存问题，本质不是"日志写得太频繁"，而是把一次查询结果复制了一份塞进老年代，还被异步队列留住了引用——源头打印摘要，队列才有意义，GC 才收得动。

原文结尾还提问：线上有没有用 `JSON.toJSONString` 打印过整个列表？或被 MyBatis 的 DEBUG 结果集日志坑过？作者会挑典型案例拆成下一篇。
