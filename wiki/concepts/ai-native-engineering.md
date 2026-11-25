---
id: wiki-concept-ai-native-engineering
type: concept
title: AI-Native Engineering（AI 原生软件研发）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - concept
  - ai
  - engineering-practice
  - sdlc
sources:
  - raw/sources/ai/2026-11-25-ai-native-engineering.md
related:
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/spec-driven-development.md
  - wiki/concepts/context-management.md
---
# AI-Native Engineering（AI 原生软件研发）

## Definition（定义）

AI-Native Engineering（AI 原生软件研发）是一套围绕 AI Agent 重构整个软件研发体系的工程理念：当 AI Coding Agent 已能理解项目、修改代码、执行测试乃至独立完成开发任务时，真正值得改变的不是编码方式，而是整个研发体系——研发资产、工具链、流程与决策方式全部围绕「AI 可理解、可执行、可验证」重新组织。（单信源，作者提出的方法论框架，置信度中）

## Why It Matters（为什么重要）

以人工操作为中心的研发模式（Word 需求、Excel 测试用例、Visio 架构图、大量 UI 操作）与 AI 参与研发的现状割裂：每次让 AI 开发功能都要重新解释项目背景与设计约束，重复成本高且约束易失真。AI-Native Engineering 的应对是把研发体系的每个环节改为 AI 可直接消费、直接驱动的形态，使「人定义目标与约束 → AI 结构化需求 → 工具链确定性执行 → 自动化系统验证 → 人负责关键决策」成为默认工作方式。

## Core Characteristics（核心特征）

**六个 First 原则**（信源核心框架）：

1. **Text First（文本优先）**：研发文档用文本格式替代二进制办公文件（Markdown 写需求/设计/架构，YAML/JSON 写结构化数据，OpenAPI/Protobuf 写接口，DSL 写业务规则）；研发资产文本化、可读、可追溯，便于 AI 理解与 Git 版本管理/Diff/Review。
2. **CLI First（命令行优先）**：构建、测试、打包、部署等工程操作提供统一 CLI 入口，可组合、可重复、可自动化、可追溯，易被 Agent 直接调用；不消灭 UI，而是「操作自动化、观察可视化、决策人工控制」。
3. **Structured First（结构化优先）**：能用 Schema 表达的内容不交给自然语言；减少歧义，让 AI 从理解文本逐步转向处理明确的数据结构。
4. **Executable First（可执行优先）**：文档不止描述系统，还要驱动执行（API 定义生成接口代码、Protobuf 生成多语言协议代码、DSL 生成规则执行代码、测试规格生成测试用例、部署配置驱动自动化部署）；Specification 是工程资产而非仅文档。
5. **Verifiable First（可验证优先）**：AI 产出不能仅凭人工阅读或模型自我评价判断正确性；建立单元/集成/静态分析/性能/安全自动化验证体系；需求、实现、测试不能由同一个 AI 自我闭环，需独立预期结果与必要人工审核。
6. **Git First（版本管理优先）**：Git 从源代码管理扩展为研发资产核心管理基础设施；需求、ADR、接口定义、DSL、测试规格、自动化脚本等关键资产全部纳入版本管理，实现变更追溯、分支协作、代码审查与版本回滚。

## Structure（结构）

**全生命周期应用**（六个原则贯穿各研发阶段，信源对照表）：

| 研发阶段 | AI-Native 实践 |
|---|---|
| 需求分析 | Markdown + 结构化 Spec |
| 产品设计 | 领域模型 + 业务规则 |
| 架构设计 | Markdown + Mermaid + ADR |
| 接口设计 | OpenAPI / Protobuf |
| 任务拆解 | Spec → Task |
| 编码开发 | Agent + CLI |
| 测试验证 | Spec → Test |
| 性能测试 | Benchmark + 自动化报告 |
| 构建部署 | CLI + CI/CD |
| 运维管理 | Runbook + Scripts |

**四个特别关注方向**：Context Engineering（AGENTS.md、Skills 管理项目上下文，减少重复解释与无效 Token 消耗）、Infrastructure as Code（环境/依赖/部署配置代码化保证可复现）、Security & Governance（Agent 权限控制，关键操作人工审批与审计）、Traceability（需求-设计-任务-代码-测试-发布追溯链）。

## How It Works（运作方式）

从零构建 AI 原生研发体系的三阶段路径（信源给出，作者经验性划分）：

1. **基础规范**：建立 Markdown 文档规范、统一项目目录、AGENTS.md、CLI 命令入口与脚本化工程操作。
2. **Spec-Driven Development**：建立需求规格、架构决策、接口契约、DSL 与 Schema，让需求驱动开发任务与测试用例（见 [[spec-driven-development|规范驱动开发（SDD）]]）。
3. **Agentic Engineering**：Agent 参与需求分析、任务拆解、编码、测试与交付，以自动化验证与人工审批保证结果可靠。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-native-sdlc|AI 原生 SDLC]]：两者同属「AI 原生」研发范式，但层次不同——AI-Native SDLC 聚焦**生命周期流程**（制品提交链、人守闸门、闭环触发），本概念聚焦**研发体系与资产层**（工具链文本化/CLI 化/Schema 化/可执行化/可验证化/版本化）；六原则中的 Executable First、Verifiable First、Git First 为 AI 原生 SDLC 的制品链与验证环节提供资产与工具基础，两者互为表里。
- [[spec-driven-development|规范驱动开发（SDD）]]：本概念三阶段路径的第二阶段即 SDD；Executable First（Spec 驱动执行）是 SDD「规范即约束」在资产层的表述。
- [[context-management|上下文管理]]：Context Engineering 与本概念的关系——本概念将 AGENTS.md/Skills 作为项目上下文管理载体，是上下文管理在研发体系治理中的运用；上下文管理概念更宽（含裁剪/压缩/隔离与记忆系统供料）。

### Dependencies（依赖项）

- 依赖可被 AI 消费的文本化/结构化资产形态（Markdown、Schema、DSL、Spec）。
- 依赖自动化验证体系（测试、静态分析、性能、安全）与版本管理基础设施（Git）。

### Distinctions（区分）

- 与「AI 辅助编码」不同：本概念要求重构研发资产与工具链，而非仅在编码环节引入 AI。
- 与 [[ai-native-organization|AI 原生研发组织]] 不同：本概念管研发体系与工具链，组织概念管目标、权限、验收、追责与团队形态。

## Evolution（演进）

- 2026-11-25：微信公众号文章《AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程》首次系统提出本概念：以 Codex 等 AI Coding Agent 能力演进为背景，立论「改变整个软件研发体系」，给出六个 First 原则、全生命周期实践对照、四个特别关注与三阶段路径。本页首次立概念，单信源。

## Open Questions（开放问题）

- 六个 First 原则之间的优先级与冲突裁决规则（如 Structured First 与自然语言表达意图的边界）：信源未确立。
- 各原则的量化收益与落地代价：无实证数据，待多信源印证。
- 三阶段路径的推进速度与组织适配条件：信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-25-ai-native-engineering.md`（微信公众号单信源：六个 First 原则及理由、全生命周期实践对照表、四个特别关注、三阶段路径、研发范式转向论断）

## Related Knowledge（相关知识）

- [[2026-11-25-ai-native-engineering|AI-Native Engineering：AI 时代，我们应该重新思考软件研发流程（信源页）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[spec-driven-development|规范驱动开发（SDD）]]
- [[context-management|上下文管理]]
- [[ai-native-organization|AI 原生研发组织]]
- [[coding-agent-ai-native-workflow|驾驭 Coding Agent：打造 AI 原生研发工作流（信源页）]]
