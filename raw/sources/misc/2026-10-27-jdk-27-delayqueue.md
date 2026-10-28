---
title: DelayQueue —— 延迟队列，让任务"迟到"的艺术
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484697&idx=2&sn=8e03c6e70157166bc0d50ca7bb72b8cd&chksm=fe6ca443c91b2d558b2898edeb03386aec35516bf44d3ea388c8abea14dc3717b7da90905bba
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-27-delayqueue.md
asset_ref: Assets/2026/10/jdk-27-delayqueue.md
---

# DelayQueue —— 延迟队列，让任务"迟到"的艺术

大家好，持续输出 JDK 源码解析系列。今天我们来聊聊 **DelayQueue**。

如果你是第一次看到这个系列，前面已经从 ArrayList 一路写到了 PriorityBlockingQueue，每次都是先讲集合包再对比 JUC 包，节奏感拉满了。今天的主角 DelayQueue，可以说是 **PriorityQueue + 定时器 + 阻塞等待** 的完美结合。

## 一、类的基本介绍

DelayQueue 位于 `java.util.concurrent` 包下，是一个**无界的、支持延迟获取元素的阻塞队列**。

```
public class DelayQueue<E extends Delayed> extends AbstractQueue<E>    implements BlockingQueue<E>
```

注意这句话——`E extends Delayed`。所有放入 DelayQueue 的元素必须实现 `Delayed` 接口：

```
public interface Delayed extends Comparable<Delayed> {    long getDelay(TimeUnit unit);}
```

`Delayed` 继承了 `Comparable`，所以元素必须得：

1.  实现 `getDelay()` — 告诉我还剩多少时间才到期
    
2.  实现 `compareTo()` — 内部排序用，谁先到期谁排在前面
    

**继承体系**：

```
Iterable → Collection → Queue → AbstractQueue → DelayQueue                                                                                                           → BlockingQueue
```

所以 DelayQueue 既是 Queue，又是 BlockingQueue。

**核心作用**：你放进去的任务，只有在延迟时间到了之后才能被消费者取走。没有到期的元素，消费者线程会乖乖等着。

## 二、核心源码分析

先上成员变量，这地儿就很明显能看到它内部用了啥：

```
public class DelayQueue<E extends Delayed> extends AbstractQueue<E>    implements BlockingQueue<E> {    private final transient ReentrantLock lock = new ReentrantLock();    private final PriorityQueue<E> q = new PriorityQueue<E>();    private Thread leader = null;    private final Condition available = lock.newCondition();        // ...}
```

一眼看穿本质：

*   **ReentrantLock** — 线程安全的锁
    
*   **PriorityQueue** — 内部用优先级队列来排序，按 Delayed 的 compareTo 排序，最早到期的在最前面
    
*   **leader** — 这是一个优化机制，后面细说
    
*   **Condition** — 用来做等待/通知
    

### offer / put 方法

先来看入队。因为是无界队列，所以 `put` 没有阻塞这个说法，直接调 `offer`：

```
public boolean offer(E e) {    final ReentrantLock lock = this.lock;    lock.lock();    try {        q.offer(e);          // 丢进优先级队列        if (q.peek() == e) { // 如果这个元素是新的队首（最早到期的）            leader = null;   // 重置 leader            available.signal(); // 通知等待的消费者线程        }        return true;    } finally {        lock.unlock();    }}
```

这里有个很细节的点：**为什么要判断 `q.peek() == e`？**

因为新元素可能不是最早到期的，如果是，那就没必要唤醒消费者——反正之前已经有更早的任务在等了。但如果新元素成了队首（最早到期的），那之前正在等待的那个任务可能已经不对了，所以重置 leader 并通知所有等待线程去重新抢。

### take 方法 — 阻塞获取

take 方法才是 DelayQueue 的精髓：

```
public E take() throws InterruptedException {    final ReentrantLock lock = this.lock;    lock.lockInterruptibly();    try {        for (;;) {            E first = q.peek();      // 看一眼队首            if (first == null)                available.await();   // 队列空，直接挂起            else {                long delay = first.getDelay(NANOSECONDS);                if (delay <= 0)                    return q.poll(); // 到期了，拿走！                // 没到期，但如果有 leader 了，就等着                if (leader != null)                    available.await();                else {                    Thread thisThread = Thread.currentThread();                    leader = thisThread;                    try {                        available.awaitNanos(delay); // 精确等待剩余时间                    } finally {                        if (leader == thisThread)                            leader = null;                    }                }            }        }    } finally {        // 出队成功且队列还有元素，唤醒一个等待线程        if (q.peek() != null)            available.signal();        lock.unlock();    }}
```

### leader-follower 模式 — 减少不必要的唤醒

这里的 **leader 机制** 是一个典型的性能优化。

场景是这样的：多个消费者线程同时调用 `take()` 在等，队首任务的延迟时间还剩 10 秒。

如果没有 leader 机制：

*   每个线程都在 `awaitNanos(10s)` 或 `await()` 上等着
    
*   10 秒后全部被唤醒，大家抢锁，**只有一个能拿到元素**，其他 9 个线程白醒了又回去等
    
*   这叫做 **thundering herd（惊群效应）**
    

有了 leader 机制：

*   第一个发现没到期的线程成为 **leader**
    
*   leader 调用 `awaitNanos(delay)`，**精确等待剩余时间**
    
*   其他线程（follower）调用 `await()`，**无限等待**
    
*   当 leader 醒来发现到期了，拿走元素，释放锁
    
*   在 `finally` 块里调用 `available.signal()`，**只唤醒一个 follower**
    
*   那个 follower 变成新的 leader 或者直接取下一个元素
    

所以平均每个元素只唤醒 1~2 个线程，**性能大幅提升**。

这个模式在 Timer、ScheduledThreadPoolExecutor 里也有类似实现，在 Netty 等高性能框架里更是常见。

### poll / poll(timeout)

`poll()` 是非阻塞的，到期的拿走，没到期的直接返回 null：

```
public E poll() {    final ReentrantLock lock = this.lock;    lock.lock();    try {        E first = q.peek();        if (first == null || first.getDelay(NANOSECONDS) > 0)            return null;        else            return q.poll();    } finally {        lock.unlock();    }}
```

`poll(long timeout, TimeUnit unit)` 是带超时的版本，跟 take 逻辑差不多，只是超时时间多了一个上限：

```
public E poll(long timeout, TimeUnit unit) throws InterruptedException {    long nanos = unit.toNanos(timeout);    // ... 类似的循环，只是 available.awaitNanos 传的是 min(delay, nanos)}
```

## 三、核心数据结构图解

```
DelayQueue 内部结构：   ┌────────────────────────────────────────┐   │              DelayQueue                 │   │                                         │   │  ┌─────────────────────────────────┐    │   │  │   PriorityQueue<E> (小顶堆)      │    │   │  │                                 │    │   │  │    ┌─────┐                      │    │   │  │    │  5s │  ← peek: 最早到期      │    │   │  │    ├─────┤                      │    │   │  │    │ 10s │                      │    │   │  │    ├─────┤                      │    │   │  │    │ 30s │                      │    │   │  │    └─────┘                      │    │   │  └─────────────────────────────────┘    │   │                                         │   │  leader = Thread-1 (只等5s那一个)        │   │                                         │   │  Thread-2  →  available.await()  (等)    │   │  Thread-3  →  available.await()  (等)    │   └────────────────────────────────────────┘
```

*   小顶堆里按到期时间排序
    
*   leader 在当前最早到期任务的剩余时间内精确等待
    
*   其他 follower 无限等待，直到被 signal 唤醒
    

## 四、完整可运行示例

写个实际点的例子——模拟订单 30 分钟后未支付就自动取消：

```
import java.util.concurrent.*;import java.time.LocalTime;import java.time.format.DateTimeFormatter;/** * 模拟订单超时取消系统 */public class DelayQueueDemo {        static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm:ss");        // 订单类，实现 Delayed 接口    static class Order implements Delayed {        private final String orderId;        private final long createTime;     // 创建时间（毫秒）        private final long expireTime;     // 到期时间（毫秒）               public Order(String orderId, long delayMillis) {            this.orderId = orderId;            this.createTime = System.currentTimeMillis();            this.expireTime = this.createTime + delayMillis;        }               @Override        public long getDelay(TimeUnit unit) {            return unit.convert(expireTime - System.currentTimeMillis(),                                 TimeUnit.MILLISECONDS);        }               @Override        public int compareTo(Delayed other) {            // 按到期时间排序，最早到期的排前面            long diff = this.expireTime - ((Order)other).expireTime;            return diff == 0 ? 0 : (diff < 0 ? -1 : 1);        }               public String getOrderId() { return orderId; }               public boolean isExpired() {            return System.currentTimeMillis() >= expireTime;        }    }        public static void main(String[] args) throws InterruptedException {        DelayQueue<Order> delayQueue = new DelayQueue<>();               System.out.println("[" + now() + "] 系统启动，开始接收订单");               // 模拟3个订单，分别在 2秒、5秒、8秒 后过期        delayQueue.put(new Order("ORDER-001", 2000));        delayQueue.put(new Order("ORDER-002", 5000));        delayQueue.put(new Order("ORDER-003", 8000));               System.out.println("[" + now() + "] 已接收3个订单，等待超时取消...");        System.out.println();               // 消费者线程 - 不断取过期订单并处理        ExecutorService executor = Executors.newSingleThreadExecutor();        executor.submit(() -> {            try {                while (true) {                    Order order = delayQueue.take();  // 阻塞直到有订单到期                                        if (order.isExpired()) {                        System.out.println("[" + now() + "] ❌ 订单 "                             + order.getOrderId() + " 已超时，自动取消");                    } else {                        System.out.println("[" + now() + "] ✅ 订单 "                             + order.getOrderId() + " 已支付，跳过取消");                    }                }            } catch (InterruptedException e) {                Thread.currentThread().interrupt();            }        });               // 主线程等待所有订单处理完毕        Thread.sleep(12000);        executor.shutdownNow();        System.out.println(" [" + now() + "] 系统关闭");    }        static String now() {        return LocalTime.now().format(FMT);    }}
```

运行输出：

```
[08:00:01] 系统启动，开始接收订单[08:00:01] 已接收3个订单，等待超时取消...[08:00:03] ❌ 订单 ORDER-001 已超时，自动取消[08:00:06] ❌ 订单 ORDER-002 已超时，自动取消[08:00:09] ❌ 订单 ORDER-003 已超时，自动取消[08:00:13] 系统关闭
```

每个订单精确地在设定的延迟时间后被取出处理，这就是 DelayQueue 的核心价值。

## 五、注意事项

### 1\. 元素必须实现 Delayed，且要正确实现 compareTo

这两个方法缺一不可，而且 `compareTo` 必须跟 `getDelay` 的排序语义一致——最早到期的要排最前面。

### 2\. getDelay 不能返回固定值

最常见的坑：

```
public long getDelay(TimeUnit unit) {    return 1000; // ❌ 错误！每次都返回固定值}
```

`getDelay()` 是**每次调用都计算的**，返回值随着时间推移逐渐减少，直到 0 或负值才表示到期。你得用当前时间算差值。

### 3\. 无界队列，小心 OOM

DelayQueue 是无界的，理论上可以无限添加。如果生产者速度远大于消费者，堆内存迟早被撑爆。实际项目中建议配合限流或设置最大容量。

### 4\. 空元素问题

DelayQueue 不允许 null 元素，因为 PriorityQueue 底层不允许 null 入队。

### 5\. drainTo 的坑

`drainTo()` 会把所有到期的元素都 drain 出来，但**没到期的元素不动**。这在批量处理场景下要注意，别以为 drainTo 能一次性清空队列。

### 6\. 适用场景

场景

推荐度

说明

订单超时取消

⭐⭐⭐⭐⭐

经典场景

缓存过期清理

⭐⭐⭐⭐⭐

延迟删除机制

定时任务调度（简单）

⭐⭐⭐⭐

比 Timer 灵活，但不如 ScheduledThreadPoolExecutor

会话超时管理

⭐⭐⭐⭐

每次访问刷新会话的过期时间

长轮询/延迟重试

⭐⭐⭐

重试间隔场景可用

## 六、对比总结

### DelayQueue vs 其他定时/延迟方案

特性

DelayQueue

ScheduledThreadPoolExecutor

Timer

HashedWheelTimer(Netty)

数据结构

优先级队列

优先级队列

优先级队列(TaskQueue)

时间轮

线程模型

消费者自己拉

线程池执行

单线程

时间轮线程

精准度

高（毫秒级）

高

中等

中等（受 tick 影响）

并发性能

leader-follower 优化

工作者线程池

差（单线程阻塞）

极高（O(1)）

复杂度

简单

中等

简单

复杂

支持周期任务

❌

✅

✅

✅

### 说两句感悟

DelayQueue 是我个人非常喜欢的一个类，因为它**简单但优雅**。整个类就 300 多行代码，核心逻辑就是 PriorityQueue + ReentrantLock + Condition + leader-follower。没有花哨的数据结构，但就是能高效解决"延迟执行"这个经典问题。

我当年第一次看 DelayQueue 源码的时候，最大的收获其实是 **leader-follower 模式**。在此之前我写多线程代码总是直接用 `notifyAll()` 粗暴唤醒所有线程，leader-follower 让我意识到"有时候唤醒一个就够了"。这个意识后来帮我优化了公司好几个高并发服务的代码。

另外说一句，DelayQueue 的 take 方法在 JDK 9 之后有个微调——原来用的是 `awaitNanos(delay)` 加循环自旋，后来改成了更精确的 `awaitNanos` + leader 机制，代码更健壮了。细节变了，但思想没有变。

好了，今天的源码分析就到这里。DelayQueue 作为一个轻量级的延迟队列，理解它的原理对后续看 ScheduledThreadPoolExecutor、甚至消息中间件的延迟队列实现都很有帮助。下篇见！
