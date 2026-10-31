---
id: wiki-concept-spring-ioc-di
type: concept
title: Spring IOC 与 DI：思想、容器与注入机制
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: medium
tags:
  - concept
  - java
  - spring
  - ioc
sources:
  - raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md
related:
  - wiki/concepts/spring-aop.md
  - wiki/concepts/spring-circular-dependency.md
  - wiki/sources/spring-20-extension-points.md
---
# Spring IOC 与 DI：思想、容器与注入机制

## Definition（定义）

IOC（控制反转）是设计思想——把对象创建、依赖管理、生命周期的控制权从业务代码交给容器；DI（依赖注入）是其实现手段（原文比喻："减肥是思想，跑步是实现"）。Spring 容器以 BeanDefinition 为图纸、以 BeanPostProcessor 为扩展点，实现反射式的对象工厂。

## Why It Matters（为什么重要）

IOC/DI 是 Spring 一切高级能力（AOP、事务、事件）的地基；生产事故（Bean 未托管导致注入失败、BeanFactory 手动注册缺失导致 @Autowired 不生效）都根植于此。

## Core Characteristics（核心特征）

1. 容器两接口：`BeanFactory`（`DefaultListableBeanFactory` 实现，懒加载）与 `ApplicationContext`（超集，预加载单例、自动注册 BeanPostProcessor）；二者差异仅针对单例 Bean。
2. 注入方式优先级：构造器 > Setter > 字段；Spring 4.3+ 起推荐构造器注入（单构造器可省略 @Autowired）。
3. DI 真正发生处是 `populateBean()`：依赖缺失时容器递归 `getBean()` 联动创建依赖 Bean 再注入。
4. `@Autowired` 机制：`AutowiredAnnotationBeanPostProcessor` 启动时扫描注解 → 创建 Bean 时拦截 → 反射定位依赖类型 → 从 BeanFactory 查找 → 反射注入。
5. 作用域：singleton（默认）/ prototype / request / session / application。
6. `@Autowired` 与 `@Resource`：前者 Spring 专属、先 byType、支持 `@Primary` 与构造器注入；后者 JSR-250 标准、先 byName、不支持 `@Primary` 与构造器注入；`@Resource(name="x")` 找不到直接报错、不回退 byType。

## Structure（结构）

Bean 出生四步：反射实例化（毛坯房）→ 属性填充（DI 发生）→ 初始化 → 成品入单例池。

## How It Works（运作方式）

- 配置解析生成 BeanDefinition（图纸）→ BFPP 在实例化前修改图纸 → 实例化 → populateBean 注入 → BPP 前后置增强 → 入单例池。
- 注入查找顺序：`@Autowired` 先 byType、失败再 byName（需 @Qualifier 消歧，多类型 Bean 时抛 NoUniqueBeanDefinitionException）；`@Resource` 先按字段名匹配、失败再按类型。

## Relationships（关系）

### Related Concepts（相关概念）

- [[spring-aop]]（AOP 代理在属性填充后的初始化后阶段生成，DI 与 AOP 在生命周期上衔接）
- [[spring-circular-dependency]]（三级缓存专门解决 setter 注入产生的循环依赖）

### Dependencies（依赖项）

- 反射 API（Constructor.newInstance / 字段与方法反射）
- BeanDefinition 元数据（图纸）

### Distinctions（区分）

- IOC 是思想、DI 是实现：IOC 回答"控制权交给谁"，DI 回答"依赖如何注入"。
- `BeanFactory` 与 `ApplicationContext`：前者是容器能力接口，后者是完整运行时；仅在资源极度受限（嵌入式、移动端）才用前者。

## Evolution（演进）

- Spring 4.3+：构造器注入成为推荐方式（单构造器可省略 @Autowired）；init-method 等早期配置方式逐渐被注解取代（原文表述）。

## Open Questions（开放问题）

- 无（标准机制，无争议点）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-spring-interview-11-high-freq-topics.md`

## Related Knowledge（相关知识）

- [[spring-20-extension-points]]（定义期/实例化期扩展点时间轴，DI 发生在实例化期属性填充段）
- [[spring-aop]]
- [[spring-circular-dependency]]
