---
title: CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读
source: 微信公众号（奇点智慧小助手，专辑《arthas使用》第 3 篇）
source_url: https://mp.weixin.qq.com/s?__biz=Mzg4MjE2Nzk0NQ==&mid=2247483861&idx=1&sn=48e17d6de6e4c2eecb0b9151f04041de&chksm=cf5b9833f82c11257f96c5790ad9f1b17054e315999c77a8e7e182cc24925c76d2dc9499e5c8
source_type: article
platform: 微信公众号
captured: 2026-10-31
registered_at: 2026-10-31
inbox_ref: Inbox/2026-10-31-arthas-03-thread-command.md
asset_ref: Assets/2026-10/weixin-20261031-arthas-03-thread-command.md
---

# CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读

> 线程问题的难点不在命令，在读栈：同样是"卡住"，可能是 RUNNABLE 在等 IO、BLOCKED 在等锁、或者线程池根本没空闲线程。这篇讲 thread 的三条用法、读栈的顺序、线程池耗尽的识别方法，以及三个最容易误判的地方。

线程问题是线上排查里最容易被带偏的一类。

因为它的表现都差不多：接口变慢、请求堆积、CPU 飙高。但**背后的原因可能是三件完全不同的事**，用错方向就会查一整天。

`thread` 这个命令本身很简单，难的是看到那几十行栈之后怎么读。

![同样是卡住，可能是三种原因](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "同样是卡住，可能是三种原因")

## 先分清三种"卡"

**第一种：CPU 真的在被算。** 线程状态是 RUNNABLE，而且它确实在执行你的业务代码。这类问题通常是死循环、正则回溯、大对象序列化。

**第二种：在等锁。** 线程状态是 BLOCKED，等的是 `synchronized` 的 monitor。特征是**一堆线程停在同一个位置**。

**第三种：在等外部响应。** 线程状态也是 RUNNABLE，但它停在 socket 读、数据库连接、HTTP 调用上。看着像在跑，其实什么都没算。

这三种的解法完全不同：第一种改代码，第二种拆锁或降并发，第三种要去看下游。

## thread 的三条用法

**`thread -n 3`**：列出最忙的三个线程。CPU 高的时候第一条就敲它。

**`thread -b`**：找出阻塞其他线程的那个线程。怀疑死锁或大面积卡顿时用它，比人眼翻栈快得多。

**`thread 线程号`**：看指定线程的完整调用栈。前两条定位到线程之后，用这条看细节。

## 读栈的顺序：状态 → 你的代码 → 卡在等什么

一屏栈有几十行，从上往下读会乱。按这个顺序看：

**第一步，看状态。** RUNNABLE、BLOCKED、WAITING、TIMED\_WAITING，四个状态指向四个方向。

**第二步，找你自己的包名。** 栈里最上面几帧通常是 JDK 的，往下翻到你的 `com.xxx` 包，那才是问题发生的地方。

**第三步，看它卡在哪个方法上。** 如果是 `socketRead0`、`pooledConnection`、`await`，那它不是在算，是在等。

一个简单的判断：**状态是 RUNNABLE，但 CPU 并不高——它多半在等 IO。**

![读栈的顺序](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E> "读栈的顺序")

## 线程池耗尽，长什么样

线程池打满有个很明显的特征：**线程名成批出现，编号连成一片。**

比如 `pool-1-thread-1` 到 `pool-1-thread-200`，全部停在同一个提交点或同一个下游调用上。这说明池子里的线程都被占住了，新任务在队列里排队。

这种情况用 `thread -n` 看单个线程没用，要看**总量和分布**。所以更直接的判断来自两个地方：线程总数（`dashboard` 里能看到）、以及排队任务的堆积情况。

**线程池耗尽不是线程的问题，是下游变慢导致的连锁反应。** 修线程池参数只能缓解，根因还在下游。

## 三个最容易误判的地方

**一、RUNNABLE 不等于在算。** 前面说过，等 IO 的线程也是 RUNNABLE。看到 RUNNABLE 就认定"CPU 是它烧的"，是最常见的错。

**二、CPU 高可能是 GC 线程，不是业务线程。**`thread -n 3` 如果排在前面的线程名是 `GC`、`G1`、`C2 CompilerThread` 这类，问题就不在业务代码，去看内存和 GC。

**三、一次采样不能代表持续。**`thread` 是抓当下的快照。偶尔抓到一帧正常，不等于没问题。**隔几分钟再抓一次**，两次都指向同一个方法，才值得下结论。

## 一张对照表

现象

先看什么

往哪走

CPU 高

`thread -n 3`

业务线程 → 查代码；GC 线程 → 查内存

大面积卡顿

`thread -b`

找阻塞源，看锁的粒度

请求堆积

线程总数 + 线程名分布

下游变慢或池太小

偶发超时

隔几分钟抓两次栈

两次同点才算线索

* * *

`thread` 的价值不是"看到线程在干什么"，是**帮你排除掉两个错误方向**。

排掉"不是在算"和"不是在等锁"，剩下的可能性就不多了。

* * *

> 本文讲的是读栈思路，具体参数以你所使用版本的官方文档为准；生产环境操作请先在测试环境验证，风险自负。
