# Wiki 索引（index.md）

> 全局导航入口。每一个 **active** 状态的 Wiki 页面必须出现在本索引中；archived 页面不出现。由 `wiki-ingest` 与 `wiki-lint` 维护（安全自动修复白名单包含 index）。

## source（信源）

- [[a2a-multi-agent-langgraph|A2A 实战：从零搭建工业级多 Agent 协作系统]]（2026-10-13，AI/多 Agent）
- [[ai-native-rd-org-forum|AI 进入生产后，研发组织怎么变（阿里云 AI 原生研发组织论坛回顾）]]（2026-10-14，AI/组织）
- [[ai-native-sdlc-playbook|Anthropic AI 原生 SDLC 实施手册]]（2026-10-14，AI/SDLC）
- [[archunit-java-architecture-guardrails|架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁]]（2026-10-14，Java/架构治理）
- [[arthas-mcp-ai-troubleshooting|让 AI 调 Arthas，Java 排障会快多少？]]（2026-10-14，AI/MCP/Java 诊断）
- [[deepseek-harness-7day-day1|7天学懂 DeepSeek Harness 实操手册（Day 1）]]（2026-10-14，AI/教程）
- [[drawio-skill-arch-diagram|drawio-skill：把代码与配置变成可编辑架构图的开源 Skill]]（2026-10-14，架构/工具）
- [[github-niche-usage-tips|三个小众但实用的 GitHub 用法（zread / Deepwiki / gitingest）]]（2026-10-14，工具）
- [[huolala-agent-eval-platform|货拉拉业务 Agent 评测平台的工程实践与深度思考]]（2026-10-14，AI/Agent 评测）
- [[java-perf-low-cpu-coding-tips-part1|打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）]]（2026-10-14，Java/性能）
- [[java-perf-low-cpu-coding-tips-part2|打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）]]（2026-10-14，Java/性能）
- [[jd-haibo-ai-knowledge-base|拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设]]（2026-10-14，AI/知识库）
- [[jvm-tuning-core-approach|一文掌握 JVM 调优核心思路]]（2026-10-14，Java/性能）
- [[learn-pi-agent-01-llm-to-agent|Learn Pi Agent 01｜大模型如何一步步变成 Agent]]（2026-10-14，AI/教程）
- [[llm-from-scratch-primer|三万字长文：大语言模型从零入门]]（2026-10-14，AI/教程）
- [[ms-agent-lightning-rl-framework|知乎想法：微软开源 Agent Lightning——3500 行框架让 AI 自己练级]]（2026-10-14，AI/Agent RL）
- [[pi-6-extensions|从 Claude Code 搬到 Pi：6 个扩展补回熟悉体验]]（2026-10-14，AI/Agent CLI）
- [[system-design-12-components|一次讲清 12 个系统设计核心组件]]（2026-10-13，系统设计）

## concept（概念）

- [[a2a-protocol|A2A 协议]]（Agent↔Agent 横向协作协议，Google 2025）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（规则+LLM 裁判+人工复核，覆盖准入/门禁/压测/巡检，货拉拉实践）
- [[agent-loop|Agent Loop]]（Runtime 驱动的模型-工具循环；Tool Call/Result、Message/Context/State/Session、Runtime vs Harness）
- [[ai-native-organization|AI 原生研发组织]]（工具原生→工作流原生→组织原生）
- [[ai-native-sdlc|AI 原生 SDLC]]（制品提交链驱动的六阶段闭环，Anthropic 2026）
- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]（砍掉无效解析/转换/对象，让 CPU 只做核心运算）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（先目标基线、JFR/GC 日志归因，证据指向 JVM 才动参数，单变量实验）
- [[mcp|MCP]]（LLM↔工具/数据纵向协议，Anthropic 2024）
- [[next-token-prediction|下一 token 预测]]（LLM 的统一目标：交叉熵训练、自回归生成，能力与幻觉同根）
- [[okf-knowledge-format|OKF（面向 AI Agent 的知识包装规范）]]（入库时编译为互链 Markdown 树，运行时只做导航+摘录）

## entity（实体）

- [[agent-lightning|Agent Lightning]]（微软研究院开源 Agent RL 训练框架，约 3500 行，真实工具链交互训练）
- [[archunit|ArchUnit]]（Java 架构约束即测试，TNG，当前 1.5.1）
- [[arthas|Arthas]]（Java 线上诊断工具，4.3.5 起含实验性 MCP Server）
- [[deepseek-harness|DeepSeek Harness]]（DeepSeek 模型的桌面 Agent 客户端，v0.2 预览版）
- [[drawio-skill|drawio-skill]]（代码/配置→可编辑 .drawio 架构图，增量同步 + CI 架构检查）
- [[jd-haibo|京东海博]]（京东本地生活即时零售 SaaS，780+ 商家/10 万+ 门店，AI 知识库实践标杆）
- [[pi|Pi]]（极简 Agent CLI，毛坯房 + 5000+ 扩展生态）

## topic（主题）

- [[system-design-core-components|系统设计核心组件]]（分布式系统 12 个核心组件清单）

## decision（决策）

（暂无）

## comparison（对比）

- [[a2a-vs-mcp|A2A vs MCP]]（横向多 Agent 协作 vs 纵向单 Agent 能力拓展，互补关系）

## synthesis（综述）

（暂无）

## timeline（时间线）

（暂无）
