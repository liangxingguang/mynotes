---
title: 事件溯源：系统如何偷偷记下你的一举一动
source: 微信公众号（码农有道）
source_url: https://mp.weixin.qq.com/s/zLuppepFzQBk-3MK1J1c7A
source_type: article
platform: 微信
captured: 2026-11-20
registered_at: 2026-11-21
inbox_ref: Inbox/2026-11-20-event-sourcing.md
asset_ref: Assets/2026-11/wechat-zLuppepFzQBk-3MK1J1c7A.md
---

# 事件溯源：系统如何偷偷记下你的一举一动

个人其它平台技术视频：

*   小红书ID：码农有道

*   B站ID：码农有道

*   知乎ID：砖一块一块搬

注：本文对应视频详解版已同步更新在小红书、B站，统一搜索码农有道就能找到。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

* * *

* * *

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

## 事件溯源（Event Sourcing）

在传统的数据存储方式中，我们通常只关心实体的当前状态。例如，在电商系统中，数据库中会保存用户订单的现有信息：包含哪些商品、数量多少、收货地址等。

然而，事件溯源（Event Sourcing）采用了一种完全不同的思路：它并不是直接存储当前状态，而是保存导致当前状态的一系列事件。每个事件都代表了系统中真实发生过的一次操作，就像银行流水账单那样，逐笔记录了所有交易。

这些事件是以追加的方式存储下来，一旦写入，就不会被修改或删除，系统的最终状态可以通过按时间顺序回放这些事件来得到，就像我们可以通过回放所有交易记录来计算出当前银行账户余额一样。

这种方式特别适合那些对审计和追溯要求很高的应用场景。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

## 事件溯源的工作原理

在事件溯源系统中，应用状态的每一次变化都会被记录为一个事件对象。并保存在专门的事件存储中——一种专门为事件数据而优化的数据库，整个流程通常包括以下几个步骤：

1.  事件创建：当用户执行某个操作（例如提交订单）时，应用会创建一个描述该操作的事件对象。

2.  事件存储：事件会被追加写入事件存储中。这里的特点是只能新增事件，不能修改或删除，从而保证历史记录的完整性。

3.  状态重建：当应用需要获取某个实体的当前状态（例如某个订单）时，会从事件存储中读取与该实体相关的所有事件，并按照时间顺序逐一回放，从而重建出最终状态。

以电商应用为例：系统并不是直接保存购物车的状态（商品、数量等），而是记录一系列事件，例如“xx 商品加入购物车”、“xx 商品移出购物车”、“xx 商品数量更新”等。每个事件都代表一次具体的变更。通过按顺序回放这些事件，系统就能够在任意时刻还原出购物车的最新状态。

## 事件溯源中的状态重建

在事件溯源中，状态重建指的是：从事件存储中读取与某个实体相关的所有事件，并按照时间顺序依次应用，最终得到该实体的当前状态。换句话说，就是把这个实体经历过的所有变化重新“演练”一遍，从而还原出它的现状。

还是以电商应用为例，一个订单可能会经历“已创建”、“已支付”、“已发货”等一系列状态。为了确定订单的当前状态，系统通常需要：

1.  从事件存储中取出该订单的所有相关事件；

2.  初始化一个空的订单对象；

3.  按照事件发生的顺序，依次将这些事件应用到订单对象上。

当这一过程结束时，订单对象就会展现出订单的最新状态。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

###### 在状态重建中使用快照

随着时间推移，某些实体可能会积累大量事件。如果每次都要从最早的事件开始回放来重建状态，效率就会变得非常低下。为了解决这个问题，通常会引入快照（Snapshot）机制。

所谓快照，就是在某个时间点上记录下实体的完整状态。这样，在进行状态重建时，应用就不必再从最初的事件开始，而是可以先加载最近一次快照，然后只回放快照之后发生的事件，就能更快地得到当前状态。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

## 优缺点分析

###### 优点

*   可审计性：事件溯源完整保留了系统中的所有变更历史，使得我们能够清晰地追踪某个实体在不同时间点的状态，非常适合审计和追溯场景。

*   可调试性：通过重放事件，可以在任意时刻复现实体的状态，从而更方便地定位问题和调试系统。

*   灵活性：由于状态是由事件推导出来的，因此在不修改历史数据的前提下，开发者可以更容易地扩展新功能或调整现有逻辑。

###### 缺点

*   复杂性：事件溯源会增加系统设计和实现的复杂度，开发者需要围绕事件进行系统建模，同时还要处理状态重建和快照管理。

*   存储压力：所有事件都需要长期保存，对于运行时间较长、事件量巨大的系统来说，存储开销都不容忽视。

*   数据隐私：完整保存所有历史事件可能带来隐私风险，尤其是在涉及敏感数据时，必须采取额外措施来确保安全合规。

推荐阅读：

**[完全整理 | 365篇高质技术文章目录整理](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247486191&idx=1&sn=5ea5fd098a3e0da834d882cf53529977&scene=21#wechat_redirect)**

[万字长文彻底搞明白Linux 内核通知链](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247500026&idx=1&sn=cb6769c40570d182a55b1847a1a426b3&scene=21#wechat_redirect)

[一张图总结系统设计中的33个黄金法则](http://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247495777&idx=1&sn=785a3cf0af167f69d212455f01e794cb&chksm=9729211ba05ea80de1851162d548cb51fa82f298712d2e302eb291925072dc9fc72941109eda&scene=21#wechat_redirect)

[LeetCode 虐了我 8 年，直到我学会了这 15 种模式](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247499739&idx=1&sn=0b4964ed7fcee0cfcb9737888caf9255&scene=21#wechat_redirect)

[每个开发人员都应掌握的 GPU 计算原理，五分钟搞懂](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247500521&idx=1&sn=41b78fc951f6fbde73ad3980f280ec6f&scene=21#wechat_redirect)

[动态规划刷题刷崩溃的人，就是因为没搞懂这 20 种套路 ！](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247500378&idx=1&sn=c6fbe18832c54117d951cb4e69176f02&scene=21#wechat_redirect)

[花了 4 个月啃完了 TCP 源码：看完你可能比 Wireshark 还懂 TCP！](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247500609&idx=1&sn=0c17b33268476421f5fc6508d8d06dab&scene=21#wechat_redirect)

[花了 6 个月吭完源码，我用 30 张 图 扒光了文件系统的底层逻辑 ！](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247500808&idx=1&sn=47e295ff411f2eaceb9f7368cc6cfc9c&scene=21#wechat_redirect)

**专注服务器后台技术栈知识总结分享**

**欢迎关注交流共同进步**

也可扫码添加个人微信交流技术，职场发展~

添加时请注明公司名（或学校名）+方向！！

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

**码农有道 coding**

码农有道，和您聊技术，和您聊职场，和您聊互联网那些事！
