相信大家对于 SQL 中的 `UPDATE` 都不陌生，如果我说它和锁相关，你肯定会想到它会锁住被改的那一行。但事实上，一句 `UPDATE`语句，很可能同时会牵扯到表锁、元数据锁、意向锁、记录锁等等多种锁！

**同一句 SQL，索引走没走、隔离级别是什么、记录存不存在，加锁范围相差十万八千里。** 这些锁你可能只熟悉一两种，但你每天写的 CRUD 大部分都在悄悄用，只是你从没意识到罢了。

这篇文章就是帮你可以一眼看出每条 SQL 背后到底挂了几把锁、锁了多大范围——如果以后再遇到"为什么我就改了一行，别人却动不了"的问题，那你自己就能查明白了。

* * *

## 一、先把锁的坐标系搭起来

聊锁之前，先记住一点：**锁不是像开关那样只有开和关，而是按控制粒度大小分成三层，三套机制一起起作用。**

粒度越粗，实现越简单、开销越小，但并发能力越差；粒度越细，并发能力越强，但管理成本也越高。MySQL 用如下一套组合拳来平衡这件事：

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

本文重点介绍日常开发最常用的 6 种：**表锁、元数据锁、意向锁、记录锁、间隙锁、临键锁**。

### 1.1 粒度决定并发

粒度

代表锁

冲突概率

加锁开销

典型引擎

全局

全局读锁

最高

最小

所有引擎

表级

表锁、MDL、意向锁

高

小

MyISAM、InnoDB

行级

记录锁、间隙锁、临键锁

低

大

仅 InnoDB

MyISAM 只支持表锁，一条 `UPDATE` 就会锁整张表，所以它在写多读少的业务里早就被淘汰了。InnoDB 支持行锁，才让"高并发写入同一张表"成为可能。

### 1.2 划重点：InnoDB 锁的是索引，不是数据

**InnoDB 的行锁加在索引记录上，而不是加在数据行上。** 这句话可以解释后面所说的所有现象。

它直接能推出如下两个结论：

1.  1\. 一条行锁对应的是"某棵索引树上的某个位置"，不是"表的第 N 行数据"；
    
2.  2\. 如果查询用不上任何索引，InnoDB 就只能扫整张表，扫到哪，锁到哪——于是"行锁"变成了事实上的"表锁"。
    

> Note
> 
> 这里说的"索引"包含主键索引（聚簇索引）和二级索引。哪怕表上没有二级索引，聚簇索引也一直存在，所以 InnoDB 永远有索引可用——问题在于你的 `WHERE` 条件能不能用上它。

* * *

## 二、表级的三把锁：表锁、MDL、意向锁

### 2.1 比表锁还粗的全局锁

做全库逻辑备份时，可以用 `FLUSH TABLES WITH READ LOCK` 加一把全局读锁。加锁之后，整库的 DML 和 DDL 都会被挡住，只能读。

`-- 加全局读锁（整库只读）   FLUSH TABLES WITH READ LOCK;      -- 备份完成后释放   UNLOCK TABLES;`

MySQL 8.0 还提供了一个更温和的备份锁 `LOCK INSTANCE FOR BACKUP`：它允许 DML，只阻止 DDL，对线上业务更友好。

全局锁不该出现在业务代码里，知道它在备份时存在就够了。

### 2.2 表锁：语法还在，业务基本不用

`LOCK TABLES t_order READ;   LOCK TABLES t_order WRITE;   UNLOCK TABLES;`

`LOCK TABLES` 是 MySQL 最古老的锁机制，InnoDB 支持它，但业务里几乎不用——因为一旦锁表，所有行操作都被拖住，完全放弃了行级并发。

真正需要"显式表级控制"的场景，通常是在做大批量数据修复时，用 `LOCK TABLES ... WRITE` 换取更可预测的执行时间。日常 CRUD 里，看到代码里出现 `LOCK TABLES`，基本可以判定这是历史遗留。

### 2.3 元数据锁 MDL：不加一句 SQL，却能让整张表停摆

这是最容易被低估的一把锁。它从 MySQL 5.5.3 开始引入，**你不需要写任何加锁语句，只要访问表，MySQL 就会自动加 MDL。**

规则很简单：

*   • 普通 `SELECT` → 加 MDL 读锁（`SHARED_READ`）
    
*   • `SELECT ... FOR UPDATE` → 加 MDL 读锁（`SHARED_WRITE`）
    
*   • `INSERT/UPDATE/DELETE` → 加 MDL 读锁（`SHARED_WRITE`）
    
*   • `ALTER TABLE` 等 DDL → 加 MDL 写锁（`EXCLUSIVE`）
    

读锁之间互相兼容，读写互斥。**关键在于：事务里的 MDL 会一直持有到事务提交或回滚，而不是语句结束就释放。**

这就引出了开发日常最典型的一类事故：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

会话 A 只是查了一下数据，忘了提交事务；会话 B 的执行 DDL 卡住；之后所有新来的查询排在 B 后面，全部超时。**表"看起来还活着"，实际上已经对新请求完全不可用。**

> Warning
> 
> 这个场景里，A 甚至不需要锁住任何一行数据，只要它的长事务还持有 MDL 读锁，DDL 就进不来。

**排查 MDL 等待：**

`-- MySQL 8.0：查看当前元数据锁   SELECT ml.OBJECT_TYPE, ml.OBJECT_SCHEMA, ml.OBJECT_NAME,          ml.LOCK_TYPE, ml.LOCK_DURATION, ml.LOCK_STATUS,          ml.OWNER_THREAD_ID, t.PROCESSLIST_ID, t.PROCESSLIST_INFO   FROM performance_schema.metadata_locks ml   JOIN performance_schema.threads t  ON t.THREAD_ID = ml.OWNER_THREAD_ID   WHERE ml.OBJECT_SCHEMA = 'your_db';`

`-- 找出长事务   SELECT trx_id, trx_state, trx_started,          TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS seconds,          trx_mysql_thread_id, trx_query   FROM information_schema.INNODB_TRX   ORDER BY trx_started;`

**预防手段：**

*   • 事务里不要混入远程调用、文件上传、用户交互，能短就短；
    
*   • DDL 放在业务低峰期，并给 DDL 会话设置 `lock_wait_timeout`，例如 `SET SESSION lock_wait_timeout = 10;`，避免无限排队；
    
*   • 大表变更用 `pt-online-schema-change` 或 `gh-ost`，它们通过"影子表 + 分批拷贝"把 DDL 拆开；
    
*   • 监控长事务，超过阈值就告警。
    

### 2.4 意向锁：一个你从没手动加、却天天在用的锁

意向锁是表级锁，作用是**给"表里有行被锁住"这件事做个标记**。

它分两种：

*   • `IS`（意向共享锁）：表中某些行即将或已经被加了 S 锁
    
*   • `IX`（意向排他锁）：表中某些行即将或已经被加了 X 锁
    

`UPDATE` 语句执行时，InnoDB 会先在表上加 `IX`，再到行上加 X 锁。

**为什么要多此一举？** 因为如果只加行锁、表上没有任何标记，那么当另一个事务想加表锁时，就得逐行扫描整张表，才能确认"有没有行被锁"。表越大，这个检查越慢。有了意向锁，只需要看表上有没有 `IS/IX` 即可。

意向锁有两个反直觉的特性：

特性

说明

意向锁之间互不冲突

`IS`

 和 `IX` 可以共存，`IX` 和 `IX` 也可以共存

意向锁与表级 S/X 锁的兼容性

`IS`

 与表级 S 锁兼容；`IX` 与表级 S 锁冲突；表级 X 锁与 `IS`、`IX` 都冲突

用户无法手动加

InnoDB 自动维护，没有对应的 SQL 语法

`-- 查看意向锁   SELECT ENGINE, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_STATUS   FROM performance_schema.data_locks   WHERE OBJECT_NAME = 't_order';`

`LOCK_TYPE = TABLE` 且 `LOCK_MODE` 为 `IS` 或 `IX` 的行，就是意向锁。

* * *

## 三、行级的三把锁：记录锁、间隙锁、临键锁

这三把锁才是 InnoDB 的看家本领，也是面试和线上事故的重灾区。

先准备一张实验表，后面的例子都基于它：

`CREATE TABLE t (     id INT PRIMARY KEY,     c  INT,     KEY idx_c (c)   ) ENGINE=InnoDB;      INSERT INTO t VALUES (5,5), (10,10), (15,15), (20,20), (25,25);`

主键索引树上是 5、10、15、20、25 五个点，二级索引 `idx_c` 上也是同样的五个点。

### 3.1 记录锁：锁住那一条真实的索引记录

记录锁（Record Lock）锁的是索引记录本身。

`-- 会话A   BEGIN;   SELECT * FROM t WHERE id = 10 FOR UPDATE;`

因为 `id` 是主键（唯一索引），等值查询命中了 10 这条记录，InnoDB 只需要锁住这一条。此时：

*   • 会话 B 更新 `id = 10`：阻塞
    
*   • 会话 B 更新 `id = 15`：不阻塞
    
*   • 会话 B 插入 `id = 8`：不阻塞（记录锁不含间隙，5 到 10 之间的空位没被锁住）
    

在 `performance_schema.data_locks` 里，这条锁的 `LOCK_MODE` 是 `X,REC_NOT_GAP`——`REC_NOT_GAP` 就是"不含间隙"的意思。

### 3.2 间隙锁：锁住"不存在的那段空位"

这是 MySQL 里最让人费解的一把锁。

`-- 会话A   BEGIN;   SELECT * FROM t WHERE id = 7 FOR UPDATE;`

`id = 7` 并不存在。查询在主键索引树上定位到 7 落在 5 和 10 之间，于是 InnoDB 给这个**间隙**加了锁，锁住的是开区间 `(5, 10)`。

**它锁的不是"第 7 行"（根本不存在），而是"5 和 10 之间不许插入新记录"这个规则。**

于是就会出现这些现象：

`-- 会话B   INSERT INTO t VALUES (7, 7);   -- 阻塞，落在 (5,10)   INSERT INTO t VALUES (6, 6);   -- 阻塞，同样落在 (5,10)   INSERT INTO t VALUES (9, 9);   -- 阻塞，还是落在 (5,10)   INSERT INTO t VALUES (12, 12); -- 不阻塞，落在 (10,15)`

间隙锁有几个必须记住的特性：

特性

说明

只阻止插入

间隙里本来就没有记录，谈不上更新和删除

间隙锁之间互不冲突

两个事务可以同时持有同一个间隙的间隙锁

只在 RR 及以上生效

RC 隔离级别下，除唯一性检查和外键检查外基本不加间隙锁

目的是防幻读

阻止其他事务在查询范围内插入新记录

> Warning
> 
> 第二条特性尤其危险。两个事务同时拿到同一个间隙的锁，谁也不会阻塞——但它们接下来都想往里插数据时，就会互相等待。这是死锁的高发源头，第五章会完整复现。

### 3.3 临键锁：记录锁 + 前面的间隙

临键锁（Next-Key Lock）是记录锁和间隙锁的组合，锁住的是**左开右闭**区间 `(prev, current]`。

比如对 `id = 10` 加临键锁，锁住的是 `(5, 10]`——既包含 10 这条记录本身，也包含它前面的间隙。

**在 REPEATABLE READ 下，临键锁是 InnoDB 默认的加锁单位。** 也就是说，你随手写的一条范围查询，背后加的可能是一串临键锁。

`-- 会话A   BEGIN;   SELECT * FROM t WHERE id >= 10 AND id < 20 FOR UPDATE;`

因为 `id` 是主键（唯一索引），首次定位到 `id = 10` 时，唯一索引等值命中的 next-key lock 会退化为记录锁（`X,REC_NOT_GAP`），所以 `(5,10)` 间隙并没有被锁。后续扫描到 15、20 才是 next-key lock。最终加锁结果大致是：

*   • `id = 10`：记录锁
    
*   • `(10,15]`、`(15,20]`：两个临键锁
    

即锁住 10、15、20 三条已有记录。插入 1119 会被阻塞，而插入 69 不受影响（`(5,10)` 间隙未被锁）。

> Warning
> 
> 范围查询的右端点如果是"不满足条件的第一条记录"，经典行为下这条记录本身也会被 next-key lock 锁住（不只是它前面的间隙）。不同小版本在边界处理上偶有差异，涉及关键业务时以实测为准。

### 3.4 加锁规则速查表

把上面的规律压缩成一张表，日常排查时对照着看：

查询条件

索引类型

记录是否存在

加锁结果

等值查询

唯一索引

存在

记录锁

等值查询

唯一索引

不存在

间隙锁

等值查询

普通索引

存在

临键锁（向右扫描到第一个不满足的值后，该值处退化为间隙锁）

范围查询

任意索引

—

临键锁（唯一索引首个等值定位会退化为记录锁）

无可用索引

—

—

RR 下扫描到的所有记录全部加锁（RC 下 semi-consistent read 会释放不匹配行）

这张表能解释绝大多数"为什么我只改了一行，别人却动不了"的问题。**加锁范围不由你改了几行决定，而由你"扫了几行"决定。**

* * *

## 四、一个实验：没走索引的 UPDATE 为什么锁全表

理论讲完，做个实验验证一下。以下实验在默认的 REPEATABLE READ 隔离级别下进行。

`CREATE TABLE account (     id      BIGINT PRIMARY KEY,     name    VARCHAR(32),     balance DECIMAL(10,2)   ) ENGINE=InnoDB;      INSERT INTO account VALUES   (1,'alice',100),(2,'bob',200),(3,'carol',300),(4,'dave',400),(5,'eve',500);`

注意：`name` 列上没有索引。

**会话 A：**

`BEGIN;   UPDATE account SET balance = balance - 100 WHERE name = 'bob';   -- 1 row affected`

**会话 B：**

`BEGIN;   UPDATE account SET balance = balance + 100 WHERE name = 'dave';   -- 卡住，等待锁释放`

B 改的是 `dave`，跟 A 改的 `bob` 完全不相关，为什么会被阻塞？

因为 `name` 没有索引，A 的 `UPDATE` 只能全表扫描。InnoDB 扫过 id 为 1 到 5 的五条记录，**每扫到一条就加一把锁**——包括最终不满足条件的那些行。

看锁视图：

`SELECT OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_DATA   FROM performance_schema.data_locks   WHERE OBJECT_NAME = 'account';`

输出大致是这样：

INDEX\_NAME

LOCK\_TYPE

LOCK\_MODE

LOCK\_DATA

NULL

TABLE

IX

NULL

PRIMARY

RECORD

X

1

PRIMARY

RECORD

X

2

PRIMARY

RECORD

X

3

PRIMARY

RECORD

X

4

PRIMARY

RECORD

X

5

PRIMARY

RECORD

X

supremum pseudo-record

第一行是意向锁，后面六行是五条记录加一个"上界伪记录"的临键锁。`LOCK_MODE` 是 `X`，表示 next-key lock；如果显示 `X,REC_NOT_GAP`，则代表只锁记录不含间隙。

> Note
> 
> **结论：RR 下 `WHERE` 走不上索引时，"行锁"会退化成扫描范围内的全面封锁。** 这正是很多"改一行锁全表"事故的根源。到了 RC，`UPDATE` 会使用 semi-consistent read：判断某行不匹配 `WHERE` 后会释放它的锁，实际锁定范围会缩小——但这仍然不值得赌，给 `WHERE` 加索引永远是第一选择。

### 4.1 加上索引之后

`ALTER TABLE account ADD KEY idx_name (name);      -- 会话A 重新执行   BEGIN;   UPDATE account SET balance = balance - 100 WHERE name = 'bob';`

此时 A 走 `idx_name`，锁住 `bob` 对应的索引记录、主键记录，以及 `(bob, carol)` 这段间隙（RR 下普通索引等值查询会向右多扫一个值），会话 B 更新 `dave` 立刻就能通过。但要注意，此时插入 `bob` 与 `carol` 之间的新名字会被 A 的间隙锁挡住。

但这里还有一个容易被忽略的点：**通过二级索引更新时，InnoDB 要同时对二级索引和主键索引加锁。** 因为最终要改的数据在主键索引上，不加主键锁就没法保证一致性。

### 4.2 RR 与 RC 的差别

把隔离级别降到 RC，同样的间隙实验会出现明显差异：

`SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;      BEGIN;   SELECT * FROM t WHERE id = 7 FOR UPDATE;   -- RC 下不会加间隙锁`

此时另一个会话 `INSERT INTO t VALUES (7,7)` 可以直接成功。

**RC 去掉了间隙锁，代价是放弃了"可重复读"，会出现幻读。** 很多互联网公司把默认隔离级别改成 RC，正是为了减少锁冲突和死锁——这是一笔明确的取舍，不是"RC 更先进"。

隔离级别

间隙锁

幻读

并发度

适用场景

REPEATABLE READ

有

基本避免

较低

强一致读、金融对账

READ COMMITTED

基本没有

会出现

较高

高并发 OLTP

* * *

## 五、死锁：不是"锁错了"，而是"加锁顺序错了"

铺垫了这么久，终于可以复现最经典的间隙锁死锁了。

### 5.1 两个事务抢着往同一个缝里插

**会话 A：**

`BEGIN;   SELECT * FROM t WHERE id = 7 FOR UPDATE;  -- 拿到间隙锁 (5,10)`

**会话 B：**

`BEGIN;   SELECT * FROM t WHERE id = 7 FOR UPDATE;  -- 同样拿到间隙锁 (5,10)，不阻塞`

两个事务都拿到了 `(5,10)` 的间隙锁，因为**间隙锁之间天然兼容**。

**会话 A：**

`INSERT INTO t VALUES (7, 7);   -- 阻塞：插入需要"插入意向锁"，而 B 持有该间隙的间隙锁`

**会话 B：**

`INSERT INTO t VALUES (7, 7);   -- 死锁：A 等 B 释放间隙锁，B 等 A 释放间隙锁`

InnoDB 的死锁检测立刻发现环路，回滚其中一个事务，另一个继续执行。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这里的关键是**插入意向锁**：它虽然名字里带"意向"，却不是表级那两种，而是一种特殊的间隙锁，表示"我准备在这个间隙里插入"。插入意向锁之间互不冲突，但它与间隙锁冲突。

于是形成了"双方都持有间隙锁 → 双方都需要插入意向锁 → 互相等待"的闭环。

### 5.2 死锁了，MySQL 会做什么

InnoDB 有两个相关参数：

参数

默认值

作用

`innodb_deadlock_detect`

`ON`

主动检测死锁，发现环路立即回滚代价小的事务

`innodb_lock_wait_timeout`

`50`

等锁超时时间（秒），超时后报错回滚

死锁检测是有成本的：每个事务等锁时都要检查是否形成环路，并发越高、锁越多，检测开销越大。有些高并发系统会选择关掉检测，靠超时兜底——**这是一个需要谨慎评估的取舍，关掉之后锁等待会变长，用户体验会变差。**

### 5.3 怎么定位死锁

`-- 最近一次死锁的完整现场   SHOW ENGINE INNODB STATUS\G`

重点看 `LATEST DETECTED DEADLOCK` 这一段，里面有：

*   • 两个事务各自的 SQL
    
*   • 各自持有的锁和等待的锁
    
*   • 最终被回滚的是哪个事务
    

8.0 还可以直接查锁等待关系：

`SELECT * FROM performance_schema.data_lock_waits;   SELECT * FROM sys.innodb_lock_waits;`

### 5.4 降低死锁的几个手段

1.  1. **给 `WHERE` 条件加索引**，减少扫描范围和加锁数量；
    
2.  2. **固定加锁顺序**，比如转账永远按账户 ID 从小到大加锁；
    
3.  3. **缩短事务**，别把远程调用塞进事务里；
    
4.  4. **能降级就降级到 RC**，去掉大部分间隙锁；
    
5.  5. **业务层重试**，死锁回滚是正常现象，捕获后重试往往能成功。
    

第 5 条值得展开。死锁不是"代码写错了"那么简单，它是并发系统里无法彻底消灭的现象，业务层要准备好重试：

`@Service   public class TransferService {    private final AccountMapper accountMapper;    public TransferService(AccountMapper accountMapper) {        this.accountMapper = accountMapper;       }    /**        * 转账：固定按 id 升序加锁，避免两个方向同时转账时互相等待        */    @Transactional    @Retryable(           retryFor = DeadlockLoserDataAccessException.class,           maxAttempts = 3,           backoff = @Backoff(delay = 50, multiplier = 2)       )    public void transfer(long fromId, long toId, BigDecimal amount) {        long first  = Math.min(fromId, toId);        long second = Math.max(fromId, toId);        // 按 id 升序先锁住两个账户           accountMapper.lockForUpdate(first);           accountMapper.lockForUpdate(second);        // 再按原始转账方向扣款、入账           accountMapper.deduct(fromId, amount);           accountMapper.credit(toId, amount);       }   }`

`@Retryable` 来自 Spring Retry，`DeadlockLoserDataAccessException` 是 Spring 对 MySQL 死锁错误的翻译。这段代码要生效，还需要在配置类上加 `@EnableRetry`。重试次数别太多，配合指数退避，避免把数据库打得更惨。

* * *

## 六、线上查锁：四条命令够用了

真遇到"接口卡死、CPU 不高、数据库连接堆满"，按这个顺序查：

**第一步，看有没有长事务：**

`SELECT trx_id, trx_state,          TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS seconds,          trx_mysql_thread_id, trx_query   FROM information_schema.INNODB_TRX   ORDER BY trx_started   LIMIT 20;`

**第二步，看谁在等谁：**

`SELECT * FROM sys.innodb_lock_waits\G`

这个视图已经把"等待方、阻塞方、阻塞 SQL、等待时长"整理好了，比手工拼表快得多。

**第三步，看锁的具体位置：**

`SELECT ENGINE, OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME,          LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA   FROM performance_schema.data_locks   WHERE OBJECT_SCHEMA = 'your_db';`

**第四步，看 MDL 有没有排队：**

`SELECT ml.OBJECT_NAME, ml.LOCK_TYPE, ml.LOCK_STATUS,          ml.OWNER_THREAD_ID, t.PROCESSLIST_ID, t.PROCESSLIST_INFO   FROM performance_schema.metadata_locks ml   JOIN performance_schema.threads t  ON t.THREAD_ID = ml.OWNER_THREAD_ID   WHERE ml.OBJECT_SCHEMA = 'your_db';`

如果是 MDL 排队，`LOCK_STATUS` 会出现大量 `PENDING`，而且往往能看到一个 `EXCLUSIVE` 的 DDL 卡在最前面。

> Warning
> 
> `performance_schema` 需要在实例上开启（MySQL 5.7 之后默认开启部分采集，`data_locks` 相关表在 8.0 才有）。生产环境查这些表本身开销不大，但不要在高峰期做全表聚合。

* * *

## 七、把规则缩成一张检查清单

写业务代码时，可以拿这几条对照一遍：

场景

该做什么

写 `UPDATE` / `DELETE`

确认 `WHERE` 能走索引，`EXPLAIN` 看 `key` 不为空

事务里调用远程接口

挪出去，事务只包数据库操作

批量更新

分批执行，每批控制在几百行，避免一次锁太多

两个资源都要改

固定加锁顺序，全系统统一

表结构变更

低峰期 + 超时保护 + 在线变更工具

高并发写入

评估是否降到 RC，换更低的锁冲突

热点行更新

考虑拆分、队列串行化，或者用 Redis 预扣减

> Tip
> 
> **锁这个问题，90% 的答案都指向同一件事：让 SQL 走上索引。** 剩下的 10%，才是隔离级别、事务边界和加锁顺序的取舍。

* * *

## 写在最后

六种锁，六种粒度，本质上都遵循一个原则：**在保证数据正确的前提下，把并发影响压到最小。**

值得一提的是，锁并不是 MySQL 并发控制的全部。它解决的是"写与写之间别踩踏"，而"读的时候不加锁，也能保证一致性"，它靠的是另一套机制——MVCC。

两条线并行工作、各管一段，合起来就能拼凑出完整的并发控制图景。