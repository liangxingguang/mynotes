---
title: 游戏开发：任务系统的设计与实现
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2077349145707397379
source_type: link
platform: zhihu
captured: 2026-10-28
registered_at: 2026-10-30
inbox_ref: Archive/2026-10-28-game-quest-system-design.md
asset_ref: Assets/2026/10/game-quest-system-design.md
---

# 游戏开发：任务系统（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2077349145707397379>
- 来源：知乎专栏
- 抓取方式：jina（18373 字符；首次触发知乎安全验证，等待后重试成功）

## 概念区分

### 任务与目标

作者第一个项目将任务（Quest）和目标（Goal）拆分为独立抽象，第三、四个项目将 Goal 做成子任务。分离符合直觉但有问题：

1. 策划配置表格时需要配两张表
2. 策划期望目标能支持发放奖励和消耗等逻辑

合并的主因是第二点：Quest 天然支持该部分逻辑，想让 Goal 复用。底层原理：**限定每个 Quest 只包含一个 Goal 时，就可以通过组合 Quest 代替组合 Goal**，获得更强能力。

1. Quest 和 Goal 仍是两个概念，只是 Goal 不再独立出现
2. 任务通常不超过两层，多层次 Goal 不利于展示、降低体验
3. 任务通常只配置 Goal 和达成行为，不像技能流程那般复杂

```csharp
class QuestCfg {
    int cid;
    int progress;
    // 目标参数
    GoalType goalType;
    List<int> goalParams;
    List<int> children;
    // 钩子行为
    ActionCfg enterAction; // 进入钩子
    ActionCfg exitAction; // 退出钩子
    ActionCfg postAction; // 处理结果
}
```

### 子任务

树形组织 Quest 引入子任务（SubQuest）概念，但存在两种设计：

1. 子任务表目标（Goal）
2. 子任务表步骤（Step）

区别：

1. 表目标时 Goal 并行；表步骤时当前子任务完成后才启动下一个，可能出现分支
2. 表目标时由 Quest 自身处理结果决定是否完成；表步骤时上层 Quest 不含逻辑，由 SubQuest 更新 Quest 使其完成

```csharp
class Quest {
    Status status;    // 任务状态，子任务更新
    SubQuest current; // 当前子任务
}
class FSM {
    Context context; // 共享上下文
    State current; // 当前状态
}
```

该结构像 FSM：Quest 只提供上下文支持，逻辑集中在子任务。

**子任务代替了什么？** 以支线任务为例，传统架构支持"第几步/共几步"需在任务上层再抽章节概念；用子任务表达步骤时，上层**任务就可以代表章节**（Chapter）。

**优点**：一个章节的任务可配置在一个 Json 文件中，节点图编辑器可直接预览整个章节，配置效率高（传统方案每任务一个 Json）。

### 任务章节（分支）

主线任务数量多，划分阶段（章节）是自然的方案；支线任务通常只有几步，每个支线就是一个章节。显式章节抽象 vs 子任务表目标 + Quest 代指章节，功能一致，选大家更容易理解的即可——作者倾向后者。

```csharp
class QuestBranch {
    int branchId; // 章节ID
    int status;   // 分支状态
    int questId;  // 当前任务
}
```

作者代码中常用分支（Branch）一词，与 Git 的使用有关；沟通时用章节。

### Git 是极佳参考

设计任务系统时从 Git 获得的灵感：

1. **Git 仓库就是历史任务库**：Quest 对应 Git 节点，任务分支对应 Git 分支
2. Git 记录每个节点 → 应记录历史完成的所有任务
3. Git 记录所有分支 → 可记录分支以支持特殊查询（是否接取过某分支）
4. 主线分支最终回到主干，和 Git 分支并回主线相同

---

## 任务实现

### 任务状态

```csharp
enum QuestState {
    Unaccepted, // 未接取
    Processing, // 进行中
    Failed, // 已失败（不可回滚，等待放弃）
    Finished, // 已完成（不可回滚，等待提交）
    Submitted, // 已提交（最终步骤）
    Abandoned, // 已放弃（最终步骤，可选）
}
```

存在一类特殊目标：**进度值可能减少**，如收集道具（玩家可能使用、丢弃、卖掉）。此类目标达成时不能直接进入已完成，两种做法：

1. **客户端预览为已完成，服务器保持进行中**：提交时若道具足够则扣除并完成，否则中断
2. 引入中间状态**就绪（Ready）**：收集完成切就绪，减少则退出；只允许就绪和已完成状态发起提交，就绪态执行扣除

```csharp
public void Submit(Player player, Quest quest, SubmitParamters parameters) {
    if (quest.State == QuestState.Processing
        && !TryChangeToFinishState(player, quest)) {
        return; // 发送错误通知
    }
    if (quest.State != QuestState.Finished) return;
    // 真实提交逻辑...
}
// preview为true时，进度值满足也返回true
public bool IsFinished(Quest quest, bool preview = false);
```

### 任务进度

另一类特殊目标：**值越小越接近完成**，如榜单排名。作者以前基于单个 progress 字段区分"越大越优/越小越优"，后来获得正确解法：引入 Score 字段，**用 Score 记录排名，Progress 只有 01 态**。

```csharp
class Quest {
    int cid;
    int progress; // 进度-总是越大越接近完成
    int score; // 排名等，可越小越靠前
}
```

用 Progress 实现排名进度的真正问题是**违背直觉期望**（正常人认为 Progress 越大越接近完成），既增认知负担也增复杂度。

**进度来源**分三类：

1. 持久化在任务上的（杀怪任务）
2. 实时统计的（道具收集）
3. 存储在其它模块的（角色等级、历史最高排名）

```csharp
interface IGoalHandler {
    int GetProgress(Player player, Quest quest); // 实时查询进度
}
```

前两个项目查询二三类进度时实时查询以保精确；第三个项目改为**任务进度总是以 Quest 对象上的缓存值为准**（登录和触发事件时刷新）。原因：方便测试（好用的 GM 指令很重要）。缓存值有一致性风险，但风险最高的收集类任务正常途径不能直接进入完成态，提交时仍执行扣除逻辑，保证安全。以缓存为准还简化了实现。

### 客户端目标

部分目标服务器无法检测（打开某 UI），由客户端通知完成；运算成本高、安全要求低的目标（到达某区域）也可让客户端实现。

```csharp
void onC2SRequestFinishGoal(Player player, Quest quest);
```

### 任务输入

任务流程可能与接取时的输入有关（玩家选项、接取消耗的道具）：记录接取上下文，脚本需要时从 Quest 读取。

```csharp
class Quest {
    Item item; // 接取任务消耗的道具
    List<int> options; // 玩家的输入选项
}
```

任务、副本、技能相似，都可通过输入决定逻辑分支；执行过程中的玩家输入也需记录。

### 事件驱动

副本流程和玩家任务虽都用 Quest 管理，但实现有差异：

1. Player 可能有大量任务，Dungeon 通常只有一个
2. Player 任务只含目标信息结构简单；Dungeon 任务是真正的行为树，含大量流程控制
3. Player 任务需显式提交；Dungeon 任务自动提交（切换）

Player 任务多 → 避免频繁迭代 → 局外任务严格事件驱动；局内任务事件驱动为主、心跳为辅。

副本任务处理事件时立即更新目标数据、延迟到心跳检查状态切换（见《关卡流程管理》）。Player 任务需显式提交，从进行中切到已完成即终止逻辑，避免复杂事件链，因此局外任务更新进度时立即更新状态反而降复杂度。

```csharp
public void OnEvent(Player player, object evt) {
    Quest quest = player.questComp[questId];
    if (!Test(player, quest, evt)) return;
    if (!IncProgress(player, quest, 1)) return;
    if (quest.progress >= quest.Cfg.progress) {
        SetStatus(player, quest, QuestState.Finsihed);
    }
}
```

子任务完成后通过事件通知父任务，父任务在完成事件中更新进度和状态切换（Sequence/Selector/Repeat，类似行为树事件驱动）。

### 事件测试

四个项目实现各不相同，大体两类：

1. P1/P3 显式测试事件类型和参数——写了大量事件测试方法
2. P2/P4 隐式测试——只有一个测试方法，直接匹配两个 List；每个参数关联一个表达式（绝大多数表示相等），全部匹配即符合

```csharp
public bool Test(QuestCfg quest, List<int> eventParams) {
    List<int> questParams = quest.cfg.eventParams;
    // 匹配两个List
}
class QuestCfg {
    List<int> operators; // 操作符
    List<int> operands; // 比较参数
}
```

作者第三项目未选该方案（读代码和配置不直观），但**一个方法完成几十个方法的事**证明有其优点。

### 可接取任务

维护玩家可接取任务列表的复杂度不在逻辑，而在体量——每次事件扫全表成本爆炸。历史项目的处理：

1. 绝大多数任务接取条件是前置任务完成 → 剔除（prev2Next 索引）
2. 大部分任务有接取等级限制 → 按等级排序 + 二分查找范围（可强制策划必填）

```csharp
private class QuestMgr {
    Dictionary<int, int> prev2NextDic;
    List<QuestCfg> sortedByLevel; // 按等级排序，二分查找范围
}
```

进一步减少事件关联配置需建更多索引（维护难度高）。未尝试的想法：

1. 标记 + 异步检查：事件触发不立即检查，等待一段时间合并多次请求
2. 客户端检查 + 服务器校验：接取条件数据客户端大多有

### 任务掉落

收集怪物掉落物任务（掉落物只有接取任务时才掉落）的两种配置：

1. 在怪物掉落中配置特殊掉落，接取特定任务才掉
2. 在任务中配置关联怪物 ID 和掉落物（为怪物动态附加掉落）——**方案 2 更好**

```csharp
class QuestCfg {
    List<int> monsterIds; // 关联的怪物ID
    List<int> bonusItem; // 额外掉落
}
class MonsterCfg {
    Dictionary<int, QuestDropCfg> questDrops; // 任务掉落(不推荐)
}
```

方案 1 问题：任务材料通常只服务一个任务，掉落配置离任务远不直观；一个怪服务多任务时怪物配置变复杂。

实现额外掉落：**多个任务可能监听同一怪物且有相同掉落**，各任务自行处理会出数量问题。要么设计公共任务掉落管理器，要么在场景公共掉落管理器中实现。

```csharp
class QuestDropMgr {
    void AddItems(Player player, List<int> monsterIds, List<int> bonusItem);
}
```

---

## 成就任务

成就任务是简化的任务对象，通常只记一个进度值；主要复杂度在生涯数据和数据继承。

成就用 progress 还是 score？推荐 score——排名类目标不少见，"越小越接近完成"违背直觉。

```csharp
class Achieve {
    int cid;
    int score; // 进度
    int phase; // 阶段/level
}
```

### 生涯数据

特殊数据需求：历史杀怪数、强化装备数、稀有道具获得数。要支持激活成就时获得正确进度，**需在角色创建后就开始记录并一直记录**——部分开发者称生涯数据，作者直接用 scores。

```csharp
class Player {
    Dictionary<int, int> scores; // 所有积分记录
}
```

注意：成就条目可能非常多，可加限制（如达一定等级才开始记录）；避免玩家一创建就大批量激活成就。获得物品事件通常还需记录来源以判别是否更新 score。

### 数据继承

分阶段成就（杀 1W 只怪达成后激活杀 2W）：部分团队拆成多个独立成就，产生数据继承问题——配置关联成就，激活时用旧成就数据初始化。

更简单的做法：**成就做成多阶段**（像活跃任务），既避免继承问题，还支持溢出值保留。

```csharp
class AchieveCfg {
    int cid;
    int InheritFrom; // 继承谁的数据
}
class AchieveCfg {
    int cid;
    int level; // 阶段/等级
    int score; // 目标值
}
```

## 结语

服务器角度任务系统本身不算复杂，复杂的是其它模块要配合的部分（怪物掉落、NPC 显隐）。客户端复杂在任务追踪和 NPC 交互表现。
