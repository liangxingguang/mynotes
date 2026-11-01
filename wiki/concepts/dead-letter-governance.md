---
id: wiki-concept-dead-letter-governance
type: concept
title: 死信治理（Dead Letter Governance）
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: medium
tags:
  - concept
  - reliability
  - architecture
sources:
  - raw/sources/architecture/2026-11-01-spring-boot-webhook-delivery-platform.md
related:
  - wiki/concepts/retry-governance.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/idempotency-design.md
  - wiki/sources/2026-11-01-spring-boot-webhook-delivery-platform.md
---

# 死信治理（Dead Letter Governance）

## Definition（定义）

在异步投递/任务系统中，对"重试耗尽或永久失败"的任务进行系统性收容、归因、重放与归档的治理框架。核心主张：**死信不是垃圾桶，而是"等人工拍板"的队列**——每条死信都必须可归因、可重放、可审计，且重放次数有上限以防无限循环。与重试治理的边界：重试治理管"还有没有重试价值"，死信治理管"重试价值耗尽后怎么办"。

## Why It Matters（为什么重要）

如果死信只是被丢弃的失败记录，那么：①配置错误（如地址配错）会反复产生死信却无人归因；②重试耗尽的任务可能还有救（对方修复后可重放）但因无重放入口而永久丢失；③审计合规要求失败记录有保留期；④死信是系统健康度的领先指标——死信增速突增一定是某个订阅方出事了，但若无归因就无法定位。在大规模投递系统（如 2000+ 订阅方、峰值 8000 TPS）中，死信率 0.11% 意味着每天数百条需要人工关注，没有治理框架就是运营灾难。

## Core Characteristics（核心特征）

1. **死信是"等人工拍板"的队列，不是垃圾桶**：每条死信都有 reason 归因，支持人工重放，有保留期与归档策略。
2. **归因是治理的起点**：reason 区分失败类型（EXHAUSTED/PERMANENT_4XX/URL_INVALID/BREAKER_TIMEOUT），运营按应用聚合看 TOP 失败原因——数据驱动产品改进（如 78% 死信是地址配错，直接推动控制台加"保存前必验"）。
3. **重放必须有上限**：控制台批量重放重置 attempt_count，replay_count 加一，超过 3 次就不让再放了，防无限循环；重放后又失败会撞唯一约束，需用 `ON DUPLICATE KEY UPDATE` 刷新 reason 和 replay_status 但保留 replay_count。
4. **归档有保留期**：T+7 转冷存储，保留 180 天应付审计——死信是合规证据链的一部分。
5. **死信是系统健康度的领先指标**：死信增速突增一定是某个订阅方出事了，比成功率更早反映问题（成功率还没掉的时候死信已经开始涨了）。

## Structure（结构）

死信治理三件事的机制映射（信源默认策略，需按业务校准）：

| 治理动作 | 要回答的问题 | 主要机制 |
|---|---|---|
| 归因 | 为什么失败？ | reason 字段（EXHAUSTED/PERMANENT_4XX/URL_INVALID/BREAKER_TIMEOUT）+ 按应用聚合的 TOP 失败原因看板 |
| 重放 | 修复后能不能再投递？ | 控制台批量重放，重置 attempt_count、刷新 next_retry_at，replay_count+1，上限 3 次；`ON DUPLICATE KEY UPDATE` 处理重复写入 |
| 归档 | 审计需要保留多久？ | T+7 转冷存储，保留 180 天 |

死信写入时机：重试耗尽（attempt_count ≥ max_retry）、永久失败（400/404/405/422/3xx）、熔断挂起超时（defer 超 24h 或 200 次）。

## How It Works（运作方式）

**归因**：死信表的 reason 字段是归因的核心。四种 reason 对应不同的失败模式：EXHAUSTED（重试耗尽——退避曲线走完还没成功）、PERMANENT_4XX（对端拒绝——400/404/405/422，大多是订阅方参数配错）、URL_INVALID（地址非法——SSRF 校验拒绝或回调地址未通过保存前验证）、BREAKER_TIMEOUT（熔断挂太久——defer 闸触发）。运营按应用聚合看 TOP 失败原因——"78% 的死信属于地址配错，这个数字直接推着产品在控制台加了'保存前必验'"——归因数据驱动产品改进。

**重放**：控制台按应用或事件类型批量重放。重放逻辑：①查询死信记录（selectForUpdate 行锁）；②检查 replay_count ≥ 3 则拒绝（防无限循环）；③重置任务（status=0、attempt_count=0、next_retry_at=now）；④标记死信记录已重放（replay_status=1）；⑤发布 TaskReady 事件触发出队。重放后又失败再次落死信时会撞 `uk_task` 唯一约束，需用 `ON DUPLICATE KEY UPDATE` 把 reason 和 replay_status 刷回 0，但 replay_count 得保留——不然"最多重放 3 次"的限制就形同虚设。

**归档**：T+7 转冷存储，保留 180 天应付审计。归档后死信不再出现在运营看板，但保留可查（合规审计需要时可检索冷存储）。

**与重试治理的衔接**：重试治理决定"还有没有重试价值"（五边界：时间/次数/额度/并发/语义），死信治理接管"重试价值耗尽后"的任务。熔断期间任务不消耗重试次数但有 defer 闸（24h/200 次）——超闸直接转死信（reason=BREAKER_TIMEOUT），让人工来看。

## Relationships（关系）

### Related Concepts（相关概念）

- [[retry-governance|重试治理]]：重试治理管"额外工作"（时间/次数/额度/并发/语义五边界），死信治理管"重试价值耗尽后的收容"（归因/重放/归档）。两者是同一可靠性框架的两个阶段：重试是自动层，死信是人工层。
- [[durable-execution|持久执行]]：死信是持久执行的"终态收容"——任务尝试耗尽后的持久化记录，支持人工介入恢复。
- [[idempotency-design|幂等设计]]：重放的前提是幂等——重放后订阅方可能收到重复事件（之前已收到但响应超时），订阅方必须用 eventId 做幂等。

### Distinctions（区分）

- 与**简单失败日志**的区别：失败日志是"发生了什么"的记录，死信是"需要人工干预"的队列——死信有归因、可重放、有保留期，失败日志只是排查线索。
- 与**重试队列**的区别：重试队列是自动层（退避+抖动+重试次数），死信是人工层（归因+重放+归档）；重试队列的任务由系统自动处理，死信的任务必须由人工拍板。
- 与**消息队列死信主题（DLQ）**的区别：MQ 的 DLQ 是"消费失败后的消息投递到死信 Topic"，本概念是"任务级死信表"——后者有归因 reason、重放上限、归档保留期，是业务级的死信治理，不是 MQ 基础设施的死信路由。

## Evolution（演进）

- 2026-11-02：本页由单一信源（spring-boot-webhook-delivery-platform）建立。框架包含：死信是"等人工拍板"的队列（非垃圾桶）、归因/重放/归档三件事、reason 四种类型、重放上限 3 次、`ON DUPLICATE KEY UPDATE` 处理重复写入、T+7 归档 180 天、死信是系统健康度领先指标、78% 死信是地址配错驱动产品改进。confidence: medium——目前为单一信源，且文中数值明确声明为作者平台实例。

## Open Questions（开放问题）

- 死信归因的自动裁决：当前 reason 靠人工/规则归因，能否用 LLM 对失败样本做自动归因分类（如从 error_code + last_error 自动推断 PERMANENT_4XX vs URL_INVALID）？信源未涉及。
- 重放上限的校准：3 次是作者经验值，不同失败类型（地址配错 vs 对端 5xx 抖动）的合理上限可能不同。
- 归档保留期的合规差异：180 天是作者平台实例，不同行业（金融/医疗）的审计保留期要求不同。
- 死信与对账的衔接：每日对账兜底能否自动激活"业务侧有但台账里没有"的事件而不经过死信？信源给出补投入口但未讨论与死信表的交互。
- 多实例下的死信并发重放：selectForUpdate 行锁在多实例下的行为（锁超时、死锁）信源未讨论。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-01-spring-boot-webhook-delivery-platform.md`（死信是"等人工拍板"的队列、归因/重放/归档三件事、reason 四种类型、78% 死信是地址配错、重放上限 3 次、`ON DUPLICATE KEY UPDATE` 处理重复写入、T+7 归档 180 天、死信是领先指标、defer 闸防无限延期）

## Related Knowledge（相关知识）

- [[retry-governance|重试治理（概念页）]]
- [[durable-execution|持久执行（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[2026-11-01-spring-boot-webhook-delivery-platform|Spring Boot 构建可靠 Webhook 投递平台（信源页）]]
- [[agent-platform-retry-resilience|从重试风暴到可控恢复（信源页）]]
- [[async-task-system-design|异步任务系统怎么设计（信源页）]]
