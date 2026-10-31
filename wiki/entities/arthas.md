---
id: wiki-entity-arthas
type: entity
title: Arthas
status: active
created: 2026-10-17
updated: 2026-10-31
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
  - raw/sources/ai/2026-10-31-arthas-mcp-server-ai-diagnosis.md
  - raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md
  - raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md
  - raw/sources/architecture/2026-10-31-arthas-03-thread-command.md
related:
  - wiki/concepts/mcp.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/thread-stack-reading.md
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
---
# Arthas

## Overview（概览）

Arthas 是 Java 线上诊断工具，提供 dashboard、thread、trace、watch、heapdump 等诊断命令。4.3.5 版本（截至 2026-10）官方文档把 MCP Server 标为实验性模块，使诊断能力可作为标准工具被 AI 客户端发现与调用。第四信源（2026-10-31 独立实测）给出量化对比：CPU 98% 排查传统 45 分钟 vs AI 驱动 5 分钟（作者实测均值区间，非官方基准）。第五至第七信源（2026-10-31 同专辑三篇）补齐人工侧入门（attach 两种方式与三类失败原因、6 命令速查、生产纪律）、贴文本模式 AI 协作四环节、thread 命令的线程栈读法（三种「卡」分类、读栈顺序、线程池耗尽识别）。

## Identity（身份信息）

- Type（类型）: Java 诊断工具（含 MCP Server 实验性模块）
- Organization（所属组织）: 当前信源未确立
- Role（角色）: JVM 运行时诊断（线程、内存、类加载、方法追踪、堆转储）
- Status（状态）: 活跃维护（4.3.5，2026-10）

## Important Facts（重要事实）

- MCP Server（实验性）：通过 HTTP/Netty 提供 JSON-RPC 2.0 接口，Streamable HTTP 传输（保留会话状态，适合持续输出命令），亦支持 STATELESS 模式；协议版本对齐 MCP `2025-06-18`（第四信源）；截至 2026-10 官方文档列出 29 个工具，分四类：JVM 与运行时 13（dashboard/thread/heapdump/memory/jvm/sysprop/sysenv/vmoption/perfcounter/vmtool/getstatic/ognl/mbean）、类与类加载器 8（sc/sm/jad/mc/redefine/retransform/dump/classloader）、监控与剖析 6（monitor/stack/trace/tt/watch/profiler）、辅助 2（options/viewfile）；支持 JDK 8+（含 17/21）。
- 开启方式：arthas.properties 配置 `arthas.mcpEndpoint=/mcp`、`arthas.mcpProtocol=STREAMABLE`、`arthas.password`；HTTP 默认端口 8563；客户端以 streamableHttp + Bearer Token 接入。可选 `arthas.sessionTimeout=1800` 会话超时自动断开；本地 IDEA 可装 arthas-workbench 插件解决进程重启导致 MCP 断连。
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
- 2026-10-31 — 第四信源（官方 MCP 实测，独立于前篇）补量化对比：CPU 98% 订单服务传统流程 45 分钟（含两次 OGNL 写错重来）vs AI 流程 5 分钟（thread → thread 29 → 读堆栈 → 人话结论+止血），根因为脱敏正则贪婪 `.*` 灾难性回溯（请求体 >10KB）；给出生产红线（watch 加 `-n`/`#cost` 过滤、redefine 只止血、端点设密码+绑定 127.0.0.1、工具调用审批、viewfile 白名单不放开）、六个坑速查表与上线 Checklist；成本账为示意口径（单次省 40 分钟、5 人团队年省约 9.2 万）
- 2026-10-31 — 第五信源（专辑《arthas使用》第 1 篇，入门）补 attach 侧实践：`java -jar arthas-boot.jar` 列进程输序号 / `--select <pid>` 两种方式、成功提示符 `[arthas@进程号]$`；挂不上三因（用户不一致、telnet 3658/web 8563 端口被占、JDK 太老依赖 attach API）；attach 本身造成极短停顿勿在峰值反复挂退；6 命令速查表（dashboard 排除方向 / thread / trace 必加 `-n` / watch `'{params,returnObj,throwExp}' -x 2` / jad·sc -d·sm 查代码版本 / profiler 出火焰图）；三参数细节（忘加次数限制、`-x` 深度先小后大、条件表达式写错不报错只是不输出）；`stop` 只退诊断工具不停业务进程但须先停挂起的 trace/watch/monitor；4 条生产纪律（测试环境先跑、热点别长挂 trace、redefine/retransform 慎用、操作留记录）
- 2026-10-31 — 第六信源（同专辑第 2 篇，AI 协作）确立贴文本模式 AI 排障四环节（现象选命令→读线程栈→写 watch/trace 表达式→结论变下一步分叉），前提先脱敏；三件不交给 AI（猜类名方法名、直贴生产完整输出、照抄 redefine/retransform）；核心分工「它负责翻译，你负责判断」，合理性判断只能来自业务认知
- 2026-10-31 — 第七信源（同专辑第 3 篇，thread 深读）补线程栈读法：三种「卡」分类（RUNNABLE 在算 / BLOCKED 等锁 / RUNNABLE 等外部响应），解法分别改代码、拆锁降并发、看下游；读栈顺序「状态→自己的包名→卡在等什么」；RUNNABLE 但 CPU 不高多半在等 IO；线程池耗尽识别（线程名成批、编号连片、停同一提交点，看总量分布，根因在下游）；三个误判（RUNNABLE≠在算、CPU 高可能是 GC 线程、一次采样不算持续需隔时二次采样）

## Current Understanding（当前认知）

Java 排障领域接入 AI 的代表性路径：把诊断命令封装为 MCP 工具后，AI 可保留上下文组织多步诊断；但危险命令管控、字节码增强开销与敏感数据保护都需在 Arthas 之外自建。第二信源显示人工侧同样成熟——Full GC 排查已沉淀为 dashboard→根因表→dump/类加载分支→验证 的固定流程，与 [[evidence-first-jvm-tuning]] 的证据驱动方法论一致。第四信源（独立实测）补上量化对比（45 分钟 vs 5 分钟，作者实测口径）并给出可复用的生产红线与 prompt 模板，与第一信源的危险能力分级互相印证（MCP 模块仍处实验阶段，量化数据非官方基准）。第五信源（入门）确立「学习成本在判断不在命令」与 6 命令速查的人工基线；第六信源确立贴文本模式 AI 协作的分工（它翻译、你判断，[[ai-assisted-troubleshooting-workflow]]）；第七信源把 thread 读栈沉淀为可复用方法论（[[thread-stack-reading]]），与第二、四信源的 thread 实战互证。人工侧与 AI 侧两条线均已成型，且共享同一组生产红线（测试环境先验证、危险命令慎用、操作留记录）。

## Evidence（证据）

- `raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md`
- `raw/sources/architecture/2026-10-21-jvm-gc-troubleshooting-arthas.md`（人工诊断实战：FGC 七步排查法）
- `raw/sources/architecture/2026-10-28-java-online-troubleshooting-arthas.md`（人工诊断实战：trace/watch/thread -b 五场景）
- `raw/sources/ai/2026-10-31-arthas-mcp-server-ai-diagnosis.md`（官方 MCP 实测：量化对比 45min vs 5min、生产红线、坑速查表与 Checklist）
- `raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md`（入门：attach 两种方式与三类失败原因、6 命令速查、三参数细节、退出清理、4 条生产纪律）
- `raw/sources/architecture/2026-10-31-arthas-02-ai-arthas.md`（AI 协作：贴文本模式四环节、三件不交给 AI、翻译/判断分工）
- `raw/sources/architecture/2026-10-31-arthas-03-thread-command.md`（thread 深读：三种「卡」、读栈顺序、线程池耗尽识别、三个误判）
