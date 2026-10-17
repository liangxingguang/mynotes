---
title: Anthropic AI-Native SDLC｜AI原生软件开发生命周期实施手册
source: H中文精读（微信公众号，译自 Anthropic 博客，Louis Claxton）
source_url: https://mp.weixin.qq.com/s/Uu8-ZOswKKa8VE4sLh9uZw
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-17
inbox_ref: Archive/2026-10-14-anthropic-ai-native-sdlc-handbook.md
---

# Anthropic AI-Native SDLC｜AI原生软件开发生命周期实施手册
HaningTECH NOTE

TECH NOTE · 原文翻译

AI 原生 SDLC 实施手册

用 AI 重塑你的软件开发生命周期——逐阶段拆解。

H中文精读2026-08-28

Louis Claxton · Anthropic · 2026 年 8 月 21 日

https://claude.com/blog/the-ai-native-sdlc-playbook

haning.me

AI-Native SDLC

逐 阶 段 拆 解

用 AI 重塑你的软件开发生命周期——逐阶段拆解。

代码不再是瓶颈

各家组织已经开始用 AI 写代码，速度是一年前无法想象的，但代码周边的流程并没有以同样的速度改变。

很多工程团队仍然保留着原样的审批闸门、评审、交接和政策，这些东西正在拖住 Claude Code 这类 Agent 编码方案本该带来的生产力增益。

软件开发生命周期（Software Development Lifecycle, SDLC）是软件从想法走到生产的那套流程。大多数组织跑的都是同样六个阶段的某个版本：规划、设计、构建、测试、部署、维护。传统做法里，每个阶段都是一个独立环节，由不同角色负责：产品经理写需求，技术架构师把需求转成设计，工程师实现设计，受监管企业的 QA 团队做验证，发布团队上线，运维盯着线上运行。工作在各环节之间靠文档、工单和签字流转。

传统 SDLC 流程很重，为的是在每一步都保证问责和控制。但传统 SDLC 当年是为「把效率做到最大」而设计的，而那是另一个时代：在那个时代，最耗时、最昂贵的阶段是写代码和做实现，现在已经不是了。PRD、估点仪式、产品安全评审，这些东西存在，是为了在那段可能长达数周、数月甚至数个季度的开发期里强行对齐。

传统 SDLC 的另一个特征是：它的控制手段默认每一步都由人来做。产出价值最多的那些组织，已经围绕 Agent AI 今天能做的事重建了自己的流程，同时确保人始终在环内。本指南会走一遍我们 Applied AI 团队在内部把 Claude 接入 SDLC 各阶段的若干最佳实践——这些实践的灵感来自我们与客户的合作，目的是加速开发、让流程跑得更快。

当代码不再是瓶颈、构建阶段快到传统 SDLC 承接不住时，有三件事会同时成立：

·瓶颈转移到构建阶段左右两侧的步骤。主要是规划、评审／测试和部署，它们仍然按人的速度运行。

·控制手段与现实脱节，变得难以为继。代码是人写的时候，一行行手工评审是合理的；一旦 diff 的大部分由 Agent 写出来，这套做法就跟不上了。

·治理成本上升，因为例外情况仍然要走每周或每月才开一次的会议和委员会。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图 1 · 构建不再是约束点——约束点是它周围那些按人速运行的步骤。构建塌缩到以小时计，而人速阶段的长度纹丝不动。

拿安全瓶颈举例。安全团队的人力是按人的产出规模配的，所以当 Agent 把代码产量成倍放大时，要么评审队列越堆越长，要么代码在没被充分评审的情况下上线。受监管的组织这两个结果都不能接受，所以它的安全与政策检查必须跟上 Agent 的节奏。

要更好地兑现 Agent AI 的生产力增益、同时把它管住，传统 SDLC 生命周期需要经历和实现阶段同等程度的改造。

目录

01代码不再是瓶颈

02打法

03阶段一 — 规划（Plan）

04阶段二 — 设计（Design）

05阶段三 — 构建（Build）

06阶段四 — 测试（Test）

07阶段五 — 部署（Deploy）

08阶段六 — 维护（Maintain）

09结语

什么是 AI 原生 SDLC

AI 原生 SDLC 是一套重新设计的流程：它保留原有的控制目标，改用新的执行机制。流程不再线性流转，而是变成一个闭环，AI 嵌入每一个环节。AI 原生 SDLC 推动交接自动化，并自动触发后续打法，用来解决传统 SDLC 各阶段之间手工且笨重的交接。

这个转变你也会听到别的叫法：Agent 化 SDLC、AI SDLC，或者干脆叫 Agent 化软件开发——标签不同，说的是同一件事。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

AI 原生 SDLC 六个阶段发生了哪些变化

下表列出的是传统 SDLC 与由 Claude 支撑的 AI 原生 SDLC 这两个端点。大多数组织落在两列之间的某处。

阶段

传统 SDLC

AI 原生 SDLC

规划

需求靠委员会收集，经过工作坊和签字层层提炼，再手工写成文档

Claude 直接从源头综合出痛点，落进intent.md——一份人能读、机器能执行的文件

设计

分析师写规格，设计师再解析规格

需求与设计压缩进与 Agent 的同一次工作会话，由编码成 Skill 的标准约束，在 git 里做版本管理

构建

测试和代码手写，文档在主体开发完成之后补

测试和代码由 AI 生成，组织知识以带版本、机器可读的CLAUDE.md文件和 Skill 形式维护

测试

QA 闸门卡在阶段边界上

持续评测（evals）织进实现过程之中

部署

人评审每一行代码，治理发生在评审周期里，且往往不一致

多层 Agent 评审，人工评审只留给受监管代码和关键代码。治理在 AI 动作发生的当下被执行，Hook 充当审批闸门

维护

人盯着生产环境找 bug

Agent 监控线上部署。任何被突破的控制带都会被诊断，并作为新的intent.md写回闭环

贯穿右边这一列的那根线，是已提交的制品。每个阶段都以「往版本控制里写入一份制品」收尾（包括intent.md、spec.md、plan.md、diff 及其测试、带评审发现的 PR，以及故障记录），下一个阶段以读取它开始。在靠前的几个阶段，.md 文件是主要制品形态，因为产品负责人和 Agent 都能读同一个文件、都能据此行动。从构建阶段往后，制品是代码及其记录。这条提交链同时就是审计轨迹：谁要求了什么、Agent 产出了什么、谁批准了。

凡是需要判断的决定，最终责任仍由人承担。在 Agent 化 SDLC 的世界里，人的注意力随着「必须被评审的制品」一起转移。

每个阶段都提交一份下个阶段能读的制品。意图、规格、计划、diff 和评审发现合在一起，就是审计轨迹。

打法（Plays）

打法是这份手册的主体，按六个非线性阶段（规划、设计、构建、测试、部署、维护）分组，合起来覆盖完整生命周期。

每个打法包含：

·变的是什么；

·如何起步；

·落地的具体步骤；

·治理上的考量；以及

·怎么衡量它是否奏效。

这些步骤是模块化的，组织可以根据自身情况，在不同时间优先改造不同阶段。每个打法都在「前置条件」里点名自己的依赖，依赖关系图会进一步说明。

一个阶段以提交制品收尾，而这次提交启动下一个阶段。被接受的intent.md触发需求与设计这一遍，被批准的spec.md触发 plan 模式，被合入的 PR 触发流水线，生产环境被突破的控制带写出下一份intent.md——闭环就这样转下去。

起步时，你还是手工逐步提示每一步；终态是一个闭环，每份被接受的制品都会自动触发下一道闸门。人的注意力集中在闸门处，评审 Agent 标出来的东西，而不是每个阶段都从零开始。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图 3 · 图中打法按阶段列出，箭头给的是采纳顺序。两者不是一回事。可以从任何一个「起点打法」开始——没有箭头指进去，说明它不需要任何前置。对其他打法而言，指进它的那些箭头就是要先采纳的打法。

01规划（Plan）

想法不再等着某个人把它写下来。意图只被捕捉一次，用提出人自己的话，形成一份受版本控制、可供下个阶段直接执行的制品。

把意图落成 intent.md

启动软件开发流程的intent.md可以从不同路径进来：有人有了个想法、有工单被提出、或者某次故障由告警浮现出来（见阶段六：维护）。

当一个人有想法时，他和 Claude 一起头脑风暴，产出一份 Markdown 的原型规格。在传统 SDLC 里，同一个人接下来还得去说服产品团队的某位成员，和他一起写、或者替他写这份东西。

Claude 生成的原型规格人能读、受版本控制，而且下一阶段可以立即使用。这份原型规格保存为intent.md。

不管意图来自事件触发还是来自 Agent，步骤都一样：产品负责人在提交前评审并修正 Agent 写的intent.md。

传统

一个想法要经过待办条目、用户故事、故事点和细化会议，才轮到有人能动手。每次交接所有权都在转移，所以最终到工程手上的东西，和提出人本来的意思之间已经隔了好几步。

AI 原生

提出人和 Claude 头脑风暴，把结果写成intent.md，一份用提出人自己的措辞写成的原型规格。这份制品记录了想要什么、为什么要，以及在什么约束下要。重复性流程通过 Skill 编码固化。

如何起步

**前置条件**—— 无。

**基础设施**—— 让非工程岗的人也能用上 Claude（claude.ai 或 Cowork）；一份约定好的intent.md模板；一个共享的、受版本控制的意图存放地，由产品负责人盯着。对单个产品来说，最简单的存放地就是产品仓库里的一个intent/目录。这么放，制品链就和由它派生出的代码待在一起。只有当意图跨多个仓库时，单建一个意图仓库才值那份额外开销；在 monorepo 里它就是一个目录。阶段三：构建的边栏会讲这个存放地与已经持有记录的 Jira 或需求工具之间的关系。

搭这套是平台团队或工程团队的一次性工作。需要一位技术成员把意图存放地立起来，并决定谁有写入权限——因为贡献者会来自组织各处。

仓库一旦存在，没有 git 经验的贡献者不必直接用 git。装一个到版本控制系统（比如 GitHub）的连接器，Claude 就能在 claude.ai 或 Cowork 里代他们提交 Markdown 文件。

怎么执行

01提出人用自己的话向 Claude 描述问题。他可以描述今天做不了什么、这个想法影响谁、更好的样子长什么样、什么不在范围内。不要求任何正式措辞。

02头脑风暴，直到想法变具体。Claude 会问分析师会问的那些问题：范围、用户、约束，以及成功长什么样。

03让 Claude 按组织模板把结果写成intent.md。这份模板可以被编码成一个 Skill，由技术成员搭好、由负责人签字。模板可以覆盖问题、期望结果、受影响的用户和系统、约束条件、待解问题。

04提出人修正 Claude 理解错的地方。

05把intent.md提交到共享存放地。作者和时间戳一并进入记录，产品负责人从这里接手。

MARKDOWN

\# Intent: claims status self-service Author: J. Ortiz (claims operations). Status: draft.  ## Problem Customers phone the contact center to ask where their claim is. Handlers spend roughly a third of call time on status-only queries.  ## Proposed outcome Customers see claim status, next step and expected date in the portal.  ## Affected users and systems Claims handlers, portal team, claims-core API.  ## Constraints No new PII in the portal session. Existing authentication only.  ## Open questions Do third-party loss adjusters need access too?

治理上的考量

证据就是那份已提交的intent.md，它带着作者、时间戳和完整修订史，记录在意图存放地的 git 历史里。由产品负责人批准；决定意图是否进入阶段二：设计的「接受或拒绝」结果，会以合并或关闭评审的形式记录下来。

怎么衡量

**先行指标**—— 从第一次对话到intent.md被提交所用的时间，从意图存放地的 git 历史里读（历史记录了作者和时间戳）。预期是从数周的需求获取与细化周期降到以小时计。

**滞后指标**—— 存活率，也就是产品负责人接受进入阶段二：设计（而非关闭）的intent.md占比。接受或拒绝的决定以制品被合并或评审被关闭的形式记录。此外还有：同一变更的第一份spec.md提交之后，intent.md又被改了多少次。

02设计（Design）

需求与设计塌缩进同一次会话。政策在规格被写出来的当下就被应用，而不是几周后在评审里才被发现。

需求与设计

产品负责人批准之后，Claude 拿被接受的intent.md产出一份需求与设计规格。这一步由组织在品牌、安全、合规和 UX 方面的 Skill 引导。

产品负责人评审这份规格，但不写它。这个过程的目标是产出一份工程团队可以据以做计划的规格，其中已标出关注点。

前端工作是最清楚的例子。intent.md被接受后，产品负责人在 Claude Design（beta）里根据intent.md做出设计草模，在草模上迭代，然后导出到 Claude Code 去实现。

传统

需求和设计是两个分开的阶段，由不同团队跑。分析师把想法形式化为需求，设计师再把这些需求解析回设计。这种分离是为了问责，但它慢，而且有损耗。

AI 原生

两个阶段发生在一次被提示的会话里。Claude 拿着intent.md产出需求与设计规格，受组织 Skill 约束，并把关注点标出来。

如何起步

**前置条件**—— 写好一份intent.md，并把品牌、安全、合规和 UX 政策写成 Skill。

**基础设施**—— 一位能用上 Claude 的产品负责人。不需要工程技能。

怎么执行

01产品负责人开一个会话，加载组织的 Skill，并附上intent.md。

02产品负责人的提示指向intent.md，点名各项约束，并要求标出关注点。一开始手工跑，之后把它固化为组织级的斜杠命令。再往后，把意图存放地里intent.md被接受这件事本身设为触发器：合并时启动一个非交互式任务，加载组织 Skill 跑这一遍，把spec.md以 PR 形式提交（阶段五：部署里的 CI/CD 打法讲这套管道）。从那时起，产品负责人首次介入时就是评审。

03还是这位产品负责人，对着原始想法评审规格。规格是否解决了所述的问题？intent.md里的待解问题是被回答了，还是被顺延了？

04先处理被标出的关注点，因为这些正是分析师原本会升级上报的问题。产品负责人在工程看到规格之前，就把每一条和对应的政策负责人一起解决掉。

05把spec.md与intent.md一起提交。这一对文件记录了「要求了什么」和「决定了什么」。

06产品负责人决定这份规格与意图是否进入构建；凡是组织归为高风险的，要征询技术负责人。这个判断永远由人类同事来做，而接受规格就是阶段三：构建里 plan 模式打法的起点。

长什么样（提示词）

MARKDOWN

Read the attached intent.md and produce a requirements and design spec for integrating it into our existing codebase. Apply the skills available to you so the plan conforms to our brand guidelines, security policies and UX standards. Document the spec fully as spec.md, ready to hand to the engineering team. Describe clearly any areas of concern, especially where you cannot satisfy contradicting policies.

治理上的考量

不是几周后在评审里才被发现，而是在规格被写出来的当下就读取并应用当前生效的政策。组织的 Skill 作为约束条件加在规格上。规格、产出它的提示词，以及当时生效的 Skill 版本，全都记录在版本控制里。产品负责人为规格签字，并把被标出的关注点路由给指定的政策负责人。

怎么衡量

**先行指标**—— 同一变更的intent.md提交与spec.md提交之间的时间间隔（两个 git 时间戳），与过去「需求 + 设计」的周期做对比。

**滞后指标**—— 构建开始后的需求返工。统计同一变更中，日期晚于第一份plan.md提交的spec.md提交次数。git log 可以直接给出这个数。

03构建（Build）

没有被接受的计划，就不做实现。组织知识变成 Agent 会读的文件，护栏以代码而不是以习惯的方式运行。

把 Claude Code 的 plan 模式作为默认起点

工程师以 plan 模式启动 Claude Code 会话，把阶段二：设计里批准过的spec.md给 Claude，让它反过来访谈工程师，在计划上迭代，直到工程师满意。

传统

工程师读完设计就开始写代码。这次变更具体怎么做——改哪些文件、写哪些测试——留在工程师脑子里，最好的情况下留在一条工单评论里。别人无法评审。评审者看到的第一样东西是完成的 diff，到那时候返工已经很慢了。

AI 原生

工作从一份写下来的计划开始，由 Claude 在 plan 模式下产出——在这个模式里它能读代码库但不做任何改动。工程师在代码被写出来之前修正计划，被批准的版本作为plan.md提交，供后续阶段对照检查。

如何起步

**前置条件**—— 如果有意图制品（intent.md或spec.md）就用上；有CLAUDE.md文件会有帮助。

**基础设施**—— 能访问仓库的 Claude Code。

怎么执行

01工程师以 plan 模式和 Claude 开启会话。

02工程师把intent.md和spec.md交给 Claude，要一份实现计划：点名会改哪些文件、工作的先后顺序、以及用哪些测试来证明它成立。

03追问这份计划：这次变更可能弄坏什么？哪一步风险最高？Claude 考虑过但没选的其他方案是什么？

04一直迭代到这个程度——一位从没看过这段对话的工程师，光凭这份计划就能把变更实现出来。

05把批准后的计划作为plan.md提交。计划加入审计轨迹，PR 评审打法（阶段五：部署）会拿最终 diff 与之对照。

06接受计划，让 Claude 去实现。计划扎实的话，实现往往一遍过。

07当实现偏离计划时，在同一次提交里更新plan.md。可以考虑用一个 Hook 强制两者同步。

长什么样（plan.md）

MARKDOWN

\# Plan: claims status self-service (from intent.md 2026-06-02)  ## Files that change portal/src/claims/StatusPanel.tsx (new), claims-api/routes/status.py, claims-api/tests/test\_status.py  ## Order of work 1. Add the status endpoint behind existing auth. 2. Panel against the endpoint. 3. Wire into the portal nav.  ## Risks The claims-core API rate-limits at 50 rps; the panel must cache.  ## Proof test\_status.py covers the four claim states; screenshot matches the approved mock.

治理上的考量

设计评审发生在任何代码被生成之前——那时候改方向还只是编辑一份文档的事。plan 模式本身就在强制这一点，因为在工程师接受计划之前，Claude 无法编辑文件。计划及其修订，连同是谁接受的，都被记录下来。常规变更由工程师批准，凡组织归为高风险的，走技术负责人或架构师。

怎么衡量

**先行指标**—— 第一遍实现就能合入的变更占比；以及从计划批准到 PR 合并的时间，所需数据在 PR 元数据里。

**滞后指标**—— 每个变更的返工轮次（同样来自 PR 元数据）；以及合入的 diff 仍与已提交的plan.md相符的频率。

Claude Code 的 auto 模式

Claude Code 也可以跑在 auto 模式：工程师批准计划、在计划上迭代到满意之后，Claude 逐项应用改动，不再逐次编辑都来问一遍。随着后面几个打法里的护栏成熟起来（调好的CLAUDE.md、把政策编码进去的 Skill、拦截危险动作的 Hook、以及一套 Claude 能自己跑的测试），自动接受会成为常规工作的默认模式——前提是：一份边界严密的spec.md、很小的影响面、以及测试已经覆盖到的代码。

这种变化意味着从「用户盯着 Agent 做编辑、逐个动作审查」，转向「在更长的自主会话之后审查制品」。自动接受模式配合 worktree，还能进一步支持个人和团队层面的并行，它也是自主运行 SDLC、闭合回路（见阶段六：维护）的根基。

边栏

遗留系统与事实来源

适用于本流程产出的每一份制品。

现有的 SDLC 流程很可能已经在跟踪制品了，只是不以 Markdown 文件的形式：工作项可能在 Jira 里，需求在一个内建监管可追溯性的工具里，设计在 Figma 里，变更审批在变更委员会那里。这些系统很难被取代，因为审计师和监管方已经认可它们，而且别的团队也依赖它们——所以 AI 原生 SDLC 必须绕着既有的东西来搭。

向 AI 原生 SDLC 过渡时，对流程产出的每一份制品，都指定一个系统为事实来源，其余一切只持有副本或指向原件的链接。下面这几种配置都可以做到只有一个事实来源，具体选哪种可以逐制品不同：

**仓库作为事实来源。**Markdown 制品是权威记录，遗留系统引用提交里的文件。对工程主导的组织来说，这往往是最干净的配置之一，因为所有记录都在一个工具里，时间戳权威也只有一个。

**遗留系统作为事实来源。**Jira、ServiceNow 或需求工具持有权威记录，Markdown 制品是工作副本。Claude 在会话开始时读取记录，并在产出规格或计划的同一次会话里，通过 MCP 连接器把结果写回去。

**互相挂链作为最低标准。**所有制品都记下记录 ID，所有遗留记录都包含 Markdown 文件的 commit SHA。向 AI 原生 SDLC 过渡时，从挂链开始是个不错的起点——代价是接受存在两个事实来源。

遗留系统与 Markdown 优先的体系可以共存，只要两者之间有链接，或者其中之一被宣告为事实来源。

关于 CLAUDE.md

CLAUDE.md给 Claude 的，是一位新同事需要的那些上下文：约定、命令、架构，以及团队最常撞见的那些错误。过去待在人脑子里和 wiki 上的知识，变成 Agent 每次会话开始就读的一个文件，由全团队维护，每犯一次错就迭代一次。

如何起步

**前置条件**—— 无。

**基础设施**—— 一个仓库、装好的 Claude Code，以及一位熟悉这套代码的工程师。

怎么执行

01在仓库里跑/init。Claude 会根据它发现的东西生成一份起步版CLAUDE.md。

02把生成的文件精简到只保留「新同事第一天需要知道的内容」。保留构建、测试和 lint 命令，保留真正重要的约定，保留 Claude 老是搞错的那些点。

03把CLAUDE.md提交到仓库根目录的 git 里，这样全团队共用一个版本，对它的改动也像代码一样被评审。

04这里有条实用规则：当 Claude 同一个错误犯到第二次，就把修正写进CLAUDE.md。

05控制在一页以内。因为 Claude 会在会话开始时读完整份文件，任何过期内容都在白占上下文。

长什么样（CLAUDE.md）

MARKDOWN

\# Payments service  ## Commands - Build: make build - Test: make test (unit), make itest (integration, needs docker) - Lint: make lint (runs in CI; fix before pushing)  ## Conventions - Java 21, Spring Boot 3. No new Lombok. - Money is always BigDecimal, never double. - Every endpoint needs an integration test in src/itest.  ## Architecture - api/ holds REST controllers, core/ holds domain logic,   adapters/ talks to external systems. - Kafka events are defined in schemas/; never edit generated classes.  ## Things Claude gets wrong - Do not bump dependency versions; the platform team owns them. - The legacy v1/ package is frozen; changes go in v2/.

治理上的考量

CLAUDE.md受版本控制，所以 Agent 遵循的指令是可评审、可审计的。团队约定通过这个文件生效，对它的改动记录在 git 历史里，代码负责人在 PR 评审中批准这些改动。

怎么衡量

**先行指标**—— Claude 重犯本该被CLAUDE.md拦住的错误的频率。对CLAUDE.md的修正或改动应当在 git 历史里可追踪。

**滞后指标**—— 团队新成员从入职到第一个 PR 合并所用的时间，取自 PR 历史。

用 Skill 承载组织知识

Skill 是组织把自身知识转化为可执行规则的方式。指令是显式的、受版本控制的、被广泛应用的，政策变化时从中心统一更新。经验法则是：必须被一致应用的组织知识，写成 Skill；本应放在CLAUDE.md或提示词里的内容，不要写成 Skill。

如何起步

**前置条件**—— 不需要。有CLAUDE.md会有帮助，因为它把 Agent 的工作知识留在仓库里，但 Skill 并不依赖它。

**基础设施**—— 一条有明确负责人、有书面事实来源的政策。

怎么执行

01挑一项目前执行不一致的组织知识或规则。可以是一条安全标准、一个 API 设计约定，或者一条品牌规则。

02把它写成一个 Skill：一个文件夹，里面有SKILL.md，frontmatter 说明何时触发，正文说明要做什么。由工程师依据政策负责人的事实来源来写，可以让 Claude 帮忙。

03把 Skill 放在仓库的.claude/skills/<name>/下，让它随代码一起发布；或者通过插件在组织范围内分发。

04测试 Skill 能被触发。用不同说法让 Claude 做相关任务，确认每次 Skill 都被加载。

05政策变化时，改 Skill，并让政策负责人为这次改动签字。

06工程师在下一次会话里自动拿到新版本。

长什么样（.claude/skills/secure-api-review/SKILL.md）

MARKDOWN

\--- name: secure-api-review description: Apply the API security standard. Use whenever creating or   modifying an external-facing endpoint, reviewing API code, or   generating an OpenAPI spec. --- # Secure API review  When you create or change an API endpoint: 1. Authentication: every endpoint requires the gateway JWT;    no anonymous routes outside /health. 2. Input validation: validate request bodies against the OpenAPI    schema and reject unknown fields. 3. Audit: every state-changing endpoint emits an audit event with    actor, action, entity and timestamp. 4. Data classification: fields tagged pii in the schema must never    appear in logs or error messages.  Run scripts/check-endpoints.sh and include its output in your summary.

治理上的考量

Skill 是一种控制手段，但是建议性的。它让 Claude 很可能在写代码的同时应用政策，但没有任何东西强制某次会话必须遵守。一条必须永远成立的政策，需要在 Skill 背后有确定性的东西兜底，比如一个拦截该动作的 Hook，或者在 PR 阶段重新核查该政策的评审流程。Skill 让违规变得罕见，Hook 让违规几乎不可能。Skill 的调用会记录在会话轨迹里，政策负责人像评审代码一样评审 Skill 的改动。

怎么衡量

**先行指标**—— 从政策负责人批准一次政策变更，到更新后的 Skill 被合入的时间，取自 Skill 文件夹上的 PR。

**滞后指标**—— PR 评审中援引该政策的发现数量。一旦 Skill 在写代码的当下就在应用政策，这个数应当趋近于零。如果它没有趋近于零，要么 Skill 没被触发，要么它的文本已经和官方政策脱节了。

用 Hook 做构建期护栏

Skill 是建议性控制，Hook 则是它背后那层确定性控制。Claude 在实现阶段的大部分动作是文件编辑和 shell 命令，所以构建阶段往往是 Hook 触发最频繁的地方。

构建期 Hook 可以：

·拦截对受保护路径的编辑，比如生成的类或已冻结的包；

·在文件编辑后跑格式化和 lint，让偏移永远不累积；

·防止凭据进入 diff。

凡是政策必须无例外成立的 Skill，都用 Hook 兜底。Hook 会在每一个匹配到的动作上运行，所以构建期 Hook 应当快，并且只作用于发生变化的那个文件。更重的检查（比如跑完整测试套件）属于提交或 PR 环节。

那种要人来批准的 Hook，属于阶段五：部署里的闸门。因为在构建过程中弹出审批提示，等于把一个人重新放回所有并行会话的关键路径上。

并行会话与子 Agent

一位工程师可以同时驱动好几条工作流。

并行会话是另一个完整的 Claude Code 实例，在它自己的 git worktree 里做一个独立任务。每个独立会话对其他会话一无所知，它们唯一共享的就是那位在操舵的工程师。

子 Agent（subagent）运行在单个会话内部，是一个有自己上下文窗口和工具限制的、范围受限的助手，适合那些在多个任务中反复出现的活儿——比如验证应用是否按预期运行。

并行会话提高一位工程师同时在手的任务数，子 Agent 则让每个会话专注于自己的任务。工程师的工作是操舵和评审这一切。

传统

一位工程师一次做一个任务，一天或一周里有相当一部分时间花在等构建、等测试、等评审者上。等待时切去做别的任务是可行的，但上下文切换累到很少有人愿意这么干。

AI 原生

一位工程师同时跑好几个 Claude 会话，每个在自己的 worktree 里做自己的任务。重复出现的活儿变成有自己上下文和工具限制的子 Agent。工程师的工作转向编排，并最终转向搭建和监控闭环。

如何起步

**前置条件**——CLAUDE.md，因为所有会话都读这个文件。反馈回路（阶段四：测试）在这里也有帮助，因为当一个会话能验证自己的工作时，工程师需要的监督就更少。

**基础设施**—— 一个 git 仓库（隔离来自 worktree），以及调好的权限设置——让会话不会为了组织认为安全的命令而卡在审批提示上等待。

怎么执行

01工程师把工作拆成触碰不同文件的任务，用 plan 模式打法（阶段三：构建）产出的计划来判断哪些工作彼此独立。共享文件的任务放在同一个会话里前后串行。

02每个并行任务有自己的 worktree，比如一个终端里claude --worktree feature-auth，另一个里claude --worktree fix-rate-limit。worktree 是在自己分支上的独立检出，能防止会话在文件上撞车。

03两三个会话是合理的起点。实际上限是一个人能认真评审得过来的流数，所以只有在评审跟得上时才加会话。

04把重复出现的活儿变成子 Agent，定义在.claude/agents/下的 Markdown 文件里，各自有名字、有「何时使用」的说明、有可使用的工具。例子包括：主 Agent 完成后剥掉多余复杂度的代码简化器；跑起应用、检查行为的验证器；在不冲垮主上下文的前提下探查代码库并回报的调研员。把这些定义提交进 git，让全团队共用。

长什么样（.claude/agents/verifier.md）

MARKDOWN

\--- name: verifier description: Runs the app and checks the change works before the session   reports done tools: Bash, Read --- Start the app with make run. Exercise the changed behavior and the two nearest neighboring flows. Report what you ran, what you saw, and any behavior that does not match plan.md. Do not fix anything; report only.

治理上的考量

会话更多意味着产出更多，所以控制手段必须来自仓库里的配置。那里的 Hook 和权限设置对所有会话生效，而每个会话做了什么都会被记录，并归属到跑它的那位工程师名下。

怎么衡量

**先行指标**—— 在评审质量不下降的前提下，每位工程师的并发会话数（从 OpenTelemetry 导出数据里统计），以及一天中花在操舵而非等待上的时间占比。

**滞后指标**—— 每位工程师每周合入的变更数，与返工率一起读（返工率据 PR 历史判定）。

04测试（Test）

每个会话在人看到之前先检查自己的工作，而那套驾驭 Agent 的配置，也要像它写出的代码一样接受回归测试。

给 Claude 一个反馈回路

永远给 Claude 一条能验证自己工作的路径——测试、构建，或者截图对比都行。会话检查自己的工作、在工程师看到之前修掉自己的错误。

反馈回路不要和验证器子 Agent（阶段三：构建）混为一谈。反馈回路贯穿整个任务，工作迭代多少轮，反馈回路就运行多少次。而验证器子 Agent 是把最终检查打包的一种方式：在会话认为工作已完成时，用一个全新的上下文窗口跑一次，这样结论就不会被产出这段代码的那些假设染色。

传统

「代码能跑」这个信号来得很晚。CI 要几分钟后才给信号，测试员要几天后，生产环境甚至要几周后。当代码由 Agent 产出时，信号迟到意味着必须有人检查它的全部输出，而这个人就成了瓶颈。

AI 原生

给会话一条在人看到之前检查自己工作的路径。跑测试、跑构建、截图。Claude 一直迭代到检查通过，所以到工程师手上的东西已经过了这一关。搭这个回路是跑会话那位工程师的活儿，下面的步骤就是写给他的。

如何起步

**前置条件**—— 无。

**基础设施**—— 一套测试和一个构建，各自能用一条命令在本地跑起来。对 UI 工作，让 Claude 能看到结果至关重要——要么给浏览器工具，要么通过 MCP 接一个截图工具。

怎么执行

01如果今天检查工作要敲一串命令、还得懂点环境知识，就把它包成单个目标，比如make test或npm test，失败时以非零退出。

02在CLAUDE.md的 Commands 一节里，逐条列出命令，并附上健康输出的样例。

03给出目标，而且要可量化，让 Claude 不用问你就能自查。比如：「test\_status.py 里所有测试通过」「截图与附上的草模一致」「接口返回 200 且带上新字段」。

04修 bug 时，先写会失败的测试。让 Claude 把 bug 复现成一个测试、跑它、并确认它是因为你预期的原因失败的。把这个测试提交掉。然后再让 Claude 在不改测试的前提下让它通过——最后一步里的测试文件 Hook 负责强制这条限制。一个在修复之前就存在、且 Agent 无法改写的测试，就是 bug 确实消失了的证明。

05UI 工作用视觉检查闭合回路。给 Claude 浏览器或截图工具，给它草模，让它迭代：实现、截图、比对、调整。两三轮是正常的，每一轮结果都应该更好。

06把验证纳入「完成」的定义。这条指令写在CLAUDE.md里：报告任务完成之前先跑测试，并把输出贴出来。

07最后，回路本身也需要保护——因为一个在修代码的 Agent，绝不能有能力削弱针对这段代码的检查。一个在修复任务期间拦截对测试文件编辑的 Hook 可以做到这点。替代方案是在评审时检查 diff，拒绝任何触碰测试的改动。

长什么样（CLAUDE.md 的验证段落）

MARKDOWN

\## Verifying your work  - Build: make build (must finish with "Build succeeded") - Test: make test (all green; never skip or delete a failing test) - Lint: make lint (zero warnings)  Run all three before reporting any task complete, and paste the output. If a test fails, fix the code, not the test.

治理上的考量

**被强制的是什么**—— 报告任务完成之前必须验证，以及修复期间禁止 Agent 编辑测试文件；组织想要这两条有保证时，都以 Hook 实现。

**证据是什么**——make test的原始输出、构建日志，或者 Claude 跑完并贴出来的截图对比——证据来自工具链本身。

**记录在哪里**—— 在会话记录里（OpenTelemetry 导出会把它转发到组织的可观测性栈），以及在 PR 的 check run 里（评审者和日后的审计师都能看到）。

**谁来批准**—— 评审这个 PR 的代码负责人。因为机械性证据已经附上了，他可以专注于意图和风险。

怎么衡量

**先行指标**—— Agent 所写变更的首次 CI 通过率，这个 CI 系统本来就支持。

**滞后指标**—— 每个 PR 的评审耗时（取自 PR 元数据），一旦测试接住了过去靠评审者接住的东西，这个数应当下降；以及来自故障跟踪系统的变更失败率。

CI 里的持续评测

评测（evals）是阶段闸门式 QA 的 AI 原生对应物。落到实处，就是一套在 Agent 配置发生变化时就运行的测试集。当换上新模型或重写了提示词，评测套件会告诉你 Agent 是否仍然把活儿干到同样的标准。

评测应当被看作一套活的套件。随着模型变强，过去有区分度的用例会失去区分度，必须补进新的用例——它们来自持续的监控。

视用例而定，有些团队可能更愿意按固定节奏离线跑这些评测，而不是每次改动都跑。以下步骤针对持续评测。

如何起步

**前置条件**——CLAUDE.md和反馈回路（阶段四：测试）。

**基础设施**—— 能非交互式运行 Claude Code 的 CI，以及一个有评测运行预算的 API key。

怎么执行

01平台工程师从近期工作中收集 20 到 50 个真实任务，连同它们的预期／已接受结果。

02把每个任务写成一条评测：提示词，加上定义「可接受」的那些检查（测试通过、lint 干净、行为未变、政策被遵守）。

03套件在 CI 里非交互式运行，按计划定时跑，并且在CLAUDE.md、Skill 或 Hook 有任何改动时也跑——因为这些配置在驾驭 Agent，理应享有代码同等的回归测试。

04用结果给配置变更设闸门。一次让通过率下降的 Skill 改动，在合入之前要被评审。

05每一次生产故障都配一条评测，由拥有该故障的团队编写，并作为回归测试长留在套件里。

长什么样（.github/workflows/agent-evals.yml）

YAML

name: Agent evals on:   pull\_request:     paths: \['CLAUDE.md', '.claude/\*\*'\]   schedule:     - cron: '0 2 \* \* \*' jobs:   evals:     runs-on: ubuntu-latest     steps:       - uses: actions/checkout@v4       - run: npm install -g @anthropic-ai/claude-code       - name: Run eval suite         env:           ANTHROPIC\_API\_KEY: ${{ secrets.ANTHROPIC\_API\_KEY }}         run: |           for eval in evals/\*.json; do             claude -p "$(jq -r '.prompt' $eval)" \\               --allowedTools "Read,Edit,Bash(make test)" \\               --output-format json > result.json             ./evals/check.sh "$eval" result.json           done

治理上的考量

评测给了 QA 一道跟得上 Agent 产出速度的闸门。通过率阈值以合并检查的形式强制执行，每次运行都被记录以便跨时间对比，配置变更由拥有它的团队批准。

怎么衡量

**先行指标**—— 评测通过率随时间的走势（套件每次运行都会报告），以及一次生产故障变成一条常驻评测所需的时间。

**滞后指标**—— CI 里拦下的回归数，与生产环境中发现的回归数做对比（后者取自故障跟踪系统）。

05部署（Deploy）

评审是双向的，治理在 Agent 动作发生的当下被执行。Agent 做到生产闸门为止，一步也不越过。

让 AI 进入 PR 评审回路

Claude 既参与评审，也接受评审。它按组织政策评审进来的 PR，也处理自己 PR 上收到的评审意见。这让工程师在 PR 评审中能专注于行为本身，归结起来就是判断意图和风险。

传统

评审产能是按人的产出规划的。一个 PR 等着评审者把它整个读一遍，评审质量随评审者的负载起伏，作者一边催一边看积压越来越长。

AI 原生

所有 PR 都经过一套完全相同的评审轮次，发现按严重程度排序。人的注意力上移一层：这次变更做的是不是计划打算做的事，风险是否可以接受。

如何起步

**前置条件**—— 阶段三：构建里更新过的CLAUDE.md文件；如果评审轮次要执行成文政策，还需要 Skill；以及已定义好的子 Agent。

**基础设施**—— 一个装了 Claude 集成的仓库：要么由管理员启用托管版 Code Review（research preview）服务，要么在自己 CI 里跑 claude-code-action，必要时把模型调用走 AWS Bedrock、Google Vertex 或 Microsoft Foundry（部署选项见 CI/CD 打法）。要求代码负责人批准的分支保护策略也值得配上。

怎么执行

01托管版 Code Review 服务起步最快，管理员启用并选好仓库即可。当你需要掌控流水线，或希望 API 调用走自己的云协议时，就用 claude-code-action 在自己的 CI 里跑评审（管道细节见 CI/CD 打法）。

02技术负责人把评审政策写成仓库根目录的REVIEW.md，按组织在意的轮次划分：bug 与逻辑错误；安全与漏洞；对规格（需求打法产出的spec.md）、实现计划（plan 模式打法产出的plan.md）和设计原则的合规性。REVIEW.md还要定义什么算「重要（Important）」、什么只算「鸡毛蒜皮（Nit）」，以及什么直接跳过。

03技术负责人设定人工阈值。评审发现本身不批准也不阻塞 PR，分支保护依然要求代码负责人批准。想按发现数量给合并设闸门的平台工程师，可以读 check run 以机器可读形式发布的严重程度计数。

04当评审者或作者在某条评审意见上@claude时，Claude 处理这条意见并推送修复。PR 讨论串同时记下了请求和改动。这个修复回路走 claude-code-action。在托管服务里，评论@claude review则是请求一次全新评审。对 Claude 自己开的 PR，还可以更进一步，让 Claude 把 PR 一路看护到合并：团队把这个回路包成一个自定义斜杠命令，让它清扫 PR 上未解决的评审意见和失败的检查、逐一处理并推送修复，直到 PR 全绿、只等代码负责人批准。

05评审发现要回流进CLAUDE.md。当一次评审第二次标出同一个错误，就在那次评审里把修正写进CLAUDE.md；由于评审本身会读CLAUDE.md，从下一个 PR 起这个错误就会被接住。评审还会标出某次变更已经让CLAUDE.md过期了。

06每月一次，技术负责人调优这套配置：给评审发现打分，让评审者变好；并在REVIEW.md里给 Nit 的数量设上限。生成路径和 CI 已经在管的东西一律排除。

长什么样（REVIEW.md）

MARKDOWN

\# Review instructions  ## Passes Run three passes and tag each finding with its pass: - Bugs: logic errors, broken edge cases, subtle regressions - Security: injection risks, authentication gaps, PII in logs - Compliance: the change matches spec.md, plan.md and our design principles  ## What Important means here Reserve Important for findings that would break behavior, leak data or breach a policy. Style and naming are nits.  ## Cap the nits Report at most five nits per review; summarize the rest as a count.  ## Do not report Generated files under src/gen/ and anything CI already enforces.

治理上的考量

职责分离得以保留，因为写代码的那个 Agent 没有任何途径批准它自己。REVIEW.md里的评审政策适用于所有 PR，发现、修复、评分和批准都记录在 PR 历史里，所以 PR 就是审计记录。批准来自人，通过分支保护给出，并以那些发现作为参考。

关于这些控制在生产规模下如何组合，见 Anthropic 如何为自己的 AI 原生 SDLC 做安全（claude.com/blog/how-anthropic-secures-its-ai-native-software-development-lifecycle）。

怎么衡量

**先行指标**—— 首次评审的时延（应当降到以分钟计），以及无需人碰分支就被解决掉的评审意见占比，数据直接存在 Git 上。

**滞后指标**—— 合并前被拦下的缺陷与漏洞数，对比逃逸到生产环境的数量，分别取自 PR 历史和故障跟踪系统。

用 Hook 做审批闸门

构建阶段把 Hook 当护栏用，在没有人介入的情况下放行或拦截动作（阶段三：构建）。Hook 还可以「问」——暂停动作，直到某个特定的人批准，这正是发布闸门需要的能力。

这个打法放在阶段五：部署，是因为发布闸门是最清楚的例子；但 Hook 并不是部署专属的，Claude 在哪里动作，它就在哪里运行。比如，在阶段三：构建里，Hook 可以拦截没有变更工单就改数据库迁移和基础设施；在阶段四：测试里，可以阻止 Agent 在修复任务中编辑测试文件。

如何起步

**前置条件**—— 无。

**基础设施**—— 一份写下来的清单，列出变更流程要求的各项审批。

怎么执行

01工程管理层会同变更管理和合规，列出必须保留的人工审批闸门，比如变更管理签字、发布授权，以及编辑受保护路径时的批准。

02平台工程师把每道闸门表达成一个 Hook——一个在 Claude 动作之前运行的脚本，可以放行（allow）、询问（ask）或拦截（block）。

03团队级 Hook 放在 git 里的.claude/settings.json；不容商量的 Hook 放进由平台或 IT 管理员掌管的托管设置里，个人工程师关不掉。

04拦截要能自我解释：当 Hook 拦下一个动作时，理由和获取审批的路径都要出现在 Claude 的输出里。

长什么样（.claude/settings.json）

JSON

{     "hooks": {       "PreToolUse": \[         {           "matcher": "Bash",           "hooks": \[             { "type": "command",               "command": "${CLAUDE\_PROJECT\_DIR}/.claude/hooks/production-gate.sh" }           \]         }       \]     } }

闸门本身长什么样（.claude/hooks/production-gate.sh）

BASH

#!/bin/bash # Production deploys require a named release authorization cmd=$(jq -r '.tool\_input.command' < /dev/stdin) if \[\[ "$cmd" == \*"deploy"\* && "$cmd" == \*"production"\* \]\]; then    if \[ -z "$RELEASE\_APPROVAL" \]; then      echo "Production deploys need a release authorization." >&2      exit 2 # exit 2 blocks the action; the message goes to Claude    fi fi exit 0

治理上的考量

Hook 就是审批闸门。闸门条件每次都会对每个人执行。放行与拦截的决定都带时间戳记录在案。闸门还定义了什么才算「批准」——是一张已批准的变更工单，还是发布经理的签字。

实例 —— 面向受监管企业的托管设置

由平台团队通过 MDM 或管理控制台下发；工程师无法编辑或覆盖其中任何一项。

JSON

{  "permissions": {    "deny": \[      "Read(.env\*)", "Read(./secrets/\*\*)",      "WebFetch", "Bash(curl \*)", "Bash(wget \*)"    \],    "allow": \[      "Bash(git \*)", "Bash(make build)",      "Bash(make test)", "Bash(make lint)"    \],    "disableBypassPermissionsMode": "disable"  },  "allowManagedPermissionRulesOnly": true,  "sandbox": {    "enabled": true,    "failIfUnavailable": true,    "allowUnsandboxedCommands": false,    "network": { "allowedDomains": \["git.internal.example.com",                                    "registry.npmjs.org"\] },    "credentials": {      "files": \[        { "path": "~/.ssh", "mode": "deny" },        { "path": "~/.aws/credentials", "mode": "deny" }      \],      "envVars": \[ { "name": "GITHUB\_TOKEN", "mode": "deny" } \]    }  },  "allowManagedHooksOnly": true,  "disableSideloadFlags": true,  "allowManagedMcpServersOnly": true,  "strictKnownMarketplaces": \[    { "source": "github", "repo": "example-corp/approved-plugins" }  \],  "requiredMinimumVersion": "2.1.193" }

从控制角度看，每一行配置换来了什么

permissions.deny把敏感信息挡在 Agent 的上下文之外，并阻断经由工具的任意网络外发；permissions.allow预先放行安全的内层循环，避免 deny 清单造成反复确认。

disableBypassPermissionsMode加上allowManagedPermissionRulesOnly，意味着任何工程师、项目文件或命令行参数都无法把规则放宽。

sandbox补上权限管不了的缺口。在工具层面 deny 掉 WebFetch，并不能阻止一条 shell 命令连上网络；操作系统层面的域名白名单则直接切断外发。

failIfUnavailable和allowUnsandboxedCommands把沙箱变成一道闸门：沙箱无法初始化时 Claude Code 拒绝启动，而在沙箱内失败的命令，也不能转到沙箱外重试。

credentials补上 deny 规则留下的缺口。permissions.deny管的是 Claude 的文件工具，但一条沙箱内的 shell 命令默认仍可能读到~/.ssh或~/.aws/credentials；这一段拒绝这些读取，并从每一条沙箱命令的环境里剥掉指定的敏感变量。

allowManagedHooksOnly意味着只有这个打法定义的审批闸门 Hook 会运行，本地的任何东西都不能追加或替换它们。

disableSideloadFlags和strictKnownMarketplaces意味着工程师机器上的每一个 Skill、Agent、Hook 和 MCP 服务器，都是经组织批准的插件市场进来的，绝不会来自某个用户主目录。

allowManagedMcpServersOnly让 Agent 的工具面成为一份由平台团队掌管的白名单。

requiredMinimumVersion会在版本低于经批准的最低版本时拒绝启动，这样这些控制就是由组织实际评估过的构建版本来执行的。

上面这套请当作待裁剪的起点，而不是照抄的建议。每一项 deny 都会牺牲一部分能力，正确的平衡取决于该仓库的数据分级。设置参考文档记录了每一个键，包括那些仅限托管的键：code.claude.com/docs/en/settings

怎么衡量（针对 Hook 本身）

**先行指标**—— 在每道审批闸门上等待的时间。每一次 Hook 决定都会写进 OpenTelemetry 导出，带时间戳和放行／拦截结论，所以每道闸门的等待时长都可见。

**滞后指标**—— 上 Hook 前后，突破闸门抵达生产环境的违规数量，取自故障跟踪系统。

CI/CD 集成与部署

在 CI/CD 流水线内部非交互式运行 Claude Code；把执行放进沙箱，让长时间运行的 Agent 安全运行；通过 MCP 集成把部署能力暴露给 Agent；并在 Agent 真正需要之前就先演练好回滚路径。

传统

流水线跑的是确定性脚本，任何需要判断的事都等着人来做。比如分诊一个不稳定的测试、写变更日志、或者搞清楚构建为什么坏了。部署和回滚是人在压力下照着执行的操作手册。

AI 原生

Claude 在流水线内部非交互式运行，负责那些需要判断的步骤，跑在带受限凭据的沙箱里。部署工具通过 MCP 暴露给 Agent，于是写出并测试了这次变更的那条工作流，也能把它发出去、把它回滚掉——全都在组织按环境定义的闸门之内。

如何起步

**前置条件**—— Claude 已进入 PR 评审回路，以及 Hook 已作为审批闸门存在。因为闸门必须先存在，自动化才能加速任何东西穿过它们。

**基础设施**—— 一个装了 claude-code-action 的 CI 平台，或者任何能调claude -p的 runner；通过 API 的模型访问，或者在流量必须留在组织既有云服务协议范围内时走 Bedrock、Foundry 或 Vertex；对接各部署目标的 MCP 服务器；一份给 Agent 任务用的沙箱配置，不持有常驻的生产凭据。

怎么执行

01平台工程师从只读的判断步骤起步。在流水线任务里用claude -p分诊一次失败的构建、总结一个不稳定的测试，或者起草变更日志。

02在既有闸门之后加入写操作步骤，比如修 lint、更新生成的文档、或通过@claude提及处理评审意见。Agent 写的任何东西都以 PR 形式经分支保护进来，Agent 没有任何路径直推 main。

03执行放进沙箱。Agent 任务跑在受网络策略约束的容器里，持有短时的受限令牌，默认不持有生产凭据。

04通过 MCP 暴露部署能力。部署、状态查询和回滚变成工具，按环境限定作用域，于是 Agent 的部署权限被限定在一份白名单里，而不是一个带着凭据的 shell 脚本。

05按环境给自主度分级。在开发环境，Agent 可以自由部署。在生产环境，Agent 准备发布、由发布经理授权，并由一个 Hook 强制生产闸门。预发布环境介于两者之间。

06回滚应当是流水线里演练得最多的路径——一条 Agent 能执行的命令，并在预发布环境里定期实操。闭环打法（阶段六：维护）会在控制带被突破时调用这个回滚，所以它必须事先被证明可用。

长什么样（流水线步骤）

YAML

\- name: Triage failed build   if: failure()   run: >     claude -p "Read the build log at out/build.log. Identify the most     likely cause, say whether the failure looks flaky or real, and write a     three-line summary for the PR thread." >> triage.md

治理上的考量

支配性原则是：Agent 可以一路做到生产闸门，但不能越过它。下面这些控制手段执行这一原则。

·分支保护把 Agent 写的任何东西都变成 PR，没有直通 main 的路径。

·生产部署 Hook 会拦住发布，直到一位指名的发布经理授权。每一次非交互式运行都以 Agent 自己的身份行动，所以流水线日志能把 Agent 做的事和触发它的那位工程师做的事区分开。

·按环境分级的权限，设定 Agent 在通往闸门的路上能做多少事。

怎么衡量

**先行指标**—— 无需呼叫人就完成分诊的流水线失败占比，取自 CI/CD 流水线日志。

**滞后指标**—— DORA（DevOps Research and Assessment）指标，CI 系统和部署工具本来就在输出这些数据。

06维护（Maintain）

闭环合上。触发器在没有人处于调用路径上的情况下唤起 Claude，而它发现的东西以intent.md的形式重新进入流水线。

维护与闭合回路

到目前为止，我们讨论的都是怎么把 Claude 加进 SDLC 的各个阶段，每个阶段都需要人来发动最初的步骤。而这个阶段，焦点转向让 Claude 自主运行，把回路闭合。

举例来说，一个持续运行的监控 Agent 可以在一张 bug 工单被提出之后，创建一份intent.md，然后一路流过需求、计划、构建、测试和评审各个阶段。阶段六：维护以无人值守（headless）方式运行，在各阶段之间设有独立的置信闸门——一次确定性检查，或者一个对抗性的评审 Agent——由它决定上一阶段的产出是继续往下走，还是上报给人。

传统

维护是个被动阶段。所有工单或故障都等着某个人去处理、去重启流程。凌晨三点的告警可能被漏掉，工单可能一直躺在待办里等人捡起来，而如果又起了另一把火，事后复盘的行动项可能根本到不了代码库。

AI 原生

一个触发器——控制带被突破、一张工单、一条频道消息，或者一个定时计划——在没有人处于路径上的情况下唤起 Claude。Claude 做诊断，只通过设有闸门的路径行动，并把它发现的写成intent.md，然后走上面描述的那些阶段。人负责分诊和评审这些工作，而不再需要去发动它们。

闭合回路

一个确定性脚本盯着生产环境，在控制带被突破时唤起 Claude。对控制带突破的监控，是理解「回路自主运行」这个模式的一个好例子；而本阶段末尾 Claude Tag（公开测试）一节，讲的是工作从不同渠道进来的情形。

如何起步

**前置条件**——intent.md，它给了回路一个结构化的输出用来重启流程。此外还需要 Claude 加速的 PR 评审、作为动作边界的 Hook，以及 CI/CD 的回滚路径（最高自主度层级会调用它）。

**基础设施**—— 一个检测脚本能查询的指标存储系统（Prometheus、CI 系统的 API 或同类），对仓库的读权限，一条在 CI 里非交互式运行 Claude Code 的路径，或者用 Agent SDK 做一个接收 webhook 的服务。

怎么执行

01服务负责人或平台工程师挑一个有稳定滚动基线的指标，比如 CI 测试失败率、部署后 5xx 率，或者 PR 周期时间。

02他们编写检测脚本，通常是滚动窗口上的均值与标准差，加上规则（Western Electric 或类似），这样控制带既能抓住尖峰，也能抓住缓慢漂移。脚本受版本控制并有单元测试，检测环节完全保持确定性，不涉及任何模型。

03响应层级定义在受版本控制的配置里（下面的bands.yaml）。1σ 时脚本只记日志；2σ 时以只读方式唤起 Claude 做诊断；3σ 时 Claude 可以行动，但也只能是提交一个进入评审闸门的 PR，或者触发一份预先批准的操作手册。

04触发层可以是 GitHub 或 GitLab 里的定时工作流、来自既有监控栈的 webhook，或者网络内部的一个定时任务。Claude 无状态运行，要么作为 CI runner 上的一个非交互式步骤，要么作为沙箱容器里的 Agent SDK 服务；部署与模型访问的选项见 CI/CD 打法。正因为运行是无状态且非交互的，一个回路可以在没有任何人发动它的情况下开始与结束。

05Agent 按阶段一：规划的格式把它的诊断写成intent.md，涵盖异常及其证据、期望结果、受影响的系统和待解问题。从这里开始，这条发现就像其他任何东西一样走完流水线。

06服务负责人或值班工程师分诊这个队列，把面向产品的发现路由给产品负责人：立即修复、排期处理或驳回。驳回会用来调优控制带，帮助降低噪声。

07修复上线时，为这次故障补一条评测（见持续评测打法），确保此类问题今后受到防护。

长什么样（例如一份监控 CI 测试失败率的 bands.yaml）

YAML

metric: ci\_test\_failure\_rate baseline: rolling\_30d rules: western\_electric tiers:   1sigma: { action: log }   2sigma: { action: diagnose,             tools: "Read,Grep,Bash(gh run view \*)" }   3sigma: { action: propose,             routes: \[pull\_request, runbook:rollback-deploy\] }

治理上的考量

层级边界由受版本控制的配置强制执行，权限和托管设置拒绝生产访问。唤起、发现和分诊决定都带时间戳记录在案。服务负责人分诊并批准这些发现，由此产生的变更走正常的 PR 评审闸门，而 Agent 可以触发的那些操作手册是事先被批准过的。

怎么衡量

**先行指标**—— 从控制带被突破到分诊队列里出现一份intent.md的时间，与过去「从故障到复盘行动项」的时间做对比。检测脚本的日志里有突破的时间戳和故障层级。

**滞后指标**—— 发现最终变成合入修复的占比（分诊队列对照实际 PR 历史），以及同一类别故障的重复发生次数——随着修复不断给评测套件添加用例，这个数应当下降。

例子

·当 CI 测试失败率突破 3σ，Agent 隔离那个不稳定的测试，或者开一个 revert PR，由评审闸门定夺。

·当部署后 5xx 率突破 3σ，且窗口内有一次部署，Agent 触发既有的回滚流水线。

·当 PR 周期时间触发漂移规则，Agent 为工程管理层写一份报告——这说明这套装置对流程指标和生产指标同样有效。

检测环节保持确定性。控制带一旦被突破，Claude 才被唤起，而层级决定了它能做什么。

周期性代码库扫描

一次安全扫描，是特定模型在某个时间点对代码库作出的判断——而这两半都会过期：代码每周都在变，每一代模型都会找出上一代漏掉的漏洞。AI 原生的答案是：按计划跑扫描，调用路径上没有人，并把扫出来的东西送进和代码库其他任何变更相同的闸门。

Claude Security 是定时扫描的托管形态。连上一个 GitHub 仓库，扫描就在 Anthropic 的基础设施上以 Claude Mythos 5 运行，每条发现在被报告之前都经过验证，并附上一个置信度评级。建议的补丁在 Claude Code on the web 里被评审和应用。组织拿到这些发现，而无需直接访问模型。

传统

安全扫描是一个事件：在发布前或审计前发起一次扫描。报告进入跟踪系统，积压靠人工消化，直到下一个事件。这中间写的代码，靠 PR 评审接住多少算多少。

AI 原生

扫描按计划对每一个已连接的仓库运行，用当前最强的模型，发现在任何人读到之前就已被验证。每条发现的处理方式与被突破的控制带相同：一个 PR 装得下的修复走评审闸门，更大的就变成一份intent.md。**覆盖度的日期以最近一次运行为准，而不是以第一次为准。**

如何起步

**前置条件**—— PR 评审闸门和作为审批闸门的 Hook（阶段五：部署），好让这些发现像其他变更一样走评审。以及阶段一：规划的intent.md格式，用于那些单个 PR 装不下的发现。

**基础设施**—— Claude Security 面向 Claude Enterprise 组织公开测试。它需要：在目标仓库上安装 Anthropic GitHub App（云托管的 github.com）、启用 Claude Code on the Web、打开 Extra Usage 并设好花费上限、给跑扫描的人配 premium 席位，以及由管理员在claude.ai/admin-settings/claude-code打开该功能。扫描按 Mythos 5 的费率按用量计费，所以花费上限应当与仓库的规模和数量相匹配。

怎么执行

01安全负责人接入各仓库，并按仓库、服务或团队把它们组织成项目，这样发现的归属从一开始就清楚。

02对最关键的那些仓库先跑一次完整扫描，包括那些已经被别的工具或更早的模型扫过的仓库。把第一次扫描当作基线。第一次扫描很可能会在被认为干净的代码里翻出问题。

03按项目设定计划。对活跃开发的服务，每周一次是合理的默认值；仓库很大或很混杂时，把扫描范围限定到某个目录或分支。

04带着置信度评级做分诊。驳回时要写理由，这样驳回被记录在案，同一条发现在下次运行时不会又作为新发现回来。

05对边界清楚的发现，在 Claude Code on the Web 里打开建议的补丁，评审它，然后像其他任何变更一样送进 PR 评审闸门。提出这个修复的 Agent 没有任何途径批准它。

06对超出单个补丁范围的东西——比如架构性弱点，或者跨服务重复出现的某种模式——按阶段一的格式写成intent.md，从规划阶段重新起步。

07当一个修复被发布到生产环境，就为这一类漏洞在持续评测打法的套件里补一条评测，让这套用于驾驭 Agent 的配置今后都用这一类漏洞做回归测试。

08把发现导出为 CSV 或 Markdown，或使用 webhook，让组织既有的跟踪与审计系统继续充当记录系统——审计师本来就期待在那里看到它们。

治理上的考量

扫描在组织的管理员控制之下运行：接入了哪些仓库、谁持有扫描席位、花费上限是多少，全都是集中设定的。每条发现都有验证结果和置信度评级，每次驳回都有理由，所以扫描历史就是一份审计记录，记录了什么被发现、什么被修复、哪些风险被明确接受。

修复经由 PR 评审闸门和分支保护抵达生产环境，而不是从扫描直接过去。Claude Security 是对既有静态分析和依赖扫描的增强：确定性检查仍然留在 CI 里，而模型驱动的扫描覆盖那些确定性检查本就不擅长发现的、依赖上下文的漏洞。

怎么衡量

**先行指标**—— 已排上定时扫描的仓库占比，以及从一条发现被报告到它的补丁进入 PR 评审闸门的时间，取自扫描历史和 PR 元数据。

**滞后指标**—— 定时扫描发现的漏洞数，对比在生产中或由外部报告发现的漏洞数（取自故障跟踪系统）；以及已经跑过若干轮的仓库上，每次扫描的发现数趋势——随着修复和评测的累积，它应当下降。

让 Claude 用 Claude Tag 值班

故障也可能从别的渠道进来，比如 Slack 或 Teams 这类办公沟通应用。一次故障可能表现为晚上十点故障频道里一条要求紧急修复的 Slack 消息，而现在它可以被立刻处理。Claude Tag（目前在 Slack 公开测试）让 Claude 以自己的身份成为这些频道的成员，于是每一起新故障都有了第一响应者，而响应本身成为回路的一部分，也成为未来故障可调用的记忆。

对话和组织知识都留在频道里，频道里的任何人都可以引导和推进这次响应。任何团队成员都能实时验证假设、探索新选项、展开调查，而频道历史又增加了可审计性。通过 MCP，Claude 验证指标是否已回到基线并在讨论串里确认，然后把复盘写进一份受版本控制的经验教训文件，供日后的调查读取。

Claude Tag 接的不只是故障。通过 MCP 在一张工单上被 @，或者在频道里被问到，Claude 会用同样的方式分诊这些工作：小而边界清楚的修复以 PR 形式经评审闸门进来，更大的则写成intent.md进入阶段一：规划——到这一步，回路开始自我供给。参见：Claude Tag 在 Anthropic 如何为 CI/CD 值班（claude.com/blog/ai-ci-cd-on-call）。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图 4 · 频道就是审计轨迹：请求、诊断、人工授权和修复，全都留在这次故障被处理的地方。

结语

模型与配套运行框架（harness）都变得更先进了，这让组织不仅能改造自己生产代码的方式，还能改造整个软件开发生命周期。

这场改造把人的判断保持在流程的中心，也考虑到了大型企业组织的治理与监管要求。

本指南汇集了我们 Applied AI 团队每天为客户实际采用的许多最佳实践，希望你觉得它是一份务实、可落地的资源。

回路持续运转。人的判断，居于其上。

资源与致谢

下面这些文档是平台团队搭起这些控制所需要的，大致按你会推行的顺序排列。

为你的组织配置 Claude Code —— 管理员决策地图，从这里开始

https://code.claude.com/docs/en/admin-setup

设置参考与优先级，含所有仅限托管的键

https://code.claude.com/docs/en/settings

来自 Claude 管理控制台的服务端托管设置

https://code.claude.com/docs/en/server-managed-settings

权限

https://code.claude.com/docs/en/permissions

沙箱化 —— 操作系统级的文件系统与网络隔离

https://code.claude.com/docs/en/sandboxing

Hook —— 指南

https://code.claude.com/docs/en/hooks-guide

Hook —— 参考

https://code.claude.com/docs/en/hooks

Skill

https://code.claude.com/docs/en/skills

插件与私有市场 —— Skill 和 Hook 如何在组织范围内分发

https://code.claude.com/docs/en/plugin-marketplaces

托管 MCP —— 集中管控 Agent 的工具面

https://code.claude.com/docs/en/managed-mcp

企业部署总览 —— Bedrock、Vertex、Foundry

https://code.claude.com/docs/en/third-party-integrations

企业网络配置

https://code.claude.com/docs/en/network-config

监控（OpenTelemetry）

https://code.claude.com/docs/en/monitoring-usage

分析看板

https://code.claude.com/docs/en/analytics

Compliance API —— 企业版活动流、会话检索与删除

https://platform.claude.com/docs/en/manage-claude/compliance-api

安全模型

https://code.claude.com/docs/en/security

感谢 Jim Blackhurst、Will Steuk 和 Jamal Arif 对本指南的贡献；本指南受他们此前的工作启发，并在其基础上构建。

Louis Claxton,The AI-Native SDLC playbook, Anthropic, August 21, 2026

https://claude.com/blog/the-ai-native-sdlc-playbook

HHaning

记录关于品牌、AI 与表达的长期观察

  

· · ·

© 2026 HANING · 转载请注明出处