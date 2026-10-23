---
id: 2026-10-23-meipai-live-danmu-realtime-push
title: 百万在线的美拍直播弹幕系统实时推送技术实践
source: 52im.net（作者王静波，美拍架构师）
source_url: http://www.52im.net/thread-1236-1-1.html
source_type: 文章
platform: 52im.net
created: 2026-10-23
category: 技术
tags:
  - 分布式系统
  - 工程实践
asset_ref: Assets/2026/10/meipai-live-danmu-realtime-push.md
wiki_status: ingested
---

# 百万在线的美拍直播弹幕系统实时推送技术实践

> 美拍弹幕系统三阶段演进：快速上线（HTTP 轮询 + Redis SortedSet 消息模型，Zadd 写 / ZrangeByScore 两秒轮询读，前端机→Kafka→处理机→Redis）→ 高可用（同城双机房、降级、全链路监控，扛住 TFBOYS 四场近百万峰值、26 亿点赞）→ 长连接替换轮询（连接层/推送层分离 + 路由服务灰度黑白名单）。关键工程细节：ZrangeByScore 拉取有并发丢消息坑（11 号先于 10 号写入则 10 号被跳过）→ 同直播间同消息类型固定 Kafka partition + 处理机 synchronized 串行写；吞吐与一致性的四档位动态降级；本地缓存只给大直播间开（全量开 20 万 QPS 打爆 Redis）；回放与直播 Redis 隔离。长连接侧大直播间自动从告知/拉取降级为广播。

## 核心要点

- **直播消息 vs IM 差异**：更求及时（过时消息无价值）、松散群聊（随时进退）、离线历史不重发——所以敢用轮询起步
- **并发丢消息与修复**：score 乱序写入导致跳跃拉取漏消息；固定 partition + 处理机串行写保证同直播间同类型有序
- **四档位弹性**：延迟大时「多 partition + 不加锁并行写」换吞吐、延迟小时「单 partition + 加锁串行」保序，按直播间×消息类型粒度自动选档（时间戳判延迟）
- **读侧成本账**：本地缓存 1s 一拉，1000 直播间×5 类型×40 前端机 = 20 万 QPS → 只对大直播间开启；返回条数按房间大小动态调整
- **回放隔离**：直播结束备份 MySQL + 独立回放 Redis + 前端 local cache，读取顺序 local cache→Redis→MySQL，全程 SortedSet 数据结构一致
- **长连接架构**：连接层无业务逻辑只保连接（少重启保稳定）、推送层管订阅关系与推送、路由服务按百分比灰度 + uid/deviceId/版本黑白名单；客户端三次连不上自动降级短连接；服务端 tardis（gRPC + etcd）
- **推送模型**：订阅推送（告知→毫秒级等待→拉取→推），大直播间自动降级广播；三版本客户端迭代 + 灰度完成平滑替换

## 正文

详见附件抓取正文（全文已收录，52im.net 为 GBK 站点，经浏览器渲染抓取）。

## 来源

- [直播系统聊天技术(一)：百万在线的美拍直播弹幕系统的实时推送技术实践之路 - 52im.net](http://www.52im.net/thread-1236-1-1.html)

## 附件

- [[Assets/2026/10/meipai-live-danmu-realtime-push.md]]
