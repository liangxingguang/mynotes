---
id: wiki-concept-spring-boot-major-upgrade
type: concept
title: Spring Boot 大版本升级方法论
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: medium
tags:
  - concept
  - spring-boot
  - migration
sources:
  - raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md
related:
  - wiki/concepts/jackson-3-migration.md
  - wiki/entities/bizbuddy.md
  - wiki/concepts/virtual-threads-production.md
---

# Spring Boot 大版本升级方法论

## Definition（定义）

大 Spring Boot 项目（如 3.x → 4.x）主版本升级的结构化迁移方法，源自 BizBuddy 团队迁移实践：实际代码改动限定在少数几类（Jackson 3、starter 拆分、JSpecify 空安全注解、第三方依赖 Boot 4 专用坐标），其余工作是「证明升级后行为没变」的验证工程。

## Why It Matters（为什么重要）

- 大版本升级的成本大头不是写代码而是验证：案例中改代码约三成、验证约七成，升级预算应按此结构分账。
- Spring Boot 4 的 starter 改名、自动配置包搬家、Jackson 3 是所有升级项目的共同面，坑清单可复用。
- 验证方法（多层 e2e 回归、双栈用例、容器日志核对）对任何大型 Java 项目主版本升级都适用。

## Core Characteristics（核心特征）

1. 改动分类收敛：真正要改的只有四类——Jackson 3、starter 拆分/改名、JSpecify 空安全注解、第三方依赖的 Boot 4 专用坐标。
2. starter 改名与包名搬家是最直观的一层：`spring-boot-starter-json`→`spring-boot-starter-jackson`、`spring-boot-starter-aop`→`spring-boot-starter-aspectj`；Jackson 自动配置 `boot.autoconfigure.jackson`→`boot.jackson.autoconfigure`，Web→`boot.webmvc.autoconfigure`；Flyway 获得官方 starter。
3. Jackson 3 是大头，坑集中在「编译能过、运行才炸」的场景（详见 [[jackson-3-migration]]）。
4. 换不掉的地方不硬换：框架适配层（AgentScope、飞书长连接回调等）保留 Jackson 2，边界处字符串传、各自解析。
5. 验证靠 e2e 而非单测打桩：单测全打桩只能证明逻辑对，证明不了装配对。
6. 能启动只是第一道门禁：第三方依赖的隐性假设（如 LiteFlow 依赖字节码带 -parameters）只在容器启动那几秒暴露。

## Structure（结构）

迁移工作分解（基于 BizBuddy 案例）：

| 类别 | 内容 | 风险（解读） |
|---|---|---|
| Jackson 3 | JsonMapper builder、序列化器签名、Redis codec、默认类型信息校验、缓存 key 前缀 | 高 |
| starter 拆分 | starter 改名、Flyway 官方 starter、自动配置包搬家 | 低 |
| JSpecify | 空安全注解迁移（原文未给细节） | 未知 |
| 第三方坐标 | Redisson 4.x 等 Boot 4 专用坐标、启动门禁 | 中高 |
| 验证 | 多层 HTTP e2e、UI 用例、PG/MySQL 双栈、容器日志 ERROR 核对 | — |

## How It Works（运作方式）

迁移流程（解读，按原文叙述顺序归并）：

1. 先立改动清单：四类改动逐项列明（Jackson 3、starter、JSpecify、第三方坐标）。
2. 全局替换 starter 与包名——注意注解包 `com.fasterxml.jackson.annotation` 不变，只换 `com.fasterxml.jackson.databind`。
3. 迁移 Jackson 3：映射器、自定义序列化器、Redis codec、缓存 key 前缀。
4. 逐一排掉第三方依赖启动失败（案例：LiteFlow 关 `liteflow.metrics.enabled`）。
5. e2e 回归：HTTP 逐层跑真实接口、UI 用例按栈各跑一遍、最后核对容器日志 ERROR 数量。
6. 记录取舍：未切换项保持原状（虚拟线程关、`starter-web` 弃用但保留），不照抄默认配置。

## Relationships（关系）

### Related Concepts（相关概念）

- [[jackson-3-migration]] — 四类改动中风险最高的一类，独立成页
- [[virtual-threads-production]] — 案例明确虚拟线程仍关：SSE 长连接占任务槽位，`threads.max` 并发数不能照抄

### Dependencies（依赖项）

- 无

### Distinctions（区分）

- 解读：与泛化的遗留系统迁移策略（如 [[framework-first-migration]]）相比，本页聚焦「框架主版本升级」的工程实践层，目标是行为不变的验证，不涉及业务架构重构。

## Evolution（演进）

- 2026-11-11 — BizBuddy 团队发布 Spring Boot 3.5→4.1.1 迁移经验（首信源，微信公众号）。
- 企业级 RAG 平台信源亦提及「Spring Boot 4.0.8 默认 Jackson3 高频踩坑」，与本页「Jackson 3 是大头」互证（[[2026-11-01-enterprise-rag-platform-langgraph-mcp]]，细节未展开）。

## Open Questions（开放问题）

- JSpecify 空安全注解一类的具体改动：本信源未覆盖。
- 「多层 HTTP e2e 作为主要验证」在非 HTTP 架构（如消息驱动）中的适用边界：未验证。
- 「七成时间在验证」的占比在不同规模项目间的普适性：作者自述，无独立测量。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md`

## Related Knowledge（相关知识）

- [[bizbuddy]]
- [[jackson-3-migration]]
