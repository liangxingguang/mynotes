# JVM面试题最全整理：从内存模型到OOM排查，一篇打通底层原理

## 一、JVM 运行时数据区

铁律：**凡是跟着线程走的都是私有的；凡是类信息和对象实例都是共享的。**

### 线程私有（3 个）

1. **程序计数器**：记录当前线程执行的字节码指令地址；唯一**不会 OOM** 的区域；执行 native 方法时值为 undefined。
2. **Java 虚拟机栈**：每个方法执行创建一个栈帧（局部变量表、操作数栈、动态链接、方法出口）。`StackOverflowError`（无限递归）/ OOM（无法扩展）。调优：`-Xss`。
3. **本地方法栈**：为 Native 方法服务，HotSpot 与虚拟机栈合并实现。

### 线程共享（2 个）

1. **Java 堆**：最大一块内存，几乎所有对象实例和数组在此分配，GC 主战场。年轻代 Eden+S0+S1（8:1:1）+ 老年代。OOM: Java heap space。参数 `-Xms`/`-Xmx`。G1/ZGC 后物理世代弱化，逻辑分代仍在。
2. **方法区**：类元信息、常量、静态变量、JIT 代码。JDK7- 永久代（用堆内存，易 OOM）→ JDK8+ 元空间（本地内存，受 `-XX:MaxMetaspaceSize` 控制）。JDK7 字符串常量池已移到堆。OOM: Metaspace（反射/CGLIB 动态生成大量类）。

## 二、对象创建与内存分配（TLAB、栈上分配、逃逸分析）

**创建六步流水线**：类加载检查 → 分配内存 → 初始化零值 → 设置对象头（Mark Word + 类型指针）→ 执行 `<init>` → 引用入栈。

分配内存：指针碰撞（内存规整，Serial/ParNew）vs 空闲列表（不规整，CMS）；并发安全靠 CAS+重试 或 TLAB。

**分配决策链（优先级：栈上 > TLAB > 堆）**：

```
对象分配请求
├─ 逃逸分析 ─未逃逸→ 标量替换/栈上分配（栈，零 GC）
└─ 逃逸 → 尝试 TLAB ─成功→ 线程私有 TLAB（Eden 内）
           └失败（TLAB满）→ 公共 Eden 区 CAS 分配（慢）
```

- **栈上分配**：对象不逃逸出方法即可分配在栈帧，方法结束自动销毁。逃逸分析 JDK8+ 默认开。附带优化：标量替换（拆成基本类型）、同步消除（无线程逃逸则去锁）。
- **TLAB**：每线程在 Eden 预分配专属区域（默认 Eden 的 1%），避免多线程竞争；满了申请新 TLAB；超大对象直接进堆。
- **堆上分配**：兜底，CAS 保证并发安全，须 GC 回收，性能最差。

误区：TLAB 是 Eden 的一部分属堆内存，不是堆外内存；栈上分配只适合小对象。

## 三、类加载五阶段

加载 → 验证 → 准备 → 解析 → 初始化（开始顺序固定，加载与连接交叉执行，解析可推迟到初始化后=动态绑定基础）。

1. **加载**：读字节流 → 方法区运行时结构 → 堆中 Class 对象。唯一可完全自定义的阶段（重写 `findClass()`）。
2. **验证**：文件格式（魔数 0xCAFEBABE）/元数据/字节码/符号引用四步验证；生产可 `-Xverify:none` 提速。
3. **准备（必考）**：只给 **static** 变量分配内存并赋**默认值**（int→0）。`static int num=100` 准备阶段 num=0，初始化才变 100；`static final` 常量准备阶段直接赋指定值（编译期入常量池）。
4. **解析**：符号引用 → 直接引用。失败抛 NoSuchFieldError/NoSuchMethodError。
5. **初始化**：执行 `<clinit>()`（静态变量赋值+静态代码块合并体）；父类先初始化；JVM 保证多线程加锁同步（静态块天然线程安全）。

**主动触发初始化仅 6 种**：new、调静态方法、访问静态字段（final 常量除外）、反射 Class.forName、初始化子类先初始化父类、启动主类。
**被动不触发**：子类引用父类静态字段只初始化父类；数组定义不初始化元素类；访问 final static 常量不触发。

## 四、双亲委派模型及破坏场景

**核心**：向上委托、向下加载——所有请求先传到 Bootstrap，父加载器搞不定才轮到子加载器。

**设计意义**：①沙箱安全（防恶意篡改 java.lang.String 等核心类）②保证类唯一性（同类不同加载器会产生不同 Class 对象，instanceof 失败）。

**破坏的 4 种场景**（破坏是特性不是 bug）：

1. JDK1.2 前自定义类加载器重写 `loadClass()`（之后官方建议重写 `findClass()`）。
2. **SPI 机制**：接口由 Bootstrap 加载（如 java.sql.Driver），实现类在 classpath 下加载不到 → 用**线程上下文类加载器**反向拿 AppClassLoader 加载实现类（JDBC/JNDI/JAXP）。"爸爸偶尔低头请儿子帮忙"。
3. **热部署**：Tomcat 每个 Web 应用独立 `WebappClassLoader`，**优先自己加载**找不到才委托父级，实现应用间隔离与热替换（JRebel、DevTools 同理：卸旧加载器造新的）。
4. **OSGi**：Bundle 各有类加载器，网状委派结构，支持热插拔与版本管理。

## 五、JMM 内存模型

**坑：JMM ≠ JVM 运行时内存结构**。JMM 是抽象规范，解决并发三大问题：原子性、可见性、有序性。

**主内存/工作内存**：线程不能直接读写主内存，必须拷贝副本到工作内存，用完写回。这直接导致可见性问题。

**happens-before 本质（必考）**：不是时间先后，是**可见性保证**——A happens-before B 则 A 的修改对 B 可见，且重排序不能把 A 排到 B 后。

**8 条规则**：程序顺序、volatile（写 hb 后续读）、锁（解锁 hb 后续加锁）、线程启动（start()）、线程终止（join()）、线程中断（interrupt()）、对象终结（初始化完成 hb finalize()）、传递性（组合所有规则的核心）。

误区纠正：时间先发生 ≠ happens-before；volatile 还禁止指令重排（DCL 单例必须加的原因）；synchronized 同时保证原子性+可见性+有序性。

## 六、四种引用类型

| 类型 | 回收时机 | 场景 | 坑 |
|---|---|---|---|
| 强引用 | 永不（只要引用在） | 日常 99% | OOM 罪魁祸首 |
| 软引用 SoftReference | 内存不足才回收 | 图片/大对象缓存 | 时机不可控 |
| 弱引用 WeakReference | 下次 GC 必回收 | ThreadLocal 的 Key | 生命周期极短 |
| 虚引用 PhantomReference | 不影响生命周期，get() 永为 null | 堆外内存回收跟踪（Netty） | 必须配 ReferenceQueue |

**ThreadLocal 为什么用弱引用 Key**：强引用会导致 ThreadLocal 对象回收后 Key 仍在，Entry 永远无法回收造成内存泄漏；弱引用 Key 变 null 后，get/set/remove 时自动清理无效 Entry。
**WeakHashMap 自动清理**：Key 是弱引用，GC 后下次操作清除 Entry。
**回收顺序**：弱引用先 → 软引用 → 最后 OOM。

## 七、OOM 场景与排查

**6 类 OOM 速查**：

| 错误关键词 | 病灶 | 排查动作 | 解药 |
|---|---|---|---|
| Java heap space | 堆 | jmap -dump → MAT 看大对象 | 扩堆/修代码（大对象加载、集合泄漏） |
| Metaspace | 元空间 | jstat -gc 看 MU/MC | 调 MaxMetaspaceSize、减动态类生成 |
| Direct buffer memory | 直接内存 | 查 NIO/Netty 堆外释放 | MaxDirectMemorySize、修泄漏 |
| StackOverflowError | 栈 | 递归无终止/循环依赖 | 修代码、调 -Xss |
| unable to create native thread | 线程/系统 | ps -eLf 数线程 | 有界线程池、调小 -Xss |
| GC overhead limit exceeded | 堆（严重） | GC 日志确认 98% 时间 GC | 扩堆、减少对象产生 |

**排查五步法**：看日志定类型 → 保留现场（提前配 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...`）→ 命令行快查（jps/jstat/jmap -histo/jstack）→ MAT 深度分析（Histogram/Dominator Tree/Leak Suspects）→ 压测验证+监控。

**注意**：`GC overhead limit exceeded` 比 heap space 更危险（98% 时间 GC 只回收 2%）；生产别直接 `jmap -dump`（进程停顿），优先 jstat/jstack；JVM 参数只是缓兵之计，90%+ 的 OOM 是代码问题；监控先行（Prometheus + JMX Exporter，老年代 >85% 持续 5 分钟告警，"台阶式上涨不回落"是泄漏征兆）。

内存溢出（确实不够）≠ 内存泄漏（不用了但回收不掉，最终导致溢出）。
