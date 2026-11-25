---
id: 2026-11-25-lsm-tree-disk
title: 写穿硬盘的秘密：LSM-Tree 如何把随机写变成顺序写的艺术
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzI2MDA5MDM0MA==&mid=2650603211&idx=1&sn=44c338195a5be5882896e2f24b47326d
source_type: article
platform: wechat
created: 2026-11-25
category: 技术
tags: [MySQL, Java]
asset_ref: Assets/2026-11/wechat-lsm-tree-disk.md
wiki_status: ingested
---

# 写穿硬盘的秘密：LSM-Tree 如何把随机写变成顺序写的艺术

> 摘要：LSM-Tree（日志结构合并树）通过"先写内存、后台归并、顺序刷盘"，放弃原地更新、改为追加写入，把随机写变成顺序写，成为现代分布式存储基石（BigTable、RocksDB、HBase、Cassandra、MyRocks 均采用）。文章详解核心组件、读写删与归并流程、Compaction 策略对比、三大放大问题与权衡，并给出完整 Java 实现与 MyRocks 实战。

## 核心要点

- **为什么需要 LSM-Tree**：B+ 树读取稳定但写入是原地随机 I/O，机械盘顺序写是随机写 100-1000 倍，SSD 上随机写还会加剧磨损放大。LSM-Tree 核心思想：写时不修改、归并时整理，牺牲部分读性能换取极高写吞吐与压缩比。
- **核心组件**：WAL（预写日志，先落盘保持久化）、MemTable（内存有序结构，通常跳表实现）、Immutable MemTable（满后转只等待刷盘）、SSTable（磁盘有序不可变文件）、Compaction（后台归并清理）。数据流：写入 WAL→MemTable→L0 SSTable→L1→…；读取从新到旧逐层查；删除写墓碑标记，Compaction 时真正清理。
- **SSTable 内部结构**：数据块（约 4KB，前缀压缩，Snappy/LZ4/Zstd 压缩）、索引块（稀疏索引，每块一条记录，二分定位）、布隆过滤器（无假阴性，每键约 10 比特控制误判率 1% 内，跳过不存在的文件）、文件尾 Footer。
- **Compaction 两大流派**：
  - **Leveled**（LevelDB/RocksDB 默认）：每层键范围不重叠，读放大低、空间放大小，但写放大高（约 10-30 倍），适合读多写少。
  - **Tiered/Universal**（Cassandra/HBase 默认）：整层积累后归并，写放大低（约 4-10 倍）、写吞吐高，但读/空间放大高，适合日志、时序、写多读少。
  - 混合策略（RocksDB 默认：L0 Tiered + L1 以下 Leveled）、Lazy Leveling、Size-Tiered、Partial Compaction 等变体。
- **三大放大与不可能三角**：写放大（实际磁盘写/逻辑写）、读放大（实际读次数/单次查询）、空间放大（实际占用/逻辑大小）无法同时最优——求低写放大就少 Compaction（读/空间放大升）、求低读放大就频繁归并（写放大升）、求低空间放大就及时清理（写放大升）。Leveled 空间放大约 1.1-1.5 倍，Tiered 可达 2 倍以上。
- **工业实现**：LevelDB（单线程 Compaction，学习范本）、RocksDB（多线程、列族、多策略、事务、TTL，用于 MyRocks/TiKV/CockroachDB）、HBase（Store=MemStore+HFile，Major Compaction）、Cassandra（Size-Tiered 默认，支持时序窗口）、MyRocks（MySQL 换 RocksDB 引擎，写放大降约 10 倍、空间省 2-4 倍，随机读略逊 InnoDB）。
- **Java 实现简易 LSM-Tree**：KvEntry（含墓碑）、MemTable（ConcurrentSkipListMap）、WAL（JSON 行追加，recover 重放）、SSTable（min/max 键+二分查询+范围扫描）、LsmTree 主类（读写锁、刷盘阈值、L0 堆积阈值、定时 Compaction、多路归并用 TreeMap 保留最新版本并清墓碑）。
- **MyRocks 实战**：`ENGINE=ROCKSDB` 建表，COMMENT 中 `cfname` 指定列族，冷热数据分层配置；写吞吐为 InnoDB 2-5 倍、空间 1/2~1/4；不支持外键/空间索引，事务最高可重复读，适合日志、埋点、时序、归档。
- **常见误区**：LSM 并非永远比 B+ 树快（少量随机更新 B+ 树可能更优）；Compaction 不是越频繁越好；布隆过滤器比特数不是越多越好（挤占 Block Cache）；层级不是越多越好（约 7 层容纳 TB 级）。
- **调优方向**：写入（增大 MemTable、多后台线程、写多用 Universal、开压缩）、读取（热数据在 Block Cache、布隆过滤器、读多用 Leveled、避免大范围扫描）、空间（压缩、合理阈值、定期全量归并、TTL）、稳定性（限制单次归并大小、限流、监控三大放大与 SSTable 数量、预留磁盘）。

## 正文

见 `[[Assets/2026-11/wechat-lsm-tree-disk]]`（采集全文，约 3.9 万字符，已通读）。文章从 B+ 树写入困境切入，依次展开 LSM-Tree 核心架构与组件（WAL/MemTable/SSTable/Compaction）、读写删刷盘归并五大流程、Compaction 策略深度对比、三大放大问题与不可能三角、LevelDB/RocksDB/HBase/Cassandra/MyRocks 五大工业实现、一份完整的 Java 简化实现（含测试）、MyRocks 建表与列族实战，最后以误区与调优最佳实践收束。

## 来源

- [写穿硬盘的秘密：LSM-Tree 如何把随机写变成顺序写的艺术](http://mp.weixin.qq.com/s?__biz=MzI2MDA5MDM0MA==&mid=2650603211&idx=1&sn=44c338195a5be5882896e2f24b47326d)（专辑《数据库》第 9 篇）

## 附件

- [[Assets/2026-11/wechat-lsm-tree-disk]]
