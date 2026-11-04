---
id: wiki-topic-java-to-rust-migration
type: topic
title: Java 到 Rust 迁移
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - topic
  - rust
  - java
sources:
  - raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md
---
# Java 到 Rust 迁移

## Scope（范围）

Java 工程师学习与迁移 Rust 的心智模型切换、语言特性映射、工程组织模式、常见陷阱与学习路径。以语言层面为主，不含 Rust 生态选型（Web 框架/ORM/异步运行时细节）与团队转型管理。

## Current Understanding（当前认知）

- **13 维整体对照**：执行模型（JVM 字节码/JIT/AOT vs 提前编译为本地机器码）、内存管理（GC vs 所有权+RAII）、空值（可为 null vs 安全引用非空、Option<T>）、主要抽象（class/interface/继承/组合 vs struct/enum/trait/组合）、多态（类继承/接口/泛型 vs trait 静态分派/dyn Trait 动态分派）、错误处理（exception vs Result<T,E>/panic）、可变性（默认可变 vs mut 显式开启）、资源释放（GC+try-with-resources vs 离开作用域 Drop）、并发安全（库/规范/运行时同步 vs Send/Sync/借用规则编译期验证）、包管理（Maven/Gradle vs Cargo）、构建单位（module/package/JAR vs package/crate/module/workspace）、反射（成熟 vs 有限，更多 trait/泛型/宏/代码生成）、ABI（JVM 内部统一 vs 不承诺跨编译器版本稳定，FFI 用 C ABI）。
- **六条心智模型切换**：①不要把 Rust 值想成 Java 对象引用（整数直接复制、String 默认移动）；②不要用 clone() 逃避所有权错误（先判断函数应拥有/借用/修改）；③不要设计类继承树（struct 存数据、trait 表达能力、enum 表达有限状态）；④不要把 unwrap() 当"先写后补异常"；⑤不要把 Arc<Mutex<T>> 当默认答案（先减少共享）；⑥不要一开始手写复杂生命周期（多数靠省略规则）。
- **语言特性映射**：class→struct+impl；interface→trait；extends→组合+trait；switch→match；Optional<T>→Option<T>；exception→Result<T,E>；try-with-resources→所有权作用域+Drop；synchronized/Lock→Mutex/RwLock guard；AtomicInteger→AtomicI32 等原子类型；CompletableFuture→Future+async 运行时；Maven/Gradle→Cargo；注解处理器→属性宏/派生宏/build script。
- **迁移示例（文章第 24 章）**：Spring 风格用户查询服务以 Rust 显式组合重写——trait 只描述 Service 实际依赖的仓储能力；无运行时组件扫描或反射注入；main 中显式组装对象；错误是可穷尽匹配的值；锁的生命周期由 guard 与作用域控制；编译器检查线程共享类型满足 Send+Sync。
- **18 个常见陷阱**：到处 clone()；结构体全持引用（业务实体更宜拥有 String）；String/&str 混用；过度 unwrap（外部输入/网络/文件/数据库失败应进 Result）；试图实现类继承；误以为 Arc<T> 使一切可变且线程安全（修改仍需 Mutex/原子，且 T 本身需线程安全）；长时间持锁（不让 guard 跨越慢 I/O 或 .await）；异步代码用同步锁跨 await；误解 move 闭包（move=取得捕获所有权，不代表新线程执行或只调一次）；所有动态行为写 Box<dyn Trait>（泛型有更强优化）；滥用 RefCell（运行时 panic，非绕过所有权的后门，非线程安全）；自引用结构体（移动后地址变化，涉及 Pin，初学避免）；依赖整数 as 转换（协议/ID/输入用 TryFrom）；误以为安全 Rust 不会死锁（锁顺序循环仍可死锁）；过早拆分大量 crate（crate 是编译与公共 API 边界）；忽视 MSRV；敏感类型随意派生 Debug（日志泄露）；用 panic 表达业务失败。
- **六条风格原则**：让签名表达所有权（&T 读/&mut T 改/T 拥有）；用类型排除非法状态（enum 建模状态机）；在边界解析、核心使用强类型；最小化公共 API；借用优先、拥有有据；先正确再优化（优化需基准/剖析数据）。
- **五阶段学习路线**：①语法与所有权（Rust Book 前十章核心练习，练命令行单词统计器）；②枚举、错误与 trait（订单状态机）；③工程化（package/crate/workspace、fmt/clippy/测试、feature/MSRV/Cargo.lock 策略，练 workspace+CI）；④并发与异步（Send/Sync/Arc/Mutex/channel、scoped thread、选一套 async runtime 理解 Future/取消/阻塞隔离，练受限并发任务处理器）；⑤高级主题（宏/Pin/自引用/unsafe/FFI/SIMD 等，由真实项目需求驱动，不必在能写业务程序前全部掌握）。
- **提交前 16 项清单**：fmt/clippy -D warnings/test 全过；release 与目标平台构建过；不用无意义 clone 掩盖所有权设计；外部输入与正常失败不 unwrap；unsafe 范围最小且记录安全不变量；不持锁慢 I/O 不跨 await；线程与异步任务有所有者与退出条件；错误保留来源、敏感信息不进日志；数值转换与溢出策略明确；公共 API 借用/拥有/错误语义清晰；feature 组合测试且可加；MSRV 声明并 CI 验证；依赖/许可证/供应链合规；性能优化有基准或剖析数据。

## Key Concepts（关键概念）

- [[rust-ownership-borrowing|Rust 所有权与借用]]
- [[rust-traits|Rust trait]]
- [[rust-error-handling|Rust 错误处理（Result/Option）]]
- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]

## Key Entities（关键实体）

- Cargo（包管理/构建/测试/发布工具链）
- Arc/Mutex/RefCell（共享状态三件套：跨线程共享所有权、独占内部可变性、单线程内部可变性）

## Major Developments（重大进展）

- 文章给出官方推荐阅读顺序：Rust Book → 编写小项目 → 标准库/Cargo 文档 → 按问题查 Reference → 有实际 unsafe 需求再读 Rustonomicon；明确反对先背完生命周期和 unsafe 规则再开始写程序。

## Disagreements（分歧）

- 单信源，无信源间冲突。文章内部"unwrap 只在测试中可接受"与"启动阶段已证不变量可用 expect"为互补表述（expect 应说明为何不可能失败），非矛盾。

## Open Questions（开放问题）

- 文章未提供 Rust 在实际 Java 项目中迁移成本与收益的对照数据；企业环境下的可行性（生态缺口、团队技能、工具链）未讨论。
- 文章未覆盖 Rust 与 Kotlin/Scala 等 JVM 语言在"无 GC 语言迁移"路径上的比较。

## Related Topics（相关主题）

- 信源页：[[java-rust-learning-guide|Java工程师的Rust语言学习指南]]
- 相邻主题：[[jvm-gc|JVM 垃圾回收]]（GC 统一管理对象生命周期的范式，与所有权/RAII 编译期验证范式直接相对）
