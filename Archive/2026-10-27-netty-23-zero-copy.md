---
id: 2026-10-27-netty-23-zero-copy
title: Netty源码分析(23) — 零拷贝机制详解
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484607&idx=1&sn=ab05acab1098719909f8d4a894ed7bb5&chksm=fe6ca5e5c91b2cf38784a3fc4b9b5b43556004c973f8b8e8beda861f1d5a69491d0fa0bd0fe9#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-23-zero-copy.md
wiki_status: ingested
---

# Netty源码分析(23) — 零拷贝机制详解

> 零拷贝的本质是让 CPU 不参与数据搬运。Netty 提供四大零拷贝兵器：FileRegion(sendfile)、CompositeByteBuf、Unpooled.wrappedBuffer、DirectBuffer+内存映射，分别覆盖文件传输、逻辑合并、数组包装、堆外读写四类场景。

## 核心要点

- 传统文件传输经历 4 次拷贝 + 4 次上下文切换；sendfile 将其压缩为 2 次 DMA 拷贝，磁盘直达网卡不经过用户空间
- DefaultFileRegion 委托 FileChannel.transferTo（底层即 Linux sendfile），NioSocketChannel 的 doWrite 对 FileRegion 走专门零拷贝分支
- CompositeByteBuf 用 Component 数组做逻辑拼接（持有引用不拷数据），按 index 二分查找定位，O(log n) 开销实现「协议头+体」零拷贝组装
- Unpooled.wrappedBuffer 直接包装 byte[]/MappedByteBuffer 不复制；DirectByteBuf 用堆外内存规避 JVM 堆与 native 堆间拷贝
- 注意：FileRegion 单次使用不可复用、Pipeline 中编解码器遇 FileRegion 要跳过、sendfile 是 Linux 特性 Windows 会 fallback、小文件场景零拷贝收益有限

## 正文

正文约 16000 字符，完整整理稿见附件 [[Assets/2026/10/netty-23-zero-copy.md]]，含 FileRegion/CompositeByteBuf/wrappedBuffer 源码解析、传统拷贝与 sendfile 数据路径对比图及大文件传输、消息组装等完整示例。

## 来源

[Netty源码分析(23) — 零拷贝机制详解](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484607&idx=1&sn=ab05acab1098719909f8d4a894ed7bb5&chksm=fe6ca5e5c91b2cf38784a3fc4b9b5b43556004c973f8b8e8beda861f1d5a69491d0fa0bd0fe9#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-23-zero-copy.md]]（抓取正文整理稿，browser 级抓取）
