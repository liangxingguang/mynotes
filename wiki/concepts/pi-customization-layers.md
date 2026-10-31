---
id: wiki-concept-pi-customization-layers
type: concept
title: Pi 五层定制模型
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - ai
  - agent-cli
sources:
  - raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md
  - raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md
  - raw/sources/products/2026-10-17-pi-custom-agent-setup.md
  - raw/sources/products/2026-10-17-pi-embedded-sdk-agent-engine.md
  - raw/sources/products/2026-10-31-pi-coding-agent-getting-started-guide.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/agent-sandboxing.md
---
# Pi 五层定制模型

## Definition（定义）

[[pi|Pi]] 官方提供的五个扩展点，按改动成本从低到高排列：Prompt 模板 → AGENTS.md → Skill → Extension → SDK 内嵌。全部是"官方正门"，升级不冲突、不破坏，构成从"改一行提示词"到"把 Agent 嵌进自己产品"的完整升级路径。

## Why It Matters（为什么重要）

它把"Agent 二次开发"从源码魔改变成分层选择题：每一层有明确的成本、适用场景与边界，避免用重武器解决轻问题（或反之）。对使用者，它是定制决策框架；对生态，统一入口使定制资产可打包成 Pi Package 经 npm 分发共享。

## Core Characteristics（核心特征）

1. **成本阶梯**：五层按改动成本递增排序，官方建议永远从便宜层往贵层走——能用 Prompt 解决的不动 AGENTS.md，能用 Skill 解决的不动 Extension。
2. **官方扩展点**：五层均为官方支持的接口，而非对内部实现的 hack，升级不冲突。
3. **说明书 vs 代码的分界**：第 3、4 层最易纠结，判断标准只有一句话——这套东西是"给模型看的说明书"（Skill：零代码、跨模型、升级无风险），还是"给运行时跑的代码"（Extension：需要副作用，TypeScript 跑在运行时里）。互补判据（来自作者本人动手篇）：Skill/Prompt 模板只能影响模型怎么想，**不能保证"必定发生"**——强制行为（如改完代码必评审）必须用 Extension 监听事件实现。
4. **扩展 vs MCP vs Skills 三方对比**（2026-10-31 保姆级教程信源）：扩展=装在 Pi 里的代码（TypeScript，加工具/改行为，只对 Pi）；MCP=外面另起的服务（Pi 经协议调，Claude Code/Cursor 也能用，跨工具通用，多一层进程略慢）；Skills=一段说明书（Markdown，不执行代码，只告诉模型按什么顺序干/有什么禁忌，只对 Pi）。选择建议：要加能力先看现成扩展→没有再看 MCP→两样都没有才自写；只想让它按你的规矩干活，写 Skill，别写扩展。

三方对比表：

| | 扩展 | MCP | Skills |
| --- | --- | --- | --- |
| 是什么 | 装在 Pi 里的代码 | 外面另起的服务 | 一段说明书 |
| 会不会执行代码 | 会 | 会，在它自己的进程里 | 不会 |
| 写起来要会什么 | TypeScript | 看服务本身 | Markdown |
| 跨工具通用 | 只对 Pi | Claude Code、Cursor 都能用 | 只对 Pi |
| 什么时候用 | 加工具、改行为 | 已有现成服务想复用 | 定规矩、定流程 |

## Structure（结构）

| 层 | 机制 | 适用场景 |
|---|---|---|
| 1. Prompt 模板 | Markdown 放入 `~/.pi/agent/prompts/`（全局）或 `.pi/prompts/`（项目），文件名即斜杠命令，`$1` 接参，`/reload` 生效 | 天天重复敲的简单指令 |
| 2. AGENTS.md | 项目结构/测试命令/编码规范/禁改目录写入后启动自动加载，项目级长期记忆（另有 override/SYSTEM/APPEND_SYSTEM 变体） | 项目级规矩与长期上下文 |
| 3. Skill | SKILL.md frontmatter 写 name/description，可携带脚本与参考资料；**渐进式加载**——启动只装 name+description，任务匹配才读正文，description（做什么+何时用）是模型路由的唯一依据 | 跨项目复用的完整工作流 |
| 4. Extension | TypeScript 模块，`export default function(pi: ExtensionAPI)`，可注册命令/工具、监听事件、改系统提示、渲染 UI；plan 模式、subagent、todo 清单等社区功能（pi-subagents、pi-background-tasks）均出于此层 | 需要程序能力/副作用，二开主战场 |
| 5. SDK 内嵌 | `createAgentSession()` 一个调用起完整 Agent 会话，可订阅事件、控上下文、管会话存储；另有 print/JSON/RPC 三种无代码运行模式。接入三通道选型：CLI（人机交互）/ RPC（跨语言、桌面客户端）/ Embedded SDK（Node.js 同进程零 IPC；`SessionManager.inMemory()` 纯内存会话、`tools:["read"]` 构造期白名单） | 把 Pi 变成自己产品的心脏 |

## How It Works（运作方式）

底层的可定制性来自薄内核：核心循环只有"发上下文给模型 → 执行工具调用拼回结果 → 直到完成"三个动作，四个独立包（pi-ai / pi-agent-core / pi-tui / pi-coding-agent）分层干净，定制经各层扩展点接入而非改循环。产品化的典型玩法（第 5 层案例）：用 memfs（虚拟文件系统）+ just-bash（虚拟 shell）+ isolated-vm 搭进程内沙箱，把 Claude/Codex 生态的 Skill 与 MCP 直接搬进服务端产品。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-sandboxing|Agent 沙箱隔离]]：第 5 层产品化时的隔离手段（Gondolin 微虚拟机 / 进程内沙箱）属于该概念的实现路径

### Dependencies（依赖项）

- [[pi|Pi]]：本模型是 Pi 实体的一部分（part-of）

## Evolution（演进）

- 2026-09/10：随 Pi 走红由社区教程系统化总结（当前信源为二手教程，官方文档原始表述未确立）。
- 2026-10-17：Pi 作者 Mario Zechner 博客动手篇（译文）提供一手印证与增量细节——Extension 强制行为用 `tool_result`/`agent_settled` 事件 + `deliverAs: 'followUp'` 实现；会话线内状态存 tool result 的 `details` 字段随 `/tree` `/fork` 走；定时任务按"Pi 开着/关着"分流（pi-schedule-prompt in-process vs launchctl/cron + `pi -p` headless 收窄工具）；打包即 `package.json` 声明 + `pi install git:/npm:`。

## Open Questions（开放问题）

- 五层划分是否出自 Pi 官方文档原文，抑或社区归纳：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md`
- Source: `raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md`（印证：Skill 渐进式加载、AGENTS.md 四件套、npm 分包安装）
- Source: `raw/sources/products/2026-10-17-pi-custom-agent-setup.md`（一手印证：skill vs extension 的"必定发生"判据、details 字段状态、定时两路、npm 打包分发）
- Source: `raw/sources/products/2026-10-17-pi-embedded-sdk-agent-engine.md`（印证第 5 层：三通道选型矩阵、inMemory 会话、构造期工具白名单）

## Related Knowledge（相关知识）

- [[pi-secondary-dev-5-layers|Pi 二次开发一篇讲透（信源页）]]
- [[pi-setup-mcp-codemode-guide|Pi Agent 入门指南（信源页）]]
- [[pi-custom-agent-setup|用 Pi 搭一个自己的 Agent（信源页）]]
- [[pi-embedded-sdk-agent-engine|Pi Embedded SDK（信源页）]]
