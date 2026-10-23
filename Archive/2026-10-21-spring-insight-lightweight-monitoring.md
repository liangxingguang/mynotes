---
id: 2026-10-21-spring-insight-lightweight-monitoring
title: 轻量级 Spring 监测工具——Spring Insight 正式发布
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/ULrVnGzWaGv-Ypx3ROyGAQ
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [spring, 工具, 分布式系统]
asset_ref: Assets/2026/10/spring-insight-lightweight-monitoring.md
wiki_status: ingested
---

# 轻量级 Spring 监测工具——Spring Insight 正式发布

> 面向中小项目/本地联调的轻量 Spring 链路追踪工具，0.1.0 已发 Maven Central + GHCR 镜像。只回答三件事：谁调了谁、耗时卡在哪、哪里报错了。业务侧加一个 Starter、Docker 起一个监测中心（:9966），浏览器直接看拓扑和链路。明确不替代 SkyWalking/OTel——没有采样/告警/鉴权/多租户，存储仅内存或 JSON 文件。覆盖 Servlet MVC、OpenFeign、WebFlux/WebClient、Gateway 及线程池 Trace 透传，可选导出指标给 Micrometer/Prometheus。

## 核心要点

- **定位**：Sleuth+Zipkin 同思路的现代轻量替代——库负责埋点、独立 Server 负责存和看；跨服务拓扑必须有共用汇聚点，所以不能纯进程内嵌入
- **两步接入**：`docker run ghcr.io/iweidujiang/spring-insight-server:0.1.0` 起中心 + 引入 `spring-insight-agent-starter`（Boot2.7/Java8 有 `-boot2` 兼容线），配 `spring.insight.server-url`
- **四个视图**：仪表盘（慢/错摘要）→ 服务拓扑（边带调用次数，可下钻）→ Trace 瀑布时间线 → 错误分析收口
- **异步批量上报**：造几笔跨服务调用等几秒刷新即可见
- **与 Prometheus 分工**：链路/拓扑看 Insight，JVM/连接池/QPS 继续 Actuator + Micrometer
- **边界清晰**：存储轻量、无告警/鉴权/多租户——适合中小项目、课程作业、本地联调，不是生产级可观测平台

## 正文

全文（含 Docker/Maven 坐标、控制台截图说明、发布踩坑记录）见 [[Assets/2026/10/spring-insight-lightweight-monitoring]]。

## 来源

[轻量级 Spring 监测工具——Spring Insight 正式发布](https://mp.weixin.qq.com/s/ULrVnGzWaGv-Ypx3ROyGAQ)

## 附件

- [[Assets/2026/10/spring-insight-lightweight-monitoring]]
