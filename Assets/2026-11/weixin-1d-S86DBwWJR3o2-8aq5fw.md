![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

## 一、这活到底难在哪

开放平台做的事说穿了就一件：把平台上发生的事推给第三方。商家在你这儿下了单、付了钱、审批过了，你得让对面的 ERP、WMS、财务系统在几秒内知道，不能让人家每分钟来轮询你一次。Webhook 就是干这个的——延迟从分钟级压到秒级，控制权也交给了事件源，代价是所有可靠性问题都落到推送方头上。

我们这套系统现在的体量：2000 多个订阅方应用，订单、支付、退款、审批、库存加起来三十多种事件，峰值 8000 TPS，一个事件平均命中 6 个订阅关系，最多的能打到 50 个。

然后就一直在跟下面这几件事较劲。

网络这条链路没什么可信的。回调地址在公网，超时、连接重置、TLS 握手失败、DNS 抖动是日常。第三方发版时 502/503 挂半小时很常见，滚动重启那几分钟基本是全量失败。

重复也躲不掉。只要加了重试，"至少一次"就成立，而投递方永远分不清"对方处理完了但响应超时"和"对方根本没收到"。这题没有解法，只能把去重责任下推——把 eventId 交给订阅方，让他们自己扛。

订阅方的质量更是参差不齐。有回 200 但异步落库失败了的（这种我们真管不着，只能靠对账补）；有收到事件就同步调下游、一卡三十秒的。不做隔离的话，一个慢订阅方就能把整个投递线程池拖死。

安全这块，回调地址是用户随手填的任意 URL，天然就是 SSRF 的口子；签名密钥一旦泄露，攻击者能伪造任意事件。密钥还得能轮换，轮换过程中还不能让订阅方那边断掉。

最后一个，重试风暴。第三方一挂，几百万条任务在同一秒到期，恢复瞬间全打过去，对方直接二次挂掉，连带我们自己的线程池、数据库、带宽全打满。补偿机制把故障放大，这个坑踩一次就够记一辈子。

下面这套方案，重点就回答三个问题：任务怎么可靠落库和调度、失败怎么分级和退避、异常怎么隔离和兜底。

## 二、表怎么切

拆表的原则就两条：配置和运行时分开，任务和执行记录分开。六个核心对象。

Application 是第三方接入主体，持有 appId/appSecret，同时也是应用级限流和配额的维度。

EventType 是事件契约，管 schema 和版本。必须版本化——哪天字段一改，没做版本隔离的话老订阅方会全部炸掉。

Subscription 是应用 × 事件类型映射到回调地址、密钥和过滤条件。所谓"一个事件命中多条订阅"，命中的就是它。

DeliveryTask 是一次"事件 → 订阅"的待办，也是重试的最小单元，`(event_id, subscription_id)` 唯一。

DeliveryAttempt 记每次 HTTP 尝试的快照，只追加、不修改，排障和统计都指着它。

DeadLetter 是重试耗尽或者永久失败后的终态，支持人工重放。

```
CREATE TABLE webhook_subscription (id            BIGINT PRIMARY KEY AUTO_INCREMENT,  app_id        VARCHAR(64)  NOTNULL,  event_type    VARCHAR(128) NOTNULL,  callback_url  VARCHAR(512) NOTNULL,  key_id        VARCHAR(64)  NOTNULL,          -- 密钥版本，支持轮换  secret_cipher VARCHAR(512) NOTNULL,          -- AES-GCM 加密存储  sign_algo     VARCHAR(16)  NOTNULLDEFAULT'HMAC_SHA256',  filter_expr   VARCHAR(512) NULL,              -- 如 amount > 100 && region == 'CN'  max_retry     INT          NOTNULLDEFAULT10,  qps_limit     INT          NOTNULLDEFAULT50,status        TINYINT      NOTNULLDEFAULT1,  created_at    DATETIME     NOTNULL,  updated_at    DATETIME     NOTNULL,UNIQUEKEY uk_app_event (app_id, event_type)) ENGINE=InnoDB;CREATETABLE webhook_delivery_task (id             BIGINT PRIMARY KEY AUTO_INCREMENT,  event_id       VARCHAR(64)  NOTNULL,  subscription_id BIGINT      NOTNULL,  app_id         VARCHAR(64)  NOTNULL,  event_type     VARCHAR(128) NOTNULL,  payload        MEDIUMTEXT   NOTNULL,  payload_hash   CHAR(64)     NOTNULL,          -- 校验与去重比对status         TINYINT      NOTNULL,          -- 0待投递 1投递中 2成功 3死信 4取消  attempt_count  INT          NOTNULLDEFAULT0,  next_retry_at  DATETIME     NOTNULL,  last_error     VARCHAR(512) NULL,version        INT          NOTNULLDEFAULT0,  created_at     DATETIME     NOTNULL,  updated_at     DATETIME     NOTNULL,UNIQUEKEY uk_event_sub (event_id, subscription_id),KEY idx_due (status, next_retry_at)) ENGINE=InnoDB;CREATETABLE webhook_delivery_attempt (id            BIGINT PRIMARY KEY AUTO_INCREMENT,  task_id       BIGINT      NOTNULL,  attempt_no    INT         NOTNULL,  http_status   INT         NULL,  cost_ms       INT         NULL,result        VARCHAR(16) NOTNULL,            -- SUCCESS / RETRYABLE / PERMANENT  error_code    VARCHAR(64) NULL,  trace_id      VARCHAR(64) NULL,  created_at    DATETIME    NOTNULL,KEY idx_task (task_id)) ENGINE=InnoDB;CREATETABLE webhook_dead_letter (id            BIGINT PRIMARY KEY AUTO_INCREMENT,  task_id       BIGINT      NOTNULL,  app_id        VARCHAR(64) NOTNULL,  reason        VARCHAR(64) NOTNULL,            -- EXHAUSTED / PERMANENT_4XX / URL_INVALID / BREAKER_TIMEOUT  payload       MEDIUMTEXT  NOTNULL,  replay_count  INT         NOTNULLDEFAULT0,  replay_status TINYINT     NOTNULLDEFAULT0,  -- 0待处理 1已重放 2已忽略  created_at    DATETIME    NOTNULL,UNIQUEKEY uk_task (task_id)) ENGINE=InnoDB;
```

三条设计上的取舍值得单独说。

`uk_event_sub` 这个唯一索引是"至少一次但不放大"的第一道闸门。事件重放、消费重复的时候，一条 `INSERT IGNORE` 直接吃掉，同一事件对同一订阅永远只有一条任务。

`idx_due(status, next_retry_at)` 支撑"捞一批到期的"这个查询，跟延迟队列配合做二级触发。

还有 payload 一定要落库，不能只存 event\_id。业务方是会改数据的，投递内容必须是发布那一刻的快照，否则重试推出来的东西跟第一次不一样，订阅方那边幂等做得再好也救不回来。

## 三、主链路

### 3.1 发布：Outbox 加事务钩子

业务写库和事件发布必须原子，不然就是经典的"钱扣了、消息没了"。本地消息表配事务钩子：

```
@Service@RequiredArgsConstructorpublicclass OrderEventPublisher {    privatefinal OutboxMapper outboxMapper;    privatefinal ApplicationEventPublisher publisher;    /** 与业务写库处于同一事务 */    @Transactional(rollbackFor = Exception.class)    public void publish(OrderEvent event) {        String eventId = IdGen.eventId();        outboxMapper.insert(OutboxRecord.of(eventId, "ORDER_PAID", JsonUtil.toJson(event)));        // 事务提交后再触发匹配，避免脏读        TransactionSynchronizationManager.registerSynchronization(            new TransactionSynchronization() {                @Overridepublic void afterCommit() {                    publisher.publishEvent(new EventCreated(eventId));                }            });    }}
```

Outbox 表结构很朴素，这里不展开。搬运由独立调度器或 CDC 负责，保证"业务成功 ⇒ 事件最终一定被处理"。

这里有个坑得提一句：`afterCommit` 里发的事件，监听器别图省事写成 `@TransactionalEventListener`。这时候事务已经提交完了，在监听器眼里是不存在活动事务的，默认 `fallbackExecution=false` 意味着它根本不会执行，而且不报错，特别难查。要么用普通 `@EventListener` 加 `@Async`，要么干脆在 afterCommit 里把 MQ 消息直接怼出去。

### 3.2 订阅匹配

事件类型精确匹配，再加过滤表达式求值。结果丢本地 Caffeine 缓存——每个事件都去查一遍库，DB 顶不住。

```
@Component@RequiredArgsConstructorpublicclass SubscriptionMatcher {    privatefinal SubscriptionRepository repo;    privatefinal Cache<String, List<Subscription>> cache = Caffeine.newBuilder()            .maximumSize(20_000).expireAfterWrite(Duration.ofMinutes(1)).build();    public List<Subscription> match(String eventType, Map<String, Object> payload) {        List<Subscription> candidates = cache.get(eventType,                k -> repo.findEnabledByEventType(k));        if (candidates == null) return List.of();        return candidates.stream()                .filter(s -> FilterEvaluator.eval(s.getFilterExpr(), payload))                .toList();    }}
```

表达式引擎用 SpEL 的话，必须把 `T()` 类型引用和构造器调用禁掉，或者干脆自己写个只支持比较和逻辑运算的小引擎。求值抛异常一律当"不匹配"处理，同时打点告警——不匹配是安全的，把异常放出去打断整个 fanout 才是事故。

### 3.3 落库与出队

```
public void fanout(String eventId, String eventType, String payload) {    List<Subscription> subs = matcher.match(eventType, JsonUtil.toMap(payload));    String hash = DigestUtils.sha256Hex(payload);    for (Subscription s : subs) {        taskMapper.insertIgnore(            DeliveryTask.pending(eventId, s.getId(), s.getAppId(), eventType, payload, hash,                                 Instant.now()));   // next_retry_at = now    }    // 之后由调度器统一出队，不在发布线程里做 HTTP}
```

`insertIgnore` 的语义就是重复事件静默忽略，不重置已有任务的状态。发布线程只管落库，一行 HTTP 都不做。

出队用两级触发。延迟队列负责"准点"，DB 扫描负责兜底——30 秒一轮捞 `next_retry_at <= now` 的过期任务。只用 MQ 延迟消息，消息丢了就永久丢；只用 DB 扫描，精度差、DB 压力还大。两个搭一起最稳，成本也就是多写一个扫描 job。

Worker 用 CAS 抢占，防止多实例重复消费：

```
UPDATE webhook_delivery_taskSET status = 1, version = version + 1, updated_at = NOW()WHERE id = #{id} AND status = 0 AND version = #{version};
```

`status = 0` 其实已经能挡住并发重复消费了，version 是用来判断"我读到的这一行还是不是最新的"，别图省事删掉。

### 3.4 签名

签名串必须同时包含时间戳、nonce 和原文，三样都不能少。缺时间戳能被重放，缺 nonce 做不了一次性校验，只签部分字段则存在拼接伪造的空间。

```
public finalclass WebhookSigner {    /** 待签名串：timestamp\nnonce\nbody，用换行分隔避免拼接注入 */    public static String signContent(long ts, String nonce, String body) {        return ts + "\n" + nonce + "\n" + body;    }    public static String hmacSha256(String secret, String content) throws Exception {        Mac mac = Mac.getInstance("HmacSHA256");        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));        return Base64.getEncoder().encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));    }    public static String sha256WithRsa(PrivateKey key, String content) throws Exception {        Signature sig = Signature.getInstance("SHA256withRSA");        sig.initSign(key);        sig.update(content.getBytes(StandardCharsets.UTF_8));        return Base64.getEncoder().encodeToString(sig.sign());    }}
```

投递时请求头固定这么几个：

```
POST /webhook/order HTTP/1.1Content-Type: application/jsonX-Webhook-Id: evt_20241001_7f3a9cX-Webhook-Timestamp: 1727760000000X-Webhook-Nonce: 5c1e8b2a9dX-Webhook-Key-Id: k_2024_10X-Webhook-Signature: v1=Base64(...)User-Agent: Platform-Webhook/2.0
```

验签规则得写进开放平台文档，并且明确到底：时间戳跟本地时间偏差超过 5 分钟直接拒；用 `X-Webhook-Id` 或 nonce 做 5 分钟窗口内的去重；验签失败返回 401，千万别返回 200——返回 200 平台就当这次成功了，你这边进了多少脏数据没人知道。

### 3.5 退避

曲线是"指数 + 抖动 + 封顶"。抖动是必须的，没抖动的话，同一批失败任务会在同一毫秒重试，形成脉冲，本来对方刚缓过来又被你打回去。

```
public static Duration backoff(int attempt, Long retryAfterSec) {    // 429 优先听对端的，但别被一个离谱的 Retry-After 拖死    if (retryAfterSec != null) {        return Duration.ofSeconds(Math.min(retryAfterSec, 3600));    }    int n = Math.max(1, attempt);    long baseSec = Math.min(10L << Math.min(n - 1, 20), 6 * 3600L);    double jitter = 0.8 + ThreadLocalRandom.current().nextDouble() * 0.4;   // ±20%    return Duration.ofMillis((long) (baseSec * 1000 * jitter));}
```

按这个算，第 1 次是 10 秒，第 5 次 160 秒，第 8 次 1280 秒（21 分钟出头），第 10 次 5120 秒（85 分钟）。十次退避累计下来一万秒左右，两个多小时到三个小时之间，抖动拉满接近三个半小时。扛第三方常规发版窗口绰绰有余。

顺带说个我们真踩过的坑。早先版本写的是 `Math.min(10L * (1L << Math.min(attempt - 1, 10)), 6 * 3600L)`，看着有 6 小时封顶挺周全，实际上 `Math.min(attempt - 1, 10)` 已经把指数截在 1024 上了，最大算出来 10240 秒，永远够不到 21600 秒那个封顶。也就是说封顶那半行是死代码，长故障场景下重试间隔涨到 2.8 小时就停住了，后面再怎么失败也不再拉长。把截断挪到 20 才修好。这种代码单看每一行都对，组合起来才露馅。

429 单独处理：优先读 `Retry-After`，读不到再用固定值兜底。人家都告诉你什么时候再来了，你还按自己的节奏打，纯属找封。

`max_retry` 默认给 10。对账类事件（退款结果这种）可以单独调到 24，覆盖一整天。

## 四、可靠性

### 4.1 语义边界

平台对外承诺的是 At-Least-Once，外加一个稳定不变的 eventId。

每条任务至少成功一次才可能结束，绝不静默丢弃。重复一定有，eventId 全局唯一、重试期间不变，订阅方拿它做幂等。全局有序不承诺。

对顺序有硬性要求的场景，我们留了个"顺序投递"开关：按 `subscription_id + event_type` 哈希到固定的逻辑队列，同一个队列里同一时刻只允许一个任务在途，前一个没结束后一个就挂着。这是拿吞吐换顺序，默认是关的——一开，这条链路的 QPS 上限就等于单个 worker 的处理速度，别乱开。

### 4.2 幂等键

投递侧用 eventId 当业务主键，文档里要求订阅方建 `uk(event_id)`。还有一句必须写在显眼位置：收到重复事件直接返回 200，不要回 409。回 409 平台会当成失败继续重试，两边就无限循环了。

### 4.3 失败分级

4xx 无脑重试是最浪费资源的做法，也是最常见的。

2xx 算成功，记耗时。408 和 429 可重试，429 优先按 `Retry-After` 走。5xx 可重试，走指数退避。连不上、读超时、连接重置，可重试。

400 / 404 / 405 / 422 属于永久失败，直接进死信，同时给订阅方发告警邮件——大多数情况就是他们参数配错了，早点通知早点改。

3xx 不跟随，直接判永久失败。这个有代价：有些订阅方填了 http 地址，我们这边会吃到 301，全部失败。但我们认这个代价，让他们改地址比放开重定向安全得多。

401 / 403 单独拿出来处理：先按可重试算，最多重试两次。为什么不一刀切？因为线上见过太多次，是对方轮换了密钥或者权限没配好，纠正之后立刻就好了，永久失败纯属误伤。两次还不行再进死信。

还有一类：响应体不是 JSON，或者签名回显校验不过。这属于对端行为异常，按可重试处理。

### 4.4 死信

死信不是垃圾桶，是"等着人来拍板"的队列。三件事。

归因。`reason` 区分 EXHAUSTED（重试耗尽）、PERMANENT\_4XX（对端拒绝）、URL\_INVALID（地址非法）、BREAKER\_TIMEOUT（熔断挂太久）。运营按应用聚合看 TOP 失败原因，我们先跑出来的数据是 78% 的死信属于地址配错，这个数字直接推着产品在控制台加了"保存前必验"。

重放。控制台按应用或事件类型批量重放，重置 `attempt_count`、刷新的 `next_retry_at`，`replay_count` 加一，超过 3 次就不让再放了，防无限循环。

归档。T+7 转冷存储，保留 180 天应付审计。

```
@Transactionalpublic void replay(Long deadLetterId) {    DeadLetter dl = deadLetterMapper.selectForUpdate(deadLetterId);    if (dl.getReplayCount() >= 3) throw new BizException("重放次数超限");    taskMapper.resetForReplay(dl.getTaskId());   // status=0, attempt_count=0, next_retry_at=now    deadLetterMapper.markReplayed(deadLetterId);    publisher.publishEvent(new TaskReady(dl.getTaskId()));}
```

这里有个细节：任务重放之后要是又失败了，再次落死信会撞 `uk_task`，所以死信写入得用 `ON DUPLICATE KEY UPDATE` 把 `reason` 和 `replay_status` 刷回 0，但 `replay_count` 得保留，不然那个"最多重放 3 次"的限制就形同虚设。

### 4.5 熔断和限速

熔断按 `subscriptionId` 维度隔离，千万别做成全局的。连续 20 次可重试失败进 OPEN，60 秒后进 HALF\_OPEN 放 3 个探针。探针通过就闭合，不通过就重新 OPEN，同时把冷却时间翻倍，上限 10 分钟。

熔断期间任务不消耗重试次数，只往后推 `next_retry_at`。但这里得有个闸：如果一直熔断，任务会被无限延期，永远到不了终态。所以我们额外加了个 defer 计数，挂起超过 24 小时或者 defer 超过 200 次，直接转死信，reason 记 `BREAKER_TIMEOUT`，让人工来看。

限速是三层令牌桶。应用级（比如 500 QPS）防止单个大客户独占全局线程池；订阅级用 `qps_limit`，尊重对方自己的承载能力；全局级保护平台出口带宽和连接数。多实例上 Redis + Lua 保证一致，单机用 Bucket4j 就够了。超限的任务 `next_retry_at = now + 1s`，同样不占重试次数。

```
public DeliveryOutcome execute(DeliveryTask task) {    if (!breaker(task.getSubscriptionId()).tryAcquire()) return DeliveryOutcome.deferred(1);    if (!rateLimiter.tryAcquire(task.getAppId()))       return DeliveryOutcome.deferred(1);    // ... 实际 HTTP 调用}
```

执行顺序是熔断器 → 应用级限流 → 订阅级限流 → HTTP，任何一层没过直接 deferred 返回，连接都不建。顺序有讲究，最便宜的判断放最前面。

## 五、可观测和安全

### 5.1 指标

几个必须有的，缺一个排障的时候就得靠猜。

`webhook.delivery.total{app,event_type,result}` 计数器，成功率就是 SUCCESS 除以 total。注意 app 维度基数很大（2000 个），实际只给 TOP 200 打标签，其余归到 other，不然 Prometheus 的 TSDB 会被直接撑爆。

`webhook.delivery.latency{app}` 计时器，看 P50/P95/P99。首投和重试必须分开出图，混在一起没有意义。

`webhook.task.backlog` 表示状态 0 且已到期的任务数，过万就告警。这个指标比成功率更早反映问题，成功率还没掉的时候积压已经开始涨了。

`webhook.retry.attempt{attempt_no}` 重试次数分布，用来判断退避曲线合不合理。如果第 1 次的量远大于第 2 次，说明大部分失败都是一闪而过的抖动，曲线没问题。

`webhook.deadletter.total{reason}` 死信增速，突增一定是哪个订阅方出事了。

`webhook.breaker.state{subscription}` 处于 OPEN 的订阅方以及持续时长。

链路追踪上 traceId 要贯穿"业务发布 → 任务落库 → 每次 HTTP 尝试"，`X-Webhook-Id` 作为业务标签打在 span 上。第三方来问"我这条怎么没收到"，把 eventId 一搜，整条链路直接拉出来，不用翻三套日志对时间。

有个经验挺实用：把订阅方的响应耗时分布和我们自己的超时阈值画在同一张图上。某家的 P99 已经贴着超时线了，那这家就该单独调小并发、调大超时，而不是全局把 5 秒改成 10 秒——改了之后慢的没变快，快的反而更容易堆。

### 5.2 密钥轮换

轮换必须支持新旧密钥重叠，否则切的那一秒所有投递全挂。

流程是这样：平台生成新密钥，`key_id = k_2024_11`，旧密钥标 DEPRECATED 但保留。重叠期内请求头同时带两套——`X-Webhook-Key-Id` + `X-Webhook-Signature` 是一套（新），`X-Webhook-Previous-Key-Id` + `X-Webhook-Previous-Signature` 是另一套（旧），订阅方手上有什么就拿什么验，任意一套通过就算过。重叠 7 天，期间平台每天推一条 `KEY_ROTATION` 事件提醒。7 天后旧密钥下线，验签失败的订阅方在控制台能看到失败样本，自己比对。

密钥在库里必须密文存（AES-GCM，主密钥交 KMS 托管），控制台只给"重置"不给"查看"，日志里一律脱敏。这几条看着啰嗦，但都是被实际问题逼出来的。

### 5.3 SSRF

回调地址是用户输入，四层校验，一层都不能省。

协议和格式。只放 https，内网联调可以按 appId 开 http 白名单。禁止带 userinfo（`https://a:b@host` 这种），生产环境禁止 IP 字面量直连。

DNS 解析之后校验。解析出来的所有地址必须全部落在公网，命中 `10/8`、`172.16/12`、`192.168/16`、`127/8`、`169.254/16`（云元数据，这个最要命）、`0.0.0.0/8`、`100.64/10`（CGNAT）、`::1`、`fc00::/7`、`fe80::/10` 任何一个，直接拒。

连接时固定 IP。校验完把 `InetAddress` 直接交给 HTTP 客户端，别让它自己再解析一遍，否则就是"校验时是公网、连接时变内网"的 DNS Rebinding。OkHttp 自定义 `Dns` 返回已校验的地址就行。

禁止跟随重定向。`followRedirects(false)`，3xx 判永久失败，防止 302 到内网。

```
public finalclass SsrfGuard {    privatestaticfinal List<Cidr> DENY = Cidr.parseAll(        "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8",        "169.254.0.0/16", "0.0.0.0/8", "100.64.0.0/10", "::1/128", "fc00::/7");    public static InetAddress resolveAndCheck(String host) throws IOException {        InetAddress[] addrs = InetAddress.getAllByName(host);        for (InetAddress a : addrs) {            if (DENY.stream().anyMatch(c -> c.contains(a))) {                thrownew SsrfException("blocked address: " + a.getHostAddress());            }        }        return addrs[0];   // 冻结 IP，交给 HttpClient 直连    }}
```

另外，回调地址在**保存那一刻**就要发一次带签名的 challenge，对方回显成功才算验证通过，没验证的地址不允许上线投递。这一步能挡掉相当一部分配置错误导致的死信。

## 六、压测和线上调优

### 6.1 故障模拟

我们搭了个可编程的 Mock 订阅方，行为用配置开关切，跑四类场景。

**超时**：睡 15 秒再返回 200，我们客户端超时是 5 秒。预期行为是判 RETRYABLE 重试，如果后面真收到 200 就算成功——注意这时候对方实打实会收到两次同一个事件，这个要提前跟订阅方讲清楚。

**持续 5xx**：连返 500 共 40 分钟。预期是按退避重试，大概第 7 到第 8 次能碰上恢复窗口，然后成功，期间不能阻塞其他订阅方。

**重复回调**：首次 200，然后网关重放同一请求 5 次。平台侧不该重复发，对方侧的幂等键这时候得顶住。

**429 限流**：返回 `Retry-After: 120`，平台应该按 120 秒延后，不消耗重试次数。

"超时但实际成功"这个场景最麻烦，也最容易跟订阅方扯皮。我们的结论很直接：客户端超时之后一定会重试，对方 100% 会收到至少两次同一个 eventId。所以幂等键不是"建议"，是接入的硬门槛，控制台还得给个"重复投递统计"，让订阅方自己看得见、查得着。

### 6.2 重试风暴

构造的故障：让一个占全局流量 30% 的订阅方整体 503，持续 30 分钟。

没做防护的对照组挺惨。恢复瞬间 180 万条积压任务同时到期，投递 QPS 冲到 2 万，对方 3 秒内二次挂掉，就这么"恢复—打挂"来回循环。与此同时我们自己的线程池队列堆满，其他正常订阅方的 P99 从 80ms 涨到 6 秒。

开了防护之后：抖动把重试散到 20 分钟的窗口里，峰值重试 QPS 从 2 万降到 1800；订阅级熔断在连续 20 次失败后 OPEN，故障期间对这个订阅方几乎是零流量；对方恢复后 HALF\_OPEN 的 3 个探针 30 秒内探通，随后按 50 QPS 的令牌桶线性放开，15 分钟把积压消化完；应用级限流加线程池隔离，保证剩下 1999 个订阅方的 P99 稳在 90ms 以内。

这组数据说明的事其实很朴素：退避没抖动等于没有退避，熔断不分租户等于没有熔断。

### 6.3 性能数据

单机 8C16G 的口径。事件入口纯落库加 fanout 能压到 8000 TPS，这是峰值短时能力，不是常态。平均扇出 6.2，落到任务表就是 5 万行/秒的批量 insert，每批 200 行。

HTTP 投递侧单机能跑 1800 QPS 左右，P99 220ms，倒推一下并发不到 400，瓶颈明显在对端 RT 而不是 CPU。开虚拟线程之后（JDK 21 + Boot 3.2，把 `ThreadPoolTaskExecutor` 换成虚拟线程执行器）同一台机器能到 3500，提升接近一倍，核心线程数那堆参数也不用再调了。但这里有个必须配套做的事：用信号量把并发卡死。虚拟线程是便宜了，MySQL 连接池和出口端口不会跟着便宜，先炸的一定是它们。

健康订阅方的首投成功率 99.97%，端到端 P99 220ms，死信率 0.11%。死信里 78% 是地址配错导致的永久 4xx——这个数字反过来推着我们把地址验证做进了保存流程。

生产上机器数是按"扇出后的稳态 QPS ÷ 单机能力"配的，峰值那几分钟靠积压加退避慢慢消化，不会真按峰值去扩容量。扩了平时也是闲的。

### 6.4 对账兜底

最后一道保险是对账。每天凌晨按 `(event_type, 业务主键)` 比业务库和投递台账，找出"业务侧有、台账里没有"的事件。

这一步有个容易写错的地方：不能简单重跑一遍 fanout。`INSERT IGNORE` 会把已存在的任务直接忽略掉，对账等于白跑。我们走的是单独的补投入口——已成功的跳过，失败或死信的重新激活，台账里压根没有的才按新任务插进去。

这条链路能在消息丢了、Outbox 搬运失败、甚至人为误删之后把差异收敛到零。前面所有机制做的都是"尽量别出错"，对账做的是"错了也能找回来"。

## 最后聊几句

这套东西上线之后，投递成功率从 95% 那个量级稳到了 99.9% 以上，运维成本反而降了——大部分问题能在指标面板和死信队列里先看到，不用等用户来投诉。

回头看，真正决定这套系统能不能扛住的，其实没几个东西。

最根本的一条是把 DB 当唯一真相。MQ、延迟队列都是加速器，任何一环丢了，靠扫任务表都能自己爬起来。把 MQ 当存储用，迟早要还。

第二条是承认重复躲不掉。幂等只能外置，eventId 是那个不动的锚点，文档、SDK、控制台统计三样一起往订阅方那边推，推不到位就是你自己的问题。

第三条，退避必须有抖动，熔断必须按租户隔离。前者防脉冲，后者防全局拖垮，少一个都不行。

最后是失败分级和安全边界这两块。4xx 别盲重试，5xx 别急着放弃，分级做不做，直接决定同样的重试预算是打水漂还是真能救回来；而 SSRF 挡在连接层、密钥管理做在重叠期，这两件事做一次就够，不做就要做好被事故教育的准备。

## 🎁 福利时间

如果你正在备战大厂面试，我整理了一个 **开发者的知识库** 涵盖 Java 程序员需要掌握的核心知识。

**知识库地址：https://farerboy.com/  
**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)  

* * *

##### 架构设计之道在于在不同的场景采用合适的架构设计，架构设计没有完美，只有合适。

### 在代码的路上，我们一起砥砺前行。用代码改变世界！

感谢观看，如果觉得对您有用，还请动动您那发财的手指头，点赞、转发、在看、收藏![图片](https://res.wx.qq.com/t/wx_fed/we-emoji/res/assets/newemoji/2_06.png#imgIndex=2)![图片](https://res.wx.qq.com/t/wx_fed/we-emoji/res/assets/newemoji/2_06.png#imgIndex=3)![图片](https://res.wx.qq.com/t/wx_fed/we-emoji/res/assets/Expression/Expression_64@2x.png#imgIndex=4)![图片](https://res.wx.qq.com/t/wx_fed/we-emoji/res/assets/Expression/Expression_64@2x.png#imgIndex=5)

更多精彩合集请关注公众号🔽🔽🔽🔽🔽🔽🔽🔽

  

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

> 欢迎学习或从事编程开发、技术招聘 HR 进群，欢迎大家分享自己公司的内推信息，相互帮助，一起进步！

_**工作 3 年还在写 CRUD?简历投递杳无音讯？面试屡屡受挫，迟迟拿不到 offer？**_

_**在竞争激烈的大环境下，只有不断提升核心竞争力才能立于不败之地。**_

**_扫码留言_**【我要晋级】_**一对一指导，带你晋级。**_**__**

—— 斩获心仪Offer，破解面试密码 ——

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**广告人士勿入，切勿轻信私聊，防止被骗**

*   **[\>>> 精选 SpringBoot 应用系列 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3962295143138246661#wechat_redirect)**  
    
*   **[\>>> 精选 JVM 系列 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3921799178770104328#wechat_redirect)**  
    
*   **[\>>> 精选排序算法系列 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3940434490433912837#wechat_redirect)**  
    
*   **[\>>> 镜像常见数据库优化/SQL优化系列 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3928562202449199110#wechat_redirect)**  
    
*   **[\>>> 常用中间件部署与使用 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3858009968628383745#wechat_redirect)**  
    
*   **[\>>> 编程技巧与原理解析 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3863770327008067586#wechat_redirect)**  
    
*   **[\>>> 开源项目推荐 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3985540521048326148#wechat_redirect)**
    
*   **[\>>> 设计模式系列 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=3990993257143386124#wechat_redirect)**
    
*   **[\>>> 达梦数据库合集 >>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=4028920795467268101#wechat_redirect)**
    
*   **[\>>> 高频面试合集 >>>](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU1MjAwODAzOA==&action=getalbum&album_id=4047876008559427596#wechat_redirect)**  
    
*   **[普通学历程序员逆袭之旅 | 如今应届生该不该选择程序员？](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247484450&idx=1&sn=8921bff01c23e4bdf39ef5b6ab17af22&scene=21#wechat_redirect)**
    
*   **[程序员年薪 25 万 到 35 万到底是什么水平？](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247484427&idx=1&sn=a0cdba15dc765b65601d85b78f4799f4&scene=21#wechat_redirect)**  
    
*   **[DeepSeek杀入编程圈：程序员集体失业？还是效率革命？](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247484129&idx=1&sn=61c90e68610601abd47a80c9e53cf7fa&scene=21#wechat_redirect)**
    
*   **[深入剖析 Java 精度丢失：从二进制存储到浮点运算的底层逻辑](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247484606&idx=1&sn=773b9cbcbf9a004e4d6d3eaaf55209a6&scene=21#wechat_redirect)**
    
*   **[别再用 JWT 当系统 Token 了，后果很严重！](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247484575&idx=1&sn=5aef18b7f65cd7971f66cb3455950560&scene=21#wechat_redirect)**
    
*   [国产免费 SpringBoot 应用日志监控平台,一站式、轻量级，夯爆了！](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247488033&idx=1&sn=9578dba4ca0210869a0173a72edc90e9&scene=21#wechat_redirect)  
    
*   **[蚂蚁又开源了一个顶级 Java 项目！](https://mp.weixin.qq.com/s?__biz=MzU1MjAwODAzOA==&mid=2247485185&idx=1&sn=d7b311e32aec54a5febe6125455f597c&scene=21#wechat_redirect)**