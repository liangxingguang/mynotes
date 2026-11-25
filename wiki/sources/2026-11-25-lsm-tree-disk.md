---
id: wiki-source-2026-11-25-lsm-tree-disk
type: source
title: 写穿硬盘的秘密：LSM-Tree 如何把随机写变成顺序写的艺术
status: active
created: 2026-11-25
updated: 2026-11-25
confidence: medium
tags:
  - source
  - 数据库
  - Java
sources:
  - raw/sources/architecture/2026-11-25-lsm-tree-disk.md
related:
  - wiki/concepts/lsm-tree.md
---
# 写穿硬盘的秘密：LSM-Tree 如何把随机写变成顺序写的艺术

## Overview（概览）

微信公众号《数据库》专辑第 9 篇技术长文。从 B+ 树写入困境切入，详解 LSM-Tree（日志结构合并树）"先写内存、后台归并、顺序刷盘"的设计哲学与核心组件（WAL/MemTable/SSTable/Compaction）、读写删刷盘归并五大流程、Compaction 两大流派（Leveled vs Tiered）深度对比、三大放大问题与不可能三角，附完整 Java 简化实现与 MyRocks 实战，最后给出常见误区与调优最佳实践。

## Key Facts（关键事实）

- LSM-Tree 核心思想：放弃原地更新、转为追加写入，将排序工作从写入时延后到后台归并时；牺牲部分读性能，换取极高写吞吐与更好压缩比。
- 核心组件：WAL（预写日志保持久）、MemTable（内存有序结构，通常跳表实现）、Immutable MemTable（满后转只读待刷盘）、SSTable（磁盘有序不可变文件）、Compaction（后台归并清理）。数据流：写入 WAL→MemTable→L0→L1→…；读取从新到旧逐层查；删除写墓碑标记，Compaction 时真正清理。
- SSTable 内部：数据块（约 4KB，前缀压缩，Snappy/LZ4/Zstd）、索引块（稀疏索引二分定位）、布隆过滤器（无假阴性，每键约 10 比特控制误判率 1% 内）、文件尾 Footer。
- Compaction 两流派：Leveled（LevelDB/RocksDB 默认，键范围不重叠，读/空间放大低、写放大高约 10-30 倍，适合读多写少）；Tiered/Universal（Cassandra/HBase 默认，整层积累归并，写放大低约 4-10 倍、读/空间放大高，适合写多读少）；RocksDB 默认混合策略（L0 Tiered + L1 以下 Leveled）。
- 三大放大与不可能三角：写放大（实际磁盘写/逻辑写）、读放大（实际读次数/单次查询）、空间放大（实际占用/逻辑大小）无法同时最优。Leveled 空间放大约 1.1-1.5 倍，Tiered 可达 2 倍以上。
- 工业实现：LevelDB（单线程 Compaction，学习范本）、RocksDB（多线程/列族/多策略/事务/TTL，用于 MyRocks、TiKV、CockroachDB）、HBase（Store=MemStore+HFile，Major Compaction）、Cassandra（Size-Tiered 默认，支持时序窗口）、MyRocks（MySQL 换 RocksDB 引擎，写放大降约 10 倍、空间省 2-4 倍、写吞吐为 InnoDB 2-5 倍，随机读略逊，不支持外键/空间索引，事务最高可重复读）。
- 常见误区：LSM 并非永远比 B+ 树快（少量随机更新 B+ 树可能更优）；Compaction 不是越频繁越好；布隆过滤器比特数非越多越好；层级约 7 层即可容纳 TB 级，非越多越好。

## Important Claims（重要论断）

### Claim 1

LSM-Tree 成为现代存储引擎主流范式的本质原因：抓住磁盘"容量与顺序带宽持续增长、随机 I/O 提升缓慢"的硬件趋势，用随机写转顺序写释放写入带宽，用可控的读/写放大换取数量级写吞吐提升。

### Claim 2

三大放大构成不可能三角，不存在完美 Compaction 策略，必须按业务读写比例、存储成本、硬件特性权衡选型。

### Claim 3

MyRocks 适合日志、埋点、时序、历史归档等写多读少业务；纯随机读取场景 InnoDB 仍有 10%-30% 性能优势。

## Concepts Introduced（引入的概念）

- [[lsm-tree]]
- 写放大 / 读放大 / 空间放大（作为 [[lsm-tree]] 页内章节，不单开页面）

## Entities Mentioned（提及的实体）

- 无专页实体（LevelDB、RocksDB、HBase、Cassandra、MyRocks 的实现细节收录于 [[lsm-tree]] 页内；单信源不撑独立实体页）

## Implications（影响／启示）

- 写密集型业务（日志、埋点、时序、归档）选型时，LSM-Tree 系引擎（RocksDB/MyRocks）应作为首选候选；理解三大放大是调优的出发点。（解读）

## Limitations（局限）

- 单一信源（微信公众号技术自媒体），性能数字（写放大倍数、MyRocks 2-5 倍吞吐等）为作者转述，未经独立基准验证。
- 采集稿中 Java 代码块被压缩为单行（采集层退化），raw 信源按采集稿逐字收录，阅读体验受损但内容未失真。

## Related Knowledge（相关知识）

- [[lsm-tree]]
- [[hot-cold-data-separation]]（存储分层与冷热数据的相邻概念）

## Source（信源）

- `raw/sources/architecture/2026-11-25-lsm-tree-disk.md`
