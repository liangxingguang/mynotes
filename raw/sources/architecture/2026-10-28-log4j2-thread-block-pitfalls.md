---
title: 日志导致线程Block的这些坑，你不得不防
source: 美团技术团队（微信公众号）
source_url: https://mp.weixin.qq.com/s/nowNpIOHBFHD0pctcKr2UA
source_type: article
platform: wechat
captured: 2026-10-28
registered_at: 2026-10-31
inbox_ref: Inbox/2026-10-28-log4j2-thread-block-pitfalls.md
asset_ref: Assets/2026/10/log4j2-thread-block-pitfalls.md
---

# 日志导致线程Block的这些坑，你不得不防

> 来源：https://mp.weixin.qq.com/s/nowNpIOHBFHD0pctcKr2UA
> 美团技术团队（总第525篇，2022年第042篇），作者：志洋、陈超、李敏、凯晖、殷琦等（美团基础技术部-应用中间件团队）

研发人员在项目开发中不可避免地要使用日志，通过它来记录信息和排查问题。Apache Log4j2 提供了灵活且强大的日志框架，虽然上手比较快，但稍有不慎也非常容易踩"坑"。本文介绍了美团统一 API 网关服务 Shepherd 在实践中所踩过的关于日志导致线程 Block 的那些"坑"，以及如何从日志框架源码层面进行分析和解决问题的过程，并在最后分享一些关于日志避"坑"的实践经验。

## 2. 背景

API 网关服务 Shepherd 基于 Java 语言开发，使用 Apache Log4j2 作为主要日志框架，同时使用美团内部的 XMD-Log SDK 和 Scribe-Log SDK 对日志内容进行处理。业务打印日志时，日志框架基于 Logger 配置来决定把日志交给 XMDFile 处理还是 Scribe 处理。其中，XMDFile 负责输出日志到本地磁盘，Scribe 负责上报日志到远程日志中心。

随着业务的快速增长，日志导致的线程 Block 问题愈发频繁。比如调用后端 RPC 服务超时，导致调用方大量线程 Block；再比如，业务内部输出异常日志导致服务大量线程 Block 等，这些问题严重影响着服务的稳定性。

运行环境：JDK 1.8.0_45，log4j-api/log4j-core/log4j-slf4j-impl 2.7。日志配置中使用 `<AsyncLogger>` 标签和 `<Async name="LogCenterAsync" blocking="false">`（内含 Scribe Appender）。

## 3. 踩过的坑

### 3.1 日志队列满导致线程Block

**问题现场**：收到"jvm.thread.blocked.count"告警，Blocked 线程堆栈显示与日志打印相关（INFO 级别）。当时日志量非常大，差不多每两分钟就写满一个 500MB 的日志文件。

**为什么会 Block 线程**：从 Blocked 线程堆栈着手分析，PrintStream 相关代码中被阻塞地方有 synchronized 同步调用，初步怀疑是日志量过大导致了线程阻塞。但有两个疑点：① 仅日志量大就 Block，日志框架也太不堪重用了；② 配置里明明输出到文件，怎么会输出到 Console PrintStream？

**为什么会输出到 Console**：AsyncAppender 内部维护一个 BlockingQueue（默认大小 128），日志量过大或异步线程处理不及时会导致队列打满。队列满时：

- blocking=true：按 AsyncQueueFullPolicy 策略处理（DISCARD 忽略 / SYNCHRONOUS 当前线程直接发送 / ENQUEUE 强制阻塞入队）。
- blocking=false：由 ErrorHandler（默认 DefaultErrorHandler）和 ErrorAppender 处理失败日志。

本项目 blocking=false 且未配置 error-ref。DefaultErrorHandler 内部有限流（两条日志处理间隔超过 5min 或异常数不超过 3 次才处理），但 `lastException` 与 `exceptionCount` 两个变量多线程访问无保护，存在线程安全问题（社区 Issue LOG4J2-3185，2.15.0 修复），多线程场景下可能有大量异常日志同时被处理。

真正处理日志的是 StatusLogger：若注册了 StatusListener 则由 StatusConsoleListener 处理，否则由 SimpleLogger 直接输出到 System.err。

**StatusConsoleListener 是怎么来的**：Log4j2 启动时加载配置文件创建 Configuration（如 XmlConfiguration），解析 `<Configuration>` 标签时创建 StatusConfiguration，初始化时创建并注册 StatusConsoleListener 到 StatusLogger 的 listeners 中。`<Configuration>` 标签属性：

- status：决定 StatusConsoleListener 级别，默认 ERROR。
- dest：决定输出流目的地，可选 out/err/URI，默认 System.out。

本项目未设置 dest，所以日志直接输出到 System.out。

**StatusLogger 有什么用**：StatusLogger 单例实现，输出日志到 Console。它存在的意义是解决日志初始化完成前的调试输出需求（官方：诊断 logging 配置自身的问题，避免正常日志未配置或 appender 内无限递归）。

**问题小结**：日志量过大导致 AsyncAppender 日志队列被打满，新的日志事件无法入队，进而由 ErrorHandler 处理日志，同时由于 ErrorHandler 存在线程安全问题，导致大量日志输出到了 Console，而 Console 在输出日志到 PrintStream 输出流时存在 synchronized 同步代码块，所以在高并发场景下导致线程 Block。

### 3.2 AsyncAppender导致线程Block

**问题现场**：Blocked 线程堆栈与日志打印相关（ERROR 级别），日志中有两种业务异常。

**为什么会 Block 线程**：线程阻塞在类加载流程上，WebAppClassLoader 加载类时会根据类名加 synchronized 同步块。疑点：① 只是普通输出一条 ERROR 日志，为何触发类加载？② 类加载通常不会 Block。

**为什么会触发类加载**：ThrowableProxy 构造函数会遍历整个异常堆栈中的所有堆栈元素，获取所有堆栈元素类所在的 JAR 名称和版本信息：先获取堆栈元素类名称，再通过 loadClass 获取 Class 对象，再从 CodeSource 获取 JAR 名称、从 Package 获取 JAR 版本。

注意：ThrowableProxy#toExtendedStackTrace 用 Map<String, CacheEntry> 缓存避免重复解析，但 put 的 key 来自 `StackTraceElement.toString()` 而 get 的 key 来自 `getClassName()`，两者返回值不同，缓存形同虚设（Issue LOG4J2-2389，2.11.1 修复了 key 不一致，但 Map 仍是每个 Throwable 新建，作用范围有限）。

**到底什么类加载不了**：对比两份业务异常堆栈，唯一不同在于 `sun.reflect.NativeMethodAccessorImpl` 与 `sun.reflect.GeneratedMethodAccessor261`——与 JVM 反射调用相关。JVM 反射调用分两种情况：

1. 默认使用 native 方法进行反射操作；
2. 一定条件下生成字节码进行反射操作，即生成 `sun.reflect.GeneratedMethodAccessor<N>` 类（反射调用方法的包装类，序号递增）。

默认情况下 DelegatingMethodAccessorImpl 代理 NativeMethodAccessorImpl，当反射调用次数超过阈值（inflationThreshold，默认 15），NativeMethodAccessorImpl 会通过字节码生成技术生成 MethodAccessorImpl 实现类并切换代理，优化反射调用速度（首次调用字节码方式慢 3-4 倍，后续快 20 多倍，这是 JVM 的 "Inflation" 机制）。

关键：生成类由 DelegatingClassLoader 类加载器定义，其他类加载器（如 WebAppClassLoader）无法加载该类，无法生成类缓存，导致每次加载都需遍历 JarFile，极大降低类查找速度；且类加载是 synchronized 同步调用，高并发下恶化，导致线程 Block。

**为什么要解析异常堆栈**：AsyncAppender 处理日志时先创建 LogEvent 快照 Log4jLogEvent（createMemento → serialize → LogEventProxy），无论 LogEvent 实际类型是 MutableLogEvent 还是 Log4jLogEvent，最终都会触发 getThrownProxy() 创建 ThrowableProxy 实例，并在其构造函数内触发解析、加载异常堆栈类。

**问题小结**：Log4j2 打印异常日志时，AsyncAppender 会先创建日志事件快照，并进一步触发解析、加载异常堆栈类。JVM 通过生成字节码的方式优化反射调用性能，但该动态生成的类无法被 WebAppClassLoader 类加载器加载，因此当大量包含反射调用的异常堆栈被输出到日志时，会频繁地触发类加载，由于类加载过程是 synchronized 同步加锁的，且每次加载都需要读取文件，速度较慢，从而导致线程 Block。

### 3.3 Lambda表达式导致线程Block

**问题现场**：Blocked 线程堆栈与"AsyncAppender导致线程Block"案例一样（阻塞在类加载上），但业务堆栈中没有任何与 JVM 反射调用相关的元素。特殊堆栈信息引起注意：

```
com.sankuai.shepherd.core.process.ProcessHandlerFactory$$Lambda$35/1331430278
```

**根因**：Lambda 表达式区别于匿名内部类，构建时不生成 class 文件，而是在运行时通过 invokeDynamic 指令动态调用，JVM 通过 ASM 字节码技术动态生成 `$$Lambda$` 形式的调用类，同样无法被 WebAppClassLoader 加载。异常堆栈类名包含 `$$Lambda$` 其实是 JDK 的一个 Bug（JDK-8145964、JDK-8158475），JDK9 已修复，JDK8 高版本如 8U171 也已修复（异常堆栈中不再出现 `$$Lambda$` 信息）。

**问题小结**：Log4j2 打印异常日志时，AsyncAppender 会先创建日志事件快照，并进一步触发解析、加载异常堆栈类。JDK 8 低版本中使用 Lambda 表达式所生成的异常堆栈类无法被 WebAppClassLoader 类加载器加载，因此当大量包含 Lambda 表达式调用的异常堆栈被输出到日志时，会频繁地触发类加载，由于类加载过程是 synchronized 同步加锁的，且每次加载都需要读取文件，速度较慢，从而导致了线程 Block。

### 3.4 AsyncLoggerConfig导致线程Block

先理清 Log4j2 的几个重要概念：

- `<Logger>` 标签：对应 LoggerConfig 类，同步分发日志事件到对应 Appender。
- `<AsyncLogger>` 标签：对应 AsyncLoggerConfig 类，内部使用 Disruptor 队列异步分发日志事件。
- Logger 类：同步日志实例；AsyncLogger 类：异步日志实例，内部使用 Disruptor 队列。
- `<Logger>` 标签和 Logger 类是完全不同的两个概念，不可混淆。

项目未配置 Log4jContextSelector 参数，使用的是同步 Logger（LoggerFactory.getLogger 获取 Logger 类实例而非 AsyncLogger），同时配置文件里配置了 `<AsyncLogger>` 标签，所以底层是 Logger + AsyncLoggerConfig 组合。

AsyncLoggerConfig 内部使用 Disruptor 队列（代理类 AsyncLoggerConfigDisruptor），日志事件进入 RingBuffer 时由 translator 填充元素字段。项目使用 ReusableLogEventFactory，由 MUTABLE_TRANSLATOR 负责初始化日志事件（MutableLogEvent.initFrom），此过程中调用 getThrownProxy() 创建 ThrowableProxy 实例，进而在 ThrowableProxy 构造函数内部触发解析、加载异常堆栈类。

**问题小结**：Log4j2 打印异常日志时，AsyncLoggerConfig 会初始化 Disruptor RingBuffer 日志元素字段，并进一步触发解析、加载异常堆栈类。JVM 动态生成的反射类无法被 WebAppClassLoader 加载，大量包含反射调用的异常堆栈输出到日志时频繁触发类加载（synchronized + 读文件），导致线程 Block。

## 4. 避坑指南

### 4.1 问题总结

日志异步处理流程：① 业务线程组装日志事件对象（创建快照/初始化字段）→ ② 日志事件入队（BlockingQueue 或 Disruptor RingBuffer）→ ③ 异步线程出队并输出至目的地（磁盘/日志中心）。

Log4j2 导致线程 Block 的主要潜在风险点：

1. **入队前**：组装日志事件时触发异常堆栈类解析、加载，引发线程 Block。
2. **入队时**：队列满无法入队，引发线程 Block。
3. **出队后**：格式化日志内容时触发异常堆栈类解析、加载，引发线程 Block。

①②处 Block 会直接影响业务线程池内所有线程；③处 Block 只影响日志异步线程（通常单线程，单个 Appender 不会 Block，多个异步 Appender 仍会彼此 Block）。**核心是避免日志事件在入队操作完成前触发线程 Block。**

### 4.2 对症下药

**入队前避免线程 Block**：

1. 日志事件入队前避免触发异常堆栈类解析、加载：
   - AsyncAppender 场景：自定义 Appender，用 `Log4jLogEvent.Builder(event).build()` 创建快照（不触发 ThrowableProxy 创建），代替 Log4j2 的 AsyncAppender。美团内部 Scribe-Log 的 AsyncScribeAppender 即是如此。
   - AsyncLoggerConfig 场景：换用非 ReusableLogEventFactory 的 LogEventFactory 规避，或换用 LoggerConfig（配置文件中不使用 `<AsyncLogger>` 标签，用 `<Logger>` 代替）。
2. 禁用 JVM 反射调用优化：调大 inflationThreshold 到 int 最大值，可回避反射类加载 Block，但损失反射性能、无法根治，且解决不了 Lambda 等非反射类问题。
3. 升级 JDK 修复 Lambda 类 Bug：可解决 Lambda 问题，但解决不了反射调用等，不能根治。

**入队时避免线程 Block**：

1. 队列满时忽略日志：blocking 场景可配置 `log4j2.AsyncQueueFullPolicy=Discard` 使用 DISCARD 策略；非 blocking 场景自定义 Appender，入队失败后直接忽略错误日志（AsyncScribeAppender 用 printDebugInfo 参数控制，默认 false 不输出 error）。
2. 自定义 ErrorHandler：仅适用于 API 方式创建的 Logger，不支持配置文件方式（Issue LOG4J2-2927）。
3. 关闭 StatusConfigListener：status=off 时 StatusLogger 会用 SimpleLogger 输出到 System.err，仍不解决问题；status=fatal 条件过于严苛，可能忽略重要 error 日志。

**出队后避免线程 Block**：显式配置日志输出样式 `%ex` 代替默认的 `%xEx`。

- `%ex`（ThrowablePatternConverter）：仅输出异常信息，format 内部不获取 ThrowableProxy 对象，不会触发解析、加载异常堆栈类。
- `%xEx`（ExtendedThrowablePatternConverter，默认）：额外获取扩展信息（JAR 名称和版本），format 内部调用 `event.getThrownProxy()`，一定会触发解析、加载异常堆栈类。

## 5. 最佳实践

1. 建议日志配置文件中对所有 Appender 的 PatternLayout 都增加 `%ex` 配置——若不显式配置，异常格式化默认是 `%xEx`，会打印异常扩展信息（JAR 名称和版本），可能导致业务线程 Block。
2. 不建议使用 AsyncAppender，建议自定义 Appender 实现——AsyncAppender 最新版本仍存在日志事件入队前触发加载异常堆栈类的问题。
3. 不建议生产环境使用 ConsoleAppender——输出到 Console 有 synchronized 同步操作，高并发场景极易导致业务线程 Block。
4. 不建议在配置文件中使用 `<AsyncLogger>` 标签——日志事件入队前就会触发加载异常堆栈类。如果希望使用 Log4j2 提供的异步日志 AsyncLogger，建议配置 `Log4jContextSelector=org.apache.logging.log4j.core.async.AsyncLoggerContextSelector` 参数，开启异步日志。

log4j2.xml 配置示例要点：所有 PatternLayout 带 `%ex`；用自定义 AsyncScribe 代替 Async；`<logger>` 代替 `<AsyncLogger>`；Console 仅本地调试使用。
