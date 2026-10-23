---
id: 2026-10-22-async-task-system-design
title: 异步任务系统怎么设计？从提交、排队、执行到幂等和重试
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/AfZ-w5215Bbi4HS6v1fsFA
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/async-task-system-design.md
wiki_status: ingested
---

# 异步任务系统怎么设计？从提交、排队、执行到幂等和重试

> 线程池≠异步任务系统。可靠系统需要任务身份、持久化队列、状态机、租约、幂等、分级重试、协作式取消与可观测性——线程池只是执行环节的一个零件。

## 核心要点

- **任务即业务数据**：任务表存 task_id/type/payload_location/status/attempt/lease_owner/lease_expire_at 等；大文件写对象存储，任务只存位置+校验值
- **状态机**：PENDING→RUNNING→SUCCEEDED，旁路 RETRY_WAIT/FAILED/CANCELLED；`RUNNING→PENDING` 只有租约过期且执行者失联才允许；领取用条件更新 `WHERE status='PENDING'`，影响行数=1 才算抢到
- **租约**：执行权限时有效，节点定期续租；完成更新带 owner+version，旧执行者影响行数为 0 无法覆盖新执行者；租约时长要大于心跳抖动又不能拖慢故障恢复
- **幂等**：至少一次执行下重复是常态——批量导入用 `(task_id, row_number)` 幂等键；报表写确定路径最后原子切换；通知记录通知 ID
- **重试分级**：RETRYABLE（网络/限流，指数退避+抖动+上限）/ PERMANENT（格式错误，重试无用）/ MANUAL（结果不确定需人工）；超限进 FAILED 或死信
- **进度与取消**：进度每 500 行或 2 秒更新一次，只做观测不参与正确性；取消是协作协议——置 CANCEL_REQUESTED，工作节点在批次边界检查并清理，不强杀线程
- **DB 与 MQ 分工**：DB 存真相与状态查询，MQ 负责通知削峰；Outbox 模式同事务提交任务+事件，MQ 重复无妨，DB 条件更新定执行权
- **可观测与背压**：排队 P95/P99、成功率、租约接管次数、幂等拦截次数等 8 类指标；积压超水位要限提交/降优先级，无限接单只会延迟失败

## 正文

完整任务表字段说明、条件更新 SQL、租约完成与协作取消的 Java 示例、错误分级定义与运营指标清单见 [[Assets/2026/10/async-task-system-design.md]]。

## 来源

- [异步任务系统怎么设计？从提交、排队、执行到幂等和重试](https://mp.weixin.qq.com/s/AfZ-w5215Bbi4HS6v1fsFA)

## 附件

- [[Assets/2026/10/async-task-system-design.md]]
