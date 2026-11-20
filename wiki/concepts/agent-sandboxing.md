---
id: wiki-concept-agent-sandboxing
type: concept
title: Agent 沙箱隔离
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md
  - raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md
related:
  - wiki/entities/pi.md
  - wiki/sources/2026-11-20-agent-sandbox-mcp-k8s.md
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

## How It Works（运作方式）

选型顺序：**先想防谁 → 再想必须暴露什么 → 最后选工具**；能只读别可写，能拷进拷出别直接挂载。常见破口（官方自陈）：读写挂载、挂载代理目录（凭据/设置/会话全交出）、环境变量传入、网络出口；有网络即无法证明 agent 代码从不用网。运行时选型（普通容器 / gVisor / Kata）不预设比例、不宣传固定性能数据，须以目标镜像、节点型号与业务负载的压测决定；隔离有效性最终用攻击与故障演练验证，而不是预写数字。

## Relationships（关系）

### Distinctions（区分）

- 与**行为审查类机制**不同：项目信任、默认工具列表、逐步批准/看 diff 是"识别"，不是边界（三个"假沙箱"）。
- 各层与"整体隔离"的区别：只隔离工具/命令时，宿主 Agent 进程与不使用隔离后端的扩展仍在边界外——别把"工具隔离"当成"Pi 隔离"。

## Evolution（演进）

- 2026-10：Pi 官方文档确立"把模型生成的命令和代码当作不可信"立场与隔离方案对照表；示例级命令沙箱经 `@anthropic-ai/sandbox-runtime` 实现。
- 2026-11-20 — 平台级生产沙箱信源（第 2 信源）补上**多租户 Agent 平台的工程闭环**视角：六层信任边界各自验证的链路观、K8s 隔离基线（RuntimeClass/Pod securityContext/Namespace restricted/配额）与三个常见误判、双向默认拒绝的网络模型、CAS+账本的一次性调度、攻击与故障演练验收。与 Pi 的客户端/进程级隔离互补：一端是平台托管边界，一端是本地运行边界；能力票据的授权细节归入 [[agent-permission-model]]。

## Open Questions（开放问题）

- 示例扩展（命令沙箱、Gondolin）的生产成熟度与采纳率：当前信源未确立。
- Web 插件界面的安全隔离（XSS、iframe、多人会话信任边界）被认为比 Docker 沙箱化困难得多，尚无成熟方案。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md`
- Source: `raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md`（第 2 信源：平台级工程闭环、K8s 隔离基线、双向网络、调度账本、验收演练）

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-sandbox-two-layer-isolation|Pi 的两层隔离（信源页）]]
- [[2026-11-20-agent-sandbox-mcp-k8s|生产级 AI Agent 执行沙箱实战（信源页）]]
- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]
- [[mcp|MCP]]
