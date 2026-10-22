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
3. **说明书 vs 代码的分界**：第 3、4 层最易纠结，判断标准只有一句话——这套东西是"给模型看的说明书"（Skill：零代码、跨模型、升级无风险），还是"给运行时跑的代码"（Extension：需要副作用，TypeScript 跑在运行时里）。

## Structure（结构）

| 层 | 机制 | 适用场景 |
|---|---|---|
| 1. Prompt 模板 | Markdown 放入 `~/.pi/agent/prompts/`（全局）或 `.pi/prompts/`（项目），文件名即斜杠命令，`$1` 接参，`/reload` 生效 | 天天重复敲的简单指令 |
| 2. AGENTS.md | 项目结构/测试命令/编码规范/禁改目录写入后启动自动加载，项目级长期记忆（另有 override/SYSTEM/APPEND_SYSTEM 变体） | 项目级规矩与长期上下文 |
| 3. Skill | SKILL.md frontmatter 写 name/description，可携带脚本与参考资料；**渐进式加载**——启动只装 name+description，任务匹配才读正文，description（做什么+何时用）是模型路由的唯一依据 | 跨项目复用的完整工作流 |
| 4. Extension | TypeScript 模块，`export default function(pi: ExtensionAPI)`，可注册命令/工具、监听事件、改系统提示、渲染 UI；plan 模式、subagent、todo 清单等社区功能（pi-subagents、pi-background-tasks）均出于此层 | 需要程序能力/副作用，二开主战场 |
| 5. SDK 内嵌 | `createAgentSession()` 一个调用起完整 Agent 会话，可订阅事件、控上下文、管会话存储；另有 print/JSON/RPC 三种无代码运行模式 | 把 Pi 变成自己产品的心脏 |

## How It Works（运作方式）

底层的可定制性来自薄内核：核心循环只有"发上下文给模型 → 执行工具调用拼回结果 → 直到完成"三个动作，四个独立包（pi-ai / pi-agent-core / pi-tui / pi-coding-agent）分层干净，定制经各层扩展点接入而非改循环。产品化的典型玩法（第 5 层案例）：用 memfs（虚拟文件系统）+ just-bash（虚拟 shell）+ isolated-vm 搭进程内沙箱，把 Claude/Codex 生态的 Skill 与 MCP 直接搬进服务端产品。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-sandboxing|Agent 沙箱隔离]]：第 5 层产品化时的隔离手段（Gondolin 微虚拟机 / 进程内沙箱）属于该概念的实现路径

### Dependencies（依赖项）

- [[pi|Pi]]：本模型是 Pi 实体的一部分（part-of）

## Evolution（演进）

- 2026-09/10：随 Pi 走红由社区教程系统化总结（当前信源为二手教程，官方文档原始表述未确立）。

## Open Questions（开放问题）

- 五层划分是否出自 Pi 官方文档原文，抑或社区归纳：当前信源未确立。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md`
- Source: `raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md`（印证：Skill 渐进式加载、AGENTS.md 四件套、npm 分包安装）

## Related Knowledge（相关知识）

- [[pi-secondary-dev-5-layers|Pi 二次开发一篇讲透（信源页）]]
- [[pi-setup-mcp-codemode-guide|Pi Agent 入门指南（信源页）]]
