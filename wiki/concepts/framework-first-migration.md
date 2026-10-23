---
id: wiki-concept-framework-first-migration
type: concept
title: 框架先行的规模化运行时迁移
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - concept
  - java
  - 工程实践
  - 平台工程
sources:
  - raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md
related:
  - wiki/concepts/virtual-threads-production.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# 框架先行的规模化运行时迁移

## Definition（定义）

大规模运行时/整栈换代（JDK、Spring 大版本、Jakarta EE 等）的一种组织策略：由统一框架底座先把兼容成本扛下来——BOM 收口依赖版本、Jakarta/中间件/RPC 适配在框架内完成、重复代码改造交给 AI 批量执行——业务工程只需切换 parent 并按检查单对齐基线。即「底座先动，业务后动」。

## Why It Matters（为什么重要）

上千个服务各自升级很难收尾：版本在 POM 里各自对齐、同一兼容问题每个工程各踩一遍、框架已解决的问题会在业务工程里重新冒出来。把公共成本收敛到框架层，业务侧工作量从「逐个依赖排雷」降为「切 parent + 检查单」，迁移才具备可收尾性。

## Core Characteristics（核心特征）

1. **BOM 收口**：版本统一锁定在 BOM，业务工程只声明依赖、不写版本号、不覆盖版本；升级评审先看依赖树冲突再看业务 diff。
2. **框架分代并行**：按大版本分代（如 2.x=JDK 8+Boot 2，3.x=JDK 21+Boot 3.5+Jakarta），核心组件版本强绑定杜绝跨代混用；新老两代并行维护，存量服务按自己节奏迁移，新代验证过的能力回灌旧代。
3. **AI 批量改造**：javax→jakarta 这类机械重复改动交给 AI 批量改写，同时按已知兼容问题清单扫描代码，人工负责验收。
4. **检查单收敛**：业务侧动作收敛为有限检查单（货拉拉为 5 项升级检查单 + 7 条回归检查单），覆盖框架无法代劳的对齐项（自定义 Starter、内部组件同代、Lombok 等编译期组件）。
5. **发布可回滚**：STG → PRE → 生产逐级推进，核心服务先灰度放量，出问题一键回老版本。
6. **成本沉淀**：踩过的坑与调过的参数最终沉到框架与基础镜像（堆百分比写进镜像基线、JFR/线程池指标写进发布门禁），让下一次升级业务仍只改一行 parent。

## How It Works（运作方式）

框架三件套同代升级（应用框架做 Jakarta 迁移与自动配置注册机制切换、RPC 框架做新一代 API 适配、监控组件换指标/链路引擎保证灰度期间观测不断档）→ BOM 整组抬升依赖并逐一验证与公司内部服务端版本的适配 → AI 批量改写业务代码 + 人工验收 → 业务切 parent 按检查单收尾 → 灰度放量，按回归检查单逐项对照（编译全绿但语义已变的问题只能靠回归覆盖）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[virtual-threads-production|虚拟线程生产实践]]：运行时迁移中引入的新能力，其接入方式（Helper、DTP 开关）同样由框架统一提供，是本策略在「特性落地」维度的实例。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：迁移后的运行时验收（基线对照、单变量调整）遵循该方法论。

### Distinctions（区分）

- 与「各工程自己升」的区别：后者版本管理、兼容改造、排雷全部下沉到每个业务工程，成本随服务数线性增长且无法收尾；本策略把可变成本变成框架层的一次性投入。
- 与 Big Bang 切换的区别：框架分代并行维护允许存量服务按节奏迁移，不要求一次性切换。

## Evolution（演进）

- 2026-10-23 — 货拉拉 JDK 8→21 实践完整呈现该策略：JAF/Hermes/Monitor 三仓库同代升级、约 42 个 spring.factories 切换、AI 批量 javax→jakarta、5 项业务检查单；上千个服务迁移后同等业务量 CPU 降 10%、内存降 50%。

## Open Questions（开放问题）

- 该策略依赖「服务统一建在一个框架底座上」这一前提；技术栈分散的组织需要多大的底座收敛前置投入，当前信源未覆盖。
- AI 批量改写的验收标准与漏改率（信源只说「人工负责验收」）缺乏量化数据。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-jdk21-migration-huolala.md`

## Related Knowledge（相关知识）

- [[jdk21-migration-huolala|JDK 21 规模化落地实践（信源页）]]
