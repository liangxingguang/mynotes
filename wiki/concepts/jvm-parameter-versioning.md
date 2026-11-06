---
id: wiki-concept-jvm-parameter-versioning
type: concept
title: JVM 参数体系与版本对账
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - java
  - jvm
sources:
  - raw/sources/architecture/2026-11-06-jvm-parameters-by-version.md
related:
  - wiki/topics/jvm-gc.md
  - wiki/concepts/zgc.md
  - wiki/concepts/g1-gc.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/sources/gc-log-tuning-practice.md
---
# JVM 参数体系与版本对账

## Definition（定义）

JVM 启动参数分三种写法、命运不同：`-Dkey=value`（系统属性，不是 JVM 参数，代码里 `System.getProperty` 读）；`-Xms/-Xmx/-Xss/-Xlog`（非标准参数，平台相关但基本稳定）；`-XX:±Foo/-XX:Foo=值`（扩展参数，**唯一会随版本生死的部分**）。`-XX` 内部再分四档：product（正式支持）、experimental（需 `-XX:+UnlockExperimentalVMOptions` 解锁）、diagnostic（需解锁、别放生产）、manageable（运行时可改，`jinfo -flag` 可见）。

方法论核心（信源原话）：「**参数是版本的函数，不是知识**」。任何参数先在目标机上对账，而不是背默认值：

- `java -XX:+PrintFlagsFinal [-XX:+UnlockDiagnosticVMOptions -XX:+UnlockExperimentalVMOptions] -version 2>&1 | grep 参数名` — 打印这台机、这个版本、这套参数下真正生效的值与来源（`{default}` 还是 `{command line}`）
- `java -XX:+PrintCommandLineFlags -version` — 只打印被显式改过的几行

## Why It Matters（为什么重要）

抄来的启动脚本危险不在配错，而在「它看起来是对的」：进程起来了、服务能响应、日志也正常，直到压测或线上抖动才发现某关键调优参数在三个版本前已失效。JDK 8→17 是一次真正断层（GC 换默认、日志换写法、编码换默认、反射封死、元空间取代永久代）；17→21、21→25 更多是加法。**升级难度几乎全压在第一步。**

## Core Characteristics（核心特征）

1. **堆参数（8–25 基本通用）**：`-Xms`/`-Xmx` 生产建议相等，避免运行期扩缩容停顿；`-XX:MetaspaceSize` 不是初始大小而是**首次回收阈值**（JDK 8 默认约 21MB，类加载高峰触发莫名 Full GC，生产显式给 256m 起）；`-XX:MaxDirectMemorySize` 默认等于 `-Xmx`；G1 下 `-Xmn` 基本失去意义，新生代由 `-XX:G1NewSizePercent`(默认5)/`-XX:G1MaxNewSizePercent`(默认60)/`-XX:MaxGCPauseMillis`(默认200ms) 决定——**调停顿目标，不调大小**；`-XX:+AlwaysPreTouch` 容器中慎用（进程从一开始就贴着 limit 跑）。
2. **容器感知是 8 与 17 的世界观差异**：JDK 8u191/JDK 10 前 JVM 看不到 cgroups，Docker 限 4G 时按宿主机内存推算 `-Xmx`，容器被内核杀（退出码 137，不是 JVM crash）；`-XX:+UseContainerSupport` 默认开启后读 cgroups 配额才算解决。GC 线程数旧公式 `8 + (n-8)*5/8` 按宿主机核数算，是容器 GC 线程过多的根源。两种写法：写死绝对值（最稳）；或 `-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=75`（NIO/Netty 服务直接内存可吃好几 G，建议压到 60%）。`-XX:MinRAMPercentage` **不是「最小堆占比」**，只在可用内存 <约 200MB 时生效，4G 容器里设它什么都不会发生。核数不对用 `-XX:ActiveProcessorCount`（8u191+）覆盖。
3. **默认值本身也会变**：`MaxRAMPercentage` 多数版本默认 25%，4G 容器即 1G 堆，明显偏小——**别信任何文章里的默认值，包括这篇，用 PrintFlagsFinal 自己看**（信源原话）。
4. **升级四坑**：① 元空间无上限（`-XX:MaxMetaspaceSize` 默认不限，容器里 OOMKilled 连 heap dump 都拿不到；显式给 512m–1g，`jcmd <pid> VM.metaspace` 看实际用量）；② 反射被封（JDK 16 `--illegal-access` 默认 deny，JDK 17 JEP 403 彻底封内部包，抛 `InaccessibleObjectException`；解法是显式 `--add-opens java.base/java.lang=ALL-UNNAMED`，不是 `--illegal-access=permit`——17 上已无用）；③ 偏向锁（JDK 15 起默认关闭，`-XX:+UseBiasedLocking` 废弃，从脚本删掉即可，别找替代品）；④ 文件编码（JDK 18 JEP 400 默认 UTF-8，中文 Windows 平台编码是 GBK，同一程序行为可完全不同；要保留旧行为加 `-Dfile.encoding=COMPAT`）。升级前拿新 JDK 跑一遍 `java <全部参数> -version`，Unrecognized 一个个删、deprecated 一个个换。
5. **JDK 21+ 变化**：分代 ZGC 可调参数（`-XX:SoftMaxHeapSize`、`-XX:ZUncommit`、`-XX:ZUncommitDelay`）；**虚拟线程改变 `-Xss` 的意义**——虚拟线程栈在堆上按需增长，以前压 `-Xss` 的做法失效，瓶颈转到堆和 `jdk.virtualThreadScheduler.parallelism`（注意这是 `-D` 系统属性，不是 VM 参数）；**JFR 自 JDK 11 起免费**（JEP 328，JDK 8 时代是商业特性），一行 `-XX:StartFlightRecording=duration=60s,filename=/data/app.jfr,settings=profile` 可挂生产，开销 1%–2%，信息密度高于 GC 日志一个量级。
6. **JDK 25 两个新参数**：① 紧凑对象头 `-XX:+UseCompactObjectHeaders`（JEP 519；JDK 24 实验 JEP 450 需解锁 → 25 产品特性但默认关闭 → 后续 JEP 534 计划默认开启）：对象头 12/16 字节压到 8，类指针压到 22 位（类数量上限约 400 万）与标记字合并进 64 位结构；SPECjbb2015 堆用量少 22%、CPU 少 8%，官方口径堆降 10%–22%、G1/Parallel GC 次数降 15%；不能与 `-XX:-UseCompressedClassPointers` 同用；x64 上 ZGC 支持尚在完善，低延迟+紧凑头目前只能用 G1；依赖对象头固定布局的 JNI 与 JOL 需先验证。② AOT 缓存（Project Leyden，消除启动/预热）：JDK 24 两步法（`-XX:AOTMode=record` → `create` → `-XX:AOTCache=app.aot`），JDK 25 简化为一步 `-XX:AOTCacheOutput=app.aot`（内部拆两次调用）；环境变量 `JDK_AOT_VM_OPTIONS` 只作用于建缓存子调用；一步法建缓存内存需求约 2×`-Xmx`；只对短生命周期进程（Serverless/批处理/CLI）价值最大。**跨版本纪律**：新参数在老版本上会让 JVM 拒绝启动；`-XX:+IgnoreUnrecognizedVMOptions` 能兜住报错但也会兜住拼写错误，**不要用它做跨版本兼容，用配置分版本**。

## Structure（结构）

版本对账矩阵（信源核心表，置信度：信源自述核自 JEP 文档与实测输出，截至 2026-10）：

| 关注点 | JDK 8 | JDK 17 | JDK 21 | JDK 25 |
|---|---|---|---|---|
| 默认 GC | Parallel | G1 | G1 | G1 |
| CMS | 可用 | 已移除 | 已移除 | 已移除 |
| ZGC | 无 | 产品级，单代 | 分代可选，需显式 `-XX:+ZGenerational` | 仅分代 |
| 元空间 | 有 | 有 | 有 | 有 |
| GC 日志 | `PrintGCDetails` 系列 | `-Xlog` | `-Xlog` | `-Xlog` |
| 容器感知 | 8u191 起 | 默认 | 默认 | 默认 |
| 偏向锁 | 默认开 | 默认关，参数废弃 | 废弃 | 不认 |
| 默认编码 | 平台编码(GBK) | UTF-8 | UTF-8 | UTF-8 |
| 反射开洞 | 不需要 | `--add-opens` | `--add-opens` | `--add-opens` |
| 紧凑对象头 | 无 | 无 | 无 | 可开（JEP 519） |
| AOT 缓存 | 无 | 无 | 无 | 一条命令 |

## Relationships（关系）

### Related Concepts（相关概念）

- [[zgc]]：本文为 ZGC 补充了「分代线」版本轨迹与 `SoftMaxHeapSize` 等调优参数，并印证选型代价（多烧 10%–15% CPU）。
- [[g1-gc]]：G1 为 JDK 9+ 默认收集器，是绝大多数 Web 服务的选型终点。
- [[jvm-gc-interview-guide]]（信源页）：GC 版本演进与选型的另一条证据线。
- [[gc-log-tuning-practice]]：本文为其补充 JDK 9 `-Xlog` 代际切换与「迁移一半」的隐蔽坑。

### Dependencies（依赖项）

- [[evidence-first-jvm-tuning]]：`PrintFlagsFinal` 对账与容器百分比做法与其方法论（基线先行、单变量实验）互为印证。

### Distinctions（区分）

- 与「背参数清单」的区分：本文立场是参数随版本变动的默认值，唯一确定办法是在目标机跑 `PrintFlagsFinal`，而非记忆清单。

## Evolution（演进）

（新建页）

## Open Questions（开放问题）

- 信源称各版本参数状态「核自 JEP 文档与 Oracle JDK 25 Release Notes」，但未逐条给出 JEP 链接；个别默认值（如 `MaxRAMPercentage=25%`）不同发行版可能有差异，落地前须在本机核对。
- JDK 25 的 Shenandoah 分代为产品特性但默认仍单代（`-XX:ShenandoahGCMode=generational` 显式开启），本文未展开，待有第二信源再立页。
- 紧凑对象头对 JNI/JOL 的影响范围缺乏第二信源验证。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-06-jvm-parameters-by-version.md`

## Related Knowledge（相关知识）

- [[jvm-gc|JVM 垃圾回收（主题）]]
- [[oom-troubleshooting|OOM 排查方法论]]（元空间无上限致容器 OOMKilled）
- [[jvm-troubleshooting-six-tools|JVM 排查六工具]]（JFR 线索）
