---
id: wiki-concept-reactive-tracing-context
type: concept
title: 响应式环境的全链路 traceId 传递
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - spring
  - 链路追踪
sources:
  - raw/sources/architecture/2026-10-21-scg-traceid-full-chain.md
related:
  - wiki/sources/scg-traceid-full-chain.md
---
# 响应式环境的全链路 traceId 传递

## Definition（定义）

在 WebFlux/Reactor 响应式微服务中，以 Reactor Context（绑定响应式流而非线程）作为 traceId 的传递载体，配合 MDC 钩子同步与服务间请求头透传，实现从网关到下游服务、异步任务、MQ 的全链路日志关联机制。

## Why It Matters（为什么重要）

Servlet 时代「Filter + ThreadLocal + MDC」的方案依赖一请求一线程；响应式环境下同一请求跨多线程切换，ThreadLocal 直接失效，照搬旧写法导致 traceId 时有时无、链路断裂。微服务排障效率取决于能否用一个 traceId 串联所有服务的日志。

## Core Characteristics（核心特征）

1. **载体替换**：Reactor Context 跟流走不跟线程，`contextWrite` 写入、`deferContextual` 读取。
2. **MDC 只做日志同步点**：`doOnEach` 钩子在每个信号发出时 `MDC.put`（保证打印那一刻有值），`doFinally` 清除（防线程池复用串号）。
3. **三类传递路径都要覆盖**：同步 HTTP（`X-Trace-Id` 请求头，网关 `request.mutate()` 改写）、异步线程（TaskDecorator / Runnable 包装）、MQ（消息属性携带，消费端取出放 MDC）。
4. **闭环到前端**：网关把 traceId 写响应头，前端报错可带 traceId 直接检索。

## How It Works（运作方式）

1. 网关 GlobalFilter：取/生成 traceId → 写入 Reactor Context → mutate 请求头透传 → 响应头返回 → doOnEach 同步 MDC → doFinally 清除。
2. 下游服务：Servlet 用 Filter+MDC，WebFlux 用 WebFilter+Context（同三板斧）。
3. 服务间调用：RestTemplate 加 ClientHttpRequestInterceptor、WebClient 加 filter 从 MDC（或 Context）取 traceId 放请求头。
4. 异步与 MQ：TaskDecorator/包装 Runnable 传递 MDC；MQ 走消息属性。

## Relationships（关系）

### Distinctions（区分）

- 与 Servlet ThreadLocal 方案的区别：载体从线程绑定改为流绑定；MDC 从「全程有效」降级为「信号时刻同步」。
- 与 Sleuth/SkyWalking 的区别：手动实现轻量可控但无可视化；Sleuth 依赖级侵入配 Zipkin；SkyWalking Agent 无侵入自带 UI。用了它们则不必自写过滤器，但自定义 traceId 格式或返给前端仍需定制。

## Open Questions（开放问题）

- 与 OpenTelemetry 标准（W3C traceparent）的整合方式，当前信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-21-scg-traceid-full-chain.md`

## Related Knowledge（相关知识）

- [[scg-traceid-full-chain|Spring Cloud Gateway 全链路 traceId 传递方案（信源页）]]
- [[spring-cloud-gateway-advanced|Spring Cloud Gateway 高级玩法]]
