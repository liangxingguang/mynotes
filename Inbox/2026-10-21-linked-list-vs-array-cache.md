---
id: 2026-10-21-linked-list-vs-array-cache
title: 链表已死？C++ 之父：O(1) 不一定比 O(N) 快
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/M-FKnd1kvdwvRtRNdsDK6g
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [算法, 工程实践]
asset_ref: Assets/2026/10/linked-list-vs-array-cache.md
wiki_status: pending
---

# 链表已死？C++ 之父：O(1) 不一定比 O(N) 快

> 「数组查询快、链表插入快」的教科书结论有个隐藏前提：访问内存免费。现代 CPU 的内存墙让这条前提崩塌——链表节点散落堆中，pointer chasing 每跳一次可能就是一次缓存未命中，预取器完全失效；数组搬移是连续 memcpy，预取友好快得惊人。Stroustrup 实测 std::list 完败于 std::vector，建议「默认用 vector」；Carruth 更直言「非连续数据结构是万恶之源」。但链表没死：内核侵入式链表、大对象+密集增删场景、跳表/B+树/LRU 等新形态里它仍是幕后支柱。核心教训：大 O 之上，还站着缓存行、预取器和内存墙。

## 核心要点

- **隐藏前提**：大 O 假设内存访问免费；现实是 L1 几个周期 vs 主存上百周期，局部性才是性能生命线
- **链表双杀**：节点分散→每次跳指针可能 cache miss；遍历是 pointer chasing→硬件预取器无能为力
- **Stroustrup 三原则**：不存不必要的数据、保持数据紧凑、以可预测方式访问内存；默认 vector，除非有充分理由
- **实测反转点**：元素体积 1KB+ 且数量上万时 list 才反超；buddy 分配器实验 list 比 vector 慢 12 倍
- **链表合理场景**：不允许拷贝（内核对象嵌入钩子）、O(1) 摘除任意节点、大对象+插入删除密集、纯插入极少遍历（换 vector 反而慢 30%）
- **新形态**：跳表（Redis ZSet）、B+ 树（数据库索引）、分组链表（游戏业）、LRU（哈希+双向链表）——继承逻辑灵活性，工程手段补物理局部性

## 正文

全文（含大佬原话、社区实测数据、内核分析）见 [[Assets/2026/10/linked-list-vs-array-cache]]。

## 来源

[链表已死？C++ 之父，O(1) 不一定比 O(N) 快](https://mp.weixin.qq.com/s/M-FKnd1kvdwvRtRNdsDK6g)

## 附件

- [[Assets/2026/10/linked-list-vs-array-cache]]
