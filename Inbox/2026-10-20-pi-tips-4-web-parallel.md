---
id: 2026-10-20-pi-tips-4-web-parallel
title: Pi 实用技巧系列（四）：联网与并行的实战方案
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/5ZRpRUFVM3DtudXweQHCRA
source_type: link
platform: 微信
created: 2026-10-20
category: 技术
tags: [Pi, AI Coding]
asset_ref: Assets/2026/10/pi-tips-4-web-parallel.md
wiki_status: pending
---

# Pi 实用技巧系列（四）：联网与并行的实战方案

> Pi 核心只有 read/write/edit/bash 四个工具，默认离线——联网是扩展的事，这是设计立场而非缺陷。本文梳理 Pi 连接外界的四条路线：MCP（0.99 起原生内置，接外部工具/系统）、pi-web-access（联网搜索与网页抓取）、自建 Skill + CDP（Armin 的浏览器自动化路线）、pi-side-agents（子代理并行），并给出场景化选型表与安全注意事项。

## 核心要点

- **设计立场**：核心极小、扩展自由组合；MCP 客户端 0.99 起内置、1.0 补齐 OAuth，pi-mcp-adapter 桥接包已成历史
- **四条路线分工**：MCP 接可执行工具/系统（DB、API、SaaS）；pi-web-access 管查资讯读网页；自建 Skill+CDP 管真实浏览器交互（表单、截图、动态渲染）；pi-side-agents 管多任务并行
- **选型口诀**：接系统用 MCP、查信息用 web-access、控浏览器自建 CDP、并行用 side-agents，可组合（如子代理 1 联网调查 + 子代理 2 写文档）
- **Armin 的启示**：浏览器自动化不必依赖 MCP 或社区包，自建 Skill 封装 CDP/Playwright 也是正经路线，代价是开发与维护成本
- **安全红线**：扩展跑在宿主完整权限下，装社区包前必看源码——查信息类扩展不该有写文件权限；别装过多联网扩展，按需加载不占提示词缓存
- **各路线局限**：联网质量依赖底层服务且信息需自行甄别；MCP 能力取决于接入的服务器且要把关凭证授权；子代理非真进程隔离、结果整合复杂

## 正文

全文见 [[Assets/2026/10/pi-tips-4-web-parallel]]。

## 来源

[Pi 实用技巧系列（四）：联网与并行的实战方案](https://mp.weixin.qq.com/s/5ZRpRUFVM3DtudXweQHCRA)

## 附件

- [[Assets/2026/10/pi-tips-4-web-parallel]]
