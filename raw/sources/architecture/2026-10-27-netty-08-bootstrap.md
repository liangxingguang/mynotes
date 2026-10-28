---
title: Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484034&idx=1&sn=ebceba0b6e18e5922fcb5d368e17f189&chksm=fe6ca3d8c91b2ace786da5c8cb08bb537c07d6d3282702448623a91791349432a60d692ecd23
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-netty-08-bootstrap.md
asset_ref: Assets/2026/10/netty-08-bootstrap.md
---
# Netty源码分析(8) — Bootstrap 与 ServerBootstrap 启动流程源码

## 一、背景与问题

前面几篇我们聊了 Channel、Pipeline、EventLoop 这些核心组件，但有个问题一直悬着：

**当你写下 `bootstrap.bind(8080)` 或 `bootstrap.connect("localhost", 8080)` 那行代码时，Netty 背后到底发生了什么事？**

有人觉得不就是 new 了几个对象嘛，bind 一个端口而已。但 Netty 的启动涉及到：

*   线程池初始化（多少个线程？什么时候启动？）
    
*   Channel 创建（反射还是工厂？）
    
*   Pipeline 组装（handler 什么时候加进去？）
    
*   端口绑定（底层 socket 怎么创建的？）
    
*   客户端连接（NIO connect 异步怎么变成同步的？）
    

Netty 提供了两个入口类：

类

用途

角色

`Bootstrap`

客户端/无连接协议

connect() 建立连接

`ServerBootstrap`

服务端

bind() 监听端口

今天我们就从源码层面，把这两者的启动流程彻底扒干净。

## 二、Bootstrap 客户端启动流程源码

### 2.1 最简用例

```
EventLoopGroup group = new NioEventLoopGroup();Bootstrap b = new Bootstrap();b.group(group) .channel(NioSocketChannel.class) .handler(new ChannelInitializer<SocketChannel>() {     @Override     protected void initChannel(SocketChannel ch) {         ch.pipeline().addLast(new StringDecoder());     } });ChannelFuture f = b.connect("127.0.0.1", 8080).sync();
```

看起来就这几行，但每一行背后的工作量都不小。我们从 `connect()` 入手。

### 2.2 connect() 入口

```
// Bootstrap.java — connect 方法public ChannelFuture connect(String inetHost, int inetPort) {    return connect(InetSocketAddress.createUnresolved(inetHost, inetPort));}public ChannelFuture connect(SocketAddress remoteAddress) {    // 参数校验    ObjectUtil.checkNotNull(remoteAddress, "remoteAddress");    // 核心：验证配置、创建 Channel、注册、发起连接    return doResolveAndConnect(remoteAddress, config.localAddress());}
```

这里的 `doResolveAndConnect` 才是真正的干活函数：

```
// Bootstrap.javaprivate ChannelFuture doResolveAndConnect(SocketAddress remoteAddress,                                         SocketAddress localAddress) {    // 第一步：初始化并注册 Channel（这个是最关键的）    ChannelFuture regFuture = initAndRegister();    final Channel channel = regFuture.channel();    // 如果注册已经完成，直接走连接逻辑    if (regFuture.isDone()) {        if (!regFuture.isSuccess()) {            return regFuture;        }        return doResolveAndConnect0(channel, remoteAddress, localAddress,                                   channel.newPromise());    }     // 否则等注册完成再连    else {        final PendingRegistrationPromise promise =            new PendingRegistrationPromise(channel);        regFuture.addListener((ChannelFutureListener) future -> {            Throwable cause = future.cause();            if (cause != null) {                promise.setFailure(cause);            } else {                promise.registered();                doResolveAndConnect0(channel, remoteAddress, localAddress, promise);            }        });        return promise;    }}
```

这段代码第一次看可能有点绕。核心逻辑是：

1.  **`initAndRegister()`** — 这是最关键的步骤，完成 Channel 的创建、初始化、注册
    
2.  **判断注册状态** — 如果注册是同步完成的（比如在调用线程是 EventLoop 线程时），直接连接；否则异步等
    
3.  **`doResolveAndConnect0()`** — 执行 DNS 解析 + 真正的 TCP 连接
    

### 2.3 initAndRegister()：核心三件套

这就是整个客户端启动的发动机：

```
// AbstractBootstrap.javafinal ChannelFuture initAndRegister() {    Channel channel = null;    try {        // === 1. 创建 Channel：通过反射调用 NioSocketChannel 的无参构造 ===        channel = channelFactory.newChannel();                // === 2. 初始化 Channel：设置 options、attrs，组装 Pipeline ===        init(channel);    } catch (Throwable t) {        ...    }    // === 3. 注册到 EventLoop：把 Channel 注册到 Selector 上 ===    ChannelFuture regFuture = config().group().register(channel);    if (regFuture.cause() != null) {        if (channel.isRegistered()) {            channel.close();        } else {            channel.unsafe().closeForcibly();        }    }    return regFuture;}
```

三步走：**创建 → 初始化 → 注册**。下面逐个拆解。

### 2.4 Channel 创建的反射机制

`channelFactory.newChannel()` 实际上就是调用了 `ReflectiveChannelFactory`：

```
// ReflectiveChannelFactory.javapublic class ReflectiveChannelFactory<C extends Channel>     implements ChannelFactory<C> {       private final Constructor<? extends C> constructor;    public ReflectiveChannelFactory(Class<? extends C> clazz) {        // 拿到无参构造器        this.constructor = clazz.getConstructor();    }    @Override    public C newChannel() {        // 反射创建        return constructor.newInstance();    }}
```

这里有个小细节：以 `NioSocketChannel` 为例，它的无参构造做了哪些事？

```
// NioSocketChannel.javapublic NioSocketChannel() {    // 调用父类，最终创建 Java NIO 的 SocketChannel    this(DEFAULT_SELECTOR_PROVIDER);}public NioSocketChannel(SelectorProvider provider) {    // 创建 JDK 原生 SocketChannel，并设置为非阻塞模式    this(newSocket(provider));}private static SocketChannel newSocket(SelectorProvider provider) {    try {        return provider.openSocketChannel();    } catch (IOException e) {        throw new ChannelException("Failed to open a socket.", e);    }}public NioSocketChannel(Channel parent, SocketChannel socket) {    super(parent, socket);    // 创建读取和写入的 buffer 配置    config = new NioSocketChannelConfig(this, socket.socket());}
```

一个 NIO Channel 的创建链条：`NioSocketChannel()` → `SelectorProvider.openSocketChannel()` → 拿到 JDK 的 `SocketChannel` → 存入 Netty 的 `AbstractNioByteChannel` 的 `ch` 字段。

### 2.5 Bootstrap.init()：组装 Pipeline

客户端和服务端的 init 逻辑不同。先看客户端的：

```
// Bootstrap.javavoid init(Channel channel) {    ChannelPipeline p = channel.pipeline();       // 设置 Channel 的 options 和 attrs    setChannelOptions(channel, options, logger);    setAttributes(channel, attrs);    // 获取用户配置的 handler    p.addLast(config.handler());}
```

逻辑非常简洁：

1.  拿到新创建的 Channel 的 Pipeline
    
2.  设置 socket 参数（`SO_KEEPALIVE`, `TCP_NODELAY` 等）
    
3.  **把用户指定的 handler 加到 Pipeline 末尾**
    

这里就是 `b.handler(new ChannelInitializer<...>() {...})` 中那个 handler 的添加位置。

### 2.6 Channel 注册到 EventLoop

注册是在 `MultithreadEventLoopGroup.register()` 里完成的：

```
// MultithreadEventLoopGroup.java@Overridepublic ChannelFuture register(Channel channel) {    // 从线程池中选择一个 EventLoop（轮询策略）    return next().register(channel);}
```

注册的主体是 `AbstractChannel.AbstractUnsafe.register()`：

```
// AbstractChannel.java — AbstractUnsafe.register()@Overridepublic final void register(EventLoop eventLoop,                              final ChannelPromise promise) {    // 各种校验...    AbstractChannel.this.eventLoop = eventLoop;    // 关键点：如果当前已经是 EventLoop 线程，直接执行    // 否则提交到 EventLoop 的任务队列异步执行    if (eventLoop.inEventLoop()) {        register0(promise);    } else {        try {            eventLoop.execute(new Runnable() {                @Override                public void run() {                    register0(promise);                }            });        } catch (Throwable t) {            ...        }    }}
```

这个 `eventLoop.inEventLoop()` 的判断非常关键。在启动阶段，当前线程不是 EventLoop 线程，所以会走 else 分支，**把注册任务提交到 EventLoop 的 taskQueue 中异步执行**。

然后 `register0()` 里最终会调用：

```
// AbstractNioChannel.java — doRegister()@Overrideprotected void doRegister() throws Exception {    boolean selected = false;    for (;;) {        try {            // 将 JDK 的 SocketChannel 注册到 Selector 上            // 注意这里 ops=0，意味着注册时不关注任何事件            // 事件关注是在后续的 bind() 或 connect() 中设置的            selectionKey = javaChannel().register(                eventLoop().unwrappedSelector(), 0, this);            return;        } catch (CancelledKeyException e) {            ...        }    }}
```

这里有个容易被忽略的点：注册时传的 **interestOps = 0**。这意味着刚注册完的 Channel 在 Selector 上什么都不关注，纯粹是为了把 Channel 和 Selector 绑定起来。后续在 connect() 或 bind() 中才会设置真正关心的事件。

### 2.7 发起 TCP 连接

回到 `doResolveAndConnect0()`：

```
// Bootstrap.javaprivate ChannelFuture doResolveAndConnect0(Channel channel,     SocketAddress remoteAddress, SocketAddress localAddress,     final ChannelPromise promise) {    try {        // DNS 解析（可能是异步的）        AddressResolver<SocketAddress> resolver = ...;        if (!resolver.isSupported(remoteAddress) ||             resolver.isResolved(remoteAddress)) {            // 不需要解析，直接连接            doConnect(remoteAddress, localAddress, promise);            return promise;        }               // 异步解析，解析完成后再连接        ...    }}private static void doConnect(    final SocketAddress remoteAddress,    final SocketAddress localAddress,    final ChannelPromise connectPromise) {       // 最终调用 Channel 的 connect 方法    channel.connect(remoteAddress, connectPromise);}
```

最终执行到 `NioSocketChannel.doConnect()`：

```
// NioSocketChannel.java@Overrideprotected boolean doConnect(SocketAddress remoteAddress,                             SocketAddress localAddress) throws Exception {    if (localAddress != null) {        // 绑定本地地址        javaChannel().bind(localAddress);    }    boolean success = false;    try {        // 发起 TCP 连接（NIO 非阻塞模式，立即返回）        boolean connected = javaChannel().connect(remoteAddress);        if (!connected) {            // 连接没有立即完成，需要关注 OP_CONNECT 事件            // 等 Selector 检测到连接完成            selectionKey().interestOps(SelectionKey.OP_CONNECT);        }        return connected;    } finally {        if (!success) {            doClose();        }    }}
```

**NIO 的关键特性**：`SocketChannel.connect()` 在非阻塞模式下会立即返回。如果返回 true 表示连接瞬间建立了，返回 false 表示连接正在建立。此时我们需要**关注 OP\_CONNECT 事件**，等待 Selector 告诉我们"连接已就绪"。

## 三、ServerBootstrap 服务端启动流程源码

### 3.1 最简用例

```
EventLoopGroup bossGroup = new NioEventLoopGroup(1);EventLoopGroup workerGroup = new NioEventLoopGroup();ServerBootstrap b = new ServerBootstrap();b.group(bossGroup, workerGroup) .channel(NioServerSocketChannel.class) .childHandler(new ChannelInitializer<SocketChannel>() {     @Override     protected void initChannel(SocketChannel ch) {         ch.pipeline().addLast(new StringDecoder());     } }) .option(ChannelOption.SO_BACKLOG, 128) .childOption(ChannelOption.SO_KEEPALIVE, true);ChannelFuture f = b.bind(8080).sync();
```

### 3.2 bind() 入口

```
// ServerBootstrap.javapublic ChannelFuture bind(int inetPort) {    return bind(new InetSocketAddress(inetPort));}public ChannelFuture bind(SocketAddress localAddress) {    // 参数校验    validate();    return doBind(ObjectUtil.checkNotNull(localAddress, "localAddress"));}
```

`doBind()` 是核心：

```
// AbstractBootstrap.javaprivate ChannelFuture doBind(final SocketAddress localAddress) {    // 同样是：创建 Channel + 初始化 + 注册    final ChannelFuture regFuture = initAndRegister();    final Channel channel = regFuture.channel();       if (regFuture.isDone()) {        if (!regFuture.isSuccess()) {            return regFuture;        }        // 注册完成，进行端口绑定        return doBind0(regFuture, channel, localAddress, channel.newPromise());    } else {        // 注册未完成，异步等待        final PendingRegistrationPromise promise =            new PendingRegistrationPromise(channel);        regFuture.addListener((ChannelFutureListener) future -> {            Throwable cause = future.cause();            if (cause != null) {                promise.setFailure(cause);            } else {                promise.registered();                doBind0(regFuture, channel, localAddress, promise);            }        });        return promise;    }}
```

和服务端一样，`initAndRegister()` 在前面已经分析过。但差别在 `init()` 方法。

### 3.3 ServerBootstrap.init()：双流水线体系

```
// ServerBootstrap.javavoid init(Channel channel) {    // 设置 options 和 attrs    setChannelOptions(channel, options, logger);    setAttributes(channel, attrs);    ChannelPipeline p = channel.pipeline();    // 关键：把用户配置的 childGroup 和 childHandler 存到 Channel 的 attr 里    final EventLoopGroup currentChildGroup = childGroup;    final ChannelHandler currentChildHandler = childHandler;    final Entry<ChannelOption<?>, Object>[] currentChildOptions;    final Entry<AttributeKey<?>, Object>[] currentChildAttrs;    synchronized (childOptions) {        currentChildOptions = childOptions.entrySet().toArray(...);    }    synchronized (childAttrs) {        currentChildAttrs = childAttrs.entrySet().toArray(...);    }    // 往 ServerSocketChannel 的 Pipeline 中加入一个特殊的 ChannelInitializer    p.addLast(new ChannelInitializer<Channel>() {        @Override        public void initChannel(final Channel ch) {            final ChannelPipeline pipeline = ch.pipeline();                       // 加入 boss handler（如果有配置的话）            ChannelHandler handler = config.handler();            if (handler != null) {                pipeline.addLast(handler);            }            // 重点！用异步任务添加 ServerBootstrapAcceptor            ch.eventLoop().execute(new Runnable() {                @Override                public void run() {                    pipeline.addLast(new ServerBootstrapAcceptor(                        currentChildGroup, currentChildHandler,                        currentChildOptions, currentChildAttrs));                }            });        }    });}
```

这个 `ServerBootstrapAcceptor` 是服务端启动的灵魂。等会儿单独说。

### 3.4 NioServerSocketChannel 的创建

```
// NioServerSocketChannel.javapublic NioServerSocketChannel() {    this(newSocket(DEFAULT_SELECTOR_PROVIDER));}private static ServerSocketChannel newSocket(SelectorProvider provider) {    try {        // 创建 JDK 原生 ServerSocketChannel        return provider.openServerSocketChannel();    } catch (IOException e) {        throw new ChannelException("Failed to open a server socket.", e);    }}public NioServerSocketChannel(ServerSocketChannel channel) {    // 注意 parent 传的是 null，因为 ServerSocketChannel 没有父 Channel    super(null, channel, SelectionKey.OP_ACCEPT);    config = new NioServerSocketChannelConfig(this, javaChannel().socket());}
```

注意这里的 `SelectionKey.OP_ACCEPT`，和客户端的 `ops=0` 不同，服务端 Channel 一开始就关注 ACCEPT 事件。

### 3.5 doBind0()：真正的端口绑定

```
// AbstractBootstrap.javaprivate static void doBind0(    final ChannelFuture regFuture, final Channel channel,    final SocketAddress localAddress, final ChannelPromise promise) {    // 注意：这个任务是在 EventLoop 线程中执行的    channel.eventLoop().execute(new Runnable() {        @Override        public void run() {            if (regFuture.isSuccess()) {                // 绑定端口                channel.bind(localAddress, promise).addListener(                    ChannelFutureListener.CLOSE_ON_FAILURE);            } else {                promise.setFailure(regFuture.cause());            }        }    });}
```

bind 最终调用 `NioServerSocketChannel.doBind()`：

```
// NioServerSocketChannel.java@Overrideprotected void doBind(SocketAddress localAddress) throws Exception {    // 如果 JDK 版本支持，打开 SO_REUSEADDR 防止端口重用问题    if (PlatformDependent.javaVersion() >= 7) {        javaChannel().bind(localAddress, config.getBacklog());    } else {        javaChannel().socket().bind(localAddress, config.getBacklog());    }}
```

这一行 `javaChannel().bind(localAddress, config.getBacklog())` 就是把 Java NIO 的 `ServerSocketChannel` 绑定到指定端口。**到这里，服务端才真正开始监听端口**。

绑定成功后，Netty 会触发 `channelActive` 事件：

```
// AbstractNioChannel.java@Overrideprotected void doBeginRead() throws Exception {    final SelectionKey selectionKey = this.selectionKey;    if (!selectionKey.isValid()) {        return;    }    readPending = true;       // 把 interestOps 设为 OP_ACCEPT    // 这样 Selector 才能接收到新的连接请求    final int interestOps = selectionKey.interestOps();    if ((interestOps & readInterestOp) == 0) {        selectionKey.interestOps(interestOps | readInterestOp);    }}
```

`readInterestOp` 就是构造时传入的 `SelectionKey.OP_ACCEPT`。

## 四、ServerBootstrapAcceptor：连接接受的秘密武器

`ServerBootstrapAcceptor` 是 `ServerBootstrap` 的一个内部类，它的职责很简单——**接受新连接并分配给 worker 线程池**。

```
// ServerBootstrap.java — ServerBootstrapAcceptorprivate static class ServerBootstrapAcceptor extends ChannelInboundHandlerAdapter {    private final EventLoopGroup childGroup;    private final ChannelHandler childHandler;    private final Entry<ChannelOption<?>, Object>[] childOptions;    private final Entry<AttributeKey<?>, Object>[] childAttrs;    private final Runnable enableAutoReadTask;    @Override    @SuppressWarnings("unchecked")    public void channelRead(ChannelHandlerContext ctx, Object msg) {        // 接受的新连接就是这里的 msg        final Channel child = (Channel) msg;        // 把 childHandler 加到新连接的 Pipeline 里        child.pipeline().addLast(childHandler);        // 设置 child options 和 attrs        setChannelOptions(child, childOptions, logger);        setAttributes(child, childAttrs);        try {            // 将新连接注册到 worker EventLoopGroup            childGroup.register(child).addListener(...);        } catch (Throwable t) {            forceClose(child, t);        }    }}
```

当 boss EventLoop 的 Selector 检测到 OP\_ACCEPT 事件时，会调用 `NioMessageUnsafe.read()`，最终在新连接到达时触发 pipeline 的 `channelRead` 事件。`ServerBootstrapAcceptor` 在这个事件里：

1.  **拿到新创建的 `NioSocketChannel`** — 这就是 `msg`
    
2.  **把用户的 childHandler 加到它的 Pipeline** — `channel.pipeline().addLast(childHandler)`
    
3.  **注册到 worker EventLoop** — `childGroup.register(child)`
    

至此，一条新的客户端连接就分配到了 worker 线程来处理。

## 五、完整启动流程图

```
┌─────────────────────────────────────────────────────────┐│                     启动流程总览                          │├─────────────────────────────────────────────────────────┤│                                                          ││  客户端 Bootstrap.connect()                              ││  ┌─────────────────────────────────────────┐            ││  │ 1. initAndRegister()                    │            ││  │    ├─ channelFactory.newChannel()       │            ││  │    │   └─ 反射创建 NioSocketChannel      │            ││  │    ├─ init(channel)                     │            ││  │    │   └─ pipeline.addLast(handler)     │            ││  │    └─ group().register(channel)         │            ││  │        └─ Selector 注册 (兴趣集=0)      │            ││  │                                         │            ││  │ 2. doConnect()                          │            ││  │    └─ javaChannel().connect(addr)       │            ││  │        └─ 设置 OP_CONNECT 事件          │            ││  └─────────────────────────────────────────┘            ││                                                          ││  服务端 ServerBootstrap.bind()                           ││  ┌─────────────────────────────────────────┐            ││  │ 1. initAndRegister()                    │            ││  │    ├─ NioServerSocketChannel(OP_ACCEPT) │            ││  │    ├─ init()                            │            ││  │    │   └─ 添加 ChannelInitializer       │            ││  │    │       └─ 异步添加 ServerBootstrapAcceptor │     ││  │    └─ register()                        │            ││  │                                         │            ││  │ 2. doBind0()                            │            ││  │    └─ javaChannel().bind(port,backlog)  │            ││  │        └─ 触发 channelActive            │            ││  │            └─ 设置 OP_ACCEPT 事件       │            ││  │                                         │            ││  │ 3. 新连接到达 → ServerBootstrapAcceptor │            ││  │    ├─ childHandler 添加到新连接 Pipeline│            ││  │    └─ childGroup.register(child)        │            ││  └─────────────────────────────────────────┘            │└─────────────────────────────────────────────────────────┘
```

## 六、使用示例：完整可运行的服务端+客户端

### 6.1 服务端

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.handler.codec.string.StringDecoder;import io.netty.handler.codec.string.StringEncoder;public class EchoServer {    public static void main(String[] args) throws Exception {        EventLoopGroup bossGroup = new NioEventLoopGroup(1);        EventLoopGroup workerGroup = new NioEventLoopGroup();        try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(NioServerSocketChannel.class)             .option(ChannelOption.SO_BACKLOG, 128)             .childOption(ChannelOption.SO_KEEPALIVE, true)             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ChannelPipeline p = ch.pipeline();                     p.addLast(new StringDecoder());                     p.addLast(new StringEncoder());                     p.addLast(new SimpleChannelInboundHandler<String>() {                         @Override                         protected void channelRead0(ChannelHandlerContext ctx,                                                    String msg) {                             System.out.println("收到: " + msg);                             ctx.writeAndFlush("服务端回显: " + msg);                         }                     });                 }             });            ChannelFuture f = b.bind(8080).sync();            System.out.println("服务端启动，监听 8080 端口");            f.channel().closeFuture().sync();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }}
```

### 6.2 客户端

```
import io.netty.bootstrap.Bootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioSocketChannel;import io.netty.handler.codec.string.StringDecoder;import io.netty.handler.codec.string.StringEncoder;public class EchoClient {    public static void main(String[] args) throws Exception {        EventLoopGroup group = new NioEventLoopGroup();        try {            Bootstrap b = new Bootstrap();            b.group(group)             .channel(NioSocketChannel.class)             .option(ChannelOption.TCP_NODELAY, true)             .handler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ChannelPipeline p = ch.pipeline();                     p.addLast(new StringDecoder());                     p.addLast(new StringEncoder());                     p.addLast(new SimpleChannelInboundHandler<String>() {                         @Override                         protected void channelRead0(ChannelHandlerContext ctx,                                                    String msg) {                             System.out.println("收到服务端: " + msg);                         }                         @Override                         public void channelActive(ChannelHandlerContext ctx) {                             ctx.writeAndFlush("你好，Netty！");                         }                     });                 }             });            ChannelFuture f = b.connect("127.0.0.1", 8080).sync();            System.out.println("客户端启动，连接 127.0.0.1:8080");            f.channel().closeFuture().sync();        } finally {            group.shutdownGracefully();        }    }}
```

## 七、注意事项与常见坑

### 7.1 不要在 bind() 前写 else 逻辑

```
// ❌ 错误：在 bind 完成前就操作 ChannelChannelFuture f = b.bind(8080);f.channel().writeAndFlush("Hello"); // 可能失败！还没 bind 完成// ✅ 正确：在 Listener 中异步操作b.bind(8080).addListener(future -> {    if (future.isSuccess()) {        future.channel().writeAndFlush("Hello");    }});
```

### 7.2 ServerBootstrap 的 handler 和 childHandler 的区别

很多人搞混这两个：

*   `handler()` — 添加到 **ServerSocketChannel** 的 Pipeline，处理 boss 的事件
    
*   `childHandler()` — 添加到\*\*每个新连接（SocketChannel）\*\*的 Pipeline，处理 worker 的事件
    

大多数场景只需要 `childHandler`。`handler` 很少用，除非你想在 boss 层面做些拦截。

### 7.3 bossGroup 的线程数

```
// 不推荐：默认线程数 = CPU 核数 * 2EventLoopGroup bossGroup = new NioEventLoopGroup(); // 推荐：bossGroup 只需要 1 个线程EventLoopGroup bossGroup = new NioEventLoopGroup(1);
```

boss Group 只负责 accept 新连接，一个线程完全够。默认用 `NettyRuntime.availableProcessors() * 2` 是在浪费。

### 7.4 Bootstrap 能否重用

```
Bootstrap b = new Bootstrap();b.group(group).channel(NioSocketChannel.class).handler(...);// ✅ 可以多次 connectChannelFuture f1 = b.connect("host1", 8080).sync();ChannelFuture f2 = b.connect("host2", 8080).sync(); // 同一 Bootstrap 实例
```

Bootstrap 是可重用的，但注意如果需要不同的 handler，需要重新设置。

### 7.5 doBind0 为什么用 EventLoop.execute() 异步执行？

这不是为了异步而异步。**bind 必须在 Channel 注册完成后才能执行**，因为注册事件是提交到 EventLoop 的任务队列的，所以后续所有操作也必须通过 EventLoop 执行，保证**线程安全**。

## 八、总结

阶段

Bootstrap

ServerBootstrap

Channel 类型

NioSocketChannel

NioServerSocketChannel

Channel 创建

反射调用无参构造

反射调用无参构造

注册到 Selector

interestOps = 0

OP\_ACCEPT

初始化

添加用户 handler

添加 ChannelInitializer + ServerBootstrapAcceptor

启动操作

connect

bind

事件关注

OP\_CONNECT → OP\_READ

OP\_ACCEPT

连接处理

自己处理

委托给 ServerBootstrapAcceptor → worker

本质上，Netty 的启动流程就是做了三件事：

1.  **创建 Channel** — 反射创建 NIO Channel，建立与 JDK NIO 的桥梁
    
2.  **初始化 Pipeline** — 把用户配置的 handler 组装进事件处理链
    
3.  **注册到 Selector** — 将 Channel 注册到 EventLoop 的 Selector，交给 Reactor 线程驱动
    

搞懂了这个流程，Netty 在你眼里就不再是一个黑盒了。下一篇我们来深入 `NioEventLoop.run()`，看看那个**永不停歇的 for 循环到底在干什么**。
