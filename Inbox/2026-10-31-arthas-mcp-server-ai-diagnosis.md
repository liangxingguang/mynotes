---
id: 2026-10-31-arthas-mcp-server-ai-diagnosis
title: Arthas 官方 MCP 实测：29 个诊断命令交给 AI，凌晨排查省 40 分钟
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/P4Baj-4PX5nQVrVOmXijQg
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - AI
asset_ref: Assets/2026/10/arthas-mcp-server-ai-diagnosis.md
wiki_status: pending
---

# Arthas 官方 MCP 实测：29 个诊断命令交给 AI，凌晨排查省 40 分钟

> 摘要：Arthas 4 官方内置 MCP Server（实验性模块），把 29 个诊断命令封装为 AI 可直接调用的工具，排查瓶颈从「命令层」转移到「问题层」。本文实测三步接入（开启端点 → 客户端配置 → 人话对话），用 CPU 98% 订单服务案例对比传统 45 分钟 vs AI 5 分钟，并给出生产红线（watch 加过滤、redefine 只止血、端点必设密码+审批）、六个坑速查表与上线 Checklist。

## 核心要点

- **痛点**：Arthas 诊断能力强但「症状 → 命令 → 输出 → 结论」全链要人翻译，命令多参数杂、OGNL 易写错、堆栈一屏难读，凌晨排查 40 分钟耗在命令层。
- **解法**：Arthas 4 官方 MCP Server（非第三方封装），跑在 Arthas 进程内，把诊断能力暴露为 HTTP 端点（默认端口 8563、路径 `/mcp`，Streamable HTTP，协议对齐 MCP 2025-06-18），AI 客户端可直接调用。
- **底层引擎不变**：Instrumentation API + ASM 字节码织入，零代码改动零重启；变的只是入口——从人敲命令到 AI 按剧本驱动。
- **29 个工具分四类**：JVM 与运行时 13 个（dashboard、thread、heapdump 等）、类与类加载器 8 个（sc、sm、jad、redefine 等）、监控与剖析 6 个（monitor、stack、trace、tt、watch、profiler）、辅助 2 个（options、viewfile）；支持 JDK 8+（含 17/21）。
- **三步接入**：① `arthas.properties` 设 `mcpEndpoint=/mcp`、`mcpProtocol=STREAMABLE`（长命令）/`STATELESS`（一次性查询）、`password`；② 客户端 `mcp.json` 配 streamableHttp + Bearer Token；③ 对 AI 说一句人话。curl `localhost:8563/mcp` 验证。
- **实战案例**：CPU 98% 订单服务——AI 按 thread(-n 5) → thread 29 → 读堆栈 → 结论人话 + 止血方案，5 分钟定位到脱敏正则贪婪 `.*` 触发的灾难性回溯（请求体 >10KB 指数级回溯），传统流程要 45 分钟。
- **生产红线**：高频方法 watch 必加 `-n` 或 `#cost > 阈值` 过滤（`-x` 最多 3 层）；redefine 仅当前 JVM 生效只作临时止血；MCP 端点必须设密码并绑定 `--target-ip 127.0.0.1`；客户端开启工具调用审批逐条确认；viewfile 白名单不轻易放开。
- **成本账**：单次省 40 分钟 ≈ 0.67h，中等团队月省约 1,540 元/人，5 人团队年省约 9.2 万；更值的是 MTTR（挂 45 分钟 vs 5 分钟的资损差异）。
- **信号意义**：诊断工具从「人驱动命令行」向「AI 驱动标准化协议」迁移——排查门槛从「背得住命令」降到「描述得清症状」；但 AI 可替你敲命令，不能替你背锅。

## 正文

配置细节：`arthas.properties` 三行（端点、传输模式、密码）→ 客户端 mcp.json 配 Bearer → 对话即用。慢接口排查 prompt 模板：先 thread 看最忙 5 线程 → trace createOrder（>500ms、最多 20 次）→ stack 看调用来源 → 人话结论；可让 AI 调 `jad` 反编译确认线上版本。

坑速查：连不上先查端点配置；401 是 Bearer 与密码不一致；watch 长命令无响应换 STREAMABLE；本地重启断连装 arthas-workbench 插件；AI 结论不敢信就让它贴原始输出。

## 来源

- 原文：https://mp.weixin.qq.com/s/P4Baj-4PX5nQVrVOmXijQg
- 抓取方式：web-fetch（Playwright 渲染，7,009 字符）

## 附件

- [[Assets/2026/10/arthas-mcp-server-ai-diagnosis.md]]（抓取正文）
