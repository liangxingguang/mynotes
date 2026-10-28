# 用一棵树管住 100+ 个红点：SLG 红点系统实现详解（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2093767907499161439>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 13331 字符）

---

## 一、前提:游戏里的红点是什么,要做到什么

### 1.1 红点是什么

红点是一种"提示玩家这里有事可做"的标记,通常挂在按钮或页签的右上角。它有两种形态:一种是**点**,只表示有事可做,比如有新邮件、可以升级了;另一种是**数字**,表示有几件事可做,比如 3 封未读、5 个可领的奖励。

红点一般出现在三个层级:主界面的功能入口(角色、背包、邮件、公会……),功能内部的二级页签(邮件里的系统、公会、战报),以及具体的列表项(某一封邮件、某个活动)。玩家看到入口亮了,点进去找到亮着的页签,再点进去找到那一条具体的内容。

![Image 1](https://pic1.zhimg.com/v2-bc0f4a9d669c08ac2d8787beba4536ee_1440w.jpg)

一个功能少则一两个红点,多则十几个。到了中大型游戏,红点数量很容易上百,而且每上线一个新功能都会继续增加。从上面这张图也能看出来:入口的数字是页签之和,页签的数字又是条目之和。**红点天然就是一棵树。**

### 1.2 必须做到什么

先看功能上的需求,每一条都对应游戏里常见的场景:

| 需求 | 举例 |
| --- | --- |
| 层级汇总:子红点亮,父红点就要亮;数字样式要显示子红点的总和 | 邮件的任意一个分类有未读,主界面邮件入口就亮 |
| 计数口径由业务决定 | 同样是数字,有的按可领奖励个数计,有的按天计(同一天有多个奖励可领也只算 1) |
| 同一份数据挂在多个入口 | "有新的入会申请"既要在公会入口提示,也要在公会管理页提示 |
| 数据来源有三类 | 服务器推送(新邮件)、本地数据变化(背包道具数量)、时间到点(免费抽卡冷却结束、每日零点重置) |
| 不依赖界面是否打开 | 主界面入口要知道深层页面的状态,而那些页面玩家可能从来没打开过 |
| 显示层可以单独压制 | 当前选中的页签上不显示红点,但数据本身不受影响 |

除此之外,还有四条非功能需求。它们也是后面评判各种方案的标准:

1.   **正确**:不漏亮,也不错亮,入口和内部始终一致。这是玩家最容易感知到的一点,入口亮了点进去却找不到红点,或者里面亮着入口却没亮,都会被当成 bug。
2.   **性能**:一次批量数据同步可能带来几十条变化,不能因此触发几十次全链路重算。
3.   **接入成本低**:新增一个红点,最好只需要写一个类、注册一行路径;界面上只挂一个组件、选一下路径,不写代码。
4.   **可调试**:能直观地看到整棵树里每个节点当前的数值。

带着这四条标准,先来看看常见的几种做法。

* * *

## 二、现有方案对比

### 2.0 用三个问题给方案分类

不同的红点方案,差别可以归结为三个问题:

1.   **怎么汇总**:有没有层级结构,父红点是否由子红点自动算出?
2.   **何时计算**:数据一变化就算,还是标记下来、统一延后再算?
3.   **谁来计算**:业务代码算好数值后推给红点系统(推),还是红点节点自己去读数据计算(拉)?

下面五种方案,基本就是这三个问题不同答案的组合。

### 2.1 方案 A:界面自己算

最直接的做法是界面在 `OnEnable` 或 `Update` 里调用业务数据,自己判断要不要亮。它最简单,不需要任何框架。

问题也很明显。父入口要把子页面的判断逻辑再写一遍,两处逻辑很容易改着改着就不一致了。界面没打开时根本拿不到状态,主界面入口也就没法知道深层页面的情况。判断逻辑散落在各个界面里,出了问题也没法统一调试。

### 2.2 方案 B:扁平 key + 观察者

第二种做法是全局维护一张"红点 key → 数值"的字典,数值变化时按 key 广播,界面按 key 订阅。这样数据和界面就解耦了,界面不打开也有状态。

但它没有层级。父红点要么手动订阅所有子 key 再求和,要么由业务代码顺手把父 key 也设一遍。红点少的时候还行,规模一大就很容易漏。

### 2.3 方案 C:前缀树 + 立即冒泡

既然红点天然是一棵树,自然就有人用路径(如 `Mail/System`)来建树。叶子的值一变,就同步沿着父链往上重算,直到根节点。层级关系由路径自动建立,父节点也会自动汇总。

它的问题在于"立即"。同一帧里多个子节点先后变化,父链就会被重算多次。批量数据同步时(比如一次推送几十个道具变化)尤其明显,这也是这类方案最常被指出的问题。

### 2.4 方案 D:前缀树 + 父节点脏集合

这是目前流传最广的做法。业务代码算好叶子的数值,调用 `ChangeValue(path, value)` 推给红点系统;叶子立即更新并触发回调,同时把父节点放进一个脏集合;Update 里再统一处理脏集合,父节点对子节点求和,然后继续标记更上一级。

这样父节点的重算在一帧内被合并了,解决了方案 C 的问题。有的实现还用自定义的字符串区间类型代替 `Split`,避免切分路径时产生内存分配。

不过它仍有三处局限:

*   **叶子没有被合并**:业务每推一次值,叶子就回调一次,界面也跟着刷新一次。而且每次数据变化,业务代码都要先把叶子的数值算一遍才能推。
*   **计算逻辑在业务侧**:红点系统只负责汇总,"这个红点该亮几个"仍然散落在各个功能模块里。
*   **时间驱动的红点没有挂点**:冷却到期、跨天重置这类情况没有数据变化事件,需要业务另外起定时器去推值。

### 2.5 方案 E:运算单元组合 + 标脏 + 每帧限量

还有一种更重的设计:把"红点运算的最小单元"单独抽出来,一个红点由多个单元组合而成。前缀树只负责表达红点名的层级,单元和红点之间是组合关系,而不是严格的父子关系。数据变化时只标脏、延迟计算,计算结果按单元缓存,而且每帧会限制计算的单元数量,避免单帧卡顿。

它的好处是同一份数据被多个入口引用时只算一次,而且有每帧预算,能把计算尖峰削平。代价是概念更多(单元、红点、绑定关系),接入前要先想清楚怎么拆单元;有了每帧限量,极端情况下红点可能要延迟好几帧才更新。

### 2.6 本文方案的定位

本文的方案站在方案 D 的基础上,做了几处改变:

|  | 方案 D | 本文 |
| --- | --- | --- |
| 叶子何时计算 | 业务推值时立即生效 | 叶子也只标脏,每帧统一计算一次 |
| 谁来计算 | 业务算好再推(推) | 叶子自己读数据计算(拉),业务只需要说"变了" |
| 订阅逻辑放在哪 | 各功能模块里 | 叶子自己订阅数据变化,随初始化和销毁自动绑定、解绑 |
| 时间驱动的红点 | 需要外部定时器 | 每帧会统一遍历整棵树,叶子在自己的 Update 里检查并标脏即可 |

用一句话概括:**方案 D 只合并了"汇总",本文把"计算"也合并了,并且把一个红点的全部逻辑收进了一个叶子类里。**

和方案 E 相比,本文更轻:没有单元组合层,也没有每帧预算,接入时只需要写一个叶子类。代价是同一份数据挂在多个入口时,每个入口的叶子会各算一次。对于大多数"一个数据对应一个入口"的红点,这个代价可以忽略;如果项目里红点计算很重、共享又很多,方案 E 会更合适。

* * *

## 三、原理

整套系统只有一个核心思路:**数据变化时只做标记,计算统一推迟到每帧的一个固定时机,并且只算被标记的部分。** 下面分五点展开。

### 3.1 路径树:叶子写逻辑,中间节点只求和

每个红点用一条路径标识,比如 `Mail_System`、`Mail_Guild`。按分隔符切开后逐级建树:`Mail` 是中间节点,`System` 和 `Guild` 是叶子。

![Image 2](https://pic3.zhimg.com/v2-5df0fdbbaddcf368aa72ad19fab3b24c_1440w.jpg)

树里的分工很明确:**只有叶子承载业务逻辑**,也就是"该亮几个";中间节点**只做一件事**,就是把子节点的数值加起来。中间节点也不需要手写,注册叶子时沿着路径缺哪一级就自动补哪一级。

为了让这棵树始终保持简单,有两个约束。第一,叶子下面不能再挂节点:一个节点要么算数,要么求和,不能两样都做。第二,同一份数据要在多个入口出现时,就在两条路径下各挂一个叶子,而不是做出"一个节点有两个父节点"的结构。这样树永远是树,求和也不会重复计数。

### 3.2 拉模式:业务只说"变了",叶子自己算

这是本文和主流方案最核心的区别。

在推模式下,业务代码要在数据变化时把红点数值算好,再推给红点系统。业务模块必须知道红点的存在,还得知道它的计算规则。

拉模式反过来:叶子自己订阅它关心的数据变化事件,收到之后**只标脏**,不做任何计算。真正的计算写在叶子的 `GetCount()` 里,由框架在合适的时机调用,直接读取当前数据。

这样做有三个好处:

*   **一个红点的全部逻辑都在一个类里**:订阅什么、怎么算,都在这里。删掉这个类和那一行注册,这个红点就彻底消失了。
*   **业务代码零改动**:业务模块照常发数据变化事件,完全不需要知道红点系统的存在。
*   **事件风暴无害**:一次同步收到 50 条变化事件,也只是标脏 50 次,而标脏几乎没有成本。

拉模式对 `GetCount()` 有一个要求:它应该是"当前数据的纯函数",只读、无副作用,任何时候调用都返回同样的结果。拉模式之所以正确,前提就是可以随时重算。

### 3.3 脏标记冒泡:标记从叶子一路传到根

`SetDirty()` 只做两件事:把自己标脏,然后沿父链把每个祖先都标脏。

它的成本是 O(树深度)。红点树一般只有三四层,所以这是常数级的开销,可以在任何事件回调里放心调用,调多少次都行。而且标脏是**幂等**的,标一次和标十次结果一样,合批的效果正是来自这一点。

之所以要一路冒泡到根,是因为后面每帧计算时,父节点要靠"自己脏了"这个信号才知道需要重新求和。冒泡就是把"下面有变化"这件事提前告诉整条路径。

### 3.4 每帧批量重算:后序遍历,只算脏节点

每帧在一个固定时机,从根节点往下走一遍,采用**后序遍历**,也就是先处理所有子节点,再处理自己。叶子如果脏了,就调用 `GetCount()` 拿到新值;中间节点如果脏了,就把子节点的当前值加起来。后序遍历保证了父节点求和的时候,子节点都已经是这一帧的最新值。

![Image 3](https://pic1.zhimg.com/v2-4ec7de9948b536b0a96fb00a4a3fe29e_1440w.jpg)

合批的效果就体现在这里:不管一帧里标脏多少次,每个节点最多计算一次。计算量只和"有多少节点变脏"成正比,和"来了多少个事件"无关。代价是数据变化后最多延迟一帧才反映到红点上,玩家感知不到。

这里有一个容易写错的细节:**脏标记必须在计算之前取走,不能在计算之后才清。** 如果某个子节点在遍历过程中(比如自己算完之后)又标脏了,标记会冒泡到父节点;父节点按旧值求和之后,会把这个标记一起清掉。到了下一帧,子节点算出了新值,父节点却已经不脏、不再求和,入口红点就一直停在旧值上。改成先取走再计算,遍历中新产生的标记就会留到下一帧处理:最多晚一帧,但不会丢。

### 3.5 遍历便宜,计算昂贵:只省计算

每帧都会完整走一遍整棵树,包括没有变脏的节点。这是有意为之。

把成本拆开看:遍历一个干净节点,只是一次虚调用加一次判断,几百个节点合计在微秒级;而计算一个脏节点要读数据、遍历背包、比较时间,这才是开销的大头。脏标记省下的正是这一部分。

统一遍历还带来一个好处:每个叶子每帧都有一次 `OnUpdate` 的机会。时间驱动的红点(冷却到期、每日重置)可以在这里自己检查,到点了就标脏,不需要额外的定时器,也不需要外部去推。

如果改用"脏节点集合",虽然能省掉对干净节点的遍历,但要另外维护一个集合,时间类红点也还是得另找挂点。在几百个节点的规模下,这笔交换并不划算。只有节点数量到了数千级,比如每个列表项都是一个动态节点的情况,才值得改成只遍历脏子树。

### 3.6 变化才通知:事件带路径,UI 先拉后推

节点重新计算后,只有数值**真的变了**,才会发出变更事件,事件里带上节点路径和新值。数值没变,就不打扰 UI。

UI 组件的行为分两步。显示的时候**先拉一次**:`OnEnable` 时直接查询当前值,界面隐藏期间错过的事件不用补,打开时拿到的就是最新值。之后**靠推**:只响应和自己路径相同的变更事件。

"当前选中的页签不显示红点"这类显示压制,放在 UI 层处理:只改 UI 组件的显示开关,不碰树里的数值。这样父节点的汇总不受影响,树里的数值也始终是真实状态。

### 3.7 小结

| 需求 | 靠哪条原理满足 |
| --- | --- |
| 层级汇总 | 3.1 路径树 |
| 多入口 | 3.1 多条路径各挂一个叶子 |
| 数据来源有三类 | 3.2 拉模式 + 3.5 叶子的 OnUpdate |
| 不依赖界面打开 | 3.2 树独立于 UI 存在 + 3.6 先拉后推 |
| 显示层压制 | 3.6 压制放在 UI 层 |
| 正确 | 3.4 后序遍历 + 先取走脏标记 |
| 性能 | 3.3 + 3.4 标脏合批,只算脏节点 |
| 接入成本低 | 3.2 一个叶子类 + 一行注册 |

* * *

## 四、实现

### 4.1 节点类型

一共四个类,继承关系如下:

**基类**只负责冒泡,以及"数值变了才通知":

```
public abstract class RedPointNode
{
    public string Name { get; internal set; }
    // 建树时算好并缓存,发事件时不再拼字符串
    public string FullPath { get; internal set; }
    public RedPointInternalNode Parent { get; internal set; }
    public bool IsDirty { get; protected set; }
    public int Count { get; private set; }

    public void SetDirty()
    {
        for (RedPointNode node = this; node != null; node = node.Parent)
            node.IsDirty = true;
    }

    protected void SetCount(int count)
    {
        if (count == Count) return;
        Count = count;
        RedPointManager.NotifyChanged(FullPath, count);
    }

    public virtual void Init()   { IsDirty = true; }
    public virtual void DeInit() { }
    public abstract void OnUpdate(float dt);
}
```

**叶子**:脏了就先清脏,再调 `GetCount()`:

```
public abstract class RedPointLeafNode : RedPointNode
{
    public override void OnUpdate(float dt)
    {
        if (!IsDirty) return;
        // 先清再算:GetCount 期间若再次标脏,保留到下一帧
        IsDirty = false;
        SetCount(GetCount());
    }

    public abstract int GetCount();
}
```

**事件叶子**:把事件订阅和解绑收进生命周期,子类只管声明"我关心哪些事件":

```
public abstract class RedPointEventLeaf : RedPointLeafNode
{
    readonly EventSubscriber _events = new EventSubscriber();

    public override void Init()
    {
        base.Init();
        SubscribeAll();
    }

    public override void DeInit()
    {
        _events.UnsubscribeAll();
    }

    protected virtual void SubscribeAll() { }

    // 最常见的用法:这个事件来了就标脏
    protected void DirtyOn(int eventId) => _events.Subscribe(eventId, (sender, e) => SetDirty());

    // 需要先过滤事件参数再决定是否标脏时用
    protected void Subscribe(int eventId, EventHandler<GameEventArgs> handler) => _events.Subscribe(eventId, handler);
}
```

一个拉模式的叶子写出来是这样的:订阅只声明"哪个事件来了要标脏",计算全在 `GetCount` 里。

```
public class RedPointNode_Mail_System : RedPointEventLeaf
{
    protected override void SubscribeAll()
    {
        DirtyOn(SystemMailChangedEvent.Id);
    }

    public override int GetCount()
    {
        return MailModel.Instance.CountUnread(MailType.System);
    }
}
```

之所以把 `LeafNode` 和 `EventLeaf` 分成两层,是因为 `LeafNode` 是纯计算,方便单测,也适合那些不需要订阅、只靠计时的叶子;`EventLeaf` 负责管理订阅的生命周期,子类不可能忘记解绑。

### 4.2 树的构建

路径用常量来定义,避免散落各处的字符串字面量拼错:

```
public static class MailRedPoint
{
    public const string Root   = "Mail";
    public const string System = Root + "_System";
    public const string Guild  = Root + "_Guild";
}
```

全部叶子都声明在一张注册表里,这也是新增红点时唯一需要改动的公共文件:

```
public static class RedPointTree
{
    public static readonly Dictionary<string, Type> Leaves = new Dictionary<string, Type>
    {
        { MailRedPoint.System, typeof(RedPointNode_Mail_System) },
        { MailRedPoint.Guild,  typeof(RedPointNode_Mail_Guild) },
        // ...
    };
}
```

建树时按路径逐级查找,缺哪一级就补哪一级,同时把每个节点登记进"路径 → 节点"的字典:

```
public void AddLeaf(string fullPath, Type leafType)
{
    var names = fullPath.Split('_');
    var parent = Root;
    for (int i = 0; i < names.Length - 1; i++)
    {
        var child = parent.GetChild(names[i]);
        if (child == null)
        {
            child = new RedPointInternalNode();
            parent.AddChild(names[i], child);
            _pathToNode[child.FullPath] = child;
        }
        parent = child as RedPointInternalNode
            ?? throw new Exception($"{fullPath}:{names[i]} 已经是叶子,不能再挂子节点");
    }

    var leaf = (RedPointLeafNode)Activator.CreateInstance(leafType);
    // 重名直接报错
    parent.AddChild(names[^1], leaf);
    _pathToNode[fullPath] = leaf;
}

public int GetCount(string fullPath)
{
    return _pathToNode.TryGetValue(fullPath, out var node) ? node.Count : 0;
}
```

路径只在建树时切分一次,运行期的查询都是 O(1) 的字典查找,不产生 GC。"叶子下面还要挂节点"和"路径重复"这两类结构冲突,都会在建树时直接报错,而不是等到运行期再静默出错。

### 4.3 初始化时机:建树和激活分开

```
加载配置后   → BuildTree()   只建结构:不订阅、不计算
登录数据就绪 → InitData()    整棵树 Init:全部标脏,叶子开始订阅
每帧         → Update()      未 Init 之前直接跳过
退出 / 重启  → DeInit()      整棵树递归 DeInit,叶子自动解绑
```

之所以要分两步,是因为登录过程中会有大量数据陆续到达。如果叶子一建好就开始订阅、计算,就会基于不完整的数据算出中间结果,红点会出现"亮了又灭"的闪烁。等数据全部就绪后再统一 Init:所有节点标脏,下一帧用完整的数据一次性算出来,结果是干净的。

### 4.4 每帧更新

管理器只做一件事,就是驱动根节点:

```
public void Update(float dt)
{
    if (!_inited) return;
    Root.OnUpdate(dt);
}
```

中间节点采用后序遍历,并且先取走脏标记:

```
public override void OnUpdate(float dt)
{
    bool dirty = IsDirty;
    // 先取走:遍历子节点期间新冒上来的标记留到下一帧
    IsDirty = false;

    foreach (var child in _children.Values)
        child.OnUpdate(dt);

    if (!dirty) return;
    int sum = 0;
    foreach (var child in _children.Values)
        sum += child.Count;
    SetCount(sum);
}
```

变更通知走事件队列,而不是同步回调。`NotifyChanged` 只是把事件放进事件系统的队列,UI 的处理函数要等到稍后统一分发时才执行。这样遍历期间不会执行任何 UI 代码,UI 也就不可能在遍历中途去改树;而 UI 收到事件时,整棵树这一帧已经全部算完,读到的是一致的状态。

### 4.5 UI 组件

界面上只需要挂一个组件、选一条路径:

```
public class UIRedPoint : MonoBehaviour
{
    public string Path;
    public ERedPointShowType ShowType;

    RedPointView _view;
    bool _hasData;
    bool _canShow = true;

    void OnEnable()
    {
        Events.Subscribe(RedPointChangedEvent.Id, OnChanged);
        // 先拉:隐藏期间错过的事件不用补
        Refresh();
    }

    void OnDisable()
    {
        Events.Unsubscribe(RedPointChangedEvent.Id, OnChanged);
    }

    void OnChanged(object sender, RedPointChangedEvent e)
    {
        // 后推:只认自己的路径
        if (e.Path == Path) Refresh();
    }

    void Refresh()
    {
        int count = RedPointManager.GetCount(Path);
        _hasData = count > 0;
        if (_hasData) EnsureView().SetCount(count);
        ApplyVisible();
    }

    // 显示压制:只改显示,不碰数据
    public void SetBadgeCanShow(bool canShow)
    {
        _canShow = canShow;
        ApplyVisible();
    }

    void ApplyVisible()
    {
        if (_view != null)
            _view.gameObject.SetActive(_hasData && _canShow);
    }
}
```

还有几处细节:

*   **红点的显示对象懒创建**:大部分红点在大部分时间都不亮,所以第一次需要亮时才实例化"点"或"数字"的 prefab。
*   **路径可以运行期替换**:列表项被复用后,调用 `ReplacePath(path)` 重新绑定,并立即刷新一次。
*   **样式切换要重建对象**:点和数字是两个不同的 prefab,切换时先销毁旧对象、把引用置空,再按新样式创建。`Destroy` 是延迟执行的,不能指望旧对象在同一帧就消失。
*   **Inspector 下拉选路径**:候选项直接读注册表,按 `_` 逐级展开,支持搜索。prefab 里不可能填出不存在的路径;如果某条路径被删了,对应字段会被自动清空。

### 4.6 新增一个红点:完整示例

以"免费抽卡"为例。它有两种触发方式:抽卡后次数变化(有事件),以及冷却时间到了(没有事件)。

**第一步:写叶子类。**

```
public class RedPointNode_Gacha_Free : RedPointEventLeaf
{
    float _checkTimer;

    protected override void SubscribeAll()
    {
        DirtyOn(GachaFreeTimesChangedEvent.Id);
    }

    public override void OnUpdate(float dt)
    {
        // 冷却到期没有事件:当前不亮时每秒自查一次
        _checkTimer -= dt;
        if (_checkTimer <= 0f)
        {
            _checkTimer = 1f;
            if (Count == 0 && GachaModel.Instance.FreeCooldownEnd <= ServerTime.Now)
                SetDirty();
        }
        // 自查放在 base 之前:标脏后本帧就能算出新值
        base.OnUpdate(dt);
    }

    public override int GetCount()
    {
        return GachaModel.Instance.CanFreeDraw ? 1 : 0;
    }
}
```

**第二步:在注册表里加一行。**

`{ GachaRedPoint.Free, typeof(RedPointNode_Gacha_Free) },`

**第三步:在界面上挂 `UIRedPoint`,下拉选择 `Gacha_Free`。** 主界面的抽卡入口则选 `Gacha`,它会自动汇总所有子红点。

整个过程中,抽卡的业务代码一行都不用改。

关于自查的位置:放在 `base.OnUpdate` 之前,当帧就能生效;放在之后,会晚一帧生效,但因为父节点是先取走脏标记的(见 3.4),结果仍然正确。

### 4.7 调试

最后是调试手段。运行时可以在 Inspector 里把整棵树和每个节点的当前计数展开显示:哪个父节点亮了、是被哪个叶子点亮的,一眼就能看出来。另外还有一个 GM 开关可以暂停红点系统的更新,用来判断某个红点到底是框架驱动的,还是界面自己另外设的。

* * *

## 五、总结

这套红点系统可以用一句话概括:**叶子只管算自己,树负责汇总,帧负责合批。**

*   **叶子只管算自己**:一个红点的订阅和计算都收在一个叶子类里,业务代码只需要照常发出数据变化事件,不需要知道红点系统的存在。
*   **树负责汇总**:父红点由路径自动生成,数值由子节点求和得出,不需要任何人手写。
*   **帧负责合批**:数据变化时只打标记,每帧统一计算一次。事件来得再密集,计算量也只取决于有多少节点变脏。

回到开头的四条标准:正确,靠后序遍历加上"先取走脏标记再计算";性能,靠标脏合批、只算脏节点;接入成本,新增一个红点只需要一个类加一行注册;可调试,树里的数值始终是真实状态,可以直接展开查看。

它适合红点数量多、层级深、数据来源杂的中大型项目。如果项目里只有十几个红点、几乎没有层级,用一张扁平的 key 表加观察者就足够了,不必引入一棵树。
