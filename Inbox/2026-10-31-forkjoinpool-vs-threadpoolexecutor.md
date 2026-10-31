---
id: 2026-10-31-forkjoinpool-vs-threadpoolexecutor
title: 高频面试题：ForkJoinPool 凭什么比 ThreadPoolExecutor 快？（工作窃取与 join 的真相）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/OWGCpNVxy0HpPvn8aq1eCA
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - 课程
asset_ref: Assets/2026-10/weixin-20261031-OWGCpNVxy0HpPvn8aq1eCA.md
wiki_status: pending
---

# 高频面试题：ForkJoinPool 凭什么比 ThreadPoolExecutor 快？工作窃取算法与 join 的真相

> 摘要：一道并发高频面试题。表面考池子实现，实际考「分治型任务怎么调度」；准确答案不是「它更快」，而是「它在一种特定任务上更快」——能递归拆分的 CPU 密集任务。快在两层：队列分散到每线程一个双端队列、工作窃取两端取方向错开；`join` 等待时顺手干活不空转。命门是对阻塞任务毫无办法，`commonPool` 里千万别放阻塞逻辑。

## 核心要点

- **考的是「分治型任务怎么调度」**：`parallelStream()` 与 `CompletableFuture` 不指定执行器时默认都是 `ForkJoinPool.commonPool()`。`ThreadPoolExecutor` 的假设是任务彼此独立、互不依赖，所以全部扔进同一个队列、所有线程从同一队列抢。ForkJoinPool 解决的是「大任务能递归拆成小任务，小任务各自算完再合并结果」——**Fork 是拆，Join 是合**。
- **第一层快在「队列分散」**：ForkJoinPool 把队列拆开——**每个工作线程各自持有一个双端队列**（源码叫 `WorkQueue`），另有通用队列专门接外部提交的任务。`fork()` 出来的子任务推进的是「当前线程自己那个队列」，把「所有线程抢一个队列」降到「基本各玩各的」。
- **第二层快在工作窃取的方向错开**：队列空了的线程不闲着，会去别的线程队列「偷」任务。默认同步模式下两端方向相反——主人从最新入队的一端（`top`）取，**LIFO**（刚切出的子任务依赖的数据还在 CPU 缓存里，命中率最高，且不跟来偷的人抢同一位置）；窃取者从最旧的一端（`base`）取，**FIFO**（最旧的是还没拆开的最大一块，粒度最粗，偷一次够算很久）。口诀：**自己取最近的，偷别人取最远的**。主人只在 `top` 附近活动、小偷只在 `base` 附近活动，冲突极小；窃取端可能有多个线程同时来偷，故该端用 CAS 保证同一任务不被两人拿走，主人端几乎无竞争。还有一层隐含理由：任务 fork 顺序大致等于拆分顺序，**越早 fork 的越接近树的根、粒度越大**。
- **`fork` 和 `join` 都不是字面意思**：`fork()` **不启动新线程、也不执行任务**，只是把子任务压进当前线程自己的队列，队列原本为空时顺带唤醒空闲工作线程。`join()` 也**不是单纯阻塞**——工作线程发现任务未完成时会**顺手去别的队列偷活干，一边干一边等**。这就是第二层收益：**等待时间被用来做别的任务，CPU 不空转，池子不用靠多开线程维持满载。**
- **最大的坑：`fork()` 认的是「当前线程属于哪个池」**：`ForkJoinTask.fork()` 内部先判断当前线程是不是 `ForkJoinWorkerThread`，**如果不是，任务会被丢给 `commonPool`**。所以 `new ForkJoinPool(4)` 之后从外面直接 `task.fork()`，实际跑在 commonPool 上、你自己的池形同虚设——**必须通过 `pool.invoke(task)` 或 `pool.submit(task)` 提交。**
- **命门是阻塞**：这个机制成立依赖一个没说出口的前提——**任务得是纯计算、且还能继续拆**。混入阻塞（等 DB、抢分布式锁、读磁盘）后：被阻塞线程既不能继续算也不能偷活；**池里线程全被卡满 → 整个池「假死」**，外面的任务一直排队、里面一条能动的线程都没有。JDK 提供 `ManagedBlocker` 做线程补偿（`block()` 里真正 `lock.lock()`，`isReleasable()` 用 `tryLock()` 判断能否立刻拿到），**但它是补偿机制、不是让阻塞消失**：补线程受 `maximumPoolSize` 限制，顶到上限补不出新线程会直接抛 `RejectedExecutionException`，频繁创建线程本身也有开销。**真正靠谱的做法是别把阻塞逻辑塞进 ForkJoinPool。**
- **`commonPool` 是全 JVM 共享的**：并行度默认 `availableProcessors() - 1`（单核为 1），可用 `-Djava.util.concurrent.ForkJoinPool.common.parallelism=8` 调整，**但该属性只在 commonPool 首次初始化时读一次**，进程跑起来后再 `System.setProperty` 无效，且框架或日志库可能已抢先一步把它拉起来。`parallelStream()`、`CompletableFuture.supplyAsync/runAsync`（不传 executor）、`Arrays.parallelSort()` 默认全走它——**任何一处阻塞占住的都是所有共用者的并行度**。给并行流指定池可利用「并行流复用当前线程所属池」的特性借池（`pool.submit(() -> list.parallelStream()...)`），但这是借助内部行为的非官方用法。**结论：任务里有阻塞就别放 commonPool，该建自己的池就建。**
- **JDK 21 加分项与选型**：虚拟线程的载体线程调度器底层就是一个**专用 ForkJoinPool**，但用的是**异步 FIFO 模式**而非默认 LIFO（虚拟线程任务之间没有父子关系，不需要缓存局部性优化）；注意虚拟线程用专用池（并行度 = 核数），`commonPool` 是共享池（核数 - 1），**两者互不相干**。把虚拟线程拿去做 CPU 密集型计算不划算——载体池并行度仍是核数那么多，工作窃取解决的是「有的线程没活干」，解决不了「活本来就比核多」。选型一句话：**能递归拆的优先 ForkJoinPool，相互独立、尤其带阻塞的老实用 ThreadPoolExecutor；别问谁更快，先问任务能不能拆。**

## 正文

> 采集说明：原文约 1.11 万字符，已一次通读。抓取时**配图全部未加载**（残留 5 处 1px SVG 占位符）；正文中 6 段代码块**被压成一行**、6 处对比表格**字段错位**（字段名与字段值被拆成多行），均已在上方要点中归并还原，代码可读性以原文为准。文字完整。

**对比表（已还原）**：`ThreadPoolExecutor` vs `ForkJoinPool`——队列结构：一个共享阻塞队列 / 每线程一个双端队列 + 通用外部队列；任务形态：相互独立 / 可递归拆分的分治任务；等待行为：线程挂起等结果 / 工作线程会去偷活干不空等；适合任务：IO 密集、相互独立 / CPU 密集、可拆分；队列满或任务过多：可配置拒绝策略 / 无拒绝策略，任务排队不丢，调 `invoke`/`get` 等结果时提交者被阻塞；典型使用者：业务线程池 / 并行流、`CompletableFuture`、虚拟线程调度器。

**`new ForkJoinPool(n)` vs `ForkJoinPool.commonPool()`**：生命周期——自己创建自己 `shutdown` / JVM 单例随进程存活；并行度——构造时指定 / `availableProcessors() - 1` 可用系统属性调整；是否被并行流默认使用——不会 / 默认就是它；阻塞任务影响范围——只影响自己这个池 / 影响全 JVM 所有共用者。

**易错点辨析**：① `RecursiveTask<V>` 有返回值、适合需要汇总结果的拆分任务（求和、求最大值）；`RecursiveAction` 无返回值、适合只做副作用的批量遍历处理；`CountedCompleter<T>` 多为 `CountedCompleter<Void>`、需要结果时覆写 `getRawResult()`，仍用 `fork` 提交子任务但不 `join`，靠 `tryComplete()` 的完成计数触发 `onCompletion` 回调，适合树形聚合（JDK 8 引入）。② `invoke` 提交后阻塞等结果；`submit` 提交后返回 `ForkJoinTask`，结果可之后再 `join`；`execute` 提交 `Runnable`、不等结果。③ **ForkJoinPool 没有 `ThreadPoolExecutor` 那套 `RejectedExecutionHandler`**——任务多了主要是排队不会丢；抛 `RejectedExecutionException` 只有两种情形：池已 `shutdown`/terminating，或内部资源耗尽（JDK 17 之后表现为线程即将在 `join` 或 `ManagedBlocker` 里阻塞、而线程数已顶到 `maximumPoolSize` 补不出新线程，默认会抛，除非构造时传入了返回 `true` 的 `saturate` 谓词）。这一点与 `ThreadPoolExecutor` 行为差别很大，容易被问到。

**分治模板（原文给的三步）**：够小就直接算，不够就拆；拆一个 `fork()` 出去，留一个自己 `compute()`，最后 `join()` 回来。**留一个自己算，省掉一次入队和线程唤醒，是标准姿势。**

**JDK 21 虚拟线程部分**：把虚拟线程拿去做 CPU 密集型计算并不划算——载体池并行度还是核数那么多，工作窃取能解决的是「有的线程没活干」，解决不了「活本来就比核多」。虚拟线程的价值在 IO 密集场景，这一点别混。

**面试口语回答模板（原文提供，可直接使用）**：ForkJoinPool 是 JDK 7 加的线程池，专门干「大任务拆小任务」这种活；JDK 8 之后并行流和 CompletableFuture 默认都跑在它上面的 commonPool 上。它跟 ThreadPoolExecutor 最大的区别在队列——后者就一个队列大家都挤在那儿抢，前者是每个线程自己一个双端队列，我 fork 出来的子任务放我自己这儿不用跟人抢。工作窃取就建在这个基础上，两边取的方向还是反的：自己从最新那头取、后进先出，因为刚拆出来的子任务数据还热在缓存里；偷从最旧那头偷、先进先出，因为最旧的是还没拆开的最大一块，偷一次够干很久。`join` 也挺反直觉，它不是干等着——工作线程等子任务结果的时候如果还没算完，会顺手去帮别人干活，干着等，所以等待期间 CPU 没闲着，这是它比 ThreadPoolExecutor 快的另一半原因。但前提是任务得是纯计算、还能接着拆；要是有阻塞（查数据库、抢锁）线程就卡住了，既不能算也不能偷，池里线程全卡住的话整个池就假死了。JDK 有 ManagedBlocker 能做线程补偿，但那是补救不是解决。所以实际用的时候得注意，commonPool 是共享的，并行度默认是核数减一，你在里面写阻塞代码坑的是所有共用它的地方，真有阻塞要么建自己的池、要么直接用 ThreadPoolExecutor。再补一句，JDK 21 虚拟线程的调度器底层也是一个 ForkJoinPool。

**一句话总结（原文）**：**ForkJoinPool 快在「分治任务不空等」：每个工作线程一个双端队列，自己从最新端 LIFO 取任务、闲时从别人最旧端 FIFO 偷任务，join 等待期间还会顺手干活；代价是它对阻塞任务毫无办法，所以 commonPool 里千万别放阻塞逻辑。**

## 来源

- 原文：<https://mp.weixin.qq.com/s/OWGCpNVxy0HpPvn8aq1eCA>

## 附件

- [[Assets/2026-10/weixin-20261031-OWGCpNVxy0HpPvn8aq1eCA.md]]
