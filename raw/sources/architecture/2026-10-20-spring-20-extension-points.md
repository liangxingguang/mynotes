---
title: Spring 留了 20 个扩展点，你能按顺序说出几个？
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/50HiCXoigRgyugQLAfmzHA"
source_type: link
platform: 微信
captured: 2026-10-20
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-20-spring-20-extension-points.md
asset_ref: Assets/2026/10/spring-20-extension-points.md
---

# Spring 留了 20 个扩展点，你能按顺序说出几个？

# Spring 留了 20 个扩展点，你能按顺序说出几个？

> 抓取正文（web-fetch, browser 级）。原始出处：https://mp.weixin.qq.com/s/50HiCXoigRgyugQLAfmzHA
>
> 注：原文代码块抓取时被压成单行，已按语义重排。

> 面试官问：「Spring 有哪些扩展点？」大多数人的回答是一串名词：`BeanPostProcessor`、`ApplicationListener`、`ImportSelector`、`InitializingBean`……名字能报出来七八个。
> 面试官接着问：「那它们的执行顺序呢？`@PostConstruct` 和 `afterPropertiesSet` 谁先谁后？`BeanPostProcessor` 里为什么不能直接注入别的 Bean？」到这里，能答上来的人就少了。
> 扩展点这个知识点，**考的不是"有哪些"，而是"什么时候被调"**。这篇就把它们全部挂到容器启动的时间轴上，一次理清。

## 一、为什么扩展点必须按"顺序"记

先看一段几乎每个人都会写的代码：

```java
@Component
public class MyBeanPostProcessor implements BeanPostProcessor {
    @Autowired
    private UserService userService;      // 启动时可能拿到 null
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        userService.doSomething();        // 一执行就 NPE
        return bean;
    }
}
```

这段代码逻辑完全正确，但启动就报空指针。原因不在写法，而在**时机**：`BeanPostProcessor` 必须在所有普通 Bean 之前被创建（因为普通 Bean 的初始化要靠它），可它自己却想注入一个普通 Bean——**时序上不可能**。

这就是扩展点的本质：**Spring 启动是一条单向时间线，扩展点是时间线上预留的插桩点。插错了位置，逻辑再对也不生效。**

所以与其背名字，不如记时间轴。整条线可以粗分成五段：

| 阶段 | 做什么 | 类比 |
|---|---|---|
| **定义期** | 改"图纸"：Bean 还没造，改的是 BeanDefinition | 改设计图 |
| **实例化期** | 造"零件"：创建对象、填充属性 | 造零件 |
| **初始化期** | 装"零件"：执行初始化方法、生成代理 | 组装 |
| **就绪期** | 通电"运行"：所有单例就绪，应用可用 | 通电 |
| **销毁期** | 拆"零件"：释放资源 | 断电 |

## 二、时间轴总图

```
容器启动
│  ├─【定义期】─────────────────────────────────────────────
│  ① ApplicationContextInitializer        refresh() 之前
│  ② ApplicationListener（早期事件）      StartingEvent / EnvironmentPreparedEvent
│  ③ BeanDefinitionRegistryPostProcessor  往容器里"加图纸"
│  ④ BeanFactoryPostProcessor             改已有"图纸"（占位符解析）
│  ⑤ ImportSelector                       按条件挑一批配置类
│  ⑥ DeferredImportSelector               延迟到最后挑（自动配置让位）
│  ⑦ ImportBeanDefinitionRegistrar        手动注册 BeanDefinition
│  ⑧ FactoryBean                          把对象创建过程交给工厂
│  ├─【实例化期】（对每个 Bean 重复）───────────────────────
│  ⑨ postProcessBeforeInstantiation       可截胡，返回对象就短路
│  ⑩ determineCandidateConstructors       决定用哪个构造器
│  ⑪ postProcessMergedBeanDefinition      收集 @Autowired 注入点
│  ⑫ postProcessAfterInstantiation        可跳过属性填充
│  ⑬ postProcessProperties                完成属性注入（@Autowired 生效）
│  ⑭ Aware 接口家族                       回调容器相关对象
│  ├─【初始化期】──────────────────────────────────────────
│  ⑮ postProcessBeforeInitialization      @PostConstruct 在这一步触发
│  ⑯ InitializingBean#afterPropertiesSet
│  ⑰ 自定义 init-method
│  ⑱ postProcessAfterInitialization       AOP 代理在这里生成
│  ├─【就绪期】────────────────────────────────────────────
│  ⑲ SmartInitializingSingleton           所有单例创建完毕
│  ⑳ ContextRefreshedEvent / ApplicationReadyEvent
│  └─【销毁期】DisposableBean / @PreDestroy / destroy-method
```

**这张图就是本篇的全部内容。** 下面逐段展开。

## 三、定义期（1~8）：改图纸的阶段

这个阶段最容易被忽略，但它是**框架级扩展能力最强的地方**——Spring Boot 的自动配置、MyBatis 的 Mapper 扫描、`@EnableXxx` 系列注解，全部建立在这一段。

### ① ApplicationContextInitializer

在 `refresh()` **之前**调用，拿到的 `ConfigurableApplicationContext` 还只是个空壳。典型用途是**往里塞环境变量**：

```java
public class MyInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override
    public void initialize(ConfigurableApplicationContext ctx) {
        // 此时 BeanFactory 还没开始工作，只能操作 Environment
        ctx.getEnvironment().getPropertySources().addFirst(
            new MapPropertySource("mySource", Map.of("app.region", "cn-hangzhou"))
        );
    }
}
// 注册方式一：Spring Boot 里写进 META-INF/spring.factories
// 注册方式二：SpringApplication 编程式添加 app.addInitializers(new MyInitializer());
```

**它和 `BeanFactoryPostProcessor` 的分界**：Initializer 操作的是 `Environment`（配置来源），BFPP 操作的是 `BeanDefinition`（Bean 的图纸）。一个改"输入"，一个改"配方"。

### ② ApplicationListener + 早期事件

`ApplicationListener` 是贯穿整个生命周期的扩展点，最早的一批事件发生在容器创建之前——**这是 Spring Boot 独有的能力**：

| 事件 | 触发时机 |
|---|---|
| `ApplicationStartingEvent` | `SpringApplication.run()` 刚进来，环境都没准备好 |
| `ApplicationEnvironmentPreparedEvent` | `Environment` 就绪，配置文件已加载 |
| `ApplicationContextInitializedEvent` | Initializer 执行完 |
| `ApplicationPreparedEvent` | BeanDefinition 加载完，Bean 还没实例化 |
| `ApplicationStartedEvent` | 容器 refresh 完成 |
| `ApplicationReadyEvent` | 应用完全就绪（**最常用**） |

写法上两种都可以：实现 `ApplicationListener<ApplicationReadyEvent>` 接口，或用 `@EventListener(ApplicationReadyEvent.class)` 注解（更简洁）。

### ③ BeanDefinitionRegistryPostProcessor

Spring 里**能新增 BeanDefinition** 的扩展点。它比下面的 BFPP 更早执行，因为它要先把"图纸"放进去。

```java
public class MyRegistryPostProcessor implements BeanDefinitionRegistryPostProcessor {
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        BeanDefinitionBuilder builder = BeanDefinitionBuilder
            .genericBeanDefinition(OrderService.class)
            .addPropertyReference("userService", "userService");
        registry.registerBeanDefinition("orderService", builder.getBeanDefinition());
    }
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        // 此时所有 BeanDefinition 都已就绪，可以做一些检查
    }
}
```

**典型应用**：MyBatis 的 `MapperScannerConfigurer` 就是靠它把一堆 Mapper 接口注册成 `FactoryBean`（对应第 ⑧ 个扩展点）。

### ④ BeanFactoryPostProcessor

"改已有图纸"的钩子，最经典的用途是**占位符解析**：

```java
public class MyBeanFactoryPostProcessor implements BeanFactoryPostProcessor {
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory bf) {
        for (String name : bf.getBeanDefinitionNames()) {
            BeanDefinition def = bf.getBeanDefinition(name);
            // 可以在这里修改 def 的属性、作用域、延迟加载标志等等
        }
    }
}
```

Spring 内置的 `PropertySourcesPlaceholderConfigurer` 就是它——把 `${db.url}` 这类占位符替换成真实值。**这就是为什么 `@Value("${xxx}")` 能拿到配置文件的值**，替换动作发生在"图纸"阶段，而不是实例化阶段。

### ⑤ ImportSelector 与 ⑥ DeferredImportSelector

`@Import` 是配置类的"导入开关"，而 `ImportSelector` 让它变成**动态的**——根据条件返回要导入的类名数组。

```java
public class MyFeatureSelector implements ImportSelector {
    @Override
    public String[] selectImports(AnnotationMetadata importingClassMetadata) {
        boolean enabled = (boolean) importingClassMetadata
            .getAnnotationAttributes(EnableMyFeature.class.getName()).get("value");
        return enabled
            ? new String[]{"com.example.MyFeatureAutoConfiguration"}
            : new String[0];
    }
}
```

**`DeferredImportSelector` 是关键的那一个。** 两者的区别只有一个字：**时机**。

```
ImportSelector（普通）  └─ 被 @Import 后立即处理，返回的配置类马上参与解析
DeferredImportSelector（延迟）
  └─ 等所有普通配置类都解析完，最后才处理
      └─ 因此它可以"看到"用户已经定义了什么，从而决定自己要不要退让
```

**为什么自动配置必须用它？** 因为自动配置几乎每条都带 `@ConditionalOnMissingBean`——意思是"你没配我才配"。要实现这个语义，就必须等**用户的配置先解析完**，否则根本不知道用户配没配。这就是 `@ConditionalOnMissingBean` 能生效的机制基础。

```
用户配置类解析完
      │
      ▼
DeferredImportSelector（AutoConfigurationImportSelector）开始处理
      ├─ 读 META-INF/.../AutoConfiguration.imports 拿到候选清单
      ├─ 去重 + 排掉用户 exclude 的
      ├─ 条件过滤：@ConditionalOnClass / @ConditionalOnMissingBean …
      └─ 只把"通过条件"的配置类导入
```

### ⑦ ImportBeanDefinitionRegistrar

比 Selector 更进一步的钩子——不仅能选，还能**直接操作注册表**：

```java
public class MyRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata metadata,
                                        BeanDefinitionRegistry registry) {
        Map<String, Object> attrs = metadata
            .getAnnotationAttributes(EnableMyFeature.class.getName());
        String[] packages = (String[]) attrs.get("basePackages");
        for (String pkg : packages) {          // 按包扫描并注册（MyBatis / Feign 的套路）
            doScanAndRegister(pkg, registry);
        }
    }
}
```

`@MapperScan`、`@EnableFeignClients`、`@EnableAspectJAutoProxy` 这些注解背后都是它。

### ⑧ FactoryBean

严格说它不是"回调"，而是"接管对象创建过程"的扩展点——`getBean("myFactoryBean")` 拿到的其实是 `getObject()` 的返回值，而不是工厂本身。

```java
@Component
public class MyFactoryBean implements FactoryBean<Connection> {
    @Override
    public Connection getObject() {
        return createConnection();   // 复杂对象的组装逻辑（连接池、代理、聚合对象）
    }
    @Override
    public Class<?> getObjectType() { return Connection.class; }
    @Override
    public boolean isSingleton() { return true; }
}
```

MyBatis 的 Mapper 接口就是这样被"造"出来的——接口没法实例化，交给 `MapperFactoryBean` 动态生成。**区分方法**：想拿工厂本身，用 `&myFactoryBean`（前缀 `&`）。

## 四、实例化期（9~14）：造零件的阶段

从这一段开始，扩展点变成 **`BeanPostProcessor` 的子接口**。它们的共同特征是：**每个 Bean 创建时都会被调用一次**。

这一段的完整时序（本文最重要的一张图）：

```
createBean(beanName)
│  ├─ ⑨ postProcessBeforeInstantiation
│     └─ 若返回非 null → 直接短路，后面的流程全跳过
│  ├─ doCreateBean
│     │
│     ├─ ⑩ determineCandidateConstructors      选构造器（@Autowired 构造器在这）
│     ├─ 反射/工厂实例化 → 得到一个"裸对象"
│     ├─ 存入三级缓存 singletonFactories（提前暴露引用，为解决循环依赖）
│     ├─ ⑪ postProcessMergedBeanDefinition     扫描 @Autowired/@Value，缓存注入点
│     ├─ ⑫ postProcessAfterInstantiation       返回 false 可跳过属性填充
│     ├─ ⑬ postProcessProperties               执行属性注入 ← @Autowired 真正生效
│     ├─ ⑭ Aware 回调                          注入 BeanName / BeanFactory / ApplicationContext
│     │
│     ├─ ⑮ postProcessBeforeInitialization
│     ├─    @PostConstruct（由 CommonAnnotationBeanPostProcessor 在这一步触发）
│     ├─    ⑯ afterPropertiesSet
│     ├─    ⑰ 自定义 init-method
│     ├─ ⑱ postProcessAfterInitialization      ← AOP 代理在此生成
│     │
│     └─ 注册进 singletonObjects、清空三级缓存
│  └─ 返回（可能是代理对象，也可能被 ⑨ 截胡）
```

### ⑨ postProcessBeforeInstantiation：唯一能"截胡"的钩子

```java
public interface InstantiationAwareBeanPostProcessor extends BeanPostProcessor {
    default Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) {
        return null;  // 返回 null 表示"我不管，你继续"
    }
}
```

**返回非 null 的后果很严重**：Spring 会认为"这个对象已经造好了"，**跳过后面所有的实例化、属性填充、初始化流程**，直接进入 `postProcessAfterInitialization`。

AOP 就是靠它实现"返回代理对象"的一种路径（`AbstractAutoProxyCreator` 用它做 `TargetSource` 场景）。理解它的意义在于：**如果你看到某个 Bean 的 `@Autowired` 莫名其妙没生效，先查有没有 BPP 在这里"截胡"了。**

### ⑩ determineCandidateConstructors：决定用哪个构造器

`@Autowired` 标注在构造器上时，就是由 `AutowiredAnnotationBeanPostProcessor` 在这里告诉 Spring"用这一个"。没有它，Spring 只能按默认策略（无参构造器 / 唯一的构造器）来选。

### ⑪ postProcessMergedBeanDefinition：收集注入点

它做的事很"幕后"但很关键：**扫描类上所有 `@Autowired`、`@Value`、`@Resource` 标注的字段和方法，把结果缓存到 `InjectionMetadata` 里**。

**为什么要提前收集？** 因为下一步 `postProcessProperties` 需要"注入点清单"，而每次去反射扫描很慢，缓存一次就够了。这也是**循环依赖能解决的前提之一**——提前暴露引用时，属性注入所需的信息已经准备就绪。

### ⑫ postProcessAfterInstantiation：能"跳过"属性填充

返回 `false` → 跳过本次 bean 的所有属性填充。正常情况没人会返回 `false`，但知道它能做这件事，能帮你解释"为什么某个 Bean 的字段一直是 null"。

### ⑬ postProcessProperties：`@Autowired` 真正生效的地方

**这是 `@Autowired` 生效的确切位置。** 前面 ⑪ 收集了注入点，这里拿着清单去容器里找对应的 Bean 并注入。

理解这一点能解释一个常见现象：**为什么在 `@PostConstruct` 里能拿到注入的字段，而在构造器里不行**——构造器执行时还在第 ⑩ 步，属性注入（第 ⑬ 步）还没开始。

### ⑭ Aware 接口家族

属性注入完成后，Spring 会回调一系列 `Aware` 接口，把容器自己的能力"交给"你的 Bean：

| 接口 | 拿到什么 | 调用时机 |
|---|---|---|
| `BeanNameAware` | 自己在容器里的名字 | 最早 |
| `BeanClassLoaderAware` | 类加载器 | 紧随其后 |
| `BeanFactoryAware` | `BeanFactory` | 之后 |
| `EnvironmentAware` | `Environment` | 之后 |
| `ApplicationContextAware` | `ApplicationContext` | 最后 |

**顺序可以用"由近及远"来记**：先知道"我叫什么"，再知道"谁在管我"（BeanFactory），最后才能拿到"整个容器"（ApplicationContext）——因为拿到 ApplicationContext 意味着你可以 `getBean()` 任何东西了，必须是最后一步。

`ApplicationContextAwareProcessor` 是执行者，它在 `postProcessBeforeInitialization` 里统一处理这批回调。

## 五、初始化期（15~18）：装零件的阶段

这一段是**面试最常考的顺序题**：`@PostConstruct`、`afterPropertiesSet`、`init-method` 到底谁先？

### ⑮ postProcessBeforeInitialization

初始化方法执行**之前**的统一回调。`@PostConstruct` 就是在这里被触发的——由 `CommonAnnotationBeanPostProcessor`（一个内置的 BPP）负责找到标注了 `@PostConstruct` 的方法并调用。⚠️ 它执行在**属性注入之后**，所以在这里可以安全使用 `@Autowired` 注入的字段。

### ⑯ InitializingBean#afterPropertiesSet

```java
@Component
public class MyBean implements InitializingBean {
    @Override
    public void afterPropertiesSet() {
        Assert.notNull(this.dataSource, "dataSource 不能为空");  // 属性都填好了，做校验和初始化
    }
}
```

名字本身就在提示时机：**after properties set**——属性设置完之后。

### ⑰ 自定义 init-method

XML 时代遗留的配置方式（`@Bean(initMethod = "customInit")`），在三者中最后执行。

### ⑱ postProcessAfterInitialization：AOP 代理在这里生成

**这是整个 Bean 生命周期里最重要的一个钩子。** 所有 AOP 代理都诞生于此——`AbstractAutoProxyCreator` 检查这个 Bean 是否需要被增强（有没有切面匹配它），需要就返回代理对象替换原始对象。

```
postProcessBeforeInitialization
   └─ @PostConstruct
   └─ afterPropertiesSet
   └─ init-method
postProcessAfterInitialization     ← 返回值会被当作 Bean 的最终形态
   └─ 需要代理？→ 生成代理并返回（后续容器里存的是代理，不是原始对象）
```

**这个位置解释了那个反复出现的坑**：容器里存的是代理对象，所以「`this.` 内部调用不走代理」——`@Transactional`、`@Async`、`@Cacheable`、`@PreAuthorize` 全部因此失效。

### 初始化三方法的顺序与记忆法

```
@PostConstruct  →  afterPropertiesSet  →  init-method
```

记忆法：**越"业务"的越靠前，越"标准"的越靠后**。

- `@PostConstruct` 是 JSR 规范注解，跟着代码走，最贴近业务；
- `afterPropertiesSet` 是 Spring 的接口，属于框架约定；
- `init-method` 是 XML 时代遗留的配置方式，最"外围"。

换一个角度记：**谁更可能被写进业务类，谁就更早**。

## 六、就绪期（19~20）：通电的阶段

### ⑲ SmartInitializingSingleton#afterSingletonsInstantiated

**触发时机**：`preInstantiateSingletons()` 方法末尾——所有单例 Bean 都创建完之后，**统一回调一次**（不是每个 Bean 一次）。

| 对比项 | BeanPostProcessor | SmartInitializingSingleton |
|---|---|---|
| 调用次数 | 每个 Bean 一次 | 全局一次 |
| 触发时机 | Bean 创建过程中 | 所有单例创建完成后 |
| 能否拿到全部 Bean | 只有当前这个 | 可以放心 `getBeansOfType()` |

**典型用途**：需要在"所有 Bean 都就绪"之后做统一处理的场景（比如把某类 Bean 收集起来建索引）。

### ⑳ ContextRefreshedEvent 与 ApplicationReadyEvent

```java
@Component
public class WarmupListener {
    @EventListener(ContextRefreshedEvent.class)
    public void onRefreshed() {
        // refresh() 末尾触发。此时容器可用，但内嵌 Web 服务器可能还没启动
    }
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        // 整个应用完全就绪：容器 refresh 完成 + Web 服务器已监听端口 + Runner 已执行
    }
}
```

**选哪个？** 做缓存预热、注册到注册中心、打印启动完成日志——**一律用 `ApplicationReadyEvent`**。原因：`ContextRefreshedEvent` 触发时内嵌容器的端口**还没开始监听**（Web 服务器的启动在 `finishRefresh()` 阶段，而且 `ApplicationRunner` 也还没跑）。

`ApplicationRunner` / `CommandLineRunner` 的区别：两者都在 `ApplicationReadyEvent` **之前**执行，差别只是入参——前者接收 `ApplicationArguments`（能取 `--key=value` 形式的参数），后者接收原始 `String[]`。

## 七、销毁期：拆零件的阶段

顺序同样是"越业务的越早"：`@PreDestroy` → `DisposableBean#destroy` → `destroy-method`。

还有一个不常提但有用的钩子——**`DestructionAwareBeanPostProcessor`**，让 `BeanPostProcessor` 也能参与到销毁流程（比如 `CommonAnnotationBeanPostProcessor` 用它来触发 `@PreDestroy`）。

## 八、顺序错位就白写的四个场景

### 场景一：在 `BeanPostProcessor` 里注入普通 Bean → 拿到 null

**根因**：`BeanPostProcessor` 必须比其他 Bean 先注册并实例化（因为后续 Bean 的初始化要靠它们）。因此它们**不可能**依赖一个普通 Bean——这是时序死结。

**正解**：只依赖容器本身（`ApplicationContextAware`），真正需要时才 `ctx.getBean()`（此时容器已完全就绪）。

**判断标准**：BPP 里只能依赖「容器自身能力」（`BeanFactory`、`Environment`、`ApplicationContext`）或明确被标记为早期初始化的 Bean，**不能依赖普通业务 Bean**。

### 场景二：在 `BeanPostProcessor` 里做事务操作 → 事务不生效

**根因**：事务能力靠 AOP 代理提供，而 AOP 代理正是在 `postProcessAfterInitialization`（第 ⑱ 步）**生成的**。你在生成代理的钩子里调用一个还未被代理的 Bean，事务自然无从谈起。更麻烦的是这类问题**通常不报错**——语句照常执行，只是没事务保护。

**正解**：事务性操作放到 `ApplicationReadyEvent` 之后（或用 `SmartInitializingSingleton`）。

### 场景三：在 `BeanFactoryPostProcessor` 里 `getBean()` → 过早实例化

**根因**：BFPP 处于"改图纸"阶段，此时其他 BFPP 可能**还没执行**。一旦你在这里 `getBean()`，就会提前触发实例化——而这个 Bean 的属性注入、代理生成可能都基于"半成品图纸"，导致配置丢失、切面失效，甚至循环依赖报错。

**正解**：BFPP 里只操作 `BeanDefinition`，永远不要 `getBean()`。日志里的典型表现是：**某个 Bean 的初始化日志出现在 `BeanFactoryPostProcessor` 的日志之前**，顺序明显不对。

### 场景四：用 `ContextRefreshedEvent` 做预热 → 预热失败

**根因**：`ContextRefreshedEvent` 在 `refresh()` 末尾发布，而内嵌 Web 服务器的**启动**在之后的 `finishRefresh()` 阶段——"容器刷新完成"不等于"应用可以对外服务"。

**正解**：改用 `ApplicationReadyEvent`。

## 九、面试题 20 问速答

**Q1：Spring 的扩展点分几类？**
按作用对象分三类：操作 **Environment** 的（`ApplicationContextInitializer`）、操作 **BeanDefinition** 的（`BeanFactoryPostProcessor` 系列）、操作 **Bean 实例**的（`BeanPostProcessor` 系列）。外加贯穿式的 `ApplicationListener`。

**Q2：`BeanFactoryPostProcessor` 和 `BeanPostProcessor` 最本质的区别？**
前者改"图纸"，后者改"零件"。BFPP 在 Bean 实例化**之前**执行、全局一次；BPP 在每个 Bean 创建时执行。名字差一个词，阶段差一整个生命周期。

**Q3：`BeanDefinitionRegistryPostProcessor` 和 `BeanFactoryPostProcessor` 谁先执行？**
前者先。Registry 版能在容器里**新增** BeanDefinition（要先把图纸放进去），普通版只能**修改已有**的。

**Q4：`ImportSelector` 和 `DeferredImportSelector` 的区别？**
处理时机不同。普通 Selector 被 `@Import` 后立即处理；Deferred 版等**所有普通配置类解析完**才处理，因此它能感知用户已有的定义，从而决定要不要退让——这正是 `@ConditionalOnMissingBean` 生效的机制基础。

**Q5：`@ConditionalOnMissingBean` 是怎么做到"用户配了就不生效"的？**
靠 `DeferredImportSelector` 的延迟处理：用户配置类先解析，自动配置后处理时就能检查容器里是否已有对应 BeanDefinition，有就跳过自己。

**Q6：`@Import` 的三种用法？**
直接导入配置类、导入 `ImportSelector` 实现（动态挑选）、导入 `ImportBeanDefinitionRegistrar` 实现（手动注册）。三者的控制力依次递增。

**Q7：`postProcessBeforeInstantiation` 返回一个对象会发生什么？**
短路。Spring 认为对象已就绪，跳过实例化、属性注入、初始化全部流程，直接进入 `postProcessAfterInitialization`。AOP 的 `TargetSource` 场景会用到。

**Q8：`@Autowired` 在哪个扩展点生效？**
`InstantiationAwareBeanPostProcessor#postProcessProperties`。在此之前 `MergedBeanDefinitionPostProcessor#postProcessMergedBeanDefinition` 已经扫描并缓存了注入点清单。

**Q9：为什么构造器里拿不到 `@Autowired` 注入的字段，但 `@PostConstruct` 里可以？**
构造器执行时还在实例化阶段（属性注入尚未开始）；属性注入在 `postProcessProperties`，而 `@PostConstruct` 在之后的 `postProcessBeforeInitialization` 触发。

**Q10：`@PostConstruct`、`afterPropertiesSet`、`init-method` 的顺序？**
`@PostConstruct` → `afterPropertiesSet` → `init-method`。记忆法：越业务的越靠前，越标准接口的越靠后。

**Q11：`@PostConstruct` 是谁触发的？**
`CommonAnnotationBeanPostProcessor`（一个内置的 `BeanPostProcessor`）在 `postProcessBeforeInitialization` 阶段扫描并调用。

**Q12：AOP 代理在哪一步生成？**
`postProcessAfterInitialization`。`AbstractAutoProxyCreator` 判断当前 Bean 是否匹配切面，匹配则返回代理对象替换原对象。

**Q13：为什么容器里存的是代理对象会导致 `this` 调用失效？**
因为 `this` 指向的是原始对象，而增强逻辑写在代理对象上。只有通过代理引用调用才会触发切面——这是 `@Transactional`、`@Async`、`@Cacheable` 失效的共同根因。

**Q14：`Aware` 接口的调用顺序？**
`BeanNameAware` → `BeanClassLoaderAware` → `BeanFactoryAware` → `EnvironmentAware` → `ApplicationContextAware`。规律是"由近及远"。

**Q15：`SmartInitializingSingleton` 和 `BeanPostProcessor` 的区别？**
调用次数和时机不同：BPP 每个 Bean 一次（创建过程中），`SmartInitializingSingleton` 全局一次（所有单例创建完成后）。

**Q16：`ContextRefreshedEvent` 和 `ApplicationReadyEvent` 该用哪个做预热？**
`ApplicationReadyEvent`。前者触发时容器虽已刷新完成，但内嵌 Web 服务器端口可能尚未监听、Runner 还没执行；后者代表应用完全可用。

**Q17：`ApplicationRunner` 和 `CommandLineRunner` 的区别？**
都是启动后执行，差别在入参：前者接收 `ApplicationArguments`（可解析 `--key=value`），后者接收原始 `String[]`。两者都在 `ApplicationReadyEvent` 之前执行。

**Q18：为什么不能在 `BeanFactoryPostProcessor` 里 `getBean()`？**
会触发过早实例化。此时其他 BFPP 可能还没执行完，Bean 的属性注入和代理生成都基于不完整的"图纸"，会导致配置丢失、切面失效等难以排查的问题。

**Q19：Bean 销毁的三种方式及顺序？**
`@PreDestroy` → `DisposableBean#destroy` → `destroy-method`，同样是"越业务的越早"。

**Q20：如果让你在"所有 Bean 都创建完成后"统一处理一批 Bean，用哪个扩展点？**
`SmartInitializingSingleton#afterSingletonsInstantiated`。它保证所有非延迟单例都已就绪，且只回调一次；如果还需要 Web 容器也已启动，就往后再推到 `ApplicationReadyEvent`。

## 十、一张图总结

```
┌─────────── 定义期（改图纸）─────────────────────────────┐
│ ApplicationContextInitializer   → 改 Environment        │
│ BeanDefinitionRegistryPostProcessor → 加图纸            │
│ BeanFactoryPostProcessor        → 改图纸（占位符解析）   │
│ ImportSelector / DeferredImportSelector → 动态挑配置类  │
│ ImportBeanDefinitionRegistrar   → 手动注册              │
│ FactoryBean                   → 接管对象创建            │
└────────────────────────────────────────────────────────┘
┌─────────── 实例化期（造零件）───────────────────────────┐
│ beforeInstantiation（可截胡）                           │
│   → determineCandidateConstructors（选构造器）          │
│   → mergedBeanDefinition（收集注入点）                  │
│   → afterInstantiation（可跳过填充）                    │
│   → postProcessProperties（@Autowired 生效）            │
│   → Aware 回调（由近及远）                              │
└────────────────────────────────────────────────────────┘
┌─────────── 初始化期（组装）─────────────────────────────┐
│ postProcessBeforeInitialization                         │
│   → @PostConstruct → afterPropertiesSet → init-method   │
│ postProcessAfterInitialization  ← AOP 代理生成于此      │
└────────────────────────────────────────────────────────┘
┌─────────── 就绪期（通电）───────────────────────────────┐
│ SmartInitializingSingleton → ContextRefreshedEvent      │
│   → ApplicationRunner / CommandLineRunner               │
│   → ApplicationReadyEvent                               │
└────────────────────────────────────────────────────────┘
┌─────────── 销毁期（断电）───────────────────────────────┐
│ @PreDestroy → DisposableBean#destroy → destroy-method   │
└────────────────────────────────────────────────────────┘
```

**三条记忆主线**：

1. **图纸 / 零件 / 通电**：BFPP 改图纸、BPP 改零件、事件管通电——三者作用对象不同，别混；
2. **越业务越靠前**：初始化与销毁的三种方式都遵循这个规律（`@PostConstruct` 早于 `afterPropertiesSet` 早于 `init-method`）；
3. **代理是分水岭**：`postProcessAfterInitialization` 之前是"原始对象世界"，之后是"代理世界"——所有 `this` 调用失效的坑都源于这道分界线。

## 十一、面试冲刺清单

- ☐ 能按五个阶段（定义 / 实例化 / 初始化 / 就绪 / 销毁）说出扩展点分布
- ☐ 能区分 `BeanDefinitionRegistryPostProcessor` 与 `BeanFactoryPostProcessor` 的先后与能力差异
- ☐ 能解释 `DeferredImportSelector` 为什么是自动配置"让位"的机制基础
- ☐ 能说出 `@Import` 的三种用法及控制力递增关系
- ☐ 能画出 Bean 实例化期的完整扩展点时序（含三级缓存的位置）
- ☐ 能指出 `@Autowired` 生效的确切扩展点位置
- ☐ 能说出初始化三方法的顺序并解释记忆法
- ☐ 能定位 AOP 代理生成的时机，并由此解释 `this` 调用失效
- ☐ 能对比 `SmartInitializingSingleton` 与 `BeanPostProcessor` 的调用次数与时机
- ☐ 能判断预热该用 `ContextRefreshedEvent` 还是 `ApplicationReadyEvent`
- ☐ 能说明"BPP 里不能注入普通 Bean"的根因
- ☐ 能说明"BFPP 里禁止 getBean"的原因与后果

> 扩展点这张图，其实就是 Spring 容器的"施工进度表"——知道每个钩子挂在施工的哪一步，很多"玄学 bug"就变成了必然。
