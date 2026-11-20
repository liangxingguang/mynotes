---
id: wiki-concept-agent-sandboxing
type: concept
title: Agent 沙箱隔离
status: active
created: 2026-10-23
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md
  - raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md
  - raw/sources/ai/2026-11-20-codex-sandbox.md
related:
  - wiki/entities/pi.md
  - wiki/sources/2026-11-20-agent-sandbox-mcp-k8s.md
  - wiki/sources/2026-11-20-codex-sandbox.md
  - wiki/concepts/agent-permission-model.md
---
# Agent 沙箱隔离

## Definition（定义）

沙箱是给不可信的代码或输入划一块边界明确的地方：在里面它想干什么都行，但碰不到不该碰的东西。对 Agent 而言，沙箱隔离回答"模型触发的动作能影响到什么"。

## Why It Matters（为什么重要）

- 沙箱的本质是**能力限制**而非**行为审查**：不判断代码意图对错，只让它没有能力——识别会漏，环境不会漏。
- 它保证的是**影响范围**而非绝对安全："在沙箱里就安全了"是危险的说法，正确说法是"风险被压缩到我暴露的那一小块"。
- 换来的四样东西：限制可达面（让 AI 自己动手的前提）、限制影响范围（写坏了丢掉重建）、让试错变便宜（最贵的是回滚而非算力）、让结果可复现可审计（评测与回归的基础）。

## Core Characteristics（核心特征）

1. **共同动作是收窄可达面**：可达的文件、可连的网络、可用的凭据、能启动的进程——少一个入口就少一类风险。
2. **四条实现路径（弱→强）**：① 能力收窄的运行时（受限解释器/精简脚本引擎）；② OS 级限制（macOS `sandbox-exec`、Linux `bubblewrap`）；③ 命名空间隔离（容器）；④ 硬件虚拟化（VM/微虚拟机）。越往下越强也越贵。
3. **声明一次原则**：隔离改变的是"进程在哪跑、工具后端是什么"，只能在部署期或扩展加载期声明；安全不能建立在"每次记得"上（拦截器出错应 fail-closed）。
4. **边界必须补全主语**：是脚本进了沙箱、某个工具进了、还是整个进程进了——主语不同，保护的东西完全不同。

## Structure（结构）

以 Pi 为个案的两层隔离（2026-10 官方文档与源码）：

- **脚本级沙箱**（路径①）：代码执行扩展让模型写 JS 编排工具，运行时无文件系统/网络/进程/环境变量；⚠️ 脚本内调用的工具仍以宿主权限执行。
- **进程级五种做法**：Plain Docker（凭据传入容器）；Docker Sandboxes（托管沙箱，真凭据留宿主、代理代填）；OpenShell（策略控制凭据与推理路由）；Gondolin 扩展（7 个内置工具+用户命令进微 VM，命令继承宿主环境变量，不是凭据边界）；命令沙箱示例扩展（仅命令受 OS 机制约束，四类清单：禁读路径/允许写路径/禁写文件/域名白名单；六类文件工具不受约束）。
- 三层可叠加；只有整体隔离能把扩展、MCP 工具与子进程一起关进边界。

**平台级生产沙箱的工程闭环**（信源 2026-11-20，多租户 Agent 平台视角）：

- **链路观**：生产级沙箱不是在 Pod 上加几个安全字段，而是把用户授权、工具定义、凭据、下游数据权限、网络出口、资源约束与生命周期组合成一条**可验证链路**；gVisor、Kata、OPA、Cilium、Vault 都只是链路中的组件，任何单个组件都不能替代其他边界。
- **隔离基线（K8s）**：RuntimeClass（gVisor `runsc` / Kata，节点选择器 + 容忍）→ Pod securityContext（`runAsNonRoot: 65532`、`seccompProfile: RuntimeDefault`、`readOnlyRootFilesystem`、drop ALL capabilities、资源 requests/limits、`emptyDir.medium: Memory`）→ Namespace 挂 pod-security `restricted` → ResourceQuota，再叠加镜像签名/SBOM、禁止 privileged/hostNetwork/hostPID/hostPath、专用节点池与节点补丁。三个常见误判：关闭 ServiceAccount token 自动挂载 ≠ 不能访问 K8s API；只读根文件系统不阻止写入挂载卷；Pod Security Admission 只覆盖部分字段，不能代替网络、运行时、供应链与业务授权。
- **网络**：双向默认拒绝（CiliumNetworkPolicy ingress 为空、egress 仅 kube-dns 与出口代理）；严格模式下沙箱不直连互联网，出口代理负责外部 DNS、TLS 服务器身份、HTTP 方法/路径、重定向与私网/元数据地址拦截。只有 egress 策略不等于隔离——挡不住集群内其他 Pod 主动连入沙箱。
- **调度与生命周期**：持久化账本 + CAS 原子领取（`state='IDLE' AND generation` 匹配、受影响行数必须为 1）+ generation 防迟到调度器重执行；实例一次性，执行过任务的容器不回收复用；结果丢失不能盲目重试（写操作需下游幂等键/outbox/补偿流程），`activeDeadlineSeconds` ≠ 业务执行预算。
- **验收**：以提示词注入、工具漂移、SSRF、DNS 绕过、资源耗尽、调度故障、结果歧义、凭据泄漏八类攻击与故障演练验证，不预写性能数字；上线分试点→隔离验证→规模化→持续运营四阶段设门槛。

**本地运行侧的启动时限权**（信源 2026-11-20，Codex Sandbox 设计公开）：

- **启动时落规则，子进程继承**：`exec_command` 把命令、工作目录、环境变量与权限选项交给统一执行器，Codex 将权限配置转成本机沙箱规则后再启动命令，由操作系统执行限制；命令拉起的子进程（测试框架、编译器等）同样继承约束。内置 `:workspace` 配置：可写工作区与系统临时目录、默认禁止联网，`.git`/`.codex`/`.agents`/`.aws` 额外写保护；编译器读取范围宽，用户目录配置文件（含密钥）可能可读——断网限制了直接上传，文件本身仍可能可读。权限可按项目用 `write`/`read`/`deny` 调整，管理员可用 `requirements.toml` 限定可选配置。
- **MCP 服务默认走另一条启动路径**：本地 stdio MCP 服务由 MCP 客户端直接启动，**默认不套用 Shell 命令的沙箱配置**——同一会话里测试命令断网，文档服务可能照常访问内网。单独限权用 `codex sandbox --permission-profile <name>`（Beta，与旧 `sandbox_mode` 不叠加），该入口不依赖 Agent 会话；管理员约束"哪些服务能启用"，不等于约束"启动后能访问什么"。
- **域名规则靠"网络开关 + 代理"两层执行**：`network.enabled` 开网络只是第一步，`features.network_proxy` 启用代理后域名表才生效；代理经 `HTTP_PROXY`/`HTTPS_PROXY` 传递，绕过代理的直连由操作系统拦截，两处配合才生效。代理先判准再解析域名，宽通配或白名单 DNS 仍可能留 DNS 外传空间。
- **三平台实现**：macOS `sandbox-exec` + 内核 Seatbelt；Linux bubblewrap（文件系统视图）+ seccomp（系统调用）+ `no_new_privs`（防 setuid 提权），网络走独立命名空间 + 回环中继转代理；Windows 向 Microsoft MXC 迁移（更细路径覆盖、代理模式拦直连放行回环）。通配拒绝规则在每次启动前展开为具体路径，启动后才出现的文件不会被补进本次规则。
- **盲区：文件不继承沙箱限制**：子进程继承限制，但沙箱内写出的文件（如被写入恶意代码、且被 Git 忽略的 `node_modules` 依赖）之后被沙箱外进程（编辑器）加载执行时不受这套限制；删除目标在可写范围内，沙箱也无法区分必要的清理与误操作。

## How It Works（运作方式）

选型顺序：**先想防谁 → 再想必须暴露什么 → 最后选工具**；能只读别可写，能拷进拷出别直接挂载。常见破口（官方自陈）：读写挂载、挂载代理目录（凭据/设置/会话全交出）、环境变量传入、网络出口；有网络即无法证明 agent 代码从不用网。运行时选型（普通容器 / gVisor / Kata）不预设比例、不宣传固定性能数据，须以目标镜像、节点型号与业务负载的压测决定；隔离有效性最终用攻击与故障演练验证，而不是预写数字。

## Relationships（关系）

### Distinctions（区分）

- 与**行为审查类机制**不同：项目信任、默认工具列表、逐步批准/看 diff 是"识别"，不是边界（三个"假沙箱"）。
- 各层与"整体隔离"的区别：只隔离工具/命令时，宿主 Agent 进程与不使用隔离后端的扩展仍在边界外——别把"工具隔离"当成"Pi 隔离"。

## Evolution（演进）

- 2026-10：Pi 官方文档确立"把模型生成的命令和代码当作不可信"立场与隔离方案对照表；示例级命令沙箱经 `@anthropic-ai/sandbox-runtime` 实现。
- 2026-11-20 — 平台级生产沙箱信源（第 2 信源）补上**多租户 Agent 平台的工程闭环**视角：六层信任边界各自验证的链路观、K8s 隔离基线（RuntimeClass/Pod securityContext/Namespace restricted/配额）与三个常见误判、双向默认拒绝的网络模型、CAS+账本的一次性调度、攻击与故障演练验收。与 Pi 的客户端/进程级隔离互补：一端是平台托管边界，一端是本地运行边界；能力票据的授权细节归入 [[agent-permission-model]]。
- 2026-11-20 — Codex Sandbox 信源（第 3 信源）补上**本地运行侧的启动时限权**机制：命令启动前把权限配置转成本机沙箱规则、子进程继承约束；本地 stdio MCP 服务默认不套 Shell 沙箱、需 `codex sandbox --permission-profile` 单独限权；域名规则需网络开关+代理两层配合；macOS/Linux/Windows 三平台实现（Seatbelt/bubblewrap+seccomp/MXC）；并明确"文件不继承沙箱限制"的盲区与"禁止的动作被拦下才算限制生效"的核对原则。三份信源共同勾勒从本地进程到平台托管的完整隔离谱系。

## Open Questions（开放问题）

- 示例扩展（命令沙箱、Gondolin）的生产成熟度与采纳率：当前信源未确立。
- Web 插件界面的安全隔离（XSS、iframe、多人会话信任边界）被认为比 Docker 沙箱化困难得多，尚无成熟方案。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md`
- Source: `raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md`（第 2 信源：平台级工程闭环、K8s 隔离基线、双向网络、调度账本、验收演练）
- Source: `raw/sources/ai/2026-11-20-codex-sandbox.md`（第 3 信源：本地启动时限权、MCP 服务另设权限、代理两层开关、三平台实现、文件不继承限制的盲区）

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-sandbox-two-layer-isolation|Pi 的两层隔离（信源页）]]
- [[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战（信源页）]]
- [[2026-11-20-codex-sandbox|Codex Sandbox 完整公开（信源页）]]
- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]
- [[mcp|MCP]]
