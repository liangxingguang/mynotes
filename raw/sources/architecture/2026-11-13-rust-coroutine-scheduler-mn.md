---
title: 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/KRAtC_fuYOoWofnb_xLEaQ
source_type: article
platform: 微信公众号
captured: 2026-11-13
registered_at: 2026-11-13
inbox_ref: Archive/2026-11-13-rust-coroutine-scheduler-mn.md
asset_ref: Assets/2026/11/rust-coroutine-scheduler-mn.md
---

# 用 Rust 从零实现协程调度器：M:N 用户态线程是怎么跑的

> 开一万个操作系统线程，内存先爆了——每个线程默认 8MB 栈，一万个就是 80GB 虚拟内存。

Go 的 goroutine、Erlang 的 process、Java 的虚拟线程，解决的正是这个问题：**把"执行流"从操作系统线程里解耦出来**，让创建协程像创建一个对象一样便宜。

这篇从零实现一个 M:N 调度器：M 个协程跑在 N 个操作系统线程上。

* * *

## 先算清两个成本

**线程创建成本：** 在 Linux 上 `clone()` 一次大约 10-30 微秒，还要分配栈、注册到内核调度器。

**线程切换成本：** 一次上下文切换大约 1-5 微秒，如果跨核还会触发缓存失效。

**协程的成本：**

*   • 创建：分配一个几 KB 的栈 + 一个结构体，约 100 纳秒

*   • 切换：保存/恢复寄存器，几十到几百纳秒

差距是**两个数量级**。这就是为什么高并发服务会自己实现协程调度。

## 上下文切换的本质：保存寄存器

CPU 执行代码靠的是一组寄存器：

`rip  - 下一条指令地址    ← 最关键   rsp  - 栈指针   rbp  - 栈帧基址   rax, rbx, rcx, rdx, rsi, rdi, r8-r15 - 通用寄存器`

**"切换执行流"就是"换掉这套寄存器的值"。**

操作系统做这件事叫上下文切换，需要陷入内核。用户态也可以做——只需要保存/恢复这些寄存器。

## 最简方案：用 ucontext

POSIX 提供了一个用户态的上下文切换 API：

`extern "C" {    fn getcontext(ucp: *mut Ucontext) -> i32;    fn setcontext(ucp: *const Ucontext) -> i32;    fn makecontext(ucp: *mut Ucontext, func: extern "C" fn(), argc: i32, ...);    fn swapcontext(oucp: *mut Ucontext, ucp: *const Ucontext) -> i32; }`

`swapcontext` 一句话完成了"保存当前上下文 + 切到另一个上下文"。

`#[repr(C)]   pub struct Ucontext {       // 平台相关，实际使用时需要足够的空间        _opaque: [u8; 968], // x86_64 Linux 上 sizeof(ucontext_t) 是 968   }`

**用 `ucontext` 的缺点**是每次切换都要走一次系统调用/signal mask 处理，比手写汇编慢。优点是**可移植、可读**，用来理解调度逻辑非常合适。工业实现（如 `may`、`corosensei`）会用汇编直接操作寄存器。

> **理解协程的第一个关键认知：切换协程不需要内核参与，只是换寄存器。**

## 协程的三种状态

`#[derive(Debug, Clone, Copy, PartialEq, Eq)]   pub enum Status {       /// 就绪，在队列里等着被调度        Ready,       /// 正在某个线程上跑        Running,       /// 主动让出，等被唤醒        Suspended,       /// 执行完毕        Done,   }`

`pub struct Coroutine {    pub id: u64,    pub status: Status,    /// 协程的上下文（寄存器快照）    ctx: Box<Ucontext>,    /// 协程的栈    stack: Vec<u8>,    /// 协程的函数    f: Option<Box<dyn FnOnce() + Send>>, }`

**栈要显式分配，并且归协程自己持有。** 这是协程相对线程最关键的不同：

*   • 线程的栈由内核管理，默认 8MB

*   • 协程的栈由库管理，通常 8KB - 64KB

`const DEFAULT_STACK_SIZE: usize = 64 * 1024;      impl Coroutine {    pub fn new(id: u64, f: Box<dyn FnOnce() + Send>) -> Self {            Self {                id,                status: Status::Ready,                ctx: Box::new(unsafe { std::mem::zeroed() }),                stack: vec![0u8; DEFAULT_STACK_SIZE],                f: Some(f),            }        }   }`

**栈大小需要权衡：**

| 栈大小 | 协程数量（1GB 可用） | 风险 |
|---|---|---|
| 64 KB | 16,384 | 递归深或大数组会溢出 |
| 16 KB | 65,536 | 稍不注意就溢出 |
| 4 KB | 262,144 | 基本只能用扁平代码 |

**栈溢出是协程实现里最危险的 bug**：它不会 panic，而是静默地写坏相邻内存。所以工业实现通常配合 guard page（在栈边界放一个不可访问的页，溢出时触发 SIGSEGV）。

## 初始化协程上下文

`impl Coroutine {    /// 把协程的上下文准备好，让它第一次被调度时从 trampoline 开始执行    pub fn prepare(&mut self) {        unsafe {            getcontext(&mut *self.ctx);            // 关键：把栈指针指向我们自己分配的栈            self.set_stack(&mut *self.ctx);            // 入口指向一个 trampoline            makecontext(                    &mut *self.ctx,                    coroutine_entry as extern "C" fn(),                    1,                    self as *mut Coroutine as usize, // 传参（简化写法）            );        }    } }`

`makecontext` 之后，这个上下文一旦被 `setcontext`/`swapcontext` 激活，就会跳到 `coroutine_entry`。

trampoline 的作用是"接住"协程函数，在执行完之后把状态标记为 Done：

`extern "C" fn coroutine_entry(coro_ptr: usize) {    let coro = unsafe { &mut *(coro_ptr as *mut Coroutine) };    // 取出并执行协程函数    if let Some(f) = coro.f.take() {        f();    }    // 标记结束，切换回调度器（永不返回）    coro.status = Status::Done;    unsafe {        setcontext(&SCHEDULER_CTX as *const Ucontext);    }    unreachable!() }`

**为什么需要 trampoline？** 因为协程函数执行完必须"回到调度器"，而不是返回到调用它的地方——它的调用栈是空的。trampoline 就是"栈底"的那个函数。

> **每个协程栈的底部都必须有一个 trampoline，它的唯一职责是"在协程结束时把控制权交还给调度器"。**

## 调度器：M:N 的核心

M:N 的意思是：**M 个协程跑在 N 个操作系统线程上。** 所以调度器需要两层：

```
全局就绪队列
   ┌──────────────┐
   │ [c1, c2, c3] │
   └──────┬───────┘
          │ 各线程来取
   ┌────────┼──────────┐
   v        v          v
worker0   worker1    worker2
(N 个 OS 线程)
  本地队列   本地队列   本地队列
```

**这正是上一篇工作窃取的结构**——只不过队列里装的是协程而不是闭包。

`pub struct Scheduler {    /// 全局队列（新创建的协程放这里）    global: Mutex<std::collections::VecDeque<Coroutine>>,    /// 每线程的本地队列    locals: Vec<Mutex<std::collections::VecDeque<Coroutine>>>,    /// 停止标志    shutdown: AtomicBool, }`

每个 worker 线程的主循环：

`fn worker_loop(sched: &Scheduler, worker_id: usize) {    loop {        if sched.shutdown.load(Ordering::Acquire) {            break;        }        // 1. 从本地队列取        let mut coro = sched.locals[worker_id].lock().unwrap().pop_front();        // 2. 本地为空，从全局取一批（batch 减少锁竞争）        if coro.is_none() {            let mut global = sched.global.lock().unwrap();            for _ in 0..32 {                if let Some(c) = global.pop_front() {                    sched.locals[worker_id].lock().unwrap().push_back(c);                } else {                    break;                }            }            coro = sched.locals[worker_id].lock().unwrap().pop_front();        }        // 3. 还是空，从别人那里偷        if coro.is_none() {            coro = sched.try_steal(worker_id);        }        match coro {            Some(c) => run_coroutine(c, sched, worker_id),            None => std::thread::yield_now(),        }    } }`

**第 2 步的"批量取 32 个"是个重要优化。** 如果每次都只从全局取一个，锁竞争会非常频繁。一次取一批到本地，能显著降低全局锁的压力。

## 运行协程：swapcontext 的核心用法

`/// 每个 worker 线程有自己的调度器上下文   thread_local! {    static SCHEDULER_CTX: std::cell::UnsafeCell<Ucontext> =        std::cell::UnsafeCell::new(unsafe { std::mem::zeroed() });   }      fn run_coroutine(mut coro: Coroutine, sched: &Scheduler, worker_id: usize) {    coro.status = Status::Running;    coro.prepare();    // 把协程放进当前线程的"正在运行"槽位，方便让它 yield 回来    CURRENT.with(|c| *c.borrow_mut() = Some(coro));    // 切到协程：保存调度器上下文，跳进协程    unsafe {        let sched_ctx = SCHEDULER_CTX.with(|c| c.get());        swapcontext(sched_ctx, &*CURRENT.with(|c| c.borrow()).as_ref().unwrap().ctx);    }    // 协程 yield 或结束后会回到这里    let coro = CURRENT.with(|c| c.borrow_mut().take()).unwrap();    match coro.status {        Status::Done => {/* 清理 */}        Status::Suspended => {            // 挂起了，放回队列等它的事件            // 注意：这里不能立刻重跑，否则会忙等        }        _ => {}    } }`

**`swapcontext` 的两参数语义值得记牢：**

`swapcontext(oucp, ucp)    1. 把"当前"上下文保存到 oucp   2. 切换到 ucp 继续执行`

所以上面那行的意思是：**保存调度器状态到 `SCHEDULER_CTX`，然后跳到协程的上下文。**

## yield：协程主动让出

协程需要一种"主动让出"的机制。最简单的实现是"回到调度器，进就绪队列尾部"：

`pub fn coroutine_yield() {    // 1. 把自己的状态改成 Ready    CURRENT.with(|c| {        if let Some(coro) = c.borrow_mut().as_mut() {            coro.status = Status::Ready;        }    });    // 2. 切回调度器    unsafe {        let sched_ctx = SCHEDULER_CTX.with(|c| c.get());        let coro_ctx = CURRENT.with(|c| &*c.borrow().as_ref().unwrap().ctx as *const Ucontext);        swapcontext(coro_ctx as *mut Ucontext, sched_ctx);    } }`

**这里有个类型系统上的麻烦**：`CURRENT` 里放的是 `RefCell<Option<Coroutine>>`，而协程执行期间我们既要"读取它的上下文"又要"修改它的状态"——借用检查器会拦。

实践中用 `UnsafeCell` + 手写 unsafe 访问是不可避免的。**这也是所有协程库的核心 unsafe 区域**，需要用注释把安全不变量写清楚：

`// SAFETY: 协程执行期间，CURRENT 中保存的 Coroutine 不会被其他线程访问   //（只有当前 worker 线程会碰它），且 swapcontext 期间不会有 Rust 代码并发读写它。`

## 唤醒：从挂起到就绪

一个协程 `Suspended` 之后，需要有人把它唤醒。唤醒只能从两种情况发生：

1.  **另一个协程显式唤醒它**（比如 channel 有数据了）
2.  **IO 就绪**（reactor 通知）

`pub struct Handle {     id: u64,     sched: std::sync::Arc<Scheduler>, }      impl Handle {    /// 把挂起的协程放回就绪队列    pub fn wake(&self) -> bool {        let mut suspended = self.sched.suspended.lock().unwrap();        if let Some(mut coro) = suspended.remove(&self.id) {            coro.status = Status::Ready;            self.sched.global.lock().unwrap().push_back(coro);            return true;        }        false    } }`

**`suspended` 这张表是必须的。** 一个挂起的协程不再在任何队列里，如果不记录它，就永远找不回来了——这就是**协程泄漏**。

> **协程的生命周期管理比线程更难：线程即使挂起也还在内核的任务表里，而挂起的协程只有你自己在管。**

## 阻塞调用：M:N 的最大陷阱

这里是所有协程实现共同面对的最棘手问题。

假设协程里调用了阻塞 API：

`coro.spawn(|| {    let data = std::fs::read("/big/file")?;  // 阻塞！    // ...   });`

`std::fs::read` 会阻塞**整个操作系统线程**。而那个线程上可能还有几十个其他协程等着被调度——**它们全被卡住了。**

三种应对：

**1. 提供异步版本的所有 API。** 用 epoll/kqueue 把 IO 变成异步，这是 tokio 的路子。代价是**整个生态必须重写**——你不能再直接用 `std::fs`、`std::net`。

**2. 检测到阻塞调用就扩容线程。** Go 的做法：runtime 能识别"这个系统调用会阻塞"，于是**额外启动一个 OS 线程接管其他协程**。

```
M 个协程 / N 个线程
某个协程发起阻塞系统调用 →
   ├── 线程被占用（进入 syscall）
   └── runtime 检测到，创建新线程接管其他协程
系统调用返回 → 线程回归线程池
```

**3. 显式区分阻塞任务。** tokio 的 `spawn_blocking`：标记为阻塞的任务扔进一个独立的、可以无限扩容的线程池。

`// tokio 的做法   tokio::task::spawn_blocking(|| {      std::fs::read("/big/file")  // 允许阻塞，跑在专用线程池   });`

**三条路的取舍：**

| 方案 | 优点 | 缺点 |
|---|---|---|
| 全异步 API | 性能最好 | 生态必须重写 |
| 动态扩线程（Go） | 用户无感 | 需要 runtime 深度介入，线程数可能失控 |
| 显式标记（tokio） | 边界清晰 | 用户需要知道哪些是阻塞的 |

> **M:N 调度最大的敌人不是切换开销，而是"用户代码里的阻塞调用"。** 一个阻塞调用能废掉整个 worker 线程上所有协程。

## 栈：为什么有些实现要用"分段栈"

固定栈大小有个根本矛盾：

*   • 栈小了，深递归或者大局部变量会溢出
*   • 栈大了，几十万个协程就把内存吃光

Go 的解法是**可增长的栈**：

```
初始栈 2KB
   ↓ 检测到栈快满（在函数序言里插检查）
分配 4KB 新栈，把旧栈内容复制过去，**修正所有指向旧栈的指针**
   ↓ 继续增长
8KB -> 16KB ...
```

**难点在"修正指针"**：栈上的局部变量可能互相引用，复制之后所有地址都变了。Go 为此要求所有栈上的指针都能被 runtime 识别（精确 GC 的前提）。

Rust 没有 GC，也没有运行时的栈布局信息，**所以 Rust 的协程库基本都只能用固定大小的栈**。这是 Rust 做协程相对 Go 的一个真实劣势。

变通方案是 `stackful` + 更大的固定栈，或者干脆用 `async/await`（无栈协程）——**这也是为什么 Rust 生态选了 async 而不是 goroutine 路线。**

## 结论

一个能跑的 M:N 协程调度器，需要这四块：

> **用 ucontext/汇编保存恢复寄存器；给每个协程分配独立栈，栈底放 trampoline；用工作窃取把协程分派到 N 个 OS 线程；维护一张"挂起协程表"以便唤醒。**

以及两个绕不过去的难点：

1.  **阻塞调用会卡住整个 worker 线程**——这是 M:N 最大的工程难题，三种解法各有权衡
2.  **栈大小是固定还是可增长**——Rust 因为缺乏运行时信息，几乎只能选固定栈

理解这些之后，你会明白 Rust 为什么最终选择了 `async/await` 这条**无栈协程**路线：编译器把状态机展开成一个结构体，不需要独立栈，也就没有栈溢出的问题。**代价是自引用结构（所以要 Pin），以及生态必须重写 IO。** 这也和前面写过的 Future 执行器那篇接上了。
