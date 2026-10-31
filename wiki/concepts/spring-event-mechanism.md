---
id: wiki-concept-spring-event-mechanism
type: concept
title: Spring 事件机制：观察者模式、同步默认与事务事件
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - java
  - spring
  - event
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/concepts/spring-transaction.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring 事件机制：观察者模式、同步默认与事务事件

## Definition（定义）

Spring 事件机制是基于观察者设计模式的容器级组件解耦通信方案：发布者不直接调用订阅者，而是通过事件广播器（ApplicationEventMulticaster）分发事件，实现发布者与订阅者的完全解耦。

## Why It Matters（为什么重要）

事件机制是模块解耦与异步化的常用手段，但"默认同步"这一事实常被误用——慢监听器阻塞发布、监听器异常中断链、事务回滚后事件已处理，都是典型线上事故点。

## Core Characteristics（核心特征）

1. 三要素 + 广播器：`ApplicationEvent`（事件）/ `ApplicationEventPublisher`（发布者）/ `ApplicationListener`（监听器）/ `ApplicationEventMulticaster`（广播器，默认 `SimpleApplicationEventMulticaster`）。
2. **默认同步**：`publishEvent()` 阻塞至所有监听器处理完；慢监听器阻塞整个发布流程。
3. 监听器三种方式：实现 `ApplicationListener` 接口（类型安全、每事件一个类）/ `@EventListener` 注解（**推荐**：一个类处理多事件、支持 SpEL 条件过滤 `@EventListener(condition="#event.orderAmount > 1000")`）/ `SmartApplicationListener`（复杂类型判断 + Ordered）。
4. 异步化两途径：`@Async`（@EnableAsync + TaskExecutor，单方法可控）/ 自定义广播器 `setTaskExecutor`（所有事件默认异步，无法单事件控制）。
5. 三大坑：慢监听器阻塞（耗时操作 @Async 化）；监听器抛异常导致后续监听器不执行（内部捕获或 `multicaster.setErrorHandler`）；事务内发布事件、事务回滚但事件已处理 → `@TransactionalEventListener(AFTER_COMMIT)`（暂存至 TransactionSynchronization 回调执行）。
6. 执行流程：`publishEvent` → 广播器 → 按注册顺序同步调用（配线程池则异步）→ 事务监听器暂存、等事务提交/回滚回调。

## Structure（结构）

角色链：业务代码 → ApplicationEventPublisher.publishEvent() → ApplicationEventMulticaster（ListenerRetriever 筛选匹配监听器）→ 监听器 onApplicationEvent()。

## How It Works（运作方式）

- 广播器遍历注册的监听器，筛选匹配事件类型的监听器逐个调用；
- `@TransactionalEventListener` 不直接执行：先暂存，等事务同步回调（AFTER_COMMIT / AFTER_ROLLBACK 等阶段）时才真正执行。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-transaction]]（事务事件：@TransactionalEventListener 与事务生命周期的衔接）
- [[spring-20-extension-points]]（事件广播器于 refresh() 第 8 步初始化、监听器于第 10 步注册）

### Dependencies（依赖项）

- ApplicationEventMulticaster（默认 SimpleApplicationEventMulticaster）
- TransactionSynchronization（事务事件回调机制）

### Distinctions（区分）

- 事件机制 vs 直接方法调用：前者解耦但默认同步、无返回值，后者强依赖可即时拿结果；需要立刻返回值的强依赖逻辑不要用事件。
- 接口监听器 vs 注解监听器：前者编译期类型安全，后者一个类多事件 + SpEL 过滤更灵活。

## Evolution（演进）

- 无信源支撑的演进时间线（原文未给出）。

## Open Questions（开放问题）

- 无（标准机制，无争议点）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`

## Related Knowledge（相关知识）

- [[spring-transaction]]
- [[spring-20-extension-points]]
