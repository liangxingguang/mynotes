---
id: 2026-10-27-netty-04-channel-pipeline-handler
title: Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483934&idx=1&sn=9c175b4c2275a9fd373d8c0f1796c95e&chksm=fe6ca344c91b2a520287802d7341a8acb54949ff11cc24825350287dace4e1fe1e41990df886#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-04-channel-pipeline-handler.md
wiki_status: ingested
---

# Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客

> 剖析 Netty 三大核心组件：Channel 代表连接，ChannelPipeline 是以 head/tail 为端点的双向链表（节点为 ChannelHandlerContext），ChannelHandler 承载业务逻辑。重点讲透入站事件 Head→Tail 正向传播、出站事件 Tail→Head 反向传播的机制，Handler 生命周期，以及 ctx.write 与 channel.write 的路径差异。

## 核心要点

- DefaultChannelPipeline 底层是双向链表，HeadContext 管底层 IO、TailContext 是入站终点，addLast 即尾插法
- 每个 Context 带 inbound/outbound 标志，事件传播时沿 next/prev 指针跳过不匹配的节点
- 入站事件（fireChannelRead）从 head 正向走到 tail；出站事件（write）从 tail 反向走到 head 写入 Socket
- Handler 回调里不调 ctx.fireXxx() 事件传播就中断，是新手最常犯的错
- channel.write 从 tail 出发经过所有出站 handler，ctx.write 从当前节点的下一个出站 handler 出发，路径不同
- SimpleChannelInboundHandler 自动释放 ByteBuf；用 ChannelInboundHandlerAdapter 必须手动 release 否则内存泄漏

## 正文

正文约 10400 字符，完整整理稿见附件 [[Assets/2026/10/netty-04-channel-pipeline-handler.md]]，含 Pipeline 链表/addLast/事件查找源码、Handler 接口体系与生命周期示例，及三 Handler 演示事件传播的完整服务端。

## 来源

[Netty源码分析(4) — Channel、ChannelPipeline与ChannelHandler三剑客](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483934&idx=1&sn=9c175b4c2275a9fd373d8c0f1796c95e&chksm=fe6ca344c91b2a520287802d7341a8acb54949ff11cc24825350287dace4e1fe1e41990df886#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-04-channel-pipeline-handler.md]]（抓取正文整理稿，browser 级抓取）
