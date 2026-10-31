---
id: wiki-concept-layersplit-kv-cache-tiering
type: concept
title: LayerSplit：KV Cache 分层存储优化
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - concept
  - inference
  - kv-cache
  - prefill
sources:
  - raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md
related:
  - wiki/concepts/pd-separation-kv-cache-consistency.md
  - wiki/concepts/hicache-read-before-ready.md
---
# LayerSplit：KV Cache 分层存储优化

## Definition（定义）

KV Cache 分层存储方案：每张 GPU 不再保存全部层的 KV Cache，仅持有部分层；计算时持有某一层 KV Cache 的 rank 在执行 Attention 前将该层 Cache 广播给其他相关 rank，并设计 KV Cache 广播与 indexer 计算的重叠机制使二者在时间上相互掩盖。针对长上下文 Coding Agent Serving 场景中 Prefill 阶段主导性能、KV Cache 容量限制 GPU 计算资源利用率的瓶颈。

## Why It Matters（为什么重要）

- 动机链：为控制 Prefill 排队带来的 TTFT 引入超时 Abort；为缓解 Prefill 侧 KV Cache 容量压力引入 HiCache；两个状态一致性竞态修复后，瓶颈回到"提升 Prefill 吞吐、降低 Prefill 侧 KV Cache 显存压力"本身。
- Coding Agent 负载上下文长、Prefix Cache 命中率高，Context Parallel（CP）成为线上 Prefill 节点主要并行策略；SGLang 开源实现的 KV Cache 冗余存储使有限容量成为 GPU 利用率的限制因素。

## Core Characteristics（核心特征）

1. 分层布局：每卡仅持有部分层的 KV Cache，显著降低单卡显存占用。
2. 协同计算：不同 CP rank 协同完成 Prefill，持有某层 Cache 的 rank 在 Attention 前广播该层 Cache。
3. 开销掩盖：KV Cache 广播与 indexer 计算重叠执行、相互掩盖；整个流程仅引入 Indexer Cache 广播的额外开销，规模约为 KV Cache 的 1/8，通信成本较低。

## Structure（结构）

方案要素：

- 布局：分层 KV Cache（图 4(a) 每卡部分层）。
- 通信：CP rank 间按层广播（图 4(b)）。
- 重叠：KV Cache 广播 ∥ indexer 计算。
- 验证：GLM-5.1 + LayerSplit 在不同请求长度下的吞吐曲线（图 5）。

## How It Works（运作方式）

效果（Cache 命中率 90% 条件下）：请求长度 40k-120k 区间吞吐量提升幅度在 10% 至 132% 之间，且随上下文长度增加收益更显著。

## Relationships（关系）

### Related Concepts（相关概念）

- [[pd-separation-kv-cache-consistency]]（Abort 机制是动机链第一环）
- [[hicache-read-before-ready]]（HiCache 是动机链第二环；LayerSplit 与之同为 Prefill 侧显存压力的应对）

### Distinctions（区分）

- 与 HiCache 的不同之处在于：HiCache 解决"历史前缀缓存放哪"（CPU 内存 swap-in 多级缓存），LayerSplit 解决"同一份活跃 KV Cache 如何在多卡间去冗余"（每卡只存部分层 + 按需广播）。

## Evolution（演进）

- 2026-10：GLM 团队在竞态修复后推出，与 GLM-5.1 联调验证吞吐提升。

## Open Questions（开放问题）

- 1/8 的 Indexer Cache 广播开销在更大规模（更多 CP rank）下的伸缩性未公开；对 Sparse Attention 类模型的收益是否普适未验证。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md`

## Related Knowledge（相关知识）

- [[pd-separation-kv-cache-consistency]]
- [[hicache-read-before-ready]]
