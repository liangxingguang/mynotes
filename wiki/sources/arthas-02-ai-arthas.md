---
id: wiki-source-arthas-02-ai-arthas
type: source
title: AI + Arthas 排查线上问题：4 个环节，AI 该在哪一步上手
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - ai
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
  - wiki/concepts/thread-stack-reading.md
  - wiki/sources/arthas-mcp-ai-troubleshooting.md
---
# AI + Arthas 排查线上问题：4 个环节，AI 该在哪一步上手

## Overview（概览）

AI × Arthas 排障工作流文章（公众号专辑《arthas使用》第 2 篇）：把排查拆成 4 个环节（从现象选命令、读懂线程栈、写对 watch 表达式、把结论变成下一步），说明 AI 在哪一步最有用、三件绝对不能交给它做的事，以及核心分工「它负责翻译，你负责判断」。

## Key Facts（关键事实）

- **前提：AI 碰不到服务器**——没有机器权限、不能执行 Arthas 命令，只处理贴给它的文本；贴出前先脱敏（包名、类名、SQL、堆栈路径与参数都带业务信息，改标识、保留结构）。
- **环节一·从现象选命令**：AI 最擅长。现象→命令对应：CPU 高 → `dashboard`+`thread -n 3`；接口变慢 → `trace`；返回值不对 → `watch`；怀疑死锁 → `thread -b`；内存涨 → `dashboard`+`heapdump`。
- **环节二·读线程栈**：AI 擅长看出「三个线程停在同一方法」这类重复（人眼易漏）；但不知业务逻辑，最后一句必须让它给「可疑」而非「结论」。
- **环节三·写 watch/trace 表达式**：最易出错也最适合 AI 代写；拿到命令先在测试环境跑一遍，检查观察点是否多余、展开深度够不够。
- **环节四·结论变下一步**：让 AI 做「分叉」——针对每个可能原因给出验证命令、看到什么算证实、看到什么算排除，把排查从「猜」变成「逐个排除」。
- **三件别交给 AI**：① 猜类名方法名（写错会「执行了但什么都没匹配到」）；② 直接贴生产完整输出（先脱敏）；③ 照抄 `redefine`/`retransform`（热替换改错引发类结构不一致）。
- **核心分工**：它负责翻译，你负责判断；合理性（SLA 是多少、量级正不正常）来自业务认知。

## Important Claims（重要论断）

### AI 在排查里最实际的价值

「它不一定知道根因，但它能帮你把可能性排成一列，并给出每一条的验证方法。」——AI 的价值不在给答案，而在把模糊现象拆成可验证的步骤清单。

### 工具是手段不是结论

「Arthas 能告诉你这个方法耗时 1.8 秒，但不能告诉你这个 1.8 秒是否合理。」合理性判断只能来自人的业务认知。

## Concepts Introduced（引入的概念）

- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（本篇为该概念的主信源）。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（AI 协作的载体工具）；[[thread-stack-reading|线程栈读法]]（环节二的读栈方法论）

## Implications（影响／启示）

- 与 [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas]]（MCP 工具模式，AI 可直接调命令）互补：本篇是贴文本模式（AI 无执行权），两种模式并存，选择取决于是否部署 MCP 与脱敏成本（解读）。
- 「先脱敏再提问」应成为 AI 辅助排障的默认前置步骤，与生产红线（见 [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]] 信源页）一致（解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（正文信息无损）；表格字段被拆行，已按语义还原。
- 未覆盖 MCP 直接调用模式的具体配置与量化收益（见互证信源）。

## Related Knowledge（相关知识）

- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（概念页）
- [[arthas|Arthas]]（实体页）
- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas，Java 排障会快多少？]]（MCP 模式互证）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md`
