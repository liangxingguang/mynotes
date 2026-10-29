---
title: Netty源码分析(30) — 实战：基于Netty实现一个简单的RPC框架
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484662&idx=1&sn=8c5c06610ba51aa1c52b6ba4cd28b0f3&chksm=fe6ca5acc91b2cba40615efef5174155931be83bf9015e33664d1d508effb434793828c2d9c7
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-30-rpc-framework.md
asset_ref: Assets/2026/10/netty-30-rpc-framework.md
---

# Netty源码分析(30) — 实战：基于Netty实现一个简单的RPC框架

> 从零开始，基于Netty手写一个轻量级RPC框架，让你彻底理解Dubbo、gRPC的底层通信原理。

> **写在前面：** 不知不觉到了系列最后一篇。前29篇我们啃完了Netty的Channel、EventLoop、ByteBuf、Pipeline、内存池、时间轮、流量控制……今天，我们把所有知识串起来，徒手撸一个轻量级 RPC 框架。看完这篇你会发现，Dubbo 那层窗户纸，捅破了也就是这么回事。

## 一、背景与问题

### RPC 是什么？

RPC（Remote Procedure Call）——让调用远程服务像调用本地方法一样简单。我们每天都在用：Dubbo、gRPC、Thrift、Spring Cloud Feign……它们底层几乎都站着 **Netty**。

### 我们要解决的问题

假设我有一个 `UserService` 接口定义在 A 服务里：

```
public interface UserService {    User findById(int id);    String greet(String name);}
```

B 服务想调用它，传统方式要写一堆 Socket 代码、序列化、拆包粘包、异常处理……烦不烦？RPC 框架的目标就是：**B 服务拿到一个「代理对象」，调它的方法，Netty 帮我把请求发到 A 服务，A 执行完把结果传回来**。

### 整体架构

```
┌─────────────────────────────────────────────────────┐│                   RPC 框架总架构                      │├─────────────────────────────────────────────────────┤│   Client（调用方）                   Server（提供方）   ││                                                      ││   UserService proxy ─── 序列化 ───→ Netty Client ──┐  ││       ↑                           ↓                  │  ││   JDK动态代理                  Netty传输管道            │  ││       ↑                           ↑                  │  ││   └─── 反序列化 ←──── Netty Server ←─────────────┘  ││                                                      ││   核心组件：                                          ││   ├─ RpcRequest / RpcResponse（协议）                 ││   ├─ 序列化器（JSON / Hessian / Protobuf）            ││   ├─ 编解码器（解决粘包）                               ││   ├─ 动态代理（透明调用）                               ││   ├─ 服务注册与发现（示例用 Map 模拟）                   ││   └─ Netty 传输（线程模型 + Pipeline）                 │└─────────────────────────────────────────────────────┘
```

## 二、核心源码

### 2.1 协议定义 —— RpcRequest & RpcResponse

这是整个 RPC 的"信封"，所有通信都靠这俩对象。

```
import java.io.Serializable;import java.util.Arrays;/** * RPC 请求协议 * 包含：请求ID、接口名、方法名、参数类型、参数值 * 实现 Serializable 便于多种序列化方式 */public class RpcRequest implements Serializable {    private static final long serialVersionUID = 1L;    private String requestId;      // 请求唯一ID，用于异步回调匹配    private String interfaceName;  // 接口全限定名，如 "com.example.UserService"    private String methodName;     // 方法名，如 "findById"    private Class<?>[] paramTypes; // 参数类型数组，用于反射确定方法签名    private Object[] params;       // 实际参数值    // getter / setter / toString 略}/** * RPC 响应协议 * 包含：请求ID（关联请求）、错误信息、结果 */public class RpcResponse implements Serializable {    private static final long serialVersionUID = 1L;    private String requestId;    private Throwable error;    // 调用异常，成功时为 null    private Object result;      // 返回值    public boolean isError() { return error != null; }    // getter / setter 略}
```

**设计心得：** 一开始我纠结要不要把 `Throwable` 放进去，后来发现必须放——远程调用的异常要是被吃掉，debug 会疯掉。Dubbo 也是这样处理的。

### 2.2 序列化接口 —— 让编解码可插拔

```
/** * 序列化器接口 * 支持多种实现：JSON、Hessian、Protobuf * 这就是「策略模式」的体现 */public interface Serializer {    <T> byte[] serialize(T obj);    <T> T deserialize(byte[] data, Class<T> clazz);}/** * JSON 序列化实现（基于 Jackson） * 优点：可读性强，调试方便 * 缺点：性能一般，体积较大 */public class JsonSerializer implements Serializer {    private static final ObjectMapper objectMapper = new ObjectMapper();    @Override    public <T> byte[] serialize(T obj) {        try {            return objectMapper.writeValueAsBytes(obj);        } catch (Exception e) {            throw new RpcException("序列化失败", e);        }    }    @Override    public <T> T deserialize(byte[] data, Class<T> clazz) {        try {            return objectMapper.readValue(data, clazz);        } catch (Exception e) {            throw new RpcException("反序列化失败", e);        }    }}
```

### 2.3 编解码器 —— 解决粘包问题的关键

Netty 的 `ByteToMessageDecoder` 和 `MessageToByteEncoder` 是解决 TCP 粘包/拆包的标准姿势。这里我采用 **长度域编码（LengthFieldBasedFrameDecoder）**，前4字节存长度。

```
import io.netty.buffer.ByteBuf;import io.netty.channel.ChannelHandlerContext;import io.netty.handler.codec.ByteToMessageDecoder;import io.netty.handler.codec.MessageToByteEncoder;/** * RPC 编码器：对象 → 字节 * 格式：[4字节长度][数据] */public class RpcEncoder extends MessageToByteEncoder<Object> {    private final Serializer serializer;    public RpcEncoder(Serializer serializer) {        this.serializer = serializer;    }    @Override    protected void encode(ChannelHandlerContext ctx, Object msg, ByteBuf out) {        byte[] data = serializer.serialize(msg);        // 先写长度（4字节int），再写数据        out.writeInt(data.length);        out.writeBytes(data);    }}/** * RPC 解码器：字节 → 对象 * 继承 ByteToMessageDecoder，天然支持粘包处理 * 每次读到完整的数据帧才解码 */public class RpcDecoder extends ByteToMessageDecoder {    private final Serializer serializer;    private final Class<?> targetClass;    public RpcDecoder(Serializer serializer, Class<?> targetClass) {        this.serializer = serializer;        this.targetClass = targetClass;    }    @Override    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {        // 可读字节不足4个（长度字段），等待        if (in.readableBytes() < 4) return;        in.markReaderIndex();        int dataLength = in.readInt();        // 数据还没全部到达，复位等待下一次 read        // 这就是 ByteToMessageDecoder 的精髓 —— 自动处理粘包        if (in.readableBytes() < dataLength) {            in.resetReaderIndex();            return;        }        byte[] data = new byte[dataLength];        in.readBytes(data);        out.add(serializer.deserialize(data, targetClass));    }}
```

**注意这个细节：**`markReaderIndex()` + `resetReaderIndex()` 是拆包的核心手法。数据不够时回滚读指针，Netty 下次收到更多数据后继续。回想系列第13篇对 LengthFieldBasedFrameDecoder 的详细分析，现在你明白为什么它那么重要了吧？

### 2.4 客户端代理 —— JDK 动态代理让调用透明化

这是 RPC 最"魔法"的地方——调个接口方法，数据就飞到远端了。

```
import java.lang.reflect.InvocationHandler;import java.lang.reflect.Method;import java.lang.reflect.Proxy;import java.util.UUID;import java.util.concurrent.ConcurrentHashMap;/** * RPC 客户端代理工厂 * 通过 JDK 动态代理，把「接口调用」悄悄转成「网络请求」 */public class RpcProxyFactory {    private final String host;    private final int port;    private final Serializer serializer;    // 存储等待响应的 Future，key = requestId    // RpcClientHandler 收到响应后会从这里取出对应的 Future 并设置结果    private final ConcurrentHashMap<String, RpcFuture<RpcResponse>> pendingRequests            = new ConcurrentHashMap<>();    private volatile Channel channel; // 与服务器的连接    public RpcProxyFactory(String host, int port, Serializer serializer) {        this.host = host;        this.port = port;        this.serializer = serializer;    }    /**     * 创建代理对象     * 使用方：UserService userService = proxyFactory.create(UserService.class);     */    @SuppressWarnings("unchecked")    public <T> T create(Class<T> interfaceClass) {        return (T) Proxy.newProxyInstance(                interfaceClass.getClassLoader(),                new Class<?>[]{interfaceClass},                new InvocationHandler() {                    @Override                    public Object invoke(Object proxy, Method method, Object[] args) {                        // 过滤 Object 自带方法（toString, hashCode 等）                        if (method.getDeclaringClass() == Object.class) {                            return method.invoke(this, args);                        }                        // 1. 构建 RpcRequest                        RpcRequest request = new RpcRequest();                        request.setRequestId(UUID.randomUUID().toString());                        request.setInterfaceName(method.getDeclaringClass().getName());                        request.setMethodName(method.getName());                        request.setParamTypes(method.getParameterTypes());                        request.setParams(args);                        // 2. 发送请求并等待响应                        RpcResponse response = sendRequest(request);                        // 3. 检查错误                        if (response.isError()) {                            throw new RpcException("远程调用异常", response.getError());                        }                        return response.getResult();                    }                });    }    /**     * 发送 RPC 请求 —— 核心通信逻辑     */    private RpcResponse sendRequest(RpcRequest request) {        // 懒加载 Channel（实际生产会加连接池和重试）        if (channel == null || !channel.isActive()) {            connect();        }        // 创建 Future，放入等待队列        RpcFuture<RpcResponse> future = new RpcFuture<>();        pendingRequests.put(request.getRequestId(), future);        // 写数据到 Netty（异步）        channel.writeAndFlush(request);        // 同步等待结果（这里用 Future 的阻塞等待）        // 内部是 CountDownLatch 实现        try {            return future.get(5, TimeUnit.SECONDS);        } catch (Exception e) {            throw new RpcException("请求超时或失败", e);        } finally {            pendingRequests.remove(request.getRequestId());        }    }    private void connect() {        // 用 Netty 的 Bootstrap 建立连接（复用系列第8篇的知识）        EventLoopGroup group = new NioEventLoopGroup();        Bootstrap bootstrap = new Bootstrap();        bootstrap.group(group)                .channel(NioSocketChannel.class)                .handler(new ChannelInitializer<SocketChannel>() {                    @Override                    protected void initChannel(SocketChannel ch) {                        ch.pipeline()                            .addLast(new RpcEncoder(serializer))    // 出站：对象→字节                            .addLast(new RpcDecoder(serializer, RpcResponse.class)) // 入站：字节→响应                            .addLast(new RpcClientHandler(pendingRequests)); // 处理响应                    }                })                .option(ChannelOption.TCP_NODELAY, true);        try {            channel = bootstrap.connect(host, port).sync().channel();        } catch (Exception e) {            throw new RpcException("连接服务器失败", e);        }    }}
```

### 2.5 客户端处理器 —— 收到响应后唤醒等待

```
import io.netty.channel.ChannelHandlerContext;import io.netty.channel.SimpleChannelInboundHandler;import java.util.concurrent.ConcurrentHashMap;/** * 客户端响应处理器 * 服务器返回 RpcResponse 时，找到对应的 Future 并设置结果 */public class RpcClientHandler extends SimpleChannelInboundHandler<RpcResponse> {    private final ConcurrentHashMap<String, RpcFuture<RpcResponse>> pendingRequests;    public RpcClientHandler(ConcurrentHashMap<String, RpcFuture<RpcResponse>> pendingRequests) {        this.pendingRequests = pendingRequests;    }    @Override    protected void channelRead0(ChannelHandlerContext ctx, RpcResponse response) {        // 根据 requestId 找到对应的 Future        RpcFuture<RpcResponse> future = pendingRequests.remove(response.getRequestId());        if (future != null) {            future.setResponse(response); // 唤醒等待线程        }    }    @Override    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {        cause.printStackTrace();        ctx.close();    }}
```

### 2.6 服务端 —— 服务注册与反射调用

```
import java.util.Map;import java.util.concurrent.ConcurrentHashMap;/** * 服务注册中心（简化版） * 维护接口 → 实现类的映射 * 生产环境应当基于 ZooKeeper / Nacos，这里用 ConcurrentHashMap 模拟 */public class ServiceRegistry {    private final Map<String, Object> services = new ConcurrentHashMap<>();    public void register(Class<?> interfaceClass, Object serviceImpl) {        services.put(interfaceClass.getName(), serviceImpl);        System.out.println("[注册服务] " + interfaceClass.getName()                + " → " + serviceImpl.getClass().getName());    }    public Object getService(String interfaceName) {        return services.get(interfaceName);    }}
```

```
import io.netty.channel.ChannelHandlerContext;import io.netty.channel.SimpleChannelInboundHandler;import java.lang.reflect.Method;/** * 服务端请求处理器 * 核心逻辑：反射调用本地服务，包装结果返回 */public class RpcServerHandler extends SimpleChannelInboundHandler<RpcRequest> {    private final ServiceRegistry registry;    public RpcServerHandler(ServiceRegistry registry) {        this.registry = registry;    }    @Override    protected void channelRead0(ChannelHandlerContext ctx, RpcRequest request) {        RpcResponse response = new RpcResponse();        response.setRequestId(request.getRequestId());        try {            // 1. 找到服务实现            Object service = registry.getService(request.getInterfaceName());            if (service == null) {                throw new IllegalArgumentException("服务未注册: " + request.getInterfaceName());            }            // 2. 反射调用方法            // 注意：这里用 getDeclaredMethod，需要精确匹配参数类型            Method method = service.getClass().getMethod(                    request.getMethodName(), request.getParamTypes());            // 3. 执行            Object result = method.invoke(service, request.getParams());            // 4. 设置结果            response.setResult(result);        } catch (Throwable t) {            // 把异常包装进响应，客户端可以重新抛出            response.setError(new RuntimeException("服务端执行异常: " + t.getMessage(), t));        }        // 写回结果        ctx.writeAndFlush(response);    }    @Override    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {        cause.printStackTrace();        ctx.close();    }}
```

### 2.7 服务端启动器

```
import io.netty.bootstrap.ServerBootstrap;import io.netty.channel.*;import io.netty.channel.nio.NioEventLoopGroup;import io.netty.channel.socket.SocketChannel;import io.netty.channel.socket.nio.NioServerSocketChannel;/** * RPC 服务端 * 启动 Netty Server，监听端口，处理 RPC 请求 */public class RpcServer {    private final int port;    private final Serializer serializer;    private final ServiceRegistry registry;    private EventLoopGroup bossGroup;    private EventLoopGroup workerGroup;    public RpcServer(int port, Serializer serializer, ServiceRegistry registry) {        this.port = port;        this.serializer = serializer;        this.registry = registry;    }    public void start() throws Exception {        bossGroup = new NioEventLoopGroup(1);   // Boss 线程：处理 accept        workerGroup = new NioEventLoopGroup(4);  // Worker 线程：处理 IO        try {            ServerBootstrap bootstrap = new ServerBootstrap();            bootstrap.group(bossGroup, workerGroup)                    .channel(NioServerSocketChannel.class)                    .childHandler(new ChannelInitializer<SocketChannel>() {                        @Override                        protected void initChannel(SocketChannel ch) {                            ch.pipeline()                                // 入站：解码请求（RpcRequest）                                .addLast(new RpcDecoder(serializer, RpcRequest.class))                                // 出站：编码响应（RpcResponse）                                .addLast(new RpcEncoder(serializer))                                // 业务处理                                .addLast(new RpcServerHandler(registry));                        }                    })                    .option(ChannelOption.SO_BACKLOG, 128)                    .childOption(ChannelOption.SO_KEEPALIVE, true)                    .childOption(ChannelOption.TCP_NODELAY, true);            ChannelFuture future = bootstrap.bind(port).sync();            System.out.println("[RPC Server] 启动完成，监听端口 " + port);            future.channel().closeFuture().sync();        } finally {            bossGroup.shutdownGracefully();            workerGroup.shutdownGracefully();        }    }    public void stop() {        if (bossGroup != null) bossGroup.shutdownGracefully();        if (workerGroup != null) workerGroup.shutdownGracefully();    }}
```

### 2.8 RpcFuture —— 异步转同步的核心工具

这是 Netty 异步模型和业务方同步等待之间的桥梁。

```
import java.util.concurrent.CountDownLatch;import java.util.concurrent.TimeUnit;import java.util.concurrent.TimeoutException;/** * RPC 异步结果封装 * 内部使用 CountDownLatch 实现阻塞等待 * 设计思想参考 Netty 的 ChannelFuture 和 Promise */public class RpcFuture<T> {    private final CountDownLatch latch = new CountDownLatch(1);    private volatile T response;    /**     * 设置响应结果，唤醒等待线程     */    public void setResponse(T response) {        this.response = response;        latch.countDown(); // 释放锁    }    /**     * 阻塞获取结果（带超时）     */    public T get(long timeout, TimeUnit unit) throws Exception {        boolean success = latch.await(timeout, unit);        if (!success) {            throw new TimeoutException("请求超时");        }        return response;    }}
```

## 三、原理分析

### 整体调用流程

```
Client 调用 userService.findById(1)    │    ▼JDK 动态代理 InvocationHandler.invoke()    │    ├─ 构建 RpcRequest{interface, method, params}    ├─ 生成 requestId    ├─ 创建 RpcFuture，放入 pendingRequests    │    ▼channel.writeAndFlush(request)    │    ├─ RpcEncoder 序列化 → 写入 ByteBuf    ├─ Netty 传输（TCP）    │    ▼Server 端 RpcDecoder 解码 → RpcServerHandler    │    ├─ registry.getService("UserService") → 找到实现类    ├─ method.invoke(impl, args) → 真正执行    ├─ 包装 RpcResponse    │    ▼ctx.writeAndFlush(response) 返回    │    ├─ RpcEncoder 序列化 → TCP 回传    │    ▼Client 端 RpcDecoder 解码 → RpcClientHandler    │    ├─ pendingRequests.get(requestId) → 拿到 Future    ├─ future.setResponse(response) → 唤醒等待线程    │    ▼Client 拿到结果返回给调用方
```

### 设计模式一览

| 模式 | 哪里用到了？ |
| --- | --- |
| **代理模式** | JDK 动态代理把接口调用转为网络请求 |
| **工厂模式** | RpcProxyFactory 创建代理对象 |
| **策略模式** | Serializer 接口支持多种序列化算法 |
| **责任链模式** | Netty Pipeline 中的编解码器链 |
| **观察者模式** | ChannelFuture 回调通知 |
| **Reactor 模式** | Netty EventLoopGroup 多线程事件驱动 |
| **Future 模式** | RpcFuture 异步结果封装 |

### 和 Dubbo 的对比

我这个小框架大约 300 行代码，Dubbo 几十万行。差在哪？

1.  **服务发现** — 我用 Map，Dubbo 用 ZK/Nacos，支持动态上下线
2.  **负载均衡** — 我单节点硬编码，Dubbo 支持随机、轮询、一致性哈希
3.  **连接池** — 我单连接，Dubbo 有多连接复用和心跳保活
4.  **超时重试** — 我只有超时报错，Dubbo 支持集群容错（Failover）
5.  **序列化** — 我用的 JSON，Dubbo 主打 Hessian2 / Kryo，性能差 5-10 倍
6.  **优雅降级** — Dubbo 有 Mock 数据、服务降级策略
7.  **SPI 扩展** — Dubbo 的微内核 + SPI 机制，所有组件可替换
8.  **流量控制** — Dubbo 有限流、熔断（集成 Sentinel/Hystrix）

但**核心通信原理一模一样**！把这 300 行消化了，看 Dubbo 源码轻松一大半。

## 四、完整可运行的示例

来，跑起来看看效果。

### 4.1 定义服务接口

```
// 注意：这个接口在 Client 和 Server 都要有，包名必须一致public interface UserService {    User findById(int id);    String greet(String name);}public class User implements Serializable {    private int id;    private String name;    private String email;    // 构造、getter/setter、toString 略}
```

### 4.2 服务端：注册实现并启动

```
public class ServerMain {    public static void main(String[] args) throws Exception {        // 1. 创建序列化器        Serializer serializer = new JsonSerializer();        // 2. 注册服务        ServiceRegistry registry = new ServiceRegistry();        registry.register(UserService.class, new UserServiceImpl());        // 3. 启动 RPC Server        RpcServer server = new RpcServer(8990, serializer, registry);        System.out.println("服务端启动，按 Ctrl+C 停止");        server.start();    }}// 接口实现类 —— 这才是真正干活的public class UserServiceImpl implements UserService {    @Override    public User findById(int id) {        // 模拟数据库查询        return new User(id, "用户" + id, "user" + id + "@example.com");    }    @Override    public String greet(String name) {        return "Hello, " + name + "! 欢迎来到 Netty RPC 的世界！";    }}
```

### 4.3 客户端：通过代理调用远程服务

```
public class ClientMain {    public static void main(String[] args) {        // 1. 创建代理工厂        RpcProxyFactory factory = new RpcProxyFactory("127.0.0.1", 8990, new JsonSerializer());        // 2. 创建代理对象 —— 这就是 RPC 的魔力！        UserService userService = factory.create(UserService.class);        // 3. 调用远程方法 —— 跟本地调用一模一样        User user = userService.findById(1001);        System.out.println("查询结果: " + user);        String msg = userService.greet("Netty");        System.out.println("问候结果: " + msg);        // 4. 关闭（示例中直接 exit）        System.exit(0);    }}
```

### 4.4 预期输出

```
=== RPC Server ===[注册服务] com.example.UserService → com.example.UserServiceImpl[RPC Server] 启动完成，监听端口 8990=== RPC Client ===查询结果: User{id=1001, name='用户1001', email='user1001@example.com'}问候结果: Hello, Netty! 欢迎来到 Netty RPC 的世界！
```

## 五、注意事项

### 5.1 序列化的坑

*   **JSON 序列化接口时丢失泛型信息** — 反序列化后 `List<User>` 可能变成 `List<LinkedHashMap>`。解决方案：用 Jackson 的 TypeReference 或换 Hessian/Kryo
*   **循环引用** — JSON 序列化存在父子引用时栈溢出。Hessian 天然支持循环引用
*   **Serializable 版本号** — 接口改了没改 versionUID 会反序列化失败，生产环境用 serialVersionUID 管理兼容性

### 5.2 编解码的坑

*   **长度域别用错了** — 我用的 4 字节 int，如果要兼容大报文（>2GB）请用 long
*   **不要直接 extend ByteToMessageDecoder 而不检查长度** — 我那个 `markReaderIndex` 回滚手法是标准姿势，别图省事只用 `readableBytes()` 判断长度就开读
*   **单连接多请求并发问题** — 请求和响应是异步的，必须靠 `requestId` 做关联。我用的 `ConcurrentHashMap` 非阻塞，考虑性能；如果高并发可以用 Netty 的 `AttributeKey` 将 requestId 绑定到 Channel

### 5.3 反射性能

*   反射调用 `method.invoke()` 比直接调用慢 1-2 个数量级
*   **优化方案：** 缓存 `Method` 对象、用 `MethodHandle` 或 ASM 生成代理类（Dubbo 就是这么干的）
*   更高阶：用 `javassist` 编译动态字节码，几乎无反射开销

### 5.4 超时处理

*   我示例里 `RpcFuture.get(5s)` 够简单，但有个问题：**线程阻塞**了。高并发时线程池容易被占满
*   Dubbo 用 `CompletableFuture` 实现全异步，Netty 的 `ChannelFuture` 也是异步回调的典范
*   进阶：改成基于回调的模型，客户端 `sendRequest` 返回 `CompletableFuture`，调用方 `.thenApply()` 处理结果

### 5.5 连接管理

*   目前是懒加载 + 单连接，连接断开后需要重连
*   参考系列第18篇的断线重连机制：加 `ChannelFutureListener` 监听 close 事件，自动重连
*   生产环境要有连接池，参考 HTTP 的 Keep-Alive 连接复用

### 5.6 性能考量

| 优化点 | 做法 | 收益 |
| --- | --- | --- |
| 序列化 | JSON → Hessian/Kryo | 吞吐提升 3-10 倍 |
| 编解码 | 减少 ByteBuf 拷贝（CompositeByteBuf） | 减少内存复制 |
| 线程模型 | 业务逻辑移到 BizExecutor 线程池 | 不阻塞 IO 线程 |
| 内存池 | 使用 PooledByteBufAllocator | 减少 GC 压力 |
| 批量发送 | write 多次后 flush 一次 | 减少系统调用 |
| EventLoop 绑定 | 避免在 ChannelHandler 里用 ThreadLocal | 防止线程切换 |

## 写在最后

30 篇，从 Netty 是什么，到 Reactor 模型、Channel 三剑客、ByteBuf 内存管理、PoolChunk 池化分配、EventLoop 事件循环、Pipeline 传播机制、零拷贝、时间轮、SSL、流量控制……再到今天亲手撸了一个 RPC 框架。

看完这一篇，你应该感觉到：**Netty 并不神秘，RPC 也不复杂**。Dubbo、gRPC 这些高大上的框架，底层核心原理和你今天写的 300 行代码如出一辙。区别只是它们把边界情况、性能、可用性打磨到了极致。

这 30 篇不是终点。真正理解 Netty，需要你在实际项目中犯错、踩坑、然后回来翻源码。把这个小 RPC 框架跑起来，改一改，加点功能（比如注册中心、负载均衡、重试），你会发现自己的进步比看十遍源码都大。

**源码在手，心中有架构。祝大家写出高性能的网络应用！**

* * *

_系列文章索引：本文是「Netty源码分析系列」第30篇（最终篇），欢迎翻阅前29篇系统学习。_
