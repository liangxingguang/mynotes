---
id: wiki-source-2026-11-20-codex-sandbox
type: source
title: Codex Sandbox 完整公开，OpenAI 怎么在本机给 Agent 限权？
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - source
  - ai-agent
  - security
  - sandbox
sources:
  - raw/sources/ai/2026-11-20-codex-sandbox.md
related:
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-permission-model.md
  - wiki/sources/codex-agent-harness-architecture-6.md
---
# Codex Sandbox 完整公开，OpenAI 怎么在本机给 Agent 限权？

## Overview（概览）

OpenAI 工程师 Michael Bolin 于 2026-11-18 公开 Codex Sandbox 设计的解读文：从权限配置讲到 macOS/Linux/Windows 三个操作系统上的实现，并介绍如何把它单独用在其他程序上。核心机制是"模型决定要运行什么，操作系统按启动时的规则限制它能访问什么"——命令启动时限权、子进程继承约束；并指出本地 stdio MCP 服务默认不套用 Shell 沙箱配置、域名规则需"网络开关+代理"两层配合等易被忽略的细节与"文件不继承沙箱限制"的盲区。

## Key Facts（关键事实）

- **背景案例**：2025 年 7 月 Replit CEO 确认开发中的 Agent 删除用户生产数据库数据；同年底 The Register 报道一位 Antigravity 用户在 Agent 清理缓存时误删 D 盘内容（Google 回应调查中，用户多有备份）。沙箱拦不住"文件内改代码"的逻辑副作用，但能限制命令可接触的文件与网络。
- **命令启动时限权**：源码中 `exec_command` 把命令、工作目录、环境变量和权限选项交给统一命令执行器，Codex 将权限配置转成本机沙箱规则后再启动命令；`npm test` 拉起的测试框架与编译器作为子进程同样继承约束，后代进程即使比原始命令活得更久，限制仍跟随。
- **内置 `:workspace` 配置**：命令可写工作区和系统临时目录，默认禁止联网；工作区根下的 `.git`、`.codex`、`.agents`、`.aws` 有额外写保护（阻止改 Git hooks、`.codex/config.toml` 等影响后续执行的文件）。编译器读取范围较宽、仍受系统用户权限约束，用户目录配置文件（含密钥）可能可读——默认断网限制了直接上传，文件本身仍可能可读。
- **按项目调权**：在 `:workspace` 基础上给缓存目录加 `write`、用 `read` 设只读、用 `deny` 挡指定路径；管理员可在 `requirements.toml` 限定可选配置。审批策略处理扩权请求，"扩大沙箱内访问"与"到沙箱外执行"两类请求走不同启动路径。
- **MCP 服务另设权限**：本地 stdio MCP 服务由 MCP 客户端直接启动（把 `config.toml` 里的可执行文件和参数交给本地 stdio 启动器），**默认不套用 Shell 命令的沙箱配置**——同一会话中测试命令断网，文档服务可能照常访问内网。可用 **`codex sandbox --permission-profile <name>`** 单独限权，该入口不依赖 Agent 会话，自己的工具也能用；Permission Profiles 仍处 Beta，与旧 `sandbox_mode`、`sandbox_workspace_write` 不叠加。管理员可用 `requirements.toml` 约束哪些 MCP 服务能启用，但"允许启动"不等于"启动后能访问什么"。
- **域名规则靠代理执行**：`network.enabled` 开网络只是第一步，`features.network_proxy` 启用代理才让域名表生效——只开网络不启代理，命令可直接联网、域名表不执行。启用后 Codex 经 `HTTP_PROXY`/`HTTPS_PROXY` 等环境变量传代理地址；程序不认变量尝试直连时由操作系统拦截，代理按域名规则决定是否转发。明确拒绝优先，未匹配域名可能被拒或进入审批。代理先判断目标是否获准、再解析域名；宽通配规则或获准访问的 DNS 仍可能留下 DNS 外传空间。域名规则只管进入对应沙箱的命令流量，不自动接管模型请求、内置网页搜索或单独启动的 MCP 服务。
- **三平台实现**：macOS 用 `sandbox-exec` 启动、内核 Seatbelt 执行规则（启用代理时策略允许访问宿主机回环上的指定代理端口）；Linux 用 bubblewrap 准备文件系统视图（可整体可写、`.git` 单独只读）、seccomp 约束系统调用、`no_new_privs` 防 setuid 提权，网络走独立命名空间、先连回环监听再由沙箱外中继转代理；Windows 正在向 Microsoft MXC 迁移（更细的路径规则覆盖，代理模式拦直连、放行回环）。通配规则有时间差：Linux/Windows 后端在每次启动前把通配符展开成具体路径，启动后才出现的匹配文件不会被补进本次拒绝规则。
- **关键盲区：文件不继承沙箱限制**：子进程会继承沙箱限制，但沙箱内写出的文件（如被写入恶意代码的 `node_modules` 里的 Prettier，通常被 Git 忽略、不出现在 `git status`）之后被沙箱外进程（编辑器）加载执行时不受这套限制。Simon Willison 同周写的外部沙箱做法（命令交单独 Linux 环境执行）也不能解决宿主机与沙箱共用可写目录的问题。
- **核对方法**：用专门准备的测试目录和无用标记文件按小场景核对——Shell 与子进程分别尝试写禁止目录、本地 MCP 服务默认启动与包上 `codex sandbox` 分别观察、代理下请求允许与拒绝域名并尝试绕过代理直连、确认格式化器从哪里加载。核心原则：**允许的动作能完成只说明这条路通了，明确禁止的动作确实被拦下，才能进一步确认限制在起作用。**

## Important Claims（重要论断）

### 限权发生在命令启动时，而不是命令运行中

模型决定要运行什么，操作系统按启动时的规则限制它能访问什么。模型发起工具调用，Harness 执行命令，权限配置在命令启动前已转成 OS 沙箱规则，子进程继承约束。

### 同一会话里，不同启动路径权限未必相同

本地 stdio MCP 服务默认不套用 Shell 命令的沙箱配置：一个服务只读本地索引、另一个要拿内网数据，仅凭启动命令 Codex 很难判断服务需要哪些权限，统一套上断网的工作区配置会让部分服务连初始化都过不了。

### 只开网络不启代理，域名表不会生效

域名规则的执行需要 `network.enabled` 与 `features.network_proxy`（或托管要求启用代理）两层开关配合；操作系统的沙箱不负责按域名判断请求，具体放行谁要交给代理，两处限制配在一起才生效。

### 沙箱拦不住文件被下一手程序加载

删除目标在可写范围内，沙箱无法区分必要的清理与误操作；同理，文件不携带沙箱限制，沙箱内改过的依赖可被沙箱外的编辑器加载执行。文件层面的风险要靠文件权限、代码签名或依赖管理另设防线。

## Concepts Introduced（引入的概念）

- [[agent-sandboxing|Agent 沙箱隔离]]（本信源为其补充"本地运行侧启动时限权"机制）

## Entities Mentioned（提及的实体）

- OpenAI / Codex（沙箱设计方与实现方）
- Michael Bolin（OpenAI 工程师，设计公开者）
- 相关案例实体：Replit、Google Antigravity、Simon Willison

## Implications（影响／启示）

- 给"在本机跑 Agent"的权限设计提供了一套可核对的操作清单：内置配置的默认写保护范围、按项目调权的写法、MCP 服务单独限权的入口、代理开关的两层关系。
- 提醒安全核对必须走"反向验证"：用明确禁止的动作确认拦截生效，而不是用允许的动作确认功能可用。
- 与平台级生产沙箱（[[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战]]）互补：一端是本地运行边界，一端是平台托管边界。

## Limitations（局限）

- 单一信源，且为对官方设计文章的转述解读，配置示例（Permission Profiles、`project-dev`）未在本机实测，具体行为随 Codex 版本变化。
- 文中明确：文中核对方法为依据设计整理，具体结果要看本机版本和配置。

## Related Knowledge（相关知识）

- [[agent-sandboxing|Agent 沙箱隔离]]
- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]
- [[codex-agent-harness-architecture-6|Codex Agent Harness 架构（信源页）]]
- [[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战（信源页）]]（平台级对照）

## Source（信源）

- `raw/sources/ai/2026-11-20-codex-sandbox.md`
- 原文：https://mp.weixin.qq.com/s/DcqSSYb3JQgZqpJNBV_kFQ
