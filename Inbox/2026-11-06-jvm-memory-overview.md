---
id: 2026-11-06-jvm-memory-overview
title: JVM 内存全景图
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU2MjgxNzA4OA==&mid=2247483991&idx=1&sn=c089e7cfff639e37881c8b5530fb9370&chksm=fc62f378cb157a6e3e24b41cd90eeebbbbb1c261df162b8622b5cfc9de01dc7e14eb788d6278#rd
source_type: link
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [java]
asset_ref: Assets/2026-11/jvm-memory-overview.md
wiki_status: pending
---

# JVM 内存全景图

> 讲清 JVM 六大内存区域的职责（堆/栈/方法区/元空间/程序计数器/直接内存），为什么按生命周期与访问方式分区，并给出 OOM 报错对号入座表与默认配置查看命令。

## 核心要点

1. 六大区域：堆（线程共享、对象之家、GC 主战场）、虚拟机栈（线程私有、栈帧/局部变量）、本地方法栈、方法区/元空间（类的户口本）、程序计数器（执行指针）、直接内存（堆外 NIO）
2. 分区根本原因：各区域生命周期与访问方式不同——线程私有区随线程生灭无并发竞争，共享区靠 GC 与锁保证一致，是分代/Region/并发回收的底层逻辑
3. `Java heap space` 典型原因：缓存无上限 put、一次查询加载百万条、static Map 内存泄漏
4. `-Xms` 与 `-Xmx` 生产环境建议设相等，避免扩容触发 Full GC 抖动
5. 栈两错：`StackOverflowError`（递归撑爆固定深度栈）、`unable to create new native thread`（线程过多，实例：每请求 new Thread 致全站雪崩）
6. JDK 8 起永久代（PermGen）改为元空间（Metaspace，本地内存）；Metaspace OOM 多因 CGLIB/Groovy 动态生成类过多，微服务常显式设 `-XX:MaxMetaspaceSize`
7. 程序计数器是唯一不会 OOM 的区域，native 方法执行时为空
8. 直接内存不受 GC 直接管理：可能堆还空但进程被 OS OOM Killer 杀掉；上限 `-XX:MaxDirectMemorySize`（默认等于 -Xmx）
9. OOM 对号入座表：`Java heap space`→堆/对象堆积；`Metaspace`→类加载过多；`unable to create new native thread`→栈线程超限；`Direct buffer memory`→NIO 未限流；`GC overhead limit exceeded`→堆 98% 时间 GC 回收不到 2%
10. `java -XshowSettings:vm -version` 查看堆总量、默认代比例（老年代:新生代=2:1，Eden:S0:S1=8:1:1）与元空间预留；容器环境 JDK 8u191+/11+ 默认感知容器上限

## 正文

文章从凌晨一次 `OutOfMemoryError: Java heap space` 告警切入（堆有 4G 为何还会满），系统展开 JVM 内存全景。

**分区逻辑**：JVM 把内存切成六块——堆、虚拟机栈、本地方法栈、方法区/元空间、程序计数器、直接内存。分区的核心不是随便切，而是各块生命周期与访问方式不同：线程私有区（栈、PC、本地栈）随线程生灭、天然无并发竞争；共享的堆与元空间承载大量对象，需要 GC 与锁保证一致。「快变、私有、简单」与「慢变、共享、复杂」分开管理，是后续分代、Region、并发回收等所有优化的底层逻辑。

**各区域要点**：
- 堆：`-Xms`/`-Xmx` 划定，对象主要居所；分代（年轻代/老年代）留待第 4 篇
- 虚拟机栈：每线程一块，栈帧含局部变量表、操作数栈、返回地址；`-Xss` 控制深度
- 方法区/元空间：存类结构（字段、方法、字节码、常量池）；PermGen 在堆内易 OOM，JDK 8 起挪到本地内存
- 程序计数器：记录当前字节码指令地址，线程切换后恢复执行的依据
- 直接内存：`ByteBuffer.allocateDirect` 分配在堆外，靠 Cleaner 回收，算进程总内存但不受 GC 直接管理

**动手实践**：`java -XshowSettings:vm -version`（或 `-XX:+PrintGCDetails`）查看默认配置。容器环境早期 JVM 版本会误读宿主机内存，JDK 8u191+/11+ 已默认 `-XX:+UseContainerSupport`；老版本在 Docker 需手动设 `-Xmx`。

**系列脉络**：本篇为「JVM 与性能调优系列」第 1 篇，后续分代、GC 算法、收集器、调优逐篇展开。

## 来源

- 原文：http://mp.weixin.qq.com/s?__biz=MzU2MjgxNzA4OA==&mid=2247483991&idx=1&sn=c089e7cfff639e37881c8b5530fb9370&chksm=fc62f378cb157a6e3e24b41cd90eeebbbbb1c261df162b8622b5cfc9de01dc7e14eb788d6278
- 专辑（JVM 系列，栏天百云）：https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU2MjgxNzA4OA==&action=getalbum&album_id=4676660163355344900

## 附件

[[Assets/2026-11/jvm-memory-overview.md]]
