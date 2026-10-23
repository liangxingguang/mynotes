---
id: wiki-source-distributed-systems-introduction
type: source
title: 第一章：分布式系统概述（codedump 分布式系统中文教程）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - distributed-systems
  - tutorial
sources:
  - raw/sources/architecture/2026-10-16-distributed-systems-introduction.md
related:
  - wiki/topics/system-design-core-components.md
---
# 第一章：分布式系统概述（codedump 分布式系统中文教程）

## Overview（概览）

codedump 分布式系统中文教程的开篇章。以集中式单机系统为对照建立分布式系统定义（Coulouris：组件分布于网络互联计算机、靠消息传递协同、无共享内存），剖析四大核心挑战，并总结工程师四点心智转变。

## Key Facts（关键事实）

- 分布式 vs 集中式对照：多节点网络消息传递（延迟无上限）vs 本地调用；水平扩展 vs 垂直扩展；冗余容错 vs 单点故障；需定义一致性模型 vs 天然一致。
- 采用分布式七大动因：高性能、高扩展性、高可用性、地理就近、合规（数据驻留/主权）、资源共享、业务天然分布式（如电商+支付）。
- 分布式计算的谬误（L. Peter Deutsch 等，Sun）八条：网络可靠、延迟为零、带宽无限、网络安全、拓扑不变、存在一名管理员、传输成本为零、网络同构。
- TCP 只给"可靠流"幻觉：不解决连接断开；为保顺序阻塞后续包造成延迟抖动；ACK 只代表内核收到，不代表应用已处理。
- 时钟悖论：时钟快的 A 于 10:00:05 发消息，时钟慢的 B 本地 10:00:04 收到——日志上"收到早于发送"；依赖物理时间戳做 last-write-wins 会导致灾难性覆盖。
- 部分失效四种无法区分的情形：请求丢失、节点崩溃（处理一半）、响应丢失、处理缓慢；可引发亚健康进程、重复扣款、线程池耗尽级联故障、误判宕机导致脑裂。
- Lamport 戏谑定义："一台你甚至不知道存在的计算机的故障会导致你自己的计算机无法使用"。
- 一致性是频谱而非布尔值：副本同步延迟内不同节点给出不同答案，架构师在延迟/强一致与可用性/最终一致之间按业务权衡。
- CAP 的正确读法（信源观点）：分区容错是必须接受的客观事实，不是可选项；分区发生时只能在 C 与 A 间取舍。

## Important Claims（重要论断）

### Claim 1：工程师需完成四点心智转变

① 二态→三态逻辑（RPC 有成功/失败/超时三态，超时即"薛定谔状态"，须幂等设计）；② 绝对时间→因果顺序（放弃全局时钟，用逻辑时钟）；③ 完美主义→CAP 权衡艺术；④ 防御故障→拥抱故障（熔断/降级/隔离，默认依赖会挂）。

### Claim 2：分布式的真理变成"流言"

单机有"上帝视角"（共享内存/单一数据库）保证强一致；分布式受光速与网络延迟限制，无法让全节点同一时刻拥有相同数据视图。

## Concepts Introduced（引入的概念）

- 部分失效（Partial Failure）与三态逻辑
- 逻辑时钟（提及，深入讨论在后续章节）
- 分布式计算的谬误（Fallacies of Distributed Computing）

## Entities Mentioned（提及的实体）

- codedump 分布式系统中文教程（在线教程，未单独立页）
- GFS（Google 2003 论文，横向扩展例证，未立页）

## Implications（影响／启示）

三态逻辑与幂等、拥抱故障两条心智转变，与 [[agent-loop|Agent Loop]] 生产化边界信源中"重试必须理解副作用、每类停止各有原因"的工程原则同构（解读）。

## Limitations（局限）

- 教程开篇章，概念性内容为主；解决方案（逻辑时钟、共识、一致性模型、分区）仅点名，在后续章节展开。
- 无代码与实验数据。

## Related Knowledge（相关知识）

- [[system-design-core-components|系统设计核心组件]]（分布式组件清单的互补信源）

## Source（信源）

- `raw/sources/architecture/2026-10-16-distributed-systems-introduction.md`
