---
id: 2026-10-21-business-risk-control-redis-lua-annotation
title: 业务风控组件设计：Redis+Lua 计数规则 + @Detect 注解 + SpEL 接入
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/dbNxVwwHG9YxAE4oquGaSA
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [spring, Java, 工程实践]
asset_ref: Assets/2026/10/business-risk-control-redis-lua-annotation.md
wiki_status: ingested
---

# 业务风控组件设计：Redis+Lua 计数 + 注解接入

> 针对 AI 能力调用（OCR/语音测评等烧钱接口）的业务风控需求，自研轻量计数限流组件。计数选 Redis+Lua（脚本原子性替代事务，放弃精确计数与持久化换简单）；规则支持自然日、自然小时及二者组合——组合规则关键是**回退逻辑**：日通过但小时不通过时，两边计数都要 DECR 回退，不能各记各的。接入方式用 `@Detect(eventId, contentSpel)` 注解 + AOP 切面，SpEL 从方法参数（arg1/arg2…）解析出限流维度 content，业务代码零侵入。

## 核心要点

- **业务风控 vs 普通风控**：需按业务维度组合多时间窗口计数 + 限制值可实时调整，开源通用风控难满足，故自研
- **计数方案取舍**：mysql+事务（可溯源但重）/ redis+lua（原子性够、简单）/ 分布式事务（精确但复杂）——无持久化需求时选 redis+lua
- **组合窗口的核心陷阱**：自然日+自然小时不能串联两个独立判断，任一不通过另一个必须回退（lua 内 DECR），靠 lua 原子执行保证中间态不被并发打断
- **工程化接入**：DetectManager 统一入口 matchExceptionally 抛业务异常；注解 + SpEL（`#arg1` 取参）让限流维度声明在方法签名上
- **局限认知**：该方案是先计数后执行，失败调用也占额度；需精确"执行成功才计数"得上分布式锁/事务，代价大

## 正文

全文（含 lua 脚本与切面完整代码）见 [[Assets/2026/10/business-risk-control-redis-lua-annotation]]。

## 来源

[风控系统就该这么设计（万能通用），稳的一批！](https://mp.weixin.qq.com/s/dbNxVwwHG9YxAE4oquGaSA)

## 附件

- [[Assets/2026/10/business-risk-control-redis-lua-annotation]]
