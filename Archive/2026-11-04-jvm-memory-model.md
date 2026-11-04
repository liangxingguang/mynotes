---
id: 2026-11-04-jvm-memory-model
title: JVM内存模型深度解析 —— 搞清楚堆和栈，告别OOM
source: 微信公众号「从CRUD到架构师」· 专辑《架构师之路》第 02 期
source_url: http://mp.weixin.qq.com/s?__biz=MzY4NTAxMTAwMA==&mid=2247483714&idx=1&sn=b250fca4485c6c4cf32ac943a1b2d9d3
source_type: article
platform: 微信
created: 2026-11-04
category: 学习
tags: [java]
asset_ref: Assets/2026/11/jvm-memory-model.md
wiki_status: ingested
---

> 摘要：JVM 运行时数据区全景拆解：线程私有（程序计数器、虚拟机栈、本地方法栈）vs 线程共享（堆、元空间）。程序计数器是唯一不会 OOM 的区域；虚拟机栈以栈帧为单位（局部变量表/操作数栈/动态链接/返回地址），递归过深引发 StackOverflowError 用 -Xss 调大；堆是唯一 GC 主战场，分代模型：Eden→S0/S1 复制、年龄达 15 晋升老年代、大对象直接进老年代；元空间（JDK8 起取代永久代，移至本地内存）。附经典内存分析题与 JVM 参数速查。

## 核心要点

1. **运行时数据区划分**：线程私有 = 程序计数器 + 虚拟机栈 + 本地方法栈；线程共享 = 堆 + 元空间。JDK8 把方法区从永久代改为元空间，是高频追问点。
2. **程序计数器（PC）**：记录当前线程执行的字节码行号，是**唯一不会 OOM 的区域**；线程私有，切换线程靠它恢复位置；执行 native 方法时值为 undefined。
3. **虚拟机栈**：基本单位是栈帧，含局部变量表（参数+局部变量）、操作数栈（计算中间结果）、动态链接、返回地址。递归无终止或调用链过深 → `StackOverflowError`，解法是改循环或 `-Xss` 调大栈。
4. **堆与分代 GC**：所有 new 出的对象和数组存堆。对象生命周期：Eden 出生 → Minor GC 后存活对象复制到 S0（年龄+1）→ S0/S1 间来回复制 → 年龄超阈值（默认 15）晋升老年代；大对象直接进老年代。堆 OOM 排查：`-XX:+HeapDumpOnOutOfMemoryError` 导出 dump 后用 MAT/JProfiler 分析。
5. **元空间 vs 永久代**：永久代（JDK7 及以前）在堆内、上限小易 OOM；元空间（JDK8+）在本地内存（操作系统管理）、默认无上限、类卸载时回收。参数从 `-XX:PermSize/MaxPermSize` 变为 `-XX:MetaspaceSize/MaxMetaspaceSize`。元空间 OOM 的典型原因是动态生成大量类（CGLIB 代理、JSP 编译、Lambda）。
6. **经典面试题**：`int i` 存虚拟机栈（基本类型局部变量不进堆）；字符串常量 "hello" 存堆中字符串常量池（JDK7 后从方法区移入），引用 s 存栈；`new Person()` 实例存堆、引用存栈、类元数据存元空间。
7. **JVM 参数速查**：`-Xms` 堆初始 / `-Xmx` 堆最大 / `-Xss` 线程栈 / `-XX:NewRatio` 老生比 / `-XX:SurvivorRatio` Eden:Survivor（默认 8:1）/ `-XX:MetaspaceSize` / `-XX:MaxMetaspaceSize`。
8. **金句**："基本类型和引用在栈，对象在堆，类的元数据在元空间，代码执行位置在程序计数器。"

## 正文

全文见附件（配图在微信抓取中为占位符，文字内容完整）。

## 来源

- [JVM内存模型深度解析 —— 搞清楚堆和栈，告别OOM](http://mp.weixin.qq.com/s?__biz=MzY4NTAxMTAwMA==&mid=2247483714&idx=1&sn=b250fca4485c6c4cf32ac943a1b2d9d3)

## 附件

[[Assets/2026/11/jvm-memory-model.md]]
