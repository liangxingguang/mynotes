# Java 线上排查实战：OOM、超时、闪退、GC 抖动、死锁

环境：Ubuntu 24.04 / JDK 17 / Arthas 4.3.5 / 4GB 内存 / 2 核。所有数据均为真实执行结果，非模拟。

在虚拟机上模拟五种最常见的线上事故——内存溢出、接口超时、应用闪退、频繁 GC 性能抖动、线程死锁与阻塞，从问题复现到定位根因，完整走一遍排查流程。

## 01 内存溢出（OOM）：堆满了怎么办

程序跑着跑着报 **OutOfMemoryError: Java heap space**，响应变慢或直接挂掉。模拟程序每秒往静态 List 塞 1MB byte 数组，只进不出，堆限 128MB。

启动命令：

```bash
java -Xmx128m -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/home/panda/oom_heapdump.hprof OOMDemo
```

用 **jmap -histo** 看堆里什么对象最多：

```
$ jmap -histo 21479 | head -10
 num     #instances         #bytes  class name
   1:          7434       63255104  [B (byte array)
   2:           482         242896  [I
   3:          1459         179760  java.lang.Class
```

一目了然：**byte 数组占 63MB**，7434 个实例。约 40 秒后堆满，JVM 自动 dump 堆快照（66MB），用 MAT（Memory Analyzer Tool）打开即可看到完整对象引用链——谁持有这些 byte[] 不释放。

**排查思路总结：**

1. 加 `-XX:+HeapDumpOnOutOfMemoryError`，OOM 时自动 dump
2. `jmap -histo <PID>` 快速看什么对象最多
3. dump 文件用 MAT 分析引用链找泄漏根因
4. 进程还活着时，Arthas `dashboard` 实时看内存区域变化

## 02 接口超时：一层一层剥到底

接口偶发超时最烦人：RT 忽高忽低，日志偶尔几秒慢请求，代码看着没问题。模拟调用链 `handleRequest() → queryData() → processData() → callRemoteApi()`，queryData 30% 概率慢 2 秒，callRemoteApi 20% 概率超时 3 秒。

**第一层：trace handleRequest**

```bash
trace TimeoutDemo handleRequest -n 5 --skipJDKMethod false
```

```
// 正常请求 102ms
`---[101.73ms] handleRequest()
    +---[49.68%] Thread:sleep()      50.54ms
    +---[29.92%] queryData()         30.43ms
    +---[20.04%] processData()       20.38ms
    `---[0.14%]  formatResponse()    0.14ms

// 慢请求 2077ms
`---[2077.83ms] handleRequest()
    +---[2.52%]  Thread:sleep()      52.33ms
    +---[96.32%] queryData()       2001.44ms
    +---[0.99%]  processData()       20.51ms
    `---[0.00%]  formatResponse()    0.10ms
```

慢请求里 **queryData() 占 96.32%**（2001ms）。但有时候慢请求是 3000ms，说明还有别的慢调用，继续往下 trace。

**第二层：trace processData**

```
// 慢请求 3000ms
`---[3000.55ms] processData()
    +---[100.00%] callRemoteApi()  3000.41ms
    `---[0.00%]   toUpperCase()      0.03ms
```

抓到：**callRemoteApi() 慢时 3000ms，正常 20ms**。再用 watch 抓入参返回值确认场景：

```bash
watch TimeoutDemo callRemoteApi {params,returnObj} -n 3 -x 2
```

慢请求返回 `timeout_response` 耗时 3000ms；快请求返回 `api_fast_data_...` 耗时 20ms。根因找到。

**排查思路总结：** trace 从外到内逐层追，先找占比最大的方法再往下 drill；watch 抓入参返回值确认场景。不用猜，数据说话。

## 03 应用闪退：进程突然消失

早上发现进程没了，日志戛然而止，没有 error——通常两种原因：JVM 自己 OOM 退出，或被 Linux OOM Killer 杀了。

**JVM OOM 退出**：堆限 256MB，开 GC 日志，程序快速分配 10MB 大对象。GC 日志关键信号：

```
[3.484s][info][gc] GC(43) Pause Full (G1 Compaction Pause)
  243M->243M(256M) 10.038ms
```

1. **Full GC 243M→243M**：回收前后一样，堆彻底满了
2. **Humongous regions: 242**：G1 把大对象全放 Humongous 区，全占满

然后 JVM 打 dump（224MB），打印 `heap,exit` 日志退出。

**被 OOM Killer 杀掉**：JVM 堆没满但进程消失，可能是系统内存不足时内核挑最大占用进程杀掉。排查：

```bash
sudo dmesg | grep -i "oom\|kill\|out of memory"
```

看到 `Out of memory: Killed process XXXX (java)` 即是。

**怎么区分**：有 GC 日志、有 dump、日志有 OutOfMemoryError → JVM 自己 OOM；日志戛然而止、无 error、dmesg 有 kill 记录 → 被 OOM Killer 杀了。

## 04 频繁 GC：接口性能抖动的隐形杀手

最隐蔽的场景：平均 RT 没问题，P99 偶尔飙高，监控图是平稳线带尖刺，无报错。模拟程序：后台线程每 10ms 分配 256KB 对象制造内存 churn，前台每 500ms 处理请求（业务耗时 30ms），堆 128MB、年轻代 32MB。

```bash
java -Xmx128m -Xms128m -Xmn32m \
  -Xlog:gc*:file=/home/panda/gc_demo.log:time,uptime,level,tags GCDemo
```

用 **jstat -gc** 看：YGC 列 8 秒内从 57 涨到 65，**每秒 1 次 Young GC**；YGCT 8 次 GC 花 50ms，每次约 6ms。

```bash
$ grep -c "Pause Young" gc_demo.log
130
```

**53 秒内 130 次 Young GC**，每秒 2.3 次，单次 5-10ms——请求 RT 就是从 30ms 抖到 37ms 的原因。根因：32MB 年轻代太小，分配速度远超回收速度。调大年轻代：

```bash
java -Xmx512m -Xms512m -Xmn256m GCDemo
```

对比：

- 优化前（32MB）：**130 次 GC / 53 秒 = 每秒 2.3 次**，单次 5-10ms，RT 30-37ms
- 优化后（256MB）：**8 次 GC / 16 秒 = 每秒 0.5 次**，单次 13-16ms，RT 稳定 30ms

细节：调大年轻代后**单次停顿反而变长**（扫描范围更大），但频率降 4 倍多，总 GC 开销大降。GC 调优的核心权衡：**不是让每次 GC 更快，而是让 GC 总共更少**。

**排查思路总结：** jstat 看 GC 频率和耗时，GC 日志看单次停顿，对比调优前后验证。请求 RT 抖动先查 GC，别急着查代码。

## 05 线程死锁与阻塞：CPU 不高但接口全超时

迷惑特征：CPU 很低、内存正常，但接口大面积超时、QPS 断崖下跌、RT 飙升、日志无 error。第一个怀疑对象就是线程。模拟程序一次造四种问题：经典死锁、线程池耗尽、锁竞争、IO 阻塞，13 个业务线程 10 个卡住。

先上 **jstack**：

```
Found one Java-level deadlock:
"deadlock-thread-1": waiting to lock monitor ... which is held by "deadlock-thread-2"
"deadlock-thread-2": waiting to lock monitor ... which is held by "deadlock-thread-1"
  at DeadlockDemo.lambda$main$0(DeadlockDemo.java:18)
  at DeadlockDemo.lambda$main$1(DeadlockDemo.java:28)
Found 1 deadlock.
```

jstack 直接报 **Found 1 deadlock**，两个线程互相持有对方需要的锁，代码行号都给了。再用 Arthas 看全貌：

```bash
$ thread --state BLOCKED
Threads Total: 28, RUNNABLE: 9, BLOCKED: 2, WAITING: 10, TIMED_WAITING: 7

$ thread --state WAITING
14  pool-1-thread-1   WAITING 0.0
15  pool-1-thread-2   WAITING 0.0
16  pool-1-thread-3   WAITING 0.0
18  lock-waiter-0     WAITING 0.0
...
```

**8 个线程 WAITING**：pool-1-thread-1/2/3 全卡在 CountDownLatch；lock-waiter-0~4 等同一把 ReentrantLock。CPU 全 0.0%——线程都卡着没干活，当然不吃 CPU。

狠命令 **thread -b**，直接找谁在阻塞别人：

```
"lock-holder-thread" Id=17 TIMED_WAITING
  at java.lang.Thread.sleep(Native Method)
  at DeadlockDemo.lambda$main$3(DeadlockDemo.java:55)
  Number of locked synchronizers = 1
  - ReentrantLock$NonfairSync@565fc501
      <---- but blocks 5 other threads!
```

一句话锁定元凶：**lock-holder-thread 持 ReentrantLock 阻塞 5 个线程**，在第 55 行 sleep 不释放锁。

**线程池耗尽要点**：3 个线程全卡 CountDownLatch，新任务没线程可用就排队。配了拒绝策略会抛 RejectedExecutionException；没配就无限等待，表现即接口超时。

**排查思路总结：** jstack 看 `Found 1 deadlock` 确认死锁；Arthas `thread --state BLOCKED/WAITING` 看阻塞全貌；`thread -b` 直接找阻塞源。CPU 不高但接口超时，先查线程状态。

## 06 五个场景的通用排查思路

**第一步：判断进程是否还在**

- 在 → 用 Arthas / jmap 实时诊断
- 不在 → 看 dmesg / GC 日志 / dump 文件

**第二步：定位问题类型**

- 内存问题 → jmap -histo + dump 分析
- 超时问题 → Arthas trace 逐层追 + watch 抓现场
- 闪退问题 → GC 日志 + dmesg 排查
- GC 抖动 → jstat 看频率 + GC 日志看停顿时间
- 线程阻塞 → jstack 看死锁 + Arthas thread 看阻塞源

**第三步：拿到证据再动手**——不要凭经验猜，先用工具拿数据。

**生产环境建议：**

1. **必须加 HeapDumpOnOutOfMemoryError**：线上 OOM 没有 dump 就是瞎子摸象
2. **GC 日志必须开**：JDK17 用 `-Xlog:gc*:file=gc.log`，闪退时 GC 日志是唯一时间线
3. **dump 文件定期清理**：一个几百 MB，用 `-XX:HeapDumpPath` 指定到单独挂载点
4. **Arthas 用完记得 stop**：常驻目标 JVM 有额外性能开销

这五个场景的排查能力不是看了文章就会的，建议在测试环境自己跑一遍，等线上真出事了手才不抖。
