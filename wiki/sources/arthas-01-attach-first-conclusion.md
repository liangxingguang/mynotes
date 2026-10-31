---
id: wiki-source-arthas-01-attach-first-conclusion
type: source
title: Arthas 上手：从 attach 到第一个结论，6 个命令够用
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/thread-stack-reading.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# Arthas 上手：从 attach 到第一个结论，6 个命令够用

## Overview（概览）

新手向 Arthas 入门指南（公众号专辑《arthas使用》第 1 篇）：按「怎么挂、敲什么、怎么退」的顺序，讲 attach 的两种启动方式与三类失败原因、6 个命令对应 6 类问题的速查、三个最易踩的参数细节、退出清理与 4 条生产纪律。

## Key Facts（关键事实）

- **attach 两种方式**：`java -jar arthas-boot.jar` 列进程后输入序号；进程多或脚本化时 `--select <pid>` 指定。成功后提示符变为 `[arthas@进程号]$`。
- **挂不上的三个原因**：① 执行用户与目标进程不一致（须用启动服务的用户）；② 默认端口被占（telnet 3658、web 8563，可指定端口）；③ JDK 太老（attach 依赖 JVM attach API）。
- **attach 本身造成极短停顿**，勿在流量峰值反复挂退。
- **6 命令速查**：`dashboard` 排除方向（看 GC/线程数/堆内存）；`thread -n 3`/`-b`/线程号对付 CPU 高/死锁/看栈；`trace 类 方法` 看慢在哪一层（必加 `-n`）；`watch 类 方法 '{params,returnObj,throwExp}' -x 2` 看入参返回值；`jad`/`sc -d`/`sm` 确认线上代码版本；`profiler start/stop`（底层 async-profiler）出火焰图。
- **三个参数细节**：trace/watch 忘加 `-n` 会一直挂着；`-x` 展开深度先小后大；条件表达式写错不报错、只是不输出——「明明调用了却没输出」先怀疑表达式。
- **退出清理**：`stop` 只退出诊断工具、不停业务进程，但退出前必须停掉还挂着的 `trace`/`watch`/`monitor`。
- **4 条生产纪律**：测试环境先跑一遍命令；热点方法别长时间挂 trace；`redefine`/`retransform` 慎用；操作留记录。

## Important Claims（重要论断）

### 学习成本在判断不在命令

「Arthas 的学习成本其实不在命令，在判断：这一屏输出说明什么、下一步该敲哪条。命令敲熟是几小时的事，判断能力只能靠一次次排查积累。」与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]、[[thread-stack-reading|线程栈读法]] 的判断观一致。

## Concepts Introduced（引入的概念）

- [[thread-stack-reading|线程栈读法]]（thread 三条用法与「三线程停同一方法即烧 CPU」判断法的印证来源之一）。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（attach 机制、默认端口、命令速查）；async-profiler（未立页）

## Implications（影响／启示）

- 本篇与第六、七信源（同专辑第 2、3 篇）构成入门→AI 协作→深读的递进序列，可作为 Arthas 上手路径的推荐顺序（解读）。
- 「dashboard 的作用是排除方向不是定位问题」是低成本高回报的排查原则：先看全局面板决定排查重点，再逐命令深入（解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（正文信息无损）；表格字段被拆行，已按语义还原。
- 只覆盖 6 个常用命令，未涉及 monitor/stack/tt/heapdump 等其余命令。

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页，第七信源）
- [[thread-stack-reading|线程栈读法]]（概念页）
- [[ai-assisted-troubleshooting-workflow|AI 辅助排障工作流]]（同专辑下一篇）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md`
