---
id: wiki-source-pi-durable-architecture
type: source
title: 开源 Pi-durable：把持久化做进协议，架构是如何支持的
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - pi
  - durable-execution
  - architecture
sources:
  - raw/sources/products/2026-10-17-pi-durable-architecture.md
related:
  - wiki/concepts/durable-execution.md
  - wiki/entities/pi.md
---
# 开源 Pi-durable：把持久化做进协议，架构是如何支持的

## Overview（概览）

公众号「架构师」对 pi-durable（1.0→1.3 半个月）的架构深拆：一条"原子提交"公理、五层架构、四个存储后端、一次问答的完整持久化旅程与崩溃恢复速查表。是 [[durable-execution|持久执行]] 概念目前最详尽的实现层信源。

## Key Facts（关键事实）

- 核心公理（规格文档第 0 条）：一个 Session 原子地提交不可变条目、完整任务记录和文档，只有已提交的状态才可观察——UI 看到的一切均已落盘，无旁路内存通道。
- 存储模型：四张表（conversations / entries / tasks / submissions）+ 类型化 JSON 文档；每对话自带五文档：pi.agent（配置）、pi.live（运行态）、pi.inbox（排队输入）、pi.usage（token/花费台账）、pi.provider（UUIDv7 会话身份，跨重开/重试/压缩保住 provider 侧 prompt cache）。
- 五层架构：Storage（极简接口：写一批、按编号查）→ Session（纪律层，批量原子提交）→ Documents（底稿+增量改动）→ Tasks（每任务一个小状态机，调度器约 1950 行）→ Harness（内置 generation/tool/compaction 三任务，其余走扩展）。
- 四个官方存储后端：Memory（调试）、SQLite（Node）、JSONL（只追加流水账）、Cloudflare Durable Object（一次事务=一次提交）；带 `registerStorageConformance()` 一致性测试；1.3 起表前缀支持多存储共享库。
- Tasks 层：任务与对话组成所有权树——中止向下传（后台任务例外）、父收工先等子；热重载：旧代码跑完当前阶段、下一阶段自动换新代码；1.2 基准 500 任务连环结算 12 秒 → 50 毫秒。
- 一次 run = generation 任务链：系统提示增量 diff 成补丁条目保 prompt cache；超阻塞阈值先同步压缩、超后台阈值后台压缩；工具调用同批建 pi.tool 子任务；postTools 边界处理 steer 插话。
- 崩溃恢复语义：流式回答中断→已提交部分转 aborted、请求重发；工具副作用中→replay safe 重跑、其余合成 interrupted；已审批→memo 首写胜出不二次审批；扩展代码消失→任务阻塞不终止、装回即复活。
- 与 Pi coding agent 关系：共享 pi-ai 模型层与哲学，定位不同（终端单人编码代理 vs Agent 应用框架/library）；工具"同源契约、各自实现"，pi-durable 不依赖 coding-agent 任何包。
- 1.2 后向"工具平台"生长：工具可嵌套调工具、声明结构化输出、deferred 工具经 tool_search（BM25）按需加载、code mode 脚本本身是持久任务（重启后日志确定性重放）。
- 二开六方向：IM 常驻机器人（频道=对话、thread=fork）、长程业务编排（支付 failFast+退款清理示例，"把 Temporal 搬进 agent 框架"）、前后台子代理、人机协同审批（beforeTool+memo）、云端部署（一个 DO=一个分片）、观测审计（viewState/watchEvents/taskGraph/usage 台账）。

## Important Claims（重要论断）

### Claim 1：先写存储、后可见，是整套框架的纪律

对话转录、每次模型调用、每次工具执行、系统提示词、业务状态全部先落盘才可见；进程在任意瞬间死掉，重开同一存储即从上一检查点继续。

### Claim 2：与 Pi coding agent 互补而非替代

一个管终端内一次会话，一个管天级周级、多端多人在场的 Agent 应用；官方仓库里用 pi-durable 重建的迷你编码代理即对照（杀进程 --continue 可续跑）。

## Concepts Introduced（引入的概念）

- 原子提交公理与"已提交才可观察"（充实 [[durable-execution|持久执行]]）
- 任务所有权树（中止下传/父等子）与热重载语义

## Entities Mentioned（提及的实体）

- [[pi|Pi]]、pi-durable（框架，未单独立页，归 pi 实体）
- Temporal（类比提及）、Cloudflare Durable Objects（后端，未立页）

## Implications（影响／启示）

deferred 工具 + BM25 检索按需加载，是"工具不进系统提示词"的具体实现，回应工具描述常驻开销问题（解读）。

## Limitations（局限）

- 版本演进极快（半个月 1.0→1.3），API 细节以仓库为准；性能数字为官方基准口径。

## Related Knowledge（相关知识）

- [[durable-execution|持久执行]]
- [[pi|Pi]]
- [[pi-1-0-durable-mcp-update|Pi 1.0 与 Pi Durable（信源页）]]

## Source（信源）

- `raw/sources/products/2026-10-17-pi-durable-architecture.md`
