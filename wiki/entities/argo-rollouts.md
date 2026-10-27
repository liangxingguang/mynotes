---
id: wiki-entity-argo-rollouts
type: entity
title: Argo Rollouts
status: active
created: 2026-10-27
updated: 2026-10-27
confidence: medium
tags:
  - entity
  - kubernetes
  - progressive-delivery
sources:
  - raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md
related:
  - wiki/concepts/blue-green-deployment.md
---
# Argo Rollouts

## Overview（概览）

Kubernetes 渐进式交付控制器，以 Rollout CRD 替代 Deployment 管理版本切换，支持 blueGreen 与 canary 策略，并通过 AnalysisTemplate/AnalysisRun 把指标门禁嵌入发布流程。

## Identity（身份信息）

- Type（类型）: Kubernetes 控制器（CRD + kubectl 插件）
- Organization（所属组织）: Argo 项目（信源未展开，具体归属未确立）
- Role（角色）: 发布控制面——管理 Active/Preview Service selector、副本扩缩与发布门禁
- Status（状态）: 生产可用（信源中作为日千万级交易系统发布底座）

## Important Facts（重要事实）

- blueGreen strategy 关键字段：`activeService`/`previewService`、`previewReplicaCount`、`autoPromotionEnabled`、`prePromotionAnalysis`/`postPromotionAnalysis`、`scaleDownDelaySeconds`、`abortScaleDownDelaySeconds`。
- 向 Active/Preview Service 注入并更新 `rollouts-pod-template-hash` selector；不要手工 patch Service 或自造 `version: blue/green` 控制字段。
- AnalysisRun 指标参数：initialDelay/interval/count/failureLimit/successCondition，provider 支持 prometheus（PromQL）与 job（冒烟容器）。
- 案例参数：门禁 initialDelay 2m + interval 30s × 10 次 ⇒ Blue 最短保留约 8 分钟（取 `scaleDownDelaySeconds: 480`）；abort 后 Green 保留 120 秒供取证。
- `progressDeadlineAbort: true` 防止 Green 长期卡不可用仍占用发布窗口，但不能替代依赖/容量/业务门禁。
- 不要在同一份 Rollout strategy 中同时配置 `blueGreen` 和 `canary`；两阶段验证应在流程上串联独立 Rollout。
- 运维入口：`kubectl argo rollouts get/promote/abort`，配合 `kubectl get analysisrun` 观察门禁结果。

## Products / Projects（产品／项目）

- Rollout CRD（`argoproj.io/v1alpha1`）
- AnalysisTemplate / AnalysisRun（发布门禁）
- kubectl argo rollouts 插件

## Relationships（关系）

- [[blue-green-deployment|蓝绿发布（概念页）]]：Argo Rollouts 是该策略在 K8s 上的实现载体之一。
- 与 Istio 的职责划分（信源案例）：Rollouts 管版本选择，Istio 只管 mTLS/指标/入口路由，避免双控制面冲突。

## Timeline（时间线）

- 2026-10-27 — 信源 [[k8s-blue-green-release-trading]] 收录：交易系统 blueGreen 完整配置与事故回退复盘。

## Current Understanding（当前认知）

在已收录信源中，Argo Rollouts 是"承认变更会失败"发布工程的控制面：Preview 冒烟 → 人工批准 → 全量切换 → post-promotion 门禁自动回退的骨架均由其承载。版本归属、与 Flagger 等同类工具的对比，当前 Wiki 未确立。

## Evidence（证据）

- `raw/sources/architecture/2026-10-27-k8s-blue-green-release-trading.md`（Rollout/AnalysisTemplate YAML、字段工程含义、promote/abort 命令）
