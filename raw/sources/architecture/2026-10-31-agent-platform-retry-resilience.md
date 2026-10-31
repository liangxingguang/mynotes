---
title: 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/bEuxXk_f9GSBoZH5a5_RxA
source_type: article
platform: wechat
captured: 2026-10-30
registered_at: 2026-10-31
inbox_ref: Inbox/2026-10-30-agent-platform-retry-resilience.md
asset_ref: Assets/2026/10/agent-platform-retry-resilience.md
---

# 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计

## 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计

> 适用场景：以 Aegis Agent Platform 的 `API → Scheduler → Worker → ToolExecutor → MCP / LLM / 外部服务` 调用链为例，设计在依赖变慢、限流、局部失效和 Worker 接管下仍可控的可靠调用体系。
> 
> 阅读方式：管理者可先读“执行摘要、目标架构、上线路线”；实现者重点读“策略矩阵、执行链、持久化模型”；SRE 重点读“容量边界、可观测性、故障演练和验收”。

* * *

## 执行摘要：可靠性不是多试几次，而是限定额外工作

一次 MCP 或 LLM 调用从几十毫秒退化为数秒时，最危险的状态不是“服务已经完全不可用”，而是“服务仍偶尔成功，但每个请求占用得更久”。如果 Worker、SDK、代理和任务恢复逻辑各自重试，额外请求会在下游容量最低的时候涌入系统；队列、连接、goroutine 和租约相互等待，局部慢调用最终演变为全平台排队与恢复冲击。

V3 的结论很简单：**一次业务操作必须有唯一的重试所有者，并同时受到时间、次数、额度、并发和副作用语义五条边界约束。**

边界

要回答的问题

主要机制

时间

这次操作还有没有完成价值？

Task/Step Deadline、Attempt Timeout、Queue Max Age

次数

同一操作最多还能发送几次？

持久化的 operation attempt 预留

额度

系统整体允许多少额外尝试？

按依赖和工具类别隔离的 Retry Budget

并发

下游和本地资源还能承受多少工作？

Admission Control、有界队列、Bulkhead、连接池

语义

再执行一次会不会重复产生副作用？

幂等协议、结果查询、未知结果状态

这不是“加几个中间件”的方案。它要求 API、调度器、Worker、工具协议、指标和演练共同遵守同一份调用契约。熔断器只能快速失败；退避只能打散时间；预算只能限制额外请求。缺少准入、限并发、截止时间或幂等中的任一项，系统仍可能在压力下失控。

## 1\. 问题画像：依赖还活着，系统为什么会雪崩

Agent 平台一次工具调用常经由 API、任务调度、Worker、MCP Client，最后抵达检索服务、支付/消息 API 或模型提供商。依赖延迟升高时，表面上只是“响应慢一点”，实际上会触发资源占用的正反馈：

限制新增工作

停止无收益重试

MCP / LLM 依赖变慢

请求占用时间增加

在途、队列与租约增长

超时、取消和重试增加

连接、执行槽位、CPU 耗尽

健康工具和新任务被拖慢

统一治理：截止时间、预算、舱壁、熔断

故障源是下游变慢，雪崩机制却往往是平台自身没有为“额外工作”设置上限。重启 Worker、扩容 Pod 或增加重试次数可能暂时改变曲线，但不能切断反馈环；更糟糕的是，重启会丢失本地状态并触发任务接管，形成新的重试层。

### 1.1 先统一术语，避免用一个“重试”讨论三件事

名称

定义

必须怎样计量

逻辑操作（Operation）

一个计划中的工具业务动作，例如“查询库存”或“创建订单”

`operation_id`

 贯穿恢复与接管

网络尝试（Network Attempt）

一次实际发向下游的 RPC / HTTP 请求

区分 original、retry、SDK hidden retry

Worker 接管（Takeover）

Lease 变化导致执行权转移

不是新的操作，不能重置尝试数

Agent 再规划

模型基于新信息决定新的工具动作

是新的业务决策，另受成本/步数限制

“重试 3 次”和“总共尝试 3 次”不是同一种配置。若三层均配置“首次请求后再重试 3 次”，极端情况下最深层可能接到 ((1+3)^3=64) 次尝试；若三层均为 `max_attempts=3`（包含首次），理论上限为 (3^3=27)。这些是无 Deadline、全部失败且每层独立重试时的上界，不是线上必然值。

因此本文统一使用 `max_attempts` 表示**包含首次请求的总尝试次数**，并要求每个策略明确其生效层。SDK 重连、传输层重发、HTTP 重定向和业务调用重试必须分别审计，不能将“自动重试”视为一个无害的实现细节。

### 1.2 用 Little 定律理解为什么连接池会瞬间耗尽

稳定状态可用 Little 定律近似描述：

\[  
L=\\lambda W  
\]

其中 (L) 是平均在途量，(\\lambda) 是有效到达率，(W) 是平均占用时间。假设一个依赖每秒收到 1,000 次网络尝试：

场景

平均占用 (W)

估算在途 (L)

正常

80ms

80

依赖变慢

2s

2,000

若调用槽位仅有 200 个，慢调用本身就足以造成排队或拒绝；若每个逻辑调用又平均产生两次网络尝试，到达率还会逼近 2,000 次/秒。增加 TCP 连接数并不等于增加可持续容量，特别是在 HTTP/2 多路复用场景中，连接数和并发请求数甚至不是同一个概念。

不要用 P99 直接代替 (W) 得出容量结论；P99 适合超时和体验目标，容量需要结合均值、并发分布、服务端队列、CPU、超时后的残留工作和实测余量共同校准。

## 2\. 设计目标与非目标

### 2.1 目标

1.  1\. 依赖失去容量时，限制新增工作而不是无限堆积等待者。
    
2.  2\. 每个逻辑操作在跨 Worker 恢复后仍保持时间、次数和幂等边界。
    
3.  3\. 只将真正到达下游的有效结果提供给熔断统计，避免本地拒绝污染健康判断。
    
4.  4\. 使健康工具、健康租户和关键路径在局部故障中仍保有约定的容量。
    
5.  5\. 用 cohort 数据证明网络尝试、恢复时间和副作用安全性，而不是用单秒比值或“感觉变快”证明。
    

### 2.2 非目标

*   • 不承诺跨外部系统的 exactly-once；没有工具端协议，本地 Checkpoint 无法阻止重复副作用。
    
*   • 不把统一重试机制当成业务补偿机制；库存不足、模型输出不合预期、审批失败需由业务流程处理。
    
*   • 不要求第一阶段引入 Redis、服务网格或全局限流。局部比例预算和明确的资源边界足以解决多数问题。
    
*   • 不将 202 Accepted 等同于任务成功；异步接单只表示任务被可靠保存并承诺后续处理。
    

## 3\. 目标架构：谁拥有哪一种决定权

业务重试应收敛到 Worker 内的 `ToolExecutor`。控制平面生成、审计和版本化策略；执行平面在实际资源边界上执行策略；工具服务负责幂等与结果协议。

策略绑定

API / Orchestrator\n租户准入、幂等接单

有界持久化队列

Scheduler\n到期唤醒、Lease

Worker

ToolExecutor\n唯一业务重试所有者

MCP 资源池

LLM 资源池

控制平面\n策略版本与覆盖

Attempt / Audit / Metrics

工具端\n幂等、结果查询、执行权校验

层级

应负责的事

禁止的隐式行为

API / Orchestrator

租户准入、请求去重、持久化接单、返回任务 ID

因 Worker 超时直接重复创建任务

Scheduler

Lease、Checkpoint、延迟唤醒、过期处理

接管时重置工具尝试数或 Deadline

Worker ToolExecutor

Deadline、错误分类、预算、退避、并发隔离

工具内部再包一层未计量业务重试

MCP / LLM SDK

协议适配、连接与响应体生命周期

未审计地自动重放业务请求

Proxy / Mesh

传输资源兜底与可观测性

与应用独立重试同一个业务动作

工具服务

幂等、查询未知结果、服务端执行状态

把客户端超时误判为客户端从未执行

**策略必须随操作版本化。** 工具类别、读写语义、幂等要求、Deadline、最大尝试数、资源池和熔断阈值不可由模型临时决定。任务创建时应绑定 `policy_version`；恢复执行沿用该版本，除非有经过审计的迁移规则。

## 4\. 默认策略矩阵：让设计能被直接配置

下表不是全局默认值，而是上线前应被每个工具所有者校准的起始模板。容量、业务 SLO、下游配额及副作用语义优先于这些示例。

调用类别

示例

max\_attempts

Step Deadline / Attempt Timeout

重试资格

Retry-After

幂等与未知结果

推荐降级

同步只读 MCP

检索、特征查询

2–3

2s / 500ms

连接暂断、503、受控超时

等待超期则结束或延期

不需要副作用键；仍记录结果未知

缓存、部分结果、明确失败

异步只读 MCP

批量索引、非关键分析

3

任务 Deadline 内动态切分

同步只读规则

持久化 `next_run_at`

可安全重放，但仍限制总尝试

延期或丢入低优先队列

幂等写 MCP

创建带幂等键的资源

1–2

业务决定

仅传输失败/未知结果后先查结果

优先交还调度器

必须有工具端幂等与结果查询

Pending / 人工复核

非幂等外部写

发送不可撤回命令

通常 1

明确的业务 Deadline

默认不自动重试

不在当前循环等待

需补偿/查询协议；否则终止为未知

人工处理或业务补偿

LLM 非流式

结构化提取、分类

1–2

模型/业务 SLO

临时供应商错误；不因内容不满意而传输重试

超期转异步

请求去重与成本上限

更小模型、缓存、任务延期

LLM 流式

面向用户生成

通常 1

首 Token、流空闲、总时长分别定义

已输出 token 后通常不重启

一般不在前台等待

禁止无条件拼接两段生成

告知中断、用户显式续写

在实际配置仓库中，每个 `tool_class` 至少声明：`policy_version`、读写语义、`max_attempts`、Task/Step/Attempt 时间边界、最低有价值执行时间、幂等要求、预算池、舱壁池、熔断分组、延期规则、降级方式和负责人。

## 5\. 时间边界：结束无价值的工作，而不只是缩短一次等待

单次请求超时只能回答“这一尝试最多等多久”，不能约束整条链路。三次 800ms 的调用叠加排队、退避和落盘，轻易就超过上游仍愿意等待的时间。

### 5.1 五类时间必须分开定义

时间边界

覆盖范围

决策者

Task Expiry

任务何时失去业务价值

产品 / 业务流程

Step Deadline

排队、退避和所有尝试的总时间

工具策略

Attempt Timeout

单次下游调用允许等待的时间

客户端与工具策略

Connect Phase Timeout

DNS、建连、TLS、首字节等阶段

SDK / Transport

Queue Max Age

在队列中允许等待多久

调度与准入策略

令 (D\_{step}) 为 Step Deadline，`reserve` 为落盘、释放资源和返回所需的保留时间，第 (k) 次尝试的最长等待不应超过：

\[  
T\_{attempt,k}=\\min(T\_{configured},D\_{step}-now-T\_{reserve})  
\]

在进入退避前，还应确认剩余时间能够覆盖：退避、最低有价值执行时间和收尾时间。否则这次尝试注定无法带来成功，只会制造更多超时和残留工作；应返回结构化终止原因，或在异步语义中持久化延期。

### 5.2 取消不是资源释放的同义词

Go 中下游调用必须继承父 `context.Context`，并为每次尝试创建子 Context；禁止用 `context.Background()` 切断取消链。也不要采用“另起 goroutine，外层等超时”的伪取消：如果库或工具不响应 Context，后台请求仍会占用连接、CPU 和服务端执行槽位。

客户端超时后需要分别观测：

*   • `client_inflight`：调用方还在等待的请求；
    
*   • `server_active_work`：测试工具或可观测下游仍真正执行的工作；
    
*   • `orphaned_work`：客户端取消后在服务端持续执行的已知工作。
    

对于不响应取消的工具，ToolExecutor 必须让真实后台工作继续占用容量，或将调用隔离到可终止的执行进程并定义安全终止协议。调用方已经返回，绝不表示资源已经归还。

## 6\. 重试资格：先判断值不值得重试，再选择怎样退避

### 6.1 错误分类结合业务语义

情况

默认动作

关键理由

参数错误、权限不足、工具不存在

终止

相同输入重发不会改善

父 Context 取消、Step Deadline 到期

终止

不再主动发送新尝试

Bulkhead 满、Breaker Open、预算不足

本地终止或持久化延期

不是下游网络失败，不进入当前重试循环

瞬时 502 / 503

条件重试

仍需满足幂等、额度和剩余时间

429

尊重服务端提示后延期

校验 `Retry-After`，长等待交还调度器

连接断开、响应超时

结果未知

写操作先查结果或依赖幂等协议

模型拒答、结果不符合预期

业务决策

不等于传输失败，受 Agent 成本/步数治理

服务端要求的冷却时间无法放入当前 Step Deadline 时，绝不能为了凑满尝试次数提前再发；应根据业务规则持久化 `next_run_at` 并释放执行权。延期任务需要最大延期次数、总生存时间和随机扰动，避免形成永久滚动队列。

### 6.2 幂等键是一份服务端协议，不是一行请求头

发送消息、创建订单、执行命令等写操作，仅携带 `Idempotency-Key` 并不等于安全。工具端至少要实现：

1.  1\. 对 `tenant_id + idempotency_key` 建立唯一约束；
    
2.  2\. 保存请求摘要并拒绝同键不同参数；
    
3.  3\. 返回已完成结果，并为执行中/结果未知建立明确状态；
    
4.  4\. 保留去重记录，覆盖平台允许的恢复和重试窗口；
    
5.  5\. 如存在执行权竞争，验证调用方携带的操作版本或 fencing 语义。
    

建议幂等键稳定派生自 `tenant_id + task_id + step_id + operation_id`，不包含 attempt 序号。Worker 重启、Lease 接管和策略恢复都不得改变同一业务操作的键。

Fencing Token 可以保护任务状态不被旧 Worker 覆盖，但不能单独阻止外部系统重复副作用；只有工具服务也支持执行权校验或幂等协议时，端到端安全才成立。

## 7\. 退避与 Retry Budget：分散时间、限制数量，但不要混淆两者

### 7.1 Full Jitter 解决同步波，不保证减少总请求量

Full Jitter 的常见定义是：

\[  
b\_k=\\min(b\_{max},b\_0 2^{k-1}),\\qquad sleep\_k\\sim U(0,b\_k)  
\]

其中 (k=1) 代表第一次重试。指数窗口避免持续高频敲打；随机等待降低大量客户端在同一时刻重试的概率。它们不对总尝试数量提供任何上限，也不能保证所有负载模型下 P99 必然改善。

实现时要处理指数溢出、计时器取消、最大尝试数与 `Retry-After`。当服务端要求至少等待 (R) 时，可在 `max(R, sampled_backoff)` 之后增加非负扰动，不能向下抖动而提前发送。Tenacity 中需要 Full Jitter 时可使用 `wait_random_exponential`；`wait_exponential` 是固定指数间隔，二者不可混用。

### 7.2 三种预算模型解决不同问题

模型

约束对象

可以证明的性质

数量预算

首次请求补充额度，重试消耗额度

累计额外尝试数量上界

成功补充配额

成功补充、失败重试消耗

持续失败时重试逐渐停止

并发重试预算

同时执行的重试数

重试并发上界

最小实现选择**按首次网络尝试记账的数量预算**。首次尝试不消耗额度；每个首次网络尝试补充 (\\beta) 份重试额度；重试实际发出时消耗一份。预算按 `dependency + tool_class` 隔离，不能为每个请求新建桶，也不应让所有依赖共用一个桶。

设初始化额度为 (B\_0)，累计首次网络尝试为 (N)，已消耗重试额度为 (R)，比例为 (\\beta)，则：

\[  
R\\leq B\_0+\\beta N  
\]

若每份额度都对应一次实际网络重试，调用放大率为：

\[  
A=1+R/N\\leq1+\\beta+B\_0/N  
\]

这是从桶创建起的累计约束，不是任意时间桶的硬约束。桶容量限制历史信用形成的短时突发；若将桶初始设为满，每个新 Pod 都会获得一次“免费”重试突发，扩容和滚动发布时尤其危险。起始实现应使用**初始为空**的桶，额外探测流量使用独立、可度量配额。

### 7.3 Go 示例：整数记账的进程内预算

```
package resilienceimport"sync"type Budget struct {    mu       sync.Mutex    units    int64    capacity int64}// 容量为 2,000 单位，最多积累 20 次重试信用。// 每次首次尝试补充 20 单位；每次重试发出前消耗 100 单位，即 beta = 20%。func NewBudget() *Budget {    return &Budget{capacity: 20 * 100}}func (b *Budget) OnOriginalSent() {    b.mu.Lock()    defer b.mu.Unlock()    b.units += 20    if b.units > b.capacity {        b.units = b.capacity    }}func (b *Budget) TryReserveRetry() bool {    b.mu.Lock()    defer b.mu.Unlock()    if b.units < 100 {        returnfalse    }    b.units -= 100    returntrue}
```

进程重启会丢失信用，行为偏保守。只要每个实例初始为空、每个首次请求只记账一次，则即使从一个实例扩到十个实例，仍有 (\\sum\_iR\_i\\leq\\beta\\sum\_iN\_i)；比例不会自动变成十倍。真正随副本数增加的是固定容量、初始赠送信用、半开探测并发及固定速率上限。

需要严格的全局绝对额度、跨租户公平或依赖总容量分配时，才引入集中配额或配额租约。任何“缓存 Redis 剩余额度后由多个 Pod 各自消费”的做法都会重复扣减；批量租借必须由中心原子发放、具有有效期，并定义故障回收语义。

## 8\. 准入、队列与 Bulkhead：先管住首次流量

Retry Budget 只约束额外尝试。首次流量已经超过依赖容量时，即使重试比例为零，系统仍会过载。

### 8.1 多层准入分别保护不同资源

边界

要限制的量

满载行为

API 接单前

租户 QPS、活跃任务、待执行任务

明确拒绝或返回稍后重试契约

持久化队列

深度、最老年龄、按类目配额

不再承诺无限积压的 202

Worker 领取前

可用执行槽位、消费预取

暂停领取，不转化为 goroutine 等待

依赖调用前

依赖/工具实际并发

快速失败或短暂有界等待

Transport

HTTP stream、连接、文件描述符

配置与逻辑舱壁一致

容量为 200、平均占用 80ms 的资源池，在理想模型下约可承受 2,500 次/秒；若平均占用退化到 2s，则约为 100 次/秒。固定 QPS 限流器无法独自应对服务时间突变，必须结合实际并发、队列年龄和服务端 active work 控制。

### 8.2 快速失败的 Bulkhead 示例

```
package resilienceimport (    "context"    "errors"    "sync")var ErrBulkheadFull = errors.New("bulkhead full")type Bulkhead struct{ sem chanstruct{} }func NewBulkhead(n int) *Bulkhead {    if n <= 0 {        panic("invalid bulkhead capacity")    }    return &Bulkhead{sem: make(chanstruct{}, n)}}func (b *Bulkhead) TryAcquire(ctx context.Context) (func(), error) {    if err := ctx.Err(); err != nil {        returnnil, err    }    select {    case b.sem <- struct{}{}:        var once sync.Once        returnfunc() { once.Do(func() { <-b.sem }) }, nil    default:        returnnil, ErrBulkheadFull    }}
```

`TryAcquire` 的语义是立即拒绝，不是排队等待。若产品确实需要短暂排队，必须将等待时间纳入 Step Deadline，并将队列长度和年龄设为上限。获取槽位后仍要再次检查 Context：取消和成功获取可以并发发生。

退避期间绝不占用调用槽位；槽位仅在网络调用和必要的响应体读取期间持有，并在所有返回路径释放。MCP、LLM、外部写操作应使用独立资源池，且池注册表必须限制基数，不能按不受信任 URL 无限创建。

### 8.3 背压是一份跨边界协议

背压不是某个 channel 满了就完成，而是上游能感知并停止制造不可执行工作：

*   • 队列满时，接单阶段拒绝超出契约的新任务；
    
*   • 执行槽位满时，降低消费预取或暂停领取；
    
*   • 依赖过载时，降低对应工具流量并向入口暴露容量不足；
    
*   • 延期任务持久化 `next_run_at`，重新投递具有速率上限和随机扰动；
    
*   • Task 到期后标记过期或进入人工处理，而不是永久延期；
    
*   • PostgreSQL 等调度器只领取“已到期、可接管、所属类别尚有容量”的任务，不能先领取整批任务后持有 Lease 等待几分钟。
    

## 9\. Circuit Breaker：快速失败之外，还要有有节奏的恢复

熔断器只应对真正产生下游结果的调用记录健康状态。本地预算拒绝、Bulkhead 满、参数错误、用户取消和“已获许可但尚未发送”的撤销，都不应污染下游失败率。

状态

行为

设计要点

Closed

正常调用并记录有效结果

定义时间窗、最小样本、失败/超时/慢调用规则

Open

拒绝新的下游调用

本地拒绝不进入当前重试循环

Half-Open

少量受控探测

限制并发与速率；失败回 Open，成功后渐进放量

示例起点可以是：10 秒统计窗口、至少 50 个有效样本、失败率超过 50% 打开、5 秒后开始探测、每实例半开并发为 1。它们不是推荐默认值。半开并发限制不等于严格探测 QPS：快速失败会让探测连续发生，多实例还会叠加；需要冷却抖动、探测速率限制，必要时增加全局配额。

恢复时禁止同时释放积压任务和全部并发槽位。应从原配额的一小部分启动，每个观测窗口确认延迟、错误率和队列年龄后逐级放量，异常立刻回退。恢复策略也必须版本化，并提供经过审计的人工覆盖入口。

不要让一个写工具的 429 熔断健康的检索工具；也不要按任务 ID 建立熔断器，否则统计无法积累且状态数量失控。合理键通常是 `dependency + tool_class + operation_semantics`。

## 10\. ToolExecutor 执行链：把闸门放在正确的顺序

顺序决定过载时稀缺资源被谁占用。所有纯本地、无需占用下游资源的判断应尽早完成；预算不足不应先占用 Bulkhead 或 Half-Open 许可。

```
Call(stepCtx, operation):  载入并校验绑定的 policy_version、业务过期时间、幂等资格与持久化尝试状态  for 本轮允许的 attempt:    1. 若 Task/Step 已取消、到期，或剩余时间不足最低有价值执行时间：终止    2. 若不是首次：       - 验证上次结果允许重试       - 计算 Full Jitter / 合法 Retry-After       - 若等待后无法留下执行与收尾时间：终止或持久化延期       - 可取消地等待；等待期间绝不持有调用槽位    3. 原子预留并持久化 operation attempt 序号，校验 Lease/Fencing       - 预留失败：终止；保守消耗的尝试机会不回补    4. 若为 retry：预留 Retry Budget；不足则终止或延期    5. 若为 original：记录首次尝试将要发送；仅记账一次    6. 从 breaker 请求执行许可；Open 则结束    7. 非阻塞获取 Bulkhead；失败则撤销 breaker 的“未发送”许可并结束    8. 再次检查取消与 Deadline；若失败，释放两个许可，不记录下游结果    9. 创建 attempt 子 Context，记录网络尝试，执行一次受治理的下游调用   10. 读取/关闭响应体，取消子 Context，立即释放 Bulkhead   11. 将有效下游结果交给 breaker，释放其许可；记录 attempt outcome   12. 成功：提交 Checkpoint 并返回；失败：保留错误，进入下一轮资格判断  返回结构化终止原因与最后已知结果
```

这里有两个不可消除的崩溃窗口：持久化尝试预留与网络发送之间、远程副作用提交与本地记录完成之间。前者会保守消耗一次机会；后者可能形成结果未知。不要为了“补回次数”而盲目重放写操作，恢复时应使用稳定幂等键、工具端查询或人工处理。

Breaker 适配器需要显式区分三种完成方式：未发送即撤销、收到有效成功/失败、调用被取消但下游可能仍执行。把 `ErrBulkheadFull` 直接作为网络失败传给通用熔断库，是常见且危险的误计数。

## 11\. 跨 Worker 恢复：调度系统不能成为第四层重试

假设旧 Worker 已发送三次网络尝试后退出；若新 Worker 接管时重新获得完整的三次机会，`max_attempts` 立即失效。因此每个操作至少要持久化：

字段

作用

`operation_id`

 / `idempotency_key`

标识同一业务副作用

`policy_version`

固定执行契约，支持审计

`attempt_reserved_count`

跨接管累计，防止次数重置

`operation_deadline`

 / `next_run_at`

限制生存期与延期时点

`last_error_class`

 / `outcome_state`

区分失败、未知、完成

`lease_owner`

 / `fencing_token`

拒绝旧 Worker 覆盖状态

`last_attempt_at`

 / `last_provider_request_id`

诊断与未知结果查询

最小可行模型是：进程内 Retry Budget 限制当下额外负载；持久化尝试上限限制跨恢复总量；工具端幂等协议控制重复副作用。它不追求不可能的本地—远程原子性，却把每一种不确定性显式记录和处理。

## 12\. Aegis 落地映射：从抽象设计到改造清单

以下是建议的项目映射，名称需按实际仓库校正。目的不是强行重构全部组件，而是让每项风险有唯一归属。

当前/目标组件

V3 职责

首批改造项

验收信号

API / Task API

租户准入、幂等接单

活跃任务/队列上限、拒绝语义

队列满时不再无界增长

Scheduler

Lease、`next_run_at`、过期处理

仅领取可执行任务；延期释放 Lease

长延期不占 Worker

Worker

生命周期与资源隔离

不在 goroutine 中无界等待

Worker 内存与 goroutine 有上界

ToolExecutor

唯一重试所有者

统一错误分类、Deadline、attempt 预留

每个操作只有一个业务重试层

MCP Client / LLM Client

可取消调用与协议适配

关闭或显式暴露 SDK 自动重试

hidden retry 可计量

State Store

任务状态与操作状态

policy/attempt/idempotency 持久化

接管不重置次数与 key

Metrics / Trace

证明边界是否有效

logical → step → attempt 关联

可计算 cohort 放大率

Tool Provider Contract

幂等与结果查询

幂等键、请求摘要、未知状态

丢响应不重复副作用

实施前应先完成“重试清单”：每一个 SDK、HTTP Client、gRPC 选项、代理 route、任务调度重投递和业务循环都登记重试语义、最大次数、适用错误、是否可关闭、指标来源与负责人。未能审计的自动重试不能当作不存在。

## 13\. Proxy、Kubernetes 与基础设施：与应用策略一致，而不是再加一层盲重试

Envoy 的 `max_retries` 约束的是并发重试资源，而不是单一逻辑操作的总尝试数；`retry_budget` 同样是基于活跃请求等状态的本地并发控制语义，并不等价于本文“按首次请求累计记账”的数量预算。此类边界通常按本地 Envoy 的 upstream cluster 与 priority 生效，不能自然推导为所有 Sidecar 共享的全局额度。

已有代理时，先清点 route retry、SDK retry、应用 retry、重定向和连接重建行为；没有代理时，不必为实现本文第一阶段治理先搭建服务网格。

Kubernetes 探针的职责也要分清：

*   • Liveness 判断进程是否不可恢复，不要把 MCP 或 LLM 故障直接映射为重启；
    
*   • Readiness 判断实例是否适合继续承接职责，异步 Worker 还需要应用层停止领取；
    
*   • Startup Probe 保护慢启动，不执行昂贵真实工具调用；
    
*   • 所有副本共同依赖某一服务时，简单 readiness 联动可能一次摘掉全部 Pod，应结合降级语义设计。
    

## 14\. 可观测性：同时看见用户失败与系统仍在做的无效工作

指标按 `dependency`、`tool_class`、`policy_version`、`error_class` 等**有界**维度聚合；不将 task ID、用户 ID、原始 prompt 等高基数字段放入标签。

指标

类型

用途

`tool_logical_calls_total`

Counter

已准入逻辑操作

`tool_network_attempts_total{kind}`

Counter

original / retry 真实网络尝试

`tool_retry_denied_total{reason}`

Counter

预算、Deadline、资格等终止原因

`tool_inflight`

Gauge

客户端正在等待的调用

`tool_server_active`

Gauge

测试工具/可观测下游的实际工作

`tool_bulkhead_rejected_total`

Counter

本地并发拒绝

`task_queue_depth`

 / `task_oldest_age_seconds`

Gauge

积压数量与年龄

`tool_attempt_duration_seconds`

Histogram

单次实际执行耗时

`tool_logical_duration_seconds`

Histogram

从准入至终态，含等待与退避

`task_completed_total{outcome}`

Counter

成功、失败、取消、过期、未知

调用放大率趋势可观察为：

```
sum(rate(tool_network_attempts_total[5m]))/clamp_min(  sum(rate(tool_network_attempts_total{kind="original"}[5m])),  0.001)
```

这只能展示按时间桶的趋势，不能证明累计预算约束：窗口内 retry 可能属于窗口开始前的 original。需要同时保存按 `operation_id` 归属的 cohort 数据，并在低流量窗口标记样本不足。

Trace 推荐层级为 `Task → Step → Network Attempt`；跨 Worker 接管使用持久化上下文和 Span Link 关联。日志至少记录 `operation_id`、attempt 序号、lease epoch、剩余 Deadline、策略版本、拒绝原因和下游 request ID。成功请求 P99、所有终态 P99、拒绝率、成功吞吐和队列年龄必须一起看：大量快速拒绝可能降低总体延迟，却不代表业务可用性提高。

## 15\. 故障演练：用实验验证闭环，而不是用故事证明效果

### 15.1 最小可控环境

第一阶段只需压测入口、现有 Aegis Worker 和一个可控 MCP 测试工具。该工具应支持：正常延迟、额外延迟、指定比例 503、429 + `Retry-After`、忽略取消、成功后断开响应，并暴露 `active`、`started`、`completed`、`side_effect_committed` 计数。

应用级注入用于验证重试决策，网络级注入用于验证传输行为，两者不能相互替代。先单独验证一种故障的强度，再做组合实验。

### 15.2 固定实验协议

先测得目标工作负载下的可持续容量 (C)，再以固定首次逻辑调用到达率（例如 (0.6C)）运行 **open-loop** 压测。闭环压测会在响应变慢时自动降速，容易掩盖雪崩。

1.  1\. 正常预热 60 秒；
    
2.  2\. 正常采样 60 秒，建立延迟、吞吐和资源基线；
    
3.  3\. 向一个 MCP 工具注入额外 2 秒延迟，持续 6 秒；
    
4.  4\. 移除故障，保持原始到达率并观测最多 300 秒；
    
5.  5\. 停止新流量，等待终态或按协议截断，导出 cohort 数据。
    

300 秒内未恢复时，报告“恢复时间 >300 秒”，不能将观测截止点伪装成恢复时刻。每组至少重复五次，固定输入、故障时序、副本数、资源配置和随机种子集合，报告中位数与范围。

### 15.3 对照组与消融设计

组别

变更

关键验证问题

A

多层独立重试，仅隔离环境

是否存在额外网络尝试与恢复尾巴

B

单一所有者 + Deadline + 总尝试上限

移除乘法放大后还剩多少问题

C

B + 指数退避 + Full Jitter

时间桶峰值与同步波是否改善

D

C + 20% 数量预算

cohort 累计额外尝试是否符合预算

E

D + Bulkhead + 有界队列/准入

在途、队列和内存是否受约束

F

E + 熔断 + 渐进恢复

故障期负载与恢复二次冲击是否减少

每轮主实验只固定一种故障机制。503、429、网络延迟、丢包和远端不响应取消应分别测量，不能用一组混合故障证明全部机制有效。

恢复判定必须预先固定。例如：故障移除后连续三个 10 秒窗口同时满足成功调用 P95 不超过基线 1.2 倍、成功吞吐至少为基线 95%、最老队列年龄低于阈值，才算恢复。每个窗口必须报告样本量。

## 16\. 验收不变量：曲线好看不等于系统安全

除吞吐与延迟曲线外，自动化测试必须覆盖以下性质：

*   • 首次网络尝试只记账一次，不消耗 Retry Budget；retry 不补充首次额度；
    
*   • 初始为空的同一预算实例，对任意执行前缀均满足 (R\\leq\\lfloor0.2N\\rfloor)；
    
*   • 退避期间不占用依赖舱壁，所有返回路径均释放资源；
    
*   • Step Context 取消后不再主动发起新的业务尝试；
    
*   • 本地拒绝不计入下游熔断失败率；Half-Open 未发送许可可撤销；
    
*   • Worker 接管后，操作总尝试数、业务 Deadline、策略版本和幂等键保持一致；
    
*   • 写操作已提交但响应丢失时，不会产生重复业务副作用；
    
*   • 不响应取消的服务端工作独立计量，恢复期不会悄悄越过容量；
    
*   • 单个工具变慢时，健康工具仍满足约定的吞吐与延迟边界；
    
*   • 队列达到上限时，有明确拒绝、延期或过期语义，不再无限分配内存。
    

预算适合并发性质测试；执行链适合状态机测试；端到端安全性需要故障注入和工具协议契约测试。仅断言“重试函数恰好调用三次”几乎不能证明可靠性。

## 17\. 上线路线：每一步减少一个失控维度

阶段

交付物

不应在该阶段承诺的事

0\. 基线

重试清单、逻辑操作/网络尝试/终态指标

未测量前的性能结论

1\. 所有权

ToolExecutor 唯一业务重试、错误分类、总 Deadline

全局配额或复杂网格治理

2\. 安全

持久化尝试数、稳定幂等键、未知结果流程

非幂等写操作自动恢复

3\. 容量

有界队列、入口准入、依赖 Bulkhead、Transport 对齐

仅凭 QPS 限流解决慢依赖

4\. 控制

Retry Budget、Full Jitter、少量只读工具熔断

直接对所有写工具启用自动重试

5\. 证据

消融实验、策略/镜像/SDK/资源/种子归档

将一次压测外推为所有故障模式

6\. 扩展

必要时集中配额、租约和跨租户公平

未定义一致性与故障语义就引入协调器

每一阶段都应带有可回滚开关、策略版本、看板和明确所有者。若本地比例预算已经满足容量目标，应保留简单架构；只有当全局绝对上限或跨租户竞争成为确切问题时，才引入集中协调。治理基础设施本身也有延迟、故障和一致性成本，不能被视作免费可靠性。

## 结语

重试提高可靠性的前提，是系统还有能力完成额外工作。生产级 Agent 平台每次准备重试前，都应能明确回答：这次操作是否值得重试？是否还有时间？是否还有额度？是否还有并发容量？再次执行是否安全？

当答案都由可观察、可测试、可恢复的边界约束时，MCP 或 LLM 的一次局部变慢才有机会停留在局部，而不是演变为全平台排队、重启和恢复风暴。

* * *

## 官方参考与核验说明

以下资料支持机制和 API 语义，不支持本文尚未运行的 Aegis 性能结论。上线前必须按实际 SDK、Envoy、Kubernetes 与工具服务版本复核。

1.  1\. AWS Builders’ Library：Timeouts, retries, and backoff with jitter，超时、重试、副作用与抖动原则。
    
2.  2\. Tenacity：API Reference，`wait_exponential` 与 `wait_random_exponential` 的区别。
    
3.  3\. Envoy：Circuit breaking，上游资源边界与本地分布式限制。
    
4.  4\. Envoy：Circuit breakers proto，`max_retries` 与 `retry_budget` 字段语义。
    
5.  5\. Kubernetes：Liveness, Readiness, and Startup Probes，探针职责边界。
    
6.  6\. Chaos Mesh：Simulate Network Faults，网络故障注入前提与类型。