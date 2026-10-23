---
title: SpringBoot 结构化日志实战
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/0iAUApAJQCJKfn02SbbYOw"
source_type: link
platform: weixin
captured: 2026-10-23
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-23-springboot-structured-logging.md
asset_ref: Assets/2026/10/springboot-structured-logging.md
---

# SpringBoot 结构化日志实战

# SpringBoot结构化日志实战

> 采集自微信公众号：https://mp.weixin.qq.com/s/0iAUApAJQCJKfn02SbbYOw

凌晨三点被叫起来查线上问题，第一件事永远是翻日志。可纯文本日志查起来实在折磨人——grep 一个关键字，出来几十行，每行的字段位置还不固定，得靠肉眼一行行对齐时间戳、级别、线程名。等把上下文拼出来，天都快亮了。

结构化日志干的就是这件事：把每一条日志输出成固定的 JSON，字段清清楚楚，直接扔进日志平台就能按任意字段过滤、聚合。Spring Boot 从 3.4 开始把这个能力做进了内置配置，不用再手动拼 JSON 或引第三方依赖。

## 两行配置切到 JSON

先确认用的是 Logback（Spring Boot 默认的日志系统），然后在 `application.yml` 里加一行：

`logging:   structured:     format:       console: ecs`

重启后，一条 `log.info("处理订单 {}", orderId)` 输出的就不是纯文本了，而是类似这样的结构：

`{"@timestamp":"2026-09-02T01:00:00.000Z","log.level":"INFO",  "process.pid":1234,"process.thread.name":"http-nio-8080-exec-1",  "message":"处理订单 8848","service.name":"order-service"}`

`ecs` 是 Elastic 通用 Schema，字段名自带命名空间（`log.level`、`process.pid`），能直接进 ELK 或 OpenSearch。不想要 ECS 风格的话，把 `ecs` 换成 `logstash` 就得到另一套字段命名。文件输出同样支持，把 `console` 改成 `file` 加个路径即可。

## 把上下文塞进去

日志光有固定结构还不够，真正值钱的是能把业务上下文带进去。Spring Boot 结构化日志会自动把 MDC 里的键值对序列化成 JSON 字段：

`import org.slf4j.MDC;  @GetMapping("/orders/{id}") public Order get(@PathVariable Long id) {     MDC.put("orderId", String.valueOf(id));     MDC.put("traceId", requestId());     log.info("查询订单");     // 记得清理，线程池复用会串数据     MDC.clear();     return order; }`

这条日志输出后，`orderId` 和 `traceId` 就是 JSON 里的独立字段，排查某个订单的完整链路时直接按 `orderId` 过滤，不用再靠正则从 message 里抠。配合链路追踪组件（比如 Micrometer Tracing）把 traceId 灌进 MDC，日志和调用链就串起来了。

这里有个容易忽略的坑：MDC 是 ThreadLocal 实现的，Servlet 线程池里如果不 `clear()`，下一个请求会继承上一个请求的残留字段。要么 finally 里清，要么用拦截器统一收尾，别指望容器帮你兜。

## 自定义输出格式

内置的 `ecs` 和 `logstash` 够用大多数场景，但公司日志规范往往有自己的字段名，这时就自定义 formatter。实现一个 `StructuredLogFormatter`，Spring Boot 会自动发现并接管：

`import ch.qos.logback.classic.spi.ILoggingEvent; import org.springframework.boot.logging.structured.StructuredLogFormatter;  public class CompanyFormatter implements StructuredLogFormatter<ILoggingEvent> {     @Override     public String format(ILoggingEvent event) {         return "{\"ts\":\"" + event.getTimeStamp()             + "\",\"lvl\":\"" + event.getLevel()             + "\",\"msg\":\"" + escape(event.getFormattedMessage()) + "\"}\n";     }      private String escape(String s) {         return s.replace("\\", "\\\\").replace("\"", "\\\"");     } }`

把它声明成一个 `@Component`，配置里 `logging.structured.format.console` 会保持 `ecs` 或写别的都行——只要有一个 `StructuredLogFormatter<ILoggingEvent>` 类型的 Bean 存在，Spring Boot 就优先用它。异常堆栈、MDC 字段想一起塞进去，得自己在 `format` 里取 `event.getMDCPropertyMap()` 和 `event.getThrowableProxy()`，这里不展开。

## 落地时的一点建议

切结构化日志别一口气全切，先让新服务上 JSON，老服务保持纯文本，观察一段时间。日志平台那边，人类可读的纯文本其实还有保留价值——本地开发时没人愿意对着转义过的 JSON 字符串一行行看。一个折中的做法是：生产环境开 JSON，本地开发用默认 pattern，靠 profile 区分。

再者，字段不是越多越好。MDC 里随手塞十几个字段，日志体积会肉眼可见地膨胀，存储成本跟着涨。挑真正用于过滤和关联的几个字段——traceId、订单号、用户维度，剩下的让日志平台自己解析。

结构化日志这东西，配置本身简单得不像话，难的是想清楚你要用它查什么。想明白了，凌晨三点的问题就能从"翻半天日志"变成"一个过滤条件解决"。

参考：

* Spring Boot 结构化日志文档：https://docs.spring.io/spring-boot/how-to/logging.html
