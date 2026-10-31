---
id: wiki-source-uncle-bob-ub-mode-skill
type: source
title: Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - ai
  - ai-coding
sources:
  - raw/sources/ai/2026-10-28-uncle-bob-ub-mode-skill.md
related:
  - wiki/concepts/claude-skills.md
  - wiki/sources/claude-skills-guide.md
---
# Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）

## Overview（概览）

Robert C. Martin（Uncle Bob）于 2026 年 10 月发布 `unclebob/ub-mode`：把 TDD、重构、Clean 系纪律压成一份 Agent Skill（SKILL.md）。三段式执行——先让它能工作、再把它做好、遵循实践要求；质量靠 Crapper/Dryer/Mutator 确定性工具验证，不靠 Agent 自说自话。

## Key Facts（关键事实）

- Uncle Bob：Robert C. Martin，敏捷宣言 17 位署名作者之一；2001 年犹他州 Snowbird 聚会；1999 年与 Kent Beck 结对编程学习 TDD。
- ub-mode 首次提交于 2026 年 10 月 26 日凌晨（北京时间），署名 Robert C. Martin。仓库只有 README.md 和 SKILL.md。
- 三段式执行：①先让它能工作（懒惰协议、基础思考、TDD、从第一性原理重新设计、质疑前提、先减后加、以结果为目标执行、构建省力工具、架构纪律）②再把它做好（修复根本原因、可验证单元拆分、测试行为非实现、Crapper/Dryer/Mutator、重构须证明行为不变）③遵循实践要求（保留日志、保护上下文窗口、清理 Worktree、提交与推送）。
- 质量工具三件套：Crapper（CRAP 分 <10）、Dryer（消重，Skill 要求 0.8 而工具默认 0.82——配置需核对）、Mutator（变异测试杀存活变异体、删死代码）。工具与 Skill 分仓库，复制 SKILL.md 不会自动配好工具。
- 金句："如果难以编写诚实有效的测试，不要写一个糟糕的测试"；"仅仅掩盖崩溃的防护判断，不算修复"。

## Important Claims（重要论断）

### Claim 1：Agent 的开发纪律不能靠"自说自话"，必须靠确定性工具验证

文章核心论点：ub-mode 的重点不在"让模型多写代码"，而是用小步测试和修改推进、关注结构与行为、保留可核查的工作记录。质量验证靠 Crapper/Dryer/Mutator 三个独立工具，而非 Agent 自我报告。落地时要检查 Agent 是否真执行了验证，而不是只生成一份看起来完整的报告。

### Claim 2：TDD 的精髓是"测试能否表达需求"，不是"为遵守流程而凑测试"

文章引用 ub-mode 中的一句话："如果难以编写诚实有效的测试，不要写一个糟糕的测试。"测试能否表达需求，比为证明遵守流程而凑测试更重要。这反映了 Uncle Bob 对 TDD 的理解：测试是需求表达工具，不是流程合规工具。

### Claim 3：通用 Skill 放进自己项目时应服从项目约定和当前授权

文章提醒：Skill 里的推送/清理要求须服从项目授权，不能因为文件里写了推送就自动跳过团队审阅流程。落地时应先问 Agent：这次要改变什么行为、怎样重现旧问题、哪些检查证明修改有效？

## Concepts Introduced（引入的概念）

无新概念页。ub-mode 是 [[claude-skills]] 概念的一个具体应用案例——把 Clean 系开发纪律固化为 Agent Skill。

## Entities Mentioned（提及的实体）

- Uncle Bob / Robert C. Martin（敏捷宣言署名作者，Clean Code/Clean Architecture 作者）
- Kent Beck（TDD 提出者，Uncle Bob 1999 年结对编程学习对象）
- Crapper（CRAP 分数计算工具）
- Dryer（重复代码检测工具）
- Mutator（变异测试工具）
- uml-viewer（结构与度量查看工具）

## Implications（影响／启示）

ub-mode 标志着 Agent Skills 从"通用知识包"向"专业开发纪律包"的演进：不是让 Agent 多知道一些，而是给它一套可执行、可验证的工作纪律。这与 [[claude-skills]] 概念中"Skill 是创建一次、长期有效的可复用资产"的定位一致，但 ub-mode 增加了确定性工具验证这一层——质量不靠 Agent 自述，靠工具度量。

## Limitations（局限）

- 文章为微信公众号转载，SKILL.md 中文译文未经 Uncle Bob 本人审校。
- Crapper/Dryer/Mutator 三个工具的实际效果未经独立验证。
- ub-mode 的适用场景限于代码修改任务，未覆盖需求分析、架构设计等更高阶活动。
- 工具与 Skill 分仓库的设计增加了配置复杂度，新手可能遗漏工具安装步骤。

## Related Knowledge（相关知识）

- [[claude-skills|Claude Skills]]
- [[claude-skills-guide|从 0 到 1 拆解 Claude Skills]]
- [[agent-loop|Agent Loop]]
- [[pi-customization-layers|Pi 五层定制模型]]

## Source（信源）

- `raw/sources/ai/2026-10-28-uncle-bob-ub-mode-skill.md`
