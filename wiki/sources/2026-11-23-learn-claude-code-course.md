---
id: wiki-source-2026-11-23-learn-claude-code-course
type: source
title: 8 万星的教学项目：手写一个 mini Claude Code
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - source
  - ai-agent
  - harness
  - tutorial
sources:
  - raw/sources/ai/2026-11-23-learn-claude-code-course.md
related:
  - wiki/entities/learn-claude-code.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-loop.md
---
# 8 万星的教学项目：手写一个 mini Claude Code

## Overview（概览）

微信公众号深度导读，介绍开源课程 `shareAI-lab/learn-claude-code`（79.6k Star、MIT、主语言 Python）。文章把课程的三句主张、17 节三段编排、最小骨架（s01 12 行 `while True` 循环）与局限取舍讲透，核心是把 Claude Code 拆成可单独复用的设计零件，主张"循环不变，harness 万变"。

## Key Facts（关键事实）

- `shareAI-lab/learn-claude-code`：79.6k Star、12.7k Fork、62 位贡献者、MIT、主语言 Python、最后推送 2026-10-27。
- 三句主张：Agency 来自模型不来自编排代码；Agent 产品 = 模型 + harness（工具/知识/观察/动作接口/权限五件套）；harness 全部秘密是一个 `while True` 循环。
- 三段编排：s01–s04 能动（循环+Bash、`TOOL_HANDLERS`、`PermissionRule`、hooks）；s05–s09 扛复杂（TodoWrite、子代理、技能按需加载、压缩四级阶梯、记忆三子系统）；s10–s17 跑长跑久（任务图、后台线程、cron、多 agent 四件套、MCP、runtime、断点恢复、目标闸门）。
- 最小骨架四步：发 `messages/tools/system` → 看有无 `tool_use` 块（无即终止）→ 按 `block.name` 查分发表执行 → 工具结果以 user 角色回灌带 `tool_use_id` 对账。
- s17 目标闸门：循环能否停交给独立评估器，目标不可达/失败/超限交还用户。
- 局限：教学实现非生产代码（无重试/流式/超时/并发安全/provider 适配）；绑死 Python + Anthropic 接口形态；无 Release 仅 commit，旧 12 节与新 17 节编号不对应（旧 s03=新 s05、旧 s06=新 s08）；跑课要真花 token。

## Important Claims（重要论断）

### Claim 1

Agent 的自主性来自模型而非编排代码：把 LLM 调用串成 if-else 流程图、节点图、prompt 瀑布，产出的不是 agent，是一台绕来绕去的自动售货机。谁决定下一步、谁决定什么时候停，全是模型；代码只做搬运。

### Claim 2

工具是注册进去的，不是写死进去的——一旦工具和循环耦合，每加一个能力就得改主干，最后没人敢动。权限和 hooks 的顺序是"先划边界，再给自由"。

### Claim 3

多 agent 的难点从来不在并发，在任务归属和上下文边界；让 agent 自己判断"我做完了"是最危险的一步，得有个外部裁判（s17 目标闸门）。

## Concepts Introduced（引入的概念）

- [[learn-claude-code|learn-claude-code]]
- [[harness-engineering|Harness Engineering]]（三句主张互证）
- [[agent-loop|Agent Loop]]（s01 最小循环是其最小可运行实现）
- [[context-management|上下文管理]]（s07/s08 教学落地）

## Entities Mentioned（提及的实体）

- [[learn-claude-code|learn-claude-code]]
- [[learn-harness-engineering-course|Learn Harness Engineering]]（同门 harness 课程实体）
- 解读：Claude Code、Kode CLI、Kode Agent SDK 为被拆解/同门项目，当前未建独立实体页。

## Implications（影响／启示）

「循环不变，harness 万变」是一条可复用的设计纪律：所有扩展（工具、知识、压缩、权限、hooks、子代理）都作为循环外挂件接入，不改循环主体，保证主干稳定可维护。s17 目标闸门的"外部裁判判终止"思路，对任何长循环 agent 的停止判定都有借鉴价值。

## Limitations（局限）

- 单信源导读，机制描述基于信源对仓库的解读，未直接核验仓库源码与各章 `code.py`。
- 教学实现非生产代码，无重试/流式/超时/并发安全等生产必需能力。
- 版本在迁移中，旧 12 节与新 17 节编号不对应，按编号检索易对错。
- 采集稿配图多为 1px 占位符，原文截图未留存。

## Related Knowledge（相关知识）

- [[learn-claude-code|learn-claude-code]]
- [[harness-engineering|Harness Engineering]]
- [[agent-loop|Agent Loop]]
- [[learn-harness-engineering-course|Learn Harness Engineering]]

## Source（信源）

- `raw/sources/ai/2026-11-23-learn-claude-code-course.md`
