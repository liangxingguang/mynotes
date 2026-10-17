---
id: wiki-source-ai-native-sdlc-playbook
type: source
title: Anthropic AI 原生 SDLC 实施手册（The AI-Native SDLC playbook）
status: active
created: 2026-10-17
updated: 2026-10-17
confidence: high
tags:
  - ai
  - engineering-practice
  - sdlc
sources:
  - raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md
related:
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/ai-native-organization.md
---
# Anthropic AI 原生 SDLC 实施手册（The AI-Native SDLC playbook）

## Overview（概览）

Anthropic Applied AI 团队的落地手册（Louis Claxton，英文原文 2026-08-21；本信源为 H中文精读 2026-08-28 中文译文）：当 Agent 编码让构建阶段塌缩到小时级，传统 SDLC 的审批闸门、逐行评审与委员会治理承接不住，需把规划/设计/构建/测试/部署/维护六阶段围绕「制品提交链」重构为闭环——AI 嵌入每一环、被接受的制品自动触发下一阶段，人只守在需要判断的闸门处。

## Key Facts（关键事实）

- 核心机制：每个阶段以提交一份制品收尾、下一阶段以读取它开始——intent.md（意图）→ spec.md（规格）→ plan.md（计划）→ diff 及其测试 → 带评审发现的 PR → 故障记录；提交链同时是审计轨迹（谁要求、AI 产出什么、谁批准）。
- 知识三层分工：CLAUDE.md（控制在一页内，"同一错误犯第二次就写入"）→ Skill（建议性控制，承载须一致执行的政策，改动需政策负责人签字）→ Hook（确定性控制，无例外政策靠它兜底；Skill 让违规罕见，Hook 让违规几乎不可能）。
- 规划：intent.md 只捕捉一次、用提出人自己的话、受版本控制；产品负责人以 PR 合并/关闭接受或拒绝；滞后指标是意图存活率。
- 设计：接受 intent.md 后由 Skill 引导产出 spec.md（可固化为非交互触发）；高风险变更征询技术负责人，判断永远由人做。
- 构建：plan 模式为默认起点，迭代到"没看过对话的工程师凭计划就能实现"；plan.md 提交作审计基线，实现偏离须同次提交更新；auto 模式在护栏成熟（调好的 CLAUDE.md、政策 Skill、拦截 Hook、自跑测试）且影响面小时成为默认；并行会话=独立 git worktree 的完整实例（两三个起步，上限是人能认真评审的流数）；重复活封装为 .claude/agents/ 下的子 Agent。
- 测试：反馈回路每轮迭代都运行（测试/构建/截图，包成 make test 单命令、失败非零退出）；验证器子 Agent 在完成时用全新上下文跑一次；修 bug 先提交失败测试、Hook 禁止 Agent 改测试文件；evals 收集 20–50 个真实任务在 CI 非交互运行，CLAUDE.md/.claude 配置变更时触发，每次生产故障补一条常驻评测。
- 部署：REVIEW.md 定义评审轮次（bug/安全/合规）与 Important/Nit 标准及 Nit 上限（如五条）；写代码的 Agent 没有任何途径批准自己；审批闸门表达为 PreToolUse Hook（allow/ask/block），生产部署需具名发布授权；面向受监管企业的托管设置含权限 allow/deny、禁绕过、沙箱+域名白名单、凭据隔离、仅托管 Hook/MCP/插件市场、最低版本锁定；claude -p 非交互进 CI/CD，写操作一律以 PR 经分支保护进入；部署/状态/回滚经 MCP 白名单按环境分级暴露；回滚必须是演练最多、事先证明可用的一条命令。
- 维护：确定性检测脚本（滚动基线 + Western Electric 规则）监控控制带，1σ 记日志、2σ 只读诊断、3σ 可提 PR 或触发预批准操作手册；诊断按 intent.md 格式写回闭环，服务负责人分诊；Claude Security 定时扫描（Mythos 5，按用量计费，公开测试）；Claude Tag（Slack 公开测试）在频道/工单中 @ 分诊。
- 支配原则：Agent 可以一路做到生产闸门，但不能越过它。
- 遗留系统：对每种制品指定唯一事实来源——仓库为准 / 遗留系统为准 / 互相挂链（记录 ID ↔ commit SHA）作为过渡最低标准。
- 衡量：先行/滞后指标全部取自现成系统——PR 元数据、CI、故障跟踪、OpenTelemetry 导出、DORA 指标。

## Important Claims（重要论断）

### Claim 1：瓶颈从构建转移到其两侧

构建塌缩到以小时计后，规划、评审/测试、部署仍按人速运行；逐行手工评审与例外治理的委员会模式在 Agent 产出速度下难以为继。

### Claim 2：保留控制目标，只换执行机制

AI 原生 SDLC 不取消问责、质量、合规目标，而是把交接自动化、让治理在 AI 动作发生的当下被执行（Hook 即审批闸门），流程从线性变闭环。

### Claim 3：驾驭 Agent 的配置应享有代码同等的回归测试

CLAUDE.md、Skill、Hook 的变更要跑 evals 套件；通过率下降的配置变更合入前必须评审。

### Claim 4：人的判断居于闸门处

凡是需要判断的决定最终责任仍由人承担；人的注意力随"必须被评审的制品"转移，从逐动作审查转向长自主会话后的制品审查。

## Concepts Introduced（引入的概念）

- [[ai-native-sdlc|AI 原生 SDLC]]

## Entities Mentioned（提及的实体）

- Anthropic（Applied AI 团队；Louis Claxton）
- Claude Code / Claude Design (beta) / Claude Security / Claude Tag（均为 Anthropic 产品能力，文中作为打法载体）

## Implications（影响／启示）

- 制品链（intent/spec/plan/diff/PR/故障记录）提供了一种把"AI 产出"纳入审计与问责的具体设计，可直接对照 [[ai-native-organization|AI 原生研发组织]] 中"目标、权限、验收、追责尚无统一做法"的开放问题。
- CLAUDE.md→Skill→Hook 的三层控制模型（建议性→确定性→闸门）是 Agent 护栏设计的可复用分层。

## Limitations（局限）

- 厂商第一方手册：打法以 Anthropic 自家产品（Claude Code、托管设置、Claude Security/Tag）为载体，向其他 Agent 栈迁移需自行抽象。
- 中文译文为二手转译，细节以英文原文为准；文中多处产品能力标注 beta/公开测试。
- 衡量指标给出口径但无公开的前后对照数据，成效未经第三方验证。

## Related Knowledge（相关知识）

- [[ai-native-sdlc|AI 原生 SDLC]]
- [[ai-native-organization|AI 原生研发组织]]
- [[mcp|MCP]]（部署能力经 MCP 白名单暴露；遗留系统经 MCP 写回）

## Source（信源）

- `raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md`
