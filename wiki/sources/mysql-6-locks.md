---
id: wiki-source-mysql-6-locks
type: source
title: MySQL的6种锁，你用过几个？
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - database
  - mysql
  - concurrency
sources:
  - raw/sources/architecture/2026-11-20-mysql-6-locks.md
related:
  - wiki/concepts/mysql-locking.md
  - wiki/concepts/spring-transaction.md
  - wiki/concepts/retry-governance.md
---
# MySQL的6种锁，你用过几个？

## Overview（概览）

微信公众号技术科普长文，系统讲解 MySQL 锁体系：先搭"全局 / 表级 / 行级"三层粒度坐标系，再逐一拆解日常最常用的 6 种锁（表锁、元数据锁 MDL、意向锁、记录锁、间隙锁、临键锁），用加锁规则速查表、无索引 UPDATE 锁全表实验、RR/RC 对照、间隙锁死锁复现与线上查锁四步命令收尾。核心立论：**同一句 SQL 的加锁范围由"扫了几行"决定，不由"改了几行"决定**。正文自 `Assets/2026-11/wechat-lCRWmOtILqlTdDpe2kI_bQ.md` 采集稿逐字收录（3 处配图为 1px 占位，原文图不可文字化，正文完整）。编译为概念页 [[mysql-locking]]。

## Key Facts（关键事实）

- **粒度三层**：全局（备份锁，冲突最高/开销最小）→ 表级（表锁/MDL/意向锁）→ 行级（记录/间隙/临键锁，仅 InnoDB）。粒度越粗并发越差，粒度越细管理成本越高。
- **InnoDB 锁索引不锁数据**：行锁加在索引记录上；用不上索引时全表扫描，扫到哪锁到哪，"行锁"退化为事实"表锁"。
- **全局锁**：`FLUSH TABLES WITH READ LOCK` 整库只读；MySQL 8.0 `LOCK INSTANCE FOR BACKUP` 允许 DML 只阻止 DDL；业务代码不该出现。
- **表锁**：`LOCK TABLES ... READ/WRITE` 语法古老，业务基本不用，看到即判历史遗留。
- **MDL**：5.5.3 起访问表即自动加；普通 SELECT→SHARED_READ，SELECT...FOR UPDATE/DML→SHARED_WRITE，DDL→EXCLUSIVE；**事务内持有到提交/回滚**，长事务持 MDL 读锁可卡死 DDL、拖垮全表新查询。
- **意向锁**：IS/IX 表级标记行锁存在，UPDATE 先加 IX 再加行锁；意向锁之间互不冲突；IX 与表级 S 冲突、表级 X 与 IS/IX 都冲突；用户无法手动加。
- **记录锁**：唯一索引等值命中存在的记录，锁视图 `LOCK_MODE = X,REC_NOT_GAP`；只锁记录不含间隙。
- **间隙锁**：锁开区间（如 `(5,10)`），只阻止插入；间隙锁之间互不冲突（死锁高发源头）；仅 RR 及以上生效；目的是防幻读。
- **临键锁**：左开右闭 `(prev, current]`，RR 下 InnoDB 默认加锁单位；唯一索引等值定位退化为记录锁。
- **无索引实验**：`name` 无索引的 UPDATE 全表扫描，锁视图显示表级 IX 意向锁 + 对 id 1~5 五条记录及上界伪记录共 6 行 X 锁；`ADD KEY` 后只锁目标索引记录、主键记录与右侧间隙；**通过二级索引更新须同时对二级索引和主键索引加锁**。
- **RR vs RC**：RC 去间隙锁（除唯一性/外键检查），代价是幻读；高并发 OLTP 选 RC 是明确取舍，不是"RC 更先进"。
- **死锁复现**：两事务同获 `(5,10)` 间隙锁互不阻塞，都插入时都需要插入意向锁（与间隙锁冲突），形成环路；InnoDB 死锁检测回滚代价小事务。参数：`innodb_deadlock_detect`（默认 ON）、`innodb_lock_wait_timeout`（默认 50s）。
- **降低死锁五手段**：WHERE 加索引、固定加锁顺序（转账按账户 ID 升序）、缩短事务（不塞远程调用）、降级 RC、业务层重试（Spring Retry `@Retryable` + `DeadlockLoserDataAccessException`，指数退避）。
- **线上查锁四步**：INNODB_TRX 查长事务 → sys.innodb_lock_waits 看谁等谁 → performance_schema.data_locks 看锁位置 → metadata_locks JOIN threads 查 MDL 排队（`data_locks` 表 8.0 才有）。

## Important Claims（重要论断）

### Claim 1：加锁范围由扫描路径决定，而非修改行数
加锁范围不由你改了几行决定，而由你"扫了几行"决定。同一语句在索引走没走、隔离级别、记录是否存在的组合下，加锁范围相差十万八千里——这是解释"改一行锁全表"类事故的基线。

### Claim 2：InnoDB 锁的是索引不是数据，用不上索引时行锁退化为表锁
行锁对应"某棵索引树上的某个位置"而非"表的第 N 行"；查询用不上任何索引时只能全表扫描、扫到哪锁到哪。给 WHERE 加索引永远是第一选择，RC 的 semi-consistent read 虽缩小锁定范围但仍不值得赌。

### Claim 3：MDL 是最低被低估的锁，长事务可让整张表停摆
不需要写任何加锁语句，访问表即自动加 MDL；事务内的 MDL 持有到事务结束。会话查完数据忘提交，DDL 卡住，之后所有新查询排队超时——表"看起来还活着"，实则对新请求完全不可用。

### Claim 4：间隙锁之间互不冲突，是死锁高发源头
两个事务可同时持有同一间隙的间隙锁互不阻塞，但都需插入时都等待插入意向锁，形成"双方持间隙锁→都要插入意向锁→互相等待"闭环。业务层重试是必要兜底，死锁回滚是正常现象而非代码写错。

### Claim 5：锁只解决写与写防踩踏，读的一致性靠 MVCC
锁不是 MySQL 并发控制的全部：它解决写与写之间别踩踏，而读的时候不加锁也能保证一致性，靠的是另一套机制 MVCC。两条线并行工作、各管一段，合起来才是完整并发控制图景。

## Concepts Introduced（引入的概念）

- [[mysql-locking|MySQL 锁体系（锁粒度与六种锁）]]（本信源编译为该概念页）
- 锁粒度三层坐标系（全局/表级/行级）
- 元数据锁 MDL（访问即加、事务内持有）
- 意向锁（IS/IX 表级行锁标记）
- 记录锁 / 间隙锁 / 临键锁（行级三把锁）
- 插入意向锁（特殊间隙锁，与间隙锁冲突、与插入意向锁互不冲突）
- 加锁规则速查（等值/范围 × 唯一/普通索引 × 存在/不存在）
- semi-consistent read（RC 下 UPDATE 释放不匹配行锁）
- 死锁检测与降低手段（固定加锁顺序、业务层重试）

## Entities Mentioned（提及的实体）

- InnoDB（行锁引擎，锁加在索引记录上）
- MyISAM（仅表锁，写多读少场景已被淘汰）
- MDL（元数据锁，MySQL 5.5.3 起引入）
- performance_schema（`data_locks` / `metadata_locks` / `threads`，8.0 起含 data_locks）
- `sys.innodb_lock_waits`（锁等待视图）
- `information_schema.INNODB_TRX`（长事务查询）
- Spring Retry（`@Retryable` / `@Backoff` / `@EnableRetry`、`DeadlockLoserDataAccessException`）
- pt-online-schema-change / gh-ost（在线 DDL 工具，影子表+分批拷贝）
- `LOCK INSTANCE FOR BACKUP`（MySQL 8.0 备份锁）

## Implications（影响／启示）

- **写 SQL 先查索引**：UPDATE/DELETE 的 WHERE 必须能走索引，`EXPLAIN` 看 `key` 不为空——锁问题 90% 的答案指向同一件事。
- **事务要短**：事务里不混远程调用、文件上传、用户交互；DDL 放低峰期并设 `lock_wait_timeout`，大表变更用在线工具。
- **并发设计留退路**：高并发写入评估降级 RC；热点行考虑拆分、队列串行化或 Redis 预扣减；两个资源都要改时全系统固定加锁顺序。
- **排障有固定顺序**：接口卡死、CPU 不高、连接堆满时，按长事务→锁等待→锁位置→MDL 四步查，先定位阻塞源再谈优化。
- **死锁是常态不是异常**：业务层准备重试（次数别多、配指数退避），与重试治理的"唯一重试所有者"纪律互补。

## Limitations（局限）

- 原文 3 处配图（锁粒度示意图、MDL 事故图、死锁示意图）为 1px 占位符，图示内容不可文字化，正文对图的解读以文字描述为准。
- 文中实验与锁视图输出为作者本地验证结果，具体锁行为受 MySQL 版本（如 `data_locks` 仅 8.0 有）与参数配置影响，**不能直接外推为所有环境的确定行为**，关键业务以实测为准（作者已对范围查询边界处理标注版本差异）。
- 检查清单中"批量更新每批几百行"等为经验值，未给出严格推导，属作者建议而非硬性规则。

## Related Knowledge（相关知识）

- [[mysql-locking|MySQL 锁体系（锁粒度与六种锁）（概念页）]]
- [[spring-transaction|Spring 事务传播/隔离/失效（概念页）]]
- [[retry-governance|重试治理（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-11-20-mysql-6-locks.md`
