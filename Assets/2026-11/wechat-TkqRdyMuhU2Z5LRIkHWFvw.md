![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

大多数 Agent 框架在教你“怎么编排流程”，AgentScope 2.0 的官方说法是：不预设编排，把控制权交给越来越强的模型。它给的是积木（ReAct、工具、上下文、权限、8 种沙箱），再加一套多租户、多渠道、带 RAG 和 MCP Hub 的 Agent 后端服务。

最近在按 Loop / Graph / Harness 这套框架扫 agent 项目。之前拆过 Python 框架（Pydantic AI）、Java 框架（Spring AI Alibaba）、GUI Agent（UI-TARS）、研究 Agent（GPT Researcher）。

这次回到 Python，但视角不同：AgentScope 2.0（agentscope-ai/agentscope，表里 11 月 16 日推荐时 36,048 star，现在 36k）。

选它的原因：前面拆的框架大多停留在“怎么定义一个 Agent”，而 AgentScope 2.0 往前多走了一步——它不只给你 SDK，还给你一整套 Agent Service：多租户、多会话、IM 渠道、RAG、MCP Hub、团队编排、定时调度、状态持久化。换句话说，它想解决的不是“Agent 怎么写”，而是“Agent 应用怎么作为服务跑起来”。

这对做过 Java 后端的人应该很熟悉：相当于不只是给你 Spring Boot，还附带了管理后台、消息通道、权限体系和部署方案。

数据截至 2026-11-17（最新版 v2.0.12，2026-11-16），来自 GitHub 仓库、README、官方文档、NEWS 和源码；我没有实际部署 Agent Service，结论只到文档、源码和公开数据这一层。

36k

GitHub stars（2026-11-17）

40.2 万

PyPI 月下载

233

贡献者

v2.0.12

当前版本（2026-11-16）

01

PART

  

先把事实摆出来

FACTS

GitHub 与项目（2026-11-17）：

  

Stars 36k（表内快照 36,048），forks 3.9k，贡献者 233，Apache-2.0

  

最新版 v2.0.12（2026-11-16）；2024-02 首发 0.0.1，累计 56 个 release

  

PyPI 月下载 约 40.2 万——在 Agent 框架里属于第一梯队

  

团队：阿里通义实验室 SysML 团队（pyproject 里明确写着 “SysML team of Alibaba Tongyi Lab”）

  

两篇论文：AgentScope（arXiv 2402.14034，2024-02）与 AgentScope 1.0（arXiv 2508.16279，2025-08）

  

AgentScope 2.0 于 2026-05 发布，之后以每月一个主题的节奏加功能

  

代码结构：agent、tool、model、middleware、pipeline、permission、workspace、event、app（Agent Service）、sop、realtime、rag、skill、tui 等模块

一个判断：它不是“又一个 Agent 框架”，而是“Agent 框架 + Agent 后端”的组合。 前半部分是积木，后半部分是服务化。这也是它和 Pydantic AI（框架 + 评测 + 可观测）、Spring AI Alibaba（框架 + Graph + 平台）最大的不同——AgentScope 更偏应用后端。

图示 / 版本时间线

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

02

PART

  

设计哲学：不预设编排，把控制权交给模型

DESIGN PHILOSOPHY

README 里有一句很关键的话，值得整段引用：

官方原文

"We design for increasingly agentic LLMs. Our approach leverages the models' reasoning and tool use abilities rather than constraining them with strict prompts and opinionated orchestrations."

翻译：我们为越来越“agentic”的模型而设计。我们的做法是利用模型的推理和工具使用能力，而不是用严格的提示词和强预设的编排去约束它们。

这句话是对当下 Agent 框架路线的一次站队。市面上大量框架的核心卖点是“流程编排”：用图、用状态机、用 DSL 把步骤固定下来。这套思路在 2024 年很合理——模型能力不够，需要人工拆步骤。但 2026 年的模型已经能做多步推理、自主调用工具，过度编排反而限制了它。

所以 AgentScope 2.0 把重心放在：给模型一套好用的工具和上下文，让它自己决定怎么完成任务。 编排只在必要时出现（Pipeline / TeamPipeline / SOP）。

用 Java 的话说：从“大量 XML 配置驱动”进化到“约定优于配置 + 让框架自己跑”。这也是 Spring 生态过去十年的演进方向——框架从“替你做决定”变成“给你能力，你来决定”。

03

PART

  

SDK 层：八个积木

SDK BUILDING BLOCKS

AgentScope 2.0 的 SDK 层，官方列了八个 building block：

积木

内容

Java 世界里像什么

ReAct

推理-行动循环：结构化输出、实时中断/恢复、批量（顺序/并发）工具调用

一个带状态机的 Service

Toolkit

工具管理：Python 工具、MCP server、skills；内置 shell/文件编辑/搜索/任务规划工具

工具注册中心 + SPI

Model

多 provider：OpenAI、Anthropic、Gemini、DashScope、DeepSeek、Moonshot、Volcengine、xAI、Ollama

JDBC 式的模型抽象

Context

自动压缩、工具结果卸载（offload）、上下文注入（系统提示/RAG/记忆）

拦截器 + 上下文管理

Event System

统一事件总线：推理、工具调用、多模态内容（文本/图像/音频）流到前端

消息总线 / EventBus

Permission & HITL

细粒度权限：工具与资源控制、人工确认、bypass 模式

Spring Security + 审批流

Middleware

可组合钩子：回复、推理、执行、模型调用、权限检查、上下文压缩、系统提示

AOP / HandlerInterceptor

Memory

Agentic Memory，可切换后端（ReMe、Mem0）

可插拔的持久层

Workspace / Sandbox

隔离的工具与代码执行：local、Docker、Apple Container、Bubblewrap、E2B、OpenSandbox、Daytona、K8s

Testcontainers / 容器编排

官方示例代码很短：

from agentscope.agent import Agent  
from agentscope.console import launch\_console  
from agentscope.tool import Toolkit, Bash, Grep, Glob, Read, Write, Edit  
from agentscope.credential import DashScopeCredential  
from agentscope.model import DashScopeChatModel  
   
agent = Agent(  
    name=“Friday”,  
    system\_prompt=“You're a helpful assistant named Friday.”,  
    model=DashScopeChatModel(  
        credential=DashScopeCredential(api\_key=os.environ\[“DASHSCOPE\_API\_KEY”\]),  
        model=“qwen3.6-plus”,  
    ),  
    toolkit=Toolkit(tools=\[Bash(), Grep(), Glob(), Read(), Write(), Edit()\]),  
)  
   
await launch\_console(agent)

注意 Toolkit 里内置了 Bash、Grep、Glob、Read、Write、Edit——这是一套 coding agent 的工具集。也就是说，它默认就假设你可能会做一个“能操作代码和文件”的 Agent，而不是只做聊天。

图示 / 三层结构

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

04

PART

  

ReAct、工具与上下文：一个循环的三件事

THE LOOP

Agent 的核心循环没变：模型推理 → 决定调用工具 → 执行 → 结果回灌 → 继续推理。AgentScope 2.0 的差异在三个工程细节上：

第一，工具调用是批量的。 支持顺序和并发两种批量执行——模型一次返回多个工具调用时，可以并发跑，不用一个个等。这个优化在复杂任务上直接决定吞吐。

第二，中断与恢复。 README 明确写了 “realtime interruption & resume”：Agent 跑到一半可以被打断（用户插话、工具超时），并且能恢复。对交互式场景（控制台、聊天、语音）这是刚需。

第三，上下文是框架的事。 自动压缩（compaction）、工具结果卸载（把大结果挪出上下文，需要时再取）、上下文注入（系统提示、RAG、记忆）都由 Middleware 统一处理。你不需要在每个 Agent 里手写“历史太长怎么办”。

这三件事合起来，就是“Agent 循环”从 demo 走向生产必须补的工程细节。对比很多框架还在让用户自己拼 prompt，AgentScope 把它们做成了内建能力。

05

PART

  

沙箱：八种后端，从本机到 K8s

SANDBOX

Agent 执行工具和代码，最危险的是“在宿主环境里裸跑”。AgentScope 的 Workspace / Sandbox 给了八种隔离后端：

  

local：本机直接跑（开发用）

  

Docker：容器隔离

  

Apple Container：macOS 原生容器

  

Bubblewrap：Linux 轻量沙箱

  

E2B：云端沙箱

  

OpenSandbox：开源沙箱

  

Daytona：开发环境沙箱

  

K8s：集群级隔离

同一套 Agent 代码，换一个 backend 就从“本机调试”切到“集群生产”。用 Java 的话说，这层抽象就像 JDBC：你写一套代码，底下换环境。 对要跑 coding agent 或自动化任务的团队，这层是刚需——没有沙箱，Agent 删库跑路不是段子。

06

PART

  

Agent Service：从“库”到“应用后端”

AGENT SERVICE

这是 AgentScope 2.0 最值得写的部分，也是它和其他框架拉开差距的地方。

它自带一个 agent service：FastAPI 后端 + 预置 Web UI，直接把 Agent 变成“多租户、多会话的应用”。官方列出的能力：

能力

你能得到什么

Serving

多租户、多会话隔离、FastAPI 后端、预置 Web UI

Agent Team

Leader-worker 编排、内置团队工具、任务规划

Channels

接 IM：飞书、Discord、钉钉、自定义渠道、消息路由

RAG Service

Blob 存储、索引 worker、多租户检索

MCP & Skill Hub

浏览 GitHub MCP Registry / ClawHub，安装进库，加进 workspace

Resource Sharing

组/组织级共享模型、MCP server、skills、workspace

Persistence

SQL / NoSQL 持久化会话与状态

Scheduling

定时任务、Agent 唤醒、后台任务卸载

这张表基本就是一个“Agent 应用后台”的功能清单。做过 Java 后端的会立刻意识到：多租户、会话隔离、RBAC、资源分享、持久化、调度——这些是 SaaS 的通用问题，不是 Agent 特有的问题。 AgentScope 把它们提前做了，省掉大量重复造轮子。

尤其值得注意的是 Agent Team（leader agent 派活给 worker agent，通过内置团队工具协调）和 Channels（飞书/Discord/钉钉）——前者是编排的最小实用形态，后者是“Agent 直接进 IM 群干活”的入口。飞书渠道这一条，对国内团队尤其有用。

07

PART

  

2.0 的版本节奏：每月加一块

RELEASE CADENCE

从 NEWS 能看出 2.0 的演进节奏很稳：

  

2026-05：AgentScope 2.0 发布

  

2026-06：Agent Team、RAG、Mem0、分布式多租户 RAG service

  

2026-07：ReMe 长期记忆、K8s / OpenSandbox / Daytona workspace

  

2026-08：Channels（飞书/Discord）、Console、Pipeline、MCP & Skill Hub、钉钉

  

2026-09：A2A 协议、Realtime 语音 Agent、TeamPipeline、SOP、模型路由、MiniMax

  

2026-10：语音克隆、WebRTC 实时语音（文本与语音共享会话历史）

  

2026-11：v2.0.12

一年不到，从“框架”长成了“框架 + 服务 + 渠道 + 语音”。这个节奏说明团队在按“Agent 应用落地缺什么”补齐，而不是按论文功能表堆特性。

两个新概念值得单独说：

  

SOP（标准作业程序）：把多步任务固化成可复用的作业流程——这是把“编排”做成“模板”，介于自由 Agent 和硬编码流程之间。

  

TeamPipeline：leader 把任务拆给成员 agent，成员各自执行——这是最常用的多 Agent 协作模式，比通用图引擎更实用。

08

PART

  

Loop / Graph / Harness：一个 Agent 后端该打几分

THREE-AXIS VERDICT

维度

评级

一句话裁决

Loop

强（ReAct / 中断恢复 / 批量工具）

循环内建结构化输出、中断恢复、并发工具；上下文由框架管理

Graph

中（Pipeline / Team / SOP）/ 弱（通用图引擎）

有编排原语（Pipeline、TeamPipeline、SOP），但不是通用图/状态机引擎

Harness

强（沙箱 / 权限 / 服务化 / 渠道）

8 种沙箱、权限与 HITL、事件总线、多租户服务、IM 渠道、RAG、Hub 都齐

图示 / 三维评分

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Loop 是它最扎实的一层：ReAct 循环 + 批量工具 + 中断恢复 + 上下文管理，都是生产可用级别的细节。

Graph 给“中”：它有 Pipeline、TeamPipeline、SOP 三种编排形态，覆盖了大多数实际需求；但没有 Pydantic Graph / Spring AI Alibaba Graph 那种通用状态图引擎，也没把“图”作为一等抽象。想做复杂可视化流程，仍然要外接。

Harness 是最厚的一层：权限体系、HITL、8 种沙箱、事件总线、中间件、Agent Service 的多租户/渠道/RAG/Hub/调度。它更像“Agent 应用的操作系统”，而不是“Agent 的库”。

09

PART

  

必须泼的冷水

COLD WATER

1

2.0 迭代太快。 半年加了几十个功能，API 仍在演进；生产项目要锁版本、读 changelog，升级需要测试。

1

Agent Service 很重。 多租户、RAG、MCP Hub、渠道——这套东西一旦部署，运维复杂度不低；小团队用不上，反而增加负担。

1

生态偏阿里系。 默认模型走 DashScope/Qwen，示例和文档对通义生态更友好；用 OpenAI/Claude 也行，但最佳路径不在那里。

1

编排能力不是最强项。 需要显式图、条件分支、可视化流程的场景，它不如专门的图引擎（Spring AI Alibaba Graph、LangGraph 一类）。

1

评测与证据体系偏弱。 框架侧重“跑起来”，质量评测、线上评估、回归测试要自己接（对比 Pydantic Evals / Langfuse）。

1

Python 3.11+、依赖较重。 依赖里包含 opentelemetry、FastAPI 生态、数据库驱动等，轻量场景显得笨重。

1

“不预设编排”是双刃剑。 把控制权交给模型，意味着行为更灵活也更不可预测；对结果稳定性要求高的场景，还是需要 SOP 这类约束。

1

本文未实测。 没部署 Agent Service、没接飞书渠道、没跑沙箱；结论来自 README、NEWS、文档和源码。

10

PART

  

值得抄的四个设计

PATTERNS TO STEAL

中间件式扩展

回复、推理、执行、模型调用、权限检查、上下文压缩——全部做成可组合的 middleware，类比 AOP。Agent 循环的每个阶段都能插逻辑，而不需要改框架代码。

沙箱抽象成 Workspace

一套 API 覆盖 local/Docker/E2B/K8s 八种后端，同一份代码从开发切到生产。这对任何“要执行模型生成代码”的 Agent 都是必需设计。

服务化优先

多租户、会话隔离、IM 渠道、RAG、Hub、持久化、调度——把 SaaS 的通用问题在框架层解决。这是它和“纯 SDK 框架”最大的区别。

事件总线做可观测

推理、工具调用、多模态内容统一走事件流，前端可以订阅渲染，也可以回放调试。Agent 不透明就没法运营。

11

PART

  

最后说点判断

MY TAKE

AgentScope 2.0 的路线很清晰：不跟别人拼“谁的编排图更漂亮”，而是拼“谁的 Agent 应用更容易上线”。

在模型能力快速上升的 2026 年，这个判断大概率是对的：编排会越来越薄，模型会越来越强，真正难的是把 Agent 变成可靠的服务——权限、沙箱、会话、渠道、持久化、可观测。这些恰恰是“后端工程”的活，也是阿里的强项。

适合谁？要做 Agent 应用（不是 demo）的团队：需要多租户、要接 IM、要跑沙箱、要一套现成后端。不适合谁？只想写个脚本或单机 Agent 的个人——Pydantic AI、OpenAI SDK 更轻。

把系列拼起来，Agent 基础设施的地图越来越完整：Letta Code 管记忆、Temporal 管执行、browser-use 管浏览器、UI-TARS 管桌面、Langfuse 管证据、OpenHands 管控制面、Pydantic AI / Spring AI Alibaba 管框架、GPT Researcher 管研究，AgentScope 管“Agent 应用怎么变成一套后端”。

参考来源 / REFERENCES

GitHub：https://github.com/agentscope-ai/agentscope

官方文档：https://docs.agentscope.io

PyPI：https://pypi.org/project/agentscope/

论文（2024）：https://arxiv.org/abs/2402.14034

论文（1.0，2025）：https://arxiv.org/abs/2508.16279

NEWS（版本节奏）：https://github.com/agentscope-ai/agentscope/blob/main/docs/NEWS.md

本文调研基准：v2.0.12（2026-11-16），main @ e111253，2026-11-17（未做本地实测）

既然看到这里了，如果觉得有用，随手点个赞、在看、转发三连吧。

点赞

在看

转发

THANKS FOR READING