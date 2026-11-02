---
id: 2026-11-02-weixin-superagent-teardown
title: 架构拆解：DeepSeek 刚发布的 Super-agent
source: 微信公众号文章（架构师 JiaGouX）
source_url: https://mp.weixin.qq.com/s/cxfdWtDRfVunY5FU75oQGA
source_type: article
platform: 微信公众号
created: 2026-11-02
category: 技术
tags:
  - AI
  - 工程实践
asset_ref: Assets/2026-11/weixin-superagent-architecture-teardown.md
wiki_status: ingested
---

# 架构拆解：DeepSeek 刚发布的 Super-agent

> 摘要：「架构师」公众号对 DeepSeek Super-agent 设计（详见 [[2026-11-02-weixin-superagent-design|库内已采集的 DeepSeek 原文]]）的独立拆解，结合公开原型 `dsh-superagent-prototype`（6337fc8）源码逐层解读：以"导出文件打不开"修复为贯穿案例，讲透 Router/Worker 两层职责、Trigger/Thread 订阅直通与批处理、Ticket/Assignment/Mandate 持久化、SQLite Store 事务先行启动、WorkerSlots 人跟进优先、observe/auto 接单模式、Inline & Spill 链式召回、Watchdog 停滞检测，以及实验数据的再解读（直通省约 27% 缓存 token，完成时间不变因 Router 未到吞吐瓶颈）。

## 核心要点

- **核心命题**：上下文需要连贯，执行需要分开；任务中途停了，两者的联系还得保留（DSH 负责执行接得上，Super-agent 记录这次执行属于哪项工作、与哪些讨论有关）
- **消息归口**：Trigger=单条环境事件，Thread=同话题/同 PR 的连续事件；首次分派由 Router 判断，Worker 订阅后同 Thread 后续消息程序直送、不再每次过模型
- **Router 批处理**：积压事件合并到下一轮一起判断；压测 1→40 条/分钟时批次 1.0→2.8、单请求 2.5s→3.9s，Prefill 并行让多读几条耗时不同比增加；单 Router 在这组负载够用，更大规模分片原文无定论
- **Ticket 持久化**：Assignment（谁执行）/ Executor Session（模型+工具）/ Mandate（接单依据范围）挂同一 Ticket；`ready` 后释放名额、Ticket 与订阅保留，跟踪 PR 关闭/合并判断任务结束
- **工程细节**：Engine 先事务写任务再启动执行器；Effects 队列失败退避重试、Outbox 记发送状态；注意平台已收到而本地未记成功时重试会重复发送；恢复前先查目录/Git/GitHub 再决定是否重做外部操作
- **等待与接单**：WorkerSlots 给人跟进留并发外额外名额且唤醒优先；observe 模式（推断任务先记录不执行）/auto（按规则评估）/人的明确请求三路径；Mandate 定范围，订阅不扩大工作范围
- **环境配合**：计算/状态/执行环境三分，引用 Anthropic Managed Agents；系统在线、任务记得住、执行环境可用需分别成立；Watchdog 检测"正在输出却无实质进展"的停滞
- **实验再解读**：p50 12.4min/p95 15.7min vs 基线 p95 29.5min（基线模型一次都没调 Subagent，改提示后才委派）；去直通 Router 决定数 +30%、缓存 token +37%（开直通省约 27%）；完成时间不变是 Router 未到吞吐瓶颈，省在推理开销

## 正文

采集说明：全文约 9600 字，完整正文见附件 asset_ref，此处为结构提要。与库内 [[2026-11-02-weixin-superagent-design|Super-agent 设计探索（DeepSeek 原文）]] 为不同信源：原文讲设计全貌，本文沿原型代码做机制级拆解，两者互补。

1. **问题场景**：群聊追加需求、GitHub 评审、CI 通知来自不同入口，系统要认得"这说的是同一件事"——Super-agent 用 Router/Worker 两层分工解决。
2. **Router 层**：维护跨渠道上下文、判断处理与归属、统一对外沟通；Worker 独立会话执行、向 Router 汇报；原型是 DSH 插件，两层都是 DSH 会话，提示词/工具/职责不同。
3. **消息路由**：程序过滤（来源/群组/身份白名单）+ 模型语义判断；Worker 订阅 Thread 后后续消息直送；订阅可多对多；Router 批处理积压事件。
4. **Ticket 生命周期**：修复任务跨多轮执行挂同一 Ticket；`ready` 释放名额等评审；SQLite Store 持久事件/关系/决定/待执行动作；Engine 事务先行；Effects/Outbox 重试与幂等注意点。
5. **上下文管理**：Inline & Spill（近期相关+摘要+对象 ID，长内容窗口外按需读）+ 链式召回（沿消息/Thread/Worker 引用找回，否则模型按旧条件继续改）。
6. **调度细节**：WorkerSlots 人跟进额外名额+优先唤醒；异步 ReAct Loop（DSH 已实现未默认开启）；observe/auto/明确请求三路径接单；"静默复现并修复"的预配置策略。
7. **在线性保障**：计算/状态/执行环境三分（引用 Anthropic Managed Agents）；本地离线时云端保任务、等上线再推进；Watchdog 检测停滞，完成与否要看测试覆盖与 PR 是否解决原问题。
8. **实验解读**：调度与协作收益（p95 29.5→15.7min）；直通省缓存 token；Router 未到吞吐瓶颈是完成时间不变的原因；判断 Router 是否需要拆分要看过滤订阅后剩余必须判断的工作量。

## 来源

- 原文：<https://mp.weixin.qq.com/s/cxfdWtDRfVunY5FU75oQGA>
- 关联：DeepSeek 原文 <https://mp.weixin.qq.com/s/zoS7GlReWPhfCjENGxXCdg>（已采集：[[2026-11-02-weixin-superagent-design]]）

## 附件

- [[Assets/2026-11/weixin-superagent-architecture-teardown.md]]
