---
id: wiki-source-2026-11-03-weixin-full-gc-troubleshooting
type: source
title: 一次Full GC排查实录——从GC日志到根因，完整推理链拆给你看
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - source
  - java
  - jvm
  - gc
  - troubleshooting
sources:
  - raw/sources/architecture/2026-11-03-weixin-full-gc-troubleshooting.md
related:
  - wiki/concepts/oom-troubleshooting.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/topics/jvm-gc.md
---
# 一次Full GC排查实录——从GC日志到根因，完整推理链拆给你看

## Overview（概览）

Java 内存泄漏排查实战复盘（作者前年处理的真实案例，细节脱敏），2026-11 采集。核心理念：GC 排查本质是刑侦——GC 日志是现场、dump 是尸检、根因是凶手；"重启能解决"只是销毁证据。完整演示从告警到根因的推理链：GC 日志读"回收无效"→jmap dump→MAT（Leak Suspects + Dominator Tree + Path to GC Roots）锁定持有者→代码定罪→时间线交叉验证；修法三层（止血/治本/防线）。

## Key Facts（关键事实）

- 案例现场：服务每隔 20 秒一次 Full GC，每次暂停 800ms-1.2s，接口 P99 飙到 3 秒；GC 日志 `[Full GC (Ergonomics) [ParOldGen: 409598K->409596K]]`——回收前后老年代只差 2K，活对象占满、垃圾清不掉。
- 三条线索：①回收前后老年代几乎不变（活对象占满）②触发原因 Ergonomics（老年代到顶）③20 秒一次说明老年代被快速填满；排除流量突增（那种场景 GC 后能降下来）。
- dump 纪律：活着的服务 dump 会 STW 几十秒（4G 堆），选流量低的节点；`jmap -dump:live,format=b,file=heap.hprof <pid>`（live 先触发 Full GC，销毁的是"临死对象"现场，要找的是活着的凶手）。
- MAT 两报告：Leak Suspects 直接给嫌疑（本例 ConcurrentHashMap 占 2.1GB、52% 堆）；Dominator Tree 按持有内存排序 + Path to GC Roots（排除弱引用）找持有者——静态字段 `RiskLabelCache`。
- 定罪：`LABEL_CACHE.putIfAbsent(key, queryLabel(userId))` 全文无 remove、无 size 上限、无过期机制；key 模式 `"user:风险标签:88123xxx"`；日活 40 万 × 每 key 约 1KB ≈ 日涨 400MB，4G 老年代约十天打满；上次重启恰好十天前（发布），完美解释"重启能解决"。
- 修法三层：止血（加监控+临时定时清理，凌晨低峰重启，知道是止血不是治疗）；治本（Caffeine maximumSize=50万 + expireAfterWrite=1小时，命中率实测 93%；Guava Cache 次选；Redis 外置适合值大/多实例共享）；防线（静态集合类字段列入 code review 必查项、老年代使用率 80% 持续 5 分钟告警、jcmd GC.class_histogram 定期采集）。
- 面试三段式：现象 30 秒（周期性 Full GC + 回收前后老年代几乎不变=活对象占满=泄漏嫌疑）→排查 60 秒（日志→dump→MAT→代码→时间线）→根因与修复 30 秒。
- 灵魂拷问：全局搜 `static.*Map|static.*List` 数有几个配了淘汰策略；作者自述中招率不低于 50%；无界静态集合是 Java 内存泄漏头号模板，测试环境永远测不出来（数据量不够），上线十天半月才爆发。

## Important Claims（重要论断）

### Claim 1：GC 排查本质是刑侦

日志是现场，dump 是尸检，根因是凶手；重启解决不了内存问题，只是把证据销毁了，一个月后必复发。

### Claim 2：无界静态集合是 Java 内存泄漏的头号模板

`static + Map/List/Set + 只 put 不 remove` = 泄漏模板；可怕之处在于测试环境永远测不出来，上线十天半月才爆发。

### Claim 3：证据链要闭环

"背的答案经不起追问，推理链欢迎追问"——回收前后老年代几乎不变→dump 找大户→GC Roots 找持有者→代码确认无淘汰机制→时间线（重启后十天复发）交叉验证，每一步都有可核查的证据。

## Concepts Introduced（引入的概念）

- [[oom-troubleshooting|OOM 排查方法论]]（本信源印证并补充：刑侦三步、静态缓存泄漏案例、Caffeine 治本）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（"先证据后动作"同构）
- GC 刑侦三步（日志看现场/dump 做尸检/代码定罪）——本信源提出，暂归 [[oom-troubleshooting]] 承载

## Entities Mentioned（提及的实体）

- MAT（Eclipse Memory Analyzer）：Leak Suspects / Dominator Tree / Path to GC Roots 三报告
- Caffeine（有界缓存首选：maximumSize+expireAfterWrite）、Guava Cache（次选）、Redis（外置选项）
- jmap、jcmd（GC.class_histogram）、-Xlog:gc*（JDK8 为 -XX:+PrintGCDetails）

## Implications（影响／启示）

- "重启能解决"是销毁证据：清空缓存只是回到十天前的起点，必复发。
- 修法必须三层齐备：止血（当天）→治本（当周，换有界结构）→防线（当月，review 检查项+告警+巡检），缺一层都会复发或漏检。
- 面试/复盘讲推理链而非背答案：每一步证据可核查、可追问。

## Limitations（局限）

- 单一信源（公众号实战复盘），案例已脱敏；数值（2.1GB/52%、日涨 400MB、93% 命中率）为作者自述，无第三方验证。
- "十天打满"为按日活×key 大小估算的推导值，非实测。
- 未覆盖 OOM Killer、元空间泄漏等其他泄漏类型；93% 命中率未说明统计口径（时间窗/请求量）。

## Related Knowledge（相关知识）

- [[oom-troubleshooting|OOM 排查方法论（概念页）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优（概念页）]]
- [[jvm-gc|JVM 垃圾回收（主题）]]

## Source（信源）

- `raw/sources/architecture/2026-11-03-weixin-full-gc-troubleshooting.md`
