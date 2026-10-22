---
title: 拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设
source: 京东云开发者（微信公众号）
source_url: https://mp.weixin.qq.com/s/rNox2XcWvgt2zdwGlVmfAg
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-22
inbox_ref: Archive/2026-10-14-jd-haibo-ai-knowledge-base.md
---

# 拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

> **海博系统：京东海博隶属于北京达冠信息技术有限公司，是京东集团本地生活事业部自主研发的数字化中台SaaS系统，专注为本地零售商家提供全流程的即时零售数字化解决方案。海博系统从商品管理、履约管理、库存管理、员工管理、财务管理、供应链管理等商家经营环节着手 ，全链路、全场景的助力商家降本增效 ，提升经营效率，为消费者提供到家购物体验。截止2026年5月底，海博系统已覆盖780多个商家10万+门店。**

上期回顾：[拆解京东海博 AI-Native 落地保障：Harness、双 Loop、知识库与技能自主迭代实践](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502448&idx=1&sn=54249076ec825c4ae5b9f5872925b5c1&scene=21#wechat_redirect)

**

一、背景：一个天才实习生，却无法**快速理解业务全貌**

**

当我们把大模型接入日常研发流程后，很快发现一个的事实：

👉**模型就像一个天才实习生，很聪明，但它每次会话都需要对系统重新建立认知，无法快速理解业务。**

复杂系统里三个反复出现的痛：

1.**AI 读不懂系统**——在百万行、几十个子仓里乱搜，给出"能跑但和架构不兼容"的实现；调用链一断就猜。

2.**影响面靠人脑兜底**——改个字段/接口，下游谁受影响，只有少数"老人"能判断，他既是瓶颈也是风险。

3.**测试预期无处可查**——业务规则、历史约定、踩过的坑散在 PRD、聊天记录、个人记忆里。

❓ **问题：历史业务知识不成体系**

系统真正的知识（架构、规则、影响面、坑）沉在个人脑子和零散文档里，**没有结构化，也无法被 AI 稳定获取**。于是人和 AI 每次都在"从零重建 理解"。

🎯 **目标：辅助天才实习生构建快速认知能力**

知识不该困在个人记忆、聊天记录、过期文档里，而应固化为 **可搜索、可回溯、可传承、可被 AI 消费** 的组织资产。

**

二、技术选型：优先重点建设知识源头

**

❓要把上下文喂好，先得回答一个更前置的问题：上下文该如何组织、如何供给？

**三种检索范式，各有适用场景：**

*   **向量 RAG**：文档切块、按语义相似度召回，通用、接入成本低。
    
*   GraphRAG：知识建成图谱、按关系检索，擅长表达实体关联。
    
*   Agentic Search：模型自主决定检索轮次，灵活度更高。
    

三种范式各有不同的技术特点，具备各自适配的问题领域。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

适配度思考：

**目前瓶颈不在知识检索，在知识生产。**

以上三种范式重心都在"运行时如何检索得更准"，但从实践看，真正的卡点在知识源头：

*   期望是知识能够结构化
    
*   绑定关联关系
    
*   能够精确定位
    

如何维护并管理知识的全生命周期

**方案确认：**

**把"知识编译"从运行时前移到维护期。** 业界有两个和我们判断一致的思路：

Karpathy 的 **LLM Wiki**——让模型平时就把知识整理成持续维护的 Markdown 

Google Cloud 推出 **OKF**，一套面向 AI Agent 的知识包装规范

知识入库时就消化、重写、组织成互链Markdown树，运行时只剩"导航 + 摘录"，不再临时切片拼装。

**其中OKF 规范，包含关键的三点：**

*   **一个概念一个 Markdown 文件**：指标、数据表、接口、流程、领域模型原子化拆分，一文件一概念，用标题/表格/代码块提供语义锚点。
    
*   YAML 头部元数据：文件顶部一段 YAML，`type` 为唯一必填项，AI 无需通读全文即可识别文档用途与归属。
    
*   系统级保留文件：`index.md` 作为全局目录支持渐进式披露，先读目录再精准调取，避免一次性加载几百份文档撑爆 Token；`log.md` 记录变更，让知识可追溯。
    

另外支持**宽容消费**：字段不全、链接失效也不报错，自动降级为普通文档。存量资料因此可渐进式改造，无需推倒重来。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

🎯 **从“让 AI 去翻资料”演进到“让 AI 直接懂系统”。**

基于以上技术调研，采纳OKF规范，重点放在知识如何结构化生产、如何精确定位到 `文件：行号`、如何跨仓关联、如何随代码更新。推进结构化知识生命周期的闭环。

**

三、整体架构：**知识****体系如何组织**

**

基于OKF的理念和知识体系的诉求，需要设计一套适合产研体系交付形式的结构。

基于harness自动化交付体系建设的背景，结合实际工作情况，我们预期的知识库不是一堆平铺的文档，而是一个**结构化，自底向上生长**的三层结构：

**底层：项目知识 × 领域知识矩阵**

这是整座知识库的地基，也是最客观、最可信的一层，它直接由代码仓库和链路梳理构成，不是人为叠加，而是一个横纵交叉的矩阵

**中层：角色化知识层**

底层矩阵是“一份地基”，中层则在这份地基之上按角色重新组织视图，不另起炉灶，而是从同一底层矩阵派生，一份地基，多视角复用。

**上层：Skill能力**

高频动作封装成 Skill，让 AI 不用每次现学，而是直接调用一个“懂项目的动作”。这一层是知识库真正对外产生价值输出的核心的接口。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

3.1 底层：项目知识 × 领域知识矩阵

**横向（项目知识）**：单个代码仓，每个应用对应一个 `{app}-knowledge-catalog`，沉淀这个仓自己的流程、视图、领域模型。

知识目录结构定义如下：

```
yzt-erp-wms-knowledge-catalog/
```

其中 `views/`（反向索引）是做影响面分析最关键的一块：某张表、某个 Redis-key、某个 MQ-topic 各自的读写方和生产消费方，都能直接查到。

**纵向（领域知识）**：一条链路把多个项目仓的接口按业务时序缝起来，节点之间靠 MQ/JSF/调度任务等等衔接，一级域挂大链路，二级域挂细链路。

```
domain-knowledge/
```

**横向让你看清"单个系统怎么跑"，纵向让你看清"一次业务改动会横扫哪几个系统"。**

领域知识不复制项目细节，只做引用，项目知识变了，链路只更新链接层，不会两份知识打架。

### 3.2 中层：角色化知识层

同一份底层的项目/领域知识，面向不同角色、不同产物诉求**重新组织**成角色关注的内容：

**测试：业务规则 、用例、历史坑**

**产品：需求索引、功能说明、业务决策**

**运营：运营规则、配置策略、SOP**

底层矩阵本身已含研发视角（`文件:行号` 级实现与调用链），中层是在其之上为非研发角色沉淀其他特定角色层知识。

### 3.3 上层：Skill 能力层

在项目/领域/角色知识之上，用 Skill 把知识变成各岗位可直接用的能力。

常见如下：

Skill

面向谁

能干什么

`generate-cross-project-deps`

研发

扫描跨代码仓库的 JSF 接口调用与 JMQ 消息依赖，梳理上下游关系，沉淀领域知识，串联成可追溯的业务链路。

`project-analysis-tool`

研发

基于知识库进行需求分析，识别需求目标、范围与关键约束，拆解可执行点，生成规约任务及关联上下文。

`qa-test-breakdown`

测试

基于知识库中的 PRD、业务规则与历史用例，拆解测试场景，生成覆盖正常、异常、边界情况的测试用例，并关联需求与风险。

`impact`

研发/测试

基于知识库中的依赖关系、调用链路与数据流向，评估改动影响范围，按 d1/d2/d3 进行影响面分级，辅助确定回归与联调范围。

`okf-knowledge-read`

全员

按用户意图读取并解读知识库，优先返回摘要与关键结论，支持按需逐层下钻到文档、接口、链路与代码等细节。

**

四、知识初始化：历史代码结构化知识

**

在Native转型的过程中，大量团队的现实是：

👉**历史业务沉淀厚、老代码堆积多。**

新人学习，需求开发等靠人读代码、口口相传。海博AI Native转型的过程中，基于 harness 做的目标也是**全链路自动化交付，**为了实现这个能力，那我们需要各个环节，初始化历史业务的知识体系，辅助每个环节都由 AI 接力完成。

### 4.1 方案设计：为什么要分端、分角色地造知识

AI 要在某个环节真正顶用，前提是它**看得懂这个环节的上下文**：写后端要懂接口与调用链，改前端要懂页面与交互，做方案要懂业务全貌。

知识库

服务谁

解决的核心问题

后端

后端研发 / AI 编码

接口如何调用、参数与协议如何约定；链路如何流转、经过哪些服务与中间件；改动会影响哪些上游调用方、下游依赖方及数据存储。

前端

前端研发 / AI 编码

页面有哪些操作、涉及哪些组件与状态；调用哪些 API、请求与返回如何处理；需要什么权限才能访问、无权限时如何降级提示。

域（业务）

架构 / 方案设计

跨系统的业务全貌如何、核心领域对象与边界在哪；端到端链路如何串联、状态如何流转；方案调整会影响哪些系统、角色及业务场景。

通过一组skill实现以上代码仓库的知识生成：

✅ 后端（读代码 → 研发库）

**build-knowledge-catalog**：主控建库。GitNexus 索引 → 扫齐全部对外接口 →`flows/`(一接口一 md) + services/domain 等。

**build-flow-chains**：在 flows/ 之上，用「共享表 / MQ topic / task\_type」三类边聚合出业务链路`chains/`。

**generate-cross-project-deps**：跨项目 JSF/JMQ 依赖`references/跨项目依赖.md`（底层复用 project-analysis-tool）。

前端（读代码 → 研发库）

**build-frontend-knowledge-catalog**：产出`pages/`（页面操作 / 调用接口 / 权限）。

域·业务层（不读代码，读上面的 catalog 换视角派生）

**build-domain-overview**：读研发 catalog（可选吃前端 pages/ 补页面入口）→`domain-knowledge/`(业务子流程) +`test-knowledge/`(测试点)。

**build-domain-flows**：从子流程触发关系组装跨模块端到端主流程`flows/`。

关系主线

研发库(后端3 + 前端1)一次生成 → 域层零成本换视角派生业务/测试文档；后端内部 catalog 打底，chains 与 cross-deps 各补一层。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.2 后端知识生成：还原开发者真正关心的那几件事

后端接手一块代码，无非反复搞清几件事：

*   **入口**：这个功能从哪里进来
    
*   链路：调用怎么一层层流转
    
*   落点：数据最终写到哪些库、哪些中间件
    
*   影响：我改这里又会波及谁
    

**生成目标：**

这些答案本来散落在成千上万行代码里，只能靠人读、靠口口相传。

后端知识生成做的，就是把这几件事从代码里自动抽取、沉淀成可查询的知识。

**抽取规则：**

只写能从代码查证的事实，查不到的宁可留白也绝不编造，知识自动抽取铺满确定的部分，读不懂的业务语义标出来交人工补全，再抽样核对纠错。

这些事实串起来，就是一张全局调用关系网，能直接回答那句最常问的"**改动会影响谁**"，成为影响面分析的底座。

✅ 40w行代码仓库生成示例：

本项目（yzt-erp-wms 知识目录）共沉淀 约 1051 篇 知识文档，分为五大类：

**flows/ 接口与流程 —— 1001 篇**（核心主体）按类型分布：

*   HTTP 接口：584 篇（价签、供应商、储位、入库、出库、盘点、报损、要货、调拨、退货等）
    
*   RPC 接口：167 篇
    
*   MQ 消息消费：140 篇（库存、订单、商品、采购、储位等 Listener）
    
*   JOB 定时/异步任务：96 篇（采购、调拨、盘点、库存、退货等 Worker）
    
*   OpenAPI 对外接口：14 篇
    

**chains/ 业务链路 —— 41 篇** 覆盖采购、调拨、盘点、要货、退货、供应商、报损、效期等端到端业务链。

**decisions/ 架构决策(ADR) —— 3 篇** 分层架构、AOP切面与拦截器、接口分类 OpenApiType。

**domain/ 领域模型 —— 1 篇**（index.md，约 59KB 汇总）

**references/ 参考资料 —— 4 篇** 跨项目依赖、类型注册表、京东平台技术栈等。

各目录均含 index.md 作为索引导航。整体以「接口/流程明细 → 业务链路 → 架构决策 → 领域模型」逐层聚合，构成完整的 WMS 系统知识图谱。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.3 前端知识生成：还原页面背后的操作与调用

前端开发接手一个页面，同样反复要搞清几件事：

*   **操作**：这个页面能做哪些事、有哪些按钮和入口
    
*   调用：每个操作调了哪些接口、真实传了什么参数
    
*   权限：什么角色、什么条件下才看得见、点得动
    
*   协作：页面之间怎么跳、主子应用之间怎么拆分与通信
    

**生成目标**

这些同样散落在组件、路由和调用点里。前端知识生成做的，就是把这几件事从代码里**自动抽取、按页面组织成可查询的知识**。

**抽取规则**

一是**接口的真实入参**，前端常只透传一个参数对象，光看源码抽不出字段，必须回到每个调用点反推补全；二是**交互与权限**，每个按钮背后的动作、校验、显示条件都要列全，不能漏。

此外还单独理清主子应用的拆分与通信，这是微前端里 AI 最需要、也最难自己拼出的部分。

✅ 以微前端服务为例：

本项目（middleground-react-web 前端知识目录）共沉淀 **约 530 篇** 知识文档（含 18 篇 index 索引 + 512 篇内容），分为五大类：

**API模块/ 接口文档 —— 139 篇（核心主体）** 按应用分布：

*   middleground-react-web（主应用）：104 篇（商品、类目、订单、库存、促销、供应商、门店、拣货、配送、价格等）
    
*   xcGood（子应用）：35 篇（ERP商品、商品分类、商品边框、AI解析建品、美团拉品、聚合品等）
    

**组件文档/ UI组件 —— 249 篇**

*   本地 components：238 篇（middleground-react-web 151 篇 + xcGood 87 篇）
    
*   本地 hiboComponents：7 篇
    
*   私服组件：4 篇
    

**页面模块/ 页面文档 —— 101 篇**

*   middleground-react-web：61 篇
    
*   xcGood：40 篇
    

**架构总览/ 架构与流程 —— 22 篇**

*   业务流程（flows）：15 篇（建品、订单、登录、拉品、聚合、类目日志等端到端链路）
    
*   架构综述：7 篇（主子应用关系、基础设施×2、应用间通信、技术栈矩阵、跨仓库依赖）
    

**规范/ 参考资料 —— 3 篇**

*   UI 规范、开发规范、组件文档总览各 1 篇
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### ![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### ![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.4 跨项目知识生成：不重造，只缝合

跨项目知识生成，解决的是单个仓库看不到的问题：

👉**一条业务往往横跨好几个系统，没人说得清端到端的全貌。**

域知识产出，依赖底层前端/后端知识产出，"只缝合、不重造"：

把各库已经沉淀好的跨项目依赖收拢起来，沿着系统间的调用与消息，把散落的链路接成一条条端到端的业务旅程，最终拼出一张跨系统的业务大图。

✅ 以聚合配送域维度知识库为例：

共沉淀 **93 篇**知识文档（含 10 篇 index 索引 + 83 篇内容），分为三大类：

**核心交易链路 —— 25 篇（核心主体）**

*   发单 9 篇、订单管理 6 篇、询价 5 篇、状态同步 5 篇
    

**基础服务与配置 —— 51 篇**

*   base基础 10 篇（商家/门店/配送商/开发者/地址/围栏/权限等）
    
*   配送配置 11 篇（运力匹配/门店初始化/规则/巡检等）
    
*   配送搜索 9 篇（订单/配送单查询、ES同步、预警等）
    
*   钱包 10 篇（充值/扣款/冻结/解冻/流水/异常处理等）
    
*   运力网关 4 篇、商流网关 2 篇、财务数据 2 篇、开放平台路由 1 篇、业务适配层 1 篇、运营工具 1 篇
    

**业务流程与总览 —— 17 篇**

*   flows 端到端流程 12 篇（商家接入、商流接入、发单、取消、异常、状态回传、完单补偿、财务结算等全链路 + 系统全景）
    
*   根目录总览 5 篇（README、glossary、gaps、outline）
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

五、Harness知识引擎：**知识赋能研发体系建设**

**

知识库的价值不在"被单独调用"，而在**织进整条研发流水线，全程既消费、又沉淀**。

### 5.1 消费侧：全链路精准定位知识 + 按需索引代码条目

真实流程比"需求→编码"长得多，编码前会经历**多次沟通**：

```
业务定档 → 需求粗评 → 需求持续沟通确认 → 需求评审 → 研发规约生成 → 研发 TRD 生成 → 正式编码
```

**历史回召：**在整体闭环链路中，通过不同的skill技能消费知识，每一步都在**读知识库定方向 + 按需索引代码补细节**。

**过程产物：**多次沟通产物（慧记、joyspace、对话、流程图...），会被认定为非正式知识，沉淀到harness 工程的临时项目知识目录里，作为本次需求的过程资产。

👉消费知识的具体方式：/okf-knowledge-read 的按需注入

**输入**：一个问题或意图（比如"库存扣减怎么做的"）

**动作**：6 步 Pipeline 逐层收敛

**产出**：按类型分组的精准上下文

```
Step 0  识别意图   → 在问业务概念 / 服务契约 / 数据流 / 架构决策？
```

```

```

5.2 沉淀侧：两个产物 → 蒸馏 → 人工确认 → 合并

需求整体完成后，产出**两个知识来源**：

1. **master 的代码**（最终事实）；

2. **harness 工程目录下的过程产物**（规约、TRD、多次沟通沉淀）。

这两者通过`/distill-catalog`一起被**蒸馏进知识库（项目知识 + 领域知识 + 角色知识）：**

```
①master代码    ─┐
```

蒸馏三类知识：

维度

蒸馏什么

业务/项目知识

项目知识、规约/TRD 中澄清的业务规则、架构决策、影响面；补充领域术语、流程状态、系统边界、接口与数据口径、依赖关系、决策背景与取舍、变更影响范围等，用于统一业务理解与影响评估。

项目开发经验

本次踩的坑、约定、可复用方案；补充问题现象、根因分析、解决过程、避坑清单、团队约定、联调与部署注意事项、可复用组件/脚本/模板、最佳实践，用于降低重复试错成本。

人维度经验

技术选型经验、评审反馈、协作约定；补充选型背景、对比维度、决策依据与适用边界、评审意见与改进项、跨团队沟通机制、责任分工、响应时效与知识传递方式，用于提升协作效率与决策质量。

1️⃣ **人工确认：**蒸馏后不直接落库，先人工确认，再合并 master 知识库分支，AI 不擅自覆盖，人把最后一关。这样知识库的每次更新都可信、可回溯。

2️⃣ **双向闭环：**被验证的过程产物 不是一次性文档，生成时消耗知识库，完成后连同代码一起蒸馏回库。知识在"**被用"的同时"被喂养"**，越用越厚、越用越准。

### 5.3 生命周期：知识体系防腐

为解决知识过期及持续更新的场景，保证知识的新鲜度，防止知识腐烂，我们建设了以下关键流程，并推进平台化实践：

阶段

做什么

① 建档

扫代码/配置/文档生成基线，每条知识绑定负责人 + 京 ME 通道

② 蒸馏反哺

需求完成后，master 代码（自动） + harness 过程产物（主动）一起`distill-catalog`蒸馏回库（**闭环引擎**）

③ 冲突确认

蒸馏结果先人工确认，冲突则负责人拍板，确认后合并 master 知识库分支

④ 过期治理

检测过期知识：定期基于知识置信度，进行有效续期、部分失效降级、完全失效 归档

### ![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 5.4 效果验证：AB 实验证明带知识库更快更全

两个子 Agent 用**逐字一致的提示词、同一份需求、同一个代码仓、同一套方法论**并行进行研发方案设计，唯一区别是 A 组用知识库，B 组用代码 。

**结果一：更快（约 44%）。** 在一个跨仓消费链路 + 配置门禁较多的需求：

维度

A 组（记忆知识库）

B 组（仅代码）

需求分析耗时

542 秒（≈9 分钟），先通过知识库建立业务全貌，再定向核对 3 个源码文件，路径短、无效翻查少

967 秒（≈16 分钟），缺少结构化知识入口，需逐个翻查 16 个源码文件，约为 A 组的 1.8 倍

上下文来源

8 篇结构化知识 + 3 个源码文件交叉验证，覆盖业务规则、架构决策、接口链路与影响面

仅 16 个源码文件，信息分散在代码、注释、配置与命名中，需自行拼装业务语义与调用关系

现状基线可溯源性

每条标注来源（业务链 / 行号），可回溯、可复核、可审计

仅标“源码探索”，缺少业务语义与链路级引用，复核需重新翻代码

**结果二：更全（发现隐藏阻塞点）。** 差异不只在快，更在全。A 组沿跨仓链路和配置门禁，追到两个只读本仓代码难以触达的隐藏阻塞点：

*   **跨仓消费端缺自动重试**
    
*   **上线配置白名单门禁会静默失败**
    

通过多次，多需求的验证，整体知识库在提速的同时没有牺牲准确性，且更快更省token。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

六、测试实践：用例即资产，精准**测试反查**

**

为解决测试三个痛：**散在各处平台、和业务对不上、历史用例难复用**。

👉**用例即知识资产：**挂在领域知识上，可复用、可演进、可反哺，而非测完就丢。

解决方案：

`test-knowledge/` 下每个业务域都挂着角色知识 + 独立的 `cases/` 用例层（功能 / 接口 / 自动化框架三类）。用例不再游离在各个平台里，而是长在业务知识上。围绕这层知识做两件事：

**让用例成为可复用的资产，让回归范围能被精准推导。**

### 6.1 用例即知识资产：挂靠业务、双向流动、可编排

用例挂在领域知识上，就不再是测完即弃的脚本，而是可复用、可演进、可反哺的资产。

**基础用例：**

*   **挂靠业务**：用例归属到具体业务域 / 子流程，查覆盖度只要翻一层索引，不用再挨个登平台捞。
    
*   双向流动：正向 /prd-diff-testcase 从 PRD + 知识库生成用例——业务已有沉淀就取用，没有就顺手更新回库；反向 /harvest-cases 把历史用例去重、归档回库，始终以业务为锚点。一正一反，用例库越用越厚，而不是越用越乱。
    
*   可编排的自动化：自动化 = 用例原子 + chains 编排 + 变量贯穿。每个用例是可复用的最小执行单元（原子），按业务链编排成流程（chains），变量在整条链路里贯穿传递——原子可复用、链路可组合。
    

基于以上能力，实现精准测试推荐：

### 6.2 精准测试：用例挂锚点，diff 反查回归范围

用例挂业务锚点，业务代码锚点。

通过关系，能够梳理到用例涉及的接口、实现文件/方法、触及的表。这样 code diff 一进来，就能沿知识库反查出受影响的

```
git diff → 改了哪些文件/接口/表  
```

*   **精准**：只跑真正相关的用例，不用全量回归；
    
*   不漏：靠 views 反向索引 + chains 链路扩散，覆盖"改 A 表却影响 B 接口"的隐蔽影响面；
    
*   分级：必跑 / 应跑 / 建议跑，给出回归优先级。
    

### 6.3 实践结论：4 个业务组真实落地

这套能力已在海博田、订单履约、商品、base 共 4 个业务组落地。测试同学拿真实需求跑 AI 用例生成，回填两个指标：**采纳率**（采纳数 / AI 生成数）、**覆盖率**（AI 用例 / 最终用例）。挑几条代表性记录：

业务组

需求

采纳率

覆盖率

过程优化

基础交易

美食 mall 计费 & 结算

95%

100%

1. PRD、接口、代码 diff、截图等多输入源支持。  

2. 理解端到端链路、多入口多状态多端，蒸馏测试架构师能力沉淀。  

3. 异常、边界、回归、权限、链路及 AI 兜底场景覆盖的全面性。  

4. 多次生成、模板目录、功能目录去重，支持分批执行。  

5. 生成前补全、生成中约束、生成后校验，并回流知识库。

订单履约

银河 SOHO 自动门店回抛

100%

95%

海博田

达达配送联盟对接·财务

90%

95%

海博田

蜜雪商品价格优化

100%

91%

订单履约

原料供应商合同校验

90%

95%

基础交易

POS 端菜品估清

90%

90%

多个需求上采纳率 90%~100%、覆盖率最高 100%，测试同学从"从零写用例"转向"审校与补全"。

👉**AI 用例的天花板，取决于喂给它的知识是否能理解全链路的业务、是否全面和保鲜。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

七、总结与展望

**

绕了一大圈，回头看，我们其实一直在解开头那三个结：AI 读不懂系统、影响面靠人脑记、测试预期没处查。做到这里，本质上是把"AI 用不好"这个问题，从"是不是该换个更强的模型"重新定义成了"怎么把上下文经营好"。顺着这个思路，我们攒下了这么几样东西：

*   **一套理念**：Context Engineering——供给端质量决定 AI 上限
    

*   **一个架构**：AI Native 三层知识结构
    

*   **两台引擎**：GitNexus 图谱 + 依赖分析引擎
    

*   **一个闭环**：Skill 建/补/用 + 生命周期四步治理
    

*   **一组对照**：AB 实验证明带库更快更全
    

下一步朝三个方向演进：

1. **平台化**：从团队工具升级为平台服务，让更多团队低成本接入，目前正在进行中

2. **自动化**：提升 contracts / chains 层的自动化置信度，减少人工蒸馏成本

3. **知识找人**：从"人找知识"反转为"知识主动找人"，在合适时机把相关知识推给需要的人

知识库不是终点，而是让 AI 真正"懂我们系统"的起点。当上下文的供给足够扎实，AI 的每一次输出，都会更贴近这个团队真实的工程现实。

推荐阅读

[打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502917&idx=1&sn=f76ad9d10206f812387a57c83a8f377a&scene=21#wechat_redirect)

[打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502986&idx=1&sn=775388cc60bd7452f870f407bbc2893b&scene=21#wechat_redirect)

[全栈 AI Agent 从 0 到 1 ：智能播客平台开发全记录](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502584&idx=1&sn=af0eb966b148a5413443c9d6eabf5b63&scene=21#wechat_redirect)

[实现视频“边播边改”，京东开源JoyAI-Video-Edit模型，性能全球领先](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502474&idx=1&sn=4850f11082eedfd2ae2274582fe78b5a&scene=21#wechat_redirect)

**关注我们**