---
id: 2026-10-21-jvm-troubleshooting-six-tools
title: JVM 排查别乱试：6 个工具各管什么
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/9eAlETU99LUBabyJ892kGQ
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/jvm-troubleshooting-six-tools.md
wiki_status: pending
---

# JVM 排查别乱试：6 个工具各管什么

> JDK 自带诊断工具的分工图谱与排障顺序：jps 找进程 PID、jcmd 综合诊断入口（先 `jcmd <pid> help`）、jstat -gcutil 连续采样看 GC 趋势（"感觉像 GC"不算证据）、jstack -l 取线程现场找锁等待/死锁、jinfo 查启动配置（不适合乱改线上参数）、VisualVM 看 CPU/GC/堆/线程趋势关联。核心原则：排障不是工具越多越专业，每次只拿能回答当前问题的那一个；把进程、配置、GC、线程几份证据放到同一条时间线上，定位才快。

## 核心要点

- **工具分工表**：jps→PID+启动参数；jcmd→线程/堆/类/flags；jstat→各区使用率与 GC 次数耗时；jstack→线程栈/锁等待/死锁；jinfo→JVM flags/System Properties；VisualVM→趋势关联
- **jcmd 有轻重**：Thread.print 适合快速取现场；堆转储、类直方图可能带来明显暂停或磁盘压力，先看 `help` 再动手
- **jstat 判 GC**：FGC 持续增长 + FGCT 明显增加 + 接口延迟尖峰同时对上，GC 才是主要嫌疑；单次 O 达 80% 不能下结论，看趋势
- **jstack 用法**：间隔几秒采 3 次对比同一线程是否原地不动；搜 BLOCKED 同一把锁、连接池/HTTP 客户端堆积、死锁环
- **jps 容器坑**：宿主机与容器 PID 命名空间不同、跨用户权限不可见——看不到进程先确认环境，别急着判"服务没启动"
- **六步排查序**：jps 找 PID → jcmd 确认启动参数 → jstat 看 GC → jstack 取线程现场 → VisualVM 看趋势 → 最后才堆转储等重操作

## 正文

全文（含命令示例、容器注意事项、选型速查表）见 [[Assets/2026/10/jvm-troubleshooting-six-tools]]。

## 来源

[JVM排查别乱试：6个工具各管什么](https://mp.weixin.qq.com/s/9eAlETU99LUBabyJ892kGQ)

## 附件

- [[Assets/2026/10/jvm-troubleshooting-six-tools]]
