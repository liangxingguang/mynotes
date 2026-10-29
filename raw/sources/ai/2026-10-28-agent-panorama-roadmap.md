---
title: Agent - 全景与学习路线地图（1）
source: 知乎专栏《Agent》
source_url: https://zhuanlan.zhihu.com/p/2094116344245625249
source_type: article
platform: zhihu
captured: 2026-10-28
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-28-agent-panorama-roadmap.md
asset_ref: Assets/2026/10/agent-panorama-roadmap.md
---

# Agent - 全景与学习路线地图（1）

## 介绍

Part 1 打开黑盒：Agent 到底是什么（第 1-2 篇，概念与理论为主；第 1 篇含一段最小验证脚本）

> 读完你能理解：Agent 到底是什么、一次工具调用长什么样、为什么非要加一个”编排层”、  
> 怎么带你一路走到”自己做出一个能调用后台接口的管理助手”。

### 本篇要回答的问题

1.   普通聊天、function calling（工具调用）、自主 agent 的**分界线**在哪？”自主”具体指什么？
2.   一次工具调用（tool call）在系统里完整走一遍，是**什么样**的？
3.   为什么光有模型还不够，必须再多一层**编排层**（agent loop / harness）？
4.   **学习路线**怎么走：21 篇 / 8 个 Part 各阶段能看到什么成品？怎么自测？
5.   6 个核心词（LLM / Prompt / Function Calling / Tool Use / Workflow vs Agent / Harness）分别是什么意思？

> 动笔动手之前的环境准备（Python 环境、DeepSeek 密钥）与一次真实的工具调用演示，放在文末 「动手：把第一条 tool_use 跑起来」一节。

* * *

很多人把”会用 ChatGPT 聊天”理解成”AI 很智能”，把”能自己干活”理解成”多聊几轮”。 这中间其实隔着**三个明确台阶**。先把台阶画出来，全系列都是在这条线上往上爬的。

### 1.1 三级能力阶梯

同样是”用大模型”，按能力可以分成三级，逐级上升：

```
第 0 级  普通聊天 (chat)
  你 -> "张三是谁?"  ->  模型 -> "张三是个常见的名字…"
                              只能靠训练时记住的知识，读不到你系统里的数据

第 1 级  单次工具调用 (function calling / tool use)
  你 -> "查张三"  ->  模型: "我要调 get_user(name=张三)"
                        -> 你的代码真去查 -> 结果喂回 -> 模型答 "张三，ID 1001"

第 2 级  自主 agent (autonomous agent)
  你 -> "把张三账号停用，顺便看看他有没有超额"
       -> 模型自己决定: 先查用户 -> 再查订单 -> 最后调停用接口
          （几步、什么顺序、要不要重试，都是模型当场定的）
```

区分这三级的不是”模型聪不聪明”，而是**控制流（control flow）由谁掌握**：

*   第 0、1 级：下一步做什么，**写死在你的代码里**。
*   第 2 级：下一步做什么，**模型在运行时自己决定**；你的代码退居”执行器 + 回传结果”。

对后端工程师有个熟悉的类比：第 1 级像你写死的一条调用链`A -> B -> C`；第 2 级则是把 `A/B/C` 交给一个”看情况自己挑”的调度器，而且它挑的顺序你事先不知道。

### 台阶一：普通聊天（chatbot）

模型只会做一件事：**给一段文本，回一段文本**。它既不会上网，也不会动你的数据库， 甚至不知道自己”不会”——你问它”帮我查一下订单 10086 的状态”，它只能”编”一个回答。

关键特征：**对话的下一步由人决定**。你问一句，它答一句，它永远不会主动去做点什么。

### 台阶二：function calling / tool use（工具调用）

模型多了一项能力：**输出的位置上可以放”我想调用某个工具 + 参数”的结构化声明**。

比如你问”北京今天冷不冷？”，模型可以返回一段特殊结构，大意是：

```
{
  "name": "get_weather",
  "arguments": "{\"city\": \"北京\"}"
}
```

读法：**“我（模型）想调用 get_weather，参数 city=北京”**。注意两个动词：是”想”， 不是”调”——模型永远不执行任何代码、不发任何 HTTP 请求，它只是**声明意图**。 真正拿着这个声明去查天气、把结果拿回来塞给模型的，是模型外面的宿主程序。

这个台阶的产物：模型可以”接住”任意外部能力了，只要写清楚”工具长什么样”给它看 （工具的名字、参数、用途——就是把信息写成它看得懂的结构）。

### 台阶三：自主 agent（autonomous agent）

台阶二仍然是一问一答：人问 → 模型声明”我想调 get_weather” → 宿主执行 → 把结果给模型 → 模型给最终答复。**每一步的”下一步”还是人发起的**。

自主 agent 补上的是**循环（loop）**：模型调完第一个工具、看到结果之后， **不等人开口，自己决定要不要再调一个工具、再查一次、再多试一次**，直到任务完成或满足终止条件。

于是”查北京天气”变成：模型看一眼工具清单 → 发现要先查”北京在哪”（假设有这个工具）→ 再查天气 → 看到结果 → 决定”够了，回答用户”。全程用户只说了一句话。

### 1.2 “自主”的准确含义

“自主（autonomous）”在 agent 语境里**不是”无人监管”，而是”由模型自己决定行动序列”**。这个划分最常被引用的出处是 Anthropic 的 _Building Effective Agents_：

*   **Workflow（工作流）**：LLMs and tools are orchestrated through **predefined code paths**——路径预先写在代码里。
*   **Agent（智能体）**：LLMs **dynamically direct their own processes and tool usage**, maintaining control over how they accomplish tasks——模型动态决定自己的流程与工具使用。

一句话记法：**路径写死在代码里 = workflow；路径由模型当场决定 = agent。**

**“自主”指什么？** 三把尺子：

1.   **能自己决定下一步动作**——不是每一步都靠人喂指令；
2.   **一个任务在 loop 里多步完成**——调工具、看结果、再决策，可能来回好几轮；
3.   **有明确的终止/放手条件**——任务完成、达到最大轮数、或主动回头问用户。

对照一下（这张表后面反复会用到）：

| 形态 | 谁决定下一步 | 模型能不能说”我要调工具” | 有没有循环 |
| --- | --- | --- | --- |
| 普通聊天 | 人 | 无 | 无 |
| 工具调用（function calling） | 人（一问一答） | 能（只声明意图） | 无 |
| 自主 agent | 模型（在 loop 内部） | 能 | 有（直到终止） |

> 这个”workflow vs agent”的分野是 Anthropic 官方指南《Building Effective Agents》 的开篇定调：**workflow 是走预先写死的固定路径，agent 是模型动态决定路径（控制流）**。 本系列讲的”agent”都指后者——不是”接了大模型就叫 agent”。 
> 出处：Anthropic, Building Effective Agents

### 1.3 什么时候用 workflow，什么时候才上 agent

“自主”不是免费的：路径由模型决定，就意味着**不确定、更贵、更难调**。所以分界线不是”越自主越高级”，而是”任务路径能不能预先写死”。这正是 Anthropic 反复强调的一条——能用简单方案解决的就别上 agent。

| 维度 | Workflow | Agent |
| --- | --- | --- |
| 路径由谁定 | 开发者，写在代码里 | 模型，运行时决定 |
| 适合任务 | 步骤固定、可预测 | 步骤数无法预判、开放式的任务 |
| 可预测性 | 高 | 低 |
| 成本 / 延迟 | 低 | 高，多一步就多一次模型调用 |
| 调试 | 容易，失败能定位到某一步 | 难，需要 trace 和护栏 |

具体到本书主线——”后台管理助手”（Go 后台 + RBAC + 多租户）：

*   如果需求永远是”查用户 -> 展示”，那是**一条固定流程**，用 workflow 足矣，别上 agent。
*   一旦需求变成”我说一句话，你自己决定要不要登录、先查谁、要不要改角色”，路径无法预先写死，才轮到 agent（这也是第 8 篇要接上的场景）。

> 一个容易被混淆的点：**“是否每步都问人”（人机协同）和”路径谁定”是两件独立的事**。一个 agent 可以每一步都停下来等你确认，仍然是 agent；一条 workflow 也可以全自动跑完。本篇说的”自主”只指后者——路径谁定。

* * *

## 2. 一次工具调用的完整流程

把台阶二放大成时序图，看一次 `tool call` 到底怎么走完。假设模型当前有两个工具： `get_weather(city)` 和 `get_udid`（凑数举例，不重要）。

```
用户                      agent loop（编排层）                        LLM
 │──"北京今天冷不冷？"────▶│                                             │
 │                        │ 1.组装对话历史 + 工具清单(JSON Schema)       │
 │                        │───────────────────────────────────────────▶│
 │                        │                                             │──"我要调 get_weather，参数 city=北京"
 │                        │◀──────── tool_calls（结构化声明）──────────│
 │                        │ 2.校验参数 → 3.真的执行 get_weather("北京")    │
 │                        │      (向天气服务发 HTTP，得到 "5℃，多云")      │
 │                        │ 4.把结果作为 tool_result 追加进对话历史         │
 │                        │───────────────────────────────────────────▶│
 │                        │                                             │──"北京今天 5℃左右，多云，体感偏冷"
 │                        │◀─────── 最终的自然语言答复 ────────────────│
 │◀──"北京今天 5℃左右，多云。"──│                                             │
```

六个步骤，逐个拆（这是全系列最底层的骨架，第 3 篇会深度解剖）：

1.   **组装请求**：把对话历史 + 工具清单（每个工具的名字、参数、用途，按它能看懂的结构） 一起发给 LLM。
2.   **模型返回声明**：LLM 不是”现在去执行”，而是返回 `tool_calls` 数组——”我想调 `get_weather`，`arguments` 是 `{"city": "北京"}`“。**命令与执行分离**是理解 agent 的第一课。
3.   **宿主校验并执行**：编排层拿到声明，先校验参数（`"city"` 是字符串、必填、长度合理一次）， 再调用真正的函数/接口。模型那一句”我想调”本身**没有任何副作用**，副作用全在这里发生。
4.   **结果回填**：把工具的真实返回值包装成 `tool_result` 追加进对话——对模型而言， 它就是”看到了失败或成功的结果”的又一条消息。
5.   **再次交给模型**：带着结果再问一次 LLM，让它决定”够了，回答用户”还是”还要再调”。
6.   **返回给用户**：最终的自然语言答复。

两个必须记住的认知：

*   **模型只”声明”、宿主只”执行”**。模型永远不碰 HTTP、不碰文件、不碰数据库；所有真实世界 的副作用都发生在编排层。
*   **这一步还不是 agent**。上面的图里”下一步”仍由用户发起；把第 4→5 步连成循环、让模型 自己决定”再调哪个工具”，才升级成台阶三。这就是第 1 节说的”自主”。

### 2.1 谁在干活：三方分工

先记住角色，再看时序：

*   **你的程序**（agent 代码 / harness）：唯一能真正”干活”的一方——发 HTTP 请求、查数据库、调接口。
*   **模型（LLM）**：只会”写文本”。它**不能自己发 HTTP、不能连你的数据库**，它只能”说”——包括说出”我想调哪个工具、参数是什么”。
*   **工具（tool）**：你注册给模型的那些能力，本质是一段你的代码（打个 REST 接口、跑个 SQL）。

关键认知：**模型输出的是”意图”，不是”执行”**。真正把意图变成动作的，永远是你的代码。

### 2.2 一次 tool call 的时序图

下面这张图是全书的地基。左边是”你的代码”，中间是”模型服务”，右边是”真实世界（你的后台）”：

```
你的代码 (harness)              模型服务 (LLM API)            真实世界 (后台)
       |                                |                            |
  (1)  |--- messages + tools ---------> |                            |
       |    "查张三"                      |                            |
       |    工具清单: get_user/assign...  |                            |
       |                                |                            |
       |                          (2) 模型"看到"有这些工具           |
       |                              决定: 该调 get_user           |
       |                                |                            |
  (3)  |<-- tool_calls: -------------- |                            |
       |    [{name:"get_user",           |                            |
       |      arguments:'{"q":"张三"}'}] |                            |
       |    stop_reason: "tool_use"      |                            |
       |                                |                            |
  (4)  |--- 你的代码解析参数、校验、         |                            |
       |    真正发起 HTTP / 查询 -----------+-------------------------> |
       |                                |      GET /api/v1/users?q=张三 |
       |                                |                            |
  (5)  |<-- 真实结果 (200, JSON) ----------+----------------------------|
       |                                |                            |
  (6)  |--- 把结果作为 tool_result -------> |                            |
       |    追加进 messages，再请求一次      |                            |
       |                                |                            |
       |                          (7) 模型基于结果继续              |
       |                              要么再调工具、要么收尾         |
       |                                |                            |
  (8)  |<-- 最终自然语言答复 ------------- |                            |
       |    "张三是 admin，已停用"          |                            |
```

要点：

*   **(2) 是”决策”，不是”执行”**。模型只是决定要不要调、调哪个、参数填什么——它一个字节都没发出去。
*   **(4) 是你的代码在干活**。真正发起 HTTP、查库、写库的，永远是你的程序。
*   **(6) 是”循环”的来源**。把工具结果喂回去再问一次；如果模型还想调工具，就回到 (3)，循环下去——这就是 agent loop 的雏形（第 3 篇展开）。

### 2.3 消息里到底传了什么

模型不认识你的函数，只认识一串**结构化的消息**。以 OpenAI 兼容接口（DeepSeek 即用此格式）为例，一次往返大致是这样四种角色在轮转：

```
system      : "你是后台管理助手，只能查当前租户的数据…"   ← 规则
user        : "查一下张三"                              ← 人的话
assistant   : tool_calls=[{name:"get_user", args:{...}}]  ← 模型要调工具
tool        : tool_call_id=xxx, content="{...真实结果...}"  ← 工具结果喂回
```

三种主流接口对这套消息的字段命名略有差异（OpenAI 用 `tool_calls`；Anthropic 用 `tool_use` / `tool_result` 内容块 + `stop_reason:"tool_use"`；DeepSeek 走 OpenAI 兼容格式），但**机制完全一样**：模型产出”调用意图” -> 你的代码执行 -> 结果回填 -> 再问模型。第 6 篇会把三种姿势并排拆开对比。

* * *

## 3. 为什么需要 agent：模型不会发起 HTTP，代码不会决定下一步

台阶二、台阶三都很顺理成章，那等一会儿——**为什么不直接叫模型自己调接口，非要中间垫 一个编排层？** 因为建模这件事本身的能力边界，决定了必然要有这层垫料。

### 模型不会发起 HTTP

LLM 的输入和输出都是**文本**。它天生没有”发请求”“写文件”“执行命令”这些能力—— 它连”我现在真的去查了天气”都做不到，只能输出”我想查天气”这段文字。 你可以在系统提示词里写一万遍”请连接数据库”，它也只会回复一段像 SQL 的话，而不会真的连上。

要让模型的影响力触达真实世界，**必须有一个宿主进程负责”替它动手”**——这个宿主就是编排层。

### 代码不会决定下一步

反过来，传统程序（后端、脚本）倒是能执行 HTTP、读写数据库，但它每一步走哪个分支是**写死** 在开发者脑子里的。若需求变成”根据工具返回的结果，决定下一步调用哪个工具”，写死逻辑 根本写不完——工具组合是天文数字。

所以需要一层能”动态决策”的中枢：**它读模型的输出，决定执行哪个工具，把结果喂回去， 再看模型下一步怎么走。** 这个中枢就是 agent loop（也叫 agent core / harness）。

### agent loop = 编排层 = 中枢

`agent loop` 的全名其实就是上面那张时序图的**第 1、3、4、5 步的循环**，四个阶段：

`感知（观察）→ 思考（LLM 决策）→ 行动（工具执行/文本输出）→ 再感知 → …`

*   **思考**：模型看到上下文 + 工具清单，决定”下一步是调工具还是回答”；
*   **行动**：宿主执行工具（真的发 HTTP），或输出最终答复；
*   **感知**：把工具结果、环境反馈带回上下文；
*   回到思考：看到结果，重新决策。

顺带预告：这个四阶段，就是第 2 篇要讲的经典 AI 智能体理论在 2026 年的映射，也是贯穿 全系列的 PMTA 坐标系（Planning / Memory / Tool use / Action）的最简形态。

> **harness**（agent loop / agent core）：驱动”感知→思考→行动→观察”循环的工程化运行时。 它管的不只是循环本身，还管工具注册、上下文管理、权限、事件流、可观测等”两侧基础设施” （Claude Code、Cursor、OpenHands、OpenClaw 都是它的工程实例）。这个词本系列高频出现， 第 3 篇专门把它讲透。

如同 OpenAI 官方《A Practical Guide to Building Agents》给出的最小定义：**agent 的 四个构件是 Instruction（指令）、Model（模型）、Tools（工具）、Loop（编排循环）**—— 而后面两个（Tools、Loop）恰恰是”聊天”和”agent”的分水岭。

> 出处：OpenAI, A Practical Guide to Building Agents

* * *

读完本节你能理解：为什么”模型 + 工具”之外必须再有一层代码，这一层到底解决什么问题。

把上一节的图压缩成一句话矛盾：

*   **模型不会发起 HTTP**——它只会生成文本，天生够不着你的后台。
*   **代码不会决定下一步**——它是确定性的，不会”看情况挑工具、根据结果改主意”。

两边各缺一半：模型有”判断力”但没”手脚”，代码有”手脚”但没”判断力”。**agent 就是补上这个缺口的编排层（orchestration layer）**：把模型的判断翻译成真实动作，再把真实结果翻译回模型的输入，循环往复。

用后端语言类比，这层很像你熟悉的 **Controller / Service 编排**，只不过原来由人写的 `if/else` 决策，现在换成了模型输出：

```
传统编排（你写死）              agent 编排（模型定）
--------------------------    --------------------------
if (needUser) {               while (!done) {
    user = queryUser();         resp = llm(messages, tools)
}                               if (resp.wantsTool) {
if (user.needRole) {               result = exec(resp.tool, resp.args)
    assignRole(user);              messages += result
}                               } else { done = true }
                              }
```

这层代码在业界有个名字：**harness（智能体运行时）**——驱动”感知 -> 思考 -> 行动 -> 观察”循环的那套工程化基础设施。它要处理的全是后端工程师熟悉的问题：工具怎么注册、参数怎么校验、结果怎么回填、循环怎么终止、出错怎么兜底、上下文会不会爆。第 3 篇会把 harness 拆到底。

> 一句话记住本篇的立场：**agent 不是玄学，是一层你亲手写的编排代码。**模型的”智能”只是这层代码里的一个函数调用。

* * *

## 4. 学习路线图：21 篇怎么走到”自己做出一个 agent”

读完本节你能理解：整本书的 8 个 Part 各自解决什么问题、每学完一个 Part 你能看到什么成品，以及怎么自测。

### 4.1 只有一条主线

全系列围绕**一个 demo**（后台管理助手，Go 后台 + RBAC + 多租户）演进，遵循”需求驱动”：先给你一个能干的底板，再依次暴露它的短板、用新能力补齐，最后工程化收口。

```
P1 打开黑盒    -> Agent 是什么、坐标系        (第 1-2 篇)
P2 写出第一个   -> 手写最小 agent，看懂每行     (第 3-7 篇)  ★ 里程碑 M1
P3 接上真实系统 -> 后台管理助手第一版           (第 8-10 篇) ★ 里程碑 M2
       ↑ 它开始"能干活"，但会忘事、不会拆任务 ——
P4 记忆与规划   -> 补上记忆 + 规划             (第 11-12 篇) ★ 里程碑 M3
P5 接入 MCP     -> 工具标准化、跨语言桥接       (第 13-15 篇) ★ 里程碑 M4
P6 多智能体     -> 借鉴 Claude Code，拆多 agent (第 16-17 篇) ★ 里程碑 M5
P7 工程化上线   -> 评测/可观测/安全/治理        (第 18-20 篇) ★ 里程碑 M6
P8 毕业与 OS    -> 组装终版 + Agentic OS 视角   (第 21 篇)    ★ 毕业验收
```

### 4.2 8 个 Part × 里程碑

每个 Part 以一个**看得见的成品**收口。学到哪、离毕业多远，一眼可辨：

| Part | 篇 | 解决什么问题 | 里程碑（学完能看到什么） | 必修/选学 |
| --- | --- | --- | --- | --- |
| P1 打开黑盒 | 1-2 | Agent 是什么、理论坐标系 | 能指认一个现成 agent 的构件 | 必修 |
| P2 写出第一个 | 3-7 | 从零手写 agent loop | M1：终端跑起”属于你的最小 agent”，能调工具 | 必修 |
| P3 接上真实系统 | 8-10 | 让 agent 直连后台 REST | M2：一句话完成”登录->查用户->分配角色” | 必修 |
| P4 记忆与规划 | 11-12 | 补记忆、补规划 | M3：助手记得住偏好、会先列计划 | 必修 |
| P5 接入 MCP | 13-15 | 工具标准化、跨语言 | M4：MCP 版跑通 + Python Agent <-> Go MCP Server | 必修 |
| P6 多智能体 | 16-17 | 拆解成熟系统、落地多 agent | M5：主 agent + 查询 subagent 分工跑通 | 必修 |
| P7 工程化上线 | 18-20 | 评测/可观测/安全/治理 | M6：带评测报告、trace、安全壳的可交付版 | 必修 |
| P8 毕业与 OS | 21 | 组装终版 + 规模化视角 | 终版助手组装清单 + 落地交接单 | 必修（视野） |

**必修 vs 选学**：

*   **必修**：P1-P3（心智 + 第一个 agent + 主线 demo）、P7（能不能上线的分水岭）。
*   **强烈建议**：P4（记忆/规划是 agent 从玩具变工具的关键）、P5（MCP 是 2025-2026 事实标准）。
*   **按需/选学**：P6（多智能体复杂度高，先掌握单 agent 再上；本书会明说”什么时候不该用”）、P8（视野篇，不写新代码）。
*   **可跳读**：第 2 篇经典理论（P1）——若只想动手，可以先做第 3 篇回来看；但认真读它，后面每个设计决策都会对上号。

### 4.3 怎么自测：三个门槛

不用等学完，每过一个 Part 就自测一次——**能讲清楚、能指出取舍、能跑起来**，三条都过才算真学会：

1.   **能讲清楚**（P1 起）：不看笔记，用 PMTA（Planning / Memory / Tool use / Action，第 2 篇定义）拆解一个现成 agent（比如你正在用的 Claude Code），逐个指认构件。
2.   **能指出取舍**（P2 起）：对任一设计选择说出”什么时候不用它”——例如”这条任务该用 workflow 还是 agent”“该手写还是上框架”。
3.   **能跑起来**（P3 起）：每过一个里程碑，不看教程把成品重跑一遍并看到预期输出（P2 的 M1 起，每个里程碑都带运行命令 + 预期输出 + 自检清单）。

> 一个反直觉的自测信号：如果你把某篇的知识点背得很熟，却说不出”不这么做会出什么事故”，说明还没真懂。本系列每个设计都从”解决什么问题 / 不解决会出什么事故”讲起，就是为了防这个坑。

* * *

## 核心词表：本系列的高频词

上面几节出现过的、全系列会反复引用的词，集中过一次：

| 词 | 一句话大白话 | 出处 / 深讲章节 |
| --- | --- | --- |
| LLM（Large Language Model）大语言模型 | 输入文本、输出文本的概率模型，”很会接话”但不会动手 | 本系列默认 DeepSeek deepseek-chat；第 4 篇讲模型选型 |
| Prompt 提示词 | 你写给模型的那段话（system/user 消息都算），是模型行为的说明书 | 消息结构第 6 篇讲 |
| Function Calling 函数调用 | OpenAI 生态的叫法：模型返回”我想调某个函数 + 参数”的结构化声明 | OpenAI 官方 API 文档 <以官方 docs 为准> |
| Tool Use 工具使用 | 更通用的叫法（Anthropic、MCP 用词），同一件事：让模型”接住”外部能力 | Anthropic《Building Effective Agents》 |
| Workflow vs Agent | 预先写死的固定路径 vs 模型动态决定的路径——差在”谁决定下一步” | Anthropic《Building Effective Agents》 |
| Harness（agent loop / agent core） | 驱动”感知→思考→行动→观察”循环的工程化运行时 | 第 3 篇深度拆解；成熟实例 = Claude Code / OpenHands / OpenClaw |

> 后面还会高频出现的词——subagent（第 16-17 篇）、MCP（第 13-15 篇）、tool_result（第 7 篇）、 PMTA（第 2 篇）——到对应篇才正式定义，这里先知道它们存在即可。

* * *

## 动手：把第一条 tool_use 跑起来

### 动手前的环境准备（一次搞定，后续每篇都用）

**① Python 环境**（我这里用的miniconda, 自己建的环境，所以直接跳过）

需要 Python 3.12+。二选一：

*   推荐 **uv**（2026 年 Python 包与虚拟环境管理的事实标准，快、省事）——安装方式见 uv 官网 `<以官方 docs 为准>`；
*   或直接用 **pip**：`python3 -m venv .venv && source .venv/bin/activate`

国内网络源（清华 TUNA 是最常见的镜像，地址以镜像站官方为准）：

`pip install -i https://pypi.tuna.tsinghua.edu.cn/simple openai python-dotenv`

uv 对应的写法：`uv add openai python-dotenv`；uv 默认走 PyPI，慢时用 `.python-version` / 环境变量切换镜像 `<以官方 docs 为准>`。

`python -m pip install python-dotenv openai`

**② DeepSeek API key（本系列默认模型供应商）**

1.   到 DeepSeek 开放平台 注册账号；
2.   左侧「API Keys」→ 创建一个新 key（形如 `sk-…`）并**立即复制保存**（只显示一次）；
3.   按需充值（用量很小，充个最低额度即可跑完全系列动手实践）；
4.   当前 key 记进 **`.env`** 文件（不要写进代码，更不要进 git）：

```
# .env（放在本教程项目根目录）
DEEPSEEK_API_KEY=sk-你的key
```

把 `.env` 加进 `.gitignore`（`.gitignore` 里加一行 `.env`）——密钥进 git 是本系列 第 6 篇要专门讲的 API key 管理红线，现在就先养成习惯。

**③ Ollama（可选，不装也能走完全系列）**

想体验本地大模型、不消耗线上 token，可以装 Ollama （`ollama run deepseek-r1` 之类一行就跑起本地推理）。本地模型选型与私有化、 `deepseek-chat` vs 推理模型的对比，在第 4 篇专门讲。

### 动手实践：一行 Python，亲眼看”结构化参数”

**目标**：让 DeepSeek 返回一条 `tool_use`（工具调用声明），你亲眼看到它不是”跑到网上 查了天气”，而是**结构化地声明了”我想调 get_weather，参数 city=北京”**——为第 2-3 节 的”模型只声明、宿主才执行”补上实感。

新建 `demo_tool_use.py`（当前阶段脚本直接放在教程根目录即可；`agent/` 工程目录从 第 7 篇才开始建）：

```
"""第 1 篇动手实践：触发一次 tool_use，亲眼看结构化参数。

<未实测，接口以 OpenAI 兼容调用为准；适用 DeepSeek/通义/智谱等兼容端点>
本脚本只做"声明"，不执行任何工具——执行是后面章节舞台的事。
"""
import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # 从 .env 读 DEEPSEEK_API_KEY

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",  # DeepSeek 官方 OpenAI 兼容端点
)

# 给模型看的"工具清单"：名字 + 用途 + 参数结构（JSON Schema）
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的当前天气状况",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名，例如『北京』"}
                },
                "required": ["city"],
            },
        },
    }
]

resp = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "当用户询问天气时，调用 get_weather 工具。"},
        {"role": "user", "content": "北京今天冷不冷？"},
    ],
    tools=tools,        # 把工具清单交给模型
    tool_choice="auto", # 让它自己决定要不要用工具
)

# 打印模型返回的完整消息，重点看 tool_calls：
print(json.dumps(resp.choices[0].message.model_dump(), ensure_ascii=False, indent=2))
```

运行：

```
source .venv/bin/activate   # 若用 uv：已经在 uv 环境里  (这里用的是miniconda 不用这行)
python demo_tool_use.py
```

预期输出（结构如此，具体参数以当次模型返回为准）：

```
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_xxxx",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"北京\"}"
      }
    }
  ]
}
```

![Image 1](https://pic4.zhimg.com/v2-0c3dee9a3f1271da0f3390769ea8d393_1440w.jpg)

**从输出里看三件事**：

1.   **它没发任何网络请求**——`get_weather` 默认要去”天气服务”发 HTTP，但脚本里没有任何真实 执行逻辑；模型只是**声明了意图**。这个声明本身不发生任何副作用——”执行”这一步从来不 属于 LLM，只属于编排层。
2.   **参数是结构化 JSON**——`arguments` 是 `{"city": "北京"}`，字符串形式但可解析。这意味着 宿主程序可以安全地取出来、校验、再调用真实函数。
3.   **它还不是 agent**——没有循环：你问一句，它答一句”我要调 X”。把”调 → 看结果 → 再问” 循环起来（第 3-7 篇的活），才升级成台阶三的自主 agent。

**如果输出里没有 `tool_calls`**（直接给了一段文字回复）：多半是系统提示词没讲清楚”当用户问 天气时要用工具”。把 `system` 那行改得更明确，再跑。这正是第 7 篇要讲的”工具描述怎么写， 模型才看得懂”的现场版。

`> 注：本例是最小演示，工具参数只有一个；真实的工具（第 8 篇的登录、查用户）参数更多，`

> 但原理完全一样。本脚本未经本环境实测，接口细节以 DeepSeek 官方 docs 为准 `<以官方 docs 为准>`。

* * *

## 本篇结论

Agent 不是玄学，而是一层你亲手写的编排代码（harness）：模型负责"判断"，你的代码负责"执行"，两者靠结构化的 tool call 消息往返。  
判定 workflow 还是 agent，只看一件事——控制流由代码预先写死，还是由模型运行时决定。  
接下来第 2 篇会把"Agent 要有哪些部件"这套坐标系补全，全系列都在这套坐标上展开。

* * *

## 参考

### 参考资料

*   Anthropic — Building Effective Agents（workflow vs agent 的原始定义；本篇第 1、3 节引用，2026-10-15 在线核验）
*   OpenAI — Function calling 指南（tool 定义 JSON Schema、`tool_calls` / `tool_choice` 行为、实现由调用方提供；本篇第 2、4 节引用，2026-10-15 在线核验）
*   Anthropic — Tool use with Claude 概览（`tool_use` / `tool_result` 与 `stop_reason:"tool_use"`；本篇第 2.3 节引用，2026-10-15 在线核验）
*   DeepSeek API — Tool Calls（OpenAI 兼容的 tool-call 往返格式、base_url `https://api.deepseek.com`；本篇动手实践引用，2026-10-15 检索命中，页面本体未逐字核验）
*   Model Context Protocol — 规范仓库（最新规范 tag `2026-07-28`；P5 主线，本篇仅作导航，2026-10-15 在线核验）
*   CoALA: Cognitive Architectures for Language Agents（arXiv 2309.02427）（PMTA 的学术来源；第 2 篇正式定义，本篇仅导航引用。本环境 WebFetch 对 arxiv.org 受限，条目地址取自本系列已核验参考汇总）

* * *

提示词使用到的

### 理论地基（经典 AI → 现代 agent）

*   ✅ CoALA：Cognitive Architectures for Language Agents（arXiv 2309.02427） — 记忆/行动空间/决策程序框架，PMTA 学术来源
*   ✅ OpenAI：A Practical Guide to Building Agents
*   ✅ Anthropic：Building Effective Agents — workflow vs agent、模式选型
*   ⚠️ Russell & Norvig《Artificial Intelligence: A Modern Approach》— 智能体分类最权威出处

### MCP 官方（核心）

*   ✅ MCP 规范 GitHub 仓库 — 最新规范 tag `2026-07-28`
*   ✅ MCP 官方 Python SDK（FastMCP）
*   ✅ MCP 官方 Go SDK — `mcp` / `mcpclient` / `mcpserver`，OAuth
*   ✅ MCP 参考服务器大全
*   ✅ MCP 规范站 ⚠️ 结构需核验

### Agent 框架（Python）

*   ✅ Claude Agent SDK 官方文档 — PyPI `claude-agent-sdk 0.2.167`
*   ✅ Claude Code 官方文档
*   ✅ Anthropic engineering：Building agents with the Claude Agent SDK ⚠️
*   ✅ OpenAI Agents SDK — PyPI `openai-agents 0.24.0`
*   ✅ Pydantic AI — PyPI `pydantic-ai-slim 2.5x`
*   ✅ LangGraph 仓库（PyPI 1.2.15）⚠️ 文档路径核验
*   ✅ Semantic Kernel（微软系，.NET/C# 优先、有 Python 版；star 2.9w / PyPI 1.45.0，2026-10-15 curl 核验）
*   ✅ LlamaIndex（RAG/数据检索平台，Python；star 5.3w / PyPI 0.14.25，2026-10-15 curl 核验）
*   ⚠️ LangChain 官方文档（PyPI 1.4.6）— 选型篇”LangChain 呢”一节的对照素材，正文按”2026 已不建议用链式 API 直接构建 agent”处理
*   ⚠️ LangGraph 官方文档

### 国产模型与私有化（国内落地）

*   ✅ DeepSeek 开放平台
*   ✅ 智谱 AI 开放平台（GLM，OpenAI 兼容）
*   ✅ 阿里云百炼 Model Studio（通义/Qwen，OpenAI 兼容）
*   ✅ Ollama / ✅ vLLM

### 记忆存储（短期/长期落库，P4·11）

*   ✅ pgvector — Postgres 原生向量扩展，本项目优先
*   ✅ Qdrant / ✅ Milvus — 独立向量库，规模化再考虑
*   ✅ Chroma — 本地/嵌入向量库，教学最小版可用
*   ⚠️ Redis 官方文档 — 会话状态/TTL/缓存/锁
*   ⚠️ PostgreSQL 官方文档 — 本项目已用，长期记忆结构化表落这

### 多智能体 / 成熟 agent（拆解对象）

*   ✅ Claude Code — 本机在跑的代码 agent
*   ✅ OpenHands（All-Hands-AI/OpenHands）
*   ✅ OpenClaw（openclaw/openclaw） — harness 概念最贴近的代码参考
*   ✅ AutoGen（microsoft/autogen） / ✅ CrewAI — 多智能体框架
*   ⚠️ Cursor — 编辑器形态 code agent

### Agentic OS / 规模化视角

*   ✅ Manus — “AgentOS” 定位的代表（docs/子页路径 ⚠️ 生成时核验）
*   ⚠️ 其他 “agentic OS / agency OS” 权威文章：本环境网络受限无法逐条核验， 生成第 21 篇时用搜索引擎检索 `agentic OS 2026` 引用当期权威文章，不编造 URL。

### 评测 / 可观测 / 可靠性

*   ✅ promptfoo
*   ✅ DeepEval（PyPI 4.2.x） ⚠️ 文档站核验
*   ✅ Langfuse（PyPI 5.0.x）
*   ⚠️ OpenTelemetry GenAI 语义约定

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
