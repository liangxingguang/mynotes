一句话

AI Native 团队不是让工程师用 AI 写代码更快，而是让组织把 AI 当作一等公民，从平台、流程到角色全面重构。

今天为什么选这个

Pomelo 的 CTO Diego Burgos 最近公开了他们的年度数据：12 个月内工程吞吐量提升 6 倍，交付周期缩短 3.2 倍。这不是因为他们用了更牛的模型，而是因为他们把公司当 AI\-Native 组织从头设计了一遍——MCP 作为上下文层、AI\-Gateway 作为模型管理层、微队（micro-squads）替代层级管理。

与此同时，Snowflake 在 2026 年 Summit 上发布了 CTO Circle 的研究：把开发者当客户、用产品管理方法做内部开发者体验，18 个月内内部开发者 NPS 提升超过 30 分。Money Forward 的 Anthropic 案例更直接：Claude Code 把 API 实现工时从 2 天压缩到 5 小时，新人入职从 1 周缩到 1 天。

这些数据的共同点不是“AI 写代码”，而是“组织为 AI 重新设计”。今天我们从五个维度拆解这种重构。

快速概览

维度

AI-Augmented（工具采用）

AI-Native（组织重构）

平台层

各团队自购 Copilot / Cursor

统一 AI 平台：模型网关、Prompt 版本控制、Agent 编排

数据层

数据仓库按分析建

特征存储 + 模型训练双写，Feature Store 原生

团队结构

全栈 10 人队，AI 能力靠自学

平台队 + 产品队：平台队提供共享能力，产品队消费

流程

需求 → 开发 → 测试 → 上线

Spec Driven Development：Spec 是唯一真实来源，Agent 消费 Spec 构建

治理

靠工程师自律

评估闭环：Evaluation 是控制层，Agent 改进必须通过回放验证

行业趋势上，Gartner 预测 2027 年底前 40% 以上的 Agentic AI 项目会被取消——根因不是模型不够强，而是基础设施没跟上。DORA 的研究也表明，内部开发者平台（IDP）的质量直接决定组织能否规模化 AI 价值。

正文展开

1. 平台先行：Agent 运行时的基础设施

在 Pomelo 的实践中，第一件事不是给工程师配 Claude Code，而是搭 MCP 上下文层和 AI\-Gateway。MCP（Model Context Protocol）作为组织能力的分布层：每个系统的知识、技能、工具都通过 MCP 暴露给 Agent。AI\-Gateway 则统一管理模型路由、成本、环境和责任边界。如今 Pomelo 100% 的 AI 调用都经过这个网关，新产品从设计之初就采用 MCP-first 策略。

Madgeek 的“AI\-Native Platform Architecture”把平台拆成五层：多租户数据基础设施、合规安全、遗留系统集成、AI 引擎与 Agent 编排、带人工审核的应用层。关键发现是建造顺序比技术选型更重要——先做数据与合规（第 1-4 周），再做遗留系统集成（第 3-8 周），然后才是 AI 引擎（第 5-12 周）。大多数团队把顺序搞反，先在单租户原型上堆 AI 层，回头补多租户的成本是初始建造的 3-5 倍。

VMware 在 Platform Engineering 2.0 报告里提出了“Agentic Development Platform”的概念：IDP 进化为同时支持 AI 负载作为一等公民、Agent 作为新一类平台用户。这个平台的三个 Horizon 是：现在就让 AI 负载原生运行，近期给 Agent 加护栏，远期实现 AI 驱动的自主平台。

Coderio 的文章给出了一个简洁的 AI\-Native vs AI\-Augmented 对比表：

维度

AI-Augmented

AI-Native

数据模型

为 CRUD 或分析设计

为 Feature Serving + 模型训练设计

API 表面

给人 UI 用的 REST/GraphQL

给 Agent 和模型消费设计

延迟目标

统一 P99

推理、检索、合成分开 SLO

可观测性

请求日志 + APM

模型监控、漂移检测、Prompt 遥测

部署

蓝绿发布应用代码

模型 A/B 测试 + Prompt 版本控制

工程经验：不要问“我们要不要上 AI 平台”，要问“我们的平台能不能把 Agent 当一等公民调度”。

2\. 人才重构：从开发者到产品工程师

Pomelo 的描述非常精准：AI 放大了组织的两端——一端是有更多上下文的人，他们的分析、设计、决策能力指数级提升；另一端是更接近执行的人，他们身边站着 Agent，负责构建、验证、文档、审查和运维。当两端同时增长，中间大量传统的协调工作被自然消解。

这直接导致了管理层级的压缩。Pomelo 在 12 个月内每个区域削减了 1-2 层管理，不是因为裁员，而是因为变化让这些层级变得不再必要。新的角色是产品工程师（Product Engineer）：比传统工程师更宽，不仅沉浸于技术，还深入理解产品、业务和公司端到端运营。

Money Forward 的数据佐证了这一点：70% 的 API 实现代码由 Claude Code 生成，工程师从“实现者”变成“设计者”——他们定义架构、审查代码、做高层决策，而不是写样板代码。

工程经验：AI\-Native 团队的人才策略不是“招更多会用 Copilot 的人”，而是“招能设计 Agent 的人”。

3\. 流程重构：Spec Driven Development

传统文档是写完就过时的交付物。在 AI\-Native 组织里，文档进化为Specification（规格说明）——它是连接业务、产品、工程和 Agent 的共同语言。

Spec 的演化路径：

1

业务问题的对话 → 产品定义 → 技术决策 → Agent 消费的上下文

Pomelo 把 MCP 作为 Spec 的主要来源和连接机制。当你在 Claude 里定义功能时，Claude 会问你要不要创建一个 Specification。对 3-10 人的初创公司这几乎是自然的；对几百人的公司，挑战在于如何让业务、产品、工程共享同一个工作框架，让 Agent 持续获得结构化上下文而不牺牲速度。

Pomelo 发现，SDD 能规模化不是因为人写 Spec 的能力提升了，而是因为组织能把知识转化为 Agent 可持续访问的形式。关键是建立一种机制：当业务决策变更时，Spec 能自动同步到所有依赖方——包括 Agent。

工程经验：如果你的文档不是 Agent 能消费的活上下文，它就不是 Spec，只是过期的文档。

4\. 治理闭环：评估作为控制层

自我改进的 Agent 论文（Alchedata）给出了一个清晰的参考架构：三平面系统——运行时平面、学习平面、优化与治理平面。评估是连接三个平面的控制层：没有评估，Agent 的改变没有可靠依据声称自己是改进。

2026 年的生命周期观点把自主评估置于自我改进的所有阶段。种群系统用分级晋升逻辑；具身 Agent 治理把控制和监控外化到专用层。共同的准则是：\*\*任何候选改进在晋升之前，都必须有充分的证据、稳定的评估条件和回滚能力。\*\*

ANCHOR 框架（arXiv 2606.06114）的实验表明：阶段条件化的 LLM 监督能有效缓解自我进化中的错误累积和安全漂移，同时保留核心能力。最有影响力的监督发生在执行-结果阶段——基于验证器的结果信号。监督频率存在边际收益递减：低到中等频率的监督已经能接近最大收益。这意味着你不必在每个 Agent 步骤上都插眼，关键是评估基准本身的质量和稳定性。

工程经验：Agent 改 prompt、改路由、改工具、改代码都行，但每次变更都要在同一套评估基准上回放。Evaluation 不是 QA，是进化循环的控制层。把 Evaluation 当产品来养——持续维护、版本化、和代码一起 review。

5\. 踩坑实录：Credential Walls 和 Build vs. Buy

Claude Code 最近的 changelog 里有一个值得关注的变化：sandbox.credentials 设置阻止沙箱命令读取密钥文件和环境变量。行业方向很明确——Agent 应该“使用”凭证，而不是“看见”凭证。

这延伸到组织决策：如果你在多个云上跑 Agent，现在就该评估统一的治理平面。ModelOp Center 3.5 在 10 月 22 日连接了 Microsoft Agent 365、Amazon Bedrock AgentCore 和 Amazon Quick 在一个控制平面下——这个信号很清晰：当每个云厂商都推出自己的 Agent 构建器时，稀缺层是跨厂商治理，不是再多一个控制台。

Build vs. Buy 方面，Coderio 的建议是把决策当作年度战略回顾：平台团队投入、AI 工程人才培养、Build vs. Buy 的年度 revisit。这是技术组织最重要的战略资产。

工程经验：credential 处理正在从“便利性”变成“平台决策”。审计你的 Agent 今天在哪里读密钥——emerging norm 是注入，永不暴露。

总结

1

平台先行于工具。在给工程师配 AI 工具之前，先确保平台能把 Agent 当一等公民调度——模型网关、Prompt 版本控制、Agent 编排、统一审计。

2

把开发者当客户。用产品管理方法做内部开发者体验：访谈痛点、画摩擦地图、度量每次实验影响。Snowflake 的 NPS +30 就是这么来的。

3

Spec 是唯一真实来源。让 Spec 从"写完就过期"的文档变成 Agent 消费的活上下文。MCP 是当前最可行的连接层。

4

Evaluation 是控制层，不是 QA。任何 Agent 自我改进必须经过同一套评估基准的回放。频率不用太高，中等监督即可。

5

从组织两端同时放大。AI 同时放大"有上下文的人"和"有 Agent 的执行者"，中间的协调工作自然消解——别补管理层级，补平台能力。

最近发表文章

[当 Agent 说「搞定了」，你敢信吗？——用 Orcana Runtime 给 Coding Agent 装上验证引擎](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484293&idx=1&sn=38e5a5926a6aeef74d34621b8f189af6&scene=21#wechat_redirect)

[给你的 Coding Agent 装上黑匣子：5 分钟自建本地 Agent 可观测平台](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484283&idx=1&sn=1e19c2b61310db5c5e220c06c8574c7c&scene=21#wechat_redirect)

[AI Native 工程体系（五）：一个人跑得快，一群人跑得远——把 AI 变成团队基础设施](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484278&idx=1&sn=77f8f9bec222df26988e482a2ad78c60&scene=21#wechat_redirect)

[AI Native 工程体系（四）：不写 while True，写工作日——Agent Loops 设计指南](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484273&idx=1&sn=fd255a2368c6cab9d1db44c5a21c968d&scene=21#wechat_redirect)

[AI Native 工程体系（三）：决定 Agent 好坏的从来不是模型——Agent Harness 深度解析](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484268&idx=1&sn=b8b569e35c2be472aa45fa254621251d&scene=21#wechat_redirect)

[AI Native 工程体系（二）：别让 AI 猜你在想什么——Spec-Driven Development 实战指南](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484263&idx=1&sn=b7513c56c0fa5de1fe1effa062354828&scene=21#wechat_redirect)

[AI Native 工程体系（一）：从「AI 帮我写代码」到「AI 是我的工程团队」](https://mp.weixin.qq.com/s?__biz=MzI0MTEzMzk3NQ==&mid=2247484258&idx=1&sn=1fc894deeb90f35187f95b48a4e2f581&scene=21#wechat_redirect)

如果你觉得今天这篇有收获,欢迎**点赞、在看、转发**三连,我们下篇见。