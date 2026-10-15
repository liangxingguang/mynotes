---
id: 2026-10-15-ep-harness-team-agent-workflow
title: 如何从个人 AI Coding 到构建团队级 Agent 工作流？（得物 EP-Harness）
source: 得物技术（微信公众号，作者：方舟；dbaplus 社群转载）
source_url: https://mp.weixin.qq.com/s/yd68Wzm3za4m47LuRhMzYw
source_type: article
platform: 微信公众号
created: 2026-10-15
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/ep-harness-team-agent-workflow.md
wiki_status: pending
---

# 如何从个人 AI Coding 到构建团队级 Agent 工作流？（得物 EP-Harness）

> 得物技术介绍基于开源 Multica 二次开发的团队级 Agent 工作系统 EP-Harness：把 Agent 当作有身份、任务、状态、执行记录与权限边界的"团队成员"纳入平台管理（server 管 Issue 队列，daemon 驻开发者本机调本地 AI CLI，Backend.Execute 统一各 Runtime 契约）。核心判断：AI Coding 正沿 Prompt→Context→Harness→Loop 四层从工具使用走向工程系统，个人工具只解决前两层，团队平台补齐结构化上下文、可观测可治理的执行环境与"发现-派发-执行-验证-记录-决策"闭环。已实现决策追溯、多 Agent 分阶段协作，累计自动修复 100+ 异常日志问题，典型高频问题从每 4 小时 2400+ 条降至个位数。

## 核心要点

1. **个人 AI Coding 的团队级缺口**：Prompt 没有 Review、排查/部署经验只留个人本地无法沉淀、谁在用哪个 Agent 及成功率耗时 token 缺可见性、写完代码后的审查/部署/反馈/日志巡检靠人手动接力，价值停在局部提效。
2. **定位**：EP-Harness 是 Managed Agents 平台，基于开源 Multica 二开；Agent 有身份、任务、状态、执行记录、可见性、权限边界，以及自己的 instructions、skills、runtime 与历史产出。
3. **分层架构**：server 管工作区/Issue/成员/任务队列与实时更新；daemon 跑在开发者本机领任务、调本地 AI 编程 CLI；实际代码执行发生在本地工具链和工作目录。
4. **五句话闭环**：任务进 Issue 可追踪、规则进 Instructions/Workflow 可审查、经验进 Skills 可复用、执行进 Runtime 和日志可复盘、结果进部署/评审/反馈链路可持续闭环。
5. **统一执行契约**：`Backend.Execute(ctx, prompt, ExecOptions)` 是各 Runtime 唯一入口，`agent.New` 按 agentType+Config 选 Provider；Claude/Codex/OpenCode/ACP 保留各自协议，但对上层暴露一致的执行生命周期。
6. **四层演进**：Prompt（怎么问）→ Context（喂什么材料：Issue/需求/项目/Workflow/Skills/Runtime/飞书/运行记录在正确时机结构化进入，而非复制粘贴塞满）→ Harness（模型外补齐工作目录、规范与内部系统接入，可执行可观察可治理）→ Loop（发现/派发/执行/验证/记录/决策，价值在闭环不在循环）。
7. **Loop 实例**：上游 release 定时巡检→去重建分析 Issue→Agent 出影响/风险/迁移建议→拆迁移子任务；线上日志按窗口拉异常、聚合 fingerprint→Agent 析因→生成修复建议与后续 Issue。
8. **落地成效**：交付后凭 Issue 决策记录还原背景与取舍；交付流程拆提议/开发/评审/归档由多 Agent 协作；累计自动修复 100+ 异常日志，典型高频问题从每 4 小时 2400+ 条降到个位数。

## 正文

### 团队级缺口

直接在本地用 AI Coding 工具短期方便，团队化后暴露四个缺口：Prompt 没有 Code Review 式的把关，质量与安全性只靠个人判断；日志排查步骤、部署检查方式、开发提示词留在个人本地，经验无法跨人沉淀；Agent 使用者、模型、runtime、成功率、耗时、token 花费没有平台化可见性；Agent 写完代码后，代码审查、推送、部署、提测、CR 反馈、BUG 回流、日志巡检仍靠人手动接力，研发链路没有闭环。EP-Harness 的价值就是把这些缺口从个人习惯问题变成平台能力。

### 平台定位与架构

EP-Harness 基于开源项目 Multica（open-source managed agents platform）二次开发，进一步贴合得物内部研发流程。Multica 由三部分协作：server 管理工作区、Issue、成员、任务队列并承担实时更新；daemon 运行在开发者本机，领取任务并调用本地 AI 编程 CLI；实际代码执行发生在本地工具链与工作目录。任务不散落聊天窗口，而是进入 Issue，关联项目、需求、应用分支、工作流、评论、执行日志、文件变更和后续反馈。

技术上以 `server/pkg/agent/agent.go` 的 `Backend.Execute(ctx, prompt, ExecOptions)` 作为各 Agent Runtime 统一入口：`agent.New` 根据 agentType 与 Config 选择具体 Provider Backend，Claude、Codex、OpenCode、ACP 等实现可保留各自参数、进程与传输协议，但对上层暴露一致的执行生命周期。

### 四层演进：从工具使用到工程系统

AI Coding 的使用方式逐层外扩：从"怎么问"到"喂什么材料"，再到"如何执行和约束"，最终到"如何持续闭环"。个人工具通常只解决前两层。

- **理解真实研发现场**：通用工具不知道需求结构、飞书文档权限、应用分支创建、代码管理与发布平台流程和团队 Skills；EP-Harness 解决的不是"模型能不能写代码"，而是"模型能不能在我们的研发流程里正确工作"。
- **Prompt 团队规程化**：初期关注 prompt 技巧，长期要把 prompt 变成可维护、可 Review 的团队规程。
- **Context Engineering**：需求背景、设计文档、验收标准、关联仓库、目标分支、历史讨论、失败记录不应靠手动复制；由 Issue、需求、项目、Workflow、Skills、Runtime、飞书集成、运行记录八类来源在正确时机进入 Agent。重点不是塞满上下文，而是正确上下文在正确时机进入。
- **Harness**：裸模型没有工作目录、不懂项目测试方式、不遵守团队规范、不会自己接需求/代码/发布/飞书/日志平台；Harness 在模型外补齐工程能力，让 Agent 从"能说话的模型"变成"可管理的执行单元"。
- **Loop Engineering**：不是让 Agent 无限自跑，有价值的 Loop 必须包含发现、派发、执行、验证、记录和下一步决策，每轮都有记录、判断、产出与后续动作。

### 落地效果

- **决策追溯**：需求交付后依托 Issue 中的决策记录与实现说明，快速还原实现背景与关键取舍。
- **多 Agent 协作**：交付流程拆分为提议、开发、评审、归档等阶段，多 Agent 形成需求澄清→实现落地→质量评审→经验沉淀的闭环。
- **自动化治理**：累计自动化修复 100+ 个异常日志问题；典型高频问题由治理前每 4 小时 2400+ 条降至治理后个位数。

结语：AI Coding 第一阶段是个人把 Agent 当工具，下一阶段是团队把 Agent 当协作成员；团队需要平台把 Agent 的任务、上下文、规则、执行、审查、反馈和度量组织起来，Agent 才能从个人电脑里的助手变成研发流程中可管理、可复用、可持续优化的生产力。

## 来源

- [如何从个人AI Coding到构建团队级Agent工作流？（微信公众号·得物技术）](https://mp.weixin.qq.com/s/yd68Wzm3za4m47LuRhMzYw)

## 附件

- 抓取正文原件（采集态证据）：[[Assets/2026/10/ep-harness-team-agent-workflow.md]]
