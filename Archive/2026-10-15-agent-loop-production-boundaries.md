---
id: 2026-10-15-agent-loop-production-boundaries
title: 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/lmO8xyKxJ2ckFEclxwrw3Q
source_type: article
platform: 微信公众号
created: 2026-10-15
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/agent-loop-production-boundaries.md
wiki_status: ingested
---

# 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统

> 文章以 Go 实现的运维诊断 Agent 原型 Aegis（W01 阶段，全部本地合成 Mock）为例，论证"模型 while 循环 + 调工具"的 Chatbot 骨架撑不起生产系统：模型不结束、工具挂住、用户取消、预算耗尽都必须成为明确且可查询的结果。关键设计：HTTP 与 Agent Loop 解耦（容量 32 的有限队列 + 单消费者后台 runtime + 内存仓储）；拆出 LLMProvider / ToolExecutor / AgentRuntime 三个可替换契约；任务走 PENDING→RUNNING→SUCCEEDED/FAILED/CANCELLED 状态机，取消先在仓储落终态再通知 worker，锁内排序保证终态不可被迟到结果覆盖；每类停止都有独立错误码；许可只来自服务端，模型输出不是授权凭据。

## 核心要点

1. **三契约分离**：Provider 只建议下一步；ToolExecutor 校验主体/工具名/参数后执行；Runtime 控制循环、预算与状态提交。第二周接 MCP 时只换工具适配器。
2. **响应必须明确**：模型一次响应恰好含 ToolCall 或 Final，两者皆有/皆无 → INVALID_DECISION；不猜测执行路径，不把"模型说成功"当作工具执行成功。
3. **取消不是 bool**：仓储在锁内先置 CANCELLED，旧循环迟到的 Append/Finish 被拒；成功提交与取消靠抢锁二选一，两种结果都要能向调用方解释。
4. **有限执行，各有原因**：默认最多 6 步、4 次工具调用、任务总超时 5s、单次调用 1s；对应 MAX_STEPS_EXHAUSTED、TOOL_BUDGET_EXHAUSTED、TASK/LLM/TOOL_TIMEOUT；重复调用（工具名+规范化 JSON 参数）直接 REPEATED_TOOL_CALL。
5. **授权在服务端**：固定 Principal（demo/developer）、query_metrics 白名单、资源限 payment-service、时间窗限 30m；模型建议 rollback 同样走 ToolExecutor → TOOL_DENIED；请求体多传 tenant_id 直接拒绝。
6. **证据 ≠ 因果**：Mock 返回 error_rate=0.08 是人工夹具（synthetic=true），只校验 Final 的 evidence_ids 真实存在；"指标异常"推不出"某发布导致异常"，诊断质量留给数据集评测。
7. **克制的边界声明**：无 PostgreSQL/Checkpoint/租约/MCP/审批/真实 LLM，进程崩溃内存全丢（重启查旧任务返回 404 已被实验确认）；也未解决 Prompt Injection 与精确成本治理。
8. **给后端转 Agent 工程师的原则**：业务状态受控更新、耗时操作独立生命周期、权限不信请求方自述、重试必须理解副作用、关键结论要有可复现证据——模型带来非确定性，这些后端基础反而更重要。

## 正文

### 起点：一个运维诊断任务的最短闭环

演示问题是"payment-service 近 30 分钟错误率上升，分析原因，必要时建议回滚"。W01 只实现最短一段：创建任务 → 查模拟指标 → 生成带证据引用的结果。Mock 工具固定返回 8% 错误率，Mock Provider 的最终回答明确指出"仅凭指标不能确定根因，需关联日志与发布记录"，且不执行回滚。验收拆成两部分：任务是否正确结束、结果是否引用本任务实际获得的证据；模型诊断充分性不在本周验收范围。

### 工程边界：同进程内的有限队列 + 后台消费者

对比四种方案后（HTTP 同步循环 / 每请求 goroutine / 有限队列+消费者 / 独立 Worker+PG），ADR-0007 选择 W01 在单个 `cmd/api` 进程内组合 HTTP 模块、内存仓储与后台执行模块：handler 不调 Agent Loop，只把 task ID 提交给 scheduler；scheduler 单消费者、队列容量 32；仓储最多存 1000 个任务，满则返回 503。进程边界暂时合并、执行职责保持分离，W04 引入共享数据库后再拆独立 Worker。

### 状态机与并发保护

- `Claim` 在锁内确认 PENDING 才能转 RUNNING；`Finish` 在锁内调用 `workflow.Allowed`；`Append` 只允许 RUNNING 追加步骤；终态无任何合法后续转移。
- 20 个并发认领者实验：仅一个成功。
- 仓储返回深拷贝快照，避免调用方通过 Steps/Evidence 引用污染内部状态。
- 明确承认这只是单进程终态保护：没有租约 epoch 与外部工具 fencing，本地取消无法撤销外部系统已接受的变更，需要幂等键或人工核验。

### 超时与合作式取消

三级超时（任务总超时 / 模型单次 / 工具单次）分开报因，检查总 context 在前以免误报。Go context 是合作式信号：Mock 会检查 ctx.Done，但换成不响应 context 的 SDK 后超时无法强杀；作者明确拒绝"启动一个可能永久泄露的 goroutine 假装及时返回"，真实 Adapter 的取消语义须接入时重新验证。

### 安全与输入约束

Demo Auth 需显式开启且仅监听 127.0.0.1；body 限 8192 字节、prompt 限 1000 Unicode code point；拒绝未知字段与多 JSON 文档；错误只返回稳定公开 code，不回传底层异常原文，防止适配器泄漏地址凭据。Get/Cancel 同时校验租户与主体，不匹配一律 404（不暴露任务存在性）。

### 用实验代替想象

Linux amd64 + Go 1.26.2 + Gin v1.10.0，通过 `go test -race -count=1 ./...` 与 `go vet`。12 组实验全部通过：正常诊断、工具错误、重复建议、步数/预算耗尽、三类超时、用户取消、回滚被拒、伪造证据 ID、并发认领、重启丢失。全仓语句覆盖率 75.5%（Agent 88.0%，工具包仅 57.1%），作者拒绝把它四舍五入成"80%"，也不把 100% 覆盖等同于逻辑正确。开发期一次 ConnectionRefused 定位为隔离网络命名空间问题，修复方式是让实验脚本在同一环境管理服务器生命周期，而不是把监听地址改成公网绕过。

### 后续路线

W02 在 ToolExecutor 后接 MCP 只读查询并验证 Schema/协议/跨进程失败；W04 才把仓储换成 PostgreSQL，加事务、Checkpoint、Outbox 与认领机制；W06 做完整 RBAC、资源级 Policy 与审批绑定。接口可替换不代表可靠性自动出现——每个阶段都需要新的实现和新的故障实验。

## 来源

- [从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统（微信公众号）](https://mp.weixin.qq.com/s/lmO8xyKxJ2ckFEclxwrw3Q)

## 附件

- 抓取正文原件（采集态证据）：[[Assets/2026/10/agent-loop-production-boundaries.md]]
