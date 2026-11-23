---
id: wiki-source-2026-11-23-coding-agent-software-factory
type: source
title: 如何用 Coding Agent 构建自己的软件工厂？
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: medium
tags:
  - coding-agent
  - software-factory
  - architecture
sources:
  - raw/sources/ai/2026-11-23-coding-agent-software-factory.md
related:
  - wiki/concepts/software-factory.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/ai-native-sdlc.md
---
# 如何用 Coding Agent 构建自己的软件工厂？

## Overview（概览）

公众号「架构师（JiaGouX）」结合 Calvin Grunewald 的 archdev 软件工厂设计与 Runway 软件工厂工程复盘，给出用现有 Coding Agent 搭建"软件工厂"的最小架构：让任务在提交后由后台执行器持续跟进检查、修复与 PR，直到交出可供人合并的交付物。覆盖持久执行、领取与恢复、按提交验收、策略回放、人工介入与并发扩容六个环节。

## Key Facts（关键事实）

- **最小起步**：一个现有 Coding Agent + 持久任务库 + 执行器 + 仓库现成 CI，先跑通"检查失败→自动修复"一轮，再逐步扩展。
- **三角色分工**：Overseer 留在终端拆任务协调 Worker；Worker 在独立 Git worktree 实现；提交后由后台 Daemon 接手检查/修复/PR 跟进，交接点为 `archdev push`，每次 push 生成绑定精确 Commit SHA 的持久化 Job。
- **四类记录**：Task（目标/验收/依赖/进度）、Job（提交 SHA/流程配置版本）、一次运行（执行者/起止/退出原因/日志）、检查结果（SHA/基线/规则版本/结果）。
- **领取原子性**：选中 Job、改状态、登记运行编号放在同一数据库事务；多执行器用租约+续租，回写核对运行编号，拒绝旧执行覆盖新结果。
- **按提交验收**：检查与批准绑定具体 commit，新提交后重新核对；Runway 曾遇"批准后代码又变、检查拒绝却强行合并"，后要求在实际合并的 commit 上重核，用 `gh pr merge --match-head-commit` 约束。
- **人工介入三步**：问题先持久化再通知人、答案关联到具体问题、恢复时把答案带进下一轮输入；Calvin 曾 67 次暂停未通知人。
- **策略回放**：机制（执行程序）与策略（提示词/模型/审查规则，进版本管理）分离，用历史 PR 样本沙箱重放对比换模型、改提示词的代价。
- **Runway 量化**：11 月上半月抽查 100 个已合并 PR，78 个无人工提交；核心 API 仓库首次批准等待从中位 2.3 小时降至约 5 分钟；10 月合并 PR 中 38% 由云端 Agent 推进。
- **并发扩容**：Kun Chen 合批实践使每日 PR 从约 200 降至约 30，交付反而更多。

## Important Claims（重要论断）

### Claim 1：把"已提交"变成持久待办

前台会话结束不等于工作结束。`archdev push` 把提交变成绑定 SHA 的持久 Job，前台关闭后执行器仍找得到待办——这是软件工厂区别于交互式 Agent 的根本机制。

### Claim 2：无交互≠全权限，CLI 返回成功≠测试通过

各 Agent CLI 的非交互入口（`gemini -p`、`opencode run`、`agent -p`、`copilot -p`）解决"怎样从程序调用 Agent"，但进程没有终端界面不等于获得全部执行权限；CLI 返回成功也不能代替测试结果，须从 Git 读取实际提交核对。

### Claim 3：租约过期不等于旧进程已停

租约过期只说明系统允许接手，旧进程可能仍在运行。数据库拒绝旧回写拦不住它往 GitHub 发请求，因此远端操作前须核对任务归属与当前版本，外部动作须能安全重复执行。

### Claim 4：机制与策略分离让调整变便宜

Daemon 响应 Git hook、领取 Job、运行流程、记录状态（机制相对稳定）；仓库 `archdev.json` 决定事件对应流水线与提示词/模型（策略进版本管理）。规则固定后可用历史 PR 样本沙箱重放，对比换模型/改提示词的代价。

## Concepts Introduced（引入的概念）

- [[software-factory|软件工厂]]
- [[durable-execution|持久执行]]
- [[ai-native-sdlc|AI 原生 SDLC]]

## Entities Mentioned（提及的实体）

- Calvin Grunewald（archdev 软件工厂设计者）
- Runway（软件工厂工程复盘方）
- archdev（Calvin 开源的软件工厂项目）
- Kun Chen（合批 CI 架构实践者）
- [[harness-engineering|Harness Engineering]]

## Implications（影响／启示）

软件工厂把 Coding Agent 的生产力增益从"写代码"延伸到"提交后跟进"，但前提是持久执行、领取原子性、按提交验收、人工介入恢复等基础设施就位。这些机制与 [[durable-execution|持久执行]]、[[retry-governance|重试治理]]、[[ai-native-sdlc|AI 原生 SDLC]] 的框架互为表里，可作为 AI 原生 SDLC 在执行基础设施层的具体实现路径。

## Limitations（局限）

- 单信源（一篇公众号综述），虽综合了 archdev 与 Runway 两个实践，但 archdev/Runway 的具体协议细节未完全展开（如云端任务租约的完整协议）。
- Calvin 披露的策略回放比较仅 19 个案例，样本量小，反例（便宜模型删掉公共包装函数）需谨慎外推。
- Runway 的量化数据（78 个无人工提交、2.3 小时→5 分钟、38%）为官方报告自报口径，未经第三方独立验证。

## Related Knowledge（相关知识）

- [[software-factory|软件工厂]]
- [[durable-execution|持久执行]]
- [[ai-native-sdlc|AI 原生 SDLC]]

## Source（信源）

- `raw/sources/ai/2026-11-23-coding-agent-software-factory.md`
