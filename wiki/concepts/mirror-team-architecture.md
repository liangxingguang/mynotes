---
id: wiki-concept-mirror-team-architecture
type: concept
title: 互为镜像式队伍架构
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - game-server
  - distributed-systems
sources:
  - raw/sources/architecture/2026-10-28-game-distributed-team-design.md
related:
  - wiki/sources/game-distributed-team-design.md
---
# 互为镜像式队伍架构

## Definition（定义）

MMO 队伍系统的第三代架构：Game 服与跨服**各自部署队伍服务**，双向同步全量队伍数据，两端最终都持有所有队伍数据（真实数据与镜像数据，数据结构相同）；冲突时以 Game（单服）队伍为准。

## Why It Matters（为什么重要）

调和了前两代架构的核心矛盾：单服同线程队伍精确但限制玩法（必须同频道组队），传统分布式队伍灵活但创建走网络、引入异步不确定性。镜像式让特定副本可以限定"只创建单服队伍"，**拿回单线程编程体验**而不牺牲全局组队自由度。

## Core Characteristics（核心特征）

1. **双端队伍服务**：Game 服支撑单服队伍，跨服支持跨服队伍。
2. **双向全量同步**：跨服队伍变化（创建/解散/队员变更）广播所有 Game 服，Game 服队伍变化也同步给跨服。
3. **单服队伍优先**：玩家同时出现在两类队伍时以单服队伍为准、自动离开跨服队伍——理由不是玩家数据在 Game 服，而是**职责权重**：单服队伍系统主要用于支撑特殊玩法。
4. **成立前提**：队伍数据不涉及玩家持久化数据，对分布式边界情况容忍度高，双向同步增加的复杂度有限。

## Structure（结构）

`Team { guid, leaderId, members, isMirror }`——isMirror 标记区分真实/镜像数据。配套技巧：个人小队**先建本地假队伍数据先进副本**、再异步 RPC 同步到跨服（假设总是成功以换体验）。

## How It Works（运作方式）

- 特殊玩法（如集结场景）限定频道/副本只创建单服队伍，避免分布式问题；
- 常规跨服组队走跨服队伍服务，镜像数据供 Game 服本地查询（同队/同工会引用相等安全）；
- 缓存取舍建议：队伍镜像缓存在 Game 服而非玩家身上（支持 NPC 入队、工会大群体同步成本更低），且全项目方案必须统一。

## Relationships（关系）

### Related Concepts（相关概念）

- 与 [[game-server-architecture-four-layers|游戏服务器四层架构]]的协调层相关：跨服队伍服务属协调层职责（解读）。

### Distinctions（区分）

- 与传统分布式队伍的不同：创建队伍不再必须走网络（单服队伍本地创建），且冲突裁决规则显式化（单服优先）。
- 与单服同线程队伍的不同：不要求同频道组队，移动端友好。

## Evolution（演进）

作者三个项目的演进线：① 单服同线程队伍（精确但限制玩法）→ ② 传统分布式队伍（灵活但创建异步）→ ③ 互为镜像式（放置类 MMO 的个人小队 + NPC 入队需求倒逼）。

## Open Questions（开放问题）

- 双向同步的风暴控制与断线补同步机制：当前信源未展开。
- "假设创建总是成功"的失败补偿路径：信源未给出。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-game-distributed-team-design.md`（含 Team/GameTeamMgr 结构示例与补救方案清单）

## Related Knowledge（相关知识）

- [[game-distributed-team-design|信源：游戏开发：分布式队伍的改进]]
