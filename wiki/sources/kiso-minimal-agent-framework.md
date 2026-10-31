---
id: wiki-source-kiso-minimal-agent-framework
type: source
title: Kiso：极简 Agent 框架（信源页）
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: medium
tags:
  - source
  - ai-agent
  - harness
  - agent-framework
sources:
  - raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md
related:
  - wiki/entities/kiso.md
  - wiki/concepts/durable-execution.md
  - wiki/concepts/context-management.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/harness-engineering.md
  - wiki/entities/pi.md
---

# Kiso：极简 Agent 框架（信源页）

## Overview（概览）

知乎专栏文章，Kiso 作者自述开发一个"比 Pi 更简单、更稳定、更省 token"的开源 Agent 框架的过程。文章从"当概率模型开始改变现实以后，系统凭什么知道什么真的发生过"这一问题出发，给出 Kiso 作为 Agent Runtime 的定位：模型负责扩大问题空间，Runtime 负责限定什么才有资格被称为"事实"。覆盖执行账本（Event Log）、上下文压缩的缓存经济学、工具设计、权限模式、内核门禁与 Benchmark 诚实复盘。GitHub 开源（github.com/vincemakes/kiso），附 42 篇 ADR。

## Key Facts（关键事实）

- 开源信息：仓库 `http://github.com/vincemakes/kiso`；npm 包 `@vincemakes/kiso-code`（`npm install -g @vincemakes/kiso-code`，`kiso` 启动）；首次启动无需 API Key，内置模拟轨迹；崩溃恢复验证命令 `kiso resume`；项目附 42 篇 ADR 与 Benchmark 代码。
- 核心分工（一句话）："模型负责扩大系统能够处理的问题空间，而 Runtime 负责限制什么才有资格被称为'事实'"。
- 五道语义边界：Observed≠Current（认识论）/ Intent≠Effect（因果）/ Started≠Succeeded（持久化）/ Process Completion≠Goal Satisfaction（评价）/ Memory≠Durable Fact。
- 执行账本：Session 建立在只追加 Event Log 上；Turn Commit（整轮 response cleanly exhausted 后才获得执行资格，此前皆为 draft）+ Persist Before Effect（副作用前持久化 `tool_execution_started`，副作用后持久化 receipt）。
- Unknown Effect 处理：STARTED 已持久化但 receipt 缺失时标记 `uncertain`，停在原地等人决定 `rerun` 或 `abandon`——"Ambiguity Never Auto-Repeats"，不确定的副作用永远不自动重试。
- 恢复语义：恢复是纯函数——输入一串 durable events，推导当前唯一安全下一步；无第二份特殊状态机；磁盘上只有 Event Log，Execution Ledger/Session State/Recovery Plan 都是 projection。
- kill -9 实测：PTY 子进程先完成文件修改再执行慢 Shell 命令，对进程组发 SIGKILL；`kiso resume` 后能证明文件修改已完成、被杀 execution 处于 uncertain，人工选择 rerun 后沿原轨迹继续。
- Context 四句式：Event Log = Truth / Context = Projection / Summary = Compressed Projection / Prompt Cache = Projection 的经济属性。
- 缓存经济学：固定比例触发的 microcompact 被撤掉（Primitive 保留但须过 break-even 判断）——历史中间删旧 Tool Result 会让从删除点起的整个 token prefix 失效，可能"为省 3 万旧 token 让 20 万保留 token 重新 prefill"。
- 阈值策略（1M 窗口）：Soft 封顶 400K（进入 Eligible，等自然 phase boundary——刚跑完测试/编辑告一段落——再摘要；400K 是质量取舍非成本最优，更早摘要在部分负载下更便宜）、Hard 封顶 700K 强制处理、保留最近最多 100K Raw Tail 原样。
- In-Band Summary：复用当前 session 已有的系统提示词与消息 prefix，只在末尾追加总结指令，保住 Prompt Cache 前缀命中。
- 工具设计：默认 Coding 工具六个（read_file/list_dir/search_text/write_file/edit_file/shell），Subagents/Skills/Ask/Task/MCP 全部从 Extension 层生长。
- shell 而非 bash：系统 Shell 执行、工作目录绑定 Workspace、子进程环境变量清洗（API Key/Token 不因 `env`/`printenv` 泄漏进 Context）。
- 只读证明式放行：read-only-shell 解析命令，存在反引号/`$()`/subshell/后台执行等无法证明只读的结构直接 abstain；管道/分号每段分别满足；访问 `.env`/凭据路径仍进权限链；`git -c` 类借配置触发外部程序的形式不视为只读——"Unknown 不等于 Safe"。
- read_file 预算：默认 200 行或 16,000 字符（行数保结构、字符预算防单行 JSON/bundle/source map 炸穿窗口；不按 token 是因 tools-node 不应绑定某 Provider 的 tokenizer）；截断发生在完整代码行边界。
- Revision Guard：read_file 返回 content + revision；edit_file/write_file 修改已存在文件须带 revision，执行前重读当前文件，不一致则拒绝要求重新观察——Execution Ledger 防"我到底有没有做过"，Revision Guard 防"我刚才看到的现在还算不算数"。
- 五种运行模式：`default`（证明只读直接放行、副作用进审批）/ `accept-edits`（常规文件修改放行、Shell 等仍校验）/ `plan`（纯只读）/ `dontAsk`（无人值守：所有需人确认的操作直接 deny，模型只能在现有权限内找另一条路，不挂在无人回答的确认框上）/ `bypass`（尽量放行正常操作；但凭据与灾难性路径操作仍有底层保护，"放权是运行策略，灾难底线不是可关的 UI 选项"）。
- 执行者与裁判者分离：ask_user 在有交互 bridge 时进入动作空间，headless/piped 场景该能力干脆不提供（"不知道就是一个合法状态"）；子 Agent 由 Delegate Extension 派生、同为 durable，但可被限制修改路径、高风险能力不提供，且父 Session 持有独立 acceptance check——子 Agent 自己说"完成"不算完成。
- 内核门禁：`packages/core/src` 有效代码不超过 2,200 行（写作时 2,192 行），作为 Tripwire 保护"决策所有权"——每次往 Kernel 塞逻辑必须回答"这为什么属于内核、做错是否改变底层执行语义、Kernel 里有没有东西该先移出去"。
- TCB 诚实披露：小内核 ≠ 系统可靠性只靠内核；崩溃恢复依赖 Store（single-writer/CAS/torn-tail）、进程间锁、OS、文件系统，Revision Guard 在 tools-node，Provider 也可能违反协议。
- 分层结构：Product Shell（CLI/TUI）→ Composition（组装 Provider/Tool/Extension/Store）→ Agent（定义/创建 Session）→ Session（durable conversation + recovery entry）→ Run（一次执行生命周期）→ Kernel Loop（模型与工具间核心驱动语义）+ Store（持久化判决）。
- Benchmark 设计与结果：Kiso vs Pi，相同模型参数、每对任务交替交换执行顺序、每次前恢复干净 Git 仓库；固定任务（跨文件修改、长 Session）+ 随机种子隐藏题；48 对/96 条任务腿。跨文件修改 12:12 双方完成；隐藏随机题双方均 22/24，Kiso 成本低约 32%；长会话 Kiso 反而贵 19%。
- 长会话贵 19% 的根因：Trace 验证推翻"read_file 200 行太保守"假说（任务最长文件仅 132 行，限制从未触发）；真正原因是 edit_file 缺 append 原子操作——360 次编辑 26 次失败（对照 287 次 3 次失败），失败集中在文件末尾追加场景（search 锚点与 replace 内容混在一起）。
- AGI 式子：AGI = Weights（模型权重） + Harness（控制外壳） + Experience Stream（经验流） + Update Mechanism（更新机制）。

## Important Claims（重要论断）

1. **控制流闭环 ≠ 现实闭环**：模型面对持续变化的外部世界，Agent Runtime 必须维护一条崩溃后仍可解释的因果链（Model Intent → Turn Commit → Authorization → Durable STARTED → Real-world Effect → Durable Receipt → Observation/Verification）。
2. **The Event Log is the truth. Everything else is a projection.**（含中文表述"Event Log 是事实，其余都是投影"）
3. **Ambiguity Never Auto-Repeats**：不确定的副作用永远不自动重试，必须人工 rerun/abandon 裁决。
4. **Context 不是事实**：Context 是 Runtime 为下一轮模型调用生成的投影；压缩 Context ≠ 篡改历史；Cache 不是 Agent State，是投影方式在 Provider 侧的成本属性。
5. **只有能够证明只读，才自动放行**（与"Unknown ≠ Safe"同族）：解析器不知道就是不知道，不能默认安全。
6. **工具拒绝正确 ≠ 工具接口设计得好**：模型持续在同一调用模式上失败说明接口缺少合适原子操作（如 append），防御触发不能掩盖接口缺陷。
7. **执行者与裁判者不混同**：模型可提出行动但不能把行动结果写成历史；可执行任务但"完成了"不自动等于目标达成。
8. **2,200 行内核门禁保护的是决策所有权而非代码量**：Kernel 只保留"做错会改变事件顺序/行动资格/因果关系承诺"的决定。
9. **工程解释须 Trace 验证**：19% 成本差异的假说（read_file 保守）被真实 Trace 推翻，换成具体工具设计缺陷——"Trace 没有支持它，就只是一种故事"。

## Concepts Introduced（引入的概念）

- 执行账本（Event Log / Turn Commit / Persist Before Effect / uncertain 裁决）→ [[durable-execution]]
- 上下文投影与缓存经济学（Context=Projection / microcompact 撤除 / In-Band Summary / Soft/Hard/Raw Tail 阈值）→ [[context-management]]
- 本地运行模式与只读证明式权限（shell vs bash / Unknown≠Safe / 五模式）→ [[agent-permission-model]]
- Harness 内核门禁与决策所有权、评测诚实性（Benchmark 设计 / Trace 验证）→ [[harness-engineering]]

## Entities（实体）

- [[kiso]]（Kiso，开源 Agent 框架/Runtime）
- [[pi]]（Pi，对照基准框架，本信源反复作为对标对象）

## Implications（含义）

- 对 Coding Agent 设计：可靠执行骨架（Event Log + uncertain 裁决）已有可复现实现与 kill -9 实测，崩溃恢复从"恢复对话历史"升级为"恢复因果链"。
- 对上下文工程：预算管理应同时计入 Cache 命中率，固定比例裁剪可能是负优化；摘要时机应等语义边界而非达到固定百分比。
- 对权限设计：本地场景"证明只读才放行"比黑名单更可辩护；无人值守模式（dontAsk）是 deny 而非 bypass，保证任务不挂在无人回答的确认框上。
- 对评测：对照 Benchmark 的价值在于"不是全赢"的结果与失败模式的具体定位；工具接口缺陷（缺 append）是可度量的成本差异来源。

## Limitations（局限）

- 单一信源、作者自述（项目作者第一人称），无第三方验证；Benchmark 数据为作者自报，对照组仅 Pi 一款框架。
- 部分关键参数为"ADR 里写清楚"但正文未给出推导（如 400K Soft 的适用负载边界、break-even 判断的量化公式）。
- 文章发布时 Kernel 2,192 行、阈值 400K/700K/100K 均为时点快照，未覆盖后续演化。

## Related Knowledge（相关知识）

- [[kiso|Kiso（实体）]]
- [[pi|Pi（实体）]]
- [[durable-execution|持久执行（Durable Execution）]]
- [[context-management|上下文管理（Context Management）]]
- [[agent-permission-model|Agent 权限模型（四层防线）]]
- [[harness-engineering|Harness Engineering（Agent 执行系统工程）]]

## Source（信源）

- `raw/sources/ai/2026-10-28-kiso-minimal-agent-framework.md`（知乎专栏，作者自述，约 1.4 万字符；采集稿 `Assets/2026/10/kiso-minimal-agent-framework.md`）
