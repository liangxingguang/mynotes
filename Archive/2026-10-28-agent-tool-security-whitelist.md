---
id: 2026-10-28-agent-tool-security-whitelist
title: Agent - 工具全谱系与安全边界（10）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095930576318551219
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-tool-security-whitelist.md
wiki_status: ingested
---

# Agent - 工具全谱系与安全边界（10）

> Agent 系列第 10 篇：工具是 agent 的攻击面——五类工具风险分级、提示词注入的三条路径、确认闸门为什么拦不住注入，以及参数层白名单防线（格式/取值/语法树）的完整代码落地。

## 核心要点

- **风险看落点不看模型**：同一参数落到只读 REST / 数据库 / 代码执行，后果完全不同；降风险第一动作是砍权限而非加提示词（提示词是劝告，权限是锁）。
- **注入根因**：模型分不清指令和数据，role 只是分类符；LLM 世界没有"参数化查询"解药，Prompt Injection 连续两年居 OWASP LLM 风险榜首。
- **三条注入路径**：工具结果藏指令（间接）、用户输入带指令（直接）、可信表面被投放（内网知识库投毒）。
- **确认闸门管不住注入**：闸门在第③环管"做不做"，注入在第①环"想错了"就已完成；防线必须前移到参数层。
- **白名单优于黑名单**：只说"什么可以进"；校验强度跟参数熵走；拒绝信息写清"什么是对的"回喂模型自纠；白名单事实来源是服务端。
- **代码执行类三道闸**：字符白名单 → 语法树白名单（ast.parse，全程不用 eval）→ 长度上限；校验失败返回错误结果而非抛异常，与运行时兜底分开审计（error:rejected）。
- **工程纪律**：两段式校验（先 schema 形状后语义值）挂在必经之路，agent 主循环一行不改；29 项断言自检全过。

## 正文

见 [[Assets/2026/10/agent-tool-security-whitelist.md]]（全文约 3 万字符，含完整改动代码与 selfcheck 测试）。

## 来源

- [Agent - 工具全谱系与安全边界（10）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095930576318551219)

## 附件

- [[Assets/2026/10/agent-tool-security-whitelist.md]]
