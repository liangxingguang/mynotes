J V M  参 数

## JVM 参数：一份按版本对账的手册

从 JDK 8 到 25，哪些参数变了，哪些已经死了

一个从 2015 年活到现在的启动脚本，长得大概是这样的：

```
java -Xms2g -Xmx2g -XX:PermSize=256m -XX:MaxPermSize=512m \      -XX:+UseConcMarkSweepGC -XX:+PrintGCDetails \      -XX:+PrintGCDateStamps -Xloggc:/var/log/gc.log \      -XX:+UseBiasedLocking -jar app.jar 
```

把它放回 JDK 8 上，能跑。把同样的脚本放到 JDK 17 上，起不来。

不是某一个参数报错，而是六个参数里有四个已经作废、一个会让进程直接退出、只剩两个还认。这件事最坑的地方在于：**升级的人往往只看启动成功没有，而不看启动日志里那些被跳过的警告**。

所以这篇不打算给你一张百条参数的清单。清单到处都有，而且默认值每年都在动。我想捋的是另一件事：同一行参数，在四个 LTS 上分别是什么命运。

JDK 8、17、21、25，是目前还活着的主力版本。它们之间的参数差异，大致分三类：**改了默认值的**、**换了写法的**、**已经没了但你还在用的**。

第三类最危险，因为它是静默的。

0 1

## 先认清一件事：参数分三种，命运不一样

启动命令里那些以减号开头的东西，其实不是一个体系。

写法

叫什么

稳定性

`-Xms``-Xmx``-Xss``-Xlog`

非标准参数

平台相关，但基本稳定

`-Dkey=value`

系统属性

不是 JVM 参数，只是顺路传进去，代码里 `System.getProperty` 读

`-XX:+Foo`

  
`-XX:-Foo`  
`-XX:Foo=值`

扩展参数

这才是真正会随版本生死的部分

`-XX` 里面又分档：

*   **product**
    
    ：正式支持，随便用。`-XX:+UseG1GC`、`-Xmx`（它其实就是 `-XX:MaxHeapSize` 的别名）。
    

*   **experimental**
    
    ：实验特性，必须先用 `-XX:+UnlockExperimentalVMOptions` 解锁。ZGC 在 JDK 11 上是这一类，紧凑对象头在 JDK 24 上也是。
    

*   **diagnostic**
    
    ：诊断用，要 `-XX:+UnlockDiagnosticVMOptions`，多半给排查问题用，别放生产脚本。
    

*   **manageable**
    
    ：可以运行时改，`jinfo -flag` 能改的就是这类。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**产品级和实验级的区别，就在那一个解锁开关上。** 同一个参数，在 A 版本要解锁、在 B 版本不用解锁、在 C 版本已经默认打开——这是 JVM 参数最反直觉的地方。

所以全文最该记住的不是任何一条参数，是这一条命令：

```
java -XX:+PrintFlagsFinal -XX:+UnlockDiagnosticVMOptions \      -XX:+UnlockExperimentalVMOptions -version 2>&1 | grep 你要查的 
```

它打印的是**这台机器、这个版本、这套启动参数下，真正生效的值**，以及来源（`{default}` 还是 `{command line}`）。

还有一条更短的，只打印被显式改过的那几行：

```
java -XX:+PrintCommandLineFlags -version 
```

升级前拿这两条命令对一遍新旧环境，比读十篇参数大全有用。**参数是版本的函数，不是知识。**

0 2

## 堆：那五六个数，四个版本几乎没变

好消息先说：内存布局这部分，8 到 25 基本通用。

参数

管什么

备注

`-Xms`

 / `-Xmx`

堆初始 / 最大

生产环境建议设成相等

`-Xss`

单线程栈

默认约 1MB，平台不同，用 `ThreadStackSize` 查

`-XX:MetaspaceSize`

**首次**

触发 Metaspace 回收的阈值

注意，不是“初始大小”

`-XX:MaxMetaspaceSize`

元空间上限

默认无上限，见后面第 06 节

`-XX:MaxDirectMemorySize`

堆外直接内存上限

默认等于 `-Xmx`

`-XX:SurvivorRatio`

Eden 与单个 Survivor 的比例

默认 8，G1 下换另有参数

`-XX:MaxTenuringThreshold`

晋升老年代的年龄阈值

默认 15

`-XX:MetaspaceSize` 这个名字骗过很多人。它不是分配时给多大，而是**什么时候开始认真回收**：元空间占到这条线，就触发一次回收并重新估算。JDK 8 里它的默认值只有 21MB 左右，所以刚启动、类加载高峰的时候，你会看到莫名其妙的 Full GC。生产上一般显式给到 256m 起。

`-Xms` 和 `-Xmx` 设成一样，是为了避免运行期反复扩缩容。堆一大，扩出来那一下的停顿会很明显。

配套的还有 `-XX:+AlwaysPreTouch`：启动时就把堆的内存页全部预提交，让后面的分配不再触发缺页中断。代价是启动变慢、RSS 立刻顶到 `-Xmx`。**容器里慎用**，它会让你的进程从一开始就贴着 limit 跑。

新生代这块有个版本差异容易被忽略。**JDK 8 上很多人习惯用 `-Xmn` 固定新生代大小，到了 G1 当默认的版本，`-Xmn` 基本失去意义**——G1 的新生代是自适应的，由 `-XX:G1NewSizePercent`（默认 5）、`-XX:G1MaxNewSizePercent`（默认 60）和 `-XX:MaxGCPauseMillis`（默认 200ms）共同决定。

在 G1 上调新生代，正确姿势是调停顿目标，不是调大小。你越是想精确控制，越会把它调坏。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一条最小可用的堆配置，四个版本通用：

```
-Xms4g -Xmx4g -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \ -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump 
```

`-XX:+HeapDumpOnOutOfMemoryError` 不需要多解释，唯一的遗憾是大多数人加上它的时候，事故已经发生过一次了。

0 3

## 容器：JDK 8 和 17 差了一整个世界观

这一节是纯 JDK 8 与之后的差异，也是“本地跑得好，上容器就 OOM”的根源。

**JDK 8u191 之前，JVM 不知道有容器这回事。** 你在 Docker 里限制 4GB，它看的是宿主机那 64GB，于是 `-Xmx` 按宿主机内存推算，一个巴掌拍下去容器就被内核杀了——退出码 137，Not a JVM crash。

CPU 也一样。`Runtime.getRuntime().availableProcessors()` 返回的是宿主机核数，GC 线程数跟着它算。公式是：8 核以内等于核数，超过 8 核按 `8 + (n-8)*5/8`。宿主机 32 核的机器上，你的 2 核容器里凭空多出二十几个 GC 线程互相抢锁。

从 JDK 8u191 和 JDK 10 开始，`-XX:+UseContainerSupport` 默认开启，JVM 会去读 cgroups 的配额。这事才算解决。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

容器里的内存配置，现在有两种写法。

**写法一，写死绝对值**：`-Xmx` 给一个明确值，比如容器 4G 就配 3G。最稳，推荐。

**写法二，按百分比**：

```
-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=75.0 
```

堆占容器可用内存的 75%，剩下 25% 留给元空间、线程栈、直接内存、JIT 代码缓存、GC 自身的数据结构。这个比例不是随便拍的——一个用 NIO 或者 Netty 的服务，直接内存能吃掉好几 G，75% 就偏高了，压到 60% 更安全。

三个百分比参数有个很容易踩的坑：`-XX:MinRAMPercentage`**不是“最小堆占比”**，它只在可用内存很小（小于 200MB 左右）时才生效。你在 4G 容器里设它，什么都不会发生。

顺便，默认值本身也会变。`MaxRAMPercentage` 在多数版本上是 25%，但对于一个 4G 的容器，25% 就是 1G 堆，明显偏小。**别信任何文章里的默认值，包括这篇——用 `PrintFlagsFinal` 自己看。**

容器里核数不对的兜底开关是 `-XX:ActiveProcessorCount=2`（8u191+），直接覆盖 JVM 检测到的 CPU 数。

验证到底生效没有，两行命令：

```
java -XX:+PrintFlagsFinal -version 2>&1 | grep -E "MaxHeapSize|ActiveProcessorCount" 
```

数字对得上容器配额，说明容器感知正常工作。对不上，先查版本，再查 cgroups v1 与 v2 的支持情况。

0 4

## GC 选择：四个版本的默认值，其实是一条线

这一段是全文版本差异最密集的地方。

版本

默认 GC

可选

已经不在了

JDK 8

Parallel（Server 模式）

Serial / Parallel / CMS / G1

—

JDK 9

**G1**

同上

CMS 标记废弃

JDK 11

G1

加 ZGC、Epsilon（均为实验）

—

JDK 14

G1

—

**CMS 移除**

JDK 15

G1

ZGC、Shenandoah 转为产品级；偏向锁默认关闭

—

JDK 17

G1

ZGC / Shenandoah 稳定可用

CMS 参数启动即报错

JDK 21

G1

分代 ZGC（需显式开）

—

JDK 23

G1

分代 ZGC 成为默认

非分代 ZGC 废弃

JDK 24

G1

—

**非分代 ZGC 移除**

JDK 25

G1

Shenandoah 分代转正

`-XX:ZGenerational`

 只剩警告

看清楚一件事：**`-XX:+UseZGC` 这一行，在 JDK 21 和 JDK 25 上跑出来的不是同一个 GC。**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

JDK 21 上它给你的是传统单代 ZGC，要用分代得再加 `-XX:+ZGenerational`。JDK 23 起分代成了默认。JDK 24 把单代模式整个删了。到 JDK 25，你写 `-XX:-ZGenerational` 也不会报错，只会打一行 `Ignoring option ZGenerational; support was removed in 24.0`，然后照样用分代模式。

这种“不报错但行为变了”的差异，比报错难查一百倍。如果你在 21 上按单代 ZGC 调过堆和停顿，升到 25 必须重新压测。

同样的故事在 Shenandoah 上温和一些：JDK 24 实验性引入分代模式，JDK 25 转为产品特性，不再需要解锁，但**默认仍是单代**，要显式写 `-XX:ShenandoahGCMode=generational`。另外，Oracle JDK 的分支里没有 Shenandoah，只有 OpenJDK 系（Temurin、Corretto、龙井等）才有。

至于怎么选，其实没什么新鲜答案：

*   堆小于 4G、追求吞吐、能忍几百毫秒停顿 → Parallel，别折腾
    

*   大多数 Web 服务 → G1，调 `MaxGCPauseMillis`，其他别动
    

*   堆大到几十 G 以上、P99 是硬指标 → 分代 ZGC，但要接受多烧 10% 到 15% 的 CPU
    

*   只有在做分配速率基准测试时 → Epsilon（至今仍是实验特性）
    

那些教人关掉 `-XX:-UseAdaptiveSizePolicy`、手调 Survivor 比例的老经验，在 G1 时代基本是负收益。G1 的自适应比你手算的准。

0 5

## GC 日志：从“开一堆开关”到“一条 -Xlog”

JDK 9 引入统一日志框架之后，GC 日志的写法变了一次代际。

老写法（JDK 8，一堆布尔开关）：

```
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -XX:+PrintGCTimeStamps \ -XX:+PrintTenuringDistribution -XX:+PrintHeapAtGC \ -XX:+PrintReferenceGC -XX:+PrintAdaptiveSizePolicy \ -Xloggc:/var/log/gc.log -XX:+UseGCLogFileRotation \ -XX:NumberOfGCLogFiles=5 -XX:GCLogFileSize=10M 
```

新写法（JDK 9+，一条搞定）：

```
-Xlog:gc*,gc+age=trace,gc+heap=debug,gc+ref=debug:\ file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m 
```

对照表：

JDK 8

JDK 9+

`-XX:+PrintGCDetails`

`-Xlog:gc*`

`-XX:+PrintGCDateStamps`

`-Xlog:gc*:...:time`

`-Xloggc:file`

`-Xlog:gc*:file=路径`

`-XX:+PrintTenuringDistribution`

`-Xlog:gc+age=trace`

`-XX:+PrintHeapAtGC`

`-Xlog:gc+heap=debug`

`-XX:+PrintReferenceGC`

`-Xlog:gc+ref=debug`

`-XX:+PrintAdaptiveSizePolicy`

`-Xlog:gc+ergo*=trace`

轮转三件套

`filecount=``filesize=`

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这里有个非常现实的坑，值得单独说。

在 JDK 17 上，`-XX:+PrintGCDetails` 只会给个警告"已废弃，将使用 `-Xlog:gc*` 代替"，进程照跑。但 `-XX:+PrintGCDateStamps` 是**直接 unrecognized，JVM 拒绝启动**。

也就是说，迁移迁了一半的结果是：启动成功、日志目录空着、你以为 GC 日志在采，实际上没有。等到线上出事要查的时候，才发现一行都没有。

`-Xlog` 本身的语法也值得记一下，它是个三段式：

```
-Xlog:标签:输出目标:装饰器 
```

标签选“打什么”（`gc`、`gc+age`、`safepoint`、`class+load`），目标选“打到哪”（`stdout`、`file=xxx`），装饰器选“每行加什么”（`time`、`uptime`、`level`、`tags`、`pid`）。默认输出没有日期时间，只有 JVM 启动后的秒数，所以 `time` 这个装饰器基本必加。

还有个小变化：`jstat -gcutil` 在 17 上多了 `CGC`、`CGCT` 两列。按列号取数的老监控脚本，会从这一版开始取错。

0 6

## 升级必踩的四个坑

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第一个：元空间没有上限。**

JDK 8 之后 PermGen 没了，换成 Metaspace，而 `-XX:MaxMetaspaceSize` 默认是**不限制**。不限制的后果，在有 swap 的物理机上是一次漫长的内存耗尽；在容器里更干脆——进程直接 OOMKilled，你连 heap dump 都拿不到。

生产上显式给个上限，512m 到 1g 覆盖绝大多数应用，用 `jcmd <pid> VM.metaspace` 能看到实际用量。

**第二个：反射被墙了。**

JDK 16 起，`--illegal-access` 默认变成 deny，JDK 17 通过 JEP 403 把 JDK 内部包彻底封死。老代码里靠反射改 `String.value`、读 `Unsafe.theUnsafe` 的，升级后直接抛 `InaccessibleObjectException`。

解法不是加 `--illegal-access=permit`（这个参数在 17 上已经没用了），是显式开洞：

```
--add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED 
```

这属于**应用参数**，不是 GC 参数，但它确实是一条 JVM 启动参数，而且升级时最常被漏掉。开得越少越好，每开一个都是在提醒你：这块代码该重写了。

**第三个：偏向锁。**

JDK 15 起偏向锁默认关闭，`-XX:+UseBiasedLocking` 从那时起废弃。在 17 上写它只是警告，在更后的版本上连认都不认。

结论很简单：**从启动脚本里删掉这一行，不要找替代品。** 虚拟线程和现代锁实现面前，偏向锁已经是个历史包袱。

**第四个，中文环境最容易误判的：文件编码。**

JDK 18 起 `-Dfile.encoding` 默认变成 UTF-8（JEP 400）。在 JDK 8 上它是平台编码，中文 Windows 就是 GBK。

这意味着同一个读文件、写 CSV、调 shell 的程序，在 8 和 17 上行为可以完全不同。升级后看到乱码，第一反应往往是“新版本有 bug”，实际上是默认值变了。

要在新版本上保留旧行为：`-Dfile.encoding=COMPAT`。要迁移干净：显式写 UTF-8，然后把代码里那些 `new String(bytes)`、`new FileReader(f)` 全部改成带 charset 的版本。

还有一批在 JDK 24 被彻底移除、在 25 上启动即失败的：`-Xfuture`、`-noclassgc`、`-Xnoagent`、`-Xdebug` 的部分旧语义。这些参数平时没人写，但老脚本里传下来的“祖传配置”里经常有。

**升级前最省事的动作：拿新 JDK 跑一遍 `java <你的全部参数> -version`。** 报 Unrecognized 的一个个删，报 deprecated 的一个个换。五分钟的事，能省掉后面一周的排查。

0 7

## JDK 21 之后，值得知道的三个变化

**分代 ZGC 的可调参数是这个时代新增的核心内容。**

`-XX:SoftMaxHeapSize` 让 ZGC 在软上限附近尽量保持，不急着扩到 `-Xmx`；`-XX:ZUncommit` 和 `-XX:ZUncommitDelay` 控制空闲内存多久还给操作系统。这几个参数在 JDK 8 上完全不存在，在 21 上是调 ZGC 的主要抓手。

**虚拟线程不是参数，但它改变了 `-Xss` 的意义。**

平台线程的栈在栈上分配，`-Xss` 决定每个线程吃多少；虚拟线程的栈在**堆**上，按需增长、用完回收。所以开了一百万虚拟线程，`-Xss` 不再是瓶颈，堆和 `jdk.virtualThreadScheduler.parallelism`（注意，这是**系统属性**不是 VM 参数，用 `-D` 传）才是。

一个实际影响：以前为了省栈把 `-Xss` 压到 256k 的做法，在虚拟线程场景下已经不解决问题了。

**JFR 从 JDK 11 起免费了。**

JDK 8 时代 Flight Recorder 是商业特性，得买 Oracle 的授权。JDK 11 开源（JEP 328）之后，一行就能开：

```
-XX:StartFlightRecording=duration=60s,filename=/data/app.jfr,settings=profile 
```

开销在 1% 到 2%，可以直接挂生产。GC、锁竞争、分配热点、方法耗时、异常统计全在里面，比 GC 日志的信息密度高一个量级。这篇文章里所有关于 GC 的判断，实际排查时都该先看一眼 JFR 再下结论。

0 8

## JDK 25：两个真正的新参数

JDK 25 是 2025 年 9 月的 LTS，它带来的参数变化不多，但有两个值得知道。

**第一个：紧凑对象头。**

```
-XX:+UseCompactObjectHeaders 
```

对象头从 12 或 16 字节压到 8 字节。原理是把类指针从 32 位压到 22 位，和标记字合并进一个 64 位结构里。

收益是实打实的：SPECjbb2015 上堆用量少 22%、CPU 少 8%；官方口径是堆占用降 10% 到 22%，G1 和 Parallel 的 GC 次数降 15%。对那种“对象小而多”的应用——微服务、缓存、Spring Boot——效果最明显。

版本脉络要分清楚：

版本

状态

JDK 24

实验特性（JEP 450），要 `-XX:+UnlockExperimentalVMOptions`

JDK 25

**产品特性（JEP 519）**

，不用解锁，但默认关闭

后续版本

计划默认开启（JEP 534）

限制也得说全：不能和 `-XX:-UseCompressedClassPointers` 同时用（后者本身也已废弃）；x64 上的 ZGC 支持还在完善，想同时要低延迟和紧凑头，目前只能用 G1；22 位类指针意味着类数量上限约 400 万，对 99.9% 的应用不构成约束；依赖对象头固定布局的 JNI 代码和工具（JOL 之类）需要先验证。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第二个：AOT 缓存。**

这是 Project Leyden 的成果，目标是干掉启动和预热时间。

JDK 24 上是两步：

```
# 训练跑一次，记录 java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf -jar app.jar # 再跑一次，生成缓存 java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf -XX:AOTCache=app.aot -jar app.jar # 生产使用 java -XX:AOTCache=app.aot -jar app.jar 
```

JDK 25 简化成一步：

```
java -XX:AOTCacheOutput=app.aot -jar app.jar java -XX:AOTCache=app.aot -jar app.jar 
```

第一条命令在内部拆成两次调用，自动建临时配置、自动清理。还有环境变量 `JDK_AOT_VM_OPTIONS`，只作用于“建缓存”那一次子调用，不影响训练跑。

注意一个资源细节：一步法建缓存时，那次子调用要用和训练跑同样大小的堆，所以内存需求是 `-Xmx` 的两倍。小规格机器上老老实实用两步法。

这类启动优化对短生命周期进程（Serverless、批处理、CLI）价值最大，对常驻服务意义有限——服务跑起来之后，JIT 早就把热点编译完了。

**还有一点得提醒：这些参数在老版本上不存在。** 把 `-XX:AOTCache=app.aot` 写进公共启动脚本，然后在 JDK 17 上跑，结果是 JVM 拒绝启动。

`-XX:+IgnoreUnrecognizedVMOptions` 确实能让它不报错，但它把拼写错误也一起兜住了——`-XX:MaxGCPauseMilli=100` 这种少个 s 的手滑，从此再也不会有人发现。**不要用它做跨版本兼容，用配置分版本。**

0 9

## 四份可以直接抄的启动行

到这里，把前面所有内容压成四行。都是给一个 4 核 4G 的 Spring Boot 服务准备的，按版本取用。

**JDK 8**

```
-Xms3g -Xmx3g -Xmn1g -Xss512k \ -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \ -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \ -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump \ -XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:/var/log/gc.log \ -Dfile.encoding=UTF-8 
```

**JDK 17**

```
-Xms3g -Xmx3g -Xss512k \ -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \ -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \ -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump \ -Xlog:gc*,gc+age=trace:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \ -Dfile.encoding=UTF-8 
```

**JDK 21**

```
-Xms3g -Xmx3g -Xss512k \ -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \ -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \ -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump \ -Xlog:gc*,gc+age=trace:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \ -XX:StartFlightRecording=settings=default,dumponexit=true,filename=/data/app.jfr \ -Dfile.encoding=UTF-8 
```

低延迟场景换 GC 那两行：

```
-XX:+UseZGC -XX:+ZGenerational -XX:SoftMaxHeapSize=2g 
```

**JDK 25**

```
-Xms3g -Xmx3g -Xss512k \ -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \ -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseCompactObjectHeaders \ -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump \ -Xlog:gc*,gc+age=trace:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \ -Dfile.encoding=UTF-8 
```

容器里不要写死 `-Xms/-Xmx`，换成 `-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=75`。

## 最后

四个版本摊在一张表上，是这个样子：

关注点

JDK 8

JDK 17

JDK 21

JDK 25

默认 GC

Parallel

G1

G1

G1

CMS

可用

已移除

已移除

已移除

ZGC

无

产品级，单代

分代可选，需显式开

仅分代

元空间

有

有

有

有

GC 日志

`PrintGCDetails`

`-Xlog`

`-Xlog`

`-Xlog`

容器感知

8u191 起

默认

默认

默认

偏向锁

默认开

默认关，参数废弃

废弃

不认

默认编码

平台编码

UTF-8

UTF-8

UTF-8

反射开洞

不需要

`--add-opens`

`--add-opens`

`--add-opens`

紧凑对象头

无

无

无

可开（JEP 519）

AOT 缓存

无

无

无

一条命令

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

看完这张表你会发现，从 JDK 8 到 17 是一次真正的断层：GC 换了、日志换了、编码换了、反射封了、元空间取代了永久代。17 到 21、21 到 25，改动更多是加法——分代 ZGC、紧凑对象头、AOT，都是“新开了什么”，而不是“拿走了什么”。

所以升级的难度，几乎全压在第一步。**8 到 17 这一跳要改参数，17 之后基本是加参数。**

最后说个态度问题。

我见过太多启动脚本，是从上一家公司、上一个项目、上一篇文章里抄来的，抄的人自己也不知道为什么是这些数。这类脚本的危险不在于配错，而在于**它看起来是对的**——进程起来了，服务能响应，日志也正常。直到某天压测或者线上抖动，才发现那个“关键的调优参数”在三个版本之前就失效了。

参数不是需要背下来的知识。它是一组随版本变动的默认值，而你唯一能确定当前值的办法，是在那台机器上跑一遍 `PrintFlagsFinal`。

升级前先做这件事，比读任何一篇参数大全都值。

_本文参数状态核自 OpenJDK JEP 文档（JEP 439 / 474 / 490 / 514 / 519 / 534）、Oracle JDK 25 Release Notes 与各版本 `java -XX:+PrintFlagsFinal` 实测输出，截至 2026 年 10 月。默认值随发行版和平台版本会有差异，落地前请在本机核对。_