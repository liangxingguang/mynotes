---
id: 2026-10-28-mysql-10b-bulk-import-guide
title: 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/SgdVCOgPuv-Lp0VBCADzRQ
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [MySQL, 工程实践, Java]
asset_ref: Assets/2026/10/mysql-10b-bulk-import-guide.md
wiki_status: pending
---

# 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时

> 面试场景题的工程落地版：逐条 INSERT 需 231 天，按"一算、二拆、三批量、四调参、五并发、六收尾"六步口诀做到 3.5 小时以内。涵盖 B+ 树算账、真批量参数、LOAD DATA、导入期调参、分片并行、幂等断点续传与影子表切换。

## 核心要点

- **B+ 树算账**：16KB 页 ÷ 1KB 行 ≈ 每页 16 行，非叶子 16384÷14B ≈ 1170 扇出，三层树约 2190 万行——"单表 2000 万"经验的出处；100 亿须拆 500~2000 张千万级分表。
- **快插本质** = 攒批 + 并行 + 少刷盘：把 N 次网络往返/解析/fsync 合并成一次。
- **灵魂参数 `rewriteBatchedStatements=true`**：不配它 `addBatch()` 是假批量（驱动拆成逐条 INSERT）；且 `useServerPrepStmts=false` 必须关。每 2000~10000 行小步提交，防 undo 膨胀与 fsync 打满。
- **`LOAD DATA INFILE`** 服务端整文件灌入，跳过解析/逐行事务，比批量 INSERT 快 3~5 倍；注意 `secure_file_priv` / `local_infile` 双端开关与格式对齐。
- **调参是一次性超频**：`innodb_flush_log_at_trx_commit=2`、`sync_binlog=0`、buffer pool 60~80%，导完必须恢复双 1——当线上配置推荐是事故。
- **索引策略**：先灌数据后建索引（顺序扫描 + 排序快一个数量级），`ALGORITHM=INPLACE, LOCK=NONE` 在线重建；主键必须有序（雪花 ID），禁 UUID。
- **并行落在分片维度**：每分片一文件一连接一事务，单机并发 16~32（再高 `innodb_thread_concurrency` 争抢反降吞吐）；所有线程按主键升序写防页分裂与死锁。
- **收尾四件套**：幂等键 + `ON DUPLICATE KEY UPDATE`、水位表断点续传、count/sum/checksum 对账、影子表 `RENAME` 不停服切换。
- **架构师冷水**：冷数据/日志/时序数据不该进 MySQL，选 ClickHouse/Doris/HBase/ES。

## 正文

见 [[Assets/2026/10/mysql-10b-bulk-import-guide.md]]（全文约 2.1 万字，含分段耗时表、参数速查表、并行导入/雪花算法完整代码与面试口述模板）。

## 来源

- [100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时，我把面试官问懵了](https://mp.weixin.qq.com/s/SgdVCOgPuv-Lp0VBCADzRQ)

## 附件

- [[Assets/2026/10/mysql-10b-bulk-import-guide.md]]
