---
id: wiki-concept-message-bus
type: concept
title: 业务消息总线
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: medium
tags:
  - concept
  - message-queue
  - architecture
sources:
  - raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md
related:
  - wiki/entities/pigeon-message-bus.md
  - wiki/entities/rocketmq.md
---
# 业务消息总线

## Definition（定义）

把"模块 A 结束后触发模块 B"这类跨系统编排从代码里抽出来，做成配置化路由关系的服务：各模块完成任务后把数据发到总线，总线按配置的路由关系经消息队列异步投递到下一系统。本库当前信源中的实例是网易云音乐 [[pigeon-message-bus|信鸽]]。

## Why It Matters（为什么重要）

活动/营销类业务的玩法灵活多变，触发链每次都要改代码（if 触发或策略模式魔改）对长期建设不友好；总线式服务让"组合"变成配置而非开发，新业务只做路由配置即可复用既有模块。

## Core Characteristics（核心特征）

1. **哑管道**：忽略协议转换与适配集成，不做中心化同步集成——这是与 ESB 的本质区分。
2. **异步优先**：大部分履约链路不需要下游返回结果，选 MQ 投递而非 RPC 通信级依赖。
3. **标准化字典**：全局标识（如 userId/anchorId）由总线统一定义，接入方不得私造字段名。
4. **SDK 自动装配**：接入方容器启动即自动建消费者、自动注册能力，免人工开启。
5. **配置化路由与生命周期**：路由关系可视化配置、可配存活周期，适配活动短期代码场景。

## Structure（结构）

信鸽实例的四层：履约能力（末端触发）、SDK 接入（自动建 PushConsumer）、全局标识字典、Provider 自动注册（注解扫描+定时上报）。消息治理收拢为统一 receiver，转发分三路：自动转发（tag 区分）、自定义转发（业务清洗后）、消息存储（批量写库供回放）。

## How It Works（运作方式）

模块执行完职责后组装数据发给总线 → 总线按信鸽 ID 查路由配置 → 经 MQ（实例中为 [[rocketmq|RocketMQ]]）异步投递到下一系统 → 失败备份存储 + 定时步长重试。解读：本质是把"调用编排"降级为"事件通知+配置路由"，用最终一致性换模块解耦。

## Relationships（关系）

### Related Concepts（相关概念）

- [[mcast|长连接组播（mcast）]]：同属直播消息分发域，mcast 解决的是面向海量在线用户的实时推送扩散，业务消息总线解决的是后端模块间的履约编排，层次不同。
- [[idempotency-design|幂等设计]]：MQ 至少一次投递下，总线链路的消费端幂等是必配纪律（推断，信源未展开）。

### Dependencies（依赖项）

- [[rocketmq|Apache RocketMQ]]：信鸽实例的异步投递底座。

### Distinctions（区分）

- 与 **ESB** 的不同之处在于：ESB 重协议转换（wsdl/WebService）、同步集成、硬编码编排，适合大型企业跨语言桥接；业务消息总线是哑管道、轻量协议、同语言系、编排可视化收拢配置。
- 与 **Pipeline（流水线）** 的不同之处在于：Pipeline 编排稳定流程，总线承接流水线末端的灵活组合；两者可共存——流水线末端挂总线节点。

## Evolution（演进）

信源展望：消息回放作为修复数据手段、国际化机房路由、FaaS+BaaS 承载消息清洗。

## Open Questions（开放问题）

- 旧系统接入时数据清洗与协议转换的最佳实践（信源建议脚本语言清洗，未给方案细节）。
- 总线是否为该问题的最优解——信源作者自述希望搭载 FaaS 平台。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-netease-pigeon-message-bus-activity.md`

## Related Knowledge（相关知识）

- [[pigeon-message-bus|信鸽（Pigeon）]]：本概念的唯一实例信源。
