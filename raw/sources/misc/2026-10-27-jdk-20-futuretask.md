---
title: JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484610&idx=1&sn=8afe78d4ba6c2c15f568ef087d75d6d2&chksm=fe6ca598c91b2c8e08f3819db1ca1261c4ad6169305755ae7c65e60b8d8adc3c5891ad53b4ec
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-20-futuretask.md
asset_ref: Assets/2026/10/jdk-20-futuretask.md
---

# JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器

## 🔥 JDK源码剖析——FutureTask，线程池里那个「能拿到结果」的秘密武器

## 一、类的自我介绍

**FutureTask** 位于 `java.util.concurrent` 包，是 JUC 里最常用的类之一——但你大概率没直接 new 过它。它是 **RunnableFuture** 的实现类，而 RunnableFuture 同时继承了 **Runnable** 和 **Future** 两个接口。

继承体系：

```
Runnable  ──┐             ├── RunnableFuture ──→ FutureTaskFuture ──────┘
```

说人话：FutureTask 既是一个**任务**（Runnable），又是一个**承诺**（Future）。你把它交给线程执行，线程跑完后，你能从它那里拿到结果。

> 你天天在用 `ExecutorService.submit(Callable)` 返回一个 Future，但背后 `submit` 方法干的其实就是：把 Callable 包成 FutureTask，再扔给 worker 线程。

**核心作用：** 让异步计算可以拿到返回值、可以取消、可以等待完成。但比你想的要复杂——它要处理线程状态切换、等待队列、取消语义，这些都在一个 200 多行的内部类里完成了。

## 二、源码走读

FutureTask 的源码其实不长，核心逻辑全在 `sync` 的内部状态机里（JDK 8 之后把内部类 AQS 去掉了，换成了更轻量的 CAS 操作）。

咱们先看最关键的——**状态定义**：

```
// FutureTask 内部状态private volatile int state;private static final int NEW          = 0;  // 初始状态private static final int COMPLETING   = 1;  // 正在设置结果（中间态，极短）private static final int NORMAL       = 2;  // 正常完成private static final int EXCEPTIONAL  = 3;  // 执行异常private static final int CANCELLED    = 4;  // 被取消private static final int INTERRUPTING = 5;  // 正在中断（中间态）private static final int INTERRUPTED  = 6;  // 已中断// 保存结果或异常private Object outcome;  // 非 volatile，靠 state 的 happen-before 保证可见性// 执行任务的线程private volatile Thread runner;// 等待线程链表（Treiber stack）private volatile WaitNode waiters;
```

**状态流转图**（一定要记住这个，面试常考）：

```
NEW -> COMPLETING -> NORMAL        (正常完成)NEW -> COMPLETING -> EXCEPTIONAL  (执行异常)NEW -> CANCELLED                  (取消，不中断)NEW -> INTERRUPTING -> INTERRUPTED (取消并中断)
```

状态只有**单向递增**，不能回退。这个设计保证了即使多线程同时操作，也能通过 CAS 安全推进。

### 核心方法：run()

```
public void run() {    // 1. 状态必须是 NEW，且 runner 要 CAS 成功设置为自己    //    保证了任务只被执行一次    if (state != NEW ||        !UNSAFE.compareAndSwapObject(this, runnerOffset,                                     null, Thread.currentThread()))        return;    try {        Callable<V> c = callable;        if (c != null && state == NEW) {            V result;            boolean ran;            try {                result = c.call();                ran = true;            } catch (Throwable ex) {                result = null;                ran = false;                setException(ex);  // 设置异常结果            }            if (ran)                set(result);       // 设置正常结果        }    } finally {        // 2. 避免 runner 被后续中断误伤        runner = null;        // 3. 如果被中断过，处理中断状态        int s = state;        if (s >= INTERRUPTING)            handlePossibleCancellationInterrupt(s);    }}
```

注意到 `runner` 为什么要在 finally 里清空吗？因为如果任务一执行完，另一个线程调用了 `cancel(true)`，它会去中断 `runner`。但此时任务已经跑完了，我们必须把 runner 置空，避免误中断。这种细节才是并发编程的魔鬼所在。

### 核心方法：get()

```
public V get() throws InterruptedException, ExecutionException {    int s = state;    if (s <= COMPLETING)  // 还没完成        s = awaitDone(false, 0L);  // 阻塞等待    return report(s);     // 根据状态返回结果或抛异常}
```

关键在 `awaitDone()`：

```
private int awaitDone(boolean timed, long nanos)    throws InterruptedException {    final long deadline = timed ? System.nanoTime() + nanos : 0L;    WaitNode q = null;    boolean queued = false;    for (;;) {        if (Thread.interrupted()) {            removeWaiter(q);      // 被中断则从等待队列移除            throw new InterruptedException();        }        int s = state;        if (s > COMPLETING) {    // 已完成（含异常/取消）            if (q != null)                q.thread = null;  // 帮助 GC            return s;        }        else if (s == COMPLETING)            Thread.yield();       // 正在设结果，让出 CPU 等一小下        else if (q == null)            q = new WaitNode();   // 创建等待节点        else if (!queued)            queued = UNSAFE.compareAndSwapObject(                this, waitersOffset, q.next = waiters, q); // 入栈        else if (timed) {            nanos = deadline - System.nanoTime();            if (nanos <= 0L) {                removeWaiter(q);  // 超时，移除等待节点                return state;            }            LockSupport.parkNanos(this, nanos); // 限时阻塞        }        else            LockSupport.park(this); // 无限阻塞    }}
```

这个自旋 + LockSupport.park 的等待方式，和 AQS 里的 `acquireQueued` 是同一套思路。不用 synchronized 的内建锁，而是用 CAS + 阻塞原语来精确控制线程挂起和唤醒。

### finishCompletion()  唤醒所有等待线程

```
private void finishCompletion() {    // 遍历等待者栈，挨个 unpark    for (WaitNode q; (q = waiters) != null;) {        if (UNSAFE.compareAndSwapObject(this, waitersOffset, q, null)) {            for (;;) {                Thread t = q.thread;                if (t != null) {                    q.thread = null;                    LockSupport.unpark(t);  // 逐个叫醒                }                WaitNode next = q.next;                if (next == null) break;                q.next = null;  // help GC                q = next;            }            break;        }    }    // 钩子方法，子类可以重写    done();    callable = null;  // help GC}
```

用 **Treiber stack**（无锁栈）来管理等待线程，而不是用阻塞队列，是因为这里只需要 LIFO 的顺序，不需要公平性。每次唤醒全部等待者，简单高效。

## 三、核心原理

### 数据结构

FutureTask 没有复杂的数据结构——核心就是：

1.  **一个 volatile int 状态**：控制整个生命周期
    
2.  **一个 volatile Thread runner**：记录当前执行线程，用于中断
    
3.  **一个 volatile WaitNode 链表头**：Treiber stack，管理等待线程
    
4.  **一个 Object outcome**：结果/异常
    

### 线程安全机制

*   **CAS 操作**：设置 runner、状态推进、等待节点入栈，全用 Unsafe 的 CAS
    
*   **volatile 变量**：state 和 waiters 保证可见性
    
*   **LockSupport.park/unpark**：阻塞/唤醒等待线程
    

整个设计的关键洞察是：**状态是单向递增的**。这大幅简化了并发控制——你不需要考虑状态回退，所有线程在同一时刻看到的状态都是一致的。

### 和 AQS 的区别

JDK 7 的 FutureTask 底层用了 AQS（AbstractQueuedSynchronizer），JDK 8 之后自己用 CAS 撸了一套。为什么这么做？因为 AQS 对于 FutureTask 来说太重了——FutureTask 只需要一个简单的状态机，不需要共享锁、条件变量这些。自己维护一个轻量状态机，代码更清晰、性能更好。

## 四、使用示例

```
import java.util.concurrent.*;public class FutureTaskDemo {    public static void main(String[] args) throws Exception {        // === 场景1：直接使用 FutureTask ===        // 创建一个耗时1秒的计算任务        FutureTask<String> task = new FutureTask<>(() -> {            System.out.println(Thread.currentThread().getName() + " 开始计算...");            TimeUnit.SECONDS.sleep(1);            return "计算结果：" + System.currentTimeMillis();        });        // 交给线程执行        new Thread(task, "Worker-1").start();        // 主线程干别的事        System.out.println("主线程继续工作...");        TimeUnit.MILLISECONDS.sleep(500);        // 获取结果（会阻塞到完成）        System.out.println("任务结果：" + task.get());        System.out.println("========================");        // === 场景2：超时获取 + 取消 ===        FutureTask<Integer> timeoutTask = new FutureTask<>(() -> {            TimeUnit.SECONDS.sleep(3);            return 42;        });        new Thread(timeoutTask, "Worker-2").start();        try {            // 只等1秒，会超时            Integer result = timeoutTask.get(1, TimeUnit.SECONDS);            System.out.println("结果：" + result);        } catch (TimeoutException e) {            System.out.println("等待超时！尝试取消任务...");            boolean cancelled = timeoutTask.cancel(true);            System.out.println("取消" + (cancelled ? "成功" : "失败"));        }        System.out.println("========================");        // === 场景3：通过线程池 submit （日常写法）===        ExecutorService pool = Executors.newFixedThreadPool(2);        Future<String> future = pool.submit(() -> {            TimeUnit.SECONDS.sleep(1);            return "hello from pool";        });        System.out.println("池化执行结果：" + future.get());        pool.shutdown();                System.out.println("========================");        // === 场景4：Runnable + 预置结果 ===        FutureTask<Integer> preset = new FutureTask<>(            () -> System.out.println("执行 Runnable"),            100  // 固定返回值        );        new Thread(preset).start();        System.out.println("Runnable 结果：" + preset.get());  // 输出 100    }}
```

运行结果：

```
主线程继续工作...Worker-1 开始计算...任务结果：计算结果：1752389038472========================等待超时！尝试取消任务...取消成功========================池化执行结果：hello from pool========================执行 RunnableRunnable 结果：100
```

## 五、注意事项

### 1\. get() 会阻塞，别忘了超时重载

```
// 错误：可能永远阻塞future.get();// 正确：给个超时future.get(5, TimeUnit.SECONDS);
```

特别在调用链中，如果某个上游服务挂了，没有超时的 get() 可能导致线程池满、整个系统雪崩。

### 2\. cancel() 的语义

*   `cancel(true)`：发送中断信号。但**只中断正在等待的任务**，如果任务已经执行完了，interrupt 不会生效
    
*   `cancel(false)`：只是把状态设为 CANCELLED。对于已经开始执行的任务，它并不会停下来
    

误区：很多人以为 cancel(true) 能强制杀掉线程。**不能！** 它只是调用 `Thread.interrupt()` 设了个中断标志，如果任务代码不响应中断，任务会继续执行到完。比如一个纯计算循环里没检查 `Thread.interrupted()`，cancel 就没用。

### 3\. 重复 get() 是无所谓的

FutureTask 的结果一旦产生就被缓存了，多次 get() 只有第一次可能阻塞，后续直接返回结果。所以你可以在多个地方同时 get() 同一个 FutureTask，不会有问题。

### 4\. 任务抛出异常时，get() 会包装成 ExecutionException

```
try {    future.get();} catch (ExecutionException e) {    Throwable cause = e.getCause();  // 真正的原因在这里    // 不要直接打印 e，要看 cause}
```

这个设计是为了把**任务执行异常**和**调用 get() 时的异常**区分开。面试问「FutureTask 如何处理异常」——就答：用 `outcome` 保存异常对象，状态置为 EXCEPTIONAL，get() 时检测到这个状态就封装成 ExecutionException 再 throw。

### 5\. run() 只会执行一次

无论多少个线程调用 run()，真正执行 Callable 的只有一个。这是通过 CAS runner 保证的。这也是为什么线程池里重复提交同一个 FutureTask 不会导致重复执行。

## 六、对比总结

特性

FutureTask

CompletableFuture

**手动控制结果**

✅ set/setException

✅ complete/completeExceptionally

**异步回调**

❌ 不支持

✅ thenApply/whenComplete 等

**组合编排**

❌ 不支持

✅ thenCombine/allOf/anyOf

**异常处理**

⚠️ 转 ExecutionException

✅ exceptionally/handle

**取消语义**

✅ 支持

✅ 支持

**超时获取**

✅ get(timeout)

✅ orTimeout/completeOnTimeout

**适用场景**

简单异步任务、线程池底层

复杂的异步编排

**什么时候还该用 FutureTask？**

*   你只是要一个简单的异步任务带返回值
    
*   你在写自定义线程池或执行框架的底层
    

**什么时候该上 CompletableFuture？**

*   有多个异步任务需要编排（等两个都完成、一个完成就开始下游）
    
*   需要链式回调
    
*   需要处理超时、异常恢复
    

但话说回来，CompletableFuture 的源码有 **3000 多行**，你说它好不好？好。但你真的需要那么强的能力吗？大多数场景 FutureTask + 线程池就够了。

## 七、一点碎碎念

FutureTask 是 JUC 里非常「优雅」的一个类——它只做一件事，把它做好，然后用最简单的方式。

200 多行代码实现了一个完整的状态机 + 线程间通信机制，没有复杂的继承、没有过度设计。每当我们写代码时老是想着「以后可能要扩展」然后加一堆抽象层，回头看看 FutureTask：**一个类单挑一个能力，够了。**

下期预告：**CompletableFuture**——FutureTask 的升级版，3000 行源码带你飞。

* * *

> 📷 文中配图：FutureTask 状态机流转图
