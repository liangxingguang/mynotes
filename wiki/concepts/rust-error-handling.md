---
id: wiki-concept-rust-error-handling
type: concept
title: Rust 错误处理（Result/Option）
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
  - wiki/concepts/rust-ownership-borrowing.md
  - wiki/topics/java-to-rust-migration.md
---
# Rust 错误处理（Result/Option）

## Definition（定义）

Rust 把"缺失"与"失败"建模为值的错误处理范式：`Option<T>`（Some/None）表示可能缺失，`Result<T, E>`（Ok/Err）表示可能失败；失败经 `?` 传播，自定义错误枚举实现 `Display`/`Error`/`From`；仅不可恢复错误（违反程序不变量）触发 panic。这是 Rust 对照 Java exception 的核心机制。（信源第 11、15 章）

## Why It Matters（为什么重要）

- 失败路径进入类型签名，调用方必须显式处理；编译器验证未处理的失败，替代 Java checked exception 的强制声明与运行时 exception 流。
- 文章警告：不要把 `unwrap()` 当 Java 的"先写完再补异常处理"——业务失败应进入 `Result`。
- 错误枚举把错误分类与转换规则纳入类型设计，使错误处理具备可穷尽匹配性（新增错误变体时编译器提示修改所有 match 点）。

## Core Characteristics（核心特征）

1. **Option<T>**：`Some(T)`/`None` 替代可空引用；组合方法 map/and_then/ok_or/unwrap_or/unwrap_or_else；`if let`/`let else`/`while let` 处理单模式场景。
2. **Result<T, E>**：`Ok(T)`/`Err(E)`；`?` 在失败时提前返回并经 `From`/`Into` 机制做允许的错误转换——不是无条件吞错。
3. **自定义错误枚举**：实现 `Display`（可读输出）、`Error`（`source()` 定位底层原因）、`From`（底层错误自动转换）；信源示例 `ConfigError::{Read(io::Error), InvalidPort(ParseIntError), PortOutOfRange(u16)}`。
4. **unwrap/expect 纪律**：测试与原型可适量 unwrap；程序启动阶段已证不变量时用 expect 并说明为何不可能失败；用户输入、网络、文件、数据库失败应返回或转换错误；库代码不应替调用方决定 panic。
5. **panic 定位**：表示违反程序不变量、无法继续维持的情形，不是 checked exception 的替代品；默认展开栈并执行析构；子线程 panic 不会让所有线程立即停止，调用 `join()` 时可观察到失败。
6. **Option/Result 互转**：`get().ok_or(...)?`、`result.ok()` 等；文章建议不过度链式组合到难以定位失败语义——复杂业务流程用局部变量和 match 更清晰。

## Structure（结构）

错误处理体系分层（信源第 11、15、24 章）：

- 建模层：枚举（Option/Result/业务错误枚举）+ 模式匹配（match/if let/let else）
- 传播层：`?` 操作符 + From/Into 错误转换
- 终止层：panic（不可恢复错误）/ `ExitCode` + eprintln（进程退出策略，信源第 24 章 main 示例）

## How It Works（运作方式）

- 信源第 24 章示例：`UserError::{InvalidId, NotFound, RepositoryUnavailable}`；`service.get(0)` 校验失败返回 `InvalidId(0)`；仓储锁中毒映射为 `RepositoryUnavailable`；main 中业务级 `NotFound` 转为正常退出（打印 "user not found" 返回 Ok），其余错误输出 stderr 并以 `ExitCode::FAILURE` 结束——"业务失败 ≠ 进程崩溃"。
- `MemoryUserRepository::find_by_id` 返回拥有的 `User`（clone），避免锁守卫与生命周期进入公共 API——错误处理与所有权设计协同。
- `try_from`/`try_into` 用于可能失败的转换（如 u16→u8 截断）；`as` 转换可能截断或改变符号语义，协议/ID/用户输入不应依赖它。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rust-ownership-borrowing|Rust 所有权与借用]]：`?` 传播与 match 分支都涉及值的移动/复制语义；错误枚举可携带底层错误值（所有权转移）。

### Distinctions（区分）

- 与 Java exception：失败是类型中显式的值而非隐藏控制流；"强制处理"由编译器验证未处理的 Err 替代 checked exception 声明；panic 对应不可恢复错误，而 Java exception 覆盖从业务校验到运行时错误的全部层次。

## Evolution（演进）

- 文章未覆盖错误处理机制的历史演进（生态库如 thiserror/anyhow 仅被提及"大型应用常使用生态库减少错误样板代码"，未展开）。

## Open Questions（开放问题）

- 文章未比较 Rust 错误处理与 Go error 惯例；`?` 相对 throw 的性能开销无实测数据。

## Evidence（证据）

- Source: `raw/sources/misc/2026-11-03-weixin-java-rust-learning-guide.md`（信源第 11、15、24 章）

## Related Knowledge（相关知识）

- [[java-to-rust-migration|Java 到 Rust 迁移]]
- [[java-rust-learning-guide|Java工程师的Rust语言学习指南]]
