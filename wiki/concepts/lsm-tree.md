---
id: wiki-concept-lsm-tree
type: concept
title: LSM-Tree（日志结构合并树）
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - concept
  - 数据库
  - 存储
sources:
  - raw/sources/architecture/2026-11-25-lsm-tree-disk.md
related:
  - wiki/concepts/hot-cold-data-separation.md
---
# LSM-Tree（日志结构合并树）

## Definition（定义）

Log-Structured Merge-Tree，一种面向写密集场景的存储引擎结构：放弃原地更新、转为追加写入，写入先入内存有序结构、达到阈值后整体刷盘为磁盘上不可变的有序文件（SSTable），后台线程定期将多层文件归并排序、清理过期数据。通过"先写内存、后台归并、顺序刷盘"把随机写变成顺序写，以牺牲部分读性能换取极高写吞吐与更好的压缩比。是 BigTable、RocksDB、HBase、Cassandra、MyRocks 等现代存储系统的共同基石。

## Why It Matters（为什么重要）

B+ 树读取路径稳定，但写入是原地随机 I/O：机械盘顺序写是随机写的 100-1000 倍，SSD 上随机写还加剧磨损放大。日志、埋点、时序等写密集场景下 B+ 树写入瓶颈被无限放大。LSM-Tree 抓住"磁盘容量与顺序带宽持续增长、随机 I/O 提升缓慢"的硬件趋势，用随机写转顺序写释放写入带宽，成为 KV 存储引擎的标准范式，并深刻影响新一代数据库架构。

## Core Characteristics（核心特征）

1. **写时不修改，归并时整理**：排序工作从写入时延后到后台归并时，所有磁盘写入都是顺序操作。
2. **多层有序结构**：最上层在内存，下层在磁盘，每层容量呈指数级增长（扇出比通常为 10）。
3. **删除即写墓碑**：删除操作也是纯追加写入，写墓碑标记，Compaction 时真正清理。
4. **三大放大权衡**：写放大、读放大、空间放大构成不可能三角，无完美策略，只能按业务权衡。
5. **Compaction 策略决定性格**：Leveled 与 Tiered 两大流派在读写性能与空间效率上取舍相反，工业实现多为混合策略。

## Structure（结构）

核心组件：

- **WAL（Write-Ahead Log）**：预写日志，写入内存前先追加写磁盘日志，宕机重放重建 MemTable，保证持久性；按段组织，刷盘完成后清理。
- **MemTable**：内存有序结构，通常跳表实现（实现简单、并发控制容易、范围查询优秀、插入平均 O(log n)）。
- **Immutable MemTable**：MemTable 满后转只读，等待刷盘。
- **SSTable**：磁盘有序不可变文件。内部含数据块（约 4KB，前缀压缩，Snappy/LZ4/Zstd 压缩）、索引块（稀疏索引，每块一条记录，二分定位）、布隆过滤器（无假阴性，每键约 10 比特控制误判率 1% 内，跳过不存在的文件）、文件尾 Footer（元数据偏移、校验和、魔数）。
- **Compaction**：后台归并，将上层 SSTable 合并到下层，清理过期版本与墓碑，控制 SSTable 数量。

数据流：写入 WAL → MemTable → Immutable MemTable → L0 SSTable → L1 → …；读取从新到旧逐层查（布隆过滤器排除 → 索引块定位 → 数据块二分）；删除写墓碑。Level 0 文件键范围可重叠需逐个检查，Level 1 及以下每层键范围互不重叠，二分定位单文件即可。

## How It Works（运作方式）

**写入**：追加 WAL → 插入 MemTable → 返回成功；后台异步：MemTable 满转 Immutable → 刷盘生成 L0 SSTable → 清理旧 WAL。同步部分只有一次内存插入与一次顺序磁盘写。

**读取**：MemTable → Immutable MemTable → L0（按新到旧逐个文件，布隆过滤+索引+二分）→ L1…→ 最底层 → 未找到返回不存在。

**删除**：写墓碑记录，读取遇墓碑即返回不存在，Compaction 时清理。

**刷盘（Flush）**：遍历跳表顺序写出 → 切块 → 生成索引 → 构建布隆过滤器 → 写数据块/过滤器块/索引块/元索引块/文件尾 → 更新元数据可见 → 清理旧 WAL 与 Immutable MemTable。纯顺序写。

**归并（Compaction）**：层超阈值触发 → 选上层若干 SSTable → 找下层键范围重叠文件 → 多路归并 → 保留每键最新版本、丢旧版本与墓碑 → 写入下层新 SSTable → 原子替换 → 后台删旧文件。不阻塞前台读写，但消耗 I/O 与 CPU。

**Compaction 两大流派**：

- **Leveled**（LevelDB/RocksDB 默认）：每层键范围不重叠。读放大低、空间放大小、单次归并可控；写放大高（约 10-30 倍），底层数据被反复读写。适合读多写少、空间敏感场景。
- **Tiered/Universal**（Cassandra/HBase 默认）：整层积累到数量阈值后整体归并。写放大低（约 4-10 倍）、写吞吐高；读/空间放大高、大归并可能抖动。适合写多读少、时序、日志场景。
- **混合策略**（RocksDB 默认）：L0 Tiered + L1 以下 Leveled。另有 Lazy Leveling、Size-Tiered、Partial Compaction 等变体。

**三大放大与不可能三角**：写放大 = 实际磁盘写/逻辑写；读放大 = 实际读次数/单次查询；空间放大 = 实际占用/逻辑大小。追求低写放大→少 Compaction→读/空间放大升；追求低读放大→频繁归并→写放大升；追求低空间放大→及时清理→写放大升。Leveled 空间放大约 1.1-1.5 倍，Tiered 可达 2 倍以上。

## Relationships（关系）

### Related Concepts（相关概念）

- [[hot-cold-data-separation]]：LSM 的多层 SSTable 与列族分层本身就是存储分层的一种实现形态，二者在"冷热数据异构存储"上交汇。

### Dependencies（依赖项）

- 依赖内存有序结构（跳表）与磁盘顺序写带宽；调优依赖布隆过滤器、Block Cache、Compaction 阈值等参数的协同。

### Distinctions（区分）

- 与 **B+ 树**：B+ 树读稳定、写为原地随机 I/O；LSM 写极快、读需多路查找且有放大问题。少量随机更新场景 B+ 树可能更优（LSM 需写 WAL+MemTable+多次 Compaction，写放大更高）。

## Evolution（演进）

- 2026-11-25 由单篇微信技术文章首次编译入 Wiki（单信源，置信度中）。工业谱系：LevelDB（Google，单线程 Compaction 范本）→ RocksDB（Facebook，多线程/列族/多策略）→ MyRocks、TiKV、CockroachDB 等衍生；HBase 与 Cassandra 分别以 Store/HFile、SSTable 形态继承该范式。具体性能数字（写放大倍数、MyRocks 吞吐对比）未经独立基准验证，待更多信源印证。

## Open Questions（开放问题）

- 三大放大在具体硬件（NVMe、QLC SSD）上的实测数值与信源转述的偏差，需基准信源校准。
- Leveled/Tiered 之外的新策略（如 Partial Compaction 的生产效果）在真实业务中的验证数据。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-25-lsm-tree-disk.md`

## Related Knowledge（相关知识）

- 信源页：[[2026-11-25-lsm-tree-disk]]
- [[hot-cold-data-separation]]
