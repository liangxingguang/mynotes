---
title: JDK源码阅读(5)：LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483939&idx=1&sn=d32daec7895b112584753b7b696afa71&chksm=fe6ca379c91b2a6fc196ccd95f77cdda69dcd7393f5e7ec3d858688a98fcd18f991a56152b0c"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-06-linkedhashmap.md
asset_ref: Assets/2026/10/jdk-06-linkedhashmap.md
---

# JDK源码阅读(5)：LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍

## LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍

> 📅 **JDK源码阅读系列 · 第5篇** 上一篇第4篇我们聊了 CopyOnWriteArrayList，今天回到集合包，看看 HashMap 的亲儿子——**LinkedHashMap**。 别小看这个类，它只比 HashMap 多维护了一条双向链表，却实现了**有序遍历+访问顺序**两大杀手级能力。

![LinkedHashMap cover](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "LinkedHashMap cover")

## 1\. 类的介绍

### 继承体系

`java.lang.Object   	  └── java.util.AbstractMap<K,V>   	        └── java.util.HashMap<K,V>   	            └── java.util.LinkedHashMap<K,V>   	              implements Map<K,V>, Cloneable, Serializable   `

看清楚这棵树——LinkedHashMap **继承自 HashMap**，不是平级关系。所以它拥有 HashMap 的所有能力（哈希表、扩容、红黑树），再加上自己额外维护的双向链表。

### 所在包

`java.util` —— 集合包，和 HashMap 是亲兄弟。

### 核心作用

相比于 HashMap，LinkedHashMap 有两大**独门绝技**：

1.  **有序遍历** —— 维护了插入顺序（默认）或访问顺序
    
2.  **LRU 缓存** —— 通过 `removeEldestEntry()` 方法，**一行代码就能实现一个 LRU 缓存**
    

许多框架底层都在用它：

*   MyBatis 的 `LruCache`
    
*   Spring 的某些缓存实现
    
*   各种工具类的 `LRUMap`
    

## 2\. 核心源码解析

### 2.1 节点结构

LinkedHashMap 没有自己的节点类，它复用了 HashMap 的 `Node`，然后加了一个带前后指针的 `Entry` 子类：

`// LinkedHashMap 内部使用的节点，继承自 HashMap.Node   static class Entry<K,V> extends HashMap.Node<K,V> {   	    Entry<K,V> before, after;  	// 双向链表的前驱和后继   	        Entry(int hash, K key, V value, Node<K,V> next) {   	        super(hash, key, value, next);   	    }   }  `

关键点：

*   `before` / `after` 就是双向链表的指针
    
*   而这个 `next` 是 HashMap 的拉链法用的单链表指针
    
*   **一个节点 = 哈希表中的桶节点 + 双向链表中的节点**，身兼两职
    

### 2.2 核心字段

`public class LinkedHashMap<K,V> extends HashMap<K,V> {   	        // 双向链表的头节点（最老的节点）   	    transient LinkedHashMap.Entry<K,V> head;   	        // 双向链表的尾节点（最新的节点）   	    transient LinkedHashMap.Entry<K,V> tail;   	        // 排序模式：true = 访问顺序，false = 插入顺序   	    final boolean accessOrder;   }  `

*   `head` → 链头，最老的元素
    
*   `tail` → 链尾，最新的元素
    
*   `accessOrder` → 跟 LRU 相关，默认 `false`（插入顺序）
    

### 2.3 插入过程怎么维护链表？

LinkedHashMap **没有重写 put 方法**，而是利用了 HashMap 留给子类的 **三个钩子方法**（Template Method 模式）：

`// 1. 创建新节点时调用——LinkedHashMap 重写为创建带链表的 Entry   Node<K,V> newNode(int hash, K key, V value, Node<K,V> e) {   	    // 创建 LinkedHashMap.Entry   	    LinkedHashMap.Entry<K,V> p =   	        new LinkedHashMap.Entry<>(hash, key, value, e);   	    // 将 p 链接到双向链表的尾部   	    linkNodeLast(p);   	    return p;   }  // 2. 当红黑树节点转回链表时调用   Node<K,V> replacementNode(Node<K,V> p, Node<K,V> next) {   	    // 保持链表连接   	    LinkedHashMap.Entry<K,V> q = (LinkedHashMap.Entry<K,V>)p;   	    LinkedHashMap.Entry<K,V> t =   	        new LinkedHashMap.Entry<>(q.hash, q.key, q.value, next);   	    transferLinks(q, t);   	    return t;   }  `

核心的 `linkNodeLast` 方法：

`// 把节点追加到双向链表尾部   private void linkNodeLast(LinkedHashMap.Entry<K,V> p) {   	    LinkedHashMap.Entry<K,V> last = tail;   	    tail = p;   	   	    // 新节点成为尾节点   	    if (last == null)   	        head = p;   	   	    // 空的链表，头尾都是 p   	    else {   	        p.before = last;   	        last.after = p;  	// 建立前后指向   	    }   }   `

**所以**：你每次 `put`，HashMap 处理哈希表那一套（寻址、拉链/红黑树），而 **LinkedHashMap 默默在链表尾部追加了一个节点**。

### 2.4 遍历原理——这就是有序的原因

当你 `keySet().iterator()` 时：

`// LinkedHashMap 重写了 entrySet() 的迭代器   abstract class LinkedHashIterator {   	    LinkedHashMap.Entry<K,V> next;  	// 下一个节点   	    LinkedHashMap.Entry<K,V> current; 	// 当前节点   	        // 按照双向链表的顺序遍历，而不是哈希桶的顺序   	    public final boolean hasNext() {   	        return next != null;   	    }   	        final LinkedHashMap.Entry<K,V> nextNode() {   	        LinkedHashMap.Entry<K,V> e = next;   	        // ...   	        current = e;   	        next = e.after;  	// 沿 after 指针走！按插入顺序   	        return e;   	    }   }  `

**精髓**：普通 HashMap 遍历要走整个哈希表数组，碰到空桶就跳过；而 LinkedHashMap **沿着 `after` 指针顺序走一遍**，按插入顺序拿到所有元素，时间复杂度只有 O(n)。

### 2.5 访问顺序——LRU 的关键

`accessOrder = true` 时，每次 `get()` 会把被访问的节点**移到链表尾部**：

`public V get(Object key) {   	    Node<K,V> e;   	    if ((e = getNode(hash(key), key)) == null)   	        return null;   	    if (accessOrder)  	// 访问顺序模式   	        afterNodeAccess(e);  	// 把 e 移到链表尾部   	    return e.value;   }   `

`afterNodeAccess` 的核心逻辑：

`void afterNodeAccess(Node<K,V> e) {   	    LinkedHashMap.Entry<K,V> last;   	    if (accessOrder && (last = tail) != e) {   	        // 把 e 从链表的当前位置摘下来   	        LinkedHashMap.Entry<K,V> p =   	            (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;   	        p.after = null;   	        if (b == null)   	            head = a;   	        else   	            b.after = a;   	        if (a != null)   	            a.before = b;   	        else   	            last = b;   	        // 将 e 放到链表尾部   	        p.before = last;   	        if (last != null)   	            last.after = p;   	        tail = p;   	        // 维护 modCount   	        ++modCount;   	    }   }   `

简单理解：**每次 get 都会把这个节点"提到"链表最后面**。链表头部一直是最久没被访问的节点。

### 2.6 自动删最老元素——removeEldestEntry

`// 默认返回 false，表示永不过期   protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {   	    return false;   }   `

这个钩子方法会在每次插入后被调用。如果能移除最老的元素，就**自动执行**：

`// HashMap.putVal 中最后调用的钩子   void afterNodeInsertion(boolean evict) {   	    LinkedHashMap.Entry<K,V> first;   	    // 如果 removeEldestEntry 返回 true → 删除头节点   	    if (evict && (first = head) != null && removeEldestEntry(first)) {   	        K key = first.key;   	        removeNode(hash(key), key, null, false, true);   	    }   }   `

**两行代码实现 LRU 缓存：**

`class LRUCache<K,V> extends LinkedHashMap<K,V> {   	    private final int maxCapacity;   	        public LRUCache(int maxCapacity) {   	        super(maxCapacity, 0.75f, true);  	// accessOrder = true   	        this.maxCapacity = maxCapacity;   	    }   	    @Override   	    protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {   	        return size() > maxCapacity;  	// 超过容量就删最老的   	    }   }  `

## 3\. 使用示例

### 3.1 插入顺序 vs 访问顺序

`public class LinkedHashMapDemo {   	    public static void main(String[] args) {   	        // 插入顺序（默认）   	        Map<String, Integer> insertOrder = new LinkedHashMap<>(16, 0.75f, false);   	                // 访问顺序   	        Map<String, Integer> accessOrder = new LinkedHashMap<>(16, 0.75f, true);   	                // 插入同样的数据   	        String[] keys = {"A", "B", "C", "D", "E"};   	        for (String key : keys) {   	            insertOrder.put(key, key.charAt(0) - 'A' + 1);   	            accessOrder.put(key, key.charAt(0) - 'A' + 1);   	        }   	                System.out.println("=== 插入顺序 ===");   	        insertOrder.forEach((k, v) -> System.out.print(k + " "));   	        // 输出: A B C D E   	                // 访问一下 B 和 D   	        accessOrder.get("B");   	        accessOrder.get("D");   	                System.out.println("\n=== 访问顺序（B和D被访问后移到最后）===");   	        accessOrder.forEach((k, v) -> System.out.print(k + " "));   	        // 输出: A C E B D   	    }   }  `

### 3.2 完整 LRU 缓存

`class LRUCache<K,V> extends LinkedHashMap<K,V> {   	    private final int maxCapacity;   	        public LRUCache(int maxCapacity) {   	        // 容量、负载因子、访问顺序模式   	        super(maxCapacity, 0.75f, true);   	        this.maxCapacity = maxCapacity;   	    }   	    @Override   	    protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {   	        return size() > maxCapacity;   	    }   	    public static void main(String[] args) {   	        LRUCache<String, String> cache = new LRUCache<>(3);   	                cache.put("1", "A");   	        cache.put("2", "B");   	        cache.put("3", "C");   	        System.out.println("初始: " + cache);  	// {1=A, 2=B, 3=C}   	                // 访问 1，它变成最新的   	        cache.get("1");   	        System.out.println("访问1: " + cache);  	// {2=B, 3=C, 1=A}   	                // 插入新的，最久未用的2会被淘汰   	        cache.put("4", "D");   	        System.out.println("插入4: " + cache);  	// {3=C, 1=A, 4=D}   	        // 2 被移除了！   	                // 再访问 3   	        cache.get("3");   	        System.out.println("访问3: " + cache);  	// {1=A, 4=D, 3=C}   	                // 插入5，淘汰最久未用的1   	        cache.put("5", "E");   	        System.out.println("插入5: " + cache);  	// {4=D, 3=C, 5=E}   	    }   }  `

## 4\. 注意事项

### ⚠️ 性能

*   LinkedHashMap 的 put/get 操作**时间复杂度 O(1)**，与 HashMap 完全一样
    
*   但多维护了双向链表，**内存开销略大**（多了两个指针 before/after）
    
*   遍历比 HashMap **快得多**（HashMap 需要遍历整个数组存在空桶，LinkedHashMap 只沿链表走）
    

### ⚠️ 线程安全

*   **不是线程安全的**！多线程环境下用 `Collections.synchronizedMap(new LinkedHashMap<>())`
    
*   或者用 `ConcurrentSkipListMap` 如果要求有序且并发
    

### ⚠️ LRU 缓存的坑

*   `removeEldestEntry` 的淘汰是**被动触发**的，只有 put 插入时才会检查
    
*   如果你的业务有大量读操作，**LRU 缓存的淘汰会延迟**
    
*   更完善的 LRU 要用 `ConcurrentLinkedHashMap`（Guava/Caffeine 那种）
    

### ⚠️ 红黑树节点的链表维护

*   当桶中链表长度超过 8 转红黑树时，LinkedHashMap 需要额外处理 `after`/`before` 指针
    
*   JDK 8 通过 `afterNodeAccess` / `afterNodeInsertion` / `afterNodeRemoval` 三个钩子完美解决了
    

### ⚠️ equals 和 hashCode

*   LinkedHashMap 不要求 key 有序，所以依然靠 hashCode 定位桶
    
*   和其他 Map 一样，key 必须正确实现 `equals()` 和 `hashCode()`
    

## 5\. 对比总结

特性

HashMap

LinkedHashMap

TreeMap

数据结构

数组+链表+红黑树

数组+链表+红黑树+双向链表

红黑树

迭代顺序

无序

插入顺序/访问顺序

自然顺序/Comparator

时间复杂度

O(1)

O(1)

O(log n)

空间开销

较低

中（多两个指针）

较高

实现 LRU

❌ 不支持

✅ 一行代码

❌ 不支持

线程安全

❌

❌

❌

插入性能

最高

略低于HashMap

中等

## 总结

LinkedHashMap 是我个人非常喜欢的一个类——它用极小的代价（每个节点多两个指针），就实现了 HashMap 做不到的有序遍历和 LRU 缓存。**Template Method 模式的经典应用**（三个 `afterNode*` 钩子），代码写得干净漂亮。

当年我在公司写缓存方案时，面试官问我"你实现LRU准备用什么"，我说了 LinkedHashMap，他直接说"可以了"。不是因为它性能最好，而是**简单、够用、不出bug**。很多时候，一个优雅的工具类胜过自己写的复杂算法。

> 下一篇预告：ReentrantLock —— JUC 包的锁之王，AQS 的经典实现
