---
id: wiki-source-archunit-java-architecture-guardrails
type: source
title: 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁
status: active
created: 2026-10-17
updated: 2026-10-17
confidence: high
tags:
  - architecture
  - java
  - engineering-practice
sources:
  - raw/sources/architecture/2026-10-14-archunit-java-architecture-guardrails.md
related:
  - wiki/entities/archunit.md
---
# 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁

## Overview（概览）

「架构师Beata」公众号基于 ArchUnit 1.5.1（2026-09-25 发布）的系统教程：把团队架构约定写成 JUnit 测试，工具读取编译后字节码构建依赖图，违规即测试变红、CI 拦截。覆盖规则 DSL、分层/洋葱/切片/模块规则、PlantUML 图即规则、自定义条件、老项目冻结快照落地与多服务规则 SDK 化，以虚构"喵呜奶茶"点单系统（order/coupon/member 三上下文）贯穿示例。

## Key Facts（关键事实）

- 定位：架构适应度函数（Fitness Function，《演进式架构》提出的概念）在 Java 世界的低成本实现；补上文档、Code Review、Checkstyle/PMD、Sonar、Maven 模块之间"团队自有架构约定无人执行"的缝。
- 原理：ClassFileImporter 导入 .class 字节码（非源码，看得见 Lombok/Kotlin 生成代码、方法调用与字段访问）→ JavaClasses 依赖图 → ArchRule.check 审查；报错精确到类与行号；不依赖类路径执行。API 分 Core/Lang/Library 三层。
- 规则句式：`classes().that(筛选).should(判定).because(理由)`；包匹配 `..`（任意层级）、`*`（一段）、`(*)`（捕获分组）、`(**)`、`[a|b]`；匹配的是包名而非全限定类名。默认"should 作用于空集合"直接失败（failOnEmptyShould），防止包改名后规则永远绿。
- 典型点状规则：@RestController 须在 web 包且以 Controller 结尾；@Transactional 只许在 application 层 public 方法；domain 禁调 LocalDateTime.now（逼出 Clock 注入）；domain 禁依赖 Spring/JPA/MyBatis（1.5.0 起 catch 的异常也算依赖）；GeneralCodingRules 内置禁 sysout、字段注入、JUL、旧日期类（1.4.0 起）等通用规则。
- 架构级规则（Library 层）：layeredArchitecture 钉死依赖倒置（Infrastructure 可访问 Domain 但不被任何层访问）；onionArchitecture 内置"适配器互不依赖"；slices 切片检测上下文间循环依赖；1.2.0 引入的 modules() 用注解在 package-info 签"可依赖谁、暴露哪些包"的合同；adhereToPlantUmlDiagram 让 PlantUML 组件图直接成为规则依据。
- 版本线（截至 2026-09）：1.5.1（2026-09-25）为最新补丁版；功能大版本 1.5.0（2026-08-04）新增 archunit-junit6 模块、Java 27 支持、密封类 isSealed()/getPermittedSubclasses()、catch 异常计入依赖、haveAnyDependenciesThat 条件、@AnalyzeClasses(classes=) 精确到单类、Lakos 度量提速、冻结文本存储并行线程安全；1.4.x 带来 Java 24/25/26、@AnalyzeClasses 元注解、OLD_DATE_AND_TIME 通用规则。
- 老项目落地：FreezingArchRule 把现存违规冻成快照提交 Git 当技术债台账，CI 设 freeze.store.default.allowStoreCreation=false 禁止新建快照，此后只拦新增违规、修一个快照缩一个（只进不退的棘轮）；引入顺序先领域纯净/无循环，再分层，最后命名注解。
- 工程化：规则沉淀公共 JAR + 元注解（1.4.0 起 @AnalyzeClasses 可作元注解）供多服务订阅；规则自身要用故意违规样例测试；性能靠 DoNotIncludeJars/DoNotIncludeTests、resolveMissingDependenciesFromClassPath=false、导入缓存复用。
- 盲区：编译期常量内联、反射与 Spring 运行时动态调用在字节码里不可见。

## Important Claims（重要论断）

### Claim 1：架构约束不能只活在人脑子里

架构腐化没有哪一次提交是罪魁祸首，根源是约束只靠人记；Checkstyle 管"字写得工不工整"，ArchUnit 管"承重墙有没有被打掉"。

### Claim 2：只固化"违反了真会痛"的约定

规则本身是代码需要维护；别把 ArchUnit 写成三百条交通法规，规则少而硬才有人愿意遵守。

### Claim 3：对 AI 生成代码一视同仁

AI 助手写得飞快也常"很有创意"地跨层调用；规则不区分代码作者，过不了规则就进不了主干。

## Concepts Introduced（引入的概念）

- 架构适应度函数（Fitness Function）：用可执行、客观的检查持续度量系统是否仍符合预期架构特征（文中引《演进式架构》，未展开独立概念页所需证据）

## Entities Mentioned（提及的实体）

- [[archunit|ArchUnit]]
- TNG Technology Consulting（ArchUnit 维护方）
- Spring Modulith（模块校验建立在 ArchUnit 之上）

## Implications（影响／启示）

- "架构决策即 executable 文档"：规则 + because 是永不过期的架构说明书（过时的测试会变红），反馈左移到本地 mvn test。
- 冻结快照机制为一切"老系统引入新门禁"提供可复用范式：既往不咎、下不为例、只进不退。
- 与 [[ai-native-sdlc|AI 原生 SDLC]] 的 Hook/evals 思路同构：护栏以代码而非习惯运行。

## Limitations（局限）

- 单一作者教程，示例项目为虚构；"收益"章节属经验性论断，无对照数据。
- 字节码分析的天然盲区（常量内联、反射、运行时动态调用）意味着它不能替代全部治理手段。
- 版本特性以 2026-09 时点为准，后续版本可能变化。

## Related Knowledge（相关知识）

- [[archunit|ArchUnit]]
- [[ai-native-sdlc|AI 原生 SDLC]]（AI 编码时代的护栏思路互参）

## Source（信源）

- `raw/sources/architecture/2026-10-14-archunit-java-architecture-guardrails.md`
