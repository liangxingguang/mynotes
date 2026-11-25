---
id: wiki-source-2026-11-25-ai-native-engineering
type: source
title: AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - ai
  - agent
  - system-design
sources:
  - raw/sources/ai/2026-11-25-ai-native-engineering.md
---
# AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程

## Overview（概览）

微信公众号方法论文章。以 Codex 等 AI Coding Agent 的能力演进（理解项目、分析需求、修改代码、执行测试、独立完成开发任务）为切入点，提出 AI-Native Engineering（AI 原生软件研发）理念：AI 时代真正要改的不是编码方式，而是整个软件研发体系。全文给出六个 First 核心原则、贯穿研发生命周期的实践对照表、四个特别关注方向与三阶段建设路径。

## Key Facts（关键事实）

- 背景判断：AI Coding Agent 已能理解项目、分析需求、修改代码、执行测试，甚至独立完成完整开发任务。
- 六个核心原则（First）：
  1. **Text First（文本优先）**：研发文档用文本格式替代 Word/Excel/PPT 等二进制办公文件；需求/设计/架构用 Markdown，结构化数据用 YAML/JSON，接口用 OpenAPI/Protobuf，业务规则用 DSL；核心思想是让研发资产文本化、可读、可追溯。
  2. **CLI First（命令行优先）**：构建、测试、性能测试、打包、部署提供统一命令行入口；CLI 可组合、可重复、可自动化、可追溯，易被 Agent 直接调用；不是消灭 UI，而是「操作自动化、观察可视化、决策人工控制」。
  3. **Structured First（结构化优先）**：能用 Schema 表达的不交给自然语言；需求约束、业务规则、接口定义、数据模型、测试场景尽可能结构化；核心思想是减少歧义，让 AI 从理解文本转向处理明确数据结构。
  4. **Executable First（可执行优先）**：文档不止描述系统，还要驱动执行——API 定义生成接口代码、Protobuf 生成多语言协议代码、DSL 生成业务规则执行代码、测试规格生成测试用例、部署配置驱动自动化部署；核心思想是让 Specification 成为驱动研发流程的工程资产。
  5. **Verifiable First（可验证优先）**：AI 产出不能仅凭人工阅读或模型自我评价判断正确性；建立单元/集成/静态分析/性能/安全自动化验证体系；需求、实现、测试不能完全依赖同一个 AI 自我闭环，需独立预期结果与必要人工审核。
  6. **Git First（版本管理优先）**：Git 从源代码管理扩展为研发资产核心管理基础设施；需求、架构设计、ADR、接口定义、DSL、测试规格、自动化脚本等关键资产全部纳入版本管理，实现变更追溯、分支协作、代码审查与版本回滚。
- 全生命周期应用对照：需求分析→Markdown+结构化 Spec；产品设计→领域模型+业务规则；架构设计→Markdown+Mermaid+ADR；接口设计→OpenAPI/Protobuf；任务拆解→Spec→Task；编码开发→Agent+CLI；测试验证→Spec→Test；性能测试→Benchmark+自动化报告；构建部署→CLI+CI/CD；运维管理→Runbook+Scripts。
- 四个特别关注：Context Engineering（AGENTS.md、Skills 管理项目上下文，减少重复解释与无效 Token 消耗）、Infrastructure as Code（环境/依赖/部署配置代码化保证可复现）、Security & Governance（控制 Agent 权限，关键操作人工审批与审计）、Traceability（需求-设计-任务-代码-测试-发布追溯）。
- 三阶段落地路径：① 基础规范（Markdown 文档规范、统一目录、AGENTS.md、CLI 入口、脚本化工程操作）→ ② Spec-Driven Development（需求规格、架构决策、接口契约、DSL、Schema，需求驱动任务与测试）→ ③ Agentic Engineering（Agent 参与需求分析、任务拆解、编码、测试、交付，自动化验证+人工审批保可靠）。

## Important Claims（重要论断）

### Claim 1

AI 时代真正值得改变的不只是编码方式，而是整个软件研发体系（AI-Native Engineering 的立论核心）。

### Claim 2

沿用以人工操作为中心的研发模式（Word 需求、Excel 测试用例、Visio 架构图、大量 UI 操作）在 AI 已能参与整个研发流程的当下显得割裂——每次让 AI 开发功能都要重新解释项目背景与设计约束。

### Claim 3

研发范式的转向终点：从「人理解需求、人设计系统、人编写代码、人测试验证」转向「人定义目标和约束，AI 理解并结构化需求，工具链负责确定性执行，自动化系统负责验证，人负责关键决策」。

## Concepts Introduced（引入的概念）

- [[ai-native-engineering|AI-Native Engineering（AI 原生软件研发）]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- Context Engineering（上下文工程）：原文作为特别关注方向提出，见 [[context-management|上下文管理]] 相关讨论

## Entities Mentioned（提及的实体）

- Codex（AI Coding Agent，原文作为能力演进背景提及）
- AGENTS.md、Skills（原文作为 Context Engineering 的载体提及，非独立实体页）

## Implications（影响／启示）

- 六个 First 与 [[ai-native-sdlc|AI 原生 SDLC]] 的「制品链可追溯」「人守闸门」同向：Verifiable First 直接回应「瓶颈转移到验证」，Executable First 与 Spec-Driven 是「规范驱动执行」的资产层表述。
- 对本知识库自身即是实践印证：本仓库的 raw/wiki 分层、Markdown 资产、AGENTS.md 契约、CLI 化 skill 脚本、队列状态机正是 Text/Structured/Executable/Verifiable/Git First 的实例化。

## Limitations（局限）

- 单信源方法论文章，无实证数据、无第三方验证；三阶段路径与六原则收益均为作者论断。
- 文章未给出原则之间的优先级或冲突裁决规则（如 Structured First 与自然语言表达意图的边界）。
- 未涉及规模化团队的组织与治理成本。

## Related Knowledge（相关知识）

- [[ai-native-engineering|AI-Native Engineering（概念页）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[context-management|上下文管理]]
- [[coding-agent-ai-native-workflow|驾驭 Coding Agent：打造 AI 原生研发工作流（信源页）]]
- [[alibaba-ai-native-dev-handbook|阿里巴巴 AI Native 研发实践手册（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-25-ai-native-engineering.md`
