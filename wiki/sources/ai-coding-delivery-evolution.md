---
id: wiki-source-ai-coding-delivery-evolution
type: source
title: AI 写代码越来越快，研发交付系统该怎么演进？
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai-coding
  - delivery
  - harness
sources:
  - raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md
related:
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/durable-execution.md
---
# AI 写代码越来越快，研发交付系统该怎么演进？

## Overview（概览）

公众号「架构师」长文：AI Coding 拓宽编码环节后，交付瓶颈搬家到需求澄清、变更审查、环境验证、上线确认。主张把交付建模为状态机、让规格随事实更新、Harness 留住执行现场、证据绑定不可变版本、知识库当作带有效期的缓存，人退到"on the loop"守风险分叉口。与 [[ai-native-sdlc|AI 原生 SDLC]] 相互印证。

## Key Facts（关键事实）

- METR 受控实验（2025 年初工具条件、成熟开源项目样本）：熟悉仓库的开发者用 AI 后完成任务时间反增 19%——不能外推"AI 拖慢开发"，但说明局部提速 ≠ 端到端提速。
- DORA 2025：AI 是组织能力的放大器——边界清楚、测试可靠、平台完整的团队把生成速度变成交付速度；反之只得到更多待审代码。
- 交付状态机七态：当前意图 → 候选变更 → 已持久化 → 已合并 → 已验证 → 可部署 → 已生效（源码层四态"已持久化/已合并/已验证/可部署"向前向后各补一步；源自作者拆解 Scion 一文）。
- 每次状态推进记录五要素：旧状态、新状态、对象版本、证据引用、发起者；排查沿状态记录走，不重放对话。
- 证据链示例：意图 v3 → 代码 c7 → 构建 b12 → 测试 r19 → 发布 d4 → 运行回读 o8；测试 r19 只证明构建 b12，代码变 c8 后旧测试不能背书新版本。
- AgentSWE 公开失败轨迹三典型（arXiv 2610.13361）：实现只贴合可见样例；运行时看似完整内部空壳；证据不足直接宣称完成。
- 腾讯 OK 实践：知识带有效期；Agent 发现知识与代码不一致可反馈；主干新提交后增量刷新仓库描述。
- 参考一手来源：Martin Fowler《Agentic Engineering》、Kief Morris《Humans and Agents in Software Engineering Loops》（in the loop → on the loop）、Addy Osmani（Spec/Agentic Code Quality）、Thoughtworks agentic SDLC、DORA 2025、METR。

## Important Claims（重要论断）

### Claim 1：交付量取决于最慢一段，不取决于最快一段

多串几个 Agent 解决不了交接断点；关键是一次变更的目标、状态和证据能不能一起往前走。

### Claim 2：Harness 保存执行现场，业务系统保存权威事实

Harness 可记"发布请求已发出、等待回读"，但不能因请求超时就自行把业务状态写成"发布失败"；模型处理含糊，状态机守边界。

### Claim 3：知识库更接近缓存，代码/配置/运行系统才是事实来源

知识须带版本、来源、有效期；冲突时回到事实源确认，不让 Agent 在两份说法里自行挑。

### Claim 4：人从 in the loop 移到 on the loop

按改动范围、可回滚性、数据影响、外部承诺分流：低风险自动推进，涉资金/权限/公开 API/跨团队承诺必须人工确认；人守业务取舍和系统边界，不再当传话人。

## Concepts Introduced（引入的概念）

- 交付状态机（七态，状态/证据/风险门槛三信息不分家）
- 证据绑定不可变版本（"完成不是某个 Agent 给出的结论，而是一组能够回查的事实"）

## Entities Mentioned（提及的实体）

- Scion（作者前文拆解的系统，未立页）

## Implications（影响／启示）

落地建议：先跑通一类边界清楚的变更（单仓库内部接口/低风险配置），用交付质量指标（需求到可验证变更时长、返工次数、人工等待占比、未知状态次数、失败恢复时长）代替生成量衡量成败。

## Limitations（局限）

- 观点性长文，无作者自家落地数据；METR/DORA 结论为转述（附一手链接）。
- 七态状态机为作者基于 Scion 拆解的推演，尚无工业界标准对照。

## Related Knowledge（相关知识）

- [[ai-native-sdlc|AI 原生 SDLC]]（制品提交链 + 人守闸门的相互印证）
- [[durable-execution|持久执行]]（Harness 执行现场可恢复的共同关切）
- [[agent-loop-production-boundaries|从 Chatbot 到 AI Agent]]（状态机/证据/授权边界在原型层的实现）

## Source（信源）

- `raw/sources/ai/2026-10-17-ai-coding-delivery-evolution.md`
