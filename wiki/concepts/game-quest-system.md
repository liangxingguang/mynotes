---
id: wiki-concept-game-quest-system
type: concept
title: 游戏任务系统设计（Quest/Goal 合一与进度建模）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - game-server
  - gameplay-framework
sources:
  - raw/sources/architecture/2026-10-28-game-quest-system-design.md
related:
  - wiki/concepts/scene-quest-orchestration.md
  - wiki/concepts/game-mail-system.md
  - wiki/sources/game-quest-system-design.md
---
# 游戏任务系统设计（Quest/Goal 合一与进度建模）

## Definition（定义）

玩家任务系统的一组设计决策族：Quest/Goal **限定单 Goal 合一**（用组合 Quest 代替组合 Goal）、子任务表步骤时**任务即章节**（类 FSM，Quest 只供上下文）、以 **Git 为参照系**记录任务历史与分支、进度可回退目标引入**就绪（Ready）中间态**、**Progress/Score 语义分离**、进度以**缓存值**为准、可接取任务用**前置索引 + 等级二分**避免全表扫描、任务掉落配在**任务侧**并由公共掉落管理器仲裁、成就用 score 且**多阶段单成就**替代数据继承。

## Why It Matters（为什么重要）

任务系统是游戏后端与策划配置耦合最深的系统之一：抽象拆分过细（Quest/Goal 两张表）会让配置与发奖逻辑割裂；进度语义含混（越大越优/越小越优混用一个字段）会直接转化为全团队的认知负担。这组决策展示了"用一个简单约束换取组合能力"和"让字段语义符合直觉"两个可迁移的建模原则。

## Core Characteristics（核心特征）

1. **单 Goal 约束换组合能力**：Goal 不独立出现，复用 Quest 的发奖/消耗/钩子逻辑；任务通常不超过两层，多层 Goal 不利展示。
2. **子任务表步骤 → 任务即章节**：SubQuest 串行推进、可分支，上层任务直接代表章节（Chapter），一章一个 Json、节点图编辑器可整体预览，免去单独的章节抽象。
3. **Git 参照系**：Quest=节点、分支=Git 分支；记录全部历史任务与分支（支持"是否接取过某分支"查询），主线并回主干。
4. **可回退进度不就绪不完成**：收集类目标进度可减少，达成时切 Ready 中间态（或客户端预览+服务器保持进行中），提交时才执行道具扣除——缓存进度的一致性风险由提交时校验兜底。
5. **Progress/Score 分离**：Progress 恒为"越大越接近完成"（0/1 态），排名类"越小越靠前"一律走 Score；违背直觉的复用是真正的复杂度来源。
6. **可接取列表靠索引不靠扫描**：prev2Next 前置索引剔除绝大多数候选，等级排序二分收敛范围；更多索引维护成本高，宁可不建。
7. **掉落归任务侧、冲突归公共管理器**：任务配置关联怪物与额外掉落（配置离任务近、怪物配置不膨胀）；多任务监听同怪同掉落时必须经公共掉落管理器，否则数量冲突。

## Structure（结构）

```text
QuestCfg { cid, progress, goalType, goalParams, children,
           enterAction, exitAction, postAction }
Quest    { cid, progress /*越大越接近完成*/, score /*排名等越小越靠前*/,
           item /*接取消耗*/, options /*玩家输入*/ }
QuestState { Unaccepted, Processing, Failed, Finished, Submitted, Abandoned }
           + Ready（可回退目标的中间态，提交时执行扣除）
QuestMgr { prev2NextDic, sortedByLevel /*二分范围*/ }
Achieve  { cid, score, phase }   // 多阶段单成就，免数据继承
Player   { scores }              // 生涯数据，建号起持续记录
```

## How It Works（运作方式）

- 局外玩家任务**严格事件驱动**：`OnEvent → Test → IncProgress → 达标即切 Finished`；因需显式提交、切完成即终止逻辑，立即切状态反而比延迟检查更简单（与副本任务相反）。
- 子任务完成经事件通知父任务，父任务在完成事件中更新进度与状态（Sequence/Selector/Repeat，类行为树事件驱动）。
- 进度来源三类（持久化/实时统计/他模块），统一以 Quest 缓存值为准，登录与事件时刷新，GM 可直接改缓存测试。
- 事件测试两路线：显式逐方法测试（直观但量大）vs 隐式双 List 表达式匹配（一个方法顶几十个，但配置不直观）——作者四项目两路都走过，未收敛。

## Relationships（关系）

### Related Concepts（相关概念）

- [[scene-quest-orchestration|场景任务流程编排（SceneQuest）]]：同一 Quest 抽象在副本/关卡侧的实例——副本流程即任务编排。
- [[game-mail-system|游戏邮件系统的分布式设计]]：任务发奖/消耗逻辑最终常经邮件 Channel 落地（同作者系列，语义呼应）。

### Distinctions（区分）

- 与 [[scene-quest-orchestration|SceneQuest]] 的不同：玩家任务量大、结构简单（只含目标信息）、需显式提交、事件到达立即切状态；副本任务通常只有一个、是含流程控制的行为树、自动提交、延迟到心跳检查状态切换。同构（目标+进度+结果处理）而不同策。

## Evolution（演进）

作者四项目线：① Quest/Goal 拆分独立抽象 → ② （未详述）→ ③ Goal 做成子任务、进度改缓存值为准、弃用隐式事件匹配 → ④ 延续合一方案。成就从"多成就+数据继承"演进为"多阶段单成就"。

## Open Questions（开放问题）

- 可接取任务的"标记+异步合并检查""客户端预检+服务器校验"两条优化路径：信源明确标注未尝试。
- 隐式事件匹配（表达式 List）在可读性与方法数之间的长期收益：作者弃用但承认其优点，无定论。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-game-quest-system-design.md`（含 QuestCfg/Quest/Submit/OnEvent/QuestDropMgr/Achieve 等 C# 代码示例）

## Related Knowledge（相关知识）

- [[game-quest-system-design|信源：游戏开发：任务系统的设计与实现]]
