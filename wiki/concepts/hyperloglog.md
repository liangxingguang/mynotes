---
id: wiki-concept-hyperloglog
type: concept
title: HyperLogLog（基数估算）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - algorithm
  - statistics
sources:
  - raw/sources/architecture/2026-10-23-wechat-live-chatroom-15m-online.md
related:
  - wiki/topics/live-streaming-messaging.md
---
# HyperLogLog（基数估算）

## Definition（定义）

HyperLogLog 是一种概率数据结构，用概率算法统计集合的**近似基数**（去重元素个数，UV 场景即独立访客数）。算法本源是伯努利过程：反复抛硬币直到出现正面，做 n 次实验、记录每次所需抛掷次数 Ki，则可用 n ≈ 2^Kmax 估算总量；HyperLogLog 在此基础上用**分桶 + 调和平均**压低误差。因 Redis 内置而广为人知。

## Why It Matters（为什么重要）

精确基数统计需要存下全部元素（或至少一份去重集合），亿级 UV 下内存/磁盘不可接受。HyperLogLog 以**固定、极小**的空间（微信实践口径：最大 12KB）估算 64 位整形级别的基数，使"每个直播间一个历史在线计数"这类海量键 UV 统计变得可行。代价是它只给近似值，且小基数时误差更明显。

## Core Characteristics（核心特征）

1. **哈希均匀化**：元素 hash 成 64 位整形，分布均匀是估算成立的前提。
2. **分桶寻址**：用低位（微信文中为低 14 位）确定桶号，桶数 m 为万级（10000+）。
3. **前导 1 位置作观测值**：在剩余高位中找第一个 1 出现的位置，作为该元素对应伯努利过程的 Ki；桶值取 max 更新（Rj = max(Rj, Ki)）。
4. **调和平均聚合**：估算时对各桶值算调和平均 DV 替代裸 Kmax，准确率显著高于单桶估算。
5. **位压缩**：m 个桶的数值再经位压缩，整体最大空间约 12KB。

## Structure（结构）

m 个桶的数值数组（每桶存该桶观测到的最大 Ki），加位压缩编码；写入是 O(1) 更新单桶，读取是 m 个桶的调和平均。

## How It Works（运作方式）

微信直播聊天室的历史在线统计（视频号"xxx人看过"）采用 **tablekv + HyperLogLog 双管齐下**：

- 历史在线 ≤1w：双写 tablekv + HLL，以 tablekv select count 为准（完全准确）；
- 历史在线 >1w：只写 HLL，以其估算值为准（准确率 >95%）；
- 在线统计模块定期把当前在线列表 merge 进 HLL，防止 HLL 漏掉未触发更新的用户。

## Relationships（关系）

### Distinctions（区分）

- 与 BloomFilter 的区别：BloomFilter 判"在不在"（membership），HyperLogLog 估"有多少"（cardinality）。用 BloomFilter + 计数器做 UV 统计要处理二者一致性问题，且较好准确率需要较大空间——微信正是因此弃 bf 方案选 HLL。
- 与精确计数（tablekv 存全量成员）的区别：精确计数存储随基数线性增长且离线数据冗余；HLL 空间恒定但只能近似——故实践中按基数阈值混用。

## Evolution（演进）

- Redis 将 HyperLogLog 内置为原生数据结构（PFADD/PFCOUNT），使其成为业界 UV 统计常用方案（微信文中作为调研结论提及）。
- 微信直播聊天室 2.0（2026-10 收录）：tablekv+HLL 阈值混用落地历史在线统计。

## Open Questions（开放问题）

- 小基数段的误差修正细节（业界常用 LinearCounting 补偿），信源未展开。
- "定期 merge 在线列表"的周期与失败补偿，信源未给数字。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-wechat-live-chatroom-15m-online.md`（一手实践：算法步骤、12KB 空间、1w 阈值双写策略、>95% 准确率）

## Related Knowledge（相关知识）

- [[live-streaming-messaging|直播实时消息分发]]（主题）
- [[wechat-live-chatroom-15m-online|微信直播聊天室单房间1500万在线的消息架构演进之路]]（信源页）
