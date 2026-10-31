---
id: wiki-source-arthas-03-thread-command
type: source
title: CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - thread
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-03-thread-command.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/thread-stack-reading.md
  - wiki/concepts/threadpoolexecutor-internals.md
---
# CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读

## Overview（概览）

thread 命令深读文章（公众号专辑《arthas使用》第 3 篇）：讲清三种「卡」的区分、thread 的三条用法、读栈的顺序、线程池耗尽的识别方法，以及三个最容易误判的地方。核心：thread 的价值是排除两个错误方向。

## Key Facts（关键事实）

- **三种「卡」先分类**：① CPU 真在算（RUNNABLE 且在跑业务代码，死循环/正则回溯/大对象序列化）→ 改代码；② 在等锁（BLOCKED，等 `synchronized` monitor，特征：一堆线程停在同一位置）→ 拆锁或降并发；③ 在等外部响应（RUNNABLE 但停在 socket 读/DB 连接/HTTP 调用）→ 看下游。
- **thread 三条用法**：`thread -n 3` 列最忙三线程（CPU 高第一条就敲）；`thread -b` 找阻塞源（怀疑死锁或大面积卡顿）；`thread 线程号` 看完整栈。
- **读栈顺序：状态 → 你的代码 → 卡在等什么**。先看 RUNNABLE/BLOCKED/WAITING/TIMED_WAITING；再翻到自己的 `com.xxx` 包（栈顶几帧通常是 JDK 的）；最后看卡在哪个方法（`socketRead0`/`pooledConnection`/`await` 说明在等不在算）。
- **关键判断**：状态是 RUNNABLE 但 CPU 并不高——它多半在等 IO。
- **线程池耗尽识别**：线程名成批出现、编号连成一片（`pool-1-thread-1` 到 `-200`）全部停在同一提交点或下游调用上；看单个线程没用，要看总量与分布（`dashboard` 线程总数 + 排队堆积）。线程池耗尽是下游变慢的连锁反应，改池参数只能缓解。
- **三个最易误判**：① RUNNABLE ≠ 在算；② CPU 高可能是 GC/`C2 CompilerThread` 等非业务线程（去看内存与 GC）；③ 一次采样不能代表持续（隔几分钟再抓一次，两次同点才下结论）。

## Important Claims（重要论断）

### thread 的价值是排除方向

「thread 的价值不是看到线程在干什么，是帮你排除掉两个错误方向——排掉「不是在算」和「不是在等锁」，剩下的可能性就不多了。」与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的「先排除方向再动手」一致。

### 线程池耗尽的根因在下游

「线程池耗尽不是线程的问题，是下游变慢导致的连锁反应。」——修池参数只能缓解，根因在下游。

## Concepts Introduced（引入的概念）

- [[thread-stack-reading|线程栈读法]]（本篇为该概念的主信源）。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（thread 命令载体）；[[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（池参数是缓解手段，根因在下游）

## Implications（影响／启示）

- 与 [[arthas-01-attach-first-conclusion|Arthas 上手]] 的「三线程停同一方法即烧 CPU」判断法互证：本篇给出其理论依据（RUNNABLE 在算 vs 在等 IO 的区分）（解读）。
- 「隔几分钟抓两次栈」是低成本高回报的采样纪律，可推广到所有快照类诊断命令（解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（正文信息无损）；对照表字段被拆行，已按语义还原。
- 未覆盖虚拟线程场景下的栈读差异（见 [[thread-stack-reading|线程栈读法]] 的开放问题）。

## Related Knowledge（相关知识）

- [[thread-stack-reading|线程栈读法]]（概念页）
- [[arthas|Arthas]]（实体页）
- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]（池机制）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-03-thread-command.md`
