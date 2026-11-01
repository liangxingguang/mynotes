---
id: wiki-concept-data-flow-vs-control-flow
type: concept
title: 数据流与控制流的边界（Data Flow vs Control Flow）
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - architecture
  - system-design
  - modeling
sources:
  - raw/sources/architecture/2026-10-31-xitongsiwei-02-baowen-shujuliu-kongzhiliu.md
related:
  - wiki/concepts/dfd.md
  - wiki/concepts/workflow-vs-agent.md
  - wiki/concepts/task-run-step-event-model.md
---
# 数据流与控制流的边界（Data Flow vs Control Flow）

## Definition（定义）

- **数据流**承载业务或领域实体内容，是系统需要加工、处理、生成的原材料、半成品和业务产出，目的是承载业务信息、完成业务任务。
- **控制流**承载调度、协调、管理组件执行行为的指令与信号，用来决定模块做不做、何时做、做哪一个动作，本身不承载业务主体信息。
- 区分标准是**信息的语义用途，不是传输载体**：JSON、文本、二进制都不决定分类。一句话：数据流是系统要加工的内容；控制流是指挥系统怎么干活的命令。

## Why It Matters（为什么重要）

- 同一个报文可以同时携带两类信息——"一半是数据流，一半是控制流"；建模时不拆开看，就会把该进数据流图的业务数据混进控制图，或把控制命令硬塞上 DFD。
- 这是建模的第一步：先分清信息属于哪一类，再选图表；顺序反了，图表选得再对也会画错内容。

## Core Characteristics（核心特征）

1. 载体不决定分类：同一格式（如 JSON）里可以并存控制字段与业务字段。
2. 业务数据的内容边界：订单号、用户 ID、金额、商品、支付时间、交易记录等系统要加工处理的对象。
3. 控制数据的内容边界：action 指令、timeout 超时、success/error 返回码、启停信号、分支判断、重试指令等调度与指挥信息。
4. 返回报文同样适用：`code`（执行反馈）是控制数据，`order_no`/`pay_time`（业务结果）是业务数据。
5. 判断动作是"问用途"：这条信息是系统要加工的业务内容（→数据流），还是指挥组件何时/如何/是否执行的指令（→控制流）。

## Structure（结构）

支付报文例子（请求/返回字段分类）：

| 报文字段 | 值（请求示例） | 分类 |
|---|---|---|
| action | create_payment | 控制数据（控制流） |
| timeout | 300 | 控制数据（控制流） |
| order_no | ORD20261012001 | 业务数据（数据流） |
| user_id | U10086 | 业务数据（数据流） |
| amount | 99.00 | 业务数据（数据流） |
| goods_name | 技术书籍 | 业务数据（数据流） |
| code（返回） | 成功/失败 | 控制数据（控制流） |
| pay_time（返回） | — | 业务数据（数据流） |

## How It Works（运作方式）

建模时的分步动作（据信源整理）：① 对每个字段/信息问"它是系统要加工的内容，还是指挥干活的命令"；② 业务数据进入数据流侧（见 [[dfd]]）；③ 控制指令进入控制流侧，用时序图（调用与请求应答）、活动图（步骤/分支/循环）、状态机图（状态切换）表达。

## Relationships（关系）

### Related Concepts（相关概念）

- [[dfd]]——DFD 只画数据流，不画控制流；本概念是"什么该进 DFD"的前置判断。
- [[workflow-vs-agent]]——Agent 语境下的控制流分界（路径写死在代码 vs 模型运行时动态决定），同为"控制 vs 执行"的切分思路，语境不同。

### Dependencies（依赖项）

- （当前信源未确立依赖关系）

### Distinctions（区分）

- 与 [[task-run-step-event-model]] 的不同之处在于：后者是 Agent Runtime 控制平面的四元分离（Task/Run/Step/Event），聚焦运行时状态所有权；本概念是面向建模的通用信息用途切分，"控制"指执行指令而非运行时平面（解读，两者未被同一信源直接对比）。

## Evolution（演进）

当前信源未确立该概念的历史演进；经典出处见 Evidence（DeMarco 1978 / Gane & Sarson 1979 奠定结构化分析中的这一区分）。

## Open Questions（开放问题）

（当前单一信源未确立开放问题）

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-xitongsiwei-02-baowen-shujuliu-kongzhiliu.md`（支付报文六字段分类、两条定义、返回报文分类、边界表）

## Related Knowledge（相关知识）

- [[dfd|DFD（数据流图）]]
- [[xitongsiwei-02-baowen-shujuliu-kongzhiliu|同一个报文，一半是数据流，一半是控制流（信源页）]]
- [[workflow-vs-agent|Workflow vs Agent（控制流分界）]]
