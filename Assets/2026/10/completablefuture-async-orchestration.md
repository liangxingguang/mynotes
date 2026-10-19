# CompletableFuture：异步编排的正确写法

> 来源：微信公众号，原文链接：https://mp.weixin.qq.com/s/qr1AojU66kbWv43wsMDghg

我见过有人把一个接口用 CompletableFuture 改成"异步"，结果比同步还慢，还顺手把公共线程池打挂了。毛病出在两处：用了默认线程池，还没加超时。CompletableFuture 是个好东西，但用错比不用还惨。这篇把异步编排怎么写才对，讲清楚。

* * *

## 一、先搞懂：为什么不用 Future

Java 5 的 Future，`get()` 是阻塞的——拿不到结果就干等。更致命的是它不能组合：想"等 A 和 B 都完再干 C"，Future 写起来得自己起线程 `join`，乱成一团。CompletableFuture 就是来解决这个的：它支持 `thenApply` / `thenCompose` / `thenCombine` / `allOf`，能把一堆异步任务像 pipeline 一样串起来，而且全程非阻塞。

但 CF 强大归强大，它有几个坑，踩中任何一个，线上都能让你怀疑人生。

* * *

## 二、最致命的坑：默认线程池

这是第一坑，也是最多人栽的。`supplyAsync` / `runAsync` 不传线程池时，默认用 `ForkJoinPool.commonPool()`——一个 JVM 级的共享池，并行度默认是 CPU 核数减一。

问题来了：这个池子是所有用 CF 默认行为的代码共用的，而且它是为 CPU 密集型设计的。你要是用它跑 IO 任务（远程调用、查库），一个慢下游就能把池子占满，其他也用公共池的业务跟着慢甚至饿死。我那个"比同步还慢"的接口，根子就在这：公共池被 IO 阻塞占满，本来想加速，结果全员排队。

正确写法永远是显式传一个自定义线程池：

`CompletableFuture.supplyAsync(() -> callRemote(), bizExecutor);`

`bizExecutor` 按你的 IO 并发度单独配，跟公共池隔离。这一步不做，后面全白搭。

* * *

## 三、异常被吞：不接就当没发生

CF 链上任何一个环节抛异常，如果你没用 `exceptionally` 或 `handle` 接住，这个异常就被"吞"了——你不调 `get()` 永远不会暴露，任务实际失败了，监控、日志全看不到。这跟 ThreadPoolExecutor 里 `submit` 吞异常是同一个道理。

记住：要么链路末端加 `exceptionally` 返回降级值，要么用 `handle` 同时处理正常和异常结果。别指望它自己报错。

* * *

## 四、没有超时：线程能挂一辈子

CF 本身没有超时保护。下游卡死，你的 future 就一直挂着，占着线程不释放。Java 8 没有原生超时 API，得自己用 `future.get(timeout)` 包一层，超时抛 `TimeoutException` 后记得 `cancel`。Java 9 之后有了 `orTimeout` / `completeOnTimeout`，写起来干净很多。

不管哪个版本，异步调用必须带超时，否则一个慢依赖能拖挂整条链路。

* * *

## 五、thenApply 还是 thenCompose：别套娃

顺带提一个容易写错的点。`thenApply` 的参数是 Function，返回的是"结果"，所以如果你在 `thenApply` 里又返回了一个 CompletableFuture，就会变成 `CompletableFuture<CompletableFuture<T>>`，套娃了。要把两个异步串起来（前一个的结果喂给后一个异步），用 `thenCompose`，它会帮你扁平化。搞混的话，不光类型难看，执行时机也会不对。

* * *

## 六、生产落地清单

1. **永远显式传自定义线程池**，别用 `commonPool`——这是地基。
2. **异常必须 `exceptionally` / `handle` 接住**，别让任务静默失败。
3. **必须加超时**：Java 9+ 用 `orTimeout`，Java 8 用 `get(timeout)` 兜底并 `cancel`。
4. **别盲目并行**：IO 并发度按下游 RT 和容量估算，池子打满反而更慢。
5. **多任务汇总用 `allOf`（等全部）/ `anyOf`（等任意一个）**，别 `for` 循环串行 `get`。

* * *

## 写在最后

CompletableFuture 让异步编排从"自己起线程 join"变成"声明式 pipeline"，省了太多体力活。但它不是免死金牌：默认池、吞异常、没超时，随便中一个就能让"异步优化"变成"线上事故"。把这三条红线记牢，再配合 `allOf` 做聚合，你写的异步代码才真的又快又稳。

这条"并发基础"线到这就收官了——从 volatile、synchronized、AQS、线程池到 CF，五个坑讲完。下一篇开始转入 JVM 主线，聊内存模型那些事。

* * *

**📚 相关阅读**

- ThreadPoolExecutor：7 个参数里的坑
- AQS 核心：CLH 队列与 state 的设计
- synchronized 的锁升级：偏向锁为什么被废弃
- volatile 到底保证了什么
- 灰度发布与优雅停机：发版不用再心惊胆战

原文话题标签：Java / 高并发 / CompletableFuture / 异步编程 / 后端开发 / 并发编程 / 性能优化
