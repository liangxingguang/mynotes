---
id: 2026-10-28-agent-minimal-handwritten
title: Agent - 手写最小 agent（7）
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2095565673804083692
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/agent-minimal-handwritten.md
wiki_status: pending
---

# Agent - 手写最小 agent（7）

> Agent 系列第 7 篇：把前五篇的零件装成"看得懂每行代码"的最小 agent——config/tools/agent 三文件组织、schema 校验、四类错误兜底、reasoning_content 回传，终端跑起里程碑 M1（DeepSeek + openai SDK）。

## 核心要点

- **拼装清单**：五阶段 loop（第 3 篇）+ 消息协议（第 6 篇）+ 模型接入与 key 管理（第 4 篇）+ 工具注册表 + MAX_ITERATIONS 熔断（唯一不依赖模型自觉的终止保险）。
- **schema 即 prompt**：模型只看 name/description/parameters，看不到函数体；写 description 就是写 prompt（"不要凭记忆猜"/"不要心算"）；schema 与实现必须同文件成对维护。
- **最小校验**：查缺必填、类型、enum、schema 外参数；非 strict 模式 schema 只是软约束，执行前必须再校验。
- **禁用 eval**：表达式类工具用 ast 白名单求值器，只放行数字与四则运算节点。
- **错误兜底四类**：幻觉调用（schema 外工具名）、空参坏参（校验拦）、工具异常（try 兜底回喂）、死循环（迭代熔断）；错误不抛出，一律回喂模型自纠。
- **reasoning_content 必须回传**：带 tools 的请求回填 assistant 消息时保留思考内容，否则影响后续推理质量。
- **JSON mode vs function calling**：前者约束输出格式，后者产出调用意图；分工场景辨析。

## 正文

见 [[Assets/2026/10/agent-minimal-handwritten.md]]（全文约 1.8 万字符，含三文件完整代码与 M1 自检）。

## 来源

- [Agent - 手写最小 agent（7）· 知乎专栏](https://zhuanlan.zhihu.com/p/2095565673804083692)

## 附件

- [[Assets/2026/10/agent-minimal-handwritten.md]]
