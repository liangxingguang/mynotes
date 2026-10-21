---
id: 2026-10-21-gc-log-tuning-practice
title: GC 日志分析与调优实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Owc57OzkgLibnuUd1ZiZ9w
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/gc-log-tuning-practice.md
wiki_status: pending
---

# GC 日志分析与调优实战

> JVM 调优系列第 9 篇。调优不是拍脑袋改 -Xmx，而是「开日志→读指标→定假设→压测验证」的闭环：JDK9+ 用 `-Xlog:gc*` 滚动日志，Minor GC 看 Eden/Heap/Times（real 才是真实停顿），Full GC 看触发原因与停顿秒数；量化三指标=吞吐量（>95~99%）、最大停顿、停顿频率。附 G1（MaxGCPauseMillis 是目标不是保证、IHOP 调低让 Mixed GC 提前）与 ZGC（基本不用调，只看 Pause 行验证 <10ms）参数模板、jstat 实时观测技巧、内存泄漏早期信号（老年代锯齿上移、FGC 单调递增）、Prometheus 告警规则与完整调优案例。核心纪律：一次只动一个参数，用前后压测对比说话。

## 核心要点

- **日志开启**：`-Xlog:gc*:file=...:time,uptime,level,tags:filecount=10,filesize=100M`（JDK9+）；生产必配 `-XX:+HeapDumpOnOutOfMemoryError`
- **读日志**：Times 里 real=真实停顿，user+sys>real 因多 GC 线程并行；Full GC 频繁是红色警报，先看触发原因（Allocation Failure/Metadata/Ergonomics/System.gc）
- **三指标**：吞吐量=(运行−GC)/运行、最大停顿（SLA 卡这项）、停顿频率；jstat -gcutil 实时盯，`FGCT` 在涨立刻警惕
- **G1 模板**：MaxGCPauseMillis=200（设 50 反噬吞吐）、IHOP=35 让 Mixed GC 更早、G1ReservePercent=15 防晋升失败
- **内存泄漏信号**：老年代锯齿上移（FGC 后回不到低位）、FGC 次数单调递增、Survivor 持续偏高→提前晋升
- **方法论**：定目标（吞吐 vs 延迟）→看基线→定假设→压测验证；一次只改一处，案例：仅调 IHOP 45→35，FGC 从 6 次/h 降到 0.5 次/h，P99 从 1.2s 降到 380ms

## 正文

全文（含日志逐行拆解、G1/ZGC 模板、Prometheus 告警规则）见 [[Assets/2026/10/gc-log-tuning-practice]]。

## 来源

[GC日志怎么看？手把手调优实战](https://mp.weixin.qq.com/s/Owc57OzkgLibnuUd1ZiZ9w)

## 附件

- [[Assets/2026/10/gc-log-tuning-practice]]
