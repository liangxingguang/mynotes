---
id: 2026-11-02-weixin-jvm-gc-log-heap
title: 一行 log.info 打掉 8G 堆：每秒 500MB 大对象，是怎么把老年代喂满的
source: 微信公众号文章
source_url: https://mp.weixin.qq.com/s/m8-jUMxd-_GUG6BXbl_J9A
source_type: article
platform: 微信公众号
created: 2026-11-02
category: 技术
tags:
  - 工程实践
  - Java
asset_ref: Assets/2026-11/weixin-jvm-gc-log-heap.md
wiki_status: pending
---

# 一行 log.info 打掉 8G 堆：每秒 500MB 大对象，是怎么把老年代喂满的

> 摘要：一篇 JVM GC 故障复盘：报表接口在 `log.info` 里打印 5000 行查询结果的 JSON（单次 35MB、QPS 15、约 500MB/s 分配速率），G1 把 >2MB 的对象按 humongous 直接放进老年代，又被 AsyncAppender 队列的强引用钉住，Full GC 每 2 分钟一次却"空转"收不掉。作者用 jstat → GC.class_histogram → heap_dump+MAT 三步 10 分钟定位到那行代码，Arthas 改日志级别先止血，根治改为打印"条数+耗时+裁剪样本"，并给出监控告警、JFR 分配采样与三条 review 硬规则。

## 核心要点

- **判据**：Full GC 频繁分两种——垃圾太多（加内存能缓解）vs 活对象太多（只能改代码）；只看 Full GC 后老年代水位降不降
- **排查三步**：`jstat -gcutil` 初筛（不停不触发 GC，看 O 回收后不降 → 强引用钉住）→ `GC.class_histogram` 摘流后看大对象（`[C` char[] 476 万个占 3.8GB）→ heap_dump + MAT Path to GC Roots 找到 LoggingEvent 队列钉住 62 个 35MB 字符串共 2.1GB
- **根因两步放大**：G1 humongous 分配（>region 一半 2MB 直接进老年代，不经年轻代筛选）；异步日志队列把生命周期拉长（落盘速度跟不上生产速度，队列没满所以无感知）
- **止血**：Arthas 动态调日志级别 `logger --level WARN`，1 分钟把 Full GC 从 2 分钟一次压到 40 分钟一次，再从容发版
- **根治**：日志改打印"条数+耗时+裁剪样本（首行截断 200 字符）"；`toJSONString` 在参数位一定提前执行，级别/异步都救不了，只有 Supplier 或 `isInfoEnabled` 守卫能延迟求值
- **反直觉**：调大 queueSize 只是允许把 1024×35MB 钉在内存里——队列只缓冲"小对象+尖峰"，大对象必须源头掐掉
- **效果**：老年代 98%~99%→12%~18%，Full GC 2 分钟一次→0 次/天，接口 P99 3.1s→55ms；且大日志不止一处，另一接口异常分支打印完整请求体需一并改掉
- **避坑**：参数位方法调用必执行；别用日志打印集合/响应体/SQL 结果集（含 MyBatis DEBUG 结果集）；异步队列不是内存保护；`jmap -histo:live` 别在高峰机器上跑；看到 Full GC 先看回收后水位（>85% 查活对象而非加堆）

## 正文

采集说明：全文约 7100 字，完整正文见附件 asset_ref，此处为结构提要。

1. **故障时间线**：P99 GC 停顿 2.8s → 扩容两台无效（CPU 仅 20%，瓶颈是 STW 不是算力，GC 类故障水平扩容常是负收益）→ 老年代 99%、Full GC 每 2 分钟一次、STW 2.5s、5xx 12%。
2. **排除内存泄漏**：Caffeine（命中率 96%、条目未超 max）、连接池/MyBatis 二级缓存（已关）、ThreadLocal 均正常；决定性细节是 Full GC 后老年代只从 98% 掉到 95%。
3. **三条命令排查**：jstat -gcutil（YGC 每 3 秒一次=分配速率极高；O 回收后不降）；GC.class_histogram（char[]+String 吃掉约 70% 老年代）；heap_dump + MAT（引用链 char[] ← String ← LoggingEvent ← ArrayBlockingQueue ← AsyncAppender 线程）。
4. **根因分析**：报表接口 `log.info("report result: {}", JSON.toJSONString(rows))`，5000+ 行 → 35MB JSON，QPS 15 ≈ 500MB/s；G1 humongous 直接入老年代 + AsyncAppender 队列强引用延长生命周期；humongous region 要等并发标记周期才释放，分配速率跑赢回收速率时 JVM 退回 Full GC 兜底（GC 日志见 `Humongous allocation`/`To-space exhausted` 即查大对象分配）。
5. **修复**：Arthas 改级别止血；日志改摘要三件套；SLF4J 2.0 fluent API 或 isInfoEnabled 延迟求值；队列参数调整但不指望兜底；修复后连盯 3 天，发现并修掉第二个异常分支大日志接口。
6. **预防**：告警加"回收后水位"维度（>85% 查活对象）；JFR profile 常开做分配采样；三条 review 硬规则（日志参数禁序列化调用、集合/响应体/结果集走 summary 工具、异常分支只打异常栈+业务主键不打请求体）。

## 来源

- 原文：<https://mp.weixin.qq.com/s/m8-jUMxd-_GUG6BXbl_J9A>

## 附件

- [[Assets/2026-11/weixin-jvm-gc-log-heap.md]]
