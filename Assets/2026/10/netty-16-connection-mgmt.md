# Netty源码分析(16) — 连接管理：connect、bind、close 背后的故事

朋友，你有没有想过一个问题——当我们写 `bootstrap.bind(8080)` 或者 `bootstrap.connect("127.0.0.1", 8080)` 的时候，Netty 背后到底经历了怎样的旅程？

今天咱们就来扒一扒 Netty 连接管理这块源码，把 `connect`、`bind`、`close` 这三条线从头到尾捋清楚。

先上个宏观图，让心里有个底：

## 1\. 背景与问题

在 Java 原生 NIO 里搞一个网络连接，你需要：

```
// 服务端：ServerSocketChannel.open() -> bind -> accept -> SocketChannelServerSocketChannel ssc = ServerSocketChannel.open();ssc.configureBlocking(false);ssc.bind(new InetSocketAddress(8080));Selector selector = Selector.open();ssc.register(selector, SelectionKey.OP_ACCEPT);// 客户端：SocketChannel.open() -> connect -> finishConnectSocketChannel sc = SocketChannel.open();sc.configureBlocking(false);sc.connect(new InetSocketAddress("127.0.0.1", 8080));// 然后要轮询 selector 等 finishConnect 返回 true
```

这种写法有几个硬伤：

1.  **非阻塞 connect 要轮询** — 调完 `connect` 还得反复查 `finishConnect`
    
2.  **bind/accept 流程松散** — 各个步骤全是手动拼的，少一步就崩
    
3.  **关闭链路复杂** — 关闭 channel、取消 selectionKey、处理半包、释放资源，坑巨多
    
4.  **没有超时、重试等高级语义** — 这些全要自己手写
    

Netty 把这些零零碎碎的东西全封装到 `connect`、`bind`、`close` 三个方法里了。那到底封装的有多彻底？来看源码。

## 2\. 核心源码分析

### 2.1 connect：客户端发起到服务端的连接

调用入口在 `Bootstrap`，一路追踪下去：

```
// Bootstrap.javapublic ChannelFuture connect(String inetHost, int inetPort) {    return connect(InetSocketAddress.createUnresolved(inetHost, inetPort));}public ChannelFuture connect(SocketAddress remoteAddress) {    // 校验，然后调用 doResolveAndConnect    ObjectUtil.checkNotNull(remoteAddress, "remoteAddress");    validate();    return doResolveAndConnect(remoteAddress, config.localAddress());}
```

`doResolveAndConnect` 是核心：

```
// Bootstrap.javaprivate ChannelFuture doResolveAndConnect(final SocketAddress remoteAddress,                                          final SocketAddress localAddress) {    // 1. 初始化 Channel（反射创建 + 注册到 EventLoop）    ChannelFuture regFuture = initAndRegister();    final Channel channel = regFuture.channel();    if (regFuture.isDone()) {        if (!regFuture.isSuccess()) {            return regFuture;        }        // 注册完成，直接开始连接        return doResolveAndConnect0(channel, remoteAddress, localAddress, channel.newPromise());    } else {        // 注册还没完成（异步），等注册完再连接        final PendingRegistrationPromise promise = new PendingRegistrationPromise(channel);        regFuture.addListener((ChannelFutureListener) future -> {            Throwable cause = future.cause();            if (cause != null) {                promise.setFailure(cause);            } else {                promise.registered();                doResolveAndConnect0(channel, remoteAddress, localAddress, promise);            }        });        return promise;    }}
```

然后 `doResolveAndConnect0` 先做 DNS 解析（异步的），解析完了调用 `doConnect`：

```
// Bootstrap.javaprivate static void doConnect(        final SocketAddress remoteAddress, final SocketAddress localAddress,        final Channel channel, final ChannelPromise connectPromise) {    // 这行才是真正发起连接的代码    channel.eventLoop().execute(() -> {        if (localAddress == null) {            channel.connect(remoteAddress, connectPromise);        } else {            channel.connect(remoteAddress, localAddress, connectPromise);        }        // 设置连接超时        connectPromise.addListener(ChannelFutureListener.CLOSE_ON_FAILURE);    });}
```

注意这里 `channel.connect()` 最终会走到 `AbstractChannel.AbstractUnsafe.connect()`。

**核心来了，AbstractUnsafe.connect()：**

```
// AbstractChannel.java — AbstractUnsafepublic final void connect(        final SocketAddress remoteAddress,        final SocketAddress localAddress, final ChannelPromise promise) {    // 检查是否已经关闭    if (!promise.setUncancellable() || !ensureOpen(promise)) {        return;    }    try {        // 如果之前处于 Active 状态，现在是重新连接        if (connectPromise != null) {            throw new ConnectionPendingException();        }        boolean wasActive = isActive();        // ★★★ 这行调用了 NioSocketChannel.doConnect() ★★★        if (doConnect(remoteAddress, localAddress)) {            // 连接立即完成（连本地的场景）            fulfillConnectPromise(promise, wasActive);        } else {            // 连接尚未完成，需要注册 OP_CONNECT 等 finishConnect            connectPromise = promise;            requestedRemoteAddress = remoteAddress;                       // 算超时时间            int connectTimeoutMillis = config().getConnectTimeoutMillis();            if (connectTimeoutMillis > 0) {                connectTimeoutFuture = eventLoop().schedule(() -> {                    // 超时了，fail 这个 promise                    ChannelPromise connectPromise = this.connectPromise;                    if (connectPromise != null                             && !connectPromise.isDone()                            && connectPromise.tryFailure(                                    new ConnectTimeoutException(                                            "connection timed out: " + remoteAddress))) {                        close(voidPromise());                    }                }, connectTimeoutMillis, TimeUnit.MILLISECONDS);            }            // ★★★ 注册 OP_CONNECT 事件，等着 selector 通知 ★★★            promise.addListener((ChannelFutureListener) future -> {                if (future.isCancelled()) {                    if (connectTimeoutFuture != null) {                        connectTimeoutFuture.cancel(false);                    }                    connectPromise = null;                    close(voidPromise());                }            });        }    } catch (Throwable t) {        promise.tryFailure(annotateConnectException(t, remoteAddress));        closeIfClosed();    }}
```

再看底层 `NioSocketChannel.doConnect()`：

```
// NioSocketChannel.javaprotected boolean doConnect(SocketAddress remoteAddress, SocketAddress localAddress) throws Exception {    if (localAddress != null) {        // 先绑定本地地址        javaChannel().socket().bind(localAddress);    }    boolean success = false;    try {        // ★★★ JDK 原生 SocketChannel.connect() ★★★        boolean connected = javaChannel().connect(remoteAddress);        if (!connected) {            // 没连上（非阻塞模式肯定经常连不上）            // 注册 OP_CONNECT，等 selector 回调            selectionKey().interestOps(SelectionKey.OP_CONNECT);        }        success = true;        return connected;    } finally {        if (!success) {            doClose();        }    }}
```

总结一下 connect 的完整链路：

```
Bootstrap.connect()  → doResolveAndConnect() → initAndRegister() → 创建Channel + 注册EventLoop  → doResolveAndConnect0() → 解析地址 → doConnect()  → AbstractUnsafe.connect()    → NioSocketChannel.doConnect() → javaChannel().connect()    → 没连上？注册 OP_CONNECT  → 等 selector 通知 → NioEventLoop 处理 OP_CONNECT  → NioSocketChannel.finishConnect() → 调用 AbstractUnsafe.finishConnect()  → fulfillConnectPromise() → 通知 pipeline.fireChannelActive()
```

### 2.2 bind：服务端绑定端口

`ServerBootstrap.bind(port)` 的调用链相对短一些：

```
// AbstractBootstrap.javapublic ChannelFuture bind(int inetPort) {    return bind(new InetSocketAddress(inetPort));}public ChannelFuture bind(SocketAddress localAddress) {    validate();    SocketAddress localAddr = localAddress;    return doBind(localAddr);}private ChannelFuture doBind(final SocketAddress localAddress) {    // 同样先 initAndRegister（创建 ServerSocketChannel 注册到 EventLoop）    final ChannelFuture regFuture = initAndRegister();    final Channel channel = regFuture.channel();       if (regFuture.isDone()) {        if (!regFuture.isSuccess()) {            return regFuture;        }        return doBind0(regFuture, channel, localAddress, channel.newPromise());    } else {        // 异步等注册完成        final PendingRegistrationPromise promise = new PendingRegistrationPromise(channel);        regFuture.addListener((ChannelFutureListener) future -> {            Throwable cause = future.cause();            if (cause != null) {                promise.setFailure(cause);            } else {                promise.registered();                doBind0(regFuture, channel, localAddress, promise);            }        });        return promise;    }}
```

`doBind0` 核心：

```
// AbstractBootstrap.javaprivate static void doBind0(        final ChannelFuture regFuture, final Channel channel,        final SocketAddress localAddress, final ChannelPromise promise) {    channel.eventLoop().execute(() -> {        if (regFuture.isSuccess()) {            // ★★★ 这行触发 bind ★★★            channel.bind(localAddress, promise).addListener(ChannelFutureListener.CLOSE_ON_FAILURE);        } else {            promise.setFailure(regFuture.cause());        }    });}
```

一路追踪到 `AbstractUnsafe.bind()`：

```
// AbstractChannel.java — AbstractUnsafepublic final void bind(final SocketAddress localAddress, final ChannelPromise promise) {    assert eventLoop().inEventLoop();       if (!promise.setUncancellable() || !ensureOpen(promise)) {        return;    }    boolean wasActive = isActive();    try {        // ★★★ 调用子类 NioServerSocketChannel.doBind() ★★★        doBind(localAddress);    } catch (Throwable t) {        safeSetFailure(promise, t);        closeIfClosed();        return;    }    // bind 成功后，channel 变成 active 状态    if (!wasActive && isActive()) {        invokeLater(() -> {            // ★★★ 触发 pipeline 的 ChannelActive 事件 ★★★            // 在这里面会注册 OP_ACCEPT            pipeline.fireChannelActive();        });    }    safeSetSuccess(promise);}
```

服务端 `NioServerSocketChannel.doBind()`：

```
// NioServerSocketChannel.javaprotected void doBind(SocketAddress localAddress) throws Exception {    if (PlatformDependent.javaVersion() >= 7) {        // JDK 7+ 用这个方法        javaChannel().bind(localAddress, config.getBacklog());    } else {        javaChannel().socket().bind(localAddress, config.getBacklog());    }}
```

这里 `config.getBacklog()` 就是 `ServerBootstrap.option(ChannelOption.SO_BACKLOG, 128)` 设置的那个值，TCP 全连接队列的长度。

`pipeline.fireChannelActive()` 触发后，`ServerBootstrapAcceptor` 会注册 `OP_ACCEPT` 事件，这样 selector 开始监听连接接入。

```
ServerBootstrap.bind(8080)  → doBind() → initAndRegister() → 创建 ServerSocketChannel + 注册 EventLoop  → doBind0() → channel.bind() → AbstractUnsafe.bind()    → NioServerSocketChannel.doBind() → javaChannel().bind()    → 状态变 active → pipeline.fireChannelActive()    → ServerBootstrapAcceptor 注册 OP_ACCEPT
```

### 2.3 close：优雅关闭连接

连接建立难，关闭更难。Netty 的 `close` 做了大量工作来保证优雅关闭：

```
// AbstractChannel.java — AbstractUnsafepublic final void close(final ChannelPromise promise) {    close(promise, CLOSE_CLOSED_CHANNEL_EXCEPTION, CLOSE_CLOSED_CHANNEL_EXCEPTION, false);}private void close(final ChannelPromise promise, final Throwable cause,                    final Throwable closedCause, final boolean closeForce) {    if (closeInitiated) {        // 防止重复关闭        if (closeForce) {            doCloseForce();        }        return;    }    closeInitiated = true;       // 是否还有数据没发完，需要等一等？    final boolean wasActive = isActive();    final ChannelOutboundBuffer outboundBuffer = this.outboundBuffer;       // ★★★ 步骤1：关闭 outboundBuffer，不再接受新写入 ★★★    // 对里面积压的数据，通过 failFlushed 或 close 处理    if (outboundBuffer != null) {        outboundBuffer.failFlushed(cause, false);        // 这个方法会关闭 buffer 并通知所有 pending write 的 promises    }    // ★★★ 步骤2：把最终的 close 操作交给 EventLoop 来执行 ★★★    doClose0(promise);}private void doClose0(ChannelPromise promise) {    try {        // ★★★ 步骤3：调用子类的 doClose() ★★★        doClose();               // ★★★ 步骤4：取消所有 SelectionKey ★★★        // （非常重要，否则 selector 会一直收到事件）        deregister();               closeOutboundBuffer();               // ★★★ 步骤5：如果之前是 active 的，触发 ChannelInactive 事件 ★★★        if (wasActive && !isActive()) {            invokeLater(() -> {                pipeline.fireChannelInactive();                // 顺便触发 unregistered                pipeline.fireChannelUnregistered();            });        }               // ★★★ 步骤6：清理各类资源 ★★★        failsafeCloseExecutorCleanup();        cleanupCloseThreadFuture();        closePromise.setSuccess();  // 这行通知所有等在 closeFuture 上的监听器    } catch (Throwable t) {        closePromise.tryFailure(t);    }}
```

`NioSocketChannel.doClose()`：

```
// NioSocketChannel.javaprotected void doClose() throws Exception {    super.doClose(); // 调用 AbstractNioChannel.doClose()    // 这一行直接关掉了 JDK 的 SocketChannel    javaChannel().close();}// AbstractNioChannel.doClose()protected void doClose() throws Exception {    // 取消 SelectionKey，这样 selector 不再关心这个 channel    SelectionKey key = selectionKey();    if (key != null) {        key.cancel();    }}
```

关键点：`deregister()` 会从 selector 上移除这个 channel，`javaChannel().close()` 真正关闭 JDK 层面的 socket。这两步做完，才算彻底关干净。

## 3\. 原理分析

### 3.1 连接建立的全生命周期

看完整条链路，我画了个流程：

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐│  Bootstrap   │────>│ initAndRegister() │────>│   doConnect()     ││  .connect()  │     │ 创建 NioSocketCh. │     │  javaChannel().   ││              │     │  注册 EventLoop   │     │  connect(addr)    │└──────────────┘     └──────────────────┘     └────────┬──────────┘                                                       │                                             ┌─────────▼──────────┐                                             │ 连接立即完成了吗？    │                                             └──────┬──────────────┘                                              ┌──┴──┐                                             │     │                                             ▼     ▼                                       ┌────────┐  ┌──────────────┐                                       │立即完成  │  │注册 OP_     │                                       │        │  │CONNECT      │                                       └────────┘  └──────┬───────┘                                                              │                                             ┌─────────▼────────┐                                             │NioEventLoop 轮询 │                                             │选择器，OP_CONNECT │                                             │事件到达          │                                             └─────────┬────────┘                                                       │                                             ┌─────────▼────────┐                                             │finishConnect()   │                                             │→ fulfillConnect  │                                             │  Promise()       │                                             │→ fireChannel     │                                             │  Active()        │                                             └──────────────────┘
```

### 3.2 设计模式：异步 + Promise-Future

Netty 的连接管理最大的设计特点就是**全程异步**。

`bootstrap.connect()` 返回的是一个 `ChannelFuture`，它不等于"连接已经建立"，而是"连接正在建立，你可以在上面加监听器等结果"。

```
ChannelFuture future = bootstrap.connect("127.0.0.1", 8080);// 别在这调 future.sync() 阻塞，除非你真的想阻塞future.addListener((ChannelFutureListener) f -> {    if (f.isSuccess()) {        // 连接成功了！可以发消息了        f.channel().writeAndFlush(Unpooled.copiedBuffer("hello", CharsetUtil.UTF_8));    } else {        // 连接失败，看错误原因        System.err.println("连接失败: " + f.cause().getMessage());    }});
```

这个 Promise-Future 模式贯穿了整个 connect/bind/close 流程，每个关键操作都返回一个 future，让你能链式加监听器。这比 JDK 里 `future.get()` 傻等优雅太多了。

### 3.3 优雅关闭的四个层次

Netty close 在我看来做了四层清理：

层次

做什么

关键代码

应用层

发完缓冲区数据

`outboundBuffer.failFlushed()`

 \+ `closeOutboundBuffer()`

Channel层

触发 pipeline 事件

`fireChannelInactive()`

、`fireChannelUnregistered()`

Selector层

取消 selectionKey

`selectionKey().cancel()`

JDK层

关闭 socket

`javaChannel().close()`

少任何一步都有问题。比如忘记 `key.cancel()`，selector 下次 select 还会返回这个 channel 的事件，就会出现已关闭的 channel 还在不停触发事件的情况。

## 4\. 完整可运行示例

来个实战——一个简单的 Echo 客户端+服务端，重点演示 connect、bind、close：

### 服务端

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.util.CharsetUtil;import io.netty.util.ReferenceCountUtil;public class ConnectionDemoServer {    static class EchoServerHandler extends ChannelInboundHandlerAdapter {        @Override        public void channelActive(ChannelHandlerContext ctx) {            System.out.println("[服务端] 新连接建立: " + ctx.channel().remoteAddress());            ctx.writeAndFlush(Unpooled.copiedBuffer("Welcome! ", CharsetUtil.UTF_8));        }        @Override        public void channelRead(ChannelHandlerContext ctx, Object msg) {            ByteBuf in = (ByteBuf) msg;            System.out.println("[服务端] 收到: " + in.toString(CharsetUtil.UTF_8).trim());            ctx.writeAndFlush(msg); // echo 回去        }        @Override        public void channelInactive(ChannelHandlerContext ctx) {            System.out.println("[服务端] 连接断开: " + ctx.channel().remoteAddress());        }        @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }    public static void main(String[] args) throws Exception {        EventLoopGroup bossGroup = new NioEventLoopGroup(1);        EventLoopGroup workerGroup = new NioEventLoopGroup();        try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(NioServerSocketChannel.class)             .option(ChannelOption.SO_BACKLOG, 128)             .childOption(ChannelOption.SO_KEEPALIVE, true)             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new EchoServerHandler());                 }             });            // ★ bind 返回的是 ChannelFuture，可以监听绑定结果            ChannelFuture f = b.bind(8888).sync();            System.out.println("[服务端] 已绑定端口 8888，等待连接...");            // 等待 closeFuture —— 这行会阻塞到服务端关闭            f.channel().closeFuture().sync();        } finally {            // 优雅关闭            workerGroup.shutdownGracefully();            bossGroup.shutdownGracefully();        }    }}
```

### 客户端

```
import io.netty.bootstrap.Bootstrap;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioSocketChannel;import io.netty.util.CharsetUtil;import java.util.Scanner;public class ConnectionDemoClient {    static class ClientHandler extends SimpleChannelInboundHandler<ByteBuf> {        @Override        protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {            System.out.println("[客户端] 收到: " + msg.toString(CharsetUtil.UTF_8).trim());        }        @Override        public void channelActive(ChannelHandlerContext ctx) {            System.out.println("[客户端] 连接成功: " + ctx.channel().remoteAddress());        }        @Override        public void channelInactive(ChannelHandlerContext ctx) {            System.out.println("[客户端] 连接已断开");        }        @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }    public static void main(String[] args) throws Exception {        EventLoopGroup group = new NioEventLoopGroup();        try {            Bootstrap b = new Bootstrap();            b.group(group)             .channel(NioSocketChannel.class)             .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000) // 连接超时5秒             .handler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new ClientHandler());                 }             });            // ★ connect 返回 ChannelFuture，异步的，可以加监听器            ChannelFuture f = b.connect("127.0.0.1", 8888);                       // 用 addListener 的方式等连接完成（不阻塞当前线程）            f.addListener((ChannelFutureListener) future -> {                if (future.isSuccess()) {                    System.out.println("[客户端] 连接建立成功，开始发送消息");                    Channel channel = future.channel();                                       // 发几条消息                    for (int i = 0; i < 3; i++) {                        channel.writeAndFlush(                            Unpooled.copiedBuffer("Hello Netty #" + i + " ", CharsetUtil.UTF_8));                    }                } else {                    System.err.println("[客户端] 连接失败: " + future.cause().getMessage());                }            });            // 等5秒后主动关闭            Thread.sleep(5000);            System.out.println("[客户端] 准备关闭连接");                       Channel channel = f.channel();            if (channel.isActive()) {                // ★ close 也是异步的，可以加监听器知道什么时候真正关完                ChannelFuture closeFuture = channel.close();                closeFuture.addListener((ChannelFutureListener) cf ->                     System.out.println("[客户端] 连接已完全关闭"));            }            // 给关闭操作一点时间            Thread.sleep(1000);        } finally {            group.shutdownGracefully();        }    }}
```

## 5\. 注意事项

### 5.1 连接超时设置

```
// 客户端设置连接超时（单位毫秒）bootstrap.option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000);
```

如果 5 秒连不上，`AbstractUnsafe` 里的定时任务会触发 `ConnectTimeoutException`。**但是有个坑**——这个超时是 EventLoop 的 schedule 任务，如果你的 EventLoop 线程卡住了，这个超时也不会触发。

### 5.2 close 的坑

```
// ❌ 错误写法：在非 EventLoop 线程直接 closechannel.close();// ✅ 正确写法：如果有监听器channel.close().addListener(f -> {    if (f.isSuccess()) {        System.out.println("关完了");    }});// ✅ 或者用 sync 等它完成（会阻塞当前线程）channel.close().sync();
```

**特别提醒**：不要在 handler 的 `channelRead` 里直接调 `ctx.channel().close()` 然后期待它立即生效。close 是异步的，你需要用 `closeFuture()` 来等它真正完成：

```
// 在 handler 里想等连接关闭再干别的事ctx.close().addListener(f -> {    // 这里才是真的关完了    doSomethingAfterClose();});// 或者外部等channel.closeFuture().sync(); // 阻塞到连接关闭
```

### 5.3 Netty 的 close vs 半关闭

有时候你只想关写（shutdownOutput）不想关读（比如 HTTP 的 `Connection: close` 场景）。Netty 也支持：

```
// 只关闭输出（不再发送数据，但可以继续收）ChannelFuture f = channel.shutdownOutput();// 只关闭输入channel.shutdownInput();// 但要注意：shutdownOutput 后你写的 OP_WRITE 事件会被取消
```

### 5.4 connect 失败重试

Netty 本身不提供重试机制，但结合 `connect` 返回的 future 很容易实现：

```
private void connectWithRetry(Bootstrap b, String host, int port, int retries) {    b.connect(host, port).addListener((ChannelFutureListener) future -> {        if (future.isSuccess()) {            System.out.println("连接成功！");        } else if (retries > 0) {            System.out.println("连接失败，剩余重试次数: " + retries);            // 延迟 1 秒后重试            future.channel().eventLoop().schedule(() -> {                connectWithRetry(b, host, port, retries - 1);            }, 1, TimeUnit.SECONDS);        } else {            System.err.println("重试耗尽，连接彻底失败");        }    });}
```

### 5.5 性能考量

1.  **connect 操作本身开销大** — 涉及 TCP 三次握手，所以 Netty 把它做成异步的，不会阻塞 selector 线程。
    
2.  **不要在高频路径上频繁 connect/close** — 每次 connect/close 都要做 channel 创建、注册、取消注册、资源释放。考虑连接池（比如 Netty 自带的 `FixedChannelPool`）。
    
3.  **close 要放在 EventLoop 里** — 如果你在外部的业务线程直接调 close，Netty 会把它封装成 task 丢到 EventLoop 去执行，所以 close 的 future 在外部线程可能不会立即完成。
    

## 最后

Netty 连接管理的代码量很大（从 AbstractUnsafe 到 NioSocketChannel，到各种 pipeline 事件），但核心逻辑其实很清晰：

*   **connect** ≈ 创建 channel + 注册 + 发起 TCP 连接 + 异步等完成
    
*   **bind** ≈ 创建 channel + 注册 + 绑定端口 + 注册 ACCEPT
    
*   **close** ≈ 停收新数据 + 冲刷 buffer + 取消 selectkey + 关 JDK channel + 发事件
    

整个流程全部异步化，用 Promise-Future 模式串联。理解了这三条主线的源码，你对 Netty 运行时的理解会上一个大台阶。

下篇预告：IdleStateHandler 心跳机制源码分析，看看 Netty 是怎么优雅地检测空闲连接并踢掉的。
