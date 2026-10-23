---
id: wiki-source-jvm-troubleshooting-six-tools
type: source
title: JVM 排查别乱试：6 个工具各管什么
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - java
  - jvm
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-21-jvm-troubleshooting-six-tools.md
related:
  - wiki/entities/arthas.md
  - wiki/sources/jvm-gc-troubleshooting-arthas.md
---
# JVM 排查别乱试：6 个工具各管什么

## Overview（概览）

公众号短文：线上接口变慢别急着 dump 也别重启——jps 找进程、jcmd 问 JVM、jstat 看 GC、jstack 看线程、jinfo 查配置、VisualVM 看趋势，六个 JDK 自带/官方工具分工不重复，按问题选工具、按成本定顺序。

## Key Facts（关键事实）

- 分工小抄：jps 找谁、jcmd 先问 JVM、jstat 看 GC、jstack 看线程、jinfo 查配置、VisualVM 看全局趋势。
- jps：`-lv` 拿 PID+主类+启动参数；容器里宿主机 PID≠容器内 PID，不同用户可能看不到进程——看不到先查命名空间与权限，别判"服务没启动"。
- jcmd：统一诊断入口，先 `jcmd <pid> help` 看当前 JDK 支持什么（版本间命令不同），比死记参数可靠；常用 VM.command_line/VM.flags/Thread.print/GC.heap_info；**有轻重之分**——Thread.print 轻，堆转储/类直方图可能带来明显暂停与磁盘压力。
- jstat：`-gcutil <pid> 1000 10` 连续采样；FGC 在问题时间段持续增长+FGCT 明显增加+接口延迟尖峰三者对上，GC 才是主要嫌疑——"感觉像 GC"不算证据；单次 O 80% 不能下结论，看趋势。
- jstack：`-l` 带锁信息；线索：大量线程卡同一业务方法、多线程 BLOCKED 等同一把锁、停在连接池/HTTP 客户端/DB 驱动、死锁环；一次栈只是瞬间，间隔几秒采三次对比。
- jinfo：摊开线上真实启动配置（部署脚本/容器环境变量/启动命令经常不是同一份）；适合确认现场，不适合随手改线上参数。
- VisualVM：需单独下载（新版 JDK bin 里没有 jvisualvm）；价值是把 CPU/GC/堆/线程趋势放同一条时间线看关联，但结论仍要回到日志、线程栈与业务请求。
- 排查顺序：jps 找 PID → jcmd 确认启动参数 → 疑 GC 用 jstat 连续看 → 疑线程用 jstack 取现场 → 看趋势开 VisualVM → 只有明确需要才做堆转储等重操作。
- 收尾论点：没有哪个工具能单独给"根因报告"，它们提供不同角度的现场证据；**排障不是工具越多越专业，而是每次只拿能回答当前问题的那一个**。

## Important Claims（重要论断）

### Claim 1：别把"能执行"误当成"现在就该执行"

重操作（堆转储、类直方图）有暂停与磁盘成本；先轻后重、按问题选工具，结论才靠谱（信源立场）。

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- VisualVM（官方可视化工具，未立页）

## Implications（影响／启示）

- 与 [[jvm-gc-troubleshooting-arthas]] 互补：本文是 JDK 自带工具的"轻"路线，Arthas 版是交互式"重"路线；选择标准是现场允许的成本（解读）。

## Limitations（局限）

- 入门导论级，各工具只给核心用法；容器/编排环境的深入适配未展开。

## Related Knowledge（相关知识）

- [[jvm-gc-troubleshooting-arthas|JVM GC 排查 Arthas 版（信源页）]]
- [[arthas|Arthas]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-21-jvm-troubleshooting-six-tools.md`
