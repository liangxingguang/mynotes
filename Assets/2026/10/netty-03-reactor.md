# Netty源码分析(3) — Reactor线程模型：从单线程到主从多Reactor

> 深入解读Netty的Reactor线程模型，从单线程到多线程到主从多Reactor，剖析NioEventLoop与EventLoopGroup的源码实现

> 图片说明：Netty 主从多 Reactor 线程模型架构图。Boss EventLoop 负责 accept 连接，Worker EventLoop 负责读写事件，通过 Round-Robin 分配新连接到 Worker 线程。

## 引言

说实话，我刚接触 Netty 的时候，最困惑的就是它的线程模型。什么 bossGroup、workerGroup，什么 EventLoop，绕得人头晕。后来啃了几个月源码，才算是彻底搞明白。

这玩意儿其实就是 Doug Lea 老爷子那篇《Scalable IO in Java》里讲的 Reactor 模式，只不过 Netty 把它玩出了花。今天咱们就把它扒开看看，到底是怎么回事。

## 一、Reactor 模式的前世今生

**先说说我们面临的问题：**

在传统的 BIO 模型里，一个线程处理一个连接。来了 1000 个连接，你就要开 1000 个线程。操作系统光是上下文切换就要累吐血。连接数一上来，服务端直接 GG。

**Reactor 模式的核心思想就四个字：事件分发。**

简单来说就是——一个（或几个）线程专门负责监听事件（连接到来、数据可读、数据可写），然后把事件分发给对应的 Handler 去处理。这就是典型的"多路复用 + 非阻塞 IO"。

Netty 把 Reactor 玩出了三个层级：

模式

架构

适用场景

Reactor 单线程

一个线程干所有事

小规模应用

Reactor 多线程

一个 Reactor + Worker 线程池

大多数场景

主从多 Reactor

多个 Reactor

高并发场景

## 二、Netty 的三层线程模型

### 2.1 单线程模型（一个 Reactor 线程）

一个 NioEventLoop 既负责 accept 连接，又负责读写事件。

`EventLoopGroup group = new NioEventLoopGroup(1);   ServerBootstrap b = new ServerBootstrap();   b.group(group)    .channel(NioServerSocketChannel.class)    ...   `

**优点**：简单，没有线程竞争。 **缺点**：一个线程扛不住大量连接，而且一个 Handler 阻塞了，所有连接都跟着凉凉。

### 2.2 多线程模型（一个 Reactor + Worker 池）

一个 boss 线程负责 accept，worker 线程池负责读写。Netty 默认的就是这种。

`EventLoopGroup bossGroup = new NioEventLoopGroup(1);   EventLoopGroup workerGroup = new NioEventLoopGroup(); // 默认 CPU*2   ServerBootstrap b = new ServerBootstrap();   b.group(bossGroup, workerGroup)   `

**特点**：

*   bossGroup 只负责 accept，做完把 Channel 注册到 workerGroup
    
*   workerGroup 中的每个 EventLoop 负责一批 Channel 的读写
    
*   每个 EventLoop 绑定到一个线程，一个 EventLoop 可以服务多个 Channel
    

### 2.3 主从多 Reactor 模型

多个 boss 线程，多个 worker 线程。适用于超高并发场景。

`EventLoopGroup bossGroup = new NioEventLoopGroup(4);   EventLoopGroup workerGroup = new NioEventLoopGroup(16);   ServerBootstrap b = new ServerBootstrap();   b.group(bossGroup, workerGroup)   `

Netty 的客户端 `NioSocketChannel` 其实本身就隐含了多 Reactor：它自己也会注册到一个 EventLoop 上，类似于 sub Reactor。

## 三、核心源码逐层剖析

### 3.1 NioEventLoop — 一个线程干到底

这是整个线程模型的核心。每个 NioEventLoop 包含三样东西：

`public final class NioEventLoop extends SingleThreadEventLoop {       // 1. 一个 Selector — 用于多路复用       private Selector selector;       private Selector unwrappedSelector;           // 2. 一个任务队列（继承自 SingleThreadEventExecutor）       // private final Queue<Runnable> taskQueue;           // 3. 一个线程（由 SingleThreadEventExecutor 管理）       // private volatile Thread thread;   }  `

每个 NioEventLoop 都对应一个**永远不死的线程**。这个线程在 run() 方法里无限循环：

`@Override   protected void run() {       int selectCnt = 0;       for (;;) {           try {               // 阶段一：检查是否有任务要执行               int strategy = selectStrategy.calculateStrategy(selectSupplier, hasTasks());               switch (strategy) {                   case SelectStrategy.SELECT:                       // 没有任务，执行 select 等待 IO 事件                       // 这里有个巨坑：select 空轮询 bug，Netty 加了计数器来检测                       long curDeadline = ...;                        if (selectCnt == 0) {                           // 首次进入 select                       }                       selectCnt++;                       break;                   case SelectStrategy.SELECT_NOW:                       // 不阻塞，立即 select                       break;                   default:                       // 有任务要执行，selectNow() 非阻塞               }                           // 阶段二：处理 IO 事件               // 把就绪的 SelectionKey 拎出来，挨个处理               processSelectedKeys();                           // 阶段三：处理异步任务               runAllTasks();                           // 阶段四：处理定时任务               afterRunningAllTasks();                       } catch (Exception e) {               // 保证死循环不退出           }       }   }  `

**这就是 NioEventLoop 的完整生命周期**：Selector 等待 → IO 事件处理 → 异步任务执行 → 再来一轮。

我当初看这段代码的时候就在想，为什么 Netty 要把 IO 和普通任务放在一个线程里？后来才明白，这其实是 Reactor 模式的要求——**同一个 Channel 的所有操作必须在同一个线程中执行**，这样才能避免加锁。这叫"线程绑定"。

### 3.2 EventLoopGroup — 工厂 + 分配器

EventLoopGroup 本质是一个 EventLoop 的池子，负责两件事：

**1\. 创建 EventLoop**

`// NioEventLoopGroup 构造函数   public NioEventLoopGroup(int nThreads, Executor executor,                             SelectorProvider selectorProvider) {       // 这里的 nThreads 如果你不传，默认值是 CPU 核心数 * 2       super(nThreads, executor, selectorProvider,             DefaultSelectStrategyFactory.INSTANCE);   }   `

**2\. 为新的 Channel 分配一个 EventLoop**

`// 关键方法：注册 Channel 到某个 EventLoop   @Override   public ChannelFuture register(Channel channel) {       // 调用 next() 选择一个 EventLoop       return next().register(channel);   }  // next() 用轮询（Round-Robin）算法分配   @Override   public EventExecutor next() {       // chooser 是一个高效的轮询器       return chooser.next();   }  `

这个 `chooser` 在 Netty 4.x 里做了优化。以前用 `AtomicInteger % length` 取模，后来改成了 **2 的幂次取余 + 位运算**，性能更好。

`// 当 size 是 2 的幂时，用位运算代替取模   public EventExecutor next() {       return executors[idx.getAndIncrement() & executors.length - 1];   }   `

### 3.3 boss 与 worker 是怎么配合的？

这里最巧妙的地方在于：**boss 和 worker 都是 NioEventLoopGroup，但职责不同。**

`// ServerBootstrap 的 bind() 方法内部   private ChannelFuture doBind(final SocketAddress localAddress) {       // 1. 创建 NioServerSocketChannel       final ChannelFuture regFuture = initAndRegister();       // 这里面会 channel = channelFactory.newChannel();       // 然后 bossGroup.register(channel) —— 把 ServerSocketChannel 注册到 boss           // 2. 实际绑定端口       channel.bind(localAddress, promise);   }  // 关键在 init() 方法中   @Override   void init(Channel channel) {       ChannelPipeline p = channel.pipeline();           // 这个 Handler 会在 ServerSocketChannel accept 新连接时被调用       p.addLast(new ChannelInitializer<Channel>() {           @Override           public void initChannel(final Channel ch) {               final ChannelPipeline pipeline = ch.pipeline();                           // 添加 ServerBootstrapAcceptor               // 这个 Acceptor 就是 boss → worker 的桥梁               pipeline.addLast(new ServerBootstrapAcceptor(                   currentChildGroup,     // → workerGroup                   currentChildHandler,                      currentChildOptions,                   currentChildAttrs));           }       });   }  `

而 **ServerBootstrapAcceptor** 就是 boss 和 worker 之间的传送带：

`private static class ServerBootstrapAcceptor extends ChannelInboundHandlerAdapter {       private final EventLoopGroup childGroup;  // workerGroup       private final ChannelHandler childHandler;           @Override       @SuppressWarnings("unchecked")       public void channelRead(ChannelHandlerContext ctx, Object msg) {           final Channel child = (Channel) msg;  // 新 accept 的 NioSocketChannel                   // 把新的 SocketChannel 注册到 workerGroup           childGroup.register(child).addListener(new ChannelFutureListener() {               @Override               public void operationComplete(ChannelFuture future) {                   // 注册完成后，worker 的 EventLoop 开始处理这个 Channel 的读写                   if (!future.isSuccess()) {                       forceClose(child, future.cause());                   }               }           });       }   }  `

整个过程下来就清晰了：

`boss EventLoop accept 新连接       ↓   创建 NioSocketChannel       ↓   boss 中的 ServerBootstrapAcceptor.channelRead()       ↓   childGroup.register(child) → 轮询某个 worker EventLoop       ↓   worker EventLoop 将这个 Channel 的 OP_READ 注册到自己的 Selector       ↓   之后这个 Channel 的所有 IO 都由这个 worker 线程处理   `

## 四、完整可运行的示例

写一个能跑起来的例子，让大家感受一下线程模型的运转：

`import io.netty.bootstrap.ServerBootstrap;   import io.netty.buffer.ByteBuf;   import io.netty.buffer.Unpooled;   import io.netty.channel.*;   import io.netty.channel.nio.NioEventLoopGroup;   import io.netty.channel.socket.SocketChannel;   import io.netty.channel.socket.nio.NioServerSocketChannel;   import io.netty.util.CharsetUtil;  public class ReactorDemoServer {           public static void main(String[] args) throws Exception {           // bossGroup: 1个线程，只负责 accept           EventLoopGroup bossGroup = new NioEventLoopGroup(1);           // workerGroup: 默认 CPU核心数*2 个线程，负责读写           EventLoopGroup workerGroup = new NioEventLoopGroup();                       try {               ServerBootstrap b = new ServerBootstrap();               b.group(bossGroup, workerGroup)                .channel(NioServerSocketChannel.class)                .childHandler(new ChannelInitializer<SocketChannel>() {                    @Override                    protected void initChannel(SocketChannel ch) {                        ChannelPipeline p = ch.pipeline();                        p.addLast(new SimpleChannelInboundHandler<ByteBuf>() {                            @Override                            protected void channelRead0(                                    ChannelHandlerContext ctx, ByteBuf msg) {                                // 打印当前线程名，看看是哪个 worker 在处理                                String threadName = Thread.currentThread().getName();                                String content = msg.toString(CharsetUtil.UTF_8);                                System.out.println("[" + threadName + "] 收到: " + content);                                                                // 回复客户端                                ctx.writeAndFlush(Unpooled.copiedBuffer(                                    "Server received: " + content, CharsetUtil.UTF_8));                            }                                                            @Override                            public void exceptionCaught(                                    ChannelHandlerContext ctx, Throwable cause) {                                cause.printStackTrace();                                ctx.close();                            }                        });                    }                })                .option(ChannelOption.SO_BACKLOG, 128)                .childOption(ChannelOption.SO_KEEPALIVE, true);                           // 绑定端口               ChannelFuture f = b.bind(8888).sync();               System.out.println("ReactorDemoServer 已启动，端口: 8888");               System.out.println("boss EventLoop 数量: " + bossGroup.executorCount());               System.out.println("worker EventLoop 数量: " + workerGroup.executorCount());                           // 等待服务器关闭               f.channel().closeFuture().sync();           } finally {               bossGroup.shutdownGracefully();               workerGroup.shutdownGracefully();           }       }   }  `

用 telnet 连上去看看效果：

`# 开三个终端分别连接   telnet localhost 8888   # 输入点什么，看服务端输出：   # [nioEventLoopGroup-3-1] 收到: hello   # [nioEventLoopGroup-3-2] 收到: world  ← 不同连接可能由不同 worker 处理   `

## 五、Reactor 模型的灵魂：事件循环与任务分离

理解 Netty 线程模型最关键的一点是——**NioEventLoop 不只是一个 IO 线程，它更是一个任务执行引擎。**

`// runAllTasks() 内部   protected boolean runAllTasks(long timeoutNanos) {       // 1. 从任务队列取任务       Runnable task = pollTask();       if (task == null) {           // 2. 尝试从 MPSC（多生产者单消费者）队列取           afterRunningAllTasks();           return false;       }           // 3. 执行所有任务       for (;;) {           safeExecute(task);  // task.run()           task = pollTask();           if (task == null) {               break;           }       }       // 4. 执行尾部任务（定时任务等）       afterRunningAllTasks();       return true;   }  `

为什么要搞这么复杂？因为 Netty 内部大量的操作都要**保证线程安全**：

*   `channel.write()` 可能在业务线程调用，但真正写 Channel 必须在绑定该 Channel 的 EventLoop 里执行
    
*   `channel.close()` 也一样
    
*   `bootstrap.connect()` 返回的 Future 回调也要在 EventLoop 里执行
    

Netty 的做法就是：**把操作封装成任务，提交到目标 EventLoop 的任务队列，由它自己执行。** 这是典型的"串行化无锁"设计。

## 六、注意事项与常见坑

### 6.1 不要在 ChannelHandler 里做耗时操作

`public class BadHandler extends SimpleChannelInboundHandler<ByteBuf> {       @Override       protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {           // ❌ 错误！这会阻塞整个 EventLoop           // 导致该 EventLoop 上所有 Channel 都卡住           Thread.sleep(5000);         }   }   `

**解决办法**：使用 `DefaultEventExecutorGroup` 或者把耗时操作异步化。

`// 加一个业务线程池   EventExecutorGroup businessGroup = new DefaultEventExecutorGroup(8);  b.childHandler(new ChannelInitializer<SocketChannel>() {       @Override       protected void initChannel(SocketChannel ch) {           ch.pipeline()             .addLast(businessGroup, "businessHandler", new BusinessHandler());       }   });  `

### 6.2 JDK Selector 空轮询 Bug

这应该是所有 Netty 使用者都踩过的坑。JDK 的 epoll Selector 在某些 Linux 内核版本下，会出现 `select()` 返回就绪事件但实际没有任何事件的情况（空轮询），导致 CPU 100%。

Netty 的处理方案非常巧妙——**重建 Selector**：

`// NioEventLoop 中的 select 循环   if (SELECTOR_AUTO_REBUILD_THRESHOLD > 0        && selectCnt >= SELECTOR_AUTO_REBUILD_THRESHOLD) {       // selectCnt 计数超过阈值（默认512次），触发 Selector 重建       logger.warn("Selector.select() returned prematurely ...");       rebuildSelector();  // 重新创建一个 Selector，把原注册的 Channel 迁移过去       return;   }   `

这个重建逻辑是我认为 Netty 源码里最优雅的容错之一。

### 6.3 线程模型的选择建议

连接数

建议模型

配置

小于 100

单线程足矣

`new NioEventLoopGroup(1)` 给 boss 和 worker 用同一个

100 ~ 1000

标准多线程

默认配置即可

1000 ~ 10000

调整 worker 数量

`new NioEventLoopGroup(CPU*4)`

万级以上

主从多 Reactor

多个 boss 线程 + 多个 worker 线程

### 6.4 EventLoop 与 Channel 的一一对应

记住一个原则：**一旦一个 Channel 被注册到某个 EventLoop，它这辈子就绑定这个线程了。** 不会变。

`ChannelA ──绑定──→ EventLoop1 (线程1)   ChannelB ──绑定──→ EventLoop2 (线程2)      ChannelC ──绑定──→ EventLoop1 (线程1)  ← 同一个线程处理多个 Channel，顺序执行   `

这意味着如果你小心翼翼地做 `channel.write()`，别忘了最终执行还是在那个 EventLoop 线程里。别在业务线程里直接调用 `channel.write()` 然后以为它立刻就发走了——它可能还在任务队列里排队呢！

## 总结

Netty 的 Reactor 线程模型总结下来就三句话：

1.  **一个 EventLoop = 一个 Selector + 一个线程 + 一个任务队列**
    
2.  **boss 负责接客（accept），worker 负责伺候（read/write）**
    
3.  **同一个 Channel 的所有操作都在同一个线程里执行，不需要加锁**
    

理解了这三点，Netty 线程模型你就掌握了大半。下一期咱们聊聊 Channel、ChannelPipeline 和 ChannelHandler 这"三剑客"，它们是 Netty 架构的另一个基石。

* * *

> **文中源码基于 Netty 4.1.x，不同版本可能有细微差异。** 源码文件位置：`io.netty.channel.nio.NioEventLoop`、`io.netty.channel.nio.NioEventLoopGroup`、`io.netty.bootstrap.ServerBootstrap`
