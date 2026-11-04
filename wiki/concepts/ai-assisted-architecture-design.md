---
id: wiki-concept-ai-assisted-architecture-design
type: concept
title: AI 辅助架构设计（方案起草 / 评审预检 / Trade-off 分析 / 接口建模）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - ai-assisted
  - architecture
  - methodology
  - review
sources:
  - raw/sources/ai/2026-11-03-weixin-ai-architecture-design.md
related:
  - wiki/concepts/architecture-tradeoff-methodology.md
  - wiki/concepts/architecture-design-capabilities.md
  - wiki/concepts/rule-engine.md
  - wiki/concepts/prompt-engineering.md
  - wiki/sources/2026-11-03-weixin-ai-architecture-design.md
---
# AI 辅助架构设计（方案起草 / 评审预检 / Trade-off 分析 / 接口建模）

## Definition（定义）

AI 辅助架构设计是指用 LLM 在技术方案生命周期的四个环节扩展架构师认知带宽的工作方式：① 方案起草（需求摘要+技术约束→方案初稿）；② 评审预检（评审前对方案做多维度完整性检查）；③ Trade-off 分析（生成量化对比矩阵辅助选型决策）；④ 接口与建模辅助（API/物模型/数据库建模/SQL 审查）。核心立场：AI 不替代架构师判断力，而是"扩展认知带宽"——方案维度太多（性能、可用性、安全性、扩展性、成本、运维复杂度），每个权衡影响后续几个月甚至几年，人的认知带宽有限是三个老大难场景（写方案到半夜、评审会默契沉默、A/B 方案之争）的共同根因。

## Why It Matters（为什么重要）

- 写方案最痛苦的不是思考而是把思考转化为文档；AI 初稿提供"80 分起点"，比从零写快得多（信源论断）。
- 评审会上发现问题太晚（方案通过后才发现 MQ 积压、写入吞吐问题）；AI 预检把讨论从"从头读文档找问题"变成"聚焦已发现的问题逐一确认"（信源论断）。
- 没有结构化对比框架时，A/B 方案之争往往以"先上 B 后面再优化"（然后没有后面）收场；对比矩阵让 trade-off 可讨论（信源论断）。
- 与 [[architecture-tradeoff-methodology]] 互证："没有完美的架构，只有特定约束下的最优解"，AI 的作用是把约束显性化。

## Core Characteristics（核心特征）

1. **四角色分工**：方案起草助手、评审预检员、Trade-off 分析师、接口与建模辅助（信源框架）。
2. **约束优先的提示词设计**：方案生成提示词 = 角色 + 需求摘要 + 技术约束 + 输出要求；不给技术栈/部署方式/数据规模时输出"正确的废话"，约束越具体方案越可用（信源论断）。
3. **九维度评审预检清单**：单点故障、容量评估、数据一致性、安全方案、异常处理、可观测性、扩展性、向后兼容、技术风险；预检输出 ✅ 通过 / ⚠️ 需关注 / ❌ 缺失 + 改进建议 + 技术债标注 + 整体评分（1-10）（信源框架）。
4. **量化对比矩阵**：从开发复杂度、性能、规则灵活性、运维成本、团队熟悉度、私有化交付复杂度、扩展性等维度给候选方案打分，把"我觉得 A 好"变成可辩护的比较结论（信源论断）。
5. **辅助不决策**：AI 可能给出看似合理但实际有坑的建议（如推荐不熟悉的中间件却不提运维复杂度）；最终决策权必须在人手里，"AI 是参谋不是指挥官"（信源论断）。

## Structure（结构）

AI 辅助架构设计的工作流（信源归纳，解读）：

方案初稿（AI 起草，8 项输出要求）→ 评审预检（9 维度检查）→ 选型决策（对比矩阵 + 人拍板）→ 细节设计（API/物模型/建模/SQL 审查）→ 度量（编写耗时 / 一次通过率 / 线上架构问题 / 技术债识别率）。

## How It Works（运作方式）

- **方案生成**：输入需求摘要 + 技术约束（示例：AIoT 告警规则引擎重构——百万设备 MQTT/CoAP 接入、物模型动态规则、边云协同下发、2 秒触达；约束：Spring Boot+MyBatis+MySQL+Redis、K8s、SaaS/私有化双形态、RocketMQ+EMQX、日均 5 亿告警日志/20 亿遥测），输出 8 项：架构选型说明、模块划分及职责、关键流程时序、RESTful 接口草案、数据模型（含分表策略）、容量评估与性能指标、异常处理与降级、已知风险与应对。
- **评审预检**：把方案文档喂给 AI，以"架构评审委员会专家"角色逐项检查 9 维度并给出分级结论；带着预检报告上会，聚焦 ⚠️/❌ 项确认。
- **Trade-off 分析**：输入候选方案，AI 生成对比矩阵（示例：Drools vs 自研表达式引擎 vs Flink CEP——性能 4/5/5 星、规则灵活性 5/3/4 星、运维成本低/低/高、私有化交付低/低/高、扩展性 4/3/5 星），评审讨论转为维度级比较。
- **接口与建模**：RESTful 规范检查（URL 命名/HTTP 方法语义/状态码/分页排序统一）；物模型定义检查（属性/事件/服务命名、数据类型取值、南北向对齐）；接口契约生成（数据模型→Swagger/OpenAPI；MQTT Topic 层级/通配符/QoS 审查）；数据库建模（范式/索引/字段类型；海量遥测分库分表键 device_id 还是时间维度、冷热分层归档）；SQL 审查（执行计划、索引优化、慢查询识别）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[architecture-tradeoff-methodology|架构取舍方法论]]：本概念页"约束显性化、特定约束下的最优解"是其"四问前置/约束求解"在 AI 辅助场景的实例与互证（2026-11-04 新增信源）。
- [[architecture-design-capabilities|架构设计能力（8 个底层动作）]]：AI 起草/预检/矩阵分别外部化"抽象/分解/契约/权衡/适配约束"等动作；本页是工具层，该页是判断层。
- [[rule-engine|规则引擎]]：本文的 Drools vs 自研表达式引擎 vs Flink CEP 选型矩阵为 AIoT 规则引擎场景提供技术选型视角（该页现有内容偏 B 端产品视角）。
- [[prompt-engineering|提示工程]]：本文两份提示词（角色+约束+输出要求；专家角色+逐项检查+评分）是提示工程在架构任务的具体模式。

### Dependencies（依赖项）

- 有效的技术约束输入（无约束则输出"正确的废话"）；团队级技术方案模板（背景/目标/方案设计/接口定义/数据模型/风险评估）；ADR 记录实践。

### Distinctions（区分）

- 与"AI 自动生成架构文档"：本概念强调 AI 是参谋不是指挥官，最终决策权在人；AI 输出是初稿与检查清单，不是定稿。
- 与 [[ai-native-sdlc-playbook]]：本页聚焦设计环节，非全流程 SDLC 转型。

## Evolution（演进）

- 2026-11-04：本页由单一信源（《AI赋能研发效能系列》设计篇，微信公众号）建立。confidence: medium——单一二次信源、作者身份未标注；四角色/九维度为作者框架、非标准化分类。

## Open Questions（开放问题）

- 四角色与九维度清单是否完备、各维度权重如何，信源未量化；需更多 AI 辅助架构实践信源校准。
- "AI 初稿 80 分起点"无评估方法与基线；四项度量指标（编写耗时/一次通过率/线上架构问题数/技术债识别率）无目标值。
- ADR 作为落地建议被提出，但 Wiki 尚无独立 ADR 概念页（现有 [[architecture-description-metamodel]] 仅顺带提及）；待有专门信源时立页。
- 对比矩阵的星级评分主观性如何降低（如改为实测指标），信源未涉及。

## Evidence（证据）

- Source: `raw/sources/ai/2026-11-03-weixin-ai-architecture-design.md`（微信公众号 · AI赋能研发效能系列第 3 篇，单信源；四角色/九维度/矩阵/度量为作者经验总结）

## Related Knowledge（相关知识）

- [[2026-11-03-weixin-ai-architecture-design|信源页：AI辅助架构设计：技术方案评审的智能搭档]]
- [[ai-rd-efficiency-series-album|AI 赋能研发效能系列（专辑页）]]
- [[architecture-tradeoff-methodology|架构取舍方法论（概念页）]]
