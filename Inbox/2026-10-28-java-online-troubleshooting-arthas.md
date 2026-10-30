---
id: 2026-10-28-java-online-troubleshooting-arthas
title: Java线上排查实战：OOM、超时、闪退、GC抖动、死锁
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/jHZuIXbFH7Rt03FC4jCzKw
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/java-online-troubleshooting-arthas.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-30T00:36:49.442Z"
ingest_claim_id: 22876-1793320609442-0
---

# Java线上排查实战：OOM、超时、闪退、GC抖动、死锁

> 真实环境（JDK17 + Arthas）复现五类线上事故并完整走排查流程：OOM 用 jmap+MAT，超时用 trace 逐层剥，闪退分 JVM OOM 与 OOM Killer，GC 抖动用 jstat，死锁阻塞用 jstack + thread -b。

## 核心要点

- **OOM**：`-XX:+HeapDumpOnOutOfMemoryError` 自动留现场 → `jmap -histo` 看大户 → MAT 分析引用链。
- **接口超时**：Arthas `trace` 从外到内逐层追（找占比最大的方法），`watch` 抓入参返回值确认场景——不猜，用数据说话。
- **闪退**：有 GC 日志/dump/OOMError → JVM 自己 OOM；日志戛然而止 + `dmesg` 有 kill 记录 → 被 OOM Killer 杀。
- **GC 抖动**：P99 尖刺先查 GC。`jstat -gc` 看频率，GC 日志看停顿。调优核心是**让 GC 总共更少，而非每次更快**（年轻代 32M→256M：每秒 2.3 次→0.5 次）。
- **死锁/阻塞**：CPU 不高但接口全超时先查线程。`jstack` 直接报 deadlock，`thread -b` 一句话定位阻塞源；线程池耗尽无拒绝策略 = 请求无限等待。
- **生产建议**：必开 heap dump 参数与 GC 日志；dump 放单独挂载点定期清理；Arthas 用完 `stop`。
- 通用套路：进程在→实时诊断，不在→看日志现场；拿到证据再动手。

## 正文

见 [[Assets/2026/10/java-online-troubleshooting-arthas.md|抓取正文]]，含完整命令、真实输出数据与调优前后对比。

## 来源

- [Java线上排查实战：OOM、超时、闪退、GC抖动、死锁](https://mp.weixin.qq.com/s/jHZuIXbFH7Rt03FC4jCzKw)（微信公众号）

## 附件

- [[Assets/2026/10/java-online-troubleshooting-arthas.md]]
