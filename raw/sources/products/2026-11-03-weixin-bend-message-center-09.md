---
title: B端产品经理实操框架：消息中心从0到1复盘
source: 微信公众号 · B端产品经理（作者：大皮不皮）
source_url: http://mp.weixin.qq.com/s?__biz=Mzk3NTEwMDA5OQ==&mid=2247484439&idx=1&sn=b4935e5e98ad146e82b3cf52dcdc5c8f&chksm=c4d185bbf3a60cadce9b5819cc992a7effa05e752ce1a3d078af9320a4973ce3c975f2571768
source_type: article
platform: 微信公众号
captured: 2026-11-03
registered_at: 2026-11-04
inbox_ref: Archive/2026-11-03-bend-message-center-09.md
asset_ref: Assets/2026-11-03/weixin-bend-message-center-09.md
---

# B端产品经理实操框架：消息中心从0到1复盘

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

对 B 端产品经理来说，消息中心是较容易被低估但影响面很广的基础能力。站内信、短信、企微、email 看似只是不同发送通道，实际背后涉及模板抽象、用户订阅偏好、触达策略和失败重试。今天用一个 CRM 产品从 0 到 1 的案例，完整复盘如何统一消息中心。

## 一、为什么消息中心需要统一？

在多业务系统里，消息通常散落在订单、审批、服务提醒等模块。各业务线分别对接短信和 email 服务，导致几个问题：

*   文案写死在各业务代码里，修改一次文案需要发布版本；

*   同一用户同时收到多条重复通知，打扰明显；

*   发送失败没有统一记录，服务团队无法快速定位；

*   每个新场景都要重新对接通道，开发效率低。


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

统一消息中心，就是把这些散落的通道能力沉淀为一个平台能力，让业务方只关心“发什么”，不用关心“怎么发”。

## 二、整体框架：四层结构与核心模块

消息中心可以拆为四层：

1.  接入层：接收业务系统的发送请求，支持同步与异步接入。

2.  策略层：执行订阅偏好、触达策略、频控、通道路由。

3.  渲染层：根据消息模板和变量渲染各通道内容。

4.  通道层：对接站内信、短信、企微、email 等通道，统一回执。


消息生命周期包括：创建、校验、路由、渲染、发送、回执、补偿。四个核心模块是消息模板、订阅偏好、触达策略、失败重试。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 三、消息模板：从写死文案到可配置

消息模板的关键是“文案与数据分离”。每条消息定义一个业务场景，再按通道配置不同文案。

一个模板通常包含：

*   scene\_code：场景编码，如 order\_status\_update

*   channel\_type：站内信 / 短信 / 企微 / email

*   title：标题

*   content：正文模板，支持变量占位符

*   variables：变量定义，如 order\_no、status

*   locale：语言版本


实际案例：某 CRM 系统的订单状态提醒。

*   站内信内容：“您的订单 {{order\_no}} 已更新为 {{status}}”


*   短信内容：“订单 {{order\_no}} 状态更新为 {{status}}，请查看”


*   email 内容：“您好，订单 {{order\_no}} 已更新为 {{status}}，详情请查看系统。”


统一变量后，业务方只需要传入 order\_no 和 status，系统自动渲染不同通道内容。这样既能让文案一致，也降低维护投入。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 四、订阅偏好：把控制权交给用户

统一消息中心不能变成“统一骚扰”。订阅偏好模块允许用户按通道和业务场景设置是否接收、接收频次、免打扰时段。

模型示例：

*   user\_id：用户 ID

*   scene\_code：业务场景

*   channel：站内信 / 短信 / 企微 / email

*   enabled：是否接收

*   frequency\_limit：频次上限

*   quiet\_hours：免打扰时段


案例：某企业管理员关闭了营销短信，但保留审批提醒；同时把 email 设置为每日汇总，避免实时打扰。订阅偏好上线后，用户消息打扰投诉下降约 40%。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 五、触达策略：优先级、频控与通道路由

触达策略决定“何时发、用哪个通道发、发不出去怎么办”。

常见的优先级排序：

*   安全验证：验证码、登录提醒

*   审批待办：审批请求、到期提醒

*   状态：订单付款、发货、退款

*   服务提醒：续费、到期、异常

*   营销活动：促销、活动邀请


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

通道路由可参考：

*   高优先级且需即时触达：短信 + 站内信

*   正式通知与附件：email

*   企业内部协同：企微

*   低优先级营销：站内信或企微，必要时降级


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

频控策略：同一用户同一场景在单位时间内接收消息上限，比如 1 小时内接收消息上限为 1 条短信，1 天为 3 条营销消息。超过上限则合并为站内信或延后发送。

## 六、失败重试：让消息可靠

失败重试是消息中心可靠性的关键。失败类型不同，处理方式也不同：

*   参数错误：模板变量缺失或格式错误，不重试，直接告警；

*   通道限流：可重试，采用指数退避；

*   用户拒收：不重试，标记为拒收；

*   通道不可用：切换备用通道，如短信失败降级为企微或 email。


重试策略可采用指数退避：首次失败 1 分钟后重试，第二次 5 分钟，第三次 15 分钟，最多重试 3-5 次。仍失败则进入死信队列，由管理后台人工查看并补偿发送。每一次发送都记录回执，便于定位问题。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 七、实际案例复盘： CRM 消息中心从 0 到 1

背景：某面向中小企业的 CRM 产品，原来各业务模块直接调用短信和 email 服务，消息发送成功率约 82%，用户打扰投诉较多，服务团队定位问题困难。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

落地步骤：

1.  盘点现有消息场景，整理出 12 类核心场景，如订单、审批、服务提醒、营销等。

2.  设计统一消息模板，字段标准化，支持按通道配置文案。

3.  增加订阅偏好后台，允许用户关闭营销短信、设置 email 每日汇总。

4.  配置触达策略，将审批提醒设为高优先级，营销消息限制每月 2 条。

5.  失败重试与降级：短信通道失败自动重试 3 次，仍失败则转为企微或 email，并记录死信。


效果：发送成功率从 82% 提升至 96%，用户消息打扰投诉下降约 40%，新场景接入效率提升约 60%。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

> 消息中心不是发送通道的堆叠，而是用户触达权的统一治理。把这篇文章转发给正在做 B 端产品的朋友。

## 八、落地建议

如果你正在从 0 到 1 建设消息中心，可以先做三件事：

1.  先盘点业务场景，整理消息清单和通道需求；

2.  先落地消息模板和失败重试，确保高优场景可靠；

3.  再逐步增加订阅偏好和频控，降低打扰。


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最后，希望这篇文章能帮助到你，💬《消息中心》可获取完整附件资料。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)
