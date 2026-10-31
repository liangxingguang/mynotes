---
id: wiki-concept-spring-aop
type: concept
title: Spring AOP：动态代理、通知执行序与 JDK/CGLIB 选型
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - java
  - spring
  - aop
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/concepts/spring-ioc-di.md
  - wiki/concepts/spring-circular-dependency.md
  - wiki/concepts/spring-transaction.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring AOP：动态代理、通知执行序与 JDK/CGLIB 选型

## Definition（定义）

Spring AOP 基于动态代理 + 拦截器链，把横切关注点（日志、事务、权限、监控）与业务逻辑解耦；仅支持方法级连接点，运行时织入。

## Why It Matters（为什么重要）

AOP 是 Spring 事务、缓存、异步等声明式能力的载体；"代理没生效"类事故（自调用切面失效、事务失效、循环依赖一致性）都源于对代理机制的误解。

## Core Characteristics（核心特征）

1. 核心术语：连接点（Spring 仅支持方法级）、切点（`execution(* com.example.service.*.*(..))`）、5 种通知、切面 = 切点 + 通知、织入（Spring 为运行时织入，AspectJ 为编译期织入）。
2. 通知执行序：Around前 → Before → 目标方法 → AfterReturning/AfterThrowing → After → Around后。
3. 只拦 public 方法；**自调用（this 调用）不走代理 → 切面失效**（事务失效主因之一）；解法：注入自身代理 / `AopContext.currentProxy()`（需 `@EnableAspectJAutoProxy(exposeProxy=true)`）。
4. JDK vs CGLIB：JDK 基于接口 + 反射（`Proxy.newProxyInstance` + `InvocationHandler`）；CGLIB 基于 ASM 字节码继承（`Enhancer` + `MethodInterceptor` + `invokeSuper`）。JDK 代理对象是接口类型（`instanceof` 实现类为 false，依赖注入时产生迷惑）；CGLIB 不能代理 final 类与方法、需无参构造；JDK 8+ 调用性能基本持平。
5. Spring 代理策略：目标有接口 → JDK；无接口 → CGLIB；`proxyTargetClass=true` 强制 CGLIB；Boot 2.x 起默认强制 CGLIB。
6. AOP 代理生成时机：`BeanPostProcessor.postProcessAfterInitialization`（refresh() 第 11 步 finishBeanFactoryInitialization 内）——生命周期关键时序点。
7. 避坑：`@Configuration` 类内 `this.xxx()` 调用使 `@Bean` 方法代理失效（用 `proxyBeanMethods=false` 或抽配置类）；JDK 9+ 模块化后需开放反射权限，否则 `InaccessibleObjectException`。

## Structure（结构）

代理调用链：调用方 → 代理对象（JDK `$Proxy` / CGLIB 子类）→ 拦截器链（通知包装）→ 目标方法。

## How It Works（运作方式）

- `AnnotationAwareAspectJAutoProxyCreator`（BPP）在 `postProcessAfterInitialization` 判断是否需要代理，需要则生成 JDK/CGLIB 代理并绑定通知链。
- 事务、异步等声明式能力即在代理上叠加 `TransactionInterceptor` / `AsyncAnnotationBeanPostProcessor` 等拦截器。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-transaction]]（声明式事务 = AOP 代理 + ThreadLocal；自调用失效即事务失效场景之一）
- [[spring-circular-dependency]]（三级缓存为保证循环依赖场景下 AOP 代理一致性而存在）
- [[spring-ioc-di]]（DI 在代理生成前完成属性填充）

### Dependencies（依赖项）

- JDK 动态代理：java.lang.reflect.Proxy + InvocationHandler
- CGLIB：ASM 字节码框架（第三方依赖）

### Distinctions（区分）

- Spring AOP 运行时织入 vs AspectJ 编译期织入：前者不用改源码、能力限于方法级；后者编译期生成增强、能力更强。
- JDK 代理"快而轻" vs CGLIB"能代理无接口类"：能用 JDK 就用 JDK（少第三方依赖），Boot 2.x 起默认 CGLIB 是为了简化配置。

## Evolution（演进）

- JDK 1.6 前：CGLIB 调用速度约为 JDK 代理 10 倍；JDK 1.7 反射优化后差距缩至 2-3 倍；JDK 1.8+ 基本持平甚至反超（MethodHandle 等机制）。
- Spring Boot 2.x 起：AOP 默认强制 CGLIB，简化配置。

## Open Questions（开放问题）

- 无（标准机制，无争议点）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`

## Related Knowledge（相关知识）

- [[spring-20-extension-points]]（初始化期扩展点时间轴：AOP 代理诞生于 postProcessAfterInitialization）
- [[spring-transaction]]
- [[spring-circular-dependency]]
