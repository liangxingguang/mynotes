---
id: 2026-10-27-jdk-01-arraylist
title: JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483850&idx=1&sn=e7ed1b5dcfe84b5c398ec7cf80b9c0ba&chksm=fe6ca090c91b2986d6e41fdbd1fe54603dbd518a1174a9dd820b29dcc692800ee7e43c337251#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-01-arraylist.md
wiki_status: pending
---

# JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？

> ArrayList 本质是动态数组，底层用 transient Object[] 存数据并自定义序列化。无参构造采用懒加载，首次 add 才分配默认容量 10，之后按 1.5 倍扩容。随机访问 O(1)，中间插入删除 O(n)，通过 modCount 实现 Fast-Fail。文章还给出了预分配容量、subList、线程安全、toArray 转型等实战避坑建议。

## 核心要点

- 无参构造是懒加载：elementData 初始为空数组，第一次 add 才扩到默认容量 10
- 扩容公式 `old + (old >> 1)` 即 1.5 倍，是时间与空间的折中；知道数据量务必预设初始容量避免多次 O(n) 拷贝
- get/set 直接数组下标 O(1)；remove 需 arraycopy 搬移后续元素，平均 O(n)
- modCount 实现 Fast-Fail：foreach 中直接 add/remove 会抛 ConcurrentModificationException，应改用 Iterator.remove() 或 removeIf()
- subList 是原 List 的视图而非副本；toArray() 强转数组会 ClassCastException，应用 toArray(new String[0])
- 线程不安全，多线程写场景用 CopyOnWriteArrayList 或 synchronizedList；90% 场景优先 ArrayList（内存连续、缓存友好）

## 正文

正文约 10525 字符，完整整理稿见附件 [[Assets/2026/10/jdk-01-arraylist.md]]。附件含核心源码逐段注释、扩容演示 Demo（反射观察 capacity 变化）、ArrayList 与 LinkedList 对比表及常见坑示例。

## 来源

[JDK源码阅读(1) — ArrayList：最熟悉的陌生人，你真的会用吗？](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247483850&idx=1&sn=e7ed1b5dcfe84b5c398ec7cf80b9c0ba&chksm=fe6ca090c91b2986d6e41fdbd1fe54603dbd518a1174a9dd820b29dcc692800ee7e43c337251#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-01-arraylist.md]]（抓取正文整理稿）
