---
id: wiki-concept-netty-http-decoder
type: concept
title: Netty HTTP 解码状态机（HttpObjectDecoder）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - http
  - codec
sources:
  - raw/sources/architecture/2026-10-27-netty-20-http-decoder.md
related:
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-bytebuf.md
  - wiki/concepts/netty-websocket-upgrade.md
  - wiki/entities/netty.md
---
# Netty HTTP 解码状态机（HttpObjectDecoder）

## Definition（定义）

Netty HTTP 协议栈的核心解码器（`io.netty.handler.codec.http.HttpObjectDecoder`，抽象类，子类 HttpRequestDecoder/HttpResponseDecoder）：继承 `ByteToMessageDecoder`，以成员变量 `currentState` 持久化的有限状态机把 TCP 字节流解码为 HttpRequest/HttpResponse + HttpContent 碎片序列，统一解决粘包/半包、多编码方式与 Keep-Alive 边界问题。

## Why It Matters（为什么重要）

HTTP 看似简单，但 Keep-Alive 复用、chunked 编码、Content-Length 缺失让"消息边界在哪"成为解析难题；手写 if-else 解析器不可维护。HttpObjectDecoder 的状态机范式是 Netty 协议层（HTTP/HTTP2/WebSocket 握手阶段）的地基，也是自建二进制协议解码器的参照样板。

## Core Characteristics（核心特征）

1. **状态持久化抗分片**：decode() 被 ByteToMessageDecoder 反复调用，状态存成员变量而非栈上，天然支持 TCP 分片到达；buffer 无推进即退出等更多数据。
2. **12 态覆盖全场景**：SKIP_CONTROL_CHARS（粘包残留 CRLF）→ READ_INITIAL → READ_HEADER → 按头部三选一（固定长度/chunked 循环/不定长读到连接关闭）；UPGRADED 终止解码让位协议升级，BAD_MESSAGE 兜底。
3. **零拷贝解析**：头部直接操作 readerIndex 偏移定位、仅必要时建 String；chunked 块数据用 `readRetainedSlice` 共享内存视图。
4. **碎片化产出**：先出 HttpRequest/HttpResponse（头部完即发出），再出多个 HttpContent 与 LastHttpContent；完整性聚合职责交给 HttpObjectAggregator（选配）。
5. **安全限制内置**：起始行 4KB / 头部 8KB / chunk 8KB 默认上限，防恶意构造。

## Structure（结构）

`ByteToMessageDecoder.channelRead`（模板方法，累积缓冲）→ `HttpObjectDecoder.decode` 主循环（switch currentState）→ `readInitialLine/readHeaders/readChunkSize/readChunkedContent` 等状态处理 → `out.add(HttpObject)` → 下游 Handler / HttpObjectAggregator。

## How It Works（运作方式）

数据到达 → decode 循环：跳过前导控制字符 → 解析起始行建消息对象 → 逐行读头部至空行 → 头部读完立即 out.add 消息并按 Content-Length/Transfer-Encoding 决定消息体状态 → 逐块产出 HttpContent（chunked 时每块一个）→ LastHttpContent 收尾 → 回 SKIP_CONTROL_CHARS 处理同一连接上的下一个请求。出错 `reset()` 回初始状态。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-channel-pipeline]]：decode 由责任链 channelRead 驱动，ByteToMessageDecoder 是入站解码的模板方法基类。
- [[netty-bytebuf]]：readRetainedSlice 共享视图与引用计数纪律（HttpContent 必须 release）。
- [[netty-websocket-upgrade]]：UPGRADED 状态的消费方——WebSocket 握手后 HTTP 解码终止。

### Dependencies（依赖项）

- ByteToMessageDecoder 的累积缓冲与反复调用契约。

### Distinctions（区分）

- 与 LengthFieldBasedFrameDecoder 等二进制帧解码器的不同：HTTP 是文本协议，边界由 CRLF/头部语义/连接关闭多种信号共同决定，故用状态机而非单一长度字段。

## Evolution（演进）

- 2026-10-29：随教程第 20 篇建立（单信源）。

## Open Questions（开放问题）

- 与 HttpObjectAggregator 的边界（多大 body 该聚合、多大该流式）信源只给"大文件禁用聚合器"的定性结论，无量化阈值。
- HTTP/2 解码是否复用同一状态机思路，信源未涉及。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-20-http-decoder.md`（单一自媒体教程信源；源码为简化注解版，标注 Netty 4.1.x）

## Related Knowledge（相关知识）

- [[netty-20-http-decoder]]（信源页）
- [[netty-21-websocket]]（信源页：UPGRADED 状态落地）
- [[netty]]（实体页）
