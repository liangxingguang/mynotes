---
id: wiki-source-business-risk-control-redis-lua-annotation
type: source
title: 业务风控组件设计：Redis+Lua 计数规则 + @Detect 注解 + SpEL 接入
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - risk-control
  - redis
  - kotlin
sources:
  - raw/sources/architecture/2026-10-21-business-risk-control-redis-lua-annotation.md
related:
  - wiki/sources/spring-cloud-gateway-advanced.md
---
# 业务风控组件设计：Redis+Lua 计数规则 + @Detect 注解 + SpEL 接入

## Overview（概览）

公众号文章（芋道源码转载掘金）：为 OCR、语音测评等"费钱"的 AI 能力自研业务风控——按业务维度（用户×事件）组合自然日/自然小时窗口计数，Redis+Lua 保证原子性，再用 Kotlin `@Detect` 注解 + AOP + SpEL 把风控接入成本降到一行注解。

## Key Facts（关键事实）

- 自研动因：业务风控需按业务维度组合多种时间窗口计数并支持实时调整限制值，开源通用风控不满足；限制值首次基本靠拍，后续调整并实时生效是刚需。
- 计数方案选型：MySQL+事务（可溯源但重）/ Redis+Lua（简单且 Lua 满足"事务"要求）/ 分布式锁（精确但复杂）——无精确计数与持久化需求，选 Redis+Lua。
- 关键坑：自然日+自然小时组合**不能单纯串联**——日通过而小时不通过时需回退，两个窗口都不能计入本次调用；Lua 脚本内对不满足的一侧 DECR 回退（信源自承写法粗糙，意在表达回退逻辑）。
- Lua 原子计数模式：GET→未超限 INCR / 已超限只读不增 / 不存在则 SET 1 并带 px 过期。
- 接入层：`@Detect(eventId, contentSpel)` 注解 + `@Around` 切面，SpEL 从方法参数解析出风控 content（参数注入上下文命名 arg1、arg2…），校验不过抛 OPERATION_TOO_FREQUENT；业务代码从显式调 detectManager 收敛为一行注解（作者承认注解方式"比较有争议"）。

## Important Claims（重要论断）

（无承重论断；属组件设计实录。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

（无）

## Implications（影响／启示）

- 多窗口组合计数的回退问题（部分通过需补偿）是风控/配额系统的通用陷阱，Lua 单脚本内回退是免分布式锁的轻量解法（解读）。
- "注解 + SpEL 提取业务参数"的接入模式与 [[spring-cloud-gateway-advanced]] 的 GlobalFilter 思路同属"横切关注点收口"（解读）。

## Limitations（局限）

- 回退 Lua 脚本作者自承"比较粗糙"；并发极端场景（回退与另一请求计数交错）的正确性未论证。
- 简化版代码，未含实时调整限制值的具体实现（配置下发/热更新）。

## Related Knowledge（相关知识）

- [[spring-cloud-gateway-advanced|Spring Cloud Gateway 高级玩法（信源页）]]（Redis+Lua 限流在网关层的对应物）

## Source（信源）

- `raw/sources/architecture/2026-10-21-business-risk-control-redis-lua-annotation.md`
