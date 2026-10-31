---
id: wiki-source-pi-coding-agent-getting-started-guide
type: source
title: Pi 保姆级教程：7000 字手把手从 0 到 1，把扩展生态一起打通
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - ai
  - pi
  - tutorial
sources:
  - raw/sources/products/2026-10-31-pi-coding-agent-getting-started-guide.md
related:
  - wiki/entities/pi.md
  - wiki/concepts/pi-customization-layers.md
---
# Pi 保姆级教程：7000 字手把手从 0 到 1，把扩展生态一起打通

## Overview（概览）

一篇 Pi 1.4.0（Windows 视角）保姆级实战教程，七千字，覆盖安装→接模型→界面→四类资源→六件配置→五类活提示词→扩展/MCP/Skills 差异→10 个坑。以真机截图+可抄命令为主，核心提醒：默认无沙箱继承账户权限，跑真项目先 git commit。本信源的可复用知识已编译进 [[pi]] 实体页与 [[pi-customization-layers]] 概念页。

## Key Facts（关键事实）

- Pi 1.4.0 于 2026-10-21 发布（教程时点八天后）；GitHub 11.45 万星，npm 一周下载 454 万次；`pi-web-access` 1738 星、推 0.46 版。
- 安装（Windows）：官网 `curl ... | sh` 仅 macOS/Linux；Windows 走 PowerShell 安装器或 `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`（Node ≥ 22.19）；`pi update` 自更新不动 models.json/扩展列表。
- 接国内模型：`/login` 无 SiliconFlow/DeepSeek/中转站，需自写 `~/.pi/agent/models.json`（providers：name/baseUrl/`api: openai-completions`/`apiKey: $环境变量`/models）；兼容 OpenAI 协议覆盖九成中转站；`pi --list-models` 验证，128K 上下文。
- 界面口诀：斜杠管命令（/model /compact /resume /tree）、@ 管文件、感叹号管终端（!命令不经过模型）；/compact 在 1.4.0 改为按模型输出上限算。
- 四类资源（~/.pi/agent/ 下）：扩展加能力、Skills 加知识、模板加熟练、主题加好看。
- `pi install` 六源格式：`npm:@foo/bar`、`git:github.com/user/repo`（无斜杠）、`git:git@github.com:user/repo`、`https://...`、`ssh://...`、`./local/path`；`github:` 前缀报错（当本地路径）；npm 源快一个数量级。
- `pi mcp add fs -- npx -y @modelcontextprotocol/server-filesystem .`（`.`=授权目录，别给盘符根目录）；`pi mcp list` → connected + 14 tools。
- `-p`（--print）模式：一句话进一个改好的项目出，适合脚本/CI；demo expenses.csv 去重 12→11 条、4196.50→2996.50；但会造数据糊弄人（week 分组例）。
- 委派三判据：结果有客观对错 + 改动能回滚 + 两分钟能验完，三条满足才放手；写文案/定方案只能当草稿。
- 五类活提示词（各带验收话术/防幻觉边界句）：看懂陌生项目、修已知毛病、批量整理、从零造小工具、查资料落文件。
- 扩展 vs MCP vs Skills：扩展=Pi 内代码(TS)加能力、MCP=外部服务跨工具通用、Skills=说明书(Markdown)定规矩；选择：加能力先看扩展→MCP→才自写，定规矩写 Skill（详见 [[pi-customization-layers]]）。
- 10 坑速查：`github:` 前缀、`curl|sh` on Windows、Node<22.19、`/login` 找 SiliconFlow、`api` 填 `openai`、key 写死、`pi remove` Windows `[safe-delete] genie-trash ETIMEDOUT`（手动清 settings.json+node_modules）、MCP 目录给盘符根目录、未提交仓库、装一堆扩展。
- 进阶：`pi-web-access` 零配置走 Exa（可换 Brave/Tavily/博查 via `web-search.json`），能读页面/抓 PDF/克隆 GitHub 仓库；自写扩展一个文件导出函数 `registerCommand` 丢 `~/.pi/agent/extensions/`；Codemode 沙箱批量调工具压提示词四成；Pi Durable/容器化新手期别碰。

## Important Claims（重要论断）

### Claim 1：编码 agent 做错事不会停下来问你

它会给你一个看起来很像样的结果（week 分组例：把日期字符串截前七位当周，数字全错但排版漂亮）。所以每类活都得配验收话术，改完要自己跑一遍验证。

### Claim 2：委派三判据

结果有客观对错（数字/测试/返回码）+ 改动能回滚（git 提交）+ 两分钟能验完——三条满足才放手交；缺一条就盯着屏幕。无客观对错的活（写文案/定方案/判断设计好坏）只能当草稿。

### Claim 3：Skills 是普通人定制 Pi 最划算的入口

不执行代码、只改模型想法、会写 Markdown 就行；要加能力先看现成扩展，没有再看 MCP。

## Concepts Introduced（引入的概念）

- 四类资源（扩展/Skills/模板/主题）分工：见 [[pi]] 与 [[pi-customization-layers]]。
- 扩展 vs MCP vs Skills 三方对比与选择建议：见 [[pi-customization-layers]]。
- 五类活提示词范式（含防幻觉边界句）：编译进 [[pi]]。
- 委派三判据（客观对错/可回滚/可速验）：编译进 [[pi]]。

## Entities Mentioned（提及的实体）

- [[pi|Pi]]：本教程主体（1.4.0）。
- **SiliconFlow / DeepSeek**：教程接的国内模型服务商（Kimi K2.7 Code、DeepSeek V3.2）。
- **Exa / Brave / Tavily / 博查**：`pi-web-access` 可选的搜索后端。

## Implications（影响／启示）

- 提供了一套从安装到委派任务的完整操作范式，强调权限风险（默认无沙箱）与验收纪律（每类活配验收话术、改完复跑）。
- 把"该不该交给 agent"量化为三判据，为日常使用划出放手边界。

## Limitations（局限）

- Windows 视角为主（PowerShell/盘符/回收站坑）；macOS/Linux 的差异未展开。
- demo 为教学小项目（CSV 去重），真实业务复杂度更高；实测数字（12→11 条、4196.50→2996.50、1738 星、454 万下载）为教程时点值。
- Pi Durable、Codemode、容器化仅提及未深用；五类活提示词为作者个人用法，非官方。

## Related Knowledge（相关知识）

- [[pi]]
- [[pi-customization-layers]]

## Source（信源）

- `raw/sources/products/2026-10-31-pi-coding-agent-getting-started-guide.md`
