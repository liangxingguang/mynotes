---
id: wiki-source-2026-11-03-weixin-ai-coding-storage-practice
type: source
title: 如何在"不能出错"的系统里使用 AI Coding？分布式存储实践与边界
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - source
  - ai
  - ai-coding
  - engineering-practice
  - distributed-storage
sources:
  - raw/sources/ai/2026-11-03-weixin-ai-coding-storage-practice.md
related:
  - wiki/concepts/ai-coding-evidence-boundary.md
  - wiki/concepts/ai-assisted-troubleshooting-workflow.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# 如何在"不能出错"的系统里使用 AI Coding？分布式存储实践与边界

## Overview（概览）

美团基础技术部分布式存储团队实践（2026-11 发布，文末活动截止 2026-11-04）。回答"如何在容错极低的系统里用 AI Coding"：不是禁止 AI，而是按任务类别（AI 评审 / AI Debug / AI 自动化）分别划定边界，用可复现证据（构建+单测、集成测试、运行时日志、静态推理四层互补）决定每条结论的可信度。核心结论：AI 负责扩大搜索空间与加速迭代验证，人负责系统语义与最终判断。

## Key Facts（关键事实）

- 背景判断：AI 提速后缺陷绝对数仍涨——千行缺陷率持平但交付功能更多；分布式存储放大一致性/并发/持久化/故障恢复/性能问题，故障影响面大、修复难、容错极低。
- 三类任务边界：AI 评审（结论按证据四档输出）；AI Debug（假设生成器+验证助手，输出候选集合、不接受单根因，七类命名防结论悄悄升级）；AI 自动化（先明确目标边界与验收标准，测试变绿≠解决）。
- 可执行证据四层互补：静态推理定候选、测试判真伪、日志看现实。
- 构建+单测实验：117 个疑似问题→36 条测试变红确认、3 条证伪、41 条源码确认、37 条未验证；测试报告硬编码 failures="0" 暴露 CI 自身问题。
- 集成测试：单进程拉起真实 Raft 集群验证；fake 走真实入口、用生产配置；主要价值是降误报与裁决分歧。
- 运行时日志实验：11 天 WARN 日志 67.8 万行、34 个调用点→5 个缺陷全部属实；发现 fail times 计数器卡住、证伪时钟错误、定级依据（阶段耗时 1,156 秒接近 int32 溢出 2 倍内）。
- 评审易错点：代码可达≠运维可达（EPOCH_NOT_MATCH 走不到；一天过期是人工流程设计）；把有意为之当缺陷（生产 abort() 是正确性高于可用性的选择）；修复建议本身需评审（32 位溢出用返回 int 的 get_size() 又引入截断）；PR 网页 diff 只显示约 2% 真实改动。
- AI 自动化两任务：分布式 KV 构建系统 Make+Autotools→CMake 迁移（覆盖 31 个构建文件）；KV 服务端 ARM 华为鲲鹏适配。易错：_exit 跳过析构、鉴权替身、CI 跳过 3 个 KMS 用例、全局链接选项允许重复符号。
- 方法论 6 条：低风险易验证开始；每个结论可证伪；测试必须能变红（红绿闭环）；变绿≠解决；领域知识显式化只沉淀稳定部分；分层授权（只读分析/受控修改/受控执行/人工决策）。

## Important Claims（重要论断）

### Claim 1：AI 把瓶颈从"写"移到了"验证"

代码产出变便宜，每一行仍需被证明是对的；收益看验证能力能否跟上生成速度。

### Claim 2：AI 的错误不在代码里，而在代码之外

被推翻的 AI 结论多是代码里走得通、现实中走不到——运维流程、设计决策、团队约定挡住了它；补上靠写下来、持续维护的不变量，而非更强的模型。

### Claim 3：流畅不是证据，一致不是正确，变绿不是解决

AI 最容易制造的三种错觉；在不能出错的系统里，无法证伪的结论只是假设。

### Claim 4：多 Agent 投票代替不了正确性判断

多个 Agent 读同一份 diff、缺同一份背景，盲区共享会错得一致；票数=重合度≠正确度。

## Concepts Introduced（引入的概念）

- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding]]（本信源编译）
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（"它翻译你判断"与 Debug 定位互证）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（"先证据后动作"的证据纪律同构）

## Entities Mentioned（提及的实体）

- 美团基础技术部分布式存储团队（实践主体）
- CMake（构建系统迁移目标）、Raft（集成测试拉起的真实集群）、gtest（单测验证框架）、ThreadSanitizer（竞态验证工具，信源自述工具链跑不了）

## Implications（影响／启示）

- AI 评审报告应按证据等级四档输出并区分结论来源（测试/日志/读代码），"未验证"清单即测试基础设施待办。
- "无问题"必须列出已检查路径——是评审里代价最高的一句话。
- 上下文给稳定不变式而非全部文档；缺陷知识库防重复误报但要警惕回归检不出。
- 要求 AI 声明执行过程是否发生降级（索引失败降级 grep 后正确率明显下降）。

## Limitations（局限）

- 单一信源（美团团队第一方实践），场景特定于分布式存储，结论外推到其他系统需谨慎。
- 实验数据（117 疑似、67.8 万行日志）为单次实践样本，作者自述"不能说明总能零误报"。
- 未给出 AI 评审相对人工评审的效率/质量量化对比；定级失真问题只描述未解决。

## Related Knowledge（相关知识）

- [[ai-coding-evidence-boundary|证据边界驱动的 AI Coding（概念页）]]
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流（概念页）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优（概念页）]]

## Source（信源）

- `raw/sources/ai/2026-11-03-weixin-ai-coding-storage-practice.md`
