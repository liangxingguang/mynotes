---
id: 2026-10-22-database-high-availability
title: 当我谈数据库高可用时是在谈些什么
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/x6c6RSYUdivoou1a6-NV6A
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 工程实践
  - 数据库
asset_ref: Assets/2026/10/database-high-availability.md
wiki_status: pending
---

# 当我谈数据库高可用时是在谈些什么

> 京东技术团队出品的数据库高可用体系科普。以五层主线串起完整图景：单机崩溃可恢复（WAL/2PC/双1）→ 主备复制（异步/半同步/RPO）→ GTID 全局事务身份证 → 主备安全切换（fencing/PRS/ERS）→ Orchestrator 自动化容错，最后延伸到应用侧协同降级，点出"高可用是数据库与应用双向奔赴"。

## 核心要点

- **五层主线**：①单机不丢（WAL + redo/binlog 两阶段提交 + 崩溃恢复 + 双1参数）②复制到备库（异步快但丢、半同步一次 RTT 换不丢）③GTID（server_uuid:事务号，终身不变，auto-position 自动对齐、幂等跳过重放）④安全切换（fencing 防老主诈尸脑裂；PRS 计划内近零 RTO、ERS 紧急优先防脑裂）⑤自动化（Orchestrator 发现→判断→选主→执行）
- **redo vs binlog**：redo 是引擎内部账本（物理日志、循环覆盖、崩溃前滚），binlog 是 Server 层对外广播的变更流（逻辑日志、持续追加，复制与 PITR 靠它）；2PC 顺序 redo-prepare → binlog-write → redo-commit，以 binlog 是否落盘裁决 prepare 事务命运，保证主备视角一致
- **半同步的坑**：超时后悄悄退化为异步；现网核心库把 `rpl_semi_sync_master_timeout` 设为 8640000ms 视为"不退化"，叠加三机房实现 RPO=0；`AFTER_SYNC`（引擎提交前等备确认）比 `AFTER_COMMIT` 更少幽灵读
- **Orchestrator 反证法**：不只看自己能否连上 master，更看 master 的 replica 是否还连得上它——`UnreachableMaster`（orc 连不上但 replica 正常）不切换，`DeadMaster`（双方都失联）才切，避免网络抖动误切
- **probe-agent 补内外视角**：部署在 DB 主机本地，心跳上报区分"DB 死 vs 网络断"，本地负载/大事务 GTID 差/磁盘/真实写探测是 orc 远端探测看不到的"眼睛和手"
- **选主四要素**：GTID 集合最全、promotion rule（must/prefer/neutral/prefer_not/must_not）、candidate 登记、同机房且版本兼容
- **应用侧协同**：DB 必有数十秒不可写窗口，应用需 MQ 异步削峰、最终一致性、读降级走备库、写降级兜底回放、快速失败+熔断，数据库与应用双向奔赴才是真高可用
- **反面案例**：GitHub 主库脑裂 24h 恢复、AWS RDS 单 AZ 未开 failover、阿里云香港 2022 故障（代理与实例同 AZ 导致切换流程起不来，宕机 >15h）

## 正文

完整的三种日志分工表、双1参数对照、半同步两种 wait point、GTID 集合表示、orc 八种 AnalysisCode 判定表、probe-agent 五个文件职责与应用侧五种兜底手段对照，见 [[Assets/2026/10/database-high-availability.md]]。

## 来源

- [当我谈数据库高可用时是在谈些什么](https://mp.weixin.qq.com/s/x6c6RSYUdivoou1a6-NV6A)
