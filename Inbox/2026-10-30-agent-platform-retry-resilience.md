---
id: 2026-10-30-agent-platform-retry-resilience
title: 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/bEuxXk_f9GSBoZH5a5_RxA
source_type: link
platform: wechat
created: 2026-10-30
category: 技术
tags: [分布式系统, 工程实践, AI]
asset_ref: Assets/2026/10/agent-platform-retry-resilience.md
wiki_status: pending
---

# 从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计

> 以 Agent 平台 `API → Scheduler → Worker → ToolExecutor → MCP/LLM` 调用链为背景的系统设计长文。核心结论：可靠性不是"多试几次"，而是限定额外工作——一次业务操作必须有唯一重试所有者，并同时受时间、次数、额度、并发、副作用语义五条边界约束。最危险的不是依赖完全不可用，而是"仍偶尔成功但每次占用更久"，此时各层独立重试会在下游容量最低时制造乘法放大（三层各重试 3 次 → 最深层可达 64 次）。

## 核心要点

- **术语先统一**：逻辑操作（operation_id 贯穿恢复）≠ 网络尝试 ≠ Worker 接管（不能重置尝试数）≠ Agent 再规划（新业务决策）。`max_attempts` 统一表示含首次的总尝试次数；SDK 重连、传输层重发等 hidden retry 必须分别审计。
- **容量用 Little 定律看**：1,000 次/秒 × 占用从 80ms 退化到 2s → 在途从 80 涨到 2,000，连接池瞬间耗尽。加连接数不等于加容量；P99 不能直接当容量依据。
- **五类时间边界分开定义**：Task Expiry / Step Deadline / Attempt Timeout / Connect Phase Timeout / Queue Max Age；每次尝试前检查剩余时间是否够"退避+最低有价值执行+收尾"，注定失败的尝试应直接终止或持久化延期。
- **错误分类决定重试资格**：参数错误/取消/截止→终止；Bulkhead 满/Breaker Open/预算不足→本地终止（不进重试循环、不污染熔断统计）；429→尊重 Retry-After 延期；连接断开→结果未知，写操作先查结果。
- **幂等键是服务端协议**：唯一约束、请求摘要比对、明确"执行中/未知"状态、覆盖恢复窗口的保留期、可选 fencing；键派生自 tenant+task+step+operation，不含 attempt 序号。
- **Retry Budget 用按首次记账的数量预算**：首次补充 β 份额度、重试消耗一份，可得放大率上界 A ≤ 1+β；桶按 dependency+tool_class 隔离，且**初始为空**——初始满桶会让每个新 Pod 获得免费突发。
- **准入/Bulkhead/背压管首次流量**：预算只管额外尝试；Bulkhead 语义是快速失败而非排队；退避期间不占用调用槽位。
- **熔断只看真实下游结果**，恢复必须渐进放量；Envoy 的 max_retries/retry_budget 是本地并发语义，不等价于全局额度。
- **跨 Worker 恢复靠持久化**：attempt_reserved_count、policy_version、幂等键、fencing token，防止接管重置次数；给出 6 阶段上线路线（基线→所有权→安全→容量→控制→证据→扩展）与 A–F 消融实验设计。

## 正文

见 [[Assets/2026/10/agent-platform-retry-resilience.md]]（全文约 1.7 万字，含策略矩阵、ToolExecutor 12 步执行链伪代码、Go 预算/舱壁示例、Prometheus 指标清单与故障演练协议）。

## 来源

- [从重试风暴到可控恢复：Agent 平台超时、退避、熔断与背压的系统设计](https://mp.weixin.qq.com/s/bEuxXk_f9GSBoZH5a5_RxA)

## 附件

- [[Assets/2026/10/agent-platform-retry-resilience.md]]
