---
id: 2026-11-12-durable-agent-cloud-long-running
title: Durable Agent 详解：如何让 Agent 在云端长期稳定运行
source: 知乎
source_url: https://zhuanlan.zhihu.com/p/2099469504237642789
source_type: link
platform: 知乎
created: 2026-11-12
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026/11/durable-agent-cloud-long-running.md
wiki_status: pending
---

# Durable Agent 详解：如何让 Agent 在云端长期稳定运行

> Durable（持久可恢复执行）解决云端长期运行任务的中断续接问题：会话恢复只保证对话连续，Durable 还要保证任务执行连续——把任务进度、调用意图和执行结果可靠地保存在进程之外，在模型调用、工具执行等关键环节建立恢复边界，使进程崩溃、实例替换后任务能从正确位置继续，避免重复执行与资源浪费。以 AgentScope 的 HarnessAgent 和阿里云 AgentCore 为例，讲透持久状态机与平台托管设计。

## 核心要点

- **为什么需要 Durable**：会话记录只能说明模型提出过什么，无法证明工具内部完成了什么（"第四封邮件已被服务接受但结果未保存"无法判断重发/跳过/重做）。Durable 以已提交的逻辑边界为恢复点，先读取已提交进度再决定复用、等待、核实或启动。
- **四项保证能力**：① 已受理任务有稳定身份，重试可关联；② 已确认工作（模型/工具结果）可复用；③ 未完成工作（执行中/等待子任务/等待时间/结果不确定）有明确去向；④ 执行过程可被断线后重新观察。Durable ≠ 永不失败，外部动作也不保证恰好执行一次，失败要留下可解释、可恢复的事实。
- **AgentScope 的持久执行内核**：Session 统一管理 Conversation（对话）/Entry（不可变记录）/Document（结构化业务状态）/Task（带检查点的持久状态机：pending/running/waiting/sleeping/completing/terminal）/Submission/Commit 六类对象；同一 Commit 内原子完成记录、文档与任务变更，模型与工具调用在提交事务之外推进，串行化保证状态按序生效。
- **Task 与工具恢复**：模型生成与工具调用都是持久任务，按"保存调用意图→事务外执行→原子提交结果"推进；普通工具分 call（保存意图）与 execute（恢复入口）两阶段，只有工具声明 safe 才能重放，否则记录 interrupted；自定义任务把业务拆成子任务，用 allSettled/failFast 汇合策略与幂等操作标识（可查原操作）实现逐封邮件粒度的接续。
- **阿里云 AgentCore 的平台层**：已有 Harness 托管、中断续接与指定节点恢复；进一步以共同的 Session Store 连接原生状态与平台执行事实，把恢复节点延伸为一致性边界（调用受理、工具完成、结果入上下文三个进度分别保存）；Brain–Hands 分离让推理与工具各自拥有生命周期，Environment 提供继续执行的条件，最终走向 Agent as a Service。
- **要点**：框架负责"从哪里继续、怎样继续"，平台负责"状态保存在哪、由哪个实例继续"，外部动作的幂等与可查询是业务系统的责任，持久机制无法凭空创造。

## 正文

完整正文见采集稿：[[Assets/2026/11/durable-agent-cloud-long-running.md]]（含五封邮件故障恢复推演、Task 状态机与邮件子任务 JSON 示例、原子提交流程、AgentCore 状态层次表与六张架构图说明）。

## 来源

https://zhuanlan.zhihu.com/p/2099469504237642789

## 附件

[[Assets/2026/11/durable-agent-cloud-long-running.md]]
