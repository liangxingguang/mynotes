---
id: wiki-concept-thread-stack-reading
type: concept
title: 线程栈读法
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - java
  - thread
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-03-thread-command.md
  - raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md
  - raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/threadpoolexecutor-internals.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/oom-troubleshooting.md
---
# 线程栈读法

## Definition（定义）

一套读取 `thread` / `jstack` 栈输出的系统化方法：先按线程状态区分三种「卡」（在算、等锁、等外部响应），再按「状态 → 自己的包名 → 卡在等什么」三步顺序读栈，用线程名分布识别线程池耗尽，并以「隔时二次采样」规避单次快照误判。核心判断：**状态是 RUNNABLE 但 CPU 不高，多半在等 IO。**

## Why It Matters（为什么重要）

线程问题的表现几乎同构——接口变慢、请求堆积、CPU 飙高——但背后可能是三件完全不同的事，用错方向会查一整天。`thread` 命令本身简单，价值不在「看到线程在干什么」，而在**排除掉两个错误方向**（不是在算、不是在等锁），剩下的候选就不多了。与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 同源：先排除方向，再动参数或代码。

## Core Characteristics（核心特征）

1. **三种「卡」先分类，再动手**：① RUNNABLE 且在跑业务代码（死循环、正则回溯、大对象序列化）→ 改代码；② BLOCKED 等 `synchronized` monitor（特征：一堆线程停在同一个位置）→ 拆锁或降并发；③ RUNNABLE 但停在 socket 读、DB 连接、HTTP 调用上 → 去看下游。
2. **读栈固定顺序**：状态（RUNNABLE/BLOCKED/WAITING/TIMED_WAITING）→ 翻到自己的 `com.xxx` 包（栈顶几帧通常是 JDK 的）→ 看卡在哪个方法上（`socketRead0`、`pooledConnection`、`await` 说明在等不在算）。
3. **线程池耗尽看分布不看个体**：线程名成批出现、编号连成一片（`pool-1-thread-1` 到 `-200`）且全部停在同一个提交点或下游调用上——这是下游变慢的连锁反应，看线程总数（`dashboard`）与排队堆积，改池参数只能缓解。
4. **采样要二次确认**：一次快照不能代表持续，隔几分钟再抓一次，两次都指向同一方法才值得下结论。

## Structure（结构）

- `thread -n 3`：列最忙三个线程（CPU 高时第一条就敲它）
- `thread -b`：找阻塞其他线程的那一个（怀疑死锁先敲，比人眼翻栈快）
- `thread 线程号`：看指定线程完整调用栈（前两条定位后看细节）
- `thread --state BLOCKED/WAITING`：按状态过滤全貌（第四信源补充用法）

## How It Works（运作方式）

排查路径：现象（CPU 高 / 大面积卡顿 / 请求堆积 / 偶发超时）→ 选命令 → 按三步顺序读栈 → 分类到三种「卡」之一 → 分支处置。三个易误判点：RUNNABLE ≠ 在算；CPU 高可能是 `GC`/`G1`/`C2 CompilerThread` 等非业务线程（去看内存与 GC）；一次采样不算持续。

## Relationships（关系）

### Related Concepts（相关概念）

- [[threadpoolexecutor-internals|ThreadPoolExecutor 核心设计]]：池参数（核心/最大线程数、队列、拒绝策略）是「缓解手段」，本方法强调耗尽根因在下游。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：同属「先排除方向再动手」的证据方法论；GC 线程误判的分支通向内存/GC 排查。
- [[oom-troubleshooting|OOM 排查方法论]]：同族线上排障方法论，可互为路由入口。

### Dependencies（依赖项）

- 依赖 [[arthas|Arthas]] 或 jstack 提供栈输出（工具层）。

### Distinctions（区分）

- 与「线程池内部机制」区分：本页讲的是**读栈与判断**，不是池的执行模型。

## Evolution（演进）

- 2026-10-28 — 第四信源（五类事故实战）给出死锁实例：`thread -b` 一句话定位持 ReentrantLock 阻塞 5 线程；并补 `thread --state BLOCKED/WAITING` 过滤用法。
- 2026-10-31 — 第六信源（thread 深读）系统化：三种「卡」分类、三步读栈顺序、线程池耗尽识别、三个误判点。
- 2026-10-31 — 第五信源（上手篇）印证 `thread -n 3`/`-b`/线程号三条用法与「三线程停在同一方法即烧 CPU」的判断法。

## Open Questions（开放问题）

- 虚拟线程场景下栈读法的差异（虚拟线程无固定 OS 线程，`thread` 输出形态不同）当前信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-arthas-03-thread-command.md`（三种卡、三步读栈、线程池耗尽、三个误判）
- Source: `raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md`（thread 三条用法印证）
- Source: `raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md`（thread -b 死锁实例、--state 过滤）

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页，诊断工具总览）
- [[jvm-gc|JVM 垃圾回收（主题）]]（GC 线程误判分支）
