# Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？

大家好，这里是 Netty 源码分析系列的第 9 篇。

前面我们讲了 EventLoopGroup 的结构、Channel 的注册流程。今天，我们把目光聚焦到最核心的地方——**NioEventLoop 的 run() 方法**。

为什么要深入这一行代码？因为：

> **NioEventLoop.run() 就是 Netty 的"主循环"——所有网络事件的接收、分发、处理，全在这里。**

可以这么说，整个 Netty 服务端在运行时，绝大多数 CPU 时间都花在一个个 NioEventLoop 线程的 run() 方法里。搞懂它，就搞懂了 Netty 的运行时。

* * *

## 一、run() 的全貌

先不急着看源码，想想你期望一个网络事件循环应该是什么样的？

```
while (服务器没关闭) {    1. 检查有没有 IO 事件（OP_ACCEPT, OP_READ 等）    2. 有 → 处理    3. 处理非 IO 任务（定时任务、用户提交的任务）    4. 回到 1}
```

而 Netty 的 NioEventLoop.run() 做的就是这个事，但它做了很多**性能优化**和**防坑处理**。我们直接看源码：

```
@Overrideprotected void run() {    int selectCnt = 0;  // 记录 select 次数，用于检测空轮询 BUG    for (;;) {        try {            int strategy;            try {                // ★ 关键：根据是否有任务来决定 select 策略                strategy = selectStrategy.calculateStrategy(selectStrategy,                                                            hasTasks() || hasScheduledTasks());                switch (strategy) {                case SelectStrategy.CONTINUE:  // 外部要求重试                    continue;                case SelectStrategy.BUSY_WAIT: // 繁忙等待（非 NIO 支持）                    strategy = selectCnt;                    break;                case SelectStrategy.SELECT:    // 没有任务→阻塞 select                    strategy = select(curDeadlineNanos);                    break;                default:                    // other cases                }            } catch (IOException e) {                rebuildSelector0();                selectCnt = 0;                handleLoopException(e);                continue;            }            selectCnt++;  // 完成一次 select            cancelledKeys = canceller.run();  // 处理取消的 key            needsToSelectAgain = false;            // ★ IO 事件处理与任务执行的比例控制            final int ioRatio = this.ioRatio;            boolean ranTasks;            if (ioRatio == 100) {                try {                    if (strategy > 0) {                        processSelectedKeys();  // 处理 IO 事件                    }                } finally {                    ranTasks = runAllTasks();   // 处理所有非 IO 任务                }            } else if (strategy > 0) {                final long ioStartTime = System.nanoTime();                try {                    processSelectedKeys();  // 处理 IO 事件                } finally {                    final long ioTime = System.nanoTime() - ioStartTime;                    // 按 ioRatio 控制任务执行时间                    ranTasks = runAllTasks(ioTime * (100 - ioRatio) / ioRatio);                }            } else {                ranTasks = runAllTasks(0);  // 没有 IO 事件，只跑任务            }            // ★ 空轮询 BUG 检测            if (ranTasks || strategy > 0) {                selectCnt = 1;  // 有实际工作，重置计数            } else if (selectCnt > SELECTOR_AUTO_REBUILD_THRESHOLD) {                // 连续 SELECTOR_AUTO_REBUILD_THRESHOLD(512) 次 select 返回 0                // 判定为 JDK 空轮询 BUG，重建 Selector                rebuildSelector();                selectCnt = 0;                handleLoopException(new IOException("..."));                break;            }            // 处理优雅关闭            if (isShuttingDown()) {                closeAll();                if (confirmShutdown()) {                    break;                }            }        } catch (CancelledKeyException e) {            // JDK 的已知 BUG，吞掉继续        } catch (Error e) {            throw e;        } catch (Throwable t) {            handleLoopException(t);        }    }}
```

猛一看代码量不小，但核心就三层：

1.  **select 策略** — 决定用阻塞还是非阻塞的方式等事件
    
2.  **IO 比例控制** — 处理 IO 事件和任务的时间分配
    
3.  **空轮询检测** — 对抗 JDK 著名的 epoll bug
    

下面一层层拆。

* * *

## 二、SelectStrategy：阻塞还是不阻塞？

```
strategy = selectStrategy.calculateStrategy(selectStrategy,                                             hasTasks() || hasScheduledTasks());
```

这段代码在问一个问题：**当前有没有待执行的非 IO 任务？**

*   如果**有待执行任务** → selectStrategy 返回 `SelectStrategy.SELECT` → 阻塞 select（最多等一个 timeout）
    
*   如果**没有任务** → selectStrategy 直接返回 `selectCnt` → 不做 select 操作
    

等等，这里有一个反直觉的地方：**有任务的时候反而走阻塞 select？**

其实逻辑是这样的：

```
calculateStrategy(selectNowSupplier, hasTasks) {    if (hasTasks) {        // 有任务要执行→非阻塞 select，立即返回然后去跑任务        return selectNowSupplier.get();  // 调 Selector.selectNow()    } else {        // 没有任务→可以安心地阻塞 select 等事件        return SELECT;    }}
```

这里的逻辑非常简单：

*   **有任务跑**：用 `selectNow()` 非阻塞扫一遍 IO 事件，然后赶紧去处理任务
    
*   **没任务跑**：用 `select(timeout)` 阻塞等，减少 CPU 空转
    

这个策略的核心思想是：**IO 事件不需要立刻处理，但用户提交的任务应该尽快执行。** 因为用户任务可能包含 `close()`、`write()` 这类对及时性敏感的操作。

* * *

## 三、ioRatio：IO 吃 CPU 还是任务吃 CPU？

Netty 有一个**默认 50%** 的 IO 比例控制：

```
final int ioRatio = this.ioRatio;  // 默认 50
```

这个值的意思是：**在一个循环周期内，IO 事件处理时间不允许超过任务执行时间。**

具体算法：

*   先记录处理 IO 事件花了多长时间（`ioTime`）
    
*   任务执行时间的上限 = `ioTime * (100 - ioRatio) / ioRatio`
    
*   如果 `ioRatio = 50`，任务执行时间上限 = `ioTime * 50 / 50 = ioTime`（与 IO 时间相同）
    
*   如果 `ioRatio = 70`，任务执行时间上限 ≈ `ioTime * 30 / 70 ≈ 0.43 * ioTime`
    
*   如果 `ioRatio = 100`，**不限制任务时间**，所有任务跑完为止
    

```
if (ioRatio == 100) {    // ioRatio=100: IO 和任务谁都不让谁    runAllTasks();  // 跑完所有任务} else {    // ioRatio<100: 按比例分配    runAllTasks(ioTime * (100 - ioRatio) / ioRatio);}
```

这意味着：

*   如果某个 NioEventLoop 上**堆积了大量用户任务**（比如定时器任务、业务逻辑回调），IO 可能得不到及时处理
    
*   如果 **ioRatio 设置太低**，网络吞吐会受影响
    
*   **ioRatio=100 是最高吞吐**，但可能导致任务饿死
    

### 实际建议：

场景

推荐 ioRatio

原因

纯网络代理、网关

100

任务少，追求 IO 吞吐

业务逻辑密集的服务

50~70

给任务执行留时间

不确定

默认 50

安全平衡

* * *

## 四、JDK 空轮询 BUG：Netty 是怎么把自己救活的？

这是一段经典代码：

```
if (ranTasks || strategy > 0) {    selectCnt = 1;} else if (selectCnt > SELECTOR_AUTO_REBUILD_THRESHOLD) {    rebuildSelector();    selectCnt = 0;    handleLoopException(new IOException("..."));    break;}
```

如果你不知道这个历史，可能会觉得这代码莫名其妙：为什么连续 512 次 select 返回 0 就要重建 Selector？

### 背景故事

JDK 的 epoll 实现有一个著名的 BUG（JDK-2144974，通称 **epoll CPU 100% 问题**）：

> 在某些情况下，`Selector.select(timeout)` 会立即返回 0，即使没有任何事件发生。而且会**一直重复**，导致 CPU 空转 100%。

这个问题在 JDK 8 的一些版本中仍然存在，尤其在高并发 + Linux 环境下更容易触发。

### Netty 的自救方案

Netty 的做法是"非侵入式的自愈"：

1.  连续 `select()` 返回 0 的次数超过 512 次（`SELECTOR_AUTO_REBUILD_THRESHOLD`）
    
2.  判定命中了 JDK 的空轮询 BUG
    
3.  **重建一个 Selector**：把旧 Selector 上所有注册的 Channel 迁移到新 Selector
    
4.  继续工作，对上层完全透明
    

重建 Selector 的核心逻辑在 `rebuildSelector()` 中：

```
private void rebuildSelector0() {    final Selector oldSelector = selector;    final Selector newSelector;       // 1. 创建一个新的 Selector    newSelector = openSelector();       // 2. 迁移所有 Channel 的注册    int nChannels = 0;    for (SelectionKey key : oldSelector.keys()) {        Object a = key.attachment();        try {            if (!key.isValid() || key.channel().keyFor(newSelector) != null) {                continue;            }            int interestOps = key.interestOps();            key.cancel();            // 在新 Selector 上重新注册            SelectionKey newKey = key.channel().register(newSelector, interestOps, a);            nChannels++;        } catch (Exception e) {            // ...        }    }    // 3. 替换    selector = newSelector;    // 4. 关闭旧的 Selector    oldSelector.close();}
```

这个过程对上层业务完全无感——Channel 还在，Handler 还在，只是底层 Selector 换了一个。

### 一个有趣的细节

Netty 在 NioEventLoop 启动时，**强制把 Selector 的 wakeup 方法改了**：

```
// SelectedSelectionKeySetSelector 包装// 目的是让 Selector 使用 Netty 自己优化的 SelectedKeys 集合
```

这是因为 JDK 默认的 `SelectedKeys` 是 HashSet，而 Netty 用数组实现的 `SelectedSelectionKeySet` 替换了它，减少了 GC 压力和遍历开销。这块后面有机会再展开。

* * *

## 五、完整流程图

```
NioEventLoop.run()      │      ▼┌─────────────┐│ 计算策略     ││ hasTasks?    ││  ┌───┐      ││  │是 │→selectNow()→非阻塞│  │否 │→select(timeout)→阻塞│  └───┘      │└──────┬──────┘       ▼┌──────────────┐│ 处理取消的Key│└──────┬───────┘       ▼┌─────────────────────┐│  处理 IO 事件        ││  processSelectedKeys │└──────────┬──────────┘           ▼┌─────────────────────┐│  执行任务            ││  runAllTasks(timeout)│└──────────┬──────────┘           ▼┌─────────────────────────┐│  空轮询检测              ││  selectCnt > 512?       ││  ┌───┐                  ││  │是 │ → rebuildSelector││  │否 │ → 继续循环        ││  └───┘                  │└──────────┬──────────────┘           ▼     回到循环开始
```

* * *

## 六、面试题精选

**Q：NioEventLoop.run() 是如何避免 CPU 空转的？**

A：通过两个机制：

1.  SelectStrategy：有任务时用 selectNow() 非阻塞快速返回，没任务时用 select(timeout) 阻塞等待
    
2.  ioRatio 控制：IO 处理时间和任务执行时间按比例分配，避免某一方占满 CPU
    

**Q：Netty 为什么能自愈 JDK 空轮询 BUG？**

A：Netty 在每个循环周期检测连续 select 返回 0 的次数，当超过 512 次（SELECTOR\_AUTO\_REBUILD\_THRESHOLD）时，主动重建一个 Selector，并将所有 Channel 注册迁移到新 Selector 上，同时关闭旧的。这个过程对上层业务完全透明。

**Q：ioRatio=100 和 ioRatio=50 有什么区别？**

A：ioRatio=100 时不限制任务执行时间，所有任务都会被执行完；ioRatio=50 时任务执行时间不超过 IO 处理时间，防止任务堆积影响网络吞吐。ioRatio=100 吞吐最高但可能导致任务线程饥饿；ioRatio=50 更平衡。

* * *

下一期预告：**Netty源码分析(10) — 内存分配之 PooledByteBufAllocator**，进入 Netty 引以为傲的池化内存管理世界。

我们明晚见！
