---
id: wiki-source-deepsearch-rag-comparison
type: source
title: 新一代 RAG：DeepSearch 实战与三种 RAG 对比
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - rag
  - agentic-rag
sources:
  - raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md
---
# 新一代 RAG：DeepSearch 实战与三种 RAG 对比

## Overview（概览）

微信公众号技术文章，"大模型 RAG 系列"第 5 篇。前半部分以《明朝那些事儿》纯文本知识库为例，实战拆解 DeepSearch（新一代 RAG / Agentic RAG）的完整链路：切块与内容理解打标签、三路召回与 BGE 排序、MMR 多样性算法、结束判断（信息增量法）与 query 改写循环；后半部分对比传统 RAG、GraphRAG、DeepSearch 三种设计模式在数据组织、建索引成本与解题机制上的取舍。

## Key Facts（关键事实）

- DeepSearch 面向**综合性、全局性问题**（如"介绍明朝主要皇帝""对比去年手机销量前两名的品牌"），单片段无法回答；数据按纯文本处理（信源明确与"问答对形式"的旧 RAG 相区分）。
- 切块口径：chunk 256 字符且**自然结束**（就近找句号/感叹号），chunk 间共享约 30 字符防止知识点被切断；先分句建中间结果，再由大模型提取摘要构建 chunk，最后回退 common_token 保证相邻 chunk 有标记。
- 内容理解五类标签：关键词倒排索引、父子块（检索用子块、进模型用父块，width=2 即前后各扩两句）、短文本提取向量（长文本向量不准）、短文本摘要（控制召回规模）、三元组抽取（GraphRAG 一路召回）。
- 三路召回：向量召回（Bert 向量）+ 关键词召回（whoosh 轻量倒排库，TFIDF）+ 知识图谱召回（大模型抽三元组）；**实际工程中 KG 一路弃用**——效果差不多且减慢速度。
- 排序用 BGE 重排模型（score = sigmoid(logit)），本文调用阿里云通义千问 72B 接口。
- MMR 最大边际相关：取 2×topK 候选，得分 = α×排序得分 − (1−α)×与前文最大相似度，抑制高分簇（如全为朱元璋）挤占冷门内容，过滤为最终 topK。
- Agentic 三要素：**短期记忆库 + query 改写 + 结束判断**；核心仍是标准 RAG，故称 Agentic RAG。
- 结束判断用**信息增量法**：info_growth_rate = 本轮新增 chunk 占已获取总量的比例，增量过少即 break；默认最大循环 3 次（更长则时间消耗大）；需捕获远程调用触发的敏感词安全审核异常。
- Query 改写：以"上轮 response + 原 query"让 LLM 扩展为 n 个子查询；**改写时不放入原 query**（实验证明会削弱发散性），靠 rank 模型得分过滤保证相关性；整体排序取 TopN 后，用 LLM 把多个搜索词合并为更真实的搜索词进入下一轮。
- 简单场景下 DeepSearch 与普通 RAG 区别不大；max_num 设为 1 即退化为标准 RAG。
- 三种 RAG 对比：传统 RAG 数据扁平、简单但解决不了综合问题；GraphRAG 建索引时以三元组穷举备好答案，建索引慢、覆盖难全；DeepSearch 建索引速度与 RAG 相同，耗时在推理，偏离线任务，上限更高。
- 类比（信源解读）：GraphRAG 如"勤奋学生题海战术"（训练/建索引时加能力），DeepSearch 如"聪明学生临场推理"（DeepSeek V3 vs R 的比喻）。

## Important Claims（重要论断）

### Claim 1：DeepSearch 本质仍是 RAG，新增的是循环检索机制

DeepSearch 的核心仍是标准 RAG，只是在返回结果后增加结束判断与 query 改写，循环往复直至满足结束条件或达到轮次上限。它应对的是传统 RAG"单片段回答不了综合问题"的失效场景。

### Claim 2：GraphRAG 与 DeepSearch 是"事前穷举 vs 现场思考"的路线分野

GraphRAG 在建索引阶段把知识以三元组组织并穷举备好答案；DeepSearch 事前不准备，来什么问题现场循环思考。用户问题多样，事前准备难以穷尽，DeepSearch 的上限因此更高，但答案出来更慢。

### Claim 3：KG 三元组召回在实战中收益有限

本文实作的系统中，知识图谱一路召回最终没有使用：有无它效果差不多，且减慢速度。这是 GraphRAG 式三元组路径在单库问答场景下的一个实战反例（与 GraphRAG 概念页的定位互补，见 [[graphrag]]）。

## Concepts Introduced（引入的概念）

- [[deepsearch]]
- [[rag]]
- [[graphrag]]
- [[rag-vs-graphrag-vs-deepsearch]]

## Entities Mentioned（提及的实体）

- BGE（重排模型）
- whoosh（轻量倒排索引库）
- Bert（向量提取模型）
- 通义千问 72B（本文调用的模型接口，经阿里云）
- Elasticsearch（文中作为倒排索引常用方案被提及，实际采用 whoosh）

## Implications（影响／启示）

- 从既有 RAG 系统升级到 DeepSearch 成本较低：索引侧数据组织与标准 RAG 相同，改动集中在推理侧的改写、结束判断与记忆循环。
- 综合/全局性问答（跨多片段、需反复补全）是 Agentic RAG 的明确适用域；简单问答不必上循环，max_num=1 即标准 RAG。
- 结束判断的"信息增量"指标把"何时该停"从启发式变成可计算判据，是循环检索可工程化的关键。

## Limitations（局限）

- 单信源，无独立验证；MMR、信息增量阈值、改写轮数等具体取值均为本文实战口径，未给出消融或对比数据。
- 文中配图均为抓取占位符，无架构图/流程图可佐证（文字描述完整）。
- "上限更高""答案更丰富"等为作者类比性论断，无量化评测支撑。

## Related Knowledge（相关知识）

- [[deepsearch]]
- [[rag]]
- [[graphrag]]
- [[rag-vs-graphrag-vs-deepsearch]]
- [[rag-chunking]]（分块口径差异：本文 256 字符+30 重叠 vs 该页 300~800 字迭代口径）

## Source（信源）

- `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md`
- 原始链接：https://mp.weixin.qq.com/s/421gHY_4X9lSgbkoIMj9Ug
