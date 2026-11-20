---
id: inbox-2026-11-20-mysql-6-locks
title: MySQL的6种锁，你用过几个？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/lCRWmOtILqlTdDpe2kI_bQ
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [MySQL]
asset_ref: Assets/2026-11/wechat-lCRWmOtILqlTdDpe2kI_bQ.md
wiki_status: pending
---

> **摘要**：MySQL 锁体系详解：锁按粒度分三层（全局/表级/行级），粒度越粗开销越小并发越差。本文聚焦日常最常用的 6 种——表锁、元数据锁（MDL）、意向锁、记录锁、间隙锁、临键锁。核心原则：**InnoDB 的行锁加在索引记录上而非数据行上**，因此 WHERE 走不上索引时"行锁"退化为全表封锁——这是"改一行却锁全表"事故的根源。表级三把锁：全局锁（备份用，业务代码不该出现）、表锁（LOCK TABLES，业务基本不用）、MDL（访问表自动加，事务里持有到提交，长事务持有读锁会让 DDL 卡死整表）、意向锁（标记表内行被锁，IS/IX 自动维护、意向锁之间互不冲突）。行级三把锁：记录锁（锁真实索引记录）、间隙锁（锁不存在的空位、只阻止插入、只在 RR 生效、防幻读）、临键锁（记录锁+前间隙，RR 下默认加锁单位）。

## 核心要点

- **粒度决定并发**：全局（冲突最高、开销最小）→ 表级（表锁/MDL/意向锁）→ 行级（记录/间隙/临键，仅 InnoDB 支持）；MyISAM 只支持表锁已被淘汰，InnoDB 行锁才让高并发写同一张表可行。
- **InnoDB 锁的是索引，不是数据**：行锁对应"某棵索引树上的某个位置"而非"表的第 N 行"；用不上索引就全表扫描、扫到哪锁到哪，"行锁"变"表锁"。
- **MDL（元数据锁）最易被低估**：访问表即自动加（SELECT 加 SHARED_READ，SELECT FOR UPDATE/INSERT/UPDATE/DELETE 加 SHARED_WRITE，ALTER 等 DDL 加 EXCLUSIVE），事务内持有到提交或回滚。典型事故：会话 A 查数据忘提交，会话 B 的 DDL 卡住，之后所有新查询排队超时——表"看起来活着"实际已不可用。预防：事务里不混远程调用/文件上传/用户交互、DDL 放低峰期并设 `lock_wait_timeout`、大表用 pt-online-schema-change/gh-ost、监控长事务。
- **意向锁**：标记"表里有行被锁"，UPDATE 先加 IX 再加行 X 锁，避免加表锁时逐行扫描；IS 与表级 S 兼容、IX 与表级 S 冲突、表级 X 与 IS/IX 都冲突；用户无法手动加，InnoDB 自动维护。
- **记录锁**：锁索引记录本身，等值查询命中唯一索引且记录存在时只锁该条；`LOCK_MODE = X,REC_NOT_GAP` 表示不含间隙。
- **间隙锁**：锁住"不存在的那段空位"（开区间），阻止向区间内插入，只阻止插入、间隙锁之间互不冲突、仅 RR 及以上生效（RC 基本不加）、目的是防幻读。两个事务同时持有同一间隙锁互不阻塞，但都尝试插入时会互相等待——**死锁高发源头**。
- **临键锁**：记录锁+前面间隙，锁左开右闭区间 `(prev, current]`；RR 下是 InnoDB 默认加锁单位，随手一条范围查询背后可能是一串临键锁。
- **加锁规则速查**：等值+唯一索引+记录存在→记录锁；等值+唯一索引+不存在→间隙锁；等值+普通索引+存在→临键锁（向右扫描到第一个不满足值处退化为间隙锁）；范围查询→临键锁（唯一索引首个等值定位退化为记录锁）；无可用索引→RR 下扫描到的所有记录全部加锁。**加锁范围不由你改了几行决定，而由你"扫了几行"决定。**
- **没走索引的 UPDATE 锁全表实验**：name 列无索引时 UPDATE 全表扫描，每扫到一条就加锁（含不满足条件的行），锁视图显示 IX 意向锁 + 全部记录锁 + 上界伪记录临键锁；加索引后只锁命中记录+主键，但二级索引更新要**同时锁二级索引和主键索引**保证一致性。RC 下 UPDATE 用 semi-consistent read 释放不匹配行的锁，但给 WHERE 加索引永远是第一选择。
- **RR 与 RC 取舍**：RR 有间隙锁、基本避免幻读、并发较低（强一致读、金融对账）；RC 基本无间隙锁、会出现幻读、并发较高（高并发 OLTP）。互联网公司改默认 RC 是为减少锁冲突和死锁，不是"RC 更先进"。
- **死锁复现与处理**：双方各持同一间隙锁 → 双方都要插入意向锁（插入意向锁是特殊间隙锁，与间隙锁冲突）→ 互相等待成环；InnoDB 死锁检测发现环路回滚代价小的事务。参数：`innodb_deadlock_detect`（默认 ON，检测有成本）、`innodb_lock_wait_timeout`（默认 50s）。定位：`SHOW ENGINE INNODB STATUS` 看 LATEST DETECTED DEADLOCK，或查 `performance_schema.data_lock_waits` / `sys.innodb_lock_waits`。降死锁五手段：WHERE 加索引、固定加锁顺序（转账按账户 ID 升序）、缩短事务、必要时降级 RC、**业务层重试**（Spring Retry 捕获 DeadlockLoserDataAccessException 指数退避重试，重试次数别太多）。
- **线上查锁四步**：查长事务（INNODB_TRX）→ 看谁等谁（sys.innodb_lock_waits）→ 看锁位置（performance_schema.data_locks）→ 查 MDL 排队（metadata_locks，大量 PENDING + EXCLUSIVE DDL 卡最前）。
- **写代码检查清单**：UPDATE/DELETE 先 EXPLAIN 确认走索引；事务里不调远程接口；批量更新分批（每批几百行）；多资源固定加锁顺序；表结构变更低峰期+超时+在线工具；高并发写评估降 RC；热点行考虑拆分/队列串行/Redis 预扣减。**锁的问题 90% 的答案都是让 SQL 走上索引。** 读的一致性靠另一套机制 MVCC，与锁各管一段。

## 正文

完整正文见 [[Assets/2026-11/wechat-lCRWmOtILqlTdDpe2kI_bQ.md]]。全文含锁粒度对照表、MDL/意向锁兼容性表、实验表与加锁规则速查表、完整 SQL 实验过程（会话 A/B 对照、锁视图输出）、Spring Retry 转账代码示例与线上查锁命令清单，适合对照排查"改一行别人动不了"类问题。

## 来源

- [MySQL的6种锁，你用过几个？](https://mp.weixin.qq.com/s/lCRWmOtILqlTdDpe2kI_bQ)

## 附件

- [[Assets/2026-11/wechat-lCRWmOtILqlTdDpe2kI_bQ.md]]
