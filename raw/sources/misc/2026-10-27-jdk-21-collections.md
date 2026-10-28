---
title: JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484616&idx=1&sn=248f227750f8d652f0352e21a0b18a62&chksm=fe6ca592c91b2c8447086a98e557b0831246a0a11e8fc1d07a32ee0692cdf9b77506dbda71c1
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-21-collections.md
asset_ref: Assets/2026/10/jdk-21-collections.md
---

# JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀

> 深度剖析 java.util.Collections 工具类，从排序洗牌到同步包装器，看 JDK 如何用静态方法配齐集合框架的最后一块拼图。

## JDK源码阅读(21)：Collections工具类——被低估的瑞士军刀

## 一、类的基本介绍

### 继承体系与定位

`java.util.Collections` 不是"一个类"，它是一个**纯静态方法的工具类**（utility class），位于 `java.util` 包中，与 `Collection` 接口平级，服务于整个集合框架。

```
java.util  └── Collections (final class, private constructor)
```

它的定位非常特殊：

*   **不是**集合接口或实现类
    
*   **而是**集合框架的**算法库 + 工厂车间 + 安全卫士**
    
*   它提供了三大类能力：**算法操作**（排序、搜索、洗牌）、**包装器工厂**（同步、不可变、类型检查）、**集合创建**（空集合、单元素集合）
    

### 为什么要有这样一个类？

JDK 设计者面临一个选择：把排序、二分搜索这些算法放在每个集合实现类里，还是集中到一个地方？

他们选了后者。因为：

1.  **避免代码重复** —— 如果 ArrayList 和 LinkedList 各写一套排序，重复代码太多
    
2.  **一次实现，到处可用** —— 只要实现了 `List` 接口，就能用 `Collections.sort()`
    
3.  **这种模式叫"功能内聚"** —— 把同一类功能放到一起，而不是散落在各处
    

从设计模式角度看，Collections 是 **Facade（门面模式）+ Factory Method（工厂方法模式）+ Decorator（装饰器模式）** 的混合体。

### 类签名

```
public class Collections {    // 私有构造函数，禁止实例化    private Collections() {}        // 各种静态方法    // ...}
```

注意：构造方法私有，意味着你**永远无法 new 一个 Collections 对象**。它纯粹是一组静态方法的集合。这种模式在工具类中非常常见（对比 `Arrays`、`Objects`、`Math`）。

* * *

## 二、核心源码解析

### 2.1 sort() —— 排序的进化史

排序是 Collections 最常用的方法之一。我们来看它的实现：

```
@SuppressWarnings("unchecked")public static <T extends Comparable<? super T>> void sort(List<T> list) {    // 委托给 Arrays.sort，内部会把 List 转成数组    list.sort(null);}
```

等等，这里有个"套路"：

```
default void sort(Comparator<? super E> c) {    Object[] a = this.toArray();          // List → 数组    Arrays.sort(a, (Comparator) c);       // 数组排序（TimSort）    ListIterator<E> i = this.listIterator();    for (Object e : a) {        i.next();        i.set((E) e);                       // 排好序的数组 → 写回 List    }}
```

关键点：

*   **List → 数组 → 排序 → 写回 List** 这个三步走是 JDK 的经典模式
    
*   排序算法是 **TimSort** —— 一种结合归并排序和插入排序的混合算法
    
*   TimSort 是 2009 年 Python 引入的，JDK 在 1.7 之后也用了它
    
*   时间复杂度：最坏 O(n log n)，**最好 O(n)**（如果数据已经接近有序）
    

> 个人理解：很多人以为 Java 排序是快排（QuickSort），实际上从 JDK 7 开始就已经换成 TimSort 了。如果你维护的是一个"接近有序"的列表，TimSort 会比快排快很多。面试问"Java 用的什么排序算法"，答 TimSort 比答快排更正确。

### 2.2 shuffle() —— Fisher-Yates 洗牌

```
public static void shuffle(List<?> list, Random rnd) {    int size = list.size();    if (size < SHUFFLE_THRESHOLD || list instanceof RandomAccess) {        // 随机访问列表（ArrayList），直接用下标交换        for (int i = size; i > 1; i--)            swap(list, i - 1, rnd.nextInt(i));    } else {        // 顺序访问列表（LinkedList），先转数组再洗牌        Object[] arr = list.toArray();        for (int i = size; i > 1; i--)            swap(arr, i - 1, rnd.nextInt(i));        ListIterator it = list.listIterator();        for (Object e : arr) {            it.next();            it.set(e);        }    }}
```

核心算法是 **Fisher-Yates 洗牌**（也叫 Knuth 洗牌）：

*   从最后一个元素开始，随机选一个前面的位置交换
    
*   重复直到第一个元素
    
*   每个排列出现的概率相等 —— **真正的均匀随机**
    

这里有个很细节的分支：

*   **ArrayList（RandomAccess）**：直接原地交换，O(n)，快
    
*   **LinkedList**：如果原地交换，每次 `get(i)` 都要遍历链表，太慢了，所以先转数组再洗牌
    

> 个人吐槽：这段代码写于 Java 1.2，二十多年了几乎没变过。但那个 `SHUFFLE_THRESHOLD` 常量设的是 **5**！也就是说 LinkedList 超过 5 个元素就转数组。这说明 JDK 开发者对 LinkedList 的随机访问性能有多不信任——确实，`linkedList.get(999)` 要遍历 999 次 next。

### 2.3 binarySearch() —— 二分查找

```
public static <T> int binarySearch(List<? extends Comparable<? super T>> list, T key) {    if (list instanceof RandomAccess || list.size() < BINARYSEARCH_THRESHOLD)        // ArrayList 直接索引二分查找        return indexedBinarySearch(list, key);    else        // LinkedList 用迭代器风格的二分查找        return iteratorBinarySearch(list, key);}
```

二分查找本身不复杂，但 Collections 又一次为 LinkedList 做了特殊处理——因为 LinkedList 的 `get(mid)` 太慢了，所以 `iteratorBinarySearch` 用迭代器"走"到中间位置。

```
private static <T> int iteratorBinarySearch(List<? extends Comparable<? super T>> list, T key) {    int low = 0;    int high = list.size() - 1;    ListIterator<? extends Comparable<? super T>> i = list.listIterator();        while (low <= high) {        int mid = (low + high) >>> 1;          // 无符号右移，避免溢出        Comparable<? super T> midVal = get(i, mid);  // 调整迭代器到 mid 位置        int cmp = midVal.compareTo(key);                if (cmp < 0)            low = mid + 1;        else if (cmp > 0)            high = mid - 1;        else            return mid;  // 找到了    }    return -(low + 1);  // 没找到，返回插入点}
```

注意那个 `(low + high) >>> 1` 而不是 `(low + high) / 2`——这是经典 Bug 的修复（当 low + high 超过 Integer.MAX\_VALUE 时会溢出为负数），虽然实际场景几乎不会发生，但 JDK 开发者还是严谨地处理了。

### 2.4 synchronizedXXX() —— 同步包装器（装饰器模式）

这是 Collections 最被低估的能力之一。

```
public static <T> List<T> synchronizedList(List<T> list) {    return new SynchronizedRandomAccessList<>(list);}// 内部类static class SynchronizedList<E> extends SynchronizedCollection<E> implements List<E> {    final List<E> list;        SynchronizedList(List<E> list) {        super(list);      // 父类 SynchronizedCollection 存了个 mutex        this.list = list;    }        public E get(int index) {        synchronized (mutex) { return list.get(index); }    }        public E set(int index, E element) {        synchronized (mutex) { return list.set(index, element); }    }        // ... 所有方法都加同步块}
```

模式非常直白：

1.  **装饰器模式** —— 包装原始 List，不改变接口
    
2.  **每个方法都加 `synchronized(mutex)`**
    
3.  **mutex 默认是包装器对象本身**，也可以指定外部锁
    

但有个经典大坑，我用亲身经历来说：

```
// ❌ 错误用法：迭代器没有同步！List<String> list = Collections.synchronizedList(new ArrayList<>());// 线程Asynchronized (list) {    Iterator<String> it = list.iterator();    while (it.hasNext()) {        String s = it.next();  // 这里可能 ConcurrentModificationException    }}// 线程Blist.add("xxx");  // 并发修改！
```

看到没？**文档里明明白白写着**：迭代器遍历时必须在外部手动同步，使用包装器的锁对象。但多少人会踩这个坑？太多了。我自己就踩过，线上半夜被 CME 搞醒。

### 2.5 unmodifiableXXX() —— 不可变视图

```
public static <T> List<T> unmodifiableList(List<? extends T> list) {    return new UnmodifiableRandomAccessList<>(list);}// 内部类static class UnmodifiableList<E> extends UnmodifiableCollection<E> implements List<E> {    final List<? extends E> list;        public E get(int index) { return list.get(index); }        // 所有修改方法都抛异常    public void add(int index, E element) {        throw new UnsupportedOperationException();    }    public E set(int index, E element) {        throw new UnsupportedOperationException();    }    // ...}
```

实现极简：**所有修改方法直接抛 `UnsupportedOperationException`**。

但注意，这是一个 **视图（view）**，不是真正的不可变集合——如果原始集合变了，这个视图也会跟着变。真正的不可变（immutable）是 Java 9 的 `List.of()` 才引入的。

### 2.6 emptyList() / singletonList() —— 零开销的空集合

```
@SuppressWarnings("unchecked")public static final <T> List<T> emptyList() {    return (List<T>) EMPTY_LIST;}// EMPTY_LIST 是一个静态内部类实例，空数组public static final List EMPTY_LIST = new EmptyList<>();
```

为什么搞这个？

*   `new ArrayList<>()` 会分配数组、设置初始容量
    
*   `emptyList()` 返回的实例是**单例**，不分配任何底层数组
    
*   零内存分配，零 GC 压力
    

**使用建议**：方法返回空集合时，永远用 `Collections.emptyList()` 而不是 `new ArrayList<>()`。这是养成习惯的好地方。

* * *

## 三、关键设计原理

### 3.1 对比：Collections 包装器 vs Java 9 工厂方法

特性

Collections 包装器

Java 9 `List.of()`

是否可变

可变（会抛异常）

不可变

是否视图

是，原始数据变了它也变

否，数据已复制

允许 null

看原始集合

**不允许 null**

序列化

支持

支持

内存

包装器开销

紧凑存储

### 3.2 为什么是"视图"而非"副本"？

同步包装器和不可修改包装器都是**视图（view）**——它们不复制数据，只是包装原始集合。

```
List<String> raw = new ArrayList<>();raw.add("a");List<String> unmod = Collections.unmodifiableList(raw);// unmod.contains("a") → trueraw.add("b");          // 改了原始集合// unmod.contains("b") → true ！！！视图也跟着变了
```

这是设计上故意的——为了零拷贝性能。但如果你需要真正的快照，应该显式复制：

```
List<String> snapshot = new ArrayList<>(raw);  // 复制一份List<String> safe = Collections.unmodifiableList(snapshot);
```

### 3.3 reverseOrder() 的缓存技巧

```
@SuppressWarnings("unchecked")public static <T> Comparator<T> reverseOrder() {    return (Comparator<T>) ReverseComparator.REVERSE_ORDER;}private static class ReverseComparator implements Comparator<Comparable<Object>> {    static final ReverseComparator REVERSE_ORDER = new ReverseComparator();        public int compare(Comparable<Object> c1, Comparable<Object> c2) {        return c2.compareTo(c1);  // 反过来比较    }}
```

**单例模式**：不管调用多少次 `reverseOrder()`，都是同一个 Comparator 实例。因为逆序比较器的逻辑是纯函数——没有状态，所以可以复用。

### 3.4 checkedxxx() —— 类型安全检查

这是一个很少人知道但很实用的功能：

```
List rawList = new ArrayList();rawList.add("hello");rawList.add(123);          // 运行时可以，但类型不安全List<String> checkedList = Collections.checkedList(new ArrayList<>(), String.class);checkedList.add("hello");  // OKcheckedList.add(123);      // ❌ ClassCastException 立即抛出！
```

这在**遗留代码整合**时特别有用——当你有原始类型（raw type）的集合，又不想在运行时被诡异的 CCE 搞疯，`checkedList` 可以在插入时就做类型校验。

* * *

## 四、使用示例

下面是一个完整的示例，演示 Collections 工具类的核心用法：

```
import java.util.*;public class CollectionsDemo {        static class Person implements Comparable<Person> {        String name;        int age;                Person(String name, int age) {            this.name = name;            this.age = age;        }                @Override        public int compareTo(Person o) {            return Integer.compare(this.age, o.age);        }                @Override        public String toString() {            return name + "(" + age + ")";        }    }        public static void main(String[] args) {        // ===== 1. 排序 =====        List<Integer> numbers = new ArrayList<>(Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6));        Collections.sort(numbers);        System.out.println("升序排序: " + numbers);  // [1, 1, 2, 3, 4, 5, 6, 9]                Collections.sort(numbers, Collections.reverseOrder());        System.out.println("降序排序: " + numbers);  // [9, 6, 5, 4, 3, 2, 1, 1]                // ===== 2. 洗牌 =====        List<String> cards = new ArrayList<>(Arrays.asList("A", "2", "3", "4", "5"));        Collections.shuffle(cards);        System.out.println("洗牌后: " + cards);  // 每次不同                // ===== 3. 二分查找 =====        List<Integer> sorted = Arrays.asList(1, 3, 5, 7, 9, 11, 13);        int idx = Collections.binarySearch(sorted, 7);        System.out.println("7 的位置: " + idx);  // 3                idx = Collections.binarySearch(sorted, 6);        System.out.println("6 的位置（未找到）: " + idx);  // -4（插入点是索引 3，所以是 -(3+1)）                // ===== 4. 不可变包装器 =====        List<String> modifiable = new ArrayList<>(Arrays.asList("a", "b", "c"));        List<String> unmod = Collections.unmodifiableList(modifiable);        // unmod.add("d");  // ❌ UnsupportedOperationException                // ===== 5. 同步包装器 =====        List<String> syncList = Collections.synchronizedList(new ArrayList<>());        // 多线程安全，但迭代需要外部同步        synchronized (syncList) {            for (String s : syncList) {                // 安全迭代            }        }                // ===== 6. 空集合 -> 避免 null =====        List<String> empty = Collections.emptyList();        Set<String> emptySet = Collections.emptySet();        Map<String, String> emptyMap = Collections.emptyMap();        // 这些都是单例，不分配数组                // ===== 7. 单元素集合 =====        List<String> single = Collections.singletonList("only one");        // Set<String> singleSet = Collections.singleton("only one");        // Map<String, String> singleMap = Collections.singletonMap("key", "value");                // ===== 8. 集合操作 =====        List<Integer> list1 = Arrays.asList(1, 2, 3, 4, 5);        List<Integer> list2 = Arrays.asList(4, 5, 6, 7, 8);                // 找交集        List<Integer> intersection = new ArrayList<>(list1);        intersection.retainAll(list2);        System.out.println("交集: " + intersection);  // [4, 5]                // Collections 工具方法        Collections.reverse(list1);        System.out.println("反转: " + list1);  // [5, 4, 3, 2, 1]                Collections.rotate(list2, 2);        System.out.println("旋转2位: " + list2);  // [7, 8, 4, 5, 6]                // ===== 9. 频率统计 =====        List<String> words = Arrays.asList("apple", "banana", "apple", "cherry", "apple");        int freq = Collections.frequency(words, "apple");        System.out.println("apple出现次数: " + freq);  // 3                // ===== 10. 最大值/最小值 =====        List<Person> people = Arrays.asList(            new Person("Alice", 28),            new Person("Bob", 35),            new Person("Charlie", 22)        );        Person youngest = Collections.min(people);        Person oldest = Collections.max(people);        System.out.println("最年轻: " + youngest);  // Charlie(22)        System.out.println("最年长: " + oldest);   // Bob(35)    }}
```

运行结果示例：

```
升序排序: [1, 1, 2, 3, 4, 5, 6, 9]降序排序: [9, 6, 5, 4, 3, 2, 1, 1]洗牌后: [3, A, 5, 4, 2]7 的位置: 36 的位置（未找到）: -4交集: [4, 5]反转: [5, 4, 3, 2, 1]旋转2位: [7, 8, 4, 5, 6]apple出现次数: 3最年轻: Charlie(22)最年长: Bob(35)
```

* * *

## 五、注意事项与最佳实践

### 5.1 这些坑我都踩过

**坑1：synchronizedList 迭代器要加锁**

前面提到了，再强调一次：

```
// ✅ 正确用法List<String> safeList = Collections.synchronizedList(new ArrayList<>());synchronized (safeList) {    Iterator<String> it = safeList.iterator();    while (it.hasNext()) {        // ...    }}
```

**坑2：unmodifiableList 不是不可变的**

```
List<String> inner = new ArrayList<>();List<String> outer = Collections.unmodifiableList(inner);inner.add("changed!");   // outer 也变了！
```

如果你想要"真正的不可变"，用 `List.copyOf()`（Java 10+）或 `List.of()`（Java 9+）。

**坑3：emptyList() 返回的 List 不可修改**

```
List<String> empty = Collections.emptyList();empty.add("hello");  // ❌ UnsupportedOperationException
```

这很直观，但新手容易犯。

**坑4：binarySearch 前必须排序**

```
List<Integer> list = Arrays.asList(5, 3, 7, 1, 9);Collections.binarySearch(list, 7);  // ❌ 结果未定义！Collections.sort(list);Collections.binarySearch(list, 7);  // ✅ 正确
```

**二分查找的前提是有序**。忘了排序直接查找，结果随机，排错排到怀疑人生。

### 5.2 性能考量

方法

时间复杂度

空间复杂度

注意

sort

O(n log n)

O(n)

ArrayList 快于 LinkedList

shuffle

O(n)

O(1) 或 O(n)

链表需要额外数组空间

binarySearch

O(log n)

O(1)

仅适用于 **RandomAccess** 的 List

reverse

O(n)

O(1)

链表效率低

rotate

O(n)

O(1)

小旋转用 sublist.reverse 的技巧

fill

O(n)

O(1)

线性赋值

copy

O(n)

O(1)

dest.size() 必须 >= src.size()

frequency

O(n)

O(1)

线性扫描

### 5.3 适用场景

**什么时候用 Collections 工具类？**

1.  ⭐ **返回空集合**：永远用 `emptyList()` / `emptySet()` / `emptyMap()` 代替 null 或 new ArrayList()
    
2.  ⭐ **返回不可变集合**：用 `unmodifiableXXX` 保护内部数据不被外部修改
    
3.  **单元素集合**：`singletonList()` 比 `Arrays.asList(x)` 更简洁且节省内存
    
4.  **排序/搜索**：不用自己实现算法
    
5.  **同步包装**：需要在已有集合上加锁
    
6.  **遗留代码整合**：`checkedList` 帮你提前发现类型问题
    

**什么时候不用？**

1.  **高并发场景**：`synchronizedList` 性能远不如 `CopyOnWriteArrayList` 或 `ConcurrentHashMap`
    
2.  **需要真正的不可变集合**：用 Java 9+ 的 `List.of()`
    
3.  **只需要排序**：直接 `list.sort(null)` 更简洁
    
4.  **超过几千个元素的洗牌**：shuffle 是 O(n)，大列表没问题，但要注意内存
    

* * *

## 六、对比总结

### Collections 工具类的"江湖地位"

```
集合框架生态图：Collection / Map (接口)    │    ├── ArrayList, HashMap, TreeSet... (实现类)    │    ├── Iterator, Comparator, RandomAccess... (辅助接口)    │    └── Collections, Arrays (工具类)  ← 我们在这里
```

如果把集合框架比作一个工具箱：

*   **集合接口**是工具的规格说明书（接口规范）
    
*   **实现类**是具体的扳手、螺丝刀（具体功能）
    
*   **Collections工具类**就是**工具架+安全锁+维修手册**的混合体
    

### 与 Arrays 工具类的对比

维度

Collections

Arrays

服务对象

Collection 框架

原生数组

排序

sort(List)

sort(int\[\]), sort(Object\[\]) 等重载

二分搜索

binarySearch(List, key)

binarySearch(int\[\], key) 等重载

填充

fill(List, obj)

fill(int\[\], val) 等重载

转换

无（list → array 用 List.toArray）

asList(T...) 返回 List

同步

synchronizedXXX 包装器

无

不可变

unmodifiableXXX 包装器

无

特色

reverse, shuffle, rotate, frequency

deepEquals, deepHashCode, stream, compare

### 一个冷知识

Collections 在 JDK 1.2 引入，二十多年来核心 API 几乎没有大改。但有两个重要的演进：

1.  **JDK 5 泛型化** —— 所有方法加了泛型，增加了 `checkedXXX`
    
2.  **JDK 8 Lambda 适配** —— `sort` 委托给了 `List.sort()`，而后者可以接受 Lambda Comparator
    
3.  **JDK 9+** —— 新的工厂方法 `List.of()` / `Set.of()` / `Map.of()` 逐渐取代了部分 Collections 的使用场景
    

### 灵魂拷问

> 问：既然 Java 9 之后有了 `List.of()`，Collections 还有存在的必要吗？

答：**绝对有必要**。`List.of()` 只替代了 `unmodifiableList` + `singletonList` 的部分场景。但：

*   `sort` / `shuffle` / `binarySearch` 这些算法操作无可替代
    
*   `synchronizedList` 在线程安全包装方面仍有其价值
    
*   `frequency` / `disjoint` / `rotate` 这些"小功能"非常实用
    
*   `checkedList` 在遗留代码维护中不可或缺
    

* * *

**下期预告**：将会深入剖析 `CompletableFuture` —— Java 异步编程的瑞士军刀。从链式调用到异常处理，从线程池选择到背压机制，带你全方位搞懂这个"用好就回不去"的并发神器。

> 本文基于 OpenJDK 21 源码分析。源码路径：`java.base/share/classes/java/util/Collections.java`
