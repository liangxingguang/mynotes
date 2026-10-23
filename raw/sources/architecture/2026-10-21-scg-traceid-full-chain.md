---
title: Spring Cloud Gateway 全链路 traceId 传递方案
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/pcDs7bKa75MSLcpHUY3W1g"
source_type: link
platform: 微信
captured: 2026-10-21
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-21-scg-traceid-full-chain.md
asset_ref: Assets/2026/10/scg-traceid-full-chain.md
---

# Spring Cloud Gateway 全链路 traceId 传递方案

# Spring Cloud Gateway 全链路 traceId 传递方案

> 来源：https://mp.weixin.qq.com/s/pcDs7bKa75MSLcpHUY3W1g
> 抓取时间：2026-10-21（web-fetch，browser 级）

微服务架构下，一个用户请求可能经过网关、订单服务、库存服务、支付服务、通知服务……五六个服务串联处理。一旦出了问题，排查起来简直是灾难：

*   网关日志里搜不到，订单服务日志里也搜不到，不知道请求到底流到了哪；
*   同一个请求在不同服务的日志里没有关联标识，只能靠时间戳大概对齐，误差几秒就对不上；
*   异步线程、MQ 消息里 traceId 丢了，链路直接断成两截；
*   前端报错了只拿到一个 500，开发想排查连请求标识都没有，只能让用户"再试一次"复现。

这就是没有全链路 traceId 的痛。而 Spring Cloud Gateway 作为微服务架构的入口，是 traceId 传递的第一站，也是最关键的一站。但 Gateway 是基于 WebFlux 响应式编程的，传统的 ThreadLocal + MDC 方案在响应式环境下直接失效，很多人照搬 Servlet 那套写法，结果 traceId 时有时无，链路断断续续。

* * *

## 一、为什么 Gateway 的 traceId 传递和 Servlet 不一样？

### 1.1 Servlet 时代的 traceId 方案

在传统的 Spring MVC（Servlet）架构里，traceId 传递很简单：

1.  用 Filter 拦截请求，从请求头获取 traceId，没有就生成一个；
2.  把 traceId 放到 ThreadLocal 里；
3.  日志框架通过 MDC（Mapped Diagnostic Context）读取 ThreadLocal 里的 traceId，打印到日志中；
4.  调用下游服务时，从 ThreadLocal 取出 traceId，放到请求头里传递；
5.  请求结束后，清除 ThreadLocal，避免内存泄漏。

这套方案的核心依赖是 **ThreadLocal**——因为 Servlet 是一个请求一个线程，从头到尾都在同一个线程里执行，ThreadLocal 能稳定保存上下文。

### 1.2 Gateway 是响应式的，ThreadLocal 失效了

Spring Cloud Gateway 基于 Spring WebFlux，而 WebFlux 基于 Reactor 响应式编程。响应式编程的核心特点是： **请求处理不绑定固定线程，操作可能在不同线程间切换**。

```
请求进来 → 线程A处理过滤器 → 线程B处理路由 → 线程C调用下游 → 线程D处理响应
```

同一个请求，在不同阶段可能由不同线程处理。这时候 ThreadLocal 就废了：

*   线程 A 里 set 的 traceId，线程 B 里 get 不到；
*   MDC 基于 ThreadLocal，日志里的 traceId 时有时无；
*   下游调用时取 traceId，可能取到 null，链路直接断了。

### 1.3 解决方案：Reactor Context

Reactor 提供了 **Context** 机制，专门用于在响应式流中传递上下文。它和 ThreadLocal 类似，但不绑定线程，而是绑定到响应式流（Subscriber），不管线程怎么切换，Context 都能跟着流走。

```java
// 写入 Context
Mono.just("data")
    .contextWrite(context -> context.put("traceId", traceId))
    .flatMap(data -> {
        // 从 Context 读取
        return Mono.deferContextual(contextView -> {
            String traceId = contextView.get("traceId");
            return doSomething(traceId);
        });
    });
```

所以 Spring Cloud Gateway 的 traceId 传递，核心就是： **用 Reactor Context 替代 ThreadLocal 作为 traceId 的载体，在过滤器中写入和读取，同时通过钩子机制同步到 MDC 用于日志打印。**

* * *

## 二、整体架构：traceId 全链路流转

```
客户端请求
    │
    ▼
┌─────────────────────────────────────────┐
│  Spring Cloud Gateway                   │
│  1. GlobalFilter 拦截请求                │
│  2. 从请求头 X-Trace-Id 获取，没有则生成  │
│  3. 写入 Reactor Context                 │
│  4. 同步到 MDC（日志打印）                │
│  5. 转发请求时，把 traceId 放到请求头      │
│  6. 响应时，把 traceId 放到响应头返回客户端│
│  7. 请求结束，清除 MDC                    │
└─────────────────────────────────────────┘
    │  请求头携带 X-Trace-Id
    ▼
┌─────────────────────────────────────────┐
│  下游服务（订单/库存/支付...）            │
│  1. Filter 拦截，从请求头获取 traceId      │
│  2. 放入 ThreadLocal / MDC               │
│  3. 日志自动打印 traceId                  │
│  4. 调用下一个服务时，从 MDC 取出放入请求头 │
│  5. 异步/MQ 场景手动传递 traceId          │
│  6. 请求结束清除                          │
└─────────────────────────────────────────┘
```

核心设计原则：

*   **网关是入口**：traceId 在网关层生成或接收，是全链路的起点；
*   **请求头传递**：服务间通过 HTTP 请求头 `X-Trace-Id` 传递，这是最通用的方式；
*   **日志可追溯**：每个服务的日志都打印 traceId，通过 traceId 能串联全链路；
*   **响应返回**：网关把 traceId 放到响应头返回给前端，前端报错时可以带上 traceId 找开发排查。

* * *

## 三、网关层实现：GlobalFilter + Reactor Context

### 3.1 技术栈确认

```xml
<dependencies>
    <!-- Spring Cloud Gateway -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-gateway</artifactId>
    </dependency>
    <!-- 日志，默认 logback -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-logging</artifactId>
    </dependency>
</dependencies>
```

### 3.2 TraceId 常量与工具类

```java
public class TraceIdConstants {
    /** 链路追踪 ID 请求头 */
    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    /** MDC 中的 key */
    public static final String TRACE_ID_MDC_KEY = "traceId";
    /** Reactor Context 中的 key */
    public static final String TRACE_ID_CONTEXT_KEY = "traceId";
    /** traceId 长度 */
    public static final int TRACE_ID_LENGTH = 16;
}
```

```java
public class TraceIdUtil {
    /**
     * 生成 traceId：用 UUID 去掉横线，取前 16 位
     * 也可以用雪花算法、ObjectId 等，只要全局唯一即可
     */
    public static String generateTraceId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    /**
     * 校验 traceId 格式是否合法
     */
    public static String isValid(String traceId) {
        return StrUtil.isNotBlank(traceId) && traceId.length() <= 32;
    }
}
```

### 3.3 核心：TraceId 全局过滤器

```java
@Component
@Slf4j
public class TraceIdGlobalFilter implements GlobalFilter, Ordered {

    /**
     * 过滤器顺序：尽量靠前，在路由转发之前执行
     */
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 1. 从请求头获取 traceId，没有则生成
        String traceId = request.getHeaders().getFirst(TraceIdConstants.TRACE_ID_HEADER);
        if (!TraceIdUtil.isValid(traceId)) {
            traceId = TraceIdUtil.generateTraceId();
            log.debug("网关生成新的 traceId: {}", traceId);
        }

        // 2. 把 traceId 放到请求头，传递给下游服务
        ServerHttpRequest mutatedRequest = request.mutate()
                .header(TraceIdConstants.TRACE_ID_HEADER, traceId)
                .build();

        // 3. 把 traceId 放到响应头，返回给客户端
        exchange.getResponse().getHeaders().add(TraceIdConstants.TRACE_ID_HEADER, traceId);

        // 4. 写入 Reactor Context，并通过钩子同步到 MDC
        final String finalTraceId = traceId;
        return chain.filter(exchange.mutate().request(mutatedRequest).build())
                // 写入 Reactor Context，整个响应式流都能读取
                .contextWrite(context -> context.put(TraceIdConstants.TRACE_ID_CONTEXT_KEY, finalTraceId))
                // 关键：用 doOnEach 钩子在每个信号发出时同步 MDC
                .doOnEach(signal -> {
                    if (signal.isOnNext() || signal.isOnComplete() || signal.isOnError()) {
                        MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, finalTraceId);
                    }
                })
                // 请求结束后清除 MDC，避免线程复用导致的脏数据
                .doFinally(signalType -> MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY));
    }
}
```

### 3.4 关键技术点详解

#### 关键点1：为什么用 doOnEach 同步 MDC？

MDC 基于 ThreadLocal，而响应式流在线程间切换。`doOnEach` 会在每个信号（onNext/onComplete/onError）发出时触发，不管当前在哪个线程，都会执行 `MDC.put`。这样就能保证： **日志打印的那一刻，MDC 里有 traceId**。

```java
.doOnEach(signal -> {
    if (signal.isOnNext() || signal.isOnComplete() || signal.isOnError()) {
        MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, finalTraceId);
    }
})
```

#### 关键点2：为什么用 doFinally 清除 MDC？

响应式编程中线程是池化复用的，一个请求结束后，线程可能被下一个请求复用。如果不清除 MDC，下一个请求可能读到上一个请求的 traceId，导致日志串号。`doFinally` 会在流结束（成功/失败/取消）时触发，确保 MDC 被清除。

#### 关键点3：为什么用 contextWrite 写入 Reactor Context？

`contextWrite` 是 Reactor 提供的写入 Context 的操作符，它会把数据写入到响应式流的上下文中。后续的操作符可以通过 `deferContextual` 读取 Context 中的 traceId，比如在自定义过滤器、限流逻辑中需要 traceId 时。

```java
// 下游过滤器读取 traceId 示例
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    return Mono.deferContextual(contextView -> {
        String traceId = contextView.getOrDefault(TraceIdConstants.TRACE_ID_CONTEXT_KEY, "unknown");
        log.info("当前请求 traceId: {}", traceId);
        return chain.filter(exchange);
    });
}
```

#### 关键点4：为什么用 request.mutate() 修改请求头？

`ServerHttpRequest` 是不可变的，不能直接修改请求头。通过 `mutate()` 创建一个新的请求对象，添加 traceId 请求头，再通过 `exchange.mutate().request(...).build()` 替换 exchange 中的请求。这样下游路由转发时，就会携带 traceId 请求头。

### 3.5 日志配置：logback 打印 traceId

```xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>
                %d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [%X{traceId}] %-5level %logger{36} - %msg%n
            </pattern>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

关键是 `%X{traceId}`，这是 logback 的 MDC 变量输出语法，会自动读取 MDC 中 key 为 `traceId` 的值。

配置后，网关日志输出效果：

```
2026-08-23 10:30:00.123 [reactor-http-nio-3] [a1b2c3d4e5f6g7h8] INFO  c.e.g.filter.TraceIdGlobalFilter - 请求路由到订单服务
```

* * *

## 四、下游服务实现：接收 + 透传 + 日志

### 4.1 Servlet 下游服务（Spring MVC）

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 1. 从请求头获取 traceId
        String traceId = httpRequest.getHeader(TraceIdConstants.TRACE_ID_HEADER);
        if (!TraceIdUtil.isValid(traceId)) {
            traceId = TraceIdUtil.generateTraceId();
        }

        // 2. 放入 MDC，日志自动打印
        MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, traceId);

        // 3. 响应头也返回 traceId
        httpResponse.setHeader(TraceIdConstants.TRACE_ID_HEADER, traceId);

        try {
            chain.doFilter(request, response);
        } finally {
            // 4. 请求结束清除 MDC
            MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY);
        }
    }
}
```

### 4.2 WebFlux 下游服务（响应式）

```java
@Component
public class TraceIdWebFilter implements WebFilter, Ordered {

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String traceId = exchange.getRequest().getHeaders().getFirst(TraceIdConstants.TRACE_ID_HEADER);
        if (!TraceIdUtil.isValid(traceId)) {
            traceId = TraceIdUtil.generateTraceId();
        }

        // 响应头返回 traceId
        exchange.getResponse().getHeaders().add(TraceIdConstants.TRACE_ID_HEADER, traceId);

        final String finalTraceId = traceId;
        return chain.filter(exchange)
                .contextWrite(context -> context.put(TraceIdConstants.TRACE_ID_CONTEXT_KEY, finalTraceId))
                .doOnEach(signal -> {
                    if (signal.isOnNext() || signal.isOnComplete() || signal.isOnError()) {
                        MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, finalTraceId);
                    }
                })
                .doFinally(signalType -> MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY));
    }
}
```

### 4.3 服务间调用：RestTemplate / WebClient 透传

#### RestTemplate 拦截器

```java
@Component
public class TraceIdRestTemplateInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        String traceId = MDC.get(TraceIdConstants.TRACE_ID_MDC_KEY);
        if (StrUtil.isNotBlank(traceId)) {
            request.getHeaders().add(TraceIdConstants.TRACE_ID_HEADER, traceId);
        }
        return execution.execute(request, body);
    }
}
```

注册到 RestTemplate：

```java
@Bean
public RestTemplate restTemplate() {
    RestTemplate restTemplate = new RestTemplate();
    restTemplate.setInterceptors(List.of(new TraceIdRestTemplateInterceptor()));
    return restTemplate;
}
```

#### WebClient 过滤器

```java
@Bean
public WebClient webClient() {
    return WebClient.builder()
            .filter((request, next) -> {
                String traceId = MDC.get(TraceIdConstants.TRACE_ID_MDC_KEY);
                if (StrUtil.isNotBlank(traceId)) {
                    ClientRequest mutatedRequest = ClientRequest.from(request)
                            .header(TraceIdConstants.TRACE_ID_HEADER, traceId)
                            .build();
                    return next.exchange(mutatedRequest);
                }
                return next.exchange(request);
            })
            .build();
}
```

> 注意：WebClient 是响应式的，MDC 在响应式环境下可能失效。如果是 WebFlux 服务调用，建议从 Reactor Context 读取 traceId，而不是 MDC。

* * *

## 五、异步场景：traceId 最容易丢的地方

同步调用的 traceId 传递很简单，但异步场景（`@Async`、线程池、MQ 消息）是 traceId 最容易丢失的地方。

### 5.1 @Async 异步方法

`@Async` 方法在新线程执行，ThreadLocal 里的 traceId 不会自动传递。解决方案：自定义 TaskDecorator，在任务执行前把 traceId 传递过去。

```java
public class TraceIdTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        // 从当前线程（调用方线程）获取 traceId
        String traceId = MDC.get(TraceIdConstants.TRACE_ID_MDC_KEY);
        return () -> {
            try {
                // 在异步线程中设置 traceId
                if (StrUtil.isNotBlank(traceId)) {
                    MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, traceId);
                }
                runnable.run();
            } finally {
                MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY);
            }
        };
    }
}
```

配置到线程池：

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("asyncExecutor")
    public ThreadPoolTaskExecutor asyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("async-");
        // 关键：设置 TaskDecorator，自动传递 traceId
        executor.setTaskDecorator(new TraceIdTaskDecorator());
        executor.initialize();
        return executor;
    }
}
```

### 5.2 手动线程池

如果是自己创建的线程池（`ThreadPoolExecutor`），用同样的思路包装 Runnable：

```java
public class TraceIdRunnableWrapper implements Runnable {

    private final Runnable delegate;
    private final String traceId;

    public TraceIdRunnableWrapper(Runnable delegate) {
        this.delegate = delegate;
        this.traceId = MDC.get(TraceIdConstants.TRACE_ID_MDC_KEY);
    }

    @Override
    public void run() {
        if (StrUtil.isNotBlank(traceId)) {
            MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, traceId);
        }
        try {
            delegate.run();
        } finally {
            MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY);
        }
    }

    public static Runnable wrap(Runnable runnable) {
        return new TraceIdRunnableWrapper(runnable);
    }
}
```

使用时：

```java
executor.execute(TraceIdRunnableWrapper.wrap(() -> {
    // 异步逻辑，MDC 里有 traceId
    log.info("异步任务执行");
}));
```

### 5.3 MQ 消息传递

MQ 消息是跨服务的，traceId 需要放到消息头或消息体里传递。以 RocketMQ 为例：

```java
// 发送消息时，把 traceId 放到消息属性
public void sendMessage(String topic, String body) {
    String traceId = MDC.get(TraceIdConstants.TRACE_ID_MDC_KEY);
    Message message = new Message(topic, body.getBytes(StandardCharsets.UTF_8));
    if (StrUtil.isNotBlank(traceId)) {
        message.putUserProperty(TraceIdConstants.TRACE_ID_HEADER, traceId);
    }
    rocketMQTemplate.syncSend(topic, message);
}

// 消费消息时，从消息属性取出 traceId 放入 MDC
@RocketMQMessageListener(topic = "order-topic", consumerGroup = "order-group")
public class OrderConsumer implements RocketMQListener<MessageExt> {

    @Override
    public void onMessage(MessageExt message) {
        String traceId = message.getUserProperty(TraceIdConstants.TRACE_ID_HEADER);
        if (!TraceIdUtil.isValid(traceId)) {
            traceId = TraceIdUtil.generateTraceId();
        }
        MDC.put(TraceIdConstants.TRACE_ID_MDC_KEY, traceId);
        try {
            // 消费逻辑
            String body = new String(message.getBody(), StandardCharsets.UTF_8);
            log.info("消费消息: {}", body);
        } finally {
            MDC.remove(TraceIdConstants.TRACE_ID_MDC_KEY);
        }
    }
}
```

* * *

## 六、与 Spring Cloud Sleuth / SkyWalking 的对比

### 6.1 方案对比

| 维度 | 手动实现 traceId | Spring Cloud Sleuth | SkyWalking |
| --- | --- | --- | --- |
| 实现成本 | 中等，需要写过滤器 | 低，引入依赖自动生效 | 中等，需要部署 Agent |
| traceId 生成 | 自己控制 | 自动生成（B3 格式） | 自动生成 |
| 日志集成 | 自己配置 MDC | 自动集成 MDC | 自动集成 |
| 链路可视化 | 无，只能靠日志搜 | 需配合 Zipkin | 自带 UI，功能强大 |
| 性能开销 | 极低 | 低 | 中等（Agent 埋点） |
| 侵入性 | 代码级侵入 | 依赖级侵入 | 无侵入（Agent） |
| 适用场景 | 简单链路追踪、自研体系 | Spring Cloud 生态 | 复杂微服务、需要可视化 |

### 6.2 选型建议

*   **简单项目、只需要日志 traceId**：手动实现就够了，轻量可控；
*   **Spring Cloud 生态、需要 Zipkin 可视化**：用 Sleuth，和 Gateway 集成好；
*   **中大型微服务、需要全链路拓扑和性能分析**：用 SkyWalking，功能最强大；
*   **混合方案**：用 SkyWalking 做全链路追踪，同时自己在网关生成 traceId 返回给前端，前端报错时可以直接用 traceId 去 SkyWalking 搜。

> 注意：如果用了 Sleuth 或 SkyWalking，它们会自动处理 traceId 传递，不需要自己写过滤器。但如果需要自定义 traceId 格式、或者需要把 traceId 返回给前端，还是需要做一些定制。

* * *

## 全文总结

全链路 traceId 传递，看起来就是"生成一个 ID，放到请求头里传下去"，但真正落地时处处是坑。

最核心的认知是： **Spring Cloud Gateway 是响应式的，传统的 ThreadLocal 方案直接失效**。必须用 Reactor Context 作为 traceId 的载体，配合 `doOnEach` 钩子同步到 MDC，才能保证日志里稳定打印 traceId。

在此基础上，还需要覆盖：

*   下游服务的接收和透传（Servlet 用 Filter，WebFlux 用 WebFilter）；
*   服务间调用的自动传递（RestTemplate/WebClient 拦截器）；
*   异步场景的 traceId 保持（TaskDecorator、Runnable 包装）；
*   MQ 消息的跨服务传递（消息属性）；
*   响应头返回给前端（排查问题的关键）。

把这些环节都覆盖到，才能真正实现"一次请求，全链路可追溯"。出了问题，拿一个 traceId，从网关到订单到库存到支付，所有服务的日志一键串联，排查效率从几小时降到几分钟。
