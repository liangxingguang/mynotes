---
title: 深度剖析 SynchronousQueue — 零容量的神奇队列
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484705&idx=2&sn=04702b3898086b5770b4399e97ff53dc&chksm=fe6ca47bc91b2d6de1b5c0408572221426d758e764390f864585669628c832163e1c026030c2
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-28-synchronousqueue.md
asset_ref: Assets/2026/10/jdk-28-synchronousqueue.md
---

# 深度剖析 SynchronousQueue — 零容量的神奇队列

## 一、类的基本介绍

SynchronousQueue 是 `java.util.concurrent` 包下的一个**阻塞队列**，但它有个极其特殊的属性：**容量为 0**。

```
public class SynchronousQueue<E> extends AbstractQueue<E>    implements BlockingQueue<E>, java.io.Serializable
```

是的，你没看错——容量为 0。这意味着 SynchronousQueue 内部**不能存储任何元素**。就像一个「传送带上的交换站」：一个线程把物品放上去，必须等另一个线程立刻取走，物品在传输过程中从不停留。

这个设计听起来反直觉，但它的作用非常大：**直接在线程之间传递数据**，没有中间缓冲。这也是为什么 `Executors.newCachedThreadPool()` 内部用的就是 SynchronousQueue——它希望任务来了就立即有线程接手，不排队等待。

### 核心特性一览

特性

说明

**容量**

0，永远为0

**数据结构**

两种模式：公平模式（TransferQueue）和非公平模式（TransferStack）

**线程安全**

基于 CAS + LockSupport 实现，完全无锁

**阻塞机制**

使用 park/unpark 等待和唤醒

**是否允许 null**

不允许，put(null) 会抛 NPE

用大白话说：SynchronousQueue 就是一个「一手交钱、一手交货」的交换通道，没有库存、没有缓存。

* * *

## 二、核心源码剖析

SynchronousQueue 的源码非常巧妙，整体设计采用了一种**模板方法模式 + 双数据结构**的策略。

### 2.1 两种模式的选择

```
// 构造方法，决定公平模式还是非公平模式public SynchronousQueue() {    this(false); // 默认非公平模式}public SynchronousQueue(boolean fair) {    // fair=true 用 TransferQueue，fair=false 用 TransferStack    transferer = fair ? new TransferQueue<E>() : new TransferStack<E>();}
```

这里非常有意思：**同一个接口（Transferer）有两种不同的实现**。默认的非公平模式使用 TransferStack，而公平模式使用 TransferQueue。

### 2.2 核心交换机制 — Transferer

```
abstract static class Transferer<E> {    /**     * 执行 put 或 take 操作     * @param e 如果非空，表示 put（生产者）；如果为空，表示 take（消费者）     * @param timed 是否超时     * @param nanos 超时时间（纳秒）     * @return 如果 put 返回非空；如果 take 返回取到的值     */    abstract E transfer(E e, boolean timed, long nanos);}
```

一个 `transfer` 方法同时支持 put 和 take！通过参数 `e` 是否为 null 来区分角色。这就是 SynchronousQueue 设计的精妙之处——减少方法分派，核心逻辑高度内聚。

### 2.3 非公平模式 — TransferStack（默认，也是重点）

```
static final class TransferStack<E> extends Transferer<E> {    // 栈顶节点    volatile SNode head;    // 节点类型    static final int REQUEST    = 0; // 消费者（take）    static final int DATA       = 1; // 生产者（put）    static final int FULFILLING = 2; // 配对中（正在完成匹配）    static final class SNode {        volatile SNode next;    // 栈的下一个节点        volatile SNode match;   // 配对的节点        volatile Thread waiter; // 等待的线程（用于 unpark）        Object item;            // 数据或 null        int mode;               // REQUEST | DATA | FULFILLING    }    @SuppressWarnings("unchecked")    E transfer(E e, boolean timed, long nanos) {        SNode s = null;        int mode = (e == null) ? REQUEST : DATA;        for (;;) { // 自旋 CAS，经典的无锁并发循环            SNode h = head;            if (h == null || h.mode == mode) {                 // case 1: 栈为空，或者栈顶节点与当前操作模式相同                // 说明没有可以配对的节点，把自己入栈并等待                if (timed && nanos <= 0) {                    return null; // 非阻塞操作，直接返回                }                if (s == null) s = new SNode(e);                // CAS 入栈（头插法）                if (casHead(h, s)) {                    // 入栈成功，等待被配对                    SNode m = awaitFulfill(s, timed, nanos);                    if (m == s) { // 被取消了                        clean(s);                        return null;                    }                    // 配对成功，唤醒搭档                    if ((h = head) != null && h.next == s)                        casHead(h, s.next);                    return (E) ((mode == REQUEST) ? m.item : s.item);                }            } else if (!isFulfilling(h.mode)) {                 // case 2: 栈顶节点与当前模式不同且不在配对中                // 说明找到可以配对的节点了，尝试配对                if (s == null) s = new SNode(e);                s.next = h; // 指向栈顶                // CAS 将自身设为 FULFILLING 模式的节点                if (casHead(h, s)) {                    // 尝试与栈顶节点配对                    SNode mn = h.match;                    if (mn == null) {                        if (casMatch(h, null, s)) {                            // 配对成功！唤醒等待的线程                            LockSupport.unpark(h.waiter);                            // 将配对的两个节点一起弹出栈                            casHead(s, s.next);                            return (E) ((mode == REQUEST) ? h.item : e);                        }                    }                }            } else {                 // case 3: 栈顶节点正在帮助别人配对                // 按照 Treiber 栈的惯例，帮助完成配对后弹出节点                SNode m = h.next;                if (head == h) {                    casHead(h, m);                }            }        }    }}
```

这段代码我第一次看的时候也绕了半天，但核心逻辑其实就三个分支：

1.  **栈空或同类节点** → 我入栈等着
    
2.  **遇到不同类节点** → 尝试配对，配对成功唤醒对方
    
3.  **有人在配对中** → 我帮一把，加速完成
    

这其实就是经典的 **Treiber 栈** + **配对FULFILLING标记** 的算法，用无锁的方式实现了生产者-消费者匹配。

### 2.4 等待机制 — awaitFulfill

```
SNode awaitFulfill(SNode s, boolean timed, long nanos) {    long lastTime = timed ? System.nanoTime() : 0;    Thread w = Thread.currentThread();    // 计算自旋次数，根据 CPU 核数决定    int spins = shouldSpin(s) ? (timed ? maxTimedSpins : maxUntimedSpins) : 0;        for (;;) {        if (w.isInterrupted()) {            // 线程被中断，尝试取消            s.tryCancel();        }        SNode m = s.match;        if (m != null) // 配对成功            return m;        if (timed) {            long now = System.nanoTime();            nanos -= now - lastTime;            lastTime = now;            if (nanos <= 0) { // 超时                s.tryCancel();                continue;            }        }        if (spins > 0) {            // 先自旋一会儿，避免立即 park 的开销            spins = shouldSpin(s) ? (spins - 1) : 0;        } else if (s.waiter == null) {            s.waiter = w; // 记录等待线程        } else {            // 自旋完了还没配对成功，就 park 阻塞等待            LockSupport.park(this);        }    }}
```

这里有个很值得学习的优化技巧：**自旋等待**。线程不会一上来就 park（阻塞），而是先自旋一小段时间。因为 SynchronousQueue 的配对通常很快，自旋可以避免线程上下文切换的巨大开销。只有自旋了一定次数还没配对成功，才会真的 park。

这就像两个人约好在地铁站碰面——先四处张望一会儿（自旋），实在找不到再打电话问对方在哪（park）。

* * *

## 三、公平模式 TransferQueue

公平模式下，SynchronousQueue 使用了一个队列（Queue），而不是栈。这意味着等待的线程是**先来先服务**的。

```
static final class TransferQueue<E> extends Transferer<E> {    transient volatile QNode head;  // 头节点    transient volatile QNode tail;  // 尾节点    static final class QNode {        volatile QNode next;        volatile Object item;       // 数据        volatile Thread waiter;     // 等待线程        final boolean isData;       // 是生产者还是消费者    }}
```

核心区别：

*   **TransferStack（非公平）**：LIFO 后进先出，后来的线程先配对，吞吐量更高
    
*   **TransferQueue（公平）**：FIFO 先进先出，先等待的线程先配对，公平但不一定更快
    

两种模式各有适用场景。默认用 TransferStack 是因为它的吞吐量往往更好——新来的线程更「热」，CPU 缓存命中率更高。

* * *

## 四、完整使用示例

来看个实际可运行的例子，模拟「生产者-消费者」场景：

```
import java.util.concurrent.SynchronousQueue;import java.util.concurrent.Executors;import java.util.concurrent.ExecutorService;import java.util.concurrent.TimeUnit;public class SynchronousQueueDemo {    static class Producer implements Runnable {        private final SynchronousQueue<String> queue;        private final String name;        Producer(SynchronousQueue<String> queue, String name) {            this.queue = queue;            this.name = name;        }        @Override        public void run() {            for (int i = 1; i <= 3; i++) {                String data = name + "-数据-" + i;                try {                    System.out.println(name + " 正在交付: " + data);                    // put 会阻塞直到有消费者来取                    queue.put(data);                    System.out.println(name + " 交付完成: " + data);                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            }        }    }    static class Consumer implements Runnable {        private final SynchronousQueue<String> queue;        private final String name;        Consumer(SynchronousQueue<String> queue, String name) {            this.queue = queue;            this.name = name;        }        @Override        public void run() {            for (int i = 1; i <= 3; i++) {                try {                    System.out.println(name + " 正在等待接收...");                    // take 会阻塞直到有数据到来                    String data = queue.take();                    System.out.println(name + " 收到: " + data);                    TimeUnit.SECONDS.sleep(1); // 模拟处理耗时                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            }        }    }    public static void main(String[] args) throws InterruptedException {        SynchronousQueue<String> queue = new SynchronousQueue<>(true); // 公平模式        ExecutorService pool = Executors.newCachedThreadPool();        // 先启动消费者        pool.submit(new Consumer(queue, "消费者1"));        pool.submit(new Consumer(queue, "消费者2"));        TimeUnit.SECONDS.sleep(1);        // 再启动生产者        pool.submit(new Producer(queue, "生产者A"));        pool.submit(new Producer(queue, "生产者B"));        pool.shutdown();        pool.awaitTermination(10, TimeUnit.SECONDS);        System.out.println(" === 队列是否为空: " + queue.isEmpty() + " ===");        System.out.println("SynchronousQueue 容量永远是: " + queue.size());        // size() 永远返回 0    }}
```

运行结果大概是这样（由于线程调度会有变化）：

```
消费者1 正在等待接收...消费者2 正在等待接收...生产者A 正在交付: 生产者A-数据-1生产者A 交付完成: 生产者A-数据-1消费者1 收到: 生产者A-数据-1生产者A 正在交付: 生产者A-数据-2生产者B 正在交付: 生产者B-数据-1生产者B 交付完成: 生产者B-数据-1消费者2 收到: 生产者B-数据-1...
```

注意观察：每次 `put` 和 `take` 的调用都是**成对出现**的——没有数据会积压在队列里。

* * *

## 五、实际应用场景

### 5.1 newCachedThreadPool

SynchronousQueue 最经典的应用就是 `Executors.newCachedThreadPool()`：

```
public static ExecutorService newCachedThreadPool() {    return new ThreadPoolExecutor(        0,                                     // corePoolSize = 0        Integer.MAX_VALUE,                     // maximumPoolSize 无限        60L, TimeUnit.SECONDS,                 // 闲置 60s 回收        new SynchronousQueue<Runnable>()       // 使用 SynchronousQueue    );}
```

为什么要用 SynchronousQueue？因为核心线程数为 0，当任务到来时，如果所有线程都忙，就会尝试向 SynchronousQueue 提交任务。如果当前没有空闲线程，`offer` 立刻返回 false，线程池就会立即创建新线程执行任务。

这正好利用了 SynchronousQueue 不缓存任务的特点——**任务必须立即被执行**，这与「缓存线程池」的设计理念完美契合。

### 5.2 手工线程交接

在一些需要精确控制两个线程交换数据的场景，比如双缓冲渲染、事件流水线等：

```
// 渲染管线中的帧交接SynchronousQueue<Frame> framePipeline = new SynchronousQueue<>();// 渲染线程new Thread(() -> {    Frame frame = renderFrame();    framePipeline.put(frame); // 等待提交}).start();// 显示线程new Thread(() -> {    Frame frame = framePipeline.take(); // 等待取走    display(frame);}).start();
```

### 5.3 真实案例：Dubbo 中的使用

Dubbo 的线程池配置中也可以指定使用 SynchronousQueue，从而实现任务不排队、直接分配线程的调度策略。配合合适的拒绝策略，可以避免任务积压导致 OOM。

* * *

## 六、注意事项与常见坑

### ⚠️ 1. 永远不要用 size() 判断是否有数据

SynchronousQueue 的 `size()` 永远返回 0！因为它没有容量。

```
SynchronousQueue<String> q = new SynchronousQueue<>();q.put("hello"); // 阻塞...// 上面这句话执行时，另一个线程调用了 q.take()// 此时 q.size() 仍然是 0
```

所以别用 `isEmpty()` 或 `size()` 来判断什么——没意义。

### ⚠️ 2. offer() 和 poll() 的行为要搞清楚

```
// offer 不阻塞：如果没有消费者等待，直接返回 falseboolean ok = queue.offer("data");// 等价于 queue.transfer("data", true, 0)// poll 不阻塞：如果没有生产者提供数据，直接返回 nullString data = queue.poll();// 等价于 queue.transfer(null, true, 0)
```

### ⚠️ 3. 线程饥饿风险

在非公平模式下（默认的 TransferStack），如果生产者和消费者持续到来，**新来的线程总是优先配对**，可能导致队列中的等待线程被「饿死」。但这在大多数高吞吐场景下反而是好事。

### ⚠️ 4. 性能考量

*   SynchronousQueue 比有界队列（如 ArrayBlockingQueue）更轻量——没有存储开销
    
*   没有内存占用，适合大量临时任务的传递
    
*   但线程阻塞/唤醒有开销，适合处理快的场景
    
*   如果任务处理很慢，大量线程会阻塞在 put 上，可能导致线程堆积
    

* * *

## 七、对比总结

特性

SynchronousQueue

ArrayBlockingQueue

LinkedBlockingQueue

**容量**

0

固定大小

默认 Integer.MAX\_VALUE

**存储元素**

不存储

存储在数组

存储在链表

**put 行为**

必须等消费者

队列满则等待

队列满则等待

**适用场景**

直接交接、零缓存

有界缓冲池

无界或大量缓冲

**内存占用**

几乎为0

预分配数组

动态分配节点

**公平模式**

支持（TransferQueue）

支持

不支持

**吞吐量**

极高（无锁实现）

中（锁实现）

中

SynchronousQueue 的核心哲学在于：**生产者和消费者直接面对面交易，中间商不赚差价**。没有中间缓存意味着没有延迟、没有内存占用，但也要求双方步调一致——频率相近的双方用它最合适。

* * *

_今天的源码之旅就到这里。SynchronousQueue 的 transfer 方法融合了无锁编程、自旋优化、线程阻塞唤醒等多种技术，是 Doug Lea 老爷子的一行代码里蕴含无数智慧的典范。下一期我们看 AtomicReference 和 AtomicStampedReference——彻底搞懂 CAS 的 ABA 问题。_
