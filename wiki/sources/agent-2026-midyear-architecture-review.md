---
id: wiki-source-agent-2026-midyear-architecture-review
type: source
title: 2026 Agent 年中总结：从整体架构到关键细节（叶小钗）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai
  - agent
  - architecture
sources:
  - raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/agent-evaluation.md
  - wiki/concepts/durable-execution.md
---
# 2026 Agent 年中总结：从整体架构到关键细节（叶小钗）

## Overview（概览）

公众号长文：从产研视角把 2026 年的 Agent 热词还原成一张可工作的系统职责图——Harness 组织判断与执行、Runtime 承载资源、业务系统保存事实；再沿工具、上下文、Skill、多 Agent、生命周期、评测六个面逐一给出设计判据。落点是「薄 Harness 厚 Skills」。

## Key Facts（关键事实）

- 核心命题：Agent 系统设计的核心是把模型在运行中作出的判断，接到一个可验证、可恢复的执行过程里；模型负责灵活理解，程序保证执行规则，人承担关键决策与责任。
- 判断场景适不适合 Agent 的四个条件：**信息能否取得、工具能否使用、结果能否验证、失败能否恢复**——比"无脑上 Agent 架构"更易得出清楚设计。
- 职责图：Harness（上下文装配、工具调用、循环控制、暂停恢复、权限检查、运行记录）组织判断与执行；Runtime 回答资源问题（命令在哪台机器跑、依赖装哪、浏览器耗谁的资源）；业务系统保存需落地的事实。
- 四组职责问题：任务与控制（允许做到哪步、何时停）、判断与执行、状态与资料、观察与改进。
- 工具设计：工具描述同时承担使用说明和选择规则，描述模糊直接变成运行中选择成本；`success: false` 不足以支持恢复（身份过期/查询为空/版本冲突/超时处理各不相同）；**Agent 决策基于状态快照，执行时要判断快照是否仍有效**（示例：读到第 142 条消息，发送时群里已到 144 条，返回 STALE_CONTEXT + next_action）；防止过期执行与保证任务推进要一起设计。
- 工具完整性四环节检查：选得对、调得动、读得懂结果、失败后知道如何处理。
- 上下文：企业里"模型不懂业务"多发生在信息进模型之前（口径、语义、未入系统的专家判断）；四类信息分开管理——任务状态/业务知识/长期记忆/执行存档；**记忆是派生信息，关键业务事实要能回查**；外部资料夹带的指令不应获得系统规则权限。
- Skill：难点是沉淀阈值、例外和证据要求（"什么情况补查、什么情况淘汰、什么情况必须回来问人"）；支持"改中间环节不重跑全流程"需保存原始数据、中间产物与各阶段依赖；Workflow 管确定依赖、Skill 组织可复用方法、模型处理现场判断，三者协作。
- 多 Agent：先回答工作能否独立、各需什么信息、结果谁接收、怎样证明完成；共享资源要划分所有权（独立工作区/版本检查/指定提交者）；验证者应读实际产物而非执行者自我总结。
- 生命周期：任务状态至少区分排队/执行/等待确认/暂停/失败/完成/取消；**可靠恢复需要同时保存工作进度与已发生的业务效果**；超时或取消不能证明旧执行者已停止，要防新旧执行者重复写入；预算（时间/步数/费用/并发/重复失败次数）要进入任务控制——"模型有能力继续尝试，不意味着系统应该无限允许它继续执行"。
- 评测：应从需求阶段开始而非后置；验收分清工具返回、任务结果和业务收益（接口成功可能只是"已受理"）；评分组合=程序核验确定性字段 + LLM Judge 语义质量 + 专家抽查校准；通过率必须说明分母和任务构成；线上失败归因后回流数据集。

## Important Claims（重要论断）

### Claim 1：Agent Loop 是推进任务的循环，验收机制决定这个循环什么时候有资格结束

模型返回"完成了"要继续核验交付物与业务状态；任务完成的证据应能在产物或业务状态中找到。

### Claim 2：薄 Harness 厚 Skills

提升泛化能力靠 Agent 而非 Workflow 之后，稳定性的答案是把业务判断沉淀进厚 Skills，Harness 保持薄。

## Concepts Introduced（引入的概念）

- 「薄 Harness 厚 Skills」架构取向（与既有 [[agent-loop]]、[[agent-evaluation]] 互证，未单独立页）

## Entities Mentioned（提及的实体）

- MCP / Agent Skills 开放格式规范（提及未立页，mcp 已有概念页 [[mcp]]）

## Implications（影响／启示）

- 四条件（信息/工具/验证/恢复）可作为 Agent 立项评审的极简检查清单（解读）。
- "评测后置"被明确判为反模式——与本库 [[agent-evaluation]] 的全生命周期立场互证（解读）。

## Limitations（局限）

- 综述性文章，各节判据未配完整工程实现；作者语境偏咨询/营销类企业 Agent。

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]（Harness/Runtime 划分与循环控制的第三信源）
- [[agent-evaluation|业务 Agent 全生命周期评测]]（评测前置与证据验收互证）
- [[durable-execution|持久执行]]（"同时保存工作进度与业务效果"即持久执行目标）

## Source（信源）

- `raw/sources/ai/2026-10-21-agent-2026-midyear-architecture-review.md`
