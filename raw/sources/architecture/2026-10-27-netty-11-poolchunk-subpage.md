---
title: Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage
source: 微信公众号「Java解忧杂货铺」
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484111&idx=1&sn=21f5fda71a216271344503641607e27e&chksm=fe6ca395c91b2a83e35eeb02b6b1ca0681f8896167f014acc263e0ba4735740fe34b84f9f6a7
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-29
inbox_ref: Inbox/2026-10-27-netty-11-poolchunk-subpage.md
asset_ref: Assets/2026/10/netty-11-poolchunk-subpage.md
---
# Netty源码分析(11) — 池化内存分配：PoolChunk 与 PoolSubpage

> 内存分配是所有网络框架的核心基础设施之一。Netty 作为高性能网络框架，如果每次读写都 new 一个 ByteBuf 再等着 GC 回收，那性能基本就废了。所以它搞了一套极其精密的**池化内存分配**机制，而 PoolChunk 和 PoolSubpage 正是这套体系的核心。

* * *

## 一、背景与问题

上一篇文章我们聊了 `PooledByteBufAllocator`，知道了 Netty 是如何管理内存池的入口。但你肯定会问：**内存池里面到底长什么样？**

这就好比我们知道了有个"内存银行"，但不知道这家银行的保险柜是怎么设计的。

Netty 要解决几个核心问题：

1.  **分配效率**：应用随时都在分配/释放缓冲区，每次都要从操作系统 malloc 显然不行

2.  **内存碎片**：频繁分配小块内存会导致碎片——明明还有很多空闲内存，却没有连续的一块能塞下请求

3.  **池化管理**：分配后释放的内存如何复用？又如何合并回大块？

4.  **大小分级**：1KB 的请求和 1MB 的请求，处理方式必然不同

Netty 的答案很巧妙：**模仿 jemalloc 的思想**，用 PoolChunk 管理大块内存，用 PoolSubpage 管理小块内存，用 PoolArena 统筹全局。

> 彩蛋：你有兴趣可以翻翻 Redis 的 zmalloc 或者 Facebook 的 jemalloc 源码，会发现思路惊人地相似——这几乎是工业界内存池的"标准答案"。

* * *

## 二、架构概览：三层内存管理模型

先看整体关系：

```
PooledByteBufAllocator    ↓ 持有PoolArena[]   ← 每个线程绑定一个 Arena，减少锁竞争    ↓ 持有PoolChunkList (q100, q75, q50, q25, q0, qInit)    ↓ 每个 list 包含多个PoolChunk          ← 管理 16MB 连续内存块    ├── PoolSubpage[]  ← 管理 8KB 以下的小内存(每个 page 8KB)    └── 大块分配 → 二叉树 buddy allocation    PoolThreadCache    ← 线程本地缓存，分配/释放无锁
```

核心流程一句话：**小内存走 Subpage 位图分配，大内存走 Chunk 二叉树伙伴分配，Tiny 和 Small 还有缓存兜底**。

* * *

## 三、PoolChunk：二叉伙伴分配器的实现

PoolChunk 管理的是一块连续内存，默认大小是 **16MB**（`chunkSize = 1 << 24`）。它将这块内存按 **2 的幂次**分割成不同大小的块，用一颗**满二叉树**来管理。

### 3.1 二叉树结构

```
// PoolChunk.java — 核心字段final class PoolChunk<T> implements PoolChunkMetric {    // 二叉树节点深度：一颗 12 层的满二叉树    // 叶子节点对应 pageSize = 8KB (2^13)    // 根节点对应 chunkSize = 16MB (2^24)    private final byte[] memoryMap;    // 每个节点的分配状态 (0=空闲, >0=已分配/部分分配)    private final byte[] depthMap;    // 每个节点在树中的层级（只读，初始化后不变）        // 物理内存存储    private final T memory;                   // 实际的内存块（直接内存或堆内存）    private final int offset;                 // 偏移量        // 每个 Chunk 包含 N 个 Subpage 用于小块分配    private final PoolSubpage<T>[] subpages;       // 所属的 Arena 和 ChunkList    private PoolChunkList<T> parent;    private PoolChunk<T> prev;    private PoolChunk<T> next;       // 二叉树层数: 11 (因为 pageSize = 8KB = 2^13, chunkSize = 16MB = 2^24, 24-13 = 11)    private final int maxOrder;       // 每个 page 的大小: 8192 (8KB)    private final int pageShifts;    // page 的偏移 bit: 13 (2^13 = 8192)    private final int pageSize;    // chunk 总共的 page 数: 2048 (16MB / 8KB)    private final int chunkSize;}
```

这棵二叉树长这样（以 maxOrder=3 为例，实际的 11 层同理）：

```
             depth=0   [0]   ← 整块 16MB                     /    \           depth=1 [1]     [2] ← 每块 8MB                 /  \    /  \        depth=2 [3][4]  [5][6] ← 每块 4MB               / \ / \  / \ / \         depth=3 [7..14]       ← 每块 8KB (page)
```

**关键设计**：`memoryMap` 数组的下标就是节点编号，值是 **该节点及其子树中最浅的空闲深度**。

*   `memoryMap[id] = depth(id)` → 这个节点完全空闲

*   `memoryMap[id] = maxOrder+1` → 这个节点完全被分配

*   `memoryMap[id]` 落在中间 → 部分分配

这个设计的精妙之处：**查找空闲块时只需上溯到根节点，O(1) 就能知道整棵树的状态**。

### 3.2 内存分配 allocate 方法

```
// PoolChunk.java — 分配指定大小的内存long allocate(int normCapacity) {    // 1. 如果请求大小在 Subpage 范围内 (<= pageSize)    //    → 走子页分配    if ((normCapacity & subpageOverflowMask) != 0) {        return allocateSubpage(normCapacity);    }    // 2. 否则走二叉树分配    //    找到能容纳 normCapacity 的节点    int d = maxOrder - (log2(normCapacity) - pageShifts);    int id = allocateNode(d);    if (id < 0) return id;  // 分配失败       // 3. 计算物理偏移并更新剩余可用量    freeBytes -= runLength(id);    return id;}
```

### 3.3 allocateNode：二叉树搜索

```
// PoolChunk.java — 二叉树节点搜索private int allocateNode(int d) {    // 从根节点开始搜索    int id = 1;  // 根节点是 1 而不是 0（0 表示整个 chunk）    int initial = -(1 << d);  // 用于标记       // 获取根节点的分配状态    byte val = memoryMap[id];    if (val > d) {        // 根节点的可用深度都达不到 d → 没有合适大小的空闲块        return -1;    }       // 逐层往下搜索    while (val < d || (id & initial) == 0) {        // 先尝试左子节点（下标 id * 2）        int leftId = id << 1;        byte leftVal = memoryMap[leftId];        if (leftVal <= d) {            id = leftId;  // 左子树能找到，往左走        } else {            // 左子树不行，走右子树（下标 id * 2 + 1）            int rightId = leftId ^ 1;            byte rightVal = memoryMap[rightId];            if (rightVal <= d) {                id = rightId;  // 右子树可以            } else {                // 理论上走不到这里，因为父节点 val <= d                // 但各子节点都已满时会被标记                return -1;            }        }        val = memoryMap[id];    }       // 找到目标节点后，把它标记为已分配    setValue(id, unusable);  // unusable = maxOrder + 1    // 向上更新父节点的状态    updateParentsAlloc(id);       return id;}
```

**分配时的关键逻辑**：从根节点开始往下搜索，每次优先选左子树——这保证了内存分配是从低到高连续分配的，一定程度上降低了外部碎片。

分配完成后，要沿着路径向上更新所有祖先节点的状态：

```
// PoolChunk.java — 向上更新父节点分配状态private void updateParentsAlloc(int id) {    while (id > 1) {        int parentId = id >>> 1;  // 父节点        byte val1 = memoryMap[id];        byte val2 = memoryMap[id ^ 1];  // 兄弟节点        // 父节点的值 = min(左孩子, 右孩子)        byte minVal = (byte) Math.min(val1, val2);        if (memoryMap[parentId] != minVal) {            setValue(parentId, minVal);        }        id = parentId;    }}
```

这个 update 操作保证了根节点的 `memoryMap[1]` 始终反映**整个 chunk 目前能分配的最大块**——简直是个实时状态仪表盘。

### 3.4 内存释放

```
// PoolChunk.java — 释放节点void free(long handle, int normCapacity) {    if (handle >= 0) {  // Subpage 分配        // 释放子页        ...    } else {        // 二叉树分配的节点，取反得到节点 ID        int id = -(int) handle;        // 标记为空闲（恢复为当前深度）        setValue(id, depth(id));        // 向上更新父节点（合并）        updateParentsFree(id);        freeBytes += runLength(id);    }}private void updateParentsFree(int id) {    while (id > 1) {        int parentId = id >>> 1;        byte val1 = memoryMap[id];        byte val2 = memoryMap[id ^ 1];  // 兄弟        byte minVal = (byte) Math.min(val1, val2);        if (memoryMap[parentId] != minVal) {            setValue(parentId, minVal);        }        if (minVal != depth(parentId)) {            // 还有子节点被占用，停止向上传播            break;        }        id = parentId;    }}
```

释放时不仅要恢复当前节点，还要检查兄弟节点——如果兄弟也空闲，父节点就"恢复"为空闲，这样**相邻的小块会自动合并成大块**。这就是伙伴分配器的精髓：分裂和合并都是 O(log N)。

* * *

## 四、PoolSubpage：小块内存的精细管理

前面说了，如果每次只分配几十字节也要走二叉树的 8KB 对齐，那太浪费了。**PoolSubpage 就是专门处理这种 <= 8KB 的小块分配**。

### 4.1 结构解析

```
// PoolSubpage.javafinal class PoolSubpage<T> {    // 所属的 PoolChunk 和所在的内存页    final PoolChunk<T> chunk;    private final int memoryMapIdx;   // 在 chunk 中的节点索引    private final int runOffset;      // 相对于 chunk 起始地址的偏移    private final int pageSize;       // 8KB       // 位图管理    private final long[] bitmap;      // 每个 bit 表示一个子块的占用情况    private int bitmapLength;         // 位图实际长度(用的 long 数量)    private int nextAvail;            // 下一个可用的子块索引       // 元素大小（这里叫 elemSize）    private int elemSize;             // 每个子块的大小（如 16B、32B、512B ...）    private int maxNumElems;          // 最多可以分出多少子块    private int numAvail;             // 当前可用子块数       // 链表结构：同一个 Arena 中相同 elemSize 的 Subpage 串在一起    PoolSubpage<T> prev;    PoolSubpage<T> next;       // 是否没有被使用（释放后可回收回 Chunk）    boolean doNotDestroy;}
```

### 4.2 初始化：一个 Page 的分割

```
// PoolSubpage.java — 构造和初始化PoolSubpage(PoolChunk<T> chunk, int memoryMapIdx, int runOffset, int pageSize, int elemSize) {    this.chunk = chunk;    this.memoryMapIdx = memoryMapIdx;    this.runOffset = runOffset;    this.pageSize = pageSize;    this.bitmap = new long[pageSize >>> 10 >>> 3]; // 8KB → 64个long → 4096 bits    initWithElemSize(elemSize);}boolean initWithElemSize(int elemSize) {    this.elemSize = elemSize;    this.maxNumElems = pageSize / elemSize;  // 一个 page 能拆出多少个子块    this.numAvail = maxNumElems;       // 位图大小：够覆盖所有子块就行    int bitmapLen = maxNumElems >>> 6;  // 除 64    if ((maxNumElems & 63) != 0) bitmapLen++;    this.bitmapLength = bitmapLen;       // 重置位图    for (int i = 0; i < bitmapLength; i++) bitmap[i] = 0;    this.nextAvail = 0;  // 从 0 开始    this.doNotDestroy = true;    return true;}
```

关键点：一个 8KB 的 page，如果 elemSize = 32B，就能分出 **256** 个子块；如果 elemSize = 512B，就只能分 **16** 个子块。

### 4.3 小块分配：位图操作

```
// PoolSubpage.java — 分配一个子块long allocate() {    if (numAvail == 0 || !doNotDestroy) return -1;  // 满了或者已销毁       // 1. 找到一个空闲的子块索引    int bitmapIdx = getNextAvail();    if (bitmapIdx < 0) return -1;       // 2. 在位图中标记为已占用    int q = bitmapIdx >>> 6;          // 第几个 long    int r = bitmapIdx & 63;           // long 中的第几位    if ((bitmap[q] & (1L << r)) != 0) {        // 正常情况下不该走到这里，double-check        return -1;    }    bitmap[q] |= (1L << r);           // 按位或，置 1       // 3. 更新可用计数    numAvail--;    if (numAvail == 0) {        // 当前 page 满了，从 Arena 的可用链表中移除        removeFromPool();    }       // 4. 返回编码句柄    // 编码方式：(bitmapIdx << 32) | memoryMapIdx    return toHandle(bitmapIdx);}
```

位图操作的细节很优雅——每个 `long` 的 64 位对应 64 个子块，查找空闲块时利用 `Long.numberOfTrailingZeros` 这类 CPU 指令，比遍历快得多。

```
// PoolSubpage.java — 查找下一个可用子块private int getNextAvail() {    int next = nextAvail;    if (next >= 0) {        // 有缓存的可用位置（上次释放后记录）        nextAvail = -1;        return next;    }    // 遍历位图查找空闲位    return findNextAvail();}private int findNextAvail() {    // 遍历每个 long 位图    for (int i = 0; i < bitmapLength; i++) {        long bits = bitmap[i];        if (~bits != 0) {  // 至少有一位是 0 → 有可用            // 找到最低位为 0 的位置            return (i << 6) + Long.numberOfTrailingZeros(~bits);        }    }    return -1;}
```

这里 `~bits != 0` 的判断非常高效——一个 clock cycle 就能看出这个 long 里有没有空闲位置。

### 4.4 小块释放

```
// PoolSubpage.java — 释放一个子块boolean free(int bitmapIdx) {    int q = bitmapIdx >>> 6;    int r = bitmapIdx & 63;       // 清除位图    bitmap[q] &= ~(1L << r);       // 设置下一个可用位置（缓存，提升后续分配速度）    setNextAvail(bitmapIdx);       numAvail++;    if (numAvail == maxNumElems) {        // 全部空闲：彻底释放，把页面归还给 Chunk（可以回收）        return true;    } else if (numAvail == 1) {        // 从没有可用变成有 1 个可用：重新加入 Arena 的链表        addToPool();    }    return false;}
```

释放时 **`return true` 表示整个 Subpage 全空闲**——这很重要，Arena 看到这个信号会把 Subpage 彻底归还给 Chunk，释放 8KB 的页面。

* * *

## 五、PoolArena：统筹全局

PoolChunk 和 Subpage 都在 `PoolArena` 的管理之下。来看 Arena 的分配流程——这才是完整的链路：

```
// PoolArena.java — 核心分配入口private void allocate(PooledByteBuf<T> buf, int reqCapacity, int normCapacity) {    // 1. Tiny/Small 分配（< 8KB）    if (normCapacity < chunkSize) {        // 先查线程本地缓存 → 分配效率最高        if (allocateTinyOrSmall(buf, reqCapacity, normCapacity)) {            return;        }    }       // 2. Normal 分配（8KB ~ 16MB）    if (normCapacity <= chunkSize) {        if (allocateNormal(buf, reqCapacity, normCapacity)) {            return;        }    }       // 3. Huge 分配（> 16MB）：不池化，直接 allocate    allocateHuge(buf, reqCapacity);}
```

这里的关键设计：

1.  **先查 ThreadLocal 缓存**：`PoolThreadCache` 保存了之前释放的内存，无锁分配

2.  **再走 Arena 的池**：从 Chunk 或 Subpage 分配

3.  **超大块跳过池化**：>16MB 直接调用 `PlatformDependent.allocateDirect`，因为太大不值得缓存

Arena 中有 6 个 ChunkList，按**使用率**排序：

```
// PoolArena.java — ChunkList 定义private final PoolChunkList<T> qInit;    // 0-25% 使用private final PoolChunkList<T> q000;     // 1-50% 使用private final PoolChunkList<T> q025;     // 25-75% 使用private final PoolChunkList<T> q050;     // 50-100% 使用private final PoolChunkList<T> q075;     // 75-100% 使用private final PoolChunkList<T> q100;     // 100% 使用（已满）
```

Chunk 在不同使用率阶段间流转——用满了升到下一级，释放后有空间降回上一级。这种设计确保了**高使用率的 Chunk 和低使用率的 Chunk 分开管理**，减少遍历。

* * *

## 六、完整示例：验证内存分配行为

来写一个实际运行验证的 Demo：

```
import io.netty.buffer.*;import io.netty.util.internal.PlatformDependent;/** * 验证 PoolChunk + PoolSubpage 的分配行为 */public class PoolChunkDemo {       public static void main(String[] args) {        // 获取 PooledByteBufAllocator（默认就是池化的）        PooledByteBufAllocator allocator = PooledByteBufAllocator.DEFAULT;               System.out.println("=== Netty 池化内存分配 Demo ===");        System.out.println("默认是否启用池化: " + PooledByteBufAllocator.DEFAULT.isDirectBufferPooled());        System.out.println("Arena 数量: " + allocator.directArenas().size());        System.out.println();               // ========== 1. Tiny 分配 (512B < 8KB → 走 Subpage) ==========        System.out.println("=== 1. Tiny 分配 (Subpage 位图) ===");        ByteBuf tinyBuf1 = allocator.directBuffer(32);  // 请求 32 字节        ByteBuf tinyBuf2 = allocator.directBuffer(512); // 请求 512 字节        ByteBuf tinyBuf3 = allocator.directBuffer(1024);// 请求 1KB               printBufInfo(tinyBuf1);        printBufInfo(tinyBuf2);        printBufInfo(tinyBuf3);        System.out.println();               // ========== 2. Normal 分配 (8KB ~ 16MB → 走 Chunk 二叉树) ==========        System.out.println("=== 2. Normal 分配 (Chunk 二叉树) ===");        ByteBuf normalBuf1 = allocator.directBuffer(8192);     // 恰好 8KB = 1 page        ByteBuf normalBuf2 = allocator.directBuffer(16384);    // 16KB = 2 pages               printBufInfo(normalBuf1);        printBufInfo(normalBuf2);        System.out.println();               // ========== 3. 大块分配 (验证二叉树分裂) ==========        System.out.println("=== 3. 大块分配 (验证二叉树分裂) ===");        ByteBuf bigBuf1 = allocator.directBuffer(1024 * 1024);     // 1MB        ByteBuf bigBuf2 = allocator.directBuffer(4 * 1024 * 1024); // 4MB               printBufInfo(bigBuf1);        printBufInfo(bigBuf2);        System.out.println();               // ========== 4. 释放后重新分配（验证池化复用） ==========        System.out.println("=== 4. 释放与复用 ===");        tinyBuf1.release();        tinyBuf2.release();        tinyBuf3.release();        System.out.println("释放了 3 个 tiny buffer，内存在 PoolThreadCache 中缓存");               // 重新分配应该命中缓存        ByteBuf recycledBuf1 = allocator.directBuffer(32);        ByteBuf recycledBuf2 = allocator.directBuffer(512);        System.out.println("重新分配 32B + 512B，理论上命中缓存");        recycledBuf1.release();        recycledBuf2.release();               // 释放大块        normalBuf1.release();        normalBuf2.release();        bigBuf1.release();        bigBuf2.release();               // ========== 5. 内存泄漏检测 ==========        System.out.println("=== 5. 内存泄漏检测 ===");        System.gc(); // 触发 GC，泄漏检测器会报告未释放的 buffer        System.out.println("如果看到 [LEAK] 警告，说明有 ByteBuf 未 release()");    }       private static void printBufInfo(ByteBuf buf) {        int capacity = buf.capacity();        int maxCapacity = buf.maxCapacity();        int refCnt = buf.refCnt();        boolean direct = buf.isDirect();        String bufType = buf.getClass().getSimpleName();               if (buf instanceof PooledByteBuf) {            PooledByteBuf<?> pooled = (PooledByteBuf<?>) buf;            System.out.printf("[%s] cap=%d, maxCap=%d, refCnt=%d, direct=%s, 底层类=%s%n",                    bufType, capacity, maxCapacity, refCnt, direct,                    buf.unwrap() != null ? buf.unwrap().getClass().getSimpleName() : bufType);        }    }}
```

运行后你会看到类似输出：

```
=== Netty 池化内存分配 Demo ===默认是否启用池化: trueArena 数量: 4=== 1. Tiny 分配 (Subpage 位图) ===[PooledUnsafeDirectByteBuf] cap=32, maxCap=2147483647, refCnt=1, direct=true, 底层类=PooledUnsafeDirectByteBuf[PooledUnsafeDirectByteBuf] cap=512, maxCap=2147483647, refCnt=1, direct=true, 底层类=PooledUnsafeDirectByteBuf[PooledUnsafeDirectByteBuf] cap=1024, maxCap=2147483647, refCnt=1, direct=true, 底层类=PooledUnsafeDirectByteBuf=== 2. Normal 分配 (Chunk 二叉树) ===[PooledUnsafeDirectByteBuf] cap=8192, maxCap=2147483647, refCnt=1, direct=true, 底层类=PooledUnsafeDirectByteBuf...
```

* * *

## 七、PoolChunkList 的流转关系

前面提到 Arena 中有 6 个 ChunkList，它们之间的流转关系很值得细品：

```
                 ┌───────────┐                 │  qInit    │  (0-25% 使用, 新创建)                 └─────┬─────┘                       │ 使用率超过 minUsage                       ▼                 ┌───────────┐                 │  q000     │  (1-50%)                 └─────┬─────┘                       │         ┌─────────────┼─────────────┐         ▼           ▼             ▼    ┌────────┐   ┌────────┐    ┌────────┐    │ q025   │   │ q050   │    │ q075   │    │25-75%  │◄──┤50-100% │◄───┤75-100% │    └───┬────┘   └───┬────┘    └───┬────┘        │            │            │        └────────────┼─────────────┘                     ▼                ┌──────────┐                │  q100    │  (100% 满)                └────┬─────┘                     │ 释放后有空间                     ▼  (实际会降级到 q075 等)
```

这个设计的牛逼之处：

*   **新 Chunk 创建后先进 qInit**，只用了 0-25%

*   **大量分配后向使用率更高的 List 移动**

*   **释放后如果使用率下降，降级到更低 List**

*   **全空闲的 Chunk 最终会被回收**，归还给操作系统

```
// PoolChunkList.java — 关键方法：判断是否到达下限boolean free(PoolChunk<T> chunk, long handle, int normCapacity) {    chunk.free(handle, normCapacity);  // 实际释放    if (chunk.usage() < minUsage) {        // 使用率低于当前 list 下限 → 移到前一个 list        remove(chunk);        return move0(chunk);  // 尝试移到前一个 list    }    return true;}
```

* * *

## 八、性能数据与实测分析

我亲自跑了个简单的 JMH 压测，对比池化和非池化的分配性能（100w 次分配 + 释放）：

分配大小

池化 Pooled

非池化 Unpooled

提升倍数

32B

45 ns

310 ns

~6.8x

1KB

52 ns

380 ns

~7.3x

64KB

210 ns

890 ns

~4.2x

1MB

1800 ns

5200 ns

~2.9x

**结论**：

1.  小块内存池化优势最大（Subpage 位图分配极快）

2.  大块内存优势缩小（Chunk 二叉树分配有 O(log N) 开销）

3.  加上 PoolThreadCache 后，同线程反复分配几乎零拷贝

* * *

## 九、注意事项与常见坑

### 9.1 必须手动释放

虽然 Netty 做了池化，但 ByteBuf 的引用计数必须显式管理：

```
// 正确ByteBuf buf = allocator.buffer(1024);try {    // 使用 buf} finally {    buf.release();  // 必须！返还给池}
```

如果不调 release，PoolChunk 就永远少了一个可用的位置，**始终以为是满的**。

### 9.2 超过 16MB 不池化

```
// PoolArena.allocateHuge — 超大块直接分配private void allocateHuge(PooledByteBuf<T> buf, int reqCapacity) {    // 不经过任何池，直接创建    // 释放时直接调 free，不回收入池}
```

如果你的应用频繁分配 >16MB 的 DirectBuffer，池化不会帮到你。

### 9.3 内存碎片 ≠ Java 堆碎片

Netty 的 DirectBuffer 池化是在**堆外内存**管理的。如果你通过 PoolChunk 分配了很多 8KB 的 Page 然后又释放回来，这 16MB 的连续内存块中可能布满"空洞"——**要警惕**。

### 9.4 PoolThreadCache 的自动释放

```
// 每个线程的 PoolThreadCache 会在空闲时自动回收// 配置项：// - io.netty.allocator.cacheTrimInterval: 缓存裁剪间隔（默认 8192）// - io.netty.allocator.maxCachedBufferCapacity: 最大缓存大小（默认 32KB）
```

如果线程很闲，PoolThreadCache 会定期 trim 掉一部分缓存内存，避免资源被浪费。

### 9.5 调试时别忘了开启内存泄漏检测

```
# JVM 参数加这个-Dio.netty.leakDetectionLevel=paranoid
```

然后在应用中多调几次 `System.gc()`，Netty 的泄漏检测器就会暴露出哪些 ByteBuf 没有被 release。

* * *

## 十、总结

PoolChunk + PoolSubpage 是 Netty 内存池的心脏，理解它们你就掌握了 Netty 内存管理的精髓：

组件

负责

数据结构

对齐粒度

PoolChunk

16MB 连续内存的整体管理

二叉伙伴分配树

8KB (page)

PoolSubpage

8KB page 内的小块管理

位图(bitmap)

16B/32B/...

PoolChunkList

Chunk 按使用率分区

双向链表

\-

PoolArena

统筹分配

组合上述组件

\-

PoolThreadCache

线程本地无锁缓存

Map + 队列

\-

一句话总结：**小归位图、大归树、超大直接走 malloc**——Netty 用最优雅的方式解决了内存池化的效率问题。下次面试问到"Netty 内存管理怎么减少 GC"，你现在可以挺直腰板回答了。

* * *

## 下期预告

下一篇我们将深入 **FastThreadLocal**，看看 Netty 是怎么把 JDK 的 ThreadLocal 性能干翻好几倍的——关键就在于那个藏在背后的 InternalThreadLocalMap。
