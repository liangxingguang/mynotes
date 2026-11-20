---
id: inbox-2026-11-20-deepseek-harness-loopforge-voice
title: 基于 DeepSeek Harness + LoopForge 开发Asterisk+OpenSIPS智能语音系统开发方案讨论
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/oJCiADArsydGR9nu9PGrvg
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026-11/wechat-oJCiADArsydGR9nu9PGrvg.md
wiki_status: pending
---

> **摘要**：一份用 AI 原生研发范式交付 VoxForge 智能语音平台的完整方案：DeepSeek Harness（dsh）做编码 Agent 执行器（"一切皆插件"），腾讯开源 LoopForge 做团队级交付编排（SOP = Agent/Script 节点 + 人签字门禁），核心是"DAG 管主干，Agent 管节点，人管签字"。系统分五层：L1 OpenSIPS（SIP 信令边界/负载均衡）→ L2 Asterisk（呼叫应用，PJSIP+ARI）→ L3 AI 语音网关（Python asyncio 状态机，ASR/TTS/LLM/RAG）→ L5 业务与数据层（CRM/CDR/PG/Redis），目标 IVR 自助解决率≥40%、P50 时延≤900ms、200 路并发、99.95% 可用性。

## 核心要点

- **双工具分工**：dsh 负责"写代码"（Cordis 运行时、插件化能力，开发者预览期需锁版本）；LoopForge 负责把需求排成 SOP 流水线（clarify→门禁→设计→实现→静态检查→单测→集成测试→评审→文档→验收→PR），节点失败 on_fail 打回实现。腾讯内部实践：836 个 MR、一次通过率 54.8%、终态成功率 95.4%。
- **设计原则**：媒体与控制分离、SIP 信令边界解耦、AI 可降级（ASR/LLM/TTS 故障可回退传统 IVR）、流式优先、全链路可审计。
- **WBS 与需求**：M1-M9 模块拆解；需求按 S/M/L 分级，需求模板必含 5 条可测试验收标准，MVP 清单先行。
- **角色与仓库**：架构师(Planner)/SIP 工程师/PBX 工程师/后端/Reviewer/QA/技术写作七角色；Reviewer 用不同执行器或模型避免自评；仓库内置 AGENTS.md 与 `.dsh/skills/` 领域技能（opensips-routing、asterisk-dialplan-ari、sip-security-baseline、voice-latency-budget）。
- **质量与测试**：G0-G6 质量门禁；pytest 单测、SIPp 信令压测、音频回放、AI 评测、时延测试、并发压测、安全测试、混沌工程分层覆盖；Makefile 统一目标。
- **交付与风险**：dev/test/staging/prod 四环境，灰度 5%→25%→100% 放量；文档即代码（MkDocs），附 5 天培训大纲与 12 周里程碑。风险表重点：dsh 预览期锁版本+备用执行器、SIP 配置安全、Docker socket 暴露、Asterisk/OpenSIPS GPLv2 许可证、沙箱不注入生产密钥。

## 正文

完整正文见 [[Assets/2026-11/wechat-oJCiADArsydGR9nu9PGrvg.md]]。全文为方案讨论稿：含五层架构图与各层职责、OpenSIPS/Asterisk/语音网关/LLM 工具调用的完整配置与代码示例（opensips.cfg、pjsip.conf、session.py 状态机含 barge-in/降级/handoff、ari_app.py）、SOP-Backend 完整 YAML、G0-G6 门禁定义、测试分层清单、上线灰度与运维闭环、风险治理表，适合作为 AI 原生研发落地 VoxForge 类语音系统的参考蓝图。

## 来源

- [基于 DeepSeek Harness + LoopForge 开发Asterisk+OpenSIPS智能语音系统开发方案讨论](https://mp.weixin.qq.com/s/oJCiADArsydGR9nu9PGrvg)

## 附件

- [[Assets/2026-11/wechat-oJCiADArsydGR9nu9PGrvg.md]]
