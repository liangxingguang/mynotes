---
id: wiki-source-xitongsiwei-02-baowen-shujuliu-kongzhiliu
type: source
title: 同一个报文，一半是数据流，一半是控制流
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - source
  - architecture
  - system-design
  - methodology
sources:
  - raw/sources/architecture/2026-10-31-xitongsiwei-02-baowen-shujuliu-kongzhiliu.md
related:
  - wiki/concepts/data-flow-vs-control-flow.md
  - wiki/concepts/dfd.md
  - wiki/sources/system-thinking-album.md
---
# 同一个报文，一半是数据流，一半是控制流

## Overview（概览）

公众号「Leo聊系统思维」《系统思维》专辑第 2 篇（pos_num 2，约 2500 字）。用一段支付报文讲清数据流与控制流的分界——判断依据不是字段格式而是信息的用途：同一个 JSON 里 `action`/`timeout` 是指挥网关做什么的控制数据，`order_no`/`user_id`/`amount`/`goods_name` 是业务数据。在此基础上讲清标准 DFD 只画什么（四类元素）、三个最容易画错的地方，以及控制流该换时序图/活动图/状态机图三种图表达。

## Key Facts（关键事实）

- 支付请求报文六字段分类：`action`（创建支付单指令）、`timeout`（超时控制参数）= 控制数据；`order_no`、`user_id`、`amount`、`goods_name` = 业务数据。六字段都是合法 JSON，格式上没有任何区别。
- 返回报文同理：`code` 是成功或失败的执行反馈（控制数据）；`order_no`、`pay_time` 是业务结果（业务数据）。
- 判断原则：区分数据流与控制流看的是**信息的语义用途，不是传输载体**——JSON、文本还是二进制都不决定分类；同一个报文可以同时携带两类信息，建模时要拆开看。
- 两条定义：数据流承载业务或领域实体内容，是系统要加工、处理、生成的原材料、半成品和业务产出；控制流承载调度、协调、管理组件执行行为的指令与信号，决定做不做、何时做、做哪个动作，本身不承载业务主体信息。一句话：数据流是要加工的内容，控制流是指挥怎么干活的命令。
- 标准 DFD 只有四类元素：外部实体、加工、数据存储、数据流；不关心执行时序、不关心分支、不关心调用命令。
- 三个最容易画错的地方：①加工要写"对数据做什么"（创建支付单/查询支付结果），不能写系统名（"支付网关"是系统不是加工）；②数据流要标清读还是写——同一份"支付记录"写进去和读出来是两条不同的流，都要画；③不要漏掉返回流，只画单向的图不完整。
- 图中两个加工正好对应数据操作最常见的两类：创建（写）和查询（读）；`action`、`timeout`、`success` 这类控制命令不会出现在 DFD 上。
- 控制流三种图分工：时序图（多组件按时间先后传递指令与反馈，表达调用与请求应答）；活动图（执行步骤、分支判断、循环逻辑，关注流程走向）；状态机图（一个对象在不同外部控制信号下状态如何切换）。
- 支付例子映射：客户端调网关、下发创建指令、网关返回成功或失败 → 时序图；校验参数 → 发起支付 → 判断结果 → 成功写记录/失败返回错误 → 活动图；支付单状态流转（待创建 → 处理中 → 支付成功/支付失败） → 状态机图。
- 边界表：业务数据（订单号、用户 ID、金额、商品、支付时间、交易记录）→ 绘制进 DFD；控制数据（action 指令、timeout 超时、success/error 返回码、启停信号、分支判断、重试指令）→ 不绘制，用时序图/活动图/状态机图。
- 收尾论断：建模的第一件事不是选图表，而是先分清信息属于哪一类；分清了，该画进 DFD 的自然会画，不该画的也不会硬塞进去。
- 数据来源（文章自列）：DeMarco, T.（1978）《Structured Analysis and System Specification》（Yourdon Press，DFD 经典来源，确立四类元素）；Gane, C. & Sarson, T.（1979）《Structured Systems Analysis: Tools and Techniques》（另一套 DFD 表示法）；OMG《Unified Modeling Language (UML) Specification》（时序图、活动图、状态机图的定义）。

## Important Claims（重要论断）

- 「区分数据流和控制流，看的是信息的语义用途，不是它的传输载体。」
- 「数据流是系统要加工的内容；控制流是指挥系统怎么干活的命令。」
- 「DFD 不用于表达控制流。它只描述业务数据的来源、加工、存储和去向。」
- 「同一个 JSON 报文可以同时携带两类信息，建模时得把它拆开看。」
- 「建模的第一件事，不是选择图表，而是先分清信息属于哪一类。」

## Concepts Introduced（引入的概念）

- [[data-flow-vs-control-flow|数据流与控制流的边界]]
- [[dfd|DFD（数据流图）]]

## Entities Mentioned（提及的实体）

- DeMarco, T.（1978）《Structured Analysis and System Specification》，Yourdon Press——DFD 经典来源
- Gane, C. & Sarson, T.（1979）《Structured Systems Analysis: Tools and Techniques》——另一套 DFD 表示法
- OMG《Unified Modeling Language (UML) Specification》——时序图/活动图/状态机图定义
- 以上均为文章转述的被引用文献（单一信源），暂不立实体页

## Implications（影响／启示）

- 评审中被指出"这个不该画"，多半不是图画得丑，而是把控制命令混进了只该画业务数据的图（解读）。
- 协议设计/报文建模时若把字段一律当"数据"处理，会同时丢掉两层信息：业务内容该进数据流图、执行指令该进时序/状态机表达（解读）。

## Limitations（局限）

- 单一自媒体原创信源；文献引用为文章转述（非原文直读），DeMarco/Gane-Sarson/OMG 的精确措辞需查原文核验。
- 文中配图（0 层 DFD、时序图、活动图、状态机图）在采集时均为 1px SVG 占位符，未下载原图，图示细节无法核验；raw 信源按采集态如实保留。
- 两张表格在采集中被拆行（每个单元格独占一行），raw 信源保留采集态，字段对应关系见 Inbox 采集笔记的还原版。
- 支付案例仅一个报文示例，方法普适性为作者论证、未跨系统核验。

## Related Knowledge（相关知识）

- [[system-thinking-album|《系统思维》专辑目录]]（本篇为第 2 篇）
- [[xitongsiwei-01-gaogao-chengben|第 1 篇：架构最高的成本]]（同系列上一篇）
- [[data-flow-vs-control-flow]]、[[dfd]]（本文产出的两个概念页）

## Source（信源）

- `raw/sources/architecture/2026-10-31-xitongsiwei-02-baowen-shujuliu-kongzhiliu.md`
