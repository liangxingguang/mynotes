---
id: wiki-source-pi-secondary-dev-5-layers
type: source
title: Pi 二次开发一篇讲透：5 层定制，把极简 Agent 变成你自己的产品
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - ai
  - agent-cli
  - 二次开发
sources:
  - raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md
---
# Pi 二次开发一篇讲透：5 层定制，把极简 Agent 变成你自己的产品

## Overview（概览）

微信公众号（nephen）的 Pi 二次开发指南：把 Pi 定位为"Agent 底座"而非聊天工具，按改动成本从低到高讲透五个官方扩展点（Prompt 模板 → AGENTS.md → Skill → Extension → SDK 内嵌），并给出 Skill vs Extension 的选型分界、npm 分发方式与两个实践坑。

## Key Facts（关键事实）

- Pi 作者 Mario Zechner，GitHub 星数突破 11 万；设计哲学"让 Pi 适配你的工作流"。
- UC Berkeley 教授 Matei Zaharia（Apache Spark 创始人）实测：同一模型（Claude/GPT/GLM）在 Pi 里表现普遍好于官方 Agent，原因是官方客户端预设行为过多干扰模型。
- Pi 仓库 earendil-works/pi 分四个独立包：pi-ai（统一多厂商 LLM API，transport 层把各家流式返回转成标准事件流）、pi-agent-core（Agent 循环与工具调用）、pi-tui（终端界面库）、pi-coding-agent（完整编码 Agent，二开起点）。
- 五层定制：① Prompt 模板（`~/.pi/agent/prompts/` 或 `.pi/prompts/`，文件名即斜杠命令，`$1` 接参，`/reload` 生效）；② AGENTS.md（项目级长期记忆，启动自动加载）；③ Skill（渐进式加载，启动只装 name+description，匹配才读正文，description 是模型路由唯一依据）；④ Extension（TypeScript 模块，ExtensionAPI 可注册命令/工具、监听事件、改系统提示、渲染 UI，pi-subagents、pi-background-tasks 等社区插件出于此层）；⑤ SDK 内嵌（`createAgentSession()` 起完整会话，另有 print/JSON/RPC 三种无代码模式）。
- 产品化案例：memfs（虚拟文件系统）+ just-bash（虚拟 shell）+ isolated-vm（JS 执行环境）搭进程内沙箱，把 Claude/Codex 生态的 Skill 和 MCP 搬进服务端产品。
- 定制资产可打包为 Pi Package 经 npm 分发；执行隔离有 Gondolin 微虚拟机与进程内沙箱两档。
- 两个坑：新版 Pi 要求 Node ≥ 22.19（npm 更新失败先查 node -v）；原生 4 个工具覆盖 80% 场景，扩展装多了烧 token 且干扰模型判断。

## Important Claims（重要论断）

### Claim 1：Skill 与 Extension 的分界只有一句话

"给模型看的说明书"用 Skill（纯文本流程/判断标准/参考资料，零代码、跨模型、升级无风险）；"给运行时跑的代码"用 Extension（需要副作用：调内部 API、注册工具、拦截事件、渲染界面）。定制顺序永远从便宜层往贵层走。

### Claim 2：Pi 的价值在于"决定不做什么"

薄内核 + 五个官方定制入口，使最终得到的 Agent 与使用者工作流严丝合缝——这是"大而全"框架给不了的。

## Concepts Introduced（引入的概念）

- [[pi-customization-layers|Pi 五层定制模型]]

## Entities Mentioned（提及的实体）

- [[pi|Pi]]

## Implications（影响／启示）

为"如何把极简 Agent 逐步产品化"提供了完整的成本阶梯与选型标准；其 Skill 渐进式加载机制与本知识库（CLAUDE.md 体系）的 Skill 机制一致，可互相参照。

## Limitations（局限）

二手教程类信源；Matei Zaharia 实测帖、Gondolin 等细节为作者转述，未附一手链接；所述版本特性以 2026-09 前后为准。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[pi-customization-layers|Pi 五层定制模型]]
- [[agent-sandboxing|Agent 沙箱隔离]]
- [[pi-6-extensions|从 Claude Code 搬到 Pi：6 个扩展补回熟悉体验（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md`
