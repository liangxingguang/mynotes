---
id: 2026-10-23-springboot-structured-logging
title: SpringBoot 结构化日志实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/0iAUApAJQCJKfn02SbbYOw
source_type: link
platform: weixin
created: 2026-10-23
category: 技术
tags: [spring, 工程实践, Java]
asset_ref: Assets/2026/10/springboot-structured-logging.md
wiki_status: ingested
---

# SpringBoot 结构化日志实战

> 结构化日志把每条日志输出为固定 JSON 字段，可直接按字段过滤聚合；Spring Boot 3.4 起内置支持，两行配置即可从纯文本切到 ECS/Logstash 格式。

## 核心要点

- **开箱即用**：Spring Boot 3.4+ 只需 `logging.structured.format.console: ecs` 即可输出 JSON，无需第三方依赖；换 `logstash` 得到另一套字段命名
- **MDC 自动入 JSON**：MDC 键值对自动序列化为独立字段，配合 Micrometer Tracing 灌入 traceId，日志与调用链打通；但 MDC 基于 ThreadLocal，线程池复用必须 `clear()`，否则串数据
- **可自定义格式**：实现 `StructuredLogFormatter<ILoggingEvent>` 并声明为 Bean，Spring Boot 自动接管，适配公司字段规范
- **落地建议**：新老服务灰度切换；生产开 JSON、本地用 pattern 按 profile 区分；MDC 字段只留过滤/关联所需的少数几个，控制日志体积

## 正文

文章从"凌晨三点 grep 纯文本日志"的痛点切入，介绍 Spring Boot 3.4 内置的结构化日志能力：

1. **两行配置切 JSON**：`logging.structured.format.console: ecs`（ECS 为 Elastic 通用 Schema，可直接进 ELK/OpenSearch）；文件输出把 `console` 改 `file`
2. **上下文注入**：MDC 中的 orderId、traceId 自动成为 JSON 独立字段，按字段过滤即可还原完整链路；注意 ThreadLocal 残留坑，需 finally 或拦截器统一清理
3. **自定义 Formatter**：实现 `StructuredLogFormatter` 接口注册为 `@Component` 即被优先采用，可自行控制字段名、异常堆栈与 MDC 输出
4. **实践建议**：灰度切换、profile 区分生产/本地、字段克制（只留 traceId、订单号、用户维度等关联字段）

详见 [[Assets/2026/10/springboot-structured-logging.md]]

## 来源

- [SpringBoot结构化日志实战（微信公众号）](https://mp.weixin.qq.com/s/0iAUApAJQCJKfn02SbbYOw)
- [Spring Boot 结构化日志官方文档](https://docs.spring.io/spring-boot/how-to/logging.html)

## 附件

- [[Assets/2026/10/springboot-structured-logging.md]]
