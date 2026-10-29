---
id: wiki-concept-design-patterns-in-netty
type: concept
title: Netty 设计模式全景（源码视角的模式识别）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: medium
tags:
  - concept
  - netty
  - design-patterns
sources:
  - raw/sources/architecture/2026-10-27-netty-design-patterns.md
related:
  - wiki/entities/netty.md
  - wiki/concepts/netty-channel-pipeline.md
  - wiki/concepts/netty-channelfuture.md
  - wiki/concepts/netty-eventloop.md
  - wiki/concepts/netty-bytebuf.md
  - wiki/concepts/netty-pooled-allocator.md
  - wiki/concepts/netty-bootstrap.md
  - wiki/concepts/netty-write-flush.md
  - wiki/concepts/netty-ssl-tls.md
---
# Netty 设计模式全景（源码视角的模式识别）

## Definition（定义）

对 Netty 源码中经典设计模式落点的系统性编目：以 GoF 模式为经、Netty 类为纬，回答"每个模式在 Netty 里长什么样、解决什么工程问题"。番外篇 7 给出 10 个模式的源码级剖析与 16 模式全景表；本页将其映射到本库已有的机制概念页，作为 Netty 知识的"模式视角索引"。

## Why It Matters（为什么重要）

机制概念页回答"这个组件怎么实现"，模式视角回答"为什么这样设计"——同一套源码的两种读法。模式落点可作为记忆锚点与面试/评审话术，也揭示 Netty 的设计纪律（如无状态才单例、正交功能靠装饰器组合），这些纪律可直接迁移到自研网络层。

## Core Characteristics（核心特征）

1. **模板方法（骨架）**：`ChannelHandlerAdapter` 生命周期空实现 + `SimpleChannelInboundHandler.channelRead` 四步骨架（类型匹配 → channelRead0 → 透传 → 自动 release）——把"谁最后消费谁 release"纪律 API 化。→ [[netty-channel-pipeline]]、[[netty-bytebuf]]
2. **责任链（本质）**：Pipeline = Context 双向链表 + 头尾哨兵，入站 Head→Tail、出站 Tail→Head，Handler 握有"透传与否"的选择权，运行时动态增删。→ [[netty-channel-pipeline]]
3. **观察者（异步结果）**：`ChannelFuture.addListener` 注册回调；`DefaultPromise` 监听器懒加载、已完成立即通知、EventLoop 亲和通知。→ [[netty-channelfuture]]
4. **命令（统一调度）**：`WriteTask`/`ScheduledFutureTask`/用户任务统一封装 Runnable 入 EventLoop 的 taskQueue——IO 事件与普通任务同一执行模型。→ [[netty-eventloop]]、[[netty-write-flush]]
5. **装饰器（正交增强）**：`WrappedByteBuf` 全委托基类 + 泄漏检测/字节序/视图等独立维度子类，组合替代继承爆炸。→ [[netty-bytebuf]]
6. **策略（分发优化）**：`EventExecutorChooser` 按线程数是否 2 的幂分派位运算/取模实现。→ [[netty-eventloop]]
7. **建造者 + 工厂方法（装配）**：`ServerBootstrap` 链式 DSL；`ReflectiveChannelFactory` 缓存构造器反射建 Channel 与 Transport 解耦。→ [[netty-bootstrap]]
8. **单例（克制）**：仅无状态 Handler 标 `@Sharable` 做 INSTANCE 单例（`MqttEncoder`）；有状态共享是并发事故源。
9. **适配器（接口简约化）**：`ChannelInboundHandlerAdapter` 给全接口空实现/透传，用户只覆盖关心的方法。
10. **全景表补充**：代理（HeadContext）、组合+迭代器（CompositeByteBuf）、状态（SslHandler 握手状态机 → [[netty-ssl-tls]]）、享元（PooledByteBuf 池化复用 → [[netty-pooled-allocator]]）、中介者（Pipeline 协调）。

## Structure（结构）

模式 → Netty 落点 → 工程价值 的三元组集合；每个落点在本库有对应的源码级机制概念页承载细节，本页只做索引与设计动机归纳，不重复机制细节。

## How It Works（运作方式）

按"问题 → 模式"反向理解（信源总结）：要解耦请求处理 → 责任链；要管理异步结果 → 观察者；要支持多种 Transport → 工厂方法；要复用无状态 Handler → 单例；要统一任务调度 → 命令；要正交叠加功能 → 装饰器；要运行时选最优算法 → 策略；要复杂对象构造 DSL → 建造者。

## Relationships（关系）

### Related Concepts（相关概念）

- 全部机制落点见 Core Characteristics 各条的 `→` 映射；本页是这些概念页的模式视角汇总。

### Dependencies（依赖项）

- GoF 23 种设计模式的通用定义（外部背景知识）。

### Distinctions（区分）

- 与各机制概念页的不同：机制页讲"怎么实现"（源码细节），本页讲"为什么这样设计"（模式动机）；二者互补不替代。

## Evolution（演进）

- 2026-10-29：随番外篇 7 建立（单信源）；十大模式落点均与本库既有源码级概念页互证（同系列正篇），无冲突。

## Open Questions（开放问题）

- 全景表中代理/中介者两个模式都落在 DefaultChannelPipeline 上，划分口径（代理=HeadContext 隐藏 IO、中介者=协调 Handler）为信源一家之言，未见其他信源展开。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-27-netty-design-patterns.md`（单一自媒体教程信源；代码为教学化简化注解）

## Related Knowledge（相关知识）

- [[netty-design-patterns|番外篇 7 信源页]]
- [[netty]]（实体页）
