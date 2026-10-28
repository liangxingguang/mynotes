---
title: 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484642&idx=1&sn=1a9e72c7d4757109a31e738106eef7e8&chksm=fe6ca5b8c91b2caeb57ebecd829c52ff2705c90daa6e971dbee19bca33681cbf2b2da6dfa943
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-24-concurrentmodificationexception.md
asset_ref: Assets/2026/10/jdk-24-concurrentmodificationexception.md
---

# 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？

## 深扒 ConcurrentModificationException：Java 集合中最常见的运行时异常，你真的搞懂了吗？

## 1\. 类的基本介绍

如果你写过 Java，大概率见过这个异常：

```
Exception in thread "main" java.util.ConcurrentModificationException
```

报这个错的时候，第一反应往往是"有人在多线程并发修改集合"。但说实话，**这个异常出现频率最高的场景恰恰是单线程**——比如 foreach 循环里调用了 `list.remove()`。

`ConcurrentModificationException` 属于 `java.util` 包，继承自 `RuntimeException`。它的类定义极其简单：

```
public class ConcurrentModificationException extends RuntimeException {    private static final long serialVersionUID = -3665741007566593440L;    public ConcurrentModificationException() {        super();    }    public ConcurrentModificationException(String message) {        super(message);    }    public ConcurrentModificationException(Throwable cause) {        super(cause);    }    public ConcurrentModificationException(String message, Throwable cause) {        super(message, cause);    }}
```

**就这？就这！** 它自己啥也没干，就是个普通的异常类，携带了一个 message 和 cause。真正有意思的是——**谁在抛这个异常？怎么检测的？**

## 2\. 源码截图：核心检测机制

那抛异常的活儿到底是谁干的？答案是 `java.util.ArrayList$Itr`。没错，ArrayList 内部的迭代器。

```
// ArrayList 内部类 Itr，实现了 Iterator 接口private class Itr implements Iterator<E> {    int cursor;       // 下一个要返回的元素的索引    int lastRet = -1; // 上一个返回的元素的索引，-1 表示没有    int expectedModCount = modCount; // 期望的修改次数    // 判断是否有下一个元素    public boolean hasNext() {        return cursor != size;    }    @SuppressWarnings("unchecked")    public E next() {        checkForComodification(); // 每次 next() 都先检查        int i = cursor;        if (i >= size)            throw new NoSuchElementException();        Object[] elementData = ArrayList.this.elementData;        if (i >= elementData.length)            throw new ConcurrentModificationException();        cursor = i + 1;        return (E) elementData[lastRet = i];    }    public void remove() {        if (lastRet < 0)            throw new IllegalStateException();        checkForComodification(); // 每次 remove() 也检查        try {            ArrayList.this.remove(lastRet); // 调 ArrayList 的 remove            cursor = lastRet;            lastRet = -1;            // 关键！这里重置了 expectedModCount，所以迭代器自己的 remove 是安全的            expectedModCount = modCount;        } catch (IndexOutOfBoundsException ex) {            throw new ConcurrentModificationException();        }    }    // 核心检测方法    final void checkForComodification() {        if (modCount != expectedModCount)            throw new ConcurrentModificationException();    }}
```

就这么简单一个 `if` 判断，擒住了无数 Java 程序员的 bug。

核心变量就两个：

*   **`modCount`**：ArrayList 自己的成员变量，每次结构性修改（add、remove、clear 等）都会 `modCount++`
    
*   **`expectedModCount`**：迭代器创建时拿到的快照值，等于当时的 `modCount`
    

当 `modCount != expectedModCount` 时，说明迭代器创建之后集合被别人动过了——抛异常！

## 3\. 核心原理：为什么要有 fail-fast？

### 3.1 什么是结构性修改？

所谓结构性修改，是指**改变了集合大小**的操作，而不是修改已有元素的内容。

```
list.add("a");      // ✅ 结构性修改，modCount++list.remove(0);     // ✅ 结构性修改，modCount++list.set(0, "b");   // ❌ 不是结构性修改，只改值list.clear();       // ✅ 结构性修改，modCount++
```

看 `ArrayList.ensureExplicitCapacity()` 的源码就知道了：

```
private void ensureExplicitCapacity(int minCapacity) {    modCount++; // 每次扩容或 add，modCount 必加    // ... 后续扩容逻辑}
```

### 3.2 经典的踩坑场景

**场景一：foreach 中直接 remove**

```
List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));for (String s : list) {    if ("B".equals(s)) {        list.remove(s); // ❌ 抛出 ConcurrentModificationException    }}
```

foreach 本质就是迭代器语法糖，反编译后就是 `iterator.hasNext()` + `iterator.next()` 循环。`remove()` 调用后 `modCount++`，但迭代器里的 `expectedModCount` 没更新，下一次 `next()` 就炸了。

**场景二：多个线程同时操作**

```
List<Integer> list = new ArrayList<>();// 线程1：迭代new Thread(() -> {    for (int i : list) {        System.out.println(i);        try { Thread.sleep(100); } catch (InterruptedException e) {}    }}).start();// 线程2：修改new Thread(() -> {    for (int i = 100; i < 200; i++) {        list.add(i); // ❌ 线程1的迭代器会炸    }}).start();
```

### 3.3 正确的删除姿势

**方式一：用迭代器的 remove()**

```
Iterator<String> it = list.iterator();while (it.hasNext()) {    String s = it.next();    if ("B".equals(s)) {        it.remove(); // ✅ 安全！因为它会更新 expectedModCount    }}
```

**方式二：Java 8 的 removeIf**

```
list.removeIf(s -> "B".equals(s)); // ✅ 一行搞定
```

看看 `removeIf` 的源码，它内部走的正是迭代器的 `remove()`：

```
// ArrayList 的 removeIf（继承自 Collection 默认方法）default boolean removeIf(Predicate<? super E> filter) {    Objects.requireNonNull(filter);    boolean removed = false;    final ArrayList<E> each = (ArrayList<E>) this;    final BitSet removeSet = new BitSet(size);    final int expectedModCount = modCount;    final int size = access.size();    for (int i=0; i < size; i++) {        // ...    }    // 内部自己维护 expectedModCount，确保一致性    return removed;}
```

**方式三：用 CopyOnWriteArrayList**

多线程场景下，直接用 `CopyOnWriteArrayList`，它的迭代器压根不做 fail-fast 检查：

```
// CopyOnWriteArrayList 的迭代器核心——没有 checkForComodification！static final class COWIterator<E> implements ListIterator<E> {    final Object[] snapshot; // 创建迭代器时拍了快照    int cursor;    public E next() {        if (!hasNext())            throw new NoSuchElementException();        return (E) snapshot[cursor++]; // 永远只读快照    }    public void remove() {        throw new UnsupportedOperationException(); // 不支持修改！    }}
```

### 3.4 fail-fast vs fail-safe

这个对比面试几乎必问：

维度

fail-fast（快速失败）

fail-safe（安全失败）

**代表类**

ArrayList, HashMap, HashSet 等 `java.util` 集合

CopyOnWriteArrayList, ConcurrentHashMap 等 `java.util.concurrent` 集合

**检测机制**

通过 modCount 检测并发修改

操作副本或 snapshot，不检测

**抛出异常**

检测到修改立即抛 ConcurrentModificationException

不会抛出该异常

**数据一致性**

强一致性，保证你看到的是最新数据

弱一致性，迭代器看到的是创建时的快照

**性能开销**

低，只是一个 int 比较

较高（复制数组、CAS 操作等）

**适用场景**

读多写少的单线程场景

高并发写入场景

## 4\. HashMap 中的类似机制

ArrayList 说了，HashMap 呢？**其实 HashMap 的内部迭代机制也完全一样**。

```
// HashMap 的 HashIteratorabstract class HashIterator {    Node<K,V> next;        // next entry to return    Node<K,V> current;     // current entry    int expectedModCount;  // for fast-fail    int index;             // current slot    HashIterator() {        expectedModCount = modCount;  // 取快照        Node<K,V>[] t = table;        current = next = null;        index = 0;        if (t != null && size > 0) { // advance to first entry            do {} while (index < t.length && (next = t[index++]) == null);        }    }    final Node<K,V> nextNode() {        Node<K,V>[] t;        Node<K,V> e = next;        if (modCount != expectedModCount) // 同一套 if 判断            throw new ConcurrentModificationException();        // ...    }}
```

Hashtable 也一样。事实上，**所有 `java.util` 包下的集合类都使用了 fail-fast 机制**。这是这个包的设计哲学。

但 `java.util.concurrent` 包下的类就走不同的路了——它们几乎都设计为 fail-safe。

## 5\. 一张图看懂整个机制

这张图清晰地展示了 modCount 与 expectedModCount 的对比机制。

## 6\. 使用示例：从踩坑到避坑

```
import java.util.*;import java.util.concurrent.CopyOnWriteArrayList;public class ConcurrentModificationDemo {    public static void main(String[] args) {        // ========== 示例1：foreach 中 remove ==========        List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));        try {            for (String s : list) {                if ("B".equals(s)) {                    list.remove(s); // 抛出 ConcurrentModificationException                }            }        } catch (ConcurrentModificationException e) {            System.out.println("❌ 示例1 失败：foreach 中不能直接 remove");        }        // ========== 示例2：迭代器的 remove ==========        List<String> list2 = new ArrayList<>(Arrays.asList("A", "B", "C"));        Iterator<String> it = list2.iterator();        while (it.hasNext()) {            String s = it.next();            if ("B".equals(s)) {                it.remove(); // ✅ 安全！迭代器的 remove 会同步 expectedModCount            }        }        System.out.println("✅ 示例2 成功：" + list2); // [A, C]        // ========== 示例3：removeIf 一行搞定 ==========        List<String> list3 = new ArrayList<>(Arrays.asList("A", "B", "C"));        list3.removeIf("B"::equals); // ✅ JDK 8+ 推荐写法        System.out.println("✅ 示例3 成功：" + list3); // [A, C]        // ========== 示例4：多线程用 CopyOnWriteArrayList ==========        List<String> safeList = new CopyOnWriteArrayList<>(Arrays.asList("A", "B", "C"));        new Thread(() -> {            for (String s : safeList) {                System.out.println("线程1 读取: " + s);                // 不加 sleep，快速遍历完            }        }).start();        new Thread(() -> safeList.add("D")).start(); // ✅ CopyOnWriteArrayList 不会抛异常        // 注意要加 sleep 让线程跑完，这里简化为说明原理        // ========== 示例5：subList 的陷阱 ==========        List<String> list5 = new ArrayList<>(Arrays.asList("A", "B", "C", "D"));        List<String> sub = list5.subList(1, 3); // [B, C]        list5.add("E"); // ✅ 对原集合的修改        try {            System.out.println(sub.get(0)); // ❌ 报 ConcurrentModificationException        } catch (ConcurrentModificationException e) {            System.out.println("❌ 示例5 失败：修改原集合后 subList 失效");        }        // 原因：subList 内部维护了 parent 的 modCount，原集合被改就会检测到        // ========== 示例6：HashMap 同理 ==========        Map<String, String> map = new HashMap<>();        map.put("1", "A");        map.put("2", "B");        try {            for (String key : map.keySet()) {                if ("1".equals(key)) {                    map.remove(key); // ❌ 抛异常                }            }        } catch (ConcurrentModificationException e) {            System.out.println("❌ 示例6 失败：HashMap entrySet 遍历中不可 remove");        }        // ✅ 正确的 HashMap 遍历删除        map.put("1", "A");        map.put("2", "B");        map.entrySet().removeIf(entry -> "1".equals(entry.getKey()));        System.out.println("✅ 正确姿势：" + map);    }}
```

## 7\. 注意事项

### 7.1 subList 的巨坑

`subList()` 返回的是 ArrayList 内部类 `SubList`，它**不是独立的集合**，只是原集合的一个视图。SubList 内部维护了自己的 `modCount` 副本，每次操作都会跟 ArrayList 的 `modCount` 做对比：

```
// SubList 的 add 方法public void add(int index, E e) {    rangeCheckForAdd(index);    checkForComodification();        // 检查原集合的 modCount    parent.add(parentOffset + index, e);    this.modCount = parent.modCount;  // 同步    this.size++;}
```

所以如果你在获取 subList 之后修改了原集合，subList 再操作就会炸。**最佳实践：拿到 subList 后就别动原集合了。**

### 7.2 modCount 溢出

理论上 `modCount` 是 `int` 类型，如果操作 20 亿次以上会溢出变成负数。但说实话，能跑到这个数这机器也该换了，真的不用操心。

### 7.3 这个异常不保证检测

JDK 官方文档明确写了：

> **Note that fail-fast behavior cannot be guaranteed as it is, generally speaking, impossible to make any hard guarantees in the presence of unsynchronized concurrent modification. Fail-fast operations throw ConcurrentModificationException on a best-effort basis.**

翻译成人话：**fail-fast 不保证 100% 检测到并发修改**。比如 `HashSet` 本质是 `HashMap` 包装，它只在 add/remove 时检查，如果你通过其他方式改动了内部结构，可能检测不到。但常规的 foreach 删除是一定会触发的。

### 7.4 ConcurrentHashMap 的特殊情况

`ConcurrentHashMap` 的设计师 Doug Lea 干嘛去了——他压根不做 fail-fast：

```
// ConcurrentHashMap 的迭代器final class Traverser<K,V> {    // 没有 expectedModCount，没有 modCount 比较！    // 它直接就遍历了，中间如果有人修改了 map，能看见就看，看不见拉倒}
```

这就是典型的 **弱一致性**。它保证你最终能看到修改，但不保证迭代器创建后新添加的元素。这也是为什么 ConcurrentHashMap 的 `size()` 和 `isEmpty()` 方法虽然准确但并非精确的原因。

## 8\. 对比总结

对比维度

ConcurrentModificationException

正常迭代

**触发条件**

`modCount != expectedModCount`

两者一致

**设计目的**

防止无意识的并发修改导致数据不一致

安全遍历

**单线程触发**

foreach 中直接 add/remove

用迭代器的 remove 或 removeIf

**多线程场景**

一个线程遍历，另一个线程修改

使用 CopyOnWriteArrayList

**检测时机**

每次 `next()` 和 `remove()` 调用时

每次迭代操作

**补救方案**

用迭代器自己的 remove

通过同步 expectedModCount

## 写在最后

这个异常其实反映了 Java 集合框架的一个设计权衡：

*   **fail-fast 牺牲了容错性，换来了数据的一致性和高性能**
    
*   **fail-safe 牺牲了实时一致性，换来了高并发下的可用性**
    

在 JDK 源码中，modCount 这个字段默默服务了几十年，没有锁、没有 CAS、就是一个简单的 `int` 比较。它不完美，但足够好用。**99% 的情况抛这个异常，都是你在单线程里 foreach 删元素——记住用迭代器的 remove 或者 removeIf 就完事了。**

下次面试官问 "ConcurrentModificationException 在什么情况下发生"，你不光能回答"多线程并发修改"，还能补一句"其实单线程 foreach 里 remove 才是最常见的"，这就是加分项了。
