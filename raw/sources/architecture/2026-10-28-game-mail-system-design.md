---
title: 游戏开发：邮件系统的分布式逻辑与特殊用法
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2062549231966090581
source_type: link
platform: zhihu
captured: 2026-10-28
registered_at: 2026-10-30
inbox_ref: Archive/2026-10-28-game-mail-system-design.md
asset_ref: Assets/2026/10/game-mail-system-design.md
---

# 游戏开发：邮件系统（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2062549231966090581>
- 来源：知乎专栏
- 抓取方式：jina（18509 字符）

> 本篇重点不在邮件系统的基础实现，而是邮件的分布式逻辑和特殊用法。

## 普通邮件

```csharp
// 普通邮件数据结构
class Mail {
    long guid; // 唯一id
    int cid; // 模板id
    long createTime; // 创建时间
    long expireTime; // 过期时间(0表示未指定)
    long senderId; // 发送者(玩家) - 已逐渐放弃
    string senderName; // 发送者名字
    string title; // 标题
    string body; // 内容
    List<string> titleParams; // 标题文本参数（可选）
    List<string> bodyParams; // 内容文本参数(系统赋值)
    List<Item> items; // 附件
    int state; // 邮件状态(是否已读等，更多是Mask)
    int itemMask; // 已领取的附件下标Mask(可选)
    long publicId; // 公共邮件ID(撤回用)
}
```

### 消失的 P2P 邮件

作者早年玩的 DNF 和剑灵都支持玩家之间发送邮件；而现在的游戏大多只支持系统邮件，DNF 近年也对邮件系统做了大量限制，背后的原因：

1. 运营风控：盗号者资产转移，垃圾邮件攻击，交易监控
2. 经济调控：拍卖行交易可征收手续费（税），增加金币消耗
3. 技术风险：支持玩家间邮件需要考虑更多边界情况，出 Bug 的可能性更大

### 附件问题

作者第一个项目中，附件并未直接使用物品（Item）结构，而是定义了只含物品基础信息的结构：

```csharp
class MailItem {
    int cid; // 配置id
    int number; // 数量
    bool bind; // 绑定
    int param; // 额外参数
}
```

作者不赞同如此：不能实现 DNF/剑灵中发送道具的需求，也不能支持 GM 后台发送特殊属性道具——**会丢失物品的细节信息**。该项目最终未修改实现，拍卖行发放道具是通过和邮件同级别的事件实现的。现在仍有团队的邮件系统不支持直接邮寄道具。

### 邮件队列

几个项目的邮件数据都直接存储在 Player 下；不支持 P2P 邮件时数量通常不多，但某些操作（如背包不足时开宝箱/抽奖）仍可能产生较多邮件。

若担心邮件全加载到内存占用过多，可引入邮件队列：

1. 邮件不直接写入玩家 DB 对象，而是写入额外的邮件队列（MongoDB Document）
2. 通过消费时拉取 + 定时拉取拉取剩余邮件（MongoDB 可用 Change Stream）

与背包系统不同，邮件系统可以只展示最早收到的部分邮件，异步加载成为可能。

```csharp
class PlayerMailQueue {
    long playerId;
    List<Mail> queue;
}
```

**弱时序要求**：邮件系统对时序要求低，就像现实快递，**只关注送达，不关注送达顺序**。因此允许其它服务器直接操作玩家的邮件队列，可简化跨服活动发奖等问题。

---

## 公共邮件

```csharp
// 运营邮件数据结构
class PublicMail {
    long guid; // 唯一id
    int cid; // 模板id
    string tag; // 标签(撤回用)
    long createTime; // 创建时间
    long expireTime; // 过期时间(0表示未指定)
    string title; // 标题
    string body; // 内容
    List<string> titleParams; // 标题文本参数
    List<string> bodyParams; // 内容文本参数
    List<Item> items; // 附件
    int state; // 邮件状态
    // 筛选条件...
    int minLevel, maxLevel;
    int createRoleTime;
}
```

公共邮件主要服务于运营活动，与普通邮件相比的特征：

1. 面向全服玩家，但有筛选条件
2. 需要支持撤回
3. 存储在全局邮件表，通常为分布式系统

### 延迟创建（读裂变）

实现公共邮件时，通常不是主动向所有符合玩家的 DB（或邮件队列）插入数据，而是玩家在线时由 Game 服拉取公共邮件，然后插入到玩家 DB。主要原因：

1. 避免大规模写库，避免无效写入（僵尸号）
2. 需要支持撤销：延迟执行是撤销的基础，已发放的邮件通常无法撤回

PS：推模式 & 拉模式的权衡，是服务器开发者必须要学习的。

### 邮件撤回

有项目让 GM 后台分配邮件 GUID，通过 GUID 撤回；作者允许 GM 后台为邮件分配唯一 Tag，支持运营通过 Tag 或 GUID 撤回（添加成功时返回 GUID 给 GM 后台）。

撤回的最终实现，**通常是将邮件标记为无效**，而不是直接删除；删除邮件数据在分布式环境下可能引入额外复杂度，标记法更简单且可逆。公共邮件数量通常不多，长期保存有利于溯源。

对已进入玩家邮箱但尚未被领取的邮件，也可以撤回：在邮件上记录关联的公共邮件 ID，在玩家登录、拉取邮件等时间点检查关联公共邮件是否已撤回。但体验糟糕，实践中不常用。

```csharp
// 撤销公共邮件，recall：是否召回发送的邮件
public bool RevokePublicMail(string tag, bool recall = false);
```

### 可靠性问题

公共邮件的核心复杂度在可靠性，是面试常问点。公共邮件系统通常在中心服（Center），与玩家内存数据所在的 Game/Scene 服物理分离，涉及分布式问题：

1. 如何确保邮件一定送达
2. 如何确保邮件不被重复领取

```csharp
// 玩家身上的邮件组件
class MailComponent {
    HashSet<long> publicMails; // 已领取的公共邮件信息
    List<Mail> mails; // 当前邮件信息
}
// 拉取公共邮件：携带近期N条数据减少回传，携带Player部分数据进行筛选
public List<Mail> PullMails(long playerId, List<long> recentMails,
                            object playerData);
```

研究过网络层的开发者都知道怎么做：重发 + 去重。

1. Game 服定时向大区服请求玩家可领取的公共邮件，大区服返回
2. Game 服收到后，再根据本地领取记录去重

领取记录是否可删除？公共邮件数量不多（一年几十封），不删可行；要删也可行——Game 服拉取时由邮件服返回可删除的记录（过期 N 天以上）。

### 读缓存

担心频繁从中心服拉取成本高，可将公共邮件缓存到玩家所在 Game 服或 Scene 服——以服务器为单位定时同步，玩家只查本地缓存。

```csharp
class GameMailManager {
    List<PublicMail> publicMails; // 当前有效的公共邮件，从中心服拉取
}
```

该方案可减轻分布式问题，也有利于扩展筛选条件。

---

## 分布式事件

分布式服务器中存在大量跨服发奖和扣道具逻辑，要求可靠性和不重复执行。为避免每个开发者都考虑分布式问题，通常封装统一机制：分布式事件（领域事件）。

作者第一个项目的架构：游戏主要业务在场景服，玩家内存数据在这里。

1. 玩家数据由 Game 服入库，登录时序列化到玩家所在 Scene 服
2. 玩家与 Scene 服直连，Player 所有修改基于内存，定时同步到 Game 服入库
3. Game 服包含单服活动玩法，Center 包含大区内跨服玩法（8 服一组）

Game 服和 Center 服都有向 Player 发奖的情况。最简单的方式是所有跨服奖励都走邮件发放；但当时 Leader 设计了一套事件系统，主要负责 **Game 到 Scene** 的可靠性投递，解决投递过程中玩家可能**切换 Scene 服**的情况，但未处理服务器之间消息的可靠性投递（Game 和 Center 之间缺少机制）。

事件包含类型枚举，支持发放邮件、奖励、扣除道具。作者第二个项目关注的是服务器之间的可靠性投递：可靠性还是 TCP 那套 Seq+Ack 逻辑，真正复杂的是游戏行业的合服需求。

### 合服逻辑

Game 服可能被合并，Center 服后期也可能被合并；Game 自身既是生产者也是消费者，生产者和消费者合并的情况都要考虑：

1. 推模型 OR 拉模型？推模型更简单，拉模型复杂度高
2. 生产者合并：新生成的事件需在既有事件之后投递；保留合服前单服事件的投递时序
3. 消费者合并：确认信息无法合并，仍需按合服前的服务器 ID 确认
4. 每个物理生产者和消费者，在逻辑上扮演多个生产者和消费者

事件数据结构：

```csharp
class DomainEvent {
    long guid; // 事件唯一ID（单服递增）
    long playerId; // 玩家ID
    long createTime; // 创建时间
    long expireTime; // 过期时间
    int procVersion; // 进程版本(每次启服+1)
    int srcNodeId; // 发送端服务器ID(合服前)
    int destNodeId; // 接收方服务器ID(合服前)
    long seq; // 事件序号（可不连续）
    int type; // 事件类型（兼版本）
    byte[] data; // 事件数据
}
```

1. procVersion 每次启服 +1，使新事件一定排在旧事件之后
2. 发送方和接收方保留原始服务器 ID，消息确认仍基于原虚拟链路
3. seq 连续时可按 sequence 排序和确认（和 TCP 一致）
4. seq 不连续但递增时，可在每次投递时携带前一个事件的 Guid

不设计这么复杂可以吗？可以！实际情况：

1. 事件大多面向 Player，Player 之间的事件通常不需要时序（也无法保证，玩家可能切服）
2. 即便单玩家的事件，也多不要求时序，只要求成功执行（邮件、发奖、扣道具）
3. 停服时未送达的事件数量极少

所以知晓潜在问题即可，通常只需实现基础的可靠性投递（完整实现成本巨高）。

---

## 邮件的它用

同事的观点：所有领奖逻辑都可以走邮件系统，开启宝箱（UI）也可以做成邮件，只是表现不同。可以为邮件设计多个 Channel，每个功能定义自己的 Channel 或复用同一个隐式 Channel，**领取奖励实际上是领取邮件**（活动奖励已结算为邮件，随时可领取）。

经验分享：

1. 所有跨服奖励都走邮件系统发放，虽然奖励不直接进背包表现稍差，但可减少巨量复杂度——DNF 就是很好的例子
2. 避免过于严格的背包空间测试，越严格越容易出 Bug；背包空间不足时奖励自动进邮箱——DNF 的云幂罐子 Bug 甚至改变了游戏进程

游戏开发者需要有足够的游戏经历，才能在编写对应系统时避免踩坑。

---

## 结语

邮件是游戏后端的核心系统之一，大量系统依托在邮件系统上；良好的邮件系统实现，是团队成员学习分布式知识的极佳案例。
