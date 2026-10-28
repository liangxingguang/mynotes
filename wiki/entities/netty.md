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
  - wiki/entities/kafka.md
---
# Netty

## Overview（概览）

Java 异步事件驱动网络框架（基于 IO 多路复用 + Reactor，**不是 AIO**）。在本库三个信源中分别作为性能机制拆解对象（三大技能）与两个百万级 IoT 长连接接入层的核心组件出现，构成"机制+工程"互证。

## Identity（身份信息）

- Type（类型）: 开源异步事件驱动网络框架
- Organization（所属组织）: Netty Project（起源于 JBoss，背景知识信源未详述）
- Role（角色）: 高并发长连接/ RPC 的通信底座——主从 Reactor 摊薄等 IO 成本、零拷贝砍搬数据成本、无锁串行化消抢锁成本
- Status（状态）: 主流活跃（4.1 池化转正只收 bugfix；4.2 于 2025-04-03 GA：AdaptiveByteBufAllocator、传输解耦、io_uring 一级传输、HTTP/3 毕业；5.x 已停止推进）

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
- 生态位（教程信源说法）：Dubbo/gRPC（RPC）、RocketMQ（消息）、Spring WebFlux/Spring Cloud Gateway、Elasticsearch 节点通信、ZooKeeper 3.6+ 可选、Hadoop/Spark 部分组件；同信源把 Kafka 列入"底层用 Netty"，本库无信源支撑、与既有认知不一致，标记存疑不作定论。

## Products / Projects（产品／项目）

- 生态用法（信源提及）：Dubbo/RocketMQ 的 RPC 编解码默认 LengthFieldBasedFrameDecoder；K8s 环境注意 JDK 不感知 cgroup 按宿主机核数算线程。

## Relationships（关系）

- 下游搭档 [[kafka|Kafka]]：IoT 接入层"Netty 扛连接、Kafka 解耦"是长连接平台的定型组合（IoT 平台信源）。
- 机制对照：零拷贝/批量与 [[kafka-fast-four-mechanisms]] 同源；无锁串行化与 [[springboot-disruptor-event-bus|Disruptor]] 单生产者同理（解读）。

## Timeline（时间线）

- 4.0 — 非池化，已 EOL
- 4.1 — 池化转正（Android 除外），只收 bugfix（成稿时 4.1.135）
- 2025-04-03 — 4.2 GA：AdaptiveByteBufAllocator（适配虚拟线程）、EventLoopGroup 与传输解耦、io_uring 一级传输、HTTP/3 毕业
- 5.x — 已停止推进

## Current Understanding（当前认知）

二十四个信源分层互证：机制层（线程模型/内存/零拷贝）解释"为什么快"，教程二十信源（源码分析第 1~6、8~11、15~18、20~25 篇，第 7、12~14、19 篇未采集）补齐"为什么存在"（JDK NIO 痛点）、入门路径（分层架构图、Echo 三段代码对比）与核心组件内部机制（Reactor 三形态与 ServerBootstrapAcceptor 移交链路；Pipeline 双向链表与双向事件传播、Handler 生命周期；ByteBuf 双指针/扩容/引用计数；EventLoop 三合一结构/run() 循环/ioRatio/chooser/register 异步化；启动三件套 initAndRegister 与 Acceptor 装配源码；run() 主循环的 SelectStrategy/ioRatio/空轮询自愈深挖；PooledByteBufAllocator 的 Arena→Chunk→Page→Subpage 四级与线程缓存；PoolChunk/PoolSubpage 内部算法与 ChunkList 六档流转；写缓冲 ChannelOutboundBuffer 的 write/flush 分离与高低水位背压；connect/bind/close 连接生命周期与四层优雅关闭；IdleStateHandler 三维空闲检测与精确再调度心跳机制；断线重连的双时机触发+退避+EventLoop 调度纪律；HttpObjectDecoder 十二态解码状态机与碎片聚合；WebSocket 握手与 Pipeline 热插拔升级；SslHandler 对 SSLEngine 的透明封装、异步握手与 SslProvider 策略切换；零拷贝四大兵器（FileRegion sendfile/CompositeByteBuf 逻辑拼接/wrappedBuffer 包装/堆外内存）；EpollEventLoop native 传输（三 fd 结构/零 GC 事件/ET 模式/回退纪律）；高低水位背压（CAS 状态切换/延迟传播防重入/isWritable 三件套）），两个 IoT 工程层展示"快之外还要什么"——会话路由原子性、命令状态机、背压分层、Drain 发布；李林锋调优层给出百万接入的系统侧配套（句柄/心跳周期/缓冲区/内存池/RPS/JVM）。一致立场：Netty 只保证 IO 层不阻塞，生产级靠使用者的纪律（二十四信源，置信度高）。

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
