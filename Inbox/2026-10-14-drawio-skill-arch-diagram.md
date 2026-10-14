---
id: 2026-10-14-drawio-skill-arch-diagram
title: drawio-skill：把代码与配置变成可编辑架构图的开源 Skill
source: 微博
source_url: https://weibo.com/5648162302/5353819917255535
source_type: article
platform: 微博
created: 2026-10-14
category: 技术
tags:
  - 工具
  - 工程实践
---

# drawio-skill：把代码与配置变成可编辑架构图的开源 Skill

> 微博推荐开源项目 drawio-skill（github.com/Agents365-ai/drawio-skill）：把自然语言、代码和基础设施配置转换成可编辑的 .drawio 架构图，支持增量同步、差异对比与 CI 架构规则检查，适合需要持续维护架构文档的项目。

## 核心要点

1. **多来源生成**：可读取代码依赖、Terraform、Kubernetes、Docker Compose，以及 SQL、OpenAPI 等结构定义；生成的节点与连线可在 draw.io 中继续编辑。
2. **模型与布局分离**：用 Diagram IR 结构化中间模型记录组件、关系、属性与来源，图形位置/尺寸/样式另存；同一模型可生成系统视图、部署视图、数据流视图，避免维护多份图。
3. **同步保留手工布局**：依赖稳定节点 ID 做匹配——已存在节点保留位置样式、更新属性；新节点放画布下方；源中删除的元素默认保留并标记待审；手工值与来源冲突时保留手工值并报告。
4. **CI 架构检查**：提供 GitHub Actions，在 PR 中检查循环依赖、信任边界、互联网直达数据库的访问路径等，可配置错误/警告级别阻断；另有 Action 生成修改前、修改后与差异图供代码评审。
5. **运行前提**：核心模型处理、同步与规则检查需 Python 3；原生图片导出需 draw.io；部分自动布局依赖 Graphviz。
6. **使用提醒**：需把源数据更新→模型生成→规则检查串成流水线，只检查过期模型不能反映当前代码；图中依赖与访问路径不等于真实运行状态的证明。

## 正文

这是一个面向架构文档持续维护场景的开源 Skill：输入侧覆盖代码依赖与 IaC/API 定义，产出侧是可人工编辑的 draw.io 文件。关键设计是 Diagram IR——架构关系（逻辑模型）与图形布局解耦，一份模型多视图产出。同步机制解决"重新生成覆盖手工排版"的痛点：节点靠稳定 ID 匹配，新增元素入画布、删除元素留档待审、属性冲突保留手工修改。CI 侧提供两类 Action：规则检查（循环依赖、信任边界等）与架构差异图（before/after/diff），把架构变化纳入 PR 评审。

## 来源

- [原微博](https://weibo.com/5648162302/5353819917255535)（微博 · #HOW I AI# #程序员#）
- 项目地址：[github.com/Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill)

## 附件

无
