---
id: 2026-10-14-archunit-java-architecture-guardrails
title: 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁
source: 架构师Beata（微信公众号）
source_url: https://mp.weixin.qq.com/s/eCRR1w1AWg1TvcNAnL21GA
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags:
  - 工程实践
  - 工具
---

# 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁

> 基于 ArchUnit 1.5.1（2026-09-25 发布）的系统教程：把团队的架构约定写成 JUnit 测试，工具读取编译后字节码构建依赖图，违规即测试变红、CI 拦截。涵盖规则 DSL、分层/洋葱/切片/模块规则、PlantUML 图即规则、自定义条件、老项目冻结快照落地与多服务规则 SDK 化。核心理念：架构约束不能只活在人脑子里——Checkstyle 管"字写得工不工整"，ArchUnit 管"承重墙有没有被打掉"。

## 核心要点

1. **定位**：架构适应度函数（Fitness Function）的 Java 最低成本实现；补上文档、Review、Checkstyle、Sonar、Maven 模块之间"团队自有架构约定无人执行"的缝。
2. **原理**：ClassFileImporter 导入 `.class` 字节码（非源码，看得见 Lombok/Kotlin 生成代码、方法调用与字段访问）→ JavaClasses 依赖图 → ArchRule.check 审查，报错精确到类与行号，且不依赖类路径执行。
3. **规则句式**：`classes().that(筛选).should(判定).because(理由)`，`.and()/.or()` 拼接；包匹配 `..` 任意层级、`*` 一段、`(*)` 捕获分组；默认空 should 直接失败，防止包改名后规则"永远绿"。
4. **常用点状规则**：@RestController 必须在 web 包且 Controller 结尾；@Transactional 只许在 application 层 public 方法；domain 禁调 LocalDateTime.now（逼出 Clock 注入）；domain 禁依赖 Spring/JPA/MyBatis（1.5.0 起 catch 的异常也算依赖）；内置禁 sysout、字段注入、JUL、旧日期类等通用规则。
5. **架构级套餐**：layeredArchitecture 钉死依赖倒置（Infrastructure 可访问 Domain 但不被任何层访问）；onionArchitecture 内置适配器互不为依赖；slices 切片检测上下文间循环依赖；1.2.0 的 modules() 用注解在 package-info 签"可依赖谁、暴露哪些包"的合同；PlantUML 组件图可直接作为规则依据。
6. **1.5.0 新能力**：archunit-junit6 模块、Java 27、密封类 isSealed()/getPermittedSubclasses()（可禁止状态机被 non-sealed 开后门）、haveAnyDependenciesThat（抓"不碰领域、只拼 SQL"的传声筒用例）、@AnalyzeClasses(classes=) 精确到单类、Lakos 度量提速。
7. **老项目落地**：FreezingArchRule 把现存违规冻成快照（提交 Git 当技术债台账，CI 禁止创建快照），此后只拦新增违规，修一个快照缩一个——只进不退的棘轮；引入顺序先领域纯净/无循环，再分层，最后命名注解。
8. **工程化与盲区**：规则沉淀公共 JAR + 元注解 @AnalyzeMiaoTea 多服务订阅，规则自身要用故意违规样例测试；成本上只固化"违反了真会痛"的约定；盲区为编译期常量内联、反射与 Spring 运行时动态调用。

## 正文

### 上手与语法

依赖按测试框架选 `archunit-junit6/junit5/junit4` 或核心包 `archunit`；测试类用 `@AnalyzeClasses(packages=...)`、规则字段加 `@ArchTest`，自带引擎自动发现并缓存字节码导入结果。违规报告包含谁、在哪、违反哪条、because 理由，批评来自 CI 而非同事。

### 从点状规则到架构图执法

文章以虚构"喵呜奶茶"点单系统（order/coupon/member 三上下文，各含 web/application/domain/infrastructure）贯穿示例：分层规则一段声明式代码描述全楼依赖方向；切片规则 `slices().matching("com.miaotea.(*)..").should().beFreeOfCycles()` 当场拆开循环依赖连体包；PlantUML 图中 `[Web] --> [Application]` 箭头即允许的依赖，图改规则跟着改。DSL 不够时用 DescribedPredicate（选谁）+ ArchCondition（判定）自定义，getAllInvolvedRawTypes 可拆开泛型套娃抓 Controller 直接返回 @Entity。

### 落地收益与避坑

收益：架构决策成为可执行文档、反馈左移到本地 mvn test、Code Review 回归设计讨论、重构有护栏与进度（快照行数）、新人首次提交即被教育、对 AI 生成代码一视同仁——跨层调用过不了规则就进不了主干。避坑：包名写错先查拼写而非 allowEmptyShould；记得 DoNotIncludeTests；规则必写 because；大项目用 DoNotIncludeJars、resolveMissingDependenciesFromClassPath=false 提速，`-Darchunit.junit.testFilter` 单跑一条，忽略用 @ArchIgnore 而非 @Disabled。

## 来源

- [架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁](https://mp.weixin.qq.com/s/eCRR1w1AWg1TvcNAnL21GA)（架构师Beata · 微信公众号；基于 ArchUnit 1.5.1，官方文档 archunit.org）

## 附件

无
