---
title: Netty源码分析(23) — 零拷贝机制详解
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484607&idx=1&sn=ab05acab1098719909f8d4a894ed7bb5&chksm=fe6ca5e5c91b2cf38784a3fc4b9b5b43556004c973f8b8e8beda861f1d5a69491d0fa0bd0fe9
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-23-zero-copy.md
asset_ref: Assets/2026/10/netty-23-zero-copy.md
---

# Netty源码分析(23) — 零拷贝机制详解

## 一、背景与问题

### 传统IO的性能瓶颈

先想一个场景：服务器要返回一个 2GB 的大文件给客户端。如果用传统 Java IO 实现，完整路径是：

```
磁盘 → 内核缓冲区(read) → 用户缓冲区(应用程序) → 内核缓冲区(write) → Socket
```

这中间经历了**四次数据拷贝**和**四次上下文切换**：

1.  `read()` 系统调用 → 用户态→内核态切换，DMA 把磁盘数据拷到内核缓冲区
    
2.  CPU 把内核缓冲区数据拷到用户缓冲区
    
3.  `write()` 系统调用 → 用户态→内核态切换，CPU 把用户数据拷到 Socket 内核缓冲区
    
4.  DMA 把 Socket 内核缓冲区数据拷到网卡发送
    

**数据在内存里被来回倒腾了 4 次**，CPU 被迫参与两次拷贝（步骤 2 和 3），白白浪费了算力。对于一个高吞吐的网络框架来说，这是不可接受的。

### 零拷贝的思想

零拷贝（Zero-Copy）的核心目标很简单：**避免 CPU 参与不必要的数据搬运**，让数据在「磁盘 → 内核 → 网卡」这条路上直达，别绕进用户空间绕一圈。

> **关键理解**：零拷贝不是说完全没有数据拷贝，而是指**没有 CPU 参与的数据拷贝**。DMA 拷贝不算"开销"——DMA 不占用 CPU 周期。

Netty 在零拷贝上做了四件事，我称它们为**四大零拷贝兵器**：

兵器

作用

FileRegion + sendfile

文件传输零拷贝

CompositeByteBuf

逻辑合并零拷贝

Unpooled.wrappedBuffer

包装数组零拷贝

DirectBuffer + 内存映射

堆外内存读写零拷贝

下面逐一深入源码。

## 二、核心源码分析

### 2.1 FileRegion — 文件传输零拷贝

FileRegion 是 Netty 对操作系统 `sendfile()` 系统调用的封装。这是最硬核的零拷贝——数据从磁盘直接到网卡，完全不经过用户空间。

来看看 Netty 4 中 `FileRegion` 接口的定义：

```
// io.netty.channel.FileRegionpublic interface FileRegion extends ReferenceCounted {    // 文件中的起始偏移    long position();       // 已经传输的字节数    long transferred();       // 总共要传输的字节数    long count();       // 将文件内容传输到目标 Channel    long transferTo(WritableByteChannel target, long position) throws IOException;       @Override    FileRegion retain() throws Exception;       @Override    boolean release() throws Exception;}
```

`DefaultFileRegion` 是默认实现，它委托给 `FileChannel.transferTo()`：

```
// io.netty.channel.DefaultFileRegionpublic class DefaultFileRegion extends AbstractReferenceCounted implements FileRegion {       private final FileChannel file;        // 文件通道    private final long position;            // 起始位置    private final long count;               // 传输字节数    private final boolean absolutePosition; // 是否绝对位置    private long transferred;               // 已经传输的    private FileChannel fileChannel;        // 实际打开的 FileChannel       @Override    public long transferTo(WritableByteChannel target, long position) throws IOException {        // 核心：直接调用 FileChannel.transferTo()        // 底层就是 Linux 的 sendfile() 系统调用        long count = this.count - position;        if (count <= 0) {            return 0;        }               if (target instanceof FileRegion fileRegion) {            // 目标也是 FileRegion → 特殊优化            count = Math.min(count, fileRegion.count());            count = ((FileRegion) target).transferTo(this, position);        } else {            // 标准路径：FileChannel.transferTo → sendfile            count = file.transferTo(this.position + position, count, target);        }               if (count > 0) {            transferred += count;        }        return count;    }}
```

实际写数据时，Netty 的 `NioSocketChannel` 会调用 `FileRegion.transferTo()`：

```
// io.netty.channel.nio.AbstractNioChannel.NioSocketChannelUnsafe// 在 doWrite 循环中处理 FileRegionprivate boolean doWriteInternal(ChannelOutboundBuffer in, Object msg) throws Exception {    if (msg instanceof FileRegion) {        // 关键分支：如果写入的是 FileRegion，走零拷贝路径        FileRegion region = (FileRegion) msg;        // 直接获取 Java NIO 的 SocketChannel        SocketChannel ch = javaChannel();               // 核心就在这里：region.transferTo(ch, region.transferred())        // 底层调用 FileChannel.transferTo(socketChannel,...)        // → Linux sendfile(file_fd, socket_fd)        long localFlushedAmount = region.transferTo(ch, region.transferred());               if (localFlushedAmount > 0) {            // 更新进度，返回true表示成功写了一些            in.progress(localFlushedAmount);            return true;        }        return false;    }    // ... 其他类型消息处理}
```

### 2.2 CompositeByteBuf — 逻辑合并零拷贝

传统场景：需要把**协议头 + 协议体**拼接在一起发送。常规做法是 new 一个新 byte\[\]，把两份数据拷到一起。**CompositeByteBuf 不用**——它维持一个 Component 列表，逻辑上把它们当作一个连续缓冲区。

```
// io.netty.buffer.CompositeByteBuf — 核心结构public class CompositeByteBuf extends AbstractReferenceCountedByteBuf {       // 内部组件列表，每个 Component 持有一个 ByteBuf    private final Component[] components;       // 这里的 Component 不是 ByteBuf 的复制，而是引用    // 读写时自动跳转到正确的组件       // 添加组件 — 零拷贝关键    public CompositeByteBuf addComponent(boolean increaseWriterIndex, ByteBuf buffer) {        checkNotNull(buffer, "buffer");        int cIndex = components.length;               // 扩容        Component[] newComponents = new Component[cIndex + 1];        System.arraycopy(components, 0, newComponents, 0, cIndex);        // 重点：直接持有 buffer 引用，不拷贝数据        newComponents[cIndex] = new Component(buffer.order(ByteOrder.BIG_ENDIAN));               components = newComponents;               if (increaseWriterIndex) {            writerIndex(writerIndex() + buffer.readableBytes());        }        return this;    }       @Override    public byte getByte(int index) {        // 根据 index 定位到对应的 Component        Component c = findComponent(index);        // 委托给 Component 内部的 ByteBuf        return c.buf.getByte(c.idx(index));    }       // 核心方法：定位某个 index 落在哪个 Component 上    // 使用二分查找提高效率    private Component findComponent(int index) {        Component c = null;        int componentCount = components.length;        // 二分查找        int low = 0;        int high = componentCount;        // ...        return components[componentId];    }       // 另一个关键：nioBuffers — 获取底层 NIO ByteBuffer 数组    // 用于直接传给 Channel.write    @Override    public ByteBuffer[] nioBuffers(int index, int length) {        // 返回各组件底层 NIO Buffer 的视图，仍无拷贝        // ...    }}
```

### 2.3 Unpooled.wrappedBuffer — 包装零拷贝

当我们需要把一个 `byte[]` 包装成 `ByteBuf` 时，Unpooled.wrappedBuffer 不拷数据，只包装：

```
// io.netty.buffer.Unpooledpublic static ByteBuf wrappedBuffer(byte[] array) {    // 不拷贝数组！直接包装    if (array.length == 0) {        return EMPTY_BUFFER;    }    return new UnpooledHeapByteBuf(ByteBufAllocator.DEFAULT, array, array.length);}// UnpooledHeapByteBuf 直接持有传入的数组public class UnpooledHeapByteBuf extends AbstractReferenceCountedByteBuf {    private byte[] array;  // 直接引用外部数组，没有拷贝       public UnpooledHeapByteBuf(ByteBufAllocator alloc, byte[] initialArray, int maxCapacity) {        super(maxCapacity);        this.alloc = alloc;        // **关键：直接存储引用，不 System.arraycopy**        setArray(initialArray);        setReaderIndex(0);        setWriterIndex(initialArray.length);    }}
```

### 2.4 DirectBuffer 与内存映射

Netty 的 `PooledDirectByteBuf` 和 `UnpooledDirectByteBuf` 内部使用 `DirectByteBuffer`（堆外内存），读写时 **Java 堆和 native 堆之间不需要拷贝**，因为本身就是 native 内存。

当使用 `FileChannel.map()`（内存映射文件）时，连内核到用户态的拷贝都省了：

```
// 搭配 FileRegion 让 Zero-Copy 更进一步// 内存映射文件 → 虚拟内存直接映射，应用直接读写文件内容就像读写内存MappedByteBuffer mappedFile = fileChannel.map(    FileChannel.MapMode.READ_ONLY, 0, fileSize);// Netty 通过 Unpooled.wrappedBuffer 包装 MappedByteBuffer// 不需要任何数据拷贝ByteBuf fileBuf = Unpooled.wrappedBuffer(mappedFile);
```

## 三、原理分析：从系统调用到设计模式

### 3.1 sendfile 系统调用

Linux 提供了 `sendfile()` 系统调用，是实现零拷贝的**王牌武器**：

```
#include <sys/sendfile.h>ssize_t sendfile(int out_fd, int in_fd, off_t *offset, size_t count);
```

**传统模式（四次拷贝）：**

```
磁盘 ──DMA─→ 内核缓冲区 ──CPU──→ 用户缓冲区 ──CPU──→ Socket缓冲区 ──DMA──→ 网卡
```

**sendfile 模式（两次拷贝）：**

```
磁盘 ──DMA─→ 内核缓冲区 ──DMA──→ 网卡
```

中间省掉了**两次 CPU 参与的拷贝**和**两次上下文切换**。

Linux 2.6.33+ 还引入了 `splice()`，可以在两个文件描述符之间零拷贝传输，甚至支持管道。

### 3.2 设计模式：策略模式 + 适配器模式

Netty 在处理 `FileRegion` 时体现了**策略模式**：

*   ChannelOutboundBuffer 在 flush 时，如果是普通 ByteBuf → 走 `SocketChannel.write(ByteBuffer)`
    
*   如果是 FileRegion → 走 `FileRegion.transferTo(SocketChannel)`
    

同一套 `doWrite()` 逻辑，根据消息类型选择不同策略，代码解耦得很漂亮。

同时 `DefaultFileRegion` 是 `FileChannel.transferTo()` 的**适配器**，把 Java NIO 的能力包装成 Netty 的 `Channel` 写入流水线的一部分。

### 3.3 CompositeByteBuf 的设计智慧

CompositeByteBuf 不是简单粗暴地合数据，而是**通过 Component 数组做「逻辑拼接」**：

```
[header bytes] + [body bytes]  =  CompositeByteBuf     │                │               │     ▼                ▼               ▼  Component0        Component1    逻辑上连续
```

读写时按 index 二分查找定位到 Component，性能开销只有 O(log n)。这在 HTTP chunked 传输、WebSocket 帧组装等场景中价值巨大。

## 四、使用示例

### 4.1 FileRegion 传输大文件

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;import io.netty.handler.logging.LogLevel;import io.netty.handler.logging.LoggingHandler;import java.io.RandomAccessFile;import io.netty.channel.DefaultFileRegion;public class ZeroCopyFileServer {       public static void main(String[] args) throws Exception {        EventLoopGroup bossGroup = new NioEventLoopGroup(1);        EventLoopGroup workerGroup = new NioEventLoopGroup();               try {            ServerBootstrap b = new ServerBootstrap();            b.group(bossGroup, workerGroup)             .channel(NioServerSocketChannel.class)             .handler(new LoggingHandler(LogLevel.INFO))             .childHandler(new ChannelInitializer<SocketChannel>() {                 @Override                 protected void initChannel(SocketChannel ch) {                     ch.pipeline().addLast(new FileServerHandler());                 }             });                       ChannelFuture f = b.bind(8080).sync();            System.out.println("文件服务器启动在 8080 端口");            f.channel().closeFuture().sync();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }       static class FileServerHandler extends ChannelInboundHandlerAdapter {        @Override        public void channelActive(ChannelHandlerContext ctx) {            System.out.println("客户端连接: " + ctx.channel().remoteAddress());        }               @Override        public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {            if (msg instanceof String) {                String fileName = (String) msg;                System.out.println("请求文件: " + fileName);                               RandomAccessFile raf = new RandomAccessFile(fileName, "r");                long fileLength = raf.length();                               // ★ 关键：使用 DefaultFileRegion → sendfile() 零拷贝                // 数据从磁盘到网卡，不经过用户空间！                DefaultFileRegion fileRegion = new DefaultFileRegion(                    raf.getChannel(), 0, fileLength                );                               // 发送文件内容                ChannelFuture sendFuture = ctx.writeAndFlush(fileRegion);                               // 传输完成后关闭资源                sendFuture.addListener((ChannelFutureListener) future -> {                    raf.close();                    System.out.println("文件传输完成: " + fileName);                });            }        }               @Override        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {            cause.printStackTrace();            ctx.close();        }    }}
```

### 4.2 CompositeByteBuf 组装消息

```
import io.netty.buffer.CompositeByteBuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.ByteBufAllocator;import io.netty.buffer.Unpooled;import io.netty.channel.ChannelHandlerContext;import io.netty.channel.ChannelOutboundHandlerAdapter;import io.netty.channel.ChannelPromise;import java.nio.charset.StandardCharsets;/** * CompositeByteBuf 零拷贝组装示例 * 模拟一个自定义协议：4字节魔数 + 1字节版本 + 4字节长度 + 消息体 */public class CompositeByteBufExample {       public static void main(String[] args) {        // 模拟：两个独立 ByteBuf 需要发送        ByteBuf header = Unpooled.buffer(9); // 魔数(4) + 版本(1) + 长度(4)        header.writeInt(0xCAFEBABE);         // 魔数        header.writeByte(1);                 // 版本        // 长度先空着，后续再填               String bodyContent = "Hello Netty Zero-Copy!";        ByteBuf body = Unpooled.copiedBuffer(bodyContent, StandardCharsets.UTF_8);               // 回填 body 长度到 header        header.writeInt(body.readableBytes());               // ★ 以前的做法：创建新缓冲区，把所有数据拷贝进去        ByteBuf oldWay = Unpooled.buffer(header.readableBytes() + body.readableBytes());        oldWay.writeBytes(header);   // 发生拷贝！        oldWay.writeBytes(body);     // 再次拷贝！        // header 和 body 各自都发生了内存复制               // ★ Netty 的做法：CompositeByteBuf 零拷贝        CompositeByteBuf zeroCopyWay = Unpooled.compositeBuffer();        // reset readerIndex for header since it was read by oldWay        header.readerIndex(0); // 重置以便再次使用        zeroCopyWay.addComponent(true, header);  // 没有拷贝！        zeroCopyWay.addComponent(true, body);    // 没有拷贝！        // 逻辑上连续，物理上还是两块独立内存               // 可以像普通 ByteBuf 一样读写        int magic = zeroCopyWay.readInt();        byte version = zeroCopyWay.readByte();        int length = zeroCopyWay.readInt();        byte[] content = new byte[length];        zeroCopyWay.readBytes(content);               System.out.println("魔数: 0x" + Integer.toHexString(magic));        System.out.println("版本: " + version);        System.out.println("长度: " + length);        System.out.println("内容: " + new String(content, StandardCharsets.UTF_8));               // zeroCopyWay 内部持有 header 和 body 的引用，无需释放额外资源        zeroCopyWay.release();    }}
```

### 4.3 ChannelPipeline 中零拷贝传输 FileRegion

```
import io.netty.channel.ChannelDuplexHandler;import io.netty.channel.ChannelHandlerContext;import io.netty.channel.ChannelPromise;import io.netty.channel.DefaultFileRegion;import java.io.RandomAccessFile;/** * 在 Pipeline 中正确处理 FileRegion — 必须使用 ChannelHandler.Sharable * 注意：FileRegion 不能经过多个 Handler 转换，否则零拷贝失效 */@ChannelHandler.Sharablepublic class FileTransferHandler extends ChannelDuplexHandler {       @Override    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise)            throws Exception {               if (msg instanceof FileTransferRequest) {            FileTransferRequest req = (FileTransferRequest) msg;                       // 打开文件，使用 FileRegion 零拷贝发送            RandomAccessFile raf = new RandomAccessFile(req.getPath(), "r");            DefaultFileRegion region = new DefaultFileRegion(                raf.getChannel(), 0, raf.length()            );                       // 写入时保证 FileRegion 对象不被篡改            // 如果还有业务 header，可以用 CompositeByteBuf 组合            ByteBuf header = ctx.alloc().buffer(4);            header.writeInt((int) raf.length());                       // 组合：header + file content (零拷贝)            ctx.write(header);     // 头部走普通路径            ctx.write(region, promise);   // 文件体走 sendfile            // promise 传给 region，完成后自动释放                       // ★ 重要！注册 listener 关闭文件            promise.addListener(future -> raf.close());                   } else {            // 普通消息走默认路径            ctx.write(msg, promise);        }    }}// 自定义请求对象class FileTransferRequest {    private final String path;    public FileTransferRequest(String path) { this.path = path; }    public String getPath() { return path; }}
```

## 五、注意事项

### 5.1 FileRegion 是单次使用的

`FileRegion` 一旦传输完成，其内部 `FileChannel` 的位置指针就不再有效。**不能重复使用同一个 FileRegion**。每次文件传输都要新建。

### 5.2 不要对 FileRegion 做编解码

如果 Pipeline 中有 ByteToMessageDecoder 之类的编解码器，碰到 `FileRegion` 类型要跳过，不要尝试解码。可以在解码器里判断类型：

```
@Overrideprotected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {    // 正常解码 ByteBuf}@Overridepublic void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {    if (msg instanceof FileRegion) {        // 跳过解码，直接往后传        ctx.fireChannelRead(msg);        return;    }    super.channelRead(ctx, msg);}
```

### 5.3 CompositeByteBuf 的读写位置管理要小心

CompositeByteBuf 的 `addComponent(boolean increaseWriterIndex, ByteBuf buffer)` 第二个参数决定是否更新 writerIndex。新手容易漏传。

还需要注意：多次 `addComponent` 后，如果删除中间某个 Component，其余 Component 的索引会自动调整——但 `readerIndex` 可能变得不合法，注意重置。

### 5.4 零拷贝并不是万能的

场景

推荐方案

大文件传输（>1MB）

FileRegion + sendfile

小数据包、频繁读写

DirectByteBuf + 池化

多段数据组装

CompositeByteBuf

固定协议编解码

还是需要的，零拷贝不解决语义解析

**FileRegion 在传输大文件时性能优势巨大，但对于小文件（几 KB）来说，传统拷贝的开销几乎可以忽略**——此时 more important 的是代码简洁性。

### 5.5 跨平台限制

`sendfile()` 是 Linux 系统调用。Windows 上 Netty 会 fallback 到传统方式。如果跨平台部署，要注意性能差异。Netty 的 `EpollEventLoop`（Native Transport）对 sendfile 的支持更好。

### 5.6 内存释放

所有 `ByteBuf` 都要 `release()`，特别是 `CompositeByteBuf`，它的 `release()` 会递归释放所有 Component。使用 `FileRegion` 时，`ChannelFutureListener` 里关闭文件是最稳妥的做法。

## 六、总结

Netty 的零拷贝不是单一的"银弹"，而是**一套组合拳**：

1.  **FileRegion → `sendfile()`** → 操作系统级文件传输零拷贝，大文件场景的绝对王者
    
2.  **CompositeByteBuf** → 逻辑拼接零拷贝，避免数据合并时的额外拷贝
    
3.  **Unpooled.wrappedBuffer** → 包装 byte\[\] 零拷贝，零开销将 Java 数组接入 Netty 体系
    
4.  **DirectBuffer（堆外内存）** → 从底层规避 JVM 堆与 Native 堆之间的拷贝
    

读 Netty 零拷贝源码给 R 最大的感受是：**"零拷贝"本质是对「数据路径」的设计**。不是说不拷贝，而是让数据走最短路径、让 CPU 只做它该做的事（协议解析、业务逻辑），不做它不该做的事（搬运数据）。

这也是 Netty 能在性能上碾压传统 BIO 的关键原因之一——把每一分 CPU 都花在刀刃上。

* * *

_（推荐自己画一下数据路径对比图：传统四次拷贝 vs sendfile 两次拷贝，一目了然。）_
