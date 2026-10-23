---
id: wiki-concept-agent-evaluation
type: concept
title: 业务 Agent 全生命周期评测
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: medium
tags:
  - concept
  - ai
  - agent
  - evaluation
sources:
  - raw/sources/ai/2026-10-14-huolala-agent-eval-platform.md
  - raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md
related:
  - wiki/sources/huolala-agent-eval-platform.md
---
# 业务 Agent 全生命周期评测

## Definition（定义）

面向生产环境业务 Agent 的质量保障范式：以"确定性规则 + LLM 智能裁判 + 人工复核"的复合裁判体系，覆盖测试数据准入、离线评测、CI/CD 门禁、性能压测与线上巡检的完整生命周期，而非单点打分。两个独立信源互证：货拉拉给出平台化落地，叶小钗综述给出"评测应从需求阶段开始、验收分清工具返回/任务结果/业务收益"的方法论立场。

## Why It Matters（为什么重要）

LLM 概率输出 + 长工具调用链使传统确定性断言失效：单步推理"都合理"但端到端错误，改一处 Prompt 常修好一个 Bug 引入三个缺陷。没有全生命周期评测，Agent 质量"不可知、不可控"，不敢上生产。

## Core Characteristics（核心特征）

1. 复合裁判：确定性规则（结构化校验/正则/硬匹配/关键词/Embedding 相似度）守底线，分层 LLM Judge 拉上限，多次采样去极值取均值、方差超阈值转人工。
2. Session 级评分：红线违规一票否决穿透全会话；轮次权重前轻后重，考验长程记忆。
3. 数据合规准入：评测发起时全量扫描环境标识/Schema/必填字段，不合规即熔断，杜绝"带病评测"。
4. 性能维度跃迁：度量 TTFT/TTLT/TPS/RPS 而非仅 QPS，支持固定与爬坡并发压测流式输出。
5. 流水线闭环：准入冒烟、准出基准比对阻断发布，线上分钟级巡检告警。

## Structure（结构）

货拉拉落地为六大支柱：多协议资产纳管 → 测试数据合规准入 → 多模复合智能裁判 → 评测计划与全景报告 → LLM 性能压测 → CI/CD 门禁闭环。（信源给出的工程结构。）

## How It Works（运作方式）

评测计划按能力项设目标分与权重发起；平台经拦截器动态注入参数调用被测 Agent，规则引擎毫秒级校验硬事实，Judge Prompt 按平台-Agent-用例三维动态组合评分，专家复核样本沉淀为黄金集反哺裁判 Prompt；准出时全量基准比对目标分，不达标阻断发布。

## Relationships（关系）

### Related Concepts（相关概念）

- （暂无已建页的相关概念）

### Distinctions（区分）

- 与传统软件测试的区别：断言对象从确定性输出变为概率输出，需要裁判模型与统计聚合，且必须评估中间链路（意图理解、工具执行）而非只看最终回答——货拉拉拦截缺陷中意图理解 33.84% + 工具执行 31.12% 占近 2/3。

## Evolution（演进）

- 2026-10-14 — 货拉拉披露三代演进路径：人工盲测 → 离线数据集 + 单一 LLM-as-a-Judge → 全生命周期平台（114 个智能体、16,337 黄金用例、回归提效 5~10 倍）。
- 2026-10-21 — 叶小钗综述独立印证并补充：评测后置是反模式，应从需求阶段把"希望 Agent 很智能"变成可验证的交付要求；企业任务按知识问答/查询/报告/执行四类分别定验收重点；"任务完成的证据应能在产物或业务状态中找到"（接口成功可能只是已受理）；评分组合=程序核验确定性字段+LLM Judge 语义+专家抽查校准；通过率必须说明分母与任务构成，线上失败归因后回流数据集。

## Open Questions（开放问题）

- Judge 模型自身的幻觉与偏见如何系统性校正（信源只给出采样聚合与转人工策略）。
- Multi-Agent 链路评测（通信/死锁/状态一致性）仍是公开难题，货拉拉亦列为未来方向。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-huolala-agent-eval-platform.md`
- Source: `raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md`（方法论印证：评测前置、四类任务验收、证据导向、分母纪律）

## Related Knowledge（相关知识）

- [[huolala-agent-eval-platform]]
- [[agent-2026-midyear-architecture-review|2026 Agent 年中总结（信源页）]]
