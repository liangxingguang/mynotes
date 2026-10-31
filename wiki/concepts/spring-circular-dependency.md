---
id: wiki-concept-spring-circular-dependency
type: concept
title: Spring 三级缓存解循环依赖：为什么必须是三级
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - java
  - spring
  - circular-dependency
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/concepts/spring-ioc-di.md
  - wiki/concepts/spring-aop.md
  - wiki/concepts/spring-transaction.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring 三级缓存解循环依赖：为什么必须是三级

## Definition（定义）

循环依赖指两个或多个 Bean 相互持有对方引用形成依赖闭环；Spring 通过三级缓存解决**单例 Bean 的 setter 注入**循环依赖。

## Why It Matters（为什么重要）

这是 Spring 最经典的设计之一，也是面试必追问点；三级缓存的存在理由常被误记为"解决循环依赖"，真正承重的是 AOP 代理一致性——误解会导致对事务失效等事故的错误归因。

## Core Characteristics（核心特征）

1. 三级缓存（`DefaultSingletonBeanRegistry`）：一级 `singletonObjects`（完全初始化的成品 Bean）、二级 `earlySingletonObjects`（已实例化未初始化的早期引用）、三级 `singletonFactories`（ObjectFactory 工厂，按需延迟生成早期引用）。
2. A↔B 解决流程：实例化 A → A 的工厂入三级 → 注入 b 时创建 B → B 的工厂入三级 → B 注入 a 时从三级取 A 工厂、调用 `getObject()` 得到早期引用（有 AOP 则返回代理）入二级、删除三级中 A 工厂 → B 注入完成、入一级 → 回到 A 注入成品 B、A 入一级。
3. **为什么必须三级**：无 AOP 时两级（一级+三级）即可解循环依赖；三级存工厂是为了延迟代理生成——若直接存原始对象，B 拿到的是原始 A，后续 A 被代理后 B 仍持有原始引用 → 事务失效、AOP 不生效。
4. 不支持的场景：构造器注入（注入发生在实例化阶段，Bean 尚未入三级缓存、无法提前暴露引用）；多例 Bean（不提前缓存，每次获取都新建）。
5. "半成品"指已 `new` 出来但 `@Autowired` 尚未填充的 Bean。

## Structure（结构）

`DefaultSingletonBeanRegistry` 维护三个 Map，配合 `ObjectFactory.getObject()` 的延迟求值：

- 一级：成品池（最终对外提供）
- 二级：先头部队（早期引用，供依赖方临时使用）
- 三级：兵工厂（按需生产早期引用，特别是需要代理时）

## How It Works（运作方式）

- 实例化 Bean 后立即把 ObjectFactory 放入三级缓存（提前暴露）；
- 依赖方需要该 Bean 时，优先查一级 → 二级 → 三级工厂；
- 命中三级时调用工厂生成早期引用（必要时生成代理），移入二级、从三级移除；
- Bean 初始化完成后从二级移入一级，成为成品。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-aop]]（三级缓存存在的根本理由：保证循环依赖场景下 AOP 代理一致性）
- [[spring-transaction]]（B 持有原始对象的典型后果：事务失效）
- [[spring-ioc-di]]（DI 发生在属性填充阶段，正是循环依赖暴露的位置）

### Dependencies（依赖项）

- `DefaultSingletonBeanRegistry` 三个 Map
- 单例 + setter 注入前提（构造器/多例不支持）

### Distinctions（区分）

- 与"两级缓存"的区分：两级在无 AOP 场景功能等价；三级在需要代理时保证被依赖方拿到的是代理对象。

## Evolution（演进）

- Spring 经典设计；原文未给出引入版本时间线。

## Open Questions（开放问题）

- 无（标准机制，无争议点）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`

## Related Knowledge（相关知识）

- [[spring-aop]]
- [[spring-transaction]]
- [[spring-20-extension-points]]（实例化期扩展点时间轴）
