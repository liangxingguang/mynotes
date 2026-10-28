---
id: wiki-source-jdk-17-enummap-enumset
type: source
title: JDK源码剖析——EnumMap & EnumSet，用枚举当数组下标，快得离谱！
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - jdk
  - collections
sources:
  - raw/sources/misc/2026-10-27-jdk-17-enummap-enumset.md
related:
  - wiki/concepts/enummap-enumset-internals.md
  - wiki/sources/jdk-03-hashmap.md
  - wiki/sources/jdk-09-hashset-linkedhashset.md
  - wiki/sources/jdk-source-reading-album.md
---
# JDK源码剖析——EnumMap & EnumSet，用枚举当数组下标，快得离谱！

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 19 篇，拆解 java.util 下两个枚举专用集合：EnumMap 拿 `key.ordinal()` 直接当 `Object[] vals` 数组下标（无哈希、无碰撞、无扩容），EnumSet 用 long 位向量表示枚举子集（≤64 常量走 RegularEnumSet 单 long，>64 走 JumboEnumSet long 数组），集合运算退化为一条位运算指令。附状态机/权限标记/百万级过滤三个示例与 HashMap/HashSet 双对比表。

## Key Facts（关键事实）

- 两者均 JDK 1.5 引入、`java.util` 包：EnumMap 继承 `AbstractMap<K,V>`，EnumSet 继承 `AbstractSet<E>`，共同特点是利用枚举 `ordinal()` 作索引、不依赖哈希运算。
- EnumMap 核心字段：`Class<K> keyType`、`Object[] vals`（长度=枚举常量个数，构造时缓存 keyUniverse）、`int size`、静态 `NULL` 占位对象。
- EnumMap 用 maskNull/unmaskNull 把 null value 包装为 NULL 对象，以区分"值为 null"与"槽位空"；**不允许 null key**（typeCheck 直接 NPE），允许 null value。
- EnumMap 的 get/put/containsKey 是确定性 O(1)（直接数组索引，无均摊一说）；containsValue 为 O(n)；迭代按枚举声明顺序。
- EnumSet 静态工厂 `noneOf` 按枚举个数自动选型：`universe.length <= 64` 返回 RegularEnumSet（单个 `long elements` 位向量），否则 JumboEnumSet（`long[]`，容量 `(universe.length + 63) >>> 6`）。
- RegularEnumSet 的 add = `elements |= (1L << ordinal)`；contains = `(elements & (1L << ordinal)) != 0`。
- 集合运算全部是一条位运算：并集 `|=`、交集 `&=`、差集 `&= ~`、containsAll 判 `(a & b) == b`。
- JumboEnumSet 的 addRange：`from.ordinal() >>> 6` 定位 long 槽位，首段 `-1L << from.ordinal()`、中间槽填 -1、尾段 `-1L >>> -(to.ordinal()+1)`。
- 两者均非线程安全：需 `Collections.synchronizedMap/synchronizedSet` 包装；均不允许 null 元素（EnumSet 与 HashSet 允许一个 null 不同）。
- 两者均自定义序列化：只存 enum class 和值数组、不存 ordinal，反序列化重建，保证跨 JVM ordinal 不一致时的兼容性。
- 信源性能论断（经验值）：EnumMap get 比 HashMap 快 2~3 倍、put 快 3~5 倍、内存省 50~70%；EnumSet contains 比 HashSet 快约一个数量级；作者支付网关状态机路由 HashMap→EnumMap 后 TPS 从 2 万提升到 4 万+。

## Important Claims（重要论断）

### 枚举键/枚举元素场景下，专用集合全面碾压哈希集合

信源核心解读：当键或元素确定为枚举类型时，EnumMap/EnumSet 用 ordinal 直接索引替代哈希计算与碰撞处理，性能（确定性 O(1)、位运算级集合操作）与内存（精确数组/单 long vs 桶数组+Node 对象）全面占优； HashMap/HashSet 只在通用场景保留意义。

### 64 是 EnumSet 实现的自动选型分界线

JDK 开发组判断大部分枚举不超过 64 个常量：≤64 用 RegularEnumSet（单个 long），>64 自动降级 JumboEnumSet（long 数组）继续位运算——用户无感知。

## Concepts Introduced（引入的概念）

- [[enummap-enumset-internals|EnumMap / EnumSet 枚举专用集合设计（ordinal 直接索引）]]

## Entities Mentioned（提及的实体）

- JDK（java.util：EnumMap/EnumSet/RegularEnumSet/JumboEnumSet；对照：HashMap/HashSet/Hashtable/Collections）

## Implications（影响／启示）

- "ordinal 即索引"是枚举类型的免费午餐：枚举常量集在编译期固定且不可变，使数组直索引这种在通用 Map 中不可行的设计成为可能（解读）。
- 位向量集合（单 long 表达子集）是把"集合运算=CPU 指令"做到极致的样本，与布隆过滤器同属位向量思想谱系（解读）。

## Limitations（局限）

- 单一公众号信源；性能倍数（2~3x/3~5x/50~70%/一个数量级/TPS 2万→4万+）均为作者经验值或个案，无可复现基准数据与环境说明。
- EnumMap 的克隆、equals 实现细节与 JumboEnumSet 除 addRange 外的方法未展开；EnumSet 的 complementOf/range 仅给示例未给实现。

## Related Knowledge（相关知识）

- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]（EnumMap 的对照实现）
- [[jdk-09-hashset-linkedhashset|JDK源码阅读(10) — HashSet & LinkedHashSet（信源页）]]（EnumSet 的对照实现）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-17-enummap-enumset.md`
