---
id: wiki-source-java-perf-low-cpu-coding-tips-part2
type: source
title: 打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）
status: active
created: 2026-10-22
updated: 2026-10-22
confidence: high
tags:
  - source
  - java
  - performance
sources:
  - raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part2.md
related:
  - wiki/sources/java-perf-low-cpu-coding-tips-part1.md
  - wiki/concepts/cpu-funnel-coding.md
---
# 打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）

## Overview（概览）

京东云开发者"36 种编码实战技巧"系列下篇（技巧 19–36），承接 [[java-perf-low-cpu-coding-tips-part1|上篇]]。重心从上篇的"少转换、少对象"扩展到 API 返回值契约、JIT 友好代码形态、集合生命周期、异常开销与内存对齐布局。同样声明只适用于有性能痛点的高并发场景。

## Key Facts（关键事实）

- 返回值契约：公共/RPC 方法禁止 void（失败只能靠异常传状态）与 null（逼调用方判空、易 NPE）；空集合返回 `Collections.emptyList()`（JVM 级单例、零 GC）。
- 高频核心方法用 static/final：编译期绑定、不查虚方法表、可 100% 内联；接口方法、需多态的业务方法、Spring AOP 代理方法不适合 final。
- char/byte 优先于 String：文本处理、协议、IO 场景直接操作 char[]/byte[]，作者称快 5~50 倍。
- 集合三件套：按预估容量初始化（HashMap 容量 = 预估数/0.75）；大集合用完 clear() 切断强引用防 FGC；只读集合用不可变集合（无锁线程安全、JIT 访问快 15%~35%）。
- 循环纪律：循环条件禁放 RPC/SQL/复杂取值；2 的整数次幂乘除取模用位运算（1 vs 10~30 个时钟周期）；正则 Pattern 必须 static final。
- 异常三原则：固定错误码业务异常用 static final 单例并可关闭 fillInStackTrace；禁 printStackTrace（慢 10~100 倍）；try-catch 只包真正抛异常的行（try 越大 JIT 优化越少）；NPE/越界等未知异常必须每次 new 保留堆栈。
- 内存布局：Integer/Long/Short 只缓存 -128~127，超出范围的高频值用 ConcurrentHashMap 手动缓存池；字段按 long/double→int/float→引用→short/char→byte/boolean 从大到小声明，消除对齐 Padding（可用 JOL 验证）。
- 批量优于单条：外部资源交互把 N 次 IO/锁/事务往返压成 1 次；百条以上优势明显，万条以上分片分批，1~10 条两者持平。
- 防御细节：equals 常量放前面（`"x".equals(v)`）防 NPE；布尔命名正向化、嵌套不超过 3 层。

## Important Claims（重要论断）

### Claim 1：API 契约本身就是性能设计

void/null 出参把状态传递推给异常与判空分支，CPU 与 GC 开销在调用链上被放大；统一响应体与空集合单例是零成本契约。

### Claim 2：代码形态决定 JIT 上限

static/final、扁平嵌套、小 try 块、正向条件都是为 JIT 内联与寄存器优化让路——性能问题的一部分是"写法"问题而非"算法"问题。

### Claim 3：异常是重量级对象，应按纪律使用

业务异常单例化、关闭堆栈填充、缩小 try 范围；但未知系统异常必须保留堆栈，不可为性能牺牲可排查性。

## Concepts Introduced（引入的概念）

- [[cpu-funnel-coding]]（下篇技巧是该模型在契约/JIT/内存布局维度的延伸）

## Entities Mentioned（提及的实体）

- 京东云开发者（公众号，未单独建页）
- JOL（Java Object Layout 工具，未单独建页）

## Implications（影响／启示）

与上篇合并后形成 36 条可逐条对照的检查清单；下篇增量提示：性能评审除"转换/对象"外，还应检查返回值契约、异常使用方式与 DTO 字段声明顺序。

## Limitations（局限）

- 倍率类断言（5~50 倍、15%~35%、10~100 倍）未附基准环境，视为量级参考。
- 单一团队经验；静态单例异常等技巧有适用边界（仅固定错误码的可预期业务异常）。

## Related Knowledge（相关知识）

- [[java-perf-low-cpu-coding-tips-part1]]
- [[cpu-funnel-coding]]

## Source（信源）

- `raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part2.md`
