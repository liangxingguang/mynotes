---
id: wiki-concept-pd-separation-kv-cache-consistency
type: concept
title: PD 分离架构下的 KV Cache 生命周期一致性
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - concept
  - inference
  - kv-cache
  - pd-separation
sources:
  - raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md
related:
  - wiki/concepts/hicache-read-before-ready.md
  - wiki/concepts/speculative-decoding-quality-monitoring.md
  - wiki/concepts/layersplit-kv-cache-tiering.md
  - wiki/sources/deepseek-v41-flash-inference-deployment.md
---
# PD 分离架构下的 KV Cache 生命周期一致性

## Definition（定义）

PD 分离（Prefill/Decode 分离）架构中，请求生命周期与 KV Cache 的回收、复用时序必须保持一致性约束：请求被终止后，其 KV Cache 槽位只有在确认所有在途写入均已结束（或尚未开始）时才可被新请求复用；否则在途写入会覆盖新请求的 KV Cache，导致输出异常。

## Why It Matters（为什么重要）

- 高并发长上下文场景下，为控制尾延迟引入基于超时的请求终止（Abort）；Abort 一旦与 KV Cache 回收解耦，就会产生跨请求的显存覆盖竞态，且只在高负载下触发、极难复现。
- 这是"追求 Scaling Law 必须有同等强度系统工程支撑"的典型事故（GLM 团队官方复盘）。

## Core Characteristics（核心特征）

1. 竞态触发条件：Prefill 未在规定时间内完成 → Decode 侧超时 Abort 并回收 KV Cache → 槽位立即分配给新请求 → 原 Prefill 侧的 RDMA 写入与计算仍在继续 → 写入覆盖新请求的显存区域。
2. 根因是两层缺失：Abort 信号未正确传播至 Prefill 侧；Decode 侧缺乏判断 KV Cache 是否可安全回收与复用的充分信息。
3. 症状与请求内容无关、与系统压力相关——这是区分"模型问题"与"Infra 状态管理问题"的判据。

## Structure（结构）

典型 PD 分离时序（异常路径）：

1. Req1 发送至 Prefill-1（P1）与 Decode（D）；P1 侧排队等待后开始 Prefill Forward。
2. Decode 侧一段时间未收到 KV Cache 数据 → 触发超时 → 对 Req1 执行 Abort。
3. Decode 回收 Req1 槽位但未正确通知 P1；Req2 到达并被分配同一 KV Cache 地址（内存复用策略）。
4. P2 快速完成 Prefill Forward 与 KV Transfer，Decode 进入生成阶段。
5. P1 针对 Req1 的 KV Cache 写入仍在继续 → 覆盖 Req2 的部分 KV Cache → Req2 读取被覆盖数据 → 生成结果异常。

## How It Works（运作方式）

修复机制：在请求终止与 KV Cache 写入完成之间建立显式同步。

- Decode 触发 Abort 后向 Prefill 发送通知。
- Prefill 仅在"相关 RDMA 写入尚未开始，或所有已提交写入均已完成"时返回"可释放"信号。
- Decode 仅在收到确认后才允许回收并复用槽位。
- 效果：KV 写入不会跨越显存复用边界；异常发生率由约万分之十几下降至万分之三以下。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hicache-read-before-ready]]（同为 KV Cache 状态一致性竞态，另一个独立 Bug）
- [[layersplit-kv-cache-tiering]]（动机链：Abort 与 HiCache 修复后，瓶颈回到 Prefill 吞吐与显存压力）
- [[speculative-decoding-quality-monitoring]]（投机采样指标是本竞态的检测突破口）

### Dependencies（依赖项）

- PD 分离部署架构（Prefill/Decode 物理分离 + KV Cache 跨节点传输）

### Distinctions（区分）

- 与 [[hicache-read-before-ready]] 的不同之处在于：本竞态是跨节点的请求生命周期与显存回收时序问题（PD 分离场景），HiCache 竞态是单节点内加载流与计算流的流水线同步问题。

## Evolution（演进）

- 2026-10：GLM 团队线上 Coding Agent 场景定位并修复该竞态（GLM-5 系列模型，知乎专栏/官方 blog 复盘）。
- 2026-10：修复通过内部引擎上线；HiCache 侧修复已提交 SGLang 社区（PR #22811）。

## Open Questions（开放问题）

- 线下复现频率仍低于线上：检测是否漏检？是否存在未覆盖的触发场景？
- 显式同步引入的延迟开销未公开量化；Abort 超时阈值未公开。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md`

## Related Knowledge（相关知识）

- [[deepseek-v41-flash-inference-deployment]]（DeepInfer 的 PD 分离部署互证：PD 是大规模推理主流架构）
- [[speculative-decoding-quality-monitoring]]
- [[layersplit-kv-cache-tiering]]
