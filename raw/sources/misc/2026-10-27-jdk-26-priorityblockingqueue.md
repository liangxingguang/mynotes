---
title: 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484689&idx=3&sn=25bc6f50f37be1a1d90714dbd0408f6d&chksm=fe6ca44bc91b2d5dfaf508f16fd3d0e89beccedba6a17d4eb875248f4955ff8a29b04d210df9
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-26-priorityblockingqueue.md
asset_ref: Assets/2026/10/jdk-26-priorityblockingqueue.md
---

# 深度解析 PriorityBlockingQueue — JUC 里的"插队之王"

## 一、类的基本介绍

PriorityBlockingQueue 是 `java.util.concurrent` 包下的一个**无界阻塞队列**，它本质上是 **PriorityQueue 的线程安全版本**。这玩意儿的核心特点是：**元素不是按 FIFO 出队，而是按优先级出队**——优先级最高的元素最先被取出。

看它的继承体系：

```
public class PriorityBlockingQueue<E> extends AbstractQueue<E>    implements BlockingQueue<E>, java.io.Serializable
```

*   实现了 `BlockingQueue` 接口，所以具备阻塞特性——队列为空时 `take()` 会阻塞等待
    
*   底层数据结构是**二叉堆**（binary heap），和 PriorityQueue 一模一样
    
*   线程安全靠的是一把 **ReentrantLock** + 一个 **Condition**，不是 CAS 那套
    

一句话总结：**PriorityQueue + 锁 + 阻塞等待 = PriorityBlockingQueue**。

## 二、核心源码剖析

### 2.1 核心字段

```
// 默认初始容量private static final int DEFAULT_INITIAL_CAPACITY = 11;// 最大数组大小private static final int MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8;// 底层数组，就是个二叉堆private transient Object[] queue;// 元素个数private transient int size;// 比较器，如果元素是 Comparable 就用这个字段可以为 nullprivate transient Comparator<? super E> comparator;// 全局锁 —— 所有操作都抢这一把锁private final ReentrantLock lock;// 阻塞条件：队列非空时通知private final Condition notEmpty;// 用于分配扩容时用的 CAS 自旋private transient volatile int allocationSpinLock;// 仅供序列化用的普通 PriorityQueueprivate PriorityQueue<E> q;
```

关键点：`lock` 是 `ReentrantLock`，`notEmpty` 是它的 Condition。**没有 notFull Condition**——因为它是无界队列，理论上不会"满"（除非内存爆了）。

### 2.2 入队操作 — offer / put

```
public boolean offer(E e) {    if (e == null)        throw new NullPointerException();    final ReentrantLock lock = this.lock;    lock.lock(); // 加锁    int n, cap;    Object[] array;    // 无界队列也可能扩容失败（OOM）    while ((n = size) >= (cap = (array = queue).length))        tryGrow(array, cap); // 扩容    try {        Comparator<? super E> cmp = comparator;        if (cmp == null)            siftUpComparable(n, e, array); // 用 Comparable 上浮        else            siftUpUsingComparator(n, e, array, cmp); // 用 Comparator 上浮        size = n + 1;        notEmpty.signal(); // 通知等待的消费者    } finally {        lock.unlock();    }    return true;}
```

注意 `offer` 返回 `true` 是铁定的——无界队列永远不会因为容量满返回 false（除非 OOM）。`put` 方法直接调的就是 `offer`，因为不会阻塞。

### 2.3 扩容机制 — tryGrow

```
private void tryGrow(Object[] array, int oldCap) {    lock.unlock(); // 先释放锁，避免扩容时阻塞其他读写    Object[] newArray = null;    // CAS 抢扩容令牌，防止多个线程同时扩容    if (allocationSpinLock == 0 &&        UNSAFE.compareAndSwapInt(this, allocationSpinLockOffset,                                 0, 1)) {        try {            int newCap = oldCap + ((oldCap < 64) ?                                   (oldCap + 2) : // 小容量：+2                                   (oldCap >> 1)); // 大容量：1.5 倍            if (newCap > MAX_ARRAY_SIZE) {                if (oldCap >= MAX_ARRAY_SIZE)                    throw new OutOfMemoryError();                newCap = MAX_ARRAY_SIZE;            }            if (newCap > oldCap && queue == array)                newArray = new Object[newCap];        } finally {            allocationSpinLock = 0; // 释放扩容锁        }    }    if (newArray == null)        Thread.yield(); // 其他线程在扩容，让出 CPU    lock.lock(); // 重新拿锁    if (newArray != null && queue == array) {        queue = newArray;        System.arraycopy(array, 0, newArray, 0, oldCap); // 数据拷贝    }}
```

这是我个人觉得 PriorityBlockingQueue 最巧妙的设计之一：

1.  **扩容时释放主锁** — 避免扩容期间阻塞其他线程的读写
    
2.  **CAS + allocationSpinLock** — 保证只有一个线程扩容
    
3.  拿不到扩容令牌的线程直接 **yield** 让出 CPU
    

扩容策略也很朴实：元素少于 64 时每次只加 2（小步快跑），超过 64 后按 1.5 倍扩容（飞起来）。

### 2.4 出队操作 — take / poll

```
public E take() throws InterruptedException {    final ReentrantLock lock = this.lock;    lock.lockInterruptibly(); // 可中断加锁    try {        while (size == 0)            notEmpty.await(); // 队列为空就阻塞        return dequeue(); // 取出堆顶    } finally {        lock.unlock();    }}private E dequeue() {    int n = size - 1;    if (n < 0)        return null;    Object[] array = queue;    E result = (E) array[0]; // 堆顶即优先级最高的元素    E x = (E) array[n];      // 最后一个元素    array[n] = null;        // 避免内存泄漏    Comparator<? super E> cmp = comparator;    if (cmp == null)        siftDownComparable(0, x, array, n); // 下沉调整堆    else        siftDownUsingComparator(0, x, array, n, cmp);    size = n;    return result;}
```

`poll()` 和 `take()` 的区别就是：前者不阻塞，没数据直接返回 null；后者会一直等到有数据为止。

### 2.5 二叉堆的上浮与下沉

**上浮（siftUp）— 入队时用：**

```
private static <T> void siftUpComparable(int k, T x, Object[] array) {    Comparable<? super T> key = (Comparable<? super T>) x;    while (k > 0) {        int parent = (k - 1) >>> 1; // 父节点索引        Object e = array[parent];        if (key.compareTo((T) e) >= 0)            break; // 比父节点大/相等，停        array[k] = e; // 把父节点往下挪        k = parent;   // 继续往上走    }    array[k] = key;}
```

**下沉（siftDown）— 出队时用：**

```
private static <T> void siftDownComparable(int k, T x, Object[] array,                                           int n) {    if (n > 0) {        Comparable<? super T> key = (Comparable<? super T>) x;        int half = n >>> 1; // 叶子节点的起始位置        while (k < half) {            int child = (k << 1) + 1; // 左子节点            Object c = array[child];            int right = child + 1;            if (right < n &&                ((Comparable<? super T>) c).compareTo((T) array[right]) > 0)                c = array[child = right]; // 取左右中较小的            if (key.compareTo((T) c) <= 0)                break;            array[k] = c;            k = child;        }        array[k] = key;    }}
```

这两段逻辑和 `PriorityQueue` 完全一样。二叉堆的核心思想就是：

*   **入队**：插到尾部，不断跟父节点比，比父小就往上窜（小顶堆）
    
*   **出队**：取出堆顶，把尾部元素移到堆顶，然后不断跟子节点比，往小了沉
    

时间复杂度 O(log n)，没法更优了。

## 三、核心原理

### 数据结构：二叉堆

PriorityBlockingQueue 底层是个**小顶堆**（min-heap），用数组存储。`queue[0]` 永远是优先级最高的元素。父节点下标为 `(i-1)/2`，左右子节点分别是 `2i+1` 和 `2i+2`。

元素必须实现 `Comparable` 接口，或者在构造时传入 `Comparator`。

### 线程安全机制

机制

说明

**ReentrantLock**

所有读写操作都持这把锁，保证互斥

**CAS + allocationSpinLock**

专用于扩容时的并发控制，避免扩容期间阻塞其他操作

**Condition (notEmpty)**

消费者队列为空时阻塞，生产者入队后 signal 唤醒

**volatile (allocationSpinLock)**

CAS 操作的目标，保证可见性

### 为什么不用 CAS 做所有事？

PriorityBlockingQueue 的核心操作是二叉堆的 `siftUp`/`siftDown`，涉及**多个数组元素的读写**，用 CAS 做这件事复杂度过高。所以 Doug Lea 选择了朴实无华的全互斥锁 + 一个巧妙的分阶段扩容设计。

## 四、使用示例

### 示例 1：基础用法 — 按自然顺序

```
import java.util.concurrent.PriorityBlockingQueue;public class PriorityBlockingQueueDemo {    public static void main(String[] args) throws InterruptedException {        PriorityBlockingQueue<Integer> queue = new PriorityBlockingQueue<>();        // 生产者        new Thread(() -> {            for (int i : new int[]{5, 1, 9, 3, 7}) {                queue.offer(i);                System.out.println("入队: " + i);            }        }).start();        Thread.sleep(100); // 等生产完        // 消费者 — 按优先级出队！        System.out.println("出队顺序：");        while (!queue.isEmpty()) {            System.out.print(queue.poll() + " ");        }        // 输出: 1 3 5 7 9  （小顶堆，最小的先出）    }}
```

### 示例 2：自定义优先级 — 任务调度

```
import java.util.concurrent.PriorityBlockingQueue;public class TaskSchedulerDemo {    static class Task implements Comparable<Task> {        String name;        int priority; // 1=最高, 5=最低        Task(String name, int priority) {            this.name = name;            this.priority = priority;        }        @Override        public int compareTo(Task o) {            return Integer.compare(this.priority, o.priority);        }        public void execute() {            System.out.println("执行: " + name + " (优先级=" + priority + ")");        }    }    public static void main(String[] args) throws InterruptedException {        PriorityBlockingQueue<Task> queue = new PriorityBlockingQueue<>();        queue.offer(new Task("普通日志", 5));        queue.offer(new Task("用户支付", 1));        queue.offer(new Task("发送通知", 3));        queue.offer(new Task("数据备份", 4));        queue.offer(new Task("系统告警", 1));        // 优先级高的任务先执行        while (!queue.isEmpty()) {            queue.take().execute();        }        // 输出:        // 执行: 用户支付 (优先级=1)        // 执行: 系统告警 (优先级=1)   <-- 同优先级按 FIFO 不保证        // 执行: 发送通知 (优先级=3)        // 执行: 数据备份 (优先级=4)        // 执行: 普通日志 (优先级=5)    }}
```

### 示例 3：阻塞消费者 + 延迟生产

```
import java.util.concurrent.PriorityBlockingQueue;import java.util.concurrent.TimeUnit;public class BlockingDemo {    public static void main(String[] args) {        PriorityBlockingQueue<String> queue = new PriorityBlockingQueue<>();        // 消费者 — 队列为空时阻塞        Thread consumer = new Thread(() -> {            try {                System.out.println("消费者启动，等待任务...");                String task = queue.take(); // 这里会阻塞！                System.out.println("拿到任务: " + task);                task = queue.poll(3, TimeUnit.SECONDS); // 支持超时                System.out.println("超时poll结果: " + task);            } catch (InterruptedException e) {                Thread.currentThread().interrupt();            }        });        consumer.start();        // 3秒后才生产        try { Thread.sleep(1000); } catch (InterruptedException e) {}        System.out.println("3秒后生产者入队...");        queue.offer("紧急任务-A");    }}
```

## 五、注意事项与避坑指南

### 5.1 大小端视图不是有序的！

这是最大的坑。很多人以为 `PriorityBlockingQueue` 的迭代器会按优先级顺序遍历，**大错特错**。

```
PriorityBlockingQueue<Integer> q = new PriorityBlockingQueue<>();for (int i : new int[]{5, 1, 9, 3, 7}) q.offer(i);// 迭代遍历：不是 1 3 5 7 9，而是数组的物理顺序！for (int v : q) System.out.print(v + " ");// 输出可能是: 1 3 9 5 7
```

要按优先级顺序遍历，只能不断 `poll()`。

### 5.2 元素不可变

放到队列里的元素**不能改变其优先级相关的属性**。如果你改了元素的 compareTo 值，堆结构就乱套了。常见解决办法是从队列中取出再重新放入。

### 5.3 无界不等于不 OOM

PriorityBlockingQueue 没有容量上限，但如果生产者速度远超消费者，堆内存终究会爆。实际使用时建议监控队列大小。

### 5.4 null 元素不允许

任何时候传 null 都会抛出 `NullPointerException`。

### 5.5 性能考量

操作

时间复杂度

说明

offer/put

O(log n)

二叉堆上浮

take/poll

O(log n)

二叉堆下沉

peek

O(1)

只看堆顶不取出

size

O(1)

直接读 size 字段

contains

O(n)

遍历搜索，慢

由于所有操作都加锁，高并发场景下锁竞争可能成为瓶颈。纯读操作（如 `peek`、`size`）也被了一把锁，算是个小遗憾。

## 六、对比总结

### PriorityBlockingQueue vs PriorityQueue

维度

PriorityQueue

PriorityBlockingQueue

线程安全

❌ 非线程安全

✅ 线程安全

阻塞特性

❌ 不支持

✅ 支持 take/poll(timeout)

底层机制

无锁

ReentrantLock + Condition

扩容

简单扩容

分阶段扩容（释放锁+CAStokens）

适用场景

单线程

多线程生产者-消费者

### PriorityBlockingQueue vs 其他 BlockingQueue

队列

排序依据

容量

阻塞条件

**PriorityBlockingQueue**

元素优先级

无界

队列空时阻塞

LinkedBlockingQueue

FIFO

可选有界

空/满时阻塞

ArrayBlockingQueue

FIFO

有界

空/满时阻塞

DelayQueue

延迟时间

无界

不到期不能取

SynchronousQueue

—

0

必须一手交一手接

### 使用场景总结

*   **任务调度**：高优先级任务先执行
    
*   **紧急消息处理**：告警、支付等需要优先处理的消息
    
*   **Dijkstra 最短路径等算法**：需要按距离/权重取节点的场景
    
*   **TOP-K 问题**：结合有限大小的堆解决
    

PriorityBlockingQueue 不是 JUC 里最快的队列，但它解决了一个独特的问题——**如何在多线程场景下按优先级消费**。底层原理并不复杂：二叉堆 + 一把锁 + 一个 Condition，就这么朴实无华。但那个"扩容时释放锁"的设计，我觉得是它最有技术含量的地方——体现了 Doug Lea 对并发性能的极致追求。

* * *

_如果你正在写一个需要按优先级处理任务的多线程系统，PriorityBlockingQueue 极其适合你。如果再搭配 ThreadPoolExecutor 的定制 ThreadFactory，简直绝配。_
