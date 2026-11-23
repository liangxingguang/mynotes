---
id: wiki-comparison-rag-graphrag-deepsearch
type: comparison
title: 传统 RAG vs GraphRAG vs DeepSearch
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - comparison
  - rag
sources:
  - raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/graphrag.md
  - wiki/concepts/deepsearch.md
---
# 传统 RAG vs GraphRAG vs DeepSearch

## Scope（范围）

对比三种 **RAG 设计模式**（数据组织与检索—生成机制），依据信源 2026-11-23（RAG 系列第 5 篇）的实战口径。注意与 [[agent-knowledge-base-capabilities]]（RAG/GraphRAG/LLM Wiki/Ontology 四种知识库能力定位）的区分：本页比的是检索架构路线，不是知识库能力类型。

## Comparison Matrix（对比矩阵）

| 维度（维度） | 传统 RAG | GraphRAG | DeepSearch |
|---|---|---|---|
| 数据组织 | 扁平：切成 chunk，chunk 间无关联 | 建索引时以三元组组织知识，便于召回排序 | 与标准 RAG 相同，纯文本切块 |
| 解题机制 | 单轮：搜索 embedding 取片段 → 进模型生成 | 事前穷举：建索引时把相关三元组全部抽出、备好答案 | 现场思考：检索→结束判断→改写→再检索的循环 |
| 建索引成本 | 简单、快 | 高：要求高、速度慢，三元组抽取耗时 | 与 RAG 一样快 |
| 时间消耗位置 | 检索+生成 | 建索引 | 推理（思考时间来回折腾） |
| 综合/全局问题 | 解决不了：涉及多 chunk 或需反复检索时失效 | 能解决，但用户问题多样、事前难准备全 | 能解决，来什么问题现场思考 |
| 任务适配 | 在线任务友好 | 离线为主（建索引重） | 偏离线任务，不太适合在线 |
| 简单问题表现 | 足够 | 足够 | 与普通 RAG 区别不大（max_num=1 即标准 RAG） |
| 复杂问题上限 | 低 | 中（受穷举覆盖限制） | 更高（作者类比论断，无量化评测） |

## Analysis（分析）

三种模式的分野本质是**"答案在什么时候被准备"**：

- **传统 RAG** 不提前准备任何关系，依赖检索片段的相似度直接命中。最大特点是简单，但综合性问题（涉及多 chunk、或"对比销量前两名"这类需先确定对象的问题）与知识性问题（同一内容散布全书、无法全部塞入模型）会失效。
- **GraphRAG** 把准备提前到建索引：以三元组穷举知识，复杂问题的答案在建索引时就已组织好，提问时按图召回排序。代价是建索引慢、覆盖难以穷尽用户多样化的问题。
- **DeepSearch** 不提前准备，把准备移到推理时：索引与 RAG 一样快，靠 query 改写、短期记忆库与结束判断的循环现场补全。与 GraphRAG 都能解决复杂问题，但 GraphRAG 是"事先穷举、问到即答"，DeepSearch 是"来什么问题现场思考"（信源 2026-11-23）。

信源的类比解读（勤奋学生题海战术 vs 聪明学生临场推理，对应 DeepSeek V3 vs R 的路线分野）：GraphRAG 与 V3 在训练（建索引）阶段加数据获取能力，DeepSearch 与 R 把大量时间放在推理。简单题目上普通学生与聪明学生看不出差距，难题上差距显现——此为作者类比，非评测结论（解读）。

## Best Fit（适用场景）

### 传统 RAG is preferable when（以下情况传统 RAG 更合适）

- 问答以单片段可答的精确问题为主，无综合性/全局性需求。
- 在线服务、低延迟场景，无法承担多轮推理的时间消耗。
- 已有标准 RAG 系统且问题形态简单（DeepSearch 在简单场景下加不加区别不大）。

### GraphRAG is preferable when（以下情况 GraphRAG 更合适）

- 问题模式相对固定、可提前穷举，且能接受建索引的一次性高成本。
- 核心问题是关系链（实体间关系传播），需要沿三元组网络召回。
- 对推理时延敏感、希望提问时直接命中已备好答案。

### DeepSearch is preferable when（以下情况 DeepSearch 更合适）

- 综合性、全局性问题为主（需跨多片段、多轮补全），如"介绍某朝代皇帝""对比头部对象"。
- 用户问题多样、难以事前穷举，愿意接受偏离线、较慢出答案的推理过程。
- 已有标准 RAG 系统希望低成本升级：索引侧不变，改造集中在推理侧循环。

## Important Caveats（重要提醒）

- 三模式对比为单信源实战口径，"上限更高""答案更丰富"为作者类比性论断，无独立量化评测支撑（信源 2026-11-23）。
- 分块口径差异：本文实战取 chunk 256 字符+30 重叠，与 [[rag-chunking]] 的 300~800 字迭代口径不同，属不同实战取值，非直接矛盾。
- 本文实战系统中图谱召回一路被弃用（效果差不多且拖慢速度），说明 GraphRAG 式三元组路径的收益依赖具体场景，参见 [[graphrag]] 的局限。
- DeepSearch 循环的结束判据（信息增量法）与轮次上限为本文口径，阈值选择无消融数据，参见 [[deepsearch]]。

## Evidence（证据）

- `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md`（微信 RAG 系列第 5 篇，2026-11-23，三模式对比与 DeepSearch 实战）
