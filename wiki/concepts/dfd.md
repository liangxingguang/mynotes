---
id: wiki-concept-dfd
type: concept
title: DFD（数据流图，Data Flow Diagram）
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
  - wiki/concepts/data-flow-vs-control-flow.md
  - wiki/concepts/control-plane-design.md
---
# DFD（数据流图，Data Flow Diagram）

## Definition（定义）

DFD（数据流图）描述业务数据从哪里来、到哪里去、被哪个加工处理。设计目标明确：**不关心执行时序，不关心分支，不关心调用命令**。标准 DFD 的元素只有四类：外部实体、加工、数据存储、数据流。

## Why It Matters（为什么重要）

- 它是结构化分析的经典建模工具（信源引 DeMarco 1978、Gane & Sarson 1979 为经典来源）。
- "什么该画进 DFD"由 [[data-flow-vs-control-flow]] 的分界决定：业务数据画进来，控制命令画进来即为错。
- 三个高频画错点（加工写成系统名、读写不分、漏返回流）是评审中"这个不该画/漏了"类意见的主要来源。

## Core Characteristics（核心特征）

1. 四类元素：外部实体、加工、数据存储、数据流。
2. 加工写"对数据做什么"（如"创建支付单""查询支付结果"），不写系统名（"支付网关"是系统不是加工）。
3. 数据流标清读还是写：同一份"支付记录"写进去和读出来是两条不同的流，都要画。
4. 返回流不能漏：数据出去要有结果回来，只画单向的图不完整。
5. 不画控制流：`action`、`timeout`、`success` 这类控制命令不会出现在 DFD 上，它们属于控制流，用时序图/活动图/状态机图表达。
6. 加工常对应数据操作的两类基本动作：创建（写）与查询（读）。

## Structure（结构）

四类元素 + 支付例子的 0 层 DFD（据信源正文）：图中两个加工分别为"创建（写）"与"查询（读）"，对应数据操作最常见的两类；"支付记录"数据存储兼有写流与读流。原文配图在采集时为 1px SVG 占位符，图的完整拓扑无法核验（见信源页 Limitations）。

## How It Works（运作方式）

绘制顺序（据信源收尾论断整理）：① 先对每条信息做数据流/控制流分界（见 [[data-flow-vs-control-flow]]）；② 业务数据按四类元素画进 DFD，标清读/写与返回流；③ 控制指令不入 DFD，改画时序图（调用与请求应答）、活动图（步骤/分支/循环）、状态机图（状态切换）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[data-flow-vs-control-flow]]——数据流/控制流分界是"什么该画进 DFD"的前置判断。

### Dependencies（依赖项）

- （当前信源未确立依赖关系）

### Distinctions（区分）

- 与 [[control-plane-design]] 的不同之处在于：DFD 是业务数据的流动与加工建模（数据从哪来到哪去），控制面分离是 DDD 场景下规则面与寻优计算面的工程拆分；两者都处理"控制 vs 业务"的切分，但粒度与用途不同（解读，两者未被同一信源直接对比）。

## Evolution（演进）

经典来源：DeMarco, T.（1978）《Structured Analysis and System Specification》（确立数据流、加工、数据存储、外部实体四类元素）；Gane & Sarson（1979）为另一套 DFD 表示法。后续演进当前信源未确立。

## Open Questions（开放问题）

（当前单一信源未确立开放问题）

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-xitongsiwei-02-baowen-shujuliu-kongzhiliu.md`（四类元素、三个画错点、不画控制流、经典文献引用）

## Related Knowledge（相关知识）

- [[data-flow-vs-control-flow|数据流与控制流的边界]]
- [[xitongsiwei-02-baowen-shujuliu-kongzhiliu|同一个报文，一半是数据流，一半是控制流（信源页）]]
- [[system-thinking-album|《系统思维》专辑目录]]
