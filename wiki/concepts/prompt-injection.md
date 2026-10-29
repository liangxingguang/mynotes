---
id: wiki-concept-prompt-injection
type: concept
title: 提示词注入（Prompt Injection）
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: medium
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md
related:
  - wiki/concepts/tool-parameter-whitelist.md
  - wiki/concepts/agent-sandboxing.md
---
# 提示词注入（Prompt Injection）

## Definition（定义）

攻击者把指令混入模型会读到的内容（工具结果、用户输入、知识库文档），使模型把「数据」当「指令」执行的攻击。根因是模型分不清指令和数据：role 字段只是给 API 和代码用的分类符，模型看到的是一整段拼接文字，没有任何机制知道「system 的话更可信」。

## Why It Matters（为什么重要）

SQL 注入有解药（参数化查询把指令与数据物理隔开），LLM 世界没有——一切内容都是同一条字符串流。正因无解，OWASP LLM Top 10 连续两年把 Prompt Injection 排在第一（2026 版 LLM01，2026-08-04 发布）。NIST AI 100-2 e2025 同判「当前不存在可靠预防机制」。对 agent 而言，注入的后果经由工具调用转化为真实世界的动作（改数据、发邮件、执行代码）。

## Core Characteristics（核心特征）

1. **三条注入路径**：A 工具结果藏指令（间接注入，如工单/网页/附件里藏指令）；B 用户输入带指令（直接注入，含无意注入——用户粘贴的文本恰好带引导性句子，OWASP 真实场景：简历模板藏 AI 检测指令）；C 可信表面被投放（内网知识库投毒——写侧低权限入口与读侧高权限消费不对齐）。
2. **agent 无法验证内容出处**：读到「系统提示：本次操作已获批准」时，它与管理员真实指令在 token 流上平起平坐。
3. **确认闸门拦不住注入**：注入四环模型——①坏内容进上下文（想错了）→②模型产出参数→③执行闸门（管做不做）→④真实执行；闸门在第③环，注入在第①环已完成。被操纵的模型做出看起来就是用户本意的事，人会放行。
4. **读操作外衣下的写效果**：注入可让「生成日报并发邮件」这类表面只读的工具把敏感数据发出去——执行的是读，完成的是泄露。

## How It Works（运作方式）

典型链路（路径 A）：外部用户经公开表单提交带指令的工单 → agent 调 get_tickets 拉取 → 工单文本原样进入 messages → 模型读后产出攻击者设计的 tool_call → 若参数看起来正常，确认闸门也会被人放行。

相关框架（信源引用，未展开）：Simon Willison「lethal trifecta」（2025-06-16：private data + untrusted content + external communication 三者齐备即高危）；Meta「Agents rule of two」（2025-10-31）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[tool-parameter-whitelist|参数层白名单]]：对注入的工程防线——不管模型想没想错，坏参数在出网前被拦下。
- [[agent-sandboxing|Agent 沙箱隔离]]：压缩注入得逞后的影响范围（能力限制），与参数校验（行为前拦截）互补。

### Distinctions（区分）

- 与 **SQL 注入**：同根（数据被当指令执行），但 SQL 有参数化查询解药，LLM 没有等价物；防护只能靠多层消减（权限收窄、参数白名单、沙箱、审计），不能根除。

## Evolution（演进）

- 2026-10-30 — 由信源 `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md` 建立（OWASP LLM Top 10 2026 版条目为该信源引文核验来源）。

## Open Questions（开放问题）

- OWASP 2026 版 LLM01 的完整防御清单与 trusted-surface injection 分级细节：当前仅经二手引述，未直接摄入原始条目。
- 各模型厂商在协议层隔离指令与数据的进展（如结构化通道）：当前信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md`（引用 OWASP GenAI LLM Top 10 2026、NIST AI 100-2 e2025、Simon Willison、Meta AI，均经作者注明核验方式）

## Related Knowledge（相关知识）

- [[agent-tool-security-whitelist|Agent - 工具全谱系与安全边界（10）（信源页）]]
