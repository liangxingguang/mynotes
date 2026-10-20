---
id: wiki-source-pi-6-extensions
type: source
title: 从 Claude Code 搬到 Pi：我装了这 6 个扩展，把熟悉的体验补了回来
status: active
created: 2026-10-20
updated: 2026-10-20
confidence: medium
tags:
  - source
  - ai-agent
  - cli
  - extensions
sources:
  - raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/mcp.md
---
# 从 Claude Code 搬到 Pi：我装了这 6 个扩展，把熟悉的体验补了回来

## Overview（概览）

一位 Claude Code 老用户因账号反复被封，用三周时间把日常工作流整体迁移到 [[pi]] 的实录。Pi 默认只有 read/write/edit/bash 四个工具，作者按迁移顺序选出 6 个扩展，把 Claude Code 的核心体验（MCP、联网、子代理、澄清提问、待办、写完诊断）逐项补回，并给出配置搬迁方法与三条安全原则。

## Key Facts（关键事实）

- Pi 默认工具列表只有 read、write、edit、bash 四个；其扩展目录有 5000+ 个包。
- 6 个扩展与月下载量（2026 年 8 月 npm 月数据）：pi-mcp-adapter 约 76 万（全生态第一）、pi-web-access 约 40 万、pi-subagents 约 36 万、@juicesharp/rpiv-ask-user-question 约 12 万、@juicesharp/rpiv-todo 约 10 万、pi-lens 约 6 万。
- pi-mcp-adapter 用约 200 token 的代理工具替代成百上千个工具定义，server 按需启动；`/mcp setup` 可一键导入 Claude Code 的 MCP 配置并直接读 `.mcp.json`。
- pi-web-access 搜索支持 20+ 服务商（内置 Exa 免 API key），额外支持理解 YouTube 视频与本地录屏（Claude Code 没有的能力）。
- rpiv-todo 的待办浮层在 `/reload` 与上下文压缩后依然存活。
- pi-lens 在每次写入/编辑后自动跑 LSP 诊断、lint、类型检查与格式化；基于 ast-grep/tree-sitter 的结构规则抓安全隐患；`/lens-map` 生成交互式 HTML 依赖图。
- 开源 pi-cc-plugins 可扫描 Claude Code 插件仓的 skills、agents、MCP 配置并转成 Pi 原生格式（agents 转成 pi-subagents 可识别角色）。
- 日常命令：`pi install` 安装、`pi -e` 临时试用不落盘、`pi list` 查看、`pi remove` 卸载、`pi update --all` 批量更新，装完 `/restart` 生效。

## Important Claims（重要论断）

### Claim 1：Pi 的生态模式是"毛坯房 + 自装扩展"

Pi 没有想取代 Claude Code，而是把"能力清单"的决定权交还给用户；能力靠扩展目录按需装回。

### Claim 2：扩展自装模式下安全原则比 Claude Code 更重要

三条原则：按需安装（扩展越多上下文负担与安全隐患越大）；只信可信源（扩展以完整系统权限运行，装前扫源码，项目级扩展在信任项目后才加载）；善用 `pi -e` 临时试用。

### Claim 3：6 个扩展装完后 Claude Code 的肌肉记忆"一个没丢"

作者自称迁移三周内返工明显变少，其中 rpiv-ask-user-question 体感最接近原生。

## Concepts Introduced（引入的概念）

- Pi 扩展生态（npm 分发、`pi install` 安装机制）
- 代理式 MCP 接入（约 200 token 代理工具替代全量工具定义，关联 [[mcp]]）

## Entities Mentioned（提及的实体）

- [[pi]]（Pi，极简 Agent CLI）
- Claude Code（Anthropic 的 Agent CLI，迁移对照方，未单独立页）

## Implications（影响／启示）

对考虑从 Claude Code 迁移到 Pi 的用户，该文提供了一份可照抄的最小扩展清单与配置搬迁路径；pi-mcp-adapter 的代理式设计说明 MCP 工具定义对上下文的占用可以被大幅压缩（解读：这对所有 MCP 客户端的上下文管理都有参考价值）。

## Limitations（局限）

- 单一作者的三周个人经验，无 benchmark 对照；扩展质量与安全结论依赖作者主观判断。
- 下载量为 2026 年 8 月单月的 npm 数据，会过时。
- 信源为微信公众号评论性文章（三次信源），扩展能力描述未与官方文档逐条核对。

## Related Knowledge（相关知识）

- [[pi]]
- [[mcp]]

## Source（信源）

- `raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md`
