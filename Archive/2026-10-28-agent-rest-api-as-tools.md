---
id: 2026-10-28-agent-rest-api-as-tools
title: Agent - 后台API变成工具（8）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095575551146718898
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-rest-api-as-tools.md
wiki_status: ingested
---

# Agent - 后台API变成工具（8）

> Agent 系列第 8 篇：把真实 REST 接口变成 agent 工具——百行 FastAPI 假后台 + 登录/查用户/查角色/分配角色四工具，收口里程碑 M2（一句话"把张三提升为管理员"自动完成全链路）。

## 核心要点

- **最小目标服务**：先用百行内存数据 Python 脚手架当练手靶子而非直连真实后台——可重启重置、随时重演错误场景；agent 只通过 HTTP 看后端，将来接真后台只改 BASE_URL 一行。
- **工具形状不变**：函数体从本地计算换成 HTTP 封装，但对 loop 仍是"名字 + JSON Schema + 返回 dict 的函数"；循环眼里没有"远程"，只有函数。
- **认证四件事**：登录做成工具由模型自调（失败可自纠）；token 存进程内存不进 prompt/日志（login 返回前摘除）；`_call()` 统一注入 Authorization 头；执行顺序写进工具描述（描述即流程）。
- **错误回喂**：HTTP 4xx/5xx 拆 FastAPI `{"detail"}` 信封回结构化 dict（模型看 status 决定重登/换 ID）；连接失败回可操作提示；本地回环要绕过系统代理。
- **凭证纪律**：演示账号写描述里，生产走环境变量；对话里传密码会被日志记忆留痕，是反模式。

## 正文

见 [[Assets/2026/10/agent-rest-api-as-tools.md]]（全文约 3.8 万字符，含 mock_backend 与 admin_tools 完整代码、curl 实测与 M2 闭环）。

## 来源

- [Agent - 后台API变成工具（8）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095575551146718898)

## 附件

- [[Assets/2026/10/agent-rest-api-as-tools.md]]
