---
id: 2026-10-28-uncle-bob-ub-mode-skill
title: 《代码整洁之道》作者 Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）
source: 微信公众号·AI速通
source_url: https://mp.weixin.qq.com/s/V24Epigc4bxE7vjufOOZ5Q
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [AI Coding, 工程实践]
asset_ref: Assets/2026/10/uncle-bob-ub-mode-skill.md
wiki_status: pending
---

# Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）

> Uncle Bob 发布 `ub-mode`：把 TDD、重构、Clean 系纪律压成一份 Agent Skill。三段式执行——先让它能工作、再把它做好、遵循实践要求；质量靠 Crapper/Dryer/Mutator 确定性工具验证，不靠 Agent 自说自话。

## 核心要点

- **ub-mode 骨架**：每次修改依次"先让它能工作 → 再把它做好 → 遵循实践要求"（懒惰协议、TDD、先减后加、修根本原因、测行为非实现、重构须证明行为不变）。
- **金句**：难以编写诚实有效的测试，就不要写一个糟糕的测试；掩盖崩溃的防护判断不算修复。
- **质量工具三件套**：Crapper（CRAP 分 <10）、Dryer（消重，Skill 要 0.8 而工具默认 0.82——配置需核对）、Mutator（变异测试杀存活变异体、删死代码）；工具独立仓库，复制 SKILL.md 不会自动配好。
- **工程细节**：边界处校验数据、内部信任；让非法状态无法表达；幂等；共享状态只允许一个写入者；保护上下文窗口（主线程简短+摘要）；小步提交说明原因与验证方式。
- **落地提醒**：检查 Agent 是否真执行了验证而非生成漂亮报告；Skill 里的推送/清理要求须服从项目授权，不跳过团队审阅。
- 项目：https://github.com/unclebob/ub-mode

## 正文

见 [[Assets/2026/10/uncle-bob-ub-mode-skill.md|抓取正文]]，含 SKILL.md 完整中文译文。

## 来源

- [《代码整洁之道》作者 Uncle Bob，给 Agent 写了一份开发 Skill](https://mp.weixin.qq.com/s/V24Epigc4bxE7vjufOOZ5Q)（微信公众号·AI速通）

## 附件

- [[Assets/2026/10/uncle-bob-ub-mode-skill.md]]
