---
id: wiki-concept-retry-governance
type: concept
title: 重试治理（Retry Governance）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - reliability
  - architecture
  - ai-agent
sources:
  - raw/sources/architecture/2026-10-31-agent-platform-retry-resilience.md
  - raw/sources/architecture/2026-10-31-architecture-science-and-art-42-rules.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/concepts/idempotency-design.md
  - wiki/sources/agent-platform-retry-resilience.md
---
# 重试治理（Retry Governance）

## Definition（定义）

在分布式调用链（如 Agent 平台的 `API → Scheduler → Worker → ToolExecutor → MCP/LLM`）中，对"重试"这一额外工作进行系统性约束的治理框架。核心主张：**一次业务操作必须有唯一的重试所有者**，并同时受五条边界约束——时间（还有没有完成价值）、次数（还能发几次）、额度（系统允许多少额外尝试）、并发（资源还能承受多少工作）、副作用语义（再执行一次是否安全）。可靠性不是"多试几次"，而是限定额外工作。

## Why It Matters（为什么重要）

依赖延迟升高时最危险的不是完全不可用，而是"仍偶尔成功但每次占用更久"：各层独立重试会在下游容量最低时制造乘法放大（三层各重试 3 次 → 最深层可达 64 次尝试），把局部慢调用演变为全平台排队与恢复冲击。重启、扩容不能切断反馈环——重启反而丢失本地状态触发接管，形成新的重试层。

## Core Characteristics（核心特征）

1. **术语先统一**：逻辑操作（Operation，`operation_id` 贯穿恢复）≠ 网络尝试（Network Attempt）≠ Worker 接管（Takeover，不能重置尝试数）≠ Agent 再规划（新业务决策）。`max_attempts` 统一表示含首次的总尝试次数；SDK 重连、传输层重发等 hidden retry 必须分别审计。
2. **五条边界分开治理**：时间（Task Expiry / Step Deadline / Attempt Timeout / Connect Phase Timeout / Queue Max Age 五类时间分开定义）、次数（持久化 operation attempt 预留）、额度（按依赖和工具类别隔离的 Retry Budget）、并发（准入控制/有界队列/Bulkhead/连接池）、语义（幂等协议、结果查询、未知结果状态）。
3. **错误分类决定重试资格**：参数错误/取消/截止 → 终止；Bulkhead 满/Breaker Open/预算不足 → 本地终止（不进重试循环、不污染熔断统计）；429 → 尊重 Retry-After 延期；连接断开 → 结果未知，写操作先查结果。
4. **预算与退避解决不同问题**：Full Jitter 打散时间（解决同步波）但不限制总量；Retry Budget 限制额外尝试数量但不解决时间分布。两者必须同时存在。
5. **准入管首次流量、预算管额外尝试**：首次流量已超容量时，重试比例为零仍会过载；Bulkhead 语义是快速失败而非排队；退避期间不占用调用槽位。
6. **熔断只看真实下游结果**：本地拒绝（预算不足、舱壁满、参数错误）不计入下游失败率；恢复必须渐进放量；熔断键为 `dependency + tool_class + operation_semantics`。

## Structure（结构）

五边界的机制映射（信源默认策略矩阵，需按工具所有者校准）：

| 边界 | 要回答的问题 | 主要机制 |
|---|---|---|
| 时间 | 这次操作还有没有完成价值？ | Task/Step Deadline、Attempt Timeout、Queue Max Age |
| 次数 | 同一操作最多还能发送几次？ | 持久化的 operation attempt 预留 |
| 额度 | 系统整体允许多少额外尝试？ | 按依赖和工具类别隔离的 Retry Budget |
| 并发 | 下游和本地资源还能承受多少工作？ | Admission Control、有界队列、Bulkhead、连接池 |
| 语义 | 再执行一次会不会重复产生副作用？ | 幂等协议、结果查询、未知结果状态 |

调用链各层的职责与"禁止的隐式行为"：API/Orchestrator 管租户准入与幂等接单（禁止因 Worker 超时重复创建任务）；Scheduler 管 Lease/Checkpoint（接管时禁止重置尝试数或 Deadline）；Worker ToolExecutor 是唯一业务重试所有者（禁止工具内部再包一层未计量业务重试）；SDK 只做协议适配（禁止未审计自动重放）；Proxy/Mesh 做传输兜底（禁止与应用独立重试同一业务动作）；工具服务负责幂等与结果协议（禁止把客户端超时误判为从未执行）。

## How It Works（运作方式）

**Retry Budget（按首次记账的数量预算）**：首次尝试不消耗额度，每个首次网络尝试补充 β 份额度，重试实际发出时消耗一份。设初始化额度 B₀、累计首次尝试 N、已消耗重试额度 R，则 R ≤ B₀ + βN，调用放大率 A = 1 + R/N ≤ 1 + β + B₀/N。桶按 `dependency + tool_class` 隔离且初始为空——初始满桶会让每个新 Pod 获得免费突发。进程重启丢失信用，行为偏保守，比例上界不随副本数变成十倍。

**Full Jitter 退避**：b_k = min(b_max, b₀·2^(k-1))，sleep_k ~ U(0, b_k)。指数窗口避免持续高频敲打，随机等待降低同步波。实现要处理指数溢出、计时器取消、最大尝试数与 Retry-After 的交互（服务端要求等待 R 时在 max(R, sampled_backoff) 后加非负扰动，不能向下抖动提前发送）。

**Bulkhead（快速失败语义）**：`TryAcquire` 立即拒绝而非排队；获取槽位后仍要再检查 Context（取消与成功获取可并发发生）；槽位仅在网络调用和必要响应体读取期间持有，所有返回路径释放；MCP/LLM/外部写操作使用独立资源池。

**熔断器**：Closed 正常记录有效结果 / Open 拒绝新调用 / Half-Open 少量受控探测（限制并发与速率，失败回 Open，成功渐进放量）。示例起点：10s 窗口、至少 50 样本、失败率 >50% 打开、5s 后探测、半开并发 1（均为建议值非默认值）。

**ToolExecutor 12 步执行链**（顺序即闸门优先级）：取消/到期检查 → 上次结果资格验证与退避计算 → 原子预留持久化 attempt 序号（校验 Lease/Fencing）→ 预留 Retry Budget → 记录首次尝试 → 请求 Breaker 许可 → 非阻塞获取 Bulkhead → 再查取消/Deadline → 创建子 Context 执行受治理调用 → 读响应释放舱壁 → 有效结果交 Breaker 记录 outcome → 成功提交 Checkpoint / 失败保留错误进入下一轮。

**两个不可消除的崩溃窗口**：持久化尝试预留与网络发送之间（保守消耗一次机会）；远程副作用提交与本地记录完成之间（可能形成结果未知）。恢复时不盲目重放写操作，用稳定幂等键、工具端查询或人工处理。

## Relationships（关系）

### Related Concepts（相关概念）

- [[durable-execution|持久执行]]：重试治理管"额外工作"（时间/次数/额度/并发/语义五边界），持久执行管"崩溃恢复"（attempt 预留跨接管累计、fencing token、Checkpoint）。本信源为 durable-execution 补充了"跨 Worker 恢复不得重置尝试数"的持久化字段清单（`attempt_reserved_count`、`policy_version`、`operation_id`/`idempotency_key`、`operation_deadline`/`next_run_at`、`last_error_class`/`outcome_state`、`lease_owner`/`fencing_token`、`last_attempt_at`/`last_provider_request_id`）。
- [[idempotency-design|幂等设计]]：幂等键是服务端协议而非请求头一行——唯一约束、请求摘要比对、执行中/未知明确状态、覆盖恢复窗口的保留期、可选 fencing；键派生自 `tenant_id + task_id + step_id + operation_id` 不含 attempt 序号，接管/重启不得改变键。

### Distinctions（区分）

- 与**单层重试库**（如 Tenacity 的 wait_exponential）不同：重试治理是跨调用链各层的所有权与边界划分，单层库只解决时间分布，不解决乘法放大、接管重置、结果未知。
- 与**服务网格/代理层重试**（如 Envoy max_retries）不同：Envoy 的 max_retries 是本地并发语义、retry_budget 是本地并发控制，不等价于全局额度预算；代理层重试不能替代应用层唯一所有者。
- 与**超时控制**不同：单次请求超时只约束"这一尝试等多久"，重试治理的五类时间边界约束整条链路（Task/Step/Attempt/Connect/Queue）。

## Evolution（演进）

- 2026-10-31：本页由单一信源（agent-platform-retry-resilience）建立。框架包含：五边界治理、Retry Budget 按首次记账、Full Jitter、错误分类、熔断只看真实下游结果、12 步执行链、跨 Worker 持久化字段、A–F 消融实验与 6 阶段上线路线。confidence: medium——目前为单一信源，且文中数值明确声明为"起始模板需校准"。
- 2026-10-31：新增互证信源（architecture-science-and-art-42-rules 法则 36-38）——通用架构语言对限流/熔断/隔离三件套的定义：限流在容量边界前控制入口（被挡住的请求提示/入队/降级由业务决定）、熔断让异常依赖暂时退出调用链（关闭/打开/半开）、隔离限制一个故障最多占用多少资源。与本页 Bulkhead/熔断器机制一致，互为印证；Agent 平台框架与数值不变，confidence 维持 medium。

## Open Questions（开放问题）

- 集中配额/租户公平（跨 Pod 全局绝对额度）的一致性实现：信源仅给出"批量租借须中心原子发放"的原则，未给出具体协议。
- β 值与各工具类别的推荐校准值：信源未确立，需按业务 SLO 实测。
- 熔断半开探测速率限制与多实例叠加的全局协调：信源列为"必要时"问题，未给出方案。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-agent-platform-retry-resilience.md`（五边界框架、乘法放大计算、Little 定律推演、Retry Budget 记账与上界证明、Full Jitter 公式、错误分类表、熔断状态机、12 步执行链、持久化字段清单、验收不变量、A–F 消融实验设计、6 阶段上线路线）

## Related Knowledge（相关知识）

- [[durable-execution|持久执行（概念页）]]
- [[idempotency-design|幂等设计（概念页）]]
- [[agent-platform-retry-resilience|从重试风暴到可控恢复（信源页）]]
- [[agent-long-task-reliable-execution|AI Agent 长任务可靠执行（信源页）]]
- [[async-task-system-design|异步任务系统怎么设计（信源页）]]
