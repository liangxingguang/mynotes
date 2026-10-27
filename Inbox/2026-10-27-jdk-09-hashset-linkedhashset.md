---
id: 2026-10-27-jdk-09-hashset-linkedhashset
title: JDK源码阅读(10) HashSet & LinkedHashSet 不重复是怎么做到的
source: 微信公众号
source_url: http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484067&idx=1&sn=6ff50dbde8d3c0a40f67d5e5cbc6a46c&chksm=fe6ca3f9c91b2aef88112dc82041c4ba2a1cf38bf95a44a7994235c99793368a9011e27c34c6#rd
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Java, 课程]
asset_ref: Assets/2026/10/jdk-09-hashset-linkedhashset.md
wiki_status: pending
---

# JDK源码阅读(10) HashSet & LinkedHashSet 不重复是怎么做到的

> HashSet 内部就是一个 HashMap：元素作 key，value 统一为 PRESENT 占位对象，去重本质依赖 hashCode() 定位桶 + equals() 判同。LinkedHashSet 通过 HashSet 的包级私有构造把底层换成 LinkedHashMap，从而获得插入顺序。add 返回 put(e,PRESENT)==null 的巧妙判断。自定义对象必须同时重写 hashCode 与 equals，且入桶后不可修改参与 hash 计算的字段。

## 核心要点

- HashSet 全部方法（add/remove/contains/size/iterator）都委派给内部 HashMap，迭代即 map.keySet() 迭代且 fast-fail
- add 一行代码：`map.put(e, PRESENT) == null`，key 已存在时 put 返回旧值非 null 即判重失败
- LinkedHashSet 仅靠 dummy 参数触发包级私有构造换用 LinkedHashMap，性能损失约 5~10% 换来可预测遍历顺序
- 序列化自行写 capacity/loadFactor/元素而非序列化 HashMap 本体，是为跨 JDK 版本兼容性
- 可变对象陷阱：对象入 Set 后修改参与 hashCode 的字段会导致 contains 失效甚至内存泄漏
- 均非线程安全，可用 synchronizedSet 或 ConcurrentHashMap.newKeySet()

## 正文

正文约 10184 字符，完整整理稿见附件 [[Assets/2026/10/jdk-09-hashset-linkedhashset.md]]。附件含 HashSet/LinkedHashSet 全量源码注释、顺序对比与自定义对象去重 Demo、三 Set 对比表及面试题精选。

## 来源

[JDK源码阅读(10) HashSet & LinkedHashSet 不重复是怎么做到的](http://mp.weixin.qq.com/s?__biz=MzU5NTcwMzg2MQ==&mid=2247484067&idx=1&sn=6ff50dbde8d3c0a40f67d5e5cbc6a46c&chksm=fe6ca3f9c91b2aef88112dc82041c4ba2a1cf38bf95a44a7994235c99793368a9011e27c34c6#rd)（微信公众号「Java解忧杂货铺」）

## 附件

- [[Assets/2026/10/jdk-09-hashset-linkedhashset.md]]（抓取正文整理稿）
