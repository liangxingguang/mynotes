---
id: wiki-concept-deepsearch
type: concept
title: DeepSearch（Agentic 循环检索 RAG）
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - concept
  - rag
  - agentic-rag
sources:
  - raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md
related:
  - wiki/concepts/rag.md
  - wiki/concepts/graphrag.md
  - wiki/concepts/agent-loop.md
  - wiki/comparisons/rag-vs-graphrag-vs-deepsearch.md
---
# DeepSearch（Agentic 循环检索 RAG）

## Definition（定义）

DeepSearch 是面向**综合性、全局性问题**的新一代 RAG：问题需要跨多个片段、多轮补全才能回答（如"介绍明朝主要皇帝""对比去年手机销量前两名的品牌"），单次检索的单个片段无法解决。其本质仍是 [[rag|RAG]]，但在标准检索链路之上增加三个 Agentic 流程——**query 改写、短期记忆库、结束判断**——通过"检索 → 判断是否结束 → 未结束则改写 query → 再检索"的循环反复补全知识，因此也称 **Agentic RAG**（信源 2026-11-23）。

## Why It Matters（为什么重要）

传统 RAG 把数据切成扁平 chunk，一次检索取回若干片段即生成答案。对综合性问题（需综合多片段、或像"对比销量前两名"那样先要知道答案对象是谁），单轮单片段的检索—生成链路会失效。DeepSearch 把"多轮检索补全"显式做成循环，用结束判断控制何时停止，把 RAG 从"一次检索"扩展为"反复思考直至信息充分"，且索引侧与标准 RAG 相同、改造成本低（信源 2026-11-23）。

## Core Characteristics（核心特征）

1. **循环检索结构**：标准 RAG 返回结果后进入结束判断；未结束则做 query 改写，进入下一轮检索，直到满足结束条件或达到轮次上限（默认最大 3 轮，更长则时间消耗大）。
2. **Agentic 三要素**：短期记忆库（累积每轮检索到的知识点）、query 改写（把上轮结果扩展为下一轮子查询）、结束判断（判定信息是否已充分）。
3. **结束判断用信息增量法**：以 info_growth_rate（本轮新增 chunk 占已获取总量的比例）为判据，增量过少即 break——把"该停了"从启发式变成可计算指标。
4. **Query 改写有明确技巧**：用"上轮 response + 原 query"让 LLM 扩展成 n 个子查询（多对多）；**改写时不放入原 query**（实验证明会削弱发散性），相关性靠 rank 模型得分过滤保证；多条改写结果整体排序取 TopN 后，再用 LLM 把多个搜索词合并为更真实的搜索词进入下一轮。
5. **MMR 多样性去重**：取 2×topK 候选，得分 = α×排序得分 − (1−α)×与已选结果的最大相似度，抑制高分簇挤占冷门内容，再过滤为最终 topK。
6. **与标准 RAG 的边界**：简单场景下加不加 DeepSearch 区别不大；max_num 设为 1 即退化为标准 RAG（信源 2026-11-23）。

## Structure（结构）

DeepSearch = 标准 RAG（索引侧）+ 循环控制（推理侧）。

**索引侧**（与标准 RAG 相同，数据按纯文本处理）：

- 切块：chunk 256 字符且自然结束（就近找句号/感叹号），chunk 间共享约 30 字符防知识点被切断
- 内容理解打标签：关键词倒排索引、父子块、短文本提取向量、短文本摘要、三元组抽取
- 三路召回：向量召回（Bert）+ 关键词召回（whoosh/TFIDF）+ 图谱召回（实际工程中弃用，效果差不多且拖慢速度）
- 重排：BGE 排序模型打分 + MMR 去重

**推理侧**（DeepSearch 的增量）：

```text
query（数组）→ 标准 RAG 检索 → 结果存入短期记忆库
  → 结束判断（信息增量法 info_growth_rate）
      ├─ 信息已充分 → 整合全部知识点 + 原问题 → LLM 输出答案
      └─ 未结束 → query 改写（response+原 query → n 个子查询）
          → rank 过滤 + TopN + LLM 合并搜索词 → 下一轮检索（≤ max_num 轮）
```

## How It Works（运作方式）

1. 用户问题放入 query 数组（多轮检索形式上统一用数组）。
2. 第一轮对 query 走标准 RAG，得到响应与召回的 chunk id；远程调用模型需捕获敏感词安全审核异常，失败则忽略该 query。
3. 每轮新增的 chunk id 记为 new_ids，与已获取的 exist_ids 对比计算信息增量比例；增量过少 → break，增量足够 → 继续。
4. 未结束时做 query 改写：以上一轮 response 为素材，让 LLM 提取核心词扩展出 n 个 extend_query（用 `|` 分隔便于剔除），rank 模型对改写 query 与原 query 打分过滤，整体排序取 TopN，再由 LLM 把多个搜索词合并成更真实的搜索词。
5. 每轮模型返回的知识点全部存入短期记忆库（knowledge）；循环结束后，把记忆库中的全部知识点与原始问题一起交给 LLM，生成最终答案。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rag|RAG]]：DeepSearch 本质仍是 RAG，索引侧数据组织与标准 RAG 无差别，增量在推理侧循环。
- [[graphrag|GraphRAG]]：同为解决复杂问题的路线，但 GraphRAG 事前穷举（建索引时备好答案），DeepSearch 现场思考；详见 [[rag-vs-graphrag-vs-deepsearch]]。
- [[agent-loop|Agent Loop]]：DeepSearch 的"改写—检索—判断"循环与 Agent 的模型-工具循环同构，是 RAG 的 Agent 化形态。

### Distinctions（区分）

- **DeepSearch vs 传统 RAG**：传统 RAG 单轮单片段，数据扁平、无关联；DeepSearch 多轮循环补全，索引侧相同、耗时在推理。
- **DeepSearch vs GraphRAG**：GraphRAG 把三元组组织进索引、建索引慢、覆盖难全；DeepSearch 不事前准备，来问题现场循环检索，偏离线、上限更高（类比：勤奋学生题海战术 vs 聪明学生临场推理）。
- **DeepSearch vs 多跳检索**：[[rag]] 页所述多跳检索是"发现新线索再检索一轮"的检索技巧；DeepSearch 将其扩展为带结束判据与记忆累积的完整循环，并配套改写与排序策略。

## Evolution（演进）

- 2026-11-23 — 新建本页。信源 `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md` 给出 DeepSearch 的定义定位、索引侧链路（切块/标签/三路召回/MMR）、Agentic 三要素（结束判断信息增量法、query 改写技巧、短期记忆库）与三模式对比。

## Open Questions（开放问题）

- 信息增量法的阈值与最大轮次的最优取值：信源只给实战口径（增量比例过低即 break、默认 3 轮），无消融数据。
- DeepSearch 与混合检索/重排等标准 RAG 优化的叠加收益：信源未对比。
- "上限更高"为作者类比论断（DeepSeek V3 vs R 比喻），缺独立量化评测支撑。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-23-deepsearch-rag-comparison.md`（微信 RAG 系列第 5 篇，2026-11-23，DeepSearch 实战链路与三模式对比）

## Related Knowledge（相关知识）

- [[deepsearch-rag-comparison|新一代 RAG：DeepSearch 实战与三种 RAG 对比（信源页）]]
- [[rag-vs-graphrag-vs-deepsearch|传统 RAG vs GraphRAG vs DeepSearch（对比页）]]
- [[rag]]
- [[graphrag]]
- [[agent-loop]]
- [[rag-chunking]]（分块口径：本文 256 字符+30 重叠，与该页 300~800 字口径为不同实战取值）
