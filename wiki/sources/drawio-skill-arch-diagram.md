---
id: wiki-source-drawio-skill-arch-diagram
type: source
title: drawio-skill：把代码与配置变成可编辑架构图的开源 Skill
status: active
created: 2026-10-21
updated: 2026-10-21
confidence: high
tags:
  - source
  - architecture
  - tools
sources:
  - raw/sources/architecture/2026-10-14-drawio-skill-arch-diagram.md
---
# drawio-skill：把代码与配置变成可编辑架构图的开源 Skill

## Overview（概览）

微博（#HOW I AI#）推荐的开源项目 drawio-skill：把自然语言、代码和基础设施配置转换成可编辑的 .drawio 架构图，并支持后续同步、差异对比与 CI 架构规则检查，定位为"需要持续维护架构文档的项目"的工具。

## Key Facts（关键事实）

- 输入侧覆盖代码依赖、Terraform、Kubernetes、Docker Compose，以及 SQL、OpenAPI 等结构定义；生成的节点与连线可在 draw.io 中继续编辑。
- 核心设计是 Diagram IR：结构化中间模型记录组件、关系、属性与来源，与图形布局（位置/尺寸/样式）分离；同一份模型可生成系统、部署、数据流等不同视图。
- sync 同步依赖稳定节点 ID：匹配到的节点保留位置与样式、更新属性；新节点放到原画布下方；源中删除的元素默认保留并标记待审；手工值与来源冲突时保留手工值并报告。
- 提供两类 GitHub Actions：PR 中检查循环依赖、信任边界、互联网到数据库访问路径等规则（错误/警告级别可配置）；另一套 Action 生成修改前、修改后与差异图供代码评审。
- 运行前提：核心模型处理、同步与规则检查需 Python 3；原生图片导出需 draw.io；部分自动布局使用 Graphviz。
- 项目地址：github.com/Agents365-ai/drawio-skill。

## Important Claims（重要论断）

### Claim 1：架构关系应与图形布局解耦

一份 Diagram IR 模型产出多视图，减少维护多份独立架构图的重复工作。

### Claim 2：重新生成不应覆盖手工排版

靠稳定节点 ID 做增量同步，删除元素留档待审、属性冲突保留手工值——"不能把每次导入都当成全新的一组对象"。

### Claim 3：架构检查需要流水线纪律

只检查一份没有更新的模型不能保证它与当前代码一致；图中的依赖和访问路径也不能直接当成真实运行状态的证明。

## Concepts Introduced（引入的概念）

- Diagram IR（架构中间模型，未单独建页）
- 模型/布局分离与稳定节点 ID 增量同步（未单独建页）

## Entities Mentioned（提及的实体）

- [[drawio-skill]]
- draw.io、Graphviz、GitHub Actions（未单独建页）

## Implications（影响／启示）

架构文档"持续维护"场景的完整链路样本：生成 → 同步 → 评审 → CI 门禁。与 [[archunit-java-architecture-guardrails]] 同属"架构约定进 CI"方向，但一个在图形/模型层，一个在字节码层。

## Limitations（局限）

- 单一微博推荐信源，无一手文档佐证；功能描述未经实测验证。
- 微博未给出版本、许可证、维护状态等信息。

## Related Knowledge（相关知识）

- [[drawio-skill]]
- [[archunit-java-architecture-guardrails]]

## Source（信源）

- `raw/sources/architecture/2026-10-14-drawio-skill-arch-diagram.md`
