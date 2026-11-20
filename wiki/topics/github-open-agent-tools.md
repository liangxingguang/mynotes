---
id: wiki-topic-github-open-agent-tools
type: topic
title: GitHub 开源 Skill/Agent 工具盘点
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - topic
  - github
  - agent
sources:
  - raw/sources/ai/2026-11-20-weibo-github-open-skills.md
  - raw/sources/ai/2026-11-20-agent-skills-top30.md
related:
  - wiki/sources/2026-11-20-weibo-github-open-skills.md
  - wiki/sources/2026-11-20-weixin-agent-skills-top30.md
  - wiki/concepts/claude-skills.md
---
# GitHub 开源 Skill/Agent 工具盘点

## Scope（范围）

本主题收录 GitHub 开源 Skill/Agent 工具的盘点信源，当前两条：

1. **2026-11-20 微博盘点**（5 个实用工具，口径=无云端、可直接上手）：本地视频剪辑、Office 能力、网页搜索与爬取、软件 CLI 化、小模型训练。每项工具独立成实体页。
2. **2026-11-20 微信公众号 star 排序清单**（30 个 Agent Skills，口径=star 数共识）：覆盖代码开发、文档办公、设计多媒体、效率工具、数据五组。30 项均为单信源一句话描述，证据不足以独立实体页，以表格形式收录于本页。

## Current Understanding（当前认知）

- 微博盘点的选型口径为无云端、无 API Key、可直接上手，工具面向 Claude Code / Cursor / Codex 等主流 agent（5 项均为微博单信源，细节未经仓库核验）。
- 微信 star 排序清单显示 Skills 生态已从「有没有」进入「装哪个」阶段：头部三名断层领先（Superpowers 311,254、Matt Pocock Skills 310,242、ECC 295,677，均为 2026-11-03 实测、单一信源未核验），第四名掉到 18 万量级；目录型仓库（awesome 系列）成为选型入口（同为微信单信源）。
- 两条盘点口径互补：一条按「实用场景」选 5 件，一条按「star 共识」选 30 件；均未经仓库交叉核验（confidence: medium）。

## Key Concepts（关键概念）

- [[claude-skills|Claude Skills]]：Skill 是 agent 能力的可复用资产形态；微信清单是该生态按 star 排序的挑选全景。
- [[mcp|MCP]]：ffmpeg-skill 以 MCP 形式暴露工具。

## Key Entities（关键实体）

- [[ffmpeg-skill]]：本地 FFmpeg 视频编辑 skill（42 个工具 + MCP，无云端）
- [[univer]]：可嵌入产品的 Office SDK（编辑/计算/协作/文件处理，面向人与 AI agent）
- [[firecrawl]]：agent 网页搜索与爬取基础设施（号称 550+ 数据源）
- [[cli-anything]]：任意软件转 agent 可调用 CLI（配套 CLI-Hub 统一入口）
- [[minimind]]：从零训练 64M 参数小模型的完整教程与代码（两小时跑通）

### star 排序头部三名（微信清单，未立实体页）

| Skill | 仓库 | star（2026-11-03 实测） | 一句话价值 |
|---|---|---|---|
| Superpowers | `obra/superpowers` | 311,254 | TDD 七步方法论，逼 Agent 先计划再写代码 |
| Matt Pocock Skills | `mattpocock/skills` | 310,242 | grill-me/tdd/code-review，日常提效直接套 |
| ECC | `affaan-m/ECC` | 295,677 | 71 agents + 314 skills 带安全扫描，工程基建开箱即用 |

## 微信清单：30 个 Agent Skills 分组速览

> 来源：`raw/sources/ai/2026-11-20-agent-skills-top30.md`。star 为 2026-11-03 实测（标「约」者为 10-30 第三方盘点），「仓库共享」指共享 `anthropics/skills` 仓库（186,776 star）。

### 代码开发组（9 个）

| Skill | 仓库 | star | 替你省什么 |
|---|---|---|---|
| Superpowers | obra/superpowers | 311,254 | TDD 七步方法论，省返工 |
| Matt Pocock Skills | mattpocock/skills | 310,242 | 日常提效直接套 |
| ECC | affaan-m/ECC | 295,677 | 工程体系开箱即有 |
| mcp-builder | anthropics/skills | 186,776（仓库共享） | MCP Server 照脚手架填 |
| webapp-testing | anthropics/skills | 186,776（仓库共享） | Playwright E2E 按套路写 |
| gstack | garrytan/gstack | 138,683 | 23 件套虚拟工程团队 |
| GSD | open-gsd/gsd-core | 64,169（原库已归档） | spec 先行，返工少一半 |
| Trail of Bits Skills | trailofbits/skills | 7,965 | 安全审计公司规则直接拿 |
| superpowers-lab | obra/superpowers-lab | 435 | 实验性技能尝鲜 |

### 文档办公组（6 个）

| Skill | 仓库 | star | 替你省什么 |
|---|---|---|---|
| Document Skills | anthropics/skills | 186,776（仓库共享） | docx/pdf/pptx/xlsx 四件套（source-available 非开源） |
| skill-creator | anthropics/skills | 186,776（仓库共享） | 写新 Skill 不用啃规范 |
| internal-comms | anthropics/skills | 186,776（仓库共享） | 周报/Newsletter/FAQ 按模板写 |
| brand-guidelines | anthropics/skills | 186,776（仓库共享） | 对外文档口径有人管 |
| Skill_Seekers | yusufkaraaslan/Skill_Seekers | 15,266 | 文档站/PDF 一键转 Skills |
| Claude-Command-Suite | qdhenry/Claude-Command-Suite | 1,350 | 216 命令+12 Skills 不用记 |

### 设计多媒体组（6 个，全 Anthropic 官方出品）

| Skill | 仓库 | star | 替你省什么 |
|---|---|---|---|
| frontend-design | anthropics/skills | 186,776（仓库共享） | 专治 AI 味界面 |
| web-artifacts-builder | anthropics/skills | 186,776（仓库共享） | React+Tailwind 复杂 Artifact 一次成型 |
| canvas-design | anthropics/skills | 186,776（仓库共享） | PNG/PDF 视觉设计不用开 PS |
| algorithmic-art | anthropics/skills | 186,776（仓库共享） | p5.js 生成艺术配图有路子 |
| theme-factory | anthropics/skills | 186,776（仓库共享） | Artifact 主题定制风格统一 |
| slack-gif-creator | anthropics/skills | 186,776（仓库共享） | Slack 尺寸优化 GIF 一次到位 |

### 效率工具组（8 个，目录型为主）

| Skill | 仓库 | star | 替你省什么 |
|---|---|---|---|
| awesome-claude-skills | ComposioHQ/awesome-claude-skills | 约 78,000（10-30 盘点） | 200 条集成类 Skills 目录 |
| awesome-claude-code | hesreallyhim/awesome-claude-code | 57,127 | 社区精选资源目录，生态入口 |
| claude-plugins-official | anthropics/claude-plugins-official | 约 45,000（10-30 盘点） | 官方插件目录，认准官方源 |
| awesome-agent-skills | VoltAgent/awesome-agent-skills | 36,773 | 1000+ Skills，含 Google/Stripe 出品 |
| claude-skills | alirezarezvani/claude-skills | 约 29,000（10-30 盘点） | 401 个跨职能合集 |
| awesome-claude-skills | travisvn/awesome-claude-skills | 15,679 | 新手友好精选 |
| commands | wshobson/agents | 2,640（原库已归档） | 57 个 slash 命令一键直达 |
| claude-code-settings | feiskyer/claude-code-settings | 1,670 | 中文友好包，中文场景开箱即用 |

### 数据组（1 个）

| Skill | 仓库 | star | 替你省什么 |
|---|---|---|---|
| 数据类官方 Skills | VoltAgent/awesome-agent-skills | 36,773（合集） | Tinybird/ClickHouse/DuckDB/MongoDB/Redis 查数不用写连接代码 |

安装三法：插件市场（`/plugin marketplace add`）/ npx 直装（`npx skills add`）/ 手动 git clone。

## Important Decisions（重要决策）

（无——盘点帖不涉及决策记录）

## Major Developments（重大进展）

- 2026-11-20 — 微博博主盘点 5 个 GitHub 热榜开源 Skill/Agent 工具（采集日）。
- 2026-11-20 — 微信公众号「探员」按 star 排序排出 30 个 Agent Skills 挑选清单（star 实测日 2026-11-03，采集日 2026-11-20）。

## Disagreements（分歧）

（无——两条盘点口径互补，未发现相互矛盾的断言）

## Open Questions（开放问题）

- 各 Skill 的 star 数、仓库地址与维护状态需与官方仓库交叉核验；12 项共享 `anthropics/skills` 仓库，star 数无法按单项归属。
- firecrawl「550+ 数据源」的说法未经证实。
- star 为 2026-11-03 时点数据且每天在涨，清单排名的时效性有限。

## Related Topics（相关主题）

（暂无）
