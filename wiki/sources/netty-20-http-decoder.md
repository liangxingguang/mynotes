---
id: wiki-source-netty-20-http-decoder
type: source
title: Netty源码分析(20) — Netty 与 HTTP 协议：HttpObjectDecoder 解析
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - source
  - java
  - netty
  - http
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-20-http-decoder.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-http-decoder.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-bytebuf.md
---
# Netty源码分析(20) — Netty 与 HTTP 协议：HttpObjectDecoder 解析

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 20 篇（第 19 篇未采集）。源码级拆解 `HttpObjectDecoder`（`io.netty.handler.codec.http` 包，Netty 4.1.x）：继承 `ByteToMessageDecoder`，用 `currentState` 成员变量持久化的有限状态机把 TCP 字节流解码为 HttpRequest/HttpResponse/HttpContent 对象。覆盖 decode() 主循环、起始行/头部逐行解析、chunked 编码解析（readRetainedSlice 零拷贝视图）、UPGRADED 状态（协议升级后停止 HTTP 解码）；附裸用 HttpObjectDecoder 的完整 HTTP 服务器示例与常见坑清单。

## Key Facts（关键事实）

- 默认限制：maxInitialLineLength 4096、maxHeaderSize 8192、maxChunkSize 8192；超限抛 TooLongHttpHeaderException 等异常。
- 状态机 12 态：SKIP_CONTROL_CHARS（跳前导 CRLF，处理持久连接粘包残留）→ READ_INITIAL（起始行）→ READ_HEADER（头部，遇空行结束）→ 按 Content-Length / Transfer-Encoding: chunked / 无长度分别进入 READ_FIXED_LENGTH_CONTENT / READ_CHUNK_SIZE 循环 / READ_VARIABLE_LENGTH_CONTENT（读到连接关闭）；另有 READ_CHUNKED_CONTENT、READ_CHUNK_DELIMITER、READ_CHUNK_TRAILING_HEADERS、BAD_MESSAGE、UPGRADED。
- decode() 非一次性：ByteToMessageDecoder 有新数据即反复调用，状态存成员变量天然支持 TCP 分片到达；一次 decode 可产出多个 HTTP 对象；`readableBefore == readableBytes()` 即数据不足退出循环。
- 头部解析细节：处理 HTTP/1.0 续行（空格/制表符开头追加到上一头部）；直接操作 readerIndex 偏移定位分割点，仅在需要时才建 String（零拷贝读头部）。
- chunked 解析：chunk-size 为十六进制、分号后为 chunk-extensions 需剥离；size=0 进 READ_CHUNK_TRAILING_HEADERS 结束；块数据用 `readRetainedSlice` 创建共享内存视图（零拷贝思想）。
- 产出碎片化消息序列：HttpRequest/HttpResponse（头部解析完即 out.add）+ 多个 HttpContent + LastHttpContent；业务侧通常配 HttpObjectAggregator 聚合成 FullHttpRequest/FullHttpResponse。
- UPGRADED 状态：WebSocket 等协议升级后 decode 循环终止、不再进行 HTTP 解码。
- 常见坑：① HttpContent 引用计数必须 release()（SimpleChannelInboundHandler 自动释放，ChannelInboundHandlerAdapter 须手动）；② `Expect: 100-continue` 需 Handler 自行响应 100 Continue，Netty 默认不处理；③ 大文件上传禁用聚合器（整body入内存 OOM），直接处理 HttpContent 流边收边写盘；④ URI 的 %20 编码需自行 URLDecoder。
- 性能考量：配合 PooledByteBufAllocator 与 DirectBuffer；Decoder 与 Channel 绑定串行处理（非线程安全但无需线程安全）；大 URI 需调大 maxInitialLineLength。
- 适用场景表（作者）：REST API 配聚合器；文件上传裸用；WebSocket 升级依赖其 UPGRADED 状态；反向代理/网关深层定制以它为基础。

## Important Claims（重要论断）

### Claim 1：状态机是协议解析的正确范式
作者论断：状态机天然支持分片到达（可停在任意状态等更多数据）、出错 reset() 即恢复、各状态逻辑独立避免巨型 if-else；写自己的协议解析器应先画状态转移图。

### Claim 2：HttpObjectDecoder 是 Netty HTTP 协议栈的心脏
作者论断：粘包/半包、Content-Length/chunked/不定长多编码、Keep-Alive 边界三类难题由一个状态机统一解决。

## Concepts Introduced（引入的概念）

- [[netty-http-decoder]]

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

补全 [[netty]] 实体分层架构中"协议层（HTTP）"的源码级机制证据；其"decode 反复调用 + 成员变量持久化状态"是 [[netty-channel-pipeline]] 中 ByteToMessageDecoder 模板方法模式的具体实例；readRetainedSlice 共享视图是 [[netty-bytebuf]] 零拷贝/引用计数体系的应用案例（随之带来 HttpContent release 纪律）。UPGRADED 状态为下一篇 WebSocket 协议升级（[[netty-21-websocket]]）埋下机制接口。

## Limitations（局限）

- 单一自媒体教程信源；源码片段为简化注解版（作者标注"参考源码 Netty 4.1.x"），个别字段名（如 chunkSizeRemaining/remainingChunkSize）在片段间不完全一致，属转述噪声。
- 系列第 19 篇未采集，系列连贯性有缺口。

## Related Knowledge（相关知识）

- [[netty-http-decoder]]（概念页）
- [[netty-21-websocket]]（同系列第 21 篇：UPGRADED 状态的消费方）
- [[netty-channel-pipeline]]（ByteToMessageDecoder 模板方法与责任链）
- [[netty-bytebuf]]（readRetainedSlice/引用计数）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-20-http-decoder.md`
