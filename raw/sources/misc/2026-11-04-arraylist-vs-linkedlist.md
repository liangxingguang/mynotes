---
title: 为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清
source: 微信公众号「从CRUD到架构师」（专辑《架构师之路》第 01 期）
source_url: http://mp.weixin.qq.com/s?__biz=MzY4NTAxMTAwMA==&mid=2247483675&idx=1&sn=c1b12538797c7f76868ff961e5f12657
source_type: article
platform: wechat
captured: 2026-11-04
registered_at: 2026-11-05
inbox_ref: Inbox/2026-11-04-arraylist-vs-linkedlist.md
asset_ref: Assets/2026/11/arraylist-vs-linkedlist.md
---

《架构师之路》第 01 期

为什么 ArrayList 比 LinkedList 快？集合框架底层原理，一次讲清

架构师之路 · 进阶 | 建议阅读时间 10 分钟

开始之前，先做个小测试——

下面这段代码，你能一眼看出哪里有性能问题吗？

Java`// 有性能问题的代码，你看出来了吗？   LinkedList<String> list = new LinkedList<>();   for (int i = 0; i < 100000; i++) {       list.add("item" + i);   }   for (int i = 0; i < list.size(); i++) {       String item = list.get(i);  // ← 就是这里，慢到起飞       doSomething(item);   }`

如果你还不确定问题在哪，这篇文章就是写给你的。看完之后，你不仅能说出"ArrayList 比 LinkedList 快"，还能解释清楚**为什么快、快在哪、什么时候不快**。

这也是面试官真正想考你的东西。

· · ·

## 先搞懂底层结构

Java 集合框架里用得最多的三个：ArrayList、LinkedList、HashMap。面试考来考去也是这三个。我们从底层结构开始拆。

ArrayList本质：动态数组

ArrayList 底层就是一个 `Object[]` 数组。默认初始容量是 **10**，每次扩容是当前容量的 **1.5 倍**（通过 `oldCapacity + (oldCapacity >> 1)` 计算）。

// ArrayList 内存布局示意  
index: \[0\] \[1\] \[2\] \[3\] \[4\] \[ \] \[ \] \[ \] \[ \] \[ \]  
data: \["A"\]\["B"\]\["C"\]\["D"\]\["E"\]\[ \]\[ \]\[ \]\[ \]\[ \]  
          ← 已用 size=5 → ← 预留空间 capacity=10 →  
  
// get(index) = 直接取 elementData\[index\]，O(1) 时间复杂度

Java`// ArrayList 扩容的核心源码（JDK 17）   private voidgrow(int minCapacity) {   int oldCapacity = elementData.length;   int newCapacity = oldCapacity + (oldCapacity >> 1);  // 1.5 倍   if (newCapacity - minCapacity < 0)           newCapacity = minCapacity;       elementData = Arrays.copyOf(elementData, newCapacity);  // 新建数组 + 复制   }`

💡 核心：连续内存 + 下标直接寻址 = **随机读取 O(1)**。代价是插入/删除中间元素需要移动后续所有元素，最坏 O(n)。

LinkedList本质：双向链表

LinkedList 每个元素是一个 `Node` 对象，包含数据 + 指向前后节点的指针。内存不连续，分散在堆里。

// LinkedList 内存布局示意（双向链表）  
  
null ← \[prev|"A"|next\] ↔ \[prev|"B"|next\] ↔ \[prev|"C"|next\] → null  
         ↑ head                                            ↑ tail  
  
// get(2) = 从 head 开始遍历到第 2 个节点，O(n)

💡 核心：链表节点天然支持 **头尾插入/删除 O(1)**。但 `get(index)` 要从头遍历，O(n)——这就是开头那段代码慢到起飞的原因。

· · ·

## 一张表搞清楚什么时候用谁

操作

ArrayList

LinkedList

推荐

随机读取 `get(i)`

O(1)

O(n)

ArrayList

尾部追加 `add(e)`

均摊 O(1)

O(1)

都行

中间插入 `add(i,e)`

O(n)（需移位）

O(1)（找到位置后）

LinkedList

头部插入

O(n)

O(1)

LinkedList

内存占用

紧凑（连续数组）

每个节点多 24 字节

ArrayList

CPU 缓存友好

友好（连续内存）

不友好（内存碎片）

ArrayList

**实际开发里的经验：**90% 的场景用 ArrayList 就够了。LinkedList 的使用场景是你需要频繁在头尾操作的队列或栈——但就算是这种场景，Java 里有更合适的 `ArrayDeque`，它比 LinkedList 还快。

· · ·

## HashMap：最常被问、也最容易答歪的那个

面试官问"HashMap 底层怎么实现的"，很多人张口就来"数组+链表"。没错，但说到这儿就停下来，基本只能过初级面试。

真正的考点有四个层次：

HashMap数组 + 链表 + 红黑树

### 1\. 基本结构：哈希桶数组

每个 `HashMap` 维护一个 `Node[]` 数组（哈希桶）。往里放键值对时，先对 key 求 hash，再对数组长度取模，确定放在哪个桶里。

Java`// HashMap 存储核心流程（简化）   map.put("name", "张三");   // 第一步：计算 hash   int hash = ("name".hashCode()) ^ ("name".hashCode() >>> 16);   // 第二步：定位桶位置   int index = hash & (capacity - 1);  // 位运算代替取模，更快   // 第三步：放进 Node 节点   Node node = new Node(hash, "name", "张三", next);`

### 2\. 哈希冲突：链表变红黑树

不同的 key 可能映射到同一个桶（哈希冲突），这时用**链表**把它们串起来。

但链表长了查询就慢了。所以 JDK 8 加了优化：当链表长度 ≥ 8 且数组长度 ≥ 64 时，链表转为红黑树，查询从 O(n) 降到 O(log n)。

Java`// 链表 → 红黑树的临界条件（JDK 8 源码）   static final int TREEIFY_THRESHOLD = 8;   // 链表长度 ≥ 8 时考虑树化   static final int MIN_TREEIFY_CAPACITY = 64; // 数组容量 < 64 时优先扩容   static final int UNTREEIFY_THRESHOLD = 6;  // 红黑树节点 ≤ 6 时退化回链表`

### 3\. 扩容：负载因子的秘密

HashMap 默认初始容量 **16**，负载因子 **0.75**。当 `size > 16 × 0.75 = 12` 时触发扩容，容量翻倍为 32，并重新分配所有元素（rehash）。

💡 为什么负载因子是 0.75？太小（如 0.5）→ 浪费空间；太大（如 1.0）→ 哈希冲突多，查询慢。0.75 是泊松分布下的工程折中值。

### 4\. 线程不安全

HashMap **不是线程安全的**。多线程并发 put 可能触发死循环（JDK 7）或数据丢失（JDK 8）。多线程场景请用 `ConcurrentHashMap`。

· · ·

## 面试怎么答这三个问题

把上面的内容消化完，遇到面试官问，你可以这样组织答案：

问题 1

ArrayList 和 LinkedList 的区别？

先说底层结构（数组 vs 双向链表），再说时间复杂度对比，最后说**实际开发建议**（大多数情况用 ArrayList，需要频繁头尾操作考虑 ArrayDeque）。别忘了提 CPU 缓存局部性——这是区分普通和优秀答案的关键点。

问题 2

HashMap 的底层实现？

四步走：**哈希桶数组** → **哈希冲突用链表** → **JDK 8 链表超 8 转红黑树** → **负载因子 0.75 触发扩容**。最后补一句"线程不安全，多线程用 ConcurrentHashMap"，稳稳加分。

问题 3

HashMap 的 key 可以是 null 吗？

可以，但只能有一个 null key。null key 的 hash 被特殊处理为 0，固定放在桶数组的第 0 位。HashTable 不允许 null key，这是两者的区别之一。

🎯 面试加分项（说出来就是高级）

*   ArrayList 扩容是 **1.5 倍**，Vector 是 **2 倍**（这也是 Vector 内存浪费的原因之一）
    
*   HashMap 容量始终是 **2 的幂次方**——这是为了用位运算 `hash & (n-1)` 代替取模，提升性能
    
*   JDK 8 前 HashMap 扩容时链表会**倒序**，多线程并发可能死循环；JDK 8 用 tail 指针避免了这个问题，但数据覆盖风险仍存在
    

· · ·

好了，今天把集合框架三件套的底层原理拆完了。

回到开头那段代码：在 LinkedList 上用下标 `get(i)` 做遍历，每次都从头节点走到第 i 个——10 万次遍历，复杂度是 O(n²)。改成 `for-each` 或者换成 ArrayList，问题立刻消失。

**知道"为什么"，才能看懂问题在哪。这是初级和中级程序员最大的差距之一。**

👋 觉得有收获？点个「在看」

下期周五，我们聊聊面试官怎么用集合框架来筛人

点击右上角 **「关注」**，每周一三五，干货不断

📌 下期预告（周五）：面试官最爱问的 5 道 Java 集合题，附深度解析