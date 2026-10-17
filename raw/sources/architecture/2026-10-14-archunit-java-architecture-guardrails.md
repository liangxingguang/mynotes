---
title: 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁
source: 架构师Beata（微信公众号）
source_url: https://mp.weixin.qq.com/s/eCRR1w1AWg1TvcNAnL21GA
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-17
inbox_ref: Archive/2026-10-14-archunit-java-architecture-guardrails.md
---

# 架构图不会报警，但 ArchUnit 会：给 Java 项目装一套架构门禁
Architecture Violation \[Priority: HIGH\]

Rule '白板上的架构图应当被遵守' was violated (3 times):

× OrderController 直接注入了 OrderMapper

× 领域对象 Order 依赖了 RestTemplate

× order 与 coupon 之间存在循环依赖

这条报错，本该在三个月前就出现。

ArchUnit 1.5.1 从入门到落地

先讲一个你大概率亲身经历过的故事。

项目启动那天，架构师在白板上画了四个方框：`web`、`application`、`domain`、`infrastructure`，箭头自上而下，干净得像刚拖过的地板。大家点头、拍照、存进 Wiki。

三个月后，你打开代码仓库：

*   `OrderController` 里直接注入了 `OrderMapper`，理由是"就查一个字段，没必要绕 Service"；
    
*   领域对象 `Order` 里 import 了 `RestTemplate`，因为"算价格要顺手调一下优惠券服务"；
    
*   `coupon` 依赖 `order`，`order` 又依赖 `coupon`，两个包像一对连体婴，谁也拆不开。
    

白板上的图还在 Wiki 里，但它已经从"设计图"变成了"遗照"。

这就是**架构腐化**：没有哪一次提交是罪魁祸首，每一次都"情有可原"，累积起来就面目全非。根源也很朴素——**架构约束只活在人的脑子里，而人会忘、会忙、会在周五下午四点五十分妥协。**

今天聊的 ArchUnit，就是专治这个病的：它把架构约束从脑子里搬进 CI，让违规代码连合并的机会都没有。本文基于目前最新的 **ArchUnit 1.5.1**（2026 年 9 月 25 日发布），从零讲到落地。

01

为什么需要 ArchUnit

先盘点一下，我们平时靠什么守护架构：

手段

擅长什么

管不住什么

架构文档 / Wiki

表达设计意图

没人读；读了也不会被强制执行

Code Review

设计合理性、业务语义

靠人的注意力，PR 一大只看得见 diff

Checkstyle / PMD

代码风格、局部坏味道

看不见"包与包之间"的关系

Sonar 类平台

复杂度、重复率等通用指标

不知道你们团队自己的架构约定

Maven 多模块 / JPMS

编译期强隔离

粒度粗、改造成本高，管不到命名和注解约定

每一种都有用，但它们之间有一条缝：**"我们团队约定的架构规则"没有一个自动、持续、低成本的执行者。**

ArchUnit 补的就是这条缝。它的思路一句话就能说清：**把架构约定写成单元测试。** 它读取编译后的字节码，把项目里所有类、方法、字段以及"谁调用了谁"建成一张依赖图，再用你写的规则去审这张图。违规了？测试变红，CI 拦截，代码合不进去。

💡 一句话定位

Checkstyle 管的是"字写得工不工整"，ArchUnit 管的是"承重墙有没有被人偷偷打掉"。

这种做法在《演进式架构》里有个专门的名字：**架构适应度函数（Fitness Function）**——用可执行、客观的检查，持续度量系统是否仍符合预期的架构特征。而 ArchUnit 可能是 Java 世界里实现它成本最低的方式：不用引入新平台，不用学新语言，会写 JUnit 就行。

02

认识 ArchUnit：它怎么"看"你的代码

ArchUnit 是 TNG Technology Consulting 维护的开源库，Apache 2.0 协议。理解它只需要抓住一条主线：

.class 字节码

编译产物，不是源码

▼

ClassFileImporter

导入并解析字节码

▼

JavaClasses

一张完整的类与依赖关系图

▼

ArchRule.check()

用规则审查这张图

▼

通过 ✅ 或 Architecture Violation ❌

报告精确到类和行号

几个值得架构师留意的特性：

*   **分析字节码而非源码**：Lombok 生成的代码、Kotlin 编译出的类都看得见；代价是必须先编译。
    
*   **能看见"访问"关系**：普通反射只知道类有哪些方法，ArchUnit 还知道方法里调用了谁、读写了谁的字段。
    
*   **不依赖类路径去执行规则**：规则判断全部基于导入的字节码，可以直接分析一个 JAR 或目录。
    

它的 API 分三层，后文会逐层用到：

层

作用

典型入口

Core

导入字节码，提供类似反射的领域模型

`ClassFileImporter`

、`JavaClass`

Lang

用流式 DSL 书写规则

`classes()`

、`noClasses()`、`methods()`

Library

开箱即用的"架构套餐"

分层、洋葱、切片、模块、冻结、度量

版本现状（截至 2026 年 9 月）

**1.5.1**（2026-09-25）是最新的补丁版本，以缺陷修复为主。真正的功能大版本是 **1.5.0**（2026-08-04），值得关注的变化有：

*   新增 `archunit-junit6` 模块，正式支持 JUnit 6；
    
*   支持 Java 27（class 文件主版本号 71）；
    
*   `JavaClass` 暴露密封类信息：`isSealed()` 与 `getPermittedSubclasses()`；
    
*   `catch` 语句里捕获的异常类型，现在也算作依赖；
    
*   新条件 `ArchConditions.haveAnyDependenciesThat(..)`；
    
*   `@AnalyzeClasses` 新增 `classes` 属性，可以精确指定要分析的单个类；
    
*   Lakos 架构度量的计算性能大幅提升，冻结规则的文本存储在并行测试下线程安全。
    

往前一点的 1.4.x 系列则带来了 Java 24/25/26 支持、`@AnalyzeClasses` 可作为元注解、新的通用规则 `OLD_DATE_AND_TIME_CLASSES_SHOULD_NOT_BE_USED`，以及切片规则支持优先级等。下文的示例会把这些新能力穿插进去。

03

五分钟上手：写下第一条规则

为了不和网上千篇一律的 `com.myapp` 撞车，我们虚构一个项目：**喵呜奶茶**的点单系统。包结构如下：

```
com.miaotea├── order                 // 订单上下文│   ├── web               // 点单窗口：Controller│   ├── application       // 店长：编排用例、管事务│   ├── domain            // 配方：订单、杯型、甜度等核心规则│   └── infrastructure    // 后厨设备：MyBatis、Redis、支付 SDK├── coupon                // 优惠券上下文└── member                // 会员上下文
```

第一步：加依赖

pom.xml

```
<!-- JUnit 6 项目 --><dependency>    <groupId>com.tngtech.archunit</groupId>    <artifactId>archunit-junit6</artifactId>    <version>1.5.1</version>    <scope>test</scope></dependency><!-- 还在用 JUnit 5：artifactId 换成 archunit-junit5 --><!-- JUnit 4：archunit-junit4；不想绑定任何测试框架：核心包 archunit -->
```

Gradle 用户一行搞定：

build.gradle

```
testImplementation 'com.tngtech.archunit:archunit-junit6:1.5.1'
```

第二步：写一条规则

Java

```
@AnalyzeClasses(packages ="com.miaotea",importOptions=ImportOption.DoNotIncludeTests.class)class MiaoTeaArchitectureTest{@ArchTeststaticfinalArchRuleweb_should_not_touch_infrastructure=noClasses().that().resideInAPackage("..web..").should().dependOnClassesThat().resideInAPackage("..infrastructure..").because("点单窗口要通过店长下单，不能自己冲进后厨开机器");}
```

为了让代码更紧凑，下文示例都省略了静态导入，常用的是这几个：

Java

```
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;        // classes()、noClasses()、methods()import static com.tngtech.archunit.library.Architectures.*;                 // layeredArchitecture()、onionArchitecture()import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;import static com.tngtech.archunit.library.modules.syntax.ModuleRuleDefinition.modules;import static com.tngtech.archunit.library.GeneralCodingRules.*;
```

规则本身就这么几行。`@AnalyzeClasses` 声明要分析哪些类，`@ArchTest` 标记规则。用 JUnit 5/6 时，ArchUnit 自带的测试引擎会自动发现并执行这些规则，还会缓存导入结果，多个测试类共用同一批类时不会重复解析。

第三步：看它报错

某天小李在 `OrderController` 里偷偷注入了 `OrderMapper`，跑测试：

测试输出

```
java.lang.AssertionError: Architecture Violation [Priority: MEDIUM] -Rule 'no classes that reside in a package '..web..' should depend on classesthat reside in a package '..infrastructure..', because 点单窗口要通过店长下单，不能自己冲进后厨开机器' was violated (1 times):Field <com.miaotea.order.web.OrderController.orderMapper> has type<com.miaotea.order.infrastructure.mybatis.OrderMapper> in (OrderController.java:0)
```

谁、在哪、违反了哪条规则、为什么不行——一次说清楚。比 Code Review 里一句"这里好像不太合适吧？"有说服力多了，而且小李被骂的对象是 CI，不是你，团队感情得以保全。

📌 另一种写法

规则除了写成字段，也可以写成方法：`@ArchTest static void rule(JavaClasses classes) { ... }`，适合需要先做点计算再断言的场景。如果不用 JUnit 集成，直接 `new ClassFileImporter().importPackages("com.miaotea")` 拿到 `JavaClasses`，再调用 `rule.check(classes)` 即可。

04

读懂规则语法：一个"主谓宾"句式

几乎所有 ArchUnit 规则都遵循同一个句式：

Java

```
// 选谁：classes() / noClasses() / methods() / fields() / codeUnits()classes()    // 筛选条件：可以用 .and() / .or() 继续拼接    .that().resideInAPackage("..domain..")    // 必须满足：可以用 .andShould() / .orShould() 追加    .should().onlyDependOnClassesThat().resideInAnyPackage("..domain..", "java..")    // 为什么：也可以用 .as("...") 整句改写规则描述    .because("领域层只能依赖自己和 JDK");
```

IDE 的自动补全就是最好的文档：敲完 `.that().` 按一下提示，所有能用的谓词都会列出来。这也是 ArchUnit 上手快的原因之一，你几乎不用背 API。

包匹配语法

规则里到处都是包名表达式，这套语法值得花一分钟记住：

写法

含义

例子

`..`

任意层级的包（可以是零层）

`..domain..`

 匹配所有包含 domain 段的包

`*`

恰好一段包名

`com.miaotea.*`

 只匹配下一级

`(*)`

一段包名，并捕获为分组

切片规则里当作切片名

`(**)`

任意层级，并捕获

需要按多层包切片时使用

`[a|b]`

二选一

`..[web|api]..`

注意一个细节：这些表达式匹配的是**类所在的包名**，而不是全限定类名。所以 `..OrderService` 匹配不到 `OrderService` 这个类，按类名筛选请用 `haveSimpleName(..)` 或 `haveNameMatching(..)`。

⚠️ 最隐蔽的坑：永远绿的测试

假设有人把 `..domain..` 重命名成 `..core..`，你那条"domain 不许依赖 Spring"的规则就一个类都筛不到了。一个什么都没检查却永远通过的测试，比没有测试更可怕——它还会让你很安心。ArchUnit 默认会让这种"should 作用于空集合"的规则直接失败。确实需要允许时，单条规则用 `.allowEmptyShould(true)`，全局可在 `archunit.properties` 里设置 `archRule.failOnEmptyShould=false`，但请先确认不是包名写错了。

05

基础规则工具箱：把团队约定翻译成代码

下面这几条都来自真实项目里反复出现的争论，翻译成代码之后，争论就结束了。

命名与位置

Java

```
@ArchTeststatic final ArchRule controllers_live_in_web =    classes().that().areAnnotatedWith(RestController.class)        .should().resideInAPackage("..web..")        .andShould().haveSimpleNameEndingWith("Controller");
```

事务边界 = 用例边界

Java

```
@ArchTeststatic final ArchRule transactions_belong_to_application =    methods().that().areAnnotatedWith(Transactional.class)        .should().beDeclaredInClassesThat().resideInAPackage("..application..")        .andShould().bePublic()        .because("事务由用例层统一编排，Controller 和 Mapper 不许私自开事务");
```

写在 private 方法上的 `@Transactional`，就像贴在冰箱里面的便利贴——写是写了，但没有人（也没有代理）看得见。

领域层不许自己看表

Java

```
@ArchTeststatic final ArchRule domain_uses_injected_clock =    noClasses().that().resideInAPackage("..domain..")        .should().callMethod(LocalDateTime.class, "now")        .orShould().callMethod(Instant.class, "now")        .because("'第二杯半价仅限周四'这种规则，测试时要能把时间拨到周四");
```

这条规则很小，但它逼着大家把 `Clock` 注入进来，领域逻辑从此可以被确定性地测试。

领域层保持"纯净"

Java

```
@ArchTeststatic final ArchRule domain_is_framework_free =    noClasses().that().resideInAPackage("..domain..")        .should().dependOnClassesThat().resideInAnyPackage(            "org.springframework..", "jakarta.persistence..", "org.apache.ibatis..")        .because("配方不应该关心用的是哪个牌子的封口机");
```

1.5.0 起，`catch` 语句捕获的异常类型也会被算作依赖。以前在领域代码里写一句 `catch (DataAccessException e)` 还能悄悄溜过去，现在同样会被抓住。

开箱即用的通用规则

`GeneralCodingRules` 里预置了一批几乎所有项目都适用的规则，直接引用即可：

Java

```
@ArchTest staticfinalArchRuleno_sysout=NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;@ArchTeststaticfinalArchRuleno_generic_exceptions=NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;@ArchTeststaticfinalArchRuleno_field_injection=NO_CLASSES_SHOULD_USE_FIELD_INJECTION;@ArchTeststaticfinalArchRuleno_jul=NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;@ArchTeststaticfinalArchRuleno_legacy_date= OLD_DATE_AND_TIME_CLASSES_SHOULD_NOT_BE_USED;
```

最后一条是 1.4.0 新增的，禁止使用 `java.util.Date`、`Calendar` 这类老式日期类。

06

架构级规则：一段代码描述整栋楼

前面的规则都是"点状"的，而 Library 层能让你用一段声明式代码描述整个架构风格。

分层架构

Java

```
@ArchTeststaticfinalArchRulelayers=layeredArchitecture().consideringOnlyDependenciesInLayers().layer("Web").definedBy("..web..").layer("Application").definedBy("..application..").layer("Domain").definedBy("..domain..").layer("Infrastructure").definedBy("..infrastructure..").whereLayer("Web").mayNotBeAccessedByAnyLayer().whereLayer("Application").mayOnlyBeAccessedByLayers("Web").whereLayer("Domain").mayOnlyBeAccessedByLayers("Application","Infrastructure").whereLayer("Infrastructure").mayNotBeAccessedByAnyLayer();
```

留意最后两行：`Infrastructure` 可以访问 `Domain`（去实现领域层定义的仓储接口），但谁也不许访问 `Infrastructure`——它由 Spring 在运行时装配进来。这就是依赖倒置，被一行代码钉死了。

第二行的 `consideringOnlyDependenciesInLayers()` 决定"哪些依赖算数"：只看层与层之间的依赖。另外两个选项是 `consideringAllDependencies()`（连 JDK 和三方库都算）和 `consideringOnlyDependenciesInAnyPackage(..)`（只看指定包）。

六边形 / 洋葱架构

如果你们走的是端口与适配器路线：

Java

```
@ArchTeststaticfinalArchRulehexagon=onionArchitecture().domainModels("..domain.model..").domainServices("..domain.service..").applicationServices("..application..").adapter("web","..adapter.web..").adapter("persistence","..adapter.persistence..").adapter("payment","..adapter.payment..");
```

它内置了几条铁律：领域不依赖应用层和任何适配器；应用层不依赖适配器；**适配器之间互不依赖**。支付适配器想偷看一眼持久化适配器的实现？红灯。

切片与循环依赖

Java

```
@ArchTeststaticfinalArchRuleno_cycles_between_contexts=slices().matching("com.miaotea.(*)..").should().beFreeOfCycles();@ArchTeststaticfinalArchRuledomains_are_independent=slices().matching("com.miaotea.(*).domain..").should().notDependOnEachOther();
```

`(*)` 捕获的那一段就是切片名，于是 `order`、`coupon`、`member` 各成一片。第一条规则保证上下文之间没有环，开头那对"连体婴"会被当场分开；第二条更严格，要求各上下文的领域层彼此完全独立。循环检测的规模可以用 `cycles.maxNumberToDetect` 等配置项控制。

模块化：给每个模块签一份"合同"

1.2.0 引入的 `modules()` API，适合在不拆 Maven 模块的前提下做模块化治理。先定义一个注解：

Java

```
@Retention(RetentionPolicy.RUNTIME)@Target(ElementType.PACKAGE)public@interfaceAppModule{Stringname();String[]allowedDependencies()default{};String[]exposedPackages()default{};}
```

在每个模块根包的 `package-info.java` 里签合同：

Java

```
@AppModule(name="Order",allowedDependencies={"Coupon","Member"},exposedPackages={"..order.api.."})packagecom.miaotea.order;
```

然后让 ArchUnit 当公证人：

Java

```
@ArchTeststatic final ArchRule modules_honor_their_contracts = modules()    .definedByAnnotation(AppModule.class)    .should().respectTheirAllowedDependenciesDeclaredIn("allowedDependencies",        consideringOnlyDependenciesInAnyPackage("com.miaotea.."))    .andShould().onlyDependOnEachOtherThroughPackagesDeclaredIn("exposedPackages");
```

合同写明了"我可以依赖谁"和"我对外只开放哪些包"。有人绕过 `order.api` 直接调用订单模块的内部类，规则立刻报警。如果你的项目是 Spring Boot，也可以了解一下 Spring Modulith，它的模块校验同样建立在 ArchUnit 之上。

让架构图本身成为规则

团队习惯用 PlantUML 画组件图？那张图可以直接变成测试：

```
@startuml[Web] <<..web..>>[Application] <<..application..>>[Domain] <<..domain..>>[Infrastructure] <<..infrastructure..>>[Web] --> [Application][Application] --> [Domain][Infrastructure] --> [Domain]@enduml
```

Java

```
@ArchTeststatic final ArchRule code_matches_the_diagram = classes().should(adhereToPlantUmlDiagram(    MiaoTeaArchitectureTest.class.getResource("/architecture/miaotea.puml"),    consideringOnlyDependenciesInDiagram()));
```

组件用 `<<包表达式>>` 作为构造型与代码关联，箭头就是允许的依赖方向。从此架构图不再是"遗照"，而是"执法依据"——图一改，规则跟着变。

07

自定义规则：当 DSL 不够说时

内置 DSL 覆盖不了的约定，就自己造。套路只有一个：

```
DescribedPredicate<T>   负责"选谁"ArchCondition<T>        负责"判定"，违规时 events.add(SimpleConditionEvent.violated(..))
```

案例一：Controller 不许把实体直接端给前端

Java

```
static finalArchCondition<JavaMethod>notExposeEntities=newArchCondition<>("not expose @Entity types in return values"){@Overridepublicvoidcheck(JavaMethodmethod,ConditionEventsevents){method.getReturnType().getAllInvolvedRawTypes().stream().filter(type->type.isAnnotatedWith(Entity.class)).forEach(entity->events.add(SimpleConditionEvent.violated(method,method.getFullName()+" 把实体 "+entity.getSimpleName()+" 直接端给了前端")));}};@ArchTeststaticfinalArchRulecontrollers_return_dtos=methods().that().arePublic().and().areDeclaredInClassesThat().areAnnotatedWith(RestController.class).should(notExposeEntities).because("实体是后厨的原料，DTO 才是封好口的那杯奶茶");
```

关键在 `getAllInvolvedRawTypes()`：它会把泛型签名拆开，所以 `ResponseEntity<List<Order>>` 这种"套娃"也藏不住里面的 `Order`。

案例二：密封状态机不许开后门（1.5.0 新能力）

订单状态用 `sealed interface OrderState permits Pending, Paid, Brewing, Delivered` 建模，本意是让编译器帮你检查状态穷举。可一旦有人把某个子类声明成 `non-sealed`，状态机就被开了个口子，谁都能往里塞新状态。1.5.0 开放了密封信息，现在可以把它管起来：

Java

```
static finalArchCondition<JavaClass>keepTheSealClosed=newArchCondition<>("only permit final or sealed subclasses"){@Overridepublicvoidcheck(JavaClasssealedType,ConditionEventsevents){for(JavaClasssub:sealedType.getPermittedSubclasses()){booleanclosed=sub.getModifiers().contains(JavaModifier.FINAL)||sub.isSealed();if(!closed){events.add(SimpleConditionEvent.violated(sealedType,sub.getName()+" 是 non-sealed，"+sealedType.getSimpleName()+" 的状态机被开了后门"));}}}};@ArchTeststaticfinalArchRuledomain_state_machines_stay_sealed=classes().that(DescribedPredicate.describe("are sealed",JavaClass::isSealed)).and().resideInAPackage("..domain..")        .should(keepTheSealClosed);
```

`record` 和普通 `final` 类都会被判定为"封闭"，只有 `non-sealed` 会被揪出来。

案例三：用例必须真的碰到领域（1.5.0 新条件）

有一种很常见的退化：`application` 层的用例类里没有任何领域对象，只是把请求参数拼成 SQL 丢给 Mapper。这种"传声筒"用例，业务规则全埋在 SQL 里。1.5.0 新增的 `haveAnyDependenciesThat` 正好用来识别它：

Java

```
@ArchTeststatic final ArchRule use_cases_must_touch_the_domain =    classes().that().resideInAPackage("..application..")        .and().haveSimpleNameEndingWith("UseCase")        .should(haveAnyDependenciesThat(dependencyTarget(resideInAPackage("..domain.."))))        .because("一个不碰领域模型的用例，大概率是把业务写进了 SQL");
```

用到的静态导入是 `ArchConditions.haveAnyDependenciesThat`、`Dependency.Predicates.dependencyTarget` 和 `JavaClass.Predicates.resideInAPackage`。以前表达"至少依赖一个 X"需要手写 `ArchCondition`，现在一行就够了。

08

老项目落地：别想一口吃成胖子

新项目加规则很爽，老项目加规则往往是这样的：一跑，三千个违规，团队集体沉默，然后有人提议"要不先把 ArchUnit 删了吧"。

冻结：既往不咎，下不为例

`FreezingArchRule` 是老项目落地的核心武器：

Java

```
@ArchTeststatic final ArchRule no_new_field_injection =    FreezingArchRule.freeze(NO_CLASSES_SHOULD_USE_FIELD_INJECTION);
```

archunit.properties

```
# src/test/resources/archunit.propertiesfreeze.store.default.path=src/test/resources/archunit_store# CI 上禁止创建新的快照，防止配置失误导致"一键赦免"freeze.store.default.allowStoreCreation=false
```

推荐的流程是这样的：

1.  本地第一次运行时加上 `-Darchunit.freeze.store.default.allowStoreCreation=true`，把现存违规记录成快照；
    
2.  把快照目录提交到 Git，它就是你们的"技术债台账"；
    
3.  之后 CI 只拦截**新增**违规，历史违规不再报错；
    
4.  每修掉一个历史违规，快照会自动缩小，想再加回去就会被拦住。
    

这是一个只进不退的棘轮：债务只会变少，不会变多。默认情况下行号变化不影响匹配，代码挪了位置也不会误报。1.5.0 还让默认的文本快照存储在并行测试下线程安全，放心开 JUnit 并行。

💡 台账的额外价值

快照文件的行数就是一个天然的技术债指标。每个迭代统计一次、画成折线图，比任何"我们很重视代码质量"的口号都有说服力。

其他几把小刀

*   **忽略模式**：在类路径根目录放一个 `archunit_ignore_patterns.txt`，每行一个正则，匹配到的违规被忽略。适合生成代码这类"真正的例外"，历史债务还是交给冻结更好。
    
*   **优先级**：`ArchRuleDefinition.priority(Priority.HIGH).noClasses()...`，报错信息会带上 `[Priority: HIGH]`，便于分级治理。
    
*   **引入顺序**：建议先上"领域纯净"和"无循环依赖"，再上分层规则，最后是命名、注解和自定义规则。先守住承重墙，再管墙纸颜色。
    

09

工程化：把规则变成团队的"架构 SDK"

当团队有十几个服务时，每个服务各写一套规则很快就会走样。更好的做法是把规则沉淀成一个公共 JAR，例如 `miaotea-arch-rules`。

规则库 + 元注解

1.4.0 起，`@AnalyzeClasses` 可以当元注解使用，公共配置写一次就行：

Java

```
@Retention(RetentionPolicy.RUNTIME)@Target(ElementType.TYPE)@AnalyzeClasses(packages = "com.miaotea", importOptions = {    ImportOption.DoNotIncludeTests.class, ImportOption.DoNotIncludeJars.class})public @interface AnalyzeMiaoTea {}
```

各服务只需要"订阅"需要的规则集：

Java

```
@AnalyzeMiaoTeaclass ArchitectureTest{@ArchTeststaticfinalArchTestslayers=ArchTests.in(LayerRules.class);@ArchTeststaticfinalArchTestsdomainPurity=ArchTests.in(DomainPurityRules.class);}
```

`LayerRules`、`DomainPurityRules` 就是放在规则库里、由 `@ArchTest` 字段组成的普通类。规则升级时，各服务升个版本号就同步了。

规则本身也需要测试

规则库成了基础设施，就得有自己的测试：准备一个故意违规的样例类，断言规则确实会报错。

Java

```
@Testvoidrule_catches_entity_leaking_controller(){JavaClassesclasses=newClassFileImporter().importClasses(LeakyController.class,Order.class);assertThrows(AssertionError.class,()->ControllerRules.controllers_return_dtos.check(classes));}
```

如果只想在 JUnit 集成里对某几个关键类单独跑一组更严格的规则，1.5.0 新增的 `@AnalyzeClasses(classes = {OrderFacade.class, PaymentFacade.class})` 可以精确到类，并且能和 `packages` 等属性组合使用。

性能与日常使用

*   **导入是最大开销**：JUnit 集成会按导入位置缓存结果，尽量让多个测试类使用相同的导入配置，缓存才能复用。
    
*   **排除 JAR 和测试类**：`DoNotIncludeJars`、`DoNotIncludeTests` 能显著缩小导入范围。1.5.0 起后者也认识 Gradle 自定义 source set 里的测试。
    
*   **超大项目提速**：`resolveMissingDependenciesFromClassPath=false` 不再从类路径补全三方类，速度快很多，代价是这些类只剩"桩"，注解等信息会缺失。
    
*   **只跑一条规则**：`-Darchunit.junit.testFilter=layers`，调试时很方便。
    
*   **更易读的报告**：`junit.displayName.replaceUnderscoresBySpaces=true`，测试报告里 `web_should_not_touch_infrastructure` 会显示成空格分隔的句子。
    
*   **忽略规则**：对 `@ArchTest` 来说 JUnit 的 `@Disabled` 不生效，要用 ArchUnit 的 `@ArchIgnore`。
    

顺手量一量架构

Library 层还提供了架构度量，比如 John Lakos 的累积组件依赖指标，1.5.0 对它的计算做了大幅提速：

Java

```
MetricsComponents<JavaClass> components =    MetricsComponents.fromPackages(classes.getPackage("com.miaotea").getSubpackages());LakosMetrics metrics = ArchitectureMetrics.lakosMetrics(components);System.out.println("ACD = " + metrics.getAverageComponentDependency());
```

平均组件依赖（ACD）越高，说明组件之间牵扯越多。每次发版记一笔，架构是在变好还是变坏，一目了然。

10

用了之后，到底赚到了什么

说了这么多，落到团队身上，收益主要是这几条：

*   **架构决策变成可执行文档**：规则加上 `because`，就是一份永不过期的架构说明书。Wiki 会过时，测试不会，因为过时的测试会变红。
    
*   **反馈左移到分钟级**：违规在本地 `mvn test` 就暴露，而不是在三个月后的重构评审会上。
    
*   **Code Review 回归本职**：机器管"能不能"，人讨论"好不好"。评审者不用再兼职当依赖警察。
    
*   **重构有护栏**：拆模块、换 ORM、迁移六边形架构时，规则会告诉你还有多少"钢筋"没切断，冻结快照告诉你进度。
    
*   **新人上手更快**：第一次提交就被规则"教育"，比读五十页 Wiki 有效，而且批评来自 CI，不伤感情。
    
*   **AI 编码时代的护栏**：如今相当一部分代码出自 AI 助手和编码智能体，它们写得飞快，也常常"很有创意"地跨层调用。ArchUnit 对人和 AI 一视同仁，不管代码是谁写的，过不了规则就进不了主干。
    

当然也要算成本：规则本身是代码，需要维护。别把 ArchUnit 写成一本三百条的交通法规，**只固化那些"被违反了真的会痛"的约定**，规则少而硬，才有人愿意遵守。

11

避坑清单

*   **包名写错**：规则筛不到类会触发空 should 失败。别急着 `allowEmptyShould(true)`，先检查拼写。
    
*   **忘了排除测试类**：测试代码里各种"违规"会把真正的问题淹没，记得加 `DoNotIncludeTests`。
    
*   **字节码的盲区**：编译期常量（`static final` 的基本类型和字符串）会被编译器内联，引用关系在字节码里消失；反射和 Spring 在运行时的动态调用，ArchUnit 同样看不见。
    
*   **规则没有写 because**：半年后没人记得为什么有这条规则，下一步就是被删掉。
    
*   **一次性全量开启**：老项目请务必配合冻结，否则 ArchUnit 活不过第一个迭代。
    

END

写在最后

架构不是画出来的，是守出来的。

ArchUnit 不会替你设计架构，也不会让烂设计变好。但它能保证一件事：你在白板上画下的那几个方框和箭头，三个月后、三年后，依然认得出来。

最后附上一张速查表，建议收藏：

场景

依赖坐标（版本 1.5.1）

JUnit 6

`com.tngtech.archunit:archunit-junit6`

JUnit 5

`com.tngtech.archunit:archunit-junit5`

JUnit 4

`com.tngtech.archunit:archunit-junit4`

其他测试框架 / 纯 Java

`com.tngtech.archunit:archunit`

官方文档：archunit.org；源码与示例：GitHub 上的 TNG/ArchUnit 与 TNG/ArchUnit-Examples。

_本文示例基于 ArchUnit 1.5.1 编写，"喵呜奶茶"项目纯属虚构，如有雷同，说明你们家也该上 ArchUnit 了。_