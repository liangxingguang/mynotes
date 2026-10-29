---
id: wiki-concept-rest-api-as-tools
type: concept
title: REST 接口工具化模式
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - concept
  - ai-agent
sources:
  - raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md
related:
  - wiki/concepts/tool-schema-as-prompt.md
  - wiki/concepts/agent-loop.md
---
# REST 接口工具化模式

## Definition（定义）

把既有后台 REST 接口封装成 agent 工具的模式：函数体从本地计算换成一次 HTTP 请求的封装，但对 agent loop 而言工具形状完全不变——仍是「名字 + JSON Schema + 一个返回 dict 的普通函数」。循环眼里没有「远程」，只有函数。

## Why It Matters（为什么重要）

老系统接入 agent 的最快路径：工具层包一层 HTTP client，不动老系统，agent 只通过 HTTP 看后端、与后端语言解耦——将来换真后台只改 `BASE_URL` 一行。工具形状不变意味着 loop 代码零改动，换的是注册表内容而非循环结构。

## Core Characteristics（核心特征）

1. **一个接口一个工具**：映射规则不变，描述写清语义和先后（覆盖式/追加式、参数从哪个工具的返回值来）。
2. **登录做成工具**：不预登录，由模型自己调 login——失败能自纠、过期能重登、每次都进日志可审计。
3. **凭证纪律**：token 存进程内存模块级变量，login 返回前摘除 access_token（不进 prompt、不进日志）；生产凭证走环境变量/密钥管理，对话里传密码会被日志记忆留痕，是反模式。
4. **统一 HTTP 出口**：所有工具共用一个 `_call()` 自动注入 Authorization 头，业务工具零认证代码。
5. **错误回喂 HTTP 化**：4xx/5xx 拆服务端错误信封返回 `{"error": true, "status", "detail"}` 结构化 dict（模型看 status 决定重登或换 ID）；连接失败返回可操作提示；任何失败不抛出。

## How It Works（运作方式）

```
工具函数 → _call()（拼 URL + 注入 Bearer + 超时）→ HTTP → 远端 REST
         ↘ 失败三类：HTTPError 拆 {"detail"} 信封 / URLError 回可操作提示 / 本地回环绕过系统代理
         → 一律返回 dict，经 json.dumps 作为 role:"tool" 结果回喂模型
```

配套工程细节：本地回环必须绕过系统代理（`ProxyHandler({})` 自建 opener）；401 错误文案写成「请先调 login 登录」这种给模型读的操作指引。

## Relationships（关系）

### Related Concepts（相关概念）

- [[tool-schema-as-prompt|Tool Schema as Prompt]]：「描述即流程」是该概念在 REST 工具上的兑现——执行顺序（先登录、写操作先查现状再复述）写进描述，模型照着自己排步骤。
- [[agent-loop|Agent Loop]]：注册件同形接口（TOOL_SCHEMAS/TOOL_REGISTRY/SCHEMA_BY_NAME/validate_args）使换工具集不动循环。

### Distinctions（区分）

- 与 **MCP Server 包装**（路线②）：REST 工具化是 SDK 直连路线的前置验证，agent 侧零新增依赖；MCP 把工具供给协议化，适合多客户端复用（当前信源未展开对比细节）。
- 与**本地函数工具**：差异仅在函数体（HTTP 封装 vs 本地计算）、失败来源（HTTP 状态码 vs Python 异常）、状态（有认证态 vs 无状态）三项；schema 校验、错误回喂、终止判定原样生效。

## Evolution（演进）

- 2026-10-30 — 由信源 `raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md`（系列第 8 篇，M2 里程碑：一句话「把张三提升为管理员」五轮闭环）建立。

## Open Questions（开放问题）

- token 过期自动重登与并发会话多 token 并存：信源留待系列第 9 篇。
- 大规模接口（几十上百个）下的工具检索与描述维护成本。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md`（桩 LLM + 真实 HTTP 实测 M2 闭环与错误路径）

## Related Knowledge（相关知识）

- [[agent-rest-api-as-tools|Agent - 后台API变成工具（8）（信源页）]]
