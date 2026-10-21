---
id: wiki-concept-cpu-funnel-coding
type: concept
title: CPU 漏斗（编码级性能模型）
status: active
created: 2026-10-21
updated: 2026-10-21
confidence: medium
tags:
  - concept
  - java
  - performance
sources:
  - raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part1.md
related:
  - wiki/sources/java-perf-low-cpu-coding-tips-part1.md
---
# CPU 漏斗（编码级性能模型）

## Definition（定义）

京东云开发者"36 种编码实战技巧"系列反复强调的编码级降 CPU 模型：把不必要的解析、类型转换、格式化全部砍掉，让底层计算轻量化——CPU 只做核心运算，不为无效工作买单。

## Why It Matters（为什么重要）

高并发场景下，单次调用的微小浪费（一次类型转换、一次字符串拼接、一个临时对象）会被 QPS 放大为 GC 压力与延迟毛刺；编码习惯是比 JVM 调参更靠前的性能杠杆。

## Core Characteristics（核心特征）

1. 全链路类型统一：传输/存储/计算/缓存同一类型，消灭循环内的 String↔Long 转换与自动拆装箱。
2. 相同数据只取一次：局部变量/请求缓存/批量查询消除重复 IO 与重复解析。
3. 快速失败：校验前置、有序、独立，非法请求尽早 return，不走无效主干。
4. O(1) 替代 O(n) 分支：Set.contains 替代链式 equals，初始化期建 Map 替代多层 if-else。
5. 零临时对象：数组/ArrayList 遍历、原生 for、StringBuilder、fastutil 原生类型集合，降低 GC。

## Structure（结构）

漏斗的"入口"是全量请求与数据，"滤除层"是各类无效 CPU 消耗（转换、拼接、异常、重复计算、顺序分支），"出口"是仅剩核心运算的轻量化执行路径。（解读：信源未给出形式化结构图，此为对其反复表述的归纳。）

## How It Works（运作方式）

每种技巧按"核心原理 → 实现方式 → 注意事项 → 落地经验"落地，机理共同指向四点：类型转换本质是内存解析与字节重组；字符串/异常/日期格式化制造大量临时对象触发 GC；哈希寻址 O(1) 优于顺序分支 O(n)；数组连续内存享受 CPU 缓存预加载。

## Relationships（关系）

### Related Concepts（相关概念）

- （暂无已建页的相关概念）

### Distinctions（区分）

- 与 JVM 调参的区别：漏斗模型主张 GC 频繁先改代码（对象外提、去装箱、static final），调参是最后手段。

## Evolution（演进）

- 2026-10-14 — 随"36 种编码实战技巧（上篇）"提出，贯穿前 18 种技巧；下篇尚未采集。

## Open Questions（开放问题）

- 各技巧给出的倍率（10~100 倍、300%~1000%、3~10 倍）缺乏公开基准环境，实际收益需按自身负载验证。

## Evidence（证据）

- Source: `raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part1.md`

## Related Knowledge（相关知识）

- [[java-perf-low-cpu-coding-tips-part1]]
