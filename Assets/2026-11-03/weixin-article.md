## 1\. 学习目标

读完本文后，你应当能够：

*   • 用 Java 的已有知识理解 Rust 的变量、类型、函数、结构体、枚举和模块；
    
*   • 掌握 Rust 最核心的所有权、移动、借用、生命周期和 RAII；
    
*   • 正确使用 `Option`、`Result`、模式匹配、泛型和 trait；
    
*   • 理解 `Box`、`Rc`、`Arc`、`RefCell`、`Mutex` 等指针与共享状态工具；
    
*   • 使用线程、channel、锁和 async/await 组织并发程序；
    
*   • 使用 Cargo 建立、测试、检查和发布 Rust 工程；
    
*   • 避免 Java 工程师初学 Rust 时最常见的内存、抽象和并发误区。
    

Rust 不是“带手动内存管理的 Java”，也不是“更安全的 C++ 语法变体”。它最重要的设计是：把资源所有权、别名规则和线程安全约束尽可能提前到编译期验证。

Java 工程师真正需要切换的心智模型是：

*   • 对象不会因为有引用存在就自动由 GC 统一回收；资源通常在所有者离开作用域时立即释放；
    
*   • 赋值可能移动值，而不是复制引用；
    
*   • `&T` 与 `&mut T` 是带规则的临时借用，不是可随意保存的普通对象引用；
    
*   • `enum` 可以携带不同类型的数据，是建模状态和失败的重要工具；
    
*   • trait 表达共享行为，但 Rust 没有类继承；
    
*   • 显式可变性、错误和并发边界是语言设计的一部分。
    

* * *

## 2\. Java 与 Rust 的整体对照

维度

Java

Rust

执行模型

JVM 字节码、JIT/AOT

通常提前编译为本地机器码

内存管理

垃圾回收

所有权 + RAII；无必需的全局 GC

空值

引用可为 `null`

安全 Rust 引用非空；可缺失值用 `Option<T>`

主要抽象

class、interface、继承、组合

struct、enum、trait、组合

多态

类继承、接口、泛型

trait 泛型静态分派、`dyn Trait` 动态分派

错误处理

exception

`Result<T, E>`

；不可恢复错误可 panic

可变性

变量通常可修改，对象字段按修饰符决定

默认不可变，使用 `mut` 显式开启

资源释放

GC + try-with-resources

离开作用域自动 `Drop`

并发安全

主要依靠库、规范和运行时同步

`Send`

、`Sync`、借用规则在编译期排除大量数据竞争

包管理

Maven/Gradle

Cargo

构建单位

module、package、JAR

package、crate、module、workspace

反射

JVM 运行时反射成熟

运行时反射有限，更多使用 trait、泛型、宏和代码生成

ABI

JVM 内部统一

Rust ABI 不承诺跨编译器版本稳定；FFI 常使用 C ABI

### 2.1 最重要的思维转换

1.  1\. 不要把所有 Rust 值想成 Java 对象引用。整数可以直接复制，`String` 默认移动，引用只是临时借用。
    
2.  2\. 不要用 `clone()` 逃避每一个所有权错误。先判断函数究竟应该拥有、借用还是修改数据。
    
3.  3\. 不要设计类继承树。用结构体存数据，用 trait 表达能力，用枚举表达有限状态。
    
4.  4\. 不要把 `unwrap()` 当作 Java 的“先写完再补异常处理”。业务失败应进入 `Result`。
    
5.  5\. 不要把 `Arc<Mutex<T>>` 作为所有共享数据的默认答案。先减少共享，再选择同步方式。
    
6.  6\. 不要一开始手写复杂生命周期。多数函数可以依靠生命周期省略规则；只有引用关系不明确时才显式标注。
    

* * *

## 3\. 工具链、Cargo 与第一个程序

### 3.1 Rust 工具链组成

*   • `rustup`：管理 Rust 工具链、目标平台和组件；
    
*   • `rustc`：Rust 编译器；
    
*   • `cargo`：创建项目、解析依赖、构建、测试、运行和发布；
    
*   • `rustfmt`：统一代码格式；
    
*   • `clippy`：提供 Rust 惯用法和常见错误检查；
    
*   • `rustdoc`：生成并测试文档。
    

安装后常用检查：

`rustc --version   cargo --version   rustup show   `

### 3.2 创建项目

`cargo new hello-rust   cd hello-rust   cargo run   `

生成结构：

`hello-rust/   ├── Cargo.toml   └── src/       └── main.rs   `

`src/main.rs`：

`fn main() {       println!("Hello, Rust!");   }   `

Java 对照：

`public class Main {       public static void main(String[] args) {           System.out.println("Hello, Java!");       }   }   `

关键点：

*   • Rust 顶层函数不需要放进 class；
    
*   • `fn` 声明函数；
    
*   • `println!` 末尾的 `!` 表示它是宏，而不是普通函数；
    
*   • 普通语句通常以分号结束；
    
*   • `main` 默认返回 `()`，也可以返回支持终止语义的 `Result`。
    

### 3.3 `Cargo.toml`

`[package]   name = "hello-rust"   version = "0.1.0"   edition = "2024"      [dependencies]   `

必须区分三个概念：

*   • Rust 版本：例如 1.98，是编译器工具链版本；
    
*   • Edition：例如 2024，是语言迁移边界和语法兼容机制；
    
*   • MSRV：项目声明支持的最低 Rust 编译器版本。
    

升级 Edition 不等于更换所有依赖，也不等于必须使用最新语言特性。不同 Edition 的 crate 可以存在于同一依赖图中。

### 3.4 常用 Cargo 命令

`cargo check                 # 快速类型检查，不生成最终可执行文件   cargo build                 # debug 构建   cargo build --release       # 优化构建   cargo run                   # 构建并运行默认二进制   cargo test                  # 运行单元、集成和文档测试   cargo fmt --check           # 检查格式   cargo clippy -- -D warnings # 把 Clippy 警告视为错误   cargo doc --open            # 生成并打开依赖文档   cargo tree                  # 查看依赖树   cargo update                # 在版本约束内更新锁定版本   `

* * *

## 4\. 变量、可变性、遮蔽与常量

### 4.1 默认不可变

Java：

`int count = 1;   count = 2;      final int maxRetry = 3;   `

Rust：

`let count = 1;   // count = 2; // 编译错误：默认不可变      let mut mutable_count = 1;   mutable_count = 2;      const MAX_RETRY: u32 = 3;   `

Rust 的不可变是名称绑定和可变访问规则的一部分，而不是要求对象图绝对深度不可变。内部可变性类型可以在共享引用下受控修改数据，后文会说明。

### 4.2 类型推断与显式类型

`let age = 18;          // 通常推断为 i32   let score: i64 = 100;   let enabled: bool = true;   let name: &str = "Alice";   `

编译器会根据上下文推断类型，但 Rust 仍是静态类型语言。一个变量不能在同一次绑定中从整数变成字符串。

### 4.3 遮蔽 shadowing

`let input = "42";   let input = input.trim();   let input: i32 = input.parse().expect("input must be an integer");   `

后一个 `let` 创建新的绑定并遮蔽旧绑定，可以改变类型。它不同于 `mut`：

`let mut value = 1;   value = 2;       // 同一绑定，类型必须不变   `

遮蔽适合表达数据经过校验、解析和转换后的阶段变化，但过度重复名称也可能降低调试可读性。

### 4.4 常量与静态变量

`const MAX_CONNECTIONS: usize = 100;   static APPLICATION_NAME: &str = "order-service";   `

*   • `const` 在使用处内联语义更强，必须显式类型，初始化表达式需满足常量求值要求；
    
*   • `static` 表示程序生命周期内唯一固定存储位置；
    
*   • 可变全局静态状态需要额外安全约束，业务代码应优先使用显式依赖和同步容器。
    

* * *

## 5\. 标量类型、类型转换与表达式

### 5.1 基本类型对照

Java

Rust

说明

`boolean`

`bool`

`true`

、`false`

`byte`

`i8`

Rust 还有无符号 `u8`

`short`

`i16`

Rust 还有 `u16`

`int`

`i32`

Rust 还有 `u32`

`long`

`i64`

Rust 还有 `u64`

无直接对应

`i128`

、`u128`

128 位整数

数组索引相关整数

`usize`

、`isize`

宽度与目标平台指针宽度相关

`float`

`f32`

`double`

`f64`

`char`

`char`

Rust `char` 是 Unicode 标量值，4 字节，不是 Java UTF-16 code unit

`String`

`String`

 / `&str`

拥有字符串与借用字符串切片

`void`

`()`

单元类型与唯一值

### 5.2 不做普遍隐式数值转换

`let small: i32 = 10;   let large: i64 = i64::from(small);   `

`as` 可以进行底层转换，但可能截断或改变符号语义：

`let value: u16 = 300;   let truncated = value as u8;   `

处理外部输入时优先使用可失败转换：

`let converted = u8::try_from(value)?;   `

### 5.3 整数溢出

不要依赖构建模式下不同的默认溢出行为。按业务意图选择：

`let checked = value.checked_add(1);       // Option<T>   let saturated = value.saturating_add(1);  // 饱和到边界   let wrapped = value.wrapping_add(1);      // 模运算回绕   let (result, overflowed) = value.overflowing_add(1);   `

金额、计数器、协议长度等边界应明确选择溢出策略。

### 5.4 语句与表达式

Rust 中代码块和许多控制结构都是表达式：

`let grade = if score >= 90 {       "A"   } else if score >= 60 {       "B"   } else {       "C"   };   `

代码块最后一个不带分号的表达式成为返回值：

`fn add(left: i32, right: i32) -> i32 {       left + right   }   `

加上分号会把表达式结果丢弃并得到 `()`：

`fn wrong_add(left: i32, right: i32) -> i32 {       left + right;       // 编译错误：函数实际得到 ()   }   `

* * *

## 6\. 所有权：Rust 与 Java 最大的差异

### 6.1 三条核心规则

可以先用简化规则理解所有权：

1.  1\. 每个值都有一个所有者；
    
2.  2\. 同一时刻通常只有一个所有者；
    
3.  3\. 所有者离开作用域时，值被自动清理。
    

`{       let name = String::from("Alice");       println!("{name}");   } // name 离开作用域，String 的堆内存被释放   `

这类似 Java 的 try-with-resources 所体现的词法生命周期，但 Rust 将它推广到普通值和资源，并通过 `Drop` 自动执行清理。

### 6.2 移动 move

Java 赋值对象变量通常复制引用：

`StringBuilder first = new StringBuilder("hello");   StringBuilder second = first;   first.append("!");   `

Rust 中拥有堆资源的值默认移动：

`let first = String::from("hello");   let second = first;      // println!("{first}"); // 编译错误：first 已移动   println!("{second}");   `

移动会让旧绑定失效，防止两个所有者重复释放同一资源。

### 6.3 `Copy` 与 `Clone`

简单标量通常实现 `Copy`：

`let first = 10;   let second = first;   println!("{first} {second}");   `

显式深复制通常使用 `clone()`：

`let first = String::from("hello");   let second = first.clone();   println!("{first} {second}");   `

原则：

*   • `Copy` 是便宜、隐式、按位复制语义；
    
*   • `Clone` 是显式复制，成本可能较高；
    
*   • 不要为了让编译器闭嘴而到处 `clone()`；
    
*   • 先确定调用方是否真的需要两个独立拥有的值。
    

### 6.4 函数参数也会移动或复制

`fn consume(value: String) {       println!("{value}");   }      let name = String::from("Alice");   consume(name);   // name 已不可用   `

如果函数只需要读取，应借用：

`fn print_name(value: &str) {       println!("{value}");   }      let name = String::from("Alice");   print_name(&name);   println!("{name}");   `

### 6.5 返回值转移所有权

`fn create_name() -> String {       String::from("Alice")   }      let name = create_name();   `

Rust 通常通过移动高效地转交所有权，编译器还可以执行返回值优化。不要因为担心复制而返回对局部变量的引用：局部值在函数结束时会被释放，编译器会拒绝悬垂引用。

* * *

## 7\. 借用与引用

### 7.1 共享借用 `&T`

`fn length(value: &String) -> usize {       value.len()   }      let name = String::from("Alice");   let size = length(&name);   println!("{name}: {size}");   `

更通用的签名通常接收字符串切片：

`fn length(value: &str) -> usize {       value.len()   }   `

这样既能接收 `&String`，也能接收字符串字面量和其他 `str` 切片。

### 7.2 可变借用 `&mut T`

`fn append_suffix(value: &mut String) {       value.push_str("-updated");   }      let mut name = String::from("Alice");   append_suffix(&mut name);   `

核心规则可简化为：

*   • 可以同时有多个共享引用 `&T`；
    
*   • 或者有一个独占可变引用 `&mut T`；
    
*   • 不能在同一有效期间同时使用共享引用和可变引用。
    

`let mut text = String::from("hello");   let shared = &text;      println!("{shared}");   let exclusive = &mut text; // shared 最后一次使用已结束，因此可以借用   exclusive.push('!');   `

现代借用检查按引用的实际最后使用位置分析，而不只是机械等待整个大括号结束。

### 7.3 借用规则防止迭代期间修改容器

Java 中下面代码可能抛并发修改异常：

`for (String item : items) {       items.add(item.toUpperCase());   }   `

Rust 通常直接拒绝同时迭代借用并修改容器：

`for item in &items {       // items.push(item.to_uppercase()); // 编译错误   }   `

应先构造新数据，再合并：

`let added: Vec<String> = items.iter().map(|item| item.to_uppercase()).collect();   items.extend(added);   `

### 7.4 重借用

可变引用本身不是 `Copy`，但调用函数时编译器常创建更短的重借用：

`fn clear(value: &mut String) {       value.clear();   }      let mut text = String::from("hello");   let reference = &mut text;   clear(reference);   reference.push_str("world");   `

理解“借用的借用”能帮助分析复杂调用，而不是一看到 `&mut` 就认为它被永久移动。

* * *

## 8\. 生命周期

生命周期描述引用之间的有效期关系，不会让对象活得更久，也不是运行时计时器。

### 8.1 大多数生命周期可省略

`fn first_word(value: &str) -> &str {       value.split_whitespace().next().unwrap_or("")   }   `

编译器根据省略规则推断输入与输出引用关系。

### 8.2 何时需要显式生命周期

当返回引用可能来自多个输入时，编译器需要知道关系：

`fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {       if left.len() >= right.len() {           left       } else {           right       }   }   `

`'a` 表示返回引用不会比两个输入引用共同可用的范围更长。它不是要求两者真实生命周期完全相同，也不会延长任何值。

### 8.3 持有引用的结构体

`struct View<'a> {       text: &'a str,   }      impl<'a> View<'a> {       fn new(text: &'a str) -> Self {           Self { text }       }   }   `

`View` 不能比其借用的 `text` 活得更久。

如果生命周期使业务对象难以传递，先判断它是否应该拥有 `String`，而不是长期持有 `&str`：

`struct User {       name: String,   }   `

### 8.4 `'static` 的两个常见含义

`let message: &'static str = "compiled into the program";   `

`&'static T` 表示引用可在整个程序期间有效。

泛型边界 `T: 'static` 通常表示 `T` 不包含比程序生命周期更短的借用，并不意味着值本身永远存在：

`fn spawn_owned<T>(value: T)   where       T: Send + 'static,   {       std::thread::spawn(move || drop(value));   }   `

不要用泄漏内存的方式强行获得 `'static`，也不要把所有生命周期问题都通过 `String`/`clone()` 粗暴掩盖。先明确所有权需求。

* * *

## 9\. 字符串、数组、切片与集合

### 9.1 `String` 与 `&str`

`let owned = String::from("hello"); // 拥有、可增长的 UTF-8 字符串   let borrowed: &str = &owned;       // 借用字符串切片   let literal: &'static str = "world";   `

常见函数签名：

`fn greet(name: &str) -> String {       format!("Hello, {name}")   }   `

输入只读时接收 `&str`，需要返回新拥有文本时返回 `String`。

### 9.2 字符串不能按整数直接索引

Rust 字符串保证 UTF-8，有些字符占多个字节，因此下面不合法：

`let text = String::from("你好");   // let first = text[0];   `

按字节或 Unicode 标量值遍历：

`for byte in text.bytes() {       println!("{byte}");   }      for character in text.chars() {       println!("{character}");   }   `

用户看到的字形可能由多个 Unicode 标量组成，`chars()` 仍不等于完整字形簇。文本截断和光标移动需要更高层 Unicode 处理。

### 9.3 数组与切片

`let array: [i32; 3] = [10, 20, 30];   let repeated = [0_u8; 1024];   let slice: &[i32] = &array[1..];   `

*   • `[T; N]` 是长度属于类型的定长数组；
    
*   • `&[T]` 是借用的连续元素视图；
    
*   • 函数只读接收任意连续序列时通常使用 `&[T]`。
    

`fn total(values: &[i64]) -> i64 {       values.iter().sum()   }   `

### 9.4 `Vec<T>` 对照 `ArrayList<T>`

`let mut values: Vec<i32> = Vec::new();   values.push(10);   values.push(20);      let values = vec![10, 20, 30];   `

安全访问：

`let first: Option<&i32> = values.get(0);   `

索引越界会 panic：

`let first = values[0];   `

知道访问一定合法时索引更直接；处理外部输入时优先 `get()`。

容量增长可能重新分配底层内存。借用检查器会阻止在持有元素引用时执行可能使引用失效的修改。

### 9.5 `HashMap` 与 `HashSet`

`use std::collections::{HashMap, HashSet};      let mut scores: HashMap<String, i32> = HashMap::new();   scores.insert(String::from("Alice"), 95);      if let Some(score) = scores.get("Alice") {       println!("{score}");   }      let roles: HashSet<&str> = HashSet::from(["admin", "editor"]);   `

更新计数使用 entry API：

`let mut counts = HashMap::new();   for word in words {       *counts.entry(word).or_insert(0) += 1;   }   `

标准 `HashMap` 不保证业务可依赖的遍历顺序。需要排序或稳定序列化时显式排序，或选择满足顺序语义的数据结构。

* * *

## 10\. 结构体、方法与关联函数

### 10.1 定义结构体

Java：

`public final class User {       private final long id;       private String name;          public User(long id, String name) {           this.id = id;           this.name = name;       }   }   `

Rust：

`#[derive(Debug, Clone, PartialEq, Eq)]   struct User {       id: u64,       name: String,   }   `

创建实例：

`let user = User {       id: 1,       name: String::from("Alice"),   };   `

字段初始化简写：

`let id = 1;   let name = String::from("Alice");   let user = User { id, name };   `

### 10.2 `impl`、方法和构造惯例

`impl User {       fnnew(id: u64, name: implInto<String>) ->Self {           Self {               id,               name: name.into(),           }       }          fndisplay_name(&self) -> &str {           &self.name       }          fnrename(&mutself, name: implInto<String>) {           self.name = name.into();       }          fninto_name(self) ->String {           self.name       }   }   `

接收者含义：

*   • `&self`：共享借用，只读访问；
    
*   • `&mut self`：独占借用，可修改；
    
*   • `self`：取得整个实例所有权，调用后原实例通常不可再用。
    

`new` 只是关联函数惯例，不是语言关键字。调用为 `User::new(...)`。

### 10.3 结构体更新语法

`let original = User::new(1, "Alice");   let renamed = User {       name: String::from("Bob"),       ..original   };   `

未显式列出的字段从 `original` 移入或复制。若其中包含非 `Copy` 字段，原值可能发生部分移动，后续不能整体使用。

### 10.4 元组结构体与单元结构体

`struct UserId(u64);   struct Meters(f64);   struct Marker;   `

newtype 可以为底层相同的数据建立不同静态类型，避免把用户 ID、订单 ID、米和秒混用。

* * *

## 11\. 枚举与模式匹配

Rust 枚举是代数数据类型，每个变体可以携带不同数据，比 Java 传统 enum 更强。

### 11.1 携带数据的枚举

`enum Command {       Create { name: String },       Delete(u64),       Stop,   }   `

处理：

`fn execute(command: Command) {       match command {           Command::Create { name } => println!("create {name}"),           Command::Delete(id) => println!("delete {id}"),           Command::Stop => println!("stop"),       }   }   `

`match` 默认要求穷尽所有可能分支。新增枚举变体后，相关匹配点通常会在编译期提示修改。

### 11.2 `Option<T>` 代替可空值

`enum Option<T> {       None,       Some(T),   }   `

使用：

`fn find_name(id: u64) -> Option<String> {       if id == 1 {           Some(String::from("Alice"))       } else {           None       }   }   `

处理：

`match find_name(1) {       Some(name) => println!("{name}"),       None => println!("not found"),   }   `

常用组合方法：

`let length = find_name(1).map(|name| name.len());   let name = find_name(1).unwrap_or_else(|| String::from("anonymous"));   `

### 11.3 `if let`、`let else` 与 `while let`

只关注一个模式：

`if let Some(name) = find_name(1) {       println!("{name}");   }   `

提前退出：

`let Some(name) = find_name(1) else {       return;   };      println!("{name}");   `

循环消费：

`while let Some(job) = queue.pop() {       process(job);   }   `

### 11.4 解构与匹配守卫

`struct Point {       x: i32,       y: i32,   }      match point {       Point { x: 0, y } => println!("on y axis at {y}"),       Point { x, y: 0 } => println!("on x axis at {x}"),       Point { x, y } if x == y => println!("diagonal at {x}"),       Point { x, y } => println!("({x}, {y})"),   }   `

`_` 忽略任何值，`..` 忽略剩余字段。匹配可能移动字段；只想观察时应匹配借用值或使用 `ref` 语义对应的引用模式。

* * *

## 12\. 控制流程

### 12.1 `if`

条件不需要括号，且必须是 `bool`：

`if count > 0 {       println!("positive");   } else {       println!("not positive");   }   `

Rust 不允许用整数隐式代表真假。

### 12.2 `loop`、`while` 与 `for`

`loop {       ifdone() {           break;       }   }      whilecondition() {       work();   }      forvaluein &values {       println!("{value}");   }   `

`loop` 可以返回值：

`let result = loop {       if let Some(value) = try_read() {           break value;       }   };   `

### 12.3 标签

`'outer: for row in rows {       for value in row {           if should_stop(value) {               break 'outer;           }       }   }   `

标签以单引号开头，与生命周期语法相似，但用途由上下文区分。

### 12.4 范围

`for value in 0..10 {      // 0 到 9       println!("{value}");   }      for value in 0..=10 {     // 0 到 10       println!("{value}");   }   `

* * *

## 13\. 函数、闭包与迭代器

### 13.1 函数签名

`fn divide(left: f64, right: f64) -> Result<f64, DivideError> {       if right == 0.0 {           return Err(DivideError::ZeroDivisor);       }       Ok(left / right)   }   `

Rust 不支持 Java 式方法重载和默认参数。常用替代方案：

*   • 使用语义明确的不同函数名；
    
*   • 使用构建器；
    
*   • 传入配置结构体；
    
*   • 用 trait 表达不同行为。
    

### 13.2 闭包捕获

`let threshold = 10;   let greater_than = |value: &i32| *value > threshold;      let filtered: Vec<i32> = values       .iter()       .copied()       .filter(greater_than)       .collect();   `

闭包根据使用方式自动捕获环境：共享借用、可变借用或取得所有权。`move` 强制把捕获值移入闭包，常用于线程：

`let message = String::from("hello");   let handle = std::thread::spawn(move || {       println!("{message}");   });   handle.join().expect("worker panicked");   `

### 13.3 `Fn`、`FnMut` 与 `FnOnce`

*   • `Fn`：可通过共享引用重复调用；
    
*   • `FnMut`：调用可能修改捕获状态，需要可变访问；
    
*   • `FnOnce`：调用可能消费捕获值，至少能调用一次。
    

`fn apply_twice<F>(mut operation: F, value: i32) -> i32   where       F: FnMut(i32) -> i32,   {       let once = operation(value);       operation(once)   }   `

选择最宽松的实际需求：如果函数只调用闭包一次，`FnOnce` 能接受更多种闭包。

### 13.4 迭代器所有权三件套

`for valuein values.iter() {       // value: &T   }      forvaluein values.iter_mut() {       // value: &mut T   }      forvaluein values.into_iter() {       // value: T，容器被消费   }   `

这对应读取、修改和取得元素所有权三种意图。

### 13.5 惰性迭代器

`let total: i64 = values       .iter()       .filter(|value| **value > 0)       .map(|value| i64::from(*value))       .sum();   `

迭代器适配器是惰性的，必须由 `collect`、`sum`、`for_each` 或 `for` 等消费操作驱动。

Java Stream 与 Rust iterator 表面相似，但 Rust 迭代器还携带所有权和借用语义。看到 `iter`、`iter_mut`、`into_iter` 时要同时判断元素类型和容器后续是否可用。

* * *

## 14\. Trait 与泛型

### 14.1 Trait 对照 Java interface

`interface Summary {       String summarize();   }   `

`trait Summary {       fn summarize(&self) -> String;   }   `

实现：

`struct Article {       title: String,   }      impl Summary for Article {       fn summarize(&self) -> String {           self.title.clone()       }   }   `

默认方法：

`trait Summary {       fn title(&self) -> &str;          fn summarize(&self) -> String {           format!("Article: {}", self.title())       }   }   `

### 14.2 Trait bound

`fn print_summary(item: &impl Summary) {       println!("{}", item.summarize());   }   `

等价的显式泛型形式：

`fn print_summary<T: Summary>(item: &T) {       println!("{}", item.summarize());   }   `

多个约束：

`fn debug_summary<T>(item: &T)   where       T: Summary + std::fmt::Debug,   {       println!("{item:?}: {}", item.summarize());   }   `

### 14.3 静态分派与动态分派

静态分派：

`fn process<T: Summary>(item: &T) {       println!("{}", item.summarize());   }   `

编译器通常为具体类型生成专用代码，利于内联，但可能增加二进制体积。

动态分派：

`fn process(item: &dyn Summary) {       println!("{}", item.summarize());   }      let items: Vec<Box<dyn Summary>> = vec![/* 不同实现 */];   `

`dyn Trait` 通过虚表在运行时调用，适合异构集合、插件边界或需要隐藏具体类型的接口。只有满足 dyn compatibility 要求的 trait 才能构造 trait object。

### 14.4 返回 `impl Trait`

`fn positive_values(values: &[i32]) -> impl Iterator<Item = &i32> {       values.iter().filter(|value| **value > 0)   }   `

调用方知道返回值实现某 trait，但不知道具体类型。一个函数的各返回路径仍需归一为同一隐藏具体类型。

### 14.5 关联类型

`trait Repository {       type Item;       type Error;          fn find(&self, id: u64) -> Result<Self::Item, Self::Error>;   }   `

关联类型表达“一个实现对应一组确定类型”。泛型参数则适合“同一个实现可以面向多种类型重复实现”的场景。

### 14.6 孤儿规则

通常只有当 trait 或目标类型至少有一个定义在当前 crate 时，才能实现该 trait：

`// 不能随意为两个外部 crate 的类型/trait 组合添加实现   `

常见解决方式是 newtype：

`struct DisplayVec(Vec<String>);   `

孤儿规则避免不同 crate 提供冲突实现，使 trait 解析保持一致。

* * *

## 15. `Option`、`Result` 与错误处理

### 15.1 `Result<T, E>`

`enum Result<T, E> {       Ok(T),       Err(E),   }   `

示例：

`use std::num::ParseIntError;      fn parse_age(input: &str) -> Result<u8, ParseIntError> {       input.parse()   }   `

调用：

`match parse_age("18") {       Ok(age) => println!("age={age}"),       Err(error) => eprintln!("invalid age: {error}"),   }   `

### 15.2 `?` 传播错误

Java：

`String load(Path path) throws IOException {       return Files.readString(path);   }   `

Rust：

`use std::fs;   use std::io;   use std::path::Path;      fn load(path: &Path) -> Result<String, io::Error> {       let content = fs::read_to_string(path)?;       Ok(content)   }   `

`?` 在失败时提前返回，并通过 `From`/`Into` 机制进行允许的错误转换。它不是无条件吞掉错误。

### 15.3 自定义错误枚举

`use std::error::Error;   use std::fmt;   use std::io;   use std::num::ParseIntError;      #[derive(Debug)]   enumConfigError {       Read(io::Error),       InvalidPort(ParseIntError),       PortOutOfRange(u16),   }      implfmt::Display forConfigError {       fnfmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {           matchself {               Self::Read(error) => write!(formatter, "failed to read config: {error}"),               Self::InvalidPort(error) => write!(formatter, "invalid port: {error}"),               Self::PortOutOfRange(port) => write!(formatter, "port out of range: {port}"),           }       }   }      implErrorforConfigError {       fnsource(&self) ->Option<&(dyn Error + 'static)> {           matchself {               Self::Read(error) => Some(error),               Self::InvalidPort(error) => Some(error),               Self::PortOutOfRange(_) => None,           }       }   }      implFrom<io::Error> forConfigError {       fnfrom(error: io::Error) ->Self {           Self::Read(error)       }   }   `

大型应用常使用生态库减少错误样板代码，但先理解标准 `Error`、`Display`、`source` 和 `From` 很重要。

### 15.4 `unwrap` 与 `expect`

`let value = input.parse::<u64>().unwrap();   let value = input       .parse::<u64>()       .expect("validated configuration must contain a numeric port");   `

使用建议：

*   • 教学、测试、原型中可适量使用；
    
*   • 程序启动阶段已经证明不变量时，`expect` 应说明为什么不可能失败；
    
*   • 用户输入、网络、文件和数据库失败应正常返回或转换错误；
    
*   • 库代码不应轻易替调用方决定 panic。
    

### 15.5 `panic!` 对照不可恢复错误

panic 表示程序遇到无法继续维持不变量的情况。它不是 Java checked exception 的替代品。

panic 默认会展开栈并执行析构，也可配置为直接终止。跨线程时，子线程 panic 不会自动让所有线程立即停止；调用 `join()` 时可观察到失败。

### 15.6 `Option` 与 `Result` 转换

`let user = users       .get(&id)       .ok_or(UserError::NotFound(id))?;   `

`let optional = result.ok();   let result = optional.ok_or_else(|| create_error());   `

不要过度链式组合到难以定位失败语义。复杂业务流程使用局部变量和 `match` 往往更清晰。

* * *

## 16\. RAII、`Drop` 与智能指针

### 16.1 RAII 对照 try-with-resources

`use std::fs::File;      fn open_file() -> std::io::Result<()> {       let file = File::open("data.txt")?;       // 使用 file       drop(file); // 可选：提前释放；通常离开作用域自动释放       Ok(())   }   `

锁守卫、文件、socket 和内存容器都遵循作用域清理。不存在 Java 式必须等待 GC 才释放普通堆对象的行为。

### 16.2 自定义 `Drop`

`struct Connection {       name: String,   }      impl Drop for Connection {       fn drop(&mut self) {           println!("closing {}", self.name);       }   }   `

不能直接调用 `value.drop()`；需要提前清理时调用 `std::mem::drop(value)` 消费该值。

析构代码不应依赖复杂失败恢复。进程强制终止、内存泄漏或引用环等情况下，`Drop` 不保证必然执行。

### 16.3 `Box<T>`

`enum List {       Node(i32, Box<List>),       Empty,   }   `

`Box<T>` 把值放在堆上并保持单一所有权，常用于：

*   • 递归类型；
    
*   • 大值间接存储；
    
*   • `Box<dyn Trait>` 动态分派；
    
*   • 转移堆对象所有权。
    

### 16.4 `Rc<T>` 与 `Arc<T>`

`use std::rc::Rc;      let value = Rc::new(String::from("shared"));   let another = Rc::clone(&value);   `

*   • `Rc<T>`：非原子引用计数，只适合单线程；
    
*   • `Arc<T>`：原子引用计数，可跨线程共享；
    
*   • 二者默认只提供共享只读访问，不会自动让内部数据可变；
    
*   • 引用计数环会导致内存无法释放，反向关系常使用 `Weak<T>`。
    

### 16.5 `Cell<T>` 与 `RefCell<T>`

`use std::cell::RefCell;   use std::rc::Rc;      let value = Rc::new(RefCell::new(vec![1, 2]));   value.borrow_mut().push(3);   `

`RefCell<T>` 把借用规则从编译期移动到运行时：

*   • 同时多个不可变借用或一个可变借用；
    
*   • 违反规则会 panic；
    
*   • 它不是线程安全锁，只适用于单线程；
    
*   • 应用于编译器难以证明安全、但程序能维护局部不变量的场景。
    

### 16.6 常见组合

需求

常见类型

单一所有者、堆分配

`Box<T>`

单线程共享只读

`Rc<T>`

单线程共享且需要内部修改

`Rc<RefCell<T>>`

多线程共享只读

`Arc<T>`

多线程共享且需要修改

`Arc<Mutex<T>>`

 或 `Arc<RwLock<T>>`

打破引用计数环

`Weak<T>`

这些不是固定处方。能用普通所有权、借用或消息传递解决时，通常更简单。

* * *

## 17\. 模块、Crate、Package 与 Workspace

### 17.1 概念对照

Rust 概念

含义

Java 近似概念

package

一个 `Cargo.toml` 描述的发布/构建包

Maven module/project

crate

一次编译单元，可为 library 或 binary

无完全等价；近似单个模块产物

module

crate 内命名空间与可见性组织

package/class namespace

workspace

共享构建输出和锁文件的多个 package

Maven multi-module build

一个 package 可以包含一个 library crate、多个 binary crate 和示例/测试目标。

### 17.2 模块文件结构

`src/   ├── lib.rs   ├── user.rs   └── user/       └── repository.rs   `

`src/lib.rs`：

`pub mod user;   `

`src/user.rs`：

`pub mod repository;      pub struct User {       pub id: u64,       name: String,   }   `

### 17.3 可见性

*   • 默认私有；
    
*   • `pub`：从允许路径公开；
    
*   • `pub(crate)`：当前 crate 内公开；
    
*   • `pub(super)`：父模块内公开；
    
*   • 结构体公开不代表字段自动公开。
    

`pub struct Account {       pub id: u64,       password_hash: String,   }   `

Rust 的隐私边界以模块为核心，不是 Java 的类级 private 模型。

### 17.4 `use` 与重导出

`use std::collections::HashMap;   use crate::user::repository::Repository;   `

公共 API 可重导出内部路径：

`pub use crate::user::User;   `

这样可以在不暴露全部内部目录结构的情况下提供稳定入口。

### 17.5 Workspace

`[workspace]   resolver = "3"   members = [       "crates/domain",       "crates/storage",       "apps/server",   ]   `

Workspace 适合多个相互关联 crate，共享 `Cargo.lock` 和构建目录。不要为了模仿 Java 多模块结构，过早把小项目拆成大量 crate；crate 边界会增加公共 API 和编译依赖管理成本。

* * *

## 18\. 依赖、Feature 与构建配置

### 18.1 添加依赖

`[dependencies]   some-crate = "1"   `

或使用 Cargo 命令：

`cargo add some-crate   `

`Cargo.lock` 记录解析后的精确依赖版本。应用和可执行程序通常应提交它，以获得可重复构建；库项目需要结合发布与 CI 策略管理锁文件。

### 18.2 Feature

`[features]   default = []   metrics = []   `

代码条件编译：

`#[cfg(feature = "metrics")]   fn record_metric() {       // ...   }   `

Feature 通常应是可加性的能力开关。不要设计互斥 feature 后又允许它们被依赖图同时启用而产生模糊行为。

### 18.3 构建 Profile

`[profile.release]   lto = true   codegen-units = 1   `

优化配置会影响构建时间、二进制大小、运行性能和调试体验。先通过基准与剖析确认需求，不要把所有“看起来更快”的选项机械加入模板。

### 18.4 Build Script

`build.rs` 在编译前运行，可生成代码、探测本地库或传递链接配置。它会增加构建复杂度和环境依赖，能用普通 Rust、过程宏或静态资源解决时不必优先使用。

* * *

## 19\. 测试、文档与质量工具

### 19.1 单元测试

`pub fndiscount(amount: u64, percent: u8) ->Result<u64, &'staticstr> {       if percent > 100 {           returnErr("percent must be between 0 and 100");       }       Ok(amount * u64::from(100 - percent) / 100)   }      #[cfg(test)]   mod tests {       use super::*;          #[test]       fncalculates_discount() {           assert_eq!(discount(100, 10), Ok(90));       }          #[test]       fnrejects_invalid_percent() {           assert!(discount(100, 101).is_err());       }   }   `

### 19.2 集成测试

`tests/   └── service_test.rs   `

集成测试把 library crate 当作外部依赖使用，因此只能访问公开 API：

`use user_service::UserService;      #[test]   fn finds_user() {       // ...   }   `

### 19.3 测试 Result

`#[test]   fn parses_value() -> Result<(), Box<dyn std::error::Error>> {       let value: u64 = "42".parse()?;       assert_eq!(value, 42);       Ok(())   }   `

### 19.4 panic 测试

`#[test]   #[should_panic(expected = "index out of bounds")]   fn invalid_index_panics() {       let values = vec![1];       let _ = values[2];   }   `

业务失败更应断言 `Result::Err`，`should_panic` 适合验证明确的 panic 契约。

### 19.5 文档测试

`/// Adds two integers.   ///   /// # Examples   ///   /// ```   /// assert_eq!(math_lib::add(2, 3), 5);   /// ```   pub fn add(left: i32, right: i32) -> i32 {       left + right   }   `

`cargo test` 会运行文档示例，使文档更不容易与实现脱节。

### 19.6 推荐质量门禁

`cargo fmt --check   cargo clippy --all-targets --all-features -- -D warnings   cargo test --all-features   cargo build --release   `

有多个目标平台、feature 或最低编译器版本时，应在 CI 矩阵中分别验证。

* * *

## 20\. 线程、消息传递与共享状态

### 20.1 创建线程

Java：

`Thread thread = new Thread(() -> doWork());   thread.start();   thread.join();   `

Rust：

`let handle = std::thread::spawn(|| {       do_work();   });      handle.join().expect("worker thread panicked");   `

线程闭包通常需要拥有捕获数据：

`let message = String::from("hello");   let handle = std::thread::spawn(move || {       println!("{message}");   });   handle.join().unwrap();   `

### 20.2 Scoped thread

普通 `spawn` 要求捕获值满足 `'static`，因为线程可能比当前函数活得久。确定线程会在作用域结束前完成时，可使用 scoped thread 借用局部数据：

`let values = vec![1, 2, 3];      std::thread::scope(|scope| {       scope.spawn(|| {           println!("{values:?}");       });   });   `

### 20.3 Channel

`use std::sync::mpsc;      let (sender, receiver) = mpsc::channel();      let handle = std::thread::spawn(move || {       sender.send(String::from("done")).unwrap();   });      let message = receiver.recv().unwrap();   println!("{message}");   handle.join().unwrap();   `

标准库 channel 是多生产者、单消费者模型。克隆发送端可创建多个生产者；所有发送端被丢弃后，接收端会观察到断开。

### 20.4 `Arc<Mutex<T>>`

`use std::sync::{Arc, Mutex};   use std::thread;      letcounter = Arc::new(Mutex::new(0_u64));   letmut handles = Vec::new();      for_in0..4 {       letcounter = Arc::clone(&counter);       handles.push(thread::spawn(move || {           letmut guard = counter.lock().expect("mutex poisoned");           *guard += 1;       }));   }      forhandlein handles {       handle.join().expect("worker panicked");   }      println!("{}", *counter.lock().unwrap());   `

*   • `Arc` 提供跨线程共享所有权；
    
*   • `Mutex` 提供独占内部可变性；
    
*   • 锁守卫离开作用域时自动解锁；
    
*   • 线程持锁时 panic 可能使标准锁进入 poisoned 状态，调用方要选择恢复或传播。
    

尽量缩小持锁范围：

`let snapshot = {       let guard = state.lock().unwrap();       guard.clone()   }; // 此处释放锁      perform_slow_io(snapshot);   `

不要持锁执行缓慢网络 I/O 或调用不受控外部代码。

### 20.5 `Send` 与 `Sync`

*   • `Send`：类型的所有权可以安全转移到另一个线程；
    
*   • `Sync`：`&T` 可以安全在线程间共享；
    
*   • 多数安全组合类型由编译器自动推导这两个 auto trait；
    
*   • `Rc<T>` 不是 `Send`，`Arc<T>` 在内部类型满足条件时可跨线程；
    
*   • 手工 `unsafe impl Send/Sync` 是高风险承诺，必须证明所有内部不变量。
    

Rust 消除了大量数据竞争，但不能自动防止死锁、活锁、业务竞争、资源耗尽和错误的锁顺序。

### 20.6 Java 并发映射

Java

Rust

`Thread`

`std::thread::spawn`

 / `JoinHandle`

`ExecutorService`

生态线程池或任务运行时

`BlockingQueue`

channel

`synchronized`

 / `Lock`

`Mutex`

 / `RwLock`

`AtomicInteger`

`AtomicI32`

、`AtomicUsize` 等

`AtomicReference`

原子指针类或同步容器，按需求选择

`CompletableFuture`

`Future`

 + async runtime

不可变共享对象

`Arc<T>`

，内部 `T` 仍需满足线程安全约束

* * *

## 21\. Async/Await

### 21.1 Future 是惰性的计算描述

`async fn fetch_user(id: u64) -> Result<User, FetchError> {       // await 某个异步 I/O       todo!("use an async client")   }   `

调用 `fetch_user(1)` 返回 Future，并不会自己启动后台线程或完成网络请求。Future 需要被 executor 反复 poll 才能推进。

### 21.2 标准库不提供完整异步运行时

Rust 标准库定义 `Future`、`async`/`await` 等基础机制，但实际定时器、异步 socket、任务调度和入口宏通常由生态运行时提供。选择运行时和 Web 框架时，应让整个应用的 I/O 栈保持兼容，避免无意识混合多套运行时。

### 21.3 阻塞代码与异步代码

不要在异步任务中直接执行长时间阻塞 I/O 或 CPU 密集工作，它会占住 executor 工作线程。常见处理方式：

*   • 使用真正的异步 API；
    
*   • 把阻塞工作移交专用阻塞线程池；
    
*   • CPU 密集任务使用受控计算线程池或独立服务；
    
*   • 明确超时、取消和任务所有者。
    

### 21.4 取消安全

许多 Rust Future 在被丢弃时即表示取消。一个 Future 是否能在任意 `.await` 点被安全丢弃，取决于操作是否保存了可恢复进度和外部副作用。

设计异步流程时要问：

*   • 任务被取消后，锁和连接是否释放；
    
*   • 已写出一半的协议消息如何处理；
    
*   • 重试会不会重复扣款或写入；
    
*   • 子任务由谁等待和收集错误；
    
*   • 超时到底覆盖排队、连接还是整个请求。
    

### 21.5 `Pin` 的初步理解

异步状态机和自引用类型可能要求值在内存中不再移动，`Pin<P>` 用类型系统表达这种承诺。日常应用通常通过 `Box::pin`、运行时 API 或宏间接使用；除非实现底层 Future、流或 unsafe 抽象，不应一开始手写复杂 Pin 投影。

* * *

## 22\. 宏与属性

### 22.1 常见宏

`println!("user={user:?}");   let values = vec![1, 2, 3];   let sql = format!("id={id}");   assert_eq!(left, right);   `

宏可以接受可变语法并在编译期展开，不等于 Java 普通方法。

### 22.2 派生属性

`#[derive(Debug, Clone, PartialEq, Eq, Hash)]   struct UserId(u64);   `

只派生语义真实成立的 trait。比如包含浮点数的类型通常不能自然派生 `Eq`，敏感数据也未必应该派生会输出全部字段的 `Debug`。

### 22.3 条件编译与 lint

`#[cfg(target_os = "linux")]   fn platform_name() -> &'static str {       "linux"   }      #[must_use]   fn calculate() -> i32 {       42   }   `

属性会影响编译、生成代码、测试和警告策略。它们比 Java 注解更接近语言和编译器扩展机制，不只是运行时反射元数据。

### 22.4 宏选择原则

*   • 普通函数能解决时优先函数；
    
*   • 泛型和 trait 能表达时优先类型系统抽象；
    
*   • 重复语法、派生实现或编译期代码生成才考虑宏；
    
*   • 过程宏会增加编译时间、错误信息复杂度和工具链成本。
    

* * *

## 23\. Unsafe Rust 与 FFI

### 23.1 `unsafe` 不会关闭借用检查器

`unsafe` 允许执行少数编译器无法证明安全的操作，例如：

*   • 解引用裸指针；
    
*   • 调用 unsafe 函数；
    
*   • 访问或修改可变静态数据；
    
*   • 实现 unsafe trait；
    
*   • 访问 union 字段。
    

其他类型、生命周期和借用规则仍然生效。

`unsafe fn read_pointer(pointer: *const i32) -> i32 {       // Rust 2024 中仍应把具体 unsafe 操作放入显式块       unsafe { *pointer }   }   `

### 23.2 安全抽象的责任

对外提供安全 API、内部使用 unsafe 时，作者必须维护并文档化不变量：

*   • 指针是否非空、对齐且指向已初始化数据；
    
*   • 别名和可变访问是否符合规则；
    
*   • 生命周期是否足够长；
    
*   • 跨线程是否满足同步要求；
    
*   • panic 时是否保持数据结构有效。
    

unsafe 代码应尽量小、集中、经过测试和专门审查。

### 23.3 与 Java/JNI 对照

Rust 调用 C ABI 常用 `extern "C"`，与 Java JNI 类似，边界外不再自动享受完整语言安全保证。需要明确：

*   • 所有权由谁负责；
    
*   • 字符串编码和缓冲区长度；
    
*   • 错误码与 panic/exception 如何转换；
    
*   • 结构体布局和 ABI；
    
*   • 回调线程与生命周期。
    

panic 不应无控制地跨 FFI 边界传播。

* * *

## 24\. 完整示例：从 Spring 风格迁移到 Rust 显式组合

下面实现一个无第三方依赖的用户查询命令行服务，展示领域类型、Repository trait、泛型注入、`Result`、锁、模块和测试。

### 24.1 目录结构

`user-service/   ├── Cargo.toml   ├── src/   │   ├── lib.rs   │   ├── domain.rs   │   ├── repository.rs   │   ├── service.rs   │   └── main.rs   └── tests/       └── service_test.rs   `

### 24.2 配置

`# Cargo.toml   [package]   name = "user-service"   version = "0.1.0"   edition = "2024"   rust-version = "1.98"      [dependencies]   `

### 24.3 领域对象与错误

`// src/domain.rs   use std::error::Error;   use std::fmt;      #[derive(Debug, Clone, PartialEq, Eq)]   pubstructUser {       pub id: u64,       pub name: String,   }      implUser {       pubfnnew(id: u64, name: implInto<String>) ->Self {           Self {               id,               name: name.into(),           }       }   }      #[derive(Debug, Clone, PartialEq, Eq)]   pubenumUserError {       InvalidId(u64),       NotFound(u64),       RepositoryUnavailable,   }      implfmt::Display forUserError {       fnfmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {           matchself {               Self::InvalidId(id) => write!(formatter, "user id must be positive: {id}"),               Self::NotFound(id) => write!(formatter, "user {id} was not found"),               Self::RepositoryUnavailable => write!(formatter, "repository is unavailable"),           }       }   }      implErrorforUserError {}   `

### 24.4 Repository trait 与内存实现

`// src/repository.rs   use std::collections::HashMap;   use std::sync::RwLock;      use crate::domain::{User, UserError};      pubtraitUserRepository: Send + Sync {       fnfind_by_id(&self, id: u64) ->Result<User, UserError>;   }      #[derive(Debug)]   pubstructMemoryUserRepository {       users: RwLock<HashMap<u64, User>>,   }      implMemoryUserRepository {       pubfnnew(users: implIntoIterator<Item = User>) ->Self {           letusers = users.into_iter().map(|user| (user.id, user)).collect();           Self {               users: RwLock::new(users),           }       }          pubfnsave(&self, user: User) ->Result<(), UserError> {           letmut users = self               .users               .write()               .map_err(|_| UserError::RepositoryUnavailable)?;           users.insert(user.id, user);           Ok(())       }   }      implUserRepositoryforMemoryUserRepository {       fnfind_by_id(&self, id: u64) ->Result<User, UserError> {           letusers = self               .users               .read()               .map_err(|_| UserError::RepositoryUnavailable)?;              users               .get(&id)               .cloned()               .ok_or(UserError::NotFound(id))       }   }   `

这里返回 `User` 的拥有值，因此内存仓储需要 `clone()`。另一种设计可以返回借用，但锁守卫和生命周期会进入公共 API；对服务边界而言，返回独立领域值通常更简单。

### 24.5 Service

`// src/service.rs   use crate::domain::{User, UserError};   use crate::repository::UserRepository;      #[derive(Debug)]   pubstructUserService<R> {       repository: R,   }      impl<R> UserService<R>   where       R: UserRepository,   {       pubfnnew(repository: R) ->Self {           Self { repository }       }          pubfnget(&self, id: u64) ->Result<User, UserError> {           if id == 0 {               returnErr(UserError::InvalidId(id));           }           self.repository.find_by_id(id)       }   }   `

`UserService<R>` 使用泛型静态分派。若应用需要在运行时选择实现，也可存储 `Box<dyn UserRepository>` 或 `Arc<dyn UserRepository>`。

### 24.6 Library 入口

`// src/lib.rs   pub mod domain;   pub mod repository;   pub mod service;      pub use domain::{User, UserError};   pub use repository::{MemoryUserRepository, UserRepository};   pub use service::UserService;   `

重导出提供简洁公共 API，调用方不必了解所有内部模块路径。

### 24.7 程序入口

`// src/main.rs   use std::env;   use std::error::Error;   use std::process::ExitCode;      use user_service::{MemoryUserRepository, User, UserError, UserService};      fnrun() ->Result<(), Box<dyn Error>> {       letraw_id = env::args()           .nth(1)           .ok_or("usage: user-service <user-id>")?;       letid: u64 = raw_id.parse()?;          letrepository = MemoryUserRepository::new([           User::new(1, "Alice"),           User::new(2, "Bob"),       ]);       letservice = UserService::new(repository);          match service.get(id) {           Ok(user) => {               println!("id={} name={}", user.id, user.name);               Ok(())           }           Err(UserError::NotFound(_)) => {               println!("user not found");               Ok(())           }           Err(error) => Err(Box::new(error)),       }   }      fnmain() -> ExitCode {       matchrun() {           Ok(()) => ExitCode::SUCCESS,           Err(error) => {               eprintln!("error: {error}");               ExitCode::FAILURE           }       }   }   `

### 24.8 集成测试

`// tests/service_test.rs   use user_service::{MemoryUserRepository, User, UserError, UserService};      fnservice() -> UserService<MemoryUserRepository> {       letrepository = MemoryUserRepository::new([User::new(1, "Alice")]);       UserService::new(repository)   }      #[test]   fnreturns_existing_user() {       letuser = service().get(1).unwrap();       assert_eq!(user, User::new(1, "Alice"));   }      #[test]   fnrejects_zero_id() {       assert_eq!(service().get(0), Err(UserError::InvalidId(0)));   }      #[test]   fnreports_missing_user() {       assert_eq!(service().get(999), Err(UserError::NotFound(999)));   }   `

### 24.9 运行

`cargo fmt --check   cargo clippy --all-targets -- -D warnings   cargo test   cargo run -- 1   cargo run -- 999   `

与典型 Spring 项目相比：

*   • trait 只描述 Service 实际依赖的仓储能力；
    
*   • 没有运行时组件扫描或反射注入；
    
*   • 构造函数在 `main` 中显式组装对象；
    
*   • 错误是可穷尽匹配的值；
    
*   • 锁的生命周期由 guard 和作用域控制；
    
*   • 编译器检查线程共享类型是否满足 `Send + Sync`。
    

* * *

## 25\. Java 开发者最常见的 Rust 陷阱

### 25.1 到处 `clone()`

症状：每遇到 moved value 就立即复制。

应先判断：

*   • 函数是否只需 `&T`；
    
*   • 是否可把拥有值移动到真正所有者；
    
*   • 是否应调整结构体边界；
    
*   • 是否确实需要两份独立数据。
    

`clone()` 不是错误，但应代表明确复制语义和成本。

### 25.2 让所有结构体都持有引用

`struct User<'a> {       name: &'a str,   }   `

业务实体经常更适合拥有 `String`。长期持有引用会把生命周期参数传播到容器、trait 和服务层。引用适合视图、解析结果和短期借用，不是节省分配的万能方法。

### 25.3 把 `String` 与 `&str` 混为一谈

*   • `String`：拥有、可增长；
    
*   • `&str`：借用的字符串视图；
    
*   • 参数只读时通常接收 `&str`；
    
*   • 结构体需要独立保存时通常持有 `String`；
    
*   • 返回引用时必须与某个输入或 `self` 生命周期关联。
    

### 25.4 过度使用 `unwrap()`

外部输入、文件、网络、锁和数据库都可能正常失败。使用 `?`、`match` 或错误转换。测试中的 `unwrap()` 通常可接受，因为失败会提供明确测试位置。

### 25.5 试图实现类继承

Rust trait 不是带字段的基类。复用数据用组合，复用默认行为用 trait 默认方法或普通函数，运行时替换用 trait object。

### 25.6 误以为 `Arc<T>` 使一切可变且线程安全

`Arc<T>` 只解决共享所有权。修改需要 `Mutex`、`RwLock`、原子类型或消息传递，并且 `T` 本身仍需满足线程安全条件。

### 25.7 长时间持有锁

不要让 guard 跨越网络 I/O、回调、复杂计算或异步 `.await`。提取需要的数据后尽早结束作用域。

### 25.8 在异步代码中使用同步阻塞锁

同步 `Mutex` 守卫如果跨 `.await`，可能阻塞 executor 或产生不可发送 Future。根据临界区和运行时选择异步锁、同步锁或重新设计所有权，并避免跨 await 持锁。

### 25.9 误解 `move` 闭包

`move` 表示闭包取得捕获变量的所有权；实现 `Copy` 的值会复制进去。它不代表闭包一定在新线程执行，也不代表闭包只能调用一次。

### 25.10 把所有动态行为都写成 `Box<dyn Trait>`

只有真正需要异构集合、运行时替换或稳定边界时才用 trait object。普通泛型能提供静态分派和更强优化，但也可能增加编译时间和二进制体积。按边界需求选择。

### 25.11 滥用 `RefCell`

`RefCell` 会把借用错误推迟到运行时 panic。它适合单线程内部可变性，不是绕过所有权设计的后门，也不能代替多线程锁。

### 25.12 自引用结构体

结构体同时拥有数据并保存指向自身字段的引用，会涉及移动后地址变化和 Pin 等复杂问题。优先保存索引、范围、ID，或使用专门抽象，而不是初学阶段手写 unsafe 自引用类型。

### 25.13 依赖整数 `as` 转换

`as` 可能截断。协议、数据库 ID 和用户输入应使用 `TryFrom`/`try_into()` 并处理失败。

### 25.14 认为安全 Rust 不会死锁

类型系统能阻止大量内存错误和数据竞争，但锁顺序循环仍可死锁。规定锁顺序、缩小临界区、避免嵌套锁并加入超时/监控。

### 25.15 过早拆分大量 crate

crate 是编译与公共 API 边界，不只是 Java package。先用 module 组织单个 crate，只有需要独立发布、隔离依赖、并行团队边界或显著增量编译收益时再拆分。

### 25.16 忽视 MSRV

只写 `edition = "2024"` 不等于声明最低编译器版本。库和企业项目应明确 MSRV，并在 CI 中验证；升级依赖时关注其 MSRV 变化。

### 25.17 在敏感类型上随意派生 `Debug`

令牌、密钥、密码摘要和隐私字段可能通过日志泄露。为敏感类型手写脱敏 `Debug`，或避免直接记录完整对象。

### 25.18 用 panic 表达业务失败

用户不存在、校验失败、超时和冲突应返回 `Result`。panic 用于违反程序不变量或无法合理恢复的错误。

* * *

## 26\. Rust 风格设计原则

### 26.1 让签名表达所有权

`fn inspect(value: &T)          // 读取   fn update(value: &mut T)       // 修改   fn consume(value: T)           // 取得所有权   fn create() -> T               // 交出所有权   `

调用方应从签名就能判断值是否会被修改或消费。

### 26.2 用类型排除非法状态

`enum PaymentState {       Pending,       Authorized { authorization_id: String },       Captured { receipt_id: String },       Failed { reason: String },   }   `

这比多个可能互相矛盾的布尔字段更容易维护。

### 26.3 在边界解析，核心使用强类型

字符串、JSON、数据库值和命令行参数进入系统时转换为 `UserId`、金额、枚举和领域对象。核心业务不要长期传递无约束字符串或通用 map。

### 26.4 最小化公共 API

默认私有，仅公开必要类型和方法。公共 API 一旦被依赖，所有权、错误类型、trait bound 和 feature 都会成为兼容承诺。

### 26.5 借用优先，拥有有据

只读函数参数通常借用；需要存储、跨线程、跨异步任务或独立生命周期时取得所有权。不要把“永不分配”作为目标，清晰的所有权边界更重要。

### 26.6 先正确，再优化

Rust 提供零成本抽象，不代表所有代码自动最优。使用基准和 profiler 判断热点，再考虑分配、复制、动态分派、缓存布局和锁竞争。

* * *

## 27\. Java 与 Rust 语法速查表

Java

Rust

`public static void main`

`fn main()`

`Type value = x`

`let value: Type = x;`

可变局部变量

`let mut value = x;`

`final`

 常量

`const NAME: Type = value;`

`null`

`Option<T>`

 的 `None`

`new User(...)`

`User::new(...)`

 或结构体字面量

`this`

`self`

 / `&self` / `&mut self`

class

`struct`

 + `impl`

interface

`trait`

`implements`

`impl Trait for Type`

`extends`

无类继承；组合 + trait

enum

携带数据的 `enum`

`switch`

`match`

`instanceof`

 + cast

enum 模式、trait 方法、`Any` 等特定机制

`List<T>`

`Vec<T>`

`Map<K,V>`

`HashMap<K, V>`

`Set<T>`

`HashSet<T>`

`Optional<T>`

`Option<T>`

exception

`Result<T, E>`

`throw`

`return Err(...)`

；不可恢复时 `panic!`

try-with-resources

所有权作用域 + `Drop`

getter

普通方法；字段也可按模块可见性公开

Lambda

闭包 \`

Stream

iterator

`synchronized`

`Mutex`

/`RwLock` guard

`AtomicInteger`

`AtomicI32`

 等

`CompletableFuture`

`Future`

 + async runtime

Maven/Gradle

Cargo

annotation processor

属性宏、派生宏、build script 等

### 27.1 高频代码模板

只读借用：

`fn process(value: &str) {       println!("{value}");   }   `

可变借用：

`fn update(values: &mut Vec<i32>) {       values.push(1);   }   `

错误传播：

`let value = operation()?;   `

Option 提前退出：

`let Some(value) = optional else {       return;   };   `

Result 转换：

`let value = optional.ok_or_else(|| Error::Missing)?;   `

锁：

`let mut state = shared.lock().map_err(|_| Error::Unavailable)?;   state.update();   `

线程：

`let handle = std::thread::spawn(move || work(value));   let result = handle.join().expect("worker panicked");   `

迭代转换：

`let names: Vec<String> = users       .iter()       .filter(|user| user.active)       .map(|user| user.name.clone())       .collect();   `

* * *

## 28\. 建议学习路线

### 第一阶段：语法与所有权

*   • 完成 Rust Book 前十章的核心练习；
    
*   • 重点掌握 move、Copy、Clone、`&T`、`&mut T`；
    
*   • 熟练 `String`/`&str`、`Vec`/slice；
    
*   • 通过编译错误理解所有权，而不是立即复制代码答案。
    

练习：实现命令行单词统计器，支持文件输入、错误返回、排序和测试。

### 第二阶段：枚举、错误与 trait

*   • 用 enum 建模状态；
    
*   • 掌握 `Option`、`Result`、`?`；
    
*   • 编写领域错误并实现 `Display`/`Error`；
    
*   • 使用泛型 trait bound 和 `dyn Trait`，比较两者边界。
    

练习：实现订单状态机，非法状态转换在类型或匹配中明确拒绝。

### 第三阶段：工程化

*   • 掌握 package、crate、module、workspace；
    
*   • 使用 fmt、Clippy、unit/integration/doc tests；
    
*   • 维护 feature、MSRV 和 `Cargo.lock` 策略；
    
*   • 学习日志、配置、序列化和数据库生态。
    

练习：把领域库、命令行程序和适配层组织为 workspace，并建立 CI。

### 第四阶段：并发与异步

*   • 掌握 `Send`、`Sync`、`Arc`、`Mutex`、channel；
    
*   • 练习 scoped thread 与有界并发；
    
*   • 选择一套 async runtime，理解 Future、取消和阻塞隔离；
    
*   • 学习性能分析、内存布局和锁竞争。
    

练习：实现受限并发的任务处理器，支持关闭信号、错误汇总、重试和指标。

### 第五阶段：高级主题

*   • 宏和过程宏；
    
*   • Pin、底层 Future 和自引用问题；
    
*   • unsafe 抽象与 FFI；
    
*   • SIMD、嵌入式、WebAssembly 或系统编程专项。
    

高级主题应由真实项目需求驱动，不必在能编写业务程序前全部掌握。

* * *

## 29\. 提交代码前检查清单

*   • \[ \] `cargo fmt --check` 通过；
    
*   • \[ \] `cargo clippy --all-targets --all-features -- -D warnings` 通过；
    
*   • \[ \] `cargo test --all-features` 通过；
    
*   • \[ \] release 构建和目标平台构建通过；
    
*   • \[ \] 没有用无意义的 `clone()` 掩盖所有权设计；
    
*   • \[ \] 外部输入和正常失败没有使用 `unwrap()`；
    
*   • \[ \] `unsafe` 范围最小且记录了安全不变量；
    
*   • \[ \] 没有持锁执行慢 I/O 或跨 `.await`；
    
*   • \[ \] 所有线程和异步任务都有所有者与退出条件；
    
*   • \[ \] 错误保留了来源，敏感信息没有进入日志；
    
*   • \[ \] 数值转换和溢出策略明确；
    
*   • \[ \] 公共 API 的借用、拥有和错误语义清晰；
    
*   • \[ \] feature 组合经过测试且保持可加性；
    
*   • \[ \] MSRV 已声明并在 CI 验证；
    
*   • \[ \] 依赖、许可证与供应链策略符合项目要求；
    
*   • \[ \] 性能优化有基准或剖析数据支持。
    

* * *

## 30\. 官方延伸阅读

*   • The Rust Programming Language（Rust Book）
    
*   • The Rust Reference
    
*   • Rust By Example
    
*   • The Cargo Book
    
*   • The Rustonomicon：unsafe Rust 专题
    
*   • The Async Book：异步编程概念
    
*   • Standard Library API Documentation
    
*   • Edition Guide
    
*   • Rust Compiler Error Index
    
*   • Java Language Specification：用于精确核对 Java 语义
    

建议顺序：Rust Book → 编写小项目 → 标准库/Cargo 文档 → 按问题查 Reference → 有实际 unsafe 需求时再读 Rustonomicon。不要试图先背完生命周期和 unsafe 规则才开始写程序。

* * *

## 结语

Java 工程师学习 Rust 最困难的部分通常不是语法，而是接受“资源关系也属于类型设计”。在 Java 中，很多对象生命周期和共享问题由 GC、运行时锁和编码规范处理；在 Rust 中，函数签名、所有权移动、借用和 trait bound 会要求你更早回答这些问题。

判断一段 Rust 代码是否健康，可以持续询问：谁拥有这个值，谁只是在借用，失败由谁处理，并发任务何时结束，unsafe 边界依赖哪些不变量。只要这些答案清楚，借用检查器就不再只是阻碍，而会成为设计反馈工具。