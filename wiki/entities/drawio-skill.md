---
id: wiki-entity-drawio-skill
type: entity
title: drawio-skill
status: active
created: 2026-10-21
updated: 2026-10-21
confidence: medium
tags:
  - entity
  - architecture
  - tools
  - diagram
sources:
  - raw/sources/architecture/2026-10-14-drawio-skill-arch-diagram.md
related:
  - wiki/entities/archunit.md
---
# drawio-skill

## Overview（概览）

drawio-skill 是开源架构图 Skill（github.com/Agents365-ai/drawio-skill），把自然语言、代码和基础设施配置（Terraform/Kubernetes/Docker Compose/SQL/OpenAPI）转换成可编辑的 .drawio 架构图，并支持增量同步、差异对比与 CI 架构规则检查。

## Identity（身份信息）

- Type（类型）: 开源架构图生成与治理工具（AI Skill 形态）
- Organization（所属组织）: Agents365-ai（GitHub 组织/账号）
- Role（角色）: 架构文档持续维护——从源数据生成图、保留手工布局、把架构规则放进 PR 检查
- Status（状态）: 未知（信源未给出版本与维护状态）

## Important Facts（重要事实）

- 用 Diagram IR 中间模型解耦架构关系与图形布局；一份模型可产出系统/部署/数据流多视图。
- 增量同步靠稳定节点 ID：已有节点保留位置样式、新增节点放画布下方、源中删除元素默认保留并标记待审、属性冲突保留手工值并报告。
- CI 侧提供 GitHub Actions：循环依赖/信任边界/互联网直达数据库路径等规则检查（错误/警告可配），以及 before/after/diff 架构差异图生成。
- 依赖：Python 3（模型处理/同步/规则检查）、draw.io（原生图片导出）、Graphviz（部分自动布局）。

## Products / Projects（产品／项目）

- 主项目：github.com/Agents365-ai/drawio-skill。

## Relationships（关系）

- [[archunit]]：同为"架构约定进 CI"工具——drawio-skill 在图模型层做规则检查与差异评审，ArchUnit 在 Java 字节码层做架构门禁，二者互补。

## Timeline（时间线）

- 2026-10-14 — 微博（#HOW I AI#）推荐，进入本知识库。

## Current Understanding（当前认知）

"架构图即代码 + 持续同步"方向的代表性工具：解决的核心痛点是重新生成覆盖手工排版（稳定 ID 增量同步）与架构漂移进 CI（规则检查 + 差异图）。当前仅单一推荐性信源支撑，功能与成熟度未经一手验证，采用前需自行评估。

## Evidence（证据）

- `raw/sources/architecture/2026-10-14-drawio-skill-arch-diagram.md`
