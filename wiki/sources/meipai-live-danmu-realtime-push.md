---
id: wiki-source-meipai-live-danmu-realtime-push
type: source
title: 直播系统聊天技术(一)：百万在线的美拍直播弹幕系统的实时推送技术实践之路
status: active
created: 2026-10-23
updated: 2026-10-24
confidence: high
tags:
  - im
  - live-streaming
  - messaging
  - redis
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-meipai-live-danmu-realtime-push.md
related:
  - wiki/sources/baidu-live-mcast-message-architecture.md
  - wiki/sources/netease-live-danmu-cdn-broadcast.md
  - wiki/concepts/mcast.md
  - wiki/concepts/cdn-broadcast-fanout.md
  - wiki/concepts/read-fanout.md
---
# 直播系统聊天技术(一)：百万在线的美拍直播弹幕系统的实时推送技术实践之路

## Overview（概览）

美拍架构师王静波的一手复盘：直播弹幕系统自 2015 年 11 月起三阶段演进——HTTP 轮询快速上线（Redis SortedSet 消息模型）→ 高可用保障（同城双机房 + 降级 + 全链路监控）→ 长连接替换轮询（连接层/推送层分离 + 灰度路由），最终支撑百万用户同时在线。

## Key Facts（关键事实）

- 消息模型：写走 前端机→Kafka→处理机→Redis（Zadd，score 为相对时间）；读走 前端机两秒一次 ZrangeByScore 轮询；进房用户列表用 Zrange。
- 并发丢消息坑：score 乱序写入时跳跃拉取会漏消息（11 号先于 10 号写入则 10 号被跳过）；修复 = 同直播间同消息类型固定 Kafka partition + 处理机 synchronized 串行写。
- 四档位动态降级：按延迟（时间戳判定）在「单/多 partition × 加锁串行/并行写」四档间自动切换，粒度为直播间×消息类型，吞吐与保序互换。
- 本地缓存成本账：全量开启则 1000 直播间×5 类型×40 前端机×1s = 20 万 QPS 打向 Redis，因此只对大直播间开启；返回条数按房间大小动态调整。
- 回放隔离：直播结束备份 MySQL + 独立回放 Redis + 前端机 local cache，读取顺序 local cache→Redis→MySQL，全程 SortedSet 数据结构一致。
- 高可用成果：同城双机房（写主机房、读双机房分担）+ 降级 + 监控后，扛住 TFBOYS 四场直播——峰值近百万同时在线、2860 万人次观看、2980 万评论、26.23 亿次点赞。
- 长连接架构：连接层零业务逻辑只保连接（少重启保稳定）、推送层管订阅关系与推送、路由服务支持百分比灰度 + uid/deviceId/版本黑白名单；客户端三连不上自动降级短连接；服务端间通信用 tardis（gRPC + etcd）。
- 推送模型：订阅推送（推送层告知连接层 → 毫秒级等待 → 拉取 → 推给用户），大直播间自动降级为广播；经三个客户端版本 + 灰度平滑替换轮询。

## Important Claims（重要论断）

### Claim 1：直播消息敢用轮询起步，因为它与 IM 的需求不同

更求及时（过时消息无价值）、松散群聊（随时进退）、离线历史不重发——这三点让「两秒轮询 + SortedSet」在百万在线目标下成为合理的快速上线选择。

### Claim 2：按发展阶段平衡演进优于一步到位

前中期轮询、中后期长连接是预定策略；业务团队做 HTTP 方案的同时基础团队并行开发长连接系统。

### Claim 3：连接层保持零业务逻辑是长连接稳定性的关键

连接层不含推送业务逻辑，从而大幅减少重启次数，保持用户连接稳定；长短连接切换靠路由服务灰度与黑白名单保证平稳。

## Concepts Introduced（引入的概念）

（未新开概念页；订阅推送「告知→拉取→推」模型与读扩散思想相通，见 Related Knowledge）

## Entities Mentioned（提及的实体）

- 美拍 / 美图架构平台部（未立实体页，单一信源）
- tardis 框架（美拍基础团队自研，gRPC + etcd；未立实体页）

## Implications（影响／启示）

- 「固定 partition + 串行写」是用 Kafka 保序语义的典型用法；吞吐不够时用多档降级在保序与吞吐间动态取舍。
- 本地缓存全量开的 QPS 成本账（20 万 QPS）是「缓存也要算钱」的量化样板。
- 长短连接平滑替换的工程配方：路由灰度 + 黑白名单 + 客户端自动降级 + 多版本迭代。

## Limitations（局限）

- 成文于轮询→长连接替换完成后，长连接侧的容量数字（单连接层节点承载量等）未披露。
- 四档位降级的「延迟」阈值未给具体数值。

## Related Knowledge（相关知识）

- [[baidu-live-mcast-message-architecture|百度直播海量用户实时消息系统架构：长连接组播 mcast 实践]]（同为直播消息一手实践；百度选择组播 mcast，美拍选择订阅推送 + 降级广播）
- [[netease-live-danmu-cdn-broadcast|直播系统聊天技术(九)：千万级实时直播弹幕的技术实践（网易云信）]]（同为直播弹幕一手实践；网易云信选择 CDN 广播下行）
- [[read-fanout|读扩散（Fan-out on Read）]]（美拍的「告知→拉取→推」是把拉取语义架在长连接上的近亲）

## Source（信源）

- `raw/sources/architecture/2026-10-23-meipai-live-danmu-realtime-push.md`
