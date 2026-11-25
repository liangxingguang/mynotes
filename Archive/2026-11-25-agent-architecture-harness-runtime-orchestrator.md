---
id: 2026-11-25-agent-architecture-harness-runtime-orchestrator
title: 一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Tce5C6XrCapOhwq7K0U39w
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [AI, Agent, 系统设计]
asset_ref: Assets/2026-11/wechat-Tce5C6XrCapOhwq7K0U39w.md
wiki_status: ingested
---

# 一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？

> 摘要：模型负责理解与推理，但要让 Agent 在真实环境把任务做完，还需要工具、状态、运行环境和执行控制。文章给出工程模型式划分：Agent = Model + Harness + Tools + Memory + Environment，拆解 Harness 的七项职责，并厘清 Harness、Runtime、Orchestrator、Framework 四个常混用概念各自回答的问题，最后以客服投诉案例串起整套架构。

## 核心要点

- **总公式**：`Agent = Model + Harness + Tools + Memory + Environment`。Model 提出判断与行动建议；Tools 提供可调用能力（但接通不等于安全可靠）；Memory 是跨步骤/跨会话保留的信息（与当轮 Context 不同）；Environment 提供运行空间与资源边界；**Harness 把这些组织成受控的可运行任务过程**。
- **Harness 七项职责**：
  1. 上下文构建（并非越长越好，需检索、筛选、摘要、补充查询）；
  2. Agent Loop（准备上下文→调用模型→判断行动→执行工具→接收反馈，但 Loop 本身不保证正确，也不提供权限/持久化/验证）；
  3. 工具路由与执行（校验参数、处理超时报错；读操作与写操作风险不同，高风险需审批，模型提出调用≠系统应无条件执行）；
  4. 状态与 Memory（长任务需持久化关键状态，避免中断丢失或重复执行）；
  5. 权限与环境控制（最小权限、沙箱、凭证隔离；提示词无法强制阻止 API 调用，限制须由执行系统落实）；
  6. 结果观察与验证（依据应来自实际执行结果或权威系统，而非模型自述）；
  7. 失败处理与停止条件（区分失败类型，副作用操作不能无限重试，需幂等键；只有达到验收条件才能报告完成）。
- **Runtime vs Harness**：Runtime 关注 Agent 在哪运行与生命周期（会话/进程、隔离环境、凭证接入、检查点恢复、资源限制）；Harness 关注模型如何用工具和反馈推进任务。两者可能交叠、甚至同属一个服务，但角度不同。
- **Execution Loop 七步**：Context 准备 → Reason 推理 → Act 检查并执行 → Observe 读取反馈 → Update 更新状态 → Verify/Recover 验证与恢复 → Finish 按完成条件结束。
- **四概念对照**：Harness 回答"单个 Agent 怎样在约束下执行并验证"；Runtime 回答"在哪里运行、如何管理生命周期"；Orchestrator 回答"多步骤/多 Agent 如何协作"（拆分任务、路由、并发、审批节点）；Framework/SDK 回答"开发者用什么接口构建"。四者非互斥，选型要看实际功能而非产品名。Orchestrator ≠ Agent Loop：Loop 是单 Agent 内部循环，Orchestrator 是跨步骤/跨执行者的调度。
- **客服投诉案例**：Orchestrator 安排查订单物流与审批分流，Runtime 提供环境与工具接入，Harness 组织上下文与权限检查，Model 决策，Tools 实际读写系统，Memory 保存进度，Environment 限制权限；超时按策略重试，超授权范围暂停走审批，最终重新查询确认操作落地。
- **构建 Harness 的五件事**：可靠性（状态可恢复、副作用幂等）、安全性（最小权限+审批）、可观测性（步骤/调用/错误可追踪）、可评估性（真实样例+验收标准）、可运营性（失败监控、人工接管、可暂停回滚）。
- **判断标准**：Agent 真正能交付=在明确权限规则内执行、根据真实结果更新状态、能处理失败、用可检查的证据确认任务完成。

## 正文

见 `[[Assets/2026-11/wechat-Tce5C6XrCapOhwq7K0U39w]]`（采集全文，约 1 万字，已通读）。文章先立总公式，再逐层拆开 Harness 的七项职责，接着讲 Agent Runtime 的生命周期管理、Execution Loop 的七步拆解，然后以对照表区分 Harness / Runtime / Orchestrator / Framework 四个概念，用客服投诉案例串起各组件协作，最后给出构建 Harness 的五项基础能力与"会行动→能交付"的判断标准。作者强调该划分是便于理解的工程模型，并非业界统一标准定义。

## 来源

- [一文搞懂 Agent 技术架构：Harness、Runtime、Orchestrator、Framework，到底有什么区别？](https://mp.weixin.qq.com/s/Tce5C6XrCapOhwq7K0U39w)

## 附件

- [[Assets/2026-11/wechat-Tce5C6XrCapOhwq7K0U39w]]
