---
id: wiki-source-spring-boot-webhook-delivery-platform
type: source
title: Spring Boot 构建可靠 Webhook 投递平台：事件订阅、签名验签、重试补偿与死信治理
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - 工程实践
  - Java
  - 分布式系统
sources:
  - raw/sources/architecture/2026-11-01-spring-boot-webhook-delivery-platform.md
---

# Spring Boot 构建可靠 Webhook 投递平台：事件订阅、签名验签、重试补偿与死信治理

## Overview（概览）

微信公众号「farerboy（架构设计之道）」长文，复盘一套大规模 Webhook 投递平台的实战：2000+ 订阅方应用、30+ 事件类型、峰值 8000 TPS、平均扇出 6（最高 50）。围绕"任务怎么可靠落库和调度、失败怎么分级和退避、异常怎么隔离和兜底"三个问题，给出六表模型（配置/运行时分离、任务/执行记录分离）、Outbox+事务钩子、两级触发出队、指数退避+抖动、失败分级、租户级熔断与三层限速、SSRF 四层校验、密钥重叠轮换、死信治理与对账兜底的完整方案。上线后投递成功率从 95% 稳到 99.9%+。全文约 358 行（采集稿标注），代码块被微信排版压成单行，属已知噪声；核心内容完整。

## Key Facts（关键事实）

- **规模与难点**：2000+ 订阅应用、30+ 事件、峰值 8000 TPS、平均扇出 6（最高 50）。难点：网络不可靠、重复躲不掉（只能下推去重给订阅方）、订阅方质量参差、回调 URL 天然 SSRF 口子、重试风暴放大故障
- **六表模型**：Application / EventType（schema 必须版本化）/ Subscription / DeliveryTask（`(event_id, subscription_id)` 唯一）/ DeliveryAttempt（只追加）/ DeadLetter。payload 必须落库存快照，不能只存 eventId
- **主链路**：Outbox 表+事务钩子保证"业务写库与事件发布"原子（注意 `afterCommit` 里别用 `@TransactionalEventListener`，事务已提交它不执行且不报错）；发布线程只落库不做 HTTP；出队用"延迟队列+DB 扫描"两级触发，Worker 用 CAS（status+version）抢占
- **签名**：签名串 = timestamp\nnonce\nbody 三件套缺一不可；请求头带 eventId/timestamp/nonce/key-id/signature；验签失败返回 401 绝不能 200；时间偏差超 5 分钟拒；nonce 5 分钟窗口去重
- **退避**：指数+抖动+封顶（10s→85min，10 次累计约 2-3.5 小时）；429 优先听 `Retry-After`；max_retry 默认 10，对账类可调 24。踩坑：指数截断位写错导致封顶成死代码
- **失败分级**：2xx 成功；408/429/5xx/连接异常可重试；400/404/405/422 永久失败进死信；3xx 不跟随直接判永久失败；401/403 先重试 2 次再死信（密钥轮换/权限误配常是瞬时故障）
- **死信治理**：不是垃圾桶而是"等人工拍板"队列——按 reason 归因（78% 死信是地址配错，反过来推动产品加"保存前必验"）、控制台批量重放（最多 3 次）、T+7 归档留 180 天
- **熔断限速**：熔断按 subscriptionId 隔离（连续 20 次可重试失败 OPEN，HALF_OPEN 探 3 个探针，冷却翻倍上限 10 分钟）；熔断期间不消耗重试次数，但设 defer 闸（24h/200 次）防无限延期转死信；三层令牌桶限速（应用级/订阅级/全局），执行顺序：熔断→应用限流→订阅限流→HTTP
- **安全**：SSRF 四层校验（协议格式、DNS 解析后校验全部地址为公网、连接时固定 IP 防 DNS Rebinding、禁跟随重定向）；密钥 AES-GCM 密文存、KMS 托管、轮换新旧密钥重叠 7 天（双签名头，任一通过即算）
- **可观测**：delivery/latency/backlog/retry/deadletter/breaker 指标（app 基数大只打 TOP 200 标签）；traceId 贯穿全链路，eventId 可反查；每日对账兜底（不能简单重跑 fanout，要走单独补投入口）
- **性能数据**：单机 8C16G 落库+fanout 8000 TPS；HTTP 投递 1800 QPS、P99 220ms，开虚拟线程后 3500（必须配信号量限并发）；首投成功率 99.97%，死信率 0.11%
- **结论**：DB 是唯一真相（MQ 只是加速器）；承认重复躲不掉（eventId 是锚点，幂等外置）；退避必须有抖动、熔断必须按租户；4xx 别盲重试、5xx 别急着放弃

## Important Claims（重要论断）

### Claim 1：DB 是唯一真相，MQ 只是加速器

"最根本的一条是把 DB 当唯一真相。MQ、延迟队列都是加速器，任何一环丢了，靠扫任务表都能自己爬起来。把 MQ 当存储用，迟早要还。"——这是整套系统最根本的论断，决定了所有架构决策：任务表是唯一的持久化真相，MQ/延迟队列只是触发手段，丢了能重建。

### Claim 2：承认重复躲不掉，幂等只能外置

"只要加了重试，'至少一次'就成立，而投递方永远分不清'对方处理完了但响应超时'和'对方根本没收到'。这题没有解法，只能把去重责任下推——把 eventId 交给订阅方，让他们自己扛。"——"收到重复事件直接返回 200，不要回 409。回 409 平台会当成失败继续重试，两边就无限循环了。"

### Claim 3：退避必须有抖动，熔断必须按租户隔离

"没做防护的对照组挺惨。恢复瞬间 180 万条积压任务同时到期，投递 QPS 冲到 2 万，对方 3 秒内二次挂掉，就这么'恢复—打挂'来回循环。开了防护之后：抖动把重试散到 20 分钟的窗口里，峰值重试 QPS 从 2 万降到 1800；订阅级熔断在连续 20 次失败后 OPEN，故障期间对这个订阅方几乎是零流量。"——"退避没抖动等于没有退避，熔断不分租户等于没有熔断。"

### Claim 4：4xx 别盲重试，5xx 别急着放弃

"4xx 无脑重试是最浪费资源的做法，也是最常见的。400/404/405/422 属于永久失败，直接进死信。5xx 可重试，走指数退避。401/403 单独拿出来处理：先按可重试算，最多重试两次。为什么不一刀切？因为线上见过太多次，是对方轮换了密钥或者权限没配好，纠正之后立刻就好了，永久失败纯属误伤。"

### Claim 5：payload 必须落库存快照

"还有 payload 一定要落库，不能只存 event_id。业务方是会改数据的，投递内容必须是发布那一刻的快照，否则重试推出来的东西跟第一次不一样，订阅方那边幂等做得再好也救不回来。"

### Claim 6：死信不是垃圾桶，是"等人工拍板"的队列

"死信不是垃圾桶，是'等着人来拍板'的队列。三件事：归因（reason 区分 EXHAUSTED/PERMANENT_4XX/URL_INVALID/BREAKER_TIMEOUT，运营按应用聚合看 TOP 失败原因，78% 的死信属于地址配错，这个数字直接推着产品在控制台加了'保存前必验'）、重放（控制台按应用或事件类型批量重放，重置 attempt_count，replay_count 加一，超过 3 次就不让再放了，防无限循环）、归档（T+7 转冷存储，保留 180 天应付审计）。"

### Claim 7：Outbox+事务钩子保证业务写库与事件发布原子

"业务写库和事件发布必须原子，不然就是经典的'钱扣了、消息没了'。本地消息表配事务钩子。这里有个坑得提一句：afterCommit 里发的事件，监听器别图省事写成 @TransactionalEventListener。这时候事务已经提交完了，在监听器眼里是不存在活动事务的，默认 fallbackExecution=false 意味着它根本不会执行，而且不报错，特别难查。"

### Claim 8：SSRF 四层校验，一层都不能省

"回调地址是用户输入，四层校验，一层都不能省。协议和格式（只放 https，禁止带 userinfo，生产环境禁止 IP 字面量直连）；DNS 解析之后校验（解析出来的所有地址必须全部落在公网，命中 10/8、172.16/12、192.168/16、127/8、169.254/16 等任何一个直接拒）；连接时固定 IP（校验完把 InetAddress 直接交给 HTTP 客户端，别让它自己再解析一遍，否则就是 DNS Rebinding）；禁止跟随重定向（followRedirects(false)，3xx 判永久失败，防止 302 到内网）。"

### Claim 9：密钥轮换必须支持新旧重叠

"轮换必须支持新旧密钥重叠，否则切的那一秒所有投递全挂。流程：平台生成新密钥 key_id=k_2024_11，旧密钥标 DEPRECATED 但保留。重叠期内请求头同时带两套——X-Webhook-Key-Id+X-Webhook-Signature 是一套（新），X-Webhook-Previous-Key-Id+X-Webhook-Previous-Signature 是另一套（旧），订阅方手上有什么就拿什么验，任意一套通过就算过。重叠 7 天，期间平台每天推一条 KEY_ROTATION 事件提醒。7 天后旧密钥下线。"

### Claim 10：虚拟线程必须配信号量限并发

"开虚拟线程之后（JDK 21 + Boot 3.2，把 ThreadPoolTaskExecutor 换成虚拟线程执行器）同一台机器能到 3500，提升接近一倍，核心线程数那堆参数也不用再调了。但这里有个必须配套做的事：用信号量把并发卡死。虚拟线程是便宜了，MySQL 连接池和出口端口不会跟着便宜，先炸的一定是它们。"

### Claim 11：对账兜底不能简单重跑 fanout

"每天凌晨按 (event_type, 业务主键) 比业务库和投递台账，找出'业务侧有、台账里没有'的事件。这一步有个容易写错的地方：不能简单重跑一遍 fanout。INSERT IGNORE 会把已存在的任务直接忽略掉，对账等于白跑。我们走的是单独的补投入口——已成功的跳过，失败或死信的重新激活，台账里压根没有的才按新任务插进去。"

### Claim 12：指标里 backlog 比成功率更早反映问题

"webhook.task.backlog 表示状态 0 且已到期的任务数，过万就告警。这个指标比成功率更早反映问题，成功率还没掉的时候积压已经开始涨了。"

## Concepts Introduced（引入的概念）

- [[retry-governance|重试治理]]（本信源为其第 5 信源，印证退避+抖动/失败分级/熔断按租户/幂等外置等）
- [[dead-letter-governance|死信治理]]（本信源为其核心信源，死信不是垃圾桶而是等人工拍板的队列）
- Outbox 模式（本地消息表+事务钩子保证业务写库与事件发布原子）
- 六表模型（Application/EventType/Subscription/DeliveryTask/DeliveryAttempt/DeadLetter，配置与运行时分离、任务与执行记录分离）
- 两级触发出队（延迟队列负责"准点"，DB 扫描负责兜底，30 秒一轮捞过期任务）
- 指数退避+抖动+封顶（10s→85min，429 优先听 Retry-After）
- 失败分级（2xx/4xx/5xx/连接异常/3xx/401-403 差异化处理）
- 租户级熔断（按 subscriptionId 隔离，连续 20 次失败 OPEN，HALF_OPEN 探 3 个探针）
- 三层令牌桶限速（应用级/订阅级/全局，执行顺序：熔断→应用限流→订阅限流→HTTP）
- SSRF 四层校验（协议格式/DNS 解析后校验/连接时固定 IP/禁跟随重定向）
- 密钥重叠轮换（新旧密钥重叠 7 天，双签名头任一通过即算）
- At-Least-Once + eventId 幂等外置（承认重复躲不掉，幂等责任下推给订阅方）

## Entities Mentioned（提及的实体）

- farerboy（架构设计之道，微信公众号作者）
- Spring Boot（Java 框架）
- RocketMQ / 延迟队列（消息队列）
- MySQL（数据库，唯一真相源）
- OkHttp（HTTP 客户端）
- Caffeine（本地缓存）
- JDK 21 / 虚拟线程
- AES-GCM / KMS（密钥管理）
- Prometheus（监控指标）
- Bucket4j（限流库）

## Implications（影响／启示）

- 本信源是 [[retry-governance|重试治理]] 的第 5 信源，从大规模实战侧印证了退避+抖动/失败分级/熔断按租户/幂等外置等框架，同时新增 Outbox 模式、两级触发出队、六表模型、SSRF 四层校验、密钥重叠轮换、对账兜底等本页未覆盖的工程细节
- 本信源是 [[dead-letter-governance|死信治理]] 的核心信源，首次系统阐述死信作为"等人工拍板队列"的定位——归因/重放/归档三件事，78% 死信是地址配错的数据直接推动产品改进
- "DB 是唯一真相"论断对事件驱动系统有普遍适用性：任何用 MQ 做事件传递的系统都应把 MQ 当加速器而非存储，任务表才是可重建的真相
- "幂等只能外置"论断直指分布式系统本质：重试必然产生重复，投递方无法区分"处理完但超时"和"没收到"，唯一解法是把幂等责任下推给消费方
- SSRF 四层校验是回调/Webhook 类系统的标配安全清单——协议格式/DNS 校验/连接固定 IP/禁重定向，一层都不能省
- 虚拟线程的"必须配信号量限并发"提醒：廉价线程不等于廉价资源，MySQL 连接池和出口端口是真实瓶颈
- 对账兜底的"不能简单重跑 fanout"教训：INSERT IGNORE 语义会让对账白跑，必须走单独的补投入口
- 指标设计上"backlog 比成功率更早反映问题"是可观测性的经典洞察：积压是领先指标，成功率是滞后指标

## Limitations（局限）

- 代码块被微信排版压成单行（属采集噪声，非原文问题），SQL/Java 代码的格式失真但语义可辨
- 全文约 358 行（采集稿标注），核心内容完整；文末含公众号推广内容（精选系列链接等），已保留但非正文
- 性能数据为单机 8C16G 口径，真实生产基线需按自身负载压测
- 六表模型为作者平台实例，字段设计（如 payload_hash、filter_expr）为特定业务需求，非通用标准
- SSRF 校验的 Cidr 列表为作者环境配置，不同云环境（如 GCP metadata 169.254.169.254）需补充
- 密钥轮换的 7 天重叠期为作者经验值，不同订阅方响应速度下需调整

## Related Knowledge（相关知识）

- [[retry-governance|重试治理（概念页）]]
- [[dead-letter-governance|死信治理（概念页）]]
- [[durable-execution|持久执行]]
- [[idempotency-design|幂等设计]]
- [[remote-call-governance|服务远程调用治理]]
- [[async-task-system-design|异步任务系统怎么设计]]
- [[agent-platform-retry-resilience|从重试风暴到可控恢复]]
- [[openfeign-thread-pool-isolation|OpenFeign 服务远程调用 + 线程池隔离架构实战]]

## Source（信源）

- `raw/sources/architecture/2026-11-01-spring-boot-webhook-delivery-platform.md`
- 原文：https://mp.weixin.qq.com/s/1d-S86DBwWJR3o2-8aq5fw
- 采集稿：`Assets/2026-11/weixin-1d-S86DBwWJR3o2-8aq5fw.md`
