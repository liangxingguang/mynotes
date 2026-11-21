---
id: wiki-concept-mysql-locking
type: concept
title: MySQL 锁体系（锁粒度与六种锁）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - concept
  - database
  - mysql
  - concurrency
sources:
  - raw/sources/architecture/2026-11-20-mysql-6-locks.md
related:
  - wiki/sources/mysql-6-locks.md
  - wiki/concepts/spring-transaction.md
  - wiki/concepts/retry-governance.md
---
# MySQL 锁体系（锁粒度与六种锁）

## Definition（定义）

MySQL 并发控制中"写与写之间防踩踏"的锁机制体系：按控制粒度分**全局 / 表级 / 行级**三层，日常开发最常用的 6 种锁是**表锁、元数据锁（MDL）、意向锁、记录锁、间隙锁、临键锁**。核心规律：**同一句 SQL 的加锁范围不由"改了几行"决定，而由"扫了几行"决定**——索引走没走、隔离级别是什么、记录存不存在，都会让加锁范围相差十万八千里。

## Why It Matters（为什么重要）

锁是线上事故的高频源头："改了一行别人动不了"（无索引全表扫描锁全表）、"表看起来还活着但新请求全部超时"（长事务持有 MDL 卡死 DDL）、"两个不相关事务互相等死"（间隙锁死锁）。不理解锁的粒度与加锁规则，就无法解释阻塞、无法定位死锁、无法写出高并发安全的 SQL；而锁只解决写与写的冲突，读的一致性由另一套机制 MVCC 承担，两者分工才构成完整的并发控制图景。

## Core Characteristics（核心特征）

1. **粒度三层坐标系**：粒度越粗，实现越简单、开销越小，并发能力越差；粒度越细反之。全局（备份锁，整库）→ 表级（表锁、MDL、意向锁）→ 行级（记录锁、间隙锁、临键锁，仅 InnoDB）。MyISAM 只支持表锁（一条 UPDATE 锁整表），InnoDB 的行锁才让高并发写同一张表成为可能。
2. **InnoDB 锁的是索引，不是数据**：行锁加在索引记录上而非数据行上。直接推论：① 行锁对应"某棵索引树上的某个位置"，不是"表的第 N 行"；② 查询用不上任何索引时只能全表扫描，扫到哪锁到哪——"行锁"退化为事实上的"表锁"。
3. **表级三把锁**：
   - **全局锁**：`FLUSH TABLES WITH READ LOCK`（整库只读，备份用）；MySQL 8.0 的 `LOCK INSTANCE FOR BACKUP` 更温和（允许 DML、只阻止 DDL）。业务代码不该出现。
   - **表锁**：`LOCK TABLES ... READ/WRITE`，最古老机制，业务基本不用（锁表即放弃行级并发），多为历史遗留。
   - **元数据锁（MDL）**：访问表即自动加（5.5.3 起），普通 SELECT→SHARED_READ，SELECT...FOR UPDATE / DML→SHARED_WRITE，DDL→EXCLUSIVE。**事务内的 MDL 持有到事务提交/回滚而非语句结束**——长事务持 MDL 读锁可让 DDL 卡死，之后所有新查询排队超时，表"看起来活着"实则对新请求不可用。预防：事务不混远程调用、DDL 低峰期+`lock_wait_timeout`、大表用 pt-online-schema-change / gh-ost、监控长事务。
   - **意向锁**：表级标记"表里有行被锁"，分 IS（意向共享）/ IX（意向排他）。UPDATE 先加 IX 再加行锁，避免表锁时逐行扫描。**意向锁之间互不冲突；IS 与表级 S 兼容、IX 与表级 S 冲突、表级 X 与两者都冲突；用户无法手动加**。
4. **行级三把锁**：
   - **记录锁（Record Lock）**：锁单条索引记录。唯一索引等值命中存在的记录时使用，锁视图 `LOCK_MODE = X,REC_NOT_GAP`（不含间隙）。
   - **间隙锁（Gap Lock）**：锁开区间（如 `(5,10)`），锁的不是"第 7 行"（不存在）而是"这段空位不许插入"。特性：只阻止插入；**间隙锁之间互不冲突**（死锁高发源头）；仅 RR 及以上生效（RC 除唯一性/外键检查外基本不加）；目的是防幻读。
   - **临键锁（Next-Key Lock）**：记录锁+前面间隙的组合，锁左开右闭区间 `(prev, current]`。**RR 下是 InnoDB 默认加锁单位**。唯一索引等值定位时退化为记录锁（如 `id=10` 只锁 `(5,10]` 中的 10 记录本身，`(5,10)` 间隙不锁）。
5. **加锁规则速查**：等值+唯一索引+存在→记录锁；等值+唯一索引+不存在→间隙锁；等值+普通索引+存在→临键锁（向右扫描到第一个不满足值后该值处退化为间隙锁）；范围查询+任意索引→临键锁（唯一索引首个等值定位退化为记录锁）；无可用索引→RR 下扫描到的所有记录全部加锁（RC 下 semi-consistent read 释放不匹配行）。
6. **实验验证（无索引 UPDATE 锁全表）**：`name` 无索引时 `UPDATE ... WHERE name='bob'` 全表扫描，对 id 1~5 五条记录+上界伪记录全部加锁（锁视图：表级 IX 意向锁 + 6 行 X 锁），与被改行无关的会话也被阻塞——"改一行锁全表"的根源。`ALTER TABLE ADD KEY` 后只锁目标索引记录、主键记录与右侧间隙，其他会话立即放行；注意**通过二级索引更新要同时对二级索引和主键索引加锁**。
7. **RR 与 RC 的差别**：RC 去掉间隙锁（除唯一性检查与外键检查），代价是放弃可重复读、出现幻读。高并发 OLTP 用 RC 减少锁冲突与死锁是**明确的取舍，不是"RC 更先进"**；强一致读、金融对账场景仍用 RR。
8. **死锁：加锁顺序错了，不是锁错了**：经典间隙锁死锁——两个事务同时拿到同一间隙的间隙锁（互相不阻塞），都试图插入时都需要插入意向锁（插入意向锁是特殊间隙锁，与间隙锁冲突），形成"双方都持间隙锁→都要插入意向锁→互相等待"环路，InnoDB 死锁检测发现环路后回滚代价小的事务。相关参数：`innodb_deadlock_detect`（默认 ON，主动检测，高并发下检测成本高，关掉须靠超时兜底）、`innodb_lock_wait_timeout`（默认 50s）。降低手段：WHERE 加索引、固定加锁顺序（如转账按账户 ID 升序）、缩短事务、降级 RC、业务层重试（Spring Retry `@Retryable` + `DeadlockLoserDataAccessException`，配合指数退避）。
9. **线上查锁四步**：① 长事务（`information_schema.INNODB_TRX` 按 trx_started 排序）；② 谁等谁（`sys.innodb_lock_waits`）；③ 锁位置（`performance_schema.data_locks`，看 LOCK_TYPE/LOCK_MODE/LOCK_DATA）；④ MDL 排队（`performance_schema.metadata_locks` JOIN `threads`，PENDING 成片+EXCLUSIVE DDL 卡最前即 MDL 事故）。`data_locks` 表 8.0 才有，5.7 后默认开启部分采集。

## Structure（结构）

六种锁的分类与关键特性（据信源整理）：

| 锁 | 粒度 | 加锁方式 | 关键特性 |
|---|---|---|---|
| 全局锁 | 整库 | `FLUSH TABLES WITH READ LOCK` / `LOCK INSTANCE FOR BACKUP` | 备份用，业务不用 |
| 表锁 | 表 | `LOCK TABLES ... READ/WRITE` | 语法古老，放弃行级并发，多为历史遗留 |
| 元数据锁 MDL | 表 | 访问表自动加 | 事务内持有到提交；DDL 需 EXCLUSIVE；长事务可卡死全表 |
| 意向锁 | 表 | 行锁前自动加 IS/IX | 意向锁间兼容；IX 与表级 S 冲突；无法手动加 |
| 记录锁 | 行（索引记录） | 唯一索引等值命中存在记录 | `X,REC_NOT_GAP`，不含间隙 |
| 间隙锁 | 行（开区间空位） | 唯一索引等值命中不存在记录 / 普通索引 | 只阻止插入；间隙锁间兼容；仅 RR+ |
| 临键锁 | 行（左开右闭） | RR 默认加锁单位 | 记录锁+前间隙；唯一索引等值退化为记录锁 |

## How It Works（运作方式）

加锁范围由扫描路径决定：`WHERE` 走索引时锁落在索引树上对应位置（记录/间隙/临键）；走不上索引时 InnoDB 全表扫描、逐行加锁，行锁退化为表锁。锁视图 `performance_schema.data_locks` 中 `LOCK_MODE` 的 `X` 表示 next-key lock、`X,REC_NOT_GAP` 表示只锁记录不含间隙，据此可核对实际加锁范围。隔离级别决定间隙锁是否生效：RR 保留（防幻读），RC 基本去除（换并发度）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-transaction|Spring 事务传播/隔离/失效]]：隔离级别（RR/RC）须与数据库对齐，事务边界与 MDL 持有时长直接相关。
- [[retry-governance|重试治理]]：死锁回滚是正常现象，业务层重试（指数退避+次数上限）是死锁治理的常规手段。

### Distinctions（区分）

- **锁 vs MVCC**：锁解决"写与写之间别踩踏"，MVCC 解决"读的时候不加锁也能保证一致性"，两条线并行、各管一段，合起来才是完整并发控制图景（本信源明确提示）。
- **表锁 vs 行锁**：MyISAM 只有表锁（写多读少场景已被淘汰），InnoDB 行锁建立在"锁索引"之上——无索引时行锁退化为表锁，二者并非绝对对立。

## Evolution（演进）

- 2026-11-21 — 首建。信源为微信公众号技术科普长文《MySQL的6种锁，你用过几个？》，确立锁粒度三层坐标系、"InnoDB 锁索引不锁数据"这一解释所有现象的基线、六种锁的分类与特性、加锁规则速查表、无索引 UPDATE 锁全表实验、RR/RC 取舍、间隙锁死锁复现与降低手段、线上查锁四步。此前知识库已有 [[mysql-bulk-import]]（导入吞吐，不涉及锁机制）与 [[spring-transaction]]（事务传播/隔离/失效，不展开锁细节），本页补上锁体系这一独立主题。

## Open Questions（开放问题）

- 不同 MySQL 小版本在范围查询边界（右端点不满足条件的首条记录）的加锁处理偶有差异，关键业务须以实测为准（信源已标注）。
- 高并发下关掉 `innodb_deadlock_detect` 的阈值与代价如何量化，信源只给出"谨慎评估"的定性结论。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-20-mysql-6-locks.md`（锁粒度三层、六种锁分类与特性、加锁规则速查、无索引实验、RR/RC 对照、间隙锁死锁复现、查锁四步、检查清单）

## Related Knowledge（相关知识）

- [[mysql-6-locks|MySQL的6种锁，你用过几个？（信源页）]]
- [[spring-transaction|Spring 事务传播/隔离/失效（概念页）]]
- [[retry-governance|重试治理（概念页）]]
