---
id: 2026-10-28-jvm-interview-guide
title: JVM面试题最全整理：从内存模型到OOM排查，一篇打通底层原理
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/kKcYVmrZ8LwUtgxghzGBcQ
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/jvm-interview-guide.md
wiki_status: ingested
---

# JVM面试题最全整理：从内存模型到OOM排查

> JVM 七大高频考点一篇打通：运行时数据区、对象分配三板斧（逃逸分析/TLAB/栈上分配）、类加载五阶段、双亲委派与四种破坏场景、JMM 与 happens-before、四种引用、6 类 OOM 速查与排查五步法。

## 核心要点

- **数据区铁律**：跟线程走=私有（计数器/栈/本地栈），类信息+对象=共享（堆/方法区）；计数器唯一不 OOM。
- **对象分配**：逃逸分析未逃逸→栈上分配+标量替换（零 GC）；逃逸→TLAB 无锁分配→公共 Eden CAS 兜底。
- **类加载坑**：准备阶段普通 static 赋默认值、final static 直接赋值；初始化主动触发仅 6 种。
- **双亲委派破坏**：SPI 用线程上下文类加载器反向加载；Tomcat 每应用独立加载器优先自己加载；热部署靠换加载器。
- **JMM**：happens-before 是可见性契约而非时间先后；volatile 兼禁指令重排（DCL 单例必加）；synchronized 保三性。
- **四种引用**：软引用做缓存、弱引用救 ThreadLocal 内存泄漏、虚引用+ReferenceQueue 跟踪堆外内存（Netty）。
- **OOM 排查**：先定类型再定位根源；提前配 HeapDumpOnOutOfMemoryError；生产禁直接 jmap -dump；GC overhead limit 比 heap space 更危险；90% 是代码问题。

## 正文

见 [[Assets/2026/10/jvm-interview-guide.md|抓取正文]]，含对比表、分配决策链、6 类 OOM 速查表。

## 来源

- [JVM面试题最全整理：从内存模型到OOM排查](https://mp.weixin.qq.com/s/kKcYVmrZ8LwUtgxghzGBcQ)（微信公众号）

## 附件

- [[Assets/2026/10/jvm-interview-guide.md]]
