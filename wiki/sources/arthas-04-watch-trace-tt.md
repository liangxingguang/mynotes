---
id: wiki-source-arthas-04-watch-trace-tt
type: source
title: watch、trace、tt：把方法看透的三件套
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - watch
  - trace
  - tt
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-04-watch-trace-tt.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/watch-trace-tt.md
  - wiki/sources/arthas-01-attach-first-conclusion.md
  - wiki/concepts/thread-stack-reading.md
---
# watch、trace、tt：把方法看透的三件套

## Overview（概览）

方法级观察命令深读文章（公众号专辑《arthas使用》第 4 篇）：讲清 trace（管时间）、watch（管数据）、tt（管现场）三者的分工与参数纪律、排查顺序（先 trace 再 watch 最后 tt），以及三条生产纪律。核心：三个命令都只能告诉你"发生了什么"，判断还得你来。

## Key Facts（关键事实）

- **一个管时间、一个管数据、一个管现场**：`trace` 看耗时卡在哪一层；`watch` 看入参、返回值、异常对不对；`tt`（time tunnel）先录下来、事后回放。
- **trace 用法**：`trace 类名 方法名` 把方法内部调用链按耗时排列；**别看最外层**——总耗时已知，有价值的是"哪一层突然变宽"（例：80% 时间停在 DAO 调用上 → 问题在数据库那一段）。两个要点：加 `-n` 次数限制（否则一直挂在线上采样）；一次只 trace 一个方法（多挂输出互相穿插）。
- **watch 用法**：观察点表达式 `'{params, returnObj, throwExp}' -x 2` 看入参/返回值/异常；四个时机参数：`-b` 执行前看入参、`-s` 正常返回后看返回值、`-e` 抛异常时看异常、`-f` 方法结束后看耗时；`-x` 是展开深度，嵌套打不出来先调大、刷屏就调小；调接口前先 `-b` 看入参，可排除"参数根本没传对"这种最常见的原因。
- **tt 三步**：`tt -t 类名 方法名` 开始记录（每调一次存一条，带索引和时间戳）→ `tt -l` 列出已记录调用 → `tt -i 索引` 看该次的入参/返回值/异常，加 `-p` 可回放。`-t` 也要加次数上限，否则记录一直增长占内存。
- **排查顺序：先 trace，再 watch，最后 tt**。先定位"哪一层"，再定位"什么数据"，最后才是"怎么复现"；顺序反了会在无关的方法上浪费采样次数。
- **三条纪律**：① 都要加次数上限，排查完一定要停（三者默认一直生效）；② 一次只挂一个观察点（多命令同开输出穿插，比不看还难判断）；③ 先在测试环境验证表达式（写错不报错、只是不输出，会误以为"方法没被调用"）。
- **共同点**：只能告诉你"发生了什么"，不能告诉你"该不该这样"——1.8 秒算不算慢取决于 SLA，返回 null 算不算 bug 取决于业务约定。

## Important Claims（重要论断）

### 选错命令比不会用更糟

「选错了命令，你会得到一屏看不太懂的东西，然后开始怀疑工具。」——三者的分工（时间/数据/现场）是选择的第一判据。

### trace 的价值在"突然变宽的那一层"

「最外层的总耗时是你已经知道的，有价值的是哪一层突然变宽。」与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的"先定位再动手"一致。

### 工具给事实，判断还得你来

「这三个命令都只能告诉你'发生了什么'，不能告诉你'该不该这样'。」与 [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]] 的"它翻译、你判断"分工互证。

## Concepts Introduced（引入的概念）

- [[watch-trace-tt|watch/trace/tt 方法级观察三件套]]（本篇为该概念的主信源）。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（三个命令的载体）

## Implications（影响／启示）

- 与 [[arthas-01-attach-first-conclusion|Arthas 上手]] 的"三参数细节"（忘加次数限制、`-x` 深度、表达式写错不报错只是不输出）互证并展开：本篇给出其完整版（`-b/-s/-e/-f` 四时机、tt 三步、三条纪律）。
- 与 [[thread-stack-reading|线程栈读法]] 互补：thread 解决"哪个线程/线程在等什么"，本篇三命令解决"哪个方法/数据对不对/怎么复现"，构成 Arthas 排障的线程层与方法层两块拼图（解读）。
- 「tt 录下来等复现」对偶发问题的处置方式，与 [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]] 中"读栈→写表达式→结论分叉"衔接：录下的现场可贴给 AI 分析（解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（正文信息无损）；选择表字段被拆行，已按语义还原。
- 命令参数以文章所述版本为准，原文结尾自带免责声明"具体参数以你所使用版本的官方文档为准"。
- 未覆盖 trace/watch/tt 的条件表达式进阶用法（如 `#cost` 过滤）与 MCP 场景下的调用差异。

## Related Knowledge（相关知识）

- [[watch-trace-tt|watch/trace/tt 方法级观察三件套]]（概念页）
- [[arthas|Arthas]]（实体页）
- [[thread-stack-reading|线程栈读法]]（线程层排障）
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（翻译/判断分工）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-04-watch-trace-tt.md`
