## 

 Datawhale干货 

******开源项目：Co-Sight Harness******

在一个 2000 人规模的研发团队里，让 Agent 稳定跑完一条 200 多个步骤、跨数小时的生产级工作流，并且跑完能直接交付上线！

刚刚，中兴通讯在 GitHub 上开源了支撑这套研发工作流的底层系统：Co-Sight Harness。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

过去一年，业界对 Agent 落地形成了一个共识：Prompt → Context → Harness → Loop，决定长链路能不能稳定的关键，在于模型外的那层 Harness。

为了撑起 2000 人的研发协作，Co-Sight Harness 从业务、执行、资产、证据四个层面做了系统改造。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这篇文章结合中兴内部三个真实业务域的落地数据，拆解在大规模团队和超长链路下，一套企业级 Harness 是怎么设计的。

一、200 步长链路的衰减

中兴内部的业务域 A 是一个通信协议研发场景。整条工作流包含三大阶段、39 个以上子 Skill、11 个原子活动，拆解下来有 200 多个关键步骤。跑完一趟要好几个小时，涉及大量通信领域的专有知识，而且很多中间产物的验收标准比较模糊。

在这么长的链路上，单步成功率的一点小波动都会被指数级放大。算一笔账，就算每一步有 95% 的把握，连着跑完 10 步，成功率乘下来也就剩 60% 左右了。

落到改造前的实测数据上，这条链路在无人干预下的任务完成率只有 50%。也就是说，一半的任务跑到中途就会卡死或跑偏，必须靠工程师手动接管。

这也是在长链路工程里，光靠换一个更强的底座模型效果有限的原因。200 多步串行的研发链路的交付，取决于整条链路上最薄弱的环节和上下游的交接质量。

除了链路长，2000 人规模的团队还会遇到人与人之间的水平差异问题。

不同工程师在写需求意图、配控制数据、做结果验收时水平参差不齐。团队也不太可能给每个普通工程师都配一个专家在旁边盯着。

这也决定了企业级系统和个人工具的发力点完全不同：一个高手提效 30%，只作用于他自己的那几个环节。但如果能靠一套系统把整个团队的交付下限从 60% 拉升到 90%，收益就会覆盖 2000 人和全部的 200 多个步骤。团队规模越大，提升下限的价值就越高。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

二、2000 人协作的真实痛点

同时，2000 人一起用 Agent 考验的是协作边界。

团队拉取了业务域 A 的 Agent 插件仓库做过一次 Git 提交分析。在 23 天时间里，11 位作者一共提交了 67 次代码，改动了 804 个文件，集中暴露出四个问题。

首先是公共代码会被反复改坏。大家提交的代码里，有 40% 是在改底层的共享 Skill，其中 45% 在改检索逻辑，35% 在改规则约束。因为缺乏统一边界，A 工程师为了调通自己的场景改了公共检索规则，B 工程师的场景紧跟着就挂了。

其次是换个需求就得重头再来。统计发现，运行时数据的改动占了总变更量的 62%。每次来一条新需求，工程师都得手动重建大半个知识库和配置文件，冷启动成本很高。

第三个问题是质量门禁成了摆设。仓库里定义了 12 个审查规则文件，打开一看，有 7 个文件是 0 字节的空文件。因为流程强制要求有审查文件才能跑，业务人员为了图省事跳过拦截，干脆建个空文件应付检查，而系统遇到空规则就自动放行了。

最后一个问题是经验留存不下来。各个团队在 Hook 里修修补补解决的都是相似的基础设施报错，但这些修复散落在各自的分支里，换个新团队接手，同样的坑又得从头踩一遍。

这四件事本质上都是因为缺少一套共享的、带版本管理的控制数据。为了解决这些问题，团队从业务拆解、流程执行、知识资产和评测证据四个层面做了改造。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

三、业务层的改造

业务层的第一个动作是拆分任务，但不是按代码模块拆，而是按每个步骤的特征来拆。

团队用五个维度给那 200 多个步骤挨个打分：大模型处理难度、自由发挥空间、结果好不好验收、对检索的依赖程度，以及对通信专业知识的依赖程度。统计下来，高难度步骤占 58%，高检索依赖占 50%，高专业知识依赖占 67%。

打完分后，不同步骤走不同的处理路径：容易验收、逻辑固定的环节，直接写成代码脚本去跑，不消耗大模型算力；真正复杂的环节，也不再用一个大包大揽的单体 Agent 硬扛，而是拆成 11 个专职的子 Agent，按协调（Orchestrator）、执行（Worker）和审查（Review）分成三层。生成方案和审查结果完全隔离，光靠这一步拆分，任务准确率就提高了约 10%。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

不过，把任务拆成十几个子Agent后，如果每个新场景还靠人工去一条条写 Prompt、配交接规则，搭建成本就会非常高。

中兴的做法是开发了一个 `agent-genesis` 组件，直接把「配流程」做成了自动化流水线：把工程师口头描述的业务需求，自动编译成一整套标准化的控制文件，涵盖项目概要、路线图、执行计划、子 Agent 拆分方案、验收标准、状态模板和测试用例。

这里面有个很关键的设计：负责「独立验证」的 Agent 运行在单独的隔离上下文中，系统严禁它查看前面的设计方案文档，防止验证器顺着设计方案的思路去打分，避免「自己改自己的作业」。

有了这套自动编译机制，搭建一个新场景的时间从原来的 2-4 小时压缩到了 5-10 分钟，接入第 41 个场景的耗时和第 1 个基本没区别。在大团队里，把接入门槛压低，本质上就是在消除不同工程师之间的配置水平差异。

四、执行层的改造

执行引擎 `Drive` 的设计前提很明确：业务流程不能建立在「指望大模型自觉配合」之上。

团队用声明式工作流、状态机和底层 Hook 把流程固定了下来。大模型在运行中只能修改它产出的业务文档或代码，无权改动流程状态；所有控制数据全部保存在对话上下文之外的本地文件里，由系统统一接管。

任务启动后，会按分析、规划、执行、评估、核算五个固定岗位流转。生成与评估完全隔离，一旦评估环节发现产物不合格，系统就会带着具体的报错证据，直接把任务打回分析阶段重做。同时，系统会按步骤间的依赖关系自动分批并行，每跑完一批强制对账，支持从任意断点续跑。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

在底座大模型完全没换的前提下，仅靠改变这套运行时的控制结构，业务域 A 那条 200 步链路的无人干预完成率就从 50% 提升到了 100%。端到端总耗时从 440 分钟压缩到了 159 分钟，缩短了 64%（其中需求分析从 169 分钟降到 56.4 分钟，子系统设计从 114 分钟降到了 26.5 分钟）。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

在做多卡模型适配的业务域 C 里，这套执行机制也跑通了跨人移交。多卡适配涉及推理框架修改、算法开发与性能压测，以前人工串接跑一趟要 1 天；换了一位非原作者的工程师接手后，花 7 天完成配置切换，随后在门禁审查下 5 小时就能自动跑通并支撑了 V0.5 试用版发布，验证了这套控制结构可以被不同团队直接接管复用。

五、资产层的改造

业务域 A 的另一个问题出在输入端：早期知识库检索的平均召回率只有 56%，将近一半的必要背景知识没捞出来，直接限制了输出质量。

排查后发现，查不准的原因不在检索算法，而在语义断层。一线提需求时写的是高度概括的业务语言，而底层知识库里存的却是具体的代码和研发术语。两边不在同一个抽象层级上，直接拿业务需求去搜研发文档，很难匹配上。

为了接上这个断层，团队在资产层搭了一套运行态检索与生产态构建双引擎。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

任务运行时，检索引擎会先做一步语义对齐，把用户的业务语言翻译成对应的研发术语；接着再去挖历史相似经验、跑渐进式全文检索，最后统一汇总返回。而在平时，构建引擎会自动从每次跑完的任务记录里挖掘有效经验，补全格式后写回知识底座，让知识库越用越全。

加上这套双引擎后，业务域 A 的整体检索召回率从 56% 涨到了 91.67%，生成内容的综合 F1 分数也从 68% 提到了 91.25%。具体到三个核心研发活动上，场景分析的召回从 45% 升到 93%，特性域变更从 49% 升到 92%，子系统变更从 74% 升到了 90%。

同时，为了确保不漏掉关键信息，系统适当放宽了检索召回口径，这也带来了一个正常的工程代价：子系统变更这一项的检索精确率，从 72% 小幅降到了 70%。

六、证据层的改造

证据层改造的目标是「修改之后怎么判定有没有改对」。

团队最早的评测系统 `v1.0` 用的是 7 个通用维度加裁判大模型打分。实际跑下来发现，200 多步的长链路只看粗粒度总分，一旦不及格，工程师根本定位不到具体Bug在哪一步。

为此，团队把评测改成了三级指标下钻机制：从顶层的任务总分，往下拆到阶段里程碑得分，最后一直定位到具体的某一个 Step。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

围绕这个单步定位目标，评测系统接着迭代了两代。`v2.0` 把老专家的审校规则转成固定的召回率和精确率公式，保证打分可计算、可复现；到了 `v3.0`，系统直接在每个活动节点上埋点，拿中间产物跟人工核对过的标准答案（Golden Set）做比对，当场就能抓出是哪一步出了偏差。

定位到具体步骤后，在 200 多步的系统里改规则调优，很容易出现「修好了当前步骤、却改坏了其他环节」的情况。团队在多轮调优中也遇到了这个问题：召回率从 45% 起步，第一次修改后反而掉到了 43%。

为了拦住这种倒退改动，证据层在合入环节加上了硬门禁：任何修改只要回归测试不通过，直接拦截不准合入；同时所有规则改动必须经过审批，支持一键回滚。在这套防回退机制下，后续几轮调优才把召回率稳步提升到了 `52% → 78% → 87% → 93%`。

这与 DSPy、GEPA 这类业界常见的算法层自动优化工具正好互补：DSPy 负责自动改提示词去冲高分，而证据层负责提供底层可靠的评测标准。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

写在最后

除了在通信协议域跑通，这套系统也在软件研发领域的业务域 B 验证了跨团队移交能力：两位非原班人马的工程师结对 4 天就完成了接管。一行 Harness 底层代码没改，一周内掌握全流程，将运行稳定性从 50% 提升到 90% 并上线。在整个 2000 人规模的团队里，组织级任务的整体成功率也从 60% 提到了 90%。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

目前，中兴通讯已将 Co-Sight Harness 按 Apache 2.0 协议开源在 GitHub（`ZTE-AICloud/Co-Sight` 仓库下的独立目录），随仓库放出了需求编译 `agent-genesis`、执行引擎 `drive`（含 817 个测试）、零依赖评测器 `GoldEval`、`skill-optimizer`、`cosight-viewer` 等 8 个核心组件。

使用时，它可以作为插件直接装进 Claude Code 或 DSH 运行时。官方提供了一键安装脚本，产物包自带全部依赖，不需要装 pnpm 或构建工具链，配好自有的模型 API 端点即可完全离线运行。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这套四层架构主要面向链路长、跨角色协作、验收标准复杂的重型工程流水线。如果你的团队也在处理上百步的复杂研发工作流，可以直接去仓库拉取代码试试。

```
Co-Sight Harness 开源仓库：
```

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**一起“**点****赞”****三连**↓**