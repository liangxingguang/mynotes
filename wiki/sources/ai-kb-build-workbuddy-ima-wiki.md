---
id: wiki-source-ai-kb-build-workbuddy-ima-wiki
type: source
title: 分享一套超赞的AI知识库搭建方法，让沉睡的数据变成可复用的经验
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - knowledge-base
  - ai-agent
sources:
  - raw/sources/ai/2026-10-31-ai-kb-build-workbuddy-ima-wiki.md
---
# 分享一套超赞的AI知识库搭建方法，让沉睡的数据变成可复用的经验

## Overview（概览）

微信公众号「咘噜鸭」的实操教程：以 Karpathy「不要把 LLM 当搜索引擎、让它像程序员维护代码一样持续维护 Markdown 知识库」的主张为出发点，给出不懂技术的用户用 **WorkBuddy + ima + Wiki 思路** 搭建可复用知识库的七步流程、三个文件夹分工与维护约定。面向电商直播等业务场景，强调「资料归集 → 分析复盘 → 更新知识库 → 下一次调用 → 行动执行 → 记录反馈」的闭环与每月体检。

## Key Facts（关键事实）

- Karpathy 核心思路（文中转述）：不要把 LLM 当搜索引擎用，而是让它像程序员写代码一样持续维护一个 Markdown 知识库——人负责找资料、提好问题，LLM 负责总结、交叉引用、分类整理、保持一致性；人在 Obsidian 里浏览，LLM 在后台编辑。
- 三件套分工：WorkBuddy 负责读取资料、核对数据、分析问题、整理复盘、整合信息；ima 负责保存原始资料、经验档案和任务结果；Wiki 负责按主题给相关内容建立交叉索引。
- 三个文件夹：`01_原始资料`（数据表、项目文档、会议纪要、过程记录、沟通反馈、阶段总结、规则与模板）；`02_经验档案`（背景画像、知识库导航、主题档案、方法页、常见问题、固定流程、指标口径）；`03_任务结果`（分析报告、阶段复盘、行动清单、周期总结、知识库检查报告）。
- 五类场景（电商直播/内容创作/客户服务/项目执行/个人学习）只是装进去的内容不同，同一套思路适用。
- 七步流程：① 把 ima 接进 WorkBuddy（ima 知识库入口授权）；② 建好三个文件夹；③ 先放几份资料跑通流程，别一次全倒进去；④ 用提示词让 WorkBuddy 生成《001_背景画像》《002_知识库导航》《003_知识库维护约定》并上传到 `02_经验档案`；⑤ 让它干一次活（例：复盘 9月10日 直播并与 9月3日 对比）；⑥ 把验证过的经验更新回知识库（"请把复盘结果更新进知识库"）；⑦ 用 WorkBuddy 设月度定时任务做知识库体检（每月 1 日上午 9 点）。
- 操作卡点：ima 虽与 WorkBuddy 连通，但不能直接在 WorkBuddy 里给 ima 建文件夹，需用 ima 自带 Agent 创建或手动建。
- 核心论断："能找到"不是靠 ima 自动交叉索引，而是靠《003_知识库维护约定》的规则维护——页面互相写清《完整文件名》、导航里登记入口、双向引用两边都写；"AI 不会自动帮你连，约定才让它连得上"。
- 结构形态：报告按任务保存，Wiki 按主题维护。
- 金句："一个精心策划的知识存储，文档之间的关联和文档本身一样有价值。"

## Important Claims（重要论断）

### Claim 1：LLM 知识库的分工哲学——人提问、LLM 维护

人是资料入口与提问者，LLM 承担总结/交叉引用/分类/一致性维护。与 [[llm-wiki|LLM Wiki]] 模式同构（Karpathy 主张的转述，二手信源）。

### Claim 2：交叉索引靠约定而非自动

"AI 不会自动帮你连，约定才让它连得上"——可交叉索引性是维护规则（完整文件名、导航登记、双向引用）的产物，不是存储工具的自动能力。此为本文核心方法论主张（解读：与 [[llm-wiki|LLM Wiki]] 的"结构约定文件"特征互证）。

### Claim 3：知识库需要定期体检

资料越多，重复/过期/遗漏越多，每月检查一次即"给知识库做体检"，可用定时任务自动执行。

### Claim 4：三文件夹 = 原始资料/经验档案/任务结果的三段式沉淀

与"原始层→编译层"分离同构：原始资料不改写、经验档案是编译产物、任务结果按任务归档。

## Concepts Introduced（引入的概念）

- [[llm-wiki|LLM Wiki]]（本信源为第 3 信源：非技术用户的产品化落地案例）
- [[okf-knowledge-format|OKF（面向 AI Agent 的知识包装规范）]]（同族思路）

## Entities Mentioned（提及的实体）

- WorkBuddy（AI 助手产品，负责资料读取/分析/复盘；无独立页面）
- ima（腾讯系知识库产品，负责资料保存与检索；无独立页面）
- Obsidian（浏览入口）、Karpathy（主张提出者）

## Implications（影响／启示）

- 对本仓库：`01_原始资料/02_经验档案/03_任务结果` 三段式可对照 `raw/` `wiki/` `Archive/` 的分层实践；"维护约定文件"对应 AGENTS.md/CLAUDE.md 契约；"每月体检"对应 `/lint` 与 cron 巡检机制。
- 对产品选型：WorkBuddy+ima 证明 LLM Wiki 模式可被非技术用户低门槛复用，但以"产品绑定"换取易用性，与自建仓库的开放性形成取舍。
- 对维护纪律：交叉索引质量依赖人写的约定与双向链接纪律，与 [[llm-wiki|LLM Wiki]] 的"冲突检查/索引与日志"特征一致。

## Limitations（局限）

- 公众号推广性质文章，产品细节（WorkBuddy、ima 能力边界）未经独立核验；Karpathy 主张为转述，无一手链接。
- 配图全部为 1px 占位符（采集残留），表格在采集稿中被拆行（笔记正文已还原）。
- 场景案例仅电商直播一处详述，其余四类场景只有表格概述。

## Related Knowledge（相关知识）

- [[llm-wiki|LLM Wiki]]
- [[okf-knowledge-format|OKF（面向 AI Agent 的知识包装规范）]]
- [[knowledge-base-tech-evolution|一文搞懂知识库的技术演进]]
- [[llm-wiki-advanced-four-steps|LLM Wiki 搭建教程·进阶篇一（信源页）]]
- [[jd-haibo-ai-knowledge-base|拆解京东海博 AI-Native 落地保障：海博团队 AI 知识库能力建设]]

## Source（信源）

- `raw/sources/ai/2026-10-31-ai-kb-build-workbuddy-ima-wiki.md`
- 原文：<https://mp.weixin.qq.com/s/qggQE_Au5uhVK9yGAgbl6g>
