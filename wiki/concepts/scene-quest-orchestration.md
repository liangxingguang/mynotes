---
id: wiki-concept-scene-quest-orchestration
type: concept
title: 场景任务流程编排（SceneQuest）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - game-server
  - gameplay-framework
sources:
  - raw/sources/architecture/2026-10-28-game-level-flow-management.md
related:
  - wiki/sources/game-level-flow-management.md
---
# 场景任务流程编排（SceneQuest）

## Definition（定义）

把副本/关卡流程表达为"场景任务"：任务是**流程编排器**，由"目标 + 进度 + 结果处理"三要素构成；一切含这三要素的系统都可以用任务构建。SceneQuestMgr 持有当前进行的目标字典与行为树入口，任务控制节点（IQuestTask）关联 Quest 数据类与 Handler 策略扩展。

## Why It Matters（为什么重要）

副本流程与外部任务流程高度一致，复用任务系统表达副本流程是"一次跃迁"：既提高灵活性也减少概念数量；策划讲一两遍就能理解，侧面证明该抽象符合领域直觉。

## Core Characteristics（核心特征）

1. **生命周期与流程分离**：副本生命周期（Init/Running/Completed/Terminated）由 FSM 硬编码管理——生命周期固定，编辑器配置纯属冗余；流程本身（玩法推进）才交给任务/行为树数据驱动。
2. **流程必须可编辑**：关卡编辑器只编辑实体不够，流程本身可编辑才能解放程序。
3. **延迟响应安全模式**：节点监听事件时**立即更新数据、但不检查状态切换**，延迟到下一次心跳检查——不引入逻辑错误且大幅降低复杂度；即便用事件驱动行为树，副本节点也按心跳驱动编码。
4. **Graph 优先**：副本是前进式任务而非循环重试任务，传统心跳行为树"必须返回父节点"降低可读性，Graph 表达更直观（FSM/HFSM 本质是 Graph 的一种）。

## Structure（结构）

```text
SceneQuestMgr : SceneSystem
  ├── goals: Dictionary<int, Quest>   // 当前进行的目标（需同步）
  └── taskEntry: TaskEntry<Blackboard> // 行为树入口
IQuestTask { Quest; Handler }          // 任务数据类 + 结果处理策略
```

## How It Works（运作方式）

- 主流程在编辑器中显式管理（HFSM 或行为树），零散小玩法允许策划用触发器配置；
- 非主轴流程更建议通过实体（挂脚本）实现，而非强行纳入任务支线；
- 触发器方案（War3 式去中心化）的取舍：支持并行/状态恢复/开放世界，但流程不清晰、配置难、无中控——只配做补充。

## Relationships（关系）

### Distinctions（区分）

- 与 HFSM 的不同：HFSM 顶层 State 抽象过死，会演化出 Task/Action 抽象反伤组合能力（"过于明确的抽象对战斗系统有害"）；行为树框架中一切皆 Node，State 只是称呼而非明确抽象。
- 与纯触发器流程的不同：保留显式主流程与中控，避免"没人能说出完整流程"。

## Evolution（演进）

作者项目线：① FSM 直接写在 Scene 子类（事实 HFSM）→ ② 触发器去中心化尝试 → ③ 事件驱动行为树 → ④ SceneQuest 模块（第三个项目封装）。

## Open Questions（开放问题）

- 场景任务支持支线的实践：信源称"理论上可，无此需求"，未验证。
- 大型开放世界主支线混排时任务模型的扩展性：当前信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-game-level-flow-management.md`（含 DungeonScene/SceneQuestMgr/KillMonsterTask 代码示例）

## Related Knowledge（相关知识）

- [[game-level-flow-management|信源：游戏开发：关卡流程管理]]
