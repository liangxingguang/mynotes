## 一、类的基本介绍

`LongAdder` 和 `LongAccumulator` 是 **java.util.concurrent.atomic** 包下的两个类，JDK 1.8 引入。

> 一句话总结：**LongAdder 是 AtomicLong 的高并发替代品，LongAccumulator 是 LongAdder 的通用化版本，支持自定义聚合逻辑。**

### 继承体系

```
java.lang.Object  └─ java.util.concurrent.atomic.Striped64 (package-private)       └─ java.util.concurrent.atomic.LongAdder       └─ java.util.concurrent.atomic.LongAccumulator
```

注意两个类都继承自 package-private 的 `Striped64`，这是我们后面要讲的核心机制所在。

### 核心作用

*   **LongAdder**：对 long 类型数值做累加操作，适合「高频写入、低频读取」的统计场景
    
*   **LongAccumulator**：对 long 类型数值做**自定义二元运算**的聚合，比如取最大值、累乘等
    

## 二、核心源码解读

### Striped64 —— 真正的核心

LongAdder 的代码本身很短，精髓在父类 `Striped64`。我们先看看关键字段：

```
// Striped64 的核心字段abstract class Striped64 extends Number {        /**     * Cells 表，大小为 2 的幂，每个元素是一个 Cell 对象     * 当并发竞争激烈时，会把累加操作分散到不同的 Cell 上     * 非空时，长度必为 2 的幂     */    transient volatile Cell[] cells;        /**     * 基础值 —— 当没有竞争时直接用 base 累加     * 相当于退化成了 AtomicLong     */    transient volatile long base;        /**     * 自旋锁标志，用于 cells 数组的扩容和初始化     * 0 表示未加锁，1 表示已加锁     * 注意：用的是 CAS 而不是 synchronized，因为这里只需要极短的临界区     */    transient volatile int cellsBusy;        // Cell 内部类 —— 使用 @Contended 注解解决伪共享问题    @jdk.internal.vm.annotation.Contended    static final class Cell {        volatile long value;        Cell(long x) { value = x; }                // CAS 更新 value        final boolean cas(long cmp, long val) {            return UNSAFE.compareAndSwapLong(this, valueOffset, cmp, val);        }    }}
```

**这里最值得注意的就是 `@Contended` 注解**。Java 的缓存行通常为 64 字节，而一个 Cell 对象头加上 value 字段远小于此。如果不做填充，不同线程修改相邻 Cell 时会互相导致缓存行失效 —— 这就是 **伪共享（False Sharing）** 问题。`@Contended` 会在对象前后填充 128 字节，确保每个 Cell 独占一个缓存行。

### LongAdder.add() —— 核心方法

```
public class LongAdder extends Striped64 {        public void add(long x) {        Cell[] cs; long b, v; int m; Cell c;                // 第一阶段：尝试 CAS 更新 base        // 如果 casBase 成功，说明没有竞争，直接返回        // 一旦 casBase 失败，说明有竞争，进入 cells 分支        if ((cs = cells) != null || !casBase(b = base, b + x)) {            boolean uncontended = true;            // 第二阶段：尝试在 cells 数组中定位一个 Cell 来累加            // 条件按顺序检查：            //   1. cs == null      —— cells 数组尚未初始化            //   2. (m = cs.length - 1) < 0  —— 数组长度为 0            //   3. (c = cs[getProbe() & m]) == null —— 当前线程的槽位无 Cell            //   4. !(uncontended = c.cas(v = c.value, v + x)) —— Cell CAS 也失败了            if (cs == null || (m = cs.length - 1) < 0 ||                (c = cs[getProbe() & m]) == null ||                !(uncontended = c.cas(v = c.value, v + x)))                // 进入这里说明前面所有快速路径都失败了                // 需要扩容或重新哈希线程的 probe 值                longAccumulate(x, null, uncontended);        }    }        public long sum() {        // 累加 base 和所有 cells 的值        Cell[] cs = cells;        long sum = base;        if (cs != null) {            for (Cell c : cs)                if (c != null)                    sum += c.value;        }        return sum;    }}
```

看看这个设计巧不巧妙？

**无竞争时**：就是个 CAS + 普通变量，和 AtomicLong 一样快。

**有竞争时**：先尝试不同的 Cell，不同的线程通过 `getProbe()` 获取自己的 hash，定位到不同的 Cell 上累加。这样**把单点的 CAS 竞争分散成了多个独立的 CAS 竞争**。

如果还是冲突，就会触发 `longAccumulate` 方法——这个方法会尝试扩容 cells 数组（翻倍）或者重新哈希当前线程的 probe 值，让线程尽量分散到不同的 Cell 上。

**我个人特别喜欢这个设计哲学**：AtomicLong 是「一根独木桥，谁过谁排队」，LongAdder 是「修好几条路，大家分散走，最后汇总」。这种思路在并发编程中其实很通用。

### LongAccumulator —— LongAdder 的通用版

```
public class LongAccumulator extends Striped64 {        // 二元操作符    private final LongBinaryOperator function;    // 初始值（单位元）    private final long identity;        public LongAccumulator(LongBinaryOperator accumulatorFunction, long identity) {        this.function = accumulatorFunction;        base = this.identity = identity;    }        public void accumulate(long x) {        // 和 LongAdder.add() 几乎一样        // 不同的是这里用的是 function.applyAsLong(old, x)         // 而不是简单的 old + x        Cell[] cs; long b, v, r; int m; Cell c;        if ((cs = cells) != null ||            (r = function.applyAsLong(b = base, x)) != b && !casBase(b, r)) {            boolean uncontended = true;            if (cs == null || (m = cs.length - 1) < 0 ||                (c = cs[getProbe() & m]) == null ||                !(uncontended = (r = function.applyAsLong(v = c.value, x)) == v ||                  c.cas(v, r)))                longAccumulate(x, function, uncontended);        }    }        // 取最大值示例    // new LongAccumulator(Math::max, Long.MIN_VALUE)}
```

LongAccumulator 就是 LongAdder 的**泛化版本**。LongAdder 固定做加法，LongAccumulator 让你传一个 `LongBinaryOperator`，想求最大、最小、累乘、累加都可以。

## 三、核心原理

### 数据结构

```
                    ┌───────────────────────┐                    │     Striped64          │                    │                       │                    │   base (volatile)      │◄── 无竞争时直接用                    │                       │                    │   cells[] (volatile)   │◄── 竞争激烈时分散到多个槽位                    │   ┌───┬───┬───┬───┐   │                    │   │ C │ C │ C │ C │   │ 每个 Cell 独占缓存行                    │   └───┴───┴───┴───┘   │  (@Contended 防伪共享)                    │                       │                    │   cellsBusy (volatile) │◄── 自旋锁，控制 cells 的初始化/扩容                    └───────────────────────┘
```

### 线程安全机制

机制

说明

**CAS**

Cell 的 value 更新使用 `UNSAFE.compareAndSwapLong`

**伪共享防护**

`@Contended`

 注解确保 Cell 独占缓存行

**分段思想**

多个 Cell 分散并发压力，类似 ConcurrentHashMap 的 segment 思路

**自旋锁**

`cellsBusy`

 字段用 CAS 控制 cells 数组的初始化/扩容

**ThreadLocalRandom**

`getProbe()`

 获取线程的探针值，保证不同线程映射到不同 Cell

### 扩容流程

`longAccumulate()` 方法的逻辑大致如下：

1.  当前线程槽位的 Cell 为 null → 创建新 Cell 并放入
    
2.  Cell CAS 失败且 cells 未满 → 重试（重新获取 probe 值定位）
    
3.  Cell CAS 失败且 cells 已满 → 翻倍扩容
    
4.  多线程同时扩容 → CAS `cellsBusy` 控制只有一个线程操作
    

## 四、使用示例

```
import java.util.concurrent.CountDownLatch;import java.util.concurrent.atomic.LongAccumulator;import java.util.concurrent.atomic.LongAdder;/** * 模拟一个电商网站的 PV（页面访问量）统计 * 演示 LongAdder 和 LongAccumulator 的典型用法 */public class LongAdderDemo {        // 全国门店的日访问量统计 —— 用 LongAdder    private static final LongAdder dailyPV = new LongAdder();        // 单日最高同时在线人数统计 —— 用 LongAccumulator    private static final LongAccumulator peakConcurrent =             new LongAccumulator(Long::max, 0);        // 模拟一次页面访问    public static void visit(int concurrentUsers) {        dailyPV.increment();           // PV +1        peakConcurrent.accumulate(concurrentUsers); // 更新最高并发量    }        public static void main(String[] args) throws InterruptedException {        int threadCount = 50;        int visitsPerThread = 100_000;        CountDownLatch latch = new CountDownLatch(threadCount);                long start = System.currentTimeMillis();                for (int i = 0; i < threadCount; i++) {            int threadId = i;            new Thread(() -> {                try {                    // 每个线程抖动一下，避免所有线程同时开始                    Thread.sleep((long) (Math.random() * 10));                } catch (InterruptedException ignored) {}                                for (int j = 0; j < visitsPerThread; j++) {                    // 模拟每次访问时的实时并发数（这里用线程索引做演示）                    visit(threadId + 1);                }                latch.countDown();            }, "worker-" + i).start();        }                latch.await();        long elapsed = System.currentTimeMillis() - start;                System.out.println("=== 统计结果 ===");        System.out.println("总 PV: " + dailyPV.sum());        System.out.println("预期 PV: " + (threadCount * visitsPerThread));        System.out.println("最高并发峰值: " + peakConcurrent.get());        System.out.println("耗时: " + elapsed + " ms");                // ---- 对比 AtomicLong ----        System.out.println(" 注：如果改用 AtomicLong，在多线程高并发下");        System.out.println("CAS 自旋冲突会更频繁，吞吐量明显低于 LongAdder");    }}
```

运行结果示例：

```
=== 统计结果 ===总 PV: 5000000预期 PV: 5000000最高并发峰值: 50耗时: 186 ms
```

## 五、注意事项

### 1\. sum() 不是实时快照

```
LongAdder adder = new LongAdder();adder.add(1);adder.add(2);// 此时另一个线程在 add(3)，但还没执行完 cells[0].caslong s = adder.sum(); // 可能得到 3，也可能 6（如果第三个加进来了）
```

`sum()` 不保证一致性，它只是把 base + 所有当前 Cell 的值扫一遍。如果在扫的过程中有其他线程在更新 Cell，这个结果是**近似值**。

### 2\. 什么时候用 LongAdder，什么时候用 AtomicLong？

场景

推荐

写多读少（统计、埋点、计数器）

✅ LongAdder

读写频率接近

看情况

读多写少

✅ AtomicLong（省去汇总开销）

需要精确的中间值（如 CAS 循环中的计数器）

✅ AtomicLong

需要 `addAndGet()` 这种返回值

✅ AtomicLong（LongAdder 没有）

**LongAdder 没有 `getAndAdd()` 和 `addAndGet()` 方法**。因为 Cell 分散了，当前线程无法知道其他 Cell 的最新值。

### 3\. 内存占用

LongAdder 内部维护一个数组，默认长度是 2，之后按需翻倍（不超过 CPU 核心数）。每个 Cell 经过 `@Contended` 填充后约占用 128~256 字节。如果在 32 核机器上跑满，Array + Cell 大约几十 KB，大多数场景可以接受。

### 4\. 重置

```
// 重置为 0adder.reset();// 获取当前值后重置（原子操作），适合周期性统计long current = adder.sumThenReset();
```

`sumThenReset()` 很适合做「每分钟的请求数统计」—— 读出来然后清零，开始下一分钟计数。

## 六、对比总结

特性

AtomicLong

LongAdder

LongAccumulator

引入版本

JDK 1.5

JDK 1.8

JDK 1.8

核心原理

CAS + volatile

CAS + Cell 数组分散

CAS + Cell 数组 + 自定义算子

高并发写入

差（CAS 自旋激烈）

优（分段减少冲突）

优

读取速度

快（直接读 value）

慢（需遍历所有 Cell）

慢

支持操作

\+ -

+

任意二元运算

获取并操作

getAndAdd / addAndGet ✅

❌

❌

重置

set(0)

reset / sumThenReset

reset / getThenReset

典型场景

计数器、序列生成

高并发统计、埋点

最大/最小值、累乘聚合

### 一句话选择指南

*   普通计数器（几百线程以内）→ **AtomicLong** 就够
    
*   高并发下写远多过读 → **LongAdder**
    
*   不只是加法，还要取最大、累乘等 → **LongAccumulator**
    

## 七、思考

LongAdder 的设计其实给我们一个很重要的启发：**当单点 CAS 成为瓶颈时，想想能不能把压力分散开。**

这个思路在 JUC 包里反复出现：

*   ConcurrentHashMap 1.7 用 Segment 锁分段
    
*   LongAdder 用 Cell 数组分散 CAS 竞争
    
*   甚至 ThreadPoolExecutor 里面 Worker 的 `runState` 和 `workerCount` 合并在一个 int 里用 CAS 操作，也是为了避免加两把锁
    

**性能优化不是盲目加锁或者用无锁，而是找到真正的热点，然后把它打散。**

* * *

> 封面图参考：LongAdder 分段累加示意图\[1\]

下一期预告：**ArrayBlockingQueue** —— 有界阻塞队列的经典实现。

### 引用链接

\[1\]LongAdder 分段累加示意图: _https://picsum.photos/800/400?random=42_