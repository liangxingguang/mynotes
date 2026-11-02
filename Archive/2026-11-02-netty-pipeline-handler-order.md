---
id: 2026-11-02-netty-pipeline-handler-order
title: 一条消息的全程：pipeline 和 handler 到底谁先谁后
source: 微信公众号文章
source_url: https://mp.weixin.qq.com/s/6akSvZW-gEm_PZJMri2OfQ
source_type: article
platform: 微信公众号
created: 2026-11-02
category: 技术
tags:
  - netty
  - 工程实践
asset_ref: Assets/2026-11/netty-pipeline-handler-order.md
wiki_status: ingested
---

# 一条消息的全程：pipeline 和 handler 到底谁先谁后

> 摘要：Netty pipeline 是双向链——inbound 事件从 head 到 tail 正序传播，outbound 操作从 tail 到 head 逆序传播；ctx.write 只走当前 handler 之前的 outbound，channel.write 从 tail 走全链；write 只是入队、flush 才真正发出。编解码器必须加在业务 handler 的 head 一侧。附症状对照表、@Sharable 陷阱与三大常见坑（不往下传/忘释放/误用 channel.write）。

## 核心要点
- 双向链方向：inbound 进从头到尾（A→B→C），outbound 出从尾到头（C→B→A）
- `ctx.write` 从当前 handler 往前传；`channel.write` 从 tail 走完整条链
- write 只是入队缓冲，flush 才真正发出；批量写可先全部 write 再一次 flush
- 读路径三段：socket→ByteBuf、解码器切帧转对象、业务 handler；粘包半包在第二段解决
- `ByteToMessageDecoder` 带每连接累积缓冲，故不能加 `@Sharable`；有状态 handler 同理
- handler 阻塞会卡住整条 EventLoop 上的所有连接；耗时逻辑交给业务线程池，write 线程安全可跨线程
- 三大坑：忘 `fireChannelRead` 不往下传、忘 `release` ByteBuf、误以为 `channel.write` 只走自己后面
- 症状定位表：收到 ByteBuf 不是对象=解码器在后面；对端乱码=编码器位置不对/没加；写成功对端没反应=只 write 没 flush；响应串了=有状态 handler 加了 @Sharable

## 正文
全文见附件，4178 字，已完整抓取。

## 来源
- 原文：https://mp.weixin.qq.com/s/6akSvZW-gEm_PZJMri2OfQ

## 附件
[[Assets/2026-11/netty-pipeline-handler-order.md]]
