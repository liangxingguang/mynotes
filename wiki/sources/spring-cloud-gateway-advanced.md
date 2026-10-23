---
id: wiki-source-spring-cloud-gateway-advanced
type: source
title: Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - java
  - spring-cloud
  - gateway
sources:
  - raw/sources/architecture/2026-10-20-spring-cloud-gateway-advanced.md
related:
  - wiki/sources/spring-20-extension-points.md
---
# Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案

## Overview（概览）

公众号教程文：Spring Cloud Gateway 四大生产能力的全套示例代码——数据库驱动的动态路由、全局过滤器请求日志（含请求体/响应体）、Redis/Sentinel 两路限流、请求头与用户标签两路灰度发布，外加 Prometheus 监控告警与性能/安全最佳实践。

## Key Facts（关键事实）

- 定位：Gateway 基于 Reactor 异步非阻塞，对比 Zuul 性能更优；支持 WebSocket、谓词+过滤器组合。
- 动态路由：RouteDefinitionWriter 增删路由 + 发布 RefreshRoutesEvent 刷新，路由规则落 `gateway_route` 表（predicates/filters 存 JSON），实现不重启改路由。
- 请求日志：自定义 GlobalFilter 记录请求/响应，body 需经缓存包装才能重复读取。
- 限流两路：① Redis + Lua 脚本原子计数（key=路由ID+客户端IP，超限返回 429 与 JSON 错误体）；② Sentinel GatewayFlowRule（阈值+时间窗+最大排队 1000ms）。
- 灰度两路：① 权重随机（如 user-service 20% 流量打 `X-Gray-Version: true` 头，支持请求头强制灰度）；② 用户标签（查用户 tag 含 gray 则打标路由）。
- 监控：Micrometer Counter/Timer/Gauge 三指标（请求总数、耗时、活跃数），Prometheus 告警示例——5xx 比例 >5% 持续 2 分钟告警、P95 延迟 >2s 告警。
- 最佳实践：Undertow io-threads 4 / worker-threads 20、启用 HTTP/2、httpclient 连接池 max-idle 30s / max-life 60s。

## Important Claims（重要论断）

（无承重论断；属方案汇编型教程。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- Spring Cloud Gateway / Sentinel / Prometheus（框架与组件，未立页）

## Implications（影响／启示）

- 「路由规则当数据存库 + 事件刷新」是把基础设施配置业务化的通用套路，与配置中心思路互补（解读）。
- 灰度的两种粒度（流量权重 vs 用户标签）分别对应「按比例放量」和「定向白名单」两类发布策略（解读）。

## Limitations（局限）

- 示例代码为教学简化版：getClientIp 返回固定值、token 解析用 hashCode 示意、灰度配置硬编码在内存 Map——生产需替换为真实实现（信源自承"简化实现"）。
- 代码块经抓取重排，细节以原文为准。

## Related Knowledge（相关知识）

- [[spring-20-extension-points|Spring 20 个扩展点（信源页）]]（GlobalFilter/Ordered 即 Gateway 的扩展点体系）

## Source（信源）

- `raw/sources/architecture/2026-10-20-spring-cloud-gateway-advanced.md`
