---
id: 2026-10-31-spring-interview-11-high-freq-topics
title: Spring 面试 11 大高频考点全解：从 IOC/AOP 到事务失效与事件机制
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/SpHaBjO13VfcQap34ajgDg
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 课程
  - 工程实践
asset_ref: Assets/2026-10/weixin-20261031-SpHaBjO13VfcQap34ajgDg.md
wiki_status: pending
---

# Spring 面试 11 大高频考点全解：从 IOC/AOP 到事务失效与事件机制

> 摘要：Spring 面试八股总纲，11 大考点：BeanFactory vs ApplicationContext、IOC、DI、AOP、Spring MVC、`refresh()` 十二步、Bean 生命周期、三级缓存、JDK vs CGLIB、事务传播与隔离级别、事务失效 10 场景、`@Autowired` vs `@Resource`、事件机制。每个考点配对比表与面试话术。主线：Spring 高级能力全落在 `BeanPostProcessor` 扩展点；三级缓存存在的根本理由是让 AOP 代理在循环依赖时保持一致。

## 核心要点

- **容器**：`BeanFactory` 懒加载、需手动注册 BPP（`@Autowired` 可能不生效）；`ApplicationContext` 是超集、预加载单例、自动注册，生产唯一选择。差异仅针对单例。
- **IOC/DI**：IOC 是思想、DI 是实现。注入优先级：构造器 > Setter > 字段。DI 本质是反射实现的对象工厂，真正注入在 `populateBean()`，依赖缺失会递归 `getBean()` 联动创建。
- **AOP**：动态代理 + 拦截器链，执行序 `Around前→Before→目标→AfterReturning/Throwing→After→Around后`。只拦 public；**自调用不走代理，切面失效**。Boot 2.x 起默认强制 CGLIB。
- **JDK vs CGLIB**：前者需接口、代理对象是接口类型；后者基于 ASM 继承，不能代理 final、需无参构造。JDK 8+ 性能持平，能用 JDK 就用。
- **`refresh()` 十二步**：BFPP 阶段处理 `@Configuration` 等注解 → `onRefresh` 启动嵌入式 Tomcat → `finishBeanFactoryInitialization` 实例化单例并生成 AOP 代理 → `finishRefresh` 发 `ContextRefreshedEvent`。异常时销毁 Bean + 取消刷新，容器不可用。
- **Bean 生命周期**：实例化 → 属性赋值 → 初始化（`@PostConstruct`→`InitializingBean`→init-method，顺序固定）→ 销毁。AOP 诞生于 `postProcessAfterInitialization`；原型 Bean 不销毁需自行释放。
- **三级缓存**：一级成品 / 二级早期引用 / 三级 `ObjectFactory`。两级在无 AOP 时够用；三级为延迟代理生成，否则 B 持有原始对象 → 事务失效。构造器注入与多例无法解决。
- **事务**：传播管范围（`REQUIRED` 默认 / `REQUIRES_NEW` 独立 / `NESTED` 子事务依赖 savepoint，仅 JDBC 支持），隔离管干净度（MySQL 默认 RR、Oracle 默认 RC，Spring 设置要与数据库对齐）。生产建议 RC + REQUIRED。
- **事务失效**：前 4 种占 90% —— 同类 this 调用、吞异常、未配 `rollbackFor`、非 public。口诀：public 加注解，同类绕路；异常莫吞，rollbackFor 看清。
- **注入注解**：`@Autowired` Spring 专属、先 byType；`@Resource` JSR-250、先 byName、不支持 `@Primary` 与构造器注入。
- **事件机制**：观察者模式，**默认同步**。慢监听器会阻塞发布；某监听器抛异常后续不执行（配 `ErrorHandler`）；事务回滚但事件已处理 → 用 `@TransactionalEventListener(AFTER_COMMIT)`。监听器首选 `@EventListener`。


## 正文

> 采集说明：原文约 5.8 万字符、11 个大章节，已按章节分段阅读后归并。抓取时**配图全部未加载**（残留 1px SVG 占位符），且部分代码块被压成单行、表格字段错位；概念性结论与参数完整可读，需逐行代码请看原文。

**一、BeanFactory 与 ApplicationContext**：本质区别是"容器能力"与"初始化策略"。比喻：发动机裸机 vs 整车交付；按需点餐 vs 提前备菜。继承关系上 ApplicationContext 间接继承 BeanFactory，是超集。仅在资源极度受限（嵌入式、移动端）才用 BeanFactory。

**二、Spring IOC 原理**：IOC 是设计思想非技术实现，把对象创建、依赖管理、生命周期控制权交给容器；DI 是其具体实现手段（"减肥是思想，跑步是实现"）。容器两接口：`BeanFactory`（`DefaultListableBeanFactory` 实现）与 `ApplicationContext`（`AnnotationConfigApplicationContext`、`ClassPathXmlApplicationContext`）。完整流程：配置解析 → 生成 `BeanDefinition` → `BeanFactoryPostProcessor` 在实例化前改 BeanDefinition → 实例化 → 属性填充 → `BeanPostProcessor` 前后置增强（AOP 代理在此生成）→ 入单例池。作用域：singleton（默认）/prototype/request/session/application。

**三、Spring DI 原理**：Bean 出生四步——① 反射 `Constructor.newInstance()` 实例化（毛坯房）② **属性填充（DI 真正发生处）**③ 初始化 ④ 成品入一级缓存。`@Autowired` 工作原理：容器启动时 `AutowiredAnnotationBeanPostProcessor` 扫描注解 → 创建 Bean 时拦截 → 反射定位依赖类型 → 从 BeanFactory 查找 → 反射注入。

**四、Spring AOP 原理**：解决横切关注点（日志、事务、权限、监控）与业务逻辑的耦合。核心术语：连接点（Spring 仅支持方法级）、切点（`execution(* com.example.service.*.*(..))`）、5 种通知、切面=切点+通知、织入（Spring 为运行时织入）。JDK 代理用 `Proxy.newProxyInstance()` + `InvocationHandler`；CGLIB 用 `Enhancer` + `MethodInterceptor` + `invokeSuper()`。

**五、Spring MVC 原理**：基于 Servlet 的前端控制器模式。核心组件 6 个：`DispatcherServlet`（总指挥）、`HandlerMapping`（查地图）、`HandlerAdapter`（适配器模式跑腿）、Handler/Controller、`ViewResolver`、View；另 3 个辅助组件：`MultipartResolver`、`LocaleResolver`、`ThemeResolver`。`@ResponseBody`/`@RestController` 走 `HandlerMethodReturnValueHandler` + `HttpMessageConverter`，按 `Accept` 头做内容协商直接序列化写响应，绕开视图解析。拦截器 vs 过滤器：拦截器属 Spring MVC、能拿到 Handler/ModelAndView/Spring Bean、可拦到具体 Controller 方法；过滤器属 Servlet 规范、只有 request/response、只能按 URL 模式匹配。Boot 中 `DispatcherServletAutoConfiguration` 自动注册，映射路径 `/`。

**六、`refresh()` 全流程**：见上方要点，逐步骤详解含 `prepareRefresh`（校验必需属性，`@Value("${db.url}")` 无默认值未配置直接抛异常）、`obtainFreshBeanFactory`（销毁旧工厂 + 建 `DefaultListableBeanFactory` + 加载全部 BeanDefinition）、`prepareBeanFactory`（注册 `ApplicationContextAwareProcessor`、忽略若干 Aware 接口的自动注入、把 ApplicationContext 自身注册为单例）、`invokeBeanFactoryPostProcessors`（超级核心）、`registerBeanPostProcessors`（只注册不执行）、`onRefresh`（Boot 嵌入式 Tomcat）、`finishBeanFactoryInitialization`（单例雪崩 + AOP 织入）、`finishRefresh`（`LifecycleProcessor` + `start()` + `ContextRefreshedEvent`，Boot 的 `ApplicationReadyEvent` 在其后）。高频考点表：BFPP vs BPP 的区别、AOP 代理在哪步生成（第 11 步）、Tomcat 在哪步启动（第 9 步）、懒加载 Bean 何时初始化（首次 `getBean()`）、为何加 synchronized、refresh 抛异常的后果。

**七、Bean 生命周期**：四字真言（实例化/属性赋值/初始化/销毁）只是骨架，灵魂在扩展点。实例化阶段"无参构造优先"，没有则抛异常；属性赋值阶段解决循环依赖；初始化三式顺序固定且各有定位（`@PostConstruct` 不依赖 Spring 更可移植，`InitializingBean` 是 Spring 内置，init-method 是早期兼容）；销毁三式与初始化一一对应。扩展点执行顺序表：实例化前 `InstantiationAwareBeanPostProcessor` → 属性赋值（DI）→ Aware 回调 → 初始化前 BPP → 初始化三步 → **初始化后 BPP（AOP 诞生地）** → 销毁三步。

**八、三级缓存解循环依赖**：见上方要点。补充：Spring **默认仅支持单例 Bean 的 setter 注入循环依赖**；不支持构造器注入与多例 Bean。"半成品"指已 new 出来但 `@Autowired` 尚未填充。面试浓缩版回答五步走（实例化 A→工厂入三级→建 B→B 从三级拿 A 工厂生成早期引用入二级→B 入一级→A 注入成品 B 后入一级）。

**九、JDK vs CGLIB 动态代理**：实现方式（实现接口 vs 继承类）、要求（必须有接口 vs 不能 final）、底层（反射 API vs ASM 字节码）、方法限制（只代理接口方法 vs 不能代理 final 方法）、生成速度（JDK 快）、调用速度（JDK 8+ 基本持平）、是否内置、Spring 策略（有接口→JDK，无接口→CGLIB，可 `proxyTargetClass=true` 强制）。深坑：JDK 代理对象是接口类型，`instanceof` 实现类为 false，会在依赖注入时产生迷惑。避坑：`@Configuration` 类内 `this.xxx()` 调用会让 `@Bean` 方法代理失效（需 `proxyBeanMethods=false` 或抽配置类）；CGLIB 需无参构造；JDK 9+ 模块化后需开放反射权限否则 `InaccessibleObjectException`。

**十、事务传播与隔离级别**：并发事务三大问题——脏读（读未提交）、不可重复读（同行两次读结果不同）、幻读（同条件两次查询行数不同）。5 种隔离级别 + MySQL/Oracle 默认对照。场景举例：报表统计用 `READ_COMMITTED`、库存扣减用 `REPEATABLE_READ` + 乐观锁、转账状态校验用 `SELECT ... FOR UPDATE` 而非 `SERIALIZABLE`。陷阱：REQUIRES_NEW 主事务回滚不会自动回滚已提交子事务，需自行补偿；MySQL RR 下间隙锁高并发写可能死锁，要缩小锁定范围。

**十一、事务失效 10 场景**：见上方要点。分类图三类：① 根本没进代理（非 public、final/static、同类 this 调用、类未被 Spring 管理）② 进了代理但异常没触发回滚（吞异常、受检异常未声明 rollbackFor、传播属性错误）③ 资源或环境问题（MyISAM 引擎、多线程线程绑定、嵌套事务外层不回滚）。避坑速查表给出 each 错误做法对应的正确做法。习惯建议：写事务方法先确认 public 与 rollbackFor，写完后用单测验证回滚；复杂场景优先**编程式事务**（`TransactionTemplate`），比声明式更灵活也更好排查。

**十二、`@Autowired` 与 `@Resource`**：见上方要点。多类型 Bean 时：`@Autowired` 直接抛 `NoUniqueBeanDefinitionException`，需 `@Qualifier`；`@Resource` 先按字段名匹配，匹配不到再按类型，多个同类型同样报错。`@Resource(name="xxx")` 与 `@Autowired + @Qualifier("xxx")` 99% 场景一致，唯一区别是前者找不到直接报错不回退类型。

**十三、事件机制与监听器**：见上方要点。三大角色 + 广播器；执行流程：`publishEvent` → 广播器 → 按注册顺序同步调用（配线程池则异步）→ `@TransactionalEventListener` 暂存到 `TransactionSynchronization` 回调时执行。适用：主流程后异步发通知/打日志/数据同步、模块极度解耦、需事务保障的后续操作。别用：需要立刻拿返回值的强依赖逻辑、监听器过多导致流程不可控难排查。

## 来源

- 原文：<https://mp.weixin.qq.com/s/SpHaBjO13VfcQap34ajgDg>

## 附件

- [[Assets/2026-10/weixin-20261031-SpHaBjO13VfcQap34ajgDg.md]]
