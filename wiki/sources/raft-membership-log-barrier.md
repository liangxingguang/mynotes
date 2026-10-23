---
id: wiki-source-raft-membership-log-barrier
type: source
title: Raft 成员变更：何时需要先提交 leader 的当前 term 日志
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - 分布式系统
  - raft
  - 共识算法
sources:
  - raw/sources/architecture/2026-10-21-raft-membership-log-barrier.md
related:
  - wiki/concepts/raft-membership-change-barrier.md
  - wiki/sources/distributed-systems-introduction.md
---
# Raft 成员变更：何时需要先提交 leader 的当前 term 日志

## Overview（概览）

openacid（张炎泼）的分布式系统硬核文，系统性回答「Raft 成员变更时 leader 是否必须先提交一条当前 term 日志」：对标准 joint、单步变更、允许 joint 回退的扩展三种情形分别给出结论与完整反例推演。

## Key Facts（关键事实）

- 节点把 config 日志追加到本地即按新 config 收集选票，不必等提交——这是所有反例的根源
- 两个 config「相交」的定义：任取 quorum `qa ∈ A`、`qb ∈ B` 都有交集；共享节点 ≠ 相交（`{a,b,c}` 与 `{b,c,d}` 不相交）
- 单步反例：`C0={a,b,c,d}` 下 `a` 提 `Cu`、`d` 提 `Cv`，`{a,b,u}` 与 `{c,d,v}` 完全分离，缺 barrier 时 term 3 的 `a` 可覆盖已提交的 `Cv`
- 标准 joint：`C01=[C0,C1]` 与 `C02=[C0,C2]` 的每个 quorum 都含 `C0` 的 quorum → 必定相交，config 日志本身构成 barrier，两步均无需额外 noop 提交
- 允许 joint 回退后 `C0` 与 `C1` 的 quorum 可分离，互斥前提被破坏，完成与回退两个方向都需先提交当前 term 日志
- OpenRaft 实现统一检查 `noop_log_id`（当前 leader 第一条 noop 是否提交），覆盖所有 config 入口

## Important Claims（重要论断）

### Claim 1：单步变更必须先提交当前 term 日志（Ongaro 修正条件）

`Cu`/`Cv` 各自与 `C0` 相交，但彼此可不相交；leader 必须先在 `C0` 下提交当前 term 日志，排除较小 term 遗留的变更，再提出新 config。

### Claim 2：标准 joint 两步都不需要额外 barrier

`C01` 提交本身即日志 barrier；此后只允许完成到 `C1`，后续 leader 都使用 `C1` 的 quorum，必定相交。

### Claim 3：联合选举不能替代日志 barrier

`C0` 的旧节点在新 config 提交后可能已下线，强制 candidate 取 `C0` quorum 会让选举无法完成；稳妥方式是按本地最新 config 当选后提交当前 term 日志。

## Concepts Introduced（引入的概念）

- [[raft-membership-change-barrier|Raft 成员变更的日志 Barrier]]

## Entities Mentioned（提及的实体）

- openacid（张炎泼，作者）
- Diego Ongaro（Raft 作者，单步变更修正条件提出者）
- OpenRaft（允许 joint 回退的 Raft 实现）

## Implications（影响／启示）

实现 Raft 成员变更时，「先提交当前 term 日志」不是一刀切的要求，而是取决于变更类型；扩展协议（如允许回退）会悄悄破坏原有的互斥前提，必须重新做 quorum 相交分析。

## Limitations（局限）

单一作者博客（二次分析），但结论与 Raft 论文 §6 及 Ongaro 的 safety 论证一致；反例基于多数派 quorum，未覆盖 flexible quorum 变体。

## Related Knowledge（相关知识）

- [[distributed-systems-introduction|第一章：分布式系统概述（codedump 教程）]]

## Source（信源）

- `raw/sources/architecture/2026-10-21-raft-membership-log-barrier.md`
