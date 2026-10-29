---
id: 2026-10-27-netty-28-promise
title: Netty源码分析(28) — Promise 与 自定义异步结果
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484638&idx=1&sn=3cb762789818581715f45344c6c29d38&chksm=fe6ca584c91b2c925fcb15210dd32aa8325f550dba9e80c8cc87c68141e84eb53cfac729e1d8#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [netty, Java]
asset_ref: Assets/2026/10/netty-28-promise.md
wiki_status: ingested
---

# Netty源码分析(28) — Promise 与 自定义异步结果

> Promise 是"可写的 Future"：继承 Future 并增加 setSuccess/setFailure/trySuccess 等手动完成方法。本文剖析 DefaultPromise 实现——CAS 状态机、监听器懒加载与 EventLoop 亲和性通知。

## 核心要点

- Future 只读（查结果、加监听器），Promise 可写（setSuccess/setFailure 主动兑现结果）；对应 Guava SettableFuture、JDK CompletableFuture
- setSuccess 已完成时抛 IllegalStateException，trySuccess 返回 false 不抛异常——不确定是否已完成时优先用 trySuccess
- DefaultPromise：单个 volatile result 字段 + AtomicReferenceFieldUpdater 做 CAS 状态机（PENDING→SUCCESS/FAILURE/CANCELLED，不可逆）
- 监听器懒加载：一个 Object 字段先存单 listener，加第二个才升级为 DefaultFutureListeners 数组；addListener 时若 isDone 立即触发通知防丢失
- 通知机制有 EventLoop 亲和性：在 EventLoop 内直接通知，否则 safeExecute 提交到 EventLoop 执行；checkNotifyWaiters 先 notifyAll 唤醒阻塞线程再通知 listener
- sync() 与 await() 区别：sync 传播异常与中断，await 不传播；EventLoop 内调 sync/await 会死锁；取消后 isDone 即为 true，listener 立即触发

## 正文

正文约 15000 字符，完整整理稿见附件 [[Assets/2026/10/netty-28-promise.md]]，含 Promise/DefaultPromise 源码逐段剖析（含作者对 notifyAll 位置的考证过程）、状态机图、异步 RPC 与封装第三方回调库两个完整示例。

## 来源

[Netty源码分析(28) — Promise 与 自定义异步结果](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484638&idx=1&sn=3cb762789818581715f45344c6c29d38&chksm=fe6ca584c91b2c925fcb15210dd32aa8325f550dba9e80c8cc87c68141e84eb53cfac729e1d8#rd)（微信公众号）

## 附件

- [[Assets/2026/10/netty-28-promise.md]]（抓取正文整理稿，browser 级抓取）
