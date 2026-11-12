---
id: 2026-11-12-pi-xfer-handoff-network
title: 我给 pi 做了一个交接工具，后来它长成了一张网络
source: 知乎
source_url: https://zhuanlan.zhihu.com/p/2097748041361012308
source_type: link
platform: 知乎
created: 2026-11-12
category: 技术
tags: [Agent, AI]
asset_ref: Assets/2026/11/pi-xfer-handoff-network.md
wiki_status: ingested
---

# 我给 pi 做了一个交接工具，后来它长成了一张网络

> 作者为 pi agent 开发的开源插件 pi-xfer（xfer = transfer）：解决 Agent 时代的"上下文卫生"问题——一个窗口混入多个任务会上下文腐坏，常规解法是压缩，pi-xfer 则走另一条路：让不同阶段的任务交给不同 Agent，像人类同事一样做正式 handoff 交接。插件从本地 unix socket 通讯起步，逐步长成一张多形态接入的 Agent 网络，已开源。

## 核心要点

- **问题**：一个窗口从"一个问题的容器"变成"多个问题共用的池子"，出现上下文腐坏（context rot）；Agent 时代的瓶颈不是模型能力，而是上下文卫生。常规思路（summary / compaction / 子代理）是"把水澄清"，pi-xfer 的思路是"不让窗口变成池子"——任务交给不同 Agent，做正式交接。
- **handoff 设计**：投递时消息只带 header（target / kind / summary），正文落为文档写到接收方 `$TMPDIR`，通知附路径；按需加载，先读协议再决定是否展开正文，与 skill 渐进式加载思路一致。
- **本地通讯**：pi 启动时在 `~/.pi/xfer/` 挂 unix socket，文件名即会话名，装上即互相通信，无需预连接；`/xfer list` 看在线、`/xfer gc` 清理死 sock。
- **其他 Agent Host（adapterd）**：让 Cursor、codex 等同机 code agent 伪装成 pi-xfer 本地节点——本地 daemon 占住 socket + 收件箱文件，host 通过 skill 主动收件，接入后身份与 pi 会话无异。
- **Web Picker（浏览器接入）**：以人为中心由人筛选，用 CSS 选择器/XPath 精确定位元素灌进 Agent 上下文（而非让 Agent 用自然语言自行摸索，信息指向性差）；Pick（空间坐标）与 Record（时间轴+console/network 切片）两条路，broker 渲染成 handoff 投递，Agent 可 `page.request` 回查页面。
- **跨机通讯**：跨机时文档内联进消息帧（`$TMPDIR` 路径对端打不开）；两种方案——SSH Link（一条 ssh 进程 `-L`/`-R` 双向转发，unix 主机通用）与 Mesh（RivetKit actor 架构常驻引擎，会话注册为唯一 actor，不在线进持久队列，支持休眠节点，已验证 Cloudflare serverless 接入）。
- **其他功能**：board（黑板模式的本地全局看板，跨项目汇总 finding）、admin（Web 管理界面）、MCP client（任意 Agent 以客户端身份查询网络并下指令，不可反向到达）。
- **相关生态**：pi-intercom（pi 核心贡献者的本地 broker 通讯工具）、Reason Network（泛用 agent 组网，支持多种 Code Agent）；仓库 `github.com/azzgo/pi-xfer`，`pi install npm:pi-xfer`。

## 正文

完整正文见采集稿：[[Assets/2026/11/pi-xfer-handoff-network.md]]（含 handoff 消息样例、六张架构图说明、adapterd / Web Picker / SSH Link / Mesh 各层实现细节与相关链接）。

## 来源

https://zhuanlan.zhihu.com/p/2097748041361012308

## 附件

[[Assets/2026/11/pi-xfer-handoff-network.md]]
