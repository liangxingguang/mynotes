---
id: wiki-concept-llm-wiki
type: concept
title: LLM Wiki
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - knowledge-base
sources:
  - raw/sources/ai/2026-10-16-knowledge-base-tech-evolution.md
related:
  - wiki/concepts/okf-knowledge-format.md
---
# LLM Wiki

## Definition（定义）

一种知识库组织模式：模型读入新资料后，持续更新一组互相链接、可供后续查询的知识页面；原始来源保持不变（不可变），知识页面由模型维护，并通过结构说明文件约定知识库的组织方式与操作流程（Karpathy 对该模式的描述，转述自信源）。

## Why It Matters（为什么重要）

普通 RAG 每次提问都从原始资料重新检索片段、临时组织答案；LLM Wiki 把"整理"本身沉淀下来——累积的是整理后的知识而不只是原始文件，跨文档结论可复用。适合个人研究、项目知识整理和规模适中的团队知识积累。

## Core Characteristics（核心特征）

1. **原始来源不可变**：新资料先作为来源保留，不被改写。
2. **页面持续编译**：写入摘要、更新相关实体/主题页面、维护互链。
3. **冲突检查**：新材料与已有结论比对，冲突显式处理。
4. **索引与日志**：更新索引、记录处理日志，操作可追溯。
5. **结构约定文件**：用说明文件（如本仓库的 AGENTS.md）约定组织方式与操作流程。

## Structure（结构）

典型分层（以本仓库为例，解读）：原始层（raw，append-only）→ 编译层（wiki 页面，模型维护）→ 结构层（schema/契约文件）→ 操作日志（log，append-only）。

## How It Works（运作方式）

新资料进入时：① 保留原始来源；② 写入摘要；③ 更新相关公司/产品/主题页面；④ 检查与已有结论是否冲突；⑤ 更新索引并记录日志（信源列举的五步）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[okf-knowledge-format|OKF（面向 AI Agent 的知识包装规范）]]：同为"入库时编译为互链 Markdown 树"的知识包装思路；OKF 偏规范与格式，LLM Wiki 偏模式与流程（解读）。
- RAG（未立页）：互补关系——LLM Wiki 提供整理后的知识，RAG 检索原始材料或对应证据；两者可并用（信源观点）。

### Distinctions（区分）

- 与传统 Wiki：维护者是模型而非人，页面是编译产物，必须解决来源追溯与冲突裁定。
- 与知识图谱/GraphRAG：不是前后代关系；图谱记录对象与事实关系，LLM Wiki 沉淀可读的综合页面。

## Evolution（演进）

（当前仅单一综述信源，待补充一手信源，如 Karpathy 原述。）

## Open Questions（开放问题）

- 信源提出的新工程问题尚无标准答案：来源追溯粒度、旧结论更新策略、冲突裁定权归属、自动写入错误的传播控制。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-16-knowledge-base-tech-evolution.md`

## Related Knowledge（相关知识）

- [[knowledge-base-tech-evolution|一文搞懂知识库的技术演进]]
- [[jd-haibo-ai-knowledge-base|拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设]]（团队知识库实践参照）
