---
title: 高德搜索凌凌漆：搜索问题归因与经验迭代实践
source: 高德技术（微信公众号）
source_url: http://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492867&idx=2&sn=6c8abe212726d67376892576fbff6ebf&chksm=96999a83a1ee13958cd042563d5f6ab2bccedbf8cc1109069486da8ad09a070c61725a313055
source_type: article
platform: 微信
captured: 2026-11-20
registered_at: 2026-11-21
inbox_ref: Archive/2026-11-20-gaode-search-linglingqi.md
asset_ref: Assets/2026-11/wechat-gaode-search-linglingqi-5.md
---

# 高德搜索凌凌漆：搜索问题归因与经验迭代实践
专题导读

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

AI Coding 的普及，正在降低编码门槛，也让我们重新思考研发工作的组织方式。真实业务的交付，需要理解业务问题、形成明确需求，协调多个角色与系统完成实现，并验证结果是否符合预期。我们的 AI Native 探索围绕这些工作展开：让 Agent 承担更完整的任务，让人的经验、判断与实践反馈成为团队能够持续复用和改进的共同能力。

本系列分享高德搜索、推荐、广告技术团队围绕 Agent Teams 开展的工程实践。凌凌漆通过问题排查、主动走查和数据分析形成需求洞察，并持续跟进；星舰 10X 围绕研发目标组织多 Agent 协作，推进跨仓实现与交付核验；轻舟面向产品与前端场景，让更多角色参与产品构建。业务知识、工具接入、评测和云真机等能力，为这些工作提供共同支撑。

我们希望逐步贯通问题发现、需求形成、工程实现和结果验证，让人集中精力判断业务价值与关键取舍，让 Agent 持续推进执行与协同，使个人提效转化为团队可持续的业务交付能力。

本系列将按以下四个主题展开：

总纲篇：从真实任务出发，介绍 Agent Teams 的协作方式，以及支撑团队交付的工程机制[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21#wechat_redirect)  

交付篇：星舰 10X 展开复杂研发任务的协同推进、跨仓交付与知识复用[高德星舰10X：如何连接Agent能力与业务交付](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=1&sn=a330991923d9d7e0d343d1cb8dedb55e&scene=21#wechat_redirect)；星舰 Cloud Agent 介绍云端任务的执行管理与产物交付[星舰Cloud Agent：一项研发任务如何在云端运行](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=2&sn=b0c77d24d7cfeb22d41df7a8b2700463&scene=21&token=1515272922&lang=zh_CN#wechat_redirect)

数字员工篇：结合搜索与广告凌凌漆的实践，介绍问题排查、业务分析、需求洞察和主动跟进，以及经验如何经过审核进入后续任务。

现场篇：以轻舟为例，介绍产品、设计等角色如何借助 Agent 参与产品与前端构建，并结合云真机等能力检查实际体验。

本篇导读

搜索是高德最重要的场景之一，流量很大，反馈也很多，所有 VOC（Voice of Customer，用户反馈） 都需要值班同学查清楚后再答复用户。

每个 Case 背后都是一条由数据、召回、排序、Merger（合并多路结果）、实验、展示等节点串起来的链路。熟手查这样一个 Case 要一两个小时，新手可能要一两天。而且查完之后，经验留在个人脑子里，下一个人遇到相似的问题，还是从头再来。因此我们想建设一个Agent，来帮我们排查提效、沉淀经验，自动化的处理日常的海量工单。

基于此背景，我们在 Hermes Agent 基座上建设了搜索业务 Agent——搜索凌凌漆（007）。现在直接把 Case 丢给它，它自己查数据、走链路、给结论，已覆盖搜索域多类常见问题。截至目前已累计处理上万条用户提问（按独立消息计，截至26年10月），覆盖主搜、车机、详情页、销售、广告等多条业务线。

一、什么是 Hermes Agent  

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Hermes Agent 是由 Nous Research 开发的一款开源 AI 智能体，官方定位是具备自我改进能力的个人助手（见附注 \[1\]）。它通过一套记忆、技能与数据反哺的机制，把会话中形成的做法沉淀为文件，供后续任务调用：

1持久记忆。它会把环境信息、历史教训以及用户偏好记录在 `MEMORY.md`、`USER.md` 等文件中，并支持跨会话检索。

2Skill 生成/修改。任务完成后，可以把步骤与避坑方法写成 Skill 文件；后续遇到同类任务时，这些文件作为参考被加载，减少重复推理。使用过程中发现更好的做法，也可以回写更新该文件。

以上描述的是框架提供的能力，不构成效果保证：Skill 是否被正确调用，取决于其触发描述的准确度与运行时上下文是否齐备。

二、为什么选择基于 Hermes 搭建 Agent  

我们的核心目标是给业务提效，而不是“为了做 Agent 而做 Agent”。因此技术选型上，我们倾向于现成、好用、能快速组装并投入使用的方案，而非自行实现。

最初我们尝试在低代码平台之上叠加高阶能力，但在当时使用的平台版本、部署方式与任务负载下，暴露出几类难以在业务层绕开的限制：异步能力缺失，会话结束后的经验总结只能同步执行，直接劣化响应时延；上下文与工具返回值的裁剪只能靠 Prompt，缺少工具与技能层的协同优化；多轮记忆无法跨会话保留。这类问题本质上属于框架层职责，在业务层反复打补丁并非正确方向。

转向通用 Agent 框架后，LangChain / LangGraph 的抽象层级较低，把记忆、技能、上下文管理等能力留给使用方自行组装；而我们当时的诉求是"开箱即用 + 可快速组装上线"，需要更高层的封装。因此最终选择 Hermes Agent 作为底座。这个选择并非因为它没有短板——在我们的部署形态下，它有三处明确的不匹配：面向单用户设计，多用户需要额外做数据隔离；大量本地文件读写假设单实例运行，多机部署时中间文件会跨机丢失；SQLite 在大流量写入场景下存在性能上限。

据此我们定下的策略是：跟随社区版本演进、优先吸收上游能力，只有当框架问题明确影响业务效果时，才投入资源在框架层干预。（升级案例：第一版存在「用户连续发送第二条消息会打断上一次处理」的问题。社区在 v0.11.0 → v0.12.0 的 Release 说明中针对该场景引入了处理策略（见附注 \[2\]），我们升级后启用了其中的 `steer` 模式，未自行改造框架。）

三、给 Agent 足够的上下文  

归因效果不仅取决于模型能力，更取决于能否获得与当前请求对应、可核验且足够完整的证据。证据不足时，再强的模型也只能靠猜；但证据也不是越多越好，无关数据会引入噪声，超出上下文预算会被截断或稀释，越权数据则直接构成合规风险。

因此我们的做法不是「一次性把数据都灌进去」，而是围绕问题按需、逐步获取证据，并保证每条证据都能回溯到具体的请求参数、实验配置与日志时刻。判断的难度往往不在推理，而在取证。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

按需取证的落地方式，就是把链路上的数据尽量接进来，这也是凌凌漆最重要的迭代方向：从上游到下游，从在线到离线，从日志到配置，从接口数据到云真机渲染数据，从搜索业务到广告业务。原则只有一条：能拿一手数据，就不用加工过的；能用数据说话，就不靠猜测。目前凌凌漆已接入上百个数据源，覆盖引擎、日志、在线/离线存储、配置、实验、代码、业务接口、协作平台等全链路。

数据齐了，排查才能形成闭环。下面展示一个真实 Case 如何从用户反馈收敛到召回链路的排查范围。用户反馈「POI（Point of Interest，指一个具体的地理位置点）搜不出来」，并提供了 POI ID，凌凌漆的执行轨迹分四步：

•`queryPoiDetail`：确认 POI 数据态正常，处于正常营业状态；

•`simulateAppHomeSearch`：用用户真实请求参数复现搜索，拿到召回列表；

•`slim_trace` 检查：确认目标 POI ID 不在召回结果里；

•`spEngineDebug`：通过 `focus_poi_report` 确认该 POI 在召回、重排、`final` 各阶段均无位次。

四步走完，可以得到一个收敛的结论：在本次复现中，目标 POI 未出现在召回结果里，且在召回、重排、`final` 各阶段均无位次；链路日志中未发现下游过滤记录。上述四步使用的是同一组复现条件（用户原始请求参数、当时的实验配置、同一时间窗内的日志），因此结论可以定位到召回链路。

需要说明的是，这仍不等于查明了根因：POI 是数据侧未产出、召回条件未命中，还是受其他策略影响，需要进一步核查引擎侧数据与召回条件。当前给出的建议是「转引擎团队按此证据继续排查」，而不是「已定位根因」。

四、自进化迭代飞轮  

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.1 计划赶不上变化

搜索场景很复杂，涉及的业务很多，变化也很多。比如：搜索常用的接口参数超过 100 个，还经常变化，这些参数的含义、作用、影响面如何摸清，又如何及时更新，才能让 Agent 调用准确？再比如某张表新增了一个字段，用在某一场景能明显提效，这种提效点如何发现并复用？这些变化如果全部靠人力跟进，做不完，也不现实。

因此设计之初，凌凌漆就规划了自进化能力。为保证"审核前不生效"，整条链路拆成四段：

•候选生成：Agent 处理完任务后，通过 Hermes 的定时任务机制异步提取本次任务中有价值的经验，生成新的或修改已有的 Skill、Script，写入独立 Git 分支；

•隔离：运行版本只从主分支拉取技能与脚本，未合并的候选对线上不可见；

•审核：团队定期 Review 差分内容，重点判断"这条经验是否可泛化""证据是否充分""是否会把后续决策带偏"；

•发布与回滚：合并即生效，形成可追溯的变更记录，异常可整体回滚到上一个 `tag`。

同一主题的候选在审核前会先做聚类去重，避免相似经验反复入库造成冲突。需要说明的是，产出量本身不能说明系统在变好，我们更关注候选经验经审核合并的比例，以及合并后的经验在复用时是否真的提升了归因准确率。

### 4.2 自进化不是全盘采纳

Hermes 作为个人助手，自进化并没有用 Git 管理。这一点对个人用户很友好，不需要知道那么多细节。但是对于 Agent 开发者来说，无法感知细节是不可接受的。因此我们用 Git 管理 007 产出的全部自进化内容，能清楚看到哪些内容被修改。

运行一段时间后，我们印象比较深的是两个一正一反的案例。

**案例一：POI ID 格式陷阱**。用户有时会把 ID 中的「B0」写成「BO」，Agent 第一次遇到这类问题时排查失败，多方尝试后才发现是用户的笔误。经验沉淀机制把这个 Case 提取成结构化 Skill，审核合并后，该Skill可在同类问题中被检索，为Agent提供先校验ID格式的排查线索；是否适用，仍需结合本次输入确认。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**案例二：一条未通过审核的经验。** 有一次「模拟APP搜索」工具调用失败，Agent 自己改用浏览器去访问 amap.com，拿 PC 端搜索结果做判断。单看这一步挺聪明，知道一条路不通再去尝试其他路，但是 App 端搜索逻辑和 PC端搜索逻辑完全不同，PC 端结果根本不能作为判断依据。如果这条“经验”被沉淀下来，以后每次工具失败，后续判断都可能被引到错误的证据源上。这条经验最后在人工审核环节被取消了。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这说明自进化系统不仅要设计好「怎么学」，更要想好「怎么审」：错误经验一旦混进知识库，污染的是之后所有类似的决策，比没有经验更糟糕。所以人工审核不能沦为橡皮图章，自动化能替掉重复劳动，但是替不掉关键业务判断。

### 4.3 给自进化一些外部输入

很多时候，007 输出完答案之后，我们并不确定这个答案是否准确，用户不会给出反馈。因此，我们改为自己挖。最主要的着力点是工单。一个工单从创建、流转到解决，往往需要多人协同，这个过程中会留下很多关键信息，比如评论、工单流转路径。

我们每日、每周、每月都会过一遍 007 创建的工单，从中汲取人工排查的经验与思路，作为 007 经验提炼的输入。需要说明的是，工单评论与流转记录先作为线索使用，需结合最终处理结果与相关证据核验后，才会进入经验候选；单凭评论无法判断结论是否正确。

### 4.4 经验如何成为可复用资产

知识库在 007 里是一个虚拟实体，物理上分散在代码仓库、产品文档、工单、日志与数据之中。业界的主流做法是自上而下地收集文档、切片、向量化，再把代码整理成 code wiki；实践中我们遇到两个问题：一是新鲜度，部分产品文档的更新停留在数年前，与线上实现已经脱节；二是完整度，靠人力穷举业务知识必然有遗漏。

007 走的是另一条路径：把每日自进化产出的经验作为已有知识库的补充，自下而上地积累。这些经验分两个状态：任务提取的经验先进入候选池，经审核发布后才供后续任务使用；已发布经验在复用时仍需结合当前版本与数据重新核验，不替代权威业务规则。它的特点与边界如下：

•新鲜：经验来自实际任务；复用时按当前数据重新核验，发现冲突则生成修订候选，再经审核发布，避免未确认的修改直接影响后续任务。

•有场景：未被调用的知识不会进入这个集合，因此它贴近已经发生的任务场景。

•有覆盖：长期积累后，原先散落在 PRD、代码与个人笔记里的知识，会以「能被调用」的形态沉淀下来。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)_自进化知识库中的一部分节点_

五、不仅发现问题，更要解决问题  

### 5.1 单点问题：从「查到」到「发起处置」

很多问题的根因并不复杂，却是人工运维长期投入的重点，比如某 POI 被风控了。过去，值班同学查到原因后，只能提交一张工单，转给对应同学帮忙处理，一来一回就是等待。

随着建设深入，我们逐步接入了不同平台的处理能力，让 Agent 在给出结论之后，在授权范围内直接替用户发起处理申请（所有动作均需审核通过后才执行）。例如：

•风控问题：直接在平台提交解封工单；

•增删标签、调整权重问题：直接在对应平台提交调整工单。

Agent代为完成材料整理与申请提交，减少用户在多个平台之间的重复操作；但提交工单只证明动作已发起，不证明问题已解决，后续仍需跟踪审批、执行与结果验证。

### 5.2 共性问题：从「单个 Case」到「系统机会」

单 Case 排查跑顺之后，我们很自然地往前想了一步：查过的这些问题里，哪些属于同一类？背后是否存在系统性的优化机会？比如：

•近期用户反馈 POI 搜不到，不少 Case 的根因高度一致，多为被风控屏蔽。那么风控策略本身是否存在问题？是否有优化空间？

•「oppo」「vivo」品牌搜索存在某个体验问题，其他品牌是否也存在类似问题？能否提前发现并修复？

为此，我们会定期扫描存量 Case 做聚类归因，提炼产品层面的优化点。为避免把"建议"说成"已落地"，这类产出统一按四个阶段跟踪：已形成建议（有聚类证据与影响面估算）→ 已创建需求 → 已开发（由 AI Coding 平台实现）→ 已上线并验证（灰度或全量后指标改善）。只有第四段才计入有效产出。

六、底座复用：从排查到更多场景  

Case 排查是第一个落地场景，但不是唯一能支撑的场景。目前已观察到三类自发使用：

•新人熟悉业务：新同学的第一道障碍往往不是代码而是黑话与全局结构——`qline` 是什么、召回与排序在链路的哪一环、自己负责的位于链路的哪个环节。现在他们可以直接提问，得到的是带真实代码位置、配置出处与数据通道的解释，相当于由一位熟悉链路的同学带着走一遍。

•产品逻辑追溯：产品同学接手老功能时，需要回答"它原来怎么跑的、为什么这样设计"。这类信息分散在代码实现、`commit` 决策痕迹、实验平台上挂载的参数与产品文档中，恰好都在 007 的数据范围内，可以从一个产品逻辑出发追到引入它的提交与当前受控参数。

•销售提效：销售关心的是"客户广告投不出去，是不是搜索的问题、怎么提高曝光"。过去只能靠猜或提工单排队；现在可以结合已接入的数据辅助排查这些因素，证据不足时继续查证或转人工确认，拿到可执行的建议。

三个场景的提问方式与输出形态不同，但复用的是同一套数据接入与业务 Skill；场景可以继续增加，底座维护一份。

结语  

回头看，007 走到今天靠的不是更强的模型或更巧的框架。模型和框架层面的问题，社区在持续解决；我们的精力主要花在两件事上：把数据接进来，让回答有据可查；把经验审严，让知识不被污染。

这两件事里，后者更重要。错误经验一旦混入知识库，影响的不只是这一次答错，而是之后所有相似的决策。

Case 排查只是第一步。在走查发现问题、问题分析、聚类建议和研发协作等环节已开展实践，完整的上线验证闭环仍在推进，也已有同学把它用在排查之外的地方。下一步，我们还会继续探索更多场景与能力，让 007 从「帮人查 Case」走向「帮业务解决问题」。

附录

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

\[1\] Hermes Agent 项目介绍（README），NousResearch/hermes-agent：https://github.com/NousResearch/hermes-agent/blob/main/README.md

\[2\] Hermes Agent v0.12.0（2026.4.30 发布）Release 说明：https://github.com/NousResearch/hermes-agent/releases/tag/v2026.4.30

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下期预告

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下一期也是本系列的最后一期，我们将介绍轻舟 Agent。从需求发起、Agent 协作到云真机验证，展开需求如何落实为代码与构建产物、如何在真实设备上检查效果，以及需求确认、验收与发布中仍需保留哪些人工判断。

往期推荐

[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21#wechat_redirect)

[高德星舰10X：如何连接Agent能力与业务交付](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=1&sn=a330991923d9d7e0d343d1cb8dedb55e&scene=21#wechat_redirect)

[星舰Cloud Agent：一项研发任务如何在云端运行](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=2&sn=b0c77d24d7cfeb22d41df7a8b2700463&scene=21#wechat_redirect)

#高德 #高德技术 #AI Native #搜索凌凌漆 #问题归因

_**END**_