---
id: wiki-concept-jad-sc-sm-version-check
type: concept
title: jad/sc -d/sm：核实线上跑的是哪版代码
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - java
  - arthas
  - jad
  - troubleshooting
  - class-loading
sources:
  - raw/sources/architecture/2026-10-31-arthas-05-jad-hot-reload.md
  - raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md
related:
  - wiki/entities/arthas.md
  - wiki/concepts/redefine-hot-reload-boundaries.md
  - wiki/concepts/evidence-first-jvm-tuning.md
  - wiki/concepts/class-loading-parent-delegation.md
  - wiki/concepts/watch-trace-tt.md
---
# jad/sc -d/sm：核实线上跑的是哪版代码

## Definition（定义）

「代码改了但线上行为还是旧的」问题的标准核实流程：用 Arthas 的三个"看"的命令确认线上 JVM **实际加载**的代码版本与来源——**jad** 反编译实际加载的那份字节码（看版本）、**sc -d** 看 ClassLoader 标识与代码来源（看是谁加载的）、**sm** 看方法签名（排除走错重载）。核实通过后再决定动手方式：直接发布、换命令排查，还是（极少情况下）redefine 临时止血。

## Why It Matters（为什么重要）

「代码明明改了，行为还是旧的」是最冤的一类线上问题，第一反应往往是"发布没成功、重发一遍"。但如果真实原因是多 ClassLoader 加载了两份类，重发完全无效——**正确顺序是先确认，再动手**。三个命令把"线上跑的到底是不是你以为的那版代码"从猜测变成可证实的事实，避免在错误假设上浪费一次完整发布。

## Core Characteristics（核心特征）

1. **看的是"实际加载的字节码"，不是本地源码**：本地 IDE 看到的是源码，线上跑的是编译产物，两者可能不是同一版；`jad` 的判读方法就是"看你改的那行在不在"。
2. **三个命令分工互斥**：jad 回答"哪版代码"、sc -d 回答"谁加载的、来自哪个 jar/目录"、sm 回答"方法签名对不对"，各管一件事。
3. **同名单双 ClassLoader 即根因信号**：一个类名出现两个不同 ClassLoader，意味着同一份类被加载成两份互不相干的 Class 对象——这是热部署、插件化、自定义 ClassLoader 场景的典型症状，重发无效。
4. **命令只能确认前三个原因**："改了没生效"的四个原因中，发布未到达机器、多 ClassLoader、热部署未真正生效都能用命令确认；第四个（改的分支没合进发布的分支）只能查发布记录——命令查不到不等于没有。

## Structure（结构）

| 你想确认 | 用什么 | 注意 |
|---|---|---|
| 线上跑的是哪版代码 | `jad 类名` | 看改动的那行在不在 |
| 类被谁加载、来自哪 | `sc -d 类名` | 出现两个 ClassLoader 就是线索 |
| 方法签名对不对 | `sm 类名 方法名` | 排除走错重载 |

## How It Works（运作方式）

**jad**：`jad 类名` 把 JVM 里实际加载的那份字节码反编译出来。看"实际加载"是关键——判断你改的那行在不在，不在就说明线上没跑你的代码。

**sc -d**：`sc -d 类名` 输出类的详细信息，两个字段最有用：ClassLoader 标识（同一名类被不同 ClassLoader 加载会产生两份互不相干的 Class 对象）与代码来源（从哪个 jar 或目录加载）。同一个类名出现两个不同 ClassLoader，问题就找到了。

**sm**：`sm 类名 方法名` 看方法签名，适合确认"方法到底存不存在、参数是不是这个"——你以为调的是 A 方法、实际走的是重载的 B 方法，是签名类误判的常见形态。

**核实后的处置分叉（五步姿势）**：① `jad` 确认线上代码版本，排除"根本没生效"；② `sc -d` 检查是否多 ClassLoader；③ 若要动逻辑，先在测试环境验证 `redefine` 命令；④ 生产上只做临时止血，并记一条明确 TODO；⑤ 走正常发布覆盖掉，别让热更新变成"隐形的一版代码"。

**"改了没生效"四原因清单**（按可确认性排序）：① 发布根本没到这台机器（集群只发了一部分、灰度没覆盖到出问题的那台）；② 多 ClassLoader 加载了旧类；③ 热部署没真正生效（只重载了部分类，被引用的旧类还在）；④ 改的分支没合进去（发布 release 分支、改在 feature 分支，最常见也最容易被忽略）。前三个用命令能确认，第四个只能看发布记录。

## Relationships（关系）

### Related Concepts（相关概念）

- [[redefine-hot-reload-boundaries|redefine 热替换边界]]：本三件套是 redefine 的前置——核实版本确认"线上确实没跑新代码"之后，才轮到考虑怎么改；且"先确认再动手"的纪律同样适用。
- [[evidence-first-jvm-tuning|证据驱动的 JVM 调优]]：三件套是"先拿证据、再动手"在"改了没生效"场景的落地实例。
- [[class-loading-parent-delegation|类加载与双亲委派]]：原因②的机制背景——双亲委派被破坏的场景（SPI/Tomcat/OSGi/热部署/插件化）正是同名单被加载两份的温床。
- [[watch-trace-tt|watch/trace/tt 方法级观察三件套]]：互补而非替代——watch/trace/tt 回答"方法里发生了什么/数据对不对"（行为层），三件套回答"线上跑的是哪版代码/谁加载的"（版本与来源层）；先查版本、再查行为是完整排查顺序。

### Dependencies（依赖项）

- [[arthas|Arthas]]：三个命令的载体。

### Distinctions（区分）

- 与 [[watch-trace-tt|watch/trace/tt 方法级观察三件套]] 的区分：观察类命令基于字节码增强实时采样"行为"，三件套是"静态核实"线上实际加载的代码本体；前者用于行为异常排查，本概念用于变更生效性核实。
- 与正常发布流程的区分：三件套是排障工具，不改变"长期可靠必须走发布"的结论——核实发现问题后的终点是发布，不是绕开发布。

## Evolution（演进）

- 2026-10-31 — 信源 1（专辑《arthas使用》第 5 篇）确立三命令分工、四原因清单与五步处置姿势。
- 信源 2（同专辑第 1 篇）已先期印证：6 命令速查表中"jad/sc -d/sm 确认线上代码版本"一条，与本文三命令职责划分一致。

## Open Questions（开放问题）

- jad/sc/sm 经 MCP 调用时的参数形态与输出差异，现有信源未覆盖（MCP 实测信源仅提到"可让 AI 调 jad 反编译核对线上版本"）。
- 灰度/多集群发布下"发布没到这台机器"的自动核查手段（发布记录之外的可观测方案），现有信源未给出。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-31-arthas-05-jad-hot-reload.md`（三命令用法、四原因、五步姿势的主信源）
- Source: `raw/sources/architecture/2026-10-31-arthas-01-attach-first-conclusion.md`（互证 6 命令速查中的 jad/sc -d/sm 条目）

## Related Knowledge（相关知识）

- [[arthas|Arthas]]（实体页）
- [[redefine-hot-reload-boundaries|redefine 热替换边界]]
- [[watch-trace-tt|watch/trace/tt 方法级观察三件套]]
