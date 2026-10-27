## CopyOnWriteArrayList——最"懒"的线程安全集合，读多写少场景的王者

> 📅 **JDK源码阅读系列 · 第4篇** 上一篇我们聊了 ConcurrentHashMap 的锁桶策略，今天来看另一种思路——**CopyOnWriteArrayList**。 它不走"加锁保护现有数据"的路线，而是：**想改我？你先复制一份再说。**

![CopyOnWriteArrayList cover](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "CopyOnWriteArrayList cover")

## 1\. 类的介绍

### 继承体系

`java.lang.Object     └── java.util.concurrent.CopyOnWriteArrayList<E>           implements List<E>, RandomAccess, Cloneable, Serializable   `

没有继承 AbstractList，而是直接实现了 List 接口。这意味着它绕开了 AbstractList 的 `modCount` 机制——它压根不需要 fail-fast。

### 所在包

`java.util.concurrent` —— 又一个 JUC 并发容器。

### 核心思想

名字已经说明了一切：**Copy-On-Write**。写入时复制。

*   读操作：**完全无锁**，直接读数组，不做任何同步
    
*   写操作（add/set/remove）：**上锁**，复制一份新数组，在副本上改，改完替换引用
    

> 妙啊！读操作连加锁开销都省了，但写操作的成本变高了——每次写都要 O(n) 复制数组。

## 2\. 核心源码片段

JDK 21 源码，带你看看 CopyOnWriteArrayList 最关键的几个方法。

### 2.1 底层存储——volatile 数组

`/** 唯一的存储结构，一个 volatile 的数组引用 */   private transient volatile Object[] array;  final Object[] getArray() {       return array;   }  final void setArray(Object[] a) {       array = a;   }  `

整个类的根基就是这一个 volatile 变量。volatile 保证了对 array 引用的可见性——读线程拿到旧数组继续读，写线程替换成新数组，互不干扰。

### 2.2 get 方法——无锁读，极致简单

`public E get(int index) {       return elementAt(getArray(), index);   }  static <E> E elementAt(Object[] a, int index) {       return (E) a[index];   }  `

就两行。拿到数组引用，按索引取元素。没有任何同步操作，比 ArrayList 的 get 就多了一层 volatile read 的开销。

**关键理解**：当线程A在 get 时，线程B正在 add，A读到的是旧数组，B操作的是新数组。两者完全隔离，所以不需要锁。

### 2.3 add 方法——写时复制

`public boolean add(E e) {       synchronized (lock) {                 // ① 加锁，保证同时只有一个线程在写           Object[] es = getArray();         // ② 拿到当前数组           int len = es.length;           es = Arrays.copyOf(es, len + 1);  // ③ 复制一份，长度+1           es[len] = e;                      // ④ 在新数组末尾添加元素           setArray(es);                     // ⑤ 替换引用           return true;       }   }   `

**四步走**：加锁 → 复制 → 修改副本 → 替换引用。

注意细节点：

*   `synchronized` 用的是 `lock` 字段（不是方法级别），锁粒度极细
    
*   `Arrays.copyOf` 是 O(n) 操作，数据量大时开销巨大
    
*   替换引用后，旧数组如果没有被其他线程持有，就会被 GC
    

### 2.4 addIfAbsent——去重添加

`public boolean addIfAbsent(E e) {       Object[] snapshot = getArray();       return indexOfRange(e, snapshot, 0, snapshot.length) >= 0           ? false           : addIfAbsent(e, snapshot);  // 不存在才尝试加   }  private boolean addIfAbsent(E e, Object[] snapshot) {       synchronized (lock) {           Object[] current = getArray();           int len = current.length;           // 如果在加锁期间数组没变过，直接复用 snapshot 的判断结果           if (snapshot != current) {               // 变了！说明有并发写，重新检查               int common = Math.min(snapshot.length, len);               for (int i = 0; i < common; i++)                   if (current[i] != snapshot[i] && eq(e, current[i]))                       return false;               if (indexOfRange(e, current, common, len) >= 0)                   return false;           }           // 确定不存在，走标准的写时复制流程           Object[] newElements = Arrays.copyOf(current, len + 1);           newElements[len] = e;           setArray(newElements);           return true;       }   }  `

这个方法的精妙之处在于**先在无锁状态下检查一次**，如果已经存在就直接返回 false，省了一把锁。这叫"乐观检查 + 锁后二次确认"，和 ConcurrentHashMap 的 putIfAbsent 思路异曲同工。

### 2.5 remove 方法

`public E remove(int index) {       synchronized (lock) {           Object[] es = getArray();           int len = es.length;           E oldValue = elementAt(es, index);           int numMoved = len - index - 1;           Object[] newElements;           if (numMoved == 0)               // 删最后一个元素，直接复制前 n-1 个               newElements = Arrays.copyOf(es, len - 1);           else {               // 删中间元素，分两段复制               newElements = new Object[len - 1];               System.arraycopy(es, 0, newElements, 0, index);               System.arraycopy(es, index + 1, newElements, index, numMoved);           }           setArray(newElements);           return oldValue;       }   }   `

删除也走写时复制——复制一个少了一个元素的新数组。如果是删中间的元素，需要两次 `System.arraycopy` 把前后两段拼起来。

### 2.6 iterator——无锁快照迭代器

`public Iterator<E> iterator() {       return new COWIterator<E>(getArray(), 0);   }  static final class COWIterator<E> implements ListIterator<E> {       private final Object[] snapshot;  // 迭代器持有的是创建时的数组快照       private int cursor;      public E next() {           if (!hasNext()) throw new NoSuchElementException();           return (E) snapshot[cursor++];       }      public void remove() {           throw new UnsupportedOperationException();       }   }  `

COWIterator 直接拿了创建瞬间的数组快照，之后不管原数组怎么变，迭代器里的数据纹丝不动。好处是：**迭代永远不会出现 ConcurrentModificationException**。代价是：迭代器看不到迭代过程中其他线程添加的元素。

## 3\. 优缺点分析

### 优势

场景

性能

读操作（get/iterator）

无锁，和普通 ArrayList 几乎没区别

遍历操作（for-each）

快照机制，无并发干扰，不会抛异常

多线程并发读

完全无竞争，CPU 缓存友好

### 劣势

场景

问题

频繁写入

每次 add/remove 都复制整个数组，O(n)

数据量大

1万个元素，每次写复制1万个，内存和时间都吃不消

数据一致性

读写不一定实时一致（读旧数据），不适合强一致性场景

**一句话总结**：适合**读多写极少**的场景，不适合大列表或写频繁的场景。

## 4\. 和其他 List 的对比

特性

ArrayList

Vector

CopyOnWriteArrayList

线程安全

❌

✅（全表锁）

✅（写时复制）

读性能

⚡ 极快

🐢 有锁

⚡ 极快

写性能

⚡ O(1) 均摊

🐢 有锁

🐢 O(n) 复制

迭代安全性

fail-fast

fail-fast

快照机制，永不抛异常

内存消耗

低

低

写操作瞬时翻倍

## 5\. 使用场景

**最适合**：

*   **事件监听器列表** —— 监听器注册少、触发频次高
    
*   **缓存黑白名单** —— 配置更新不频繁，读取极频繁
    
*   **读多写少的配置项列表** —— 启动时加载，运行时几乎只读
    

**不适合**：

*   高频写入的日志系统
    
*   数据量过万且频繁增删的业务列表
    
*   要求读写实时一致的场景
    

## 6\. 彩蛋：JDK 里哪些地方在用 CopyOnWriteArrayList？

经典用法：

`// Spring 的 ApplicationListener 列表   // 注册监听器少，触发事件时需要遍历所有监听器   // 用 CopyOnWriteArrayList 保证遍历时不会有并发问题   private final List<ApplicationListener<?>> applicationListeners =           new CopyOnWriteArrayList<>();  // JDK 的 Observer 模式   // 老版本 java.util.Observable 中用的也是 Vector（后来被吐槽）   // 现代实现都改成了 CopyOnWriteArrayList  `

到 Spring 源码里搜 `CopyOnWriteArrayList`，能找到几十处使用，大多都是用来存"回调钩子列表"——注册少、触发频繁。

* * *

**下一篇预告**：JDK源码阅读(5) —— **LinkedHashMap**，看过 HashMap 的兄弟一定想知道，有序的 HashMap 是怎么实现的？LRU 缓存又是如何三行代码搞定的？