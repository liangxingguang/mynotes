---
id: wiki-concept-raft-membership-change-barrier
type: concept
title: Raft 成员变更的日志 Barrier
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - 分布式系统
  - raft
sources:
  - raw/sources/architecture/2026-10-21-raft-membership-log-barrier.md
related:
  - wiki/sources/raft-membership-log-barrier.md
---
# Raft 成员变更的日志 Barrier

## Definition（定义）

Raft 成员变更中，leader 在提出新 config 之前，先在「公共 config」的一个 quorum 上提交一条自己当前 term 的日志（noop 或业务日志），以此登记新 leader 的 term、排除旧 term 遗留的冲突 config 分支的机制。

## Why It Matters（为什么重要）

Raft 的 config 追加即启用（不必等提交），未提交的 config 也能用于选举。当不同 leader 从同一 `C0` 先后提出 `C1`、`C2` 且二者 quorum 可分离时，缺少 barrier 会导致未提交的旧 config 覆盖已提交的新 config——破坏共识安全性。是否需要额外 barrier 取决于变更方式，错误地省略（或多余地施加）都会出问题。

## Core Characteristics（核心特征）

1. **按变更类型分情形**：标准 joint 两步都无需额外 noop（`C01` 的每个 quorum 含 `C0` 的 quorum，config 日志自身即 barrier）；单步变更必须先提交当前 term 日志（Ongaro 修正条件）；允许 joint 回退的扩展在完成与回退两个方向都需要 barrier。
2. **本质是 term 登记**：在公共 config 的 quorum 上留下比旧 term 更新的日志，使持有旧 config 分支的节点无法当选或推进冲突变更。
3. **实现廉价**：同 term 已提交过日志就不必重发 noop；OpenRaft 用统一的 `noop_log_id` 检查覆盖所有 config 入口。

## How It Works（运作方式）

1. 检查两组相交要求：变更前后 `C0` 与 `C1`，以及不同 leader 先后提出的 `C1` 与 `C2`（相交定义：任取 quorum 都有交集，共享节点不算）。
2. 若 `C1` 与 `C2` 可能不相交（单步、joint 回退扩展），leader 先在公共 config（通常是 `C0`）下提交当前 term 日志。
3. 该 quorum 保存了更新的 term 记录，配合 Raft 的 term 与日志新旧检查，旧 leader 遗留的 config 分支即被排除。

## Relationships（关系）

### Dependencies（依赖项）

- Raft 的提交规则（论文 §5.4.2：只提交当前 term 日志，旧 term 日志连带提交）
- Raft 论文 §6 的 joint 变更顺序（`C01` 先提交、`C1` 再追加）

### Distinctions（区分）

- 与「联合选举」方案不同：联合选举强制 candidate 同时取 `C0` 与 `C_new` 的选票，但 `C0` 旧节点可能已下线导致选举无法完成；日志 barrier 只依赖当前可用的公共 config。
- 与标准 joint 不同：允许 `C01` 回退到 `C0` 的扩展破坏了「后继都使用 `C1` quorum」的前提，因此两个方向都要重新施加 barrier。

## Open Questions（开放问题）

- 非多数派 quorum（如 Flexible Paxos 风格 read-write quorum）下的 barrier 条件是否相同，当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-21-raft-membership-log-barrier.md`

## Related Knowledge（相关知识）

- [[raft-membership-log-barrier|Raft 成员变更：何时需要先提交 leader 的当前 term 日志（信源页）]]
- [[distributed-systems-introduction|第一章：分布式系统概述（codedump 教程）]]
