---
id: 20261103-weixin-full-gc-troubleshooting
title: 一次Full GC排查实录——从GC日志到根因，完整推理链拆给你看
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/iXh44LieBvK9vlm_RDSLHA
source_type: 网页
platform: 微信公众号
created: 2026-11-03
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026-11-03/weixin-full-gc-troubleshooting.md
wiki_status: ingested
---

# 一次Full GC排查实录——从GC日志到根因，完整推理链拆给你看

> 核心理念：GC排查本质是刑侦——GC日志是现场、dump是尸检、根因是凶手。"重启能解决"只是销毁证据，一个月后必复发。案例：服务每 20 秒一次 Full GC、暂停 800ms-1.2s、P99 飙到 3 秒；GC 日志显示老年代 409598K→409596K 只回收 2K（活对象占满）；jmap dump + MAT 定位 ConcurrentHashMap 占 2.1GB/52% 堆，key 为"user:风险标签:88123xxx"，GC Roots 指向静态字段 RiskLabelCache；代码只有 putIfAbsent 无 remove/无上限/无过期，40 万日活日涨 400MB，4G 堆约十天打满，与重启时间线吻合。修法三层：止血（监控+临时清理）、治本（Caffeine 有界缓存 maximumSize=50万+expireAfterWrite=1h，命中率 93%）、防线（static 集合类 code review 必查、老年代 80% 告警、GC.class_histogram 巡检）。

## 核心要点

- 排查理念：GC排查本质是刑侦——日志是现场，dump是尸检，根因是凶手；重启只是销毁证据
- 现场（GC日志）：每 20 秒一次 Full GC，暂停 800ms-1.2s，P99 3s；`-Xlog:gc*`（JDK8 为 -XX:+PrintGCDetails）
- 三条线索：老年代回收前 409598K→回收后 409596K 只回收 2K（活对象占满清不掉）；触发原因 Ergonomics（老年代到顶）；20 秒一次说明老年代被快速填满
- 初步画像：有东西疯狂往老年代塞活对象；排除流量突增（那种 GC 后能降下来）——凶手是内存泄漏或大对象缓存失控二选一
- 尸检（jmap dump）：`jmap -dump:live,format=b,file=heap.hprof <pid>`（live 先触发 Full GC；要找的是活着的凶手，销毁临死对象现场无影响）；选流量低的节点避免 STW 几十秒
- MAT 两报告：Leak Suspects（直接给嫌疑——本例 ConcurrentHashMap 占 2.1GB/52% 堆）；Dominator Tree（按持有内存排序）+ Path to GC Roots（排除弱引用）找持有者
- 凶手画像：风险标签缓存 Map 只进不出，key 随用户增长永远不淘汰
- 定罪（代码）：`LABEL_CACHE.putIfAbsent(key, queryLabel(userId))` 全文无 remove、无 size 上限、无过期机制；40 万日活 × 每 key 约 1KB ≈ 日涨 400MB，4G 堆约十天打满；上次重启恰好十天前，完美解释"重启能解决"
- 修法三层：止血=加监控+临时定时清理（凌晨低峰重启，知道这是止血不是治疗）；治本=无界缓存换有界（Caffeine maximumSize=50万+expireAfterWrite=1小时 首选，Guava Cache 次选，Redis 外置适合值大/多实例共享；本例命中率实测 93%）；防线=静态集合类字段列入 code review 必查（static+Map/List/Set+只 put 不 remove=泄漏模板）、老年代使用率 80% 持续 5 分钟告警、jcmd GC.class_histogram 定期采集
- 面试三段式：现象 30 秒（周期性 Full GC、回收前后老年代几乎不变=活对象占满=泄漏嫌疑）→排查 60 秒（GC日志→jmap dump→MAT Leak Suspects→Dominator Tree 看内容模式→Path to GC Roots 找持有者→代码确认→时间线交叉验证）→根因与修复 30 秒；推理链欢迎追问，背答案经不起追问
- 灵魂拷问：全局搜 `static.*Map|static.*List` 数一数有几个配了淘汰策略；无界静态集合是 Java 内存泄漏头号模板——测试环境永远测不出来（数据量不够），上线十天半月才爆发

## 正文

### 第一现场：读懂GC日志再说

告警信息：服务每隔20秒一次Full GC，每次暂停800ms-1.2s，接口P99飙到3秒。拿到机器第一件事不是猜，是看GC日志（-Xlog:gc\*，JDK8是-XX:+PrintGCDetails）。

日志关键行（示意）：

`[Full GC (Ergonomics) [PSYoungGen: 0K->0K] [ParOldGen: 409598K->409596K] 409598K->409596K, 1.1 secs]`

三条线索：

1. 老年代回收前409598K，回收后409596K——只回收了2K，老年代基本满且垃圾清不掉；
2. 触发原因是Ergonomics（自动策略），老年代到顶了；
3. 每隔20秒来一次，说明老年代被快速填满。

初步画像：**有东西在疯狂往老年代塞数据，而且是塞活对象（GC清不掉的）。**这排除了"流量突增导致临时对象多"（那种场景GC后能降下来）——凶手是内存泄漏或者大对象缓存失控，二选一。

### 尸检：heap dump的正确打开方式

活着的服务Dump会STW几十秒（4G堆），选一台流量低的节点：`jmap -dump:live,format=b,file=heap.hprof <pid>`（live参数先触发一次Full GC再dump——注意这会销毁一部分"临死对象"的现场，但我们要找的是活着的凶手，没影响）。

用MAT（Eclipse Memory Analyzer）打开，先看两个报告：

1. **Leak Suspects（泄漏嫌疑报告）**：直接给出嫌疑——本例报告：一个`java.util.concurrent.ConcurrentHashMap`占了2.1GB，占堆52%，嫌疑拉满。
2. **Dominator Tree（支配树）**：按对象持有内存大小排序。展开那个Map：key是字符串——看模式，全是`"user:风险标签:88123xxx"`这种格式。**再看GC Roots引用链：谁持有这个Map？**点开Path to GC Roots（排除弱引用）——一个叫`RiskLabelCache`的静态字段。

到这里凶手画像完整：**风险标签缓存Map，只进不出，key随用户增长，永远不淘汰。**

### 定罪：为什么它会泄漏

看代码（脱敏后逻辑）：

`private static final Map<String, String> LABEL_CACHE = new ConcurrentHashMap<>();`

`// 查询：无则放入，有则返回`

`LABEL_CACHE.putIfAbsent(key, queryLabel(userId));`

**全文没有remove，没有size上限，没有过期机制。**每个新用户带一个新key进来，Map单调增长——日活40万的应用，每个key加value约1KB，一天涨400MB，老年代4G，**十天左右必然打满。**

时间线也吻合：服务上次重启恰好是十天前（一次发布），之后Map从零开始积累——**这解释了为什么"重启能解决"：重启清空了Map，十天后再犯。**

### 修法：三层，从治标到治本

**立即止血（当天）：**加监控+临时定时清理（凌晨低峰重启也行，但要知道这是止血不是治疗）。

**正确修法（当周）：**无界缓存换有界结构。三个选项：①Caffeine（maximumSize+expireAfterWrite，一行动配置，首选）；②Guava Cache；③Redis外置（如果缓存值大或多实例要共享）。**本例选Caffeine：maximumSize=50万，expireAfterWrite=1小时——最坏内存占用封顶，命中率实测还有93%。**

**机制防线（当月）：**①静态集合类字段列入code review必查项（static+Map/List/Set+只put不remove=泄漏模板）；②上线堆内存告警阈值（老年代使用率80%持续5分钟）；③大内存应用标配jcmd GC.class_histogram定期采集，异常增长早发现。

### 面试怎么讲：三段式

**现象（30秒）：**服务周期性Full GC，每次回收前后老年代几乎不变，说明活对象占满，怀疑泄漏。

**排查（60秒）：**GC日志定位"回收无效"→jmap dump→MAT Leak Suspects锁定大Map→Dominator Tree看内容模式→Path to GC Roots找到静态缓存字段→代码确认无淘汰机制→时间线（重启后十天复发）交叉验证。

**根因与修复（30秒）：**无界本地缓存单调增长；换Caffeine有界缓存+过期策略，加code review检查项和内存告警。

这个结构讲下来，面试官听到的是**完整的证据链和推理过程**，不是背答案——两者的区别是：背的答案经不起追问，推理链欢迎追问。

### 灵魂拷问

打开你们项目的代码，全局搜`static.*Map|static.*List`，数一数有多少个，再看看有几个配了淘汰策略。

**我每次做这个练习，中招率没有低于50%的——无界静态集合是Java内存泄漏的头号模板，而它的可怕之处在于：测试环境永远测不出来（数据量不够），上线十天半个月才爆发，爆发时最早排查的人往往已经忘了它。**别等告警替你做code review。

## 来源

[一次Full GC排查实录——从GC日志到根因，完整推理链拆给你看](https://mp.weixin.qq.com/s/iXh44LieBvK9vlm_RDSLHA)

## 附件

[[Assets/2026-11-03/weixin-full-gc-troubleshooting.md]]
