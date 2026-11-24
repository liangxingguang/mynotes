---
id: wiki-concept-full-cycle-developer-workflow
type: concept
title: Full-Cycle Developer 工作流（fcd）
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - concept
  - ai
  - ai-coding
  - workflow
  - acceptance
sources:
  - raw/sources/ai/2026-11-24-weixin-fcd-full-cycle-developer.md
related:
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/ai-coding-evidence-boundary.md
  - wiki/sources/2026-11-24-weixin-fcd-full-cycle-developer.md
---
# Full-Cycle Developer 工作流（fcd）

## Definition（定义）

一套让 AI 把"写完代码之后的活"也自己干完的工作流：动手前自己挑需求毛病、做完后自己验收、有问题自己返工、做完一次长一次记性，人只负责拍板与收货。由腾讯智能文档团队以 skill 形式落地，工程化为命令行工具 `@tencent/fcd-ai`。核心原则是**不信它说的，只信它拿出来的证据**——每个"做完了"都要附"你凭什么说做完了"。

## Why It Matters（为什么重要）

AI 写代码快，但写完后人类要逐条点开检查、描述 bug、等它改，且换需求还在同坑摔倒——"AI 在写代码，人在给 AI 当测试"。fcd 把验收、返工、经验沉淀三件事交还给 AI，解决的是 AI 编码提速后验证环节成为新瓶颈的问题（与[[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]"瓶颈从写移到验证"的判断同构）。

## Core Characteristics（核心特征）

1. **六阶段流程 + 每阶段一道 Gate**：环境检查→定 Plan→建测试页→逐点实现→经验沉淀→收尾清理；一次只做一个阶段，AI 逐条自核，不过关当场重做或停下来问人。
2. **Plan 是全流程唯一基准**：需求单、设计稿、现有代码三边对到一张实现清单，"做没做完"只看它；禁止预读后阶段提示词，防 AI 提前"顺手"开工。
3. **自验收**：验收标准必须客观；UI 还原走自动化比稿（Figma MCP 取标准答案→先断言状态再截图→pixelmatch 70%+SSIM 30% 打分→数值对账→归因修复复检到清零）；主线程只认证据不认结论。
4. **自返工**：先找根因再动手，禁止反向偏移"凑"过去；一轮改完统一复检；偶发问题不许跳过；涉及初始化的改动必须整页重开验证。
5. **自沉淀**：经验分流到 skill 与规范库，只写验证过的；探索知识库禁记踩坑结论——没验证的是谣言，验证过的才是经验。
6. **完成口径只认清单**：逐条读清单状态，有未打勾只能说"完成了 M 条中的 N 条"；假数据/临时写死/依赖后端未验证处登记上线待办。

## Structure（结构）

- 阶段 2.5「规范分发」：派子代理读 Plan 与开发守则，给每条任务回填必须遵守的规范条目，避免每个子代理重读整本规范。
- 阶段 3「建测试页」：按设计稿组件与状态建线上测试文档，结构落一份"标题→Plan 条目"清单，子代理直接知道去哪一块验。
- 阶段 4「逐点实现」：每个功能点派独立子代理，验收走比稿系统；交差前差异清单先落盘再发消息。

## How It Works（运作方式）

1. 环境检查不通过即整流程停下——环境不对时所有"验证通过"都是假的。
2. Plan 阶段硬规矩：链接一个不落读完；每条任务写出处（写不出即脑补，挪待确认）；标六类类型（UI/交互/数据/埋点/兼容/性能，非 UI 不得缺失）；设计稿逐帧对比含隐藏态；零空格铁律（通过/偏差/阻塞/不适用四选一，留空即不过关，禁"其余正常"）；三边对不上列需确认项；先查组件库不重复造轮子。
3. 比稿打分 98 达标但分数仅初筛：不到就按差异图逐项核实真差异还是渲染噪声；复检掉 2 分以上按改坏了排查。数值对账防"正负抵消"埋雷。
4. 组合验证：另开全新浏览器串真实流程——电子签名"单点都过、串起来才炸"即在此步暴露；A 的产出被 B 使用的接缝必须由主线程亲跑。
5. 沉淀：怎么写成→skill；整类做法→独立 skill；必须守的规矩→规范库；未验证猜测不写。skill 描述须写清"什么时候用"与触发词。

## Relationships（关系）

### Related Concepts（相关概念）

- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]：同为"编码之后的验收"问题，fcd 是端到端工作流，验收 Agent（OPT 平台）偏后端接口验收，二者互证。
- [[ai-native-sdlc|AI 原生 SDLC]]：fcd 是 SDLC 全流程闭环的一种具体实现形态。
- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]："只信证据"与证据四层纪律同构。

### Dependencies（依赖项）

- Figma MCP（设计稿取值与比稿标准答案）、pixelmatch/SSIM（比稿打分）、duim-ui-knowledge-mcp（组件库查询）、TAPD（效果度量）。

### Distinctions（区分）

- 与[[ai-coding-delivery-four-stages|AI Coding 交付四环节]]的区别：后者是交付流程的环节划分（意图/上下文/评审/评估），fcd 是单次需求内"计划—实现—验收—沉淀"的闭环操作规范。
- 与[[spec-driven-development|规范驱动开发（SDD）]]的区分：SDD 强调规范作为约束先于代码，fcd 的 Plan 清单承担类似角色但更偏验收清单而非宪法。

## Evolution（演进）

- 7 月底（需求 B）：仅"先写技术方案，再让 AI 按方案实现并自验"。
- 8 月中（需求 C）：搭起第一版工作流。
- 9 月初：整理成 skill；9 月中后（需求 E/F/G）：用完整版。
- 效果：TAPD 数据每百条测试用例新引入 bug 2.31→0.49（-79%），重开 bug 3→0，严重级 4→0（同一前端团队、同一组测试同学，需求名脱敏；自报口径）。
- 回归验证效率：每点 30-40 分钟 → 4 个点共约 15 分钟（沉淀验证手法 skill 后）。

## Open Questions（开放问题）

- 效果数据无对照组，-79% 等指标为单团队自报，外推需谨慎。
- 移动端真机验证未自动化；浏览器验证仍是最耗时环节，作者自述仍在优化。
- 流程中多数规矩来自具体翻车事故，规则密度与 token 成本（Plan 慢、token 多）的平衡未量化。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-24-weixin-fcd-full-cycle-developer.md`（腾讯智能文档团队第一方实践，微信公众号）

## Related Knowledge（相关知识）

- [[acceptance-agent|验收 Agent]]
- [[ai-native-sdlc|AI 原生 SDLC]]
- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]
- [[2026-11-24-weixin-fcd-full-cycle-developer|半年用AI写需求，我终于不用给AI当测试了（信源页）]]
