---
id: wiki-source-linked-list-vs-array-cache
type: source
title: 链表已死？C++ 之父：O(1) 不一定比 O(N) 快
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - performance
  - data-structure
  - cache
sources:
  - raw/sources/architecture/2026-10-21-linked-list-vs-array-cache.md
related:
  - wiki/concepts/cpu-funnel-coding.md
  - wiki/concepts/cache-line-and-false-sharing.md
---
# 链表已死？C++ 之父：O(1) 不一定比 O(N) 快

## Overview（概览）

科普长文：从知乎热议切入，复盘"链表 vs 数组"十几年论战——Stroustrup《Are lists evil?》澄清文、Carruth"非连续数据结构是万恶之源"、社区实测数据，最后给出三派观点各自对一半的结论：大 O 分析假设内存访问免费，而现代 CPU 的真实成本在缓存行、预取器与内存墙。

## Key Facts（关键事实）

- 教科书结论的隐藏前提：数组插入 O(n)、链表 O(1) 的大 O 比较假设"访问内存免费"；内存墙（CPU 速度指数涨、DRAM 延迟改善极慢，访存可差上百周期）使该前提失效。
- 现代 CPU 两机制：缓存行（64 字节整块加载）与硬件预取器（线性访问提前搬数据）；局部性原理决定性能。链表两条全踩：节点分散→每跳指针可能缓存未命中；pointer chasing 让预取器无能为力。数组插入的 memcpy 连续、预取友好，实际快得惊人。
- Stroustrup 2012 实验（Jon Bentley 出题：随机整数按序插入+随机删除）：std::list 完败 std::vector；他发文澄清重点不在链表，而是三条原则——**不存储不必要的数据、保持数据紧凑、以可预测的方式访问内存**；建议是默认 std::vector。
- Carruth（Google LLVM）CppCon 2014："Discontiguous data structures are the root of all evil."
- 社区实测：list 直到元素体积 1KB+、数量过万才在某些场景反超 vector（搬移成本真正超过指针追逐成本）；buddy 分配器教学项目 vector 两分钟 vs list 二十五分钟（12 倍+）；2025 arXiv 论文发现"大量摊还 O(1) 插入、极少遍历"模式下 list 换 vector 反而慢 30%+——大 O 没骗人，只是只在"访存成本可忽略"的模式下接近真相。
- 链表没死，退居幕后：Linux 内核 list_head 侵入式链表无处不在（节点生命周期由外部对象决定不允许拷贝、要求 O(1) 摘除任意节点）；跳表（Redis ZSET）、B/B+ 树（数据库索引）、plf::colony/unrolled linked list（游戏业改造）、LRU（哈希+双向链表）继承了链表的逻辑灵活性、用工程手段补回物理局部性。
- 三派结论：应用层业务代码"链表已死"成立（无脑数组/deque 几乎总对）；性能敏感场景"输给数组"成立（缓存命中率是生命线）；系统全貌"退居幕后"成立（内核/分配器/引擎深处仍在用）。

## Important Claims（重要论断）

### Claim 1：大 O 说链表赢，CPU 缓存说链表输，裁判永远是跑出来的真实时间

算法复杂度分析之外还有一门课叫计算机体系结构；大 O 记号之上还站着缓存行、预取器和内存墙（信源收尾）。

## Concepts Introduced（引入的概念）

- 内存墙/缓存局部性对数据结构选型的支配（2026-10-23 起与 Disruptor 信源合并立概念页 [[cache-line-and-false-sharing]]）

## Entities Mentioned（提及的实体）

- Bjarne Stroustrup / Chandler Carruth（人物，未立页）

## Implications（影响／启示）

- "默认连续内存，除非有充分理由"可作为代码评审中数据结构选型的默认立场（解读）。

## Limitations（局限）

- 科普文，实测数字为转引社区口径；JDK 的 LinkedHashMap/链表桶等工程变体未讨论。

## Related Knowledge（相关知识）

- [[cpu-funnel-coding|CPU 漏斗（编码级性能模型）]]（"让 CPU 只做核心运算"的另一侧面）
- [[cache-line-and-false-sharing|CPU 缓存行效应（概念页）]]（本信源提供局部性侧证据）
- [[springboot-disruptor-event-bus|Disruptor 无锁事件总线（信源页）]]（缓存行效应的伪共享侧实践）

## Source（信源）

- `raw/sources/architecture/2026-10-21-linked-list-vs-array-cache.md`
