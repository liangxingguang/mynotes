---
id: wiki-source-scg-traceid-full-chain
type: source
title: Spring Cloud Gateway 全链路 traceId 传递方案
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - spring
  - 网关
  - 链路追踪
sources:
  - raw/sources/architecture/2026-10-21-scg-traceid-full-chain.md
related:
  - wiki/concepts/reactive-tracing-context.md
  - wiki/sources/spring-cloud-gateway-advanced.md
---
# Spring Cloud Gateway 全链路 traceId 传递方案

## Overview（概览）

面向 Spring Cloud Gateway 的全链路 traceId 落地方案：从「WebFlux 下 ThreadLocal+MDC 为何失效」讲起，给出网关、下游服务、服务间调用、异步与 MQ 全链路的完整代码，并附与 Sleuth/SkyWalking 的选型对比。

## Key Facts（关键事实）

- 失效根因：Servlet 一请求一线程所以 ThreadLocal 稳定；WebFlux 同一请求跨多线程切换，MDC（基于 ThreadLocal）必然时有时无
- 网关三板斧：`contextWrite` 写 Reactor Context（跟流走不跟线程）→ `doOnEach` 在每个信号发出时同步 MDC（保证日志打印那一刻必有值）→ `doFinally` 清除 MDC（防线程复用串号）
- SCG 中请求不可变：改请求头必须 `request.mutate()` 新建，再 `exchange.mutate().request(...).build()` 替换
- traceId 经 `X-Trace-Id` 请求头透传下游，并写响应头返给前端用于排查
- 异步三坑：`@Async` 用 TaskDecorator、手动线程池包装 Runnable、MQ 用消息属性携带（消费端取出放 MDC 且 finally 清除）
- WebFlux 服务内调 WebClient 应从 Reactor Context 而非 MDC 读 traceId

## Important Claims（重要论断）

### Claim 1：响应式环境的 traceId 载体必须是 Reactor Context 而非 ThreadLocal

Context 绑定响应式流（Subscriber）而非线程，线程切换不影响上下文传递；MDC 只作为日志打印的同步点，由 doOnEach 钩子保证。

### Claim 2：选型按规模分层

简单场景手动实现（轻量可控）；Spring Cloud 生态上 Sleuth+Zipkin；中大型需要拓扑与性能分析上 SkyWalking（Agent 无侵入）；混合方案 = SkyWalking 追踪 + 网关自生成 traceId 返给前端用于检索。

## Concepts Introduced（引入的概念）

- [[reactive-tracing-context|响应式环境的全链路 traceId 传递]]

## Entities Mentioned（提及的实体）

- Spring Cloud Gateway / Spring WebFlux / Reactor
- Spring Cloud Sleuth、Zipkin、SkyWalking
- RocketMQ（MQ 传递示例）

## Implications（影响／启示）

照搬 Servlet 写法是响应式微服务链路追踪失败的最常见原因；traceId 治理要覆盖同步、异步、MQ 三类路径并闭环到前端（响应头返回），否则链路必然断。

## Limitations（局限）

工程博客（三次内容），代码为示意级别（traceId 用 UUID 截断 16 位）；未涉及 OpenTelemetry 这一当前主流标准。

## Related Knowledge（相关知识）

- [[spring-cloud-gateway-advanced|Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案]]

## Source（信源）

- `raw/sources/architecture/2026-10-21-scg-traceid-full-chain.md`
