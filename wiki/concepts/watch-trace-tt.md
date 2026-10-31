---
id: wiki-concept-watch-trace-tt
type: concept
title: watch/trace/tt 方法级观察三件套
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - java
  - arthas
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-04-watch-trace-tt.md
  - raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/thread-stack-reading.md
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# watch/trace/tt 方法级观察三件套

## Definition（定义）

Arthas 的三个方法级观察命令及其分工体系：**trace 管时间**（耗时卡在哪一层）、**watch 管数据**（入参/返回值/异常对不对）、**tt 管现场**（把调用录下来、事后回放）。三者都基于字节码增强做方法级观测，共享同一套生产纪律（次数上限、单观察点、测试环境验证表达式）。

## Why It Matters（为什么重要）

方法级问题是线上排障中最高频的一类（慢、错、偶发）。三个命令定位不同，选错命令会得到一屏看不懂的输出；而排查顺序（先定位层、再定位数据、最后录现场）直接决定采样成本是否被浪费。

## Core Characteristics（核心特征）

1. **分工互斥**：一个管时间（trace）、一个管数据（watch）、一个管现场（tt），选择的第一判据是你要回答的问题。
2. **都有默认常驻风险**：三者默认持续生效，必须显式加次数上限（`trace -n`、`tt -t` 的次数限制）并在排查结束后停止。
3. **表达式静默失败**：watch/trace 的观察点表达式写错不报错、只是不输出，会误判为"方法没被调用"——必须先在测试环境验证。
4. **只给事实不给判断**：命令输出"发生了什么"，"该不该这样"（1.8s 算不算慢、null 算不算 bug）取决于 SLA 与业务约定，判断在人。

## Structure（结构）

| 你想知道 | 用哪个 | 关键参数 |
|---|---|---|
| 耗时卡在哪一层 | `trace` | `-n` 限制次数 |
| 入参对不对 | `watch` | `-b` + 观察点表达式 |
| 返回值/异常是什么 | `watch` | `-s` / `-e` |
| 想事后回看某次调用 | `tt` | `-t` 录、`-i` 看、`-p` 回放 |

## How It Works（运作方式）

**trace**：`trace 类名 方法名` 把方法内部调用链按耗时排列。读法要点：别看最外层（总耗时已知），找"哪一层突然变宽"——80% 时间停在 DAO 调用上，问题就在数据库那一段。纪律：加 `-n`；一次只 trace 一个方法。

**watch**：`watch 类名 方法名 '{params, returnObj, throwExp}' -x 2`。四个时机参数决定输出时机：`-b` 执行前看入参、`-s` 正常返回后看返回值、`-e` 抛异常时看异常、`-f` 结束后看耗时。`-x` 为展开深度：嵌套打不出来先调大，刷屏就调小。调接口前先 `-b` 看入参，排除"参数没传对"。

**tt（time tunnel）**：`tt -t 类名 方法名` 记录（每调一次存一条，带索引和时间戳）→ `tt -l` 列出 → `tt -i 索引` 看该次的入参/返回值/异常，`-p` 回放。用于无法复现或要等定时任务跑完后再分析的场景；`-t` 同样要加次数上限防内存增长。

**排查顺序**：先 trace 找出耗时最大的层 → 再用 watch 看该层的入参和返回值 → 偶发问题用 tt 录下来等复现。即：先定位"哪一层"，再定位"什么数据"，最后才是"怎么复现"。

**三条纪律**：① 都要加次数上限，排查完一定要停；② 一次只挂一个观察点（多命令同开输出穿插）；③ 先在测试环境验证表达式。

## Relationships（关系）

### Related Concepts（相关概念）

- [[thread-stack-reading|线程栈读法]]：线程层排障（哪个线程、在等什么）；本概念是方法层排障（哪个方法、数据对不对、怎么复现）。
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]：贴文本模式下 AI 写 watch/trace 表达式、人做判断；tt 录下的现场可作为贴给 AI 的素材。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：trace 的"找突然变宽的那一层"是证据驱动归因的方法级实例。

### Dependencies（依赖项）

- [[arthas|Arthas]]：三个命令的载体（字节码增强机制）。

### Distinctions（区分）

- 与 [[thread-stack-reading|线程栈读法]] 的分工：thread 回答"线程在干什么"（状态/位置），本三件套回答"方法里发生了什么"（耗时分布/数据/现场），二者是排障的不同层面，常先后衔接。
- trace 与 watch 的区分：trace 看时间分布（哪一层），watch 看数据内容（入参/返回值/异常）；一个方法"慢"用 trace，"结果不对"用 watch。

## Evolution（演进）

- 2026-10-31 — 信源 1（专辑《arthas使用》第 4 篇）确立三命令分工、四时机参数、tt 三步、排查顺序与三条纪律。
- 信源 2（同专辑第 1 篇）已先期印证其中三项细节：trace 必加 `-n`、watch 观察点表达式 `'{params,returnObj,throwExp}' -x 2`、表达式写错不报错只是不输出。

## Open Questions（开放问题）

- 条件表达式（如 `#cost > 500` 过滤）与 `tt` 回放在 MCP/AI 场景下的参数形态差异，现有信源未覆盖。
- 高频调用方法上 watch 的开销量化，现有信源未给出数据。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-arthas-04-watch-trace-tt.md`（分工、参数、顺序、纪律的主信源）
- Source: `raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md`（互证 `-n`、观察点表达式、表达式静默失败）

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页）
- [[thread-stack-reading|线程栈读法]]
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]
