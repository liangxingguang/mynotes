---
id: wiki-source-agent-minimal-handwritten
type: source
title: Agent - 手写最小 agent（7）
status: active
created: 2026-10-29
updated: 2026-10-29
confidence: high
tags:
  - ai-agent
  - tutorial
sources:
  - raw/sources/ai/2026-10-28-agent-minimal-handwritten.md
---
# Agent - 手写最小 agent（7）

## Overview（概览）

知乎专栏《Agent》系列第 7 篇：把前五篇的零件（五阶段 loop、消息协议、模型接入、工具注册表、迭代熔断）拼装成一个"看得懂每行代码"的最小 agent——config/tools/agent 三文件组织（Python + DeepSeek + openai SDK），含完整代码与终端里程碑 M1 自检。

## Key Facts（关键事实）

- 最小 agent 项目结构：`config.py`（唯一配置点：BASE_URL/MODEL/TIMEOUT=60s/MAX_RETRIES=2/MAX_ITERATIONS=10）+ `tools.py`（实现 + schema + 校验）+ `agent.py`（五阶段主循环）。
- `MAX_ITERATIONS` 是"唯一不依赖模型自觉的终止保险"：跑满后 `raise RuntimeError`，官方示例常用 `while True`，工程代码不能省。
- 终止判定读结构化信号 `tool_calls` 有无（模型在 content 里说"完成了"不算数），`finish_reason` 做次级校验（非 `stop` 打警告，`length` 可能截断）。
- 带 `tools` 的请求，历史 assistant 消息里的 `reasoning_content` 必须完整回传，否则 API 返回 400（DeepSeek Thinking Mode 官方规则，2026-10-15 curl 实测）。
- 非 strict 模式下 JSON Schema 只是软约束，执行前必须本地校验；DeepSeek strict 模式（Beta，`/beta` base_url + `"strict": true`）把约束推到服务端，代价是 schema 写法受限（object 全部 required、`additionalProperties: false`）。
- JSON mode 要求 prompt 含 `json` 字样并给格式示例，偶尔返回空 content；与 function calling 的分工：前者让模型按结构交数据（单轮），后者让模型决定下一步动作（多轮）。
- 作者诚实声明：循环逻辑与错误兜底用桩模型实测；对真实 DeepSeek 的调用未实测，以官方文档为准。

## Important Claims（重要论断）

### 写 description 就是写 prompt

模型只能看到工具的 `name`/`description`/`parameters`，看不到函数体；"必须调它，不要凭记忆猜""不要心算"这类措辞直接抑制模型编造行为。因此 schema 与实现必须同文件成对维护——改了实现忘改描述，模型会按旧描述调用。

### 错误要回喂而不是崩掉

四类错误路径（幻觉调用、空参/坏 JSON、参数不合规、工具异常）统一不抛异常、返回错误文本作为 `role:"tool"` 消息回填，模型下一轮读到错误后自纠；系统提示词配套要求模型"读懂错误、调整调用方式重试"。原则：demo 崩了可以重跑，线上 agent 崩一次会丢整个会话。

### 禁用 eval 执行模型生成的表达式

表达式类工具用 `ast` 白名单求值器（只放行数字、四则运算、括号节点），`eval` 等于交出命令执行权。

## Concepts Introduced（引入的概念）

- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[agent-loop|Agent Loop]]（本信源为其提供最小可运行实现与终止/熔断/回填细节）

## Entities Mentioned（提及的实体）

- DeepSeek（API 提供方，deepseek-flash 模型、thinking 模式、strict 模式 Beta）
- openai-python SDK（3.31.0）

## Implications（影响／启示）

为"Agent Loop 五条边界"提供了逐行可对读的教学实现：校验在进函数之前、终止靠结构化信号、熔断保底、错误回喂。对自研轻量 agent 的读者，这是一份可直接抄底的检查清单。

## Limitations（局限）

- 教学实现：工具顺序执行、无持久化会话、无权限/审批概念；真实后台 REST 接口（token 过期、4xx/5xx、写操作确认）留到第 8 篇。
- 系列前序第 1–6 篇未采集，五阶段骨架与消息协议的细节只有引用、无原文。
- 对真实 DeepSeek 端点的行为以官方文档为准，未实测。

## Related Knowledge（相关知识）

- [[agent-loop|Agent Loop]]
- [[tool-schema-as-prompt|Tool Schema as Prompt]]
- [[harness-engineering|Harness Engineering]]（极简循环 vs 生产复杂度的又一例证）

## Source（信源）

- `raw/sources/ai/2026-10-28-agent-minimal-handwritten.md`
- 原文：<https://zhuanlan.zhihu.com/p/2095565673804083692>
