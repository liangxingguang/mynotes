---
id: wiki-concept-plan-mode
type: concept
title: 计划模式（Plan Mode）
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: medium
tags:
  - concept
  - ai-agent
  - workflow
sources:
  - raw/sources/ai/2026-11-20-claude-code-miniprogram.md
related:
  - wiki/concepts/ai-coding-delivery-four-stages.md
  - wiki/sources/2026-11-20-claude-code-miniprogram.md
---
# 计划模式（Plan Mode）

## Definition（定义）

计划模式是一种"先分析、后动手"的 AI 编程交互模式：让 AI 先读取现有项目、给出开发方案，在方案定稿并获人工确认之前不修改任何项目代码。在 Claude Code 中通过 Shift + Tab 切换至 `plan mode on`，输入需求后模型只输出开发方案，把需要决策的细节逐项列出确认，人工批准方案后才退出计划模式进入开发。

## Why It Matters（为什么重要）

用 AI 编程时一个功能可能来回改好几轮仍不符合预期，根因常是还没确认 AI 对需求的理解，就让它开始写代码。计划模式把"理解对齐"前置为显式步骤：有偏差先调整方案，确认模型理解的与想做的一致再动手，直接减少理解偏差造成的返工。

## Core Characteristics（核心特征）

1. **只读分析、不落改动**：方案定稿前不修改项目代码，需求描述中明确要求"先只输出开发方案……先不要修改项目代码，等我确认方案后再开始开发"。
2. **先读现状再出方案**：模型先读取现有项目结构（页面与文件），沿用现有模板与结构给出方案，不另外创建项目或引入框架。
3. **决策细节逐项确认**：方案定稿前，模型把需要人工决定的细节逐项列出，逐项选择（如添加物品用"独立添加页"还是其他交互形式、模板演示代码"清理掉"还是保留），顶部 Submit 处汇总核对后通过 `Submit answers` 统一提交。
4. **确认后才执行**：方案符合预期后按回车批准，模型退出计划模式、以自动模式开始开发，减少中途常规确认提示；开发结束给出完成摘要（修改了哪些文件、实现了哪些功能）。

## Structure（结构）

```
切换 plan mode on（Shift + Tab）
        ↓
粘贴带约束的需求描述
        ↓
模型读取项目结构 → 列出待确认细节 → 逐项选择 → Submit answers
        ↓
模型输出完整开发方案（页面安排 / 数据保存 / 分步计划）
        ↓
人工读方案、提出调整（可要求中文解释细节）
        ↓
批准方案 → 退出计划模式 → 自动模式开发 → 完成摘要
```

## How It Works（运作方式）

1. **进入模式**：终端中按 Shift + Tab 切换，直到输入区下方显示 `plan mode on`（切换次数随当前模式变化，以界面显示为准）。
2. **输入需求**：粘贴需求时把范围、排序、状态、存储与"本次不做"清单一次写清，并显式声明"先只输出开发方案、不修改代码"。
3. **方案确认**：模型先读项目，返回模板分析（找到已有页面与文件），再列出待决策细节；逐项选择后在 Submit 处核对、`Submit answers` 提交，模型整理完整方案。
4. **批准开发**：读方案确认符合预期（需要时直接说明调整、或请模型解释代码细节），批准后进入开发；完成后对照方案检查完成摘要。

## Relationships（关系）

### Related Concepts（相关概念）

- [[ai-coding-delivery-four-stages|AI Coding 交付四环节（意图/上下文/评审/评估）]]：计划模式是"意图"环节在单人交互场景下的具体形态——先对齐可执行规格，再动手。

### Dependencies（依赖项）

- 依赖可读的现有项目结构（模型要"沿用现有模板"）；依赖需求描述本身完整（范围、状态规则、存储方式、不做清单缺一不可）。

### Distinctions（区分）

- 与直接进入自动模式开发不同：计划模式把"理解对齐"作为硬性前置，代价是多一轮方案确认，收益是减少返工与方向性错误。

## Evolution（演进）

- 2026-11-20：微信教程《零代码，我用 Claude Code 做小程序》系统演示该模式的完整操作链（切换、需求模板、逐项确认、Submit answers、批准开发），作为 Claude Code 的标准交互方式被记录。

## Open Questions（开放问题）

- 计划模式对大型/多文件任务的方案粒度如何把握：教程以单人小程序项目为背景，跨模块改动的方案分解未见系统讨论。
- 与其他 AI 编程工具的"规划/审批"类交互的对应关系：本信源仅覆盖 Claude Code。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-20-claude-code-miniprogram.md`

## Related Knowledge（相关知识）

- [[2026-11-20-claude-code-miniprogram|零代码，我用 Claude Code 做小程序（信源页）]]
- [[ai-coding-delivery-four-stages|AI Coding 交付四环节（意图/上下文/评审/评估）]]
