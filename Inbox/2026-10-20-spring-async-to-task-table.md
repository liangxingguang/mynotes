---
id: 2026-10-20-spring-async-to-task-table
title: Spring Boot 一个任务跑 20 分钟，我把 @Async 删了：改成了"任务表 + Worker"
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/DxS0YQAlpbFpP3sJVFUhKw
source_type: link
platform: 微信
created: 2026-10-20
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/spring-async-to-task-table.md
wiki_status: pending
---

# Spring Boot：从 @Async 到"任务表 + Worker"

> 一次滚动发布让跑了 12 分钟的大文件任务彻底消失——@Async 的执行状态只在 JVM 线程里。改造为"任务表 + Worker"：Controller 只落库（WAITING/PROCESSING/SUCCESS/FAILED），Worker 定时扫描 + 条件 UPDATE 抢占解决多实例竞争，heartbeat_time + Recovery Job 解决 Worker 中途死亡，retry_count 区分"值得重试"与"重试无意义"，协作式取消替代杀线程，幂等设计接受"至少执行一次"。线程池管"同时执行几个"，数据库管"有哪些任务、什么状态"。

## 核心要点

- **@Async 的两个原罪**：执行状态只存内存（JVM 消失任务即蒸发，DB 却显示 PROCESSING）；排队信息只在 ThreadPoolExecutor 内部队列，业务不可观测
- **职责拆分**：线程池负责"当前实例同时执行几个任务"，数据库负责"系统里有哪些任务、什么状态"——拆开后线程挂掉 ≠ 任务丢失
- **多实例抢占**：条件 UPDATE（WHERE status='WAITING'）看 affected 行数，无需分布式锁，数据库状态即协调机制
- **崩溃恢复**：heartbeat_time 每 30s 更新，Recovery Job 扫描心跳超时的 PROCESSING 任务放回 WAITING——重启从"任务永久消失"变成"稍后重新执行"
- **幂等是硬约束**：支持恢复就必须接受任务可能执行两次；结果按 taskNo 固定路径写入 + task_id 唯一约束
- **可重试 vs 不可重试**：临时故障（超时/503）回 WAITING，业务错误（格式错/字段缺失）直接 FAILED
- **协作式取消**：CANCEL_REQUESTED 状态 + Worker 在安全节点主动检查，优于 Future.cancel() 强杀线程
- **适用边界**：几秒小动作（发邮件/刷缓存）仍用 @Async；长耗时+需进度+需重试+多实例+可取消中出现两三个时就该上任务表

## 正文

全文见 [[Assets/2026/10/spring-async-to-task-table]]（注：原文代码块为图片，已按上下文补全关键 SQL/状态机）。

## 来源

[Spring Boot 一个任务跑 20 分钟，我把 @Async 删了：改成了"任务表 + Worker"](https://mp.weixin.qq.com/s/DxS0YQAlpbFpP3sJVFUhKw)

## 附件

- [[Assets/2026/10/spring-async-to-task-table]]
