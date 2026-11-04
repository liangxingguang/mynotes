---
id: wiki-concept-ai-assisted-requirements-analysis
type: concept
title: AI 辅助需求分析
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: medium
tags:
  - concept
  - ai
  - requirements
  - ai-assisted
  - product
sources:
  - raw/sources/ai/2026-11-03-weixin-ai-requirements-analysis.md
related:
  - wiki/concepts/demand-review-sop.md
  - wiki/concepts/demand-research-sop.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/sources/ai-rd-efficiency-series-album.md
---
# AI 辅助需求分析

## Definition（定义）

用 AI 辅助需求阶段的四个环节（需求拆解与用户故事生成、需求文档自动撰写、需求评审智能查漏、需求变更影响分析），核心定位是扩展需求人员的认知带宽而非替代决策：AI 生成→人工审核→确认采纳。

## Why It Matters（为什么重要）

需求的"漏斗效应"使上游模糊点在下游放大为三个问题、五次返工、十倍成本；而需求分析的工作量（用户场景、业务规则、边界条件、异常流程、历史兼容的交叉组合）远超个人认知带宽，靠人脑逐一覆盖遗漏是必然的。AI 在源头把"差不多"变成"精确无误"，价值高于在下游补救。

## Core Characteristics（核心特征）

1. **漏斗效应与代价数据**：56% 项目缺陷源于需求阶段（IBM 统计，二次引用）；需求错误后期修复成本 10x；30% 需求变更可被提前识别。
2. **四环节**：①需求拆解与用户故事生成（一句话需求→用户故事列表+验收标准+依赖关系）②需求文档自动撰写（PRD 初稿：流程图描述+接口建议+数据模型）③需求评审智能查漏（逐条检查完整性）④需求变更影响分析（影响半径：受影响模块/要改接口/要更新用例）。
3. **拆解提示词结构**：角色设定（资深产品经理）+需求描述+输出要求（As a/I want/So that、每故事 3-5 条验收标准、标注异常场景与前置依赖、MoSCoW 优先级）+约束（颗粒度 1-3 人天/故事、覆盖正常/异常/边界、不遗漏数据权限场景）。
4. **评审预检五维度**：边界条件缺失、异常流程未定义、需求间冲突、验收标准模糊（"性能要好"不可测量）、权限模型遗漏；输出按 🔴阻塞/🟡重要/🟢建议 排序。
5. **变更影响分析四步**：输入变更描述→AI 分析影响范围（接口层/数据库/前端/测试/文档）→输出影响清单（按模块+工作量估算+checklist）→人工确认决策。
6. **三条落地建议**：建立需求模板而非从零对话（模板即团队需求质量沉淀）；用历史需求做"训练集"；AI 是副驾驶不是自动驾驶（AI 可能编造看起来合理但业务不需要的边界条件）。
7. **度量指标**：需求评审通过率（首次到通过平均轮次）、开发阶段需求变更率、需求到交付周期、测试阶段缺陷归因（需求不明确导致的缺陷占比）。

## How It Works（运作方式）

拆解：传统 1-2 天（含会议）→ AI 30 分钟出初稿人工校验；覆盖维度从依赖个人经验→系统化覆盖正常/异常/边界；依赖关系从排期时才发现→拆解时同步标注前置依赖。评审：评审前先让 AI 对 PRD 做一轮完整性预检，人带着预检结果进评审会，从"从头读文档找问题"变为"聚焦已发现的问题逐一确认"。变更：让 AI 做影响半径分析，人做接受与否、排期调整的决策——"变更不可控，但变更的影响可分析。"

## Relationships（关系）

### Related Concepts（相关概念）

- [[demand-review-sop|B端需求评审SOP]]：人工评审流程（三张表前置冲突、六步顺序、提问三分法）；AI 预检五维度是其前置增强，两者环节衔接。
- [[demand-research-sop|B端需求调研SOP]]：需求分析上游（调研）环节。
- [[ai-native-sdlc|AI 原生 SDLC]]：本概念所属的 AI 重塑研发流程主题。

### Distinctions（区分）

- 与"AI 替代产品经理"区分：信源立场是副驾驶——AI 扩展带宽，决策、审核、采纳始终在人。
- 与下游补救区分：本概念聚焦需求阶段（源头）；缺陷归因数据（56%）说明下游修复成本远高于源头预防。

## Evolution（演进）

- 2026-11-05 — 《AI 赋能研发效能系列》需求篇（第一信源）确立四环节、拆解/评审提示词结构、三条落地建议与四项度量指标。

## Open Questions（开放问题）

- 56%/10x/30% 三个代价数据均为二次引用，原始出处未验证。
- AI 拆解速度对比（1-2 天 vs 30 分钟）为经验值，无对照实验；度量指标未给基线与目标值。
- AI 编造边界条件的识别与拦截机制未展开（仅靠人工审核兜底）。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-03-weixin-ai-requirements-analysis.md`（漏斗效应、四环节、提示词要点、落地建议、度量指标、系列路线）

## Related Knowledge（相关知识）

- [[2026-11-03-weixin-ai-requirements-analysis|AI赋能需求分析（信源页）]]
- [[ai-rd-efficiency-series-album|AI 赋能研发效能系列（专辑页）]]
- [[demand-review-sop|B端需求评审SOP]]
- [[ai-native-sdlc|AI 原生 SDLC]]
