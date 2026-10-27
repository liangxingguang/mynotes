# Netty源码分析(10) — 内存分配之 PooledByteBufAllocator

> 在 Netty 里，成千上万次的 I/O 操作意味着频繁的内存分配与回收。如果每次都 new byte\[\]，GC 压力会让你怀疑人生。Netty 用 PooledByteBufAllocator 搞了一套高效的内存池，今天来拆它。

## 一、为什么需要内存池？

先看不用内存池的情况：每次读写都 `new byte[capacity]` → 用完 GC → 再 new → 再 GC...

```
// 不用池化：每次 I/O 都要分配内存ByteBuf buf = UnpooledByteBufAllocator.DEFAULT.buffer(256);// 用完 -> GC 回收
```

在高并发网络场景下：

*   **内存碎片**：频繁分配释放导致碎片
    
*   **GC 压力**：大量短期存活对象频繁触发 Young GC
    
*   **分配效率**：每次 new 都走 JVM 堆分配，有 CAS 成本
    

Netty 的 `PooledByteBufAllocator` 直接跟操作系统申请一大块连续内存（通过 `PlatformDependent.allocateUnpooledDirect` 或 `new byte[]`），然后在应用层自己管理分配和回收，**避免每次 I/O 都触发 JVM 堆分配**。

## 二、PooledByteBufAllocator 的继承体系

```
ByteBufAllocator (接口)    └── AbstractByteBufAllocator (抽象类)        ├── UnpooledByteBufAllocator (非池化)        └── PooledByteBufAllocator (池化)
```

关键 API：

```
// 分配 ByteBufByteBuf buffer();                     // 默认容量ByteBuf buffer(int initialCapacity);  // 指定初始容量ByteBuf buffer(int initialCapacity, int maxCapacity);// 类似还有 directBuffer(), heapBuffer(), compositeBuffer()
```

## 三、核心数据结构：Arena 分级管理

Netty 的内存池架构借鉴了 **jemalloc**（Facebook 的内存分配器）的设计，核心是 **Arena（竞技场）** 机制。

**Arena -> Chunk -> Page -> Subpage** 四级分级：

```
PooledByteBufAllocator    ├── PoolArena[] (默认 CPU 核数 * 2 个)    │   ├── PoolChunkList (不同使用率的 Chunk 链表)    │   │   ├── PoolChunk (16MB)    │   │   │   ├── PoolSubpage (8KB 一个 Page)    │   │   │   │   └── 更小尺寸的内存块 (tiny/small)    │   │   │   └── ...（多个 Page 组成 Chunk）    │   │   ├── PoolChunk    │   │   └── ...    │   └── 每个 Arena 有独立的锁    └── 通过 ThreadLocal 缓存减少竞争
```

### 3.1 PoolArena

每个 Arena 拥有独立的锁，Netty 默认创建 `2 * CPU核数` 个 Arena，这样不同线程大概率分配到不同 Arena，**减少锁竞争**。

```
// PoolArena 分配 ByteBuf 的核心逻辑private PooledByteBuf<T> allocate(PoolThreadCache cache, int reqCapacity, int maxCapacity) {    PooledByteBuf<T> buf = newByteBuf(maxCapacity);    allocate(cache, buf, reqCapacity);    return buf;}private void allocate(PoolThreadCache cache, PooledByteBuf<T> buf, int reqCapacity) {    // 1. 尝试从 ThreadLocal 缓存分配    if (cache.allocateSmall(this, buf, reqCapacity) ||        cache.allocateNormal(this, buf, reqCapacity)) {        return;    }    // 2. ThreadLocal 缓存没有，从 Arena 分配    synchronized (this) {        allocateNormal(buf, reqCapacity, false);    }    // 3. 分配到内存后，把剩余的放回 ThreadLocal 缓存}
```

### 3.2 PoolChunk

PoolChunk 默认 **16MB** 大小。Netty 通过 `PoolChunk` 将大块内存划分为 **2048 个 Page**，每个 Page 8KB。

```
final class PoolChunk<T> implements PoolChunkMetric {    private static final int SIZE_SHIFT = 11;     // 2^11 = 2048    private static final int CHUNK_SIZE = 16 << 20; // 16MB       // 物理内存    final T memory;       // 二叉树(满二叉树)管理 Page 分配    // 叶子节点 = Page(8KB), 父节点 = 合并后的更大内存块    private final byte[] memoryMap;       // 树的深度：memoryMap[depth][index]    // 根节点 depth=0, 叶子节点 depth=maxOrder=11    private final int maxOrder;       // 当前可分配的最大内存块    private int freeBytes;}
```

**核心分配算法：二叉树搜索**

```
                depth=0: [0, 16MB]               /               \      depth=1: [0,8MB]          [8MB,16MB]           /      \            /        \      d=2: [0,4MB] [4,8MB]   [8,12MB]   [12,16MB]         /  \      /  \       /    \      /    \       ...  ...  ...  ...   ...    ...  ...    ...                                          /        \                                  d=11: Page  Page                                 (8KB)  (8KB)
```

分配流程：

1.  要分配 4MB → 从 depth=2 找到空闲节点
    
2.  要分配 8KB → 从 depth=11 找到空闲叶子节点
    
3.  每次分配后标记节点为"已用"，**兄弟节点仍然空闲时，父节点标记为"部分已用"**
    
4.  释放时反向合并：兄弟节点都空闲则合并回父节点
    

### 3.3 PoolSubpage

对于 **小于 8KB 的小内存**（如 16B、32B、512B、2KB 等），一个 Page 只分配一个对象太浪费了。PoolSubpage 把一个 Page（8KB）**切分成等大小的块**。

```
final class PoolSubpage<T> {    // 所属 Chunk    final PoolChunk<T> chunk;       // Page 内的偏移量    private final int memoryMapIdx;    private final int runOffset;    private final int pageSize;       // 把 8KB 的 Page 切分成 elementSize 大小的块    private final int elemSize;    private final int maxNumElems;       // bitmap(位图)管理 subpage 内小内存块的分配状态    // long 类型的 bit 位：1=已经分配, 0=空闲    private long[] bitmap;       // 下一个空闲块索引    private int nextAvail;       // 链表连接相同 elementSize 的 Subpage    PoolSubpage<T> prev;    PoolSubpage<T> next;}
```

**共享分配流程**：当 PoolChunk 中的某个 Page 被用于分配小对象时，PoolSubpage 会将该 Page 切分成更小的块（如 512B），并用 **bitmap（位图算法）** 管理每个小块的使用状态。

## 四、ThreadLocal 缓存：PoolThreadCache

为了避免每次分配都走 Arena 的锁竞争，Netty 为每个线程维护了一个 **本地缓存**：

```
final class PoolThreadCache {    // 不同 size 的缓存队列（按 elemSize 分桶）    private final MemoryRegionCache<byte[]>[] smallSubPageHeapCaches;    private final MemoryRegionCache<ByteBuffer>[] smallSubPageDirectCaches;    private final MemoryRegionCache<byte[]>[] normalHeapCaches;    private final MemoryRegionCache<ByteBuffer>[] normalDirectCaches;       // 缓存命中分配    boolean allocateSmall(PoolArena<?> area, PooledByteBuf<?> buf, int reqCapacity) {        return cache(caches, reqCapacity).allocate(buf, reqCapacity);    }       // 释放时顺带回收到缓存    boolean add(PoolArena<?> area, PoolChunk chunk, long handle, int normCapacity) {        // ... 放入对应的 cache 队列    }}
```

**完整分配链路：**

```
PooledByteBufAllocator.buffer(1024)  │  ├─ 1. 从 PoolThreadLocalCache 拿到当前线程的 PoolThreadCache  │  ├─ 2. 尝试从 ThreadLocal Cache 分配  │    ├── 命中 → 直接返回池化 ByteBuf  │    └── 未命中 → 进入步骤 3  │  ├─ 3. 从 PoolArena 分配  │    ├── tiny (< 512B) → PoolSubpage (8KB Page 内部分配小块)  │    ├── small (512B ~ 8KB) → PoolSubpage  │    ├── normal (8KB ~ 16MB) → PoolChunk 二叉树分配  │    └── huge (> 16MB) → 直接用 Unpooled（不缓存）  │  └─ 4. 把剩余的容量回填到 ThreadLocal Cache
```

## 五、完整源码级示例

```
import io.netty.buffer.ByteBuf;import io.netty.buffer.PooledByteBufAllocator;import io.netty.buffer.PooledByteBuf;public class PooledAllocatorDemo {    public static void main(String[] args) {        // 默认池化分配器        PooledByteBufAllocator allocator = PooledByteBufAllocator.DEFAULT;               System.out.println("是否启用池化: " + allocator.isDirectBufferPooled());        System.out.println("Arena 数量: " + allocator.directArenas().length);               // 分配 1KB 的 direct buffer        ByteBuf buf = allocator.directBuffer(1024);        try {            // 写入数据            buf.writeBytes("Hello Netty Pool!".getBytes());                       // 读取数据            byte[] data = new byte[buf.readableBytes()];            buf.readBytes(data);            System.out.println("读取内容: " + new String(data));                       System.out.println("容量: " + buf.capacity());            System.out.println("是否为池化: " + (buf instanceof PooledByteBuf));        } finally {            // release 释放回池中（不是 GC 回收！）            buf.release();        }               // 查看池化统计        System.out.println("已分配 Direct 内存: " + allocator.metrics().usedDirectMemory());        System.out.println("已分配 Heap 内存: " + allocator.metrics().usedHeapMemory());    }}
```

## 六、池化 vs 非池化性能对比

池化 (PooledByteBufAllocator)

非池化 (UnpooledByteBufAllocator)

内存来源

预分配的内存池

`new byte[]`

分配速度

快（CAS + 指针偏移）

慢（JVM 堆分配 + GC）

内存回收

release 归还到池中

GC 依赖

GC 压力

低

高（产生大量短期对象）

适用场景

高并发、高频 I/O

低并发、一次性分配

内存占用

固定（池子占着）

动态

## 七、常见问题

1.  **内存泄漏**：池化 ByteBuf 用完必须 `release()`，否则 PoolChunk 的内存一直占着，实际表现为 RSS 内存持续上涨
    
2.  **引用计数**：池化 ByteBuf 使用引用计数（`refCnt()`），每 `retain()` 一次 +1，`release()` 一次 -1，减到 0 才真正归还池中
    
3.  **大内存不走池**：超过 16MB（Chunk）的分配走 Unpooled，避免大块长期占用 Arena 空间
    
4.  **泄漏检测**：Netty 提供了 `ResourceLeakDetector`，生产环境建议开启 level=PARANOID 做一轮测试，确认没有泄漏再降为 SIMPLE
    

## 总结

PooledByteBufAllocator 是 Netty 高性能的基石之一：

*   **Arena 机制**：多 Arena 减少锁竞争
    
*   **PoolChunk 二叉树**：O(logN) 的 Page 分配和合并
    
*   **PoolSubpage 位图**：小内存块的高效管理
    
*   **ThreadLocal 缓存**：零锁分配 + 零锁回收
    

一句话：能上池化就上池化，Netty 默认就是池化的，别轻易改。
