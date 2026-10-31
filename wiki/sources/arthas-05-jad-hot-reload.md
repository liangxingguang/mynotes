---
id: wiki-source-arthas-05-jad-hot-reload
type: source
title: 改了代码没生效？先 jad 一下，再谈热更新
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - java
  - arthas
  - jad
  - redefine
  - troubleshooting
sources:
  - raw/sources/architecture/2026-10-31-arthas-05-jad-hot-reload.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/jad-sc-sm-version-check.md
  - wiki/concepts/redefine-hot-reload-boundaries.md
  - wiki/sources/arthas-01-attach-first-conclusion.md
  - wiki/concepts/evidence-first-jvm-tuning.md
---
# 改了代码没生效？先 jad 一下，再谈热更新

## Overview（概览）

方法级观察文章（公众号专辑《arthas使用》第 5 篇）：讲「代码改了但线上行为还是旧的」这类问题的排查路径——先用 `jad`/`sc -d`/`sm` 三个"看"的命令确认线上实际加载的是哪版代码、谁加载的、签名对不对，再归纳"改了没生效"的四个常见原因，最后给出 `redefine` 热替换的能力边界、三个风险与"临时止血五步"的正确姿势。核心主张：先确认，再动手。

## Key Facts（关键事实）

- **jad 看的是"实际加载的那份字节码"**：`jad 类名` 把 JVM 里实际加载的字节码反编译出来；本地 IDE 看到的是源码、线上跑的是编译产物，两者可能不是同一版。判断方法：看你改的那行在不在，不在就说明线上没跑你的代码。
- **sc -d 看类是谁加载的**：`sc -d 类名` 两个最有用的字段是 ClassLoader 标识与代码来源（从哪个 jar 或目录加载）；**同一个类名出现两个不同 ClassLoader，就是问题所在**（同一份类被加载成两份互不相干的 Class 对象）。
- **sm 看方法签名**：`sm 类名 方法名` 确认"方法到底存不存在、参数是不是这个"，排除"以为调 A 实际走了重载的 B"。
- **"改了没生效"四个常见原因**：① 发布根本没到这台机器（集群只发了一部分、灰度没覆盖到出问题的那台）；② 多 ClassLoader 加载了旧类（热部署、插件化、自定义 ClassLoader）；③ 热部署没真正生效（只重载了部分类，被引用的旧类还在）；④ 改的分支没合进去（发布 release 分支、改在 feature 分支）——最常见也最容易忽略，只能查发布记录。前三个用命令能确认。
- **redefine 的边界**：底层是 JVM Instrumentation 机制，热替换已加载的类；只能改**方法体内部的逻辑**，不能新增或删除字段、不能新增或删除方法、不能修改方法签名；且**正在执行的方法没退出，新逻辑不会生效**——替换完立刻还是老行为不代表失败，等那批请求跑完再看。Arthas 底层做了"内存编译"（源码在内存里编译成字节码再替换），成功率高一些，但不改变边界。
- **三个风险**：① 与框架字节码增强（Spring 代理等）冲突，表现是"方法进去了但注入的对象不对"；② 类结构不一致会引发更难查的问题；③ 只是临时止血——**下一次正常发布就被覆盖、问题原样回来**，没记录的话几周后同样的故障会再来一遍。
- **正确姿势五步**：`jad` 确认版本 → `sc -d` 查 ClassLoader → 测试环境验证 redefine → 生产只做临时止血并记一条明确 TODO → 走正常发布覆盖。
- **结尾提醒**：热更新最大的诱惑是"不用发布就能修"，但也正因不用发布，它**不会留下任何版本记录**——三个月后没人知道线上那版代码曾经被改过。

## Important Claims（重要论断）

### 先确认，再动手

「这时候最容易犯的错，是直接怀疑'发布没成功'然后重新发一遍。但如果实际原因是类加载器加载了两份，重发也没用。」与 [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]] 的"先定位再动手"一致，也与 [[jad-sc-sm-version-check|jad/sc -d/sm 版本核实三件套]] 的流程互为表里。

### 热更新不留下版本记录

「正因为不用发布，它不会留下任何版本记录。」这是 redefine 只能临时止血的根本原因（解读：止血操作必须显式记录，否则故障会因遗忘而复发）。

## Concepts Introduced（引入的概念）

- [[jad-sc-sm-version-check|jad/sc -d/sm：核实线上跑的是哪版代码]]（本篇为该概念的主信源）。
- [[redefine-hot-reload-boundaries|redefine 热替换边界：能改什么、不能改什么]]（本篇为该概念的主信源）。

## Entities Mentioned（提及的实体）

- [[arthas|Arthas]]（三个"看"的命令与 redefine 的载体）

## Implications（影响／启示）

- 与 [[arthas-01-attach-first-conclusion|Arthas 上手]] 的 6 命令速查互证并展开：速查表里"jad/sc -d/sm 确认线上代码版本"一条在此获得完整用法（三个命令各看什么、怎么判读）；其 4 条生产纪律中"redefine/retransform 慎用"在此获得具体边界支撑。
- 与 [[redefine-hot-reload-boundaries|redefine 热替换边界]] 的"临时止血"要求，与 [[arthas-mcp-server-ai-diagnosis|Arthas 官方 MCP 实测]] 的生产红线"redefine 仅当前 JVM 生效、只作临时止血"互证。
- 原因②（多 ClassLoader 加载旧类）是 [[class-loading-parent-delegation|类加载与双亲委派]] 的运行时症状：双亲委派被破坏的常见场景（热部署/插件化/自定义 ClassLoader）正是"两份互不相干的 Class 对象"的来源（解读）。
- 原因①（发布没到这台机器、灰度没覆盖）提示"改了没生效"也可能是发布流程问题而非 JVM 问题，涉及灰度/蓝绿等交付策略（与 [[blue-green-deployment|蓝绿发布]] 相关，解读）。

## Limitations（局限）

- 配图在采集稿中为 1px 占位符（一张 base64 gif、一张 svg），正文信息无损；对照表字段在采集稿中被拆行，已按语义还原为表格。
- 命令参数以文章所述版本为准，原文结尾自带免责声明"具体参数以你所使用版本的官方文档为准"。
- 未覆盖 retransform 与 redefine 的差异、mc（内存编译）命令的单独用法，以及 MCP 场景下 jad/redefine 的调用形态。

## Related Knowledge（相关知识）

- [[jad-sc-sm-version-check|jad/sc -d/sm 版本核实三件套]]（概念页）
- [[redefine-hot-reload-boundaries|redefine 热替换边界]]（概念页）
- [[arthas|Arthas]]（实体页）
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]（先确认再动手的方法论）
- [[arthas-01-attach-first-conclusion|Arthas 上手]]（6 命令速查互证）

## Source（信源）

- `raw/sources/architecture/2026-10-31-arthas-05-jad-hot-reload.md`
