---
title: Pi 二次开发这件事，一篇讲透：5 层定制，把极简 Agent 变成你自己的产品
source: 微信公众号（nephen）
source_url: https://mp.weixin.qq.com/s/3XcWGXiMmyNVCABTgfX6UQ
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-14-pi-secondary-dev-5-layers.md
---

# Pi 二次开发这件事，一篇讲透：5 层定制，把极简 Agent 变成你自己的产品

TUTORIAL · PI AGENT2026.09

二开 = 从源码魔改？

五层定制，把 11 万星

极简 Agent 变成你的产品

Prompt 模板 · AGENTS.md · Skill · Extension · SDK

Pi Coding Agent 二次开发指南

开源终端 Agent

📦 5 Parts + Conclusion

👉 滑动

PART 01

为什么是 Pi

WHY PI

PART 02

看懂薄内核

CORE

PART 03

五层定制

FIVE LAYERS

PART 04

选型判断

DECIDE

PART 05

生态与坑

ECOSYSTEM

PART ///

写在最后

SUMMARY

Pi 的强大，不在于它做了什么，而在于它决定不做什么。

最近半年，终端 AI 编程圈的风向明显变了：Claude Code、Codex CLI 之外，一个叫 **Pi** 的开源项目成了讨论度最高的名字——GitHub 星数已突破 11 万，作者 Mario Zechner 的设计哲学被反复引用：让 Pi 适配你的工作流，而不是反过来。

很多人把 Pi 用成了“高级命令行聊天工具”，装几个插件就完事。但 Pi 真正的价值在于它是一个Agent 底座：内核薄、分层清楚、定制入口多，从改一行提示词到把它嵌进自己的服务端产品，有一条完整的升级路径。

这篇文章就把这条路径一次讲透：先看懂内核，再按成本从低到高过一遍五层定制，最后聊聊生态和两个必踩的坑。

01

PART

为什么大家都在拿 Pi 做二次开发

WHY PI

先回答一个前置问题：Agent 框架那么多，为什么二开偏偏选 Pi？

UC Berkeley 教授 Matei Zaharia（Apache Spark 创始人）发过一条实测帖：同一个模型——无论是 Claude、GPT 还是 GLM——放在 Pi 里跑，表现普遍好于放在官方 Agent 里。原因不难理解：官方客户端塞了太多预设行为，反而干扰模型发挥；Pi 几乎不做主，把“怎么干”的决定权完整交给了模型和你。

对二开来说，Pi 有三个别家给不了的条件：

内核小到能读完

核心就是一句话：LLM + 工具 + 循环。默认工具只有四个——read、write、edit、bash。一个下午就能把主循环源码通读一遍，这在动辄几十万行的框架里是不可想象的。

分层架构干净

模型适配、Agent 循环、终端 UI、编码 Agent 是四个独立包，你想用哪层就用哪层，不必整套吞下。

定制入口是“官方正门”

提示词模板、AGENTS.md、Skill、Extension、SDK，全部是官方支持的扩展点，升级不冲突、不破坏。

一句话总结

Pi 先是顶尖的 coding agent，然后才是开发框架

— 为什么二开选 Pi

02

PART

二开之前，先看懂那颗“薄内核”

CORE

Pi 的仓库（earendil-works/pi）自我定位写得很直白：AI agent toolkit——统一 LLM API、agent loop、TUI、coding agent CLI。四个词对应四个层次：

包名

职责

你可以拿它做什么

pi-ai

统一多厂商 LLM API

无缝切换 DeepSeek/Claude/GPT 等模型

pi-agent-core

Agent 循环与工具调用

自己搭一个非编码用途的 Agent

pi-tui

终端界面库

做 CLI 产品不必自己画界面

pi-coding-agent

完整编码 Agent

直接当工具用，或作为二开起点

核心循环只有三个动作：发上下文给模型 → 模型要调工具就执行、把结果拼回去 → 直到模型说完成。工具调用和结果的配对、一轮对话何时结束、会话如何落盘恢复，都在这一个循环里说清楚了。

模型适配的做法也值得学：各家 API 的流式返回格式五花八门，Pi 先定义一套标准化事件流，用 transport 层做厂商适配——不管上游怎么变，转完之后 Agent 看到的事件永远一样。这就是 Pi 换模型几乎无损的原因。

理解了这一层，下面的五层定制你才知道各自在解决什么问题。

03

PART

五层定制：从改提示词到造产品

FIVE LAYERS

按改动成本从低到高，Pi 的定制空间正好分**五级**。

— 五层定制阶梯：成本从低到高

第 1 层：Prompt 模板——把高频指令变成斜杠命令

最便宜的一层。写一个 Markdown 文件放进 ~/.pi/agent/prompts/（全局）或 .pi/prompts/（项目），文件名就是命令名：

...review.md

\---

description: Review staged git changes

\---

请审查当前 staged 的 git 变更，重点看：

1\. 逻辑错误　2. 安全隐患　3. 缺失的测试

目标：$1

在 Pi 里执行 /reload 后，/review 支付模块 就能直接调用，$1 接收参数。适合：提示词本身简单、只是天天重复敲的场景。

第 2 层：AGENTS.md——给项目立规矩

项目结构、测试命令、编码规范、禁改目录，写进 AGENTS.md，Pi 启动时自动加载。这是项目级长期记忆，改完执行 /reload 即可生效，不用每次开新会话重新介绍项目。

第 3 层：Skill——复用一整套工作流

Skill 不只是一段提示词，它可以携带步骤说明、脚本和参考资料，官方格式长这样：

...SKILL.md

\---

name: pdf-tools

description: Extract text and tables from PDF files.

　　Use when reading, converting, or inspecting PDFs.

\---

转换文档前先读 references/formats.md。

脚本路径一律相对本 skill 目录。

关键机制是**渐进式加载**：Pi 启动时只把每个 Skill 的 name + description 装进上下文，任务真正匹配时才读完整正文。description 要同时写清“做什么”和“何时用”，这是模型路由的唯一依据。适合：代码审查、内容生产、部署流程这类跨项目复用的完整工作流。

第 4 层：Extension——给 Agent 加“程序能力”

到这一层才开始写代码。Extension 是真正运行的 TypeScript 模块，官方 API 极其克制：

...extension.ts

import type { ExtensionAPI } from

　　"@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {

　pi.registerCommand("hello", {

　　description: "Show a greeting",

　　handler: async (name, ctx) => {

　　　ctx.ui.notify(\`Hello, ${name || "world"}!\`, "info");

　　},

　});

}

同一个 ExtensionAPI 可以注册工具、监听事件、改系统提示、画终端界面——你在 Claude Code 里羡慕的 plan 模式、subagent、todo 清单，社区全是用这层 API 做出来的（pi-subagents、pi-background-tasks 等现成插件）。这是二开的主战场。

第 5 层：SDK 内嵌——把它变成你的产品

最后一级，Pi 从“你用的工具”变成“**你产品的心脏**”：

...app.ts

import { createAgentSession } from

　　"@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {

　await session.prompt("当前目录有哪些文件？");

　console.log(session.getLastAssistantText());

} finally {

　session.dispose();

}

一个 createAgentSession 就起一个完整 Agent 会话，订阅事件、控制上下文、管理会话存储都是现成的；不用写代码的自动化场景还有 print / JSON / RPC 三种运行模式。

CASE 01

#### 把 Pi 产品化进服务端的真实玩法

有开发者把 Pi 用 SDK 内嵌进 TypeScript 服务，在应用层用 memfs（虚拟文件系统）+ just-bash（虚拟 shell）+ isolated-vm（JS 执行环境） 搭了一套进程内沙箱——不需要真沙箱，Pi 照样在里面跑，而整个 Claude/Codex 生态的 Skill 和 MCP 直接搬进了服务端产品。控制权在你手里，能力站在生态肩膀上——这就是 Agent 框架产品化的标准姿势。

— 第 5 层：SDK 分层与产品化路径

04

PART

Skill 还是 Extension？一张图分清

DECIDE

五层里最容易纠结的是第 3、4 层的边界。判断标准只有一句话：这套东西是“给模型看的说明书”，还是“给运行时跑的代码”？

— Skill 与 Extension 的分界

说明书用 **Skill**：纯文本就能表达的流程、判断标准、参考资料。零代码、跨模型、升级无风险。

代码用 **Extension**：需要真正的副作用——调内部 API、注册新工具、拦截事件、渲染界面。写的是 TypeScript，跑在运行时里。

顺序建议永远是从便宜到贵：能用 Prompt 解决的不动 AGENTS.md，能用 Skill 解决的不动 Extension。

05

PART

生态、分发和两个必看的坑

ECOSYSTEM

分发不用自己造轮子。上面所有资产——模板、Skill、Extension、主题——都可以打包成 Pi Package 通过 npm 分发，一条命令安装，团队内直接共享一套定制。

安全是二开的隐藏命题。让 Agent 真改代码、真跑命令，隔离就要认真考虑：Pi 生态的 Gondolin 用微虚拟机隔离执行环境，避免 Agent 直接污染宿主机；不想上虚拟机的，第 5 层的进程内沙箱是轻量替代。

两个坑，都是真踩过的：

！踩坑提示 🕳

Node 版本门槛：新版 Pi 要求 Node ≥ 22.19，npm 更新失败先查 node -v，别急着怀疑网络。

插件宁缺毋滥：原生 4 个工具覆盖 80% 场景，扩展装多了既烧 token 又干扰模型判断。先写 AGENTS.md 和 Skill，最后才考虑装插件。

— 五层口诀与避坑速查

///

LAST

写在最后

SUMMARY

回到开头那句话：Pi 的强大在于它决定不做什么。薄内核 + 五个官方定制入口，意味着你最终得到的那个 Agent，应该和你工作流的形状严丝合缝——这恰恰是所有“大而全”框架给不了的东西。

从写第一个 /review 模板开始，到把 createAgentSession 嵌进自己的服务，这条路上每一层都有真实收益。选一层，今天就开始。

我是 **nephen**，热衷于分享 AI 编程与 Agent 工程干货。如果你觉得今天这篇有收获，欢迎**点赞、在看、转发**三连，我们下篇见。

既然看到这里了，如果觉得有用，随手点个赞、在看、转发三连吧。

点赞

在看

转发

THANKS FOR READING
