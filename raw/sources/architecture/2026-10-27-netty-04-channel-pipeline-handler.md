---
title: Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483934&idx=1&sn=9c175b4c2275a9fd373d8c0f1796c95e&chksm=fe6ca344c91b2a520287802d7341a8acb54949ff11cc24825350287dace4e1fe1e41990df886
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-netty-04-channel-pipeline-handler.md
asset_ref: Assets/2026/10/netty-04-channel-pipeline-handler.md
---

# Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客

> 深入解读Netty的Channel、ChannelPipeline和ChannelHandler三大核心组件，剖析Pipeline的事件传播机制与Handler的生命周期

> 图片说明：Netty 的 ChannelPipeline 责任链模型，入站事件从 Head 到 Tail 顺序传播，出站事件从 Tail 到 Head 反向传播。

## 引言

前几篇我们聊了 Netty 的线程模型，知道了 boss 负责 accept，worker 负责读写。但有一个问题我一直没想明白：**一个连接上来之后，数据是怎么在各个 handler 之间流转的？**

比如我写了一个服务端，加了日志 handler、编解码 handler、业务 handler，这三个 handler 的调用顺序是怎么保证的？是像 Servlet Filter 那样一个个链式调用吗？

今天我们就来彻底搞懂这件事。Netty 架构中最核心的三个组件——**Channel、ChannelPipeline、ChannelHandler**，我称之为"三剑客"。

## 一、三剑客的关系

先上一个宏观图：

`一个 Channel 对应一个 ChannelPipeline   一个 ChannelPipeline 包含一个双向链表（ChannelHandlerContext）   链表中的每个节点包装了一个 ChannelHandler   `

用代码来理解：

`// 服务端启动时，每个新连接都会创建：   // 1 个 NioSocketChannel   // 1 个 ChannelPipeline（自动创建）   // pipeline 里默认有 head 和 tail 两个节点   // 中间是我们通过 addLast/addFirst 添加的 handler   `

**三者的职责分工**：

*   **Channel**：代表一个网络连接（Socket），负责 IO 操作
    
*   **ChannelPipeline**：Handler 的容器，负责事件分发
    
*   **ChannelHandler**：处理具体业务逻辑的组件
    

## 二、ChannelPipeline 源码剖析

### 2.1 数据结构——双向链表

ChannelPipeline 的默认实现是 `DefaultChannelPipeline`，它的底层数据结构其实就是一个**双向链表**：

`public class DefaultChannelPipeline implements ChannelPipeline {           // 链表的头尾节点       final AbstractChannelHandlerContext head;       final AbstractChannelHandlerContext tail;           // 关联的 Channel       private final Channel channel;           // 构造函数：初始化带头尾节点的空链表       protected DefaultChannelPipeline(Channel channel) {           this.channel = channel;                   // 创建头尾节点，塞进默认的 handler           head = new HeadContext(this);           tail = new TailContext(this);                   // 头尾相连           head.next = tail;           tail.prev = head;       }   }  `

注意，这里 `head` 和 `tail` 并不是普通的 HandlerContext，它们是两个**特殊的内部类**：

节点

类型

作用

HeadContext

既是 inbound 又是 outbound

处理底层 IO 操作（读写）

TailContext

只处理 inbound

入站事件的终点，默认打印警告

### 2.2 addLast 方法——往链表加 Handler

`@Override   public final ChannelPipeline addLast(String name, ChannelHandler handler) {       return addLast(null, name, handler);   }  @Override   public final ChannelPipeline addLast(           EventExecutorGroup group, String name, ChannelHandler handler) {       final AbstractChannelHandlerContext newCtx;       synchronized (this) {           // 检查是否有同名 handler，防止重复           checkMultiplicity(handler);                   // 创建一个 Context 节点，包装 handler           newCtx = newContext(group, filterName(name, handler), handler);                   // 把新节点加到 tail 前面           addLast0(newCtx);       }       // 触发 handler 的 handlerAdded 回调       callHandlerAdded0(newCtx);       return this;   }  // 核心的链表插入操作   private void addLast0(AbstractChannelHandlerContext newCtx) {       // 把新节点插到 tail 前面       AbstractChannelHandlerContext prev = tail.prev;       newCtx.prev = prev;       newCtx.next = tail;       prev.next = newCtx;       tail.prev = newCtx;   }  `

这就是一个标准的双向链表尾插法。所以 handler 的添加顺序就是它们在 pipeline 里的顺序。

### 2.3 ChannelHandlerContext——链表的节点

每个 `ChannelHandlerContext` 包装了一个 handler，并保存了它在管道中的位置信息：

`public abstract class AbstractChannelHandlerContext implements ChannelHandlerContext {           volatile AbstractChannelHandlerContext next;  // 后继节点       volatile AbstractChannelHandlerContext prev;  // 前驱节点           private final boolean inbound;   // 是否处理入站事件       private final boolean outbound;  // 是否处理出站事件           private final ChannelPipeline pipeline;       private final String name;       // handler 的名字       private final boolean ordered;   // 是否需要在 EventLoop 中执行           // 真正的业务处理器       private final ChannelHandler handler;   }  `

每个 Context 有两个 boolean 标志位：`inbound` 和 `outbound`。这两个标志决定了这个 handler 会处理哪些事件。看源码怎么判断：

`// HeadContext 的构造函数   HeadContext(DefaultChannelPipeline pipeline) {       super(pipeline, null, HEAD_NAME, false, true);  // inbound=false, outbound=true       // 等等……Head 不是又要处理出站又要处理入站吗？       // 实际上它的 inbound 和 outbound 是通过重写方法来处理的   }  // TailContext 的构造函数     TailContext(DefaultChannelPipeline pipeline) {       super(pipeline, null, TAIL_NAME, true, false);  // inbound=true, outbound=false   }  `

等等，这有点奇怪——Head 为什么 outbound=true 但 inbound=false？Tail 又为什么 inbound=true 但 outbound=false？

别急，看下一节事件传播就明白了。

## 三、事件传播机制——入站与出站

这是 Netty 最精妙的设计之一：**入站事件和出站事件走不同的方向**。

### 3.1 入站事件（Inbound）

入站事件是指**数据从网络流入**：连接建立、数据可读、连接关闭等。

传播方向：**Head → Tail**（正向）

`// 入站事件的触发方法   // 比如 fireChannelRead：从当前节点开始，往后找下一个入站 handler  @Override   public ChannelPipeline fireChannelRead(Object msg) {       // 从 head 开始传播       abstractChannelHandlerContext.invokeChannelRead(head, msg);       return this;   }  `

看 `invokeChannelRead` 是怎么找下一个 handler 的：

`static void invokeChannelRead(final AbstractChannelHandlerContext next, Object msg) {       final AbstractChannelHandlerContext nextCtx = next.findContextInbound();  // 找下一个入站节点       // ...       nextCtx.invokeChannelRead(msg);   }  // 关键方法：沿着 next 指针往后找，直到找到一个 inbound 为 true 的节点   private AbstractChannelHandlerContext findContextInbound(int mask) {       AbstractChannelHandlerContext ctx = this;       do {           ctx = ctx.next;       } while ((ctx.executionMask & MASK_EXCEPTION_CAUGHT) == 0  // 跳过没有异常处理的                && (ctx.executionMask & mask) == 0);                   // 跳过不处理该事件的       return ctx;   }  `

所以入站事件的传播就是：**从 head 开始沿着 next 指针往前走，跳过不处理入站事件的节点，直到 tail。**

### 3.2 出站事件（Outbound）

出站事件是指**数据从应用流出到网络**：写数据、连接远端、关闭连接等。

传播方向：**Tail → Head**（反向）

`// 出站事件的触发方法   // 比如 write：从 tail 开始往前找下一个出站 handler  @Override   public ChannelFuture write(Object msg) {       return tail.write(msg);   }  // AbstractChannelHandlerContext.write   public ChannelFuture write(Object msg) {       return write(msg, newPromise());   }  private ChannelFuture write(Object msg, ChannelPromise promise) {       // 从当前节点开始，往前找下一个出站 handler       AbstractChannelHandlerContext next = findContextOutbound();       // ...       next.invokeWrite(msg, promise);       return promise;   }  // 沿着 prev 指针往前找，直到找到一个 outbound 为 true 的节点   private AbstractChannelHandlerContext findContextOutbound(int mask) {       AbstractChannelHandlerContext ctx = this;       do {           ctx = ctx.prev;       } while ((ctx.executionMask & mask) == 0);       return ctx;   }  `

### 3.3 一张图看懂

`入站事件（fireChannelRead）:  Head → H1 → H2 → H3 → Tail   出站事件（write）:            Head ← H1 ← H2 ← H3 ← Tail  其中：   Head  = 处理出站（写到底层 Socket） + 触发入站（读从底层 Socket 来）   Tail  = 入站终点（默认丢给 SimpleChannelInboundHandler 处理）   H1    = 可以是入站，也可以是出站，或两者都是  `

用个具体例子：你在 pipeline 里加了三个 handler：

`pipeline.addLast("logging",  new LoggingHandler());      // 日志   pipeline.addLast("codec",    new StringCodec());          // 编解码   pipeline.addLast("business", new BusinessHandler());      // 业务   `

链路结构：

`Head(l) ↔ logging(in) ↔ codec(in,out) ↔ business(in) ↔ Tail(in)   `

当收到数据时（入站）：

`Socket读事件 → Head → logging → codec → business → Tail(空)   `

当写数据时（出站，比如 ctx.write）：

`Tail → [跳过business，因为它不是outbound] → codec(编码) →    [跳过logging，因为它不是outbound] → Head(写入Socket)   `

这个设计我当初理解了很久才想明白。**Handler 不需要同时关心进出两个方向**，只关心自己需要的方向就好，Netty 会自动帮你找到正确的前进路径。

## 四、ChannelHandler 接口与生命周期

### 4.1 接口体系

`public interface ChannelHandler {       // 当 handler 被添加到 pipeline 时回调       void handlerAdded(ChannelHandlerContext ctx) throws Exception;           // 当 handler 从 pipeline 移除时回调       void handlerRemoved(ChannelHandlerContext ctx) throws Exception;   }  // 入站处理器   public interface ChannelInboundHandler extends ChannelHandler {       void channelRegistered(ChannelHandlerContext ctx);       // Channel 注册到 EventLoop       void channelUnregistered(ChannelHandlerContext ctx);     // Channel 取消注册       void channelActive(ChannelHandlerContext ctx);           // Channel 活跃（连接建立）       void channelInactive(ChannelHandlerContext ctx);         // Channel 不活跃（连接关闭）       void channelRead(ChannelHandlerContext ctx, Object msg);  // 有数据可读       void channelReadComplete(ChannelHandlerContext ctx);      // 读取完成       void userEventTriggered(ChannelHandlerContext ctx, Object evt);  // 用户自定义事件       void channelWritabilityChanged(ChannelHandlerContext ctx);       // 可写性变化       void exceptionCaught(ChannelHandlerContext ctx, Throwable cause); // 异常   }  // 出站处理器   public interface ChannelOutboundHandler extends ChannelHandler {       void bind(ChannelHandlerContext ctx, SocketAddress local, ChannelPromise promise);       void connect(ChannelHandlerContext ctx, SocketAddress remote, SocketAddress local, ChannelPromise promise);       void disconnect(ChannelHandlerContext ctx, ChannelPromise promise);       void close(ChannelHandlerContext ctx, ChannelPromise promise);       void deregister(ChannelHandlerContext ctx, ChannelPromise promise);       void read(ChannelHandlerContext ctx);       void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise);       void flush(ChannelHandlerContext ctx);   }  `

### 4.2 常用适配器类

直接实现接口太麻烦，Netty 提供了几个适配器：

`// 最常用的入站处理器，自动释放资源   public abstract class SimpleChannelInboundHandler<I> extends ChannelInboundHandlerAdapter {       // 自动释放消息（不需要调用 ReferenceCountUtil.release）   }  // 入站 + 出站一体   public class ChannelDuplexHandler extends ChannelInboundHandlerAdapter                                     implements ChannelOutboundHandler {       // 可以实现同时处理入站和出站事件   }  `

**`SimpleChannelInboundHandler`** 我天天用，它的好处是帮你自动释放 ByteBuf。如果你用 `ChannelInboundHandlerAdapter`，必须手动 `release()` 否则内存泄漏。

### 4.3 Handler 生命周期实战

`public class LifecycleHandler extends ChannelInboundHandlerAdapter {           @Override       public void handlerAdded(ChannelHandlerContext ctx) {           System.out.println("Handler 被添加到 Pipeline");       }           @Override       public void channelRegistered(ChannelHandlerContext ctx) {           System.out.println("Channel 注册到 EventLoop");           ctx.fireChannelRegistered();  // 继续传播       }           @Override       public void channelActive(ChannelHandlerContext ctx) {           System.out.println("TCP 连接建立");           ctx.fireChannelActive();       }           @Override       public void channelRead(ChannelHandlerContext ctx, Object msg) {           System.out.println("收到数据: " + msg);           ctx.fireChannelRead(msg);  // 传给下一个 Handler       }           @Override       public void channelInactive(ChannelHandlerContext ctx) {           System.out.println("TCP 连接关闭");           ctx.fireChannelInactive();       }           @Override       public void handlerRemoved(ChannelHandlerContext ctx) {           System.out.println("Handler 从 Pipeline 移除");       }           @Override       public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {           System.out.println("发生异常: " + cause.getMessage());           ctx.fireExceptionCaught(cause);       }   }  `

注意每个回调里都调用了 `ctx.fireXxx()`。**如果不调，事件传播就断在这里了**。这是新手最容易犯的错——写了 `channelRead` 但不调 `fireChannelRead`，后面的 handler 就收不到数据了。

## 五、ctx.write 与 channel.write 的区别

这又是一个经典坑点。来看代码：

`// 方式1：从 pipeline 的 tail 开始写出站事件   channel.write(msg);   // 等价于：   pipeline.tail.write(msg);   // 会经过 pipeline 里所有出站 handler  // 方式2：从当前 handler 的下一个出站 handler 开始   ctx.write(msg);   // 不会经过当前 handler 之前的出站 handler  // 如果当前 handler 是最后一个出站 handler，就直接到 head 了  // 方式3：从当前 handler 的下一个出站 handler 开始，且立即 flush   ctx.writeAndFlush(msg);  `

看个具体场景：

`pipeline: Head(out) → LoggingHandler(out) → EncodeHandler(out) → BusinessHandler(in) → Tail(in)   `

*   `channel.write(msg)`：从 tail 开始 → 跳过 BusinessHandler(in) → EncodeHandler → LoggingHandler → Head → 写 Socket
    
*   `BusinessHandler.ctx.write(msg)`：从 BusinessHandler 的下一个出站开始 → EncodeHandler → LoggingHandler → Head → 写 Socket
    
*   `BusinessHandler.ctx.channel().write(msg)`：等价于 channel.write → 从 tail 开始
    

所以如果你在 BusinessHandler 里写 `ctx.writeAndFlush(msg)`，日志 handler 是能 capture 到这个写操作的；但如果你直接操作底层 ByteBuf 绕过 pipeline，日志就抓不到了。

## 六、完整可运行的示例

写个完整的服务端，展示 pipeline 的配置和事件传播：

`import io.netty.bootstrap.ServerBootstrap;   import io.netty.buffer.ByteBuf;   import io.netty.buffer.Unpooled;   import io.netty.channel.*;   import io.netty.channel.nio.NioEventLoopGroup;   import io.netty.channel.socket.SocketChannel;   import io.netty.channel.socket.nio.NioServerSocketChannel;   import io.netty.util.CharsetUtil;  public class PipelineDemoServer {           public static void main(String[] args) throws Exception {           EventLoopGroup boss = new NioEventLoopGroup(1);           EventLoopGroup worker = new NioEventLoopGroup();                       try {               ServerBootstrap b = new ServerBootstrap();               b.group(boss, worker)                .channel(NioServerSocketChannel.class)                .childHandler(new ChannelInitializer<SocketChannel>() {                    @Override                    protected void initChannel(SocketChannel ch) {                        ChannelPipeline p = ch.pipeline();                                                // 1. 日志 handler（入站 + 出站）                        p.addLast("log", new ChannelDuplexHandler() {                            @Override                            public void channelRead(ChannelHandlerContext ctx, Object msg) {                                System.out.println("[LOG] 收到数据");                                ctx.fireChannelRead(msg);  // 继续传                            }                                                            @Override                            public void write(ChannelHandlerContext ctx,                                              Object msg, ChannelPromise promise) {                                System.out.println("[LOG] 写出数据");                                ctx.write(msg, promise);  // 继续传                            }                        });                                                // 2. 字符串编解码 handler（入站 + 出站）                        p.addLast("codec", new ChannelDuplexHandler() {                            @Override                            public void channelRead(ChannelHandlerContext ctx, Object msg) {                                ByteBuf buf = (ByteBuf) msg;                                String str = buf.toString(CharsetUtil.UTF_8);                                System.out.println("[CODEC] 解码: " + str.trim());                                ctx.fireChannelRead(str.trim());                            }                                                            @Override                            public void write(ChannelHandlerContext ctx,                                              Object msg, ChannelPromise promise) {                                if (msg instanceof String) {                                    ByteBuf buf = Unpooled.copiedBuffer(                                        (String) msg, CharsetUtil.UTF_8);                                    ctx.write(buf, promise);                                } else {                                    ctx.write(msg, promise);                                }                            }                        });                                                // 3. 业务 handler（只入站）                        p.addLast("business", new SimpleChannelInboundHandler<String>() {                            @Override                            protected void channelRead0(ChannelHandlerContext ctx, String msg) {                                System.out.println("[BIZ] 处理业务: " + msg);                                ctx.writeAndFlush("Server echo: " + msg);                            }                        });                    }                });                           ChannelFuture f = b.bind(8888).sync();               System.out.println("PipelineDemoServer 启动，端口: 8888");               System.out.println("Pipeline 链路长度: 3 个自定义 Handler + Head + Tail = 5 个节点");                           f.channel().closeFuture().sync();           } finally {               boss.shutdownGracefully();               worker.shutdownGracefully();           }       }   }  `

用 telnet 测试：

`telnet localhost 8888   # 输入 hello 回车   # 服务端输出：   # [LOG] 收到数据   # [CODEC] 解码: hello   # [BIZ] 处理业务: hello   # [LOG] 写出数据   `

## 七、核心要点总结

1.  **Pipeline 是双向链表**：head 和 tail 是特殊节点，中间是用户添加的 handler
    
2.  **入站事件正向传播**（Head → Tail），**出站事件反向传播**（Tail → Head）
    
3.  **每个 Context 标记了 inbound/outbound**，事件传播时只经过匹配的节点
    
4.  **ctx.write 从当前节点出发**，**channel.write 从 tail 出发**，路径不同
    
5.  **不调 fireXxx 事件就断了**，后面的 handler 收不到
    
6.  **SimpleChannelInboundHandler 自动释放资源**，ChannelInboundHandlerAdapter 需要手动释放
    

下一期聊 **Netty 的数据容器——ByteBuf**，Netty 为什么要自己搞一套 byte 缓冲区？DirectBuffer 又好在哪？

* * *

> **文中源码基于 Netty 4.1.x**，不同版本可能有细微差异。 关键源码位置：`io.netty.channel.DefaultChannelPipeline`、`io.netty.channel.AbstractChannelHandlerContext`
