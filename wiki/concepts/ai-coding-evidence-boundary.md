---
id: wiki-concept-ai-coding-evidence-boundary
type: concept
title: 证据边界驱动的 AI Coding
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - concept
  - ai
  - ai-coding
  - engineering-practice
  - evidence
sources:
  - raw/sources/ai/2026-11-03-weixin-ai-coding-storage-practice.md
related:
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/ai-coding-delivery-evolution.md
  - wiki/concepts/agent-permission-model.md
---
# 证据边界驱动的 AI Coding

## Definition（定义）

在"不能出错"的高复杂度系统（如分布式存储）中使用 AI Coding 的方法：不禁止 AI，而是按任务类别（AI 评审 / AI Debug / AI 自动化）分别划定边界，用可在实际场景中复现的证据决定每条结论的可信度。分工是：AI 负责扩大搜索空间、加速迭代验证；人负责系统语义和最终判断。

## Why It Matters（为什么重要）

AI 提速后缺陷绝对数仍会上涨——千行缺陷率持平但交付功能更多，瓶颈从"写"移到"验证"。高容错要求的系统对 AI 的错误尤其不友好：一致性、并发、持久化、故障恢复问题被放大，且 AI 的误判多源于看不到代码之外的东西（运维流程、设计决策、团队约定）。没有证据边界的 AI Coding 只是更快的出错。

## Core Characteristics（核心特征）

1. **三类任务分别定边界**：
   - AI 评审：结论按证据等级四档输出（测试确认 / 测试证伪 / 源码追踪确认 / 未验证写明缺什么）；"无问题"必须列出已检查路径；审 checkout 代码而非 PR 网页（网页 diff 只显示约 2% 真实改动）。
   - AI Debug：定位是假设生成器+验证助手，输出候选集合、不接受单根因；统一七类命名（观察事实 / 候选 / 已验证因素 / 根因 / 放大因素 / 缓解方案 / 未验证风险），防止结论在措辞里被悄悄升级。
   - AI 自动化：先明确目标、边界和验收标准；关键操作（改公共配置、删除数据、发布上线）始终由人确认。
2. **可执行证据四层互补**：静态推理定候选（代码里是否存在这条路径）、构建+单测判真伪（给定输入下是否确实出错）、集成测试验可达（真实交互和已有保护下是否仍可达）、运行时日志看现实（线上是否发生、频率与幅值）。四层互相补充，不可互相替代。
3. **可证伪性**：每个结论写清触发条件、依据的证据、如何证伪；没有证据的只能标成假设或待验证。
4. **红绿闭环**：测试必须能变红——修复前稳定复现变红、修复后变绿、撤回修复又变红；复现走真实入口。
5. **变绿≠解决**：改断言、引入替身、跳过用例、绕过清理路径都改变了验证范围，需说明理由并从全局不变量审查修复。
6. **领域知识显式化但只沉淀稳定部分**：给 AI 稳定不变式而非全部文档（过时文档会带偏 AI）；缺陷知识库防重复误报但要警惕回归检不出。
7. **分层授权**：只读分析 / 受控修改 / 受控执行 / 人工决策逐级放开；根因认定、修复采纳、关键操作由人把关。

## Structure（结构）

证据四层的能力边界（信源 2.3.4 小结）：

| 证据层 | 能回答 | 回答不了 |
|---|---|---|
| 静态推理 | 代码里是否存在这条路径 | 是否真的出错、是否可达、线上是否发生 |
| 构建+单测 | 给定输入下是否确实出错 | 竞态与时序；线上是否会产生该输入 |
| 集成测试 | 在真实交互和已有保护下是否仍可达 | 线上是否真的发生 |
| 运行时日志 | 线上是否发生、频率与幅值 | 从未执行过的路径 |

## How It Works（运作方式）

评审流程：AI 全仓评审输出疑似清单 → 逐条写测试把推理变成红绿（变红=确认，证伪=误报）→ 集成测试降误报、裁决分歧 → 运行时日志补充"已经发生"的证据 → 结论按四档输出，未验证条目汇总为测试基础设施待办。Debug 流程：先固定事实底稿（表现影响/经过/环境/操作历史分开记录，标注采集时间与来源实例）→ AI 输出候选集合 → 实验验证因果 → 沿"生产—传播—持久化—提交—消费—恢复—清理"完整链路找第一次错误 → 人确认根因后从全局不变量审查修复。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]：Debug 定位与"它翻译你判断"的分工互证；本页补充七类命名与证据四层。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：同属"先证据后动作"的方法论；本页把证据纪律从 JVM 调优扩展到 AI 评审/Debug/自动化。
- [[ai-coding-delivery-evolution|AI 编程交付演进]]：AI Coding 交付链路背景。
- [[agent-permission-model|Agent 权限模型]]：分层授权（只读/受控修改/受控执行/人工决策）与权限模型设计互链。

### Distinctions（区分）

- 与"禁止 AI"区分：本方法不是限制 AI，而是用可复现证据把边界划清楚——边界越清楚，AI 能放手干的范围越大。
- 与"多 Agent 投票"区分：票数=重合度≠正确度，盲区共享会错得一致，交叉评审结论仍要逐条验证。

## Evolution（演进）

- 2026-11-05 — 美团基础技术部分布式存储团队实践（第一方信源）确立三类任务边界、证据四层、七类命名与方法论 6 条；与 [[ai-assisted-troubleshooting-workflow]]（贴文本排障分工）和 [[evidence-first-jvm-tuning]]（JVM 证据纪律）互为印证。

## Open Questions（开放问题）

- 证据四层的投入成本与收益未量化（117 疑似→36 确认的单次实验不足以外推）。
- AI 定级失真问题（同一类问题定级漂移）信源只描述未给解法。
- 缺陷知识库"防重复误报但回归检不出"的权衡如何量化，未展开。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-03-weixin-ai-coding-storage-practice.md`（三类任务边界、证据四层、七类命名、方法论 6 条、实验数据）

## Related Knowledge（相关知识）

- [[2026-11-03-weixin-ai-coding-storage-practice|如何在"不能出错"的系统里使用 AI Coding（信源页）]]
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]
