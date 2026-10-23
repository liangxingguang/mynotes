---
id: 2026-10-21-agent-2026-midyear-architecture-review
title: 2026 Agent 年中总结：从整体架构到关键细节
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/cX3-i0N7HmV5aS3zNsCTsg
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-2026-midyear-architecture-review.md
wiki_status: ingested
---

# 2026 Agent 年中总结：从整体架构到关键细节

> 叶小钗的 Agent 系统设计全景文。核心命题：Agent 系统设计的本质是把模型运行中的判断接到**可验证、可恢复**的执行过程里——模型负责理解探索，程序保证执行规则，人承担关键决策。架构主线是"薄 Harness 厚 Skills"：Harness 管执行与控制（上下文装配、工具调用、循环控制、暂停恢复），Runtime 管资源，业务系统保存落地事实。围绕工具反馈、上下文管理、Skill 沉淀、多 Agent 分工、生命周期与评测六大块展开，主线思想是"从 Workflow 到 Agent 是为提升泛化能力，架构演进全程为保证执行稳定性"。

## 核心要点

- **场景判断四条件**：信息能否取得、工具能否使用、结果能否验证、失败能否恢复——Coding Agent 易成样本正因四者齐备（代码库/终端/测试/git）
- **工具设计四环节**：选得对、调得动、读得懂结果、失败后知道如何处理；`success:false` 不够，要返回结构化失败原因与 next_action；决策基于状态快照，执行时要校验快照有效性（STALE_CONTEXT），但防过期与保推进要一起设计
- **上下文管理**：口径不清是"模型不懂业务"的真因；四类信息分开管（任务状态/业务知识/长期记忆/执行存档）；记忆是派生信息，关键业务事实必须可回查；压缩要保住目标、约束、已确认决定与证据地址
- **Skill 的本质**：沉淀"什么情况补查、什么情况淘汰、什么情况回来问人"的阈值与例外；支持局部重跑需保存中间产物与阶段依赖（用户既要稳定完成又要能改已完成一半的工作）
- **多 Agent**：先问任务能否独立、信息需什么、结果谁验收；验证者必须读实际产物而非执行者自我总结（换模型也不保证错误独立）
- **生命周期**：可靠恢复需同时保存工作进度与已发生的业务效果；有外部效果的动作（付款/发消息）恢复前先确认是否生效，防新旧执行者重复写入
- **评测从需求阶段开始**：四类任务（知识问答/查询/报告/执行）各有验收重点；完成的证据要在产物或业务状态中找到；失败归因要区分对象错/工具错/参数错/上下文丢约束，而非笼统"模型不行"

## 正文

全文（含职责图、冲突处理示例与评测指标体系）见 [[Assets/2026/10/agent-2026-midyear-architecture-review]]。

## 来源

[2026 Agent 年中总结：从整体架构到关键细节](https://mp.weixin.qq.com/s/cX3-i0N7HmV5aS3zNsCTsg)

## 附件

- [[Assets/2026/10/agent-2026-midyear-architecture-review]]
