---
id: wiki-source-spring-insight-lightweight-monitoring
type: source
title: Spring Insight 0.1.0：轻量级 Spring 链路追踪——谁调用谁、慢在哪、哪里报错
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - spring
  - observability
  - tracing
  - java
sources:
  - raw/sources/architecture/2026-10-21-spring-insight-lightweight-monitoring.md
related:
  - wiki/sources/arthas-mcp-ai-troubleshooting.md
---
# Spring Insight 0.1.0：轻量级 Spring 链路追踪——谁调用谁、慢在哪、哪里报错

## Overview（概览）

个人开源项目（github.com/iweidujiang/spring-insight）的 0.1.0 发布介绍：一个专为 Spring 生态设计的轻量级链路追踪工具，回答三个问题——谁调用了谁、慢在哪里、哪里报错。作者明确定位**不是** SkyWalking / OpenTelemetry 的替代品，而是中小团队"想要调用链视图但不想部署一整套 APM"的折中方案。

## Key Facts（关键事实）

- 部署形态：服务端 Docker 一键启动，端口 9966；`STORAGE_MODE` 支持 file / memory 两种存储。
- 接入形态：Spring Boot 3 引 starter `io.github.iweidujiang:spring-insight-agent-starter:0.1.0`；Boot 2 用单独坐标 `0.1.0-boot2`。
- 覆盖范围：Servlet MVC、OpenFeign、WebFlux、WebClient、Spring Cloud Gateway，以及线程池场景的 traceId 透传。
- 可选 Micrometer 导出指标；跨服务拓扑需要独立部署的 server 端汇总。
- 当前缺口（作者自述）：无告警、无鉴权、无多租户；版本号自嘲"画饼到 0.1.0"。

## Important Claims（重要论断）

### Claim 1：轻量链路追踪与全量 APM 是不同赛道

对中小团队，部署 SkyWalking/OTel 全家桶的成本（Collector、存储、UI、运维）常常超过收益；一个只回答"谁调谁、慢在哪、哪报错"的单一组件能覆盖 80% 日常排查诉求（信源立场，解读：与 [[arthas-mcp-ai-troubleshooting]] 的"用对工具比堆工具重要"同向）。

## Concepts Introduced（引入的概念）

（无——定位为工程工具介绍，链路追踪本身为业界成熟概念，未立新页）

## Entities Mentioned（提及的实体）

- Spring Insight（0.1.0 个人项目，单一信源且作者自评早期，暂不立实体页）
- SkyWalking / OpenTelemetry（对照物）、Micrometer（指标导出）

## Implications（影响／启示）

- 可观测性选型存在"轻量派"空间：单组件、文件存储、starter 接入即可用（解读）。
- 线程池 traceId 透传是这类工具最容易翻车也最能体现实力的点，该信源声称已覆盖（信源陈述，未验证）。

## Limitations（局限）

- 0.1.0 个人项目，无生产案例佐证；无告警/鉴权/多租户，暂不具备团队级落地条件。

## Related Knowledge（相关知识）

- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas]]（Java 诊断工具的另一条路线：单点深挖 vs 链路视角）

## Source（信源）

- `raw/sources/architecture/2026-10-21-spring-insight-lightweight-monitoring.md`
