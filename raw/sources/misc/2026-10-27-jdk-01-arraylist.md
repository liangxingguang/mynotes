---
title: JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483850&idx=1&sn=e7ed1b5dcfe84b5c398ec7cf80b9c0ba&chksm=fe6ca090c91b2986d6e41fdbd1fe54603dbd518a1174a9dd820b29dcc692800ee7e43c337251"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-01-arraylist.md
asset_ref: Assets/2026/10/jdk-01-arraylist.md
---

# JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？

## JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？

![Java](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "Java")

## 一、先聊聊 ArrayList 是谁

讲真，ArrayList 可能是 Java 程序员**第一个接触的集合类**。培训班第一行代码 `List<String> list = new ArrayList<>()`，然后就开始往里塞数据——但有多少人认真看过它的源码？

ArrayList 本质就是一个**动态数组**，底层用 `Object[]` 存数据，JDK 1.2 就加入了这个类，二十多年过去了依然活跃在一线。

它的继承体系长这样：

`java.lang.Object   	  └── java.util.AbstractCollection<E>   	        └── java.util.AbstractList<E>   	            └── java.util.ArrayList<E>   	                    implements List<E>, RandomAccess, Cloneable, java.io.Serializable   `

注意那个 `RandomAccess` 标记接口——这是个空接口，纯粹用来告诉 JVM："我这个类支持高效的随机访问"，底层说白了就是数组这天然的优势：**通过下标访问 O(1)**。

## 二、核心源码解剖

### 2.1 全局变量——三个常量就能说明白

`public class ArrayList<E> extends AbstractList<E>   	        implements List<E>, RandomAccess, Cloneable, java.io.Serializable {   	    // 序列化ID，保证反序列化版本一致   	    private static final long serialVersionUID = 8683452581122892189L;   	    // 默认初始容量——10，经典面试题   	    private static final int DEFAULT_CAPACITY = 10;   	    // 空数组，new ArrayList(0) 时用到   	    private static final Object[] EMPTY_ELEMENTDATA = {};   	    // 默认大小的空数组，new ArrayList() 时用到（懒加载）   	    private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};   	    // 真正存数据的数组 —— transient 意味着不参与默认序列化   	    transient Object[] elementData;   	    // 当前元素个数（不是数组长度！）   	    private int size;   }  `

这里有个细节：**`elementData` 是 `transient` 的**，意味着 ArrayList 有自己的序列化方案（`writeObject`/`readObject`），只序列化实际有数据的部分，而不是整个数组——节省空间。

另一个坑：`DEFAULTCAPACITY_EMPTY_ELEMENTDATA` 和 `EMPTY_ELEMENTDATA` 虽然都是空数组，但作用完全不同。前者在第一次 `add` 时会扩容到 DEFAULT\_CAPACITY=10，后者不会——加元素时按实际需要的最小容量扩容。面试问 ArrayList 懒加载机制，就是在说这个。

### 2.2 构造方法——三种姿势

`// 姿势一：指定初始容量   public ArrayList(int initialCapacity) {   	    if (initialCapacity > 0) {   	        this.elementData = new Object[initialCapacity];   	    } else if (initialCapacity == 0) {   	        this.elementData = EMPTY_ELEMENTDATA; // 用 EMPTY   	    } else {   	        throw new IllegalArgumentException("Illegal Capacity: " + initialCapacity);   	    }   }  // 姿势二：无参构造——懒加载，等到第一次 add 才初始化   public ArrayList() {   	    this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA; // 用 DEFAULT_EMPTY   }  // 姿势三：从已有集合拷贝   public ArrayList(Collection<? extends E> c) {   	    Object[] a = c.toArray();   	    if ((size = a.length) != 0) {   	        if (c.getClass() == ArrayList.class) {   	            elementData = a;   	        } else {   	            elementData = Arrays.copyOf(a, size, Object[].class);   	        }   	    } else {   	        elementData = EMPTY_ELEMENTDATA;   	    }   }  `

姿势二是最常用的写法——`new ArrayList<>()`，这时候 elementData 是个空数组，啥都不占。**等你第一次 `add()` 的时候才真正分配 10 个位置的数组**。这种"不到用时不分配"的懒加载思路，在 JDK 源码里随处可见。

### 2.3 add 方法——扩容才是重点

`public boolean add(E e) {   	    // 确保容量够用，不够就扩容   	    ensureCapacityInternal(size + 1);   	    elementData[size++] = e; // 尾部插入，O(1)   	    return true;   }   `

核心看 `ensureCapacityInternal` 这条调用链：

`// 1. 计算最小需要的容量   private void ensureCapacityInternal(int minCapacity) {   	    ensureExplicitCapacity(   	        calculateCapacity(elementData, minCapacity)   	    );   }  // 2. 如果是懒加载空数组，最小容量取 max(10, minCapacity)   private static int calculateCapacity(Object[] elementData, int minCapacity) {   	    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {   	        return Math.max(DEFAULT_CAPACITY, minCapacity);   	    }   	    return minCapacity;   }  // 3. 判断是否需要扩容   private void ensureExplicitCapacity(int minCapacity) {   	    modCount++; // 这个后面说——快速失败机制的关键   	    if (minCapacity - elementData.length > 0)   	        grow(minCapacity); // 不够了，扩！   }  // 4. 真正扩容——每次扩 1.5 倍   private void grow(int minCapacity) {   	    int oldCapacity = elementData.length;   	    int newCapacity = oldCapacity + (oldCapacity >> 1); // 关键：右移一位 ≈ 除以2   	    if (newCapacity - minCapacity < 0)   	        newCapacity = minCapacity;   	    if (newCapacity - MAX_ARRAY_SIZE > 0)   	        newCapacity = hugeCapacity(minCapacity);   	    elementData = Arrays.copyOf(elementData, newCapacity);   }  `

**1.5 倍扩容是怎么算的？** `oldCapacity + (oldCapacity >> 1)`，右移一位相当于除以 2，所以就是 `old + old/2 = old * 1.5`。

为什么要 1.5 倍而不是固定加 10 个？这是**时间和空间的平衡**：

*   如果固定加，频繁扩容 copy 数组 O(n) 太痛了
    
*   如果 2 倍扩容，浪费空间更严重
    
*   1.5 倍是 JDK 开发组实验出来的折中
    

### 2.4 get 和 set——随机访问的底气

`public E get(int index) {   	    rangeCheck(index);        // 检查下标越界   	    return elementData(index); // 直接数组下标访问！   }  public E set(int index, E element) {   	    rangeCheck(index);   	    E oldValue = elementData(index);   	    elementData[index] = element; // 直接替换   	    return oldValue;   }  `

就是这么简单粗暴——**数组直接下标访问 O(1)**。这也解释了为什么 ArrayList 适合随机访问，LinkedList 只能顺序访问。

### 2.5 remove 方法——删除的代价

`public E remove(int index) {   	    rangeCheck(index);   	    modCount++;   	    E oldValue = elementData(index);  	    int numMoved = size - index - 1;   	    if (numMoved > 0)   	        // 把后面的元素全部往前挪！   	        System.arraycopy(elementData, index + 1, elementData, index, numMoved);   	    elementData[--size] = null; // 让 GC 可以回收  	    return oldValue;   }  `

删除元素需要把后面所有元素往前移——**平均 O(n)**。这就是 ArrayList 的软肋，也是 LinkedList 有机可乘的地方。

### 2.6 批量操作

`// addAll 的时候直接一次扩容到位，避免多次扩容   public boolean addAll(Collection<? extends E> c) {   	    Object[] a = c.toArray();   	    int numNew = a.length;   	    ensureCapacityInternal(size + numNew); // 一次扩够   	    System.arraycopy(a, 0, elementData, size, numNew);   	    size += numNew;   	    return numNew != 0;   }  // 用 batchRemove 做 removeAll / retainAll   private boolean batchRemove(Collection<?> c, boolean complement) {   	    // complement=true 就是 retainAll（保留在 c 中的）   	    // complement=false 就是 removeAll（删除在 c 中的）   	    // ...   }  `

## 三、Fast-Fail 机制——那个 ConcurrentModificationException

如果面试问到 ArrayList，**ConcurrentModificationException** 绝对绕不开。

`protected transient int modCount = 0; // AbstractList 中的字段   `

每次结构修改（add、remove、clear 等），`modCount` 都会 +1。当用迭代器遍历时，迭代器会记录 `expectedModCount = modCount`，每次迭代检查：

`private class Itr implements Iterator<E> {   	    int expectedModCount = modCount;   	    // ...  	    final void checkForComodification() {   	        if (modCount != expectedModCount)   	            throw new ConcurrentModificationException();   	    }  	    public E next() {   	        checkForComodification();   	        // ...   	    }  	    public void remove() {   	        // 迭代器的 remove 会重置 expectedModCount   	        checkForComodification();   	        // ...   	        expectedModCount = modCount; // 同步！   	    }   }  `

所以**不要在 foreach 循环里 add/remove**——foreach 底层就是迭代器。如果你要遍历时删除，必须用 `Iterator.remove()`，或者 Java 8+ 的 `removeIf()`。

举个例子：这段代码必跪：

`List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));   for (String s : list) {   	    if ("B".equals(s)) {   	        list.remove(s); // ❌ ConcurrentModificationException！   	    }   }   `

用迭代器或 removeIf 就没事：

`list.removeIf(s -> "B".equals(s)); // ✅ 正确姿势   `

## 四、使用示例来一个

下面写个完整示例，演示 ArrayList 的常见操作和容量变化：

`import java.util.ArrayList;   import java.util.Iterator;   import java.util.List;  public class ArrayListDemo {   	    public static void main(String[] args) throws Exception {   	        // 1. 无参构造——懒加载   	        List<String> list = new ArrayList<>();   	        System.out.println("初始 size: " + list.size());   	        // 通过反射看底层数组长度   	        System.out.println("初始 capacity: " + getCapacity(list));  	        // 2. 不断添加，观察扩容   	        for (int i = 0; i < 15; i++) {   	            list.add("item-" + i);   	            System.out.println("添加第 " + (i + 1) + " 个，capacity: " + getCapacity(list));   	        }  	        // 3. 随机访问   	        System.out.println("\n第5个元素: " + list.get(4));  // O(1)  	        // 4. 中间插入——会导致后面元素移位 O(n)   	        list.add(3, "inserted");   	        System.out.println("插入后第4个元素: " + list.get(3));  	        // 5. 删除   	        list.remove(3);   	        System.out.println("删除后第4个元素: " + list.get(3) + "（恢复）");  	        // 6. 遍历时安全删除——用 removeIf   	        list.removeIf(s -> s.endsWith("0") || s.endsWith("5"));   	        System.out.println("删除末尾是0或5的元素后 size: " + list.size());  	        // 7. 遍历时安全删除——用 Iterator   	        Iterator<String> it = list.iterator();   	        while (it.hasNext()) {   	            String s = it.next();   	            if (s.endsWith("9")) {   	                it.remove();  // ✅ 安全   	            }   	        }   	        System.out.println("删除末尾是9的元素后 size: " + list.size());   	    }  	    // 通过反射获取底层数组长度   	    private static int getCapacity(List<?> list) throws Exception {   	        var field = ArrayList.class.getDeclaredField("elementData");   	        field.setAccessible(true);   	        return ((Object[]) field.get(list)).length;   	    }   }  `

运行后会看到：

`初始 size: 0   初始 capacity: 0          ← 没 add 之前数组是空的！   添加第 1 个，capacity: 10  ← 第一次 add，扩容到 10   添加第 2 个，capacity: 10   ...   添加第 10 个，capacity: 10   添加第 11 个，capacity: 15 ← 10 * 1.5 = 15   添加第 12 个，capacity: 15   ...   `

这就是懒加载的现场验证——无参构造的 ArrayList 在第一次 add 之前，**底层数组就是空的**。

## 五、注意事项——哪些坑我踩过

### 5.1 容量预分配

如果你知道大概要存多少数据，**一定要指定初始容量**：

`// ❌ 不知道的话，一次一次扩，每次都要 O(n) 拷贝   List<String> list = new ArrayList<>();  // ✅ 知道大小就指定   List<String> list = new ArrayList<>(1000);  `

1000 个元素，如果不指定（从 10 开始，每次 1.5 倍）：

*   扩容路径：10 → 15 → 22 → 33 → 49 → 73 → 109 → 163 → 244 → 366 → 549 → 823 → 1234
    
*   总共要扩容 **13 次**，每次都要 `Arrays.copyOf` 拷贝整个数组
    

### 5.2 subList 的坑

`subList` 返回的不是一个新 List，而是**原 List 的视图**：

`List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C", "D"));   List<String> sub = list.subList(1, 3); // ["B", "C"]   sub.add("X"); // 改了 sub，list 也跟着变了！   System.out.println(list); // [A, B, C, X, D]   `

更惨的是，subList 之后如果原 list 做了结构性修改，subList 再操作会抛异常。

### 5.3 线程不安全

ArrayList 的 add、remove 等操作**完全没有同步**。多个线程同时写，会出现：

*   元素丢失（两个线程同时写同一个位置）
    
*   数组越界（扩容时并发 add）
    
*   甚至看见 null
    

多线程环境用 `CopyOnWriteArrayList` 或 `Collections.synchronizedList()`。

### 5.4 toArray 的转型陷阱

`// ❌ 这样会抛 ClassCastException   String[] arr = (String[]) list.toArray();  // ✅ 正确姿势   String[] arr = list.toArray(new String[0]);  `

其实在 Java 11+ 可以写成 `list.toArray(String[]::new)`，更简洁也更高效。

## 六、对比总结

特性

ArrayList

LinkedList

底层结构

动态数组

双向链表

随机访问 get(i)

**O(1)** ✅

O(n) ❌

尾部插入 add(E)

**O(1)** ✅（均摊）

O(1) ✅

头部/中间插入

O(n) ❌

**O(1)** ✅（给定节点）

删除

O(n) ❌

O(1) ✅（给定节点）

内存占用

紧凑，连续内存 ✅

每个节点多存前后指针 ❌

支持快速失败

✅

✅

线程安全

❌

❌

我的原则：**90% 的场景用 ArrayList**，因为内存连续能利用 CPU 缓存行，随机访问快。只有频繁在中间插入/删除时才考虑 LinkedList，而且说实话——这场景很少见。

* * *

如果你看到这里，大概觉得 ArrayList 也没啥——就是个用数组实现的 List。但了解它的扩容策略、懒加载、Fast-Fail 机制，多多少少能帮你避开一些生产环境下的坑。

**下一期预告：LinkedList——双向链表的真实面貌**
