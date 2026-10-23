---
id: wiki-source-springboot-global-exception-handling
type: source
title: Spring Boot 3.x 全局异常处理最佳实践：从入门到生产级方案
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - java
  - spring
  - engineering-practice
sources:
  - raw/sources/architecture/2026-10-23-springboot-global-exception-handling.md
related:
  - wiki/sources/springboot-structured-logging.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring Boot 3.x 全局异常处理最佳实践：从入门到生产级方案

## Overview（概览）

微信公众号教程：用 `@RestControllerAdvice` + `@ExceptionHandler` 一处配置全局生效，分基础/进阶/生产三级替代 Controller 散落的 try-catch，并给出五个高频坑。

## Key Facts（关键事实）

- **基础三件套**：统一响应类 `R<T>`（code/msg/data + ok/fail 静态工厂）、自定义 `BusinessException`（带 code）、`@RestControllerAdvice` 全局处理器（`@ExceptionHandler(BusinessException.class)` warn 级、`@ExceptionHandler(Exception.class)` 兜底 error 级）；Controller 直接抛异常不写 try-catch。`@RestControllerAdvice` 自 Spring 3.2 起提供。
- **进阶场景**：参数校验 `MethodArgumentNotValidException`、缺参 `MissingServletRequestParameterException`、405 方法不允许；404 需配 `throw-exception-if-no-handler-found: true` + `add-mappings: false` 才会进处理器。
- **生产级**：异常码枚举 `ResultCode` 消灭魔法值；`Assert.notNull/isTrue` 断言工具一行抛异常。
- **五个坑**：① 处理器类须在启动类扫描包内；② 多处理器匹配最具体异常优先；③ 处理器内不能再抛异常；④ 日志必须 `log.error(msg, e)` 打完整堆栈；⑤ 禁止空 catch 吞异常。

## Important Claims（重要论断）

### Claim 1：全局异常处理 = 一处配置、全局生效、统一格式

散写 try-catch 的四个代价——代码冗余、格式不一、难维护、无法捕获框架级异常——由集中式 Advice 一次性解决（信源立场，与 Spring 官方推荐一致）。

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- Spring Boot（3.x 语境，教程文不立页）

## Implications（影响／启示）

- "异常码枚举+统一响应体"是 API 契约治理的最小落地；与 [[springboot-structured-logging]] 的"日志必须带完整堆栈+traceId"配套构成错误可观测闭环（解读）。

## Limitations（局限）

- 教程文，代码为最小示例；未覆盖响应码与 HTTP status 的映射争议、WebFlux 差异。

## Related Knowledge（相关知识）

- [[springboot-structured-logging|SpringBoot 结构化日志实战（信源页）]]（异常堆栈入 JSON 日志的下游）
- [[spring-20-extension-points|Spring 20 个扩展点（信源页）]]（同生态机制索引）

## Source（信源）

- `raw/sources/architecture/2026-10-23-springboot-global-exception-handling.md`
