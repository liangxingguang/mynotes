---
id: 2026-11-06-pi-loop-engineering
title: 从 Pi 窥见 Loop Engineering 的递归美学
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2061271933296154175
source_type: web
platform: 知乎
created: 2026-11-06
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026-11/zhihu-2061271933296154175.md
wiki_status: ingested
---

# 从 Pi 窥见 Loop Engineering 的递归美学

> 摘要：作者工作用特斯拉 Eino（Graph 框架，服务端批量部署成本低），对 Agent 模式（Claude Code、Manus、Pi）与 Graph 模式的深层差异存疑，遂把 OpenClaw 背后的引擎 Pi 源码 clone 通读，结论是"递归美学"——整个引擎只有一种原语：循环，复杂行为都是循环套循环长出来的。Pi 架构四层（pi-ai / pi-agent-core / pi-coding-agent / TUI-JSON-RPC），核心 agent-loop 数百行，脏活（持久化、压缩、扩展、重试）全挡在 AgentSession 层。事件流 + run/turn 两层循环 + steering/follow-up 两个队列构成高层交互模型。对比结论：Graph 把控制流写进图结构，Agent 把控制流交给模型、确定性做进运行时。

## 核心要点

1. **通往 Agent 的三个阶段**：工作流模式（线性 pipeline，路径人为画、模型无决策权，代表 Dify/早期 LangChain）→ Graph 模式（以 ReAct 为基础范式，模型"思考→调工具→拿结果→再思考"表达为节点与回边，有基础 loop，代表 LangGraph/Eino）→ Agent 模式（模型持通用工具 read/bash/edit/write 在真实执行环境自己驱动循环，代表 Claude Code/Manus/Pi）。Agent 自由度与能力上限最高，但需要独立执行环境、运维成本高；生产产品多从 Graph 起步。
2. **Pi 为什么值得关注**：OpenClaw 一周十几万 star，底下跑的就是 Pi 这套循环；作者 Mario Zechner（libGDX 作者）今年 4 月加入 Armin Ronacher 联合创立的 Earendil，仓库迁至 earendil-works/pi（MIT 协议）。核心代码简洁：默认工具只有 read/bash/edit/write 四个，系统提示词不足千 token，agent-loop 一个下午读完——Agent 能力上限看循环怎么设计，工具堆再多也没用。
3. **四层架构 + 脏活外移**：pi-ai（统一各模型供应商流式输出）→ pi-agent-core（agent-loop 真正循环引擎；Agent 有状态封装，管理消息/工具/队列/事件订阅）→ pi-coding-agent（AgentSession 产品层：会话保存/扩展/自动压缩/重试/系统提示词/工具注册）→ TUI/JSON/RPC（只是事件消费者，不实现 loop）。核心 agent-loop 数百行 vs AgentSession 体量四倍——会话持久化、自动压缩、扩展系统等脏活全部挡在 AgentSession，循环层干干净净，换 UI 不用改循环。
4. **两层循环结构**：外层 agent-run loop（回答"这次用户请求是否真正结束"）套内层 turn loop（一次 assistant 响应 + 工具调用 + 结果回写）。事件流：agent_start → turn_start → message_* / tool_execution_* / turn_end → agent_end；UI 渲染、会话保存、扩展、压缩全部挂在事件上工作，谁也不用伸手进循环内部。
5. **两个队列解决交互**：steering（用户中途插话，消息排队，在两个 turn 的缝隙中注入上下文，模型自然转向，全程不打断）；follow-up（用户追问，agent 停前检查队列，有货就再跑一轮）。用户"随时可以说话"最终落成一个普通状态检查，没有特殊路径。
6. **边界处理决定生产可靠性**：模型输出被 token 上限截断时，Pi 把消息里所有工具调用整批标失败——流式解析器对截断 JSON 的"抢救"可能通过校验但内容残缺，执行残缺的 write 会毁掉文件；工具执行抛异常同样把错误包装成结果喂回模型，循环不中断。**简洁不等于简单**。
7. **核心洞察**：Graph 把控制流写在图的结构里（每条边都是开发者的预判）；Agent 把控制流交给模型，把确定性做进运行时（可观测、可插话、可持久化、出错不崩）。可搬的两条设计：① loop 可以多层级（单层 ReAct → run+turn 两级 → 子 Agent 再嵌套完整 loop，不同粒度问题处理时机不同）；② 每一层职责单一（一层管任务边界、一层管稳定阶段事件，复杂度不跨层扩散）。

## 正文

**（本篇作者为 Agent 引擎研究者，通读 Pi 源码的笔记；已按章节提炼）**

> **01 通往 Agent 的三个阶段**：工作流模式（确定性强、灵活性差，本质"带 LLM 节点的 pipeline"）→ Graph 模式（ReAct 为基础范式，具备基础 loop，今天绝大多数生产 Agent 属此类）→ Agent 模式（模型持通用工具在真实执行环境自己驱动循环，自由度最高但资源消耗最大）。选择 Pi 的理由：代码简洁、Agent 能力高效、适合学习——四个工具撑起爆款产品，说明能力上限看循环设计。

> **02 Pi 的四层架构**：pi-ai（统一模型供应商流式输出）→ pi-agent-core（agent-loop + Agent 有状态封装：消息、工具、队列、事件订阅）→ pi-coding-agent（AgentSession 产品层：会话保存、扩展、自动压缩、重试、系统提示词、工具注册）→ TUI / JSON / RPC（事件消费者）。核心循环几百行、产品层四倍体量——循环不复杂，包装成能用的产品才复杂。TUI、JSON、RPC 只是消费事件，换 UI 循环引擎一行不改。

> **03 agent-loop 的两层结构**：模型每次只决定"下一步"，引擎负责把"下一步"串成完整任务。外层 agent-run loop（agent_start → agent_end，回答"请求是否真正结束"）套内层 turn loop（turn_start → turn_end，一次 assistant 响应 + 工具调用 + 结果）。用户中途插话 → steeringQueue，等当前 turn 结束在下一次请求模型前注入；agent 停前 → 检查 followUpQueue，有货再跑一轮。事件流稳定覆盖 message_* / tool_execution_*，UI 与会话系统全挂事件上工作。

> **04 边界处理**：token 截断时所有工具调用整批标失败（残缺参数通过校验但内容残缺，执行残缺的 write 会毁掉文件）；工具异常则包装成结果喂回模型，循环不中断。原文结尾表：用户输入 → 模型决定下一步 → Pi 执行现实动作 → 结果回到模型 → 模型重新决定 → 直到不需要动作。

> **05 从 Pi 学到的**：Graph 把控制流写死在图结构（每条边都是预判），Agent 把控制流交给模型、确定性做进运行时。两条可直接搬的设计：loop 多层级（run 管任务边界、turn 管节奏，子 Agent 再嵌套完整 loop）；每层职责单一（一层边界一层事件，复杂度不跨层扩散）。

## 来源

原文链接：从 Pi 窥见 Loop Engineering 的递归美学（知乎专栏，2026-11-06 采集）

## 附件

[[Assets/2026-11/zhihu-2061271933296154175.md]]
