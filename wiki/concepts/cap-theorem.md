---
id: wiki-concept-cap-theorem
type: concept
title: CAP 定理与最终一致性取舍
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - distributed-systems
  - consistency
sources:
  - raw/sources/architecture/2026-10-31-architecture-science-and-art-42-rules.md
related:
  - wiki/concepts/architecture-tradeoff-methodology.md
  - wiki/concepts/raft-membership-change-barrier.md
  - wiki/concepts/local-message-table.md
  - wiki/sources/architecture-science-and-art-42-rules.md
---
# CAP 定理与最终一致性取舍

## Definition（定义）

CAP 定理：网络分区（Partition）发生时，系统只能在一致性（Consistency，所有节点返回同一份最新结果）与可用性（Availability，到达非故障节点的请求最终能得到响应）之间二选一。这里的「可用」不等于每个业务操作都必须成功，而是请求最终能得到响应。CAP 是**分区时的选择**，不是给整个系统贴的永久 AP/CP 标签；最终一致性（Eventual Consistency）允许副本短暂不同，但最后必须能收敛。

## Why It Matters（为什么重要）

CAP 是最容易「被背成口号」的分布式理论之一，拿它分析系统时**边界比口号重要得多**。同一系统内不同数据、不同操作可以做不同选择：账户余额更看重一致性，商品推荐可以先返回可用结果。选择最终一致性并不代表可以不管一致性——信息怎样传播、冲突怎么处理、失败以后如何补偿、多久重新对齐，都要写清楚；**业务能容忍多长的不一致窗口，才是做选择的依据**。

## Core Characteristics（核心特征）

1. **P 是前提**：分布式系统在网络分区下必须容忍 P，真正的取舍发生在 C 与 A 之间；分区出现后，坚持所有节点返回最新结果就可能要拒绝或等待一部分请求，让系统继续响应则可能读到尚未同步的旧数据。
2. **不是永久标签**：同一个系统里，账户余额看重一致性、商品推荐可先返回结果——数据不同、操作不同，选择可以不同。
3. **最终一致性的三个条件**：允许短暂不同（商品浏览量、搜索索引、部分推荐数据通常可接受几秒钟延迟）＋最后能收敛＋工程细节写清（传播方式、冲突处理、失败补偿、重新对齐周期）。
4. **高代价场景要更谨慎**：账户余额、库存扣减、订单状态一旦出错代价高得多，设计时要更谨慎——不是「用了最终一致性就放松」。
5. **与一致性哈希/Gossip 的分工**：一致性哈希解决节点变化时的数据迁移范围（但热点 Key、倾斜、跨分片查询仍要单独处理，分片算法没有通吃的）；Gossip 适合成员发现与状态传播，但扩散需要时间，不能拿来保证关键写入的强一致。

## Structure（结构）

取舍决策的输入是「业务对不一致窗口的容忍度」：

| 场景类型 | 典型数据 | 容忍度 | 选择倾向 |
|---|---|---|---|
| 交易核心 | 账户余额、库存扣减、订单状态 | 几乎为零 | 强一致（CP 倾向） |
| 可延迟读 | 商品浏览量、搜索索引、推荐数据 | 几秒级 | 最终一致（可用性优先） |

## How It Works（运作方式）

分区发生时的实际行为：坚持 C → 拒绝或等待部分请求（牺牲可用性）；坚持 A → 继续响应但可能读到旧数据（牺牲强一致）。工程上通过信息传播机制（复制、Gossip、对账）、冲突处理与补偿策略实现收敛；收敛周期必须 ≤ 业务可容忍的不一致窗口。

## Relationships（关系）

### Related Concepts（相关概念）

- [[architecture-tradeoff-methodology|架构取舍方法论]]：CAP 取舍是「先定约束再挑技术」方法论在分布式一致性场景的实例——选择依据是业务约束而非口号。
- [[raft-membership-change-barrier|Raft 成员变更的日志 Barrier]]：Raft 在分区下的多数派提交与成员变更 barrier 是强一致路线的工程实现细节。
- [[local-message-table|本地消息表]]：分布式事务中通过本地消息表+重试实现最终一致的实践，是「允许短暂不同、保证收敛」的落地形态之一。

### Dependencies（依赖项）

- 复制与传播机制（Gossip、跨地域复制、对账）是最终一致性收敛的基础设施；本文未展开具体协议。

### Distinctions（区分）

- 与**「系统是 AP 还是 CP」的贴标签式用法**不同：本文主张按数据与操作类型分场景选择，而非全系统一个标签。
- 与**强一致就是不用分布式**的误解不同：P 无法避免，取舍只在分区时显式发生。

## Evolution（演进）

- 2026-10-31：本页由单一信源（architecture-science-and-art-42-rules，法则 39-42）建立。confidence: medium——单一二次信源；CAP/最终一致性为成熟理论，本文表述与学界共识一致，但 wiki 内尚未有独立一手信源（如原始论文或 Raft/Paxos 专题）直接支撑。

## Open Questions（开放问题）

- 不一致窗口的量化评估方法（业务侧如何测定容忍度）：信源未给出。
- 冲突处理与补偿的具体协议选型（CRDT vs 对账 vs 版本向量）：信源未展开，可结合 [[crdt|CRDT]] 与 [[distributed-transaction-six-solutions|分布式事务方案]] 进一步编译。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-architecture-science-and-art-42-rules.md`（法则 41：CAP 定义与分区时选择、非永久标签；法则 42：最终一致性收敛条件与不一致窗口；法则 39-40：一致性哈希与 Gossip 的边界）

## Related Knowledge（相关知识）

- [[architecture-science-and-art-42-rules|架构是学问，也是艺术：42 条架构取舍法则（信源页）]]
- [[architecture-tradeoff-methodology|架构取舍方法论（概念页）]]
- [[raft-membership-change-barrier|Raft 成员变更的日志 Barrier（概念页）]]
- [[local-message-table|本地消息表（概念页）]]
- [[distributed-transaction-six-solutions|分布式事务最全图解（信源页）]]
