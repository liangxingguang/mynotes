---
id: wiki-source-lala-agent-realtime-trading
type: source
title: AI Agent 如何进入实时交易系统：货拉拉的三个实践与一套工程方法论
status: active
created: 2026-11-23
updated: 2026-11-23
confidence: high
tags:
  - source
  - ai
  - agent
  - harness
  - enterprise
sources:
  - raw/sources/ai/2026-11-23-lala-agent-realtime-trading.md
related:
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/agent-production-four-layer-model.md
  - wiki/concepts/agent-loop.md
  - wiki/concepts/agent-evaluation.md
---
# AI Agent 如何进入实时交易系统：货拉拉的三个实践与一套工程方法论

## Overview（概览）

货拉拉技术总监亓隆基基于意图交易（AI 下单）、持续撮合（AI 撮合）、策略执行（AI 运营）三个已上线生产场景，讨论 Agent 与成熟的机器学习、运筹优化、交易系统如何分工，并提出"Agent 生产化四层模型"：模型决定起点，Harness 决定下限，Dual Loop 决定方向，业务知识决定上限。核心判断是"用 Agent 拓展系统能力边界，而非重做已有系统"。

## Key Facts（关键事实）

- **引入 Agent 三标准**：新增能力、新增结果、成本可覆盖；不用 Agent 就能解决的事不引入。边界内（ML 预测、运筹、业务规则、交易履约）由成熟系统承担，边界外（理解、规划、协调等开放式工作）才交给 Agent。
- **意图交易（AI 下单）**：用户表达意图、Agent 理解组织追问、交易系统提供权威事实（地址二次确认、车型因城而异、价格来自计价系统）。可靠完成靠三方面：先确定边界（ToC 响应时间不妥协、按难度选模型）、结构化订单草稿（信息变化重确认而非从历史推断）、确定性护栏（事实由系统确定、确认后执行、受权限/状态机/幂等约束）。专业选车分工为"理解交模型、约束交代码、事实交车型库"。意图识别 99%、选车正确率 93%、新客下单时长缩短 25%。
- **持续撮合（AI 撮合）**：司机侧从一次性推荐走向围绕目标的持续服务（Delegation）；订单侧以成单为目标持续推进，闭环 Observe→Decide→Act→Feedback→Replan，并在成功匹配/状态变化/时效到期/风险触发时终止——"没有终止条件的持续行动本身就是风险"。Multi-Agent 划小闭环：撮合大脑居中，两侧为状态上下文与确定性 Harness，下方为执行 Agent 与触达通道，底层仍为推荐/预测/运筹/定价/交易系统。"Agent 不替代算法，而是把离散决策组织成连续行动。"配对率相对提升 12%、ROI 为人工 4 倍。
- **策略执行（AI 运营）**：超过 35% 运营精力耗在人工执行。分工为人定目标/边界/授权、Agent 理解拆解调工具、系统执行动作。运营 Agent 核心是有状态执行 Runtime；所有业务动作必须走标准 Tool 对接真实系统，Harness 完成参数校验/权限/审计/人工反馈。按标准化执行→异常处理→策略建议→经营决策分层放权，"往执行端走得越深、往决策端越谨慎"。已完成 33+ 运营 Agent，执行效率 +80%，配置错误等操作失误降至 0。
- **四层模型**：模型（起点，大家同起点）/Harness（下限）/Dual Loop（方向）/业务知识（上限）。Harness 分"帮模型（可删除）"与"守业务（必写代码）"，判定法"假设模型已完美，此约束是否仍需"。Dual Loop 内环做对事、外环定正确事，业务归因定义 Badcase，LLM-as-Judge 需人工校准、由业务指标验收。业务知识按确定性分流：确定知识进代码、"什么是好"进评测、打法进策略。
- **作者**：亓隆基（Laurence Qi），货拉拉技术总监，负责交易核心链路、货运中台、货运及企业业务研发；曾任饿了么、阿里巴巴本地生活资深架构师。

## Important Claims（重要论断）

### Claim 1：Agent 的价值不在重做已有系统，而在拓展系统能力边界

应用边界从提效、辅助移到业务执行、直接参与交易，越往后价值越高、风险越大（幻觉与错误变成真实损失）。Agent 应承担把原只有人能完成的开放式工作转化为系统可持续完成目标的能力，而非替代已有成熟系统。

### Claim 2：Harness 必须分清"帮模型"与"守业务"两类约束

帮模型的 Harness（任务拆解、上下文组装、格式约束、补偿性重试）随模型变强会变薄，必须设计成可删除；守业务的 Harness（SOP、交易事实、权限/幂等/审计、人工接管）与模型强弱无关，必须写成代码。判定法：假设模型已完美，该约束是否仍需。

### Claim 3：更自主不等于更好——确定性结构的第一价值是让过程可度量

AI 撮合从完全 Agentic（难遵循 SOP、不可度量）→ 工作流编排大节点（流程遵循但上下文冗余）→ 高代码 Harness（代码编排 LLM 节点与状态机，既控 SOP 又按需组装上下文）。确定性结构让业务过程可度量，过程可度量策略才能被优化。

### Claim 4：Dual Loop 的外环发现内环看不见的问题

内环持续变好而配对转化率下降，根因不在对话能力而在没圈选到更高意向司机——这类问题只关注内环永远看不见，必须由外环发现，由业务归因定义 Badcase。LLM-as-Judge 不是终审，由人校准、由业务指标验收。

### Claim 5：写入 Prompt 不等于完成知识工程

业界常说"大模型 + Harness = Agent"，核心业务里还要加业务知识。业务专家是 Agent 的老师和裁判，业产研共同萃取的知识质量决定上限。

## Concepts Introduced（引入的概念）

- [[agent-production-four-layer-model]]
- [[harness-engineering]]
- [[agent-loop]]
- [[agent-evaluation]]

## Entities Mentioned（提及的实体）

- 货拉拉（企业，实时交易系统生产实践方；作者亓隆基为货拉拉技术总监）

## Implications（影响／启示）

- Agent 进入核心业务（直接改变业务状态）后，关注点从"能否正确回答/规划"转向"能否可靠地把事做完"，并须回答"创造了什么新业务价值"。
- Multi-Agent 的关键不在数量而在边界划分：闭环做小更易各自演进；大模型上下文过长注意力分散，单 Agent 职责过多表现变差。
- 评测从对话质量转向任务完成率、执行准确率、效率、业务影响、人工介入率。

## Limitations（局限）

- 单信源、作者自述的生产实践与自报指标（意图识别 99%、配对率 +12%、ROI 4 倍、执行效率 +80% 等），未给出独立验证口径。
- 四层模型明确针对"已有系统掌握业务事实"的核心业务场景；事实由 Agent 生成或无成熟系统依托时，原则需重新推导。
- 抓取稿配图原位为 1px 占位符（公众号抓取常态），文字内容完整，图 1/2/3 仅存说明文字。

## Related Knowledge（相关知识）

- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]
- [[agent-production-four-layer-model|Agent 生产化四层模型]]
- [[agent-loop|Agent Loop]]
- [[agent-evaluation|业务 Agent 全生命周期评测]]
- [[2026-11-23-learn-claude-code-course|手写一个 mini Claude Code（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-11-23-lala-agent-realtime-trading.md`
- 原文：https://mp.weixin.qq.com/s/OLljY1Vd221YeMmSFnOGrg
