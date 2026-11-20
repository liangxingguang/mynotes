---
id: wiki-source-2026-11-20-deepseek-harness-loopforge-voice
type: source
title: 基于 DeepSeek Harness + LoopForge 开发 Asterisk+OpenSIPS 智能语音系统开发方案讨论
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: low
tags:
  - source
  - ai-coding
  - voice-platform
  - loopforge
  - deepseek-harness
sources:
  - raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md
related:
  - wiki/entities/loopforge.md
  - wiki/entities/deepseek-harness.md
  - wiki/topics/ai-voice-platform-architecture.md
  - wiki/concepts/ai-native-sdlc.md
---
# 基于 DeepSeek Harness + LoopForge 开发 Asterisk+OpenSIPS 智能语音系统开发方案讨论

## Overview（概览）

微信公众号长文（版本 v1.0，2026-11-17）：以"AI 能写代码还要程序员干嘛"为引，用一个真实业务场景（项目代号 VoxForge，开源 Asterisk+OpenSIPS 智能语音平台）演示 DeepSeek Harness（dsh）作为编码执行器与 LoopForge（腾讯开源）作为团队级交付编排如何拼成 AI 原生研发流水线。涵盖项目目标、五层架构分解、需求提交与模板、代码生成、提交评审、分层测试、交付上线、文档、培训、风险治理与 12 周里程碑。作者自述为"开发流水线的乌托邦模式"，全文为**方案蓝图**，未经落地验证，置信度低。

## Key Facts（关键事实）

- **项目定义**：VoxForge 面向企业的开源智能语音系统，OpenSIPS 作 SIP 信令边界与负载均衡层，Asterisk 作媒体与呼叫应用层，叠加 ASR/LLM/TTS 组成 AI 语音网关，实现智能 IVR、AI 坐席、人机协同转接、通话摘要与质检。
- **业务目标基线**：智能 IVR 自助解决率 ≥40%（首期）/≥60%（二期）；端到端语音响应时延（用户说完到 AI 开口）P50 ≤900ms、P95 ≤1500ms；单 Asterisk 节点 ≥200 路 AI 会话、集群线性扩展；OpenSIPS 双活 ≥99.95%；转人工上下文完整率 100%；AI 研发交付每个需求 100% 走 SOP、门禁通过才可合入。
- **dsh 定位**：DeepSeek 开源的 Agent Harness，"一切皆插件"架构，基于 Cordis 运行时；模型、工具、技能、会话、沙箱、存储、循环、调度、UI 等均由插件组合可替换。提供标准模式、Code 模式（Code Mode SDK 用 TypeScript 组合多步操作）、极简模式。
- **dsh 启动**：`npx @deepseek-ai/dsh web`，默认 Web UI `http://127.0.0.1:3080`；源码方式 `pnpm install && pnpm run build && pnpm dsh web`。项目处于开发者预览阶段，官方提示会有不兼容变更，故方案将 dsh 版本锁定、关键约束沉淀在 Skills 与 SOP 中。
- **dsh 角色**：本项目中作为编码执行器，所有"写代码/改配置/跑测试"由 dsh 完成；项目知识（Asterisk 拨号方案规范、OpenSIPS 路由规范、SIP 安全基线）以 Skill 形式放 `.dsh/skills/` 下按需加载，社区技能包同路径安装。
- **LoopForge 定位**：腾讯开源的自托管团队研发工作台，Main Bot 在 Docker 沙箱中检出仓库、调度项目角色并提交 PR；支持 10 种编码 Agent CLI 作执行器，含 DeepSeek Harness（已内置 Docker 镜像、用个人密钥）。
- **SOP 节点类型**：Agent、Script（确定性构建/测试/lint）、Human gate（人工审批或打回）、Sub-SOP、Preview build。核心思路"DAG 管主干，Agent 管节点，人管签字"。
- **腾讯内部实践数据**：合入 836 个 MR，一次通过率 54.8%，经门禁打回返工后终态成功率 95.4%（InfoQ）；每次 SOP 运行结束复盘引擎回溯全链路轨迹，给出 0~100 健康度评分和改进处方（腾讯云开发者社区）。
- **LoopForge Local**：本地轻量模式，DeepSeek Harness 经 Portable Edition 支持，安装 `npx -y loopforge-cli@latest skills install dsh`，入口 `/devflow "<request>"`；本地运行产物位于 `artifacts/{task_slug}/`。
- **五层架构**：L1 信令边界层 OpenSIPS（双活+VIP/Anycast、注册鉴权、拓扑隐藏、TLS、防攻击 pike/ratelimit/fraud、dispatcher 负载均衡、rtpengine 媒体代理）→ L2 呼叫应用层 Asterisk（PJSIP+ARI Stasis、拨号方案/队列/录音/会议/ExternalMedia）→ L3 AI 语音网关 voice-gateway（Python asyncio/Go，会话状态机、VAD/打断、流式 ASR、对话编排、流式 TTS、工具调用、转人工上下文打包）→ L4 AI 能力层（ASR FunASR/Whisper、TTS CosyVoice、LLM DeepSeek、RAG、后处理）→ L5 业务与数据层（CRM/工单、CDR/录音存储、PostgreSQL、Redis、管理后台）。
- **设计原则**：媒体与控制路径分离；信令边界与应用解耦；AI 可降级（任一超时降级到 DTMF IVR 或转人工，"电话永远打得通"）；流式优先；可审计（每轮对话落库并关联 Call-ID/需求单号）。
- **时延预算（P50）**：VAD 判停 200–300ms、ASR 最终结果 100–200ms、LLM 首 token 250–400ms、TTS 首包 150–250ms、网络抖动 60–100ms，合计约 760–1250ms。
- **WBS 模块**：M1 OpenSIPS 边界 / M2 Asterisk 应用 / M3 AI 语音网关 / M4 AI 能力适配 / M5 业务集成 / M6 管理后台 / M7 部署运维 / M8 测试资产 / M9 文档培训，各对应一个 SOP（SOP-SIP/PBX/Backend/Frontend/Ops/QA/Docs）。
- **门禁分层**：G0 格式/lint/类型 → G1 gitleaks/许可证（Asterisk/OpenSIPS 均 GPLv2）→ G2 单元测试覆盖率 ≥70%（核心状态机 ≥85%）→ G3 SIPp+音频+时延报告 → G4 独立 Agent 评审（阻断项为 0）→ G5 人工验收 → G6 CI 复跑+维护者合入；门禁失败可打回指定上游步骤。
- **角色分工**：架构师 Planner、SIP 工程师、PBX 工程师、后端工程师、Reviewer（建议不同执行器/模型以降低自评偏差）、QA、技术写作；每个角色可独立选执行器/模型/Skills/MCP。
- **需求分级**：S（配置/文案/单文件，Main Bot 直接改提 PR）/M（单模块，对应 SOP）/L（跨模块，先产品 SOP 出 PRD 再拆分）；所有需求以 LoopForge"需求"为唯一入口，对话临时修改也需关联需求单。
- **发布灰度**：OpenSIPS dispatcher 权重 5%→25%→100% 导向新版节点，每档观察 30 分钟的 ASR 错误率、首包时延、转人工率、掉话率；回滚为 dispatcher 切回旧节点（秒级）+镜像+配置回滚。
- **12 周里程碑**：W1 部署 LoopForge+仓库骨架 → W2 架构评审+SOP 初版 → W3–4 M1/M2 基础呼叫 → W5–7 M3/M4 智能 IVR/打断/降级/转人工 → W8 M5/M6 → W9 压测/安全/混沌 → W10 staging 灰度+文档冻结 → W11 培训验收 → W12 生产上线+复盘+SOP v2。

## Important Claims（重要论断）

### Claim 1：AI 原生研发流水线 = 编排平台 + 可替换执行器

DeepSeek Harness 负责节点内的"怎么做"（编码、配置、测试），LoopForge 负责"能不能做"（流程顺序、依赖、回退、门禁、追溯），两者解耦使执行器可替换、任务体系不被锁定在某个产品中。

### Claim 2：不需要 AI 的地方不用 AI

构建、测试、lint、SIPp 压测等确定性环节由 LoopForge Script 节点完成，AI 只负责节点内分析与编码，关键决策与验收由人（Human gate）把关。

### Claim 3：版本锁定 + 约束外置对抗预览期不兼容

dsh 处于开发者预览、有不兼容变更，应对不是依赖其内部行为，而是锁定版本、把关键约束沉淀到 Skills/SOP，并保留第二执行器（如 Codex/Claude Code）可切换。

### Claim 4：安全与合规靠门禁与人工签字兜底

Agent 生成 SIP 配置存在盗打/话费欺诈风险，靠安全基线技能 + G1 门禁 + 人工安全评审；生产配置变更必须人工签字；Docker socket 访问面向可信团队而非不可信多租户。

## Concepts Introduced（引入的概念）

- AI 原生研发流水线（编排平台 + 可替换编码执行器）
- SOP 编排（Agent/Script/Human gate 节点、DAG 主干）
- 五层语音平台架构（信令边界→呼叫应用→AI 语音网关→AI 能力→业务数据）
- 时延预算分解（VAD/ASR/LLM/TTS/网络分段预算）
- 分层质量门禁（G0–G6，失败打回上游）

## Entities Mentioned（提及的实体）

- [[loopforge|LoopForge]]（腾讯开源团队交付编排工作台）
- [[deepseek-harness|DeepSeek Harness]]（编码 Agent 执行器）
- VoxForge（项目代号，本文方案对象）
- OpenSIPS、Asterisk（开源语音栈，GPLv2）

## Implications（影响／启示）

- 方案展示了"AI 原生"不是单纯让模型写代码，而是把需求澄清、架构、编码、测试、门禁、上线、文档、培训整条交付链用 SOP 串起来，用人工门禁守住安全与验收。
- 执行器可替换 + 版本锁定 + 约束外置，是面对预览期/快速演化工具链时降低被锁定的工程纪律，与 [[harness-engineering|Harness 工程]] 中"平台守边界、Harness 管执行"的思路一致。

## Limitations（局限）

- **未经落地验证**：作者自述为"开发流水线的乌托邦模式"，全文是方案蓝图，指标基线（时延、并发、可用性、自助解决率）均为建议值，无实测数据。
- 代码示例（OpenSIPS/Asterisk/Python）为结构与规范示例，需在目标版本上由 SOP 门禁验证；LoopForge SOP YAML 为逻辑示意，实际以设计器配置为准。
- 腾讯实践数据（836 MR/54.8%/95.4%）转述自 InfoQ/腾讯云开发者社区，非本方案自身结果。

## Related Knowledge（相关知识）

- [[loopforge|LoopForge]]（编排平台实体，本文核心工具之一）
- [[deepseek-harness|DeepSeek Harness]]（编码执行器实体）
- [[ai-voice-platform-architecture|AI 语音平台架构]]（本文五层架构的主题导航）
- [[ai-native-sdlc|AI 原生 SDLC]]（AI 原生研发流水线与门禁编排的印证）

## Source（信源）

- `raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md`
