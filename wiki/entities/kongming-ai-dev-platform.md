---
id: wiki-entity-kongming-ai-dev-platform
type: entity
title: 孔明（AI 研发平台）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - entity
  - ai
  - dev-platform
sources:
  - raw/sources/enterprise/2026-10-28-ai-native-dev-org-transformation.md
related:
  - wiki/concepts/ai-native-organization.md
  - wiki/entities/aibox.md
---
# 孔明（AI 研发平台）

## Overview（概览）

某教育产品百人研发团队完全从 0 自建的 AI 研发平台，覆盖需求、设计、开发、评审与验证；与面向日常工作的「墨子」（找资料/用知识/排查问题）构成该团队 AI 体系的工具线。其版本阶梯与组织演进（PO → 全栈 → RDO）同步扩张。

## Identity（身份信息）

- Type（类型）: 企业自研 AI 研发交付平台
- Organization（所属组织）: 未知（信源未披露公司名称；业务语境为教育产品）
- Role（角色）: 研发交付 Harness：承接被组织扩大后的个人责任
- Status（状态）: 生产中（2026-10，月度普及率 70.2%）

## Important Facts（重要事实）

- 版本阶梯：Fly（2025 年五六月，验证想法→可用应用完整路径）→ Pro（2026 上半年，单服务后端，首版打磨约 3 个月、一次版本回测三四天）→ Max（前后端+联调+评估修复的单服务全流程，半自动编排）→ Fast（小改动轻量链路，约 3000 行改动经验边界）→ Flow（阶段自动推进、评估修复串联，人只做决策点）→ Ultra（多服务协作：全局设计/接口约定/共同环境/端到端验证，孔明 Bot 记录关联并通知相关人）；Auto（多服务更高自动化）在规划中。
- 架构原则：程序管确定性（状态、流程顺序、资源检查、结果记录），模型管判断（需求理解、代码分析、方案生成）；上下文按阶段与相关范围加载；实现/验证/修复职责分离。
- 知识底座：项目知识库（代码结构、业务流程、工程约束）+ 研发知识图谱（从代码抽取服务与调用关系，支撑跨服务影响分析）。
- 配套质量/环境体系：API 自动测试平台、AI 自动化测试平台、星枢共同测试环境。
- 效果（团队口径）：80 个项目纯编码 354.5 vs 人工评估 741.0 人日（-52.2%）；月度普及率 9.8% → 70.2%（2026 年 3–9 月）。

## Relationships（关系）

- [[aibox|AiBox]]：同类——企业自建 AI Coding Harness 收口工具与流程（货拉拉千人规模 vs 本团队百人规模）
- 墨子：同团队姊妹系统，覆盖研发之外的日常工作
- [[ai-native-organization|AI 原生研发组织]]：孔明是该概念"工具线承接组织责任扩张"的实例

## Timeline（时间线）

- 2025-05/06 — 早期探索与孔明 Fly 验证完整路径
- 2026 H1 — 孔明 Pro 启动研发，约三个月打磨至"反复可靠"
- 2026-03/04 — 组织引入 PO；孔明普及率约 9.8%
- 2026-07 — 全栈推进（9 月扩大），对应 Max/Fast 能力补齐
- 2026-09 — 普及率达 70.2%，全程周期降至 14.6 天
- 2026-10 — 信源发布；RDO + Ultra 试点、Auto 规划中

## Current Understanding（当前认知）

孔明是"工具跟着组织步伐逐级扩展"策略的完整样本：每个版本对应组织责任范围的一次扩张，而非技术驱动的大而全建设。其"约 3000 行改动"的轻量链路边界与"首版三个月打磨期"是少见的公开经验数字。全部信息来自团队单方复盘，无第三方核验。

## Evidence（证据）

- `raw/sources/enterprise/2026-10-28-ai-native-dev-org-transformation.md`
