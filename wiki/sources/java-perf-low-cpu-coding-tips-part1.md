---
id: wiki-source-java-perf-low-cpu-coding-tips-part1
type: source
title: 打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）
status: active
created: 2026-10-21
updated: 2026-10-22
confidence: high
tags:
  - source
  - java
  - performance
sources:
  - raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part1.md
---
# 打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）

## Overview（概览）

京东云开发者公众号文章，基于黄流百万 QPS 高并发系统实战经验沉淀，系列共 36 种编码技巧、100+ 案例；上篇覆盖前 18 种。定位为可常备对照的性能编码"百科全书"，每种技巧按"核心原理 → 实现方式 → 注意事项 → 落地经验"展开。

## Key Facts（关键事实）

- 主线是"CPU 漏斗模型"：砍掉不必要的解析、转换、格式化，让底层计算轻量化，是编码级别降低 CPU 的核心。
- 全链路统一数据类型：接口传输/数据库存储/内存计算/缓存用同一类型（如 ID 统一 Long、状态统一 Integer/枚举）；数字比对比字符串快 10~100 倍。
- 数组/ArrayList 遍历凭连续内存、CPU 缓存命中、O(1) 随机访问、零 GC，比链表、迭代器遍历快 10~100 倍；十万级以上循环中 Lambda 性能损耗可达 300%~1000%（每秒 10 万 QPS 下 Lambda 临时对象引发 YGC/FullGC）。
- 时间处理三档：时间戳数值运算（高并发首选）> JDK8 LocalDateTime > Calendar（禁用）；DateTimeFormatter 全局 static final 复用。
- GC 频繁先改代码而非调 JVM 参数（作者称 JDK25 在 GC 方面提升很大）；对象外提、避免装箱、固定集合 static final。
- fastutil（"世界最快的原生类型集合库"）：TIntArrayList/TLongHashSet 等原生类型集合，内存 = 1/2 ~ 1/4、速度 = 3~10 倍（相对 JDK 包装类集合）。
- null 字段不省内存：示例对象字段全 null 仍占 28 字节（对象头+引用槽+对齐）；只有整个引用为 null 才只占 4 字节指针。
- 只需 key 时遍历 Map 用 keySet()：entrySet() 每轮创建 Entry/Node 包装对象，keySet() 零额外开销且 JIT 更友好。
- 微服务内部少用 JSON 字符串传参（文本协议、反复序列化），优先二进制实体对象传输。

## Important Claims（重要论断）

### Claim 1：编码级优化应服从 CPU 漏斗

顺序分支是 O(n)、哈希寻址是 O(1)；字符串拼接、异常、日期格式化制造大量临时对象触发 GC——把无效 CPU 消耗在源头砍掉。

### Claim 2：快速失败 + 数据只取一次

复杂校验拆成有序独立前置判断、非法请求尽早 return；同一请求内禁止重复查库/RPC/计算/解析。

### Claim 3：适用范围有限

作者明确说明：仅适用于有性能痛点、追求高并发高吞吐的场景；否则优先可读性与可维护性。

## Concepts Introduced（引入的概念）

- [[cpu-funnel-coding]]

## Entities Mentioned（提及的实体）

- fastutil（原生类型集合库，未单独建页）
- 京东云开发者（公众号，未单独建页）

## Implications（影响／启示）

高并发 Java 服务的性能问题大头在编码习惯（类型转换、字符串、临时对象、分支结构）而非 JVM 调参；本文提供可逐条对照的检查清单。下篇（后 18 种）已摄入：[[java-perf-low-cpu-coding-tips-part2]]。

## Limitations（局限）

- 经验性断言（如 10~100 倍、300%~1000%）未附基准测试方法与硬件环境，数值应视为量级参考。
- 单一团队经验，未必普适于所有负载特征。

## Related Knowledge（相关知识）

- [[cpu-funnel-coding]]

## Source（信源）

- `raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part1.md`
