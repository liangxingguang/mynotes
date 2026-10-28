---
title: Netty源码分析(2) — 从BIO到NIO再到Netty，为什么我们需要Netty？
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483884&idx=1&sn=2e1dead9301b6513f77c93258db7f80b&chksm=fe6ca0b6c91b29a04550c9c711510eea4dbd9b0e9959fed73de92ff95d6db9dde354624a9123
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Archive/2026-10-27-netty-02-bio-nio.md
asset_ref: Assets/2026/10/netty-02-bio-nio.md
---

# Netty源码分析(2) — 从BIO到NIO再到Netty，为什么我们需要Netty？

## 一、先看一段"祖传代码"

很多老项目里都能看到这样的代码——用 **BIO（Blocking I/O）** 写一个Socket服务端：

`// 你肯定见过的"祖传代码"——BIO 多线程版   public class BioServer {       public static void main(String[] args) throws IOException {           ServerSocket serverSocket = new ServerSocket(8080);           System.out.println("BIO Server started on port 8080");                       // 一个线程池来处理客户端连接           ExecutorService threadPool = Executors.newFixedThreadPool(100);                       while (true) {               // accept() 是阻塞的——没有连接来就卡在这               Socket socket = serverSocket.accept();               System.out.println("新客户端连接: " + socket.getRemoteAddress());                           // 每个连接扔到一个线程里去处理               threadPool.execute(() -> {                   handleConnection(socket);               });           }       }           private static void handleConnection(Socket socket) {           try (               BufferedReader in = new BufferedReader(                   new InputStreamReader(socket.getInputStream()));               PrintWriter out = new PrintWriter(socket.getOutputStream(), true)           ) {               String line;               // readLine() 也是阻塞的——没数据可读就卡在这               while ((line = in.readLine()) != null) {                   System.out.println("收到: " + line);                   out.println("已收到: " + line);               }           } catch (IOException e) {               e.printStackTrace();           }       }   }  `

这段代码的问题在哪？

**本质问题：一个连接需要一个线程。**

如果 1000 个客户端连上来，线程池 100 个就满了，第 101 个连接只能排队等着。这叫 **C10K 问题**——一万个并发连接，一万个线程？操作系统直接崩溃。

Java 1.4 引入了 **NIO（New I/O / Non-blocking I/O）**，试图解决这个问题。理论上一个线程可以管理成千上万个连接。但现实是……

## 二、为什么原生 NIO 也难用？

先看一段原生 NIO 的代码：

`public class NioServer {       public static void main(String[] args) throws IOException {           // 1. 创建 Selector（事件轮询器）           Selector selector = Selector.open();                       // 2. 创建 ServerSocketChannel           ServerSocketChannel serverSocket = ServerSocketChannel.open();           serverSocket.bind(new InetSocketAddress(8080));           serverSocket.configureBlocking(false);  // 非阻塞模式！           serverSocket.register(selector, SelectionKey.OP_ACCEPT);                       System.out.println("NIO Server started on port 8080");                       while (true) {               // 3. 阻塞等待事件发生               selector.select();                           // 4. 处理所有就绪的事件               Set<SelectionKey> selectedKeys = selector.selectedKeys();               Iterator<SelectionKey> it = selectedKeys.iterator();                           while (it.hasNext()) {               SelectionKey key = it.next();               it.remove();  // 必须手动移除！                                   try {                       if (key.isAcceptable()) {                           // 有新连接进来                           ServerSocketChannel server = (ServerSocketChannel) key.channel();                           SocketChannel client = server.accept();                           client.configureBlocking(false);                           client.register(selector, SelectionKey.OP_READ);                           System.out.println("新连接: " + client.getRemoteAddress());                                                  } else if (key.isReadable()) {                           // 有数据可读                           SocketChannel client = (SocketChannel) key.channel();                           ByteBuffer buffer = ByteBuffer.allocate(1024);                           int read = client.read(buffer);                                                       if (read > 0) {                               buffer.flip();                               byte[] bytes = new byte[buffer.remaining()];                               buffer.get(bytes);                               String msg = new String(bytes);                               System.out.println("收到: " + msg);                                                               // 写回去——还要处理写半包                               ByteBuffer writeBuf = ByteBuffer.wrap(                                   ("已收到: " + msg).getBytes());                               client.write(writeBuf);                           } else if (read == -1) {                               // 客户端关闭了                               client.close();                           }                       }                   } catch (IOException e) {                       // 任何一个连接出异常要把key取消掉                       key.cancel();                       key.channel().close();                   }               }           }       }   }  `

看到没？原生 NIO 有这几个痛点：

**1\. 代码复杂到离谱** 一个简单的 Echo Server 写了几十行，各种 try-catch 满天飞，任何一步出错都要手动 cleanup。真实线上代码比这还要复杂 5 倍。

**2\. 粘包半包问题** TCP 是流式协议，没有消息边界。你发 "Hello" + "World"，底层可能一次收到 "HelloWorld"，也可能分三次收到 "Hel" + "loW" + "orld"。原生 NIO 要你自己去拼缓冲区、判断消息边界。

**3\. 断线重连、心跳、空闲检测** 这些在原生 NIO 里全得手写，而且很容易写出 Bug。

**4\. 多线程处理复杂** selector 线程和 worker 线程怎么配合？读写 buffer 要不要加锁？这些都是坑。

**5\. 一个著名的 Bug——JDK 的 epoll 空轮询** JDK NIO 在 Linux 上有个经典 Bug：`Selector.select()` 在 epoll 模式下即使没有事件也会立即返回，导致 CPU 飙到 100%。虽然 JDK 在后续版本修复了这个问题，但修复方式……emmm，是用"如果空轮询超过一定次数就重建 Selector"这种 Hack（后来 JDK 6u17 才真正修好）。

所以，**原生 NIO ≈ 自己做轮子，而且轮子可能是方的。**

## 三、Netty 来了——把复杂留给自己，简单留给开发者

同样一个 Echo Server，用 Netty 写：

`public class NettyServer {       public static void main(String[] args) {           // 1. 两个 EventLoopGroup——一个接连接，一个处理读写           EventLoopGroup bossGroup = new NioEventLoopGroup(1);           EventLoopGroup workerGroup = new NioEventLoopGroup();                       try {               // 2. 启动器——帮我们做配置的"脚手架"               ServerBootstrap bootstrap = new ServerBootstrap();               bootstrap.group(bossGroup, workerGroup)                        .channel(NioServerSocketChannel.class)                        .childHandler(new ChannelInitializer<SocketChannel>() {                            @Override                            protected void initChannel(SocketChannel ch) {                                // 3. 用 Pipeline 组装处理器——像搭积木一样                                ch.pipeline().addLast(                                    new StringDecoder(),                                    new StringEncoder(),                                    new EchoServerHandler()                                );                            }                        });                           // 4. 绑定端口启动               ChannelFuture future = bootstrap.bind(8080).sync();               System.out.println("Netty Server started on port 8080");                           // 5. 优雅关闭               future.channel().closeFuture().sync();           } catch (InterruptedException e) {               e.printStackTrace();           } finally {               bossGroup.shutdownGracefully();               workerGroup.shutdownGracefully();           }       }   }  // 业务逻辑——只关心 "数据来了怎么办"   class EchoServerHandler extends SimpleChannelInboundHandler<String> {       @Override       protected void channelRead0(ChannelHandlerContext ctx, String msg) {           System.out.println("收到: " + msg);           ctx.writeAndFlush("已收到: " + msg);       }           @Override       public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {           cause.printStackTrace();           ctx.close();       }   }  `

不用管 Selector，不用管 ByteBuffer 的 flip/compact，不用管事件注册，不用处理粘包……五行代码就把一个 Echo Server 写完了。

底层 Netty 帮你做了这些：

### 3.1 Reactor 线程模型——拒绝开线程地狱

Netty 的线程模型是**多 Reactor 模式**：

                    `┌──────────────────┐                       │   Boss Group     │ (通常1个线程)                       │  (Acceptor)      │                       └────────┬─────────┘                                │ 接受新连接                                ▼              ┌─────────────────────────────┐              │       Worker Group          │ (通常 CPU 核数 * 2 个线程)              │  ┌──────┐ ┌──────┐ ┌──────┐ │              │  │Event │ │Event │ │Event │ │              │  │Loop1 │ │Loop2 │ │Loop3 │ │              │  └──┬───┘ └──┬───┘ └──┬───┘ │              └─────┼────────┼────────┼─────┘                    │        │        │                channel1 channel2 channel3`

*   **Boss Group**：只负责 accept 新连接，然后分发给 Worker
    
*   **Worker Group**：负责连接上的读写操作
    
*   每个 EventLoop 绑定一个 Selector，管理多个 Channel
    
*   一个 Channel 的生命周期绑定在同一个 EventLoop 上——**天然无锁**！
    

### 3.2 Pipeline 机制——把复杂业务拆成积木

Netty 把数据处理设计成**责任链模式**：

`I/O Request       │       ▼   ┌─────────────┐   │ Head Handler│  (内置，处理底层 I/O)   ├─────────────┤   │ Decoder     │  ← Netty 自带的分隔符解码器、长度域解码器（解决粘包！）   ├─────────────┤   │ Encoder     │  ← 对象序列化   ├─────────────┤   │ Business    │  ← 你只需要写这个！   ├─────────────┤   │ Tail Handler│  (内置，处理异常)   └─────────────┘   `

每个处理器只干一件事，职责单一，想加功能就加一个 Handler，想改就换一个 Handler。

### 3.3 零拷贝——省掉无谓的数据复制

Netty 的 `ByteBuf` 有很多骚操作：

`// 合成两个 ByteBuf——不用复制数据   CompositeByteBuf composite = Unpooled.compositeBuffer();   composite.addComponents(true, header, body);   // header 和 body 的数据还在原来的内存里，不会发生拷贝  // 零拷贝切片   ByteBuf slice = buffer.slice(0, 10);   // slice 和 buffer 共享同一块内存  `

还有 FileRegion 配合操作系统 sendfile，文件传输直接在内核空间完成，**用户空间完全不沾手**。

### 3.4 内存池——告别频繁 GC

每个 `new ByteBuffer.allocate(1024)` 都在堆上分配内存，高并发下 GC 压力爆炸。

Netty 的 `PooledByteBufAllocator` 做了池化：

*   预先分配一大块内存，切成小片（PoolChunk → PoolSubpage）
    
*   用完归还到池中，下次复用
    
*   还支持堆外内存（DirectBuffer），减少在垃圾回收上的停顿
    

这部分后面专门开一篇详细分析，这里先知道 Netty 在内存管理上有多变态就够了。

## 四、所以，Netty 到底解决了什么？

用一张表说清楚：

问题

原生 NIO

Netty

代码复杂度

复杂，大量模板代码

简洁，关注业务逻辑

粘包半包

手写缓冲区拼装

内置 DelimiterBasedFrameDecoder 等

线程模型

自己管理

Reactor 模型，EventLoop 无锁设计

断线重连

手写

IdleStateHandler + 自定义重连

零拷贝

不支持

ByteBuf 零拷贝 + FileRegion

内存管理

GC 频繁

内存池 + 堆外内存

epoll 空轮询

JDK 自身有 Bug

Netty 有自动防御机制

协议扩展

手写编解码

编解码器链式组合

异常处理

各处 try-catch

exceptionCaught 统一处理

**一句话总结**：Netty 把 Java NIO 封装到了极致，让开发者只需要关注"数据来了怎么处理"这一个问题。其他所有底层细节——事件循环、线程调度、内存分配、缓冲区管理——全被 Netty 消化了。

## 五、一个完整的示例——Netty 客户端

刚才写了服务端，再来个对应的客户端：

`public class NettyClient {       public static void main(String[] args) throws Exception {           EventLoopGroup group = new NioEventLoopGroup();                       try {               Bootstrap bootstrap = new Bootstrap();               bootstrap.group(group)                        .channel(NioSocketChannel.class)                        .handler(new ChannelInitializer<SocketChannel>() {                            @Override                            protected void initChannel(SocketChannel ch) {                                ch.pipeline().addLast(                                    new StringDecoder(),                                    new StringEncoder(),                                    new SimpleChannelInboundHandler<String>() {                                        @Override                                        protected void channelRead0(                                                    ChannelHandlerContext ctx, String msg) {                                            System.out.println("服务端回复: " + msg);                                        }                                    })                                );                            }                        });                           // 连接服务端               ChannelFuture future = bootstrap.connect("127.0.0.1", 8080).sync();                           // 发送消息               BufferedReader reader = new BufferedReader(                   new InputStreamReader(System.in));               while (true) {                   String line = reader.readLine();                   if ("quit".equals(line)) break;                   future.channel().writeAndFlush(line);               }                           future.channel().closeFuture().sync();           } finally {               group.shutdownGracefully();           }       }   }  `

先启动服务端，再启动客户端，输入文字就能看到服务端回复了。

## 六、Netty 的适用场景

Netty 不只是一个网络框架，它是一个**基础设施**。看看哪些主流项目在用 Netty：

*   **Apache Dubbo / gRPC** — RPC 框架底层通信
    
*   **Apache RocketMQ / Kafka** — 消息中间件
    
*   **Spring WebFlux** — 响应式 Web 框架
    
*   **Elasticsearch** — 分布式搜索引擎节点通信
    
*   **ZooKeeper** — 分布式协调服务（3.6+ 可选 Netty）
    
*   **Hadoop / Spark** — 大数据框架的部分组件
    

基本上，只要是用 Java 做高并发网络通信的中间件，底层大概率就是 Netty。

## 七、下一篇预告

Netty 的核心灵魂是 **Reactor 线程模型**。下一篇我们深入 EventLoopGroup 和 EventLoop 的源码，看看 Netty 到底是怎么做到"一个线程管理上千个连接还不用加锁"的。

这是整个 Netty 源码分析中最关键的一篇，懂了线程模型，后面看 Pipeline、ByteBuf、内存分配都会轻松很多。

下次见！
