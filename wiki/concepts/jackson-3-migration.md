---
id: wiki-concept-jackson-3-migration
type: concept
title: Jackson 3 迁移
status: active
created: 2026-11-11
updated: 2026-11-11
confidence: medium
tags:
  - concept
  - jackson
  - spring-boot
sources:
  - raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md
related:
  - wiki/concepts/spring-boot-major-upgrade.md
  - wiki/entities/bizbuddy.md
  - wiki/sources/2026-11-01-enterprise-rag-platform-langgraph-mcp.md
---

# Jackson 3 迁移

## Definition（定义）

Spring Boot 4 下 Jackson 2 → Jackson 3 的迁移实践集合，源自 BizBuddy 升级案例：映射器不可变 builder、自定义序列化器签名变更、Redis（Redisson）codec 替换、默认类型信息校验收紧，以及 Jackson 2/3 并存的边界处理。

## Why It Matters（为什么重要）

- Jackson 3 是 Spring Boot 4 升级四类改动中的大头，坑集中在「编译能过、运行才炸」的场景（Redisson codec、缓存 key 前缀）。
- 注解包未变而 databind 包改名，全局替换易误伤注解包，是高频操作坑。
- 并存策略（框架适配层留 Jackson 2、边界字符串传）是第三方框架尚未跟进 Jackson 3 时的通用解法。

## Core Characteristics（核心特征）

1. 映射器：`new ObjectMapper()` + 到处 `configure` → builder 产出不可变 `JsonMapper`；案例做法是容器共享同一实例（Web 线程、boundedElastic、定时任务共用），运行时不可改配置。
2. 自定义序列化器：父类搬到 `ser.jdk`，第三参 `SerializerProvider` → `SerializationContext`；重写 `serializeWithType` 或直接调 `provider.defaultSerializeValue` 的地方需逐个对签名。
3. Redis 最隐蔽：Redisson 4.x 才有 `TypedJsonJackson3Codec`，选错编译不报错，读缓存时才抛类型转换异常。
4. `activateDefaultTyping` 必须显式给校验器；`LaissezFaireSubTypeValidator` 已不对外开放。
5. 默认类型信息把全类名写进缓存：类搬家后旧 key 反序列化抛 `ClassNotFoundException`，换一版 key 前缀解决。
6. 注解包不变：`@JsonIgnore`/`@JsonProperty` 仍在 `com.fasterxml.jackson.annotation`；IDE 全局替换只针对 `com.fasterxml.jackson.databind`。
7. 并存边界：SDK DTO 不交给全局 JsonMapper，边界处字符串传、各自解析；漏改判断标准 = 业务代码出现 `com.fasterxml.jackson.databind`（注解包出现正常）。

## Structure（结构）

迁移对照表（基于 BizBuddy 案例）：

| 层 | Jackson 2 | Jackson 3 | 坑 |
|---|---|---|---|
| 映射器 | `new ObjectMapper()` + configure | builder 产出不可变 `JsonMapper` | — |
| 序列化器 | `serialize(value, gen, SerializerProvider)` | 父类 `ser.jdk`、`SerializationContext` | `serializeWithType`/`defaultSerializeValue` 逐个对签名 |
| Redis | Redisson 旧版 codec | Redisson 4.x `TypedJsonJackson3Codec` | 选错编译不报错、读缓存才炸 |
| 默认类型信息 | `activateDefaultTyping` | 必须显式校验器 | `LaissezFaireSubTypeValidator` 不再对外开放 |
| 缓存 key | 全类名写入 key | 类搬家后旧 key 反序列化失败 | 换 key 前缀 |
| 注解 | `com.fasterxml.jackson.annotation` | 同包不变 | 全局替换易误伤注解包 |

## How It Works（运作方式）

迁移步骤（解读，按原文归并）：

1. import 全局替换只针对 `com.fasterxml.jackson.databind`（注解包保持不动）。
2. 映射器改为取容器 `JsonMapper`，移除运行时 configure。
3. 逐个修复自定义序列化器签名（父类、第三参）。
4. Redis codec 换 Redisson 4.x `TypedJsonJackson3Codec`，缓存 key 换前缀。
5. 搜索残留 `com.fasterxml.jackson.databind` 做边界裁决：框架适配层（AgentScope、飞书回调等）属故意保留；业务代码出现属漏改。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-boot-major-upgrade]] — Jackson 3 是大版本升级四类改动中的大头

### Dependencies（依赖项）

- 无

### Distinctions（区分）

- 与 Jackson 2 的核心区分：注解包 `com.fasterxml.jackson.annotation` 不变，只有 databind 包改名并伴生 mapper/序列化器/校验器的行为变化。

## Evolution（演进）

- 2026-11-11 — BizBuddy 案例给出首份完整坑位清单（首信源）。
- 企业级 RAG 平台信源提及「Spring Boot 4.0.8 默认 Jackson3 高频踩坑」，与本页互证（第二信源，细节未记录）（[[2026-11-01-enterprise-rag-platform-langgraph-mcp]]）。

## Open Questions（开放问题）

- Redisson 生态是否还有 Jackson 3 兼容 codec 的其他选择：本信源未覆盖。
- Jackson 2/3 并存边界能否进一步形式化（如模块级依赖隔离）：本信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-11-spring-boot-4-agent-platform-migration.md`

## Related Knowledge（相关知识）

- [[spring-boot-major-upgrade]]
- [[bizbuddy]]
