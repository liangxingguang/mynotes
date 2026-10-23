---
title: 绝对干货：基于Netty实现海量接入的推送服务技术要点
source: 52im.net（李林锋，原载 InfoQ）
source_url: http://www.52im.net/thread-166-1-1.html
source_type: article
platform: 52im.net
captured: 2026-10-23
registered_at: 2026-10-24
inbox_ref: Inbox/2026-10-23-netty-million-connection-push-service.md
asset_ref: Assets/2026/10/netty-million-connection-push-service.md
---

# 绝对干货：基于Netty实现海量接入的推送服务技术要点

作者：李林锋（Netty 中国社区创始人，《Netty 权威指南》作者，原华为高性能通信软件工程师），原文首发于 InfoQ。

## 一、引言

### 1 关于本次话题

很多从事移动互联网和物联网开发的同学咨询推送服务相关的问题，大概可以归纳为如下几类：

- Netty 是否可以做推送服务器？
- 如果使用 Netty 开发推送服务，一个服务器最多可以支撑多少个客户端？
- 使用 Netty 开发推送服务遇到的各种技术问题。

### 2 关于推送服务

移动互联网时代，推送(Push)服务成为 App 应用不可或缺的重要组成部分，推送服务可以提升用户的活跃度和留存率。随着物联网的发展，大多数智能家居都支持移动推送服务，未来所有接入物联网的智能设备都将是推送服务的客户端，这就意味着推送服务未来会面临海量的设备和终端接入。

### 3 推送服务的特点

- 使用的网络主要是运营商的无线移动网络，网络质量不稳定，容易发生网络闪断；
- 海量的客户端接入，而且通常使用长连接，无论客户端还是服务端，资源消耗都非常大；
- 由于谷歌的推送框架无法在国内使用，Android 的长连接由每个应用各自维护，每台安卓设备上会存在多个长连接。即便没有消息需要推送，长连接本身的心跳消息量也非常巨大，导致流量和耗电量增加；
- 不稳定：消息丢失、重复推送、延迟送达、过期推送时有发生；
- 垃圾消息满天飞，缺乏统一的服务治理能力。

## 二、某智能家居领域的真实案例

### 1 问题描述

智能家居 MQTT 消息服务中间件，保持 10 万用户在线长连接，2 万用户并发做消息请求。程序运行一段时间之后，发现内存泄露，怀疑是 Netty 的 Bug。其它相关信息：

- 服务器内存 16G，8 个核心 CPU；
- Netty 中 boss 线程池大小为 1，worker 线程池大小为 6（后调整为 11，问题依旧）；
- Netty 版本为 4.0.8.Final。

### 2 问题定位

dump 内存堆栈分析发现：Netty 的 ScheduledFutureTask 增加了 9076%，达到 110 万个左右的实例。业务代码使用 IdleStateHandler 在链路空闲时进行业务逻辑处理，但空闲时间设置过大，为 15 分钟。

Netty 的 IdleStateHandler 会根据使用场景启动三类定时任务（ReaderIdleTimeoutTask、WriterIdleTimeoutTask、AllIdleTimeoutTask），都会被加入到 NioEventLoop 的 Task 队列中被调度执行。由于超时时间过长，10 万个长连接会创建 10 万个 ScheduledFutureTask 对象，每个对象还保存有业务的成员变量，非常消耗内存。用户持久代设置较大，一些定时任务被老化到持久代中，没有被 JVM 垃圾回收，内存一直增长，被误认为内存泄露。

重新设计后将超时时间设置为 45 秒，内存可以正常回收，问题解决。

### 3 问题总结

如果是 100 个长连接，即便是长周期的定时任务，也不存在内存泄露问题，新生代 minor GC 就可以回收。正是因为十万级的长连接，导致小问题被放大。对于海量长连接的推送服务，代码处理稍有不慎，就满盘皆输。

## 三、Netty 海量接入服务的技术要点

### 1 最大句柄数修改

百万长连接接入，首先需要优化 Linux 内核参数，默认单进程打开的最大句柄数是 1024（ulimit -a 查看）。超过上限后报 "too many open files"，所有新的客户端接入将失败。

通过 /etc/security/limits.conf 配置：

```
* soft nofile 1000000
* hard nofile 1000000
```

注意：句柄数达到一定数量级后处理效率将明显下降，需根据硬件配置和处理能力合理设置；单机性能不行可以通过集群方式实现。

### 2 当心 CLOSE_WAIT

移动无线网络可靠性非常差，经常存在客户端重置连接、网络闪断等。在百万长连接的推送系统中，服务端设计要点：

- 客户端的重连间隔需要合理设置，防止连接过于频繁导致的连接失败（例如端口还没被释放）；
- 客户端重复登录拒绝机制；
- 服务端正确处理 I/O 异常和解码异常等，防止句柄泄露。

特别注意 close_wait 过多问题：服务端收到客户端 FIN 后协议栈自动回 ACK，连接进入 close_wait 状态；如果服务端不执行 socket 的 close() 操作，状态无法迁移到 last_ack。一个 close_wait 会维持至少 2 个小时（系统默认超时 7200 秒）。close_wait 状态的链路不释放句柄和内存等资源，积压过多会导致系统句柄耗尽，发生 "Too many open files" 异常，新的客户端无法接入。

**导致 close_wait 过多的可能原因：**

- 程序处理 Bug，收到对方 FIN 之后没有及时关闭 socket（可能是 Netty 的 Bug，也可能是业务层 Bug）；
- 关闭 socket 不及时：例如 I/O 线程被意外阻塞，或者 I/O 线程执行的用户自定义 Task 比例过高，导致 I/O 操作处理不及时，链路不能被及时释放。

**设计要点 1：不要在 Netty 的 I/O 线程上处理业务（心跳发送和检测除外）。**

Netty 的 Reactor 线程数必须收敛，默认值是 CPU 核数 × 2。对于非阻塞 I/O，线程数经验值是 [CPU核数+1, CPU核数×2] 之间。

假如单服务器支撑 100 万个长连接，内核数 32，则单个 I/O 线程处理的连接数 L = 100万/(32×2) = 15625。假如每 5s 有一次消息交互，则平均 CAPS = 15625/5 = 3125 条/秒——对 Netty 压力不大。但实际业务经常有额外复杂逻辑（性能统计、记录接口日志等），如果在 I/O 线程上直接做业务逻辑处理，可能阻塞 I/O 线程，影响其它链路的读写操作，导致被动关闭的链路不能及时关闭，造成 close_wait 堆积。

**设计要点 2：在 I/O 线程上执行自定义 Task 要当心。**

NioEventLoop 支持两种自定义 Task：普通 Runnable（execute）和定时任务 ScheduledFutureTask（schedule）。它们的执行会抢占 NioEventLoop I/O 读写的 CPU 时间，如果自定义 Task 过多或单个 Task 执行周期过长，会导致 I/O 读写被阻塞，间接导致 close_wait 堆积。

如果用到了 Runnable 和 ScheduledFutureTask，请合理设置 ioRatio 比例（setIoRatio，默认值 50，即 I/O 操作和用户自定义任务执行时间比 1:1）。建议：处理海量客户端长连接时，不要在 NioEventLoop 中执行自定义 Task 或非心跳类的定时任务。

**设计要点 3：IdleStateHandler 使用要当心。**

用 IdleStateHandler 做心跳发送和检测比自己启定时任务更高效，值得提倡。但心跳业务逻辑处理时延要可控，防止时延不可控导致 NioEventLoop 被意外阻塞。例如：心跳超时或发生 I/O 异常时，业务调用 Email 发送接口告警，邮件服务端处理超时导致发送客户端被阻塞，级联引起 IdleStateHandler 的 AllIdleTimeoutTask 任务被阻塞，最终 NioEventLoop 多路复用器上其它链路读写被阻塞。ReadTimeoutHandler 和 WriteTimeoutHandler 同样存在此约束。

### 3 合理的心跳周期

百万级推送服务意味着百万个长连接，每个长连接都需要靠心跳维持链路。心跳周期设置需要考虑移动无线网络的特点：

手机连上移动网络时并没有真正连上 Internet，运营商分配的是内网 IP，需通过运营商网关（GGSN）做 NAT 地址转换。由于运营商为了减少网关 NAT 映射表的负荷，如果链路有一段时间没有通信就会删除其对应表，造成链路中断。以中移动 2.5G 网络为例，大约 5 分钟左右的基带空闲，连接就会被释放。

因此心跳周期不能设置太长（否则长连接被释放，造成频繁重连），也不能太短（缺乏统一心跳框架时容易导致信令风暴，例如微信心跳信令风暴问题）。具体没有统一标准，180s 也许是个不错的选择，微信为 300s。

Netty 中通过在 ChannelPipeline 增加 IdleStateHandler 实现心跳检测：

```java
channel.pipeline().addLast("idleStateHandler", new IdleStateHandler(0, 0, 180));
```

在 Handler 中拦截 IdleStateEvent 实现心跳的发送和检测。

### 4 合理设置接收和发送缓冲区容量

JDK 原生 NIO 的 ByteBuffer 是长度固定的 Byte 数组，无法动态扩容。由于无法预测每条消息报文的长度，可能需要预分配一个比较大的 ByteBuffer。在海量推送服务系统中这会带来沉重的内存负担：假设单条推送消息最大上限 10K、平均大小 5K，ByteBuffer 容量设为 10K，则每条链路多消耗 5K 内存，100 万长连接额外损耗 1000000 × 5K ≈ 4882M。内存消耗过大不仅增加硬件成本，大内存还容易导致长时间的 Full GC。

最灵活的处理方式是接收缓冲区根据以往接收的消息动态调整内存，利用 CPU 资源换内存资源。Netty 的 ByteBuf 支持容量动态调整，提供两种接收缓冲区分配器：

- **FixedRecvByteBufAllocator**：固定长度，不根据实际数据报大小动态收缩（容量不足支持动态扩展）；
- **AdaptiveRecvByteBufAllocator**（默认）：容量动态调整，根据之前 Channel 接收到的数据报大小计算，连续填充满则扩展，连续 2 次小于指定值则收缩容量以节约内存。

```java
b.group(group)
 .channel(NioSocketChannel.class)
 .option(ChannelOption.TCP_NODELAY, true)
 .option(ChannelOption.RCVBUF_ALLOCATOR, AdaptiveRecvByteBufAllocator.DEFAULT)
```

注意：无论接收还是发送缓冲区，大小建议设置为消息的平均大小，不要设置成最大消息的上限。可通过 `AdaptiveRecvByteBufAllocator(int minimum, int initial, int maximum)` 设置初始大小。

### 5 内存池

推送服务器承载海量长连接，每个长连接是一个会话。如果每个会话都持有心跳数据、接收缓冲区、指令集等数据结构，且这些实例朝生夕灭，会给服务器带来沉重的 GC 压力。

最有效策略是使用内存池：每个 NioEventLoop 线程处理 N 个链路，线程内部链路处理是串行的。A 链路接收到新数据报后从 NioEventLoop 的内存池申请空闲 ByteBuf，解码完成后调用 release 释放回内存池，供 B 链路继续使用。使用内存池后，单个 NioEventLoop 的 ByteBuf 申请和 GC 次数从 N = 1000000/64 = 15625 次减少为最少 0 次。

Twitter 使用 Netty 4 PooledByteBufAllocator 的效果：垃圾生成速度是原来的 1/5，垃圾清理速度快了 5 倍，几乎可以把网络带宽压满。

Netty 4 的 ByteBuf 内存池是纯 Java 版 jemalloc（Facebook 也在用）。Netty 3 每收到/发送消息都 new byte[capacity] 创建堆缓冲区，且新字节数组分配时用零填充消耗内存带宽，随后又被实际数据填充再消耗一次。Netty 4 内存池不再浪费这部分带宽，但**由于不依赖 GC，开发人员需要小心内存泄漏**：忘记释放缓冲区会导致内存使用率无限增长。

Netty 默认不使用内存池，需要显式指定：

```java
.option(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT)
```

使用内存池后，内存申请和释放必须成对出现（retain() 和 release()），解码完成后必须显式调用 ReferenceCountUtil.release(msg) 释放接收缓冲区。

### 6 当心"日志隐形杀手"

不能在 Netty 的 I/O 线程上做执行时间不可控的操作（访问数据库、发送 Email 等），但有个常用且危险的操作容易被忽略：**记录日志**。

生产环境中需要实时打印接口日志，推送服务发生 I/O 异常后会记录异常日志。如果当前磁盘 WIO 比较高，写日志文件操作可能被同步阻塞，阻塞时间无法预测，导致 NioEventLoop 线程被阻塞，Socket 链路无法被及时关闭、其它链路也无法读写。

以最常用的 log4j 为例，尽管支持异步写日志（AsyncAppender），但当日志队列满之后，它会同步阻塞业务线程（buffer.wait()），直到队列有空闲位置。

这类 BUG 具有极强的隐蔽性：WIO 高的时间持续非常短或偶现，测试环境很难模拟，问题定位难度非常大。

### 7 TCP 参数优化

TCP 层面的接收和发送缓冲区大小（SO_SNDBUF / SO_RCVBUF）需要根据推送消息大小合理设置，对于海量长连接，通常 32K 是个不错的选择。

另一个常用优化手段是**软中断均衡**：如果所有软中断都运行在 CPU0（相应网卡的硬件中断），其它 CPU 资源就被浪费了。Linux kernel ≥ 2.6.35 开启 **RPS**（Receive Packet Steering），网络通信性能提升 20% 以上。RPS 基本原理：根据数据包的源地址、目的地址及端口计算 hash 值，据此选择软中断运行的 CPU，将每个连接和 CPU 绑定，均衡软中断到多个 CPU 上。

### 8 JVM 参数

最重要的参数调整有两个：

- **-Xmx**：JVM 最大内存需要根据内存模型进行计算得出相对合理的值；
- **GC 相关参数**：新生代和老生代、永久代的比例，GC 策略，新生代各区比例等，需要根据具体场景设置和测试，尽量将 Full GC 频率降到最低。

## 五、作者简介

**李林锋**，2007 年毕业于东北大学，2008 年进入华为公司从事高性能通信软件的设计和开发工作，有 6 年 NIO 设计和开发经验，精通 Netty、Mina 等 NIO 框架。Netty 中国社区创始人，《Netty 权威指南》作者。

（原文链接：http://www.infoq.com/cn/articles/netty-million-level-push-service-design-points/）
