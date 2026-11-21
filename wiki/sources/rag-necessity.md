---
id: wiki-source-rag-necessity
type: source
title: 01 · RAG 还有必要吗（《RAG工程实践》系列）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - rag
  - ai
sources:
  - raw/sources/ai/2026-11-20-rag-necessary.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/rag-document-parsing.md
  - wiki/concepts/rag-chunking.md
---
# 01 · RAG 还有必要吗（《RAG工程实践》系列）

## Overview（概览）

微信公众号《RAG工程实践》系列第 1 篇（开篇立论）。以企业内部制度问答（一批 PDF/Word 制度文件，员工问"出差住宿标准"）为例，论证 RAG 的必要性：通用大模型格式完整、数字具体，但数字来自公开语料的常见做法，对不上自家条款。给出工程上四条路（长上下文、微调、Agent、RAG）的变量对比、四类非检索不可的场景与判断顺序。正文自 `Assets/2026-11/wechat-rag-necessary-1.md` 采集稿逐字收录。编译结论：四条路框架与必要性判断进入 [[rag]]。

## Key Facts（关键事实）

- **四条路**：全量塞进上下文（长上下文）、微调模型、Agent 编排、检索增强生成；常被放在一起比优劣，**实际改的变量不同**。
- **长上下文**：改"一次能读多少"。窗口涨到几十万 token 后全量塞入可行，但成本随材料量线性上升——语料从 100 篇到 10000 篇，单次成本涨 100 倍；检索只与筛出的段数有关，基本不变。
- **微调**：改"怎么说"。改输出风格、格式与领域表达；知识供给三个硬约束：改一次知识要重训一次、删一条事实无法定点完成、训练数据里的过时内容会被继续复述。
- **Agent**：改"做什么、按什么顺序做"。流程变复杂不会让事实变准确，每一步仍要从某处取回材料；**RAG 是 Agent 的事实来源，Agent 是 RAG 的使用者**。
- **RAG**：改"依据哪些事实说"。
- **四类非检索不可场景**：内部制度、客服售前、合规法务、研发运维文档。共同点三条：知识私有（公开语料没有）、更新快、答案要能核。
- **判断顺序**：三条同时成立时，检索是唯一能同时满足的做法；缺事实先补事实——事实错了，后面两步都在放大错误。

## Important Claims（重要论断）

### Claim 1：四条路改的变量不同，比优劣前先分清要改什么
长上下文改"一次能读多少"、微调改"怎么说"、Agent 改"做什么/按什么顺序做"、RAG 改"依据哪些事实说"。把四条路笼统比优劣会混淆目标。

### Claim 2：只有 RAG 直接改变答案所依据的事实
长上下文与 Agent 都不改变事实来源本身：长上下文受成本与语料量约束，Agent 的每一步仍需从别处取回材料。

### Claim 3：知识私有 + 更新快 + 答案要能核，三条同时成立时检索是唯一解
内部制度、客服售前、合规法务、研发运维四类场景同时满足这三条，非检索不可。

## Concepts Introduced（引入的概念）

- [[rag]]
- [[context-management]]（长上下文的成本与位置效应由本信源的对照表侧面涉及）
- [[agent-loop]]（Agent 与 RAG 的使用者/事实来源关系）

## Entities Mentioned（提及的实体）

（无具名实体，均为方法与场景）

## Implications（影响／启示）

选型判断顺序应先分清"要改哪个变量"：要答案贴合私有知识且能核，走 RAG；要改输出风格走微调；要编排流程走 Agent，但 Agent 的事实仍需 RAG 供给。

## Limitations（局限）

单篇公众号定性方法论文章，无量化评测数据；四路对比为论证性论断而非实测；未涉及具体框架与实现。

## Related Knowledge（相关知识）

- [[rag|RAG（检索增强生成）]]
- [[rag-document-parsing|RAG 文档解析]]
- [[rag-chunking|RAG 分块]]

## Source（信源）

- `raw/sources/ai/2026-11-20-rag-necessary.md`
