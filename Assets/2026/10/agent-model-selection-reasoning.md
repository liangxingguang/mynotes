# Agent - 模型选型与推理能力（4）（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2095469418528651019>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 20566 字符）

---

## 介绍

> 第 3 篇把 agent loop 写成了十几行的骨架，但循环里那个 `LLM()`一直是个待填的空位。本篇回答“往里填什么”：通用模型 vs 推理模型怎么选、只用提示词能买到多少“推理”、国内三家与本地/私有化怎么接。同时回收第 2 篇埋的伏笔——utility-based ≈ 按效用权衡：模型路由就是它在模型层的对应物。 
> 读完你能理解：为什么有的任务值得让模型“想很久”；`deepseek-flash`的思考模式（thinking 开关与 `reasoning_effort`档位）怎么选；**带工具的思维链回传规则**（不遵守会 400 的那个坑）；提示词层面怎么让模型“先规划、先反思”；以及 DeepSeek / 通义/ 智谱 / Ollama / vLLM 几个国内可落地选项怎么挑。 
> **“推理”不再是独立的模型名，而是同一模型上的“思维模式”**——`deepseek-flash`默认开启思考，用 `reasoning_effort`调深度。本篇按现状讲，细节以官方 docs 为准。

（这篇作用不大，可以忽略）

## 本篇要回答的问题

1.   **让模型“想很久”到底发生在哪、值不值？** 通用模型 vs 推理模型（reasoning model）：什么任务需要“想很久”？agent loop 里的 `LLM()` 默认该填哪一档？
2.   本系列主线 **DeepSeek 怎么接**？thinking 开关与 `reasoning_effort` 档位怎么用？
3.   **带工具的思维链回传规则**是什么？（不遵守会 400 的那个坑）
4.   不换模型、不涨预算，只改提示词——怎么“教”模型 **先规划、再动手、后反思**？
5.   国内落地选项怎么选：**在线（DeepSeek/通义/智谱）vs 本地（Ollama）vs 私有化（vLLM）**？同一道题在不同模型与思考档位下实测，质量、时延、token 成本各差多少？

## 1｜“想”与“不想”：同一模型的两态 （不太重要）

### 1.1 新名词 reasoning model：先打草稿再作答的解题者

大白话先行：**通用模型是熟练执行者，听到问题张口就答；推理模型（reasoning model）是先打草稿再作答的解题者**——正式回答之前，先在草稿纸上把推理过程写一遍，写完才誊到答卷上。

```
通用模型（非思考模式）             推理模型（思考模式）
user: "9.11 和 9.8 哪个大？"       user: "9.11 和 9.8 哪个大？"
        │                                │
        ▼                                ▼
   直接输出最终答案                [草稿区] 思维链 reasoning_content
   "9.11 > 9.8"（小数位比错）      "9.11 小数部分是 0.11，
                                    9.8 小数部分是 0.8，
                                    0.8 > 0.11，所以……"
                                        │
                                        ▼
                                  正式答案 content："9.8 更大"（对）
```

准确定义与出处：DeepSeek 官方文档对思考模式（thinking mode）的表述——“在输出最终回答之前，模型会先输出一段思维链内容，以提升最终答案的准确性”（api-docs.deepseek.com 思考模式页）。这里的**思维链（chain-of-thought, CoT）**就是那张“草稿纸”：模型在给出 `content`（正式答案）之前生成的一段推理文本，通过响应里与 `content` 同级的 `reasoning_content` 字段返回。行业里这类模型常称 reasoning model / thinking model；发展脉络上，OpenAI 的 o 系列开创了这一形态，DeepSeek-R1（2025-01-20 发布，官方 News 可查）把它带进了开源阵营。

关键认识：**“通用 vs 推理”不是两种不同的产品品类，而是同一类模型上“思考开关”的两种状态**——这一点在 2026 年的 API 形态里已经制度化。本系列后文提到“推理模型”时，指的都是“思考模式开启时的那一档”，不特指某个独立模型。

### 1.2 版本考据：从“两个模型名”到“一个 thinking 开关”

*   现行模型清单只有两个：**`deepseek-flash`**（模型版本 DeepSeek-V4.1-Flash）与 **`deepseek-v4-pro`**（DeepSeek-V4-Pro-0813）；官方模型 & 价格页写明两者均“支持非思考与思考模式（默认）”。
*   于是“通用 vs 推理”从“选哪个模型名”变成了“同一个模型的 thinking 开关开不开、开多大”。

这件事值得停在半分钟，因为它就是 agent 工程的三条经验：

1.   **模型名是易变接口**——把“模型名 + base_url + key”收敛到代码里唯一的一个配置点（第 6 篇会专门这么做），别散落在各处调用里；
2.   **概念比名字稳定**——“非思考 = 快/省、思考 = 慢/强”的分界没有变，变的只是入口形态；
3.   **接任何供应商前先看它的模型清单页与 changelog**——不要拿技术博客里的旧模型名直接上线。

顺带一提，“一个模型两档”并非唯一形态：Qwen 官方文档（qwen.readthedocs.io，2026-10-15 实测）里 Qwen3 系列至今保持 Instruct（仅非思考）/ Thinking（仅思考）两条线。两种形态在 2026 年都是主流，接入时看文档确认你面对的是哪一种。

### 1.3 两态对比：同一模型，开/关 thinking 差在哪

| 维度 | 非思考档（thinking 关 / 通用） | 思考档（thinking 开 / 推理） |
| --- | --- | --- |
| 类比 | 熟练执行者：张口就答 | 先打草稿的解题者：想好再答 |
| 答题方式 | 看到问题直接顺着生成 | 回答前先内部长思维链推演一遍 |
| 响应时延 | 低（秒级） | 高（先“想”，思维链可长达数十秒） |
| token 成本 | 只有答案 | 思维链也是输出 token，难题上常达答案的数倍 |
| 强项 | 直接问答、格式转换、单次工具调用、信息提取、改写、高频轻任务 | 多步数学/逻辑、易错陷阱题、复杂规划、代码推理、多跳逻辑、“要自查的”复杂任务 |
| 弱项 | 多步推理容易抄近道出错（跳步/幻觉） | 慢且贵；简单任务上“用力过猛”，偶尔过度复杂化 |
| 什么时候不选它 | 答错代价高、路径多步时 | 简单高频调用——每轮循环都思考会烧穿预算 |
| 本系列默认 | agent loop 里的普通调用 | 关键“难调用”单独切换（见 §4.4） |

后端类比收个尾：非思考档像不写单测直接提交的资深工程师——大多数时候又快又对；思考档像先写测试再动手的工程师——慢一点，但难题上稳得多。

**“想很久”对应什么**：思考模式是在“真正回答”之前，先产出大量中间推理（响应里的 `reasoning_content` 字段）——相当于把第 2 篇 goal-based 的“规划”也放进模型内部做预演。对需要严格步骤的任务（数学、多跳逻辑、条件多的规划），这一步很值；对“给我摘句重点”这种任务，就是纯浪费。

判定口诀：**先问“答错的代价大不大”，再问“解题路径是否多步”**。两问都是“是”，开思考；都是“否”，别开；介于中间，用第 4 节的实测脚本来定——这正是本篇把你送到终端的原因。

### 1.4 现行 API 长什么样：thinking 开关与 reasoning_effort

DeepSeek API Reference 的关键参数（2026-10-15 实测，中文站）：

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| model | deepseek-flash / deepseek-v4-pro | 现行两款模型（API Reference 原文：“请使用 deepseek-flash 或 deepseek-v4-pro”） |
| thinking | {"type": "enabled" / "disabled"} | 思考开关，默认 enabled（默认强度 high） |
| reasoning_effort | none / low / high / max | none 关闭思考；low/high/max 开启并控制强度，默认 high；兼容映射：minimal→low、medium/xhigh→high。早期资料可能只列 low/high/max，以官方 Thinking Mode 页为准 |
| max_tokens | 1 ~ 393216（384K） | 不设时：非思考默认 8K、思考默认 64K、effort=max 时 128K |

最小调用（OpenAI SDK，与官方示例同构）：

```
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",        # OpenAI 兼容（OpenAI-compatible）
)
resp = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "9.11 和 9.8 哪个大？"}],
    reasoning_effort="high",                       # 思考强度（不传即默认 high）
    extra_body={"thinking": {"type": "enabled"}},  # 思考开关（不传即默认开启）
)
print(resp.choices[0].message.reasoning_content)   # 思维链（草稿）
print(resp.choices[0].message.content)             # 正式答案
print(resp.usage.completion_tokens_details.reasoning_tokens)  # 思维链 token 数
```

简单任务关掉 thinking——快且省：

```
resp = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "把这句话改成更礼貌的说法：今天不行。"}],
    extra_body={"thinking": {"type": "disabled"}},
)
```

![Image 1](https://pic4.zhimg.com/v2-99243faaeca22cc9c54445f3bcc99165_1440w.jpg)

```
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",  # DeepSeek 官方 OpenAI 兼容端点
)
resp = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "9.11 和 9.8 哪个大？"}],
    reasoning_effort="high",                       # 思考强度（不传即默认 high）
    extra_body={"thinking": {"type": "enabled"}},  # 思考开关（不传即默认开启）
)

print(resp.choices[0].message.reasoning_content)   # 思维链（草稿）
print(resp.choices[0].message.content)             # 正式答案
print(resp.usage.completion_tokens_details.reasoning_tokens)  # 思维链 token 数
```

![Image 2](https://picx.zhimg.com/v2-7183f3edb6b11bf8e2a5a5566f111e19_1440w.jpg)

```
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",  # DeepSeek 官方 OpenAI 兼容端点
)
resp = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "把这句话改成更礼貌的说法：今天不行。"}],
    extra_body={"thinking": {"type": "disabled"}},  # 关闭思考
)

# 关闭思考时响应里没有该字段，属性不存在，只能用 getattr 兜底
print(getattr(resp.choices[0].message, "reasoning_content", None))  # 思维链（应为 None）
print(resp.choices[0].message.content)                                # 正式答案
details = getattr(resp.usage, "completion_tokens_details", None)
print(getattr(details, "reasoning_tokens", None))                     # 思维链 token 数（应为 0 或 None）
```

档位怎么选？官方在 V4-Pro 更新公告里的原话（2026-10-15 实测）：“use low for simple tasks, high for daily Agent tasks, and max for more complex scenarios”——**low 给简单任务、high 给日常 Agent 任务、max 给更复杂的场景**。

思考模式还有三个参数约束，官方文档明说，全是坑：

*   `temperature` / `presence_penalty` / `frequency_penalty` 在思考模式**不支持**——为了兼容不报错，但**静默无效**（调参看似生效实则没变，最阴的一种 bug）；
*   `top_p` 只在思考模式生效且范围收窄到 0.95–1.0，低于 0.95 的值按 0.95 处理；非思考模式固定 1.0；
*   思维链也是输出 token——响应 `usage` 里 `completion_tokens_details.reasoning_tokens` 单列思维链消耗，算成本时别漏（第 4 节展开）。

> 顺带一句：DeepSeek 还提供 **Anthropic 格式端点**（`base_url`换 `https://api.deepseek.com/anthropic`）——同一把 key，`anthropic`SDK 也能直连 DeepSeek（第 6 篇细讲；以官方 docs 为准）。

### 1.5 什么任务需要“想很久”：开/关决策表

| 任务信号 | 建议 | 理由 |
| --- | --- | --- |
| 聊天、闲聊、摘要、信息提取、一步工具能完成 | 关（thinking: disabled 或 reasoning_effort: none） | 快、便宜，“想”是纯浪费 |
| 目标明确的多步任务、常规闭环 | 默认（开，high） | 少点掉进“想当然” |
| 工具调用链条长、第 n 步的结果会改变第 n+1 步怎么做 | 开，high 起步 | 重规划更稳 |
| 复杂诊断 / 跨表排查类（量产级） | 考虑 deepseek-v4-pro | 模型更强，第 20 篇路由表 |

> 档位说明：`reasoning_effort`现行取 `none / low / high / max`（thinking 默认开启、默认 `high`；请求值到实际档位还有一层官方映射表，细节以官方 Thinking Mode 页为准）。 
> 进阶形态（第 20 篇才讲）：**模型路由**——按任务复杂度自动分发到不同档位/模型。本篇只讲“同一任务该开多深”，路由是做出来之后的自动分发。

### 1.6 agent loop 里开 thinking：三处必须改的代码

第 3 篇的循环在阶段②调 LLM 时如果带上 thinking，有三件事要动（每一条都是官方文档明说的行为）：

**一、思维链回传规则——不回传直接 400。** 这是本节最重要的一条。官方原文（思考模式页，2026-10-15 实测）：

> 携带了 tools 参数的请求，在后续所有请求中，必须完整回传 reasoning_content 给 API——即使该轮模型未实际进行工具调用。若您的代码中未正确回传 reasoning_content，API 会返回 400 报错。

具体分两种情况：

*   请求**带 `tools` 参数**（agent loop 正是这种）：历史轮次的 `reasoning_content` 必须全部回传，并会被拼接进上下文。第 3 篇的阶段⑤“回填 assistant 消息”因此要带上思维链字段——官方给的回填写法：

```
messages.append({
    'role': 'assistant',
    'content': response.choices[0].message.content,
    'reasoning_content': response.choices[0].message.reasoning_content,
    'tool_calls': response.choices[0].message.tool_calls,
})
```

也可以一行搞定：`messages.append(response.choices[0].message)`——整个 message 对象（含 `content` / `reasoning_content` / `tool_calls`）原样入库，回传天然正确。第 7 篇的 loop 正是这么写的（`messages.append(msg)`）。

*   请求**不带 `tools`**（普通多轮对话）：`reasoning_content` 无需回传，即使传了也会被忽略、不拼接进上下文。

规则读两遍才能品出味道：**思维链在“带工具的循环”里是上下文的一部分（必须传），在“纯对话”里是一次性的（不用传）**。第 7 篇手写 agent 时，这条要直接写进回填逻辑。

**二、思维链要过 token 预算。** 第 3 篇说过“阶段②每轮全量重发 messages”、token 预算是内存——思考模式下“想”本身也在产 token 且按输出价计费。多轮 agent 里它是按轮累加的，循环里要监控 `reasoning_tokens`，别让“想”把预算想穿。

**三、默认输出上限放大了。**`max_tokens` 不设时非思考 8K、思考 64K、effort=max 时 128K——单轮能产出的 token 上限变了，“一轮跑飞”的代价上限也跟着变，第 3 篇第 4 节那四类终止条件里的预算熔断更要设。

最后回收第 2 篇的伏笔：为什么模型层会出现“按调用选档”的需求？因为 utility-based agent 的本质就是多目标权衡——质量、时延、成本三者加权，为每次调用选最优解。这个“为每次调用选档”的机制叫模型路由（model routing），第 4 节正式定义，P7·20 落地。

> 心态提醒：**思考模式不是“更聪明”，是把速度换成思考量**。用对它才划算，用错了就是又慢又贵。这正是本篇动手实验要你亲自量一遍的账。

## 2｜提示策略：先用 prompt 买到“半个推理”

读完本节你能理解：不换模型、不加预算，两句指令能让通用模型在工具调用前先规划、答完先自查——以及 prompt 版推理和真 thinking 档的边界在哪。

### 2.1 显式规划：工具使用前先列计划

解决什么问题：第 3 篇的 loop 是“模型说调就调”。通用模型有个常见毛病叫**抢跑**——用户问“把张三换成 admin 角色”，模型不先查张三存不存在、不查他现在是什么角色，直接把“分配角色”这个写操作调了出去。工具越多，抢跑越离谱。

最小可抄片段（放进 system 消息即可）：

```
【规划前置】
在调用任何工具之前，先用 1-3 句话说明：
1) 你需要哪些信息；2) 打算按什么顺序调用哪些工具；3) 什么情况下停止。
计划说完，再发起第一个工具调用。
```

（片段为通用写法，`<未实测，以官方文档为准>`；效果因模型而异，动手实践里给了 `--plan` 开关，可以自己量。）

注意它和 thinking 档的区别：thinking 的“草稿”是模型自发的、你看得到但控制不了结构；这个指令产出的计划是**你要求的、有固定结构（信息/顺序/停止条件）的**，因此可以被程序校验——这正是 P4·12 从“隐式规划”走向“显式规划”的入口。

为什么这有用（条条都能对应第 2 篇的坐标系）：

*   **规划前置** = 逼模型先“走一遍脑子里的路线图”再动手 → 减少瞎调工具、工具顺序颠倒；对齐的正是 goal-based（第 2 篇）和 agent loop 里“第 ② 步决策”（第 3 篇）。
*   **反思收尾** = 让模型检查自己的产出 → 提前发现“答非所问”，相当于把 utility-based 的“自查”写进 prompt。

### 2.2 反思：答完先自查一遍

解决什么问题：模型抄近道出错后并不会自己发现——除非你让它检查。反射（reflection）的基础写法就是在最终答复前强制一轮自查。

最小可抄片段（放在 system 消息，或工具结果回填后追加一条 user 消息）：

```
【反思收尾】
给出最终答复之前，逐项检查：
1) 工具返回里有没有与你的结论矛盾的数值；
2) 你引用的 ID、名称是否原样来自工具结果（而不是你补全或编造的）；
3) 若有矛盾：先修正，再给最终答复。
任务完成后，回顾你的执行过程：结果是否满足用户的真实意图？有没有绕路/多余操作？如有需要修正，说明理由。
```

第 2 条针对的是 agent 的经典事故：模型**幻觉调用 / 编造结果**（第 7 篇会逐个演示这类踩坑）。让“引用必须来自工具结果”成为显式指令，是最便宜的一道护栏。

代价要算清（第 12 篇会放大这个账）：

*   这两段文字会让每轮多花 **上百 token**，且模型会真的输出一段计划/反思文本；
*   简单任务（“现在几点”）套上这套 prompt 就是纯浪费——**小任务别穿盔甲**；
*   它的本质是“**提示词级别的隐性规划**”。P4·12 会把它升级成“显式计划数据结构 + 计划校验、执行中重规划”——到时候你会看到，显式数据结构能接住“计划被工具结果推翻”的情况，光靠 prompt 文字接不住。

### 2.3 prompt 版 vs thinking 档 vs 显式规划模块：边界

| 手段 | 额外成本 | 何时够用 | 何时不够 |
| --- | --- | --- | --- |
| 规划/反思指令（本节） | 零额外模型调用，多几十 token | 抢跑、漏自查这类“低级失误” | 复杂多步任务——指令写不动“计划变了怎么办” |
| thinking 档（§1） | 思维链 token（可观且按轮累加） | 数学/逻辑/复杂推理，模型自发规划 | 需要人读、人改、可校验的显式计划；预算敏感的高频调用 |
| 显式规划模块（Plan-and-Execute） | 多一次“出计划”的模型调用 | 复杂多步任务：计划要校验、执行中可重规划 | 简单任务——规划本身帮倒忙（P4·12 专门讲这条边界） |

三者不是三选一，而是叠加关系：**显式指令最便宜，先加；难题单独开 thinking；真正复杂的任务才上结构化规划**。本节的两个片段就是 P4·12 规划篇的最简雏形——届时它们会被升级为“可校验、可重规划、可回滚”的结构化计划，本篇只立地基。

## 3｜国内落地：云上三家、本地 Ollama、私有化 vLLM

读完本节你能理解：为什么“换供应商”通常只改两三个字符串、三家国产的接入差异、以及本地开发基线与生产私有化的分工。

### 3.1 新名词 OpenAI-compatible 与 base_url

大白话：**OpenAI 兼容（OpenAI-compatible）= 大家都把自家 API 伪装成 OpenAI 的样子**——同一份 SDK 代码，改两个字符串（base_url 和 model）就能换供应商；**base_url = 你的请求实际打到哪个服务地址**（OpenAI 官方默认是 `https://api.openai.com/v1`，兼容供应商各自给出自己的地址）。

定义与出处：DeepSeek 官方首次调用页原文（2026-10-15 实测）——“The DeepSeek API uses an API format compatible with OpenAI/Anthropic. By modifying the configuration, you can use the OpenAI/Anthropic SDK or softwares compatible with the OpenAI/Anthropic API to access the DeepSeek API.”。2026 年的现状是：国产三家（DeepSeek / 通义 / 智谱）加本地推理引擎（Ollama / vLLM）都提供 OpenAI 兼容端点，第 1 篇动手实践里你已经用 OpenAI SDK + DeepSeek 的 base_url 触发过一次 tool call——用的就是这个兼容层。

于是“供应商可插拔”成了默认能力：你的 agent 代码里真正绑死供应商的，只剩 base_url、model、api_key 三个字符串。这也是整个行业能自由做“模型路由”（第 4 节）的前提。

换供应商 = 改三个字符串（base_url / model / api_key），但有一条要划重点：**“兼容”是子集，不是全集**。智谱官方原话：“某些场景下智谱与 OpenAI 接口仍存在差异，但不影响整体兼容性”（OpenAI API 兼容页，2026-10-15 实测）；Ollama 也自称 “Ollama supports a subset of the OpenAI API”。实践上：跨供应商迁移后，把工具调用、思考开关这些关键路径手工回归一遍——P7·18 的评测集就是给这种回归准备的。

### 3.2 三家接入对照（2026-10-15 核验）

|  | DeepSeek | 阿里云百炼（通义/Qwen） | 智谱（GLM） |
| --- | --- | --- | --- |
| base_url | https://api.deepseek.com | <以官方 docs 为准>（百炼控制台 OpenAI 兼容页） | https://open.bigmodel.cn/api/pa as/v4/ |
| 现行模型名 | deepseek-flash / deepseek-v4-pro | Qwen 系列（商业名 qwen-plus 等 + 开源 Qwen3-Instruct/Thinking-2507 线）<以官方 docs 为准> | glm-5.3 / glm-5.3-flash / glm-5.2 |
| 推理形态 | 单模型 thinking 开关 + reasoning_effort（none/low/high/max） | Qwen3 系分 Instruct（仅非思考）/ Thinking（仅思考）两条线 | 思考模式（官方“思考模式”专页；文档明言 GLM-5.2 思考模式可解复杂推理） |
| 上下文窗口 | 1M（输出最大 384K） | <以官方 docs 为准> | GLM-5.3 系列 1M / 最大输出 128K |
| 特色端点 | Anthropic 兼容：https://api.deepseek.com/anthro pic | OpenAI 兼容（本系列规格 2026-10-15 核验清单收录） | 另有 Claude API 兼容、Responses API 兼容专页 |

表格里的诚实说明：通义一列的 base_url 与模型名，因阿里云帮助中心页面为动态渲染、本环境抓不到正文，具体值一律标 `<以官方 docs 为准>`（接口“OpenAI 兼容”这一形态由本系列规格的 2026-10-15 核验清单与 Qwen 官方文档背书）；其余两列均为今日逐字实测。

简版选型可以先记这张表：

| 方案 | 形态 | 优点 | 什么时候用 |
| --- | --- | --- | --- |
| DeepSeek（默认主线） | 云，OpenAI 兼容 | 便宜、快、中文好、一站式 | 学习与日常主线直接用 |
| 通义 Qwen（阿里云 Model Studio） | 云，OpenAI 兼容 | 通义千问系列，国产云原生 | 已有阿里云账号 / 团队标准时 |
| 智谱 GLM（开放平台） | 云，OpenAI 兼容 | GLM 系列，开放平台友好 | 想对比国产多厂家时备选 |
| Ollama（本地） | 本机跑小模型 | 免费、离线、数据不出本地 | 隐私敏感 / 没网 / 想省 token |
| vLLM（私有化） | 自有服务器托管大模型 | 完全自控、可上业务 | 团队级私有化部署时才需要考虑 |
| Claude（有条件选做） | 云 | 模型能力强 | 需要网络环境额外可用时才做对比 |

关键认知：**上面所有这些都走 OpenAI 兼容接口**——换供应商 = 改 `base_url` + key + 模型名，代码结构一字不用动。但记得上一段的“兼容是子集”：关键路径要回归。

### 3.3 Ollama：本地开发基线

大白话：**Ollama 之于开源模型，约等于 Docker 之于应用**——一条命令把模型拉到本机跑起来，并暴露一个 OpenAI 兼容端口。

*   定位（官方原话，docs.ollama.com / ollama.com，2026-10-15 实测）：“Run AI models locally and in the cloud”；API 文档明言其 OpenAI 兼容是“supports a subset of the OpenAI API”。
*   本地 OpenAI 兼容端点：`http://localhost:11434/v1`（另提供云 API `https://ollama.com/v1`，配 `OLLAMA_API_KEY`）。
*   本篇实验选 `qwen3:4b`：下载体积 2.5GB；同系列 0.6b/523MB、1.7b/1.4GB、8b/5.2GB、14b/9.3GB（ollama.com/library/qwen3 tags 页，2026-10-15 实测），按显存选。

为什么 agent 开发者要留一个本地基线：**零 token 费、无网络依赖、全量日志可见**——调 prompt 结构、验证 loop 逻辑、复现死循环时，不必烧云端配额也不必依赖网络。代价是能力天花板：4b/8b 级小模型的质量结论**不能外推**到云端旗舰模型（这正是动手实践要你两边各跑一遍的原因）。

本地（Ollama）的取舍要诚实讲：

*   优点：免费、离线、隐私好——**但代价是模型小**（本地能跑的是小参数量蒸馏版，质量和云端 DeepSeek 差距明显）；
*   结论：**学习主线用云端 DeepSeek，Ollama 只做“离线对比/隐私场景”备用**；别让“本地化”变成“省事却变笨”。开发期更推荐“**云上旗舰 + 本地基线**”双轨——同一任务两边都跑，既知道质量上限长什么样，又能在断网或省预算时继续干活。

### 3.4 vLLM：生产私有化的推理引擎

大白话：**vLLM 是“把开源模型变成能扛并发的高性能 API 服务”的自托管引擎**——Ollama 面向个人开发机，vLLM 面向服务器与集群。

*   定位（docs.vllm.ai，2026-10-15 实测）：LLM 推理与服务引擎，自带 OpenAI 兼容 API Server；官方示例目录直接覆盖 agent 关心的场景——OpenAI Chat Completion Client With Tools、OpenAI Chat Completion With Reasoning 等。
*   它的主战场是吞吐与并发：连续批处理（continuous batching）、量化、多卡并行都是内置能力；代价是你要自己管 GPU、驱动、版本、扩缩容与监控——这是一笔持续的人力成本，不是一次性安装。

### 3.5 形态选型表：云 API vs Ollama vs vLLM

| 维度 | 云 API（DeepSeek/百炼/智谱） | Ollama（本地） | vLLM（私有化） |
| --- | --- | --- | --- |
| 上手成本 | 注册拿 key，分钟级 | 装客户端 + 拉模型，分钟级 | GPU 服务器 + 部署运维，天级 |
| 单位成本 | 按 token 计费（本篇实验估算 < 0.1 元） | 免费（消耗本机算力/显存） | 硬件 + 人力摊销 |
| 能力上限 | 旗舰大模型 | 受本机显存限制（个位数 b 级） | 可跑大参数开源模型（视 GPU） |
| 数据出域 | 出域（靠合同与脱敏控制） | 不出域 | 不出域 |
| 并发与弹性 | 供应商扛（限速另算） | 单机 | 自己扛（K8s/批调度/扩缩容） |
| 适合 | 学习、原型、多数生产默认 | 本地开发调试基线、离线演示 | 数据严格不出域、大并发、用量到规模的团队 |
| 什么时候不选它 | 合规要求数据不出域 / 无外网环境 | 质量敏感的任务（小模型弱） | 没有专职运维 / 用量撑不起硬件 |

经验法则：开发期走“**云上旗舰 + 本地基线**”双轨；上生产按数据合规与并发要求在三条路里选，选型全景（含框架对供应商的适配）第 5 篇继续。

读完本节你能理解：模型路由是什么、“想很久”的真实代价怎么从价格表和 usage 字段里读出来、以及本篇给第 7 篇手写 agent 留下的三条默认。

### 4.1 新名词 model routing：网关按请求特征分流

大白话：**模型路由（model routing）= 网关按请求特征分流**——简单请求走便宜快的，难题走强而贵的。

```
用户请求 ──► [路由层] ──按特征分流──► 非思考档（快/省）  ← 大多数调用
                │                        思考档（慢/强）  ← 难题/规划/失败重试
                │                        其他模型/供应商    ← 降级或专项
                └─ 分流依据：难度预估 / 风险等级 / 时延要求 / 剩余预算
```

定义：模型路由是按任务特征（难度、风险、预算、时延要求）把每次模型调用分配到不同模型或档位的机制。第 2 篇的伏笔在此回收：这就是 utility-based agent“多目标权衡”在模型层的形态——效用函数此刻显形为“质量 × 时延 × 成本”的加权。最简形态是一张静态规则表（如：循环内普通调用→非思考档，首次规划/失败重试→思考档）；进阶形态用小模型给请求打分再分流。本篇只立概念，完整实现（预算控制、降级链、路由评测）在 P7·20。

### 4.2 DeepSeek 的价格结构与“想”的真实代价

官方定价页（人民币计价，单位：元/百万 tokens；2026-10-15 实测，价格随官方调整变动，**以官方定价页为准**）：

|  | deepseek-flash | deepseek-v4-pro |
| --- | --- | --- |
| 输入（缓存命中） | 0.02（空闲）/ 0.04（高峰） | 0.15 / 0.30 |
| 输入（缓存未命中） | 1 / 2 | 4.5 / 9.0 |
| 输出 | 4 / 8 | 13.5 / 27.0 |

高峰时段的定义（官方原文）：北京时间周一至周五 9:00–12:00、14:00–18:00（不含中国法定节假日）；其余时段（含周末与节假日）为空闲时段，价格为高峰的一半。

三条 agent 相关的读法：

1.   **缓存命中价约为未命中的 1/50**（flash：0.02 vs 1；pro：0.15 vs 4.5，约 1/30）。第 3 篇“每轮全量重发 messages”的成本焦虑被**上下文缓存（context caching）**大幅缓解：请求前缀中不变的部分（system、工具清单、早期历史）按命中价计，响应里 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` 分列可查。
2.   **“想”就是输出 token**。思维链按输出价计费——思考档与通用档的价差不是“一倍”，而是（答案 token + 思维链 token）对（答案 token）之比；难题上思维链常常数倍于答案。
3.   **粗算例**（量级演示，非实测）：一次 1K 输入 + 500 输出的非思考调用，按 flash 空闲价 ≈ (1000/1M × 1) + (500/1M × 4) ≈ 0.003 元；同一调用若思考产生 3000 token 思维链 ≈ 0.015 元。单次几乎无感，乘上“每用户每天几百次”就是选型问题。

### 4.3 时延：agent 体感里最被低估的变量

工具型 agent 的总时延 = Σ(每轮模型时延) + Σ(工具耗时)。非思考档首字秒级；思考档一轮可能数十秒——如果循环里每一轮都“想很久”，一个 5 轮的任务会拖成几分钟。这正是官方档位建议把 high 留给“日常 Agent 任务”中的关键调用、low/max 各管两端的原因，也是模型路由存在的理由。

工程上的配套动作是第 3 篇的事件流：思考期间向前端广播“正在思考”（甚至流式转发思维链摘要），而不是让用户面对黑屏——Claude Code 把“思考中”透出来给用户看，就是这个道理。

### 4.4 本篇收束：LLM() 的默认填法

给第 7 篇手写 agent 定三条默认（都可用本篇实验推翻后改掉）：

1.   **循环内普通调用：非思考档**——快、省，绝大多数轮次够用；
2.   **system 消息里放 §2 的规划 + 反思指令**——零成本的“半个推理”；
3.   **可验证的难题类调用（数学/规划/失败重试）单独切思考档**——这就是一个最小模型路由：一张两行的规则表。

## 本篇结论

1.   **“想”是开关不是模型**：agent loop 里的 `LLM()` 默认填**非思考档**；2026 年它已不是独立模型名，而是同一模型的 thinking 开关（DeepSeek 现行 `deepseek-flash` / `deepseek-v4-pro`，`thinking` + `reasoning_effort: none/low/high/max`；`deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 停用）。多步/需要自查的任务才划算，闲聊摘要关掉它。
2.   **三件工程事**：① 带 `tools` 时历史 `reasoning_content` 必须完整回传（否则 400；官方一行 `messages.append(response.choices[0].message)` 或字典回填解决）；② 思考模式下 `temperature` 等采样参数静默无效、`top_p` 受限（0.95–1.0，非思考固定 1.0）；③ 思维链按输出 token 计费，且 `max_tokens` 默认上限放大（非思考 8K、思考 64K、effort=max 128K）。
3.   **提示策略**：system prompt 里的“规划前置 + 反思收尾”是零成本提质的起点，但它是 prompt 级隐性规划——显式计划数据结构、计划校验与执行中重规划要等 P4·12。
4.   **国内落地**：全系列走 OpenAI 兼容，换供应商只改 base_url + key + 模型名；但“兼容是子集”，关键路径要回归。云端 DeepSeek 为主，Ollama 做离线备用/本地基线，vLLM 留给业务私有化；选型可插拔也是模型路由的前提。
5.   **成本与时延**：模型路由就是 utility-based 在模型层的形态——按质量、时延、成本加权分流；最简形态是一张两行规则表：普通调用非思考档，首次规划/失败重试切思考档。

## 参考

1.   DeepSeek API Docs — 首次调用 API（Your First API Call） — base_url（OpenAI 格式 `https://api.deepseek.com`、Anthropic 格式 `https://api.deepseek.com/anthropic`）、“API format compatible with OpenAI/Anthropic” 原文、OpenAI SDK 最小调用示例。2026-10-15 curl 实测。
2.   DeepSeek API Docs — 模型 & 价格（Models & Pricing） — 现行模型清单（`deepseek-flash` = DeepSeek-V4.1-Flash / `deepseek-v4-pro` = DeepSeek-V4-Pro-0813）、思考模式“支持非思考与思考（默认）”、上下文 1M / 输出最大 384K、人民币价格表与高峰时段定义、旧模型名兼容说明。2026-10-15 curl 实测。
3.   DeepSeek API Docs — 思考模式（Thinking Mode） — 思维链 `reasoning_content` 定义、`reasoning_effort`（none/low/high/max）与默认值、temperature 等参数静默失效、top_p 0.95–1.0、**带 tools 请求必须完整回传 reasoning_content 否则 400**、思考模式下工具调用官方示例。2026-10-15 curl 实测。
4.   DeepSeek API Docs — API Reference（create-chat-completion，中文） — `thinking` / `reasoning_effort` / `max_tokens`（非思考 8K、思考 64K、max 档 128K）默认值、`finish_reason` 取值、`usage.completion_tokens_details.reasoning_tokens` 与 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` 字段。2026-10-15 curl 实测。
5.   DeepSeek API Docs — News/更新日志 — `deepseek-chat` / `deepseek-reasoner` 于 2026-07-24 停用的公告原文、V4-Pro/V4-Flash 三档 effort 官方使用建议（“low for simple tasks, high for daily Agent tasks, max for more complex scenarios”）。2026-10-15 curl 实测。
6.   智谱开放平台文档 — OpenAI API 兼容 / 模型概览 — base_url `https://open.bigmodel.cn/api/paas/v4/`、模型名 `glm-5.3` / `glm-5.3-flash` / `glm-5.2`、“某些场景仍存在差异”兼容性声明、GLM-5.3 系列 1M 上下文。2026-10-15 curl 实测。
7.   Ollama 官方文档 — OpenAI compatibility / Ollama 官网 — “Run AI models locally and in the cloud” 定位、“supports a subset of the OpenAI API”、本地端点 `http://localhost:11434/v1`、云 API `https://ollama.com/v1`。2026-10-15 curl 实测。
8.   Ollama Library — qwen3 tags — `qwen3:0.6b`(523MB) / `1.7b`(1.4GB) / `4b`(2.5GB) / `8b`(5.2GB) / `14b`(9.3GB) 体积。2026-10-15 curl 实测。
9.   vLLM 官方文档 — LLM 推理与服务引擎定位、OpenAI 兼容 API Server、工具调用与思考输出的官方示例目录。2026-10-15 curl 实测。
10.   阿里云百炼 Model Studio（OpenAI 兼容接入，本系列规格 2026-10-15 核验清单收录 ✅；其帮助中心页面为动态渲染，本环境未能逐字抓取，base_url 与模型名 `<以官方 docs 为准>`）+ Qwen 官方文档 Quickstart — Qwen3-Instruct-2507（仅非思考）/ Qwen3-Thinking-2507（仅思考）两条线的官方表述。2026-10-15 curl 实测（Qwen 文档部分）。
11.   Anthropic Claude API 文档 — 有条件选做小节的模型 ID `claude-opus-5-5` 与最小调用形态引自 claude-api 官方参考（口径 2026-10-06），价格与模型清单以官方页为准。

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
