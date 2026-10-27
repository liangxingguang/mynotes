---
id: 2026-10-27-harness-engineering-11-agents-study
title: 从 11 款 Agent 的源码研究，看懂 Harness Engineering
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/8Z1uHMWIpQ7D9oXN9bV8GQ
source_type: link
platform: 微信公众号
created: 2026-10-27
category: 技术
tags: [Harness, AI Coding, 工程实践]
asset_ref: Assets/2026/10/harness-engineering-11-agents-study.md
wiki_status: ingested
---

# 从 11 款 Agent 的源码研究，看懂 Harness Engineering

> 基于《Harness Engineering》论文（分析 11 个 Coding Agent、约 400 万行源码）的架构解读：Agent ≈ Model + Harness，Harness 负责把模型决策转化为可靠执行。文章拆解 Harness 的七个观察面（执行循环/模型适配/工具/上下文/权限/多 Agent/扩展），辨析 Skills、MCP、ACP 分工，给出从最小系统走向可靠交付的演进路径与单变量评测方案。

## 核心要点

- **核心分工**：模型提出计划和动作，Harness 组织上下文、执行工具、控制权限、维护状态；源码研究的价值是揭示设计空间而非排名产品
- **研究统计**（样本内）：0/11 直接用通用 Agent 框架、0/11 内置向量检索源码、9/11 支持 Skills、8/11 支持 MCP、6/11 支持 ACP
- **检索策略**：先用关键词/符号/LSP 建可靠基线，向量检索不是对立面而是补充；索引新鲜度是所有方案的共性问题
- **极简循环**：Mini-SWE-Agent 百行核心即达 SWE-bench 74%，但真实复杂度来自故障、权限、资源与交互，类似 TCP Echo vs 生产服务
- **三种机制**：Skills=打包任务说明（不授权限）、MCP=连接工具与上下文（非运行时）、ACP=客户端-Agent 交互协议（非 Agent 间协作）
- **长程可靠性**：信息分三层（工作上下文/任务状态/持久知识）；压缩摘要不能扭曲事实；记录事件 ≠ 可安全重放，外部写入需幂等键
- **安全四层**：请求校验→授权决策→执行约束→审计恢复；审批与沙箱是不同概念；首版就应有安全基线而非后补
- **演进路径**：先建可靠单 Agent 基线 → 用真实失败驱动状态/恢复能力 → 再评估检索/扩展/并行 → 评测用单变量实验（B0~B5）隔离组件贡献

## 正文

正文约 1.5 万字符，完整抓取稿见附件 [[Assets/2026/10/harness-engineering-11-agents-study.md]]。

章节结构：

1. 11 个系统揭示了什么（研究范围与统计口径）
2. Harness 是把模型决策转化为可靠执行的系统（七个观察面）
3. 代码检索：优先建立可靠基线
4. 极简循环有价值，但不代表完整产品成本
5. Skills、MCP 与 ACP 分别解决什么问题
6. 长程可靠性：摘要、任务状态和外部事实分层
7. 安全与验收必须从第一次执行就进入设计
8. 多 Agent：由任务边界决定是否使用
9. 平台化已有实例，但运行时复用不等于完整兼容
10. 从最小系统走向可靠交付（B0~B5 单变量评测）
11. 可靠性来自每一次动作都有依据

## 来源

[从 11 款 Agent 的源码研究，看懂 Harness Engineering](https://mp.weixin.qq.com/s/8Z1uHMWIpQ7D9oXN9bV8GQ)（微信公众号）

## 附件

- [[Assets/2026/10/harness-engineering-11-agents-study.md]]（抓取正文，约 1.5 万字符，browser 级抓取）
