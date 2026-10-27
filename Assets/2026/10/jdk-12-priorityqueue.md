工作中你一定遇到过这种场景：任务要按"优先级"处理，谁重要谁先上，不按先来后到。

那你用的什么？每次都 `Collections.sort` 吗？或者 `TreeMap` ？其实 JDK 早就给我们准备好了一个优雅的家伙——**PriorityQueue**。

今天就来拆开它，看看这棵「隐藏的树」是怎么做到插入和删除都在 O(log n) 完成的。

* * *

## 1\. 类的基本介绍

### 继承体系

```
public class PriorityQueue<E> extends AbstractQueue<E>    implements java.io.Serializable {    // ...}
```

继承 `AbstractQueue`（提供了队列操作的基础抽象），实现了 `Serializable`。没有实现 `Deque` 接口，所以**不支持两端操作**。

跟 `TreeSet`、`TreeMap` 不一样，PriorityQueue 是**基于堆**的，不是基于树（红黑树）的。

### 核心作用

*   **优先队列**：元素按优先级出队，优先级最高的最先出队
    
*   **默认自然排序**（小顶堆：最小值优先）
    
*   支持自定义 `Comparator`
    
*   **不允许 null 元素**
    
*   **非线程安全**——多线程场景用 `PriorityBlockingQueue`
    

我个人的理解：PriorityQueue 就像是一个**自动排序的漏斗**——你往里丢东西，它默默帮你排好队；你往外取的时候，永远取到当前最小的那个。

* * *

## 2\. 源码截图与核心原理

### 2.1 数据结构

```
// 默认初始容量private static final int DEFAULT_INITIAL_CAPACITY = 11;// 底层用数组存储堆元素transient Object[] queue;// 当前元素个数private int size = 0;// 自定义比较器，为 null 时使用自然排序private final Comparator<? super E> comparator;// 堆结构修改次数（fail-fast 机制）transient int modCount = 0;
```

**PriorityQueue 底层就是一个数组，但这个数组是一棵隐式的平衡二叉堆。**

堆的父子关系通过下标计算：

```
父节点下标: (n - 1) >>> 1     // 无符号右移，相当于 (n-1)/2左子节点下标: 2 * n + 1右子节点下标: 2 * n + 2
```

> 如果你脑子里没有画面，可以想象一个完全二叉树，从上到下、从左到右一层层填满，数组下标正好就是层级遍历的顺序。**本质上 PriorityQueue 就是把树"压扁"成了数组。**

一张示意图帮助理解：

```
        1      /   \     3     5    / \   /   7  9  8数组: [1, 3, 5, 7, 9, 8]       0  1  2  3  4  5父节点 1  -> 子节点 3(下标1), 5(下标2)父节点 3  -> 子节点 7(下标3), 9(下标4)父节点 5  -> 子节点 8(下标5)
```

### 2.2 上浮操作：插入元素（siftUp）

插入新元素时，先放到数组末尾，然后**不断跟父节点比较**，如果更小（优先级更高）就往上交换——俗称"上浮"或"上滤"。

```
public boolean offer(E e) {    if (e == null)        throw new NullPointerException();    modCount++;    int i = size;    if (i >= queue.length)        grow(i + 1);           // 自动扩容    size = i + 1;    if (i == 0)        queue[0] = e;          // 空队列直接放第一个    else        siftUp(i, e);          // 上浮调整    return true;}
```

关键方法 `siftUp`：

```
private void siftUp(int k, E x) {    if (comparator != null)        siftUpUsingComparator(k, x, queue, comparator);    else        siftUpComparable(k, x, queue);}private static <T> void siftUpComparable(int k, T x, Object[] es) {    Comparable<? super T> key = (Comparable<? super T>) x;    while (k > 0) {        int parent = (k - 1) >>> 1;     // 父节点下标（无符号右移避免负数问题）        Object e = es[parent];        if (key.compareTo((T) e) >= 0)   // 比父节点大，找到位置了            break;        es[k] = e;                       // 父节点下沉        k = parent;                      // 继续往上    }    es[k] = key;                         // 放入新元素}
```

逻辑很简单：新元素从底部开始往上走，比父节点小就交换，直到找到该待的位置。

**时间复杂度：O(log n)**

### 2.3 下沉操作：出队元素（siftDown）

出队（`poll`）时，取出堆顶元素（index=0），然后把最后一个元素移到堆顶，**不断跟子节点中较小的那个比较**，如果比子节点大就往下交换——俗称"下沉"或"下滤"。

```
public E poll() {    if (size == 0)        return null;    int s = --size;    modCount++;    E result = (E) queue[0];         // 取堆顶    E x = (E) queue[s];    queue[s] = null;                 // 清空最后一个元素    if (s != 0)        siftDown(0, x);             // 从堆顶开始下沉    return result;}
```

```
private static <T> void siftDownComparable(int k, T x, Object[] es, int n) {    Comparable<? super T> key = (Comparable<? super T>) x;    int half = n >>> 1;              // 非叶子节点的边界    while (k < half) {        int child = (k << 1) + 1;    // 左子节点        Object c = es[child];        int right = child + 1;        if (right < n &&            ((Comparable<? super T>) c).compareTo((T) es[right]) > 0)            c = es[child = right];   // 取左右子节点中较小的那个        if (key.compareTo((T) c) <= 0)  // 比最小的子节点还小，就位            break;        es[k] = c;                   // 子节点上移        k = child;                   // 继续往下走    }    es[k] = key;}
```

这里有一个细节：`half = n >>> 1`。**只需要下沉到最后一个非叶子节点**，因为叶子节点没有子节点可以比较。

`peek()` 就更简单了——直接取 `queue[0]`：

```
public E peek() {    return (size == 0) ? null : (E) queue[0];}
```

**时间复杂度：poll 和 siftDown 都是 O(log n)，peek 是 O(1)**

### 2.4 扩容机制

```
private void grow(int minCapacity) {    int oldCapacity = queue.length;    int newCapacity = oldCapacity + (        oldCapacity < 64 ? oldCapacity + 2 : oldCapacity >> 1    );    // 溢出保护    if (newCapacity - MAX_ARRAY_SIZE > 0)        newCapacity = hugeCapacity(minCapacity);    queue = Arrays.copyOf(queue, newCapacity);}
```

扩容策略分两档：

*   **容量 < 64**：翻倍 + 2（`oldCapacity + oldCapacity + 2`）
    
*   **容量 >= 64**：扩容 50%（`oldCapacity + oldCapacity >> 1`）
    

小容量时翻倍减少扩容次数，大容量时 50% 增长避免浪费空间。这个策略跟 ArrayList 的 `>> 1` 差不多。

### 2.5 建堆（heapify）

PriorityQueue 还有一种构造方式，从一个已有的集合直接建堆：

```
public PriorityQueue(Collection<? extends E> c) {    if (c instanceof SortedSet<?>) {        // 直接取 SortedSet 的比较器    } else if (c instanceof PriorityQueue<?>) {        // 直接取 PriorityQueue 的比较器    } else {        initFromCollection(c);    // 转成数组    }}
```

`initFromCollection` 把集合转成数组后，调用 `heapify()`：

```
private void heapify() {    final Object[] es = queue;    int n = size;    int i = (n >>> 1) - 1;        // 最后一个非叶子节点    for (; i >= 0; i--)        siftDown(i, (E) es[i]);   // 逐个下沉}
```

建堆的经典方法——Floyd 建堆算法。从最后一个非叶子节点开始，逐个做下沉操作，**时间复杂度 O(n)**，比一个个插入的 O(n log n) 快。

**为什么从 n/2 - 1 开始？** 因为数组下标从 0 开始，最后一个非叶子节点下标就是 `(n >>> 1) - 1`。叶子节点不需要下沉。

### 2.6 remove 和迭代器

PriorityQueue 也支持任意位置删除：

```
public boolean remove(Object o) {    int i = indexOf(o);    if (i == -1)        return false;    else {        removeAt(i);        return true;    }}private E removeAt(int i) {    modCount++;    int s = --size;    if (s == i)        queue[i] = null;           // 删的是最后一个元素    else {        E moved = (E) queue[s];        queue[s] = null;        siftDown(i, moved);        // 尝试下沉        if (queue[i] == moved) {   // 没下沉成功            siftUp(i, moved);      // 尝试上浮        }    }}
```

这里有一个精妙的设计：删除中间元素后，用最后一个元素补位，先下沉，如果没动再上浮——因为补位的元素既可能比子节点大（需要下移），也可能比父节点大（不需要动），甚至可能比父节点小（需要上移）？等等——最后一个元素来自堆底，一定比父节点大或等于，所以只需要下沉；但等等，元素被 Comparator 定义的规则决定大小，不一定——所以 JDK 的做法是先下沉，如果没动再上浮，用两次尝试覆盖所有可能性。真是严谨。

PriorityQueue 的迭代器不保证有序遍历，因为数组存的是堆结构而非有序序列：

```
public Iterator<E> iterator() {    return new Itr();}
```

如果想要按优先级顺序遍历全部元素，需要循环 `poll()`。

* * *

## 3\. 使用示例

### 3.1 基础用法：最⼩堆

```
import java.util.PriorityQueue;public class PriorityQueueDemo {    public static void main(String[] args) {        // 默认是小顶堆——最小的元素先出队        PriorityQueue<Integer> pq = new PriorityQueue<>();        pq.offer(5);        pq.offer(1);        pq.offer(9);        pq.offer(3);        pq.offer(7);        System.out.print("优先级出队: ");        while (!pq.isEmpty()) {            System.out.print(pq.poll() + " ");  // 1 3 5 7 9        }        // 输出: 1 3 5 7 9    }}
```

### 3.2 自定义优先级：大顶堆

```
import java.util.PriorityQueue;public class MaxHeapDemo {    public static void main(String[] args) {        // 用 lambda 实现大顶堆——最大的元素先出队        PriorityQueue<Integer> maxHeap =            new PriorityQueue<>((a, b) -> b - a);        maxHeap.offer(5);        maxHeap.offer(1);        maxHeap.offer(9);        maxHeap.offer(3);        System.out.print("大顶堆出队: ");        while (!maxHeap.isEmpty()) {            System.out.print(maxHeap.poll() + " ");  // 9 5 3 1        }    }}
```

### 3.3 实战：任务调度器

```
import java.util.PriorityQueue;class Task implements Comparable<Task> {    String name;    int priority;  // 越大越紧急    Task(String name, int priority) {        this.name = name;        this.priority = priority;    }    @Override    public int compareTo(Task o) {        return Integer.compare(o.priority, this.priority); // 降序=大顶堆    }    @Override    public String toString() {        return "Task{" + name + ", pri=" + priority + "}";    }}public class TaskSchedulerDemo {    public static void main(String[] args) {        PriorityQueue<Task> scheduler = new PriorityQueue<>();        scheduler.offer(new Task("发邮件", 1));        scheduler.offer(new Task("修线上bug", 5));        scheduler.offer(new Task("写周报", 2));        scheduler.offer(new Task("紧急会议", 4));        scheduler.offer(new Task("服务器告警", 5));        System.out.println("=== 任务执行顺序 ===");        while (!scheduler.isEmpty()) {            System.out.println("执行: " + scheduler.poll());        }    }}
```

输出：

```
=== 任务执行顺序 ===执行: Task{修线上bug, pri=5}执行: Task{服务器告警, pri=5}执行: Task{紧急会议, pri=4}执行: Task{写周报, pri=2}执行: Task{发邮件, pri=1}
```

### 3.4 实战：Top-K 问题（最小的 K 个数）

```
import java.util.PriorityQueue;import java.util.Arrays;import java.util.List;public class TopK {    public static List<Integer> smallestK(int[] nums, int k) {        if (k <= 0 || nums.length == 0)            return List.of();        // 用最大堆，只保留最小的 K 个        PriorityQueue<Integer> maxHeap = new PriorityQueue<>((a, b) -> b - a);        for (int num : nums) {            maxHeap.offer(num);            if (maxHeap.size() > k)                maxHeap.poll();  // 把大的弹出去        }        return maxHeap.stream().sorted().toList();    }    public static void main(String[] args) {        int[] nums = {3, 2, 1, 5, 6, 4};        System.out.println("最小的 3 个数: " + smallestK(nums, 3));        // 输出: [1, 2, 3]    }}
```

Top-K 问题用堆解决，时间复杂度 O(n log k)，空间复杂度 O(k)。这是面试高频题，记好了。

* * *

## 4\. 注意事项

### 4.1 ❌ 不允许 null 元素

```
pq.offer(null);  // NullPointerException!
```

因为 `compareTo` 操作无法对 null 进行比较。

### 4.2 ⚠️ 迭代器不保证有序

```
PriorityQueue<Integer> pq = new PriorityQueue<>();pq.addAll(List.of(5, 1, 3, 7, 2));for (int x : pq) {    System.out.print(x + " ");  // 可能不是 1 2 3 5 7}// 实际输出取决于堆的内部结构，完全不可预测
```

要按优先级顺序遍历，请用 `while (!pq.isEmpty()) { pq.poll(); }`。

### 4.3 ⚠️ 修改元素优先级不会触发重排

```
PriorityQueue<Task> pq = new PriorityQueue<>();Task t = new Task("bugfix", 1);pq.offer(t);t.priority = 10;  // 已经加入队列了，PriorityQueue 不知道！pq.offer(new Task("new", 5));Task next = pq.poll();  // 可能是 bugfix 也可能是 new，不确定！
```

**放入 PriorityQueue 的元素应该是不可变的（immutable），或者不要在入队后修改其比较字段。** 如果确实需要修改，先 `remove` 再 `offer`。

### 4.4 🚫 非线程安全

多个线程同时读写 PriorityQueue 会出现数据不一致。并发场景请用 `PriorityBlockingQueue`。

### 4.5 性能考量

操作

时间复杂度

offer (插入)

O(log n)

poll (出队)

O(log n)

peek (查看)

O(1)

remove (任意删除)

O(n) + O(log n)

contains

O(n)

heapify (建堆)

O(n)

*   **适合场景**：频繁取最小/最大元素的场景，比如任务调度、Top-K、Dijkstra 算法
    
*   **不适合场景**：需要频繁遍历全部元素、按索引随机访问、需要按插入顺序遍历
    

### 4.6 容量 vs 大小

`size()` 返回真实元素个数，`queue.length` 是内部数组容量。PriorityQueue 不会自动缩容，如果担心长期占用内存，可以用 `ArrayList` 构造成新的 PriorityQueue。

* * *

## 5\. 对比总结

### PriorityQueue vs TreeSet

特性

PriorityQueue

TreeSet

数据结构

二叉堆（数组）

红黑树

允许重复

✅ 允许

❌ 不允许

peek 最小值

O(1)

O(1)（first()）

插入

O(log n)

O(log n)

有序遍历

❌ 不支持（需 poll）

✅ 支持（迭代器有序）

随机查找

O(n)

O(log n)

**选型建议**：只需要取最值、不需要去重和有序遍历 → PriorityQueue。需要去重、有序遍历、范围查询 → TreeSet。

### PriorityQueue vs TreeMap

PriorityQueue 本质是队列（有头部无尾部遍历），TreeMap 是完整的有序映射。功能上不直接可比，但在需要优先队列的场景，不要用 TreeMap 去模拟——代码会变得非常拧巴。

### PriorityQueue vs 数组排序 vs 手动堆

方案

每次取最小

全量有序

PriorityQueue

O(1) 取，O(log n) 恢复

不支持

Collections.sort

O(n log n) 全排

✅

手写堆

控制力最强

实现复杂

**一句话总结：PriorityQueue 就是 JDK 帮你实现好的「完美二叉堆」，不需要手写，只需要会用。**

* * *

> **思考题**：如果我们要实现一个「动态中位数」——不断插入新数，随时可以获取当前所有数的中位数——用 PriorityQueue 怎么实现？
> 
> 提示：用两个堆，一个大顶堆存较小的一半，一个小顶堆存较大的一半。 （欢迎留言讨论 👋）

* * *

**下期预告：Semaphore——信号量，限流的祖师爷。** 敬请期待！