---
id: 2026-10-30-coupon-optimal-combination-dfs-ddd
title: 优惠券最优组合设计：DFS 四层剪枝 + DDD 建模，商城结算工业级落地
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/j5jttq6rZ6LP7VVX-EeIcQ
source_type: link
platform: wechat
created: 2026-10-30
category: 技术
tags: [工程实践, Java]
asset_ref: Assets/2026/10/coupon-optimal-combination-dfs-ddd.md
wiki_status: ingested
---

# 优惠券最优组合设计：DFS 四层剪枝 + DDD 建模，商城结算工业级落地

> 电商大促中优惠券贪心策略算出非全局最优实付引发客诉的治理方案。核心不是算法题，而是"规则控制面 + 寻优计算面"分离的控制面设计：DDD 领域模型收敛多变规则、规则引擎与 DFS 回溯算法职责隔离、四层剪枝压缩搜索空间、降级与快照兜底守住预计算链路。贪心的缺陷是策略边界（只看单券局部收益），DP 则被异构约束（互斥/门槛/优先级/赠品）的爆炸状态空间排除。

## 核心要点

- **DDD 控制面**：两大聚合（券模板=配置态，含 Condition/Benefit/Constraint 值对象；券实例=运行时）+ 六张表；`coupon_combination_snap` 快照的核心价值是**一致性锚点**（固化提交瞬间的优惠结果，防核销漂移），提速只是附加收益。三个限界上下文（模板配置/券钱包/计算引擎）靠领域事件同步，红线是营销配置变更不侵入计算域。
- **四层剪枝**（按收益排序）：① 预处理（支配剪枝+连通域拆分+按互斥组降维，2^N → 各组乘积，投入产出最高）② 排序剪枝（收益降序尽早拿到优解）③ 门槛剪枝 ④ 分支定界（理论下界 ≥ 当前最优即剪枝，线上核心优化点）。
- **BitMask 互斥校验**：互斥组映射 bit 位，O(1) 判定；红线——禁止直接用自增 groupId 做偏移（64 位溢出），需维护 groupId→bit 映射表；分组膨胀后降级 HashSet。
- **稳定性红线**：搜索节点硬上限 5000 + 200ms 超时熔断 + 超限降级回贪心（业务侧须兼容金额变动防二次校验拦截）+ 剪枝命中/降级率全量埋点（降级突增=水位预警）+ 请求幂等流水号。
- **踩坑复盘**：赠品券不并入主搜索目标（后置硬校验，防搜索空间二次爆炸）；快照必须绑定订单状态设 TTL + 冷热分离；灰度双链路并行比对差异率；剪枝逻辑本质是业务规则，新增券类型必须回归评审。
- **场景边界**：适合持券量中等、互斥规则复杂、客诉代价高的大促场景；券少规则简单用贪心即可，极致低延迟/海量券无分组场景不值得。

## 正文

见 [[Assets/2026/10/coupon-optimal-combination-dfs-ddd.md]]（全文约 7.8 千字，含 DFS 寻优伪代码、四层剪枝详解与完整链路复盘）。

## 来源

- [优惠券最优组合设计：DFS 四层剪枝 + DDD 建模，商城结算工业级落地](https://mp.weixin.qq.com/s/j5jttq6rZ6LP7VVX-EeIcQ)

## 附件

- [[Assets/2026/10/coupon-optimal-combination-dfs-ddd.md]]
