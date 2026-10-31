---
id: 2026-10-31-agent-harness-essay-ideal-harness
title: Agent Harness 随笔：我理想中的 Harness
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2096275149876216777
source_type: article
platform: 知乎
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - AI
asset_ref: Assets/2026-10/zhihu-20261031-2096275149876216777.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-31T13:02:05.551Z"
ingest_claim_id: 62864-1793451725551-0
---

# Agent Harness 随笔：我理想中的 Harness

> 摘要：作者手搓 Harness 后的思考：软件行业当下的第一要务是找到顺手的工作流、靠高质量 SOTA model token 快速迭代（personal RSI），而 Harness 作为人与 AI 的对接口是关键。核心主张：以 Session 为核心重构、做 Harness of Harness、审美是 Harness 寿命与粘性的底层保障、Agent as Memory、Agent Search 二分法。

## 核心要点

- **对现有 Harness 都不满意**：官方的（Codex、Claude Code）UI 不美观，且只对自家模型做极致优化、无意做多模型协作；第三方一类（Pi、Cursor、Devin）用一套工具 + System Prompt 适配所有模型，但工具集与模型原生 CLI 不一致 → 性能无保证；另一类（T3 Code、Synara/Monocode）集成多套原生 CLI，即「Harness of Harness」，保住表现但实现复杂。作者倾向后者。
- **以 Session 为核心重构**：以 Session/Thread 为核心可天然克服多 Agent 协作（orchestrator、主模型带辅模型、subagent）的问题；官方 Codex App 与 Claude Desktop 已有成熟 Session 功能，但多数 App 还没做到。理想形态是以 Session 为单位做底层重构，每个 Session 下挂不同 Provider 与原生 CLI，像 Monocode 那样把多 Provider/Harness 映射为同一套体系。
- **多模型分工**：以 Session 为核心后，可让 Claude 总览规划、实现分给 Codex、要速度的分给 DeepSeek、文字类分给 Gemini；Muse、OpenAI Dot、Grok bot 底层的 Personal Agent 也需要这种重构——**维护单个 Agent 的超长上下文很难，会被多次 Compact 污染，更好的做法是同一个 Bot 管多个 session。**
- **MCP vs Skill 的 token 账本**：MCP 注入带来大量工具描述 token，新对话只说「你好」也要付几万，且每轮都要 cache read，**Cache read 在 Agent 账单里占比常超 97%**（30K × 1000 次 = 30M）；社区实测 Claude Desktop 比 CLI 少约 10% 额度，正因注入额外 MCP token；256K 后模型性能显著下降，MCP 占的 30K 就是少 30K 有效窗口。作者更倾向**把 Session 操作做成 CLI + 斜杠命令（近似 Skill），不激活就不付 Token tax**。
- **UI 与审美是未来主要分歧点**：底层技术、存储会趋同，审美与 Design 会百花齐放；「纯粹的 AI vibe 产品有浓浓的 AI Slop 的味道」。作者主张把 UI 展示为独特卡片（Session 卡片、Artifact 卡片、HTML 卡片），让模型产出 Artifact 的做法也要 Skill 化。
- **Agent as Memory**：最前沿实验室仍选最简单的方案（Claude Auto-Memory、Codex Memory）——「Simple is effective」。长期记忆（偏好、注意点）以 Markdown 文件化保存，短期记忆（如 todo 进度）传统留在 Context 里；作者主张**由主 Agent 控制项目进展、需要实现时 spawn 子 Session 并协调它们，用户只与主 Agent 对接**——用户心智有限，频繁手动切换 Session 会很快耗尽精力。
- **Agent Search 二分法**：很多时候需要的不是 Agent 去做，而是 search 出一个足够成熟的方案——Agent 自己想出的方案大概率无法打破信息壁垒。现状方案很 naive，做不到「去小红书搜某家公司的社会评论」「去 Linux.do 搜技术帖」。作者主张**有事实标准答案的走 API；偏主观、讨论性的走 OpenCLI 这类复用登录态的方案**——个人本地工具在这点上比大厂更有优势。

## 正文

> 采集说明：知乎专栏页触发登录墙，`web-fetch` 经三级 jina 兜底成功（fetch_level: jina）。正文文字完整可读，但**每个实体词都被替换成知乎站内搜索链接**（`zhida.zhihu.com/search?...&zd_token=...`），正文噪声极大——笔记正文中已把这些链接还原为实体名，原始链接噪声保留在 asset 中。配图为远程链接未下载。

**TL;DR（原文自己列的要点）**：① 以 Intelligent UI / UX 为核心的审美追求，是对 Harness 生命长度与用户粘性的底层保障；② 要做 Harness of Harness，集成各厂家的原生 CLI；③ 以 Session 为核心重构，解耦多模型协作与多 Session 协作；④ Harness CLI：以 CLI + Skill / 斜杠命令的形式优化模型上下文管理；⑤ Monos / Agent as Memory：从用户角度重新设计 Agent Memory；⑥ Agent Search 的重要性；⑦ 多模型协作、Remote Control、Mobile App 等使用体验。

**开篇**：作者很久没写知乎，最近用语音输入法用得顺手，心血来潮写个人体验；「可能有点长，但 AI 含量很低（仅用 Argon 进行了润色）」。核心判断：几乎所有软件行业当下的第一要务，是研究并找到自己用着最顺手的工作流，然后靠高质量的 SOTA model token 去快速迭代——称之为 personal RSI。那么现阶段人还能做什么？作者认为**优化 Agent 的工作流、提高对 Agent 的驾驭能力**是非常重要的一点，Harness 作为人和 AI 的对接口是关键。

**Session 的两种实现与 Token 账本**：实现以 Session 为核心的 Harness 分两种——MCP 形式注入（T3 Code、Synara 都是）与 Skill 形式注入。作者质疑 Tool Search 的意义：「Tool Search 的本质和 Skill 的差别也不是很大呀，为什么不用 Skill 去做呢？」最应该做的是提供**一个 Session 操作的 CLI**，让模型去操作它实现各种 Session 级管理，而这个 CLI 的描述完全可以作为 Skill。好处是：不激活这个 Skill 就不付这部分 token tax；在主对话里激活 Skill 去 Spawn 子对话时，子对话因没激活这些 Skill，就不用担心循环嵌套的 Spawn。但严格说它不只是 Skill——Skill 在上下文里仍会有一段较短的描述，而作者说的 CLI 描述**更像一种斜杠命令，只有用户手动激活，模型才能得到这部分描述**。

**Session 的两种类型**：普通 Session，与类似 Mono 的高级 Session（作为一个高级 Agent）。Mono 在输入时会自动激活这套操作；作者自己实现的版本里它是一个 `/operator` 这样的操作。Session 之间怎么传递信息由主 Agent 去写，这里不能加非常强的约束——用户需求和任务实现方式多种多样，只需起一个强大的主模型，让它理解用户需求并对齐、给出需求明确的 Prompt。作者实际使用下来，「并不会遇到所谓的预算传递或者深度限制这些问题」。

**Mono / Agent Memory 的心智减负逻辑**：从用户角度，人的心智是有限的——当然可以自己手动打开多个 Session 同时做多件事，但人在这种频繁的 Session 级切换下，精力会很快被消耗掉。好用的 Harness 要从用户角度考虑：用户只与主 Agent 对接，需要确认细节时再进入子 Session 进一步对话。这条思路也可进一步演化出现在比较火的 Personal Agent 等，作者认为这种实现思路可能会更简单一点。

**Search 的二分法**：有标准答案的 search 走 API；偏主观性、讨论性的 search 走类似 OpenCLI 这种复用登录态的方案。作者近期也在看搜索 API 搭配本地实验方案，大致思路是通过 DeepSeek Web Search / Fetch、Exa 这些 API，搭配本地 OpenCLI 实现复用浏览器登录态的搜索，从而满足搜索需求——「而这也恰恰是个人本地工具相比大厂更有优势的地方」。

**Remote Control 与 Mobile App**：国外用户可能没足够体验；但对国内用户来说，很多时候 remote control 和 mobile App 是非常重要的事情。

**谦逊的收尾**：作者手搓 Harness 觉得真的好玩，但也深刻意识到「小作坊是永远打不过大公司的」——自己手搓的更新速度不用说跟大公司比，光跟一些开源仓库比都远远落后，所以比较希望自己的思想能被大公司采纳，从而得到更优秀的使用体验、也不必付出更多维护成本。

## 来源

- 原文：<https://zhuanlan.zhihu.com/p/2096275149876216777>

## 附件

- [[Assets/2026-10/zhihu-20261031-2096275149876216777.md]]
