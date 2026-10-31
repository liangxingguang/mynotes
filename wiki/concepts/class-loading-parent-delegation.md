---
id: wiki-concept-class-loading-parent-delegation
type: concept
title: 类加载与双亲委派
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - java
  - jvm
  - classloader
sources:
  - raw/sources/architecture/2026-10-28-jvm-interview-guide.md
related:
  - wiki/sources/jvm-interview-guide.md
  - wiki/concepts/jmm-happens-before.md
  - wiki/entities/arthas.md
---
# 类加载与双亲委派

## Definition（定义）

JVM 类加载机制：类从被加载到虚拟机内存直到卸载的完整生命周期，分五阶段——**加载 → 验证 → 准备 → 解析 → 初始化**。双亲委派模型（Parent Delegation）是其默认委派策略：类加载请求先向上委托给父加载器（最终到 Bootstrap 启动类加载器），父加载器找不到时才由子加载器向下加载。

## Why It Matters（为什么重要）

双亲委派是 JVM 类隔离与核心类保护的基石：它保证 `java.lang.String` 等核心类全局唯一（防止恶意篡改与重复加载），也保证 `instanceof` 语义一致（同一类经不同加载器加载会产生不同 Class 对象，instanceof 失败）。理解破坏场景是排查 SPI 失败、Tomcat 应用隔离、热部署与类泄漏（Metaspace 膨胀）等问题的前提。

## Core Characteristics（核心特征）

1. **五阶段要点**：
   - 加载：读字节流 → 方法区运行时结构 → 堆中 Class 对象；唯一可完全自定义的阶段（重写 `findClass()`）；
   - 验证：文件格式（魔数 0xCAFEBABE）/元数据/字节码/符号引用四步；生产可 `-Xverify:none` 提速；
   - 准备：仅给 static 变量分配内存并赋**默认值**（`static int num=100` 此时为 0）；`static final` 常量编译期入常量池，准备阶段直接赋指定值；
   - 解析：符号引用 → 直接引用；失败抛 NoSuchFieldError/NoSuchMethodError；**可推迟到初始化后**（动态绑定基础）；
   - 初始化：执行 `<clinit>()`；父类先初始化；JVM 保证多线程加锁同步。
2. **主动触发初始化仅 6 种**：new、调静态方法、访问静态字段（final 常量除外）、反射 Class.forName、初始化子类先初始化父类、启动主类。被动不触发：子类引用父类静态字段只初始化父类；数组定义不初始化元素类；访问 final static 常量不触发。
3. **双亲委派的设计意义**：① 沙箱安全（防恶意篡改核心类）② 类唯一性。
4. **破坏的 4 种场景**（破坏是特性不是 bug）：
   - JDK1.2 前：自定义类加载器重写 `loadClass()`（之后官方建议重写 `findClass()`）；
   - **SPI 机制**：接口由 Bootstrap 加载（如 `java.sql.Driver`），实现类在 classpath 下加载不到 → 用**线程上下文类加载器**反向拿 AppClassLoader 加载实现类（JDBC/JNDI/JAXP）；「爸爸偶尔低头请儿子帮忙」；
   - **热部署**：Tomcat 每个 Web 应用独立 `WebappClassLoader`，**优先自己加载**、找不到才委托父级，实现应用间隔离与热替换（JRebel/DevTools 同理：卸旧加载器造新的）；
   - **OSGi**：Bundle 各有类加载器，网状委派结构，支持热插拔与版本管理。

## Relationships（关系）

### Related Concepts（相关概念）

- [[jmm-happens-before|Java 内存模型与 happens-before]]：同出 JVM 面试题信源，覆盖 JVM 运行时机制互补板块。
- [[oom-troubleshooting|OOM 排查方法论]]：Metaspace OOM 常源于类加载器泄漏（动态生成类/旧加载器未卸载），两概念在 OOM 6 类速查表中关联。

### Distinctions（区分）

- **委派 vs 破坏**：双亲委派是默认策略；SPI/Tomcat/OSGi 的「破坏」是官方支持的特性（通过线程上下文类加载器或自定义优先策略实现），不是实现缺陷。

## Open Questions（开放问题）

- 单一二手信源（公众号面试题）；与《深入理解 Java 虚拟机》表述一致，但「4 种破坏场景」的归纳口径各教材略有差异（部分教材另列 JNDI 单独成类）。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-jvm-interview-guide.md`（类加载五阶段、准备阶段默认值/final 特例、初始化 6 触发、双亲委派意义与 4 种破坏场景）

## Related Knowledge（相关知识）

- [[jvm-interview-guide|JVM 面试题最全整理（信源页）]]
- [[oom-troubleshooting|OOM 排查方法论]]（Metaspace 类泄漏方向）
