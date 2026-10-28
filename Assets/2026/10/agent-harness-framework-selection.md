# Agent - harness 框架怎么选（5）（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2095515233271951377>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 13534 字符）

---

​

目录

## 介绍

> 面向需求：写一个现代 harness 用来维护既有系统（比如调用你现有的后台 API），要**能接不同大模型、能用上多 agent / 多 skill / 多种运行模式、功能全面、封装好、能上生产**。 
> 本篇把选型直接给出结论：选什么、为什么选它、为什么不选别的；不铺全景、不列没用的对比表。读者在外面会撞见的边缘候选，每个压到一句话带过，保证你读到任何一个名字都知道它是什么、为什么不在主线。

## 本篇要回答的问题

1.   你要的 "harness" 和"随便一个 agent 库"、和 LangGraph 到底差在哪？
2.   成熟方案（Claude Code / Codex / OpenHands / OpenClaw / DeepSeek Harness）的 harness 都由哪些部分组成？我选的框架覆盖全了吗？
3.   在 deepagents / Microsoft Agent Framework / DeepSeek Harness 之间，按**多模型 / 多 agent / 多 skill / 多模式**四个能力轴怎么打分？**首选为什么是 deepagents？**
4.   为什么不选 LangGraph / claude-agent-sdk / openai-agents / Google ADK / AWS Strands / CrewAI / 手写？pydantic-ai / smolagents / Pi / LlamaIndex 这些名字又是什么定位？
5.   动手：首选方案 + DeepSeek 的最小跑通长什么样？

如果只单独写一个agent, 可以由下面这些框架进行选择，但是现在基本是要包含harness 部分，所以这部分只做记录，后面还会出一套结合harness 可以在生产使用的，这里只是过一下。

| 候选 | 上手成本 | 可控性 | 生态 | MCP 支持 | 长期维护 | 什么时候不选它 |
| --- | --- | --- | --- | --- | --- | --- |
| 手写（openai SDK） | 低：1 个包，20 行起步 | 最高：每行都是你的 | = openai 生态本身 | 自接（Part 5 手做） | 自己担：六件套自建 | 团队要快速出活、工具多 Schema 手写烦 |
| pydantic-ai | 低：1 个包，11 行 | 高：loop 薄、能看能换 | pydantic/FastAPI 同构 | 内置（官方 MCP 文档） | pydantic 公司；需 Python ≥3.11 | Python 老旧；要图编排/多 agent 状态机 |
| openai-agents | 中低：1 个包，17 行 + tracing 概念 | 中：Runner 比手写多一层 | OpenAI 官方全家桶（guardrails/handoffs） | 内置（三种 MCP 接法） | OpenAI 官方维护 | 不在 OpenAI 生态内；模型高度异构 |
| claude-agent-sdk | 低起步但概念多：1 个包，12 行 | 低：harness 是黑盒 | Claude Code 工具链全套 | 内置（mcp_servers 配置） | Anthropic 官方维护 | 模型必须非 Claude（硬绑定）；要白盒 loop |
| langgraph | 中高：2 个包，15 行 + 图概念 | 高但表达贵：控制流=图 | LangChain 全家（集成包/MCP 适配/LangSmith） | 官方 langchain-mcp-adapters | LangChain 公司（LangSmith 商业化） | 单 agent 线性任务：杀鸡用牛刀 |
| deepagents | 低：2 个包，14 行 | 中低：默认件多，能替换但先学它的约定 | LangChain/LangSmith 全家 | 内置 + 任意 MCP server | LangChain 公司 | 想每行都懂；不想绑 LangChain 栈；单轮任务 |
| Google ADK | 中：1 个包 + 图/Workflow 概念 | 中高：代码优先，图可控 | Google/Gemini/GCP；多语言 | 内置（MCP tools） | Google 官方 | 不在 GCP 生态；小单 agent；Python 3.10 |
| Microsoft Agent Framework | 中高：1 个包 + 工作流/中间件概念 | 中高：图 + middleware 可插 | Azure/.NET/Foundry；AutoGen/SK 迁移 | 官方连接器（MCP 等） | Microsoft 官方 | 非 Azure/.NET；无迁移需求；只想轻单 agent |
| Strands Agents | 低：1 个包，15 行 | 中高：model-driven，hooks 可拦每一步 | AWS/Bedrock 最深 | 内置 | AWS 官方 | 不在 AWS；需要确定性图；社区尚小 |
| DeepSeek Harness | 低起步但概念多：SDK 12 行 | 中：插件可换，但运行时对你是半黑盒 | DeepSeek 原生 + 多 provider | 内置/插件 | DeepSeek 官方；developer preview | 需要稳定 API；不想带打包运行时；只要轻 loop |
| smolagents | 低：1 个包，13 行 | 高：核心约 1000 行，读得完 | Hugging Face Hub | 内置 + LangChain 工具 | Hugging Face | 生产编排；不能接受代码执行风险 |
| CrewAI | 低中：角色/任务抽象 | 中：高层抽象多，精细控制少 | CrewAI 生态/模板 | 内置 | CrewAI 公司 | 单 agent；需要精细控制 loop/上下文 |

## 1｜先对齐：harness ≠ 随便一个库 ≠ LangGraph

第 3 篇定义过 **harness（agent loop 的工程外壳）**：循环调度、工具注册、事件流、权限闸门、持久化、可观测这六件套。现代 agent 再细化为 **八件**（多了上下文管理、子 agent、MCP），公式是 **Model + Harness = Agent**——你缺的不是模型（第 4 篇已选好），是 harness。

三条硬话：

1.   **LangGraph 是图运行时，不是 harness**。它只给你"把控制流画成状态图"的执行引擎；工具、权限、会话、上下文管理这些 harness 件它一件都不打包，全要你自己组装。`deepagents` 就是 LangChain 家族在它上面**打包好的 harness**——这就是为什么你该在 deepagents / 微软 / DeepSeek 里选，而不是 LangGraph。
2.   **harness 的"装好就能用"程度是你的第一筛子**。给的零件越多、要你拼的越少，封装越好。
3.   **你的硬标准**（读后面打分表之前先对齐这六条，前四条就是 §2 的四个能力轴，后两条是"功能全面 + 生产可维护"）：

*   **多模型无关**：DeepSeek / OpenAI / Claude / 本地 Ollama 切换不是重写，只是换一个配置点；
*   **多 agent**：能拆子 agent、委派给隔离上下文的子任务，而不是所有事挤在一个循环里；
*   **多 skill**：能把复用能力（读文档、查后台、写审计……）打包成可命名的技能，按需加载；
*   **多种运行模式**：能适配不同场景——单轮问答 / 长任务执行 / 只读模式 / 写操作审批模式 / 极简跑基准，不要一套 loop 打天下；
*   **功能全面 + 封装好**：工具、上下文管理、记忆、权限/HITL、MCP、可观测都有，且一个入口建出完整 agent；
*   **生产可维护**：长任务能断点续、危险操作能审批、每次调用能 trace。

## 2｜成熟方案是怎么做的：harness 八件套 + 四个能力轴

Claude Code、Codex、Cursor、OpenHands、OpenClaw、DeepSeek Harness 形态各不相同，但**收敛到同一张"harness 件清单"**。你要选的框架至少得齐这八件：

| # | harness 件 | deepagents | MAF | DeepSeek Harness |
| --- | --- | --- | --- | --- |
| 1 | loop + 终止条件（有界不跑飞） | ✅ | ✅ | ✅ |
| 2 | 工具注册（签名→Schema，不手写 JSON） | ✅ | ✅ | ✅ |
| 3 | 权限 / HITL 审批 | ✅ | ✅ | ✅ |
| 4 | 会话 / 持久化 / 断点恢复 | ✅（LangGraph checkpointer） | ✅ | ✅ |
| 5 | 上下文管理（压缩/摘要） | ✅ | ✅ | ✅ |
| 6 | 子 agent | ✅ | ✅ | ✅ |
| 7 | MCP | ✅ | ✅ | ✅ |
| 8 | 可观测（trace/成本） | ✅（LangSmith） | ✅（OpenTelemetry） | ✅（遥测插件） |

再按你加的四条需求打分：

| 能力轴 | deepagents | Microsoft Agent Framework | DeepSeek Harness |
| --- | --- | --- | --- |
| 多模型 | ✅ 换 chat model 对象 1 处 | ✅ 多 provider（OpenAI/Anthropic/Google/Bedrock/Ollama + 兼容端点） | ✅ 多 provider（偏 DeepSeek 原生） |
| 多 agent | ✅ subagents= 内置 | ✅✅ teams / handoff / group 全套流程 | ✅ 子 agent（完整 profile；极简 profile 会裁掉） |
| 多 skill | ✅ skills= 内置 | ✅ Agent Skills 官方一等公民 | ✅ 技能/指令发现走插件 |
| 多种模式 | △ 不内置"模式"菜单，靠你组合（prompt + 工具集 + 子agent 变体） | △ declarative / process / hosted 等形态，偏企业运维 | ✅✅ 内置四种运行模式（标准 / PTC / 极简 / 创造） |

**读法**：八件套三家都齐；四种能力里 deepagents 靠"参数 + 你组合"补齐，MAF 靠"企业形态"补齐，**DeepSeek Harness 是在"多模式 + 插件化"上最极致的那个——但它付出的代价是 developer preview**。

## 3｜决策：选哪个

读这一张就够：

| 优先级 | 框架 | 为什么选 / 为什么不选 |
| --- | --- | --- |
| ✅ 首选 | deepagents（LangChain 官方） | 开箱即用 harness：create_deep_agent(...) 一个函数，默认带文件系统、子 agent、上下文管理、持久记忆、HITL 审批、skills、任意 MCP server，底层 LangGraph（checkpoint / 流式 / 持久化复用），LangSmith 自带 trace/eval。多模型：换一个 chat model 对象即可（DeepSeek 用 langchain-deepseek 的 ChatDeepSeek）。多 agent / 多 skill：subagents=、skills= 都是命名参数。模式：不内置"模式"菜单，但模式本来就是你组合出来的（只读模式 = 只挂查询工具；计划模式 = 先输出计划再执行；审批模式 = interrupt_on=）。生态最大、中文资料多、和你在学的 LangGraph 一脉相承。 |
| ✅ 备选 | Microsoft Agent Framework | 场景换成企业治理 / 多语言 / 强流程化时上它：teams / handoff / group 多 agent 流程、中间件、checkpoint、HITL、Agent Skills、OpenTelemetry，Python / .NET / Go 一套 API；多 provider 原生，DeepSeek 走 OpenAIChatCompletionClient + OPENAI_BASE_URL。代价：概念重（workflow / middleware / process），不绑 Azure 时配置自理。 |
| ⚠️ 暂不选 / 预研 | DeepSeek Harness | 它在"多模式 + 插件化 + 完整 harness 件"上其实是三家最全的——唯一拦路的是稳定性：developer preview，官方原话 "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"。什么时候选它：你主锁 DeepSeek、或等稳定版、或愿意为"官方完整运行时"吃 break 的坑（先 POC 再定）。此刻更适合当架构参考读（第 16 篇拆 harness 的素材）。 |
| ❌ 不选 | LangGraph（裸框架） | 图运行时，不是 harness——八件套全要自己拼。 |
| ❌ 不选 | claude-agent-sdk | 模型绑定 Claude，你的多模型需求直接排除它。 |
| ❌ 不选 | openai-agents | OpenAI 优先；接 DeepSeek 有一行行"适配税"（AsyncOpenAI + OpenAIChatCompletionsModel + 关 tracing），多模型不顺。 |
| ❌ 不选 | Google ADK / AWS Strands | 分别绑定 GCP、AWS；你不绑云，等于背一堆用不上的部署件。 |
| ❌ 不选 | CrewAI | 多 agent 角色编排好使，但不是"通用 harness"——角色/任务抽象偏业务剧本，模式/工具面不如 deepagents 直接。 |
| ❌ 不选 | 手写（生产） | 学习期必写（第 6-7 篇，看懂 loop 每一行）；生产期手写是把八件套全部重复造一遍——那是拆成熟 agent（第 16 篇）才轮得到的工程量。 |

**一句话决策规则**：

*   要**立刻稳定上生产 + 生态大 + 封装一个函数** → **deepagents**；
*   要**企业治理 + 多语言 + 流程化多 agent** → **Microsoft Agent Framework**；
*   要**多模式开箱即用 + 主锁 DeepSeek + 能接受 preview（先 POC）** → **DeepSeek Harness**。

**会撞见的其他名字，一句话带过**（不展开、不比较，知道"它是什么、为什么不在主线"即可）：

*   **pydantic-ai**：类型安全轻封装，11 行能跑，但持久化、权限、上下文压缩要自己补——单 agent 快速出活很好，不是"维护系统 harness"的答案。
*   **smolagents**：HF 极简库，核心约 1000 行，code-as-action，学习价值最高；没有生产级编排/治理，是"读得完的教材"，不是生产 harness。
*   **LangChain 链式 API（LCEL）**：2023-2024 年的主流姿势，官方已拆进 `langchain-classic` 并标 legacy（"Legacy chains… deprecated functionality" 是官方原话）；今天的 LangChain 就是 deepagents / `create_agent` / langgraph 三层塔，链式不要再用于搭 agent。
*   **Semantic Kernel / AutoGen**：微软上一代（SK 偏 .NET 企业栈，AutoGen 是多 agent 研究框架），都已被 Microsoft Agent Framework 收口，新项目不要从它们起步。
*   **LlamaIndex**：RAG/文档检索平台，解决"文档变可检索知识"，不解决"loop 与 harness"；第 11 篇讲 RAG 分界线时再提。
*   **Pi / OpenClaw / OpenHarness**：成品 coding/个人助手 harness，装好即用，是产品不是"嵌进 Python 项目的库"；想先体验完整 harness 可以去装，但不作为维护系统的库选型。

## 4｜最小跑通：deepagents + DeepSeek（首选方案）

```
from deepagents import create_deep_agent
from langchain_deepseek import ChatDeepSeek

def get_time() -> str:
    """获取当前时间（演示用，返回固定值）"""
    return "2026-10-15 12:00:00"

agent = create_deep_agent(
    model=ChatDeepSeek(model="deepseek-flash"),   # 换模型就换这一处
    tools=[get_time],
    system_prompt="用一句话简洁回答",
)
result = agent.invoke({"messages": "现在几点了？"})
print(result["messages"][-1].content)
```

*   安装：`pip install deepagents langchain-deepseek`（Python 3.11+）；`DEEPSEEK_API_KEY` 走环境变量。
*   这 14 行背后是完整 harness：默认还带 `ls/read_file/write_file/edit_file/glob/grep/execute/task` 等工具、上下文管理、子 agent、checkpoint——对比第 7 篇你手写的 20 行循环，能看到"同一个 loop，deepagents 替你包好了哪些件"。
*   你的四个需求在 `create_deep_agent` 的命名参数上怎么展开（`<以官方文档为准>`）：  

    *   **多模型**：`model=` 换 `ChatOpenAI(base_url=...)` / 本地 Ollama 的 LangChain `init_chat_model`；
    *   **多 agent**：`subagents=[...]` 给各子任务配隔离上下文（第 17 篇的主题）；
    *   **多 skill**：`skills=[...]` 把复用能力命名加载（第 16 篇 Claude Code 就有这套）；
    *   **多模式**：deepagents 不内置"模式"按钮——你自己用"不同 system prompt + 工具子集 + `interrupt_on`"组合出只读模式、审批模式、计划模式。想要"开箱即用的运行模式"，去看 DeepSeek Harness 的四种（标准 / PTC / 极简 / 创造）。

*   生产化前把默认件收口：`permissions=` 收紧文件系统 → 后台工具走统一工具出口或 MCP server（Part 5）→ `interrupt_on=` 开写操作审批 → `checkpointer=` / LangSmith 接断点续跑与 trace。
*   **模型串以 DeepSeek 官方清单为准**：框架文档里出现过 `deepseek-v4-flash` 之类与现行 `deepseek-flash` 不一致的写法，别照抄；V4 默认开思考，思考开启时 DeepSeek 拒绝强制 `tool_choice`（第 4 篇已考据，Part 3 会撞上）。
*   MAF 版最小写法见官方 quickstart（`Agent` + `OpenAIChatCompletionClient` + `OPENAI_BASE_URL`），这里不展开。

## 动手实践：把首选方案跑起来

目标：验证"一个函数装好一整套 harness"这一个判断，和手写版形成体感对比。

```
pip install deepagents langchain-deepseek 
export DEEPSEEK_API_KEY=sk-xxx        # key 只走环境变量，不进 git

# 保存上方 §4 代码为 agent_harness.py
python agent_harness.py
```

*   预期输出：一句回答（现在是 2026-10-15 12:00:00）。
*   对比练习（选做）：再用 openai SDK 手写 20 行跑同一任务（第 7 篇成品），写出"deepagents 替我写了哪几件"清单——这是把黑盒变透明的关键一步。
*   说明：真实 API 调用未逐个实测 ；安装 + 无 key 报错行为可在本机复测。

```
from dotenv import load_dotenv
from deepagents import create_deep_agent
from langchain_deepseek import ChatDeepSeek

load_dotenv()
def get_time() -> str:
    """获取当前时间（演示用，返回固定值）"""
    return "2026-10-15 12:00:00"

agent = create_deep_agent(
    model=ChatDeepSeek(model="deepseek-flash"),   # 换模型就换这一处
    tools=[get_time],
    system_prompt="用一句话简洁回答",
)
result = agent.invoke({"messages": "现在几点了？"})
print(result["messages"][-1].content)
```

![Image 1](https://pic3.zhimg.com/v2-8026d8af63722a0b56c400864634c4c6_1440w.jpg)

## 本篇结论

*   你的场景（现代 harness + 多模型 / 多 agent / 多 skill / 多模式 + 维护既有系统）**首选 deepagents**：八件套齐、多模型换一处、`subagents=` / `skills=` 开箱即有、模式用组合实现，LangGraph 底座 + LangSmith 观测，封装和生态都在第一档。
*   **企业治理 / 多语言 / 流程化再上 Microsoft Agent Framework**；**DeepSeek Harness 的"多模式 + 插件化"最全，但 developer preview 拦路——先当架构参考 / POC，等稳定版再上**；LangGraph 裸框架、claude-agent-sdk、openai-agents、绑云的 ADK / Strands、CrewAI 都不是这个需求的首选。
*   **边缘候选一句话定位**：pydantic-ai / smolagents 是轻封装/教学库，补件太多；LangChain 链式已 legacy；SK/AutoGen 被 MAF 收口；LlamaIndex 是检索平台；Pi/OpenClaw/OpenHarness 是成品不是库——都不进你的主线。
*   学习仍先手写（第 6-7 篇），看懂 loop 之后再换生产 harness，避免黑盒。

## 参考

1.   **Deep Agents**｜官方文档 + 仓库（README、`create_deep_agent` 源码、FAQ）｜"batteries-included agent harness"、`create_deep_agent` 参数（tools / subagents / skills / permissions / interrupt_on / checkpointer / memory）、三层塔关系、`model: str | BaseChatModel`｜PyPI `deepagents 0.7.28`
2.   **langchain-deepseek**｜DeepSeek 官方集成文档｜`ChatDeepSeek` 默认 `api_base` 指向 DeepSeek 兼容端点｜PyPI `langchain-deepseek 1.1.1`
3.   **LangGraph**｜官方文档 + 仓库源码（libs/prebuilt）｜定位为图运行时、deepagents 的底座、`create_react_agent`｜PyPI `langgraph 1.2.16`
4.   **Microsoft Agent Framework**｜仓库（README、`python/samples/02-agents/providers/openai/*`）+ 官方文档｜多 provider、teams / handoff / group 流程、Agent Skills、中间件、checkpoint、HITL、OTel、`OPENAI_BASE_URL` / `OPENAI_MODEL`、AutoGen/SK 迁移指南｜PyPI `agent-framework 1.22.0`
5.   **DeepSeek Harness**｜仓库（README、`docs/architecture.md`、`docs/user/guide/python-sdk.md`、`docs/user/guide/providers.md`）+ Python SDK｜developer preview、"一切皆插件"、Cordis、profile/bundle、append-only 会话日志、运行模式、`DeepSeekHarness(provider=...)`、`DEEPSEEK_BASE_URL`｜npm `@deepseek-ai/dsh 0.2.0-rc.2` / PyPI `deepseek-harness-sdk 0.2.1rc2`
6.   **LangChain**｜仓库（langchain_v1 README、`langchain/agents/__init__.py`、langchain-classic README）｜"Legacy chains… deprecated functionality" 与 "built on top of LangGraph" 均为原文｜PyPI `langchain 1.4.6`
7.   **Pydantic AI**｜官方文档（Agent / Tools / Output / MCP / DeepSeek 模型页）｜`DeepSeekProvider` 与 `'deepseek:'` 前缀｜PyPI `pydantic-ai-slim 2.57.0`
8.   **OpenAI Agents SDK**｜官方文档（Models / MCP）｜非 OpenAI 模型接入写法｜PyPI `openai-agents 0.24.0`
9.   **Google ADK**｜仓库（README、`contributing/samples/tools/function_tools/agent.py`、`contributing/samples/models/hello_world_litellm/agent.py`）｜Agent / Workflow、`adk run`、`LiteLlm`、工具函数写法｜PyPI `google-adk 2.12.0`
10.   **Strands Agents / Strands harness**｜仓库（README、`strands-py/README.md`、`strands-py/src/strands/models/openai.py`）｜`create_harness()`、`OpenAIModel` / `LiteLLMModel`、lifecycle controls、MCP｜PyPI `strands-agents 1.61.1` / `strands-harness 0.3.1`
11.   **Pi**｜仓库（README、`packages/coding-agent/docs/how-pi-works.md`、`providers.md`）｜极简四工具、会话树、DeepSeek provider、扩展机制｜npm `@earendil-works/pi-coding-agent 1.3.0`
12.   **OpenClaw**｜仓库（README）｜"Models and agent harnesses … are plugins"、渠道列表、本地存储｜npm `openclaw 2026.10.5`
13.   **OpenHarness**｜仓库（README、Quick Start）｜agent loop / 43+ 工具 / skills / memory / multi-agent、`oh setup`、provider 列表｜PyPI `openharness-ai 0.1.9`
14.   **CrewAI**｜仓库（README、`docs/v1.15.28/en/concepts/llms.mdx`、`crews.mdx`）｜Crews / Flows、checkpoint、`base_url` / `custom_openai`｜PyPI `crewai 1.15.28`
15.   **smolagents**｜仓库（README、`src/smolagents/models.py`、`docs/source/en/guided_tour.md`）｜约 1000 行核心、`CodeAgent`、`OpenAIModel` 的 `api_base` / `api_key`、`@tool` 写法｜PyPI `smolagents 1.26.0`
16.   **Claude Agent SDK for Python**｜仓库 + 官方文档｜`query()` / `ClaudeAgentOptions` / 捆绑 CLI / Python ≥3.10、`mcp_servers`（经 `types.py` 源码核验）、模型绑定 Claude｜PyPI `claude-agent-sdk 0.2.168`
17.   **PyPI JSON API**｜`https://pypi.org/pypi/<包名>/json`｜全部版本号与 `requires_python` 核验｜2026-10-19 当日查询
18.   **GitHub API**｜`https://api.github.com/repos/<org>/<repo>`｜全部 star 数核验｜2026-10-19 当日查询
19.   **DeepSeek 开放平台**｜platform.deepseek.com｜现行模型清单与思考模式参数（考据见第 4 篇 §1.2）｜2026-10-19 双重核验

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
