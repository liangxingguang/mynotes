---
id: wiki-source-jdk21-migration-huolala
type: source
title: JDK 21 规模化落地实践（货拉拉）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - java
  - jvm
  - 虚拟线程
  - 工程实践
sources:
  - raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md
related:
  - wiki/concepts/virtual-threads-production.md
  - wiki/concepts/framework-first-migration.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# JDK 21 规模化落地实践（货拉拉）

## Overview（概览）

货拉拉核心基础设施部（徐键）复盘上千个 Java 在线服务从 JDK 8 升级 JDK 21 + Spring Boot 3.5 + Jakarta 的完整过程：框架（JAF/Hermes/Monitor）先扛兼容成本、BOM 收口版本、AI 批量改写 javax→jakarta，业务工程只需切 parent 并执行五项检查单；附 12 个真实踩坑、虚拟线程接入方式与 GC/容器运行时参数模板。

## Key Facts（关键事实）

- 规模：上千个在线 Java 服务，统一建在自研框架 JAF 上；升级后同等业务量线上实测 CPU 降 10%、内存降 50%。
- 框架分代：2.x = JDK 8 + Boot 2，3.x = JDK 21 + Boot 3.5 + Jakarta；Hermes 与 JAF 版本强绑定（hermes.version = lala.release.version），两线并行维护。
- 依赖整组抬升：Spring Boot 2.2.6→3.5.0、Spring 5.2.5→6.2.7、Servlet javax 4.0→jakarta 6.0、gRPC 1.41→1.73、Jackson 2.10→2.19、MySQL Connector 5.1.48→9.2.0。
- httpcore5 5.4 bug：默认 tcpNoDelay 失效，Nagle 与 Delayed ACK 叠加致大包 RPC 延迟约 +40ms，升 5.4.2 修复。
- spring.factories → AutoConfiguration.imports（约 42 个文件）；只写旧机制的自定义 Starter 在 Boot 3 下静默失效。
- GC 选型：默认 G1（堆 2G~16G、停顿 50~200ms）；大堆低延迟评估分代 ZGC（-XX:+UseZGC -XX:+ZGenerational，堆占比 65~70 起步）。
- 容器参数：MaxRAMPercentage G1 取 70~75、ZGC 取 65~70；InitialRAMPercentage 约上限一半且不等于上限；System.gc() 用 ExplicitGCInvokesConcurrent 而非 DisableExplicitGC；堆外显式 MaxDirectMemorySize。

## Important Claims（重要论断）

### 编译全绿 ≠ 语义没变

升级最耗时的是编译通过但行为已变的问题：契约/序列化/线程模型类问题编译器拦不住，只能靠回归覆盖；另一类和发布方式、机器规格相关的坑只在灰度窗口或生产规格机器上才暴露。因此给出 7 条回归检查单（javax/jakarta 不并存、真实线上报文回放反序列化、钉住跟踪、≥3 核机器回归等）。

### 虚拟线程先选场景，观测手段要换代

虚拟线程适合 IO 等待型同步代码，CPU 密集与框架自管线程池（XXL-JOB、Kafka 消费）场景不用；跨任务传递需 Helper 封装 Trace 与 ThreadLocal；热路径避免 synchronized 阻塞 IO（钉住），JDK 24 JEP 491 后缓解。虚拟线程可达十万级使 thread dump 失效，排障顺序改为 GC 日志 → JFR → 钉住跟踪 → 聚合指标。

### 运行时收益要沉到框架与镜像基线

踩过的坑与调过的参数最终沉到框架和基础镜像（容器感知堆百分比写进镜像基线、JFR 与线程池指标写进发布门禁），让下一次运行时升级业务仍只改一行 parent。

## Concepts Introduced（引入的概念）

- [[virtual-threads-production|虚拟线程生产实践]]
- [[framework-first-migration|框架先行的规模化运行时迁移]]

## Entities Mentioned（提及的实体）

- 货拉拉技术中心核心基础设施部；自研组件 JAF（lalaframework）、Hermes（hll-hermes SOA/RPC）、Monitor（lala-jaf-monitor）、动态线程池 DTP（无独立页面）

## Implications（影响／启示）

- 有统一框架底座的大型组织做运行时换代，「底座先动、业务后动」能把业务侧成本收敛成检查单；没有框架底座的组织无法直接复制此路径。
- 「编译是绿的，语义已经变了」是整栈换代的普遍风险：升级评审先看依赖树冲突再看业务 diff，回归要用真实线上报文回放。
- 印证 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：G1 停顿目标不写达不到的值、IHOP 45→35~40 单变量调整、堆外内存单独留位置等做法一致。

## Limitations（局限）

- 单一企业实践复盘，无对照组；CPU -10%/内存 -50% 的收益与其容器化程度、JDK 8 旧参数现状相关，不可直接平移。
- 12 个踩坑的正文在原文有节选（坑 01~12 仅以检查单编号引用，逐条现象/原因未全部展开）。

## Related Knowledge（相关知识）

- [[virtual-threads-production|虚拟线程生产实践]]
- [[framework-first-migration|框架先行的规模化运行时迁移]]
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]
- [[gc-log-tuning-practice|GC 日志分析与调优实战（信源页）]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md`
