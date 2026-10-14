---
id: 2026-10-14-arthas-mcp-ai-troubleshooting
title: 让 AI 调 Arthas，Java 排障会快多少？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/tWBk2pgmO5fIU6Qfc2Jk9Q
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags: [AI, 工程实践]
---

# 让 AI 调 Arthas，Java 排障会快多少？

> Arthas 4.3.5（2026 年 10 月）官方把 MCP Server 标为实验性模块：通过 HTTP/Netty 暴露 JSON-RPC 2.0（Streamable HTTP），把 dashboard/thread/trace/watch/heapdump 等 29 个诊断命令变成 AI 可发现、可调用的标准工具。价值不在替你敲一条命令，而在 AI 能保留上一步输出、把多次诊断串成一条会话；但它不是"把线上 JVM 交给 AI 自动处理"——危险命令、字节码增强开销与敏感数据都需要外加管控。

## 核心要点

1. **接入方式**：服务端 `arthas.properties` 显式开启（`arthas.mcpEndpoint=/mcp`、`arthas.mcpProtocol=STREAMABLE`、设强密码），HTTP 默认端口 8563；AI 客户端配 streamableHttp 类型的 mcpServer，带 Bearer Token。STREAMABLE 保留会话状态（适合 watch/trace/monitor 持续输出），一次性查询可用 STATELESS。
2. **真正的变化**：不是 AI 突然懂了所有 JVM 问题，而是命令名、参数、返回结果被整理成标准工具接口——人描述目标（"找 CPU 最高线程并判断热点是否在业务方法"），AI 先调 thread 再按堆栈决定是否 sc/jad/trace；类名、方法名、业务含义仍需代码、日志或人提供。
3. **推荐排障链路**：第一轮限定"只观察"——JVM 概况→高 CPU/阻塞线程→结合日志和源码定位候选方法；热点落到具体方法（如 OrderService#createOrder）后才 trace 内部耗时，怀疑异常参数再用带条件和次数限制的 watch。任务约束要写明：只读诊断、不修改 JVM 参数和类定义；trace/watch/profiler/heapdump 前先说明范围、开销、停止条件；证据不足就停；禁 ognl/vmtool/redefine/retransform。
4. **危险能力分级（作者自定，非官方功能）**：①观察型 dashboard/jvm/memory/thread/sc/sm/jad 受控开放；②trace/watch/monitor/stack/tt/profiler/heapdump 需限类限方法限时长限输出规模、调用前确认（字节码增强有性能影响，参数返回值可能含账号订单等敏感数据，heapdump 文件大开销高）；③ognl/vmtool/sysprop/vmoption/options/mc/redefine/retransform 默认禁用、人工批准（可改运行参数、执行表达式、强制 GC、中断线程、改已加载类）。
5. **安全边界**：Bearer Token 只证明持有密码，不判断命令是否适合当前环境；官方只有密码认证与 viewfile 目录白名单，没有工具级 RBAC——需在支持工具过滤/人工确认的 MCP 客户端拦截，或自建代理/网关/诊断服务；8563 端口绝不能裸暴露公网。
6. **适用判断与接入顺序**：适合已有 Arthas 使用规范、只是排障步骤散在文档和个人经验里的团队，尤其预发/灰度环境；团队若连手工 watch/trace 的范围与停止条件都没定，接 MCP 只会让命令执行更快、结论不会更可靠，模型还可能被旧日志、错误类名带偏，产出"看似连贯但证据不足"的诊断链。保守路径：先选非核心应用、只开观察型工具、记录每次调用的参数/结果/耗时，稳定后再逐步放 trace/watch 并保留人工确认，状态修改类工具不进默认会话。

## 正文

文章从"接口延迟突升"的典型场景切入：命令不难敲，费时间的是把模糊现象拆成诊断步骤（先看线程还是内存、要不要追踪、类名怎么找、采样范围多大、看完结果下一条敲什么）。Arthas MCP 把这套经验变成工具发现与链式调用。

接入上，服务端三行配置开启 MCP 入口，客户端用 streamableHttp + Bearer Token 连接本机 8563；配置片段各客户端字段位置不同，不能原样照抄。

排障方法论上，作者强调把第一轮约束成纯观察并给了可直接粘贴的任务约束文本，防止"帮我看看为什么慢"从查线程一路滑到方法增强。危险能力方面逐一列出：sysprop/vmoption/options 改运行参数、ognl 执行表达式、vmtool 强制 GC/取实例/中断线程、redefine/retransform 改类；watch/trace/monitor/stack/tt 需字节码增强，范围过大或表达式过重会影响线上应用。权限控制明确标注是"Arthas 之外另加的调用策略"而非官方分级。

结论：MCP 减少的是命令查询与结果整理时间，适合规范成熟的团队和预发灰度环境；没有规范的团队应先补手工使用纪律，再谈 AI 接入。

相关笔记：[[2026-10-14-pi-secondary-dev-5-layers]]（MCP 属 Agent 外接系统层）、[[2026-10-14-jd-haibo-ai-knowledge-base]]。

## 来源

- 微信公众号：[让 AI 调 Arthas，Java 排障会快多少？](https://mp.weixin.qq.com/s/tWBk2pgmO5fIU6Qfc2Jk9Q)

## 附件

无
