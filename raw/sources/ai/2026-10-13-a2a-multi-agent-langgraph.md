---
title: 人人学 A2A 架构：第13章 从零搭建工业级多Agent协作系统（实战进阶）
source: 技术自由圈（尼恩）
source_url: https://mp.weixin.qq.com/s/6YKXGTJaZSwHDtQqjv9j-A
source_type: article
platform: 微信公众号
captured: 2026-10-13
registered_at: 2026-10-16
inbox_ref: Archive/2026-10-13-a2a-multi-agent-langgraph.md
---

FSAC未来超级架构师

架构师总动员  
实现架构转型，再无中年危机

## 尼恩说在前面

在45岁老架构师尼恩的**读者交流群**（50+人）里，最近不少小伙伴拿到了阿里、滴滴、极兔、有赞、希音、百度、字节、网易、美团这些一线大厂的面试入场券，恭喜各位！

前两天就有个小伙伴面腾讯，   问到  场景题 ：

**“ 听说过 A2A 协议 吗？你们A2A 实现 协同 的？ ”**

**“  你们A2A 实现 协同 ，是 点对点的吗？ ”**

小伙伴没有一点概念，导致面试挂了。

小伙伴  没有看过系统化的 答案，**回答也不全面** ，so，   面试官不满意  ， 面试挂了。

小伙伴找尼恩复盘， 求助尼恩。

通过这个 文章， 这里  尼恩给大家做一下   系统化、体系化的梳理，写一个系列的文章组成  尼恩编著   《Harness 架构与源码  学习圣经》  深入剖析 Harness AI 平台级 架构的  架构思维与 核心源码，使得大家可以充分展示一下大家雄厚的 “技术肌肉”，**让面试官爱到 “不能自已、口水直流”**。

同时，也一并把这个题目以及参考答案，收入咱们的 《[尼恩Java面试宝典PDF](https://mp.weixin.qq.com/s?__biz=MzkxNzIyMTM1NQ==&mid=2247497474&idx=1&sn=54a7b194a72162e9f13695443eabe186&scene=21#wechat_redirect)》V176版本，供后面的小伙伴参考，提升大家的 3高 架构、设计、开发水平。

## 尼恩编著   《 A2A  学习圣经》

**01章：深度解析：A2A协议 的标准化架构 .md**

**02章：深度解析： A2A 源码仓库结构与规范体系.md**

**03章：深度解析： A2A 协议 Proto 定义与三层架构深度解析.md**

**04章：深度解析：A2A协议 Task 生命周期技术详解.md**

**05章：深度解析：A2A协议 Message 与 Part 核心结构深度解析.md**

**06章 深度解析： A2A协议 Artifact 标准化产出物模型详解.md**

**07章：深度解析：A2A协议 AgentCard 智能体自描述规范深度解析.md**

**09章：深度解析： A2A协议 请求与响应 RPC 模式详解.md**

**10章：深度解析：A2A协议 流式传输（SSE）架构与核心规范详解.md**

**11章：深度解析：A2A协议 Push Notification 异步推送通知机制详解.md**

**12章：深度解析： A2A 协议多语言 SDK 架构与工程化实现规范.md**

**13章：A2A 实战：从零搭建工业级多Agent协作系统（实战进阶）.md**

本文是 第 13章。

> _尼恩提示：《 A2A  学习圣经》   原文3w字以上， 超过平台限制， 此处省略 1000字，具体请参考  免费pdf。_
> 
> _完整版本，请参考 尼恩 免费百度网盘 免费pdf ，__点赞收藏本文后__，截图 找尼恩获取_

![三、A2A 工业级多Agent系统架构设计](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 深入 A2A协议：通过Langgraph 从0实操工业级多Agent协作系统

随着大模型技术快速迭代，单一AI Agent的能力边界逐渐暴露：功能固化、场景受限、无法完成复杂复合任务。

多Agent协作已然成为AI工程化落地的核心方向，而**A2A（Agent-to-Agent）协议**作为Google推出的标准化智能体通信协议，彻底解决了异构Agent互联互通、协同调度、任务全生命周期管理的行业痛点。

尼恩 将从**协议原理、核心架构、工程落地、进阶优化**四个维度，系统性讲解A2A协议核心逻辑，摒弃基础玩具化的单agent ，而是  基于Python、LangChain、LangGraph搭建一套**可扩展、可迭代、贴近生产环境**的**多Agent旅行 规划 系统**。

尼恩 将 **初步  实现  Agent服务注册、标准化通信、智能意图路由、多节点工作流推理、异步并发调度等核心能力**，并深度辨析A2A与MCP协议的互补逻辑，为生产级多Agent系统开发提供完整落地方案。

![深入 A2A协议：通过Langgraph 从0实操工业级多Agent协作系统](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 一、A2A协议核心价值：打破AI Agent孤岛生态

![一、A2A协议核心价值：打破AI Agent孤岛生态](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 1.1 传统多Agent开发的核心痛点

当前行业内绝大多数自定义多Agent系统，均存在严重的碎片化问题，无法支撑规模化落地，具体痛点集中在四点：  - **单体AI能力太局限：** 一个AI只能干一件固定的事，没有全能AI能同时处理查天气、订车票、做规划等跨场景任务，复杂需求直接卡死。 - **AI之间完全不通话：** 用LangChain写的AI、用自研代码写的AI，消息格式、传参方式、返回结果全都不一样，就像中国人、外国人、盲人各说各的，天然无法沟通。 - **代码硬编码，改一处崩全局：** 新增一个AI功能、修改一个AI逻辑，就要改动核心调度代码，越写越乱，完全没法维护迭代。 - **任务全程黑盒，毫无管控：** 任务跑没跑、卡在哪、为什么失败、缺什么参数，完全没有记录，线上出问题只能瞎排查，不符合企业生产要求。

### 1.2 A2A协议核心设计理念与设计目标

**A2A（Agent-to-Agent）就是AI团队的标准化管理制度**，由Google 2025年4月 开源，专门解决多AI协作混乱的问题。

A2A是 去中心化Agent标准化通信协议 ，核心定位是定义一套通用的智能体交互规范。

A2A不是  替代大模型、不写业务代码，只做一件事：**统一所有AI的工作规范**。

A2A 协议的活儿  包括：AI怎么注册上岗、怎么接收任务、怎么传递消息、怎么干活、怎么返回结果、卡住了怎么办、报错了怎么记录、缺参数怎么提醒。

![1.2 A2A协议核心设计理念与设计目标](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

A2A 协议  五大核心设计目标 ：

**设计原则**

**详细技术释义**

标准化

统一消息封装格式、任务生命周期状态机、异常捕获与返回规范、结果归档标准，所有Agent遵循同一套交互范式

互操作性

屏蔽框架、编程语言、部署环境差异，LangChain、自研Agent、跨语言Agent均可通过A2A协议实现互联互通

去中心化对等通信

摒弃强制中心化调度，支持Agent点对点直接通信，总控节点仅负责编排，不垄断任务执行权限

可服务发现

通过AgentCard元数据实现技能自动曝光、服务自动注册与发现，支持动态扩容Agent节点

异步优先机制

原生支持长耗时任务、人工介入、任务中断续跑场景，适配复杂业务的异步执行需求

### 1.3 场景化通俗解读A2A协议

以「出差旅行规划 Agent」场景类比：用户需要完成「查询目的地天气+预订往返火车票」的复合任务。

在无A2A协议的场景下，开发者需要手动对接两个功能模块、适配接口、拼接结果；

而**A2A协议就是一套标准化的团队协作规范**：总控Agent作为团队管理者，通过统一的任务工单（Task）下发需求，**天气、票务专家Agent作为垂直岗位**，按照统一格式接收任务、执行处理、返回成果，全程无需人工适配接口，实现自动化协同。

## 二、A2A协议核心概念与底层原理

### 2.1 核心核心术语与工程映射

A2A协议的所有交互均基于标准化核心实体，是后续代码开发的底层地基

所有概念均对应明确的代码实体，无模糊定义 ，不用死记 ：

****专业术语****

****通俗类比****

****核心作用****

****代码对应位置****

Agent

专职员工

负责干具体活的AI（天气员、订票员）

A2AServer子类

AgentCard

员工工牌

告诉系统：这个AI叫什么、会什么、在哪运行

每个Agent的AGENT\_CARD对象

AgentSkill

岗位技能标签

标记AI能干的活，方便总控自动派单

AgentCard内skills数组

Task

标准化工单

所有任务的统一载体，带ID、状态、需求、结果

总控build\_a2a\_task生成对象

Message

用户需求消息

存储用户原始提问内容

Task内部message字段

Artifact

工作成果

AI干完活的最终结果，统一归档存储

task.artifacts字段

TaskState

工单状态印章

标记任务：待处理、执行中、缺参数、成功、失败

TaskState枚举类

AgentNetwork

员工通讯录

总控用来管理所有AI员工，快速调度

orchestrator核心网络实例

### 2.2 标准化任务状态机（核心核心）

传统AI执行任务是**黑盒**：要么跑完、要么崩了，你完全不知道中间发生了什么。

![2.2 A2A 标准化任务状态机（核心核心）](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

A2A给每一个任务加了**全程状态监控**，每一步都有记录，全程可控可追溯：

A2A协议定义了**任务状态流转闭环**，彻底解决传统任务无状态、不可控的问题，完整状态链路如下：

SUBMITTED（已提交） → WORKING（执行中） → COMPLETED（执行成功）/ FAILED（执行失败）；WORKING状态可触发INPUT\_REQUIRED（需补充信息），补全信息后重回WORKING状态

各状态详细释义： - **SUBMITTED：** 任务已由总控Agent下发，等待目标专家Agent接收处理 - **WORKING：** 专家Agent已接收任务，正在执行业务逻辑处理 - **INPUT\_REQUIRED：** 任务参数缺失、信息不完整，需要用户补充输入方可继续执行 - **COMPLETED：** 任务执行完毕，结果已存入Artifact成果物 - **FAILED：** 任务执行异常（参数错误、接口失败、逻辑报错）

### 2.3 标准化通信流程

系统采用**Orchestrator编排模式**，基于HTTP/JSON-RPC实现标准化通信，全程遵循A2A协议规范，流程清晰、可追溯：

**(1) 用户发起自然语言请求至总控Agent（Orchestrator）；**

**(2) 总控Agent通过意图识别解析需求，基于AgentNetwork匹配对应专家Agent；**

**(3) 总控Agent封装标准化Task任务，异步下发至目标Agent；**

**(4) 专家Agent执行任务，更新任务状态并返回Artifact成果物；**

**(5) 总控Agent汇总多Agent结果，结构化整理后返回给用户。**

咱们得「出差旅行规划 Agent」 跑起来后，也是这5步循环，所有代码都是为这5步服务：

**【1】用户输入自然语言需求：** （比如：明天北京去上海出差，帮我订票查天气）

**【2】总控AI分析意图：** 需要查天气+需要订票

**(3) 总控生成2张标准化A2A工单，分别发给天气AI、订票AI**

**(4) 两个AI同时并行干活，各自返回结果、标记任务状态**

**(5) 总控汇总所有结果，整理成友好话术返回给用户**

## 三、工业级多Agent系统架构设计

### 3.1 整体架构拓扑

本项目采用**去中心化 + 星型拓扑 架构**，兼顾调度效率与扩展性。

总控Agent负责编排调度，各专家Agent独立部署、解耦运行、可单独扩容迭代，完全符合微服务设计思想：

用户输入 → 总控Agent（意图识别+任务分发+结果汇总） → 多垂直专家Agent（天气Agent、票务Agent） → 独立执行任务并返回结果 → 总控Agent聚合输出

![三、A2A 工业级多Agent系统架构设计](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

架构优势：

*   模块完全解耦
    
*   支持单点迭代
    
*   支持横向扩容
    
*   故障隔离（单个Agent异常不影响整体系统运行）
    

### 3.2 规范化项目目录结构

按照「公共配置-业务模块-核心调度-环境配置」分层，符合Python工程化规范：

```
a2a_travel_system/├── common/                      # 公共核心模块（全局复用）│   ├── init.py│   ├── llm.py                   # 统一LLM配置、模型初始化│   └── utils.py                 # 通用工具函数、异常处理、参数清洗├── agents/                      # 所有专家Agent业务模块│   ├── weather_agent/           # 天气查询专家Agent│   │   ├── init.py│   │   ├── weather_tools.py     # 工具定义、Function Calling逻辑│   │   └── server.py            # A2A服务启动、任务处理核心│   └── ticket_agent/            # 票务预订专家Agent│       ├── init.py│       ├── ticket_workflow.py   # LangGraph多步骤工作流│       └── server.py            # A2A服务启动、任务处理核心├── orchestrator/                # 总控调度核心模块│   ├── init.py│   ├── intent_detect.py         # LLM结构化意图识别│   └── core.py                  # 任务分发、异步调度、结果汇总├── .env                         # 环境变量（密钥、模型地址、端口）├── .gitignore                   # 忽略配置文件、缓存、环境目录└── requirements.txt             # 精准依赖版本锁定
```

### 3.3 技术栈选型（ 适配生产场景）

**功能模块**

**技术选型**

**核心作用**

A2A通信层

python-a2a（优化版）

封装标准化Agent通信、任务状态管理、服务注册，规避原生bug

大模型调用

langchain-openai

兼容OpenAI、DeepSeek、Ollama等所有大模型接口，适配性极强

工具调用能力

LangChain Function Calling

实现智能工具选择、参数自动抽取，适配天气查询场景

多步骤推理编排

LangGraph

实现票务场景信息抽取、校验、补全、执行的闭环工作流

结构化输出

Pydantic + OutputParser

约束LLM输出格式，保证意图识别、信息抽取的准确性

异步调度

asyncio

实现多任务并发执行，大幅提升系统响应速度

## 四、基础实战：标准化多Agent协作落地

### 4.1 环境搭建与精准依赖配置

单独创建虚拟环境，避免和电脑其他项目冲突 ：

```
# 创建独立虚拟环境python -m venv a2a_env# 激活环境# macOS/Linuxsource a2a_env/bin/activate# Windowsa2a_env\Scripts\activate# 安装精准依赖（锁定兼容版本）pip install python-a2a==0.2.8 langchain-openai==0.1.12 langchain-core==0.2.30 langgraph==0.2.15 pydantic==2.10.0 python-dotenv==1.0.1
```

### 4.2 公共通用模块封装

在多Agent项目开发中，重复代码冗余、配置不统一是常见问题。

因此我们单独封装公共通用模块，将全局模型配置、通用工具方法、异常兜底逻辑统一抽离。

所有Agent均可复用该模块代码，减少冗余、统一全局规范，同时大幅提升项目稳定性和可维护性。

**文件1：common/llm.py 全局模型配置**

全局LLM配置与工具类，统一模型参数、异常处理，避免代码冗余：

下面的代码， 读取环境变量配置，初始化一个稳定的大模型，固定参数避免AI胡说八道，最后加了模型连通性测试，确保模型能用。

```
import osfrom dotenv import load_dotenvfrom langchain_openai import ChatOpenAI# 全局加载环境变量load_dotenv()# 初始化标准化大模型（固定温度0，保证推理稳定性）LLM = ChatOpenAI(    api_key=os.getenv("MODEL_API_KEY"),    base_url=os.getenv("MODEL_BASE_URL"),    model=os.getenv("MODEL_NAME"),    temperature=0,    max_tokens=2048,    timeout=30)if name == "main":    # 模型连通性测试    print("模型初始化成功，连通性测试：")    res = LLM.invoke("简要介绍A2A协议")    print(res.content)
```

**文件2：common/utils.py 通用工具函数**

**代码核心逻辑讲解**：专门清洗AI无效输出、兜底空结果，避免程序报错，提升系统稳定性。

```
def clean_empty_field(value: str) -> str:    """清洗LLM无效输出，统一空值规范"""    invalid_tags = {"未知", "无", "未提及", "null", "none", "n/a", "不详"}    val = (value or "").strip()    return "" if val.lower() in invalid_tags else valdef safe_task_result(result: str) -> str:    """任务结果安全封装，避免空结果异常"""    return result if result else "任务执行完成，暂无返回信息"
```

**文件3：.env 私密配置文件**

**核心作用**：存放密钥、模型地址等敏感信息，不写入代码，防止泄露

```
MODEL_API_KEY=sk-your-api-keyMODEL_BASE_URL=https://api.openai.com/v1MODEL_NAME=gpt-4o-mini
```

### 4.3 天气专家Agent重构（优化逻辑、增加容错）

正式进入专家Agent实战开发。

首先搭建最简单、最易理解的天气查询智能体。

该Agent是独立的微服务节点，遵循A2A标准化开发规范。

天气专家Agent   完整实现「需求解析-工具调用-结果返回-状态上报」全流程，可作为新手入门A2A业务Agent开发的模板案例。

**AI功能定位**：专门负责解析用户天气查询需求，自动识别城市、返回对应天气，自带容错。

**文件1：agents/weather\_agent/weather\_tools.py 业务核心逻辑**

**核心流程讲解**：

**(1) 预设城市天气数据库；2. 定义查询工具；3. 绑定大模型工具调用能力；4. 智能解析用户自然语言，自动调用工具返回结果。**

```
from langchain_core.tools import toolfrom langchain_core.messages import HumanMessage, ToolMessagefrom common.llm import LLM# 拓展全国主流城市天气库WEATHER_DB = {    "北京": "晴，28°C，微风，空气质量优，适合出行",    "上海": "多云转晴，25°C，东南风3级，空气质量良好",    "广州": "小雨，22°C，湿度85%，出门需携带雨具",    "深圳": "阵雨，26°C，体感湿热，短时风力较大",    "成都": "阴天，24°C，空气质量良，气候舒适",    "杭州": "多云，25°C，风光适宜，适合出游",    "南京": "晴，27°C，紫外线较强，注意防晒",    "武汉": "雷阵雨，23°C，局部有短时强降水"}@tooldef get_city_weather(city: str) -> str:    """    全国主流城市天气查询工具    :param city: 标准中文城市名称    :return: 对应城市详细天气信息    """    return WEATHER_DB.get(city, f"暂未查询到【{city}】天气信息，当前支持北京、上海、广州等主流城市")# 绑定工具至大模型tools = [get_city_weather]llm_with_tool = LLM.bind_tools(tools)def parse_weather_query(user_input: str) -> str:    """智能解析天气查询请求，自动调用工具并生成自然语言结果"""    if not user_input.strip():        return "请求参数不能为空，请输入有效的城市查询需求"    response = llm_with_tool.invoke([HumanMessage(content=user_input)])    # 工具调用逻辑    if response.tool_calls:        tool_res = get_city_weather.invoke(response.tool_calls[0]["args"])        final_msg = [            HumanMessage(content=user_input),            response,            ToolMessage(content=tool_res, tool_call_id=response.tool_calls[0]["id"])        ]        return LLM.invoke(final_msg).content    return response.content
```

**文件2：agents/weather\_agent/server.py A2A服务入口**

**核心流程讲解**：

**(1) 定义AI名片（注册上岗）；**

**(2) 重写A2A标准任务处理方法；**

**(3) 接收总控工单、执行业务、返回标准化结果、标记任务状态；**

**(4) 全局异常兜底。**

```
from python_a2a import A2AServer, run_server, AgentCard, AgentSkill, TaskStatus, TaskStatefrom agents.weather_agent.weather_tools import parse_weather_queryfrom common.utils import safe_task_result# 标准化Agent名片定义AGENT_CARD = AgentCard(    name="WeatherExpertAgent",    description="专业天气查询智能体，支持全国主流城市实时天气解析，基于LLM智能识别用户需求",    url="http://127.0.0.1:5008",    skills=[        AgentSkill(            name="city_weather_query",            description="解析用户自然语言请求，查询指定城市天气状况",            examples=["北京今天天气怎么样", "上海出差天气如何", "广州是否下雨"]        )    ])class WeatherAgentServer(A2AServer):    def init(self):        super().init(agent_card=AGENT_CARD)    def handle_task(self, task):        """A2A标准任务处理入口，增加异常捕获与日志优化"""        print("✅【天气专家Agent】接收新任务")        try:            # 安全解析用户输入            user_text = (task.message or {}).get("content", {}).get("text", "").strip()            print(f"📝 任务需求：{user_text}")            # 执行业务逻辑            result = parse_weather_query(user_text)            safe_result = safe_task_result(result)            # 标准化结果封装            task.artifacts = [{"parts": [{"type": "text", "text": safe_result}]}]            task.status = TaskStatus(state=TaskState.COMPLETED)            print(f"✅【天气专家Agent】任务执行完成")            return task        except Exception as e:            task.status = TaskStatus(state=TaskState.FAILED)            task.artifacts = [{"parts": [{"type": "text", "text": f"天气查询失败：{str(e)}"}]}]            print(f"❌【天气专家Agent】任务异常：{str(e)}")            return taskif name == "main":    server = WeatherAgentServer()    print(f"🚀 天气专家Agent启动成功 | 监听地址：{AGENT_CARD.url}")    run_server(server, host="0.0.0.0", port=5008, debug=True)
```

### 4.4 票务专家Agent重构（升级工作流、完善校验逻辑）

相较于天气Agent，票务查询预订业务更复杂，涉及多参数校验、缺失参数提醒、多步骤流程执行。

因此本Agent引入LangGraph工作流管控能力，实现结构化信息抽取、参数校验、智能容错等核心能力，是复杂业务场景A2A Agent开发的典型案例。

**AI核心能力**：智能提取出发地、目的地、出行时间，自动判断参数是否缺失，缺参数提醒用户，参数齐全模拟订票。

**文件1：agents/ticket\_agent/ticket\_workflow.py 核心工作流**

**核心流程大白话拆解**：

**(1) 定义工作流状态（存储所有需要的参数）；**

**(2) 大模型结构化提取订票信息；**

**(3) 校验参数完整性；**

**(4) 缺参数提示、齐全则返回订票结果；**

**(5) 组装可运行的工作流。**

```
from typing import TypedDictfrom pydantic import BaseModel, Fieldfrom langchain_core.prompts import ChatPromptTemplatefrom langchain_core.output_parsers import PydanticOutputParserfrom langgraph.graph import StateGraph, START, ENDfrom common.llm import LLMfrom common.utils import clean_empty_field# 定义工作流状态class TicketAgentState(TypedDict):    input_text: str    start_city: str    end_city: str    depart_time: str    output_result: str# 结构化抽取模型class TicketExtractSchema(BaseModel):    start_city: str = Field(default="", description="出发城市，无则为空")    end_city: str = Field(default="", description="目的城市，无则为空")    depart_time: str = Field(default="", description="出行时间，无则为空")# 初始化解析器与提示词parser = PydanticOutputParser(pydantic_object=TicketExtractSchema)prompt = ChatPromptTemplate.from_messages([    ("system", "你是火车票信息抽取专家，仅从用户输入中提取出发城市、目的城市、出行时间，无信息则返回空字符串，禁止编造信息。{format_instructions}"),    ("user", "用户输入：{input_text}")]).partial(format_instructions=parser.get_format_instructions())extract_chain = prompt | LLM | parser# 信息抽取节点def extract_ticket_info(state: TicketAgentState) -> TicketAgentState:    print("🔍【票务工作流】开始抽取订票信息")    res = extract_chain.invoke({"input_text": state["input_text"]})    # 清洗数据    state["start_city"] = clean_empty_field(res.start_city)    state["end_city"] = clean_empty_field(res.end_city)    state["depart_time"] = clean_empty_field(res.depart_time)    print(f"📊 抽取结果：出发={state['start_city']} | 目的={state['end_city']} | 时间={state['depart_time']}")    return state# 订票校验与执行节点def ticket_book_handler(state: TicketAgentState) -> TicketAgentState:    missing = []    if not state["start_city"]:        missing.append("出发城市")    if not state["end_city"]:        missing.append("目的城市")    if not state["depart_time"]:        missing.append("出行时间")    if missing:        state["output_result"] = f"⚠️ 订票信息不完整，请补充【{'、'.join(missing)}】后重新提交！"    else:        state["output_result"] = (            f"✅ 火车票预订成功！\n"            f"🚄 出行线路：{state['start_city']} → {state['end_city']}\n"            f"📅 出行时间：{state['depart_time']}\n"            f"💺 座位信息：二等座 08车06F（靠窗）\n"            f"💰 预估票价：¥528.00"        )    return state# 编译工作流def build_ticket_workflow():    graph = StateGraph(TicketAgentState)    graph.add_node("extract_info", extract_ticket_info)    graph.add_node("book_handler", ticket_book_handler)    graph.add_edge(START, "extract_info")    graph.add_edge("extract_info", "book_handler")    graph.add_edge("book_handler", END)    return graph.compile()ticket_workflow = build_ticket_workflow()def parse_ticket_query(input_text: str) -> str:    """订票请求统一入口"""    if not input_text.strip():        return "订票请求不能为空，请输入完整的出行需求"    res = ticket_workflow.invoke({"input_text": input_text})    return res["output_result"]
```

**文件2：agents/ticket\_agent/server.py A2A服务入口**

**核心逻辑**：和天气AI逻辑一致，注册AI身份、接收总控工单、执行订票工作流、返回标准化结果、异常兜底。

```
from python_a2a import A2AServer, run_server, AgentCard, AgentSkill, TaskStatus, TaskStatefrom agents.ticket_agent.ticket_workflow import parse_ticket_queryfrom common.utils import safe_task_result# 标准化Agent名片AGENT_CARD = AgentCard(    name="TicketExpertAgent",    description="火车票预订智能体，基于LangGraph实现信息智能抽取、参数校验、模拟订票",    url="http://127.0.0.1:5009",    skills=[        AgentSkill(            name="train_ticket_book",            description="解析自然语言出行需求，完成火车票预订信息校验与模拟订票",            examples=["订北京到上海的火车票", "明天从广州去深圳的高铁票"]        )    ])class TicketAgentServer(A2AServer):    def init(self):        super().init(agent_card=AGENT_CARD)    def handle_task(self, task):        print("✅【票务专家Agent】接收新任务")        try:            user_text = (task.message or {}).get("content", {}).get("text", "").strip()            print(f"📝 任务需求：{user_text}")            result = parse_ticket_query(user_text)            safe_result = safe_task_result(result)            task.artifacts = [{"parts": [{"type": "text", "text": safe_result}]}]            task.status = TaskStatus(state=TaskState.COMPLETED)            print(f"✅【票务专家Agent】任务执行完成")            return task        except Exception as e:            task.status = TaskStatus(state=TaskState.FAILED)            task.artifacts = [{"parts": [{"type": "text", "text": f"订票服务异常：{str(e)}"}]}]            print(f"❌【票务专家Agent】任务异常：{str(e)}")            return taskif name == "main":    server = TicketAgentServer()    print(f"🚀 票务专家Agent启动成功 | 监听地址：{AGENT_CARD.url}")    run_server(server, host="0.0.0.0", port=5009, debug=True)
```

### 4.5 总控Agent进阶重构（LLM精准意图路由+异常容错）

总控Agent是整个多Agent系统的核心调度中枢，相当于团队的项目经理。

所有用户需求的接收、意图识别、任务分发、并发调度、结果汇总，全部由该模块完成。

总控Agent不处理具体业务逻辑，只负责统筹所有专家Agent，是实现多AI协作的核心载体。

**总控AI唯一作用**：听懂用户需求、判断该派哪个AI干活、多任务并发执行、汇总结果返回用户。

**文件1：orchestrator/intent\_detect.py 意图识别**

**核心逻辑**：不用垃圾关键词匹配，用大模型精准判断用户是要查天气、订车票，还是都要，输出固定结构化结果。

```
from pydantic import BaseModel, Fieldfrom langchain_core.prompts import ChatPromptTemplatefrom langchain_core.output_parsers import PydanticOutputParserfrom common.llm import LLMclass UserIntent(BaseModel):    """标准化用户意图结构化输出"""    need_weather: bool = Field(description="是否需要查询天气")    need_ticket: bool = Field(description="是否需要预订火车票")# 意图识别流水线parser = PydanticOutputParser(pydantic_object=UserIntent)prompt = ChatPromptTemplate.from_messages([    ("system", "你是多Agent意图识别专家，精准判断用户需求，仅输出指定结构化结果。出差、旅行隐含订票需求，提及城市气象信息为天气需求，无相关需求则均为false。{format_instructions}"),    ("user", "用户需求：{user_input}")]).partial(format_instructions=parser.get_format_instructions())intent_chain = prompt | LLM | parserdef detect_user_intent(user_input: str) -> UserIntent:    """精准识别用户核心意图"""    if not user_input.strip():        return UserIntent(need_weather=False, need_ticket=False)    return intent_chain.invoke({"user_input": user_input})
```

**文件2：orchestrator/core.py 核心调度逻辑**

**全程核心流程拆解**：1. 注册所有AI员工；2. 生成标准化A2A工单；3. 异步调用AI服务；4. 并发执行多任务；5. 汇总结果返回用户；6. 全局异常容错。

```
import asyncioimport uuidfrom python_a2a import AgentNetwork, Task, Message, MessageRole, TextContentfrom orchestrator.intent_detect import detect_user_intent# 初始化全局Agent网络集群agent_network = AgentNetwork(name="TravelAgentCluster")agent_network.add("WeatherExpertAgent", "http://127.0.0.1:5008")agent_network.add("TicketExpertAgent", "http://127.0.0.1:5009")class TravelOrchestrator:    def init(self, network):        self.network = network    def build_a2a_task(self, user_text: str) -> Task:        """构建标准化A2A任务对象"""        msg = Message(            role=MessageRole.USER,            content=TextContent(text=user_text)        )        return Task(            id=f"a2a-task-{uuid.uuid4()}",            message=msg.to_dict()        )    async def call_agent_service(self, agent_name: str, user_text: str):        """异步调用单个专家Agent服务"""        try:            print(f"📤【总控Agent】调度【{agent_name}】执行任务")            client = self.network.get_agent(agent_name)            task = self.build_a2a_task(user_text)            res_task = await client.send_task_async(task)            result = res_task.artifacts[0]["parts"][0]["text"]            print(f"📥【总控Agent】接收【{agent_name}】任务结果")            return agent_name, result        except Exception as e:            return agent_name, f"❌ 服务调用失败：{str(e)}"    async def handle_request(self, user_input: str) -> str:        """核心请求处理逻辑：意图识别-任务分发-结果汇总"""        print("\n" + "="70)        print(f"👋【总控Agent】接收用户请求：{user_input}")        # 1. LLM意图识别        intent = detect_user_intent(user_input)        print(f"🔍 意图识别结果：查天气={intent.need_weather} | 订车票={intent.need_ticket}")        # 2. 组装异步任务        task_jobs = []        if intent.need_weather:            task_jobs.append(self.call_agent_service("WeatherExpertAgent", user_input))        if intent.need_ticket:            task_jobs.append(self.call_agent_service("TicketExpertAgent", user_input))        if not task_jobs:            return "🤖 暂仅支持【天气查询】和【火车票预订】服务，请输入有效需求！"        # 3. 并发执行所有任务        task_results = await asyncio.gather(task_jobs)        # 4. 结构化汇总结果        final_res = []        for agent_name, content in task_results:            final_res.append(f"### 【{agent_name}】服务结果\n{content}")        total_result = "\n\n".join(final_res)        print("✅【总控Agent】所有任务执行完毕，结果汇总完成")        print("="*70)        return total_resultasync def main():    # 打印集群信息    print("🚀 多Agent集群初始化完成，已注册服务：")    for agent in agent_network.list_agents():        print(f"✅ {agent['name']}：{agent['description']}")    orchestrator = TravelOrchestrator(agent_network)    print("\n💡 多Agent旅行协作系统已启动，支持天气查询、火车票预订复合任务")    print("💡 输入 quit 退出系统")    while True:        user_text = input("\n🧑 用户：").strip()        if user_text.lower() == "quit":            print("👋 系统退出，再见！")            break        if not user_text:            print("⚠️ 请输入有效需求！")            continue        res = await orchestrator.handle_request(user_text)        print(f"\n🤖 系统回复：\n{res}")if name == "main":    asyncio.run(main())
```

### 4.6 系统启动与全场景测试

**启动顺序（严格遵循）**：先启动所有专家Agent，再启动总控调度节点

```
# 终端1：启动天气专家Agentpython agents/weather_agent/server.py# 终端2：启动票务专家Agentpython agents/ticket_agent/server.py# 终端3：启动总控调度Agentpython orchestrator/core.py
```

**核心测试场景**

**【1】单一天气查询：** 用户输入「上海出差天气怎么样」，系统精准调用天气Agent，返回结构化天气信息

**【2】单一订票请求：** 用户输入「订明天北京到上海的火车票」，系统完整抽取参数，返回订票结果

**【3】复合任务请求：** 用户输入「我明天从北京去上海出差，帮我订票并查一下当地天气」，双Agent并发执行，同时返回订票结果与天气信息

**【4】残缺参数请求：** 用户输入「帮我订去广州的票」，系统智能识别参数缺失，提示用户补充出发城市与时间

## 五、A2A与MCP协议深度辨析

在AI多智能体开发领域，A2A和MCP是两大核心主流协议，也是新手最容易混淆的两个概念。

很多初学者无法区分二者的应用场景、核心作用和技术定位，导致项目选型混乱。

本节用通俗语言+维度对比，彻底厘清二者的区别与互补关系

帮大家掌握生产级协议组合用法。

一句话终极区分：

**MCP：让一个AI自己变强（对内、单AI能力拓展）**

**A2A：让多个AI组队变强（对外、多AI团队协作）**

二者**完全互补、无竞争关系**，是多Agent系统的两大核心底层协议，核心差异如下：

**对比维度**

**MCP协议（Anthropic 2024）**

**A2A协议（Google 2025）**

\---

\---

\---

核心定位

大模型与工具/数据源的通信协议

智能体与智能体的协作通信协议

通信主体

LLM -》 工具、数据库、文件、API

Agent -》 Agent（异构智能体）

核心能力

工具发现、上下文注入、数据读取、资源调用

任务调度、状态流转、服务发现、结果汇总

应用层级

纵向底层：支撑单一Agent的能力拓展

横向上层：支撑多Agent的集群协作

典型场景

LLM调用搜索引擎、读取本地文件、查询数据库

总控Agent调度多个垂直专家Agent协同完成复合任务

**生产级组合逻辑**：

单一Agent通过MCP协议对接各类工具，实现自身能力强化；

多个能力完备的Agent通过A2A协议实现集群协作，二者结合可搭建极致完善的多Agent系统。

## 尼恩编著   《 A2A  学习圣经》

**01章：深度解析：A2A协议 的标准化架构 .md**

**02章：深度解析： A2A 源码仓库结构与规范体系.md**

**03章：深度解析： A2A 协议 Proto 定义与三层架构深度解析.md**

**04章：深度解析：A2A协议 Task 生命周期技术详解.md**

**05章：深度解析：A2A协议 Message 与 Part 核心结构深度解析.md**

**06章 深度解析： A2A协议 Artifact 标准化产出物模型详解.md**

**07章：深度解析：A2A协议 AgentCard 智能体自描述规范深度解析.md**

**09章：深度解析： A2A协议 请求与响应 RPC 模式详解.md**

**10章：深度解析：A2A协议 流式传输（SSE）架构与核心规范详解.md**

**11章：深度解析：A2A协议 Push Notification 异步推送通知机制详解.md**

**12章：深度解析： A2A 协议多语言 SDK 架构与工程化实现规范.md**

**13章：A2A 实战：从零搭建工业级多Agent协作系统（实战进阶）.md**

本文是 第 13章。

> _尼恩提示：《 A2A  学习圣经》   原文3w字以上， 超过平台限制， 此处省略 1000字，具体请参考  免费pdf。_
> 
> _完整版本，请参考 尼恩 免费百度网盘 免费pdf ，__点赞收藏本文后__，截图 找尼恩获取_

## 说在最后：有问题找45岁老架构取经‍

尼恩提示：   要拿到 高薪offer， 或者 要进大厂，必须来点 **高大上、体系化、深度化**的答案， 整点技术狠活儿。

只要按照上面的 尼恩团队梳理的 方案去作答， 你的答案不是 100分，而是 120分。  面试官一定是 心满意足， 五体投地。

按照尼恩的梳理，进行 深度回答，可以充分展示一下大家雄厚的 “技术肌肉”，**让面试官爱到 “不能自已、口水直流”**，然后实现”offer直提”。

在面试之前，建议大家系统化的刷一波 5000页《[尼恩Java面试宝典PDF](https://mp.weixin.qq.com/s?__biz=MzkxNzIyMTM1NQ==&mid=2247497474&idx=1&sn=54a7b194a72162e9f13695443eabe186&scene=21#wechat_redirect)》，里边有大量的大厂真题、面试难题、架构难题。

很多小伙伴刷完后， 吊打面试官， 大厂横着走。

在刷题过程中，如果有啥问题，大家可以来 找 40岁老架构师尼恩交流。

另外，如果没有面试机会， 可以找尼恩来改简历、做帮扶。 

刚刚一个 [卖肥料一年，上岸 架构师  。月薪3w 比 卖肥料  香  太多！Java架构+AI架构，帮助31岁小伙伴 大逆袭](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487219&idx=1&sn=57dee3f12a3941a277b76228cdf13032&scene=21#wechat_redirect)

[成了：  卖肥料一年，上岸 架构师  。月薪3w 比 卖肥料  香  太多！Java架构+AI架构，帮助31岁小伙伴 大逆袭](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487219&idx=1&sn=57dee3f12a3941a277b76228cdf13032&scene=21#wechat_redirect)

狠狠卷，实现 “offer自由” 很容易的， 前段时间一个武汉的跟着尼恩卷了2年的小伙伴， 在极度严寒/痛苦被裁的环境下， offer拿到手软， 实现真正的 “offer自由” 。

## 下面的案例， 通过 尼恩 三高架构 +尼恩 AI架构 +尼恩 架构陪跑，  实现 P7 升级 

[小伙赶在32岁 末班车，拿到 京东P7（60w），  撬开P8（年薪100W）通道， 逆天改命了！！！](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487192&idx=1&sn=284141b9a55954d371207c667e3a2443&scene=21#wechat_redirect)

[逆袭 100万 P8。37岁 空窗6个月，靠 Java+AI双栖架构， 2个月上岸 100w年薪到手，职业重生+逆天改命！](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487170&idx=1&sn=239470e9b38c511261839c9d6bb39f5e&scene=21#wechat_redirect)

[一飞冲天， 逆 首席： 37 岁  借力 Java+AI 逆袭  首席架构  ， 年薪80W+太香了](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487126&idx=1&sn=9016db06543f328a42cd37eadfceffee&scene=21#wechat_redirect)

[31岁 /专科 升架构成功， 收10个offer 变 offer 皇帝 ！！  下一步，直冲100W](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487047&idx=1&sn=0397145548d8c1e76ee900c7e5920f4d&scene=21#wechat_redirect)

[奇迹 :   一年 涨2倍，   年薪 60W 梦想实现  。 接下来，开启 40岁之前的 年薪  200W 梦想](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247487014&idx=1&sn=5d1359a7adc7c9e46e6374597bb03138&scene=21#wechat_redirect)

[28岁/6年/被裁1年，收 3 大厂offer ， 成 大厂 皇后 。2本学历 51W 年薪，惊天 逆涨，涨薪2倍](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486987&idx=1&sn=ff977f450dd242446f228d3a6585e258&scene=21#wechat_redirect)，大厂皇后

[涨薪传奇： 18k->38K , 单月暴20K，32岁小伙伴 2个月时间年薪 翻1.5倍 ，一步登天+逆天改命](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486960&idx=1&sn=f57253a448694c32e834207381c42284&scene=21#wechat_redirect)

[低学历 传奇：29岁6年专套本，受够了外包，狠卷3个月逆袭大厂 涨 1倍， 逆天改命](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486945&idx=1&sn=f6ff6231ccf3585624161c2ef1f50fdf&scene=21#wechat_redirect)

[极速上岸： 被裁 后， 8天 拿下 京东，狠涨 一倍 年薪48W， 小伙伴 就是 做对了一件事](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486913&idx=1&sn=edd6774e9d17c39327e8dcb95fdd68d9&scene=21#wechat_redirect)

[外包+二本 进 美团： 26岁小2本 一步登天， 进了顶奢大厂（ 美团） ， 太爽了](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486904&idx=1&sn=e7c878f99ed101ebfbd1d80ec0e07401&scene=21#wechat_redirect)

[超牛的Java+Al 双栖架构： 34岁无路可走，一个月翻盘，拿 3个架构offer，靠  Java+Al   逆天改命！！！](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486848&idx=1&sn=ff43d058271b0801f84aba3f3d957855&scene=21#wechat_redirect)

java+AI 逆袭2：[：3年 程序媛 被裁， 25W-》40W 上岸， 逆涨60%。 Java+AI 太神了， 架构小白 2个月逆天改命](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486858&idx=1&sn=9cd122c18d166433b43d0952d3a7a7a8&scene=21#wechat_redirect)

[Java+AI逆袭3 ： 36岁/失业7个月/彻底绝望 。狠卷 3个月 Java+AI ，终于逆风翻盘，顺利 上岸](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486870&idx=1&sn=990a540a155cdb8254ebce6c75816882&scene=21#wechat_redirect)

[Java+AI逆袭 ： 闲了一年，41岁/失业12个月/彻底绝望 。狠卷 2个月 Java+AI ，终于逆风翻盘](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486880&idx=1&sn=a37033157c766ac5ae7c9195fe776693&scene=21#wechat_redirect)

[Java+AI逆袭5：1个月大涨2.5W，37岁 脱坑外包， 入了正编，GO+AI 要逆天了](https://mp.weixin.qq.com/s?__biz=MzIxMzYwODY3OQ==&mid=2247486885&idx=1&sn=4e26fbb093f45d437dedf14ea9b9e6c5&scene=21#wechat_redirect)

**职业救助站**

实现职业转型，极速上岸

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

关注**职业救助站**公众号，获取每天职业干货  
助您实现**职业转型、职业升级、极速上岸**  
\---------------------------------

**技术自由圈**

实现架构转型，再无中年危机

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

关注**技术自由圈**公众号，获取每天技术千货  
一起成为牛逼的**未来超级架构师**

**几十篇架构笔记、5000页面试宝典、20个技术圣经  
请加尼恩个人微信 免费拿走**

**暗号，请在 公众号后台 发送消息：领电子书**

如有收获，请点击底部的"在看"和"赞"，谢谢
