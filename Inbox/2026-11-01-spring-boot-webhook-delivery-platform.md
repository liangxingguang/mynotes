---
id: inbox-2026-11-01-001
title: Spring Boot 构建可靠 Webhook 投递平台：事件订阅、签名验签、重试补偿与死信治理
source: farerboy（微信公众号）
source_url: https://mp.weixin.qq.com/s/1d-S86DBwWJR3o2-8aq5fw
source_type: web
platform: 微信公众号
created: 2026-11-01
category: 技术
tags: [工程实践, Java, 分布式系统]
asset_ref: Assets/2026-11/weixin-1d-S86DBwWJR3o2-8aq5fw.md
wiki_status: pending
---

> 摘要：基于 Spring Boot 的大规模 Webhook 投递平台实战复盘：2000+ 订阅方、30+ 事件、峰值 8000 TPS。围绕"任务可靠落库调度、失败分级退避、异常隔离兜底"三个问题，给出六表模型（配置/运行时分离、任务/执行记录分离）、Outbox+事务钩子、两级触发出队、指数退避+抖动、失败分级、租户级熔断与三层限速、SSRF 四层校验、密钥重叠轮换、死信治理与对账兜底的完整方案，上线后投递成功率从 95% 稳到 99.9%+。

## 核心要点

1. **规模与难点**：2000+ 订阅应用、30+ 事件、峰值 8000 TPS、平均扇出 6（最高 50）。难点：网络不可靠、重复躲不掉（只能下推去重给订阅方）、订阅方质量参差、回调 URL 天然 SSRF 口子、重试风暴放大故障。
2. **六表模型**：Application / EventType（schema 必须版本化）/ Subscription / DeliveryTask（`(event_id, subscription_id)` 唯一）/ DeliveryAttempt（只追加）/ DeadLetter。payload 必须落库存快照，不能只存 eventId。
3. **主链路**：Outbox 表+事务钩子保证"业务写库与事件发布"原子（注意 `afterCommit` 里别用 `@TransactionalEventListener`，事务已提交它不执行且不报错）；发布线程只落库不做 HTTP；出队用"延迟队列+DB 扫描"两级触发，Worker 用 CAS（status+version）抢占。
4. **签名**：签名串 = timestamp\nnonce\nbody 三件套缺一不可；请求头带 eventId/timestamp/nonce/key-id/signature；验签失败返回 401 绝不能 200；时间偏差超 5 分钟拒；nonce 5 分钟窗口去重。
5. **退避**：指数+抖动+封顶（10s→85min，10 次累计约 2-3.5 小时）；429 优先听 `Retry-After`；max_retry 默认 10，对账类可调 24。踩坑：指数截断位写错导致封顶成死代码。
6. **失败分级**：2xx 成功；408/429/5xx/连接异常可重试；400/404/405/422 永久失败进死信；3xx 不跟随直接判永久失败；401/403 先重试 2 次再死信（密钥轮换/权限误配常是瞬时故障）。
7. **死信治理**：不是垃圾桶而是"等人工拍板"队列——按 reason 归因（78% 死信是地址配错，反过来推动产品加"保存前必验"）、控制台批量重放（最多 3 次）、T+7 归档留 180 天。
8. **熔断限速**：熔断按 subscriptionId 隔离（连续 20 次可重试失败 OPEN，HALF_OPEN 探 3 个探针，冷却翻倍上限 10 分钟）；熔断期间不消耗重试次数，但设 defer 闸（24h/200 次）防无限延期转死信；三层令牌桶限速（应用级/订阅级/全局），执行顺序：熔断→应用限流→订阅限流→HTTP。
9. **安全**：SSRF 四层校验（协议格式、DNS 解析后校验全部地址为公网、连接时固定 IP 防 DNS Rebinding、禁跟随重定向）；密钥 AES-GCM 密文存、KMS 托管、轮换新旧密钥重叠 7 天（双签名头，任一通过即算）。
10. **可观测**：delivery/latency/backlog/retry/deadletter/breaker 指标（app 基数大只打 TOP 200 标签）；traceId 贯穿全链路，eventId 可反查；每日对账兜底（不能简单重跑 fanout，要走单独补投入口）。
11. **性能数据**：单机 8C16G 落库+fanout 8000 TPS；HTTP 投递 1800 QPS、P99 220ms，开虚拟线程后 3500（必须配信号量限并发）；首投成功率 99.97%，死信率 0.11%。
12. **结论**：DB 是唯一真相（MQ 只是加速器）；承认重复躲不掉（eventId 是锚点，幂等外置）；退避必须有抖动、熔断必须按租户；4xx 别盲重试、5xx 别急着放弃。

## 正文

见 Assets 附件（公众号原文抓取，代码块被微信排版压成单行，属已知噪声）。核心内容已提炼于上。

## 来源

- 原文：https://mp.weixin.qq.com/s/1d-S86DBwWJR3o2-8aq5fw
- 作者公众号：farerboy（架构设计之道）

## 附件

[[Assets/2026-11/weixin-1d-S86DBwWJR3o2-8aq5fw.md]]
