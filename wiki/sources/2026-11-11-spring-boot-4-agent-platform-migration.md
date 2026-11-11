---
id: wiki-source-2026-11-11-spring-boot-4-agent-platform-migration
type: source
title: 40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: high
tags:
  - spring-boot
  - migration
  - agent-platform
sources:
  - raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md
related:
  - wiki/concepts/spring-boot-major-upgrade.md
  - wiki/concepts/jackson-3-migration.md
  - wiki/entities/bizbuddy.md
---

# 40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1

## Overview（概览）

BizBuddy 团队的微信公众号文章。自述把开源企业级 Agent 平台从 Spring Boot 3.5 升级到 4.1.1 的实战经验：真正要改的代码只有四类（Jackson 3、starter 拆分、JSpecify 空安全注解、第三方依赖的 Boot 4 专用坐标），剩下约七成时间花在验证上。覆盖 starter 改名与包名搬家、Jackson 3 的映射器/序列化器/Redis/默认类型信息坑、Jackson 2/3 并存边界、Flyway 双库迁移、LiteFlow 启动失败坑，以及 20 层 e2e 作为升级最值钱资产的验证方法。

## Key Facts（关键事实）

- 项目规模：40 张 ai\_\* 表、34 个功能页、98 个按钮权限、20 层 HTTP e2e + 18 条 Playwright UI 用例（原文自述）。
- 真正改动的只有四类：Jackson 3、starter 拆分、JSpecify 空安全注解、几个第三方依赖的 Boot 4 专用坐标；时间占比：改代码约三成、验证约七成。
- starter 改名：`spring-boot-starter-json`→`spring-boot-starter-jackson`、`spring-boot-starter-aop`→`spring-boot-starter-aspectj`；Flyway 有了官方 starter；Jackson 自动配置从 `boot.autoconfigure.jackson` 搬到 `boot.jackson.autoconfigure`，Web 搬到 `boot.webmvc.autoconfigure`。
- 注解包 `com.fasterxml.jackson.annotation` 未变；IDE 全局替换只应针对 `com.fasterxml.jackson.databind`，否则编译大面积失败且报错难定位。
- Jackson 3 要点：`ObjectMapper`→builder 产出不可变 `JsonMapper`（容器共享实例）；自定义序列化器父类搬到 `ser.jdk`、第三参 `SerializerProvider`→`SerializationContext`；Redisson 4.x 才有 `TypedJsonJackson3Codec`（选错编译不报错、读缓存才抛类型转换异常）；`activateDefaultTyping` 必须显式校验器，`LaissezFaireSubTypeValidator` 不再对外开放；类搬家后旧缓存 key 反序列化抛 `ClassNotFoundException`，换 key 前缀解决。
- 迁完后仍有 5 个文件依赖 Jackson 2（AgentScope 2.0.4 自身 compile 依赖 Jackson 2、渠道扩展入站映射器用 Jackson 2 JsonNode、飞书长连接回调签名是 Consumer），属故意保留；并存边界：SDK DTO 不交给全局 JsonMapper，边界处字符串传、各自解析；漏改判断标准 = 业务代码出现 `com.fasterxml.jackson.databind`（注解包出现正常）。
- Flyway：PG14 + MySQL8 双栈，`{vendor}` 自动选方言目录；空数据卷由建库脚本初始化，应用启动只登记 V1 基线；MySQL DDL 无事务，V2 建索引写成幂等（先查 information_schema.statistics，没有再动态执行）。
- LiteFlow 2.16.2.1 指标端点依赖 Actuator 反射提取参数名，字节码没带 `-parameters`，Boot 4 下 `PathMappedEndpoints` 初始化失败；项目未引入 micrometer，关掉 `liteflow.metrics.enabled` 解决。
- e2e 验证：20 层 HTTP 每层跑真实接口（L12 结构化决策闸门需本地桩，不起桩 SKIP）；18 条 Playwright 两套栈各跑一遍，PG/MySQL 均 20/0/0、UI 18/18；最后核对容器日志 ERROR 数量。
- 取舍：虚拟线程仍关（`spring.threads.virtual.enabled` 默认 false，Jetty `threads.max` 当并发任务数用，SSE 长连接占任务槽位不能照抄）；`spring-boot-starter-web` 在 4.x 已弃用、官方建议 `spring-boot-starter-webmvc`，作者暂不换。
- BizBuddy：全量开源（MIT）企业级智能体平台，Spring Boot 4.1.1 + AgentScope Java Harness，前端 RuoYi-Vue-Plus，PG14 + MySQL8 双栈交付；仓库 https://gitee.com/zl3624/biz-buddy。

## Important Claims（重要论断）

### 升大版本最贵的不是写代码，是证明没坏

改代码约三成，验证约七成：序列化结果对不对、缓存能不能读、两套库结构是否一致、20 层 e2e 有没有退化。

### 单测全打桩只能证明逻辑对，证明不了装配对

验证主要压在端到端上，20 层 e2e 是「这次升级最值钱的资产」；「能启动本身就是一道门禁」，很多依赖问题只在容器起来那几秒暴露。

### 有些地方换不掉，也不该硬换

Jackson 2/3 并存可接受，前提是划清边界：SDK DTO 不交给全局 JsonMapper，边界处字符串传、各自解析。

### 别等 Boot 5 再动

还停在 3.x 的项目，Jackson 2 的尾巴拖得越久，SDK 边界上扯不清的地方就越多（作者建议）。

## Concepts Introduced（引入的概念）

- [[spring-boot-major-upgrade]]
- [[jackson-3-migration]]

## Entities Mentioned（提及的实体）

- [[bizbuddy]]

## Implications（影响／启示）

- 解读：对大 Java/Spring 项目做大版本升级，多层 e2e 回归与双栈用例是可长期复用的资产；升级计划应把「验证预算」与代码改动预算分开评估。
- 解读：第三方依赖在大版本下可能因反射参数名等隐性假设启动失败，升级前的依赖扫描（字节码是否带 -parameters）值得纳入清单。

## Limitations（局限）

- 单一信源（微信公众号），无交叉验证；「七成时间在验证」为作者自述，无独立测量证据。
- JSpecify 空安全注解一类的改动只点名、无具体细节。
- 原文为第一人称经验总结，未给出完整迁移 checklist 与代码仓库对照链接之外的验收标准。

## Related Knowledge（相关知识）

- [[spring-boot-major-upgrade]]
- [[jackson-3-migration]]
- [[bizbuddy]]
- 企业级 RAG 平台信源页亦提及「Spring Boot 4.0.8 默认 Jackson3 高频踩坑」，与本文「Jackson 3 是大头」互证：[[2026-11-01-enterprise-rag-platform-langgraph-mcp]]

## Source（信源）

- `raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md`
