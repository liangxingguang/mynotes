---
title: 【新文导读】详解IM消息已读未读功能的高并发技术实现
source: 微信公众号（52im.net 即时通讯网）
source_url: "https://mp.weixin.qq.com/s/Ga3_pzKOMT6lo23QN1Wcag"
source_type: link
platform: wechat
captured: 2026-11-23
registered_at: 2026-11-23
inbox_ref: Inbox/2026-11-23-im-read-receipt-high-concurrency.md
asset_ref: Assets/2026-11/weixin-ga3-pzkomt6lo23qn1wcag.md
---

# 【新文导读】详解IM消息已读未读功能的高并发技术实现

## 一、引言

**💯 即时通讯IM系统中的聊天消息已读未读功能，从来都不是UI上那个“小红点功能”那么简单，它本质上是一个横跨长连接、消息顺序、状态一致性、在线路由与高并发存储的完整系统工程。  

**本文不讲 Demo，而是站在IM生产环境的视角，完整拆解一套可水平扩展、可容灾、可演进的聊天消息单聊已读未读架构技术实现。****

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

## 二、本文目录

1）引言

2） “已读未读”有多难？

3）“已读”到底是在实现什么？

4）彻底解耦长连接、消息存储、状态计算

5）数据模型设计

6）关键原理：“游标推进”比“逐条更新”更稳

7）从发消息到已读通知的完整闭环

8）生产级代码示例：不只能跑，还能上线

9）消息发送链路一次讲透

10）已读推进链路：用Lua保证原子性与幂等

11）推送不要广播全网关，尽量精准投递

12）未读数缓存不是事实源，修正机制必须存在

13）真实场景：电商客服单聊已读未读如何落地？

14）高并发优化：瓶颈通常不在你以为的地方

15）系统出问题时，状态还能不能收回来？

16）容器化与云原生部署

17）架构演进：从1万连接到百万在线

18）一套真正能落地的“已读未读”方案就该这样

19）最后的建议

20）参考资料

## 三、“已读未读”有多难？

很多团队第一次做 IM 或站内信，都会低估已读未读的复杂度。

在单机 Demo 中，这个问题看起来非常简单：

*   1）消息写库；

*   2）给接收人未读数 +1；

*   3）用户打开会话时把消息标记为已读；

*   4）通知发送人“对方已读”。


但一旦进入生产环境，问题会立刻升级：

*   1）连接是分布式的：发送方在 ws-gateway-1，接收方可能在 ws-gateway-8；

*   2）消息是异步流转的：写库、推送、ACK、未读数更新未必发生在同一个事务里；

*   3）客户端可能乱序上报：先收到第 105 条消息的 ACK，再收到第 104 条 ACK；

*   4）系统必须抗重复：Kafka 重投、客户端重发、网关重连都可能导致重复处理；

*   5）系统必须可扩展：不能把已读状态压死在数据库行锁上；

*   6）系统必须可恢复：节点宕机、Redis 短暂抖动、Kafka 消费回溯都不能把状态打乱。


所以，生产级已读未读系统的核心目标并不是“做出这个功能”，而是：

*   1）正确性优先：已读位置单调递增，不能回退。

*   2）顺序性可控：同一会话内消息与回执的业务顺序可推导。

*   3）高并发可承载：写路径异步化，热点状态缓存化。

*   4）系统可水平扩展：网关无状态，业务服务无会话粘性依赖。

*   5）故障下可收敛：允许最终一致，但要保证最终正确。


## 四、“已读”到底是在实现什么？

很多系统后期返工，不是因为代码写错，而是因为语义定义不清。

单聊“已读未读”至少有三种常见定义：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

对于单聊生产系统，我建议优先采用：按会话维护“已读游标（read cursor）”。

即：

*   1）每个会话（conversation）对每个参与人，只维护一个 last\_read\_message\_seq；

*   2）只要消息序号 <= last\_read\_message\_seq，都视为已读；

*   3）客户端只上报“我已经读到了哪一条”，而不是逐条 ACK。


这个模型有四个优势：

*   1）状态量从“消息数”降到“会话数”；

*   2）天然支持 ACK 合并，避免 ACK 风暴；

*   3）更新逻辑天然幂等，适合 MQ 重试；

*   4）很适合与 Redis、Kafka、MySQL 做组合架构。  

    


## 五、彻底解耦长连接、消息存储、状态计算

生产环境不要把 WebSocket、消息写库、未读计算、回执推送全部堆在一个服务里。

推荐拆成如下角色：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

整体链路：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

为什么一定要解耦？

因为 WebSocket 网关的第一职责应该是：

*   1）快速收包；

*   2）轻量校验；

*   3）异步投递；

*   4）快速回写。


而不是：

*   1）做复杂事务；

*   2）查多张表；

*   3）做长时间阻塞；

*   4）参与高冲突状态更新。


一旦网关承担太多业务逻辑，系统会同时失去三件事：

*   1）连接承载能力；

*   2）扩容弹性；

*   3）故障隔离能力。


**

## 六、数据模型设计

**

**会话与消息表：**

```
CREATE TABLE im_conversation (
```

****设计要点：****

*   1）msg\_seq 必须在会话内单调递增；

*   2）client\_msg\_id 用于发送幂等，避免客户端重试造成重复消息；

*   3）uk\_conv\_seq 保证同一会话序号唯一。


******已读游标表：******

```
CREATE TABLE im_conversation_read_cursor (
```

********Redis 状态模型：**建议 Redis 只承担高频读写缓存状态，不要把它当最终事实源。******

```
在线路由
```

********原则很简单：********

*   1）Redis 负责快；

*   2）MySQL 负责准；

*   3）Kafka 负责解耦与削峰。


**

## 七、全文链接

**

👉️即时通讯网(52im.net)社区链接：http://www.52im.net/thread-4929-1-1.html，或点击下文的“**阅读原文**” 👈️

## 八、参考文献

\[1\] 零基础IM开发入门(一)：什么是IM聊天系统？

http://www.52im.net/thread-3065-1-1.html

\[2\] 零基础IM开发入门(四)：什么是IM聊天系统的消息时序一致性？

http://www.52im.net/thread-3189-1-1.html

\[3\] IM热门功能思考：为什么微信里没有消息“已读”功能？

http://www.52im.net/thread-2184-1-1.html

\[4\] IM群聊消息的已读未读功能在存储空间方面的实现思路探讨

http://www.52im.net/thread-3054-1-1.html

\[5\] IM群聊消息的已读回执功能该怎么实现？

http://www.52im.net/thread-1611-1-1.html

\[6\] 企业微信的IM架构设计揭秘：消息模型、万人群、已读回执、消息撤回等

http://www.52im.net/thread-3631-1-1.html

\[7\] 阿里IM技术分享(一)：企业级IM王者——钉钉在后端架构上的过人之处

http://www.52im.net/thread-2848-1-1.html

\[8\] 如何保证IM实时消息的“时序性”与“一致性”？

http://www.52im.net/thread-714-1-1.html

\[9\] 浅谈移动端IM的多点登录和消息漫游原理

http://www.52im.net/thread-867-1-1.html

\[10\] 一套亿级用户的IM架构技术干货(下篇)：可靠性、有序性、弱网优化等

http://www.52im.net/thread-3445-1-1.html

\[11\] 阿里IM技术分享(七)：闲鱼IM的在线、离线聊天数据同步机制优化实践

http://www.52im.net/thread-3856-1-1.html

\[12\] IM开发干货分享：浅谈IM系统中离线消息、历史消息的最佳实践

http://www.52im.net/thread-3887-1-1.html

\[13\] 如何保障分布式IM聊天系统的消息可靠性（即消息不丢）

http://www.52im.net/thread-4889-1-1.html

\[14\] IM踩坑：聊天消息ID怎么设计？一个UUID搞不定，我用双ID解决

http://www.52im.net/thread-4928-1-1.html

\[15\] 一套海量在线用户的移动端IM架构设计实践分享(含详细图文)

http://www.52im.net/thread-812-1-1.html

\[16\] 一套亿级用户的IM架构技术干货(下篇)：可靠性、有序性、弱网优化等

http://www.52im.net/thread-3445-1-1.html

\[17\] 融云技术分享：全面揭秘亿级IM消息的可靠投递机制

http://www.52im.net/thread-3638-1-1.html

\[18\] 微信团队分享：来看看微信十年前的IM消息收发架构，你做到了吗

http://www.52im.net/thread-4636-1-1.html

\[19\] 深度剖析IM消息乱序的根本原因及优化方法

http://www.52im.net/thread-4925-1-1.html
