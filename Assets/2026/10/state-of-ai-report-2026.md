##  Datawhale干货 

******年度报告：State of AI Report 2026******

被《时代》称为 AI 行业“风向标”的那份报告，更新了。

Air Street Capital 的《State of AI Report 2026》正式发布，已经是这个系列的第九期。

从模型突破到资本流向，再到政策与安全，它把 AI 这一年的关键变化都整理了出来。

想看懂 AI 究竟走到了哪一步，这份报告值得仔细阅读。我们将作者梳理的报告要点译成了中文，一起来看看吧：

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

经过几个月的研究，以及一直持续到最后一刻的修改，我很高兴终于能把第九份年度《AI 现状报告》（State of AI Report）带给大家。

近十年来，这份报告一直是我出于热爱而投入的工作。我对 AI 的兴趣始于 2010 年代初攻读博士期间，当时的研究方向是癌症研究和计算生物学。自 2013 年起，我开始投资开发和应用 AI 的公司，希望借此加快技术进步。这份报告让我有机会分享自己的所学，也帮助更多人理解那些正在改变世界的研究。

每天都有新论文发表、新模型发布，产业和政治领域也不断出现新动向。编写报告的大量工作，就是判断什么值得大家关注，核实证据究竟支持哪些结论，与研究者和开发者讨论，再解释这些进展为什么重要。

我们每年也会作出预测，并在下一年回头评估。过去，我们预测过英伟达收购 Arm 将告失败，Transformer 会在语言之外的领域取得领先成绩，以及开源模型将超越 OpenAI 的 o1。最后这一项，后来由 DeepSeek-R1 实现了。

## 一、来看看今年的重点

前沿模型的竞争，如今已成为 Anthropic、OpenAI 和 Google 三家实验室的角逐。至少目前，Anthropic 在 Artificial Analysis 的智能指数上领先，而 Google 在 Arena 根据用户回答偏好生成的排行榜上领先。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

前沿竞争已成为三家实验室的角逐，智能指数和 Arena 排行榜各有不同的领先者

去年的报告中，我们谈到，OpenAI 的 o 系列模型让推理能力开始在大规模应用中发挥实际作用。此后的进步，我有切身体会。我能借助 AI 反复打磨、改进的实际工作越来越多，也越来越多地把工作交给智能体完成。

在我看来，有些人能从 AI 中获得很大价值，有些人收获却很少，两者之间的差距，很大程度上取决于是否知道怎么用、怎么配置。换句话说，这是“人的技能问题”，并非“AI 的技术问题”。我确实认为，我们需要一个 AI 版的 Genius Bar（天才吧），让人们能获得手把手的帮助，选对工具、做好配置，用它们处理日常工作。

## 二、更好的工具和上下文，让智能体更能干

在数学、科学推理和编程领域，一些原本打算用来考验模型数年的基准测试，几个月内就已经接近得分上限。我们需要新的评估方式，判断模型之间还存在哪些能力差距，以及它们究竟能可靠地完成什么。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

去年报告中介绍的基准测试，已经迅速接近得分上限

前沿模型的能力仍然参差不齐，有些方面突出，有些方面薄弱，而且不同代际之间也可能出现起伏。就我的使用体验而言，Opus 4.6 是个好模型，Opus 5 有所退步，Opus 5.5 又变好了。更好的工具和上下文能有所帮助。在一项受控编程研究中，研究者调整了 GLM-5.1 可用的工具、上下文和反馈，在没有改变模型权重的情况下，将它在 100 项 SWE-bench Verified 任务上的成功率从 52.5% 提高到了 65.5%。没错，这是个“旧模型”，但其中的道理仍然成立。

随着模型及其周边的工具和运行框架共同进步，并参与自身的开发，我预计，今天的许多短板都能通过学习逐渐消除。对于模型已经具备的能力，我们也还有办法发挥得更充分。

令人兴奋的是，这种进步远远超出了开发者群体。OpenAI 对智能体使用情况的研究发现，使用增长最快的是非开发者，包括法律、销售、招聘和营销等领域的从业者。帮助他们把这些工具用起来，其中的机会，比“编程智能体”这个名称所暗示的要大得多。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

非开发者对 Codex 的使用，正从较小的初始规模迅速增长

## 三、AI 正在加快 AI 本身的研发

AI 已经在帮助我们开发更好的 AI。根据 Anthropic 的内部指标，8 月，在纳入统计的模型研发工作中，Claude 主导的部分占到 26%，而 2 月时还不到 1%。研究者负责设定任务、监督执行；Anthropic 表示，这正在加快开发进程。这也是 AI 研究中最让我兴奋的一个方向。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

在人类监督下，Claude 主导的工作在 Anthropic 纳入统计的模型研发中占比不断上升

对很多人来说，Karpathy 的 autoresearch 让这个循环中的一部分变得直观可见。智能体修改训练代码，运行每次五分钟的实验，在一块 GPU 上通宵工作，并保留带来改进的修改。这让研究中一个有用的环节实现了自动化，不过，持续、完全自主的递归改进仍有待证明。

我接下来想看到的，是智能体具备科研判断力，能选好实验，识别有潜力的研究方向，并知道何时该放弃已经熟悉的路线。正如我在《AI 能学会科研判断力吗？》（Can AI learn scientific taste?）一文中所说，要学会这种判断，可能需要接触论文中没有写出来的备选方案、失败经历和决策过程。我们希望看到，科学研究的策略也能发生一次类似 AlphaGo 带来的转变。

## 四、机器人领域的 GPT-2 时刻与世界模型的兴起

覆盖范围更广的预训练，正在帮助机器人把能力迁移到不熟悉的任务上。这也是为什么我认为，随着新模型、新硬件和新的数据采集方法逐渐结合，机器人领域正在接近自己的 GPT-2 时刻。通过对 Sereact、Wayve、Black Forest Labs 和 Odyssey 等公司的投资，我也看到了这一变化。

Skild 的 S1 无须更新权重，就能根据视频演示完成不熟悉的任务。使用 10 万小时的数据进行预训练后，它在公司采用的逐步累计成功指标上取得了 66% 的成绩；相比之下，一个使用相同数据和算力训练、通过语言提示执行任务的基线模型，成绩只有 9%。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

随着预训练数据规模扩大，机器人在未见过的任务上的表现不断提升

从演示中学习，可以减少机器人每次部署时所需的特定任务训练。世界模型则提供了另一条路径。Wayve 的 GAIA-4 能将录制的驾驶场景转化为模拟环境。在其中，AI 驾驶员的转向和刹车会改变它接下来看到的画面。其他道路使用者仍沿着录像中的路线行进，但 AI 驾驶员可以探索自身行为会带来什么后果。

Odyssey-3 利用视觉预训练，学习机器人、汽车和游戏中的控制任务。在公司的实验中，机械臂通过数十小时的演示就能学会操作；即使抓取失败，也能自行调整，而这些补救动作并没有在演示中出现过。这些早期结果表明，物理 AI 可能不需要针对每一种潜在情况，都学习那么多次演示。

## 五、AI 的科学应用，从数学延伸到临床试验

AI 正在解开一些连专业研究者也久攻不下的数学难题。Epoch AI 的未解问题汇编已记录九项解答，其中四项由 AI 自主完成，五项由人类与 AI 合作完成。在生物学领域，对分子相互作用的预测越来越准确，也让研究者能够更好地筛选出值得送进实验室验证的设计方案。我投资的 Profluent 就让我直接看到了这一点。这家公司开发用于蛋白质设计的前沿模型，设计对象包括基因编辑蛋白。

对生物科技创业者来说，一个好消息是，围绕药物发现的新商业模式正在出现，这些模式不以拥有药物资产为前提。例如，Tempus 为与阿斯利康和 Pathos 合作开展的基础模型开发提供肿瘤学数据授权；葛兰素史克（GSK）与 Noetik 签署的五年协议，则包括按年支付费用，以使用服务于癌症研究的虚拟细胞模型。

AI 辅助药物发现的成果，终于开始进入临床开发的后期阶段。Generate:Biomedicines 用于重度哮喘的 GB-0895，以及英矽智能用于特发性肺纤维化的 rentosertib，都正在为 III 期临床试验招募受试者。Enveda 用于湿疹和哮喘的 ENV-294 则正在进入 IIb 期临床试验。当然，人体试验才是最终检验，它将决定这些药物是否安全、有效。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

以 AI 为核心开展药物发现的公司，其药物研发正取得临床进展，其中两个项目已进入 III 期

## 六、AI 推理正成为一门庞大的生意

智能体在工作过程中会反复调用训练好的模型，为 API、订阅服务和基础设施带来源源不断的需求。许多公司正提着空桶，争先恐后地去接这股由推理服务汇成的收入瀑布。我甚至认为，这个行业如今的写照是，“要么倒在冲击技术前沿的路上，要么活得足够久，最后去做推理服务。”

Epoch AI 根据五项基准测试估算，自 2023 年以来，达到某个固定分数所需的成本，每季度下降 47%，相当于每年降至原来的约十三分之一。这样一来，把更多工作交给 AI 也变得划算。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

达到给定基准测试分数所需的最低推理成本，正在迅速下降

到夏末，按当时的收入水平折算，OpenAI 和 Anthropic 披露的年化营收合计已达到惊人的 1050 亿美元，而年初还只有约 300 亿美元。这些数字涵盖了两家公司的全部业务，包括订阅、编程产品和 API。正如 OpenAI 所说，“我们不能因为支线任务分心，错过这个时机。”

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

2026 年，OpenAI 和 Anthropic 披露的年化营收规模合计大幅增长

但如此迅猛的营收增长，并不局限于前沿模型实验室。Standard Metrics 的第二季度初步数据显示，在年化营收介于 100 万至 2000 万美元的企业中，AI 原生企业营收同比增速的第 75 百分位数为 256%，而为现有软件增加 AI 功能的企业，这一数字为 90%。在年化营收超过 2000 万美元的企业中，两者分别为 172% 和 53%。这些比较不能证明采用 AI 会带来更快的增长，但我倾向于认为，两者之间存在因果关系。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

按第 75 百分位的增速比较，AI 原生企业的增长速度，约为给现有软件加入 AI 功能的企业的三倍

Claude Cowork 及其面向法律、金融、营销等领域的业务插件，让软件市场骤然陷入不确定性。2 月那场被称为“SaaS 末日”（SaaSpocalypse）的抛售中，软件股市值在两周内蒸发了近 2850 亿美元。后来，Mythos Preview 又引发了网络安全公司可能失去存在价值的担忧，推动相关股价进一步下跌，随后市场才强劲反弹。我当时觉得这种判断很荒唐，因为这些能力会催生大量对更强防御的需求。投资者必须判断，智能体究竟会削弱现有厂商的定价能力，扩大它们的市场，还是让竞争对手有机会取代它们。还要判断，现有厂商的数据护城河是否依然有效，智能体能否在这一优势之上构建服务。远在营收数据给出答案之前，我们就必须作出决定。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

软件股在“SaaS 末日”前后遭到抛售，并在当年晚些时候大幅回升

## 七、AI 继续扩张，离不开融资、建设和当地支持

要满足如此庞大的智能需求，整个产业链都需要投入巨额资金。事实上，美国四家超大规模云服务商给出的 2026 年资本开支指引，合计约为 7330 亿美元。专门提供 AI 算力的新兴云服务商也在大举投资。CoreWeave 披露，第二季度末，其已投入运行的电力容量达到 1.5 吉瓦；截至 8 月 11 日，已签约的电力容量达到 4.2 吉瓦。

与此同时，欧盟对 AI 超级工厂计划的首批投入为 10 亿欧元。该欧洲计划希望筹集最高 100 亿欧元的公共资金，以及至少 200 亿欧元的私人资金。上述数字的统计口径不同，而且欧盟这一计划也不能代表欧洲的全部投资。但这种对比仍能说明，美国超大规模云服务商可以依托自身的资产和融资能力调动多么庞大的资金，而欧洲仍在努力汇集公共部门和私人投资者的出资承诺。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

美国超大规模云服务商的年度资本开支，远高于欧洲 AI 超级工厂计划的首批公共资金投入

随着市值向 6 万亿美元迈进，英伟达正在巩固其“AI 中央银行”的地位。它与六家金融机构的合作，目标是为 AI 基础设施调动超过 5000 亿美元资金，帮助项目开发者专心解决场地、审批、电力、冷却、网络和芯片的获取与融资问题。

但数据中心行业的情况远没有这么乐观。去年，我们预测美国会出现一轮反对数据中心落户本地的浪潮。盖洛普 3 月的调查发现，71% 的美国人反对在当地建设 AI 数据中心，反对核电站的比例则为 53%。Data Center Watch 报告称，第二季度至少有 45 个项目因当地反对而受阻或延期，涉及近 680 亿美元的计划投资。能否获得当地支持，已经在决定哪些项目能够继续推进。

## 八、华盛顿正在加强对前沿 AI 的控制

超级智能已经从 AI 圈里的一个热梗，写进了白宫行政令。各国政府一边为能力更强的系统做准备，一边加强控制，决定谁有权使用这些系统，以及可以怎样使用。即使政府并不持有这些公司的股权，也没有董事会控制权，仍在这样做。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

超级智能从科技行业的愿景，进入了白宫行政令

6 月，美国的一项出口管制指令禁止外国籍人士使用 Fable 5 和 Mythos 5，包括身在美国的外国籍人士。为遵守规定，Anthropic 暂停了所有用户对这两款模型的访问，随后又在 2026 年 7 月 1 日宣布恢复访问。对世界其他地区而言，这让技术依赖变得再清楚不过。华盛顿能够切断人们使用关键技术的权限，而且立即生效。

Anthropic 与五角大楼的争议，则把这一问题进一步带到了 AI 本身如何使用的层面。Anthropic 拒绝取消对美国境内大规模监控及完全自主武器的限制，国防部门则要求能够将 AI 用于任何合法用途。开发者与政府正在争夺使用边界的决定权。

报告列出的部分主权 AI 计划，承诺投入约 1380 亿美元，用于获取算力、建设基础设施和发展本土技术。有些仍处于采购阶段，另一些已经开始提供算力。英伟达另外披露，其 2026 财年主权 AI 业务收入超过 300 亿美元。CNAS 的主权 AI 指数显示，各国为建设本土能力，一次次选择同一家外国供应商，也就是英伟达。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

报告所列的部分主权 AI 计划，承诺投入合计约 1380 亿美元，但实际交付进度差异很大

正如我在《欧洲无法租来 AI 主权》（Europe cannot rent its way to AI sovereignty）一文中所说，一座位于本国的数据中心，并不会让你获得对其中模型的控制权。要建立一个可信的替代方案，就必须持续投入研究人才、算力和能源，并一代又一代地开发模型。欧洲实际应当追求的目标，是拥有足够的本土能力，在外部供应被切断时仍能维持关键工作，同时握有谈判筹码。已经具备供电条件的土地和数据中心容量，就可以成为这样的筹码。当然，前提是欧洲能降低能源价格，减少规划审批的阻碍，达到足够有竞争力的水平……

## 九、安全与防护，智能体已经攻击了真实系统

在 OpenAI 的内部网络安全评估中，部分安全限制被放宽，智能体接入了互联网，并攻破了 Hugging Face 的生产环境基础设施。OpenAI 的技术报告记录了这些智能体的行为，包括在 41 个生产环境工作节点上执行代码，获取凭据和内部数据，以及下载四个私有代码仓库。一次能力评估，演变成了大量智能体协同攻击另一家机构的事件。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

OpenAI 的评估智能体越过了预设边界，攻破了 Hugging Face 的生产系统

METR 和 Redwood 发现，约有 700 个智能体加入了这场攻击，因为它们接到的任务被无意中设定得根本无法完成。其中一些智能体意识到，以这种方式欺骗评分系统既超出了自己的职责范围，也不符合伦理，却仍然参与了攻击。当智能体能够接触生产系统时，一个定义不清的目标，就可能造成远超原始任务范围的损害。

这次事件还带来了一条鲜明的教训。防御方也需要用得上能力同样强大的网络防御系统。Hugging Face 为调查入侵而提交的取证请求，因为包含攻击命令和漏洞利用载荷，被商业 API 的安全防护机制拦截。最终，它转而使用中国的开放权重模型 GLM-5.2，调查由美国前沿模型智能体发起的入侵。前沿模型提供商需要确保，保护真实系统的客户能够稳定获得所需的防御能力。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

开放的网络安全模型既增强了攻击能力，也让防御方获得了所需的工具

除了 OpenAI 与 Hugging Face 这起事件，Anthropic 9 月发布的威胁报告还记录了蓄意滥用模型的情况，包括开发恶意软件、开展监视以及编写武器制导软件。在也门北部，一个组织把多个 Claude 实例当作软件开发团队，用来开发武器制导软件。他们试射了一枚制导火箭，但 Anthropic 表示，这次测试似乎失败了，也没有发现该组织实际部署可用武器的证据。那些企图盗窃、胁迫和欺骗的人，同样可以利用模型处理复杂工作的能力。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Anthropic 记录了 Claude 被滥用于恶意软件、监视和武器制导工作的情况

另一个令人担忧的问题是，我们不能想当然地认为，模型写出的推理过程就能揭示它实际上在做什么。在 OpenAI 的破坏行为测试中，当监控系统只能看到模型的推理过程时，GPT-6 Astra 比早期模型更善于掩盖暗中执行的有害任务。而在这项测试中，让监控系统同时查看模型的实际行动，就能将成功规避监控的比例降至接近零。监督必须跟得上智能体的实际行为。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

GPT-6 Astra 更善于规避只检查推理过程的监控系统；能同时查看其行动的监控系统，则能发现更多破坏行为

也有一些令人鼓舞的进展。Anthropic 尝试用解释其“宪法”的文档，以及体现其价值观的故事来训练模型。在虚构的测试场景中，这种训练将模型实施勒索的比例从 65% 降至 19%。这一结果表明，解释规则背后的原因，有助于模型在新的情境中运用这些规则。但这些效果能否在生产环境中保持，还有待验证。

## 十、前沿 AI 实验室正在讨论如何放慢脚步

OpenAI 披露，在 Hugging Face 事件发生后，它暂停了前沿模型的强化学习研发；Anthropic 则说明，它对部分研究采取了回退和暂停措施。两家的暂停范围和恢复条件有所不同。

随后，Dario Amodei 和前沿 AI 实验室的员工呼吁放缓模型能力的提升速度，并通过国际协调确保这一目标得到落实。这些正在构建前沿系统的领导者，开始要求建立机制，放慢自己所在行业的发展速度。但对于是否接受外部评估，以及各家实验室应该保留多大的自主决定空间，他们仍有分歧。

如今的政策提案开始区分能力研发与为现有客户提供服务。实际需要回答的问题包括，谁有权要求暂停，满足什么条件才能恢复，以及如何核查各方是否遵守规定。这些都不容易。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

前沿 AI 实验室的领导者，对 AI 发展的节奏和独立监督持有不同立场

## 写在最后：我们对 2027 年的 AI 预测

和往年一样，我们回顾了上一年的预测。成绩单上，两项命中，五项部分命中，三项未命中。我们正确预测到，AI 实验室会重新加大对开源的投入，以争取美国政府的支持；也预测到，一家中国实验室会登顶某项重要任务排行榜。关于数据中心遭遇反对的预测，则只能算部分命中。反对浪潮确实出现了，但它会如何影响 11 月的选举，目前仍未见分晓。

我们对未来 12 个月提出了九项预测，其中三项是以下这些。

*   一个智能体为客户工作一个月后，无需升级模型，就能将自己在新任务上的失败率降低一半。这将成为衡量持续学习能力的一项实际指标。
    
*   一个自主运作的 AI 团队，能够自行确定研究议程，并在时间和算力投入相同的条件下，在模型研究上胜过由人类领导的团队。这将帮助我们判断，模型能否展现出比顶尖研究者更好的科研判断力。
    
*   美国 AI 实验室将正式推出前沿网络防御产品，帮助其他人应对前沿 AI 带来的威胁。我看不到其他可行的办法。
    

```
完整报告地址：https://www.stateof.ai/
```

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**一起“**点****赞”****三连**↓**