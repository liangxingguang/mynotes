---
id: wiki-concept-arraydeque-internals
type: concept
title: ArrayDeque 循环数组设计（2 的幂容量 + 位运算定位）
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: medium
tags:
  - concept
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-13-arraydeque.md
related:
  - wiki/sources/jdk-13-arraydeque.md
  - wiki/concepts/priorityqueue-internals.md
  - wiki/concepts/fail-fast-modcount.md
  - wiki/concepts/cache-line-and-false-sharing.md
---
# ArrayDeque 循环数组设计（2 的幂容量 + 位运算定位）

## Definition（定义）

ArrayDeque 是 JDK 的可扩容双端队列：用 `transient Object[]` 数组 + head/tail 两个索引模拟环形缓冲区（Circular Array），容量恒为 2 的幂，索引回绕用 `(index) & (len-1)` 位运算替代取模，两端增删均摊 O(1)。

## Why It Matters（为什么重要）

它是"栈/队列/双端队列"三类场景的统一最优解：作栈替代有锁的 Stack（官方推荐，信源称快 3~5 倍）、作队列替代 LinkedList（无链表节点开销、缓存局部性好）；同时是"位运算取模 + 环形缓冲 + 扩容重排"这组数组优化手法的教科书样本。

## Core Characteristics（核心特征）

1. 容量恒为 2 的幂：`(index) & (len-1)` 等价于取模但更快；初始化用 5 次无符号右移级联把任意容量向上取整到 2 的幂（默认 16，最小 8）。
2. head 指队头、tail 指下一个插入位；`addFirst` 先移 head 再赋值，`addLast` 先赋值再移 tail，两指针同向追赶。
3. `head == tail` 即满，触发 `doubleCapacity` 翻倍（`n << 1`）；扩容时「分两段拷贝」把环形元素重排为连续顺序内存，head 归零。
4. 不允许 null：poll 系方法用 null 表示空队列，存 null 会无法区分；非线程安全，并发场景用 ConcurrentLinkedDeque。
5. 迭代器是弱 fail-fast：无显式 modCount，`DeqIterator` 用 `fence` 字段记录创建时 tail，结构修改后可能读到不一致数据但不抛异常。
6. 栈操作是门面复用：push=addFirst、pop=removeFirst、peek=peekFirst。

## How It Works（运作方式）

addFirst(e) → null 检查 → `head = (head-1) & (len-1)` 环状前移 → 赋值 → head==tail 则扩容。doubleCapacity → 新数组容量翻倍 → `System.arraycopy` 两段拷贝（head→末尾段放前面、0→head 段接后面）→ head=0、tail=n，恢复为顺序内存布局。pollFirst → 取 `elements[head]` → 槽位置 null 助 GC → `head = (head+1) & (len-1)`。

## Relationships（关系）

### Related Concepts（相关概念）

- [[priorityqueue-internals|PriorityQueue 二叉堆设计]]（related：同为数组承载的无界队列，堆序 vs 循环顺序）
- [[cache-line-and-false-sharing|缓存行与伪共享]]（depends-on：扩容重排追求顺序内存访问，其收益来自 CPU 缓存局部性原理）

### Distinctions（区分）

- 与 [[fail-fast-modcount|fail-fast 与 modCount 机制]] 的不同之处：ArrayList/HashMap 用 modCount 严格 fail-fast（抛 ConcurrentModificationException），ArrayDeque 无 modCount，用 fence 字段做弱一致性检测，可能读到不一致快照但不抛异常。
- 与 LinkedList 的不同之处：循环数组 vs 双向链表——前者内存连续、缓存友好、不允许 null；后者节点带前后指针开销大、允许 null、增量增长更灵活。
- 与 Stack 的不同之处：Stack 继承 Vector 有锁同步开销；ArrayDeque 无锁、官方推荐替代。

## Evolution（演进）

单信源（公众号源码解读）；自 JDK 6 引入起即为官方推荐的栈/队列实现（信源陈述）。

## Open Questions（开放问题）

- ConcurrentLinkedDeque 的无锁并发实现（未知，当前信源未覆盖）。
- "作栈比 Stack 快 3~5 倍"的基准测试方法与适用条件（未知，信源未给数据）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-13-arraydeque.md`

## Related Knowledge（相关知识）

- [[jdk-13-arraydeque|ArrayDeque 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
