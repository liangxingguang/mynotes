---
id: wiki-source-jdk-09-hashset-linkedhashset
type: source
title: JDK源码阅读(10) — HashSet & LinkedHashSet：说好的"不重复"是怎么做到的？
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
  - raw/sources/misc/2026-10-27-jdk-09-hashset-linkedhashset.md
related:
  - wiki/sources/jdk-08-treeset-vs-hashset.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/hashset-internals.md
  - wiki/concepts/hashmap-internals.md
---
# JDK源码阅读(10) — HashSet & LinkedHashSet：说好的"不重复"是怎么做到的？

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 (10) 篇，逐段解剖 HashSet 与 LinkedHashSet 源码：HashSet 全部方法委派给内部 HashMap（元素作 key、value 为 PRESENT 占位对象）；LinkedHashSet 仅靠包级私有构造的 dummy 参数把底层换成 LinkedHashMap 获得插入序；附顺序对比与自定义对象去重 Demo、五条注意事项与三 Set 对比表。

## Key Facts（关键事实）

- HashSet 内部持有 `HashMap<E,Object> map`，value 统一为静态占位对象 `PRESENT`；add/remove/contains/size/iterator 全部委派。
- `add(e)` 一行实现：`map.put(e, PRESENT) == null`——key 不存在 put 返回 null（添加成功），已存在返回旧值 PRESENT（判重失败）。
- 去重机制 = HashMap key 唯一性：`hashCode()` 定位桶 + `equals()` 桶内判同；自定义对象必须同时重写两者。
- LinkedHashSet 通过包级私有构造 `HashSet(capacity, loadFactor, dummy)` 把底层换成 LinkedHashMap；dummy 参数仅为区分签名，无实际作用。性能损失约 5~10% 换插入序（作者经验值）。
- 迭代器 = `map.keySet().iterator()`，继承 HashMap 的 fast-fail 语义（遍历中改结构抛 CME）。
- 序列化自行写 capacity/loadFactor/size/元素而非序列化 HashMap 本体，为跨 JDK 版本兼容性考量。
- 可变对象陷阱：入 Set 后修改参与 hashCode 的字段 → contains 失效、对象滞留桶中导致内存泄漏。
- 均非线程安全：`Collections.synchronizedSet()` 或 `ConcurrentHashMap.newKeySet()`（信源示例写法 `new ConcurrentHashMap<>().newKeySet()`）。

## Important Claims（重要论断）

### HashSet 是"组合优于继承"的纯粹实践

作者论断：HashSet 虽继承 AbstractSet，但核心功能全凭组合委派给 HashMap——"你以为学了个新类，其实学的还是 HashMap"。

### 重写 equals 就必须重写 hashCode，反之亦然

不重写 hashCode 时两个属性相同的对象落入不同桶，HashSet 判不重复——"最常见的 HashSet BUG，没有之一"（作者论断）。

## Concepts Introduced（引入的概念）

- [[hashset-internals|HashSet / LinkedHashSet 去重设计]]

## Entities Mentioned（提及的实体）

- JDK（java.util 包：HashSet/LinkedHashSet/HashMap/LinkedHashMap）

## Implications（影响／启示）

- 已知数据量应预设初始容量（`size/0.75` 向上取整）避免 rehash 抖动（信源建议）。
- 依赖遍历顺序的业务（分页、展示）禁用 HashSet，按序需求选 LinkedHashSet 或 TreeSet（信源建议）。

## Limitations（局限）

- "5~10% 性能损失"为作者经验值，无基准测试；LinkedHashMap 的 access-order 模式未涉及（该模式见 [[linkedhashmap-internals|LinkedHashMap 有序化设计]]）。

## Related Knowledge（相关知识）

- [[treeset-internals|TreeSet 有序集合设计]]（三 Set 对比的另一极）
- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]（迭代器 fast-fail 的机制原理）
- [[jdk-source-reading-album|JDK 源码阅读合集（30 篇系列索引）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-09-hashset-linkedhashset.md`
