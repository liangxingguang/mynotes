---
id: wiki-source-agent-loop-production-boundaries
type: source
title: 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai-agent
  - engineering
sources:
  - raw/sources/ai/2026-10-15-agent-loop-production-boundaries.md
related:
  - wiki/concepts/agent-loop.md
---
# 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统

## Overview（概览）

以 Go 实现的运维诊断 Agent 原型 Aegis 第一周（W01，全部本地合成 Mock，不接真实 LLM/集群）为例，论证"模型 while 循环 + 调工具"的 Chatbot 骨架撑不起生产系统：模型不结束、工具挂住、用户取消、预算耗尽都必须成为明确且可查询的结果。是 [[agent-loop|Agent Loop]] 概念的生产化工程对照信源。

## Key Facts（关键事实）

- 三契约分离：`LLMProvider`（只建议下一步）/ `ToolExecutor`（校验主体、工具名、参数后执行）/ `AgentRuntime`（控制循环、预算与状态提交）；接口位于 `internal/`，未发布为 SDK。
- 工程边界（ADR-0007）：单 `cmd/api` 进程 = HTTP 模块 + 内存仓储 + 单消费者后台 runtime；队列容量 32，仓储最多 1000 任务，满返 503；handler 不调 Agent Loop，只提交 task ID。
- 状态机：PENDING→RUNNING→SUCCEEDED/FAILED/CANCELLED；`Claim`/`Finish` 在锁内校验转移；取消先在仓储落 CANCELLED 再通知 worker，迟到 Append/Finish 被拒；20 并发认领者实验仅 1 个成功。
- 有限执行默认值：最多 6 步、4 次工具调用、任务总超时 5s、单次模型/工具调用 1s；错误码 MAX_STEPS_EXHAUSTED、TOOL_BUDGET_EXHAUSTED、TASK/LLM/TOOL_TIMEOUT；重复调用（工具名+规范化 JSON 参数）→ REPEATED_TOOL_CALL。
- 授权在服务端：固定 Principal（demo/developer）、query_metrics 白名单、资源限 payment-service、时间窗限 30m；模型建议 rollback 同样走 ToolExecutor → TOOL_DENIED；请求体多传 tenant_id 直接拒绝；Get/Cancel 租户不匹配一律 404。
- 一次 Provider 响应必须恰好含 ToolCall 或 Final，否则 INVALID_DECISION；Final 的 evidence_ids 必须真实存在于本任务 Evidence 集合。
- 实验环境 Linux amd64 + Go 1.26.2 + Gin v1.10.0，12 组故障实验全部通过；全仓语句覆盖率 75.5%（Agent 88.0%、工具包 57.1%），作者拒绝四舍五入为"80%"。
- 明确未做：PostgreSQL/Checkpoint/Outbox/租约/MCP/审批/真实 LLM/成本治理；进程崩溃内存全丢（重启查旧任务 404 已实验确认）；未解决 Prompt Injection。

## Important Claims（重要论断）

### Claim 1：取消不是 bool，是并发排序点

仓储在锁内先置 CANCELLED，旧循环迟到的写入被拒；成功提交与取消靠抢锁二选一，两种结果都要能向调用方解释——比在循环里放 `cancelled bool` 可靠。

### Claim 2：证据 ≠ 因果

Mock 返回 error_rate=0.08 是人工夹具（synthetic=true）；W01 只校验 Final 引用的证据 ID 真实存在，"指标异常"推不出"某发布导致异常"，诊断质量留给数据集评测。

### Claim 3：模型输出不是授权凭据

许可只来自服务端（固定 Principal + 白名单 + 资源/时间窗限制）；模型建议 rollback 与任何工具调用走同一 ToolExecutor 校验。

### Claim 4：接口可替换 ≠ 可靠性自动出现

W02 接 MCP 只换工具适配器，但持久化、租约、审批每个阶段都需要新实现与新故障实验。

## Concepts Introduced（引入的概念）

- Agent 任务状态机（PENDING/RUNNING/SUCCEEDED/FAILED/CANCELLED，终态不可覆盖）
- 合作式取消（Go context 是信号而非强杀；拒绝"起泄露 goroutine 假装及时返回"）

## Entities Mentioned（提及的实体）

- Aegis（作者的运维诊断 Agent 教学原型，Go 实现，未单独立页）

## Implications（影响／启示）

给后端转 Agent 工程师的五条原则：业务状态受控更新、耗时操作独立生命周期、权限不信请求方自述、重试必须理解副作用、关键结论要有可复现证据——模型带来非确定性，后端基础反而更重要（信源观点）。

## Limitations（局限）

- 全部本地合成 Mock，无真实 LLM 与生产事故；性能结论缺失（无 P95/QPS/成本统计）。
- 单进程终态保护：无租约 epoch 与外部工具 fencing，本地取消不能撤销外部系统已接受的变更。

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]（本信源是该概念的"生产边界"工程印证：停止多源性、响应完整性、宿主校验在状态机/预算/授权层的具体化）

## Source（信源）

- `raw/sources/ai/2026-10-15-agent-loop-production-boundaries.md`
