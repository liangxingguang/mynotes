---
id: 2026-10-23-netease-pigeon-message-bus-activity
title: 网易云音乐「信鸽」：基于实时消息总线的直播活动系统架构
source: SegmentFault（云音乐技术团队·燕十三）
source_url: https://segmentfault.com/a/1190000047833219
source_type: 文章
platform: SegmentFault
created: 2026-10-23
category: 技术
tags:
  - 分布式系统
  - RocketMQ
  - 工程实践
asset_ref: Assets/2026/10/netease-pigeon-message-bus-activity.md
wiki_status: ingested
---

# 网易云音乐「信鸽」：基于实时消息总线的直播活动系统架构

> 直播活动的痛点：活动玩法灵活多变，"模块 A 结束后触发模块 B"每次都要改代码。信鸽（Pigeon）把这条触发链做成配置化的消息总线——各模块完成任务后把数据发给信鸽，信鸽按"信鸽 ID"查路由配置经 RocketMQ 异步投递到下一系统，失败备份存储 + 定时步长重试。四层面设计：履约能力、SDK 接入（Spring 容器自动建 PushConsumer）、全局标识字典（userId/anchorId 统一命名）、Provider 自动注册（注解扫描 + 定时上报）。与 ESB 的区别是"哑管道"——不做协议转换、不做中心化同步集成。消息治理上把多服务重复监听 topic 收拢为信鸽统一 receiver 转发（自动/自定义/存储三路，tag 区分 + 转发关系可配存活周期），实测 32 台 8U16G 容器支撑 300 万条/分钟、CPU 45%。

## 核心要点

- **定位**：只解决活动域"异步履约分发"，不做 adapter 集成；稳定流程用 Pipeline 编排、流水线末端挂信鸽节点，两种方案共存
- **异步投递选 RocketMQ 而非 RPC**：4 台 broker 同时坏 3 台概率极低，且大部分链路不需要下游返回结果
- **SDK 自动装配**：接入方 Spring 启动即建 PushConsumer 监听「fly」；Provider 启动 + 定时把注解标注的能力以顺序消息注册到信鸽
- **vs ESB**：ESB 重协议转换（wsdl/WebService）、同步集成、硬编码编排，适合企业级跨语言；信鸽轻量协议、同语言系、字典标准化、编排可视化收拢配置
- **消息治理三场景**：自定义分发（业务清洗后转发）、注册上报自动分发（tag 区分防单类消息饿死）、消息存储（重要消息如礼物批量写 TiDB 供回放）
- **落地数据**：转发 receiver 按配置动态建 consumer bean；转发失败存 exception 表重试；写 TiDB 链路独立部署压测（批量写拖垮整体吞吐）；纯转发吃 CPU，4U8G→8U16G 吞吐翻倍
- **展望**：消息回放修数据、国际化机房路由、FaaS+BaaS 承载消息清洗

## 正文

详见附件抓取正文（全文已收录，含与 ESB/Pipeline 对比、压测与困难复盘）。

## 来源

- [直播系统聊天技术(十)：基于实时消息总线的活动系统架构设计 - SegmentFault](https://segmentfault.com/a/1190000047833219)

## 附件

- [[Assets/2026/10/netease-pigeon-message-bus-activity.md]]
