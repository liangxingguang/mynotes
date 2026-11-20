---
id: wiki-concept-agent-permission-model
type: concept
title: Agent 权限模型（平台授权与本地运行）
status: active
created: 2026-10-30
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-28-agent-permission-model-design.md
  - raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md
  - raw/sources/ai/2026-10-31-llm-integration-engineering-hard-parts.md
  - raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md
  - raw/sources/ai/2026-11-20-gaode-qingzhou-agent.md
related:
  - wiki/concepts/mcp.md
  - wiki/concepts/a2a-protocol.md
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/rbac-permission-system.md
  - wiki/entities/gaode-qingzhou-agent.md
  - wiki/sources/kiso-minimal-agent-framework.md
  - wiki/sources/llm-integration-engineering-hard-parts.md
  - wiki/sources/2026-11-20-agent-sandbox-mcp-k8s.md
  - wiki/entities/kiso.md
---
# Agent 权限模型（平台授权与本地运行）

## Definition（定义）

面向多租户 Agent 平台的权限模型：权限 = 静态基线 + 本次指令的临时授权 + 调用时动态校验，而非传统 RBAC 的「用户→角色→资源」静态绑定。权限主体分三层——租户（Tenant）、Agent 实例（agentCode）、单次指令/会话（Instruction/Session）。同时覆盖单用户本地运行时的权限维度：CLI 运行模式（default/accept-edits/plan/dontAsk/bypass）、只读证明式命令放行（Unknown≠Safe）、执行者与裁判者分离（Kiso 信源）。

## Why It Matters（为什么重要）

固定角色控制不住模型自主选工具：同一 Agent 处理任务 A 允许查订单、处理任务 B 就不允许。且 MCP 工具是独立服务，Agent 只是其调用客户端之一，工具本身也需要鉴权。照搬传统 RBAC 会把「模型自主决策」这一新风险面暴露在权限体系之外。本地单用户场景同样存在权限面：模型经 Shell/文件系统改变现实，哪些操作可自动放行、哪些必须人批、无人值守时如何不挂死，都需要明确的运行时策略。

## Core Characteristics（核心特征）

1. **四层防线逐层校验**：①租户隔离（tenantId 绑一切数据/工具/策略）②AgentPolicy 基线（allowedToolCodes 上限，只缩不放）③InstructionGrant 指令临时授权（基线子集，随指令生命周期自动失效）④MCP 网关二次鉴权兜底。任一层不通过直接拦截。
2. **基线是上限**：InstructionGrant.allowedToolCodes ⊆ AgentPolicy.allowedToolCodes，代码强制校验子集关系，指令授权只能缩小不能放大。
3. **前置拦截**：权限拦截器放在 LLM 输出 tool_call 之后、发起 MCP 请求之前——直接不允许模型选择未授权工具，避免模型生成越权调用浪费 token。
4. **凭证签名**：ToolPermissionClaim 携带 tenantId/sessionId/instructionId/agentCode/toolCode/grantId + claimSign，防篡改，序列化后传 MCP 网关。
5. **读写分离**：只读工具自动授权（grantSource=AUTO），变更类工具强制人工审批（MANUAL）。
6. **网关授权入口与不可变执行意图**（第 4 信源）：网关是唯一将不可信协议输入转换为可信执行意图的位置——验证令牌签名、`iss`、`aud`、时效和算法约束；限制请求体；按注册表校验工具版本与 JSON schema；拒绝未知字段；再将规范化结果交给策略引擎。策略决策的输入序列化、摘要并随执行记录保存，执行器只认这份规范化载荷，堵住"策略检查 A、实际执行 B"的 TOCTOU。
7. **能力票据（权限按次绑定）**（第 4 信源）：每次执行签发短效 JWT 票据（`jti`/`sub`/`aud`/`execution_id`/`tenant`/`tool_digest`/`actions`/`scope`/`nbf`/`exp`），由控制面签名，数据/出口代理验证签名、受众、期限、一次性与范围；权限不随进程、镜像或平台服务账号长期存在，即使 runner 被完全控制，攻击者也只剩短时间、单租户、单工具、单范围的能力。数据服务是最终授权点，网关的 allow 决策不能替代数据库或业务服务权限。

## How It Works（运作方式）

九步校验链路：建 Session/Instruction 定 agentCode → 读 AgentPolicy 基线 → 按指令内容自动裁剪生成 InstructionGrant（拿不准进人工审批）→ LLM 输出 tool_call 后框架侧先过滤（不在 grant 清单直接拦）→ 放行请求组装 ToolPermissionClaim 并签名 → MCP 网关验签 + 二次核对 grant → MCP 服务内做数据行级权限 → 结果返回并写审计日志（绑定 ToolCallRecord）→ Instruction 完成自动撤销 grant（REVOKED + expireAt 兜底）。

A2A 委派：主管下发子 Instruction 时生成子 InstructionGrant，只能是主管当前 grant 的子集；主管可随时撤销，防止权限沿委派链放大。

**网关到执行的链路**（第 4 信源）：网关验证身份并生成不可变执行意图 → 策略引擎判定（Rego 只判主体/工具/范围，不做 SQL 过滤，AST 解析不能替代数据库权限）→ 调度器发放一次性载荷与能力票据 → runner 凭票据向数据/出口代理发起受限请求（代理再次验证票据绑定、`execution_id` 未撤销、租户/操作/范围未扩大、`jti` 一次性与速率）→ 结果回传写入审计。生产代码还须处理身份验证失败、策略超时、策略版本回滚、审计投递失败的 fail-closed 行为；网关自身的 K8s 或数据库管理员凭据不得转发给工具，高价值写操作不应让 runner 持有下游秘密，由代理继续执行细粒度审批与幂等控制。

本地运行模式维度（Kiso 信源，第 2 信源）：单用户 CLI 场景的权限面与平台授权不同，核心是"运行时能做什么 + 什么必须人批 + 无人值守怎么办"。五种运行模式：`default`（能证明只读的直接放行、副作用进审批）/ `accept-edits`（常规文件修改放行、Shell 等开放副作用仍校验）/ `plan`（纯只读，写入与副作用直接拒绝）/ `dontAsk`（无人值守：所有需人确认的操作直接 deny，模型只能在现有权限内另找路径，不允许任务挂在无人回答的确认框上——是 deny 语义而非 bypass 语义）/ `bypass`（尽量放行正常操作；但凭据与灾难性路径操作仍有底层保护，"放权是运行策略，灾难底线不是可关的 UI 选项"）。Shell 层采用"只有能够证明只读，才自动放行"：read-only-shell 解析命令，存在反引号、`$()`、subshell、后台执行等无法安全证明只读的结构直接 abstain；管道/分号组成的多命令每段分别满足只读条件；访问 `.env`/凭据路径仍进权限链；`git -c` 这类表面是 Git 命令、实际借配置触发外部程序的形式不视为只读——**Unknown 不等于 Safe**（解析器不知道就是不知道，不能默认安全）。环境变量清洗（工具叫 `shell` 而非 `bash`：系统 Shell 执行、工作目录绑定 Workspace、子进程 env 清洗，API Key/Token 不因 `env`/`printenv` 泄漏进 Context）。执行者与裁判者分离的延伸：子 Agent 可被限制修改路径、高风险能力不提供，且父 Session 持独立 acceptance check——子 Agent 自报"完成"不算完成。

**双令牌无感鉴权与凭证隔离**（信源 2026-11-20，高德 AuthX）：Agent 要替用户操作各个内部平台，身份认证的核心难题是 Agent 同时代表两个实体——自身的工作负载身份，以及背后的用户身份，传统单一身份模型无法同时表达两层。AuthX 以 **AIT + APT 双令牌**解决：AIT 回答"你是谁"，把工作负载身份与委托用户身份绑定在同一个令牌里；APT 回答"你确实持有对应私钥"，提供请求级持有证明与防重放保护。**关键是凭证隔离**：长期凭证（私钥、Refresh Token）永远不进入 Agent 运行环境，由沙盒外的 Egress Sidecar 完成签名注入——即使沙盒内执行的代码出现问题，也拿不到用户长期凭证。对用户而言这一切"无感"，不重复登录授权，同时保留原有权限边界：以用户身份执行的平台动作（实验、灰度、发布）不扩大用户原有权限；代码仓库访问由受控公共账号按 Group 范围集中承接，受分支限制、人工 Review 和任务审计约束。该机制与本页"凭证签名（ToolPermissionClaim 防篡改）""能力票据按次绑定"同构——权限不随进程长期存在，校验权在沙盒外，长期凭证不进入不可信执行环境。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcp|MCP]]：协议标准无内置复杂权限，网关鉴权是接入层补齐的推荐落地（生产首选方案 A，原生服务零改动）。
- [[a2a-protocol|A2A 协议]]：委派链路的权限收缩是本模型在多 Agent 场景的延伸。
- [[agent-sandboxing|Agent 沙箱隔离]]：权限是「授权收窄」（能做哪些操作），沙箱是「能力收窄」（碰得到什么），互补两层。

### Distinctions（区分）

- 与**传统 RBAC**（[[rbac-permission-system|RBAC 权限系统]]）：主体从单一用户扩为三层；授权从静态长期变为「基线 + 指令级临时授权 + 动态校验」。
- 与**参数层校验**（[[tool-parameter-whitelist|参数层白名单]]）：权限模型管「这个会话能不能调这个工具」，白名单管「这次调用的参数值可不可信」，两道独立防线。
- 与**黑名单式命令过滤**：本地 Shell 放行不应靠危险命令黑名单（Shell 表达能力太强，`$()`/重定向/subshell/环境变量都能借道产生副作用），正确方向是只读证明式放行——无法证明只读即 abstain（Kiso 信源）。

## Evolution（演进）

- 2026-10-30 — 由信源 `raw/sources/ai/2026-10-28-agent-permission-model-design.md`（Agent架构设计15）建立。
- 2026-10-31 — Kiso 信源（第 2 信源）补上本地运行时维度：五种 CLI 运行模式（含 `dontAsk` 的 deny 语义——无人值守不是"什么都允许"，而是"需人确认的都拒绝"，任务不挂在无人回答的确认框上）、只读证明式命令放行（Unknown≠Safe）、子 Agent 权限受限 + 父会话独立验收。与平台四层防线互补可组合（平台层管授权收窄、本地层管执行证明），页面标题由「四层防线」扩展为「平台授权与本地运行」。
- 2026-11-01 — 面试深挖 84（第 3 信源）补上**凭证归属与校验位置**视角：工具调用产生的执行凭证是「发起方用户」的权限，不是模型/代理自身的；校验发生在**调用方这一侧**（工具提供方执行时校验），模型只是参数生成者——即使提示词注入伪造指令，也只能生成无权请求。只读工具同样过权限过滤（工具端有自己的授权链，不是免检通道）。与本页四层防线"MCP 网关二次鉴权兜底"同构：校验权在工具侧，不在模型侧；权限模型管"能调什么"，凭证归属管"以谁的身份调"。
- 2026-11-20 — 平台级沙箱信源（第 4 信源）补上**网关授权入口与能力票据**视角：授权由可信控制面决定（模型、HTTP 头、工具参数只能提供待比对数据，租户取可信会话而非模型参数）、权限按本次执行绑定（短效能力票据，代理验证签名/期限/一次性/范围）、数据服务是最终授权点；Rego 职责边界明确为只判主体/工具/范围、不过滤 SQL，AST 不能替代数据库权限。与本页"MCP 网关二次鉴权兜底"互为印证并补上票据机制细节。
- 2026-11-21 — 高德 AuthX 信源（第 5 信源）补上**双令牌无感鉴权与凭证隔离**视角：AIT（绑定工作负载身份与委托用户身份）+ APT（请求级持有证明与防重放）双令牌解决 Agent 双层身份难题；长期凭证永不进 Agent 运行环境，由沙盒外 Egress Sidecar 完成签名注入，沙盒内代码出问题也拿不到用户长期凭证；以用户身份执行的平台动作不扩大原有权限，代码仓库访问由受控公共账号按 Group 集中承接。与本页"凭证签名""能力票据按次绑定"同构——权限不随进程长期存在、校验权在沙盒外。

## Open Questions（开放问题）

- 该模型的生产实证（性能开销、审批吞吐、误拦率）：当前信源为设计稿，无实现与数据。
- 行级数据权限与四层防线的组合细节：信源仅一句带过。
- 只读证明式命令解析的漏报率（abstain 误判/放行误判）未见第三方实测；`dontAsk` 模式下模型"在现有权限内另找路径"是否系统性降级任务成功率：未覆盖。
- 能力票据（短效 JWT 按次签发）的签发开销与代理校验漏验率：当前信源为设计基线，无实现与压测数据。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-permission-model-design.md`
- Source: `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（第 2 信源：五种运行模式、只读证明式放行、环境变量清洗、执行者与裁判者分离）
- Source: `raw/sources/ai/2026-10-31-llm-integration-engineering-hard-parts.md`（第 3 信源：执行凭证归属发起方用户、校验在调用方侧、模型只是参数生成者、只读也过权限过滤）
- Source: `raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md`（第 4 信源：网关授权入口与不可变执行意图、能力票据按次绑定、Rego 职责边界、数据服务是最终授权点）
- Source: `raw/sources/ai/2026-11-20-gaode-qingzhou-agent.md`（第 5 信源：AuthX 双令牌 AIT+APT、凭证隔离、长期凭证留沙盒外由 Egress Sidecar 签名注入、平台动作不扩大用户权限、公共账号按 Group 集中承接）

## Related Knowledge（相关知识）

- [[agent-permission-model-design|Agent架构设计15：Agent 权限模型设计（信源页）]]
- [[kiso-minimal-agent-framework|Kiso：极简 Agent 框架（信源页）]]
- [[kiso|Kiso]]
- [[durable-execution|持久执行（Durable Execution）]]
- [[llm-integration-engineering-hard-parts|大模型接进业务系统：工程难点在哪（信源页）]]
- [[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战（信源页）]]
- [[agent-sandboxing|Agent 沙箱隔离]]
