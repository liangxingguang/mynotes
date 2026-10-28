# Netty中的设计模式：23种经典模式的工程实践

> 来源：https://mp.weixin.qq.com/s/NppUlQruRzWXcpvtd1_c_w
> Netty源码分析（番外篇7）

前面30篇正篇加终章，我们沿着Netty的核心组件一路啃完了源码。从Reactor线程模型到ByteBuf内存管理，从Pipeline事件传播到RPC实战，相信大家已经对Netty有了相当深入的理解。

今天换个角度——**不谈组件，谈骨架**。Netty的代码之所以读起来舒服，一个重要原因是它在合适的地方用了合适的设计模式。读懂了这些模式，你会发现Netty的源码结构就像搭积木一样清晰。

> 这篇文章不是学术性的"设计模式讲解"，而是**源码视角的模式识别**——从一个Netty源码阅读者的角度，把散落在各处的模式串起来。

## 1. 模板方法模式 — Netty的骨架

这是Netty里使用频率最高、也是最重要的模式。

### 典型场景：`ChannelHandlerAdapter` 体系

```java
// io.netty.channel.ChannelHandlerAdapter
// 所有 handler 的基类，定义了生命周期的模板骨架
public class ChannelHandlerAdapter implements ChannelHandler {
    // 模板方法：提供默认实现，子类选择性覆盖
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
        // 默认空实现，子类可以覆盖
    }
    public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
        // 默认空实现
    }
    // 实际是模板方法的变体——isSharable() 决定实例策略
    public boolean isSharable() {
        Class<?> clazz = getClass();
        // 通过反射检查 @Sharable 注解
        // 决定这个 handler 能否被多个 pipeline 共享
        return clazz.isAnnotationPresent(Sharable.class);
    }
}
```

**为什么用模板方法？**

Netty把Handler生命周期定义成一整套骨架方法（`handlerAdded` / `channelRegistered` / `channelActive` / `channelRead` / `exceptionCaught` 等等），用户只需要覆盖自己关心的。这比JDK原生的NIO回调优雅太多了——原生NIO你必须在同一个 `read()` 循环里处理所有逻辑，而Netty通过模板方法把关注点完美分离。

### 另一个经典：`SimpleChannelInboundHandler`

```java
// io.netty.channel.SimpleChannelInboundHandler
public abstract class SimpleChannelInboundHandler<I> extends ChannelInboundHandlerAdapter {
    // 模板方法定义算法骨架
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        boolean release = true;
        try {
            // 步骤1：类型匹配
            if (acceptInboundMessage(msg)) {
                @SuppressWarnings("unchecked")
                I imsg = (I) msg;
                // 步骤2：调用子类的具体处理逻辑
                channelRead0(ctx, imsg);
            } else {
                release = false;
                // 步骤3：传给下一个 handler
                ctx.fireChannelRead(msg);
            }
        } finally {
            // 步骤4：自动释放 ByteBuf，防止内存泄漏
            if (autoRelease && release) {
                ReferenceCountUtil.release(msg);
            }
        }
    }
    // 子类只需要实现这个
    protected abstract void channelRead0(ChannelHandlerContext ctx, I msg) throws Exception;
}
```

这个设计太聪明了。`channelRead` 帮你做了三件事：**类型匹配 → 自动释放ByteBuf → 透传不匹配的消息**。用户只需要写 `channelRead0`，完全不用操心内存管理。这就是模板方法最经典的应用。

## 2. 责任链模式 — Pipeline的本质

```java
// io.netty.channel.DefaultChannelPipeline
public class DefaultChannelPipeline implements ChannelPipeline {
    // 双向链表，头尾哨兵节点
    final AbstractChannelHandlerContext head; // HeadContext
    final AbstractChannelHandlerContext tail; // TailContext

    // 构造时初始化哨兵
    protected DefaultChannelPipeline(Channel channel) {
        this.channel = channel;
        tail = new TailContext(this);   // 尾部哨兵
        head = new HeadContext(this);   // 头部哨兵
        head.next = tail;
        tail.prev = head;
    }
}
```

**责任链在Netty中的特点：**

- **双向链表**：入站事件从头到尾，出站事件从尾到头
- **拦截器模式**：每个节点可以选择处理/修改事件，或者透传给下一个
- **动态增删**：运行时可以动态增删 handler，比如握手完成后删除 `SslHandler`

印象最深的是责任的"选择权"——handler 完全可以自己决定是否把事件往后传。比如 `SslHandler` 在握手完成前会拦截所有消息，握手完成后才会发给业务 handler。

## 3. 工厂方法模式 — ReflectiveChannelFactory

```java
// io.netty.channel.ReflectiveChannelFactory
// 通过反射创建 Channel 实例的工厂
public class ReflectiveChannelFactory<T extends Channel> implements ChannelFactory<T> {
    private final Constructor<? extends T> constructor;

    public ReflectiveChannelFactory(Class<? extends T> clazz) {
        // 提前缓存构造器，避免每次创建都反射查找
        this.constructor = clazz.getConstructor();
    }

    @Override
    public T newChannel() {
        try {
            // 每次调用创建新实例
            return constructor.newInstance();
        } catch (Throwable t) {
            throw new ChannelException("Unable to create Channel", t);
        }
    }
}
```

这个模式用在了 `Bootstrap` 和 `ServerBootstrap` 的 `channel(NioServerSocketChannel.class)` 方法里。Netty为什么用反射创建Channel而不是直接 `new`？

**解耦和灵活性**。`Bootstrap` 不依赖具体的 `NioServerSocketChannel` 类，用户可以通过指定不同的 Channel 类轻松切换到 `Epoll` 模式或其他 Transport 实现。

## 4. 观察者模式 — ChannelFuture 与 Promise

```java
// io.netty.channel.ChannelFuture
public interface ChannelFuture extends Future<Void> {
    Channel channel();
    // 添加监听器（观察者注册）
    ChannelFuture addListener(GenericFutureListener<? extends Future<? super Void>> listener);
    ChannelFuture addListeners(GenericFutureListener... listeners);
    ChannelFuture removeListener(GenericFutureListener<? extends Future<? super Void>> listener);
}

// io.netty.util.concurrent.DefaultPromise
// Promise 既是 Future（结果载体）也是观察者模式的 Subject
public class DefaultPromise<V> extends AbstractFuture<V> implements Promise<V> {
    // 监听器列表，延迟初始化
    private Object listeners; // 可能是单个监听器或数组

    @Override
    public Promise<V> addListener(GenericFutureListener<? extends Future<? super V>> listener) {
        // 典型的观察者注册逻辑
        synchronized (this) {
            addListener0(listener);
        }
        // 如果已经完成了，立即通知（防止错过）
        if (isDone()) {
            notifyListeners();
        }
        return this;
    }

    private void notifyListeners() {
        // 遍历所有监听器，逐一回调 operationComplete()
        EventExecutor executor = executor();
        if (executor.inEventLoop()) {
            notifyListenersNow();
        } else {
            // 确保在正确的线程里通知
            executor.execute(this::notifyListenersNow);
        }
    }
}
```

**Netty的异步本质决定了这个模式的重要性。** 所有IO操作都是异步的，返回 `ChannelFuture`，你不可能立马拿到结果。只能通过添加Listener的方式（观察者模式）来等待异步结果。

## 5. 命令模式 — Runnable 作为命令封装

Netty大量使用了 `Runnable` 作为命令封装，尤其是在任务队列中：

```java
// io.netty.util.concurrent.SingleThreadEventExecutor
public abstract class SingleThreadEventExecutor extends AbstractScheduledEventExecutor {
    // 任务队列——存储待执行的命令
    private final Queue<Runnable> taskQueue;

    // 提交命令到队列
    protected void addTask(Runnable task) {
        if (task == null) throw new NullPointerException("task");
        if (!offerTask(task)) {
            reject(task);
        }
    }

    // 执行所有已提交的命令
    protected boolean runAllTasks(long timeoutNanos) {
        // 从队列中取出并执行 Runnable（命令模式）
        fetchFromScheduledTaskQueue();
        Runnable task = pollTask();
        if (task == null) return false;

        for (;;) {
            safeExecute(task);  // 执行命令
            task = pollTask();
            if (task == null || timeoutNanos <= 0) {
                return true;
            }
        }
    }
}
```

**典型应用场景：**

- `channel.writeAndFlush(msg)` 最终封装成 `WriteTask` 扔到 EventLoop 的任务队列
- 定时任务封装成 `ScheduledFutureTask`
- `ctx.executor().execute(() -> { ... })` 用户自定义任务

这就是为什么 `NioEventLoop` 既是IO线程又是任务执行器——它用命令模式统一了IO事件和普通任务的执行。

## 6. 装饰器模式 — WrappedByteBuf

ByteBuf 体系是装饰器模式的教科书级应用：

```java
// io.netty.buffer.WrappedByteBuf
// 装饰器基类，包装一个底层 ByteBuf
class WrappedByteBuf extends ByteBuf {
    protected final ByteBuf buf; // 被装饰的对象

    protected WrappedByteBuf(ByteBuf buf) {
        if (buf == null) throw new NullPointerException("buf");
        this.buf = buf;
    }

    @Override
    public int readableBytes() {
        return buf.readableBytes(); // 委托给被装饰对象
    }
    // ... 所有方法都委托给 buf，
    // 子类可以选择性地覆盖特定方法来实现增强
}
```

具体装饰器：

- `SimpleLeakAwareByteBuf` — 添加内存泄漏检测
- `AdvancedLeakAwareByteBuf` — 更详细的泄漏追踪
- `DuplicatedByteBuf` — 共享同一块内存的视图
- `SwappedByteBuf` — 字节序转换

这个设计的好处是**正交的职责分离**。泄漏检测、字节序转换、内存视图等是独立的功能维度，通过装饰器组合可以实现任意排列组合，而不是用继承搞出一棵爆炸的类树。

## 7. 单例模式 — MqttEncoder 等 @Sharable Handler

```java
@ChannelHandler.Sharable
public final class MqttEncoder extends MessageToMessageEncoder<MqttMessage> {
    // 单例——因为是无状态的，可以安全共享
    public static final MqttEncoder INSTANCE = new MqttEncoder();

    private MqttEncoder() {
        // 私有构造，强制使用单例
    }

    @Override
    protected void encode(ChannelHandlerContext ctx, MqttMessage msg, List<Object> out) {
        // 纯计算逻辑，没有成员状态
        out.add(doEncode(ctx.alloc(), msg));
    }
}
```

Netty对单例的运用非常克制——**只有完全无状态的 Handler 才标记为 `@Sharable` 并做成单例**。如果你自己写的Handler有状态变量，千万不要加这个注解然后共享给多个Channel，否则会出现诡异的并发问题。

## 8. 适配器模式 — ChannelInboundHandlerAdapter vs ChannelHandler

```java
// io.netty.channel.ChannelHandler 接口定义了所有生命周期方法
public interface ChannelHandler {
    void handlerAdded(ChannelHandlerContext ctx) throws Exception;
    void handlerRemoved(ChannelHandlerContext ctx) throws Exception;
    void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception;
}

// io.netty.channel.ChannelInboundHandler 扩展了更多方法
public interface ChannelInboundHandler extends ChannelHandler {
    void channelRegistered(ChannelHandlerContext ctx);
    void channelUnregistered(ChannelHandlerContext ctx);
    void channelActive(ChannelHandlerContext ctx);
    void channelInactive(ChannelHandlerContext ctx);
    void channelRead(ChannelHandlerContext ctx, Object msg);
    void channelReadComplete(ChannelHandlerContext ctx);
    void userEventTriggered(ChannelHandlerContext ctx, Object evt);
    void channelWritabilityChanged(ChannelHandlerContext ctx);
}

// 适配器：将接口中的所有方法提供空实现
public class ChannelInboundHandlerAdapter
        extends ChannelHandlerAdapter
        implements ChannelInboundHandler {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        ctx.fireChannelRead(msg); // 默认透传
    }
    // 其他方法都是类似：要么空实现，要么透传给下一个 handler
}
```

这就是经典的**适配器模式**——用户只需要继承 `ChannelInboundHandlerAdapter` 并覆盖自己关心的一两个方法，不用实现接口的全部方法。否则每次写handler都要实现十几个空方法，想想就窒息。

## 9. 策略模式 — EventExecutorChooser 的两种选择策略

```java
// io.netty.util.concurrent.MultithreadEventExecutorGroup
// 选择合适的 EventExecutorChooser 策略
protected EventExecutorChooserFactory.EventExecutorChooser newChooser(
        EventExecutor[] executors) {
    if (isPowerOfTwo(executors.length)) {
        // 策略A：2的幂次，用位运算 —— O(1)，极快
        return new PowerOfTwoEventExecutorChooser(executors);
    } else {
        // 策略B：非2的幂次，用取模运算 —— O(1)，但除法比位运算慢
        return new GenericEventExecutorChooser(executors);
    }
}

// 策略A实现
private static final class PowerOfTwoEventExecutorChooser
        implements EventExecutorChooser {
    private final AtomicInteger idx = new AtomicInteger();
    private final EventExecutor[] executors;

    @Override
    public EventExecutor next() {
        // idx & (length - 1) 等价于 idx % length，但快得多
        return executors[idx.getAndIncrement() & executors.length - 1];
    }
}

// 策略B实现
private static final class GenericEventExecutorChooser
        implements EventExecutorChooser {
    private final AtomicInteger idx = new AtomicInteger();
    private final EventExecutor[] executors;

    @Override
    public EventExecutor next() {
        // 标准的取模方式，Math.abs 防止负数
        return executors[Math.abs(idx.getAndIncrement() % executors.length)];
    }
}
```

这是个非常好的优化案例。Netty的 `NioEventLoopGroup` 默认是CPU核数×2，而16、32这样的2的幂次太常见了。**花费一个 `isPowerOfTwo` 判断，换来整条链路上每次分发都少一次取模运算**，在高并发下累积的收益非常可观。

## 10. 建造者模式 — Bootstrap / ServerBootstrap

```java
// io.netty.bootstrap.ServerBootstrap
ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)           // 设置线程组
 .channel(NioServerSocketChannel.class)    // 设置Channel类型
 .option(ChannelOption.SO_BACKLOG, 128)    // 设置选项
 .childOption(ChannelOption.SO_KEEPALIVE, true)
 .childHandler(new ChannelInitializer<SocketChannel>() {  // 设置handler
     @Override
     protected void initChannel(SocketChannel ch) {
         ch.pipeline().addLast(new MyHandler());
     }
 });
ChannelFuture f = b.bind(8080).sync(); // 构建完成，绑定端口
```

这是建造者模式的典型应用。Bootstrap有大量配置参数，如果都用构造器传参会非常痛苦。通过Fluent API（链式调用），代码读起来像是自然语言的声明。

Netty把服务端和客户端的Bootstrap分开（`ServerBootstrap` vs `Bootstrap`）是一个非常好的设计——它们的配置维度不同，分开避免了"万能配置类"的问题。

## 设计模式全景图

| 设计模式 | 在Netty中的位置 | 核心价值 |
|---|---|---|
| **模板方法** | ChannelHandlerAdapter, SimpleChannelInboundHandler | 定义骨架算法，子类填充细节 |
| **责任链** | ChannelPipeline, ChannelHandlerContext | 解耦事件处理，动态编排 |
| **工厂方法** | ReflectiveChannelFactory, ChannelFactory | 封装对象创建，支持多实现 |
| **观察者** | ChannelFuture, GenericFutureListener | 异步结果通知 |
| **命令模式** | Runnable任务队列, AbstractTask | 统一IO和普通任务调度 |
| **装饰器** | WrappedByteBuf系列 | 正交维度的功能增强 |
| **单例** | @Sharable Handler (MqttEncoder等) | 无状态对象复用 |
| **适配器** | ChannelInboundHandlerAdapter | 接口简约化，降低实现成本 |
| **策略** | EventExecutorChooser | 运行时选择最优算法 |
| **建造者** | Bootstrap, ServerBootstrap | 复杂对象构造DSL |
| **代理模式** | DefaultChannelPipeline (代理HeadContext) | 隐藏底层IO细节 |
| **组合模式** | CompositeByteBuf | 多个ByteBuf的逻辑聚合 |
| **状态模式** | SslHandler的握手状态机 | 协议状态管理 |
| **享元模式** | PooledByteBuf (池化复用) | 减少对象创建开销 |
| **迭代器** | CompositeByteBuf的内部迭代 | 统一遍历接口 |
| **中介者** | DefaultChannelPipeline (协调各handler) | 降低组件间耦合 |

## 总结

**Netty的设计哲学是"该抽象的地方大胆抽象，该优化的地方极致优化"。**

设计模式在Netty里不是刻意的炫技，而是解决实际问题的自然结果：

- 要解耦请求处理 → **责任链**
- 要管理异步结果 → **观察者**
- 要支持多种Transport → **工厂方法**
- 要复用无状态Handler → **单例**
- 要统一任务调度 → **命令模式**

读Netty源码最大的收获之一，就是看Trustin Lee（Netty创始人）怎么在实际工程中运用这些经典模式。它们不是教科书上的刻板图示，而是**活的、有温度的设计决策**。

> 设计模式真正的作用不是让你套用，而是帮你识别问题、选择合适的解。Netty的源码就是最好的教材。

*这是Netty源码分析系列的番外篇第7篇。30篇正篇 + 终章 + 7个番外。*
