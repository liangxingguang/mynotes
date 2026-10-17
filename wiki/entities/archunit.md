---
id: wiki-entity-archunit
type: entity
title: ArchUnit
status: active
created: 2026-10-17
updated: 2026-10-17
confidence: high
tags:
  - entity
  - java
  - architecture
  - testing
sources:
  - raw/sources/architecture/2026-10-14-archunit-java-architecture-guardrails.md
---
# ArchUnit

## Overview（概览）

ArchUnit 是 TNG Technology Consulting 维护的开源 Java 库（Apache 2.0），把架构约定写成可执行的单元测试：导入编译后的 .class 字节码构建类与依赖关系图，用流式 DSL 规则审查，违规即测试失败、CI 拦截。被定位为"架构适应度函数（Fitness Function）"在 Java 世界的低成本实现。

## Identity（身份信息）

- Type（类型）: 开源 Java 测试库（架构治理工具）
- Organization（所属组织）: TNG Technology Consulting
- Role（角色）: 把团队架构约定（分层、依赖方向、命名、注解、模块边界）固化为 CI 可执行检查
- Status（状态）: 活跃维护（截至 2026-09，最新版 1.5.1）

## Important Facts（重要事实）

- 分析字节码而非源码：看得见 Lombok/Kotlin 生成代码、方法调用与字段访问；代价是必须先编译；规则不依赖类路径执行，可直接分析 JAR 或目录。
- API 分三层：Core（ClassFileImporter/JavaClass 领域模型）、Lang（classes()/noClasses()/methods() 流式 DSL）、Library（分层、洋葱、切片、模块、冻结、度量等开箱套餐）。
- 规则句式 `classes().that().should().because()`；默认空 should 直接失败（failOnEmptyShould），防止包改名后规则"永远绿"。
- 老项目落地靠 FreezingArchRule 冻结快照：现存违规冻成快照提交 Git，CI 禁止新建快照，只拦新增、修一个缩一个（棘轮机制）。
- 依赖按测试框架选坐标：archunit-junit6 / junit5 / junit4 或核心包 archunit（1.5.1）。
- 已知盲区：编译期常量内联、反射、Spring 运行时动态调用在字节码中不可见。

## Products / Projects（产品／项目）

- 官方文档 archunit.org；源码与示例在 GitHub TNG/ArchUnit 与 TNG/ArchUnit-Examples。
- Spring Modulith 的模块校验建立在 ArchUnit 之上。

## Relationships（关系）

- 上游概念：架构适应度函数（《演进式架构》）——ArchUnit 是其在 Java 的最低成本实现之一。
- 互补工具：Checkstyle/PMD（代码风格）、Sonar 类平台（通用指标）、Maven 多模块/JPMS（编译期强隔离）——ArchUnit 补"团队自有架构约定"的执行缝。

## Timeline（时间线）

- 1.2.0 — 引入 modules() API（注解声明模块合同：可依赖谁、暴露哪些包）
- 1.4.x — Java 24/25/26 支持；@AnalyzeClasses 可作元注解；新增通用规则 OLD_DATE_AND_TIME_CLASSES_SHOULD_NOT_BE_USED；切片规则支持优先级
- 2026-08-04 — 1.5.0：archunit-junit6 模块、Java 27、密封类 isSealed()/getPermittedSubclasses()、catch 异常计入依赖、haveAnyDependenciesThat 条件、@AnalyzeClasses(classes=) 精确到单类、Lakos 度量提速、冻结文本存储并行线程安全
- 2026-09-25 — 1.5.1：最新补丁版，以缺陷修复为主

## Current Understanding（当前认知）

在 Java 团队落地架构门禁的默认候选之一；适用姿势是"只固化违反了真会痛的约定"，先领域纯净/无循环、再分层、后命名注解。AI 编码场景下被视作对人和 AI 一视同仁的架构护栏（当前仅单一教程信源支撑）。

## Evidence（证据）

- `raw/sources/architecture/2026-10-14-archunit-java-architecture-guardrails.md`
