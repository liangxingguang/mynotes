---
title: 高德星舰10X：如何连接Agent能力与业务交付
source: 高德技术（微信公众号）
source_url: http://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=1&sn=a330991923d9d7e0d343d1cb8dedb55e&chksm=96999b40a1ee1256f0b25d879f88216f367b3cb725697a269e4d33a4645659c74c02c8dfe18d
source_type: article
platform: 微信
captured: 2026-11-20
registered_at: 2026-11-21
inbox_ref: Archive/2026-11-20-gaode-starship-10x.md
asset_ref: Assets/2026-11/wechat-gaode-starship-10x-2.md
---

# 高德星舰10X：如何连接Agent能力与业务交付
专题导读

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

AI Coding 的普及，正在降低编码门槛，也让我们重新思考研发工作的组织方式。真实业务的交付，需要理解业务问题、形成明确需求，协调多个角色与系统完成实现，并验证结果是否符合预期。我们的 AI Native 探索围绕这些工作展开：让 Agent 承担更完整的任务，让人的经验、判断与实践反馈成为团队能够持续复用和改进的共同能力。

本系列分享高德搜索、推荐、广告技术团队围绕 Agent Teams 开展的工程实践。凌凌漆通过问题排查、主动走查和数据分析形成需求洞察，并持续跟进；星舰 10X 围绕研发目标组织多 Agent 协作，推进跨仓实现与交付核验；轻舟面向产品与前端场景，让更多角色参与产品构建。业务知识、工具接入、评测和云真机等能力，为这些工作提供共同支撑。

我们希望逐步贯通问题发现、需求形成、工程实现和结果验证，让人集中精力判断业务价值与关键取舍，让 Agent 持续推进执行与协同，使个人提效转化为团队可持续的业务交付能力。

本系列将按以下四个主题展开：

总纲篇：[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21#wechat_redirect)  

交付篇：星舰 10X 展开复杂研发任务的协同推进、跨仓交付与知识复用；星舰 Cloud Agent 介绍云端任务的执行管理与产物交付。

数字员工篇：结合搜索与广告凌凌漆的实践，介绍问题排查、业务分析、需求洞察和主动跟进，以及经验如何经过审核进入后续任务。

现场篇：以轻舟为例，介绍产品、设计等角色如何借助 Agent 参与产品与前端构建，并结合云真机等能力检查实际体验。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

本篇导读

用Claude Code、Codex这样的AI编程助手做一个Demo，是很容易获得成就感的体验：把想法描述清楚，Agent就能搭起页面、补上逻辑、运行测试，再根据反馈不断修改。过去需要投入不少精力才能验证的想法，如今有了更轻巧的起点。

可一旦进入真实业务，情况就复杂起来。一个看似普通的需求，可能跨过几个仓库，依赖团队内部的约定，还要兼容已有链路。Agent能够写代码，工程师却仍需要不断补充背景、提醒影响范围、检查测试是否覆盖业务，再确认改动有没有真正进入交付流程。

**这些人工介入，究竟在补什么？其中哪些工作可以沉淀为平台能力，让下一次不必从头接力？**

我们在星舰10X的建设中，围绕这个问题组织知识、经验和执行过程：把可重复的查证、交接与检查交给系统，把需要业务判断的取舍清楚地交到人面前。

把一次业务需求组织成交付过程  

真实研发中的人工工作，经常同时承担三种责任：提供Agent尚不知道的业务背景，把分散的改动对齐到同一个目标，以及根据结果决定能否继续推进。只给Agent更多文档，难以覆盖后两项；只把流程串起来，也无法弥补业务理解上的空白。

星舰10X围绕这些责任，把成熟Coding Agent的执行能力接入团队的研发过程。用户面对的是持续承接目标的星舰助手；平台用任务和工作流组织阶段、产物及必要决策，再由执行Agent在相应仓库和运行环境中完成具体工作。代码评审、测试和发布结果继续来自团队已有的研发系统。

星舰助手通过主会话承接目标，具体执行可以直接展开，也可以组织成任务。任务执行中，用户可补充条件、纠正方向；问题和产物返回同一主会话，供继续查证、调整或接管。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图1　星舰组织目标、上下文和执行；补充与纠偏进入执行过程，问题和产物返回主会话。图中为职责关系。

在这套结构中，知识库和长期记忆（Memory）共同参与上下文组织。知识库给出业务概念、模块关系和源码入口，帮助Agent确认“这次任务面对什么系统”；Memory保留曾经形成的工作方法，提醒它“遇到这类问题可以先检查什么”。执行Agent拿到目标、约束与相关材料后，仍需调用工具核对当前事实。

平台提供的配套也要具体落到任务中：**业务工具**让Agent能查仓库和相应环境的配置；**执行约定**说明代码与配置要交齐、保存后要回读、候选与发布结果要分清；**任务接续**把用户的新决定送入正在执行的任务。技术查证与代码实现由Agent完成；业务规则、范围取舍与授权决定由相应人员确认。

需要人工决定时，问题要回到原目标：是业务规则尚未明确，还是范围发生变化，或到了实际授权环节。已有材料中的答案和能够自行查明的技术问题，则应先完成查证。例如，实验覆盖范围尚未确定时，需要业务方作取舍；参数是否实际生效，则应结合配置和实际结果核对。

### 知识和经验怎样进入每一步

一项需求进入星舰后，Agent先理解目标与约束，借助知识入口识别涉及的业务链路和仓库；形成方案时，将影响范围、共享约定与验收要求一起交给执行环节。实现过程中，执行Agent结合当前代码继续查证，产出变更并进行验证。交付阶段再分别检查评审、合入与发布结果，给用户一个与约定目标对应的结论。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图2　上下文参与当前交付，任务中的发现与经验再为后续交付积累。知识订正与经验提炼各有路径。

这一过程也产生两类积累。发现模块解释与代码不一致，要回到知识库订正；多次任务中形成的有效方法，则可以进入Memory提炼。二者再次被后续任务使用时，知识提供事实入口，经验提供检查线索。下面展开这两项能力，以及连接知识使用与修订的评估闭环。

让知识沿着问题展开  

在星舰的交付过程中，知识库首先参与业务理解和方案形成。面对“跨仓调整缓存默认规则”这样的需求，Agent需要先知道请求如何流转、哪些模块共享同一规则，再决定修改范围。熟悉业务的工程师通常先在脑中找到链路，再沿模块进入源码；我们希望知识库也提供这样的阅读路径。

在早期建设中，我们把知识分成两类。**仓库知识库**说明模块职责、调用关系和代码入口；**跨域业务知识库**放在团队的知识平台KBase中，补充术语、业务规则、跨系统架构和操作流程。一个回答“系统实际怎样实现”，另一个补充“这项业务为什么这样约定”。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图3　两类知识按问题组合使用。KBase补充业务背景，具体实现回到代码与配置核对。

### 四层结构决定读到哪里

仓库知识采用**渐进式披露**，分为项目入口、架构总览、模块摘要和源码四层。入口交代职责与导航，架构说明链路关系，模块摘要提供输入、输出、关键逻辑和源码指针。Agent根据当前问题决定读到哪层；需要确认执行顺序、条件分支或副作用时，再进入源码与配置。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图4　先定位，再按问题展开；发现分支依赖后，补查相关模块与配置。

**真实案例 01 / 渐进式披露**

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图中把项目入口与架构总览合并为”全局入口”，三列表示信息深度，连线表示Agent的阅读路径。它先定位翻页模块，再按摘要指针核对源码；发现排序与缓存的依赖后，返回相关摘要，再查链路配置。渐进式披露也支持这种跨模块往返，让每一次展开都服务于当前问题。

为使这条路径成立，每份模块摘要都应独立可读，并提供继续查证的入口。我们允许重复少量必要背景，说明职责、输入输出、关联模块和源码指针；复杂细节留在源码，控制摘要体积与维护成本。跨仓时也沿用同一原则：先确认接口约定，涉及内部实现时再下钻，最终判断由当前代码与配置支撑。

### KBase也要有入口和路由

代码之外还有另一类问题：某个业务名词意味着什么，一条数据链路跨过哪些系统，某项规则由谁维护。我们把这类跨域知识组织到KBase时，也沿用了渐进式披露的原则。

空间入口先用一句话说明覆盖范围，再按主题组织“链接＋短摘要”，并增加问题到页面的导航。例如，理解名词先读概念页，分析跨系统影响先读链路页，需要核对规则时再打开原始业务文档。入口承担选路，主题页提供解释，原始材料保留依据。

两类知识发生分歧时，还要区分“当前实现”和“期望规则”：代码与配置说明前者，业务负责人确认后者。让Agent看见这项差异，才能提出需要修改或澄清的事项，避免将一份业务说明直接当作已经生效的系统行为。

让知识能被检查，也能被订正  

知识库建好之后，代码还会继续变化。文档能打开、目录很完整，不代表其中的解释依然准确。在知识库建设阶段，我们把质量检查落成两条互补路径：**脚本负责可机械核对的信号，Agent结合源码审查语义，工程师决定哪些发现进入正式知识。**

轻量检查由脚本核对入口和引用是否可达、知识对应的代码版本能否定位，以及关联源文件的变化情况；这些信号提示哪里值得进一步检查。深度审查则让Agent沿源文件指针读代码，逐项核对职责、条件分支、默认行为和上下游约定。程序检查与语义审查回答不同的问题，因此不能用一个结构分数替代内容准确性。

一个实际评审发现很能说明区别：知识库的版本文件虽然存在，里面写的却是普通版本字符串，无法定位到代码提交。修订后，它指向了可解析的Git提交，文档有了可核对的代码基线。这个修复解决的是“按哪个版本检查”，内容是否正确还要继续回到实现。

**真实案例 02 / 知识订正**

**修正字段归属，也补齐被遗漏的消费者**

**原文解释：** 把`customoperator`写成了`queryparams`的子字段，还漏掉了分类信息在策略判断、请求构造等位置的消费。

**源码事实：**`customoperator`实际属于`QRLine`这一结果行结构。字段归属和消费范围，都需要沿实现重新核对。

**订正结果：** 修订回到原知识文档，纠正字段归属，补齐已核实的消费者与源文件指针，并在入口保留覆盖范围。下次分析字段裁剪或结构调整时，Agent就能沿修正后的消费地图继续查证。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图5　程序检查发现结构与版本问题，Agent补充语义核对；知识修订经工程师裁决，接回原文与知识入口。

日常使用也接入同一条反馈路径。Agent在任务中发现字段语义、调用边界或文档错误时，先留下一条带来源的候选；收尾时由工程师确认依据、适用范围与维护位置，再决定采纳、暂存或归档。稳定、可复用的内容进入对应知识文档，批量检查负责提醒遗漏、重复和陈旧候选。

**捕获发现与升级知识分开，让检查能够融入交付过程。** 捕获阶段尽量轻，不打断当前任务；升级阶段再集中核对证据。修订落回原文和入口，使下一次沿同一路径阅读的Agent能够遇到修正后的解释。

Memory把工作经验带到下一次任务  

知识库提供当前系统的事实入口，Memory保留另一类积累：遇到类似问题，先查哪里、怎样验证、哪些结论还不能下。星舰希望让个人在真实工作中形成的好方法，经过提炼后也能成为其他人的起点。

这条链分为三层：会话层保存可追溯的经验候选，个人层从多个独立任务中提炼稳定做法，共享层选择可迁移的实践，清理敏感信息后提供给团队。使用时，个人摘要只导航本人的会话与个人经验，需要细节再读取；共享经验独立提供，没有个人历史的用户也能获得参考。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图6　上方展示经验分层与使用，下方为方法提炼示意；个人摘要与共享经验分别提供。下文展示已发生的跨用户经验复用。

**真实案例 03 / Memory跨任务复用**

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这个案例展示了跨用户的经验复用：来自实际开发的”构建侧与运行侧需要同步登记”经验，经共享提炼后，进入另一位工程师的分析任务，并被转化为具体预检建议。Memory让一次任务中形成的检查方法，成为团队后续任务可以采用的起点。

经验提炼与更新需要保留来源、适用条件和验证状态。同一来源的更新覆盖原候选，不把重试算成独立验证；个人层从至少两个独立任务语境中提炼稳定做法，共享层再选择可迁移的实践。保留下来的既有检查方法，也有它成立的条件，供后续任务结合新情况判断。

个人历史与团队共享分别提供：个人记忆按执行用户隔离；共享经验由系统自动提炼、脱敏，结构与敏感内容等校验通过后自动发布，校验失败保留上一版。读取Memory不改变仓库或工具权限，具体行动仍需结合当前需求、代码和工具结果复核。

一项跨仓改动怎样推进到合入  

某个搜索业务需求要统一两仓的默认缓存键前缀：请求／解析侧修改回退值，聚合侧同步数据源默认值和测试常量。任一侧遗漏，都可能让两端找不到同一份数据。

代码可按仓实现，默认规则和发布安排却必须共同对齐。星舰把这一约束写进整体方案和逐仓产物，让后续实现与验证围绕同一目标推进。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图7　双仓缓存默认规则调整的开发与回归路径。

图中通过与跳过分别统计，跳过项未执行，不计为通过。这些结果反映对应提交的存量回归情况，不单独证明本次需求的验收覆盖或真实链路效果。星舰汇总了两仓对应提交的构建与存量回归结果，两份代码评审请求（Merge Request，MR）均已合入。工程师负责方案与代码评审、合入和上线发布；本文核实到MR合入，正式发布及真实链路效果未纳入本例结论。

### 从一次交付，到下一次复用

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一次任务的价值，不止于交出代码。知识修订和经验提炼让本次查证成为后续任务的起点；主会话与执行任务的接续，则把背景、决定和结果持续连在一起，让工程师围绕关键业务取舍与交付判断参与。

### 从具体案例，到研发支撑

2026年4—9月，已核验记录覆盖1,030项开发任务，其中至少676项形成或更新了MR，有MR产出的任务占比至少65.6%，共对应740条去重代码评审。7月，这一占比达到单月峰值94.2%：172项任务中162项有MR产出，形成或更新了175条代码评审。这些记录覆盖业务研发与平台建设，体现了星舰对实际研发工作的支撑。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图8　MR产出以形成或更新代码评审计，反映任务的评审产出；合入、上线和业务验收分别确认。

统计按独立开发任务计数，子流程和同一任务内的重试不另算；MR按唯一评审ID去重，多次更新只计一条，一项任务可对应多条MR。未核验到MR产出的任务不直接判为失败。

一次Demo让我们看到Agent能够完成什么，真实业务则要求把目标、背景、约定和结果持续接在一起。星舰10X把知识的组织与订正、经验的提炼与复用，放进同一条需求交付过程：让Agent有据可查、有方法可参考，也让人的判断能够落到后续行动中。这是我们持续推进稳定交付的工程方向。

后续改进还要回到同类真实需求中检验：交付质量保持时，能否减少重复解释、人工接手和同因返工。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下期预告

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下一期将推出凌凌漆系列的两篇实践。广告凌凌漆篇围绕任务的持续执行、工程上下文管理与可信验收，通过定向测试通过却仍不能宣布需求完成的案例，说明验收结论需要哪些证据；搜索凌凌漆篇则从“附近的店为什么搜不到”这类反馈出发，展开搜索链路上的取证与归因，以及排查经验如何经过审核、用于后续任务。

往期推荐

[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21#wechat_redirect)

#高德 #高德技术 #AI Native #星舰10X #知识工程

_**END**_