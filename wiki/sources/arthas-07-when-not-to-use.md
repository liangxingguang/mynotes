---
id: wiki-source-arthas-07-when-not-to-use
type: source
title: 什么时候不该用 Arthas
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - troubleshooting
  - tool-selection
  - observability
sources:
  - raw/sources/architecture/2026-10-31-arthas-07-when-not-to-use.md
related:
  - wiki/entities/arthas.md
  - wiki/sources/arthas-01-attach-first-conclusion.md
  - wiki/sources/arthas-02-ai-arthas.md
  - wiki/sources/arthas-03-thread-command.md
  - wiki/sources/arthas-04-watch-trace-tt.md
  - wiki/sources/arthas-05-jad-hot-reload.md
  - wiki/sources/arthas-06-flame-graph.md
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
  - wiki/concepts/watch-trace-tt.md
  - wiki/concepts/jad-sc-sm-version-check.md
  - wiki/concepts/redefine-hot-reload-boundaries.md
---
# 什么时候不该用 Arthas

## Overview（概览）

工具选型文章（公众号专辑《arthas使用》第 7 篇，系列收尾）：讲什么时候不该用 Arthas。先把日志、指标、链路追踪、动态诊断四种观测手段的分工摆清楚（各管一段），然后给出该用 Arthas 的四个信号、不该用的三个场景、三项成本，以及一条从告警到定位的决策顺序。核心主张：动手之前问"我现在缺的是数据，还是方向？"——缺方向先看指标和日志，缺某个方法的具体入参才是 Arthas 的位置。结尾总结八篇系列（上手/线程/方法/性能/内存/热更新/AI 配合/本篇）的分工是一条线。

## Key Facts（关键事实）

- **四种观测手段各管一段**：日志（有上下文、能追溯历史；没打的地方看不到）；指标（看趋势、能告警；只到聚合层不到代码）；链路追踪（跨服务看总耗时分布；服务内部细节看不到）；动态诊断（Arthas 属于这一类——进到方法里看真实数据，但有开销、不能长期开）。
- **Arthas 的价值定位**：在"已经知道大概位置，但需要看那一层的真实数据"。如果连"大概位置"都没有，先用前三样。
- **该用它的四个信号**：① 日志没打，但你确定代码走到了那里（加日志要发布，Arthas 不用）；② 指标显示异常，但不知道具体在哪个方法（指标说"接口慢了"，`trace` 说"慢在哪一层"）；③ 怀疑线上代码和仓库不一致（`jad` 一眼看出，比查发布记录快）；④ 问题偶发、现场留不住（`tt` 能把调用录下来事后回看）。共同点：已经缩小到某个类、某个方法，需要一个"现场数据"。
- **不该用的三个场景**：① 把它当监控（`trace`、`watch` 有开销，长期挂着会放大延迟，且没有告警、没有留存）；② 拿它做跨服务排查（只看得到本进程，要靠链路追踪）；③ 没有预案的紧急止损——真出事时第一优先级是止损（回滚、降级、扩容）不是分析，在告警响个不停时打开诊断工具，通常会让处置更慢。
- **一句话的判断标准**：动手之前问"我现在缺的是数据，还是方向？"缺方向，先看指标和日志；缺的是某个方法的具体入参、某个类到底加载了哪一份——那才是 Arthas 的位置。
- **三项成本**：attach 有停顿（极短，但峰值反复 attach 不合适）；`trace`、`watch`、`profiler` 采样有开销（热点方法上尤其明显）；`redefine` 这类误操作有风险（改错会引入比原问题更难查的故障）。
- **一条决策顺序**：① 先止损（回滚、降级、扩容）② 看指标（流量涨了、依赖慢了、资源不够）③ 查日志（异常、报错路径）④ 看链路（慢在哪个服务、哪个环节）⑤ 最后才是动态诊断（定位到方法级别、需要现场数据时再上）。顺序的关键：越便宜、越全局的手段越靠前。
- **系列收尾**：原文写"八篇的分工其实是一条线"——上手（怎么挂上去、先敲哪条命令）、线程/方法/性能/内存（四类问题各自的读法）、热更新（确认线上代码版本，以及为什么它只适合临时止血）、AI 配合（它负责翻译输出，你负责判断）、本篇（什么时候不该打开它）。但本专辑 `article_count` 为 7，可能另有一篇未收录。

## Important Claims（重要论断）

### 工具用错的代价比不会用更大

「你在错误的方向上拿到了看起来很专业的输出，然后据此做了决定。」这是本篇的核心动机：Arthas 能产生看起来很专业的输出，但如果用在错误的场景（如当监控、做跨服务排查），输出越专业，误导越深。

### 越便宜、越全局的手段越靠前

「顺序的关键是：越便宜、越全局的手段越靠前。」止损（回滚/降级/扩容）最便宜也最全局，所以排第一；动态诊断最贵也最局部，所以排最后。这条原则不限于 Arthas，适用于所有排障场景。（解读：这是一个通用的排障优先级原则，不仅限于 Java 生态。）

### 缺数据 vs 缺方向

「我现在缺的是数据，还是方向？缺方向，先看指标和日志；缺的是某个方法的具体入参、某个类到底加载的哪一份——那才是 Arthas 的位置。」这是判断是否使用动态诊断工具的最简标准。（解读：动态诊断工具的价值在于"深入细节"，而非"寻找方向"。）

## Concepts Introduced（引入的概念）

- **排障决策顺序**（先止损 → 看指标 → 查日志 → 看链路 → 动态诊断）：本篇为该概念的主信源。这是一个通用的排障优先级框架，不仅限于 Arthas。
- **观测手段分工矩阵**（日志/指标/链路/动态诊断的强弱对比）：本篇提供的四维对照表是理解可观测性工具分工的有用框架。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（动态诊断手段的代表，本篇讨论其适用边界）

## Implications（影响／启示）

- 与 [[arthas-01-attach-first-conclusion|Arthas 上手]] 互证：上手篇讲"怎么用"，本篇讲"什么时候不用"——两者构成完整的工具使用闭环。上手篇的 4 条生产纪律中"trace/watch 慎用"在本篇获得具体边界支撑。
- 与 [[arthas-02-ai-arthas|AI + Arthas 排查线上问题]] 互证：AI 配合篇讲"AI 该在哪一步上手"（贴文本模式四环节），本篇的决策顺序第五条"最后才是动态诊断"为 AI 配合划定了位置——AI 辅助的是诊断环节，而诊断本身应该排在最后。
- 与 [[arthas-03-thread-command|thread 命令怎么读]]、[[arthas-04-watch-trace-tt|watch、trace、tt]]、[[arthas-05-jad-hot-reload|jad 热更新]]、[[arthas-06-flame-graph|火焰图]] 互证：本篇的"四个信号"分别对应这些篇目解决的具体问题——信号②对应 trace/thread，信号③对应 jad，信号④对应 tt，信号①对应 watch。
- 与 [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]] 的"贴文本模式四环节"互证：本篇的决策顺序为 AI 辅助排障划定了"什么时候该用 AI"——缺数据时（已缩小到方法级）才上诊断，AI 辅助的是诊断环节。
- 与 [[redefine-hot-reload-boundaries|redefine 热替换边界]] 互证：本篇的"三项成本"中"redefine 误操作有风险"与 redefine 边界篇的"三个风险"一致，共同支撑"热更新只适合临时止血"的结论。
- "不该用场景一（把它当监控）"与 [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]] 的生产红线互证：MCP 实测也强调"不能长期挂着"。
- 决策顺序的"看指标"和"查日志"环节涉及可观测性体系（Metrics/Logging），与 [[spring-insight-lightweight-monitoring|Spring Insight 轻量级链路追踪]]、[[springboot-structured-logging|SpringBoot 结构化日志]] 等可观测性页面相关（解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（一张 base64 gif、一张 svg），正文信息无损；对照表字段在采集稿中被拆行，已按语义还原为表格。
- 原文提到"八篇"但专辑实际收录 7 篇，可能另有一篇未采集（见核心要点）。
- 未覆盖具体的止损操作细节（回滚/降级/扩容的具体命令和流程），也未展开指标和日志的具体实现方案。
- "四项成本"和"决策顺序"是经验性总结，原文未引用量化数据支撑。

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页）
- [[arthas-01-attach-first-conclusion|Arthas 上手]]（怎么用 vs 什么时候不用）
- [[arthas-02-ai-arthas|AI + Arthas 排查线上问题]]（AI 配合的位置）
- [[arthas-03-thread-command|thread 命令怎么读]]（信号②的具体命令）
- [[arthas-04-watch-trace-tt|watch、trace、tt：把方法看透的三件套]]（信号②④的具体命令）
- [[arthas-05-jad-hot-reload|改了代码没生效？先 jad 一下，再谈热更新]]（信号③的具体命令）
- [[arthas-06-flame-graph|一张火焰图，看懂慢在哪]]（信号②的 profiler 场景）
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（AI 辅助的位置）
- [[redefine-hot-reload-boundaries|redefine 热替换边界]]（三项成本之一的风险）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-07-when-not-to-use.md`
