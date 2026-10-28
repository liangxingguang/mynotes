---
title: Netty源码分析(24) — EpollEventLoop 与 Native Transport
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484613&idx=1&sn=a220017004e50b20b8925ff0dd000a06&chksm=fe6ca59fc91b2c89846b22c2c447abdd98a192ef19deec3017ed9c4f205d3d4c6d7a741beb1c
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-24-epoll-native.md
asset_ref: Assets/2026/10/netty-24-epoll-native.md
---

# Netty源码分析(24) — EpollEventLoop 与 Native Transport

## 开场白

说实话，这篇文章我拖了挺久的。之前我们一直在分析 Netty 的 NIO 实现，也就是基于 `java.nio.channels` 那套东西。但 Netty 能成为事实标准，光靠 Java NIO 是不够的——**性能上的"杀手锏"其实是它原生（native）的传输层实现**。

用过 Netty 的老铁应该都见过这个配置：

```
EventLoopGroup group = new EpollEventLoopGroup();ServerBootstrap b = new ServerBootstrap();b.group(group) .channel(EpollServerSocketChannel.class);
```

看起来就是换了个 class 的事，但背后完全是另一套东西。**EpollEventLoop 不走 Java NIO 的 Selector，它直接调 Linux 的 epoll 系统调用**，少了一层 JNI 封装，性能直接起飞。

今天我们就来扒一扒 Netty 的 EpollEventLoop 到底是怎么工作的，native transport 又给 Netty 带来了什么。

* * *

## 背景：为什么需要 Native Transport？

先聊点实际的。

Java NIO 的 `Selector` 底层确实也用了 epoll（Linux 上），但它有一个**历史包袱**。在 JDK 1.4/1.5 时代，Selector 的实现基于 epoll 的 level-triggered（水平触发）模式，而且每次 `select()` 返回后，JDK 内部有不少额外的处理开销。

几个痛点：

1.  **每次 select 都要从 JDK 内部 Set 拷贝 selected keys** -> GC 压力
2.  **不支持 edge-triggered（边缘触发）** -> 高性能场景下事件处理效率低
3.  **额外的 JNI 调用开销** -> 每一层封装都有成本
4.  **不支持 SO\_REUSEPORT、TCP\_FASTOPEN 等高级 socket 选项** -> 这些是 Linux 3.9+ 就有的，但 JDK 不暴露

Netty 的 native transport 就是为了解决这些问题。它直接通过 JNI 调用 C 级别的 epoll API，绕过了 JDK Selector 的封装。

> 讲真，我第一次看到 Netty 的 native 代码时还挺震撼的——一个 Java 框架的核心事件循环居然是用 C 写的。

* * *

## EpollEventLoop 核心源码解析

### 1\. 类层次结构

先看继承关系：

```
// EpollEventLoop 继承自 SingleThreadEventLooppublic final class EpollEventLoop extends SingleThreadEventLoop {    // 这个 long 就是 epoll fd 在 native 层的指针    private final long epollFd;    private final long eventFd;    private final long timerFd;       // native 方法声明    private static native long epollCreate();    private static native int epollWait(long epollFd, long[] events, int timeoutMs);    private static native void epollCtlAdd(long epollFd, int fd, int flags);    private static native void epollCtlDel(long epollFd, int fd);    // ... 还有很多}
```

注意这里三个 fd：

*   **epollFd** — epoll 实例本身的句柄
*   **eventFd** — 用于唤醒 event loop（类似 NIO 的 wakeup 机制）
*   **timerFd** — 用于定时任务触发

这三个 fd 都是用 `eventfd()` 和 `timerfd_create()` 系统调用创建的，**纯 C 层面**。这就意味着 EpollEventLoop 根本不需要像 NioEventLoop 那样靠一个 `Pipe` 或 `AtomicBoolean` 来做 wakeup，效率高得多。

### 2\. run() 方法 - 事件循环核心

终于到正题了。EpollEventLoop 的 `run()` 是整个 native transport 的心脏：

```
@Overrideprotected void run() {    int timeout = 0;  // epoll_wait 的等待时间(ms)    int strategy = 0; // 当前轮次的 I/O 策略    for (;;) {  // 事件循环，永不停歇        try {            // 根据是否有定时任务计算 epoll_wait 超时时间            timeout = hasTasks() ? 0 :                      hasScheduledTasks() ? nextScheduledTaskDeadtimeNanos() : -1;                       strategy = epollWait(timeout);  // 调用 native 方法等待事件                                                  // 返回值是有多少个 fd 就绪            if (strategy > 0) {                // 处理就绪的 fd 上的事件                processReady(events, strategy);            }            // 执行普通任务（注册、写数据等）            runAllTasks();            // 执行定时任务            if (strategy > 0) {                processReady(events, 0); // 处理 edge-triggered 漏掉的事件            }        } catch (Error e) {            throw e;        } catch (Throwable t) {            logger.warn("EpollEventLoop run exception", t);        }    }}
```

讲真，这个流程和 NioEventLoop 的 `run()` 结构上很像，但**细节上天差地别**。最大的区别在 `epollWait` 和 `processReady` 这两个方法。

### 3\. epollWait — 真正的系统调用

看看 `epollWait` 的 native 实现（我简化了，但核心逻辑对）：

```
// 这是 C 代码，在 Netty 的 netty-transport-native-epoll 模块中JNIEXPORT jint JNICALL Java_io_netty_channel_epoll_EpollEventLoop_epollWait(    JNIEnv* env, jclass clazz, jlong epollFd, jlongArray events, jint timeoutMs) {       struct epoll_event ev[SIZE];  // 栈上分配，零 GC    int num;       // 直接调用 epoll_wait 系统调用！    num = epoll_wait((int) epollFd, ev, SIZE, timeoutMs);       if (num > 0) {        // 将 events 写入 Java 的 long 数组        // 每个 event 用 long 编码：高32位是 data，低32位是 events        jlong* eventsBody = (*env)->GetLongArrayElements(env, events, 0);        for (int i = 0; i < num; i++) {            eventsBody[i] = (((jlong) ev[i].events) << 32) | ev[i].data.u64;        }        (*env)->ReleaseLongArrayElements(env, events, eventsBody, 0);    }       return num;}
```

关键点：

*   **没有 GC 分配** —— 事件数组用 `long[]` 复用，native 层在栈上分配 `epoll_event`
*   **直接 epoll\_wait** —— 没有 JDK Selector 的那层封装
*   **带 timeout** —— 支持 edge-triggered 和 level-triggered

### 4\. processReady — 事件分发

```
private void processReady(long[] events, int ready) {    for (int i = 0; i < ready; i ++) {        // 从 long 中解码事件        final long ev = events[i];        // 低32位是 flags，高32位是 fd        int flags = (int) (ev >> 32);        int fd = (int) ev;               // 判断事件类型        boolean readReady = (flags & EPOLLIN) != 0;        boolean writeReady = (flags & EPOLLOUT) != 0;        boolean acceptReady = (flags & (EPOLLIN | EPOLLRDHUP)) != 0;               // 根据 fd 找到对应的 AbstractEpollChannel        AbstractEpollChannel ch = channels.get(fd);        if (ch == null) continue;               // 触发读事件        if (readReady) {            // 对于 ServerSocket 就是 accept            // 对于普通 Channel 就是读数据            ch.epollInReady();        }               // 触发写事件        if (writeReady) {            ch.epollOutReady();        }    }}
```

你会发现这里**没有 Selector 的 selectedKeys 遍历**，没有 `Iterator` 操作，直接根据 fd 映射到 Channel——这在密集 I/O 场景下有明显的性能优势。

### 5\. 边缘触发 (Edge-Triggered) vs 水平触发 (Level-Triggered)

NioEventLoop 用的是水平触发，而 EpollEventLoop 默认也是水平触发，但支持切到边缘触发。

```
// Epoll.waits() 方法决定使用哪种模式// Edge-Triggered 模式需要自己在 I/O 循环中确保所有数据被读完// 否则会丢掉事件通知// 配置边缘触发（跳过，非必须）Channel ch = ...;((EpollSocketChannelConfig) ch.config()).setEdgeTriggered(true);
```

边缘触发的优势：**事件通知只产生一次**，不会反复通知同一个 fd。但代价是——**你必须一次性把数据读完**，不然就丢事件了。Netty 在边缘触发模式下会循环 read 直到返回 `EAGAIN`。

```
void epollInReady() {    // 边缘触发特殊处理    final boolean edgeTriggered = config().isEdgeTriggered();       ByteBufAllocator allocator = config().getAllocator();    RecvByteBufAllocator.Handle allocHandle = unsafe().recvBufAllocHandle();       // 这个 do-while 就是为了处理边缘触发    // 如果是水平触发，即使循环一次没读完，下次 epoll_wait 还会通知    // 但边缘触发不会，所以必须在这次事件处理中读完所有数据    do {        // 读数据到 buffer        byteBuf = allocHandle.allocate(allocator);        doReadBytes(byteBuf);        // 处理数据...    } while (edgeTriggered && allocHandle.continueReading());       // 水平触发：一次读不完下次还有事件    // 边缘触发：必须循环到读完或 EAGAIN}
```

* * *

## 原理分析

### 1\. Native Transport 的工作流

整个流程我画了张图（这是我根据自己的理解画的，看对应代码的时候对照这张图会清晰很多）：

这张图展示了 EpollEventLoop 的完整工作流程：

**Step 1：启动阶段**

*   Java 层创建 `EpollEventLoopGroup`，内部通过 JNI 调用 `epoll_create()` 创建 epoll 实例
*   同时创建 `eventfd`（用于唤醒）和 `timerfd`（用于定时任务）

**Step 2：注册阶段**

*   Channel 注册进来时，通过 `epoll_ctl(EPOLL_CTL_ADD)` 将 fd 加入 epoll 监听集合
*   这个注册操作在 native 层完成，**不需要经过 JDK 的任何封装**

**Step 3：等待阶段**

*   `epoll_wait()` 阻塞等待事件就绪
*   有事件到达或超时后返回

**Step 4：事件处理**

*   从 native 层获取就绪的 fd 和事件类型
*   映射到对应的 `AbstractEpollChannel`
*   调用 `epollInReady()` / `epollOutReady()` 分发

### 2\. EventFd 的妙用

NioEventLoop 的 wakeup 是通过往 Pipe 里写一个字节，或者用一个 `AtomicBoolean` + Selector.wakeup()。

EpollEventLoop 更优雅——用 `eventfd`：

```
// 创建 eventfdint eventFd = eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);// 将 eventFd 加入 epoll 监听epoll_ctl(epollFd, EPOLL_CTL_ADD, eventFd, &ev);// 需要 wakeup 时，往 eventFd 写入一个 8 字节整数uint64_t one = 1;write(eventFd, &one, sizeof(one));// epoll_wait 会立即返回，因为 eventFd 可读// 然后在 processReady 中，清空 eventFduint64_t val;read(eventFd, &val, sizeof(val)); // 读完就重置了
```

**这比 Pipe 的方式好在哪？**

*   Pipe 需要分配两个 fd（读端+写端），eventfd 只需一个
*   Pipe 的数据结构更复杂，eventfd 在内核层面就是一个计数器
*   eventFd 是统计级轻量级的，读写都是原子操作

### 3\. TimerFd 的精妙设计

Netty 的常规定时任务是通过 `ScheduledFuture` 和 `PriorityQueue` 实现的，但 EpollEventLoop 额外利用了 `timerfd_create`：

```
// 创建 timerfdint timerFd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);// 也加入 epoll 监听epoll_ctl(epollFd, EPOLL_CTL_ADD, timerFd, &ev);// 当需要定时任务时，设置 timerfd 的超时时间struct itimerspec ts;ts.it_value.tv_sec = ...;  // 距离下一个定时任务的剩余时间ts.it_value.tv_nsec = ...;timerfd_settime(timerFd, 0, &ts, NULL);
```

**这样做的好处是什么？**

如果没有 timerfd，epoll\_wait 需要一个 timeout 参数来实现超时唤醒。但 timeout 的计算依赖于 Java 层到 native 层的参数传递。有了 timerfd，**epoll\_wait 可以阻塞等待，超时由内核的 timerfd 机制触发**——这比每次都计算并传递 timeout 更精确、更高效。

> 说实话，这个设计我一开始没 get 到，后来想想：epoll\_wait 的 timeout 精度只有毫秒级，而 timerfd 用 timespec 精度是纳秒级。在做高频定时任务调度时，这个区别还是很明显的。

* * *

## 使用示例

下面给一个完整的 Server，跑在 Epoll 上，配了 TCP 快速打开和 SO\_REUSEPORT（只有 native transport 能配）：

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import io.netty.channel.*;import io.netty.channel.epoll.Epoll;import io.netty.channel.epoll.EpollEventLoopGroup;import io.netty.channel.epoll.EpollServerSocketChannel;import io.netty.channel.socket.SocketChannel;import io.netty.util.CharsetUtil;import io.netty.util.NettyRuntime;import java.net.InetSocketAddress;public class EpollEchoServer {    public static void main(String[] args) {        // 重要：检查当前 Linux 内核是否支持 epoll        if (!Epoll.isAvailable()) {            System.err.println("本机不支持 Epoll，回退到 NIO。原因: "                               + Epoll.unavailabilityCause());            return;        }        System.out.println("Epoll 可用，使用 Native Transport！");        // 使用 EpollEventLoopGroup，默认线程数 = CPU 核数 * 2        EventLoopGroup bossGroup = new EpollEventLoopGroup(1);        // worker 线程数可自定义        EventLoopGroup workerGroup = new EpollEventLoopGroup(            NettyRuntime.availableProcessors() * 2        );        try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(EpollServerSocketChannel.class)  // 关键：指定 Epoll 的 ServerSocketChannel                        // 配置 TCP 相关参数（Epoll 特有的选项）             .option(EpollChannelOption.TCP_FASTOPEN, 3)    // TFO，减少握手延迟             .option(EpollChannelOption.SO_REUSEPORT, true) // 多端口重用，多进程场景             .option(ChannelOption.SO_BACKLOG, 1024)             .option(ChannelOption.SO_REUSEADDR, true)                        .childOption(ChannelOption.TCP_NODELAY, true)             .childOption(ChannelOption.SO_KEEPALIVE, true)                        .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new EchoServerHandler());                 }             });            ChannelFuture f = b.bind(8888).sync();            System.out.println("Echo Server 启动完成，端口: 8888 [Epoll Transport]");                       f.channel().closeFuture().sync();        } catch (InterruptedException e) {            Thread.currentThread().interrupt();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }}@ChannelHandler.Sharableclass EchoServerHandler extends ChannelInboundHandlerAdapter {    @Override    public void channelRead(ChannelHandlerContext ctx, Object msg) {        ByteBuf buf = (ByteBuf) msg;        // 打印客户端发来的消息（解码用 UTF-8）        System.out.println("收到: " + buf.toString(CharsetUtil.UTF_8));               // 回显        ctx.write(msg);  // 直接复用 msg，减少拷贝    }    @Override    public void channelReadComplete(ChannelHandlerContext ctx) {        ctx.flush();  // 批量 flush，减少 epoll_ctl 调用    }    @Override    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {        cause.printStackTrace();        ctx.close();    }}
```

对应的客户端，同样用 Epoll：

```
import io.netty.bootstrap.Bootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import io.netty.channel.*;import io.netty.channel.epoll.Epoll;import io.netty.channel.epoll.EpollEventLoopGroup;import io.netty.channel.epoll.EpollSocketChannel;import io.netty.channel.socket.SocketChannel;import io.netty.util.CharsetUtil;public class EpollEchoClient {    public static void main(String[] args) throws Exception {        if (!Epoll.isAvailable()) {            System.err.println("本机不支持 Epoll");            return;        }        EventLoopGroup group = new EpollEventLoopGroup();        try {            Bootstrap b = new Bootstrap();            b.group(group)             .channel(EpollSocketChannel.class)  // 客户端也用 Epoll             .option(ChannelOption.TCP_NODELAY, true)             .handler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new EchoClientHandler());                 }             });            ChannelFuture f = b.connect("localhost", 8888).sync();            // 发送消息            f.channel().writeAndFlush(                Unpooled.copiedBuffer("你好，Native Transport！", CharsetUtil.UTF_8));                       // 等待关闭            f.channel().closeFuture().sync();        } finally {            group.shutdownGracefully();        }    }}class EchoClientHandler extends SimpleChannelInboundHandler<ByteBuf> {    @Override    public void channelActive(ChannelHandlerContext ctx) {        System.out.println("连接成功，使用: " + ctx.channel().getClass().getSimpleName());        // 这里你会看到 EpollSocketChannel，而不是 NioSocketChannel    }    @Override    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {        System.out.println("收到回声: " + msg.toString(CharsetUtil.UTF_8));    }    @Override    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {        cause.printStackTrace();        ctx.close();    }}
```

* * *

## 性能对比（不负责任的趁测结果）

我在一台 4C8G 的 Linux 服务器上跑了个简单压测，50 个并发连接，每个连接发 10000 个小包：

| 指标 | NioEventLoop | EpollEventLoop | 提升 |
| --- | --- | --- | --- |
| 平均延迟 (ms) | 1.2 | 0.8 | **33%** |
| P99 延迟 (ms) | 5.6 | 3.1 | **45%** |
| 吞吐量 (req/s) | 45,000 | 62,000 | **38%** |
| GC暂停 (ms/次) | 2.1 | 1.3 | **38%** |

（单位里没有正规的实验室环境，这个数据只是参考，但我相信在生产环境差距会更大——因为 GC 压力的降低在高并发下会形成正反馈循环）

* * *

## 还需要注意的一些细节

### 1\. Native Transport 的依赖

```
<dependency>    <groupId>io.netty</groupId>    <artifactId>netty-transport-native-epoll</artifactId>    <version>${netty.version}</version>    <!-- 注意需要指定 classifier -->    <classifier>linux-x86_64</classifier></dependency>
```

Netty 4.1.x 还支持 `netty-transport-native-kqueue`（macOS），Netty 5 则引入了 `io_uring` 的支持。

### 2\. 回退策略

生产环境中，如果代码在非 Linux 系统上跑（比如本地开发），EpollTransport 会直接报错。所以**永远**要留回退机制：

```
EventLoopGroup group;Class<? extends ServerSocketChannel> channelClass;if (Epoll.isAvailable()) {    group = new EpollEventLoopGroup();    channelClass = EpollServerSocketChannel.class;} else if (KQueue.isAvailable()) {    group = new KQueueEventLoopGroup();    channelClass = KQueueServerSocketChannel.class;} else {    group = new NioEventLoopGroup();    channelClass = NioServerSocketChannel.class;}
```

### 3\. 内存泄漏问题

native transport 因为涉及到 C 层面的资源分配，如果 shutdown 不优雅，**epoll\_fd 会泄露**。好在 Netty 做了引用计数和 `finalize()` 兜底，但最好还是显式调用 `shutdownGracefully()`。

### 4\. EpollEventLoop vs IO\_Uring

Netty 4.1.x 的 EpollEventLoop 用的是 **epoll 系统调用**，而 Netty 5 正在推的 **io\_uring** 是 Linux 5.1+ 的新异步 I/O 接口。io\_uring 不需要每轮都调用系统调用（通过共享 ring buffer 提交/获取结果），理论上性能上限更高。

但说实话，目前 epoll + Netty 的组合在绝大多数场景下已经够用了，io\_uring 的优势在磁盘 I/O 和高并发小包场景下更明显。

* * *

## 总结

1.  **EpollEventLoop 绕过了 JDK Selector 的封装**，直接调用 epoll 系统调用，减少了 JNI 调用次数和 GC 压力
2.  **利用 eventfd 和 timerfd** 实现了更优雅、更精确的 wakeup 和定时机制
3.  **支持边缘触发**，在业务能确保读干净的情况下，能减少 epoll\_wait 调用次数
4.  **暴露了更多 Linux 特有的 socket 选项**（SO\_REUSEPORT、TCP\_FASTOPEN、TCP\_CORK 等）
5.  **使用前提是必须运行在 Linux 系统上**，否则需要回退到 NIO

说白了，如果你的服务器跑在 Linux 上，**上 Epoll 就完事了**。不仅性能有提升，而且还有更多调优选项。Netty 团队搞这套 native transport 是真下了功夫的，C 代码和 Java 代码之间的交互设计得相当干净。

**下一篇预告：Netty的流量控制——高低水位与可写性**，这个在实战中经常踩坑，特别是写半包的问题，到时候好好聊一聊。
