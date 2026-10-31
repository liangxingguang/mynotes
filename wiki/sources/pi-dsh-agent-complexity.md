---
id: wiki-source-pi-dsh-agent-complexity
type: source
title: 复杂度归谁：Pi 与 DSH 把 Agent 带向了两种未来
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - ai-agent
  - harness
  - pi
  - dsh
sources:
  - raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md
related:
  - wiki/entities/pi.md
  - wiki/entities/deepseek-harness.md
  - wiki/concepts/harness-engineering.md
  - wiki/concepts/pi-customization-layers.md
---
# 复杂度归谁：Pi 与 DSH 把 Agent 带向了两种未来

## Overview（概览）

一篇深度分析文章，比较 Pi 与 DeepSeek Harness（DSH）对"Agent 复杂度"问题的相反回答：Pi 只内置 4 个工具，让复杂度"举证"后才进系统；DSH 把能力拆成可装卸插件，让复杂度可组合、可撤销。分歧本质是控制权在"设计时"还是"运行时"。作者结论：用 Pi 的标准决定什么值得进系统，用 DSH 的结构管理已进来的东西；Agent 自我扩展最缺的不是能力，而是一部"宪法"。

## Key Facts（关键事实）

- **Pi 的默认工具仅 4 个**：read、write、edit、bash；MCP、Subagent、Plan Mode、权限弹窗、内置待办和后台 Bash 均不纳入默认产品。
- **Pi 的"举证责任倒置"**：每项内置能力都有上下文成本、决策成本、维护成本三重成本，须先证明价值才能进入核心。信念："缺失的功能可以补，失控的复杂度很难拿掉"。
- **DSH 基于 Cordis 构建**：模型适配器、工具注册表、会话日志、Agent Loop 全部是可装卸插件；`tool-cordis` 允许 Agent 在沙箱中临时定义并挂载工具（进程内生效，重启消失，不写入配置）。
- **DSH 的关键机制是"可逆组合"**：能力既能加入也能退出，使同一个 Harness 可以承载多种 Agent。
- **分歧核心**：Pi 信任设计时控制（开发者显式选择），DSH 试图让配置权进入运行时（Agent 自我改装）。
- **"运行时自我改装"≠"自我进化"**：进化意味着经验跨任务保留、失败影响下一轮选择、有用能力稳定沉淀；当前临时插件只完成了第一步，版本管理/持久化/回归测试/权限审计/能力淘汰均未解决。
- **自进化需要宪法**：能改自身环境的 Agent 必须回答四问——新能力可访问哪些资源、谁验证有效性、出错能否回滚、哪些临时能力可转正。

## Important Claims（重要论断）

### Claim 1：Pi 与 DSH 的分歧不是功能多少，而是复杂度何时进入系统

Pi 选择压低系统默认承担的责任，把复杂度留给开发者按需添加；DSH 把复杂系统拆成可组合、可卸载的模块，希望运行时也能参与能力配置。两者真正争论的是：复杂度应该在什么时候进入系统，又该由谁决定它是否存在。

### Claim 2：模块化可能制造"分布式核心"

Pi 对 DSH 的最强反对意见是：很多所谓模块化系统，只是把一个复杂核心拆成许多复杂包。插件数量增加后，依赖顺序、版本冲突、隐式事件和生命周期管理依然可能形成新的"分布式核心"——架构图漂亮，理解系统的成本却没有真正下降。

### Claim 3：外围复杂度也是真实复杂度

DSH 对 Pi 的反驳同样有力：把 Subagent、审批与调度交给脚本，不会让它们消失，只会让它们缺少统一接口、状态记录和生命周期管理。当系统走向多人协作、长期运行和多种 Agent 共存时，极简核心可能把维护成本转移给每一个集成者。

### Claim 4：用 Pi 的标准决定什么值得进系统，用 DSH 的结构管理已进来的东西

作者的组合原则：Pi 的"举证责任倒置"决定什么值得进入系统，DSH 的"可逆组合"管理已经进入系统的东西。未来真正强大的 Agent Harness 应当允许 Agent 形成新能力，同时保留清晰的边界、记录、验证与撤销权——能力可以生长，控制权不能随之蒸发。

## Concepts Introduced（引入的概念）

无新概念页。本文的"复杂度治理"视角已融入 [[harness-engineering]] 概念页的核心特征。

## Entities Mentioned（提及的实体）

- Pi（见 [[pi]]）
- DeepSeek Harness / DSH（见 [[deepseek-harness]]）
- Cordis（DSH 底层框架）

## Implications（影响／启示）

本文提供了评估 Agent Harness 的一个关键维度：复杂度治理。Pi 和 DSH 代表两种不同的工程理性——前者要求每一项复杂度先证明自己的价值，后者要求每一项复杂度都能被隔离和撤回。两者并不互相替代，而是各有适用场景。对于 Agent Harness 的设计者，"自进化需要宪法"是一个不可回避的设计约束：能改自身环境的 Agent 必须有制度化的验证、回滚、权限和淘汰机制，否则自我扩展只会自动生成技术债。

## Limitations（局限）

- 文章为知乎专栏深度分析，属个人观点，非学术论文。
- DSH 的"运行时自我改装"能力目前仅限进程内临时挂载，作者已明确指出版本管理/持久化/回归测试/权限审计/能力淘汰均未解决。
- Pi 与 DSH 的比较基于作者的架构分析，未提供实证数据或用户反馈。

## Related Knowledge（相关知识）

- [[pi|Pi]]
- [[deepseek-harness|DeepSeek Harness]]
- [[harness-engineering|Harness Engineering]]
- [[pi-customization-layers|Pi 五层定制模型]]
- [[claude-skills|Claude Skills]]（ub-mode 同属"约束 Agent 行为"的思路）

## Source（信源）

- `raw/sources/ai/2026-10-28-pi-dsh-agent-complexity.md`
