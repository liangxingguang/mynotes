---
title: AI Agent 长任务可靠执行：Go + PostgreSQL 状态机/Checkpoint/Fencing/对账
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/UpJRHy-PN1iEg1KxHXgTAw"
source_type: link
platform: 微信
captured: 2026-10-21
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-21-agent-long-task-reliable-execution.md
asset_ref: Assets/2026/10/agent-long-task-reliable-execution.md
---

# AI Agent 长任务可靠执行：Go + PostgreSQL 状态机/Checkpoint/Fencing/对账

# AI Agent 长任务可靠执行：基于 Go + PostgreSQL 的状态机、Checkpoint、Fencing 与可对账副作用

> 来源：https://mp.weixin.qq.com/s/UpJRHy-PN1iEg1KxHXgTAw
> 抓取时间：2026-10-21（web-fetch，browser 级）

> 面向 Go / Java 后端、分布式系统与云原生工程师。本文给出一套可审查的 PostgreSQL 事务协议、核心 Go 实现骨架、数据库不变量和故障注入验收方法。本文的代码是**参考实现**，并非完整可部署仓库。除非附带目标环境上的自动化测试记录，不应将文中的设计预期表述为"已经验证"。示例基于 PostgreSQL 15+、Go 和 `github.com/jackc/pgx/v5`；生产项目应锁定具体依赖版本。

## 1. 问题：Agent Loop 为什么会在长任务中丢进度

一个售后 Agent 可能需要读取订单、解释政策、调用风控、创建退货面单、登记工单并通知用户。一次执行持续数分钟到数天，途中可能等待审批、定时器、用户输入或外部系统恢复。

```go
for {
    decision, err := model.Next(ctx, history)
    if err != nil {
        return err
    }
    if decision.Done {
        return nil
    }
    result, err := tool.Call(ctx, decision.Tool, decision.Args)
    if err != nil {
        return err
    }
    history = append(history, result)
}
```

它在单进程里看似简单，却无法回答以下问题：

- Pod 在工具响应返回、结果尚未写库时崩溃，远端到底有没有完成操作？
- Worker 因 GC、网络分区或数据库抖动丢失租约后，旧进程苏醒并继续执行怎么办？
- Checkpoint 写入成功、通知尚未发布，如何保证事件最终会被发送？
- 恢复后 LLM 输出不同的下一步，如何避免对同一个业务意图执行两次不同的副作用？

根因不是 Go 协程"不可靠"，而是把**工作流进度和执行权隐式绑定到了进程生命周期**。Kubernetes 维持期望副本数，不承诺某次内存循环持续存在。

正确的职责划分是：

- 调度器管理短暂的**执行权**；
- 持久化 Workflow 管理可恢复的**历史和状态**；
- Agent 决策器只提出下一步；
- 工具适配器在审计、授权和幂等边界内执行副作用。

（组件：API/创建 Run → PostgreSQL；Worker A/B 通过 Claim/Heartbeat/CAS 竞争执行权；Outbox Relay → 消息系统 → 幂等消费者；Reconciler ↔ 外部系统做查询/对账。）

## 2. 目标、保证与明确不保证的事

| 主题 | 本文目标保证 | 本文不保证 |
| --- | --- | --- |
| 数据库状态 | 单个 Run 的版本单调推进；过期 fence 不能提交状态 | 阻止旧进程对不受控外部 API 发请求 |
| 进度恢复 | 从最后一次已提交 checkpoint 恢复 | 恢复未提交的内存计算 |
| 工具副作用 | 有幂等/查询契约时安全恢复；结果未知时冻结并对账 | 对任意 HTTP API 实现端到端 exactly-once |
| 事件投递 | 业务状态与待发事件原子持久化；至少一次投递 | 消费者天然恰好一次处理 |
| 高可用 | 租约失效后可由其他 Worker 接管 | PostgreSQL 不可用时继续推进工作流 |

所有时间判断使用 PostgreSQL 的 `clock_timestamp()`，而非 Worker 本地时钟。一次数据库事务只覆盖 PostgreSQL 内的行、快照、账本和 Outbox；它**不覆盖** HTTP 调用或消息 Broker。外部请求绝不能发生在持有任务行锁的事务中。

## 3. 先定义不变量，再写状态机

可靠实现的核心不是"多写几个重试"，而是让每一个持久化状态都能回答：谁有执行权、能否出网、如何恢复。

### 3.1 状态、执行权与恢复动作

| 状态 | 是否持有 lease | 是否可被 Claim | 是否允许直接出网 | 恢复动作 |
| --- | --- | --- | --- | --- |
| `QUEUED` | 否 | 是，达到 `next_attempt_at` 后 | 否 | Claim 后加载 checkpoint |
| `RUNNING` | 是 | 仅 lease 过期后 | 是，但先持久化出网意图 | 决策、写 checkpoint 或进入工具阶段 |
| `WAITING_TOOL` | 是 | 仅 lease 过期后 | 否 | 查询下游或进入结果未知 |
| `PAUSED_INDOUBT` | 否 | 否 | 否 | 自动/人工对账后显式恢复 |
| `PAUSED_HUMAN` | 否 | 否 | 否 | 审批、补充信息或人工终止 |
| `COMPLETED` / `FAILED` | 否 | 否 | 否 | 仅查询、审计与归档 |

状态流转：`QUEUED --claim--> RUNNING --checkpoint/heartbeat 自循环--> RUNNING --Tx1 提交出网意图--> WAITING_TOOL --Tx2 提交确定结果--> RUNNING → … → COMPLETED`；超时/崩溃/接管使 RUNNING/WAITING_TOOL 可被重新 claim；可重试错误+backoff 回 QUEUED；审批或预算拦截进 PAUSED_HUMAN；结果未知进 PAUSED_INDOUBT；不可恢复错误进 FAILED。

### 3.2 必须成立的不变量

1. 仅 `RUNNING`、`WAITING_TOOL` 可持有 lease；其他状态必须清空 `lease_owner` 与 `lease_expires_at`。
2. 每一次可恢复状态推进都同时校验 `(run_id, lease_owner, fencing_token, version)`；需推进版本时还要校验有效租约。
3. 每一个出网操作先持久化稳定的业务幂等键和请求快照，再允许网络发送。
4. 一个 `OUTBOUND_INTENT` 永远不等于"请求已发送"；未证明结果时默认不可自动重发。
5. 工具确定结果、Checkpoint、状态变化和业务事件必须在同一数据库事务中提交。
6. LLM 已确定的决策必须被持久化；恢复时不能仅靠重新采样得到新的工具参数。

## 4. Schema：把可验证约束放进 PostgreSQL

以下 DDL 的目的不是替代业务代码，而是把最容易被绕过的状态约束放入数据库。

```sql
CREATE TABLE agent_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'RUNNING', 'WAITING_TOOL',
      'PAUSED_INDOUBT', 'PAUSED_HUMAN', 'COMPLETED', 'FAILED')),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  fencing_token bigint NOT NULL DEFAULT 0 CHECK (fencing_token >= 0),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT '-infinity',
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 12 CHECK (max_attempts > 0),
  current_step_key text,
  checkpoint_schema_version integer NOT NULL DEFAULT 1,
  model_version text,
  prompt_version text,
  terminal_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL)),
  CHECK (
    (status IN ('RUNNING', 'WAITING_TOOL')) = (lease_owner IS NOT NULL)
  )
);

CREATE TABLE agent_checkpoints (
  run_id uuid NOT NULL REFERENCES agent_runs(id),
  version bigint NOT NULL CHECK (version > 0),
  state_json jsonb NOT NULL,
  state_hash bytea NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (run_id, version)
);

CREATE TABLE tool_executions (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES agent_runs(id),
  step_key text NOT NULL,
  tool_name text NOT NULL,
  idempotency_key text NOT NULL,
  request_json jsonb NOT NULL,
  request_hash bytea NOT NULL,
  status text NOT NULL CHECK (status IN
    ('OUTBOUND_INTENT', 'SUCCEEDED', 'FAILED', 'IN_DOUBT')),
  remote_resource_id text,
  response_json jsonb,
  error_code text,
  outbound_intent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  reconciled_at timestamptz,
  reconciliation_evidence jsonb,
  CHECK ((status IN ('SUCCEEDED', 'FAILED')) = (completed_at IS NOT NULL)),
  UNIQUE (run_id, step_key),
  UNIQUE (tool_name, idempotency_key)
);

CREATE TABLE outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE,
  run_id uuid NOT NULL REFERENCES agent_runs(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE consumed_events (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (consumer_name, event_id)
);

-- 分拆索引，使 queued 与过期租约两类 Claim 都可有效过滤。
CREATE INDEX agent_claim_queued_idx
  ON agent_runs (next_attempt_at, created_at, id)
  WHERE status = 'QUEUED';
CREATE INDEX agent_claim_expired_idx
  ON agent_runs (lease_expires_at, created_at, id)
  WHERE status IN ('RUNNING', 'WAITING_TOOL');
CREATE INDEX agent_runs_tenant_status_idx
  ON agent_runs (tenant_id, status, updated_at DESC);
CREATE INDEX outbox_pending_idx ON outbox (id) WHERE published_at IS NULL;
CREATE INDEX tool_executions_reconcile_idx
  ON tool_executions (outbound_intent_at)
  WHERE status IN ('OUTBOUND_INTENT', 'IN_DOUBT');
```

`version` 是 checkpoint CAS 版本；`fencing_token` 是每次领取时递增的执行代际，二者不能互换。数据库无法仅靠外键保证"每个版本都有且只有一个 checkpoint"，因此应用事务必须让主表版本更新和 checkpoint 插入原子提交。

`step_key` 必须由稳定的工作流节点 ID 和逻辑迭代号构成，例如 `return_label.create/attempt-1`。不可使用每次恢复随机生成的 UUID。`idempotency_key` 应由业务标识、操作类型和稳定 step key 派生；不能用临时 request ID 替代。

> `request_json`、checkpoint 与工具结果可能包含敏感信息。生产中应按数据分级进行字段加密或仅保存加密对象存储引用，日志不得输出明文。

## 5. Claim 与 Heartbeat：领取的是可失效执行权

在 `READ COMMITTED` 下，以行锁和 `SKIP LOCKED` 避免两个 Worker 同时取得同一 Run。为帮助优化器，分为"正常排队"和"过期接管"两条查询，再在应用中按明确优先级选择；下面给出单条可读性更强的参考 SQL。

```sql
WITH candidate AS (
  SELECT id
  FROM agent_runs
  WHERE
    (status = 'QUEUED' AND next_attempt_at <= clock_timestamp())
    OR
    (status IN ('RUNNING', 'WAITING_TOOL')
      AND lease_expires_at < clock_timestamp())
  ORDER BY created_at, id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE agent_runs AS r
SET status = CASE WHEN r.status = 'WAITING_TOOL'
                  THEN 'WAITING_TOOL' ELSE 'RUNNING' END,
    lease_owner = $1,
    lease_expires_at = clock_timestamp() + $2::interval,
    fencing_token = r.fencing_token + 1,
    attempt_count = CASE WHEN r.status = 'QUEUED'
                         THEN r.attempt_count + 1 ELSE r.attempt_count END,
    updated_at = clock_timestamp()
FROM candidate AS c
WHERE r.id = c.id
RETURNING r.id, r.status, r.version, r.fencing_token, r.current_step_key;
```

`WAITING_TOOL` 被接管后只能执行查询式对账或把 Run 暂停为 `PAUSED_INDOUBT`，不得直接重发工具请求。`SKIP LOCKED` 提高并发吞吐，但不提供严格 FIFO；多租户场景还需要配额、优先级、并发预算和防饥饿策略。

```sql
UPDATE agent_runs
SET lease_expires_at = clock_timestamp() + $4::interval,
    updated_at = clock_timestamp()
WHERE id = $1
  AND lease_owner = $2
  AND fencing_token = $3
  AND lease_expires_at > clock_timestamp()
  AND status IN ('RUNNING', 'WAITING_TOOL')
RETURNING id;
```

Heartbeat 必须包含 `lease_expires_at > clock_timestamp()`：否则租约已过期但尚未被新 Worker 领取时，旧 Worker 仍可能"复活"。续租失败后，应取消执行上下文、停止发起新副作用；取消只能协作式终止，无法撤销已经写入内核或网络栈的 HTTP 请求。

```go
package runtime

import (
    "context"
    "errors"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Claim struct {
    RunID   string
    Status  string
    Version int64
    Fence   int64
    StepKey *string
}

func ClaimRun(ctx context.Context, db *pgxpool.Pool,
    workerID, lease string, claimSQL string) (*Claim, error) {
    c := new(Claim)
    err := db.QueryRow(ctx, claimSQL, workerID, lease).Scan(
        &c.RunID, &c.Status, &c.Version, &c.Fence, &c.StepKey)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return c, nil
}
```

## 6. Checkpoint：主表版本、快照与事件必须原子推进

Checkpoint 不应只是聊天历史。至少包含：当前节点/游标、已经验证的 LLM 决策、工具参数 hash、已完成工具结果、预算消耗、所用模型及提示词版本、下一步待处理状态。读取时先读 `agent_runs.version`，再读取同版本 snapshot，并检查 `schema_version`；不能静默解析为零值。

```go
var ErrLostLease = errors.New("lease lost or checkpoint version changed")

type SaveInput struct {
    RunID           string
    WorkerID        string
    Fence           int64
    ExpectedVersion int64
    StateJSON       []byte
    StateHash       []byte
    SchemaVersion   int
    EventID         string // 调用方生成并在提交结果未知时复用
    EventJSON       []byte
}

func SaveCheckpoint(ctx context.Context, db *pgxpool.Pool, in SaveInput) (int64, error) {
    tx, err := db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
    if err != nil {
        return 0, err
    }
    defer tx.Rollback(ctx)

    var version int64
    err = tx.QueryRow(ctx, `
        UPDATE agent_runs
        SET version = version + 1,
            checkpoint_schema_version = $5,
            updated_at = clock_timestamp()
        WHERE id = $1 AND lease_owner = $2 AND fencing_token = $3
          AND version = $4 AND status = 'RUNNING'
          AND lease_expires_at > clock_timestamp()
        RETURNING version`,
        in.RunID, in.WorkerID, in.Fence, in.ExpectedVersion, in.SchemaVersion,
    ).Scan(&version)
    if errors.Is(err, pgx.ErrNoRows) {
        return 0, ErrLostLease
    }
    if err != nil {
        return 0, err
    }

    if _, err = tx.Exec(ctx, `
        INSERT INTO agent_checkpoints
          (run_id, version, state_json, state_hash, schema_version)
        VALUES ($1, $2, $3::jsonb, $4, $5)`,
        in.RunID, version, string(in.StateJSON), in.StateHash, in.SchemaVersion,
    ); err != nil {
        return 0, err
    }

    if _, err = tx.Exec(ctx, `
        INSERT INTO outbox(event_id, run_id, event_type, payload)
        VALUES ($1, $2, 'agent.checkpoint', $3::jsonb)`,
        in.EventID, in.RunID, string(in.EventJSON),
    ); err != nil {
        return 0, err
    }

    if err = tx.Commit(ctx); err != nil {
        return 0, err
    }
    return version, nil
}
```

### 6.1 提交结果未知时如何恢复

客户端收到 `Commit` 超时，不代表事务回滚。恢复代码必须使用同一个 `event_id` 查询：

1. 若 `(run_id, expected_version + 1)` checkpoint 和相同 `event_id` 都存在，视为已提交；
2. 若都不存在，才可使用**同一个**输入重试事务；
3. 若只存在其中一个，触发一致性告警并冻结 Run，而不是猜测。

不要因为遇到超时就重新生成 event ID；那会破坏"提交是否成功"的可判定性。

## 7. Fencing：阻止旧 Worker 写库，不魔法阻止旧 Worker 出网

时序：Worker A 心跳中断、lease 到期 → Worker B Claim 得 fence=42 → A 苏醒用 fence=41 做 CAS 写入 → 0 rows / ErrLostLease；B 的 fence=42 提交成功。

Fence 是受控存储写入的必要保护，但不是外部副作用的充分保护。旧 Worker 可能在最后一次成功心跳后暂停，在新 Worker 接管后才发送早已准备好的请求。要保护下游，至少需要以下之一：

- 下游验证单调 fence；
- 下游按业务幂等键持久去重，且去重窗口覆盖重试与对账周期；
- 下游可按幂等键查询最终结果；
- 缺少上述能力时，对未知结果执行保守冻结与人工审核。

任何"旧 Worker 不能写 PostgreSQL，所以不会造成外部重复"的说法都是错误的。

## 8. 工具副作用：Tx1、出网、Tx2 与对账

### 8.1 稳定意图先于出网

工具调用分为三段：Tx1（确认 lease/fence，写 OUTBOUND_INTENT，commit）→ HTTP（稳定 idempotency key）→ 可判定响应走 Tx2（工具结果+checkpoint+outbox 原子提交）；超时/断线/崩溃则标记 IN_DOUBT、释放 lease。

Tx1 只有在当前 checkpoint 已保存了同一工具调用决策后才能执行。`OUTBOUND_INTENT` 表示"可能出网"，不是"已经出网"。即使进程在 Tx1 后立即死亡，后续接管者也必须先查询或暂停。

```sql
BEGIN;
SELECT id
FROM agent_runs
WHERE id = $1
  AND lease_owner = $2
  AND fencing_token = $3
  AND lease_expires_at > clock_timestamp()
  AND status = 'RUNNING'
FOR UPDATE;
-- 无行则 ROLLBACK，禁止出网。

INSERT INTO tool_executions (
  id, run_id, step_key, tool_name, idempotency_key,
  request_json, request_hash, status)
VALUES (
  $4, $1, $5, $6, $7,
  $8::jsonb, $9, 'OUTBOUND_INTENT');

UPDATE agent_runs
SET status = 'WAITING_TOOL', current_step_key = $5,
    updated_at = clock_timestamp()
WHERE id = $1;
COMMIT;
```

唯一键冲突不是"允许重发"的信号。冲突说明该 step 已经存在账本记录：重新读取其状态，执行 Tx2、查询式对账或暂停。

### 8.2 Tx2：确定结果和进度必须同事务

以下是工具成功时的完整骨架。确定业务失败可以用同样模式写入 `FAILED` 与错误结果；不确定失败不能走这里。

```sql
BEGIN;
SELECT id
FROM agent_runs
WHERE id = $1
  AND lease_owner = $2
  AND fencing_token = $3
  AND lease_expires_at > clock_timestamp()
  AND status = 'WAITING_TOOL'
  AND current_step_key = $4
FOR UPDATE;
-- 无行：ROLLBACK；调用者不得覆盖新持有者的状态。

UPDATE tool_executions
SET status = 'SUCCEEDED', remote_resource_id = $5,
    response_json = $6::jsonb, completed_at = clock_timestamp()
WHERE run_id = $1 AND step_key = $4 AND status = 'OUTBOUND_INTENT';
-- 必须恰好影响 1 行，否则 ROLLBACK 并告警。

UPDATE agent_runs
SET status = 'RUNNING', version = version + 1,
    current_step_key = $7,
    checkpoint_schema_version = $8,
    updated_at = clock_timestamp()
WHERE id = $1 AND version = $9
RETURNING version;

INSERT INTO agent_checkpoints
  (run_id, version, state_json, state_hash, schema_version)
VALUES ($1, $10, $11::jsonb, $12, $8);

INSERT INTO outbox(event_id, run_id, event_type, payload)
VALUES ($13, $1, 'agent.tool_succeeded', $14::jsonb);
COMMIT;
```

实际 Go 代码应检查每个 `UPDATE` 的 `RowsAffected()`，并把版本、checkpoint version 与 `RETURNING` 值绑定，避免将传入参数当作事实。不能先将工具记为成功、再另开事务写 checkpoint；崩溃会留下"工具已成功但 Agent 不知道结果"的分叉。

### 8.3 未知结果：冻结比盲目重试安全

HTTP 超时、连接复位、5xx 和进程崩溃通常无法证明远端未执行。持有有效 lease 的 Worker 可按如下方式原子冻结；已失去 lease 时只能由新持有者完成此动作。

```sql
BEGIN;
SELECT id FROM agent_runs
WHERE id = $1 AND lease_owner = $2 AND fencing_token = $3
  AND lease_expires_at > clock_timestamp()
  AND status = 'WAITING_TOOL' AND current_step_key = $4
FOR UPDATE;

UPDATE tool_executions
SET status = 'IN_DOUBT', error_code = $5
WHERE run_id = $1 AND step_key = $4 AND status = 'OUTBOUND_INTENT';

UPDATE agent_runs
SET status = 'PAUSED_INDOUBT', lease_owner = NULL,
    lease_expires_at = NULL, updated_at = clock_timestamp()
WHERE id = $1;

INSERT INTO outbox(event_id, run_id, event_type, payload)
VALUES ($6, $1, 'agent.tool_in_doubt', $7::jsonb);
COMMIT;
```

对账器必须按 `tool_name + idempotency_key` 查询下游，保存证据、操作者/自动规则版本和对账时间。对账确认成功时，使用与 Tx2 等价的原子事务写入结果与 checkpoint；确认未执行且下游契约允许重试时，显式转回 `QUEUED`，不要删除原账本。对账无法判定时保持暂停并告警。

| 账本 / Run 状态 | 接管者动作 | 是否自动重发 |
| --- | --- | --- |
| `RUNNING`，没有未决工具 | 读取最新 checkpoint，继续 | 可以执行下一个已决步骤 |
| `WAITING_TOOL` + `OUTBOUND_INTENT` | 查询下游或冻结 | 否 |
| `PAUSED_INDOUBT` | 记录对账证据 | 默认否 |
| `SUCCEEDED` 且同事务 checkpoint 已提交 | 使用结果继续 | 否 |
| 终态 | 仅审计 | 否 |

## 9. LLM 决策的可复现边界

LLM 不必是确定性的，但外部副作用之前的**业务决策必须可重放**。每次即将调用工具时，checkpoint 至少持久化：

- 结构化决策原文及 JSON Schema 校验结果；
- 工具名、规范化后的参数、参数 hash 与 step key；
- 模型、供应商、提示词模板、工具 schema、策略规则版本；
- 输入上下文摘要 / hash、Token 使用量、预算与审批结果；
- 解析失败、内容过滤、人工改写等例外信息。

恢复时优先读取已决工具调用，不重新要求模型"再想一次"。只有尚未持久化决策的纯推理步骤可以重采样；它们也应受最大步数、Token 上限、总成本、超时和内容安全策略约束。

## 10. 错误分类、重试与人工接管

重试不是默认动作，而是根据错误是否证明"未产生副作用"决定。建议建立显式错误分类表：

| 类别 | 示例 | 动作 |
| --- | --- | --- |
| 可确定、无副作用 | 本地参数校验失败；下游明确拒绝且契约保证未执行 | 写确定失败或修正后重试 |
| 可重试暂态 | 数据库序列化失败；下游明确 `429` 且请求尚未被接受 | `QUEUED` + 指数退避 + jitter |
| 结果未知 | HTTP 超时、连接断开、进程崩溃、含糊 5xx | `PAUSED_INDOUBT`，先对账 |
| 永久失败 | 不可恢复业务规则、预算耗尽、审批拒绝 | `FAILED` 或 `PAUSED_HUMAN` |

退避时间应由数据库或确定性函数计算并写入 `next_attempt_at`，例如 `min(base * 2^attempt, cap) + bounded_jitter`。当 `attempt_count >= max_attempts` 时转人工或失败，不允许无限循环。对不同租户、工具和优先级应设置独立的并发与速率预算。

## 11. Outbox：原子持久化，而不是神奇的 exactly-once

业务事务内插入 outbox，Relay 读取未发布消息、发送至 Broker，并在确认后标记 `published_at`。若 Relay 在 Broker ACK 后、数据库标记前崩溃，消息会被再次发布；因此消费者必须幂等。

```sql
BEGIN;
SELECT id, event_id, payload
FROM outbox
WHERE published_at IS NULL
ORDER BY id
LIMIT 20
FOR UPDATE SKIP LOCKED;
-- 应用代码在此发送并等待 Broker ACK；失败则 ROLLBACK。

UPDATE outbox
SET published_at = clock_timestamp()
WHERE id = ANY($1::bigint[]);
COMMIT;
```

上述模式正确但可能长期持锁、占用数据库连接。高吞吐场景可用 `claimed_by / claimed_until` 投递租约或 CDC；无论采用哪一种，Broker ACK 与数据库更新之间的重复窗口仍存在。

消费者在**本地业务事务**中先插入 `consumed_events`，再写业务数据；唯一键冲突即代表已处理。消费者若继续调用外部 API，仍需一套独立的幂等与对账协议。

## 12. 安全、多租户与数据生命周期

可靠执行不等于只保证不丢状态，还要保证状态不越权、不泄露。

- 所有 Run、checkpoint、工具账本与 Outbox 应携带 `tenant_id` 或可由受保护的 Run 推导；API 查询必须做租户过滤。高隔离要求下可使用 PostgreSQL RLS，并用集成测试验证绕过路径。
- Worker 数据库账号最小授权：业务 Worker 不应拥有迁移、跨租户批量导出或任意 DDL 权限。
- 将用户输入、访问令牌、支付信息从日志中剥离；对 checkpoint/请求快照使用字段加密、KMS 信封加密或受控引用。
- 对审批、对账、手工重试、强制终止和数据导出记录操作者、理由、前后状态、证据和关联工单。
- 制定 checkpoint、工具账本、Outbox、消费去重记录的保留与清理策略；保留期至少覆盖审计、退款/撤销窗口、下游幂等窗口和重放窗口。

## 13. Kubernetes 故障恢复：以不变量验收，不预填结果

### 13.1 实验前提

- PostgreSQL 已应用 Schema；至少两个 Worker Pod 使用同一数据库。
- Worker 暴露可控故障点：`after_checkpoint_commit`、`after_outbound_intent_commit`、`after_tool_response_before_tx2_commit`、`after_broker_ack_before_outbox_mark`。
- Mock 工具必须使用**独立持久化存储**记录 `(idempotency_key, received_at, result)`，避免与 Agent 同库造成假阳性。
- 每次实验使用新 run ID，记录 Pod UID、worker ID、fence、checkpoint version、event ID、工具请求次数与时间戳。
- 区分删除 Pod API 对象、容器 SIGKILL、进程 SIGSTOP、网络隔离和 PostgreSQL 主从故障；它们证明的性质不同。

### 13.2 最小验收矩阵

| 实验 | 注入点 | 关键不变量 | 证据 |
| --- | --- | --- | --- |
| Checkpoint 后崩溃 | `after_checkpoint_commit` | 新 Worker 从已提交版本继续，已完成 step 不重做 | snapshot、工具请求计数、Worker 日志 |
| 工具响应前崩溃 | `after_tool_response_before_tx2_commit` | 无查询/幂等契约时不得自动重发 | Mock 请求日志、`IN_DOUBT` 账本 |
| 过期 fence | A 暂停心跳，B 接管 | A 的 CAS 影响 0 行，B 可提交 | 主表 version/fence、checkpoint 数量 |
| Outbox ACK 后崩溃 | ACK 后、标记前 | 可重复发布，同一消费者业务只提交一次 | Broker 记录、`consumed_events`、业务表 |
| Schema 升级 | 旧 checkpoint + 新镜像 | 显式迁移或拒绝执行，不可零值解析 | 迁移日志、错误分类、回滚演练 |
| 租户隔离 | 交叉 tenant 请求 | 无法读取、领取或操作其他租户 Run | API、RLS 与数据库审计日志 |

示例：旧 fence 拒绝测试不应依赖 Pod 名称或 GC 时机。A 取得 fence=N 后停止心跳；等待数据库时间跨过 lease；B 领取 fence=N+1；A 调用 checkpoint CAS，期望 `ErrLostLease`，且主表版本和 checkpoint 数量不变。

强制删除 Pod 的命令：

```bash
kubectl delete pod <worker-pod> --grace-period=0 --force
```

它强制删除 API 对象，**不能证明旧进程已停止**，不应据此断言外部副作用安全。验证进程崩溃要在隔离测试容器中对目标进程施加 SIGKILL，并保证不会误杀 Mock 工具或控制器。

### 13.3 证据归档模板

```yaml
experiment_id:
git_commit:
go_version:
postgres_version:
kubernetes_version:
worker_image_digest:
run_id:
tenant_id:
lease_duration:
heartbeat_interval:
fault_injection_point:
commands_executed:
worker_logs_path:
postgres_queries_and_results:
mock_tool_request_log:
broker_messages:
expected_invariant:
observed_result:
pass_or_fail:
```

没有这些证据时，只能称为"设计预期"，不能称"已验证恢复成功""零重复"或报告无基准支撑的性能数字。

## 14. 运行、容量与可观测性

应至少监控：

- `agent_runs_by_status`、`agent_oldest_queued_age_seconds`；
- `lease_claim_conflicts_total`、`stale_fence_rejections_total`、`lease_renewal_failures_total`；
- `checkpoint_commit_latency`、checkpoint 迁移失败数；
- `tool_unknown_result_total`、`in_doubt_age_seconds`、对账成功/失败/无结果计数；
- `outbox_oldest_pending_age`、发布重试、消费者去重冲突；
- WAL 速率、表/索引膨胀、autovacuum、连接池、磁盘和慢查询。

告警优先级通常应为：长时间 `PAUSED_INDOUBT`、Outbox 积压、频繁失租、checkpoint 迁移失败、租户预算异常和数据库容量逼近上限。每一步至少可能产生任务行更新、checkpoint、工具账本和 Outbox 写入，因此需根据步数、任务量、审计保留周期估算 WAL、IOPS、磁盘与分区/归档策略。

Worker 收到 SIGTERM 后停止领取新任务，取消可取消的推理/HTTP，并尽力完成正在进行的数据库事务；不要依赖 `terminationGracePeriodSeconds` 保证外部请求完成。

## 15. 自建还是使用 Temporal / DBOS

| 方案 | 更合适的场景 | 主要成本 |
| --- | --- | --- |
| Go + PostgreSQL 自建 | 工作流形态有限、团队熟悉 PG、需要精确掌控数据模型 | 自己维护恢复、迁移、计时器、可观测性、对账与升级兼容 |
| Temporal | 大量长生命周期工作流、复杂定时器/子工作流/重试、成熟运维诉求 | 基础设施、SDK、确定性约束与学习成本 |
| DBOS 等 PG 持久执行框架 | 希望数据库为核心、可接受框架语义与生态边界 | 框架约束、生态成熟度和运维适配 |

不存在"超过 30 分钟就必须用 Temporal"的普适阈值。应考察工作流数量、等待模式、恢复复杂度、外部副作用类型、团队运维能力、审计要求和升级生命周期。即使选择成熟工作流引擎，支付、退款、邮件、库存等外部副作用仍需要业务幂等与对账。

## 16. 上线清单与结论

上线前至少完成：

- 状态转换矩阵和数据库不变量测试；
- 并发 Claim、过期租约、旧 fence 与提交结果未知测试；
- checkpoint、工具结果、Outbox 的原子回滚测试；
- 有/无下游幂等契约下的工具超时与对账测试；
- Relay ACK 后崩溃的重复发布与消费者去重测试；
- Pod/进程崩溃、网络分区、数据库短暂不可用恢复测试；
- checkpoint schema 滚动升级、回滚与旧快照读取测试；
- 租户隔离、敏感字段脱敏、审批/对账授权审计测试；
- `EXPLAIN (ANALYZE, BUFFERS)`、容量压测与告警演练。

**可靠 Agent Runtime 的本质不是永不失败，而是让失败成为数据库可识别、可审计、可恢复的状态。** PostgreSQL 可以保证本地事务边界；Fencing 可以拒绝旧 Worker 对受控状态的写入；Checkpoint 可以恢复已提交进度；Outbox 可以可靠保存待发事件。但这些机制没有任何一个能单独证明外部调用的 exactly-once。

面对结果未知，系统应诚实地选择：下游幂等、查询式对账或人工介入。把这条边界设计清楚，才是长任务 Agent 从演示代码走向生产系统的关键。
