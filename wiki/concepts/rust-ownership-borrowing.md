---
id: wiki-concept-rust-ownership-borrowing
type: concept
title: Rust 所有权与借用
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: high
tags:
  - concept
  - rust
sources:
  - raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md
related:
  - wiki/concepts/rust-error-handling.md
  - wiki/concepts/rust-concurrency.md
  - wiki/topics/java-to-rust-migration.md
---
# Rust 所有权与借用

## Definition（定义）

Rust 的资源管理范式：每个值有一个所有者；同一时刻通常只有一个所有者；所有者离开作用域时值被自动清理（Drop）。其他代码只能通过共享借用 `&T` 或独占借用 `&mut T` 访问值，借用规则（多个只读或一个独占，二者不可共存）由编译器验证。这是 Rust 与 Java 最大的差异，也是其把资源所有权提前到编译期验证的核心机制。（信源第 6–8 章）

## Why It Matters（为什么重要）

- 对象生命周期不再由 GC 统一管理，而由代码静态结构决定；文章称这是 Java 工程师学 Rust "最困难的部分"（结语：资源关系也属于类型设计）。
- 所有权关系体现在函数签名上：接收 `&T` 只读、`&mut T` 修改、`T` 取得所有权，调用方从签名即可判断值的命运。
- 借用检查器把一类内存错误与数据竞争转为编译错误；文章建议把它当作"设计反馈工具"而非阻碍。

## Core Characteristics（核心特征）

1. **移动 move**：拥有堆资源的值（如 String）在赋值、传参时默认移动而非复制引用；旧绑定失效，防止两个所有者重复释放同一资源。
2. **Copy 与 Clone**：简单标量实现 `Copy`（便宜、隐式、按位复制）；深复制需显式 `clone()`。原则：不要为让编译器闭嘴而到处 clone()，先判断是否真的需要两个独立拥有的值。
3. **借用规则**：可同时多个 `&T`，或一个 `&mut T`；同一有效期间两者不可共存。借用检查按引用的实际最后使用位置分析（NLL 式），而非机械等待整个大括号结束。
4. **生命周期省略**：多数函数靠省略规则推断，引用关系不明确才显式标注；`'static` 两个常见含义——字面量/全局存储，或"不包含比程序生命周期更短的借用"（如 spawn 的 `T: 'static`）。
5. **返回值所有权**：函数返回值通过移动转移所有权（可做返回值优化）；返回对局部变量的引用会被编译器拒绝（悬垂引用）。
6. **RAII/Drop**：锁守卫、文件、socket、容器等离开作用域自动清理；可自定义 `Drop` 实现；析构不保证在所有异常路径执行（进程强制终止、泄漏、引用环）。

## Structure（结构）

所有权体系的分层（信源第 6–9、16 章）：

- 值层：所有者 + move/Copy/Clone
- 引用层：`&T` 共享借用 / `&mut T` 独占借用 / 生命周期标注
- 资源层：RAII + Drop、Box（堆分配/递归类型）、Rc/Arc（共享所有权，Arc 线程安全）、Cell/RefCell（单线程内部可变性）、Mutex（跨线程独占）

## How It Works（运作方式）

- 所有者离开作用域 → 自动执行 Drop 清理，等价于 Java try-with-resources 但推广到普通值与资源。
- 结构体更新语法 `..original`：未显式列出的字段从原结构体移入或复制；含非 Copy 字段时原值部分移动，后续不能整体使用。
- 持有引用的结构体需生命周期参数（`struct View<'a>`），且不能比被借用值活得更久；若生命周期参数在容器/trait/服务层广泛传播，文章建议改用拥有 String 而非长期持有 &str。
- 迭代期间修改容器会被借用检查直接拒绝：先构造新数据再合并（`iter().map(...).collect()` 后 `extend`），而非边迭代边 push。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rust-error-handling|Rust 错误处理（Result/Option）]]：Option/Result 同为枚举；`?` 传播与 match 分支都涉及值的移动语义。
- [[rust-concurrency|Rust 并发模型（Send/Sync/async）]]：Send/Sync 自动 trait 与借用规则建立在所有权模型之上。

### Distinctions（区分）

- 与 [[jvm-gc|JVM 垃圾回收]] 的根本差异：Java 以可达性分析+GC 统一管理对象生命周期，引用可为 null，循环引用由 GC 回收；Rust 以所有权/借用在编译期验证资源关系，安全引用非空，Rc 引用计数环需 `Weak<T>` 打破。GC 是运行时统一回收，所有权是词法作用域即时清理。

## Evolution（演进）

- 文章未覆盖所有权模型的历史演进（属语言稳定核心）；仅提及 Edition 机制是语言迁移边界（语法兼容），不改变所有权语义。

## Open Questions（开放问题）

- 文章未提供所有权模型相对 GC 的性能对照数据（"零成本抽象"论断未展开证据）。
- 复杂生命周期（自引用、Pin）的边界问题文章建议初学回避，具体规则需查官方 Reference。

## Evidence（证据）

- Source: `raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md`（信源第 2、6–9、16 章）

## Related Knowledge（相关知识）

- [[java-to-rust-migration|Java 到 Rust 迁移]]
- [[java-rust-learning-guide|Java工程师的Rust语言学习指南]]
