# 游戏开发：关卡流程管理（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2067243524303611861>
- 来源：知乎专栏
- 抓取方式：jina（14150 字符）

> 作者历史项目中关卡玩法的实现方式：HFSM、数据驱动、行为树、场景任务。

## HFSM

作者第一个项目，Scene 通过继承扩展，核心子类：Town、Dungeon、Activity。Dungeon 和 Activity 基类的主要作用是**管理场景的生命周期**（生命周期非常重要），框定副本基本流程。

```csharp
abstract class DungeonScene : Scene {
    private DungeonState dungeonState; // 主状态机，管理生命周期
    // 生命周期钩子
    protected virtual void OnEnterRunningState() {}
    protected virtual void OnEnterCompletedState() {}
    // 状态迁移相关方法
    protected abstract bool IsReady();       // 是否可进入运行状态
    protected abstract bool IsCompletable(); // 是否可进入完成状态
    protected abstract void UpdateHook();    // 运行状态下每帧调用
    // 重要事件方法
    protected virtual void OnPlayerEnterScene(Player player) {}
    protected virtual void OnPlayerLeaveScene(Player player) {}
}
enum EDungeonState {
    Init, Running, Completed, Terminated
}
```

玩法实现：继承 Dungeon 类，通过 FSM 实现玩法——虽未直接使用 HFSM，但事实上是 HFSM 结构。

作者感受：

1. 副本生命周期非常清晰，整体健壮
2. 简单副本用 FSM 清晰，复杂玩法用单层 FSM 吃力
3. 玩法逻辑复用性较差，组织不够方便

MMORPG 多数副本流程简单，FSM 还是实用的。附经典 HFSM 定义：

```csharp
interface IState {
    IStateMachine Parent {get;} // 父节点
    void Enter();
    void Execute();
    void Exit();
    void OnEvent(object evt);
}
interface IStateMachine : IState {
    void ChangeState(IState? nextState);
    bool UndoChangeState();
    bool RedoChangeState();
}
```

## 数据驱动

前两个项目未建立数据驱动概念，关卡编辑器只负责编辑实体，**副本流程不可编辑**。第三个项目搭 Gameplay 框架时才想明白：要解放程序、提高灵活性，就必须让流程本身可编辑。

能否不设计显式流程，而是**通过实体之间的依赖完成副本流程控制**？该方案（War3 编辑器）的实体通常指**触发器**：副本启动时激活初始触发器，触发器达成条件后激活下一个，直至副本结束。本质是将 FSM（或 Graph）**去中心化**，显式流程转隐式流程。

优点：

1. 支持并行与分支：每个实体都可视作并行单元
2. 状态可恢复：数据存实体上，实体状态正确恢复则流程正确恢复
3. 支持开放世界玩法：开放世界没有明显主轴流程，实体驱动是必须的

缺点：

1. 整体流程不够清晰：逻辑复杂时没人能说出完整流程
2. 配置难度高：触发器配置难于节点图编辑器，配置检查也困难
3. 难以处理触发器间冲突：缺少中控

作者态度：允许策划用触发器配置零散小玩法，**主流程还是应该通过编辑器管理**——不论 HFSM 还是行为树。实体也可通过 HFSM 或行为树管理区域玩法。

## 行为树

"行为树不就是一套控制流吗"——作者将其应用到场景玩法。讨论两个问题：

**1. 场景生命周期是否仍硬编码？**

是。副本生命周期（整体流程）比较固定，编辑器配置纯属冗余，策划配置还容易出错；若有开放参数，最佳方式是提取额外配置对象，而不是暴露自身结构。

**2. 行为树是否真的比 HFSM 更好？**

与实现有关。许多项目用传统心跳行为树：Execute 返回 Status，**必须返回父节点**才能执行下一步；而副本流程是**前进式**任务而非可循环重试类任务，每次返回父节点降低可读性。所以用 Graph 结构表达副本流程更直观（FSM/HFSM 本质上都是 Graph 的一种）。

为什么很少见用 HFSM 管理副本流程？问题出在实现：顶层抽象通常是 State，State 内部逻辑难以抽象，会演化出额外的 Task/Action 抽象（类似行为树的结构）。"过于明确的抽象对战斗系统有害"，HFSM 的明确抽象妨碍组合能力。而行为树框架中一切都只是 Node，**State 只是对部分节点的称呼，不是明确抽象**，所以（事件驱动）行为树灵活性强于 HFSM。

```csharp
class State : IState {
    List<Action> actions; // 新的抽象，打破组合模式
}
```

**为什么传统心跳驱动行为树可用于副本流程？不立即响应事件安全吗？**

并非所有领域对行为树要求相同：技能要求立即响应输入（事件驱动必须），其它领域通常可延迟状态切换。以击杀怪物目标为例：监听怪物被击杀事件时**立即更新目标数据，但不检查状态切换**，延迟到下一次心跳检查。引入的延迟不会造成逻辑错误，但大幅降低复杂度；即便项目用事件驱动行为树，副本节点也按传统心跳驱动模式编码。

```csharp
class KillMonsterTask : LeafTask {
    private SpawnConfig config; // 刷怪配置
    private HashSet<long> remains; // 剩余怪物
    protected override Status OnExecute() {
        // 延迟检查状态切换
        if (remains.Count == 0) return Status.Success;
        if (CheckTimeout()) return Status.Failed;
        return Status.Running;
    }
    public override void OnEvent(object evt) {
        // 仅更新数据，不产生状态切换
        if (evt is OnMonsterKilled killed) {
            remains.Remove(killed.MonsterId);
        }
    }
}
```

## 场景任务

前两个项目副本流程直接实现在 Scene 类中；第三个项目封装为场景任务（SceneQuest）模块。副本流程和外部任务流程高度一致，故取用任务模块概念。理论上可像角色任务那样支持支线，但无此需求，非主轴流程更建议通过实体（挂脚本）实现。

```csharp
class SceneQuestMgr : SceneSystem {
    Dictionary<int, Quest> goals; // 当前进行的目标（需同步）
    TaskEntry<Blackboard> taskEntry; // 行为树入口
}
// 任务控制节点 - 行为树节点
interface IQuestTask {
    Quest Quest {get;}     // 关联的任务(目标)，数据类
    Handler Handler {get;} // 结果处理器，策略扩展
}
```

用任务系统表达副本流程是否好设计？有理解难度但利大于弊：策划讲一两遍就能理解，证明策划也认同副本流程和任务流程存在共性。本质上**任务就是流程编排器**，一切含目标+进度+结果处理的系统都可以用任务构建。

## 结语

传统 MMO 副本流程简单，HFSM 和行为树都可以；将任务引入副本流程是一次跃迁，既提高灵活性也减少概念。副本生命周期管理也很重要，可用 FSM 优雅解决。
