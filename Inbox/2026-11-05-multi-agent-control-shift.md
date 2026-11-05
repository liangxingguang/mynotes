---
id: note-2026-11-05-001
title: 多 Agent 架构的三次反转：从中心调度到自驱协作
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/C9A9ZEw_EPPaFyxhKjD05A
source_type: article
platform: wechat
created: 2026-11-05
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/multi-agent-control-shift.md
wiki_status: pending
---

> 多 Agent 架构的核心不是"调用更多模型"，而是控制权放在哪里：Master Agent 集中调度、任务看板共享状态、Advisor 按需咨询，构成一条控制权逐步下沉的路径。

## 核心要点

- **两个设计边界**：上下文边界（按"看见什么/产出什么"切分 Agent，而非贴职业标签）和模型边界（小模型管"快"、大模型管"深"）
- **三种协作架构**：
  1. **Master Agent**：中心节点拆解、路由、汇总；控制流清晰，但易膨胀成"超级 Agent"
  2. **任务看板**：调度=共享状态暴露机会；Agent 主动领任务，需状态机+锁/租约+幂等保证可靠性
  3. **Advisor**：执行 Agent 自主推进，仅在高风险判断时主动征求意见；方向与 Master 相反，责任边界清晰
- **三次反转**：决策权从中心节点 → 共享状态 → 当前执行者逐步下沉
- **落地案例**：中间件巡检系统同时运用三种模式——入口 Master 做组件级路由，组件内 Inspector+看板并行分析、租约到期可接管自愈，RCA Advisor 按需解释异常根因
- **选型原则**：控制权与问题匹配——需统一顺序用编排，可并行用共享状态，专业疑问用按需咨询

## 正文

详见附件正文。要点框架：

1. **引言**：多 Agent 要解决的是四个组织问题——谁拆解、谁分配、谁判断完成、共享什么信息，本质都是控制权归属
2. **设计前提**：上下文边界决定 Agent 看见什么；模型边界决定每步投入多少能力
3. **Master Agent**：适合流程固定、依赖明确、需统一权限/顺序的场景；任务变复杂后中心负担过重
4. **任务看板**：适合任务多、并行高、执行长、需断点恢复的系统；难点在协作协议（领取竞争、崩溃回收、依赖解除、幂等）
5. **Advisor**：适合不确定性高但不值得固定编排的任务（代码审查、安全评估、方案比较）；咨询成本要控制
6. **巡检案例**：Master 只做组件级路由，Inspector 内部拆"指标+批次+时间窗"任务上看板，Worker 崩溃后租约到期由其他 Worker 接管只补做未完成批次；RCA Advisor 超时/失败时仍输出基础结论
7. **结语**：架构选择让控制权与问题匹配，随任务变化调整责任边界

## 来源

[多 Agent 架构的三次反转：从中心调度到自驱协作｜得物技术](https://mp.weixin.qq.com/s/C9A9ZEw_EPPaFyxhKjD05A)

## 附件

[[Assets/2026-11/multi-agent-control-shift.md]]
