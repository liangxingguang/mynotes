---
id: wiki-source-springboot-structured-logging
type: source
title: SpringBoot 结构化日志实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - java
  - spring
  - observability
sources:
  - raw/sources/architecture/2026-10-23-springboot-structured-logging.md
related:
  - wiki/sources/scg-traceid-full-chain.md
  - wiki/sources/spring-insight-lightweight-monitoring.md
  - wiki/concepts/reactive-tracing-context.md
---
# SpringBoot 结构化日志实战

## Overview（概览）

微信公众号实战文：Spring Boot 3.4 起内置结构化日志，两行配置把纯文本切为 JSON（ECS/Logstash 格式），MDC 字段自动入 JSON 与 traceId 打通，附自定义 Formatter 与落地建议。

## Key Facts（关键事实）

- **开箱即用**：Spring Boot 3.4+ `logging.structured.format.console: ecs` 即输出 JSON，无需第三方依赖；ECS 为 Elastic 通用 Schema 可直接进 ELK/OpenSearch；换 `logstash` 得另一套字段命名；文件输出把 `console` 改 `file`。
- **MDC 自动入 JSON**：MDC 键值对序列化为独立字段，配合 Micrometer Tracing 灌入 traceId，日志与调用链打通；**MDC 基于 ThreadLocal，线程池复用必须 `clear()`**（finally 或拦截器统一清理），否则串数据。
- **自定义格式**：实现 `StructuredLogFormatter<ILoggingEvent>` 声明为 Bean（`@Component`），Spring Boot 自动优先采用，可控字段名、异常堆栈与 MDC 输出，适配公司字段规范。
- **落地建议**：新老服务灰度切换；生产开 JSON、本地用 pattern 按 profile 区分；MDC 字段克制——只留 traceId、订单号、用户维度等过滤/关联所需的少数字段，控制日志体积。

## Important Claims（重要论断）

### Claim 1：结构化日志的价值在"按字段过滤聚合"而非格式本身

固定 JSON 字段让凌晨 grep 纯文本的排障方式变为按字段查询，traceId 等关联字段是核心收益（信源立场）。

## Concepts Introduced（引入的概念）

（无——ECS/MDC 为业界既有概念，未立新页）

## Entities Mentioned（提及的实体）

- Spring Boot（3.4+ 内置支持）、Elastic ECS、Micrometer Tracing（提及，不立页）

## Implications（影响／启示）

- MDC ThreadLocal 残留坑与 [[reactive-tracing-context]] 记录的"响应式下 ThreadLocal 上下文失效"是同一族上下文传递问题（解读）。

## Limitations（局限）

- 实战文，未给性能开销对比数据；ECS/Logstash 字段差异仅点到。

## Related Knowledge（相关知识）

- [[scg-traceid-full-chain|SCG 全链路 traceId 传递（信源页）]]（traceId 产生侧）
- [[spring-insight-lightweight-monitoring|Spring Insight 轻量链路追踪（信源页）]]（链路追踪互参）
- [[reactive-tracing-context|响应式追踪上下文（概念页）]]（ThreadLocal/MDC 上下文传递问题族）

## Source（信源）

- `raw/sources/architecture/2026-10-23-springboot-structured-logging.md`
