---
id: 2026-10-28-agent-panorama-roadmap
title: Agent - 全景与学习路线地图（1）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2094116344245625249
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 课程]
asset_ref: Assets/2026/10/agent-panorama-roadmap.md
wiki_status: ingested
---

# Agent - 全景与学习路线地图（1）

> Agent 系列第 1 篇（全系列总纲）：三级能力阶梯（聊天 → 工具调用 → 自主 agent）、一次 tool call 的完整时序、为什么必须有编排层（harness）、21 篇 / 8 个 Part 学习路线图与自测方法，附最小 tool_use 动手脚本。

## 核心要点

- **三级能力阶梯**：普通聊天（人决定下一步）→ function calling（模型只"声明"调用意图，宿主执行）→ 自主 agent（模型在 loop 内自己决定行动序列直到终止）；分水岭是"控制流由谁掌握"，不是模型聪不聪明。
- **workflow vs agent**（Anthropic 定义）：路径预先写死在代码里 = workflow；模型运行时动态决定路径 = agent。"自主"≠ 无人监管，≠ 是否每步问人，只指路径谁定。
- **一次 tool call 六步**：组装请求（历史+工具清单）→ 模型返回 tool_calls 声明 → 宿主校验并真执行 → 结果回填为 tool_result → 再问模型 → 输出答复。模型永不碰 HTTP/数据库，副作用全发生在编排层。
- **为什么需要 harness**：模型有判断力没手脚（只会生成文本），代码有手脚没判断力（分支写死）——agent 就是补这个缺口的编排层，像把 if/else 换成模型输出的 Controller。
- **学习路线**：21 篇 / 8 个 Part 围绕一个 demo（Go 后台 + RBAC + 多租户管理助手）演进，P1 概念 → P2 手写最小 agent（M1）→ P3 接真实后台（M2）→ P4 记忆规划 → P5 MCP → P6 多智能体 → P7 工程化上线 → P8 毕业；自测三门槛：能讲清、能指出取舍、能跑起来。
- **动手实践**：DeepSeek（OpenAI 兼容端点）+ Python 最小脚本触发一条 tool_use，亲眼看"结构化声明而非执行"；环境准备（uv/pip、.env 管 key、Ollama 可选）一次搞定后续复用。

## 正文

见 [[Assets/2026/10/agent-panorama-roadmap.md]]（全文约 2 万字符，含时序图、词表、参考清单与动手脚本）。

## 来源

- [Agent - 全景与学习路线地图（1）· 知乎专栏](https://zhuanlan.zhihu.com/p/2094116344245625249)

## 附件

- [[Assets/2026/10/agent-panorama-roadmap.md]]
