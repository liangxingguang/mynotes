---
id: wiki-source-arthas-06-flame-graph
type: source
title: 一张火焰图，看懂慢在哪
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - profiler
  - flame-graph
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-06-flame-graph.md
related:
  - wiki/entities/arthas.md
  - wiki/sources/arthas-01-attach-first-conclusion.md
  - wiki/sources/arthas-03-thread-command.md
  - wiki/sources/arthas-04-watch-trace-tt.md
  - wiki/sources/arthas-05-jad-hot-reload.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# 一张火焰图，看懂慢在哪

## Overview（概览）

性能诊断文章（公众号专辑《arthas使用》第 6 篇）：讲 Arthas `profiler` 生成的火焰图怎么读。核心三件事——横轴不是时间线而是样本占比、怎么找"平顶"热点、以及为什么明明很慢图上却看不到（CPU 模式看不到等待）。顺带说清采样该采多久（30–60 秒且覆盖问题时段）、profiler 做不到的三件事、以及从图到动作的对照表。核心主张：火焰图的价值是把"感觉慢"变成"这一段占了多少"。

## Key Facts（关键事实）

- **profiler 底层是 async-profiler**：`profiler start` 开始采样，`profiler stop` 结束并生成文件；最常用的两种模式是 CPU 模式（看谁在占 CPU）与内存分配模式（看谁在频繁创建对象）。
- **采样时长 30–60 秒，且必须覆盖问题发生的那段时间**：只在高并发时出现的问题，低峰期采一分钟图会很干净——干净不代表没问题。
- **三条读图规则**：① 横轴不是时间线，是样本占比（所有调用栈合并排序后横向铺开，越宽代表采到的样本越多，从左到右不是"先发生什么后发生什么"）；② 上下是调用关系（上面的方块调用下面的，往上看"谁调了我"，往下看"我调了谁"）；③ 找"平顶"——往下没有子调用的方块就是这段逻辑真正干活的地方，又宽又平顶的就是热点。
- **三个常见误读**：① 把横轴当时间线（最常见的错）；② 以为"宽"就是"慢"——宽只说明采样到它的次数多，可能真的耗 CPU，也可能只是被调用次数太多，后者该优化调用次数而非方法本身；③ 图上看不到等待——线程卡在 IO、等锁、等 DB 返回时，CPU 模式下几乎不出现在图上，所以"图很干净但接口很慢"是正常的，这时候要换 wall 模式看墙钟时间。
- **从图到动作的对照表**：平顶在业务代码 → 优化算法、减少循环、避免重复序列化；平顶在框架或工具类 → 先看配置和用法，别急着改框架；零星分布没有明显平顶 → 可能是 GC、锁竞争或线程切换，回到 `dashboard` 看 GC；图很干净但接口慢 → 在等 IO，CPU 空闲，换 wall 模式重采。
- **profiler 做不到的三件事**：① 不判断对错（图上说这段占四成，不说明这四成该不该花）；② 只看本进程（跨服务的耗时看不到，要靠链路追踪）；③ 采样窗口外的调用看不到（一次性长任务、低频定时任务容易被漏掉，要么拉长窗口，要么在任务执行时采）。
- **采样的两个操作细节**：先看负载再采（峰值更有意义但开销也更大，选一个服务扛得住的时段）；先止损再分析，别让"采个图看看"拖慢了处置。
- **火焰图的价值**：把"感觉慢"变成"这一段占了多少"——讨论的不再是"我觉得这里有问题"，而是"这个方块占了四成"。

## Important Claims（重要论断）

### 横轴是样本占比，不是时间线

「所有调用栈被合并、排序之后横向铺开，越宽代表采到的样本越多。所以从左到右不是'先发生什么后发生什么'。」这是火焰图最基础也最容易被误解的规则——同一段代码的所有样本会被合到一起，不按时间顺序排列。

### "宽"不等于"慢"

「宽只说明采样到它的次数多。它可能是真的耗 CPU，也可能是被调用次数太多——后者要优化的是调用次数，不是方法本身。」（解读：性能优化的对象可能是调用方而非被调用方，火焰图只告诉你"哪里被采样到"，不告诉你"该改哪里"。）

### CPU 模式看不到等待

「如果线程卡在 IO、等锁、等数据库返回，CPU 模式下它几乎不出现在图上。」这解释了为什么"图很干净但接口很慢"是正常现象——CPU 空闲不代表没问题，需要换 wall 模式看墙钟时间。（解读：火焰图的盲区是 IO 等待类问题，必须配合 wall 模式或链路追踪补全。）

## Concepts Introduced（引入的概念）

- 火焰图读法（三条规则 + 三个误读 + 对照表）：本篇为该概念的主信源。Flame graph reading methodology 是性能诊断的通用技能，不仅限于 Arthas profiler，但本篇以 Arthas 为载体讲解。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（profiler 命令的载体，底层 async-profiler）

## Implications（影响／启示）

- 与 [[arthas-01-attach-first-conclusion|Arthas 上手]] 的 6 命令速查互证：速查表里"profiler 采性能"一条在此获得完整的读图方法（三条规则 + 三个误读 + 对照表）。
- 与 [[arthas-03-thread-command|thread 命令怎么读]] 互补：thread 看的是线程状态（RUNNABLE/BLOCKED），profiler 看的是 CPU 采样分布；两者分别覆盖"等"和"算"两类问题。
- 与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 一致：先采图定位热点，再决定是否调 JVM 参数——图是证据，不是结论。
- "先看负载再采"与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的"先目标基线"原则一致：采样本身也要在正确的时段做，否则证据无效。
- "先止损再分析"与 [[arthas-07-when-not-to-use|什么时候不该用 Arthas]] 的决策顺序第一条互证：告警响时先止血，别让采样拖慢处置。
- "只看本进程"的局限与 [[arthas-07-when-not-to-use|什么时候不该用 Arthas]] 的"不该用场景二（跨服务排查）"互证：跨服务耗时要靠链路追踪，profiler 帮不上忙。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（一张 base64 gif、一张 svg），正文信息无损；对照表字段在采集稿中被拆行，已按语义还原为表格。
- 未覆盖 flame graph 的具体生成命令参数（如 `--format flame`）、async-profiler 的其他模式（如 wall 模式的详细用法），以及如何将火焰图与链路追踪结合使用。
- 原文以 Arthas profiler 为载体，但火焰图读法本身是通用性能诊断技能，不限于 Java/Arthas 生态。

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页）
- [[arthas-01-attach-first-conclusion|Arthas 上手]]（6 命令速查互证）
- [[arthas-03-thread-command|thread 命令怎么读]]（线程状态 vs CPU 采样互补）
- [[arthas-04-watch-trace-tt|watch、trace、tt：把方法看透的三件套]]（方法级观察 vs 采样分析）
- [[arthas-05-jad-hot-reload|改了代码没生效？先 jad 一下，再谈热更新]]（版本核实 vs 性能定位）
- [[arthas-07-when-not-to-use|什么时候不该用 Arthas]]（决策顺序互证）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（先定位再动手）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-06-flame-graph.md`
