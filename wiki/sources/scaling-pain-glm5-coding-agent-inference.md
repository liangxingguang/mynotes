---
id: wiki-source-scaling-pain-glm5-coding-agent-inference
type: source
title: Scaling Pain：超大规模 Coding Agent 推理实践（GLM-5 / SGLang）
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - source
  - inference
  - kv-cache
  - glm
sources:
  - raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md
related:
  - wiki/sources/deepseek-v41-flash-inference-deployment.md
  - wiki/concepts/pd-separation-kv-cache-consistency.md
  - wiki/concepts/hicache-read-before-ready.md
  - wiki/concepts/speculative-decoding-quality-monitoring.md
  - wiki/concepts/layersplit-kv-cache-tiering.md
---
# Scaling Pain：超大规模 Coding Agent 推理实践（GLM-5 / SGLang）

## Overview（概览）

GLM 团队官方技术博客（z.ai/blog/scaling-pain，知乎专栏转载，jina 三级兜底抓取，正文含知乎站内搜索链接噪声）。线上 GLM-5 Coding Agent 场景出现乱码、复读、偶现生僻字，标准环境不复现；团队数周定位出两个相互独立的底层竞态（PD 分离下 KV Cache 复用竞态、HiCache 加载时序缺失），修复后给出 LayerSplit 分层存储优化。方法论亮点：用投机采样指标做异常检测，把性能优化技术变成输出质量的实时监控信号。一手工程复盘，事实密集。

## Key Facts（关键事实）

- 异常特征：只与系统压力相关、与请求内容无关；线下回放数百次不复现，调整 PD 分离比例并压测模拟高峰期 Prefill 堆积与 Decode KV Cache 压力后，约每万次请求稳定复现 3-5 次。
- 投机采样监控阈值：spec_accept_length 持续低于 1.4 且生成长度已超过 128 token，或 spec_accept_rate 超过 0.96 → 主动中止生成并交负载均衡器重试。
- BugFix#1：PD 分离下 Decode 侧 Abort 信号未传播至 Prefill 侧，Req1 的 RDMA 写入覆盖 Req2 复用的 KV Cache 槽位；修复后异常发生率由约万分之十几降至万分之三以下。
- BugFix#2：HiCache 流水线 Indexer 算子启动未同步 Load Stream 的 Indexer Cache 加载完成，出现 read-before-ready；修复后该类异常完全消失，已通过 PR #22811 提交 SGLang 社区。
- LayerSplit：每卡仅持有部分层 KV Cache、计算前广播，广播与 indexer 计算重叠掩盖，仅引入约 KV Cache 1/8 的 Indexer Cache 广播开销；Cache 命中率 90% 时 40k-120k 请求吞吐提升 10%-132%。
- 负载特征：Coding Agent 场景输入长度平均超过 70K tokens，前缀复用率较高。

## Important Claims（重要论断）

### Claim 1

当智能进入高并发、长上下文 Coding Agent 场景后，推理基础设施挑战不只是吞吐、延迟与可用性，维护输出质量变得至关重要；对 Scaling Law 的追求必须有同等强度的系统工程支撑。

### Claim 2

异常"与请求内容无关、与系统压力相关"的特征指向推理基础设施的链路与状态管理问题，而非模型本身（本地回放数百次不复现是关键判据）。

### Claim 3

投机采样指标（spec_accept_length / spec_accept_rate）可作为输出质量的实时监控信号——乱码/生僻字伴随极低 spec_accept_length，复读伴随偏高 spec_accept_rate。

## Concepts Introduced（引入的概念）

- [[pd-separation-kv-cache-consistency]]
- [[hicache-read-before-ready]]
- [[speculative-decoding-quality-monitoring]]
- [[layersplit-kv-cache-tiering]]

## Entities Mentioned（提及的实体）

- [[deepseek-v41-flash-inference-deployment]]（同为 PD 分离大规模推理官方实践，互证）
- GLM-5 / GLM-5.1（智谱模型系列）
- SGLang（开源推理引擎，BugFix#2 修复提交至其社区）
- 中科加禾（北京）科技有限公司、中国科学院计算技术研究所处理器芯片全国重点实验室（致谢合作方）

## Implications（影响／启示）

- 排查方法论：异常"与内容无关、与压力相关"是区分模型问题与 Infra 问题的分水岭；复现需要模拟真实压力分布而非仅回放请求。
- 投机采样从性能优化技术拓展为质量监控信号——性能指标的异常模式可反推状态损坏。
- PD 分离与多级 KV Cache 引入的跨节点/跨 stream 状态一致性问题，需要显式同步约束而非隐含依赖。

## Limitations（局限）

- 单信源（官方博客自述），复现率"约每万次请求 3-5 次"为团队口径；线下复现频率仍低于线上，说明检测可能漏检或存在未覆盖触发场景。
- 抓取噪声：知乎 jina 兜底导致正文混入 zhida 站内搜索链接（raw 中保留）；配图为远程链接未下载。
- 未公开量化细节：Abort 超时阈值、CP 规模、消融实验的具体设置未给出。

## Related Knowledge（相关知识）

- [[deepseek-v41-flash-inference-deployment]]
- [[pd-separation-kv-cache-consistency]]
- [[hicache-read-before-ready]]
- [[speculative-decoding-quality-monitoring]]
- [[layersplit-kv-cache-tiering]]

## Source（信源）

- `raw/sources/ai/2026-10-31-scaling-pain-glm5-coding-agent-inference.md`
- 官方技术 blog：https://z.ai/blog/scaling-pain
