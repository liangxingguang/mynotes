---
id: 2026-11-23-deepsearch-rag-comparison
title: 新一代 RAG：DeepSearch 实战与三种 RAG 对比
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/421gHY_4X9lSgbkoIMj9Ug
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, Agent]
asset_ref: Assets/2026-11/weixin-421ghy-4x9lsgbkoimj9ug.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-23T11:38:07.698Z"
ingest_claim_id: 25136-1795433887698-0
---

# 新一代 RAG：DeepSearch 实战与三种 RAG 对比

> RAG 系列第五篇，讲新一代 RAG——DeepSearch：本质仍是 RAG，但面向综合性、全局性问题（如"介绍明朝皇帝""对比手机销量前两名"），通过 query 改写 + 短期记忆库 + 结束判断的循环检索（Agentic RAG）反复补全知识。并对比传统 RAG、GraphRAG、DeepSearch 三种设计模式的取舍。

## 核心要点

- **DeepSearch 定位**：解决综合性/全局性问题，单片段无法回答；数据按纯文本处理，切 chunk 要求 256 字符自然结束（就近找句号/感叹号），chunk 间共享约 30 字符防止知识点被切断。
- **内容理解打标签**：关键词倒排索引、父子块（检索用子块、进模型用父块扩大上下文）、短文本提取向量（长文本向量不准）、短文本摘要（控制召回规模）、三元组抽取（GraphRAG 一路召回）；实际中 KG 路因收益小、拖速度而弃用。
- **三路召回与排序**：向量召回（Bert）+ 关键词召回（轻量 whoosh 倒排库）+ 图谱召回；BGE 排序模型打分，再用 **MMR 最大边际相关**算法去重保多样性——得分=α×相关性−(1−α)×与前文最大相似度，避免高分簇（如全为朱元璋）挤占冷门内容；取 2 倍 TOPK 经 MMR 过滤为最终 TOPK。
- **Agentic 三要素**：query→标准 RAG→**结束判断**（信息增量法：新增 chunk 占已有总量的比例 info_growth_rate 过低即 break，默认最多循环 3 轮，需捕获远程调用敏感词异常）→未结束则**query 改写**→下一轮检索。
- **Query 改写技巧**：用"上轮 response+原 query"让 LLM 扩展成 n 个子查询（数组多对多）；改写时不放原 query（实验证明会削弱发散性），靠 rank 模型得分保证相关性；整体排序取 TopN 后，用 LLM 把多个搜索词合并为更真实的搜索词进入下一轮；每轮结果存入**短期记忆库**，循环结束后整合全部知识点+原问题交 LLM 输出。
- **三种 RAG 对比**：传统 RAG 数据扁平、chunk 无关联，简单但解决不了综合问题；GraphRAG 建索引时以三元组穷举备好答案，建索引慢、覆盖难全；DeepSearch 索引与 RAG 一样快，耗时在推理，偏离线任务，靠现场思考应对多样复杂问题，上限更高。类比：GraphRAG 是"勤奋学生的题海战术"，DeepSearch 是"聪明学生的临场推理"（如 DeepSeek V3 vs R）。

## 正文

见 `[[Assets/2026-11/weixin-421ghy-4x9lsgbkoimj9ug]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/421gHY_4X9lSgbkoIMj9Ug

## 附件

[[Assets/2026-11/weixin-421ghy-4x9lsgbkoimj9ug.md]]
