# Netty源码分析(25) — Netty 的流量控制：高低水位与可写性

> 深入分析Netty的流量控制机制，从ChannelOutboundBuffer的高低水位设计到isWritable自动变更，看Netty如何优雅地实现背压。

## 一、背景与问题：写太快了怎么办？

先问一个大家实战中大概率遇到过的问题：**当你的 Netty 服务端写数据给客户端的速度，远快于对方读数据的速度，会发生什么？**

如果你没有做过流量控制，结果大概率是这样的：

1.  你的应用疯狂调用 `writeAndFlush`
2.  Netty 不停地把数据塞进 `ChannelOutboundBuffer`
3.  对方 TCP 接收窗口满了，内核缓冲区满了
4.  Netty 写操作被阻塞（或写入失败）
5.  最终要么 OOM，要么报 `OutOfMemoryError`

这个问题的本质是 **生产者-消费者速度不匹配**。Netty 作为一个高性能网络框架，肯定不能坐视不管——它设计了一套**基于高低水位的流量控制机制**（也叫 Writability Control / Backpressure），核心目标就一个：

> **当写缓冲堆积到一定量时，自动通知上层 "别写了，我扛不住了"；等消费掉一部分后再通知 "可以了，继续写"。**

这其实就是一种**软性的背压（Backpressure）**。它不像 TCP 的滑动窗口那样强制卡死你（让你 write 阻塞），而是给你一个**可观察的信号**：`channel.isWritable()`。

今天我们就从源码层面，把这个机制彻底扒开。

* * *

## 二、核心源码：高低水位是怎么配置的？

### 2.1 默认的高低位值

Netty 在每个 `ChannelConfig` 的实现中定义了默认的高低位值。以 `DefaultChannelConfig` 为例：

```
// DefaultChannelConfig.java — 默认配置public class DefaultChannelConfig implements ChannelConfig {       // 默认低水位：32KB    private volatile int writeBufferLowWaterMark = 32 * 1024;       // 默认高水位：64KB    private volatile int writeBufferHighWaterMark = 64 * 1024;       // ... 其他配置}
```

等等，**只有 64KB？** 这么小？

别急。在高版本 Netty（4.1.x）中，实际默认值已经改成了**自适应的，不再固定**：

```
// DefaultChannelConfig.java — 新版本默认值（非直接翻倍，而是通过计算器）public class DefaultChannelConfig implements ChannelConfig {       // 实际默认的写缓冲区水位计算器    public static final MessageSizeEstimator DEFAULT_MSG_SIZE_ESTIMATOR =         DefaultMessageSizeEstimator.DEFAULT;       // 写缓冲区水位已经通过 WriteBufferWaterMark 类封装    private WriteBufferWaterMark writeBufferWaterMark = WriteBufferWaterMark.DEFAULT;}
```

`WriteBufferWaterMark.DEFAULT` 长这样：

```
// WriteBufferWaterMark.java — 水位的正式定义public final class WriteBufferWaterMark {    // 低水位：默认 32K    private final int low;       // 高水位：默认 64K      private final int high;    // 默认值    public static final WriteBufferWaterMark DEFAULT =            new WriteBufferWaterMark(32 * 1024, 64 * 1024);       // 实际上很多 Netty 用户会配置得更大    // 比如新版的 Netty 4.1.86+ 提供了自适应       public WriteBufferWaterMark(int low, int high) {        if (low < 0) {            throw new IllegalArgumentException("low must be >= 0");        }        if (high < low) {            throw new IllegalArgumentException("high must be >= low");        }        this.low = low;        this.high = high;    }    public int low() {        return low;    }    public int high() {        return high;    }}
```

**几个注意的点：**

*   `low < 0` 是不允许的
*   `low > high` 也是不允许的（否则逻辑反了）
*   这两个值只是**软限制**，不是硬限制；超过高水位不会抛异常，只改变 `isWritable()` 的状态

### 2.2 用户如何自定义

```
// 服务端或客户端初始化时配置ServerBootstrap b = new ServerBootstrap();b.option(ChannelOption.WRITE_BUFFER_WATER_MARK,         new WriteBufferWaterMark(256 * 1024, 1024 * 1024)); // 低256KB 高1MBb.childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,         new WriteBufferWaterMark(256 * 1024, 1024 * 1024));
```

**实战建议：** 64KB 高水位在现代互联网应用中确实偏小了。如果你的消息体比较大（比如几百KB一条），随手就能把水位打满。建议根据业务情况调大。

* * *

## 三、核心源码：ChannelOutboundBuffer 的实现

水位定好了，接下来就是在写入过程中实时检测了。这个检测发生在 **`ChannelOutboundBuffer`** 中。

`ChannelOutboundBuffer` 是 Netty 里藏在每一条 Channel 背后的**出站缓冲区**。所有 `write()` 操作最终都会把数据封装成 Entry 塞到这个链表里。

### 3.1 数据结构

```
// ChannelOutboundBuffer.java — 简化版结构public final class ChannelOutboundBuffer {       // 缓冲区中当前待写出的字节数（已入队但未刷新 / 已刷新但未写完）    private volatile long totalPendingSize;       // 挂起写入的 Entry 链表头    private Entry flushedEntry;       // 未刷新的 Entry 链表头（应用层调用 write 但未 flush 的数据）    private Entry unflushedEntry;       // 链表尾    private Entry tailEntry;       // 一个静态的 Entry 对象池（避免频繁 GC）    private static final Recycler<Entry> RECYCLER = ...;       // Entry 内部结构    static final class Entry {        // 要写入的消息对象        Object msg;               // 消息预估大小        long pendingSize;               // 数据总量（对于 ByteBuf 来说就是 readableBytes）        long total;               // 链表指针        Entry next;               // 已经写出/消费的字节数（用于写入进度追踪）        int progress;               // Promise，用于 write 回调        ChannelPromise promise;               // 取消标记        int cancelled = 0;    }}
```

我自己的理解：这个 Entry 链表天然分成了两段：

*   **头部（flushed 段）**：已经调用了 `flush()`，等待底层 JDK NIO 写出去的
*   **尾部（unflushed 段）**：只调了 `write()`，还没调 `flush()` 的

为什么这么分？因为 Netty 做了一个经典的**写时合并**优化：`write()` 先攒着，`flush()` 才真正把数据推给内核。攒的过程中你甚至可以对这些 Entry 做聚合（比如把多个小 ByteBuf 合并成一个大的，减少系统调用）。

### 3.2 addMessage() — 每次 write 都要检查水位

```
// ChannelOutboundBuffer.javapublic void addMessage(Object msg, int size, ChannelPromise promise) {       // 从 Recycler 对象池中获取或创建一个 Entry    Entry entry = Entry.newInstance(msg, size, total(msg), promise);       // 尾插法入队    if (tailEntry == null) {        flushedEntry = null;    } else {        Entry tail = tailEntry;        tail.next = entry;    }    tailEntry = entry;       if (unflushedEntry == null) {        unflushedEntry = entry;    }       // ★ 关键：累加待写出的字节数    incrementPendingOutboundBytes(entry.pendingSize);}// 累加待写出字节数 + 触发水位检测private void incrementPendingOutboundBytes(long size) {    if (size == 0) {        return;    }    // 原子性累加（因为 write 可能从多线程调用，虽然 Netty 推荐单线程写）    long newWriteBufferSize = TOTAL_PENDING_SIZE_UPDATER.addAndGet(this, size);       // ★ 这里就是高水位检测的核心    // 如果累加后的待写字节数 > 配置的高水位    if (newWriteBufferSize > config().getWriteBufferHighWaterMark()) {        // 并且当前 Channel 还处于可写状态        if (!channel().isWritable()) {            // 如果已经不可写了，那就不用重复通知了            return;        }               // ★ 设置不可写，并触发写状态变化事件        setUnwritable(invokeWriteChanged);    }}
```

逻辑很清晰：**每次 `write()` 进来，累加待写字节数，一旦超过高水位且当前状态还是可写的，就把状态切换为不可写，并触发事件传播。**

### 3.3 addFlush() — 刷新时把 current 指针前移

这里顺带说一下 `flush()` 干了什么，它把 `unflushedEntry` 链表整段挪到 `flushedEntry` 下面：

```
public void addFlush() {    Entry entry = unflushedEntry;    if (entry != null) {        if (flushedEntry == null) {            // flushed 链表为空，这整段变成 flushed 段            flushedEntry = entry;        }        // 把 unflushed 指针清空，这些数据等会儿由 NioEventLoop 负责写到网络        unflushedEntry = null;    }}
```

这个设计很妙——`write()` 只产生数据和累加字节数，`flush()` 只是指针操作，真正的网络 I/O 在后面 `NioEventLoop` 的 `processSelectedKeys()` 里完成。

### 3.4 remove() / removeBytes() — 写出后释放内存并降水位

当 NioEventLoop 成功把一些数据写到 Socket 后，会调用 `remove()` 或 `removeBytes()`。

```
// ChannelOutboundBuffer.javapublic void removeBytes(long writtenBytes) {    for (;;) {        // 拿出当前 flushed 段的第一条 Entry        Entry e = flushedEntry;               // 如果当前 Entry 不够写（比如这个 Entry 是 10KB，这次只写了 3KB）        // 就标记进度，下次继续写        long bytes = e.total;        e.progress += writtenBytes;               if (e.progress < bytes) {            // 没写完，减掉已经写出的部分            decrementPendingOutboundBytes(writtenBytes);            break;        }               // 写完了，整个 Entry 移除        writtenBytes -= (bytes - e.progress);        removeEntry(e);        // 继续看下一条    }}// 减少待写字节数 + 检测低水位private void decrementPendingOutboundBytes(long size) {    // 原子性减    long newWriteBufferSize = TOTAL_PENDING_SIZE_UPDATER.addAndGet(this, -size);       // ★ 这里就是低水位检测的核心    // 如果已经低于高水位（实际是大于等于低水位但小于高水位？）    // 不，条件是低于高水位的一定量之后唤醒    if (newWriteBufferSize < config().getWriteBufferLowWaterMark()) {        if (channel().isWritable()) {            // 已经可写了，就不重复通知了            return;        }               // ★ 设置回可写状态        setWritable(invokeWriteChanged);    }}
```

### 3.5 setUnwritable / setWritable — 状态切换

```
// ChannelOutboundBuffer.javaprivate void setUnwritable(boolean invokeLater) {    for (;;) {        final int oldVal = unwritable;        final int newVal = oldVal | 1;  // 把最低位置1，表示不可写        if (UNWRITABLE_UPDATER.compareAndSet(this, oldVal, newVal)) {            if (oldVal == 0 && newVal != 0) {  // 从可写变成不可写                fireChannelWritabilityChanged(invokeLater);            }            break;        }    }}private void setWritable(boolean invokeLater) {    for (;;) {        final int oldVal = unwritable;        final int newVal = oldVal & ~1;  // 把最低位清0，表示可写        if (UNWRITABLE_UPDATER.compareAndSet(this, oldVal, newVal)) {            if (oldVal != 0 && newVal == 0) {  // 从不可写变成可写                fireChannelWritabilityChanged(invokeLater);            }            break;        }    }}
```

这里用 `unwritable` 的 bit 0 做标记位，通过 CAS 保证线程安全。之所以用 int 而不是 boolean，是因为后续可以扩展更多位表示不同维度的不可写原因（虽然目前只用了一位）。

### 3.6 fireChannelWritabilityChanged — 把事件传播给用户

```
private void fireChannelWritabilityChanged(boolean invokeLater) {    final ChannelPipeline pipeline = channel().pipeline();    if (invokeLater) {        // 延迟执行：抛到 EventLoop 的任务队列中        // 避免在当前 flush 链条中递归触发        Runnable task = fireChannelWritabilityChangedTask;        if (task == null) {            fireChannelWritabilityChangedTask =                () -> pipeline.fireChannelWritabilityChanged();            task = fireChannelWritabilityChangedTask;        }        channel().eventLoop().execute(task);    } else {        pipeline.fireChannelWritabilityChanged();    }}
```

**注意 `invokeLater = true` 的情况**：当变成不可写时，Netty 选择**延迟传播**。为什么？因为当前可能正处在 `write()` 的调用链中，如果立即触发 `fireChannelWritabilityChanged()`，用户的 handler 收到回调后可能在同一个线程、同一个调用栈上继续写，导致递归。抛到 EventLoop 任务队列就能打破循环。

* * *

## 四、原理分析：完整的闭环

把上面所有片段串起来，整个高低水位控制的闭环是这样的：

```
应用调用 channel.write(msg)    │    ▼addMessage(msg, size, promise)    │    ▼incrementPendingOutboundBytes(size)    │    ├── 没超过高水位 → 继续写入（nothing happens）    │    └── 超过高水位 → setUnwritable(true)                          │                          ▼                    fireChannelWritabilityChanged()                          │                          ▼                     用户 handler 收到通知                     可以暂停后续写入                    --- 另一条线：NioEventLoop 在写 ---NioEventLoop 执行 doWrite(outboundBuffer)    │    ▼从 flushedEntry 链表逐个写出到 Socket    │    ▼removeBytes(writtenBytes)    │    ▼decrementPendingOutboundBytes(size)    │    ├── 还没降到低水位 → 继续保持不可写    │    └── 降到低水位以下 → setWritable(true)                              │                              ▼                        fireChannelWritabilityChanged()                              │                              ▼                         用户 handler 收到通知                         知道可以继续写了
```

### 设计模式分析

这个机制用到的重要设计思想：

1.  **观察者模式** — `fireChannelWritabilityChanged()` 沿着 Pipeline 传播，所有 Handler 都能观察到可写状态变化
2.  **水位概念借鉴** — 借用了 TCP 滑动窗口和流控中的高低水位思想
3.  **延迟通知** — 通过 `invokeLater` 避免递归触发，这是一种经典的**重入防护**
4.  **CAS + volatile** — 通过 `UNWRITABLE_UPDATER`（AtomicIntegerFieldUpdater）保证并发安全，避免加锁
5.  **对象池复用** — Entry 用 Recycler 复用，减少 GC 压力

### 与 TCP 流控的区别

这里我想强调一个容易混淆的点：**Netty 的高低水位 ≠ TCP 的滑动窗口。**

| 维度 | TCP 滑动窗口 | Netty 高低水位 |
| --- | --- | --- |
| 层次 | 内核态，传输层 | 用户态，应用层 |
| 触发方式 | 硬限制，write 阻塞 | 软限制，只是状态变化 |
| 反馈机制 | 内核直接阻塞线程 | 事件通知，应用自行决定 |
| 粒度 | 面向连接 | 面向 Channel |

Netty 的高低水位是对 TCP 不可控的**积极补偿**——与其让 TCP 在你 OOM 后才告诉你"写不了"，不如在到达危险水位之前就给开发者一个软信号。

* * *

## 五、完整可运行的使用示例

下面我写一段完整的 Demo，模拟一个**生产端-消费端速度不匹配**的场景，并用高低水位进行控制。

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.util.CharsetUtil;import java.util.concurrent.Executors;import java.util.concurrent.ScheduledExecutorService;import java.util.concurrent.TimeUnit;import java.util.concurrent.atomic.AtomicLong;/** * 演示 Netty 高低水位流量控制 *  * 服务端收到消息后不断回写大块数据，模拟"消费端慢于生产端"的场景 * 并在 ChannelWritabilityChanged 事件中控制写入节奏 */public class NettyFlowControlDemo {    private static final AtomicLong sentBytes = new AtomicLong(0);    private static final AtomicLong unsentBytes = new AtomicLong(0);    public static void main(String[] args) throws Exception {        EventLoopGroup bossGroup = new NioEventLoopGroup(1);        EventLoopGroup workerGroup = new NioEventLoopGroup();        try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(NioServerSocketChannel.class)             // ★ 自定义高低水位：低 256KB，高 1MB             .childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,                     new WriteBufferWaterMark(256 * 1024, 1024 * 1024))             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new FlowControlServerHandler());                 }             });            ChannelFuture f = b.bind(8080).sync();            System.out.println("服务端启动，监听 8080 端口，高低水位：256KB / 1MB");            f.channel().closeFuture().sync();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }    static class FlowControlServerHandler extends ChannelInboundHandlerAdapter {        private ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();        private volatile boolean writable = true;        @Override        public void channelActive(ChannelHandlerContext ctx) {            System.out.println("客户端连接建立");            // 模拟"生产者"：每 10ms 写一段数据            executor.scheduleAtFixedRate(() -> {                if (!writable) {                    // ★ 如果 Channel 不可写，就跳过本次写入                    System.out.println("[背压生效] 缓冲区已满，暂停写入，" +                            "当前待刷字节=" + ctx.channel().unsafe().outboundBuffer().totalPendingSize());                    return;                }                // 构造一条 16KB 的消息                byte[] data = new byte[16 * 1024];                ByteBuf buf = Unpooled.wrappedBuffer(data);                ctx.writeAndFlush(buf).addListener(future -> {                    if (future.isSuccess()) {                        long total = sentBytes.addAndGet(data.length);                        if (total % (1024 * 1024) == 0) {                            System.out.println("已成功写出 " + (total / 1024 / 1024) + " MB 数据");                        }                    } else {                        System.out.println("写入失败：" + future.cause().getMessage());                    }                });            }, 1, 10, TimeUnit.MILLISECONDS);  // 每 10ms 写一次        }        @Override        public void channelWritabilityChanged(ChannelHandlerContext ctx) {            // ★ 可写状态变化回调，这就是高低水位的核心事件            writable = ctx.channel().isWritable();            if (writable) {                System.out.println("[水位下降] Channel 恢复可写，继续生产数据，" +                        "待刷字节=" + ctx.channel().unsafe().outboundBuffer().totalPendingSize());            } else {                System.out.println("[水位升高] Channel 变为不可写，暂停生产，" +                        "待刷字节=" + ctx.channel().unsafe().outboundBuffer().totalPendingSize());            }        }        @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }}
```

运行这段代码，你会看到类似这样的输出：

```
服务端启动，监听 8080 端口，高低水位：256KB / 1MB客户端连接建立[水位升高] Channel 变为不可写，暂停生产，待刷字节=1090512[背压生效] 缓冲区已满，暂停写入，当前待刷字节=1090512[水位下降] Channel 恢复可写，继续生产数据，待刷字节=0（循环往复...）
```

通过 `writeBufferWaterMark` 和 `channelWritabilityChanged()` 的组合，实现了完美的**生产者-消费者调节**。

* * *

## 六、注意事项与最佳实践

### 6.1 高低水位的设置原则

这个纯属经验之谈，但踩过坑后的感悟：

| 场景 | 建议水位 |
| --- | --- |
| 小消息（< 1KB），高频写 | 默认（32K / 64K）够用 |
| 中等消息（1KB ~ 100KB） | 低 512K / 高 2M |
| 大消息（> 100KB） | 低 1M / 高 4M+ |
| 单链接吞吐极高 | 低 4M / 高 16M（结合内存考虑） |

**核心原则：高水位不能大于 Channel 的 SO\_SNDBUF 太多**，否则你水位降得很快（因为内核写完了），结果频繁在 writable/not writable 之间振荡。

### 6.2 不要忽略 isWritable 检查

这是最常见的坑。即使你监听了 `channelWritabilityChanged`，在 `write()` 前最好也做个判断：

```
if (ctx.channel().isWritable()) {    ctx.writeAndFlush(msg);} else {    // 暂存起来或丢弃，或对调用方施加反压    pendingQueue.add(msg);  // 暂存到业务层队列}
```

为什么？因为**事件通知有延迟**。`channelWritabilityChanged()` 抛到 EventLoop 任务队列，到你实际的 handler 方法被执行之间，可能又发生了新的 `write()`，此时 `isWritable()` 的状态不一定是你上次收到事件时的状态。

### 6.3 小心 writeAndFlush 的炸弹

```
// 危险！不要在 for 循环里疯狂 writeAndFlushfor (int i = 0; i < 100000; i++) {    ctx.writeAndFlush(largeMsg);  // 这会让 outboundBuffer 瞬间爆炸}
```

有节制的做法：

```
if (ctx.channel().isWritable()) {    ctx.writeAndFlush(msg);} else {    // 用缓冲区暂存，等 writable 恢复后再写    backlog.offer(msg);}
```

### 6.4 ChannelOutboundBuffer 的 maxMessagesPerRead

还有一个配套参数：`ChannelConfig.setMaxMessagesPerRead(int)`，它控制每次读操作最多处理多少条消息，防止一个 `select()` 返回太多读写事件导致饿了其他 Channel。

### 6.5 内存泄漏风险

如果 Channel 关闭了，`ChannelOutboundBuffer` 中残留的 Entry 需要被正确释放。Netty 做了这个清理：

```
// ChannelOutboundBuffer.close() — Channel 关闭时的清理public void close(final ClosedChannelException cause) {    if (inFail) {        return;    }    inFail = true;       // 释放所有 flushed 和 unflushed 的 Entry    // 防止内存泄漏    ...}
```

如果你们在自定义 handler 中自作主张缓存了未 flush 的 msg，请务必在 `channelInactive` 中释放掉，否则就是内存泄漏。

### 6.6 可以关闭流量控制吗？

理论上可以——设置一个极大的高水位（比如 `Integer.MAX_VALUE`）就相当于关掉了。但**不建议这样做**，除非你明确知道自己应用的内存极限，并且准备好了 OOM 的后果。

```
// 这相当于几乎关掉了 Netty 的流量控制new WriteBufferWaterMark(0, Integer.MAX_VALUE);
```

* * *

## 七、总结

Netty 的高低水位流量控制机制，说大不大（就是 `incrementPendingOutboundBytes` 和 `decrementPendingOutboundBytes` 两个方法的事），说小不小（它构成了 Netty 背压的基础设施）。

看完源码后我的感受是：**Netty 把"网络写"这件事处理得远比看上去复杂**。从 Entry 链表的设计到延迟通知，从 CAS 原子更新到对象池复用，每一步都是为了在高吞吐下保持稳定。

对开发者来说，用好这个机制其实只需要三件事：

1.  **设置合理的高低水位**（别用 64KB 的默认值，太激进了）
2.  **监听 `channelWritabilityChanged` 事件**，实现生产节奏调节
3.  **写之前检查 `isWritable()`**，永远不要盲目 write

这套机制 + TCP 的滑动窗口 + 应用层的队列，三层背压叠加，才是真正的"全链路反压"。

* * *

_下期预告：Netty源码分析(26) — FileRegion 与文件传输优化_
