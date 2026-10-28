---
title: Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483959&idx=1&sn=fad11177db7eac2d06d924bcfccec4c9&chksm=fe6ca36dc91b2a7bf7750cf11a7672da1054f9a0d6711c2cce72c7c93ecd790107dbc74a5b2e
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-netty-06-eventloop.md
asset_ref: Assets/2026/10/netty-06-eventloop.md
---

# Netty源码分析(6) — EventLoopGroup 与 EventLoop 源码解析

## 一、背景与问题

上一篇文章我们聊了 Channel、ChannelPipeline、ChannelHandler 三剑客。但有个问题不知你想过没有：**Netty 里的事件到底是谁在执行？Handler 的 channelRead、channelActive 方法跑在哪个线程上？**

答案就是今天的主角：**EventLoop（事件循环）**。

在 Java NIO 中，我们通常会自己写一个 `while(true)` 循环，调用 `Selector.select()` 获取就绪事件，然后一个个处理。Netty 的 EventLoop 本质上就是对这个循环的封装，但它做得好在：

1.  **一个 EventLoop = 一个线程 + 一个 Selector + 一个任务队列**，三合一，通过一个死循环把 IO 事件和普通任务串起来跑；
    
2.  **EventLoopGroup** 管理着一组 EventLoop，就像线程池管理一组线程一样；
    
3.  **每个 Channel 一生只绑定一个 EventLoop**（从而保证一个 Channel 上的所有操作都在同一个线程内执行，避免了锁竞争）。
    

今天我们就深入到源码层面，看看 EventLoopGroup 和 EventLoop 到底是怎么工作的。

## 二、核心源码分析

### 2.1 类层次结构

`interface EventExecutorGroup          // 最顶层，管理一组 EventExecutor      └─ interface EventLoopGroup         // 加上了 register(Channel) 方法          └─ interface MultithreadEventLoopGroup  // 抽象实现               ├─ class NioEventLoopGroup         // NIO 实现               └─ class EpollEventLoopGroup       // Linux Epoll 实现  interface EventExecutor               // 单个执行器      └─ interface EventLoop              // 加上 parent() 和 register()          └─ class SingleThreadEventLoop          // 单线程 EventLoop 基类               └─ class NioEventLoop              // NIO 实现  `

### 2.2 NioEventLoopGroup 构造

我们平时写服务端就是 `new NioEventLoopGroup()`，默认构造传 0，但 Netty 会巧妙地给个默认值。

`// NioEventLoopGroup.java   public NioEventLoopGroup() {       this(0);  // 传 0，表示用默认线程数   }  public NioEventLoopGroup(int nThreads) {       this(nThreads, (Executor) null);   }  public NioEventLoopGroup(int nThreads, Executor executor) {       // 注意第三个参数：SelectorProvider 和 SelectStrategyFactory       this(nThreads, executor, SelectorProvider.provider());   }  // 最终调到这个构造：   public NioEventLoopGroup(           int nThreads, Executor executor, final SelectorProvider selectorProvider,           final SelectStrategyFactory selectStrategyFactory) {       super(nThreads, executor, selectorProvider, selectStrategyFactory);       // 这里啥都没干，全交给父类了   }  `

关键的默认值在哪里？在 MultithreadEventLoopGroup 里：

`// MultithreadEventLoopGroup.java   private static final int DEFAULT_EVENT_LOOP_THREADS;  static {       // 优先取系统属性 io.netty.eventLoopThreads       DEFAULT_EVENT_LOOP_THREADS = Math.max(1, SystemPropertyUtil.getInt(               "io.netty.eventLoopThreads",                Runtime.getRuntime().availableProcessors() * 2));   }  @Override   protected EventLoop newChild(Executor executor, Object... args) throws Exception {       // 每个子 EventLoop 通过 newChild 创建       return new NioEventLoop(this, executor, (SelectorProvider) args[0],               ((SelectStrategyFactory) args[1]).newSelectStrategy());   }  `

**划重点**：默认线程数是 `CPU核数 * 2`，你可以通过 `-Dio.netty.eventLoopThreads=16` 覆盖。

### 2.3 MultithreadEventLoopGroup 核心：children 数组与 chooser

`// MultithreadEventLoopGroup 继承自 MultithreadEventExecutorGroup   // 关键的 children 数组在这里创建：  public abstract class MultithreadEventExecutorGroup implements EventExecutorGroup {       private final EventExecutor[] children;    // EventLoop 数组       private final EventExecutorChooserFactory.EventExecutorChooser chooser;       private final Set<EventExecutor> readonlyChildren;       protected MultithreadEventExecutorGroup(               int nThreads, Executor executor, EventExecutorChooserFactory chooserFactory,                Object... args) {           // ...           // 第 1 步：创建 nThreads 个 EventLoop           children = new EventExecutor[nThreads];           for (int i = 0; i < nThreads; i ++) {               // newChild 由子类实现：NioEventLoopGroup -> new NioEventLoop(...)               children[i] = newChild(executor, args);           }           // 第 2 步：初始化 chooser，用于均匀分配 Channel           chooser = chooserFactory.newChooser(children);                   // 第 3 步：为每个 EventLoop 创建线程工厂，存到 readonlyChildren           // ...       }           // 分配下一个 EventLoop 的方法       @Override       public EventLoop next() {           // chooser 负责策略选择           return (EventLoop) chooser.next();       }   }  `

这里有个**非常值得关注**的设计：

`// EventExecutorChooserFactory 的两种实现：   // 1. PowerOfTwoEventExecutorChooser（当线程数是 2 的幂时）   // 2. GenericEventExecutorChooser（其他情况）  // PowerOfTwoEventExecutorChooser 用 idx++ & (len - 1)，位运算，性能极高   // GenericEventExecutorChooser 用 idx++ % len，通用的取模  public EventExecutorChooser newChooser(EventExecutor[] executors) {       if (isPowerOfTwo(executors.length)) {           return new PowerOfTwoEventExecutorChooser(executors);       } else {           return new GenericEventExecutorChooser(executors);       }   }  `

### 2.4 NioEventLoop — 核心 run() 方法

EventLoop 的灵魂就在 `run()` 方法里，它是那个永远不会退出的 `while(true)` 循环。

`// NioEventLoop.java   @Override   protected void run() {       int selectCnt = 0;  // select 轮数计数器，用于检测 JDK 空轮询 bug       for (;;) {  // 这就是传说中的事件循环！           try {               int strategy;               try {                   // SelectStrategy 决定这次 select 怎么执行                   strategy = selectStrategy.calculateStrategy(selectStrategySupplier,                            hasTasks() || hasScheduledTasks());                                   switch (strategy) {                       case SelectStrategy.CONTINUE:   // 继续 select                           continue;                       case SelectStrategy.BUSY_WAIT:  // 忙等待（仅 epoll）                           strategy = selectSupplier.get();                           break;                       case SelectStrategy.SELECT:     // 正常的 select 阻塞                           // 计算 select 阻塞的超时时间（取决于调度任务）                           long curDeadline = delayedTaskQueue.peekFirst(                                       AbstractScheduledEventExecutor::getDeadline);                           long delayNanos = scheduleTaskDeadlineNanos(curDeadline);                                                       if (delayNanos > 0) {                               // 没有到时，进入阻塞 select（最多等 delayNanos 纳秒）                               select(curDeadline);                           } else {                               // 有到期的定时任务，立即 selectNow() 不阻塞                               selectNow();                           }                           selectCnt = 1;  // 重置计数器                           break;                       default:                           // 走 selectedKeys 的快速路径                   }               } catch (IOException e) {                   rebuildSelector0();                   selectCnt = 0;                   continue;               }               // 👇 IO 事件处理和任务执行（关键设计：比例控制）               selectCnt = handleSelectExceptions(selectCnt);                           // 计算 IO 事件数量和任务数量之间的比率               // 默认 50%，即一半时间处理 IO，一半处理任务               int ioRatio = this.ioRatio;  // 默认 50                           if (ioRatio == 100) {                   // IO 占比 100%，先处理完所有 IO 事件                   processSelectedKeys();                   // 再运行所有任务                   runAllTasks();               } else {                   // ioRatio = 50，IO 和任务按时间比例执行                   final long ioStartTime = System.nanoTime();                   processSelectedKeys();    // 先处理 IO                                   final long ioTime = System.nanoTime() - ioStartTime;                   // 分配给任务的时间 = IO时间 * (100 - ioRatio) / ioRatio                   // 比如 IO 花了 10ms，ioRatio=50，任务也能跑 10ms                   runAllTasks(ioTime * (100 - ioRatio) / ioRatio);               }               // JDK 空轮询 bug 检测与修复               if (selectCnt > SELECTOR_AUTO_REBUILD_THRESHOLD) {                   // 触发了，重建 Selector                   selectCnt = 0;                   rebuildSelector0();               }           } catch (CancelledKeyException e) {               // 取消的 key，忽略           } catch (Error e) {               throw e;           } catch (Throwable t) {               logger.warn("Unexpected exception in the selector loop.", t);               try {                   Thread.sleep(1000);               } catch (InterruptedException e) {                   // 忽略               }           }       }   }  `

### 2.5 processSelectedKeys — IO 事件分发

`// NioEventLoop.java   private void processSelectedKeys() {       if (selectedKeys != null) {           // 优化路径：使用 Netty 自己实现的 SelectedSelectionKeySet（Set 换成数组）           // 避免了 JDK 的 HashSet 开销           processSelectedKeysOptimized();       } else {           processSelectedKeysPlain(selector.selectedKeys());       }   }  private void processSelectedKeysOptimized() {       for (int i = 0; i < selectedKeys.size; ++i) {           final SelectionKey k = selectedKeys.keys[i];           selectedKeys.keys[i] = null;  // help GC                   final Object a = k.attachment();           if (a instanceof AbstractNioChannel) {               // 核心：调用 NioChannel 的 read 或 write 方法               processSelectedKey(k, (AbstractNioChannel) a);           } else {               // 如 NioTask，直接运行               @SuppressWarnings("unchecked")               NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;               processSelectedKey(k, task);           }       }   }  private void processSelectedKey(SelectionKey k, AbstractNioChannel ch) {       final AbstractNioChannel.NioUnsafe unsafe = ch.unsafe();           // 检查 key 是否有效       if (!k.isValid()) {           // 无效 key，关闭通道           unsafe.close(unsafe.voidPromise());           return;       }       try {           int readyOps = k.readyOps();                   // 优先处理连接事件（connect）           if ((readyOps & SelectionKey.OP_CONNECT) != 0) {               int ops = k.interestOps();               ops &= ~SelectionKey.OP_CONNECT;               k.interestOps(ops);               unsafe.finishConnect();  // 完成连接           }           // 处理写事件（write）           if ((readyOps & SelectionKey.OP_WRITE) != 0) {               ch.unsafe().forceFlush();           }           // 处理读事件（read）或 accept 事件           if ((readyOps & (SelectionKey.OP_READ | SelectionKey.OP_ACCEPT)) != 0                    || readyOps == 0) {               unsafe.read();               if (!ch.isOpen()) {                   // 关闭后不再处理写                   return;               }           }       } catch (CancelledKeyException ignored) {           unsafe.close(unsafe.voidPromise());       }   }  `

### 2.6 wakeup — 唤醒阻塞的 select

这个操作虽然简单，但调用时机非常讲究：

`// SingleThreadEventExecutor.java   @Override   public void execute(Runnable task) {       if (task == null) {           throw new NullPointerException("task");       }       boolean inEventLoop = inEventLoop();  // 判断当前线程是不是 EventLoop 自己           // 把任务加到 EventLoop 自己的任务队列（MpscLinkedQueue）       addTask(task);           if (!inEventLoop) {           // 如果是外部线程提交任务，需要唤醒 EventLoop           // 因为 EventLoop 可能正阻塞在 select() 上           startThread();           if (wakeup) {               // 打断 select 阻塞，让 EventLoop 赶紧去跑任务               wakeup = false;               selector.wakeup();           }       }   }  `

**关键点**：`selector.wakeup()` 不能滥用。Netty 用一个 `wakeup` 布尔变量做了一次「短路」，避免反复唤醒。

### 2.7 register — Channel 与 EventLoop 的绑定

`// SingleThreadEventLoop.java   @Override   public ChannelFuture register(Channel channel) {       return register(new DefaultChannelPromise(channel, this));   }  @Override   public ChannelFuture register(final ChannelPromise promise) {       ObjectUtil.checkNotNull(promise, "promise");       // channel.unsafe().register 最终会调用到 AbstractChannel 的 register()       promise.channel().unsafe().register(this, promise);       return promise;   }  // AbstractChannel.java — AbstractUnsafe.register()   @Override   public final void register(EventLoop eventLoop, final ChannelPromise promise) {       // ... 各种检查           AbstractChannel.this.eventLoop = eventLoop;  // 👈 关键：Channel 绑定到 EventLoop           if (eventLoop.inEventLoop()) {           // 如果已经在 EventLoop 线程中，直接注册           register0(promise);       } else {           try {               // 否则提交到 EventLoop 的任务队列，由它线程异步执行注册               // 这就保证了：Channel 的所有后续操作都发生在同一个线程里               eventLoop.execute(new Runnable() {                   @Override                   public void run() {                       register0(promise);                   }               });           } catch (Throwable t) {               // ...           }       }   }  private void register0(ChannelPromise promise) {       try {           // 真正注册到 Selector 上           boolean firstRegistration = neverRegistered;           doRegister();  // 调用 AbstractNioChannel.doRegister()           neverRegistered = false;           registered = true;                   // 触发 pipeline 的 handlerAdded 和 channelRegistered           pipeline.invokeHandlerAddedIfNeeded();           safeSetSuccess(promise);           pipeline.fireChannelRegistered();                   // 如果是 Active 状态（比如客户端预先连接好了），触发 channelActive           if (isActive()) {               if (firstRegistration) {                   pipeline.fireChannelActive();               } else if (config().isAutoRead()) {                   beginRead();               }           }       } catch (Throwable t) {           // 注册失败，强制关闭           closeForcibly();           closeFuture.setClosed();           safeSetFailure(promise, t);       }   }  `

## 三、原理分析

### 3.1 「一个线程一个 Selector 一个 Channel」

这是理解 Netty EventLoop 最核心的一句话：

*   **NioEventLoop = Thread（线程）+ Selector（选择器）+ TaskQueue（任务队列）**
    
*   Channel 注册到 EventLoop 后，其所有 IO 事件和任务都由该 EventLoop 的线程执行
    
*   **同一个 Channel 的所有 Handler 调用都在同一个线程内完成** → 无需加锁
    

### 3.2 Reactor 线程模型落地

Netty 实现的就是经典的 **Reactor 主从多线程模型**：

`Boss EventLoopGroup（通常 1 个线程）       │       │  accept 连接，注册到 Worker       ▼   Worker EventLoopGroup（通常 CPU*2 个线程）       │       ├── EventLoop[0]: ChannelA, ChannelB       ├── EventLoop[1]: ChannelC, ChannelD       └── EventLoop[2]: ChannelE, ...   `

*   **Boss** 负责 accept 新连接
    
*   **Worker** 负责处理连接的读写事件  
    
*   Worker 里的 EventLoop 通过 chooser 算法均匀分配连接
    

### 3.3 IO 事件与普通任务的时间比例（ioRatio）

这不是一个随意的设计。你想想，如果 EventLoop 一直在处理 select 回来的 IO 事件，那普通任务（比如用户通过 `channel.write()` 提交的写请求）什么时候执行？放在那里过期？

Netty 通过 `ioRatio` 控制了 IO 处理和任务执行的时间均衡：

*   **ioRatio = 50**（默认）：IO 和任务各一半
    
*   **ioRatio = 100**：优先处理完所有 IO，再去执行任务  
    
*   **ioRatio = 20**：IO 占大头，任务插空跑
    

### 3.4 设计模式：结合了多种经典模式

这个 EventLoop 体系其实融合了好几个设计模式：

模式

体现

**Reactor**

事件循环 + 多路复用

**Thread Pool**

EventLoopGroup 管理一组 EventLoop

**Worker Thread**

每个 EventLoop 只属于一个线程

**Serial Thread Confinement**

Channel 绑定到特定线程，串行化执行

**Strategy**

SelectStrategy 决定 select 策略

## 四、使用示例

来看一个「窥视 EventLoop 内部」的完整示例，帮你深入理解：

`import io.netty.bootstrap.ServerBootstrap;   import io.netty.channel.*;   import io.netty.channel.nio.NioEventLoopGroup;   import io.netty.channel.socket.nio.NioServerSocketChannel;   import io.netty.channel.socket.nio.NioSocketChannel;   import io.netty.handler.logging.LoggingHandler;  public class EventLoopExample {       public static void main(String[] args) throws Exception {           // Boss 组：1 个线程就够了，只负责 accept           EventLoopGroup bossGroup = new NioEventLoopGroup(1);           // Worker 组：默认 CPU 核数 * 2           EventLoopGroup workerGroup = new NioEventLoopGroup();                   // 演示：看看 EventLoopGroup 里都有什么           System.out.println("=== EventLoopGroup 内部探秘 ===");                   // NioEventLoopGroup 实际上持有 EventLoop 数组           // 我们通过 next() 来取下一个           if (workerGroup instanceof NioEventLoopGroup) {               for (int i = 0; i < 4; i++) {                   EventLoop el = workerGroup.next();                   System.out.println("EventLoop #" + i + ": " + el +                        " [线程: " + Thread.currentThread().getName() + "]");               }           }           try {               ServerBootstrap b = new ServerBootstrap();               b.group(bossGroup, workerGroup)                .channel(NioServerSocketChannel.class)                .childHandler(new ChannelInitializer<NioSocketChannel>() {                    @Override                    protected void initChannel(NioSocketChannel ch) {                        ch.pipeline().addLast(new LoggingHandler());                        ch.pipeline().addLast(new SimpleChannelInboundHandler<String>() {                            @Override                            protected void channelRead0(ChannelHandlerContext ctx, String msg) {                                // 重点：这里的线程是谁？                                EventLoop eventLoop = ctx.channel().eventLoop();                                String threadName = Thread.currentThread().getName();                                                                System.out.println("收到消息的线程: " + threadName);                                System.out.println("所属 EventLoop: " + eventLoop);                                System.out.println("是否是 EventLoop 线程: " +                                        eventLoop.inEventLoop());                                                                // 跨线程提交任务会怎样？                                new Thread(() -> {                                    System.out.println("外部线程尝试提交任务...");                                    // 以下操作会触发 wakeup，打断 select 阻塞                                    ctx.channel().eventLoop().execute(() -> {                                        System.out.println("外部提交的任务在: " +                                                Thread.currentThread().getName());                                    });                                }).start();                                                                ctx.writeAndFlush("收到: " + msg);                            }                            @Override                            public void channelActive(ChannelHandlerContext ctx) {                                EventLoop eventLoop = ctx.channel().eventLoop();                                System.out.println("Channel [" + ctx.channel().id() +                                        "] 绑定到 EventLoop: " + eventLoop);                            }                        });                    }                });               ChannelFuture f = b.bind(8888).sync();               System.out.println("服务器启动，监听 8888 端口");               f.channel().closeFuture().sync();           } finally {               // 优雅关闭               bossGroup.shutdownGracefully();               workerGroup.shutdownGracefully();           }       }   }  `

使用 telnet 或 nc 测试：

`# 终端 1 启动后，终端 2   echo "Hello Netty" | nc localhost 8888   `

你会在服务端看到类似输出：

`=== EventLoopGroup 内部探秘 ===   EventLoop #0: io.netty.channel.nio.NioEventLoop@1a2b3c   EventLoop #1: io.netty.channel.nio.NioEventLoop@4d5e6f   EventLoop #2: io.netty.channel.nio.NioEventLoop@7a8b9c   EventLoop #3: io.netty.channel.nio.NioEventLoop@0a1b2c  Channel [d89f3a12] 绑定到 EventLoop: NioEventLoop@4d5e6f   收到消息的线程: nioEventLoopGroup-2-2   所属 EventLoop: NioEventLoop@4d5e6f   是否是 EventLoop 线程: true   外部线程尝试提交任务...   外部提交的任务在: nioEventLoopGroup-2-2  `

看到了吗？即使是外部线程提交的任务，**最后还是回到 EventLoop 的线程去执行**。这就是 Netty 的线程模型保证。

## 五、注意事项

### 5.1 不要阻塞 EventLoop 线程

这是最常见的坑，没有之一：

`// ❌ 错误做法：在 Handler 里做耗时操作   @Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {       // 这会阻塞 EventLoop 线程！       // 该线程上绑定的其他 Channel 全部遭殃       Thread.sleep(5000);         String result = queryDatabase();  // 数据库查询也慢       ctx.writeAndFlush(result);   }  // ✅ 正确做法：提交到业务线程池   @Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {       businessExecutor.execute(() -> {           String result = queryDatabase();           ctx.writeAndFlush(result);       });   }  `

### 5.2 NioEventLoopGroup 默认线程数的含义

很多人以为默认线程数 = CPU 核数，但其实：

*   **默认 = availableProcessors \* 2**
    
*   **IO 密集型场景**可以提高线程数（但线程多了切换成本也高）
    
*   **一个 EventLoop 可以同时服务几百上千个 Channel**
    

### 5.3 性能考量

*   **Selector 的 selectedKeys 优化**: Netty 自己实现了 `SelectedSelectionKeySet`，用数组代替 JDK 的 `HashSet`，消除了迭代时的 `next()` 和哈希计算开销
    
*   **JDK 空轮询 bug 自愈**: Java NIO 在 Linux 上有空轮询 bug，Netty 通过检测 `selectCnt` 并在超阈值后重建 Selector 来自愈
    
*   **wakeup 的过度调用**: `selector.wakeup()` 是系统调用，有开销，Netty 通过 `wakeup` 布尔变量做优化
    

### 5.4 关闭顺序

**必须先关闭 bossGroup，再关闭 workerGroup**：

`// 优雅停机的内部实现   // 1. 停止接受新连接   // 2. 处理完已注册 Channel 的剩余事件   // 3. 关闭所有 Channel   // 4. 关闭 Selector   // 5. 退出线程   bossGroup.shutdownGracefully();   workerGroup.shutdownGracefully();   `

### 5.5 适用场景

场景

建议

普通 TCP 服务

NioEventLoopGroup，默认线程数即可

需要大量长连接

调大 EventLoop 线程数（比如 8-16）

纯计算型

调小 EventLoop 线程数，留给业务线程

超高吞吐网关

考虑 EpollEventLoopGroup（Linux 下）

每个连接都需要独立线程

EventLoop 不适合你，考虑传统线程池

## 六、总结

EventLoopGroup 和 EventLoop 是 Netty 线程模型的骨架。记住这三句话：

1.  **EventLoop = 一个线程 + 一个 Selector + 一个任务队列**，在死循环中处理 IO 事件和执行任务
    
2.  **EventLoopGroup 像一个线程池工厂**，通过 chooser 算法把 Channel 均匀分配给各个 EventLoop
    
3.  **一个 Channel 一生只绑定一个 EventLoop**，保证了 Handler 执行的线程安全
    

下一期我们深挖 **ChannelPipeline 的事件传播机制**，看看数据从 Socket 上来之后，到底是怎么经过一个个 Handler 的。敬请期待！
