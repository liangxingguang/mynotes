---
id: wiki-source-jdk-01-arraylist
type: source
title: JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？
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
  - raw/sources/misc/2026-10-27-jdk-01-arraylist.md
related:
  - wiki/sources/jdk-02-linkedlist.md
  - wiki/sources/jdk-03-hashmap.md
  - wiki/sources/jdk-source-reading-album.md
  - wiki/concepts/fail-fast-modcount.md
---
# JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？

## Overview（概览）

公众号「Java解忧杂货铺」JDK 源码阅读系列第 1 篇，逐段注释 ArrayList 核心源码（构造/add/get/remove/迭代器），配反射观察容量变化的可运行 Demo，并以 subList、toArray、线程安全、容量预分配四个实战坑收尾。

## Key Facts（关键事实）

- ArrayList 底层是 `transient Object[] elementData`，自定义 writeObject/readObject 只序列化实际有数据的部分；JDK 1.2 引入。
- 默认容量 `DEFAULT_CAPACITY = 10`；无参构造走懒加载——`elementData` 先指向共享空数组 `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`，首次 add 才分配 10。
- `EMPTY_ELEMENTDATA`（new ArrayList(0)）与 `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`（无参构造）是两个语义不同的空数组：前者不享受"首 add 扩到 10"。
- 扩容公式 `oldCapacity + (oldCapacity >> 1)`，即 1.5 倍；作者称是时间与空间的折中（2 倍浪费空间，固定步长扩容拷贝太频繁）。
- 反射 Demo 实测容量序列：首次 add 后 0→10，第 11 个元素时 10→15。
- get/set 直接数组下标 O(1)；remove(index) 用 `System.arraycopy` 前移后续元素，平均 O(n)。
- addAll 一次扩容到位（`ensureCapacityInternal(size + numNew)`），避免多次扩容。
- 1000 个元素不预设容量时扩容路径 10→15→22→…→1234，共 13 次 `Arrays.copyOf`。

## Important Claims（重要论断）

### 遍历时删除必须用 Iterator.remove() 或 removeIf()

foreach 底层是迭代器；迭代器持 `expectedModCount`，结构性修改令 `modCount++` 后 `checkForComodification()` 抛 ConcurrentModificationException。`Iterator.remove()` 会同步 expectedModCount，Java 8+ 可用 `removeIf()`。

### subList 是视图不是副本

`subList(1,3)` 返回原 List 的视图，改 sub 会改原 list；原 list 结构性修改后再操作 subList 会抛异常。

### toArray() 不能直接强转

`(String[]) list.toArray()` 抛 ClassCastException；应用 `toArray(new String[0])`，Java 11+ 可用 `toArray(String[]::new)`。

### 90% 场景应选 ArrayList

（作者观点/解读）内存连续、CPU 缓存友好、随机访问 O(1)；只有频繁中间插入删除才考虑 LinkedList，而该场景"很少见"。

## Concepts Introduced（引入的概念）

- [[fail-fast-modcount|Fail-Fast 迭代器（modCount）]]

## Entities Mentioned（提及的实体）

- java.util.ArrayList（JDK 集合类，不立实体页）
- CopyOnWriteArrayList / Collections.synchronizedList（线程安全替代方案，仅提及）

## Implications（影响／启示）

- 已知数据量必须预设初始容量，避免多次 O(n) 数组拷贝（解读：与 HashMap 篇的 `size/0.75+1` 预设同一纪律）。
- transient + 自定义序列化是"数组有冗余空位"场景下的标准做法。

## Limitations（局限）

- 单一自媒体信源；"1.5 倍是 JDK 开发组实验出来的折中"等归因未引官方文档。
- 复杂度与容量数字可直接对照 JDK 源码核验，可靠性高；作者经验性结论（90% 场景）为主观判断。

## Related Knowledge（相关知识）

- [[jdk-02-linkedlist|JDK源码阅读(2) — LinkedList（信源页）]]（系列下一篇，文中含 ArrayList vs LinkedList 对比表）
- [[jdk-03-hashmap|JDK源码阅读(3) — HashMap（信源页）]]
- [[jdk-source-reading-album|JDK 源码阅读合集（信源页）]]（所属系列索引）
- [[fail-fast-modcount|Fail-Fast 迭代器（概念页）]]

## Source（信源）

- `raw/sources/misc/2026-10-27-jdk-01-arraylist.md`
