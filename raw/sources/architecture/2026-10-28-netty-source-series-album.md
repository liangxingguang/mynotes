---
title: Netty 源码系列合集（28篇：程序员行一）
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

> Netty 不会天然把一个 HTTP 请求变成一个 `FullHttpRequest`。`HttpServerCodec` 的入站 Decoder 按状态机产出 `HttpRequest`、若干 `HttpContent` 和 `LastHttpContent`，出站 Encoder 再把响应对象编码成字节；`HttpObjectAggregator` 只是可选的聚合层，用内存换取完整消息接口，并且必须设置上限。

HTTP/1.1 建立在 TCP 字节流上，同样存在半包、粘包和一次 read 包含多条消息的问题。除此之外，它还有请求行、Header、固定长度 Body、Chunked Body、100-continue、keep-alive 和 pipelining 等协议状态。一个健壮的 HTTP Codec 必须把这些状态逐步解析，不能假设一次 Socket read 就是一条请求。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点模块：`codec-http`
    
*   • 重点类与方法：`HttpServerCodec`、`HttpObjectDecoder.decode`、`readHeaders`、`HttpObjectEncoder.encode`
    
*   • 官方源码：https://github.com/netty/netty/tree/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http



这张图展示了双向结构：入站字节先经过 `HttpRequestDecoder`，按对象流传播；可选 Aggregator 把多个对象聚成完整请求；业务返回 `HttpResponse` 和 Content，出站 `HttpResponseEncoder` 逆向编码。入站与出站共用一个 `HttpServerCodec` 外壳，但内部是两个 Handler。

## 1\. HttpServerCodec 是入站 Decoder 与出站 Encoder 的组合

`HttpServerCodec` 继承 `CombinedChannelDuplexHandler`。构造时把请求解码器和响应编码器组合起来：

`public HttpServerCodec(HttpDecoderConfig config) {    init(new HttpServerRequestDecoder(config),         new HttpServerResponseEncoder()); }`

这说明服务端两个方向的职责不同：

*   • 入站：`ByteBuf -> HttpRequest/HttpContent`；
    
*   • 出站：`HttpResponse/HttpContent -> ByteBuf`。
    

Pipeline 的方向规则仍与第 7 篇一致。请求从 Head 向 Tail 找入站 Handler，响应从当前 Context 向 Head 找出站 Handler。业务若在 Codec 之前调用 `ctx.write`，可能跳过响应 Encoder；初始化时应让协议 Codec 位于业务 Handler 前面。

## 2\. Decoder 首先解析 initial line，再进入 Header 状态

`HttpObjectDecoder` 继承 `ByteToMessageDecoder`，内部状态机大致包括：

`SKIP_CONTROL_CHARS    -> READ_INITIAL    -> READ_HEADER    -> READ_FIXED_LENGTH_CONTENT    -> READ_VARIABLE_LENGTH_CONTENT    -> READ_CHUNK_SIZE    -> READ_CHUNKED_CONTENT    -> READ_CHUNK_DELIMITER    -> READ_CHUNK_FOOTER`

`decode()` 在 `READ_INITIAL` 阶段解析请求行：

`METHOD SP URI SP VERSION CRLF`

例如：

`POST /orders HTTP/1.1`

输入不足时状态机保留当前进度，等待下次 ByteBuf 累积。解析成功后创建 `HttpMessage`，再调用 `readHeaders(buffer)` 读取 Header。它不是对整段字符串做一次 split，而是受长度上限约束地增量解析。

## 3\. Header 结束后，消息体边界由协议字段决定

Header 解析完成后，Decoder 根据状态和字段选择 Body 读取方式：

条件

解码路径

产出

没有 Body

直接结束消息

`HttpRequest`

 + `LastHttpContent`

`Content-Length: N`

固定长度读取

一个或多个 `HttpContent`

`Transfer-Encoding: chunked`

Chunk 状态机

多个 Chunk + Last

连接关闭界定

可变长度读取

直到关闭

`Content-Length` 与 `Transfer-Encoding` 的组合必须严格校验，否则容易形成请求走私：前置代理和后端若对边界理解不同，同一串字节会被切成不同请求。实际部署必须保持 Netty 版本和代理安全策略更新，并避免在业务 Handler 中自行“修复”模糊报文。

## 4\. Decoder 产出的是对象流，不保证完整请求

默认情况下，一次带 Body 的请求在 Pipeline 中类似：

`HttpRequest   HttpContent   HttpContent   LastHttpContent`

这样设计能流式处理大 Body，避免等待整条消息进入内存。文件上传、代理转发和大模型流式输入都更适合逐块消费。

业务 Handler 必须管理对象生命周期：`HttpContent` 持有引用计数 ByteBuf，消费后需要释放，转交下游则由下一层接管。使用 `SimpleChannelInboundHandler<HttpObject>` 可以在约定范围内自动释放，但若 retain 后异步使用，仍要确保最终 release。

## 5\. HttpObjectAggregator 用便利换内存

加入：

`pipeline.addLast(new HttpServerCodec());   pipeline.addLast(new HttpObjectAggregator(1024 * 1024));   pipeline.addLast(new BusinessHandler());`

业务将收到 `FullHttpRequest`，Header 和完整 Body 在一个对象中，普通 JSON API 编程更简单。但聚合意味着：在完整 Body 到达之前，连接持有累积内存。

`maxContentLength` 是安全边界，不是随手写个很大数字。估算总风险：

`峰值聚合内存 ≈ 并发上传连接数 × 单连接允许 Body 上限`

如果 1 万连接都允许聚合 10MB，理论风险远超常规堆和直接内存容量。大文件应流式落盘或转发，不应进 Aggregator。

## 6\. 解码限制是协议防线，不只是性能参数

`HttpDecoderConfig` 可以配置请求行、Header、Chunk 等限制。至少关注：

*   • `maxInitialLineLength`：限制 URI 和请求行；
    
*   • `maxHeaderSize`：限制全部 Header；
    
*   • `maxChunkSize`：控制单次产出的 Content 大小；
    
*   • Header 校验与重复 Content-Length 策略；
    
*   • Chunk 扩展与 Trailer 限制。
    

限制过小会拒绝合法请求，过大则给慢速攻击和内存消耗留下空间。应根据网关规范、业务最大 Cookie/JWT、追踪 Header 和上传协议设定，并在边缘代理与 Netty 服务保持一致。

## 7\. Encoder 需要知道响应是否包含 Body

出站通常写：

`FullHttpResponse response = new DefaultFullHttpResponse(    HTTP_1_1, OK, content);   response.headers().set(CONTENT_LENGTH, content.readableBytes());   ctx.writeAndFlush(response);`

`HttpResponseEncoder` 根据状态码、方法语义和 Header 决定是否编码 Body，以及采用固定长度还是 chunked。`HEAD`、`204`、`304` 等响应不能简单按普通 Body 处理。

`HttpServerCodec` 的 request decoder 还会记录请求方法队列，响应 encoder 可据此正确处理 HEAD 等语义。HTTP/1.1 同一连接上的请求和响应顺序不能随意打乱，否则方法与响应边界会错配。

## 8\. Keep-Alive 依赖消息边界与连接策略共同成立

HTTP/1.1 默认倾向持久连接，但前提是双方能准确知道一条消息何时结束。若响应既没有 Content-Length，也没有 chunked，往往只能靠关闭连接界定 Body，连接就无法继续复用。

服务端通常：

`boolean keepAlive = HttpUtil.isKeepAlive(request);   if (keepAlive) {    response.headers().set(CONNECTION, KEEP_ALIVE);    ctx.writeAndFlush(response);   } else {    ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);   }`

关闭动作绑定写 Future，确保响应有机会先发出。若直接 `ctx.close()`，缓冲中的最后响应可能被截断。

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

`Socket ByteBuf    -> HttpRequestDecoder state machine    -> HttpRequest    -> HttpContent...    -> LastHttpContent    -> optional HttpObjectAggregator    -> BusinessHandler    -> HttpResponse / HttpContent    -> HttpResponseEncoder    -> ByteBuf`

完整请求接口很方便，但流式对象才是 Netty 默认模型。选择是否聚合，本质是在代码简单度、内存上限与大消息能力之间取舍。

下一篇在 HTTP Pipeline 上继续前进：WebSocket 握手成功后，Netty 会动态替换 HTTP Codec，把同一条 TCP 连接从 HTTP 对象流切换成 WebSocket Frame 流。协议升级真正改变的是 Pipeline 状态，而不是创建一条“特殊网络连接”。

## 参考资料

1.  1\. Netty `HttpServerCodec.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpServerCodec.java
    
2.  2\. Netty `HttpObjectDecoder.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpObjectDecoder.java
    
3.  3\. Netty `HttpObjectAggregator.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec-http/src/main/java/io/netty/handler/codec/http/HttpObjectAggregator.java
    
4.  4\. RFC 9112 HTTP/1.1：https://www.rfc-editor.org/rfc/rfc9112

---

## 27. Netty 优雅停机源码：shutdownGracefully 的 quiet period 为什么重要（源码系列第16篇） 27. Netty 优雅停机源码：shutdownGracefully 的 quiet period 为什么重要（源码系列第16篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489616&idx=1&sn=d2acac6b447f3eb51d8c494efb760486&chksm=eb675f26dc10d6309d97adab061a4cc879f9d4e3020b9b59dd12dbdef10e9534bc183bb435d8

> `shutdownGracefully(quietPeriod, timeout)` 的语义不是“最多等待 quietPeriod”，而是停止接收新常规任务后，持续执行已有任务；只有连续 quietPeriod 没有新任务才终止，同时受 timeout 硬上限约束。真正的服务优雅下线还必须先摘除流量、关闭监听端口、处理在途请求和连接，最后才结束 EventLoop。

很多 Netty 程序在 `finally` 中调用 `bossGroup.shutdownGracefully()` 和 `workerGroup.shutdownGracefully()`，就宣称已经支持优雅停机。实际上这只处理了线程执行器的退出。若负载均衡仍在送流量、ServerChannel 仍在 accept、新请求还在进入 Pipeline，再合理的 quiet period 也无法替业务完成排水。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java`
    
*   • 重点方法：`shutdownGracefully`、`confirmShutdown`、`runAllTasks`、`cleanup`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java
    


这张图分成服务治理、Channel 生命周期和 EventLoop 三层。`shutdownGracefully` 只覆盖最下层：执行剩余任务、观察 quiet period、达到 timeout 后终止。上层的摘流量、拒绝新请求、协议通知和在途请求收敛需要应用自己编排。

## 1\. 优雅停机有三个对象，不能只关 EventLoopGroup

一个网络服务至少包含：

1.  1\. ServerChannel：监听端口并接收新连接；
    
2.  2\. Child Channels：承载已有连接和请求；
    
3.  3\. EventLoopGroup：处理 accept、I/O、任务和定时任务。
    

只关闭 Worker Group，相当于直接撤走执行连接事件的线程；只关闭 ServerChannel，可以停止新连接，但老连接仍会运行；只从注册中心摘除，已有 keep-alive 连接仍可能发送请求。

推荐顺序：

`标记实例 not-ready    -> 从负载均衡/注册中心摘流量    -> 等待传播窗口    -> 关闭 ServerChannel，停止 accept    -> 拒绝新业务请求并等待在途请求    -> 协议级通知/关闭 Child Channels    -> shutdownGracefully EventLoopGroups    -> 等待 terminationFuture    -> 进程退出`

## 2\. shutdownGracefully 先把状态推进到 SHUTTING\_DOWN

`SingleThreadEventExecutor.shutdownGracefully` 会校验参数，其中 `timeout` 不能小于 `quietPeriod`，然后通过 CAS 推进执行器状态，并保存两个时间：

`public Future<?> shutdownGracefully(        long quietPeriod, long timeout, TimeUnit unit) {    ObjectUtil.checkPositiveOrZero(quietPeriod, "quietPeriod");    if (timeout < quietPeriod) {        throw new IllegalArgumentException("timeout < quietPeriod");    }    // CAS state -> ST_SHUTTING_DOWN    gracefulShutdownQuietPeriod = unit.toNanos(quietPeriod);    gracefulShutdownTimeout = unit.toNanos(timeout);    // 确保线程启动或被唤醒，以便进入 confirmShutdown    return terminationFuture(); }`

返回的是 termination Future，不代表方法返回时线程已经退出。调用方如果必须等待资源完全释放，需要监听或同步等待这个 Future，而且等待线程不能是被关闭的 EventLoop 自己。

## 3\. quiet period 是“连续安静窗口”，会被新任务刷新

`confirmShutdown()` 的关键逻辑可概括为：

`if (runAllTasks() || runShutdownHooks()) {    if (isShutdown()) {        return true;    }    if (gracefulShutdownQuietPeriod == 0) {        return true;    }    wakeup(true);    return false;}  long nanoTime = getCurrentTimeNanos();  if (isShutdown() || nanoTime - gracefulShutdownStartTime > gracefulShutdownTimeout) {    return true;}  if (nanoTime - lastExecutionTime <= gracefulShutdownQuietPeriod) {    wakeup(true);    Thread.sleep(100);    return false;}  return true;`

只要 shutdown 期间仍执行了任务，`lastExecutionTime` 就会更新，quiet period 重新计算。这个设计给已提交的回调、关闭事件和清理任务一个收敛窗口。

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

EventLoop 上如果有一个阻塞 60 秒的 Handler，即使 shutdown timeout 是 10 秒，线程也无法在执行 Java 调用栈中途自动跳到 `confirmShutdown`。超时判断只有线程重新回到事件循环时才能发生。

这说明优雅停机的前提仍是“不阻塞 EventLoop”。如果必须控制耗时业务，应放到可取消的业务线程池，并把任务状态与 Channel 生命周期解耦。

停机问题常暴露平时的线程模型缺陷：正常运行时偶发阻塞只表现为尾延迟，发布时大量关闭与回调叠加，就会变成进程迟迟退不出去。

## 6\. ServerChannel 应先关闭，阻断新连接入口

服务端保存 bind 返回的 ChannelFuture：

`Channel serverChannel = bootstrap.bind(port).sync().channel();`

下线时先：

`serverChannel.close().sync();`

关闭监听 Channel 后，Boss 不再 accept 新连接，但已有 Child Channel 不会自动全部消失。可以用 `ChannelGroup` 管理连接集合：

`ChannelGroup channels = new DefaultChannelGroup(GlobalEventExecutor.INSTANCE);   // channelActive 时 add   channels.close().awaitUninterruptibly(drainTimeoutMillis);`

真实业务不一定立即 close 所有连接。HTTP/1.1 可在响应中加 `Connection: close`；WebSocket 可发送 Close frame；自定义协议可发送 server draining 控制消息，让客户端迁移。

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


时序图中的两个时间点最重要：`lastExecutionTime` 会因 shutdown 期间执行任务而后移，quiet period 从最后一次任务重新计算；`gracefulShutdownStartTime` 不变，最终由 timeout 限制总时长。前者追求完整，后者保证进程不会无限等待。

## 8\. Boss 和 Worker 的关闭顺序要与连接策略一致

一般先停止 Boss 接入，再处理 Worker 上的存量连接：

`serverChannel.close().sync();   drainExistingChannels();   bossGroup.shutdownGracefully(0, 10, SECONDS);   workerGroup.shutdownGracefully(2, 15, SECONDS);`

但不要机械套参数。Boss 关闭后通常任务少，可以更快结束；Worker 承载在途 I/O、Promise Listener、关闭事件和定时任务，需要更长窗口。

若 Boss 与 Worker 共享同一个 EventLoopGroup，则无法按两阶段独立控制，要靠先关闭 ServerChannel、再收敛 Child Channel 实现逻辑分层。

## 9\. 定时任务和重试是停机不能安静的常见原因

以下代码会在关闭期持续制造任务：

`void scheduleReconnect(EventLoop loop) {    loop.schedule(() -> {        connect();        scheduleReconnect(loop);    }, 1, SECONDS); }`

优雅停机需要一个上层停止标志：

`if (!draining.get()) {    scheduleReconnect(loop); }`

心跳、指标上报、配置轮询、重试、延迟写和连接保活都要审计。任务取消后还要释放捕获的 Channel、ByteBuf 和大对象引用，否则线程虽然结束，其他全局结构仍可能保留资源。

## 10\. 终止 Future 是关闭完成的证据

`shutdownGracefully` 返回 Future，`terminationFuture()` 也能表示最终状态。生产代码应将它纳入关闭协调，而不是固定 sleep：

`Future<?> bossStop = bossGroup.shutdownGracefully(0, 10, SECONDS);   Future<?> workerStop = workerGroup.shutdownGracefully(2, 20, SECONDS);      bossStop.syncUninterruptibly();   workerStop.syncUninterruptibly();`

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

`shutdownGracefully    -> state = SHUTTING_DOWN    -> wakeup EventLoop    -> run remaining tasks / shutdown hooks    -> confirmShutdown    -> quiet period satisfied OR timeout exceeded    -> cleanup    -> state = TERMINATED    -> terminationFuture complete`

Netty 负责让 EventLoop 有秩序地结束；应用负责让流量、请求、连接和业务状态有秩序地结束。两层都完成，才叫优雅停机。

下一篇进入 HTTP/1.1 Pipeline。我们会沿着 `HttpServerCodec` 看请求行、Header、Content 和 LastHttpContent 如何从字节流中拆出，以及为什么 `HttpObjectAggregator` 的便利背后是明确的内存上限和慢请求风险。

## 参考资料

1.  1\. Netty `SingleThreadEventExecutor.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/SingleThreadEventExecutor.java
    
2.  2\. Netty `MultithreadEventExecutorGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/MultithreadEventExecutorGroup.java
    
3.  3\. Netty `ChannelGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/group/ChannelGroup.java

---

## 26. Netty 空闲检测源码：IdleStateHandler 如何驱动心跳与断线判断（源码系列第15篇） 26. Netty 空闲检测源码：IdleStateHandler 如何驱动心跳与断线判断（源码系列第15篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489599&idx=1&sn=4c92ae3d97dd6af0f4f9ef904fec21e5&chksm=eb675f49dc10d65fab81408bb937b8b18cbdcaab1536b6257d49e0541e4347ce0a7b4661b34b

> `IdleStateHandler` 只负责判断“一段时间没有读、没有写或两者都没有”，并把 `IdleStateEvent` 沿 Pipeline 传播；它不等于心跳协议，也不能仅凭一次读空闲证明连接已断。可靠保活需要空闲检测、Ping/Pong、失败计数、业务 ACK 和断线重连共同闭环。

长连接最棘手的状态不是明确断开，而是“看起来还在”：网线被拔、NAT 映射失效、移动网络切换、对端进程卡死，服务端不一定立即收到 FIN 或 RST。只有持续通信或主动探测，才能在业务允许的时间内识别半开连接。

Netty 把第一层能力放在 `IdleStateHandler`：记录最近读写时间，用 EventLoop 定时检查，满足空闲条件后触发用户事件。之后是发心跳、累计失败还是关闭连接，完全由后续 Handler 决定。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java`
    
*   • 重点方法：`initialize`、`schedule`、`channelRead`、`write`、`ReaderIdleTimeoutTask.run`、`channelIdle`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java
    


图中要抓住两条路径：真实读写事件更新 `lastReadTime`、`lastWriteTime`；三个定时任务分别检查 reader、writer、all idle，满足条件后调用 `channelIdle`，默认继续 `fireUserEventTriggered`。数据事件和定时任务都在 Channel 所属 EventLoop 上串行执行。

## 1\. 三种 Idle 回答的是不同问题

构造参数通常是：

`new IdleStateHandler(readerIdle, writerIdle, allIdle, TimeUnit.SECONDS)`

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

如果服务端持续给客户端推送数据但客户端从不回应，`ALL_IDLE` 不会触发，因为一直有写；真正能发现对端无响应的是 `READER_IDLE` 或应用层 Pong 超时。反过来，如果业务请求本身很频繁，`WRITER_IDLE` 也不会触发，不需要额外心跳。

## 2\. 初始化发生在 Handler 加入或 Channel Active 时

`IdleStateHandler` 需要确保 Channel 已注册且可用，再把任务调度到正确 EventLoop。`initialize(ctx)` 的核心逻辑是记录初始时间并创建需要的定时任务：

`private void initialize(ChannelHandlerContext ctx) {    switch (state) {    case 1:    case 2:        return;    }    state = 1;    initOutputChanged(ctx);    lastReadTime = lastWriteTime = ticksInNanos();    if (readerIdleTimeNanos > 0) {        readerIdleTimeout = schedule(ctx,             new ReaderIdleTimeoutTask(ctx), readerIdleTimeNanos, NANOSECONDS);    }    if (writerIdleTimeNanos > 0) {        writerIdleTimeout = schedule(ctx,             new WriterIdleTimeoutTask(ctx), writerIdleTimeNanos, NANOSECONDS);    }    if (allIdleTimeNanos > 0) {        allIdleTimeout = schedule(ctx,             new AllIdleTimeoutTask(ctx), allIdleTimeNanos, NANOSECONDS);    } }`

`schedule` 默认调用 `ctx.executor().schedule`，也就是 ChannelHandlerContext 绑定的 EventExecutor，通常为 Channel 的 EventLoop。它没有使用上一章的独立 `HashedWheelTimer`。

这样做的价值是：定时检查和 `channelRead`、`write`、`channelInactive` 不会并发修改同一组字段。单线程串行换来了更简单的状态机。

## 3\. Reader Idle 不是周期性固定触发，而是按剩余时间校正

读取数据时，Handler 会标记正在读；`channelReadComplete` 再更新最近读时间并恢复首次事件标记。ReaderIdleTimeoutTask 到期时不会直接认定空闲，而是重新计算：

`long nextDelay = readerIdleTimeNanos;   if (!reading) {    nextDelay -= ticksInNanos() - lastReadTime;   }      if (nextDelay <= 0) {    readerIdleTimeout = schedule(ctx, this, readerIdleTimeNanos, NANOSECONDS);    IdleStateEvent event = newIdleStateEvent(READER_IDLE, firstReaderIdleEvent);    firstReaderIdleEvent = false;    channelIdle(ctx, event);   } else {    readerIdleTimeout = schedule(ctx, this, nextDelay, NANOSECONDS);   }`

这个“重新计算剩余时间”的分支很关键。定时任务可能因为 EventLoop 忙而晚执行，期间也可能刚发生读取；如果只按固定周期触发，就会把已有流量的连接误判为空闲。

## 4\. 写空闲以写 Future 完成为时间更新点

调用 `write()` 不代表真正写成功。`IdleStateHandler` 在出站写时为 Promise 添加监听器，操作完成后更新 `lastWriteTime`。这与第 11 篇 Future 的语义一致：写时间应对应完成事件，而不是业务方法进入时间。

简化逻辑：

`ctx.write(msg, promise.unvoid()).addListener(writeListener);`

监听器完成时：

`lastWriteTime = ticksInNanos();   firstWriterIdleEvent = true;   firstAllIdleEvent = true;`

如果写一直堵在 ChannelOutboundBuffer，最近写完成时间不会被虚假刷新，Writer Idle 仍有机会暴露异常。仅在业务调用点记时间，会把“持续提交但完全发不出去”误认为连接活跃。

## 5\. first 事件适合分级动作，不是只触发一次

Netty 区分首次空闲事件和后续空闲事件。第一次触发后，若仍无读写，定时任务会继续按 idle interval 重新调度并产生非 first 事件；一旦恢复读或写，对应 first 标记重置。

业务可以利用它做分级治理：

`if (evt.state() == IdleState.READER_IDLE) {    if (evt.isFirst()) {        ctx.writeAndFlush(Ping.INSTANCE);    } else if (++missedPongs >= 3) {        ctx.close();    }   }`

不过失败计数不应只依赖事件次数，因为 EventLoop 卡顿会让触发节奏变化。更稳妥的是记录最近 Pong/业务消息的时间，并用 deadline 做最终判断。

## 6\. observeOutput 能减少大消息慢写造成的误报

构造器可启用 `observeOutput`。开启后，IdleStateHandler 会观察出站缓冲进度，例如当前消息、待发送字节和 flush 进展；即使没有新 write 完成，只要底层仍在推进输出，也可以避免把连接判成真正的写空闲。

它适合大文件或大帧慢速发送场景。否则一个大消息需要很久才完成，`lastWriteTime` 长时间不更新，可能触发 Writer Idle。代价是每次检查多读取一些出站状态。

但 observeOutput 不能替代背压：只要数据还在缓慢前进，它可能抑制空闲事件；如果业务持续生产更快，内存仍会增长。第 10 篇的水位线治理仍然必须存在。

## 7\. IdleStateEvent 通过用户事件传播

默认实现：

`protected void channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)     throws Exception {    ctx.fireUserEventTriggered(evt); }`

因此业务需要在后续 Handler 的 `userEventTriggered` 中处理，而不是在 `channelRead` 中等待：

`@Override   public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {    if (evt instanceof IdleStateEvent) {        IdleStateEvent idle = (IdleStateEvent) evt;        if (idle.state() == IdleState.WRITER_IDLE) {            ctx.writeAndFlush(Ping.INSTANCE);            return;        }    }    ctx.fireUserEventTriggered(evt); }`

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

`ACTIVE    -> writer idle: send Ping    -> Pong received: ACTIVE    -> reader idle once: SUSPECT    -> subsequent miss: retry probe    -> threshold/deadline reached: close    -> reconnect with backoff`

对于必须快速失败的交易连接，阈值可以更紧；对于移动端聊天，阈值要容忍网络切换。框架不可能替业务选择。

## 10\. Handler 的位置决定什么算“有效读写”

`IdleStateHandler` 放在 Pipeline 的位置会影响它观察哪些事件。若放在协议 Decoder 前，它看到原始字节；放在业务 Handler 前，它看到解码后的消息，但底层字节是否传播到这里取决于前置 Handler。

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

`IdleStateHandler` 主链：

`handlerAdded / channelActive    -> initialize    -> EventLoop.schedule    -> read/write updates timestamp    -> timeout task recalculates nextDelay    -> IdleStateEvent    -> userEventTriggered    -> Ping / count / close / reconnect`

空闲检测只回答“多久没有活动”；应用层心跳回答“对端是否还能处理协议”；重连和会话恢复回答“断开后怎样继续业务”。把三层分开，连接治理才不会被一个 Handler 名称误导。

下一篇讨论优雅停机：为什么 `shutdownGracefully()` 不是立即停线程，quiet period 为什么会被新任务重新计时，以及服务发布时怎样先摘流量、关 Channel，再结束 EventLoop。

## 参考资料

1.  1\. Netty `IdleStateHandler.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateHandler.java
    
2.  2\. Netty `IdleStateEvent.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/handler/src/main/java/io/netty/handler/timeout/IdleStateEvent.java
    
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

`Selector.select(timeout)` 返回 0 完全可能是正常行为，例如：

*   • timeout 到期但没有 I/O；
    
*   • 其他线程调用 `wakeup()`；
    
*   • EventLoop 收到新任务；
    
*   • 当前线程被中断；
    
*   • deadline 已经接近，Netty 主动缩短等待；
    
*   • selectStrategy 决定立即轮询。
    

空轮询 Bug 的危险特征是：没有事件、没有任务、没有超时到期，也没有唤醒原因，select 仍连续快速返回。EventLoop 的 `for (;;)` 因此变成用户态忙循环，一条线程就能占满一个 CPU 核心。

所以检测不能写成：

`if (selectedKeys == 0) {    rebuildSelector(); }`

那会在正常空闲连接上频繁重建，制造更严重的抖动。

## 2\. selectCnt 是“无法解释的提前返回”计数

`NioEventLoop.select` 中维护 `selectCnt`。每次 select 返回后，源码先检查是否存在合理原因；合理则结束或清零，不合理才继续累加。

简化主线：

`int selectCnt = 0;   for (;;) {    int selectedKeys = selector.select(timeoutMillis);    selectCnt++;    if (selectedKeys != 0 || oldWakenUp || wakenUp.get() ||        hasTasks() || hasScheduledTasks() || Thread.interrupted()) {        selectCnt = 0;        break;    }    if (unexpectedSelectorWakeup(selectCnt)) {        selectCnt = 0;        break;    }   }`

真实源码还处理 deadline、selectStrategy 和执行过任务等分支。核心判断始终一样：计数器描述的不是“空事件次数”，而是“没有充分理由的异常唤醒次数”。

这个语义对监控也很重要。`selectedKeys=0` 的次数高不一定异常；应该关注极短间隔连续返回、EventLoop 空转循环速率和重建日志。

## 3\. 自动重建阈值是防误判的时间窗口

Netty 使用系统属性 `io.netty.selectorAutoRebuildThreshold` 配置自动重建阈值，并对过小的正数做保护。达到阈值时，`unexpectedSelectorWakeup` 触发 `rebuildSelector()`。

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

外部线程可以调用 `NioEventLoop.rebuildSelector()`，但真正迁移不能和 I/O 线程并发修改注册状态。源码先判断线程归属：

`public void rebuildSelector() {    if (!inEventLoop()) {        execute(() -> rebuildSelector0());        return;    }    rebuildSelector0(); }`

这和前面 Future、Pipeline 的线程原则一致：一个 Channel 的注册、interestOps 和事件处理应在所属 EventLoop 串行推进。管理线程只负责发命令，不直接动 Selector 内部结构。

## 5\. 重建的本质是迁移 SelectionKey，不是重连 Socket

`rebuildSelector0()` 创建新的 Selector，然后遍历旧 Selector 的 keys。每个 key 的 attachment 通常是 `AbstractNioChannel` 或内部任务。迁移步骤可以概括为：

`Selector oldSelector = selector;   Selector newSelector = openSelector();      for (SelectionKey key : oldSelector.keys()) {    Object attachment = key.attachment();    if (!key.isValid() || key.channel().keyFor(newSelector) != null) {        continue;    }    int interestOps = key.interestOps();    key.cancel();    SelectionKey newKey = key.channel().register(newSelector, interestOps, attachment);    if (attachment instanceof AbstractNioChannel) {        ((AbstractNioChannel) attachment).selectionKey = newKey;    }  }      selector = newSelector;   oldSelector.close();`

底层 SocketChannel 没有关闭，TCP 连接也没有重新握手；变化的是 Channel 注册在哪个 Selector 上。成功迁移后，业务通常只感受到短暂事件处理延迟。

失败分支必须单独处理：某个 Channel 注册新 Selector 失败时，Netty 会关闭该 Channel 或执行对应任务的异常处理，避免它处于“旧 key 已取消、新 key 又不存在”的悬挂状态。

## 6\. selectedKeys 优化与 Selector 重建是两件事

Netty 可能通过反射把 JDK Selector 内部 selectedKeys 集合替换为数组结构，以降低遍历和删除成本。这个优化和空轮询重建经常被放在一起讲，但解决的问题不同：

*   • selectedKeys 优化：减少就绪 key 集合的对象和遍历开销；
    
*   • Selector 重建：恢复异常的阻塞选择行为；
    
*   • `selectAgain`：在处理过程中重新 selectNow，刷新已取消或新增的 key 状态。
    


排障时不能看到 `SelectedSelectionKeySet` 就认为已解决空轮询，也不能因重建日志出现就断定 selectedKeys 优化失效。

## 7\. 迁移期间为什么不会同时由两个 Selector 处理

迁移发生在 EventLoop 线程内，当前线程不会同时执行旧 Selector 的 selected key 处理。对每个 key，流程是读取 interestOps、取消旧 key、注册新 Selector、更新 Channel 的 `selectionKey` 引用。最后统一替换 selector 字段并关闭旧对象。

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
    


Selector 空轮询的线程栈常频繁出现在 `NioEventLoop.select` 与循环附近，但抓一次栈不够。应该连续采样：如果栈不断在业务 Handler 或任务执行中，问题不在 Selector；如果没有就绪事件和任务，select 又持续快速返回，才符合空轮询特征。

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

`NioEventLoopGroup.rebuildSelectors()` 可让所有 NioEventLoop 重建 Selector，但它更适合明确故障下的应急和诊断，不适合定时执行。

频繁手动重建会带来：

*   • 遍历和重新注册全部 Channel；
    
*   • 短暂增加 I/O 延迟；
    
*   • 放大大连接数实例的 CPU 抖动；
    
*   • 掩盖真实 Handler 或任务队列问题；
    
*   • 在迁移异常时关闭个别 Channel。
    


合理策略是保留自动保护，监控重建次数，出现重建时采集线程栈、JDK 版本、内核、容器和负载证据。把重建当成故障信号，而不是正常维护动作。

## 11\. Selector 重建体现的是“用状态迁移替代进程重启”

源码主链如下：

`blocking select    -> unexpected premature return    -> selectCnt++    -> threshold reached    -> rebuildSelector0    -> open new Selector    -> migrate SelectionKeys    -> update Channel.selectionKey    -> swap selector    -> close old Selector`

Netty 没有选择让 EventLoop 带病空转，也没有粗暴关闭全部连接，而是替换故障调度器并保留 Socket。这种局部状态迁移是高可用网络框架的重要设计：隔离有问题的基础设施对象，尽可能保住业务连接。

下一篇进入连接保活。`IdleStateHandler` 并不会替你发送万能心跳，它只在 EventLoop 上调度读空闲、写空闲和全空闲检查，并通过用户事件传播状态。心跳协议、失败阈值和关闭策略仍要由业务定义。

## 参考资料

1.  1\. Netty `NioEventLoop.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoop.java
    
2.  2\. Netty `NioEventLoopGroup.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/NioEventLoopGroup.java
    
3.  3\. Java `Selector` API：https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html

---

## 24. Netty 原生传输源码：Epoll 与 KQueue 到底快在哪里（源码系列第13篇） 24. Netty 原生传输源码：Epoll 与 KQueue 到底快在哪里（源码系列第13篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489563&idx=1&sn=24b8d9a22195e29aa31de6e64d5321b0&chksm=eb675f6ddc10d67b58228751cae5c6a7efebd51ce32d03bd3c708cb5748e557fc22242c9ccda

> Netty Native Transport 的价值不只是“比 JDK NIO 快”。它绕过 Java Selector 的适配层，直接使用 epoll/kqueue，减少部分转换和系统调用开销，更重要的是暴露 `TCP_CORK`、`SO_REUSEPORT`、Unix Domain Socket、边沿触发等平台能力。是否切换应由压测和功能需求决定，而不是看到 Linux 就默认替换。

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

`EventLoopGroup group = new NioEventLoopGroup();   bootstrap.group(group)            .channel(NioServerSocketChannel.class);`

Linux Epoll 对应：

`EventLoopGroup group = new EpollEventLoopGroup();   bootstrap.group(group)            .channel(EpollServerSocketChannel.class);`

macOS/BSD KQueue 对应：

`EventLoopGroup group = new KQueueEventLoopGroup();   bootstrap.group(group)            .channel(KQueueServerSocketChannel.class);`

替换看似只有两行，背后却同时改变：事件循环实现、Socket Channel 实现、配置项、就绪事件表示、文件描述符管理和 native 库加载。Pipeline 之所以能复用，是因为这些实现仍遵循 `Channel`、`EventLoop` 和 `ChannelConfig` 契约。

## 2\. EpollEventLoop 直接等待事件数组和 timerfd

`EpollEventLoop` 的等待路径会根据是否存在定时任务、是否需要立即轮询，选择不同的 `epollWait` 方式。核心调用可概括为：

`private long epollWait(long deadlineNanos) throws IOException {    if (deadlineNanos == NONE) {        return Native.epollWait(epollFd, events, timerFd, -1, -1);    }    int delaySeconds = ...;    int delayNanos = ...;    return Native.epollWait(epollFd, events, timerFd,                delaySeconds, delayNanos,                EPOLL_WAIT_MILLIS_THRESHOLD); }`

`Native.epollWait` 再进入 JNI 和 C 实现。EventLoop 持有 `epollFd`、`eventFd`、`timerFd` 和 `EpollEventArray`：

*   • `epollFd` 管理被监听的文件描述符；
    
*   • `eventFd` 用于跨线程唤醒 EventLoop；
    
*   • `timerFd` 协调下一次定时任务 deadline；
    
*   • `EpollEventArray` 批量接收就绪事件。
    


它避免了 JDK `SelectionKey` 对象模型中的部分映射与兼容路径，Netty 可以针对 Linux 行为直接优化。但 JNI 仍有边界成本，native 也不是“零开销”。最终收益取决于连接数、事件密度、报文大小和 JDK 版本。

## 3\. KQueue 的结构相似，但事件语义不是 Epoll 的复制品

`KQueueEventLoop` 使用 `kevent` 等待变化列表与事件列表：

`int numEvents = Native.keventWait(    kqueueFd.intValue(), changeList, eventList, timeoutSec, timeoutNs);`

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

*   • `SO_REUSEPORT`：多个 Socket 绑定同一地址，由内核分配连接；
    
*   • `TCP_CORK`：控制小包聚合时机；
    
*   • `TCP_QUICKACK`：影响延迟确认策略；
    
*   • Unix Domain Socket：同机进程通信；
    
*   • 边沿触发模式；
    
*   • 更丰富的 TCP keepalive 参数；
    
*   • splice 等 Linux 零拷贝相关能力。
    


这些能力通过 `EpollChannelOption`、专用 Channel 或 native API 暴露。若业务恰好需要它们，选择 native transport 是功能决策；若只是普通 HTTP 服务，则必须用端到端压测证明收益。

## 5\. 边沿触发能减少重复通知，也提高读尽责任

Epoll 支持水平触发与边沿触发。水平触发下，只要 fd 仍可读，就会继续通知；边沿触发更像状态变化通知，应用收到事件后应尽量读到 `EAGAIN`。

Netty 的读循环和 `RecvByteBufAllocator.Handle.continueReading()` 共同承担“是否继续读”。边沿触发并不意味着可以随意一次只读一个消息，否则剩余数据可能等不到新的边沿变化。

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

不要把边沿触发当成一个孤立性能参数。它会和 `AUTO_READ`、读配额、单连接公平性、业务背压共同作用。

## 6\. 新连接接入仍会进入同一套 Pipeline 契约

Epoll 服务端接入连接时，`AbstractEpollServerChannel` 从 native accept 得到 fd，再创建子 Channel：

`int socket = socket.accept(acceptedAddress);   if (socket >= 0) {    allocHandle.lastBytesRead(socket);    pipeline.fireChannelRead(        newChildChannel(socket, acceptedAddress, 1, acceptedAddress[0]));    return 1; }`

这里和第 3 篇 NIO Accept 主链形成对应：底层 accept 方式不同，但新子 Channel 仍作为入站消息进入父 Pipeline，随后由 `ServerBootstrapAcceptor` 配置并注册到 Worker。上层扩展点没有因为 native 而消失。

这也是迁移时通常无需重写业务 Handler 的原因。真正需要审计的是 ChannelOption、native 依赖、平台行为和运维指标。

## 7\. 零拷贝能力必须结合 TLS 和协议层判断

Native Transport 可能提供 `FileRegion`、splice 等减少数据复制的路径，但“使用 native 就自动零拷贝”是错误结论。

典型限制包括：

*   • TLS 需要加密，明文文件通常不能直接绕过用户态；
    
*   • 协议需要压缩或改写数据时必须处理内容；
    
*   • 小文件的系统调用优化可能被调度和对象成本抵消；
    
*   • 容器、内核版本和文件系统会影响结果。
    

应按真实链路压测：静态大文件、明文 TCP、低业务处理比例，更可能看到明显收益；小 JSON 请求、复杂编解码和数据库占主导时，传输层差异可能不是瓶颈。


图中应重点看“平台不同、上层归一”：EpollEventLoop 从事件数组取出 fd 和 flag，KQueueEventLoop 从 event list 取出 filter 与 ident，最终都定位 Channel 并触发读、写或关闭处理。业务 Handler 看到的仍是同一套 Channel 事件。

## 8\. 可用性检测与回退必须在启动时完成

Native 库可能因为操作系统、CPU 架构、分类器、libc 或加载路径不匹配而不可用。启动时应先检查：

`if (Epoll.isAvailable()) {    // EpollEventLoopGroup + EpollServerSocketChannel   } else {    log.warn("epoll unavailable", Epoll.unavailabilityCause());    // 明确回退 NIO，或按部署要求拒绝启动   }`

生产环境不要静默回退。若性能容量是按 Epoll 测出的，某个实例悄悄使用 NIO，会造成难解释的延迟和 CPU 差异。至少把 transport 类型、native 库版本和不可用原因暴露为启动日志与指标标签。

## 9\. 依赖选择要匹配平台与打包方式

常见故障不是代码错误，而是依赖没有把正确 native artifact 打进镜像。需要检查：

1.  1\. Linux 是 glibc 还是 musl；
    
2.  2\. CPU 是 x86\_64 还是 aarch64；
    
3.  3\. shaded/fat jar 是否保留 native 资源；
    
4.  4\. 容器运行平台是否和构建平台一致；

5.  5\. Netty 各模块版本是否统一；
    
6.  6\. 安全扫描是否要求升级 native 组件。
    


建议在 CI 中对目标镜像运行最小启动测试，实际执行 `Epoll.isAvailable()` 或 `KQueue.isAvailable()`，不要只靠 Maven 依赖树判断。

## 10\. 是否切换应看四组证据

选择 Native Transport 时至少比较：

*   • 吞吐：请求数、消息数、网络带宽；
    
*   • 延迟：P50、P99、P999 和最大停顿；
    
*   • 资源：EventLoop CPU、系统 CPU、上下文切换、直接内存；
    
*   • 稳定性：长时间连接抖动、fd 增长、native 崩溃和部署失败率。
    


测试必须使用真实协议、TLS 配置、连接数、消息大小和容器限制。只跑一个 echo benchmark 得出的结论，不能直接用于生产 RPC 或网关。

## 11\. Native Transport 的最终判断

主链可以归纳为：

`Epoll/KQueue EventLoop   -> native wait   -> event array   -> fd / Channel mapping   -> unsafe read/write/close   -> ChannelPipeline   -> business handler`

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

> `HashedWheelTimer` 的优势不是“定时更精确”，而是用固定刻度、环形桶和剩余轮数，把大量近似超时任务的调度成本摊薄。它适合连接超时、请求超时、重试和心跳检测，却不适合高精度调度，也不应该每个连接创建一个实例。

长连接系统里，真正让定时器变重的往往不是单个任务，而是任务数量：十万连接各有读空闲检测，几十万请求各有超时，失败重试又持续创建新任务。如果每次插入都维护一个严格有序的数据结构，任务增加会不断放大调度成本。

时间轮的取舍很明确：把时间切成离散刻度，允许到期时间存在一个 tick 量级的误差，换取接近常数时间的任务落桶和批量过期。理解这个取舍，才能知道它为什么适合网络超时，又为什么不能代替精密调度器。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`common/src/main/java/io/netty/util/HashedWheelTimer.java`
    
*   • 重点类与方法：`HashedWheelTimer`、`newTimeout`、`Worker.run`、`transferTimeoutsToBuckets`、`HashedWheelBucket.expireTimeouts`
    
*   • 官方源码：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/HashedWheelTimer.java
    


这张图展示了时间轮的三个核心对象：提交线程只把 `HashedWheelTimeout` 放进 MPSC 队列，Worker 线程在每个 tick 把任务转移到对应 Bucket，指针走到某个槽位时再检查剩余轮数并执行到期任务。提交和执行没有争抢同一条有序链表，正是低成本的来源。

## 1\. 时间轮优化的是“大量近似超时”，不是单次定时精度

`HashedWheelTimer` 可以看成钟表：`wheel` 是表盘，`tickDuration` 是每格时间，`tick` 是当前走过的格数。一个任务的截止时间会映射到某个槽位；如果截止时间超过一整轮，再用 `remainingRounds` 记录还要多转几圈。

假设：

*   • 每格 100ms；
    
*   • 一共 512 格；
    
*   • 一圈约 51.2 秒；
    
*   • 某任务 125 秒后到期。
    

它会落到一个确定槽位，同时记录还需要经过若干完整轮次。Worker 每次经过该槽时先减少 `remainingRounds`，归零后才真正执行。任务不需要因为时间很远就占据一棵全局排序树的高层节点。

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

`newTimeout` 没有直接修改 wheel 中的双向链表。源码主路径可精简为：

`public Timeout newTimeout(TimerTask task, long delay, TimeUnit unit) {   long pendingTimeoutsCount = pendingTimeouts.incrementAndGet();   if (maxPendingTimeouts > 0 && pendingTimeoutsCount > maxPendingTimeouts) {        pendingTimeouts.decrementAndGet();        throw new RejectedExecutionException("Number of pending timeouts ...");   }      start();   long deadline = System.nanoTime() + unit.toNanos(delay) - startTime;   HashedWheelTimeout timeout = new HashedWheelTimeout(this, task, deadline);   timeouts.add(timeout);   return timeout; }`

这段源码证明了两个设计点。

第一，调用线程负责构造任务并进入无锁队列，避免多个业务线程同时操作 Bucket 链表。第二，`maxPendingTimeouts` 是容量保护；如果不设上限，业务故障可能以“不断创建超时任务”的方式转化为堆内存压力。

取消任务也采用相似思路：调用方标记取消并进入 `cancelledTimeouts` 队列，Worker 再统一从 Bucket 移除。所有结构性修改集中在 Worker 线程，降低了锁和竞态复杂度。

## 3\. deadline 通过掩码映射槽位，remainingRounds 表示完整圈数

时间轮长度会被规范成 2 的幂，因此槽位映射可以使用按位与：

`long calculated = timeout.deadline / tickDuration;   timeout.remainingRounds = (calculated - tick) / wheel.length;   long ticks = Math.max(calculated, tick);   int stopIndex = (int) (ticks & mask);   wheel[stopIndex].addTimeout(timeout);`

`mask = wheel.length - 1`。当长度是 2 的幂时，`ticks & mask` 等价于取模，但计算更直接。`Math.max(calculated, tick)` 则处理已迟到的任务：即使 deadline 因排队或线程停顿已经过去，也会放到当前可处理的槽位，而不是落回历史刻度。

需要特别注意，O(1) 是“定位槽位”的复杂度，不代表到期处理永远 O(1)。如果大量任务集中在同一个槽位，Worker 到该 tick 仍要遍历整个 Bucket。业务把百万任务设为同一秒到期，会形成明显的到期尖峰。

## 4\. Worker 每个 tick 只做四件事

`Worker.run()` 的主循环非常克制：

`while (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_STARTED) {   final long deadline = waitForNextTick();   if (deadline > 0) {        int idx = (int) (tick & mask);        processCancelledTasks();        HashedWheelBucket bucket = wheel[idx];        transferTimeoutsToBuckets();        bucket.expireTimeouts(deadline);        tick++;   } }`

可以概括成：等待下一格、处理取消、搬运新增任务、过期当前桶。`transferTimeoutsToBuckets` 每轮还有搬运上限，避免提交洪峰让 Worker 一直搬任务而无法推进时间。

`expireTimeouts` 遍历当前桶：

*   • 已取消：移除；
    
*   • `remainingRounds > 0`：减一，继续等待下一轮；
    
*   • deadline 已到：从桶移除并执行；
    
*   • deadline 未到：说明内部状态异常，源码会报错保护。
    

任务的 `TimerTask.run(timeout)` 就在 Worker 线程执行。因此一个慢任务会拖迟同一个 Timer 上的其他超时。这一点和 EventLoop 阻塞非常相似：定时器只负责触发，不是耗时业务线程池。

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

Netty 里还有 `EventLoop.schedule`。它来自 `AbstractScheduledEventExecutor`，内部使用按 deadline 排序的优先队列，并由 EventLoop 自己执行。两者不能混为一谈。

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

`IdleStateHandler` 默认使用前者，因为空闲状态和 Channel 事件需要在同一 EventLoop 传播。连接池、客户端请求超时管理器等框架组件可能使用共享时间轮，因为它们面对的是跨 Channel 的大规模超时集合。

不要为了“用了 Netty”就把所有定时任务都改成时间轮。选择标准是任务数量、精度要求和线程归属。


这张状态图强调了 `newTimeout` 之后任务并未立即进入 Bucket；Worker 搬运后，任务随 tick 多次经过目标槽位，`remainingRounds` 逐轮减少。取消和到期互斥，最终都要从 Bucket 删除并减少 pending 计数。

## 7\. 一个 Timer 应被共享，而不是绑定每个连接

`HashedWheelTimer` 的每个实例都会创建一个 Worker 线程和一套 wheel。源码还会对创建过多实例给出资源泄漏警告。正确用法通常是在组件或进程级共享：

`public final class TimeoutManager {    private final HashedWheelTimer timer =         new HashedWheelTimer(100, TimeUnit.MILLISECONDS, 512);    public Timeout register(RequestContext request, long timeoutMs) {        return timer.newTimeout(t -> request.tryTimeout(),                         timeoutMs, TimeUnit.MILLISECONDS);   } }`

请求提前完成时必须取消对应 Timeout，否则任务仍会留到目标槽位才被清理。取消不是为了阻止已经完成的业务，而是为了尽快减少定时器中的无效对象和到期扫描成本。

同时，`tryTimeout()` 必须幂等。真实系统里正常响应、超时、连接关闭可能并发竞争，最终只能有一个路径完成请求状态。这和上一篇 Promise 的“一次完成”原则完全一致。

## 8\. 定时任务堆积通常来自业务生命周期不闭环

线上看到 pending timeout 持续增长，不要第一反应就是时间轮泄漏。常见根因包括：

1.  1\. 请求成功后没有取消超时任务；
    
2.  2\. 重试每次创建新 Timeout，却没有取消前一轮；
    
3.  3\. 连接断开后批量任务仍引用 Channel 和业务上下文；
    
4.  4\. Worker 任务阻塞，过期速度低于创建速度；
    
5.  5\. 同一截止时间任务过多，单个 Bucket 形成尖峰；
    
6.  6. `maxPendingTimeouts` 没有限制，异常流量无限进入。
    

排查时至少记录：pending 数量、每秒创建/取消/过期数、任务执行耗时、单桶过期批量、超时延迟分布和拒绝次数。仅看“定时器线程 CPU”不足以定位生命周期问题。

## 9\. 超时回调只做状态竞争，耗时动作交给别处

推荐把超时任务写成轻量状态转换：

`timer.newTimeout(timeout -> {    if (requestPromise.tryFailure(new TimeoutException())) {        eventLoop.execute(() -> channel.writeAndFlush(timeoutResponse));    }   }, timeoutMillis, TimeUnit.MILLISECONDS);`

这里有两条线程边界：时间轮 Worker 决定请求是否抢到超时完成权；与 Channel 相关的写和关闭动作回到 EventLoop。不要在 TimerTask 中直接做阻塞 RPC、数据库访问、大对象序列化或批量日志。

如果回调需要取消其他任务，也要避免形成长链递归。时间轮的优势建立在每个过期任务足够轻的前提上；一旦回调变成业务执行器，所有 deadline 都会被前一个慢任务拖延。

## 10\. 停止 Timer 要处理未过期任务

`stop()` 不等于“等待所有任务执行”。停止后 Worker 会退出，并返回尚未处理的 Timeout 集合。组件关闭时应该明确决定：

*   • 未到期请求是统一失败，还是交给其他实例接管；
    
*   • 是否还允许新任务提交；
    
*   • 先停止业务入口，还是先停止 Timer；
    
*   • 如何释放 Timeout 引用的 Channel、Buffer 和上下文。
    

正确顺序通常是先停止新流量，完成或失败在途请求，再停止时间轮。直接停 Timer 会让依赖超时回收的请求永久悬挂。

## 11\. 时间轮的工程边界可以归纳为四条

时间轮主链如下：

`newTimeout   -> timeouts MPSC queue   -> Worker transferTimeoutsToBuckets   -> deadline / tickDuration   -> stopIndex + remainingRounds   -> waitForNextTick   -> bucket.expireTimeouts   -> TimerTask.run`

落地时记住四条：共享实例、限制 pending、回调轻量、状态幂等。时间轮解决的是大量超时任务的调度结构，不会自动解决请求生命周期、慢回调和关闭顺序。

下一篇进入操作系统边界：Epoll 与 KQueue 为什么不只是把 Selector 换了名字，它们如何通过 native Channel、事件数组和平台能力暴露 Linux/BSD 特性，以及什么时候值得为性能和功能承担平台绑定。

## 参考资料

1.  1\. Netty `HashedWheelTimer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/HashedWheelTimer.java
    
2.  2\. Netty `AbstractScheduledEventExecutor.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/AbstractScheduledEventExecutor.java
    
3.  3\. Netty Timer API：https://netty.io/4.1/api/io/netty/util/Timer.html

---

## 22. Netty 异步结果源码：Future、Promise 与 Listener 如何串起回调（源码系列第11篇） 22. Netty 异步结果源码：Future、Promise 与 Listener 如何串起回调（源码系列第11篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489545&idx=1&sn=569bceff733d78b96474100345d42802&chksm=eb675f7fdc10d6692b18f10dd9f58625e52476b2c383a3f73de5ff26cc6d6e7b051e827d8a31

> Netty 的 `Future` 不是 JDK `Future` 的简单包装，而是把“异步 I/O 结果、完成状态、监听器回调、EventLoop 线程归属”合在一起的通知机制。`Promise` 负责写入结果，`Future` 负责暴露状态，`Listener` 负责非阻塞续流程；如果在 EventLoop 里阻塞等待 Future，就等于让完成这个 Future 的线程停下来，死锁和吞吐抖动都会从这里开始。

前 10 篇已经把 Netty 的连接、读写、Pipeline、ByteBuf、写缓冲和背压串起来了。现在还缺一块：一次 `bind()`、`connect()`、`writeAndFlush()` 返回的结果到底怎样通知业务？为什么 Netty 官方一直强调“优先使用 `addListener`，不要在 I/O 线程里 `await`”？为什么有些回调明明是业务线程添加的，最后却在 EventLoop 上执行？

这不是 API 使用细节，而是 Netty 异步模型的核心边界。Netty 的 I/O 调用通常立即返回一个 `ChannelFuture`，它表示“操作已经提交”，不表示“操作已经完成”。操作完成后，内部持有写权限的一方会通过 `Promise` 设置成功或失败；此前注册的 `Listener` 会被通知，并且通知线程通常由关联的 `EventExecutor` 决定。对 Channel I/O 来说，这个执行器大多就是 Channel 绑定的 EventLoop。

源码基线：

*   • 项目：Netty
    
*   • 版本：`netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：
    

*   • `common/src/main/java/io/netty/util/concurrent/Future.java`
    
*   • `common/src/main/java/io/netty/util/concurrent/Promise.java`
    
*   • `common/src/main/java/io/netty/util/concurrent/DefaultPromise.java`
    
*   • `transport/src/main/java/io/netty/channel/ChannelFuture.java`
    
*   • `transport/src/main/java/io/netty/channel/DefaultChannelPromise.java`
    

*   • 官方源码：
    

*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/DefaultPromise.java
    
*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelFuture.java
    
*   • https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPromise.java
    


这张图可以按职责分界理解：用户拿到的是 `ChannelFuture`，真正能设置结果的是 `Promise`；结果写入后不是让调用线程阻塞返回，而是通过 `notifyListeners` 把后续逻辑交给 Listener。Listener 是否立即执行，取决于当前线程是不是 Promise 绑定的 `EventExecutor` 线程，以及当前回调栈深度是否安全。

## 1\. Future 是只读结果，Promise 是可写结果

Netty 把异步结果拆成两面：对外暴露 `Future`，对内持有 `Promise`。这件事的工程价值很直接：业务可以观察结果，但不能随意篡改 I/O 操作的完成状态；内部 I/O 流程可以在真正完成时设置成功或失败。

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

`bind/connect/write/close` 返回

关联一个 Channel，表示 I/O 操作结果

不表示调用返回时已经完成

`ChannelPromise`

Channel I/O Promise

出站写、注册、关闭等内部流程

携带 Channel，并由 I/O 流程完成

不应跨连接混用

`ChannelFuture` 的官方注释已经把这个边界说得很清楚：Netty 的 I/O 操作是异步的，调用返回时不保证请求的 I/O 已完成，调用方拿到的是一个能表示结果或状态的 `ChannelFuture`。这也是为什么下面这段代码存在隐患：

`ChannelFuture f = channel.writeAndFlush(msg);   if (f.isSuccess()) {    // 很可能不会进入：此时 write 只是提交，I/O 还没完成   }`

正确的思路是把“完成之后要做什么”放进 Listener：

`channel.writeAndFlush(msg).addListener(f -> {    if (!f.isSuccess()) {         log.warn("write failed", f.cause());    }   });`

这里的关键不是 Lambda 语法，而是控制流从“同步判断”变成了“完成通知”。Netty 的吞吐能力很大程度上来自这个模型：I/O 线程不为单个操作停住，业务线程也不必为了等网络写完而占住调用栈。

## 2\. ChannelFuture 承诺的是状态机，不是同步返回值

`ChannelFuture` 最容易被误用的地方，是把它当成一个“马上有结果”的对象。实际上它的状态机只有两个阶段：未完成，已完成；已完成再细分为成功、失败和取消。失败与取消也属于完成状态，这一点对排障很重要。

简化状态如下：

`Uncompleted   -> Completed successfully   -> Completed with failure   -> Completed by cancellation`

这带来三个直接结论：

1.  1. `isDone()` 只说明操作结束，不说明成功。
    
2.  2. `isSuccess()` 才说明成功结束。
    
3.  3. `cause()` 只有失败时才有意义，未完成时读取会误导排查。
    

连接和写出场景尤其要注意：

`ChannelFuture f = bootstrap.connect(host, port);   f.addListener(future -> {    if (future.isSuccess()) {         // 连接建立后再发送首包      }  else {         // 这里才能可靠拿到连接失败原因      }   });`

如果用 `await(timeout)` 做连接超时判断，还会踩另一个坑：`await` 的超时只是“等待 Future 完成的超时”，不是 I/O 操作本身的超时。连接超时应通过 `ChannelOption.CONNECT_TIMEOUT_MILLIS` 这类 I/O 配置控制。等待超时后 Future 可能仍未完成，此时读 `cause()` 可能得到空值，并不代表连接没有异常。

这一点在线上很常见：日志里出现“连接失败但没有 cause”，多数不是 Netty 丢了异常，而是业务在 Future 未完成时提前判断。

## 3\. DefaultPromise 用一次 CAS 锁定最终结果

`DefaultPromise` 是这篇文章的核心类。它保存结果、保存监听器、处理等待者，并决定 Listener 如何被触发。

源码中有几个关键字段：

`volatile Object result;   EventExecutor executor;   listener / listeners;   waiters;   notifyingListeners;`

按源码逻辑精简后，完成 Promise 的核心路径可以写成：

`setSuccess(result)   -> setValue0(resultOrSuccessMarker)   -> CAS(null or UNCANCELLABLE, finalResult)   -> notify waiters   -> notifyListeners()`

真实源码里，`setValue0` 使用 `AtomicReferenceFieldUpdater` 对 `result` 做 CAS：只有从“未完成”或“不可取消但未完成”变成最终结果的线程能成功。成功后才会唤醒阻塞等待者，并通知 Listener。第二次完成会失败：`trySuccess` 返回 false，`setSuccess` 抛出“已经完成”的异常。

这个设计解决两个问题：

*   • 并发完成时只能有一个结果。I/O 成功、超时失败、关闭失败不可能同时成为最终状态。
    
*   • 完成动作和回调通知分离。结果先落到 `result`，通知只是后续传播动作。
    

工程上要避免自己重复完成 Promise：

`if (!promise.trySuccess()) {    // 已被其他路径完成，不要再 setFailure 覆盖   }`

如果扩展 Netty Handler 或写自定义异步组件，优先用 `trySuccess/tryFailure` 处理竞态。`setSuccess/setFailure` 更适合你能证明只有一个完成路径的场景；否则线上偶发 `complete already` 会很难看，因为它通常只在异常、超时、关闭同时发生时暴露。

## 4\. Listener 先被缓存，完成后再按 EventExecutor 通知

Listener 的注册和执行不是同一个动作。`addListener` 只是把监听器放入 Promise；如果此时 Promise 已经完成，再触发通知。这个设计保证了两种顺序都能工作：

`先 addListener，后完成：完成时通知   先完成，后 addListener：添加后立即安排通知`

按源码逻辑简化：

`addListener(listener)   -> synchronized 保存 listener   -> 如果 isDone，调用 notifyListeners()`

这里有两个细节值得注意。

第一，Listener 保存受锁保护，但结果完成用 CAS。Netty 没有用一把大锁把所有状态都串起来，而是把“结果一次性完成”和“监听器集合维护”分开处理。这样完成路径足够轻，监听器集合又能维持顺序和可见性。

第二，Listener 在通知时会被取出并清空。如果通知过程中又新增 Listener，`notifyListenersNow` 会继续下一轮，直到没有新 Listener。这个细节避免了回调里继续注册回调时丢事件，但也意味着 Listener 链可以形成很深的嵌套。

因此 Listener 应保持短小：

`future.addListener(f -> {    if (!f.isSuccess()) {         metrics.writeFailed();         log.warn("write failed", f.cause());    }   });`

不要在 Listener 里做重 CPU、阻塞数据库调用、同步 RPC 或长时间循环。它不是“业务线程池回调”，它大概率就在 EventLoop 上执行。阻塞 Listener 的效果，和阻塞 `channelRead` 没本质区别：同一个 EventLoop 上的其他 Channel 也会被拖慢。

## 5\. 回调线程由 executor 决定，ChannelPromise 默认绑定 EventLoop

`DefaultPromise` 构造时可以带一个 `EventExecutor`。`DefaultChannelPromise` 更进一步：如果没有显式传 executor，它的 `executor()` 会回退到 `channel().eventLoop()`。

按源码逻辑整理：

`DefaultChannelPromise.executor()   -> super.executor()   -> 如果为空，返回 channel().eventLoop()`

这解释了一个常见现象：业务线程调用 `channel.writeAndFlush(msg).addListener(...)`，Listener 最终并不一定在业务线程执行。对于 Channel I/O Promise，它通常在 Channel 所属 EventLoop 上被通知。

这个设计不是偶然的。Netty 希望 Channel 状态相关的后续动作仍保持单线程串行：

*   • 写成功后继续写下一批消息。
    
*   • 连接成功后初始化 Channel 状态。
    
*   • 关闭完成后清理与该 Channel 绑定的资源。
    
*   • 写失败后触发降级、关闭或重试。
    

这些动作如果都回到同一个 EventLoop，就不会和该 Channel 的读写事件并发交错。代价也很明确：Listener 不能做耗时操作。

如果确实要在写完成后做耗时业务动作，建议把动作显式切到业务线程池：

`channel.writeAndFlush(msg).addListener(f -> {    if (f.isSuccess()) {         businessExecutor.execute(() -> afterWriteAck(msg));    }   });`

注意不要反过来：先在 Listener 里做完耗时逻辑，再提交。Listener 所在的 EventLoop 已经被你占住了。

## 6\. notifyListeners 在“直接执行”和“提交任务”之间做保护

`DefaultPromise.notifyListeners()` 有一个关键分支：如果当前线程已经在绑定的 EventExecutor 中，并且回调栈深度没有超过阈值，就直接执行；否则通过 `safeExecute` 把通知任务提交给 executor。

按源码逻辑可以概括为：

`notifyListeners()   -> if executor.inEventLoop() and stackDepth safe            notifyListenersNow()          else            executor.execute(() -> notifyListenersNow())`

这不是小优化，而是 Netty 在延迟和安全之间的取舍：

分支

好处

风险

Netty 的处理

EventLoop 内直接执行

少一次任务入队，回调延迟低

Listener 链递归过深

用 `futureListenerStackDepth` 限制

非 EventLoop 提交任务

保证回到正确 executor

多一次调度

用 `safeExecute` 捕获提交失败

通知中新增 Listener

不丢事件

可能形成长链

循环继续取出新 Listener

这里要特别关注 `safeExecute`。如果 EventLoop 已关闭，提交 Listener 通知任务可能失败。Netty 会记录错误，但业务不能假设“只要 Future 完成，Listener 一定成功运行”。关闭流程、异常恢复、压测停机时，这类边界需要通过幂等清理和外部超时兜底处理。

这个分支也解释了为什么某些回调“看起来同步”，某些回调“像是异步”。当 Promise 在 EventLoop 内完成且栈深度安全时，Listener 会直接运行；当其他线程完成 Promise，或者栈深度超过保护阈值，就会变成 executor 任务。

## 7\. 写完成通知来自出站缓冲释放，不是 write 调用返回

把第 6 篇和第 10 篇连起来看，`writeAndFlush` 的 Future 完成时机尤其重要：它不是消息进入 `ChannelOutboundBuffer` 时完成，而是写出路径确认该消息已经被处理完时完成。成功写完会成功 Promise，写失败会失败 Promise。

可以用一条简化链路理解：

`User Thread   -> channel.writeAndFlush(msg)   -> msg 进入 ChannelOutboundBuffer   EventLoop   -> flush0 / doWrite   -> SocketChannel.write   -> removeBytes / remove   -> promise.setSuccess or setFailure   -> listener.operationComplete`


这张时序图强调两件事：第一，用户线程拿到 Future 时，消息通常只是提交到 Netty 出站链路；第二，真正完成 Future 的位置在 EventLoop 写出和缓冲移除之后。Listener 看到的是 I/O 操作结果，不是业务方法调用结果。

因此下面的写法容易误导：

`ChannelFuture f = channel.writeAndFlush(msg);   recordSent(msg); // 这里并不代表已经写成功`

更准确的写法是：

`channel.writeAndFlush(msg).addListener(f -> {    if (f.isSuccess()) {        recordWriteSuccess(msg);    }  else {        recordWriteFailure(msg, f.cause());    }   });`

不过这里还有一个业务语义边界：写成功只说明数据已经被 Netty/JDK Socket 写出到内核或底层传输路径，并不等于对端业务已经处理。要表达“对端已处理”，必须有应用层 ACK。很多系统把 write success 当业务成功，最后出现消息丢失或重复补偿混乱，本质就是混淆了网络写成功和业务确认。

## 8\. await 可以用，但不能在 EventLoop 中用

Netty 并没有禁止 `await`，但它明确不建议在 I/O 回调里使用。原因很简单：EventLoop 是完成 I/O 的线程，你在这个线程上等待 I/O 完成，可能把完成动作本身堵住。

典型错误：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {   ChannelFuture f = ctx.writeAndFlush(response);    f.awaitUninterruptibly(); // 错误：可能阻塞 EventLoop   }`

这段代码的问题不是“写法不优雅”，而是直接破坏事件循环模型。EventLoop 原本应该继续 flush、处理 OP_WRITE、执行 Promise 通知；现在它被当前 Handler 卡住，只能等一个可能需要自己推进的结果。

更好的方式：

`public void channelRead(ChannelHandlerContext ctx, Object msg) {        ctx.writeAndFlush(response).addListener(f -> {            if (!f.isSuccess()) {                 ctx.close();             }        });   }`

如果确实在非 EventLoop 线程中需要等待，例如启动流程中等待 bind 完成，可以用 `sync()` 或 `await()`，但要满足两个前提：

1.  1\. 当前线程不是该 Channel 的 EventLoop。
    
2.  2\. 等待有明确边界，失败时能退出，而不是无限阻塞。
    

启动代码里常见：

`ChannelFuture bindFuture = bootstrap.bind(port).sync();   Channel ch = bindFuture.channel();`

这类等待通常发生在 main 线程或管理线程，不在 I/O 回调里，所以风险可控。判断标准不是“能不能 await”，而是“当前线程是否承担推进这个 Future 完成的职责”。

## 9\. VoidPromise 会吞掉通知能力，适合极少数热路径

Netty 里还有一个容易被忽略的对象：`VoidChannelPromise`。一些写路径为了减少对象创建和 Listener 开销，会使用 void promise。它适合“我不关心这次操作结果”的场景，但代价是明显的：不能添加 Listener，不能 await，也拿不到失败结果。

普通业务代码不要轻易追求这个优化。因为写失败、连接关闭、背压异常往往都需要被观测。用 void promise 省掉的是小开销，丢掉的是故障证据。

可以这样做取舍：

场景

推荐 Promise

原因

业务响应写出

普通 `ChannelPromise` / 默认 `ChannelFuture`

需要失败日志、指标和清理

连接建立、关闭

`ChannelFuture` + Listener

需要严格串联生命周期

高频心跳且允许丢观测

可评估 void promise

只在指标充分时考虑

框架内部极端热路径

定制 Promise 策略

需要源码级证明收益

对大多数服务，Future/Promise 的开销不是瓶颈。真正拖垮系统的更常见问题，是 Listener 阻塞、写积压不处理、失败不观测、在 EventLoop 里 await。

## 10\. Listener 里的异常不会让 Future 失败

还有一个排障细节：Listener 自己抛异常，不会改变 Future 的结果。`DefaultPromise` 调用 `operationComplete` 时会捕获 Throwable 并记录日志。Future 已经完成，Listener 只是完成后的观察者。

这意味着：

`channel.writeAndFlush(msg).addListener(f -> {    throw new RuntimeException("bug in callback");   });`

这不会把写操作改成失败。写操作是否成功，取决于 I/O 路径设置的 Promise 结果；回调异常只是回调自身失败。工程上应该把 Listener 当成普通业务代码管理：

*   • 回调内部要做异常隔离。
    
*   • 指标和日志要能区分 I/O 失败与回调失败。
    
*   • 多个 Listener 之间不要隐含强依赖。
    
*   • 清理逻辑要幂等，避免重复通知或回调失败造成资源残留。
    

如果一个 Listener 失败会影响后续业务状态，不要只依赖 Netty 的日志。应在 Listener 内部显式捕获，并交给业务错误处理链：

`future.addListener(f -> {    try {        updateStateAfterWrite(f);    } catch (Throwable t) {        alarm("write callback failed", t);    }   });`

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

写缓冲积压、连接未关闭、OP_WRITE 等待

看第 10 篇背压路径

`cause()` 为空

是否未完成就读取

把 await timeout 当 I/O timeout

用 Listener 或先判断 `isDone`

偶发 `complete already`

Promise 是否多路径完成

超时、关闭、异常竞争

用 `trySuccess/tryFailure` 幂等完成

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

读完 `DefaultPromise` 之后，不要把 Netty Future 理解成“一个异步返回值容器”这么浅。它真正承担的是事件边界：

`调用方提交 I/O   -> Future 暴露只读状态   -> Promise 在真实完成点写入结果   -> Listener 在正确 executor 上继续流程`

这条边界让 Netty 可以把大量连接、I/O 事件、任务队列和回调逻辑统一到 EventLoop 模型里。它也对业务提出要求：不要阻塞事件线程，不要提前读取未完成结果，不要把写成功等同于业务成功，不要让回调变成隐藏的慢任务。

如果只记一句话，我会这样总结：`Future` 是观察结果的入口，`Promise` 是完成结果的权力，`Listener` 是继续执行的协议；三者真正依赖的是 EventLoop 线程模型。理解这个边界，前面 10 篇里的启动、连接、读写、背压和关闭流程才能串成完整的 Netty 异步运行时。

## 参考资料

*   • Netty `DefaultPromise.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/common/src/main/java/io/netty/util/concurrent/DefaultPromise.java
    
*   • Netty `ChannelFuture.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelFuture.java
    
*   • Netty `DefaultChannelPromise.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelPromise.java
    
*   • Netty 官方 Wiki：https://netty.io/wiki/

---

## 21. Netty 写缓冲与背压源码：慢连接为什么会拖垮内存（源码系列第10篇） 21. Netty 写缓冲与背压源码：慢连接为什么会拖垮内存（源码系列第10篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489521&idx=1&sn=eea6ee326328ab0d0ec71f15e1d141f5&chksm=eb675087dc10d99105b7ad130e77e6fb742631f1ddfc946cf63bee2e037ce329a4a56853713e

> Netty 不会因为对端慢就自动丢弃业务消息。写不出去的数据会留在 `ChannelOutboundBuffer`，pending bytes 超过高水位后 `Channel.isWritable()` 变为 false，并触发 `channelWritabilityChanged`。真正的背压必须由业务响应这个信号：暂停生产、停止读取或降级丢弃，否则慢连接会把直接内存拖爆。

很多 Netty 服务压测初期表现很好，上线后却在某些时刻直接内存飙升。日志看不到异常，CPU 也不一定高，最终出现 `OutOfDirectMemoryError` 或容器 OOM。根因常常不是 ByteBuf 泄漏，而是写侧积压：消息都还在等着发。

慢连接很危险，因为它不会立即失败。客户端还活着，只是读得慢；网络还能写，只是每次写一点；服务端业务还在生产，只是发送队列越来越长。Netty 提供了水位线和可写状态，但不会替业务决定“还要不要继续生产”。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 重点文件：`ChannelOutboundBuffer.java`、`DefaultChannelConfig.java`、`WriteBufferWaterMark.java`
    
*   • 官方仓库：https://github.com/netty/netty
    


这张流程图要抓住高低水位的滞回关系：pending bytes 超过 highWaterMark 后，Channel 变为不可写；只有下降到 lowWaterMark 以下才恢复可写。Netty 只提供信号，不会替业务决定丢弃、合并、暂停拉取还是关闭连接。真正的背压闭环必须把 `isWritable=false` 传回生产者。

## 1\. 写缓冲积压不是泄漏，但同样会 OOM

ByteBuf 泄漏是“没有人再需要它，却没有 release”。写缓冲积压是“仍然有人需要它，但发送速度跟不上生产速度”。二者表现都可能是直接内存增长，但处理方式完全不同。

写积压路径：

`业务持续 write   -> ChannelOutboundBuffer.addMessage   -> pendingOutboundBytes 增长   -> SocketChannel.write 返回 0 或写很少   -> 注册 OP_WRITE 等待可写   -> 业务继续 write   -> 队列继续增长`

如果业务不看可写状态，Netty只能继续接收消息，直到内存耗尽或连接被关闭。

## 2\. ChannelOutboundBuffer 统计待发送字节

`ChannelOutboundBuffer.addMessage(msg, size, promise)` 会创建 Entry，并增加待发送字节。简化逻辑：

`Entry entry = Entry.newInstance(msg, size, total(msg), promise);   if (tailEntry == null) {        flushedEntry = null;   } else {        Entry tail = tailEntry;        tail.next = entry;   }   tailEntry = entry;   if (unflushedEntry == null) {        unflushedEntry = entry;   }   incrementPendingOutboundBytes(entry.pendingSize, false);`

pending size 不只是消息本体大小，还包括一定对象开销估算。它用于水位线判断，而不是精确内存会计。

源码位置：

*   • 文件：`transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java`
    
*   • 方法：`addMessage`、`incrementPendingOutboundBytes`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java
    

当消息成功写完或失败移除时，`decrementPendingOutboundBytes` 会减少计数，并可能触发可写状态恢复。

## 3\. 高低水位形成滞回，避免状态抖动

Netty 使用 `WriteBufferWaterMark`：

`new WriteBufferWaterMark(low, high)`

默认值常见为低水位 32KB、高水位 64KB。语义：

*   • pending bytes > high：Channel 变为不可写。
    
*   • pending bytes < low：Channel 恢复可写。
    
*   • low 与 high 之间保持当前状态。
    

为什么不是超过 64KB 不可写，低于 64KB 立即可写？因为那会在边界附近频繁抖动。高低水位形成滞回区间，让业务有更稳定的暂停/恢复信号。

可写状态不是单一位。`ChannelOutboundBuffer` 内部维护 unwritable 标志位，除了写缓冲水位，用户也可设置自定义不可写位。最终 `channel.isWritable()` 综合这些状态。

## 4\. 状态变化通过 channelWritabilityChanged 传播

pending bytes 超过高水位时，Netty 会触发：

`pipeline.fireChannelWritabilityChanged();`

业务 Handler 可以处理：

`@Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {         producer.resume(ctx.channel());         ctx.read();      } else {        producer.pause(ctx.channel());    }        ctx.fireChannelWritabilityChanged();   }`

注意一定要把信号传给真正的生产者。只打印日志没有背压效果。对于请求响应服务，生产者可能就是入站 read：不可写时停止 auto read 或不再调用 read；对于推送服务，生产者可能是消息队列订阅、定时广播或上游 RPC，需要暂停拉取或丢弃低优先级消息。

## 5\. bytesBeforeUnwritable/bytesBeforeWritable 可做细粒度控制

Channel 提供：

`channel.bytesBeforeUnwritable();   channel.bytesBeforeWritable();`

前者表示还能写多少字节就会变不可写，后者表示还需要发送多少字节才恢复可写。

批量推送时可以在写前判断：

`while (channel.isWritable() && hasMore()) {    Message msg = next();    if (channel.bytesBeforeUnwritable() < estimateSize(msg)) {        break;    }        channel.write(msg);   }   channel.flush();`

这样比写到不可写再暂停更温和。尤其在单条消息很大时，如果完全不估算，可能一次写入就越过水位很多。

## 6\. OP_WRITE 只说明内核缓冲曾经写不下

写不完时，Netty 注册 `OP_WRITE` 等待 Socket 可写。很多人误以为 OP_WRITE 是背压信号。它只是内核层面的“之前写不下，现在可能能写了”。用户态积压和业务生产速度仍需要水位线控制。

可能出现：

*   • OP_WRITE 频繁触发，但每次只能写很少。
    
*   • pending bytes 仍持续增长。
    
*   • Channel 长期不可写。
    
*   • EventLoop 花大量时间尝试 flush 慢连接。
    

此时正确策略不是无限等，而是业务超时、限流、丢弃或关闭慢连接。不同业务选择不同：聊天消息可能保留关键消息丢弃弱提示；行情推送可能只保留最新快照；文件传输则应自然等待但限制并发。

## 7\. 入站背压要把写侧状态传回 read

请求响应模型里，如果响应写不出去，还继续读取新请求，就会形成双重积压：入站业务任务和出站响应队列同时增长。

一种简单策略：

`@Override   public void channelReadComplete(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {        ctx.read();    }   }     @Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {        ctx.read();    }   }`

前提是关闭 `AUTO_READ`。这样当写侧不可写时，不再主动读取更多请求；当发送缓冲下降到低水位，再恢复读取。

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


这张时序图展示了慢客户端故障的完整扩散路径：生产速度高于发送速度，内核发送缓冲写满，Netty 注册 `OP_WRITE`，用户态 `ChannelOutboundBuffer` 持续增长。正确分支是在不可写时暂停生产或停止读取；错误分支是继续写，把网络慢问题放大成直接内存问题。

## 10\. ChannelOutboundBuffer 还影响 writability 事件顺序

当 pending bytes 跨越水位线，Netty 不一定在当前调用栈同步执行用户 Handler。它可能调用 `fireChannelWritabilityChanged(invokeLater)`，把事件延后到 EventLoop 后续任务中，避免重入和复杂状态交错。

这意味着业务不能假设刚 write 完马上同步收到不可写回调。更稳妥的方式是在写循环中主动检查 `isWritable()`，同时在回调中恢复生产。

## 11\. 慢连接排查指标

建议至少观测：

*   • 每个 Channel 的 pending outbound bytes。
    
*   • 不可写 Channel 数量。
    
*   • `channelWritabilityChanged` 频率。
    
*   • OP_WRITE 注册数量或持续时间。
    
*   • write Future 完成延迟。
    
*   • EventLoop flush 耗时。
    
*   • 业务生产速率与实际发送速率。
    
*   • 连接维度消息丢弃/合并数量。
    

如果不可写连接数上升且 direct memory 增长，优先判断慢客户端或网络拥塞。如果不可写不多但内存增长，可能是少数超级连接或 ByteBuf 泄漏。如果 write Future 大量失败，可能是连接关闭或编码异常。

## 12\. 一个可落地的背压模板

连接初始化：

`ch.config().setAutoRead(false);   ch.config().setWriteBufferWaterMark(    new WriteBufferWaterMark(32 * 1024, 128 * 1024));`

Handler：

`@Override   public void channelActive(ChannelHandlerContext ctx) {        ctx.read();   }     @Override   public void channelRead(ChannelHandlerContext ctx, Object msg) {        handleAsync(msg).whenComplete((resp, err) -> {            ctx.executor().execute(() -> {                if (err != null) {                    ctx.close();                     return;                }                ctx.writeAndFlush(resp);                if (ctx.channel().isWritable()) {                    ctx.read();                }            });        });   }     @Override   public void channelWritabilityChanged(ChannelHandlerContext ctx) {    if (ctx.channel().isWritable()) {        ctx.read();    }        ctx.fireChannelWritabilityChanged();   }`

这不是唯一答案，但体现了闭环：处理完成、写侧可用、才读下一批。实际项目还要加超时、异常释放、业务线程池容量和协议层错误返回。

## 13\. 和应用层限流的关系

Netty 背压解决的是单连接网络发送能力；应用限流解决的是系统整体处理能力。二者不能互相替代。

如果系统总 QPS 超过数据库能力，即使每条 Channel 都可写，也需要全局限流。如果只有某个客户端网络慢，不能因为全局限流让所有用户受影响，应在该 Channel 维度暂停或关闭。

最佳实践通常是多层背压：

`全局入口限流   -> 业务线程池有界队列   -> Channel 写水位线   -> AUTO_READ 控制   -> 协议级降级/丢弃/关闭`

每一层都要有明确指标和策略，否则压力只会转移到下一层。

## 14\. 总结：Netty 给信号，业务做决策

写侧背压主链：

`write   -> ChannelOutboundBuffer.addMessage   -> pending bytes 增长   -> 超过 highWaterMark   -> isWritable=false   -> channelWritabilityChanged   -> 业务暂停生产/读取   -> doWrite 逐步发送   -> 低于 lowWaterMark   -> isWritable=true   -> 业务恢复`

Netty 能告诉你“这条连接现在承载不了更多写入”，但它不知道你的消息能不能丢、能不能合并、能不能延迟、要不要断开。背压的最后一公里必须由业务协议完成。

至此前 10 篇完成了一条完整链路：启动、接入、事件循环、读、写、Pipeline、内存、解码和背压。下一阶段可以继续深入 Future/Promise、定时任务、Selector 重建、IdleStateHandler、Native Transport 和 HTTP/WebSocket 等专项。

## 参考资料

1.  1. `ChannelOutboundBuffer.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/ChannelOutboundBuffer.java
    
2.  2. `WriteBufferWaterMark.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/WriteBufferWaterMark.java
    
3.  3. `DefaultChannelConfig.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/DefaultChannelConfig.java
    
4.  4. `AbstractNioByteChannel.java`：https://github.com/netty/netty/blob/netty-4.1.135.Final/transport/src/main/java/io/netty/channel/nio/AbstractNioByteChannel.java

---

## 20. ByteToMessageDecoder 源码：半包、粘包与累积缓冲区（源码系列第9篇） 20. ByteToMessageDecoder 源码：半包、粘包与累积缓冲区（源码系列第9篇）

原文：https://mp.weixin.qq.com/s?__biz=MzI3NzQ1MTI4OQ==&mid=2247489516&idx=1&sn=3f7cdc05de488060c0bf5b04fbfdf5ca&chksm=eb67509adc10d98ccb27b68e69a33458abada937da9e81260c51fecb5de288164adf74bfa64d

> `ByteToMessageDecoder` 的价值不是帮你“把 ByteBuf 转对象”这么简单，而是把 TCP 字节流的不确定边界，收束成业务可消费的消息边界。它通过 cumulation 保存半包，通过 `callDecode` 循环产出完整消息，并用 readerIndex 前进检测避免死循环。

TCP 不保证消息边界。你发送两次：

`send(requestA)   send(requestB)`

服务端可能收到：

`read1: requestA 前半段   read2: requestA 后半段 + requestB 全部`

这就是半包和粘包。问题不在 TCP“不可靠”，而在 TCP 本来就是字节流协议。应用层如果需要消息概念，就必须定义帧边界，例如固定长度、分隔符、长度字段或更复杂的协议状态机。

Netty 把这类问题放到 `ByteToMessageDecoder`。业务 Handler 不应该处理任意 ByteBuf 分块，而应该收到完整请求对象。

源码基线：

*   • Netty `netty-4.1.135.Final`
    
*   • Commit：`f05f765d81460799c53123a207f665bf3b465171`
    
*   • 文件：`codec/src/main/java/io/netty/handler/codec/ByteToMessageDecoder.java`
    
*   • 链接：https://github.com/netty/netty/blob/netty-4.1.135.Final/codec/src/main/java/io/netty/handler/codec/ByteToMessageDecoder.java
    


这张流程图的关键是 `cumulation` 和 `callDecode` 循环。新 ByteBuf 不是直接等同于一个业务请求，而是先和历史半包合并，再由 `decode` 判断是否足够产出完整消息。写自定义 Decoder 时，最重要的约束是：产出消息必须推进 `readerIndex`，输入不完整则必须保留状态并退出。

## 1\. Decoder 是入站 Handler，但它管理跨 read 状态

`ByteToMessageDecoder` 继承 `ChannelInboundHandlerAdapter`。它重写 `channelRead`，只处理 ByteBuf 类型：

`public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {    if (msg instanceof ByteBuf) {        CodecOutputList out = CodecOutputList.newInstance();        try {            first = cumulation == null;            cumulation = cumulator.cumulate(ctx.alloc(),                first ? Unpooled.EMPTY_BUFFER : cumulation,                (ByteBuf) msg);            callDecode(ctx, cumulation, out);        } finally {            // 处理 cumulation 生命周期并 fire out        }       } else {        ctx.fireChannelRead(msg);       }   }`

它和普通 Handler 最大不同是持有 `cumulation`。这正是它不能随便 `@Sharable` 的原因：不同连接的半包状态必须隔离。如果多个 Channel 共享同一个 Decoder 实例，A 连接的半包可能与 B 连接的数据混在一起，后果非常严重。

## 2\. cumulation 把多次 Socket read 变成连续输入

当一次 read 不足以组成完整消息，Decoder 不能丢弃数据。它把剩余字节保存在 `cumulation` 中，下次新的 ByteBuf 到来时合并。

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

`callDecode(ctx, in, out)` 大致逻辑：

`while (in.isReadable()) {    final int outSize = out.size();    if (outSize > 0) {        fireChannelRead(ctx, out, outSize);        out.clear();        if (ctx.isRemoved()) {            break;        }    }    int oldInputLength = in.readableBytes();    decodeRemovalReentryProtection(ctx, in, out);    if (ctx.isRemoved()) {        break;    }    if (out.isEmpty()) {        if (oldInputLength == in.readableBytes()) {            break;        } else {            continue;        }    }    if (oldInputLength == in.readableBytes()) {        throw new DecoderException(            "did not read anything but decoded a message");    }    if (isSingleDecode()) {        break;    }   }`

这段代码主要防三类错误。

第一，输入不够时必须退出。decode 不产出消息且 readerIndex 不前进，说明还需要更多数据。

第二，不能“凭空产出消息”。如果 decode 产出了消息，却没有消费任何输入，循环会无限产出，Netty 直接抛异常。

第三，Handler 可能在 decode 中被移除，所以每轮都检查 `ctx.isRemoved()`，避免继续访问已移除节点。

这就是成熟框架和手写 while 解码最大的差别：它不只处理正常路径，还防止用户 decode 写错后把 EventLoop 打满。

## 4\. 自定义 decode 的正确姿势

以长度字段协议为例：

`4 字节长度 + N 字节 payload`

decode 模板：

`protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {    if (in.readableBytes() < 4) {        return;    }        in.markReaderIndex();    int len = in.readInt();    if (in.readableBytes() < len) {        in.resetReaderIndex();        return;    }    ByteBuf frame = in.readRetainedSlice(len);    out.add(frame);   }`

关键点：

*   • 判断长度前确认长度字段本身完整。
    
*   • 读了长度但 payload 不完整时，恢复 readerIndex。
    
*   • 产出的 ByteBuf 使用 retained slice，保证下游拥有引用。
    
*   • 不要在输入不足时抛异常。
    
*   • 对异常长度做上限保护。
    

更好的方式是直接使用 Netty 的 `LengthFieldBasedFrameDecoder`，再写一个只处理完整帧的协议 Decoder。不要在每个项目里重复发明长度字段解析器。

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
