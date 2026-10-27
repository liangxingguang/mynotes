---
title: JDK源码阅读(3)：ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483907&idx=1&sn=d8d2ae367a11551d05de46aff6ff3908&chksm=fe6ca359c91b2a4f5f4d0c98fa4d6eeb7c4dca13bd206c655db6dae1aeaefe9f56ea5257f78f"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-04-concurrenthashmap.md
asset_ref: Assets/2026/10/jdk-04-concurrenthashmap.md
---

# JDK源码阅读(3)：ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了

## ConcurrentHashMap——面试必问的并发HashMap，看完这篇就够了

> 📅 **JDK源码阅读系列 · 第3篇** 上一篇我们聊了 HashMap，今天来看它的并发版本——**ConcurrentHashMap**。 这是 JUC 包里的重量级选手，也是 Java 面试中出场率最高的类之一。

![ConcurrentHashMap cover](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "ConcurrentHashMap cover")

## 1\. 类的介绍

### 继承体系

`java.lang.Object   	  └── java.util.AbstractMap<K,V>   	        └── java.util.concurrent.ConcurrentHashMap<K,V>   	          implements ConcurrentMap<K,V>, Serializable   `

ConcurrentHashMap 继承自 `AbstractMap`，实现了 `ConcurrentMap` 接口。它和 HashMap 在继承树上是兄弟关系，不是父子关系。

### 所在包

`java.util.concurrent` —— JUC 包的镇包之宝。

### 核心作用

一句话：**线程安全的 HashMap**，支持高并发读写场景。

*   读操作**无锁**（JDK 8+），写操作只锁**桶的头节点**
    
*   相比 `HashTable` 的全表锁，性能提升几个数量级
    
*   相比 `Collections.synchronizedMap()`，也是碾压式提升
    

## 2\. 核心源码片段

我直接扒 JDK 21 的源码来讲，挑最核心的几个点。

### 2.1 存储结构——Node 数组 + 链表 + 红黑树

`// table：底层的 Node 数组，懒加载，第一次 put 时才初始化   transient volatile Node<K,V>[] table;  // nextTable：扩容时的临时数组，平时为 null   private transient volatile Node<K,V>[] nextTable;  // sizeCtl：核心控制字段，不同值的含义完全不同   // -1 表示有线程在初始化   // -N 表示有 N-1 个线程在扩容   // 正数表示 table 的阈值（capacity * loadFactor）   private transient volatile int sizeCtl;  `

这里有个细节：`sizeCtl` 这个字段设计得真巧妙，一个 int 塞了三个不同的状态，读到源码的时候忍不住想给 Doug Lea 磕一个。

### 2.2 put 方法——锁桶不锁表

`public V put(K key, V value) {   	    return putVal(key, value, false);   }  final V putVal(K key, V value, boolean onlyIfAbsent) {   	    if (key == null || value == null) throw new NullPointerException();   	    int hash = spread(key.hashCode());  // 扰动哈希   	    int binCount = 0;   	    for (Node<K,V>[] tab = table;;) {   	        Node<K,V> f; int n, i, fh; K fk; V fv;   	        if (tab == null || (n = tab.length) == 0)   	            tab = initTable();        	// 懒初始化   	        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {   	            // 槽位为空，CAS 无锁插入   	            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value)))   	                break;   	        }   	        else if ((fh = f.hash) == MOVED)   	            tab = helpTransfer(tab, f); // 有线程在扩容，帮忙搬   	        else {   	            V oldVal = null;   	            synchronized (f) {  		// 只锁桶的头节点！   	                // ... 遍历链表或红黑树，插入或覆盖   	            }   	            if (binCount >= TREEIFY_THRESHOLD)   	                treeifyBin(tab, i);     	// 链表转红黑树   	        }   	    }   	    addCount(1L, binCount);             	// 计数，触发扩容检查   	    return null;   }  `

注意看，ConcurrentHashMap 和 HashMap 最大的不同就两点：

1.  **插入空哈希桶时用 CAS**，不加锁，性能拉满
    
2.  **只在哈希冲突时加锁**，而且锁的粒度是**单个桶的头节点**，不是整个表
    

这可比 HashTable 的 `synchronized` 方法锁高明太多了。HashTable 是所有操作串行化，ConcurrentHashMap 是 16 个桶并发写入起步（默认 16 个桶，看初始容量）。

### 2.3 get 方法——全程无锁

`public V get(Object key) {   	    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;   	    int h = spread(key.hashCode());   	    if ((tab = table) != null && (n = tab.length) > 0 &&   	        (e = tabAt(tab, (n - 1) & h)) != null) {   	        if ((eh = e.hash) == h) {   	            if ((ek = e.key) == key || (ek != null && key.equals(ek)))   	                return e.val;   	        }   	        else if (eh < 0)           	// 特殊节点（红黑树、转移节点）   	            return (p = e.find(h, key)) != null ? p.val : null;   	        while ((e = e.next) != null) { // 链表遍历   	            if (e.hash == h &&   	                ((ek = e.key) == key || (ek != null && key.equals(ek))))   	                return e.val;   	        }   	    }   	    return null; // 找不到返回 null   }   `

**get 全程没有锁。** 怎么做到的？靠的就是 volatile 关键字 —— `table` 数组引用是 volatile 的，`Node` 的 `val` 和 `next` 也是 volatile 的。volatile 保证可见性：一个线程修改了节点值，另一个线程立刻就能读到。

这就解释了为什么 ConcurrentHashMap 的读性能几乎和 HashMap 一样快——因为没有锁的开销！

### 2.4 扩容机制——多线程协作（重点！）

`// 核心扩容方法（精简版）   private final void transfer(Node<K,V>[] tab, Node<K,V>[] nextTab) {   	    int n = tab.length, stride;   	    if ((stride = (NCPU > 1) ? (n >>> 3) / NCPU : n) < MIN_TRANSFER_STRIDE)   	        stride = MIN_TRANSFER_STRIDE;  // 每个线程负责的步长   	        if (nextTab == null) {             	// 初始化新数组   	        nextTab = new Node<?,?>[n << 1];   	        // ...   	    }   	    // 每个线程从 assigned 区间搬数据   	    // 领任务 -> 搬完 -> 再领 -> 直到所有区间搬完   	    // 用 ForwardingNode 标记已搬完的桶   	    // ...   }  `

ConcurrentHashMap 的扩容是**多线程协作**的。简单来说：

1.  当某个线程 put 时发现需要扩容，它**不一个人干完所有活**
    
2.  它只申领一块"任务区间"，搬完自己那块
    
3.  其他线程 put 时看到 `MOVED` 标识（ForwardingNode），会**主动帮忙搬**
    
4.  所有线程搬完，扩容结束
    

这就像搬家——一个人搬太慢，来的客人搭把手，个个都搬几箱，效率翻倍。

## 3\. 关键算法

### spread 扰动函数

`static final int spread(int h) {   	    return (h ^ (h >>> 16)) & HASH_BITS;   }   `

和 HashMap 的 `hash()` 方法思路一样：高 16 位和低 16 位异或，让高位也参与寻址。区别是多了一个 `& HASH_BITS`（0x7fffffff），保证结果为正数，用来区分特殊哈希值（负数）。

### tabAt / casTabAt / setTabAt

`@SuppressWarnings("unchecked")   static final <K,V> Node<K,V> tabAt(Node<K,V>[] tab, int i) {   	    return (Node<K,V>)U.getObjectAcquire(tab, ((long)i << ASHIFT) + ABASE);   }  static final <K,V> boolean casTabAt(Node<K,V>[] tab, int i,   	                                   Node<K,V> c, Node<K,V> v) {   	    return U.compareAndSetObject(tab, ((long)i << ASHIFT) + ABASE, c, v);   }  `

这三个方法通过 `Unsafe` 直接操作内存：`ABASE` 是数组第一个元素的偏移地址，`ASHIFT` 是元素大小偏移，`i << ASHIFT + ABASE` 就是第 i 个元素的内存地址。

为啥不用普通的数组访问？因为 `volatile` 数组的普通读写不能保证元素级别的 volatile 语义——`volatile Node<K,V>[] table` 只保证数组引用的可见性，不保证数组元素的可见性。所以必须用 `Unsafe` 来保证。

## 4\. 对比：ConcurrentHashMap vs HashMap vs HashTable

特性

HashMap

HashTable

ConcurrentHashMap

线程安全

❌ 不安全

✅ 安全

✅ 安全

锁粒度

无锁

全表锁

桶级锁/CAS

允许 null key

✅

❌

❌

允许 null value

✅

❌

❌

读性能

最高

低（串行化）

接近 HashMap

写性能

最高

低（串行化）

高（桶锁）

扩容

单线程

单线程

多线程协作

迭代器

fail-fast

fail-fast

**弱一致性**

关于 null key/value：ConcurrentHashMap 不支持 null，这是设计上故意的。因为在多线程环境下，`get(key)` 返回 null 时，你没法区分是 key 不存在还是 value 就是 null。如果是 null，那业务逻辑上可以用一个"哨兵值"来替代。

## 5\. 使用示例

直接上实战代码，我验证过的：

`import java.util.concurrent.ConcurrentHashMap;  public class ConcurrentHashMapDemo {  	        public static void main(String[] args) throws InterruptedException {   	        // 一个多线程计数的场景   	        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();   	                // 创建10个线程，每个对同一个key累加1000次   	        Thread[] threads = new Thread[10];   	        for (int i = 0; i < 10; i++) {   	            threads[i] = new Thread(() -> {   	                for (int j = 0; j < 1000; j++) {   	                    // 原子性的复合操作   	                    map.compute("count", (key, val) ->    	                        (val == null) ? 1 : val + 1);   	                }   	            });   	            threads[i].start();   	        }   	                // 等待所有线程完成   	        for (Thread t : threads) {   	            t.join();   	        }   	                System.out.println("最终结果: " + map.get("count")); // 10000   	        // 如果换成 HashMap 或者不加同步，结果会小于 10000   	           // ---------- 第二个例子：缓存场景 ----------   	        ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();   	                // computeIfAbsent：只在key不存在时才计算，原子操作   	        String value = cache.computeIfAbsent("config", key -> {   	            System.out.println("正在加载配置...");   	            return loadFromDatabase(key);   	        });   	                System.out.println("缓存值: " + value);   	        // 第二次获取，不会执行加载函数   	        System.out.println("再次获取: " + cache.get("config"));   	    }  	    private static String loadFromDatabase(String key) {   	        // 模拟数据库加载   	        return "expires_in_3600";   	    }   }  `

输出：

`最终结果: 10000   正在加载配置...   缓存值: expires_in_3600   再次获取: expires_in_3600   `

如果换个场景用 `HashMap` 跑多线程累加，大概率结果比 10000 小，因为存在竞态条件——两个线程同时读到同一个值，各自加 1 写回，就"覆盖"了一次递增。

## 6\. 注意事项

### 6.1 弱一致性迭代器

`ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();   map.put("a", "1");  // 遍历过程中其他线程修改   for (String key : map.keySet()) {   	    // 遍历到一半时，其他线程删了"a"或者新增了"b"   	    // ConcurrentHashMap 不会抛 ConcurrentModificationException   	    // 但你可能看到旧数据或者没看到新数据   	    System.out.println(key);   }  `

这不是 bug，是**设计选择**——为了性能放弃了强一致性。所以如果你需要"遍历期间 map 不能变"，得自己加外部锁。

### 6.2 size() 的精度问题

`map.size(); // 在并发写入下可能不是精确值   `

JDK 8 中 `size()` 返回的是近似值。JDK 21 里它调用了 `sumCount()`，通过 `CounterCell` 数组和 `baseCount` 求和，已经是能做到的最好精度了。但在高并发下，仍然不是精确的实时值。

### 6.3 性能开销

*   虽然比 HashTable 快很多，但比 HashMap 还是慢 10%-30% 左右
    
*   扩容时多线程协作虽然快，但**所有读写操作**都要额外检查 `ForwardingNode`
    
*   小数据量（<100 条）直接用 `Collections.synchronizedMap()` 可能更简单
    

## 7\. 总结

ConcurrentHashMap 的演进史，就是 Java 并发编程的微缩历史：

*   **JDK 1.4 及以前**：用 HashTable，全表锁
    
*   **JDK 5**：Segment 分段锁，16 个段各自加锁，比 HashTable 快 16 倍
    
*   **JDK 7**：还是分段锁，但优化了扩容
    
*   **JDK 8**：全面重写，抛弃分段锁，用 **CAS + synchronized(桶头)**，粒度更细，性能再上一个台阶
    
*   **JDK 8+**：持续优化，引入多线程扩容、红黑树等
    

**什么时候用 ConcurrentHashMap？**

*   高并发读多写少场景 — 读写都得快
    
*   缓存场景 — `computeIfAbsent` 真香
    
*   多线程的统计/计数类场景
    

**什么时候别用？**

*   单线程直接用 HashMap，省那 10%-30% 的性能没必要
    
*   需要强一致性的迭代— 得自己加锁
    

> **一句话记忆法**：HashMap 是单线程的跑车，ConcurrentHashMap 是高速路上的多车道，HashTable 是只有一个收费口的国道。

* * *

**下一篇预告**：CopyOnWriteArrayList —— 读多写少场景的神器，和 ArrayList 对比学。

📌 系列文章：

*   \[JDK源码阅读(1)：ArrayList 深度解析\]
    
*   \[JDK源码阅读(2)：HashMap 深度解析\]
    
*   \[JDK源码阅读(3)：ConcurrentHashMap 深度解析\] ← 你在看这篇
