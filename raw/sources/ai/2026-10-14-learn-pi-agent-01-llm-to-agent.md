---
title: Learn Pi Agent 01｜大模型如何一步步变成 Agent
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/wwl8q1LAguHp2GP_lQAINQ
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-22
inbox_ref: Archive/2026-10-14-learn-pi-agent-01-llm-to-agent.md
---

# Learn Pi Agent 01｜大模型如何一步步变成 Agent

这是 **learn-pi-agent** 的第一章。这个项目以 Pi Agent 为主线，从最基础的模型调用开始，逐步解释现代 Agent 如何运行，又是如何实现的。

第一章先回答一个基础问题：

> 一个会回答问题的大模型，怎样一步步变成一个能够完成任务的 Agent？

大模型最常见的工作方式，是接收输入并生成响应。向它问“法国的首都是什么？”，通常一次生成就能给出答案。

但如果任务变成“检查一个项目、修改出错的文件，并验证修改结果”，一次响应就不够了。模型需要查看项目，根据看到的内容决定下一步，调用工具执行动作，再根据新的结果继续判断。

从大模型到 Agent，增加的不是一个新的模型，而是一套围绕模型持续运行的程序。它保存任务进度，执行被允许的动作，再把结果交给模型，让模型继续决定下一步。

接下来，我们从一次最小的模型调用开始，一步步看清这套程序怎样把模型、工具和整个运行过程连接起来。

## 1\. 一次模型调用发生了什么

模型调用从一份输入开始。负责准备输入、发起调用和接收响应的程序，称为**宿主程序**。

```
const context = {  messages: [    { role: "user", content: "法国的首都是什么？" },  ],};const response = await model.generate(context);
```

这段代码发生了三件事：

1.  宿主准备输入；
    
2.  模型根据输入生成响应；
    
3.  宿主接收响应。
    

为了让后面的例子使用同一套数据形状，可以把模型响应简化成这样：

```
{  "role": "assistant",  "content": [    { "type": "text", "text": "法国的首都是巴黎。" }  ],  "stopReason": "stop"}
```

`content` 保存模型生成的内容，`stopReason` 说明这一次生成为什么结束。到这里，完成的是**一次模型调用**。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图中的 Mox 表示宿主程序中的运行部分，模型是与它分开的黑盒。请求由宿主发送，响应也先回到宿主。

模型可以生成“读取 README.md”这样的请求，也可以输出一段看起来像命令的文本。但只有宿主真正调用工具，读取文件或执行命令才会发生。

```
模型生成请求 → 宿主检查请求 → 工具执行动作
```

因此，两者的边界很清楚：

*   模型根据输入生成文本或结构化请求；
    
*   宿主决定提供哪些工具，校验请求，并执行被允许的动作；
    
*   文件、网络、命令和数据库等外部能力都掌握在宿主环境中。
    

> 模型提供判断，宿主让被允许的动作真正发生。

## 2\. 从一次调用到 Agent Loop

一次模型调用很适合回答“法国的首都是什么”这类问题。

如果用户问“北京现在天气怎么样”，模型还需要取得实时天气；如果用户要求修改项目，模型还需要查看文件、提出修改并检查结果。

这类任务通常要反复经历下面的过程：

```
准备本轮输入    ↓调用模型    ↓模型直接回答，或请求工具    ↓宿主执行工具并保存结果    ↓带着新结果进入下一轮
```

负责推动这段过程的程序部分叫作 **Runtime**。它位于宿主程序中，连接模型、工具和运行记录。重复执行的过程叫作 **Agent Loop**。

模型返回的结构化工具请求称为 **Tool Call**，宿主执行后写回的结果称为 **Tool Result**。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

现在可以得到一个更具体的定义：

> Agent 是一个由 Runtime 组织的运行系统：模型根据当前输入提出下一步，Runtime 执行被允许的动作，并把结果带入下一轮，直到任务完成或运行被终止。

## 3\. 一次天气查询怎样完成

假设用户提出问题：

```
北京现在天气怎么样？
```

模型训练时学到的知识不能保证反映当前天气。宿主因此提供一个查询实时数据的工具：

```
工具名：get_weather用途：查询某个城市的当前天气输入：{ city: string }
```

工具说明让模型知道“可以请求什么”，真正的天气服务仍由宿主调用。

### 第一步：Runtime 准备 Context

Runtime 把用户问题、必要规则和工具说明组合成这次模型调用的输入。这份只供本轮调用使用的输入，称为 **Context**。

模型能依据的是当前 Context，而不是宿主拥有的全部数据。

### 第二步：模型返回 Tool Call

模型判断需要查询天气，于是在响应中返回一个 Tool Call：

```
{  "role": "assistant",  "content": [{    "type": "toolCall",    "id": "call_1",    "name": "get_weather",    "arguments": { "city": "北京" }  }],  "stopReason": "toolUse"}
```

这里有三个关键信息：

*   `name`
    
     指明模型请求 `get_weather`；
    
*   `arguments`
    
     提供工具参数；
    
*   `id`
    
     标识这次调用，后面的结果要用它完成关联。
    

`stopReason: "toolUse"` 表示这一次模型生成停在了工具请求处。天气还没有被查到，整段 Agent 运行也没有结束。

### 第三步：Runtime 校验并执行工具

Runtime 收到 Tool Call 后，要确认：

1.  `get_weather`
    
     是宿主提供的工具；
    
2.  `city`
    
     符合工具声明的输入格式；
    
3.  当前运行允许这次调用；
    
4.  执行没有被取消，也没有超过限制。
    

检查通过后，宿主才会访问天气服务。假设服务返回：

```
{  "temperature": "28°C",  "condition": "多云",  "observed_at": "2026-08-16T10:00:00+08:00"}
```

### 第四步：Runtime 写入 Tool Result

Runtime 把天气数据包装成 Tool Result，并使用同一个调用标识 `call_1`：

```
{  "role": "toolResult",  "toolCallId": "call_1",  "toolName": "get_weather",  "content": {    "temperature": "28°C",    "condition": "多云"  },  "isError": false}
```

一轮中可能出现多个 Tool Call。`toolCallId` 让每个 Tool Result 都能找到原来的请求，系统不必依赖数组顺序猜测对应关系。

### 第五步：模型根据结果回答

Runtime 准备第二轮 Context，其中包含用户问题、Tool Call 和对应的 Tool Result。模型现在可以回答：

```
北京当前 28°C，多云；观测时间为上午 10 点。
```

这次响应没有新的 Tool Call。Runtime 可以把文本作为运行结果返回，天气查询到此完成。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

整条链路可以压缩成一句话：

```
用户问题 → Tool Call → 宿主执行 → Tool Result → 模型回答
```

## 4\. Message、Context、State 与 Session

天气查询中已经出现了用户问题、模型响应、工具结果、本轮输入和保存下来的会话记录。它们对应四个容易混淆的概念。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图中的方向是：Session 保存可恢复的会话记录；加载会话后，Runtime 在 State 上推进当前运行；每次调用模型前，Runtime 再从 State 准备本轮 Context。新的模型响应和工具结果会更新 State，必要时也会保存回 Session。

### Message：一条有来源的内容记录

Message 说明一条内容由谁产生，以及内容是什么。

用户问题、模型的 Tool Call、宿主写入的 Tool Result 和模型最终回答，都可以作为 Message 保存。它的内容不一定是纯文本，也可以是图片或结构化内容块。

Message 只是一条记录，不代表完整会话。

### Context：模型本轮实际收到的输入

Context 是一次模型调用的输入快照，通常包含行为规则、选中的历史 Message、当前可用的工具说明，以及完成任务需要的其他资料。

Context 每一轮都会重新准备。Tool Result 只有进入下一轮 Context，模型才能依据它继续生成。

宿主保存了某条记录，不等于模型本轮一定能看到它。Runtime 会根据当前任务和输入长度限制，选择、转换或补充要发送的内容。

### State：Runtime 推进任务的当前状态

State 保存当前运行正在发生什么，例如已经产生的 Message、正在执行的 Tool Call、可用工具、错误、取消信号和停止原因。

State 中既有模型可能需要看到的内容，也有只供 Runtime 使用的控制信息。两者的关系可以写成：

```
Context_t = prepare(State_t)
```

下标 `t` 表示第几轮。Runtime 根据第 `t` 轮的 State，准备第 `t` 次模型调用的 Context。

### Session：可以保存和恢复的会话

Session 保存跨回合延续的会话记录。程序关闭后再次打开，或者恢复以前的对话，都要依靠 Session 中持久化的数据。

Session 不等于模型的永久记忆。Session 可以保存很多历史，但模型只能看到被 Runtime 选入本轮 Context 的部分。

把四者放在一起：

*   **Message**
    
     回答“这一条内容是什么”；
    
*   **Context**
    
     回答“模型这一次看到了什么”；
    
*   **State**
    
     回答“当前运行进行到了哪里”；
    
*   **Session**
    
     回答“这段会话怎样保存和恢复”。
    

## 5\. Agent Loop 怎样推进

天气查询只经过两次模型调用。任务更复杂时，同一套步骤会继续重复。

每一轮都从最新 State 开始。Runtime 准备 Context、调用模型，并把完整的 `AssistantMessage` 写回 State。接下来有两个主要分支：

*   响应中没有 Tool Call，Runtime 返回模型生成的文本；
    
*   响应中存在 Tool Call，Runtime 执行工具，把 Tool Result 写回 State，然后开始下一轮。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一次响应可以同时包含文本和 Tool Call，也可以包含多个 Tool Call。因此，Runtime 要检查完整响应，不能只读一段文本，也不能只根据 `stopReason` 判断整段运行是否结束。

下面的代码使用 Pi 的核心类型名、函数名和控制顺序，但删去了流式事件、钩子和部分错误分支。它是教学改写，不是从 Pi 仓库原样复制的源码。

```
async function runAgentLoop(  prompts: AgentMessage[],  context: AgentContext,  config: AgentLoopConfig,  streamFn: StreamFn,): Promise<AgentMessage[]> {  // 本次运行新传入和新产生的消息，最后返回给调用者。  const newMessages: AgentMessage[] = [...prompts];  // 旧消息后接上本次输入，形成循环持续使用的完整上下文。  const currentContext: AgentContext = {    ...context,    messages: [...context.messages, ...prompts],  };  await runLoop(currentContext, newMessages, config, streamFn);  return newMessages;}async function runLoop(  currentContext: AgentContext,  newMessages: AgentMessage[],  config: AgentLoopConfig,  streamFn: StreamFn,): Promise<void> {  while (true) {    // ① 调用模型；完整响应也会写入 currentContext.messages。    const message = await streamAssistantResponse(currentContext, streamFn);    newMessages.push(message);    // ② 模型调用失败或被取消，本次运行结束。    if (message.stopReason === "error" || message.stopReason === "aborted") {      return;    }    // ③ 从整条响应中找出所有 Tool Call。    const toolCalls = message.content.filter(      (item): item is ToolCall => item.type === "toolCall",    );    // ④ 没有 Tool Call，这条模型消息就是本轮最终响应。    if (toolCalls.length === 0) return;    // ⑤ 参数可能被截断时生成失败结果，否则执行工具。    const batch = message.stopReason === "length"      ? await failToolCallsFromTruncatedMessage(toolCalls)      : await executeToolCalls(currentContext, message, config);    // ⑥ Tool Result 进入完整上下文，也进入本次新增消息。    for (const result of batch.messages) {      currentContext.messages.push(result);      newMessages.push(result);    }    // ⑦ 工具阶段要求终止时不再开始下一轮。    if (batch.terminate) return;  }}
```

这里同时维护了两个视角：

*   `currentContext.messages`
    
     是下一轮模型调用所需的**完整工作集**；
    
*   `newMessages`
    
     是本次运行产生的**增量结果**，便于调用者更新界面、保存记录或继续处理。
    

同一条新消息写入两处，是因为两处服务的对象不同。`newMessages` 不会再被单独追加回模型 Context，因此不会让模型看到两份重复消息。

天气示例与代码可以逐步对应：

1.  `runAgentLoop`
    
     把用户问题加入 `currentContext`；
    
2.  第一次 `streamAssistantResponse` 返回含 `call_1` 的 AssistantMessage；
    
3.  `executeToolCalls`
    
     找到 `get_weather`，生成对应的 ToolResultMessage；
    
4.  Tool Result 进入 `currentContext.messages`；
    
5.  第二次模型调用因此能看到天气结果；
    
6.  第二次响应不再包含 Tool Call，循环结束；
    
7.  `runAgentLoop`
    
     返回本次运行产生的 `newMessages`。
    

`stopReason: "toolUse"` 结束的是一次模型生成，不是整个 Agent Loop。循环是否继续，要看响应中有没有 Tool Call，以及工具执行阶段是否要求终止。

## 6\. Runtime 怎样处理停止

Runtime 是宿主程序中负责推进一次 Agent 运行的部分。它会：

*   根据 State 准备 Context；
    
*   调用模型并保存响应；
    
*   识别、校验和分发 Tool Call；
    
*   把 Tool Result 写回 State；
    
*   处理取消、错误和运行限制；
    
*   决定开始下一轮，或把运行状态返回给上层程序。
    

`stopReason` 只说明模型为什么停止**本次生成**。Runtime 还要结合响应内容和运行规则，处理整段运行：

*   正常停止且没有 Tool Call：返回文本，运行完成；
    
*   响应中存在 Tool Call：处理工具，通常进入下一轮；
    
*   生成达到长度上限：不把结果误报为完整完成，也不执行可能被截断的参数；
    
*   模型调用出错或被中止：保存原因，结束当前运行；
    
*   用户取消、超时或达到资源上限：阻止新的调用并结束运行；
    
*   工具被拒绝或执行失败：写入失败结果，再按运行规则继续或结束。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

停止信号可以来自模型、用户、工具或运行限制。把这些信号转换成“继续、完成、失败或取消”等明确状态，是 Runtime 的职责。

一个可靠的 Agent Loop 至少要守住五条边界：

1.  模型提出工具请求，宿主执行动作；
    
2.  Tool Call 与 Tool Result 使用标识关联；
    
3.  每轮根据最新 State 重新准备 Context；
    
4.  完成、失败、取消和未完整输出分开记录；
    
5.  文件、网络、命令和数据库操作受宿主环境控制。
    

## 7\. Harness：把完整运行环境装起来

Runtime 解决“循环怎样推进”。一个真正可用的 Agent 还需要模型连接、工具、会话保存、运行规则、执行环境和用户界面。

把这些部分装配在一起的完整运行层，通常称为 **Agent Harness**。

```
Harness  = 模型连接  + Runtime  + Context 准备  + 工具  + Session  + 运行规则  + 执行环境与界面
```

Harness 不是一种消息协议，而是工程上对完整运行层的称呼。Runtime 是它的控制核心，模型、工具和存储是被它组织起来的组成部分。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Pi 官方把项目称为 **Pi Agent Harness**。沿着它的三个核心包，可以看见本章概念怎样落到代码中：

*   `@earendil-works/pi-ai`
    
    ：连接不同模型服务，统一模型、消息、工具和逐步返回的响应；
    
*   `@earendil-works/pi-agent-core`
    
    ：维护 Agent Loop 和 State，执行工具并报告运行变化；
    
*   `@earendil-works/pi-coding-agent`
    
    ：装配 Session、工具和命令行，形成可以使用的编程 Agent。
    

Pi 把核心循环保持得较小，同时提供扩展入口。新的工具、命令、界面行为和运行钩子可以接入 Harness，而不必把所有定制都写进 Agent Loop。

## 最后，把整条主线连起来

*   一次模型调用只有“准备输入—模型生成—接收响应”；模型响应不会自动执行外部动作。
    
*   Runtime 把模型调用、工具执行和下一轮输入连接成 Agent Loop。
    
*   Tool Call 是模型提出的结构化请求，Tool Result 是宿主执行后写回的结果，两者通过调用标识关联。
    
*   Message 是一条内容记录，Context 是本轮模型输入，State 是当前运行状态，Session 是可以保存和恢复的会话记录。
    
*   `stopReason`
    
     结束的是一次模型生成；Runtime 根据响应内容和运行规则落实整段 Agent 运行的继续或停止。
    
*   Harness 把 Runtime、模型连接、工具、Session、执行环境和界面装配成完整 Agent 系统。
    

理解这条链路以后，再进入模型 API、流式响应、工具系统、MCP、Skill 和插件时，每个概念都会有清楚的位置：它们是在扩展模型边界、Runtime 能力或 Harness 的装配方式。

## 下一章：模型 API 与消息协议

Agent Loop 已经需要反复调用模型。下一步要弄清楚：宿主怎样把 Context 发送给模型，模型又怎样返回文本、Tool Call 和 Tool Result？

下一章将比较 OpenAI Chat Completions、OpenAI Responses 和 Anthropic Messages 三种常见格式，再回到 Pi，看看它怎样通过统一消息类型和 Provider Adapter 接入不同模型。

* * *