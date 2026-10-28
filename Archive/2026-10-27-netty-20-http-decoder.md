---
id: 2026-10-27-netty-20-http-decoder
title: Netty源码分析(20) — Netty 与 HTTP 协议：HttpObjectDecoder 解析
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484592&idx=1&sn=6a91ff0a777288d923dad1f251f245e6&chksm=fe6ca5eac91b2cfc7c96db27c0de87566f7c7f1dc248423ff50fcf85b5a6c00e595bb4157e4a#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-20-http-decoder.md
wiki_status: ingested
---

# Netty源码分析(20) — Netty 与 HTTP 协议：HttpObjectDecoder 解析

> HttpObjectDecoder 是 Netty HTTP 协议栈的心脏，用有限状态机把 TCP 字节流解码为 HttpRequest/HttpResponse/HttpContent 对象，优雅解决粘包半包、chunked 编码、Keep-Alive 边界等解析难题。

## 核心要点

- 继承 ByteToMessageDecoder，decode() 被反复调用，用成员变量 currentState 持久化状态，天然支持 TCP 分片到达
- 状态机覆盖 SKIP_CONTROL_CHARS → READ_INITIAL → READ_HEADER → 按 Content-Length/chunked/不定长进入不同消息体读取状态，UPGRADED 用于 WebSocket 升级后停止 HTTP 解码
- chunked 解析用 readRetainedSlice 创建共享内存视图，体现零拷贝思想；头部解析直接操作 readerIndex 偏移定位
- 产出的是碎片化消息序列（请求行对象 + 多个 HttpContent + LastHttpContent），业务侧通常配 HttpObjectAggregator 聚合成 FullHttpRequest
- 常见坑：HttpContent 必须 release() 防内存泄漏、100 Continue 需手动响应、大文件上传不要用聚合器（OOM）、URI 的 %20 编码需自行 URLDecoder

## 正文

正文约 21000 字符，完整整理稿见附件 [[Assets/2026/10/netty-20-http-decoder.md]]，含 decode 主循环与 chunked 解析源码、状态机流程图及裸用 HttpObjectDecoder 的完整 HTTP 服务器示例。

## 来源

[Netty源码分析(20) — Netty 与 HTTP 协议：HttpObjectDecoder 解析](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484592&idx=1&sn=6a91ff0a777288d923dad1f251f245e6&chksm=fe6ca5eac91b2cfc7c96db27c0de87566f7c7f1dc248423ff50fcf85b5a6c00e595bb4157e4a#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-20-http-decoder.md]]（抓取正文整理稿，browser 级抓取）
