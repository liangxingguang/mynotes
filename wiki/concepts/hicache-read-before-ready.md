---
id: wiki-concept-hicache-read-before-ready
type: concept
title: HiCache 多级 KV Cache 加载流水线的 read-before-ready 竞态
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - concept
  - inference
  - kv-cache
  - hicache
sources:
  - raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md
related:
  - wiki/concepts/pd-separation-kv-cache-consistency.md
  - wiki/concepts/layersplit-kv-cache-tiering.md
---
# HiCache 多级 KV Cache 加载流水线的 read-before-ready 竞态

## Definition（定义）

HiCache（多级 KV Cache，CPU 内存异步 swap-in 历史前缀缓存）的读取流水线中，Forward Stream 的 Indexer 计算启动时未对 Load Stream 的 Indexer Cache 加载完成建立同步约束，导致数据未就绪即被读取（read-before-ready），Index 计算基于不完整或未初始化数据执行，影响 Sparse Attention 并最终反映为输出异常。

## Why It Matters（为什么重要）

- Coding Agent 场景输入长度平均超过 70K tokens 且前缀复用率高，HiCache 是这类负载的关键优化；换入与计算重叠执行提高吞吐的同时，把"数据就绪"隐式依赖变成了竞态窗口。
- 该竞态与 PD 分离 KV Cache 竞态相互独立，是同一批线上异常的第二个根因；修复已开源（SGLang PR #22811）。

## Core Characteristics（核心特征）

1. 双流结构：Load Stream 负责加载 KV Cache 与 Indexer Cache；Forward Stream 依次执行 Index 计算与 Sparse Attention。
2. 隐式依赖：理论上 Indexer 计算应在对应 Indexer Cache 加载完成后启动，但原始实现该依赖未被显式表达（算子启动未建立同步约束）。
3. 失败模式：Forward Stream 先于 Load Stream 完成数据加载而开始执行 → read-before-ready → Index 基于不完整/未初始化数据 → Sparse Attention 结果错误 → 输出异常。

## Structure（结构）

流水线时序（异常路径）：

- Load Stream：CPU 内存异步换入历史前缀缓存 → 加载 KV Cache → 加载 Indexer Cache。
- Forward Stream：Indexer 算子启动（无同步点）→ Index 计算 → Sparse Attention。
- 红色虚线区域即同步约束缺失处：Indexer 算子启动时 Indexer Cache 可能尚未加载完成。

## How It Works（运作方式）

修复方案：重构算子流水线的原子性，在数据加载与计算之间引入显式同步约束。

- Indexer 算子启动前引入与 Load Stream 的同步点，确保对应层级的 Indexer Cache 已完成加载。
- Forward Stream 仅在数据就绪后才启动计算，避免 read-before-ready 访问。
- 效果：相同负载下该类异常完全消失，系统行为趋于稳定；修复通过 Pull Request #22811 提交至 SGLang 社区。

## Relationships（关系）

### Related Concepts（相关概念）

- [[pd-separation-kv-cache-consistency]]（同批异常中相互独立的另一个竞态）
- [[layersplit-kv-cache-tiering]]（动机链：HiCache 引入正是为了缓解 Prefill 侧 KV Cache 容量压力）

### Distinctions（区分）

- 与 [[pd-separation-kv-cache-consistency]] 的不同之处在于：本竞态发生在单节点内两个 stream 之间（加载流与计算流的流水线同步），PD 分离竞态发生在跨节点的请求生命周期与显存回收之间。

## Evolution（演进）

- 2026-10：GLM 团队定位并修复；修复已提交 SGLang 社区（PR #22811）。

## Open Questions（开放问题）

- 同步点引入对 Prefill 吞吐的具体影响未公开量化；其他多级缓存路径（如非 Indexer 层）是否存在同类隐式依赖未说明。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md`

## Related Knowledge（相关知识）

- [[pd-separation-kv-cache-consistency]]
- [[layersplit-kv-cache-tiering]]
