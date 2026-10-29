---
id: 2026-10-29-pi-dsh-agent-complexity
title: 复杂度归谁：Pi 与 DSH 把 Agent 带向了两种未来
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2077755886915810428
source_type: 文章
platform: 知乎
created: 2026-10-29
category: 技术
tags: [AI, 工程实践]
asset_ref: Assets/2026/10/pi-dsh-agent-complexity.md
wiki_status: pending
---

# 复杂度归谁：Pi 与 DSH 把 Agent 带向了两种未来

> Coding Agent 不断堆功能导致上下文膨胀、行为难解释。Pi 与 DeepSeek Harness（DSH）给出相反答案：Pi 只内置 4 个工具，让复杂度"举证"后才进系统；DSH 把能力拆成可装卸插件，让复杂度可组合、可撤销。分歧本质是控制权在"设计时"还是"运行时"。作者的结论：用 Pi 的标准决定什么值得进系统，用 DSH 的结构管理已进来的东西；Agent 自我扩展最缺的不是能力，而是一部"宪法"。

## 核心要点

- **Pi：极简核心 + 举证责任倒置**。默认只有 read/write/edit/bash，MCP、Subagent、Plan Mode 一律不进默认产品；每项内置能力都有上下文、决策、维护三重成本，须先证明价值。计划写进文件、隔离交给容器——优先用操作系统原语，不造 Agent 专属抽象。信念："缺失的功能可以补，失控的复杂度很难拿掉"。
- **DSH：可逆组合 + 运行时自我改装**。基于 Cordis，模型适配器、工具注册表、Agent Loop 全是可装卸插件；`tool-cordis` 允许 Agent 在沙箱中临时定义并挂载工具（进程内生效，重启消失，不写入配置）。作者正名：这不是"自我进化"，只是"运行时自我改装"——版本管理、持久化、回归测试、权限审计都还没解决。
- **互有反驳**：Pi 认为模块化常只是把复杂核心拆成许多复杂包，形成"分布式核心"；DSH 认为把 Subagent/审批交给外围脚本不等于消灭复杂度，只是让它失去统一接口和生命周期。
- **适用场景**：Pi 适合边界稳定、开发者深度参与、可观察性优先；DSH 适合能力组合多变、多 Agent 共存、需要统一治理。
- **自进化需要宪法**：能改自身环境的 Agent 必须回答四问——新能力可访问哪些资源、谁验证有效性、出错能否回滚、哪些临时能力可转正；否则自我扩展只会自动生成技术债。

## 正文

见 [[Assets/2026/10/pi-dsh-agent-complexity.md|抓取正文]]。

## 来源

- [知乎原文](https://zhuanlan.zhihu.com/p/2077755886915810428)

## 附件

- [[Assets/2026/10/pi-dsh-agent-complexity.md]]
