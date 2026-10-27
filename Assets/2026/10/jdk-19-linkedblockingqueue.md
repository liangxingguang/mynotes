> 一行行啃 LinkedBlockingQueue 源码，看它怎么用两把锁实现高并发入队出队，以及它和 ArrayBlockingQueue 到底差在哪。

## 深度剖析 LinkedBlockingQueue：链表阻塞队列，为什么比 ArrayBlockingQueue 快？

说实话，我之前写 ArrayBlockingQueue 的时候就觉得，那家伙虽然是个"老实人"，但并发性能上确实有点吃亏——一把锁管到底，读和写互相卡脖子。那有没有一种阻塞队列，既能支持有界阻塞，又能让读和写互不干扰呢？

LinkedBlockingQueue 就是答案。

## 一、类的基本介绍

LinkedBlockingQueue 是 JUC 包下的一个**可选有界阻塞队列**，基于**单向链表**实现，元素按 **FIFO** 顺序排列。

```
public class LinkedBlockingQueue<E> extends AbstractQueue<E>    implements BlockingQueue<E>, java.io.Serializable
```

继承体系：

*   `Iterable` ← `Collection` ← `Queue` ← `BlockingQueue` ← `LinkedBlockingQueue`
    

它有别于 ArrayBlockingQueue 的地方，最核心的一条就是——**用了两把锁**。

如果不去指定容量，它的默认容量是 `Integer.MAX_VALUE`，听起来很大对吧？实际上你要是真让它涨到这么大，内存就先撑不住了。所以生产环境里**一定要指定容量**，不然队列无限膨胀的结果就是 OOM，别问我怎么知道的（图 1）。

## 二、核心源码解读

### 2.1 数据结构——就是个链表

```
static class Node<E> {    E item;          // 节点数据    Node<E> next;    // 指向下一个节点    Node(E x) { item = x; }}
```

就是最普通的单向链表节点。每个节点持有一个 `item` 和一个指向下一个节点的 `next` 指针。没有头节点这种说法，`head` 指向的是一个**哨兵节点**（item == null），这个设计后面说。

### 2.2 核心字段——两把锁、两个条件

```
/** 容量，默认 Integer.MAX_VALUE */private final int capacity;/** 当前元素个数，用 AtomicInteger 保证线程安全 */private final AtomicInteger count = new AtomicInteger();/** 链表头节点，head.item == null（哨兵） */transient Node<E> head;/** 链表尾节点 */private transient Node<E> last;/** 取元素用的锁：take、poll 等操作持有这把锁 */private final ReentrantLock takeLock = new ReentrantLock();/** 出队等待条件：队列为空时，消费者在这上面等 */private final Condition notEmpty = takeLock.newCondition();/** 放元素用的锁：put、offer 等操作持有这把锁 */private final ReentrantLock putLock = new ReentrantLock();/** 入队等待条件：队列满时，生产者在这上面等 */private final Condition notFull = putLock.newCondition();
```

看到没？这就是 LinkedBlockingQueue 的**灵魂设计**——两把锁：

*   **putLock**：负责写，只给 put/offer 这些入队操作用
    
*   **takeLock**：负责读，只给 take/poll 这些出队操作用
    

这样读写操作就不会互相阻塞了！生产者放元素不会影响消费者取元素，理论上吞吐量比 ArrayBlockingQueue 高得多。

但注意 `count` 用的是 **AtomicInteger**，因为两个线程可能同时修改 count，必须保证原子性。

### 2.3 初始化

```
public LinkedBlockingQueue() {    this(Integer.MAX_VALUE);  // 默认容量 Integer.MAX_VALUE}public LinkedBlockingQueue(int capacity) {    if (capacity <= 0) throw new IllegalArgumentException();    this.capacity = capacity;    last = head = new Node<E>(null);  // 初始化哨兵节点}
```

构造时 `head` 和 `last` 指向同一个哨兵节点（item == null）。这个设计很巧妙——有了哨兵节点，队列就永远不会为空，处理边界条件（空队列出队、满队列入队）就简化了很多。

### 2.4 put 方法——放不进去就等

```
public void put(E e) throws InterruptedException {    if (e == null) throw new NullPointerException();  // 不允许 null    int c = -1;    Node<E> node = new Node<E>(e);  // 创建新节点    final ReentrantLock putLock = this.putLock;    final AtomicInteger count = this.count;    putLock.lockInterruptibly();    // 获取 putLock，支持中断    try {        while (count.get() == capacity) {            notFull.await();         // 队列满了，在当前 putLock 的 notFull 条件上等        }        enqueue(node);               // 入队        c = count.getAndIncrement(); // 计数 +1，返回旧值        if (c + 1 < capacity) {            notFull.signal();        // 还有空位，唤醒其他生产者        }    } finally {        putLock.unlock();    }    if (c == 0) {        signalNotEmpty();            // 原本是空的，现在有元素了，通知消费者    }}
```

几个关键点：

1.  **enqueue 不加锁**：因为入队操作本身就在 putLock 保护下，操作的是 tail，不涉及 take 相关的字段
    
2.  **用 count 的旧值判断**：`c = count.getAndIncrement()` 返回的是加 1 之前的值，如果原本是 0，说明队列从空变成了非空，需要唤醒消费者
    
3.  **为什么 `c == 0` 才唤醒消费者？** 因为如果原来队列已经有元素，消费者不会等着。只有从 0 变 1 这个临界点上，才可能有消费者在 `notEmpty` 上等待
    

```
private void enqueue(Node<E> node) {    last = last.next = node;  // 很有意思的一行代码    // 等价于：last.next = node; last = node;}
```

这行代码我第一次看还愣了一下——`last = last.next = node` 其实是从右往左执行的，先 `last.next = node`，再 `last = node`。一句话完成：把新节点挂到尾部，然后更新尾指针。

### 2.5 take 方法——取不到就等

```
public E take() throws InterruptedException {    E x;    int c = -1;    final AtomicInteger count = this.count;    final ReentrantLock takeLock = this.takeLock;    takeLock.lockInterruptibly();    try {        while (count.get() == 0) {            notEmpty.await();         // 队列空了，消费者等待        }        x = dequeue();                // 出队        c = count.getAndDecrement();  // 计数 -1，返回旧值        if (c > 1) {            notEmpty.signal();        // 还有元素，唤醒其他消费者        }    } finally {        takeLock.unlock();    }    if (c == capacity) {        signalNotFull();              // 原来队列是满的，现在有位置了，通知生产者    }    return x;}
```

跟 put 对称的逻辑：

*   队列空了就等 `notEmpty`
    
*   取完后如果队列非空，唤醒其他消费者
    
*   如果原本队列是满的（c == capacity），取出一个后就有空位了，唤醒生产者
    

```
private E dequeue() {    Node<E> h = head;    Node<E> first = h.next;  // 哨兵节点的下一个才是真正的第一个元素    h.next = h;              // help GC，让哨兵节点的 next 指向自己    head = first;            // 把 first 变成新的哨兵节点    E x = first.item;    first.item = null;       // 清空 item，让它变成新的哨兵    return x;}
```

这个出队操作很妙。每次出队时，把原来的**哨兵节点扔掉**，把第一个元素节点**变成新的哨兵节点**，然后返回它的 item。这样就不需要单独创建一个新的哨兵节点了，相当于用了一个**滚动哨兵**的设计。

### 2.6 信号传递——跨锁唤醒

```
private void signalNotEmpty() {    final ReentrantLock takeLock = this.takeLock;    takeLock.lock();         // 唤醒 consumer 时需要持有 takeLock    try {        notEmpty.signal();   // 通知等待的消费者    } finally {        takeLock.unlock();    }}private void signalNotFull() {    final ReentrantLock putLock = this.putLock;    putLock.lock();    try {        notFull.signal();    // 通知等待的生产者    } finally {        putLock.unlock();    }}
```

注意一个重要设计：**putLock 和 takeLock 是两把独立的锁**，生产者在 putLock 上等 `notFull`，消费者在 takeLock 上等 `notEmpty`。但生产者在 put 完元素后，需要通知消费者"有东西了"，而消费者的条件 `notEmpty` 是绑定在 takeLock 上的，所以要**先获取 takeLock，再发 signal**。

这就是 LinkedBlockingQueue 特有的**跨锁信号传递**模式。ArrayBlockingQueue 就没这个烦恼，因为它就一把锁。

## 三、完整使用示例

来一个典型的生产者-消费者例子，模拟一个消息队列：

```
import java.util.concurrent.*;public class LinkedBlockingQueueDemo {    static class Message {        final int id;        final String content;        Message(int id, String content) {            this.id = id;            this.content = content;        }        public String toString() {            return "Msg{" + id + ": " + content + "}";        }    }    public static void main(String[] args) throws Exception {        // 指定容量为 10，防止无限膨胀        LinkedBlockingQueue<Message> queue = new LinkedBlockingQueue<>(10);        // 生产者：3 个线程不断生产消息        ExecutorService producers = Executors.newFixedThreadPool(3);        for (int i = 0; i < 3; i++) {            final int producerId = i;            producers.submit(() -> {                try {                    int seq = 0;                    while (true) {                        Message msg = new Message(producerId * 100 + seq,                            "来自生产者-" + producerId + " 的第 " + seq + " 条消息");                        queue.put(msg);   // 放不进去就阻塞                        System.out.println(Thread.currentThread().getName()                            + " 生产: " + msg + "  队列大小: " + queue.size());                        Thread.sleep(ThreadLocalRandom.current().nextInt(500, 1500));                        seq++;                    }                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                }            });        }        // 消费者：2 个线程消费消息        ExecutorService consumers = Executors.newFixedThreadPool(2);        for (int i = 0; i < 2; i++) {            consumers.submit(() -> {                try {                    while (true) {                        Message msg = queue.take();  // 取不到就阻塞                        System.out.println(Thread.currentThread().getName()                            + " 消费: " + msg + "  队列大小: " + queue.size());                        Thread.sleep(ThreadLocalRandom.current().nextInt(800, 2000));                    }                } catch (InterruptedException e) {                    Thread.currentThread().currentThread().interrupt();                }            });        }        // 运行 10 秒后关闭        Thread.sleep(10000);        producers.shutdownNow();        consumers.shutdownNow();    }}
```

这个例子跑起来可以看到，3 个生产者往 10 个容量的队列里塞消息，2 个消费者往外取。队列满了生产者就等，空了消费者就等，谁都不 busy-wait。跟 ArrayBlockingQueue 比，LinkedBlockingQueue 这种场景下吞吐量会更高一些，因为读写两把锁互不干扰。

## 四、注意事项 & 性能分析

### 4.1 一定要指定容量！

```
// 危险写法LinkedBlockingQueue<Task> queue = new LinkedBlockingQueue<>();// 正确写法LinkedBlockingQueue<Task> queue = new LinkedBlockingQueue<>(10000);
```

不指定容量的默认值是 `Integer.MAX_VALUE`，也就是约 21 亿。生产者的生产速度 > 消费者的消费速度时，队列无限膨胀，最终 OOM。别问我是怎么掉过这个坑的（笑）。

### 4.2 两把锁不是万能的

LinkedBlockingQueue 用了 takeLock 和 putLock 两把锁，理论上支持**读写并行**。但要注意：

1.  **`size()` 方法不是 O(1) 吗？** 是的，它直接返回 `count.get()`，因为 count 是 AtomicInteger，所以很高效。
    
2.  **`remove(Object)` 和 `contains(Object)` 需要两把锁都拿**：
    

```
public boolean remove(Object o) {    fullyLock();    try {        // 遍历链表删除...    } finally {        fullyUnlock();    }}
```

这两个方法是**全锁操作**，遍历时要同时持有 putLock 和 takeLock，因为要防止并发修改把链表结构搞乱。

3.  **`toArray()` 和 `toString()` 同理**，都需要两把锁。
    

### 4.3 吞吐量真的比 ArrayBlockingQueue 高？

说实话，这得看场景：

场景

LinkedBlockingQueue

ArrayBlockingQueue

高并发读写混合

✅ 高（读写锁分离）

❌ 低（一把锁争抢）

内存开销

❌ 每个元素一个 Node 对象

✅ 固定数组，少对象创建

GC 压力

❌ Node 对象频繁创建回收

✅ 数组原地操作

批量操作

❌ 链表不适合随机访问

✅ 数组友好

容量变化

✅ 可指定容量

✅ 固定容量

数据结构

单向链表

循环数组

简单总结就是：

*   **并发越高，LinkedBlockingQueue 的优势越明显**
    
*   **元素数量大且吞吐量一般的场景，ArrayBlockingQueue 更省内存**
    
*   **GC 敏感场景，ArrayBlockingQueue 表现更好**（没有 Node 对象的创建和回收）
    

LinkedBlockingQueue 官方文档的原话是：

> "Linked queues typically have higher throughput than array-based queues but less predictable performance in most concurrent applications."

翻译过来就是：吞吐量更高，但性能波动也更大——因为链表涉及内存分配和 GC。

### 4.4 不允许 null 元素

```
public void put(E e) throws InterruptedException {    if (e == null) throw new NullPointerException();    // ...}
```

跟 ConcurrentHashMap 一样，LinkedBlockingQueue 明确拒绝 null。原因也类似——null 在 take/poll 返回值里被用作"队列空"的标识，如果元素本身是 null 就分不清了。

### 4.5 drainTo 的批量操作效率

LinkedBlockingQueue 的 `drainTo` 方法比一个一个 poll 效率高很多：

```
public int drainTo(Collection<? super E> c, int maxElements) {    if (c == this) throw new IllegalArgumentException();    if (maxElements <= 0) return 0;    fullyLock();  // 两把锁都拿    try {        int n = Math.min(maxElements, count.get());        for (int i = 0; i < n; i++) {            c.add(dequeue().item);        }        // ...通知生产者        return n;    } finally {        fullyUnlock();    }}
```

drainTo 只拿一次锁，批量转移 n 个元素，而不是 poll n 次（每次都要拿锁），特别适合消费者批量处理消息的场景。

## 五、LinkedBlockingQueue 和 ArrayBlockingQueue 对比总结

写到这里，我觉得两者其实代表了两种思路：

**ArrayBlockingQueue** 是**互斥派**——一把锁搞定一切，实现简单，逻辑清晰，适合并发不是特别高的场景。

**LinkedBlockingQueue** 是**分离派**——读写两把锁，生产者只管往链表尾巴挂，消费者只管从链表头取，互不干扰。吞吐量更高，但实现更复杂。

维度

LinkedBlockingQueue

ArrayBlockingQueue

数据结构

单向链表

循环数组

锁设计

takeLock + putLock 两把锁

一把 ReentrantLock

有界性

可选有界（默认无界）

必须有界

内存分配

动态分配 Node 对象

预先分配数组

null 元素

不允许

不允许

并发吞吐

高（读写分离）

较低（读写竞争同一把锁）

实现复杂度

较复杂

较简单

公平策略

不支持（链表天然 FIFO）

支持公平/非公平模式

最后给个选型建议：

*   **并发量高、读写比接近** → LinkedBlockingQueue
    
*   **线程少、100% 确定并发不算高** → ArrayBlockingQueue
    
*   **GC 非常敏感的场景** → ArrayBlockingQueue（少创建对象）
    
*   **需要批量 drainTo** → 两个都能用，性能差异不大
    

说到底，没有银弹，只有最适合你场景的那个。

* * *

**下期预告：** PriorityBlockingQueue——一个队列，进去的顺序是乱的，出来的顺序却是排好的，它是怎么做到的？