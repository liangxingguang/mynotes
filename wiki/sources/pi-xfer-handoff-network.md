---
id: wiki-source-pi-xfer-handoff-network
type: source
title: 我给 pi 做了一个交接工具，后来它长成了一张网络（知乎）
status: active
created: 2026-11-12
updated: 2026-11-12
confidence: medium
tags:
  - source
  - ai-agent
  - harness
sources:
  - raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md
related:
  - wiki/entities/pi-xfer.md
  - wiki/concepts/agent-handoff.md
  - wiki/concepts/context-management.md
  - wiki/topics/multi-agent-collaboration-architecture.md
---
# 我给 pi 做了一个交接工具，后来它长成了一张网络（知乎）

## Overview（概览）

知乎文章（2026-11-12 采集）。作者为 pi agent 开发并开源的插件 pi-xfer（xfer = transfer）：解决 Agent 时代的"上下文卫生"问题——一个窗口混入多个任务会上下文腐坏（context rot），常规解法是压缩，pi-xfer 走另一条路：让不同阶段的任务交给不同 Agent，像人类同事一样做正式 handoff 交接。插件从本地 unix socket 通讯起步，逐步长成一张多形态接入（本地/其他 Agent host/浏览器/跨机）的 Agent 网络。

## Key Facts（关键事实）

- 仓库：`github.com/azzgo/pi-xfer`，安装：`pi install npm:pi-xfer`。
- handoff 消息体只带 header（target / kind / summary），正文落成文档写到接收方 `$TMPDIR/pi-xfer-<msg_id>.md`，通知附路径，按需加载（先读协议再决定是否展开正文）。
- 本地通讯：pi 启动时在 `~/.pi/xfer/` 挂 unix socket，文件名即会话名，装上即互相通信；`/xfer list` 看在线、`/xfer gc` 清理死 sock。
- 其他 Agent Host（adapterd）：本地 daemon 占住 socket + 收件箱文件，host 通过 skill 主动收件，接入后身份与 pi 会话无异。
- Web Picker：以人为中心由人筛选，CSS 选择器/XPath 精确定位元素灌进 Agent 上下文；Pick（空间坐标）与 Record（时间轴 + console/network 切片）两条路，broker 渲染成 handoff 投递，Agent 可 `page.request` 回查。
- 跨机通讯：SSH Link（一条 ssh 进程 `-L`/`-R` 双向转发）与 Mesh（RivetKit actor 架构常驻引擎，会话注册为唯一 actor，不在线进持久队列，已验证 Cloudflare serverless 接入）；跨机时文档内联进消息帧。
- 其他功能：board（黑板模式本地全局看板）、admin（Web 管理界面）、MCP client（任意 Agent 以客户端身份查询网络并下指令，不可反向到达）。
- 相关生态：pi-intercom（pi 核心贡献者的本地 broker 通讯工具）、Reason Network（泛用 agent 组网，支持多种 Code Agent）。

## Important Claims（重要论断）

### Claim 1：Agent 时代的瓶颈不是模型能力，是上下文卫生

一个窗口从"一个问题的容器"变成"多个问题共用的池子"即上下文腐坏；压缩（summary/compaction/子代理）是"把水澄清"，handoff 是"不让窗口变成池子"（信源观点）。

### Claim 2：浏览器场景的关键是信息指向性

Agent 用自然语言自行摸索页面信息效果差（"信息指向性差"），应以人为中心、由人用精确选择器把页面数据灌进 Agent 上下文（信源观点，作者经验总结）。

## Concepts Introduced（引入的概念）

- [[agent-handoff|Agent 交接（Handoff）]]
- [[context-management|上下文管理]]（context rot 问题与压缩之外的 handoff 路径）

## Entities Mentioned（提及的实体）

- [[pi-xfer]]（本信源主角）
- pi、Cursor、codex、RivetKit、Cloudflare（未单独立页）

## Implications（影响／启示）

为多 Agent 协作提供"交接"这一具体机制与网络形态参照：handoff 不是聊天记录复制粘贴，而是附材料的正式交接；同一套消息协议可经 socket、adapter、浏览器、跨机隧道多形态接入（解读）。

## Limitations（局限）

- 单信源（作者自述文章），功能细节未经独立验证；性能与生产实践数据未提供。
- Web Picker、Mesh 等部分功能描述为作者一手说明，未核验实现。

## Related Knowledge（相关知识）

- [[pi-xfer]]（pi-xfer 实体页）
- [[agent-handoff]]（Agent 交接概念页）
- [[context-management]]（上下文腐坏与压缩手段）
- [[multi-agent-collaboration-architecture|多 Agent 协作架构与控制权下沉]]（Handoffs 协作模式的具体实现）

## Source（信源）

- `raw/sources/ai/2026-11-12-pi-xfer-handoff-network.md`
