---
id: 2026-11-23-coding-agent-software-factory
title: 如何用 Coding Agent 构建自己的软件工厂？
source: 架构师（JiaGouX）（微信公众号）
source_url: https://mp.weixin.qq.com/s/nZ1o6ibIozuP-Lbi2zTknw
source_type: article
platform: 微信公众号
created: 2026-11-23
category: 技术
tags: [AI, Agent, 系统设计]
asset_ref: Assets/2026-11/coding-agent-software-factory.md
wiki_status: ingested
---

# 如何用 Coding Agent 构建自己的软件工厂？

> 结合 Calvin Grunewald 的 archdev 设计与 Runway 软件工厂复盘，给出用现有 Coding Agent 搭建"软件工厂"的最小架构：让任务在提交后由后台执行器持续跟进检查、修复与 PR，直到交出可供人合并的交付物。

## 核心要点

1. **最小起步**：一个现有 Coding Agent + 持久任务库 + 执行器 + 仓库现成 CI，先跑通"检查失败→自动修复"一轮，再逐步扩。
2. **持久执行**：Overseer 在终端拆任务，Worker 在独立 worktree 实现，`push` 时生成绑定精确 Commit SHA 的持久 Job，后台 Daemon 接手检查/修复/PR——"已提交"变成持久待办，前台关闭也不丢。
3. **四类记录**：Task（目标/验收/依赖/进度）、Job（提交 SHA/流程配置版本）、每次运行（执行者/起止/退出原因/日志）、检查结果（SHA/基线/规则版本/结果），支持恢复与追踪。
4. **领取要原子**：选中 Job、改状态、登记运行编号放在同一事务，多执行器时用租约+续租，回写核对运行编号，拒绝旧执行覆盖新结果。
5. **外部动作必须可重复**：创建 PR 中途退出会重复，重试前按分支名查已有 PR；远端操作核对任务归属与当前版本，租约过期不等于旧进程已停。
6. **按提交验收**：检查与批准绑定具体 commit，新提交后重新核对，不能留一个永远有效的"测试通过"；用 `gh pr merge --match-head-commit` 约束合并。
7. **人工介入三步**：问题先持久化再通知人，答案关联到具体问题，恢复时把答案带进下一轮输入；合并/部署/凭据/费用等留给人。
8. **策略回放**：机制（执行程序）与策略（提示词/模型/审查规则，进版本管理）分离，用历史 PR 样本沙箱重放对比换模型、改提示词的代价。
9. **并发扩容先看慢在哪**：CI 排队可合批减重（Kun Chen 每日 PR 200→30）、人审慢看重复意见、环境启动慢看预热；用运行记录分开记时间定位。

## 正文

以"修复导出接口空结果返回 500"为贯穿示例，把任务边界写清：目标、预期行为、保持不变、验证方式、交付物。Calvin 以 Task 为工作单位拆成 Task DAG，倾向一 Task 一 PR，并需约定任务间依赖何时满足。

**持久执行**：Worker 推到本机 bare 仓库，每次 push 生成绑定 SHA 的 SQLite Job，Daemon 在临时 worktree 取出、跑仓库配置流程、推 GitHub 并跟进 CI/审查。独立 Daemon 非唯一选择，CI/托管工作流亦可承接。

**检查与修复**：流程为领取→调用 Agent 实现→执行检查→失败则保存证据修复新提交、受阻则按类型重试（指数退避+抖动，`Retry-After` 优先）、通过则建 PR 跟进远端。各 Agent CLI 均有非交互入口（gemini -p、opencode run、agent -p、copilot -p），无交互≠全权限；CLI 返回成功不能代替测试结果。修复要有停止条件（超时/轮数/预算），基础设施类故障重试而非改代码。

**领取与恢复**：每类子进程配 Supervisor 管重启与回收；状态机 queued→running→passed/failed，另有 retry_wait、superseded、waiting_human。worktree 只隔离 Git 目录，端口/数据库/凭证需另行隔离。

**按提交验收**：Runway 曾遇"批准后代码又变了、检查拒绝却强行合并"，要求在实际合并的 commit 上重新核对条件；规则自改时不用改后规则判自身。

**人工介入**：Calvin 曾 67 次暂停未通知人；改后问题入 Task、回答以评论写回、恢复时随任务下发给新 Worker。Runway 先 AI 与人并行批准、再逐步放权，首次批准等待从 2.3 小时降至约 5 分钟。

## 来源

[如何用 Coding Agent 构建自己的软件工厂？（架构师 JiaGouX）](https://mp.weixin.qq.com/s/nZ1o6ibIozuP-Lbi2zTknw)

## 附件

[[Assets/2026-11/coding-agent-software-factory.md]]
