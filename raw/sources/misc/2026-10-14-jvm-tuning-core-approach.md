---
title: 一文掌握 JVM 调优核心思路
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/WbvAxdkPoUYWzRPSZdK-gw
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-22
inbox_ref: Inbox/2026-10-14-jvm-tuning-core-approach.md
---

# 一文掌握 JVM 调优核心思路

> 说明：正文按 source_url 重抓收录（采集稿缺失）；1x1 占位图与代码围栏为渲染规范化，语义未改。

JVM 调优很容易从参数开始，也很容易在参数里迷路。

接口变慢了，把 `-Xmx` 调大；Full GC 多了，换一个收集器；Pod 被 OOMKilled，再把堆缩小一点。每次改动都像是在处理问题，但如果没有先确认时间和内存花在了哪里，参数改得越多，后面越难解释。

调优的顺序应该反过来：先定目标，留下基线，再判断瓶颈。等证据指向 JVM，才轮到堆大小、收集器和 GC 参数。

## 先定目标

“让系统快一点”没法验收。一次调优至少要固定一个可测目标，例如在 2000 QPS 下把接口 P99 从 800ms 降到 300ms 以内，或者把批处理吞吐提高 20%，同时保证 Pod 的内存不越过 limit。

这些目标之间会互相影响。更激进的低延迟设置可能吃掉更多 CPU；堆给得更大，GC 频率可能下降，但内存余量和故障恢复时间也会变化。没有哪组参数能把延迟、吞吐和占用一起无限压低。

改参数前，先在相同流量和相同采样时长下留一份基线。我通常会把业务指标和运行时指标放在一起看：QPS、P99、错误率，堆在 GC 后的水位、对象分配速率、暂停时间，再加上进程 CPU、RSS 和容器内存。只看 GC 日志，容易把数据库慢、锁等待或者下游超时也算到 JVM 头上。

## 时间花在哪

JDK Flight Recorder 适合先做这一步。它能把线程、方法热点、锁、文件 I/O、网络 I/O 和 GC 放在同一条时间线上。Oracle 文档给出的说法是，标准 profiling recording 在多数应用中的开销通常低于 2%，但生产环境仍要先在自己的流量下验证，不能把这个数字当保证。

可以在启动时录一段：

```bash
-XX:StartFlightRecording=filename=/data/logs/app.jfr,settings=profile,dumponexit=true,maxsize=1G
```

也可以在进程运行后临时开启：

```bash
jcmd <pid> JFR.start name=problem settings=profile duration=10m \
  filename=/data/logs/problem.jfr
```

线程长期在 RUNNABLE，先看 CPU 热点；BLOCKED 集中出现，去找锁竞争；Socket Read 占住大量时间，慢点多半在下游。只有业务线程的停顿和 GC 时间线能对上，GC 才是当前值得继续追的方向。

这里还有一个容易误用的功能：JFR 的 Heap Statistics 默认没有开启，启用后会额外触发 Old GC。排查对象保留当然可以用，但拿它测接口延迟，结果会被采集动作本身干扰。

## GC 日志看什么

JDK 9 以后可以用统一日志把 GC 和 Safepoint 一起留下：

```bash
-Xlog:gc*,safepoint:file=/data/logs/gc.log:time,uptime,level,tags:filecount=10,filesize=100M
```

我不会先数一天发生了多少次 GC。更有用的是 Young GC 的间隔、单次和累计暂停、GC 后 Old 区水位、Full GC 的触发原因，以及对象分配和晋升速度。

几个现象很容易混在一起：

• Young GC 越来越密，但 GC 后 Old 区很稳定，往往是分配速率升高。先看流量和临时对象，不急着判定内存泄漏。

• GC 后 Old 区仍持续上涨，才需要顺着堆转储找对象保留链。只把堆调大，通常只是把 Full GC 往后推。

• 日志出现 `Metadata GC Threshold`，排查类加载和 Metaspace；看到 G1 的 Humongous Allocation，检查大对象和 Region 使用情况。它们不是同一个问题。

• GC 暂停不长，Safepoint 却很突出，就要继续看线程到达安全点的耗时，别只围着收集器转。

`-XX:MaxGCPauseMillis` 也是目标，不是暂停时间的硬上限。把它从 200ms 改到 50ms，不代表每次暂停都会小于 50ms；G1 可能改用更小、更频繁的回收批次，CPU 消耗也可能跟着上升。

## 堆外还要留位置

容器 limit 是 4 GiB，不能顺手把 `-Xmx` 也设成 4 GiB。JVM 进程除了 Java Heap，还要放 Metaspace、Code Cache、线程栈、Direct Buffer、GC 自身的数据结构和 JNI 分配。线程多、Netty 堆外缓存大时，这些内存并不少。

如果希望 JVM 按容器内存比例计算堆，可以先用一组保守值起步：

```bash
-XX:InitialRAMPercentage=50.0
-XX:MaxRAMPercentage=75.0
```

这组值只是示例。4 GiB limit 下，75% 大约给堆留下 3 GiB，上限之外还有约 1 GiB。这个余量够不够，要看线程数、堆外缓存和实际 RSS。已经明确配置 `-Xms`、`-Xmx` 时，堆大小以显式参数为主，不要再把百分比参数当作主要上限。

怀疑堆外内存时，可以提前开启 Native Memory Tracking：

```bash
-XX:NativeMemoryTracking=summary
```

运行后再查看分类占用：

```bash
jcmd <pid> VM.native_memory summary scale=MB
```

NMT 必须在 JVM 启动时开启，也会带来额外开销。它适合定位内存去了哪里，不必因为“以后也许用得上”就在所有服务里永久打开。

## 总结

问题如果落在对象分配，就先减掉无意义的临时对象、过大的批次和重复序列化；Old 区水位回不去，再查保留链。锁竞争和 I/O 等待要回到代码、连接池或依赖服务处理，换 GC 收集器帮不上忙。

确认暂停时间影响了业务，再比较堆大小、暂停目标或收集器。每轮只改一个主要变量，并保留原始参数、流量、JFR、GC 日志和回退条件。P99 降了，但 CPU 长期多吃一倍，不能只凭一张更好看的延迟图宣布调优结束。
