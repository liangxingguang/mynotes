---
id: 2026-10-27-netty-09-nioeventloop-run
title: Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484046&idx=1&sn=cd2f21f2e428e1217908bd00c08c730d&chksm=fe6ca3d4c91b2ac2719875e900d19d3d120e21149cd36c5ebede587784e5635e2579043496dd#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-09-nioeventloop-run.md
wiki_status: pending
---

# Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？

> 拆解 Netty 主循环 NioEventLoop.run()：select 策略、ioRatio 时间分配、JDK epoll 空轮询 BUG 的自愈机制，以及整个事件循环的完整流程。

## 核心要点

- run() 主循环三层逻辑：select 策略决定阻塞与否 → processSelectedKeys 处理 IO → runAllTasks 执行任务，循环往复直到优雅关闭。
- SelectStrategy 反直觉设计：有任务时走 selectNow() 非阻塞快速返回去跑任务，没任务时才 select(timeout) 阻塞等待，避免 CPU 空转。
- ioRatio（默认 50）按比例约束任务执行时间上限 = ioTime × (100-ioRatio)/ioRatio；ioRatio=100 吞吐最高但任务可能饿死。
- 对抗 JDK epoll 空轮询 BUG：连续 512 次 select 返回 0 即判定命中，重建 Selector 并把全部 Channel 迁移过去，对上层透明。
- Netty 还用数组版 SelectedSelectionKeySet 替换 JDK 的 HashSet 实现，降低 GC 与遍历开销。

## 正文

正文约 12000 字符，完整整理稿见附件 [[Assets/2026/10/netty-09-nioeventloop-run.md]]，含 run() 全量源码注解、Selector 重建源码、流程图与面试题精选。

## 来源

[Netty源码分析(9) — NioEventLoop 的 run() 方法到底在干什么？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484046&idx=1&sn=cd2f21f2e428e1217908bd00c08c730d&chksm=fe6ca3d4c91b2ac2719875e900d19d3d120e21149cd36c5ebede587784e5635e2579043496dd#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-09-nioeventloop-run.md]]（抓取正文整理稿，browser 级抓取）
