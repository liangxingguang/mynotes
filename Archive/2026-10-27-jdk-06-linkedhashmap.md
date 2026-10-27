---
id: 2026-10-27-jdk-06-linkedhashmap
title: JDK源码阅读(5)：LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483939&idx=1&sn=d32daec7895b112584753b7b696afa71&chksm=fe6ca379c91b2a6fc196ccd95f77cdda69dcd7393f5e7ec3d858688a98fcd18f991a56152b0c#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-06-linkedhashmap.md
wiki_status: ingested
---

# JDK源码阅读(5)：LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍

> LinkedHashMap 继承 HashMap，每个 Entry 额外维护 before/after 双向链表指针，实现按插入顺序或访问顺序遍历。不重写 put，而是通过 HashMap 留下的 newNode/afterNodeAccess/afterNodeInsertion 等模板方法钩子维护链表。配合 accessOrder=true 与重写 removeEldestEntry，几行代码即可实现 LRU 缓存（MyBatis LruCache 即此思路）。

## 核心要点

- Entry 继承 HashMap.Node 增加 before/after 指针：身兼哈希桶节点与双向链表节点两职
- 不重写 put，靠 HashMap 的三个钩子（newNode、afterNodeAccess、afterNodeInsertion）维护链表——模板方法模式经典应用
- 迭代沿 after 指针走 O(n)，比 HashMap 扫桶数组更高效且顺序可预期
- accessOrder=true 时 get 会把访问节点移到链表尾部，链表头即最久未访问节点
- LRU 实现：构造传 accessOrder=true，重写 removeEldestEntry 返回 size()>maxCapacity；淘汰仅在 put 时被动触发
- 非线程安全；比 HashMap 每节点多两个指针，插入性能略低

## 正文

正文约 9315 字符，完整整理稿见附件 [[Assets/2026/10/jdk-06-linkedhashmap.md]]。附件含 Entry/linkNodeLast/afterNodeAccess 源码注释、插入顺序 vs 访问顺序对比 Demo、完整 LRUCache 实现及与 HashMap/TreeMap 对比表。

## 来源

[JDK源码阅读(5)：LinkedHashMap——比HashMap多了一条"链"，却优雅了十倍](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483939&idx=1&sn=d32daec7895b112584753b7b696afa71&chksm=fe6ca379c91b2a6fc196ccd95f77cdda69dcd7393f5e7ec3d858688a98fcd18f991a56152b0c#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-06-linkedhashmap.md]]（抓取正文整理稿）
