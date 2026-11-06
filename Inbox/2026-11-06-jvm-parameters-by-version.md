---
id: 2026-11-06-jvm-parameters-by-version
title: JVM 参数：一份按版本对账的手册
source: 赢在菲墨间（微信公众号）
source_url: https://mp.weixin.qq.com/s/lJeAoFSP1-qryUweBnjkeQ
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [java, 工程实践]
asset_ref: "Assets/2026-11/weixin-lJeAoFSP1-qryUweBnjkeQ-jvm-parameters.md"
wiki_status: pending
---

# JVM 参数：一份按版本对账的手册

> 摘要：四个 LTS（JDK 8/17/21/25），参数差异分三类——改了默认值的、换了写法的、已经没了但你还在用的。全文按版本对账：参数体系（-D 系统属性 / -X 非标准 / -XX 扩展，真正会生死的只有 -XX）、堆、容器感知、GC 选择、GC 日志、升级四坑（元空间无上限、反射封死、偏向锁废弃、编码默认改 UTF-8）、JDK 21+ 三个变化、JDK 25 两个新参数（紧凑对象头、AOT 缓存），最后给四行可直接抄的启动参数。核心方法论：参数是版本的函数，不是知识；任何参数先在目标机跑 `-XX:+PrintFlagsFinal -version` 对账。

## 核心要点

1. **参数体系分三种**：`-Dkey=value`（系统属性）、`-Xms/-Xmx/-Xss/-Xlog`（非标准参数，基本稳定）、`-XX:±Foo/-XX:Foo=值`（扩展参数，唯一会随版本生死的部分，分 product / experimental（需解锁）/ diagnostic / manageable 四档）。最该记住的两条命令：`java -XX:+PrintFlagsFinal -version 2>&1 | grep 参数名`（打印这台机、这个版本、这套参数下真正生效的值与来源）、`java -XX:+PrintCommandLineFlags -version`（只打印被显式改过的）。
2. **堆配置**：`-Xms` 与 `-Xmx` 生产环境建议相等，避免运行期扩缩容停顿；`-XX:MetaspaceSize` 不是初始大小而是首次回收阈值（JDK 8 默认约 21MB，类加载高峰易触发莫名 Full GC）；G1 下 `-Xmn` 基本失去意义，应由 `-XX:G1NewSizePercent`/`-XX:G1MaxNewSizePercent`/`-XX:MaxGCPauseMillis` 决定，调停顿目标而不是调大小。
3. **容器感知是 8 与 17 的世界观差异**：JDK 8u191 前 JVM 看不到 cgroups，Docker 限 4G 时按宿主内存推算导致退出码 137；`-XX:+UseContainerSupport` 默认开启后才解决。两种写法：写死绝对值（最稳），或 `-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=75`（NIO/Netty 服务 75% 偏高，建议 60%）；`-XX:MinRAMPercentage` 只在内存小于约 200MB 时生效，4G 容器里设它什么都不会发生；核数不对用 `-XX:ActiveProcessorCount` 覆盖。
4. **GC 选择的版本线**：JDK 8 默认 Parallel（Server 模式），JDK 9 起 G1 默认；CMS 在 JDK 14 移除、17 上参数启动即报错；ZGC 路径：11 实验 → 15 产品级 → 21 分代需显式开 → 23 分代默认 → 24 移除单代；Shenandoah 仅在 OpenJDK 分支（Oracle 没有）。坑：`-XX:+UseZGC` 一行在 21 和 25 上跑的不是同一个 GC；要在老经验里删掉 `-XX:-UseAdaptiveSizePolicy`、手调 Survivor 比例等负收益做法。
5. **GC 日志代际切换**：JDK 9 起老开关换一条 `-Xlog:标签:目标:装饰器`；JDK 17 上 `PrintGCDetails` 仅警告而 `PrintGCDateStamps` 直接 Unrecognized 拒绝启动——"迁了一半"导致日志目录空着却以为在采，是线上排查时才发现的隐蔽坑；`-Xlog` 输出默认只有启动后秒数，`time` 装饰器基本必加；`jstat -gcutil` 在 17 上多了 CGC 列，按列号取数的老脚本会取错。
6. **升级四个必踩坑**：元空间无上限（容器内 OOMKilled 连 heap dump 都拿不到，显式给 512m–1g）；反射被封（JDK 16 起 deny、17 JEP 403 彻底封内部包，解法是显式 `--add-opens`，不是 `--illegal-access`）；偏向锁（JDK 15 起默认关闭、`-XX:+UseBiasedLocking` 废弃，从脚本里删掉即可）；文件编码（JDK 18 JEP 400 默认 UTF-8，中文 Windows 平台编码是 GBK，乱码第一反应别怪新版本 bug）。升级前新 JDK 跑一遍 `java <全部参数> -version`，Unrecognized 一个个删、deprecated 一个个换。
7. **JDK 21+：分代 ZGC 可调参数**（`-XX:SoftMaxHeapSize`、`-XX:ZUncommit`、`-XX:ZUncommitDelay`）；**虚拟线程改变 `-Xss` 的意义**（栈在堆上按需增长，压 `-Xss` 不解决问题，`jdk.virtualThreadScheduler.parallelism` 用 `-D` 传）；**JFR 从 JDK 11 开源免费**，一行 `-XX:StartFlightRecording=duration=60s,filename=/data/app.jfr,settings=profile` 可挂生产，开销 1%–2%，信息密度高于 GC 日志。
8. **JDK 25 两个新参数**：紧凑对象头 `-XX:+UseCompactObjectHeaders`（JEP 519，对象头由 12/16 字节压到 8，堆占用降 10%–22%、G1/Parallel GC 次数降 15%，22 位类指针上限约 400 万类，JNI/JOL 需验证）；AOT 缓存（Project Leyden，JDK 25 简化为一步 `-XX:AOTCacheOutput=app.aot`，一步法建缓存内存需求约 2×`-Xmx`，只对短生命周期进程价值最大）。

## 正文

**（资料性长文，已按章节提炼）**

**01 参数分三种，命运不一样**：`-Xms/-Xmx/-Xss/-Xlog` 非标准参数、`-Dkey=value` 系统属性、`-XX:±Foo/-XX:Foo=值` 扩展参数（真正会随版本生死，分 product/experimental/diagnostic/manageable 四档）。产品级与实验级的区别在解锁开关。全文最该记住的是这两条命令：`java -XX:+PrintFlagsFinal -XX:+UnlockDiagnosticVMOptions -XX:+UnlockExperimentalVMOptions -version 2>&1 | grep 你要查的` 打印真实生效值与来源（`{default}` 还是 `{command line}`）；`java -XX:+PrintCommandLineFlags -version` 只打印显式改过的。"参数是版本的函数，不是知识。"

**02 堆**：`-Xms` 与 `-Xmx` 生产设相等；`-XX:MetaspaceSize` 是首次回收阈值不是初始大小（JDK 8 默认约 21MB，类加载高峰触发莫名 Full GC，生产显式给 256m 起）；G1 下 `-Xmn` 失去意义，新生代由 `-XX:G1NewSizePercent`/`-XX:G1MaxNewSizePercent`/`-XX:MaxGCPauseMillis` 共同决定，上调姿势是调停顿目标不是调大小。最小可用堆：`-Xms4g -Xmx4g -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump`。`-XX:+AlwaysPreTouch` 容器中慎用。

**03 容器**：JDK 8u191 前 JVM 不知道容器，Docker 限 4G 按宿主机 64G 推算被内核杀（退出码 137）；`-XX:+UseContainerSupport` 默认开启后读 cgroups。两种写法：写死绝对值（最稳），或 `-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=75.0`（NIO/Netty 服务建议 60%）；`-XX:MinRAMPercentage` 只在可用内存小于约 200MB 时生效，4G 容器里设它无效。核数不对用 `-XX:ActiveProcessorCount` 覆盖。验证：`java -XX:+PrintFlagsFinal -version 2>&1 | grep -E "MaxHeapSize|ActiveProcessorCount"`。

**04 GC 选择**：JDK 8 Server 默认 Parallel（可选 Serial/CMS/G1）；JDK 9 起 G1 默认；CMS 14 移除、17 参数启动即报错；ZGC 11 实验（需解锁）→15 产品级→21 分代需显式 `-XX:+ZGenerational`→23 分代默认→24 移除单代→25 `-XX:-ZGenerational` 只剩警告但行为仍是分代。Shenandoah 24 实验性分代、25 转产品特性但默认仍单代（Oracle JDK 没有 Shenandoah，只有 OpenJDK 系）。选型：堆小于 4G 吞吐优先 Parallel；大多数 Web 服务 G1 调 `MaxGCPauseMillis`；堆几十 G、P99 硬指标分代 ZGC（多烧 10%–15% CPU）；只有分配速率基准测试用 Epsilon。G1 时代关闭 `UseAdaptiveSizePolicy`、手调 Survivor 比例等老经验是负收益。

**05 GC 日志**：JDK 8 老开关一大把，JDK 9 起统一成一条 `-Xlog:gc*,gc+age=trace,gc+heap=debug,gc+ref=debug:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m`。最坑的是 JDK 17 上 `PrintGCDetails` 只警告而 `PrintGCDateStamps` 直接 Unrecognized 拒绝启动——"迁移迁了一半"结果启动成功、日志目录空着、线上出事才发现一行都没有。`-Xlog` 语法三段式（标签/目标/装饰器），默认输出只有启动后秒数所以 `time` 基本必加。`jstat -gcutil` 在 17 上多 `CGC`/`CGCT` 两列，按列号取数的老监控脚本从这版起取错。

**06 升级四坑**：① 元空间无上限（`-XX:MaxMetaspaceSize` 默认不限制，容器里直接 OOMKilled 连 heap dump 都拿不到；显式给 512m–1g，`jcmd <pid> VM.metaspace` 看实际用量）；② 反射被封（JDK 16 起 `--illegal-access` 默认 deny，17 JEP 403 彻底封内部包，`InaccessibleObjectException`；解法是显式 `--add-opens java.base/java.lang=ALL-UNNAMED` 等，`--illegal-access=permit` 在 17 上已不用）；③ 偏向锁（JDK 15 起默认关闭、`-XX:+UseBiasedLocking` 废弃，从脚本删掉，别找替代品）；④ 文件编码（JDK 18 JEP 400 默认 UTF-8，中文 Windows 平台编码是 GBK，同一程序行为可完全不同；要保留旧行为加 `-Dfile.encoding=COMPAT`，彻底清理则显式 UTF-8 并改带 charset 的构造）。JDK 24 移除的还有 `-Xfuture`、`-noclassgc`、`-Xnoagent`、`-Xdebug` 旧语义。升级前新 JDK 跑一遍 `java <全部参数> -version`。

**07 JDK 21+**：分代 ZGC 可调参数（`-XX:SoftMaxHeapSize`、`-XX:ZUncommit`、`-XX:ZUncommitDelay`）；虚拟线程使 `-Xss` 意义改变（虚拟线程栈在堆上按需增长，以前压 `-Xss` 的做法失效，瓶颈转到堆和 `jdk.virtualThreadScheduler.parallelism`——注意这是 `-D` 系统属性）；JFR 自 JDK 11 起免费，一行 `-XX:StartFlightRecording=duration=60s,filename=/data/app.jfr,settings=profile` 挂生产，开销 1%–2%，信息密度比 GC 日志高一个量级。

**08 JDK 25 两个新参数**：① 紧凑对象头 `-XX:+UseCompactObjectHeaders`（JEP 519，24 实验需解锁、25 产品特性但默认关闭；对象头 12/16→8 字节，SPECjbb2015 堆用量少 22%、CPU 少 8%，官方口径堆降 10%–22%、G1/Parallel GC 次数降 15%；不能与 `-XX:-UseCompressedClassPointers` 同用；22 位类指针约 400 万类上限；x64 上 ZGC 支持尚在完善，低延迟+紧凑头目前只能用 G1；依赖对象头布局的 JNI 和 JOL 需验证）；② AOT 缓存（Project Leyden）：JDK 24 两步 `-XX:AOTMode=record` → `-XX:AOTMode=create` → `-XX:AOTCache=app.aot`，JDK 25 简化为一步 `-XX:AOTCacheOutput=app.aot`（内部拆两次调用自动建临时配置并清理）；环境变量 `JDK_AOT_VM_OPTIONS` 只作用于训练子调用；一步法建缓存内存需求约 2×`-Xmx`。只对短生命周期进程（Serverless/批处理/CLI）价值最大。提醒：这些新参数放到老版本上 JVM 拒绝启动（`-XX:+IgnoreUnrecognizedVMOptions` 会兜住拼写错误，不要用它做跨版本兼容）。

**09 四份可抄启动行**（4 核 4G Spring Boot）：JDK 8 用 `-Xms3g -Xmx3g -Xmn1g -Xss512k -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump -XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:/var/log/gc.log -Dfile.encoding=UTF-8`；JDK 17 同堆配置但 GC 日志改 `-Xlog:gc*,gc+age=trace:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=10m`（去掉 `-Xmn` 和 `UseG1GC` 可留）；JDK 21 加 `-XX:StartFlightRecording=settings=default,dumponexit=true,filename=/data/app.jfr`，低延迟可换 `-XX:+UseZGC -XX:+ZGenerational -XX:SoftMaxHeapSize=2g`；JDK 25 加 `-XX:+UseCompactObjectHeaders`。容器中用 `-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=75` 取代写死的 `-Xms/-Xmx`。

**最后**：8→17 是一次真正断层（GC 换、日志换、编码换、反射封、元空间取代永久代），17→21、21→25 更多是加法（分代 ZGC、紧凑对象头、AOT）——"升级的难度几乎全压在第一步"。态度问题：抄来的启动脚本危险不在于配错，而在于它看起来是对的；参数不是要背的知识，是随版本变动的默认值，唯一确定的办法是在那台机器上跑 `PrintFlagsFinal`。

## 来源

原文链接：[JVM 参数：一份按版本对账的手册](https://mp.weixin.qq.com/s/lJeAoFSP1-qryUweBnjkeQ)（微信公众号 · 赢在菲墨间，采集于 2026-11-06）

## 附件

[[Assets/2026-11/weixin-lJeAoFSP1-qryUweBnjkeQ-jvm-parameters.md]]
