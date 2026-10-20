---
id: wiki-source-deepseek-harness-7day-day1
type: source
title: 7天学懂 DeepSeek Harness 实操手册（Day 1：装好之后的第一小时）
status: active
created: 2026-10-20
updated: 2026-10-20
confidence: medium
tags:
  - source
  - ai-agent
  - tutorial
  - deepseek
sources:
  - raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md
related:
  - wiki/entities/deepseek-harness.md
---
# 7天学懂 DeepSeek Harness 实操手册（Day 1：装好之后的第一小时）

## Overview（概览）

微信公众号 7 天系列教程的第 1 天，面向"装好了不敢下手"的新手：认识 [[deepseek-harness]] 界面五站、申请并填入 DeepSeek API key、在四种模式中选标准模式，三件事走完即可开工。后续六天主题为派活、分身、排错、插件、换脑、造扳手（本文不含）。

## Key Facts（关键事实）

- DeepSeek Harness v0.2 预览版于 9.29 发布，提供 macOS 与 Windows 桌面端安装包。
- Harness 是调用 DeepSeek 模型的桌面 Agent 客户端（"工位"），模型按量计费，需在 DeepSeek 开放平台创建 API key 并充值。
- API key 只在创建时显示一次，须立即复制保存；作者强调 key 等同钱包密码（不发群、不截图、不外传，泄露即重置）。
- 界面五站：模型选择器（Flash/Pro 两档，推理等级控制思考深度）、派活输入框、工作区路径、右上角模式按钮、齿轮设置。
- 四种模式本质是四套出厂预设模板：标准模式（文件/Shell/搜索/计划/子 Agent/工作流全配齐，新手默认）；PTC 模式（把多次工具调用打包成一段程序跑，省 token 但调试难）；极简模式（仅命令行+文件编辑，用于裸测新模型）；创造模式（自检并自造插件/模式）。
- 自检指令模板："报告当前工作状态：当前模式和模型；有哪些能力和插件（按用途分组）；当前工作区路径是否指向 ____；不确定的说不确定"——装插件前后各跑一次可对比差异。
- 三大新手坑：工作区路径没核对、误切极简模式嫌模型笨、测试无反应（先查 key 再查余额）。

## Important Claims（重要论断）

### Claim 1：新手第一小时只需"认全五个地方、插好一把钥匙、选对一个预设"

作者把入门路径压缩为界面动线 + API 配置 + 模式选择三件事，主张"第一小时多花的十分钟，后面六天都会省回来"。

### Claim 2：PTC 模式建议标准模式用满一个月后再碰

PTC 打包执行减少对话轮次、省 token，适合几百个文件批量检查改写等大量重复工具往返场景，但调试门槛高。

## Concepts Introduced（引入的概念）

- Agent 客户端的"模式即预设模板"设计（四种模式 = 四套出厂预设，非四种功能）
- PTC（Programmatic Tool Calling，多次工具调用打包为一段程序执行）

## Entities Mentioned（提及的实体）

- [[deepseek-harness]]（DeepSeek Harness 桌面 Agent 客户端）
- DeepSeek（模型提供方与开放平台运营方，未单独立页）

## Implications（影响／启示）

"模式=预设模板"与"开工前自检指令"是可迁移的 Agent 客户端使用范式：先让 Agent 自报模式/模型/插件/工作区，再派活，可避免大量低级事故（解读：该自检模式同样适用于其他 Agent CLI）。

## Limitations（局限）

- 入门教程，仅覆盖 Day 1；v0.2 为预览版，界面与模式设计可能随版本变化。
- 信源为微信公众号教程（作者同时计划出品多个付费向专栏手册），内容偏操作指引，无性能或对比数据。

## Related Knowledge（相关知识）

- [[deepseek-harness]]

## Source（信源）

- `raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md`
