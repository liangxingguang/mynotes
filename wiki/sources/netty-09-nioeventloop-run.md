---
id: wiki-source-netty-09-nioeventloop-run
type: source
title: Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？
status: active
created: 2026-10-28
updated: 2026-10-28
confidence: high
tags:
  - source
  - java
  - netty
  - network
  - tutorial
sources:
  - raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md
related:
  - wiki/sources/netty-06-eventloop.md
  - wiki/sources/netty-08-bootstrap.md
  - wiki/entities/netty.md
  - wiki/concepts/netty-eventloop.md
---
# Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？

## Overview（概览）

公众号「Java解忧杂货铺」Netty 源码分析系列第 9 篇。聚焦 Netty 主循环 `NioEventLoop.run()` 的全量源码注解：SelectStrategy 反直觉的"有任务走 selectNow() 非阻塞、没任务才阻塞 select"策略、ioRatio（默认 50）的 IO/任务时间配比公式与选型建议表、JDK epoll 空轮询 BUG（JDK-2144974）的 512 次阈值自愈机制与 rebuildSelector0() 迁移源码、SelectedSelectionKeySet 数组替换 HashSet 的动机，附流程图与面试题精选。文中源码基于 Netty 4.1.x。

## Key Facts（关键事实）

- run() 主循环每轮四步：selectStrategy 计算策略 → `canceller.run()` 处理取消的 key → processSelectedKeys 处理 IO → 按 ioRatio 限时 runAllTasks → 空轮询检测与优雅关闭检查，循环直到 confirmShutdown。
- SelectStrategy 反直觉设计：`hasTasks()` 为真时调 `selectNow()` 非阻塞扫一遍立即返回去跑任务；无任务时才 `select(timeout)` 阻塞等待（超时按最近定时任务 deadline 计算）——核心思想是"IO 事件可以等，用户任务（close/write 等及时性敏感操作）要尽快执行"。
- ioRatio 配比公式：任务执行时间上限 = `ioTime * (100 - ioRatio) / ioRatio`；ioRatio=50 即任务时间不超过 IO 时间；ioRatio=100 不限制任务时间、吞吐最高但任务可能饿死。作者建议：纯网络代理/网关用 100，业务密集服务 50~70，不确定用默认 50。
- epoll 空轮询自愈：连续 `select()` 返回 0 超过 `SELECTOR_AUTO_REBUILD_THRESHOLD`（512 次）即判定命中 JDK BUG（JDK-2144974，Selector.select 无事件也立即返回致 CPU 100%，JDK 8 部分版本仍存在，高并发+Linux 易触发），`rebuildSelector0()` 新建 Selector、遍历旧 Selector 全部 key 重新注册（保留 interestOps 与 attachment）、替换引用并关闭旧 Selector，对上层完全透明。
- 有实际工作（ranTasks 或 strategy>0）时 selectCnt 重置为 1——只有"空转"才累计计数。
- SelectedSelectionKeySet：Netty 用数组实现替换 JDK 的 HashSet 版 SelectedKeys，减少 GC 压力与遍历开销（本篇只给动机，未展开实现）。
- 异常分层兜底：IOException 走 rebuildSelector0 续跑；CancelledKeyException 吞掉（JDK 已知 BUG）；Error 直接抛出；其余 Throwable 进 handleLoopException。

## Important Claims（重要论断）

### Claim 1：run() 是 Netty 运行时的绝对主体
作者论断：Netty 服务端运行时绝大多数 CPU 时间花在各个 NioEventLoop 线程的 run() 里，搞懂它即搞懂 Netty 运行时。

### Claim 2：ioRatio 选型看业务形态
作者论断：纯 IO 代理/网关可调 100 追吞吐；业务逻辑密集服务应保持 50~70 给任务留时间，否则 IO 被任务饿死。

## Concepts Introduced（引入的概念）

- [[netty-eventloop]]（已有概念页，本篇为其实现层主循环补充第三信源）

## Entities Mentioned（提及的实体）

- [[netty]]

## Implications（影响／启示）

本篇与 [[netty-eventloop]] 既有双信源（netty-03 简化版 run()、netty-06 逐方法剖析）三方互证：512 阈值、ioRatio=50、Selector 重建机制三处表述一致；本篇增量在于 SelectStrategy 的"有任务非阻塞"解释、ioRatio 选型表、epoll BUG 编号（JDK-2144974）与 rebuildSelector0 的 key 迁移细节。空轮询自愈也是 [[netty]] 实体页"填 JDK NIO 的坑"设计起点的直接落地证据。

## Limitations（局限）

- 单一自媒体教程信源；源码为作者简化注解版（如 run() 中 default 分支标注 "other cases"），非逐字源码。
- "JDK 8 一些版本仍存在 epoll 空轮询"与 [[netty]] 实体页"6u17 官方修好"（同为该系列信源说法）存在口径张力：6u17 修了一个版本，后续版本仍有复发报告——两说并存，本库未裁决。
- SelectedSelectionKeySet 只给动机未展开实现；BUSY_WAIT 策略仍仅点名。

## Related Knowledge（相关知识）

- [[netty-06-eventloop]]（同系列第 6 篇：EventLoop 结构与 register/wakeup 机制，本篇主循环的前置）
- [[netty-08-bootstrap]]（同系列第 8 篇：启动流程，register/connect 如何进入本循环）
- [[netty-eventloop]]（概念页）
- [[netty]]（实体页）

## Source（信源）

- `raw/sources/architecture/2026-10-27-netty-09-nioeventloop-run.md`
