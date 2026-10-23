---
title: Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案
source: 微信公众号（服务端技术精选）
source_url: "https://mp.weixin.qq.com/s/FrrdoqLzrRCCa04JgtDGLQ"
source_type: link
platform: 微信
captured: 2026-10-20
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-20-spring-cloud-gateway-advanced.md
asset_ref: Assets/2026/10/spring-cloud-gateway-advanced.md
---

# Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案

# Spring Cloud Gateway 高级玩法：动态路由、请求日志、限流、灰度发布全方案

> 抓取正文（web-fetch, browser 级）。原始出处：https://mp.weixin.qq.com/s/FrrdoqLzrRCCa04JgtDGLQ（公众号：服务端技术精选）
>
> 注：原文代码块抓取时被压成单行，已按语义重排。

微服务架构越来越复杂，API网关成了整个系统的咽喉要道，传统的静态路由配置已经无法满足日益增长的业务需求。今天就来聊聊Spring Cloud Gateway的高级玩法，让你掌握动态路由、请求日志、限流、灰度发布等全套技能！

## 一、为什么需要Spring Cloud Gateway？

### 1.1 微服务架构的挑战

随着业务的发展，微服务数量急剧增加，带来了新的挑战：

1. **服务发现**：如何知道每个服务的位置？
2. **负载均衡**：如何合理分配请求？
3. **安全控制**：如何统一进行身份验证？
4. **流量控制**：如何防止系统被突发流量冲垮？
5. **监控追踪**：如何跟踪一个请求的完整链路？

### 1.2 Spring Cloud Gateway的优势

Spring Cloud Gateway作为Spring官方推出的API网关，相比Zuul有以下优势：

1. **基于Reactor模型**：异步非阻塞，性能更优
2. **支持WebSocket**：更好的实时通信支持
3. **精细化路由**：支持谓词和过滤器组合
4. **易于扩展**：良好的插件化设计

## 二、动态路由配置

静态路由配置虽然简单，但在生产环境中显得不够灵活。

### 2.1 动态路由的核心思想

动态路由允许我们在不重启网关的情况下修改路由规则，这对于频繁变更的业务场景非常有用。

```yaml
# application.yml - 静态路由配置示例
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/user/**
          filters:
            - StripPrefix=1
```

### 2.2 基于数据库的动态路由实现

```java
@Component
public class DynamicRouteService {

    @Autowired
    private RouteDefinitionWriter routeDefinitionWriter;

    /** 添加路由 */
    public String addRoute(RouteDefinition definition) {
        try {
            routeDefinitionWriter.save(Mono.just(definition)).subscribe();
            // 发布事件通知网关刷新路由
            publisher.publishEvent(new RefreshRoutesEvent(this));
            return "路由添加成功";
        } catch (Exception e) {
            return "路由添加失败：" + e.getMessage();
        }
    }

    /** 更新路由 */
    public String updateRoute(RouteDefinition definition) {
        try {
            routeDefinitionWriter.delete(Mono.just(definition.getId()));
            routeDefinitionWriter.save(Mono.just(definition)).subscribe();
            publisher.publishEvent(new RefreshRoutesEvent(this));
            return "路由更新成功";
        } catch (Exception e) {
            return "路由更新失败：" + e.getMessage();
        }
    }

    /** 删除路由 */
    public String deleteRoute(String id) {
        try {
            routeDefinitionWriter.delete(Mono.just(id)).subscribe();
            publisher.publishEvent(new RefreshRoutesEvent(this));
            return "路由删除成功";
        } catch (Exception e) {
            return "路由删除失败：" + e.getMessage();
        }
    }
}
```

### 2.3 路由配置实体类

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GatewayRouteDefinition {
    private String id;                                   // 路由ID
    private String uri;                                  // 路由URI
    private List<GatewayPredicateDefinition> predicates; // 谓词定义
    private List<GatewayFilterDefinition> filters;       // 过滤器定义
    private Integer order = 0;                           // 路由排序
    private Boolean enabled = true;                      // 是否启用
}
```

### 2.4 数据库表设计

```sql
CREATE TABLE `gateway_route` (
  `id` varchar(64) NOT NULL COMMENT '路由ID',
  `route_name` varchar(128) NOT NULL COMMENT '路由名称',
  `uri` varchar(256) NOT NULL COMMENT '路由URI',
  `predicates` text NOT NULL COMMENT '谓词定义(JSON)',
  `filters` text COMMENT '过滤器定义(JSON)',
  `order_num` int DEFAULT '0' COMMENT '排序',
  `enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用(0-否,1-是)',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网关路由表';
```

## 三、请求日志记录

### 3.1 自定义全局过滤器记录请求日志

```java
@Component
@Slf4j
public class RequestLogGlobalFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        long startTime = System.currentTimeMillis();

        String requestId = UUID.randomUUID().toString();
        String method = request.getMethodValue();
        String url = request.getURI().toString();
        String clientIp = getClientIp(request);

        log.info("[{}] {} {} from {}", requestId, method, url, clientIp);

        return chain.filter(exchange).then(
            Mono.fromRunnable(() -> {
                long duration = System.currentTimeMillis() - startTime;
                ServerHttpResponse response = exchange.getResponse();
                HttpStatus statusCode = response.getStatusCode();
                log.info("[{}] {} {} completed with status {} in {} ms",
                        requestId, method, url, statusCode, duration);
            })
        );
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    /** 获取客户端真实IP */
    private String getClientIp(ServerHttpRequest request) {
        HttpHeaders headers = request.getHeaders();
        String ip = headers.getFirst("X-Forwarded-For");
        if (ip != null && ip.length() != 0 && !"unknown".equalsIgnoreCase(ip)) {
            if (ip.contains(",")) {
                ip = ip.split(",")[0];
            }
        } else {
            ip = headers.getFirst("X-Real-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddress().getAddress().getHostAddress();
        }
        return ip;
    }
}
```

### 3.2 记录请求体和响应体

对于POST、PUT等请求，我们还需要记录请求体和响应体内容：

```java
@Component
@Slf4j
public class RequestBodyLogFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String contentType = request.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE);
        if (contentType != null &&
            (contentType.contains("application/json") ||
             contentType.contains("application/x-www-form-urlencoded"))) {

            // 包装请求以缓存body
            return DataBufferUtils.join(request.getBody())
                .flatMap(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    String requestBody = new String(bytes, StandardCharsets.UTF_8);
                    log.debug("Request Body: {}", requestBody);

                    // 重新构造请求
                    Flux<DataBuffer> cachedFlux = Flux.defer(() -> {
                        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
                        return Mono.just(buffer);
                    });

                    ServerHttpRequest mutatedRequest = new ServerHttpRequestDecorator(request) {
                        @Override
                        public Flux<DataBuffer> getBody() {
                            return cachedFlux;
                        }
                    };

                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                });
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }
}
```

## 四、限流策略

### 4.1 基于Redis的令牌桶算法限流

```java
@Component
@Slf4j
public class RedisRateLimiterFilter implements GlobalFilter, Ordered {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    /** 限流配置 key: 路由ID, value: [限流数量, 时间窗口(秒)] */
    private Map<String, int[]> rateLimitConfig = new HashMap<>();

    public RedisRateLimiterFilter() {
        rateLimitConfig.put("user-service", new int[]{100, 60});  // 每分钟100次
        rateLimitConfig.put("order-service", new int[]{50, 60});  // 每分钟50次
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        String routeId = getRouteIdByPath(path);
        if (routeId == null) {
            return chain.filter(exchange);
        }

        int[] config = rateLimitConfig.get(routeId);
        if (config == null) {
            return chain.filter(exchange);
        }

        int limit = config[0];
        int window = config[1];

        String clientIp = getClientIp(request);
        String key = "rate_limit:" + routeId + ":" + clientIp;

        // 使用Lua脚本实现原子性限流
        String script =
            "local current = redis.call('GET', KEYS[1])\n" +
            "if current == false then\n" +
            "  redis.call('SET', KEYS[1], 1)\n" +
            "  redis.call('EXPIRE', KEYS[1], ARGV[2])\n" +
            "  return 1\n" +
            "else\n" +
            "  current = tonumber(current)\n" +
            "  if current < tonumber(ARGV[1]) then\n" +
            "    redis.call('INCR', KEYS[1])\n" +
            "    return current + 1\n" +
            "  else\n" +
            "    return -1\n" +
            "  end\n" +
            "end";

        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptText(script);
        redisScript.setResultType(Long.class);

        return redisTemplate.execute(redisScript, Collections.singletonList(key),
                                   String.valueOf(limit), String.valueOf(window))
            .flatMap(result -> {
                if (result > 0) {
                    return chain.filter(exchange);   // 未超过限流阈值
                } else {
                    // 超过限流阈值，返回429状态码
                    ServerHttpResponse response = exchange.getResponse();
                    response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                    String data = "{\"code\":429,\"message\":\"请求过于频繁，请稍后再试\"}";
                    DataBuffer buffer = response.bufferFactory().wrap(data.getBytes(StandardCharsets.UTF_8));
                    response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
                    return response.writeWith(Mono.just(buffer));
                }
            });
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 2;
    }

    private String getRouteIdByPath(String path) {
        if (path.startsWith("/user")) {
            return "user-service";
        } else if (path.startsWith("/order")) {
            return "order-service";
        }
        return null;
    }

    private String getClientIp(ServerHttpRequest request) {
        // 实现同上...
        return "127.0.0.1";
    }
}
```

### 4.2 基于Sentinel的限流

除了自定义实现，我们还可以集成阿里巴巴的Sentinel来实现更强大的限流功能：

```xml
<!-- pom.xml 添加依赖 -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

```yaml
# application.yml 配置
spring:
  cloud:
    sentinel:
      transport:
        dashboard: localhost:8080
      filter:
        enabled: true
      # 关闭URL路径聚合，确保每个API独立限流
      http-method-specify: true
```

```java
@Component
public class SentinelGatewayConfiguration {

    @PostConstruct
    public void initGatewayRules() {
        Set<GatewayFlowRule> rules = new HashSet<>();

        rules.add(new GatewayFlowRule("user-service")
            .setCount(100)          // 限流阈值
            .setIntervalSec(60)     // 时间窗口
            .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT)
            .setMaxQueueingTimeMs(1000));  // 最大排队等待时间

        rules.add(new GatewayFlowRule("order-service")
            .setCount(50)
            .setIntervalSec(60)
            .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT)
            .setMaxQueueingTimeMs(1000));

        GatewayRuleManager.loadRules(rules);
    }
}
```

## 五、灰度发布策略

### 5.1 基于请求头的灰度发布

```java
@Component
@Slf4j
public class GrayReleaseFilter implements GlobalFilter, Ordered {

    /** 灰度发布配置 key: 服务名, value: 灰度版本权重 (0-100) */
    private Map<String, Integer> grayConfig = new HashMap<>();

    public GrayReleaseFilter() {
        grayConfig.put("user-service", 20);   // 20%流量进入灰度版本
        grayConfig.put("order-service", 10);  // 10%流量进入灰度版本
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        String serviceName = getServiceNameByPath(path);
        if (serviceName == null) {
            return chain.filter(exchange);
        }

        Integer grayWeight = grayConfig.get(serviceName);
        if (grayWeight == null || grayWeight <= 0) {
            return chain.filter(exchange);
        }

        // 检查是否有强制灰度的请求头
        String grayHeader = request.getHeaders().getFirst("X-Gray-Version");
        if ("true".equals(grayHeader)) {
            ServerHttpRequest.Builder builder = request.mutate();
            builder.header("X-Gray-Version", "true");
            return chain.filter(exchange.mutate().request(builder.build()).build());
        }

        // 根据权重随机决定是否进入灰度版本
        Random random = new Random();
        int randomValue = random.nextInt(100);
        if (randomValue < grayWeight) {
            ServerHttpRequest.Builder builder = request.mutate();
            builder.header("X-Gray-Version", "true");
            log.info("Routing to gray version for service: {}, weight: {}", serviceName, grayWeight);
            return chain.filter(exchange.mutate().request(builder.build()).build());
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 3;
    }

    private String getServiceNameByPath(String path) {
        if (path.startsWith("/user")) {
            return "user-service";
        } else if (path.startsWith("/order")) {
            return "order-service";
        }
        return null;
    }
}
```

### 5.2 基于用户标签的灰度发布

```java
@Component
@Slf4j
public class UserTagGrayFilter implements GlobalFilter, Ordered {

    @Autowired
    private UserService userService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String userId = getUserIdFromRequest(request);
        if (userId == null) {
            return chain.filter(exchange);
        }

        Set<String> userTags = userService.getUserTags(userId);
        if (userTags == null || userTags.isEmpty()) {
            return chain.filter(exchange);
        }

        if (userTags.contains("gray")) {
            ServerHttpRequest.Builder builder = request.mutate();
            builder.header("X-User-Tag", "gray");
            log.info("Routing gray user: {}", userId);
            return chain.filter(exchange.mutate().request(builder.build()).build());
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 4;
    }

    private String getUserIdFromRequest(ServerHttpRequest request) {
        // 从token或cookie中解析用户ID
        String token = request.getHeaders().getFirst("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            return parseUserIdFromToken(token.substring(7));
        }
        return null;
    }

    private String parseUserIdFromToken(String token) {
        try {
            return "user_" + token.hashCode();   // 简化实现，实际应该使用JWT库
        } catch (Exception e) {
            return null;
        }
    }
}
```

## 六、完整配置示例

```yaml
server:
  port: 8080

spring:
  application:
    name: api-gateway

  redis:
    host: localhost
    port: 6379
    database: 0

  cloud:
    gateway:
      # 全局cors配置
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods: "*"
            allowedHeaders: "*"

      # 默认过滤器
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin
        - name: Retry
          args:
            retries: 3
            statuses: BAD_GATEWAY

      # 路由配置
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/user/**
          filters:
            - StripPrefix=1
            - name: Hystrix
              args:
                name: user-service
                fallbackUri: forward:/fallback/user

        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/order/**
          filters:
            - StripPrefix=1
            - name: Hystrix
              args:
                name: order-service
                fallbackUri: forward:/fallback/order

        - id: product-service
          uri: lb://product-service
          predicates:
            - Path=/product/**
          filters:
            - StripPrefix=1

  # Sentinel配置
  sentinel:
    transport:
      dashboard: localhost:8080
    eager: true

# 日志配置
logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    com.example.gateway.filter: DEBUG
```

## 七、监控与告警

### 7.1 Prometheus指标收集

```java
@Component
public class GatewayMetricsCollector {

    private final Counter requestCounter;
    private final Timer requestTimer;
    private final Gauge activeRequestsGauge;

    public GatewayMetricsCollector(MeterRegistry meterRegistry) {
        requestCounter = Counter.builder("gateway_requests_total")
            .description("Total requests through gateway")
            .register(meterRegistry);

        requestTimer = Timer.builder("gateway_request_duration_seconds")
            .description("Request duration through gateway")
            .register(meterRegistry);

        activeRequestsGauge = Gauge.builder("gateway_active_requests")
            .description("Active requests through gateway")
            .register(meterRegistry, new AtomicInteger(0));
    }

    public void recordRequest(String routeId, String method, int status, long duration) {
        requestCounter.increment(
            Tags.of(
                "route", routeId,
                "method", method,
                "status", String.valueOf(status)
            )
        );
        requestTimer.record(duration, TimeUnit.MILLISECONDS);
    }
}
```

### 7.2 告警规则配置

```yaml
# prometheus告警规则
groups:
  - name: gateway.rules
    rules:
      - alert: HighErrorRate
        expr: rate(gateway_requests_total{status=~"5.."}[5m]) / rate(gateway_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Gateway error rate is above 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(gateway_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "Gateway 95th percentile latency is above 2 seconds"
```

## 八、最佳实践总结

### 8.1 性能优化建议

1. **合理设置线程池大小**

```yaml
server:
  undertow:
    io-threads: 4
    worker-threads: 20
```

2. **启用HTTP/2**

```yaml
server:
  http2:
    enabled: true
```

3. **配置连接池**

```yaml
spring:
  cloud:
    gateway:
      httpclient:
        pool:
          max-idle-time: 30s
          max-life-time: 60s
```

### 8.2 安全加固

1. **请求大小限制**

```yaml
spring:
  codec:
    max-in-memory-size: 10MB
```

2. **防止重放攻击**

```java
@Component
public class ReplayAttackFilter implements GlobalFilter, Ordered {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String timestamp = request.getHeaders().getFirst("X-Timestamp");
        String signature = request.getHeaders().getFirst("X-Signature");

        if (timestamp == null || signature == null) {
            return unauthorizedResponse(exchange);
        }

        // 检查时间戳有效性（5分钟内有效）
        long now = System.currentTimeMillis();
        long reqTime = Long.parseLong(timestamp);
        if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
            return unauthorizedResponse(exchange);
        }

        // 检查签名是否已使用
        String signKey = "signature:" + signature;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(signKey))) {
            return unauthorizedResponse(exchange);
        }

        // 记录签名，5分钟内不可重复使用
        redisTemplate.opsForValue().set(signKey, "1", Duration.ofMinutes(5));

        return chain.filter(exchange);
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        String data = "{\"code\":401,\"message\":\"请求无效\"}";
        DataBuffer buffer = response.bufferFactory().wrap(data.getBytes(StandardCharsets.UTF_8));
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
```

## 九、常见问题与解决方案

### 9.1 网关启动慢

问题原因：默认情况下会加载所有路由配置，当路由较多时会影响启动速度。

```yaml
spring:
  cloud:
    gateway:
      eager-load:
        enabled: false
```

### 9.2 跨域问题

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods: "*"
            allowedHeaders: "*"
            allowCredentials: true
```

### 9.3 文件上传失败

问题现象：上传大文件时出现连接断开或超时。

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 100MB
      max-request-size: 100MB

  codec:
    max-in-memory-size: 100MB
```

## 结语

Spring Cloud Gateway作为新一代API网关，在微服务架构中发挥着重要作用。通过动态路由、请求日志、限流、灰度发布等功能的合理运用，我们可以构建出高性能、高可用、易维护的网关系统。掌握了这些高级玩法，相信你在面对复杂的微服务架构时会更加从容。记住，技术的价值在于解决实际问题，只有结合具体业务场景，才能发挥出最大的威力！
