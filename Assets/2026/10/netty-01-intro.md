# Netty源码分析(1) — 开篇：Netty到底是什么，凭什么成为Java网络编程的事实标准？

## 一、先扔个问题

用过 Dubbo 吗？用过 Spring Cloud Gateway 吗？用过 gRPC 吗？用过 RocketMQ 吗？

这些"Java 生态半壁江山"级别的组件，底层都依赖同一个网络通信框架 —— **Netty**。

更狠的是，很多人天天用 Netty，但从没见过它的源码。今天开始，我带你把 Netty 的源码从里到外翻一遍。

## 二、从 BIO 到 Netty —— 一段网络编程的进化史

### 2.1 上古时代：BIO（Blocking I/O）

`// 经典的 BIO 服务端——你肯定见过   ServerSocket serverSocket = new ServerSocket(8080);   while (true) {       Socket socket = serverSocket.accept();  // 阻塞！没有连接就堵在这里       new Thread(() -> {           try {               BufferedReader reader = new BufferedReader(                   new InputStreamReader(socket.getInputStream()));               String line = reader.readLine();  // 又阻塞！没数据就等着               // ... 处理业务           } catch (IOException e) { ... }       }).start();   }   `

**有什么问题？**

*   每个连接需要一个线程，1000 个连接 = 1000 个线程
    
*   线程的创建/销毁/切换开销巨大
    
*   大部分线程其实在"等数据"，白白浪费 CPU 时间片
    
*   连接数稍高（比如 1 万），系统直接崩溃 —— 线程栈溢出、OOM
    

我见过一个老项目，上线当天 300 个并发，服务器直接挂了。一查就是 BIO 模型，accept 一个连接 new 一个线程，线程数飙到 300+，上下文切换把 CPU 打满。

### 2.2 进化：NIO（Non-blocking I/O）—— JDK 1.4 的革命

JDK 1.4 引入了 `java.nio` 包，核心思想是一个线程可以管理多个连接。

`// NIO 的核心：Selector + Channel   Selector selector = Selector.open();   ServerSocketChannel ssc = ServerSocketChannel.open();   ssc.configureBlocking(false);  // 非阻塞模式！   ssc.register(selector, SelectionKey.OP_ACCEPT);  while (true) {       selector.select();  // 阻塞，但有连接/数据到达时返回       Set<SelectionKey> keys = selector.selectedKeys();       for (SelectionKey key : keys) {           if (key.isAcceptable()) {               // 处理新连接           } else if (key.isReadable()) {               // 读取数据           }       }   }  `

**进步在哪里？**

*   一个线程通过 Selector 管理上千连接
    
*   只在有事件到达时才处理，不空转
    
*   资源消耗大大降低
    

**但 JDK NIO 的问题也不少：**

1.  **API 太原始** —— 直接操作 ByteBuffer 和 SelectionKey，稍不注意就写错
    
2.  **Selector 空轮询 BUG** —— JDK 的 select() 在 Linux 上有个经典 BUG，没有事件时也会返回（epoll 空轮询），导致 CPU 100%
    
3.  **拆包粘包自己处理** —— TCP 是流式协议，业务消息边界要自己拼
    
4.  **没有统一的编解码框架** —— 序列化/反序列化靠手写
    
5.  **ByteBuffer 难用** —— position/limit 玩得人头大
    

我当时用 JDK NIO 写过一个简单的 RPC 框架，花了两周时间，踩坑无数。最崩溃的就是那个 epoll 空轮询 BUG——服务跑着跑着 CPU 就飙到 100%，查了半天以为是业务代码的问题。

### 2.3 终局：Netty 登场

Netty 就是来解决上面所有问题的。它把 NIO 的那些坑全给填了，还给了一套漂亮的 API。

`// Netty 的 EchoServer——看看有多简单   public class EchoServer {       public static void main(String[] args) {           EventLoopGroup bossGroup = new NioEventLoopGroup(1);           EventLoopGroup workerGroup = new NioEventLoopGroup();           try {               ServerBootstrap b = new ServerBootstrap();               b.group(bossGroup, workerGroup)                .channel(NioServerSocketChannel.class)                .childHandler(new ChannelInitializer<SocketChannel>() {                     @Override                     public void initChannel(SocketChannel ch) {                         ch.pipeline().addLast(new EchoServerHandler());                     }                });               ChannelFuture f = b.bind(8080).sync();               f.channel().closeFuture().sync();           } finally {               bossGroup.shutdownGracefully();               workerGroup.shutdownGracefully();           }       }   }  // Handler —— 只需要关注业务逻辑   public class EchoServerHandler extends ChannelInboundHandlerAdapter {       @Override       public void channelRead(ChannelHandlerContext ctx, Object msg) {           ctx.write(msg);  // 读到了什么，写回什么       }       @Override       public void channelReadComplete(ChannelHandlerContext ctx) {           ctx.flush();       }       @Override       public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {           cause.printStackTrace();           ctx.close();       }   }  `

看到了吗？20 行代码就搞了一个完整的 TCP 服务端。BIO 版本虽然也写不了几行，但扛不住并发；NIO 版本虽然能扛并发，但代码量翻好几倍还容易写错。Netty 把 **"简单易用"** 和 **"高性能高并发"** 这两个矛盾的东西统一了。

## 三、Netty 的架构设计（一张图看完全局）

`┌─────────────────────────────────────────────────────────────┐   │                          Netty                                │   ├─────────────────────────────────────────────────────────────┤   │  Core Layer (核心层)                                          │   │  ┌──────────────┬──────────────┬──────────────────────┐      │   │  │    Channel    │   EventLoop  │  ChannelPipeline      │     │   │  │  NioSocket.. │ NioEventLoop │ DefaultChannelPipeline│    │   │  └──────────────┴──────────────┴──────────────────────┘    │   ├─────────────────────────────────────────────────────────────┤   │  Transport Layer (传输层)                                      │   │  NIO  │  Epoll  │  KQueue  │  OIO  │  Unix Socket  │ ...     │   ├─────────────────────────────────────────────────────────────┤   │  Buffer Layer (缓冲层)                                         │   │  ByteBuf  │  PooledByteBuf  │  CompositeByteBuf               │   │  直接内存管理 · 内存池 · 零拷贝                                  │   ├─────────────────────────────────────────────────────────────┤   │  Codec Layer (编解码层)                                        │   │  ByteToMessageDecoder  │  MessageToByteEncoder                │   │  LengthFieldBasedFrameDecoder  │  ProtobufCodec ...           │   ├─────────────────────────────────────────────────────────────┤   │  Transport Protocol (传输协议)                                  │   │  HTTP  │  HTTP/2  │  WebSocket  │  DNS  │  MQTT  │ ...       │   └─────────────────────────────────────────────────────────────┘   `

## 四、Netty 为什么快？先剧透几个关键点

### 4.1 高效的线程模型（Reactor 模式）

Netty 的主从多线程 Reactor 模型：

*   **Boss Group**：一个线程，专门接受新连接
    
*   **Worker Group**：多个线程，处理已连接的读写事件
    
*   每个 Worker 线程有自己的 Selector，管理一批 Channel
    
*   避免了传统 BIO 的一连接一线程
    

### 4.2 零拷贝

以 `FileRegion` 为例，Netty 可以直接利用 `sendfile()` 系统调用，把文件数据从磁盘 → 网卡，不需要经过用户态缓冲区：

`// 零拷贝发送文件   FileRegion region = new DefaultFileRegion(       new FileInputStream("bigfile.txt").getChannel(), 0, fileLength);   ctx.writeAndFlush(region);   `

这里面省掉了：内核 → 用户 → 内核的两次数据拷贝。对大文件传输来说，性能差距是数量级的。

### 4.3 直接内存 + 内存池

*   直接内存（Direct Memory）：绕过堆，直接在堆外分配，IO 操作少一次拷贝
    
*   内存池（PooledByteBufAllocator）：复用 ByteBuf，减少 GC 压力
    

### 4.4 更多值得一提的优化

优化点

说明

Selector 空轮询 BUG 修复

自旋计数器 + 重建 Selector

FastThreadLocal

比 JDK ThreadLocal 更快

MpscLinkedQueue

多生产者单消费者的无锁队列

HashedWheelTimer

高效时间轮算法

伙伴分配算法

Netty 内存池的底层核心

## 五、你好，Netty 源码

作为开篇，我带你在源码里瞄一眼 `ServerBootstrap.bind(8080)` 到底做了什么？

`// 从 ServerBootstrap.bind() 开始   public ChannelFuture bind(int inetPort) {       return bind(new InetSocketAddress(inetPort));   }  public ChannelFuture bind(SocketAddress localAddress) {       // 校验必要参数       validate();       return doBind(ObjectUtil.checkNotNull(localAddress, "localAddress"));   }  private ChannelFuture doBind(final SocketAddress localAddress) {       // 第一步：初始化并注册 Channel       final ChannelFuture regFuture = initAndRegister();           final Channel channel = regFuture.channel();       if (regFuture.isDone()) {           // 注册已完成，直接绑定           doBind0(regFuture, channel, localAddress, regFuture);       } else {           // 注册还没完成，加监听等注册完成后再绑定           regFuture.addListener(new ChannelFutureListener() {               @Override               public void operationComplete(ChannelFuture future) {                   doBind0(regFuture, channel, localAddress, future);               }           });       }       return regFuture;   }  `

看到那个 `initAndRegister()` 了吗？它干了两件事：

1.  **init**：通过反射创建 `NioServerSocketChannel`，初始化 pipeline 和选项
    
2.  **Register**：把 Channel 注册到 Boss EventLoop 的 Selector 上
    

而 `doBind0()` 才是真正调用 `java.nio.channels.ServerSocketChannel.bind()` 的地方。

## 六、怎么跑 Netty 源码（实操指南）

要想读懂 Netty 源码，最好能边看边调试。推荐三个方式：

### 方式一：官方源码（最推荐）

`git clone https://github.com/netty/netty.git   cd netty   # 用 IntelliJ 打开，找到 example 模块   # example 里有 echo、telnet、http 等各种示例   `

### 方式二：Maven 引入，看源码注释

`<dependency>       <groupId>io.netty</groupId>       <artifactId>netty-all</artifactId>       <version>4.2.0.Final</version>   </dependency>   `

在 IDEA 里按住 `Ctrl` 点进去就能看源码、加断点调试。

### 方式三：在线看（quick peek 用）

https://github.com/netty/netty

## 七、结尾

Netty 在我眼里就是 **Java 网络编程的尽头**。不管是 JDK 源码里的 `ArrayList`、`ConcurrentHashMap`，还是 JUC 工具类，它们最终都会被用到像 Netty 这样的工业级框架里。

这篇开篇算是一个引子，下一篇咱们直接上手抠源码。

* * *

> 本系列配套源码环境：Netty 4.2.x（最新稳定版），JDK 17+
