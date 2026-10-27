---
title: JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483954&idx=1&sn=dfa68e8418234148eaa351d7746ae9fc&chksm=fe6ca368c91b2a7e319c39e46f1adba95429c3952305e73d609a4715d624638ef9fc6e28c6d1"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-07-reentrantlock.md
asset_ref: Assets/2026/10/jdk-07-reentrantlock.md
---

# JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

## JDK源码阅读(6)：ReentrantLock——可重入锁，从"管程"本质看AQS的优雅实现

聊完集合框架，我们正式进入 JUC 的锁机制部分。今天的主角是 **ReentrantLock**——Java并发编程中最基础也是最重要的显式锁。

很多人觉得 ReentrantLock 就是 synchronized 的替代品，其实不全面。**它的底层实现 AQS（AbstractQueuedSynchronizer）是整个 JUC 锁体系的基石**，搞懂了 ReentrantLock，你就搞懂了一半的 JUC。

## 一、类的基本介绍

`所在包：java.util.concurrent.locks   继承体系：实现 Lock 接口   内部架构：基于 AbstractQueuedSynchronizer (AQS)   核心能力：可重入、公平/非公平模式、可中断、超时获取、Condition 条件等待   `

ReentrantLock 提供了比 synchronized 更丰富的语义：

*   **可重入性**：同一个线程可以重复获取同一把锁
    
*   **公平性选择**：支持公平锁（按等待时间排队）和非公平锁（默认，可插队）
    
*   **可中断性**：`lockInterruptibly()` 支持响应中断
    
*   **超时获取**：`tryLock(timeout, unit)` 支持超时
    
*   **条件变量**：多个 Condition 实现精确唤醒
    

## 二、核心源码解析

### 2.1 AQS 的底层数据结构

ReentrantLock 的内部类 Sync 继承自 AQS。AQS 的核心结构非常简单：

`// AQS 核心字段   private volatile int state;   	        // 同步状态：0=未锁定, 1=锁定, >1=重入   private transient Thread exclusiveOwnerThread;  	// 持有锁的线程   `

AQS 内部维护了一个**CLH 锁队列的变体**——一个 FIFO 的双向链表：

`static final class Node {   	    volatile int waitStatus;   	    // 等待状态：0/CANCELLED/SIGNAL/CONDITION/PROPAGATE   	    volatile Node prev;   	   	    // 前驱节点   	    volatile Node next;   	   	    // 后继节点   	    volatile Thread thread;   	    // 当前节点代表的线程   	    Node nextWaiter;   	   	   	    // 等待条件队列的下一个节点   }   `

核心思想：**获取锁失败的线程会包装成 Node 挂到等待队列尾部，通过 CAS + 自旋 + park 机制实现阻塞和唤醒**。

### 2.2 非公平锁的加锁过程

ReentrantLock 默认是非公平锁。看看 `lock()` 的实现：

`// 非公平锁   static final class NonfairSync extends Sync {   	    final void lock() {   	        // ① 一上来先抢一把——CAS将 state 从 0 改成 1   	        if (compareAndSetState(0, 1))   	            setExclusiveOwnerThread(Thread.currentThread());  	// 抢到就直接用   	        else   	            acquire(1);  	// 没抢到走标准流程   	    }   }  // acquire 是 AQS 的模板方法   public final void acquire(int arg) {   	    if (!tryAcquire(arg) &&   	   	    // ① 子类实现的尝试获取   	        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))  	// ② 加入等待队列   	        selfInterrupt();   }  `

非公平锁的 `tryAcquire`：

`protected final boolean tryAcquire(int acquires) {   	    final Thread current = Thread.currentThread();   	    int c = getState();   	    if (c == 0) {   	        // 锁空闲时，再次尝试 CAS 获取（非公平的体现——不检查队列中是否有人等更久）   	        if (compareAndSetState(0, acquires)) {   	            setExclusiveOwnerThread(current);   	            return true;   	        }   	    } else if (current == getExclusiveOwnerThread()) {   	        // 可重入：当前线程已持有锁，state + 1   	        int nextc = c + acquires;   	        if (nextc < 0) 	// overflow   	            throw new Error("Maximum lock count exceeded");   	        setState(nextc);   	        return true;   	    }   	    return false;   }   `

**非公平的关键**：在锁释放后，新来的线程在 `tryAcquire` 里直接 CAS 抢锁，**不排队**。这可能导致等待队列中的线程"饿死"——但换来了更高的吞吐量。

### 2.3 公平锁的加锁过程

公平锁和非公平锁的唯一区别就在 `tryAcquire`：

`static final class FairSync extends Sync {   	    protected final boolean tryAcquire(int acquires) {   	        final Thread current = Thread.currentThread();   	        int c = getState();   	        if (c == 0) {   	            // 关键区别：先检查队列中是否有前驱节点在排队   	            if (!hasQueuedPredecessors() &&   	   	    // 没人排队才去 CAS 抢锁   	                compareAndSetState(0, acquires)) {   	                setExclusiveOwnerThread(current);   	                return true;   	            }   	        } else if (current == getExclusiveOwnerThread()) {   	            int nextc = c + acquires;   	            if (nextc < 0)   	                throw new Error("Maximum lock count exceeded");   	            setState(nextc);   	            return true;   	        }   	        return false;   	    }   }   `

只有多了一行 `hasQueuedPredecessors()` 检查——如果队列中有线程等得比当前线程久，那就乖乖去排队，不抢。

### 2.4 等待队列的入队与自旋

当 `tryAcquire` 失败后，线程会加入等待队列并自旋：

`private Node addWaiter(Node mode) {   	    Node node = new Node(mode);  	// mode = EXCLUSIVE   	    // 快速入队：尝试 CAS 将 node 设为 tail   	    Node pred = tail;   	    if (pred != null) {   	        node.prev = pred;   	        if (compareAndSetTail(pred, node)) {   	            pred.next = node;   	            return node;   	        }   	    }   	    enq(node);  	// 快速入队失败，走安全路径   	    return node;   }  final boolean acquireQueued(final Node node, int arg) {   	    boolean failed = true;   	    try {   	        boolean interrupted = false;   	        for (;;) {   	            final Node p = node.predecessor();   	            if (p == head && tryAcquire(arg)) {   	    // 前驱是 head，尝试获取锁   	                setHead(node);   	    // 设为新 head   	                p.next = null;   	    // 原 head 出队   	                failed = false;   	                return interrupted;   	            }   	            // 获取失败，检查是否应该 park   	            if (shouldParkAfterFailedAcquire(p, node) &&   	                parkAndCheckInterrupt())   	                interrupted = true;   	        }   	    } finally {   	        if (failed)   	            cancelAcquire(node);   	    }   }  `

这个自旋的逻辑就几句话，但很多细节值得注意：

1.  只有**前驱是 head** 的节点才尝试获取锁——保证了 FIFO 顺序
    
2.  获取失败后，通过 `shouldParkAfterFailedAcquire` 将前驱的 waitStatus 设为 SIGNAL
    
3.  然后 `park()` 真正阻塞线程，等待前驱释放锁时 unpark
    

### 2.5 解锁过程

`public void unlock() {   	    sync.release(1);   }  public final boolean release(int arg) {   	    if (tryRelease(arg)) {   	        Node h = head;   	        if (h != null && h.waitStatus != 0)   	            unparkSuccessor(h);  	// 唤醒 head 的后继节点   	        return true;   	    }   	    return false;   }  // 子类实现   protected final boolean tryRelease(int releases) {   	    int c = getState() - releases;   	    if (Thread.currentThread() != getExclusiveOwnerThread())   	        throw new IllegalMonitorStateException();   	    boolean free = false;   	    if (c == 0) {  	// state 减到 0 才算真正释放   	        free = true;   	        setExclusiveOwnerThread(null);   	    }   	    setState(c);   	    return free;   }  `

关键理解：**state 减到 0 才算完全释放**。如果锁被重入了3次，需要 unlock 3次才能真正释放。

## 三、ReentrantLock vs synchronized 对比

特性

synchronized

ReentrantLock

实现方式

JVM 层面（monitorenter/monitorexit）

Java 层面（AQS）

锁释放

自动（退出 synchronized 块）

显式 unlock（必须放 finally）

可重入

✅

✅

公平性

非公平

支持公平和非公平

可中断

❌

✅

超时获取

❌

✅ `tryLock(timeout, unit)`

条件变量

每个对象一个等待集

多个 Condition 对象

性能

优化后（偏向锁、轻量锁）差异不大

高并发下接近

使用复杂度

低

中（需手动 unlock）

## 四、实战示例

### 安全的自增计数器

`public class Counter {   	    private final ReentrantLock lock = new ReentrantLock();   	    private int count = 0;   	    public void increment() {   	        lock.lock();   	        try {   	            count++;   	        } finally {   	            lock.unlock();  	// 必须在 finally 中释放！   	        }   	    }   	    public int getCount() {   	        lock.lock();   	        try {   	            return count;   	        } finally {   	            lock.unlock();   	        }   	    }   }  `

### 可超时的锁获取

`public boolean tryProcessWithTimeout(long timeout, TimeUnit unit) {   	    try {   	        if (lock.tryLock(timeout, unit)) {   	            try {   	                // 业务处理   	                return true;   	            } finally {   	                lock.unlock();   	            }   	        } else {   	            System.out.println("获取锁超时，降级处理");   	            return false;   	        }   	    } catch (InterruptedException e) {   	        Thread.currentThread().interrupt();   	        return false;   	    }   }   `

这种模式对于响应时间敏感的系统特别有用——不会因为死锁或线程卡住而永远阻塞。

### 条件变量：精确唤醒

`public class BoundedBuffer {   	    private final ReentrantLock lock = new ReentrantLock();   	    private final Condition notFull  = lock.newCondition();   	    private final Condition notEmpty = lock.newCondition();   	    private final Object[] items = new Object[100];   	    private int putIndex, takeIndex, count;   	    public void put(Object x) throws InterruptedException {   	        lock.lock();   	        try {   	            while (count == items.length)   	                notFull.await();   	     // 队列满，等待"非满"条件   	            items[putIndex] = x;   	            if (++putIndex == items.length) putIndex = 0;   	            count++;   	            notEmpty.signal();   	       	    // 唤醒一个等待"非空"条件的线程   	        } finally {   	            lock.unlock();   	        }   	    }   	    public Object take() throws InterruptedException {   	        lock.lock();   	        try {   	            while (count == 0)   	                notEmpty.await();   	     // 队列空，等待"非空"条件   	            Object x = items[takeIndex];   	            if (++takeIndex == items.length) takeIndex = 0;   	            count--;   	            notFull.signal();   	     // 唤醒一个等待"非满"条件的线程   	        } finally {   	            lock.unlock();   	        }   	        return x;   	    }   }  `

多个 Condition 的好处是**精确唤醒**——生产线程只唤醒消费者，消费线程只唤醒生产者。如果用 synchronized + wait/notify 实现同样的功能，notifyAll 会唤醒所有线程，效率低下。

## 五、注意事项

### 5.1 务必在 finally 中释放锁

ReentrantLock 最经典的陷阱。synchronized 由 JVM 自动释放，但 ReentrantLock 不会。如果业务代码抛出异常，锁就永远不会释放——轻则死锁，重则整个系统挂掉。

### 5.2 公平锁的代价

公平锁的性能通常只有非公平锁的 1/10 到 1/3。除非你的场景对**公平性有硬性要求**（比如交易系统），否则默认用非公平锁。

### 5.3 tryLock 是检测死锁的利器

使用 `tryLock` 的超时版本可以避免死锁——如果超时获取不到，做降级处理而不是傻等。

## 六、总结

ReentrantLock 是 AQS 的经典应用，理解它能让你触类旁通地掌握 JUC 锁机制：

*   **AQS 的模板方法模式**：`acquire` → `tryAcquire` + `acquireQueued`
    
*   **CLH 队列的变体**：双向链表 + 自旋 + park 实现线程排队
    
*   **非公平 vs 公平**：就差一个 `hasQueuedPredecessors` 检查
    
*   **Condition**：基于 AQS 内部条件队列实现等待/通知机制
    

下一篇预告：**ReentrantReadWriteLock**——读写分离，看看读锁和写锁是怎么在同一个 AQS 状态上共存的。
