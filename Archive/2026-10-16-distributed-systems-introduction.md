---
id: 2026-10-16-distributed-systems-introduction
title: 第一章：分布式系统概述
source: codedump（分布式系统中文教程）
source_url: https://www.codedump.info/dist-system-cn/introduction/
source_type: article
platform: codedump.info
created: 2026-10-16
category: 技术
tags: [分布式系统, 工程实践, 课程]
asset_ref: Assets/2026/10/distributed-systems-introduction.md
wiki_status: ingested
---

# 第一章：分布式系统概述

> 分布式系统教程开篇。以集中式单机系统为对照建立分布式系统定义（多节点经网络消息传递协同、无共享内存），剖析四大核心挑战——网络不可靠（丢包/乱序/延迟无上限，TCP 只给"可靠流"幻觉）、无全局时钟（物理时间戳会排出"来自未来的消息"）、部分失效（无法区分宕机、慢、丢消息，可引发级联故障与脑裂）、副本一致性（真理变成"流言"，一致性是频谱而非布尔值）；并总结工程师四点心智转变：二态→三态逻辑（成功/失败/超时+幂等设计）、绝对时间→因果顺序、完美主义→CAP 权衡、防御故障→拥抱故障（熔断/降级/隔离）。

## 核心要点

- **定义与动因**：分布式系统 = 网络互联的独立节点靠消息协同；横向扩展突破单机物理上限，换取高性能、高可用、地理就近与合规。
- **网络不可靠**：故障在接收方都表现为"没收到回复"，无法区分节点宕机与网络问题；TCP 不解决断连、延迟抖动与业务级送达。
- **无全局时钟**：各节点时钟有偏差，不能用物理时间戳定多机事件全序，需逻辑时钟。
- **部分失效最棘手**：亚健康进程、重复扣款、线程池耗尽引发级联故障、误判宕机导致脑裂。
- **一致性是频谱**：副本同步延迟内不同节点给出不同数据，强一致与可用性按业务权衡。
- **心智转变**：RPC 三态 + 幂等；放弃绝对时间接受最终一致；CAP 中分区容错是前提，C/A 按场景取舍；故障是常态，默认依赖会挂。

## 正文

完整正文见采集态原件（含扩展方式对比图、消息故障类型图、时钟悖论图、副本不一致图与解决方案对照表）：[[Assets/2026/10/distributed-systems-introduction.md]]

## 来源

- [第一章：分布式系统概述 · codedump 分布式系统中文教程](https://www.codedump.info/dist-system-cn/introduction/)

## 附件

- [[Assets/2026/10/distributed-systems-introduction.md]]（web-fetch 抓取正文，12,349 字符，fetch_level=http）
