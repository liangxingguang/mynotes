---
id: wiki-source-k8s-blue-green-release-trading
type: source
title: 从零构建 K8s 蓝绿发布：日千万级交易系统的渐进式交付实战
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - source
  - kubernetes
  - progressive-delivery
  - release-engineering
sources:
  - raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md
related:
  - wiki/concepts/blue-green-deployment.md
  - wiki/concepts/expand-migrate-contract.md
  - wiki/entities/argo-rollouts.md
---
# 从零构建 K8s 蓝绿发布：日千万级交易系统的渐进式交付实战

## Overview（概览）

微信公众号实战长文（约 2 万字，脱敏案例）。以一次订单服务发布事故为主线，给出交易系统蓝绿发布的完整工程实现：Argo Rollouts 资源定义、Preview 冒烟、四层 SLO 门禁、优雅退出状态机、Expand/Migrate/Contract 数据兼容、容量门禁与可审计发布流水线。核心立场：蓝绿的价值不是"无中断切换"，而是承认变更会失败，并把失败限制在可观测、可回退、可补偿的范围内。

## Key Facts（关键事实）

- 案例规模（脱敏）：订单服务 8 副本，单副本 requests `500m CPU / 512Mi`；入口日常 3,000–5,000 QPS，大促峰值超 12,000 QPS；gRPC 内部调用 + WebSocket 订单状态推送；PostgreSQL 15 为订单事实数据源。
- post-promotion 门禁参数：每项指标 initialDelay 2m、interval 30s、count 10、failureLimit 1，PromQL 用 2 分钟回看窗口；据此 Blue 最短保留期取 `scaleDownDelaySeconds: 480`。
- 门禁阈值（案例值，非通用答案）：5xx 错误率 < 0.1%，下单成功率 ≥ 99.9%，最小样本量 2 分钟内 `order_create_total` 增量 ≥ 200。
- 事故复盘时间线：10:05 promote → 10:07:30 第二次采样 5xx 达 0.42%、下单成功率降至 99.41% → AnalysisRun 失败 → 10:07:35 Active Service 回指 Blue（约 3 分钟发现）；12 笔 Green 订单经幂等键/Outbox/支付流水/库存预留对账确认无重复执行。
- 容量门禁：Blue+Green 合计 8 CPU / 8Gi requests，调度可行性按 requests 而非 limits 判断，另加系统与故障域冗余。
- 终止预算：`terminationGracePeriodSeconds: 75`，preStop 调用 `/internal/drain`，排空超时 55 秒；`abortScaleDownDelaySeconds: 120`。

## Important Claims（重要论断）

### Claim 1：selector 切换只影响新建连接

Service selector 更新不代表数据面瞬时收敛；已有 TCP/gRPC stream/WebSocket 不会迁移到 Green。Blue 保留期 = AnalysisRun 回退窗口 + 旧连接自然结束缓冲，不是数据回滚窗口。

### Claim 2：低流量/空结果不是健康

两分钟只有 3 个请求时 0% 错误率没有统计意义；门禁必须先过最小样本量，再判断成功率。PromQL 须验证标签存在、量纲一致、重试不放大分母。

### Claim 3：应用回退 ≠ 数据回退 ≠ 业务回退

流量切回 Blue 不撤销 Green 已写入的数据与已投递的消息；Schema 变更必须跨 release 走 Expand→Migrate→Contract；补偿由业务状态机驱动，不能以"删除 Green 数据"代替。

### Claim 4：不要在同一份 Rollout strategy 中混用 blueGreen 和 canary

需要两阶段验证时应在发布流程上串联（先 BlueGreen Preview 验证兼容性，再独立 Canary Rollout 放量），而非混配 strategy。流量镜像默认不适合写请求，绝不是"零风险压测"。

## Concepts Introduced（引入的概念）

- [[blue-green-deployment|蓝绿发布（概念页）]]
- [[expand-migrate-contract|Expand/Migrate/Contract（概念页）]]

## Entities Mentioned（提及的实体）

- [[argo-rollouts|Argo Rollouts（实体页）]]
- Istio / Prometheus / PostgreSQL / Karpenter（仅作配套提及，暂不立实体页）

## Implications（影响／启示）

- 发布可靠性=四个前置设计（Blue 全程保留、数据兼容、写幂等、多维门禁），而非"回滚命令快"——可迁移到所有有状态核心链路（解读）。
- 「门禁看业务指标而非 Pod Ready」与 [[rag-production-guardrails|RAG 生产护栏]] 的"证据门禁前置"同为把验收标准从事后移到流程内（解读）。

## Limitations（局限）

- 案例经脱敏与泛化，阈值（0.1%/99.9%/200 样本）须按各自服务 SLO 与 28 天基线重定。
- Preview 冒烟只覆盖 dry-run 契约，不能证明全量容量（previewReplicaCount: 2 的明示局限）。

## Related Knowledge（相关知识）

- [[blue-green-deployment|蓝绿发布（概念页）]]
- [[expand-migrate-contract|Expand/Migrate/Contract（概念页）]]
- [[argo-rollouts|Argo Rollouts（实体页）]]
- [[idempotency-design|幂等设计（概念页）]]（订单+幂等键+Outbox 同事务为其第四信源）
- [[k8s-ha-cluster-setup-guide|K8s 高可用集群搭建（信源页）]]（同域基础设施）

## Source（信源）

- `raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md`
