---
id: wiki-source-agent-platform-retry-resilience
type: source
title: 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - architecture
  - reliability
  - ai-agent
sources:
  - raw/sources/architecture/2026-10-31-agent-platform-retry-resilience.md
related:
  - wiki/concepts/retry-governance.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/idempotency-design.md
---
# 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计

## Overview（概览）

以 Aegis Agent Platform 的 `API → Scheduler → Worker → ToolExecutor → MCP/LLM` 调用链为背景的系统设计长文（约 1.7 万字）。核心结论：可靠性不是"多试几次"，而是限定额外工作——一次业务操作必须有**唯一的重试所有者**，并同时受时间、次数、额度、并发、副作用语义**五条边界**约束。给出默认策略矩阵、ToolExecutor 12 步执行链、Go 预算/舱壁示例、Prometheus 指标清单、A–F 消融实验设计与 6 阶段上线路线。

## Key Facts（关键事实）

- **乘法放大**：三层各配置"首次后再重试 3 次"（即 4 次），最深层理论上可达 (1+3)³ = 64 次尝试；三层均 `max_attempts=3`（含首次）则为 3³ = 27。无 Deadline、全部失败且各层独立重试时的上界。
- **Little 定律容量推演**：1,000 次/秒 × 占用 80ms → 在途约 80；占用退化到 2s → 在途 2,000，连接池瞬间耗尽。加连接数不等于加容量；P99 不能直接当容量依据。
- **五类时间边界分开定义**：Task Expiry / Step Deadline / Attempt Timeout / Connect Phase Timeout / Queue Max Age。每次尝试前检查剩余时间能否覆盖"退避+最低有价值执行+收尾"，注定失败的尝试应直接终止或持久化延期。
- **Retry Budget 按首次记账**：首次补充 β 份额度、重试消耗一份，放大率上界 A ≤ 1+β；桶按 `dependency + tool_class` 隔离且**初始为空**——初始满桶会让每个新 Pod 获得免费突发。
- **Full Jitter 公式**：b_k = min(b_max, b₀·2^(k-1))，sleep_k ~ U(0, b_k)。解决同步波，不保证减少总请求量；Tenacity 中 `wait_random_exponential` 与 `wait_exponential` 不可混用。
- **错误分类决定重试资格**：参数错误/取消/截止 → 终止；Bulkhead 满/Breaker Open/预算不足 → 本地终止（不进重试循环、不污染熔断统计）；429 → 尊重 Retry-After 延期；连接断开 → 结果未知，写操作先查结果。
- **幂等键是服务端协议**：唯一约束、请求摘要比对、明确"执行中/未知"状态、覆盖恢复窗口的保留期、可选 fencing；键派生自 `tenant_id + task_id + step_id + operation_id`，不含 attempt 序号。
- **熔断只看真实下游结果**，恢复必须渐进放量；熔断键为 `dependency + tool_class + operation_semantics`，不按任务 ID。
- **跨 Worker 恢复靠持久化**：`attempt_reserved_count`（跨接管累计防止次数重置）、`policy_version`、幂等键、fencing token。
- **Envoy 的 max_retries/retry_budget 是本地并发语义**，不等价于全局额度预算；K8s 探针职责分清（Liveness/Readiness/Startup）。

## Important Claims（重要论断）

### Claim 1：一次业务操作必须有唯一的重试所有者

业务重试收敛到 Worker 内的 ToolExecutor。API/Orchestrator 只做租户准入与幂等接单；Scheduler 管 Lease/Checkpoint/过期；SDK 只做协议适配不得未审计自动重放；Proxy/Mesh 做传输兜底不得与应用独立重试同一业务动作。各层"禁止的隐式行为"被显式列出。

### Claim 2：最危险的不是依赖完全不可用，而是"仍偶尔成功但每次占用更久"

依赖延迟升高触发资源占用正反馈：请求占用时间增加 → 在途/队列/租约增长 → 超时取消重试增加 → 连接/槽位/CPU 耗尽 → 健康工具被拖慢。重启 Worker 会丢失本地状态并触发任务接管，形成新的重试层。

### Claim 3：退避与预算解决不同问题，不可混淆

Full Jitter 解决同步波（打散时间），不限制总数量；Retry Budget 限制额外尝试数量，不解决时间分布。两者需同时存在。

### Claim 4：两个不可消除的崩溃窗口

持久化尝试预留与网络发送之间（保守消耗一次机会）；远程副作用提交与本地记录完成之间（可能形成结果未知）。恢复时不应为"补回次数"盲目重放写操作。

### Claim 5：验收不变量比曲线更重要

自动化测试必须覆盖：首次尝试只记账一次、初始为空桶对任意执行前缀满足 R ≤ 0.2N、退避期间不占用舱壁、接管后总尝试数/Deadline/策略版本/幂等键保持一致、写操作已提交但响应丢失不产生重复副作用等。

## Concepts Introduced（引入的概念）

- [[retry-governance|重试治理（Retry Governance）]]（本信源核心：唯一所有者 + 五边界 + 预算 + 退避 + 熔断 + 舱壁的完整框架）
- [[durable-execution|持久执行]]（跨 Worker 恢复、fencing token、attempt 预留的印证与补充）
- [[idempotency-design|幂等设计]]（幂等键服务端协议五要素的独立印证）

## Entities Mentioned（提及的实体）

- Aegis Agent Platform（示例平台，未建页）
- Envoy（Proxy/Mesh 本地并发语义）
- Tenacity（Python 重试库：wait_exponential vs wait_random_exponential）
- Kubernetes（Liveness/Readiness/Startup Probes）
- Chaos Mesh（网络故障注入）
- Prometheus（指标体系）
- AWS Builders' Library（超时/重试/抖动原则参考）

## Implications（影响／启示）

- "唯一重试所有者 + 五边界"框架可直接迁移到任何 Agent 平台与任务编排系统，与本 Wiki 的 durable-execution 概念互补：前者管"额外工作"，后者管"崩溃恢复"。
- 策略矩阵 + 12 步执行链 + 验收不变量的三件套结构，是沉淀可靠性设计的标准格式。
- 消融实验设计（A–F 组）与"固定实验协议"（先测可持续容量 C、open-loop 压测、恢复判定预先固定）是验证可靠性方案的严谨范式。

## Limitations（局限）

- 单一公众号信源，Aegis 平台细节为作者示例性设计，未给出生产实测数据（除文中标注为"建议起点"的熔断阈值）。
- 文中给出的默认值（如 max_attempts 2–3、熔断 10s 窗口/50% 失败率）明确声明是"起始模板，需按工具所有者校准"，不可直接照搬。
- 未覆盖成本测算与跨租户公平的具体实现（集中配额被列为"扩展阶段"）。

## Related Knowledge（相关知识）

- [[retry-governance|重试治理（概念页）]]
- [[durable-execution|持久执行（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[agent-platform-architecture|高性能弹性扩展智能体中台架构]]（另一 Agent 平台架构信源，关注点在组件选型而非可靠性）
- [[agent-long-task-reliable-execution|AI Agent 长任务可靠执行]]（Go+PG 状态机路线，fencing/对账的独立印证）

## Source（信源）

- `raw/sources/architecture/2026-10-31-agent-platform-retry-resilience.md`
