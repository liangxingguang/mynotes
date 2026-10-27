> 深入理解ThreadPoolExecutor的ctl设计、Worker线程模型、execute流程和拒绝策略

## ThreadPoolExecutor 源码深度剖析｜Java线程池的核心实现

> 本文是「JDK源码阅读系列」第16篇，带你深入 `java.util.concurrent` 包最核心的类之一——ThreadPoolExecutor。看完这篇，面试问线程池你可以直接跟面试官 battle。

* * *

## 一、类的基本介绍

先说说 ThreadPoolExecutor 到底是个什么角色。

```
public class ThreadPoolExecutor extends AbstractExecutorService {    // ...}
```

它位于 `java.util.concurrent` 包，继承自 `AbstractExecutorService`，而 `AbstractExecutorService` 又实现了 `ExecutorService` 接口，最顶层是 `Executor` 接口——就一个方法 `void execute(Runnable command)`。

说人话：**ThreadPoolExecutor 是整个 Java 线程池的标准实现**。你平时用的 `Executors.newFixedThreadPool()`、`Executors.newCachedThreadPool()` 等等，底层全是 new 的 ThreadPoolExecutor。

它的核心思想非常朴素：

> **创建一堆线程放池子里，任务来了直接让空闲线程去跑，省去频繁创建/销毁线程的开销。**

但事情显然没这么简单——如果这就是全部，那 Doug Lea 大神花那么多精力写这几千行代码就该挨打了。

* * *

## 二、核心原理

### 2.1 ctl：一个 int 搞定线程池状态 + 线程数

这是 ThreadPoolExecutor 源码里我第一次看就拍大腿的设计——用 `AtomicInteger` 的一个 int，同时存两样东西：

```
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));// 参数：int 总共 32 位，高 3 位存线程池状态，低 29 位存工作线程数private static final int COUNT_BITS = Integer.SIZE - 3;       // = 29private static final int COUNT_MASK = (1 << COUNT_BITS) - 1;   // 低29位全是1// 线程池的 5 种状态——按数字大小严格排序private static final int RUNNING    = -1 << COUNT_BITS;  // 111 + 29个0 → 运行中private static final int SHUTDOWN   =  0 << COUNT_BITS;  // 000 + 29个0 → 关闭（不接新任务，跑完队列里的）private static final int STOP       =  1 << COUNT_BITS;  // 001 + ... → 停止（中断所有任务）private static final int TIDYING    =  2 << COUNT_BITS;  // 010 + ... → 整理中private static final int TERMINATED =  3 << COUNT_BITS;  // 011 + ... → 已终止// 拆包工具方法private static int runStateOf(int c)     { return c & ~COUNT_MASK; }   // 取高3位private static int workerCountOf(int c)  { return c & COUNT_MASK; }    // 取低29位private static int ctlOf(int rs, int wc) { return rs | wc; }           // 状态+数量打包
```

**为什么这样设计？** 因为要保证「状态和线程数」的读取是原子操作。用 AtomicInteger 一个 CAS 就能同时更新两个字段，省了一把锁，性能飞起。

状态转换路线图：

```
RUNNING → SHUTDOWN  (调用 shutdown())RUNNING/SHUTDOWN → STOP  (调用 shutdownNow())SHUTDOWN → TIDYING  (队列清空 + workerCount=0)STOP → TIDYING      (workerCount=0)TIDYING → TERMINATED (terminated()钩子执行完)
```

**关键点：** 状态值的大小顺序是有意为之的。`RUNNING(-1) < SHUTDOWN(0) < STOP(1) < TIDYING(2) < TERMINATED(3)`，所以可以用 `<` 或 `>=` 直接比较。具体状态判断也很巧妙：

```
private static boolean isRunning(int c) {    return c < SHUTDOWN;  // RUNNING 是负数，SHUTDOWN 是0}
```

### 2.2 构造方法——7个参数全部露脸

```
public ThreadPoolExecutor(int corePoolSize,       // 核心线程数                          int maximumPoolSize,    // 最大线程数                          long keepAliveTime,     // 空闲线程存活时间                          TimeUnit unit,          // 存活时间单位                          BlockingQueue<Runnable> workQueue,  // 任务队列                          ThreadFactory threadFactory,         // 线程工厂                          RejectedExecutionHandler handler)    // 拒绝策略
```

七个参数，少一个都不行（幸好 Executors 帮我们配好了常用组合）。

这些参数的**协作关系**是重中之重，很多人面试挂在理解上：

场景

行为

核心线程数还没满

来一个任务就创建一个新线程，**即使有空闲核心线程也照建**（懒加载策略）

核心线程数满了

新任务往工作队列里塞

工作队列也满了

创建非核心线程去执行，直到最大线程数

最大线程数也满了

执行拒绝策略

说白了就一句话：**先扩线程到 corePoolSize，再排队，排满了再扩到 maxPoolSize，还满就拒**。

### 2.3 execute() 流程——线程池的入口

看源码才是硬道理：

```
public void execute(Runnable command) {    if (command == null)        throw new NullPointerException();    int c = ctl.get();    // 第一步：工作线程数 < 核心线程数 → 直接新建 Worker    if (workerCountOf(c) < corePoolSize) {        if (addWorker(command, true))            return;        // 添加失败（可能状态变了），重新获取 ctl        c = ctl.get();    }    // 第二步：线程池还在运行 → 将任务加入工作队列    if (isRunning(c) && workQueue.offer(command)) {        int recheck = ctl.get();        // 二次检查：如果线程池已关闭，回滚刚入队的任务        if (!isRunning(recheck) && remove(command))            reject(command);        // 工作线程数为0，补充一个空任务Worker（用来消费队列）        else if (workerCountOf(recheck) == 0)            addWorker(null, false);    }    // 第三步：队列满了 → 尝试创建非核心线程（到 maxPoolSize）    else if (!addWorker(command, false))        reject(command);  // 超过 maxPoolSize → 拒！}
```

这里有个经典坑我当年就踩过——**二次检查**。`workQueue.offer(command)` 成功了，但刚塞进去线程池就被 shutdown 了，这时候如果不管，这个任务就永远没人执行。所以源码里要 `recheck`，如果状态已变就 `remove` 回来再 reject，相当严谨。

### 2.4 addWorker()——创建和启动工作线程

```
private boolean addWorker(Runnable firstTask, boolean core) {    retry:    for (int c = ctl.get();;) {        // 这里有一堆状态检查 —— 我精简一下核心逻辑                for (;;) {            int wc = workerCountOf(c);            // 线程数检查：超过容量就返回 false            if (wc >= CAPACITY ||                wc >= (core ? corePoolSize : maximumPoolSize))                return false;            // CAS 增加 workerCount            if (compareAndIncrementWorkerCount(c))                break retry;  // 成功跳出外层循环            c = ctl.get();     // CAS 失败重试            // 如果状态变了，回到外层 retry 重新检查            if (runStateOf(c) != rs)                continue retry;        }    }    // CAS 成功，真正创建线程    Worker w = new Worker(firstTask);    Thread t = w.thread;    if (t != null) {        workers.add(w);       // 加入 workers 集合        t.start();            // 启动线程 → 调用 Worker 的 run() → runWorker()    }    return true;}
```

注意那个 `retry:` 标签跳出双循环的写法——这是 JDK 源码里很常见的模式，外层检查状态，内层 CAS 自旋增 workerCount。

### 2.5 Worker 内部类——线程的封装

Worker 才是真正干活的，它的设计是 ThreadPoolExecutor 的精髓：

```
private final class Worker extends AbstractQueuedSynchronizer    implements Runnable {    final Thread thread;          // 真正干活的线程    Runnable firstTask;           // 第一个任务（可能为 null，表示去队列里取）    volatile long completedTasks; // 完成任务数    Worker(Runnable firstTask) {        setState(-1);  // 设置 AQS 状态为 -1，禁止中断直到 runWorker 开始        this.firstTask = firstTask;        this.thread = getThreadFactory().newThread(this); // Worker 自身就是 Runnable    }    public void run() {        runWorker(this);  // 委托给外部类的 runWorker 方法    }}
```

关键设计点：**Worker 继承了 AQS**！为什么？

因为要自己实现**不可重入独占锁**。AQS 默认是可重入的（`ReentrantLock`），但 Worker 需要的是「不能重入」——当前线程正在执行任务时，不能被同一个线程再次 lock。所以它自己实现了 `tryAcquire`：

```
// 不可重入锁：state=0 空闲, state=1 占用protected boolean tryAcquire(int unused) {    if (compareAndSetState(0, 1)) {        setExclusiveOwnerThread(Thread.currentThread());        return true;    }    return false;}
```

这个锁的作用是：**shutdown 的时候要 interrupt 工作线程，但要用锁保证正在执行关键操作时不会被中断搞乱**。

### 2.6 runWorker()——线程主循环

```
final void runWorker(Worker w) {    Thread wt = Thread.currentThread();    Runnable task = w.firstTask;    w.firstTask = null;    w.unlock();          // 允许中断（Worker 初始 state=-1 禁止中断）    boolean completedAbruptly = true;    try {        // 循环取任务：先执行 firstTask，然后从队列里 getTask()        while (task != null || (task = getTask()) != null) {            w.lock();    // 执行任务前加锁，防止 shutdown 时乱中断            try {                beforeExecute(wt, task);  // 钩子方法，子类可扩展                try {                    task.run();           // 真正的执行！                } catch (Throwable x) {                    afterExecute(task, x); // 钩子，异常也传进去                    throw x;                }            } finally {                afterExecute(task, null);                w.unlock();            }        }        completedAbruptly = false;    } finally {        processWorkerExit(w, completedAbruptly);  // 线程退出处理    }}
```

流程很清晰：

1.  先执行 firstTask（创建 Worker 时带的那个）
    
2.  然后 `getTask()` 循环从队列里取任务
    
3.  取不到 null → 该线程空闲超时了 → 退出
    

而 `getTask()` 就是控制**线程存活时间**的地方：

```
private Runnable getTask() {    boolean timedOut = false;    for (;;) {        int c = ctl.get();        // 检查是否应该关闭        if (runStateAtLeast(c, SHUTDOWN)            && (runStateAtLeast(c, STOP) || workQueue.isEmpty())) {            decrementWorkerCount();            return null;  // 返回 null → 退出线程        }        int wc = workerCountOf(c);        // 判断是否使用超时策略        // 1. allowCoreThreadTimeOut 开启 或 线程数超过 corePoolSize        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;        if ((wc > maximumPoolSize || (timed && timedOut))            && (wc > 1 || workQueue.isEmpty())) {            if (compareAndDecrementWorkerCount(c))                return null;            continue;        }        // 关键：阻塞等待任务        Runnable r = timed ?            workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :  // 超时等待            workQueue.take();                                       // 一直等到有任务        if (r != null)            return r;        timedOut = true;  // poll 超时返回 null，标记超时    }}
```

这里有个细节：**超过 corePoolSize 的多余线程，用 `poll(keepAliveTime)` 等一段时间没任务就退出**；核心线程用 `take()` 死等。

但如果 `allowCoreThreadTimeOut(true)` 开启了，核心线程也会用超时模式，最终全部退出。

* * *

## 三、四种拒绝策略

任务实在处理不了怎么办？ThreadPoolExecutor 内置了四种策略，都在内部类里：

```
// 1️⃣ 默认策略：抛异常（最安全，让调用方感知失败）public static class AbortPolicy implements RejectedExecutionHandler {    public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {        throw new RejectedExecutionException("Task " + r.toString() +                                             " rejected from " + e.toString());    }}// 2️⃣ 调用者自己跑（慢下来，负反馈控制）public static class CallerRunsPolicy implements RejectedExecutionHandler {    public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {        if (!e.isShutdown()) {            r.run();  // 谁调 execute，谁自己跑！        }    }}// 3️⃣ 静默丢弃（风险极大，用了就当没这回事）public static class DiscardPolicy implements RejectedExecutionHandler {    public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {        // 啥也不干    }}// 4️⃣ 丢掉最老的任务，再试试（队列头部的等最久的那个）public static class DiscardOldestPolicy implements RejectedExecutionHandler {    public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {        if (!e.isShutdown()) {            e.getQueue().poll();  // 丢掉头部            e.execute(r);          // 再试一次        }    }}
```

**推荐用法：** 绝大多数场景用 `AbortPolicy`（默认），配合自定义的 RejectedExecutionHandler 做日志报警。`CallerRunsPolicy` 在压测时可以试试。`DiscardPolicy` 和 `DiscardOldestPolicy` —— 懂你意思，但真要用一定要想清楚丢了任务的后果。

* * *

## 四、使用示例

```
import java.util.concurrent.*;import java.util.concurrent.atomic.AtomicInteger;public class ThreadPoolExecutorDemo {    public static void main(String[] args) {        // 自定义线程工厂——给线程起个有意义的名字        ThreadFactory threadFactory = new ThreadFactory() {            private final AtomicInteger counter = new AtomicInteger(1);            @Override            public Thread newThread(Runnable r) {                Thread t = new Thread(r);                t.setName("biz-pool-" + counter.getAndIncrement());                t.setDaemon(false);                return t;            }        };        // 创建线程池：核心2，最大4，队列容量8        ThreadPoolExecutor executor = new ThreadPoolExecutor(            2,                             // corePoolSize            4,                             // maximumPoolSize            30,                            // keepAliveTime            TimeUnit.SECONDS,            new LinkedBlockingQueue<>(8),  // 有界队列            threadFactory,            new ThreadPoolExecutor.CallerRunsPolicy()  // 满了调用者自己跑        );        // 提交20个任务        for (int i = 1; i <= 20; i++) {            int taskId = i;            executor.execute(() -> {                System.out.println(Thread.currentThread().getName()                    + " 执行任务 #" + taskId);                try {                    Thread.sleep(1000);  // 模拟耗时                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            });        }        executor.shutdown();  // 不再接收新任务        try {            // 等待所有任务完成，最多等60秒            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {                executor.shutdownNow();  // 超时强制关闭            }        } catch (InterruptedException e) {            executor.shutdownNow();        }        System.out.println("所有任务执行完毕！");        System.out.println("已完成任务数: " + executor.getCompletedTaskCount());    }}
```

跑一下会发现：任务 1-2 立即被执行（核心线程），3-10 排队，11-12 创建新线程执行（非核心），13-20 走到 `CallerRunsPolicy`——**main 线程自己也成了执行者**，这就是负反馈控制的真实效果。

* * *

## 五、注意事项

### 5.1 坑：Executors 的陷阱

快捷方法

底层实现

风险

`newFixedThreadPool(n)`

`LinkedBlockingQueue`**无界队列**

任务积压 OOM

`newCachedThreadPool()`

`SynchronousQueue`

 + maxPoolSize=MAX\_VALUE

线程无限创建 OOM

`newSingleThreadExecutor()`

无界队列 + 单线程

任务积压 OOM

**阿里规约一直在强调：不要用 Executors，要手动 new ThreadPoolExecutor。** 原因就是这些快捷方法用的队列/线程数太大，生产环境扛不住突发流量。

### 5.2 线程泄漏

```
public void executeTask(Runnable task) {    executor.submit(() -> {        task.run();        // 如果这里抛异常没 catch，Worker 就挂了        // 但 ThreadPoolExecutor 会自动补新 Worker...        // 不过这个异常去哪里了？    });}
```

注意：`execute()` 提交的任务抛异常，Worker 会退出然后补新的，**但异常被你吞掉了**。用 `submit()` 提交的 FutureTask 会把异常包在 `ExecutionException` 里。所以务必实现 `afterExecute` 钩子或 `UncaughtExceptionHandler` 来监控。

### 5.3 线程数设置

没有一个万能的公式，但是可以按场景参考：

*   **CPU 密集型**：`Ncpu + 1` 个线程
    
*   **IO 密集型**：`2 * Ncpu` 起步，甚至更大
    
*   **混合型**：分开两个线程池
    

实际还是要**压测 + 监控**来调，网上那些公式只能当起点。

* * *

## 六、对比总结

特性

ThreadPoolExecutor

Executors.newFixedThreadPool

Executors.newCachedThreadPool

本质

底层实现

快捷封装，底层也是 TPE

快捷封装，底层也是 TPE

核心线程数

自定义

固定 n 个

0

最大线程数

自定义

\= corePoolSize

Integer.MAX\_VALUE

任务队列

自定义

无界 LinkedBlockingQueue

SynchronousQueue

空闲回收

keepAliveTime 控制

核心线程不回收

60秒回收

适用场景

通用

稳定负载

短平快任务

### 一个灵魂拷问

**Q：核心线程会销毁吗？**

默认不会——核心线程创建后一直在 `take()` 上阻塞等着。但是有两个例外：

1.  设置了 `allowCoreThreadTimeOut(true)` —— 核心线程也会被回收
    
2.  线程池 shutdown / shutdownNow —— 全都销毁
    

* * *

最后吐槽一句：ThreadPoolExecutor 这 3000 多行代码，Doug Lea 老爷子用位运算、CAS、双循环自旋，把一个线程池包装得小而精悍。每次读源码都不得不佩服——JDK 里这种「一个 int 打天下」的风格，真是到了炉火纯青的地步了。

> **下期预告：** 接下来搞 Vector / Stack —— 看这两个「上古遗老」在 concurrent 时代还有没有存在的意义。

* * *

_本文是「JDK源码阅读系列」第16篇，持续更新中，欢迎关注。_