## JDK源码阅读(11) — CountDownLatch：门闩的等待与唤醒

> 当你需要"等所有线程都准备好了再出发"，或者"等所有线程都跑完了再汇总"——CountDownLatch 就是为此而生。今天我们来拆它的源码。

## 一、CountDownLatch 是什么？

**CountDownLatch** 是 java.util.concurrent（JUC）包下的一个同步工具类，核心作用就是**让一个或多个线程等待其他线程完成操作再继续执行**。

想象一个场景：在做核酸的队伍里，前面有10个人，你排在最后。只有前面10个人都做完了（countDown），你才能到窗口前（await 唤醒）。

```
// 使用场景：主线程等待所有子线程执行完毕CountDownLatch latch = new CountDownLatch(3);for (int i = 0; i < 3; i++) {    new Thread(() -> {        System.out.println(Thread.currentThread().getName() + " 执行中...");        latch.countDown();    }).start();}latch.await(); // 主线程等在这里System.out.println("所有线程执行完毕");
```

这就是 CountDownLatch 最核心的用法——一等多。

## 二、继承体系

CountDownLatch 的继承关系非常简单：

```
java.lang.Object    └── java.util.concurrent.CountDownLatch
```

它没有继承任何类，也没有实现任何接口（不像 Lock 或 Future 那样）。它的底层完全依靠 **AQS（AbstractQueuedSynchronizer）** 来实现同步控制。

## 三、核心源码解析

### 3.1 内部类 Sync

CountDownLatch 内部定义了一个静态内部类 `Sync`，它继承自 AQS：

```
private static final class Sync extends AbstractQueuedSynchronizer {    private static final long serialVersionUID = 4982264981922014374L;    // 构造函数，设置 AQS 的 state 值    Sync(int count) {        setState(count);    }    // 获取当前计数    int getCount() {        return getState();    }    // 尝试获取共享锁：state == 0 时才能获取成功    protected int tryAcquireShared(int acquires) {        return (getState() == 0) ? 1 : -1;    }    // 尝试释放共享锁：CAS 将 state 减 1    protected boolean tryReleaseShared(int releases) {        // 自旋 + CAS 保证线程安全        for (;;) {            int c = getState();            if (c == 0)                return false; // 已经是 0 了，没有线程再等待            int nextc = c - 1;            if (compareAndSetState(c, nextc))                return nextc == 0; // 减到 0 时返回 true，唤醒等待线程        }    }}
```

**关键理解：**

*   `state` 就是 CountDownLatch 的计数器初始值
    
*   `tryAcquireShared`：检查 state 是否为 0，是 => 获取成功（线程放行），否 => 获取失败（线程入队等待）
    
*   `tryReleaseShared`：CAS 把 state 减 1，减到 0 时返回 true（触发唤醒）
    

### 3.2 构造方法

```
public CountDownLatch(int count) {    if (count < 0) throw new IllegalArgumentException("count < 0");    this.sync = new Sync(count);}
```

count 必须 >= 0。如果 count = 0，那 await() 就直接放行。

### 3.3 await() 方法

```
public void await() throws InterruptedException {    sync.acquireSharedInterruptibly(1);}
```

核心调用 `acquireSharedInterruptibly`，这是 AQS 的模板方法：

```
// AQS 中的模版方法public final void acquireSharedInterruptibly(int arg)        throws InterruptedException {    if (Thread.interrupted())        throw new InterruptedException();    // tryAcquireShared 返回负数 => 获取失败，加入等待队列    if (tryAcquireShared(arg) < 0)        doAcquireSharedInterruptibly(arg);}
```

当 state != 0 时，`tryAcquireShared` 返回 -1（获取失败），当前线程会被封装成一个 **共享节点（SHARED）** 放入 AQS 的 **CLH 等待队列**，然后阻塞。

### 3.4 await(long timeout, TimeUnit unit) 方法

```
public boolean await(long timeout, TimeUnit unit)    throws InterruptedException {    return sync.tryAcquireSharedNanos(1, unit.toNanos(timeout));}
```

带超时的版本，等不到就返回 false，不无限期等待。

### 3.5 countDown() 方法

```
public void countDown() {    sync.releaseShared(1);}
```

核心调用 `releaseShared`，AQS 模板方法：

```
// AQS 模版方法public final boolean releaseShared(int arg) {    if (tryReleaseShared(arg)) {        // 减到 0 了，唤醒等待队列中的线程        doReleaseShared();        return true;    }    return false;}
```

当最后一个线程调用 `countDown()`，state 减到 0，`tryReleaseShared` 返回 true，接着 `doReleaseShared()` 会唤醒等待队列中所有共享节点上的线程。

### 3.6 getCount() 方法

```
public long getCount() {    return sync.getCount();}
```

仅仅是获取当前 state 的快照值。**注意这是快照**，在多线程环境下，你刚拿到值它可能就变了。

## 四、完整使用示例

```
import java.util.concurrent.CountDownLatch;import java.util.concurrent.ExecutorService;import java.util.concurrent.Executors;import java.util.concurrent.TimeUnit;public class CountDownLatchDemo {    public static void main(String[] args) throws InterruptedException {        int workerCount = 5;        CountDownLatch latch = new CountDownLatch(workerCount);        ExecutorService executor = Executors.newFixedThreadPool(workerCount);        for (int i = 1; i <= workerCount; i++) {            final int workerId = i;            executor.submit(() -> {                try {                    System.out.println("Worker " + workerId + " 开始工作...");                    TimeUnit.SECONDS.sleep((long) (Math.random() * 3));                    System.out.println("Worker " + workerId + " 工作完成");                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                } finally {                    latch.countDown(); // 不管成功失败都要 countDown                }            });        }        // 主线程等待所有工人完成        System.out.println("主线程等待所有工人完成...");        latch.await();        System.out.println("所有工人完成！主线程继续");        executor.shutdown();    }}
```

输出示例：

```
主线程等待所有工人完成...Worker 1 开始工作...Worker 4 开始工作...Worker 2 开始工作...Worker 5 开始工作...Worker 3 开始工作...Worker 2 工作完成Worker 4 工作完成Worker 5 工作完成Worker 1 工作完成Worker 3 工作完成所有工人完成！主线程继续
```

**最佳实践：** countDown() 一定要放在 finally 块里！如果 worker 抛出异常导致 countDown 没执行，那所有等待线程就永远等着了。

## 五、CountDownLatch vs CyclicBarrier

特性

CountDownLatch

CyclicBarrier

作用

一个/多个线程等待其他线程

多个线程互相等待到达屏障

可重用

❌ 计数到 0 后不可重置

✅ 可以 `reset()` 重用

构造函数

`new CountDownLatch(n)`

`new CyclicBarrier(n, barrierAction)`

唤醒方式

state 减到 0 一次性唤醒

所有线程到达 barrier 后同时唤醒

计数方向

等待 countDown 从 N 到 0

等待 await 从 0 到 N

主要 API

`await()`, `countDown()`

`await()`

## 六、注意事项 & 常见坑

1.  **countDown 忘记调用** → 死等。一定要放 finally 里！
    
2.  **count 太小或太大** → 太小还没等全部线程结束就放行了，太大永远等不到
    
3.  **可重入性** → 没有。它跟锁不是一回事，它就是个门闩
    
4.  **共享锁实现** → CountDownLatch 使用 AQS 的共享模式，所有等待线程都能被唤醒
    
5.  **与线程池配合** → 线程池里的线程用完回池子，但 latch 只管计数，不关心谁执行
    

## 总结

CountDownLatch 是 JUC 里最简单的同步工具之一，底层就靠 AQS 的 state 做计数器 + CLH 队列做等待队列。它的核心逻辑极其简洁：

*   **countDown()** → state 减 1，减到 0 就唤醒等待线程
    
*   **await()** → state != 0 就挂起，否则放行
    

简单但强大，用好它可以让多线程协调变得异常清爽。