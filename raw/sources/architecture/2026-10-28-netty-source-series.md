---
title: Netty 源码系列合集（28篇，公众号「程序员行一」）
source: 微信公众号·程序员行一（合集页）
source_url: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3NzQ1MTI4OQ==&action=getalbum&album_id=1946733195882708993
source_type: 合集
platform: 微信公众号
captured: 2026-10-28
registered_at: 2026-10-31
inbox_ref: Inbox/2026-10-28-netty-source-series-album.md
asset_ref: Assets/2026/10/netty-source-series-full.md
---

# Netty 源码系列合集・全 28 篇正文

> 公众号「程序员行一」｜合集页：https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3NzQ1MTI4OQ==&action=getalbum&album_id=1946733195882708993
> 抓取时间：2026-10-28，按合集顺序排列（倒序编号，第 1 篇为最新）。


---

## 28. Netty HTTP/1.1 编解码源码：请求如何在 Pipeline 中被拆装（源码系列第17篇） 28. Netty HTTP/1.1 编解码源码：请求如何在 Pipeline 中被拆装（源码系列第17篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489617&idx=1&sn=59f4ec76a55c84f6b9bb665df5d1a1e3&chksm=eb675f27dc10d631b401de5656b63d31120472bd191817952f473a2712a81c0f0d56c2ede9a2

> Netty 不会天然把一个 HTTP 请求变成一个 `FullHttpRequest`。`HttpServerCodec` 的入站 Decoder 按状态机产出 `HttpRequest`、若干 `HttpContent` 和 `LastHttpContent`，出站 Encoder 再把响应对象编码成字节；`HttpObjectAggregator` 只是可选的聚合层，用内存换取完整消息接口，并且必须设置上限。

HTTP/1.1 建立在 TCP 字节流上，同样存在半包、粘包和一次 read 包含多条消息的问题。除此之外，它还有请求行、Header、固定长度 Body、Chunked Body、100-continue、keep-alive 和 pipelining 等协议状态。一个健壮的 HTTP Codec 必须把这些状态逐步解析，不能假设一次 Socket read 就是一条请求。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点模块：`codec-http`
    
*   • 重点类与方法：`HttpServerCodec`、`HttpObjectDecoder.decode`、`readHeaders`、`HttpObjectEncoder.encode`
    
*   • 官方源码：https://github.com/netty/netty/tree/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http
    


这张图展示了双向结构：入站字节先经过 `HttpRequestDecoder`，按对象流传播；可选 Aggregator 把多个对象聚成完整请求；业务返回 `HttpResponse` 和 Content，出站 `HttpResponseEncoder` 逆向编码。入站与出站共用一个 `HttpServerCodec` 外壳，但内部是两个 Handler。

## 1\. HttpServerCodec 是入站 Decoder 与出站 Encoder 的组合

`HttpServerCodec` 继承 `CombinedChannelDuplexHandler`。构造时把请求解码器和响应编码器组合起来：

`public HttpServerCodec(HttpDecoderConfig config) {       init(new HttpServerRequestDecoder(config),         new HttpServerResponseEncoder());   }`

这说明服务端两个方向的职责不同：

*   • 入站：`ByteBuf -> HttpRequest/HttpContent`；
    
*   • 出站：`HttpResponse/HttpContent -> ByteBuf`。
    

Pipeline 的方向规则仍与第 7 篇一致。请求从 Head 向 Tail 找入站 Handler，响应从当前 Context 向 Head 找出站 Handler。业务若在 Codec 之前调用 `ctx.write`，可能跳过响应 Encoder；初始化时应让协议 Codec 位于业务 Handler 前面。

## 2\. Decoder 首先解析 initial line，再进入 Header 状态

`HttpObjectDecoder` 继承 `ByteToMessageDecoder`，内部状态机大致包括：

`SKIP_CONTROL_CHARS     -> READ_INITIAL     -> READ_HEADER     -> READ_FIXED_LENGTH_CONTENT     -> READ_VARIABLE_LENGTH_CONTENT     -> READ_CHUNK_SIZE     -> READ_CHUNKED_CONTENT     -> READ_CHUNK_DELIMITER     -> READ_CHUNK_FOOTER`

`decode()` 在 `READ_INITIAL` 阶段解析请求行：

`METHOD SP URI SP VERSION CRLF`

例如：

`POST /orders HTTP/1.1`

输入不足时状态机保留当前进度，等待下次 ByteBuf 累积。解析成功后创建 `HttpMessage`，再调用 `readHeaders(buffer)` 读取 Header。它不是对整段字符串做一次 split，而是受长度上限约束地增量解析。

## 3\. Header 结束后，消息体边界由协议字段决定

Header 解析完成后，Decoder 根据状态和字段选择 Body 读取方式：

条件

解码路径

产出

没有 Body

直接结束消息

`HttpRequest`

 + `LastHttpContent`

`Content-Length: N`

固定长度读取

一个或多个 `HttpContent`

`Transfer-Encoding: chunked`

Chunk 状态机

多个 Chunk + Last

连接关闭界定

可变长度读取

直到关闭

`Content-Length` 与 `Transfer-Encoding` 的组合必须严格校验，否则容易形成请求走私：前置代理和后端若对边界理解不同，同一串字节会被切成不同请求。实际部署必须保持 Netty 版本和代理安全策略更新，并避免在业务 Handler 中自行“修复”模糊报文。

## 4\. Decoder 产出的是对象流，不保证完整请求

默认情况下，一次带 Body 的请求在 Pipeline 中类似：

`HttpRequest   HttpContent   HttpContent   LastHttpContent`

这样设计能流式处理大 Body，避免等待整条消息进入内存。文件上传、代理转发和大模型流式输入都更适合逐块消费。

业务 Handler 必须管理对象生命周期：`HttpContent` 持有引用计数 ByteBuf，消费后需要释放，转交下游则由下一层接管。使用 `SimpleChannelInboundHandler<HttpObject>` 可以在约定范围内自动释放，但若 retain 后异步使用，仍要确保最终 release。

## 5\. HttpObjectAggregator 用便利换内存

加入：

`pipeline.addLast(new HttpServerCodec());   pipeline.addLast(new HttpObjectAggregator(1024 * 1024));   pipeline.addLast(new BusinessHandler());`

业务将收到 `FullHttpRequest`，Header 和完整 Body 在一个对象中，普通 JSON API 编程更简单。但聚合意味着：在完整 Body 到达之前，连接持有累积内存。

`maxContentLength` 是安全边界，不是随手写个很大数字。估算总风险：

`峰值聚合内存 ≈ 并发上传连接数 × 单连接允许 Body 上限`

如果 1 万连接都允许聚合 10MB，理论风险远超常规堆和直接内存容量。大文件应流式落盘或转发，不应进 Aggregator。

## 6\. 解码限制是协议防线，不只是性能参数

`HttpDecoderConfig` 可以配置请求行、Header、Chunk 等限制。至少关注：

*   • `maxInitialLineLength`：限制 URI 和请求行；
    
*   • `maxHeaderSize`：限制全部 Header；
    
*   • `maxChunkSize`：控制单次产出的 Content 大小；
    
*   • Header 校验与重复 Content-Length 策略；
    
*   • Chunk 扩展与 Trailer 限制。
    

限制过小会拒绝合法请求，过大则给慢速攻击和内存消耗留下空间。应根据网关规范、业务最大 Cookie/JWT、追踪 Header 和上传协议设定，并在边缘代理与 Netty 服务保持一致。

## 7\. Encoder 需要知道响应是否包含 Body

出站通常写：

`FullHttpResponse response = new DefaultFullHttpResponse(       HTTP_1_1, OK, content);   response.headers().set(CONTENT_LENGTH, content.readableBytes());   ctx.writeAndFlush(response);`

`HttpResponseEncoder` 根据状态码、方法语义和 Header 决定是否编码 Body，以及采用固定长度还是 chunked。`HEAD`、`204`、`304` 等响应不能简单按普通 Body 处理。

`HttpServerCodec` 的 request decoder 还会记录请求方法队列，响应 encoder 可据此正确处理 HEAD 等语义。HTTP/1.1 同一连接上的请求和响应顺序不能随意打乱，否则方法与响应边界会错配。

## 8\. Keep-Alive 依赖消息边界与连接策略共同成立

HTTP/1.1 默认倾向持久连接，但前提是双方能准确知道一条消息何时结束。若响应既没有 Content-Length，也没有 chunked，往往只能靠关闭连接界定 Body，连接就无法继续复用。

服务端通常：

`boolean keepAlive = HttpUtil.isKeepAlive(request);   if (keepAlive) {       response.headers().set(CONNECTION, KEEP_ALIVE);       ctx.writeAndFlush(response);   } else {       ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);   }`

关闭动作绑定写 Future，确保响应有机会先发出。若直接 `ctx.close()`，缓冲中的最后响应可能被截断。

## 9\. HTTP Pipelining 仍要求响应顺序

客户端可以在前一个响应返回前发送后续请求。Decoder 能连续产出多个请求，但业务若把请求并发分发到线程池，完成顺序可能改变。

HTTP/1.1 同连接响应必须保持请求顺序。解决方式包括：

*   • 同连接串行处理；
    
*   • 为请求编号，完成后按序写回；
    
*   • 限制或禁用 pipelining；
    
*   • 使用 Netty 对应的 pipelining Handler；
    
*   • 在协议层升级到支持多路复用的 HTTP/2。
    

只保证 EventLoop 上 write 串行，不代表业务异步结果按请求顺序回来。顺序控制必须显式设计。


图中第一次 read 可能只有半条请求行，Decoder 不产出对象；后续字节补齐 Header 后先产出 HttpRequest，再逐块产出 Content，LastHttpContent 标记消息边界。响应对象沿出站方向经过 Encoder，最终才成为 Socket 字节。

## 10\. 慢请求会同时占连接、定时器与累积内存

攻击者可以非常慢地发送请求行、Header 或 Body，让连接长期占用资源。仅设置最大长度不够，因为对方可以永远不达到上限。

Pipeline 通常还需要：

*   • 读超时/请求头超时；
    
*   • Header 和 Body 长度上限；
    
*   • 单 IP 连接和并发请求限制；
    
*   • Aggregator 上限或流式处理；
    
*   • 写侧背压；
    
*   • 全局有界业务队列。
    

IdleStateHandler 可以提供底层读空闲信号，但“请求头必须在 5 秒内完整到达”是更具体的协议 deadline，应由 HTTP 层定时器或网关策略实现。

## 11\. HTTP 排障应沿对象边界定位

现象

观察点

常见根因

业务收不到请求

Decoder 是否产出 HttpRequest

请求行/Header 不完整或超限

收到 Request 没有 Body

是否继续处理 HttpContent

误以为默认 FullHttpRequest

直接内存增长

Aggregator/Content 是否释放

慢 Body 或引用计数泄漏

Keep-Alive 第二请求失败

前一响应边界是否完整

Content-Length/LastContent 错误

响应顺序错

是否异步并发处理 pipelining

缺少按连接排序

400/413 激增

Decoder/Aggregator 限制

客户端异常或攻击流量

抓包能证明线上字节，Pipeline 日志能证明对象传播，两者结合才能判断问题在网络边界、Codec 还是业务 Handler。

## 12\. HTTP Codec 的核心是把字节流变成受约束的对象流

主链如下：

`Socket ByteBuf     -> HttpRequestDecoder state machine     -> HttpRequest     -> HttpContent...     -> LastHttpContent     -> optional HttpObjectAggregator     -> BusinessHandler     -> HttpResponse / HttpContent     -> HttpResponseEncoder     -> ByteBuf`

完整请求接口很方便，但流式对象才是 Netty 默认模型。选择是否聚合，本质是在代码简单度、内存上限与大消息能力之间取舍。

下一篇在 HTTP Pipeline 上继续前进：WebSocket 握手成功后，Netty 会动态替换 HTTP Codec，把同一条 TCP 连接从 HTTP 对象流切换成 WebSocket Frame 流。协议升级真正改变的是 Pipeline 状态，而不是创建一条“特殊网络连接”。

## 参考资料

1.  1\. Netty `HttpServerCodec.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpServerCodec.java
    
2.  2\. Netty `HttpObjectDecoder.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpObjectDecoder.java
    
3.  3\. Netty `HttpObjectAggregator.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpObjectAggregator.java
    
4.  4\. RFC 9112 HTTP/1.1：https://www.rfc-editor.org/rfc/rfc9112

---

## 27. Netty 优雅停机源码：shutdownGracefully 的 quiet period 为什么重要（源码系列第16篇） 27. Netty 优雅停机源码：shutdownGracefully 的 quiet period 为什么重要（源码系列第16篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489616&idx=1&sn=d2acac6b447f3eb51d8c494efb760486&chksm=eb675f26dc10d6309d97adab061a4cc879f9d4e3020b9b59dd12dbdef10e9534bc183bb435d8

> `shutdownGracefully(quietPeriod, timeout)` 的语义不是“最多等待 quietPeriod”，而是停止接收新常规任务后，持续执行已有任务；只有连续 quietPeriod 没有新任务才终止，同时受 timeout 硬上限约束。真正的服务优雅下线还必须先摘除流量、关闭监听端口、处理在途请求和连接，最后才结束 EventLoop。

很多 Netty 程序在 `finally` 中调用 `bossGroup.shutdownGracefully()` 和 `workerGroup.shutdownGracefully()`，就宣称已经支持优雅停机。实际上这只处理了线程执行器的退出。若负载均衡仍在送流量、ServerChannel 仍在 accept、新请求还在进入 Pipeline，再合理的 quiet period 也无法替业务完成排水。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java`
    
*   • 重点方法：`shutdownGracefully`、`confirmShutdown`、`runAllTasks`、`cleanup`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java
    


这张图分成服务治理、Channel 生命周期和 EventLoop 三层。`shutdownGracefully` 只覆盖最下层：执行剩余任务、观察 quiet period、达到 timeout 后终止。上层的摘流量、拒绝新请求、协议通知和在途请求收敛需要应用自己编排。

## 1\. 优雅停机有三个对象，不能只关 EventLoopGroup

一个网络服务至少包含：

1.  1\. ServerChannel：监听端口并接收新连接；
    
2.  2\. Child Channels：承载已有连接和请求；
    
3.  3\. EventLoopGroup：处理 accept、I/O、任务和定时任务。
    

只关闭 Worker Group，相当于直接撤走执行连接事件的线程；只关闭 ServerChannel，可以停止新连接，但老连接仍会运行；只从注册中心摘除，已有 keep-alive 连接仍可能发送请求。

推荐顺序：

`标记实例 not-ready     -> 从负载均衡/注册中心摘流量     -> 等待传播窗口     -> 关闭 ServerChannel，停止 accept     -> 拒绝新业务请求并等待在途请求     -> 协议级通知/关闭 Child Channels     -> shutdownGracefully EventLoopGroups     -> 等待 terminationFuture     -> 进程退出`

## 2\. shutdownGracefully 先把状态推进到 SHUTTING\_DOWN

`SingleThreadEventExecutor.shutdownGracefully` 会校验参数，其中 `timeout` 不能小于 `quietPeriod`，然后通过 CAS 推进执行器状态，并保存两个时间：

`public Future<?> shutdownGracefully(        long quietPeriod, long timeout, TimeUnit unit) {       ObjectUtil.checkPositiveOrZero(quietPeriod, "quietPeriod");    if (timeout < quietPeriod) {        throw new IllegalArgumentException("timeout < quietPeriod");       }    // CAS state -> ST_SHUTTING_DOWN       gracefulShutdownQuietPeriod = unit.toNanos(quietPeriod);       gracefulShutdownTimeout = unit.toNanos(timeout);    // 确保线程启动或被唤醒，以便进入 confirmShutdown    return terminationFuture();   }`

返回的是 termination Future，不代表方法返回时线程已经退出。调用方如果必须等待资源完全释放，需要监听或同步等待这个 Future，而且等待线程不能是被关闭的 EventLoop 自己。

## 3\. quiet period 是“连续安静窗口”，会被新任务刷新

`confirmShutdown()` 的关键逻辑可概括为：

`if (runAllTasks() || runShutdownHooks()) {    if (isShutdown()) {        return true;       }    if (gracefulShutdownQuietPeriod == 0) {        return true;       }       wakeup(true);    return false;   }      long nanoTime = getCurrentTimeNanos();   if (isShutdown() || nanoTime - gracefulShutdownStartTime > gracefulShutdownTimeout) {    return true;   }   if (nanoTime - lastExecutionTime <= gracefulShutdownQuietPeriod) {       wakeup(true);       Thread.sleep(100);    return false;   }   return true;`

只要 shutdown 期间仍执行了任务，`lastExecutionTime` 就会更新，quiet period 重新计算。这个设计给已提交的回调、关闭事件和清理任务一个收敛窗口。

但它也会产生意外：如果业务定时任务不断自我续期，或者其他线程持续提交允许进入的任务，执行器可能一直达不到安静窗口，最后只能依赖 timeout 硬终止。

## 4\. timeout 是硬上限，不保证所有任务都完成

quiet period 回答“多久没有新任务才算安静”，timeout 回答“从开始关闭起最多容忍多久”。两者关系：

条件

结果

quietPeriod = 0

当前清理完成后尽快退出

连续 quietPeriod 无任务

正常终止

不断有任务但未到 timeout

继续执行和等待

总时间超过 timeout

强制进入终止阶段

因此不能把 timeout 当作“所有在途请求一定能完成”的承诺。业务需要自己的 drain deadline，并在超时后明确取消、失败或持久化未完成工作。

默认参数也不是所有服务都合适。在线请求服务可能只允许几十秒发布窗口，长文件传输可能需要分钟级，交易系统则可能要求更复杂的会话迁移。

## 5\. 正在执行的 Handler 不会被魔法中断

EventLoop 上如果有一个阻塞 60 秒的 Handler，即使 shutdown timeout 是 10 秒，线程也无法在执行 Java 调用栈中途自动跳到 `confirmShutdown`。超时判断只有线程重新回到事件循环时才能发生。

这说明优雅停机的前提仍是“不阻塞 EventLoop”。如果必须控制耗时业务，应放到可取消的业务线程池，并把任务状态与 Channel 生命周期解耦。

停机问题常暴露平时的线程模型缺陷：正常运行时偶发阻塞只表现为尾延迟，发布时大量关闭与回调叠加，就会变成进程迟迟退不出去。

## 6\. ServerChannel 应先关闭，阻断新连接入口

服务端保存 bind 返回的 ChannelFuture：

`Channel serverChannel = bootstrap.bind(port).sync().channel();`

下线时先：

`serverChannel.close().sync();`

关闭监听 Channel 后，Boss 不再 accept 新连接，但已有 Child Channel 不会自动全部消失。可以用 `ChannelGroup` 管理连接集合：

`ChannelGroup channels = new DefaultChannelGroup(GlobalEventExecutor.INSTANCE);   // channelActive 时 add   channels.close().awaitUninterruptibly(drainTimeoutMillis);`

真实业务不一定立即 close 所有连接。HTTP/1.1 可在响应中加 `Connection: close`；WebSocket 可发送 Close frame；自定义协议可发送 server draining 控制消息，让客户端迁移。

## 7\. 摘流量需要传播时间，Readiness 不是瞬时屏障

在 Kubernetes、注册中心或负载均衡器中把实例设为不可用，并不意味着下一微秒就没有新请求。健康检查存在周期，代理有缓存，客户端连接池也可能复用既有连接。

因此通常需要：

*   • 先设置 draining 状态；
    
*   • Readiness 返回失败；
    
*   • 等待至少一个传播窗口；
    
*   • 对新请求返回可重试错误或明确拒绝；
    
*   • 已在途请求继续处理；
    
*   • 达到业务 deadline 后强制收敛。
    

如果一收到 SIGTERM 就立即关闭 EventLoop，前面的摘流量只是形式流程。


时序图中的两个时间点最重要：`lastExecutionTime` 会因 shutdown 期间执行任务而后移，quiet period 从最后一次任务重新计算；`gracefulShutdownStartTime` 不变，最终由 timeout 限制总时长。前者追求完整，后者保证进程不会无限等待。

## 8\. Boss 和 Worker 的关闭顺序要与连接策略一致

一般先停止 Boss 接入，再处理 Worker 上的存量连接：

`serverChannel.close().sync();   drainExistingChannels();   bossGroup.shutdownGracefully(0, 10, SECONDS);   workerGroup.shutdownGracefully(2, 15, SECONDS);`

但不要机械套参数。Boss 关闭后通常任务少，可以更快结束；Worker 承载在途 I/O、Promise Listener、关闭事件和定时任务，需要更长窗口。

若 Boss 与 Worker 共享同一个 EventLoopGroup，则无法按两阶段独立控制，要靠先关闭 ServerChannel、再收敛 Child Channel 实现逻辑分层。

## 9\. 定时任务和重试是停机不能安静的常见原因

以下代码会在关闭期持续制造任务：

`void scheduleReconnect(EventLoop loop) {       loop.schedule(() -> {           connect();           scheduleReconnect(loop);       }, 1, SECONDS);   }`

优雅停机需要一个上层停止标志：

`if (!draining.get()) {       scheduleReconnect(loop);   }`

心跳、指标上报、配置轮询、重试、延迟写和连接保活都要审计。任务取消后还要释放捕获的 Channel、ByteBuf 和大对象引用，否则线程虽然结束，其他全局结构仍可能保留资源。

## 10\. 终止 Future 是关闭完成的证据

`shutdownGracefully` 返回 Future，`terminationFuture()` 也能表示最终状态。生产代码应将它纳入关闭协调，而不是固定 sleep：

`Future<?> bossStop = bossGroup.shutdownGracefully(0, 10, SECONDS);   Future<?> workerStop = workerGroup.shutdownGracefully(2, 20, SECONDS);      bossStop.syncUninterruptibly();   workerStop.syncUninterruptibly();`

固定 sleep 既可能睡短导致资源未释放，也可能睡长拖慢发布。Future 还能记录失败与实际耗时，成为停机指标。

需要防止 shutdown hook 自己被无限阻塞。外层编排仍应有进程级 deadline，超过后记录未完成连接、任务和线程栈，再执行明确的强制退出策略。

## 11\. 停机验收要看业务而不只是端口

至少验证：

指标

期望

新连接数

摘流量后快速归零

在途请求数

在 drain 窗口内下降

Child Channel 数

按协议关闭策略收敛

pending tasks

最终归零或只剩可取消任务

pending outbound bytes

发送完成或按超时失败

termination Future

在进程 deadline 内完成

客户端错误率

不出现集中 reset/timeout

还应在压测环境执行真实滚动发布，而不是只调用一次单元测试。长连接、慢请求、大响应和断线重连都会改变停机曲线。

## 12\. 优雅停机是服务生命周期协议

源码主链：

`shutdownGracefully     -> state = SHUTTING_DOWN     -> wakeup EventLoop     -> run remaining tasks / shutdown hooks     -> confirmShutdown     -> quiet period satisfied OR timeout exceeded     -> cleanup     -> state = TERMINATED     -> terminationFuture complete`

Netty 负责让 EventLoop 有秩序地结束；应用负责让流量、请求、连接和业务状态有秩序地结束。两层都完成，才叫优雅停机。

下一篇进入 HTTP/1.1 Pipeline。我们会沿着 `HttpServerCodec` 看请求行、Header、Content 和 LastHttpContent 如何从字节流中拆出，以及为什么 `HttpObjectAggregator` 的便利背后是明确的内存上限和慢请求风险。

## 参考资料

1.  1\. Netty `SingleThreadEventExecutor.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java
    
2.  2\. Netty `MultithreadEventExecutorGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/MultithreadEventExecutorGroup.java
    
3.  3\. Netty `ChannelGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/group/ChannelGroup.java

---

## 26. Netty 空闲检测源码：IdleStateHandler 如何驱动心跳与断线判断（源码系列第15篇） 26. Netty 空闲检测源码：IdleStateHandler 如何驱动心跳与断线判断（源码系列第15篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489599&idx=1&sn=4c92ae3d97dd6af0f4f9ef904fec21e5&chksm=eb675f49dc10d65fab81408bb937b8b18cbdcaab1536b6257d49e0541e4347ce0a7b4661b34b

> `IdleStateHandler` 只负责判断“一段时间没有读、没有写或两者都没有”，并把 `IdleStateEvent` 沿 Pipeline 传播；它不等于心跳协议，也不能仅凭一次读空闲证明连接已断。可靠保活需要空闲检测、Ping/Pong、失败计数、业务 ACK 和断线重连共同闭环。

长连接最棘手的状态不是明确断开，而是“看起来还在”：网线被拔、NAT 映射失效、移动网络切换、对端进程卡死，服务端不一定立即收到 FIN 或 RST。只有持续通信或主动探测，才能在业务允许的时间内识别半开连接。

Netty 把第一层能力放在 `IdleStateHandler`：记录最近读写时间，用 EventLoop 定时检查，满足空闲条件后触发用户事件。之后是发心跳、累计失败还是关闭连接，完全由后续 Handler 决定。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java`
    
*   • 重点方法：`initialize`、`schedule`、`channelRead`、`write`、`ReaderIdleTimeoutTask.run`、`channelIdle`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java
    


图中要抓住两条路径：真实读写事件更新 `lastReadTime`、`lastWriteTime`；三个定时任务分别检查 reader、writer、all idle，满足条件后调用 `channelIdle`，默认继续 `fireUserEventTriggered`。数据事件和定时任务都在 Channel 所属 EventLoop 上串行执行。

## 1\. 三种 Idle 回答的是不同问题

构造参数通常是：

`new IdleStateHandler(readerIdle, writerIdle, allIdle, TimeUnit.SECONDS)`

三种状态不能互相替代：

状态

判断依据

常见动作

`READER_IDLE`

一段时间没有成功读取入站数据

服务端判断客户端失联，累计后关闭

`WRITER_IDLE`

一段时间没有完成写出

客户端主动发送 Ping/心跳

`ALL_IDLE`

读和写都没有发生

双向静默连接做探测或回收

如果服务端持续给客户端推送数据但客户端从不回应，`ALL_IDLE` 不会触发，因为一直有写；真正能发现对端无响应的是 `READER_IDLE` 或应用层 Pong 超时。反过来，如果业务请求本身很频繁，`WRITER_IDLE` 也不会触发，不需要额外心跳。

## 2\. 初始化发生在 Handler 加入或 Channel Active 时

`IdleStateHandler` 需要确保 Channel 已注册且可用，再把任务调度到正确 EventLoop。`initialize(ctx)` 的核心逻辑是记录初始时间并创建需要的定时任务：

`private void initialize(ChannelHandlerContext ctx) {    switch (state) {    case 1:    case 2:        return;       }       state = 1;       initOutputChanged(ctx);       lastReadTime = lastWriteTime = ticksInNanos();    if (readerIdleTimeNanos > 0) {           readerIdleTimeout = schedule(ctx,            new ReaderIdleTimeoutTask(ctx), readerIdleTimeNanos, NANOSECONDS);       }    if (writerIdleTimeNanos > 0) {           writerIdleTimeout = schedule(ctx,            new WriterIdleTimeoutTask(ctx), writerIdleTimeNanos, NANOSECONDS);       }    if (allIdleTimeNanos > 0) {           allIdleTimeout = schedule(ctx,            new AllIdleTimeoutTask(ctx), allIdleTimeNanos, NANOSECONDS);       }   }`

`schedule` 默认调用 `ctx.executor().schedule`，也就是 ChannelHandlerContext 绑定的 EventExecutor，通常为 Channel 的 EventLoop。它没有使用上一章的独立 `HashedWheelTimer`。

这样做的价值是：定时检查和 `channelRead`、`write`、`channelInactive` 不会并发修改同一组字段。单线程串行换来了更简单的状态机。

## 3\. Reader Idle 不是周期性固定触发，而是按剩余时间校正

读取数据时，Handler 会标记正在读；`channelReadComplete` 再更新最近读时间并恢复首次事件标记。ReaderIdleTimeoutTask 到期时不会直接认定空闲，而是重新计算：

`long nextDelay = readerIdleTimeNanos;   if (!reading) {       nextDelay -= ticksInNanos() - lastReadTime;   }      if (nextDelay <= 0) {       readerIdleTimeout = schedule(ctx, this, readerIdleTimeNanos, NANOSECONDS);    IdleStateEvent event = newIdleStateEvent(READER_IDLE, firstReaderIdleEvent);       firstReaderIdleEvent = false;       channelIdle(ctx, event);   } else {       readerIdleTimeout = schedule(ctx, this, nextDelay, NANOSECONDS);   }`

这个“重新计算剩余时间”的分支很关键。定时任务可能因为 EventLoop 忙而晚执行，期间也可能刚发生读取；如果只按固定周期触发，就会把已有流量的连接误判为空闲。

## 4\. 写空闲以写 Future 完成为时间更新点

调用 `write()` 不代表真正写成功。`IdleStateHandler` 在出站写时为 Promise 添加监听器，操作完成后更新 `lastWriteTime`。这与第 11 篇 Future 的语义一致：写时间应对应完成事件，而不是业务方法进入时间。

简化逻辑：

`ctx.write(msg, promise.unvoid()).addListener(writeListener);`

监听器完成时：

`lastWriteTime = ticksInNanos();   firstWriterIdleEvent = true;   firstAllIdleEvent = true;`

如果写一直堵在 ChannelOutboundBuffer，最近写完成时间不会被虚假刷新，Writer Idle 仍有机会暴露异常。仅在业务调用点记时间，会把“持续提交但完全发不出去”误认为连接活跃。

## 5\. first 事件适合分级动作，不是只触发一次

Netty 区分首次空闲事件和后续空闲事件。第一次触发后，若仍无读写，定时任务会继续按 idle interval 重新调度并产生非 first 事件；一旦恢复读或写，对应 first 标记重置。

业务可以利用它做分级治理：

`if (evt.state() == IdleState.READER_IDLE) {    if (evt.isFirst()) {           ctx.writeAndFlush(Ping.INSTANCE);       } else if (++missedPongs >= 3) {           ctx.close();       }   }`

不过失败计数不应只依赖事件次数，因为 EventLoop 卡顿会让触发节奏变化。更稳妥的是记录最近 Pong/业务消息的时间，并用 deadline 做最终判断。

## 6\. observeOutput 能减少大消息慢写造成的误报

构造器可启用 `observeOutput`。开启后，IdleStateHandler 会观察出站缓冲进度，例如当前消息、待发送字节和 flush 进展；即使没有新 write 完成，只要底层仍在推进输出，也可以避免把连接判成真正的写空闲。

它适合大文件或大帧慢速发送场景。否则一个大消息需要很久才完成，`lastWriteTime` 长时间不更新，可能触发 Writer Idle。代价是每次检查多读取一些出站状态。

但 observeOutput 不能替代背压：只要数据还在缓慢前进，它可能抑制空闲事件；如果业务持续生产更快，内存仍会增长。第 10 篇的水位线治理仍然必须存在。

## 7\. IdleStateEvent 通过用户事件传播

默认实现：

`protected void channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)        throws Exception {       ctx.fireUserEventTriggered(evt);   }`

因此业务需要在后续 Handler 的 `userEventTriggered` 中处理，而不是在 `channelRead` 中等待：

`@Override   public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {    if (evt instanceof IdleStateEvent) {        IdleStateEvent idle = (IdleStateEvent) evt;        if (idle.state() == IdleState.WRITER_IDLE) {               ctx.writeAndFlush(Ping.INSTANCE);            return;           }       }       ctx.fireUserEventTriggered(evt);   }`

若当前 Handler 不消费某种事件，应继续传播。否则后续连接管理、指标和审计 Handler 会看不到空闲状态。


这张时序图强调：Writer Idle 触发 Ping 后，只有收到 Pong 或其他有效入站消息才能证明对端仍活跃；连续 Reader Idle 才进入失败累计与关闭。Idle 事件是探测的起点，不是连接死亡的最终证据。

## 8\. 心跳周期必须跨越代理、NAT 和业务 SLA 设计

心跳不是越频繁越好。十万连接每 5 秒一次就是每秒两万次额外消息，编码、系统调用、带宽、日志和移动端电量都会增加。太慢则无法在业务 SLA 内发现断线，也可能先被 NAT 或负载均衡清理。

设计时至少考虑：

*   • 中间代理/NAT 的空闲连接回收时间；
    
*   • 业务允许的故障发现时间；
    
*   • 客户端前后台状态和移动网络特性；
    
*   • 心跳消息大小与连接规模；
    
*   • 允许连续丢失几次；
    
*   • 重连风暴的退避策略。
    

通常让业务流量自然充当活跃证据，只在没有正常流量时发送心跳。客户端与服务端应明确谁主动 Ping，避免双方同时产生无意义流量。

## 9\. 一次 Reader Idle 不足以关闭所有连接

一次空闲可能来自 GC、EventLoop 阻塞、瞬时丢包、系统调度或客户端省电。直接关闭会制造误杀和重连风暴。更稳妥的状态机是：

`ACTIVE     -> writer idle: send Ping     -> Pong received: ACTIVE     -> reader idle once: SUSPECT     -> subsequent miss: retry probe     -> threshold/deadline reached: close     -> reconnect with backoff`

对于必须快速失败的交易连接，阈值可以更紧；对于移动端聊天，阈值要容忍网络切换。框架不可能替业务选择。

## 10\. Handler 的位置决定什么算“有效读写”

`IdleStateHandler` 放在 Pipeline 的位置会影响它观察哪些事件。若放在协议 Decoder 前，它看到原始字节；放在业务 Handler 前，它看到解码后的消息，但底层字节是否传播到这里取决于前置 Handler。

通常将它放在协议处理之后或靠近连接管理层，并明确：

*   • 任意字节是否都算活跃；
    
*   • 无效帧、攻击流量是否能刷新读时间；
    
*   • 只写入队还是写完成才算写活跃；
    
*   • TLS 握手流量是否应刷新业务心跳。
    

如果攻击者发送无意义字节就能永久维持连接，空闲检测会失去防护价值。必要时在业务层单独记录“最后有效请求时间”。

## 11\. 排查误关连接要把 EventLoop 延迟纳入证据

常见现象与检查方向：

现象

优先检查

可能根因

大量连接同时 Idle

EventLoop 延迟、GC

定时任务集中延后执行

持续写仍触发 Writer Idle

write Future 是否完成

写缓冲堵塞或连接不可写

有心跳仍触发 Reader Idle

Pong 是否经过该 Handler

Pipeline 顺序或事件被截断

连接永不 Idle

是否持续收到无效字节

检测位置过靠前

关闭后任务仍存在

handlerRemoved/channelInactive 是否执行

Pipeline 生命周期异常

监控应包含 Idle 事件数量、first/重复事件、Ping/Pong RTT、关闭原因、EventLoop 调度延迟和重连次数。只记一条“心跳超时”日志无法区分网络断开与服务端卡顿。

## 12\. 心跳的最终边界是“探测—确认—处置”

`IdleStateHandler` 主链：

`handlerAdded / channelActive     -> initialize     -> EventLoop.schedule     -> read/write updates timestamp     -> timeout task recalculates nextDelay     -> IdleStateEvent     -> userEventTriggered     -> Ping / count / close / reconnect`

空闲检测只回答“多久没有活动”；应用层心跳回答“对端是否还能处理协议”；重连和会话恢复回答“断开后怎样继续业务”。把三层分开，连接治理才不会被一个 Handler 名称误导。

下一篇讨论优雅停机：为什么 `shutdownGracefully()` 不是立即停线程，quiet period 为什么会被新任务重新计时，以及服务发布时怎样先摘流量、关 Channel，再结束 EventLoop。

## 参考资料

1.  1\. Netty `IdleStateHandler.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java
    
2.  2\. Netty `IdleStateEvent.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateEvent.java
    
3.  3\. Netty API：https://netty.io/4.1/api/io/netty/handler/timeout/IdleStateHandler.html

---

## 25. Netty Selector 重建源码：JDK NIO 空轮询为什么会打满 CPU（源码系列第14篇） 25. Netty Selector 重建源码：JDK NIO 空轮询为什么会打满 CPU（源码系列第14篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489585&idx=1&sn=5d5ef9d576fadf9c56530211cf74e1af&chksm=eb675f47dc10d65142f0333f1c348b430445c5b106871db88e5a8d0760057b502ac7415ad467

> Selector 重建不是“select 返回 0 就重建”，而是 NioEventLoop 在排除任务、唤醒、超时和线程中断等正常原因后，发现阻塞 select 连续异常提前返回，才创建新 Selector、迁移所有 Channel 的 SelectionKey 并关闭旧 Selector。阈值和排除条件共同避免误判。

Netty 线上出现单核 CPU 100% 时，Selector 空轮询几乎是每篇排障文章都会提到的原因。但如果只记住“Netty 会自动重建 Selector”，就无法回答三个关键问题：为什么正常的 select 返回 0 不会触发重建？重建时连接会不会断？如何区分空轮询、任务积压和 Handler 死循环？

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`transport/src/main/java/io/netty/channel/nio/NioEventLoop.java`
    
*   • 重点方法：`select`、`unexpectedSelectorWakeup`、`rebuildSelector`、`rebuildSelector0`、`selectAgain`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    


图中的关键不是阈值本身，而是计数器何时归零：有任务执行、达到定时任务 deadline、收到显式 wakeup、线程中断、select 真正拿到事件，都属于合理返回。只有没有合理解释的连续提前返回，才会累积到自动重建阈值。

## 1\. 真正的问题是“本应阻塞，却连续立即返回”

`Selector.select(timeout)` 返回 0 完全可能是正常行为，例如：

*   • timeout 到期但没有 I/O；
    
*   • 其他线程调用 `wakeup()`；
    
*   • EventLoop 收到新任务；
    
*   • 当前线程被中断；
    
*   • deadline 已经接近，Netty 主动缩短等待；
    
*   • selectStrategy 决定立即轮询。
    

空轮询 Bug 的危险特征是：没有事件、没有任务、没有超时到期，也没有唤醒原因，select 仍连续快速返回。EventLoop 的 `for (;;)` 因此变成用户态忙循环，一条线程就能占满一个 CPU 核心。

所以检测不能写成：

`if (selectedKeys == 0) {       rebuildSelector();   }`

那会在正常空闲连接上频繁重建，制造更严重的抖动。

## 2\. selectCnt 是“无法解释的提前返回”计数

`NioEventLoop.select` 中维护 `selectCnt`。每次 select 返回后，源码先检查是否存在合理原因；合理则结束或清零，不合理才继续累加。

简化主线：

`int selectCnt = 0;   for (;;) {    int selectedKeys = selector.select(timeoutMillis);       selectCnt++;    if (selectedKeys != 0 || oldWakenUp || wakenUp.get() ||           hasTasks() || hasScheduledTasks() || Thread.interrupted()) {           selectCnt = 0;        break;       }    if (unexpectedSelectorWakeup(selectCnt)) {           selectCnt = 0;        break;       }   }`

真实源码还处理 deadline、selectStrategy 和执行过任务等分支。核心判断始终一样：计数器描述的不是“空事件次数”，而是“没有充分理由的异常唤醒次数”。

这个语义对监控也很重要。`selectedKeys=0` 的次数高不一定异常；应该关注极短间隔连续返回、EventLoop 空转循环速率和重建日志。

## 3\. 自动重建阈值是防误判的时间窗口

Netty 使用系统属性 `io.netty.selectorAutoRebuildThreshold` 配置自动重建阈值，并对过小的正数做保护。达到阈值时，`unexpectedSelectorWakeup` 触发 `rebuildSelector()`。

阈值的作用不是精确识别某个 JDK Bug，而是建立一个统计证据窗口：偶发提前返回很正常，连续数百次且没有其他原因，就高度可疑。

阈值策略

好处

风险

禁用重建

没有迁移开销

真空轮询时 CPU 持续打满

阈值过低

很快恢复

正常唤醒抖动可能误判

默认量级

在误判与恢复速度间折中

故障识别仍需短暂循环

阈值过高

几乎不误判

故障恢复更慢

除非有明确 JDK、内核和压测证据，不建议随意修改。很多所谓“Selector 问题”实际是任务队列一直有任务，调整阈值不会解决。

## 4\. rebuildSelector 必须回到所属 EventLoop

外部线程可以调用 `NioEventLoop.rebuildSelector()`，但真正迁移不能和 I/O 线程并发修改注册状态。源码先判断线程归属：

`public void rebuildSelector() {    if (!inEventLoop()) {           execute(() -> rebuildSelector0());        return;       }       rebuildSelector0();   }`

这和前面 Future、Pipeline 的线程原则一致：一个 Channel 的注册、interestOps 和事件处理应在所属 EventLoop 串行推进。管理线程只负责发命令，不直接动 Selector 内部结构。

## 5\. 重建的本质是迁移 SelectionKey，不是重连 Socket

`rebuildSelector0()` 创建新的 Selector，然后遍历旧 Selector 的 keys。每个 key 的 attachment 通常是 `AbstractNioChannel` 或内部任务。迁移步骤可以概括为：

`Selector oldSelector = selector;   Selector newSelector = openSelector();      for (SelectionKey key : oldSelector.keys()) {    Object attachment = key.attachment();    if (!key.isValid() || key.channel().keyFor(newSelector) != null) {        continue;       }    int interestOps = key.interestOps();       key.cancel();    SelectionKey newKey = key.channel().register(newSelector, interestOps, attachment);    if (attachment instanceof AbstractNioChannel) {           ((AbstractNioChannel) attachment).selectionKey = newKey;       }   }      selector = newSelector;   oldSelector.close();`

底层 SocketChannel 没有关闭，TCP 连接也没有重新握手；变化的是 Channel 注册在哪个 Selector 上。成功迁移后，业务通常只感受到短暂事件处理延迟。

失败分支必须单独处理：某个 Channel 注册新 Selector 失败时，Netty 会关闭该 Channel 或执行对应任务的异常处理，避免它处于“旧 key 已取消、新 key 又不存在”的悬挂状态。

## 6\. selectedKeys 优化与 Selector 重建是两件事

Netty 可能通过反射把 JDK Selector 内部 selectedKeys 集合替换为数组结构，以降低遍历和删除成本。这个优化和空轮询重建经常被放在一起讲，但解决的问题不同：

*   • selectedKeys 优化：减少就绪 key 集合的对象和遍历开销；
    
*   • Selector 重建：恢复异常的阻塞选择行为；
    
*   • `selectAgain`：在处理过程中重新 selectNow，刷新已取消或新增的 key 状态。
    

排障时不能看到 `SelectedSelectionKeySet` 就认为已解决空轮询，也不能因重建日志出现就断定 selectedKeys 优化失效。

## 7\. 迁移期间为什么不会同时由两个 Selector 处理

迁移发生在 EventLoop 线程内，当前线程不会同时执行旧 Selector 的 selected key 处理。对每个 key，流程是读取 interestOps、取消旧 key、注册新 Selector、更新 Channel 的 `selectionKey` 引用。最后统一替换 selector 字段并关闭旧对象。

单线程串行提供了关键不变量：

`任意时刻，业务事件处理只沿 EventLoop 当前持有的 Selector 推进。`

其他线程若在迁移期间提交 write、register 或 close，只会进入 EventLoop task queue，待迁移调用栈结束后执行。它们不会直接和 key 迁移并发。


这张时序图把正常 wakeup 和异常空轮询分开：正常唤醒会因为任务、deadline 或 wakeup 标记而清零计数；异常路径连续累积后，在同一个 EventLoop 上创建新 Selector、迁移 Key、替换引用并关闭旧 Selector。TCP 连接本身没有重建。

## 8\. CPU 100% 不等于 Selector 空轮询

更常见的 EventLoop 高 CPU 原因还有：

1.  1\. Handler 死循环或超大循环解码；
    
2.  2\. 单次读出大量消息，业务处理过重；
    
3.  3\. task queue 持续积压，EventLoop 根本没有进入阻塞 select；
    
4.  4\. 写缓冲积压，反复处理 OP\_WRITE；
    
5.  5\. 日志、序列化或 Listener 在 EventLoop 上耗时；
    
6.  6\. 某个协议攻击触发异常解析路径。
    

Selector 空轮询的线程栈常频繁出现在 `NioEventLoop.select` 与循环附近，但抓一次栈不够。应该连续采样：如果栈不断在业务 Handler 或任务执行中，问题不在 Selector；如果没有就绪事件和任务，select 又持续快速返回，才符合空轮询特征。

## 9\. 一套可执行的排查顺序

遇到 Netty 单核打满，可以按以下顺序：

步骤

证据

判断

1\. 连续抓线程栈

是否稳定落在同一 Handler/Decoder

先排业务死循环

2\. 看任务队列与执行耗时

pending tasks、runAllTasks 时间

判断任务风暴

3\. 看读写指标

selected keys、OP\_WRITE、读写字节

判断 I/O 热点

4\. 查重建日志

是否出现 premature returns/rebuild

判断 Selector 自愈

5\. 对照 GC 与系统调用

是否有长 GC、epoll/select 异常

排除外部停顿

如果重建后 CPU 立即恢复，并且此前没有任务和 I/O，Selector 异常的证据较强。如果不断重建仍不恢复，多半是根因判断错了，或系统环境持续触发更底层的问题。

## 10\. 不要把手动 rebuild 当成日常运维按钮

`NioEventLoopGroup.rebuildSelectors()` 可让所有 NioEventLoop 重建 Selector，但它更适合明确故障下的应急和诊断，不适合定时执行。

频繁手动重建会带来：

*   • 遍历和重新注册全部 Channel；
    
*   • 短暂增加 I/O 延迟；
    
*   • 放大大连接数实例的 CPU 抖动；
    
*   • 掩盖真实 Handler 或任务队列问题；
    
*   • 在迁移异常时关闭个别 Channel。
    

合理策略是保留自动保护，监控重建次数，出现重建时采集线程栈、JDK 版本、内核、容器和负载证据。把重建当成故障信号，而不是正常维护动作。

## 11\. Selector 重建体现的是“用状态迁移替代进程重启”

源码主链如下：

`blocking select     -> unexpected premature return     -> selectCnt++     -> threshold reached     -> rebuildSelector0     -> open new Selector     -> migrate SelectionKeys     -> update Channel.selectionKey     -> swap selector     -> close old Selector`

Netty 没有选择让 EventLoop 带病空转，也没有粗暴关闭全部连接，而是替换故障调度器并保留 Socket。这种局部状态迁移是高可用网络框架的重要设计：隔离有问题的基础设施对象，尽可能保住业务连接。

下一篇进入连接保活。`IdleStateHandler` 并不会替你发送万能心跳，它只在 EventLoop 上调度读空闲、写空闲和全空闲检查，并通过用户事件传播状态。心跳协议、失败阈值和关闭策略仍要由业务定义。

## 参考资料

1.  1\. Netty `NioEventLoop.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    
2.  2\. Netty `NioEventLoopGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoopGroup.java
    
3.  3\. Java `Selector` API：https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html

---

## 24. Netty 原生传输源码：Epoll 与 KQueue 到底快在哪里（源码系列第13篇） 24. Netty 原生传输源码：Epoll 与 KQueue 到底快在哪里（源码系列第13篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489563&idx=1&sn=24b8d9a22195e29aa31de6e64d5321b0&chksm=eb675f6ddc10d67b58228751cae5c6a7efebd51ce32d03bd3c708cb5748e557fc22242c9ccda

> Netty Native Transport 的价值不只是“比 JDK NIO 快”。它绕过 Java Selector 的适配层，直接使用 epoll/kqueue，减少部分转换和系统调用开销，更重要的是暴露 `TCP_CORK`、`SO_REUSEPORT`、Unix Domain Socket、边沿触发等平台能力。是否切换应由压测和功能需求决定，而不是看到 Linux 就默认替换。

同一套 Bootstrap 和 Pipeline 代码，只替换 EventLoopGroup 与 Channel 类，就能从 NIO 切到 Epoll 或 KQueue。这种 API 兼容很容易制造错觉：底层只是换了个 Selector 实现。实际上 native transport 从 Channel、EventLoop、事件数组到 JNI 调用都是另一条实现链，只在上层保持相同抽象。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点模块：`transport-classes-epoll`、`transport-native-epoll`、`transport-classes-kqueue`、`transport-native-kqueue`
    
*   • 重点类：`EpollEventLoop`、`AbstractEpollChannel`、`KQueueEventLoop`、`AbstractKQueueChannel`、`Native`
    
*   • 官方源码：https://github.com/netty/netty/tree/netty-4.1.135.Final/transport-classes-epoll
    


图中上半部分保持一致：Bootstrap、ChannelPipeline、Handler 和 ByteBuf 不需要感知平台。差异发生在 EventLoop 与 Channel 以下：NIO 进入 JDK Selector，Epoll/KQueue 则通过 Netty 的 Native 封装和 JNI 调用操作系统事件接口。这正是 Netty 能让业务少改代码、同时获得平台能力的关键。

## 1\. Native Transport 是完整传输实现，不是一个开关

NIO 服务端常用：

`EventLoopGroup group = new NioEventLoopGroup();   bootstrap.group(group)            .channel(NioServerSocketChannel.class);`

Linux Epoll 对应：

`EventLoopGroup group = new EpollEventLoopGroup();   bootstrap.group(group)            .channel(EpollServerSocketChannel.class);`

macOS/BSD KQueue 对应：

`EventLoopGroup group = new KQueueEventLoopGroup();   bootstrap.group(group)            .channel(KQueueServerSocketChannel.class);`

替换看似只有两行，背后却同时改变：事件循环实现、Socket Channel 实现、配置项、就绪事件表示、文件描述符管理和 native 库加载。Pipeline 之所以能复用，是因为这些实现仍遵循 `Channel`、`EventLoop` 和 `ChannelConfig` 契约。

## 2\. EpollEventLoop 直接等待事件数组和 timerfd

`EpollEventLoop` 的等待路径会根据是否存在定时任务、是否需要立即轮询，选择不同的 `epollWait` 方式。核心调用可概括为：

`private long epollWait(long deadlineNanos) throws IOException {    if (deadlineNanos == NONE) {        return Native.epollWait(epollFd, events, timerFd, -1, -1);       }    int delaySeconds = ...;    int delayNanos = ...;    return Native.epollWait(epollFd, events, timerFd,                               delaySeconds, delayNanos,                               EPOLL_WAIT_MILLIS_THRESHOLD);   }`

`Native.epollWait` 再进入 JNI 和 C 实现。EventLoop 持有 `epollFd`、`eventFd`、`timerFd` 和 `EpollEventArray`：

*   • `epollFd` 管理被监听的文件描述符；
    
*   • `eventFd` 用于跨线程唤醒 EventLoop；
    
*   • `timerFd` 协调下一次定时任务 deadline；
    
*   • `EpollEventArray` 批量接收就绪事件。
    

它避免了 JDK `SelectionKey` 对象模型中的部分映射与兼容路径，Netty 可以针对 Linux 行为直接优化。但 JNI 仍有边界成本，native 也不是“零开销”。最终收益取决于连接数、事件密度、报文大小和 JDK 版本。

## 3\. KQueue 的结构相似，但事件语义不是 Epoll 的复制品

`KQueueEventLoop` 使用 `kevent` 等待变化列表与事件列表：

`int numEvents = Native.keventWait(       kqueueFd.intValue(), changeList, eventList, timeoutSec, timeoutNs);`

KQueue 通过 filter 表达读、写、用户事件等变化；Epoll 使用 interest mask 和 event flag。Netty 在上层统一为 Channel 读写事件，但底层注册、删除、EOF 与错误处理并不相同。

因此不要假设 Epoll 参数能原样复制到 KQueue。二者共同点是 native、事件驱动和平台特性；差异来自操作系统接口本身。

维度

JDK NIO

Epoll

KQueue

平台

跨平台

Linux

macOS/BSD

等待接口

`Selector.select`

`epoll_wait`

`kevent`

唤醒

Selector wakeup 管理

eventfd

EVFILT\_USER 等机制

平台 Socket 选项

受 JDK 抽象限制

Linux 扩展丰富

BSD 扩展

部署

无额外 native 依赖

需要匹配架构的 native 包

需要匹配平台包

## 4\. 真正有确定价值的常常是平台能力

单纯说“Epoll 更快”缺少条件。更容易形成确定收益的是 NIO 无法或不方便提供的能力，例如：

*   • `SO_REUSEPORT`：多个 Socket 绑定同一地址，由内核分配连接；
    
*   • `TCP_CORK`：控制小包聚合时机；
    
*   • `TCP_QUICKACK`：影响延迟确认策略；
    
*   • Unix Domain Socket：同机进程通信；
    
*   • 边沿触发模式；
    
*   • 更丰富的 TCP keepalive 参数；
    
*   • splice 等 Linux 零拷贝相关能力。
    

这些能力通过 `EpollChannelOption`、专用 Channel 或 native API 暴露。若业务恰好需要它们，选择 native transport 是功能决策；若只是普通 HTTP 服务，则必须用端到端压测证明收益。

## 5\. 边沿触发能减少重复通知，也提高读尽责任

Epoll 支持水平触发与边沿触发。水平触发下，只要 fd 仍可读，就会继续通知；边沿触发更像状态变化通知，应用收到事件后应尽量读到 `EAGAIN`。

Netty 的读循环和 `RecvByteBufAllocator.Handle.continueReading()` 共同承担“是否继续读”。边沿触发并不意味着可以随意一次只读一个消息，否则剩余数据可能等不到新的边沿变化。

工程取舍如下：

模式

优点

风险

水平触发

语义直观，不易遗漏剩余数据

可产生更多就绪通知

边沿触发

减少重复事件，适合高事件密度

必须正确读到不可读，公平性控制更难

不要把边沿触发当成一个孤立性能参数。它会和 `AUTO_READ`、读配额、单连接公平性、业务背压共同作用。

## 6\. 新连接接入仍会进入同一套 Pipeline 契约

Epoll 服务端接入连接时，`AbstractEpollServerChannel` 从 native accept 得到 fd，再创建子 Channel：

`int socket = socket.accept(acceptedAddress);   if (socket >= 0) {       allocHandle.lastBytesRead(socket);       pipeline.fireChannelRead(           newChildChannel(socket, acceptedAddress, 1, acceptedAddress[0]));    return 1;   }`

这里和第 3 篇 NIO Accept 主链形成对应：底层 accept 方式不同，但新子 Channel 仍作为入站消息进入父 Pipeline，随后由 `ServerBootstrapAcceptor` 配置并注册到 Worker。上层扩展点没有因为 native 而消失。

这也是迁移时通常无需重写业务 Handler 的原因。真正需要审计的是 ChannelOption、native 依赖、平台行为和运维指标。

## 7\. 零拷贝能力必须结合 TLS 和协议层判断

Native Transport 可能提供 `FileRegion`、splice 等减少数据复制的路径，但“使用 native 就自动零拷贝”是错误结论。

典型限制包括：

*   • TLS 需要加密，明文文件通常不能直接绕过用户态；
    
*   • 协议需要压缩或改写数据时必须处理内容；
    
*   • 小文件的系统调用优化可能被调度和对象成本抵消；
    
*   • 容器、内核版本和文件系统会影响结果。
    

应按真实链路压测：静态大文件、明文 TCP、低业务处理比例，更可能看到明显收益；小 JSON 请求、复杂编解码和数据库占主导时，传输层差异可能不是瓶颈。


图中应重点看“平台不同、上层归一”：EpollEventLoop 从事件数组取出 fd 和 flag，KQueueEventLoop 从 event list 取出 filter 与 ident，最终都定位 Channel 并触发读、写或关闭处理。业务 Handler 看到的仍是同一套 Channel 事件。

## 8\. 可用性检测与回退必须在启动时完成

Native 库可能因为操作系统、CPU 架构、分类器、libc 或加载路径不匹配而不可用。启动时应先检查：

`if (Epoll.isAvailable()) {    // EpollEventLoopGroup + EpollServerSocketChannel   } else {       log.warn("epoll unavailable", Epoll.unavailabilityCause());    // 明确回退 NIO，或按部署要求拒绝启动   }`

生产环境不要静默回退。若性能容量是按 Epoll 测出的，某个实例悄悄使用 NIO，会造成难解释的延迟和 CPU 差异。至少把 transport 类型、native 库版本和不可用原因暴露为启动日志与指标标签。

## 9\. 依赖选择要匹配平台与打包方式

常见故障不是代码错误，而是依赖没有把正确 native artifact 打进镜像。需要检查：

1.  1\. Linux 是 glibc 还是 musl；
    
2.  2\. CPU 是 x86\_64 还是 aarch64；
    
3.  3\. shaded/fat jar 是否保留 native 资源；
    
4.  4\. 容器运行平台是否和构建平台一致；
    
5.  5\. Netty 各模块版本是否统一；
    
6.  6\. 安全扫描是否要求升级 native 组件。
    

建议在 CI 中对目标镜像运行最小启动测试，实际执行 `Epoll.isAvailable()` 或 `KQueue.isAvailable()`，不要只靠 Maven 依赖树判断。

## 10\. 是否切换应看四组证据

选择 Native Transport 时至少比较：

*   • 吞吐：请求数、消息数、网络带宽；
    
*   • 延迟：P50、P99、P999 和最大停顿；
    
*   • 资源：EventLoop CPU、系统 CPU、上下文切换、直接内存；
    
*   • 稳定性：长时间连接抖动、fd 增长、native 崩溃和部署失败率。
    

测试必须使用真实协议、TLS 配置、连接数、消息大小和容器限制。只跑一个 echo benchmark 得出的结论，不能直接用于生产 RPC 或网关。

## 11\. Native Transport 的最终判断

主链可以归纳为：

`Epoll/KQueue EventLoop     -> native wait     -> event array     -> fd / Channel mapping     -> unsafe read/write/close     -> ChannelPipeline     -> business handler`

如果需要平台专属 Socket 能力，Native Transport 通常值得采用；如果只是追求“可能更快”，先压测再决定；如果团队无法稳定管理 native 依赖和多架构镜像，NIO 的可移植性本身就是收益。

下一篇回到 JDK NIO 的一个经典故障：Selector 在没有事件、没有任务时连续立即返回，会让 EventLoop 空转吃满 CPU。Netty 如何识别真正的异常空轮询，又如何迁移全部 SelectionKey 并安全重建 Selector？

## 参考资料

1.  1\. Netty Epoll Java 实现：https://github.com/netty/netty/tree/netty-4.1.135.Final/transport-classes-epoll/src/main/java/io/netty/channel/epoll
    
2.  2\. Netty Epoll Native 实现：https://github.com/netty/netty/tree/netty-4.1.135.Final/transport-native-epoll
    
3.  3\. Netty KQueue Java 实现：https://github.com/netty/netty/tree/netty-4.1.135.Final/transport-classes-kqueue/src/main/java/io/netty/channel/kqueue
    
4.  4\. Netty Native Transports Wiki：https://netty.io/wiki/native-transports.html

---

## 23. Netty 定时任务源码：HashedWheelTimer 为什么能低成本管理海量超时（源码系列第12篇） 23. Netty 定时任务源码：HashedWheelTimer 为什么能低成本管理海量超时（源码系列第12篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489550&idx=1&sn=49b0f80a4810eb428765d1c61d970fab&chksm=eb675f78dc10d66e70f170e3ad4b4964e3f425a173f23b527aa10d51d74a08a10a8e93b4c3f6

> `HashedWheelTimer` 的优势不是“定时更精确”，而是用固定刻度、环形桶和剩余轮数，把大量近似超时任务的调度成本摊薄。它适合连接超时、请求超时、重试和心跳检测，却不适合高精度调度，也不应该每个连接创建一个实例。

长连接系统里，真正让定时器变重的往往不是单个任务，而是任务数量：十万连接各有读空闲检测，几十万请求各有超时，失败重试又持续创建新任务。如果每次插入都维护一个严格有序的数据结构，任务增加会不断放大调度成本。

时间轮的取舍很明确：把时间切成离散刻度，允许到期时间存在一个 tick 量级的误差，换取接近常数时间的任务落桶和批量过期。理解这个取舍，才能知道它为什么适合网络超时，又为什么不能代替精密调度器。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`common/src/main/java/io/netty/util/HashedWheelTimer.java`
    
*   • 重点类与方法：`HashedWheelTimer`、`newTimeout`、`Worker.run`、`transferTimeoutsToBuckets`、`HashedWheelBucket.expireTimeouts`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/HashedWheelTimer.java
    


这张图展示了时间轮的三个核心对象：提交线程只把 `HashedWheelTimeout` 放进 MPSC 队列，Worker 线程在每个 tick 把任务转移到对应 Bucket，指针走到某个槽位时再检查剩余轮数并执行到期任务。提交和执行没有争抢同一条有序链表，正是低成本的来源。

## 1\. 时间轮优化的是“大量近似超时”，不是单次定时精度

`HashedWheelTimer` 可以看成钟表：`wheel` 是表盘，`tickDuration` 是每格时间，`tick` 是当前走过的格数。一个任务的截止时间会映射到某个槽位；如果截止时间超过一整轮，再用 `remainingRounds` 记录还要多转几圈。

假设：

*   • 每格 100ms；
    
*   • 一共 512 格；
    
*   • 一圈约 51.2 秒；
    
*   • 某任务 125 秒后到期。
    

它会落到一个确定槽位，同时记录还需要经过若干完整轮次。Worker 每次经过该槽时先减少 `remainingRounds`，归零后才真正执行。任务不需要因为时间很远就占据一棵全局排序树的高层节点。

这也决定了精度边界：任务不会早于 deadline 执行，但可能因为 tick 粒度、Worker 调度延迟或任务本身阻塞而晚执行。若业务要求微秒级或严格准点，时间轮不是合适工具。

维度

时间轮

优先队列定时器

插入思路

计算槽位后落桶

按 deadline 维护堆序

大量任务成本

通常更稳定

插入、删除通常带对数成本

精度

受 tickDuration 限制

可按最早 deadline 等待

适合场景

网络超时、心跳、重试

少量高精度任务

主要风险

误差、桶过密、任务阻塞

堆维护和频繁唤醒成本

## 2\. newTimeout 只入队，真正落桶由 Worker 串行完成

`newTimeout` 没有直接修改 wheel 中的双向链表。源码主路径可精简为：

`public Timeout newTimeout(TimerTask task, long delay, TimeUnit unit) {    long pendingTimeoutsCount = pendingTimeouts.incrementAndGet();    if (maxPendingTimeouts > 0 && pendingTimeoutsCount > maxPendingTimeouts) {           pendingTimeouts.decrementAndGet();        throw new RejectedExecutionException("Number of pending timeouts ...");       }          start();    long deadline = System.nanoTime() + unit.toNanos(delay) - startTime;    HashedWheelTimeout timeout = new HashedWheelTimeout(this, task, deadline);       timeouts.add(timeout);    return timeout;   }`

这段源码证明了两个设计点。

第一，调用线程负责构造任务并进入无锁队列，避免多个业务线程同时操作 Bucket 链表。第二，`maxPendingTimeouts` 是容量保护；如果不设上限，业务故障可能以“不断创建超时任务”的方式转化为堆内存压力。

取消任务也采用相似思路：调用方标记取消并进入 `cancelledTimeouts` 队列，Worker 再统一从 Bucket 移除。所有结构性修改集中在 Worker 线程，降低了锁和竞态复杂度。

## 3\. deadline 通过掩码映射槽位，remainingRounds 表示完整圈数

时间轮长度会被规范成 2 的幂，因此槽位映射可以使用按位与：

`long calculated = timeout.deadline / tickDuration;   timeout.remainingRounds = (calculated - tick) / wheel.length;   long ticks = Math.max(calculated, tick);   int stopIndex = (int) (ticks & mask);   wheel[stopIndex].addTimeout(timeout);`

`mask = wheel.length - 1`。当长度是 2 的幂时，`ticks & mask` 等价于取模，但计算更直接。`Math.max(calculated, tick)` 则处理已迟到的任务：即使 deadline 因排队或线程停顿已经过去，也会放到当前可处理的槽位，而不是落回历史刻度。

需要特别注意，O(1) 是“定位槽位”的复杂度，不代表到期处理永远 O(1)。如果大量任务集中在同一个槽位，Worker 到该 tick 仍要遍历整个 Bucket。业务把百万任务设为同一秒到期，会形成明显的到期尖峰。

## 4\. Worker 每个 tick 只做四件事

`Worker.run()` 的主循环非常克制：

`while (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_STARTED) {    final long deadline = waitForNextTick();    if (deadline > 0) {        int idx = (int) (tick & mask);           processCancelledTasks();        HashedWheelBucket bucket = wheel[idx];           transferTimeoutsToBuckets();           bucket.expireTimeouts(deadline);           tick++;       }   }`

可以概括成：等待下一格、处理取消、搬运新增任务、过期当前桶。`transferTimeoutsToBuckets` 每轮还有搬运上限，避免提交洪峰让 Worker 一直搬任务而无法推进时间。

`expireTimeouts` 遍历当前桶：

*   • 已取消：移除；
    
*   • `remainingRounds > 0`：减一，继续等待下一轮；
    
*   • deadline 已到：从桶移除并执行；
    
*   • deadline 未到：说明内部状态异常，源码会报错保护。
    

任务的 `TimerTask.run(timeout)` 就在 Worker 线程执行。因此一个慢任务会拖迟同一个 Timer 上的其他超时。这一点和 EventLoop 阻塞非常相似：定时器只负责触发，不是耗时业务线程池。

## 5\. tickDuration 和 wheelSize 决定精度、跨度与扫描形态

参数不能只看“越小越准、越大越能装”。它们共同决定一圈时间：

`一圈覆盖时间 = tickDuration × wheelSize`

参数影响如下：

调整

收益

代价

减小 tickDuration

超时粒度更细

Worker 唤醒更频繁

增大 tickDuration

唤醒成本更低

到期误差更大，同桶任务更多

增大 wheelSize

一圈覆盖更久，remainingRounds 更少

wheel 数组占用增加

减小 wheelSize

结构更小

长延时任务跨更多轮

网络超时通常允许几十毫秒到数百毫秒误差，远不需要每毫秒唤醒一次。应先确定业务可接受的超时误差，再估算典型延时范围和任务量，最后选择参数。

## 6\. HashedWheelTimer 与 EventLoop.schedule 不是同一个调度器

Netty 里还有 `EventLoop.schedule`。它来自 `AbstractScheduledEventExecutor`，内部使用按 deadline 排序的优先队列，并由 EventLoop 自己执行。两者不能混为一谈。

选择

执行线程

数据结构

更适合

`ctx.executor().schedule`

Channel 所属 EventLoop

定时任务优先队列

与单个 Channel 状态严格串行的少量任务

`HashedWheelTimer`

独立 Worker

环形 Bucket

跨连接、数量庞大的近似超时

`IdleStateHandler` 默认使用前者，因为空闲状态和 Channel 事件需要在同一 EventLoop 传播。连接池、客户端请求超时管理器等框架组件可能使用共享时间轮，因为它们面对的是跨 Channel 的大规模超时集合。

不要为了“用了 Netty”就把所有定时任务都改成时间轮。选择标准是任务数量、精度要求和线程归属。


这张状态图强调了 `newTimeout` 之后任务并未立即进入 Bucket；Worker 搬运后，任务随 tick 多次经过目标槽位，`remainingRounds` 逐轮减少。取消和到期互斥，最终都要从 Bucket 删除并减少 pending 计数。

## 7\. 一个 Timer 应被共享，而不是绑定每个连接

`HashedWheelTimer` 的每个实例都会创建一个 Worker 线程和一套 wheel。源码还会对创建过多实例给出资源泄漏警告。正确用法通常是在组件或进程级共享：

`public final class TimeoutManager {    private final HashedWheelTimer timer =        new HashedWheelTimer(100, TimeUnit.MILLISECONDS, 512);    public Timeout register(RequestContext request, long timeoutMs) {        return timer.newTimeout(t -> request.tryTimeout(),                                   timeoutMs, TimeUnit.MILLISECONDS);       }   }`

请求提前完成时必须取消对应 Timeout，否则任务仍会留到目标槽位才被清理。取消不是为了阻止已经完成的业务，而是为了尽快减少定时器中的无效对象和到期扫描成本。

同时，`tryTimeout()` 必须幂等。真实系统里正常响应、超时、连接关闭可能并发竞争，最终只能有一个路径完成请求状态。这和上一篇 Promise 的“一次完成”原则完全一致。

## 8\. 定时任务堆积通常来自业务生命周期不闭环

线上看到 pending timeout 持续增长，不要第一反应就是时间轮泄漏。常见根因包括：

1.  1\. 请求成功后没有取消超时任务；
    
2.  2\. 重试每次创建新 Timeout，却没有取消前一轮；
    
3.  3\. 连接断开后批量任务仍引用 Channel 和业务上下文；
    
4.  4\. Worker 任务阻塞，过期速度低于创建速度；
    
5.  5\. 同一截止时间任务过多，单个 Bucket 形成尖峰；
    
6.  6. `maxPendingTimeouts` 没有限制，异常流量无限进入。
    

排查时至少记录：pending 数量、每秒创建/取消/过期数、任务执行耗时、单桶过期批量、超时延迟分布和拒绝次数。仅看“定时器线程 CPU”不足以定位生命周期问题。

## 9\. 超时回调只做状态竞争，耗时动作交给别处

推荐把超时任务写成轻量状态转换：

`timer.newTimeout(timeout -> {    if (requestPromise.tryFailure(new TimeoutException())) {           eventLoop.execute(() -> channel.writeAndFlush(timeoutResponse));       }   }, timeoutMillis, TimeUnit.MILLISECONDS);`

这里有两条线程边界：时间轮 Worker 决定请求是否抢到超时完成权；与 Channel 相关的写和关闭动作回到 EventLoop。不要在 TimerTask 中直接做阻塞 RPC、数据库访问、大对象序列化或批量日志。

如果回调需要取消其他任务，也要避免形成长链递归。时间轮的优势建立在每个过期任务足够轻的前提上；一旦回调变成业务执行器，所有 deadline 都会被前一个慢任务拖延。

## 10\. 停止 Timer 要处理未过期任务

`stop()` 不等于“等待所有任务执行”。停止后 Worker 会退出，并返回尚未处理的 Timeout 集合。组件关闭时应该明确决定：

*   • 未到期请求是统一失败，还是交给其他实例接管；
    
*   • 是否还允许新任务提交；
    
*   • 先停止业务入口，还是先停止 Timer；
    
*   • 如何释放 Timeout 引用的 Channel、Buffer 和上下文。
    

正确顺序通常是先停止新流量，完成或失败在途请求，再停止时间轮。直接停 Timer 会让依赖超时回收的请求永久悬挂。

## 11\. 时间轮的工程边界可以归纳为四条

时间轮主链如下：

`newTimeout     -> timeouts MPSC queue     -> Worker transferTimeoutsToBuckets     -> deadline / tickDuration     -> stopIndex + remainingRounds     -> waitForNextTick     -> bucket.expireTimeouts     -> TimerTask.run`

落地时记住四条：共享实例、限制 pending、回调轻量、状态幂等。时间轮解决的是大量超时任务的调度结构，不会自动解决请求生命周期、慢回调和关闭顺序。

下一篇进入操作系统边界：Epoll 与 KQueue 为什么不只是把 Selector 换了名字，它们如何通过 native Channel、事件数组和平台能力暴露 Linux/BSD 特性，以及什么时候值得为性能和功能承担平台绑定。

## 参考资料

1.  1\. Netty `HashedWheelTimer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/HashedWheelTimer.java
    
2.  2\. Netty `AbstractScheduledEventExecutor.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/AbstractScheduledEventExecutor.java
    
3.  3\. Netty Timer API：https://netty.io/4.1/api/io/netty/util/Timer.html

---

## 22. Netty 异步结果源码：Future、Promise 与 Listener 如何串起回调（源码系列第11篇） 22. Netty 异步结果源码：Future、Promise 与 Listener 如何串起回调（源码系列第11篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489545&idx=1&sn=569bceff733d78b96474100345d42802&chksm=eb675f7fdc10d6692b18f10dd9f58625e52476b2c383a3f73de5ff26cc6d6e7b051e827d8a31

> Netty 的 `Future` 不是 JDK `Future` 的简单包装，而是把“异步 I/O 结果、完成状态、监听器回调、EventLoop 线程归属”合在一起的通知机制。`Promise` 负责写入结果，`Future` 负责暴露状态，`Listener` 负责非阻塞续流程；如果在 EventLoop 里阻塞等待 Future，就等于让完成这个 Future 的线程停下来，死锁和吞吐抖动都会从这里开始。

前 10 篇已经把 Netty 的连接、读写、Pipeline、ByteBuf、写缓冲和背压串起来了。现在还缺一块：一次 `bind()`、`connect()`、`writeAndFlush()` 返回的结果到底怎样通知业务？为什么 Netty 官方一直强调“优先使用 `addListener`，不要在 I/O 线程里 `await`”？为什么有些回调明明是业务线程添加的，最后却在 EventLoop 上执行？

这不是 API 使用细节，而是 Netty 异步模型的核心边界。Netty 的 I/O 调用通常立即返回一个 `ChannelFuture`，它表示“操作已经提交”，不表示“操作已经完成”。操作完成后，内部持有写权限的一方会通过 `Promise` 设置成功或失败；此前注册的 `Listener` 会被通知，并且通知线程通常由关联的 `EventExecutor` 决定。对 Channel I/O 来说，这个执行器大多就是 Channel 绑定的 EventLoop。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：
    

*   • `common/src/main/java/io/netty/util/concurrent/Future.java`
    
*   • `common/src/main/java/io/netty/util/concurrent/Promise.java`
    
*   • `common/src/main/java/io/netty/util/concurrent/DefaultPromise.java`
    
*   • `transport/src/main/java/io/netty/channel/ChannelFuture.java`
    
*   • `transport/src/main/java/io/netty/channel/DefaultChannelPromise.java`
    

*   • 官方源码：
    

*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/DefaultPromise.java
    
*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelFuture.java
    
*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPromise.java
    


这张图可以按职责分界理解：用户拿到的是 `ChannelFuture`，真正能设置结果的是 `Promise`；结果写入后不是让调用线程阻塞返回，而是通过 `notifyListeners` 把后续逻辑交给 Listener。Listener 是否立即执行，取决于当前线程是不是 Promise 绑定的 `EventExecutor` 线程，以及当前回调栈深度是否安全。

## 1\. Future 是只读结果，Promise 是可写结果

Netty 把异步结果拆成两面：对外暴露 `Future`，对内持有 `Promise`。这件事的工程价值很直接：业务可以观察结果，但不能随意篡改 I/O 操作的完成状态；内部 I/O 流程可以在真正完成时设置成功或失败。

可以把两者理解成一张状态单：

对象

主要角色

谁持有

能做什么

不该做什么

`Future`

只读视图

调用方、业务 Handler

查状态、拿异常、注册 Listener、必要时等待

不能设置成功或失败

`Promise`

可写结果

Netty 内部、少量扩展代码

`setSuccess`

、`setFailure`、通知等待者和 Listener

不应泄露给无关业务随意完成

`ChannelFuture`

Channel I/O Future

`bind/connect/write/close`

 返回

关联一个 Channel，表示 I/O 操作结果

不表示调用返回时已经完成

`ChannelPromise`

Channel I/O Promise

出站写、注册、关闭等内部流程

携带 Channel，并由 I/O 流程完成

不应跨连接混用

`ChannelFuture` 的官方注释已经把这个边界说得很清楚：Netty 的 I/O 操作是异步的，调用返回时不保证请求的 I/O 已完成，调用方拿到的是一个能表示结果或状态的 `ChannelFuture`。这也是为什么下面这段代码存在隐患：

`ChannelFuture f = channel.writeAndFlush(msg);   if (f.isSuccess()) {    // 很可能不会进入：此时 write 只是提交，I/O 还没完成   }`

正确的思路是把“完成之后要做什么”放进 Listener：

`channel.writeAndFlush(msg).addListener(f -> {    if (!f.isSuccess()) {           log.warn("write failed", f.cause());       }   });`

这里的关键不是 Lambda 语法，而是控制流从“同步判断”变成了“完成通知”。Netty 的吞吐能力很大程度上来自这个模型：I/O 线程不为单个操作停住，业务线程也不必为了等网络写完而占住调用栈。

## 2\. ChannelFuture 承诺的是状态机，不是同步返回值

`ChannelFuture` 最容易被误用的地方，是把它当成一个“马上有结果”的对象。实际上它的状态机只有两个阶段：未完成，已完成；已完成再细分为成功、失败和取消。失败与取消也属于完成状态，这一点对排障很重要。

简化状态如下：

`Uncompleted     -> Completed successfully     -> Completed with failure     -> Completed by cancellation`

这带来三个直接结论：

1.  1. `isDone()` 只说明操作结束，不说明成功。
    
2.  2. `isSuccess()` 才说明成功结束。
    
3.  3. `cause()` 只有失败时才有意义，未完成时读取会误导排查。
    

连接和写出场景尤其要注意：

`ChannelFuture f = bootstrap.connect(host, port);   f.addListener(future -> {    if (future.isSuccess()) {        // 连接建立后再发送首包       } else {        // 这里才能可靠拿到连接失败原因       }   });`

如果用 `await(timeout)` 做连接超时判断，还会踩另一个坑：`await` 的超时只是“等待 Future 完成的超时”，不是 I/O 操作本身的超时。连接超时应通过 `ChannelOption.CONNECT_TIMEOUT_MILLIS` 这类 I/O 配置控制。等待超时后 Future 可能仍未完成，此时读 `cause()` 可能得到空值，并不代表连接没有异常。

这一点在线上很常见：日志里出现“连接失败但没有 cause”，多数不是 Netty 丢了异常，而是业务在 Future 未完成时提前判断。

## 3\. DefaultPromise 用一次 CAS 锁定最终结果

`DefaultPromise` 是这篇文章的核心类。它保存结果、保存监听器、处理等待者，并决定 Listener 如何被触发。

源码中有几个关键字段：

`volatile Object result;   EventExecutor executor;   listener / listeners;   waiters;   notifyingListeners;`

按源码逻辑精简后，完成 Promise 的核心路径可以写成：

`setSuccess(result)     -> setValue0(resultOrSuccessMarker)     -> CAS(null or UNCANCELLABLE, finalResult)     -> notify waiters     -> notifyListeners()`

真实源码里，`setValue0` 使用 `AtomicReferenceFieldUpdater` 对 `result` 做 CAS：只有从“未完成”或“不可取消但未完成”变成最终结果的线程能成功。成功后才会唤醒阻塞等待者，并通知 Listener。第二次完成会失败：`trySuccess` 返回 false，`setSuccess` 抛出“已经完成”的异常。

这个设计解决两个问题：

*   • 并发完成时只能有一个结果。I/O 成功、超时失败、关闭失败不可能同时成为最终状态。
    
*   • 完成动作和回调通知分离。结果先落到 `result`，通知只是后续传播动作。
    

工程上要避免自己重复完成 Promise：

`if (!promise.trySuccess()) {    // 已被其他路径完成，不要再 setFailure 覆盖   }`

如果扩展 Netty Handler 或写自定义异步组件，优先用 `trySuccess/tryFailure` 处理竞态。`setSuccess/setFailure` 更适合你能证明只有一个完成路径的场景；否则线上偶发 `complete already` 会很难看，因为它通常只在异常、超时、关闭同时发生时暴露。

## 4\. Listener 先被缓存，完成后再按 EventExecutor 通知

Listener 的注册和执行不是同一个动作。`addListener` 只是把监听器放入 Promise；如果此时 Promise 已经完成，再触发通知。这个设计保证了两种顺序都能工作：

`先 addListener，后完成：完成时通知   先完成，后 addListener：添加后立即安排通知`

按源码逻辑简化：

`addListener(listener)     -> synchronized 保存 listener     -> 如果 isDone，调用 notifyListeners()`

这里有两个细节值得注意。

第一，Listener 保存受锁保护，但结果完成用 CAS。Netty 没有用一把大锁把所有状态都串起来，而是把“结果一次性完成”和“监听器集合维护”分开处理。这样完成路径足够轻，监听器集合又能维持顺序和可见性。

第二，Listener 在通知时会被取出并清空。如果通知过程中又新增 Listener，`notifyListenersNow` 会继续下一轮，直到没有新 Listener。这个细节避免了回调里继续注册回调时丢事件，但也意味着 Listener 链可以形成很深的嵌套。

因此 Listener 应保持短小：

`future.addListener(f -> {    if (!f.isSuccess()) {           metrics.writeFailed();           log.warn("write failed", f.cause());       }   });`

不要在 Listener 里做重 CPU、阻塞数据库调用、同步 RPC 或长时间循环。它不是“业务线程池回调”，它大概率就在 EventLoop 上执行。阻塞 Listener 的效果，和阻塞 `channelRead` 没本质区别：同一个 EventLoop 上的其他 Channel 也会被拖慢。

## 5\. 回调线程由 executor 决定，ChannelPromise 默认绑定 EventLoop

`DefaultPromise` 构造时可以带一个 `EventExecutor`。`DefaultChannelPromise` 更进一步：如果没有显式传 executor，它的 `executor()` 会回退到 `channel().eventLoop()`。

按源码逻辑整理：

`DefaultChannelPromise.executor()     -> super.executor()     -> 如果为空，返回 channel().eventLoop()`

这解释了一个常见现象：业务线程调用 `channel.writeAndFlush(msg).addListener(...)`，Listener 最终并不一定在业务线程执行。对于 Channel I/O Promise，它通常在 Channel 所属 EventLoop 上被通知。

这个设计不是偶然的。Netty 希望 Channel 状态相关的后续动作仍保持单线程串行：

*   • 写成功后继续写下一批消息。
    
*   • 连接成功后初始化 Channel 状态。
    
*   • 关闭完成后清理与该 Channel 绑定的资源。
    
*   • 写失败后触发降级、关闭或重试。
    

这些动作如果都回到同一个 EventLoop，就不会和该 Channel 的读写事件并发交错。代价也很明确：Listener 不能做耗时操作。

如果确实要在写完成后做耗时业务动作，建议把动作显式切到业务线程池：

`channel.writeAndFlush(msg).addListener(f -> {    if (f.isSuccess()) {           businessExecutor.execute(() -> afterWriteAck(msg));       }   });`

注意不要反过来：先在 Listener 里做完耗时逻辑，再提交。Listener 所在的 EventLoop 已经被你占住了。

## 6\. notifyListeners 在“直接执行”和“提交任务”之间做保护

`DefaultPromise.notifyListeners()` 有一个关键分支：如果当前线程已经在绑定的 EventExecutor 中，并且回调栈深度没有超过阈值，就直接执行；否则通过 `safeExecute` 把通知任务提交给 executor。

按源码逻辑可以概括为：

`notifyListeners()     -> if executor.inEventLoop() and stackDepth safe       notifyListenersNow()     else          executor.execute(() -> notifyListenersNow())`

这不是小优化，而是 Netty 在延迟和安全之间的取舍：

分支

好处

风险

Netty 的处理

EventLoop 内直接执行

少一次任务入队，回调延迟低

Listener 链递归过深

用 `futureListenerStackDepth` 限制

非 EventLoop 提交任务

保证回到正确 executor

多一次调度

用 `safeExecute` 捕获提交失败

通知中新增 Listener

不丢事件

可能形成长链

循环继续取出新 Listener

这里要特别关注 `safeExecute`。如果 EventLoop 已关闭，提交 Listener 通知任务可能失败。Netty 会记录错误，但业务不能假设“只要 Future 完成，Listener 一定成功运行”。关闭流程、异常恢复、压测停机时，这类边界需要通过幂等清理和外部超时兜底处理。

这个分支也解释了为什么某些回调“看起来同步”，某些回调“像是异步”。当 Promise 在 EventLoop 内完成且栈深度安全时，Listener 会直接运行；当其他线程完成 Promise，或者栈深度超过保护阈值，就会变成 executor 任务。

## 7\. 写完成通知来自出站缓冲释放，不是 write 调用返回

把第 6 篇和第 10 篇连起来看，`writeAndFlush` 的 Future 完成时机尤其重要：它不是消息进入 `ChannelOutboundBuffer` 时完成，而是写出路径确认该消息已经被处理完时完成。成功写完会成功 Promise，写失败会失败 Promise。

可以用一条简化链路理解：

`User Thread     -> channel.writeAndFlush(msg)     -> msg 进入 ChannelOutboundBuffer   EventLoop     -> flush0 / doWrite     -> SocketChannel.write     -> removeBytes / remove     -> promise.setSuccess or setFailure     -> listener.operationComplete`


这张时序图强调两件事：第一，用户线程拿到 Future 时，消息通常只是提交到 Netty 出站链路；第二，真正完成 Future 的位置在 EventLoop 写出和缓冲移除之后。Listener 看到的是 I/O 操作结果，不是业务方法调用结果。

因此下面的写法容易误导：

`ChannelFuture f = channel.writeAndFlush(msg);   recordSent(msg); // 这里并不代表已经写成功`

更准确的写法是：

`channel.writeAndFlush(msg).addListener(f -> {    if (f.isSuccess()) {           recordWriteSuccess(msg);       } else {           recordWriteFailure(msg, f.cause());       }   });`

不过这里还有一个业务语义边界：写成功只说明数据已经被 Netty/JDK Socket 写出到内核或底层传输路径，并不等于对端业务已经处理。要表达“对端已处理”，必须有应用层 ACK。很多系统把 write success 当业务成功，最后出现消息丢失或重复补偿混乱，本质就是混淆了网络写成功和业务确认。

## 8\. await 可以用，但不能在 EventLoop 中用

Netty 并没有禁止 `await`，但它明确不建议在 I/O 回调里使用。原因很简单：EventLoop 是完成 I/O 的线程，你在这个线程上等待 I/O 完成，可能把完成动作本身堵住。

典型错误：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    ChannelFuture f = ctx.writeAndFlush(response);       f.awaitUninterruptibly(); // 错误：可能阻塞 EventLoop   }`

这段代码的问题不是“写法不优雅”，而是直接破坏事件循环模型。EventLoop 原本应该继续 flush、处理 OP\_WRITE、执行 Promise 通知；现在它被当前 Handler 卡住，只能等一个可能需要自己推进的结果。

更好的方式：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {       ctx.writeAndFlush(response).addListener(f -> {        if (!f.isSuccess()) {               ctx.close();           }       });   }`

如果确实在非 EventLoop 线程中需要等待，例如启动流程中等待 bind 完成，可以用 `sync()` 或 `await()`，但要满足两个前提：

1.  1\. 当前线程不是该 Channel 的 EventLoop。
    
2.  2\. 等待有明确边界，失败时能退出，而不是无限阻塞。
    

启动代码里常见：

`ChannelFuture bindFuture = bootstrap.bind(port).sync();   Channel ch = bindFuture.channel();`

这类等待通常发生在 main 线程或管理线程，不在 I/O 回调里，所以风险可控。判断标准不是“能不能 await”，而是“当前线程是否承担推进这个 Future 完成的职责”。

## 9\. VoidPromise 会吞掉通知能力，适合极少数热路径

Netty 里还有一个容易被忽略的对象：`VoidChannelPromise`。一些写路径为了减少对象创建和 Listener 开销，会使用 void promise。它适合“我不关心这次操作结果”的场景，但代价是明显的：不能添加 Listener，不能 await，也拿不到失败结果。

普通业务代码不要轻易追求这个优化。因为写失败、连接关闭、背压异常往往都需要被观测。用 void promise 省掉的是小开销，丢掉的是故障证据。

可以这样做取舍：

场景

推荐 Promise

原因

业务响应写出

普通 `ChannelPromise` / 默认 `ChannelFuture`

需要失败日志、指标和清理

连接建立、关闭

`ChannelFuture`

 + Listener

需要严格串联生命周期

高频心跳且允许丢观测

可评估 void promise

只在指标充分时考虑

框架内部极端热路径

定制 Promise 策略

需要源码级证明收益

对大多数服务，Future/Promise 的开销不是瓶颈。真正拖垮系统的更常见问题，是 Listener 阻塞、写积压不处理、失败不观测、在 EventLoop 里 await。

## 10\. Listener 里的异常不会让 Future 失败

还有一个排障细节：Listener 自己抛异常，不会改变 Future 的结果。`DefaultPromise` 调用 `operationComplete` 时会捕获 Throwable 并记录日志。Future 已经完成，Listener 只是完成后的观察者。

这意味着：

`channel.writeAndFlush(msg).addListener(f -> {    throw new RuntimeException("bug in callback");   });`

这不会把写操作改成失败。写操作是否成功，取决于 I/O 路径设置的 Promise 结果；回调异常只是回调自身失败。工程上应该把 Listener 当成普通业务代码管理：

*   • 回调内部要做异常隔离。
    
*   • 指标和日志要能区分 I/O 失败与回调失败。
    
*   • 多个 Listener 之间不要隐含强依赖。
    
*   • 清理逻辑要幂等，避免重复通知或回调失败造成资源残留。
    

如果一个 Listener 失败会影响后续业务状态，不要只依赖 Netty 的日志。应在 Listener 内部显式捕获，并交给业务错误处理链：

`future.addListener(f -> {    try {           updateStateAfterWrite(f);       } catch (Throwable t) {           alarm("write callback failed", t);       }   });`

这不是为了吞异常，而是为了把“回调代码失败”从 Netty 内部日志里拉回业务可观测系统。

## 11\. Future 链路的线上问题通常是线程边界问题

Netty Future 相关问题，表面看是回调没执行、写成功判断错、超时不生效，底层往往都是线程边界和语义边界没分清。

排查时可以按这张表定位：

现象

优先检查

典型原因

修复方向

Listener 延迟很高

EventLoop 是否被阻塞

Listener 或 Handler 做了耗时任务

切业务线程池，缩短 EventLoop 任务

Future 未完成

I/O 是否仍在等待

写缓冲积压、连接未关闭、OP\_WRITE 等待

看第 10 篇背压路径

`cause()`

 为空

是否未完成就读取

把 await timeout 当 I/O timeout

用 Listener 或先判断 `isDone`

偶发 `complete already`

Promise 是否多路径完成

超时、关闭、异常竞争

用 `trySuccess/tryFailure` 幂等完成

关闭后回调丢失

executor 是否已关闭

EventLoop 关闭导致通知任务提交失败

关闭流程前完成关键 Promise，外部兜底

业务状态错乱

是否混淆写成功和业务 ACK

网络写成功被当成对端处理成功

引入应用层 ACK

我的建议是：所有 Channel I/O 的后续动作默认写成 Listener；Listener 中只做轻量状态切换、指标、日志和任务转发；需要耗时处理时显式切线程池；需要业务确认时引入协议级 ACK；需要等待时确认当前线程不是 EventLoop。

## 12\. 把 Future 理解成“事件边界”，代码会更稳

读完 `DefaultPromise` 之后，不要把 Netty Future 理解成“一个异步返回值容器”这么浅。它真正承担的是事件边界：

`调用方提交 I/O     -> Future 暴露只读状态     -> Promise 在真实完成点写入结果     -> Listener 在正确 executor 上继续流程`

这条边界让 Netty 可以把大量连接、I/O 事件、任务队列和回调逻辑统一到 EventLoop 模型里。它也对业务提出要求：不要阻塞事件线程，不要提前读取未完成结果，不要把写成功等同于业务成功，不要让回调变成隐藏的慢任务。

如果只记一句话，我会这样总结：`Future` 是观察结果的入口，`Promise` 是完成结果的权力，`Listener` 是继续执行的协议；三者真正依赖的是 EventLoop 线程模型。理解这个边界，前面 10 篇里的启动、连接、读写、背压和关闭流程才能串成完整的 Netty 异步运行时。

## 参考资料

*   • Netty `DefaultPromise.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/DefaultPromise.java
    
*   • Netty `ChannelFuture.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelFuture.java
    
*   • Netty `DefaultChannelPromise.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPromise.java
    
*   • Netty 官方 Wiki：https://netty.io/wiki/

---

## 21. Netty 写缓冲与背压源码：慢连接为什么会拖垮内存（源码系列第10篇） 21. Netty 写缓冲与背压源码：慢连接为什么会拖垮内存（源码系列第10篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489521&idx=1&sn=eea6ee326328ab0d0ec71f15e1d141f5&chksm=eb675087dc10d99105b7ad130e77e6fb742631f1ddfc946cf63bee2e037ce329a4a56853713e

> Netty 不会因为对端慢就自动丢弃业务消息。写不出去的数据会留在 `ChannelOutboundBuffer`，pending bytes 超过高水位后 `Channel.isWritable()` 变为 false，并触发 `channelWritabilityChanged`。真正的背压必须由业务响应这个信号：暂停生产、停止读取或降级丢弃，否则慢连接会把直接内存拖爆。

很多 Netty 服务压测初期表现很好，上线后却在某些时刻直接内存飙升。日志看不到异常，CPU 也不一定高，最终出现 `OutOfDirectMemoryError` 或容器 OOM。根因常常不是 ByteBuf 泄漏，而是写侧积压：消息都还在等着发。

慢连接很危险，因为它不会立即失败。客户端还活着，只是读得慢；网络还能写，只是每次写一点；服务端业务还在生产，只是发送队列越来越长。Netty 提供了水位线和可写状态，但不会替业务决定“还要不要继续生产”。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`ChannelOutboundBuffer.java`、`DefaultChannelConfig.java`、`WriteBufferWaterMark.java`
    
*   • 官方仓库：https://github.com/netty/netty
    


这张流程图要抓住高低水位的滞回关系：pending bytes 超过 highWaterMark 后，Channel 变为不可写；只有下降到 lowWaterMark 以下才恢复可写。Netty 只提供信号，不会替业务决定丢弃、合并、暂停拉取还是关闭连接。真正的背压闭环必须把 `isWritable=false` 传回生产者。

## 1\. 写缓冲积压不是泄漏，但同样会 OOM

ByteBuf 泄漏是“没有人再需要它，却没有 release”。写缓冲积压是“仍然有人需要它，但发送速度跟不上生产速度”。二者表现都可能是直接内存增长，但处理方式完全不同。

写积压路径：

`业务持续 write     -> ChannelOutboundBuffer.addMessage     -> pendingOutboundBytes 增长     -> SocketChannel.write 返回 0 或写很少     -> 注册 OP_WRITE 等待可写     -> 业务继续 write     -> 队列继续增长`

如果业务不看可写状态，Netty只能继续接收消息，直到内存耗尽或连接被关闭。

## 2\. ChannelOutboundBuffer 统计待发送字节

`ChannelOutboundBuffer.addMessage(msg, size, promise)` 会创建 Entry，并增加待发送字节。简化逻辑：

`Entry entry = Entry.newInstance(msg, size, total(msg), promise);   if (tailEntry == null) {       flushedEntry = null;   } else {    Entry tail = tailEntry;       tail.next = entry;   }   tailEntry = entry;   if (unflushedEntry == null) {       unflushedEntry = entry;   }   incrementPendingOutboundBytes(entry.pendingSize, false);`

pending size 不只是消息本体大小，还包括一定对象开销估算。它用于水位线判断，而不是精确内存会计。

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java`
    
*   • 方法：`addMessage`、`incrementPendingOutboundBytes`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java
    

当消息成功写完或失败移除时，`decrementPendingOutboundBytes` 会减少计数，并可能触发可写状态恢复。

## 3\. 高低水位形成滞回，避免状态抖动

Netty 使用 `WriteBufferWaterMark`：

`new WriteBufferWaterMark(low, high)`

默认值常见为低水位 32KB、高水位 64KB。语义：

*   • pending bytes > high：Channel 变为不可写。
    
*   • pending bytes < low：Channel 恢复可写。
    
*   • low 与 high 之间保持当前状态。
    

为什么不是超过 64KB 不可写，低于 64KB 立即可写？因为那会在边界附近频繁抖动。高低水位形成滞回区间，让业务有更稳定的暂停/恢复信号。

可写状态不是单一位。`ChannelOutboundBuffer` 内部维护 unwritable 标志位，除了写缓冲水位，用户也可设置自定义不可写位。最终 `channel.isWritable()` 综合这些状态。

## 4\. 状态变化通过 channelWritabilityChanged 传播

pending bytes 超过高水位时，Netty 会触发：

`pipeline.fireChannelWritabilityChanged();`

业务 Handler 可以处理：

`@Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {           producer.resume(ctx.channel());           ctx.read();       } else {           producer.pause(ctx.channel());       }       ctx.fireChannelWritabilityChanged();   }`

注意一定要把信号传给真正的生产者。只打印日志没有背压效果。对于请求响应服务，生产者可能就是入站 read：不可写时停止 auto read 或不再调用 read；对于推送服务，生产者可能是消息队列订阅、定时广播或上游 RPC，需要暂停拉取或丢弃低优先级消息。

## 5\. bytesBeforeUnwritable/bytesBeforeWritable 可做细粒度控制

Channel 提供：

`channel.bytesBeforeUnwritable();   channel.bytesBeforeWritable();`

前者表示还能写多少字节就会变不可写，后者表示还需要发送多少字节才恢复可写。

批量推送时可以在写前判断：

`while (channel.isWritable() && hasMore()) {    Message msg = next();    if (channel.bytesBeforeUnwritable() < estimateSize(msg)) {        break;       }       channel.write(msg);   }   channel.flush();`

这样比写到不可写再暂停更温和。尤其在单条消息很大时，如果完全不估算，可能一次写入就越过水位很多。

## 6\. OP\_WRITE 只说明内核缓冲曾经写不下

写不完时，Netty 注册 `OP_WRITE` 等待 Socket 可写。很多人误以为 OP\_WRITE 是背压信号。它只是内核层面的“之前写不下，现在可能能写了”。用户态积压和业务生产速度仍需要水位线控制。

可能出现：

*   • OP\_WRITE 频繁触发，但每次只能写很少。
    
*   • pending bytes 仍持续增长。
    
*   • Channel 长期不可写。
    
*   • EventLoop 花大量时间尝试 flush 慢连接。
    

此时正确策略不是无限等，而是业务超时、限流、丢弃或关闭慢连接。不同业务选择不同：聊天消息可能保留关键消息丢弃弱提示；行情推送可能只保留最新快照；文件传输则应自然等待但限制并发。

## 7\. 入站背压要把写侧状态传回 read

请求响应模型里，如果响应写不出去，还继续读取新请求，就会形成双重积压：入站业务任务和出站响应队列同时增长。

一种简单策略：

`@Override   public void channelReadComplete(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {           ctx.read();       }   }      @Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {           ctx.read();       }   }`

前提是关闭 `AUTO_READ`。这样当写侧不可写时，不再主动读取更多请求；当发送缓冲下降到低水位，再恢复读取。

这会把压力传回 TCP 接收窗口和客户端发送端，是端到端背压链的一部分。

## 8\. 推送系统需要按用户/连接维度做队列策略

长连接推送服务中，业务生产者通常不由客户端请求驱动，而由后端事件驱动。写侧不可写时，必须定义队列策略：

策略

适合消息

代价

暂停上游拉取

可反压 MQ 或流系统

增加端到端延迟

丢弃低优先级

在线状态、弱提醒

需要业务可接受

合并保留最新

行情、位置、进度

丢中间状态

断开慢连接

强实时服务

用户体验受影响

落盘补偿

重要通知

系统复杂度高

不要把 Netty 的 ChannelOutboundBuffer 当业务消息队列。它缺少优先级、过期、合并、持久化和可观测性，只是网络发送队列。

## 9\. 水位线不是越大越好

调大 highWaterMark 可以减少不可写状态，但也允许更多内存积压。假设 10 万连接，每条连接允许 1MB 写缓冲，理论上就是 100GB 用户态积压。即使大多数连接不满，峰值风险仍很高。

水位线应结合：

*   • 单连接最大可接受积压。
    
*   • 消息平均大小和最大大小。
    
*   • 连接数量。
    
*   • 直接内存上限。
    
*   • 客户端网络质量。
    
*   • 业务是否允许丢弃或合并。
    

通常应先建立业务背压策略，再微调水位线。只调大水位线是一种延迟爆炸。


这张时序图展示了慢客户端故障的完整扩散路径：生产速度高于发送速度，内核发送缓冲写满，Netty 注册 `OP_WRITE`，用户态 `ChannelOutboundBuffer` 持续增长。正确分支是在不可写时暂停生产或停止读取；错误分支是继续写，把网络慢问题放大成直接内存问题。

## 10\. ChannelOutboundBuffer 还影响 writability 事件顺序

当 pending bytes 跨越水位线，Netty 不一定在当前调用栈同步执行用户 Handler。它可能调用 `fireChannelWritabilityChanged(invokeLater)`，把事件延后到 EventLoop 后续任务中，避免重入和复杂状态交错。

这意味着业务不能假设刚 write 完马上同步收到不可写回调。更稳妥的方式是在写循环中主动检查 `isWritable()`，同时在回调中恢复生产。

## 11\. 慢连接排查指标

建议至少观测：

*   • 每个 Channel 的 pending outbound bytes。
    
*   • 不可写 Channel 数量。
    
*   • `channelWritabilityChanged` 频率。
    
*   • OP\_WRITE 注册数量或持续时间。
    
*   • write Future 完成延迟。
    
*   • EventLoop flush 耗时。
    
*   • 业务生产速率与实际发送速率。
    
*   • 连接维度消息丢弃/合并数量。
    

如果不可写连接数上升且 direct memory 增长，优先判断慢客户端或网络拥塞。如果不可写不多但内存增长，可能是少数超级连接或 ByteBuf 泄漏。如果 write Future 大量失败，可能是连接关闭或编码异常。

## 12\. 一个可落地的背压模板

连接初始化：

`ch.config().setAutoRead(false);   ch.config().setWriteBufferWaterMark(    new WriteBufferWaterMark(32 * 1024, 128 * 1024));`

Handler：

`@Override   public void channelActive(ChannelHandlerContext ctx) {       ctx.read();   }      @Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {       handleAsync(msg).whenComplete((resp, err) -> {           ctx.executor().execute(() -> {            if (err != null) {                   ctx.close();                return;               }               ctx.writeAndFlush(resp);            if (ctx.channel().isWritable()) {                   ctx.read();               }           });       });   }      @Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {           ctx.read();       }       ctx.fireChannelWritabilityChanged();   }`

这不是唯一答案，但体现了闭环：处理完成、写侧可用、才读下一批。实际项目还要加超时、异常释放、业务线程池容量和协议层错误返回。

## 13\. 和应用层限流的关系

Netty 背压解决的是单连接网络发送能力；应用限流解决的是系统整体处理能力。二者不能互相替代。

如果系统总 QPS 超过数据库能力，即使每条 Channel 都可写，也需要全局限流。如果只有某个客户端网络慢，不能因为全局限流让所有用户受影响，应在该 Channel 维度暂停或关闭。

最佳实践通常是多层背压：

`全局入口限流     -> 业务线程池有界队列     -> Channel 写水位线     -> AUTO_READ 控制     -> 协议级降级/丢弃/关闭`

每一层都要有明确指标和策略，否则压力只会转移到下一层。

## 14\. 总结：Netty 给信号，业务做决策

写侧背压主链：

`write     -> ChannelOutboundBuffer.addMessage     -> pending bytes 增长     -> 超过 highWaterMark     -> isWritable=false     -> channelWritabilityChanged     -> 业务暂停生产/读取     -> doWrite 逐步发送     -> 低于 lowWaterMark     -> isWritable=true     -> 业务恢复`

Netty 能告诉你“这条连接现在承载不了更多写入”，但它不知道你的消息能不能丢、能不能合并、能不能延迟、要不要断开。背压的最后一公里必须由业务协议完成。

至此前 10 篇完成了一条完整链路：启动、接入、事件循环、读、写、Pipeline、内存、解码和背压。下一阶段可以继续深入 Future/Promise、定时任务、Selector 重建、IdleStateHandler、Native Transport 和 HTTP/WebSocket 等专项。

## 参考资料

1.  1. `ChannelOutboundBuffer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java
    
2.  2. `WriteBufferWaterMark.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/WriteBufferWaterMark.java
    
3.  3. `DefaultChannelConfig.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelConfig.java
    
4.  4. `AbstractNioByteChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioByteChannel.java

---

## 20. ByteToMessageDecoder 源码：半包、粘包与累积缓冲区（源码系列第9篇） 20. ByteToMessageDecoder 源码：半包、粘包与累积缓冲区（源码系列第9篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489516&idx=1&sn=3f7cdc05de488060c0bf5b04fbfdf5ca&chksm=eb67509adc10d98ccb27b68e69a33458abada937da9e81260c51fecb5de288164adf74bfa64d

> `ByteToMessageDecoder` 的价值不是帮你“把 ByteBuf 转对象”这么简单，而是把 TCP 字节流的不确定边界，收束成业务可消费的消息边界。它通过 cumulation 保存半包，通过 `callDecode` 循环产出完整消息，并用 readerIndex 前进检测避免死循环。

TCP 不保证消息边界。你发送两次：

`send(requestA)   send(requestB)`

服务端可能收到：

`read1: requestA 前半段   read2: requestA 后半段 + requestB 全部`

这就是半包和粘包。问题不在 TCP“不可靠”，而在 TCP 本来就是字节流协议。应用层如果需要消息概念，就必须定义帧边界，例如固定长度、分隔符、长度字段或更复杂的协议状态机。

Netty 把这类问题放到 `ByteToMessageDecoder`。业务 Handler 不应该处理任意 ByteBuf 分块，而应该收到完整请求对象。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`codec/src/main/java/io/netty/handler/codec/ByteToMessageDecoder.java`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec/src/main/java/io/netty/handler/codec/ByteToMessageDecoder.java
    


这张流程图的关键是 `cumulation` 和 `callDecode` 循环。新 ByteBuf 不是直接等同于一个业务请求，而是先和历史半包合并，再由 `decode` 判断是否足够产出完整消息。写自定义 Decoder 时，最重要的约束是：产出消息必须推进 `readerIndex`，输入不完整则必须保留状态并退出。

## 1\. Decoder 是入站 Handler，但它管理跨 read 状态

`ByteToMessageDecoder` 继承 `ChannelInboundHandlerAdapter`。它重写 `channelRead`，只处理 ByteBuf 类型：

`public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {    if (msg instanceof ByteBuf) {        CodecOutputList out = CodecOutputList.newInstance();        try {               first = cumulation == null;               cumulation = cumulator.cumulate(ctx.alloc(),                       first ? Unpooled.EMPTY_BUFFER : cumulation,                       (ByteBuf) msg);               callDecode(ctx, cumulation, out);           } finally {            // 处理 cumulation 生命周期并 fire out           }       } else {           ctx.fireChannelRead(msg);       }   }`

它和普通 Handler 最大不同是持有 `cumulation`。这正是它不能随便 `@Sharable` 的原因：不同连接的半包状态必须隔离。如果多个 Channel 共享同一个 Decoder 实例，A 连接的半包可能与 B 连接的数据混在一起，后果非常严重。

## 2\. cumulation 把多次 Socket read 变成连续输入

当一次 read 不足以组成完整消息，Decoder 不能丢弃数据。它把剩余字节保存在 `cumulation` 中，下次新的 ByteBuf 到来时合并。

Netty 提供两种主要 cumulator：

策略

方式

优点

代价

`MERGE_CUMULATOR`

把新字节复制到连续 Buffer

读取简单、局部性好

可能复制

`COMPOSITE_CUMULATOR`

用 CompositeByteBuf 组合组件

减少大块复制

组件管理复杂

默认场景下，连续内存更简单高效。大消息或零拷贝敏感场景，可以考虑 Composite，但要评估组件数量和释放成本。

cumulation 的生命周期很微妙。若已读完且 refCnt 可释放，Decoder 会 release 并置空；若还有剩余可读字节，则保留到下一次。用户自定义 decode 不应偷偷保存 cumulation 引用到别处，除非明确 retain。

## 3\. callDecode 是防御性很强的循环

`callDecode(ctx, in, out)` 大致逻辑：

`while (in.isReadable()) {    final int outSize = out.size();    if (outSize > 0) {           fireChannelRead(ctx, out, outSize);           out.clear();        if (ctx.isRemoved()) {            break;           }       }    int oldInputLength = in.readableBytes();       decodeRemovalReentryProtection(ctx, in, out);    if (ctx.isRemoved()) {        break;       }    if (out.isEmpty()) {        if (oldInputLength == in.readableBytes()) {            break;           } else {            continue;           }       }    if (oldInputLength == in.readableBytes()) {        throw new DecoderException(            "did not read anything but decoded a message");       }    if (isSingleDecode()) {        break;       }   }`

这段代码主要防三类错误。

第一，输入不够时必须退出。decode 不产出消息且 readerIndex 不前进，说明还需要更多数据。

第二，不能“凭空产出消息”。如果 decode 产出了消息，却没有消费任何输入，循环会无限产出，Netty 直接抛异常。

第三，Handler 可能在 decode 中被移除，所以每轮都检查 `ctx.isRemoved()`，避免继续访问已移除节点。

这就是成熟框架和手写 while 解码最大的差别：它不只处理正常路径，还防止用户 decode 写错后把 EventLoop 打满。

## 4\. 自定义 decode 的正确姿势

以长度字段协议为例：

`4 字节长度 + N 字节 payload`

decode 模板：

`protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {    if (in.readableBytes() < 4) {        return;       }          in.markReaderIndex();    int len = in.readInt();    if (in.readableBytes() < len) {           in.resetReaderIndex();        return;       }    ByteBuf frame = in.readRetainedSlice(len);       out.add(frame);   }`

关键点：

*   • 判断长度前确认长度字段本身完整。
    
*   • 读了长度但 payload 不完整时，恢复 readerIndex。
    
*   • 产出的 ByteBuf 使用 retained slice，保证下游拥有引用。
    
*   • 不要在输入不足时抛异常。
    
*   • 对异常长度做上限保护。
    

更好的方式是直接使用 Netty 的 `LengthFieldBasedFrameDecoder`，再写一个只处理完整帧的协议 Decoder。不要在每个项目里重复发明长度字段解析器。

## 5\. 粘包不是问题，错误的解码策略才是问题

很多文章把“TCP 粘包”说得像网络故障。实际上粘包只是字节流合并。只要协议有清晰边界，粘包和半包都能被 Decoder 正常处理。

协议边界常见方案：

方案

适合场景

风险

固定长度

简单二进制、心跳

浪费空间，不灵活

分隔符

文本协议、行协议

转义与超长行

长度字段

大多数二进制 RPC

长度伪造、字节序

状态机

TLS/HTTP2 等复杂协议

实现复杂

Netty 的 `LineBasedFrameDecoder`、`DelimiterBasedFrameDecoder`、`FixedLengthFrameDecoder`、`LengthFieldBasedFrameDecoder` 已覆盖常见场景。业务应优先复用。

## 6\. out 列表让一次 decode 产出多个消息

一次 cumulation 中可能包含多个完整帧。`decode()` 可以向 out 添加多个对象，也可以每次添加一个，让 `callDecode` 循环继续。

为什么不直接 `ctx.fireChannelRead`？因为框架需要统一处理：

*   • 消息产出后的传播时机。
    
*   • Handler 被移除时的保护。
    
*   • 单次 decode 模式。
    
*   • out 中对象的异常清理。
    

自定义 Decoder 只需关注“从 in 消费字节，向 out 添加消息”。这是一种非常干净的职责分离。

## 7\. singleDecode 控制一次只解一个消息

`setSingleDecode(true)` 可让 `callDecode` 在产出一个消息后停止。本质上是牺牲吞吐，换取更细粒度的事件调度。

适用场景包括：

*   • 协议握手阶段，每个消息可能改变 Pipeline。
    
*   • 需要避免单个高流量连接长期霸占 EventLoop。
    
*   • 下游处理成本高，希望和其他连接更公平交替。
    

一般业务不必开启。默认循环解码更能利用一次读取的数据，提高吞吐。

## 8\. decodeLast 处理连接关闭前的剩余字节

连接 inactive 时，Decoder 会尝试处理剩余 cumulation。`decodeLast` 的默认行为会再次调用 decode。某些协议允许连接关闭作为消息结束标志，例如没有长度字段的流式文本；某些协议则要求剩余字节必须构成完整帧，否则应报错。

自定义 Decoder 如果协议有特殊关闭语义，应重写 `decodeLast`。例如最后一段数据没有分隔符是否接受，必须由协议定义。

## 9\. ByteToMessageDecoder 与 ByteBuf 所有权

`ByteToMessageDecoder` 接管入站 ByteBuf 后，会管理 cumulation 的 release。用户 decode 中通常不要 release `in`。如果从 in 中切出对象给 out，要确保 out 对象具有独立生命周期。

错误示例：

`ByteBuf frame = in.readSlice(len);   out.add(frame); // 下游异步处理时可能访问已释放内存`

更安全：

`out.add(in.readRetainedSlice(len));`

如果解码成 POJO，并把字节复制到普通对象，通常无需 retain：

`byte[] bytes = new byte[len];   in.readBytes(bytes);   out.add(new Request(bytes));`

复制多一些，但生命周期简单。高性能与简单性之间要按场景选择。


这张时序图说明“粘包半包”不是异常，而是 TCP 字节流的正常表现。第一次只收到半个消息时，Decoder 保存累积缓冲；第二次收到剩余字节和后续完整消息时，循环产出多个完整帧。业务 Handler 应该只处理协议消息，不应该依赖某次 Socket read 的边界。

## 10\. 解码器常见线上问题

第一，长度字段解析错误。字节序、偏移量、是否包含头长度配置错，会导致 Decoder 一直等待或读出超大长度。必须对最大帧长度设置合理上限。

第二，decode 不推进 readerIndex。没有数据产出时可以不推进；一旦 out 添加消息，就必须消费输入，否则 Netty 抛 DecoderException。

第三，cumulation 持续增长。可能是协议边界永远不完整，也可能是客户端发送恶意长度。需要监控单连接累积 Buffer 和最大帧。

第四，Decoder 共享实例。状态串线导致偶发协议错误。除非 Decoder 明确无状态并标记可共享，否则每条 Channel 一个实例。

第五，异常分支未清理业务对象。虽然 cumulation 由基类管理，但自定义中间 Buffer 或聚合对象仍需释放。

## 11\. Frame Decoder 与 Protocol Decoder 应该分层

推荐两层：

`LengthFieldBasedFrameDecoder     -> RequestDecoder     -> BusinessHandler`

第一层只解决字节边界，产出完整帧 ByteBuf。第二层只解决协议字段，产出 Request 对象。这样做有几个好处：

*   • 半包粘包逻辑复用成熟实现。
    
*   • 协议解析代码更简单。
    
*   • 帧长度攻击在第一层拦截。
    
*   • 单元测试更容易。
    
*   • 后续换协议版本时边界层不动。
    

把所有逻辑写进一个 Decoder 短期省文件，长期会让异常、释放和边界判断交织在一起。

## 12\. 总结：Decoder 是字节世界和消息世界的闸门

主链可以记成：

`channelRead(ByteBuf)     -> cumulator.cumulate     -> callDecode     -> decode consumes bytes     -> out.add(message)     -> fireChannelRead(message)     -> 保留未读半包`

只要协议边界定义清晰，TCP 半包和粘包就不是问题。真正的问题是 decode 是否正确推进索引、是否限制长度、是否处理引用计数、是否避免共享状态。

下一篇进入写侧背压：读路径解决“如何拿到完整消息”，写路径还必须解决“对端慢时如何不把自己写爆”。`ChannelOutboundBuffer` 的水位线和 `channelWritabilityChanged` 是 Netty 生产稳定性的核心机制。

## 参考资料

1.  1. `ByteToMessageDecoder.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec/src/main/java/io/netty/handler/codec/ByteToMessageDecoder.java
    
2.  2. `LengthFieldBasedFrameDecoder.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec/src/main/java/io/netty/handler/codec/LengthFieldBasedFrameDecoder.java
    
3.  3. `LineBasedFrameDecoder.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec/src/main/java/io/netty/handler/codec/LineBasedFrameDecoder.java
    
4.  4\. Netty User Guide：https://netty.io/wiki/user-guide-for-4.x.html

---

## 19. ByteBuf 源码：池化内存、读写索引与引用计数（源码系列第8篇） 19. ByteBuf 源码：池化内存、读写索引与引用计数（源码系列第8篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489503&idx=1&sn=20f0ff022fd0f8ea67f77b9adb6b825d&chksm=eb6750a9dc10d9bf674c10b9f2dd47a9954dbd1bf711d3c7cf95b9a383abf4b8429dc8953eab

> `ByteBuf` 是 Netty 性能设计的核心：读写索引减少模式切换，池化分配器减少内存申请，直接内存贴近网络 I/O，引用计数负责生命周期。但这四个能力叠加后，ByteBuf 不再是普通 byte 数组；它被当成有所有权、有生命周期、可共享视图的资源对象来管理。

很多 Netty 内存问题不是“不会用 ByteBuf”，而是“把 ByteBuf 当成普通对象”。普通对象交给 GC，方法返回后忘记也没关系；ByteBuf 尤其是池化直接内存，必须在引用计数归零后归还池。忘记 release 会泄漏，提前 release 会非法访问，跨线程异步使用不 retain 会偶发崩。

Netty 设计 ByteBuf 是为了替代 JDK ByteBuffer 的几个痛点：

*   • `position/limit` 模式切换复杂。
    
*   • 堆内存和直接内存使用不统一。
    
*   • 切片和组合不够贴合网络协议。
    
*   • 高频分配释放成本高。
    
*   • 网络框架需要显式管理非堆内存。
    

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`ByteBuf.java`、`AbstractByteBuf.java`、`PooledByteBufAllocator.java`
    
*   • 链接：https://github.com/netty/netty/tree/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer
    


这张架构图可以从线程缓存开始读：小块内存优先命中 `PoolThreadCache`，未命中才进入 Arena、Chunk、Page/Subpage 的层级分配。它解释了为什么 Netty 释放 ByteBuf 后进程内存不一定立刻下降——很多内存被留在池里等待复用。判断泄漏时不能只看 RSS，要结合活动分配、写缓冲积压和引用计数。

## 1\. ByteBuf 用两个索引消除 flip 思维

JDK `ByteBuffer` 读写共用 position，需要写完 `flip()` 再读，读完 `compact()` 或 `clear()`。对网络协议来说，这非常容易错。

ByteBuf 采用：

`0 <= readerIndex <= writerIndex <= capacity`

区域含义：

`0 -------- readerIndex -------- writerIndex -------- capacity   | 已读可丢弃 |      可读字节      |      可写空间      |`

写入推进 `writerIndex`，读取推进 `readerIndex`。因此可以一边接收字节，一边解析帧，不需要整体切换模式。

典型读取：

`if (buf.readableBytes() < 4) {    return;   }   int len = buf.getInt(buf.readerIndex());   if (buf.readableBytes() < 4 + len) {    return;   }   buf.skipBytes(4);   ByteBuf frame = buf.readRetainedSlice(len);`

注意 `getInt` 不推进 readerIndex，适合窥探长度；`readInt` 会推进索引。Decoder 中先用 get 方法判断完整性，再用 read 方法消费，是避免半包误推进的关键。

## 2\. 容量扩展不是无限制复制

`AbstractByteBuf.ensureWritable()` 会在写入前确保有足够空间。如果容量不够，计算新容量并调用具体实现扩容。不同 ByteBuf 类型扩容成本不同：

*   • Unpooled heap：可能新建 byte\[\] 并复制。
    
*   • Unpooled direct：可能重新申请直接内存并复制。
    
*   • Pooled ByteBuf：可能从池中重新分配或调整。
    
*   • CompositeByteBuf：可能通过组件组合减少复制。
    

协议设计应尽量避免频繁小步扩容。能预估长度时预分配；大对象传输尽量分块或使用 FileRegion；Decoder 中不要把无上限数据一直累积在一个 Buffer。

## 3\. Direct Memory 的收益和风险

网络 I/O 最终需要和内核交互。直接内存可以减少某些堆内到直接内存的中间复制，尤其适合 SocketChannel 读写。Netty 服务端通常默认偏向使用 direct buffer。

风险在于直接内存不由普通 Java 堆 GC 直接约束。对象引用被 GC 后 Cleaner 可能释放直接内存，但池化和高性能框架不能依赖不确定的 GC 时机。因此 Netty 用引用计数显式管理。

如果线上看到堆内存正常、进程 RSS 或 direct memory 持续增长，排查方向应包括：

*   • ByteBuf 泄漏。
    
*   • Pooled allocator 缓存增长。
    
*   • 大连接写缓冲积压。
    
*   • CompositeByteBuf 组件未释放。
    
*   • 异常分支吞掉消息。
    

不要只通过调大 `MaxDirectMemorySize` 掩盖问题。

## 4\. 池化分配器按 Arena 与线程缓存降低竞争

`PooledByteBufAllocator` 不是一个全局大锁池。它把内存分配拆成多个层次：

`PooledByteBufAllocator     -> HeapArena / DirectArena       -> PoolChunkList         -> PoolChunk           -> Page / Subpage     -> PoolThreadCache`

线程优先从自己的 `PoolThreadCache` 获取小块内存，未命中再进入 Arena。Arena 负责从 Chunk 中切分 Page 或 Subpage。这样既减少系统调用，也降低多线程争用。

为什么要区分 tiny/small/normal/huge 等尺寸类别？因为网络消息大小分布通常不均匀。大量小 Buffer 适合缓存和 Subpage，大块 Buffer 需要从 Chunk 切分，超大对象可能不适合进入普通池结构。

池化不是免费午餐。它会让已释放内存留在池里复用，监控上看起来进程内存不一定马上下降。因此判断泄漏不能只看“释放后 RSS 是否立即降低”，要结合 Netty allocator 指标、active allocations 和 leak detector。

## 5\. 引用计数是所有权协议

ByteBuf 实现 `ReferenceCounted`：

`int refCnt();   ByteBuf retain();   boolean release();`

基本规则：

`allocate -> refCnt = 1   retain   -> refCnt + 1   release  -> refCnt - 1   refCnt=0 -> 内存释放或归还池`

谁拿到所有权，谁负责释放。Pipeline 中常见所有权转移：

*   • 入站 read 成功后，Unsafe 把 ByteBuf 交给 Pipeline。
    
*   • Handler 继续传播，就不释放。
    
*   • Handler 消费终止，就释放。
    
*   • Decoder 产出新消息，要处理旧 Buffer 与新消息的引用关系。
    
*   • 出站 write 后，Netty 在发送完成或失败时释放。
    

引用计数最容易在异步场景出错：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    ByteBuf buf = (ByteBuf) msg;       executor.submit(() -> parse(buf)); // 错：可能已被释放       ctx.fireChannelRead(msg);   }`

如果异步任务需要使用：

`ByteBuf retained = buf.retainedDuplicate();   executor.submit(() -> {    try {           parse(retained);       } finally {           retained.release();       }   });   ctx.fireChannelRead(buf);`

## 6\. slice、duplicate 与 copy 的差别决定安全性

常见方法：

方法

是否复制内存

是否共享内容

引用计数关系

`slice()`

否

是

通常共享

`duplicate()`

否

是

通常共享

`retainedSlice()`

否

是

retain 后返回

`retainedDuplicate()`

否

是

retain 后返回

`copy()`

是

否

新 Buffer

`slice()` 很快，因为不复制，只创建视图。但它共享底层内存和生命周期。若原 Buffer release 到 0，slice 也不可访问。需要把切片交给下游或异步保存时，优先用 `readRetainedSlice()` 或 `retainedSlice()`。

协议解码中，`readSlice(len)` 和 `readRetainedSlice(len)` 差别非常重要。前者适合在当前调用栈内立即消费，后者适合把帧作为独立消息传给后续 Handler。

## 7\. CompositeByteBuf 支持逻辑连续，避免物理复制

TCP 半包和粘包处理中，多个 ByteBuf 可以组合成一个逻辑连续 Buffer。`CompositeByteBuf` 维护组件列表，让读取跨组件进行，而不一定把所有字节复制到新数组。

这对大消息和聚合协议有价值，但组件数量过多也会增加索引查找和释放复杂度。Netty 的 `ByteToMessageDecoder` 提供 `MERGE_CUMULATOR` 和 `COMPOSITE_CUMULATOR`，前者合并复制，后者组合减少复制。选择哪一个要看消息大小、碎片程度和 CPU/内存权衡。

小消息高频场景，合并复制可能更简单快速；大消息或零拷贝敏感场景，组合更有价值。

## 8\. ResourceLeakDetector 是兜底，不是常态依赖

Netty 的 ResourceLeakDetector 会采样跟踪 ByteBuf 的访问路径。当对象被 GC 发现未 release 时，打印泄漏报告。级别包括 disabled、simple、advanced、paranoid 等。

高级别能提供更多访问记录，但开销也更大。生产环境常用 simple 或按需临时提高。压测和开发环境可以打开 advanced 定位具体分支。

泄漏报告要重点看最近的 acquire/touch 记录，而不是只看最终 GC。可以在关键转交点调用：

`buf.touch("after decode requestId=...");`

为泄漏报告添加业务线索。

## 9\. ByteBuf 与 Pipeline 的所有权边界

结合前几篇，入站所有权变化是：

`Allocator 分配     -> Channel read 填充     -> pipeline.fireChannelRead     -> Decoder 消费/产出     -> Business 消费或继续传播     -> 最终 release`

出站所有权变化是：

`Business 创建响应     -> Encoder 创建 ByteBuf     -> unsafe.write 入队     -> doWrite 写出     -> ChannelOutboundBuffer.remove     -> release + promise success`

所以业务不应在 `writeAndFlush(buf)` 之后立即 release；也不应把入站 ByteBuf 保存到成员变量后忘记 retain；更不应在多个 Channel 之间复用同一个 ByteBuf 实例。


这张生命周期图是写 Netty Handler 时最需要反复对照的检查表。`retain` 表示多一个所有者，`release` 表示当前所有者交还资源，`refCnt=0` 后再访问就是非法。`slice/duplicate` 只是视图共享，不会天然复制内存；如果要把切片传给下游或异步线程，必须使用 `retainedSlice`、`retainedDuplicate` 或显式 retain。

## 10\. 常见内存故障与判断

第一，直接内存泄漏。表现为运行时间越长 direct memory 越高，Full GC 无明显改善，ResourceLeakDetector 可能报警。重点检查异常分支和自定义 Decoder。

第二，提前释放。表现为 `IllegalReferenceCountException: refCnt: 0`。重点检查 `SimpleChannelInboundHandler` 自动释放后仍异步使用，或者 write 后手动 release。

第三，池缓存导致“看似不释放”。释放逻辑正确，但 allocator 缓存保留内存以备复用。结合活动分配数和吞吐变化判断，不要误判为泄漏。

第四，写缓冲积压。ByteBuf 没泄漏，只是大量消息还在 ChannelOutboundBuffer 等待慢客户端。此时 refCnt 正常，pending outbound bytes 高，writability 变 false。

第五，Composite 组件泄漏。聚合时只释放外层或只释放内层都可能出错，应遵循 CompositeByteBuf 对组件所有权的 API 约定。

## 11\. 编写 ByteBuf 代码的原则

1.  1\. 谁最后消费，谁 release。
    
2.  2\. 要传给异步线程，先 retain 或 retainedDuplicate。
    
3.  3\. 要切片长期持有，使用 retainedSlice。
    
4.  4\. Decoder 判断完整性时用 get，不要提前推进 readerIndex。
    
5.  5\. 出站交给 Netty 后不要手动释放。
    
6.  6\. 异常分支和 early return 必须清理。
    
7.  7\. 优先使用 Netty 提供的解码基类，少手写累积 Buffer。
    
8.  8\. 压测时打开 leak detector 验证。
    

一个安全模板：

`ByteBuf out = ctx.alloc().buffer();   try {       encode(msg, out);       ctx.write(out);       out = null; // 所有权转移给 Netty   } finally {    if (out != null) {           out.release();       }   }`

## 12\. 总结：ByteBuf 的强大来自显式生命周期

ByteBuf 的性能优势来自读写索引、池化、直接内存和零拷贝视图；它的复杂性也来自这些设计。普通 Java 对象只需要关心引用可达性，ByteBuf 还要关心所有权份数。

主线记成：

`分配 -> 写入 -> 传播 -> 切片/组合 -> retain/release -> 归还池`

下一篇进入 `ByteToMessageDecoder`。它是 ByteBuf 与业务消息之间的关键桥梁：如何保存半包、如何循环解码、如何避免 decode 不前进导致死循环，以及 cumulation 策略如何影响复制和内存占用。

## 参考资料

1.  1. `ByteBuf.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer/ByteBuf.java
    
2.  2. `AbstractByteBuf.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer/AbstractByteBuf.java
    
3.  3. `PooledByteBufAllocator.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer/PooledByteBufAllocator.java
    
4.  4\. Netty Reference counted objects：https://netty.io/wiki/reference-counted-objects.html

---

## 18. ChannelPipeline 源码：为什么入站和出站事件方向相反（源码系列第7篇） 18. ChannelPipeline 源码：为什么入站和出站事件方向相反（源码系列第7篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489490&idx=1&sn=fd9ade9a8ec435a11052fdadbff70680&chksm=eb6750a4dc10d9b2640d08713cf90d0aa0924c1da28241883d98d4d376a4eb570557d315c927

> `ChannelPipeline` 不是普通过滤器列表，而是一条由 `ChannelHandlerContext` 串起来的双向事件链。入站事件从 Head 走向 Tail，出站事件从 Tail 或当前 Context 走向 Head；`ctx.fire...` 与 `pipeline.fire...` 的起点差异，是很多“Handler 没执行、消息重复编码、ByteBuf 泄漏”的根源。

Netty 最吸引人的扩展点是 Handler。解码、鉴权、限流、业务处理、编码、日志和异常处理都可以通过 Handler 插拔。很多人也因此把 Pipeline 类比成 Servlet Filter 或 Spring Interceptor。

这个类比只能帮助入门，不能指导源码分析。Netty Pipeline 有三个更关键的特征：

1.  1\. 它是一条双向链表，不是单向数组。
    
2.  2\. Handler 本身不直接相连，连接它们的是 `ChannelHandlerContext`。
    
3.  3\. 入站和出站事件方向不同，传播起点也可能不同。
    

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`DefaultChannelPipeline.java`、`AbstractChannelHandlerContext.java`
    
*   • 链接：https://github.com/netty/netty/tree/netty-4.1.135.Final/transport/src/main/java/io/netty/channel
    


这张结构图要重点看 Context，而不是只看 Handler。Pipeline 的真实节点是 `ChannelHandlerContext`，它保存前后指针、Handler、Executor 和事件能力；入站从 Head 向 Tail，出站从 Tail 或当前 Context 向 Head。设计 Handler 顺序时，必须同时考虑方向和发起点，否则很容易让 Encoder 被绕过，或者让某个入站 Handler 永远收不到消息。

## 1\. Pipeline 的真实节点是 Context

`DefaultChannelPipeline` 构造时创建两个哨兵节点：

`protected DefaultChannelPipeline(Channel channel) {    this.channel = ObjectUtil.checkNotNull(channel, "channel");       succeededFuture = new SucceededChannelFuture(channel, null);       voidPromise = new VoidChannelPromise(channel, true);          tail = new TailContext(this);       head = new HeadContext(this);          head.next = tail;       tail.prev = head;   }`

用户调用：

`pipeline.addLast("decoder", new MyDecoder());   pipeline.addLast("biz", new BusinessHandler());`

Netty 不是直接把 Handler 放入数组，而是创建 `DefaultChannelHandlerContext`：

`HeadContext <-> decoderContext <-> bizContext <-> TailContext`

Context 保存：

*   • 所属 Pipeline。
    
*   • 所属 Channel。
    
*   • 前后 Context。
    
*   • Handler 实例。
    
*   • Handler 能处理的事件掩码。
    
*   • 绑定的 EventExecutor。
    
*   • Handler 添加/删除状态。
    

为什么要多这一层？因为同一个 Handler 实例可能被加到不同 Pipeline，或者同一个 Pipeline 的事件需要从“当前节点”继续传播。Handler 是逻辑，Context 才是运行时位置。

## 2\. HeadContext 与 TailContext 是系统边界

HeadContext 在链表头部，连接底层 Channel Unsafe。它处理出站事件时最终执行 bind、connect、write、flush、read、close 等底层操作；处理入站事件时把底层触发的事件向后传播。

TailContext 在链表尾部，主要处理没人消费的入站事件和异常。例如未处理异常到达 Tail，Netty 会记录日志；引用计数消息到 Tail，Tail 可能释放它，避免泄漏。

因此用户 Handler 永远位于 Head 和 Tail 之间：

`Head -> Inbound1 -> Inbound2 -> Outbound1 -> Tail`

这也解释了为什么出站最终必须到 Head。只有 Head 知道如何把 Pipeline 事件交给 Channel Unsafe，进而操作底层 Socket。

## 3\. 入站事件从 Head 向 Tail

Socket 读到数据后，底层调用：

`pipeline.fireChannelRead(byteBuf);`

`DefaultChannelPipeline.fireChannelRead()` 从 Head 开始：

`public final ChannelPipeline fireChannelRead(Object msg) {       AbstractChannelHandlerContext.invokeChannelRead(head, msg);    return this;   }`

后续每个入站 Handler 如果希望继续传播，需要调用：

`ctx.fireChannelRead(msg);`

`ctx.fireChannelRead` 会从当前 Context 的下一个入站节点继续查找，而不是回到 Head。这个设计避免事件重复经过已经处理过的 Handler。

入站事件包括：

*   • `channelRegistered`
    
*   • `channelActive`
    
*   • `channelRead`
    
*   • `channelReadComplete`
    
*   • `userEventTriggered`
    
*   • `channelWritabilityChanged`
    
*   • `exceptionCaught`
    

虽然 `exceptionCaught` 可以由入站或出站异常触发，但它的传播方向也是入站方向。

## 4\. 出站事件从 Tail 或当前 Context 向 Head

出站事件代表“用户希望对连接执行某个动作”，例如 write、flush、close、bind、connect、read。它最终要抵达 Head，由 Head 调用 Unsafe。

`pipeline.writeAndFlush(msg)` 的起点是 Tail：

`public final ChannelFuture writeAndFlush(Object msg, ChannelPromise promise) {    return tail.writeAndFlush(msg, promise);   }`

而 `ctx.writeAndFlush(msg)` 的起点是当前 Context 的前一个出站节点。二者可能经过不同 Handler。

这就是 Pipeline 排列最容易踩坑的地方。假设：

`Head -> Decoder -> Business -> Encoder -> Tail`

Business 中调用 `ctx.write(response)`，传播会向 Head 查找，位于 Business 之后的 Encoder 不会执行。正确排列通常是：

`Head -> Encoder -> Decoder -> Business -> Tail`

或者业务中使用 `ctx.channel().write(...)` 从 Tail 发起。但更推荐通过清晰的 Handler 排列保持语义一致，不要靠调用方式弥补结构混乱。

## 5\. Handler 类型决定它是否参与某类事件

常见基类：

         

                                                

类型

参与方向

典型用途

`ChannelInboundHandlerAdapter`

入站

解码后处理、鉴权、业务

`ChannelOutboundHandlerAdapter`

出站

编码、写前统计、连接操作拦截

`ChannelDuplexHandler`

双向

既处理读也处理写，如超时/流控

`SimpleChannelInboundHandler<T>`

入站

自动释放匹配消息

         

       

`AbstractChannelHandlerContext` 会根据 Handler 类型和事件掩码跳过不相关节点。这就是为什么 Pipeline 里可以混放入站和出站 Handler，而事件传播时只调用适合的节点。

这种跳过机制也意味着“Handler 在 Pipeline 中”不代表“某个事件一定会经过它”。方向、起点、类型三者都要匹配。

## 6\. ctx.executor 允许 Handler 独立执行器

`pipeline.addLast(executorGroup, handler)` 可以让某个 Handler 的回调不在 Channel EventLoop 上执行。Context 会保存指定 Executor；事件传播到该节点时，如果当前线程不是该 Executor，就把调用封装成任务提交。

这对阻塞业务有价值，但也有代价：

*   • 事件在 EventLoop 与业务 Executor 间切换。
    
*   • ByteBuf 跨线程需要更严格的 retain/release。
    
*   • 业务 Executor 队列可能积压，导致顺序和延迟问题。
    
*   • 出站写最终仍要回到 EventLoop。
    

因此不要把它理解成“无脑异步加速”。它更像一个边界：把耗时业务从 I/O 线程挪出去，同时必须重新设计容量、背压和对象所有权。

## 7\. ChannelInitializer 是一种自删除 Handler

`childHandler(new ChannelInitializer<SocketChannel>() {...})` 本质上也是 Handler。它被加入子 Channel Pipeline，注册期间执行 `initChannel()`，添加真正业务 Handler，随后移除自身。

它解决了“每条连接都需要独立初始化 Pipeline”的问题。由于每条 Channel 都有自己的 Pipeline，Initializer 可以根据连接属性、协议版本甚至远端地址安装不同 Handler。

需要注意：Initializer 的 `initChannel()` 如果抛异常，子 Channel 注册可能失败或被关闭。生产代码中复杂初始化应尽量显式记录异常，避免连接刚建立就静默断开。

## 8\. 事件传播中断是常见 Bug

入站 Handler 如果消费消息但不继续传播，后续 Handler 不会收到。这可能是故意的，比如鉴权失败直接关闭；也可能是遗漏：

`@Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {       log.debug("received {}", msg);    // 忘记 ctx.fireChannelRead(msg)   }`

如果 msg 是 ByteBuf，这段代码还会泄漏，因为既没有释放，也没有传播。

正确做法要么传播：

`ctx.fireChannelRead(msg);`

要么消费并释放：

`try {       consume(msg);   } finally {       ReferenceCountUtil.release(msg);   }`

中间转换时，要释放旧消息并传播新消息，或者把所有权明确交给下游。

## 9\. 异常传播也需要处理所有权

Handler 抛异常后，Netty 会触发 `fireExceptionCaught`。但异常处理不自动释放当前业务保存的资源。尤其在 Decoder 或自定义 Handler 中，如果已经创建了中间 ByteBuf、List 或半成品消息，异常分支要负责清理。

异常到 Tail 只会记录，通常不会自动关闭连接。很多业务应该在 `exceptionCaught` 中根据异常类型决定：

*   • 协议错误：返回错误并关闭。
    
*   • 临时业务错误：记录并继续。
    
*   • 解码错误：释放累积状态，关闭连接。
    
*   • 远端关闭：正常清理，无需错误告警。
    

不要简单 `cause.printStackTrace(); ctx.close();` 处理所有异常。它会把正常断连、客户端取消和真正协议攻击混在一起，既污染日志，也影响体验。


这张时序图适合用来判断事件是否被某个 Handler 截断。入站 ByteBuf 经过 Decoder、鉴权和业务处理时，只要某一层不调用 `fireChannelRead`，后续节点就不会执行；业务调用 `ctx.write` 时，出站事件从当前节点向前寻找 Encoder 和 Head。异常也是事件，未处理到 Tail 只会被记录，不会自动替业务释放所有中间资源。

## 10\. 动态修改 Pipeline 要尊重线程边界

Netty 支持运行时增删 Handler，例如 TLS 握手完成后移除 `SslHandler` 前的协议探测器，HTTP 升级到 WebSocket 后替换编解码器。

如果当前不在 Channel EventLoop，修改操作会被调度到正确线程执行，或者在 Context 内部确保生命周期回调顺序。相关回调包括：

*   • `handlerAdded`
    
*   • `handlerRemoved`
    
*   • `channelRegistered`
    
*   • `channelActive`
    

动态修改的风险是事件正在传播时链表发生变化。Netty 通过 Context 状态和链表操作保证基本安全，但业务仍要避免在回调中做复杂阻塞逻辑。

## 11\. Pipeline 设计的工程价值

Pipeline 最大的价值不是“能插很多 Handler”，而是把协议处理拆成可组合层：

`TLS     -> Frame Decoder     -> Protocol Decoder     -> Auth     -> Rate Limit     -> Business     -> Protocol Encoder     -> Metrics`

每层只处理一种职责，故障也更容易定位。线上如果业务收不到消息，可以按 Handler 顺序加日志；如果发送失败，可以按出站方向检查 Encoder 和 Head 前的状态。

同时 Pipeline 让 Netty 支持多协议复用。例如 HTTP、WebSocket、MQTT 和自定义二进制协议都可以建立在相同 Channel/EventLoop/ByteBuf 之上，只需替换 Handler 组合。

## 12\. 排查 Handler 不生效的检查清单

1.  1\. Handler 是否加入了正确的 Pipeline，是父 Channel 还是子 Channel。
    
2.  2\. Handler 类型是否匹配事件方向。
    
3.  3\. 入站/出站排列是否与 `ctx.write` 起点匹配。
    
4.  4\. 上游 Handler 是否忘记传播。
    
5.  5\. 消息类型是否被泛型匹配过滤。
    
6.  6\. Handler 是否被 ChannelInitializer 移除或动态替换。
    
7.  7\. 指定 Executor 是否积压，导致回调延迟。
    
8.  8\. 异常是否被前置 Handler 吞掉。
    

其中第 1 条最常见：把业务 Handler 放到 `ServerBootstrap.handler()`，结果它只在父 Channel 上工作，从不处理子连接数据。

## 13\. 总结：Context 是理解 Pipeline 的钥匙

Pipeline 的主链可以概括为：

`Channel     -> DefaultChannelPipeline     -> HeadContext <-> user Contexts <-> TailContext     -> Inbound: Head 到 Tail     -> Outbound: Tail/Current 到 Head     -> Head 调用 Unsafe`

真正的节点是 Context，方向决定传播，起点决定覆盖范围。理解这三点，才能正确设计 Handler 顺序、选择 `ctx.write` 还是 `channel.write`，并在消息消费、传播和释放之间做出安全选择。

下一篇进入 Netty 性能的中心：`ByteBuf`。Pipeline 传播的消息很多时候是引用计数对象，只有理解池化内存、读写索引、slice/duplicate 和 release，才能避免最隐蔽的直接内存泄漏。

## 参考资料

1.  1. `DefaultChannelPipeline.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPipeline.java
    
2.  2. `AbstractChannelHandlerContext.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/AbstractChannelHandlerContext.java
    
3.  3. `ChannelHandlerContext.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelHandlerContext.java
    
4.  4. `ChannelInitializer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelInitializer.java

---

## 17. Netty 写出源码：writeAndFlush 为什么不等于立即发包（源码系列第6篇） 17. Netty 写出源码：writeAndFlush 为什么不等于立即发包（源码系列第6篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489485&idx=1&sn=29d8a6c217645ac7ff3c4709eb451a4c&chksm=eb6750bbdc10d9ad2bbe45f413ffb77b69cf24147eca93a8ca3029ab19922bdbab1bb380ba67

> `writeAndFlush()` 是两个阶段的组合：`write` 负责沿出站 Pipeline 编码并把消息加入 `ChannelOutboundBuffer`，`flush` 才把未冲刷条目标记为可发送并触发底层写。即使 flush 已执行，数据也可能因为跨线程排队、Socket 缓冲区满或写自旋耗尽而继续留在用户态。

业务代码常把发送响应写成：

`ctx.writeAndFlush(response);`

方法名很像“写并立即刷新”，于是容易产生三个错误判断：

*   • 返回后数据已经发到客户端。
    
*   • 每调用一次就发生一次系统调用。
    
*   • 写失败会直接抛异常。
    

实际上返回的是 `ChannelFuture`，表示异步发送结果；多个 write 可以被一次 flush 批量发送；系统调用写不完时消息继续留在 `ChannelOutboundBuffer`，等 `OP_WRITE` 再次就绪；编码或传输失败则通过 Promise 通知。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`AbstractChannelHandlerContext.java`、`AbstractChannel.java`、`ChannelOutboundBuffer.java`、`NioSocketChannel.java`
    
*   • 官方仓库：https://github.com/netty/netty
    


这张流程图的重点是把 `write` 和 `flush` 分开看：`write` 沿出站 Pipeline 编码并进入 `ChannelOutboundBuffer`，`flush` 才把未冲刷条目标记为可发送并推动 `doWrite`。所以 `writeAndFlush()` 返回不代表客户端已经收到数据，它只代表一次异步发送流程已经被发起，最终结果要看对应的 `ChannelFuture`。

## 1\. write 和 flush 是两个独立语义

Netty 提供：

`ctx.write(msg);   ctx.flush();`

也提供组合：

`ctx.writeAndFlush(msg);`

分开设计是为了 batching。假设一个请求要返回 Header、Body 和结束标记，可以先连续 write，最后一次 flush：

`ctx.write(header);   ctx.write(body);   ctx.writeAndFlush(last);`

这样出站 Handler 仍逐条处理消息，但底层可以在 flush 时统一收集多个 ByteBuf，使用 gathering write 或更少的系统调用发送。

如果每个小消息都 writeAndFlush，会增加 syscall、TCP 小包和事件循环开销。低延迟场景需要及时 flush，吞吐场景则应尽量批量，二者是明确取舍。

## 2\. 从 Channel 与 ctx 发起，传播起点不同

`channel.writeAndFlush(msg)` 会委托给 Pipeline，并通常从 Tail 向 Head 传播。`ctx.writeAndFlush(msg)` 从当前 Context 向前寻找出站 Handler。

这一区别会影响哪些 Handler 被执行。假设 Pipeline：

`Head -> Decoder -> Business -> Encoder -> Metrics -> Tail`

如果 Business 中调用 `ctx.write()`，传播从 Business 前一个节点方向向 Head 查找，具体是否经过 Encoder 取决于 Encoder 在链中的相对位置。通常出站 Encoder 应位于业务 Handler 之前，才能在业务调用 ctx.write 时被找到。

如果调用 `ctx.pipeline().write()` 或 `channel.write()`，则从 Tail 开始，会经过所有适用的出站节点。两种写法都合法，但要清楚传播范围，避免重复编码或绕过监控 Handler。

## 3\. AbstractChannelHandlerContext 处理线程切换

`AbstractChannelHandlerContext.write()` 会先找到下一个出站 Context，再判断其 Executor：

`private void write(Object msg, boolean flush, ChannelPromise promise) {    AbstractChannelHandlerContext next = findContextOutbound(           flush ? MASK_WRITE | MASK_FLUSH : MASK_WRITE);    Object m = pipeline.touch(msg, next);    EventExecutor executor = next.executor();    if (executor.inEventLoop()) {        if (flush) {               next.invokeWriteAndFlush(m, promise);           } else {               next.invokeWrite(m, promise);           }       } else {        AbstractWriteTask task = AbstractWriteTask.newInstance(               next, m, promise, flush);        if (!safeExecute(executor, task, promise, m, !flush)) {               task.cancel();           }       }   }`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/AbstractChannelHandlerContext.java`
    
*   • 方法：`write(...)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/AbstractChannelHandlerContext.java
    

如果业务线程不是目标 EventLoop，消息不会直接写 Socket，而是包装成 WriteTask 入队。此时 `writeAndFlush()` 很快返回，但真实写出要等 EventLoop 执行任务。

这解释了一个常见延迟来源：业务处理已经结束，写 Future 却迟迟未完成，原因可能是 EventLoop 任务队列积压，而不是网络本身慢。

## 4\. 出站 Handler 先把对象变成传输可接受的类型

业务响应通常是 POJO，底层 Channel 只能处理 ByteBuf、FileRegion 或特定传输消息。出站 Encoder 在到达 HeadContext 前完成转换：

`Response POJO     -> MessageToMessageEncoder     -> protocol frame     -> MessageToByteEncoder     -> ByteBuf     -> HeadContext`

如果 Pipeline 缺少 Encoder，或者 Encoder 没有匹配消息类型，最终 `filterOutboundMessage()` 可能抛 `UnsupportedOperationException`。

编码阶段还涉及所有权转移。`MessageToByteEncoder` 创建输出 ByteBuf，编码成功后通常释放原消息；编码失败则释放临时 Buffer 并让 Promise 失败。自定义 Encoder 不应在传播后再次修改或释放已经交给下游的 ByteBuf。

## 5\. HeadContext 把 Pipeline 操作交给 Unsafe

出站事件最终到达 `DefaultChannelPipeline.HeadContext`。它既是 ChannelOutboundHandler，也是 Pipeline 与底层 Unsafe 的桥：

`public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) {       unsafe.write(msg, promise);   }      public void flush(ChannelHandlerContext ctx) {       unsafe.flush();   }`

Pipeline 本身不执行 Socket 系统调用。它负责扩展与传播；Unsafe 负责 Channel 的底层状态和传输操作。这种边界让同一套 Pipeline 能用于 NIO、Epoll、KQueue、Local 和 Embedded Channel。

## 6. `unsafe.write()` 先加入 ChannelOutboundBuffer

`AbstractChannel.AbstractUnsafe.write()` 的主逻辑：

`public final void write(Object msg, ChannelPromise promise) {       assertEventLoop();    ChannelOutboundBuffer outboundBuffer = this.outboundBuffer;    if (outboundBuffer == null) {        try {               ReferenceCountUtil.release(msg);           } finally {               safeSetFailure(promise, newClosedChannelException(...));           }        return;       }    int size;    try {           msg = filterOutboundMessage(msg);           size = pipeline.estimatorHandle().size(msg);        if (size < 0) {               size = 0;           }       } catch (Throwable t) {        try {               ReferenceCountUtil.release(msg);           } finally {               safeSetFailure(promise, t);           }        return;       }          outboundBuffer.addMessage(msg, size, promise);   }`

write 阶段完成类型过滤、大小估算和入队，并不调用 `doWrite()`。大小估算会计入 pending outbound bytes，用于水位线和 writability 判断。

`ChannelOutboundBuffer` 内部条目大致分成三段：

`已 flush 但未写完 | 已 write 未 flush | 空闲   flushedEntry      unflushedEntry`

这样 Netty 能区分哪些消息已经跨过 flush 边界，可以交给底层发送；哪些仍应等待后续 flush。

## 7\. flush 把未冲刷消息变成可发送条目

`unsafe.flush()` 先调用 `outboundBuffer.addFlush()`。它会从 `unflushedEntry` 开始，把对应 Promise 标记为不可取消，并增加 flushed 数量。如果某个 Promise 已取消，则释放消息并调整 pending bytes。

随后进入 `flush0()`：

`protected void flush0() {    if (inFlush0) {        return;       }    final ChannelOutboundBuffer outboundBuffer = this.outboundBuffer;    if (outboundBuffer == null || outboundBuffer.isEmpty()) {        return;       }          inFlush0 = true;    if (!isActive()) {        // 根据 open/active 状态失败已 flush 消息       } else {           doWrite(outboundBuffer);       }       inFlush0 = false;   }`

`inFlush0` 防止重入。比如写完成 Listener 又触发 flush，如果不保护，调用栈和队列状态可能混乱。

只有 Channel Active 且存在 flushed 消息，才进入传输实现的 `doWrite()`。

## 8\. NioSocketChannel.doWrite 尝试批量写

`NioSocketChannel` 继承 NIO 字节 Channel 的写逻辑。Netty会从 ChannelOutboundBuffer 收集多个 NIO ByteBuffer，尽量使用 gathering write：

`ByteBuf A \   ByteBuf B  -> SocketChannel.write(ByteBuffer[])   ByteBuf C /`

每次写多少还受 writeSpinCount、最大 gathering write 字节数和 Socket 实际可写能力约束。writeSpinCount 允许一次就绪中多尝试几次非阻塞 write，以减少频繁注册 OP\_WRITE；但过大又可能让单个 Channel 霸占 EventLoop。

成功写出 N 字节后，`ChannelOutboundBuffer.removeBytes(N)` 推进或移除条目：

*   • 完整写完某条消息：释放消息，Promise 成功。
    
*   • 只写完一部分：推进 ByteBuf readerIndex，保留条目。
    
*   • 写失败：Promise 失败并根据策略关闭或继续。
    

Future 成功表示 Netty 已按 Channel 语义完成写出，通常意味着字节交给了操作系统 Socket 层，不代表对端业务已经读取或处理。端到端确认必须由应用协议提供 ACK。

## 9\. 写不完时注册 OP\_WRITE

非阻塞 SocketChannel.write 可能返回 0，尤其是内核发送缓冲已满、对端读取慢或网络拥塞时。Netty不能在 EventLoop 中死循环等待，否则其他连接会被饿死。

正确做法是：

1.  1\. 保留未写完的 flushed 条目。
    
2.  2\. 在 SelectionKey interestOps 中加入 `OP_WRITE`。
    
3.  3\. 退出当前写循环。
    
4.  4\. 等 Selector 再次报告可写。
    
5.  5. `processSelectedKey()` 调用 `unsafe.forceFlush()`。
    

当队列清空或当前可写后，要移除 `OP_WRITE`。因为 Socket 大多数时候都可写，长期关注 OP\_WRITE 会让 Selector 高频返回，造成 CPU 空转。

`OP_WRITE` 因而不是每次写都注册，只在“确实写不下”时临时关注。


这张时序图解释了“业务线程调用发送”和“Socket 真正写出”之间的距离。非 EventLoop 线程发起写时，Netty 会封装成任务投递回 EventLoop；如果内核发送缓冲写不下，消息继续留在 `ChannelOutboundBuffer`，等待 `OP_WRITE` 再续写。线上看到写 Future 长时间不完成时，要同时检查 EventLoop 任务队列和对端读取速度。

## 10\. Promise 完成与消息释放绑定

每个出站条目都关联 Promise。成功移除条目时：

*   • 释放引用计数消息。
    
*   • 减少 pending outbound bytes。
    
*   • 设置 Promise 成功。
    
*   • 触发 Listener。
    

失败或 Channel 关闭时：

*   • 释放尚未发送的消息。
    
*   • Promise 设置失败。
    
*   • Listener 收到 cause。
    

因此调用方把消息交给 `write()` 后，一般不再自行 release。若发送同一个 ByteBuf 给多个 Channel，需要对每个发送分支使用 `retainedDuplicate()` 或显式 retain，不能把同一个引用计数实例无保护地重复交付。

判断发送结果应监听 Future：

`ctx.writeAndFlush(msg).addListener(future -> {    if (!future.isSuccess()) {           metrics.sendFailure();           log.warn("send failed", future.cause());       }   });`

忽略 Future 会让编码错误、连接关闭和写失败悄悄丢失。

## 11\. flush 策略直接影响吞吐和延迟

三种常见策略：

策略

优点

风险

每条 writeAndFlush

低等待延迟

系统调用多、小包多

批量 write 后 flush

吞吐高

批次内消息等待

readComplete 时 flush

自然按入站批次聚合

主动推送场景需额外 flush

Netty 的 `FlushConsolidationHandler` 可以合并连续 flush，减少高频冲刷。但任何合并都要理解业务延迟预算。交易确认可能更在乎单条及时性，日志推送或批量订阅更适合聚合。

## 12\. 写路径的典型线上故障

第一，客户端慢导致 ChannelOutboundBuffer 增长。观察 `bytesBeforeUnwritable()`、`isWritable()` 和 pending bytes，不能只看内核 send-q。

第二，业务线程大量跨线程 write，EventLoop taskQueue 积压。写调用耗时很短，但真正发送延迟高。需要限制生产速度或在 EventLoop 内批量写。

第三，Encoder 产生大量临时对象和复制，CPU 高于网络发送。检查 ByteBuf 分配、CompositeByteBuf、FileRegion 和零拷贝机会。

第四，错误地认为 Future 成功等于客户端处理成功。需要协议 ACK、请求 ID 和超时重试，而不是依赖写 Future。

第五，Channel 已关闭后继续写。Netty会释放消息并让 Promise 失败；如果忽略 Future，看起来就像“偶发丢消息”。

## 13\. 排查“服务端已 write，客户端没收到”

建议按层次检查：

1.  1\. 出站 Handler 是否被调用，消息类型是否匹配 Encoder。
    
2.  2\. write Future 是否成功，cause 是什么。
    
3.  3\. 消息是否进入 ChannelOutboundBuffer。
    
4.  4\. 是否已经 flush，还是停留在 unflushed 区。
    
5.  5\. Channel 是否 Active、Writable。
    
6.  6\. 是否注册 OP\_WRITE，内核发送缓冲是否拥塞。
    
7.  7\. 抓包是否看到字节离开主机。
    
8.  8\. 客户端协议 Decoder 是否因半包或长度字段等待。
    

如果 Future 未完成且 pending bytes 上升，通常是发送受阻；如果 Future 失败，按 cause 处理；如果 Future 成功且抓包有数据，问题多半在网络后段或客户端协议处理。

## 14\. 总结：write 发起所有权转移，flush 建立发送边界

完整链路是：

`ctx.writeAndFlush     -> outbound Context 查找     -> 必要时 WriteTask 入队     -> Encoder     -> HeadContext     -> unsafe.write     -> ChannelOutboundBuffer.addMessage     -> unsafe.flush / addFlush     -> doWrite     -> SocketChannel.write     -> 完成或注册 OP_WRITE     -> Promise success/failure`

理解这条链后，发送性能、消息所有权、Future 语义和慢客户端积压就有了统一解释。下一篇会专门拆解 Pipeline 与 ChannelHandlerContext，解释入站和出站为什么方向相反、`ctx.write` 与 `channel.write` 为什么可能经过不同 Handler，以及事件传播中断如何导致消息丢失和泄漏。

## 参考资料

1.  1. `AbstractChannelHandlerContext.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/AbstractChannelHandlerContext.java
    
2.  2. `AbstractChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/AbstractChannel.java
    
3.  3. `ChannelOutboundBuffer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java
    
4.  4. `NioSocketChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/socket/nio/NioSocketChannel.java

---

## 16. Netty 入站读源码：字节如何从 Socket 走到业务 Handler（源码系列第5篇） 16. Netty 入站读源码：字节如何从 Socket 走到业务 Handler（源码系列第5篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489470&idx=1&sn=12f7eb87e8084595e2831b8e853140d6&chksm=eb6750c8dc10d9de9eec192ef4166d01a5b73f7edc023ea96e053ff40e4054a2fb526d1efb61

> Netty 的读路径不是一次 `SocketChannel.read()`，而是一轮受分配器和读策略控制的批量读取：EventLoop 触发 Unsafe，Allocator 决定 Buffer，Channel 执行系统调用，Pipeline 传播多次 `channelRead`，最后以 `channelReadComplete` 收尾。理解“批量、所有权、完成边界”才能正确处理半包、内存释放和读背压。

业务 Handler 看到的入口通常很简单：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    Request request = (Request) msg;       handle(request);   }`

但在它之前，Netty 已经完成 Selector 事件分派、ByteBuf 分配、Socket 读取、读循环控制、异常判断和 Pipeline 查找。如果 Pipeline 里还有 Decoder，业务 Handler 甚至完全看不到原始 ByteBuf。

这条链中最重要的不是记住所有方法名，而是区分三个层次：

`I/O 就绪：Selector 告诉 EventLoop 某 Channel 可读   字节读取：Channel 把 Socket 数据写入 ByteBuf   事件传播：Pipeline 把 ByteBuf 或解码后的消息交给 Handler`

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 主文件：`AbstractNioByteChannel.java`
    
*   • 关键方法：`NioByteUnsafe.read()`、`doReadBytes()`、`fireChannelRead()`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioByteChannel.java
    


这张流程图要按“读就绪不等于读完整请求”来理解。`OP_READ` 只是触发一轮受 `RecvByteBufAllocator` 控制的批量读取，可能多次分配 ByteBuf、多次调用 SocketChannel.read，也可能在 Decoder 处停下来等待半包。排查读不到业务消息时，应先确认字节是否进入 ByteBuf，再看 Pipeline 是否传播，最后看 Decoder 是否产出了完整消息。

## 1\. OP\_READ 只是“现在读可能有进展”

Worker Selector 返回 `OP_READ` 后，`NioEventLoop.processSelectedKey()` 调用：

`unsafe.read();`

此处 Unsafe 是 `AbstractNioByteChannel.NioByteUnsafe`。它不是业务扩展接口，而是 Channel 内部执行传输操作的入口。

可读事件并不保证一次 read 能拿到完整业务消息，也不保证只能读一次。TCP 是字节流，内核只告诉应用“接收缓冲区目前有数据或连接状态变化”。一次 read 可能得到半个请求、多个请求，甚至返回 -1 表示对端关闭。

因此 Netty 不能把一次 `OP_READ` 等同于一次 `channelRead`，更不能把它等同于一个业务请求。读循环和协议解码必须分层。

## 2. `NioByteUnsafe.read()` 组织整轮读取

核心源码可简化为：

`public final void read() {    final ChannelConfig config = config();    if (shouldBreakReadReady(config)) {           clearReadPending();        return;       }    final ChannelPipeline pipeline = pipeline();    final ByteBufAllocator allocator = config.getAllocator();    final RecvByteBufAllocator.Handle allocHandle = recvBufAllocHandle();       allocHandle.reset(config);    ByteBuf byteBuf = null;    boolean close = false;    try {        do {               byteBuf = allocHandle.allocate(allocator);               allocHandle.lastBytesRead(doReadBytes(byteBuf));            if (allocHandle.lastBytesRead() <= 0) {                   byteBuf.release();                   byteBuf = null;                   close = allocHandle.lastBytesRead() < 0;                if (close) {                       readPending = false;                   }                break;               }                  allocHandle.incMessagesRead(1);               readPending = false;               pipeline.fireChannelRead(byteBuf);               byteBuf = null;           } while (allocHandle.continueReading());              allocHandle.readComplete();           pipeline.fireChannelReadComplete();        if (close) {               closeOnRead(pipeline);           }       } catch (Throwable t) {           handleReadException(pipeline, byteBuf, t, close, allocHandle);       } finally {        if (!readPending && !config.isAutoRead()) {               removeReadOp();           }       }   }`

这段代码围绕四个变量运转：

*   • `allocator`：真正分配 ByteBuf。
    
*   • `allocHandle`：预测大小并决定是否继续读。
    
*   • `byteBuf`：本次系统调用的数据载体。
    
*   • `pipeline`：接管成功读取后的消息传播。
    

其中 `byteBuf = null` 是重要的所有权标志。成功 `fireChannelRead(byteBuf)` 后，当前方法不再负责释放，所有权进入 Pipeline；如果 read 没拿到数据或发生异常且 Buffer 未传播，则当前方法负责 release。

## 3\. RecvByteBufAllocator 不只是决定 Buffer 大小

每次都分配固定 1KB 会浪费系统调用，大连接又可能频繁扩容；每次都分配 64KB，又会让大量小消息连接浪费直接内存。Netty 用 `RecvByteBufAllocator.Handle` 自适应或按策略选择容量。

Handle 记录本轮和历史读取信息：

*   • `attemptedBytesRead`：计划读取多少。
    
*   • `lastBytesRead`：实际读取多少。
    
*   • `totalBytesRead`：本轮累计字节。
    
*   • `messagesRead`：本轮产生多少 Buffer/消息。
    
*   • 是否达到每轮最大消息数。
    
*   • 是否可能还有更多数据。
    

`continueReading()` 不只看 Socket 是否还有数据，也要考虑公平性。如果一个高流量 Channel 每次就绪都无限读到内核缓冲为空，它可能长时间霸占 EventLoop，其他连接和任务得不到执行。Allocator Handle 因而兼顾吞吐与调度公平。

生产调优不能只盯 `SO_RCVBUF`。它是内核接收缓冲；RecvByteBufAllocator 控制用户态每次和每轮读取。二者处于不同层级。

## 4. `doReadBytes()` 才真正调用 JDK SocketChannel

`AbstractNioByteChannel.doReadBytes()` 大致是：

`protected int doReadBytes(ByteBuf byteBuf) throws Exception {    final RecvByteBufAllocator.Handle allocHandle = unsafe().recvBufAllocHandle();       allocHandle.attemptedBytesRead(byteBuf.writableBytes());    return byteBuf.writeBytes(javaChannel(), allocHandle.attemptedBytesRead());   }`

ByteBuf 根据自身是堆内存还是直接内存，提供适配 NIO Channel 的写入方式。JDK SocketChannel 把数据写入 ByteBuf 的可写区域，成功后推进 `writerIndex`。

如果是 DirectByteBuf，底层能够更直接地用于 Native I/O；如果是 HeapByteBuf，可能需要临时直接缓冲或额外复制。现代 Netty 默认 allocator 的选择与平台能力有关，网络服务通常更关注池化直接内存。

`lastBytesRead` 的语义：

*   • 大于 0：读取成功，Buffer 有可读数据。
    
*   • 等于 0：当前没有读到数据，结束本轮。
    
*   • 小于 0：对端关闭了输入方向，需要进入关闭处理。
    

## 5. `fireChannelRead` 转移消息所有权

读取成功后：

`pipeline.fireChannelRead(byteBuf);   byteBuf = null;`

Pipeline 从 HeadContext 后的第一个入站 Handler 开始寻找。每个 Handler 可以：

*   • 消费消息并停止传播。
    
*   • 转换消息后传播新对象。
    
*   • 原样调用 `ctx.fireChannelRead(msg)`。
    
*   • 抛出异常，让异常事件继续传播。
    

对于引用计数对象，传播责任与释放责任必须二选一。常见正确写法：

`@Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {    try {        ByteBuf buf = (ByteBuf) msg;           consume(buf);       } finally {           ReferenceCountUtil.release(msg);       }   }`

如果要继续传播：

`ctx.fireChannelRead(msg); // 不在当前 Handler 释放`

如果生成新消息并不再传播旧 Buffer，应释放旧 Buffer。`SimpleChannelInboundHandler` 会对匹配类型自动 release，但一旦消息被异步保存或转发，仍要理解 retain 与所有权。

## 6\. 一次读循环可能触发多次 channelRead

假设内核缓冲里有 20KB 数据，而 allocator 每次分配 8KB。本轮可能发生：

`read 8KB -> fireChannelRead(buf1)   read 8KB -> fireChannelRead(buf2)   read 4KB -> fireChannelRead(buf3)   fireChannelReadComplete()`

反过来，一次 8KB ByteBuf 里也可能含有十个业务请求。是否是完整消息由 Decoder 决定，不由读循环决定。

`channelReadComplete` 的准确含义是“本轮由一个读就绪事件驱动的读取批次结束”。它常用于统一 flush、统计本轮字节、触发下一次手动 read。它不是“一个请求处理完成”，也不是“连接暂时永远没有数据”。

Netty 的某些 Handler 会采用 read-complete 时统一 flush，以减少系统调用。这种 batching 可以提高吞吐，但也可能增加少量延迟，需要结合场景。

## 7\. Decoder 在入站链中建立消息边界

最常见 Pipeline：

`pipeline.addLast(new LengthFieldBasedFrameDecoder(...));   pipeline.addLast(new ProtocolDecoder());   pipeline.addLast(new BusinessHandler());`

读路径先把任意分块的 ByteBuf 交给帧解码器。帧解码器维护 cumulation，把半包留到下一次 channelRead；当足够组成完整帧时，切出帧继续传播。ProtocolDecoder 再把帧转换为 Java 对象。

于是业务 Handler 看到的消息边界与 Socket read 边界完全解耦：

`Socket read #1: 半个请求 A   Socket read #2: A 的剩余部分 + 完整 B + 半个 C   Socket read #3: C 的剩余部分      Business Handler: A, B, C`

这正是 Netty 编解码层的价值：Transport 只对字节和连接负责，Codec 对协议边界负责，业务对领域消息负责。

## 8\. 对端关闭不等于立刻暴力 close

read 返回 -1 时，`closeOnRead()` 会根据 Channel 是否允许半关闭决定行为。TCP 支持输入方向关闭而输出方向仍可写。若配置 `ALLOW_HALF_CLOSURE`，Netty 可以触发半关闭相关事件；否则通常关闭整个 Channel。

常见生命周期顺序包括：

`channelReadComplete     -> userEventTriggered(input shutdown) 或 channelInactive     -> channelUnregistered`

协议层要明确半关闭语义。例如客户端不再发送请求，但服务端还需要发送剩余响应时，直接 close 可能截断输出；普通短请求协议则通常无需保留半关闭。

异常也不一定总是立即关闭。`handleReadException` 会先传播已读到的数据，再触发 readComplete 和 exceptionCaught，最后根据异常类型和连接状态决定关闭。这样可以避免本轮已经成功读取的消息被无故丢弃。

## 9\. AUTO\_READ 决定谁控制下一轮读取

默认 `AUTO_READ=true`，Channel Active 后持续关注 OP\_READ，每次就绪自动执行上述读循环。这适合大多数服务，但在消费能力有限时可能不断把网络数据搬进用户态，形成内存积压。

关闭 AUTO\_READ 后，业务需要显式：

`ctx.read();`

常见手动读取模式：

`@Override   public void channelReadComplete(ChannelHandlerContext ctx) {    if (businessCapacityAvailable()) {           ctx.read();       }   }`

这能把背压从业务处理能力传回 Socket 读取。内核接收缓冲填满后，TCP 窗口会自然收缩，对端发送速度下降。

但手动 read 很容易忘记恢复，表现为连接正常、无异常、就是不再收消息。排查时要检查 SelectionKey 是否仍关注 OP\_READ、`readPending` 状态和业务分支是否遗漏 `ctx.read()`。


这张时序图把所有权变化单独画出来，很适合定位 ByteBuf 泄漏和提前释放。ByteBuf 从 Allocator 出来后，成功 `fireChannelRead` 就交给 Pipeline；Decoder 如果保留半包，要负责 cumulation 生命周期；业务 Handler 如果终止传播，就要消费并释放。凡是跨线程保存或异步处理，都必须先 `retain` 或使用 retained slice。

## 10\. 入站读路径的典型故障

第一，EventLoop 读到了数据，但某个 Handler 没调用 `fireChannelRead`，后续业务永远收不到。可在 Pipeline 各节点增加短期日志定位传播断点。

第二，Decoder 每次都不推进 readerIndex，也不产出消息。`ByteToMessageDecoder` 会检测这种情况并避免死循环，但业务会表现为累积 Buffer 增长。检查长度字段、字节序和协议版本。

第三，Handler 吞掉 ByteBuf 却不 release，导致直接内存泄漏。开启适当级别的 ResourceLeakDetector，并检查最后消费点。

第四，业务线程异步使用 ByteBuf，却没有 retain。EventLoop 返回后上游自动 release，异步线程访问时抛 `IllegalReferenceCountException`。

第五，单连接持续大流量，读循环配置过激，其他 Channel 延迟升高。检查 maxMessagesPerRead、allocator 策略和 EventLoop 分布。

## 11\. 读性能优化要先判断瓶颈层

读取慢可能在不同层：

层次

现象

优先检查

网络/内核

RTT 高、丢包、窗口小

TCP 指标、网卡、接收缓冲

EventLoop

一批连接一起抖

线程栈、Handler 耗时、任务队列

内存分配

Allocation/GC 压力

allocator、直接内存、池命中

解码

CPU 高、cumulation 大

协议复杂度、复制、帧长度

业务

channelRead 耗时长

阻塞调用、锁、线程池

简单扩大接收 Buffer 不一定提高吞吐；如果 Decoder CPU 已满，只会让积压更快进入用户态。简单增加 EventLoop 也不一定有效；如果瓶颈是共享业务池或单连接顺序处理，线程数增加帮助有限。

## 12\. 总结：读路径的三个关键词是批量、边界、所有权

完整主链可以压缩为：

`OP_READ     -> NioEventLoop     -> NioByteUnsafe.read     -> RecvByteBufAllocator.allocate     -> SocketChannel.read     -> pipeline.fireChannelRead     -> Decoder / Handler     -> fireChannelReadComplete`

批量意味着一次就绪可能多次 read；边界意味着 Socket 分块不等于协议消息；所有权意味着 ByteBuf 传播与释放必须明确。

下一篇转向出站：`writeAndFlush()` 为什么不是一个动作，消息如何进入 `ChannelOutboundBuffer`，跨线程写如何回到 EventLoop，以及 Socket 一次写不完时为什么要注册 `OP_WRITE`。

## 参考资料

1.  1. `AbstractNioByteChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioByteChannel.java
    
2.  2. `RecvByteBufAllocator.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/RecvByteBufAllocator.java
    
3.  3. `DefaultMaxMessagesRecvByteBufAllocator.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultMaxMessagesRecvByteBufAllocator.java
    
4.  4. `ByteBuf.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer/ByteBuf.java

---

## 15. NioEventLoop 源码：一个线程如何同时处理 I/O 和任务（源码系列第4篇） 15. NioEventLoop 源码：一个线程如何同时处理 I/O 和任务（源码系列第4篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489454&idx=1&sn=b06e2afecf32dc639cc9bda725347a0a&chksm=eb6750d8dc10d9ce7062357cbbc0959949f9dfd1cf398ba537edcf8188a3eb5b984f3d4fc33d

> `NioEventLoop` 不是只会调用 `Selector.select()` 的 I/O 线程，而是一个带任务队列、定时调度、唤醒协议和时间预算的单线程执行器。Netty 的低锁与有序性来自“Channel 固定绑定 EventLoop”，而吞吐抖动往往来自 I/O、普通任务和定时任务对同一条线程的竞争。

Netty 最常见的描述是“基于 Reactor 模型，一个线程可以处理很多连接”。这句话没有错，但只解释了 Selector 复用，没有解释 Netty 为什么还要让业务通过 `eventLoop().execute()` 提交任务，也没有解释心跳、Promise Listener、跨线程 write 为什么最终都能回到同一连接线程。

答案在 `NioEventLoop.run()`：它每轮循环都要在三类工作之间做协调。

1.  1\. 等待或轮询 I/O 就绪事件。
    
2.  2\. 处理 SelectionKey 对应的 Channel 操作。
    
3.  3\. 运行普通任务和到期的定时任务。
    

因此 EventLoop 卡顿不一定是 Selector 慢，也可能是任务队列太长；定时任务延迟不一定是调度器有 Bug，也可能是某次 I/O 回调执行太久。把它当成一个“单线程小型操作系统”比把它叫作“线程池里的线程”更接近真实。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`transport/src/main/java/io/netty/channel/nio/NioEventLoop.java`
    
*   • 方法：`run()`、`processSelectedKeys()`、`select(...)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    


这张流程图可以按一个循环理解：先决定是否阻塞在 Selector，再处理就绪 SelectionKey，最后按 `ioRatio` 给普通任务和定时任务分配时间。它说明 EventLoop 不是“只做网络 I/O 的线程”，而是 I/O、用户任务、Promise 回调、定时任务共享的单线程调度器；任何一个环节阻塞，都会影响同一 EventLoop 上的全部 Channel。

## 1\. EventLoop 同时实现执行器和事件循环

从类型体系看，`EventLoop` 继承 `EventExecutor`，又继承 `EventLoopGroup`。它既能注册 Channel，也能执行 Runnable、调度定时任务和返回 Future。

这不是接口堆叠，而是统一并发模型的关键。任何影响某条 Channel 的状态变更，只要提交到它的 EventLoop，就会与该 Channel 的 I/O 回调串行执行：

`channel.eventLoop().execute(() -> {    // 与该 Channel 的 channelRead/write/close 等事件串行       updateConnectionState();   });`

如果当前就在 EventLoop 线程，许多操作可以直接执行；如果在外部业务线程，Netty 会把操作封装成任务放入队列，并唤醒可能阻塞在 select 的 EventLoop。

这种“线程封闭”降低了锁需求，但边界只在单个 EventLoop 内成立。一个可共享 Handler 被多个 Channel 使用，而这些 Channel 可能属于不同 EventLoop，此时 Handler 自己的共享状态仍然需要线程安全。

## 2\. run 循环的骨架是无限循环加异常恢复

`NioEventLoop.run()` 外层是一个长期循环。简化结构如下：

`protected void run() {    int selectCnt = 0;    for (;;) {        try {            int strategy = selectStrategy.calculateStrategy(selectNowSupplier, hasTasks());            switch (strategy) {                case SelectStrategy.CONTINUE:                    continue;                case SelectStrategy.BUSY_WAIT:                case SelectStrategy.SELECT:                    long curDeadlineNanos = nextScheduledTaskDeadlineNanos();                       strategy = select(curDeadlineNanos);                    break;                default:               }                  selectCnt++;               cancelledKeys = 0;               needsToSelectAgain = false;            final int ioRatio = this.ioRatio;            boolean ranTasks;            if (ioRatio == 100) {                try {                    if (strategy > 0) {                           processSelectedKeys();                       }                   } finally {                       ranTasks = runAllTasks();                   }               } else {                long ioStartTime = System.nanoTime();                try {                    if (strategy > 0) {                           processSelectedKeys();                       }                   } finally {                    long ioTime = System.nanoTime() - ioStartTime;                       ranTasks = runAllTasks(ioTime * (100 - ioRatio) / ioRatio);                   }               }           } catch (Throwable t) {               handleLoopException(t);           } finally {            // shutdown 确认与资源清理           }       }   }`

这段骨架体现四个设计目标：

*   • 没有任务时阻塞 select，避免空转浪费 CPU。
    
*   • 有任务时减少阻塞，及时处理任务。
    
*   • I/O 与任务之间按时间预算平衡。
    
*   • 单次异常不能让 EventLoop 线程退出。
    

EventLoop 是大量连接的共享基础设施。如果某个 Channel 回调异常就让 run 循环结束，整个线程管理的连接都会失去响应。因此最外层必须捕获 Throwable，记录并继续下一轮。具体 Channel 异常仍会沿 Pipeline 传播并按连接维度处理。

## 3\. SelectStrategy 决定阻塞、非阻塞还是继续循环

直接每轮调用 `selector.select()` 会产生一个问题：任务队列已经有任务时，EventLoop 仍可能睡在 Selector 里。直接每轮 `selectNow()` 又会导致空闲时 CPU 空转。

`SelectStrategy` 在二者之间做决策。默认策略会根据 `hasTasks()` 决定先执行非阻塞 select，还是进入可能阻塞的 SELECT 分支。

典型语义是：

*   • `CONTINUE`：不做 select，继续下一轮。
    
*   • `SELECT`：根据最近定时任务期限计算阻塞时间。
    
*   • 非负整数：表示 `selectNow()` 得到的就绪 Key 数。
    

定时任务期限也会参与 select 超时计算。假设最近心跳任务 100ms 后到期，Selector 就不能无限期阻塞，而应最多睡到该期限。这样 Netty 不需要单独的定时线程唤醒 EventLoop。

## 4\. wakeup 解决跨线程任务与阻塞 select 的竞态

外部线程调用 `eventLoop.execute(task)` 时，EventLoop 可能正在：

1.  1\. 处理 I/O。
    
2.  2\. 运行任务。
    
3.  3\. 阻塞在 `selector.select()`。
    

前两种情况下任务稍后自然会被取出。第三种情况下，如果不唤醒 Selector，任务可能一直等到网络事件或 select 超时。

因此任务入队后，必要时调用 `selector.wakeup()`。但 wakeup 不是越多越好，它是系统调用并可能制造额外循环。Netty 使用原子状态协调“是否正在 select”和“是否已经请求唤醒”，尽量合并重复 wakeup。

这类代码看起来复杂，是因为要处理经典竞态：

`EventLoop 检查队列为空   外部线程提交任务   EventLoop 刚好进入 select`

如果提交线程认为 EventLoop 还没 select 而不唤醒，任务会延迟；如果 EventLoop 对每个任务都无条件 wakeup，又会影响吞吐。Netty 的状态位正是在缩小这个窗口。

## 5\. SelectedKey 最终被还原成 Channel 操作

Selector 返回 SelectionKey 后，`processSelectedKeys()` 遍历就绪集合。Netty会尝试用优化的数组结构替代 JDK 原始 Set，以减少迭代和删除开销；无法注入优化实现时，再走普通 Set。

对 Netty Channel，SelectionKey attachment 是 `AbstractNioChannel`。处理逻辑根据 readyOps 分派：

`int readyOps = k.readyOps();   if ((readyOps & SelectionKey.OP_CONNECT) != 0) {    int ops = k.interestOps();       ops &= ~SelectionKey.OP_CONNECT;       k.interestOps(ops);       unsafe.finishConnect();   }      if ((readyOps & SelectionKey.OP_WRITE) != 0) {       ch.unsafe().forceFlush();   }      if ((readyOps & (SelectionKey.OP_READ | SelectionKey.OP_ACCEPT)) != 0           || readyOps == 0) {       unsafe.read();   }`

三个分支对应三条重要主链：

*   • `OP_ACCEPT/OP_READ`：接入连接或读取数据。
    
*   • `OP_WRITE`：Socket 曾写不完，现在继续冲刷待发送队列。
    
*   • `OP_CONNECT`：客户端非阻塞连接完成。
    

`readyOps == 0` 仍尝试 read，是对某些 JDK/平台行为的防御性处理。网络框架不能假定所有 Selector 实现完全理想，很多看似多余的分支都来自长期跨平台实践。

## 6\. ioRatio 分配的是时间，不是事件数量

`ioRatio` 默认通常为 50。它不是“处理 50 个 I/O 再处理 50 个任务”，而是根据本轮 I/O 花费时间计算任务预算：

`long ioTime = System.nanoTime() - ioStartTime;   runAllTasks(ioTime * (100 - ioRatio) / ioRatio);`

当 `ioRatio=50`，如果 I/O 处理花了 4ms，任务最多得到大约 4ms。当 `ioRatio=80`，4ms I/O 对应约 1ms 任务预算。当 `ioRatio=100`，会处理完所有已选 I/O，再无时间限制地运行当轮任务。

这带来明确取舍：                                                

场景

较高 ioRatio

较低 ioRatio

网络 I/O 很重

提高吞吐

可能推迟读写

跨线程任务很多

任务可能积压

任务响应更及时

定时任务敏感

可能延迟

更容易准时

Handler 全在 EventLoop

业务任务与 I/O 竞争更明显

需结合耗时评估

         调参前必须先知道瓶颈在哪。把 ioRatio 从 50 改到 100，可能提高压测吞吐，也可能让跨线程提交的写任务和定时任务在 I/O 洪峰中饥饿。

## 7\. 任务队列里装的不只是用户 Runnable

EventLoop 的 taskQueue 可能包含：

*   • 用户调用 `eventLoop.execute()` 提交的任务。
    
*   • 跨线程 `write()` 封装的 WriteTask。
    
*   • Pipeline 动态添加/删除 Handler 的回调。
    
*   • Promise Listener 的通知任务。
    
*   • Channel 注册、绑定、关闭等生命周期任务。
    
*   • 某些延迟到稍后执行的事件。
    

定时任务则维护在调度结构中，到期后会被转移或执行。心跳、重连、超时检测都可能依赖它。

因此任务队列积压的影响远比“用户任务执行慢”更广。它会造成 writeAndFlush 延迟、注册延迟、连接关闭延迟、定时器漂移和 Promise 回调迟到。监控 EventLoop 时，应同时关注：

*   • 每轮任务执行时间。
    
*   • pendingTasks 数量。
    
*   • scheduled task 延迟。
    
*   • 单个 Handler 耗时。
    
*   • Selector 空转和 wakeup 频率。
    

## 8\. 为什么同一 Channel 上通常不需要加锁

假设业务 Handler 保存一个连接级序号：

`private long sequence;      @Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {       sequence++;       handle(sequence, msg);   }`

只要该 Handler 实例不被多条 Channel 共享，且所有修改都发生在当前 Channel 的 EventLoop，这个字段通常不需要锁。因为 `channelRead`、用户事件、出站回调都会按该 EventLoop 串行执行。

若异步业务线程完成后要更新连接状态，正确方式是回到 EventLoop：

`businessPool.submit(() -> {    Result result = query();       ctx.executor().execute(() -> {           connectionState.apply(result);           ctx.writeAndFlush(result);       });   });`

这样重 CPU 或阻塞操作在业务池完成，连接状态与写操作回到 EventLoop 串行。需要警惕业务线程直接修改 Handler 字段，同时 EventLoop 也在访问，线程封闭就被打破了。


这张时序图说明跨线程操作为什么不会直接改 Channel 状态。外部线程只负责把任务放入队列并在必要时 wakeup，真正的状态修改回到 EventLoop 串行执行。写业务代码时，可以利用这个模型把阻塞计算放到业务线程池，但连接状态、写回响应、关闭连接等动作最好再切回 `ctx.executor()`。

## 9\. Selector 空轮询与自动重建

历史上 JDK NIO 在部分平台和版本中可能出现 Selector 没有事件却立即返回，导致 run 循环高速空转，CPU 接近 100%。Netty 在 select 逻辑中统计异常提前返回次数，超过阈值后重建 Selector，并把旧 Selector 上注册的 Channel 迁移到新 Selector。

这不是正常业务路径，却是生产稳定性的重要兜底。重建过程中需要：

1.  1\. 创建新 Selector。
    
2.  2\. 遍历旧 Selector 的 SelectionKey。
    
3.  3\. 取消旧 Key。
    
4.  4\. 用原 interestOps 和 attachment 注册新 Selector。
    
5.  5\. 更新每个 Channel 保存的 SelectionKey。
    
6.  6\. 关闭旧 Selector。
    

这也说明为什么应用不应绕过 Netty 私自修改底层 SelectionKey。Netty 可能在恢复流程中替换它，外部保存的引用会失效。

## 10\. EventLoop 被阻塞时会出现“成组故障”

假设一个 Worker EventLoop 管理 5000 条连接，其中一条连接的 Handler 执行了 2 秒同步调用。这 2 秒内：

*   • 其他 4999 条连接的读事件不能处理。
    
*   • 已排队的 write task 不能执行。
    
*   • OP\_WRITE 不能继续冲刷。
    
*   • 心跳和超时任务不能准时运行。
    
*   • close 和 Promise Listener 也会延迟。
    

这就是 Netty 线上故障常呈现“某一批连接一起抖动”的原因。连接按 EventLoop 分组，故障也按 EventLoop 扩散。

诊断时可以抓取线程栈，寻找命名类似 `nioEventLoopGroup-x-y` 的线程。如果线程停在业务数据库、HTTP 客户端、锁或文件 I/O，而不是 Selector 与 Netty 方法，就说明 EventLoop 被业务阻塞。也可在 Handler 前后记录耗时，超过阈值打印事件类型和 Channel。

## 11\. 业务卸载也可能破坏顺序和背压

把所有 Handler 都扔到独立线程池并非自动正确。`pipeline.addLast(executorGroup, handler)` 可以让 Handler 在指定 EventExecutorGroup 上运行，但要考虑：

*   • 同一 Channel 的事件是否仍由同一 Executor 串行。
    
*   • 任务队列是否有界。
    
*   • 异步结果返回时是否保持消息顺序。
    
*   • ByteBuf 在跨线程期间是否 retain。
    
*   • 业务池积压是否能反馈到网络读取。
    

无界业务队列只是把压力从 EventLoop 转移到堆内存。更完整的方案是有界队列、拒绝策略、关闭 AUTO\_READ 或根据业务容量控制 read，并把结果写回 EventLoop。

## 12\. 总结：EventLoop 是 Netty 并发模型的最小单元

理解 `NioEventLoop.run()` 后，Netty 很多设计会连起来：

*   • Channel 固定注册 EventLoop，所以事件有序。
    
*   • 外部线程通过任务队列影响 Channel，所以需要 wakeup。
    
*   • I/O 与任务共享线程，所以需要 ioRatio 和时间预算。
    
*   • 定时任务参与 select 超时，所以心跳不需要独立线程。
    
*   • EventLoop 管理多条 Channel，所以阻塞会成组扩散。
    
*   • Selector 可能异常，所以 Netty提供重建兜底。
    

下一篇将沿 `OP_READ -> unsafe.read()` 展开，查看 EventLoop 得到读就绪后，Netty如何选择 ByteBuf 大小、执行读循环、传播 `channelRead` 与 `channelReadComplete`，以及 Buffer 的所有权从哪里开始转移。

## 参考资料

1.  1. `NioEventLoop.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    
2.  2. `SingleThreadEventExecutor.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java
    
3.  3. `SelectStrategy.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/SelectStrategy.java
    
4.  4\. Netty Thread Model：https://netty.io/wiki/thread-model.html

---

## 14. Netty 新连接接入源码：Boss 如何把 Channel 交给 Worker（源码系列第3篇） 14. Netty 新连接接入源码：Boss 如何把 Channel 交给 Worker（源码系列第3篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489445&idx=1&sn=7962b2692ef566ead6fd57e1d4e818d7&chksm=eb6750d3dc10d9c5337f487f60f213df478761e975b7d8427aa1746cd20607feb1a65a34e013

> Netty 的主从 Reactor 不是两组线程直接传递 Socket，而是 Boss 把 `accept()` 得到的连接包装成子 Channel，再通过父 Pipeline 的 `ServerBootstrapAcceptor` 完成配置和 Worker 注册。父子 Channel、父子 Pipeline 与两组 EventLoop 的边界，共同保证了“接入轻量、连接固定归属、业务互不串线”。

上一章走完了服务端 `bind()`：`NioServerSocketChannel` 已注册到 Boss EventLoop 的 Selector，并完成端口监听。接下来客户端发起 TCP 连接，内核完成握手，Selector 返回 `OP_ACCEPT`。从这一刻到业务 Handler 收到 `channelActive`，Netty 要完成一场精确的连接接力。

这条路径最容易出现三个误解：

1.  1\. Boss EventLoop 会一直负责该连接的读写。
    
2.  2. `childHandler` 在服务启动时已经加入父 Pipeline。
    
3.  3\. JDK `SocketChannel` 被直接交给 Worker Selector。
    

实际情况是：Boss 只负责监听 Channel 的 Accept 事件；每次 Accept 都会创建一个新的 `NioSocketChannel`；这个子 Channel 先作为一条入站消息经过父 Pipeline，再由 `ServerBootstrapAcceptor` 配置并注册到 Worker EventLoop。注册之后，后续读写才由 Worker 负责。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`AbstractNioMessageChannel.java`、`NioServerSocketChannel.java`、`ServerBootstrap.java`
    
*   • 官方仓库：https://github.com/netty/netty
    


## 1\. 父 Channel 只代表监听端口

服务端绑定 8080 后，存在一个 `NioServerSocketChannel`。它包装 JDK `ServerSocketChannel`，关注 `SelectionKey.OP_ACCEPT`。它不是某个客户端连接，也不会承载客户端请求字节。

当三个客户端连入时，运行时对象大致是：

`NioServerSocketChannel :8080     ├── NioSocketChannel client-A     ├── NioSocketChannel client-B     └── NioSocketChannel client-C`

父 Channel 的 `parent()` 为 null，子 Channel 的 `parent()` 指向 ServerChannel。父子关系主要表达连接来源和生命周期上下文，并不意味着所有 I/O 都在同一线程执行。

父 Pipeline 通常只有启动日志、接入控制和系统安装的 `ServerBootstrapAcceptor`。子 Pipeline 才会包含 Decoder、Encoder、鉴权和业务 Handler。把这个边界想清楚，`handler()` 与 `childHandler()` 的区别就非常自然。

## 2\. OP\_ACCEPT 最终进入 `NioMessageUnsafe.read()`

Boss EventLoop 调用 `processSelectedKey()` 时，发现 SelectionKey 包含 `OP_ACCEPT`。对消息型 NIO Channel，最终会调用 `AbstractNioMessageChannel.NioMessageUnsafe.read()`。

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/nio/AbstractNioMessageChannel.java`
    
*   • 方法：`NioMessageUnsafe.read()`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioMessageChannel.java
    

主逻辑可简化为：

`public void read() {    ChannelConfig config = config();    ChannelPipeline pipeline = pipeline();       RecvByteBufAllocator.Handle allocHandle = unsafe().recvBufAllocHandle();       allocHandle.reset(config);    boolean closed = false;    Throwable exception = null;    try {        do {            int localRead = doReadMessages(readBuf);            if (localRead == 0) {                break;               }            if (localRead < 0) {                   closed = true;                break;               }               allocHandle.incMessagesRead(localRead);           } while (allocHandle.continueReading());       } catch (Throwable t) {           exception = t;       }    for (Object message : readBuf) {           pipeline.fireChannelRead(message);       }       pipeline.fireChannelReadComplete();    if (exception != null) {           pipeline.fireExceptionCaught(exception);       }   }`

这里的“read”不是读取业务字节，而是读取一批消息。对于 ServerSocketChannel，一个消息就是一个新连接。`readBuf` 因此保存的是新创建的子 Channel。

Netty 会在一次 Accept 就绪中尽可能处理多个连接，但又由 `RecvByteBufAllocator.Handle` 控制循环，避免单个 ServerChannel 长时间霸占 Boss EventLoop。

## 3. `doReadMessages()` 完成 JDK accept 和 Channel 包装

`NioServerSocketChannel.doReadMessages()` 是真正调用 JDK `accept()` 的地方：

`protected int doReadMessages(List<Object> buf) throws Exception {    SocketChannel ch = SocketUtils.accept(javaChannel());    try {        if (ch != null) {               buf.add(new NioSocketChannel(this, ch));            return 1;           }       } catch (Throwable t) {        if (ch != null) {            try {                   ch.close();               } catch (Throwable t2) {                   logger.warn("Failed to close a socket.", t2);               }           }        throw t;       }    return 0;   }`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/socket/nio/NioServerSocketChannel.java`
    
*   • 方法：`doReadMessages(List<Object>)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/socket/nio/NioServerSocketChannel.java
    

这段代码做了两件关键的事。

第一，调用 JDK `ServerSocketChannel.accept()` 得到 `SocketChannel`。由于监听 Channel 是非阻塞模式，即使 SelectionKey 表示可接入，循环中后续 accept 也可能返回 null。

第二，用 `new NioSocketChannel(this, ch)` 把 JDK Socket 包装成 Netty 子 Channel。构造函数会关联父 Channel，设置非阻塞模式，创建 Pipeline、Config、Unsafe 和写缓冲等运行时结构。

此时子 Channel 还没有注册 Worker EventLoop。它只是一个已经持有底层 Socket、但尚未建立线程归属的 Netty 对象。

## 4\. 新 Channel 为什么要先经过父 Pipeline

`NioMessageUnsafe.read()` 不直接调用 Worker Group，而是对 `readBuf` 中每个子 Channel 执行：

`pipeline.fireChannelRead(readBuf.get(i));`

这里的 Pipeline 是父 `NioServerSocketChannel` 的 Pipeline。新连接被当成一条入站消息向后传播。最终处理它的是 `ServerBootstrapAcceptor`。

这个设计非常优雅：Accept 仍然遵守 Netty 的统一事件模型。用户可以在 Acceptor 之前加入父 Channel Handler，实现连接接入日志、IP 黑白名单、限流或统计，而不需要修改底层 Transport。

当然，父 Pipeline 中的 Handler 必须足够轻。它运行在 Boss EventLoop，一次阻塞会直接影响后续连接接入。复杂鉴权、数据库查询和协议握手应放在子 Channel 的 Worker Pipeline 中，而不是 Boss 接入链。

## 5\. ServerBootstrapAcceptor 应用 child 配置

`ServerBootstrapAcceptor.channelRead()` 收到的 `msg` 就是子 Channel：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    final Channel child = (Channel) msg;          child.pipeline().addLast(childHandler);          setChannelOptions(child, childOptions, logger);       setAttributes(child, childAttrs);    try {           childGroup.register(child).addListener(new ChannelFutureListener() {            @Override            public void operationComplete(ChannelFuture future) {                if (!future.isSuccess()) {                       forceClose(child, future.cause());                   }               }           });       } catch (Throwable t) {           forceClose(child, t);       }   }`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java`
    
*   • 类：`ServerBootstrapAcceptor`
    
*   • 方法：`channelRead(ChannelHandlerContext, Object)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java
    

先把 `childHandler` 加入子 Pipeline，再应用 childOption 和 Attribute，最后调用 `childGroup.register(child)`。通常 `childHandler` 是 `ChannelInitializer`，它会在子 Channel 注册过程中执行 `initChannel()`，把真正的业务 Handler 加入 Pipeline，随后把自己移除。

这里的失败处理很重要：如果注册 Worker 失败，必须强制关闭已 accept 的 Socket。否则内核连接已经建立，Netty 却没有线程负责它，会形成资源泄漏和客户端悬挂。

## 6\. Worker 注册决定连接的长期线程归属

`childGroup.register(child)` 会选择一个 Worker EventLoop。选择结果写入 `child.eventLoop`，并在该 EventLoop 中执行 `register0()`，把 JDK SocketChannel 注册到 Worker Selector。

从此通常满足：

`child.eventLoop() == selectedWorkerEventLoop`

连接不会在每次请求时重新选择线程。固定归属带来三个后果：

1.  1\. 同一 Channel 的事件顺序稳定。
    
2.  2\. Handler 可以保存连接级状态而少用锁。
    
3.  3\. EventLoop 阻塞会影响它管理的全部 Channel。
    

Worker 的连接分配一般按轮询进行，不会根据每条连接的实际流量动态迁移。因此长连接业务里，即使连接数分布均匀，流量也可能不均匀：某个 Worker 恰好绑定了几个超级活跃连接，就可能比其他线程繁忙。排查时不能只看总连接数，还要观察各 EventLoop 的任务队列、CPU 和处理延迟。

## 7\. ChannelInitializer 在注册期间完成业务 Pipeline

子 Channel 的 `childHandler` 常见写法是：

`new ChannelInitializer<SocketChannel>() {    @Override    protected void initChannel(SocketChannel ch) {        ChannelPipeline p = ch.pipeline();           p.addLast(new LengthFieldBasedFrameDecoder(...));           p.addLast(new MessageDecoder());           p.addLast(new MessageEncoder());           p.addLast(new BusinessHandler());       }   }`

`ChannelInitializer` 本身是一个临时 Handler。它在 `handlerAdded` 或 `channelRegistered` 时检查是否需要初始化，调用 `initChannel()` 后将自身从 Pipeline 移除。这样每个子 Channel 都得到独立的 Handler 链。

要注意 Handler 的共享规则。标记 `@Sharable` 的无状态 Handler 可以复用同一实例；带可变成员状态且未设计并发安全的 Handler，通常应该为每条 Channel 创建新实例。否则多个连接可能共享解析状态、用户身份或计数器，产生非常隐蔽的数据串线。

Decoder 往往不是 Sharable，因为它可能持有累积 Buffer。业务 Handler 是否可共享，要看状态是否放在 Channel Attribute、请求对象或线程安全结构中。

## 8\. 注册完成后触发 registered、active 与首次 read

子 Channel 已经由 TCP accept 创建，因此其底层 Socket 通常处于连接状态。Worker 注册完成后，`register0()` 触发：

`handlerAdded     -> channelRegistered     -> channelActive     -> beginRead / 设置 OP_READ`

`channelActive` 表示连接已经可用，业务可以发送欢迎消息、发起 TLS 握手或登记在线会话。随后，如果 `AUTO_READ` 开启，Netty 会调用 `beginRead()`，最终把 `OP_READ` 加入 SelectionKey 的 interestOps。

这也解释了为什么关闭 `AUTO_READ` 可以实现入站背压：连接注册和激活仍然发生，但没有显式 `channel.read()` 时，Netty不会持续关注或触发下一轮读取。业务可以在处理完当前消息后再请求下一次 read。


## 9\. Accept 异常为什么会临时关闭 AutoRead

`ServerBootstrapAcceptor` 对连接接入异常有一段防护逻辑：如果父 Channel 出现某些异常，会临时把 `autoRead` 设为 false，并在短暂延迟后恢复。

目的不是“修复异常”，而是避免资源耗尽时陷入高速失败循环。典型场景是文件描述符耗尽：Selector 不断报告可 Accept，`accept()` 又不断失败。如果继续无节制接入，会占满 CPU 和日志，服务无法恢复。

临时暂停 Accept 给系统留下回收资源、运维介入和已有连接完成的时间。这体现了 Netty 很多稳定性设计的共同思路：发生系统性错误时，先降低事件产生速度，而不是在热循环中反复尝试。

生产环境仍应配置：

*   • 足够的文件描述符上限。
    
*   • 合理的 `SO_BACKLOG`。
    
*   • 连接建立速率限制。
    
*   • 连接数和 Accept 失败监控。
    
*   • 对 `Too many open files` 等异常单独告警。
    

## 10\. 主从 Reactor 的收益与边界

Boss/Worker 分离的收益是让连接接入与数据处理互不直接阻塞。Boss 的工作非常短：accept、包装 Channel、沿 Pipeline 传播、触发注册。Worker 承担连接生命周期内的大部分读写。

但它并不是万能隔离。

如果 `childHandler` 初始化很重，它仍然在注册路径中拖慢 Worker。如果父 Pipeline 做远程鉴权，它会拖慢 Boss。如果 Worker 数量设置过少，所有连接仍会竞争少数 EventLoop。如果业务任务直接运行在 EventLoop，慢操作仍会造成队头阻塞。

对于普通服务，Boss 线程数通常不需要很多，因为 accept 工作量小；Worker 数量则要结合 CPU、协议处理成本、连接活跃度和是否把业务卸载到独立线程池评估。简单照搬“CPU 核数乘二”并不可靠。

## 11\. 排查连接接入问题的源码化方法

当客户端“TCP 能连但业务无响应”，可以按以下边界定位：

1.  1\. 端口是否已经 bind 成功，ServerChannel 是否 Active。
    
2.  2\. Boss Selector 是否收到 `OP_ACCEPT`。
    
3.  3. `doReadMessages()` 是否创建 NioSocketChannel。
    
4.  4\. 父 Pipeline 是否把 Channel 传播到 Acceptor。
    
5.  5\. childHandler 初始化是否抛异常。
    
6.  6\. childGroup.register 是否成功。
    
7.  7\. 子 Channel 是否触发 `channelRegistered/channelActive`。
    
8.  8\. SelectionKey 是否关注 `OP_READ`。
    

如果连接数达到阈值后新连接超时，检查 backlog、文件描述符、Boss EventLoop 是否阻塞。如果连接已建立但 Handler 没有 active 日志，重点检查 Worker 注册和 ChannelInitializer。如果 active 正常但读不到数据，再进入下一篇的 EventLoop 与读路径。

## 12\. 总结：新连接是一条经过 Pipeline 的消息

Netty 连接接入链最值得记住的设计，是“新 Channel 先作为消息经过父 Pipeline”。它把底层 Accept 与上层扩展统一到同一套事件机制中。

完整主链是：

`Boss Selector OP_ACCEPT     -> NioMessageUnsafe.read     -> NioServerSocketChannel.doReadMessages     -> new NioSocketChannel     -> parentPipeline.fireChannelRead(child)     -> ServerBootstrapAcceptor.channelRead     -> child pipeline/options/attrs     -> childGroup.register     -> Worker Selector     -> channelActive + OP_READ`

下一篇会进入 Worker 的心脏 `NioEventLoop.run()`，解释它如何在一个线程里同时处理 Selector I/O、普通任务、定时任务和唤醒信号，以及 `ioRatio` 为什么会直接影响延迟与吞吐。

## 参考资料

1.  1. `AbstractNioMessageChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioMessageChannel.java
    
2.  2. `NioServerSocketChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/socket/nio/NioServerSocketChannel.java
    
3.  3. `ServerBootstrap.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java
    
4.  4. `ChannelInitializer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelInitializer.java

---

## 13. Netty 服务端启动源码：bind 之后做了什么（源码系列第2篇） 13. Netty 服务端启动源码：bind 之后做了什么（源码系列第2篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489427&idx=1&sn=41141e8dee9d07c3393af18fe6583475&chksm=eb6750e5dc10d9f3badd970a8ee65c4c69bb5d36bff722d7b522336177151090424f3555d51d

> `ServerBootstrap.bind()` 不是一次简单的端口绑定，而是一条“创建 Channel → 初始化组件 → 注册 EventLoop → 异步执行 bind”的装配链。注册必须先于绑定，是因为 Netty 要先为 Channel 确立唯一的线程归属，之后所有生命周期事件才能在正确的 EventLoop 中有序发生。

Netty 服务端启动代码通常只有十几行。真正让服务开始监听端口的，也只是：

`ChannelFuture future = bootstrap.bind(8080).sync();`

但这行代码背后至少解决了六个问题：使用哪个 Channel 实现、怎样创建底层 JDK ServerSocketChannel、父 Pipeline 如何初始化、监听 Channel 归属哪个 EventLoop、端口绑定在哪个线程执行、绑定成功如何通知调用者。

如果不理解这些步骤，就很容易把启动阶段的几个概念混为一谈。例如有人认为 `channel(NioServerSocketChannel.class)` 已经创建了 Channel；有人认为 `register()` 就是注册端口；也有人认为 `bind()` 在主线程同步完成。实际上：

*   • `channel(...)` 只配置 Channel 工厂。
    
*   • `initAndRegister()` 才真正创建并初始化 Channel。
    
*   • `register()` 是把 Channel 注册到 EventLoop 和 Selector。
    
*   • `bind()` 是把底层 ServerSocket 绑定到本地地址。
    
*   • 返回的 `ChannelFuture` 表达异步完成结果。
    

本文沿 `AbstractBootstrap.doBind()` 这一条主链展开。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`transport/src/main/java/io/netty/bootstrap/AbstractBootstrap.java`
    
*   • 重点类：`AbstractBootstrap`、`ServerBootstrap`、`AbstractChannel.AbstractUnsafe`
    
*   • 官方源码：https://github.com/netty/netty/tree/netty-4.1.135.Final
    


## 1\. 启动参数先被保存，bind 时才集中生效

一个典型服务端配置如下：

`ServerBootstrap b = new ServerBootstrap();   b.group(bossGroup, workerGroup)    .channel(NioServerSocketChannel.class)    .option(ChannelOption.SO_BACKLOG, 1024)    .childOption(ChannelOption.TCP_NODELAY, true)    .handler(new LoggingHandler(LogLevel.INFO))    .childHandler(new ChannelInitializer<SocketChannel>() {     @Override     protected void initChannel(SocketChannel ch) {            ch.pipeline().addLast(new FrameDecoder());            ch.pipeline().addLast(new BusinessHandler());        }    });`

这些链式调用大多没有立即操作 Socket。它们把配置保存进 Bootstrap：

*   • `group` 保存 parentGroup 和 childGroup。
    
*   • `channel` 包装出 `ReflectiveChannelFactory`。
    
*   • `option` 保存父 Channel 参数。
    
*   • `childOption` 保存子 Channel 参数。
    
*   • `handler` 保存父 Channel Handler。
    
*   • `childHandler` 保存未来每个连接的初始化器。
    

延迟应用配置有两个好处。第一，Bootstrap 可以在真正启动前做完整校验，例如是否设置 EventLoopGroup、ChannelFactory 和 childHandler。第二，Bootstrap 可以被 `clone()`，用相同模板创建多个监听 Channel，而不需要重新编写配置。

不过这也意味着 Bootstrap 是有状态的启动模板，不宜在多个线程中边修改边绑定。生产代码通常应该先完成配置，再执行一次或少量几次 bind。

## 2. `doBind()` 先调用 `initAndRegister()`

`AbstractBootstrap.bind(SocketAddress)` 完成地址校验后进入 `doBind()`。核心代码可简化为：

`private ChannelFuture doBind(final SocketAddress localAddress) {    final ChannelFuture regFuture = initAndRegister();    final Channel channel = regFuture.channel();    if (regFuture.cause() != null) {        return regFuture;       }    if (regFuture.isDone()) {        ChannelPromise promise = channel.newPromise();           doBind0(regFuture, channel, localAddress, promise);        return promise;       }    final PendingRegistrationPromise promise =        new PendingRegistrationPromise(channel);       regFuture.addListener(future -> {        if (future.cause() != null) {               promise.setFailure(future.cause());           } else {               promise.registered();               doBind0(regFuture, channel, localAddress, promise);           }       });    return promise;   }`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/bootstrap/AbstractBootstrap.java`
    
*   • 方法：`doBind(SocketAddress)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/AbstractBootstrap.java
    

这段代码最重要的不是 Promise 细节，而是顺序：**先初始化和注册，再绑定。**

为什么不能先把 ServerSocket 绑定端口，再注册到 EventLoop？因为 Channel 的后续生命周期事件，例如 `channelRegistered`、`channelActive`、异常通知和关闭，都应该在其所属 EventLoop 中执行。如果先绑定，Channel 可能已经变成 Active，却还没有线程归属和 Pipeline 执行环境，事件顺序会变得难以保证。

所以 Netty 把“注册成功”作为 bind 的前置条件。注册一旦完成，Channel 知道自己的 EventLoop，之后的 bind 会被安全地投递到这个 EventLoop。

## 3\. ChannelFactory 才在此刻创建 NioServerSocketChannel

`initAndRegister()` 的第一步是：

`Channel channel = null;   try {       channel = channelFactory.newChannel();       init(channel);   } catch (Throwable t) {    if (channel != null) {           channel.unsafe().closeForcibly();        return new DefaultChannelPromise(channel, GlobalEventExecutor.INSTANCE)               .setFailure(t);       }    return new DefaultChannelPromise(new FailedChannel(), GlobalEventExecutor.INSTANCE)           .setFailure(t);   }      ChannelFuture regFuture = config().group().register(channel);`

`channel(NioServerSocketChannel.class)` 配置的工厂通常通过反射调用无参构造器。创建 `NioServerSocketChannel` 时，它还会创建底层 JDK `ServerSocketChannel`，设置为非阻塞，并构造 ChannelConfig、Unsafe 和 Pipeline 等基础对象。

这一步要区分“Netty Channel”与“JDK Channel”：

对象

职责

`NioServerSocketChannel`

Netty 运行时对象，拥有 Pipeline、EventLoop、Config、Promise

`java.nio.channels.ServerSocketChannel`

JDK NIO 对象，负责注册 Selector、bind、accept

Netty 没有替代操作系统和 JDK NIO，而是在其上建立了稳定的事件模型。`NioServerSocketChannel` 把 JDK Channel 包装进统一的 Netty Channel 抽象，使 Pipeline、Future、Allocator 和跨平台 Transport 可以复用。

构造阶段还会指定关注的 SelectionKey 操作。Server Channel 关注 `OP_ACCEPT`；普通 Socket Channel 关注 `OP_READ`。这种差异不是 Bootstrap 决定的临时参数，而是各类 Channel 的传输职责决定的。

## 4. `ServerBootstrap.init()` 初始化的是父 Channel

Channel 创建后，`init(channel)` 动态分派到 `ServerBootstrap.init(Channel)`。这一阶段主要处理父 Channel：

1.  1\. 应用 `option()` 配置。
    
2.  2\. 应用父 Channel Attribute。
    
3.  3\. 获取父 Channel Pipeline。
    
4.  4\. 加入用户配置的 `handler()`。
    
5.  5\. 加入一个延迟安装 `ServerBootstrapAcceptor` 的初始化 Handler。
    

简化后的关键逻辑是：

`ChannelPipeline p = channel.pipeline();   final EventLoopGroup currentChildGroup = childGroup;   final ChannelHandler currentChildHandler = childHandler;      p.addLast(new ChannelInitializer<Channel>() {    @Override    public void initChannel(final Channel ch) {        final ChannelPipeline pipeline = ch.pipeline();        ChannelHandler handler = config.handler();        if (handler != null) {               pipeline.addLast(handler);           }           ch.eventLoop().execute(() ->               pipeline.addLast(new ServerBootstrapAcceptor(                   ch, currentChildGroup, currentChildHandler,                   currentChildOptions, currentChildAttrs,                   extensions, connectionMetadata)));       }   });`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java`
    
*   • 方法：`init(Channel)`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java
    

`ServerBootstrapAcceptor` 是连接接入主链的关键 Handler。Boss EventLoop 从 ServerSocket 接收新连接后，会把新建的子 Channel 作为入站消息沿父 Pipeline 传播；Acceptor 收到它，再应用 childHandler、childOption 和 childAttr，并注册到 Worker Group。

这解释了 `handler()` 与 `childHandler()` 的本质区别：

*   • `handler()` 属于监听 Channel，通常处理日志、异常或连接接入层事件。
    
*   • `childHandler()` 属于每条已接入的 SocketChannel，处理真正的协议和业务数据。
    

如果误把业务 Decoder 放进 `handler()`，它不会处理客户端请求，因为父 Channel 不承载每条连接的数据流。

## 5\. 注册过程为 Channel 选择唯一 EventLoop

`config().group().register(channel)` 会由 EventLoopGroup 选择一个 EventLoop，再调用该 EventLoop 的 `register()`。对于 `NioEventLoopGroup`，选择策略通常是轮询或经过优化的幂次选择。

注册最终进入 `AbstractChannel.AbstractUnsafe.register()`：

`public final void register(EventLoop eventLoop, final ChannelPromise promise) {    if (isRegistered()) {           promise.setFailure(new IllegalStateException("registered already"));        return;       }    if (!isCompatible(eventLoop)) {           promise.setFailure(new IllegalStateException("incompatible event loop type"));        return;       }          AbstractChannel.this.eventLoop = eventLoop;    if (eventLoop.inEventLoop()) {           register0(promise);       } else {           eventLoop.execute(() -> register0(promise));       }   }`

这段源码证明了三个关键事实。

第一，一条 Channel 只能注册一次，不能随意在多个 EventLoop 之间迁移。第二，Channel 类型必须与 EventLoop 兼容，例如 NIO Channel 应注册到 NIO EventLoop。第三，如果当前线程不是目标 EventLoop，真正的 `register0()` 会被封装成任务投递过去。

`register0()` 会调用传输实现的 `doRegister()`。对 NIO Channel 而言，核心动作是把 JDK Channel 注册到 EventLoop 持有的 Selector：

`selectionKey = javaChannel().register(eventLoop().unwrappedSelector(), 0, this);`

注意初始 interestOps 是 `0`，不是马上关注 `OP_ACCEPT`。注册解决的是 Channel 与 Selector 的关联，真正读取兴趣事件会在 Channel Active 和 read 逻辑中逐步设置。附件 `this` 使 SelectionKey 就绪后能反查到对应的 Netty Channel。

## 6\. 注册成功会触发 Pipeline 生命周期事件

注册不仅是底层 Selector 操作，还会触发 Pipeline 事件。`register0()` 大致完成：

*   • 执行 `doRegister()`。
    
*   • 标记 `registered = true`。
    
*   • 调用 `pipeline.invokeHandlerAddedIfNeeded()`。
    
*   • Promise 成功。
    
*   • 触发 `pipeline.fireChannelRegistered()`。
    
*   • 若 Channel 已 Active，则触发 `fireChannelActive()` 或安排首次读取。
    

这就是为什么 Handler 的 `handlerAdded()`、`channelRegistered()`、`channelActive()` 存在明确时序。它们不是任意回调：

`handlerAdded     -> channelRegistered     -> channelActive     -> channelRead ...     -> channelInactive     -> channelUnregistered     -> handlerRemoved`

在服务端启动场景中，注册时通常还没有绑定端口，因此 Channel 尚未 Active。等后面的 bind 成功，状态从未激活变为激活，才触发 `channelActive`。

如果业务在 `handlerAdded()` 中假定连接已经可用，可能拿不到有效地址或错误发起写操作。需要使用哪一个生命周期回调，取决于逻辑依赖的是“Handler 已进入 Pipeline”“Channel 已注册线程”还是“连接已经激活”。

## 7. `doBind0()` 确保 bind 在 EventLoop 中执行

注册 Future 完成后，`doBind0()` 不直接调用底层 bind，而是：

`private static void doBind0(        final ChannelFuture regFuture,        final Channel channel,        final SocketAddress localAddress,        final ChannelPromise promise) {          channel.eventLoop().execute(() -> {        if (regFuture.isSuccess()) {               channel.bind(localAddress, promise).addListener(ChannelFutureListener.CLOSE_ON_FAILURE);           } else {               promise.setFailure(regFuture.cause());           }       });   }`

为什么已经知道注册成功，还要再次 `eventLoop().execute()`？因为调用 `bind()` 的线程通常是用户启动线程，而 Netty 希望 Channel 生命周期操作统一在 EventLoop 中串行执行。这样 bind、active 事件、后续 accept 之间不会因为多线程竞争而打乱顺序。

`channel.bind()` 会进入 Pipeline 的出站路径。默认从 TailContext 开始向 HeadContext 传播，最终由 HeadContext 调用 `unsafe.bind()`。这意味着 bind 和 write 一样，都是 Channel 的出站操作，也可以被 `ChannelOutboundHandler` 拦截。

在 `AbstractUnsafe.bind()` 中，Netty记录 bind 前后的 Active 状态：

`boolean wasActive = isActive();   try {       doBind(localAddress);   } catch (Throwable t) {       safeSetFailure(promise, t);       closeIfClosed();    return;   }      if (!wasActive && isActive()) {       invokeLater(() -> pipeline.fireChannelActive());   }   safeSetSuccess(promise);`

真正的平台调用落在 `NioServerSocketChannel.doBind()`，最终调用 JDK `ServerSocketChannel.bind(localAddress, backlog)`。到这里，端口才真正处于监听状态。

## 8\. ChannelFuture 为什么必须贯穿启动链

启动过程跨越用户线程与 Boss EventLoop，注册和绑定都可能异步完成，因此无法用普通返回值表达结果。`ChannelFuture` 让调用者既可以同步等待，也可以注册监听：

`ChannelFuture bindFuture = bootstrap.bind(8080);   bindFuture.addListener(f -> {    if (f.isSuccess()) {           log.info("server started: {}", f.channel().localAddress());       } else {           log.error("bind failed", f.cause());       }   });`

示例里的 `.sync()` 只是启动线程选择阻塞等待，并没有把 Netty 底层变成同步模型：

`ChannelFuture bindFuture = bootstrap.bind(8080).sync();   bindFuture.channel().closeFuture().sync();`

第一处 sync 等待端口绑定成功；第二处 sync 等待服务端 Channel 被关闭。真正的 I/O 仍然由 EventLoop 异步处理。

需要避免在 EventLoop 中调用可能等待同一 EventLoop 的 `sync()`。Netty 的 Promise 实现会尽力检测死锁，但架构上更正确的方式是使用 Listener 串联异步步骤。


## 9\. 启动失败应该按阶段定位

`bind()` 失败不能一概归因为“端口占用”。按调用链至少可以分成四类：

阶段

常见失败

排查方向

创建 Channel

反射构造失败、Native 库缺失

ChannelFactory、传输依赖、构造异常

初始化

Option 不支持、Handler 配置错误

`init()`

、自定义 ChannelInitializer

注册

EventLoop 已关闭、类型不兼容

Group 生命周期、NIO/Epoll 是否匹配

绑定

地址占用、权限不足、地址不可用

`BindException`

、端口和网卡配置

如果 Future 的 cause 是 `RejectedExecutionException`，问题往往不是端口，而是 EventLoopGroup 已经 shutdown，注册或 bind 任务无法提交。如果是 `ChannelPipelineException`，需要检查 Handler 是否可共享、初始化期间是否抛异常。如果是 Native Transport 初始化失败，则应确认分类器、操作系统和架构是否匹配。

还有一个容易忽略的问题：用户只调用 `bind()` 却不检查 Future。启动线程继续打印“启动成功”，实际端口并未监听。生产启动逻辑必须以 Future 成功为准，再对外报告 Ready。

## 10\. 从 bind 主链反推配置规则

理解源码后，许多配置规则不需要死记。

为什么 `option()` 和 `childOption()` 分开？因为前者在 `ServerBootstrap.init()` 中应用到父 Channel，后者由 `ServerBootstrapAcceptor` 在每次 Accept 后应用到子 Channel。

为什么 `childHandler()` 必填？因为监听 Channel 只负责产生新连接，真正的业务 Pipeline 要在每条子 Channel 创建后初始化。

为什么通常创建两个 EventLoopGroup？因为父 Channel 的 Accept 与子 Channel 的读写职责不同。小型服务可以复用同一个 Group，但职责仍然存在，性能隔离也会减弱。

为什么 bind Future 成功后才能接流量？因为成功意味着 Channel 已创建、初始化、注册并完成底层地址绑定，Pipeline 生命周期也进入 Active 阶段。

为什么优雅停机要关闭 EventLoopGroup，而不仅是关闭 ServerChannel？因为 ServerChannel 只停止接收新连接，已注册的子 Channel、任务队列、定时任务和 EventLoop 线程仍可能存活。

## 11\. 总结：注册先于绑定，是启动链的设计支点

`ServerBootstrap.bind()` 看似是入口，真正的设计支点却是 `initAndRegister()`。Netty 先创建 Channel 和 Pipeline，再为 Channel 确定 EventLoop，最后把 bind 投递到该 EventLoop。这个顺序建立了后续所有事件的线程边界。

可以把整个过程记成四句话：

1.  1\. ChannelFactory 创建运行时 Channel。
    
2.  2\. ServerBootstrap 把配置和 Acceptor 装进父 Pipeline。
    
3.  3\. EventLoopGroup 选择 EventLoop，并把 JDK Channel 注册到 Selector。
    
4.  4\. EventLoop 执行真正 bind，状态转为 Active，Future 完成。
    

下一篇将继续沿这条链向前：客户端完成 TCP 握手后，Boss EventLoop 如何把 `OP_ACCEPT` 转换成一个 `NioSocketChannel`，`ServerBootstrapAcceptor` 又如何把它交给 Worker EventLoop。那一步才是“监听服务端”变成“管理大量连接”的关键。

## 参考资料

1.  1. `AbstractBootstrap.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/AbstractBootstrap.java
    
2.  2. `ServerBootstrap.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/bootstrap/ServerBootstrap.java
    
3.  3. `AbstractChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/AbstractChannel.java
    
4.  4. `NioServerSocketChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/socket/nio/NioServerSocketChannel.java
    
5.  5\. Netty 4.1 用户指南：https://netty.io/wiki/user-guide-for-4.x.html

---

## 12. Netty 源码全景：一次请求如何穿过五大核心组件(源码系列第1篇) 12. Netty 源码全景：一次请求如何穿过五大核心组件(源码系列第1篇)

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489422&idx=1&sn=e86c40886c48e745b146d601829ed63f&chksm=eb6750f8dc10d9ee10e729d8d5114e0ceeabc9f79dce8830b4e8f40457361e5b76d78c847780

> Netty 的复杂并不来自 API 数量，而来自它把网络连接、线程调度、事件传播、内存管理和异步结果拆成了相互协作的对象。真正有效的源码阅读方式，是先抓住 `Channel`、`EventLoop`、`ChannelPipeline`、`ByteBuf`、`ChannelFuture` 五个核心抽象，再沿一次请求的生命周期观察它们如何接力。

很多人第一次阅读 Netty 源码，会从 `ServerBootstrap` 开始一路点进去。很快就会遇到 `ChannelFactory`、`ChannelConfig`、`Unsafe`、`EventLoopGroup`、`ChannelPromise`、`ChannelHandlerContext` 等几十个概念。每个类单独看都能理解，但放在一起就像走进一座没有地图的城市：知道每条街叫什么，却不知道自己为什么来到这里。

Netty 源码的正确打开方式不是“记住所有类”，而是先回答一个更朴素的问题：**一个 TCP 请求从网卡到达之后，Netty 到底做了哪些事情？**

如果把异常分支和协议细节先收起来，主路径可以压缩成一句话：

`EventLoop 从 Selector 得到就绪事件     -> Channel 从 Socket 读取字节到 ByteBuf     -> ChannelPipeline 把入站事件交给 Handler     -> 业务 Handler 产生响应     -> 出站 Pipeline 编码消息     -> Channel 把 ByteBuf 写回 Socket     -> ChannelFuture 通知异步操作结果`

这条链就是整个系列的主干。后续无论研究服务端启动、内存池、编解码、背压还是优雅停机，本质上都在解释这条主干的某一段。

本文源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 仓库：https://github.com/netty/netty
    
*   • 核心模块：`transport`、`buffer`、`codec`、`common`
    


## 1\. ServerBootstrap 是装配器，不是服务器本身

阅读 Netty 示例时，最显眼的对象通常是 `ServerBootstrap`：

`ServerBootstrap bootstrap = new ServerBootstrap();   bootstrap.group(bossGroup, workerGroup)       .channel(NioServerSocketChannel.class)       .childHandler(new ChannelInitializer<SocketChannel>() {        @Override        protected void initChannel(SocketChannel ch) {               ch.pipeline().addLast(new MyDecoder());               ch.pipeline().addLast(new BusinessHandler());           }       });      ChannelFuture bindFuture = bootstrap.bind(8080).sync();`

这段代码很容易制造一个错觉：好像 `ServerBootstrap` 持有端口、监听连接、读取数据并执行 Handler。实际上它更像 Spring 中的 Bean 装配器。它保存启动参数，并在 `bind()` 时把这些参数应用到真正的运行时对象上。

它主要完成五类配置：

配置

作用对象

典型内容

`group(parent, child)`

EventLoopGroup

Boss 接入线程组与 Worker I/O 线程组

`channel(...)`

ServerChannel

选择 NIO、Epoll、KQueue 等传输实现

`option(...)`

父 Channel

`SO_BACKLOG`

、接收缓冲等监听端配置

`childOption(...)`

子 Channel

`TCP_NODELAY`

、`SO_KEEPALIVE` 等连接配置

`handler/childHandler`

Pipeline

父 Channel 与每条连接的处理器

关键区别是：`ServerBootstrap` 在启动阶段最重要，但服务运行起来后，它不会参与每一次数据读写。监听端口的是 `NioServerSocketChannel`，接收连接的是 Boss `EventLoop`，处理连接数据的是 Worker `EventLoop`，业务逻辑则沿每条连接自己的 `ChannelPipeline` 传播。

因此，排查运行时延迟时盯着 Bootstrap 配置只能解决一部分问题。连接建立后的绝大多数性能问题，都要进入 Channel、EventLoop、Pipeline 和 Buffer 这一层观察。

## 2\. Channel 是连接的对象化表达，也是所有能力的聚合根

Netty 的 `Channel` 常被翻译成“通道”，但这个词太轻，容易让人误以为它只是一个读写接口。更准确的理解是：**Channel 是一条网络连接在 Netty 运行时中的对象化表达。**

一条 Channel 至少聚合了以下信息：

*   • 底层 JDK 或 Native Socket。
    
*   • 自己归属的 `EventLoop`。
    
*   • 这条连接的 `ChannelPipeline`。
    
*   • 连接状态和地址信息。
    
*   • `ChannelConfig` 与各种 Option。
    
*   • 写侧的 `ChannelOutboundBuffer`。
    
*   • 用于执行底层操作的 `Unsafe`。
    

`Channel` 接口对用户暴露安全、稳定的操作，例如 `write()`、`flush()`、`close()`、`pipeline()` 和 `eventLoop()`。真正直接操作底层传输的能力被收进内部 `Unsafe` 接口。这不是说底层操作“不安全”到不能用，而是 Netty 有意把用户扩展面和传输实现面隔离开：

`public interface Channel extends AttributeMap, ChannelOutboundInvoker, Comparable<Channel> {       EventLoop eventLoop();       Channel parent();       ChannelConfig config();    boolean isOpen();    boolean isActive();       ChannelPipeline pipeline();       Unsafe unsafe();   }`

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/Channel.java`
    
*   • 类：`io.netty.channel.Channel`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/Channel.java
    

为什么要把这么多能力挂在 Channel 上？因为网络事件天然以连接为边界。读到的数据属于某条连接，Pipeline 是某条连接的，写缓冲积压也是某条连接的，关闭和异常同样只影响某条连接。Channel 因而成为查找运行时上下文的入口。

这里还要区分两种 Channel：

1.  1. `NioServerSocketChannel`：代表监听端口的父 Channel，关注 `OP_ACCEPT`。
    
2.  2. `NioSocketChannel`：代表一条已建立的 TCP 连接，关注 `OP_READ`、`OP_WRITE`、`OP_CONNECT`。
    

服务端只有一个监听 Channel，却可能有几十万条子 Channel。`option()` 配置父 Channel，`childOption()` 配置子 Channel，正是因为它们承担的职责不同。

## 3\. EventLoop 的本质不是线程池，而是“连接与单线程执行器”的绑定

很多教程把 `NioEventLoopGroup` 简化为线程池，这个说法方便入门，但不足以解释 Netty 的并发语义。更准确地说：

*   • `EventLoopGroup` 是一组 EventLoop 的管理和选择器。
    
*   • `EventLoop` 是一个长期运行的单线程事件执行器。
    
*   • Channel 注册后，通常会在生命周期内固定绑定一个 EventLoop。
    

这一点决定了 Netty 最重要的线程安全保证：**同一条 Channel 上的大多数 I/O 事件和 Pipeline 回调，会被同一个 EventLoop 串行执行。**

假设同一连接先后收到两个数据包 A、B，EventLoop 不会同时在两个线程中调用该 Channel 的 `channelRead()`。它会按事件循环顺序处理。这让很多 Handler 可以避免围绕连接状态加锁。例如协议解析器可以把半包保存在成员变量里，因为对同一 Channel 的回调天然串行。

但“单线程”不等于“整个 Netty 只有一个线程”。一个 Worker Group 通常有多个 EventLoop，每个 EventLoop 管理一批 Channel：

`Worker EventLoop 1 -> Channel A, D, G ...   Worker EventLoop 2 -> Channel B, E, H ...   Worker EventLoop 3 -> Channel C, F, I ...`

这种绑定同时带来优势和风险。

优势是减少锁竞争、保持事件顺序、提高 CPU Cache 局部性。风险是某个 Handler 一旦在 EventLoop 中执行阻塞操作，不只会拖慢当前请求，还会拖慢同一 EventLoop 管理的全部连接。数据库慢查询、同步 HTTP 调用、`Thread.sleep()`、大文件计算都可能让一组看似无关的连接一起抖动。

所以“业务 Handler 不要阻塞 EventLoop”不是一句泛泛的性能建议，而是由 Channel 与 EventLoop 的绑定关系直接推导出的稳定性约束。

## 4\. ChannelPipeline 不是过滤器列表，而是一条带方向的事件总线

每个 Channel 创建时都会拥有自己的 `ChannelPipeline`。默认实现 `DefaultChannelPipeline` 内部维护一条双向链表，链表两端是系统节点 `HeadContext` 和 `TailContext`，用户添加的 Handler 会被包装成 `ChannelHandlerContext` 插入其中。

为什么不直接存 `List<ChannelHandler>`？因为 Netty 不只需要“按顺序调用 Handler”，还需要解决四个问题：

1.  1\. 入站事件与出站事件的传播方向相反。
    
2.  2\. 每个 Handler 可能绑定不同的执行器。
    
3.  3\. Handler 需要从当前位置继续传播事件。
    
4.  4\. Pipeline 需要支持运行时动态添加和删除节点。
    

`ChannelHandlerContext` 因此非常关键。它既持有 Handler，也持有前后节点、所属 Pipeline、执行器和事件传播能力。Handler 是业务逻辑，Context 是 Handler 在某条 Pipeline 中的运行时座位。

入站事件通常从 Head 向 Tail：

`Head -> Decoder -> AuthHandler -> BusinessHandler -> Tail`

出站事件通常从 Tail 向 Head：

`Tail -> Business outbound -> Encoder -> Head -> Socket`

这解释了一个常见疑问：为什么解码器通常放前面，编码器的执行方向却像“倒着走”？因为网络读取发生在 Head，入站数据自然向后传播；业务写出通常从当前 Context 或 Pipeline 尾部发起，出站事件向前寻找能处理它的节点，最终到 Head 执行底层写操作。

Pipeline 还有一个非常实用的隔离效果：Handler 可以只关心自己处理的事件。解码器只把字节变成消息，鉴权 Handler 只判断身份，业务 Handler 只处理领域逻辑，编码器只负责把响应变回字节。复杂协议因此能够以组合而不是继承的方式构建。

## 5\. ByteBuf 是性能设计的中心，不只是 ByteBuffer 的替代品

如果只把 `ByteBuf` 理解为“更好用的 `ByteBuffer`”，会漏掉 Netty 内存设计最重要的部分。`ByteBuf` 同时承担四个角色：

*   • 数据容器：保存网络读写的字节。
    
*   • 读写游标模型：`readerIndex` 与 `writerIndex` 分离。
    
*   • 内存视图：`slice()`、`duplicate()`、`compositeBuffer()` 减少复制。
    
*   • 生命周期对象：通过引用计数决定何时释放或归还内存池。
    

JDK `ByteBuffer` 使用一个 `position` 同时服务读写，常常需要 `flip()` 切换模式。`ByteBuf` 把可读区、可写区和已废弃区明确区分：

`0 -------- readerIndex -------- writerIndex -------- capacity   | 已读区域 |      可读区域       |      可写区域       |`

更重要的是，Netty 默认可以使用池化直接内存。直接内存减少了某些 Socket I/O 场景下的额外复制，池化则减少频繁申请和释放大块内存的成本。但性能收益伴随着更严格的所有权要求：谁最后消费 ByteBuf，谁通常就要负责释放；如果把对象异步传到别处，需要先 `retain()`；如果创建共享视图，要理解它是否共享引用计数。

这也是 Netty 最常见、最隐蔽的线上问题之一：业务功能完全正确，压测一段时间后直接内存持续增长，最终出现 `OutOfDirectMemoryError`。根因不是 GC 调优，而是某条异常分支没有 `release()`，或者异步任务在引用计数归零后继续访问 Buffer。

## 6\. ChannelFuture 把“发起操作”和“操作完成”彻底分离

网络操作天然是异步的。`bind(8080)` 被调用时，端口不一定已经完成绑定；`connect()` 返回时，TCP 握手不一定完成；`writeAndFlush()` 返回时，数据也不一定已经进入对端应用。

Netty 使用 `ChannelFuture` 表示这些操作的未来结果：

`ChannelFuture future = channel.writeAndFlush(message);   future.addListener(f -> {    if (!f.isSuccess()) {           log.error("send failed", f.cause());       }   });`

这里最容易犯的错误，是把“方法已返回”当成“操作已成功”。例如：

`channel.writeAndFlush(msg);   ReferenceCountUtil.release(msg); // 可能提前释放`

如果消息所有权已经交给 Netty，通常不应再由调用方立即释放。又例如在 EventLoop 内部调用 `future.sync()` 等待同一个 EventLoop 才能完成的操作，可能制造死锁或至少触发 Netty 的阻塞保护。

`ChannelPromise` 是可写的 Future，由执行操作的一方设置成功或失败；`ChannelFuture` 是读取结果的视图，由调用方监听。这个区分让异步完成事件可以沿 Pipeline、EventLoop 和调用线程安全传播。

## 7\. 一次请求的端到端接力

现在把五个核心对象串起来。假设客户端向 Netty 服务端发送一个带长度字段的二进制请求。

第一步，TCP 连接建立。Boss EventLoop 监听 `NioServerSocketChannel` 的 `OP_ACCEPT`，收到就绪事件后调用 JDK `accept()` 创建 `SocketChannel`，Netty 把它包装成 `NioSocketChannel`。

第二步，连接注册。`ServerBootstrapAcceptor` 为新 Channel 应用 `childHandler`、`childOption` 和属性，然后把它注册到 Worker EventLoop。注册完成后，这条连接通常固定由该 Worker 处理。

第三步，读事件到达。Worker EventLoop 的 Selector 返回 `OP_READ`，调用 Channel 的 Unsafe 读取数据。`RecvByteBufAllocator` 决定本轮分配多大的 ByteBuf，底层 Socket 把字节写入 ByteBuf 的可写区域。

第四步，入站传播。Channel 触发 `pipeline.fireChannelRead(byteBuf)`。长度字段解码器先判断数据是否足够组成完整帧；如果只是半包，就把字节保留在累积缓冲区；如果完整，就切出一帧向后传播。

第五步，业务处理。业务 Handler 收到的不再是任意字节，而是协议消息。它执行业务逻辑，构造响应并调用 `ctx.writeAndFlush(response)`。

第六步，出站传播。出站事件从当前 Context 向 Head 方向传播。Encoder 把响应对象编码成 ByteBuf，HeadContext 最终调用 Channel Unsafe，把消息加入 `ChannelOutboundBuffer` 并尝试写入 Socket。

第七步，异步完成。如果一次没有写完，Netty 注册 `OP_WRITE`，等 Socket 再次可写时继续发送。全部写出后，对应 Promise 完成，业务注册的 Listener 被通知。


这条时序里有三个值得特别记住的事实：

1.  1\. 业务 Handler 不直接读取 Socket，它接收 Pipeline 传播的事件。
    
2.  2. `writeAndFlush()` 不等于数据已经到达客户端，它只是发起异步写。
    
3.  3\. 同一 Channel 的事件串行，不代表不同 Channel 互不影响；它们可能共享同一个 EventLoop。
    

## 8\. 源码分层决定了阅读顺序

Netty 仓库模块很多，但前 10 篇主要围绕四个模块：

模块

关注点

代表类

`transport`

Channel、EventLoop、Pipeline、Bootstrap、NIO

`AbstractChannel`

、`NioEventLoop`

`buffer`

ByteBuf、Allocator、池化内存

`PooledByteBufAllocator`

`codec`

字节与消息转换、协议帧处理

`ByteToMessageDecoder`

`common`

Future、Promise、并发队列、工具

`DefaultPromise`

推荐的源码阅读方式是“纵向主链 + 横向抽象”。

先纵向走通一次服务端请求：`bind()`、Accept、Register、Read、Pipeline、Write。走通后再横向比较接口与实现，例如 `Channel` 与 `AbstractChannel`，`EventLoop` 与 `NioEventLoop`，`ByteBuf` 与池化实现。反过来如果一开始就研究继承树，很容易在大量模板方法和平台分支中迷路。

还要刻意区分三类方法：

*   • 用户 API：例如 `Channel.writeAndFlush()`。
    
*   • Pipeline 传播方法：例如 `ctx.write()`、`fireChannelRead()`。
    
*   • 传输实现方法：例如 `doReadBytes()`、`doWrite()`。
    

它们可能都叫“write”或“read”，但职责完全不同。API 发起操作，Pipeline 负责寻找处理节点，底层方法才执行系统调用。

## 9\. 这套架构最容易引发的四类线上问题

理解架构最终要回到排障。Netty 线上问题大多能映射到以下四类边界。

第一类是 EventLoop 被阻塞。表现为一批连接同时延迟升高、定时任务延迟、心跳误判超时。检查 Handler 是否执行同步 RPC、数据库查询、锁等待或大计算，并结合线程栈确认 EventLoop 停在哪里。

第二类是 ByteBuf 生命周期错误。泄漏时直接内存持续增长，开启 ResourceLeakDetector 后出现访问记录；提前释放时则出现 `IllegalReferenceCountException`。重点检查异常分支、异步转交、Decoder 产出和自定义 Message 是否持有 Buffer。

第三类是写缓冲失控。慢客户端或网络拥塞使 `ChannelOutboundBuffer` 积压，`isWritable()` 变为 false。如果业务仍无限生产消息，最终会把内存耗尽。需要监听 `channelWritabilityChanged`，并把背压传回生产者。

第四类是 Pipeline 传播中断。某个入站 Handler 忘记 `ctx.fireChannelRead(msg)`，后续 Handler 永远收不到消息；某个分支吞掉异常却不释放 Buffer，也会形成泄漏。Pipeline 的自由度很高，因此所有权和传播责任必须明确。

## 10\. 建立源码地图后，再进入细节

如果只记住本文一个结论，我希望是：**Netty 不是一个“封装了 Selector 的网络库”，而是一套围绕 Channel 构建的单线程事件运行时。**

`ServerBootstrap` 负责装配，Channel 表达连接，EventLoop 提供串行执行环境，Pipeline 组织事件处理，ByteBuf 承载数据，Future/Promise 表达异步结果。它们不是六个孤立概念，而是一次请求的六个接力棒。

接下来第 2 篇会从最熟悉的 `bootstrap.bind(8080)` 开始，拆解 Channel 创建、Pipeline 初始化、EventLoop 注册和真正端口绑定之间的先后关系。理解这条启动链之后，ServerBootstrap 的各种配置项就不再是需要死记的 API，而会变成可以从运行时对象模型自然推导出的设计。

## 参考资料

1.  1\. Netty 官方仓库：https://github.com/netty/netty
    
2.  2\. Netty 4.1 用户指南：https://netty.io/wiki/user-guide-for-4.x.html
    
3.  3. `Channel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/Channel.java
    
4.  4. `DefaultChannelPipeline.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPipeline.java
    
5.  5. `NioEventLoop.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    
6.  6. `ByteBuf.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/buffer/src/main/java/io/netty/buffer/ByteBuf.java

---

## 11. Netty内存管理深度解析：从ByteBuf到内存池的设计本质 11. Netty内存管理深度解析：从ByteBuf到内存池的设计本质

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489240&idx=1&sn=f83e0a6b23ce15e0bd21b3ef1f371257&chksm=eb6751aedc10d8b8173a9fc018a4894c24a6d7bbca13482164b7a2acc8ee087407ebaacfc0fe

> **核心观点**：Netty内存管理的核心不是"申请一块内存"这么简单，而是围绕高并发网络IO做的一整套工程设计：用`ByteBuf`替代`ByteBuffer`解决读写体验问题，用直接内存降低IO拷贝成本，用内存池降低频繁分配释放的开销，再用引用计数把堆外内存的生命周期交还给程序员控制。

如果你只把Netty的内存管理理解成`ByteBuf`的API使用，很容易停留在表面。真正线上出问题的时候，通常不是不会`writeBytes()`，而是这些问题：

*   • 为什么用了直接内存，JVM堆看起来不高，进程却被系统杀掉？
    
*   • 为什么压测一段时间后延迟越来越高？
    
*   • 为什么`LEAK: ByteBuf.release()`日志偶尔出现，却很难复现？
    
*   • 为什么`slice()`出来的对象释放后，原始`ByteBuf`也不能用了？
    

这些问题背后，都指向同一个主题：**Netty把内存管理从JVM GC的一部分，变成了网络框架自己的性能系统。**

* * *

## 1\. 为什么Netty要自己做内存管理？

Java原生NIO已经有`ByteBuffer`，为什么Netty还要设计`ByteBuf`？

原因主要有三点。

第一，`ByteBuffer`只有一个`position`指针，读写切换依赖`flip()`，使用上非常容易出错。Netty的`ByteBuf`拆成`readerIndex`和`writerIndex`，读和写互不干扰，更适合网络协议解析。

第二，网络IO大量使用直接内存。直接内存不在JVM堆里，读写Socket时可以减少一次堆内到堆外的拷贝，但它的申请释放成本更高。如果每次收发消息都重新申请，性能会被拖垮。

第三，高并发连接下，小对象内存分配非常频繁。一个长连接服务里，心跳包、协议头、业务包都可能产生大量短生命周期`ByteBuf`。如果不池化，GC和系统调用都会成为瓶颈。

所以Netty的思路是：

`更好用的缓冲区模型 + 更少的内存拷贝 + 更少的分配释放 + 可控的生命周期`

这就是Netty内存管理的主线。

* * *

## 2\. Netty内存管理全景

先看一张图，把几个核心概念放到一起。


> **图1**：Netty内存管理不是单个`ByteBuf`对象，而是从Channel读写、ByteBuf抽象、Allocator分配器到底层内存池的完整链路。

从使用者视角看，我们主要接触的是`ByteBuf`：

`ByteBuf buf = ctx.alloc().buffer();   buf.writeBytes(data);   ctx.writeAndFlush(buf);`

但这行`ctx.alloc().buffer()`背后并不简单。它会通过`ByteBufAllocator`决定：

*   • 分配堆内存还是直接内存；
    
*   • 使用池化还是非池化；
    
*   • 从哪个线程本地缓存拿；
    
*   • 是否从`PoolArena`、`PoolChunk`、`PoolSubpage`中切一块内存出来。
    

这也是为什么Netty性能好：它不是每次都向操作系统要内存，而是先在自己的内存池里周转。

从Netty 4.2的API文档看，`ByteBufAllocator`已经不只是"分配ByteBuf的接口"，而是把几种分配策略都抽象出来：`PooledByteBufAllocator`负责池化复用，`UnpooledByteBufAllocator`负责直接申请，`AdaptiveByteBufAllocator`则会根据历史分配情况调整容量。这个变化说明一件事：**内存分配策略本身，已经成为Netty性能模型的一部分。**

* * *

## 3\. ByteBuf：读写模型的核心抽象

`ByteBuf`最重要的设计，是把一块内存划分成三个区域：

`discardable bytes | readable bytes | writable bytes   0        readerIndex        writerIndex        capacity`

含义如下：

区域

范围

含义

已读区域

`[0, readerIndex)`

已经消费过的数据

可读区域

`[readerIndex, writerIndex)`

可以被读取的数据

可写区域

`[writerIndex, capacity)`

可以继续写入的位置

这套模型比`ByteBuffer`更适合协议解析。比如一个TCP包里可能只到了一半数据，Decoder可以先判断`readableBytes()`够不够，不够就返回，等下一次数据到来后继续解析。

另外要注意两类方法：

方法类型

是否移动索引

示例

`read*`

 / `write*`

会

`readInt()`

、`writeBytes()`

`get*`

 / `set*`

不会

`getByte()`

、`setInt()`

这个差异非常关键。协议解析时，如果只是探测魔数、长度字段，应该优先使用`get*`，确认完整后再用`read*`推进索引。

* * *

## 4\. 堆内存、直接内存和复合缓冲区

Netty里常见的`ByteBuf`可以分成三类：

类型

代表实现

优点

缺点

适用场景

Heap ByteBuf

`UnpooledHeapByteBuf`

受GC管理，访问数组方便

Socket IO前可能多一次拷贝

业务处理、临时小对象

Direct ByteBuf

`PooledDirectByteBuf`

更适合网络IO，减少拷贝

分配释放成本高，泄漏排查难

高吞吐网络读写

Composite ByteBuf

`CompositeByteBuf`

逻辑合并多个Buffer，减少拷贝

使用和释放更复杂

协议拼装、零拷贝组合

直接内存并不是银弹。它的价值主要在IO边界：从Socket读到直接内存，或者把直接内存写到Socket，可以减少JVM堆与Native内存之间的数据复制。

但直接内存也有代价：

1.  1\. 不受普通堆内存监控直观展示；
    
2.  2\. 分配释放成本比堆内存高；
    
3.  3\. 生命周期依赖引用计数，泄漏后GC不一定及时救你；
    
4.  4\. 需要关注`-XX:MaxDirectMemorySize`。
    

所以Netty才需要内存池。直接内存适合网络IO，但必须配合池化，才适合高并发场景。

* * *

## 5\. PooledByteBufAllocator：内存池到底怎么工作？

Netty的池化分配器核心是`PooledByteBufAllocator`。它背后的思想和操作系统内存分配器很像：提前申请大块内存，再按不同规格切成小块复用。

关键结构可以这样理解：

层级

作用

类比

`PoolArena`

管理一组内存区域

一个仓库

`PoolChunk`

大块连续内存

仓库里的一排货架

`Page`

Chunk中的基础页

货架上的格子

`PoolSubpage`

小规格内存切片

格子里的小盒子

Thread Cache

线程本地缓存

工位旁边的常用工具箱

一次小内存申请，大概会走这样的路径：

`当前线程缓存 → PoolArena → PoolChunk → Page/Subpage → 返回 ByteBuf`


> **图2**：池化分配优先尝试线程缓存，未命中才进入`PoolArena`，再从`PoolChunk`、`Page`、`PoolSubpage`里切分可复用内存。

线程缓存非常重要。Netty的EventLoop通常是固定线程处理固定Channel，内存申请和释放也集中在同一个线程上。这样每个EventLoop都有机会复用自己的缓存，减少竞争。

这也是Netty喜欢"少量固定线程 + 非阻塞IO"的原因之一：线程模型稳定，内存缓存才更容易命中。

### 5.1 分配不是直接new，而是先规格化

当你申请一个`ByteBuf`时，Netty不会简单按原始容量分配。它会先把容量规格化。比如你申请几十字节的小Buffer，底层可能会映射到一个固定的小规格；申请几KB、几十KB时，会走更大的规格；再大一些时，可能直接走normal或huge路径。

很多资料会把这个路径概括为：

`Tiny / Small / Normal / Huge`

不同Netty版本内部实现细节会调整，但思想不变：**小对象尽量切分复用，大对象尽量减少碎片，超大对象避免把内存池拖垮。**

为什么要规格化？因为如果完全按用户申请大小分配，内存池会很快碎片化。网络包大小通常并不固定，可能这次是37字节，下次是41字节，再下次是128字节。如果每种大小都精确分配，复用率会很差。规格化牺牲一点点空间，换来更高的复用效率。

### 5.2 PoolArena解决的是竞争问题

`PoolArena`可以理解成一组内存池管理器。为什么不是全局一个池？

因为Netty是高并发网络框架，如果所有EventLoop线程都去竞争一个全局内存池，锁竞争会非常明显。多个Arena可以把竞争打散，线程会尽量绑定到某个Arena上，释放时也优先回到对应缓存。

这和数据库连接池、线程池的思路很像：不是没有池就不能工作，而是高并发时，**池的分组和局部性决定了稳定性**。

### 5.3 PoolChunk和PoolSubpage解决的是碎片问题

`PoolChunk`是一大块连续内存，适合切分较大的Buffer；`PoolSubpage`负责把Page继续切成更小的块，适合小对象复用。

可以把它想成酒店房间管理：

*   • 大客户直接安排一整层或一整间大房；
    
*   • 小客户安排床位或工位；
    
*   • 空出来后不是拆掉房子，而是登记可复用。
    

Netty的内存池本质上就是在做这件事：**把昂贵的系统级内存申请，变成框架内部的分配账本管理。**

* * *

## 6\. 引用计数：Netty内存管理最容易踩坑的地方

池化和直接内存解决了性能问题，但也带来了生命周期问题。Netty不能完全依赖GC判断一块堆外内存什么时候可以复用，于是引入了引用计数。


> **图3**：`ByteBuf`默认`refCnt = 1`，跨线程或异步持有时需要`retain()`，使用完成后必须`release()`；泄漏排查要同时看所有权和异常分支。

基本规则很简单：

`ByteBuf buf = ctx.alloc().buffer(); // refCnt = 1   buf.retain();                       // refCnt = 2   buf.release();                      // refCnt = 1   buf.release();                      // refCnt = 0，归还内存池`

但真正难的是所有权。

在Netty里，一般可以按这几条规则判断：

1.  1. **谁最后消费，谁负责释放。**
    
2.  2. **向后传递后，不要再释放。**
    
3.  3. **不向后传递，就必须自己释放。**
    
4.  4. **跨线程、异步保存、延迟使用，必须先`retain()`。**
    
5.  5. **`slice()`、`duplicate()`共享底层内存和引用计数，不是独立拷贝。**
    

举个典型错误：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    ByteBuf buf = (ByteBuf) msg;    if (buf.readableBytes() < 4) {        return; // 错误：没有继续传播，也没有释放       }       ctx.fireChannelRead(buf); // 传递后当前Handler不再拥有释放责任   }`

正确写法应该是：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {    ByteBuf buf = (ByteBuf) msg;    if (buf.readableBytes() < 4) {           buf.release();        return;       }       ctx.fireChannelRead(buf);   }`

如果使用`SimpleChannelInboundHandler<ByteBuf>`，默认会在`channelRead0`执行后自动释放消息。这很方便，但也容易出现另一个坑：你把`ByteBuf`保存到异步任务里，方法返回后它已经被释放了。

`protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {       msg.retain();       executor.submit(() -> {        try {               process(msg);           } finally {               msg.release();           }       });   }`

这就是Netty内存管理里最重要的一句话：**引用计数不是API细节，而是所有权协议。**

### 6.1 Derived Buffer最容易误判所有权

`slice()`、`duplicate()`、`readSlice()`这类方法不会复制底层内存，它们只是创建一个新的视图。视图和原始`ByteBuf`共享同一块内存，也共享引用计数。

这有两个后果：

第一，性能很好。因为它没有真实拷贝，适合协议头、消息体拆分。

第二，风险也很高。因为你以为拿到了一个"新对象"，实际上拿到的是同一块内存的另一个入口。如果原始Buffer被释放，派生Buffer也不能再安全使用。

如果派生Buffer需要跨方法、跨线程、异步保存，应该使用`retainedSlice()`或手动`retain()`，并确保最终`release()`。

`ByteBuf frame = in.readRetainedSlice(length);   executor.submit(() -> {    try {           handle(frame);       } finally {           frame.release();       }   });`

### 6.2 Inbound和Outbound的释放责任不一样

Inbound场景里，消息从底层Socket进来，经过Pipeline逐层向后传递。某个Handler如果截断了消息，就要释放；如果继续`fireChannelRead()`，就把所有权交给下游。

Outbound场景更容易被忽略。你调用`ctx.writeAndFlush(buf)`后，通常不应该再手动释放这个`buf`，因为它已经交给Netty的出站流程。Netty在写出完成后会处理释放。如果你提前释放，可能出现`IllegalReferenceCountException`；如果写失败路径自己又retain过，就要保证异常分支释放。

所以判断责任时，不要只问"这个ByteBuf在哪里创建"，而要问：**当前Handler是否还拥有它的最后消费权。**

* * *

## 7\. 内存泄漏怎么排查？

Netty提供了`ResourceLeakDetector`，用于检测`ByteBuf`没有正确释放的情况。常见级别包括：

级别

含义

适用场景

`DISABLED`

关闭检测

极致性能压测，不建议长期使用

`SIMPLE`

低成本采样检测

线上默认可接受

`ADVANCED`

记录更多访问路径

预发、问题定位

`PARANOID`

每个对象都检测

本地复现、专项排查

可以通过JVM参数开启：

`-Dio.netty.leakDetection.level=advanced`

如果出现泄漏日志，不要只看"哪里创建了ByteBuf"，还要重点看它经过了哪些Handler。泄漏通常发生在分支路径：

*   • 校验失败直接返回；
    
*   • 异常分支没有`release()`；
    
*   • 自定义Decoder中读取半包后丢失引用；
    
*   • 异步任务跨线程使用没有成对`retain/release`；
    
*   • `CompositeByteBuf`添加组件后没有搞清所有权转移。
    

线上排查时，我建议同时观察：

`进程RSS、DirectMemory、GC日志、Netty leak日志、连接数、入站/出站流量`

只盯JVM堆，很容易漏掉直接内存问题。

* * *

## 8\. 实战建议：怎么写不容易出问题？

最后给一组实践建议。

**第一，业务代码尽量少直接持有ByteBuf。**  
在解码层尽早把`ByteBuf`转成业务对象，业务层处理普通POJO。ByteBuf越往业务层扩散，生命周期越难控制。

**第二，自定义Handler要明确是否消费消息。**  
如果消费了消息，不再向后传递，就释放；如果传给下一个Handler，就不要释放。

**第三，异步使用必须成对retain/release。**  
任何跨线程、延迟执行、缓存保存，都要先`retain()`，并在`finally`里`release()`。

**第四，大对象和组合对象要特别谨慎。**  
`CompositeByteBuf`能减少拷贝，但组件越多，释放逻辑越复杂。除非真的需要零拷贝组合，否则不要为了"高级"而使用。

**第五，压测时单独观察直接内存。**  
建议配置清楚`-XX:MaxDirectMemorySize`，并在监控里区分堆内存、堆外内存和进程RSS。

**第六，排查泄漏时提高检测级别。**  
线上可以保持`SIMPLE`，预发或本地复现时切到`ADVANCED`或`PARANOID`，定位完再恢复。

* * *

## 9\. 总结

Netty内存管理可以用一条链路串起来：

`ByteBuf读写模型 → 堆/直接内存选择 → 池化分配 → 线程本地缓存 → 引用计数释放 → 泄漏检测`

`ByteBuf`解决的是使用体验和协议解析问题；直接内存解决的是IO拷贝问题；内存池解决的是频繁分配释放问题；引用计数解决的是堆外内存生命周期问题。

所以，Netty内存管理的本质不是"更快的Buffer"，而是**为高并发网络IO定制的一套内存生命周期系统**。

如果你要写稳定的Netty程序，真正要记住的不是某个API，而是这三句话：

1.  1. **读写索引决定数据边界。**
    
2.  2. **Allocator决定分配效率。**
    
3.  3. **引用计数决定生命周期。**
    

把这三件事搞清楚，Netty的内存问题就不再是一团黑盒。

* * *

参考资料：

*   • Netty Wiki：Reference counted objects https://netty.io/wiki/reference-counted-objects.html
    
*   • Netty API：ByteBuf https://netty.io/4.1/api/io/netty/buffer/ByteBuf.html
    
*   • Netty API：ByteBufAllocator https://netty.io/4.2/api/io/netty/buffer/ByteBufAllocator.html
    
*   • Netty API：PooledByteBufAllocator https://netty.io/4.2/api/io/netty/buffer/PooledByteBufAllocator.html

---

## 10. 【Netty】客户端端启动源码 10. 【Netty】客户端端启动源码

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485993&idx=1&sn=d794ff2a59a559c804f736d7130f5507&chksm=eb674d5fdc10c449fa5a1e90a9f59b994f0832f2f5f16b03ba26ba976da9a5fe5b8a7acc6547



前言

上一文[【Netty】服务端启动源码](http://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485927&idx=1&sn=b37feb04c36c679dabd1f6aa00b47766&chksm=eb674e91dc10c7873d8107f6c8681da8b3ea98a6635664457e62f41b2e9a22750ed4dfd30c5c&scene=21#wechat_redirect)中，详细学习了服务端启动源码，深入了解了Netty服务在启动过程中如何注册pipline，如何与jdk底层的channel绑定，本文继续学习下客户端如何与服务端建立连接。


示例代码

```
package com.xfc.netty.learning.netty.base;
```

从上述代码可以看出，Bootstrap作为客户端启动引导类，主要负责如下工作

•构建客户端线程EventLoopGroup•初始化`NioSocketChannel`，注意这里是客户端，所以不是`NioServerSocketChannel`•设置渠道参数，保持长连接SO\_KEEPALIVE为true•设置客户端消息处理器，注意，与使用 ServerBootstrap 不同，我们在这里不使用 childOption()，因为客户端 SocketChannel 没有父级Option。•通过connect()方法与服务端建立连接，而不是bind()了

与服务端启动核心源码类似，这里的入口方法是connect()，接下来看看它的逻辑

```
/**
```

上述代码为客户端连接服务端的核心流程，分别有如下功能

•初始化SocketChannel•注册SocketChannel•解析服务端地址•连接建立

```
final ChannelFuture initAndRegister() {
```

上面的初始化并注册流程与服务端类似，这是这里的目标不一样

•通过反射实例化NioSocketChannel（服务端是NioServerSocketChannel）•注册NioSocketChannel到选择器

```
@Override
```

通过空参构造创建NioSocketChannel，现在去看一下构造方法

```
/**
```

接着向下看newSocket()方法

```
private static SocketChannel newSocket(SelectorProvider provider) {
```

这一步是创建java的NioSocketChannel

```
/**
```

根据创建好的SocketChannel继续向父类传递，因为还需要初始化一些关键参数

```
/**
```

设置为非阻`ch.configureBlocking(false);`

继续看后面的注册逻辑`ChannelFuture regFuture = config().group().register(channel);`,直接看核心逻辑

```
private void register0(ChannelPromise promise) {
```

上述register0()方法的主要逻辑如下

•doRegister()调用注册逻辑,将当前Channel注册到选择器上•回调handlerAdd和channelRegistered方法•如果连接成功，则出发channelActive方法，并注册READ事件

接下来分析`doRegister()`中都做了什么

```
@Override
```

这个方法就是将NioSocketChannel注册到选择器上，ops为0代表暂时不注册任何事件。回到doResolveAndConnect方法，继续看住流程

```
private ChannelFuture doResolveAndConnect0(final Channel channel, SocketAddress remoteAddress,
```

从方法名称可以看出，这个方法主要有两个功能  

•地址解析•实际的连接操作

先看看地址是如何解析的

```
// 获取解析器
```

主要步骤如下

•获取解析器•远程地址解析•通过`SocketUtils`工具类解析ip或者域名，最终使用jdk自带的`java.net.InetAddress#getAllByName(java.lang.String)`h获取地址和域名信息

接下来分析连接操作，也就是doConnect方法

```
private static void doConnect(
```

这个方法获取前面实例化的NioSocketChannel示例，通过channle绑定的eventLoop发起异步连接调用，继续向下跟conect方法，这里没有配置localAddress因此会走第一个connect方法

!\[image-20210818112915068\](/Users/xingfei/Library/Application Support/typora-user-images/image-20210818112915068.png)

```
@Override
```

调用pipline的connect方法，继续跟

```
@Override
```

调用tail的connect方法

```
@Override
```

上述源码通过`findContextOutbound(MASK_CONNECT)`查找到出站Handler（这里实际上又teai转为head了），这里的MASK\_CONNECT为1024，然后继续调用invokeConenct方法走连接逻辑。这里分析下findContextOutbound方法

```
private AbstractChannelHandlerContext findContextOutbound(int mask) {
```

这个方法主要是从tail节点开始找outBound事件的节点，这里找到的是HeadContext也就是头节点。  

这里贴出HeadContext的类图，由图可知实现了ChannelOutboundHandler接口

!\[image-20210818115537178\](/Users/xingfei/Library/Application Support/typora-user-images/image-20210818115537178.png)

继续看connect逻辑

```
private void invokeConnect(SocketAddress remoteAddress, SocketAddress localAddress, ChannelPromise promise) {
```

上述方法完成如下逻辑  

•判断当前节点是否已经添加完成•如果添加完成则开始调用connect逻辑

继续进入`io.netty.channel.DefaultChannelPipeline.HeadContext#connect`查看连接逻辑

```
@Override
```

调用unsafe的connect方法，继续跟进，用debug可以看出这里用的NioSocketChannelUnsafe  

!\[image-20210818115931366\](/Users/xingfei/Library/Application Support/typora-user-images/image-20210818115931366.png)

继续深入`io.netty.channel.nio.AbstractNioChannel.AbstractNioUnsafe#connect`

```
public final void connect(
```

上述逻辑主要做了两个事情  

•调用doConnect方法建立连接•通过channel绑定的eventLoop创建一个定时任务，监控是否连接超时，如果连接超时则抛出ConnectTimeoutException

继续跟进doConnect方法，由于是客户端连接，这里是NioSocketChannel的doConnect方法，源码如下

```
protected boolean doConnect(SocketAddress remoteAddress, SocketAddress localAddress) throws Exception {
```

上述方法完成两个操作

•调用JDK的api发起连接操作•连接完成，则注册OP\_CONNECT事件

```
public static boolean connect(final SocketChannel socketChannel, final SocketAddress remoteAddress)
```

调用JDK的SocketChannel 建立连接，然后回到`io.netty.channel.nio.AbstractNioChannel.AbstractNioUnsafe#connect`方法，连接完成后调用fulfillConnectPromise()方法  

```
private void fulfillConnectPromise(ChannelPromise promise, boolean wasActive) {
```

连接成功后回调pipeline上的channelActive方法，到此连接建立完成


总结  

本文较粗略的分析了客户端连接服务端的代码，之所以说粗略，原因是有一部分非常核心的逻辑没有分析，就是`pipeline`，Netty中的`pipeline`是非常核心的组件。起到了数据管理，数据传输，同时也是提供给业务方自定义业务逻辑的关键组件。下一文将详细分析Netty中的pipeline。

---

## 9. 【Netty】服务端启动源码 9. 【Netty】服务端启动源码

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485927&idx=1&sn=b37feb04c36c679dabd1f6aa00b47766&chksm=eb674e91dc10c7873d8107f6c8681da8b3ea98a6635664457e62f41b2e9a22750ed4dfd30c5c


前言  

前面的Netty相关文章分别介绍了Netty中的一些核心概念，同时也是组成Netty的核心基础，有了相应的基础，本文将详细分析Netty服务端启动源码。

服务端源码分析  

## 示例代码

```
package com.xfc.netty.learning.netty.base;
```

从上述代码可以看出，`ServerBootstrap`作为Netty服务的启动引导器，因此我们的源码流程梳理从这里开始，由于上述示例中已经说明了每行关键代码的核心作用。这里就不再单独解释，只介绍下关键步骤。

1.绑定Netty服务的关键线程池`bossGroup`和`workerGroup`2.设置用于接受客户端连接的`channel`，这里是`NioServerSocketChannel`3.设置用于配置用户自定义`Handler`的`SocketChannel`4.设置服务端参数

1.option为设置接受客户端请求的`NioServerSocketChannel`的参数，可简单理解为`bossGroup`使用的参数2.childOption为设置客户端渠道的参数，可简单理解为`workerGroup`使用的参数

5.绑定端口并注册OP\_ACCEPT事件

bind方法分析

由示例代码一些列的初始化之后，最终调用了`b.bind(port).sync();`开始绑定端口，同时也是服务端启动的入口。下面为bind方法源码

```
/**
```

这个方法没做什么，通过`InetSocketAddress`构建了描述IP地址和主机名称的对象传入重载的bind方法，继续跟进,`InetSocketAddress`对象只传端口，则默认绑定本机ip，也可以通过其他构造方法传入指定ip地址

```
/**
```

这个方法主要作用是校验基本参数，然后调用核心启动方法doBind

```
private ChannelFuture doBind(final SocketAddress localAddress) {
```

doBind方法的主要功能如下：  

•通过`initAndRegister`异步初始化`channel`并注册 `channel`•根据异步初始化结果，如果调用完成`regFuture.isDone()`,则开始调用doBind0方法进行端口绑定流程•如果异步初始化未完成`!regFuture.isDone()`,则添加一个异步监听器，监听初始化结果，如果完成了,则开始调用doBind0方法进行端口绑定流程

**initAndRegister**，从名字知道这个方法用于初始化并且注册，具体初始化什么？注册什么呢？接着往下看

```
final ChannelFuture initAndRegister() {
```

initAndRegister主要功能说明  

•创建Channel对象，这里的Channel实际上就是构建ServerBoostStrap对象传入的NioServerSocketChannel类，这里先不展开•通过`init`初始化Channel•通过`register`注册Channel

创建Channel，`channel = channelFactory.newChannel();`分析，这里的`channelFactory`有两个实现类，通过debug看看使用的哪个，通过debug，可以看出使用的是ReflectiveChannelFactory，这里需要向上回顾一下这个Factory在哪里实例化的。


因为我们的bind方式是由ServerBootstrap调用作为入口，并且在构建ServerBootstrap的过程中传入了`NioServerSocketChannel.class`,因此猜测ReflectiveChannelFactory在这里实例化的。


点击channel方法，可以看出在这里实例化的

```
/**
```

下面继续看如何创建channel对象，代码入口 `channel = channelFactory.newChannel();`方法为io.netty.channel.ReflectiveChannelFactory#newChannel

```
@Override
```

可以看出通过反射创建了channel对象，这里的对象实际上就是NioServerSocketChannel对象，因为上面ReflectiveChannelFactory构造方法中传入的就是NioServerSocketChannel.class，到此创建channel对象就完成了。

这里有必要了解下NioServerSocketChannel的初始化过程，看看都做了什么

```
/**
```

这里的构造方法主要做如下事情

•注册事件配置•构造Nio的Channel和Netty的Channel配置类

```
private static ServerSocketChannel newSocket(SelectorProvider provider) {
```

上述方法主要是通过SelectorProvider创建ServerSocketChannel，底层实现为

```
public ServerSocketChannel openServerSocketChannel() throws IOException {
```

这里介绍下provider的实现，provider用于创建ServerSocketChannel，但是它会根据操作系统的不同创建不同的provider，代码如下

```
private static final SelectorProvider DEFAULT_SELECTOR_PROVIDER = SelectorProvider.provider();
```

继续向上跟构造方法

```
/**
```

可以看出这里配置了configureBlocking为false，这里同NIo的配置方式，需要告诉操作系统使用非阻塞模式。同时配置了关注的事件为OP\_ACCEPT

接下来看看怎么初始化Channel的。继续看io.netty.bootstrap.AbstractBootstrap#initAndRegister中的init方法调用逻辑，这里贴出代码片段，帮助代码定位

```
final ChannelFuture initAndRegister() {
```

init方法如下：

```
abstract void init(Channel channel) throws Exception;
```

init方法为AbstractBootstrap类中的实现的抽象方法，交由子类扩展实现，我们看ServerBootStrap类中实现的init方法

```
@Override
```

init方法实现逻辑较为复杂，主要可以分为如下两部分

•设置渠道参数•初始化服务端的请求处理器ServerBootstrapAcceptor添加到pipeline中

初始化渠道参数不需要细说，这里重点解释为什么要通过构建ChannelInitializer实例的方式往pipeline中添加ServerBootstrapAcceptor，主要是因为ChannelInitializer构建的实例会实现initChannel方法，在渠道注册完成后会回调这个方法。因为我们上面的init方法实际上还是在做服务启动的**准备工作**。

接下来分析initAndRegister方法中的调用注册逻辑`ChannelFuture regFuture = config().group().register(channel);`,这里贴出关键代码，便于回忆；

可以看出调用register方法之前，还有两个调用分别是config(),group(),这里的config方法是返回了ServerBootstrapConfig

```
@Override
```

ServerBootstrapConfig类主要是包装了一层ServerBootstrap，用于提供ServerBootstrap相关的配置管理，如获取handler，参数，属性等内容，这里不深究，继续看主要逻辑，接下来group()方法

```
public final EventLoopGroup group() {
```

从上述代码看出，返回的实际上就是示例代码中设置的bossGroup对象。终于到register方法了。这里调用register方法的时候也可以看到有4个实现类，因为示例代码使用的是NioEventLoopGroup类，因此直接找他的父类即可


从继承关系图可以看出，我们使用的实际上是MultithreadEventLoopGroup


继续debug到父类的register方法


看一看到这里调用了next()方法，然后真正调用register()方法，看看这个next()方法是什么

这里的next()方法主要是利用了初始化NioEventLoopGroup时构造方法中初始化的选择器 `chooser = chooserFactory.newChooser(children);`,这里选择器的主要作用根据规则选出处理当前channel的处理线程。可以看出这里使用的是`PowerOfTwoEventExecutorChooser`


进入io.netty.util.concurrent.DefaultEventExecutorChooserFactory.PowerOfTwoEventExecutorChooser#next可以看出，这里主要就是从workerGroup中选出一个EventLoop作为处理当前channel的处理线程,之后该channel的所有事件都由此EventLoop处理


继续回到io.netty.channel.MultithreadEventLoopGroup#register(io.netty.channel.Channel)

这里的next()方法返回的事NioEventLoop对象


NioEventLoop继承了SingleThreadEventLoop


继续跟进SingleThreadEventLoop中的register方法()

```
@Override
```

这里通过DefaultChannelPromise开始进行异步注册逻辑。最终通过unsafe的register()方法注册，继续跟register()方法

```
@Override
```

上述的核心逻辑，判断当前的eventLoop是否为当前线程，如果是的话调用register0()，否则通过eventLoop提交一个异步任务执行register0(),接着看register0()

```
private void register0(ChannelPromise promise) {
```

register0的作用主要2个  

•调用doResigter()注册Channel

    •回调注册相关的方法`handlerAdded()`和`channelRegistered()`，注意这里只是回调BossGroup注册的Handler，childHandler这里不会回调，这里回调了NettyBoosServerHandler的`handlerAdded()`和`channelRegistered()`


接下来看看doResigter()到底干了什么

```
@Override
```

doRegister()主要是将当前的Netty的NioScoketChannel绑定到Jdk的Channel的attach上，下次可以直接从jdk的Channel内获取到Netty的NioScoketChannel

接着回到doBind方法主流程中doBind0()流程

```
private static void doBind0(
```

这里比较简单，就是让当前channel绑定的EventLoop执行一个异步任务，在异步线程流程里调用channel.bind方法。同时添加一个监听器。监听器的作用就是判断绑定结果，如果失败就关闭当前channel，这里不再深究，下面分析bind()方法

```
public ChannelFuture bind(final SocketAddress localAddress, final ChannelPromise promise) {
```

这个方法主要是调用invokeBind()方法进行绑定逻辑。这里区分当前渠道执行器是否为当前渠道的EventLoop，如果是就用当前执行器执行，否责就开启异步任务，调用safeExecute()方法执行。下面看invokeBind()方法流程

```
private void invokeBind(SocketAddress localAddress, ChannelPromise promise) {
```

上面为继续调用端口绑定逻辑，此时还是Netty的代码逻辑，接着往下看

```
public final void bind(final SocketAddress localAddress, final ChannelPromise promise) {
```

上面这个方式主要做了两件事  

•调用doBind绑定端口•回调Handler的channelActive方法

下面继续看绑定逻辑

```
@SuppressJava6Requirement(reason = "Usage guarded by java version check")
```

上面这个方法就是调用JDK底层的端口绑定了，区分了Jdk版本，最终会调用到底层的native方法。

```
private static native void bind0(FileDescriptor fd, boolean preferIPv6,
```

static native void listen(FileDescriptor fd, int backlog) throws IOException;

上述方法就是绑定并监听端口了，接着回到上面的bind方法，绑定完端口后，开始回调Handler的channelActive方法()

```
if (!wasActive && isActive()) {
```

上面只贴出了部分代码，这里就是提交一个异步任务开始回调

```
private void invokeChannelActive() {
```

从这里会调用到HeadContext 中的channelActive方法

```
@Override
```

上面这个方法主要做了两件事

•执行pipline上的channelActive回调•然后注册OP\_ACCEPT事件（服务端端的bossGroup主要用户监听这个事件），所以这只启动流程的最后一步，就是注册OP\_ACCEPT事件

```
@Override
```

```
@Override
```

最终，经由readIfIsAutoRead调用read()方法到调用invokeRea(),最后调用到doBeginRead()方法开始注册OP\_ACCEPT事件，（）接下来看看`selectionKey.interestOps(interestOps | readInterestOp);`主要做了什么

```
public void translateAndSetInterestOps(int ops, SelectionKeyImpl sk) {
```

最终向通过translateAndSetInterestOps()方法向selector注册OP\_ACCEPT事件完成。到此服务端整个启动流程结束。

总结  

服务端启动主要包含如下流程

•通过不同平台下的provider创建Channel并在创建的过程中设置必要参数如configBlocking、pipline等•初始化用户接受客户端连接的Handler接收器ServerBootstrapAcceptor，本质为ChannelInboundHandlerAdapter子类•注册Channel到Jdk底层的Nio的Selector•通过Jdk底层的bind方法将端口绑定，同时回调channelActive。然后注册OP\_ACCEPT事件到Channel上，告知Channel处理OP\_ACCEPT事件

本文用不少的篇幅介绍了服务端的启动源码。可能有些地方分析有误，但无论如何，感觉收获颇丰。Netty启动流程中使用了大量的异步，在阅读源码或者debug时需要仔细看代码的线程是如何使用的。进一步说明了多线程、并发的重要性。今天到此为止。下篇文章分析Netty客户端连接服务端的主要流程。

---

## 8. 【Netty】Netty心跳机制和重连策略 8. 【Netty】Netty心跳机制和重连策略

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485880&idx=1&sn=dc850548f3e418f8ed2fc575ea29ed11&chksm=eb674ecedc10c7d868f0e2d131dc80e9af07ab857d5e858affb784955eacd85ba264353c731f

前言  

> 上一篇文章学习了Netty的编解码原理，同时使用自定义编解码器改造了聊天程序，但是我们都知道在TCP长连接中，为了我们的链接不被异常中断或者在中断后能自动重连，因此Netty提供了心跳机制（有的地方也叫保活）。本文重点学习心跳机制相关原理。

心跳测试  

> Netty中心跳机制的核心实现类是`io.netty.handler.timeout.IdleStateHandler`

### 服务端测试代码

### server代码

```
package com.xfc.netty.learning.netty.heartbeat;
```

### handler代码

```
package com.xfc.netty.learning.netty.heartbeat.handler;
```

### 客户端测试代码

### client代码

```
package com.xfc.netty.learning.netty.heartbeat;
```

### handler代码

```
package com.xfc.netty.learning.netty.heartbeat.handler;
```

心跳机制源码分析  

Netty的心跳机制主要通过`io.netty.handler.timeout.IdleStateHandler`类实现，这里分析下相关原理

### 类图

> 由类图可知，`IdleStateHandler`间接实现了`ChannelInboundHandler`和`ChannelOutboundHander`，这就意味着Netty服务的读操作和写操作，都会经过\`IdleStateHandler，以便于记录写空闲时间，和读空闲时间。


### 构造器介绍

```
/**
```

从构造器参数可知，`IdleStateHandler`的构造主要包含如下5个参数：

•observeOutput——在评估写空闲时是否应该考虑字节的消耗。默认值为假。•readerIdleTime – 状态为 IdleState.READER\_IDLE 的 IdleStateEvent 将在指定时间段内未执行读取时触发。指定 0 可禁用。•writerIdleTime – 状态为 IdleState.WRITER\_IDLE 的 IdleStateEvent 将在指定时间段内未执行写入时触发。指定 0 可禁用。•allIdleTime – 状态为 IdleState.ALL\_IDLE 的 IdleStateEvent 将在指定时间段内未执行读取和写入时触发。指定 0 可禁用。•unit – readerIdleTime、writeIdleTime 和 allIdleTime 的 TimeUnit

### 核心逻辑源码

### 通道连接

```
@Override
```

### 通道断连

```
@Override
```

### 数据读写

```
@Override
```

### 数据读取完成

```
@Override
```

重连机制  

> Netty重连机制较为简单，通过EventLoop自带的定时重试就行。直接上代码.

### 服务端代码

服务端代码与上述心跳测试代码一致，这里不再重复贴出

### 客户端代码

### 核心代码

```
public ChannelFuture connect() {
```

### client代码

```
package com.xfc.netty.learning.netty.reconnect;
```

### handler代码

```
package com.xfc.netty.learning.netty.reconnect.handler;
```

注意事项：由于这里之前我们的逻辑都是启动完成后同步等待，但是如果需要加重试逻辑，需要将线程池关闭逻辑，以及同步等待逻辑去掉。同步阻塞会导致连接中断后就直接结束进程 ，关闭线程池会导致定时任务无法继续运行。


聊天程序改造  

### 服务端

### server代码

增加心跳处理器

```
package com.xfc.netty.learning.netty.imreconnect.server;
```

### handler代码

增加心跳数据过滤

```
package com.xfc.netty.learning.netty.imreconnect.server.handler;
```

### 客户端代码

### client代码

增加重连机制，同时抽取connect方法

```
package com.xfc.netty.learning.netty.imreconnect.client;
```

### handler代码

增加重连代码

```
package com.xfc.netty.learning.netty.imreconnect.client.handler;
```

### 最后贴几张测试结果代码

### 客户端心跳代码


### 服务端响应代码


### 群聊数据


总结  

本文用较多的代码示例讲解了Netty如何实现心跳保活和重连机制，主要讲了怎么使用和基本原理。在实际的重连场景中，一般会根据业务的特性定制开发重连策略。我这里只是简单依赖Netty本身的内容实现了重连，远没有实际场景复杂。下一篇将会分享下Netty服务端启动源码解析。

---

## 7. 【Netty】Netty的编解码原理 7. 【Netty】Netty的编解码原理

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485871&idx=1&sn=62b52f813d2f7b2fcd5f24337b7b3330&chksm=eb674ed9dc10c7cf33352f608af6f14ca97c1ed0847655517d4bb2547d74f08a25d569ecf71a

前言  

> 经过前面的学习，我们知道Netty的数据传输都是ByteBuf二进制数据，但是在实际应用开发中，我们总是需要将数据转换为对象使用，因此需要将数据通过编码成二进制数据传输，解码成对象使用。本文重点学习Netty的编解码原理。

z

Netty中的Pipeline  

介绍编解码之前，先学习一个跟编解码息息相关的重要概念`Pipeline`，Netty中的`Pipeline`是一个双向链表，本文要学习的编码器和解码器可以理解为下图中的一个个ChannelHandler。`Pipeline`提供了ChannelHandler链的容器。以客户端应用程序为例，如果事件的运动方向是从客户端到服务端的，那么我们称这些事件为出站，即客户端发送给服务端的数据会通过`Pipeline`中的一系列ChannelOutboundHandler(ChannelOutboundHandler调用是从tail到head方向逐个调用每个handler的逻辑)，并被这些Handler处理，反之则称为入站的，入站只调用`Pipeline`里的ChannelInboundHandler逻辑(ChannelInboundHandler调用是从head到tail方向逐个调用每个handler的逻辑)。`Pipeline`结构如下：


编解码原理  

当我们通过Netty发送数据时，数据会被编码器转换为ButeBuf二进制数据，反之，当我们接受Netty发送的数据时，数据会被解码器解析成为我们需要的数据。

### 编码器

Netty提供的编码器主要有如下两类，类图如下


•io.netty.handler.codec.MessageToByteEncoder

主要作用：继承此类主要用于将对象转换为ByteBuf二进制数据，Netty提供的对象编码器ObjectEncoder就继承于MessageToByteEncoder，Netty提供的ObjectEncoder继承自此类，ObjectEncoder类图如下


如下为ObjectEncoder，图中可以看出，对象编码器，用了4个字节存储对象的长度，因此后面解码的时候需要先判断字节数，用于解决拆包粘包问题


•io.netty.handler.codec.MessageToMessageEncoder

主要作用：继承此类主要用于Java对象和Java对象之间的转换，主要用于将一个Java对象编码为另一个Java对象。此类为一个二次解码器，Netty提供的StringEncoder编码器就是继承了MessageToMessageEncoder

### 解码器

> 解码器的作用与编码器的作用对立，处理方法刚好相反，但原理一致

Netty提供的解码器主要为如下两类，类图如下


•io.netty.handler.codec.MessageToMessageDecoder

主要作用：将Java对象解码为另一个Java对象，Netty提供的StringDecoder继承自MessageToMessageDecoder

•io.netty.handler.codec.ByteToMessageDecoder

主要作用：将ByteBuf字节数组转换为Java对象，Netty提供的ObjectDecoder就间接继承自ByteToMessageDecoder，ObjectDecoder类图如下


可以看到ObjectDecoder继承了一个LengthFieldBasedFrameDecoder，此类主要用于解决拆包粘包问题。

### Netty提供的编解码器介绍

> 这里只介绍，我用到过的或者我遇到的，Netty提供了众多的编解码器，这里不再一一说明

•字符串编解码器

StringEncoder：主要用于字符串编码为字节数组进行传输


```
@Sharable
```

主要实现逻辑为`io.netty.buffer.ByteBufUtil#encodeString0`方法中的内容,该内容主要逻辑就是读取出当前的字符串，将字符串转换为ByteBuf

```
static ByteBuf encodeString0(ByteBufAllocator alloc, boolean enforceHeap, CharBuffer src, Charset charset, int extraCapacity) {
```

StringDecoder：主要用于ByteBuf二进制数据解码为字符串类型，类图如下


主要实现逻辑如下

```
@Sharable
```

•对象编解码器（jdk序列化），由于性能较低，因此很少使用

    ObjectEncoder

    ObjectDecoder

    •protobuf编解码器，是google开源的编解码工具，性能较高，但是使用复杂，建议使用protobufUtil

    •mqtt编解码器，由于本人在开发长连接服务过程中用到了Mqtt，因此这里详细分析下

**io.netty.handler.codec.mqtt.MqttEncoder：Mqtt协议数据编码器**，类图如下


源码分析

```
static ByteBuf doEncode(ByteBufAllocator byteBufAllocator, MqttMessage message) {
```

**io.netty.handler.codec.mqtt.MqttDecoder：Mqtt协议数据编码器**，类图如下


源码分析

```
protected void decode(ChannelHandlerContext ctx, ByteBuf buffer, List<Object> out) throws Exception {
```

字符串编码器使用测试  

### 服务端代码

```
package com.xfc.netty.learning.netty.codec.server;
```

### 客户端代码

```
package com.xfc.netty.learning.netty.codec.client;
```

对象编码器使用测试  

### 测试对象

```
package com.xfc.netty.learning.netty.codec.model;
```

### 服务端代码

> 代码跟上诉字符串编解码测试重复，这里只贴出修改部分

```

```

### 客户端代码  

> 代码跟上诉字符串编解码测试重复，这里只贴出修改部分

```
.handler(new ChannelInitializer<SocketChannel>() {
```

如何自定义编解码器？  

> 关于自定义编解码器，只需要知道数据的类型转换，根据上面描述的编码器分类，根据需求继承，然后实现方法即可。这里只贴出自定义编解码器。使用测试这里不再列出。感兴趣可以看github
> 
> https://github.com/itxingfeichen/xfc-examples.git

### 编码器

```
package com.xfc.netty.learning.netty.codec.mycodec;
```

### 解码器

```
package com.xfc.netty.learning.netty.codec.mycodec;
```

群聊程序改造  

### 服务端代码

server代码

```
package com.xfc.netty.learning.netty.imcodec.server;
```

handler代码

```
package com.xfc.netty.learning.netty.imcodec.server.handler;
```

### 客户端代码

client 代码

```
package com.xfc.netty.learning.netty.imcodec.client;
```

handler代码

```
package com.xfc.netty.learning.netty.imcodec.client.handler;
```

### 最后贴两张效果图

服务端  


客户端  


总结  

对于Netty的编解码到此就结束了，重点了解了Netty的编解码基本原理，自定义方法，同时改造了群聊程序，可以看出使用了编解码，对于数据处理便捷了许多，对于编解码底层没有非常深入学习，有机会深入了解下。下一篇文章打算介绍Netty的心跳机制和重连机制。

源码地址：https://github.com/itxingfeichen/xfc\-examples.git

---

## 6. 【Netty】用Netty实现一个群聊系统 6. 【Netty】用Netty实现一个群聊系统

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485492&idx=1&sn=97ac2f80956e2466e811d9a65a379282&chksm=eb674f42dc10c65455028937dec74bdd46278f323721afcbc9d94cccd07a01a607ea1e8ecc85


前言


> 有了前面几篇的基础，也介绍了数据传输对象`io.netty.buffer.ByteBuf`的基本使用和原理，本文基于之前的基础实现一个简版的聊天程序


服务端代码


> 测试代码地址：https://github.com/itxingfeichen/xfc-examples.git
> 
> 项目：xfc-netty-learning

### ImServer代码(com.xfc.netty.learning.netty.im)

```
package com.xfc.netty.learning.netty.im.server;
```

### 服务端Handler(com.xfc.netty.learning.netty.im)

```
package com.xfc.netty.learning.netty.im.server.handler;
```

## 客户端代码

### 客户端启动代码(com.xfc.netty.learning.netty.im)

```
package com.xfc.netty.learning.netty.im.client;
```

### 客户端处理器(com.xfc.netty.learning.netty.im)

```
package com.xfc.netty.learning.netty.im.client.handler;
```


功能介绍  


### 服务端启动


### 客户端启动


### 客户端上、下线通知

*   ### 上线通知
    


*   ### 下线通知
    


### 客户端发送群聊消息

*   ### 自己发送到群里的消息
    


*   ### 群内其他成员收到的消息
    



总结  


    本文主要介绍了基于Netty写的一个简单版聊天程序，完成了**群聊**的基本功能。这里通篇都用`ByteBuf`直接操作数据，可以看出复杂度相对较高，可读性低，并且在文中没有发送任何的java对象数据，那怎么发一个java对象呢？下一文将会介绍Netty的编解码原理，同时使用编码器和解码器完善聊天功能。

---

## 5. 【Netty】ByteBuf详解 5. 【Netty】ByteBuf详解

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485446&idx=1&sn=176193c113ed76e58db67042f3a00c05&chksm=eb674f70dc10c666fd8e3d5e35fb8e91e6540eea697c8aac44041feab1ae292d036587d2f776


前言


> 本文主要学习`io.netty.buffer.ByteBuf`的使用方法和基本原理。


ByteBuf的基本原理和使用介绍


### 数据容器介绍


如上图所示，ByteBuf维护两个索引，一个读索引（readerIndex)和一个写索引（writerIndex)。当从ByteBuf中读取数据的时候readerIndex索引会递增已经被读取的字节数。同样，当写入ByteBuf的时候，它的writerIndex索引会被递增。同时维护者最大容量和两个标记索引标记读索引（markedReaderIndex）和标记写索引（markedWriterIndex），标记读索引主要用于将当前readerIndex备份到markedReaderIndex中，标记写索引主要用于将当前writerIndex备份到markedWriterIndex中  


读取流程

1、如果readerIndex和WriterIndex的值一样的时候，如果继续向前读取数据。将会抛出IndexOutOfBoundsException 。

2、以read或者write开头的ByteBuf方法，将会推进其对应的索引，而名称以set或get开头操作不会修改索引。

3、ByteBuf具有最大的容量值，试图移动写索引超过这个值，将会触发一个异常。其默认的限制为Integer.MAX\_VALUE。

### ByteBuf缓冲区类型

•堆缓冲区（底层为字节数组）



主要对应`io.netty.buffer.UnpooledHeapByteBuf`类，堆缓冲区主要使用的是JVM的堆内存，使用方式如下

```
package com.xfc.netty.learning.netty.bytebuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import java.nio.charset.StandardCharsets;/** * 堆缓冲区测试 * * @author xf.chen * @date 2021/7/31 17:10 * @since 1.0.0 */public class HeapByteBufTest {    public static void main(String[] args) {        ByteBuf byteBuf = Unpooled.buffer();        // 写缓存区        byteBuf.writeBytes("xf.chen".getBytes(StandardCharsets.UTF_8));        // 读缓存区        byte[] bytes = new byte[byteBuf.readableBytes()];        byteBuf.readBytes(bytes);        System.out.println(new String(bytes));    }}
```

•直接内存缓存区（非堆）

使用直接内存有益于我们在进行IO操作时，可能遇到的大于堆内存的数据带来的系统问题。同时可以提升数据拷贝的性能

```
package com.xfc.netty.learning.netty.bytebuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import java.nio.charset.StandardCharsets;/** * 堆缓冲区测试 * * @author xf.chen * @date 2021/7/31 17:10 * @since 1.0.0 */public class DirectByteBufTest {    public static void main(String[] args) {        ByteBuf byteBuf = Unpooled.directBuffer();        // 写缓存区        byteBuf.writeBytes("xf.chen".getBytes(StandardCharsets.UTF_8));        // 读缓存区        byte[] bytes = new byte[byteBuf.readableBytes()];        byteBuf.readBytes(bytes);        System.out.println(new String(bytes));    }}
```

•复合缓存区

顾名思义，就是堆缓存区和直接内存缓存区的组合模式，示例代码如下

```
package com.xfc.netty.learning.netty.bytebuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.CompositeByteBuf;import io.netty.buffer.Unpooled;import java.nio.charset.StandardCharsets;/** * 堆缓冲区测试 * * @author xf.chen * @date 2021/7/31 17:10 * @since 1.0.0 */public class CompositeByteBufTest {    public static void main(String[] args) {        final CompositeByteBuf compositeBuffer = Unpooled.compositeBuffer();        ByteBuf directByteBuf = Unpooled.directBuffer();        ByteBuf heapByteBuf = Unpooled.buffer();        // 写缓存区        directByteBuf.writeBytes("xf.chen".getBytes(StandardCharsets.UTF_8));        heapByteBuf.writeBytes("xingyi".getBytes(StandardCharsets.UTF_8));        // 组合缓冲区        compositeBuffer.addComponents(true,heapByteBuf);        compositeBuffer.addComponents(true,directByteBuf);        // 读缓冲区        byte[] bytes = new byte[compositeBuffer.readableBytes()];        compositeBuffer.readBytes(bytes);        System.out.println(new String(bytes));    }}
```


缓冲区字节操作


### 缓冲区字节读取测试

```
package com.xfc.netty.learning.netty.bytebuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;import java.nio.charset.StandardCharsets;/** * 堆缓冲区字节读取测试 * * @author xf.chen * @date 2021/7/31 17:10 * @since 1.0.0 */public class ByteBufTest {    public static void main(String[] args) {        ByteBuf byteBuf = Unpooled.buffer(7);        // 写缓存区        byteBuf.writeBytes("xf.chen".getBytes(StandardCharsets.UTF_8));        // 获取单个字节数据        for (int i = 0; i < 7; i++) {            System.out.println((char) byteBuf.getByte(i));        }    }}
```


综合测试


```
package com.xfc.netty.learning.netty.bytebuf;import io.netty.buffer.ByteBuf;import io.netty.buffer.Unpooled;综合测试import io.netty.util.CharsetUtil;import java.nio.charset.StandardCharsets;/** * 堆缓冲区读取测试<br> * 创建byteBuf对象，该对象内部包含一个字节数组byte[10] * 通过readerindex和writerIndex和capacity，将buffer分成三个区域 * 已经读取的区域：[0,readerindex) * 可读取的区域：[readerindex,writerIndex) * 可写的区域: [writerIndex,capacity) * * @author xf.chen * @date 2021/7/31 17:10 * @since 1.0.0 */public class NettyByteBuf {    public static void main(String[] args) {        ByteBuf byteBuf = Unpooled.buffer(10);        // (ridx: 0, widx: 0, cap: 10)        System.out.println("current byteBuf is" + byteBuf);        // 写数据 8 个数字        for (int i = 0; i < 8; i++) {            byteBuf.writeByte(i);        }        // (ridx: 0, widx: 8, cap: 10)        System.out.println("current byteBuf is" + byteBuf);        // 读取 5 个数据，get方法不会移动索引        for (int i = 0; i < 5; i++) {            System.out.println(byteBuf.getByte(i));        }        // (ridx: 0, widx: 8, cap: 10)        System.out.println("current byteBuf is" + byteBuf);        // 读取 5 个数据，get方法会移动索引，因此此处的readerIndex = 5        for (int i = 0; i < 5; i++) {            System.out.println(byteBuf.readByte());        }        // (ridx: 5, widx: 8, cap: 10)        System.out.println("byteBuf=" + byteBuf);        /*********************************************/        //用Unpooled工具类创建ByteBuf ，这个API底层实际上还是调用Unpooled.buffer()生成ByteBuf对象        ByteBuf byteBuf2 = Unpooled.copiedBuffer("xf.chen", CharsetUtil.UTF_8);        //使用相关的方法        if (byteBuf2.hasArray()) {            byte[] bytes = new byte[ byteBuf2.readableBytes()];            byteBuf2.readBytes(bytes);            // 正确读取的可读 readable 数据结果            System.out.println(new String(bytes));            System.out.println("current byteBuf2 is" + byteBuf2);            byte[] content = byteBuf2.array();            //将 content 转成字符串,这里会将不可读的剩余字节数据打印出来，因此array慎用,            // 打印结果：xf.chen            System.out.println(new String(content, CharsetUtil.UTF_8));            // (ridx: 7, widx: 7, cap: 64)            System.out.println("current byteBuf2 is" + byteBuf2);            // 获取数组0这个位置的字符h的ascii码，x=120            System.out.println(byteBuf2.getByte(0));            //可读的字节数  上面已经读取完数据因此这里为0，这个方法可以用于判断可读数据长度，后面讲解拆包粘包会用到            int len = byteBuf2.readableBytes();            System.out.println("可读字节长度 =" + len);            //使用for取出各个字节            for (int i = 0; i < len; i++) {                System.out.println((char) byteBuf2.getByte(i));            }            //范围读取            System.out.println(byteBuf2.getCharSequence(0, 3, CharsetUtil.UTF_8));            System.out.println(byteBuf2.getCharSequence(3, 7, CharsetUtil.UTF_8));        }    }}
```


总结


本文主要重点学习了`io.netty.buffer.ByteBuf`的基本使用和基本原理，很多地方没有深入学习，如**内存动态扩容机制**、**直接缓冲区内存回收**等等，这里mark一下，后面深入学习一下。

千里之行始于足下～～～～～～～～～～～～～

---

## 4. 【Netty原理】Netty入门 4. 【Netty原理】Netty入门

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485378&idx=1&sn=4615dbc5d8437cc37ce9a9f2269eebe8&chksm=eb6740b4dc10c9a2694c5e57cfab4dcfe99f284295edbaa6ed72516c600615715a640bff13b8



前言


> 前面关于Netty的几篇文章介绍了Netty的基本概念以及相关的基础知识，如IO模型、Netty中的名词解释等。从本文开始进入Netty相关源码的学习和理解。本节先通过一个Netty最基本的Demo作为入门篇


服务端代码


> 测试代码地址：https://github.com/itxingfeichen/xfc-examples.git
> 
> 项目：xfc-netty-learning

### NettyServer代码(com.xfc.netty.learning.netty.base)

```
package com.xfc.netty.learning.netty.base;
```

### 服务端Handler(com.xfc.netty.learning.netty.base)

```
package com.xfc.netty.learning.netty.base.handler;
```


客户端代码


### 客户端启动代码(com.xfc.netty.learning.netty.base)

```
package com.xfc.netty.learning.netty.base;
```

### 客户端处理器(com.xfc.netty.learning.netty.base)

```
package com.xfc.netty.learning.netty.base.handler;
```


总结


本文相对简单，主要依据官网的示例代码实现了第一个基础demo。并根据官网说明详细介绍了服务端启动代码和客户端启动代码的流程和作用。大概了解了各个组件的基本作用，以及简单了解了Netty底层重要的数据交互对象**ByteBuf**，下文将专门学习ByteBuf作用和使用方法。



---

## 3. 【Netty原理】Netty架构以及核心名词介绍 3. 【Netty原理】Netty架构以及核心名词介绍

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247485357&idx=1&sn=ae40d684dfc81c30906f275d0c96043f&chksm=eb6740dbdc10c9cd97c15771b9175ad0b1152a20386a967660a1fab089c2874ff83ca92e869a

## 前言

> 前面的文章学习了一些IO模型基础以及Netty的基本功能和特性，由于Netty的学习门槛较高，本人学习也是较为吃力，但是不能否认，Netty是一款设计优雅，架构清晰的优秀框架。所以一步一步啃吧。本文重点介绍Netty的架构、相关名词、以及项目结构。

## Netty的架构图

> 下图为Netty官方首页的架构图，从图中可以看出Netty被设计为3大模块。在后面的文章中会主要围绕这3大模块的内容学习。


### Core（核心逻辑层）

核心逻辑层主要抽象了Netty相关的时间模型、通用API、零拷贝等，完成了Netty最基础的骨架内容

### Protocol Support（协议支持层）

协议层主要扩展了多种市面上的常用协议，如http、websocket、二进制协议，同时支持相关的编解码技术，如protobuf，gzip，zlip压缩等。有了上述协议的支持，因此我们可以基于Netty快速开发我们需要的服务，如websocket，http服务，网关等等

### Transport Service（传输层）

传输层主要为维护传输通道，数据通道，如tcp，udp等数据传输相关的抽象和细节实现

## Netty源码结构介绍

> 由于Netty子项目较多，这里贴出Netty的模块代码

```
<modules>    <module>all</module>    <module>dev-tools</module>    <module>common</module>    <module>buffer</module>    <module>codec</module>    <module>codec-dns</module>    <module>codec-haproxy</module>    <module>codec-http</module>    <module>codec-http2</module>    <module>codec-memcache</module>    <module>codec-mqtt</module>    <module>codec-redis</module>    <module>codec-smtp</module>    <module>codec-socks</module>    <module>codec-stomp</module>    <module>codec-xml</module>    <module>resolver</module>    <module>resolver-dns</module>    <module>resolver-dns-native-macos</module>    <module>transport</module>    <module>transport-native-unix-common-tests</module>    <module>transport-native-unix-common</module>    <module>transport-native-epoll</module>    <module>transport-native-kqueue</module>    <module>transport-rxtx</module>    <module>transport-sctp</module>    <module>transport-udt</module>    <module>handler</module>    <module>handler-proxy</module>    <module>example</module>    <module>testsuite</module>    <module>testsuite-autobahn</module>    <module>testsuite-http2</module>    <module>testsuite-osgi</module>    <module>testsuite-shading</module>    <module>testsuite-native</module>    <module>testsuite-native-image</module>    <module>testsuite-native-image-client</module>    <module>testsuite-native-image-client-runtime-init</module>    <module>transport-blockhound-tests</module>    <module>microbench</module>    <module>bom</module>  </modules>
```

## Netty-common


Common包定义了众多的工具，如时间轮、日志适配以及相关的日期操作、对象操作、数学计算、并发工具等等。基本所有的Netty模块都依赖了common包作为基础

## Netty-buffer


buffer模块定义了一个 完全可以替换JDK的ButeBuffer类的ButeBuf类，使用更方便，性能更优越。容量管理，内存申请等更**智能**

## Netty-codec


Netty对各种协议支持得非常完善，对各种协议都有自己的协议支持模块，负责相关的编解码操作。提供了易于扩展的接口，便于我们使用或自定义。

## Netty-Handler


此模块主要处理Netty中的数据，如地址获取，ssl协议，超时等等。默认就提供了打印日志LoggingHandler，ip过滤UniqueIpFilter以及常用的心跳处理器IdleStateHandler（后面会重点介绍）

## Netty-transport


从模块名称看，Netty针对不同的系统做了不同的实现，因为在不同操作系统内对传输协议，IO模型等的实现不相同，这里提供了数据处理和数据传输的核心业务逻辑。包括核心接口Bootstrap、EventLoop等核心类都在这里

## Netty相关名词解释

## Channel

意为**渠道**，在Netty中`Channel`主要负责数据的读写

## Buffer（ByteBuf）

字节缓冲区，Netty中的Buffer主要用于内存相关的操作，包含内存申请，内存释放以及动态内存的管理等

## EventLoopGroup

本质上是一个线程池，是Reactor主从模型的重要组成部分

## EventLoop

实际上为一个线程，基于Netty的Reactor模型抽象出来的线程模型。主要用户处理多个渠道的相关事件

## Bootstrap

客户端启动器，Netty客户端启动流程引导对象

## ServerBootStrap

服务端启动器，Netty服务端启动引导类，负责服务端的初始化，端口绑定。handler管理等等

## Pipeline

Netty中的Pipeline是一个双向链表，主要用于管理Netty数据读取和写出相关的数据加工。默认包含了head和tail节点，在通过pipeline对象添加XXXHandler时，实际上是添加到tail前

## 总结

本文主要介绍了Netty的架构组成，源码结构分析。同时介绍了Netty中的一些关键名词，为后面深入Netty学习奠定一定的基础。下一节开始正式进入Netty的代码学习，将开启第一个DEMO。

---

## 2. 【Netty原理】前置基础知识准备 2. 【Netty原理】前置基础知识准备

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247484616&idx=1&sn=897b31c95b209ef7767f472e3ef16e89&chksm=eb6743bedc10caa87d381c8d44904e4b568c542091a06fa200268382af0efeec7c24eb5fb333

## 前言

> 本文主要介绍一些基础概念，如同步、异步、阻塞、非阻塞以及常见的几种IO模型

## 几个重要的概念

### 同步

> java中同步是指线程占用CPU不释放，直到当前线程的操作完成并返回结果，释放前不能做任何其他的事情。直到执行当前的操作后才能进行下一个其他操作.

### 异步

> java中异步是指线程不占用CPU一直执行某个动作等到其返回，执行万一个动作后可以继续执行下一个动作。不用关心前一个动作的执行结果

### 阻塞

> 阻塞指系统内核态的概念，是指系统把数据从磁盘读取到内核台，然后把数据从内核态拷贝到用户态并返回给等待的程序。期间程序会一直等待，直到系统告诉程序数据读取完成

### 非阻塞

> 相对阻塞概念，非阻塞也是系统内核态的概念，是指系统把数据从磁盘读取到内核台，然后把数据从内核态拷贝到用户态并返回给等待的程序。期间程序不会一直等待，而是系统通过事件告知某个程序数据准备好了

### linux的IO模型

　　一次IO访问(比如read)，数据会先被复制到操作系统内核缓冲区中，然后再从操作系统内核的缓冲区复制到应用程序的地址空间。也就是说，当一个IO操作发生时，会经历两个阶段：

1.数据准备阶段(Waiting for the data to be ready)；2.将数据从内核复制到进程中(Copying the data from the kernel to the process)；

　　这是因为存在上面两个阶段，linux系统产生了下面5种I/O模型：

•阻塞I/O(blocking IO)•非阻塞I/O(nonblocking IO)•I/O多路复用(IO multiplexing)•信号驱动I/O(signal driven IO)•异步I/O(asynchronous IO)

### 同步阻塞IO（BIO）

> 就是最最普通的write/read操作,以读操作为例, 程序调用内核接口,然后等待系统返回,内核做读写初始化操作(寻址,读取原始数据到内核等),接着将数据读出到内核态,然后把数据从内核态拷贝到用户态下并返回结果给程序,然后程序才知道完成整个读操作,在内核初始化到将数据从存储介质取出到内核态内存中的这段时间程序就是一直等待,期间CPU的状态是wait的,夸张一点,如果内核调用一次读的操作是1秒的话,那么这一秒内程序是将CPU占着不做任何事情的,是不是感觉好浪费.

### 同步非阻塞IO（NIO）

> 这里再内核调用里面会有一个设置参数叫O\_NONBLOCK,使用这个的时候就会变成了非堵塞的调用,(其实从这个参数差不多可以猜测出堵塞和非堵塞是针对内核调用来说的,因为这个参数直接作用的就是内核调用),这里会有一个状态通知的概念,程序不会立即完成IO操作,还是以读操作为例,程序首先向内核发出一个读操作的调用,这个时候系统会在很短的时候返回一个状态,表示读操作是否初始化完成,大多数时候是返回不能读初始化(因为有资源竞争),接着程序会继续像死循环一个的发起这个请求直到内核返回读操作已经准备好(记住死循环的时候程序实际上被读这个操作的时候实际不能做别的事情,所以是同步的),这个时候程序在才能将数据从内核态拷贝到用户态后并且返回,这个读过程就算完成了.虽然内核态是是非堵塞的,但是程序这个线程里面在完成读操作之前也没有能做别的事情,所以这里还是同步的.相对同步堵塞IO来说,这种方式可以让程序不用占着CPU时间也不给别人用的情况.,另外由于操作是循环调用查看状态的,所以再内核准备好数据到程序下一次查看状态之间存在延时,这样会导致系统的吞吐量下降.

### 异步阻塞IO

> 这里就是我们java里面用到的Select或者Clib里面的poll来实现的,这里面实际也用到上面提到的非阻塞的参数,只是采用Select这种阻塞的方式来调用非阻塞的内核调用.虽然读和写的操作并没有被堵塞住,而是由Select中获取了I/O从操作符再进行下一步操作,这里的数据真正的操作还是被堵塞住了,但是这个的好处就是可以同时再一个线程里面对多个IO操作进行处理,这种顺序处理的效率确实不高,再有的程序里面会启动多个线程来做Select的操作提高性能.这个一个的好处就是再同一个线程内可以有多个IO操作同时进行,他不能提高单个IO的吞吐量,但是可以提高程序的IO并发能力,从而提高整体的IO吞吐量.

### 异步非阻塞IO（AIO）

> 这个厉害了,这就是我们提得比较热的一个概念,叫AIO,他采用的是回调的方式实现异步操作,然后也使用非堵塞的参数,这样一来程序不需要死循环来监听IO操作符,内核准备好了就会通知程序做对应的事情,而程序再读写等待的时候就可以把剩下的CPU时间用在做别的业务处理.这个的好处就太多了,首先他吧CPU时间让出来了,可以做别的事情,其次是回调方式的,只要数据准备好就可以回调让程序把数据从内核拷贝走.坏的地方么我只能说回调对于程序员的编码要求确实有点高的.

## Java中的几种IO实现

### 同步阻塞IO（BIO）

> 一个典型的同步阻塞IO操作流程如下


如上图所示，应用程序调用系统读取数据后，会阻塞等待，知道系统将数据从内核拷贝到用户态，拷贝完成后返回数据给应用程序。整个过程应用程序无法进行其他操作，因此称之为阻塞IO（BIO）

一般优化和使用方案为每个连接新建一个线程以提高性能，但是服务器可开启的线程有限，资源可能会耗尽

### 同步非阻塞IO（NIO）

> 一个典型的同步非阻塞IO操作流程如下


如上图，应用程序发起请求后，系统不会数据未拷贝完成不需要一直阻塞等待，而是直接返回数据未准备好，不阻塞用户请求，而是通过多次请求系统询问数据是否已经准备好，知道获取到数据为止。数据拷贝的过程本身系统会转换为异步的，但是我们的线程会类似死循环一样等待结果，因此这个IO模型被称之为非阻塞IO。  

但是这个IO模型性能瓶颈也很明显。需要非常频繁的请求系统询问资源是否准备好，频繁的调用也是有可能耗光我们的服务器资源的。

### IO多路复用


多路复用很好的解决了前一个IO模型的弊端，不必频繁请求后端询问结果，以较小的代价提升了较大的性能，同时让程序更具有稳定性和高性能。这里的**多路**是指多个通道，**复用**是指复用线程。通过一个线程轮询，不断的查找内核中已经准备好数据的请求，然后返回给对应的应用程序。常说的select，poll，epoll都是IO多路复用的具体体现。

### 扩展

1、IO的多路复用到底复用的是什么？

答：IO多路复用实际上复用的是我们发起系统调用的次数，通过有限次的调用管理多个网络连接

2、IO的多路复用到底如何复用？

答：通过批量将网络连接通过系统调用交给系统内核，由系统内核处理IO请求，数据准备好并拷贝到用户态后通知程序应用

### 示例代码

服务端代码

```
public static void main(String[] args) throws IOException {    // 创建Selector    Selector selector = Selector.open();    // 创建ServerSocketChannel    ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();    // 为serverSocketChannel绑定端口    serverSocketChannel.bind(new InetSocketAddress(8000));    // 设置serverSocketChannel为非阻塞    serverSocketChannel.configureBlocking(false);    // 将serverSocketChannel注册到选择器上    serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);    // 打印启动日志    System.out.println("服务端启动成功");    // 阻塞检测selector中的可用channel数量    for (; ; ) {        int select = selector.select();        // 如果没有可用渠道，则继续循环        if (select == 0) {            continue;        }        Set<SelectionKey> selectionKeys = selector.selectedKeys();        Iterator<SelectionKey> iterator = selectionKeys.iterator();        while (iterator.hasNext()) {            SelectionKey selectionKey = iterator.next();            // 移除的原因是因为，这里采用的是死循环，如果每次检测到同样的SelectionKey都向集合中添加，则会导致集合中的内容越来越大            iterator.remove();            // 根据就绪状态，调用对应方法处理的业务逻辑            // 接入事件            if (selectionKey.isAcceptable()) {                processAccept(serverSocketChannel, selector);            }            // 可读事件            if (selectionKey.isReadable()) {                processRead(selectionKey, selector);            }        }    }}
```

客户端代码

```
public void start(String nickname) throws IOException {    // 启动客户端    final SocketChannel socketChannel = SocketChannel.open(new InetSocketAddress("localhost", 8000));    final Selector selector = Selector.open();    socketChannel.configureBlocking(false);    socketChannel.register(selector, SelectionKey.OP_READ);    final ClientAcceptMsgFromServer clientAcceptMsgFromServer = new ClientAcceptMsgFromServer(selector);    new Thread(clientAcceptMsgFromServer).start();    // 向服务端发送数据    final Scanner scanner = new Scanner(System.in);    while (scanner.hasNextLine()) {        final String nextLine = scanner.nextLine();        if (nextLine != null && nextLine.length() > 0) {            socketChannel.write(Charset.forName("UTF-8").encode(nickname + " : " + nextLine));        }    }}
```

### 异步非阻塞IO（AIO）


###   
示例代码

```
public class AioServer {    AsynchronousChannelGroup asynchronousChannelGroup;    AsynchronousServerSocketChannel open;    /**     * 初始化server     *     * @param port     * @throws IOException     */    public AioServer(int port) throws IOException, InterruptedException {        // 创建一个通道组        asynchronousChannelGroup = AsynchronousChannelGroup.withCachedThreadPool(Executors.newCachedThreadPool(), 1);        // 创建服务器通道        open = AsynchronousServerSocketChannel.open(asynchronousChannelGroup);        // 绑定端口        open.bind(new InetSocketAddress(port));        System.out.println("server start " + port);        // 阻塞//        open.accept();        open.accept(this, new CompletionHandler<AsynchronousSocketChannel, AioServer>() {            @Override            public void completed(AsynchronousSocketChannel result, AioServer attachment) {            }            @Override            public void failed(Throwable exc, AioServer attachment) {                System.out.println("failed...");            }        });        TimeUnit.SECONDS.sleep(Integer.MAX_VALUE);    }
```

## Reactor模型介绍

### 单Reactor单线程模型


此种模型，通常是只有一个 epoll 对象，所有的**接收客户端连接**、**客户端读取**、**客户端写入**操作都包含在一个线程内。该种模型也有一些中间件在用，比如 redis。

但在目前的单线程 Reactor 模式中，不仅 I/O 操作在该 Reactor 线程上，连非 I/O 的业务操作也在该线程上进行处理了，这可能会大大延迟 I/O 请求的响应。所以我们应该将非 I/O 的业务逻辑操作从 Reactor 线程上卸载，以此来加速 Reactor 线程对 I/O 请求的响应。

### 单Reactor多线程模型


该模型主要是通过将前面的模型进行改造，将读写的业务逻辑交给具体的线程池来实现，这样可以显示 reactor 线程对 IO 的响应，以此提升系统性能

在工作者线程池模式中，虽然非 I/O 操作交给了线程池来处理，但是所有的 I/O 操作依然由 Reactor 单线程执行，在高负载、高并发或大数据量的应用场景，依然较容易成为瓶颈。所以，对于 Reactor 的优化，又产生出下面的多线程模式。

### 多Reactor多线程模型


在这种模型中，主要分为两个部分：mainReactor、subReactors。mainReactor 主要负责接收客户端的连接，然后将建立的客户端连接通过负载均衡的方式分发给 subReactors，

subReactors 来负责具体的每个连接的读写

对于非 IO 的操作，依然交给工作线程池去做，对逻辑进行解耦

mainReactor 对应 Netty 中配置的 BossGroup 线程组，主要负责接受客户端连接的建立。一般只暴露一个服务端BossGroup 线程组一般一个线程工作即可 subReactor 对应 Netty 中配置的 WorkerGroup 线程组，BossGroup 线程组接受并建立完客户端的连接后，将网络 socket 转交给 WorkerGroup 线程组，然后在 WorkerGroup 线程组内选择一个线程，进行 I/O 的处理。WorkerGroup 线程组主要处理 I/O，一般设置 2\*CPU 核数个线程

### 多Reactor多进程模型

### 主流中间件使用的IO模型


## Netty的IO模型

Netty的IO模型是使用NIO多路复用模型，多Reactor多线程模型

### 示例代码

### 服务端

```
public class NettyServer {    public static void main(String[] args) throws InterruptedException {        NioEventLoopGroup boosGroup = new NioEventLoopGroup();        NioEventLoopGroup workerGroup = new NioEventLoopGroup();        ServerBootstrap bootstrap = new ServerBootstrap();        ChannelFuture channelFuture = bootstrap.group(boosGroup, workerGroup)                // 使用NioServerSocketChannel作为通道实现                .channel(NioServerSocketChannel.class)                // 设置线程队列得到连接个数                .option(ChannelOption.SO_BACKLOG, 128)                // 让链接保持活跃状态                .childOption(ChannelOption.SO_KEEPALIVE, true)                .childHandler(new ChannelInitializer<NioSocketChannel>() {                    @Override                    protected void initChannel(NioSocketChannel nioServerSocketChannel) throws Exception {                        nioServerSocketChannel.pipeline().addLast(new NettyServerHandler());                    }                })                // 绑定端口并启动服务器                .bind(6668).sync();        System.out.println("服务器准备好了");        // 监听关闭通道        channelFuture.channel().closeFuture().sync();    }}
```

### 客户端

```
public class NettyClient {    public static void main(String[] args) {        NioEventLoopGroup group = new NioEventLoopGroup();        Bootstrap bootstrap = new Bootstrap();        // 设置线程组        ChannelFuture channelFuture = null;        try {            channelFuture = bootstrap.group(group)                    // 设置客户端通道的实现累                    .channel(NioSocketChannel.class)                    .handler(new ChannelInitializer<SocketChannel>() {                        @Override                        protected void initChannel(SocketChannel socketChannel) throws Exception {                            socketChannel.pipeline().addLast(new NettyClientHandler());                        }                    }).connect("127.0.0.1", 6668).sync();            System.out.println("客户端准备好了");            channelFuture.channel().closeFuture().sync();        } catch (InterruptedException e) {            e.printStackTrace();        } finally {            group.shutdownGracefully();        }    }}
```

相关handler

```
public class NettyServerHandler extends ChannelInboundHandlerAdapter {    @Override    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {//        super.channelRead(ctx, msg);        System.out.println("server ctx ="+ctx);        ByteBuf byteBuf  = (ByteBuf) msg;        System.out.println("客户端消息="+byteBuf.toString(StandardCharsets.UTF_8));        System.out.println("客户端地址="+ctx.channel().remoteAddress());    }    @Override    public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {        ctx.writeAndFlush(Unpooled.copiedBuffer("hello"+ctx.channel().remoteAddress(),StandardCharsets.UTF_8));    }    @Override    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {        ctx.close();    }}public class NettyClientHandler extends ChannelInboundHandlerAdapter {    /**     * 当通道就绪就会触发该方法     *     * @param ctx     * @throws Exception     */    @Override    public void channelActive(ChannelHandlerContext ctx) throws Exception {        ctx.writeAndFlush(Unpooled.copiedBuffer("hello 服务端", StandardCharsets.UTF_8));    }    /**     * 通道有读取事件时会触发     *     * @param ctx     * @param msg     * @throws Exception     */    @Override    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {        ByteBuf byteBuf = (ByteBuf) msg;        System.out.println("服务端消息=" + byteBuf.toString(StandardCharsets.UTF_8));    }}
```

## 总结

本文主要介绍了IO中的一些常见概念以及常见的几种IO模型，也是主要为了后面学习Netty打基础。

## 参考文章

ps：本文因个人学习需要，部分内容重点参考如下两篇文章，如有侵权，请联系我删除

[https://mp.weixin.qq.com/s/XQIuKle1cFnFCJpCx6uFSg](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247506048&idx=1&sn=88760218bd8d6adf9b73a420add63968&scene=21#wechat_redirect "https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247506048&idx=1&sn=88760218bd8d6adf9b73a420add63968&scene=21#wechat_redirect")

https://blog.csdn.net/coffee\_hc/article/details/39337427

---

## 1. 【Netty原理】什么是Netty？ 1. 【Netty原理】什么是Netty？

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247484603&idx=1&sn=53148224e040d320218390641201a0ce&chksm=eb6743cddc10cadbd799efe2fba5d7b0beb9b96e404b5dd186099456b76a9fb71b8113a674b6

## 什么是Netty？

对于Netty的概念，用官方的原话解释可能更为准确,Netty官网地址 https://netty.io/

> Netty is **an asynchronous event-driven network application framework** for rapid development of maintainable high performance protocol servers & clients.
> 
> 翻译：Netty是一个异步事件驱动的网络应用模型，用于快速开发可维护的高性能协议服务端和客户端
> 
> Netty is a NIO client server framework which enables quick and easy development of network applications such as protocol servers and clients. It greatly simplifies and streamlines network programming such as TCP and UDP socket server. 'Quick and easy' doesn't mean that a resulting application will suffer from a maintainability or a performance issue. Netty has been designed carefully with the experiences earned from the implementation of a lot of protocols such as FTP, SMTP, HTTP, and various binary and text-based legacy protocols. As a result, Netty has succeeded to find a way to achieve ease of development, performance, stability, and flexibility without a compromise.
> 
> 翻译：Netty 是一个 NIO 客户端服务器框架，它可以快速轻松地开发网络应用程序，例如协议服务器和客户端。它极大地简化和精简了 TCP 和 UDP 套接字服务器等网络编程。“快速而简单”并不意味着生成的应用程序会受到可维护性或性能问题的影响。Netty 是根据从许多协议（例如 FTP、SMTP、HTTP 以及各种基于二进制和文本的遗留协议）的实现中获得的经验而精心设计的。结果，Netty 成功地找到了一种方法，可以在不妥协的情况下实现易于开发、性能、稳定性和灵活性。

## Netty有哪些特性？（官方）

### 设计

•各种传输类型的统一 API - 阻塞和非阻塞套接字•基于灵活且可扩展的事件模型，允许清晰的关注点分离•高度可定制的线程模型——单线程、一个或多个线程池•真正的无连接数据报套接字支持（自 3.1 起）

### 易于使用

•有据可查的 Javadoc、用户指南和示例•没有额外的依赖，JDK 5 (Netty 3.x) 或 6 (Netty 4.x) 就足够了

### 性能

•高吞吐量、低延迟•更少的资源消耗•零拷贝

### 安全性

•完整的 SSL/TLS 和 StartTLS 支持

## Netty架构？


ps:图片摘自官网 https://netty.io

## 为什么要用Netty？

相比JavaNIO，Mina，Grizzy等通信框架，Netty很好的封装了晦涩难懂网络通信应用开发流程，让我们可以通过Netty很方便搭建起我们需要的高性能网络通信服务。如http服务器，tcp服务器等等。我们熟知的Dubbo，RocketMQ，Nacos等中间件也都用Netty作为底层的网络通讯框架。对于网络编程，我们日常关注的IO模型，线程模型，事件驱动，序列化和反序列化以及高度可扩展的API，Netty都做出了很好的支持和完善。

•高并发•可扩展•传输快•自定义协议支持

以上四点是我们选择学习和使用Netty的主要原因，对于以上的特点，在后面的文章中会逐一介绍和学习

## 总结

本文根据官网的介绍简单的描述了Netty是什么，有些什么样的特点以及为什么要用Netty。后面的文章会逐一展开同时结合源码系统的学习和深入了解Netty
