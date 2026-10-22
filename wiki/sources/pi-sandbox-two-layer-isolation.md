---
id: wiki-source-pi-sandbox-two-layer-isolation
type: source
title: Pi 支持沙箱吗：从什么是沙箱，到 Pi 的两层隔离
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/agent-sandboxing.md
---
# Pi 支持沙箱吗：从什么是沙箱，到 Pi 的两层隔离

## Overview（概览）

基于 Pi 官方文档（pi.dev/docs/latest）与仓库源码（2026-10 抓取）的技术梳理：沙箱原理（能力限制、四条实现路径）与 Pi 的两层隔离——脚本级沙箱与进程级五种做法，以及各层"哪些调用真的进沙箱"的边界。

## Key Facts（关键事实）

- Pi 没有 `--sandbox` 开关；隔离改变的是"Pi 在哪跑"（进程边界/工具后端）而非"怎么跑"。Pi 默认不沙箱，工具以启动账号权限直接运行。
- 官方立场："把模型生成的命令和代码当作不可信"；"看会话、项目信任、审阅 diff 都不构成安全边界"；"整个跑在容器/虚拟机里通常是实践中最强选项"。
- 脚本级沙箱（代码执行扩展）：模型写 JS 编排工具，运行时无文件系统/网络/进程/环境变量；但脚本里调用的命令工具仍以宿主权限执行。
- 命令沙箱示例扩展：用 `sandbox-exec`（macOS）/ `bubblewrap`（Linux，经 `@anthropic-ai/sandbox-runtime`）只约束"跑命令"（含模型直调、脚本调用、用户 `!` 命令）；四类清单（禁读路径/允许写路径/禁写文件/域名白名单）；全局+项目两级配置项目优先；默认开启，`--no-sandbox` 临时关闭；读写改搜等六类文件工具完全不受约束。
- Gondolin 扩展：read/write/edit/bash/ls/find/grep 七个内置工具+用户命令挪进微虚拟机，宿主目录挂进 VM；其他扩展、MCP 工具、宿主 Pi 进程不在边界内；命令继承宿主环境变量，不是凭据边界。
- 整体隔离：Plain Docker（凭据传进容器）、Docker Sandboxes（真凭据留宿主、代理代填、"不要在沙箱里登录"）、OpenShell（策略控制凭据与推理路由）；只有整体隔离能覆盖扩展、MCP 工具与子进程。
- 用户命令拦截器出错即 fail-closed 阻断。

## Important Claims（重要论断）

### 沙箱是"能力限制"不是"行为审查"
不审查代码想干什么，只决定它能碰到什么（文件、网络、凭据、进程）；识别会漏，环境不会漏；保证的是影响范围而非绝对安全。四条实现路径（能力收窄运行时 → OS 级限制 → 命名空间隔离 → 硬件虚拟化）的共同动作都是收窄"可达面"。

### 三个"假沙箱"
项目信任（只管加载哪些项目资源）、默认工具列表（"有什么能力"而非"关在哪"）、逐步批准/看 diff（不构成边界）都不是沙箱。

### 官方自陈漏洞
读写挂载、挂载代理目录（凭据/设置/会话全交出）、环境变量传入、网络出口均可成为破口；官方承认容器有网络即无法证明 agent 代码从不用网。

## Concepts Introduced（引入的概念）

- [[agent-sandboxing|Agent 沙箱隔离]]

## Entities Mentioned（提及的实体）

- [[pi|Pi]]

## Implications（影响／启示）

- 选型顺序：先想防谁 → 再想必须暴露什么 → 最后选工具；能只读别可写，能拷进拷出别直接挂载。
- 三层可叠加（脚本层限工具可达、命令层限执行可达、整体层限一切）；想让模型触发的所有动作都在边界内只有整体隔离一条路。
- "声明一次"原则：安全不靠"每次记得"，隔离在部署期或扩展加载期声明。

## Limitations（局限）

- 事实来源为 Pi 官方文档与示例扩展源码（2026-10），示例扩展（命令沙箱、Gondolin）非核心内置能力，生产成熟度未确立。
- 单一信源（作者整理），无独立第二信源印证。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[agent-sandboxing|Agent 沙箱隔离]]
- [[pi-1-0-durable-mcp-update|Pi 1.0 与 Pi Durable（信源页）]]

## Source（信源）

- `raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md`
