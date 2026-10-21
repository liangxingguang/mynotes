---
id: 2026-10-21-jvm-gc-troubleshooting-arthas
title: JVM GC 排查实战（Arthas 版）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/WCrdRXRWCWtYzRRyLVMj2A
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/jvm-gc-troubleshooting-arthas.md
wiki_status: pending
---

# JVM GC 排查实战（Arthas 版）

> Full GC 频繁的七步排查法（Arthas 优先，比 jstat/jmap 效率高一个量级）：dashboard 看全局趋势 → jvm/memory 看配置 → 按「OU 降幅 vs 持续上涨」判定根因（晋升过快/内存泄漏/CMS 碎片/元空间类泄漏/堆太小）→ 分场景处理 → 验证修复。关键判定表：OU 每次 FGC 后降幅>50%=提前晋升，OU 持续涨 FGC 后不降=内存泄漏，OU 不高却 FGC=CMS 碎片，Metaspace>90%+Metadata GCThreshold=类泄漏。附 MAT 三步定位大对象（Leak Suspects→Dominator Tree→Path to GC Roots）、classloader 命令判类泄漏、五大常见泄漏点与分场景参数处方。

## 核心要点

- **判定矩阵**：dashboard 刷新几次看 OU 趋势即可分流根因——降幅大=晋升过快（查 -Xmn/SurvivorRatio/MaxTenuringThreshold），只涨不降=泄漏（heapdump --live 后 MAT 分析），Metaspace 满=类加载问题
- **MAT 三步**：Leak Suspects 嫌疑报告 → Dominator Tree 按 Retained Heap 降序 → Path to GC Roots（排除 weak/soft/phantom）看谁抓住不放
- **类泄漏判据**：classloader 隔几分钟对比是否增长；同一 ClassLoader 多份实例=泄漏；Spring Boot 正常 loadedCount 5000~20000、Metaspace 50~120MB，超 200MB 要查
- **常见泄漏点**：HashMap 只 add 不 remove、ThreadLocal 没 remove、ConcurrentHashMap 当无上限缓存、静态集合、监听器未取消注册
- **分场景处方**：晋升过快→大年轻代+SurvivorRatio 4+晋升阈值 15；CMS 碎片→换 G1；System.gc()→删代码或 -XX:+DisableExplicitGC；类泄漏→修 CGLIB/Groovy 缓存，临时调大 MaxMetaspaceSize
- **闭环**：改完用 dashboard 持续对比 YGC/FGC 频率、耗时与 OU 趋势验证，不靠感觉

## 正文

全文（含 Arthas 命令全集、判定矩阵表、MAT 操作步骤）见 [[Assets/2026/10/jvm-gc-troubleshooting-arthas]]。

## 来源

[JVM GC排查实战篇](https://mp.weixin.qq.com/s/WCrdRXRWCWtYzRRyLVMj2A)

## 附件

- [[Assets/2026/10/jvm-gc-troubleshooting-arthas]]
