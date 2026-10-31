---
id: wiki-source-spring-interview-11-high-freq-topics
type: source
title: Spring 面试 11 大高频考点全解：从 IOC/AOP 到事务失效与事件机制
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - source
  - java
  - spring
  - interview
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/sources/spring-20-extension-points.md
  - wiki/concepts/spring-ioc-di.md
  - wiki/concepts/spring-aop.md
  - wiki/concepts/spring-circular-dependency.md
  - wiki/concepts/spring-transaction.md
  - wiki/concepts/spring-event-mechanism.md
---
# Spring 面试 11 大高频考点全解：从 IOC/AOP 到事务失效与事件机制

## Overview（概览）

微信公众号面试八股总纲文：11+ 大考点串讲 Spring 核心机制——BeanFactory vs ApplicationContext、IOC/DI、AOP、Spring MVC、refresh() 十二步、Bean 生命周期、三级缓存、JDK vs CGLIB、事务传播与隔离级别、事务失效 10 场景、@Autowired vs @Resource、事件机制。每个考点配对比表与面试话术。主线两条：Spring 高级能力（AOP、事务）全落在 BeanPostProcessor 扩展点；三级缓存存在的根本理由是让 AOP 代理在循环依赖时保持一致。

## Key Facts（关键事实）

- 容器差异：`BeanFactory` 懒加载、需手动注册 BeanPostProcessor（`@Autowired` 可能不生效）；`ApplicationContext` 是超集、预加载单例、自动注册，生产唯一选择；差异仅针对单例。
- DI 本质：反射实现的对象工厂；依赖注入真正发生在 `populateBean()`，依赖缺失时递归 `getBean()` 联动创建；`@Autowired` 由 `AutowiredAnnotationBeanPostProcessor` 处理。
- refresh() 十二步关键时序：BFPP 阶段处理 `@Configuration` 等注解配置 → `onRefresh` 启动嵌入式 Tomcat → `finishBeanFactoryInitialization` 实例化单例并生成 AOP 代理 → `finishRefresh` 发布 `ContextRefreshedEvent`（Boot 的 `ApplicationReadyEvent` 在其后）；refresh 抛异常则销毁已创建 Bean + 取消刷新，容器不可用。
- Bean 生命周期四阶段（实例化→属性赋值→初始化→销毁）+ 扩展点：初始化三步顺序固定 `@PostConstruct`→`InitializingBean`→init-method；销毁三步一一对应；AOP 代理诞生于 `postProcessAfterInitialization`；原型 Bean 不销毁需自行释放。
- 三级缓存：一级 `singletonObjects`（成品）/ 二级 `earlySingletonObjects`（早期引用）/ 三级 `singletonFactories`（ObjectFactory）；默认仅支持单例 Bean 的 setter 注入循环依赖；构造器注入与多例不支持。
- JDK vs CGLIB：前者基于接口、代理对象是接口类型；后者基于 ASM 继承、不能代理 final、需无参构造；JDK 8+ 性能持平；Boot 2.x 起默认强制 CGLIB。
- 事务传播与隔离：传播管范围（REQUIRED 默认 / REQUIRES_NEW 独立 / NESTED 子事务依赖 savepoint 仅 JDBC），隔离管干净度（MySQL 默认 RR、Oracle 默认 RC，Spring 设置须与数据库对齐）；生产建议 RC + REQUIRED。
- 事务失效前 4 种占线上问题 90%：同类 this 调用、吞异常、未配 rollbackFor、非 public；失效根因分三类——没进代理 / 进了代理但异常未触发回滚 / 资源环境问题。
- @Autowired（Spring 专属、先 byType、支持 @Primary 与构造器注入）vs @Resource（JSR-250、先 byName、不支持 @Primary 与构造器注入）。
- 事件机制：观察者模式，默认同步；慢监听器阻塞发布；某监听器抛异常后续不执行（可配 ErrorHandler）；事务回滚但事件已处理 → `@TransactionalEventListener(AFTER_COMMIT)`。

## Important Claims（重要论断）

### Claim 1：Spring 高级能力统一落在 BeanPostProcessor 扩展点

AOP 代理、`@Autowired` 注入、事务切面全部经由 BeanPostProcessor 在 Bean 初始化前后织入；掌握扩展点时序即可推导所有"代理不生效"类事故（含事务失效、三级缓存设计）。

### Claim 2：三级缓存的根本理由是 AOP 代理一致性，而非"解决循环依赖"本身

无 AOP 时两级缓存（一级+三级）即可解循环依赖；三级存 ObjectFactory 是为了按需延迟生成代理——若直接存原始对象，被依赖方持有原始引用，后续代理生成后出现"事务失效、AOP 不生效"。

### Claim 3：声明式事务失效根因可归纳为"代理没生效"与"切面没感知到回滚"两类

前者：非 public、final/static、同类 this 调用、类未托管；后者：吞异常、受检异常未声明 rollbackFor、传播属性错误；第三类为资源环境（MyISAM、多线程线程绑定、嵌套外层不回滚）。

## Concepts Introduced（引入的概念）

- [[spring-ioc-di]]
- [[spring-aop]]
- [[spring-circular-dependency]]
- [[spring-transaction]]
- [[spring-event-mechanism]]

## Entities Mentioned（提及的实体）

- Spring / Spring Boot（框架；Boot 2.x 起 AOP 默认 CGLIB、嵌入式 Tomcat 于 refresh() 第 9 步启动）
- MySQL InnoDB / MyISAM（事务支持与否的分界）
- Oracle（默认隔离级别 RC）
- JDK 动态代理 / CGLIB（ASM 字节码）

## Implications（影响／启示）

- 面试准备方法论：把考点挂到容器启动的单向时间轴上记忆，与 [[spring-20-extension-points]] 的扩展点时间轴互为印证。
- 生产习惯：写事务方法先确认 public 与 rollbackFor，写完后用单测验证回滚；复杂场景优先编程式事务（TransactionTemplate）。
- "隔离级别要与数据库对齐"——Spring 的设置只是请求，最终行为以数据库为准（MySQL InnoDB RR 下间隙锁已规避大量幻读）。

## Limitations（局限）

- 单信源面试导向文，事实为标准 Spring 机制但无官方出处交叉验证，confidence=medium。
- 采集缺陷：配图全部未加载（残留 1px SVG 占位符）、部分代码块被压成单行、表格字段错位；概念性结论完整可读，逐行代码需看原文。
- 个别细节随 Spring 版本微调（如 Boot 2.x 默认 CGLIB），以所用版本源码为准。

## Related Knowledge（相关知识）

- [[spring-20-extension-points|Spring 留了 20 个扩展点，你能按顺序说出几个？]]（扩展点时间轴，与本页 refresh()/生命周期互证）
- [[spring-ioc-di]]
- [[spring-aop]]
- [[spring-circular-dependency]]
- [[spring-transaction]]
- [[spring-event-mechanism]]

## Source（信源）

- `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`
- 原文：https://mp.weixin.qq.com/s/SpHaBjO13VfcQap34ajgDg
