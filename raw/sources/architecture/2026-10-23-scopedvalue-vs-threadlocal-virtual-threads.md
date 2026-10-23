---
title: Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/GBcUYJAqW-mTbhTsOK5KWw
source_type: article
platform: 微信公众号
captured: 2026-10-23
registered_at: 2026-10-24
inbox_ref: Inbox/2026-10-23-scopedvalue-vs-threadlocal-virtual-threads.md
asset_ref: Assets/2026/10/scopedvalue-vs-threadlocal-virtual-threads.md
---

# Java 21 虚拟线程下 ThreadLocal 怎么办？ScopedValue 实战替代方案

## 引言

先看一次真实压测的内存报告：

网关服务切到虚拟线程（JDK 21 + `spring.threads.virtual.enabled=true`）后吞吐立涨 40%，团队很满意——直到压测 10 万并发时 Old 区从 800MB 涨到 2.3GB，young GC 每 10 分钟 41 次。MAT 打开 heap dump，榜首触目惊心：

```
Class Name                                        | Instances | Retained
java.lang.ThreadLocal$ThreadLocalMap              |   992,317 |  1.5 GB
java.lang.ThreadLocal$ThreadLocalMap$Entry        | 2,976,951 | （每个 map 里 3 个 Entry）
  ↳ TraceIdContext.TRACE_ID
  ↳ UserContext.USER
  ↳ TenantContext.TENANT
```

三个 ThreadLocal，10 万并发请求线程，每人一份 `ThreadLocalMap` 副本——平台线程时代"几百个池化线程共享几十个 ThreadLocal"的账，在虚拟线程时代被彻底改写：**每个请求一个线程，百万并发就是百万份副本**。官方早就为这个问题准备了答案：**ScopedValue**（Java 21 起预览，JEP 446；Java 25 起正式转正，JEP 506）——作用域内共享不可变值，用完自动释放，内存增量近乎为零。

这篇文章把迁移实战拆成三件事：**TraceId 透传改造、请求上下文传递、与 StructuredTaskScope 配合**，外加一笔"为什么 ThreadLocal 会膨胀"的内存账和实测前后对比。先放结论总表：

| 维度 | ThreadLocal | ScopedValue |
|---|---|---|
| 内存模型 | 每线程一份可变 Map | 共享一份不可变快照 |
| 虚拟线程百万并发 | 百万份副本，内存线性膨胀 | 增量近零 |
| 生命周期 | 手动 set/remove，忘 remove 有隐患 | 作用域结束自动解绑 |
| 池化脏值 | 有（需 finally remove 防御） | 无（读不到未绑定时 fail-fast） |
| 中途修改 | set() 任意改 | 不支持，需重新绑定 |
| 子线程传递 | InheritableThreadLocal 逐线程拷贝 | StructuredTaskScope fork 共享快照，零拷贝 |
| 版本状态 | 全版本 | 21~24 预览（--enable-preview），**25 正式** |

**一句话破题：ThreadLocal 的设计假设是"线程少且长命"——池化时代这个假设成立，虚拟线程把它彻底推翻；ScopedValue 把"每线程一份可变副本"换成"作用域内共享一份不可变快照"，同时解决了内存膨胀、泄漏和脏值三个问题——这不是换个 API，是换了一套内存模型。**

## 一、ThreadLocal 为什么会跟着虚拟线程膨胀

### 1.1 ThreadLocal 的内存模型：每个线程一份 Map

```
【ThreadLocal 的真相】Thread 对象内部挂着一张 ThreadLocalMap：
Thread #1 ──▶ ThreadLocalMap ──▶ Entry[TRACE_ID]  → "req-100"
                                 Entry[USER]      → userObj
Thread #2 ──▶ ThreadLocalMap ──▶ Entry[TRACE_ID]  → "req-100"
                                 Entry[USER]      → userObj
Thread #N ──▶ ThreadLocalMap ──▶ ...

"线程隔离"的实现方式 = 每个线程各自持有一份全量副本
值对象本身可以是共享引用，但 Map 结构（数组 + Entry）是每线程独立分配的
```

### 1.2 代价结构变了：老问题消失，新问题登场

ThreadLocal 在平台线程时代的两个经典问题，很多团队用 finally remove 和 CR 清单防了很多年：

| 问题 | 平台线程时代（池化） | 虚拟线程时代 |
|---|---|---|
| 脏值（读到上一个请求的数据） | 高发：线程复用，忘 remove 就串 | **消失**：线程不复用，用完即弃 |
| 忘记 remove 的残留 | 有：线程长命，残留一直占着 | **消失**：线程结束，整个 Map 一起回收 |
| 内存规模 | 几百线程 × Map，可忽略 | **百万线程 × Map，线性膨胀** |
| GC 压力 | 低 | **高**：每请求新分配 Map + Entry，短命对象暴增 |

**代价没有消失，只是换了一张脸**：池化时代防的是"脏值与残留"，虚拟线程时代换成"百万副本与 GC churn"。而 ScopedValue 是把三类问题一起终结的方案。

### 1.3 一笔内存账（量级估算）

```
ThreadLocalMap 懒创建，首次 set 时分配：
├── Entry[16] 数组           ≈ 128B（16 × 8B 引用）
├── 3 个 Entry 对象          ≈ 96B（32B/个）
└── 每线程结构开销           ≈ 200B+（不含值对象）

10 万并发请求 × 3 个 ThreadLocal ≈ 20MB 结构
100 万并发请求                   ≈ 200MB+ 结构（仅为 Map 骨架！）
                                  + 每请求分配/回收带来的 GC churn

ScopedValue 的每线程开销：
└── 栈帧上的一个绑定指针      ≈ 8B，作用域结束即失效
   快照本身全线程共享一份     → 百万并发增量趋近于零
```

还有一笔常被忽略的账：虚拟线程**不池化、短命**，每请求线程从创建到销毁就几十毫秒——ThreadLocal 模式下，这几十毫秒里要分配一张 Map、几十个 Entry，扔进 young 区等回收。10 万 QPS 就是 10 万张 Map/秒的分配速率，**young GC 频次直接被这些"结构性短命对象"抬高**。

### 1.4 顺带澄清一个常见混淆

有人说"虚拟线程下 ThreadLocal 会 pinning"——**不对**。Pinning（虚拟线程钉住载体线程）与 `synchronized` 块和本地调用栈有关，JDK 24 的 JEP 491 已移除 synchronized 导致的 pinning；它和 ThreadLocal 是两个独立问题，排查时别搅在一起。

### 1.5 结论

ThreadLocal 的问题不是"写错了"，是**内存模型与虚拟线程的并发模型冲突**：一边是"每线程可变副本"，一边是"百万级短命线程"。解法只有一条路——把"每人一份可变副本"换成"作用域内共享一份不可变快照"，这就是 ScopedValue。

## 二、ScopedValue 五分钟语义

### 2.1 最小可用示例

```java
public class TraceCtx {
    public static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();
}

// 绑定并执行：where() 进入作用域，run/call 结束自动解绑
ScopedValue.where(TraceCtx.TRACE_ID, "req-10086").run(() -> {
    service.handleOrder();      // 作用域内任意代码都能读到
});

// 在任意深处取值
String tid = TraceCtx.TRACE_ID.get();        // 未绑定时抛异常
boolean ok = TraceCtx.TRACE_ID.isBound();    // 防御式判断
String fallback = TraceCtx.TRACE_ID.orElse("none");   // 带默认值

// 有返回值/有受检异常的用 call()
String result = ScopedValue.where(TraceCtx.TRACE_ID, tid).call(() -> {
    return service.query();     // call() 抛 Exception，由调用方处理
});
```

### 2.2 三条铁律

```
【铁律一：不可变】
没有 set() 方法——作用域内值不可修改。
需要"变化"时，在嵌套作用域里重新绑定（见 2.3）。

【铁律二：作用域生命周期】
绑定只存活于 where(...).run/call 的执行期间：
  进入 run() → 绑定生效
  run() 返回/抛异常 → 绑定失效（自动，无需 finally）

【铁律三：结构化继承】
绑定随 StructuredTaskScope.fork() 的子任务自动可见，
且子任务生命周期必然 ⊆ 父作用域（结构化保证），快照共享零拷贝。
```

第三条正是 ScopedValue 在设计上胜过 `InheritableThreadLocal` 的地方：ITL 在子线程创建时**逐字段拷贝**，且拷贝后父子各自漂移；ScopedValue 共享同一快照，且生命周期被结构化并发"焊死"——不存在"子线程还活着、值已经没了"的悬空态。

### 2.3 嵌套重绑定：不可变下的"变化"

```java
ScopedValue.where(RequestCtx.CTX, ctx).run(() -> {
    handleBiz();                              // 此处 ctx.tenant = "main"

    // 定时补账任务要切换租户：嵌套作用域内重绑定，出作用域自动还原
    ScopedValue.where(RequestCtx.CTX, ctx.withTenant("backup")).run(() -> {
        handleBackup();                       // 此处读到 tenant = "backup"
    });

    handleAgain();                            // 还原为 "main"，外层无感知
});
```

重绑定遵循**栈式遮蔽**：内层绑定像局部变量一样"盖住"外层，出栈自动恢复。语义上等价于"把新值作为参数传给内层调用"，但不用一层层改方法签名——这正是上下文传递想要的写法。

### 2.4 版本状态（2026 年视角）

| 特性 | 版本轨迹 | 当前状态 |
|---|---|---|
| 虚拟线程 | Java 21 正式（JEP 444） | 生产可用 |
| ScopedValue | 21 预览（446）→ 25 正式（JEP 506） | **25 正式**；21~24 需 `--enable-preview` |
| StructuredTaskScope | 21 起五轮预览（25 中 JEP 505，API 已改版） | **仍是预览**，API 以 25 的 `open()` 版为准 |

工程建议：新项目直接 JDK 25（ScopedValue 免预览，虚拟线程更成熟）；已在 JDK 21 的团队可用 `--enable-preview` 提前趟平 API，迁移成本很低——毕竟核心就是"把 set/remove 改成 where/run"。

## 三、实战一：TraceId 透传改造

### 3.1 旧方案及其隐患

```java
// ThreadLocal 版（虚拟线程下不建议）
public class TraceFilter implements Filter {
    private static final ThreadLocal<String> TRACE_ID = new ThreadLocal<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        try {
            TRACE_ID.set(UUID.randomUUID().toString());
            chain.doFilter(req, resp);
        } finally {
            TRACE_ID.remove();     // ★ 忘了这行：池化时代是脏值事故，虚拟线程下是 GC churn
        }
    }

    public static String current() { return TRACE_ID.get(); }
}
```

三个隐患在虚拟线程下全部变味：finally remove 变成"每请求必执行的无效仪式"；`ThreadLocal.get` 沿 Map 查找的间接层在百万线程下徒增内存；且**如果链路里有线程池/异步段，TRACE_ID 会静默丢失或读到脏值**——老问题在异步场景从来没真正解决过。

### 3.2 新方案：ScopedValue 版 Filter

```java
public class TraceScopedFilter implements Filter {
    public static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        String traceId = Optional.ofNullable(req.getHeader("X-Trace-Id"))
                .orElse(UUID.randomUUID().toString());
        try {
            // call() 而非 run()：doFilter 有受检异常，call 会如实抛出
            ScopedValue.where(TRACE_ID, traceId).call(() -> {
                chain.doFilter(req, resp);
                return null;
            });
        } catch (ServletException | IOException e) {
            throw e;
        } catch (Exception e) {
            throw new ServletException(e);
        }
    }

    public static String current() {
        return TRACE_ID.isBound() ? TRACE_ID.get() : "no-trace";   // fail-fast 防御
    }
}
```

```yaml
# Spring Boot 3.2+ 开启虚拟线程：Tomcat 用虚拟线程执行每个请求
spring:
  threads:
    virtual:
      enabled: true
```

原理：Filter 链与业务代码运行在**同一个请求虚拟线程**上，`where(...).call(...)` 把绑定包住整条链——与 ThreadLocal 的生效范围一致，但作用域结束后绑定自动消失，没有任何"清理仪式"。

### 3.3 生效边界：哪些场景读不到

| 场景 | ScopedValue 可见？ | 原因与对策 |
|---|---|---|
| 同一请求线程（Filter→Service→DAO） | 可见 | 同线程作用域内 |
| `StructuredTaskScope.fork` 的子任务 | 可见 | 结构化继承（第五章） |
| `@Async` / 自建线程池 / `CompletableFuture` | **不可见** | 作用域不跨线程——见 FAQ 7.3 |
| Servlet 异步（startAsync） | **不可见** | 请求线程已退出作用域；异步段需显式传值或重新绑定 |

注意最后两行是"特性不是缺陷"：ThreadLocal 在这些场景会**读到脏值或 null**（静默错误），ScopedValue 会 `isBound()=false` 或直接抛异常（**fail-fast**）——把跨线程的隐式依赖变成显式的失败，恰恰是排查异步丢上下文时最想要的行为。

### 3.4 前后对比

| 指标 | ThreadLocal 版 | ScopedValue 版 |
|---|---|---|
| 每请求内存分配 | Map + N Entry | 近零（共享快照） |
| 清理代码 | finally remove | 无（作用域自动） |
| 异步段读到脏值风险 | 有（池化/复用） | 无（fail-fast） |
| 代码侵入 | 隐式静态方法 | 同样隐式，但语义更严格 |

## 四、实战二：请求上下文传递（用户/租户/鉴权信息）

### 4.1 把散落的 ThreadLocal 收敛成一个不可变快照

```java
// 用 record 表达"请求上下文"——天然不可变，与 ScopedValue 语义严丝合缝
public record RequestCtx(String traceId, long userId, String tenant) {
    public static final ScopedValue<RequestCtx> CTX = ScopedValue.newInstance();
    public static final RequestCtx ANONYMOUS = new RequestCtx("-", -1L, "default");

    /** 业务侧统一取值入口：未绑定回退匿名上下文，永不 NPE */
    public static RequestCtx current() {
        return CTX.isBound() ? CTX.get() : ANONYMOUS;
    }

    /** 不可变的"修改"= 派生新实例（配合嵌套重绑定使用） */
    public RequestCtx withTenant(String newTenant) {
        return new RequestCtx(traceId, userId, newTenant);
    }
}
```

```java
// 入口处一次性绑定全部上下文
ScopedValue.where(RequestCtx.CTX,
        new RequestCtx(traceId, loginUserId, tenantId)).run(() -> {
    chain.doFilter(req, resp);
});

// 业务任意深处：
RequestCtx ctx = RequestCtx.current();
log.info("tenant={}, user={}", ctx.tenant(), ctx.userId());
```

对比三个独立 ThreadLocal（TRACE_ID/USER/TENANT）的旧设计，收敛成 record 有三重收益：**一次绑定一次解绑**（不可能忘了其中一个）、**类型安全**（字段增减只改 record）、**测试友好**（单测里 `where(...).run(...)` 包一层即可构造任意上下文，不再需要反射清理 ThreadLocal）。

### 4.2 "中途要改上下文"的三种正确姿势

ThreadLocal 时代的 `USER.set(newUser)` 在 ScopedValue 下不存在，替换姿势按意图选：

```java
// 姿势一：嵌套作用域重绑定（临时的、局部的变化）
ScopedValue.where(RequestCtx.CTX, ctx.withTenant("audit")).run(() -> auditLog());

// 姿势二：显式传参（变化是业务语义的一部分，就写进方法签名）
orderService.refund(orderId, operatorUser);

// 姿势三：重新审视设计——凡是"上下文要被中途修改"的场景，
// 八成是把"业务状态"误放进了"请求上下文"。上下文只放"本次请求是谁/在哪"，不放过程状态。
```

**第三种最重要**：ScopedValue 没有 set() 是刻意的设计约束——它逼你区分"环境信息"（traceId/用户/租户，请求内不变）和"业务状态"（可变，显式建模）。很多 ThreadLocal 的脏值事故，根因就是把业务状态塞进了上下文。

## 五、实战三：与 StructuredTaskScope 配合（自动继承）

### 5.1 场景：并行调三个下游，上下文自动带过去

聚合接口要并行查用户、订单、营销，ThreadLocal 时代要么手动把 traceId 塞进每个 lambda，要么用 InheritableThreadLocal（逐线程拷贝，且与线程池组合时行为诡异）。StructuredTaskScope + ScopedValue 把这件事变成零成本：

```java
// JDK 25 预览 API（JEP 505）：--enable-preview
public ProfileView loadProfile(long uid) throws Exception {
    RequestCtx ctx = RequestCtx.current();          // 父作用域里读上下文

    try (var scope = StructuredTaskScope.open()) {
        // fork 的子任务自动继承父作用域的所有 ScopedValue 绑定（共享快照）
        var userTask  = scope.fork(() -> userService.load(ctx.userId()));
        var orderTask = scope.fork(() -> orderService.listByUser(ctx.userId()));
        var mktTask   = scope.fork(() -> mktService.couponsFor(ctx.tenant()));

        scope.join();          // 全部成功才返回；任一失败 → 抛异常并取消其余子任务

        return new ProfileView(userTask.get(), orderTask.get(), mktTask.get());
    }
}
```

三个要点：**① 子任务里 `TRACE_ID.get()` 直接可见**（打日志时 traceId 不断，聚合排障的刚需）；**② 任一子任务失败会取消其余并整体抛出**——避免"三个下游一个失败、另两个还在白跑"的浪费与悬挂；**③ 无需任何拷贝**——子任务与父任务共享同一个不可变快照。

### 5.2 继承机制原理图

```
ScopedValue.where(CTX, snapshot).run(() -> {
    // 父线程：栈帧持有绑定 → 指向 snapshot
    try (var scope = StructuredTaskScope.open()) {
        scope.fork(taskA);   ──▶ 共享同一 snapshot（零拷贝，一个指针的事）
        scope.fork(taskB);   ──▶ 共享同一 snapshot
        scope.join();        // 等待：结构化保证子任务全部结束才离开作用域
    }
});  // ← run 返回：绑定失效；因为结构化，子任务必然已结束——不存在悬空引用

【对比 InheritableThreadLocal】
创建子线程时逐字段拷贝 → 子线程数量多时内存 ×N
拷贝后父子各自漂移       → 线程池复用下行为不可预期
无生命周期约束           → 子线程可能比"值的语境"活得更久
```

### 5.3 版本提示

`StructuredTaskScope` 截至 Java 25 仍是**预览**（JEP 505 为第五轮预览，API 从 21 时代的 `new StructuredTaskScope.ShutdownOnFailure()` 改版为 `StructuredTaskScope.open()`）。生产策略与 ScopedValue 不同：**ScopedValue（25 正式）可以放心上；StructuredTaskScope 建议先在非核心链路试用**，等它转正。预览期间旧代码升级 25 时注意 API 改名——`ShutdownOnFailure` 写法要迁移到 `open()`。

## 六、实测数据与迁移检查表

### 6.1 压测对比（同环境：JDK 25、4C8G、网关服务、10 万并发、每请求 3 项上下文）

| 指标 | ThreadLocal | ScopedValue | 变化 |
|---|---|---|---|
| Old Gen 峰值 | 2.3 GB | 0.9 GB | **-61%** |
| ThreadLocalMap retained（MAT） | 1.5 GB | 0 | 归零 |
| Young GC（10 分钟压测） | 41 次 | 28 次 | -32%（少了 Map/Entry churn） |
| P99 延迟 | 基线 | 持平（±2%） | 无损 |
| 吞吐 | 基线 | 持平 | 无损 |
| 异步段上下文正确性 | 脏值/丢失（静默） | fail-fast（显式失败） | 错误可发现 |

数据口径说明：结构内存按 1.3 节公式随并发线性变化，具体数字以你们的 ThreadLocal 个数与并发量为准；**收益随并发量与 ThreadLocal 个数放大**——3 个以下 ThreadLocal、并发不高的小服务，迁移收益有限，动机应侧重正确性（fail-fast）而非内存。

### 6.2 迁移五步检查表

```
① 盘点：grep 全库 ThreadLocal/InheritableThreadLocal 使用点，按用途分类
   （请求上下文/traceId → 迁；per-thread 缓存、可变状态 → 留，见 7.6）
② 合并：散落的多个 ThreadLocal 收敛为一个 record 上下文（4.1）
③ 替换：set/remove 改 where/run（或 call），删除所有 finally remove
④ 排雷：@Async/线程池/CompletableFuture/异步 Servlet 处——
   ThreadLocal 时代这里是脏值，ScopedValue 时代是 isBound=false，
   逐个改成显式传值或在目标线程重新绑定
⑤ 验证：压测确认内存/GC 收益 + 异常链路回归（上下文在异常路径同样自动解绑）
```

## 七、常见问题

### 7.1 Java 21 能用 ScopedValue 吗？怎么配？

能，但处于预览状态（JEP 446），需要 `--enable-preview` 编译和运行。Spring Boot 场景：Maven 在 `maven-compiler-plugin` 加 `<compilerArgs><arg>--enable-preview</arg></compilerArgs>`，同时给 surefire 与运行时的 JVM 参数加 `--enable-preview`。**升级 JDK 25 后删掉这些配置即可**（JEP 506 已转正，API 兼容预览版）。另外 StructuredTaskScope 在 25 仍是预览，单独别忘配。

### 7.2 为什么 ScopedValue 没有 set()？"必须可变"的代码怎么迁？

设计立场：**作用域内可变共享状态是脏值、并发 bug 和测试困难的根源**，ScopedValue 从 API 层面封死这条路。迁移三选一：临时变化 → 嵌套作用域重绑定（2.3）；业务语义变化 → 显式传参（4.2 姿势二）；真正的过程状态 → 别放上下文，用显式对象承载（4.2 姿势三）。**如果一个上下文被大量 set()，先怀疑它的定位错了。**

### 7.3 值传进线程池/CompletableFuture 后 isBound()=false，怎么排查和修？

先建立认知：**ScopedValue 的绑定不跨线程**（ThreadLocal 也一样，只是它失败得安静——读到 null 或脏值）。排查动作：找出所有"隐式跨线程"点（`@Async`、`ExecutorService.submit`、`CompletableFuture.runAsync`、异步 Servlet），逐个修：优先把值作为**参数显式传入**；确需隐式传递时，在目标线程**重新绑定**（把 `ScopedValue.where(...)` 作为任务包装器，或用结构化并发替代线程池）。虚拟线程时代建议顺势把"线程池 + 手动跨线程传递"的杂技收敛到 StructuredTaskScope——继承、取消、异常传播一次解决。

### 7.4 日志的 MDC 是 ThreadLocal 实现，要迁吗？

现阶段**不必迁，也迁不了**：logback/log4j2 的 MDC 就是 ThreadLocal 基建的，接口没留替换点。现状分两种情况：同一请求线程内打日志（绝大多数场景）——MDC 在虚拟线程上工作正常，一个请求一个线程、线程即弃，反而天然没有池化脏值问题；异步/结构化子任务里打日志——MDC 会丢，与 7.3 同解：Micrometer 的 context-propagation 做 snapshot 传递，或在 fork 的任务里手动 MDC.set。**值得跟进生态：MDC 的 ScopedValue 化需要日志框架原生支持，可以关注 logback 的版本路线图**——在它落地前，"MDC 留 ThreadLocal、业务上下文迁 ScopedValue"是务实组合。

### 7.5 和 InheritableThreadLocal 到底差在哪？

四点：**拷贝时机**——ITL 在子线程创建瞬间逐字段拷贝，ScopedValue 是 StructuredTaskScope fork 时共享引用（零拷贝）；**内存**——百万子任务下 ITL 内存 ×N，ScopedValue 恒为一份快照；**漂移**——ITL 拷贝后父子各自可变，出现"子线程看到旧值"的灵异问题，ScopedValue 不可变、无漂移；**生命周期**——ITL 无约束（子线程可能比值的语境活得久），ScopedValue 靠结构化并发的"子任务 ⊆ 父作用域"焊死悬空态。结论：**虚拟线程里 InheritableThreadLocal 没有存在理由，见到即迁。**

### 7.6 什么场景下 ThreadLocal 仍然是正确选择？

不是全盘替换，按"值的生命周期"决策：

| 场景 | 选择 | 理由 |
|---|---|---|
| 请求级上下文（traceId/用户/租户） | **ScopedValue** | 生命周期=请求，天然不可变 |
| per-thread 重对象缓存（SimpleDateFormat、缓冲区） | ThreadLocal | 绑定长生命周期工作线程，避免重复分配 |
| 池化 worker 的可变线程私有状态 | ThreadLocal | 状态本来就要跨请求存活 |
| 真正需要中途 set 的框架内部机制 | ThreadLocal | 或者重新设计为显式传递 |

一句话：**值随请求生、随请求死、请求内不变 → ScopedValue；绑定线程而非请求 → ThreadLocal。** 两者长期共存，不是替代关系而是分工关系。

## 八、总结

### 决策树

```
上下文传递怎么选：
├── 值随请求而生、请求结束即亡？
│   ├── 不可变快照（traceId/用户/租户）   → ScopedValue（25 正式；21~24 预览）
│   └── 中途要"变"？
│        ├── 临时/局部变化               → 嵌套作用域重绑定
│        └── 频繁变化                   → 重新审视：是上下文还是业务状态？
├── 跨线程（fan-out/聚合）？
│   ├── 结构化并行                       → StructuredTaskScope.fork 自动继承
│   └── 非结构化（@Async/线程池）        → 显式传值，或目标线程重新绑定
├── 绑定长命工作线程的 per-thread 状态   → ThreadLocal（依然是正解）
└── 日志 MDC                            → 暂留 ThreadLocal，异步段 context-propagation
```

### API 速查表（ThreadLocal → ScopedValue 对照）

| 操作 | ThreadLocal | ScopedValue |
|---|---|---|
| 进入作用域 | `tl.set(v)` | `ScopedValue.where(TL, v).run/call(...)` |
| 取值 | `tl.get()` | `TL.get()` / `orElse()` / `isBound()` |
| 清理 | `tl.remove()`（finally 里） | 无需（作用域结束自动） |
| "修改" | `tl.set(newV)` | 嵌套 `where(...).run(...)` 重绑定 |
| 子线程 | `InheritableThreadLocal`（拷贝） | StructuredTaskScope fork（共享） |

### 关键数据

- 10 万并发 × 3 个 ThreadLocal：ThreadLocalMap retained **1.5GB**（MAT），Old Gen 2.3GB
- 迁移 ScopedValue 后：Old Gen **0.9GB（-61%）**，Map retained 归零，Young GC 41→28 次（-32%）
- 每线程 ThreadLocalMap 骨架 ≈ 200B+（3 个 Entry 量级估算），百万并发即 200MB+ 纯结构开销；ScopedValue 每线程 ≈ 一个指针
- 吞吐与 P99：持平（±2%）——**收益在内存与正确性，不在吞吐**
- 版本：ScopedValue 21 预览 → **25 正式（JEP 506）**；StructuredTaskScope 截至 25 仍预览（API 已改版为 open()）

### 给团队的建议

| 项目状态 | 建议 |
|---|---|
| 已用虚拟线程 + 多个请求级 ThreadLocal | 立项迁移：收敛 record + where/run，压测验证内存收益 |
| 还在 JDK 17/21 观望 | 升级 JDK 25 一步到位：虚拟线程 + ScopedValue 都免预览 |
| 上下文散落多个 ThreadLocal 类 | 先合并成一个 record 再迁，顺便清掉"忘 remove"类历史防御代码 |
| 大量 @Async/线程池传上下文 | 逐个排查 isBound=false 点，优先显式传值，结构化场景换 StructuredTaskScope |
| 有 per-thread 缓存/可变状态 | 保留 ThreadLocal，别为迁移而迁移 |
| 团队规范 | 把"上下文类"的写法（record + ScopedValue + current()）沉淀成脚手架模板 |
