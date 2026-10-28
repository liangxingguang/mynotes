---
id: wiki-concept-enummap-enumset-internals
type: concept
title: EnumMap / EnumSet 枚举专用集合设计（ordinal 直接索引）
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
  - raw/sources/misc/2026-10-27-jdk-17-enummap-enumset.md
related:
  - wiki/concepts/hashmap-internals.md
  - wiki/concepts/hashset-internals.md
  - wiki/concepts/cache-line-and-false-sharing.md
  - wiki/sources/jdk-17-enummap-enumset.md
---
# EnumMap / EnumSet 枚举专用集合设计（ordinal 直接索引）

## Definition（定义）

java.util 中两个枚举专用集合（JDK 1.5 引入）的共同设计：放弃哈希，直接拿枚举的 `ordinal()` 当索引。EnumMap 用长度=枚举常数个数的 `Object[] vals`，`vals[key.ordinal()]` 即存取；EnumSet 用位向量——≤64 个常量时 RegularEnumSet 以单个 `long` 的每个 bit 表示一个枚举常量是否存在，>64 时 JumboEnumSet 扩为 `long[]`。

## Why It Matters（为什么重要）

枚举常量集编译期固定、不可变、天然带稠密序号，使"数组直索引/位向量"这种通用集合用不了的结构成为可能：查找成为确定性 O(1)（无哈希、无碰撞、无扩容），集合运算退化为单条位运算指令，内存从"桶数组+节点对象"压到"精确数组/单个 long"。它是"利用输入域特殊性换取数量级收益"的经典范本。

## Core Characteristics（核心特征）

1. EnumMap：put/get/containsKey 均为 `vals[key.ordinal()]` 一次数组访问；containsValue 需遍历为 O(n)；迭代按枚举声明顺序；容量固定无扩容。
2. null 语义不对称：EnumMap 不允许 null key（拿不到 ordinal，typeCheck NPE）但允许 null value（内部以静态 NULL 占位对象包装/解包，区分"值为 null"与"槽位空"）；EnumSet 不允许 null 元素（HashSet 允许一个）。
3. EnumSet 按枚举数自动选型：`noneOf` 中 `universe.length <= 64` → RegularEnumSet（单 long 位向量），否则 JumboEnumSet（`long[(len+63)>>>6]`），用户无感知。
4. 集合运算=一条位运算：add `|= (1L<<ord)`、contains `& (1L<<ord)`、并 `|=`、交 `&=`、差 `&= ~`、containsAll `(a&b)==b`；等价判断 `elements == that.elements`。
5. 两者均非线程安全（需 `Collections.synchronizedMap/synchronizedSet` 包装，或放弃性能优势换并发容器）。
6. 两者均自定义序列化：只存 enum class 与值数组、不存 ordinal，反序列化重建，兼容不同 JVM 间 ordinal 不一致。
7. 性能论断（信源经验值）：EnumMap get 比 HashMap 快 2~3 倍、put 快 3~5 倍、内存省 50~70%；EnumSet contains 比 HashSet 快约一个数量级。

## Structure（结构）

EnumMap：`keyType` + `keyUniverse`（构造时缓存枚举常量数组）+ `Object[] vals` + `size` + 静态 NULL 哨兵。EnumSet：抽象基类持 `elementType` + `universe`；RegularEnumSet 一个 `long elements`；JumboEnumSet 一个 `long[] elements`，每槽管 64 bit，addRange 用 `-1L << from.ordinal()` / 中间填 -1 / `-1L >>> -(to.ordinal()+1)` 三段式批量置位。

## How It Works（运作方式）

写路径（EnumMap.put）：typeCheck → `index = key.ordinal()` → `vals[index] = maskNull(value)`。读路径：`unmaskNull(vals[ordinal])`。EnumSet.add：`elements |= (1L << ordinal)` 后比对旧值判断是否新增。迭代按 ordinal 升序，因此两者遍历顺序即枚举声明顺序。

## Relationships（关系）

### Distinctions（区分）

- 与 [[hashmap-internals|HashMap 核心设计（JDK 8）]]：HashMap 靠扰动+桶+树化换均摊 O(1) 与通用性；EnumMap 靠 ordinal 直索引换确定性 O(1) 与紧凑内存，仅限枚举键。
- 与 [[hashset-internals|HashSet / LinkedHashSet 去重设计]]：HashSet 是 HashMap 的 key 视图（每元素一个 Node）；EnumSet 是位向量（≤64 元素时约 8 字节），集合运算从"遍历逐个 put"降为一条位运算。

### Related Concepts（相关概念）

- [[cache-line-and-false-sharing|CPU 缓存行效应：局部性与伪共享]]（连续数组/位向量相比节点式结构的缓存友好性是其性能来源之一，解读）

## Evolution（演进）

单信源（jdk-17 源码篇，2026-10-28 摄入）：覆盖 EnumMap 内部结构、Regular/JumboEnumSet 选型与位运算实现、null/线程安全/序列化注意事项及双对比表。

## Open Questions（开放问题）

- 信源给出的性能倍数均为经验值，无基准环境与方法学，复现精度未知。
- JumboEnumSet 除 addRange 外的操作实现、EnumMap 的 clone/equals 细节当前信源未展开（未知）。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-27-jdk-17-enummap-enumset.md`

## Related Knowledge（相关知识）

- [[jdk-17-enummap-enumset|EnumMap & EnumSet 源码篇（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]
