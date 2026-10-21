# GC 日志分析与调优实战

> 来源：https://mp.weixin.qq.com/s/Owc57OzkgLibnuUd1ZiZ9w
> 抓取时间：2026-10-21（web-fetch，browser 级）

调优不是拍脑袋改 `-Xmx`。先开 `-Xlog:gc*`，把日志拉出来，看三个数：**停顿次数、停顿时长、吞吐量**。

## 一、先把日志打开

JDK 9 起，GC 日志统一用 `-Xlog` 框架，语法是 `tag=level:output:decorators`。最实用的开法：

```
-Xlog:gc*:file=/var/log/gc-%t.log:time,uptime,level,tags:filecount=10,filesize=100M
```

含义：

- `gc*`：所有 gc 相关 tag 的日志
- `file=...`：输出到滚动文件，`%t` 是时间戳
- `time,uptime,level,tags`：每行带「真实时间、启动后时长、级别、tag」
- `filecount=10,filesize=100M`：保留 10 个文件，每个 100M，防磁盘爆

JDK 8 及之前用老式 `-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log`，参数不同但目的一样。

## 二、读一次 Minor GC 日志

G1 的年轻代回收日志片段：

```
[2026-08-27T10:01:23.456+0800] GC(12) Pause Young (Normal) (G1 Evacuation Pause)  [Eden: 800.0M(800.0M)->0.0B(700.0M) Survivors: 100.0M->150.0M Heap: 2.1G(8.0G)->1.5G(8.0G)]  [Times: user=0.21 sys=0.03, real=0.04 secs]
```

逐段拆：

- `Pause Young (Normal)`：这是一次普通年轻代 GC
- `Eden: 800M->0`：Eden 被清空
- `Survivors: 100M->150M`：存活对象进了 Survivor，容量自适应调整
- `Heap: 2.1G->1.5G`：堆从 2.1G 降到 1.5G，回收了 600M
- `Times: user=0.21, sys=0.03, real=0.04`：**real 是真实停顿 40ms**；user+sys > real 是因为多线程并行（多个 GC 线程的 CPU 时间累加）

## 三、读一次 Full GC 日志

Full GC 是要警惕的信号。日志里会看到：

```
Pause Full (Allocation Failure)  [Heap: 7.9G->7.8G(8.0G)]  [Times: user=1.2 sys=0.1, real=1.4 secs]
```

重点看 **real=1.4 secs**——一次 1.4 秒的全局停顿，期间所有请求卡死。右侧还会显示触发原因：`Allocation Failure`（分配失败）、`Metadata GC Threshold`（元空间阈值）、`Ergonomics`（自适应触发）、`System.gc()`（显式调用）。

看到 Full GC 频繁，就是调优的红色警报。

## 四、关键指标怎么算

不要只看「有没有 GC」，要看三个量化指标：

- **吞吐量** = (应用运行时间 − GC 时间) / 应用运行时间。行业经验：多数后台服务要 > 95%~99%
- **平均停顿** / **最大停顿**：用户感知的是最大停顿，SLA 通常卡这一项
- **停顿频率**：每分钟几次？每次多长？

JDK 自带的 `jstat -gcutil <pid> 1s` 能实时看各代使用率和 GC 次数/耗时：

```
S0  S1  E   O   M   CCS  YGC  YGCT  FGC  FGCT  GCT
0  12 45  67  92  88   320  8.2   3   1.4  9.6
```

`YGCT/YGC` 是平均年轻代停顿，`FGCT` 是 Full GC 总耗时——若 `FGCT` 在涨，立刻警惕。

## 五、调优方法论：四步走

别一上来就堆参数，按闭环走：

1. **定目标**：先问「要吞吐还是要延迟」。目标不同，调法相反。
2. **看现状**：开日志 + 压测，统计出**基线**（当前吞吐、平均/最大停顿、Full GC 频率）。
3. **定假设**：基于基线，判断「最可能改善的那一个参数」。比如 Full GC 频繁 → 多半是堆太小或晋升太快。
4. **压测验证**：改**一处**，量**一次**，对比基线。有效就固化，无效就回滚换假设。

调优是**科学实验**，不是玄学。一次只动一个变量，否则你永远不知道哪个参数起作用。

## 六、G1 调优模板

```
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200        # 停顿目标，别太小
-XX:InitiatingHeapOccupancyPercent=35   # 更早启动 Mixed GC
-XX:G1ReservePercent=15         # 防晋升失败
-XX:+HeapDumpOnOutOfMemoryError # 出事留现场
-Xmx8g -Xms8g
```

要点：

- `MaxGCPauseMillis` 设 50 比设 200 吞吐差很多——它是「目标」不是「保证」，设太狠 JVM 会频繁小 GC 反噬
- 老年代涨得快、Mixed GC 来不及 → 调低 `IHOP`
- Humongous 对象多 → 拆大对象或调大 Region

## 七、ZGC 调优模板

```
-XX:+UseZGC
-XX:SoftMaxHeapSize=32g
-Xmx48g
-Xlog:gc*                        # ZGC 日志信息量足，看 pause 时长验证
```

ZGC 调优极简：**基本不用调收集器参数**，主要管好堆上限和监控停顿。它把复杂度藏在内部了。核心验证手段就是看日志里的 `Pause` 行，确认停顿真在 10ms 内。

## 八、常见反模式

1. **只加 `-Xmx` 不换收集器**：堆翻倍但还用 Parallel，Full GC 照样几秒
2. **同时开矛盾参数**：比如既要 G1 又要 `-XX:+UseConcMarkSweepGC`，JVM 会忽略或报错
3. **不看日志凭感觉调**：「听说 MaxGCPauseMillis=50 好」就设，结果吞吐崩了都不知道
4. **生产不开日志**：出了事连排查的现场都没有——`-XX:+HeapDumpOnOutOfMemoryError` 是底线

## 九、用 jstat 持续观测

日志文件适合事后分析，`jstat` 适合**实时盯**。常用：

```
jstat -gcutil <pid> 1000   # 每 1 秒刷一次各代使用率与 GC 统计
jstat -gccause <pid> 1000  # 额外显示上次 GC 的触发原因
```

`-gcutil` 各列含义：`E`(Eden 使用率)、`O`(老年代)、`M`(元空间)、`YGC/YGCT`(年轻代次数/耗时)、`FGC/FGCT`(Full GC 次数/耗时)、`GCT`(GC 总耗时)。

一个判断技巧：**如果 `O` 列只涨不跌，且 `FGC` 在增加但 `O` 不掉，基本是内存泄漏**（对象回收不掉）；如果 `YGC` 每秒暴涨而每次很短，说明对象产生太快、新生代太小。

## 十、日志可视化：GCeasy / GCViewer

纯文本日志人眼读着累，有两个免费工具能直接出图：

- **GCeasy**（在线）：上传 gc.log，自动出吞吐量、停顿分布、堆使用曲线、问题诊断建议，新手友好
- **GCViewer**（开源）：本地跑，画出堆大小和 GC 停顿时间序列

这类工具的价值是**把「感觉慢」变成「停顿 P99=320ms、吞吐 96%」的量化结论**，方便和老板/团队对齐调优目标。

## 十一、一个完整调优案例（前后对比）

某 Web 服务，8G 堆，默认 G1，压测下 P99 接口延迟 1.2s，吞吐仅 92%。

**基线（看日志）**：`MaxGCPauseMillis` 没设（默认 200），但老年代涨得快，Mixed GC 来不及，`FGC` 每小时 6 次，单次 800ms。

**假设**：老年代回收跟不上晋升速度 → 让 Mixed GC 更早启动。

**改动一处**：`-XX:InitiatingHeapOccupancyPercent=35`（从默认 45 调低）。

**验证（再压测）**：Mixed GC 提前启动，老年代不再堆积，`FGC` 降到每小时 0.5 次，单次 <100ms。结果：P99 降到 380ms，吞吐升到 98.5%。

**关键**：只动了一个参数，用前后压测数据对比证明有效。如果当时同时改了三个参数，就永远不知道是哪个起作用。

## 十二、从日志发现内存泄漏的早期信号

调优不只是「慢了才调」，更要**提前发现隐患**。日志里这几个征兆，说明内存泄漏在萌芽：

- 老年代使用率呈**锯齿但整体上移**：每次 Full GC 后都回不到低位，说明有对象只进不出
- `FGC` 次数随时间单调递增，且每次 `FGCT` 占比越来越高
- Minor GC 后 Survivor 区占用持续偏高 → 对象提前晋升老年代

出现这些，别等 OOM，直接抓堆快照定位常驻大对象。

## 十三、G1 日志分段详解（进阶）

G1 的并发周期在日志里是一串事件，读懂它们才能精调：

- `Concurrent Mark`：并发标记耗时，过长说明堆大或存活多
- `Concurrent Rebuild Remembered Sets`：重建 RSet，开销大时说明卡表脏得快（跨代引用多）
- `Pause Remark`：STW，若过长，可调 `-XX:ParallelGCThreads` 或看是否引用变动剧烈
- `Mixed GC` 次数多：说明老年代 Region 回收频繁，可考虑调低 IHOP 让回收更平滑

把每个事件耗时做成时序图，哪里长就优化哪里，比盲目调参靠谱。

## 十四、生产告警规则示例

把前面指标接进监控系统（Prometheus + Alertmanager），几条实用规则：

```
# 老年代使用率持续 > 85%
jvm_memory_used{area="old"} / jvm_memory_max{area="old"} > 0.85  → 预警

# 最近 5 分钟 Full GC 次数 > 3
rate(jvm_gc_collection_seconds_count{action="end of major GC"}[5m]) > 0.01 → 告警

# 最大 GC 停顿 > 1s
max_over_time(jvm_gc_pause_seconds_max[5m]) > 1 → 告警
```

告警的意义不在于「出事再叫」，而在于**在 OOM 前就暴露趋势**，给你留出排查窗口。

## 十五、调优文档化与团队沉淀

调优不是一次性的，要沉淀成团队资产：

1. **记基线**：每次调优前后把关键指标（吞吐/停顿/Full GC 频率）记下来，形成对比
2. **写决策记录**：为什么设这个参数、依据哪次压测、预期效果——半年后别人接手不至于一头雾水
3. **建模板**：把 G1/ZGC 参数模板、告警规则存进团队的脚手架，新服务开箱即用
4. **复盘**：每次 OOM/长停顿事后写一页复盘，归因为「代码问题 / 配置问题 / 容量问题」

调优能力真正值钱的，不是你会背多少参数，而是**有一套可复用的、文档化的方法论**。

## 十六、调优的心态

调优最忌「焦虑式调参」——看到停顿就慌，抄一堆参数堆上去，结果更糟。真正的高手是**先观测、再假设、慢验证、勤记录**。GC 日志不会骗人，数据会告诉你答案。把「开日志→读指标→定假设→压测验证」刻进肌肉记忆，调优就从玄学变成工程。

## 总结

> 调优的本质是「开日志 → 读指标 → 定假设 → 压测验证」的闭环。先会读 Minor/Full GC 日志里的 Eden/Heap/Times，再算吞吐量、停顿、频率三项，最后用 G1/ZGC 模板落地。记住：一次只动一个参数，用数据说话，别玄学。
