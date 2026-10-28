# Agent - 经典智能体理论（2）（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2094449859252197165>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 16285 字符）

---

## 介绍

第 2 篇：经典智能体理论 → 现代 LLM Agent 映射

> 本篇是纯理论 + 一个“动脑练习”，不配代码。它要解决三件事：经典 AI 的五类智能体怎么一眼认出；你手里的 LLM Agent 对应经典框架里的哪一档；以及用 PMTA 四要素描述任何 Agent，并把它作为全系列的坐标系。

* * *

## 导语：为什么要先回到“老教材”

经典教材《Artificial Intelligence: A Modern Approach》（Russell & Norvig，下称 AIMA；Pearson，1995 年首版，2020 年第 4 版，ISBN 978-0134610993，版本信息见官网 translations 页）开篇就把“智能体”拆成一条线：

```
智能体（agent）
    感知（percept）────────────────▶  决策（decision）────────────────▶  行动（action）
        ▲                                                                    │
        └──────────────────────────────── 环境产生的反馈 ◀────────────────────┘
```

任何 agent 都在这条线上转：**从环境拿到感知 → 内部决策下一步 → 对环境行动 → 再感知**。 五档分类的区别，只在于”决策”这一个环节里放了多少东西。

先建立一个关键认知：这五类不是“从笨到聪明”的进化树，而是“用什么决定动作”的五个维度。真实系统往往同时落在多个维度上。分类是坐标系，不是单选标签。

本篇要回答：

1.   经典智能体分类-三十年前教材里那五类智能体（simple reflex / model-based / goal-based / utility-based / learning） 怎么区分？判定标准是什么？
2.   每种经典分类，映射到 2026 年的 LLM agent，对应**哪个构件**？
3.   PMTA 四要素（Planning / Memory / Tool use / Action）是什么？怎么用它描述/复盘任何 agent？为什么它能当全系列的坐标系？
4.   为什么 2026 年讲 agent 还要回到这套几十年前的模型？它好在哪、局限在哪？
5.   拿一个现成的 agent（你正在用的 Claude Code）对照 PMTA，怎么逐个指认它的构件？

## 1｜五类经典智能体：一份用了三十年还没过时的分类

AIMA 第 4 版第 2 章 “Intelligent Agents” 的 §2.4 “The Structure of Agents” 依次讲五类：simple reflex agents（§2.4.2）、model-based reflex agents（§2.4.3）、goal-based agents（§2.4.4）、utility-based agents（§2.4.5）、learning agents（§2.4.6）。AIMA 的“智能体”框架一句话：智能体是感知环境并作用于环境的任何东西，内部跑的是一个“感知序列 → 动作”的映射。

五档不是并列的五个物种，而是叠加的：simple reflex 是最小底座，model-based 加内部状态，goal-based 加目标与规划，utility-based 加效用权衡，learning 再加自我改进。用一张从下往上的叠加表记最牢固：

| 档位 | 在决策里加的东西 | 关键字 |
| --- | --- | --- |
| 1 simple reflex | 无 | 当前感知 → 查表 |
| 2 model-based | 内部状态（世界模型） | 补全盲区、记住过去 |
| 3 goal-based | 目标 + 规划 | 拆步骤、找路线 |
| 4 utility-based | 效用函数 | 权衡、取舍、打分 |
| 5 learning | 学习机制 | 反馈 → 改进 |

下面逐档给“一句话 + 日常/后端类比 + 判定标准”。

### 1.1 simple reflex：纯刺激-反应 ——只看眼前，不过脑子

**一句话**：根据当前感知的直接映射（查表）决定动作，没有任何内部记录。不看历史、不看目标，“一有刺激就按规则出招”。

**类比**：绿灯行、红灯停——红绿灯切换之间，你没有“我刚才看到了什么”的记忆，只有“现在是红是绿”这一个输入。后端类比：无状态 HTTP handler。请求进来，按路由和参数返回响应，处理完什么都不记——同一个请求永远得到同一种处理，它不关心你上一秒发过什么。

**判定标准**：动作只由当前这次输入决定。你掐掉它上一步的任何痕迹（上一步感知、上一步动作、历史），它对当前输入的反应完全不变。实现上就是一张“条件 → 动作”的规则表（AIMA 称 condition-action rule）。它没有内部状态可“记”，也没有目标可“想”。局限也和无状态服务一样：一旦任务需要“记得上下文才能做对”，它就抓瞎。

### 1.2 model-based reflex：有内部状态 ——心里有张世界地图

**一句话**：内部维护对世界状态的估计（model），每次感知都更新它，动作基于当前感知 + 内部状态；状态对它看不全的世界做补全。

**类比**：你戴着耳机走在路上，前面堵了看不见，但你知道“我 3 分钟前听到喇叭声”——你用一个内部“模型”补上了当下的盲区。后端类比：带会话（session）的服务。登录态、购物车、多步表单的中间态——服务在请求之间“记住”了什么，行为就不再只取决于这一次请求。

**判定标准**：比 simple reflex 多两样东西——(a) 内部状态，(b) 一套“世界怎么变、我的动作怎么影响世界”的模型，用来在两次输入之间维持状态（AIMA 强调模型正是为了处理“当前感知不到的部分”）。改一下它过去的经历，它现在会对同一个输入做出不同的动作——过去的痕迹进入了现在的决策。注意：这里的 model 指“世界模型”，不是大语言模型。

### 1.3 goal-based：目标导向，会规划 ——知道要去哪，会想路

**一句话**：除世界模型外，再加一个目标；它不再只做“看见什么回什么”，而是搜索一条动作序列把现状推到目标状态（规划）。不只是“遇到 X 就做 Y”，而是先问“做了 Y 之后，离目标更近了吗”——会模拟后果、会规划步骤。

**类比**：你要去机场，不是“见到什么做什么”，而是先想“出门 → 打车 → 上高速”整条路线，再一步步走，路上发现封路会换路。后端类比：编排器（orchestrator）。你说“把这个服务发上线”，它自己排出“构建 → 测试 → 灰度 → 全量”——目标定了，路径要它自己找。

**判定标准**：存在显式目标；选动作的依据从“当前刺激匹配哪条规则”变成“哪个动作的后果能达成目标”。它在动作之前，会有一个“为达成某个目标而计划”的显式产物（路线、步骤、方案），而不是条件反射。后果在动作之前看不见，所以要搜索 / 规划——AIMA 里这正是第二部分“问题求解”各章的起点。

### 1.4 utility-based：效用权衡 ——多个目标打架时算账

**一句话**：多个目标/选项并存时，给每个候选方案算一个效用值，选最大化效用的那个——不只是“能不能到目标”，而是“哪个更划算、更安全、更省”。目标只回答“到没到”，utility（效用函数）回答“有多好”——在都能达成目标的几条路里挑综合最优。

**类比**：同样能到机场，骑车最便宜但可能下雨、打的快但贵——你按“时间 × 钱 × 状态”打分，选总分最高的。没有单一目标能回答这件事，只有效用函数能。后端类比：网关的评分路由。目标都是“把请求处理成功”，但你在成本、延迟、质量之间打分权衡：贵但快、便宜但慢、还是均衡？光“能到”不够，还要“划算”。

**判定标准**：有显式的效用函数给候选方案打分，在“多个都能达成目标的方案”之间比较。它面对互斥选项会权衡取舍（代价/风险/收益），而不是无脑追求唯一目标。它内含 goal-based（首先能到目标），只是在“到”之上多了一层“值不值”。

### 1.5 learning：从经验改进 ——从经验里改进自己

**一句话**：Agent 里多一个学习部件，它能根据“行动的反馈是否达成预期”去调整自己未来的决策（参数、规则、策略），越用越好。用“表现如何”的反馈改自己——规则、状态、知识，跑得越久越顺手。

**类比**：你第一次开这家餐厅的导航多绕了路，下次出门它记住了这条路——你“学”到了经验，不用重头再死记一遍。后端类比：线上系统自调优。根据错误率、延迟自动调整缓存策略或限流阈值——系统行为随运行经验变化。

**判定标准**：部件里多了 learning element（学习元件）和 critic（评价器）——critic 用相对固定的性能标准衡量 Agent 的表现，learning element 据此修改决策部分（AIMA §2.4.6）。可操作的判定一句话：同样一个问题，多次经历之后它的表现变好了——存在一个把反馈转化为改进的环节。换一批输入、多跑一段时间，它的表现是否变好。

> 五个维度可以叠加：learning agent 的内部可以是 utility-based 的，utility-based agent 也可能同时维护内部状态（model-based）。分类是坐标系，不是单选标签。

* * *

## 2｜映射：经典分类 → 2026 年 LLM agent 的哪个构件

这五档是为”任何智能体”写的，不限于神经网络。把今天的 LLM agent 放进去，一档一档对上：

| 经典分类 | 对应 2026 LLM agent 的构件 | 实感例子 |
| --- | --- | --- |
| simple reflex | 无记忆的单个 tool call：模型只对”当前完整输入”做一次反应，不维护任何跨轮状态 | 第 1 篇的”台阶二”：一次 tool_calls 声明，用完即弃 |
| model-based | 有状态/有记忆的循环（agent loop）：对话历史 + 工具结果被当作”内部状态”不断喂回去，环境不再看全也靠着状态补 | 第 1 篇时序图里的 loop——模型”记得”自己刚才调过 get_weather，才能说”北京 5℃” |
| goal-based | 把目标拆计划的 agent（显式 planning）：模型不是”见一步走一步”，而是先产出一份计划再执行 | P4·12 的 Plan-and-Execute；第 1 篇的”台阶三”再进一步——多步目标任务 |
| utility-based | 多目标权衡 / 守卫 / 评测打分：预算上限、危险操作拒绝、verifier 独立检查、eval 打分，都是”算账” | P7·18 评测的 LLM judge；P7·19 写操作确认；P4·12 的 verifier |
| learning | eval 闭环与自改进：把失败样本吸进测试集 → 改 prompt / 选模型 → 回归验证表现变好 | P7·18”自主学习边界”；第 1 篇自测法”里程碑=考题” |

一个关键的”实感”：**主流 LLM agent 是混合体，不是单一档位**。

*   只发一次请求的”单轮工具调用”≈ simple reflex（最基本，但不是 agent）；
*   我们的 agent loop 一跑起来 ≈ **model-based**（上下文就是它的内部状态）＋ 一部分 **goal-based**（目标写在 system prompt 里，模型在推理下一步）；
*   加了显式规划 ≈ **goal-based** 升满；
*   加了预算/守卫/verifier ≈ **utility-based** 的零件；
*   上了 eval 回归 ≈ **learning** 的雏形。

所以第 1 篇那张”三台阶表”可以用这五档重新读一遍：**台阶二是 reflex，台阶三的循环是 model-based，会拆计划的循环是 goal-based**——这套旧理论不是考古，是用了几十年的” 智能体要有哪些部件”清单，今天一条都没过时。

用判据自检是不是”真变成高一档”：如果”砍掉历史上下文，模型就不一样了”，你已经踩进 model-based 的地界；如果”没有显式计划产物，就会选错路线”，你在 goal-based 的地界缺了 规划零件（这正是 P4·12 要补的）。

### 2.1 simple reflex ≈ 无记忆的单次 tool call

第 1 篇那张[时序图](https://zhuanlan.zhihu.com/p/2094449859252197165/01-%E5%85%A8%E6%99%AF%E4%B8%8E%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF%E5%9C%B0%E5%9B%BE.md)的单圈，就是 simple reflex：模型收到 messages + 工具清单，只根据”这轮对话里现在有什么”决定调不调工具、调哪个、参数填什么。不回填历史、不做目标推理——标准的 condition-action：条件（用户消息 + 工具 schema）→ 动作（tool call）。

判定也问同一个问题：**它的动作是不是只由当前输入决定？** 是，它就停在这一档。

### 2.2 model-based reflex ≈ 有状态 / 有记忆的循环

把工具结果与模型回复**回填进 messages 再问一次**（第 1 篇时序图第 (6) 步），你就迈进了 model-based 档：messages 列表就是 agent 的内部状态，”对话历史会增长”就是最朴素的世界模型。第 3 篇的 agent loop 会把这个循环写成代码，第 11 篇的三层记忆则把它工程化——上下文窗口装不下怎么办、哪些该记哪些该忘。

用后端味儿串起来：simple reflex 是无状态 handler；从这一档起，你开始给服务引入 session。

### 2.3 goal-based ≈ 把目标拆成计划的 agent

用户给的是一个**目标**（”把张三的角色换成 admin”），达成路径有多步、且没法预先写死——agent 得自己想”先查 → 再改 → 再验证”。这正是 goal-based 的定义：**依据动作的预期后果选动作**。第 12 篇的 Plan-and-Execute（先出一份可执行计划再逐步执行、结果推翻计划时重规划）是它的现代实现；你正在用的 Claude Code 的 plan mode 也是（第 4 节动脑练习里亲手指认）。

### 2.4 utility-based ≈ 多目标权衡 / 守卫 / 评测打分

这一档在 2026 年的 agent 工程里至少有三种现成形态：

*   **模型路由**：简单任务走便宜模型、复杂任务走强模型——成本 vs 质量的效用权衡（第 20 篇）。
*   **护栏（guardrail）**：危险操作按风险等级打分，决定”放行 / 停下来问人 / 拒绝”（第 9、19 篇）。
*   **LLM judge / 评测打分**：给 agent 输出按维度打分再跑回归（第 18 篇）。

共同点：都引入了**显式打分**环节，在”能完成”之上问”好不好”——这就是效用函数的现代形态。

### 2.5 learning ≈ eval 闭环与自改进

先说一句诚实声明：LLM agent 的”学习”**大多不改模型权重**（微调是另一回事，第 18 篇会讲为什么新手别碰），改的是**权重之外的部分**——把失败案例沉淀进评测集、改 prompt、改工具描述、把经验写进记忆。判定精神不变：**同一个 agent，跑过一段时间后表现是否变好。** 本系列的落地在第 18 篇：reflection → 失败案例进测试集 → 改进 prompt → 回归验证，这是经典 learning 闭环（critic + learning element）的当代对应。

还有一个经典理论没预料到的差别值得点出：AIMA 的 learning 改的是 agent program 内部（权重 / 规则）；LLM 时代的 learning 改的是**环绕模型的外围资产**（评测集、prompt、记忆、工具描述）——因为模型本体是”租来的”，你改不了。

* * *

## 3｜PMTA 四要素坐标系（全系列的地图坐标）

讲架构、描述别人 Agent、复盘自己 demo，都需要一句“它有什么、缺什么”。本系列统一用 PMTA 四个要素当坐标系——学术来源是 CoALA（Cognitive Architectures for Language Agents，arXiv 2309.02427）为代表的语言 Agent 架构框架，本质是把前两节讲的东西固定成一张“零件清单”。

**PMTA 大白话**：描述任何 Agent 只需要回答四个问题——会不会先想（Planning）、记不记得住（Memory）、有没有手（Tool use）、动没动真格（Action）。

定义：四个要素取首字母，即 Planning（规划）/ Memory（记忆）/ Tool use（工具使用）/ Action（行动）。这是本系列采用的工程坐标系；它的学术根基是 CoALA（Sumers、Yao、Narasimhan、Griffiths，arXiv 2309.02427，2023 年提交、2024 年更新至 v3）。

> 出处：CoALA 论文（​​arXiv 2309.02427）提出的 语言 agent 认知架构——行动空间 / 记忆 / 决策程序——是 PMTA 坐标系的理论来源； 本系列的”Planning / Memory / Tool use / Action”四要素是对该框架的教学化提炼。

### 3.1 ASCII 图

```
目标（用户的一句话）
                        |
             ┌──────────▼──────────┐
             │   P: Planning       │  先想：把目标拆成步骤（简单任务可以没有，见第 12 篇）
             └──────────┬──────────┘
                        ▼
  M: Memory  <────►  决策（LLM） ────►  T: Tool use
  记什么 / 忘什么       挑工具、填参数       （点菜，不做饭）
                        │
                        ▼
             ┌─────────────────────┐
             │   A: Action         │  真执行：发 HTTP / 写文件 / 查库
             └──────────┬──────────┘
                        │  结果回填 → 回到决策（这个循环 = agent loop，第 3 篇展开）
                        ▼
                 世界（你的后台系统）
```

### 3.2 准确定义与经典理论对应

*   **Planning（规划）**：动手前把目标转成行动序列，执行中还能改计划。经典对应：goal-based（“按后果选动作”落到工程上就是规划），utility-based（多个可行方案间的权衡）。
*   **Memory（记忆）**：保存并复用过去的感知、决策与结果——从“这轮对话历史”到“跨会话长期记忆”。经典对应：model-based reflex 的内部状态；learning 的经验沉淀。
*   **Tool use（工具使用）**：从“只会说”到“能点菜”——把能力注册成模型可调用的清单，模型输出调用意图、你的代码执行（第 1 篇的三方分工）。经典对应：AIMA 里没有直接对应物，角色最接近的是 actuator（执行器，智能体作用于环境的机构）——这是本系列的理解性映射，非教材原义。
*   **Action（行动）**：真正改变世界的一步——真发 HTTP、真写文件、真改数据。经典对应：五类共同的底座，即“感知 → 动作环”的动作端；simple reflex 当下就动，goal-based 把它作为计划中的一步。

### 3.3 核心交付物：要素 × 经典类型 × 你在哪篇学它

这张表是本篇的核心交付物，也是全系列坐标系——后面每篇引用它时一句话回顾即可：

| PMTA 要素 | 大白话 | 经典理论对应（AIMA） | 现代 Agent 里长什么样 | 你在哪篇亲手做 |
| --- | --- | --- | --- | --- |
| Planning | 动手前先想路径 | goal-based（按后果选动作）、utility-based（多方案权衡） | plan mode、Plan-and-Execute、执行中重规划 | P4·12（反思与验证在 P2·4 埋点）；P6·17（planner-executor 模式） |
| Memory | 记得住、忘得掉 | model-based reflex（内部状态）、learning（经验沉淀） | 上下文窗口、会话记忆、长期记忆、自动压缩 | P2·3（上下文管理）、P4·11（三层记忆/压缩/存储） |
| Tool use | 能伸出去的手 | 无直接对应；最接近 actuator | function calling、工具注册、MCP | P2·6（三种姿势）、P3·8-10（工具工程）、P5·13-15（MCP） |
| Action | 真正改变世界 | 五类共同底座（感知 → 动作环的动作端） | 工具真执行：HTTP、SQL、写文件 | P3·8（第一个闭环）、P7·20（治理） |
| learning（横跨四要素） | 从经验变好 | learning agent（critic + learning element） | eval 闭环、trace 驱动改进 | P7·18 |

### 3.4 怎么用：见到任何 Agent 问四个问题

描述任何一个 Agent，从四个角度各问一句：

*   **Planning**：它会不会为多步目标先出计划？计划崩了会不会重规划？
*   **Memory**：它记住什么？用完即弃 = 没记忆；有对话历史 = in-context；能跨会话 = 长期记忆？
*   **Tool use**：它接住了哪些外部能力？工具描述写得清不清楚？
*   **Action**：它的执行有没有副作用、有没有人能拦下来（权限/确认）？

缺哪块，就往哪块补——第 1 篇“怎么自测”里让你“用 PMTA 复盘每个成品”，用的就是这张表。后面每一篇的标题括号里的【A0/A1/…】知识地图标签，就是告诉你“这篇在喂 PMTA 的哪块”（B1 工具系统、B2 记忆设计、B3 规划能力…，见 README 结构速览）。

更口语化的四问是：

1.   **它记什么？** 只看当前消息 = reflex 档；回填历史 = model-based 档；跨会话还记得 = 长期记忆。
2.   **它想吗？** 拿到目标就闷头一步步干，还是先出计划、执行中还改计划？
3.   **它的手多长？** 只有嘴（纯聊天）→ 能读（搜索）→ 能写（改数据、调接口）；真动手前有没有打分护栏（utility 成分）？
4.   **它会变好吗？** 失败案例去哪了——蒸发，还是沉淀进评测集 / 记忆？

* * *

## 4｜为什么 2026 年讲 Agent 还要回到这套老模型？

这些分类回答的是“智能体要有哪些部件、按什么逻辑闭环”，而不是“要用什么技术栈”。技术会换代（符号逻辑 → 神经网络 → LLM），部件清单不会。三个理由：

**第一，通用语言。** simple reflex / goal-based 是教科书名词，任何人（不管用 LangGraph 还是 MCP）都听得懂。你说“我这个 Agent 是 model-based + 目标写在 system prompt”，比说“我用了 XX 框架”更能让对方在一分钟内理解架构。

**第二，照出短板。** PMTA 四个问题一问，缺什么一目了然。比如第 1 篇的三台阶 Agent——问 Planning 发现“没有规划”、问 Memory 发现“只有当前这轮上下文”，自然知道该去 P4 补。这是防止“能力听起来很全、实际缺零件”的最好自检。

**第三，防过度设计。** 经典框架给出的是上限（utility / learning），不代表每个 Agent 都要上到最高档。多数内部工具型 Agent 到 model-based + 轻度 goal-based 就够用；一上来就上 learning（微调）往往是浪费（P7·18 会细说“新手别微调”）。知道“边界在哪”，才不会过度设计。

再补一层更本质的理由：

*   **LLM 改变的是“决策程序怎么实现”，没有改变“要有哪些部件”。** AIMA 的五类回答的是“用什么决定动作”：当前规则（simple reflex）、内部状态（model-based）、后果模拟（goal-based）、效用打分（utility-based）、经验修正（learning）。LLM 只是把“决定”这个环节的实现，从规则引擎 / 搜索算法换成了“读上下文、写文本的巨型函数”。2026 年你造一个 Agent，仍然在回答 1995 年教材里的同一组问题：记忆放哪（M）、要不要规划（P）、工具怎么给（T）、动作怎么执行（A）。
*   **五个维度就是五条现成的“成熟度提问”。** 评价任何 Agent——开源的、商业的、你们公司自研的——问的还是 §3.4 那四个问题。你会发现 2026 年的 Agent 架构评审、评测报告，做的仍是 AIMA 第 2 章的事：给部件清单打勾。
*   **它是“防玄学”的理论。** 第 1 篇的立场是 Agent 不是玄学、是一层编排代码；本篇补上另一半：经典理论把“智能体”还原成一份工程构件清单（PMTA），你按清单造零件、按维度判成熟度，不需要任何“涌现”“意识”式的解释。CoALA 的作者们在 2023 年分析语言 Agent 时，选择的框架正是“认知科学与符号 AI 的悠久历史”（论文摘要原话：draw on the rich history of cognitive science and symbolic artificial intelligence）——新物种，老骨骼，这是对“老理论没过时”最有力的背书。

**局限也要诚实说**：这套理论定义的是部件，不回答 2026 年最要命的工程细节——上下文窗口怎么算、token 成本怎么控、模型幻觉怎么防、MCP 怎么接。那些是本系列后文（P2-P7）的活。理论给你地图，工程给你路。

一句话收束：经典理论告诉你“造哪几个零件”，PMTA 把零件清单压缩成四个字母；本系列之后每一篇，都在这四个字母上施工。

* * *

## 动脑练习：用 PMTA 指认一个真实的 agent（Claude Code）

不写代码也不配环境——你已经跑着的 Claude Code 就是最现成的标本。**练习目标**： 把第 3 节的四个问题，真的指认到一个软件上。

**任务**：对照下面的”指认表”，在你用 Claude Code 的过程中（或回想它最近帮你做的某件事） 把每一格填上”它==有什么==、==在哪==“：

| PMTA 要素 | 去 Claude Code 里找什么 |
| --- | --- |
| Planning | 它会不会先读相关文件、列出计划再动手？（它有一个”计划模式”专门干这个——先征得你同意再执行） |
| Memory | 它的”上下文”是什么？会话中途 /compact 压缩了什么？多会话之间它从哪恢复？（checkpoint / 会话历史） |
| Tool use | Read / Edit / Write / Bash / 网页抓取——它用哪些”外部能力”接触你的系统？ |
| Action | 它编辑文件、跑命令，是真的有副作用的——哪些操作它会停下来问你？为什么？ |

**做完你会得出三个”原来如此”**：

1.   **Claude Code 是 model-based 的**：它靠”上下文（内部状态）+ 工具结果”记住刚才改到哪了—— 删掉上下文它马上”失忆”，正是第二档的判据；
2.   **它的 Action 有守卫**：危险/花钱/破坏性操作要你确认——这就是 utility-based 里”权衡” 的工程化落地；
3.   **PMTA 不是空话**：每个要素都能在真实产品里找到实体（工具 = Read/Bash，记忆 = 上下文/checkpoint，规划 = 计划模式）。你以后描述任何 agent，就都有了这张指认表。

> Claude Code 的具体功能（计划模式、/compact、checkpoint 是否存在与形态）以官方文档为准 Claude Code overview。

### 看什么：四站文档

Claude Code 官方文档在 http://code.claude.com/docs（http://docs.anthropic.com 下的旧 Claude Code 链接会重定向到该站，本篇 2026-10-15 实测 301）。按 PMTA 四站读：

1.   **P 站（Planning）**：读 “Choose a permission mode” 的 plan mode 一节。要找的话：`plan` 模式的行为——官方描述是 “Claude Code blocks edits until you approve a plan”（先出计划、你批准、才动手），可用 `claude --permission-mode plan` 启动、会话内 `Shift+Tab` 切换。
2.   **M 站（Memory）**：读 “How Claude Code works” 的 context window 一节与 memory 页。要找的话：CLAUDE.md（每次会话加载的项目级持久指令）、auto memory（自动沉淀的 MEMORY.md，每次会话开头加载前 200 行或 25KB）；上下文将满时先清旧工具输出、再摘要压缩，`/compact` 可手动触发并带聚焦指令（如 `/compact focus on the API changes`）。
3.   **T 站（Tool use）**：读 “How Claude Code works” 的 Tools 一节与 Tools reference 页。要找的话：内置工具的五大类——文件操作 / 搜索 / 执行 / Web / 代码智能；代表工具 Read、Edit、Write、Bash、Grep、Glob、WebFetch、WebSearch；以及”派生 subagent、向你提问”的编排类工具。
4.   **A 站（Action）**：同在 “How Claude Code works”。要找的话：agentic loop 三阶段（gather context → take action → verify results，官方称这些阶段循环往复、模型依据上一步结果决定下一步）；checkpoints——改文件前先快照、可回滚（真改了世界的动作有后悔药）；会话以 JSONL 落盘在 `~/.claude/projects/`、可 resume。

### 参考答案（填完再看）

*   **Planning**：plan mode（先出计划、批准后执行）+ 模型把复杂任务拆成多步、按每步结果调整（官方 Models 一节：”For complex tasks, it breaks work into steps, executes them, and adjusts based on what it learns”）。经典对应：goal-based。
*   **Memory**：CLAUDE.md + auto memory + 会话上下文（JSONL 持久化、可 resume）+ 自动压缩 / `/compact`。经典对应：model-based（内部状态），同时是 learning 的素材来源。
*   **Tool use**：五大类内置工具 + subagent / 提问等编排类工具。经典对应：actuator 的现代形态（模型点菜，工具真做）。
*   **Action**：Bash 真跑命令、Edit 真改文件；checkpoints 提供动作级回滚。经典对应：动作端。
*   **追加判定题**：Claude Code 属于经典分类的哪一档？——**不是哪一档，是哪几档的叠加**：维护内部状态（model-based）、会规划（goal-based）、有模型路由等成本权衡（utility-based 成分）、auto memory 从经验沉淀（learning 成分）。这正是 §1.1 说的”分类是维度，不是标签”。

一个诚实的边界说明：以上指认全部基于官方文档的公开描述（出处见参考资料 4-7）；Claude Code 本体闭源，harness 内部实现细节（如循环的确切代码路径）官方未公开，不在本练习指认范围内——第 16 篇拆解成熟 agent 时同样以公开文档与行为观察为准。

* * *

## 本篇结论

*   五档经典分类是按“决策环节里加了什么”叠加起来的：reflex（查表）→ model-based（内部状态）→ goal-based（目标+规划）→ utility-based（权衡）→ learning（自我改进）。
*   映射到手：无记忆 tool call ≈ reflex；loop 上下文 ≈ model-based；显式规划 ≈ goal-based；守卫/评测 ≈ utility-based；eval 闭环 ≈ learning——主流 Agent 是它们的混合体。
*   PMTA 四要素（规划/记忆/工具/行动）就是全系列的地图坐标：描述任何 Agent 问四句，缺什么补什么。
*   2026 年仍要回到这套模型，是因为它定义的是“智能体要有哪些部件”，而不是“用什么技术栈”；它能当通用语言、照出短板、防过度设计，也能把 Agent 从“玄学”拉回工程构件清单。
*   Claude Code 是一个很好的 PMTA 标本：plan mode 对应 Planning，CLAUDE.md / auto memory / 上下文 / checkpoint 对应 Memory，Read/Edit/Write/Bash 等对应 Tool use，真执行与确认/回滚对应 Action；它不是单一档位，而是多档叠加

* * *

## 参考

1.   Russell & Norvig《Artificial Intelligence: A Modern Approach》官网（4th US ed.） — 五类智能体分类的权威出处（Ch.2 “Intelligent Agents”，§2.4.2-§2.4.6 目录逐节核验）；首版 1995 / 第 4 版 2020（Pearson，ISBN 978-0134610993）出自官网 translations 页。2026-10-15 在线核验。
2.   CoALA: Cognitive Architectures for Language Agents（Sumers, Yao, Narasimhan, Griffiths；arXiv 2309.02427） — PMTA 的学术来源：模块化记忆组件（working / episodic / semantic / procedural memory）、内部与外部动作（internal / external actions）、决策程序（decision procedure）等术语均出自论文原文。2026-10-15 在线核验（摘要页 + HTML 正文）。
3.   Anthropic — Building Effective Agents — workflow vs agent 的定义与”能用简单方案就别上 agent”的立场（第 1 篇已引用并核验，本篇第 4 节立场延续）。
4.   Claude Code 官方文档 — How Claude Code works — agentic loop 三阶段、”agentic harness” 的定义、内置工具五大类、上下文压缩与 `/compact`、checkpoints、会话 JSONL 落盘。2026-10-15 在线核验（docs.anthropic.com 旧链接 301 至 code.claude.com）。
5.   Claude Code 官方文档 — How Claude Code remembers your project (memory) — CLAUDE.md / AGENTS.md 与 auto memory（MEMORY.md）的持久记忆机制。2026-10-15 经官方文档索引与本篇引用正文交叉核验。
6.   Claude Code 官方文档 — Choose a permission mode — plan mode（”blocks edits until you approve a plan”）、`Shift+Tab` 模式切换。2026-10-15 在线核验。
7.   Claude Code 官方文档 — Tools reference — 内置工具清单（Read / Edit / Write / Bash / Glob / Grep / WebFetch / WebSearch / Task 等）。2026-10-15 在线核验（页面结构与工具清单经索引核验）。

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
