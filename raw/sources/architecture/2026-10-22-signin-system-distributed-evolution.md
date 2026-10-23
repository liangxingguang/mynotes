---
title: 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/Ig7Y4uOQWzBe97p51udlHQ"
source_type: link
platform: wechat
captured: 2026-10-22
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-22-signin-system-distributed-evolution.md
asset_ref: Assets/2026/10/signin-system-distributed-evolution.md
---

# 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南

# 从 0 到 1 亿：Spring Boot 签到打卡系统的分布式架构演进与生产级避坑指南

> 原文：https://mp.weixin.qq.com/s/Ig7Y4uOQWzBe97p51udlHQ

> 一个签到接口进入生产后，难点从来不是 `SETBIT`，而是当早高峰、重复提交、零点跨日、Redis 故障、Kafka 积压、奖励规则灰度与数据重建同时发生时，系统仍能做到：**签到至多一次、奖励最终到账且不重复、每一步都能追溯和补偿。**
>
> 本文以"某内容 App 日常签到"为贯穿案例。文中的容量和代码是可执行的工程骨架；节点规格、分片数和超时仍必须以本团队压测结果为准。

* * *

## 1. 真实案例：08:00 的一次活动峰值

某内容 App 有 1 亿注册账户、2,000 万 DAU、500 万日签到用户。业务规则如下：

*   每个账户每天首次签到获得 1 积分；连续第 7、14、30 天分别额外获得 10、30、100 积分；
*   App、H5、小程序共享 `DAILY` 签到能力；
*   业务日统一按 `Asia/Shanghai`；客户端不能指定签到日期；
*   用户重复点击、网关重试和客户端超时重试必须幂等；
*   奖励允许延迟，但不允许永久丢失或多发；
*   08:00～09:00 有 45% 用户签到，运营 Push 可能使其中 20% 集中在一分钟内。

容量换算：

```
2,250,000 次 / 1 小时 ≈ 625 QPS
450,000 次 / 1 分钟 = 7,500 QPS
考虑活动、网络重试与冗余：按 30,000 QPS 设计
```

业务方口中的"签到成功"不能含糊。本文定义为：

```
服务端已经唯一接受该账户在该业务日的签到命令，且存在一份可恢复的持久化命令记录。
```

积分到账是后续异步状态，而不是 HTTP 同步链路的一部分。

```json
{
  "code": 0,
  "data": {
    "signed": true,
    "firstSigned": true,
    "streak": 7,
    "rewardStatus": "PROCESSING",
    "requestId": "01JQ4Z..."
  }
}
```

同一天再次请求仍返回 200，只是 `firstSigned=false`。对客户端来说，目标状态已经成立；返回 409 只会诱导无意义重试。

* * *

## 2. 先定义 SLO 与数据权威性

| 项目 | 目标 | 设计影响 |
| --- | --- | --- |
| 峰值写入 | 30,000 QPS | 热路径不得同步调用积分、通知、分析服务 |
| API P99 | < 80 ms | 同步操作只保留认证、命令落库和 Redis 原子状态写 |
| 重复请求 | 不重复发奖 | 业务键、原子判定和奖励账本三层幂等 |
| 奖励延迟 | 秒级到分钟级 | Kafka 异步，提供可查询状态与补偿 |
| 单点故障 | 不永久丢奖励 | 不能把 Redis Stream 作为唯一 Outbox |
| 历史审计 | 可重放、可对账 | DB Ledger 为事实来源，Redis 为可重建热状态 |

| 数据 | 职责 | 是否权威 | 保留策略 |
| --- | --- | --- | --- |
| Redis 日 Bitmap | 今天签到、日历快速读 | 否 | 400 天，可重建 |
| Redis streak | 快速返回连续天数 | 否 | 活跃用户热状态 |
| Redis Stream | 唤醒 Dispatcher | 否 | 有容量和最老事件水位 |
| `signin_command` | 已接受命令的恢复锚点 | 是 | 覆盖补偿窗口 |
| `signin_ledger` | 签到事实 | 是 | 长期归档 |
| `point_ledger` | 奖励事实 | 是 | 长期归档 |

这张表是全文的前提：Redis 主从切换丢失最近写入时，可重建状态可以修复；已返回成功的业务命令若没有权威记录，则无法靠"重试几次"挽回。

* * *

## 3. 架构演进：由瓶颈触发，而非组件堆砌

1 万用户 MySQL 唯一索引 → 100 万用户 Redis 热状态 + MySQL → 千万用户 Redis Cluster + 异步事件 → 1 亿用户分桶 Bitmap + Command Outbox → 平台化：风控、数仓、多地域、规则中心。

### 3.1 一万用户：先用数据库唯一索引

```sql
CREATE TABLE signin_ledger (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    biz_id      VARCHAR(160) NOT NULL,
    account_id  BIGINT       NOT NULL,
    source      VARCHAR(32)  NOT NULL,
    sign_date   DATE         NOT NULL,
    streak      INT          NOT NULL,
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_biz_id (biz_id),
    KEY idx_account_date (account_id, sign_date)
) ENGINE=InnoDB;
```

`bizId = SIGNIN:DAILY:{accountId}:20260924`。直接插入，重复键即"今天已签到"。此阶段不要引入分布式锁、Redis Cluster、Kafka 或 Seata；数据库唯一索引就是最可靠、最易审计的原子边界。

### 3.2 百万用户：Redis 解决热读写，账本仍在 DB

以下写法有并发漏洞：

```java
if (!Boolean.TRUE.equals(redisTemplate.opsForValue().getBit(key, offset))) {
    redisTemplate.opsForValue().setBit(key, offset, true);
    rewardService.addPoints(accountId);
}
```

两个请求都可能读到 `false`。首次判定必须来自一个原子操作的旧值，或统一收敛到 Lua。

### 3.3 亿级：解决海量小 Key 和热 Slot

"每用户每月一个 Bitmap"在 1 亿用户下理论上会产生 12 亿个 Key。位图本体很小，但 Redis Object、dictEntry、SDS、Key 字符串和 allocator 碎片并不小。亿级设计应按日期和用户桶分布数据。

* * *

## 4. 按日期 + 用户分桶 Bitmap

Key 形式：

```
{signin:DAILY:042}:day:20260924
```

1 亿用户分 1024 桶：

```
每桶最高 offset 约 97,657 bit
单桶每日位图约 12 KB
1024 桶每日原始 Bitmap 约 12.5 MB
400 天约 5 GB（未含对象、复制和碎片）
```

### 4.1 绝不能直接使用 Snowflake ID 作为 offset

Snowflake ID 可接近 `10^18`。`SETBIT key 1983481238732873728 1` 会扩容出灾难性大字符串。必须在注册时分配稳定、不可复用的稠密索引：

```sql
CREATE TABLE account_uid_index (
    account_id BIGINT NOT NULL,
    uid_index  BIGINT NOT NULL,
    PRIMARY KEY (account_id),
    UNIQUE KEY uk_uid_index (uid_index)
) ENGINE=InnoDB;
```

签到热路径从本地 Caffeine 或 Redis 缓存读取 `uid_index`，缓存未命中才访问账户库。账号注销和合并也不能回收 offset，否则新账号可能继承旧账号的签到位。

```java
public final class SignInKeyRouter {
    private static final int SHARD_BITS = 10;
    private static final int SHARD_COUNT = 1 << SHARD_BITS;
    public static int bucket(long uidIndex) {
        return (int) (uidIndex & (SHARD_COUNT - 1));
    }
    public static long offset(long uidIndex) {
        return uidIndex >>> SHARD_BITS;
    }
    public static String tag(SignInSource source, int bucket) {
        return "{signin:" + source.code() + ":" + String.format("%03d", bucket) + "}";
    }
}
```

`source` 必须是服务端 enum，例如 `DAILY`、`NEW_USER_7D`。不能把请求参数直接拼到 Redis Key；否则攻击者能制造无限 source、无限 Key，甚至用 `}` 干扰 Cluster hash tag。

### 4.2 为什么要分桶

每天只有一个 Key 时，所有 `SETBIT` 都落到一个 Cluster Slot。1024 桶把请求分散到 1024 个 Slot；但 1024 不是魔数：

```
单桶峰值 = 全站峰值 ÷ 桶数 × 热点系数
30,000 ÷ 1,024 × 3 ≈ 88 QPS/桶
```

实际应监控每桶 QPS、延迟和内存。桶数变更需要双读/双写迁移，不能在线直接从 1024 改成 4096。

* * *

## 5. 业务日与连续签到：一个容易在零点出错的状态机

日期必须由服务端计算：

```java
private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
LocalDate date = LocalDate.now(BUSINESS_ZONE);
```

客户端传日期会造成篡改、时区不一致和补签绕过。普通签到只接受当前业务日；补签必须是权限受控、可审计的独立命令。

零点附近还会有乱序：`2026-09-24 23:59:59` 的请求在网络抖动后，可能比 `2026-09-25 00:00:01` 的请求更晚进入 Redis。若盲目更新 streak，就会把今天的状态回退到昨天。

状态机分支：无历史→首次签到/streak=1；date == lastDate→Duplicate；date == lastDate+1→Consecutive/streak+1；date > lastDate+1→Reset/streak=1；date < lastDate→Stale 不回退。

普通接口在网关处记录 `acceptedAt`，服务端只接受对应的当前业务日；迟到的前一日请求不补签到，只返回可重试或当前状态。这样才不会出现状态倒退。

* * *

## 6. Redis Cluster 下的一次原子签到

参与一次 Lua 的 Key 必须处于同一 Slot：

```
{signin:DAILY:042}:day:20260924
{signin:DAILY:042}:streak
{signin:DAILY:042}:stream
```

`streak` 是每桶一个 Hash，field 为 `uidIndex`，值为 `epochDay:streak`。要正视其容量：1 亿用户就是 1 亿个 field，实际内存远大于值字符串。建议仅保留最近 90 天活跃用户，长期不活跃用户再次签到时从 `signin_ledger` 重算 streak 并回填。不要给整个 Hash 设置短 TTL，一个活跃账户会让整桶数据长期存活。

`signin.lua`：

```lua
-- KEYS[1] bitmap; KEYS[2] streak hash; KEYS[3] dispatch stream
-- ARGV[1] offset; ARGV[2] uidIndex; ARGV[3] epochDay
-- ARGV[4] bitmapTTL; ARGV[5] streamMaxLen
-- ARGV[6] commandId; ARGV[7] accountId; ARGV[8] source; ARGV[9] signDate
local old = redis.call('SETBIT', KEYS[1], ARGV[1], 1)
local raw = redis.call('HGET', KEYS[2], ARGV[2])
local lastDay, streak = -1, 0
if raw then
  local p = string.find(raw, ':')
  lastDay = tonumber(string.sub(raw, 1, p - 1))
  streak = tonumber(string.sub(raw, p + 1))
end
local today = tonumber(ARGV[3])
if old == 1 or today < lastDay then
  return {0, streak, 'UNCHANGED'}
end
if lastDay == today - 1 then streak = streak + 1 else streak = 1 end
redis.call('HSET', KEYS[2], ARGV[2], tostring(today) .. ':' .. tostring(streak))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
redis.call('XADD', KEYS[3], 'MAXLEN', '~', tonumber(ARGV[5]), '*',
  'commandId', ARGV[6], 'accountId', ARGV[7], 'source', ARGV[8],
  'signDate', ARGV[9], 'streak', tostring(streak))
return {1, streak, 'ACCEPTED'}
```

脚本保证"首次位图置位 + streak 变更 + Stream 通知"原子，却**不保证** Redis 故障切换后仍永久保存。将它称为唯一可靠 Outbox 是错误的；下一节的 Command 表才是恢复锚点。

* * *

## 7. 可靠命令 Outbox：承认跨存储边界，而不是掩盖它

```sql
CREATE TABLE signin_command (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    command_id   CHAR(26)     NOT NULL,
    biz_id       VARCHAR(160) NOT NULL,
    account_id   BIGINT       NOT NULL,
    source       VARCHAR(32)  NOT NULL,
    sign_date    DATE         NOT NULL,
    status       VARCHAR(24)  NOT NULL,
    streak       INT          NULL,
    payload      JSON         NOT NULL,
    next_retry_at DATETIME(3) NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_biz_id (biz_id),
    KEY idx_status_retry (status, next_retry_at)
) ENGINE=InnoDB;
```

推荐顺序：Client → SignIn Service：INSERT IGNORE command(NEW) → Redis Lua（SETBIT + streak + XADD）→ mark ACCEPTED(streak) → 200 PROCESSING；Redis Stream → Dispatcher → Kafka async send event → Ledger/Reward consume（ledger unique key + grant）。

失败语义也必须明确：

*   Command 写库失败：不调用 Redis，直接失败；
*   Redis 失败：返回"系统繁忙，请重试"，`NEW` Command 不由后台悄悄执行，避免用户收到失败却后来成功；
*   Redis 成功、应用在 `mark ACCEPTED` 前崩溃：对账任务用 Bitmap 与当天 `NEW` Command 对齐后补标；
*   Kafka/Dispatcher 故障：`ACCEPTED` Command 仍在 DB，扫描器可重新投递；
*   Redis 集群整体损失：从 Command/Ledger 重建热状态。

这不是零成本方案。30,000 QPS 的同步 Command 写入必须按 `account_id`/`biz_id` 分库分表，并实测索引、binlog、复制延迟和连接池。若团队不愿承担这部分成本，可改为持久 Kafka 命令主题，但 API 必须返回"已受理"，而非立即签到成功。

* * *

## 8. Spring Boot 核心实现

```java
@Service
@RequiredArgsConstructor
public class SignInService {
    private final SignInCommandRepository commandRepository;
    private final UserIndexService userIndexService;
    private final RedisSignInGateway redisGateway;

    public SignInResult signIn(long accountId, SignInSource source) {
        LocalDate date = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        String bizId = "SIGNIN:%s:%d:%s".formatted(source.code(), accountId,
                date.format(DateTimeFormatter.BASIC_ISO_DATE));
        SignInCommand command = commandRepository.createOrGet(
                UlidCreator.getUlid().toString(), bizId, accountId, source, date);
        if (command.isAccepted()) return SignInResult.duplicate(command.streak());
        long uidIndex = userIndexService.getCachedUidIndex(accountId);
        RedisSignInResult accepted = redisGateway.accept(
                uidIndex, source, date, command.commandId());
        if (!accepted.accepted()) {
            // 并发赢家可能刚执行完 Lua，尚未更新 command；短暂查询后再决定重试。
            return commandRepository.awaitAccepted(bizId, Duration.ofMillis(50))
                    .map(SignInResult::from)
                    .orElseThrow(RetryableSignInException::new);
        }
        commandRepository.markAccepted(command.commandId(), accepted.streak());
        return SignInResult.first(accepted.streak());
    }
}
```

Redis 客户端超时后可以进行有限重试：Lua 中 `SETBIT` 返回旧值，重试不会重复接受。但必须配置短超时、退避、抖动和总重试上限，不能把 Redis 的 20,000 QPS 抖动放大成 100,000 QPS 重试风暴。

* * *

## 9. Dispatcher：Stream 只做低延迟通知，DB 扫描保证最终投递

每个 Stream 建立 Consumer Group：

```
XGROUP CREATE {signin:DAILY:042}:stream signin-dispatch $ MKSTREAM
XREADGROUP GROUP signin-dispatch worker-a COUNT 200 BLOCK 1000 \
  STREAMS {signin:DAILY:042}:stream >
```

正确流程：

```
Stream 批量读取 → 按 commandId 批量加载 ACCEPTED command
→ Kafka 异步批量发送 → 成功回调后 XACK
→ XAUTOCLAIM 接管宕机 worker 的 Pending
→ DB 扫描 ACCEPTED 且未投递/超时命令，作为最终兜底
```

不要逐条 `kafkaTemplate.send().get(3 seconds)` 后 ACK。若每条等待 5 ms，一个 worker 理论上仅 200 msg/s，在 30,000 QPS 时必然堆积。Kafka 使用 `accountId` 为 key 以保障同账户有序；分区数、批量大小、Dispatcher 并发度由压测结果决定。

```yaml
spring:
  kafka:
    producer:
      acks: all
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
        delivery.timeout.ms: 120000
        request.timeout.ms: 30000
```

Kafka 发送成功、XACK 前进程崩溃会重发事件。这是正确的至少一次语义，去重必须放在账本唯一键，而非幻想消息系统"绝不重复"。

* * *

## 10. 奖励：一份签到命令可能产生多份不可变奖励事实

第 7 天的奖励不是"10 分"，而是"每日 1 分 + 连续 7 天额外 10 分"。因此事件中必须携带规则版本和已确定金额：

```json
{
  "commandId": "01JQ4Z...",
  "bizId": "SIGNIN:DAILY:10086:20260924",
  "accountId": 10086,
  "signDate": "2026-09-24",
  "streak": 7,
  "ruleVersion": "daily-2026-09-v3",
  "awards": [
    {"awardBizId":"SIGNIN_DAILY:DAILY:10086:20260924","type":"POINT","amount":1},
    {"awardBizId":"SIGNIN_STREAK_7:DAILY:10086:20260924","type":"POINT","amount":10}
  ]
}
```

```sql
CREATE TABLE point_ledger (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    account_id    BIGINT       NOT NULL,
    award_biz_id  VARCHAR(180) NOT NULL,
    point_delta   INT          NOT NULL,
    rule_version  VARCHAR(64)  NOT NULL,
    created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_award_biz_id (award_biz_id),
    KEY idx_account_time (account_id, created_at)
) ENGINE=InnoDB;
```

```java
@Transactional
public void grant(Award award) {
    int inserted = pointLedgerMapper.insertIgnore(
            award.accountId(), award.awardBizId(), award.amount(), award.ruleVersion());
    if (inserted == 1) {
        userPointMapper.increase(award.accountId(), award.amount());
    }
}
```

同一消息消费 100 次，余额最多增加一次。签到事实也要由 `SignInLedgerConsumer` 以 `signin_ledger.uk_biz_id` 单独落账；不要只记录积分，否则无法区分"签到成功但无奖励""规则改版"与"签到事实缺失"。

* * *

## 11. 月度日历、DAU 与查询降级

一个用户固定属于一个 bucket。当月每天 Key 都共享 hash tag，可用 Lua 一次读取全部 `GETBIT`，避免 28～31 次 RTT：

```lua
-- KEYS = 当月每天的 bitmap key; ARGV[1] = offset
local result = {}
for i = 1, #KEYS do
  result[i] = redis.call('GETBIT', KEYS[i], ARGV[1])
end
return result
```

超过 Redis 400 天保留期的日历从 `signin_ledger` 查询。不要无声返回空日历。

DAU 异步执行：

```
DAU(date) = Σ BITCOUNT({signin:DAILY:bucket}:day:date)
```

聚合结果写入 ClickHouse/指标库；用户签到热路径不做全局统计。

* * *

## 12. 早高峰故障复盘：Kafka 不可用 20 分钟

08:00:00，活动开始，服务已经按计划从 8 个 Pod 预扩容到 32 个 Pod。08:03 Kafka ACL 配置误发布，所有 producer 发送失败；Redis 与 Command DB 正常。

时间线：08:03 Kafka 不可用 → Dispatcher send 失败不 XACK → Stream Pending 增长 → ACCEPTED Command 未标投递 → 告警（oldest pending > 60s / command pending age > 60s）→ 08:23 修复 Kafka ACL → XAUTOCLAIM + DB 扫描器补投 → Ledger/Reward 按唯一键幂等落账 → 08:31 backlog 清零，对账通过。

用户的签到接口仍在 Redis Lua 成功后快速返回 `PROCESSING`，并没有同步等待 Kafka。恢复后重复投递是预期行为，`awardBizId` 唯一约束确保不多发积分。

这个案例还暴露两个运营要求：

*   Stream 的 `MAXLEN` 和 Redis 内存必须覆盖最大可接受 Kafka 故障时长；若超过保留水位，应触发限流或降级，因为裁剪未处理 Stream 是丢事件；
*   即使 Stream 被裁剪，`signin_command` 扫描器仍能重新投递；所以它才是可靠性锚点。

* * *

## 13. Redis 故障与数据重建

Redis 不是唯一审计源。重建日 Bitmap 时，按最近保留窗口扫描 `signin_ledger`，并根据 `uid_index` 重新计算桶和 offset：

```java
for (SignInLedger row : ledgerRepository.scanSince(cutoffDate)) {
    long uidIndex = userIndexService.getUidIndex(row.accountId());
    int bucket = SignInKeyRouter.bucket(uidIndex);
    redisTemplate.opsForValue().setBit(
            dayKey(row.source(), bucket, row.signDate()),
            SignInKeyRouter.offset(uidIndex), true);
}
```

streak 可以扫描每个账户最近连续的账本日期后重建。不要让重建任务逐条无节制 `SETBIT`；按 bucket 分组、Pipeline 批量执行，限制速率，并持续观测 Redis CPU、网络和延迟。

| 故障 | 用户行为 | 恢复措施 |
| --- | --- | --- |
| Redis 超时 | 返回可重试错误 | 有限重试；`NEW` command 清理 |
| Redis 成功后应用崩溃 | 用户可能超时 | Bitmap 与 `NEW` command 对账补标 |
| Kafka 不可用 | 签到仍成功、奖励处理中 | Stream + DB 扫描器补投 |
| Dispatcher 崩溃 | 签到仍成功 | `XAUTOCLAIM` 回收 Pending |
| 奖励库故障 | 奖励延迟 | Kafka retry/DLT，按 awardBizId 重放 |
| Redis 数据全失 | 近期热查询降级 | 从 command/ledger 批量重建 |

若产品要求"Redis 整体丢失时，所有已返回成功的签到绝对不丢"，就不能以 Redis Lua 作为唯一接受点；必须改为 DB 唯一键或持久 Kafka 命令日志先接受。这是业务语义选择，不是调大 Redis 副本数能解决的问题。

* * *

## 14. API、风控和限流

```java
@PostMapping
public ApiResponse<SignInResponse> signIn(
        @AuthenticationPrincipal LoginUser user,
        @RequestParam(defaultValue = "DAILY") String source) {
    SignInSource checked = SignInSource.parse(source); // 白名单校验
    SignInResult result = signInService.signIn(user.accountId(), checked);
    return ApiResponse.ok(SignInResponse.from(result));
}
```

链路：

```
CDN/WAF → 网关全局限流 → accountId 限流 → 签到服务 → Redis
```

同一账户可设为 5 秒 3 次。限流保护资源，幂等保护正确性，两者不能互相替代。若奖励可兑换现金、券或稀缺权益，额外异步发送设备、IP、UA、账号年龄等风控事件；高风险账户可以签到成功但奖励状态为 `REVIEWING`，不要把复杂模型同步放到热路径。

* * *

## 15. Kubernetes、超时与容量治理

```yaml
resources:
  requests: { cpu: "500m", memory: "768Mi" }
  limits:   { cpu: "2", memory: "1536Mi" }
startupProbe:
  httpGet: { path: /actuator/health/liveness, port: 8080 }
  failureThreshold: 30
  periodSeconds: 2
readinessProbe:
  httpGet: { path: /actuator/health/readiness, port: 8080 }
  periodSeconds: 5
terminationGracePeriodSeconds: 40
```

还需要 PDB、topologySpreadConstraints、连接池上限和优雅停机。`preStop sleep` 只能缓冲 Endpoint 更新，不能替代应用停止接收新请求、等待 in-flight 请求结束的 draining。

HPA 不应只看 CPU：Redis、数据库和 Kafka 等待会让 CPU 很低而请求堆积。建议组合 CPU、HTTP in-flight、P99、Redis 连接池等待、Command backlog。确定的 08:00 高峰应 07:50 预扩容；HPA 用来承接不可预测波动。

分层超时示例：

```
Gateway：1000 ms
SignIn API 预算：80 ms
Redis 命令：50~100 ms
Kafka：仅 Dispatcher 异步处理，不占 API 预算
```

Java 21 虚拟线程可降低阻塞 I/O 的平台线程压力，但不会增加 Redis 单分片吞吐、数据库连接数或 Kafka Broker 能力。

* * *

## 16. 可观测性、对账与灰度

至少监控：

```
signin_request_total / duplicate_total / error_total / latency
redis_lua_latency / redis_timeout_total / hot_bucket_qps
command_new_total / accepted_total / new_oldest_age_seconds
stream_pending_total / stream_oldest_pending_age_seconds
kafka_consumer_lag / dispatcher_send_failure_total / dlq_total
reward_success_total / reward_duplicate_total / reward_pending_age_seconds
command_vs_ledger_gap_total / expected_award_vs_point_ledger_gap_total
```

日志、Command、Kafka Event、Ledger 都携带 `requestId`、`commandId`、`bizId`、`accountId`、`source`、`signDate`、`ruleVersion`。用户说"签到成功但积分没到"时，可以在数分钟内定位到接受、投递、消费、账本哪个环节。

灰度规则变更时，事件携带不可变 `ruleVersion` 与 `awards.amount`。同一用户即使请求被路由到不同版本，消费者也不会用"当前规则"重算历史事件。规则金额、灰度人群和生效时间需由规则中心审计；禁止仅依赖应用代码中的 `if (streak == 7)`。

* * *

## 17. 压测和上线检查

压测不是只验证 HTTP 200。至少包含：

1.  30,000 QPS 首次签到持续 10 分钟，观察全链路 P99、Redis bucket 分布、DB command 写入和 Kafka backlog；
2.  同账户 100 并发，只产生一个首次签到、一个 `signin_ledger` 和正确数量的 `point_ledger`；
3.  零点前后混合请求，streak 不回退；
4.  Redis 注入 P99 +100 ms，重试量有上限且不形成风暴；
5.  Kafka 不可用 30 分钟，验证 Stream 水位、Command 扫描器和恢复补发；
6.  杀死 Dispatcher，验证 `XAUTOCLAIM` 接管 Pending；
7.  重复发送同一事件 100 次，余额只增加一次；
8.  清空 Redis，从 Ledger/Command 重建后抽样比对日历和 streak。

k6 中不要使用每 VU 重置的 `__ITER` 作为全局用户号，否则"首次签到压测"会被错误地压成大量重复签到。应使用全局 iteration、真实令牌池，并拆分首次、重复、鉴权失败和风控拒绝的场景指标。

上线前确认：

*   业务日、迟到请求和补签规则已确认；
*   `uid_index` 不复用，缓存未命中路径已压测；
*   Lua 全部 Key 在同一 Cluster Slot；
*   streak Hash 的真实内存已压测并有长期不活跃治理；
*   Stream 裁剪水位覆盖故障窗口，且有告警；
*   Dispatcher 有消费组、批量发送、异步 ACK、Pending 回收和 DB 扫描兜底；
*   奖励以独立 `awardBizId` 和 DB 唯一索引幂等；
*   Command、签到 Ledger、积分 Ledger 有自动对账与补偿；
*   高峰前扩容和 Redis/Kafka/MySQL 下游容量已演练。

* * *

## 18. 总结

一个可发布、可运行的签到方案不应停留在"Redis `SETBIT` + `BITCOUNT`"。它需要把边界说清楚：

```
首次热状态判定：Redis Lua
业务命令恢复锚点：Command Outbox
低延迟投递：Redis Stream + Dispatcher
最终事件传输：Kafka
签到和奖励事实：各自 Ledger + 唯一业务键
故障恢复：对账、补偿、从权威账本重建 Redis
高峰稳定性：预扩容、限流、超时预算、压测演练
```

当团队能回答"Redis 成功而应用崩溃怎么办""Stream 被裁剪怎么办""零点请求乱序怎么办""第 7 天到底发几笔奖励""Kafka 中断 20 分钟后如何补账"，这个签到系统才真正从 Demo 走到了生产。
