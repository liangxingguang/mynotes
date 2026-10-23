---
id: 2026-10-23-netty-million-connection-push-service
title: 基于Netty实现海量接入的推送服务技术要点
source: 52im.net（李林锋，原载 InfoQ）
source_url: http://www.52im.net/thread-166-1-1.html
source_type: 文章
platform: 52im.net
created: 2026-10-23
category: 技术
tags:
  - Java
  - netty
  - 工程实践
asset_ref: Assets/2026/10/netty-million-connection-push-service.md
wiki_status: ingested
---

# 基于Netty实现海量接入的推送服务技术要点

> 李林锋（《Netty权威指南》作者）的百万长连接推送服务调优清单。由一个真实案例切入：10 万长连接的 MQTT 服务"内存泄露"，实为 IdleStateHandler 空闲超时设 15 分钟导致 110 万个 ScheduledFutureTask 堆积进老年代——改 45 秒即愈，量级放大一切小问题。八大要点：① ulimit 句柄数调到百万级；② 防 CLOSE_WAIT 堆积（不在 I/O 线程跑业务/自定义 Task，Reactor 线程数取 [核数+1, 核数×2]，IdleStateHandler 回调时延必须可控）；③ 心跳周期权衡 NAT 超时（移动 2.5G 约 5 分钟释放空闲链路）与信令风暴，建议 180s（微信 300s）；④ 缓冲区按消息均值而非上限设置，用 AdaptiveRecvByteBufAllocator 动态伸缩（百万连接省 ~5G 内存）；⑤ PooledByteBufAllocator 内存池（Twitter 案例：垃圾生成降 5 倍，retain/release 必须成对）；⑥ 日志是隐形杀手——log4j AsyncAppender 队列满会同步阻塞 I/O 线程；⑦ TCP 调优：SO_SNDBUF/RCVBUF 设 32K + Linux RPS 软中断均衡（性能 +20%）；⑧ JVM 参数按内存模型计算 -Xmx、压 Full GC 频率。

## 核心要点

- **案例启示**：10 万连接 × 15 分钟空闲超时 = 110 万定时任务对象堆积——海量接入下没有"小问题"
- **CLOSE_WAIT 三防线**：业务逻辑离开 I/O 线程、自定义 Task 慎用 ioRatio、心跳回调不得有时延不可控操作（如发邮件告警）
- **心跳周期**：运营商 NAT 约 5 分钟释放空闲链路是下限，信令风暴是上限，180~300s 是实践区间
- **内存账**：固定 10K 缓冲 × 100 万连接 ≈ 多耗 5G；Adaptive 分配器用 CPU 换内存
- **内存池双刃剑**：PooledByteBufAllocator 去零填充省带宽、GC 压力大降，但泄漏不再被 GC 兜底
- **日志坑**：异步 Appender 队列满即同步阻塞——WIO 毛刺难以复现，编码时就要防
- **RPS**：按四元组 hash 把软中断均衡到多 CPU，≥2.6.35 内核免费午餐

## 正文

详见附件抓取正文（全文已收录，含 limits.conf/Netty 配置代码与 Twitter 内存池案例数据）。

## 来源

- [绝对干货：基于Netty实现海量接入的推送服务技术要点 - 52im.net](http://www.52im.net/thread-166-1-1.html)

## 附件

- [[Assets/2026/10/netty-million-connection-push-service.md]]
