---
title: 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/SgdVCOgPuv-Lp0VBCADzRQ
source_type: article
platform: 微信公众号
captured: 2026-10-28
registered_at: 2026-10-31
inbox_ref: Inbox/2026-10-28-mysql-10b-bulk-import-guide.md
asset_ref: Assets/2026/10/mysql-10b-bulk-import-guide.md
---

# 100 亿条数据如何快速写入 MySQL？从 231 天到 3.5 小时

> 来源：https://mp.weixin.qq.com/s/SgdVCOgPuv-Lp0VBCADzRQ

**先说结论：100 亿条数据写 MySQL，逐条 INSERT 参考耗时约 231 天；把"攒批 + 并行 + 少刷盘"做透，用分片并行 + `LOAD DATA` 等组合可做到 3.5 小时以内——这是参考量级，随硬件、分片、数据格式和调参浮动。**

按 **一算、二拆、三批量、四调参、五并发、六收尾** 走完整链路：分库分表、真批量、`LOAD DATA INFILE`、MyISAM 中转（仅离线可重跑）、导入期调参及恢复、分片并行、幂等断点续传、对账校验、影子表不停服切换。

## 一、别急着写代码：先反问，再算账

### 1.1 六个决定方案走向的反问

| 反问 | 它决定了什么 |
|---|---|
| 数据现在存在哪里？HDFS / Kafka / CSV 文件 / 上游库 | 走 `LOAD DATA INFILE` 还是 JDBC 攒批 |
| 一次性历史导入，还是持续增量写入 | 一次性 → 文件批导；持续 → Kafka 削峰 + 批量消费 |
| 单条数据多大？结构化还是原始日志 | 容量评估与解析成本 |
| 导入期间要不要对外查询？QPS 多少 | 索引策略、分区策略；冷数据干脆别放 MySQL |
| 允许多长的停机窗口？能接受丢多少数据 | 敢不敢关 binlog、改刷盘策略 |
| 有没有去重 / 幂等要求 | 幂等键怎么设计 |

> 面试金句：面试官问"100 亿"，考的第一件事就是你有没有"先澄清、再回答"的习惯。前提不同，答案能差出十倍性能。

### 1.2 算一笔账：100 亿到底是多大

| 指标 | 估算 |
|---|---|
| 数据行数 | 100 亿（10^10） |
| 单行大小 | 200B ~ 1KB |
| 原始数据量 | 2TB ~ 10TB（按 500B 算约 4.55TB） |
| 建索引后落盘 | 再乘 1.5 ~ 2 倍，最高 15TB+ |
| 单机 MySQL 批量写入极限 | 约 1 万 ~ 5 万行/秒 |

各写法耗时对比（普通 SSD 参考量级，量级关系是稳的）：

| 段位 | 写入方式 | 参考速度 | 100 亿耗时 |
|---|---|---|---|
| 青铜 | 逐条 INSERT + 自动提交 | 500 ~ 1000 行/秒 | 115 ~ 231 天 |
| 白银 | JDBC Batch + 手动事务 | 2 万 ~ 5 万行/秒 | 2.4 ~ 6 天 |
| 黄金 | MyBatis BatchExecutor | 8 万行/秒左右 | 约 1.5 天 |
| 铂金 | `LOAD DATA INFILE` | 10 万 ~ 50 万行/秒 | 5.5 ~ 28 小时 |
| 钻石 | MyISAM 导入再转 InnoDB | 80 万行/秒左右 | 约 3.5 小时 |
| 王者 | 分库分表 + 多机并行 + LOAD DATA | 100 万 ~ 200 万行/秒 | **3.5 小时以内** |

### 1.3 为什么单表装不下：把 B+ 树的账算给你看

InnoDB 索引是 B+ 树，数据全挂在聚簇索引叶子节点，数据页默认 **16KB**（按 1KB 行、8B 主键估算）：

| 层级 | 计算过程 | 结果 |
|---|---|---|
| 叶子节点 | 16KB ÷ 单行 1KB | 每页约存 **16 行** |
| 非叶子节点 | 16384 ÷ (主键 8B + 指针 6B) | 每节点约指向 **1170** 个下层节点 |
| 三层 B+ 树 | 1170 × 1170 × 16 | 约 **2190 万行** |
| 四层 B+ 树 | 1170³ × 16 | 约 256 亿行 |

三层 B+ 树大约撑 2000 万行——这就是"单表别超 2000 万"那句经验的出处；超过之后树高变四层，**每次查询多一次磁盘 IO，性能断崖式下跌**。所以 100 亿条至少要拆成 500 ~ 2000 张千万级分表，或 100 个分库。

## 二、找准瓶颈：一条 INSERT 的隐藏账单

逐条插入时，**每写一行就要一次网络往返、一次解析、一次 fsync 刷盘、一遍索引维护**。磁盘 IOPS 就是天花板。

> **快插的本质 = 攒批 + 并行 + 少刷盘。把"N 次"合并成"一次"：一次网络往返、一次解析、一次刷盘、一次批量维护索引。**

小数据量实测参考（1000 万行，普通 SSD + InnoDB）：

| 导入方式 | 1000 万行耗时 | 瓶颈说明 |
|---|---|---|
| 逐行 INSERT 循环 | 2 ~ 3 小时 | 1000 万次 RTT 是最大杀手 |
| 多值 INSERT + 手动事务 | 20 ~ 30 分钟 | 解析次数降了，索引仍逐行维护 |
| `LOAD DATA INFILE` | 10 ~ 20 分钟 | 服务端整文件灌入 |
| 并行 `LOAD DATA`（文件分片） | 5 ~ 10 分钟 | 多分片并发 + 顺序写，逼近磁盘上限 |

## 三、拆：100 亿必须分库分表

### 3.1 拆多少片

单表控制在 500 万 ~ 1000 万行是最优性能区间：100 亿 ÷ 1000 万 = **1000 张表**，常见布局 100 库 × 10 表、16 库 × 64 表 = 1024 分片、8 库 × 64 表 = 512 张。路由中间件选 ShardingSphere、Vitess、MyCat 都行，路由键用 `user_id % 64` 这类高基数取模。分片的意义不只是装得下，更是**把写入能力横向扩展 1000 倍**——每个分片都是一个独立并发单元。

### 3.2 分片键怎么选？怎么防倾斜？

分片键三条件：**高基数、分布均匀、查询高频**。最怕数据倾斜——热门用户数据全挤进一个分片。

| 防倾斜方案 | 特点 | 适用 |
|---|---|---|
| 哈希取模 | 简单直接，扩容时要迁移 | 分片数固定 |
| 一致性哈希 | 扩容只迁移少量数据 | 需要弹性扩容 |
| 预分片 + 动态路由 | 按哈希预分配，超阈值自动迁移 | 大厂常用 |

```java
// 分片路由：user_id 这类高基数字段取模决定库和表
int dbIndex    = (int) ((userId / tablesPerDb) % dbCount);
int tableIndex = (int) (userId % tablesPerDb);
// 目标：db_{dbIndex}.t_order_{tableIndex}
```

### 3.3 别忘了冷热分离

历史数据该归档就归档到 ClickHouse / Doris / HBase，**MySQL 只留热数据**，这一步能直接砍掉一大半分片压力。

## 四、批量：90% 的人都踩过"假批量"的坑

### 4.1 灵魂参数：rewriteBatchedStatements=true

代码里写了 `addBatch()` 速度纹丝不动？抓包才发现 **MySQL 驱动默认会把 batch 拆成一条条独立 INSERT 发出去**，网络往返一次没少。

> `rewriteBatchedStatements=true` 是 MySQL JDBC 批量的灵魂参数。开启后驱动才会把 N 条 insert 重写成 `INSERT INTO ... VALUES (...),(...),(...)` 多值插入，网络往返从 N 次变 1 次，RTT 开销直接砍 90%。不配这个参数，addBatch 就是"假批量"。

```java
String url = "jdbc:mysql://host:3306/order_db"
        + "?rewriteBatchedStatements=true"   // 把 batch 重写成多值 INSERT，灵魂参数
        + "&useServerPrepStmts=false"        // 服务端预编译与批量重写冲突，必须关
        + "&cachePrepStmts=true"             // 缓存预编译语句
        + "&allowLoadLocalInfile=true"       // 为 LOAD DATA LOCAL 铺路
        + "&useSSL=false&serverTimezone=Asia/Shanghai";
```

### 4.2 批量插入参考实现

```java
private static final int BATCH_SIZE = 5000; // 2000~10000 之间的经验甜点区

public void batchInsert(List<Order> rows, DataSource ds) throws SQLException {
    String sql = "INSERT INTO t_order(id, user_id, amount, created_at) VALUES (?,?,?,?)";
    try (Connection conn = ds.getConnection()) {
        conn.setAutoCommit(false);                 // 关自动提交，否则每条一次 fsync
        try (PreparedStatement ps = conn.prepareStatement(sql)) { // 预编译 + 防注入
            int count = 0;
            for (Order o : rows) {
                ps.setLong(1, o.id);
                ps.setLong(2, o.userId);
                ps.setBigDecimal(3, o.amount);
                ps.setTimestamp(4, o.createdAt);
                ps.addBatch();
                if (++count % BATCH_SIZE == 0) {
                    ps.executeBatch();             // 真批量，一次网络往返
                    conn.commit();                 // 小步提交，防 undo 膨胀
                    ps.clearBatch();
                }
            }
            ps.executeBatch();                     // 尾批别丢
            conn.commit();
        } catch (SQLException e) {
            conn.rollback();
            throw e;                               // 失败整体回滚，交给上层重试
        }
    }
}
```

数据在内存里已分好组的，也可用 `Lists.partition(dataList, BATCH_SIZE)` 切块后丢线程池，`CountDownLatch` 或 `CompletableFuture.allOf()` 等全部完成。

### 4.3 事务别太大，也别太小

两个真实事故：事务太大——上亿行塞进一个事务，undo log 膨胀到 OOM，回滚 rolling 了几个小时，主从延迟飙到 8 小时；事务太小——一条一提交，每次 fsync，磁盘 IOPS 打满。

> **正确姿势：每 2000 ~ 10000 行提交一次。** 单批也别盲目调大，受 `max_allowed_packet`（默认 4MB/64MB）限制，超了报 `Packet for query is too large`。

### 4.4 MyBatis 用户：记得开 ExecutorType.BATCH

默认 SqlSession 还是逐条发，要显式开 BATCH 模式，并且**定期 flush，别攒到最后**：

```java
SqlSession session = sqlSessionFactory.openSession(ExecutorType.BATCH);
try {
    LogMapper mapper = session.getMapper(LogMapper.class);
    for (int i = 0; i < list.size(); i++) {
        mapper.insert(list.get(i));
        if (i % 5000 == 0) {
            session.flushStatements();   // 定期刷盘，防内存堆积
        }
    }
    session.commit();
} finally {
    session.close();
}
```

## 五、裸写：LOAD DATA INFILE，导入的涡轮增压

### 5.1 为什么它能快一个数量级？

`LOAD DATA INFILE` 由 **MySQL 服务端直接读文件、批量写入存储引擎**，跳过 SQL 解析、优化器、权限校验和逐行事务，几乎是"裸数据灌入"，比批量 INSERT 再快 **3 ~ 5 倍**，比逐条快 10 ~ 50 倍。数据已落地为文件（TB 级离线导入）时它是首选。

### 5.2 可直接抄的完整代码

```sql
-- 导入会话先打开加速开关（导完记得恢复）
SET SESSION unique_checks      = 0;   -- 关唯一性校验
SET SESSION foreign_key_checks = 0;   -- 关外键校验
SET SESSION sql_log_bin        = 0;   -- 从库不需同步时关 binlog，慎用！

LOAD DATA LOCAL INFILE '/data/shards/part_0001.csv'
INTO TABLE t_order
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES                                  -- 跳过表头
(id, @user_id, @amount, @created_at)            -- 原始列先读进变量
SET amount     = NULLIF(@amount, ''),           -- 空串转 NULL，避免 NOT NULL 报错
    created_at = STR_TO_DATE(@created_at, '%Y-%m-%d %H:%i:%s');
    -- 时间戳字段也可以用 FROM_UNIXTIME(@ts)，边导入边转换，省一遍清洗
```

CSV 要**流式生成**，100 亿条千万别在内存里攒：

```java
try (BufferedWriter w = Files.newBufferedWriter(
        Paths.get("/data/act_" + shard + ".csv"), UTF_8, CREATE, APPEND)) {
    for (Row r : sortedRows) {          // 按主键升序写，顺序 IO
        w.write(r.id + "\t" + r.uid + "\t" + r.act + "\t" + r.ts + "\n");
    }
}
// 每个分片一个文件，多线程并行 LOAD
```

### 5.3 三个前置条件，全是坑

1. **文件位置**：服务端本地文件要落在 `secure_file_priv` 目录内；用 `LOCAL` 版本则要服务端 `SET GLOBAL local_infile = 1`，驱动侧加 `allowLoadLocalInfile=true`，两边都开才生效；
2. **格式对齐**：分隔符、换行符、编码必须严格对齐。CSV 混进异常分隔符会整批卡在第一行；统一 UTF-8、`CHARACTER SET utf8mb4`，省掉中文乱码、时间变 `0000` 的破事；
3. **前置关校验**：`unique_checks`、`foreign_key_checks` 关掉之前，先确认源数据是干净的。

### 5.4 极限玩法：MyISAM 中转，导完再转 InnoDB

可重跑的纯离线场景：先往 MyISAM 灌（无事务、写入快），灌完整体转 InnoDB：

```sql
-- 1. 建 MyISAM 表
CREATE TABLE t_log_myisam (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(64),
    create_time DATETIME
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

-- 2. 裸写灌入（MyISAM 可配合 DISABLE KEYS / ENABLE KEYS 延迟维护非唯一索引）
LOAD DATA INFILE '/tmp/all_data.csv' INTO TABLE t_log_myisam
FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n'
(user_id, action, create_time);

-- 3. 整体转 InnoDB，相当于一次有序重建
ALTER TABLE t_log_myisam ENGINE=InnoDB;
```

牺牲事务安全，**只适合"导坏了可以重来"的离线场景**，生产在线库老实 InnoDB。

## 六、调参：导入期临时超频（导完必须改回来）

### 6.1 参数速查表

```ini
# my.cnf 导入期临时配置，导完恢复
innodb_buffer_pool_size        = 物理内存的60%~80%  # 让索引维护尽量在内存完成
innodb_flush_log_at_trx_commit = 2      # 每秒刷盘一次，不再每次提交都 fsync
sync_binlog                    = 0      # binlog 不主动刷盘
innodb_log_file_size           = 4G     # redo 大一点，减少 checkpoint 频率
innodb_log_buffer_size         = 128M
innodb_autoinc_lock_mode       = 2      # 交错模式，消除并发插入的自增锁等待
innodb_autoextend_increment    = 64     # 表空间扩容步长加大，减少频繁扩容
bulk_insert_buffer_size        = 512M   # 批量插入缓冲
max_allowed_packet             = 256M   # 支撑更大的批量包
# innodb_doublewrite = 0                # 极限场景可临时关，有掉电风险，仅限可重跑
```

会话级再补三刀：

```sql
SET autocommit = 0;
SET unique_checks = 0;        -- 关闭唯一性检查，省大量随机读
SET foreign_key_checks = 0;
```

### 6.2 这些参数到底拿什么换的

> 本质是拿"崩溃可能丢 1 秒数据"的可靠性换吞吐，属于一次性离线场景的取舍。导入完成必须恢复双 1（`innodb_flush_log_at_trx_commit=1`、`sync_binlog=1`）；有主从的，导入期间跟 DBA 提前打招呼，必要时导完直接用备份重建从库。把临时调优参数当成线上配置推荐，是面试减分项，实际工作中就是事故。

### 6.3 索引策略：先灌数据，后建索引

插入时维护二级索引是大量随机 IO，页分裂严重；导完统一建索引是**顺序扫描 + 排序**，快一个数量级：

```sql
-- 导入前：关校验、删二级索引
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
ALTER TABLE t_user DROP INDEX idx_name, DROP INDEX idx_age;

-- 导入完成后：在线重建索引、恢复校验
ALTER TABLE t_user
    ADD INDEX idx_name(name),
    ADD INDEX idx_age(age),
    ALGORITHM=INPLACE, LOCK=NONE;   -- 在线建索引，不锁表
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
```

> 建表时只留主键、导完再 `ADD INDEX`，比边插边维护索引快 30% 以上；在线表变更可用 gh-ost / pt-online-schema-change。

### 6.4 地基：表结构与主键设计

- **主键必须有序**：`AUTO_INCREMENT` 或雪花 ID，保证聚簇索引顺序追加。**禁用 UUID 做主键**——随机写导致页分裂、大量随机 IO，吞吐直接砍半；
- **导入前按主键排序**：随机写变顺序写，B+ 树从"到处分裂"变成"向右追加"；
- **字段类型最小化**：能 `INT` 不 `BIGINT`，能 `DATETIME` 不 `VARCHAR`。行越小一页装得越多，树越矮。

## 七、并行：并发不是加线程那么简单

### 7.1 并行的正确姿势：落在分片维度

- 每个分片**一个文件、一条连接、一个事务**，相互隔离、天然无锁冲突，失败只重跑该分片；
- **单表内部不要并发乱序写**，会破坏顺序写、招来锁竞争；并发度应落在"分库分表"这一层；
- 单机并发控制在 **16 ~ 32**——连接数上去后 `innodb_thread_concurrency` 争抢加锁等待，吞吐**不升反降**。HDD 要收敛，SSD 可适度放大。

### 7.2 带背压、重试、超时的分片并行代码

```java
public void importAll(List<Path> shards) throws Exception {
    // 拒绝策略用 CallerRuns：队列满了让提交线程自己跑，天然背压，防 OOM
    ThreadPoolExecutor pool = new ThreadPoolExecutor(
            16, 16, 60, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(1024),
            new ThreadPoolExecutor.CallerRunsPolicy());
    List<Future<Long>> futures = new ArrayList<>();
    for (int i = 0; i < shards.size(); i++) {
        final Path file = shards.get(i);
        final int shardNo = i;   // 分片序号决定路由到哪库哪表
        futures.add(pool.submit(() -> importShardWithRetry(file, shardNo)));
    }
    long total = 0;
    for (Future<Long> f : futures) {
        try {
            total += f.get(30, TimeUnit.MINUTES);   // 超时控制，防单分片卡死拖垮全局
        } catch (TimeoutException e) {
            f.cancel(true);
            log.warn("分片导入超时，等待重试");
        }
    }
    pool.shutdown();
    log.info("导入完成，共 {} 条", total);
}

private long importShardWithRetry(Path file, int shardNo) {
    int retry = 3;
    while (true) {
        try {
            return loadDataInfile(file, shardNo);
        } catch (Exception e) {
            if (--retry <= 0) {   // 重试耗尽：降级逐条导入并记录脏数据
                log.error("分片 {} 重试失败，降级逐条导入", shardNo, e);
                return fallbackRowByRow(file, shardNo);
            }
            log.warn("分片 {} 重试中", shardNo);
        }
    }
}
```

在途批次更精细的控制可加信号量背压：

```java
Semaphore inFlight = new Semaphore(64);   // 控制在途批次，防止连接数爆炸
pool.submit(() -> {
    inFlight.acquire();
    try (Connection c = shardDs(shard).getConnection()) {
        bulkInsert(c, loadShardRows(shard));
    } finally {
        inFlight.release();
    }
});
```

Spark 生态同理，按分片键重分区后并行写，同一分片数据连续、天然顺序写：

```scala
df.repartition(2048, col("shard_id"))
  .foreachPartition { it =>
    val conn = DriverManager.getConnection(url, user, pwd)
    conn.setAutoCommit(false)
    val ps = conn.prepareStatement("insert into t_order values (?,?,?,?)")
    var n = 0
    it.foreach { row =>
      ps.setLong(1, row.getLong(0))
      ps.setLong(2, row.getLong(1))
      ps.setBigDecimal(3, row.getDecimal(2))
      ps.setTimestamp(4, row.getTimestamp(3))
      ps.addBatch()
      n += 1
      if (n % 5000 == 0) { ps.executeBatch(); conn.commit(); ps.clearBatch() }
    }
    ps.executeBatch(); conn.commit(); conn.close()
  }
```

### 7.3 三个保命细节

1. **所有线程按主键升序写**：既防页分裂，也防死锁。乱序并发写同一张表，死锁会让批量回滚到怀疑人生；
2. **防 OOM**：流式读（分页 / 游标 / `ResultSet.TYPE_FORWARD_ONLY`）+ 有界队列削峰。千万别 `SELECT *` 把 100 亿加载进 List；
3. **别依赖数据库自增 ID**：多机并行写入时自增锁会把并发写串行化，ID 在应用侧预生成。

### 7.4 ID 生成方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 数据库自增 ID | 简单可靠 | 单点瓶颈 + 自增锁竞争 | 小量数据 |
| UUID | 全局唯一 | 无序 + 占空间，页分裂 | 别做主键 |
| 雪花算法 | 有序 + 高性能 | 时钟回拨问题 | 大厂主流 |
| 号段模式 | 高性能 + 可靠 | ID 不连续 | 美团 Leaf 等 |

雪花算法核心逻辑（含时钟回拨防护）：

```java
public synchronized long nextId() {
    long timestamp = timeGen();
    if (timestamp < lastTimestamp) {
        throw new RuntimeException("时钟回拨，拒绝生成 ID");
    }
    if (timestamp == lastTimestamp) {
        sequence = (sequence + 1) & SEQUENCE_MASK;   // 同一毫秒内自增，每毫秒 4096 个
        if (sequence == 0) {
            timestamp = tilNextMillis(lastTimestamp); // 序列用完，等下一毫秒
        }
    } else {
        sequence = 0L;
    }
    lastTimestamp = timestamp;
    return ((timestamp - START_TIMESTAMP) << TIMESTAMP_SHIFT)
            | (datacenterId << DATACENTER_ID_SHIFT)
            | (workerId << WORKER_ID_SHIFT)
            | sequence;
}
```

## 八、收尾：幂等、断点续传、对账与不停服切换

### 8.1 幂等：让重跑变得安全

每条数据要有幂等键（如 `shard_id + biz_id` 唯一），写入用幂等语句兜底：

```sql
INSERT INTO t_order(id, user_id, amount) VALUES (?,?,?)
ON DUPLICATE KEY UPDATE amount = VALUES(amount);  -- 重跑安全
-- 或者 INSERT IGNORE：静默跳过重复，更快，但同样依赖唯一键
```

### 8.2 断点续传：只重跑失败的分片

100 亿导入跑几天很正常，标准做法是**分片任务落库记录水位**：

```sql
CREATE TABLE import_checkpoint (
    batch_id    VARCHAR(64) PRIMARY KEY,
    start_id    BIGINT,
    end_id      BIGINT,
    offset      BIGINT,        -- 该分片已导入的位点
    status      VARCHAR(20),   -- PENDING / RUNNING / DONE / FAILED
    import_time DATETIME
);
```

每个分片导入前查水位、跳过已完成批次，导入中定期 `save(shard, offset)`。宕机恢复后从位点继续，配合幂等写入，**可无限重试、可重入**。

### 8.3 对账：数据对上了才算完

- **总量比对**：源数据 `count` / `sum` 与各分片逐一比对；
- **抽样校验**：按分片抽样比对字段完整性；
- **指纹校验**：关键批次导入前算 MD5 / checksum，导完复核。

### 8.4 影子表 + RENAME：不停服切换

```sql
-- ① 影子表导入，先拆掉二级索引
CREATE TABLE t_log_shadow LIKE t_log;
ALTER TABLE t_log_shadow DROP INDEX idx_uid, DROP INDEX idx_ctime;
-- ② 并行 LOAD DATA 灌数据（略）
-- ③ 导完在线重建索引
ALTER TABLE t_log_shadow
    ADD INDEX idx_uid(uid),
    ADD INDEX idx_ctime(create_time),
    ALGORITHM=INPLACE, LOCK=NONE;
-- ④ 行数/抽样校验通过后，原子切换，秒级完成，失败随时回滚
RENAME TABLE t_log TO t_log_bak, t_log_shadow TO t_log;
```

### 8.5 主从延迟与在线业务保护

- 导入期间**别读从库**（会读到脏数据），导完直接用备份重建从库，或 GTID + 并行复制追延迟；
- 导入任务加**令牌桶限流**，TPS 控制在从库可承受范围，预留连接余量；
- 条件允许用**独立导入集群 + 夜间窗口**，保护主库 IOPS；
- 要求"边导边查"的，用 `PARTITION BY RANGE` 按时间分区，导入只影响最新分区，老分区冷热分离，查询走分区裁剪。

## 九、全景图：两条完整链路与周边细节

### 9.1 一次性导入 vs 持续写入

持续写入场景链路：采集层（Flume / Logstash）→ 消息队列（Kafka）→ 计算层（Spark / Flink / DataX）→ MySQL 分片集群（ShardingSphere 路由）→ 数仓（ClickHouse / Doris）。**离线历史回灌直接走文件批导更快，MQ 反而多一跳；流式数据才需要 MQ 削峰——场景决定方案。**

### 9.2 硬件与操作系统层

- **磁盘**：SSD + RAID10；数据文件与日志文件分盘存放；
- **内存**：关闭 swap（`vm.swappiness = 0`），防止缓冲池被换出；
- **IO 调度**：SSD 用 noop / none 调度器；
- **网络**：写入机器与数据库同机房部署，万兆网卡，连接池复用避免频繁建 TCP。

### 9.3 先度量，再优化

- `SHOW ENGINE INNODB STATUS` 的 LOG 段，看刷盘与 checkpoint；
- `Innodb_rows_inserted` 每秒增量，直接反映写入速率；
- `iostat` 的 `%util` 和 `await`，看磁盘是否打满。

## 十、灵魂拷问：100 亿真的该放 MySQL 吗？

**如果这 100 亿是冷数据归档、日志、时序数据，它可能压根不该进 MySQL。**

| 场景 | 更合适的选择 |
|---|---|
| 在线交易、高并发 OLTP | MySQL 分库分表（本文方案） |
| 日志 / 时序分析 | ClickHouse、Doris |
| 海量 KV / 宽表 | HBase |
| 全文检索 | Elasticsearch |
| HTAP 混合负载 | TiDB |
| 离线数仓 | Hive + Parquet |

MySQL 的舒适区是**分片后的热数据和在线事务**。面试时敢质疑题设——"100 亿如果只是分析查询，别硬塞 MySQL"——反而是最大的加分项。

## 十一、面试加餐：加分点、减分点与 30 秒模板

**加分项：**
1. 先反问澄清——数据源、量级、实时性、去重；
2. 用 B+ 树算账——"2000 万"说得出原理而不是背结论；
3. 分层递进——SQL 写法 → 参数 → 架构，有层次不散乱；
4. 有真实数字——"逐行 2 小时 vs 并行 7 分钟"；
5. 提兜底与幂等——重试、降级、对账；
6. 主动点出取舍——关 binlog、降持久性是一次性离线场景；
7. 敢质疑前提——"100 亿不一定适合 MySQL"。

**减分项：**
1. 上来就 `for` 循环 `insert`，或只会一句"批量插入"；
2. 不知道 `rewriteBatchedStatements`，写了 `addBatch` 就自我感觉良好；
3. 不考虑分表，默认 100 亿塞一张表；
4. 只谈速度，不谈一致性、幂等、可回滚；
5. 把临时调优参数当成线上配置推荐。

**30 秒口述模板（一算、二拆、三批量、四调参、五并发、六收尾）：**

> 100 亿先算容量（约数 TB），单机单表不可能，所以分层来做：① 拆——分库分表 1000 片，单表压到千万级；② 批量——优先 `LOAD DATA INFILE`，退而求其次多值 INSERT + 手动事务，连接串必加 `rewriteBatchedStatements=true`；③ 调参——关 `unique_checks`、`flush_log_at_trx_commit=2`、调大 buffer pool，导完恢复；④ 并发——分片多线程、按主键顺序写、导入期不建二级索引；⑤ 收尾——建索引、对账校验、影子表切流量；⑥ 最后补一句：冷数据其实不该放 MySQL。

## 写在最后

浓缩成一句话：**把随机写变成顺序写，把单点变成并行，把逐条变成批量。**

落地清单：
- [ ] 算清容量，确认时间窗口，六个反问都有答案
- [ ] 分片方案确定，单表控制在千万行以内
- [ ] 连接串加上 `rewriteBatchedStatements=true`
- [ ] 导入期参数已改，且明确了"谁来改回去"
- [ ] 幂等键 + 水位表设计完成
- [ ] 对账脚本（count / checksum / 抽样）就位
- [ ] 主从延迟预案已和 DBA 对齐
