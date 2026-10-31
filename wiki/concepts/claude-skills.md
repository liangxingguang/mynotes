---
id: wiki-concept-claude-skills
type: concept
title: Claude Skills
status: active
created: 2026-10-30
updated: 2026-10-31
confidence: medium
tags:
  - concept
  - ai
  - claude
sources:
  - raw/sources/ai/2026-10-28-claude-skills-guide.md
  - raw/sources/ai/2026-10-28-uncle-bob-ub-mode-skill.md
  - raw/sources/ai/2026-10-28-ste-zh-skill.md
related:
  - wiki/concepts/prompt-injection.md
  - wiki/concepts/pi-customization-layers.md
---
# Claude Skills

## Definition（定义）

Claude Skills 是 Anthropic 推出的模块化技能包机制：一个装着指令、脚本与资源的文件夹（核心为一个 Markdown 指令文件），用到才加载，把领域知识、工作流与个人偏好固化为"创建一次、长期有效"的可复用资产，代替每次对话重复粘贴提示词。

## Why It Matters（为什么重要）

它把用户从"每次对话从白纸开始"改为"调用一个已接受充分培训的专职助理"：除了省去重复解释的时间，更关键的是输出一致性——同一份自我描述与标准每次被原样执行，消除因措辞波动导致的质量漂移。

## Core Characteristics（核心特征）

1. **文件即资产**：本质是一个 .md 文件（可加脚本/资源），不装插件、可本地备份、可迁移。
2. **按需加载**：存入账户后一句话唤醒，未用到不占用上下文。
3. **可组合、可执行**：多个 Skill 可互相组合，也可写代码完成复杂任务。
4. **构建元技能**：官方预置 Skill-Creator 专门帮助构建其他 Skill。
5. **专业纪律包**：Skill 可将领域开发纪律（如 TDD、重构、Clean 系原则）固化为可执行指令，配合确定性工具验证质量——代表案例：Uncle Bob 的 ub-mode（见 [[uncle-bob-ub-mode-skill]]）。
6. **行为规范化包**：Skill 也可约束 Agent 的行为输出——如 ste-zh 借鉴 ASD-STE100 受控语言原则规范 Agent 的中文汇报（见 [[ste-zh-skill]]），与 ub-mode 管开发纪律互补，一个管"怎么说"，一个管"怎么做"。

## How It Works（运作方式）

构建流程（信源给出的个人用户路径）：启用 Skill-Creator → 结构化提示词描述任务上下文（受众/语气/输出标准/禁忌）→ 保存到账户并本地备份 → 对话中一句话调用。提质手段包括：让 Claude 反向提问补全需求、把既有对话直接转成 Skill、贴真实输出范例、结尾内置 3–5 条自查清单。Skills 2.0 引入断言评估（激活/不激活双跑打分）、A/B 测试与触发词自动优化，把质量验证从"凭感觉"变为"有依据"。

## Relationships（关系）

### Related Concepts（相关概念）

- [[pi-customization-layers|Pi 五层定制模型]]：Skill 处于"扩展点成本阶梯"的轻量端；本概念是 Claude 产品侧对应机制
- [[prompt-injection|Prompt Injection]]：未审核的第三方 Skill 文件会执行指令甚至代码，是提示注入的供应链面

### Distinctions（区分）

- 与一次性提示词的区别：Skill 被持久化、可版本化、可评估，是资产而非对话片段。
- 与重型 Workflow 的区别：见 [[ai-coding-workflow-skill-prompt|轻 Skill 工作流]] 的警示——流程写死的重型 Skill 在强模型时代会变成噪声，Skill 内容须随模型能力定期做减法。

## Evolution（演进）

- 2026-10（信源时间）：Skills 2.0 增加内置断言评估、A/B 测试与触发词优化；第三方市场（SkillsMSP）与精选列表（Awesome Claude Skills）出现。
- 2026-10-26：Uncle Bob 发布 `unclebob/ub-mode`——把 TDD/重构/Clean 系纪律压成一份 Agent Skill，三段式执行（先让它能工作→再把它做好→遵循实践要求），质量靠 Crapper/Dryer/Mutator 确定性工具验证而非 Agent 自述。标志着 Skills 从"通用知识包"向"专业开发纪律包"演进。

## Open Questions（开放问题）

- Skill 与个人指令（custom instructions）、项目知识、MCP 工具的官方分工边界：当前信源未展开。
- 第三方 Skill 市场的审核与供应链安全机制：未知。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-claude-skills-guide.md`（专栏导览文，功能描述未经独立核验，confidence=medium）
- Source: `raw/sources/ai/2026-10-28-uncle-bob-ub-mode-skill.md`（ub-mode 实测案例，SKILL.md 中文译文未经原作者审校，confidence=medium）
- Source: `raw/sources/ai/2026-10-28-ste-zh-skill.md`（ste-zh 汇报规范 Skill，微博帖子信息量有限，confidence=medium）

## Related Knowledge（相关知识）

- [[claude-skills-guide|从 0 到 1 拆解 Claude Skills（SKILLS 专栏 01）]]
- [[uncle-bob-ub-mode-skill|Uncle Bob 给 Agent 写了一份开发 Skill（ub-mode）]]
- [[ste-zh-skill|ste-zh：借鉴 ASD-STE100 的 AI Agent 中文汇报规范 Skill]]
- [[ai-coding-workflow-skill-prompt|一位 Agent 开发者的 AI Coding 工作流：轻 Skill、方法论 Prompt 与端到端测试]]
- [[drawio-skill|drawio-skill]]（具体 Skill 实例）
