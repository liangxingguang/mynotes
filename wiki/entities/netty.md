---
id: wiki-entity-netty
type: entity
title: Netty
status: active
created: 2026-10-23
updated: 2026-10-29
confidence: high
tags:
  - entity
  - java
  - network
  - framework
sources:
  - raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md
  - raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md
  - raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md
  - raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md
  - raw/sources/architecture/2026-10-27-netty-01-intro.md
  - raw/sources/architecture/2026-10-27-netty-02-bio-nio.md
  - raw/sources/architecture/2026-10-27-netty-03-reactor.md
  - raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md
  - raw/sources/architecture/2026-10-27-netty-05-bytebuf.md
  - raw/sources/architecture/2026-10-27-netty-06-eventloop.md
  - raw/sources/architecture/2026-10-27-netty-08-bootstrap.md
  - raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md
  - raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md
  - raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md
  - raw/sources/architecture/2026-10-27-netty-15-write-flush.md
  - raw/sources/architecture/2026-10-27-netty-16-connection-mgmt.md
  - raw/sources/architecture/2026-10-27-netty-17-idlestate-heartbeat.md
  - raw/sources/architecture/2026-10-27-netty-18-reconnect.md
  - raw/sources/architecture/2026-10-27-netty-20-http-decoder.md
  - raw/sources/architecture/2026-10-27-netty-21-websocket.md
  - raw/sources/architecture/2026-10-27-netty-22-ssl-tls.md
  - raw/sources/architecture/2026-10-27-netty-23-zero-copy.md
  - raw/sources/architecture/2026-10-27-netty-24-epoll-native.md
  - raw/sources/architecture/2026-10-27-netty-25-flow-control.md
  - raw/sources/architecture/2026-10-27-netty-27-channelfuture.md
  - raw/sources/architecture/2026-10-27-netty-28-promise.md
  - raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md
  - raw/sources/architecture/2026-10-27-netty-4-to-5.md
  - raw/sources/architecture/2026-10-27-netty-debugging-guide.md
  - raw/sources/architecture/2026-10-27-netty-design-patterns.md
  - raw/sources/architecture/2026-10-27-netty-gateway-scg.md
  - raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md
  - raw/sources/architecture/2026-10-27-netty-kafka.md
  - raw/sources/architecture/2026-10-27-netty-perf-tuning.md
  - raw/sources/architecture/2026-10-27-netty-source-reading-album.md
related:
  - wiki/sources/netty-three-skills-high-performance.md
  - wiki/sources/netty-iot-gateway-resilient-design.md
  - wiki/sources/netty-redis-kafka-iot-gateway.md
  - wiki/sources/netty-million-connection-push-service.md
  - wiki/sources/netty-01-intro.md
  - wiki/sources/netty-02-bio-nio.md
  - wiki/sources/netty-03-reactor.md
  - wiki/sources/netty-04-channel-pipeline-handler.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/sources/netty-05-bytebuf.md
  - wiki/concepts/netty-bytebuf.md
  - wiki/sources/netty-06-eventloop.md
  - wiki/concepts/netty-eventloop.md
  - wiki/sources/netty-08-bootstrap.md
  - wiki/concepts/netty-bootstrap.md
  - wiki/sources/netty-09-nioeventloop-run.md
  - wiki/sources/netty-10-pooled-allocator.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/sources/netty-11-poolchunk-subpage.md
  - wiki/sources/netty-15-write-flush.md
  - wiki/concepts/netty-write-flush.md
  - wiki/sources/netty-16-connection-mgmt.md
  - wiki/concepts/netty-connection-lifecycle.md
  - wiki/sources/netty-17-idlestate-heartbeat.md
  - wiki/concepts/netty-idlestate-heartbeat.md
  - wiki/sources/netty-18-reconnect.md
  - wiki/concepts/netty-reconnect.md
  - wiki/sources/netty-20-http-decoder.md
  - wiki/concepts/netty-http-decoder.md
  - wiki/sources/netty-21-websocket.md
  - wiki/concepts/netty-websocket-upgrade.md
  - wiki/sources/netty-22-ssl-tls.md
  - wiki/concepts/netty-ssl-tls.md
  - wiki/sources/netty-23-zero-copy.md
  - wiki/concepts/netty-zero-copy.md
  - wiki/sources/netty-24-epoll-native.md
  - wiki/concepts/netty-epoll-native-transport.md
  - wiki/sources/netty-25-flow-control.md
  - wiki/concepts/netty-flow-control.md
  - wiki/sources/netty-27-channelfuture.md
  - wiki/concepts/netty-channelfuture.md
  - wiki/sources/netty-28-promise.md
  - wiki/sources/netty-30-rpc-framework.md
  - wiki/concepts/netty-rpc-framework.md
  - wiki/sources/netty-4-to-5.md
  - wiki/sources/netty-debugging-guide.md
  - wiki/concepts/netty-debugging-troubleshooting.md
  - wiki/sources/netty-design-patterns.md
  - wiki/concepts/design-patterns-in-netty.md
  - wiki/sources/netty-gateway-scg.md
  - wiki/sources/netty-in-mainstream-middleware.md
  - wiki/sources/netty-kafka-network-layer.md
  - wiki/decisions/kafka-adopts-netty.md
  - wiki/entities/kafka.md
  - wiki/sources/netty-perf-tuning.md
  - wiki/concepts/netty-performance-tuning.md
  - wiki/sources/netty-source-reading-album.md
---
# Netty

## Overview（概览）

Java 异步事件驱动网络框架（基于 IO 多路复用 + Reactor，**不是 AIO**）。在本库三个信源中分别作为性能机制拆解对象（三大技能）与两个百万级 IoT 长连接接入层的核心组件出现，构成"机制+工程"互证。

## Identity（身份信息）

- Type（类型）: 开源异步事件驱动网络框架
- Organization（所属组织）: Netty Project（起源于 JBoss，背景知识信源未详述）
- Role（角色）: 高并发长连接/ RPC 的通信底座——主从 Reactor 摊薄等 IO 成本、零拷贝砍搬数据成本、无锁串行化消抢锁成本
- Status（状态）: 主流活跃（4.1 为绝对主流、维护至少到 2027 以后；4.2 于 2025-04-03 GA：AdaptiveByteBufAllocator、传输解耦、io_uring 一级传输、HTTP/3 毕业；旧 5.0 Alpha（2018，ForkJoinPool+API 大改）已废弃；新 5.0 于 2024 重启、积极开发中：JDK 17 底线/io_uring/Buffer API 重设计。注：本页早前口径"5.x 已停止推进"来自早前综述信源，指向旧 5.0 一代；番外篇6 信源（基于 2026-08 公开资料）给出新旧两代 5.0 的完整图景，二者不冲突——详见 Timeline）

## Important Facts（重要事实）

- 性能三支柱（机制信源）：主从 Reactor（boss 只 accept、worker 默认 CPU×2、Channel 终身绑单 EventLoop 换无锁串行化）；ByteBuf 读写双指针+引用计数（泄漏头号来源）+jemalloc 式内存池；零拷贝三层（OS sendfile 走 TLS 失效 / JVM 堆外 / 应用层 Composite）。
- 生产事故第一根因：EventLoop 里做阻塞调用——一个线程被拖住，其管的所有连接一起拖死；两个 IoT 信源均把"EventLoop 不阻塞"列为第一不变量/第一纪律，李林锋信源把它落成 CLOSE_WAIT 三防线（业务离 I/O 线程、慎用自定义 Task、心跳回调时延可控）并补充"日志隐形杀手"（log4j AsyncAppender 队列满即同步阻塞）这一变体（四信源互证）。
- 长连接工程（IoT 双信源）：固定头二进制协议+LengthField 系解码防粘包（maxFrameLength 防 OOM）；写缓冲水位线（32/64KB）是反压开关；长连接保活靠应用层心跳（IdleStateHandler）而非 SO_KEEPALIVE；epoll/nio 自适应 ServerBootstrap。
- 海量接入调优清单（李林锋信源）：ulimit 调至百万级；心跳周期由运营商 NAT 释放时间（中移动 2.5G 约 5 分钟）与信令风暴夹击，实践取 180s（微信 300s）；接收缓冲区设消息均值而非上限，AdaptiveRecvByteBufAllocator 动态伸缩（100 万连接省约 5G）；PooledByteBufAllocator（纯 Java 版 jemalloc）Twitter 案例垃圾生成降 5 倍，代价是泄漏不再被 GC 兜底；RPS 软中断均衡（内核 ≥2.6.35）性能 +20%。
- 反例案例（李林锋信源）：10 万长连接 MQTT 服务 IdleStateHandler 超时设 15 分钟 → 约 110 万个 ScheduledFutureTask 老化进持久代被误判内存泄露，改 45 秒即愈——量级放大一切小问题。
- 容量观：无万能"单机 10 万连接"数字——上限由 FD 数、内存（RSS）、带宽、EventLoop p99 联合压测确定（机制信源"真正上限是 fd 数与内存"+IoT 信源反"参数包"互证）。
- 分层架构总览（教程开篇信源）：核心层（Channel/EventLoop/ChannelPipeline）、传输层（NIO/Epoll/KQueue/OIO/Unix Socket）、缓冲层（ByteBuf + 直接内存 + 内存池 + 零拷贝）、编解码层（ByteToMessageDecoder/LengthFieldBasedFrameDecoder/Protobuf 等）、协议层（HTTP/HTTP2/WebSocket/DNS/MQTT）。
- 设计起点（教程双信源）：填 JDK NIO 的坑——API 原始、粘包自理、断线重连/心跳手写、多线程配合难、epoll 空轮询 BUG（无事件也返回致 CPU 100%；JDK 早期以"空轮询超阈值重建 Selector"Hack 缓解，6u17 才官方修好——信源说法；Netty 侧防御同为自旋计数器+重建 Selector）。
- 启动源码路径（教程开篇信源）：`ServerBootstrap.bind()` → `initAndRegister()`（反射建 NioServerSocketChannel + 注册到 Boss EventLoop 的 Selector，异步）→ 监听器回调 `doBind0()` 真正调 JDK bind。
- 其他机制点名（教程开篇信源）：FastThreadLocal 快于 JDK ThreadLocal；MpscLinkedQueue（MPSC 无锁队列，EventLoop 任务队列）；HashedWheelTimer 时间轮；内存池底层为伙伴分配算法。
- ByteBuf 源码级机制（教程第 5 篇）：readerIndex/writerIndex 双指针免 flip；ensureWritable 自动扩容 ≤4MB 从 64B 翻倍、>4MB 步进 4MB；Heap/Direct/Composite 三形态（Composite addComponent 零拷贝拼接）；引用计数管理堆外内存，铁律"谁最后消费谁 release"，泄漏排查用 `-Dio.netty.leakDetectionLevel=paranoid`；Pooled 类 jemalloc（Arena 默认 CPU×2、page 8KB），4.1 默认池化，作者称高频场景约降 70% GC 压力。详见 [[netty-bytebuf]]。
- Pipeline 内部机制（教程第 4 篇，源码级）：DefaultChannelPipeline 为 ChannelHandlerContext 双向链表（HeadContext 管底层 IO、TailContext 为入站终点，addLast 尾插）；入站事件 Head→Tail 正向、出站事件 Tail→Head 反向，按 Context 的 inbound/outbound 标志跳节点传播；Handler 回调不调 ctx.fireXxx() 传播即中断；channel.write 从 tail 出发、ctx.write 从当前节点下一个出站 Handler 出发，路径不同；SimpleChannelInboundHandler 自动释放 ByteBuf，ChannelInboundHandlerAdapter 须手动 release 否则泄漏。详见 [[netty-channel-pipeline]]。
- EventLoop 源码级机制（教程第 6 篇）：NioEventLoop = 线程+Selector+MpscLinkedQueue 任务队列；默认线程数 availableProcessors×2（`-Dio.netty.eventLoopThreads` 覆盖）；chooser 在线程数为 2 的幂时用 `idx++ & (len-1)` 位运算分配 Channel；run() 循环按 ioRatio（默认 50）做 IO 与任务时间配比，selectCnt 超阈值 rebuildSelector 自愈 JDK 空轮询 bug；外部线程提交任务入队后经 wakeup 布尔短路唤醒 select；register 跨线程时异步投递回 EventLoop 线程执行；优雅停机先关 bossGroup 再关 workerGroup。详见 [[netty-eventloop]]。
- 线程模型专篇（教程第 3 篇）：Reactor 思想源自 Doug Lea《Scalable IO in Java》；Netty 三层形态（单线程/多线程/主从多 Reactor）与选型分档（<100 单线程、100~1000 默认、1000~10000 调 worker、万级以上主从）；boss→worker 传送带为 ServerBootstrapAcceptor（channelRead 收到新 Channel 后 childGroup.register 移交 workerGroup）；空轮询自愈阈值 SELECTOR_AUTO_REBUILD_THRESHOLD 默认 512 次；耗时 Handler 标准解法为 Pipeline 挂 DefaultEventExecutorGroup 业务线程池。详见 [[reactor-thread-model]]。
- 启动流程源码级机制（教程第 8 篇）：客户端 connect() 与服务端 bind() 共用 `initAndRegister()` 三件套——ReflectiveChannelFactory 反射建 Channel → init() 组装 Pipeline → register 到 EventLoop 的 Selector；客户端注册时 interestOps=0、connect 未立即成功才关注 OP_CONNECT，服务端 NioServerSocketChannel 构造即记录 OP_ACCEPT、bind 成功后 doBeginRead 生效；register/doBind0 全程经 inEventLoop() 判断异步投递保证同线程；ServerBootstrapAcceptor 在 channelRead 里挂 childHandler 并 childGroup.register 移交 worker。避坑纪律：bind/connect 完成前不操作 Channel、handler≠childHandler、bossGroup 1 线程即可。详见 [[netty-bootstrap]]。
- run() 主循环深挖（教程第 9 篇）：SelectStrategy 反直觉设计——有任务走 selectNow() 非阻塞、没任务才阻塞 select；ioRatio 配比公式 ioTime×(100-ioRatio)/ioRatio 与选型表（网关 100/业务密集 50~70）；epoll 空轮询 BUG（JDK-2144974）连续 512 次空转即 rebuildSelector0 迁移全部 key 重建 Selector，有实际工作即重置计数；SelectedSelectionKeySet 数组替换 HashSet 降 GC。与 [[netty-eventloop]] 既有结论三方互证。
- 池化内存分配源码级机制（教程第 10 篇）：PooledByteBufAllocator 借鉴 jemalloc 四级分级——PoolArena（默认 2×CPU 核数各持锁）→ PoolChunk（16MB，memoryMap 满二叉树管 2048 个 8KB Page，O(logN) 分配合并）→ PoolSubpage（bitmap 切分 tiny/small 小块）；分配先查 PoolThreadCache 线程缓存（无锁），未命中走 Arena 加锁；huge（>16MB）走 Unpooled 不缓存；池化 ByteBuf 必须显式 release()，泄漏用 ResourceLeakDetector PARANOID 排查。详见 [[netty-pooled-allocator]]。
- 内存池深入篇（教程第 11 篇，源码级）：PoolChunk memoryMap 节点值=子树最浅空闲深度（根 O(1) 知整块状态）、allocateNode 从根左优先搜索降外部碎片、updateParents 沿路径 min(左,右) 上刷；PoolSubpage `nextAvail` 缓存+`Long.numberOfTrailingZeros` 指令级查空闲位，句柄编码 `(bitmapIdx<<32)|memoryMapIdx`，全空闲整页归还 Chunk；PoolChunkList 六档使用率流转（qInit/q000/q025/q050/q075/q100），`usage()<minUsage` 降级、全闲 Chunk 回收归 OS；JMH 实测小块池化 ~7x（32B 45ns vs 310ns）、1MB 仅 ~2.9x；PoolThreadCache 裁剪参数 cacheTrimInterval=8192/maxCachedBufferCapacity=32KB。详见 [[netty-pooled-allocator]]。
- 写缓冲与背压源码级机制（教程第 15 篇）：write() 只入队（消息包装 Entry 追加 ChannelOutboundBuffer 链表，O(1) 返回解耦业务/I/O 线程），flush() 的 addFlush() 移 unflushedEntry→flushedEntry 指针，真正写入在 NioSocketChannel.doWrite() 调 JDK SocketChannel.write()；写自旋默认 16 次防独占 I/O 线程，写不进注册 OP_WRITE 等 selector 通知，半包留链表续写；高低水位默认 64KB/32KB（DefaultChannelConfig），穿越触发 channelWritabilityChanged 做背压防 OOM；高吞吐攒批 write 后一次 flush，大文件用 FileRegion。详见 [[netty-write-flush]]。
- 连接生命周期源码级机制（教程第 16 篇）：connect = initAndRegister + 异步 DNS + AbstractUnsafe.connect → JDK connect，未立即完成注册 OP_CONNECT + CONNECT_TIMEOUT_MILLIS 定时任务（依赖 EventLoop 调度，线程卡住超时失效），selector 通知后 finishConnect→fireChannelActive；bind = doBind0 在 EventLoop 执行 → 带 SO_BACKLOG 绑端口 → fireChannelActive 注册 OP_ACCEPT；close 四层优雅清理——failFlushed 冲刷 outboundBuffer → fireChannelInactive/Unregistered → selectionKey.cancel+deregister（漏了已关闭 channel 仍触发事件）→ javaChannel().close()；全程 Promise-Future 异步（close 也异步，须 closeFuture 等完成），高频路径用 FixedChannelPool 避免频繁 connect/close，支持 shutdownOutput/Input 半关闭。详见 [[netty-connection-lifecycle]]。
- 空闲检测与心跳源码级机制（教程第 17 篇）：IdleStateHandler（ChannelDuplexHandler）三维超时转纳秒用 System.nanoTime() 计时，handlerAdded 在 EventLoop 上启动至多三个 IdleStateTask；未超时按剩余延迟精确再调度（非 scheduleAtFixedRate 轮询）；写时间戳经 ChannelPromise Listener 在真正写完成后更新；超时触发 IdleStateEvent（含 isFirst 标记）fireUserEventTriggered 交下游；作者压测 10 万连接 30s 间隔 CPU 开销 <0.5%（自述）。详见 [[netty-idlestate-heartbeat]]。
- 断线重连机制（教程第 18 篇）：Netty 无内置自动重连，靠 ChannelFutureListener（connect 失败）+ channelInactive（断开）双时机触发 + eventLoop.schedule 延迟重连（保持 Channel 串行化，禁另起线程）；退避公式 min(1s×2^retry+随机抖动, 30s 封顶) 防惊群；channelInactive 触发链路为 read 返回 -1 → closeOnRead → fireChannelInactive；完整链路 = IdleStateEvent → 主动 close → channelInactive → 重连，成功后 channelActive 重做认证/状态初始化，主动 close 用标志位跳过。详见 [[netty-reconnect]]。
- HTTP 解码状态机（教程第 20 篇）：HttpObjectDecoder（ByteToMessageDecoder 子类）以 currentState 成员变量持久化的 12 态 FSM 解码 TCP 字节流，天然抗分片；头部解析直接操作 readerIndex 零拷贝，chunked 用 readRetainedSlice 共享视图；产出 HttpRequest+HttpContent 碎片序列由 HttpObjectAggregator 选配聚合；UPGRADED 状态为 WebSocket 升级让位；HttpContent 必须 release、100 Continue 需手动响应、大文件禁用聚合器。详见 [[netty-http-decoder]]。
- WebSocket 协议升级（教程第 21 篇）：同一 TCP 连接先 HTTP 握手（Upgrade: websocket → Base64(SHA1(Key+RFC 魔数)) → 101）再在 Listener 里 Pipeline 热插拔——移除 HTTP 编解码器、插入 WebSocket13FrameDecoder/Encoder，对上层透明；帧解码处理 FIN/Opcode/Mask/扩展长度与分片重组；客户端→服务端必须带掩码、服务端下发不能带；聚合器不可省（握手需 FullHttpRequest）、必须限最大帧、文明关闭先发 CloseWebSocketFrame。详见 [[netty-websocket-upgrade]]。
- 零拷贝机制（教程第 23 篇）：本质是"没有 CPU 参与的拷贝"——四大兵器分场景：FileRegion 委托 FileChannel.transferTo 走 Linux sendfile（4 次拷贝+4 次上下文切换压成 2 次 DMA，doWrite 有专门零拷贝分支，单次使用不可复用、编解码器须跳过、Windows fallback）；CompositeByteBuf 用 Component 数组逻辑拼接（引用不拷数据，二分定位 O(log n)，release 递归释放）；Unpooled.wrappedBuffer 直接包装 byte[]/MappedByteBuffer；DirectBuffer 堆外内存省 JVM↔native 拷贝。详见 [[netty-zero-copy]]。
- Native Transport（教程第 24 篇）：EpollEventLoop 绕过 JDK Selector 直调 epoll——持 epollFd/eventFd/timerFd 三 fd（eventfd 单 fd 计数器优于 Pipe 双 fd wakeup，timerfd 纳秒级优于 epoll_wait 毫秒 timeout）；事件栈上分配零 GC、processReady 按 fd 直映射无 selectedKeys 遍历；ET 模式须循环读到 EAGAIN；作者简易压测延迟降 33-45%/吞吐升 38%/GC 降 38%（非受控数据）；仅 Linux 可用，生产须 Epoll→KQueue→NIO 回退（与 IoT 信源"epoll/nio 自适应"互证）；信源称"Netty 5 正推 io_uring"与本页时间线（4.2 GA 含 io_uring、5.x 停推）矛盾，暂倾向既有口径待复核。详见 [[netty-epoll-native-transport]]。
- 流量控制源码级机制（教程第 25 篇）：高低水位默认 32K/64K（WriteBufferWaterMark）是软限制——addMessage 原子累加超高水位即 setUnwritable、removeBytes 降到低水位以下 setWritable；状态用 unwritable 位标记+CAS（AtomicIntegerFieldUpdater）切换；变不可写时 invokeLater 抛 EventLoop 队列延迟传播防 write 链递归重入（代价：事件有延迟，写前必现查 isWritable()）；高低水位≠TCP 滑窗（用户态软信号 vs 内核态硬阻塞），三层背压叠加才是全链路反压。详见 [[netty-flow-control]]。
- SSL/TLS 支持（教程第 22 篇）：本质是 JDK SSLEngine 的封装——SslHandler 入站 decode→unwrap 解密、出站 write→wrap 加密，握手未完成时出站数据入 pendingUnencryptedWrites 排队、握手成功 Listener 冲刷；unwrap 循环处理 OK/UNDERFLOW/OVERFLOW/CLOSED 四态，NEED_TASK 委托任务异步执行不占 IO 线程；握手全程异步经 handshakeFuture() 通知（channelActive ≠ 握手完成）；SslContext 为工厂+配置中心，SslProvider 可切 JDK/OpenSSL（netty-tcnative，AES-NI 硬件加速，信源经验论断生产必选）/BouncyCastle；铁律：SslHandler 放 Pipeline 最前、私钥须 PKCS#8；优化靠 Session 复用+TLS 1.3（1-RTT）。详见 [[netty-ssl-tls]]。
- 异步结果模型源码级机制（教程第 27、28 篇）：ChannelFuture 在 JDK Future 上加 addListener 回调/sync/await/isSuccess/cause，Channel 层再加 isWritable() 水位感知；Promise 为可写端（set/trySuccess/Failure，对应 Guava SettableFuture/JDK CompletableFuture），业务自建异步结果 new DefaultPromise<>(executor)；DefaultPromise 用单个 volatile Object result 字段编码全部状态（null/SUCCESS/结果/CauseHolder/UNCANCELLABLE）+ AtomicReferenceFieldUpdater CAS 无锁转换、不可逆；监听器懒加载（单 Object 字段，加第二个才升级 DefaultFutureListeners 数组），addListener 时 isDone 即触发防丢失；setValue0 CAS 成功后先 checkNotifyWaiters（notifyAll 唤醒 await 线程）再 notifyListeners；notifyListeners 三细节（notifyingListeners 防递归、同步块外回调防死锁、catch Throwable 保后续）+ EventLoop 亲和性（非 Loop 线程 safeExecute 提交回 Loop）；await() 走 wait/notifyAll 不耗 CPU；取消后 isDone 即 true、listener 立即触发；铁律"EventLoop 内禁 sync/await（自我等待死锁），回调第一步必查 isSuccess，不确定已完成用 trySuccess"；与 CompletableFuture 对比——EventLoop 内用 ChannelFuture、跨线程编排用 CF（作者经验，解读）。详见 [[netty-channelfuture]]。
- 生态位（教程信源说法）：Dubbo/gRPC（RPC）、RocketMQ（消息）、Spring WebFlux/Spring Cloud Gateway、Elasticsearch 节点通信、ZooKeeper 3.6+ 可选、Hadoop/Spark 部分组件；Kafka 列入"底层用 Netty"——早前标记存疑，已由番外篇 9 消解：Kafka 2.0 起网络层确实整体迁到 Netty（详见 [[kafka-adopts-netty]]）。
- Kafka 网络层应用（番外篇9，基于 Kafka 3.9.0 源码拆解）：Kafka 2.0 弃自研 NIO（约 3800 行）迁 Netty（约 950 行）；因业务全交 RequestHandler 线程池，boss/worker 复用同一 EventLoopGroup（默认 3 线程）——[[reactor-thread-model]] 单 Group 简化的生产先例；七层 Pipeline（SSL→流量统计→LengthFieldBasedFrameDecoder 帧解码 maxFrame 100MB→帧编码→correlationId 绑定→KafkaApiHandler→异常兜底）；readRetainedSlice 零拷贝传引用+finally release 的引用计数纪律实例；RequestChannel 有界队列满阻塞网络线程→TCP 接收窗口收缩的应用层背压（补全 [[netty-flow-control]] 三层叠加的应用队列环节）；channelReadComplete 统一批量 flush。迁移复盘七维对照（粘包/SSL/堆外内存/epoll/跨平台/社区/可观测）全是 Netty 现成组件，印证"知道什么该自己造"。详见 [[kafka-adopts-netty]]。
- RPC 实战（教程第 30 篇，收官）：约 300 行手写轻量 RPC 框架——RpcRequest/RpcResponse 协议信封（requestId 关联、Throwable 随响应回传）、4 字节长度域编解码（mark/reset 回滚拆粘包）、JDK 动态代理透明化、pendingRequests(ConcurrentHashMap)+RpcFuture(CountDownLatch) 异步转同步、Map 模拟注册中心+反射调用；与 Dubbo 差在服务发现/负载均衡/连接池/容错/序列化性能（JSON vs Hessian2 差 5-10 倍）/降级/SPI/限流八项工程化能力，核心通信原理一致。详见 [[netty-rpc-framework]]。
- 版本演进（番外篇6，基于 2026-08 公开资料）：4.0→4.1 三大升级为 Epoll 原生传输（吞吐 +10-30%，信源口径）、池化全面铺开、HTTP/2 原生；旧 5.0（2018）死于 ForkJoinPool 替代 EventLoop 丢了 Channel-线程绑定确定性 + API 破坏性变更；新 5.0（2024 重启）走渐进演进——JDK 17 底线、清理 deprecated 但保留 4.1 核心用法、io_uring（benchmark 称高吞吐比 epoll +20-50%）、Buffer API 读写拆分+AutoCloseable；升级建议：4.1 继续用、新项目 JDK21+ 可试 5.0、业务跟随中间件版本。
- 调试与排障方法论（番外篇）：本地三件套 EmbeddedChannel/黄金断点/LoggingHandler；线上三板斧 PoolArenaMetric（alloc>dealloc 即泄漏）/pendingTasks() 积压监控/ResourceLeakDetector PARANOID（损耗 5% 以内报泄漏代码行）；epoll 空轮询超 512 次 rebuildSelector 自愈（与第 6/9 篇三方互证）；真实案例 5000 连接超时双根因（ByteBuf 未 release + IO 线程阻塞 DB 查询）修完 RT 800ms→20ms。两条铁律再获第五信源互证。详见 [[netty-debugging-troubleshooting]]。
- 设计模式全景（番外篇7）：十大模式源码落点——模板方法（SimpleChannelInboundHandler 四步骨架把 release 纪律 API 化）、责任链（Pipeline 双向链表+哨兵+动态增删）、工厂方法（ReflectiveChannelFactory 与 Transport 解耦）、观察者（ChannelFuture/DefaultPromise 监听器回调）、命令（WriteTask/ScheduledFutureTask 统一入 taskQueue）、装饰器（WrappedByteBuf 系正交增强）、单例（仅无状态 @Sharable）、适配器（ChannelInboundHandlerAdapter 空实现）、策略（chooser 位运算/取模分派）、建造者（Bootstrap Fluent DSL），另以全景表覆盖代理/组合/状态/享元/迭代器/中介者共 16 模式。详见 [[design-patterns-in-netty]]。
- Spring Cloud Gateway 应用（番外篇）：SCG 底层为 Reactor Netty——httpclient 配置本质是对 Bootstrap/ChannelPool 调参；Server/Client 双 EventLoopGroup（代理模式 Reactor，Server 侧默认 CPU×2、Client 侧 CPU 核数，useNative 切 Epoll）；GlobalFilter 链对应 ChannelPipeline 责任链，NettyRoutingFilter/NettyWriteResponseFilter 最终回落 Channel.writeAndFlush()；生产坑：elastic 连接池无上限易 "Too many open files"（建议 fixed+max-connections）、超时三层（connect/response/单路由覆盖）、多处使用响应须 retain。详见 [[netty-gateway-scg]]。
- 中间件应用全景（番外篇4，系列完结）：RocketMQ 4.x 起 Remoting 全面 Netty 化（4B+4B+JSON header+body 协议、IdleStateHandler 60s、Processor 业务线程池）；Dubbo Transporter 抽象 + Pipeline 三层 + HashedWheelTimer 客户端心跳（默认 60s）；Elasticsearch 5.0 后迁 Netty 4（9200 HTTP/9300 Transport 双传输、Releasable 内存管理、bulk 全异步）；Pulsar 单连接多路复用 + 高低水位 channelWritabilityChanged 消费端反压；五大最佳实践——IO 线程不做业务/Pipeline 分层/IdleStateHandler+应用层心跳/内存必池化/协议从简。详见 [[netty-in-mainstream-middleware]]。
- 生产调优番外（调优篇，系列收官）：五维度清单——线程模型（Boss 1/Worker 2×CPU，容器环境 availableProcessors() 不准须显式 `-Dio.netty.eventLoopThreads`，与"K8s 不感知 cgroup"提示互证）、Channel 参数（TCP_NODELAY 只管内核层 Nagle，应用层攒包管不了；水位线是背压开关）、内存（纯代理用 Direct、频繁改数据用 Heap；release 纪律+leakDetectionLevel，作者案例泄漏致 7 天一次 OOM）、系统层（Linux sysctl 清单+优先 Epoll）、JVM（G1 固定堆+MaxDirectMemorySize+Netty `-D` 参数族）；方法论"不为调优而调优，先监控定位再调整"。口径冲突：该篇"PoolChunk=4096<<11=8MB"与第 10/11 篇"16MB（8192<<11）"不一致，暂倾向既有 16MB。详见 [[netty-performance-tuning]]。
- 系列目录（合集信源）：公众号 32 篇合集目录确认系列全貌——编号 7/12~14/19/26/29 不存在（作者跳号或删除），两个「(30) RPC 实战」为不同 msgid 重复条目（本库收 4662 版）；截至 2026-10-29 全系列除番外篇8（横评，待摄入）与 RPC 重复条目外均已入库。详见 [[netty-source-reading-album]]。

## Products / Projects（产品／项目）

- 生态用法（信源提及）：Dubbo/RocketMQ 的 RPC 编解码默认 LengthFieldBasedFrameDecoder；K8s 环境注意 JDK 不感知 cgroup 按宿主机核数算线程。

## Relationships（关系）

- 下游搭档 [[kafka|Kafka]]：IoT 接入层"Netty 扛连接、Kafka 解耦"是长连接平台的定型组合（IoT 平台信源）。
- 机制对照：零拷贝/批量与 [[kafka-fast-four-mechanisms]] 同源；无锁串行化与 [[springboot-disruptor-event-bus|Disruptor]] 单生产者同理（解读）。

## Timeline（时间线）

- ~2008 — 3.x：NIO 封装初步成型，已废弃（番外篇6）
- 2013 — 4.0：ChannelPipeline 重构、ByteBuf 重写（番外篇6）
- 2016 — 4.1：性能优化、HTTP/2、原生传输；当前绝对主流，维护至少到 2027 以后（番外篇6）
- 2018 — 旧 5.0 Alpha：ForkJoinPool 替代 EventLoop + API 大改，已废弃（番外篇6）
- 2024 — 新 5.0 重启开发：渐进演进，JDK 17 底线、io_uring、Buffer API 重设计（番外篇6，基于 2026-08 公开资料）
- 2025-04-03 — 4.2 GA：AdaptiveByteBufAllocator（适配虚拟线程）、EventLoopGroup 与传输解耦、io_uring 一级传输、HTTP/3 毕业（早前综述信源）
- 矛盾记录（已消解）：早前口径"5.x 已停止推进"与教程第 24 篇"Netty 5 正推 io_uring"曾登记为矛盾；番外篇6 给出分代图景——停止的是 2018 旧 5.0，推进 io_uring 的是 2024 新 5.0，两说法指向不同代际不再冲突。4.2 GA 与新 5.0 的并行关系番外篇6 未提及，留待官方 Release Notes 复核。

## Current Understanding（当前认知）

三十五个信源分层互证：机制层（线程模型/内存/零拷贝）解释"为什么快"，教程三十一信源（源码分析第 1~6、8~11、15~18、20~25、27、28、30 篇与番外篇 4/6/7/9、SCG 番外、调试番外、调优番外及 32 篇系列目录，第 7、12~14、19、26、29 篇未采集）补齐"为什么存在"（JDK NIO 痛点）、入门路径（分层架构图、Echo 三段代码对比）与核心组件内部机制（Reactor 三形态与 ServerBootstrapAcceptor 移交链路；Pipeline 双向链表与双向事件传播、Handler 生命周期；ByteBuf 双指针/扩容/引用计数；EventLoop 三合一结构/run() 循环/ioRatio/chooser/register 异步化；启动三件套 initAndRegister 与 Acceptor 装配源码；run() 主循环的 SelectStrategy/ioRatio/空轮询自愈深挖；PooledByteBufAllocator 的 Arena→Chunk→Page→Subpage 四级与线程缓存；PoolChunk/PoolSubpage 内部算法与 ChunkList 六档流转；写缓冲 ChannelOutboundBuffer 的 write/flush 分离与高低水位背压；connect/bind/close 连接生命周期与四层优雅关闭；IdleStateHandler 三维空闲检测与精确再调度心跳机制；断线重连的双时机触发+退避+EventLoop 调度纪律；HttpObjectDecoder 十二态解码状态机与碎片聚合；WebSocket 握手与 Pipeline 热插拔升级；SslHandler 对 SSLEngine 的透明封装、异步握手与 SslProvider 策略切换；零拷贝四大兵器（FileRegion sendfile/CompositeByteBuf 逻辑拼接/wrappedBuffer 包装/堆外内存）；EpollEventLoop native 传输（三 fd 结构/零 GC 事件/ET 模式/回退纪律）；高低水位背压（CAS 状态切换/延迟传播防重入/isWritable 三件套）；ChannelFuture/DefaultPromise 异步结果模型（读写两侧：单字段 CAS 状态机/监听器懒加载/checkNotifyWaiters 唤醒/EventLoop 亲和通知/EventLoop 禁 sync）；收尾五篇：手写 RPC 框架（协议信封/长度域拆包/动态代理/异步转同步/与 Dubbo 八维差距）、版本演进（4.0→4.1 升级点/旧 5.0 失败教训/新 5.0 的 JDK17+io_uring+Buffer API）、调试排障方法论（EmbeddedChannel/LoggingHandler/PoolArenaMetric/PARANOID 泄漏检测/空轮询自愈/双根因案例）、设计模式全景（十大模式源码落点+16 模式对照表）、应用层三篇（SCG 的双 EventLoopGroup/Filter 链↔Pipeline/连接池与超时三层生产坑；RocketMQ/Dubbo/ES/Pulsar 中间件用法与 IO 线程不做业务等五大最佳实践；Kafka 网络层整体迁移——单 EventLoopGroup 简化、七层 Pipeline、RequestChannel 应用层背压、迁移决策复盘），收官调优番外给出五维度生产调优清单（线程/Channel 参数/内存/系统/JVM）与"监控驱动、不为调优而调优"方法论），两个 IoT 工程层展示"快之外还要什么"——会话路由原子性、命令状态机、背压分层、Drain 发布；李林锋调优层给出百万接入的系统侧配套（句柄/心跳周期/缓冲区/内存池/RPS/JVM）。一致立场：Netty 只保证 IO 层不阻塞，生产级靠使用者的纪律（三十五信源，置信度高）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-20-netty-three-skills-high-performance.md`（性能机制）
- `raw/sources/architecture/2026-10-22-netty-iot-gateway-resilient-design.md`（不变量与可恢复设计）
- `raw/sources/architecture/2026-10-22-netty-redis-kafka-iot-gateway.md`（组件组合与代码骨架）
- `raw/sources/architecture/2026-10-23-netty-million-connection-push-service.md`（海量接入调优清单与 IdleStateHandler 事故案例）
- `raw/sources/architecture/2026-10-27-netty-01-intro.md`（教程开篇：BIO→NIO 痛点、分层架构、bind() 源码路径）
- `raw/sources/architecture/2026-10-27-netty-02-bio-nio.md`（教程对比篇：三段代码对比、十维对照表、适用场景清单）
- `raw/sources/architecture/2026-10-27-netty-03-reactor.md`（教程线程模型篇：Reactor 三形态/ServerBootstrapAcceptor 链路/chooser 演进/自愈阈值 512/选型分档）
- `raw/sources/architecture/2026-10-27-netty-04-channel-pipeline-handler.md`（教程 Pipeline 篇：三剑客关系、事件双向传播源码、Handler 生命周期、ctx.write vs channel.write）
- `raw/sources/architecture/2026-10-27-netty-05-bytebuf.md`（教程 ByteBuf 篇：双指针/扩容策略/三形态/引用计数/分配器体系源码）
- `raw/sources/architecture/2026-10-27-netty-06-eventloop.md`（教程 EventLoop 篇：默认线程数/chooser 位运算/run() 循环/ioRatio/空轮询自愈/wakeup/register 源码）
- `raw/sources/architecture/2026-10-27-netty-08-bootstrap.md`（教程启动篇：initAndRegister 三件套/interestOps 不对称/ServerBootstrapAcceptor 装配源码/避坑清单）
- `raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md`（教程 run() 专篇：SelectStrategy/ioRatio 选型/JDK-2144974 自愈/Selector 迁移源码）
- `raw/sources/architecture/2026-10-27-netty-10-pooled-allocator.md`（教程内存池篇：Arena→Chunk→Page→Subpage 四级/二叉树/位图/线程缓存/泄漏检测）
- `raw/sources/architecture/2026-10-27-netty-11-poolchunk-subpage.md`（教程内存池深入篇：memoryMap 值语义/左优先搜索/Subpage 位图细节/ChunkList 六档/JMH 实测/缓存裁剪参数）
- `raw/sources/architecture/2026-10-27-netty-15-write-flush.md`（教程写缓冲篇：write/flush 分离/ChannelOutboundBuffer/doWrite 写自旋/OP_WRITE/高低水位背压）
- `raw/sources/architecture/2026-10-27-netty-16-connection-mgmt.md`（教程连接管理篇：connect/bind/close 三主线/OP_CONNECT 超时/四层优雅关闭/Promise-Future/半关闭与重试）
- `raw/sources/architecture/2026-10-27-netty-17-idlestate-heartbeat.md`（教程心跳篇：IdleStateHandler 三维检测/精确再调度/Promise 更新写时间戳/IdleStateEvent+isFirst/性能断言与注意事项）
- `raw/sources/architecture/2026-10-27-netty-18-reconnect.md`（教程重连篇：双时机触发/指数退避+抖动/eventLoop.schedule 纪律/channelInactive 链路/心跳+重连完整方案）
- `raw/sources/architecture/2026-10-27-netty-20-http-decoder.md`（教程 HTTP 篇：HttpObjectDecoder 状态机/decode 主循环/chunked 零拷贝/UPGRADED/聚合器与常见坑）
- `raw/sources/architecture/2026-10-27-netty-21-websocket.md`（教程 WebSocket 篇：101 握手/Pipeline 热插拔/帧编解码/掩码铁律/心跳与关闭纪律）
- `raw/sources/architecture/2026-10-27-netty-22-ssl-tls.md`（教程 SSL/TLS 篇：SslHandler 双向加解密/unwrap 四态循环/异步握手/SslContext 工厂/SslProvider 策略/OpenSSL 集成/生产坑与优化）
- `raw/sources/architecture/2026-10-27-netty-23-zero-copy.md`（教程零拷贝篇：四大兵器 FileRegion/CompositeByteBuf/wrappedBuffer/堆外+sendfile 数据路径/六条注意事项）
- `raw/sources/architecture/2026-10-27-netty-24-epoll-native.md`（教程 Native Transport 篇：三 fd 结构/epollWait C 实现/fd 直映射/ET-LT/eventfd+timerfd/简易压测/回退链）
- `raw/sources/architecture/2026-10-27-netty-25-flow-control.md`（教程流量控制篇：WriteBufferWaterMark 32K/64K/ChannelOutboundBuffer 水位检测/CAS 状态切换/invokeLater 防重入/水位经验表）
- `raw/sources/architecture/2026-10-27-netty-27-channelfuture.md`（教程异步结果篇：接口继承链/DefaultPromise 单字段 CAS 状态机/notifyListeners 三细节/await wait-notify/isWritable/三用法五场景/CompletableFuture 对比）
- `raw/sources/architecture/2026-10-27-netty-28-promise.md`（教程 Promise 写侧篇：set/trySuccess 语义/监听器懒加载/checkNotifyWaiters 唤醒路径/取消即 isDone/异步 RPC 与回调封装示例/Promise-CF-FutureTask 对比表）
- `raw/sources/architecture/2026-10-27-netty-30-rpc-framework.md`（教程收官实战篇：300 行 RPC 框架全组件源码/调用流程/设计模式/与 Dubbo 八维差距/生产化注意事项）
- `raw/sources/architecture/2026-10-27-netty-4-to-5.md`（番外篇6：版本演进简史/4.0→4.1 三大升级/旧 5.0 失败两因/新 5.0 四大方向/分场景升级建议）
- `raw/sources/architecture/2026-10-27-netty-debugging-guide.md`（调试番外：EmbeddedChannel/黄金断点/LoggingHandler/PoolArenaMetric/pendingTasks/PARANOID 泄漏检测/空轮询自愈/5000 连接排障案例/工具速查表）
- `raw/sources/architecture/2026-10-27-netty-design-patterns.md`（番外篇7：十大设计模式源码落点+16 模式全景表）
- `raw/sources/architecture/2026-10-27-netty-gateway-scg.md`（SCG 番外：Reactor Netty/双 EventLoopGroup/GlobalFilter↔Pipeline/连接池 elastic vs fixed/超时三层/MiniGateway）
- `raw/sources/architecture/2026-10-27-netty-in-mainstream-middleware.md`（番外篇4 完结篇：RocketMQ/Dubbo/ES/Pulsar 的 Netty 用法+六维对照表+五大最佳实践+服务端模板）
- `raw/sources/architecture/2026-10-27-netty-kafka.md`（番外篇9：Kafka 2.0 网络层自研 NIO→Netty 迁移拆解——单 EventLoopGroup 复用/七层 Pipeline/引用计数坑/RequestChannel 应用层背压/批量 flush/七维决策复盘；消解"Kafka 底层用 Netty"存疑项）
- `raw/sources/architecture/2026-10-27-netty-perf-tuning.md`（调优番外·系列收官：五维度调优清单——线程模型/Channel 参数/内存分配/Linux sysctl/JVM 参数族+生产级 Server 完整示例+问题速查表；"PoolChunk 8MB"口径与第 10/11 篇 16MB 冲突已标注）
- `raw/sources/architecture/2026-10-27-netty-source-reading-album.md`（系列目录：32 篇合集全目，确认编号缺口与 RPC 重复条目，核验本库覆盖率）
