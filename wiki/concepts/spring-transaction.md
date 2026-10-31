---
id: wiki-concept-spring-transaction
type: concept
title: Spring 事务：传播行为、隔离级别与失效场景
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - java
  - spring
  - transaction
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/concepts/spring-aop.md
  - wiki/concepts/spring-event-mechanism.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring 事务：传播行为、隔离级别与失效场景

## Definition（定义）

Spring 声明式事务 = AOP 动态代理 + ThreadLocal 绑定连接 + 异常回滚规则；传播行为管事务"范围"（多方法调用间如何传递），隔离级别管数据"干净程度"（并发事务下的一致性）。

## Why It Matters（为什么重要）

事务失效是线上事故高发区（前 4 种场景占 90%），根因几乎都可归入"代理没生效"或"切面没感知到需要回滚"；传播与隔离的误用则直接造成数据不一致与死锁。

## Core Characteristics（核心特征）

1. 并发事务三问题：脏读（读未提交数据）、不可重复读（同行两次读结果不同）、幻读（同条件两次查询行数不同）。
2. 5 种隔离级别：`ISOLATION_DEFAULT`（随库默认：MySQL=RR、Oracle=RC）/ READ_UNCOMMITTED / READ_COMMITTED（解决脏读）/ REPEATABLE_READ（解决脏读+不可重复读；MySQL InnoDB 默认，间隙锁已规避大量幻读）/ SERIALIZABLE（全部问题，并发最差）。**Spring 设置须与数据库对齐——设了不一定就是最终行为。**
3. 7 种传播行为：REQUIRED（默认，有则加入无则新建）/ REQUIRES_NEW（独立新事务）/ NESTED（嵌套子事务：父回滚子必回滚、子回滚不影响父；依赖 savepoint，仅 JDBC 支持）/ SUPPORTS / NOT_SUPPORTED / MANDATORY / NEVER。
4. 失效 10 场景分三类：① 根本没进代理（非 public、final/static、同类 this 调用、类未托管）② 进了代理但异常未触发回滚（吞异常、受检异常未 rollbackFor、传播属性错误）③ 资源环境（MyISAM 引擎、多线程线程绑定、嵌套事务外层不回滚）；前 4 种占线上问题 90%。
5. 高频陷阱：REQUIRES_NEW 主事务回滚不会自动回滚已提交的子事务，需自行补偿；MySQL RR 下间隙锁高并发写可能死锁，要缩小锁定范围；NESTED 在 JPA/Hibernate 下若底层不支持 savepoint 会降级。
6. 生产建议：隔离级别用 RC、传播行为用 REQUIRED；复杂场景优先编程式事务（TransactionTemplate）；转账状态校验用 `SELECT ... FOR UPDATE` 精准锁定而非 SERIALIZABLE。

## Structure（结构）

声明式事务链路：`@Transactional` 方法经 AOP 代理拦截 → TransactionInterceptor 开启事务（连接绑定 ThreadLocal）→ 方法执行 → 异常按 rollbackFor 规则判定回滚 → 资源清理。

## How It Works（运作方式）

- 事务与线程绑定：同一线程共享事务上下文；多线程调用各自独立（失效场景之一）。
- 回滚规则：默认仅 RuntimeException 与 Error 触发回滚；checked 异常需显式 `rollbackFor`。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-aop]]（声明式事务的载体；自调用失效即事务失效）
- [[spring-event-mechanism]]（事务内发布事件回滚但已处理 → @TransactionalEventListener(AFTER_COMMIT)）

### Dependencies（依赖项）

- AOP 动态代理（JDK/CGLIB）
- 数据库引擎事务支持（InnoDB；MyISAM 不支持）

### Distinctions（区分）

- 声明式（@Transactional）vs 编程式（TransactionTemplate）：后者更灵活、更好排查，复杂场景优先。
- REQUIRES_NEW（完全独立）vs NESTED（子事务挂父事务，savepoint 机制）。

## Evolution（演进）

- 无信源支撑的演进时间线（原文未给出）。

## Open Questions（开放问题）

- 无（标准机制，无争议点）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`

## Related Knowledge（相关知识）

- [[spring-aop]]
- [[spring-event-mechanism]]
- [[spring-20-extension-points]]
