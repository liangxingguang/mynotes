---
title: 从 Pi 窥见 Loop Engineering 的递归美学
source: 知乎专栏（作者未署名，Agent 引擎研究者）
source_url: https://zhuanlan.zhihu.com/p/2061271933296154175
source_type: article
platform: 知乎
captured: 2026-11-06
registered_at: 2026-11-06
inbox_ref: Inbox/2026-11-06-pi-loop-engineering.md
asset_ref: Assets/2026-11/zhihu-2061271933296154175.md
---

# 从 Pi 窥见 Loop Engineering 的递归美学
最近一直在研究 Agent 引擎。工作里我们用的是 [Eino](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Eino&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJFaW5vIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjc5MjAzNzcwLCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.3qS6h4RWHcrP0mE7WXmLcML_A2Fz3sZaZOovFnvzhL0&zhida_source=entity)，典型的 [Graph](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Graph&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJHcmFwaCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.9T4v2WhrUVCx_1CpX46Qx4A14RiE3jhj-STZgtuxV5Q&zhida_source=entity) 模式框架。用得越久，一个问题就越挥之不去：Graph 模式和 [Claude Code](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Claude+Code&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJDbGF1ZGUgQ29kZSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.H_WpnvJxlEVu6KcQjQ-q0TKxIak4gB_GWfZQ3R6EQFs&zhida_source=entity) 那种 Agent 模式，差距到底在哪？

Eino 和 [Pi](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Pi&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJQaSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.SJK5m59wtYaXNRpbyuzZHEu9LlogvUf81pMlVdqzEYY&zhida_source=entity) 相比的话，Eino 这类的 Graph 框架可以更容易的部署在服务端，同时供批量的用户进行使用。而 Pi 这种 Agent 模式的框架，都往往需要一套独立的执行环境，因此他们的运维成本会高很多。因此，Graph 模式的框架在生产环境里更容易落地。除此之外，它们还有什么差异呢？

光看文档看不出来。这次我干脆把 OpenClaw 背后的引擎 Pi 的源码 [clone](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=clone&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJjbG9uZSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.2Ummu_ClBPfTezLyJuDBSu9_9RXpQ6VXNFjvfxgPNug&zhida_source=entity) 下来，从头到尾读了一遍它的 agent-loop。读完之后，我找到了一个词来形容这套东西：**递归美学**。整个引擎只有一种原语——循环。一切复杂行为，都是循环套循环长出来的。

## 一、通往 Agent 的三个阶段

我认为，目前我们探索通往智能的道路上，经历了三个阶段。

**阶段一：[工作流模式](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E5%B7%A5%E4%BD%9C%E6%B5%81%E6%A8%A1%E5%BC%8F&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLlt6XkvZzmtYHmqKHlvI8iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.OATwkcHUUqmcTQu4xUgS7hSWnpcPNYWTZ2Mqjwv8SK8&zhida_source=entity)。** 典型代表 Dify、早期 [LangChain](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=LangChain&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJMYW5nQ2hhaW4iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.8ZP5J7-yDIVwj9D6G5lT4doD7HdTcB6svMuiD9Hg8V4&zhida_source=entity)。整体是[线性](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E7%BA%BF%E6%80%A7&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLnur_mgKciLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.9hLS944tILcJoNclPf704f71mRYaaUa-MJeccEa0nqY&zhida_source=entity)的，开发者把步骤一步步串好，模型在每一步里干活。确定性强、灵活性差，本质是"带 LLM 节点的 [pipeline](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=pipeline&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJwaXBlbGluZSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.uaL3xKNkRGHLXqlbbUDrrJvjSeoZiw9Ty9mdFh095aA&zhida_source=entity)"——路径是人预先画好的，模型没有[决策权](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E5%86%B3%E7%AD%96%E6%9D%83&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLlhrPnrZbmnYMiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.2I2NIPBo1luidmgBJt1qZfa6zQYivc7mQu7AdrttZcA&zhida_source=entity)。

**阶段二：Graph 模式。** 典型代表 [LangGraph](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=LangGraph&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJMYW5nR3JhcGgiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.xix__4D0Ymo8LlgyMa70bYRMHIqgHjgbQtgtb8yDJ64&zhida_source=entity)、Eino。以 [ReAct](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=ReAct&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJSZUFjdCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.QwMyABQiisU0g0NjhIT4lw3mGeNv5zeYIvenNC2jZrU&zhida_source=entity) 为基础范式，把"思考 → 调工具 → 拿结果 → 再思考"表达成图上的节点和回边，具备了基础的 loop 能力。今天绝大多数生产环境里的 Agent 产品，都属于这一类。

**阶段三：Agent 模式。** 典型代表 Claude Code、[Manus](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Manus&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJNYW51cyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.FnJzWSo9MhFFc9-HqCxA532gJGVcNvj-jkg3hPaqw-M&zhida_source=entity)、Pi。模型拿着一套通用工具（read / bash / edit / write），在真实的执行环境里自己驱动循环。

![Image 1](https://pic3.zhimg.com/v2-0a5b68139a4fd4b53a2a4f35b2e6c6ce_1440w.jpg)

能力和自由度最强的，一定是最后一档。但代价也很明显：Agent 模式必须配一个真实的代码执行环境，这样的 Agent 才有"做任何事"的可能性，硬件资源的消耗自然也最大。这就是为什么现在的 Agent 产品大多从 Graph 模式起步——对硬件的要求小一点，行为也更可控。

选 Pi 的主要原因是：它的代码很简洁，但它的 Agent 能力又非常高效，很适合学习。

简洁体现在哪？默认工具只有 read、bash、edit、write 四个；系统提示词短到不足一千个 token；核心的循环引擎，认真读一个下午就能读完。

高效就更直观了。OpenClaw 火成那样，一周十几万 star，底下跑的就是 Pi 这套循环，几乎原样扛住了这波流量。作者 [Mario Zechner](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Mario+Zechner&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJNYXJpbyBaZWNobmVyIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjc5MjAzNzcwLCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.3ceaR8gG7mAekRXRV08DsS4ATCTpcEXrEAl3hdYtBcs&zhida_source=entity) 是写出 [libGDX](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=libGDX&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJsaWJHRFgiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.XGKCcUD0oSWekSHZJ-bJvirAL1wkIp7IonqNVynAi3A&zhida_source=entity) 游戏框架的人，今年 4 月他带着 Pi 加入了 [Armin Ronacher](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Armin+Ronacher&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJBcm1pbiBSb25hY2hlciIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.w05A_MM1Wyqz83CJ4g3hTSQl2YIvFK91UjvM2dFQXus&zhida_source=entity) 联合创立的 [Earendil](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=Earendil&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJFYXJlbmRpbCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.Vv6wHzXC2bzmfJeQ_KeBosFuuti5HEjbtoW5uxkb0yM&zhida_source=entity)，仓库从 badlogic/pi-mono 迁到了 [earendil-works](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=earendil-works&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJlYXJlbmRpbC13b3JrcyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.fZm3Gf9BSMQshtsoLA-sLxspZdFj8ObwMVATJ1IL6tc&zhida_source=entity)/pi，核心保持 [MIT 协议](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=MIT+%E5%8D%8F%E8%AE%AE&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJNSVQg5Y2P6K6uIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjc5MjAzNzcwLCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.uW1cx08ujis43gLC7kQMRaJkkrIh2OveOZ_FMg7-uDA&zhida_source=entity)。

四个工具，撑起一个爆款产品。这件事本身就说明：Agent 的能力上限，看的是循环怎么设计，工具堆得再多也没用。

## 三、Pi 的分层：循环干净，脏活外移

整体来看，Pi 的架构分四层：

```
pi-ai
  统一不同模型供应商的流式输出

pi-agent-core
  agent-loop：真正的循环引擎
  Agent：有状态封装，管理消息、工具、队列、事件订阅

pi-coding-agent
  AgentSession：CLI/SDK/RPC 的产品层
  负责会话保存、扩展、自动压缩、重试、系统提示词、工具注册

TUI / JSON / RPC
  只是消费事件，不直接实现 agent loop
```

![Image 2](https://pic1.zhimg.com/v2-790783b726c1de4902ddb2f031e7dad2_1440w.jpg)

读源码时有个对比让我印象很深：核心的 agent-loop 就几百行，而产品层的 AgentSession，体量是它的四倍还多。

循环本身不复杂，把循环包装成能用的产品才复杂。 会话持久化、上下文自动压缩、扩展系统、模型切换、重试策略，这些脏活全部挡在 AgentSession 这一层，往下的 agent-loop 干干净净，只做一件事——驱动循环。

这种分层还带来一个直接的好处：TUI、JSON 输出、[RPC 接口](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=RPC+%E6%8E%A5%E5%8F%A3&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJSUEMg5o6l5Y-jIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjc5MjAzNzcwLCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.MZPOkrh9OCNWwhhwn37X4KjK1sdsDnuX9EiNqd2hf3U&zhida_source=entity)都只是事件的消费者。换一个 UI，循环引擎一行不用改。

## 四、一次 agent-loop 里会发生什么

对现代的 Agent 来说，从用户发出一条消息到拿到最终答案，中间可能发生很多次模型调用和工具执行。下面用 [ZCode](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=ZCode&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJaQ29kZSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI3OTIwMzc3MCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.fsgSGdUCvf8xFNH_xq7qQoGDQ6cFLOPM0DfpkCQpk6Q&zhida_source=entity) 的一次真实任务举例：

![Image 3](https://pica.zhimg.com/v2-6915b50894f88544ae026f7f4a420776_1440w.jpg)

在这个场景里，模型有思考：

![Image 4](https://pic1.zhimg.com/v2-b761fbf5d6445336f7b08e0ed5340650_1440w.jpg)

有命令行工具调用：

![Image 5](https://pica.zhimg.com/v2-2511deaee2de706ab0c662b3faa9203e_1440w.jpg)

还有子 Agent 的调用，子 Agent 内部又有更多的命令行调用：

![Image 6](https://picx.zhimg.com/v2-6df648547d2a2c4580043be4f0a8a09b_1440w.jpg)

直到整理完所有信息后，输出一个最终答案，这才算一次完整的 agent-loop 走完：

![Image 7](https://pic4.zhimg.com/v2-59e54a5ba6cc085d520ce66580b49731_1440w.jpg)

注意子 Agent 那一步：子 Agent 内部跑的，还是同一个 agent-loop。循环里套循环，每一层都是完整的"模型决策 → 工具执行 → 结果回流"。开头说的递归美学，指的就是这个——只有一种原语，靠自嵌套长出复杂行为。

那这样一个过程，引擎侧要怎么组织？

## 五、拆解循环：agent run 与 turn 的两层结构

agent-loop 的整体目标，是把一次不可靠、不可预测的模型输出，变成一个可控的任务执行过程。

先看模型一次输出可能出现的情况：

*   它直接回答了用户
*   它要求调用工具
*   它调用完工具后还需要继续判断
*   工具失败了
*   用户中途又插了一句话
*   上下文太长，需要压缩
*   UI 需要知道每一步发生了什么

所以 agent-loop 要解决的核心问题是：**模型每次只决定"下一步"，引擎要负责把这些"下一步"串成完整任务。**

Pi 的答案是两层结构。

**上层是 agent-run loop** 它表示"用户这次请求整体还在处理"，从 `agent_start` 开始，到 `agent_end` 结束。它回答一个问题：这次用户请求是否已经真正结束？

**下层是 turn loop** 一个 turn 是：一次 assistant 响应 + 它触发的工具调用 + 工具结果。从 `turn_start` 到 `turn_end`。一个 agent run 里可以有很多个 turn。

用一个修测试的任务串起来看：

```
用户：帮我修测试
  ↓
agent run 开始

turn 1：模型说要看错误日志
turn 2：模型看完日志，说要读源码
turn 3：模型读完源码，说要改文件
turn 4：模型改完文件，说要跑测试
turn 5：模型看到测试通过，给用户总结

agent run 结束
```

落到源码上，这两层结构就是 `runLoop` 函数里的两个嵌套 while 循环，逻辑提炼出来是这样：

```
外层循环（agent run 级）：
  内层循环（turn 级）：
    发出 turn_start
    把排队的用户插话（steering 消息）注入上下文
    请求模型，流式接收 assistant 响应
    有工具调用 → 执行，结果写回上下文
    发出 turn_end
    模型不再要工具、也没有新插话 → 退出内层

  // agent 打算停了，最后再看一眼
  follow-up 队列里有排队消息 → 回到内层继续
  没有 → 发出 agent_end，真正结束
```

两个队列的设计很有意思。Agent 类维护了 `steeringQueue` 和 `followUpQueue` 两个待处理消息队列：

*   steering（转向）：用户在任务执行中途插话。消息先排队，等当前 turn 结束，在下一次请求模型之前注入上下文。模型看到新指令，自然把方向转过来。
*   follow-up（追问）：用户在模型忙的时候发的后续消息。agent 本来要停了，退出前检查一下这个队列，有货就再跑一轮，省得用户干等一个新会话。

也就是说，中途插话靠的是**在两个 turn 的缝隙里注入消息**，全程不用打断任何东西。"用户随时可以说话"这个交互需求，最后落成了循环里一个普通的状态检查，没有任何特殊路径。

围绕这两层结构，循环对外发出一套稳定的[事件流](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E4%BA%8B%E4%BB%B6%E6%B5%81&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLkuovku7bmtYEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.doYA2VQFrE7ZXBybehaM_0yeChsOjsmzqWnx6wLBG78&zhida_source=entity)：`agent_start`、`turn_start`、`message_start` / `message_update` / `message_end`、`tool_execution_start` / `update` / `end`、`turn_end`、`agent_end`。[UI 渲染](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=UI+%E6%B8%B2%E6%9F%93&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiJVSSDmuLLmn5MiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.0oVdGAxJKEdwIXa0nMjo76mLLm0M4Upb7Q-TFOQ80hM&zhida_source=entity)、会话保存、扩展系统、自动压缩，全都挂在这些事件上工作，谁也不需要伸手进循环内部。

因此 Pi 的[状态机模型](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E7%8A%B6%E6%80%81%E6%9C%BA%E6%A8%A1%E5%9E%8B&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLnirbmgIHmnLrmqKHlnosiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.czFE8lVzp6C-aZ6xc6MEsLFPPx4AN7ojYS_Td7_m13I&zhida_source=entity)就是：

```
用户输入
  → 模型决定下一步
  → Pi 执行现实动作
  → 结果回到模型
  → 模型重新决定下一步
  → 直到不需要动作
```

![Image 8](https://picx.zhimg.com/v2-f456c3b86f623ef820cd7414d94a5f2f_1440w.jpg)

顺带说一个读源码时让我停下来的细节。当模型的输出被 token 上限截断时，Pi 会把这条消息里的所有工具调用整批标记为失败，一个都不执行。原因写在注释里：流式解析器会对截断的 JSON 参数做"抢救"，抢救出来的参数能通过校验，但内容是残缺的——执行一个参数残缺的 write，可能直接毁掉用户的文件。fail 掉之后把错误信息喂回模型，让它重新发起调用就好。

工具执行抛异常也是同样的思路：循环不中断，把错误包装成结果喂回模型，让模型自己决定下一步。**简洁不等于简单，这些[边界处理](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E8%BE%B9%E7%95%8C%E5%A4%84%E7%90%86&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLovrnnlYzlpITnkIYiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.NzJ4I2eDFqowVHJA3LwREOpVYwCSwCQoQeqdarCq3-4&zhida_source=entity)才是一个 loop 引擎在生产环境里站得住的原因。**

## 六、能从 Pi 学到什么

回到开头的问题：Graph 模式和 Agent 模式，差距到底在哪？

读完源码，我的答案是：**Graph 把[控制流](https://zhida.zhihu.com/search?content_id=279203770&content_type=Article&match_order=1&q=%E6%8E%A7%E5%88%B6%E6%B5%81&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTQxMzE0MDMsInEiOiLmjqfliLbmtYEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyNzkyMDM3NzAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.cS37O5sO_ykfbSQS2JrCEsW_ayr6hC9oXPzavIl4Vfw&zhida_source=entity)写在图的结构里，Agent 模式把控制流交给模型，把确定性做进运行时。** Eino 和 LangGraph 里，每一条边都是开发者的预判；Pi 里没有边，只有一个循环加两个队列，模型说要干什么就干什么，引擎负责的是让这个过程可观测、可插话、可持久化、出错不崩。

具体到设计层面，有两条我准备直接搬回自己项目里。

第一，loop 可以设计成多层级的。

最早的 ReAct 基本是单层 loop 的结构，而 Pi 拆成了 run 和 turn 两级，子 Agent 再嵌套一层完整的 loop。分层的原因很实际：不同粒度的问题，处理时机不一样——插话要在 turn 之间处理，追问要在 run 结束前处理，压缩要在 turn 开始前处理。单层 loop 里，这些逻辑会搅成一团。

第二，每一层 loop 的职责要单一。

Pi 的两层分工非常干净：

*   第一层（agent run）只提供**完整的任务边界**。它回答：这次用户请求是否已经真正结束？
*   第二层（turn）只提供**稳定的阶段事件**。让 UI、会话保存、扩展系统、自动压缩都能围绕稳定事件工作。

一层管边界，一层管节奏。职责切干净了，复杂度就不会跨层扩散。

以上是我最近学习 Agent 引擎的一个小结，希望对你有启发。
