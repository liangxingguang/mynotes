---
id: inbox-2026-11-20-helixharness-ai-coding
title: AI Coding 进入 Harness 阶段：滴滴开源 HelixHarness 如何组织 AI Coding 工作流
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/y03a6MwhbU0NmLfXO-XjRQ
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/wechat-y03a6MwhbU0NmLfXO-XjRQ.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-20T22:20:28.102Z"
ingest_claim_id: 41032-1795213228102-0
---

> **摘要**：滴滴开源 HelixHarness，不是又一个 Coding Agent，而是建在 Codex/Claude Code 之上的项目级 Harness——让 Agent 遵守工程规范、按流程研发、留下可验证结果。区分三层：Agent Runtime（模型调用与会话，如 Codex）、Agent Harness（约束、工作流、质量检查与完成标准，即 HelixHarness）、业务能力层。核心是三阶段工作流 Propose→Apply→Archive：需求转 Spec/Tasks 契约、执行不等于完成（以测试证据判定验收）、核对后归档并沉淀经验。九个命令（init/propose/apply/archive/bug-fix/ut/update/status/config）支持 Codex 与 Claude Code，--loop 可串联三阶段并在人工决策或阻断时暂停。配套平台以 Base/Candidate 对比评测"Harness 版本对工程行为的影响"，自进化由人决策采纳。

## 核心要点

- **定位**：底层 Coding Agent 已具备写代码、运行命令、改文件的能力，HelixHarness 解决的是"怎样让 Agent 遵守工程规范、按流程研发、留下可验证可复用结果"——约束、工作流、任务状态、质量检查、完成标准。
- **三阶段工作流**：
  - **Propose**：自然语言需求转为可执行契约——读取工程约束与项目知识，确认需求范围与验收条件，生成 `spec.md` + `tasks.md`（如接口测试转为测试契约：范围、前置条件、场景、验收条件、交付工件）。
  - **Apply**：执行≠完成——代码生成不代表需求完成，测试脚本跑完不代表测试通过（断言不符、未收集到用例、HTTP 200 但业务状态不对等陷阱）；需以证据链判定：用例生成检查→有效用例收集→覆盖达标→执行达标→证据完整→报告校验。
  - **Archive**：核对完成条件并把需求证据迁入归档区；稳定经验经人工确认后沉淀为项目知识；实现经评审后再次变更时须识别变化，不能把未评审内容标记为已评审（证据一致性：验证对象必须与交付对象一致）。
- **九个命令**：init / propose / apply / archive / bug-fix / ut / update / status / config，位于对话界面而非 Shell 可执行程序；`--loop` 串联 Propose→Apply→Archive，遇人工决策或真实阻断停止，可按需求名续跑。
- **任务恢复**：工件落盘于 `docs/specs/active|completed`、`docs/harness/knowledge`、`eval/`，不依赖对话记忆，换会话可凭磁盘上的工作流状态、Spec、验证证据恢复工作。
- **上下文按需加载**：`docs/harness/index.md` + `docs/knowledge/index.md` 三列索引（文件/定位/加载时机）决定 Agent 读哪些知识；Propose/Apply/Archive 各阶段加载策略不同，未登记文件不允许绕过索引猜测读取——规则驱动的上下文选择，依赖索引完整性。
- **Workspace 多仓协调**：`/helix:init --workspace --repos ./api-service ./web-console` 支持跨仓库需求，各仓保留独立 Spec 与验证依据。
- **平台评测对象是 Harness 本身**：同 Agent 在不同 Harness 版本下的工程表现差异，Base/Candidate 冻结框架版本与场景对比评测；自进化不自动发布，修改采纳由人决定；Demo 为合成数据，不能据此认定真实质量提升比例。
- **与 Superpowers/OpenSpec 的区别**：Superpowers=研发 Skills 方法，OpenSpec=规范驱动变更，HelixHarness=项目 Harness 工程体系（Propose/Apply/Archive + 知识索引 + 证据门禁 + 持续评测），三者可组合不互斥。

## 正文

完整正文见 [[Assets/2026-11/wechat-y03a6MwhbU0NmLfXO-XjRQ.md]]。全文含架构子项目划分（helixharness/ 开发者插件 + helixharness-platform/ 维护者观测评测）、接口测试场景的契约映射示例、目录结构与命令用法。项目仓库：https://github.com/didi/helixharness

## 来源

- [AI Coding 进入 Harness 阶段：滴滴这套开源框架提供了新思路（HelixHarness）](https://mp.weixin.qq.com/s/y03a6MwhbU0NmLfXO-XjRQ)

## 附件

- [[Assets/2026-11/wechat-y03a6MwhbU0NmLfXO-XjRQ.md]]
