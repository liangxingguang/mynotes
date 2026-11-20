---
id: wiki-source-2026-11-20-acceptance-agent-opt
type: source
title: AI 10分钟写完代码，你2小时还在验？用验收Agent补上最后一公里
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - ai-agent
  - ai-coding
  - acceptance
sources:
  - raw/sources/ai/2026-11-20-acceptance-agent-opt.md
---
# AI 10分钟写完代码，你2小时还在验？用验收Agent补上最后一公里

## Overview（概览）

腾讯云开发者公众号文章（作者吴思）：腾讯医疗相关业务自建 OPT 平台后，AI 让代码生成提速，验收却成为需求交付的新瓶颈——接口返回 200 只说明调通一次，需求逻辑、边界条件、老数据兼容、异步任务、日志与 DB 状态仍需逐层验证。文章介绍该团队在 OPT 需求交付小队中补上的「后端验收 Agent」，其执行内核是 api-acceptance Skill：五阶段流程（变更接口分析 → 编译发布与接口验证 → Gherkin 测试 → TAPD 预测试 → 验收结果输出），以 L1-L4 多层证据链输出结论，并用「硬阻塞/软失败」贯穿异常处理。

## Key Facts（关键事实）

- 作者：吴思；发布平台：微信公众号「腾讯云开发者」；采集日期 2026-11-20。
- OPT（One Person Team）平台：以 CodeBuddy 等 CLI 为底层运行时打造的人与 Agent 协同研发平台，多个 Agent 组成小队协同完成需求分析、规划、开发。
- 后端验收 Agent 已运行 160+ 次，覆盖 30+ 个需求、80+ 个入口接口、800+ 个 Gherkin 场景，发现 20+ 条问题并打回修复（作者自报数据）。
- 单次验收人工投入：典型后端需求从约 2 小时降至约 20 分钟，预计下降 80%+（作者测算，非第三方验证）。
- 30+ 个需求中 10+ 次验收未通过；验收能力已推广到其他医疗相关业务。
- Gherkin 场景确认报告必须人工确认后才能真实执行（硬阻塞点）。
- 环境优先级：Agent 任务专用隔离环境 > 个人开发环境 > 公共测试环境。
- 参数构造来源优先级：真实数据优先，LLM 推理只做兜底。
- 正在探索端侧 E2E 验收 Agent（H5 和小程序）。

## Important Claims（重要论断）

### Claim 1：验收是 AI 代码生成时代的需求交付新瓶颈

AI 代码生成速度远大于人工需求验收速度；后端代码的采纳和验收不等于「代码已生成」或「接口能调通」，需求逻辑、边界条件、老数据兼容、异步任务、日志与 DB 状态仍需验证。文章要解决的问题是「AI 已把代码生成速度提上来之后，如何帮助开发更快更稳地判断代码是否真的可用」。

### Claim 2：硬阻塞与软失败的二分是贯穿全流程的底层设计

api-acceptance 不把任何异常都当失败，也不把受限项包装成成功：硬阻塞保证 Agent 不越过必要的人机确认与环境前提；软失败让 Agent 在发布失败、spec 缺失、日志不可用等受限情况下继续完成能做的部分并诚实标注。核心原则：能验证的尽量验证，不能验证的诚实标注，不把受限项伪装成通过。

### Claim 3：接口返回 code=0 不等于验收通过

「表面成功」常见四种情形：字段含义不符需求、写接口成功但 DB 状态未变、主接口成功但下游失败、异步消息未消费或日志链路显示副作用未发生。故采用 L1-L4 多层证据链，场景结果分层表达，最终结论分四档，报告以 HTML 呈现。

### Claim 4：确定性先于自动化

自动化执行前先校准业务预期：先明确「要验什么、怎么算对」，再让 Agent 承担重复执行工作；事实密度（接口用例、测试账号、日志、DB、业务知识库等上下文）决定验收可靠性，业务知识库建设至关重要。

### Claim 5：人机协同支撑最终判断

Agent 帮助完成初验、收集证据、暴露风险、提出修复建议，但最终是否可交付需结合业务优先级与发布风险由人判断；AI 的价值不是替人承担责任，而是帮助人基于更充分的证据做决策。

## Concepts Introduced（引入的概念）

- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[artifact-verification-delivery|产物核验与独立交付]]
- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]

## Entities Mentioned（提及的实体）

- [[opt-platform|OPT 平台（One Person Team）]]

## Implications（影响／启示）

- 在 AI 原生研发链路中，「验证/验收」环节可以像编码一样被 Agent 化：关键是把验收范围从 git diff 反推、把验收预期用 Gherkin 固化并经人确认、用多层证据链代替单一接口返回判断。
- 「诚实标注边界」（WARN/SKIP/无法判定）比表面全绿更有协作价值——与证据边界、可证伪原则同向。
- 验收步骤沉淀为 Skill 后可跨业务复用，是「能力资产化」的实例。

## Limitations（局限）

- 单信源、作者自述实践：160+ 次运行、80%+ 提效等数字均为作者自报，无第三方验证。
- 原文中 L1-L4 各层名称的分层拆解在图片中，采集稿仅保留「L4 静态 Review（最后兜底）」文字（1px 占位图无内容），四层全名在 raw 中无全文依据。
- 变更接口分析报告、Gherkin 场景确认报告、验收报告 HTML 等样例均为截图，正文未文字化。
- 平台为内部自建系统，细节（如 TAPD 用例分类规则、结论四档的具体判定）未在文中展开。

## Related Knowledge（相关知识）

- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]
- [[opt-platform|OPT 平台（One Person Team）]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[kongming-ai-dev-platform|孔明（AI 研发平台）]]

## Source（信源）

- `raw/sources/ai/2026-11-20-acceptance-agent-opt.md`
- 原文：https://mp.weixin.qq.com/s/k2LwwM4-u0OnPKvQqwlAWw
