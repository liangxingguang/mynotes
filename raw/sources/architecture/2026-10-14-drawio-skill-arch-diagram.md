---
title: drawio-skill：一个开源架构图 Skill
source: 微博（#HOW I AI#）
source_url: https://weibo.com/5648162302/5353819917255535
source_type: post
platform: 微博
captured: 2026-10-14
registered_at: 2026-10-21
inbox_ref: Archive/2026-10-14-drawio-skill-arch-diagram.md
---

drawio-skill：一个开源架构图 Skill，可以把自然语言、代码和基础设施配置转换成可编辑的 .drawio 文件，也支持后续同步、差异对比和 CI 检查。

功能覆盖得比较完整，适合需要持续维护架构文档的项目。

① 从代码和配置生成架构图。

可以读取代码依赖、Terraform、Kubernetes、Docker Compose 等来源，也支持 SQL 和 OpenAPI 等结构定义。生成的节点、连线可以继续在 draw.io 中编辑。

② 把架构关系与图形布局分开保存。

项目使用 Diagram IR，也就是一份结构化的中间模型，记录组件、关系、属性和来源。节点位置、尺寸、样式则属于图形布局。

同一份模型可以生成系统、部署、数据流等不同视图，减少维护多份独立架构图的重复工作。

③ 更新内容时，保留手工调整的布局。

通过 sync 同步新来源时，匹配到的节点会保留位置与样式，更新名称、属性和来源信息。新增节点放到原画布下方；源数据中删除的元素默认保留并标记，方便审核。

如果手工编辑与新来源对同一个属性做了不同修改，会保留手工值并报告冲突。这个过程依赖稳定的节点 ID，不能把每次导入都当成全新的一组对象。

④ 把架构规则放进 CI。

项目提供 GitHub Actions，可以在 PR 中检查结构化模型里的循环依赖、信任边界、互联网到数据库的访问路径等规则。出现错误时让检查失败，也可以配置为遇到警告就失败。

另外一套 Action 负责生成修改前、修改后和差异图，方便在代码评审时一起查看架构变化。

前提条件：核心模型处理、同步和规则检查需要 Python 3；原生图片导出需要 draw.io，部分自动布局功能使用 Graphviz。

接入时需要把源数据更新、模型生成和规则检查串起来。只检查一份没有更新的模型，不能保证它与当前代码一致；图中的依赖和访问路径，也不能直接当成真实运行状态的证明。

项目：github.com/Agents365-ai/drawio-skill

[#HOW I AI#](https://s.weibo.com/weibo?q=%23HOW%20I%20AI%23) [#程序员#](https://s.weibo.com/weibo?q=%23%E7%A8%8B%E5%BA%8F%E5%91%98%23)
