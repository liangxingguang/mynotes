---
id: wiki-concept-blue-green-deployment
type: concept
title: 蓝绿发布（Blue-Green Deployment）
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: high
tags:
  - concept
  - kubernetes
  - progressive-delivery
  - release-engineering
sources:
  - raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md
related:
  - wiki/concepts/expand-migrate-contract.md
  - wiki/concepts/idempotency-design.md
  - wiki/entities/argo-rollouts.md
---
# 蓝绿发布（Blue-Green Deployment）

## Definition（定义）

一种渐进式交付策略：完整的新版本（Green）先在 Preview 通道就绪并验证，再将生产入口 Service 整体指向 Green；旧版本（Blue）在观察期内全程保留为即时回退目标，分析门禁失败时自动把入口回指 Blue。其实质是 **Preview + 全量切换 + 自动观察回退**，而非"两个版本永远各跑一套环境"。

## Why It Matters（为什么重要）

对交易类核心链路，"切流成功"恰是风险开始的地方：订单、支付、库存共用数据与消息通道，老连接仍可能留在 Blue，新版本异常往往在全量流量、缓存未热、连接池刚扩张时才暴露；且应用回退不能撤销已发生的扣款、库存预留和消息投递。蓝绿发布的工程价值不是让变更看起来像"无中断切换"，而是承认变更会失败，并提前把失败限制在可理解、可观测、可回退、可补偿的范围内。

## Core Characteristics（核心特征）

1. **Blue 全程保留**：观察期（AnalysisRun 回退窗口 + 旧连接缓冲）内 Blue 保持可路由、足副本；保留时长由分析时长决定（如门禁 initialDelay 2m + 10×30s 采样 + 收敛缓冲 ⇒ 最短约 8 分钟，案例取 `scaleDownDelaySeconds: 480`）。它不是数据回滚窗口。
2. **selector 切换的最终一致性**：Service selector 更新只影响新建连接与新请求；已有 TCP/gRPC stream/WebSocket 不迁移；EndpointSlice/kube-proxy/CNI 数据面分节点收敛，业务须容忍短暂不一致。
3. **四维门禁而非 Pod Ready**：基础设施（副本/重启/OOM/throttling）→ 服务 SLI（5xx/P95/P99/饱和度）→ 依赖健康（DB pool/慢 SQL/MQ backlog/下游 gRPC 错误）→ 业务指标（下单成功率/幂等冲突/状态机非法跳转）；且**低流量/空结果不是健康**，必须先过最小样本量门禁。
4. **人机交接点**：前置验证（冒烟、契约、dry-run）自动化，核心链路全量切换保留有责任人的批准（`autoPromotionEnabled: false`）。
5. **资源换回退能力**：Blue+Green 双版本资源窗口按 requests 而非 limits 核算，另加系统与故障域冗余；HPA 只调副本数，节点容量靠 Cluster Autoscaler/Karpenter。

## Structure（结构）

以 Argo Rollouts blueGreen strategy 为例的最小骨架：Active/Preview 两个 Service（由 Argo 注入 `rollouts-pod-template-hash` selector，禁止手工 patch）、Rollout（previewReplicaCount、pre/postPromotionAnalysis、scaleDownDelaySeconds）、Preview 冒烟 Job（只测健康/版本/签名/dry-run 契约，不制造真实交易）、post-promotion AnalysisTemplate（PromQL：样本量 + 5xx + 业务成功率）。Istio 只做 mTLS/指标/入口路由，不再承担版本选择，避免 Service selector 与 VirtualService 权重两个控制面互相打架。

## How It Works（运作方式）

一次 promote：① Argo 建 Green ReplicaSet 并把 Preview Service 指向其 hash；② Preview 副本就绪 + pre-promotion AnalysisRun 通过后暂停待批；③ 批准后 Green 扩至 `spec.replicas`，全部 Available 才把 Active Service selector 改为 Green hash；④ 数据面逐节点收敛；⑤ post-promotion AnalysisRun 观察纯 Green 流量，连续失败即把 Active 回指上一稳定 ReplicaSet，并保留 Green 现场（连接池/goroutine/日志）供取证，同时自动创建业务对账任务。

配套的两个子问题各有独立章法：Pod 优雅退出用 `/internal/drain` 幂等状态切换（readiness 立即 503）+ preStop/TERM 后排空在途请求，不用 sleep 猜时间；数据兼容性由 [[expand-migrate-contract|Expand/Migrate/Contract]] 跨 release 保证。

## Relationships（关系）

### Related Concepts（相关概念）

- [[expand-migrate-contract|Expand/Migrate/Contract]]：蓝绿安全回退的数据前提——Green 写入须对 Blue 可读，破坏性 Contract 必须等回退窗口关闭。
- [[idempotency-design|幂等设计]]：蓝绿回退与客户端重试不造成二次业务执行的前提（订单+幂等键+Outbox 同事务）。

### Distinctions（区分）

- 与 Canary 的区别：Canary 以 1%→5%→25%→50%→100% 分阶段放量控制爆炸半径，适合必须靠真实流量发现问题的服务；BlueGreen 是 Preview 验证后全量切换，适合需要快速退回稳定版本且能承担双版本资源窗口的核心服务。不要在同一份 Rollout strategy 中混配两者。
- 与流量镜像（Mirror）的区别：镜像请求的响应不回传用户，只适用于读请求或严格 shadow 隔离；对下单/扣款等写请求直接 mirror 会产生真实副作用，不是"零风险压测"。

## Evolution（演进）

- 2026-10-27：[[k8s-blue-green-release-trading|日千万级交易系统蓝绿实战]] 立页：脱敏事故复盘（约 3 分钟发现、5xx 0.42% 触发回退、12 笔 Green 订单对账无恙）+ 完整资源定义与 11 步可审计流水线。

## Open Questions（开放问题）

- 长连接占比高的服务（WebSocket 订单推送）Blue 保留期的量化方法，现有信源只给出"分析窗口+缓冲"的定性边界。
- 多服务联动发布（订单+支付+库存同变更）时的门禁编排，信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md`（脱敏实战：事故复盘、Rollout/AnalysisTemplate YAML、门禁参数、容量核算、复盘时间线）

## Related Knowledge（相关知识）

- [[argo-rollouts|Argo Rollouts（实体页）]]
- [[table-sharding-migration|分表平滑迁移策略（概念页）]]（数据侧变更的另一条演进路径）
- [[k8s-ha-cluster-setup-guide|K8s 高可用集群搭建（信源页）]]
