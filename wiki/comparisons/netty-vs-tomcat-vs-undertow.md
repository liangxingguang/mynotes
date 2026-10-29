---
id: wiki-comparison-netty-vs-tomcat-vs-undertow
type: comparison
title: Netty vs Tomcat vs Undertow（HTTP 服务器性能横评）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - comparison
  - netty
  - java
  - performance
sources:
  - raw/sources/architecture/2026-10-27-netty-vs-tomcat-undertow.md
related:
  - wiki/entities/netty.md
  - wiki/sources/netty-vs-tomcat-undertow.md
  - wiki/concepts/reactor-thread-model.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/concepts/netty-zero-copy.md
  - wiki/concepts/netty-performance-tuning.md
---
# Netty vs Tomcat vs Undertow

## Scope（范围）

同机同配置（Xeon 8 核 / 16GB / OpenJDK 17.0.7 / CentOS Stream 9，wrk 4.2.0，200 并发 60 秒、三轮取中位数）下，Netty 4.1.100、内嵌 Tomcat 10.1、Undertow 2.3 三个 HTTP 服务的性能对比；业务逻辑统一为返回固定 JSON。对比维度含吞吐/延迟/GC/内存与线程模型、内存管理、零拷贝、TCP 参数四个源码层成因。单一自测评测信源，置信度中。

## Comparison Matrix（对比矩阵）

| Dimension（维度） | Netty | Tomcat | Undertow |
|---|---|---|---|
| Purpose（用途） | 自研 RPC/网关/长连接/自定义协议 | 标准 Servlet 应用（Spring MVC/Boot） | 嵌入式 HTTP 服务、灵活低级 API |
| Architecture（架构） | Reactor：EventLoop 一对多复用 Channel，无排队不确定性 | NioEndpoint 一连接一 Executor 线程，切换成本随并发线性增长 | XNIO Worker 线程池，IO 与业务同线程的折中方案 |
| QPS（200 并发） | 158,234（P99 3.8ms） | 89,567（P99 8.5ms） | 127,890（P99 4.9ms） |
| 高并发衰减（1000 并发） | -8%（145,800） | -23%（68,900） | -14%（110,200） |
| GC（60s 压测） | 158 次 YGC / 0 FGC / 2.3s | 1287 次 YGC / 17 FGC / 31.7s | 信源未给 |
| 内存占用 | 320MB（多为堆外，老年代 25%） | 480MB | 380MB |
| 优势 | 性能上限最高；Pipeline 可插拔扩展性 | 生态成熟、Servlet 标准、同步业务友好 | 轻量嵌入式；Worker 兼处理 IO 与少量计算 |
| 劣势 | 业务必须异步化、纪律要求高（release/不阻塞 EventLoop） | 堆内分配 GC 压力大；线程模型扩展性差 | 慢请求拖累同 Worker 上的其他请求 |

## Analysis（分析）

性能差距的四层归因（信源实测拆解）：

1. **线程模型**：Tomcat 一对一映射使上下文切换随并发线性增长（1000 并发跌 23% 的直接原因）；Netty 线程预先绑定一批 Channel，常驻循环不换出。
2. **内存管理**：Tomcat 响应体走堆内 `byte[]`/`String`，60 秒压测一半时间耗在 GC；Netty 池化堆外 ByteBuf + 引用计数近乎零堆内分配，GC 时间差约 13 倍。
3. **零拷贝**：响应体从 HeapBuffer 换 DirectBuffer，write 路径省一次堆内→堆外拷贝，QPS +9%（15.8 万→17.2 万）。
4. **TCP 参数**：Netty 默认配置更激进（TCP_NODELAY 开启等）。关 TCP_NODELAY QPS -42%；SO_BACKLOG 调 1024 使 P99 从 3.8ms 降至 2.9ms；Tomcat 对齐 TCP 参数后 +14%，仍远不及 Netty——说明参数只解释一部分差距。

作者结论（标注为信源论断）：Netty 快 = Reactor 模型 + 池化内存 + 零拷贝 + TCP 调优缺一不可；且"快"不是其最大价值，Pipeline 可扩展性才是。

## Best Fit（适用场景）

### Netty is preferable when（以下情况 Netty 更合适）

- 高并发 API 网关（数百至数千并发、低延迟）
- 即时通讯/长连接（WebSocket、TCP 长连接）
- 自定义协议（Dubbo、RocketMQ 类 RPC/消息中间件）
- 需精确控制内存的场景（游戏服务器、金融系统）

### Tomcat is preferable when（以下情况 Tomcat 更合适）

- 标准 Servlet 应用、团队熟悉 Servlet 规范
- 业务逻辑复杂且同步（DB 查询/RPC 调用会抹平线程模型差异）
- 快速开发优先，生态方案最丰富

### Undertow is preferable when（以下情况 Undertow 更合适）

- 嵌入式 HTTP 服务（比 Tomcat 轻量）
- 混合 IO 密集与计算密集负载
- 需要比 Tomcat 更灵活的低级 API

## Important Caveats（重要提醒）

- 单一自媒体信源的自测数据（三轮中位数），无第三方复现；极简 JSON 场景不代表真实业务。
- 信源给出的"真实建议"：日均百万请求以下的 Spring Boot 项目默认 Tomcat/Undertow 足够，无需纠结选型；认真选型通常意味着 QPS ≥ 5 万。
- 文中 GC 倍数存在"近 10 倍"与"13 倍"两种口径，按原始数字（31.7s vs 2.3s）应约为 13 倍（解读）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-27-netty-vs-tomcat-undertow.md`（压测配置、全部基准数字、GC 统计、零拷贝与 TCP 参数实测、选型建议）
