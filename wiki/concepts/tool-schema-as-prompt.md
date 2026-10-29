---
id: wiki-concept-tool-schema-as-prompt
type: concept
title: Tool Schema as Prompt
status: active
created: 2026-10-29
updated: 2026-10-30
confidence: high
tags:
  - concept
  - ai-agent
sources:
  - raw/sources/ai/2026-10-28-agent-minimal-handwritten.md
  - raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md
  - raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md
related:
  - wiki/concepts/agent-loop.md
  - wiki/concepts/mcp.md
  - wiki/concepts/rest-api-as-tools.md
  - wiki/concepts/tool-parameter-whitelist.md
---
# Tool Schema as Prompt

## Definition（定义）

工具的 JSON Schema（`name` / `description` / `parameters`）经序列化后随 `tools` 参数直接进入模型请求体，是模型对工具**唯一**可见的接口——模型看不到函数体。因此"写工具描述"在本质上就是"写 prompt"：description 的措辞直接塑造模型的调用决策。

## Why It Matters（为什么重要）

常见误解是"把函数传给了模型"。实际上模型本身不执行函数，只产出调用意图，执行发生在宿主代码里（DeepSeek Tool Calls 官方文档明确表述）。认识到 schema=prompt，工具设计就从"接口定义"问题变成"行为塑造"问题：模型的幻觉调用、凭记忆编造、拒绝链式调用，相当部分可以通过描述措辞抑制。

## Core Characteristics（核心特征）

1. **模型可见面只有三字段**：`name`、`description`、`parameters`；实现细节不可见、不参与模型决策。
2. **描述即行为约束**：如 `get_time` 描述写"任何涉及当前时刻的问题都必须先调它，不要凭记忆猜"以抑制编时间；`calculate` 描述写"不要心算""多步计算时把上一步结果作为下一步输入"以支撑链式调用。
3. **schema 与实现成对维护**：两者必须放同一文件；改了实现忘改描述，模型会按旧描述调用（幻觉调用的一种来源）。
4. **schema 只是软约束（非 strict 模式）**：`enum` 等约束可能被违反，执行前必须本地校验（查缺必填、类型、enum、schema 外参数；注意 Python 中 `bool` 是 `int` 子类须排除）。DeepSeek strict 模式（Beta）可把校验推到服务端，但 schema 写法受限（object 全部 required、`additionalProperties: false`）——两层不互斥。
5. **表达式类工具禁用 `eval`**：模型生成的表达式不受控制，`eval` 等于交出命令执行权；替代方案是 `ast` 白名单求值器（只放行数字与四则运算节点）。

## How It Works（运作方式）

```
TOOL_SCHEMAS（JSON Schema）→ 序列化为请求体 tools 字段 → 模型读 name/description/parameters
→ 产出 tool_calls（调用意图）→ 宿主查注册表 + 校验参数 + 执行函数 → 结果回填
```

校验失败不抛异常，错误文本作为 `role:"tool"` 消息回喂模型自纠（详见 [[agent-loop|Agent Loop]] 的错误回喂机制）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-loop|Agent Loop]]：schema 随每轮 Context 进入模型；本概念是 Loop"工具校验"边界的描述侧对应物。
- [[mcp|MCP]]：把工具 schema 的供给外部化、协议化；schema=prompt 的规律在 MCP 工具上同样成立（解读）。

### Distinctions（区分）

- **schema 约束 vs prompt 约束**：schema（enum/required）约束结构，description 约束行为；非 strict 下两者都可能被违反，故宿主侧校验不可省。
- **function calling vs JSON mode**：前者是模型决定下一步动作（多轮循环，产出 tool_calls）；后者是模型按结构交数据（单轮，`response_format={"type":"json_object"}`，prompt 须含 `json` 字样与示例）。口诀：让模型做动作用 function calling，让模型按格式说话用 JSON mode。

## Evolution（演进）

- 2026-10-29 — 由信源 `raw/sources/ai/2026-10-28-agent-minimal-handwritten.md`（手写最小 agent 第 7 篇）建立。
- 2026-10-30 — 第 8 篇信源印证并扩展出「描述即流程」：执行顺序（先登录、写操作先查现状再复述）写进工具描述，模型照着自己排步骤，用户无需说「先登录」（M2 实测第一轮即调 login）；工具函数体换 HTTP 封装后形状不变（见 [[rest-api-as-tools|REST 接口工具化模式]]）。
- 2026-10-30 — 第 10 篇信源把「schema 软约束须执行前校验」推进到语义层：两段式校验（schema 查形状 + 语义白名单查值），描述里写明参数约束可让模型生成时收敛、减少被拒次数（见 [[tool-parameter-whitelist|参数层白名单防线]]）。

## Open Questions（开放问题）

- 工具数量增长到几十上百个时，description 写作与检索式工具选择（tool retrieval）如何配合？（当前信源未覆盖）
- 各厂商 strict 模式的约束差异与迁移成本？

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-minimal-handwritten.md`（含 DeepSeek 官方文档 2026-10-15 curl 实测引述：Tool Calls / Thinking Mode / JSON Output / strict 模式 Beta）
- Source: `raw/sources/ai/2026-10-28-agent-rest-api-as-tools.md`（描述即流程、M2 五轮闭环实测）
- Source: `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md`（两段式校验、29 项断言自检）

## Related Knowledge（相关知识）

- [[agent-minimal-handwritten|Agent - 手写最小 agent（7）（信源页）]]
- [[agent-rest-api-as-tools|Agent - 后台API变成工具（8）（信源页）]]
- [[agent-tool-security-whitelist|Agent - 工具全谱系与安全边界（10）（信源页）]]
