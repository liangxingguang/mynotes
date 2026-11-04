---
id: 2026-11-04-arraylist-vs-linkedlist
title: 为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清
source: 微信公众号「从CRUD到架构师」· 专辑《架构师之路》第 01 期
source_url: http://mp.weixin.qq.com/s?__biz=MzY4NTAxMTAwMA==&mid=2247483675&idx=1&sn=c1b12538797c7f76868ff961e5f12657
source_type: article
platform: 微信
created: 2026-11-04
category: 学习
tags: [java]
asset_ref: Assets/2026/11/arraylist-vs-linkedlist.md
wiki_status: ingested
---

> 摘要：Java 集合框架三件套底层原理拆解。ArrayList 是动态数组（初始容量 10、扩容 1.5 倍），随机读取 O(1) 但中间插入 O(n)；LinkedList 是双向链表，头尾操作 O(1) 但 get(i) 要从头遍历 O(n)——循环里用下标遍历 LinkedList 是 O(n²) 的经典坑。HashMap 四层考点：哈希桶数组、冲突链表、JDK 8 链表≥8 且数组≥64 转红黑树、负载因子 0.75 触发扩容。附面试答法与加分项。

## 核心要点

1. **开头案例**：`LinkedList` 上用 `get(i)` 下标遍历 10 万次 = O(n²)，换 for-each 或 ArrayList 立即解决。
2. **ArrayList 底层**：`Object[]` 动态数组，默认初始容量 10，扩容为原容量 1.5 倍（`oldCapacity + (oldCapacity >> 1)`），`Arrays.copyOf` 新建+复制。连续内存 → 随机访问 O(1)、CPU 缓存友好；代价是中间插入/删除需移位，最坏 O(n)。
3. **LinkedList 底层**：双向链表 Node（数据+前后指针），内存不连续，每节点多约 24 字节开销；头尾插入/删除 O(1)，但 `get(index)` 从头遍历 O(n)。
4. **选型表**：随机读取/尾部追加/内存占用/缓存友好均 ArrayList 胜；仅中间插入、头部插入 LinkedList 胜。实际开发 90% 场景 ArrayList 够用；需要头尾操作队列/栈时用 `ArrayDeque`（比 LinkedList 更快），而不是 LinkedList。
5. **HashMap 四层考点**：① 哈希桶数组，`hash & (capacity-1)` 位运算定位；② 冲突用链表串接；③ JDK 8 链表长度≥8 且数组≥64 转红黑树（查询 O(n)→O(log n)），≤6 退化回链表；④ 默认容量 16、负载因子 0.75，size>12 触发翻倍扩容。
6. **线程安全**：HashMap 非线程安全，JDK 7 并发 put 可能死循环（扩容时链表倒序），JDK 8 用 tail 指针避免但仍有数据覆盖风险；多线程用 `ConcurrentHashMap`。
7. **面试加分项**：ArrayList 扩容 1.5 倍 vs Vector 2 倍；HashMap 容量恒为 2 的幂（为了位运算替代取模）；HashMap 允许一个 null key（hash 特殊处理为 0，固定放桶 0 位），HashTable 不允许。

## 正文

全文见附件（含源码片段、内存布局示意图与面试三问答法）。

## 来源

- [为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清](http://mp.weixin.qq.com/s?__biz=MzY4NTAxMTAwMA==&mid=2247483675&idx=1&sn=c1b12538797c7f76868ff961e5f12657)

## 附件

[[Assets/2026/11/arraylist-vs-linkedlist.md]]
