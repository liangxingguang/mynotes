---
id: 2026-11-25-ai-native-engineering
title: AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/Hh0I_3sU8TI-2i2-x4pAEA
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [AI, Agent, 系统设计]
asset_ref: Assets/2026-11/wechat-Hh0I_3sU8TI-2i2-x4pAEA.md
wiki_status: ingested
---

# AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程

> 摘要：AI Coding Agent 已能理解项目、修改代码、执行测试，作者提出 AI-Native Engineering 理念：AI 时代真正要改的不是编码方式，而是整个软件研发体系。核心是六个 First 原则——文本、命令行、结构化、可执行、可验证、版本管理优先，并给出贯穿研发生命周期的落地实践与三阶段建设路径。

## 核心要点

- **问题**：AI 已能参与整个研发流程，沿用以人工操作为中心的研发模式（Word 需求、Excel 测试用例、Visio 架构图、大量 UI 操作）显得割裂，每次都要向 AI 重复解释项目背景与约束。
- **六个核心原则（First）**：
  1. **Text First**：需求/设计/架构用 Markdown，结构化数据用 YAML/JSON，接口用 OpenAPI/Protobuf，业务规则用 DSL——研发资产文本化、可读、可追溯。
  2. **CLI First**：工程操作走统一命令行入口，可组合、可重复、可自动化；不是消灭 UI，而是"操作自动化、观察可视化、决策人工控制"。
  3. **Structured First**：能用 Schema 表达的不要全交给自然语言，减少歧义，让 AI 处理明确数据结构。
  4. **Executable First**：文档不止描述系统，还要驱动执行——Spec 生成代码、测试、部署。
  5. **Verifiable First**：建立单元/集成/静态分析/性能/安全自动化验证体系；需求、实现、测试不能完全依赖同一个 AI 自我闭环，需独立预期与人工审核。
  6. **Git First**：Git 作为研发资产核心管理基础设施，需求、ADR、DSL、测试规格等关键资产全部纳入版本管理。
- **贯穿全生命周期**：需求→Markdown+Spec，架构→Mermaid+ADR，编码→Agent+CLI，测试→Spec→Test，构建部署→CLI+CI/CD，运维→Runbook+脚本。
- **四个特别关注**：Context Engineering（AGENTS.md/Skills 管理上下文）、Infrastructure as Code、Security & Governance（Agent 权限+人工审批审计）、Traceability（需求-代码-测试-发布追溯）。
- **三阶段落地**：① 基础规范（Markdown 规范、AGENTS.md、CLI 入口）→ ② Spec-Driven Development（规格驱动任务与测试）→ ③ Agentic Engineering（Agent 参与全流程+自动化验证+人工审批）。
- **结语**：从"人理解需求、人写代码、人测试"转向"人定义目标与约束，AI 结构化需求，工具链确定性执行，自动化系统验证，人负责关键决策"。

## 正文

见 `[[Assets/2026-11/wechat-Hh0I_3sU8TI-2i2-x4pAEA]]`（采集全文）。文章从 Codex 等 AI Coding Agent 的能力演进切入，提出 AI-Native Engineering 概念，逐一展开六个 First 原则及其理由，给出研发各阶段的 AI-Native 实践对照表，最后以三阶段路径（基础规范→Spec 驱动→Agentic 工程）和研发范式转变收束。

## 来源

- [AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程](https://mp.weixin.qq.com/s/Hh0I_3sU8TI-2i2-x4pAEA)

## 附件

- [[Assets/2026-11/wechat-Hh0I_3sU8TI-2i2-x4pAEA]]
