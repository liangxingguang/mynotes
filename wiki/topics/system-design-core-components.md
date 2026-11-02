---
id: wiki-topic-system-design-core-components
type: topic
title: 系统设计核心组件
status: active
created: 2026-10-16
updated: 2026-11-02
confidence: medium
tags:
  - topic
  - architecture
  - system-design
sources:
  - raw/sources/architecture/2026-10-13-system-design-12-components.md
  - raw/sources/architecture/2026-11-02-accidental-cto-book.md
related:
  - wiki/sources/accidental-cto-book.md
  - wiki/concepts/architecture-tradeoff-methodology.md
---
# 系统设计核心组件

## Scope（范围）

分布式系统设计中反复出现的核心基础设施组件。当前收录 12 个组件的概念性定义（组件驱动视角），另收录《The Accidental CTO》一书的六类工程问题框架（问题驱动视角，见 [[accidental-cto-book]]），两种视角互补；各组件待专门信源补充后再拆分为独立概念页。

## Current Understanding（当前认知）

系统设计决定整体架构与组件协作方式，直接影响可扩展性、可靠性与运行效率（信源主张）。12 个核心组件及其职责：

1. **分布式消息队列**：生产者/消费者经队列中转，组件解耦、易于扩展。
2. **DNS**：将域名解析为 IP，使请求到达正确服务器。
3. **负载均衡器**：把请求分摊到多台服务器，防单点过载，故障时自动转发。
4. **分布式缓存**：热点数据存内存，降低数据库压力、缩短响应时间。
5. **数据库**：关系型（表结构）与文档型（类 JSON）按数据特点选型。
6. **分布式任务调度器**：统一定时调度多机任务（报表、清理、同步），带故障恢复。
7. **可观测性**：通过指标、日志、链路追踪掌握运行状态、定位瓶颈。
8. **非结构化数据存储**：图片/视频/文档等用 BLOB 存储，弹性扩展、成本低。
9. **扩展服务**：垂直扩展（升配）与水平扩展（加机器）应对流量增长。
10. **发布-订阅（Pub-Sub）**：按主题异步收发消息，服务间无需互相感知。
11. **唯一 ID 生成器**：分布式环境下全局唯一标识，避免多机生成重复冲突。
12. **限流**：限制单位时间请求数，防滥用与过载，保障系统稳定。

（解读）可按职能归为四组：**流量入口**（DNS、负载均衡、限流）、**数据与状态**（数据库、缓存、非结构化存储、唯一 ID 生成）、**异步与解耦**（消息队列、发布-订阅、任务调度）、**运维与演进**（可观测性、扩展服务）。

## Key Concepts（关键概念）

- 当前 12 个组件均未达到独立概念页的建页标准（仅有概念性定义，无承重细节）；待后续信源补充后拆分。

## Key Entities（关键实体）

- 暂无独立实体页。

## Important Decisions（重要决策）

- 暂无。

## Major Developments（重大进展）

- 2026-11-02 — 新增问题驱动视角信源《The Accidental CTO》（[[accidental-cto-book]]）：按六类工程问题组织系统设计内容（架构扩展/数据层设计/异步架构/可观测性/系统韧性/成本优化）。与本页组件驱动视角互补——组件清单回答"系统里有什么"，问题框架回答"成长中会遇到什么、怎么应对"；其核心观点"架构在业务增长、故障与成本约束中演化"为本页清单补充了演进语境（书籍内容未经原书核验，confidence 中）。

## Disagreements（分歧）

- 暂无。

## Open Questions（开放问题）

- 各组件的主流实现与选型对比（如消息队列 Kafka vs RabbitMQ、缓存 Redis vs Memcached）：当前信源未确立。

## Related Topics（相关主题）

- [[accidental-cto-book|微博推荐：《The Accidental CTO》——创业公司 CTO 的系统架构实战手册]]（问题驱动视角互补）
- [[architecture-tradeoff-methodology|架构取舍方法论]]（架构演化的方法论注脚）

## Evidence（证据）

- `raw/sources/architecture/2026-10-13-system-design-12-components.md`
- `raw/sources/architecture/2026-11-02-accidental-cto-book.md`（问题驱动六类框架：架构扩展/数据层设计/异步架构/可观测性/系统韧性/成本优化）
- 信源页：[[system-design-12-components|一次讲清 12 个系统设计核心组件]]
- 信源页：[[accidental-cto-book|微博推荐：《The Accidental CTO》——创业公司 CTO 的系统架构实战手册]]
