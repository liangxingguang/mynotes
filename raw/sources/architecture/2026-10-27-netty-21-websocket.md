---
title: Netty源码分析(21) — WebSocket 支持与协议升级源码
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484598&idx=1&sn=ec52f9b41a17b557887fd68c8b7ef42c&chksm=fe6ca5ecc91b2cfa27f5b2dcb77ce4f4766838ae70d7e64b005eacb62b9c074c740f0c6bc321
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-21-websocket.md
asset_ref: Assets/2026/10/netty-21-websocket.md
---

# Netty源码分析(21) — WebSocket 支持与协议升级源码

## 一、背景与问题

讲个真事儿。

我之前在一个物联网项目里，需要服务端实时推送设备状态到前端大屏。刚开始用 HTTP 轮询，每秒查一次的那种，设备一多服务器 CPU 直接干到 80%。后来切了 WebSocket，长连接一建，服务端主动推，客户端耗时从 "秒级刷新" 变成 "实时"。

但问题来了——**HTTP 是个请求-响应协议，你咋"升级"成 WebSocket 的**？

说实话，刚接触的时候我也挺懵的。不是重新建一个连接，而是**在同一个 TCP 连接上，先走 HTTP 完成握手，然后无缝切换到 WebSocket 协议**。这个过程叫 **WebSocket 握手/升级**。

Netty 把这套流程封装得相当漂亮。你只要往 Pipeline 里丢几个 Handler，协议升级、帧解析、生命周期管理全都自动搞定。但今天咱们不看 API 怎么用，而是**翻开源码看看握手那一哆嗦到底是怎么发生的**。

## 二、核心源码分析

### 2.1 Pipeline 搭建：一个典型的 WebSocket Server

先看服务端怎么配。我一般在 `ChannelInitializer` 里这么写：

```
public class WebSocketServerInitializer extends ChannelInitializer<SocketChannel> {    @Override    protected void initChannel(SocketChannel ch) {        ChannelPipeline pipeline = ch.pipeline();               // HTTP 编解码（握手阶段需要解析 HTTP 请求）        pipeline.addLast(new HttpServerCodec());        // 聚合 HTTP 消息（把 HttpRequest 和 HttpContent 聚合成 FullHttpRequest）        pipeline.addLast(new HttpObjectAggregator(65536));        // WebSocket 协议处理器——核心就在这里        pipeline.addLast(new WebSocketServerProtocolHandler("/ws"));        // 业务处理器（处理 TextWebSocketFrame 等）        pipeline.addLast(new WebSocketFrameHandler());    }}
```

就这么几行。但底层干了多少活你往下看就知道了。

### 2.2 WebSocketServerProtocolHandler 的核心逻辑

我们直接看 `WebSocketServerProtocolHandler` 的 `handlerAdded` 方法：

```
// 简化版，但核心逻辑一致public class WebSocketServerProtocolHandler extends SimpleChannelInboundHandler<FullHttpRequest> {       @Override    protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest req) throws Exception {        // 关键判断：是不是 WebSocket 升级请求        if (isWebSocketUpgradeRequest(req)) {            // 是的话执行握手            handleHandshake(ctx, req);        } else {            // 不是的话交给下一个 handler            ctx.fireChannelRead(req.retain());        }    }       private boolean isWebSocketUpgradeRequest(FullHttpRequest req) {        // 判断 HTTP 头里面有没有 Upgrade: websocket        String upgrade = req.headers().get(HttpHeaderNames.UPGRADE);        return HttpMethod.GET.equals(req.method())            && upgrade != null            && upgrade.equalsIgnoreCase("websocket");    }}
```

其实 `WebSocketServerProtocolHandler` 内部**不使用**`SimpleChannelInboundHandler` 了，而是直接实现了 `ChannelInboundHandler` 接口。但它的核心逻辑就是上面这两步。

### 2.3 握手核心：WebSocketServerHandshaker

握手的具体实现委托给了 `WebSocketServerHandshaker`。我们看它怎么干活：

```
// 版本 13 的握手器public class WebSocketServerHandshaker13 extends WebSocketServerHandshaker {       @Override    public ChannelFuture handshake(Channel channel, FullHttpRequest request) {        // 1. 构建 101 Switching Protocols 响应        FullHttpResponse response = new DefaultFullHttpResponse(            HttpVersion.HTTP_1_1,            HttpResponseStatus.SWITCHING_PROTOCOLS);               // 2. 计算 Sec-WebSocket-Accept        //    = Base64(SHA1(Sec-WebSocket-Key + 固定魔数))        String acceptHash = generateAcceptValue(request.headers()            .get(HttpHeaderNames.SEC_WEBSOCKET_KEY));               response.headers()            .set(HttpHeaderNames.UPGRADE, HttpHeaderValues.WEBSOCKET)            .set(HttpHeaderNames.CONNECTION, HttpHeaderValues.UPGRADE)            .set(HttpHeaderNames.SEC_WEBSOCKET_ACCEPT, acceptHash);               // 3. 发送握手响应        ChannelFuture future = channel.writeAndFlush(response);               // 4. 握手成功后，升级 Pipeline：移除 HTTP 处理器，添加 WebSocket 编码/解码器        future.addListener(f -> {            if (f.isSuccess()) {                ChannelPipeline p = channel.pipeline();                // 移除不需要的 HTTP handler                p.remove(HttpRequestDecoder.class);                p.remove(HttpResponseEncoder.class);                p.remove(HttpObjectAggregator.class);                // 添加 WebSocket 帧编码/解码器                p.addBefore(handlerName, "ws-decoder",                    new WebSocket13FrameDecoder(...));                p.addAfter(handlerName, "ws-encoder",                    new WebSocket13FrameEncoder(...));            }        });               return future;    }}
```

这段代码逻辑其实很简单：

1.  拿到客户端发来的 `Sec-WebSocket-Key`
    
2.  加上一个 RFC 规定的魔数 `"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"`
    
3.  做 SHA1 然后 Base64 编码，塞进 `Sec-WebSocket-Accept` 响应头
    
4.  返回 `101 SWITCHING_PROTOCOLS`
    
5.  握手成功之后**替换 Pipeline**——HTTP 相关的 Handler 全部移除，WebSocket 编解码器加进来
    

### 2.4 握手后的 Pipeline 切换

这一步特别重要，我要展开讲。看上面代码的 `future.addListener` 那里：

**握手之前**的 Pipeline 长这样：

```
HttpServerCodec → HttpObjectAggregator → WebSocketServerProtocolHandler → FrameHandler
```

**握手成功以后**，Pipeline 变成：

```
WebSocket13FrameDecoder → WebSocket13FrameEncoder → WebSocketServerProtocolHandler → FrameHandler
```

其实 `WebSocketServerProtocolHandler` 在握手成功后还会把自己也移除掉（或者改变行为），因为它已经完成了 "判断是否升级" 的核心使命。后续的 WebSocket 帧就直接走 FrameDecoder/FrameEncoder → 你的业务 Handler。

这种 **Pipeline 动态替换** 的设计，你品，你细品——能用 HttpServerCodec 解析握手请求，握手完立刻切到 WebSocket 编解码，同一个连接，完全无感。这就是 Netty Pipeline 灵活性的最典型体现。

### 2.5 WebSocket 帧的编解码

握手完成了，后面传的都是 WebSocket 帧（Frame）。Netty 定义了多种 Frame 类型：

```
// WebSocketFrame 的继承体系（简化）abstract class WebSocketFrame extends DefaultByteBufHolder {    // 是否掩码（客户端→服务端必须掩码）    private boolean masked;    // RSV 位（扩展用）    private byte rsv;}// 文本帧class TextWebSocketFrame extends WebSocketFrame {    TextWebSocketFrame(String text);}// 二进制帧class BinaryWebSocketFrame extends WebSocketFrame {    BinaryWebSocketFrame(ByteBuf data);}// 关闭帧class CloseWebSocketFrame extends WebSocketFrame {    // statusCode: 1000=正常关闭, 1001=离开, 1002=协议错误...    CloseWebSocketFrame(int statusCode, String reasonText);}// ping/pong 心跳class PingWebSocketFrame extends WebSocketFrame {}class PongWebSocketFrame extends WebSocketFrame {}
```

解码的时候，`WebSocket13FrameDecoder` 的 decode 方法要处理：

*   **Frame 头解析**：FIN、RSV、Opcode、Mask、Payload Length（1-9 字节）
    
*   **Mask 数据还原**：如果有掩码，用 XOR 还原
    
*   **分片重组**：FIN=0 表示是分片帧，需要等到 FIN=1 再拼回去
    

```
// WebSocket13FrameDecoder 核心逻辑（极度简化）@Overrideprotected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {    // 1. 读第一个字节：FIN + RSV + Opcode    byte b0 = in.readByte();    boolean fin = (b0 & 0x80) != 0;    int opcode = b0 & 0x0F;       // 2. 读第二个字节：Mask + Payload Length    byte b1 = in.readByte();    boolean masked = (b1 & 0x80) != 0;    int payloadLength = b1 & 0x7F;       // 3. 如果 payloadLength = 126，后面跟 2 字节扩展长度    //    如果 payloadLength = 127，后面跟 8 字节扩展长度    if (payloadLength == 126) {        payloadLength = in.readUnsignedShort();    } else if (payloadLength == 127) {        payloadLength = (int) in.readLong();    }       // 4. 如果有掩码，读 4 字节 Mask Key    byte[] maskBytes = null;    if (masked) {        maskBytes = new byte[4];        in.readBytes(maskBytes);    }       // 5. 读 Payload 数据，如有掩码则解掩码    ByteBuf payload = in.readBytes(payloadLength);    if (masked) {        unmask(payload, maskBytes);    }       // 6. 根据 opcode 创建对应的 WebSocketFrame 对象    //    opcode: 0x1=Text, 0x2=Binary, 0x8=Close, 0x9=Ping, 0xA=Pong    WebSocketFrame frame = createFrame(opcode, fin, payload);    out.add(frame);}
```

这里有个很经典的坑——**客户端到服务端的帧必须带 Mask（掩码），服务端到客户端不能带**。这个设计是为了防止缓存污染攻击（老早以前的安全漏洞了）。你如果在服务端往客户端发了带 Mask 的帧，客户端直接给你断连。

## 三、原理分析

### 设计模式串讲

**1\. 状态模式 — Pipeline 的动态切换**

握手前和握手后，Pipeline 里头的东西完全不一样。但这种 "状态的切换" 对上层是透明的。你的业务 Handler 看到的永远只是 `WebSocketFrame`，不需要关心底层是 HTTP 还是 WebSocket。

**2\. 责任链模式 — Frame 的逐层处理**

一个 WebSocket 帧从网络进来，经过 `ByteToMessageDecoder` 拆包（帧解码器）→ `MessageToMessageEncoder` 组装 → 业务 Handler 处理 → `MessageToMessageEncoder` 编码发出去。每一层各司其职。

**3\. 观察者模式 — 握手结果的异步通知**

`handshake()` 返回 `ChannelFuture`，通过添加 Listener 来感知握手成功与否。这是 Netty 一以贯之的异步+回调风格。

### 协议升级的本质

我自己的理解：**WebSocket 握手其实是 HTTP 协议的一个"特化"**。

握手请求本身就是一个标准的 HTTP GET 请求，只不过带了特殊的 Upgrade 头。服务端识别到这个头之后，不走正常的 HTTP 响应流程（返回 HTML 页面），而是返回一个 101 状态码，告诉客户端 "我听懂了，咱们换协议吧"。

之后两端就**彻底忘记 HTTP**，所有数据都用 WebSocket 的帧格式来传输。好处很明显——**同一个连接，零额外握手开销，全双工通信**。

### WebSocket 的子协议协商

`WebSocketServerProtocolHandler` 构造函数还能指定 subprotocol：

```
pipeline.addLast(new WebSocketServerProtocolHandler("/ws", "mqtt"));
```

这会在握手响应中带上 `Sec-WebSocket-Protocol: mqtt`。客户端拿到后就知道服务端选了哪个子协议。这在物联网场景里挺常用——你可以在 WebSocket 上跑 MQTT 协议。

## 四、完整可运行示例

给你一个能直接跑起来的 WebSocket Echo Server：

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.handler.codec.http.HttpObjectAggregator;import io.netty.handler.codec.http.HttpServerCodec;import io.netty.handler.codec.http.websocketx.*;import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;import io.netty.handler.logging.LogLevel;import io.netty.handler.logging.LoggingHandler;public class WebSocketEchoServer {       private final int port;       public WebSocketEchoServer(int port) {        this.port = port;    }       public void start() throws InterruptedException {        EventLoopGroup bossGroup = new NioEventLoopGroup(1);        EventLoopGroup workerGroup = new NioEventLoopGroup();               try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(NioServerSocketChannel.class)             .handler(new LoggingHandler(LogLevel.INFO))             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ChannelPipeline p = ch.pipeline();                     p.addLast(new HttpServerCodec());                     p.addLast(new HttpObjectAggregator(65536));                     // 路径 /ws                     p.addLast(new WebSocketServerProtocolHandler("/ws"));                     p.addLast(new EchoWebSocketHandler());                 }             });                       ChannelFuture f = b.bind(port).sync();            System.out.println("WebSocket server started at ws://localhost:" + port + "/ws");            f.channel().closeFuture().sync();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }       // 业务 Handler：收到啥就回啥    private static class EchoWebSocketHandler            extends SimpleChannelInboundHandler<WebSocketFrame> {               @Override        protected void channelRead0(ChannelHandlerContext ctx, WebSocketFrame frame) {            // 判断帧类型            if (frame instanceof TextWebSocketFrame) {                String text = ((TextWebSocketFrame) frame).text();                System.out.println("收到文本消息: " + text);                               // Echo 回去                ctx.writeAndFlush(new TextWebSocketFrame("你说了: " + text));                           } else if (frame instanceof BinaryWebSocketFrame) {                ByteBuf data = frame.content();                System.out.println("收到二进制消息，长度: " + data.readableBytes());                               ctx.writeAndFlush(new BinaryWebSocketFrame(data.retain()));                           } else if (frame instanceof CloseWebSocketFrame) {                System.out.println("收到关闭帧，状态码: " + ((CloseWebSocketFrame) frame).statusCode());                ctx.close();                           } else if (frame instanceof PingWebSocketFrame) {                // 自动回复 Pong，但也可以手动处理                ctx.writeAndFlush(new PongWebSocketFrame(frame.content().retain()));            }        }               @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }       public static void main(String[] args) throws InterruptedException {        new WebSocketEchoServer(8080).start();    }}
```

JS 客户端测试：

```
<!DOCTYPE html><html><body><script>const ws = new WebSocket('ws://localhost:8080/ws');ws.onopen = () => {    console.log('连接成功');    ws.send('Hello Netty WebSocket!');};ws.onmessage = (e) => {    console.log('收到:', e.data);};ws.onclose = () => console.log('连接关闭');</script></body></html>
```

## 五、注意事项与踩坑记录

### 5.1 HttpObjectAggregator 不能省

很多人第一次配 WebSocket 会说 "为啥我的握手没反应"？90% 的情况是忘了加 `HttpObjectAggregator`。

因为 `HttpServerCodec` 解码出来的 `HttpRequest` 和 `HttpContent` 是分开的，而 `WebSocketServerProtocolHandler` 需要完整的 `FullHttpRequest`。不加这个聚合器，握手判断永远走不通。

### 5.2 路径匹配

`WebSocketServerProtocolHandler("/ws")` 默认是精确匹配路径。如果你希望 `/ws`、`/ws/foo`、`/ws/bar` 都能触发握手，需要：

```
// 第二个参数 checkStartsWith = truenew WebSocketServerProtocolHandler("/ws", true);
```

### 5.3 大帧处理

WebSocket 帧最大可以到 2^63 字节（你没看错）。虽然实际不会这么大，但如果你不设限制，**内存可能炸**。

`WebSocketServerProtocolHandler` 有一个重载构造器允许设置最大帧大小：

```
// 最大帧 64KBnew WebSocketServerProtocolHandler("/ws", null, false, 65536);
```

### 5.4 心跳是个好习惯

WebSocket 虽然是长连接，但中间的路由器/NAT 可能会把空闲连接断开。WebSocket 标准提供了 Ping/Pong 帧来做心跳。

Netty 里可以结合 `IdleStateHandler`：

```
// 30 秒内没有读写，触发 IdleStateEventp.addLast(new IdleStateHandler(30, 0, 0));// 在业务 Handler 里处理public class HeartbeatHandler extends ChannelDuplexHandler {    @Override    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {        if (evt instanceof IdleStateEvent) {            ctx.writeAndFlush(new PingWebSocketFrame());        }    }}
```

### 5.5 关闭连接的时机

服务端主动关闭时，一定要先发 `CloseWebSocketFrame` 等待客户端回 `Close` 帧，再调 `ctx.close()`。直接关连接是野蛮行为，客户端会收到 "连接被重置" 的错误。

```
// 文明关闭ctx.writeAndFlush(new CloseWebSocketFrame(1000, "Bye!"))   .addListener(f -> ctx.close());
```

## 总结

Netty 的 WebSocket 支持说到底是两个核心阶段的组合：

1.  **握手阶段**：HTTP 协议处理 Upgrade 头，返回 101，完成协议切换
    
2.  **通信阶段**：WebSocket 帧编码/解码，全双工实时通信
    

Pipeline 的动态替换设计让这一切对开发者完全透明。你只需要配好 Handler，剩下的事 Netty 全包了。

说实话，当初读这部分源码最让我惊喜的就是 `handshake()` 方法里那个 Pipeline 替换——设计得真巧妙。把 "协议升级" 翻译成 "Handler 热插拔"，这就是 Netty 框架最迷人的地方。

下一篇我们聊 Netty 的 SSL/TLS 支持，看看在安全连接上 Netty 又做了什么封装。
