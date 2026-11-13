---
id: wiki-concept-rust-concurrency
type: concept
title: Rust 并发模型（Send/Sync/async）
status: active
created: 2026-11-05
updated: 2026-11-13
confidence: high
tags:
  - concept
  - rust
sources:
  - raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md
  - raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md
related:
  - wiki/concepts/rust-ownership-borrowing.md
  - wiki/topics/java-to-rust-migration.md
  - wiki/concepts/coroutine-scheduling.md
---
# Rust 并发模型（Send/Sync/async）

## Definition（定义）

Rust 并发编程范式：数据竞争防护由 `Send`/`Sync` 自动 trait 与借用规则在编译期验证；共享状态用 `Arc<Mutex<T>>` 等组合；消息传递用 channel；async/await 以惰性 Future 描述计算、由 executor 驱动。并发安全是语言设计的一部分，而非仅靠库与约定。（信源第 16、20、21 章）

## Why It Matters（为什么重要）

- 文章核心论断：Rust 并发安全属"编译期验证"（Send/Sync + 借用规则排除大量数据竞争），对照 Java 的"库、规范和运行时同步"。
- 文章同时强调边界：Rust 消除大量数据竞争，但不能自动防止死锁、活锁、业务竞争、资源耗尽与错误锁顺序——并发正确性仍需设计纪律。
- "不要把 Arc<Mutex<T>> 作为所有共享数据的默认答案"：先减少共享，再选择同步方式。

## Core Characteristics（核心特征）

1. **Send/Sync**：`Send`=类型的所有权可安全转移到另一线程；`Sync`=`&T` 可安全在线程间共享；多数安全组合类型由编译器自动推导 auto trait；`Rc<T>` 非 Send，`Arc<T>` 在内部类型满足条件时可跨线程；手工 `unsafe impl Send/Sync` 是高风险承诺，须证明全部内部不变量。
2. **线程与 scoped thread**：`thread::spawn` 要求捕获数据满足 `'static`（线程可能比当前函数活得久）；scoped thread 在作用域内借用局部数据（确定线程在作用域结束前完成）。
3. **Channel**：标准库 mpsc 为多生产者、单消费者；克隆发送端创建多生产者；所有发送端丢弃后接收端观察到断开。
4. **共享状态 Arc<Mutex<T>>**：Arc 提供跨线程共享所有权，Mutex 提供独占内部可变性，锁守卫离开作用域自动解锁；线程持锁 panic 可能使锁进入 poisoned 状态，调用方选择恢复或传播；缩小持锁范围（提取快照后释放锁再做慢 I/O），不持锁执行网络 I/O 或不受控外部调用。
5. **async/await**：Future 是惰性计算描述，调用 async fn 只产生 Future，需 executor poll 推进；标准库不提供完整异步运行时（定时器/异步 socket/任务调度由生态运行时提供）；阻塞 I/O 不混入异步任务（占用 executor 线程），用专用阻塞线程池或真异步 API；取消安全需设计（锁与连接释放、半写协议消息、重复扣款/写入）；同步 Mutex 守卫跨 `.await` 会阻塞 executor 或产生不可发送 Future。
   - **路线选择动因（第二信源）**：Rust 无 GC、无运行时栈布局信息，有栈协程（stackful）库基本只能用固定大小的栈（栈溢出是最危险的 bug，不 panic 而静默写坏相邻内存，须靠 guard page 兜底）——这是 Rust 做协程相对 Go 的真实劣势。因此 Rust 生态最终选择 async/await **无栈协程**路线：编译器把状态机展开成一个结构体，不需要独立栈，也就没有栈溢出问题；代价是自引用结构（所以要 Pin）以及生态必须重写 IO（不能再直接用 `std::fs`/`std::net`）。
6. **Pin 初步**：异步状态机与自引用类型要求值在内存中不再移动，`Pin<P>` 以类型系统表达承诺；自引用正是无栈协程状态机的固有形态（第二信源补充的动因）；日常应用经 Box::pin/运行时 API/宏间接使用，初学不应手写复杂 Pin 投影。

## Structure（结构）

并发体系分层（信源第 16、20、21 章）：

- 类型层：Send/Sync auto trait + 借用规则（编译期验证）
- 工具层：Arc/Mutex/RwLock/原子类型/channel/scoped thread
- 执行层：thread/async executor（生态运行时）
- 治理层：锁顺序、临界区最小化、取消安全、任务所有者与退出条件

## How It Works（运作方式）

- 信源第 20 章示例：4 线程 + `Arc<Mutex<u64>>` 计数器，锁守卫增量、作用域退出自动解锁；文章强调先取快照再持锁外做慢 I/O。
- Java 并发映射：Thread→`std::thread::spawn`/JoinHandle；BlockingQueue→channel；synchronized/Lock→Mutex/RwLock guard；AtomicInteger→AtomicI32 等；CompletableFuture→Future+async 运行时；不可变共享对象→Arc<T>（内部 T 仍需满足线程安全约束）。
- 常见组合选型表：单线程共享只读 `Rc<T>`；单线程共享且需内部修改 `Rc<RefCell<T>>`；多线程共享只读 `Arc<T>`；多线程共享且需修改 `Arc<Mutex<T>>` 或 `Arc<RwLock<T>>`；打破引用计数环 `Weak<T>`。文章强调这些不是固定处方——能用普通所有权、借用或消息传递解决时更简单。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rust-ownership-borrowing|Rust 所有权与借用]]：Send/Sync 与借用规则建立在所有权模型之上；Box/Rc/Arc/RefCell/Mutex 是所有权模型的资源层工具。

### Distinctions（区分）

- 与 Java 并发：Java 的 synchronized/锁/原子均可在编译期被误用（竞态到运行时才暴露）；Rust 在编译期排除一类数据竞争，但死锁、业务竞争、资源耗尽仍需设计治理——"安全 Rust 不会死锁"是误解。

## Evolution（演进）

- 文章未覆盖并发机制的历史演进；async 运行时属生态层，标准库只定义 Future 等基础机制。
- 第二信源补充 Rust 并发路线的演进动因：有栈协程受固定栈约束（无 GC、无运行时栈布局信息），生态从 stackful 协程转向 async/await 无栈协程（状态机展开为结构体、无独立栈、无栈溢出，代价 Pin + IO 生态重写）。

## Open Questions（开放问题）

- 文章未比较具体 async 运行时（tokio 等）的选型依据；第二信源只论证了 async 路线的动因与代价（Pin、IO 生态重写），运行时选型仍未覆盖。
- 取消安全的具体模式（如 select!、守护任务）文章未展开，属进阶主题。

## Evidence（证据）

- Source: `raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md`（信源第 16、20、21 章）
- Source: `raw/sources/architecture/2026-11-13-rust-coroutine-scheduler-mn.md`（async/await 无栈协程路线动因与代价、Pin 自引用原因）

## Related Knowledge（相关知识）

- [[java-to-rust-migration|Java 到 Rust 迁移]]
- [[java-rust-learning-guide|Java工程师的Rust语言学习指南]]
- [[coroutine-scheduling|协程调度（M:N）]]（有栈协程 vs 本页 async 无栈协程路线对照）
