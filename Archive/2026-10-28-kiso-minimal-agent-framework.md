---
id: 2026-10-28-kiso-minimal-agent-framework
title: 我开源了一个极简 Agent 框架，叫 Kiso
source: 知乎专栏
source_url: https://zhuanlan.zhihu.com/p/2085299067861595529
source_type: link
platform: zhihu
created: 2026-10-28
category: 技术
tags: [AI, Harness, 工程实践]
asset_ref: Assets/2026/10/kiso-minimal-agent-framework.md
wiki_status: ingested
---

# 我开源了一个极简 Agent 框架，叫 Kiso

> 作者自研极简 Coding Agent 框架 Kiso 的设计复盘：从"更简单、更稳定、更省 token"出发，最终收敛为 Agent Runtime——模型负责扩大问题空间，Runtime 负责限定"什么才有资格被称为事实"。核心机制：Event Log 执行账本、Context 投影观、只读证明式权限、2,200 行内核门禁，附与 Pi 的 48 对 Benchmark。

## 核心要点

- **出发点转变**：超越"比 Pi 更少工具/token"的极简竞赛，聚焦更底层问题——概率模型改变现实后，系统凭什么知道什么真的发生过（Observed≠Current、Intent≠Effect、Started≠Succeeded、Completion≠Goal、Memory≠Fact）。
- **执行账本（Fail-Stop）**：Session 建立在 append-only Event Log 上；Turn Commit 与 Persist Before Effect 两道边界；崩溃后 STARTED 无 receipt 的 execution 标记 `uncertain` 交人裁决——Ambiguity Never Auto-Repeats；Event Log is the truth，其余皆投影（含 `kill -9` 实测恢复）。
- **Context 是投影不是事实**：撤掉固定比例 microcompact（破坏 prompt cache 前缀，省 3 万 token 可能让 20 万 token 重新 prefill）；Summary Compaction 设 Soft 400K / Hard 700K / Raw Tail 100K，Soft 只算 Eligible、等自然阶段边界；In-Band Summary 复用原前缀保缓存。
- **工具设计**：`shell` 而非 `bash`（清洗环境变量防 key 泄漏）；权限不靠危险黑名单而靠"可证明只读才放行"，Unknown≠Safe；`read_file` 200 行/16K 字符预算 + revision 回传，写操作带 expectedRevision 防过期观察覆盖新现实。
- **权限与裁判分离**：五种运行模式（default/accept-edits/plan/dontAsk/bypass），dontAsk 是把需确认项直接 deny 而非全放行；ask_user 只在有交互 bridge 时进入动作空间；子 agent 权限受限且完成与否需父会话独立验收——执行者与裁判者不能是同一个概率系统。
- **2,200 行内核门禁**：Kernel 只留做错就会改变事件顺序/行动资格/因果承诺的决定，防中央 Loop 长成 Blob；但作者诚实指出 TCB 远大于内核。
- **Benchmark 诚实复盘**：vs Pi 48 对任务，跨文件与隐藏题打平，隐藏题省 32% 成本、长会话贵 19%——追查发现根因是 edit_file 缺 append 原子操作导致失败重试，而非直觉猜测的 read_file；"防御机制正确触发 ≠ 接口设计得好"。

## 正文

见 [[Assets/2026/10/kiso-minimal-agent-framework.md]]（全文约 1.4 万字符，含因果链图、崩溃恢复流程与 Benchmark 细节）。

## 来源

- [我开源了一个极简 Agent 框架，叫 Kiso · 知乎专栏](https://zhuanlan.zhihu.com/p/2085299067861595529)

## 附件

- [[Assets/2026/10/kiso-minimal-agent-framework.md]]
