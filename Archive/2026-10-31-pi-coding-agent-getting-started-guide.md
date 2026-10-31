---
id: 2026-10-31-pi-coding-agent-getting-started-guide
title: Pi 保姆级教程：7000 字手把手从 0 到 1，把扩展生态一起打通
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/jLDgnYOymoIjrZTduazyyg
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - 工具
  - AI
asset_ref: Assets/2026/10/pi-coding-agent-getting-started-guide.md
wiki_status: ingested
---

# Pi 保姆级教程：7000 字手把手从 0 到 1，把扩展生态一起打通

> 摘要：Pi（pi-coding-agent）1.4.0 保姆级实战教程（Windows 视角）。从两条安装路径（PowerShell / npm，Node ≥ 22.19）、自写 `~/.pi/agent/models.json` 接国内模型（SiliconFlow/DeepSeek/中转站，`api` 填 `openai-completions`）、界面三区与斜杠/@/感叹号口诀，到四类资源（扩展加能力、Skills 加知识、模板加熟练、主题加好看）、`-p` 批处理模式、五类任务提示词（每类带验收话术）、扩展 vs MCP vs Skills 差异、10 个踩坑速查。核心提醒：默认无沙箱继承账户权限，跑真项目先 git commit。

## 核心要点

- **安装**：Windows 别用 `curl | sh`（那是 macOS/Linux），走 PowerShell 安装器或 `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`（Node ≥ 22.19）；公司电脑限制全局安装时装到固定目录加 PATH，网络卡换 npmmirror 镜像；`pi update` 自更新不动配置。
- **接模型**：`/login` 里没有国内服务商，需自写 `~/.pi/agent/models.json`——provider 里 `name`/`baseUrl`/`api`（照抄 `openai-completions`）/`apiKey`（用 `$环境变量` 形式，key 不进文件）/`models` 数组；兼容 OpenAI 协议即可接九成中转站；`pi --list-models` 验证。
- **界面口诀**：斜杠管命令（`/model`、`/compact`、`/resume`、`/tree`），@ 管文件，感叹号管终端（`!命令` 不经过模型直跑）。首次启动的"当前目录信任"只对自己可控目录点。
- **权限是最大风险**：Pi 默认继承当前 Windows 账户权限、没有沙箱，能删文件改注册表；陌生任务先进空目录试，真项目先 `git commit`；收紧用 `--tools read,edit` 或容器化。
- **四类资源**：扩展（代码，加工具改行为）、Skills（说明书，只改模型想法，Markdown 门槛最低）、提示词模板、主题；扩展多了工具描述占 token，只留真在用的。
- **六件事**：`pi install` 六种源格式（`npm:` 最快、`git:github.com/user/repo` 直接跟域名没斜杠）；`pi mcp add fs -- npx ... .` 接 MCP 只授权项目目录；`-p` 模式一句话进一个改好的项目出（适合脚本/CI），但会自己造数据糊弄人；`pi --continue/--resume/--fork` 接断会话。
- **五类活提示词**（每类带验收话术）：看懂陌生项目（点名文件必须真实存在）、修已知毛病（不许改测试文件）、批量整理（先计划后确认再执行）、从零造小工具（只用标准库、看 import）、查资料落文件（查不到写"未查到"，防编来源）。
- **扩展 vs MCP vs Skills**：扩展是 Pi 内代码（TS）、MCP 是外部服务（跨工具通用）、Skills 是说明书（Markdown，普通人定制最划算入口）；要加能力先看现成扩展，没有再看 MCP。
- **10 个坑速查**：`github:` 前缀报错、Node 低报权限状错、api 写成 `openai`、key 写死传群、`pi remove` 删不干净手动清 settings.json、MCP 目录给盘符根目录等。

## 正文

进阶部分：Pi 本身不联网，装 `pi-web-access`（1738 星）零配置走 Exa 公共服务，可换 Brave/Tavily/博查；还能读页面、抓 PDF、克隆 GitHub 仓库。自写扩展门槛低：一个文件导出函数注册命令丢进 `~/.pi/agent/extensions/` 重启即用。未深用三样：Pi Durable（断点续跑/协作）、Codemode（沙箱批量调工具压提示词四成）、容器化。

判断该不该交给它：结果有客观对错 + 改动能回滚 + 两分钟能验完，三条满足才放手；写文案定方案这类无客观对错的只能当草稿。

## 来源

- 原文：https://mp.weixin.qq.com/s/jLDgnYOymoIjrZTduazyyg
- 抓取方式：web-fetch（Playwright 渲染，17,788 字符）

## 附件

- [[Assets/2026/10/pi-coding-agent-getting-started-guide.md]]（抓取正文）
