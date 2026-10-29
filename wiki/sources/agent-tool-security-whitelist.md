---
id: wiki-source-agent-tool-security-whitelist
type: source
title: Agent - 工具全谱系与安全边界（10）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - ai-agent
  - security
  - tutorial
sources:
  - raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md
---
# Agent - 工具全谱系与安全边界（10）

## Overview（概览）

知乎专栏《Agent》系列第 10 篇（Part 3 收官）：工具是 agent 的攻击面。给出五类工具风险分级表、提示词注入的根因与三条路径、确认闸门为什么拦不住注入（四环模型），以及参数层白名单防线的完整代码落地——assign_role 语义白名单（EXTRA_VALIDATORS）与 eval_expr 代码执行三道闸，29 项断言自检全过。

## Key Facts（关键事实）

- 五类工具风险分级：REST 只读（低）/ REST 写（中）/ 代码执行（中～极高，视沙箱）/ 文件读写（高）/ 数据库 NL2SQL（极高）/ 浏览器操作（高）；判断标准是「参数落到哪执行、执行者权限多大」，不看模型。
- 降风险第一动作是砍权限而非加提示词：数据库工具只给只读账号+强制参数化查询，风险从极高降到中。
- 注入根因：模型分不清指令和数据，role 只是 API 分类符；SQL 世界有参数化查询解药，LLM 世界没有——一切内容都是同一条字符串流。OWASP LLM Top 10 连续两年把 Prompt Injection 排第一（2026 版 LLM01，2026-08-04 发布；LLM03 Excessive Agency）。
- 三条注入路径：A 工具结果藏指令（间接）、B 用户输入带指令（直接，含无意注入——简历模板藏 AI 检测指令的 OWASP 真实场景）、C 可信表面被投放（内网知识库投毒，写侧低权限通道 vs 读侧高权限消费不对齐）。
- 注入四环模型：①坏内容进上下文（想错了）→②模型产出参数（schema 只查形状）→③执行闸门（管做不做）→④真实执行；确认闸门在第③环，注入在第①环已完成，故防线必须前移到第②环参数层。
- 白名单落地：user_id 格式白名单 `^u-\d{4,6}$`（顺带挡路径穿越）；role_id 取值白名单来自服务端 login 返回的 assignable_roles（登录成功即刷新，客户端不写死）。
- eval_expr 三道闸：字符白名单 `^[0-9+\-*/().%\s]+$`（__import__ 第一关就死）→ ast.parse 语法树白名单（只放行数字常量与四则运算节点，2**999999 资源炸弹被拦，全程不用 eval）→ 长度上限 200 字符。
- 两段式校验：先 schema 形状后语义值，挂进 validate_args 必经之路，agent.py 一行不改；校验失败返回 error dict 而非抛异常（审计记 error:rejected，与运行时兜底 error:raw 分开）。
- 工程实证：selfcheck_p10.py 4 场景 29 项断言全过（Python 3.12.15）；场景 3 证实恶意参数死在出网前——不发 HTTP、不触发闸门、不写审计。
- 引用权威链：OWASP GenAI LLM Top 10 2026、Simon Willison「lethal trifecta」（2025-06-16）、Meta「Agents rule of two」（2025-10-31，原文未能直连验证，作者注明）、NIST AI 100-2 e2025「当前不存在可靠预防机制」、E2B 沙箱文档。

## Important Claims（重要论断）

### 确认闸门拦不住注入

闸门管「做不做」（第③环），注入在「想错了」（第①环）就已完成；被操纵的模型做出看起来就是用户本意的事，人会放行。防线必须前移到参数生成之后、出网之前。

### 白名单优于黑名单

黑名单枚举不完坏写法（编码变体、零宽字符），永远跑不赢攻击者；白名单只说「什么可以进」，一句正则说完整个合法世界。校验强度跟着参数的熵走——只有合法形态能一句话说清的低熵参数才上白名单。

### 拒绝即自纠教材

拒绝信息写清「什么是对的、去哪拿」，原样回喂给模型，被拒的调用变成自纠教材而非死胡同；能预先判定的拒绝走校验层，只有跑起来才知道的失败走异常兜底，两者审计语义必须分开。

## Concepts Introduced（引入的概念）

- [[prompt-injection|提示词注入（Prompt Injection）]]
- [[tool-parameter-whitelist|参数层白名单防线]]

## Entities Mentioned（提及的实体）

- OWASP GenAI Security Project（LLM Top 10 2026）
- Simon Willison（lethal trifecta 提出者）、Meta AI（Rule of Two）、NIST、E2B、Playwright（均为引用，未独立建页）

## Implications（影响／启示）

把 [[tool-schema-as-prompt|schema 软约束须执行前校验]] 从形状层推进到语义层：两段式校验（schema 查形状 + 白名单查值）是该原则的可运行落地。代码执行类工具的「沙箱是上线底线」与 [[agent-sandboxing|Agent 沙箱隔离]] 的「能力限制而非行为审查」互证。暴露面盘点方法（工具清单=agent 的对外接口）可直接复用于任何 agent 安全评审。

## Limitations（局限）

- 教学实现：白名单只覆盖两个低熵参数与一个微缩 eval_expr；自由文本参数、多工具组合风险未覆盖。
- 对真实 DeepSeek 的完整闭环未实测（1-3 步验证均零 token 不联网）；Meta Rule of Two 原文未能直接打开验证（作者注明）。
- 确认闸门与审计来自第 9 篇，该篇未采集，只有引用无原文。

## Related Knowledge（相关知识）

- [[agent-rest-api-as-tools|Agent - 后台API变成工具（8）（信源页）]]（本信源直接前篇）
- [[prompt-injection|提示词注入]]
- [[tool-parameter-whitelist|参数层白名单防线]]
- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[agent-sandboxing|Agent 沙箱隔离]]

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md`
- 原文：<https://zhuanlan.zhihu.com/p/2095930576318551219>
