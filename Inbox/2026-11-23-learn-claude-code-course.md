---
id: 2026-11-23-learn-claude-code-course
title: 8 万星的教学项目：手写一个 mini Claude Code
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/S9qKe-pMM3130Ha1hN_6UA
source_type: 网页
platform: 微信
created: 2026-11-23
category: 学习
tags: [AI, Agent]
asset_ref: Assets/2026-11/weixin-s9qke-pmm3130ha1hn-6ua.md
wiki_status: pending
---

# 8 万星的教学项目：手写一个 mini Claude Code

> 介绍开源课程 shareAI-lab/learn-claude-code（79.6k Star、MIT 协议、主语言 Python）：用 17 节课手写一个 mini Claude Code，副标题 "Bash is all you need"。核心主张——Agent 的自主性来自模型而非编排代码，harness = 工具+知识+观察+动作接口+权限，其全部秘密是一个 `while True` 循环；课程按"能干活→扛复杂→跑长跑久"三段编排，把 Claude Code 拆成可单独复用的设计零件。

## 核心要点

1. **三句主张**：① Agency 来自模型，不来自编排代码（模型是司机，代码是车）；② Agent 产品 = 模型 + harness（工具、知识、观察、动作接口、权限五件套）；③ harness 的全部秘密是一个 `while True` 循环，16 节课都只在循环外挂件，不改循环。
2. **课程编排（17 节，按能力线非难度排）**：s01–s04 先能动——单一循环+Bash、`TOOL_HANDLERS` 工具分发表、`PermissionRule` 权限流水线、Pre/PostToolUse hooks（先划边界再给自由）；s05–s09 扛复杂——TodoWrite 计划、子代理（独立 `messages[]`）、技能按需加载、上下文压缩四级阶梯、记忆三子系统；s10–s17 跑长跑久——磁盘任务图（`blockedBy` 依赖）、后台线程+通知队列、cron、多 agent 协作四件套（常驻队友/原子认领/任务绑定 worktree/类型化协议）、MCP 工具池、完整 runtime、编排脚本与断点恢复、目标闸门。
3. **最小骨架（s01 仅 12 行）**：四步循环——发 `messages/tools/system` → 看响应有无 `tool_use` 块（没有即终止，无"任务完成"判断）→ 按 `block.name` 查分发表执行 → 工具结果以 user 角色回灌并带 `tool_use_id` 对账。自主性不写在任何一行代码里，代码只做搬运；加工具改分发表、加知识改 system 目录、压缩插在 append 后、权限 hooks 包在执行外、子代理是新起一份 messages 再跑一遍循环——"循环不变，harness 万变"。
4. **局限**：教学实现非生产代码（无重试/流式/超时/并发安全），上线下一站是同门 Kode CLI 与 Kode Agent SDK；绑死 Python + Anthropic 接口形态（换 provider 要先改协议层）；无 Release 仅 commit，12 节旧编号与 17 节新编号不对应（旧 s03=新 s05、旧 s06=新 s08），读前认准根目录 `s01`–`s17`；每节实跑要真花 token 钱。
5. **读法建议**：每节读完问"在自己项目里加这个机制的最小改动是什么"，比抄 `code.py` 有用。s01–s04 人人该读（骨架）；s05–s09 写业务 agent 必读；s10–s17 仅多 agent 平台需要，但 s17"目标闸门"（独立评估器判断循环能否停，目标不可达/失败/超限交还用户）值得任何人抄走。

## 正文

文章是对 GitHub 课程 **shareAI-lab/learn-claude-code** 的深度导读（79.6k Star、12.7k Fork、62 位贡献者、最后推送 2026-10-27，仍在生长）。Claude Code 被拆成十来个零件：一个循环、一堆工具、按需加载技能、上下文压缩、子代理、带依赖图的任务系统、异步邮箱、任务绑定 worktree、权限治理、hooks、记忆、MCP 路由——零件再多都挂在同一循环外。

**三段学习路径**：

- **s01–s04 先让它能动**：s01 单循环+shell（"One loop & Bash is all you need"）；s02 工具扩到多个靠 `TOOL_HANDLERS` 分发表（加工具=加分发项，循环一行不动）；s03 `PermissionRule` 流水线判定能跑/须停/要审批；s04 PreToolUse/PostToolUse 两个 hooks 切点（"Hook around the loop, never rewrite the loop"）。核心收获：工具是注册进去的，不是写死的。
- **s05–s09 扛住复杂任务**：s05 TodoWrite（"An agent without a plan drifts"）；s06 子代理交回最后一段文本；s07 技能先给目录、要用才展开（检索与加载是两件事，选加载）；s08 压缩四级阶梯 `tool_result_budget`→`snip_compact`→`micro_compact`→`compact_history`（能截断就别摘要）；s09 记忆的选择/抽取/固化。主题是"隔离"与"上下文是预算，不是垃圾桶"。
- **s10–s17 跑长、跑久、跑成队**：s10 `TaskRecord`+`blockedBy` 任务图；s11 慢操作丢后台线程、完成塞通知队列回灌循环；s12 cron 定时触发；s13 多 agent 协作四件套；s14 MCP 接入同一工具池（命名空间区分）；s15 装配完整 runtime；s16 编排形状固定后写进脚本（生命周期事件+journal 断点恢复）；s17 目标闸门——循环能否停交给独立评估器，最危险的是让 agent 自己判断"做完了"。多 agent 难点在任务归属与上下文边界，不在并发。

**快速开始**：`git clone` 后 `pip install -r requirements.txt`、填 `ANTHROPIC_API_KEY`，各章 `code.py` 独立可跑（建议按 s01→s02→s03 顺序读）；每章有英/中/日三份 README；课程站 learn.shareai.run 提供 reading/source/simulator/architecture 四种视图。

**项目地址**：仓库 https://github.com/shareAI-lab/learn-claude-code ｜课程站 https://learn.shareai.run ｜同门：Kode CLI、Kode Agent SDK。

## 来源

[8 万星的教学项目：手写一个 mini Claude Code](https://mp.weixin.qq.com/s/S9qKe-pMM3130Ha1hN_6UA)

## 附件

[[Assets/2026-11/weixin-s9qke-pmm3130ha1hn-6ua.md]]
