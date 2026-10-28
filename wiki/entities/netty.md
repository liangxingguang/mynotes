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

十六个信源分层互证：机制层（线程模型/内存/零拷贝）解释"为什么快"，教程十二信源（源码分析第 1~6、8~11、15、16 篇，第 7、12~14 篇未采集）补齐"为什么存在"（JDK NIO 痛点）、入门路径（分层架构图、Echo 三段代码对比）与核心组件内部机制（Reactor 三形态与 ServerBootstrapAcceptor 移交链路；Pipeline 双向链表与双向事件传播、Handler 生命周期；ByteBuf 双指针/扩容/引用计数；EventLoop 三合一结构/run() 循环/ioRatio/chooser/register 异步化；启动三件套 initAndRegister 与 Acceptor 装配源码；run() 主循环的 SelectStrategy/ioRatio/空轮询自愈深挖；PooledByteBufAllocator 的 Arena→Chunk→Page→Subpage 四级与线程缓存；PoolChunk/PoolSubpage 内部算法与 ChunkList 六档流转；写缓冲 ChannelOutboundBuffer 的 write/flush 分离与高低水位背压；connect/bind/close 连接生命周期与四层优雅关闭），两个 IoT 工程层展示"快之外还要什么"——会话路由原子性、命令状态机、背压分层、Drain 发布；李林锋调优层给出百万接入的系统侧配套（句柄/心跳周期/缓冲区/内存池/RPS/JVM）。一致立场：Netty 只保证 IO 层不阻塞，生产级靠使用者的纪律（十六信源，置信度高）。

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
