---
id: wiki-entity-arthas
type: entity
title: Arthas
status: active
created: 2026-10-17
updated: 2026-10-30
confidence: high
tags:
  - entity
  - java
  - diagnostics
  - mcp
sources:
  - raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md
  - raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md
  - raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md
related:
  - wiki/concepts/mcp.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# Arthas

## Overview（概览）

Arthas 是 Java 线上诊断工具，提供 dashboard、thread、trace、watch、heapdump 等诊断命令。4.3.5 版本（截至 2026-10）官方文档把 MCP Server 标为实验性模块，使诊断能力可作为标准工具被 AI 客户端发现与调用。

## Identity（身份信息）

- Type（类型）: Java 诊断工具（含 MCP Server 实验性模块）
- Organization（所属组织）: 当前信源未确立
- Role（角色）: JVM 运行时诊断（线程、内存、类加载、方法追踪、堆转储）
- Status（状态）: 活跃维护（4.3.5，2026-10）

## Important Facts（重要事实）

- MCP Server（实验性）：通过 HTTP/Netty 提供 JSON-RPC 2.0 接口，Streamable HTTP 传输（保留会话状态，适合持续输出命令），亦支持 STATELESS 模式；截至 2026-10 官方文档列出 29 个工具。
- 开启方式：arthas.properties 配置 `arthas.mcpEndpoint=/mcp`、`arthas.mcpProtocol=STREAMABLE`、`arthas.password`；HTTP 默认端口 8563；客户端以 streamableHttp + Bearer Token 接入。
- 命令风险谱系：观察型（dashboard/jvm/memory/thread/sc/sm/jad）只读；增强型（trace/watch/monitor/stack/tt）需字节码增强，范围过大或表达式过重会影响线上应用，参数返回值可能含敏感数据；状态修改型（ognl/vmtool/sysprop/vmoption/options/mc/redefine/retransform）可改运行参数、执行表达式、强制 GC、中断线程、改已加载类；heapdump 文件大、开销高。
- 官方安全能力仅密码认证与 viewfile 目录白名单，无工具级 RBAC；工具级管控需在 MCP 客户端、代理或网关层另加。

## Products / Projects（产品／项目）

- Arthas MCP Server（4.3.5 起，实验性模块）

## Relationships（关系）

- [[mcp|MCP]]：Arthas 经 MCP Server 把诊断命令暴露为 AI 可调用的标准工具，是 MCP"工具发现+链式调用"的落地案例。

## Timeline（时间线）

- 2026-10（信源时点）— 4.3.5：官方文档将 MCP Server 标为实验性模块，列出 29 个工具
- 2026-10-21 — 第二信源（GC 排查实战）补充人工诊断侧实践：dashboard/jvm/memory 看全局与趋势、heapdump --live、classloader 对比法查类泄漏（Spring Boot 参考 5000-20000 类、Metaspace 50-120MB）、stack/sc 定位加载源；并把"现象→根因→处置"整理成 FGC 五步决策树
- 2026-10-28 — 第三信源（五类线上事故实战）补充 trace 逐层剥超时（正常 102ms vs 慢请求 queryData 占 96.32%）、watch 抓入参返回值确认场景、`thread -b` 一句话定位阻塞源（持 ReentrantLock 阻塞 5 线程）、dashboard 实时看内存区域；并提示 Arthas 常驻有额外性能开销，用完需 `stop`

## Current Understanding（当前认知）

Java 排障领域接入 AI 的代表性路径：把诊断命令封装为 MCP 工具后，AI 可保留上下文组织多步诊断；但危险命令管控、字节码增强开销与敏感数据保护都需在 Arthas 之外自建。第二信源显示人工侧同样成熟——Full GC 排查已沉淀为 dashboard→根因表→dump/类加载分支→验证 的固定流程，与 [[evidence-first-jvm-tuning]] 的证据驱动方法论一致（两个独立信源，MCP 模块仍处实验阶段）。

## Evidence（证据）

- `raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md`
- `raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md`（人工诊断实战：FGC 七步排查法）
- `raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md`（人工诊断实战：trace/watch/thread -b 五场景）
