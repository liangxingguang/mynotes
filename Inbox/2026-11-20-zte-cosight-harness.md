---
id: inbox-2026-11-20-zte-cosight-harness
title: 中兴开源企业级Harness，内部2000人使用！
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/tzBFFAbN-VbrtczsBHSI5Q
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/wechat-tzBFFAbN-VbrtczsBHSI5Q.md
wiki_status: pending
---

> **摘要**：中兴通讯开源支撑 2000 人研发团队、200+ 步骤生产级工作流的 Agent 底座系统 Co-Sight Harness（Apache 2.0，ZTE-AICloud/Co-Sight）。从业务、执行、资产、证据四层改造，在不换底座模型的前提下把 200 步链路无人干预完成率从 50% 提升到 100%，总耗时压缩 64%，组织级任务成功率从 60% 提到 90%。

## 核心要点

- **问题背景**：长链路单步成功率指数衰减（每步 95%，10 步后仅剩约 60%），改造前 200 步链路无人干预完成率仅 50%；2000 人团队存在公共代码被反复改坏、换需求冷启动、质量门禁空文件摆设、经验无法留存四大痛点。
- **业务层**：按步骤特征（模型难度、自由度、可验收性、检索/专业依赖）五维打分分流——易验收环节直接写脚本，复杂环节拆为 11 个专职子 Agent（Orchestrator/Worker/Review 三层，生成与审查隔离），准确率提升约 10%。
- **agent-genesis**：把工程师口头需求自动编译成标准控制文件（路线图、执行计划、验收标准、测试用例等），新场景接入从 2-4 小时压缩到 5-10 分钟；验证 Agent 运行在隔离上下文，严禁查看设计方案，防止"自己改自己的作业"。
- **执行层 Drive**：声明式工作流 + 状态机 + Hook 固定流程，模型只能改产出不能改流程状态，控制数据存于上下文外本地文件；按分析/规划/执行/评估/核算五岗位流转，不合格带证据打回，支持断点续跑。仅此一项 200 步链路完成率 50%→100%，耗时 440→159 分钟。
- **资产层**：运行态检索 + 生产态构建双引擎，先语义对齐（业务语言→研发术语）再检索，从任务记录自动挖掘经验回写知识库；检索召回率 56%→91.67%，生成 F1 从 68%→91.25%（代价：子系统变更精确率 72%→70%）。
- **证据层**：评测从总分下钻到阶段里程碑再到具体 Step；Golden Set 逐节点比对定位偏差；回归门禁拦截"修好一步改坏其他"的倒退改动，召回率稳步提升至 93%；与 DSPy/GEPA 算法层优化互补。
- **开源形态**：Apache 2.0，含 agent-genesis、Drive（817 个测试）、零依赖评测器 GoldEval、skill-optimizer、cosight-viewer 等 8 个组件；可作为插件装进 Claude Code 或 DSH，一键安装、自带依赖、可完全离线运行。

## 正文

完整正文见 [[Assets/2026-11/wechat-tzBFFAbN-VbrtczsBHSI5Q.md]]。文章还给出业务域 C（多卡模型适配）跨人移交与业务域 B 非原班人马 4 天接管的案例，验证控制结构可被不同团队直接复用；核心方法论：长链路稳定性取决于模型外那层 Harness（Prompt → Context → Harness → Loop），企业级系统的发力点是拉高整个团队的交付下限而非个体提效。

## 来源

- [中兴开源企业级Harness，内部2000人使用！](https://mp.weixin.qq.com/s/tzBFFAbN-VbrtczsBHSI5Q)

## 附件

- [[Assets/2026-11/wechat-tzBFFAbN-VbrtczsBHSI5Q.md]]
