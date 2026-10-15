---
id: 2026-10-14-pi-setup-mcp-codemode-guide
title: Pi Agent 入门指南：安装 + MCP + Codemode
source: 宇辰AI编程（微信公众号）
source_url: https://mp.weixin.qq.com/s/k0SlcxzvHf0QMLd8Qa83Bw
source_type: article
platform: 微信公众号
created: 2026-10-14
category: 技术
tags: [AI, 工具, Pi]
wiki_status: pending
---

# Pi Agent 入门指南：安装 + MCP + Codemode

> Pi 0.99.1 实操指南（模型 GLM-5.3/GPT-5.5，MCP 用 context7/brave-search/magpie-image）。核心结论：接了 MCP 就自动开启 Codemode，无需改 settings.json；它稳定省的是工具说明的固定开销（11 个工具实测 12,878→6,956 token），但单次任务省不省取决于 MCP 返回格式与模型第一次猜得准不准。

## 核心要点

1. **Pi 是什么**：Mario Zechner 的极简终端 Agent，默认仅 read/bash/edit/write 四工具，其余靠装；会话是一棵树可分叉/fork；读 AGENTS.md 也认 CLAUDE.md。适合想自己拼 agent、在意 token、多家模型混用的人；不适合求开箱即用、要每步确认的人（默认不问、无沙箱，建议容器内跑）。
2. **0.99 更新**：Codemode+内置 MCP、system 主题、ChatGPT 订阅登录、虚拟模型（按请求分发不同模型分别计费）、分类模型。Pi 原官网写"No MCP"（Playwright MCP 21 工具光说明 1.37 万 token），0.99 把 MCP 藏到 Codemode 后面（Flask 作者 Armin Ronacher 的 PR）。
3. **接 MCP**：配置 `~/.pi/agent/mcp.json`，格式同 Claude Code 可直接复制；支持 HTTP/npx/本地程序三种，`pi mcp add` 添加、`pi mcp list` 验连、/mcp 图形管理、/reload 生效。
4. **Codemode**：模型写 JavaScript 在沙箱里串调工具（并行、循环、过滤），只有脚本 text() 输出回模型（brave 2.7 万字符筛成 7,722）。接 MCP 即自动开；单项 inlineBudget 默认 3000 token 列工具声明，装不下用 searchTools。
5. **实测**：固定开销 direct 12,878 / codemode 6,956 / codemode-deferred 4,170 / deferred 1,780 / 不接 1,453。真实任务 brave 搜索 GLM 省 39%、GPT-5.5 反多 63%，context7 两模型仅省 8%~9%；同一任务三次跑差 6 倍（2.1 万~12.3 万 token），非结构化返回要试错猜格式。
6. **五档 exposure**：codemode（默认）/codemode-deferred（不列声明）/deferred（搜到才直连，最省但多一轮）/direct/hidden，单工具可用 toolExposure 覆盖。工具多常用保持默认，偶尔用选 deferred 系。
7. **五个习惯**：/tree+/fork 用会话树；`!cmd` 输出进上下文、`!!cmd` 不进；主动 `/compact 保留目标、改过的文件、下一步`；AGENTS.md 只放长期规则（另有 override/SYSTEM/APPEND_SYSTEM）；重复流程让 Pi 整理成 Skill。
8. **六个坑**：多工具服务别整组 direct（附 TS 声明后 brave 固定开销冲到 37,922）；npx 起的 MCP 10 秒连不上则首轮不可见，用前先 list；直连结果超 20KB 被截中段要再 read；`--tools` 不认 +codemode；pi-mcp-adapter 会让内置 MCP 失效需先删；context-mode 别用 npm -g 装（污染 ~/.claude 配置）且实测更费 token，有 Codemode 不必装。

## 正文

### 安装

`curl -fsSL https://pi.dev/install.sh | sh`，或 npm（需 Node ≥ 22.19）`npm install -g --ignore-scripts @earendil-works/pi-coding-agent`，进项目目录 `pi` 后 /login 接模型；五种用法（交互、-p 打印、--mode json、--mode rpc、TS SDK）共用同一套 agent 与会话。

### MCP 三种接法与 Codemode 实例

HTTP 给地址（context7）、npx 现拉（brave-search，环境变量引用 key）、本地程序写全路径（magpie-image）。Codemode 示例任务"brave 搜 20 条挑最相关 5 条"：模型最终写出的脚本调 brave_web_search 拿 20 条→逐个解析 content 里的 JSON 文本块→只保留 title/url/desc→text() 交回；但第一次见 brave 时先 searchTools、猜错 structuredContent 结构、打印键名、逐块解析，7 个脚本才写对。

### 选型建议

作者本人 Claude Code 当主力、Pi 挂 magpie 跑国产模型并行使用；已在用 Claude Code 的不必急着换，先当第二个 agent 试。MCP 档位按"工具数量×使用频率×返回格式"选，追求固定开销最低可用 deferred，但代价是每任务多一轮搜索。

相关笔记：[[2026-10-14-claude-code-to-pi-6-extensions]]（迁移扩展清单）、[[2026-10-14-pi-secondary-dev-5-layers]]（五层定制）、[[2026-10-14-learn-pi-agent-01-llm-to-agent]]（Agent Loop 原理）、[[2026-10-14-pi-school-agent-course]]。

## 来源

- 微信公众号 · 宇辰AI编程：[Pi Agent 入门指南：安装 + MCP + Codemode](https://mp.weixin.qq.com/s/k0SlcxzvHf0QMLd8Qa83Bw)

## 附件

无
