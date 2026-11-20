---
id: wiki-source-2026-11-20-agent-sandbox-mcp-k8s
type: source
title: 生产级 AI Agent 执行沙箱实战：从 MCP 授权到 Kubernetes 隔离的工程闭环
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - source
  - ai-agent
  - security
  - k8s
sources:
  - raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md
related:
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/mcp.md
---
# 生产级 AI Agent 执行沙箱实战：从 MCP 授权到 Kubernetes 隔离的工程闭环

## Overview（概览）

微信公众号工程长文（作者未署名）：以"订单报告"工具为贯穿案例，给出 AI Agent 执行沙箱的完整工程闭环——MCP 网关授权、能力票据、一次性 K8s Pod 隔离、双向网络默认拒绝、调度账本与故障演练。核心主张：用户→Agent、模型→工具、工具→数据、代码→凭据、沙箱→网络、沙箱→节点每一层信任边界各自验证，任一层失误都不能升级为跨租户读取、凭据外传或集群故障。文中配置均为参考基线，须以目标集群实测为准。

## Key Facts（关键事实）

- **六个信任边界与对应控制**：用户→Agent（服务端验证会话、租户仅取可信 claims）；模型→工具（每次调用重新授权、拒绝未知字段、规范化参数）；工具→数据（下游再次验证主体/租户/对象/操作）；代码→凭据（不注入通用静态密钥、短效范围化能力）；沙箱→网络（双向默认拒绝、仅可连接受控代理）；沙箱→节点（cgroup/PID/存储约束、受限运行时、专用节点）。
- **六条工程原则**：授权由可信控制面决定；权限按本次执行绑定；数据服务是最终授权点；网络按能力放行；实例一次性使用；可恢复状态优于进程内清理。
- **两种 MCP 部署模型、两个安全边界**：远程 MCP Server（注册审核、服务端身份、地址/版本/schema 钉扎、逐次授权、出站代理）与沙箱内 runner（任意代码、资源耗尽、秘密窃取、内核攻击面；控制为一次性 Pod、最小能力、双向网络、资源限额、执行后销毁）。
- **网关授权入口**：验证令牌签名/`iss`/`aud`/时效/算法 → 限制请求体、解析 JSON-RPC、按注册表校验工具版本与 JSON schema、拒绝未知字段 → 生成**不可变执行意图**交策略引擎；执行器必须使用规范化载荷，避免"策略检查 A、实际执行 B"的 TOCTOU。
- **能力票据**：每次执行签发短效 JWT（`jti`/`sub`/`aud`/`execution_id`/`tenant`/`tool_digest`/`actions`/`scope`/`nbf`/`exp`），数据/出口代理验证签名、受众、期限、一次性与范围；runner 被完全控制后攻击者也只剩短时间、单租户、单工具、单范围的能力。
- **K8s 隔离基线**：RuntimeClass（gVisor `runsc` / Kata，节点选择器与容忍）、Pod securityContext（`runAsNonRoot: 65532`、`seccompProfile: RuntimeDefault`、`readOnlyRootFilesystem`、drop ALL capabilities、资源 requests/limits、`emptyDir.medium: Memory`）、Namespace 挂 pod-security `restricted`、ResourceQuota。注意：关闭 ServiceAccount token 自动挂载 ≠ 不能访问 K8s API；只读根文件系统不阻止写入挂载卷；Pod Security Admission 只覆盖部分字段。
- **网络**：CiliumNetworkPolicy 双向默认拒绝（ingress 为空，egress 仅 kube-dns 与出口代理）；严格模式下不直连互联网，出口代理负责外部 DNS、TLS 服务器身份、HTTP 方法/路径、重定向与私网/元数据地址拦截。
- **调度器**：持久化账本 + CAS 原子领取（`WHERE state='IDLE' AND generation=:observed_generation`，受影响行数必须为 1）+ generation 防迟到调度器重执行；结果丢失不能盲目重试（写操作需下游幂等键、outbox 或补偿流程）；`activeDeadlineSeconds` ≠ 业务执行预算。
- **验收**：提示词注入、工具漂移、SSRF、DNS 绕过、资源耗尽、调度故障、结果歧义、凭据泄漏八类攻击/故障演练验证；上线分试点→隔离验证→规模化→持续运营四阶段设门槛；衡量指标含启动 P95、调用 P99、残留 Pod 数、清理时延、策略拒绝率、跨租户读取成功次数（必须为零）。

## Important Claims（重要论断）

### MCP 是交互协议，不是沙箱或授权系统

部署前先明确工作负载属于哪种模型：远程 MCP Server 的重点是注册审核、身份钉扎与逐次授权；沙箱内 runner 的重点是一次性隔离与资源限额。协议本身不提供这两类边界，授权与隔离要在协议之外单独建设。

### 可验证的边界组合，比单个"最强组件"重要

gVisor、Kata、OPA、Cilium、Vault 都只是链路中的组件，任何一个都不能替代其他边界；生产级沙箱是把用户授权、工具定义、凭据、下游数据权限、网络出口、资源约束和生命周期组合成一条可验证链路。

### 降低影响范围，而非消除风险

该设计显著降低提示词注入、越权、凭据外传、横向网络访问、资源耗尽和调度故障的影响范围，但不能单独消除内核/硬件零日、已获合法授权后的恶意导出、出口代理失陷和人员误配。

## Concepts Introduced（引入的概念）

- [[agent-sandboxing|Agent 沙箱隔离]]
- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]
- [[mcp|MCP]]

## Entities Mentioned（提及的实体）

- Kubernetes（RuntimeClass / Pod Security Admission / ResourceQuota）
- gVisor（runsc）、Kata Containers
- OPA（Rego）、Cilium（NetworkPolicy）、Vault

## Implications（影响／启示）

- 隔离基线要"逐项验证"而非"字段叠加"：关闭 ServiceAccount token、只读根文件系统这类单点配置都不构成完整边界，必须网络与 RBAC 同时约束。
- 授权链路的关键是"不可变执行意图"：策略判定输入序列化、摘要并随执行记录保存，执行器只认规范化载荷，才能堵住 TOCTOU。
- 能力票据把"凭据"降级为"短时单租户单工具能力"，即使 runner 失陷也缩小爆炸半径；高价值写操作不应让 runner 持有下游秘密。
- 实例一次性 + 可恢复账本：预热池可降等待但执行过的容器不得回收复用；删除失败须由独立清理控制器反复处理。
- 验收用攻击与故障演练说话，不预写性能数字；上线各阶段设"不应提前承诺"的门槛。

## Limitations（局限）

- 单一信源（微信公众号工程文，作者未署名，工程背景无法核验）；文中配置为参考基线，未经本文实测，须按目标集群/运行时/CNI/镜像实测校准。
- gVisor/Kata/普通容器的选型须以目标镜像与业务负载压测决定，信源未给出固定性能数据。
- 自定义 seccomp、`toFQDNs`、MCP Tasks 扩展（Draft）等细节依赖具体环境版本，未做兼容性验证。

## Related Knowledge（相关知识）

- [[agent-sandboxing|Agent 沙箱隔离]]
- [[agent-permission-model|Agent 权限模型（平台授权与本地运行）]]
- [[mcp|MCP]]
- [[agent-permission-model-design|Agent架构设计15：Agent 权限模型设计（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-20-agent-sandbox-mcp-k8s.md`
