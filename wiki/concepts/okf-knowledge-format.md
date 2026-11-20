---
id: wiki-concept-okf-knowledge-format
type: concept
title: OKF（面向 AI Agent 的知识包装规范）
status: active
created: 2026-10-22
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - ai
  - knowledge-base
sources:
  - raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md
  - raw/sources/ai/2026-11-20-livex-wiki-agent-kb.md
related:
  - wiki/sources/jd-haibo-ai-knowledge-base.md
  - wiki/concepts/coding-agent-knowledge-base.md
---
# OKF（面向 AI Agent 的知识包装规范）

## Definition（定义）

Google Cloud 提出的、面向 AI Agent 消费的知识包装规范（Open Knowledge Format，名称以信源转述为准）：把知识在入库时即编译为结构化互链 Markdown 树，运行时只做"导航+摘录"。（采纳情况获京东海博、淘宝直播互动 LiveX Wiki 两例二手信源印证，规范原文未读到。）

## Why It Matters（为什么重要）

向量 RAG / GraphRAG / Agentic Search 的重心都在运行时检索，而企业落地的真正卡点是知识生产：知识要结构化、绑定关联、精确定位、全生命周期维护。OKF 把"知识编译"从运行时前移到维护期，与 Karpathy 的 LLM Wiki 思路一致。

## Core Characteristics（核心特征）

1. 一个概念一个 Markdown 文件：指标、表、接口、流程、领域模型原子化，标题/表格/代码块作语义锚点。
2. YAML 头部元数据：type 唯一必填，AI 不通读全文即可识别用途归属。
3. 系统级保留文件：index.md（全局目录、渐进式披露，避免一次撑爆 token）与 log.md（变更可追溯）。
4. 宽容消费：字段不全、死链不报错，自动降级为普通文档，存量资料可渐进改造。

## Structure（结构）

京东海博的落地形态为三层：底层"项目知识×领域知识矩阵"（每仓 catalog + views/ 反向索引 + 跨仓 domain-knowledge 链路，领域层只引用不复制）；中层角色化视图；上层 Skill 能力。

## How It Works（运作方式）

维护期由 Skill 从代码/文档自动生成并蒸馏知识（只写可查证事实、查不到留白）；运行时 AI 先读 index.md 摘要导航、按需下钻到具体文件，精确定位到 文件:行号。

## Relationships（关系）

### Related Concepts（相关概念）

- （解读）与 Karpathy 提出的 LLM Wiki 理念同源：模型平时把知识整理成持续维护的 Markdown。本 Wiki 尚未建 LLM Wiki 概念页。

### Distinctions（区分）

- 与向量 RAG 的区别：RAG 在查询时切块语义召回；OKF 在入库时完成结构化编译，检索退化为"导航+摘录"。

## Evolution（演进）

- 2026-10-14 — 京东海博文披露采纳 OKF 建设 AI 知识库，并给出三层架构与 Skill 工具链实现。
- 2026-11-20 — 第二例采纳：淘宝直播互动团队 LiveX Wiki 借鉴 OKF 的轻量文件思想，用 Markdown 保存业务解释、YAML frontmatter 和引用声明知识身份、来源与依赖，使人可审阅、程序可检查、Agent 按结构读取。两例为不同业务场景下的独立实践，互证 OKF 作为 Agent 知识库表达层格式的可行性（均为二手转述，规范原文仍缺）。

## Open Questions（开放问题）

- OKF 规范原文（字段全集、文件约定细节）未见一手出处，当前认知全部来自二手转述。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md`

## Related Knowledge（相关知识）

- [[jd-haibo-ai-knowledge-base]]
- [[jd-haibo]]
- [[livex-wiki-agent-kb]]（第二例采纳信源）
- [[coding-agent-knowledge-base]]（以 OKF 为表达层的 Agent 知识库方法论）
