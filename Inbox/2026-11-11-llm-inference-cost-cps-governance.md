---
id: inbox-20261111-2352
title: LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/vySDY4f_8mceCdh7fyZEqA
source_type: link
platform: wechat
created: 2026-11-11
category: 技术
tags:
  - AI
  - Agent
asset_ref: Assets/2026-11/weixin-llm-inference-cost-cps-governance.md
wiki_status: pending
---

# LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本

> 把「LLM 降本」从 Token 单价换算成可决策指标：给出 CPS（每个合格交付的成本）口径、四层成本全景、缓存盈亏平衡公式、预算预留状态机、路由升级的期望成本模型，以及「先过质量非劣门禁、再看成本」的发布流程。

## 核心要点

1. **优化对象是 CPS，不是单次调用价**：同一批 1,000 个任务，大模型直达花 90 美元、成功 900 个（0.090/任务）；小模型优先花 76 美元、成功 700 个（0.076/任务）——平均成本降了，CPS 却从 0.100 升到约 0.109，成功率还掉 20 个百分点
2. **成本必须归到任务**：`tenant_id` / `task_id` / `attempt_id` / `operation_id` 四层标识贯穿计量、预留与结算；账本以 `(source, source_event_id)` 幂等，金额用「币种 + 最小货币单位整数」，退款与折扣回溯追加调整事件，不重写历史流水
3. **缓存按净收益而非命中率决策**：严格省钱条件是命中次数 `n > (w-1)/(1-r)`；`w=1.25, r=0.1` 一次命中即回本，`w=2` 至少要两次命中；要按模型/区域/档位/TTL/前缀版本拆开报告冷启动、写入失败与净节省
4. **预算是状态机而不是一个数字**：`RESERVED → DISPATCHING → SETTLED / PENDING_USAGE / RELEASED / ADJUSTED`；固定「先锁租户预算行、再锁任务行」；只有上游能强制时才存在事前执行硬上限，否则只能做事后财务上限，不能承诺零超支
5. **路由看期望成本**：`E[cost] = route_cost + small_cost + q × E[escalation]`，`CPS ≈ E[cost] / P(task_success)`；升级率 `q` 必须来自全链路生产样本，校验器没发现的错误仍计为潜在失败
6. **对照实验分五组**（A 大模型直达 / B 小模型直达 / C 分层路由 / D C+受控升级与生产校验 / E D+前缀缓存）：示例里 B 的 CPS 最低（0.065）但复杂层只成功 6/15，达不到 94%/90% 门禁，不具备上线资格
7. **发布门禁四条同时满足**：关键质量单侧置信下界不低于 `-δ`（复杂层单独过）、安全与预算拒绝率达标、P95 延迟不劣、CPS 差值区间支持预期降幅且暂估比例未超阈值；跨租户汇总用「总成本 / 总成功数」，绝不平均各租户的 CPS

## 正文

详见 [[Assets/2026-11/weixin-llm-inference-cost-cps-governance.md]]（全文存档）。

## 来源

[LLM 推理成本治理：从 Token 单价到每个合格交付的真实成本](https://mp.weixin.qq.com/s/vySDY4f_8mceCdh7fyZEqA)

## 附件

[[Assets/2026-11/weixin-llm-inference-cost-cps-governance.md]]
