---
id: 2026-10-14-pi-durable-mcp-1-0-update
title: Pi 抛出全新 Agent Harness，还把自己骂了一年的 MCP 装进了核心
source: 微信公众号·InfoQ
source_url: https://mp.weixin.qq.com/s/s4EyfKFau-eq3-XGMuBVeQ
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 资讯
tags: [AI, 行业动态, Pi]
wiki_status: pending
---

# Pi 抛出全新 Agent Harness，还把自己骂了一年的 MCP 装进了核心

> Pi 升级至 1.0，Code Mode 与原生 MCP 进入稳定版，同时推出持久化 Agent 框架 Pi Durable；Mario Zechner 与 Armin Ronacher 在播客中详谈 Durable 架构设计、AI 编程的能力边界及 Pi 未来方向。

## 核心要点

- **Pi Durable**：持久执行框架（约 1.2 万行），Agent 进程崩溃后可从断点精确继续，无需手动输入"继续"；采用"意图→执行→结果"效应三明治 + 版本化 JSON 文档存储，非事件溯源；可部署到 Vercel、Cloudflare、手机等。
- **MCP 正式接入**：Pi 曾公开拒绝 MCP（官网写"不支持"），因协议成熟和模型训练改善而转变；通过工具搜索和渐进式披露按需加载，避免上下文膨胀。
- **Code Mode**：QuickJS 沙箱内运行 JS，可并行调工具、过滤数据、循环调用 System 1 分类模型（如 Jev），只将汇总结果送回前沿模型，降低 Token 消耗。
- **AI 编程边界**：有 Oracle、二元可判定、可 fuzz 的任务模型做得极好（Bun 的 Rust 重写、模拟器、序列化库 fuzzing）；架构设计没有训练文本数据，是 LLM 学不到的唯一部分。
- **Agent 修 Bug 的隐患**：几乎不可能不增加代码就修好问题，全自动维护的代码库会随每次修复持续膨胀；Agent 擅长局部修补，不擅长识别架构层面的根因。
- **未来方向**：PIM（Pi Mobile）多 Agent 多设备协作；不想只做 Coding Agent 公司，两条线——面向非工程师的产品 + 人人可构建 Agent 的基础设施。

## 正文

### Pi 1.0 三大更新

Pi 项目升级到 1.0，Code Mode 与原生 MCP 正式进入稳定版，同日推出全新持久化框架 Pi Durable（架构历经八轮迭代）。

**Pi Durable** 解决长时间运行 Agent 的核心痛点：对话历史持久化、进程崩溃恢复、任务状态管理。开发者无需自行设计数据库、处理调度和故障恢复，有开发者估计可替代一半外围代码。

技术架构上，Pi Durable 不采用事件溯源，而是两个基本原语：
1. **效应三明治任务**：执行前写入意图记录 → 执行效应（支持幂等键处理执行中崩溃）→ 存储结果；任务可嵌套派生。
2. **版本化文档存储**：类 MongoDB 的 JSON 文档，通过 Proxy 自动记录变更为自定义 JSON Patch 操作，文档可与对话转录任意位置关联，支持时间回溯。

**MCP 接入**采用渐进式披露，不一次性加载所有工具定义。Armin 回应"变臃肿"批评：默认加载内容没有增加，Code Mode 也不是"绕一圈的 Bash"，而是让模型在 Harness 内部直接搜索、组合和编排工具。

**Code Mode** 的分层模式：MCP 获取数据 → Code Mode 编排处理 → Jev 等快速模型承担分类判断 → GPT/Claude 专注高层推理。

### AI 编程的能力边界

Mario 和 Armin 的核心判断：

- **AI 擅长的任务**：有明确对错信号（Oracle）、二元可验证、可模糊测试的领域——安全逆向、协议实现、模拟器、序列化格式、测试驱动移植。
- **AI 不擅长的**：设计与架构。架构是编程中唯一没有被编码成文本的过程，训练数据中缺失；模型讨论架构时头头是道，但实际执行轨迹会落到错误的位置。
- **模型表达退化**：Armin 认为模型架构能力没有明显进步甚至退步，输出越来越复杂、术语堆砌；Sol 6.1 和 Opus 5.5 有所改善。
- **安全能力跃升**：Mario 的桌面软件被人用两个 Codex 账号破解（深入 JVM native 内存结构逆向），他随后用 AI 重放攻击分析，认为没有人类逆向工程师能在相同时间达到该深度。

### Agent 可靠性与代码质量

Armin 指出 Agent 修 Bug 必然增加代码，全自动代码库会逐次膨胀。Mario 以 Pi 的 TUI 库为例区分层次：组件级实现可以完全交给 Agent（测试通过即接受，从不 review 代码），但性能问题的架构级根因修复仍需人来做。

训练数据质量被认为是突破口：从 GitHub 仓库历史（PR 是否合并、代码存活比例）和架构讨论轨迹中筛选高质量数据，可能推动模型架构能力进步，甚至关联到递归自我改进（RSI）。

### 个人 Agent 与未来规划

- 两人对 Grok Bot 等全权限个人 Agent 的安全性持悲观态度，举例财务信息被发到公开 Slack。
- Earendil 公司两条线：非工程师可用的 Agent 产品（延续 Lefos 邮件助手理念——陪伴式而非骚扰外部各方）+ Agent 基础设施。
- PIM（Pi Mobile）：Mario 已用它替代 Claude Android 应用，"大脑"跑在手机上，可连接远程服务器执行 sysadmin；愿景是多 Agent 在多设备上与多人协作，支持随意跳转和重连。
- Web 插件系统的安全隔离（XSS、iframe、多人会话信任边界）被认为比 Docker 沙箱化困难得多。

## 来源

- 原文链接：[Pi 抛出全新 Agent Harness，还把自己骂了一年的 MCP 装进了核心](https://mp.weixin.qq.com/s/s4EyfKFau-eq3-XGMuBVeQ)
- 原始访谈视频：https://www.youtube.com/watch?v=ja_7AF54OtE
- 来源平台：InfoQ（微信公众号编译）

## 附件

无
