---
id: wiki-source-netty-source-reading-album
type: source
title: Netty 源码阅读合集（Java解忧杂货铺，32 篇系列索引）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: low
tags:
  - source
  - digest
  - netty
  - java
  - resource
sources:
  - raw/sources/architecture/2026-10-27-netty-source-reading-album.md
related:
  - wiki/entities/netty.md
  - wiki/sources/jdk-source-reading-album.md
---
# Netty 源码阅读合集（Java解忧杂货铺，32 篇系列索引）

## Overview（概览）

公众号「Java解忧杂货铺」的 Netty 源码阅读系列合集页（album_id=4541345257556230156），经合集 JSON 接口抓取的 32 篇完整目录。本质是导航型索引，不含技术正文；其增量价值在于确认系列全貌与本库覆盖率——同公众号另有 [[jdk-source-reading-album|JDK 源码阅读合集]]（30 篇）。

## Key Facts（关键事实）

- 系列主线：入门（BIO/NIO 演进）→ 核心组件（Channel/Pipeline/ByteBuf/EventLoop/Bootstrap）→ 内存池化 → 连接与 IO（写缓冲/连接管理/心跳/重连）→ 协议支持（HTTP/WebSocket/SSL）→ 零拷贝/Native Transport/流量控制 → 异步结果模型 → RPC 实战 → 番外（调优、调试、设计模式、中间件应用、版本演进、Kafka、性能横评）。
- 作者编号不连续：编号 7、12~14、19、26、29、31、32 在合集中不存在（作者跳号或已删除）。
- 合集含两个同名「(30) RPC 实战」条目（msgid 4662 与 4651），为不同 msgid 的重复条目；本库摄入的是 msgid 4662 版（[[netty-30-rpc-framework]]）。
- 与本库已有笔记的关系：第 27 条（中间件应用）此前已单独采集摄入（[[netty-in-mainstream-middleware]]）。

## Important Claims（重要论断）

（无——纯目录索引，无论断性内容）

## Concepts Introduced（引入的概念）

（无——各篇仅有标题，正文由各单篇信源承载，不开概念页）

## Entities Mentioned（提及的实体）

- [[netty]]
- 公众号「Java解忧杂货铺」（单一自媒体信源，暂不立实体页）

## Implications（影响／启示）

- 目录确认本库 Netty 系列的覆盖状态：截至 2026-10-29，32 条中 31 条已摄入为 Wiki 信源页——番外篇8「Netty vs Tomcat vs Undertow 性能横评」已摄入（[[netty-vs-tomcat-undertow]]）；仅余合集内重复的「(30) RPC 实战」msgid 4651 版（不计划单独摄入，内容预期与 4662 版重复）（解读）。
- 与 JDK 合集构成同作者的「JDK + Netty」源码学习路线（解读）。

## Limitations（局限）

- 纯标题列表，无正文可核验；全部为同一公众号自产内容。
- 合集页为动态接口数据，后续新增/删除篇目不在本信源内。

## Related Knowledge（相关知识）

- 系列已摄入单篇：[[netty-01-intro]]、[[netty-02-bio-nio]]、[[netty-03-reactor]]、[[netty-04-channel-pipeline-handler]]、[[netty-05-bytebuf]]、[[netty-06-eventloop]]、[[netty-08-bootstrap]]、[[netty-09-nioeventloop-run]]、[[netty-10-pooled-allocator]]、[[netty-11-poolchunk-subpage]]、[[netty-15-write-flush]]、[[netty-16-connection-mgmt]]、[[netty-17-idlestate-heartbeat]]、[[netty-18-reconnect]]、[[netty-20-http-decoder]]、[[netty-21-websocket]]、[[netty-22-ssl-tls]]、[[netty-23-zero-copy]]、[[netty-24-epoll-native]]、[[netty-25-flow-control]]、[[netty-27-channelfuture]]、[[netty-28-promise]]、[[netty-30-rpc-framework]]、[[netty-perf-tuning]]、[[netty-debugging-guide]]、[[netty-in-mainstream-middleware]]、[[netty-gateway-scg]]、[[netty-design-patterns]]、[[netty-4-to-5]]、[[netty-kafka-network-layer]]、[[netty-vs-tomcat-undertow]]
- [[jdk-source-reading-album]]（同作者 JDK 源码阅读合集，30 篇）
- [[netty]]

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-source-reading-album.md`
