---
title: 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/Ymasw1q6aL5JGcIvv4y04w"
source_type: link
platform: wechat
captured: 2026-10-22
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-22-netty-iot-gateway-resilient-design.md
asset_ref: Assets/2026/10/netty-iot-gateway-resilient-design.md
---

# 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统

# 百万 IoT 设备并发接入：把 Netty 网关做成可恢复、可验证的连接系统

> 原文：https://mp.weixin.qq.com/s/Ymasw1q6aL5JGcIvv4y04w
> 说明：原文 K8s YAML 片段在网页渲染中串行，已按语义还原。

“百万连接”不是把 `ulimit` 调大、启动更多 EventLoop 就结束的事。真正困难的是：设备会断线重连、网络会抖动、慢设备会拖住写缓冲、下游会变慢、节点会被发布系统终止。一个接入层若只在一切正常时跑得快，遇到这些条件就会把局部故障放大成全网重连。

本文讨论的工程问题是：**在设备长期保持 TCP/TLS 连接、持续上报数据并接收控制命令的条件下，如何用 Netty 构建一个不会阻塞 EventLoop、能限制资源、能定位会话、能在失败后恢复的接入网关。**

文中“100 万设备、每 5 秒一条 64B 上报”等数字均为容量推导示例，不代表压测结果或线上数据。具体的单机连接数、线程数和内核参数必须由目标机器、内核、协议包大小与压测结果共同决定。

## 先划清边界：Gateway 做什么，不做什么

接入层的职责很窄，但必须做扎实：TLS、帧边界、轻量校验、设备认证、连接与会话生命周期、上下行背压，以及把消息交给后续系统。它不应在 ChannelHandler 里查数据库、调用慢 RPC、执行长事务或做复杂规则计算。

```
Device -- TCP/TLS --> L4 LB --> Netty Gateway --> message ingress --> consumers
                                          |
                                          +--> telemetry / event processing
                                          +--> session index <-- command service
```

这里有两个常被混淆的状态：

* `Channel` 是本机 JVM 中的活对象，只有拥有该连接的 Gateway 能写它。
* “某设备现在在哪台 Gateway”是分布式路由索引，可由外部存储承载。

这一区分决定了故障策略：路由索引短暂不可用，不应让已有的本地连接全部断开；但无法定位会话时，跨节点下发应明确失败或重试，不能猜测。

## 从最小可行版本开始，而不是从组件清单开始

若系统只有一台 Gateway，最简单且正确的 V1 是本地 `ConcurrentHashMap<DeviceId, Channel>`：认证成功后注册，断开后条件删除，命令也由同一进程写入 Channel。此时既不需要 Redis，也不需要消息队列。

规模变化后，V1 的两个边界才会出现：命令服务与连接不在同一进程，且遥测上报不能直接阻塞 Gateway 写入数据库。于是分别引入两项能力：

| 新出现的问题 | 最小补充能力 | 不负责什么 |
| --- | --- | --- |
| 其他服务要找到连接所在节点 | 会话路由索引 | 保存 Channel、替代本地连接表 |
| 上报需要被多个慢消费者异步处理 | 有界的消息入口/持久消息流 | 无限缓冲、替代限流策略 |

如果部署环境不是 Kubernetes，后文的 Drain 思想仍成立，只是由进程管理或负载均衡实现，而非某个特定 YAML。反过来，也不应因为用了 Kubernetes 就默认需要服务网格、跨地域或复杂服务发现。

## 容量先算“连接 + 消息”，再谈单机能扛多少

假设 100 万台设备每 5 秒上报一次，平均上报为 64B：

```
平均消息速率 = 1,000,000 / 5 = 200,000 msg/s
仅业务负载   = 200,000 × 64B ≈ 12.2 MiB/s
```

这只是有效载荷。TLS 记录、协议头、ACK、心跳、TCP 包头、重传和突发都会增加网络与 CPU 消耗。更重要的是，上报不总是均匀分布：整点任务、网络恢复和固件缺陷都可能让平均速率瞬间失去意义。

单节点容量也不能只用“连接数”表达。应把下列指标一起压到安全阈值内，再定义该节点的安全容量：

```
活跃连接数、每秒入/出消息、p99 EventLoop 延迟、堆与堆外内存、FD 使用率、网络带宽、可写 Channel 比例、下游入口积压。
```

例如，若压测后把单节点安全容量定为 80,000 连接，目标 100 万连接的理论节点数为 13；生产副本数还必须覆盖单节点失效、滚动发布和连接倾斜。不要从“机器数刚好相除”推导出可用性。

## 协议：长度字段解决边界，认证解决安全

TCP 是字节流，不保留应用消息边界。协议必须定义清楚的帧长度与版本边界；下面是一种固定头加可变载荷的例子（网络字节序）：

```
0                   1                   2                   3
+-------+-------+-------+-------+-------------------------------+
| magic | ver   | type  | flags | headerLength (uint16)         |
+-------------------------------+-------------------------------+
| payloadLength (uint32)        | messageId (uint64)            |
+-------------------------------+-------------------------------+
| timestamp (uint64)                                            |
+---------------------------------------------------------------+
| payload (N bytes)                              | payloadCrc32 |
+---------------------------------------------------------------+
```

固定头为 26B，`payloadLength` 指向 N，而不是整帧长度。`uint32` 只表示协议编码能力，**绝不表示网关愿意接收 4GiB 包**；业务限制应在解帧前生效，例如遥测帧最大 8KiB、固件分片使用另一类消息及更小的分片上限。

CRC32 可以发现意外传输损坏，却不能证明消息来自合法设备：攻击者能改写内容后重新计算 CRC。外网接入的基本防线是 TLS；设备认证可采用 mTLS，或在受限设备上使用带密钥版本、时间窗口和 nonce 的 MAC。若使用时间戳做重放窗口，设备时钟漂移必须被纳入协议约定，不能把时间戳当作严格顺序。

同一设备的业务顺序应由单调 `sequence` 或 `messageId` 表示。接收侧以 `(deviceId, messageId)` 或协议定义的序列窗口去重；时间戳只适合观测、过期判断与辅助排障。

### 先把帧边界交给 Netty

假设上述固定头中长度字段从偏移 6 开始、长度为 4B，且帧尾有 4B CRC，那么长度字段结束后还有 `messageId + timestamp + CRC = 20B`。以下配置将半包与粘包处理交给 Netty，并拒绝超长帧：

```java
public final class GatewayInitializer extends ChannelInitializer<SocketChannel> {
    private static final int MAX_TELEMETRY_FRAME = 8 * 1024;
    @Override
    protected void initChannel(SocketChannel ch) {
        ChannelPipeline p = ch.pipeline();
        p.addLast("ssl", sslContext.newHandler(ch.alloc()));
        p.addLast("idle", new IdleStateHandler(90, 0, 0, TimeUnit.SECONDS));
        p.addLast("frame", new LengthFieldBasedFrameDecoder(
                MAX_TELEMETRY_FRAME,
                6, 4,
                20,  // length 字段结束后，直到帧尾还剩 20B
                0));
        p.addLast("decode", new ProtocolDecoder());
        p.addLast("auth", new AuthHandler(authExecutor));
        p.addLast("session", new SessionHandler(sessionService));
        p.addLast("dispatch", new IngressHandler(ingress));
    }
}
```

这段代码依赖一个关键不变量：**解码器参数必须与字节布局一起变更和测试。** 协议新增字段却不更新 `lengthAdjustment`，可能截断帧、吞掉下一帧，或让攻击流量占住缓冲。对 magic、版本、headerLength、类型、CRC、长度与认证失败应设置明确的关闭策略和指标；不要向未认证连接返回过多细节。

## EventLoop 的纪律：只做短、确定、可限时的工作

Netty 的 Worker EventLoop 同时服务许多 Channel。一次同步 DB 查询、阻塞式 HTTP 调用或大对象反序列化，影响的不是当前设备，而是同一 EventLoop 上所有设备的读写与心跳。

```
EventLoop 被阻塞 -> Read/Write 延迟上升 -> 心跳超时 -> 批量断连
                 -> 设备同时重连 -> accept 与认证拥塞 -> 级联放大
```

因此 EventLoop 中只保留解帧、有限大小的解码、状态检查、轻量限流和投递动作。可能阻塞的认证查验、外部调用或重计算应切换到有界执行器；执行器饱和时必须拒绝、限流或关闭连接，而不是无界排队。

```java
public final class IngressHandler extends SimpleChannelInboundHandler<DeviceMessage> {
    private final TelemetryIngress ingress;
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, DeviceMessage msg) {
        if (!ingress.trySubmit(msg.copyForAsync())) {
            // 策略由消息等级决定：遥测可拒绝/降采样；控制 ACK 不可静默丢弃。
            ctx.channel().config().setAutoRead(false);
            ctx.executor().schedule(
                    () -> ctx.channel().config().setAutoRead(true),
                    100, TimeUnit.MILLISECONDS);
        }
    }
}
```

这里的 `copyForAsync()` 是刻意的。`ByteBuf` 的生命周期通常止于当前 Handler 回调；若要跨线程或放入队列，必须复制为普通不可变数据，或严格 `retain()` 并在唯一消费者处 `release()`。后者很容易造成堆外泄漏，接入层更适合把跨边界消息规范化为受大小限制的领域对象。

`setAutoRead(false)` 只是在**入站**链路主动减速，不能解决慢设备的出站拥塞；两者要分别设计。

## 会话生命周期：新连接不能被旧连接删掉

设备重连和并发登录必然发生。我们需要维护的不是“设备是否在线”这种模糊状态，而是具有所有权的会话：

```
CONNECTED -> AUTHENTICATING -> ONLINE -> DRAINING -> CLOSED
```

会话不变量是：**本地表中 `deviceId` 对应的 Channel，只能被该 Channel 自己移除；分布式索引只在它仍指向本次连接时才可删除。**

```java
public final class LocalSessions {
    private final ConcurrentMap<String, Channel> channels = new ConcurrentHashMap<>();
    public void replace(String deviceId, Channel next) {
        Channel previous = channels.put(deviceId, next);
        if (previous != null && previous != next) {
            previous.close(); // 单设备单连接策略；多连接业务需改成集合模型
        }
    }
    public void removeOnlyOwner(String deviceId, Channel channel) {
        channels.remove(deviceId, channel);
    }
}

@Override
public void channelInactive(ChannelHandlerContext ctx) {
    DeviceSession session = ctx.channel().attr(SESSION).get();
    if (session != null) {
        localSessions.removeOnlyOwner(session.deviceId(), ctx.channel());
        sessionIndex.deleteIfMatches(session.deviceId(), session.connectionId());
    }
    ctx.fireChannelInactive();
}
```

`deleteIfMatches` 必须是外部存储中的条件操作（例如带 connectionId 比较的原子脚本或版本条件更新），不能是盲删。否则旧连接 A 被新连接 B 替换后，A 的 `channelInactive` 会把 B 的路由也删掉。

集群中，索引可为 `deviceId -> gatewayId, connectionId, expireAt`。它是路由提示，不是连接事实。命令服务先查索引，再把命令交给目标 Gateway；Gateway 写入本地 Channel 前再次核对 connectionId。索引过期、节点刚崩溃或设备已重连时，旧路由命令应得到“未投递”的确定结果，转入命令自己的重试流程，而不是写入一个已失效的 Channel。

## 心跳与断线：把重连洪峰当作协议的一部分

TCP keepalive 只能帮助发现传输层失效，不表示设备应用仍在工作。业务协议应定义 heartbeat/ACK，服务器以“最后一次有效业务消息或心跳”的时间判定空闲。心跳间隔和超时应留出多个周期与网络抖动余量；例如 30 秒心跳并不意味着 30 秒无消息就立即关连接。

更关键的是客户端重连策略。若一百万设备在同一秒断线并每秒重试一次，网关面对的是一百万次连接建立/秒，而不是恢复中的一百万在线设备。协议或 SDK 应要求指数退避加抖动，并设上限：

```
delay = min(cap, base * 2^attempt) + random(0, jitter)
```

服务端还需限制未认证连接的并发与认证速率。这样，单 Gateway 崩溃后的恢复会被摊到一个可服务的时间窗，而不是反过来拖垮健康节点。

## 可靠性按消息价值分层，别承诺模糊的“不丢不重”

“至少一次”和“绝不重复”不能同时由网络天然保证。一个典型失败路径是：

```
T0 Gateway 向设备写入 commandId=C42
T1 设备执行 C42 并回 ACK
T2 ACK 在网络中丢失，或 Gateway 在收到前崩溃
T3 命令服务超时后重投 C42
T4 设备再次收到 C42
```

若设备以 `commandId` 去重，第二次不重复执行、仍返回 ACK，系统就获得业务语义上的一次执行。若设备无法持久化去重信息，则“控制命令至少一次且不重复执行”并不成立，必须收缩承诺或改造设备协议。

建议先定义业务语义，再决定存储和重试：

| 类型 | 典型策略 | 超过容量时 |
| --- | --- | --- |
| 心跳、可覆盖状态 | best effort / 最新值覆盖 | 丢弃或降采样 |
| 告警、事件 | 至少一次，消费端幂等 | 持久入口后异步处理 |
| 控制命令 | 持久状态、`commandId`、ACK、重试 | 不在 Gateway 内存无限排队 |

若遥测需要多个消费者、允许短暂下游不可用且要求可回放，持久消息流是合理的入口。以 `deviceId` 作为分区键可提供**同一设备、同一分区内**的顺序；它不提供跨设备全局顺序，也不替代消费者幂等。命令流应与高频遥测隔离，避免遥测积压淹没控制面。

消息系统也不是无限缓冲区：生产速率持续大于消费速率时，积压必然增长。网关、客户端库、生产者和 Broker 的每一层都要有上限、告警和降级规则。恢复下游之前，先丢可再生的低价值状态，通常比让所有设备连接因 OOM 一起断开更正确。

## 下行背压：不可写的 Channel 不是一个“稍后再试”按钮

`channel.isWritable()` 变为 false 说明出站高低水位或 socket 已拥塞。把后续命令继续塞入 Gateway 的 `Queue`，会将某一台慢设备的问题变成整个 Pod 的内存问题。

下行发送必须有三个边界：

1. 每设备在 Gateway 内存中的瞬时待发送条数与字节数；
2. 命令服务中可恢复的待投递状态及其 TTL、优先级；
3. 设备端已处理 commandId 的去重窗口。

关键命令不可因不可写而静默丢弃：保留其可恢复记录，等待可写事件或下一次连接再投递；可覆盖配置则可以只留最新版本。不要把“离线消息”长期存进 Channel 属性或 JVM Map，它们会随进程消失。

## 发布与故障恢复：长连接没有自动迁移

L4 负载均衡只决定新 TCP 连接去哪里，不能把已有连接迁移到新增 Pod。因此扩容后连接会随着自然重连逐步均衡；若强制快速再平衡，本质是受控断连，必须按速率执行。

缩容或发布时，Gateway 应实现真实的 Drain：

```
READY  -> DRAINING（拒绝新登录，readiness=false）
  -> 等待短事务与关键 ACK 的有限时间
  -> 按速率关闭剩余连接
  -> 清理本地会话；带 connectionId 条件地撤销路由
  -> 终止 EventLoop
```

这不是简单调用 `shutdownGracefully()`。没有先摘流，发布系统可能同时杀掉拥有大量连接的实例；没有最大 Drain 时间，发布也可能永久卡住。Kubernetes 中可将 readiness 与 management port 分开，`preStop` 触发 Drain，并把 `terminationGracePeriodSeconds` 设为大于 Drain 上限的值。具体秒数取决于设备退避策略、单 Pod 连接数及发布窗口。

单 Gateway 崩溃时，本地 Channel 自然消失，路由索引会通过连接 ID 条件删除或 TTL 收敛；设备随后带抖动重连到健康节点。路由索引故障时，已有连接仍可服务，跨节点命令则应降级为稍后投递或明确失败。消息入口故障时，优先保护 EventLoop 和连接：暂停/拒绝可再生遥测、保留控制面、报警并在恢复后按设计继续消费。

## 把协议做成可维护代码：解码、校验与错误边界

`LengthFieldBasedFrameDecoder` 只负责把字节流切成候选帧，不会替你校验 magic、版本、CRC，也不会替你解释 payload。下面的解码器展示了这些检查应落在哪里。为让示例聚焦核心逻辑，`DeviceMessage` 是不可变值对象，`ProtocolException` 会被统一异常处理器转换为关闭连接和低基数指标。

```java
public final class ProtocolDecoder extends MessageToMessageDecoder<ByteBuf> {
    private static final int MAGIC = 0xA7;
    private static final int FIXED_HEADER = 26;
    private static final int CRC_BYTES = 4;
    private static final int VERSION_1 = 1;
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (in.readableBytes() < FIXED_HEADER + CRC_BYTES) {
            throw new ProtocolException("truncated frame");
        }
        int frameStart = in.readerIndex();
        int magic = in.readUnsignedByte();
        int version = in.readUnsignedByte();
        int type = in.readUnsignedByte();
        int flags = in.readUnsignedByte();
        int headerLength = in.readUnsignedShort();
        long payloadLength = in.readUnsignedInt();
        long messageId = in.readLong();
        long timestampMillis = in.readLong();
        if (magic != MAGIC || version != VERSION_1 || headerLength != FIXED_HEADER) {
            throw new ProtocolException("unsupported header");
        }
        if (!MessageType.isKnown(type) || payloadLength > in.readableBytes() - CRC_BYTES) {
            throw new ProtocolException("invalid frame fields");
        }
        byte[] payload = ByteBufUtil.getBytes(in, in.readerIndex(), (int) payloadLength);
        in.skipBytes((int) payloadLength);
        int claimedCrc = in.readInt();
        int actualCrc = crc32(in, frameStart, FIXED_HEADER + (int) payloadLength);
        if (claimedCrc != actualCrc) {
            throw new ProtocolException("crc mismatch");
        }
        out.add(new DeviceMessage(version, MessageType.of(type), flags,
                messageId, timestampMillis, payload));
    }
    private static int crc32(ByteBuf buffer, int index, int length) {
        CRC32 crc = new CRC32();
        byte[] bytes = ByteBufUtil.getBytes(buffer, index, length, false);
        crc.update(bytes, 0, bytes.length);
        return (int) crc.getValue();
    }
}
```

生产实现还要处理两件常被漏掉的细节。

第一，CRC 计算的字节范围必须写入协议规范并有跨语言测试向量；否则设备端和服务端可能各自“正确”地计算了不同范围。第二，`payloadLength` 的每种消息类型上限应更严格，例如认证帧 1KiB、心跳帧 64B、遥测帧 8KiB。只用一个全局上限会让攻击者在认证前消耗不必要的内存和 CPU。

错误策略也要分级：不支持版本、长度越界和反复 CRC 错误通常应关闭连接；单个业务字段不合法可回复协议错误后计数。未认证连接不要允许无限次尝试，避免把错误响应本身变成放大器。

## 认证不是在 EventLoop 中“查一下库”

认证可能需要验签、查询设备状态或调用证书服务。它们都不应阻塞 I/O 线程。下面的写法将验证提交给有界执行器，并将回写切回 Channel 的 EventLoop；执行器已经满时明确拒绝新认证。

```java
public final class AuthHandler extends SimpleChannelInboundHandler<DeviceMessage> {
    private final Executor authExecutor;
    private final DeviceAuthenticator authenticator;
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, DeviceMessage msg) {
        if (ctx.channel().attr(SESSION).get() != null) {
            ctx.fireChannelRead(msg);
            return;
        }
        if (msg.type() != MessageType.AUTH) {
            ctx.close();
            return;
        }
        try {
            CompletableFuture
                    .supplyAsync(() -> authenticator.authenticate(msg), authExecutor)
                    .orTimeout(800, TimeUnit.MILLISECONDS)
                    .whenComplete((result, error) -> ctx.executor().execute(() -> {
                        if (error != null || !result.accepted()) {
                            ctx.writeAndFlush(AuthReply.denied()).addListener(ChannelFutureListener.CLOSE);
                            return;
                        }
                        ctx.channel().attr(PENDING_DEVICE_ID).set(result.deviceId());
                        ctx.fireChannelRead(msg);
                    }));
        } catch (RejectedExecutionException exhausted) {
            ctx.writeAndFlush(AuthReply.busy()).addListener(ChannelFutureListener.CLOSE);
        }
    }
}
```

认证结果超时并不等于认证服务一定没有处理请求；本例的结果只是“当前连接不再等待”，而非对设备身份做负面判定。若认证服务带有状态写入，需要由其自身保证幂等。网关侧最重要的是设置等待上限、限制并发，并避免把认证服务的抖动传播成 EventLoop 堵塞。

## 会话路由的原子性：用 connectionId 消灭陈旧删除

本地 `ConcurrentHashMap` 解决不了跨实例竞争。假设设备 D 先连到 A，再很快连到 B：A 的断开回调可能晚于 B 的注册回调。如果外部索引盲目执行 `DEL device:session:D`，B 会从路由表消失。

路由值需要携带一次连接唯一的 `connectionId`，并要求删除者证明自己仍是所有者。以下 Lua 只在值中 ID 匹配时删除；`SET` 使用 TTL，防止崩溃节点留下永久路由。真实实现应以结构化字段或脚本参数编码，避免自行拼接脚本字符串。

```lua
-- KEYS[1] = session key
-- ARGV[1] = expected connectionId
-- value format: gatewayId|connectionId
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local separator = string.find(current, '|', 1, true)
if not separator then return 0 end
if string.sub(current, separator + 1) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
```

注册也有策略选择。若业务规定“同一设备只能在线一个连接”，新连接成功注册后关闭旧本地连接；跨 Gateway 的旧连接则通过内部控制通道发送 `KICK(deviceId, oldConnectionId)`。若设备允许主备双连接，索引必须变为 `deviceId -> connectionId 集合`，命令模型必须定义投递到主连接还是双发。不要把单连接代码悄悄用在多连接业务上。

会话 TTL 的续期不宜由每一条遥测都同步写入远端存储。一个可行做法是按设备设置较长 TTL，并以有节流的心跳/活跃事件续期；具体续期频率取决于索引规模、允许的陈旧路由窗口和存储能力。TTL 只负责崩溃收敛，不能替代 `channelInactive` 的即时条件删除。

## 命令的持久状态属于命令服务，不属于 Gateway

控制命令的事实状态必须能穿过 Gateway 重启和设备离线。最小的持久模型可以放在关系数据库中：

```sql
CREATE TABLE device_command (
  command_id       varchar(64)  NOT NULL,
  device_id        varchar(128) NOT NULL,
  payload          blob         NOT NULL,
  status           varchar(24)  NOT NULL,
  attempt          int          NOT NULL DEFAULT 0,
  next_attempt_at  timestamp    NOT NULL,
  expire_at        timestamp    NOT NULL,
  version          bigint       NOT NULL DEFAULT 0,
  PRIMARY KEY (command_id),
  KEY ix_dispatch (status, next_attempt_at));
```

状态并不需要一开始就设计成庞大的工作流，但需要禁止危险迁移：

```
PENDING -> DISPATCHING -> WAITING_ACK -> ACKED
               |              |
               v              v
             RETRYABLE <--- timeout / route-miss
               |
               v
             EXPIRED
```

调度器用条件更新抢占待投递命令，避免多个实例同时发送。此处的 `version` 是乐观并发控制，不需要分布式锁：

```sql
UPDATE device_command
   SET status = 'DISPATCHING', attempt = attempt + 1, version = version + 1
 WHERE command_id = :id
   AND status IN ('PENDING', 'RETRYABLE')
   AND version = :expectedVersion
   AND expire_at > CURRENT_TIMESTAMP;
```

更新结果为 1 才拥有本轮投递权。随后查询路由、向目标 Gateway 发出带 `commandId` 与 `connectionId` 的投递请求。网关只能回答“已写入当前 socket”“当前连接不存在”或“当前不可写”；这些都不是“设备已执行”。只有设备 ACK 才能把命令迁移为 `ACKED`，ACK 更新同样应带允许的前置状态与版本条件。

重试采用有上限的指数退避与抖动，并受 `expire_at` 限制。读超时和 Gateway 崩溃造成的是结果未知，应重试同一个 `commandId`，而不是生成一个新命令。设备端则要把已经执行过的 commandId 持久化到足以覆盖重试窗口的介质中；只把“最后一个 ID”放在内存中，重启后仍可能重复执行。

## 一个不会无界堆积的下行发送器

下行的难点不是调用 `writeAndFlush`，而是决定不可写、离线和 ACK 缺失时消息在哪里、何时过期、谁负责重试。下面的 Gateway 端逻辑只保存极少量瞬时工作，真正可恢复的命令已在命令服务中：

```java
public CompletionStage<DispatchResult> dispatch(DispatchRequest request) {
    Channel channel = localSessions.find(request.deviceId());
    if (channel == null || !channel.isActive()) {
        return CompletableFuture.completedFuture(DispatchResult.ROUTE_STALE);
    }
    DeviceSession session = channel.attr(SESSION).get();
    if (!request.connectionId().equals(session.connectionId())) {
        return CompletableFuture.completedFuture(DispatchResult.ROUTE_STALE);
    }
    if (!channel.isWritable()) {
        return CompletableFuture.completedFuture(DispatchResult.CHANNEL_CONGESTED);
    }
    CompletableFuture<DispatchResult> result = new CompletableFuture<>();
    channel.writeAndFlush(CommandFrame.from(request)).addListener(future -> {
        result.complete(future.isSuccess()
                ? DispatchResult.WRITTEN_TO_SOCKET
                : DispatchResult.WRITE_FAILED);
    });
    return result;
}
```

这个函数刻意不承诺“已送达设备”。它只报告到 socket 的写入结果，因而上层不会把网关写成功错误地当作业务成功。对 `CHANNEL_CONGESTED`，命令服务可以延后同一 commandId；对低优先级可覆盖配置，可以只保留最后一个版本；对高优先级停止命令，则以业务定义的过期时间持续尝试并告警。

## Netty 运行参数必须从资源模型反推

Bootstrap 中值得显式审查的是连接建立队列、TCP 选项、写缓冲水位和 allocator，而不是神秘的“高并发参数包”。例如：

```java
ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup)
        .channel(EpollServerSocketChannel.class)
        .childHandler(new GatewayInitializer())
        .option(ChannelOption.SO_BACKLOG, 4096)
        .childOption(ChannelOption.TCP_NODELAY, true)
        .childOption(ChannelOption.SO_KEEPALIVE, true)
        .childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,
                new WriteBufferWaterMark(32 * 1024, 128 * 1024))
        .childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT);
```

`SO_BACKLOG` 会受内核上限约束；`TCP_NODELAY` 适合小型低延迟控制帧，却可能增加包数；高低水位影响何时触发不可写，必须结合单连接消息大小与设备网络特征测试。Linux 下采用 epoll 是常见选择，但它不是绕开 FD、socket 内存和网卡瓶颈的捷径。

线程数也不能按“CPU 核数乘二”机械设定。Worker EventLoop 主要承载网络回调，认证和业务执行器承载不同的阻塞模型；它们应各自有独立队列、拒绝策略和指标。先观察 EventLoop delay、运行队列、CPU 利用率与上下文切换，再调整一个变量并复测。

## 内存、内核与观测：把“能建立连接”变成可验证的假设

容器内存不是 JVM Heap。连接会消耗堆、Direct Memory、socket buffer、线程栈、metaspace 与 native allocator。设定 `-Xmx` 或 `MaxRAMPercentage` 前先给这些部分分别预算，并在运行中同时观测 Pod RSS、直接内存和 Netty allocator 指标。`ByteBuf` 泄漏通常先表现为堆外增长，而不是 Java 堆 OOM。

同样，FD 上限、监听队列、TCP 内存阈值和端口/LB 配额是容量前提，但没有跨机器复用的“百万连接参数”。先检查目标内核与运行环境的默认值，再在压测环境逐项验证；盲目复制 `sysctl` 配置既不能证明吞吐，也可能挤占宿主机其他工作负载。

建议至少监控下面这组低基数指标：

```
gateway_connections{state}
gateway_auth_reject_total{reason}
gateway_frames_total{type,result}
gateway_frame_bytes{direction}
gateway_channel_unwritable_total
gateway_ingress_rejected_total{class}
gateway_eventloop_delay_seconds
gateway_session_index_failures_total
gateway_command_delivery_total{result}
process_open_fds / container_memory_working_set_bytes
```

不要把 `deviceId` 放进 Prometheus label：百万设备会制造不可控的时序基数。排障时可在结构化日志中记录经过脱敏/采样处理的设备标识、`gatewayId`、`connectionId`、消息类型和关闭原因；指标负责发现范围，日志负责定位个体。

压测也不能只测“连上了多少”。至少覆盖连接建立速率、稳态消息速率、慢设备、认证失败洪峰、下游变慢、单节点故障、发布 Drain 与断线重连。每轮记录 p50/p99 EventLoop 延迟、拒绝数、内存曲线、FD、网络、重连完成时间和消费积压；没有这些数据，就只能说“设计待验证”，不能声称已经支撑百万设备。

## 发布不是 `kill -9`：管理面、摘流与 Kubernetes 配置

长连接服务需要一个独立管理面。业务 TCP 端口只处理设备协议；HTTP 管理端口至少提供 `/health/live`、`/health/ready`、`/metrics` 和受认证保护的 `POST /admin/drain`。其中 liveness 回答“进程是否仍能工作”，readiness 回答“是否允许接收新连接”，两者不能混为一谈。

Drain 接口应只改变本地接入状态，不做长时间阻塞等待：它把状态原子切至 `DRAINING`、让 readiness 立即返回失败、停止新认证，然后由后台协调器在截止时间前完成已有连接的受控关闭。若负载均衡器仍可能把老连接或新连接送到该 Pod，认证处理器也必须拒绝新登录，形成第二道边界。

```java
public void beginDrain(Duration deadline) {
    if (!state.compareAndSet(GatewayState.READY, GatewayState.DRAINING)) {
        return;
    }
    metrics.drainStarted();
    scheduler.schedule(() -> {
        for (Channel channel : localSessions.snapshot()) {
            channel.writeAndFlush(ServerNotice.reconnectSoon());
            channel.close();
        }
    }, deadline.toMillis(), TimeUnit.MILLISECONDS);
}
```

`snapshot()` 必须返回稳定副本或弱一致迭代视图；并发断开时清理由 `channelInactive` 统一完成。不要在管理线程中直接遍历后无条件删除路由，这会绕开前文的 connectionId 所有权保护。

下面是 Kubernetes 场景的最小关键片段。值只是示例：Pod 的资源、终止时间、滚动节奏必须和压测得出的安全连接容量对应。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-gateway
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 150
      containers:
        - name: gateway
          image: registry.example/iot-gateway:3.3.0
          ports:
            - { name: device-tcp, containerPort: 9000 }
            - { name: management, containerPort: 8080 }
          lifecycle:
            preStop:
              httpGet: { path: /admin/drain, port: management }
          readinessProbe:
            httpGet: { path: /health/ready, port: management }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /health/live, port: management }
            periodSeconds: 10
          resources:
            requests: { cpu: "4", memory: "8Gi" }
            limits:   { cpu: "8", memory: "8Gi" }
```

这里有一个实现差异需要提前确认：并非所有 Kubernetes 版本/策略都适合在 `preStop` 中使用 `httpGet`。若运行环境不支持，可使用容器内受控命令或由发布控制器先调用管理 API；无论用哪种触发方式，都要保证它幂等。更重要的是，`terminationGracePeriodSeconds` 必须大于 Drain 截止时间与必要的收尾时间之和。

## 压测计划：要验证失败路径，不是展示一个连接数字

压测环境要尽可能接近目标 OS、JDK、TLS 配置、负载均衡和网卡；设备模拟器需要真实维持连接、发送合法帧、处理命令 ACK，并支持按比例注入慢读、断线、认证失败和乱序 ACK。压测步骤应从低风险到破坏性递进：

| 场景 | 注入方式 | 通过标准示例 |
| --- | --- | --- |
| 连接爬坡 | 分批建立连接，不同设备带随机相位 | FD、RSS、认证队列与 EventLoop delay 稳定 |
| 稳态上报 | 设备按分散相位持续发送 | p99、拒绝率、消费积压在预算内 |
| 慢设备 | 1%/5%/10% 客户端停止读取下行 | 不可写比例上升但 Pod 内存不持续增长 |
| 下游变慢 | 降低入口消费者吞吐或断开入口 | 遥测按策略降级，控制面仍可恢复 |
| 节点故障 | 强制终止承载连接的一个实例 | 重连在退避窗口内收敛，健康节点不雪崩 |
| 滚动发布 | 触发 Drain 并观察实际 LB 行为 | 无突然全量断连，发布在上限时间内完成 |

“通过”不能只写 TPS。每个场景都应产出版本化报告：设备模拟器版本、镜像 SHA、机器规格、内核/JDK、连接分布、消息模型、图表和失败样本。若没有这类报告，文章和项目文档都应该诚实地写“待验证”。

### 用资源预算设定起跑线

压测前可先列一个预算表，而不是直接给出“单机十万连接”的结论：

| 资源 | 估算方式 | 要验证的事实 |
| --- | --- | --- |
| FD | 活跃连接 + 监听与管理连接 + 余量 | 进程与宿主机限制足够 |
| 内存 | 每连接运行时开销 × 连接数 + JVM/原生余量 | RSS 而非仅 Heap 位于预算内 |
| 网络 | 上下行 payload 加协议/TLS/重传开销 | NIC、节点与 LB 带宽有余量 |
| CPU | 解码、TLS、认证、业务投递的峰值 | p99 EventLoop delay 不随压力持续爬升 |
| 下游 | 生产速率与可用消费者速率之差 | 积压上限和降级时间窗可接受 |

Linux 侧先用只读检查确认运行前提，例如 `ulimit -n`、监听队列上限、conntrack 使用率、Pod/节点的网络限制和 LB 连接配额。系统参数只在出现明确瓶颈、完成变更评审并在压测复现后调整；不要把网络文章里的整套 `sysctl.conf` 复制到共享节点。

## 运行手册：告警要能导向动作

监控不是“指标越多越好”。下面是可直接用于排障分流的例子：

| 现象 | 先看什么 | 首个处置方向 |
| --- | --- | --- |
| 新连接与认证失败同时突增 | 按失败原因、来源网段、认证执行器拒绝数 | 限制错误来源，确认凭据/证书批次变更 |
| EventLoop delay 上升 | CPU、GC 暂停、慢 Handler、入站速率 | 停止把阻塞任务投到 I/O 线程，必要时入口降级 |
| `isWritable=false` 比例上升 | 下行字节、慢设备比例、每设备队列 | 不再入内存排队，令命令服务延迟投递 |
| 路由 miss 突增 | Gateway 重启、索引错误率、TTL | 验证 connectionId 和节点健康，重试同一 commandId |
| 消息积压持续增长 | 生产/消费速率、Broker 存储与消费者错误 | 先执行遥测降级，再扩消费者或修复下游 |
| RSS 增长但 Heap 稳定 | direct memory、allocator、ByteBuf 泄漏采样 | 检查跨线程持有与引用计数，保留泄漏证据 |

日志按事件而不是按心跳写。连接建立、认证失败、协议关闭、Drain、命令状态迁移与异常栈是日志；连接数、心跳量和延迟是指标。`deviceId` 可在按需调试或采样日志中使用，但不能成为指标标签或高频全文索引字段。

## 上行消息入口：什么时候 Kafka 是必要的，什么时候不是

Gateway 将上报交给持久消息流，并不是“生产级”的固定动作。若设备数不大、一个业务服务就能同步处理并持久化，直接调用受超时保护的内部接口反而更简单。只有当至少一个真实条件成立时，异步入口才有价值：

* 遥测要被多个独立消费者使用，且彼此不应相互拖慢；
* 入口与消费端的可用性需要短暂解耦，并要求后续回放；
* 写入时序/分析存储的批处理特征与连接接入的实时特征不同；
* 已有速率证明同步路径会占用 Gateway 的工作线程或造成长尾延迟。

启用后，先按语义分流，而不是建一个包罗万象的 `iot-data`：

```
iot.telemetry.v1       可覆盖的状态/采样数据
iot.event.v1           不应被状态覆盖的设备事件
iot.command.v1         控制命令投递请求
iot.command-ack.v1     设备 ACK 与状态迁移输入
iot.lifecycle.v1       上下线与认证生命周期事件
```

`deviceId` 作为 telemetry/event 的分区键，意味着同一设备发送到同一分区，并在该分区内保持追加顺序。它不保证消息没有重复；生产者的超时与重试、Consumer rebalance、进程崩溃都能带来重复。因此消费者的业务写入应有自己的去重键或条件更新，不能把“一个分区有序”误读成端到端 exactly once。

一个实用的入口接口要能表达容量结果，而不只是 `void send()`：

```java
public interface TelemetryIngress {
    /**
     * 只表示入口是否接收；不承诺下游业务已完成。
     * 调用方必须在 false 时执行与消息等级匹配的降级策略。
     */
    boolean trySubmit(DeviceMessage message);
}
```

对遥测，`false` 可以触发本地节流、抽样或合并“同设备最新状态”；对告警，通常要以一个有限、可观测的持久入口接收；对控制 ACK，则应走和控制面一致的可靠状态迁移路径。把三类消息都用同一条无限队列处理，等价于放弃选择。

### 消费端幂等的最小实现

假设事件要写入关系型存储，可将 `(device_id, message_id)` 作为最终重复保护，先让 Schema 拒绝并发重复，再让代码把重复视为可预期结果：

```sql
CREATE TABLE device_event (
  device_id  varchar(128) NOT NULL,
  message_id bigint       NOT NULL,
  event_type varchar(32)  NOT NULL,
  body       blob         NOT NULL,
  received_at timestamp   NOT NULL,
  PRIMARY KEY (device_id, message_id));
```

消费事务内插入成功后提交 offset；进程在两者之间崩溃会再次消费，主键冲突则表示事件此前已落库。这里的数据库唯一约束比“消费者内存里记住最近 ID”更可靠。若存储不是关系库，应选择其原子去重/条件写语义；如果它没有这种能力，就不能轻易承诺事件处理幂等。

## 安全细节：认证、重放保护与资源滥用是三件不同的事

TLS 保护链路机密性与服务端身份；mTLS 还可把设备证书作为客户端身份。若设备资源有限而使用 MAC 认证，一个 AUTH 帧至少要包含 `deviceId`、密钥版本、时间戳、随机 nonce 和对规范化字节序列计算的 MAC。服务端验证顺序应尽量便宜：长度与格式检查、设备是否存在、时间窗口、MAC 验证、nonce 去重/序列窗口。

nonce 的存储策略取决于攻击模型。每设备严格递增序列最省状态，但要求设备能在重启后恢复计数；短时间 nonce 去重需要维护一个按设备分片、有过期时间的集合；只校验时间戳则无法阻止窗口内的重放。不要把“加了 timestamp”当成完整重放防护。

资源滥用还需要单独的限额，且每个限额都应有明确作用域：

| 限额 | 推荐作用域 | 防护对象 |
| --- | --- | --- |
| 新建连接速率 | IP / 网段 / LB 来源 | 扫描、重连洪峰、SYN 后的应用层压力 |
| 未认证连接数 | Gateway 全局与 IP | 认证资源被耗尽 |
| 登录失败次数 | 设备 ID 与 IP | 凭据猜测、坏固件循环 |
| 消息速率与字节数 | 已认证 deviceId | 单设备故障或滥用 |
| 下行待投递数 | deviceId 与命令优先级 | 慢设备内存放大 |

认证失败日志不要记录 token、MAC、私钥材料或完整 payload。密钥轮换时允许短暂双版本验证，并以设备维度统计旧版本使用量；“全网同一时刻切密钥”本身就是一次可能制造大规模认证失败的变更。

## 三条最危险的失败路径，逐条验算设计

### 路径一：新旧会话交错

```
T0  D 在 Gateway A 上使用 connectionId=A1 登录
T1  网络抖动，D 又在 Gateway B 上使用 connectionId=B1 登录
T2  会话索引被更新为 B|B1；A 的本地映射被替换或收到踢线请求
T3  A1 的 channelInactive 延迟触发
T4  A 尝试 deleteIfMatches(D, A1)，条件不匹配，索引保持 B|B1
T5  命令服务查到 B|B1；B 二次核对后写入当前 Channel
```

不变量仍成立：旧连接无法删除新连接的路由。若第 T4 步是无条件 DEL，系统会产生看似随机的“设备明明在线却无法下发”故障，通常只在网络抖动和重连密集时出现。

### 路径二：命令写入成功、设备执行结果未知

```
T0  调度器以条件更新取得 C42 的投递权
T1  Gateway 返回 WRITTEN_TO_SOCKET，命令状态转为 WAITING_ACK
T2  设备执行 C42；ACK 在链路上丢失
T3  ACK deadline 到期，命令转为 RETRYABLE
T4  调度器用同一个 commandId=C42 重投
T5  设备命中持久去重记录，不执行副作用，回复 ACK(C42)
T6  命令服务条件更新为 ACKED
```

这里不把 T2/T3 误判成失败。系统承认“未知”，通过同一幂等键恢复。若命令具有不可逆副作用而设备无法去重，必须设计业务补偿/人工确认流程；网关重试无法魔法般保证安全。

### 路径三：Broker 或消费端不可用

```
T0  消费速率下降，积压持续增长
T1  入口达到有界阈值，trySubmit 对 telemetry 返回 false
T2  Gateway 对可覆盖状态抽样/合并，对告警和控制 ACK 使用独立容量预算
T3  不再增加 JVM 队列，EventLoop 仍能处理心跳、认证与断开
T4  下游恢复后，按持久入口的保留窗口继续消费
```

这一策略的代价是明确允许部分遥测缺失；收益是保护更重要的连接与控制面。若业务不能接受任一遥测丢失，就必须在设备协议、持久入口容量、成本和回压机制上作出相应投入，不能仅把队列长度调大。

## 读完即可执行：从设计到上线的最小交付物

这类系统不该以“接入了 Netty、Kafka 或 Kubernetes”作为完成标准。团队在进入上线评审前，至少应能拿出以下交付物；没有它们，文中的架构判断无法被实现和验证。

| 交付物 | 最少应包含什么 | 它回答的问题 |
| --- | --- | --- |
| 协议规范 | 字节布局、每类消息上限、认证字段、错误码、跨语言 CRC 向量 | 设备与网关是否会按同一协议解释数据 |
| 容量预算 | 连接、消息、TLS、RSS、FD、网络和下游吞吐的假设 | 安全容量的起跑线是什么 |
| 会话索引契约 | `deviceId -> gatewayId, connectionId, expireAt` 与条件删除语义 | 旧连接为何不能删掉新连接 |
| 命令状态模型 | commandId、状态迁移、ACK deadline、expireAt、重试条件 | 写入 socket 后为什么仍不能宣称设备已执行 |
| 降级矩阵 | 遥测、告警、控制命令在入口满、慢设备、离线时的不同策略 | 哪些数据可丢，哪些只能延迟 |
| 发布演练报告 | Drain、节点故障、重连收敛、资源曲线与失败样本 | 发布会不会把局部故障放大为重连风暴 |

交付物应保存版本、评审人和适用前提。尤其是容量预算与压测报告：机器规格、JDK、内核、TLS、LB、设备模拟器版本发生变化后，旧结论只能作为参考，不能继续当作事实。

### 上线验收要攻击不变量

普通接口测试不足以证明连接系统成立。下面这些测试直接攻击本文最重要的约束：

```
1. 让旧连接晚于新连接关闭：会话索引仍必须指向新 connectionId。
2. 让 5% 设备停止读取：不可写比例可以升高，但 Pod RSS 不能持续增长。
3. 让入口消费者停止：遥测必须按策略拒绝或降采样，EventLoop 不能被阻塞。
4. 在写入 commandId 后丢失 ACK：设备重试收到同一 commandId 时不得重复执行。
5. 对承载连接的 Pod 执行 Drain/终止：重连应在退避窗口收敛，健康节点不能出现认证洪峰。
6. 让会话索引短暂不可用：已有本地连接仍可收发，跨节点命令必须得到确定的未投递结果。
```

这六项不要求一次完成百万规模压测；它们首先应在小规模集成环境可重复。规模压测的作用是验证资源预算与恢复时间，而不是替代正确性测试。

## 关键取舍与适用边界

本文并不建议所有 IoT 项目一开始就部署 Redis、Kafka 和 Kubernetes。单进程、低频上报且命令同机处理的设备管理系统，V1 本地会话表配合数据库已足够。会话路由索引只在跨节点下发出现时启用；持久消息流只在遥测异步化、可回放或消费者隔离确有需要时启用。

本文也没有给出一个“每节点 10 万连接”的万能结论。TLS 握手成本、设备包长、心跳周期、socket buffer、CPU 架构、GC、内核版本和负载均衡器都会改变答案。正确做法是先用容量公式提出假设，再用故障注入和压测把安全容量定下来，并留出发布与单节点失效余量。

最后，用四个不变量复查这个设计是否自洽：

```
1. EventLoop 不等待不可控的外部操作。
2. 只有当前连接所有者能删除本地/分布式会话记录。
3. 下游变慢时，任一层的内存队列都不会无限增长。
4. 控制命令重复投递时，设备不会重复执行同一个 commandId。
```

它们比“用了哪些中间件”更接近一个百万设备接入系统是否真正可持续运行的答案。
