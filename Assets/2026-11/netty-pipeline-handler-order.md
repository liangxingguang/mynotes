> Netty 的 pipeline 是一条双向链：进来的事件顺着添加顺序走，出去的动作逆着走。这篇讲读与写的完整路径、ctx.write 与 channel.write 的区别、@Sharable 的陷阱，以及三个最常见的用法错误。

第一次读 Netty 代码，很容易被 pipeline 绕晕。

明明只加了三个 handler，消息却从后往前跑；明明调了 `write`，对端却什么都没收到。

原因不复杂：**pipeline 是一条双向链，进和出不是同一个方向。**

## pipeline 是一条双向链

每个 Channel 有且只有一个 `ChannelPipeline`，里面是一条 handler 的双向链表。

handler 分两类：

*   **inbound**：处理进来的事件——读到数据、连接建立、连接断开、异常。

*   **outbound**：处理出去的动作——写、flush、关闭。

一个 handler 可以同时实现两边（比如 `ChannelDuplexHandler`），但方向是分开算的。

## 方向：进从头到尾，出从尾到头

这是全篇最该记住的一句：

*   inbound 事件从 head 开始，逐个往后传，直到 tail。

*   outbound 操作从 tail 开始，往前传，直到 head 发出。

所以 `addLast(A, B, C)` 之后：

读数据时，顺序是 A → B → C。

写数据时，如果你在 C 里调 `ctx.write`，它会经过 B、A，再到 head 发出去。

**添加顺序对 inbound 是正序，对 outbound 是反序。** 很多人把编码器加在业务 handler 后面，就是因为没转过这个弯。

## 读的路径：字节怎么变成对象

一条消息进来，通常走三段：

1.  socket 读到 `ByteBuf`，交给第一个 inbound handler。

2.  解码器把字节流切成「一帧」，再把这帧转成对象。

3.  业务 handler 拿到对象，处理。

粘包半包就在第 2 段解决。`ByteToMessageDecoder` 的职责不是「解析业务」，是**攒够一条再往下传**——它自己维护一个累积缓冲，数据不够就先不往下走。

这也是为什么解码器不能加 `@Sharable`：它带着每条连接各自的缓冲状态。

## 一个例子：登录包走完三段

一个 20 字节的登录包进来，按顺序发生这些事：

**第一步**，socket 可读，Netty 读出若干字节，可能是完整的 20 字节，也可能只有 12 字节。

**第二步**，长度字段解码器看头 4 个字节里的长度值。如果长度说 20、实际只到了 12，它就把这 12 个字节留在自己的累积缓冲里，**不往下传**。等剩下的 8 个字节到了，拼成完整一帧，才交给下一个 handler。

**第三步**，业务解码器把这一帧按约定的格式解析成对象，`LoginHandler` 收到的是对象，不是字节。

三段里每一段的故障表现都不同：

*   第一步没数据：连接本身有问题，或者对端没发。

*   第二步不往下传：长度字段配错了，它永远等不到「够」的那一刻。

*   第三步报错：字节到了，但格式对不上，通常是协议版本或字段顺序的问题。

## 写的路径：write 只是入队

两个方法长得很像，起点完全不同：

*   `ctx.write(msg)`：从**当前 handler** 往前传，只经过它前面的 outbound handler。

*   `channel.write(msg)`：从 **tail** 开始，走完整条链。

更关键的一点：**write 只是把消息放进缓冲区，flush 才真正发出去。**

`writeAndFlush` 是两个动作合在一起。只 write 不 flush，数据会安静地待在缓冲里，对端什么都收不到。

排查「日志显示写了，但对方没收到」，第一个要看的就是这里。

顺带一个习惯：一次要写多条消息时，可以先全部 `write`，最后一次 `flush`。比每条都 `writeAndFlush` 少很多次系统调用，在批量推送里差别明显。

## 编解码器为什么都在前面

因为写出是反的：从 tail 往 head。

`addLast` 的顺序如果是「编码器、业务 handler」，业务 handler 在更靠 tail 的位置。它调 `ctx.write`，往 head 方向走，正好先经过编码器——对象变成字节，再发出。

反过来，写成「业务 handler、编码器」：业务靠 head 一侧，写的时候一路走到 head，把对象原样交出去，对端收到的就是一堆读不懂的东西。

一句话记：**读是 head 到 tail，写是 tail 到 head，两个方向都要求编解码器位于业务 handler 的 head 一侧。**

所以习惯写法是：**编解码器先加，业务 handler 最后加。**

## 顺序错了，症状是什么

不用猜，看现象就能定位：

| 现象 | 多半是 |
| --- | --- |
| 业务 handler 收到的是 `ByteBuf`，不是对象 | 解码器加在了它后面 |
| 下一段逻辑一直不执行 | 某个 handler 忘了 `fireChannelRead` |
| 对端收到乱码或解析失败 | 编码器位置不对，或根本没加 |
| 数据写成功但对端没反应 | 只 `write` 没 `flush` |
| 两个连接的响应串了 | 有状态的 handler 加了 `@Sharable` |

## @Sharable：能复用，但不能有状态

handler 默认是**每个 Channel 新建一个实例**。加 `@Sharable` 才允许所有连接共用同一个。

前提是无状态。

把「当前连接的用户 ID」存成成员变量，一旦复用，数据就会串到别的连接上——这种 bug 极难复现，因为要正好两个连接交替触发。

有状态的东西放在 `Channel` 的 attribute 里，或者直接放进消息对象往下传。

## 在 handler 里阻塞，代价是一整条 EventLoop

handler 默认跑在 `EventLoop` 线程上，而一个 `EventLoop` 服务很多条 Channel。

在 `channelRead` 里查一次库，这个 `EventLoop` 上的所有连接一起等。

正确做法：把耗时逻辑交给业务线程池，处理完再写回 Channel。**`write` 是线程安全的**，可以跨线程调用。

## 三个坑

**一、读完不往下传。**

忘了 `ctx.fireChannelRead(msg)`，后面的 handler 永远收不到。表现是「日志里明明有数据，业务就是不执行」。

**二、忘了释放。**

`ByteBuf` 用完要 `release()`。图省事可以继承 `SimpleChannelInboundHandler`，它会自动释放。混着用的时候最容易漏。

**三、以为 `channel.write` 只走自己后面。**

方向是反的，它从 tail 开始，会经过整条链上所有的 outbound handler——包括你没打算让它经过的那个。

## 一张对照表

| 动作 | 起点 | 说明 |
| --- | --- | --- |
| `ctx.fireChannelRead` | 当前 handler 之后 | 手动把读事件往下传 |
| `ctx.write` | 当前 handler 之前 | 只经过前面的 outbound |
| `channel.write` | tail | 走完整条链 |
| `writeAndFlush` | 同上 | write 加 flush，缺一不可 |
| `ctx.close` | 当前 handler 之前 | 关闭也会沿链传播 |

* * *

pipeline 本身不难，难的是记住方向。

一个实用的记法：**进来的事件顺着你写的顺序走，出去的动作逆着你写的顺序走**——所以编解码器都加在前面，业务 handler 加在最后。

你在 handler 顺序上踩过什么坑？评论区说说。

* * *

> 本文讲的是 pipeline 的传播机制，未覆盖所有事件类型；具体行为以 Netty 4.1 官方文档与源码为准。

---

抓取信息：
- url: https://mp.weixin.qq.com/s/6akSvZW-gEm_PZJMri2OfQ
- fetch_level: browser
- chars: 4178
