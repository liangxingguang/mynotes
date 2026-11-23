---
id: wiki-concept-write-fanout
type: concept
title: 写扩散（Fan-out on Write）
status: active
created: 2026-10-23
updated: 2026-11-24
confidence: medium
tags:
  - concept
  - architecture
  - im
  - messaging
sources:
  - raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md
  - raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md
  - raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md
  - raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md
  - raw/sources/architecture/2026-11-23-wechat-feed-timeline.md
related:
  - wiki/sources/im-group-chat-write-fanout-cost.md
  - wiki/concepts/read-fanout.md
  - wiki/concepts/mcast.md
  - wiki/concepts/notification-system-design.md
  - wiki/concepts/interaction-write-path.md
  - wiki/entities/rocketmq.md
  - wiki/entities/kafka.md
  - wiki/sources/like-follow-high-concurrency-design.md
  - wiki/sources/2026-11-23-wechat-feed-timeline.md
---
# 写扩散（Fan-out on Write）

## Definition（定义）

群消息投递的一种架构模式：消息到达服务端时，按群成员列表为每个接收者**各写一份消息副本**（每成员一条投递记录），读路径上成员只需读自己的消息流。与之相对的是读扩散（Fan-out on Read）：消息只存一份，成员读取时按订阅关系拉取。

在 Feed 流时间线语境下（朋友圈等），写扩散的实质是：**时间线在数据库里根本不存在，须在读时或写时"造"出来**；写扩散选择在写时造——发布时替每个好友把内容放进其收件箱，读时一次查询直接取，把"排序"从每次读现做挪到写一次结清。造的时机（读时 vs 写时）是 Feed 时间线设计的全部难点所在。

## Why It Matters（为什么重要）

toB IM 场景里已读回执、消息撤回、离线补全是硬需求，三者都依赖每成员维度的投递记录，因此中小规模 toB 项目几乎必然选写扩散。代价是写放大：千人群一条消息产生约 3000~5000 次后端操作（999 副本扇出 + 路由 + 未读 + 推送），群规模决定了这条路的物理上限。

## Core Characteristics（核心特征）

1. **扇出位置在群服务**：群成员/属性/配置都在群服务，责任边界清晰（候选：客户端展开、接入层展开）。
2. **副本指纹**：副本 uuid = `原uuid|G<short_id>`，下游历史库/离线/已读聚合据此区分原消息与副本。
3. **MQ 批量化对抗写放大**：50 人/批把千人群 MQ 写次数从 999 降到 ~20；批内部分失败用「拆分重投」。
4. **双轨存储**：历史库只存原消息（1 条），离线盒子存副本（N 条），避免分表爆炸又保住未读对账。
5. **部分失败是常态**：不 ACK 自动重投、3~5 次上限进死信（带 uuid+uid 精确定位）、发送方入库即 ACK 不感知扇出失败。
6. **Feed 推拉结合阈值（第 4 信源）**：社交 Feed 场景中按创作者粉丝规模分流——小 V（粉丝 <1w）写扩散推收件箱；大 V（≥10w）读扩散拉；活跃大 V 推拉结合（只推在线粉丝）。阈值必须做成配置动态调，否则一次给 1000w 粉丝写扩散 = 1000w 次写、MQ 瞬间堆积百万，写扩散风暴当场打垮 MQ。
7. **单次扩散份数上限 = 成本天花板（第 5 信源）**：写扩散成本不取决于用户总量，而取决于单节点最多复制多少份；微信好友上限 5000 把最坏情况锁进可计算范围，"单次扩散成本 × 最大复制份数"能被算清，系统才敢用写扩散。无上限的大 V（5000w 粉丝）一条动态 5000w 次投递、每次 1ms 串起来 14 小时，热点早过，是产品形态问题、技术选型绕不开。
8. **写入优化三手段（第 5 信源）**：**削峰**（发表只同步写发件箱即返回，扩散投 MQ 异步摊平峰值）、**合并**（同收件箱短窗口多次投递合并为一次批量，省重复往返）、**只推活人**（长期沉默账号暂停扩散，上线按离线时间点拉取期间好友动态补齐，临时退化为一次读扩散）。三手段叠起来把写侧从"峰值硬扛"变为"平稳写入 + 批量合并 + 削减无效投递"，单次复制几百份的成本被摊平而非绕开。

## Structure（结构）

发送 → 群服务扇出（展开成员、生成副本指纹）→ MQ 批量（~20 批）→ 分发服务路由投递（批内展开）→ 双轨存储（历史库 1 条 / 离线盒子 N 条）。

## How It Works（运作方式）

群服务收到群消息后加载成员列表、剔除发送者，为每个成员克隆副本并打上副本指纹，按 50 人/批发布到 MQ；下游分发服务消费批次时对批内每个目标做路由与投递；历史库消费者看 uuid 是否含 `|G` 决定丢弃或入库。失败副本不 ACK 由 broker 重投，超过重试上限进死信队列交 SRE 处理。

**Feed 流时间线形态（第 5 信源，朋友圈案例）**：给每人准备收件箱，发布动态时除写自己发件箱外，把动态 ID 复制若干份投进每个好友收件箱。收件箱用 Redis ZSet 承载，score 存发布时间戳、倒序取出即时间线；score 为 double，用「毫秒时间戳 ×1000 + 毫秒内序号」铺到微秒（当前时间戳约 1.76e15，远在 ±2^53 安全区内），同毫秒并列靠序号消乱序，生产走 pipeline 批量提交而非逐条 add。读侧从读扩散的 300 次查询 + 归并降为 1 次查询，分页只记一个位置。写侧 1 亿条动态/天 × 300 好友 = 300 亿次收件箱写入/天、约 35 万 QPS，对比读扩散全站约 3500 万读 QPS，**同业务写扩散比读扩散低约 100 倍**——这是写扩散在 Feed 流流行的经济账。三手段（削峰投 MQ 异步、合并短窗口批量、只推活人暂停沉默账号扩散并在上线时按离线时间点拉取补齐）进一步摊平写侧峰值。

## Relationships（关系）

### Related Concepts（相关概念）

- [[read-fanout|读扩散（Fan-out on Read）]]：对偶模式，消息存一份、读取时按会话队列位点拉取；万人群场景的替代解（钉钉选型），阿里混合模式的另一半。
- [[idempotency-design|幂等设计]]：副本重投/拆分重投依赖消费侧幂等。

### Dependencies（依赖项）

- 消息队列（[[rocketmq|RocketMQ]] / [[kafka|Kafka]] 一类 broker）：副本即 MQ 消息，broker 的连接数与单 partition 串行化是常见瓶颈。

### Distinctions（区分）

- 与 [[read-fanout|读扩散]] 的区别在于「写时复制 vs 读时聚合」：写扩散拿写放大换读路径简单与每成员投递记录；读扩散拿读取聚合成本与架构复杂度换存储与写入的极致节省。群规模是选型主变量：1000 人写扩散需批量化、5000 人需专项优化、10000 人写扩散走不通。写扩散另一短板是多群消息混排在用户同步队列、无会话级优先级与隔离能力（阿里信源）。
- 与 [[mcast|长连接组播]] 的区别在于「持久化副本 vs 内存组播」：百度推演照搬 IM 群聊到直播场景时，用户列表拆分/设备/动态路由/下发/拉取/已读六步全是百万 QPS 级——印证写扩散式链路在百万在线直播下物理不可行；mcast 把展开收件人下沉到长连接层内存，放弃必达与投递记录换容量可控。
- 站内通知场景的 1:1 特例见 [[notification-system-design|站内消息系统领域模型]]：私信发送即写接收者消息队列（写扩散），公告/提醒则走订阅拉取（读扩散）。

## Evolution（演进）

已知实践中的规模分档（单信源）：100 人舒服 → 1000 人批量化 → 5000 人专项优化 → 10000 人切读扩散。过渡期常用混合模式：千以下写扩散、千以上读扩散，在**群创建时静态标记**分流而非每次扇出动态判断。大厂分化：钉钉转读扩散+多级缓存；微信坚持写扩散；企业微信写扩散+硬件堆料。

阿里的瓶颈实测（2020 双 11 背景，一手信源）：主互动 500 人群、平均群大小 320+，DB 承接 120w/s 写入也只换来消息上行 3K/s，且 IM 写集群还要与营销/交易/物流通知共享——这是写扩散在大促强互动下触顶的直接量化证据，驱动其演进为读写扩散混合模式（500ms 端到端，详见 [[read-fanout|读扩散]]）。

Feed 场景的推拉分流（2026-10-31，第 4 信源）：点赞/关注系统的文章把写扩散延伸到社交 Feed——小 V（粉丝 <1w）推收件箱、大 V（≥10w）拉、活跃大 V 只推在线粉丝；其教训与 IM 场景同构：写放大是物理上限，粉丝规模（而非群人数）是主变量，阈值是动态配置而非写死的常数。

微信朋友圈时间线的写扩散选型（2026-11-24，第 5 信源）：以"时间线在数据库不存在、须读时或写时造"为框架，否定"按时间倒序查"的读扩散朴素方案（300 分片扇出、3500 万读 QPS 不可扛），选定写扩散（35 万写 QPS、差约 100 倍）；其成立前提是单次扩散份数有上限，微信好友上限 5000 即成本天花板，再以削峰、合并、只推活人摊平写入。与第 4 信源的 Feed 推拉阈值互证：5000 的上限把"大 V 无上限"场景隔离为产品形态问题，技术侧靠推拉结合兜底。

## Open Questions（开放问题）

- 读扩散侧的成本账已有阿里一手信源部分回答（架构复杂度、冷启动多读 QPS，见 [[read-fanout|读扩散]]）；已读 bitmap 聚合、缓存一致性的量化代价仍无信源支撑。
- 5000 人档的「专项优化策略」具体形态，信源只给了方向未给方案。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-im-group-chat-write-fanout-cost.md`（经验性分析，数字为估算量级 → confidence: medium）
- Source: `raw/sources/architecture/2026-10-23-alibaba-ecommerce-im-group-live.md`（一手实践，印证 1:N 写放大瓶颈与无优先级/隔离短板；给出 120w/s→3K/s 实测量级）
- Source: `raw/sources/architecture/2026-10-23-baidu-live-mcast-message-architecture.md`（一手实践：百万在线直播下照搬 IM 群聊链路的六压力点推演，间接印证写扩散物理上限；并给出 mcast 替代路径）
- Source: `raw/sources/architecture/2026-10-28-like-follow-high-concurrency-design.md`（Feed 推拉阈值：小 V <1w 推 / 大 V ≥10w 拉 / 活跃大 V 只推在线粉丝；1000w 粉丝写扩散风暴案例）
- Source: `raw/sources/architecture/2026-11-23-wechat-feed-timeline.md`（Feed 流时间线题解：时间线在 DB 不存在、读时或写时造；读扩散 3500 万读 QPS vs 写扩散 35 万写 QPS 差约 100 倍；好友上限 5000 为成本天花板；削峰/合并/只推活人三手段；Redis ZSet 微秒 score 实现。数字为量级假设，单信源 → confidence: medium）

## Related Knowledge（相关知识）

- [[im-group-chat-write-fanout-cost|IM千人群聊该不该用消息写扩散？详细算算成本账！]]
- [[alibaba-ecommerce-im-group-live|阿里电商IM消息平台在群聊、直播场景下的技术实践]]
- [[like-follow-high-concurrency-design|别再上来就堆 Redis！点赞系统从打挂数据库到 18w 写峰值（信源页）]]（Feed 推拉阈值）
- [[2026-11-23-wechat-feed-timeline|腾讯面试官：微信朋友圈 10 亿人发内容，怎么保证你能看到好友的最新动态？（信源页）]]（Feed 时间线写扩散选型）
