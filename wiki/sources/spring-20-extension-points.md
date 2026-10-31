---
id: wiki-source-spring-20-extension-points
type: source
title: Spring 留了 20 个扩展点，你能按顺序说出几个？
status: active
created: 2026-10-23
updated: 2026-11-01
confidence: high
tags:
  - source
  - java
  - spring
sources:
  - raw/sources/architecture/2026-10-20-spring-20-extension-points.md
related:
  - wiki/sources/spring-interview-11-high-freq-topics.md
  - wiki/concepts/spring-ioc-di.md
  - wiki/concepts/spring-aop.md
  - wiki/concepts/spring-circular-dependency.md
  - wiki/concepts/spring-transaction.md
  - wiki/concepts/spring-event-mechanism.md
---
# Spring 留了 20 个扩展点，你能按顺序说出几个？

## Overview（概览）

微信公众号长文：扩展点考的不是"有哪些"而是"什么时候被调"——把 20 个扩展点全部挂到容器启动的单向时间轴上，分定义期/实例化期/初始化期/就绪期/销毁期五段理清，并解释 BeanPostProcessor 注入普通 Bean 必 NPE 这类时序事故。

## Key Facts（关键事实）

- 扩展点本质：Spring 启动是一条单向时间线，扩展点是时间线上预留的插桩点——插错位置，逻辑再对也不生效。经典事故：BeanPostProcessor 必须先于所有普通 Bean 创建，它却 @Autowired 一个普通 Bean，时序上不可能，启动 NPE。
- 五段类比：定义期=改图纸（BeanDefinition）、实例化期=造零件、初始化期=组装、就绪期=通电、销毁期=断电。
- 定义期（①–⑧）：ApplicationContextInitializer（refresh() 之前，只能操作 Environment——改"输入"，与 BFPP 改"配方"相对）；ApplicationListener 早期事件（Starting/EnvironmentPrepared/ContextInitialized/Prepared/Started/Ready，最常用 ApplicationReadyEvent）；BeanDefinitionRegistryPostProcessor（唯一能新增 BeanDefinition 的扩展点，MyBatis MapperScannerConfigurer 靠它把 Mapper 接口注册成 FactoryBean）；BeanFactoryPostProcessor（改已有图纸，占位符解析）；ImportSelector / DeferredImportSelector（延迟到最后挑，自动配置让位）/ ImportBeanDefinitionRegistrar；FactoryBean。
- 实例化期（⑨–⑭，对每个 Bean 重复）：postProcessBeforeInstantiation（可截胡短路）→ determineCandidateConstructors → postProcessMergedBeanDefinition（收集 @Autowired 注入点）→ postProcessAfterInstantiation（可跳过属性填充）→ postProcessProperties（@Autowired 在此生效）→ Aware 接口家族。
- 初始化期（⑮–⑱）：postProcessBeforeInitialization（**@PostConstruct 在这一步触发**）→ InitializingBean#afterPropertiesSet → 自定义 init-method → postProcessAfterInitialization（**AOP 代理在这里生成**）。面试题"@PostConstruct 和 afterPropertiesSet 谁先谁后"答案：@PostConstruct 先。
- 就绪期（⑲–⑳）：SmartInitializingSingleton（所有单例创建完毕）→ ContextRefreshedEvent / ApplicationReadyEvent。
- 销毁期：DisposableBean / @PreDestroy / destroy-method。
- 定义期是框架级扩展能力最强的地方：Spring Boot 自动配置、MyBatis Mapper 扫描、@EnableXxx 系列全部建立在这一段。

## Important Claims（重要论断）

### Claim 1：与其背名字，不如记时间轴

扩展点知识点考的不是"有哪些"而是"什么时候被调"；把 20 个扩展点挂上时间轴，时序类事故（NPE、代理不生效）都能从图上推出原因。

## Concepts Introduced（引入的概念）

- Spring 启动五段时间轴（定义/实例化/初始化/就绪/销毁）与 20 扩展点挂点图（单信源整理，未立概念页）

## Entities Mentioned（提及的实体）

- Spring / MyBatis（框架，未立页）

## Implications（影响／启示）

"挂时间轴记扩展点"的学习法可迁移到任何生命周期驱动框架（Netty pipeline、Pi 任务链）（解读）。

## Limitations（局限）

- 面试导向整理文；个别执行顺序随 Spring 版本有微调，以所用版本源码为准。

## Related Knowledge（相关知识）

- [[spring-interview-11-high-freq-topics|Spring 面试 11 大高频考点全解]]（refresh() 十二步与 Bean 生命周期逐步骤详解，扩展点时间轴的同构印证）
- [[spring-ioc-di]]（DI 发生在实例化期属性填充段）
- [[spring-aop]]（AOP 代理诞生于 postProcessAfterInitialization）
- [[spring-circular-dependency]]（三级缓存为 AOP 代理一致性而存在）
- [[spring-transaction]]（事务失效：代理没生效类事故）
- [[spring-event-mechanism]]（事件广播器于 refresh() 第 8 步初始化）

## Source（信源）

- `raw/sources/architecture/2026-10-20-spring-20-extension-points.md`
