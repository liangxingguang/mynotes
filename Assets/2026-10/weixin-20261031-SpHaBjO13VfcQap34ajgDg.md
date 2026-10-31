> 面试造火箭，工作拧螺丝？Spring 作为 Java 后端面试的“绝对C位”，几乎每场必问。但很多候选人只会背八股，一被追问原理就露怯。
> 
> 这篇文章，我把自己总结的 **Spring 高频面试题** 全盘托出：从 `BeanFactory` 与 `ApplicationContext` 的本质区别，到 IOC / DI / AOP 的底层实现；从 `DispatcherServlet` 的请求全流程，到 `refresh()` 的十二步启动链路；从 Bean 的完整生命周期，到三级缓存如何优雅解决循环依赖；再到事务传播行为、隔离级别，以及 **90% 的人都会踩的事务失效大坑**。
> 
> 全文 **11 大核心考点**，每个知识点都配有 **流程图、对比表、面试金句和源码级解析**，不是干巴巴的概念堆砌，而是能让你在面试官面前“讲透原理”的实战指南。
> 
> 🚀 不管你是准备跳槽、备战秋招，还是想系统梳理 Spring 底层，这篇都值得你 **收藏 + 转发 + 反复阅读**。关注我，后续还会更新更多高频面试题系列！

* * *

## BeanFactory 与 ApplicationContext 区别

### 一句话核心本质

`BeanFactory` 是 Spring IOC 容器的**最底层接口**，定义了容器的基本规范，只提供了**依赖注入和 Bean 管理**的核心功能，**懒加载**； 而 `ApplicationContext` 是 `BeanFactory` 的**高级子接口**，是它的 "超级增强版"，在保留所有核心功能的基础上，扩展了大量企业级特性，也是我们日常开发中 99% 场景下实际使用的容器,**预初始化单例 Bean**。

就像一辆车：`BeanFactory` 是**发动机裸机**，能跑，但得自己装方向盘、座椅、空调；`ApplicationContext` 是**整车交付**，拧钥匙就走 🚗✨。

### 核心区别对比表 📊

**对比维度**

**BeanFactory**

**ApplicationContext**

继承关系

最顶层基础接口

继承自 BeanFactory 及多个扩展接口

初始化时机

懒加载（调用 getBean () 时才创建）😴

预加载（容器启动时创建所有单例 Bean）🏃‍♂️

功能范围

仅核心 IOC 功能

核心 IOC + 企业级扩展功能

性能特点

启动快，内存占用小

启动慢，内存占用大

错误发现时机

运行时调用 getBean () 时

容器启动时

自动注册

不自动注册 BeanPostProcessor

自动注册所有 BeanPostProcessor

典型实现

XmlBeanFactory（已过时）

AnnotationConfigApplicationContext（最常用）

`getBean()`

首次调用时才创建

直接返回已创建实例

生产建议

几乎不用，仅资源受限环境

**唯一选择 ✅**

**面试金句**： “如果 Bean 配置有致命错误，`BeanFactory` 要到调用时才发现，生产这就炸了 💣；而 `ApplicationContext` 启动时就能暴露问题。”

### 最容易被问的灵魂考点 ⚡

#### Bean 的初始化时机差异（面试必问）

*   **BeanFactory**：纯懒加载模式 🐢，只有当你真正调用`getBean()`方法时，才会去实例化和初始化对应的 Bean
    
*   **ApplicationContext**：预加载模式 🚀，容器启动过程中就会创建所有非懒加载的单例 Bean
    

生动比喻：

*   BeanFactory = 按需点餐，你点什么菜，厨房才开始做什么
    
*   ApplicationContext = 提前备菜，客人来之前所有菜都做好了，直接就能上
    

⚠️ 重要补充：以上差异**仅针对单例 Bean**。对于多例 Bean，无论哪个容器，都是在调用`getBean()`时才会创建实例。

#### BeanPostProcessor 自动注册 vs 手动挡

`BeanPostProcessor` 是 Spring 扩展骨架，比如 `@Autowired`、`@Transactional` 都是靠它。

*   `BeanFactory`：你得**手动**调用 `addBeanPostProcessor()`，然后自己注册，很容易漏掉。
    
*   `ApplicationContext`：**自动检测**容器内所有 `BeanPostProcessor` 类型的 Bean，自动注册。
    

**结果就是**： 用 `BeanFactory`，你写的 `@Autowired` 可能都不会生效 😱；`ApplicationContext` 开箱即用。

### ApplicationContext 独有的企业级功能 ✨

这是两者最本质的功能差距，也是我们几乎不用 BeanFactory 的原因：

*   **国际化支持（MessageSource）**：轻松实现多语言应用
    
*   **事件发布机制（ApplicationEventPublisher）**：实现组件间的解耦通信
    
*   **统一资源加载（ResourceLoader）**：可加载类路径、文件系统、URL 等任意位置的资源
    
*   **AOP 自动集成**：无需手动配置，开箱即用 AOP 功能
    
*   **环境变量支持（EnvironmentCapable）**：统一管理系统属性、配置文件、环境变量
    
*   **应用生命周期管理**：提供容器启动、关闭等完整生命周期回调
    

### 继承关系图 🌳

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 看这个图就明白：`ApplicationContext` 间接继承了 `BeanFactory`，是它的**超集**。

### 适用场景 🎯

*   **使用 BeanFactory**：资源极度受限的环境（如嵌入式设备、移动应用），对启动速度和内存占用要求极高的特殊场景
    
*   **使用 ApplicationContext**：所有企业级 Java 应用，SpringBoot 项目默认使用的就是 ApplicationContext 的实现类
    

### 面试总结：一句话镇住场

“在真实项目中，几乎不会直接使用 `BeanFactory`，它就是个**底层积木**。`ApplicationContext` 是开箱即用的**超级工厂**，集成了 AOP、事件、国际化、环境抽象。 如果面试官非要问何时用 `BeanFactory`，那就是**内存极度敏感**（比如移动端、小家电）且不太需要 Spring 全家桶特性时。”

### 温馨提醒 💡

*   别死记硬背，抓住主线：**容器能力和初始化策略**的差异。
    
*   可以结合调试经验，比如看过 `DefaultListableBeanFactory` 源码，发现它非常朴实，只做一件事：存 `BeanDefinition`、搞依赖注入。`ApplicationContext` 在此基础上包装了 **refresh()** 全套流程。
    
*   语气轻松点：😊“我平时都直接用 Spring Boot 的 `AnnotationConfigApplicationContext`，底层就是 `ApplicationContext`，根本不用操心 `BeanFactory`。”
    

## Spring IOC 原理

### 核心概念：什么是 IOC？🤔

**IOC（Inversion of Control，控制反转）** 是一种设计思想，不是技术实现。它的核心是**将对象的创建、依赖管理和生命周期控制权从代码本身转移到外部容器。**

举个最接地气的例子：

*   **传统方式**：你想喝奶茶，得自己去买原料、煮茶、调配（自己 new 对象，自己管理依赖）
    
*   **IOC 方式**：你直接点外卖，奶茶店（IOC 容器）做好了给你送过来，你只需要喝就行（只需要声明依赖，不需要自己创建）
    

**DI（Dependency Injection，依赖注入）** 是 IOC 思想的**具体实现方式**。Spring 通过 DI 来实现对象之间的依赖关系管理。

### 🧠 先通俗理解 IOC 到底“反转”了什么

有句话我特别喜欢：“好莱坞原则——Don‘t call us, we’ll call you。” 这就是 IOC 的精髓。

以前你写代码，自己 `new` 对象，自己控制一切：

```
UserService userService = new UserService(new UserDao()); // 你主动找依赖
```

控制权在**你手上**。

用了 Spring，变成：

```
@AutowiredUserService userService; // Spring 把依赖 push 给你
```

控制权**反转**给了容器。你从主动“找朋友”变成被动“被介绍”，这就是**控制反转（Inversion of Control）**。

### 🔩 IOC 与 DI 的关系

很多人把两者划等号，其实 IOC 是思想，DI（依赖注入）是实现手段。就像“减肥”是思想，“跑步”是实现。🏃

Spring 通过 DI 完成 IOC，方式主要有：

*   构造器注入 （推荐 ✅）
    
*   Setter 注入
    
*   字段注入（`@Autowired` 直接怼，简洁但难以测试）
    

### Spring IOC 容器核心架构 🏗️

Spring IOC 容器主要由两个核心接口定义：

**接口**

**职责**

**特点**

**代表实现**

**BeanFactory**

Spring 最底层的容器接口

提供了最基本的依赖注入功能，懒加载 Bean

`DefaultListableBeanFactory`

**ApplicationContext**

BeanFactory 的子接口

提供了更多企业级功能（事件发布、国际化、资源加载等），启动时预加载所有单例 Bean

`AnnotationConfigApplicationContext`

、`ClassPathXmlApplicationContext`

我们平时用的`ClassPathXmlApplicationContext`、`AnnotationConfigApplicationContext`都是 `ApplicationContext` 的具体实现类。

日常开发我们 99% 用 `ApplicationContext`，它的内部组合了一个 `BeanFactory` 干活。

### Spring IOC 完整工作流程 🚀

这是面试最常考的核心点，我用流程图给您展示：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 关键步骤详解：

1.  **配置解析**：Spring 会读取 XML 配置文件或者扫描带有`@Component`、`@Service`等注解的类
    
2.  **BeanDefinition**：这是 Spring 对 Bean 的抽象描述，包含了 Bean 的类名、作用域、依赖关系、初始化方法等所有信息
    
3.  **BeanFactoryPostProcessor**：在 Bean 实例化之前执行，可以修改 `BeanDefinition` 的属性（比如`PropertyPlaceholderConfigurer`替换占位符）
    
4.  **BeanPostProcessor**：在 Bean 初始化前后执行，可以对 Bean 进行增强（比如 AOP 的动态代理就是在这里生成的）
    

### 核心技术点 💡

#### 1\. 依赖注入的三种方式

*   **构造方法注入**（推荐）：Spring 4.3 之后推荐使用，保证依赖不可变，便于单元测试
    
*   **setter 方法注入**：适用于可选依赖
    
*   **字段注入**（不推荐）：使用@Autowired直接注入字段，不利于测试和依赖管理
    

#### 2\. Bean 的生命周期

1.  实例化（调用构造方法）
    
2.  填充属性（依赖注入）
    
3.  调用`BeanNameAware.setBeanName()`
    
4.  调用`BeanFactoryAware.setBeanFactory()`
    
5.  调用`ApplicationContextAware.setApplicationContext()`
    
6.  调用`BeanPostProcessor.postProcessBeforeInitialization()`
    
7.  调用`@PostConstruct`注解的方法
    
8.  调用`InitializingBean.afterPropertiesSet()`
    
9.  调用自定义的 `init-method`
    
10.  调用`BeanPostProcessor.postProcessAfterInitialization()`
     
11.  Bean 可以被使用
     
12.  容器关闭时，调用`@PreDestroy`注解的方法
     
13.  调用`DisposableBean.destroy()`
     
14.  调用自定义的 `destroy-method`
     

#### 3\. Bean 的作用域

*   **singleton**（默认）：单例，整个容器中只有一个实例
    
*   **prototype**：原型，每次获取都创建一个新实例
    
*   **request**：每个 HTTP 请求创建一个实例
    
*   **session**：每个 HTTP 会话创建一个实例
    
*   **application**：整个 ServletContext 生命周期内一个实例
    

### 🔁 循环依赖 —— 经典的三级缓存

面试必问，对吧？😏 咱们用 Spring 解决构造器注入之外的 setter 注入循环依赖来说明。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

三级缓存的作用别记死，要理解：

*   🥇 **一级**（`singletonObjects`）：成品豆，完全初始化好的。
    
*   🥈 **二级**（`earlySingletonObjects`）：半成品豆，已经过 AOP 等早期处理的裸代理引用。
    
*   🥉 **三级**（`singletonFactories`）：一个工厂，能生成该 Bean 的早期引用，主要是留给 AOP 动态代理的钩子。
    

**为什么不能只靠两级？** 因为如果这个 Bean 需要 AOP，你必须有一个工厂在真正需要代理时才生成代理对象，而不是一出生就生成，这样灵活且能避免循环代理时拿不到正确引用的尴尬。

### 👀 面试时这样回答，显得有深度

如果让我简洁地说清Spring IOC原理，我会这么分层递进：

1.  **核心概念**：控制反转 + 依赖注入，把对象的管理和组装交给容器。
    
2.  **存储层**：`BeanDefinition` 是 Spring 里 Bean 的“设计图”，注册在 `beanDefinitionMap`。
    
3.  **运作层**：容器通过反射创建原始对象 → 填充属性 → 执行生命周期回调 → 放入单例池。
    
4.  **精巧设计**：用三级缓存解决了单例 setter 注入的循环依赖，同时给 AOP 留下了扩展点。
    
5.  **扩展点**：`BeanPostProcessor`，AOP、事务等高级功能都在这玩出了花。
    

最后提一句：**IOC 让代码从“自己控制”变成了“可配置的组件拼装”**，测试性和扩展性直接上一台阶，这是它最核心的价值。✨

## Spring DI 原理

### 核心概念：先搞懂 DI 到底是什么 💡

DI（Dependency Injection，依赖注入）是**IoC（控制反转）思想的具体实现方式**：

*   传统开发：我们主动new对象，自己管理所有依赖（高耦合，改一处动全身）
    
*   Spring DI：把对象的创建和依赖关系交给 Spring 容器管理，我们只需要声明 "我需要什么"，容器会自动把依赖 "送" 过来
    

**接地气比喻**：就像你以前自己买菜做饭（主动创建对象），现在点外卖（容器注入对象）。你只需要在 APP 上下单（声明依赖），外卖平台（Spring 容器）会把做好的饭（依赖对象）直接送到你手上，你不用管食材采购、烹饪过程和配送路线。

### 📦准备阶段：一切从 BeanDefinition 开始

容器启动时，不管你是 XML、`@Component` 还是 `@Bean`，都会被解析成一堆 `BeanDefinition` 元数据，注册到 `BeanFactory` 里。这就是“菜谱”——定义了类名、作用域、依赖关系、初始化方法等。

### 🏗️Bean 的“出生”全流程（DI 就藏在这里）

当你调用 `getBean()` 或容器自动装配时，核心是一条流水线：

#### 1.实例化 (Instantiation)

通过反射 `Constructor.newInstance()` 搞出原始对象（属性全空，是个“毛坯房”）。

#### 2.属性填充 (Populate Beans) 🔥 这才是 DI 真正发生的地方！

*   遍历 `BeanDefinition` 里的 `PropertyValues` 或者处理 `@Autowired`、`@Value`、`@Resource` 等注解。
    
*   幕后功臣是各种 `BeanPostProcessor`：
    

*   `AutowiredAnnotationBeanPostProcessor` 负责 `@Autowired` 和 `@Value`
    
*   `CommonAnnotationBeanPostProcessor` 处理 `@Resource`
    

*   它们会通过反射拿到字段或 setter 方法，然后去容器里找对应的依赖 Bean（按类型或名称查找），找到就调用 `field.set(obj, dependencyBean)` 强行 set 进去。找不到且必需，就抛异常。如果依赖的 Bean 还不存在，会 **递归触发**`getBean()` 创建依赖，这就是“联动创建”。
    

#### 3.初始化 (Initialization)

注入完成后执行 `InitializingBean.afterPropertiesSet()` 或 `@PostConstruct`、自定义 init 方法。这一阶段可能会生成 AOP 代理（把原对象包一层代理，并覆盖二级缓存中的早期引用）。

#### 4.成品入池

完全就绪的 Bean 放入一级缓存 `singletonObjects`，供外界使用。

#### 用图直观感受一下流程：  

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### Spring DI 完整执行流程 📊

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 底层核心实现原理 🔧

Spring DI 的本质是**通过反射机制实现的对象工厂模式**，核心依赖三个组件：

1.  **BeanDefinition**：Bean 的 "说明书"，存储了 Bean 的所有元信息（类名、作用域、依赖关系、初始化方法等）
    
2.  **BeanFactory**：Spring 的核心容器，是一个对象工厂，负责根据 BeanDefinition 创建和管理 Bean
    
3.  **反射机制**：Spring DI 的技术基础，在运行时动态：
    

*   调用类的构造方法创建对象实例
    
*   调用 setter 方法或直接给字段赋值（注入依赖）
    
*   调用初始化和销毁方法
    

### 三种依赖注入方式对比 ✅

**注入方式**

**实现原理**

**优点**

**缺点**

**推荐程度**

构造器注入

调用带参构造方法

依赖不可变、强制依赖检查、便于单元测试

依赖多时代码臃肿

⭐⭐⭐⭐⭐（Spring 官方推荐）

Setter 注入

调用 setter 方法

可选依赖、支持循环依赖

依赖可能为 null、无法保证不可变

⭐⭐⭐⭐

字段注入

直接给字段赋值

代码最简洁

无法注入静态字段、不利于测试、耦合 Spring

⭐⭐（不推荐生产环境）

### @Autowired 的工作原理

1.  Spring 容器启动时，`AutowiredAnnotationBeanPostProcessor`会扫描所有带有`@Autowired`注解的字段、构造器和方法
    
2.  当创建 Bean 时，这个后置处理器会拦截 Bean 的创建过程
    
3.  根据注解的位置，通过反射找到需要注入的依赖类型
    
4.  从 BeanFactory 中查找匹配该类型的 Bean
    
5.  将找到的 Bean 通过反射注入到当前 Bean 中
    

### 🔄 灵魂拷问：循环依赖怎么破？

这必须提**三级缓存**，经典八股文但很好用：

*   **一级缓存**`singletonObjects`：成品 Bean，初始化+代理全完成的。
    
*   **二级缓存**`earlySingletonObjects`：半成品的早期引用（可能已被代理）。
    
*   **三级缓存**`singletonFactories`：存的是一个 `ObjectFactory`，能产生早期引用（对象刚被实例化，属性未填）。
    

#### 流程复现（A ↔ B 循环依赖）：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

*   **为什么用三级**？ 是为了让 AOP 代理对象能在循环依赖时保持一致。三级缓存中的 `ObjectFactory` 可以提前调用 `getEarlyBeanReference()` 生成代理，然后放入二级缓存，后续注入的 B 拿到的就是代理，而不是原始对象。
    
*   ⚠️ **构造器注入无法解决** 循环依赖，因为实例化那一刻就要依赖，连三级缓存都来不及暴露。
    

### 🎯一句话梳理 DI 实现

Spring 的 DI 本质是在 `populateBean()` 阶段，通过各种 **BeanPostProcessor** 解析注解、从容器里递归获取依赖 Bean，然后用反射把依赖“怼”进目标 Bean 的字段或 setter。再配合**三级缓存**优雅解决循环依赖。

## Spring AOP 原理

### 💬 先从一句话讲清什么是 AOP

**AOP（Aspect-Oriented Programming）**：在不修改原有业务代码的前提下，给方法横切进去增加额外功能，比如日志、事务、权限校验。

说白了就是“**代码不动，逻辑横插一杠子**”。Spring AOP 是其中最常用的落地实现。🛠️

### 核心思想

Spring AOP（面向切面编程）是**OOP（面向对象编程）的重要补充**，核心解决**横切关注点**（如日志、事务、权限校验、性能监控）与业务逻辑的耦合问题。它通过 "横向抽取" 的方式，将重复的增强逻辑从业务代码中分离出来，在不修改原有代码的前提下，为目标对象动态添加功能。

### 底层核心原理 🔑

Spring AOP 的本质是动态代理：在运行时动态生成代理对象，所有对目标对象的方法调用都会被代理对象拦截，代理对象在执行目标方法前后插入我们定义的增强逻辑。

Spring 提供了两种动态代理实现，会根据目标对象的情况自动选择：

**对比维度**

**JDK 动态代理**

**CGLIB 动态代理**

底层技术

Java 反射机制

ASM 字节码生成框架

实现方式

生成一个实现了目标类所有接口的代理类

生成一个继承自目标类的子类

强制要求

目标类**必须实现至少一个接口**

目标类和方法**不能被 final 修饰**

性能表现

JDK8 + 后性能大幅提升，执行效率略高

生成子类较慢，执行效率略低

Spring 默认选择

目标类实现接口时使用

目标类未实现接口时自动切换

### AOP 核心术语（面试必问）📌

*   **连接点 (JoinPoint)** 🎯：程序执行过程中的特定位置（如方法执行前、后、异常抛出时），Spring AOP 仅支持**方法级别的连接点**
    
*   **切点 (Pointcut)** ✂️：匹配连接点的表达式（如`execution(* com.example.service.*.*(..))`），定义了 "哪些方法需要被增强"
    
*   **通知 (Advice)** 💉：在切点上执行的增强逻辑，共 5 种类型：
    

*   `@Before`：前置通知（方法执行前）
    
*   `@After`：后置通知（方法执行后，无论是否异常）
    
*   `@AfterReturning`：返回通知（方法正常返回后）
    
*   `@AfterThrowing`：异常通知（方法抛出异常后）
    
*   `@Around`：环绕通知（最强大，可完全控制方法执行）
    

*   **切面 (Aspect)：切点 + 通知 🧩**的组合，定义了 "在什么地方、什么时候、做什么增强"
    
*   **织入 (Weaving)** 🧵：将切面应用到目标对象并创建代理对象的过程，Spring AOP 采用**运行时织入**
    

把它们串起来就是：我定义好一个 **切面**，它包含“在哪些地方（切入点）”以及“干什么事（通知）”，Spring 通过**织入**把这些逻辑加到代理对象里。

### AOP 完整执行流程 ⚡

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### ⚙️ 底层原理：动态代理（这才到硬骨头）

Spring AOP 的根基就是 **代理模式 + 动态代理**，Spring 根据被代理对象有无接口，选不同方案：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 🔹 JDK 动态代理

*   前提：**目标类必须有接口**
    
*   原理：`Proxy.newProxyInstance()` + `InvocationHandler`
    
*   生成的代理对象是 `$Proxy` 类，实现了目标接口，调用任何接口方法都会进入 `InvocationHandler.invoke()`，里面执行 Advice 链，再反射调原方法。
    

#### 🔹 CGLIB 动态代理

*   适用：**目标类没有接口**
    
*   原理：`Enhancer` + `MethodInterceptor`
    
*   生成目标类的子类，重写非 final 方法。方法调用时先过 `MethodInterceptor.intercept()`，执行织入的通知链，再 `proxy.invokeSuper()` 调用父类（即原对象）的方法。
    

🔑 关键区别：**JDK 要求接口，CGLIB 可以代理普通类**。Spring Boot 2.x 后默认就用 CGLIB 了，即使有接口。

### 🔗 一条方法调用，到底怎么走的？

假设我们对 `UserService.save()` 做了环绕通知+前置通知，调用链如下：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 每一步的背后：

1.  **代理对象**其实是个组合了 `Advised` 和 `Target` 的家伙。
    
2.  调用方法时，走的是 `JdkDynamicAopProxy.invoke()` 或 `DynamicAdvisedInterceptor.intercept()`。
    
3.  内部会构造一个 `ReflectiveMethodInvocation`，把 **所有通知适配成的拦截器链** 穿成一根“俄罗斯套娃”。
    
4.  递归的 `proceed()` 一个个执行，就像剥洋葱，一层层进去，再一层层出来。🧅
    

### 关键注意事项

1.  Spring AOP**只能拦截 public 方法**，无法拦截 private、static、final 方法（CGLIB 无法重写 final 方法，JDK 代理只能调用接口 public 方法）
    
2.  Spring Boot 2.x 中，**默认强制使用 CGLIB 代理**（`spring.aop.proxy-target-class=true`），如需使用 JDK 代理可手动修改该配置
    
3.  同一个类内部方法调用不会触发 AOP 增强（因为直接调用的是 this 对象，而非代理对象）
    
4.  如需拦截非 public 方法或实现更强大的 AOP 功能，可使用 AspectJ 进行编译期或类加载期织入
    

### 🧠 几个面试加分点，随口一提就多拿 5 分

*   **AOP 是代理方式实现的，因此自调用（this.内部方法）不走代理，切面失效**，解决方式：通过 `AopContext.currentProxy()` 或注入自身。
    
*   **构造器、静态方法、private 方法都织入不了**，因为代理是方法级别的。
    
*   Spring AOP 是 **运行时织入**，AspectJ 可做到编译时、类加载时织入，Spring 也支持加载 AspectJ 的注解，但内核还是动态代理。
    
*   通知执行顺序：`Around前->Before->方法->AfterReturning/AfterThrowing->After->Around后`，记不住可以在纸上画一圈。🔄
    

### 🧾 面试这么答，稳

“Spring AOP 核心是通过动态代理实现，有接口用 JDK 动态代理，没接口用 CGLIB。代理对象在调用方法时，先执行一条由 Advice 适配成的拦截器链，采用递归 proceed 方式依次执行通知，最后才反射调原方法。执行顺序是：环绕前→前置→目标方法→后置/异常→最终→环绕后。它的局限在于代理方式，自调用、private、static 方法都无法增强。”

## Spring MVC 原理

💡 一句话核心：Spring MVC 是基于 Servlet 规范实现的**前端控制器模式**的 MVC 框架，通过 `DispatcherServlet` 统一拦截所有请求，将请求处理、视图渲染等职责拆分给不同组件，实现了业务逻辑和视图层的彻底解耦。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

你看这张图基本就把整个生命周期串起来了。它虽然组件多，但每一步职责都是单一的，像搭积木一样。

### 核心组件及职责（必背）

**组件名称**

**核心职责**

🎯 DispatcherServlet

前端控制器，整个流程的总指挥，统一接收所有请求，协调各个组件工作

🔍 HandlerMapping

根据请求 URL 找到对应的处理器（Controller 方法）和拦截器链

⚙️ HandlerAdapter

适配器模式的核心，统一不同类型 Handler 的调用方式

🧑💻 Handler（Controller）

业务处理器，编写具体业务逻辑，返回 ModelAndView 对象

🖼️ ViewResolver

视图解析器，根据视图名解析出具体的 View 对象

📄 View

视图对象，负责将 Model 数据渲染成 HTML/JSON 等响应内容

### 核心工作流程（面试必画）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

🚀 流程分步解析（口语化表达）：

1.  所有请求先到 `DispatcherServlet` 这个 "大管家" 手里
    
2.  大管家让 `HandlerMapping` 去 "查地图"，找到这个 URL 对应的 `Controller` 方法
    
3.  大管家再让 `HandlerAdapter` 去 "跑腿"，调用找到的 `Controller` 方法
    
4.  `Controller` 处理完业务，把数据和要去的页面名打包成 `ModelAndView` 还给大管家
    
5.  大管家让 `ViewResolver` 根据页面名找到具体的页面模板
    
6.  最后 `View` 把数据填到模板里，生成 HTML 返回给用户
    

### 高频追问点（面试加分项）

#### 为什么要用 HandlerAdapter，不直接调用 Controller？

这是**适配器模式**的经典应用：

*   解耦了 `DispatcherServlet` 和具体的 `Handler` 实现，`DispatcherServlet` 不需要知道 `Handler` 的具体类型
    
*   支持多种处理器：除了`@Controller`，还支持`HttpRequestHandler`、`Servlet`、甚至普通方法
    
*   方便扩展：新增处理器类型时，只需要新增一个 `HandlerAdapter`，不需要修改 `DispatcherServlet` 的核心代码
    

#### Spring MVC 的九大组件是什么？

核心是上面提到的 6 个，还有 3 个辅助组件：

*   MultipartResolver：文件上传解析器
    
*   LocaleResolver：国际化解析器
    
*   ThemeResolver：主题解析器
    

所有组件都定义在 DispatcherServlet 的属性中，Spring 会自动装配默认实现，也支持自定义替换。

#### Spring Boot 中 DispatcherServlet 是怎么自动配置的？

通过`DispatcherServletAutoConfiguration`自动配置类实现：

*   默认注册一个 DispatcherServlet，映射路径为`/`
    
*   自动配置了默认的 HandlerMapping、HandlerAdapter、ViewResolver 等组件
    
*   可以通过`spring.mvc.*`配置项自定义 DispatcherServlet 的行为
    

#### Spring MVC 怎么处理 @ResponseBody 返回 JSON 的情况？毕竟没有视图解析那一步了。

是的，这就用到 `HttpMessageConverter`（消息转换器）了 🧙。

`HandlerAdapter` 执行完 Controller 后，如果发现方法上有 `@ResponseBody` 或类上有 `@RestController`，就不会去走 `ViewResolver` 流程。它会通过一个叫做 `HandlerMethodReturnValueHandler`（返回值处理器，内部利用 `HttpMessageConverter`）的东西，直接从返回值“咔嚓”序列化成 JSON，写到 `HttpServletResponse` 的输出流里。

关键技术点：

*   **内容协商**：根据请求头 `Accept`（比如 `application/json`）来决定用哪个 `HttpMessageConverter`。
    
*   你返回的 `User` 对象，默认通过 `MappingJackson2HttpMessageConverter` 转成 JSON 字符串写出去。
    
*   请求反过来也一样，`@RequestBody` 接收 JSON 时，也是它把 JSON 反序列化成 Java 对象。
    

这样就形成了**前后端分离**最核心的 REST 交互通道 🚀。

#### 拦截器链对比过滤器

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

对比维度

拦截器 Interceptor

过滤器 Filter

归属

Spring MVC 框架

Servlet 规范（Tomcat）

能获取的上下文

可以拿到 `Handler`、`ModelAndView`、`Spring Bean`

只有 `request`/`response`

控制力度

能拦到具体的 Controller 方法，并可决定是否调用

只能根据 URL 模式匹配

经典用途

登录鉴权、权限控制、操作日志

编码转换、跨域设置、XSS 防护

总结一下：过滤器像是“城门守卫”，管进出流量但不知城内事务；拦截器像是“宫殿内臣”，知道你要见哪个 Controller，还能干预前后伺候细节 😄。

### 总结Spring MVC的本质

Spring MVC 的本质是围绕 `DispatcherServlet` 设计的一个高度可插拔的请求处理框架。

它通过 `HandlerMapping` 定位处理器，`HandlerAdapter` 适配调用，`ModelAndView` 携带数据，`ViewResolver` 或 `HttpMessageConverter` 产出最终结果。整条链上你可以在任意节点通过拦截器、参数解析器、转换器等扩展点定制行为，最终达到 “高内聚低耦合”，让开发者只用专注于写 @Controller 里的业务代码就行 ⚙️。

## ApplicationContext的refresh()全流程流程

这是 Spring 容器启动的**核心灵魂方法**，位于`AbstractApplicationContext`抽象类中，整个流程是同步加锁执行的，防止并发刷新。我会按执行顺序拆解关键步骤，重点标注面试高频考点🔥

`refresh()` 就像是 Spring 容器的“重启大法”或者“初始化总开关” 🔄。它会完成整个 Bean 的解析、注册、以及各种后置处理器的执行，最终让容器可用。如果是 `AbstractApplicationContext` 的子类，构造函数里就可能调用它。

```
┌─────────────────────────────────────────────────────────┐│               refresh() 总流程 (简化版)                   │├─────────────────────────────────────────────────────────┤│  1. prepareRefresh()          🧹 大扫除，准备环境         ││          ↓                                              ││  2. obtainFreshBeanFactory()  🏭 创建/刷洗 BeanFactory    ││          ↓                                              ││  3. prepareBeanFactory()      🔧 给工厂塞些标准组件       ││          ↓                                              ││  4. postProcessBeanFactory()  📞 子类扩展点（模板模式）   ││          ↓                                              ││  5. invokeBeanFactoryPostProcessors()  🚀 BFPP 上场      ││          ↓                                              ││  6. registerBeanPostProcessors()       📌 注册 BPP       ││          ↓                                              ││  7. initMessageSource()       🌍 国际化                   ││          ↓                                              ││  8. initApplicationEventMulticaster() 📢 事件广播器       ││          ↓                                              ││  9. onRefresh()               🎨 子类扩展点（如启动Web服务器） ││          ↓                                              ││ 10. registerListeners()       👂 注册监听器               ││          ↓                                              ││ 11. finishBeanFactoryInitialization() ⭐ 单例 Bean 雪崩   ││          ↓                                              ││ 12. finishRefresh()           🎉 收尾，发布完成事件       │└─────────────────────────────────────────────────────────┘
```

### 📊 完整执行流程图

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 📝 逐步骤核心详解

#### 1\. prepareRefresh () 🚀 准备刷新上下文

*   记录容器启动时间，标记上下文为活跃状态
    
*   初始化环境变量`Environment`，解析系统属性和环境变量
    
*   验证所有**必需属性**是否已配置（如`@Value("${db.url}"`)无默认值且未配置，这里直接抛异常）
    
*   🔥 关键点：自定义的`Environment`后置处理器在这里生效
    

#### 2\. obtainFreshBeanFactory () 📦 获取新鲜的 BeanFactory

*   关闭并销毁旧的 BeanFactory（如果存在）
    
*   创建 Spring 默认的 BeanFactory 实现：`DefaultListableBeanFactory`
    
*   加载所有 `BeanDefinition`（XML 解析、注解扫描生成 Bean 的 "图纸"）
    
*   🔥 关键点：**这一步只生成 Bean 定义，不实例化任何 Bean**
    

#### 3\. prepareBeanFactory () ⚙️ 配置 BeanFactory 基础属性

*   设置 `BeanFactory` 的类加载器、表达式解析器
    
*   注册`ApplicationContextAwareProcessor`，处理各种Aware接口回调
    
*   忽略`EnvironmentAware`、`ResourceLoaderAware`等依赖接口的自动注入
    
*   将 `ApplicationContext` 本身作为单例 Bean 注册到容器中
    
*   🔥 关键点：Spring 内置的核心 `BeanPostProcessor` 在这里注册
    

#### 4\. postProcessBeanFactory () 🧩 子类扩展点

*   空方法，留给`AbstractApplicationContext`的子类重写
    
*   允许在 `BeanFactory` 准备完成后，做额外的 `BeanDefinition` 注册或修改
    
*   🔥 关键点：SpringBoot 在这里会注册一些特有的 `BeanPostProcessor`
    

#### 5\. invokeBeanFactoryPostProcessors () 🔥 超级核心步骤

*   执行所有注册的`BeanFactoryPostProcessor`及其子类
    
*   执行顺序严格遵循：`BeanDefinitionRegistryPostProcessor` → 普通`BeanFactoryPostProcessor`
    
*   同一类型内部按：`PriorityOrdered` → `Ordered` → 无顺序执行
    
*   🔥 超级重点：`ConfigurationClassPostProcessor`在这里执行，处理`@Configuration`、`@Bean`、`@ComponentScan`、`@Import`等所有注解配置，生成对应的 `BeanDefinition`
    

#### 6\. registerBeanPostProcessors () 📌 注册 Bean 后置处理器

*   扫描所有实现了`BeanPostProcessor`接口的 Bean
    
*   按优先级排序后注册到 BeanFactory 中
    
*   🔥 关键点：**这里只是注册，不是执行！** 执行时机是在每个 Bean 实例化的前后
    

#### 7\. initMessageSource () 🌍 初始化国际化消息源

*   如果容器中没有定义`messageSource` Bean，使用默认的`DelegatingMessageSource`
    
*   用于处理国际化消息，支持多语言
    

#### 8\. initApplicationEventMulticaster () 📢 初始化事件广播器

*   如果容器中没有定义`applicationEventMulticaster` Bean，使用默认的`SimpleApplicationEventMulticaster`
    
*   Spring 事件机制的核心，所有`ApplicationEvent`都通过它广播
    

#### 9\. onRefresh () 🔥 子类扩展核心点

*   空方法，留给子类重写，在上下文刷新时执行特殊逻辑
    
*   🔥 超级重点：**SpringBoot 的嵌入式 Tomcat 就是在这里启动的！** 由`ServletWebServerApplicationContext`实现
    

#### 10\. registerListeners () 👂 注册事件监听器

*   扫描所有实现了`ApplicationListener`接口的 Bean
    
*   将它们注册到事件广播器中
    
*   广播之前还未处理的早期 ApplicationEvent
    

#### 11\. finishBeanFactoryInitialization () 🔥 实例化核心步骤

*   初始化所有**非懒加载**的单例 Bean
    
*   完整的 Bean 生命周期在这里执行： `实例化` → `属性填充` → `初始化（afterPropertiesSet/init-method）`
    
*   🔥 超级重点：**AOP 代理在这里生成！** 由`AnnotationAwareAspectJAutoProxyCreator`这个 `BeanPostProcessor` 的`postProcessAfterInitialization`方法生成代理对象
    

#### 12\. finishRefresh () ✅ 完成上下文刷新

*   初始化生命周期处理器`LifecycleProcessor`
    
*   调用所有实现了`Lifecycle`接口的 Bean 的`start()`方法
    
*   发布`ContextRefreshedEvent`事件（SpringBoot 的`ApplicationReadyEvent`在此之后发布）
    
*   标记上下文刷新完成
    

### 💎 一张图总结关键时序：

```
[启动] → 准备环境/属性 → 创建BeanFactory → 加载BeanDefinition                                      ↓                          BeanFactoryPostProcessor 修改 BD                                      ↓                          注册 BeanPostProcessor (不执行)                                      ↓                  ┌───────────────────────┐                  │  initMessageSource等   │                  │  事件多播器、注册监听器 │                  └───────────────────────┘                                      ↓                        finishBeanFactoryInitialization                         (实例化所有单例，依赖注入、AOP织入)                                      ↓                         finishRefresh (发布已刷新事件)
```

### 💡 面试必问高频考点

**考点**

**标准答案**

🔥 `BeanFactoryPostProcessor` 和 `BeanPostProcessor` 的区别？

`BeanFactoryPostProcessor`

：作用于 `BeanDefinition`，在 Bean 实例化前执行  
`BeanPostProcessor`：作用于Bean 实例，在 Bean 实例化前后执行

🔥 AOP 代理是在哪个步骤生成的？

第 11 步`finishBeanFactoryInitialization()`中，Bean 初始化完成后

🔥 SpringBoot 嵌入式 Tomcat 启动时机？

第 9 步`onRefresh()`方法中

懒加载的 Bean 什么时候初始化？

不会在第 11 步初始化，只有 **第一次调用 getBean ()** 时才会实例化

为什么 `refresh ()` 要加 `synchronized` 锁？

防止多个线程同时刷新上下文，导致容器状态不一致

refresh() 过程中抛出异常，会发生什么？

Spring 会记录失败状态，然后调用 `destroyBeans()` 销毁已创建的 Bean，再调用 `cancelRefresh()` 重置状态，最后把异常抛出。  
这也是为什么 `refresh()` 失败后容器就不可用，必须重新建一个 `Context`。

总结一下，`refresh ()` 方法就是 Spring 容器从 "图纸" 到 "成品" 的完整过程：先准备环境，再加载 Bean 定义，然后执行各种后置处理器扩展，最后实例化所有非懒加载 Bean 并完成上下文初始化。整个流程预留了大量扩展点，这也是 Spring 生态如此强大的核心原因。

## Spring Bean 生命周期（实例化 → 属性赋值 → 初始化 → 销毁）

Spring Bean 的生命周期核心可以概括为 **4 大阶段 + N 个扩展点**，由 Spring IoC 容器全程管控。简单来说就是：**先把对象造出来 → 给对象的属性赋值 → 做初始化准备 → 最后销毁释放资源**。

### 四字真言只是骨架，真正灵魂在“扩展点”

Spring Bean 的生命周期，宏观确实就四步：

1.  **实例化** 🏗️
    
2.  **属性赋值** 🔗
    
3.  **初始化** ⚙️
    
4.  **销毁** 🗑️
    

但面试官真正想听的是夹在中间的 **Aware 接口**、**BeanPostProcessor**、**InitializingBean** 这些“钩子”。完整流程我画了张图，你一眼就能记住。

### 📊 完整生命周期流程图

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 超详细版

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

你可以按上图的顺序理解：“**创建→注入→Aware→前置处理→初始化三步曲→后置处理→就绪→销毁三步曲”**。

### 🔍 四大核心阶段深度解析

#### 1\. 实例化阶段 🧱

*   **核心操作**：调用 Bean 的构造方法，在堆内存中创建一个空的对象实例
    
*   **关键时机**：这是 Bean 生命周期的第一步，此时对象已经存在，但所有属性都是默认值（null/0/false）
    
*   **面试点**：如果有多个构造方法，Spring 会按照 "无参构造优先" 的规则选择，没有无参构造会抛出异常
    

#### 2\. 属性赋值阶段 📝

*   **核心操作**：完成依赖注入（DI），给 Bean 的所有属性赋值
    
*   **关键时机**：对象已经创建，但还没有进行任何自定义初始化
    
*   **面试点**：Spring 的循环依赖问题就是在这个阶段解决的（通过三级缓存提前暴露半成品对象）
    

#### 3\. 初始化阶段 ⚙️

这是**面试最高频考点**，也是我们自定义 Bean 行为最常用的阶段，包含 3 种初始化方式，执行顺序固定：

1.  **@PostConstruct 注解方法**（JSR-250 标准，推荐使用）
    
2.  **InitializingBean 接口的 afterPropertiesSet () 方法**（Spring 内置接口）
    
3.  **自定义 init-method 方法**（XML 或 `@Bean (initMethod="xxx")` 配置）
    

💡 面试必问：为什么有这么多初始化方式？

*   解耦：@PostConstruct 不依赖 Spring，代码可移植性更好
    
*   历史兼容：init-method 是 Spring 早期的方式，现在逐渐被注解取代
    

📍 **面试官最爱问**：AOP 动态代理是在哪一步生成的？

答：90% 在 `postProcessAfterInitialization` 里，Spring 会判断是否需要包装成代理对象。

#### 4\. 销毁阶段 🗑️

*   **触发条件**：只有当 Spring 容器正常关闭时，才会执行销毁逻辑（单例 Bean 才会被销毁，原型 Bean 不会）
    
*   **执行顺序**：和初始化阶段一一对应
    

*   **@PreDestroy 注解方法**
    
*   **DisposableBean 接口的 destroy () 方法**
    
*   **自定义 destroy-method 方法**
    

*   **核心作用**：释放资源，比如关闭数据库连接、线程池等
    

##### ⭐ 最核心的扩展点：BeanPostProcessor

*   **作用时机**：在**所有 Bean**的初始化前后执行，是 Spring AOP、事务管理等功能的底层实现
    
*   **两个方法**：
    

*   `postProcessBeforeInitialization()`：初始化前调用
    
*   `postProcessAfterInitialization()`：初始化后调用
    

*   ⚠️ 注意：`BeanPostProcessor` 是全局的，会对容器中所有 Bean 生效，使用时要注意性能影响
    

### 🧩一张表总结扩展点执行顺序

阶段

扩展点 / 回调

作用

实例化前

`InstantiationAwareBeanPostProcessor`

可返回代理代替目标对象

属性赋值

依赖注入、`@Autowired` 等

装配成员变量

Aware 回调

`BeanNameAware`

 / `BeanFactoryAware` / `ApplicationContextAware`

获得容器资源

初始化前

`BeanPostProcessor.postProcessBeforeInitialization`

可修改 Bean，如属性填充

初始化

`@PostConstruct`

 → `InitializingBean` → `init-method`

自定义初始化逻辑

初始化后

`BeanPostProcessor.postProcessAfterInitialization`

**AOP 代理诞生地**

销毁前

`@PreDestroy`

 → `DisposableBean` → `destroy-method`

释放资源，关闭连接

### 🚀看完源码才有的加分点

*   **三级缓存解决循环依赖**：`singletonFactories` 存放半成品工厂，提前暴露对象引用。
    
*   `@DependsOn` 可以强制指定 Bean 初始化顺序。
    
*   **原型 Bean** 生命周期只到“就绪”，销毁不管，需要自己手动释放。
    
*   `SmartInitializingSingleton`：所有非懒加载单例 Bean 初始化完成后回调，适合做全局预热。
    

### 💬 最后送你的“面试话术”

“Spring Bean 的生命周期可以分为**实例化、属性赋值、初始化、销毁**四个阶段，中间穿插了 Aware 回调、`BeanPostProcessor` 前后置处理，以及 `InitializingBean`/`DisposableBean` 和 JSR-250 注解。初始化后的后置处理是 AOP 创建代理对象的位置。源码在 `AbstractAutowireCapableBeanFactory.doCreateBean()` 里体现得非常清楚。”

## Spring 三级缓存如何解决循环依赖？

### 先搞懂：什么是循环依赖？🔄

循环依赖指两个或多个 Bean 之间相互持有对方的引用，形成依赖闭环。

```
@Servicepublic class A {    @Autowired    private B b;}@Servicepublic class B {    @Autowired    private A a;}
```

A 需要 B，B 又需要 A，两者在创建时互相掐住脖子——这就是**循环依赖**。Spring 能搞定它的秘密武器就是三级缓存，咱们先认识下这三个“仓库”。

*   最典型场景：`A依赖B，B又依赖A`
    
*   ✅ Spring**默认仅支持单例 Bean 的 setter 注入循环依赖**
    
*   ❌ 不支持：构造器注入、多例 Bean 的循环依赖
    

### 核心：三级缓存分别是什么？📦

Spring 在`DefaultSingletonBeanRegistry`中定义了三个 Map，也就是我们说的三级缓存：

**缓存层级**

**缓存名称**

**存储内容**

**核心作用**

一句话总结

一级缓存

`singletonObjects`

**完全初始化完成**

的单例 Bean

存放最终可用的成品 Bean，直接对外提供

池子里泡好的茶，直接就能喝 🍵

二级缓存

`earlySingletonObjects`

**已实例化但未初始化**

的早期 Bean 引用

存放已经暴露但还没完成属性填充的半成品 Bean

半杯茶，叶子还在泡着 🍃

三级缓存

`singletonFactories`

Bean 的 `ObjectFactory` 工厂对象

存放 Bean 的工厂，用于延迟生成早期引用

茶厂的配方，现泡现用 🏭

关键：“半成品”指的是 Bean 已经 `new` 出来了，但属性还没填充（`@Autowired` 还没注入），还不是个完整的 Bean。

### 🧩 解决过程（灵魂画手上线）

假设先创建 A：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

文字走一遍，配合上面的图：

1.  Spring 先**实例化 A**（仅仅是 new，属性全是 null），把 A 的 `ObjectFactory` 丢进**三级缓存**。
    
2.  开始给 A 注入属性 `b`，发现容器里没有 B，转去创建 B。
    
3.  同样，**实例化 B**（空的），把 B 的工厂塞进三级缓存，然后给 B 注入属性 `a`。
    
4.  这时需要 A，去缓存放找：一级缓存里没有成品 A，但**三级缓存里有 A 的工厂**！
    
5.  调用工厂的 `getObject()` 拿到 A 的早期引用（这里有玄机，一会儿说），塞进**二级缓存**，同时删除三级缓存中 A 的工厂。
    
6.  B 拿到这个 A 的引用，注入成功，B 走完初始化流程，变成成品进入**一级缓存**。
    
7.  回到 A 的注入流程，此时 B 已经是成品了，A 顺利注入 B，自己也走完初始化，进入一级缓存。
    

🎉 大结局：A 和 B 都完整躺在 `singletonObjects` 里，谁也离不开谁，但都过得很好。

### 完整解决流程（图文并茂）📊

以A ↔ B的循环依赖为例，完整执行步骤如下：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 灵魂拷问：为什么必须是三级？两级行不行？🔑

这是面试必追问的点！**核心答案：为了正确处理 AOP 代理。**

💡 关键逻辑：

*   如果没有 AOP，两级缓存（一级 + 三级）其实完全够用
    
*   但如果 Bean 需要被代理（比如加了`@Transactional`、`@Async`），那么 B 拿到的必须是**代理后的 A 对象**，而不是原始对象
    
*   三级缓存存的是`ObjectFactory`，只有当真正需要获取早期引用时，才会调用`getObject()`方法生成代理对象
    
*   如果直接用二级缓存存原始对象，那么 B 拿到的就是原始 A，后续 A 被代理后，B 持有的还是原始对象，导致**事务失效、AOP 不生效**等严重问题
    

🔍 一句话总结：

*   一级缓存存成品；
    
*   二级缓存存“先头部队”（早期引用/半成品引用）；
    
*   三级缓存是“兵工厂”，按需生产早期引用，特别是需要代理时。
    

### 常见补充追问💡

#### 构造器注入为什么解决不了？

因为构造器注入是在实例化阶段完成依赖注入，此时 Bean 还没被放入三级缓存，无法提前暴露引用。

#### 多例 Bean 为什么解决不了？

多例 Bean 每次获取都会创建新的实例，Spring 不会提前缓存多例 Bean，因此无法提前暴露引用。

### 一句话总结✨

Spring 三级缓存通过 **“提前暴露工厂对象”+“延迟生成代理”** 的设计思想，在保证 AOP 正确性的前提下，完美解决了单例 Bean 的 setter 注入循环依赖问题，是 Spring 框架中非常经典的设计。

### 💡 面试回答浓缩版（适合直接问你的时候说）

“Spring 通过三级缓存来解决循环依赖。核心流程是：

1.  实例化 A 后，把能生产它的工厂放进三级缓存；
    
2.  注入 A 的属性 B 时发现没有 B，去创建 B；
    
3.  同样，B 实例化后工厂进三级缓存，注入属性 A 时，从三级缓存拿到 A 的工厂，调用它得到 A 的早期引用（若有 AOP 则返回代理），放入二级缓存；
    
4.  B 注入 A 完成，自己升级到一级缓存；
    
5.  返回头给 A 注入成品 B，A 也进入一级缓存。
    

三级缓存最核心的作用是解决**带 AOP 代理**的循环依赖，通过 `ObjectFactory` 延迟代理的生成时机，保证生命周期的完整性。”

## JDK 动态代理 vs CGLIB 动态代理

面试官您好！关于这两种动态代理，我从**实现原理、核心差异、性能对比、适用场景**四个维度给您做个清晰的对比：

### 核心实现原理 🧠

#### JDK 动态代理

*   **基于接口实现**：要求被代理类必须实现至少一个接口
    
*   **底层机制**：运行时动态生成一个实现了目标接口的代理类 `$Proxy0`
    
*   **调用方式**：通过 `java.lang.reflect.Proxy` + `InvocationHandler` 的 `invoke()` 方法反射调用目标方法
    

#### CGLIB 动态代理

*   **基于继承实现**：不需要被代理类实现接口
    
*   **底层机制**：运行时动态生成一个继承自目标类的子类
    
*   **调用方式**：通过 `MethodInterceptor` 的 `intercept()` 方法拦截方法调用
    
*   **技术依赖**：使用 ASM 字节码框架直接修改字节码生成子类
    

### 核心差异对比表 📊

**对比维度**

**JDK 动态代理**

**CGLIB 动态代理**

**实现方式**

实现目标接口

继承目标类

**被代理类要求**

必须实现接口

不能是 final 类

**底层技术**

Java 反射 API

ASM 字节码生成

**方法限制**

只能代理接口中定义的方法

不能代理 final 方法

**生成代理类速度**

快 ✅

慢 ❌

**方法调用速度**

JDK8+ 后与 CGLIB 相当

早期版本更快

**JDK 内置**

是 ✅

否，需引入第三方包

**Spring 默认策略**

有接口 → JDK；无接口 → CGLIB

也可强制使用 CGLIB（`proxyTargetClass=true`）

所以现在 **只要能用 JDK 动态代理，尽量用 JDK**——更轻量，还少依赖第三方包。Spring Boot 从 2.x 起对 AOP 的默认策略也是如此。

### 深度区别：深拷贝 vs 浅拷贝？不对，是“代理对象类型”的坑 ⚠️

面试官：你如果用 JDK 代理，注入的代理对象是什么类型？

👨‍💻 我：是**接口类型**，不是实现类。比如：

```
UserService userService = new UserServiceImpl(); // 目标// JDK 代理Object proxy = Proxy.newProxyInstance(    loader, interfaces, invocationHandler);// proxy instanceof UserService → true// proxy instanceof UserServiceImpl → false ❌
```

而 **CGLIB 生成的代理对象就是目标类的子类**，所以 `instanceof` 原类也 OK。这个区别在依赖注入、`@Autowired` 时有时会产生迷惑现象。

### 一张图看清调用流程 📊

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 性能表现 🏃‍♂️

*   **JDK 1.6 及之前**：CGLIB 方法调用速度比 JDK 动态代理快约 10 倍
    
*   **JDK 1.7**：JDK 动态代理性能大幅提升，差距缩小到 2-3 倍
    
*   \*\*JDK 1.8+\*\*：JDK 动态代理性能已经与 CGLIB 基本持平，甚至在某些场景下更快
    
*   **关键原因**：JDK 对反射进行了大量优化，引入了 `MethodHandle` 等机制
    

### Spring AOP 中的选择逻辑 🎯

Spring AOP 会根据被代理对象是否实现接口自动选择代理方式：

1.  如果目标对象**实现了接口**，默认使用 JDK 动态代理
    
2.  如果目标对象**没有实现接**口，强制使用 CGLIB 动态代理
    
3.  可以通过配置 `proxy-target-class="true"` 强制使用 CGLIB 代理
    

### 常见面试陷阱 ⚠️

#### CGLIB 可以代理任何类吗？

不能！不能代理 final 类，也不能代理 final 方法，因为继承机制无法重写 final 成员。

#### 为什么 JDK 动态代理必须基于接口？

因为生成的代理类已经继承了 `Proxy` 类，Java 不支持多继承，所以只能通过实现接口的方式扩展。

#### 两种代理方式在调用目标方法时有什么本质区别？

JDK 代理是通过反射调用目标方法，CGLIB 代理是通过子类直接调用父类方法。

#### 避坑小贴士 🩹

*   JDK 代理：如果你在 `@Configuration` 类里方法内部 `this.xxx()`，**代理会失效**，因为 `this` 是原生对象，不是代理。
    
*   CGLIB：不能代理 `final`，而且需要**无参构造**（CGLIB 是通过创建子类实例，需要调用父类构造器）。还有，如果目标类有返回 `this` 的链式调用，代理后的 `this` 可能是原对象，也要当心。
    
*   \*\*JDK 9+\*\*：模块化后需要开放反射权限，否则可能报 `InaccessibleObjectException`。
    

### 总结 ✨

*   **优先选择 JDK 动态代理**：当被代理类有接口时，性能好、无第三方依赖、更安全
    
*   **使用 CGLIB 的场景**：被代理类没有接口，或者需要代理非接口方法
    
*   **Spring Boot 2.x 及以上**：默认已经强制使用 CGLIB 代理，简化了配置
    

## Spring 事务传播行为与隔离级别

### 先搞懂：两者到底解决什么问题？🤔

*   **隔离级别**：解决**多个事务并发执行**时的数据一致性问题（脏读、不可重复读、幻读）
    
*   **传播行为**：解决**多个事务方法相互调用**时，事务如何在这些方法间传递的问题
    

一句话总结：隔离级别管 "别人"，传播行为管 "自己人"

### 事务隔离级别 🛡️

#### 并发事务会引发的 3 个问题

**问题类型**

**定义**

**通俗解释**

脏读

一个事务读取了另一个事务**未提交**的数据

别人改了还没提交，你就看到了，结果别人回滚了，你白读了

不可重复读

同一个事务内，两次读取同一行数据，结果不一样

你读了一条数据，别人改了并提交，你再读就不一样了

幻读

同一个事务内，两次查询同一条件，结果集行数不一样

你查了符合条件的 10 条数据，别人插入了 1 条，你再查就 11 条了

#### Spring 支持的 5 种隔离级别

**隔离级别**

**含义**

**解决的问题**

**MySQL 默认**

**Oracle 默认**

ISOLATION\_DEFAULT

使用数据库默认的隔离级别

\-

✅

✅

ISOLATION\_READ\_UNCOMMITTED

读未提交

无

❌

❌

ISOLATION\_READ\_COMMITTED

读已提交

脏读

❌

✅

ISOLATION\_REPEATABLE\_READ

可重复读

脏读、不可重复读

✅

❌

ISOLATION\_SERIALIZABLE

串行化

所有问题

❌

❌

⚠️ 注意：隔离级别越高，数据一致性越好，但并发性能越差。生产环境一般用**读已提交**或**可重复读**。

⚡ 重点：**Spring 的隔离级别要跟数据库对齐，你设了不一定就是最终行为**，MySQL InnoDB 在 `REPEATABLE_READ` 下通过间隙锁已经规避了大量幻读。

#### 场景举例 🌰

*   报表统计：用 `READ_COMMITTED`，避免快照太旧，同时不可重复读对最终统计影响可接受。
    
*   库存扣减：用 `REPEATABLE_READ`，防止统计与扣减过程中数据变化，结合乐观锁。
    
*   转账状态校验：`SERIALIZABLE` 极少用，会退化成排队，一般用 `SELECT ... FOR UPDATE` 精准锁定。
    

### 事务传播行为 🚀

这是**面试必考点**！我理解这就是**事务方法之间互相调用时，事务如何“蔓延”的规则**。Spring 定义了 7 种传播行为，我按**常用程度**排序说明：

#### 核心传播行为（前 3 个占 90% 使用场景）

**传播行为**

**含义**

**通俗解释**

**使用场景**

PROPAGATION\_REQUIRED

如果当前有事务，就加入；没有就新建一个

"有就蹭，没有就自己开"

默认值，绝大多数业务场景

PROPAGATION\_REQUIRES\_NEW

不管当前有没有事务，都新建一个事务

"老子自己开一个，跟你们没关系"

需要独立事务的场景（如日志记录）

PROPAGATION\_NESTED

如果当前有事务，就嵌套在里面执行；没有就新建

"子事务，父事务回滚我也回滚，我回滚不影响父"

复杂业务，需要部分回滚的场景

#### 其他传播行为（了解即可）

**传播行为**

**含义**

PROPAGATION\_SUPPORTS

有事务就加入，没有就以非事务方式执行

PROPAGATION\_NOT\_SUPPORTED

以非事务方式执行，如果有事务就挂起

PROPAGATION\_MANDATORY

必须在事务中执行，没有就抛异常

PROPAGATION\_NEVER

必须以非事务方式执行，有事务就抛异常

#### 传播行为执行流程图 📊

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 两者如何组合理解？看这张图 🔍

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一句话总结：**Propagation 管事务的“范围”，Isolation 管数据读写的“干净程度”**。

### 面试高频陷阱题 💣

#### REQUIRES\_NEW 和 NESTED 的区别？

*   REQUIRES\_NEW：完全独立的两个事务，B 回滚不影响 A，A 回滚也不影响 B
    
*   NESTED：B 是 A 的子事务，A 回滚 B 一定回滚，B 回滚不影响 A（只要捕获异常）
    

#### 什么情况下事务会失效？

*   方法不是 public 的
    
*   同类内部调用（this 调用）
    
*   异常被 `try-catch` 吃掉了
    
*   数据库引擎不支持事务（如 MyISAM）
    

#### Spring 事务的底层实现原理？

*   基于 AOP 动态代理
    
*   声明式事务：通过 `@Transactional` 注解
    
*   编程式事务：通过 `TransactionTemplate`
    

#### 自调用失效

*   同类里方法 A 调 B，B 的 `@Transactional` 不生效，因为绕过了代理。
    
*   👉 解决办法：注入自己，或用 `AopContext.currentProxy()` 拿到代理再调。
    

#### REQUIRES\_NEW 回滚误解

主事务和子事务独立提交，但主事务回滚不会自动回滚已提交的子事务，要自行补偿。

#### NESTED 仅支持 JDBC

用了 JPA/Hibernate，底层如果共享连接但不支持 savepoint，会直接降级，别想当然。

#### MySQL RR 隔离级别下的间隙锁死锁

高并发写，要缩小范围，避免不必要锁定间隙。

### 总结 📝

*   隔离级别：解决**并发**问题，关注数据一致性
    
*   传播行为：解决**嵌套调用**问题，关注事务边界
    
*   记住：**REQUIRED 是默认，REQUIRES\_NEW 独立，NESTED 嵌套**
    
*   生产环境：隔离级别用读已提交，传播行为用 REQUIRED
    

## Spring 事务失效的常见场景

面试官您好，Spring 事务失效是面试高频题，也是线上最容易踩的坑之一。它的**核心本质**其实很简单：Spring 的声明式事务基于**AOP 动态代理**实现，只有通过 Spring 生成的**代理对象**调用目标方法，事务切面才能拦截并执行增强逻辑。所有失效场景，本质上都是「代理没生效」或「切面没感知到需要回滚」。⚠️

我整理了工作中最常见的 10 种失效场景，按出现频率从高到低给您说明：

### Top10 高频失效场景

#### 1.❌ 同类内部方法调用（this 调用）

*   原因：`this`指向当前业务对象，而非 Spring 生成的代理对象，直接绕过了事务切面
    
*   解决：✅ 注入自身代理对象 ✅ 拆分为两个独立 Service ✅ 开启`@EnableAspectJAutoProxy(exposeProxy = true)`后用`AopContext.currentProxy()`调用
    

#### 2.❌ 异常被 try-catch 捕获且未抛出

*   原因：事务切面只有在方法抛出**未捕获的异常**时，才会触发回滚逻辑
    
*   解决：✅ 不捕获异常，向上抛出 ✅ 捕获后抛出`RuntimeException` ✅ 手动设置`transactionStatus.setRollbackOnly()`
    

#### 3.❌ 异常类型不匹配

*   原因：`@Transactional`默认只回滚`RuntimeException`和`Error`，checked 异常（如`IOException`、`SQLException`）不会触发回滚
    
*   解决：✅ 统一配置`@Transactional(rollbackFor = Exception.class)`（行业最佳实践）
    

#### 4.❌ 方法不是 public 修饰

*   原因：Spring AOP 基于 JDK/CGLIB 动态代理，非 public 方法无法被代理增强
    
*   解决：✅ 将事务方法改为 public 修饰
    

#### 5.❌ 数据库引擎不支持事务

*   原因：MySQL 的 MyISAM 引擎不支持事务，只有 InnoDB 引擎支持
    
*   解决：✅ 修改表引擎：`ALTER TABLE table_name ENGINE=InnoDB`;（MySQL 5.5 + 默认 InnoDB）
    

#### 6.❌ 事务传播属性配置错误

*   原因：使用了不支持事务的传播属性，如`SUPPORTS`、`NOT_SUPPORTED`、`NEVER`
    
*   解决：✅ 绝大多数场景使用默认的REQUIRED即可，需要独立事务时用`REQUIRES_NEW`
    

#### 7.❌ 方法被 final/static 修饰

*   原因：final/static 方法无法被动态代理重写，事务切面无法生效
    
*   解决：✅ 移除 final/static 修饰符
    

#### 8.❌ 多线程环境下调用

*   原因：事务是**线程绑定**的，不同线程的事务相互独立
    
*   解决：✅ 将事务逻辑放在同一个线程中执行 ✅ 复杂场景使用分布式事务（如 Seata）
    

#### 9.❌ 类没有被 Spring 管理

*   原因：没有加`@Service`/`@Component`等注解，对象不是 Spring 容器中的 Bean
    
*   解决：✅ 给类添加 Spring 注解，交由容器统一管理
    

#### 10.❌ 嵌套事务导致外层不回滚

*   原因：内层方法使用·传播属性，会开启独立事务，内层异常不会影响外层事务
    
*   解决：✅ 根据业务需求调整传播属性 ✅ 统一在最外层处理异常
    

### 事务失效核心原因分类图（一目了然）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 📊 一图胜千言：Spring 事务失效排查路径  

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 避坑速查表（面试加分项）

**错误做法**

**正确做法**

**关键备注**

`this.事务方法()`

`((Service)AopContext.currentProxy()).方法()`

必须开启`exposeProxy = true`

捕获异常后只打印日志

捕获后抛出异常或手动回滚

切面无法感知方法内部异常

不指定`rollbackFor`

`@Transactional(rollbackFor = Exception.class)`

避免 `checked` 异常不回滚

事务方法写 `private`/`protected`

改为 `public`

Spring AOP 强制要求

使用 MyISAM 引擎

改为 InnoDB

支持事务和行级锁

### 面试加分总结

如果你想在面试中脱颖而出，记住下面这条本质规律：

```
Spring 事务 = AOP 代理 + ThreadLocal 绑定连接 + 异常回滚规则失效根源就三类：① 根本没进代理（非 public、final、同类 this 调用）② 代理进去了但异常没触发回滚（吞异常、受检异常未声明）③ 资源或环境问题（引擎不支持、多线程、传播行为错误）
```

日常编码避坑口诀：

```
public 方法加注解，同类调用要绕路。异常莫吞往外吐，rollbackFor 看清楚。
```

以上就是最常见的事务失效场景，其中前 4 种占了 90% 以上的线上问题。在实际开发中，我会养成两个习惯：

① 写事务方法时先确认 public 修饰和 rollbackFor 配置；

② 写完后通过单元测试验证事务回滚逻辑。对于复杂的事务场景，我会优先使用**编程式事务**，它比声明式事务更灵活，也更容易排查问题。✅

## @Autowired 与 @Resource 区别

个问题我从**四个维度**来聊：**来源、注入策略、属性支持、推荐场景**。

### 💡 一句话核心总结

`@Autowired` 是**Spring 亲儿子**（Spring 框架专属注解），默认**按类型注入**；`@Resource` 是**Java 标准儿子**（JSR-250 规范定义），默认**按名称注入**。两者本质都是实现依赖注入，但底层逻辑和使用细节差异很大。

### 📊 核心区别对比表（面试必背）

**对比维度**

**@Autowired**

**@Resource**

所属来源

Spring 框架（`org.springframework.beans.factory.annotation`）

Java 官方标准（`javax.annotation.Resource`，JDK1.6+）、`jakarta.annotation`

默认注入策略

先**byType**（按类型），找不到再**byName**（按名称）

先**byName**（按名称），找不到再**byType**（按类型）

支持的注入方式

仅支持 `byType` + `byName`（需配合 `@Qualifier`）

支持 `byName`、`byType`、同时指定 `name` 和 `type`

`@Primary`

 支持

✅ 支持（优先选择标记 `@Primary` 的 Bean）

❌ 不支持（指定 name 后直接按名称匹配，忽略 `@Primary`）

`@Qualifier`

 支持

✅ 支持（精确指定 Bean 名称）

✅ 支持（但更推荐直接用 `@Resource` 的 name 属性）

必需性要求

默认 `required=true`，找不到 Bean 直接报错

无 `required` 属性，找不到 Bean 直接报错

底层处理器

`AutowiredAnnotationBeanPostProcessor`

`CommonAnnotationBeanPostProcessor`

适用范围

字段、构造器、setter 方法、普通方法

字段、setter 方法（不支持构造器注入）

### 🧩 注入优先级流程图（底层逻辑）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 🔍 深入一下关键差异

#### 1\. 来源 & 解耦思想

```
// Spring 家的，跟框架强耦合@Autowiredprivate UserService userService;// Java 标准注解，换了框架照样用 (比如从 Spring 换到 Jakarta EE 环境)@Resourceprivate UserService userService;
```

💡 这体现了 Java 标准化的解耦思想，不过在纯 Spring 项目里这个差异感知不强。

#### 2\. 注入策略——最容易踩的坑

```
// 假设容器中有两个 UserService 实现: userServiceImplA, userServiceImplB@Autowired  // ❌ 报错！它先按类型找 UserService，发现有俩实现，懵了private UserService userService;@Autowired  // ✅ 配合 @Qualifier 按名字兜底@Qualifier("userServiceImplA")private UserService userService;@Resource(name = "userServiceImplA") // ✅ 直接指定名称，干净利落private UserService userService;
```

##### 🧠 记忆技巧：

*   `@Autowired` 心里先想：“我要 UserService 类型的！” （byType）
    
*   `@Resource` 心里先想：“我要名字叫 **userService** 的！” （byName，默认字段名或方法名）
    
    ![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)
    

#### 3\. 属性设置的颗粒度

`@Resource` 的装配过程分两步：

*   **指定 name**：Spring 将 `name` 解析为 bean 名称，直接 byName 查找，**不会回退 byType**。效率最高、语义最明确。
    
*   **只指定 type**：按类型查找，此时行为类似 `@Autowired`，但没有 `required` 属性，缺了就炸。
    

### ⚠️ 3 个高频面试追问 & 踩坑点

#### 当有多个同类型 Bean 时，两者分别会怎么处理？

*   `@Autowired`：直接抛出`NoUniqueBeanDefinitionException`，需要用`@Qualifier("beanName")`指定具体 Bean
    
*   `@Resource`：先按字段名匹配，匹配到就注入；匹配不到再按类型匹配，多个同类型同样报错
    

#### @Resource(name="xxx") 和 @Autowired + @Qualifier("xxx") 效果一样吗？

*   99% 的场景下效果完全一致，都是精确按名称注入
    
*   唯一区别：`@Resource(name="xxx")` 找不到会直接报错，不会再回退到按类型查找
    

#### 为什么说@Resource耦合度更低？

*   `@Resource`是 Java 官方标准，不依赖 Spring 框架，理论上可以切换到其他支持 JSR-250 的 IoC 容器
    
*   `@Autowired`是 Spring 专属，只能在 Spring 环境中使用
    

### ✅ 实际开发最佳实践

1.  **优先使用@Resource**：代码更通用，耦合度低，默认按名称注入更符合直觉
    
2.  **需要构造器注入时用@Autowired**：`@Resource`不支持构造器注入，Spring4.3 + 推荐构造器注入
    
3.  **需要@Primary或@Nullable时用@Autowired**：这两个注解只有`@Autowired`支持
    
4.  **团队统一风格最重要**：不要在同一个项目中混合使用两种注解，避免混乱
    
5.  **两个注解的底层都是通过 BeanPostProcessor 实现的，但处理时机不同**。`AutowiredAnnotationBeanPostProcessor`会在 Bean 实例化之后、初始化之前处理注入；而`CommonAnnotationBeanPostProcessor`同时还处理`@PostConstruct`和`@PreDestroy`注解，执行顺序在`@Autowired`之后。
    

```
// 官方推崇的写法，可以不用任何注解，Spring 自动识别private final UserService userService;public UserController(UserService userService) {    this.userService = userService;}
```

## Spring 事件机制与监听器

Spring 事件机制是基于**观察者设计模式**实现的一套组件间解耦通信方案 📡。

它的核心思想是：**发布者不直接调用订阅者的方法，而是通过发送事件的方式通知所有感兴趣的订阅者**，从而实现发布者和订阅者之间的完全解耦。

### 🎭 三大角色，一个流程

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

*   **事件 Event**：想传递的信号，比如“订单已支付”
    
*   **发布者 Publisher**：通过 ApplicationEventPublisher 把事件扔出去
    
*   **监听器 Listener**：对事件作出反应，比如发短信、加积分
    

### 解决的核心问题

*   ✅ **代码解耦**：避免组件间硬编码依赖，符合开闭原则
    
*   ✅ **异步处理**：支持异步事件，提升系统吞吐量
    
*   ✅ **业务扩展**：新增业务逻辑只需添加新监听器，无需修改原有代码
    
*   ✅ **职责单一**：每个监听器只处理自己关心的事件
    

### Spring 事件机制核心三要素 🧩

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**组件**

**作用**

**对应接口 / 类**

**事件**

封装需要传递的信息

`ApplicationEvent`

**发布者**

负责发布事件

`ApplicationEventPublisher`

**监听器**

监听并处理特定事件

`ApplicationListener`

**事件广播器**

管理监听器并广播事件

`ApplicationEventMulticaster`

### Spring 事件的完整执行流程

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

#### 关键执行步骤：

1.  业务代码创建事件对象
    
2.  注入`ApplicationEventPublisher`并调用`publishEvent()`
    
3.  发布者将事件委托给`ApplicationEventMulticaster`
    
4.  广播器遍历所有注册的监听器，筛选出匹配该事件的监听器
    
5.  调用监听器的`onApplicationEvent()`方法处理事件
    

### 🛠️ 到底怎么用？（落地代码说话）

#### 1\. 定义事件

```
// 💰 订单支付成功事件public class OrderPaidEvent extends ApplicationEvent {    private final String orderId;    public OrderPaidEvent(Object source, String orderId) {        super(source);        this.orderId = orderId;    }    // getter...}
```

#### 2\. 发布事件

```
@Servicepublic class OrderService {    @Autowired    private ApplicationEventPublisher publisher;  // 📢 大喇叭    public void pay(String orderId) {        // 核心支付逻辑...        // 甩出事件，后续谁爱处理谁处理        publisher.publishEvent(new OrderPaidEvent(this, orderId));    }}
```

#### 3\. 监听事件——两种姿势

```
// 姿势一：实现 ApplicationListener 接口 (老派)@Componentpublic class CouponListener implements ApplicationListener<OrderPaidEvent> {    @Override    public void onApplicationEvent(OrderPaidEvent event) {        // 🎫 发放优惠券    }}// 姿势二：@EventListener 注解 (新派，更推荐✅)@Componentpublic class PointListener {    @EventListener    public void handleOrderPaid(OrderPaidEvent event) {        // 🎯 增加积分    }}
```

面试中**优先说 @EventListener**，因为能在一个类里处理多种事件，还能用 SpEL 做条件过滤。

### 🧠 执行流程深挖（文字图解）

结合源码用白话讲：

1.  `publishEvent` 把事件丢给 **事件广播器**`SimpleApplicationEventMulticaster`
    
2.  广播器找出所有匹配的监听器（从 `ListenerRetriever` 里取）
    
3.  默认按监听器注册顺序 **同步调用**，若配置了线程池则提交到线程池异步跑
    
4.  若是 `@TransactionalEventListener`，实际上会把监听器暂存，等事务同步 `TransactionSynchronization` 回调时才真正执行
    

```
📢 publishEvent → 🧠 广播器                     ├─ 同步监听器 🔗→ 直接调                     ├─ @Async 监听器 🧵→ 线程池                     └─ 事务监听器 ⏳→ 等事务提交/回滚回调
```

### Spring监听器

Spring 主要提供了**三种实现监听器的方式**，各有优缺点 📊

#### 方式 1：实现 ApplicationListener 接口

```
@Componentpublic class OrderCreatedListener implements ApplicationListener<OrderCreatedEvent> {    @Override    public void onApplicationEvent(OrderCreatedEvent event) {        // 处理订单创建事件    }}
```

*   ✅ 类型安全，编译期检查
    
*   ❌ 每个事件需要一个单独的类
    

#### 方式 2：使用 @EventListener 注解（推荐）

```
@Componentpublic class OrderEventListener {    @EventListener    public void handleOrderCreated(OrderCreatedEvent event) {        // 处理订单创建事件    }        @EventListener    public void handleOrderPaid(OrderPaidEvent event) {        // 处理订单支付事件    }}
```

*   ✅ 一个类可以处理多个事件
    
*   ✅ 代码更简洁，无需实现接口
    
*   ✅ 支持 SpEL 条件过滤：`@EventListener(condition="#event.orderAmount > 1000")`
    
*   ❌ 类型安全稍弱（运行期检查）
    

#### 方式 3：实现 SmartApplicationListener 接口

```
@Componentpublic class SmartOrderListener implements SmartApplicationListener {    @Override    public boolean supportsEventType(Class<? extends ApplicationEvent> eventType) {        return OrderCreatedEvent.class.isAssignableFrom(eventType);    }        @Override    public void onApplicationEvent(ApplicationEvent event) {        // 处理事件    }}
```

*   ✅ 支持更复杂的事件类型判断
    
*   ✅ 支持指定执行顺序（实现`Ordered`接口）
    
*   ❌ 代码相对繁琐
    

### Spring如何实现异步事件？

**Spring 事件默认是同步执行的** ⚠️。也就是说，`publishEvent()`方法会阻塞，直到所有监听器都处理完事件。

**实现异步事件的两种方式**

#### 方式 1：全局异步配置（推荐）

```
@Configuration@EnableAsyncpublic class AsyncConfig {    @Bean    public TaskExecutor taskExecutor() {        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();        executor.setCorePoolSize(5);        executor.setMaxPoolSize(20);        executor.setQueueCapacity(100);        executor.setThreadNamePrefix("event-async-");        executor.initialize();        return executor;    }}
```

然后在监听器方法上添加`@Async`注解：

```
@Async@EventListenerpublic void handleOrderCreatedAsync(OrderCreatedEvent event) {    // 异步处理}
```

#### 方式 2：自定义事件广播器

```
@Beanpublic ApplicationEventMulticaster applicationEventMulticaster() {    SimpleApplicationEventMulticaster multicaster = new SimpleApplicationEventMulticaster();    multicaster.setTaskExecutor(taskExecutor());    return multicaster;}
```

*   ✅ 所有事件默认异步执行
    
*   ❌ 无法灵活控制单个事件的同步 / 异步
    

### 🎯 什么时候用它？

#### ✅ 适合：

*   主流程做完需要异步发通知、打日志、数据同步
    
*   模块间极度解耦，比如下单后要调积分、库存、营销，互相不知道对方存在
    
*   需要事务保障的后续操作
    

#### ❌ 别用：

*   需要立刻拿到返回值且强依赖的业务逻辑
    
*   监听器过多导致流程不可控，排查问题像大海捞针 🌊
    

### Spring 事件机制常见的坑点💣

#### 坑点 1：同步事件导致性能问题

*   问题：如果某个监听器执行缓慢，会阻塞整个发布流程
    
*   解决：对耗时操作使用`@Async`异步处理
    

#### 坑点 2：异常传播问题

*   问题：默认情况下，某个监听器抛出异常会导致后续监听器无法执行
    
*   解决：
    

*   在监听器内部捕获异常
    
*   自定义`ErrorHandler`：
    

```
multicaster.setErrorHandler(e -> log.error("事件处理异常", e));
```

#### 坑点 3：事务问题

*   问题：事件发布在事务中，事务回滚但事件已经处理
    
*   解决：使用`@TransactionalEventListener`
    

```
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)public void handleAfterCommit(OrderCreatedEvent event) {    // 事务提交后再处理}
```

#### 坑点 4：循环依赖问题

*   问题：监听器依赖发布者，发布者又依赖监听器，导致循环依赖
    
*   解决：使用`@Lazy`注解延迟加载