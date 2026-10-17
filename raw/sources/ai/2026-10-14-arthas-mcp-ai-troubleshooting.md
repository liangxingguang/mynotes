---
title: 让 AI 调 Arthas，Java 排障会快多少？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/tWBk2pgmO5fIU6Qfc2Jk9Q
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-17
inbox_ref: Archive/2026-10-14-arthas-mcp-ai-troubleshooting.md
---

# 让 AI 调 Arthas，Java 排障会快多少？
会用 Arthas，不等于排障一定快。不妨试试Arthas mcp。

接口延迟突然升高，命令本身并不难敲。真正费时间的是把一个模糊现象拆成诊断步骤：先看线程还是内存，要不要追踪方法，类名怎么找，采样范围多大，看到结果以后下一条命令是什么。

Arthas MCP 做的事，就是把这些诊断命令变成 AI 可以发现和调用的工具。开发者描述问题，AI 选择工具、读取结果，再决定是否继续深入。它能减少命令查询和结果整理的时间，但离“把线上 JVM 交给 AI 自动处理”还很远。

![Arthas 官方项目标识](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

## AI 接到哪里

截至 2026 年 10 月，Arthas 4.3.5 官方文档把 MCP Server 标为实验性模块。它通过 HTTP/Netty 提供 JSON-RPC 2.0 接口，使用 Streamable HTTP 传输，让支持 MCP 的 AI 客户端能够调用 Arthas 的诊断能力。

当前文档列出了 29 个工具，包括 `dashboard`、`thread`、`memory`、`sc`、`jad`、`trace`、`watch`、`profiler` 和 `heapdump` 等。这里真正发生的变化，不是 AI 突然理解了所有 JVM 问题，而是 Arthas 把命令名、参数和返回结果整理成了标准工具接口。

原来需要人记住一串命令，现在可以先描述目标。例如“找出 CPU 占用最高的线程，并判断热点是否落在业务方法里”。AI 可以先调 `thread`，再根据堆栈决定要不要查询类、反编译代码或者追踪方法。

服务端需要在 `arthas.properties` 中显式开启 MCP 入口：

● ● ●

arthas.mcpEndpoint=/mcp

arthas.mcpProtocol=STREAMABLE

arthas.password=replace-with-a-strong-password

Arthas 的 HTTP 端口默认是 `8563`。AI 客户端再连接这个地址：

● ● ●

{

  "mcpServers": {

    "arthas-mcp": {

      "type": "streamableHttp",

      "url": "http://127.0.0.1:8563/mcp",

      "headers": {

        "Authorization": "Bearer <arthas.password>"

      }

    }

  }

}

这里的 `<arthas.password>` 是占位符，要替换成服务端配置的密码。不同 AI 客户端的配置文件位置和字段可能不同，不能把这一段原样复制到所有客户端。

默认的 `STREAMABLE` 模式会保留会话状态，适合 `watch`、`trace`、`monitor` 这类可能持续输出的命令。只做一次性查询时，也可以配置 `STATELESS` 模式，让每个请求相互独立。

## 排障链路

MCP 最有用的地方，不是替你执行一条 `dashboard`，而是把几次诊断串起来。

假设订单接口的 RT 突然升高。比较稳的第一轮不是让 AI “自动修复”，而是限制它只做观察：读取 JVM 概况，查看高 CPU 线程和阻塞线程，再结合应用日志、接口入口和源码定位候选方法。

如果热点已经落到 `OrderService#createOrder`，下一步才是用 `trace` 看内部调用耗时。若怀疑异常参数，再用带条件和次数限制的 `watch` 观察。AI 的优势是能保留前一条命令的输出，继续组织下一步；类名、方法名和业务含义仍然需要代码、日志或人提供上下文。

可以把第一轮约束直接写进任务：

● ● ●

只做只读诊断，不修改 JVM 参数和类定义。

先查看线程与内存概况，再根据结果提出下一步。

调用 trace、watch、profiler 或 heapdump 前先说明范围、开销和停止条件。

没有足够证据时停止，不执行 ognl、vmtool、redefine 或 retransform。

![Arthas 官方 trace 命令输出示例](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这类约束不能保证模型永远判断正确，但能把诊断顺序和禁区写清。否则一句“帮我看看这个服务为什么慢”，可能从查看线程一路滑到方法增强，工具调用成功了，排查范围却越来越大。

## 危险能力

Arthas MCP 暴露的并不全是只读查询。

`sysprop`、`vmoption` 和 `options` 可以修改运行参数；`ognl` 能执行表达式和调用方法；`vmtool` 包含强制 GC、获取实例和中断线程等操作；`redefine`、`retransform` 会改变已加载类。`heapdump` 虽然不修改业务逻辑，却可能生成很大的文件并带来明显开销。

`watch`、`trace`、`monitor`、`stack` 和 `tt` 也不是零成本查询。它们通常需要对目标类做字节码增强，匹配范围过大、表达式过重或持续时间过长，都可能影响正在运行的应用。参数和返回值里还可能包含账号、订单或其他敏感数据。

Bearer Token 只能证明调用者拿到了密码，不会自动判断某条命令是否适合当前环境。当前官方文档说明了密码认证和 `viewfile` 的目录白名单，但没有把工具级角色权限写成现成能力。

我会在 Arthas 外面再加一层调用控制。下面是接入策略，不是 Arthas 自带的权限分级：

• `dashboard`、`jvm`、`memory`、`thread`、`sc`、`sm`、`jad` 等观察型工具，可以在受控环境先开放。

• `trace`、`watch`、`monitor`、`stack`、`tt`、`profiler` 和 `heapdump`，需要限制类、方法、持续时间和输出规模，并在调用前确认。

• `ognl`、`vmtool`、`sysprop`、`vmoption`、`options`、`mc`、`redefine` 和 `retransform`，默认禁用；确有需要时由人明确批准。

如果 MCP 客户端支持工具过滤和人工确认，可以直接在那里拦截；否则需要通过代理、网关或单独的诊断服务做限制。`8563` 端口也不该直接暴露到公网，仅靠一个密码扛住全部诊断能力，风险太集中。

## 接入边界

Arthas MCP 适合那些已经有 Arthas 使用规范，只是排障步骤分散在文档和个人经验里的团队。AI 可以把线程、类加载、方法追踪和分析结果接成一条会话，尤其适合预发、灰度环境，以及权限和审计都明确的生产诊断。

如果团队连手工使用 `watch`、`trace` 的范围和停止条件都没有定下来，接入 MCP 只会让命令执行得更快，不会让结论更可靠。模型还可能被旧日志、错误类名或不完整上下文带偏，最后得到一条看似连贯、实际证据不足的诊断链。

我的接入顺序会很保守：先选一个非核心应用，只开放观察型工具，记录每次调用的参数、结果和耗时；稳定后再逐步开放 `trace`、`watch`，并保留人工确认。能修改 JVM 状态和类定义的工具，不进入默认会话。