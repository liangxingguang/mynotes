---
id: 2026-10-14-high-perf-low-cpu-coding-tips-part2
title: 打造高性能、低 CPU 消耗系统——36 种编码实战技巧（下篇）
source: 京东云开发者（微信公众号）
source_url: https://mp.weixin.qq.com/s/9xTFLXnCZIzU6mdYy1VFng
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags:
  - 工程实践
---

# 打造高性能、低 CPU 消耗系统——36 种编码实战技巧（下篇）

> 百万 QPS 经验编码手册的下篇（技巧 19–36）。重心从上篇的"少转换、少对象"转向 API 契约、内存布局与 JIT 友好：方法不返回 void/null 而返回空集合或统一响应体；嵌套压平、条件正向化；高频方法用 static/final 让 JIT 内联；集合预估容量、用完 clear、只读用不可变集合；固定错误码的业务异常用单例并关闭堆栈；字段按从大到小声明减少对齐填充；能用批量就不单条循环。同样只适用于有性能痛点的高并发场景。

## 核心要点

1. **返回值契约**：公共/RPC 方法禁止 void（失败只能靠异常传递状态）与 null（逼调用方判空、易 NPE）；统一返回 boolean、空对象或 `Collections.emptyList()`（JVM 级单例、零 GC），RPC 严禁返回 null。
2. **代码形态为性能服务**：条件用正向单层判断（isVip 而非 !isNotVip）；嵌套不超过 3 层，靠提前 return、条件反转、抽方法扁平化；高频核心方法用 static/final——编译期绑定、不查虚方法表、可 100% 内联（接口方法、需多态的业务方法、Spring AOP 代理方法不适合 final）。
3. **char/byte 优先于 String**：文本处理、协议、IO 场景直接操作 char[]/byte[]，少一层 String 封装与编解码，作者称快 5~50 倍；网络磁盘只认字节流。
4. **集合三件套**：初始化按预估值给容量（HashMap 容量=预估数/0.75，存 1000 元素默认容量要扩容 7 次）；批量任务/大遍历后主动 clear() 切断强引用，防大对象进老年代触发 FGC；只读集合用 `Collections.unmodifiableList`/`List.of()`——无锁线程安全、内存紧凑、JIT 访问快 15%~35%。
5. **循环纪律**：循环条件里禁放 RPC/SQL/复杂取值（每轮执行、开销被放大），结果提前存局部变量；对 2 的整数次幂乘除取模用位运算（1 个时钟周期 vs 10~30 个）；正则 Pattern 必须 static final，只在方法内调 matcher。
6. **异常三原则**：固定错误码/文案的业务异常声明为 static final 单例复用（异常不可变、90% 业务异常不需要堆栈），可预期异常重写关闭 fillInStackTrace；日志只打错误码+信息，禁 printStackTrace（比普通逻辑慢 10~100 倍）；try-catch 只包真正抛异常的行——try 块越大 JIT 越无法优化，还容易吞掉未知异常。未知系统异常（NPE、越界）必须每次 new 以保留堆栈。
7. **内存细节**：Integer/Long/Short 只缓存 -128~127（Byte 全部、Character 0~127），高频超出范围的值用 ConcurrentHashMap 手动缓存池；字段按 long/double→int/float→引用→short/char→byte/boolean 从大到小声明，同宽度扎堆，消除对齐 Padding，可用 JOL 验证。
8. **防御与批量**：equals 时常量放前面（`"x".equals(v)`）防 NPE；外部资源交互一律批量（N 次 IO/锁/事务往返压成 1 次），百条以上优势明显，万条以上要分片分批，1~10 条时单条与批量基本持平。

## 正文

下篇 18 个技巧一览（承接 [[2026-10-14-high-perf-low-cpu-coding-tips-part1]]）：

19. **避免 void/null 出参**：void 无法显性传递成败、只能抛异常；null 强制调用方判空且不省内存。空集合用 JDK 静态常量 Collections.emptyList()（全 JVM 单例），不要自己 new ArrayList。
20. **避免多重否定**：布尔命名正向化（isFinish/isValid/isExist），`!list.isEmpty()` 改写为 list.isNotEmpty()，减少逻辑写反与误改。
21. **严禁深层代码**：嵌套不超过 3 层，提前 return、抽取方法、条件反转；深层嵌套既难维护也影响 JIT。
22. **final 与静态方法性能最高**：普通虚方法运行期查虚方法表、动态分派、只能有限内联；static/final 编译期绑定、零分派、100% 安全内联。适合工具类、高频核心链路方法、模板算法、父类禁止子类修改的标准逻辑；不适合需多态重写的方法、接口方法、Spring AOP 代理方法。
23. **字符用 char、字节用 byte**：String = 对象头+数组引用+内容，String 操作底层仍拆成 char[]/byte[]；协议解析、IO 读写直接用原生类型，省掉编解码双倍开销。
24. **集合初始化指定预估容量**：扩容 = 新数组分配+全量拷贝+旧数组变垃圾；数组型集合（ArrayList/HashMap/ArrayDeque）必须预估容量，LinkedList/TreeMap 无扩容问题；HashMap 初始容量取 预估数量/0.75。
25. **及时清空大集合、解除强引用**：GC 只回收无强引用可达的对象；大集合被全局缓存/成员变量持有时元素永久滞留，方法结束也不释放，会提前晋升老年代触发 FGC。批量处理、定时任务、临时缓存用完主动 clear() 或置 null。
26. **只读集合用不可变集合**：Collections.unmodifiableList/Map、List.of()；天然线程安全无锁无 CAS、无预留空槽、JIT 可常量折叠，并防止返回值被外部篡改。
27. **循环条件不做复杂计算**：for 条件每轮执行一次，RPC、SQL、反射、正则、多层取值放进去会被循环次数放大；提前缓存为局部变量，也利于 JIT 循环展开与寄存器缓存。
28. **包装类缓存范围外手动缓存**：Integer/Long/Short 缓存 -128~127，超出即 new。高频值用 HashMap/ConcurrentHashMap 建 valueOf 风格缓存池，只缓存高频有限范围值，不要 new Integer()。
29. **复用异常对象**：new Exception 触发 fillInStackTrace() 遍历栈帧；固定码值的业务异常不可变，声明 static final 单例、建异常常量池，并可重写关闭堆栈填充。仅限可预期业务异常；NPE/越界等未知异常必须保留堆栈。
30. **关闭非必要堆栈打印**：printStackTrace/error(e) 要递归取每层类名行号、拼大字符串、写控制台或磁盘，比普通业务慢 10~100 倍；日志只打错误码+错误信息。
31. **缩小 try-catch 范围**：JVM 对 try 块内代码限制寄存器优化、指令重排与方法内联，try 越大优化越少；大 try 还会误吞未知异常、增加排查难度。
32. **位运算替代 2 的整数次幂乘除取模**：移位/与或非 1 个时钟周期，算术运算 10~30 个周期。
33. **正则 Pattern 全局静态化**：Pattern.compile 是重型运算，定义为 static final 一次编译全局复用，方法内只调 matcher。
34. **减少内存对齐浪费**：压缩指针下对象 = 对象头 12B + 字段 + 补齐到 8 的倍数；字段乱序会产生交错空隙。按 long/double(8B) → int/float(4B) → 引用(4B) → short/char(2B) → byte/boolean(1B) 从大到小、同宽扎堆声明；高频小对象/DTO/缓存对象优先优化，用 JOL 查看实际占用。（注：原文字节对照表有错位，以上为标准值。）
35. **判断时常量放前面**：`"字面量".equals(变量)`、`枚举常量.equals(变量)`，变量为 null 时返回 false 而非 NPE。
36. **批量处理更优**：单条循环的瓶颈在 IO 往返、锁竞争、方法调用、事务提交与上下文切换；批量把 N 次交互压成 1 次、一次加锁处理整批。百条以上优势显著，万条以上须分片+批量，1~10 条因封装开销两者持平。

## 来源

- 微信公众号 · 京东云开发者：[打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）](https://mp.weixin.qq.com/s/9xTFLXnCZIzU6mdYy1VFng)
- 上篇笔记：[[2026-10-14-high-perf-low-cpu-coding-tips-part1]]

## 附件

无
