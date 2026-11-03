---
title: B端系统重构：接手烂摊子，先别画原型（附3天重构清单）
source: 微信公众号 · 大皮不皮（B端产品经理）
source_url: http://mp.weixin.qq.com/s?__biz=Mzk3NTEwMDA5OQ==&mid=2247485039&idx=1&sn=abed9c27cc389617f36a092795dd7288&chksm=c4d187c3f3a60ed54b0dc526bf0abd5e04c10c49a172eaaef69aaa3536f8be72f314f5c7cefa
source_type: article
platform: 微信公众号
captured: 2026-11-03
registered_at: 2026-11-04
inbox_ref: Inbox/2026-11-03-bend-legacy-rebuild-32.md
asset_ref: Assets/2026-11-03/weixin-bend-legacy-rebuild-32.md
---

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

很多B端产品经理接手“烂摊子”系统后，本能反应是马上画原型：画新页面、改交互、加字段。但老系统的问题通常不在界面，而在边界、流程和数据。拿不到这三层地图，任何原型都是在给危房刷漆。本文给你一套3天重构清单。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

👉👉在公众号阅读原文，解锁配套资料包👈👈

老系统重构和从0到1不一样。新系统可以先画原型快速验证，但旧系统有三笔账：

1.  认知账：你不知道历史版本里埋了多少判断逻辑。原型的“好看”不等于系统能跑通。

2.  依赖账：老系统往往和账号、组织、主数据、消息、支付等模块耦合，单点改动会牵一发动全身。

3.  风险账：权限、流程、数据口径不清时，改得越多，越容易把历史隐患固化成新问题。


> 权限不是限制，是边界。流程不是审批，是责任链。数据不是记录，是共识。

## Day1：先把权限和身份边界盘清

权限是B端系统的“门”。门没管好，后面的流程和数据都会错位。老系统权限往往出现三类病：角色无限复制、数据范围全开、接口权限不看。

建议落地三个清册：

*   角色清册：角色名、描述、关联用户数、菜单权限、按钮/动作权限、接口权限、数据范围。

*   权限矩阵：主体/角色 × 资源/动作 × 范围，判断每一个组合是否越权。

*   越权风险清单：哪些角色有不该有的导出、删除、查看敏感字段、下载全量数据等动作。


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某车贷系统，催收员和风控员角色互相复制，催收员能查看客户授信、抵押物、联络人。通过重新映射角色和数据范围，把“按角色”和“按规则”解耦，处理掉了越权风险。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## Day2：把核心流程和状态机对清楚

流程是B端系统的“行”。很多业务报障表面是“系统卡住”，根因是流程断点或状态不一致。第2天建议只抓核心5条流程：订单、合同、工单、审批、入转调离。每条流程画真实状态机，不要画“标准流程”，要画“实际发生的流程”。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

产出文件：

*   流程泳道图：谁在哪个节点做了什么动作，传给谁。

*   状态机文字版：每一个状态可以跳转到哪几个状态，触发条件是什么。

*   断点处理清单：卡在哪个节点、涉及哪个系统、根因是什么、建议处理方案。


案例：某OA系统与EHR不对齐，员工已离职，OA待办仍触发。根因是两个系统组织状态不同步，不是流程引擎问题。处理方案是加组织状态校验节点和定时同步。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某物流系统，订单已签收但运费未生成。根因是回单状态与计费规则未绑定。用状态机重构后，签收自动触发计费。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某CRM系统，线索-商机-合同出现多条影子流程。通过合并状态节点和明确责任人，缩短了流程平均时长。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

走到这里，如果你身边有正在找工作的产品朋友，把这篇同步给他，少踩一个坑。

## Day3：把数据字段和口径统一

数据是B端系统的“列”。老系统数据乱，常表现在报表对不上、主数据不一致、字段血缘缺失。第3天先做三张表：

*   字段血缘表：来源表、字段、转换规则、下游报表。

*   口径差异清单：不同报表对“有效订单”“出库数量”“收入”的定义。

*   主数据治理清单：客户、物料、供应商、组织、项目主数据归属。


![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某财务中台与业务中台对账，订单已支付但财务收入未确认。原因是“支付成功”和“财务确认”时点不一致。通过统一事件凭证和口径说明处理。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某ERP系统，采买入库与应付暂估差异，导致库存和应付对不上。原因是入库单和发票单的计价字段不一致。通过主数据治理和字段血缘修复。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例：某业务中台报表，管理层看到的GMV和运营看到的GMV相差8%，原因是一个取税前，一个取含税。统一口径后报表恢复准确。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

> 先管边界，再管流转，最后管共识。边界不清，流程越顺越危险。

## 3天重构清单怎么用？

*   第1天不要动原型，只做盘点和访谈。

*   第2天把流程断点排列，用“影响面 × 发生频率”排优先级，只改头部3个断点。

*   第3天输出一份重构清单和一份PRD骨架，再进入原型阶段。

*   若3天盘不完，可以延长到5天，但不要跳过权限、流程、数据任何一层。

*   遇到业务说“先改个按钮”，把它记入需求池，不要临时打断盘点节奏。


如果这篇文章对你有帮助，建议收藏，并把本号加星标。后续会继续更新B端权限设计、流程治理、数据口径等内容。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

👇👇同类文章👇👇

[B端系统权限重构指南：接手烂摊子，用这5步直接抄](https://mp.weixin.qq.com/s?__biz=Mzk3NTEwMDA5OQ==&mid=2247484969&idx=1&sn=f1e5f06e933872debb4ae35226dee1f5&scene=21#wechat_redirect)

[B端系统多智能体重构SaaS业务流：产品经理建议收藏](https://mp.weixin.qq.com/s?__biz=Mzk3NTEwMDA5OQ==&mid=2247484851&idx=1&sn=ff731e5d45779c441e7777d10723f6ce&scene=21#wechat_redirect)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)
