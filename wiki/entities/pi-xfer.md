---
id: wiki-entity-pi-xfer
type: entity
title: pi-xfer
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - entity
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md
related:
  - wiki/concepts/agent-handoff.md
  - wiki/concepts/context-management.md
  - wiki/topics/multi-agent-collaboration-architecture.md
  - wiki/sources/pi-xfer-handoff-network.md
---
# pi-xfer

## Overview（概览）

为 pi agent 开发的开源插件（xfer = transfer 的缩写），解决 Agent 时代的"上下文卫生"问题：让不同阶段的任务交给不同 Agent，像人类同事一样做正式 handoff 交接，而非压缩。插件从本地 unix socket 通讯起步，逐步长成一张多形态接入的 Agent 网络，已独立开源。

## Identity（身份信息）

- Type（类型）: 开源软件插件（pi agent 的 handoff/通讯插件）
- Organization（所属组织）: 独立开源（作者 azzgo，仓库 `github.com/azzgo/pi-xfer`）
- Role（角色）: Agent 间交接与组网工具（harness 方案）
- Status（状态）: 已开源（`pi install npm:pi-xfer`），功能持续扩展中

## Important Facts（重要事实）

- **解决的问题**：一个窗口混入多个任务导致上下文腐坏（context rot）；常规解法（summary/compaction/子代理）是压缩，pi-xfer 是"不让窗口变成池子"——任务交给不同 Agent 做正式交接。
- **handoff 协议**：投递消息只带 header（target / kind / summary），正文落成文档写到接收方 `$TMPDIR/pi-xfer-<msg_id>.md`，通知附路径；按需加载（先读协议再决定是否展开正文）；task 类 handoff 要求接收方回发 reverse handoff。
- **网络形态**（同一消息协议，多形态接入）：
  - 本地 pi 会话：`~/.pi/xfer/` 下挂 unix socket，文件名即会话名，装上即互通；`/xfer list` 看在线、`/xfer gc` 清理死 sock。
  - 其他 Agent Host（adapterd）：`xfer-adapterd` daemon 占住本地 socket + 收件箱文件，host（如 Cursor、codex）通过 skill 主动收件，网络身份与 pi 会话无异。
  - 浏览器（Web Picker）：Tampermonkey 脚本 + 本地 broker；人以 CSS 选择器/XPath 精确定位元素（Pick 走空间坐标、Record 走时间轴 + console/network 切片），broker 渲染成 handoff 投递；Agent 可 `page.request` 按选择器回查页面。
  - 跨机：SSH Link（一条 ssh 进程 `-L`/`-R` 双向转发，unix 主机通用）；Mesh（RivetKit actor 架构常驻引擎，会话注册为唯一 actor，不在线进持久队列，已验证 Cloudflare serverless 休眠节点接入）。跨机时文档内联进消息帧（`$TMPDIR` 路径对端打不开）。
- **其他功能**：board（黑板模式本地全局看板，跨项目汇总 finding）、admin（Web 管理界面）、MCP client（任意 Agent 以客户端身份查询网络并下指令，不可反向到达）。
- **设计参考**：mattpocock/skills 的 handoff skill、Tencent/BrowserSkill（Web picker 协议）；演示图由 archify 生成。

## Products / Projects（产品／项目）

- [[agent-handoff|Agent 交接（Handoff）]]（pi-xfer 是该机制的开源实现）

## Relationships（关系）

- [[agent-handoff]]（实现的机制）
- [[context-management]]（解决的问题域——上下文腐坏与压缩之外的路径）
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉]]（Handoffs 协作模式的具体实现形态）
- 相关工具（未单独立页）：pi-intercom（pi 核心贡献者的本地 broker 通讯工具）、Reason Network（泛用 agent 组网，支持多种 Code Agent）

## Timeline（时间线）

- 2026-11-12 — 经知乎文章介绍并开源（信源日期；启发自 IndyDevDan 的 Pi-to-Pi 协议与作者前作《Pi Agent：一把你完全掌控的手术刀》）

## Current Understanding（当前认知）

pi-xfer 是"以交接替代压缩"思路的完整工程实现：handoff 协议（header + 落盘文档 + 按需加载）贯穿本地、异构 host、浏览器、跨机四层接入，并已验证 Cloudflare serverless 接入。功能细节均为作者一手描述，未经独立验证（置信度中）。

## Evidence（证据）

- `raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md`
