---
id: 2026-10-27-netty-vs-tomcat-undertow
title: Netty源码分析(番外篇8) — Netty vs Tomcat vs Undertow：HTTP服务器性能横评
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484730&idx=2&sn=a31d863ee0658feaa449c35ebbdcca19&chksm=fe6ca460c91b2d76db44ac3a72590fa7205915c745b9e7df0d746d14bbfa8eb47ba9a4bd1205#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-vs-tomcat-undertow.md
wiki_status: ingested
---

# Netty源码分析(番外篇8) — Netty vs Tomcat vs Undertow：HTTP服务器性能横评

> 同机同压测条件下用 wrk 对 Netty/Tomcat/Undertow 三个 HTTP 服务做横评：Netty QPS 15.8 万领先 Tomcat 约 77%，并从线程模型、内存管理、零拷贝、TCP 参数四个源码层面解释差距来源。

## 核心要点

- 基准数据（200 并发）：Netty 158K QPS / P99 3.8ms，Undertow 128K，Tomcat 90K / P99 8.5ms；1000 并发时 Tomcat 跌 23%，Netty 仅跌 8%
- 线程模型差异：Tomcat 一连接一线程（Executor 线性增长）；Undertow XNIO Worker 折中；Netty EventLoop 一对多复用 Channel，无排队不确定性
- 内存管理：Tomcat 60 秒压测 1287 次 YGC + 17 次 FGC 共 31.7 秒；Netty 池化堆外内存仅 158 次 YGC、零 FGC、共 2.3 秒，差 13 倍
- 零拷贝实战：响应体换 directBuffer 后 QPS 从 15.8 万升到 17.2 万（+9%）
- TCP 参数影响不容忽视：关 TCP_NODELAY QPS 暴跌 42%；Tomcat 对齐 TCP 参数可 +14%，但剩余差距仍来自线程模型与内存管理
- 选型建议：标准 Servlet 应用用 Tomcat，嵌入式选 Undertow，自研 RPC/网关/长连接选 Netty；快不是最大价值，Pipeline 可扩展性才是

## 正文

正文约 14000 字符，完整整理稿见附件 [[Assets/2026/10/netty-vs-tomcat-undertow.md]]，含三服务实现代码、压测数据表、GC 对比与源码层差异分析。

## 来源

[Netty源码分析(番外篇8) — Netty vs Tomcat vs Undertow：HTTP服务器性能横评](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484730&idx=2&sn=a31d863ee0658feaa449c35ebbdcca19&chksm=fe6ca460c91b2d76db44ac3a72590fa7205915c745b9e7df0d746d14bbfa8eb47ba9a4bd1205#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-vs-tomcat-undertow.md]]（抓取正文整理稿，browser 级抓取）
