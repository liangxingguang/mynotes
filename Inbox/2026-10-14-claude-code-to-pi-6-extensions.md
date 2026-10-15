---
id: 2026-10-14-claude-code-to-pi-6-extensions
title: 从 Claude Code 搬到 Pi：装这 6 个扩展把熟悉的体验补回来
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/hniMbQDpHgbzuNQGTYJ3rA
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags: [AI, 工具, Pi]
wiki_status: pending
---

# 从 Claude Code 搬到 Pi：装这 6 个扩展把熟悉的体验补回来

> Claude Code 老用户因账号反复被封三周迁移 Pi 的实录：Pi 默认只有 read/write/edit/bash 四个工具、像毛坯房，但扩展目录有 5000+ 包，Claude Code 的核心习惯（MCP、联网、子代理、澄清提问、待办、写完诊断）基本都能一个命令装回。文章按迁移顺序给了 6 个扩展、安装命令、配置搬迁方法和三条安全原则。下载量为 2026 年 8 月 npm 月数据。

## 核心要点

1. **pi-mcp-adapter（≈原生 MCP + .mcp.json）**：`/mcp setup` 一键导入 Claude Code 的 MCP 配置、直接读 .mcp.json；用约 200 token 的代理工具替代成百上千工具定义，server 按需启动，不预烧上下文。月下载约 76 万，生态第一，迁移第一步。
2. **pi-web-access（≈WebSearch/WebFetch）**：搜索支持 20+ 服务商（内置 Exa 免 key），URL 抓取、GitHub 克隆、PDF 提取用法同 WebFetch；额外支持理解 YouTube 视频与本地录屏。月下载约 40 万。
3. **pi-subagents（≈Task 子代理/并行任务）**：大白话派活——"Use reviewer to review this diff."、"Ask oracle for a second opinion"；前台流式、后台跑完取结果，可一句话并行三个角色分别查正确性/测试/过度设计。月下载约 36 万。
4. **@juicesharp/rpiv-ask-user-question（≈AskUserQuestion）**：需求不清先弹类型化选项（选择/确认/输入），10 秒问清关键决策再动手；作者称六个里体感最接近原生，返工明显变少。月下载约 12 万。
5. **@juicesharp/rpiv-todo（≈TodoWrite/TodoRead）**：模型维护的待办实时浮层常驻终端；比原版更抗造——/reload 与上下文压缩后依然存活。月下载约 10 万，适合多步重构/迁移/长文写作。
6. **pi-lens（≈内置诊断与写完自检）**：每次写入/编辑后自动跑 LSP 诊断、lint、类型检查、格式化，可 autofix；基于 ast-grep/tree-sitter 的结构规则抓安全隐患，/lens-map 生成交互式 HTML 依赖图，诊断可标记误报/忽略/延期且跨会话生效。月下载约 6 万，TS/Python/Go 强类型项目无感切换。

## 正文

### 迁移与速查

- **搬 MCP**：装 pi-mcp-adapter 后跑 `/mcp setup` 一键导入旧配置。
- **搬资产**：开源 pi-cc-plugins 可扫描 Claude Code 插件仓的 skills、agents、MCP 配置并转成 Pi 原生格式（agents 转成 pi-subagents 可识别角色）。
- **日常命令**：`pi install` 安装、`pi -e` 临时试用不落盘、`pi list` 查看、`pi remove` 卸载、`pi update --all` 批量更新，装完 `/restart` 生效。

### 三条原则（Pi 生态全靠自装，比 CC 更重要）

1. **按需安装**：扩展越多上下文负担与安全隐患越大，"装完忘了它存在"才是好扩展。
2. **只信可信源**：扩展以完整系统权限运行，装前扫源码，项目级扩展在信任项目后才加载。
3. **善用 `pi -e`**：去留不定时临时跑一次、用完即弃。

作者结论：Pi 没想取代 Claude Code，而是把"能力清单"的决定权交还用户；6 个扩展装完，原有肌肉记忆一个没丢。

相关笔记：[[2026-10-14-pi-secondary-dev-5-layers]]（subagents 等即第 4 层 Extension 的社区产物）、[[2026-10-14-pi-school-agent-course]]、[[2026-10-14-learn-pi-agent-01-llm-to-agent]]。

## 来源

- 微信公众号：[从 Claude Code 搬到 Pi：我装了这 6 个扩展，把熟悉的体验补了回来](https://mp.weixin.qq.com/s/hniMbQDpHgbzuNQGTYJ3rA)
- 参考：Pi 官方文档 pi.dev/docs、npm 各扩展 README

## 附件

无
