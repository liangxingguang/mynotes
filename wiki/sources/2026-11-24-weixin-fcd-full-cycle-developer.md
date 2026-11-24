---
id: wiki-source-2026-11-24-weixin-fcd-full-cycle-developer
type: source
title: 半年用AI写需求，我终于不用给AI当测试了
status: active
created: 2026-11-24
updated: 2026-11-24
confidence: medium
tags:
  - source
  - ai
  - ai-coding
  - workflow
  - acceptance
sources:
  - raw/sources/ai/2026-11-24-weixin-fcd-full-cycle-developer.md
related:
  - wiki/concepts/full-cycle-developer-workflow.md
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/ai-native-sdlc.md
---
# 半年用AI写需求，我终于不用给AI当测试了

## Overview（概览）

腾讯智能文档团队侯国春的半年实践分享：full-cycle-developer（fcd）工作流 skill，把 AI 写完代码后的三件事——验收、返工、记性——也交还给 AI。人只负责拍板（改接口、加依赖、设计稿没画处）与收货（看汇报）。核心原则是"不信它说的，只信它拿出来的证据"。TAPD 数据：同一前端团队、同一组测试同学，每百条测试用例新引入 bug 从 2.31 降至 0.49（-79%），重开 bug 3→0，严重级 bug 4→0。已工程化为命令行工具 `@tencent/fcd-ai`，支持 CodeBuddy 与 Claude Code。

## Key Facts（关键事实）

- 定位与效果：TAPD 数据（需求名脱敏为 A~G），每百条测试用例新引入 bug 2.31→0.49（-79%），重开 bug 3→0，严重级 4→0；演进脉络：7 月底需求 B 仅技术方案+自验，8 月中需求 C 搭第一版，9 月初整理成 skill，9 月中后需求 E/F/G 用完整版。
- 六阶段流程：①环境检查（代理/dev server/登录态，端口不通即停，不带病上岗）②定 Plan（需求单链接一个不落读完、Figma 取设计稿、读现有代码，三边对到一张实现清单）③建测试页（先搭考场，实现一项验一项）④逐点实现（每点派独立子代理，自己验收自己返工）⑤经验沉淀（踩坑写成 skill、规矩写进规范，只写验证过的）⑥收尾清理（盘点未完成、关浏览器、留上线待办、汇报）。
- Plan 阶段硬规矩：每条任务写出处（写不出出处即脑补，挪待确认）；六类任务类型（UI/交互/数据/埋点/兼容/性能，非 UI 类不得缺失）；设计稿逐帧对比含隐藏态；零空格铁律（通过/偏差/阻塞/不适用四选一，留空即不过关，禁"其余正常"）；三边对不上列需确认项不自作主张；用 dui-ui-knowledge-mcp 查组件库；禁止预读后阶段提示词。
- 自验收：验收标准必须客观（"透明度不低于 0.9"而非"体验良好"）；UI 还原自动化比稿五步（Figma MCP 取标准答案、先断言状态再截图、pixelmatch 70%+SSIM 30% 打分、数值对账、归因修复复检到清零）；子代理交差前差异清单先落盘再发消息；关键需求双实例独立比稿；最后组合验证（全新浏览器串流程）。
- 自返工：先找根因再动手，禁反向偏移"凑"过去；一轮改完统一复检；偶发问题不许跳过；"看不到东西"按固定顺序排查（组件注册/数据/开关/缓存）；涉及初始化的改动必须整页重开验证。
- 自沉淀：经验分流（怎么做成写成 skill、整类做法单独成 skill、必须守的规矩进规范库、未验证猜测不写）；探索知识库禁记踩坑结论（未验证是谣言），skill 只写验证过的；回归验证从每点 30-40 分钟降到 4 点共 15 分钟。
- 工具与边界：`npm i -g @tencent/fcd-ai`（自带 12 份通用规范，比稿依赖内置）；适合有需求文档+设计稿的中等以上需求；代价是 Plan 慢、token 多；移动端真机验证仍需人工，浏览器验证仍是最耗时环节。
- 翻车换来的规矩：子代理会话中断致比稿结果丢失→交差前先落盘；"派活都回来"被当成"活干完"→完成只认清单逐条状态；假数据中间态被当最终形态→收口前主线程亲眼并排对全景；三个子代理各满分合起来零分→接缝由主线程亲跑；页面一直开着初始化时序差异不暴露→涉及初始化必须整页重开。

## Important Claims（重要论断）

### Claim 1："已完成"不值钱，证据才值钱

每个阶段一道 Gate，AI 逐条自核，不过关当场重做或停下来问人；主线程只认证据不认结论。

### Claim 2：可靠的工程师与手快实习生的差别在"写代码之外的事"

把规矩写得足够具体，AI 就没法糊弄；糊弄方式几乎都是"用一句总结性的话盖住一片没做的事"（"其余正常""全部完成""工具不稳定，跳过"），规矩针对的就是这些话术。

### Claim 3：探索知识库禁记踩坑、skill 专记验证过的坑

知识库东西是任务进行中随手记、未经验证，错误归因会让后面子代理放弃验证；skill 是任务结束后复盘写的，每条带证据。没验证的是谣言，验证过的才是经验。

## Concepts Introduced（引入的概念）

- [[full-cycle-developer-workflow|Full-Cycle Developer 工作流（fcd）]]（本信源编译）
- [[acceptance-agent|验收 Agent（AI 生成代码的验收）]]（自验收与证据链互证）
- [[ai-native-sdlc|AI 原生 SDLC]]（全流程闭环同构）
- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]（"只信证据"与四层证据纪律同构）

## Entities Mentioned（提及的实体）

- 腾讯智能文档团队（实践主体）；作者侯国春；贡献者马书福、陈东临（dui-ui-knowledge-mcp）
- `@tencent/fcd-ai`（npm 命令行工具，支持 CodeBuddy/Claude Code）
- TAPD（效果数据来源）；Figma MCP（设计稿取值）；pixelmatch/SSIM（比稿打分）

## Implications（影响／启示）

- Plan 是全流程唯一基准，"做没做完"只看它；清单字段必须逐格表态，留空即不过关。
- 验收标准必须客观可判；数值对账防"正负抵消"埋雷（总宽一致但分项互抵）。
- 子元素的问题不一定是子元素的问题——只修父级，禁止给子级硬写值"凑"过去。
- 清单状态与代码实际必须双向对齐：只看清单两个方向都会错（做了标未做、没做没发现）。

## Limitations（局限）

- 单一信源（团队第一方实践），数据来自内部 TAPD、需求名脱敏，无法独立复核。
- 效果数据为同一团队前后对比，未做对照组；-79% 等数字为自报口径。
- 移动端真机验证未自动化；浏览器验证最耗时，方案本身承认这是待优化环节。
- 配图（流程图、截图）在采集稿中为 1px 占位符，无法还原原文图形信息。

## Related Knowledge（相关知识）

- [[full-cycle-developer-workflow|Full-Cycle Developer 工作流（概念页）]]
- [[acceptance-agent|验收 Agent（概念页）]]
- [[ai-native-sdlc|AI 原生 SDLC（概念页）]]
- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding（概念页）]]

## Source（信源）

- `raw/sources/ai/2026-11-24-weixin-fcd-full-cycle-developer.md`
