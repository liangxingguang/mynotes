---
id: 2026-11-02-superagent-design
title: Super-agent 设计探索：迈向更自主的 Agent 系统
source: 微信公众号文章（DeepSeek Harness 团队）
source_url: https://mp.weixin.qq.com/s/zoS7GlReWPhfCjENGxXCdg
source_type: article
platform: 微信公众号
created: 2026-11-02
category: 技术
tags:
  - AI
  - 工程实践
asset_ref: Assets/2026-11/wx-superagent-design.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-02T07:20:45.645Z"
ingest_claim_id: 40664-1793604045645-0
---

# Super-agent 设计探索：迈向更自主的 Agent 系统

> 摘要：DeepSeek Harness 团队（作者 Yujia Qiao）的架构探索：针对"人只能同时跟进 3-5 个 Session"的瓶颈，提出 Super-agent——以 Router/Worker 双层架构、事件驱动（Trigger + 两级过滤 + 订阅直通）、异步全双工多信道交互、存算分离与端侧 daemon（BYOM）、外部 Watchdog 五大模块，实现连续、高效、主动、持久的 Agent 系统。消融实验显示双层架构完成时间显著优于单 Session + Subagent。核心思想是把计算机系统的经典设计（Fast/Slow Path、投机执行、存算分离）应用到 Agent 构建中。

## 核心要点

- 四特征：连续（跨信道上下文统一）、高效（并行并发）、主动（事件驱动、无需介入时保持安静）、持久（始终在线、异常自愈）；目标是让人类摆脱 Session 管理，上移到决策与验收
- 双层架构：Router 层常驻全局路由，只承接人类交互与任务分派（可不配 Bash 工具），积压事件批处理——压测 Trigger 速率 1→40 条/分钟，单个决定分摊推理时间 6.4s→1.6s；Worker 层上下文隔离、挂完整工具、配最强模型，不直接与人类交互
- 事件驱动：群聊/邮件/CI/评审评论等环境事件称 Trigger；两级过滤（确定性代码 Fast Path + LLM Slow Path）；订阅直通（同一 Thread 后续事件直接发往 Worker，不经 Router）；上下文用 Inline & Spill + 链式召回管理
- 投机执行：据环境信号后台提前行动（如群内"静默复现并修复"策略，确认问题且找到简单修复才交付，否则保持安静）
- 面向人的交互：异步 ReAct Loop（start/stop 全双工，前台对话不被后台任务阻塞）；多信道适配——IM 单次回复 ≤100 词轻量通知，GitHub/邮件结构化异步交付
- 存算分离：云端无状态计算 + 数据库会话状态；执行环境留在原地，端侧轻量 daemon 执行命令（BYOM），与 Anthropic"脑手分离"思路一致
- Watchdog：主系统外的独立 Control Loop，同时监控基础设施存活与任务实质进展，可介入修复、可用自然语言指示其调整主系统
- 实验：Super-agent 完成时间 p50 12.4min / p95 15.7min，显著优于单 Session+Subagent（中性提示 p95 29.5min）；去掉直通 Router 决定数 +30%、token +37%，证明直通节省可观；开放问题含架构切分、脱离 Session 的交互、跨实例 A2A、安全与隐私

## 正文

采集说明：全文约 2.4 万字，完整正文见附件 asset_ref，此处为结构提要。

1. **Super-agent 概念**：单任务上限取决于模型能力，多任务上限取决于人的注意力（3-5 个活跃 Session）。打破 Agent 与单次手动会话的绑定，成为跨会话保持上下文、同时推进多项任务的连续实体。
2. **双层架构**：连续性与吞吐量的根本权衡——单 Session 上下文连续但串行低吞吐，独立 Session 高吞吐但上下文割裂。解法：Router 层维护全局连续性（全局序点、协调点、记忆），Worker 层隔离并发执行。Session 应是系统实现细节，而非用户认知负担。
3. **事件驱动**：Trigger 生命周期四问——两级过滤、订阅直通路由（Thread 多对多订阅）、上下文组织（Inline & Spill、链式召回沿引用图多跳展开）、投机执行提前行动。
4. **面向人的交互**：异步 ReAct Loop（已在 DeepSeek Harness 实现，未默认开启）；IM 与 GitHub/邮件双信道规范。
5. **存算分离**：计算与状态分离（云端弹性容器 + 持久化 Session）；计算与执行环境分离（环境不上云，端侧 daemon 按需执行，支持 BYOM 与间歇在线设备）。
6. **Watchdog**：外部 Control Loop 监控基础设施与任务进展，本身是具备完整工具能力的 Agent Session。
7. **实验**：约 300 条消息 / 20 条工作请求 / 5 次重复的端到端消融 + Router 压测。
8. **开放问题**：Router 水平切分粒度、Worker 间协作拓扑、长程记忆、脱离 Session 的交互形式、上下文边界与 A2A、安全与隐私（云端被攻破则端侧设备受威胁；凭据不能进入模型上下文）。
9. **结语**：未提出新理论，而是把经典工程思想应用到 Agent 系统；内部实例已在持续运行，参与问题修复、代码审查与 Harness 自身迭代。部分设计有原型 dsh-superagent-prototype（非正式产品）。

## 来源

- 原文：<https://mp.weixin.qq.com/s/zoS7GlReWPhfCjENGxXCdg>
- 作者：Yujia Qiao（DeepSeek Harness 团队），致谢列表见附件

## 附件

- [[Assets/2026-11/wx-superagent-design.md]]
