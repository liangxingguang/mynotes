---
title: Netty源码分析(22) — Netty 的 SSL/TLS 支持
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484604&idx=1&sn=b5db4f8ded964cdc6fb8d34a62cf7cdc&chksm=fe6ca5e6c91b2cf0a7ac5a8d8de49946fbcfe692bd4cd7a9b87e62a62e66c8f1d2b7beb28d19
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-22-ssl-tls.md
asset_ref: Assets/2026/10/netty-22-ssl-tls.md
---

# Netty源码分析(22) — Netty 的 SSL/TLS 支持

## 一、背景与问题

兄弟们，聊到网络安全，SSL/TLS 绝对是绕不开的话题。在我们日常开发的互联网应用中，从 HTTP 升级到 HTTPS，从 WebSocket 的 `wss://` 协议，几乎都离不开 SSL/TLS 加密。

但是问题来了：**Netty 作为底层网络框架，它是怎么支持 SSL/TLS 加密的？**

如果你用过 Netty 的 SSL 支持，第一反应肯定是往 pipeline 里加一个 `SslHandler`。没错，就这么简单。但你想过没有：

*   这个 `SslHandler` 内部是怎么和 JDK 的 SSLEngine 打交道的？
    
*   SSL 握手的过程在 Netty 里是怎么体现的？
    
*   Netty 自带的 `SslContext` 封装了什么？
    
*   为什么有时候你用 `openssl` 比 JDK 自带的 TLS 实现快那么多？
    

今天我们就来扒一扒 Netty 的 SSL/TLS 实现，从源码层面看看它到底干了什么。

## 二、核心源码分析

### 2.1 从 SslHandler 入手

`SslHandler` 是 Netty 处理 SSL/TLS 的核心 Handler。它继承自 `ByteToMessageDecoder` 和 `ChannelOutboundHandlerAdapter`，所以**既能处理入站数据（解密），也能处理出站数据（加密）**。

我们来看它的核心字段：

```
// io.netty.handler.ssl.SslHandlerpublic class SslHandler extends ByteToMessageDecoder implements ChannelOutboundHandler {       // 真正的 SSL 引擎 —— 所有加密解密都由它代理    private final SslEngine engine;       // 最大打包大小，控制单次 SSL 加密的数据量    private final int maxPacketBufferSize;       // 应用数据的最大缓冲区    private final int maxAppDataBufferSize;       // 握手超时任务（ScheduledFuture），防止握手卡死    private long handshakeTimeoutMillis = 10000;       // 关闭超时    private long closeNotifyTimeoutMillis = 3000;       // 握手完成后的回调    private final Promise<Channel> handshakePromise = new DefaultPromise<>();       // 数据是否已解密并准备传播到下一个 Handler    private final Queue<PendingWrite> pendingUnencryptedWrites;       // ========= 核心方法 =========       /**     * 当数据从网络到达时，先由 decode() 解密，     * 再传递给 pipeline 下游     */    @Override    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)            throws SSLException {        // 把入站数据喂给 SSLEngine 进行解密        unwrap(ctx, in, out);    }       /**     * 写出站数据时，拦截并进行加密     */    @Override    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise)            throws Exception {        // 如果不是 ByteBuf，直接透传        if (!(msg instanceof ByteBuf)) {            ctx.write(msg, promise);            return;        }        // 检查握手是否完成        if (engine.isWrapNeededAfterHandshakeComplete()) {            // 加密后发送            wrap(ctx, msg, promise);        } else {            // 握手还没完成，排队等待            pendingUnencryptedWrites.add(new PendingWrite((ByteBuf) msg, promise));        }    }}
```

这里有个关键点：`decode()` 是入站解码，`unwrap()` 方法负责把 SSL 加密的二进制数据解密成明文。`write()` 是出站拦截，`wrap()` 把明文加密成 SSL 数据包。

### 2.2 unwrap() — 解密的核心逻辑

`unwrap()` 是 `SslHandler` 里最核心的方法，我们来好好看看它是怎么解密数据的：

```
// io.netty.handler.ssl.SslHandler#unwrapprivate void unwrap(        ChannelHandlerContext ctx, ByteBuf packet, int offset, int len,        List<Object> out) throws SSLException {       // 1. 将 Netty 的 ByteBuf 转换成 JDK NIO 的 ByteBuffer    //    SSLEngine 只认 JDK 的 ByteBuffer    final ByteBuffer in = packet.nioBuffer(offset, len);       // 2. 循环：SSLEngine 可能一次 unwrap 不完所有数据    while (true) {        // 获取输出缓冲区（解密后的明文空间）        ByteBuffer out = allocateOutNetBuf(ctx, len);               try {            // 3. 核心调用：SSLEngine.unwrap()            //    这个方法把 SSL/TLS 加密数据解密成明文            SSLEngineResult result = engine.unwrap(in, out);                       // 4. 处理 SSLEngine 的状态            Status status = result.getStatus();            HandshakeStatus handshakeStatus = result.getHandshakeStatus();                       // 翻转输出缓冲区，准备读取            out.flip();                       switch (status) {                case OK:                    // 解密成功，把明文 ByteBuffer 包装成 ByteBuf                    // 传递给 pipeline 的下一个 handler                    if (out.hasRemaining()) {                        ByteBuf decoded = Unpooled.wrappedBuffer(out);                        out = null; // 防止 finally 释放                        out.add(decoded);                    }                    break;                                   case BUFFER_UNDERFLOW:                    // 数据不够，下次再处理                    break;                                   case BUFFER_OVERFLOW:                    // 输出缓冲区太小，扩大后重试                    out = ByteBuffer.allocate(                        engine.getSession().getApplicationBufferSize());                    break;                                   case CLOSED:                    // 对方关闭了 SSL 连接                    closeOutboundAndChannel(ctx, engine);                    return;            }                       // 5. 处理握手状态            if (handshakeStatus == HandshakeStatus.NEED_TASK) {                // 需要执行握手任务（比如密钥协商）                // 异步执行，避免阻塞 IO 线程                runDelegatedTasks(ctx, engine);            } else if (handshakeStatus == HandshakeStatus.NEED_UNWRAP ||                       handshakeStatus == HandshakeStatus.NEED_WRAP) {                // 继续握手或者准备加密数据返回            }                       // 6. 检查是否还有数据要处理            if (!in.hasRemaining() || status == Status.BUFFER_UNDERFLOW) {                break;            }        } catch (SSLException e) {            // SSL 异常直接抛出去，触发 exceptionCaught            throw e;        } finally {            if (out != null) {                // 释放临时分配的 ByteBuffer                ByteBufUtil.release(out);            }        }    }       // 7. 处理握手状态的特殊情况    if (engine.getHandshakeStatus() == HandshakeStatus.NEED_WRAP) {        // 需要加密握手数据发送给对方        wrap(ctx, Unpooled.EMPTY_BUFFER, ctx.newPromise());    }}
```

### 2.3 wrap() — 加密的核心逻辑

加密和解密是对称的，出站数据走 `wrap()`：

```
// io.netty.handler.ssl.SslHandler#wrapprivate void wrap(ChannelHandlerContext ctx, ByteBuf msg, ChannelPromise promise)        throws SSLException {       ByteBuf out = ctx.alloc().buffer(maxPacketBufferSize);    ByteBuf in = msg;       ByteBuffer inBuffer = in.nioBuffer();    ByteBuffer outBuffer = out.nioBuffer(0, maxPacketBufferSize);       // 调用 SSLEngine.wrap() 加密    SSLEngineResult result = engine.wrap(inBuffer, outBuffer);       // 更新写位置    out.writerIndex(outBuffer.position());       // 根据结果决定下一步    switch (result.getStatus()) {        case OK:            // 加密成功，把加密后的数据写出到 socket            ctx.write(out, promise);            break;        case BUFFER_OVERFLOW:            // 缓冲区不够，抛错或者扩大            break;        case CLOSED:            // SSL 连接已关闭            break;    }       // 如果引擎状态是 NEED_UNWRAP（握手中），切换处理    if (result.getHandshakeStatus() == HandshakeStatus.NEED_UNWRAP) {        // 尝试读取数据来继续握手        ctx.read();    }}
```

### 2.4 SslContext — 工厂和生产配置

`SslContext` 是 Netty SSL 的配置中心和工厂，用来创建 `SslHandler`。Netty 提供了两个主要实现：

```
// io.netty.handler.ssl.SslContextpublic abstract class SslContext implements ... {       // 是否作为客户端（true）或服务端（false）    private final boolean isClient;       // SSL 协议提供者（JDK / OpenSSL / BouncyCastle）    private final SslProvider provider;       // 会话缓存，复用 SSL Session，避免重复握手    private final SSLSessionContext sessionContext;       // 信任证书    private final TrustManagerFactory trustManagerFactory;       // 应用协议协商（ALPN）—— HTTP/2 支持的关键    private final List<String> apn;       // 创建 SslHandler 工厂方法    public final SslHandler newHandler(ByteBufAllocator allocator) {        return newHandler(allocator,            engine -> { },  // 可以传入回调来自定义 SSLEngine            isClient ? engine.getSession().getPeerHost() : null);    }       // 实际构建 SSLEngine    protected abstract SslEngine newEngine(ByteBufAllocator allocator);}// 典型的服务端 SSL 配置SslContext sslCtx = SslContextBuilder.forServer(certFile, keyFile)    .sslProvider(SslProvider.OPENSSL)  // 使用 OpenSSL    .ciphers(Arrays.asList("TLS_AES_256_GCM_SHA384"))  // 指定加密套件    .build();
```

### 2.5 Netty 的 OpenSSL 集成 — 为什么更快？

Netty 通过 **netty-tcnative** 库（Tomcat Native 封装）实现了 OpenSSL 的集成。核心类是 `OpenSslEngine`：

```
// io.netty.handler.ssl.OpenSslEngine// 这个类本质上是对 OpenSSL 库的 JNI 调用封装public final class OpenSslEngine extends SSLEngine {       // 指向 openssl 原生 SSL* 对象的指针    private final long ssl;       // openssl BIO（基本 IO）抽象    private final long bio;       @Override    @SuppressJava6Requirement(reason = "Usage guarded by java version check")    protected SSLEngineResult unwrap(ByteBuffer src, ByteBuffer dst)            throws SSLException {        // 直接把数据送到 openssl 的 BIO 里处理        int sslRead = SSL.readFromSSL(ssl, src, dst);        // 检查 openssl 的返回值，映射到 SSLEngineResult.Status        return new SSLEngineResult(...);    }}
```

**为什么 OpenSSL 引擎比 JDK 的快？两个核心原因：**

1.  **原生实现**：加密算法运行在 C 层面，没有 JVM 和 JNI 边界开销
    
2.  **硬件加速**：OpenSSL 能利用 CPU 的 AES-NI 指令集做硬件加速加密
    

## 三、原理分析

### 3.1 SSL/TLS 握手全过程

Netty 中的 SSL 握手是一个**异步过程**，和普通的网络 IO 一样，**完全不会阻塞 IO 线程**。我画个流程图：

```
客户端                          服务端  |                              |  | ---- ClientHello ----------> |  1. 客户端发起连接，发 ClientHello  |                              |  | <--- ServerHello ----------- |  2. 服务端回应，选择 TLS 版本和加密套件  | <--- Certificate ----------- |  3. 服务端发送证书  | <--- ServerHelloDone ------- |  4. 服务端说 "我发完了"  |                              |  | ---- ClientKeyExchange ----> |  5. 客户端生成 PreMasterSecret，用服务端公钥加密发送  | ---- ChangeCipherSpec -----> |  6. 通知服务端："我要开始加密通信了"  | ---- Finished -------------> |  7. 加密的握手完成消息  |                              |  | <--- ChangeCipherSpec ------ |  8. 服务端也切换加密模式  | <--- Finished -------------- |  9. 握手完成！  |                              |  | ==== 之后所有数据都加密 ====  |
```

在 Netty 源码中，握手过程被 `SslHandler` 自动管理。关键逻辑在 `handshake()` 方法：

```
// SslHandler#handshakepublic ChannelFuture handshake() {    if (engine.getHandshakeStatus() != HandshakeStatus.NOT_HANDLED) {        // 握手已经开始或已完成，直接返回        return handshakePromise;    }       // 开始握手    engine.beginHandshake();       // 触发真正的 SSL 握手流程    // 这里会引发 SSLEngine 的 NEED_WRAP / NEED_UNWRAP 状态变化    // SslHandler 在 decode/wrap 里自动响应这些状态       handshakePromise.addListener((ChannelFutureListener) future -> {        if (future.isSuccess()) {            // 握手成功，刷新排队的待发数据            flushPendingWrites(ctx);        }    });       return handshakePromise;}
```

### 3.2 设计模式分析

**1\. 装饰器模式**`SslHandler` 像一个包装器，在原生的 TCP 流上包裹了一层 SSL 加密/解密逻辑。对于 pipeline 上下游的处理器来说，它们看到的是明文数据，SSL 层完全透明。

**2\. 观察者模式**`SslHandler` 内部使用 `Promise` 来跟踪握手状态。外部通过添加 `ChannelFutureListener` 来监听握手完成事件。

**3\. 策略模式**`SslProvider` 体现了策略模式：你可以选择 JDK SSL、OpenSSL 或 BouncyCastle 作为底层实现，而 `SslHandler` 的代码完全不需要改动。

## 四、完整可运行示例

咱们来一个完整的服务端-客户端 SSL 通信例子：

### 4.1 服务端代码

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.handler.ssl.SslContext;import io.netty.handler.ssl.SslContextBuilder;import io.netty.handler.ssl.SslProvider;import io.netty.handler.codec.LineBasedFrameDecoder;import io.netty.handler.codec.string.StringDecoder;import io.netty.handler.codec.string.StringEncoder;import java.nio.charset.StandardCharsets;import java.io.File;public class SecureEchoServer {       public static void main(String[] args) throws Exception {        // 用 OpenSSL 协议，生产环境一定要用 OpenSSL！        SslContext sslCtx = SslContextBuilder.forServer(                new File("/path/to/server.crt"),    // 证书                new File("/path/to/pkcs8.key")      // 私钥            )            .sslProvider(SslProvider.OPENSSL)            .build();               EventLoopGroup boss = new NioEventLoopGroup(1);        EventLoopGroup worker = new NioEventLoopGroup();               try {            ServerBootstrap b = new ServerBootstrap();            b.group(boss, worker)             .channel(NioServerSocketChannel.class)             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ChannelPipeline p = ch.pipeline();                                          // 1. SSL Handler - 放在最前面！                     p.addLast(sslCtx.newHandler(ch.alloc()));                                          // 2. 后面就跟普通 TCP 一样了                     //    因为数据已经被 SslHandler 解密成明文                     p.addLast(new LineBasedFrameDecoder(1024));                     p.addLast(new StringDecoder(StandardCharsets.UTF_8));                     p.addLast(new StringEncoder(StandardCharsets.UTF_8));                                          // 3. 业务 Handler                     p.addLast(new SimpleChannelInboundHandler<String>() {                         @Override                         protected void channelRead0(ChannelHandlerContext ctx,                                                    String msg) {                             System.out.println("[Server] 收到: " + msg);                             ctx.writeAndFlush("[Echo] " + msg + " ");                         }                                                    @Override                         public void channelActive(ChannelHandlerContext ctx) {                             System.out.println("客户端连接: " + ctx.channel().remoteAddress());                         }                                                    @Override                         public void exceptionCaught(ChannelHandlerContext ctx,                                                    Throwable cause) {                             cause.printStackTrace();                             ctx.close();                         }                     });                 }             })             .option(ChannelOption.SO_BACKLOG, 128)             .childOption(ChannelOption.TCP_NODELAY, true);                       ChannelFuture f = b.bind(8443).sync();            System.out.println("SSL 服务器启动在端口 8443");            f.channel().closeFuture().sync();        } finally {            boss.shutdownGracefully();            worker.shutdownGracefully();        }    }}
```

### 4.2 客户端代码

```
import io.netty.bootstrap.Bootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioSocketChannel;import io.netty.handler.ssl.SslContext;import io.netty.handler.ssl.SslContextBuilder;import io.netty.handler.ssl.SslProvider;import io.netty.handler.codec.LineBasedFrameDecoder;import io.netty.handler.codec.string.StringDecoder;import io.netty.handler.codec.string.StringEncoder;import java.nio.charset.StandardCharsets;public class SecureEchoClient {       public static void main(String[] args) throws Exception {        // 客户端 SSL 上下文        // 注意：客户端不需要私钥，只需要信任服务端的证书        SslContext sslCtx = SslContextBuilder.forClient()            .sslProvider(SslProvider.OPENSSL)            .trustManager(new File("/path/to/ca.crt"))  // 信任的自签名 CA            .build();               EventLoopGroup group = new NioEventLoopGroup();               try {            Bootstrap b = new Bootstrap();            b.group(group)             .channel(NioSocketChannel.class)             .handler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ChannelPipeline p = ch.pipeline();                                          // 1. SSL Handler 必须放 pipeline 最前面                     p.addLast(sslCtx.newHandler(ch.alloc(),                             "localhost", 8443));                                          // 2. 编解码器（与服务器一致）                     p.addLast(new LineBasedFrameDecoder(1024));                     p.addLast(new StringDecoder(StandardCharsets.UTF_8));                     p.addLast(new StringEncoder(StandardCharsets.UTF_8));                                          // 3. 业务 Handler                     p.addLast(new ChannelInboundHandlerAdapter() {                         @Override                         public void channelActive(ChannelHandlerContext ctx) {                             System.out.println("SSL 连接已建立，开始发送数据...");                                                         // 发送多条消息，测试 SSL 加密                             for (int i = 0; i < 5; i++) {                                 ctx.writeAndFlush("Hello Netty SSL #" + i + " ");                             }                         }                                                    @Override                         public void channelRead(ChannelHandlerContext ctx, Object msg) {                             System.out.println("[Client] 收到回复: " + msg);                         }                                                    @Override                         public void exceptionCaught(ChannelHandlerContext ctx,                                                    Throwable cause) {                             cause.printStackTrace();                             ctx.close();                         }                     });                 }             });                       ChannelFuture f = b.connect("localhost", 8443).sync();            f.channel().closeFuture().sync();        } finally {            group.shutdownGracefully();        }    }}
```

### 4.3 自签名证书一键生成（开发环境用）

```
# 生成 CA 私钥和根证书openssl req -new -x509 -days 3650 -nodes \    -subj "/C=CN/ST=Beijing/L=Beijing/O=NettyDemo/CN=NettyRootCA" \    -keyout ca.key -out ca.crt# 生成服务端私钥和证书签名请求openssl genrsa -out server.key 2048openssl req -new -subj "/C=CN/ST=Beijing/L=Beijing/O=NettyDemo/CN=localhost" \    -key server.key -out server.csr# 用 CA 签发服务端证书openssl x509 -req -days 365 \    -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \    -out server.crt# 把私钥转换成 PKCS#8 格式（Netty 要求）openssl pkcs8 -topk8 -nocrypt -in server.key -out pkcs8.key# 生成客户端信任的证书（CA）# 客户端 trustManager 指向 ca.crt 即可
```

## 五、注意事项

### 5.1 常见坑

**1\. SslHandler 必须在 Pipeline 最前面**

这是最最最容易踩的坑。SslHandler 处理的是加密后的二进制流，如果前面放了别的解码器，数据还没解密就被"误解"了。

```
// ❌ 错误：编解码器在 Ssl 前面p.addLast(new StringDecoder());  // 收到的是密文，解码乱码p.addLast(sslCtx.newHandler(ch.alloc()));// ✅ 正确：SslHandler 必须在最前面p.addLast(sslCtx.newHandler(ch.alloc()));p.addLast(new StringDecoder());  // 拿到的是解密后的明文
```

**2\. SSL 握手是异步的，不要假设连接一建立就能发数据**

```
// ❌ 可能踩坑public void channelActive(ChannelHandlerContext ctx) {    // 这个时候 SSL 握手可能还没完成！    ctx.writeAndFlush("数据");}// ✅ 正确做法：监听握手完成事件SslHandler sslHandler = ctx.pipeline().get(SslHandler.class);sslHandler.handshakeFuture().addListener(future -> {    if (future.isSuccess()) {        // 握手完成，可以发数据了        ctx.writeAndFlush("数据");    }});
```

**3\. 性能选型：生产环境一定用 OpenSSL**

JDK 自带的 SSL 实现性能差很多，尤其是高并发场景：

提供者

特点

适用场景

JDK SSL

无需额外库，开箱即用

开发环境、低并发

OpenSSL

性能好，AES-NI 硬件加速

生产环境高并发

BouncyCastle

算法全，FIPS 认证

金融、政府行业

**4\. SSLEngine 的 BUFFER\_OVERFLOW 和 BUFFER\_UNDERFLOW**

上层 Handler 不能假设一次 decode 就能拿到完整的一帧 SSL 数据。`SslHandler` 内部的 `unwrap()` 方法通过循环处理这点，但自定义 Handler 要注意：

*   `BUFFER_UNDERFLOW`：数据不够，下次继续
    
*   `BUFFER_OVERFLOW`：输出缓冲区不够大，需要调整
    

### 5.2 性能优化建议

1.  **启用 Session 复用**：SSL 握手很贵（尤其是 RSA 密钥交换），复用 Session 能大幅减少握手次数
    
2.  **调整最大数据包大小**：`SslHandler.setMaxPacketBufferSize()` 配合应用层的 MTU
    
3.  **优先 TLS 1.3**：1.3 只需要 1-RTT 就能完成握手，比 1.2 快一个来回
    
4.  **注意内存**：SSL 加解密会产生额外的 ByteBuf 分配，监控堆外内存使用情况
    

```
// 开启 Session 缓存SslContext sslCtx = SslContextBuilder.forServer(...)    .sessionCacheSize(10000)   // Session 缓存容量    .sessionTimeout(300)       // 5分钟超时    .sslProvider(SslProvider.OPENSSL)    .build();
```

### 5.3 适用场景

*   **HTTPS 服务器**：Netty 的 HTTP 协议栈 + SSL Handler，轻松实现 HTTPS
    
*   **安全 RPC**：内部服务之间的通信加密
    
*   **WSS WebSocket**：WebSocket 安全版本
    
*   **MQTT over TLS**：物联网安全通信
    
*   **自研协议加密**：私有协议的传输层加密
    

## 六、总结

Netty 的 SSL/TLS 支持本质上是对 JDK `SSLEngine` 的封装，核心是 `SslHandler` 这个处理器。它通过 `wrap()` 和 `unwrap()` 两个方法，在出站时加密、入站时解密，对 pipeline 上下文的 handler 完全透明。

关键点回顾：

1.  `SslHandler` 必须放在 pipeline 最前面
    
2.  握手是异步的，通过 `handshakeFuture()` 监听完成事件
    
3.  生产环境务必用 OpenSSL 提供者（netty-tcnative）
    
4.  Session 复用 + TLS 1.3 = 高性能 SSL
    

理解了 `SslHandler` 和 `SSLEngine` 的交互机制后，你会发现 Netty 的 SSL/TLS 支持远比你想象的要优雅。它把复杂的加密协议细节全部封装在了一个 Handler 内部，让你能像写普通 TCP 应用一样写加密通信程序。

下一篇我们聊 Netty 的「零拷贝机制」，这个可以说是 Netty 性能老大哥级别的优化，敬请期待！
