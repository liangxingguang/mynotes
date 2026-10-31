---
id: wiki-concept-ai-assisted-troubleshooting-workflow
type: concept
title: AI 辅助排障工作流
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - ai
  - troubleshooting
  - java
sources:
  - raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md
  - raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/mcp.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/sources/arthas-mcp-server-ai-diagnosis.md
---
# AI 辅助排障工作流

## Definition（定义）

把 AI 接入线上排障的协作方法（以 Arthas 为例）：AI 不碰服务器、不执行命令，只处理人贴给它的文本；排障拆成四个环节（从现象选命令 → 读线程栈 → 写 watch/trace 表达式 → 把结论变成下一步），AI 在每个环节有明确分工，人保留最终判断权。核心分工：**它负责翻译，你负责判断。**

## Why It Matters（为什么重要）

命令本身不多（常用十几个），真正难的是看到一屏输出之后怎么判断。AI 的价值不是替你敲命令，而是把输出读成结论、把可能性排成一列——省下的不是敲命令的时间，是「对着一屏输出发愣」的时间。但合理性判断（SLA 是多少、这个量级正不正常）只能来自人的业务认知，AI 与工具都给不了。

## Core Characteristics（核心特征）

1. **前提是脱敏**：AI 没有机器权限，只能处理贴给它的文本；包名、类名、SQL、堆栈路径与参数都可能带出业务信息，先改标识、保留结构再贴。
2. **环节一·从现象选命令**：AI 最适合，可直接问「CPU 90% / P99 200ms→2s / 字段返回 null 分别先敲哪条」。对应关系：CPU 高 → `dashboard`+`thread -n 3`；接口变慢 → `trace`；返回值不对 → `watch`；怀疑死锁 → `thread -b`；内存涨 → `dashboard`+`heapdump`。
3. **环节二·读线程栈**：AI 擅长看出「三个线程停在同一方法」这类重复（人眼易漏），但不知道业务逻辑，**最后一句必须让它给「可疑」而不是「结论」**。
4. **环节三·写表达式**：watch/trace 表达式最易错（写错不报错、只是没输出），最适合让 AI 代写；拿到命令先在测试环境跑一遍，检查观察点是否多余、展开深度够不够。
5. **环节四·结论变下一步**：让 AI 做「分叉」——针对每个可能原因给出验证命令、看到什么算证实、看到什么算排除，把排查从「猜」变成「逐个排除」。
6. **三件不交给 AI**：① 猜类名方法名（写错会「执行了但什么都没匹配到」）；② 直接贴生产完整输出（先脱敏）；③ 照抄它给的 `redefine`/`retransform`（热替换改错引发类结构不一致）。

## Structure（结构）

- 贴文本模式（本信源）：人执行命令 → 贴输出 → AI 读 → 人判断。AI 无执行权。
- MCP 工具模式（互证信源）：Arthas 4.3.5 MCP Server 把 29 个诊断命令暴露为标准工具，AI 客户端可发现并直接调用，减少命令记忆与结果整理时间；但「离把线上 JVM 交给 AI 自动处理还很远」，危险能力（热替换、表达式执行）仍需管控。

## How It Works（运作方式）

分工边界：AI 做「翻译」（现象→命令、输出→三句话摘要、可能性→验证清单），人做「判断」（是否合理、是否采信、是否执行危险操作）。工具是手段不是结论：Arthas 能告诉你「这个方法耗时 1.8 秒」，但不能告诉你「1.8 秒是否合理」。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：MCP 工具模式是本工作流的「AI 可直接执行命令」变体，两种模式并存且互补。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：同属排障方法论上游；AI 分叉清单即「逐个排除」的证据收集计划。
- [[thread-stack-reading|线程栈读法]]：环节二的具体读栈方法论。

### Dependencies（依赖项）

- 依赖 [[arthas|Arthas]] 提供诊断命令（示例载体）。

### Distinctions（区分）

- 与「MCP 直接调用」区分：本页主信源是贴文本模式（AI 无执行权）；MCP 模式见互证信源与 [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]] 信源页。

## Evolution（演进）

- 2026-10-14 — 互证信源（Arthas MCP）确立「AI 接到哪里」：MCP Server 实验性模块 + 29 个工具 + 危险能力分级 + 接入边界。
- 2026-10-31 — 主信源（贴文本模式）确立四环节分工、三件不交给 AI 的事与「它翻译你判断」的核心分工；与 MCP 模式互补，量化对比见 [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]]（45min vs 5min，作者实测口径）。

## Open Questions（开放问题）

- AI 给出「可疑」清单后，验证命令的执行顺序与优先级如何由人按风险/成本排序，信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md`（四环节、三件不做、脱敏前提、翻译/判断分工）
- Source: `raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md`（MCP 工具模式互证：29 工具、危险能力、接入边界）

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页）
- [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]]（信源页：量化对比与生产红线）
- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas，Java 排障会快多少？]]（信源页）
