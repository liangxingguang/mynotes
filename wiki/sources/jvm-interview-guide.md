---
id: wiki-source-jvm-interview-guide
type: source
title: JVM面试题最全整理：从内存模型到OOM排查
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - java
  - jvm
  - interview
sources:
  - raw/sources/architecture/2026-10-28-jvm-interview-guide.md
related:
  - wiki/concepts/jmm-happens-before.md
  - wiki/concepts/class-loading-parent-delegation.md
  - wiki/concepts/oom-troubleshooting.md
  - wiki/topics/jvm-gc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# JVM面试题最全整理：从内存模型到OOM排查

## Overview（概览）

公众号面试题长文：以问答体系统覆盖 JVM 七大高频考点——运行时数据区、对象创建与内存分配（逃逸分析/TLAB/栈上分配）、类加载五阶段、双亲委派及破坏场景、JMM 与 happens-before、四种引用类型、6 类 OOM 速查与排查五步法。属二次科普信源，与 [[jvm-gc-interview-guide|JVM GC 面试全讲透]] 同族互补（后者专讲 GC，本文覆盖 JVM 运行时机制全貌）。

## Key Facts（关键事实）

- **运行时数据区铁律**：跟线程走的私有（程序计数器/虚拟机栈/本地方法栈），类信息与对象共享（堆/方法区）；程序计数器是唯一不会 OOM 的区域；栈帧含局部变量表/操作数栈/动态链接/方法出口，`-Xss` 调优。
- **堆与方法区演进**：年轻代 Eden+S0+S1（8:1:1）+ 老年代；方法区 JDK7- 为永久代（堆内，易 OOM）→ JDK8+ 元空间（本地内存，`-XX:MaxMetaspaceSize` 控制）；JDK7 字符串常量池已移入堆。
- **对象分配决策链**（优先级 栈上 > TLAB > 堆）：逃逸分析未逃逸 → 标量替换/栈上分配（零 GC，JDK8+ 默认开）；逃逸 → TLAB（Eden 内线程私有，默认占 Eden 1%）无锁分配；TLAB 满 → 公共 Eden CAS 兜底；超大对象直接进堆。内存规整用指针碰撞（Serial/ParNew），不规整用空闲列表（CMS）。误区：TLAB 是堆内的一部分，非堆外内存；栈上分配只适合小对象。
- **类加载五阶段**：加载 → 验证 → 准备 → 解析 → 初始化；准备阶段仅给 static 变量赋默认值（`static int num=100` 此时为 0），`static final` 常量编译期直接赋值；初始化主动触发仅 6 种（new/调静态方法/访问非 final 静态字段/Class.forName/初始化子类先初始化父类/启动主类）；解析可推迟到初始化后（动态绑定基础）。
- **双亲委派**：向上委托、向下加载；设计意义为沙箱安全（防篡改核心类）与类唯一性（不同加载器产生不同 Class，instanceof 失败）；破坏 4 场景见 [[class-loading-parent-delegation]]。
- **JMM**：JMM ≠ JVM 运行时内存结构，是解决原子性/可见性/有序性的抽象规范；主内存/工作内存副本模型是可见性问题根源；happens-before 是可见性契约而非时间先后，8 条规则见 [[jmm-happens-before]]；volatile 兼禁指令重排（DCL 单例必须加），synchronized 保原子性+可见性+有序性。
- **四种引用**：强（永不回收，OOM 罪魁）/ 软（内存不足才回收，缓存）/ 弱（下次 GC 必回收，ThreadLocal Key 防泄漏）/ 虚（get() 永为 null，配 ReferenceQueue 跟踪堆外内存，Netty）；回收顺序：弱 → 软 → OOM。
- **OOM 排查**：6 类 OOM 速查表（Java heap space / Metaspace / Direct buffer memory / StackOverflowError / unable to create native thread / GC overhead limit exceeded）与五步排查法见 [[oom-troubleshooting]]；生产禁直接 `jmap -dump`（进程停顿）；`GC overhead limit exceeded` 比 heap space 更危险（98% 时间 GC 只回收 2%）；90%+ 的 OOM 是代码问题，JVM 参数只是缓兵之计。
- **监控口径**：Prometheus + JMX Exporter，老年代 >85% 持续 5 分钟告警，「台阶式上涨不回落」是泄漏征兆；内存溢出（确实不够）≠ 内存泄漏（不用了但回收不掉，最终导致溢出）。

## Important Claims（重要论断）

### Claim 1：happens-before 是可见性保证，不是时间先后

「A happens-before B」意味着 A 的修改对 B 可见且重排序不能把 A 排到 B 后；时间先发生 ≠ happens-before。见 [[jmm-happens-before]]。

### Claim 2：GC overhead limit exceeded 比 heap space 更危险

98% 时间花在 GC 只回收 2% 内存，堆已接近耗尽且无有效回收——比单纯堆不足更接近全面崩溃。与 [[oom-troubleshooting]] 的优先级判断一致。

### Claim 3：90%+ 的 OOM 是代码问题，JVM 参数只是缓兵之计

「扩堆/调参能解燃眉之急，但泄漏与失控分配不修代码会复发」——与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的「代码优化 > GC 调优」优先级一致（印证）。

## Concepts Introduced（引入的概念）

- [[jmm-happens-before|Java 内存模型与 happens-before]]
- [[class-loading-parent-delegation|类加载与双亲委派]]
- [[oom-troubleshooting|OOM 排查方法论]]

## Entities Mentioned（提及的实体）

- 无新实体（Netty/Tomcat/OSGi 仅作为场景提及，未展开，不立页）。

## Implications（影响／启示）

- 本文与 [[jvm-gc-interview-guide]] 合并构成 JVM 面试知识域的两篇信源：一篇专攻 GC，一篇覆盖运行时机制其余六大板块；[[jvm-gc]] 主题页的 OOM/内存视角由 [[oom-troubleshooting]] 承接（解读）。
- 「生产禁直接 jmap -dump」与 [[jvm-troubleshooting-six-tools]] 的「重操作有暂停成本、先轻后重」互为印证，三个独立信源一致。

## Limitations（局限）

- 二次科普信源（微信公众号），关键数字（如 TLAB 默认占 Eden 1%、老年代 >85% 告警阈值）未给官方出处，引用时宜标注来源层级；与 Oracle 官方文档口径可能有出入。
- 面试题体裁导致部分表述为「标准答案式」简化（如 GC 触发细节），与 [[jvm-gc-interview-guide]] 的展开论述互补而非替代。

## Related Knowledge（相关知识）

- [[jvm-gc-interview-guide|JVM GC 面试全讲透]]（同族互补信源）
- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（第六信源印证）
- [[oom-troubleshooting|OOM 排查方法论]]

## Source（信源）

- `raw/sources/architecture/2026-10-28-jvm-interview-guide.md`
