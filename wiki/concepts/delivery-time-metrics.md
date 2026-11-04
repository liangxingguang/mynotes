---
id: wiki-concept-delivery-time-metrics
type: concept
title: 交付时间口径（四套度量）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - cicd
  - delivery
  - metrics
sources:
  - raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md
related:
  - wiki/concepts/immutable-image-promotion.md
  - wiki/sources/2026-11-03-go-gitlab-cicd-delivery.md
---
# 交付时间口径（四套度量）

## Definition（定义）

把"交付快慢"拆成四套独立起止点的时间度量，分别服务于组织流程评估、流水线效率、自动链路优化与恢复能力检验：变更交付前置时间、Pipeline 墙钟时间、自动执行时间、故障恢复时间。核心主张（自信源）：交付慢、交付不可信与交付不可恢复是三件事，不能用一个数字混同度量。

## Why It Matters（为什么重要）

- "一次发布花了三天"不等于编译器工作三天：评审、排队、依赖下载、环境竞争、人工审批、观察、重复验证都混在其中（信源）。
- "11 分钟 Pipeline"不等于服务安全上线：可能尚未人工批准，或只验证了 Pod 就绪（信源）。
- 有人工生产门禁时必须同时记录"进入待审批时间"与"生产验证通过时间"；待审批不是上线成功，混成一个数字会让优化结论失真（信源）。

## Core Characteristics（核心特征）

1. **变更交付前置时间**：选定提交 → 生产业务验证通过；用途是评估组织与流程；必须固定提交起点。
2. **Pipeline 墙钟时间**：Pipeline 创建 → 约定终态；衡量整体效率；须明确是否包含人工等待。
3. **自动执行时间**：排除审批、排队后的自动链路；用于优化 Runner、缓存、镜像和部署。
4. **故障恢复时间**：发现异常 → 业务恢复；检验回滚、补偿与应急能力。

## Structure（结构）

```
交付度量（四口径）
├── 变更交付前置时间 → 组织/流程问题（评审、门禁、观察窗口）
├── Pipeline 墙钟   → 效率问题（排队、阶段编排）
├── 自动执行时间    → 工程优化对象（Runner、缓存、镜像、部署）
└── 故障恢复时间    → 韧性问题（回滚、补偿、演练）
```

## How It Works（如何运作）

1. 优化前先画依赖图，采集创建、开始、结束、artifact 上传与人工等待各段时间。
2. 优化关键路径而非 Job 耗时总和：真正并行时墙钟接近最长 Job 而非总和；Runner 只有一个可用执行槽时，再漂亮的 YAML 也不产生并行收益。
3. 用实验协议证明优化有效（详见 [[immutable-image-promotion|不可变镜像晋级链]] 的实验设计）：同一提交/工具链 digest/Runner 配额/平台下跑三组实验——冷构建（无缓存，记录依赖下载与完整编译成本）、热构建（记录恢复、编译、保存耗时与目录大小）、单服务变更（记录影响范围与其他服务触发情况）。
4. 每组报告样本数、P50、P95、失败率；排队、人工门禁与观察窗口分离计量；镜像首拉、临时 worker、网络波动、自动重试都进记录。
5. 防误判：Runner 排队（防扩容收益误当编译收益）、Go 缓存（防只看命中率不看传输成本）、镜像（防混用体积口径）、Pipeline（防并行时间直接相加）、质量（防为提速删检查）、发布（防环境运行其他版本）、成本（防只降墙钟放大资源成本）。
6. Runner 并发不是 CPU 核数的同义词：按单 Job CPU、内存峰值与 I/O 瓶颈设配额，再做阶梯压测。

## Relationships（关系）

### Related Concepts（相关概念）

- [[immutable-image-promotion|不可变镜像晋级链]]：度量是证明晋级链优化有效的手段。
- [[retry-governance|重试治理]]：自动执行时间的计量须区分可重试与不可重试失败。

### Distinctions（区分）

- 与"单 Job 耗时"的区别：墙钟 ≠ 各 Job 之和；只有并行度真实存在时墙钟才接近最长 Job（信源）。

## Evolution（演进）

- 2026-11-04：自立。单一信源（Go 微服务 GitLab CI/CD 工程实战），四口径定义 + 关键路径原则 + 实验协议 + 防误判表。方法论性质内容，置信度 medium，待其他信源印证。

## Open Questions（开放问题）

- 四口径的采集工具链与自动化埋点方案，信源只给原则未给实现。
- 组织流程瓶颈（前置时间长）的量化归因方法，信源未展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md`（§1 四套时间口径、§1.2 关键路径、§13 实验协议与防误判表）

## Related Knowledge（相关知识）

- [[2026-11-03-go-gitlab-cicd-delivery|Go 微服务 GitLab CI/CD 工程实战（信源页）]]
- [[immutable-image-promotion|不可变镜像晋级链]]
