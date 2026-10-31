---
id: 2026-10-31-scaling-pain-coding-agent-inference
title: Scaling Pain：超大规模 Coding Agent 推理实践（GLM-5 / SGLang）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2033130936229959142
source_type: article
platform: 知乎
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - AI
asset_ref: Assets/2026-10/zhihu-20261031-2033130936229959142.md
wiki_status: pending
---

# Scaling Pain：超大规模 Coding Agent 推理实践（GLM-5 / SGLang）

> 摘要：GLM-5 线上 Coding Agent 场景出现乱码、复读、偶现生僻字，标准推理环境不复现、只在高并发长上下文下触发。团队数周定位出两个相互独立的底层竞态（PD 分离下 KV Cache 复用竞态、HiCache 加载时序缺失），并给出 LayerSplit 分层存储优化。方法论亮点：用**投机采样指标**做异常检测，把一项性能优化技术变成输出质量的实时监控信号。

## 核心要点

- **判定"模型还是 Infra"**：本地回放 bad cases 数百次未复现 → 大概率不是模型问题；线上日志脱敏回放仍不复现，直到调整 PD 分离比例、持续提高负载、模拟高峰期 Prefill 堆积与 Decode 侧 KV Cache 压力后，约每万次请求稳定复现 3-5 次。特征是"**与请求内容无关、与系统压力相关**"→ 指向推理基础设施的链路与状态管理。线下频率仍低于线上，说明检测可能漏检或有未覆盖的触发场景。
- **检测突破口是投机采样**：复读相对容易检测，乱码与生僻字棘手（正则与字符集启发式有漏判误伤，基于模型判别不满足大规模消融实验的效率要求）。观察到两个指标在异常时呈稳定模式：**乱码/生僻字 → 极低 spec_accept_length**（草稿模型生成的候选 token 几乎全部被目标模型拒绝，说明目标模型看到的 KV Cache 状态与草稿模型预期之间存在显著偏差）；**复读 → 偏高 spec_accept_rate**（损坏的 KV Cache 可能使注意力模式退化，把生成过程推向高置信度的重复循环）。
- **在线监控策略**：当 spec_accept_length 持续低于 1.4 且生成长度已超过 128 token，或 spec_accept_rate 超过 0.96 时，系统主动中止当前生成，并将请求交由负载均衡器重试。投机采样由此从单纯的性能优化技术，拓展为**输出质量的实时监控信号**，成为后续消融实验的关键工具。
- **BugFix#1：PD 分离架构下的 KV Cache 竞态**：为限制尾延迟，推理引擎引入基于超时的请求终止——Prefill 未在规定时间内完成时，Decode 侧对请求执行 Abort 并回收其 KV Cache。但 **Abort 信号未被正确传播至 Prefill 侧**，同时 Decode 侧也缺乏判断 KV Cache 是否可安全回收与复用的充分信息。于是 Req1 被 Abort 后槽位分配给 Req2，而 P1 侧针对 Req1 的 RDMA 写入与 Prefill 计算仍在继续，**写入已被 Req2 复用的显存区域、覆盖其部分 KV Cache**，Req2 在 Decode 阶段读到被覆盖数据 → 生成结果异常。修复：在请求终止与 KV Cache 写入完成之间建立显式同步——Decode 触发 Abort 后向 Prefill 发通知，Prefill 仅在"相关 RDMA 写入尚未开始，或所有已提交写入均已完成"时才返回"可释放"信号，Decode 仅在收到确认后才允许回收并复用槽位。**异常输出发生率由约万分之十几下降至万分之三以下。**
- **BugFix#2：HiCache 加载时序缺失**：Coding Agent 场景显著提高输入长度（**平均超过 70K tokens**）且伴随较高前缀复用率，使 HiCache（多级 KV Cache）成为线上关键优化。Load Stream 负责加载 KV Cache 与 Indexer Cache，Forward Stream 依次执行 Index 计算与 Sparse Attention；理论上 Forward Stream 中的 Indexer 计算应在对应 Indexer Cache 完成加载后才能启动，**但原始实现该依赖未被显式表达**，Indexer 算子启动时未对 Load Indexer Cache 的完成建立同步约束 → Forward Stream 可能先于 Load Stream 完成数据加载而开始执行，出现 **read-before-ready** 访问模式，Index 计算基于不完整或未初始化的数据 → 影响后续 Sparse Attention → 输出异常。修复：重构算子流水线的原子性，在 Indexer 算子启动前引入与 Load Stream 的同步点；修复后相同负载下该类异常完全消失，**已通过 Pull Request #22811 提交至 SGLang 社区**。
- **优化：LayerSplit（KV Cache 分层存储）**：两个竞态揭示共同瓶颈——**长上下文 Coding Agent Serving 场景中 Prefill 阶段主导系统性能**。负载上下文长、Prefix Cache 命中率高 → Context Parallel（CP）成为线上 Prefill 节点的主要并行策略，但 SGLang 开源实现存在 KV Cache 冗余存储问题，有限的 KV Cache 容量成为 GPU 计算资源利用率的限制因素。方案：每张 GPU 不再保存全部层的 KV Cache，仅持有部分层；计算时持有某一层 KV Cache 的 rank 在执行 Attention 前将该层 Cache 广播给其他相关 rank；并设计 **KV Cache 广播与 indexer 计算的重叠机制**使二者在时间上相互掩盖——整个流程仅引入 Indexer Cache 广播的额外开销，规模约为 KV Cache 的 **1/8**，通信成本较低、对性能影响可忽略。效果：Cache 命中率达 90% 条件下，请求长度 40k-120k 区间**吞吐量提升幅度在 10% 至 132% 之间，且随上下文长度增加收益更显著**。
- **结论**：当智能真正进入高并发、长上下文的 Coding Agent 场景后，推理基础设施的挑战已经不只是吞吐、延迟和可用性，**维护它的输出质量变得至关重要**。每一次对 Scaling Law 的追求，都必须有同等强度的系统工程作为支撑。

## 正文

> 采集说明：知乎专栏页触发登录墙，`web-fetch` 经三级 jina 兜底成功（fetch_level: jina）。正文中混入大量知乎站内搜索链接噪声（`zhida.zhihu.com` 的 zd_token），配图为远程链接未下载。正文文字完整可读。官方技术 blog：<https://z.ai/blog/scaling-pain>

**背景与问题**：对 Scaling Law 的信仰不仅驱动模型参数与数据规模突破，也在逼近 Infra 工程的极限，这一过程伴随的阵痛称为 "Scaling Pain"。随着大模型应用从简单对话全面转向更复杂的、更长程的 Coding Agent 任务，推理基础设施每天承受数亿次 Coding Agent 调用。自 3 月起，线上监控与用户反馈中观察到三类异常：**乱码（garbled output）、复读（repetition）、生僻字（rare character）**。表面看与长上下文常见的"降智"相似，但团队并未上线任何降低模型精度的优化，关键问题是**异常源于模型本身还是推理链路**——若源于模型，会表现为针对特定输入的稳定可重复行为；反之若与系统压力或运行时状态相关，则更可能指向推理基础设施中的链路或状态管理问题。

**从线下复现到异常识别**：先对 bad cases 本地回放并重复推理数百次，始终未能复现；再对线上日志做脱敏处理、尽可能保留原始并发分布与请求时序，在本地全量回放，起初仍未复现。直到进一步**调整 PD 分离比例并持续提高系统负载**，模拟高峰期的 Prefill 堆积和 Decode 侧 KV Cache 压力后，才在约每万次请求中稳定复现 3-5 次异常。检测方面：复读相对容易，乱码与生僻字棘手；尝试过正则表达式、字符集匹配等启发式方法（存在明显漏判与误伤），也尝试过基于模型判别的方式（难以满足大规模消融实验的效率要求），异常检测本身成为定位流程中的瓶颈。最终从反复分析推理日志中找到意想不到的切入点——投机采样指标。

**BugFix#1 完整时序（图 2）**：初始阶段 Req1 被发送至 Prefill-1（P1）和 Decode（D），由于调度或排队等原因，Req1 在 P1 侧经历一段等待后才开始执行 Prefill Forward；与此同时 Decode 侧一段时间内未收到对应的 KV Cache 数据，触发超时机制并对 Req1 执行 Abort。随后 Decode 侧回收 Req1 占用的 KV Cache 槽位，但**没有正确通知 P1**；紧接着新请求 Req2 到达，被分配至 Prefill-2（P2）和 Decode，由于内存复用策略 Req2 被分配到与 Req1 **相同的 KV Cache 地址**；P2 开始执行 Prefill Forward 并进行 KV Transfer，并在较短时间内完成，使 Decode 侧进入生成阶段。与此同时，P1 侧针对 Req1 发起的 KV Cache 写入仍在继续，其数据会写入已被 Req2 复用的显存区域，从而覆盖 Req2 的部分 KV Cache。最终 Req2 在 Decode 阶段读取到被覆盖的数据，导致生成结果异常。结论：**在 PD 分离架构中，需要对跨节点的数据传输与显存复用建立明确的一致性约束。**

**BugFix#2 细节**：通过 DSA HiCache 缓存读取路径的时序分析定位问题。系统从 CPU 内存异步换入（swap-in）历史前缀缓存，并通过 Load Stream 与 Forward Stream 的重叠执行提高吞吐。图 3(a) 中 Load Stream 负责加载 KV Cache 与 Indexer Cache，Forward Stream 依次执行 Index 计算与后续 Sparse Attention；红色虚线区域即 Indexer 算子启动时未对 Load Indexer Cache 完成建立同步约束的位置。修复后如图 3(b)，在数据加载与计算之间引入显式的同步约束：Indexer 算子启动前引入与 Load Stream 的同步点，确保对应层级的 Indexer Cache 已完成加载，Forward Stream 仅在数据就绪后才启动计算。

**LayerSplit 动机链**：为控制 Prefill 排队带来的 TTFT 引入了超时 Abort；为缓解 Prefill 侧 KV Cache 容量压力引入了 HiCache。在修复这些状态一致性问题后，进一步回到瓶颈本身——如何提升 Prefill 吞吐、降低 Prefill 侧 KV Cache 显存压力。图 4(a) 为每卡仅持有部分层 KV Cache 的分层布局，图 4(b) 为不同 CP rank 协同完成 Prefill 的广播方式；图 5 为 GLM-5.1 + LayerSplit 在不同长度下的吞吐提升曲线。

**致谢与出处**：中科加禾（北京）科技有限公司、中国科学院计算技术研究所处理器芯片全国重点实验室团队的合作与支持。技术 blog：<https://z.ai/blog/scaling-pain>

## 来源

- 原文：<https://zhuanlan.zhihu.com/p/2033130936229959142>
- 官方技术 blog：<https://z.ai/blog/scaling-pain>

## 附件

- [[Assets/2026-10/zhihu-20261031-2033130936229959142.md]]
