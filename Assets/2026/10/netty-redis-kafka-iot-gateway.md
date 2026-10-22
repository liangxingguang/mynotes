# 扛住百万设备长连接：我用 Netty + Redis + Kafka 搭建的 IoT 接入平台，性能翻了 3 倍

> 原文：https://mp.weixin.qq.com/s/ci_Fgd4x4Kh9oi7CP26pUg

> 百万设备在线不是"把 Netty 跑起来"这么简单。真正难的是连接风暴、会话路由、上下行解耦、顺序性、离线补偿、灰度发布和故障恢复要一起成立。本文以"智能充电桩接入平台"为主线，系统讲清楚如何基于 Netty + Redis + Kafka 搭建一个可水平扩展、可观测、可治理的 IoT 长连接接入平台，并补齐生产级代码骨架、流程设计和工程边界。

* * *

## 1. 业务背景：为什么 IoT 接入平台总会先死在"连接"上

我们服务的是一个充电桩云平台。设备通过 TCP 长连接持续上报心跳、枪口状态、订单状态、故障码，平台还需要实时下发开始充电、停止充电、远程重启、参数更新等控制指令。

核心约束如下：

*   在线设备规模：常态 60 万，峰值接近 100 万
*   上行消息量：平均 5 万条/秒，峰值 10 万条/秒以上
*   下行控制：要求秒级到达，关键指令需要应用层 ACK
*   可靠性：设备掉线后可重连，消息不能无声丢失
*   架构目标：支持水平扩容、滚动发布、局部故障隔离

很多团队一开始会直接用 Spring Boot + Tomcat + 同步处理来接 TCP 或 HTTP 轮询，早期设备少时能跑，但规模一上来就会暴露三个根因问题：

1.  连接模型不对。长连接场景不能按"一个连接一个线程"设计。
2.  消息链路耦合。接入层直接调业务服务，任何下游抖动都会反压到连接层。
3.  会话状态分散。设备连接在哪个节点、该往哪台机器下发指令，没有统一路由中心。

所以，这类系统第一步不是"写业务代码"，而是先把接入层做成真正的基础设施。

* * *

## 2. 原始方案为什么扛不住

在改造之前，很多平台的典型路径是这样的：

*   设备直连单体接入服务
*   接入服务解析报文后同步写库
*   下行业务通过数据库或本地内存找连接
*   连接、消息、业务逻辑、路由逻辑全部堆在同一个服务里

这套方案在 1 万到 5 万设备阶段还能工作，但继续放大会出现非常典型的问题：

*   大量空闲连接占住线程，CPU 不高但线程先耗尽
*   每条设备消息都同步执行业务逻辑，导致 EventLoop 被阻塞
*   下游数据库或 RPC 抖动后，设备侧出现积压、超时、断连
*   服务扩容后无法做跨节点下发，因为连接只在本机内存里
*   发布重启时连接整体断开，设备同时重连，触发连接风暴

本质上，这不是某一个中间件的参数问题，而是架构分层的问题。

* * *

## 3. 技术选型：为什么是 Netty + Redis + Kafka

### 3.1 Netty：解决百万长连接的基础通信问题

选择 Netty，不是因为"它快"，而是因为它在 Java 生态里把百万长连接需要的几件事都准备好了：

*   基于 Reactor 模型的事件驱动 IO
*   成熟的编解码、半包粘包处理能力
*   `ByteBuf` 池化、堆外内存、零拷贝优化
*   写缓冲水位线、背压感知、空闲检测等基础能力
*   连接生命周期和 ChannelPipeline 扩展机制

如果只看 API，Java NIO 也能写，但真正把协议解析、心跳、流控、异常关闭、内存释放、优雅停机都落地，Netty 的工程成熟度明显更高。

### 3.2 Redis：解决会话路由和热点状态问题

Redis 在这里不是"缓存数据库"，而是一个会话路由中心：

*   `deviceId -> nodeId/channelId`，用于下行寻址
*   `nodeId -> deviceSet`，用于节点级统计与迁移
*   `messageId -> 去重标记`，用于幂等控制
*   `deviceId -> 最近心跳/在线状态`，用于运维和监控

为什么不直接用数据库：

*   路由读写频率高，关系库成本太高
*   会话状态天然是高频、短生命周期、可过期的数据
*   Redis 支持 TTL、原子操作和 Cluster 水平扩展

### 3.3 Kafka：解决接入层与业务层解耦问题

Kafka 在 IoT 场景最核心的价值不是"MQ 能削峰"这么简单，而是让接入层从业务执行链路里抽离出来：

*   接入层只负责校验、解析、投递，不承担重业务计算
*   下游业务消费速度波动时，Kafka 吞吐缓冲可兜底
*   多个业务方可以独立消费同一份设备上行数据
*   按 `deviceId` 分区后，可以在单设备维度上保持顺序

如果设备上行消息直接同步调用订单服务、计费服务、告警服务，接入层会变成整个系统最脆弱的耦合点。

* * *

## 4. 整体架构：把"连接、路由、消息、业务"拆开

设备终端 → TCP Long Connection → 四层负载均衡 SLB/NLB → Netty Gateway-1/2/N → Redis Cluster（Session Route / Dedup / TTL）→ Kafka Topic iot-upstream → Device Status Service / Billing Service / Alarm Service；Command Service → Kafka Topic iot-downstream → 网关下行；Offline Store（Redis Stream / DB）。

### 4.1 模块边界

建议把平台拆成下面几个逻辑模块：

| 模块 | 职责 | 是否持有长连接 |
| --- | --- | --- |
| `iot-gateway` | TCP 接入、协议编解码、鉴权、心跳、上下行收发 | 是 |
| `session-service` | 路由查询、会话续期、节点注册 | 否 |
| `upstream-dispatcher` | 设备上行消息标准化并投递 Kafka | 否 |
| `command-service` | 业务下行指令生成、状态流转、重试策略 | 否 |
| `offline-store` | 离线消息暂存与补偿 | 否 |
| `monitoring` | 指标、日志、链路、告警 | 否 |

这里最重要的原则是：接入层不要承载重业务逻辑，只做"高性能收发 + 轻量校验 + 异步投递"。

### 4.2 节点内与节点间的职责

*   节点内：保存本机 `deviceId -> Channel` 映射，执行真实网络收发
*   节点间：通过 Redis 共享路由，通过 Kafka 接收跨节点下发任务

换句话说，真正的连接只存在于本机内存，但"连接在哪里"这个事实必须被集群内其他节点看见。

* * *

## 5. 核心原理：百万连接平台真正依赖的底层机制

### 5.1 Netty 如何用少量线程维护大量连接

Netty 的关键不是线程池，而是 IO 多路复用。

*   `BossGroup` 负责接收连接
*   `WorkerGroup` 负责处理读写事件
*   一个 `EventLoop` 线程可以同时管理大量 `Channel`
*   只有真正发生可读、可写事件时，线程才会处理这个连接

所以百万连接场景下，瓶颈往往不是"线程数不够"，而是：

*   单节点文件描述符上限过低
*   内核连接队列太小
*   EventLoop 里做了阻塞操作
*   写入堆积导致出站缓冲膨胀

### 5.2 Redis 路由为什么不能每条消息都刷

很多文章会写"设备每来一条消息就更新一次 Redis TTL"。这在演示里可以，在生产里通常不划算。

更合理的做法是：

*   连接建立时写一次路由
*   心跳时只在本地更新时间戳
*   由节点内的续期任务按批次刷新 Redis TTL

这样做的原因是：

*   减少 Redis 高频写放大
*   避免热点设备频繁刷新同一 key
*   将"消息流量"和"路由续期流量"解耦

### 5.3 Kafka 为什么必须按设备维度分区

很多 IoT 场景里，单设备消息具有强顺序语义。例如：

1.  上报"插枪"
2.  上报"开始充电"
3.  上报"停止充电"
4.  上报"订单结束"

如果消费端乱序处理，状态机会直接错乱。所以生产消息时建议：

*   `key = deviceId`
*   同一设备总是落到同一分区
*   消费端在设备维度保持串行处理

注意边界：

*   Kafka 只能保证单分区内有序，不能保证全局有序
*   如果单个超级热点设备产生极高流量，会拖慢同分区其他设备
*   如果业务对单设备强一致要求更高，消费侧仍应做版本号或序列号校验

### 5.4 下行可靠性不能只靠 TCP

TCP 只能保证字节送达对端内核，不保证设备应用层已经处理成功。所以控制指令必须设计应用层 ACK：

*   平台下发命令，生成 `requestId`
*   设备收到后返回 ACK，带回相同 `requestId`
*   平台在 ACK 超时前维持待确认状态
*   超时未 ACK 时执行重试或转离线补偿

这也是 IoT 平台和普通 Web 服务最大的不同之一。

* * *

## 6. 关键数据模型与路由设计

### 6.1 Redis Key 设计

```
route:{deviceId}                  -> hash(nodeId, channelId, lastSeen, version)
node:devices:{nodeId}             -> set(deviceId...)
device:dedup:{deviceId}:{msgId}   -> string(1) + TTL
down:pending:{requestId}          -> hash(deviceId, status, retryCount, expireAt)
offline:{deviceId}                -> stream/list
```

设计原则：

*   所有 key 带业务前缀，便于隔离和治理
*   与设备强相关的数据使用 `deviceId` 作为路由核心
*   需要过期的数据显式加 TTL，避免脏状态永久残留
*   大集合类 key 必须评估单 key 规模，必要时按节点或时间分桶

### 6.2 设备会话模型

```
public record DeviceSession(
        String deviceId,
        String nodeId,
        String channelId,
        String clientIp,
        long connectTime,
        long lastHeartbeatTime,
        int protocolVersion,
        SessionState state) {}
```

`SessionState` 至少应包含：

*   `CONNECTED`
*   `AUTHENTICATED`
*   `ACTIVE`
*   `CLOSING`
*   `OFFLINE`

这样设计的意义是，很多异常并不是"在线/离线"二值状态，而是处于鉴权中、重连中、待关闭中。

* * *

## 7. 核心流程：正常链路、异常链路、补偿链路

### 7.1 设备首次连接流程

Device → SLB/NLB → Netty Gateway → Redis：建立 TCP 连接 → 转发连接 → 协议握手/设备鉴权 → 写入 route:{deviceId} → 加入 node:devices:{nodeId} → 登录应答。

### 7.2 上行消息处理流程

Device → Netty Gateway → Kafka → Business Service：业务报文/心跳 → 解码、校验、标准化 → 异步发送 iot-upstream → 必要时返回平台 ACK → 消费设备消息 → 状态计算/计费/告警。

### 7.3 下行控制流程

Command Service → Kafka → Netty Gateway → Device：发送 iot-downstream(key=deviceId) → 当前分区消费者收到命令 → 查询本地 Channel → 下发控制指令(requestId) → ACK(requestId) → 完成待确认清理。

### 7.4 异常补偿流程

下发指令 → 设备在线? →（否）写入离线队列；（是）写入 Channel → 收到 ACK? →（是）完成；（否）重试次数超限? →（否）指数退避后重试；（是）转死信/人工介入。设备重连上线后拉取离线命令补发。

* * *

## 8. 生产级代码实现：从"能跑"升级到"能上线"

下面的代码不是完整项目源码，而是一套可以直接落地为工程骨架的核心实现。

### 8.1 推荐包结构

```
com.example.iot
├── bootstrap
├── protocol
│   ├── codec
│   ├── message
│   └── handler
├── session
│   ├── model
│   ├── cache
│   └── repository
├── upstream
├── downstream
├── common
└── config
```

### 8.2 启动类与 Server Bootstrap

```java
package com.example.iot.bootstrap;

import com.example.iot.protocol.codec.IotMessageDecoder;
import com.example.iot.protocol.codec.IotMessageEncoder;
import com.example.iot.protocol.handler.AuthHandler;
import com.example.iot.protocol.handler.HeartbeatHandler;
import com.example.iot.protocol.handler.UpstreamMessageHandler;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.WriteBufferWaterMark;
import io.netty.channel.epoll.Epoll;
import io.netty.channel.epoll.EpollEventLoopGroup;
import io.netty.channel.epoll.EpollServerSocketChannel;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.timeout.IdleStateHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.concurrent.TimeUnit;

@Slf4j
@RequiredArgsConstructor
public class IotGatewayServer {
    private final GatewayProperties properties;
    private final AuthHandler authHandler;
    private final HeartbeatHandler heartbeatHandler;
    private final UpstreamMessageHandler upstreamMessageHandler;

    public void start() throws InterruptedException {
        boolean useEpoll = Epoll.isAvailable() && properties.isPreferEpoll();
        var bossGroup = useEpoll ? new EpollEventLoopGroup(properties.getBossThreads())
                : new NioEventLoopGroup(properties.getBossThreads());
        var workerGroup = useEpoll ? new EpollEventLoopGroup(properties.getWorkerThreads())
                : new NioEventLoopGroup(properties.getWorkerThreads());
        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                    .channel(useEpoll ? EpollServerSocketChannel.class : NioServerSocketChannel.class)
                    .option(ChannelOption.SO_BACKLOG, properties.getSoBacklog())
                    .option(ChannelOption.SO_REUSEADDR, true)
                    .childOption(ChannelOption.TCP_NODELAY, true)
                    .childOption(ChannelOption.SO_KEEPALIVE, true)
                    .childOption(ChannelOption.ALLOCATOR, io.netty.buffer.PooledByteBufAllocator.DEFAULT)
                    .childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,
                            new WriteBufferWaterMark(
                                    properties.getWriteBufferLowWaterMark(),
                                    properties.getWriteBufferHighWaterMark()))
                    .childHandler(new ChannelInitializer<>() {
                        @Override
                        protected void initChannel(SocketChannel ch) {
                            ChannelPipeline p = ch.pipeline();
                            p.addLast("idleStateHandler",
                                    new IdleStateHandler(properties.getReaderIdleSeconds(), 0, 0, TimeUnit.SECONDS));
                            p.addLast("messageDecoder", new IotMessageDecoder(properties.getMaxFrameLength()));
                            p.addLast("messageEncoder", new IotMessageEncoder());
                            p.addLast("authHandler", authHandler);
                            p.addLast("heartbeatHandler", heartbeatHandler);
                            p.addLast("upstreamHandler", upstreamMessageHandler);
                        }
                    });
            ChannelFuture future = bootstrap.bind(properties.getPort()).sync();
            log.info("iot gateway started, port={}, epoll={}", properties.getPort(), useEpoll);
            future.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}
```

这段代码重点解决了四个生产问题：

*   根据环境选择 `epoll` 或 `nio`
*   使用池化内存分配器减少 GC 压力
*   用写缓冲水位线给出站流量做背压
*   把鉴权、心跳、业务处理拆成独立 Handler

### 8.3 协议模型与编解码

假设我们采用固定头 + 可变长体的二进制协议：

```
magic(2) + version(1) + type(1) + requestId(8) + deviceIdLength(2) + bodyLength(4) + payload
```

```java
package com.example.iot.protocol.message;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class IotMessage {
    short magic;
    byte version;
    byte type;
    long requestId;
    String deviceId;
    byte[] payload;
}
```

```java
package com.example.iot.protocol.codec;

import com.example.iot.protocol.message.IotMessage;
import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class IotMessageDecoder extends ByteToMessageDecoder {
    private static final short MAGIC = (short) 0xAA55;
    private final int maxFrameLength;

    public IotMessageDecoder(int maxFrameLength) {
        this.maxFrameLength = maxFrameLength;
    }

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (in.readableBytes() < 18) {
            return;
        }
        in.markReaderIndex();
        short magic = in.readShort();
        if (magic != MAGIC) {
            ctx.close();
            return;
        }
        byte version = in.readByte();
        byte type = in.readByte();
        long requestId = in.readLong();
        int deviceIdLength = in.readUnsignedShort();
        int bodyLength = in.readInt();
        if (bodyLength < 0 || bodyLength > maxFrameLength) {
            ctx.close();
            return;
        }
        if (in.readableBytes() < deviceIdLength + bodyLength) {
            in.resetReaderIndex();
            return;
        }
        byte[] deviceIdBytes = new byte[deviceIdLength];
        in.readBytes(deviceIdBytes);
        byte[] payload = new byte[bodyLength];
        in.readBytes(payload);
        out.add(IotMessage.builder()
                .magic(magic)
                .version(version)
                .type(type)
                .requestId(requestId)
                .deviceId(new String(deviceIdBytes, StandardCharsets.UTF_8))
                .payload(payload)
                .build());
    }
}
```

这里有两个容易被忽略的点：

*   半包时必须 `resetReaderIndex()`，否则会把流读坏
*   任何长度字段都必须做上限校验，防止恶意报文触发大内存分配

### 8.4 会话管理器

```java
package com.example.iot.session.cache;

import io.netty.channel.Channel;
import io.netty.util.AttributeKey;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class LocalSessionManager {
    public static final AttributeKey<String> DEVICE_ID_ATTR = AttributeKey.valueOf("deviceId");
    private final Map<String, Channel> channelMap = new ConcurrentHashMap<>();

    public void bind(String deviceId, Channel channel) {
        channel.attr(DEVICE_ID_ATTR).set(deviceId);
        channelMap.put(deviceId, channel);
    }

    public Optional<Channel> getChannel(String deviceId) {
        return Optional.ofNullable(channelMap.get(deviceId));
    }

    public void unbind(Channel channel) {
        String deviceId = channel.attr(DEVICE_ID_ATTR).get();
        if (deviceId != null) {
            channelMap.remove(deviceId, channel);
        }
    }
}
```

本地内存负责真实连接对象，Redis 负责跨节点可见的路由元数据，两者不要混淆。

### 8.5 鉴权 Handler

```java
package com.example.iot.protocol.handler;

import com.example.iot.protocol.message.IotMessage;
import com.example.iot.session.cache.LocalSessionManager;
import com.example.iot.session.model.SessionState;
import com.example.iot.session.repository.SessionRouteRepository;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class AuthHandler extends SimpleChannelInboundHandler<IotMessage> {
    private final DeviceAuthenticator authenticator;
    private final LocalSessionManager localSessionManager;
    private final SessionRouteRepository sessionRouteRepository;
    private final String nodeId;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, IotMessage msg) {
        if (!MessageTypes.isLogin(msg.getType())) {
            ctx.fireChannelRead(msg);
            return;
        }
        String deviceId = msg.getDeviceId();
        AuthResult result = authenticator.authenticate(deviceId, msg.getPayload());
        if (!result.success()) {
            log.warn("device auth failed, deviceId={}, reason={}", deviceId, result.reason());
            ctx.close();
            return;
        }
        localSessionManager.bind(deviceId, ctx.channel());
        sessionRouteRepository.register(deviceId, nodeId, ctx.channel().id().asShortText(), SessionState.ACTIVE);
        ctx.writeAndFlush(LoginResponseFactory.success(msg.getRequestId()));
    }
}
```

这里要注意三件事：

*   登录报文和普通业务报文在协议层要能区分
*   鉴权通过后才允许路由注册
*   登录应答最好包含平台时间、协议版本、配置版本等元信息，便于设备侧协商

### 8.6 上行消息异步投递

```java
package com.example.iot.protocol.handler;

import com.example.iot.protocol.message.IotMessage;
import com.example.iot.upstream.UpstreamEventPublisher;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class UpstreamMessageHandler extends SimpleChannelInboundHandler<IotMessage> {
    private final UpstreamEventPublisher publisher;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, IotMessage msg) {
        if (MessageTypes.isHeartbeat(msg.getType()) || MessageTypes.isLogin(msg.getType())) {
            return;
        }
        publisher.publish(msg).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("publish upstream failed, deviceId={}, requestId={}",
                        msg.getDeviceId(), msg.getRequestId(), ex);
                ctx.close();
            }
        });
    }
}
```

为什么这里不要直接在 `EventLoop` 里做重业务：

*   Kafka 抖动会把 IO 线程拖死
*   JSON 序列化、大对象拼装会放大 CPU 消耗
*   IO 线程一旦阻塞，受影响的是该 EventLoop 上全部连接

### 8.7 Kafka 发布器

```java
package com.example.iot.upstream;

import com.example.iot.protocol.message.IotMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import java.util.concurrent.CompletableFuture;

@RequiredArgsConstructor
public class KafkaUpstreamEventPublisher implements UpstreamEventPublisher {
    private final KafkaTemplate<String, DeviceUpstreamEvent> kafkaTemplate;
    private final DeviceEventMapper eventMapper;
    private final String topic;

    @Override
    public CompletableFuture<Void> publish(IotMessage message) {
        DeviceUpstreamEvent event = eventMapper.toEvent(message);
        return kafkaTemplate.send(topic, event.deviceId(), event)
                .completable()
                .thenAccept(sendResult -> { });
    }
}
```

建议的 Kafka 生产者参数：

```yaml
spring:
  kafka:
    producer:
      acks: all
      retries: 3
      batch-size: 32768
      linger-ms: 5
      compression-type: lz4
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 1
```

解释一下关键取舍：

*   `acks=all` 提升可靠性
*   `enable.idempotence=true` 避免重复发送
*   `max.in.flight=1` 优先顺序性，牺牲部分吞吐

如果你的业务允许轻微乱序，可以适度放宽这个参数，但不能默认拍脑袋配置。

### 8.8 下行发送与 ACK 管理

```java
package com.example.iot.downstream;

import com.example.iot.protocol.message.IotMessage;
import com.example.iot.session.cache.LocalSessionManager;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFutureListener;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class DownstreamPushService {
    private final LocalSessionManager localSessionManager;
    private final PendingAckManager pendingAckManager;
    private final OfflineCommandStore offlineCommandStore;

    public PushResult push(CommandMessage command) {
        Channel channel = localSessionManager.getChannel(command.deviceId()).orElse(null);
        if (channel == null || !channel.isActive()) {
            offlineCommandStore.save(command);
            return PushResult.offline();
        }
        IotMessage message = CommandMessageMapper.toProtocolMessage(command);
        channel.writeAndFlush(message).addListener((ChannelFutureListener) future -> {
            if (future.isSuccess()) {
                pendingAckManager.add(command.requestId(), command);
            } else {
                offlineCommandStore.save(command);
            }
        });
        return PushResult.sent();
    }
}
```

```java
package com.example.iot.downstream;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class PendingAckManager {
    private final Map<Long, PendingCommand> pending = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final OfflineCommandStore offlineCommandStore;
    private final CommandRetryProducer commandRetryProducer;
    private final int maxRetry;

    public PendingAckManager(OfflineCommandStore offlineCommandStore,
                             CommandRetryProducer commandRetryProducer,
                             int maxRetry) {
        this.offlineCommandStore = offlineCommandStore;
        this.commandRetryProducer = commandRetryProducer;
        this.maxRetry = maxRetry;
        this.scheduler.scheduleAtFixedRate(this::scanTimeout, 1, 1, TimeUnit.SECONDS);
    }

    public void add(long requestId, CommandMessage command) {
        pending.put(requestId, new PendingCommand(command, System.currentTimeMillis() + 5000, 0));
    }

    public void ack(long requestId) {
        pending.remove(requestId);
    }

    private void scanTimeout() {
        long now = System.currentTimeMillis();
        pending.forEach((requestId, item) -> {
            if (item.expireAt() > now) {
                return;
            }
            pending.remove(requestId);
            if (item.retryCount() >= maxRetry) {
                offlineCommandStore.deadLetter(item.command(), "ack timeout");
                return;
            }
            Duration nextDelay = RetryPolicy.exponentialBackoff(item.retryCount() + 1);
            commandRetryProducer.retry(item.command().withRetry(item.retryCount() + 1), nextDelay);
        });
    }
}
```

上面这套实现体现的是工程思路：

*   ACK 状态尽量在内存里走快路径
*   超时扫描与 IO 线程隔离
*   重试不在原线程里直接阻塞等待，而是重新入异步链路

### 8.9 Redis 路由仓库

```java
package com.example.iot.session.repository;

import com.example.iot.session.model.SessionState;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.time.Duration;
import java.util.Map;

@RequiredArgsConstructor
public class RedisSessionRouteRepository implements SessionRouteRepository {
    private final StringRedisTemplate redisTemplate;
    private final Duration ttl;

    @Override
    public void register(String deviceId, String nodeId, String channelId, SessionState state) {
        String key = "route:" + deviceId;
        redisTemplate.opsForHash().putAll(key, Map.of(
                "nodeId", nodeId,
                "channelId", channelId,
                "state", state.name(),
                "lastSeen", String.valueOf(System.currentTimeMillis())
        ));
        redisTemplate.expire(key, ttl);
    }

    @Override
    public void renew(String deviceId) {
        String key = "route:" + deviceId;
        redisTemplate.opsForHash().put(key, "lastSeen", String.valueOf(System.currentTimeMillis()));
        redisTemplate.expire(key, ttl);
    }

    @Override
    public void unregister(String deviceId) {
        redisTemplate.delete("route:" + deviceId);
    }
}
```

生产环境里通常还会再加一层本地缓存，例如 Caffeine，减少高频路由读取对 Redis 的压力。

* * *

## 9. 高并发与可扩展设计：真正决定上限的不是代码，而是治理

### 9.1 连接风暴治理

设备批量重启、机房网络抖动、LB 切换、平台发布后，都会出现瞬时重连潮。治理手段至少包括：

*   设备侧重连采用指数退避 + 随机抖动
*   负载均衡层使用四层转发，避免七层代理改写 TCP 行为
*   Linux 内核参数提升：`somaxconn`、`tcp_max_syn_backlog`、`fs.file-max`
*   网关节点预热后再加入流量池
*   发布时分批摘流，避免整体连接一起掉

### 9.2 流控与背压

长连接平台不能只考虑"收得快"，还必须考虑"下游吃不吃得下"。

建议在三个层面做背压：

1.  Netty 出站缓冲水位线，控制单连接写积压
2.  网关内部异步队列设置有界容量，避免无限堆内存
3.  Kafka 或业务服务不可用时，对非关键消息做降级或丢弃策略

高峰场景下，宁可明确丢弃低优先级遥测，也不要让关键控制指令被一起拖死。

### 9.3 水平扩展策略

这个架构天然支持扩容，但要明白扩容的对象不同：

*   连接数不够：扩 `iot-gateway`
*   上行业务消费不够：扩 Kafka 分区和业务消费者
*   Redis 热点明显：优化 key 分布和本地缓存，必要时扩容 Cluster
*   下行命令处理慢：拆分命令 topic、分优先级消费

不要把"系统慢"统一理解为"加机器"。

### 9.4 多租户与设备分组

如果平台服务多个客户或多个设备产品线，建议在模型里显式带上：

*   `tenantId`
*   `productKey`
*   `deviceType`

这样做有三个直接收益：

*   Kafka 可以按租户或产品线做隔离消费
*   Redis key 可以按租户维度做容量管理
*   限流、告警、灰度都能按业务分组而不是全局一刀切

* * *

## 10. 一致性、幂等与异常处理

### 10.1 上行幂等

设备重传是常态，不是异常。上行去重可以按下面思路做：

*   设备消息带 `msgId` 或 `seq`
*   Redis 记录 `device:dedup:{deviceId}:{msgId}`
*   命中则丢弃重复处理，只保留审计日志

适用边界：

*   如果只需要秒级去重，用 Redis TTL 即可
*   如果需要长周期审计，最终还要落库或落日志平台

### 10.2 下行命令状态机

建议命令状态至少有：

*   `CREATED`
*   `ROUTED`
*   `SENT`
*   `ACKED`
*   `TIMEOUT`
*   `DEAD_LETTER`

不要把下行命令只记录成"发送成功/失败"两种状态，否则后期很难排查到底卡在哪一段。

### 10.3 断线与会话覆盖

同一设备重复登录时必须定义覆盖策略，常见有两种：

1.  新连接踢旧连接
2.  旧连接优先，新连接拒绝

IoT 场景一般更适合第一种，因为设备侧往往会主动重连，平台应以最新连接为准。但要注意：

*   覆盖前先标记旧会话为 `CLOSING`
*   防止 Redis 路由被旧连接的延迟下线事件误删
*   可以为路由记录 `version`，只允许更高版本覆盖

### 10.4 消费失败与死信

Kafka 消费失败不要无限重试。更稳妥的做法是：

*   可恢复错误：有限次数重试
*   不可恢复错误：写死信 topic
*   数据错误：落审计日志并旁路告警

否则一个坏消息会一直卡住整个分区。

* * *

## 11. 可观测性：没有观测，就没有线上治理能力

这个平台至少要有下面几类指标：

### 11.1 网关基础指标

*   当前在线连接数
*   每秒新建连接数
*   每秒断开连接数
*   EventLoop 任务队列长度
*   出站缓冲高水位命中次数
*   解码失败数、鉴权失败数

### 11.2 消息链路指标

*   上行消息 TPS
*   下行命令 TPS
*   Kafka 发送失败率
*   消费延迟和分区积压
*   ACK 超时率
*   离线补偿命中率

### 11.3 业务排障日志

日志不要只打"收到消息了"，而要围绕关键 ID 打通：

*   `deviceId`
*   `requestId`
*   `msgId`
*   `tenantId`
*   `nodeId`

这样当用户说"某台桩 10:32 没收到停止充电指令"时，你才能把一条命令从业务服务一直追到网关和设备 ACK。

### 11.4 告警建议

*   单节点连接数突降
*   某分区 Kafka 积压快速上升
*   某租户 ACK 超时率异常
*   Redis 路由写失败率升高
*   死信队列持续增长

* * *

## 12. 安全与生产运维

### 12.1 安全设计

IoT 接入不是只校验一个设备号就够了，建议至少覆盖：

*   设备身份认证：`deviceId + secret` 或证书
*   报文签名：防篡改、防重放
*   时间戳与随机数：防止旧报文重放
*   协议版本控制：支持灰度升级
*   指令权限控制：不同租户和产品线不能串发

如果设备能力允许，优先考虑 TLS；如果受限于芯片或带宽，也应至少在应用层设计签名和重放保护。

### 12.2 配置治理

下面这些参数都不应该写死在代码里：

*   心跳超时时间
*   ACK 超时时间
*   最大重试次数
*   Kafka topic 名称
*   Redis TTL
*   写缓冲阈值
*   黑白名单和限流开关

建议通过 Nacos、Apollo 或 Spring Config 做动态配置，并明确哪些参数支持热更新，哪些需要重启。

### 12.3 灰度发布与无损下线

网关不是普通 HTTP 服务，不能直接滚动重启了事。正确做法通常是：

1.  将节点从 LB 摘除，停止接收新连接
2.  保留老连接一段时间，等待自然断开或迁移
3.  超时后再强制关闭剩余连接
4.  在关闭前把关键未完成命令转移到离线补偿链路

如果直接 `kubectl rollout restart`，你会在高峰期看到一场非常整齐的重连风暴。

* * *

## 13. 容器化与部署建议

### 13.1 Dockerfile

```dockerfile
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/iot-gateway.jar /app/iot-gateway.jar
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=70 -Dio.netty.allocator.numDirectArenas=0"
EXPOSE 9000
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/iot-gateway.jar"]
```

### 13.2 Kubernetes 关键配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-gateway
spec:
  replicas: 6
  selector:
    matchLabels:
      app: iot-gateway
  template:
    metadata:
      labels:
        app: iot-gateway
    spec:
      containers:
        - name: iot-gateway
          image: registry.example.com/iot-gateway:1.0.0
          ports:
            - containerPort: 9000
          resources:
            requests:
              cpu: "2"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "4Gi"
          readinessProbe:
            tcpSocket:
              port: 9000
            initialDelaySeconds: 20
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 20"]
```

部署层面还有两个实践建议：

*   设备入口优先用四层 `LoadBalancer` 或 `NodePort + 外部 LB`
*   长连接服务要验证云厂商 LB 的空闲超时设置，避免被代理层提前断开

* * *

## 14. 常见误区与错误方案

### 14.1 误区一：把业务逻辑直接写在 Netty Handler 里

短期开发快，长期一定出问题。只要业务依赖数据库、RPC、第三方接口，IO 线程迟早被拖死。

### 14.2 误区二：所有消息都强一致、都要实时下发

IoT 平台必须分级：

*   关键控制：强可靠、ACK、重试、死信
*   重要状态：异步可靠投递
*   普通遥测：允许丢部分、允许合并上报

不是所有消息都值得用同一套成本最高的链路。

### 14.3 误区三：Redis 只要存一个 `deviceId -> nodeId` 就够了

真实生产里至少还要考虑：

*   路由过期
*   会话覆盖
*   状态版本
*   最后心跳时间
*   节点下线后的批量清理

### 14.4 误区四：扩容网关节点就能解决全部性能问题

如果 Kafka 分区数不够、消费侧处理太慢、Redis 成了热点，单纯扩网关只会把瓶颈更快推给下游。

* * *

## 15. 方案边界与演进方向

这套 Netty + Redis + Kafka 架构适合下面几类场景：

*   设备长连接接入
*   单设备消息需要局部有序
*   上下行链路需要解耦
*   平台更关注高吞吐和高可用，而不是严格事务一致性

但它也有明确边界：

*   如果设备协议天然就是 MQTT，直接评估成熟 Broker 可能更合适
*   如果边缘节点很多、跨地域时延敏感，可能需要边缘网关分层接入
*   如果设备消息极轻、对 Java 生态依赖弱，也可以评估 Go 或 Rust 网关

典型演进方向包括：

*   接入层前置边缘网关，中心平台只做汇聚
*   下行命令引入优先级 topic 和租户隔离
*   使用 Redis Stream 或专门离线消息存储替代简单 List
*   引入规则引擎，对遥测消息做边缘预过滤和聚合

* * *

## 16. 总结

百万设备接入平台的关键，不是把 Netty、Redis、Kafka 三个组件拼在一起，而是让它们分别承担最适合的职责：

*   Netty 负责高性能连接与收发
*   Redis 负责会话路由、续期和幂等辅助状态
*   Kafka 负责削峰、解耦和异步扩展

真正能把系统从"能演示"做成"能上线"的，是后面的工程化细节：连接风暴治理、背压、幂等、离线补偿、死信、观测、灰度和无损下线。

如果你也在做 IoT 接入平台，可以先检查自己是否已经回答清楚下面四个问题：

1.  某台设备现在连在哪个节点？
2.  某条下行命令现在处于什么状态？
3.  某个节点故障时，消息和连接如何恢复？
4.  某个下游服务变慢时，接入层如何不被一起拖垮？

这四个问题能答清楚，平台基本就从"Demo 架构"走向"生产级架构"了。
