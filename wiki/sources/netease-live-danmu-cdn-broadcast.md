---
id: wiki-source-netease-live-danmu-cdn-broadcast
type: source
title: 直播系统聊天技术(九)：千万级实时直播弹幕的技术实践（网易云信）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - im
  - live-streaming
  - messaging
  - cdn
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-netease-ten-million-live-danmu-cdn-broadcast.md
related:
  - wiki/concepts/cdn-broadcast-fanout.md
  - wiki/concepts/mcast.md
  - wiki/sources/meipai-live-danmu-realtime-push.md
  - wiki/sources/baidu-live-mcast-message-architecture.md
---
# 直播系统聊天技术(九)：千万级实时直播弹幕的技术实践（网易云信）

## Overview（概览）

网易云信 IM 技术团队的一手实践复盘：以 TFBOYS 线上演唱会为背景，讲千万级在线直播弹幕系统的完整方案——GSLB 接入地址分配、握手与动态 Token 鉴权、基于优先级队列的消息收发，以及作为下行杀手锏的 CDN 弹幕广播，外加单元化部署、主备高可用、秒级大盘与故障演练四件稳定性套。

## Key Facts（关键事实）

- 开播并发进入直播间时，地址分配服务可达 50 万~100 万 TPS；"按请求查负载"的一般分配方案在此量级不可行（缓存 TPS 与机房带宽过高、负载滞后导致超分配）。
- GSLB 分配三优化：长链接服务器负载上报周期 1s→5ms；分配服务改为独立线程按 5ms 周期同步负载（不再按请求查询）；接入地址按负载排序、单地址分配一定次数后轮转下一个（防低负载机器被瞬间打爆）。
- 握手协商加密算法：非对称 RSA/SM2、对称 AES/SM4（SM2/SM4 为国密）；Java 平台建议用 JNI 加速非对称计算。
- 动态 Token 鉴权：按账号+登录时间+接入地址+鉴权中心时变随机数动态计算，**进程本地完成、不访问用户服务**；该场次为付费直播，含账号认证与购票业务认证两段。
- 消息体精简：礼物展示资源预加载进 App，消息只传业务编号。
- 逐级流控：上行各层按下层处理能力做粗粒度本地流控；反垃圾环节需全局控量，用分布式全局流控；广播阶段再按业务需求流控一次。
- 优先级队列投递：按业务分桶（系统广播/高优先级礼物/低优先级/弹幕）配比例，按 1 秒单位时间计算各队列投递量；前桶不足时余量叠加到下一队列，保证每周期投递量稳定。
- CDN 广播两方案：推流（消息伪装成视频流推 CDN，App 订阅数据流，实时性高、实现复杂、需考虑终端兼容）与静态文件加速（消息组装成静态文件，App 周期下载，实现简单、实时性取决于同步周期）；多 CDN 厂商融合按容量比例与延迟做权重轮询调度。
- 单元化部署：ChatLink/ChatServer 单元化无状态、跨机房，单元内故障隔离；需全局控制的"接入服务/弹幕服务"不单元化但跨机房部署。
- 单点高可用：心跳负载依赖的缓存采用主备缓存集群，主集群不可用时业务主动切换，5 秒内恢复。
- 秒级监控大盘：业务进程内预聚合指标上报，数据中心只按时间窗口合并——监控链路自身也按量级设计；大盘含地域分布、上下行消息量、机房/CDN 带宽、流控比例、端侧同步成功率与延迟。
- 故障演练双模式：预设故障（验证高可用方案生效）+ 随机故障（验证应急预案与报警）。

## Important Claims（重要论断）

### Claim 1：千万级在线的弹幕下行，优先选 CDN 而非长连直推

为发挥边缘加速优势、给极致弹幕体验，千万级场景下弹幕下行优先 CDN 广播；长连接只作为可选路径之一。

### Claim 2：高 TPS 下负载均衡要"周期同步 + 排序轮转"，不能"查一次分一次"

50w~100w TPS 下按请求查询负载会把缓存服务与机房带宽打爆，且负载滞后导致超分配；改为 5ms 周期同步 + 按负载排序轮转分配后两者同时消解。

### Claim 3：千万级登录鉴权必须进程本地化

动态 Token 在接入进程本地计算校验，不访问用户服务——既提高登录性能又降低业务成本。

## Concepts Introduced（引入的概念）

- [[cdn-broadcast-fanout|CDN 广播（弹幕下行）]]（新开概念页：推流 vs 静态文件两种形态、多 CDN 融合调度）

## Entities Mentioned（提及的实体）

- 网易云信 IM 技术团队（未立实体页，单一信源）
- ChatLink / ChatServer（网易云信接入与聊天服务组件名，未立实体页）

## Implications（影响／启示）

- 与美拍（订阅推送+降级广播）、百度（mcast 长连组播）并列，CDN 广播是直播弹幕下行的第三条工程路线；三者对照可覆盖「自建长连推 / 长连层组播 / 外包 CDN 边缘」的完整选型空间。
- 「负载上报 1s→5ms + 周期同步 + 排序轮转」是 GSLB/地址分配在百万 TPS 下的通用改造配方。
- 「业务预聚合 + 中心窗口合并」说明监控管道本身也要按业务量级设计，否则大盘先于业务被打爆。

## Limitations（局限）

- 未披露具体在线峰值数字（只给"千万级"目标与 50w~100w TPS 的分配压力）。
- CDN 广播两种方案的实际选型结果与同步周期参数未给出。
- 优先级队列的具体配额比例未披露。

## Related Knowledge（相关知识）

- [[cdn-broadcast-fanout|CDN 广播（弹幕下行）]]
- [[meipai-live-danmu-realtime-push|百万在线的美拍直播弹幕系统实时推送技术实践]]（系列第 1 篇，订阅推送路线）
- [[baidu-live-mcast-message-architecture|百度直播海量用户实时消息系统架构：长连接组播 mcast 实践]]（mcast 组播路线）
- [[mcast|长连接组播（mcast）]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-netease-ten-million-live-danmu-cdn-broadcast.md`
