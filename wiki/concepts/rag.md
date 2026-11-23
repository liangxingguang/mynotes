---
id: wiki-concept-rag
type: concept
title: RAG（检索增强生成）
status: active
created: 2026-11-12
updated: 2026-11-23
confidence: high
tags:
  - concept
  - ai
  - llm
sources:
  - raw/sources/ai/2026-11-12-ai-agent-tech-overview.md
  - raw/sources/ai/2026-11-20-agent-knowledge-base.md
  - raw/sources/ai/2026-11-20-rag-necessary.md
  - raw/sources/ai/2026-11-20-rag-document-parsing.md
  - raw/sources/ai/2026-11-20-rag-chunking.md
  - raw/sources/ai/2026-11-20-rag-what-is.md
  - raw/sources/ai/2026-11-20-rag-steps.md
  - raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md
  - raw/sources/ai/2026-11-23-langchain-rag-tutorial.md
related:
  - wiki/concepts/prompt-engineering.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/rag-document-parsing.md
  - wiki/concepts/rag-chunking.md
  - wiki/concepts/rag-production-guardrails.md
  - wiki/concepts/deepsearch.md
  - wiki/comparisons/rag-vs-graphrag-vs-deepsearch.md
---
# RAG（检索增强生成）

## Definition（定义）

RAG（Retrieval-Augmented Generation，检索增强生成）是一种在 LLM 生成前先从外部知识库检索相关文档片段、将其注入上下文的技术，使模型基于检索到的真实文档回答，而非仅依赖训练数据中的记忆。核心思想是"不把所有知识塞进 LLM，而是在需要时按需检索"——类比人不需要背下百科全书，遇到问题去查即可。**RAG 不提升模型能力上限，它改变的是这次回答依据什么**（信源 2026-11-20）：同一个模型，给一段制度原文能准确摘出住宿标准，不给原文只能给出行业常见值。

## Why It Matters（为什么重要）

LLM 的训练数据有截止时间，且无法覆盖私有知识（公司制度、产品文档、客户数据等）。RAG 解决了两个关键问题：①**知识过时**——知识库可随时更新，无需重新训练；②**幻觉**——模型基于检索到的真实文档回答，而非凭空编造。RAG 是 Agent 连接外部知识库的基础，也是 [[context-management|上下文管理]] 中"外部知识注入"环节的主要技术路径。

## Core Characteristics（核心特征）

1. **检索与生成分离**：知识不"融化"在模型权重中，而是存储在外部知识库，按需检索。这是与微调的根本区别——微调改变模型"能力"（怎么回答），RAG 改变模型"输入"（基于什么回答）。
2. **向量检索为主流实现**：文档切块 → embedding 模型转成向量 → 查询向量与文档向量计算余弦相似度 → 取 Top-K。embedding 将语义相近的文本映射到空间相近的向量，比关键词匹配强——关键词找"字面相同"，向量检索找"意思相近"。
3. **进阶变体丰富**：朴素 RAG（检索 Top-K 拼入 prompt）之上有混合检索、查询改写、分块策略、多跳检索等变体持续提升效果。更进一步有 **Agentic RAG（[[deepsearch]]）**：在标准检索链路之上叠加 query 改写、短期记忆库与结束判断，以多轮循环检索应对综合性、全局性问题；其索引侧数据组织与标准 RAG 相同，增量集中在推理侧循环，max_num 设为 1 即退化为标准 RAG（信源 2026-11-23）。
4. **与 Agent 的关系**：RAG 是 Agent 获取静态领域知识的主要来源（公司制度、产品文档、行业规范），在 [[agent-loop|Agent Loop]] 的"规划"和"执行"环节提供参考。知识库管"静态领域知识"，[[agent-memory-system|记忆系统]] 管"Agent 经历的事实"，两者分工不同。
5. **找到的是"可能相关"而非"业务确认的当前状态"**（信源 2026-11-20）：RAG 依赖资料本身——制度过期、文档缺失或需跨多份资料复杂关联时，几段相似文本未必足够；且检索到的是"可能相关的内容"，不是经过业务系统确认的当前状态。问"订单现在到哪一步"，往往需查实时业务数据，而非只搜旧文档。
6. **检索×生成相乘**（信源 2026-11-20）：检索质量与生成质量是相乘关系，任一项接近零结果都接近零；能力很强的模型拿到无关条款会写出通顺、自洽但无关的答案，比明显胡说更难发现，故投入重心在解析、分块与召回而非换模型。
7. **出处可核对**（信源 2026-11-20）：答案能带出处（"依据某某办法第七条"），用户可翻原文核对；可靠性取决于链路是否保留来源信息——解析丢页码、分块丢标题、拼装丢文档标识，任何一环丢失都指不回原文。

## Structure（结构）

RAG vs 微调对比（信源 2026-11-12）：

| 维度 | 微调（Fine-tuning） | RAG |
|---|---|---|
| 知识更新 | 需要重新训练，成本高 | 更新知识库即可，即时生效 |
| 知识溯源 | 知识"融化"在权重里，无法追溯 | 可以引用具体文档来源 |
| 幻觉风险 | 模型可能"编造"学过的知识 | 基于检索到的真实文档回答 |
| 计算成本 | 训练 + 推理都贵 | 只需推理时多一次检索 |
| 适合 | 改变模型的"风格/能力" | 注入"事实性知识" |

两者不互斥，实际系统常组合使用。

**四条路对比**（信源 2026-11-20，RAG 与其他路线改的变量不同，比优劣前先分清要改什么）：

| 路线 | 改的变量 | 关键代价 / 约束 |
|---|---|---|
| 长上下文（全量塞进上下文） | 一次能读多少 | 成本随材料量线性上升：语料 100→10000 篇，单次成本涨 100 倍；检索只与筛出的段数有关，基本不变 |
| 微调 | 怎么说（输出风格、格式、领域表达） | 知识供给三硬约束：改一次知识要重训一次；删一条事实无法定点完成；训练数据里的过时内容会被继续复述 |
| Agent 编排 | 做什么、按什么顺序做 | 流程变复杂不会让事实变准确，每一步仍要从某处取回材料；RAG 是 Agent 的事实来源，Agent 是 RAG 的使用者 |
| RAG | 依据哪些事实说 | 依赖资料本身：制度过期、文档缺失或需跨多份资料复杂关联时，几段相似文本未必足够 |

**必要性判断**（信源 2026-11-20）：四类场景非检索不可——内部制度、客服售前、合规法务、研发运维文档。共同点三条：知识私有（公开语料没有）、更新快、答案要能核。三条同时成立时，检索是唯一能同时满足的做法。判断顺序：缺事实先补事实——事实错了，后面两步都在放大错误。

## How It Works（运作方式）

**向量检索流程**：

1. **文档预处理**：文档切成片段（通常 200-500 token 一段），每个片段用 embedding 模型转成向量（几百到几千维浮点数数组）
2. **查询向量化**：用户问题用同一个 embedding 模型转成向量
3. **相似度计算**：问题向量与每个文档向量的余弦相似度，取最相关的 Top-K
4. **注入生成**：Top-K 文档片段拼入 prompt，LLM 基于检索内容生成回答

**进阶变体**（信源 2026-11-12）：

- **混合检索**：向量检索（语义）+ 关键词检索（BM25，精确匹配）+ 重排序，取长补短
- **查询改写**：LLM 先把用户问题改写得更适合检索（如"那个报销的事" → "差旅费报销标准 流程"）
- **分块策略**：按语义切分而非固定长度，或用父子文档（检索子块、返回父块获取更多上下文）
- **多跳检索**：第一轮检索结果中发现新线索，再检索一轮（适合需要推理的问题，如"A 公司的 CEO 之前在哪家公司"）

**一次问答链路**（信源 2026-11-20）：问题进来 → 检索器取候选片段 → 拼成上下文 → 与问题一起送模型 → 输出带依据的答案；索引在提问前已建好，问答阶段只读；每一环出错，错误都会被下一环继承。

**八环节（建库四步 + 问答四步）**（信源 2026-11-20）：

- **建库四步**（不随用户请求执行）：解析（PDF/Word/扫描件→带结构文本）→ 分块（切成带元数据片段）→ 嵌入（片段→向量）→ 写入索引（向量与原文存后端）。
- **问答四步**（每次提问走一遍）：查询改写（口语→检索式，如"能报多少"补成"住宿费标准 报销上限"）→ 召回（取几十条候选，向量按语义、关键词按字面）→ 重排（对候选重打分，比召回贵、只对少量做）→ 生成（片段与问题送模型，输出附引用）。
- 八环节里**改写与重排按需，其余必需**；**最小可用 RAG 是"召回加生成"**。

**逐环验收与嵌入模型硬约束**（信源 2026-11-20）：

- 链路长错误往下游传，每环须先定**独立可验证的通过标准**：解析抽 50 页对照、分块抽 30 片段通读、嵌入用已知答案反查看正确片段是否进前 10、召回用 20 条标注问题看命中比、重排看能否进前 3、生成只给正确片段看是否超出；**前四环人工抽查，后三环需要 Golden Set**。
- **嵌入模型硬约束**（全链路唯一不报错的约束）：建库与问答必须用同一嵌入模型，维度相同也不行——向量空间不在同一坐标系，相似度仍在 0~1、程序不报错但排序无意义；须把模型名与维度写入索引元数据，启动时校验，不一致就拒绝启动。
- **延迟**：问答侧串行，召回几十毫秒、重排随候选数变慢、生成看输出长度；对首字延迟有硬要求时，改写与重排是首要评估的取舍点。

**四层排查顺序**（信源 2026-11-20）：效果不好按"语料缺失 → 解析与分块 → 召回 → 生成"由前到后排查，越靠前越基础、修起来越省事、收益越大；**换模型是第四层手段，前三层问题换模型不会改善**。

**知识库 vs 记忆 vs 技能**（容易混淆的三层，信源 2026-11-12）：

| 维度 | 记忆（Memory） | 知识库（Knowledge Base） | 技能（Skill） |
|---|---|---|---|
| 内容 | Agent 经历的事实 | 外部静态领域知识 | 工作流指令（"怎么做"） |
| 来源 | 对话中自动提炼 | 预先准备好的文档 | 人工/Agent 起草 |
| 性质 | 动态积累 | 静态参考 | 流程指导 |
| 类比 | 个人日记 | 百科全书 | SOP 手册 |

**向量索引组织与调试**（信源 2026-11-23）：向量多时不能逐一比较，索引侧把大量向量组织成若干候选区域，新点到来后先定位区域再在局部比较，从而排除大量不相关点（Faiss 的思想）——检索速度与完整性存在取舍，只查少量区域更快但可能错过边界近邻，可同时考虑相邻区域；不同向量库的差异主要在"怎么划分区域"，基本原理相同。调试时区分两类返回：`result` 是模型依据上下文生成的自然语言回答（可能经归纳改写），`source_documents` 是检索器召回的原始片段（进入 Prompt 的依据），二者不可混同——**优先检查来源文档**：来源无相关内容，问题在检索之前，反复改回答措辞通常无效；来源正确而答案仍错，才检查上下文是否完整传入与提示词。

## Relationships（关系）

### Related Concepts（相关概念）

- [[context-management|上下文管理]]：RAG 检索结果需纳入上下文预算管理，是上下文注入环节的主要技术
- [[prompt-engineering|提示工程]]：RAG 检索到的文档片段需通过提示工程有效组织，影响模型对检索内容的关注
- [[agent-loop|Agent Loop]]：RAG 为 Agent 提供静态知识，在"规划"与"执行"环节提供参考
- [[harness-engineering|Harness Engineering]]：RAG 作为 Agent 的内置能力之一，以 middleware 形式接入 ReAct 循环

### Distinctions（区分）

- **RAG vs 微调**：微调改变模型"能力"（怎么回答），RAG 改变模型"输入"（基于什么回答）。事实性知识走 RAG，行为模式/领域推理走微调。
- **RAG vs 长上下文**：长上下文改"一次能读多少"，受成本随语料量线性上升的约束（信源 2026-11-20）；RAG 改"依据哪些事实说"，检索只与筛出的段数有关，成本基本不随语料量增长。
- **RAG vs Agent**：Agent 改"做什么、按什么顺序做"，流程变复杂不会让事实变准确，事实仍需从别处取回；RAG 是 Agent 的事实来源，Agent 是 RAG 的使用者（信源 2026-11-20）。
- **知识库 vs 记忆**：知识库是外部静态领域知识（预先准备好的文档），记忆是 Agent 经历的事实（对话中自动提炼）。

## Evolution（演进）

- 2026-11-12 — 新建，信源为 vivo《AI Agent 技术全景解析》。文章系统梳理了 RAG 的核心流程（向量检索）、RAG vs 微调对比、进阶变体（混合检索/查询改写/分块策略/多跳检索）与知识库/记忆/技能三层分工。

- 2026-11-20 — 新增信源 `raw/sources/ai/2026-11-20-agent-knowledge-base.md`。补强 RAG 的边界定位：在四种 Agent 知识库能力中，RAG 找相关知识，回答"哪些资料与问题相关"，常见对象是文档/文本片段/检索结果；明确其局限是依赖资料本身、找到的是"可能相关的内容"而非业务系统确认的当前状态。由此新建对照页 [[agent-knowledge-base-capabilities]] 与 [[graphrag]]、[[ontology]]。

- 2026-11-21 — 新增《RAG工程实践》系列三篇信源（`raw/sources/ai/2026-11-20-rag-necessary.md`、`raw/sources/ai/2026-11-20-rag-document-parsing.md`、`raw/sources/ai/2026-11-20-rag-chunking.md`）。Structure 增补"四条路对比"（长上下文/微调/Agent/RAG 改的变量与代价）与"必要性判断"（四类非检索不可场景与三条共同点）；Distinctions 增补 RAG vs 长上下文、RAG vs Agent。建库侧两个环节独立成页：[[rag-document-parsing]]（解析）与 [[rag-chunking]]（分块）。

- 2026-11-21 — 新增《RAG工程实践》系列第 2 篇（`raw/sources/ai/2026-11-20-rag-what-is.md`）与第 3 篇（`raw/sources/ai/2026-11-20-rag-steps.md`）。Definition 补"RAG 不提升模型能力上限，改变的是这次回答依据什么"；Core Characteristics 增补"检索×生成相乘"与"出处可核对"；How It Works 增补一次问答链路、八环节（建库四步+问答四步）、逐环验收与嵌入模型硬约束、四层排查顺序。

- 2026-11-23 — 新增信源 `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md`。Core Characteristics 增补 Agentic RAG（[[deepsearch]]）变体：标准 RAG 之上叠加 query 改写、短期记忆库、结束判断的循环检索，应对单片段无法回答的综合性、全局性问题；新建概念页 [[deepsearch]] 与对比页 [[rag-vs-graphrag-vs-deepsearch]]。注：该信源的分块口径（chunk 256 字符+30 重叠）与 [[rag-chunking]] 的 300~800 字迭代口径为不同实战取值，已在对比页标注为口径差异而非矛盾。

- 2026-11-23 — 新增 LangChain RAG 教程信源（第 9 信源）`raw/sources/ai/2026-11-23-langchain-rag-tutorial.md`。How It Works 增补"向量索引组织与调试"：Faiss 的候选区域组织思想（先定位区域再局部比较、不同向量库差异在划分区域）与 `result`/`source_documents` 的调试区分（优先查来源文档、来源无内容则改措辞无效）。

## Open Questions（开放问题）

- 多跳检索与推理增强（CoT/ToT）的协同：多跳检索本身已含推理，与提示层推理增强如何配合？
- 向量检索与关键词检索的最优混合比例：不同领域是否有最佳配置？

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-12-ai-agent-tech-overview.md`（vivo Agent 全景综述，2026-11-12，RAG 流程/对比表/进阶变体）
- Source: `raw/sources/ai/2026-11-20-agent-knowledge-base.md`（2026-11-20，RAG 在四种能力中的定位与"可能相关≠业务确认当前状态"的局限）
- Source: `raw/sources/ai/2026-11-20-rag-necessary.md`（《RAG工程实践》系列第 1 篇，四条路对比、四类非检索不可场景与必要性判断）
- Source: `raw/sources/ai/2026-11-20-rag-document-parsing.md`（《RAG工程实践》系列第 4 篇，建库侧第一环解析；支撑 [[rag-document-parsing]]）
- Source: `raw/sources/ai/2026-11-20-rag-chunking.md`（《RAG工程实践》系列第 6 篇，建库侧第二环分块；支撑 [[rag-chunking]]）
- Source: `raw/sources/ai/2026-11-20-rag-what-is.md`（《RAG工程实践》系列第 2 篇，RAG 定义、一次问答链路、四层排查、相乘关系、出处机制、边界与成本）
- Source: `raw/sources/ai/2026-11-20-rag-steps.md`（《RAG工程实践》系列第 3 篇，八环节链路、逐环验收、嵌入模型硬约束、延迟）
- Source: `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md`（微信 RAG 系列第 5 篇，2026-11-23，Agentic RAG/DeepSearch 循环检索链路与三模式对比；支撑 [[deepsearch]]）
- Source: `raw/sources/ai/2026-11-23-langchain-rag-tutorial.md`（第 9 信源：Faiss 候选区域组织思想、result/source_documents 调试区分，教学演示印证，置信度中）

## Related Knowledge（相关知识）

- [[2026-11-12-ai-agent-tech-overview|AI Agent 技术全景解析（信源页）]]
- [[rag-necessity|01 · RAG 还有必要吗（信源页）]]
- [[rag-document-parsing|04 · RAG 文档解析（信源页）]]
- [[rag-chunking|06 · RAG 分块（信源页）]]
- [[rag-what-is|02 · RAG 是什么（信源页）]]
- [[rag-steps|03 · RAG 分几步（信源页）]]
- [[rag-document-parsing|RAG 文档解析]]
- [[rag-chunking|RAG 分块]]
- [[rag-production-guardrails|企业级 RAG 生产护栏]]
- [[deepsearch|DeepSearch（Agentic 循环检索 RAG）]]
- [[rag-vs-graphrag-vs-deepsearch|传统 RAG vs GraphRAG vs DeepSearch]]
- [[deepsearch-rag-comparison|新一代 RAG：DeepSearch 实战与三种 RAG 对比（信源页）]]
- [[context-management|上下文管理]]
- [[prompt-engineering|提示工程]]
- [[agent-loop|Agent Loop]]
- [[harness-engineering|Harness Engineering]]
- [[agent-memory-system|Agent 记忆系统]]
