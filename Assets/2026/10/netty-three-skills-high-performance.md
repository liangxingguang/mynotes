# 为什么几个线程就能扛住上万连接？Netty【三大技能】主力高性能场景

> 抓取正文（web-fetch, browser 级）。原始出处：https://mp.weixin.qq.com/s/wZ5L22_CHLj9mEFe5Rz5kw
> 注：微信抓取会压平代码块与表格，以下已按语义重排。

**先说结论**：Netty 的高性能不是一个"黑科技开关"，而是三件事叠加的结果——**用少量线程 + 多路复用把"等 IO"的成本摊薄**（主从 Reactor 线程模型）、**用堆外内存和零拷贝把"搬数据"的成本砍掉**（ByteBuf + FileRegion）、**用无锁串行化把"抢锁"的成本直接消掉**（一个 Channel 终身只绑定一个 EventLoop）。

**核心矛盾**：几乎所有人都能背出"Netty 基于 NIO、主从 Reactor、零拷贝"，但一被追问就露馅——为什么一个线程能管上万连接，多线程反而更慢？ET 和 LT 到底差在哪，Netty 默认是哪个？"零拷贝"零掉的到底是哪一次拷贝？更危险的是版本坑：**Netty 4.2 已于 2025-04-03 GA**，默认内存分配器和 EventLoopGroup 的构造方式都变了。

**本文主线**：先算清 BIO 的成本账、理清三种 IO 模型的演进，再拆 Netty 的主从 Reactor 与 EventLoop 内部循环；然后是三条性能主线——无锁串行化、ByteBuf 与内存池、零拷贝的三层含义；接着是三个高频战场：Selector 空轮询自愈、粘包拆包、原生 epoll 与 ET 模式；最后是参数调优清单与 4.0 / 4.1 / 4.2 版本分水岭表。

## 一、先算账：一连接一线程，为什么撑不住

传统 BIO 服务器：主线程 `accept()` 收到连接后丢给一个线程，该线程一直阻塞在 read() 上等数据。连接涨到万级后的成本账：

| 成本项 | 一万连接的代价 | 说明 |
|---|---|---|
| 线程栈内存 | ≈ 10 GB | Linux x64 上 `-Xss` 默认约 1 MB，一万线程光栈就是 10 GB |
| 上下文切换 | CPU 大量时间花在切换上 | 线程数超过核数后，切换开销可能超过业务计算 |
| 有效利用率 | 极低 | 上万线程里同一时刻真正有数据可处理的可能只有几十个 |
| 调度压力 | OS 调度器成为瓶颈 | 即经典的 C10K 问题（1999 年提出） |

关键结论：**瓶颈不在 CPU，而在"线程数 × 每线程资源"这个乘积**。出路只有一条——让一个线程同时"照看"很多连接，即 IO 多路复用。

多路复用演进路线：阻塞 IO → 非阻塞 IO（忙轮询烧 CPU）→ IO 多路复用（select / poll / epoll）→ 信号驱动 IO → 异步 IO（AIO）。真正被工业界广泛采用的只有第三档：

| 对比项 | select | poll | epoll（Linux） |
|---|---|---|---|
| 连接上限 | 受 `FD_SETSIZE` 限制，默认 1024 | 无固定上限 | 无固定上限 |
| 数据结构 | 位图 fd_set | 数组 pollfd[] | 红黑树 + 就绪链表 rdllist |
| 每次调用 | 全量拷贝 fd 集合，O(n) 遍历 | 全量拷贝，O(n) 遍历 | 注册一次长期有效，只返回就绪集合 |
| 通知复杂度 | O(n) | O(n) | O(就绪数)，n 大时优势明显 |

⚠️ **概念差别**：Netty 官方定位是"异步事件驱动"（asynchronous event-driven），不是"异步 IO（AIO）"。Java 的 `AsynchronousSocketChannel` 是真正的 AIO，但 Linux 上实现不够成熟，Netty 没有把 AIO 作为主线。准确说法：**基于 IO 多路复用 + Reactor 模式实现的异步事件驱动框架**。

## 二、Reactor 三种模型，与 Netty 的主从 Reactor 落地

Reactor 核心思路（出自 Doug Lea《Scalable IO in Java》）：把"等待事件"和"处理事件"解耦，用少量线程 + 一个 Selector 管理海量连接。三种演进形态：

1. **单 Reactor 单线程**：一个线程做 accept、读写派发、跑业务（Redis 早期模型）。无并发问题，但任何 handler 卡住全站阻塞。
2. **单 Reactor 多线程**：Reactor 只收事件，业务丢线程池。瓶颈转移到单线程 Reactor 自身。
3. **主从 Reactor 多线程**：主 Reactor 只负责 accept，从 Reactor 各自负责一批连接的读写。**Netty 采用的模型**。

```java
// bossGroup：主 Reactor，只负责 accept（通常 1 个线程就够）
// workerGroup：从 Reactor 组，负责已建连接的读写；默认线程数 = CPU 核数 × 2
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
EventLoopGroup workerGroup = new NioEventLoopGroup();

ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup)              // 主从 Reactor 的核心落点
        .channel(NioServerSocketChannel.class)       // 服务端 Channel 类型
        .childHandler(new ChannelInitializer<SocketChannel>() {
            protected void initChannel(SocketChannel ch) {
                ch.pipeline().addLast(new IdleStateHandler(60, 0, 0));  // 应用层心跳
            }
        });
ChannelFuture future = bootstrap.bind(8080).sync();
```

📌 **绑定关系是"多对一"**：一个 EventLoop（线程）可注册成千上万个 Channel；但一个 Channel 从注册起**终身只绑定同一个 EventLoop 线程**。所以连接数与线程数彻底解耦——8 核机器 16 个 worker 线程能管几万甚至几十万连接（真正上限是 fd 数与内存）。

为什么必须终身绑定？一旦允许一个 Channel 的事件被不同线程处理，pipeline 上的 handler 就可能被并发调用，所有 handler 都得考虑线程安全。终身绑定换来的就是无锁串行化。

## 三、EventLoop 内部：select → 处理事件 → 跑任务

EventLoop 本质是"带 IO 能力的单线程执行器"，内部维护三个队列，无限循环做三件事：

```java
// NioEventLoop 主循环（简化示意，非源码原文）
for (;;) {
    select(timeoutMillis);       // ① 阻塞等待就绪事件；超时时间由"最早到期的定时任务"反推
    processSelectedKeys();       // ② 处理就绪的 IO 事件（read / write / accept / connect）
    runAllTasks(ioTime * (100 - ioRatio) / ioRatio);  // ③ 执行任务队列
}
```

| 队列 / 参数 | 作用 | 要点 |
|---|---|---|
| 普通任务队列 | 用户提交的 Runnable | MPSC 队列，多生产者单消费者 |
| 定时任务队列 | 延时 / 周期任务 | 优先级队列，下一次 select 超时由最早到期任务决定 |
| 尾部任务队列（tailTasks） | 每轮循环末尾必执行 | 4.1 后期引入，监控埋点落点 |
| `ioRatio` | IO 与任务耗时配比 | 默认 50；任务多可下调、纯 IO 可上调 |
| 线程数 | 默认 CPU 核数 × 2 | `-Dio.netty.eventLoopThreads` 覆盖；`new NioEventLoopGroup(0)` 等于不传参（0 是哨兵） |

关键特性：**任务队列与 IO 事件都在同一线程执行**，同一连接的所有回调串行——没有并发就不需要加锁，即"无锁串行化"。代价也随之浮现：**这个线程被谁拖住，它管的所有连接就一起被拖住**。

## 四、红线：绝对不要在 EventLoop 线程里做阻塞操作

Netty 生产事故排名第一的根因。典型翻车写法：

```java
// ❌ 反面教材：在 channelRead 里同步调用下游服务
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    String result = orderService.query(msg);  // 同步 RPC / JDBC：阻塞数百 ms
    User user = userDao.selectById(id);       // 同理，一样卡死
    ctx.writeAndFlush(result);
}
// 后果：这一个 EventLoop 负责的所有连接（可能上千个）全部无法读写
```

现象：连接大面积超时、P99 飙升但 CPU 不高；jstack 可见 EventLoop 线程卡在业务方法里。

正确做法（按侵入性从低到高）：

1. **异步化**：下游支持异步（CompletableFuture / RPC 异步 API）时用回调写回，最优解。
2. **handler 挂到独立业务线程池**：`pipeline.addLast(businessGroup, handler)`，businessGroup 为 `DefaultEventExecutorGroup`。
3. **丢回任务队列**：`ctx.executor().execute()` 只适合极短任务，耗时操作丢进去没解决问题。

❌ 误区："用了 Netty 就自动高性能"——Netty 只保证 IO 层不阻塞。方案②的第二个坑：handler 进业务线程池后会被多线程并发调用，per-channel 状态必须放进 `Channel.attr()` 或用不可变对象——**无锁串行化的收益在切出 EventLoop 的瞬间消失**。

## 五、Selector 空轮询：JDK 的老 bug 与 Netty 的自愈

现象：Linux 上 `selector.select(timeout)` 在某些边界情况（对端异常断开、EPOLLHUP/EPOLLERR 处理不一致）下会立刻返回 0 且无就绪事件；外层 `while(true)` 就变成空轮询，CPU 飙到 100%。即著名的 JDK epoll bug（JDK-6403933、JDK-6670302）。

Netty 的应对是"检测 + 重建 Selector"：

```java
// 核心逻辑（示意，非源码原文）
private static final int SELECTOR_AUTO_REBUILD_THRESHOLD =
        SystemPropertyUtil.getInt("io.netty.selectorAutoRebuildThreshold", 512);

int selectCnt = 0;
for (;;) {
    int selectedKeys = selector.select(timeoutMillis);
    selectCnt++;
    if (selectedKeys != 0 || hasTasks()) {
        selectCnt = 0;                    // 正常处理了事件/任务，计数归零
    } else if (selectCnt >= SELECTOR_AUTO_REBUILD_THRESHOLD) {
        rebuildSelector();                // 判定为空轮询 bug，重建
        selectCnt = 0;
    }
}
```

`rebuildSelector()`：新建 Selector → 旧 Selector 上所有 Channel 重新注册到新 Selector → 关闭旧 Selector。对业务无感，连接不断。

| 项目 | 内容 |
|---|---|
| 判定阈值 | 连续空轮询 512 次（可调）；前提是本次 select 超时 ≥ 1 秒 |
| 计数归零条件 | 返回了就绪 key，或本轮有待执行任务 |
| 重建代价 | 一次 Selector 创建 + 全量重新注册，极低频兜底 |
| 线上价值 | 没有这段逻辑就得自己写空转检测——原生 NIO "写着写着就写了个小 Netty" 的例证 |

📌 答题分寸：该 bug 在新版 JDK + 新内核上复现概率已很低，Netty 保留这段逻辑是防御性编程。正确表述是"Netty 内置了针对 JDK epoll 空轮询 bug 的自愈机制（阈值 512，可配置）"。

## 六、ByteBuf：读写双指针、引用计数与内存池

ByteBuf 解决 JDK ByteBuffer 三个设计痛点：

| 痛点 | JDK ByteBuffer | Netty ByteBuf |
|---|---|---|
| 读写模式 | 共用 position，读前必须 `flip()` | readerIndex / writerIndex 双指针分离 |
| 容量 | 固定，写满只能 new 更大的再拷 | 自动扩容（受 maxCapacity 约束） |
| 组合与切片 | 无组合能力 | CompositeByteBuf 逻辑组合、slice / duplicate 零拷贝视图 |
| 内存复用 | 靠 JVM GC | 池化 + 引用计数，手动 retain/release |

双指针语义：**[0, readerIndex) 已读，[readerIndex, writerIndex) 可读，[writerIndex, capacity) 可写**。

引用计数是 Netty 内存泄漏的头号来源：

```java
// 写法 A：SimpleChannelInboundHandler —— 处理完自动 release，推荐
public class AutoReleaseHandler extends SimpleChannelInboundHandler<ByteBuf> {
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {
        // msg 会被父类在 finally 中自动 release()，不用自己管
    }
}

// 写法 B：ChannelInboundHandlerAdapter —— 必须手动 release，漏了就泄漏
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    ByteBuf buf = (ByteBuf) msg;
    try {
        doSomething(buf);
    } finally {
        buf.release();  // 谁最后持有谁释放；忘了这一行 = 堆外内存泄漏
    }
}
```

为什么需要引用计数：ByteBuf 可分配在堆外（Direct Memory），堆外内存申请/释放代价高，不能交给 GC。Netty 做法：**池化管理分配，引用计数管理回收**。内存池抄 jemalloc 分层设计：Arena → Chunk（默认 16 MB = pageSize 8 KB × 2^11）→ Page → SubPage，每线程挂 PoolThreadCache 避免跨线程加锁。

分配器默认值的版本变迁（必考）：

| 版本 | 默认分配器 | 说明 |
|---|---|---|
| 4.0.x | UnpooledByteBufAllocator | 非池化，已 EOL |
| 4.1.x | PooledByteBufAllocator | 池化转正为默认；Android 例外仍非池化 |
| 4.2.x | AdaptiveByteBufAllocator | 自适应分配器成新默认，设计上适配虚拟线程 |

手动指定：`-Dio.netty.allocator.type=unpooled|pooled|adaptive`。Netty 默认开启内存泄漏检测（`io.netty.leakDetection.level`，默认 SIMPLE 抽样）——有性能成本，线上稳定确认无泄漏后才考虑降级。

⚠️ 堆外内存泄漏现象：**RSS 持续上涨、容器被 OOMKilled，但 jmap 看堆很正常**。排查靠泄漏检测日志（`LEAK: ByteBuf.release() was not called...` 附分配栈）、`-XX:MaxDirectMemorySize` 与 NMT。

## 七、零拷贝：三层含义，别混为一谈

最常见错误是把零拷贝等同于 sendfile——Netty 的零拷贝包含三个层次：

1. **OS 层：文件传输零拷贝**。`DefaultFileRegion` + `FileChannel.transferTo()` → 底层 `sendfile(2)`。数据从页缓存直送网卡，不经过用户态。
2. **JVM 层：堆外直接内存**。堆内 ByteBuf 做 socket 写时 JVM 必须先拷到堆外（GC 会移动堆内对象）；DirectByteBuf 省掉这次拷贝。
3. **应用层：缓冲区组合与切片**。框架级零拷贝：`CompositeByteBuf` 逻辑合并、`slice()/duplicate()` 共享视图、`Unpooled.wrappedBuffer()` 包装 byte[]。

| 层次 | 典型 API | 省掉的是哪次拷贝 | 失效 / 代价 |
|---|---|---|---|
| OS 层 | DefaultFileRegion、transferTo | 内核页缓存 → 用户态 → 内核往返 | 走 TLS 时失效；无 DMA gather 网卡仍有 1 次 CPU 拷贝 |
| JVM 层 | DirectByteBuf、directBuffer() | 堆内 → 堆外临时拷贝 | 分配/释放更贵，靠池化 + 引用计数兜住 |
| 应用层 | CompositeByteBuf、slice、wrappedBuffer | 应用内合并/复制开销 | 共享内存 = 生命周期耦合 |

📌 加分点：**gathering write（聚合写）**——一次写多个 ByteBuf 时调用 `ByteBuffer[]` 重载（对应 `writev`），避免先合并。它和 sendfile 是两条独立路径。

## 八、粘包与拆包：TCP 是字节流，不是消息流

根因：TCP 只保证字节流有序可靠到达，不保留应用层消息边界。"发了 3 条消息对端拆成 1+2 读到"完全正常。解决思路是应用层自定义帧边界：

| 约定方式 | 解码器 | 适用与坑 |
|---|---|---|
| 定长 | FixedLengthFrameDecoder | 最简单，只适合报文大小稳定场景 |
| 行分隔 | LineBasedFrameDecoder | `\n`/`\r\n` 结束，适合文本协议 |
| 分隔符 | DelimiterBasedFrameDecoder | 自定义分隔符；必须确保分隔符不出现在消息体 |
| 长度字段 | LengthFieldBasedFrameDecoder | 最通用，协议设计默认选择（RPC、Dubbo、RocketMQ） |

长度字段方案五个参数：

```java
// 假设协议：4 字节魔数 + 4 字节长度字段 + 消息体
// 约定"长度字段的值 = 整个帧的总字节数"（含魔数与长度字段自身），则 lengthAdjustment = -8
//   frameLength = lengthFieldEndOffset + lengthAdjustment + 长度字段的值
//               = 8 + (-8) + 总帧长 = 总帧长 ✔
// 解码后只保留消息体，所以 initialBytesToStrip = 8
pipeline.addLast(new LengthFieldBasedFrameDecoder(
        1 << 20,   // ① maxFrameLength    单帧上限，防"长度字段被改大"导致 OOM
        4,         // ② lengthFieldOffset 长度字段起始偏移（跳过 4 字节魔数）
        4,         // ③ lengthFieldLength 长度字段占几字节
        -8,        // ④ lengthAdjustment  修正量
        8          // ⑤ initialBytesToStrip 解码后剥掉前几字节
));
```

实现层面：`ByteToMessageDecoder` 内部维护累积缓冲区（cumulation），半包到达时暂存剩余字节等下一批拼起来解码——自定义解码器不要每次 new 新 ByteBuf 去拼，也不要假设 read 到的一定是完整消息。

## 九、原生 epoll：ET / LT 与 JDK Selector 的真实差异

纠正错误认知：**"Netty 在 Linux 上默认用原生 epoll"——不对**。`new NioEventLoopGroup()` 走 JDK Selector。Linux 上 JDK Selector 底层也是 epoll，但被包了一层统一抽象：只支持水平触发、每次返回全量就绪集合需遍历比对、每轮产生较多临时对象。

| 维度 | NioEventLoopGroup（JDK Selector） | EpollEventLoopGroup（原生） |
|---|---|---|
| 调用路径 | 应用 → JDK Selector → 内核 | 应用 → JNI → 内核 epoll |
| 触发模式 | 只有水平触发（LT） | 默认边缘触发（ET），可切回 LT |
| 平台 | 跨平台 | 仅 Linux（macOS/BSD 用 KQueue） |
| 独有能力 | — | 半关闭检测、SO_REUSEPORT、TCP_CORK、TCP_FASTOPEN |

LT 与 ET 的差别（场景：接收缓冲区 100 字节只读了 30 字节）：

- **LT**：缓冲区还有数据没读完，`epoll_wait` 反复通知。编程简单，但高并发下大量"无新数据唤醒 + 系统调用"。
- **ET**：只有状态变化时通知一次。系统调用更少；代价是必须一次读到 EAGAIN（读空），漏读的数据要等下一批到达。

Netty 原生 epoll 默认 ET 是设计前提：`EpollMode` 默认 `EDGE_TRIGGERED`，只能在 Channel 注册之前修改。切换写法：

```java
// ① 加依赖：netty-transport-native-epoll（含 linux-x86_64 / aarch_64 分类器）
// ② 换 Channel 类型 + 换 EventLoopGroup，并判断平台可用性
boolean epollOk = Epoll.isAvailable();   // 非 Linux 或缺少 native 库时为 false

EventLoopGroup boss = epollOk ? new EpollEventLoopGroup(1)
                              : new NioEventLoopGroup(1);
EventLoopGroup worker = epollOk ? new EpollEventLoopGroup()
                                : new NioEventLoopGroup();

ServerBootstrap b = new ServerBootstrap()
        .group(boss, worker)
        .channel(epollOk ? EpollServerSocketChannel.class
                         : NioServerSocketChannel.class)
        // 仅在需要精确控制 autoRead / maxMessagesPerRead 时才切回 LT
        .childOption(EpollChannelOption.EPOLL_MODE, EpollMode.EDGE_TRIGGERED);

// Netty 4.2 起 EventLoopGroup 与传输解耦，写法变为：
// new MultiThreadIoEventLoopGroup(EpollIoHandler.newFactory())
```

⚠️ ET 模式两个实战坑：① **延迟抖动**——因 `MAX_MESSAGES_PER_READ` 或水位限制提前停读，剩余半包要等下一批数据到达才被处理；② **不能用 LT 假设写代码**——若要把 `autoRead` 设 false 或依赖 `maxMessagesPerRead` 精确生效，应切回 `LEVEL_TRIGGERED`。

## 十、关键参数与调优清单

| 参数 | 默认值 | 要点 |
|---|---|---|
| SO_BACKLOG | NetUtil.SOMAXCONN | 高并发接入要显式调大，同时调大内核 `/proc/sys/net/core/somaxconn` |
| TCP_NODELAY | true（Netty 主动开启） | 比 JDK Socket 默认 false 更激进，低延迟服务不用再设 |
| SO_KEEPALIVE | false | TCP 层探测间隔以小时计，长连接保活自己做应用层心跳（IdleStateHandler） |
| WRITE_BUFFER_WATER_MARK | 低 32 KB / 高 64 KB | 超高水位后 `isWritable()` 返回 false，是反压开关 |
| WRITE_SPIN_COUNT | 16 | 一次写最多自旋 16 次，避免大写入饿死同线程其他连接 |
| MAX_MESSAGES_PER_READ | 16（ServerChannel 与字节类），其余 1 | ET 模式下过小会"读不干净"造成延迟抖动 |
| AUTO_READ | true | 关闭后手动 `channel.read()`，最常用的业务级流控手段 |
| ALLOCATOR | 4.1 pooled / 4.2 adaptive | `-Dio.netty.allocator.type` 覆盖 |
| CONNECT_TIMEOUT_MILLIS | 30000 | Netty 层超时，不是 TCP 握手超时 |
| 线程数 / ioRatio | CPU×2 / 50 | 容器场景小心：JDK 不能感知 cgroup 时线程数按宿主机核数算（JDK 10+ / 8u191+ 默认容器感知） |

## 十一、版本分水岭：4.0 / 4.1 / 4.2 到底差什么

| 版本线 | 关键变化 | 现状与建议 |
|---|---|---|
| 4.0.x | 默认非池化分配器 | 2018 年已 EOL，不要用 |
| 4.1.x | 默认池化分配器（Android 除外）；引入 ioRatio、tailTasks | 长期主力分支，但官方明确只接收 bugfix，新特性只进 4.2；截至成稿最新 4.1.135.Final（2026-06-02） |
| 4.2.x | ① 默认自适应分配器 AdaptiveByteBufAllocator（适配虚拟线程）② EventLoopGroup 与传输解耦为 MultiThreadIoEventLoopGroup ③ io_uring 毕业成一级传输模块（需 JDK 9+）④ HTTP/3 在 4.2.2 毕业 | 4.2.0.Final 2025-04-03 发布，最低 JDK 8；当前 4.2.16.Final（2026-07-07）。新项目可优先选 4.2，升级要同步改 EventLoopGroup 构造写法 |
| 5.0.x | 曾尝试新线程模型 | 已停止推进（停留 2022 年 Alpha），特性回流 4.x。面试不要说"正在用 Netty 5" |

📌 升级前联动检查：Reactor Netty、gRPC-Java、Dubbo、RocketMQ、ES 客户端都对 Netty 版本有绑定，多版本共存会类加载冲突（`NoSuchMethodError` 出现在 `io.netty` 包下）。正确做法是先查上层 BOM 声明的 Netty 版本统一由其管理。

## 十二、高频追问 Q&A

**Q1：Netty 是 NIO 还是 AIO？为什么不用 AIO？**
基于 NIO（IO 多路复用）+ Reactor 模式，官方定位"异步事件驱动"。不用 AIO：① Linux 上 AIO 实现长期不成熟；② 编程模型更复杂；③ 收益不明确——瓶颈往往在数据拷贝和业务处理。Netty 4.2 起把 io_uring 提为一级传输模块，才是 Linux 上探索更高性能异步 IO 的方向。

**Q2：bossGroup 设 2 个及以上线程有意义吗？**
绝大多数情况没有，设 1 就够。accept 只是轻量系统调用。新建连接上不去先看 SO_BACKLOG、fd 上限和内核参数，而不是加 boss 线程。

**Q3：EventLoop 线程数为什么建议 CPU×2，再多会怎样？**
默认值逻辑：工作里既有 IO（不耗 CPU）也有编解码（耗 CPU），留一倍冗余。但不是定理：① 超过核数后收益来自"某线程阻塞时其他线程还能跑"，完全异步时核数附近就够；② 线程越多跨线程交接和切换反而增加；③ 最危险是容器里 `availableProcessors()` 按宿主机核数返回导致线程数暴涨。正确做法是按压测调。

**Q4：ChannelHandler 加 @Sharable 是什么场景？**
`@Sharable` 表示同一实例可加到多个 pipeline，用于无状态公共 handler（统一日志、统计、全局编解码器）。默认不允许共享是因为 Netty 无法判断线程安全——有 per-channel 状态的 handler 共享后会跨连接串数据。判断标准：无状态才可分享，有状态必须每连接 new 一个。

**Q5：堆外内存越多越好吗？怎么排查泄漏？**
不是。收益是免一次拷贝、不受 GC 停顿影响；代价是分配/释放贵、泄漏难定位。排查路径：① 看现象——RSS 上涨、容器 OOMKilled（退出码 137）但 jmap 堆正常；② 泄漏检测临时调到 PARANOID，日志带分配点调用栈；③ 用 NMT 或 `-XX:MaxDirectMemorySize` 把问题暴露成明确异常。常见漏点：retain 了没 release、ByteBuf 塞进异步队列没兜底释放、异常分支跳过 release。

**Q6：为什么 HTTPS 场景享不到 sendfile？大文件下载怎么优化？**
sendfile 前提是数据不进用户态，而 TLS 必须在用户态逐段加密——SslHandler 一出现 FileRegion 路径就失效。优化：① 静态资源走 CDN/对象存储（最优）；② 非加密场景 ChunkedWriteHandler + FileRegion 流式发送；③ 加密场景用原生 SslContext（OpenSSL/tcnative）+ 池化 ByteBuf；④ 绝不用 `Files.readAllBytes()` 读整文件。

**📌 一句话收尾**：Netty 高性能压缩成一条链——主从 Reactor 少量线程管海量连接 → Channel 终身绑定 EventLoop 换来无锁串行化 → EventLoop 三段循环 → 三层零拷贝（堆外内存 / CompositeByteBuf / sendfile）→ 池化 + 引用计数管内存 → 参数调优贴合业务。关键是每环说清"省下了什么成本"；记住版本线：4.1 只修 bug、4.2 才是新特性所在，5.x 已停止推进。
