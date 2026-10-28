---
title: 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎
source: 微信公众号「Java解忧杂货铺」
source_url: "http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484595&idx=1&sn=877c00f350fe26df19ff7fd04b670b7b&chksm=fe6ca5e9c91b2cffca7cc3391179bca7b4cd4be16f6494dcb5026de4b579477be6c672e6b18f#rd"
source_type: link
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-28
inbox_ref: Inbox/2026-10-27-jdk-16-scheduledthreadpool.md
asset_ref: Assets/2026/10/jdk-16-scheduledthreadpool.md
---

# 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎
## 深度剖析 ScheduledThreadPoolExecutor——JDK 定时任务调度引擎

## 一、类的基本介绍

### 从属关系

```
java.util.concurrent.ScheduledThreadPoolExecutor    extends ThreadPoolExecutor        implements ScheduledExecutorService
```

ScheduledThreadPoolExecutor（以下简称 STPE）位于 **java.util.concurrent** 包，是 JUC 提供的**定时任务/周期任务调度线程池**。它在 `ThreadPoolExecutor` 的基础上增加了**延迟执行**和**周期重复执行**的能力。

### 核心作用

*   **延迟执行**：提交一个任务，在指定的 delay 后执行一次
    
*   **固定频率执行**：`scheduleAtFixedRate`，不管任务执行多久，按固定周期触发
    
*   **固定延迟执行**：`scheduleWithFixedDelay`，每次任务执行完后，等待固定延迟再触发下一次
    

### 继承体系

```
Executor  └─ ExecutorService        └─ ScheduledExecutorService      ← 定义了 schedule/scheduleAtFixedRate/scheduleWithFixedDelay              └─ ScheduledThreadPoolExecutor  ← 具体实现                    extends ThreadPoolExecutor
```

说白了，STPE 就是**强化版的 ThreadPoolExecutor**，把普通线程池改造为可以"到点了再执行"的调度引擎。

* * *

## 二、核心源码解析

### 2.1 构造方法——本质还是 TPE

```
public ScheduledThreadPoolExecutor(int corePoolSize) {    super(corePoolSize, Integer.MAX_VALUE,          DEFAULT_KEEPALIVE_MILLIS, MILLISECONDS,          new DelayedWorkQueue());}public ScheduledThreadPoolExecutor(int corePoolSize,                                    ThreadFactory threadFactory) {    super(corePoolSize, Integer.MAX_VALUE,          DEFAULT_KEEPALIVE_MILLIS, MILLISECONDS,          new DelayedWorkQueue(), threadFactory);}
```

几个值得注意的点：

1.  **maximumPoolSize 设成了 `Integer.MAX_VALUE`**——因为 STPE 用于调度任务，不想因为池满而拒绝延迟任务
    
2.  **核心线程数由你指定**，但最大可以无限增长（不过实际很少涨上去，因为 DelayedWorkQueue 是无界的）
    
3.  **workQueue 固定为 `DelayedWorkQueue`**，不允许你传别的队列——这是它跟 TPE 最大的区别
    

### 2.2 延迟队列 DelayedWorkQueue——藏在内部的"定时器"

这是 STPE 的灵魂，它没有用 `DelayQueue`，而是自己手写了一个内部类 `DelayedWorkQueue`。

```
static class DelayedWorkQueue extends AbstractQueue<Runnable>    implements BlockingQueue<Runnable> {    // 底层是数组，实现了一个最小堆（priority queue）    private RunnableScheduledFuture<?>[] queue = new RunnableScheduledFuture<?>[16];    private final ReentrantLock lock = new ReentrantLock();    private int size;    // 核心方法：从队列取任务，如果没到期就阻塞等待    public RunnableScheduledFuture<?> take() throws InterruptedException {        final ReentrantLock lock = this.lock;        lock.lockInterruptibly();        try {            for (;;) {                RunnableScheduledFuture<?> first = queue[0];                if (first == null)                    available.await(); // 队列空，阻塞                else {                    long delay = first.getDelay(NANOSECONDS);                    if (delay <= 0)                        return finishPoll(first); // 到时间了，取出执行                    first = null;                    // 没到时间，等待 delay 时长                    if (leader != null)                        available.await();                    else {                        Thread thisThread = Thread.currentThread();                        leader = thisThread;                        try {                            available.awaitNanos(delay);                        } finally {                            if (leader == thisThread)                                leader = null;                        }                    }                }            }        } finally {            // leader 为空且有任务，唤醒一个等待线程            if (leader == null && queue[0] != null)                available.signal();            lock.unlock();        }    }}
```

**关键设计 leader-follower 模式**：

*   只有一个线程（leader）在等待最早到期的任务，其他线程（follower）无条件等待
    
*   leader 拿到任务后，会唤醒一个 follower 成为新 leader
    
*   这么做的好处是**减少不必要的竞争**——在多线程争抢队列时，Leader-Follower 比所有线程都 `awaitNanos` 更高效
    

### 2.3 schedule——延迟一次执行

```
public <V> ScheduledFuture<V> schedule(Callable<V> callable,                                        long delay,                                        TimeUnit unit) {    if (callable == null || unit == null) throw new NullPointerException();    // 包装为 ScheduledFutureTask    RunnableScheduledFuture<V> t = decorateTask(callable,        new ScheduledFutureTask<V>(callable, triggerTime(delay, unit)));    // 延迟执行——其实是往队列里塞一个 delayed 时间到期的任务    delayedExecute(t);    return t;}
```

`delayedExecute` 只是把任务入队 `DelayedWorkQueue`，然后 `ensurePrestart()` 确保至少有一个线程在跑：

```
private void delayedExecute(RunnableScheduledFuture<?> task) {    if (isShutdown())        reject(task);    else {        super.getQueue().add(task); // 入队 DelayedWorkQueue        if (isShutdown() &&            !canRunInCurrentRunState(task.isPeriodic()) &&            remove(task))            task.cancel(false);        else            ensurePrestart(); // 确保至少一个 worker 线程启动    }}
```

### 2.4 scheduleAtFixedRate——固定频率

```
public ScheduledFuture<?> scheduleAtFixedRate(Runnable command,                                              long initialDelay,                                              long period,                                              TimeUnit unit) {    RunnableScheduledFuture<?> t = decorateTask(command,        new ScheduledFutureTask<Void>(command, null,            triggerTime(initialDelay, unit),  // 首次触发时间            unit.toNanos(period)));            // period（正数）    delayedExecute(t);    return t;}
```

**period 为正数**——这是区分 fixedRate 和 fixedDelay 的关键。

### 2.5 scheduleWithFixedDelay——固定延迟

```
public ScheduledFuture<?> scheduleWithFixedDelay(Runnable command,                                                  long initialDelay,                                                  long delay,                                                  TimeUnit unit) {    RunnableScheduledFuture<?> t = decorateTask(command,        new ScheduledFutureTask<Void>(command, null,            triggerTime(initialDelay, unit),            unit.toNanos(-delay)));             // delay（负数）    delayedExecute(t);    return t;}
```

**period 为负数**——就这么一个符号的区别！

### 2.6 ScheduledFutureTask.run()——周期的核心逻辑

```
public void run() {    boolean periodic = isPeriodic(); // 判断 period != 0    if (!canRunInCurrentRunState(periodic))        cancel(false);    else if (!periodic)        // 非周期任务，直接 run        ScheduledFutureTask.super.run();    else if (ScheduledFutureTask.super.runAndReset()) {        // 周期任务：执行成功后，重新设置下次触发时间        setNextRunTime();        // 把任务重新放回延迟队列        reExecutePeriodic(outerTask);    }}// 设置下一次触发时间private void setNextRunTime() {    long p = period;    if (p > 0)        // scheduleAtFixedRate: 用初始触发时间 + period        time += p;    else        // scheduleWithFixedDelay: 用当前时间 + (-period)        time = triggerTime(-p);}
```

这里把周期机制说得很清楚了：

*   **fixedRate**（p > 0）：`time += period`，不管任务执行多久，下次触发时间基于**上一次的触发时间**计算，所以如果任务执行时间比周期长，会出现"追尾"——多个任务实例并发执行
    
*   **fixedDelay**（p < 0）：`time = now + delay`，每次任务执行完后，下次触发时间基于**当前实际时间**计算，所以前后任务不会重叠
    

* * *

## 三、核心原理总结

### 数据结构

```
DelayedWorkQueue (最小堆)    ├── 按触发时间排序（最早的时间在堆顶）    ├── 底层用数组实现（和 PriorityQueue 一样）    └── 基于 Leader-Follower 模式做线程等待
```

### 调度流程

```
submit → ScheduledFutureTask → DelayedWorkQueue.add（入堆排序）                                    │                                    ▼Worker 线程执行 → take() 从队列取任务                                    │                        ┌────────────┴────────────┐                        │                         │                  非周期任务                   周期任务                        │                         │                  执行一次                    runAndReset()                        │                    setNextRunTime()                    完成                    reExecutePeriodic()                                                 │                                           重新入队等待下次
```

### 线程安全机制

1.  **ReentrantLock**：DelayedWorkQueue 内部用 lock 保护入队、出队操作
    
2.  **Leader-Follower 模式**：减少线程在等待时的竞争
    
3.  **Condition**：`available` 条件变量，实现精准唤醒
    

* * *

## 四、完整使用示例

```
import java.time.LocalTime;import java.util.concurrent.*;public class ScheduledThreadPoolExecutorDemo {    public static void main(String[] args) throws Exception {        // 创建一个核心线程数为 2 的定时线程池        ScheduledExecutorService scheduler = new ScheduledThreadPoolExecutor(2);        System.out.println("=== 1. 延迟执行（一次性）===");        scheduler.schedule(() ->                System.out.println("[" + LocalTime.now() + "] 延迟 2 秒执行"),                2, TimeUnit.SECONDS);        Thread.sleep(100); // 给个时间让上面的 schedule 提交完成        System.out.println("=== 2. scheduleAtFixedRate（固定频率）===");        // 首次延迟 1 秒，之后每 3 秒执行一次        ScheduledFuture<?> future1 = scheduler.scheduleAtFixedRate(() -> {            System.out.println("[" + LocalTime.now() + "] FixedRate 执行");            try { Thread.sleep(1000); } catch (InterruptedException ignored) {}        }, 1, 3, TimeUnit.SECONDS);        Thread.sleep(100);        System.out.println("=== 3. scheduleWithFixedDelay（固定延迟）===");        // 首次延迟 1 秒，每次执行完后等待 3 秒再执行下一次        ScheduledFuture<?> future2 = scheduler.scheduleWithFixedDelay(() -> {            System.out.println("[" + LocalTime.now() + "] FixedDelay 执行");            try { Thread.sleep(1000); } catch (InterruptedException ignored) {}        }, 1, 3, TimeUnit.SECONDS);        // 跑 15 秒后取消两个定时任务        Thread.sleep(15000);        future1.cancel(false);        future2.cancel(false);        System.out.println("=== 4. 捕获定时任务异常 ===");        ScheduledFuture<?> future3 = scheduler.schedule(() -> {            System.out.println("[" + LocalTime.now() + "] 即将抛出异常");            throw new RuntimeException("定时任务挂了！");        }, 1, TimeUnit.SECONDS);        Thread.sleep(2000);        try {            future3.get(); // 这里会抛出 ExecutionException        } catch (ExecutionException e) {            System.out.println("捕获到异常: " + e.getCause().getMessage());        }        scheduler.shutdown();    }}
```

* * *

## 五、注意事项（含泪经验）

### 5.1 周期任务的异常吞噬——最经典的坑

如果你使用 `scheduleAtFixedRate` 或 `scheduleWithFixedDelay`，任务中抛出的**未捕获异常不会打印日志**，而且**该任务会被静默取消**！

```
scheduler.scheduleAtFixedRate(() -> {    // 某次执行抛出异常后，这个任务再也不会执行了    throw new RuntimeException("我挂了");}, 0, 1, TimeUnit.SECONDS);
```

**解决方案**：在任务体内部 try-catch 所有异常：

```
scheduler.scheduleAtFixedRate(() -> {    try {        // 你的业务逻辑    } catch (Exception e) {        log.error("定时任务异常", e);    }}, 0, 1, TimeUnit.SECONDS);
```

### 5.2 任务堆积风险

`DelayedWorkQueue` 是无界队列，如果任务执行时间远大于周期，任务会不断堆积：

*   `scheduleAtFixedRate` 如果任务执行了 10 秒，但周期是 2 秒，那么堆积的任务会在同一时间**突然一口气执行**（catch up 现象）
    
*   解决方案：用 `scheduleWithFixedDelay` 替代 fixedRate，天然避免堆积
    

### 5.3 shutdown 后未执行的任务

调用 `shutdown()` 后，延迟队列中已到期的任务还会执行，但**未到期的延迟任务会被取消**。默认会返回 `false`（不等待正在执行的任务完成）。如果需要等待，用 `awaitTermination`。

### 5.4 对比：ScheduledExecutorService 与 Timer

特性

ScheduledThreadPoolExecutor

Timer

线程数

多线程（指定 corePoolSize）

单线程

异常处理

需自行捕获，否则任务静默取消

一个异常导致整个 Timer 挂掉

系统时间敏感性

支持相对延迟和绝对时间

依赖系统时间

精度

纳秒级

毫秒级

任务类型

Runnable + Callable

TimerTask

**一句话**：`Timer` 已经是历史产物了，新代码一律用 `ScheduledThreadPoolExecutor`。

* * *

## 六、对比总结

### 与 ThreadPoolExecutor 对比

维度

ThreadPoolExecutor

ScheduledThreadPoolExecutor

核心能力

异步任务执行

延迟执行 + 周期执行

workQueue

多种可选

固定 DelayedWorkQueue

maximumPoolSize

你指定

Integer.MAX\_VALUE

适用场景

通用异步任务

定时器、心跳、调度任务

### scheduleAtFixedRate vs scheduleWithFixedDelay

特性

fixedRate

fixedDelay

触发逻辑

固定时间间隔触发，**不管任务执行多久**

任务执行完 + 固定延迟后触发

period 符号

正数

负数（源码里这么用的）

任务重叠

可能重叠（任务执行超时）

**不会重叠**

适用场景

心跳、定期数据同步

轮询、需要确保串行的任务

### 个人理解

ScheduledThreadPoolExecutor 本质上就是一个**加了定时器功能的 ThreadPoolExecutor**。它没有改造 TPE 的执行模型（还是 Worker 线程去队列拿任务），而是在任务包装和队列上做文章：

1.  把任务包装成 `ScheduledFutureTask`，自带触发时间
    
2.  用 `DelayedWorkQueue`（最小堆）替代普通 BlockingQueue，按时间排序
    
3.  周期任务执行完重新设时间、重新入队
    

这种设计非常优雅——**对 TPE 的改动几乎为零，却赋予了它完整的定时调度能力**。

如果你只需要简单的延迟执行或者周期任务，`Executors.newScheduledThreadPool()` 工厂方法就能满足需求。但如果你需要自定义拒绝策略、线程工厂、或者调整核心线程数，直接用 `new ScheduledThreadPoolExecutor(corePoolSize)` 即可。

总之，它是 Java 定时任务领域的第一选择——比 Timer 强，比 Quartz 轻量，比 ElasticJob 简单。90% 的定时场景用它就够了。