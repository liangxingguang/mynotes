---
title: 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484058&idx=1&sn=5616da78841718a10c3536b2f5d30570&chksm=fe6ca3c0c91b2ad6b844f189ce2519869e75a2e6a3abfe22aa0ae794ff986c0be55711bc49c5"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-08-treeset-vs-hashset.md
asset_ref: Assets/2026/10/jdk-08-treeset-vs-hashset.md
---

# 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚

## 灵魂拷问：TreeSet 和 HashSet 到底有什么区别？5张图彻底说清楚

上一期分析了 **LinkedHashMap**，有读者问："那 TreeSet 呢？面试总被问到和 HashSet 的区别。" 今天我们就来把 **TreeSet** 剥个精光。

先上结论，再展开：

> **TreeSet 本质 = TreeMap + 去重 + 排序** **HashSet 本质 = HashMap + 去重 + 哈希**

* * *

### 一、开门见山：TreeSet 到底是什么？

直接看源码定义：

```
public class TreeSet<E> extends AbstractSet<E>    implements NavigableSet<E>, Cloneable, java.io.Serializable {    // 底层就是一个 NavigableMap，实际就是 TreeMap    private transient NavigableMap<E,Object> m;    // 所有 value 都指向这个 dummy 对象    private static final Object PRESENT = new Object();    TreeSet(NavigableMap<E,Object> m) {        this.m = m;    }    public TreeSet() {        this(new TreeMap<>());    }    public TreeSet(Comparator<? super E> comparator) {        this(new TreeMap<>(comparator));    }}
```

**关键点：**

*   TreeSet 底层就是一个 **TreeMap**
    
*   所有元素作为 TreeMap 的 **key** 存储
    
*   value 统一是一个 dummy 对象 `PRESENT`
    
*   支持传入 `Comparator` 自定义排序规则
    

* * *

### 二、核心操作源码解析

#### 2.1 add() — 如何保证元素不重复且有序

```
public boolean add(E e) {    return m.put(e, PRESENT) == null;}
```

就是调 TreeMap 的 `put()`。TreeMap 的 key 是**红黑树**存储的，插入时自动比较大小，放到正确位置。如果 key 已存在（`compare()` 返回 0），`put()` 返回旧 value（不为 null），`add()` 就返回 false。

#### 2.2 remove() — 删除元素

```
public boolean remove(Object o) {    return m.remove(o) == PRESENT;}
```

同样委托 TreeMap，从红黑树中删除节点，时间复杂度 **O(log n)**。

#### 2.3 contains() — 判断是否存在

```
public boolean contains(Object o) {    return m.containsKey(o);}
```

TreeMap 的 `containsKey()` 走红黑树查找，**O(log n)**。

#### 2.4 遍历 — 有序性保证

```
// 升序迭代器public Iterator<E> iterator() {    return m.navigableKeySet().iterator();}// 降序迭代器public Iterator<E> descendingIterator() {    return m.descendingKeySet().iterator();}
```

TreeMap 的 `navigableKeySet()` 返回的是红黑树的**中序遍历**结果——天然升序。

* * *

### 三、画图：TreeSet vs HashSet 数据结构的根本差异

#### 图1：HashSet 底层结构（哈希表 + 链表/红黑树）

```
HashSet (底层 HashMap)┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐│  0  │  1  │  2  │  3  │  4  │ ... │  n  │  ← 数组└──┬──┴──┬──┴──┬──┴──┬──┴──┬──┴──┬──┴──┘   │     │     │     │     │     │     │   ▼     │     │     │     │     │ [A]     │     │     ▼     │     │   │     │     │ [D] → [E]     │  ← 链表/红黑树   ▼     │     │     │           │ [B] → [C]   │     ▼           │           │           │ [F]           │
```

*   元素通过 `hashCode()` 定位桶
    
*   哈希冲突时拉链/红黑树
    
*   **无序**，遍历顺序不可预测
    

#### 图2：TreeSet 底层结构（红黑树）

```
TreeSet (底层 TreeMap 红黑树)                              ┌──────┐                              │  50  │  ← root                              └──┬───┘                                 │                 ┌───────────────┴───────────────┐                 ▼                                ▼            ┌────────┐                      ┌────────┐            │   25   │                      │   75   │            └───┬────┘                      └───┬────┘                │                              │          ┌─────┴─────┐                    ┌─────┴─────┐          ▼            ▼                    ▼            ▼      ┌──────┐   ┌──────┐           ┌──────┐   ┌──────┐      │  10  │   │  30  │           │  60  │   │  90  │      └──────┘   └──────┘           └──────┘   └──────┘
```

*   元素通过 `compareTo()` 或 `Comparator` 比较大小
    
*   **中序遍历 = 升序遍历**
    
*   插入、删除、查找都是 **O(log n)**
    

#### 图3：中序遍历拿到升序结果

```
        ┌──────┐        │  50  │        └──┬───┘           │   ┌───────┴───────┐   ▼               ▼┌──────┐       ┌──────┐│  25  │       │  75  │└──┬───┘       └──┬───┘   │           │   ▼           ▼┌──────┐     ┌──────┐│  10  │     │  90  │└──────┘     └──────┘中序遍历结果（左→根→右）：10 → 25 → 50 → 75 → 90  ✅ 升序！
```

* * *

### 四、完整的对比表格

对比项

🟢 TreeSet

🔵 HashSet

**底层结构**

TreeMap（红黑树）

HashMap（数组+链表/红黑树）

**元素顺序**

**有序**（自然序或Comparator）

**无序**

**时间复杂度**

O(log n)

O(1)，最差O(log n)

**比较方式**

`compareTo()` / `Comparator`

`hashCode()` + `equals()`

**null支持**

❌ 不允许 null（TreeMap 插入时会 NPE）

✅ 允许一个 null

**自定义排序**

✅ 构造时传入 Comparator

❌ 无法排序

**内存开销**

更大（红黑树节点存储颜色、父子引用）

相对小

**适用场景**

需要有序集合、范围查询、求子集

通用去重、快速查找

**线程安全**

❌ 都不是线程安全的，用 `Collections.synchronizedSortedSet()`

❌ 同理

* * *

### 五、TreeSet 的独家武器：范围操作

这是 HashSet 打死也做不到的，因为 TreeSet 的有序性让**范围操作**变得极其优雅：

```
TreeSet<Integer> set = new TreeSet<>();set.addAll(Arrays.asList(1, 3, 5, 7, 9, 11, 13, 15));// 小于等于7的最大元素System.out.println(set.floor(7));    // 7// 大于等于8的最小元素System.out.println(set.ceiling(8));  // 9// 小于5的所有元素System.out.println(set.headSet(5));  // [1, 3]// 大于等于7的所有元素System.out.println(set.tailSet(7));  // [7, 9, 11, 13, 15]// 范围：[5, 12) 左闭右开System.out.println(set.subSet(5, 12)); // [5, 7, 9, 11]// 第一个和最后一个System.out.println(set.first());    // 1System.out.println(set.last());     // 15// 降序遍历for (Integer i : set.descendingSet()) {    System.out.print(i + " ");  // 15 13 11 9 7 5 3 1}
```

**面试加分点：** `subSet()` 返回的是**视图（view）**，不是新集合，修改视图会反映到原集合上。

* * *

### 六、性能实测：到底差多少？

写一段对比代码：

```
public class SetBenchmark {    public static void main(String[] args) {        Random rand = new Random(42);        int N = 1_000_000;        HashSet<Integer> hashSet = new HashSet<>();        TreeSet<Integer> treeSet = new TreeSet<>();        ArrayList<Integer> data = new ArrayList<>();        for (int i = 0; i < N; i++) data.add(rand.nextInt());        // ---- 插入 ----        long start = System.nanoTime();        hashSet.addAll(data);        long hashTime = System.nanoTime() - start;        start = System.nanoTime();        treeSet.addAll(data);        long treeTime = System.nanoTime() - start;        System.out.printf("插入 %d 个元素：
", N);        System.out.printf("  HashSet: %.2f ms
", hashTime / 1e6);        System.out.printf("  TreeSet: %.2f ms
", treeTime / 1e6);        System.out.printf("  TreeSet 是 HashSet 的 %.1f 倍
", treeTime / (double) hashTime);        // ---- 查询 ----        start = System.nanoTime();        for (int i = 0; i < 100_000; i++) hashSet.contains(rand.nextInt());        hashTime = System.nanoTime() - start;        start = System.nanoTime();        for (int i = 0; i < 100_000; i++) treeSet.contains(rand.nextInt());        treeTime = System.nanoTime() - start;        System.out.printf("
10万次随机查询：
");        System.out.printf("  HashSet: %.2f ms
", hashTime / 1e6);        System.out.printf("  TreeSet: %.2f ms
", treeTime / 1e6);    }}
```

在我的机器上的结果：

```
插入 1000000 个元素：  HashSet: 152.34 ms  TreeSet: 1682.18 ms  TreeSet 是 HashSet 的 11.0 倍10万次随机查询：  HashSet: 18.21 ms  TreeSet: 87.63 ms
```

**结论很简单：**

操作

HashSet

TreeSet

差距

插入

O(1)

O(log n)

❗ 约11倍慢

查询

O(1)

O(log n)

❗ 约5倍慢

遍历

无序

**有序** ✅

TreeSet 完胜

范围查询

❌ 做不到

✅ O(log n) + O(k)

TreeSet 专属技能

**所以记住：需要排序才用 TreeSet，否则无脑 HashSet。**

* * *

### 七、实战：什么时候选 TreeSet？

#### 场景 1：排行榜系统

```
public class Leaderboard {    // 按分数降序排列    private TreeSet<Player> ranking = new TreeSet<>(        (a, b) -> b.score - a.score  // 降序    );    public void addPlayer(Player p) { ranking.add(p); }    public List<Player> topN(int n) {        return ranking.stream().limit(n).toList();    }    // 查询某个分段内的玩家    public Set<Player> range(int min, int max) {        return ranking.subSet(            new Player("_", max), true,            new Player("_", min), true        );    }}
```

#### 场景 2：IP 定位服务

```
// IP 段 → 地理位置映射TreeSet<IPRange> ipRanges = new TreeSet<>();ipRanges.add(new IPRange("1.0.0.0", "1.0.0.255", "美国"));ipRanges.add(new IPRange("1.0.1.0", "1.0.3.255", "中国"));// 查找某个IP所在范围IPLocation result = ipRanges.floor(new IPRange(ip, ip, null));
```

* * *

### 八、面试高频题：避坑指南

**Q1: TreeSet 可以存 null 吗？**

```
TreeSet<String> set = new TreeSet<>();set.add(null);  // ❌ NullPointerException!
```

因为 `TreeMap.put()` 插入时会调用 `key.compareTo()`，null 没有 compareTo。但是——

```
TreeSet<String> set = new TreeSet<>((a, b) -> {    if (a == null) return -1;    if (b == null) return 1;    return a.compareTo(b);});set.add(null);  // ✅ 自定义 Comparator 兼容 nullset.add("A");set.add(null);  // 重复？add 返回 false
```

**Q2: TreeSet 的去重逻辑是 `equals()` 还是 `compareTo()`？**

```
class Person {    String name;    int age;    // equals() 只比较 name    // compareTo() 只比较 age}TreeSet<Person> set = new TreeSet<>((a, b) -> a.age - b.age);set.add(new Person("Alice", 25));set.add(new Person("Bob", 25));   // ❌ Bob 进不去！因为 age 相同，compareTo 返回 0
```

**答案：TreeSet 去重依赖 `compareTo()` / `Comparator`，不是 `equals()`。** 这是最常见的坑。

**Q3: TreeSet 是线程安全的吗？** 不是。需要同步的话：

```
SortedSet<Integer> safeSet = Collections.synchronizedSortedSet(new TreeSet<>());
```

或者用 `ConcurrentSkipListSet`（虽然后者底层是跳表不是红黑树）。

* * *

### 总结

一句话

❌ 不需要排序 → HashSet  
✅ 需要排序/范围查询 → TreeSet

**底层**

TreeMap 的红黑树

**性能**

O(log n)，比 HashSet 慢但功能更强

**核心优势**

有序遍历、范围查询（subSet/headSet/tailSet）

**大坑**

去重看 compareTo 不看 equals；null 默认不支持

TreeSet 和 TreeMap 本质是一对孪生兄弟，理解了 TreeMap 的红黑树原理，TreeSet 就是一个"带限制的 TreeMap 视图"。下一次面试官问你 TreeSet，希望你能从容答出这些点。
