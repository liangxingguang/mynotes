---
id: 2026-10-27-jdk-13-arraydeque
title: ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484559&idx=1&sn=c6b080c5d119ad90488c1b230eb7b0de&chksm=fe6ca5d5c91b2cc33f2b8867c3aecfbd2b39cc0d2cd22409804b4cb06fbc7a2693d4ee59a958#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-13-arraydeque.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-28T00:27:54.155Z"
ingest_claim_id: 35244-1793147274155-0
---

# ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列

> 剖析 ArrayDeque 源码：基于循环数组（容量恒为 2 的幂）+ head/tail 指针实现的双端队列，两端操作均摊 O(1)，作栈比 Stack 快、作队列比 LinkedList 快，是官方推荐的替代方案。

## 核心要点

- 底层循环数组，容量永远是 2 的幂，用 `(index) & (len-1)` 位运算替代取模，效率高
- head 指队头、tail 指下一个插入位；head==tail 即满，触发 doubleCapacity() 翻倍扩容
- 扩容时"分两段拷贝"把环形元素重排为连续顺序内存，head 归零，保证缓存局部性
- 不允许 null 元素（poll 用 null 表示空队列，存 null 会无法区分）；非线程安全
- push=addFirst、pop=pollFirst，作栈使用比有锁的 Stack 快 3~5 倍
- 初始化用 5 次无符号右移位运算把任意容量向上取整到 2 的幂

## 正文

正文约 10113 字符，完整整理稿见附件 [[Assets/2026/10/jdk-13-arraydeque.md]]。附件含 addFirst/doubleCapacity 核心源码、与 LinkedList/Stack 对比表及括号匹配、滑动窗口最大值实战代码。

## 来源

[ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484559&idx=1&sn=c6b080c5d119ad90488c1b230eb7b0de&chksm=fe6ca5d5c91b2cc33f2b8867c3aecfbd2b39cc0d2cd22409804b4cb06fbc7a2693d4ee59a958#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-13-arraydeque.md]]（抓取正文整理稿）
