---
id: 2026-10-21-scg-traceid-full-chain
title: Spring Cloud Gateway 全链路 traceId 传递方案
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/pcDs7bKa75MSLcpHUY3W1g
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [spring gateway, spring, 工程实践]
asset_ref: Assets/2026/10/scg-traceid-full-chain.md
wiki_status: ingested
---

# Spring Cloud Gateway 全链路 traceId 传递方案

> SCG 基于 WebFlux 响应式，请求处理不绑定固定线程，传统 ThreadLocal+MDC 方案直接失效——这是照搬 Servlet 写法导致 traceId 时有时无的根因。正解：GlobalFilter 中用 **Reactor Context** 作载体（contextWrite 写入 / deferContextual 读取），靠 **doOnEach 钩子**在每个信号发出时同步 MDC 保证日志稳定打印，**doFinally 清除**防线程复用串号；经 request.mutate() 透传 X-Trace-Id 请求头并写响应头返给前端。下游 Servlet 用 Filter+MDC、WebFlux 用 WebFilter+Context；异步靠 TaskDecorator/Runnable 包装；MQ 走消息属性。附与 Sleuth/SkyWalking 的选型对比。

## 核心要点

- **失效根因**：Servlet 一请求一线程所以 ThreadLocal 稳定；WebFlux 同请求跨多线程切换，MDC 必然时有时无
- **网关三板斧**：contextWrite 写 Reactor Context（跟流走不跟线程）→ doOnEach 同步 MDC（日志打印那一刻必有值）→ doFinally 清除（防串号）
- **请求不可变**：SCG 中改请求头必须 request.mutate() 新建再 exchange.mutate() 替换
- **透传全链**：下游 RestTemplate 加 ClientHttpRequestInterceptor、WebClient 加 filter 从 MDC 取 traceId 放请求头；WebFlux 服务调 WebClient 应从 Context 而非 MDC 读
- **异步三坑**：@Async 用 TaskDecorator、手动线程池包装 Runnable、MQ 用消息属性携带，消费端取出放 MDC 且 finally 清除
- **选型**：简单场景手动实现（轻量可控）；Spring Cloud 生态上 Sleuth+Zipkin；中大型要拓扑与性能分析上 SkyWalking（Agent 无侵入）；混合方案=SkyWalking 追踪 + 网关自生成 traceId 返给前端用于检索

## 正文

全文（含 GlobalFilter/WebFilter/拦截器完整代码与 logback 配置）见 [[Assets/2026/10/scg-traceid-full-chain]]。

## 来源

[Spring Cloud Gateway 全链路 traceId 传递方案](https://mp.weixin.qq.com/s/pcDs7bKa75MSLcpHUY3W1g)

## 附件

- [[Assets/2026/10/scg-traceid-full-chain]]
