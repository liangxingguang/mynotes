---
id: wiki-source-netease-pigeon-message-bus-activity
type: source
title: 直播系统聊天技术(十)：基于实时消息总线的活动系统架构设计
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - message-queue
  - live-streaming
sources:
  - raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md
---
# 直播系统聊天技术(十)：基于实时消息总线的活动系统架构设计

## Overview（概览）

云音乐技术团队（燕十三）分享的直播活动系统架构实践：把"模块 A 结束后触发模块 B"这类活动编排做成配置化的实时消息总线「信鸽」，各模块完成任务后把数据发给信鸽，信鸽按"信鸽 ID"查路由配置、经 RocketMQ 异步投递到下一系统。本文是 52im「直播系统聊天技术」系列第 10 篇。

## Key Facts（关键事实）

- 定位：只解决活动域"异步履约分发"，不做 adapter 式集成——「哑管道」设计。
- 四层设计：履约能力、SDK 接入（Spring 容器启动自动建 PushConsumer 监听「fly」）、全局标识字典（userId/anchorId 统一命名）、Provider 自动注册（注解扫描 + 启动+定时顺序消息上报）。
- 异步投递选 RocketMQ 而非 RPC：4 台 broker 同时坏 3 台概率极低，且大部分链路不需要下游返回结果。
- 消息治理收拢多服务重复监听 topic：receiver 按配置动态建 consumer bean，转发分三路（自动/自定义/存储），tag 区分防单类消息饿死，转发关系可配存活周期。
- 实测：32 台 8U16G 容器支撑 300 万条/分钟、CPU 约 45%；纯转发吃 CPU，4U8G→8U16G 吞吐翻倍；写 TiDB 链路须独立部署压测（批量写拖垮整体吞吐）；线上极限评估 100 万条/分钟。
- 重要消息（如礼物）批量写 TiDB 供回放；转发失败存 exception 表定时步长重试。

## Important Claims（重要论断）

### 与 ESB 的区别是「哑管道」

ESB 重协议转换（wsdl/WebService）、同步集成、硬编码编排，适合企业级跨语言场景；信鸽轻量协议、同语言系、字典标准化、编排可视化收拢配置——忽略集成的适配转换，不做中心化同步集成。

### Pipeline 与消息总线可以共存

稳定流程用 Pipeline 编排，流水线末端挂一个信鸽节点，再自由组合定制化活动场景。

### 异步优先于 RPC

大部分履约链路不需要下游返回结果集，MQ 投递失败率远低于 RPC 通信级依赖，具备"绝对的优势"。

## Concepts Introduced（引入的概念）

- [[message-bus|业务消息总线]]

## Entities Mentioned（提及的实体）

- [[pigeon-message-bus|信鸽（Pigeon）]]
- [[rocketmq|Apache RocketMQ]]

## Implications（影响／启示）

活动类业务的模块组合问题可以从"写胶水代码"转为"配置路由关系"；消息总线同时可以承担 topic 治理职责，把"每个服务各自监听"收拢为"统一 receiver 转发"，解决活动短期代码的空转消费问题。

## Limitations（局限）

单一团队一手实践，无外部对照数据；非活动域子系统仍需定制化桥接（退回 adapter 思路）；旧系统接入仍避免不了数据清洗与协议转换问题（作者建议脚本语言做清洗）；作者自认转发方案非最优解，展望 FaaS+BaaS。

## Related Knowledge（相关知识）

- [[meipai-live-danmu-realtime-push|直播系统聊天技术(一)：美拍直播弹幕实时推送]]
- [[alibaba-ecommerce-im-group-live|直播系统聊天技术(二)：阿里电商 IM 群聊/直播]]
- [[baidu-live-mcast-message-architecture|直播系统聊天技术(四)：百度直播 mcast 组播]]
- [[mq-transaction-idempotency-design|消息队列架构设计（中篇）：事务消息+业务幂等]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md`
