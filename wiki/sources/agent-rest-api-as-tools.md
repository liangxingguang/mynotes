---
id: wiki-source-agent-rest-api-as-tools
type: source
title: Agent - 后台API变成工具（8）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - ai-agent
  - tutorial
sources:
  - raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md
---
# Agent - 后台API变成工具（8）

## Overview（概览）

知乎专栏《Agent》系列第 8 篇：把真实 REST 接口变成 agent 工具。先用百行 FastAPI 内存脚手架当「最小目标服务」（登录/搜用户/查角色/改角色四接口，JWT 认证），再把四个接口封装成 login/get_users/get_user_roles/assign_role 四工具，收口里程碑 M2——一句话「把张三提升为管理员」自动完成 登录→搜人→查角色→分配→答复 五轮闭环。

## Key Facts（关键事实）

- 最小目标服务：百行 FastAPI 脚手架、内存数据重启即重置；agent 只通过 HTTP 看后端、与后端语言解耦，将来接真实 Go 后台理论上只改 `BASE_URL` 一行。
- 四接口设计：POST /api/v1/auth/login（返回 token + assignable_roles）、GET /users（keyword 模糊搜）、GET /users/roles、POST /users/roles（覆盖式写）；user_id 统一走 query/body 不进 path。
- 工具形状不变：函数体从本地计算换成 HTTP 封装，但对 loop 仍是「名字 + JSON Schema + 返回 dict 的函数」；两个工具集模块暴露同一组注册件接口（TOOL_SCHEMAS/TOOL_REGISTRY/SCHEMA_BY_NAME/validate_args），agent.py 循环一行核心逻辑不改。
- 认证四件事：登录做成工具由模型自调（失败可自纠、可审计）；token 存进程内存模块级变量，login 返回前摘除 access_token（不进 prompt、不进日志）；`_call()` 统一注入 Authorization 头，业务工具零认证代码；执行顺序写进工具描述（描述即流程）。
- 错误回喂 HTTP 化：4xx/5xx 拆 FastAPI `{"detail"}` 信封返回 `{"error": true, "status", "detail"}`（模型看 status 决定重登/换 ID）；URLError 连接失败返回可操作提示；本地回环须绕过系统代理（`ProxyHandler({})` opener，实测踩坑）。
- M2 主路径实测 5 轮收尾（桩 LLM + 真实 HTTP），`MAX_ITERATIONS=10` 余量充足；schema 校验实测拦下过一次 `user_id: null` 坏参数。
- 依赖：openai 3.31.0 / fastapi 0.143.1 / uvicorn 0.54.0 / pyjwt 2.15.1（后三个只服务脚手架，agent 侧零新增依赖）。

## Important Claims（重要论断）

### 描述即流程

模型按工具描述排步骤：`login` 描述写「调用任何其他后台工具前必须先成功登录一次」，用户一句话没提登录，agent 第一轮就自己调 login。你期望的执行顺序，就写成描述里的顺序。

### 凭证只在代码里，不进模型上下文

token 是易变状态，放上下文里可能被复述出去、过期后模型手里还是旧值；演示账号可写进描述，生产凭证走环境变量/密钥管理——在对话里传密码会被日志和记忆留痕，是反模式。

### 错误即信息，回喂而不崩

401 文案写成「缺少访问令牌：请先调 POST /api/v1/auth/login 登录」——错误文本是写给模型读的；「别登录直接查」会吃到 401 结构化错误后自己补 login 再查，这是必须守住的自愈能力。

## Concepts Introduced（引入的概念）

- [[rest-api-as-tools|REST 接口工具化模式]]

## Entities Mentioned（提及的实体）

- FastAPI / PyJWT / uvicorn（脚手架依赖，未独立建页）
- DeepSeek（目标 LLM；对真实端点调用未实测，以官方文档为准）

## Implications（影响／启示）

为「老后台系统接入 agent」提供最小验证路径：工具层包 HTTP client 即路线 ①（SDK 直连 REST）的前置验证，不动老系统。「注册件同形接口换工具集不换循环」兑现了第 3 篇「工具注册件是形状」的设计承诺，印证 [[tool-schema-as-prompt|Tool Schema as Prompt]] 与 [[agent-loop|Agent Loop]] 的可维护性。

## Limitations（局限）

- M2 闭环为「桩 LLM + 真实 HTTP」实测，真实 DeepSeek 调用未实测（作者诚实声明）。
- 无 token 过期自动重登、4xx/5xx 分级、写操作二次确认——留待第 9 篇；确认闸门拦不住注入的问题留待第 10 篇（见 [[agent-tool-security-whitelist|工具全谱系与安全边界（10）]]）。
- 单一教学场景（四接口、内存数据），未覆盖分页边界、并发会话、多 token 并存。

## Related Knowledge（相关知识）

- [[agent-minimal-handwritten|Agent - 手写最小 agent（7）（信源页）]]（本信源直接前篇）
- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[agent-loop|Agent Loop]]
- [[rest-api-as-tools|REST 接口工具化模式]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md`
- 原文：<https://zhuanlan.zhihu.com/p/2095575551146718898>
