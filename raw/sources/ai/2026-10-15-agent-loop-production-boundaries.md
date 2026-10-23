---
title: 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/lmO8xyKxJ2ckFEclxwrw3Q"
source_type: article
platform: 微信公众号
captured: 2026-10-15
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-15-agent-loop-production-boundaries.md
asset_ref: Assets/2026/10/agent-loop-production-boundaries.md
---

# 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统

## 从 Chatbot 到 AI Agent：为什么一个 while 循环撑不起生产系统

> 本篇使用本地合成场景与确定性 Mock，不连接生产 Kubernetes，不包含真实 LLM 推理或生产事故。完整复现方法见仓库 README，原始证据见同目录 experiments.md 和 raw/。

后端工程师第一次实现 Agent，常常会写出一个很自然的循环：把问题交给模型；模型要求调用工具，就调用工具；把结果放回上下文；直到模型给出答案。这个循环解释了 Agent 怎样工作，却没有回答服务怎样可靠地运行：模型始终不结束怎么办？工具挂住怎么办？用户已经取消，旧执行流程又写入成功怎么办？模型请求回滚，程序凭什么执行？

Aegis 的第一周没有急着接入真实模型。我们先构建一套可以被测试的执行契约，让成功、失败、取消和预算停止都成为明确结果。这样第二周引入 MCP 时，我们替换的是工具适配器，而不是把协议、权限与任务生命周期混在一个 handler 里。

本文最终交付的是可运行原型，不是生产平台认证。它已经验证有限循环、并发状态保护、只读工具边界和 HTTP 任务闭环；持久化、租约、审批和跨进程恢复仍属于后续设计。

## 一、从一个运维问题开始，明确我们能证明什么

演示问题是：payment-service 最近 30 分钟错误率上升，请分析可能原因，必要时提出回滚建议。完整平台未来需要关联指标、日志和发布记录，再经过授权与审批执行变更。W01 只实现其中最短的一段：创建任务，查询模拟指标，生成带证据引用的结果。

Mock 工具固定返回 `error_rate=0.08`，并携带资源、时间窗和 `synthetic=true`。这里的 8% 是人工设定的测试夹具，不是线上测量。Mock Provider 的最终回答明确指出：仅凭指标不能确定根因，需要进一步关联日志与发布记录；没有执行回滚。

这个克制的答案对工程很重要。工具返回异常指标，可以证明异常指标这个观测存在，却不能证明某次发布导致异常。工具证据和因果判断是不同层次。第一周我们校验回答引用的证据 ID 是否确实存在，没有实现因果推理质量评测。

验收因此拆成两部分：任务执行是否正确结束；结果是否引用了本任务实际获得的工具证据。模型诊断是否充分，则留给之后的数据集与人工评测，不能用一条漂亮的 Demo 回答替代。

## 二、选择工程边界：为什么采用同进程的后台执行模块

方案

实现成本

主要边界

本阶段选择

HTTP handler 同步循环

最低

请求生命周期绑住长任务，查询和取消难以独立

不采用

每个请求创建 goroutine

较低

缺少排队上限，并发与关闭管理容易分散

不采用

有限队列 + 后台消费者

适中

仍然易失，但职责与资源边界明确

W01 实现

独立 Worker + PostgreSQL

更高

需要持久化、认领、租约和事务设计

W04 计划

完整架构要求 API 与 Worker 分离；路线图又明确 W01 使用内存仓储。我们不能为了画出三个进程，就让独立 Worker 读取另一个进程不存在的内存。

ADR-0007 的阶段选择是：一个 `cmd/api` 组合 HTTP 模块、内存仓储与独立后台执行模块。HTTP handler 不调用 Agent Loop，只把 task ID 提交到 scheduler。scheduler 只有一个消费者，待处理队列容量 32。进程边界暂时合并，执行职责保持分离。W04 引入共享数据库后，再拆出独立 Worker 进程。

当前实际组件图如下，所有节点都对应本周代码：

本地客户端

Gin / Demo Auth

创建、查询、取消

内存 Repository

有限队列

后台 Runtime

Mock Provider

白名单 Mock 工具

队列不是事实来源，仓储保存本进程内可查询状态。两者都不能提供重启恢复。最大保存任务数为 1000，容量满返回 503，不自动清理历史任务。这个限制避免演示程序无边界增长，但并不是成熟的保留策略。读者复现大量任务后，需要重启原型或等后续引入持久化与清理机制。

## 三、把循环拆成三个可以替换的契约

代码的关键接口很短，职责边界比接口数量更重要。

```
// internal/llm/provider.go type LLMProvider interface {     Complete(context.Context, CompletionRequest) (CompletionResponse, error) }// internal/tool/executor.go type ToolExecutor interface {     Execute(context.Context, domain.Principal, llm.ToolCall) (domain.Evidence, error) }// internal/agent/runtime.go type AgentRuntime interface {     Run(context.Context, string) error }
```

Provider 决定下一步建议；ToolExecutor 验证主体、工具名称与参数并执行；Runtime 控制循环、预算与状态提交。Repository 再提供 Create、Get、Claim、Append、Finish、Cancel，将并发状态检查放在持有锁的临界区内。

这些接口位于 `internal/`，没有发布成稳定 SDK。任务 ID 使用 UUID 格式字符串，接口示意中的 UUID 类型不是强制的依赖要求。该选择只影响内部表示，REST 仍返回 UUID 格式 task\_id。

一个 Provider 响应必须恰好包含 ToolCall 或 Final。两者同时存在，或者两者都没有，都会终止为 `INVALID_DECISION`。Runtime 不根据不明确的模型响应猜测执行路径，也不把“模型说成功”当作工具执行成功。

正常执行是两步：第一步模型要求查询指标，工具返回 Evidence；第二步模型返回 Final。Final 中 evidence\_ids 必须全部能在本任务 Evidence 集合中找到，而且摘要与引用集合不能为空。验证通过后才进入 SUCCEEDED。

工具输出仍是低信任数据。当前 Mock 返回结构化固定值，未来接入日志和文档时，不能把其中的文本提升为系统指令。本周验证了引用完整性；没有声称已经解决 Prompt Injection 或回答事实正确性问题。

## 四、状态机的意义：取消不是一个可以被覆盖的布尔变量

W01 使用完整架构中的一个状态子集：PENDING、RUNNING、SUCCEEDED、FAILED、CANCELLED。没有增加 READY\_TO\_RESUME 等额外状态；审批与重试状态留到后续阶段。

认领

取消

验证最终答案

错误或预算终止

取消

PENDING

RUNNING

CANCELLED

SUCCEEDED

FAILED

状态转移并不只存在于一张图里。Memory.Claim 在锁内确认 PENDING 才能进入 RUNNING；Finish 在锁内调用 workflow.Allowed；Append 只允许 RUNNING 状态添加步骤。终态没有任何后续合法转移。

取消接口先在仓储中把任务变为 CANCELLED，再通知 Worker 的 cancel function。即使旧循环稍后收到工具结果，再试图 Append 或 Finish，也会被仓储拒绝。这比在循环里放一个 `cancelled bool` 更可靠：取消与结果写入需要有明确的并发排序点。

如果成功提交先取得锁，取消接口返回已经成功的任务；如果取消先取得锁，成功提交失败。系统不能让已经发生的成功凭空撤销，也不能让较晚到达的旧结果覆盖取消。这两个行为都必须向调用者解释。

仓储返回深拷贝快照，避免调用方修改 Steps、Evidence 或 Output 引用时污染内部状态。并发安全不只要求 map 上锁，还要检查锁释放之后是否把可变数据的别名泄露给了调用方。

这里仍然只有单进程终态保护。它没有租约 epoch，也不是外部工具 fencing。未来外部系统已经接受一个变更时，本地取消并不能自动撤销那个变更；需要幂等、状态查询或人工核验。这条边界在第一周就应该讲清楚。

## 五、有限执行：每一个停止条件都需要一个原因

默认 Limits 定义为：最多 6 个 Agent 步骤，最多 4 次工具调用，任务执行总时长 5 秒（从认领起算，不含排队），每次模型或工具调用超时 1 秒。每个步骤最多一次模型请求，所以模型请求总数也受最大步数约束。

步数包含最终回答步骤。如果已经完成第六个工具步骤，而 Provider 还没有返回 Final，Runtime 会以 `MAX_STEPS_EXHAUSTED` 结束。不能为了等到答案，再偷偷多运行一步。

重复调用使用工具名与规范化 JSON 参数组成 key。JSON 先解析再序列化，避免仅仅因为字段排列不同就把同一个调用当成不同调用。第二次出现相同 key 时，返回 `REPEATED_TOOL_CALL`，不再次执行工具。

这个策略适合第一周的只读诊断演示，但不是普遍的幂等机制：同一个查询在稍后时刻可能需要刷新结果，数字 1 与 1.0 的规范化也不等于完整业务语义归一化。后续必须结合工具类型、步骤目的和重试规则细化策略。它更不能替代外部写操作的幂等键。

超时分成任务总超时、模型单次超时和工具单次超时，分别对应 TASK\_TIMEOUT、LLM\_TIMEOUT、TOOL\_TIMEOUT。检查总任务 context 在前，可以避免把整个任务超时误报成单次调用超时。

Go context 提供取消信号，需要被被调用者合作处理。当前 Mock 会检查 ctx.Err 或等待 ctx.Done，因此可以按预算退出。换成不响应 context 的 SDK 后，超时信号不能强制杀死调用。本实现没有为了假装及时返回，额外启动一个可能永久泄露的调用 goroutine。真实 Adapter 的取消语义必须在接入时重新验证。官方 context 文档

Token 估算、精确用量计费、单任务成本配额没有实现。文章不能把“有最大步数”写成“已经完成全套成本治理”。

## 六、模型可以提出操作，许可必须来自服务端

Demo Auth 只有显式设置 AEGIS\_DEMO\_AUTH=true 和非空 AEGIS\_DEMO\_TOKEN 才能启动，HTTP 仅监听 127.0.0.1。Bearer Token 验证后，由服务端创建固定 Principal：demo/developer。

请求体里不存在可选择的 tenant\_id，发送该字段会被严格 JSON 解码拒绝。Repository.Get 与 Cancel 同时检查租户和主体，不匹配与不存在都返回 404。本周 API 只暴露一个固定 Demo 身份，多租户的端到端 OIDC 映射没有实现；仓储测试单独验证了跨租户和跨主体拒绝。

ToolExecutor 进一步检查 Principal 和 query\_metrics 白名单，普通场景资源限定为 payment-service，时间窗限定为 30m。非法字段、额外 JSON、错误时间窗与非白名单资源都会拒绝。步数耗尽夹具允许的动态资源完全是本地合成数据，没有连接任何集群。

当 Mock Provider 发出 rollback 建议时，Runtime 仍然走同一个 ToolExecutor，结果为 TOOL\_DENIED。模型输出不构成授权凭据。这是一条当前代码已经具备的基础安全边界；完整 RBAC、资源级 Policy、审批绑定与重新授权仍计划在 W06 实现。

创建接口还限制 body 为 8192 bytes、prompt 最多 1000 个 Unicode code point，拒绝未知字段与多个 JSON 文档。错误返回稳定公开 code，不把底层 Provider 或工具异常原文直接返回，避免后续适配器把地址、凭据或敏感文本夹带到错误体中。W01 不保存真实秘密和原始生产日志，也没有持久审计与完整脱敏管线。

## 七、让失败成为实验，而不是文章里的想象

测试环境为 Linux amd64，Go 1.26.2，Gin v1.10.0，CGO\_ENABLED=1，GCC 13.3.0；依赖由 go.mod 与 go.sum 锁定。环境可见 9 个逻辑 CPU、约 9.7 GiB 内存，但资源可见性不代表独占配额，因此本文不据此推导性能结论。

代码通过 `go test -race -count=1 ./...` 和 `go vet ./...`，并构建实际二进制运行 HTTP 验收。race detector 只检查被本次执行覆盖的路径，不能证明任意调度下没有竞争。官方 race detector 文档

实验

预期结果

本次观察

正常诊断

SUCCEEDED，引用真实返回 ID

通过

模拟工具错误

FAILED / TOOL\_ERROR

通过

相同工具重复建议

第二次执行前停止

通过

最大步数耗尽

MAX\_STEPS\_EXHAUSTED

通过，测试配置为 2 步

工具预算耗尽

TOOL\_BUDGET\_EXHAUSTED

通过

模型、工具、总任务超时

分别保留原因

通过

用户取消

CANCELLED，终态不可覆盖

通过

回滚建议

TOOL\_DENIED

通过

不存在的证据 ID

INVALID\_EVIDENCE

通过

20 个并发认领者

仅一个认领成功

通过

重启后查询旧任务

404，确认内存丢失边界

通过

实际 HTTP 脚本覆盖 9 个任务场景与 2 个请求拒绝检查。它是串行功能验收，不是压测。Runtime 的失败矩阵还单独覆盖总超时、最大步数与非法 Provider 决策等路径。所有结果与命令保存在 experiments.md 和 raw/，没有统计 P95、QPS 或推理成本。

包内语句覆盖率中 Agent 为 88.0%，API 为 88.1%，Repository 为 81.2%，scheduler 与 workflow 为 100.0%。工具包为 57.1%；Mock Provider 与 domain 没有独立包内测试覆盖率统计，虽然被其他包的测试执行过。`go tool cover -func` 的全仓语句覆盖率为 75.5%。我们没有把这些数写成“全仓库达到 80%”，更没有把 100% 覆盖率等同于逻辑正确。

失败路径图说明了一个关键区别：停止之后仍能查询原因，而不是只在日志里留一个 error。

重复或超限

允许

拒绝、错误、超时

合成证据

模型建议工具调用

检查重复与调用预算

FAILED + 明确错误码

工具独立授权并执行

追加 Step / Evidence

进入下一步

开发环境曾出现一次 HTTP ConnectionRefused：服务器与客户端分别运行在隔离网络命名空间中，两个命令的 127.0.0.1 并不是同一个端点。修复方式是由 local\_experiments.py 在同一环境启动服务器、执行验收并关闭服务器。这个实验环境问题没有通过把原型监听地址改成公网地址来绕过。普通读者在同一台机器的两个终端中，仍可直接按 README 运行。

## 八、复现：从创建任务到查看最终结果

解压完整工程并进入 aegis-agent，使用 Go 1.26.2 与可用 C 编译器：

```
go mod downloadgo test -race -count=1 ./...go vet ./...go build -o bin/aegis-api ./cmd/apiAEGIS_DEMO_AUTH=true AEGIS_DEMO_TOKEN=local-demo-token ./bin/aegis-api
```

另一个终端执行：

```
python3 scripts/acceptance.py
```

也可以先构建，再执行自动管理服务器生命周期的实验脚本：

```
python3 scripts/local_experiments.py
```

脚本要求 8080 端口空闲，会覆盖本地 raw/ 下对应实验文件。正常结果有 task\_id、SUCCEEDED、步骤和 evidence\_ids；失败场景有 FAILED 与明确 error\_code；取消场景为 CANCELLED。不要因为 HTTP 创建返回 202，就把任务视为执行成功。

如果只想观察 API，用 README 中的 curl 命令创建任务，再用返回的 task\_id 查询。取消一个已完成任务会返回原终态，而不是改写历史。请求携带 Idempotency-Key 会显式返回不支持错误：W01 没有实现幂等 TTL 与参数冲突比较，不能静默接受头部制造错误预期。

## 九、第一周建立的工程基础，以及仍未解决的问题

本周的价值是把 Agent 的动态决策放进确定性的边界：每个任务有可查询状态；每个模型响应有明确结构；每次工具调用经过独立校验；每个循环有有限预算；每个异常有稳定终止原因；每次取消都受终态保护。

它适合本地教学、Adapter 契约开发、确定性故障测试，不适合需要进程崩溃恢复、跨实例任务调度、真实集群变更或企业身份治理的环境。当前没有 PostgreSQL、Checkpoint、Outbox、租约、MCP、审批、OTel 或真实 LLM。一个进程崩溃，内存状态和队列都会丢失，重启实验已经证明了这个边界。

W02 将在 ToolExecutor 后接入 MCP 只读查询，并验证 Schema、协议和跨进程失败路径。W04 才把 Task Repository 替换为持久化实现，增加事务、Checkpoint、Outbox 与认领机制。接口可替换并不意味着可靠性会自动出现：这些语义需要新的实现和新的故障实验。

对同样从 Java 后端转向 Agent 工程的读者，可以沿用熟悉的判断规则：业务状态需要受控更新，耗时操作需要独立生命周期，权限不能来自请求方自述，重试必须理解副作用，关键结论必须有可复现证据。Agent 引入了模型的非确定性，这些后端基础反而更值得明确。

## 复现资料与来源

*   • Go context、Go race detector、Gin v1.10.0 官方发布记录。
