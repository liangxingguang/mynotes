---
id: wiki-topic-ai-voice-platform-architecture
type: topic
title: AI 语音平台架构（VoxForge 五层）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: low
tags:
  - topic
  - voice-platform
  - architecture
  - ai-coding
sources:
  - raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md
related:
  - wiki/entities/deepseek-harness.md
  - wiki/entities/loopforge.md
  - wiki/sources/2026-11-20-deepseek-harness-loopforge-voice.md
---
# AI 语音平台架构（VoxForge 五层）

## Scope（范围）

本主题聚合"基于开源 Asterisk + OpenSIPS 的智能语音平台"的架构方案（项目代号 VoxForge）：以 OpenSIPS 为 SIP 信令边界、Asterisk 为呼叫应用层、叠加 ASR/LLM/TTS 的 AI 语音网关，实现智能 IVR、AI 坐席、人机协同转接、通话摘要与质检。覆盖五层架构分解、设计原则、时延预算、WBS 模块、呼叫流程、测试分层、交付上线与风险治理。**注意**：该方案为作者自述的"开发流水线乌托邦模式"蓝图，未经落地验证，置信度低。

## Current Understanding（当前理解）

VoxForge 采用**五层架构**，自下而上为：

- **L1 信令边界层**：OpenSIPS 集群（双活 + VIP/Anycast），负责注册鉴权、拓扑隐藏、TLS、防攻击（pike/ratelimit/fraud）、dispatcher 负载均衡、路由决策、rtpengine 媒体代理（NAT 穿越、SRTP⇄RTP、录音分叉）。
- **L2 呼叫应用层**：Asterisk 集群（PJSIP + ARI Stasis 应用），负责拨号方案、队列/坐席、录音、会议、ExternalMedia 媒体分流。
- **L3 AI 语音网关**：voice-gateway（Python asyncio 或 Go），负责会话状态机、VAD/打断（barge-in）、流式 ASR、对话编排、流式 TTS、工具调用（CRM/工单/查询）、转人工上下文打包。
- **L4 AI 能力层**：ASR（FunASR/Whisper streaming）、TTS（CosyVoice）、LLM（DeepSeek API 或私有化）、RAG（向量库+知识库）、后处理（摘要/意图情绪/质检规则）。
- **L5 业务与数据层**：CRM/工单集成、CDR/录音存储（S3/MinIO）、PostgreSQL、Redis、管理后台（console）、报表。
- **横切**：可观测（Prometheus/Grafana/Loki/Homer SIP 抓包）、安全（密钥/审计）、CI/CD。

**设计原则**：媒体路径与控制路径分离（RTP 只在 rtpengine↔Asterisk↔voice-gateway 流动，业务决策走 ARI 与 HTTP/gRPC 控制面）；信令边界与应用解耦（OpenSIPS 无状态或轻状态，Asterisk 可水平扩容/灰度/摘除）；AI 可降级（ASR/LLM/TTS 任一超时降级到 DTMF IVR 或转人工，"电话永远打得通"）；流式优先（压缩首包时延）；可审计（每轮对话落库并关联 Call-ID/需求单号）。

**时延预算（P50）**：VAD 判停 200–300ms、ASR 最终结果 100–200ms、LLM 首 token 250–400ms、TTS 首包 150–250ms、网络抖动 60–100ms，合计约 760–1250ms；优化手段含流式 ASR 部分结果预取意图、LLM 按标点切句送 TTS、常用话术 TTS 预缓存、打断时立即停播并取消 LLM 请求。

## Key Concepts（关键概念）

- 五层语音平台架构（信令边界→呼叫应用→AI 语音网关→AI 能力→业务数据）
- 媒体与控制路径分离
- AI 可降级与流式优先
- 时延预算分解
- SIP 安全基线（TLS/SRTP/pike/ratelimit/fail2ban）

## Key Entities（关键实体）

- [[deepseek-harness|DeepSeek Harness]]（编码执行器，构建 VoxForge 仓库）
- [[loopforge|LoopForge]]（团队级交付编排，SOP 门禁）
- OpenSIPS、Asterisk（开源语音栈，均 GPLv2）
- FunASR/Whisper、CosyVoice、DeepSeek（L4 AI 能力组件）

## Important Decisions（重要决策）

- **采用开源 Asterisk+OpenSIPS 而非自研信令/媒体栈**：复用成熟生态，自研集中于 AI 语音网关与业务层。
- **业务逻辑放 voice-gateway，拨号方案只做路由入口**：避免在 Asterisk 拨号方案中硬编码业务逻辑（AGENTS.md 硬规则）。
- **执行器可替换 + 版本锁定**：dsh 处于开发者预览，锁定版本、约束沉淀 Skills/SOP、保留第二执行器可切换。
- **门禁分层 G0–G6**：格式/lint → 密钥/许可证 → 单元测试 → SIPp+音频+时延 → 独立评审 → 人工验收 → CI 合入，失败打回上游。

## Major Developments（主要进展）

- 2026-11-17：方案文 v1.0 给出完整五层架构、WBS（M1–M9）、需求模板、SOP 设计、呼叫流程、时延预算、测试分层、发布灰度与 12 周里程碑。
- 2026-11-21：首次立主题页（基于该信源）。

## Disagreements（分歧）

无。该方案为单一信源蓝图，尚无其他信源对照或争议记录。

## Open Questions（开放问题）

- 方案未落地验证：时延、并发（≥200 路）、可用性（≥99.95%）、自助解决率（≥40%/≥60%）均为建议基线，无实测。
- GPLv2 许可证下的商业交付可行性（自研网关通过网络协议 ARI/RTP 交互、避免链接式混合）需法务确认。
- 代码示例与 SOP YAML 为逻辑示意，需在目标版本上由门禁验证。

## Related Topics（相关主题）

- [[2026-11-20-deepseek-harness-loopforge-voice|信源页]]（方案全文出处）
- [[deepseek-harness|DeepSeek Harness]]、[[loopforge|LoopForge]]（构建与编排该平台的两个核心工具）
- [[ai-native-sdlc|AI 原生 SDLC]]（AI 原生研发流水线的上位主题）

## Evidence（证据）

- 信源：`raw/sources/ai/2026-11-20-deepseek-harness-loopforge-voice.md`（第 1 章项目目标、第 3 章技术架构分解、第 3.5 节时延预算、第 5 章代码生成、第 6.3 节门禁、第 8 章交付上线、第 11 章风险治理、第 12.1 节里程碑）。
