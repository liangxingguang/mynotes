---
id: 2026-11-23-rag-practice-medical
title: RAG 技术实战：从微调召回到精排的完整链路
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/edDGX5yzynwwFgawXnMkkw
source_type: 网页
platform: 微信
created: 2026-11-23
category: 技术
tags: [RAG, AI]
asset_ref: Assets/2026-11/weixin-eddgx5yzynwwfgawxnmkkw.md
wiki_status: ingested
---

# RAG 技术实战：从微调召回到精排的完整链路

> RAG 系列实战篇：以医疗问答为例走通整套链路——基础问答对架构的召回痛点、用 LLM 把非结构化文本拆成问答对、Bert 微调造样本、DSSM 双塔召回模型、Faiss 写索引、Bert 二分类精排，并对比 RAG 与 SFT、讨论多轮问答的上下文处理。核心结论：召回+排序+大模型归纳三段式，原生模型替换后效果立降。

## 核心要点

- **能力定位**：大模型能力分推理（靠思维链）与知识（RAG 补充）两套技术；基础架构是问答对知识库向量化检索，痛点是召回数量与误召回难控制。
- **数据准备**：用大模型把非结构化文本拆解生成问答对；原生 Bert 是泛常识模型、向量不宜直接用于专业域召回，需自采数据微调——同病句内打乱配对做正样本（每病约 3000 对），跨病随机组合做负样本（正样本的 2–4 倍），样本量需过万。
- **双塔召回（DSSM）**：两塔共享参数保证向量同空间，余弦相似度经 sigmoid 转 0–1，温度系数放大分数以便收敛；冻结前层只训练最后一层（数据量大再加层）；只保存 Bert 不保存 DSSM，句子向量全部离线预计算。
- **索引与检索**：向量归一化后（768 维）写入 Faiss 索引（分区加速，只算同区相似度）；在线侧先用 LLM 扩写 query（随机采样保多样性），每路 Faiss 召回 30 个候选。
- **精排（rank）**：双塔无信息交互，用 Bert 将 query 与候选句拼接做二分类打分（截取 200 字内），低于阈值过滤；多路召回的重复候选按"次数/分数"累加排序取 Top；可用关键词贡献过滤乱问，排序严格时召回可放宽。
- **效果验证**：OpenAI 数据——原生模型 45% 准确率，召回提升到 65%，重排 85%，大模型归纳 98%；召回与排序换回原生模型效果立刻变差。离线用大模型（如通义 14B）、在线用小模型（如 ChatGLM 6B）控成本。
- **RAG vs SFT**：RAG 用动态数据可每日更新、外挂知识、幻觉少、可逐阶段 debug；SFT 影响文风、静态数据更新贵；专业问答优先 RAG，写作风格用 SFT。
- **多轮问答**：前几轮知识全拼入会因上下文过长忽略本轮问题，需判断上下文是否关联（模型二分类自动切分）或用大模型提取摘要；提示词稳定性弱——demo 看上限，生产看下限，慎用。

## 正文

见 `[[Assets/2026-11/weixin-eddgx5yzynwwfgawxnmkkw]]`（抓取稿，配图原位为 1px 占位符属公众号抓取常态，文字内容完整）。

## 来源

- https://mp.weixin.qq.com/s/edDGX5yzynwwFgawXnMkkw

## 附件

[[Assets/2026-11/weixin-eddgx5yzynwwfgawxnmkkw.md]]
