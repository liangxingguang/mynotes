---
id: 2026-10-21-raft-membership-log-barrier
title: Raft 成员变更：何时需要先提交 leader 的当前 term 日志
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/SMKqvXf5P8s1MA6sI_KJTQ
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [分布式系统, Raft, 工程实践]
asset_ref: Assets/2026/10/raft-membership-log-barrier.md
wiki_status: ingested
---

# Raft 成员变更：何时需要先提交 leader 的当前 term 日志

> openacid 张炎泼的分布式硬核文，给出成员变更日志 barrier 的完整结论：**标准 joint 变更两步都无需额外的 noop 提交**（joint config `C01=[C0,C1]` 的每个 quorum 都包含 `C0` 的 quorum，config 日志本身构成 barrier）；**单步变更必须先提交当前 term 日志**（`Cu`/`Cv` 虽各自与 `C0` 相交，但彼此可不相交，缺 barrier 时未提交的 `Cu` 可覆盖已提交的 `Cv`——Ongaro 修正条件）；**若扩展允许 joint 回退，完成与回退两个方向都需先提交当前 term 日志**。核心机制：在公共 config 的 quorum 上提交一条当前 term 日志，即登记新 leader 的 term，排除旧 term 遗留的冲突变更。

## 核心要点

- **config 追加即启用**：节点把 `C1` 日志追加到本地就按 `C1` 收集选票，不必等提交——这是所有反例的根源
- **相交判定要查两层**：变更前后 `C0` 与 `C1`，以及不同 leader 先后提出的 `C1` 与 `C2`；共享节点 ≠ 相交（`{a,b,c}` 与 `{b,c,d}` 不相交，因 `{a,b}` 与 `{c,d}` 无交集）
- **单步反例**：`C0={a,b,c,d}` 下 `a` 提 `Cu`、`d` 提 `Cv`，`{a,b,u}` 与 `{c,d,v}` 完全分离，缺 barrier 时 term 3 的 `a` 可覆盖已提交的 `Cv`
- **joint 为何天然安全**：`C01` 与 `C02` 都含 `C0` 的 quorum → 必定相交；`C01` 提交后所有后续 leader 只能完成到 `C1`
- **回退破坏前提**：允许 `C01` 回退到 `C0` 后，`C0` 与 `C1` 的 quorum 可分离，互斥前提失效——两个方向都要 barrier；只给"新回退请求"加检查挡不住提交继承旧日志的 leader
- **barrier 实现**：noop 或当前 term 业务日志均可；同 term 已提交过就不必重发；OpenRaft 统一检查 `noop_log_id` 覆盖所有 config 入口
- **勿用联合选举替代**：`C0` 的旧节点可能已下线，强制取 `C0` quorum 会让选举无法完成

## 正文

全文（含反例时序推演与三种情况证明）见 [[Assets/2026/10/raft-membership-log-barrier]]。

## 来源

[Raft 成员变更：何时需要先提交 leader 的当前 term 日志](https://mp.weixin.qq.com/s/SMKqvXf5P8s1MA6sI_KJTQ)（原文：https://blog.openacid.com/distributed/raft-membership-log-barrier/ ）

## 附件

- [[Assets/2026/10/raft-membership-log-barrier]]
