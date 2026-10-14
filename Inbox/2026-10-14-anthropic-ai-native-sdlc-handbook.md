---
id: 2026-10-14-anthropic-ai-native-sdlc-handbook
title: Anthropic AI 原生 SDLC 实施手册
source: H中文精读（微信公众号，译自 Anthropic 博客，Louis Claxton）
source_url: https://mp.weixin.qq.com/s/Uu8-ZOswKKa8VE4sLh9uZw
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags: [AI, 工程实践]
---

# Anthropic AI 原生 SDLC 实施手册

> Anthropic Applied AI 团队的落地手册：代码不再是瓶颈后，SDLC 六阶段（规划/设计/构建/测试/部署/维护）围绕「制品提交链」intent.md→spec.md→plan.md→diff/PR→故障记录重构为闭环，AI 嵌入每一环、自动触发下一阶段，人只守在需要判断的闸门处。

## 核心要点

1. **瓶颈转移**：构建塌缩到小时级，规划、评审/测试、部署仍按人速运行，逐行评审和委员会治理承接不住 Agent 的产出速度。
2. **制品链即闭环即审计**：每阶段以提交一份制品收尾、下阶段读它开始——intent.md（意图）→spec.md（规格）→plan.md（计划）→diff+测试→带评审的 PR→故障记录；谁要求、AI 产出什么、谁批准，全程可追溯。
3. **规划/设计**：Claude 从想法、工单、告警综合出 intent.md，产品负责人以 PR 合并/关闭接受；接受即触发 Skill 非交互产出 spec.md，人批准后才进 plan 模式。衡量看意图存活率。
4. **构建**：plan 模式先访谈迭代出可独立执行的 plan.md 并提交；护栏成熟后 auto 模式逐项应用、人改为审制品；worktree 跑并行会话（按文件所有权拆任务，共享文件串行），重复活封装成子 Agent。
5. **知识三层**：CLAUDE.md（一页内，同一错误犯第二次就写入）→ Skill（建议性，承载须一致执行的政策，改动需政策负责人签字）→ Hook（确定性护栏，无例外政策靠它兜底；要人工批准的闸门归部署阶段）。
6. **测试**：会话在人看到前先自验（测试/构建/截图，每轮迭代都跑），验证器子 Agent 完成时用全新上下文跑一次；修 bug 先提交失败测试、Hook 禁止 Agent 改测试；evals 对 CLAUDE.md/Skill/Hook 变更做回归，每次生产故障补一条常驻评测。
7. **部署**：Agent 按 REVIEW.md 跑多轮评审（bug/安全/合规），人只判意图与风险，发现第二次出现就回流 CLAUDE.md；Hook 做具名人工审批闸门；claude -p 非交互进 CI/CD，部署与回滚经 MCP 白名单暴露、按环境分级自主度；回滚必须是演练最多、事先证明可用的一条命令。
8. **维护**：无头监控 Agent 按控制带诊断、写成 intent.md，经独立置信度闸门回流：小修复成 PR（提出者无权批准），架构级发现从规划重走。支配原则——Agent 可一路做到生产闸门，但不能越过它。

## 正文

### 为什么要改造

传统 SDLC 的审批闸门、评审、交接是为「写代码最贵最慢」的时代设计的：PRD、估点、安全评审存在的意义，是在长达数周的开发期里强行对齐。Agent 把代码产量成倍放大后，安全评审队列要么堆积、要么代码在评审不足下上线；例外治理仍走月度委员会议程。AI 原生 SDLC 保留原有控制目标（问责、质量、合规），只换执行机制：交接自动化、AI 嵌入每一环、流程从线性变闭环。

### 六阶段对照

| 阶段 | 传统 | AI 原生 |
|---|---|---|
| 规划 | 委员会收集、工作坊、签字、手工文档 | 从源头综合成 intent.md，人能读、机器能执行 |
| 设计 | 分析师写规格、设计师再解析 | 需求与设计压缩进同一会话，约束编码成 Skill 并版本管理 |
| 构建 | 手写代码与测试，文档后补 | AI 生成代码与测试，知识存于 CLAUDE.md 与 Skill |
| 测试 | QA 闸门卡在阶段边界 | evals 织进实现过程 |
| 部署 | 人评审每一行，治理随评审周期波动 | 多层 Agent 评审，人只审受监管/关键代码；Hook 即审批闸门 |
| 维护 | 人盯生产找 bug | Agent 监控，突破控制带即诊断并写回 intent.md |

演进路径：手工逐句提示 → 组织斜杠命令 → 被接受的制品自动触发下一闸门。各打法模块化、有前置依赖，可从任何「起点打法」开始改造。

### 规划：intent.md

意图只捕捉一次、用提出人自己的话，受版本控制。基础设施是非工程人员也能用 Claude（claude.ai/Cowork）、统一的 intent.md 模板、产品仓库里的 `intent/` 共享目录（跨仓库意图才单独建仓）。产品负责人通过 PR 合并/关闭接手，滞后指标是意图存活率（被接受 vs 被关闭）与首份 spec.md 后 intent.md 的变更频率。

### 设计：spec.md

提示指向 intent.md，产出 spec.md 作为 PR；产品负责人在工程介入前先解决被标出的政策关注点，高风险变更征询技术负责人。判断永远由人做，接受规格即进入构建阶段 plan 模式的起点。

### 构建：plan.md 与并行

- plan 模式会话读取已批准 spec.md，Claude 访谈工程师并迭代，直到「没看过对话的工程师凭计划就能实现」；plan.md 提交作审计基线，实现偏离须同次提交更新（可用 Hook 强制同步）。
- auto 模式在护栏成熟（调好的 CLAUDE.md、政策 Skill、拦截 Hook、自跑测试）且影响面小、测试覆盖时成为默认；审查从逐动作转为长自主会话后的制品审查。
- 反馈回路每轮迭代都运行；验证器子 Agent（如 verifier：启动应用、只报告不修复）在全新上下文窗口跑一次，结论不被产出代码的假设染色。
- 并行会话 = 独立 worktree 里的完整 Claude Code 实例，彼此只共享操舵工程师；两三个起步，上限是人能认真评审的流数。

### 测试：自验与持续评测

把检查包成单命令目标（make test，失败非零退出），CLAUDE.md 列出命令与健康输出样例，给出可量化目标让 Agent 不问就自查；UI 给浏览器/截图工具与草模做视觉闭环；「报告完成前先跑测试并贴输出」写入完成定义。evals 收集 20–50 个真实任务及可接受判据，在 CI 非交互运行：定时跑 + CLAUDE.md/.claude 配置变更时跑，通过率下降的配置变更合入前必须评审。

### 部署：评审、闸门、CI/CD

- 所有 PR 走相同评审轮次，发现按严重度排序；REVIEW.md 定义 Important/Nit 标准与 Nit 上限（如五条），生成代码和 CI 已管的不报。@claude 处理评审意见，自定义斜杠命令可让其看护 PR 到全绿、只等代码负责人批准。写代码的 Agent 没有任何途径批准自己。
- 审批闸门表达成 PreToolUse Hook（allow/ask/block）：生产部署需具名发布授权，拦截信息须自解释（理由+获取审批路径）。团队 Hook 进 git，不可商量的 Hook 进管理员托管设置，个人无法关闭。
- 受监管企业可用托管设置全套组合：权限 allow/deny、禁绕过、沙箱+域名白名单、凭据隔离、仅托管 Hook/MCP/插件市场、最低版本锁定。
- CI/CD 从只读判断步骤（分诊失败构建、总结 flaky 测试）起步，写操作一律以 PR 经分支保护进入，无直推 main 路径；Agent 任务跑在短时受限令牌的沙箱容器里。开发环境可自由部署，预发布居中，生产由发布经理授权 + Hook 强制。

### 维护：闭环自馈

触发器是定时工作流、监控 webhook 或内部定时任务；Claude 无状态、非交互运行（CI runner 步骤或沙箱内 Agent SDK），可在无人发动时自行开始与结束。诊断按 intent.md 格式写（异常与证据、期望结果、受影响系统、待解问题），服务负责人分诊队列；驳回须写理由并用于调优控制带降噪。Claude Tag（工单/频道中 @）做同样的分诊，使闭环自我供给。发现可导出 CSV/Markdown/webhook 进既有审计系统。

### 遗留系统与事实来源

Jira、ServiceNow、Figma、变更委员会不必被取代：对每种制品指定唯一事实来源——仓库为准（遗留系统引用文件）、遗留系统为准（Markdown 是工作副本，经 MCP 写回）、或互相挂链（记录 ID ↔ commit SHA）作为过渡最低标准。

### 衡量思路

每个打法都给先行/滞后指标，且全部取自现成系统：PR 元数据（首评时延、返工轮次、一次合入率）、CI（首次通过率、evals 趋势）、故障跟踪（变更失败率、闸门逃逸数）、OpenTelemetry（并发会话数、闸门等待时长）、DORA 指标。

相关笔记：[[2026-10-14-ai-native-rd-org-alibaba]]（AI 原生研发组织）、[[2026-10-14-jd-haibo-ai-knowledge-base]]（CLAUDE.md 之外的知识库/上下文工程）、[[2026-10-14-pi-secondary-dev-5-layers]]（Skill/MCP/扩展分层）。

## 来源

- 微信公众号 · H中文精读（译文）：[Anthropic AI-Native SDLC｜AI原生软件开发生命周期实施手册](https://mp.weixin.qq.com/s/Uu8-ZOswKKa8VE4sLh9uZw)
- 英文原文：[The AI-Native SDLC playbook — Anthropic, Louis Claxton, 2026-08-21](https://claude.com/blog/the-ai-native-sdlc-playbook)

## 附件

无
