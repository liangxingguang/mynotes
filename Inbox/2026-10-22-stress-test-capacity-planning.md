---
id: 2026-10-22-stress-test-capacity-planning
title: 第二十课：高并发系统压测与容量规划
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/BhCRjKjsYNftqmQQP9pT-Q
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - 课程
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/stress-test-capacity-planning.md
wiki_status: pending
---

# 第二十课：高并发系统压测与容量规划

> 架构师之路系列第 20 课。从"拍脑袋估流量"到科学容量体系：峰值 QPS 估算公式、压测三板斧、影子库数据隔离、wrk2 恒定速率、性能曲线拐点解读、机器数公式与 70/80/90 水位线管理，附 5 个压测失真坑与自检脚本。

## 核心要点

- **容量≠性能**：性能是"一个请求多快"（代码/SQL 优化），容量是"单位时间多少请求"（扩容/降级/规划）；压测量路宽，规划定道数
- **峰值估算**：峰值 QPS = 日活 × 人均请求 × 集中系数 ÷ 峰值秒数；集中系数取历史监控"峰值÷日均"倍数（大促 20~50 倍），宁高估 20%
- **三板斧**：单接口摸裸容量 → 链路验放大效应 → 全链路影子流量测协同，顺序不能乱；稳态压 30 分钟起（短压出性能、长压出容量）
- **数据隔离**：X-Load-Test 标记全链路透传 + 影子表/库/Topic 路由；标记丢失比不压测更危险，需写入侧反向校验+隔离验证通过才许开压
- **coordinated omission**：wrk 闭环压测随服务变慢自动减速，漏掉最差样本；容量评估必须用 wrk2/Gatling 恒定速率（open-loop）
- **曲线三段**：线性区→拐点区→陡增区；容量取拐点左缘 70~80%，绝不按极限值；M/M/1 排队论：利用率 95% 时 RT 放大 20 倍
- **机器数公式**：峰值 QPS ÷ 单机容量（压测拐点值）× 冗余系数 1.3~1.5，反验水位 ≤70%
- **5 个失真坑**：环境规格不一致、压测数据污染生产、连接池太小测的是池、参数全热缓存 TPS 虚高、JVM 未预热；附 precheck.sh 自检脚本

## 正文

完整 PromQL 输入、JMeter/wrk2/Gatling 配置、jstack 瓶颈抓捕、HPA/降级开关配置与大促 checklist 见 [[Assets/2026/10/stress-test-capacity-planning.md]]。

## 来源

- [第二十课：高并发系统压测与容量规划](https://mp.weixin.qq.com/s/BhCRjKjsYNftqmQQP9pT-Q)

## 附件

- [[Assets/2026/10/stress-test-capacity-planning.md]]
