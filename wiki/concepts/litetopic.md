---
id: wiki-concept-litetopic
type: concept
title: RocketMQ LiteTopic（会话级轻量消息通道）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: high
tags:
  - concept
  - ai-agent
  - message-queue
sources:
  - raw/sources/architecture/2026-11-12-rocketmq-litetopic-session-level-mq.md
related:
  - wiki/entities/rocketmq.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/agent-state-separation.md
  - wiki/concepts/a2a-protocol.md
  - wiki/sources/rocketmq-litetopic-session-level-mq.md
---
# RocketMQ LiteTopic（会话级轻量消息通道）

## Definition（定义）

LiteTopic 是 Apache RocketMQ 面向 AI 场景引入的消息通道模型：**将每个 AI 会话映射为一个独立的轻量级 Topic**，而非让所有会话共享同一个业务 Topic。它挂载在 Parent Topic 之下构成两层结构；LiteTopic 是运行期的动态单位，首条消息到达时自动创建、空闲后按 TTL 自动回收，承载会话级的有序、隔离、可重放的消息投递。

## Why It Matters（为什么重要）

AI 应用使传统事件驱动消息模型的三个前提失效：通道拓扑由运行期决策动态派生、无法设计期枚举；任务时长从毫秒级上升到分钟级乃至数天、中间状态需频繁读写；GPU 单位算力成本高、空转直接反映在账单上。由此传统模型出现**积压斜率陡增、共享队列队头阻塞、中间结果丢失导致重复推理**三处不适配，其根源是**隔离粒度过粗**——传统 Topic 的创建与元数据成本决定了"一个会话一个 Topic"无法成立。LiteTopic 将隔离粒度下沉到会话级，使每个会话具备独立的顺序与故障边界，并把通道创建/销毁成本降到可按会话使用的程度。

## Core Characteristics（核心特征）

1. **两层 Topic 模型**：Parent Topic（少量、预创建，承载命名空间与权限/路由/配额管控）+ LiteTopic（运行期动态单位，有序/隔离/可重放，自动创建、TTL 自动回收）。
2. **订阅粒度从 Group 下沉到 Client**：一个 LiteTopic 任一时刻仅被一个 Client 独占消费，避免同会话消息被多实例并发处理导致的顺序错乱与状态竞争；同组实例可订阅不同 LiteTopic 子集，按会话维度摊负载。
3. **单份写入、多路索引**：消息体仍只顺序追加写入 CommitLog 一份（写放大受控），后台 dispatch 线程并行构建两套索引——按 Parent Topic 组织的标准 ConsumeQueue 与按 LiteTopic 组织的 LiteCQ。
4. **RocksDB 共享 KV 索引**：所有 LiteCQ 索引收敛到一个 KV 引擎，Key = Topic + QueueID + Offset，Value 为 CommitLog 物理偏移，单条查询 O(1)，元数据规模不随通道数膨胀，替代"每队列一个文件"在百万级通道下的非线性开销。
5. **Ready Set 事件驱动投递**：Lite Subscription Set 保存订阅关系，Ready Set 聚合当前确有消息可投的通道；消息写入触发事件匹配，调度成本从 O(订阅总数) 降为 O(活跃数)，思路同 epoll 相对 select。
6. **四项业务能力**：按需创建、自动过期（TTL）、差异化订阅、消费挂起（Suspend(N) 仅暂停当前通道、不阻塞消费线程）。

## Structure（结构）

```
Parent Topic（管控边界：权限/路由/配额，预创建、数量很少，通常一个业务域或一个 Worker 池一个）
 └─ LiteTopic × N（会话通道：自动创建、TTL 自动回收，按会话有序/隔离/可重放）
```

- 存储层：CommitLog（单份顺序写）→ ConsumeQueue（Parent Topic 粒度）+ LiteCQ（LiteTopic 粒度，RocksDB KV：Key=Topic+QueueID+Offset）。
- 投递层：消息写入 → 事件匹配订阅关系 → 聚合进 Ready Set → 消费者仅从 Ready Set 取任务。
- 存储内核（顺序写、零拷贝、主从复制、刷盘策略）保持不变，LiteTopic 只加一层索引与一套订阅/投递语义。

## How It Works（运作方式）

**接入**：生产端构造消息时设置 Parent Topic 并以 `setLiteTopic("session-" + sessionId)` 标明会话维度；消费端以 `subscribe(PARENT_TOPIC, "*")` 订阅父 Topic 下全部通道，需限速时返回 `ConsumeResult.suspend(Duration)`。原有编程模型、客户端依赖与运维体系无需更换，改造集中在会话维度标识与限速方式两处（文中代码为示意，实际 API 以所用版本为准）。

**案例一 · Qoder Cloud Agents（有序交接与故障恢复）**：脑手分离架构，Agent Runtime（决策）与 Sandbox Worker 池（执行）经两个 Parent Topic（request/response）双向异步通信，每会话在两个父 Topic 下各有一条以会话标识命名的 lane。流经消息系统的只有事件与引用，**任务进展的权威来源是 Checkpoint 而非消息 ACK**，故实例重启、会话迁移与事件重放不导致进度失真。四类复杂场景在同一套架构下统一表达：多 Agent 并行（Mailbox + Barrier 汇合）、打断处理（数据面/控制面分离，停止指令走独立控制通道）、Webhook 回调（按 endpoint 组织 lane，端内有序、端间并行）、挂起恢复（持久化待处理状态并释放 Worker，等待不占算力，任意空闲 Worker 经 LiteTopic 接手）。

**案例二 · 百炼网关（算力分配）**：限流从放行/拒绝的二元判断变为"以何种节奏送后端"——网关仅保留固定窗口硬上限兜底，请求按 user+model 维度经 setLiteTopic 写入，实际调速由 LiteTopic 漏桶阵列承担；消费侧统一消费组匀速消费，Suspend(N ms) 精确控制单个 user+model 组合的输出速率而不影响其他组合。效果：限流维度扩展到数千个、限流比降至约十分之一、毫秒级调速精度可跟随后端实时水位，服务百万级租户。

**可靠性语义（RocketMQ-A2A 论文）**：双平面架构——任务下发走普通 Topic（面向吞吐，突发转积压、Worker 按自身容量拉取），结果回传与审计走 Lite-Topic（面向会话，每会话一条有序、持久、可重放的结果流）。Worker 仅在终态事件成功写入 Lite-Topic 后才 ACK 任务；Supervisor 按 (sid, tid, seq) 去重并支持从指定 offset/seq 重放；提供至少一次投递 + 可重放语义，带副作用的操作仍需业务侧幂等键保护。

## Relationships（关系）

### Related Concepts（相关概念）

- [[durable-execution|持久执行]]：LiteTopic 是"会话状态、任务交接、故障恢复由基础设施承担"这一主张在消息中间件侧的落地；消息持久化 + 可重放避免重复推理，与"先写存储、后可见"的纪律同源。
- [[agent-state-separation|Agent 状态分离]]：会话状态不绑定具体实例（无损伸缩），消息只传事件与引用，进展权威为 Checkpoint，是状态与执行解绑在 MQ 层的体现。

### Dependencies（依赖项）

- [[rocketmq]]：LiteTopic 是 RocketMQ 存储内核之上的 AI 演进，已合入其 master 主干，复用 CommitLog/主从复制等生产验证能力。

### Distinctions（区分）

- **与传统 Topic 模型**：传统 Topic 预创建、管控粒度与业务粒度耦合，百万会话下"一个会话一个 Topic"不可行；LiteTopic 将管控边界（Parent Topic）与会话通道（LiteTopic）分离，通道生命周期与会话生命周期对齐。
- **RocketMQ-A2A 与 [[a2a-protocol|A2A 协议]]**：Apache RocketMQ-A2A 是 RocketMQ 面向多 Agent 协作的会话级可重放事件流机制（双平面架构 + 论文），与 Google 的 A2A Agent 间通信协议同名而不同物（解读）。

## Evolution（演进）

- 2026：LiteTopic 合并进 Apache RocketMQ master 分支，成为主干能力；RocketMQ-A2A 实现开放给社区（github.com/apache/rocketmq-a2a），正在探索 MCP 传输层实现（将传输能力延伸至 Agent 与工具之间的通信）。
- 2026：RocketMQ-A2A 论文被 FSE Companion 2026 接收（会议 2026 年 7 月，加拿大蒙特利尔）；相关工作获中国信通院 2025 年度 OSCAR 开源 + AI 尖峰案例奖与 InfoQ AI 开源明星项目奖。
- 压测演进：5 Broker / 250 万会话（12.5k–25k TPS，P95 47–61ms）→ 5 Broker / 600 万会话 / 25k TPS CPU 约 84% 接近配置边界 → 10 Broker / 600 万会话 / 50k TPS（P95 81ms、CPU 47%）→ 10 Broker / 1500 万会话 / 50k TPS（P95 71ms）；存量会话扩大 2.5 倍延迟基本持平，控制面开销主要由活跃会话数决定、与存量会话数弱相关。

## Open Questions（开放问题）

- MCP 传输层实现仅有"正在探索"的表述，无具体设计信息。
- 单信源（知乎技术分享整理），暂无独立第二信源互证；接入 API 细节需以 RocketMQ 主干为准。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-12-rocketmq-litetopic-session-level-mq.md`

## Related Knowledge（相关知识）

- [[rocketmq]]
- [[durable-execution]]
- [[agent-state-separation]]
- [[a2a-protocol]]
- [[rocketmq-litetopic-session-level-mq|AI Agent 基础设施的新范式（信源页）]]
