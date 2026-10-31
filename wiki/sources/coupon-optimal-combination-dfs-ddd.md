---
id: wiki-source-coupon-optimal-combination-dfs-ddd
type: source
title: 优惠券最优组合设计：DFS 四层剪枝 + DDD 建模
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - architecture
  - algorithm
  - ddd
sources:
  - raw/sources/architecture/2026-10-30-coupon-optimal-combination-dfs-ddd.md
related:
  - wiki/concepts/control-plane-design.md
---
# 优惠券最优组合设计：DFS 四层剪枝 + DDD 建模

## Overview（概览）

电商大促中优惠券贪心策略算出非全局最优实付引发客诉的治理方案。核心不是一道算法题，而是一套面向复杂约束的控制面设计：用 DDD 领域模型收敛多变业务规则，规则引擎和求解算法做职责隔离，有界 DFS 回溯配合四层剪枝在约束空间内寻优，再叠加降级与一致性兜底守住预计算链路红线。全文约 7.8 千字，含 DFS 寻优伪代码、四层剪枝详解与完整链路复盘。

## Key Facts（关键事实）

- **问题本质**：贪心只看单券局部收益，看不到组合后的全局收益（例：券 A 减 50 vs 券 B+C 减 60，贪心选 A 非最优）。DP 适合维度固定、约束单一，优惠券约束异构（互斥分组/商品作用域/准入门槛/叠加上限/优先级/赠品），状态空间爆炸无法承载。
- **DDD 控制面**：两大聚合——优惠券模板（配置态，含 Condition/Benefit/Constraint 值对象）+ 用户券实例（运行时）。六张表：coupon_template / coupon_exclude_group / coupon_activity / coupon_user / coupon_use_log / coupon_combination_snap。三个限界上下文：模板配置域 / 券钱包域 / 计算引擎域。
- **快照一致性锚点**：coupon_combination_snap 的核心价值是订单预优惠结果的一致性锚点（提交瞬间固化，防核销漂移），提速只是附加收益。
- **四层剪枝**（按收益排序）：① 预处理（支配剪枝+连通域拆分+按互斥组降维，2^N → 各组乘积）② 排序剪枝（收益降序尽早拿到优解）③ 门槛剪枝（剩余基数不满足未选券准入门槛即回溯）④ 分支定界（理论下界 ≥ 当前最优即剪枝，线上核心优化点）。
- **BitMask 互斥校验**：互斥组映射 bit 位，O(1) 判定。红线——禁止直接用自增 groupId 做偏移（64 位溢出），需维护 groupId→bit 映射表；分组膨胀后降级 HashSet。
- **稳定性红线**：搜索节点硬上限 5000 + 200ms 超时熔断 + 超限降级回贪心（业务侧须兼容金额变动）+ 剪枝命中/降级率全量埋点 + 请求幂等流水号。

## Important Claims（重要论断）

### Claim 1：核心本质是控制面设计，不是算法题

整套方案的稳定性根源不在 DFS 递归和剪枝公式本身，而在 DDD 建模收敛出来的约束契约。规则引擎承担前置过滤 + 路径约束校验，算法只在合法空间内搜索，双向互不侵入。运营调整规则只改配置，寻优代码一行不动——这是控制面的价值。

### Claim 2：多目标拆分是控制复杂度的关键

赠品券与金额券混算易出现目标冲突（赠品互斥活动不满足但金额最优）。取舍方案：主优化目标维持实付金额最小，赠品约束后置做硬校验；赠品存在互斥关系时纳入 Constraint 做二级约束，不并入主搜索目标，避免搜索空间二次爆炸。不追求单轮搜索解决所有目标。

### Claim 3：算法正确性只是基础门槛，工程落地难点在配套控制面

踩坑复盘：快照必须绑定订单状态设 TTL + 冷热分离（防存储膨胀）；灰度双链路并行比对差异率（非简单流量切分）；剪枝逻辑本质是业务规则，新增券类型必须回归架构评审（防击穿剪枝前置假设）。

## Concepts Introduced（引入的概念）

- [[control-plane-design|规则控制面与寻优计算面分离]]（本信源为该概念提供电商优惠券场景的完整工程实例）

## Entities Mentioned（提及的实体）

- 优惠券模板聚合（配置态领域实体）
- 用户券实例聚合（运行时领域实体）
- coupon_combination_snap（一致性锚点快照组件）

## Implications（影响／启示）

- **规则与算法分离是高频变更场景的通用架构**：当业务规则频繁调整而求解算法稳定时，把规则收敛为领域契约、算法只消费契约，可让运营自助调整而不触碰核心代码。
- **降级比最优更重要**：预优惠计算属于下单核心前置链路，不能把业务可用性绑定在算法输出上。搜索节点上限 + 超时熔断 + 降级回退贪心是工程红线。
- **剪枝假设是隐性业务规则**：支配剪枝、连通域拆分的判定逻辑本质是业务规则，新增券类型可能击穿假设，必须回归评审。

## Limitations（局限）

- 单一公众号信源、单一电商场景，无第三方核验。
- 四层剪枝的具体参数（maxIter=5000、200ms 超时）为该团队业务水位，不同场景需重新压测确定。
- BitMask 方案在互斥组数量接近 64 时需降级 HashSet，文中未展开降级切换的触发条件与性能影响。

## Related Knowledge（相关知识）

- [[control-plane-design|规则控制面与寻优计算面分离（概念页）]]
- [[idempotency-design|幂等设计]]（请求幂等流水号）
- [[retry-governance|重试治理]]（降级与熔断的系统设计）

## Source（信源）

- `raw/sources/architecture/2026-10-30-coupon-optimal-combination-dfs-ddd.md`
