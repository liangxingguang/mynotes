---
id: inbox-20261111-2001
title: 40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/2wzVaKGTnsnNGmx3WpAhmQ
source_type: link
platform: wechat
created: 2026-11-11
category: 技术
tags:
  - java
  - Agent
asset_ref: Assets/2026-11/weixin-2wzva-spring-boot-4-1-migration.md
wiki_status: pending
---

# 40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1

> BizBuddy 团队分享将开源 Agent 平台从 Spring Boot 3.5 升级到 4.1.1 的实战经验：真正要改的只有四类（Jackson 3、starter 拆分、JSpecify 空安全、依赖坐标），其余七成时间都在验证。

## 核心要点

1. **starter 改名**：`spring-boot-starter-json`→`spring-boot-starter-jackson`、aop→aspectj；Flyway 有官方 starter；Jackson 自动配置包搬到 `boot.jackson.autoconfigure`
2. **Jackson 3 是大头**：`ObjectMapper` 不可变 builder 化；自定义序列化器父类搬到 `ser.jdk`、`serialize` 第三参变 `SerializationContext`；Redisson 4.x 才有 `TypedJsonJackson3Codec`，选错编译不报错、读缓存才炸；`activateDefaultTyping` 必须显式校验器
3. **注解包没变**：`@JsonIgnore` 等仍在 `com.fasterxml.jackson.annotation`，全局替换别把注解包一起换掉，只换 `databind`
4. **Jackson 2/3 并存可接受**：框架适配层（AgentScope、飞书长连接回调）硬换不划算，边界处用字符串传、各自解析
5. **Flyway 双库**：PG14 + MySQL8 双栈，`{vendor}` 自动选方言目录；MySQL DDL 无事务，建索引要幂等（查 information_schema）
6. **LiteFlow 坑**：2.16.2.1 指标端点依赖 Actuator 反射参数名、字节码缺 `-parameters`，Boot 4 下启动失败，关掉 `liteflow.metrics.enabled`
7. **e2e 是升级最值钱资产**：20 层 HTTP e2e + 18 条 Playwright，PG/MySQL 双栈全过；单测打桩证明不了装配正确
8. **取舍**：虚拟线程仍关（SSE 长连接占任务槽位）；`starter-web` 虽弃用但暂不换

## 正文

详见 [[Assets/2026-11/weixin-2wzva-spring-boot-4-1-migration.md]]（全文存档）。

## 来源

[40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1](https://mp.weixin.qq.com/s/2wzVaKGTnsnNGmx3WpAhmQ)

## 附件

[[Assets/2026-11/weixin-2wzva-spring-boot-4-1-migration.md]]
