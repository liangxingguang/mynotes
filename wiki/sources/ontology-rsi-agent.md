---
id: wiki-source-ontology-rsi-agent
type: source
title: 不只是Memory：Ontology如何让Coding Agent越用越懂项目？
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - source
  - ai
  - agent
sources:
  - raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md
related:
  - wiki/concepts/ontology.md
  - wiki/concepts/recursive-self-improvement.md
  - wiki/concepts/three-layer-project-graph.md
  - wiki/entities/tencentdb-agent-memory.md
---
# 不只是Memory：Ontology如何让Coding Agent越用越懂项目？

## Overview（概览）

腾讯云数据库团队对 Ontology + RSI 用于 Coding Agent 的系统性思考。文章从本体定义出发，区分本体与 Schema/知识图谱/RAG，借 Palantir Ontology 与 FDE 说明含义澄清在工程中的位置；进而引入 RSI（递归自我改进）三层次，梳理 Reflexion、Agent Workflow Memory、EvoOntology、Skill∞、Darwin Gödel Machine 等研究如何逐步把"改进对象"从任务产物推向机制本身；最后展开团队在研发 Loop 中组织三层互索引项目图谱（工程事实/项目语义/bug_fixed）的实践，Bug 定位成功率 58%→65%。

## Key Facts（关键事实）

- 腾讯云数据库团队在研发 Loop（设计完成→上线前测试由 Agent 承担）中引入团队 Memory 与三层互索引项目图谱
- 四类记忆资产：Chat Memory、Wiki、CodeGraph、Skill
- 三层图谱：①工程事实（函数/类型/字段/接口及跨仓契约，偏静态）②项目语义（LLM 提取的功能职责/业务概念/跨仓映射与约束，本体体现在此层）③bug_fixed（历史 Bug 经验挂到前两层节点，渐进式披露）
- 内部 Bug 定位试验：加入图谱能力后成功率从 58% 提升到 65%（+7pp）
- TencentDB Agent Memory 已在 GitHub 开源：github.com/Tencent/TencentDB-Agent-Memory
- RSI 三层次：执行内迭代 / 跨任务自改进 / 改进过程的自改进

## Important Claims（重要论断）

### Claim 1：本体的关键在"含义"，不在"连接"

本体把领域的概念、关系、成立条件表达成可共享模型。与知识图谱的区别不在存储形式，而在关系是否有明确语义——"所有边都叫'相关'"的图解决不了含义澄清。真正要补的是：找到一段知识后，判断它在说哪个对象、在什么条件下成立、能支持哪步推断。

### Claim 2：保存≠学会，复用≠改进

Memory 是自改进的燃料，但需要后半句：经验需要改变后续行为，并通过后续结果检验。错误经验被更稳定召回，反而让错误重复得更稳定。RSI 的递归性体现在改进过程本身也能成为改进对象。

### Claim 3：本体与 RSI 结合需要"能关联"且"能纠正"

语义组织会增加抽取维护成本，图关系可能放大错误经验。系统应能收紧经验适用范围、拆分误合并的概念、撤回不成立结论，而不是只能继续增加内容。

### Claim 4：本体不必成为第四层

本体体现在第二层（项目语义）的概念与约束表达，以及跨层关系对实现、经验、证据角色的区分。第一层提供工程锚点，第三层提供历史反例，两者帮助修订项目语义。

## Concepts Introduced（引入的概念）

- [[ontology|Ontology]]
- [[recursive-self-improvement|递归自我改进（RSI）]]
- [[three-layer-project-graph|三层互索引项目图谱]]

## Entities Mentioned（提及的实体）

- [[tencentdb-agent-memory|TencentDB Agent Memory]]

## Implications（影响／启示）

- 企业研发中引入本体与图谱，应从状态、默认值、资源身份、跨仓兼容等反复影响判断的概念小范围入手
- 经验使用应能追踪到它改变了哪项判断、哪段实现或哪项验证，仅靠召回日志不能确定经验生效
- 持续学习实验需用冻结图谱组与只吸收已结束任务经验组对照，并保留旧任务回归

## Limitations（局限）

- 58%→65% 是单一内部试验的初步结果，不能换算为完整研发效率提升
- 三层图谱各层贡献未做分层对照，不能单独归因于本体语义层
- 项目开源但具体实现细节、评测集构造方法在信源中未详述

## Related Knowledge（相关知识）

- [[agent-memory-system|Agent 记忆系统]]
- [[agent-loop|Agent Loop]]
- [[coding-agent-knowledge-base|Coding Agent 知识库]]

## Source（信源）

- `raw/sources/ai/2026-11-20-ontology-rsi-coding-agent.md`
