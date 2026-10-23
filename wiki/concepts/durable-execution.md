---
id: wiki-concept-durable-execution
type: concept
title: 持久执行（Durable Execution）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - ai-agent
  - architecture
sources:
  - raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md
  - raw/sources/products/2026-10-17-pi-durable-architecture.md
  - raw/sources/ai/2026-10-21-agent-long-task-reliable-execution.md
  - raw/sources/architecture/2026-10-22-async-task-system-design.md
  - raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md
related:
  - wiki/entities/pi.md
  - wiki/sources/spring-async-to-task-table.md
  - wiki/sources/async-task-system-design.md
  - wiki/concepts/task-run-step-event-model.md
  - wiki/concepts/agent-loop.md
---
# 持久执行（Durable Execution）

## Definition（定义）

持久执行指 Agent（或长时任务系统）在进程崩溃后能从断点**精确**继续运行的能力：不需人工再输入"继续"，工具结果与流式输出不丢失，应用状态被持久化并可可靠恢复。核心要求是"先写存储、后可见"——只有已提交的状态才可观察，没有旁路内存通道。

## Why It Matters（为什么重要）

任何长时间运行、脱离人实时监控的 Agent 都必须具备这种能力；模型本身已足够不可预测，外层任务编排与故障恢复至少应稳定、可理解。过去每个 Agent 应用都在重复实现对话记录、任务持久化、故障恢复与会话分叉，通用持久执行框架可直接替代这部分外围代码（有开发者估计可替代一半）。

## Core Characteristics（核心特征）

1. **崩溃点无关恢复**：进程死在被执行操作（"效应"）开始前、执行中或结束后，重启后都能到达一致终态。
2. **幂等处理执行中崩溃**：执行前先拿到外部系统的 key/ID 并落库，重启用同一 ID 查询/启动，避免重复副作用（如重复扣款）。
3. **全量历史可保留**：对话转录、工具执行、任务状态不全部进内存，可支撑长驻多年的 Bot。
4. **可部署性广**：同一套原语可跑在 Vercel、Cloudflare Durable Objects、E2B、笔记本乃至手机上（Pi Durable 个案）。

## Structure（结构）

Pi Durable 的两个基本原语（当前唯一详细信源）：

1. **效应三明治任务**：执行前写入意图记录（输入已求值验证）→ 执行效应（支持幂等键）→ 存储结果；任务可嵌套派生并等待子任务结束。
2. **版本化文档存储**：类 MongoDB 的 JSON 文档，通过 Proxy 把变更自动记录为类 JSON Patch 操作（RFC JSON Patch 的 Agent 场景优化变体）；文档可与转录记录任意位置关联，支持"回到过去看旧版本"与"只看最新版"两种时间回溯。

架构深拆信源（pi-durable 1.0–1.3）补充的五层结构：Storage（极简接口：写一批、按编号查；官方后端 Memory/SQLite/JSONL/Cloudflare Durable Object，附一致性测试套件）→ Session（纪律层，所有写入排队批量原子提交）→ Documents（底稿+增量；每对话自带 pi.agent/pi.live/pi.inbox/pi.usage/pi.provider 五文档）→ Tasks（每任务一个小状态机，任务与对话组成所有权树：中止向下传、父收工先等子；支持热重载）→ Harness（内置 generation/tool/compaction 三任务，其余走扩展）。一次 run 实为 generation 任务链，工具调用是同批创建的持久子任务。

通用异步任务系统形态（Java/批量导入信源，第 4 信源）：把同一套不变量落到业务任务系统——任务表（task_id/lease_owner/lease_expire_at/attempt 等）、状态机（PENDING/RUNNING/SUCCEEDED + RETRY_WAIT/FAILED/CANCELLED 旁路，`RUNNING→PENDING` 仅租约过期且执行者失联才允许）、条件 UPDATE 领取（影响行数=1 才算抢到）、完成更新带 owner+version（旧执行者影响行数为 0 即 fencing 落地）、幂等键 `(task_id, row_number)`、错误三级分类（RETRYABLE 退避重试 / PERMANENT 不重试 / MANUAL 结果不确定冻结待人工——对应 Go+PG 的 PAUSED_INDOUBT/PAUSED_HUMAN）、协作式取消（CANCEL_REQUESTED 批次边界检查，不强杀线程）、Outbox 同事务提交（MQ 重复无妨，DB 条件更新定执行权）。五个"可"总结与六不变量互为表里：状态可追踪、执行权可过期、副作用可去重、失败可分类、积压可控制。

数据库队列实现形态（Go + PostgreSQL 信源，与 Pi 路线独立互证）：把工作流进度与执行权从进程生命周期解绑——调度器管短暂执行权，持久化层管可恢复历史。关键机制：状态机（QUEUED/RUNNING/WAITING_TOOL/PAUSED_INDOUBT/PAUSED_HUMAN/COMPLETED/FAILED）；Worker 经条件 UPDATE 竞争并获递增 fencing_token，每次状态推进校验 (run_id, lease_owner, fencing_token, version)；出网三段式 Tx1（写 OUTBOUND_INTENT）→ HTTP（稳定幂等键）→ Tx2（结果+checkpoint+outbox 原子提交）；结果未知一律冻结进 PAUSED_INDOUBT 走对账而非盲目重试；LLM 已确定的工具决策必须持久化、恢复时不得重新采样。该信源特别纠正一个认知误区：fencing 只能阻止旧 Worker 写受控存储，不能阻止它出网——外部副作用的 exactly-once 没有任何单一机制能证明，只能选下游幂等、查询对账或人工介入。

## How It Works（运作方式）

Harness 里发生的每件事都是一个任务（效应三明治）：生成 LLM 回复=创建任务（保存"即将调用"记录→调用→持久化回答）；工具调用同理。重启后扫描存储，发现等待执行的操作接着运行。不可撤销效应（删文件、刷卡）要求效应本身能与持久性系统组合。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：持久执行是 Agent Loop 跨进程存活的运行层保障。

### Distinctions（区分）

- 与**事件溯源**不同：Pi Durable 明确不采用事件溯源（认为其带来很多问题），而是用"意图→执行→结果"三明治 + 版本化文档。
- 与简单会话快照（如复制会话 JSON 换机重启）不同：后者无任务级恢复与幂等保证。

## Evolution（演进）

- 2026-10：Pi Durable 随 Pi 1.0 发布，架构历经八轮迭代，约 1.2 万行代码；此前 Hermes、OpenClaw、AMP（orb）等各有专用持久化方案，但无通用可复用框架（受访者观点）。
- 2026-10-21：Go+PG 工程信源把持久执行落到通用后端技术栈（状态机+fencing+outbox+对账），并给出与 Temporal/DBOS 的选型判据——"不存在超过 30 分钟就必须用 Temporal 的普适阈值"。同构的业务系统简化版亦见于 Java 任务表+Worker 方案（条件 UPDATE 抢占、心跳回收、at-least-once+幂等）。
- 2026-10-22：通用异步任务系统信源（第 4 信源）从业务任务角度独立复现同一套构件（租约 fencing/幂等键/MANUAL 冻结/协作取消/Outbox），至此 Pi 框架、Go+PG Agent 长任务、Java 业务任务三条路线互证。
- 2026-10 中下旬：pi-durable 半个月从 1.0 到 1.3——1.2 性能改造（500 任务连环结算 12 秒→50 毫秒）并向"工具平台"生长（工具嵌套调用、结构化输出、deferred 工具经 BM25 检索按需加载、code mode 脚本本身是持久任务）；1.3 表前缀支持多存储共享库/DO。崩溃恢复语义细化成速查表（流式中断转 aborted 重发、replay safe 重跑、memo 首写胜出不二次审批、扩展消失则任务阻塞待装回）。

- 2026-10-23：教学信源（agent-from-scratch 第 5 章，第 5 信源）从事件溯源路线给出对照视角：明确区分状态重放 ≠ 模型重跑 ≠ Durable Execution Replay（本章只实现第 1 种），列出四类失败窗口（模型调用前崩溃/工具已执行结果未持久化/事件已存通知未发/代码升级后重放不兼容），并给出六步生产化路径（内存事件仓库→持久 append-only→CAS+幂等命令→Worker 租约+心跳→事务 Outbox+恢复协调→checkpoint/版本化/回放兼容测试）——与 Go+PG/Java 两信源的生产机制一一对应；同时与 Pi Durable"明确不采用事件溯源"形成路线对照，其"事件溯源是设计选择、非 Agent 必备"的取舍判据（长任务恢复/审批/审计/复盘才值得引入）补充了本页 Open Questions 中"与事件溯源路线系统性对比"的一侧证据。

## Open Questions（开放问题）

- 性能开销（Proxy 记录被作者自称"很慢的 hack"）与大规模生产验证：当前信源未确立。
- 与事件溯源路线的系统性对比：仅有受访者定性判断。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md`
- Source: `raw/sources/products/2026-10-17-pi-durable-architecture.md`（印证并展开：原子提交公理、五层架构、四存储后端、崩溃恢复速查表、二开六方向）
- Source: `raw/sources/ai/2026-10-21-agent-long-task-reliable-execution.md`（独立技术栈印证：六条不变量、fencing 局限、出网三段式、IN_DOUBT 冻结对账、Outbox 至少一次+消费者幂等、上线验收清单）
- Source: `raw/sources/architecture/2026-10-22-async-task-system-design.md`（第 4 信源：业务异步任务系统完整清单——条件领取/租约/幂等/错误三级/协作取消/Outbox/背压）
- Source: `raw/sources/ai/2026-10-23-agent-software-architecture-task-run-step-event.md`（第 5 信源：三种 replay 区分、失败窗口 A–D、六步生产化路径、事件溯源取舍判据）
- 同构印证（未列入 sources）：`raw/sources/architecture/2026-10-20-spring-async-to-task-table.md`（Java 任务表+Worker，业务系统版同一套三要素）

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-1-0-durable-mcp-update|Pi 1.0 与 Pi Durable（信源页）]]
- [[pi-durable-architecture|Pi-durable 架构深拆（信源页）]]
- [[agent-long-task-reliable-execution|Agent 长任务可靠执行 Go+PG（信源页）]]
- [[async-task-system-design|异步任务系统设计（信源页）]]
- [[spring-async-to-task-table|任务表 + Worker（信源页）]]
