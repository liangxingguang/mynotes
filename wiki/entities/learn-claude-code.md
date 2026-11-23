---
id: wiki-entity-learn-claude-code
type: entity
title: learn-claude-code
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - entity
  - ai-agent
  - tutorial
  - harness
sources:
  - raw/sources/ai/2026-11-23-learn-claude-code-course.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/context-management.md
  - wiki/concepts/mcp.md
  - wiki/concepts/agent-evaluation.md
  - wiki/entities/learn-harness-engineering-course.md
---
# learn-claude-code

## Overview（概览）

`shareAI-lab/learn-claude-code` 是 GitHub 上的一门开源教学项目，用 17 节课手写一个 mini Claude Code，副标题「Bash is all you need」。79.6k Star、12.7k Fork、62 位贡献者、MIT 协议、主语言 Python，最后推送 2026-10-27（仍在生长）。核心主张：Agent 的自主性来自模型而非编排代码，harness = 工具+知识+观察+动作接口+权限，其全部秘密是一个 `while True` 循环。

## Identity（身份信息）

- Type（类型）: 开源教学项目 / 课程（手写 mini Claude Code）
- Organization（所属组织）: shareAI-lab
- Role（角色）: 把 Claude Code 拆成可单独复用的设计零件的 harness 工程课
- Status（状态）: 活跃（无 Release，仅 commit，51 个 open issue；从 12 节扩到 17 节，根目录 `s01`–`s17` 为正典）

## Important Facts（重要事实）

- **规模**：79.6k Star、12.7k Fork、62 位贡献者、MIT 协议、主语言 Python（仓库约 94.5 万字节，课程站 TypeScript 约 39 万），最后推送 2026-10-27。
- **三句主张**：① Agency 来自模型，不来自编排代码（模型是司机，代码是车）；② Agent 产品 = 模型 + harness（工具、知识、观察、动作接口、权限五件套）；③ harness 的全部秘密是一个 `while True` 循环，16 节课都只在循环外挂件。
- **三段编排（17 节，按能力线非难度排）**：
  - s01–s04 先能动——单一循环+Bash、`TOOL_HANDLERS` 工具分发表、`PermissionRule` 权限流水线、Pre/PostToolUse hooks（先划边界再给自由）。
  - s05–s09 扛复杂——TodoWrite 计划、子代理（独立 `messages[]`）、技能按需加载、上下文压缩四级阶梯、记忆三子系统。
  - s10–s17 跑长跑久——磁盘任务图（`blockedBy` 依赖）、后台线程+通知队列、cron、多 agent 协作四件套（常驻队友/原子认领/任务绑定 worktree/类型化协议）、MCP 工具池、完整 runtime、编排脚本与断点恢复、目标闸门。
- **最小骨架（s01 仅 12 行）**：发 `messages/tools/system` → 看响应有无 `tool_use` 块（没有即终止，无"任务完成"判断）→ 按 `block.name` 查分发表执行 → 工具结果以 user 角色回灌并带 `tool_use_id` 对账。自主性不写在任何一行代码里，代码只做搬运。
- **核心纪律**：「循环不变，harness 万变」——加工具改分发表、加知识改 system 目录、压缩插在 append 后、权限 hooks 包在执行外、子代理是新起一份 messages 再跑一遍循环。
- **s17 目标闸门**：循环能否停，交给独立评估器判断，目标不可达/失败/超限交还用户；让 agent 自己判断"做完了"是最危险的一步。
- **快速开始**：`git clone` → `pip install -r requirements.txt` → 填 `ANTHROPIC_API_KEY` → 各章 `code.py` 独立可跑（建议按 s01→s02→s03 顺序读）；每章有英/中/日三份 README；课程站 learn.shareai.run 提供 reading/source/simulator/architecture 四种视图。
- **同门项目**：Kode CLI、Kode Agent SDK（作者给的下一站，非可直接 `pip install` 的框架）。
- **链接**：仓库 https://github.com/shareAI-lab/learn-claude-code ｜课程站 https://learn.shareai.run

## Products / Projects（产品／项目）

- [[learn-harness-engineering-course|Learn Harness Engineering]]（同为 harness 工程课程实体，可互参）

## Relationships（关系）

- [[harness-engineering|Harness Engineering]]：本课程是 Harness 工程的教学实现样例，三句主张与该概念定义互证。
- [[agent-loop|Agent Loop]]：s01 的 12 行最小循环是 Agent Loop 的最小可运行实现，"无 tool_use 即终止"印证停止信号的模型侧判据。
- [[context-management|上下文管理]]：s08 上下文压缩四级阶梯、s07 技能按需加载是该概念的教学落地。
- [[mcp|MCP]]：s14 把外部工具装进同一工具池、命名空间区分，是 MCP 接入的教学样例。
- [[agent-evaluation|业务 Agent 全生命周期评测]]：s17 目标闸门（独立评估器判断循环能否停）是该评测理念在循环终止环节的落地。

## Timeline（时间线）

- 2026-10-27 — 仓库最后推送（信源时点）。
- 2026-11-23 — 深度导读采集入库，确立其三句主张、三段编排、最小骨架与 s17 目标闸门。

## Current Understanding（当前认知）

本课程的最大贡献是把 Claude Code 从不可拆的黑盒拆成十七个可单独复用的设计决定，主张"循环不变、harness 万变"。其教学实现砍掉了重试/流式/超时/并发安全/provider 适配，绑死 Python + Anthropic 接口形态，是 0 到 1 的 harness 工程课而非生产代码；读法上每节问"在自己项目里加这个机制的最小改动是什么"比抄 `code.py` 更有用。当前为单信源导读，机制描述基于信源对仓库的解读，未直接核验仓库源码，置信度中。

## Evidence（证据）

- `raw/sources/ai/2026-11-23-learn-claude-code-course.md`
