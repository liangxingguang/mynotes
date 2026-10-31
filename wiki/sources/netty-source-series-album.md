---
id: wiki-source-netty-source-series-album
type: source
title: Netty 源码系列合集（程序员行一，28 篇系列）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - digest
  - netty
  - java
  - resource
sources:
  - raw/sources/architecture/2026-10-28-netty-source-series-album.md
related:
  - wiki/entities/netty.md
  - wiki/sources/netty-source-reading-album.md
  - wiki/concepts/netty-hashed-wheel-timer.md
  - wiki/concepts/netty-graceful-shutdown.md
---
# Netty 源码系列合集（程序员行一，28 篇系列）

## Overview（概览）

公众号「程序员行一」的 Netty 源码系列合集页（album_id=1946733195882708993），28 篇成体系倒序排列（第 28 篇在前）：从 HTTP 编解码、优雅停机、IdleStateHandler、Selector 重建、Epoll/KQueue、HashedWheelTimer、Future/Promise、写缓冲背压、ByteToMessageDecoder 一路回溯到第 1 篇「什么是 Netty」。覆盖启动、线程模型、Pipeline、ByteBuf 内存池、写缓冲、编解码、异步结果、定时轮、原生传输。与本库已摄入的 [[netty-source-reading-album|Java解忧杂货铺 32 篇系列]]同题材不同作者，构成两套互补的 Netty 源码学习路线。

## Key Facts（关键事实）

- 28 篇全文已抓取并逐字收录于 `Assets/2026/10/netty-source-series-full.md`（211,834 字符 / 341,745 字节 UTF-8，含每篇原文链接）。
- 源码基线：Netty `netty-4.1.135.Final`，Commit `f05f765d81460799c53123a207f665bf3b465171`（各篇标注）。
- 合集页动态加载，单篇链接需进原页获取（每篇正文含原文链接）。
- 篇目覆盖（倒序）：28 HTTP 编解码 → 27 优雅停机 → 26 IdleStateHandler → 25 Selector 重建 → 24 Epoll/KQueue → 23 HashedWheelTimer → 22 Future/Promise → 21 写缓冲背压 → 20 ByteToMessageDecoder → 17 writeAndFlush → 16 入站读 → 14 Boss→Worker → 13 bind → 12 源码全景 → 11 内存管理 → 10 客户端启动 → 9 服务端启动 → 8 心跳重连 → 7 编解码原理 → 6 群聊 → 5 ByteBuf 详解 → 4 Netty 入门 → 3 架构核心名词 → 2 前置知识 → 1 什么是 Netty。

## Important Claims（重要论断）

（无——合集本身为采集件，各篇论断由各篇正文承载；本页仅登记全貌与增量价值）

## Concepts Introduced（引入的概念）

- [[netty-hashed-wheel-timer]]（新建概念：HashedWheelTimer 时间轮）
- [[netty-graceful-shutdown]]（新建概念：优雅停机 quiet period）
- 增量更新既有概念：[[netty-channelfuture]]、[[netty-idlestate-heartbeat]]、[[netty-http-decoder]]、[[netty-write-flush]]、[[netty-eventloop]]、[[netty-epoll-native-transport]]

## Entities Mentioned（提及的实体）

- [[netty]]
- 公众号「程序员行一」（单一自媒体信源，暂不立实体页）

## Implications（影响／启示）

- 本库 Netty 知识形成双信源体系：Java解忧杂货铺系列（32 篇，偏"教程式走读"，已全摄入）与程序员行一系列（28 篇，偏"单点源码深挖 + 排障场景"）。两套系列主题大量重叠但口径互补，互相印证多、矛盾少（解读）。
- 本轮仅摄入合集正文，新增 2 个概念页并增量更新 6 个既有概念页；字节内存池、编解码原理等重叠主题未重复开页，证据归入既有页面（解读）。

## Limitations（局限）

- 自媒体教程信源：作者自述的性能数字（如 Selector 重建、时间轮开销）未附压测环境与方法，作为论断时置信度受限。
- 合集页为动态接口数据，后续新增/删除篇目不在本信源内。
- 正文为抓取件，个别图表/图片无法保留。

## Related Knowledge（相关知识）

- [[netty-source-reading-album]]（同题材另一作者 32 篇系列索引）
- [[netty-hashed-wheel-timer]]、[[netty-graceful-shutdown]]（本轮新建概念）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-28-netty-source-series-album.md`
