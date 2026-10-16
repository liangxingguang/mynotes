---
id: 2026-10-16-ai-coding-workflow-skill-prompt
title: 一位 Agent 开发者的 AI Coding 工作流：轻 Skill、方法论 Prompt 与端到端测试
source: X（黄同学h）
source_url: https://x.com/huangtongxueh/status/2108577165306687938
source_type: article
platform: X
created: 2026-10-16
category: 技术
tags: [AI, 工程实践, 工具]
asset_ref: Assets/2026/10/x-ai-coding-workflow-huangtongxueh.md
wiki_status: pending
---

# 一位 Agent 开发者的 AI Coding 工作流：轻 Skill、方法论 Prompt 与端到端测试

> 作者（大厂 Agent 开发）分享数月实践：重型 Skill（如 Superpowers 的固定 Workflow）在强模型时代变成噪声且费 Token，趋势是"做减法"——用 grill/implement/handoff 等轻 Skill 组织流程，用"第一性原理/对抗性审查/消融实验/奥卡姆剃刀/高内聚低耦合"这类方法论短 Prompt 当模型的"思维快捷键"；工作流上靠 Spec 沉淀上下文、subagent worktree 并行、小 MR + 端到端测试兜底；核心瓶颈是 Review 速度，解法是搭建 Agent 友好的端到端测试环境（CLI + 只读 DB MCP + 日志 Skill），让问题在交到人之前被发现。

## 核心要点

1. **Skill 做减法**：模型变强后，写死流程的重 Skill 会把"没必要的一步"强制执行；一个流程重复超 3 次就让 Codex 沉淀成可复用 Skill。
2. **方法论 Prompt 替代长流程**：一句"对抗性审查，优先寻找能推翻核心假设的反例"激活的是模型已学会的一整套认知动作，胜过几百行手写 Workflow。
3. **需求对齐有尺度**：grill 追问到"剩余问题不再显著改变实现方向和验收"即停，结论沉淀到 Spec/CONTEXT.md 供多 Agent 共享。
4. **端到端测试环境是关键基建**：一键起环境、真实业务入口执行、只读库表/日志/Trace 查证；工具提供证据，但验收标准必须来自业务契约。
5. **Review 抓高风险**：权限、状态变化、并发、重试、数据一致性、迁移回滚重点看；稳定 CRUD 可跳过；新增抽象用奥卡姆剃刀再审一遍。
6. **工作流随模型迭代**：弥补旧模型短板的步骤要定期重审删除；最大瓶颈是人的 Review 带宽，不是 Agent 产能。

## 正文

详见抓取正文：[[Assets/2026/10/x-ai-coding-workflow-huangtongxueh.md]]

## 来源

- [X - 黄同学h](https://x.com/huangtongxueh/status/2108577165306687938)

## 附件

- [[Assets/2026/10/x-ai-coding-workflow-huangtongxueh.md]]
