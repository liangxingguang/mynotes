---
id: wiki-source-netty-pipeline-handler-order
type: source
title: 一条消息的全程：pipeline 和 handler 到底谁先谁后
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - source
  - java
  - netty
  - pipeline
  - troubleshooting
sources:
  - raw/sources/architecture/2026-11-02-netty-pipeline-handler-order.md
related:
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-write-flush.md
  - wiki/concepts/netty-eventloop.md
  - wiki/entities/netty.md
---
# 一条消息的全程：pipeline 和 handler 到底谁先谁后

## Overview（概览）

公众号实操科普文（约 4178 字）：用一条消息的完整旅程讲清 Netty pipeline 双向链的方向规则——inbound 进从头到尾、outbound 出从尾到头，ctx.write 与 channel.write 的起点差异，write 只是入队而 flush 才真正发出；并给出顺序错误的五条症状对照表、@Sharable 有状态复用陷阱、handler 阻塞 EventLoop 的代价与三大常见坑。与源码级信源（netty-04）互证，把机制落到排障直觉。

## Key Facts（关键事实）

- **双向链方向**：inbound 事件从 head 到 tail 按添加顺序正序传播；outbound 操作从 tail 到 head 逆序传播（addLast(A,B,C)：读 A→B→C，写从 C 往前经 B、A 到 head）。
- **起点差异**：`ctx.write` 从当前 handler 往前传（只经过前面的 outbound）；`channel.write` 从 tail 走完整条链。
- **write≠flush**：write 只是把消息放进缓冲区，flush 才真正发出；writeAndFlush 是两个动作合并；只 write 不 flush 对端什么都收不到。
- **批量写习惯**：一次写多条消息时先全部 write 再一次 flush，比每条 writeAndFlush 少很多次系统调用（批量推送场景差别明显）。
- **读路径三段**：socket→ByteBuf（第一步）→ 解码器切帧转对象（第二步，粘包半包在此解决）→ 业务 handler（第三步）；登录包 20 字节例子演示长度字段解码器的累积缓冲（只到 12 字节时留在缓冲不往下传）。
- **编解码器位置**：两个方向都要求编解码器位于业务 handler 的 head 一侧；习惯写法「编解码器先加，业务 handler 最后加」。
- **@Sharable 前提**：handler 默认每 Channel 新建实例；@Sharable 允许所有连接共用同一实例但必须无状态；有状态数据放 Channel attribute 或消息对象。
- **EventLoop 阻塞代价**：handler 跑在 EventLoop 线程上，一个 EventLoop 服务很多 Channel；channelRead 里查库会让该 EventLoop 所有连接一起等；耗时逻辑交业务线程池，write 线程安全可跨线程调用。
- **三大坑**：忘 `fireChannelRead` 不往下传；忘 release ByteBuf（SimpleChannelInboundHandler 自动释放，混着用最易漏）；误以为 channel.write 只走自己后面（实际从 tail 走整条链）。
- **传播动作对照表**：fireChannelRead（当前 handler 之后，手动下传读事件）；ctx.write（当前 handler 之前）；channel.write（tail）；writeAndFlush（write+flush 缺一不可）；ctx.close（当前 handler 之前，关闭沿链传播）。

## Important Claims（重要论断）

- **添加顺序对 inbound 是正序，对 outbound 是反序**——很多人把编码器加在业务 handler 后面，就是因为没转过这个弯。
- **一句话记法：读是 head 到 tail，写是 tail 到 head，两个方向都要求编解码器位于业务 handler 的 head 一侧。**
- **ByteToMessageDecoder 的职责不是「解析业务」，是攒够一条再往下传**——它自己维护累积缓冲，数据不够就先不往下走；这也是解码器不能加 @Sharable 的原因（带每条连接各自的缓冲状态）。
- **「日志显示写了，但对方没收到」第一个要看的就是只 write 没 flush**——write 只是入队，数据安静地待在缓冲里。
- **@Sharable 串数据 bug 极难复现**——要正好两个连接交替触发；把当前连接的用户 ID 存成员变量一旦复用就串到别的连接。
- **在 channelRead 里查一次库，这个 EventLoop 上的所有连接一起等**——正确做法是把耗时逻辑交给业务线程池，处理完再写回 Channel。
- 原文声明：本文讲 pipeline 的传播机制，未覆盖所有事件类型，具体行为以 Netty 4.1 官方文档与源码为准。

## Concepts Introduced（引入的概念）

- 无新立概念页；本信源印证并深化 [[netty-channel-pipeline|ChannelPipeline 责任链与事件传播]]（双向链方向、ctx.write vs channel.write 路径、显式续传），为其补充实操排障层：五条症状对照表、三大常见坑、@Sharable 有状态陷阱、handler 阻塞 EventLoop 代价、批量写先 write 后一次 flush 的习惯。

## Entities Mentioned（提及的实体）

- [[netty|Netty]]（pipeline/Channel/EventLoop/ByteBuf/ByteToMessageDecoder/ChannelDuplexHandler/SimpleChannelInboundHandler/@Sharable）

## Implications（影响／启示）

- 症状对照表是排障直觉的索引：业务 handler 收到 ByteBuf 不是对象 → 解码器在后面；下一段逻辑不执行 → 忘 fireChannelRead；对端乱码 → 编码器位置不对/没加；写成功对端没反应 → 只 write 没 flush；响应串了 → 有状态 handler 加了 @Sharable。
- 「批量写先全部 write 再一次 flush」与 [[netty-write-flush|写缓冲与背压]] 的「高吞吐攒批后一次 flush 把 N 次系统调用压成少量几次」同源互证，本信源给出动机直白表述（少很多次系统调用）。
- 「handler 阻塞卡整条 EventLoop + 业务线程池 + write 线程安全」与 [[netty-eventloop|EventLoop]] 的「EventLoop 里禁止阻塞调用」生产第一纪律互证，并把 write 线程安全作为跨线程写回的依据。

## Limitations（局限）

- 科普口径，未覆盖所有事件类型；机制细节以 Netty 4.1 官方文档与源码为准（原文自述）。
- 未展开 eventLoop 线程模型内部（chooser/ioRatio/自愈），属 [[netty-eventloop]] 专篇范围。
- 未展开 ByteBuf 内存池/引用计数细节，属 [[netty-bytebuf]] 范围；仅点出 release 坑与 SimpleChannelInboundHandler 自动释放。
- 症状对照表为作者经验总结，非严格分类法；个别症状可能多因（解读）。

## Related Knowledge（相关知识）

- [[netty-channel-pipeline]]（双向链方向与事件传播机制）
- [[netty-write-flush]]（write 入队/flush 发出/批量写）
- [[netty-eventloop]]（handler 阻塞代价与 EventLoop 线程模型）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-11-02-netty-pipeline-handler-order.md`
