---
title: 基于 DeepSeek Harness + LoopForge 开发Asterisk+OpenSIPS智能语音系统开发方案讨论
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/oJCiADArsydGR9nu9PGrvg
source_type: article
platform: 微信
captured: 2026-11-20
registered_at: 2026-11-21
inbox_ref: Inbox/2026-11-20-deepseek-harness-loopforge-voice.md
asset_ref: Assets/2026-11/wechat-oJCiADArsydGR9nu9PGrvg.md
---

# 基于 DeepSeek Harness + LoopForge 开发Asterisk+OpenSIPS智能语音系统开发方案讨论

AI能够写代码，还要程序员干嘛？这是2026年的一个大问题，也是未来的大问题。其实，以前包括现在，程序员也仅是软件开发中的其中一环，很多环节需要项目管理，产品经理，测试，文档工程师来一起协同完成。现在，这一套体系可能被完全颠覆，人仅负责review流程结果，点击同意，不同Agent角色帮助你完成这个流水线。DeepSeek Harness的开始进入到了业务开发的环境中，从产品需求，到技术架构，到代码，到文档流水线已经启动，我们通过一套实际业务场景（语音AI智能平台开发）来一步步介绍harness 和LoopForge是如何帮助企业实现平台的流水线开发。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

说明：这是一个开发流水线的乌托邦模式，但是这已经进入了我们的工作环境。以下讨论是一个AI 原生的开发框架平台，希望对读者或者软件从业人员未来的软件生态有一定参考，至少在失业前知道被谁替代。

## Asterisk + OpenSIPS 开源技术栈 · 从架构分解到培训交付的全流程手册

版本：v1.0 · 日期：2026-11-17 · 适用对象：架构师、研发、测试、运维、交付与培训团队

项目名称：基于开源Asterisk+OpenSIPS的智能语音平台

* * *

## 目录

1.  1\. 项目概述与目标

2.  2\. 框架工具定位：DeepSeek Harness 与 LoopForge

3.  3\. 技术架构分解

4.  4\. 功能需求提交

5.  5\. 代码生成

6.  6\. 代码提交与评审

7.  7\. 测试

8.  8\. 交付与上线

9.  9\. 文档输出

10.  10\. 培训

11.  11\. 风险、治理与安全

12.  12\. 附录：模板、命令与参考资料

* * *

## 1\. 项目概述与目标

### 1.1 项目定义

构建一套面向企业的开源智能语音系统（项目代号 `VoxForge`），以 OpenSIPS 作为 SIP 信令边界与负载均衡层，以 Asterisk 作为媒体与呼叫应用层，叠加 ASR / LLM / TTS 组成的 AI 语音网关，实现智能 IVR、AI 坐席、人机协同转接、通话摘要与质检等能力。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

开发过程本身采用 "AI 原生研发" 模式：

*   • DeepSeek Harness（dsh）作为编码 Agent 执行器，负责代码阅读、生成、修改、运行测试；

*   • LoopForge 作为团队级交付编排平台，用 SOP（Agent 节点 + 脚本节点 + 人工门禁）把需求变成可追溯、可复现、可验收的交付。

### 1.2 业务目标

目标

指标（建议基线）

智能 IVR 自助解决率

≥ 40%（首期），≥ 60%（二期）

端到端语音响应时延（用户说完到 AI 开口）

P50 ≤ 900 ms，P95 ≤ 1500 ms

并发通话

单 Asterisk 节点 ≥ 200 路 AI 会话；集群线性扩展

信令可用性

OpenSIPS 双活，≥ 99.95%

转人工上下文完整率

100%（摘要 + 意图 + 槽位随呼叫透传）

AI 研发交付

每个需求 100% 走 SOP，门禁通过后才可合入

### 1.3 范围说明

*   • 首期（MVP）：呼入智能 IVR、AI 应答、转人工、通话录音与摘要、基础管理后台。

*   • 二期：外呼任务、实时坐席辅助、AI 质检、多租户、知识库 RAG 运营台。

*   • 不在范围：自研 ASR/TTS 模型训练、计费 BSS、PSTN 牌照相关事项。

* * *

## 2\. 框架工具定位：DeepSeek Harness 与 LoopForge

### 2.1 DeepSeek Harness（dsh）

*   • DeepSeek Harness 是 DeepSeek 开源的 Agent Harness，采用 "一切皆插件" 架构，基于 Cordis 运行时（GitHub 仓库）。

*   • 模型、工具、技能、会话、沙箱、存储、循环、调度、UI 等能力均由插件组合，可替换和重组（DeepSeek Harness 中文介绍）。

*   • 提供标准模式（文件编辑、Shell、检索、Skills、计划、目标、子代理、工作流）、Code 模式（通过 Code Mode SDK 用 TypeScript 程序组合多步操作）和极简模式（DeepSeek Harness 中文介绍）。

*   • 启动方式：`npx @deepseek-ai/dsh web`，默认 Web UI 地址 `http://127.0.0.1:3080`；源码方式为 `pnpm install && pnpm run build && pnpm dsh web`（README）。

*   • 注意：项目仍处于开发者预览阶段，官方提示会有不兼容变更（README）。因此本方案将 dsh 版本锁定，并把关键约束沉淀在 Skills 与 SOP 中，而不是依赖 dsh 内部行为。

在本项目中的角色：编码执行器。所有 "写代码 / 改配置 / 跑测试" 动作由 dsh 完成；项目知识（Asterisk 拨号方案规范、OpenSIPS 路由规范、SIP 安全基线）以 Skill 形式放在 `.dsh/skills/` 下按需加载（社区技能包也采用 `.dsh/skills/<name>` 安装路径，见 awesome-deepseek-harness）。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3Csvg%3E>)

### 2.2 LoopForge（腾讯开源）

*   • LoopForge 是自托管的团队研发工作台：Main Bot 在 Docker 沙箱中检出仓库、调度项目角色并提交 PR；成熟的做法可沉淀为 SOP（Tencent/LoopForge）。

*   • 支持 10 种编码 Agent CLI 作为执行器，其中包括 DeepSeek Harness，且 DeepSeek Harness 已内置在 Docker 镜像中，使用个人密钥（Tencent/LoopForge）。

*   • SOP 节点类型：Agent、Script（确定性构建/测试/lint）、Human gate（人工审批或打回）、Sub-SOP、Preview build（Tencent/LoopForge）。

*   • 核心思路是 "DAG 管主干，Agent 管节点，人管签字"；腾讯内部实践合入 836 个 MR，一次通过率 54.8%，经门禁打回返工后终态成功率 95.4%（InfoQ）。

*   • 每次 SOP 运行结束后，复盘引擎会回溯全链路轨迹并给出 0~100 健康度评分和改进处方（腾讯云开发者社区）。

*   • 本地轻量模式 LoopForge Local：DeepSeek Harness 通过 Portable Edition 支持，安装 `npx -y loopforge-cli@latest skills install dsh`，入口 `/devflow "<request>"`（LoopForge Local 使用说明）。

### 2.3 两者组合的分工

`┌─────────────────────────── LoopForge（编排 / 门禁 / 追溯） ───────────────────────────┐   │ 需求池 → SOP-DAG → [Agent 节点] → [Script 节点] → [Human Gate] → PR/MR → 复盘评分        │   │                         │                                                              │   │                         ▼                                                              │   │              DeepSeek Harness（执行器）                                                 │   │     模型(DeepSeek) + Skills(.dsh/skills) + MCP 工具 + Shell/编辑 + 子代理               │   └──────────────────────────────────────────────────────────────────────────────────────┘                             │ 产出代码/配置/测试/文档                             ▼           VoxForge 仓库：opensips/ asterisk/ voice-gateway/ ai-services/ console/ deploy/ docs/`

层面

负责方

说明

流程顺序、依赖、回退

LoopForge SOP

确定性 DAG，不让 Agent 自由跳步

节点内分析与编码

dsh

按角色 Prompt + Skills 执行

构建、测试、lint、SIPp 压测

LoopForge Script 节点

不需要 AI 的地方不用 AI

关键决策与验收

人（Human gate）

架构评审、安全评审、上线审批

个人开发者本地迭代

LoopForge Local + dsh `/devflow`

小改动、原型验证

* * *

## 3\. 技术架构分解

### 3.1 总体架构

                `PSTN / SIP Trunk / WebRTC / 话机                                 │  SIP(TLS) + SRTP                                 ▼    ┌──────────────────────────────────────────────────────────────┐    │ L1 信令边界层：OpenSIPS 集群（双活 + VIP / Anycast）            │    │  注册/鉴权 · 拓扑隐藏 · TLS · 防攻击(pike/ratelimit/fraud)     │    │  dispatcher 负载均衡 · 路由决策(HTTP→路由服务) · 计费事件     │    │  rtpengine 媒体代理（NAT 穿越、SRTP⇄RTP、录音分叉）            │    └──────────────────────────────────────────────────────────────┘                                 │ SIP(内网)                                 ▼    ┌──────────────────────────────────────────────────────────────┐    │ L2 呼叫应用层：Asterisk 集群（PJSIP + ARI Stasis 应用）        │    │  拨号方案 · 队列/坐席 · 录音 · 会议 · ExternalMedia 媒体分流  │    └──────────────────────────────────────────────────────────────┘             │ ARI(WebSocket/REST)          │ RTP(slin16) ExternalMedia             ▼                              ▼    ┌──────────────────────────────────────────────────────────────┐    │ L3 AI 语音网关（voice-gateway，Python asyncio / Go）           │    │  会话状态机 · VAD/打断(barge-in) · 流式 ASR · 对话编排        │    │  流式 TTS · 工具调用(CRM/工单/查询) · 转人工上下文打包        │    └──────────────────────────────────────────────────────────────┘             │ gRPC/WebSocket             ▼    ┌──────────────────────────────────────────────────────────────┐    │ L4 AI 能力层                                                   │    │  ASR：FunASR / Whisper(streaming)   TTS：CosyVoice / 其他      │    │  LLM：DeepSeek API 或私有化部署     RAG：向量库 + 知识库       │    │  后处理：摘要 · 意图/情绪 · 质检规则                          │    └──────────────────────────────────────────────────────────────┘             │             ▼    ┌──────────────────────────────────────────────────────────────┐    │ L5 业务与数据层                                                │    │  CRM/工单集成 · CDR/录音存储(S3/MinIO) · PostgreSQL · Redis    │    │  管理后台(console) · 报表                                      │    └──────────────────────────────────────────────────────────────┘    横切：可观测(Prometheus/Grafana/Loki/Homer SIP 抓包) · 安全(密钥/审计) · CI/CD`

### 3.2 设计原则

1.  1\. 媒体路径与控制路径分离：RTP 只在 rtpengine ↔ Asterisk ↔ voice-gateway 之间流动；业务决策走 ARI 与 HTTP/gRPC 控制面。

2.  2\. 信令边界与应用解耦：OpenSIPS 无状态或轻状态，Asterisk 可水平扩容、灰度、摘除。

3.  3\. AI 可降级：ASR/LLM/TTS 任一超时，状态机降级到传统 DTMF IVR 或直接转人工，保证 "电话永远打得通"。

4.  4\. 流式优先：ASR 流式识别、LLM 流式输出、TTS 分句流式合成，压缩首包时延。

5.  5\. 可审计：每一轮对话（ASR 文本、LLM 决策、工具调用、TTS 文本）均落库，并与 Call-ID / 需求单号关联。

### 3.3 模块分解（WBS）

模块

子模块

技术选型

产出物

负责 SOP

M1 OpenSIPS 边界

注册鉴权、拓扑隐藏、dispatcher、反欺诈、rtpengine 联动

OpenSIPS 3.x LTS + rtpengine

`opensips/opensips.cfg`

、DB schema、单元化路由脚本

SOP-SIP

M2 Asterisk 应用

PJSIP 配置、拨号方案、队列、录音、ARI Stasis

Asterisk 22 LTS

`asterisk/etc/*.conf`

、ARI 应用

SOP-PBX

M3 AI 语音网关

ARI 客户端、RTP 收发、VAD、会话状态机、打断

Python 3.12 asyncio（或 Go）

`voice-gateway/`

SOP-Backend

M4 AI 能力适配

ASR/TTS/LLM 适配器、RAG、提示词管理

gRPC 适配层

`ai-services/`

SOP-Backend

M5 业务集成

CRM/工单 MCP 工具、CDR 汇总、转人工上下文

REST + Webhook

`integrations/`

SOP-Backend

M6 管理后台

流程配置、知识库、通话检索、报表

Vue3/React + FastAPI

`console/`

SOP-Frontend

M7 部署运维

Docker Compose、K8s Helm、监控告警

Helm、Prometheus

`deploy/`

SOP-Ops

M8 测试资产

SIPp 场景、语音回放用例、压测

SIPp、pytest、k6

`tests/`

SOP-QA

M9 文档培训

架构/运维/API/培训课件

MkDocs

`docs/`

SOP-Docs

### 3.4 关键呼叫流程（呼入智能 IVR）

`主叫 → OpenSIPS: INVITE（鉴权、限速、拓扑隐藏、选择 Asterisk 节点）   OpenSIPS → rtpengine: offer（媒体锚定）   OpenSIPS → Asterisk: INVITE   Asterisk 拨号方案 → Stasis(voxforge-ai)    voice-gateway(ARI) ← StasisStart 事件   voice-gateway → ARI: 创建 mixing bridge + ExternalMedia 通道(slin16/RTP)   Asterisk ⇄ voice-gateway：双向 RTP   voice-gateway：VAD → 流式 ASR → LLM(工具调用/RAG) → 流式 TTS → RTP 回放   意图 = 转人工：打包摘要/槽位 → 写入通道变量 & CRM → ARI continue 到队列   挂机：StasisEnd → 生成摘要/质检 → CDR + 录音入库`

### 3.5 时延预算（P50）

环节

预算

VAD 判停（尾音）

200–300 ms

ASR 最终结果

100–200 ms

LLM 首 token

250–400 ms

TTS 首包

150–250 ms

网络与抖动缓冲

60–100 ms

合计

约 760–1250 ms

优化手段：流式 ASR 部分结果预取意图、LLM 输出按标点切句送 TTS、常用话术 TTS 预缓存、打断时立即停止播放并取消 LLM 请求。

### 3.6 非功能需求

*   • 安全：SIP over TLS、SRTP、OpenSIPS pike + ratelimit、fail2ban、ARI 仅内网 + 强口令、密钥统一放 Vault/K8s Secret，Agent 沙箱不注入生产密钥。

*   • 隐私合规：录音与转写可配置保留期、脱敏（手机号、证件号）、LLM 调用日志不落敏感字段。

*   • 可观测：SIP 指标（OpenSIPS statistics → Prometheus）、Asterisk 通道数、AI 各段时延直方图、Homer 全量 SIP 抓包。

* * *

## 4\. 功能需求提交

### 4.1 需求流转规则

1.  1\. 所有需求以 LoopForge "需求" 为唯一入口；对话中的临时修改也需关联需求单，以便纳入交付与成本报表（LoopForge 中对话和 SOP 追踪的是同一套需求，见 Tencent/LoopForge）。

2.  2\. 中大型需求先由 "需求澄清" 进入设计，确认目标、范围、排除项、关键决策与验收标准后再进入实现（与 LoopForge Local 工作流 "先理解问题、确认边界再实现" 的原则一致，见 LoopForge Local 使用说明）。

3.  3\. 需求分级：

*   • S（小）：配置/文案/单文件修复 → Main Bot 对话直接改并提 PR；

*   • M（中）：单模块功能 → 对应模块 SOP；

*   • L（大）：跨模块功能 → 先跑 "产品 SOP" 出 PRD 与设计，再拆分子需求。

### 4.2 需求模板（提交到 LoopForge）

`# [REQ-AI-001] 呼入智能 IVR：AI 自然语言导航      ## 背景与目标   用户来电无需按键，直接说出诉求，系统识别意图并自助办理或转入对应技能组。      ## 用户故事   - 作为来电客户，我说"查一下我的订单"，系统应询问订单号并播报状态。   - 作为来电客户，我说"转人工"或连续两次未识别，系统应转接人工并告知坐席我的诉求。      ## 范围   - 包含：意图识别(订单查询/投诉/转人工/营业时间)、槽位收集、打断、转人工上下文   - 排除：外呼、多语种、声纹      ## 验收标准（可测试）   1. AC-1：SIPp + 预录音频回放，10 条标准语料意图识别准确率 ≥ 90%   2. AC-2：用户说完到 AI 首包语音 P95 ≤ 1500 ms（测试报告中给出直方图）   3. AC-3：ASR 服务不可用时 3 秒内降级为 DTMF 菜单   4. AC-4：转人工时坐席端可看到 summary、intent、slots 三个字段   5. AC-5：AI 播报中用户插话，播放在 300 ms 内停止      ## 影响模块   M2 Asterisk、M3 voice-gateway、M4 ai-services、M5 integrations      ## 约束   - 不允许在 Asterisk 拨号方案中硬编码业务逻辑，业务决策放 voice-gateway   - 不得引入 GPL 以外许可冲突依赖（需在设计中列出依赖许可）      ## 优先级 / 级别   P0 / L`

### 4.3 MVP 需求清单（示例）

编号

需求

级别

模块

SOP

REQ-SIP-001

OpenSIPS 注册鉴权 + 拓扑隐藏 + dispatcher 到 Asterisk

M

M1

SOP-SIP

REQ-SIP-002

防攻击：pike、ratelimit、UA 黑名单

M

M1

SOP-SIP

REQ-PBX-001

PJSIP 与 OpenSIPS 对接、Stasis 入口拨号方案

M

M2

SOP-PBX

REQ-AI-001

呼入智能 IVR（见上）

L

M2–M5

产品 SOP → 拆分

REQ-AI-002

打断（barge-in）与 VAD

M

M3

SOP-Backend

REQ-AI-003

通话摘要与意图标签入库

M

M4

SOP-Backend

REQ-INT-001

CRM 客户识别（来电号码 → 客户档案）

M

M5

SOP-Backend

REQ-OPS-001

Docker Compose 一键环境 + Prometheus 看板

M

M7

SOP-Ops

REQ-UI-001

通话检索与转写回放页面

M

M6

SOP-Frontend

* * *

## 5\. 代码生成

### 5.1 仓库结构

`voxforge/   ├── AGENTS.md                    # 给所有编码 Agent 的总规则   ├── .dsh/skills/                 # DeepSeek Harness 项目技能   │   ├── opensips-routing/SKILL.md   │   ├── asterisk-dialplan-ari/SKILL.md   │   ├── sip-security-baseline/SKILL.md   │   └── voice-latency-budget/SKILL.md   ├── opensips/                    # M1   ├── asterisk/                    # M2   ├── voice-gateway/               # M3   ├── ai-services/                 # M4   ├── integrations/                # M5   ├── console/                     # M6   ├── deploy/                      # M7 compose / helm   ├── tests/                       # M8 sipp / audio / load   └── docs/                        # M9`

### 5.2 AGENTS.md（项目总规则，节选）

``# VoxForge Agent Rules   - 先读 docs/architecture.md 与相关 .dsh/skills，再改代码。   - 媒体与控制分离：禁止在 voice-gateway 之外处理 RTP 负载。   - Asterisk 拨号方案只做路由入口，业务逻辑写在 voice-gateway。   - 任何 OpenSIPS 路由改动必须同时提交 tests/sipp/ 下的场景并通过 `make test-sip`。   - 禁止提交密钥；配置项走环境变量，示例写入 .env.example。   - 每个 PR 必须更新 CHANGELOG 与受影响文档。   - 实现者不得评审自己的代码（评审由独立 Reviewer 角色完成）。``

### 5.3 DeepSeek Harness 技能示例

`.dsh/skills/opensips-routing/SKILL.md`：

`` ---   name: opensips-routing   description: 编写或修改 OpenSIPS 路由脚本时加载。包含模块清单、路由分层约定、安全基线和测试要求。   ---   # OpenSIPS 路由规范   ## 分层   route[MAIN] → route[SECURITY] → route[AUTH] → route[RELAY_TO_PBX]   ## 必须   - 初始请求先过 SECURITY（pike_check_req、rl_check、UA 黑名单）   - 发往 Asterisk 前调用 topology_hiding() 与 rtpengine_offer()   - 负载均衡使用 dispatcher 集合 1，算法 4（轮询）并开启探测   ## 测试   - 每个新分支在 tests/sipp/ 增加 uac 场景；运行 `make test-sip` ``

`.dsh/skills/voice-latency-budget/SKILL.md` 中写明第 3.5 节时延预算，要求 Agent 在实现任何 ASR/LLM/TTS 调用时必须流式、带超时与降级路径，并输出时延埋点。

### 5.4 LoopForge 角色定义

角色

执行器

模型

挂载 Skills / MCP

职责

架构师 Planner

DeepSeek Harness

推理型模型

全部技能、docs

方案设计、接口定义、任务拆分

SIP 工程师

DeepSeek Harness

编码模型

opensips-routing、sip-security-baseline

OpenSIPS 脚本与 SIPp 场景

PBX 工程师

DeepSeek Harness

编码模型

asterisk-dialplan-ari

Asterisk 配置与 ARI

后端工程师

DeepSeek Harness

编码模型

voice-latency-budget；CRM MCP

voice-gateway、ai-services

Reviewer

另一执行器或不同模型

推理型模型

全部技能

独立代码评审（避免自评）

QA

DeepSeek Harness

编码模型

测试技能

编写/补充测试，分析报告

技术写作

DeepSeek Harness

通用模型

文档规范

文档与培训材料

LoopForge 允许每个角色独立选择执行器、模型、规则、Skills 和 MCP 工具（Tencent/LoopForge）。Reviewer 建议使用与实现者不同的执行器或模型，以降低单一上下文自评偏差。

### 5.5 SOP 设计（以 SOP-Backend 为例）

以下为逻辑示意，实际以 LoopForge SOP 设计器配置和导出格式为准：

`sop: SOP-Backend-VoiceFeature   version: 1.0   nodes:  - id: clarify        # Agent：需求澄清，输出 requirement.md（目标/范围/AC）    type: agent    role: 架构师 Planner  - id: gate_scope     # 人工确认范围与验收标准    type: human_gate    depends: [clarify]  - id: design         # Agent：接口、时序图、数据结构、降级路径 → design.md    type: agent    role: 架构师 Planner    depends: [gate_design]   - id: gate_design    # 架构评审（L 级需求必须）    type: human_gate    depends: [design]   - id: implement      # Agent：编码 + 单元测试    type: agent    role: 后端工程师    depends: [gate_design]   - id: static_check   # Script：ruff / mypy / gitleaks / license-check    type: script    run: make lint && make secret-scan && make license-check   depends: [implement]    on_fail: implement    		# 打回实现节点自愈 - id: unit_test   type: script   run: make test-unit   depends: [static_check]   on_fail: implement   - id: integ_test    # Script：拉起 compose 环境，跑 SIPp + 音频回放   type: script   run: make env-up && make test-sip && make test-audio && make latency-report   depends: [unit_test]   on_fail: implement   - id: review       # Agent：独立评审，输出 review.md（阻断项/建议项）   type: agent   role: Reviewer   depends: [integ_test]   on_fail: implement   - id: docs          # Agent：更新 API/运维文档与 CHANGELOG   type: agent   role: 技术写作   depends: [review]   - id: gate_accept   # 人工验收：看测试报告、时延报告、评审结论   type: human_gate   depends: [docs]   - id: open_pr       # 提交 PR/MR   type: script   run: make pr   depends: [gate_accept]`

### 5.6 生成代码示例

以下为 Agent 在 SOP 中应产出的代码形态示例，供 Prompt 与评审参照。

#### 5.6.1 OpenSIPS 路由（节选）

`# opensips/opensips.cfg（节选，OpenSIPS 3.x）   loadmodule "signaling.so"   loadmodule "sl.so"   loadmodule "tm.so"   loadmodule "rr.so"   loadmodule "dialog.so"   loadmodule "topology_hiding.so"   loadmodule "dispatcher.so"   loadmodule "pike.so"   loadmodule "ratelimit.so"   loadmodule "rtpengine.so"      modparam("dispatcher", "db_url", "postgres://opensips:${DB_PASS}@db/opensips")   modparam("dispatcher", "ds_ping_interval", 10)   modparam("pike", "sampling_time_unit", 2)   modparam("pike", "reqs_density_per_unit", 30)   modparam("rtpengine", "rtpengine_sock", "udp:rtpengine:2223")      route {       route(SECURITY);          if (has_totag()) {           if (topology_hiding_match()) { t_relay(); exit; }           if (loose_route()) { t_relay(); exit; }           sl_send_reply(404, "Not here"); exit;       }          if (is_method("REGISTER")) { route(REGISTRAR); exit; }          if (is_method("INVITE")) {           create_dialog();           topology_hiding();           rtpengine_offer("replace-origin replace-session-connection ICE=remove");           route(RELAY_TO_PBX);       }   }      route[SECURITY] {       if (!pike_check_req()) { exit; }       if (!rl_check("sip_$si", 50, "TAILDROP")) { sl_send_reply(503, "Rate limited"); exit; }       if ($ua =~ "(friendly-scanner|sipvicious|sipcli)") { drop; }   }      route[RELAY_TO_PBX] {       if (!ds_select_dst(1, 4)) { sl_send_reply(503, "No PBX available"); exit; }       t_on_reply("PBX_REPLY");       t_on_failure("PBX_FAILOVER");       t_relay();   }      onreply_route[PBX_REPLY] {       if (has_body("application/sdp")) { rtpengine_answer(); }   }      failure_route[PBX_FAILOVER] {       if (t_check_status("(408|5[0-9][0-9])")) {           ds_mark_dst("p");           if (ds_next_dst()) { t_on_failure("PBX_FAILOVER"); t_relay(); }       }   }`

#### 5.6.2 Asterisk 入口配置

`; asterisk/etc/pjsip.conf（节选）   [opensips-trunk]   type=endpoint   context=from-opensips   disallow=all   allow=ulaw,alaw,opus   direct_media=no   aors=opensips-trunk   identify_by=ip      [opensips-trunk]   type=identify   endpoint=opensips-trunk   match=10.10.0.0/24      ; asterisk/etc/extensions.conf   [from-opensips]   exten => _X.,1,NoOp(VoxForge inbound ${CALLERID(num)} -> ${EXTEN}) same => n,Set(CHANNEL(language)=zh) same => n,Stasis(voxforge-ai,${EXTEN}) same => n,Hangup()      [to-agents]   exten => human,1,NoOp(AI handoff: ${VOX_INTENT} / ${VOX_SUMMARY}) same => n,Queue(support,,,,300) same => n,Hangup()      ; asterisk/etc/ari.conf   [general]   enabled=yes   [voxforge]   type=user   read_only=no   password=${ARI_PASSWORD}    ; 实际部署由模板渲染注入`

#### 5.6.3 AI 语音网关核心（Python，节选）

`# voice-gateway/app/session.py   import asyncio, time, logging   from enum import Enum   from .ari import AriClient   from .rtp import RtpEndpoint   from .adapters import asr, llm, tts      log = logging.getLogger("voxforge.session")      class State(Enum):       LISTENING = 1       THINKING = 2       SPEAKING = 3       HANDOFF = 4      class CallSession:    """单通呼叫的 AI 会话：Asterisk ExternalMedia <-> ASR/LLM/TTS"""    def __init__(self, ari: AriClient, channel_id: str, rtp: RtpEndpoint):           self.ari, self.channel_id, self.rtp = ari, channel_id, rtp           self.state = State.LISTENING           self.history: list[dict] = []           self.speak_task: asyncio.Task | None = None           self.llm_task: asyncio.Task | None = None           self.metrics: dict[str, float] = {}    async def run(self):           await self.say("您好，请问有什么可以帮您？")           async for event in asr.stream(self.rtp.inbound_frames(), lang="zh"):               if event.is_speech_start and self.state == State.SPEAKING:                   await self.barge_in()                  		# AC-5 打断               if event.is_final and event.text.strip():                   self.metrics["t_user_end"] = time.monotonic()                   self.llm_task = asyncio.create_task(self.respond(event.text))       async def respond(self, text: str):           self.state = State.THINKING           self.history.append({"role": "user", "content": text})           try:               reply = await asyncio.wait_for(                   llm.chat_with_tools(self.history, tools=TOOLS), timeout=3.0)           except (asyncio.TimeoutError, llm.LlmError):               log.warning("LLM degraded, fallback to DTMF IVR")   # AC-3 降级               return await self.fallback_dtmf()           if reply.intent == "handoff":               return await self.handoff(reply)           self.history.append({"role": "assistant", "content": reply.text})           await self.say(reply.text_stream)       async def say(self, text_or_stream):           self.state = State.SPEAKING           first = True           async def _play():               nonlocal first               async for pcm in tts.stream(text_or_stream, voice="zh_female_1"):                   if first and "t_user_end" in self.metrics:                       self.metrics["first_audio_ms"] = (                           time.monotonic() - self.metrics["t_user_end"]) * 1000                       first = False                       			# AC-2 时延埋点                   await self.rtp.send(pcm)               self.state = State.LISTENING           self.speak_task = asyncio.create_task(_play())       async def barge_in(self):           for t in (self.speak_task, self.llm_task):               if t and not t.done():                   t.cancel()           self.rtp.flush_outbound()           self.state = State.LISTENING       async def handoff(self, reply):           self.state = State.HANDOFF           await self.ari.set_var(self.channel_id, "VOX_INTENT", reply.intent_label)           await self.ari.set_var(self.channel_id, "VOX_SUMMARY", reply.summary[:200])           await crm_push_context(self.channel_id, reply)   # AC-4 上下文透传           await self.ari.continue_in_dialplan(self.channel_id, "to-agents", "human", 1)`

`# voice-gateway/app/ari_app.py（StasisStart → 建桥 + ExternalMedia）   async def on_stasis_start(ari, event):       chan = event["channel"]["id"]       if event["channel"]["name"].startswith("UnicastRTP/"):           return        												# ExternalMedia 通道本身，忽略       await ari.post(f"/channels/{chan}/answer")       bridge = await ari.post("/bridges", params={"type": "mixing"})       rtp = await RtpEndpoint.allocate()   		# 本地 UDP 端口       ext = await ari.post("/channels/externalMedia", params={           "app": "voxforge-ai",           "external_host": f"{rtp.host}:{rtp.port}",           "format": "slin16",           "encapsulation": "rtp",           "transport": "udp",       })       await ari.post(f"/bridges/{bridge['id']}/addChannel",                  		params={"channel": f"{chan},{ext['id']}"})       asyncio.create_task(CallSession(ari, chan, rtp).run())`

#### 5.6.4 LLM 工具调用（CRM 查询）

`TOOLS = [{    "type": "function",    "function": {        "name": "query_order",        "description": "按订单号查询订单状态",        "parameters": {"type": "object",                       "properties": {"order_id": {"type": "string"}},                       "required": ["order_id"]},       },   }, {    "type": "function",    "function": {        "name": "transfer_to_human",        "description": "用户要求人工或无法解决时转人工，必须给出摘要",        "parameters": {"type": "object",                       "properties": {"summary": {"type": "string"},                          "skill_group": {"type": "string"}},                       "required": ["summary"]},       },   }]`

### 5.7 代码生成的 Prompt 规范

给 dsh 的节点 Prompt 必须包含：需求单号与 AC、受影响文件范围、必须加载的 Skill、禁止事项、完成定义（DoD：哪些 make 目标必须通过）。示例：

`你是 VoxForge 后端工程师。实现 REQ-AI-002（打断）。   加载技能：voice-latency-budget、asterisk-dialplan-ari。   只修改 voice-gateway/ 与 tests/audio/。   DoD：make lint、make test-unit、make test-audio 全部通过；   在 artifacts/ 输出 latency.json，包含 barge_in_stop_ms 的 P50/P95。   不得修改 opensips/ 与 asterisk/etc/。`

### 5.8 个人本地迭代（LoopForge Local + dsh）

`cd voxforge   npx -y loopforge-cli@latest skills install dsh   # Portable Edition   npx @deepseek-ai/dsh web                          # 打开 dsh Web UI   # 在 dsh 中执行：   /devflow "为 OpenSIPS 增加 UA 黑名单的数据库化管理，并补 SIPp 用例"`

本地运行产物位于 `artifacts/{task_slug}/`（Tencent/LoopForge）。

* * *

## 6\. 代码提交与评审

### 6.1 分支与提交规范

*   • 分支：`main`（受保护）← `release/x.y` ← `feat/REQ-xxx-short`、`fix/BUG-xxx`。

*   • 提交信息采用 Conventional Commits，并强制带需求号：`feat(gateway): barge-in on speech start [REQ-AI-002]`。

*   • 一个 PR 只对应一个需求；Agent 生成的 PR 描述需包含：变更摘要、AC 对照表、测试结果、时延报告链接、风险与回滚方式。

### 6.2 PR 模板

`## 关联需求   REQ-AI-002      ## AC 对照   | AC | 结果 | 证据 |   |--|--|--|   | AC-5 打断 ≤300ms | P95=210ms | artifacts/latency.json |      ## 测试   - [x] make lint  - [x] make test-unit  - [x] make test-sip  - [x] make test-audio      ## 安全检查   - [x] 无密钥  - [x] 新依赖许可证已核对      ## 回滚   回退该 PR；voice-gateway 镜像回滚到 v0.3.2`

### 6.3 质量门禁（分层）

层

检查

位置

失败处理

G0

格式、lint、类型检查

Script 节点 + CI

打回 implement

G1

gitleaks 密钥扫描、依赖许可证（Asterisk GPLv2、OpenSIPS GPLv2 兼容性）

Script 节点

打回 implement

G2

单元测试、覆盖率 ≥ 70%（核心状态机 ≥ 85%）

Script 节点

打回 implement

G3

SIPp 功能场景 + 音频回放 + 时延报告

Script 节点

打回 implement

G4

独立 Agent 评审（阻断项必须为 0）

Reviewer 节点

打回 implement

G5

人工验收

Human gate

通过 / 打回指定节点

G6

CI 复跑 + 维护者合入

GitHub/GitLab

—

LoopForge 的门禁失败可打回到指定上游步骤，也可从任意节点重试或重跑（Tencent/LoopForge）。

* * *

## 7\. 测试

### 7.1 测试分层

类型

工具

覆盖内容

单元测试

pytest / go test

会话状态机、打断、降级、工具调用解析

配置测试

`opensips -C`

、`asterisk -rx "dialplan reload"` 校验

语法与加载

SIP 功能测试

SIPp

注册、呼叫、re-INVITE、CANCEL、BYE、失败切换

媒体/语音测试

SIPp + 预录 WAV（pcap 回放）或 baresip 自动化

意图识别准确率、打断、TTS 正常

AI 评测

语料集 + LLM-as-judge + 规则

意图准确率、幻觉、话术合规

时延测试

网关埋点 + 抓包

首包语音时延、打断停止时延

性能压测

SIPp 并发 + k6（API）

CPS、并发、CPU、丢包、MOS

安全测试

SIPVicious（授权环境）、TLS 扫描、ARI 越权

防扫描、限速、鉴权

混沌测试

停 ASR / LLM / 单个 Asterisk

降级与 failover

验收测试

按 AC 清单

业务签字

### 7.2 SIPp 场景示例

`<!-- tests/sipp/uac_ai_ivr.xml（节选） -->   <scenario name="AI IVR inbound">     <send retrans="500">       <![CDATA[   INVITE sip:[service]@[remote_ip]:[remote_port] SIP/2.0   Via: SIP/2.0/[transport] [local_ip]:[local_port];branch=[branch]   From: <sip:13800000000@[local_ip]>;tag=[call_number]   To: <sip:[service]@[remote_ip]>   Call-ID: [call_id]   CSeq: 1 INVITE   Contact: <sip:sipp@[local_ip]:[local_port]>   Content-Type: application/sdp   Content-Length: [len]      v=0   o=- 1 1 IN IP[local_ip_type] [local_ip]   s=-   c=IN IP[media_ip_type] [media_ip]   t=0 0   m=audio [media_port] RTP/AVP 0   a=rtpmap:0 PCMU/8000       ]]>     </send>     <recv response="100" optional="true"/>     <recv response="200" rtd="true"/>     <send><![CDATA[   ACK sip:[service]@[remote_ip]:[remote_port] SIP/2.0   ...     ]]></send>     <nop><action><exec play_pcap_audio="tests/audio/order_query_zh.pcap"/></action></nop>     <pause milliseconds="12000"/>     <send retrans="500"><![CDATA[   BYE sip:[service]@[remote_ip]:[remote_port] SIP/2.0   ...     ]]></send>     <recv response="200"/>   </scenario>`

### 7.3 Makefile 目标（Script 节点调用）

`lint:          ; ruff check . && mypy voice-gateway ai-services   secret-scan:   ; gitleaks detect --no-bannerlicense-check: ; pip-licenses --fail-on="AGPL"   test-unit:     ; pytest -q tests/unit --cov=voice-gateway --cov-fail-under=70   env-up:        ; docker compose -f deploy/compose.test.yaml up -d --wait   test-sip:      ; ./tests/sipp/run_all.sh   test-audio:    ; pytest -q tests/audio   latency-report:; python tests/tools/latency_report.py --out artifacts/latency.json   load-test:     ; sipp -sf tests/sipp/uac_ai_ivr.xml -r 10 -l 200 -m 2000 $(SBC)`

### 7.4 测试报告输出

每次 SOP 运行在 `artifacts/` 输出：`test-report.html`、`latency.json`、`sipp-stats.csv`、`ai-eval.md`（意图混淆矩阵）、`review.md`。这些产物在 LoopForge 的节点产物快照中留存，供人工门禁审阅。

* * *

## 8\. 交付与上线

### 8.1 环境

环境

用途

部署

dev

Agent 沙箱、本地联调

Docker Compose

test

SOP 集成测试

Compose（Script 节点拉起）

staging

预发、真实中继小流量

K8s（Helm）

prod

生产

K8s + 物理机/裸金属媒体节点（rtpengine、Asterisk 建议 hostNetwork）

### 8.2 Docker Compose（测试环境节选）

`services: opensips:  { image: voxforge/opensips:${TAG}, ports: ["5060:5060/udp","5061:5061"] } rtpengine: { image: voxforge/rtpengine:${TAG}, network_mode: host } asterisk: 	{ image: voxforge/asterisk:22-${TAG}, environment: [ARI_PASSWORD] } gateway: 	 { image: voxforge/voice-gateway:${TAG}, depends_on: [asterisk, asr, tts] } asr: 		 { image: voxforge/asr-funasr:${TAG} } tts: 		 { image: voxforge/tts-cosyvoice:${TAG} } postgres:  { image: postgres:16 } redis:     { image: redis:7 } prometheus:{ image: prom/prometheus } grafana: 	 { image: grafana/grafana }`

### 8.3 发布流程

1.  1\. 合入 `release/x.y` 后打 Tag，CI 构建并签名镜像，生成 SBOM。

2.  2\. LoopForge "发布 SOP"：Script 节点部署 staging → 冒烟（SIPp 20 通）→ Human gate（运维 + 业务）→ 生产灰度。

3.  3\. 灰度策略：OpenSIPS dispatcher 权重将 5% → 25% → 100% 流量导向新版 Asterisk/网关节点；每档观察 30 分钟的 ASR 错误率、首包时延、转人工率、掉话率。

4.  4\. 回滚：dispatcher 权重切回旧节点（秒级），镜像回滚，配置回滚（Git tag）。

### 8.4 交付物清单

类别

交付物

软件

镜像（含版本与签名）、Helm Chart、Compose 文件、配置模板

源码

仓库 Tag、CHANGELOG、SBOM、第三方许可清单

测试

测试报告、压测报告、AI 评测报告、安全测试报告

文档

第 9 章所列全部文档

运维

Grafana 看板 JSON、告警规则、Runbook

验收

验收单（AC 签字）、LoopForge 运行记录与审批链

### 8.5 运维闭环（LoopForge 定时任务）

使用 LoopForge 的 AI 定时任务（Tencent/LoopForge）做每日巡检：读取 Prometheus 指标与 Asterisk/OpenSIPS 日志 → 聚类异常（如 503 激增、ASR 超时）→ 自动建需求单 → 触发 Bug-fix SOP → 人工确认合入。这与腾讯分享中 "巡检发现—聚类建单—自动修复—验证—人工确认合入" 的闭环一致（InfoQ）。

* * *

## 9\. 文档输出

### 9.1 文档体系

文档

读者

生成方式

存放

架构设计说明书（含 3 章内容、时序图）

架构/研发

Planner 生成 + 人工评审

docs/architecture/

接口文档（ARI 事件、网关 gRPC、REST OpenAPI）

研发/集成方

从代码注释与 OpenAPI 自动生成

docs/api/

配置手册（OpenSIPS、Asterisk、网关参数）

运维

技术写作 Agent 从配置模板提取

docs/config/

部署手册

运维/交付

从 deploy/ 生成并实测

docs/deploy/

运维 Runbook（告警 → 处置步骤）

值班

每条告警一页

docs/runbook/

安全基线与加固清单

安全/运维

sip-security-baseline 技能同源

docs/security/

测试报告

项目/客户

Script 节点自动产出

artifacts/ → docs/reports/

用户手册（管理后台、流程配置、知识库）

业务管理员

技术写作 Agent + 截图

docs/user/

发布说明

全体

从 CHANGELOG 生成

docs/release/

### 9.2 文档规则

*   • 文档即代码：MkDocs 管理，PR 中代码与文档同提，SOP 中 "docs" 节点负责更新。

*   • 每份文档顶部标注：适用版本、最后验证日期、责任人。

*   • 部署手册必须由 Script 节点在干净环境 "照文档执行" 验证一次（文档可执行性测试）。

*   • 用户经常需要中英文版本：建议文档统一以中文为源，技术写作角色在发布前生成英文版并人工抽检术语表（SIP、IVR、Barge-in 等保持英文原词）。

* * *

## 10\. 培训

### 10.1 培训对象与路径

对象

目标

时长

研发工程师

会用 dsh + LoopForge 交付需求，理解语音系统架构

5 天

测试工程师

会写 SIPp/音频用例、读时延与 AI 评测报告

3 天

运维工程师

部署、监控、灰度、故障处置

3 天

业务管理员

配置 IVR 流程、维护知识库、看报表

1 天

管理者

理解 AI 研发流程、门禁、成本与度量

0.5 天

### 10.2 研发课程大纲（5 天）

天

模块

内容

实验

D1

语音基础

SIP/SDP/RTP、NAT、编解码、OpenSIPS 与 Asterisk 分工

Compose 起环境，用软电话打通一通电话

D2

OpenSIPS 与 Asterisk

路由脚本、dispatcher、拓扑隐藏、PJSIP、拨号方案、ARI、ExternalMedia

用 SIPp 验证 failover；写一个 Stasis 应用

D3

AI 语音链路

流式 ASR/TTS、LLM 工具调用、VAD 与打断、时延预算、降级

在网关中新增一个意图与工具

D4

DeepSeek Harness

安装、模式、Skills 编写、MCP 工具、Prompt 与 DoD 写法

编写一个项目 Skill，让 dsh 完成小需求

D5

LoopForge

需求提交、角色、SOP 设计、门禁、打回、复盘评分、本地 /devflow

从需求到 PR 完整跑一次 SOP-Backend

### 10.3 培训材料

*   • 课件（PPT）与讲师手册；

*   • 实验手册（每个实验含目标、步骤、预期结果、常见错误）；

*   • 实验环境：每位学员一套 Compose 环境 + LoopForge 演示项目（LoopForge 新账号默认加入演示项目，可在无 API Key 的情况下体验 "脚本 + 人工审批" 的 SOP，见 Tencent/LoopForge）；

*   • 考核：理论测验（30%）+ 实操（70%：独立通过 SOP 交付一个 M 级需求，所有门禁通过）。

### 10.4 知识沉淀

培训和项目中发现的问题，统一沉淀到三处：`.dsh/skills/`（给 Agent 的经验）、`AGENTS.md`（硬规则）、LoopForge SOP 版本（流程改进）。结合 LoopForge 复盘引擎的改进处方，定期（每两周）评审并发布新版本 SOP 与 Skills。

* * *

## 11\. 风险、治理与安全

风险

影响

对策

dsh 处于开发者预览，存在不兼容变更

流程中断

锁定版本；关键约束放 Skills/SOP；保留第二执行器（如 Codex/Claude Code）可切换

Agent 生成 SIP 配置存在安全隐患

盗打、话费欺诈

安全基线技能 + G1 门禁 + 安全评审人工门禁；生产配置变更必须人工签字

Docker socket 访问权限（LoopForge 默认部署）

宿主机控制风险

LoopForge 官方说明该模式面向可信团队而非不可信多租户（Tencent/LoopForge）；独立主机部署、内网访问、HTTPS 反代、关闭公开注册

LLM 幻觉或越权话术

合规风险

工具调用白名单、话术约束、敏感问题强制转人工、AI 评测集回归

时延超标

体验差

流式链路、就近部署 ASR/TTS、话术缓存、时延门禁（G3）

许可证冲突

商业交付风险

Asterisk 与 OpenSIPS 为 GPLv2，自研网关通过网络协议（ARI/RTP）交互，避免链接式混合；license-check 门禁

生产密钥泄露到 Agent 沙箱

安全事件

沙箱只用测试密钥；gitleaks；最小权限 Git Token

* * *

## 12\. 附录

### 12.1 实施里程碑（建议 12 周）

周

里程碑

W1

部署 LoopForge、配置 dsh 执行器、建立仓库骨架、AGENTS.md 与 Skills

W2

架构评审通过；SOP-SIP / PBX / Backend / QA / Docs 初版

W3–W4

M1 OpenSIPS、M2 Asterisk 基础呼叫打通；SIPp 用例

W5–W7

M3 网关 + M4 AI 能力：智能 IVR、打断、降级、转人工

W8

M5 CRM 集成、M6 后台 MVP

W9

压测、安全测试、混沌测试

W10

staging 灰度、文档冻结

W11

培训实施、验收

W12

生产上线、复盘、SOP v2

### 12.2 常用命令速查

`# LoopForge 平台   git clone https://github.com/Tencent/LoopForge.git && cd LoopForge && ./start.sh   ./start.sh logs | stop | restart | pull      # LoopForge Local（DeepSeek Harness，Portable Edition）   npx -y loopforge-cli@latest skills install dsh   loopforge skills status dsh      # DeepSeek Harness   npx @deepseek-ai/dsh web			 # http://127.0.0.1:3080      # 语音栈   opensips -C -f /etc/opensips/opensips.cfg		# 配置语法检查   opensips-cli -x mi ds_list					 # 查看 dispatcher 状态   asterisk -rx "pjsip show endpoints"   asterisk -rx "ari show apps"   sipp -sf tests/sipp/uac_ai_ivr.xml -r 5 -l 50 <SBC_IP>`

LoopForge 安装与管理命令见 Tencent/LoopForge，Local 命令见 LoopForge Local 使用说明，dsh 启动方式见 DeepSeek Harness README。

### 12.3 参考资料

*   • DeepSeek Harness 仓库：https://github.com/deepseek-ai/deepseek-harness

*   • DeepSeek Harness 中文介绍：https://www.deepseek.com/harness/zh/

*   • DeepSeek Harness 文档：https://deepseek-harness.github.io/deepseek-harness/

*   • Tencent LoopForge 仓库：https://github.com/tencent/loopforge

*   • LoopForge Local 使用说明：https://github.com/Tencent/LoopForge/blob/dd56585276d8ecb6e0d6865f55e255194d75f85a/docs/local/usage.md

*   • 腾讯云开发者社区，LoopForge 开源介绍：https://cloud.tencent.com/developer/article/2779233

*   • InfoQ，LoopForge 多 Agent 编排实践：https://www.infoq.cn/article/wUArox9MHiAoyWPgRxpp

*   • awesome-deepseek-harness：https://github.com/awesome-deepseekharness/awesome-deepseek-harness

说明：文中 OpenSIPS、Asterisk、Python 代码为结构与规范示例，需在目标版本上由 SOP 门禁验证；LoopForge SOP 的 YAML 为逻辑示意，实际以 SOP 设计器配置为准。
