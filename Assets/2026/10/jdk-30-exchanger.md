## JDK源码系列35｜Exchanger：一个被严重低估的线程间数据交换神器

## 开篇闲聊

JDK并发包里有个类，我敢说90%的Java程序员从来没在项目里用过它——**Exchanger**。它的API简单到只有两个方法，但内部实现却用上了CAS、自旋、park/unpark、缓存行填充等一系列并发编程的高端操作。Doug Lea老爷子在写这个类的时候，把并发编程的"匠心"发挥到了极致。

Exchanger到底解决什么问题？一句话：**两个线程在同一个汇合点交换数据**。

就像两个特工接头——你拿着情报A，我拿着情报B，碰面后你把A给我，我把B给你，完事儿各走各路。听起来冷门，但如果你做过遗传算法的基因交叉、流水线数据传递、甚至某些双生产者-消费者的场景，这个东西是真的香。

## 一、继承体系与基本介绍

Exchanger的继承体系极简：

```
java.lang.Object  └── java.util.concurrent.Exchanger<V>
```

没有实现任何接口，没有继承任何并发工具类，纯粹就是一个工具类。它位于 `java.util.concurrent` 包下，从JDK 1.5开始就存在了。

泛型参数 `V` 表示交换的数据类型。核心API只有两个方法：

*   **`V exchange(V x)`** — 交换数据，如果另一个线程还没到达就**一直等待**
    
*   **`V exchange(V x, long timeout, TimeUnit unit)`** — 交换数据，超时抛出 `TimeoutException`
    

就这么简单。但简单的API背后是魔鬼般的实现。

## 二、核心原理深度剖析

### 2.1 数据结构设计

Exchanger内部维护了两个核心结构——**Slot** 和 **Node**，还有一个关键的 **Arena** 机制来应对多线程竞争。

```
// Exchanger 内部核心数据结构// 单槽位节点 —— 用于无竞争时的快速交换@jdk.internal.vm.annotation.Contended  // 缓存行填充，防止伪共享static final class Node {    int index;              // Arena 中的槽位索引    int bound;              // 最后一次记录的 Exchanger.bound    int collides;           // 在当前bound下的CAS失败次数    int hash;               // 伪随机数，用于自旋控制    Object item;            // 当前线程要交换的数据    volatile Object match;  // 对方线程传递过来的数据    volatile Thread parked; // 当线程被阻塞时，记录阻塞的线程，用于唤醒}// Slot是对单个Node的原子引用，本质上就是 AtomicReference<Node>static final class Slot extends AtomicReference<Object> {    // 通过扩容来区分不同状态    // 用于缓存行填充，防止相邻Slot的伪共享    long q0, q1, q2, q3, q4, q5, q6, q7, q8, q9, qa, qb, qc, qd, qe;}
```

这里有一个细节特别值得注意：**`@Contended` 注解** 和 **手动填充的long数组**。这两者都是为了解决同一个问题——**缓存行伪共享（False Sharing）**。

简单解释一下：现代CPU的缓存是以64字节为一"行"的。如果两个Node对象恰好被加载到同一缓存行，线程A修改Node1会让线程B的Node2缓存行失效，导致性能严重下降。Doug Lea用 `@Contended` 注解和额外的long变量填充，强制让每个Slot和Node独占一个缓存行。

### 2.2 从单槽到Arena的演进

这是Exchanger最精妙的设计。它采用了一种**渐进式扩容**策略：

**第一阶段：单槽模式（Slot Exchange）**

当只有两个线程配对时，它们通过一个 `Slot`（本质是 `AtomicReference`）来交换数据：

```
// Exchanger.exchange() 的核心算法（简化版）public V exchange(V x) throws InterruptedException {    Object v;    Object item = (x == null) ? NULL_ITEM : x;        // 如果 arena 为 null，走单槽快速路径    if ((arena != null || (v = slotExchange(item, false, 0L)) == null)        // 单槽失败，走arena多槽路径          && ...) {        v = arenaExchange(item, false, 0L);    }    return (v == NULL_ITEM) ? null : (V)v;}
```

**单槽交换算法 slotExchange**：

```
private final Object slotExchange(Object item, boolean timed, long ns) {    Node p = participant.get();    // 每个线程持有一个Node（通过ThreadLocal）    Thread t = Thread.currentThread();        if (t.isInterrupted())        return null;        // 自旋等待或CAS设置    for (Node q;;) {        // slot不为null，说明已经有一个线程在等待        if ((q = slot) != null) {            // CAS将slot置为null，抢到配对权            if (SLOT.compareAndSet(this, q, null)) {                Object v = q.item;          // 拿到对方的数据                q.match = item;             // 把我的数据交给对方                Thread w = q.parked;                if (w != null)                    LockSupport.unpark(w);  // 唤醒对方                return v;                   // 返回对方的数据            }            // CAS失败，说明被其他线程抢先了        }        // slot为null，把自己放进去等待        else if (SLOT.compareAndSet(this, null, p)) {            // 等待对方到来...            // 超时或被唤醒后返回        }    }}
```

核心逻辑很清晰：**先到的线程把自己放进slot等，后到的线程把slot取走并交换数据**。就像两个人谁先到谁在约定地点等，后来的人拿了东西走人。

**第二阶段：Arena多槽模式**

但单槽有个致命问题：当多个线程同时竞争时，只有一个线程能成功配对，其他线程全得排队等。这就是Exchanger引入Arena的原因。

Arena本质上是一个**多槽的数组**，每个槽可以独立进行配对：

```
// Arena机制 — 当线程竞争激烈时，使用多槽位分散压力private volatile Node[] arena;private volatile int bound;  // 当前arena的边界大小private final Object arenaExchange(Object item, boolean timed, long ns) {    Node[] a = arena;    int h = participant.get().hash;        // 从index = m开始，逐渐减小index找槽位    for (int i = arena.length - 1; i >= 0; --i) {        int j = (i + m) & (a.length - 1);  // 计算槽位索引        Node q = (Node)a[j];                if (q != null && a[j].compareAndSet(q, null)) {            // 这个槽位有人等了，配对成功！            Object v = q.item;            q.match = item;            return v;        }                // 空槽位，尝试占位        if (a[j].compareAndSet(null, p)) {            // 自旋等待对方...        }    }    // ... 降级和扩容逻辑}
```

### 2.3 自旋策略

Exchanger的自旋策略也是艺术品级别的：

```
// 自旋等待中的自旋次数计算（不是简单常量！）static final int SPINS = 1 << 10;  // 1024// 动态自旋 — 根据CPU核心数和竞争程度调整final int spins =     (NCPU > 1) ?     SPINS :     1;  // 单核不自旋，直接park// 真正的自旋次数会根据 hash 值动态计算int h = p.hash;// 指数级增加等待for (int k = h; k != 0; --k) {    // 每次循环检查 match 是否为 null    if ((v = p.match) != null) {        // 对方来了！返回数据        return v;    }}
```

为何要这样设计？因为**固定自旋次数在不同机器上表现完全不同**。多核CPU上自旋划算（另一个线程可能马上就到），单核上纯浪费。Doug Lea用hash值让每次自旋的"步长"递减，给匹配留出更多时间窗口。

## 三、使用示例

### 示例1：基本的数据交换

```
import java.util.concurrent.Exchanger;import java.util.concurrent.TimeUnit;public class ExchangerDemo {    public static void main(String[] args) throws Exception {        Exchanger<String> exchanger = new Exchanger<>();                // 线程A：准备数据"A-Data"        new Thread(() -> {            try {                String dataA = "A-Data";                System.out.println("线程A准备交换: " + dataA);                                // 模拟准备数据耗时                Thread.sleep(1000);                                String received = exchanger.exchange(dataA);                System.out.println("线程A收到: " + received);            } catch (InterruptedException e) {                Thread.currentThread().interrupt();            }        }, "Thread-A").start();                // 线程B：准备数据"B-Data"        new Thread(() -> {            try {                String dataB = "B-Data";                System.out.println("线程B准备交换: " + dataB);                                // 模拟准备数据耗时                Thread.sleep(2000);                                String received = exchanger.exchange(dataB, 5, TimeUnit.SECONDS);                System.out.println("线程B收到: " + received);            } catch (Exception e) {                e.printStackTrace();            }        }, "Thread-B").start();    }}// 输出：// 线程A准备交换: A-Data// 线程B准备交换: B-Data// 线程A收到: B-Data// 线程B收到: A-Data
```

### 示例2：模拟流水线数据传递

```
import java.util.concurrent.Exchanger;public class PipelineDemo {    public static void main(String[] args) {        Exchanger<Integer> exchanger = new Exchanger<>();                // 生产者：填充buffer并交换空buffer回来        new Thread(() -> {            Integer buffer = 0;            for (int i = 0; i < 5; i++) {                try {                    // 生产数据                    buffer = i * 100;                    System.out.println("生产者填充: " + buffer);                                        // 交换：把满的buffer给消费者，拿回空的buffer                    buffer = exchanger.exchange(buffer);                    System.out.println("生产者拿到空buffer: " + buffer);                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            }        }, "Producer").start();                // 消费者：拿到满的buffer处理完，把空的还回去        new Thread(() -> {            Integer buffer = -1;            for (int i = 0; i < 5; i++) {                try {                    // 交换：把空buffer给生产者，拿到满的buffer                    buffer = exchanger.exchange(buffer);                    System.out.println("  消费者消费: " + buffer);                                        // 清空buffer准备下次交换                    buffer = -1;                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            }        }, "Consumer").start();    }}
```

这个模式在不需要额外中间缓冲区的情况下实现了一对一的生产消费。内存效率极高，因为始终只有两个buffer对象在流转。

## 四、使用注意事项

### 4.1 线程数必须是偶数

Exchanger最核心的限制：**仅支持成对交换**。如果你启动了奇数个线程调用exchange()，最后一个线程会永久阻塞（或超时）。这就像两个人才跳得了探戈。

### 4.2 没有超时的exchange会永久阻塞

```
// ❌ 危险：如果对方线程崩溃或永远不来，当前线程永久卡死String result = exchanger.exchange(data);// ✅ 安全：带超时，到时间抛TimeoutExceptionString result = exchanger.exchange(data, 30, TimeUnit.SECONDS);
```

生产环境**强烈建议使用带超时的版本**。

### 4.3 小心伪共享导致的性能下降

如果你要扩展Exchanger类似的并发工具，记得**给热点字段加缓存行填充**。这个小细节在高并发场景下可能是50%的性能差距。

### 4.4 适用场景总结

场景

是否适用

说明

遗传算法基因交叉

✅ 完美

两条染色体的基因片段交换

流水线数据传递

✅ 适合

两个线程交替处理同一批数据

一对多数据分发

❌ 不行

用BlockingQueue

多对多消息系统

❌ 不行

用Disruptor或Kafka

日志收集汇聚

❌ 不太合适

用CountDownLatch + Queue

## 五、对比总结

把Exchanger跟同包的其他并发工具放一起看：

工具

参与者

数据流向

核心操作

**Exchanger**

2个线程

双向交换

exchange()

**SynchronousQueue**

1对1

单向传递

put()/take()

**BlockingQueue**

N对M

单向传递

put()/take()

**CountDownLatch**

1等N

只同步，不传数据

await()/countDown()

**CyclicBarrier**

N个互相等

只同步，不传数据

await()

Exchanger是唯一一个**双向交换数据**的工具。SynchronousQueue虽然也是一对一，但它只是单向传递——生产者把数据给消费者，不拿东西回来。

**什么时候该用Exchanger？**

你的设计里如果同时满足这三个条件，别犹豫：

1.  恰好两个线程协作
    
2.  两边都需要对方的数据
    
3.  汇合点明确
    

比如你在做一个实时对账系统，线程A算账户余额，线程B算交易流水，两者在Exchanger汇合点交换结果完成对账——这就是教科书级别的用法。

## 写在最后

Exchanger虽然冷门，但它背后的设计思想——**从单槽到Arena的渐进式扩容**、**动态自旋策略**、**缓存行填充防伪共享**——这些是Doug Lea并发编程功力的集中体现。哪怕你从不直接用它，读懂Exchanger的源码也能让你的并发编程思维上升一个台阶。

下次再说"JDK并发包我都用过"，记得确认一下你是不是真的用过Exchanger 😄

* * *

_下一篇预告：ConcurrentLinkedQueue — 无锁队列的巅峰之作，看看Michael-Scott算法如何在Java中落地。_

> 关注「程序猿技术漫谈」，每天一篇硬核技术文，从源码层面把Java并发包扒干净。