你好，又见面了。今天我们来啃 ArrayBlockingQueue——**JUC 包中最经典、也最直观的阻塞队列实现**。

说它经典，是因为它底层就是一个普通的循环数组，所有的阻塞和唤醒行为都在一把全局锁上完成。没有晦涩的 CAS 自旋，没有复杂的分段设计。如果你能看懂 ArrayBlockingQueue，就可以更轻松地理解后面的 LinkedBlockingQueue、PriorityBlockingQueue 甚至 DelayQueue。

## 一、类的基本介绍

**所在包**：`java.util.concurrent`

**继承体系**：

```
Object  └─ AbstractCollection<E>       └─ AbstractQueue<E>            └─ ArrayBlockingQueue<E>  →  implements BlockingQueue<E>, Serializable
```

**核心作用**：一个由**数组支持的有界阻塞队列**。FIFO 顺序（先进先出）。创建时必须指定容量，容量不能再变。

**BlockingQueue 接口定义了四组操作方法，按处理策略分为三类：**

操作

抛异常

返回特殊值

阻塞等待

超时退出

插入

`add(e)`

`offer(e)`

`put(e)`

`offer(e, time, unit)`

移除

`remove()`

`poll()`

`take()`

`poll(time, unit)`

检查

`element()`

`peek()`

不支持

不支持

ArrayBlockingQueue 实现了这全套方法。`put()` 和 `take()` 是会阻塞的，这是它与一般队列的最大区别。

## 二、核心源码分析

### 2.1 数据结构

```
// 存储元素的数组——循环数组！final Object[] items;// 下一个 take/poll/remove 操作的索引（队头）int takeIndex;// 下一个 put/offer/add 操作的索引（队尾）int putIndex;// 当前队列中元素的数量int count;// 全局可重入锁，所有操作共享这一把锁final ReentrantLock lock;// 等待 take 操作的条件队列（空了就等着）private final Condition notEmpty;// 等待 put 操作的条件队列（满了就等着）private final Condition notFull;
```

这个结构很干净。`items` 是定长数组，`takeIndex` 和 `putIndex` 在上面不断循环前进。当 `count == items.length` 时队列满，`count == 0` 时队列空。

关键思想就一句话：**数据结构上就是个循环数组，并发控制上就一把锁+两个条件变量**。简单但直击痛点。

### 2.2 构造方法

```
public ArrayBlockingQueue(int capacity, boolean fair) {    if (capacity <= 0)        throw new IllegalArgumentException();    this.items = new Object[capacity];    // fair 控制锁是否公平，true 则按等待时间顺序获取锁    lock = new ReentrantLock(fair);    notEmpty = lock.newCondition();    notFull =  lock.newCondition();}
```

注意 `fair` 参数。如果设为 `true`，锁是公平的——那么多个生产者（put 线程）或消费者（take 线程）将按照等待时间顺序获得执行机会。但这会牺牲一些吞吐量，默认是 `false`。

另外，构造时还可以传入已有集合初始化：

```
public ArrayBlockingQueue(int capacity, boolean fair, Collection<? extends E> c) {    // ... 先构造，然后遍历填充 items，最后设置 count 和 putIndex}
```

### 2.3 put 方法——生产，满了就等

```
public void put(E e) throws InterruptedException {    // 不接受 null 元素    Objects.requireNonNull(e);    final ReentrantLock lock = this.lock;    // 加锁——可响应中断    lock.lockInterruptibly();    try {        // 经典 while 循环——防止虚假唤醒        while (count == items.length)            notFull.await();  // 满了，等消费者来 take        enqueue(e);           // 不满，开始入队    } finally {        lock.unlock();    }}
```

`lockInterruptibly()` 使得线程在等待锁的过程中可以被中断。这一点在 **cancel 任务或关闭线程池时** 特别重要——如果你的线程在 `put()` 上死等，外界可以中断它。

### 2.4 enqueue——真正的入队操作

```
private void enqueue(E x) {    final Object[] items = this.items;    items[putIndex] = x;           // 放进队尾位置    if (++putIndex == items.length) // 循环：如果到末尾了，回到 0        putIndex = 0;    count++;                       // 元素计数加 1    notEmpty.signal();             // 通知消费者：有货了！}
```

**注意 `putIndex` 的循环处理**：`++putIndex == items.length` 时就置为 0。这就是典型的**循环数组**实现，不需要真正的删除和移动，只是覆盖旧值。

### 2.5 take 方法——消费，空了就等

```
public E take() throws InterruptedException {    final ReentrantLock lock = this.lock;    lock.lockInterruptibly();    try {        while (count == 0)            notEmpty.await();  // 空了，等生产者来 put        return dequeue();    } finally {        lock.unlock();    }}
```

跟 put 完全对称，不多说，直接看 dequeue：

### 2.6 dequeue——真正的出队操作

```
private E dequeue() {    final Object[] items = this.items;    @SuppressWarnings("unchecked")    E x = (E) items[takeIndex];   // 取出队头元素    items[takeIndex] = null;      // 置空，帮助 GC    if (++takeIndex == items.length) // 循环        takeIndex = 0;    count--;    // 迭代器一致性需要，看下面注意事项    if (itrs != null)        itrs.elementDequeued();    notFull.signal();             // 通知生产者：有位置了！    return x;}
```

取出后将对应位置置 `null`——这样数组里已取出的元素不会阻止 GC。然后 `takeIndex` 同样循环前进。

**put 和 take 的对称性**是 ArrayBlockingQueue 最美丽的设计。`put` 满时等 `notFull`，成功时唤 `notEmpty`；`take` 空时等 `notEmpty`，成功时唤 `notFull`。完美闭环。

### 2.7 offer 与 poll——带超时版本

```
public boolean offer(E e, long timeout, TimeUnit unit)    throws InterruptedException {    Objects.requireNonNull(e);    long nanos = unit.toNanos(timeout);    final ReentrantLock lock = this.lock;    lock.lockInterruptibly();    try {        while (count == items.length) {            if (nanos <= 0) return false;  // 超时了还不满？直接返回            nanos = notFull.awaitNanos(nanos); // 等 nanos 纳秒        }        enqueue(e);        return true;    } finally {        lock.unlock();    }}
```

`awaitNanos(nanos)` 返回的是**剩余等待时间**，如果 `nanos <= 0` 说明超时了。这个模式在 JUC 中大量使用，是超时等待的标准写法。

## 三、核心原理

### 单锁设计 vs 分段锁

ArrayBlockingQueue 用的是一把全局锁 + 两个 Condition。**所有 put、take、offer、poll、peek、size、clear 等操作都用同一把锁**。

这意味着：

*   **任何时候**只有一个线程能访问队列（无论是读还是写）
    
*   吞吐量受限于锁竞争程度
    
*   代码逻辑极其清晰，容易理解
    

与它对比的是 LinkedBlockingQueue，后者使用**两把锁**（`takeLock` 和 `putLock`）——这得益于链表结构天然可分离队头队尾的原子操作。ArrayBlockingQueue 的数组结构决定了它无法这样分离（入队和出队可能访问同一个数组位置），所以只能拥抱单锁设计。

### 虚假唤醒（Spurious Wakeup）

看 put 和 take 的代码，都用了 `while` 循环而不是 `if`：

```
while (count == items.length)    notFull.await();
```

**为什么不用 if？** 因为在某些操作系统上，`await()` 可能在条件未满足时就返回了（称为虚假唤醒）。用 `while` 循环重新检查，确保了即使被虚假唤醒，也会重新进入等待，而不是在错误的状态下执行入队/出队操作。

这是一个**并发编程里的经典模式**，面试常考。

## 四、使用示例

来个完整的示例——模拟经典的生产者-消费者：

```
import java.util.concurrent.ArrayBlockingQueue;import java.util.concurrent.BlockingQueue;import java.util.concurrent.ExecutorService;import java.util.concurrent.Executors;import java.util.concurrent.TimeUnit;public class ArrayBlockingQueueDemo {    // 队列容量为 5，公平锁    private static final BlockingQueue<Integer> queue =            new ArrayBlockingQueue<>(5, true);    static class Producer implements Runnable {        private final String name;        private int counter;        Producer(String name) { this.name = name; }        @Override        public void run() {            try {                while (!Thread.currentThread().isInterrupted()) {                    int value = ++counter;                    // put 方法会阻塞，直到有空位                    queue.put(value);                    System.out.printf("[%s] 生产: %d，队列大小: %d%n",                            name, value, queue.size());                    TimeUnit.MILLISECONDS.sleep(800);                }            } catch (InterruptedException e) {                System.out.printf("[%s] 被中断，停止生产%n", name);                Thread.currentThread().interrupt();            }        }    }    static class Consumer implements Runnable {        private final String name;        Consumer(String name) { this.name = name; }        @Override        public void run() {            try {                while (!Thread.currentThread().isInterrupted()) {                    // take 方法会阻塞，直到有元素                    Integer value = queue.take();                    System.out.printf("[%s] 消费: %d，队列大小: %d%n",                            name, value, queue.size());                    // 消费者消费得慢一点，模拟处理耗时                    TimeUnit.MILLISECONDS.sleep(1200);                }            } catch (InterruptedException e) {                System.out.printf("[%s] 被中断，停止消费%n", name);                Thread.currentThread().interrupt();            }        }    }    public static void main(String[] args) throws InterruptedException {        ExecutorService pool = Executors.newCachedThreadPool();        // 2 个生产者，3 个消费者        pool.execute(new Producer("生产者-1"));        pool.execute(new Producer("生产者-2"));        pool.execute(new Consumer("消费者-1"));        pool.execute(new Consumer("消费者-2"));        pool.execute(new Consumer("消费者-3"));        // 运行 10 秒后关闭        TimeUnit.SECONDS.sleep(10);        pool.shutdownNow();        System.out.println("主线程结束");    }}
```

运行一下看看效果：

```
[生产者-1] 生产: 1，队列大小: 1[生产者-2] 生产: 1，队列大小: 2[消费者-1] 消费: 1，队列大小: 1[生产者-1] 生产: 2，队列大小: 2[生产者-2] 生产: 2，队列大小: 3[消费者-2] 消费: 1，队列大小: 2[消费者-3] 消费: 2，队列大小: 1[生产者-1] 生产: 3，队列大小: 2...
```

因为用了公平锁，会发现消费者和生产者轮流执行，有一种"世界充满爱"的公平感。

## 五、注意事项

### 5.1 不使用哨兵元素，数组元素可以为 null

这是 ArrayBlockingQueue 和 LinkedBlockingQueue 的一个隐蔽差异。ArrayBlockingQueue 使用 `null` 表示"该位置没有元素"（dequeue 时置 null）。但 ArrayBlockingQueue 拒绝 `null` 元素，所以 null 只能用来标识空位。

LinkedBlockingQueue 则不同——它使用了**哨兵节点**，链表头尾节点不存实际数据。

### 5.2 size() 是常数时间

```
public int size() {    final ReentrantLock lock = this.lock;    lock.lock();    try {        return count;    } finally {        lock.unlock();    }}
```

因为 `count` 变量在每次 enqueue/dequeue 时同步更新，`size()` 直接返回 `count` 即可。但注意——这个方法也要加锁！虽然看起来只是返回一个 int，但**为了保证 happens-before 关系**，必须通过锁来保证读到的 count 是最新的。

### 5.3 迭代器是弱一致性的

ArrayBlockingQueue 返回的 `Iterator` 是**弱一致性**的——它允许在迭代过程中修改队列，不会抛 `ConcurrentModificationException`。但它不保证一定能看到全部元素：

```
// 遍历时不会抛异常for (Integer item : queue) {    // 此时其他线程可以修改队列}
```

### 5.4 drainTo 批量取，比一个个 poll 高效

```
List<Integer> batch = new ArrayList<>();queue.drainTo(batch, 100);  // 一次取走最多 100 个
```

`drainTo` 内部也是加锁的，但一次性把符合条件的元素全转移到目标集合，**比循环 poll 少了很多次加锁解锁 + 条件检查的开销**。

### 5.5 不适合大规模数据

ArrayBlockingQueue 的容量是固定的（构造时指定），不能扩容。如果生产速度长期大于消费速度，队列满了之后生产者就会全部阻塞。这可能导致**线程饥饿**甚至**死锁**——比如在线程池里，如果所有核心线程都卡在 `put()` 上，整个系统就僵住了。

## 六、对比总结

特性

ArrayBlockingQueue

LinkedBlockingQueue

SynchronousQueue

底层结构

循环数组

单向链表

无内部容量

是否有界

必须有界

可选有界/无界

容量为 0

锁数量

1 把

2 把（takeLock + putLock）

使用 CAS / 转移者模式

内存分配

提前分配好，GC 友好

每次插入都 new Node

无数据存储

公平性

支持 fair 参数

不支持

支持 fair 参数

吞吐量

< LinkedBlockingQueue

中

极高（但场景不同）

典型场景

有界缓冲、流量削峰

任务队列（线程池）

线程间直接交换数据

**说说我的个人理解**：

很多人一看到 ArrayBlockingQueue 觉得"一手交钱一手交货"太简单。但其实它恰恰是 JUC 里最优质的入门教材——把**锁 + 条件变量 + 循环数组**三个核心知识点糅在一起，干净利落地解决了一个实际问题。

**我用它也踩过坑**。之前做一个 IM 的消息推送中间件，用 ArrayBlockingQueue 做缓冲队列，容量设了 10000。高峰期生产端瞬间堆积几万条消息，队列满了之后 `put()` 把生产者全阻塞了，消费者又因为业务逻辑复杂处理不过来。结果是**生产者和消费者互相等**，差点把整个服务搞死。后来改成用 `offer(e, timeout, unit)` 配合降级策略——超时还没发出去就直接丢弃，保证系统不崩溃。

**容量的选择是个艺术**：太大浪费内存（但 ArrayBlockingQueue 的数组是固化的，不存在扩容开销），太小吞吐量跟不上。通常我会设为**峰值 QPS × 可容忍的延迟秒数 × 1.5**。

> **下期预告**：LinkedBlockingQueue——用两把锁实现的链式阻塞队列，跟 ArrayBlockingQueue 大不一样，敬请期待。

* * *

> 配图区：本文参考了 Oracle 官方 JavaDoc 以及 OpenJDK 源码（jdk8u/master 分支），源码版本为 JDK 8u。 在线源码参考：https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/classes/java/util/concurrent/ArrayBlockingQueue.java\[1\]

### 引用链接

\[1\]_https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/classes/java/util/concurrent/ArrayBlockingQueue.java_