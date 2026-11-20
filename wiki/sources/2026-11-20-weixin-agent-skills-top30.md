---
id: wiki-source-weixin-agent-skills-top30
type: source
title: 微信公众号：按 star 排序的 30 个 Agent Skills 挑选清单
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - source
  - weixin
  - github
  - agent
  - skills
sources:
  - raw/sources/ai/2026-11-20-agent-skills-top30.md
related:
  - wiki/topics/github-open-agent-tools.md
---
# 微信公众号：按 star 排序的 30 个 Agent Skills 挑选清单

## Overview（概览）

微信公众号「探员」（10 年 Java、AI Agent 转型路上的独立开发者）于 2026-11-03 上午把 GitHub 上与 Agent Skills 相关的仓库按 star 从高到低扒了一遍，排出 30 个的挑选清单。不是测评：作者声明没有全装，排序本身是当日真实干完的活；每条一句「替你省什么」加开源地址。清单覆盖代码开发（9）、文档办公（6）、设计多媒体（6）、效率工具（8）、数据（1）五组，价值定位是「省掉挑选的时间」。

## Key Facts（关键事实）

- 头部三名断层领先（star 为 2026-11-03 实测）：Superpowers 311,254（`obra/superpowers`，TDD 七步开发方法论，逼 Agent 先计划再写代码）；Matt Pocock Skills 310,242（`mattpocock/skills`，grill-me 灵魂拷问、tdd、code-review）；ECC 295,677（`affaan-m/ECC`，71 个 agents、314 个 skills 带安全扫描）。第四名直接掉到 18 万量级。
- 代码开发组 9 个（含头部三名）：另有 mcp-builder（MCP Server 照脚手架填）、webapp-testing（Playwright E2E 按套路写）、gstack（138,683，23 件套虚拟工程团队）、GSD（64,169，spec 先行再开工，原库已归档装新地址）、Trail of Bits Skills（7,965，安全审计公司规则直接拿）、superpowers-lab（435，实验性技能）。
- mcp-builder、webapp-testing、Document Skills、skill-creator、internal-comms、brand-guidelines、frontend-design、web-artifacts-builder、canvas-design、algorithmic-art、theme-factory、slack-gif-creator 共 12 项共享 `anthropics/skills` 仓库（186,776 star，仓库共享，无法单独归属）。
- 文档办公组 6 个：Document Skills（docx/pdf/pptx/xlsx 四件套，source-available 非开源）、skill-creator（写新 Skill 不用啃规范）、internal-comms（状态报告/Newsletter/FAQ 模板）、brand-guidelines（对外文档口径）、Skill_Seekers（15,266，文档站/GitHub/PDF 一键转 Skills）、Claude-Command-Suite（1,350，216 命令+12 Skills）。
- 设计多媒体组 6 个全为 Anthropic 官方出品：frontend-design（专治 AI 味界面）、web-artifacts-builder、canvas-design、algorithmic-art、theme-factory、slack-gif-creator；作者评「Agent 的短板不在逻辑，在审美」。
- 效率工具组 8 个多为目录型仓库：awesome-claude-skills（ComposioHQ，约 78,000，10-30 盘点，200 条集成目录）、awesome-claude-code（57,127）、claude-plugins-official（约 45,000，10-30 盘点，官方插件目录）、awesome-agent-skills（VoltAgent，36,773，1000+ 含 Google/Stripe 出品）、claude-skills（alirezarezvani，约 29,000，10-30 盘点，401 个跨职能合集）、awesome-claude-skills（travisvn，15,679，新手友好）、commands（wshobson/agents，2,640，57 个 slash 命令，原库已归档）、claude-code-settings（1,670，中文友好包）。
- 数据组仅 1 个：Tinybird、ClickHouse、DuckDB、MongoDB、Redis 查数 Skills 基本都在 awesome-agent-skills 合集中（36,773），数据类独立仓库极少。
- 安装三法：插件市场（`/plugin marketplace add`）、npx 直装（`npx skills add` 进项目 `.claude/skills`）、手动 git clone。
- star 为 2026-11-03 实测、每天在涨；3 个约数来自 10 月 30 日第三方盘点；归档库别装旧地址，装前看 README。

## Important Claims（重要论断）

### Skills 生态已从「有没有」变成「装哪个」

清单不教写 Skill，教省掉挑选的时间——生态最缺「别让我自己挑」的清单（信源自述）。

### 竞争是「谁被装得多」，不是「谁功能多」

31 万 star 与 400 star 差的不是代码，是共识；清单给共识的起点，装完留删是用户的下一轮功课（信源自述；解读：以 star 数代理生态共识未经独立核验）。

### 头部三名按用途分工

方法论选 Superpowers，日常提效选 Matt Pocock Skills，搭基建选 ECC（信源给出的选型建议）。

## Concepts Introduced（引入的概念）

- [[claude-skills|Claude Skills]]：Agent Skills 是 Skill 资产机制的生态形态，本清单是该生态按 star 排序的挑选全景。

## Entities Mentioned（提及的实体）

- Superpowers（`obra/superpowers`，311,254 star，2026-11-03 实测）
- Matt Pocock Skills（`mattpocock/skills`，310,242 star）
- ECC（`affaan-m/ECC`，295,677 star）
- （30 个 Skills 均为单信源一句话描述，证据不足以独立实体页，全部收录于 [[github-open-agent-tools]] 主题页表格）

## Implications（影响／启示）

Agent Skills 生态进入「挑选优先」阶段：头部项目已积累大规模共识（30 万 star 量级），awesome 类目录仓库成为选型入口，官方出品集中覆盖 Agent 的短板场景（审美、文档、测试）（解读）。

## Limitations（局限）

- 单一微信公众号信源（三次评论性内容），作者声明未全装，star 数与一句话价值均为自测，未对仓库独立核验。
- 12 项 Skill 共享 `anthropics/skills` 同一仓库，star 数无法按单项归属。
- 3 个约数（约 78,000 / 约 45,000 / 约 29,000）来自 10 月 30 日第三方盘点，非同日实测。

## Related Knowledge（相关知识）

- [[github-open-agent-tools|GitHub 开源 Skill/Agent 工具盘点]]：本清单的主题页。
- [[claude-skills|Claude Skills]]：Agent Skills 的机制概念页。
- [[2026-11-20-weibo-github-open-skills|微博盘点：5 个实用的 GitHub 开源 Skill/Agent 工具]]：同日另一盘点（口径不同：实用工具 vs star 排序）。

## Source（信源）

- `raw/sources/ai/2026-11-20-agent-skills-top30.md`
- 原文：https://mp.weixin.qq.com/s/vlZKqsuG5ECeX1_0GoKW1A
