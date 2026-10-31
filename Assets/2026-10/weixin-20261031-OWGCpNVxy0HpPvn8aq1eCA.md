## 题目

ForkJoinPool 的原理是什么？它和 ThreadPoolExecutor 相比有什么区别，凭什么在某些场景下更快？工作窃取算法是如何实现的？

## 参考答案

### 前言

线程池是并发面试的常客，`ThreadPoolExecutor` 那几个参数几乎人人能背。面试官却喜欢继续追问：JDK 8 的并行流和 `CompletableFuture` 默认跑在哪个池上？它和 `ThreadPoolExecutor` 到底有什么不一样？然后就自然引入了这道题。

这道题表面考一个池子的实现，实际考的是**你对"分治型任务怎么调度"有没有概念**。它高频的原因也很实在：`parallelStream()` 和 `CompletableFuture` 不指定执行器时，底层默认都是 `ForkJoinPool.commonPool()`。至于"凭什么比 ThreadPoolExecutor 快"，**准确的答案不是"它更快"，而是"它在一种特定任务上更快"**。

> Tip
> 
> 文末准备了一份口语回答模板，面试如果被问到，可以直接使用。

### 一、ForkJoinPool：把大任务拆小的线程池

`ForkJoinPool` 是 JDK 7 引入的线程池，出自 Doug Lea 之手，和 `ThreadPoolExecutor` 放在同一个 `java.util.concurrent` 包下。它解决的问题很具体：**一个大任务能递归拆成若干小任务，小任务各自算完，再把结果合并回去**。名字里的 Fork 和 Join 说的就是这个动作——**Fork 是拆，Join 是合**。

而 `ThreadPoolExecutor` 默认的是另一套假设：**提交进去的任务彼此独立，互不依赖**，所以所有任务扔进同一个队列，所有线程从这个队列里抢。

这两种假设带来的差异比想象中大。`ThreadPoolExecutor` 有两个天然成本：一是**队列只有一个，线程越多，抢队列的竞争越激烈**；二是**线程等一个任务的结果时只能干等着**，自己被占住，池子只能再开一条线程来补。

那 ForkJoinPool 具体怎么用？套路是固定的三步：**继承 `RecursiveTask`（要返回值）或 `RecursiveAction`（不要返回值），重写 `compute()` 方法，在里面判断任务粒度**——够小就直接算，够大就拆成子任务。求一个大数组的和是最典型的例子：

`class SumTask extends RecursiveTask<Long> {    private static final int THRESHOLD = 10_000;   // 粒度阈值，小于它就不再拆    private final int[] data;    private final int lo, hi;          SumTask(int[] data, int lo, int hi) {        this.data = data;        this.lo = lo;        this.hi = hi;       }    @Override    protected Long compute() {        if (hi - lo <= THRESHOLD) {          // 够小了，直接算            long sum = 0;            for (int i = lo; i < hi; i++) {                   sum += data[i];               }            return sum;           }        int mid = (lo + hi) >>> 1;        SumTask left = new SumTask(data, lo, mid);        SumTask right = new SumTask(data, mid, hi);              left.fork();                          // 把左边拆出去        long rightResult = right.compute();   // 右边自己就地算，省一次入队        long leftResult = left.join();        // 等左边算完        return leftResult + rightResult;      // 合并       }   }`

> Tip
> 
> 分治模板就三句：**够小就直接算，不够就拆；拆一个 `fork()` 出去，留一个自己 `compute()`，最后 `join()` 回来**。留一个自己算，省掉一次入队和线程唤醒，是标准姿势。

跑起来也不复杂，把根任务丢给池子就行：

`long sum = ForkJoinPool.commonPool().invoke(new SumTask(data, 0, data.length));`

这里的 `commonPool()` 是 JVM 自带的一个共享实例，`parallelStream()` 和 `CompletableFuture` 默认用的就是它——它的坑留到后面单独说。

到这里，它看上去只是"一个支持递归的线程池"。**真正的差异藏在队列结构里，也正是从那里开始，它比 `ThreadPoolExecutor` 快。**

### 二、队列不在池子里，而是每条线程一个

`ThreadPoolExecutor` 只有一个队列，`ForkJoinPool` 把这个结构拆开了：**每个工作线程各自持有一个双端队列**（源码里叫 `WorkQueue`），另外还有一个通用的队列专门接外部提交进来的任务。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

线程执行过程中 `fork()` 出来的子任务，**推进的是它自己那个队列**，不经过任何共享结构。这就把线程间的竞争从"所有线程抢一个队列"降到了"基本各玩各的"。

不过队列一多，一个新问题就冒出来了：**任务是自己 fork 的，那如果我这条线程拆得特别快、别人拆得特别慢，岂不是有的线程队列堆成山、有的线程空转？**

### 三、工作窃取：自己取最近，偷别人取最远

这正是工作窃取（Work Stealing）要解决的问题：**队列空了的工作线程，不会闲着，而是跑到别的线程队列里"偷"一个任务回来干。**

有意思的是，默认的同步模式下，同一个双端队列里自己人和小偷取任务的方向是相反的（异步 FIFO 模式见第八节）：

取任务的人

从哪一端取

顺序

为什么这么设计

队列的主人

最新入队的一端（源码字段 `top`）

**LIFO**

刚切出来的子任务，它依赖的数据还在 CPU 缓存里，先算它命中率最高；而且不跟来偷的人抢同一个位置

窃取者

最旧的一端（源码字段 `base`）

**FIFO**

最旧的那个任务是还没被拆开的最大一块，粒度最粗，偷一次够自己算很久，省得频繁来偷

> Tip
> 
> 方向口诀：**自己取最近的，偷别人取最远的**。近的是刚拆出来、数据还热在缓存里；远的是没拆开的大块，偷一次够算很久。两端错开，冲突自然就小了。

**这两端一冷一热，恰好错开**：主人只在 `top` 附近活动，小偷只在 `base` 附近活动，两边几乎碰不到一起。加上窃取端可能有多个线程同时来偷，所以这一端用 CAS 保证同一个任务不会被两个人拿走，而主人这一端几乎没有竞争——**竞争被压缩到很小，是工作窃取性能好的第一个原因。**

为什么偷最旧的、而不是最新的？还有一个隐含理由：任务被 fork 的顺序大致就是拆分的顺序，**越早 fork 的越接近树的根、粒度越大**。小偷拿一个大任务走，比拿一个马上要算完的碎任务划算得多。

到这里可以看清一半了：**ForkJoinPool 快的第一个原因是"队列分散 + 两端错开"，把竞争降下来了。** 那另一半呢？看 `join`。

### 四、fork 和 join 到底做了什么

这两个方法的名字很容易让人误解，值得逐个掰开。

**`fork()` 不是启动新线程。** 它本身不启动新线程、也不执行任务，只是把子任务压进当前线程自己的队列，等有人来取——队列原本是空的时候，会顺带唤醒一下空闲的工作线程。至于谁取、什么时候取，都不是 `fork` 决定的。

这里还埋着一个很实在的坑：`ForkJoinTask.fork()` 内部会先判断当前线程是不是 `ForkJoinWorkerThread`，**如果不是，任务会被丢给 `commonPool`**。

`// 看个反例：想让任务跑在自定义池里，结果……   ForkJoinPool pool = new ForkJoinPool(4);   new SumTask(data, 0, data.length).fork();   // 跑在 commonPool 上了，不是 pool！`

所以想用自定义池，**必须通过 `pool.invoke(task)` 或 `pool.submit(task)` 提交**，不能从外面直接 `fork()`。

> Warning
> 
> 这是最容易被忽略的一个坑：**`fork()` 认的是"当前线程属于哪个池"，不是"这个任务想用哪个池"**。只要不在工作线程里，它一律甩给 `commonPool`，你自己 new 出来的池形同虚设。

**`join()` 也不是单纯的阻塞。** 普通线程池里等一个 `Future`，线程就挂起了；而工作线程执行 `join` 时如果发现任务还没完成，它会**顺手去别的队列里偷活干**，一边干一边等，直到目标任务完成再回来继续。

把它连起来看，就是下面这个过程：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**注意 `W1` 那一步：它本来应该"卡在"等左边结果，实际却在干活。** 这就是 ForkJoinPool 的第二层收益——**等待的时间被用来做别的任务，CPU 不空转，池子不用靠多开线程来维持满载**。

### 五、join 不闲等是它的优势，也是它的软肋

这个机制的成立，依赖一个没说出口的前提：**任务得是纯计算、且还能继续拆的**。

如果任务里混进了阻塞操作，比如等数据库响应、抢分布式锁、读磁盘，情况就完全反过来了：

*   • 被阻塞的线程既不能继续算，也不能去偷活；
    
*   • 如果池里的线程**全部**卡在阻塞上，整个池就"假死"了——外面的任务一直排队，里面一条能动的线程都没有。
    

> Warning
> 
> 阻塞是 ForkJoinPool 的命门：线程一卡住，既不能继续算，也不能去偷活。**池里线程全被卡满，整个池就"假死"**——外面的任务一直排队，里面一条能动的线程都没有。

JDK 提供了一个补救手段 `ManagedBlocker`，思路是"提前告诉池子我要阻塞了，你赶紧补一条线程顶上"。官方给的基于 `ReentrantLock` 的标准写法是这样：

`class ManagedLocker implements ForkJoinPool.ManagedBlocker {    private final ReentrantLock lock;    private boolean hasLock = false;      // 记住锁是不是已经到手          ManagedLocker(ReentrantLock lock) {        this.lock = lock;       }    @Override    public boolean block() {        if (!hasLock) {                   // 还没拿到才真去阻塞               lock.lock();           }        return true;       }    @Override    public boolean isReleasable() {        return hasLock || (hasLock = lock.tryLock());  // 能立刻拿到，就不必走阻塞       }   }      // 使用方：managedBlock 返回后才真正持锁，释放仍由调用方负责   ForkJoinPool.managedBlock(new ManagedLocker(lock));   try {    // 拿到锁之后的临界区   } finally {       lock.unlock();   }`

但要说清楚：**它是补偿机制，不是让阻塞消失**。池子补线程也受最大线程数限制——**线程数一旦顶到 `maximumPoolSize` 补不出新线程，池子会直接抛 `RejectedExecutionException`**；而且频繁创建线程本身也有开销。**真正靠谱的做法是别把阻塞逻辑塞进 ForkJoinPool**——这也是这道题最容易聊到生产实践的地方。

### 六、commonPool：默认共享，也是最容易踩的坑

`ForkJoinPool.commonPool()` 是 JVM 级别的单例，**并行度默认为 `availableProcessors() - 1`（单核时为 1）**，可以用系统属性 `java.util.concurrent.ForkJoinPool.common.parallelism` 调整。要注意这个属性**只在 commonPool 首次初始化时读一次**，所以必须写成 JVM 启动参数：

`java -Djava.util.concurrent.ForkJoinPool.common.parallelism=8 MyApp`

进程跑起来之后再 `System.setProperty` 是无效的——而且要留神，框架或日志库可能已经抢先一步把 commonPool 拉起来了。

谁在用这个池？`parallelStream()`、`CompletableFuture` 的 `supplyAsync` / `runAsync`（不传 executor 时）、`Arrays.parallelSort()`，默认全走它。

问题就出在"共享"两个字上：**它是公共资源，你在任何一个并行流里写一段阻塞代码，占用的是全 JVM 所有共用者的并行度。** 一个接口把池子占满，另一个毫不相干的 `parallelStream` 就得排在后面。

> Warning
> 
> commonPool 是**全 JVM 共享**的：任何一处阻塞代码占住的都是所有共用者的并行度。一个不相关的接口把池子打满，你这边毫不相干的 `parallelStream` 就得干等。

对比项

`new ForkJoinPool(n)`

`ForkJoinPool.commonPool()`

生命周期

自己创建、自己 `shutdown`

JVM 单例，随进程存活

并行度

构造时指定

`availableProcessors() - 1`

，可用系统属性调整

是否被并行流默认使用

不会

默认就是它

阻塞任务的影响范围

只影响自己这个池

影响全 JVM 所有共用者

谁在用

你自己的分治任务

并行流、`CompletableFuture`、`Arrays.parallelSort`

**结论很直接：只要任务里有阻塞，就别把它放在 commonPool 上，该建自己的池就建自己的池。**

如果确实想让并行流跑在自定义池里，有个流传很广的写法——**利用"并行流会复用当前线程所属的池"这个特性去借池**：

`ForkJoinPool pool = new ForkJoinPool(8);   try {    long count = pool.submit(() ->               list.parallelStream().filter(this::slowCheck).count()       ).get();   } finally {       pool.shutdown();   }`

> Warning
> 
> 这是借助内部行为的技巧，并非官方推荐的 API 用法。要不要用，取决于你是否真的需要给并行流划定独立的并行度和隔离性——如果只是想跑个后台任务，直接建个 `ThreadPoolExecutor` 更省心。

### 七、几个容易答错的点，顺手辨析一下

**`RecursiveTask`、`RecursiveAction`、`CountedCompleter` 怎么选？**

类

返回值

适用场景

`RecursiveTask<V>`

有

需要汇总结果的拆分任务，如求和、求最大值

`RecursiveAction`

无

只做副作用，如批量遍历处理

`CountedCompleter<T>`

通常无（多为 `CountedCompleter<Void>`，需要结果时覆写 `getRawResult()`）

仍然用 `fork` 提交子任务，但不 `join`，靠 `tryComplete()` 的完成计数触发 `onCompletion` 回调，适合树形聚合（JDK 8 引入）

**`invoke`、`submit`、`execute` 的区别？**`invoke` 提交后**阻塞等结果**；`submit` 提交后返回一个 `ForkJoinTask`，结果可以之后再 `join`；`execute` 提交 `Runnable`，不等结果。

**ForkJoinPool 有拒绝策略吗？****没有 `ThreadPoolExecutor` 那套 `RejectedExecutionHandler`。** 任务多了主要是排队，不会丢；调 `invoke`，或者对返回的 task 调 `get` / `join` 等结果时，提交者才会被阻塞。抛 `RejectedExecutionException` 只有两种情形：**一是池已经 `shutdown` / terminating，二是内部资源耗尽**——JDK 17 之后后者表现为线程即将在 `join` 或 `ManagedBlocker` 里阻塞、而线程数已顶到 `maximumPoolSize` 补不出新线程（默认就会抛，除非构造时传入了返回 `true` 的 `saturate` 谓词）。这一点和 `ThreadPoolExecutor` 的行为差别很大，容易被问到。

最后把两个池摆在一起对比，答案会更清楚：

维度

`ThreadPoolExecutor`

`ForkJoinPool`

队列结构

一个共享阻塞队列

每线程一个双端队列 + 通用外部队列

任务形态

相互独立的任务

可递归拆分的分治任务

等待行为

线程挂起，等结果

工作线程会去偷活干，不空等

适合的任务

IO 密集 / 相互独立

CPU 密集 / 可拆分

队列满 / 任务过多

可配置拒绝策略

无拒绝策略；任务排队不丢，调 `invoke` / `get` 等结果时提交者被阻塞

典型使用者

业务线程池

并行流、`CompletableFuture`、虚拟线程调度器

**所以选哪个不看"谁更快"，看任务能不能拆：能递归拆的优先 ForkJoinPool；相互独立、尤其带阻塞的，老老实实用 ThreadPoolExecutor。**

> Tip
> 
> 选型就一句话：**能递归拆的优先 ForkJoinPool，相互独立、尤其带阻塞的老老实实用 ThreadPoolExecutor**。别问谁更快，先问任务能不能拆。

### 八、加分项：JDK 21 虚拟线程的调度器，也是它

如果面试聊到 JDK 21，这里还能再补一句：**虚拟线程的载体线程调度器，底层就是一个专用 `ForkJoinPool`**，只不过它用的是异步 FIFO 模式，而不是默认的 LIFO——因为虚拟线程的任务之间没有父子关系，不需要 LIFO 那套缓存局部性优化。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这也顺带解释了另一件事：**把虚拟线程拿去做 CPU 密集型计算并不划算**。载体池的并行度还是核数那么多，工作窃取能解决的是"有的线程没活干"，解决不了"活本来就比核多"。虚拟线程的价值在 IO 密集场景，这一点别混。

> Note
> 
> 别和 `commonPool` 混：虚拟线程用的是**专用池**（并行度 = 核数），`commonPool` 是**共享池**（并行度 = 核数 - 1），两者互不相干。

### 面试口语回答模板

> ForkJoinPool 是 JDK 7 加的线程池，专门干"大任务拆小任务"这种活。JDK 8 之后，并行流和 CompletableFuture 默认都跑在它上面，就是一个叫 commonPool 的公共实例。
> 
> 它跟 ThreadPoolExecutor 最大的区别在队列。ThreadPoolExecutor 就一个队列，大家都挤在那儿抢；ForkJoinPool 是每个线程自己一个双端队列，我 fork 出来的子任务放我自己这儿，不用跟人抢。工作窃取就建在这个基础上——自己队列空了不等于歇着，去别人队列里偷一个来算。两边取的方向还是反的：自己从最新那头取，后进先出，因为刚拆出来的子任务数据还热在缓存里；偷从最旧那头偷，先进先出，因为最旧的是还没拆开的最大一块，偷一次够干很久。方向错开，冲突就小了。

> join 也挺反直觉，它不是干等着。工作线程等子任务结果的时候，如果还没算完，它会顺手去帮别人干活，干着等。所以等待期间 CPU 没闲着，这是它比 ThreadPoolExecutor 快的另一半原因。
> 
> 但前提是任务得是纯计算、还能接着拆的。要是任务里有阻塞，比如查数据库、抢锁，线程就卡住了，既不能算也不能偷，池里线程全卡住的话整个池就假死了。JDK 有个 ManagedBlocker 能做线程补偿，但那是补救不是解决，最好别在 ForkJoinPool 里做阻塞。

> 所以实际用的时候得注意，commonPool 是共享的，并行度默认是核数减一，你在里面写阻塞代码，坑的是所有共用它的地方。真有阻塞，要么建自己的池，要么直接用 ThreadPoolExecutor。再补一句，JDK 21 虚拟线程的调度器，底层也是一个 ForkJoinPool。

### 一句话总结

**ForkJoinPool 快在"分治任务不空等"：每个工作线程一个双端队列，自己从最新端 LIFO 取任务、闲时从别人最旧端 FIFO 偷任务，join 等待期间还会顺手干活；代价是它对阻塞任务毫无办法，所以 commonPool 里千万别放阻塞逻辑。**