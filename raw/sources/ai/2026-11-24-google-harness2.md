---
title: 谷歌开源 AI Harness 自进化框架 Harness2：一个月狂揽 25K+ Star
source: 冰河（微信公众号）
source_url: https://mp.weixin.qq.com/s/HCt_zSiOiLYSv-yEjrz70A
source_type: article
platform: 微信公众号
captured: 2026-11-24
registered_at: 2026-11-24
inbox_ref: Inbox/2026-11-24-google-harness2-self-evolution.md
asset_ref: Assets/2026/11/weixin-hct-zsioilysv-yEjrz70A.md
---

**大家好，我是冰河~~**

做 Agent 做久了，会慢慢形成一个不太愿意承认的结论：模型本身的差别，很多时候没有外面那层东西的差别大。

同一个模型，提示词换个写法、工具描述换个措辞、记忆策略从“全塞进去”改成“按需召回”，跑出来的结果能从“勉强能交差”变成“这真的是同一个模型吗”。

这层包在模型外面、决定它怎么规划、怎么调工具、怎么记东西的系统，通常叫 harness。

麻烦在于，调 harness 到现在基本是门手艺活——靠人一遍遍试，试到觉得差不多了就停，没有系统性的方法。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

Google Research 最近放出来一个项目，叫 Harness2，想干的事情就是把“调 harness”这个动作从手工活变成可以自动迭代的过程。

它不训练模型，模型权重全程锁死，动的只有外面这层配置。

## 先把 harness 拆成能改的东西

这个概念如果不落到具体零件上，讨论起来会很虚。Harness的做法是把 harness 拆成八块可以单独编辑的组件，按运行时职责分成四组：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一组管上下文——系统提示词、Guardrails、Memory、Skills，决定模型每次看到什么、记住什么、被什么约束。

一组管工具接口——工具说明和 Scripts，决定模型怎么理解它能调用什么。一组管委派——Subagents，决定任务怎么分出去。最后一组管中间件——Plugins，决定工具调用循环里那些横切行为。

拆成这八块之后，“改 harness”就不再是一个模糊的动作，而是具体到“我这次要改哪一块、改成什么样”。

## 为什么这件事现在值得自动化

项目标题里有个词是理解它的关键：open world。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

意思是，Agent 面对的任务，在最初设计 harness 的时候压根没出现过。这件事在真实场景里太常见了——你花了两周调出来的提示词和工具说明，在某个特定领域的任务上表现很好，换个领域立刻拉胯。

不是因为模型不行，是因为那套 harness 是围着旧任务长出来的。

Harness的判断是：既然没法预知所有任务，那就别追求“一次调好一个通用 harness”，而是让每个新任务都有机会触发一次针对性的改进。模型不动，动壳。

## 两层递归，各管各的

它的架构是两层嵌套的递归，分工很清楚。

**第一层，管当下这个任务。** 流程是三步：先拿初始 harness 把任务跑一遍，然后让编辑器提出修改建议，建议分两类——通用型的和领域特定型的。

接着把每个候选修改放到同一个任务上各跑一次，最后让组合器对比这几次运行的行为差异，合成一个精炼后的 harness，用它把任务做完。

这里最值得注意的设计是：**它不需要标准答案**。没有 ground truth，没有打分反馈，靠的就是对比——同一个任务，不同的壳改动，跑出来的行为哪里不一样，从差异里判断哪些改动值得留。

这在真实场景里比依赖评分反馈实用得多，因为大部分任务根本没有一个可以拿来打分的正确答案。

**第二层，管以后的任务。** 每个任务跑完之后，会有一个反思环节，把这次被采纳的 harness 改动和有证据支持的结论写进一个持久的“改进 harness”。下一个任务开始时，编辑器提修改建议会参考这份积累。

两层合起来的效果是：第一层让单个任务越做越好，第二层让后面的任务不用从零开始。

## 两种花预算的方式

第一层递归的深度由 `--k` 参数控制，有两种花法。

`--k 1` 就是走一遍三步流程，最省。`--k K --mode parallel` 是同时探 K 个通用候选和 K 个领域候选，再组合出 K 个结果，这是往宽了探——一次看多个方向。`--k K --mode sequential` 是连着做 K 步精炼，这是往深了改——每一步都在上一步的基础上继续。

执行器目前支持 OpenCode 和 Codex，`--substrate cx` 可以切到 Codex。

## 项目自己报的数字

在三个专业基准上，四种模型与 harness 的组合，单步 Harness就能让 GLM-5 和 Gemini 3.5 Flash 超过它们各自的基础 harness。

三个基准的侧重不同：JobBench 测专业工作任务，LAB 测法律工作，WorkBuddy-Bench 覆盖办公、网页和代码。

提升幅度最大的是 WorkBuddy-Bench 的 11.5 分和 LAB 部分通过率的 11.8 个百分点，JobBench 是 4.5 分。

项目还提到，加大第一层的预算还能继续往上走。

这些是“最高”数字。具体到某个模型、某个配置能拿多少，得去看论文里的完整对比表，别直接拿最高值当预期。

## 想自己跑的话

环境要求是 Linux、Python 3.12 和 uv。第一步先跑本地 demo，不需要任何模型凭证：

`uv venv --python 3.12 .venv   source .venv/bin/activate   uv pip install -e '.[render]'   harness2-demo --output runs/demo --k 2   `

demo 用的是确定性的编辑器和真实的 Python 执行，两种递归模式都会演示一遍。

想接真实模型跑基准，还得装 Node.js 20+ 和 Google Cloud CLI，把 `.env.example` 复制成 `.env`，填好 Vertex AI 项目和模型 ID，再跑 `gcloud auth application-default login`。LAB 额外要 Pandoc 和 Poppler，WorkBuddy-Bench 要 Docker。

以 LAB 跑单个任务为例：

`harness2-setup lab   harness2-check --bench lab   harness2 --bench lab --k 1 --mode parallel \   --only-domains antitrust-competition --max-tasks 1   harness2-judge --bench lab --k 1 --mode parallel   harness2-report --bench lab --k 1 --mode parallel   `

judge 和 report 必须和精炼那一步用同样的基准、执行器、子集、`--k`、`--mode` 和随机种子。加 `--dry-run` 可以只预览任务选择，不真正调模型。结果落在 `runs/` 下，同一条命令重复执行能断点续跑。

## 需要注意的事项

**第一，这是要花钱的。** 带模型的运行会产生 API 费用，项目自己也建议先从少量任务开始。每个任务要跑多次候选 harness，`--k` 开大了成本涨得很快。这个方法的价值能不能覆盖成本，取决于你的任务分布和模型价格，得自己算。

**第二，网络默认是开的。** 执行器的网络访问默认不受限，Codex 运行时沙箱是关的。公开基准的评分标准有可能在网上被搜到，正式评测前要按文档配好网络限制，不然执行器可能看到答案和评分标准，结果就不干净了。

**第三，这不是 Google 官方支持的产品。** 项目声明写得很清楚，也不在 Google 开源软件漏洞奖励计划范围内。协议是 Apache 2.0，第三方代码、基准和数据集沿用各自的上游协议。

## 最后总结

Harness最值得看的，不是它报出来的分数，而是它处理问题的方式：把 harness 当成一个可以被迭代优化的对象，然后用“对比不同壳改动下的行为差异”来替代“等一个标准答案”。

这套流程——提出修改、跑一遍看差异、把有证据支持的结论沉淀下来——哪怕你完全不用这个框架，也值得拿来审视自己调 Agent 的方式。大部分人调 harness 是改一版、跑一下、感觉好点就留着，感觉不对就回滚。

中间没有留下任何可复用的判断依据。Harness至少提供了一种把这种手工直觉变成可记录、可积累的东西的思路。

至于值不值得上手跑，我的判断是：如果你手上有明确的任务分布，也愿意为多次候选执行付钱，它值得试；如果只是想找个“更好的 harness”直接拿来用，它给不了你现成的答案，它给的是一个优化过程，过程本身要花时间和成本。

项目地址：https://github.com/google-research/harness2

**好了，今天就到这儿吧，我是冰河，我们下期见~~**

推荐阅读：

[给大家推荐一款AI短剧生成平台](https://mp.weixin.qq.com/s?__biz=Mzg4MjU0OTM1OA==&mid=2247515806&idx=1&sn=6214e0ec2a9ebc09b1c68eb23e818eae&scene=21#wechat_redirect)

[给大家推荐一款可直接使用的AI-CR系统](https://mp.weixin.qq.com/s?__biz=Mzg4MjU0OTM1OA==&mid=2247515790&idx=1&sn=5aeda9e93df686b5e753cb9870fda0da&scene=21#wechat_redirect)
