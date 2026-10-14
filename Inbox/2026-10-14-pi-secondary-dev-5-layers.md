---
id: 2026-10-14-pi-secondary-dev-5-layers
title: Pi 二次开发一篇讲透：5 层定制，把极简 Agent 变成你自己的产品
source: 微信公众号（nephen）
source_url: https://mp.weixin.qq.com/s/3XcWGXiMmyNVCABTgfX6UQ
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags:
  - AI
  - 工程实践
---

# Pi 二次开发一篇讲透：5 层定制，把极简 Agent 变成你自己的产品

> 开源终端 Agent Pi（GitHub 11 万+星，作者 Mario Zechner，哲学是"让 Pi 适配你的工作流"）的二开指南。Pi 内核薄到一个下午能读完（LLM+工具+循环，默认仅 read/write/edit/bash 四个工具），四个独立包分层干净，并提供五个官方扩展点。文章按成本从低到高讲透 Prompt 模板 → AGENTS.md → Skill → Extension → SDK 五层定制，并给出选型判断、分发方式与两个必踩坑。

## 核心要点

1. **为什么二开选 Pi**：Matei Zaharia 实测同一模型在 Pi 里表现普遍好于官方 Agent（官方客户端预设行为太多反干扰模型）；内核小（主循环=发上下文→执行工具调用拼回结果→直到完成）、分层干净、扩展点全是"官方正门"，升级不冲突。
2. **四个独立包**：pi-ai（统一多厂商 LLM API，transport 层把各家流式返回转成标准事件流，换模型几乎无损）、pi-agent-core（Agent 循环与工具调用）、pi-tui（终端界面库）、pi-coding-agent（完整编码 Agent/二开起点）。
3. **第 1 层 Prompt 模板**：md 文件放 `~/.pi/agent/prompts/`（全局）或 `.pi/prompts/`（项目），文件名即斜杠命令，支持 `$1` 参数，/reload 后可用——适合天天重复敲的简单指令。
4. **第 2 层 AGENTS.md**：项目结构、测试命令、编码规范、禁改目录写入后启动自动加载，是项目级长期记忆。
5. **第 3 层 Skill**：可携带步骤说明、脚本、参考资料；**渐进式加载**——启动只装载 name+description，任务匹配才读正文，description 必须写清"做什么+何时用"（模型路由的唯一依据）；适合跨项目复用的完整工作流。
6. **第 4 层 Extension（二开主战场）**：真正运行的 TypeScript 模块，ExtensionAPI 可注册命令/工具、监听事件、改系统提示、画终端界面；plan 模式、subagent、todo 清单等社区都靠这层实现（pi-subagents、pi-background-tasks）。
7. **第 5 层 SDK 内嵌**：`createAgentSession()` 一个调用起完整 Agent 会话，可订阅事件、控上下文、管会话存储；另有 print/JSON/RPC 三种无代码运行模式。产品化案例：memfs（虚拟文件系统）+just-bash（虚拟 shell）+isolated-vm 搭进程内沙箱，把 Claude/Codex 生态的 Skill 和 MCP 直接搬进服务端产品。
8. **选型与避坑**：Skill vs Extension 的分界——"给模型看的说明书"用 Skill（零代码、跨模型、无风险），"给运行时跑的代码"用 Extension；永远从便宜层往贵层走。资产可打成 Pi Package 经 npm 分发共享；安全隔离可用 Gondolin 微虚拟机或进程内沙箱。两坑：新版要求 Node ≥ 22.19（npm 更新失败先查 node -v）；插件宁缺毋滥——4 个原生工具覆盖 80% 场景，装多了烧 token 又干扰判断。

## 正文

### 为什么是 Pi

最近半年终端 AI 编程圈除 Claude Code、Codex CLI 外，Pi 成为讨论度最高的开源项目。它被用成"高级命令行聊天工具"是浪费——真正定位是 Agent 底座：内核薄、分层清楚、定制入口多，从改一行提示词到嵌进服务端产品有完整升级路径。

### 薄内核

仓库 earendil-works/pi 自我定位 AI agent toolkit：pi-ai 统一多厂商 LLM API（先定义标准事件流，transport 层做厂商适配，上游怎么变 Agent 看到的事件都一样）；pi-agent-core 承载 Agent 循环；pi-tui 提供终端界面；pi-coding-agent 是完整 CLI。工具调用与结果配对、轮次结束、会话落盘恢复都在一个循环里。

### 五层定制（成本从低到高）

1. **Prompt 模板**：写 Markdown 进 prompts 目录，文件名即命令，frontmatter 的 description 描述用途，正文用 `$1` 接参数，/reload 生效（例：/review 支付模块）。
2. **AGENTS.md**：项目级长期记忆，写结构、命令、规范、禁改目录，启动自动加载。
3. **Skill**：SKILL.md 的 frontmatter 写 name/description，正文可引用 references 与脚本（路径相对 skill 目录）；渐进式加载，靠 description 触发路由。
4. **Extension**：TypeScript 模块，`export default function(pi: ExtensionAPI)`，可 registerCommand/注册工具/事件监听/改提示/渲染 UI，是社区功能创新的主战场。
5. **SDK 内嵌**：createAgentSession 起会话、prompt 提问、getLastAssistantText 取结果、dispose 释放；产品化典型玩法是进程内虚拟沙箱（memfs+just-bash+isolated-vm）复用整个 Skill/MCP 生态。

### 选型、生态与坑

Skill 与 Extension 只看一句话：纯文本说明书 vs 运行时代码。顺序永远从便宜到贵。分发走 npm Pi Package；执行隔离有 Gondolin 微虚拟机与轻量进程内沙箱两档。坑：Node ≥ 22.19 版本门槛；原生 4 工具覆盖 80% 场景，先写 AGENTS.md 和 Skill，最后才考虑装插件。

相关笔记：[[2026-10-14-pi-school-agent-course]]（Pi 入门免费课，讲上下文/会话/分支）；其 Skill 渐进式加载与本库 CLAUDE.md 体系的 Skill 机制一致。

## 来源

- 微信公众号 · nephen：[Pi 二次开发这件事，一篇讲透：5 层定制，把极简 Agent 变成你自己的产品](https://mp.weixin.qq.com/s/3XcWGXiMmyNVCABTgfX6UQ)

## 附件

无
