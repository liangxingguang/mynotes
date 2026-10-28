---
title: Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484556&idx=1&sn=bf7a3c022ed30eb28ff793fe4b727631&chksm=fe6ca5d6c91b2cc0a1ea07f676c1c2868198327926ec7c6d3edca01c29723ab388f6aacde5a6
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-15-write-flush.md
asset_ref: Assets/2026/10/netty-15-write-flush.md
---
# Netty源码分析(15) — 写缓冲 buffer 与 writeAndFlush 流程

## 一、背景与问题

用过 Netty 的同学肯定对 `writeAndFlush` 不陌生，但说实话我以前刚接触的时候，总觉得这方法名起得有点怪——为什么是 **write + And + Flush**？要写就写，要刷就刷，塞一起不别扭吗？后来读源码才明白，这俩动作在 Netty 里本质上是分开的，只是通道（channel）帮我们做了一层封装。

你可能会想：

1.  **write() 到底把数据写去哪儿了？** 直接写到 Socket 里？还是先攒着？

2.  **flush() 刷的是什么？** 把缓存刷到内核？刷到网卡？

3.  **writeAndFlush 完整的调用链路是怎样的？** 从业务代码到真正的 Socket 写入，中间经过了多少层？

这篇文章，我就把这几个问题掰开揉碎讲清楚。核心就是 Netty 的**写缓冲机制**，主角是 `ChannelOutboundBuffer`。

## 二、核心源码分析

### 2.1 write() 干了什么——消息入队

当你调用 `channel.write(msg)` 时，数据并没有立即发出去，而是被放入了一个缓冲队列。

先看 `AbstractChannelHandlerContext` 中的 write 方法：

```
// AbstractChannelHandlerContext.javaprivate void write(Object msg, boolean flush, ChannelPromise promise) {    // 从 tail 开始，反向传播 outbound 事件    // 找到下一个 outbound 处理器    AbstractChannelHandlerContext next = findContextOutbound(flush ?        MASK_WRITE_AND_FLUSH : MASK_WRITE);       // 添加内存泄漏检测包装    Object m = pipeline.touch(msg, next);       // 调用下一个 handler 的 write 方法    next.invokeWrite(m, promise);    if (flush) {        next.invokeFlush();    }}
```

关键点：write 和 flush 在这里就已经分开了。`writeAndFlush` 只是把两个标记位都传了进去。

继续往下，最终会走到 `AbstractChannel` 的 write 方法：

```
// AbstractChannel.java@Overridepublic final void write(Object msg, ChannelPromise promise) {    // 核心就一行：把消息写入 outboundBuffer    outboundBuffer.addMessage(msg, promise);}
```

这个 `outboundBuffer` 就是 `ChannelOutboundBuffer` 的实例。它是每个 Channel 独享的写缓冲。

### 2.2 ChannelOutboundBuffer——写缓冲的核心数据结构

`ChannelOutboundBuffer` 内部维护了一个**环形链表**，每个节点是一个 `Entry` 对象：

```
// ChannelOutboundBuffer.java 关键字段public final class ChannelOutboundBuffer {    // 线程本地缓存，复用 Entry 对象减少 GC    private static final Recycler<Entry> RECYCLER = ...;    // 链表头尾指针    private Entry unflushedEntry;  // 第一个未 flush 的 Entry    private Entry flushedEntry;    // 第一个已 flush 的 Entry    private Entry tailEntry;       // 最后一个 Entry    // 所有待写入消息的字节数（未 flush 的）    private long totalPendingSize;       // 写入缓冲区的可写字节数（用于高低水位控制）    private volatile long writable = 1;  // 1 表示可写    // ===== Entry 内部类 =====    static final class Entry {        final Recycler.Handle<Entry> recyclerHandle;        Object msg;                // 待发送的消息（通常是 ByteBuf 或 FileRegion）        ChannelPromise promise;    // 异步结果回调        long pendingSize;          // 本条消息的预估大小        int count;                 // 合并写入时的消息计数        Entry next;                // 指向下一个节点               // 缓存了一些计算后的属性，避免重复计算        // ...    }}
```

核心结构就是这么个链表：

```
unflushedEntry → Entry1 → Entry2 → Entry3 → ... → tailEntry                      ↑             flushedEntry = null （还没 flush）
```

当调用 `write(msg)` 时，数据通过 `addMessage` 方法添加到链表尾部：

```
// ChannelOutboundBuffer.addMessage()public void addMessage(Object msg, ChannelPromise promise) {    // 从 Recycler 中获取或创建一个 Entry 对象    Entry entry = Entry.newInstance(msg, promise);       if (tailEntry == null) {        // 链表为空，初始化        flushedEntry = null;        tailEntry = entry;        unflushedEntry = entry;    } else {        // 追加到链表尾部        Entry last = tailEntry;        last.next = entry;        tailEntry = entry;    }       // 累计待 flush 的消息大小    // 这里会触发高低水位检查    incrementPendingOutboundBytes(entry.pendingSize);}
```

### 2.3 flush()——把待发送消息标记为"准备发出"

调用 `flush()` 时，Netty 做的事情很简单：**把 `unflushedEntry` 到 `tailEntry` 的这段链表，整体交给 `flushedEntry`**。

```
// ChannelOutboundBuffer.addFlush()public void addFlush() {    // 准备当前要 flush 的起点    Entry entry = unflushedEntry;    if (entry != null) {        if (flushedEntry == null) {            // 没有正在 flush 的，直接设为首个            flushedEntry = entry;        }        do {            // 标记每个 entry 状态，计算合并写入时的 buffer 大小            flushed ++;            // 把 pendingSize 加到 total 上            // ...            entry = entry.next;        } while (entry != null);               // unflushedEntry 置空，表示所有消息都已标记为待 flush        unflushedEntry = null;    }}
```

flush 之后，指针关系变成了这样（注意 `unflushedEntry` 变为 nullptr）：

```
flushedEntry → Entry1 → Entry2 → Entry3 → ... → tailEntry                                      ↑                              unflushedEntry = null
```

这个时候，**数据还停留在用户态**，没有真正写到 Socket。真正的写入操作在 `flush0()` 方法中触发。

### 2.4 真正的写入——从用户态到内核态

`flush0()` -> `doWrite()` 这个是 Channel 的具体实现决定的。以 NioSocketChannel 为例：

```
// NioSocketChannel.java@Overrideprotected void doWrite(ChannelOutboundBuffer in) throws Exception {    SocketChannel ch = javaChannel(); // 获取 NIO 的 SocketChannel    int writeSpinCount = config().getWriteSpinCount(); // 默认 16 次       while (true) {        // 获取当前要发送的消息        Object msg = in.current();        if (msg == null) {            // 全部发完了，清除写标记            clearOpWrite();            break;        }               if (msg instanceof ByteBuf) {            ByteBuf buf = (ByteBuf) msg;            int readableBytes = buf.readableBytes();            if (readableBytes == 0) {                // 空 buffer 直接跳过                in.remove();                continue;            }                       // 真正调用 JDK NIO 的 SocketChannel.write()！            int localFlushedAmount = doWriteBytes(buf);                       if (localFlushedAmount > 0) {                // 写了部分数据，减少写自旋计数                writeSpinCount --;                // 从 in 里更新进度                in.progress(localFlushedAmount);                if (!buf.isReadable()) {                    // buffer 中的数据全部写出去了                    in.remove();                }            } else {                // 写不进去了（TCP 缓冲区满了）                // 注册 OP_WRITE 事件，等可写时再继续                setOpWrite();                break;            }                       if (writeSpinCount <= 0) {                // 自旋次数用完了，停下来                // 这时会调用 addFlush() 自动重新调度                break;            }        }    }}
```

这里有几个细节值得注意：

1.  **写自旋（Write Spin）**：默认最多连续尝试 16 次写操作，防止 CPU 被一个 Channel 的写操作独占。

2.  **写半包**：如果一个 ByteBuf 很大，一次性没写完，剩下的数据会继续留在链表里。

3.  **OP\_WRITE**：当写不进去时（TCP 发送缓冲区满），注册 OP\_WRITE 事件，等 NIO selector 通知说可以写的时候再继续。

### 2.5 完整调用链路图

一张完整的调用链图：

```
业务代码调用 channel.writeAndFlush(msg)    │    ▼AbstractChannelHandlerContext.write(msg, true, promise)    │  写入时触发 write，传递 flush=true 标记    ▼遍历 pipeline 找到 outbound handler → Handler.write()    │    ▼TailContext.write() → AbstractChannel.write(msg, promise)    │  将消息追加到 ChannelOutboundBuffer    ▼ChannelOutboundBuffer.addMessage(msg, promise)    │  数据入队（环形链表）    ▼TailContext.flush() → AbstractChannel.flush()    │    ▼AbstractUnsafe.flush()     │  调用 addFlush() 标记待发送    ▼ChannelOutboundBuffer.addFlush()    │  移动 unflushedEntry → flushedEntry    ▼NioSocketChannel.doWrite(outboundBuffer)    │  真正的 NIO SocketChannel.write()    ▼JDK SocketChannel.write(ByteBuffer)    │  写入到 TCP 发送缓冲区 → 内核    ▼调用 promise.setSuccess() 回调通知
```

## 三、原理分析

### 3.1 为什么 Netty 要用缓冲队列？

一句话概括：**解耦业务线程和 I/O 线程**。

如果每次 `write()` 都直接调用 `SocketChannel.write()`，那业务线程就得等操作系统把数据拷贝完了才能继续干活。这在异步编程里是不可接受的。

Netty 的方案是：

*   **write()**：只负责把数据放进队列，耗时 O(1)，瞬间返回

*   **flush()**：在 I/O 线程中，拿到这些数据，逐个调用 OS write

这样业务线程只管往里塞数据，I/O 线程负责往外写，互不阻塞。

### 3.2 涉及的设计模式

**1\. 生产者-消费者模式**

*   生产者：业务线程调用 `write()`，往缓冲队列塞数据

*   消费者：I/O 线程在 `NioEventLoop.run()` 中执行 `flush()`，从缓冲队列取数据

**2\. 缓冲（Buffering）模式**

批量写入可以减少系统调用次数。假设业务代码里调用了 10 次 `write(buf1)...write(buf10)`，如果每次 write 都触发系统调用，那就是 10 次。但如果只在最后一次性 flush，理论上只需 1 次系统调用（实际上 Netty 会做一些合并）。

**3\. 写自旋（Write Spin）模式**

防止单个 Channel 写太多数据独占 I/O 线程，用一个自旋计数器限制单次写入次数，保证 I/O 线程的公平性。

### 3.3 高低水位与背压

`ChannelOutboundBuffer` 里还有一个重要的机制——**高低水位**：

```
// DefaultChannelConfig.java// 默认值，用户在 bootstrap 时可以配置private volatile int writeBufferLowWaterMark = 32 * 1024;    // 32KBprivate volatile int writeBufferHighWaterMark = 64 * 1024;   // 64KB
```

原理很简单：

*   **写数据越来越多** → `totalPendingSize` 超过高水位（64KB）→ `Channel.isWritable()` 返回 `false`

*   **数据逐渐发出去** → `totalPendingSize` 降至低水位（32KB）以下 → `Channel.isWritable()` 重新变为 `true`

> 为什么你需要关注这个？  
> 如果你在写网关、代理或者消息推送服务，当对方消费速度跟不上时，你的写缓冲会持续膨胀。如果此时还继续往里写数据，最终 OOM。  
> 
> 高低水位就是用来做背压的——下游跟不上时通知上游减速。

```
// 检查是否可写的典型用法if (channel.isWritable()) {    channel.writeAndFlush(data);} else {    // 背压！缓冲满了，先丢到另一个队列里排队    pendingQueue.offer(data);}
```

## 四、使用示例

下面是一个完整的示例，展示 write 和 flush 分开用的场景，以及背压处理的演示：

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.ByteBufAllocator;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.util.CharsetUtil;public class WriteBufferDemoServer {    public static void main(String[] args) throws Exception {        EventLoopGroup boss = new NioEventLoopGroup(1);        EventLoopGroup worker = new NioEventLoopGroup();        try {            ServerBootstrap b = new ServerBootstrap();            b.group(boss, worker)             .channel(NioServerSocketChannel.class)             .childOption(ChannelOption.WRITE_BUFFER_HIGH_WATER_MARK, 128 * 1024)  // 128KB             .childOption(ChannelOption.WRITE_BUFFER_LOW_WATER_MARK, 64 * 1024)   // 64KB             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new WriteHandler());                 }             });            ChannelFuture f = b.bind(8080).sync();            System.out.println("服务已启动: http://localhost:8080/");            f.channel().closeFuture().sync();        } finally {            boss.shutdownGracefully();            worker.shutdownGracefully();        }    }    static class WriteHandler extends ChannelInboundHandlerAdapter {               @Override        public void channelActive(ChannelHandlerContext ctx) {            System.out.println("客户端连接：" + ctx.channel().remoteAddress());        }        @Override        public void channelRead(ChannelHandlerContext ctx, Object msg) {            ByteBuf in = (ByteBuf) msg;            String request = in.toString(CharsetUtil.UTF_8);            System.out.println("收到: " + request.substring(0, Math.min(request.length(), 100)));            in.release();            // 模拟大量数据写入 —— 分批 write，一次性 flush            // 这里故意产生大量的待发送数据来触发背压            ByteBufAllocator alloc = ctx.alloc();            // 连续写 100 次，每次 8KB，总共 800KB            for (int i = 0; i < 100; i++) {                ByteBuf buf = alloc.buffer(8192);                buf.writeBytes(("第" + i + "批数据，填充到8KB..." +                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(300)).getBytes());                // 只 write 不 flush                ctx.write(buf);            }                       // 写完 800KB 后检查水位状态            System.out.println("是否还可写: " + ctx.channel().isWritable());            System.out.println("待发送字节数: " +                ctx.channel().unsafe().outboundBuffer().totalPendingSize());                       // 统一 flush            ctx.flush();        }        @Override        public void channelWritabilityChanged(ChannelHandlerContext ctx) {            // 可写状态变化！Netty 会在水位穿越时触发这个回调            boolean writable = ctx.channel().isWritable();            System.out.println("水位变化 - 是否可写: " + writable +                ", 待发送量: " + ctx.channel().unsafe().outboundBuffer().totalPendingSize());            super.channelWritabilityChanged(ctx);        }        @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }}
```

运行后你会看到类似输出：

```
客户端连接：/127.0.0.1:54321是否还可写: false       ← 800KB 远超 128KB 高水位，不可写了！待发送字节数: 819200水位变化 - 是否可写: true   ← 数据慢慢发完，降到低水位以下了
```

这验证了高低水位机制的真实行为。

## 五、注意事项与性能考量

### 5.1 常见坑

**坑 1：write() 之后忘了 flush()**

这个我刚开始就犯过——调了 `write()` 以为数据发出去了，结果对端半天没收到。后来发现 `write()` 只是入队而已，不调用 `flush()` 数据永远留在用户态。如果你不想每次都显式调用 flush，直接用 `writeAndFlush()`。

**坑 2：ByteBuf 未释放**

```
// 错误用法ctx.writeAndFlush(buf);// 没 release，buf 引用计数不减，内存泄漏！// 正确做法// 写到 outbound buffer 时 Netty 会在发送完成后自动 release// 但如果之前 retain 过，需要手动 release
```

**坑 3：忽略背压信号**

写大量数据时不检查 `isWritable()`，导致写缓冲无限膨胀，最终 OOM。后果在压测时特别明显。

**坑 4：在业务线程中直接 write 大量数据**

Netty 的 write 操作虽然快（只是入队），但如果业务线程疯狂往里塞数据，I/O 线程写不完，一样会堆积。合理做法是用 `channelWritabilityChanged` 做限流。

### 5.2 性能考量

1.  **缓冲区调优**：高低水位不要设得太小，否则高频触发 writability 变化，反而浪费性能。通常设到几百 KB 级别。

2.  **WriteSpinCount**：默认 16 次，如果写入的 ByteBuf 都很小，可以调大；如果单个 Buffer 很大，调小更好，防止霸占 I/O 线程。

3.  **合并小写**：积攒多个小消息后一次性批量 flush，减少系统调用次数。Netty 在 `doWrite` 内部其实也会尝试合并相邻的 ByteBuf（通过 `Entry.count` 属性），但不能过度依赖。

```
// 这种方式不太好：每次 write 都 flush，系统调用频繁for (Data d : manyData) {    ctx.writeAndFlush(d);  // 不推荐}// 推荐：攒一批，一次 flushfor (Data d : manyData) {    ctx.write(d);}ctx.flush();  // 一次系统调用处理多个消息
```

### 5.3 适用场景

场景

write vs writeAndFlush

高吞吐消息推送

优先 `write` + 批量 `flush`

请求-响应模式（RPC）

`writeAndFlush`

 更方便

大文件传输

用 `FileRegion` 而不是 ByteBuf，避免用户态缓冲

实时性要求极高（网关、代理）

可能需要调小高低水位甚至禁用缓冲

我想说的是，Netty 的写缓冲设计真的挺精妙的。它虽然叫"缓冲"，但实际上更像是一个稳健的"提交-刷新"机制——`write` 提交任务，`flush` 刷新到内核。如果你的业务代码里有一行 `writeAndFlush`，不妨多想想：**这一下到底走了多远的路？**

* * *

**下一篇预告**：Netty源码分析(16) — 连接管理：connect、bind、close 背后的故事  
我们将分析 Netty 的连接管理生命周期，看看三次握手的本质在 Netty 里是如何异步化的。
