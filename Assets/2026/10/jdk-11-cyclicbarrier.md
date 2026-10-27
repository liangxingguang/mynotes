在 JUC 包中，两个名字极其相似的"屏障"工具经常让人傻傻分不清楚：**CountDownLatch**（我们上周刚讲过）和 **CyclicBarrier**。

简单粗暴区分：

*   **CountDownLatch**：等人到齐了，**大门打开，各走各的**（一锤子买卖）
    
*   **CyclicBarrier**：等人到齐了，**一起出发，还能再等下一波**（循环使用）
    

今天来深入剖析一下 CyclicBarrier 的源码实现。

* * *

## 1\. 类的基本介绍

### 继承体系

```
public class CyclicBarrier {    // ...}
```

简单到没朋友——**没有继承任何类**，**没有实现任何接口**。它就是一个独立的工具类。

### 核心作用

CyclicBarrier 的核心思想是：**让一组线程相互等待，直到所有线程都到达某个公共屏障点（barrier point），然后这些线程再一起继续执行。**

"Cyclic"（循环）意味着这个屏障可以被**重复使用**——所有线程通过后，它会自动重置，准备迎接下一波线程。

典型的应用场景：

*   多线程并行计算，每轮"凑齐"结果后统一汇总
    
*   多线程分批读取数据，每批读取完后统一处理
    
*   游戏中所有玩家准备好后才开始游戏
    

* * *

## 2\. 核心源码解析

### 2.1 全局变量

```
// 使用 ReentrantLock 保证线程安全private final ReentrantLock lock = new ReentrantLock();// 条件队列：等待"屏障被打破"（所有线程到达屏障点）private final Condition trip = lock.newCondition();// 需要等待的线程总数private final int parties;// 屏障被打破后执行的"屏障动作"（可选）private final Runnable barrierCommand;// 当前轮次的 Generation（代）private Generation generation = new Generation();// 当前这一轮还未到达屏障点的线程数private int count;
```

几个关键点：

*   **`parties`**：构造时指定，固定不变。表示需要多少个线程到达屏障点，才算"凑齐一桌"。
    
*   **`count`**：动态变化，初始值为 `parties`。每有一个线程到达屏障点，`count--`。当 `count` 降到 0，屏障被打破。
    
*   **`generation`**：CyclicBarrier 能循环使用的核心——每一轮用一个新的 Generation 对象。
    
*   **`trip`**：线程在屏障点上等待的条件队列。
    

### 2.2 Generation（代）

```
private static class Generation {    boolean broken = false;}
```

就这么简单的一个"标记位"。当 `broken = true` 时，表示当前这一轮出了异常（比如某线程超时或被中断），所有等待的线程应该立即醒来并抛异常。

每一轮（每次循环）都 `new` 一个 Generation 对象，干净利落地重置状态。

### 2.3 构造方法

```
public CyclicBarrier(int parties) {    this(parties, null);}public CyclicBarrier(int parties, Runnable barrierAction) {    if (parties <= 0) throw new IllegalArgumentException();    this.parties = parties;    this.count = parties;    this.barrierCommand = barrierAction;}
```

注意 `barrierAction`——这是 CyclicBarrier 最骚的操作：**当所有线程都到达屏障点时，可以在放行之前执行一个"收尾任务"**。比如所有线程都算完了，汇总一下结果。

### 2.4 await()：核心方法

```
public int await() throws InterruptedException, BrokenBarrierException {    try {        return dowait(false, 0L);    } catch (TimeoutException toe) {        throw new Error(toe);    }}public int await(long timeout, TimeUnit unit)    throws InterruptedException, BrokenBarrierException, TimeoutException {    return dowait(true, unit.toNanos(timeout));}
```

两个 `await` 方法都调用了私有的 `dowait` 方法：

```
private int dowait(boolean timed, long nanos)    throws InterruptedException, BrokenBarrierException, TimeoutException {    final ReentrantLock lock = this.lock;    lock.lock();    try {        final Generation g = generation;        // 1. 检查当前代是否已损坏        if (g.broken)            throw new BrokenBarrierException();        // 2. 检查线程是否被中断        if (Thread.interrupted()) {            breakBarrier();   // 打破屏障            throw new InterruptedException();        }        // 3. 当前线程到达屏障点：count 减 1        int index = --count;                // 4. 如果这是最后一个到达的线程（index == 0）        if (index == 0) {            boolean ranAction = false;            try {                final Runnable command = barrierCommand;                if (command != null)                    command.run();     // 执行屏障动作                ranAction = true;                nextGeneration();      // 进入下一轮                return 0;            } finally {                if (!ranAction)                    breakBarrier();    // 屏障动作执行失败，打破屏障            }        }        // 5. 不是最后一个到达的线程，进入等待        for (;;) {            try {                if (!timed)                    trip.await();          // 无限等待                else if (nanos > 0L)                    nanos = trip.awaitNanos(nanos);  // 限时等待            } catch (InterruptedException ie) {                // 等待中被中断                if (g == generation && !g.broken) {                    breakBarrier();                    throw ie;                } else {                    Thread.currentThread().interrupt();                }            }            // 6. 醒来后检查原因            if (g.broken)                throw new BrokenBarrierException();            if (g != generation)                return index;  // 进入了下一轮（新代），正常返回            if (timed && nanos <= 0L) {                breakBarrier();                throw new TimeoutException();  // 超时            }        }    } finally {        lock.unlock();    }}
```

**这个方法的逻辑非常优雅：**

1.  每个线程到达后 `--count`
    
2.  **最后一个线程**（`index == 0`）负责"撞线"——执行 barrierAction 并调用 `nextGeneration()` 唤醒所有等待线程、重置状态
    
3.  **非最后一个线程**进入 condition 队列等待
    
4.  等待的线程醒来后检查：如果是新代（`g != generation`），说明屏障被正常通过；如果是 broken，说明异常了
    

**最后一个到达的线程有一个特权：** 它是唯一不阻塞的线程，负责执行收尾工作和唤醒其他人。

### 2.5 nextGeneration()：循环的核心

```
private void nextGeneration() {    // 唤醒所有在屏障上等待的线程    trip.signalAll();    // 重置 count，开始新一轮    count = parties;    // 创建新的 Generation 对象    generation = new Generation();}
```

`signalAll()` 唤醒所有在 trip 条件上等待的线程，但注意——**这些线程不会立即返回**，它们还要在 `dowait` 的 for 循环中检查 `g != generation`。

这就是 CyclicBarrier "循环"的秘诀：每一轮结束，创建新 Generation、重置 count。下一批线程到达时，又可以用 new 出来的 Generation 来验证。

### 2.6 breakBarrier()：损坏模式

```
private void breakBarrier() {    generation.broken = true;  // 标记损坏    count = parties;           // 重置 count    trip.signalAll();          // 唤醒所有等待线程}
```

当出现异常（中断、超时、barrierAction 抛异常）时，调用此方法。标记当前代为 broken 并唤醒所有人。等待线程检查到 `g.broken == true`，会抛出 `BrokenBarrierException`。

**注意：** 一旦屏障被打破，**必须通过 `reset()` 方法手动重置**才能重新使用：

```
public void reset() {    final ReentrantLock lock = this.lock;    lock.lock();    try {        breakBarrier();    // 打破当前代        nextGeneration();  // 创建新代（自动打上 broken=false）    } finally {        lock.unlock();    }}
```

* * *

## 3\. 核心原理总结

```
线程1 ──→ await() ──→ --count → index>0 → 等待 condition ──+线程2 ──→ await() ──→ --count → index>0 → 等待 condition ──+─→ 被倒数第5个线程唤醒 → return index线程3 ──→ await() ──→ --count → index>0 → 等待 condition ──+线程4 ──→ await() ──→ --count → index>0 → 等待 condition ──+线程5 ──→ await() ──→ --count → index=0 → 执行barrierAction → nextGeneration() → signalAll()
```

**关键设计决策：**

特性

CyclicBarrier

CountDownLatch

**重复使用**

✅ 自动重置

❌ 一次性

**"凑桌"机制**

最后一个线程触发唤醒

countDown() 任意线程调用

**收尾动作**

barrierAction（最后一个线程执行）

无

**返回值**

到达次序（index）

无

**异常传播**

BrokenBarrierException

无

CyclicBarrier 使用了"**合合分分**"的思路：

*   **合**：多线程在屏障点汇合等待 → `trip.await()`
    
*   **分**：最后一个线程完成收尾，唤醒所有线程重新出发 → `signalAll() + new Generation()`
    

* * *

## 4\. 使用示例：并行分阶段计算

```
import java.util.concurrent.*;public class CyclicBarrierDemo {        // 模拟 3 个阶段的并行计算    private static final int THREAD_COUNT = 4;    private static final int PHASES = 3;        // 各线程每个阶段的"工作量"    private static final int[][] DATA = {        {1, 2, 3},        {4, 5, 6},        {7, 8, 9},        {10, 11, 12}    };        // 每阶段的汇总结果    private static int phaseSum = 0;    public static void main(String[] args) {        // barrierAction：每轮所有线程到达后执行汇总        CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {            System.out.println("=== 阶段汇总完成，当前和 = " + phaseSum + " ===");            phaseSum = 0;  // 重置，准备下一阶段        });        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);                // 启动 THREAD_COUNT 个并行任务        for (int i = 0; i < THREAD_COUNT; i++) {            final int threadId = i;            executor.submit(() -> {                try {                    for (int phase = 0; phase < PHASES; phase++) {                        int value = DATA[threadId][phase];                        System.out.println("线程" + threadId + " 第" + (phase+1) + "阶段: 计算值=" + value);                                                // 模拟计算时间                        Thread.sleep((long)(Math.random() * 500));                                                // 累加当前值                        phaseSum += value;                                                System.out.println("线程" + threadId + " 到达屏障点 (次序=" +                             (THREAD_COUNT - barrier.await() - 1) + ")");                    }                } catch (InterruptedException | BrokenBarrierException e) {                    Thread.currentThread().interrupt();                }            });        }        executor.shutdown();        try {            executor.awaitTermination(10, TimeUnit.SECONDS);        } catch (InterruptedException e) {            Thread.currentThread().interrupt();        }    }}
```

**运行结果示例：**

```
线程0 第1阶段: 计算值=1线程2 第1阶段: 计算值=7线程3 第1阶段: 计算值=10线程1 第1阶段: 计算值=4线程0 到达屏障点 (次序=2)线程2 到达屏障点 (次序=1)线程3 到达屏障点 (次序=0)    ← 最后一个到达的线程=== 阶段1汇总完成，当前和 = 22 ===线程3 进入第2阶段线程2 进入第2阶段...
```

注意看：最后一个到达的线程（次序=0）负责执行 barrierAction，然后在 `nextGeneration()` 中唤醒所有人。

* * *

## 5\. 注意事项

### 5.1 BrokenBarrierException

这是 CyclicBarrier 最独特的异常。当以下情况发生时，屏障进入"破碎"状态：

1.  **等待超时**：某个线程 `await(timeout)` 超时 → `breakBarrier()`
    
2.  **线程被中断**：等待中的线程被中断 → `breakBarrier()`
    
3.  **barrierAction 抛异常**：最后一个线程执行收尾动作失败 → `breakBarrier()`
    
4.  **其他线程调用了 `reset()`**：强制重置
    

一旦屏障破碎，**所有等待的线程**都会收到 `BrokenBarrierException`，需要自行处理。

### 5.2 和 CountDownLatch 的区别

CountDownLatch

CyclicBarrier

**可重复使用**

❌ 不能

✅ 可以

**计数方式**

countDown() 外部递减

await() 自减+阻塞

**"凑桌"机制**

不需要全部凑齐

必须凑齐 parties 个线程

**线程角色**

谁都可以 countDown

每个线程都必须 await

**典型场景**

等待初始化完成、等待服务启动

分阶段计算、游戏匹配

### 5.3 性能考量

*   CyclicBarrier 内部使用 `ReentrantLock` + `Condition`，不是无锁的。在高并发下锁竞争是主要开销。
    
*   如果 `barrierAction` 执行耗时，最后一个线程会卡在这里，其他等待线程也会被延迟唤醒。
    
*   不要在线程池中混用不同 barrier timeout 的任务，否则超时时间一到就 `breakBarrier()`，所有线程全废。
    

### 5.4 小坑

```
// 错误示例：线程池线程数比 parties 少时会发生什么？CyclicBarrier barrier = new CyclicBarrier(5);ExecutorService pool = Executors.newFixedThreadPool(3);  // 只有3个线程！for (int i = 0; i < 5; i++) {    pool.submit(() -> {        barrier.await();  // 永远凑不齐5个线程！    });}// 所有线程永远阻塞在屏障点...
```

**始终确保线程池中有足够的活跃线程**来满足 barrier 的 parties 要求，否则你将会收获一个"死等"现场。

* * *

## 6\. 对比总结

CyclicBarrier 的源码不长（大约 400 行），但设计非常精巧：

1.  **Generation 机制** — 用对象隔离每一轮的状态，干净利落地实现循环
    
2.  **最后一个线程负责制** — 由最后一个到达的线程执行收尾并唤醒所有人，避免了额外的通知线程
    
3.  **BrokenBarrierException** — 优雅地处理了各种异常场景
    
4.  **ReentrantLock + Condition** — 借用了 AQS 的条件队列机制，代码量极少
    

如果你在项目中遇到"多线程分阶段处理"的场景，CyclicBarrier 是一个非常趁手的工具——比手动用 Lock + Condition 写优雅得多。

**下一篇预告：** PriorityQueue — 堆排序的底层，优先级队列到底怎么玩的？明天见。