# Spring Boot 集成 Disruptor 构建高性能无锁事件总线：从 RingBuffer 原理到百万级吞吐实践

> 来源：https://mp.weixin.qq.com/s/AUGXjm9kh07lDUGdoUME1g
> 抓取时间：2026-10-21（web-fetch，browser 级）
> 说明：文中含多处对原实现的勘误（SmartLifecycle phase 方向、默认 ExceptionHandler、tryPublishEvent 重载、finally clear 丢数据），已一并保留。

## 一、问题背景：BlockingQueue 在生产上为什么露馅

中台系统里所谓"高频写入"，绕来绕去基本就那几类：埋点采集、审计日志、领域事件。最开始大家一般不会直接上 Disruptor，都是 BlockingQueue 先顶着。压测环境看着没问题，一上生产就露馅。问题不是队列本身，而是锁、GC、线程唤醒这几件事叠在一起。

埋点采集通常 10w 到 100w QPS，允许丢一点点，核心诉求是别拖垮主链路；审计/操作日志 1w 到 10w，不能丢，要能回溯；领域事件广播 1w 到 50w，要一对多扇出，最好还能回放。

最初级的实现几乎都长这样：

```java
private final BlockingQueue<Event> queue = new ArrayBlockingQueue<>(10000);
private final ExecutorService pool = Executors.newFixedThreadPool(8);

// 生产端
if (!queue.offer(event)) {
    // 满了，只能丢掉或者阻塞
}

// 消费端
pool.submit(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        Event e = queue.take();
        handle(e);
    }
});
```

这套方案在压测环境，QPS 不到 5w 时跑得很好，一上生产就开始出问题。根因有四个：

**1. 锁竞争带来的上下文切换。** `ArrayBlockingQueue` 用一把 `ReentrantLock` 同时管入队和出队，生产者和消费者互相排队。`LinkedBlockingQueue` 虽然拆成了 takeLock / putLock 两把锁，但依然是悲观锁。压测中 `vmstat` 的 `cs` 字段轻松冲到 10w+/s，CPU 里真正在执行业务的时间不到 30%。

**2. GC 抖动。** 每来一个事件就 `new` 一个对象，队列节点又 `new` 一个 `Node`，Young GC 从 5s 一次变成 200ms 一次。队列积压时这些对象活过一次 GC，直接晋升老年代，最终触发 Full GC，整个服务停顿几百毫秒——这条链路上还有 RPC 调用，一停就是连锁反应。

**3. 阻塞唤醒的延迟放大。** `take()` 一旦阻塞，唤醒要走 `LockSupport.unpark`，涉及系统调用与线程调度。高并发下线程被唤醒后还要重新竞争锁，P99 延迟会出现明显的毛刺。

**4. 环满之后没有可编程的降级空间。** 队列满了只能丢弃或阻塞，没法在"丢"和"落本地磁盘 / 降级队列"之间做策略切换。

Disruptor 的思路非常直接：用预分配的对象数组消灭 GC，用 CAS + 内存屏障消灭锁，用缓存行填充消灭伪共享，用序号替代队列指针。它把"队列"变成了一个可被多个消费者以不同拓扑订阅的事件总线。

## 二、技术原理：RingBuffer 为什么快

### 2.1 RingBuffer：预分配的环形数组

```java
public final class RingBuffer<E> {
    private final Object[] entries;   // 构造时一次性分配并填充
    private final int indexMask;      // ringSize - 1

    public E get(long sequence) {
        return (E) entries[(int) sequence & indexMask];
    }
}
```

三个关键设计：

*   **RingSize 必须是 2 的幂**，`sequence & indexMask` 代替 `sequence % ringSize`，省掉一次除法。
*   **元素预分配、循环复用**：这就是为什么 Disruptor 必须要求你提供 `EventFactory`，而不是直接塞对象进去。运行期零对象分配，等于零 GC 压力。
*   **序号与内存地址线性映射**：序号递增时，访问的槽位在数组上顺序推进，天然契合 CPU 的硬件预取器。

### 2.2 Sequence 与缓存行填充

`Sequence` 本质上是一个 `volatile long`，但绝不能只写一个 long：

```java
abstract class LhsPadding { long p1,p2,p3,p4,p5,p6,p7; }   // 56 字节
class Value extends LhsPadding { volatile long value; }
abstract class RhsPadding extends Value { long p9,p10,...,p15; }
public class Sequence extends RhsPadding { /* CAS 操作 */ }
```

绝大多数 CPU 的缓存行是 64 字节。如果两个 `Sequence`，比如生产者的 cursor 和消费者的 consumerSequence，落在同一个缓存行里，一个核写 cursor 就会让另一个核的整行缓存失效，产生伪共享，性能可能下降一个数量级。

用三层继承在 `value` 两侧各填充 7 个 long，也就是 56 字节，加上对象头，正好让 `value` 独占一行。JDK 8 的 `@sun.misc.Contended` 也能做同样的事，但需要 JVM 参数；JDK 9+ 的 `jdk.internal.vm.annotation.Contended` 属于内部 API，编译期需要 `--add-exports`。Disruptor 选择"继承填充"这一土办法，正是为了零依赖、零参数。

### 2.3 CAS 无锁发布与生产模式差异

单生产者模式下，`ProducerType.SINGLE` 的 `next()` 就是单纯的 `cursor++`，连 CAS 都不需要。

多生产者模式下，`ProducerType.MULTI` 的 `next()` 是一个 CAS 循环，同时还要等待前面尚未发布的槽位被填完，否则会出现"序号跳跃"：

```java
do {
    current = cursor.get();
    next = current + n;
    // 判断环是否已满：next - gatingSequence > bufferSize ?
} while (!cursor.compareAndSet(current, next));
```

发布时，`MultiProducerSequencer` 会用一个额外的 `availableBuffer` 数组标记每个序号"已就绪"，消费者只有看到对应标记才允许读取该槽位。所以多生产者比单生产者多一块 `int[]`，每个槽位 4 字节。RingBuffer 的内存占用不能简单说成 `2 × ringSize × 8 字节`。单生产者主要是 entries 引用数组加上预分配事件对象；多生产者再额外一块 availableBuffer。64 位压缩指针下，entries 每槽 4 字节，否则 8 字节。按 65536 个槽、每个事件对象 1KB 算，事件对象本身约 64MB，引用数组和 availableBuffer 只是零头。

**一句话结论**：能确定只有一个生产者线程，就一定要用 `SINGLE`，吞吐差距在 2 倍以上。

### 2.4 SequenceBarrier：消费者与生产者的协调者

`SequenceBarrier` 承担两件事：

*   `waitFor(sequence)`：消费者阻塞等待，直到生产者游标 >= 该序号，具体怎么等，由等待策略决定；
*   `getCursor()`：读取当前的生产者进度。

生产者判断"环是否满"，依赖的是所有消费者中最小的那个 `gatingSequence`。只要有一个消费者卡住，整个环就会被拖停——这是生产环境最高频的故障，后面会专门讲。

### 2.5 四种等待策略

`BusySpinWaitStrategy` 就是死循环空转，延迟纳秒级，但 CPU 一个核直接打满，金融撮合那种独占核心的场景才适合。`YieldingWaitStrategy` 用 `Thread.yield()` 自旋，延迟亚微秒，要求核数比消费者数多，不然 yield 反而添乱。`SleepingWaitStrategy` 先自旋一阵，再 `LockSupport.parkNanos`，延迟微秒级，CPU 占用低，异步日志、埋点采集选它最稳。`BlockingWaitStrategy` 用 `ReentrantLock` + `Condition`，延迟微秒到毫秒，CPU 占用最低，适合吞吐优先、CPU 敏感的场景。

另外还有两个常被忽略的：`LiteBlockingWaitStrategy`，不调用 `signalAll`，减少虚假唤醒；`TimeoutBlockingWaitStrategy`，带超时，便于处理环停摆。

选型上，埋点、日志这类允许毫秒级延迟的，无脑选 `SleepingWaitStrategy`；网关级核心链路要更低延迟，用 `YieldingWaitStrategy`，最好配合 CPU 隔离；`BlockingWaitStrategy` 只在 CPU 极度紧张时考虑。

## 三、消费拓扑：从 EventHandler 到 Topic / 消费者组

### 3.1 EventHandler vs WorkHandler

```java
// EventHandler：每个 handler 都收到全量事件（广播/fan-out）
public interface EventHandler<E> {
    void onEvent(E event, long sequence, boolean endOfBatch) throws Exception;
}

// WorkHandler：组内分片，一个事件只被组内一个线程处理（消费者组）
public interface WorkHandler<E> {
    void onEvent(E event) throws Exception;
}
```

注册方式：

```java
// 广播：A、B 各自收到全量
disruptor.handleEventsWith(handlerA, handlerB);
// 消费者组：3 个 WorkHandler 平分流量
disruptor.handleEventsWithWorkerPool(w1, w2, w3);
```

映射到消息中间件语义：

*   一个 `EventHandler` 约等于一个 Topic 的订阅者，收到全量；
*   一个 `handleEventsWithWorkerPool` 组约等于一个消费者组，组内竞争消费。

### 3.2 菱形依赖图

Disruptor 最强大的地方在于可以把消费链路写成一张 DAG：

```java
disruptor
    .handleEventsWith(deserializeHandler)   // ① 反序列化 + 校验
    .then(validateHandler)                  // ② 业务校验
    .then(persistA, persistB)               // ③ 并行落库，persistA/B 是 WorkHandler
    .then(sendKafkaHandler)                 // ④ 投递 Kafka
    .then(ackHandler);                      // ⑤ 汇聚：更新消费水位
```

注意这里 `then(persistA, persistB)` 能成立，是因为 `persistA`、`persistB` 声明成了 `WorkHandler`。`EventHandlerGroup.then(WorkHandler...)` 会建 worker pool，组内分片；如果写成 `then(handleEventsWithWorkerPool(...))`，那是把 Disruptor 的顶层 DSL 方法塞进了 group 的 then 里，用法不对。

语义是：只有当 stage ③ 的所有 Worker 都处理完序号 N，stage ④ 才能处理序号 N。这天然实现了"依赖前置阶段全部完成"的汇聚语义，不需要任何分布式协调。

性能上的代价是：菱形结构会引入 `ProcessingSequenceBarrier` 的额外开销，且任何一个分支变慢都会拖慢后续阶段。所以实践中建议最多 3 层，且每层的耗时差异不要超过一个数量级。

## 四、Spring Boot 工程化封装

### 4.1 门面接口定义

抽象掉 Disruptor 的具体类型，业务侧只感知 `EventBus`：

```java
public interface EventBus<E> {
    /** 阻塞式发布，环满时等待；调用方自己评估风险 */
    <A> boolean publish(EventTranslatorOneArg<E, A> translator, A arg);

    /** 带超时的尝试发布，超时返回 false 由调用方降级 */
    <A> boolean tryPublish(long timeout, TimeUnit unit,
                           EventTranslatorOneArg<E, A> translator, A arg);

    /** 环内剩余容量，用于监控与降级判断 */
    long remainingCapacity();

    /** 当前生产者游标 */
    long cursor();
}
```

### 4.2 工厂与 Translator 的泛型抽象

```java
public interface EventFactory<E> {
    E newInstance();          // Disruptor 构造时调用 ringSize 次
}

@FunctionalInterface
public interface EventTranslatorOneArg<E, A> {
    void translateTo(E event, long sequence, A arg);  // 必须零阻塞、零异常
}
```

### 4.3 基于 SmartLifecycle 的实现与优雅停机

```java
@Slf4j
public class DisruptorEventBus<E> implements EventBus<E>, SmartLifecycle {
    private final Disruptor<E> disruptor;
    private volatile RingBuffer<E> ringBuffer;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final long shutdownTimeoutMs;

    public DisruptorEventBus(EventFactory<E> factory,
                             DisruptorProperties props,
                             EventHandler<? super E>[] handlers) {
        this.disruptor = new Disruptor<>(
                factory::newInstance,
                props.getRingSize(),                // 必须 2 的幂
                new NamedThreadFactory(props.getThreadNamePrefix()),
                props.getProducerType(),
                props.getWaitStrategy().create());
        this.disruptor.setDefaultExceptionHandler(new LoggingExceptionHandler<>());
        this.disruptor.handleEventsWith(handlers);
        this.shutdownTimeoutMs = props.getShutdownTimeoutMs();
    }

    @Override
    public void start() {
        if (running.compareAndSet(false, true)) {
            this.ringBuffer = disruptor.start();
            log.info("EventBus started, ringSize={}, remaining={}",
                    ringBuffer.getBufferSize(), ringBuffer.remainingCapacity());
        }
    }

    @Override
    public void stop() {
        if (!running.compareAndSet(true, false)) {
            return;
        }
        // 等待环内已发布事件被消费完再销毁
        boolean ok = disruptor.shutdown(shutdownTimeoutMs, TimeUnit.MILLISECONDS);
        if (!ok) {
            log.warn("EventBus shutdown timeout after {}ms, force halt", shutdownTimeoutMs);
            disruptor.halt();
        }
        log.info("EventBus stopped gracefully");
    }

    @Override
    public boolean isRunning() {
        return running.get();
    }

    @Override
    public int getPhase() {
        // phase 小：启动早、停止晚。业务 Bean 默认 phase 0，会先停，
        // 停完之后不再产生新事件，最后 EventBus 把环里剩的消费干净。
        return Integer.MIN_VALUE + 100;
    }
}
```

几个工程细节：

`getPhase()` 这里容易写反。Spring 的 `SmartLifecycle` 按 phase 升序启动、降序停止。想让 EventBus 最后停，phase 就要足够小，不是足够大。原文里写"phase 设得较大"然后又说"业务 Bean 用更小 phase 会先停"，方向是反的。正确做法是 EventBus 用很小的 phase，业务 Bean 用默认或更大 phase，这样业务先停，EventBus 后停。

`disruptor.shutdown(timeout)` 内部会逐个停掉 `BatchEventProcessor`，已经发布的事件会被处理完。如果超时返回 `false`，说明有消费者卡死了，此时只能 `halt()` 强制退出。所以消费者 Handler 里必须有超时控制。

### 4.4 配置化

```yaml
app:
  event-bus:
    behavior-trace:
      enabled: true
      ring-size: 65536                   # 2^16
      producer-type: MULTI
      wait-strategy: SLEEPING            # BUSY_SPIN / YIELDING / SLEEPING / BLOCKING
      thread-name-prefix: bus-behavior-
      shutdown-timeout-ms: 10000
      publish-timeout-ms: 50             # 环满等待上限
      overflow-policy: DISCARD           # DISCARD / LOCAL_QUEUE / BLOCK
```

```java
@ConfigurationProperties(prefix = "app.event-bus.behavior-trace")
@Data
public class DisruptorProperties {
    private int ringSize = 1 << 16;
    private ProducerType producerType = ProducerType.MULTI;
    private WaitStrategyType waitStrategy = WaitStrategyType.SLEEPING;
    private String threadNamePrefix = "disruptor-";
    private long shutdownTimeoutMs = 10_000;
    private long publishTimeoutMs = 50;
    private OverflowPolicy overflowPolicy = OverflowPolicy.DISCARD;
}
```

用 `@ConditionalOnProperty` + `@Bean` 装配，不同事件类型注册不同前缀的 `EventBus<XxxEvent>` Bean。

## 五、关键实现细节

### 5.1 事件对象复用与不可变转换

RingBuffer 里的对象会被反复覆盖。所以：

```java
// ❌ 错误：把 event 直接扔给异步线程或放进集合
handler.onEvent(event, seq, endOfBatch);  // event 在下一个事件到来时就被改写了

// ✅ 正确：立即拷贝为不可变对象
public void onEvent(BehaviorEvent event, long sequence, boolean endOfBatch) {
    BehaviorRecord record = event.toImmutableRecord(); // 新对象，脱离环生命周期
    buffer.add(record);
}
```

这条规则是 Disruptor 使用中最容易踩的坑。一旦违反，表现出来就是"数据偶尔串行/错乱"，而且极难复现。

### 5.2 Translator 中禁止阻塞调用

`translateTo()` 是在生产者线程上同步执行的，它运行在"序号已经分配但尚未发布"的窗口里。任何阻塞，比如 RPC、DB、`sleep`、大对象序列化，都会：

1.  拖慢发布，进而让整个环的 `gatingSequence` 无法推进；
2.  在多生产者模式下，导致其他生产者 CAS 自旋等待，CPU 直接打满。

规则很简单：`translateTo` 里只做字段赋值。至于"100ns"这种数字，别太当真，反正别在里面干重活。

### 5.3 异常隔离：避免毒丸事件

这里原文说"默认的 ExceptionHandler 只打印日志"是不对的。Disruptor 默认的 `FatalExceptionHandler` 会把异常包装成 RuntimeException 抛出去，消费者线程可能直接挂掉。如果你自定义成只打日志，问题又变成另一个：事件已经算处理完，不会重试，可能静默丢数据。`WorkHandler` 组里尤其危险。

建议自定义：

```java
public class LoggingExceptionHandler<E> implements ExceptionHandler<E> {
    private final MeterRegistry meterRegistry;

    @Override
    public void handleEventException(Throwable ex, long sequence, E event) {
        // 1. 埋点计数，便于告警
        String type = event == null ? "null" : event.getClass().getSimpleName();
        meterRegistry.counter("disruptor.event.error", "type", type).increment();

        // 2. 落死信文件/表，保证可追溯。
        // 注意：event 是复用对象，这里如果异步存，必须马上深拷贝或序列化。
        deadLetterStore.save(sequence, event, ex);

        // 3. 绝不能 rethrow —— 抛出会终止整个 BatchEventProcessor
        log.error("handle event failed, seq={}", sequence, ex);
    }

    @Override
    public void handleOnStartException(Throwable ex) {
        log.error("disruptor start failed", ex);
    }

    @Override
    public void handleOnShutdownException(Throwable ex) {
        log.error("disruptor shutdown failed", ex);
    }
}
```

### 5.4 环满时的降级策略

带超时的发布不要直接找 `disruptor.tryPublishEvent(translator, timeout, unit, arg)`，那个重载并不存在。正确做法是先从 `RingBuffer.tryNext(timeout, unit)` 拿序号，再 translate，最后 publish：

```java
@Override
public <A> boolean tryPublish(long timeout, TimeUnit unit,
                              EventTranslatorOneArg<E, A> translator, A arg) {
    if (!running.get() || ringBuffer == null) {
        return false;
    }
    try {
        long seq = ringBuffer.tryNext(timeout, unit);
        try {
            translator.translateTo(ringBuffer.get(seq), seq, arg);
        } finally {
            ringBuffer.publish(seq);
        }
        return true;
    } catch (TimeoutException e) {
        // 环满且等待超时
        switch (overflowPolicy) {
            case LOCAL_QUEUE:
                localOverflowQueue.offer(arg);
                return true;
            case DISCARD:
                meterRegistry.counter("disruptor.overflow.drop").increment();
                return false;
            default:
                return false;
        }
    } catch (InsufficientCapacityException e) {
        return false;
    }
}
```

实践中的取舍：

埋点类直接丢弃 + 打点计数。埋点丢 0.01% 完全可以接受，但不能拖垮主链路。审计类落有界的本地队列，比如 2000 条，再由一个低优先级线程慢慢回灌。注意一定有界，否则就是换了个地方 OOM。最忌讳在同一线程里无限重试。

## 六、实战案例：用户行为埋点采集链路

### 6.1 架构

```
HTTP 上报 (/collect)
      │
      ▼
参数校验（极轻量）
      │  translator: 只做字段赋值（< 100ns）
      ▼
┌─────────────────────────────────────┐
│  RingBuffer<BehaviorEvent> (65536)  │
│  ProducerType.MULTI                 │
│  SleepingWaitStrategy               │
└─────────────────────────────────────┘
      │
      ├──► WorkHandler × 4（消费者组）
      │        │
      │        └─ 累积到 1000 条 或 200ms 超时
      │              ├─ 批量 INSERT（MySQL，rewriteBatchedStatements=true）
      │              └─ 批量 send（Kafka Producer，linger.ms=20, batch.size=256KB）
      │
      └──► EventHandler（监控通道，独立订阅）
               └─ Micrometer 打点：QPS、处理耗时、lag
```

### 6.2 批量提交的核心代码

Disruptor 的 `onEvent` 会带上 `endOfBatch` 标志，当消费者一次性追赶多个事件时，只有最后一个事件的 `endOfBatch=true`。不过 `WorkHandler` 没有这个参数。利用这个信号做批量提交只适用于 `EventHandler`，`WorkHandler` 就得自己用"数量 + 时间"双触发。

```java
public class BatchPersistWorkHandler implements WorkHandler<BehaviorEvent> {
    private final List<BehaviorRecord> buffer = new ArrayList<>(1024);
    private long lastFlush = System.currentTimeMillis();

    @Override
    public void onEvent(BehaviorEvent event) throws Exception {
        buffer.add(event.toImmutableRecord());
        boolean sizeTrigger = buffer.size() >= 1000;
        boolean timeTrigger = System.currentTimeMillis() - lastFlush >= 200;
        if (sizeTrigger || timeTrigger) {
            flush();
        }
    }

    private void flush() {
        if (buffer.isEmpty()) return;
        try {
            behaviorMapper.batchInsert(buffer);
        } finally {
            buffer.clear();
            lastFlush = System.currentTimeMillis();
        }
    }
}
```

注意这个 `finally clear()` 有个隐患：`batchInsert` 失败时数据直接没了。生产里要么把失败批次落死信，要么加有限重试。另外时间触发只在有事件进来时检查，低峰期最后几条可能等很久，最好再配一个定时 flush 或者停机前 flush。

### 6.3 与"直接写 MQ"的对比

请求线程直接 `kafkaProducer.send()`，吞吐大概 8w 到 12w QPS，P99 40 到 60ms。`send()` 内部虽然入缓冲区，但仍占用户线程堆栈，I/O 线程池容易成瓶颈。

请求线程进 `LinkedBlockingQueue`，再由单线程转发，吞吐能到 20w 到 30w，P99 15 到 25ms，但锁竞争和对象分配还在，GC 毛刺明显。

换成 Disruptor 之后，请求线程只做一次 translator 赋值就返回，后面用 WorkHandler 批量转发，吞吐能到 60w 到 80w，P99 压到 2 到 5ms。关键收益不在单条处理速度，而在于接口线程的 RT 被压到了极致。

## 七、性能验证：JMH 对比

测试环境是 8C16G，Intel Xeon Platinum 8269CY @2.5GHz，Linux 5.10，关闭超线程；JDK 17.0.9，G1，默认参数；Disruptor 3.4.4；JMH 1.37，`@Fork(3)`，`@Warmup(iterations=5, time=1s)`，`@Measurement(iterations=5, time=1s)`。

微基准投递 + 消费吞吐，1P1C 下 `LinkedBlockingQueue` 容量 65536 时大约 380 万 ops/s，`ArrayBlockingQueue` 410 万；Disruptor `SleepingWaitStrategy` 1850 万，`YieldingWaitStrategy` 3200 万，`BusySpinWaitStrategy` 4100 万。4P4C 差距更明显：两个 BlockingQueue 只有 92 万和 105 万，Disruptor `Sleeping` 620 万，`Yielding` 1100 万，`BusySpin` 1350 万。

单线程对单线程，Disruptor 比 `ArrayBlockingQueue` 快 4.5 倍左右，比 `LinkedBlockingQueue` 快 4.8 倍。4 生产者 4 消费者差距拉到 10 倍以上，这就是锁竞争被消除的直接体现。`SleepingWaitStrategy` 相对 `BusySpinWaitStrategy` 损失约 55% 吞吐，但 CPU 占用从 8 核降到 1 核以内，埋点场景选它很划算。

P99 延迟方面，1P1C 下 `ArrayBlockingQueue` P50 320ns、P99 12.4us、P99.9 89us；`LinkedBlockingQueue` P50 290ns、P99 15.8us、P99.9 120us；Disruptor `SleepingWaitStrategy` P50 45ns、P99 1.9us、P99.9 8.5us；`BusySpinWaitStrategy` P50 25ns、P99 420ns、P99.9 1.8us。Disruptor 的 P99.9 甚至优于 BlockingQueue 的 P50，长尾被压平了。

端到端业务压测，用 4 台压测机向采集网关灌数据，`ringSize=65536`，Kafka 批量大小 256KB、linger 20ms。方案 A 直写 Kafka：系统吞吐 11.2w/s，接口 P99 48ms，错误率 2.3%，Young GC 8 次/秒，CPU 92%，I/O 线程池打满。方案 B 走 Disruptor 批量：吞吐 72.6w/s，接口 P99 4.1ms，错误率 0%，Young GC 0.4 次/秒，CPU 55%。

压测参数上，`ringSize` 取 65536 或 131072，也就是 2^16 或 2^17。堆固定住，观察 Full GC 为 0，并且 `remainingCapacity` 长期稳定在 60% 以上。

## 八、生产避坑与监控

### 8.1 五个必须知道的坑

**① 消费者长阻塞 = 整个环停摆。** 只要有**一个**消费者的 `Sequence` 不推进，`gatingSequence` 就被钉住，生产者的 `next()` 会一直自旋等待环满。真实事故：某次批量入库走了一条慢 SQL，耗时 30s，直接导致整个采集接口全部超时。对策：Handler 内所有 I/O 必须有超时；慢调用放到单独的线程池异步化；必要时使用 `TimeoutBlockingWaitStrategy`。

**② 消费者线程数不要超过 CPU 物理核数。** Disruptor 的消费者是忙等/自旋的，线程数超过核数会让 OS 频繁切换，性能断崖式下跌。对策：`线程数 = min(物理核数 - 1, 业务瓶颈数)`，并且用 `taskset` 或 `cgroup` 把消费者线程绑定到独立核心。

**③ 序号回绕。** `Sequence` 是 `long`，理论上要跑到 2^63 才会回绕，实际不可能发生。真正需要关注的是 `(int) sequence & indexMask` 这个截断。它是正确的，因为 `indexMask` 永远是 2 的幂减 1。不要自作聪明改成 `%`。

**④ 内存占用估算。** 单生产者下，内存主要是 `ringSize × (entries 引用 + 事件对象大小)`。多生产者再加一块 `int[] availableBuffer`，每个槽位 4 字节。按 65536 个槽、事件对象平均 1KB 算，事件对象就是 64MB 级别；如果事件对象里带着长字符串，这个数字会非常可观。建议事件对象只放基本类型和短字段，大字段延迟到 Translator 之后按需获取。

**⑤ 优雅停机不等于数据不丢。** `shutdown(timeout)` 只保证已发布的事件被消费完。停机瞬间 HTTP 线程刚拿到但还没发布的请求会丢。建议在 `stop()` 之前先做接入层摘流量，留出 5 到 10 秒缓冲。

### 8.2 Micrometer 监控指标

```java
@Component
@RequiredArgsConstructor
public class EventBusMetricsBinder {
    private final MeterRegistry registry;

    public <E> void bind(String busName, EventBus<E> bus, RingBuffer<E> ringBuffer) {
        // 1. 剩余容量：低于 20% 触发告警
        Gauge.builder("eventbus.ring.remaining", bus, EventBus::remainingCapacity)
             .tag("bus", busName)
             .register(registry);

        // 2. 生产者游标（换算成 QPS 用 Counter 更直观）
        Gauge.builder("eventbus.ring.cursor", bus, b -> (double) b.cursor())
             .tag("bus", busName)
             .register(registry);

        // 3. 消费滞后：cursor - consumerSequence
        // minConsumerSequence 取所有消费者 Sequence 的最小值，实际可从你的 Handler 或 SequenceBarrier 维护
        Gauge.builder("eventbus.consumer.lag", bus,
                      b -> (double) (ringBuffer.getCursor() - minConsumerSequence()))
             .tag("bus", busName)
             .register(registry);

        // 4. 事件处理耗时分布
        Timer.builder("eventbus.handle.duration")
             .tag("bus", busName)
             .publishPercentiles(0.5, 0.99, 0.999)
             .register(registry);
    }
}
```

在 Handler 里记录：

```java
public void onEvent(BehaviorEvent event, long sequence, boolean endOfBatch) {
    long start = System.nanoTime();
    try {
        // 业务处理
    } finally {
        timer.record(System.nanoTime() - start, TimeUnit.NANOSECONDS);
        long lag = ringBuffer.getCursor() - sequence;
        if (lag > ringBuffer.getBufferSize() * 0.8) {
            log.warn("consumer lag high: {}", lag);   // 或直接打点到告警通道
        }
    }
}
```

### 8.3 推荐告警阈值

`eventbus.ring.remaining` 除以 bufferSize 小于 10% 且持续 30s，说明生产速率远超消费速率，环快打满了。`eventbus.consumer.lag` 大于 0.8 × ringSize 且持续 10s，说明消费者阻塞或者处理过慢。`eventbus.handle.duration` 的 P99 大于 500ms，基本是下游 DB/MQ 出现慢调用。`disruptor.event.error` 速率大于 1/s，说明有毒丸事件，需要人工介入。`disruptor.overflow.drop` 速率大于 10/s，说明环满降级频繁，该扩容消费者或者调大 ringSize 了。

## 九、最后聊几句

Disruptor 不是一个"更快的队列"，它是一套以序号为核心的并发协调模型。把它用好，关键不在 API，而在三件事：

一是理解生命周期。事件对象是复用的，出了 Handler 就必须转成不可变对象，不然数据串起来的时候你会怀疑人生。

二是守住边界条件。Translator 不阻塞、Handler 不长时间阻塞、环满有降级。这三条听起来简单，生产事故基本都出在这。

三是看得见状态。remaining、lag、处理耗时三个指标必须进监控大盘，不然环停摆了你还不知道。

在 Spring Boot 里，这套能力可以封装成一个标准的 `EventBus<E>` Bean。业务代码只依赖 `publish` 接口，底层的生产者模式、等待策略、RingSize 全部走配置。这样既能拿到百万级的吞吐，又不会让 Disruptor 的复杂度渗透到业务层。

适用边界也得说清楚：单机吞吐需求超过 10w QPS，并且愿意接受"允许丢一部分 / 允许延迟"的场景，Disruptor 是最优解；如果本来就依赖跨机可靠投递，比如必须走 MQ 做事务消息，那 Disruptor 更适合定位成 MQ 之前的缓冲层，而不是 MQ 的替代品。
