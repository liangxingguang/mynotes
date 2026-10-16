---
id: 2026-10-17-ai-coding-delivery-evolution
title: AI 写代码越来越快，研发交付系统该怎么演进？
source: 微信公众号「架构师」
source_url: https://mp.weixin.qq.com/s/cUvvE5eiIc2KlB3SZ-WQhg
source_type: link
platform: 微信
created: 2026-10-17
category: 技术
tags: [AI Coding, 工程实践, Harness]
asset_ref: Assets/2026/10/ai-coding-delivery-evolution.md
wiki_status: pending
---

# AI 写代码越来越快，研发交付系统该怎么演进？

> AI Coding 拓宽了编码环节，交付瓶颈随之搬家：需求澄清、变更审查、环境验证、上线确认开始排队。文章主张把交付建模为状态机（意图→候选→持久化→合并→验证→可部署→已生效），让规格随事实更新、Harness 留住执行现场、证据绑定不可变版本、知识库当作带有效期的缓存，人退到"on the loop"守住风险分叉口。落地建议：先跑通一类边界清楚的变更，用交付质量指标代替生成量衡量成败。

## 核心要点

- **瓶颈转移**：METR 实验显示熟手用 AI 反而慢 19%——局部提速 ≠ 端到端提速；交付量取决于最慢一段，不是最快一段
- **状态机建模**：避免一句"做完了"代表七件事；每次状态推进记录旧/新状态、对象版本、证据引用、发起者，可沿记录排查而非重放对话
- **规格跟事实走**：意图版本随证据更新且每次修改留痕；上下文按当前状态取一小片材料，而非全量塞入
- **Harness 与业务事实分离**：Harness 保存执行现场（哪步、调了什么、能否安全重试），但不得因请求超时就自行改写业务状态；模型处理含糊，状态机守边界
- **证据绑定版本**："测试通过"必须指明对应哪个提交/构建/环境；验证尽早交给确定性工具，模型只做语义判断；测试 r19 不能给代码 c8 背书
- **知识是缓存**：知识带版本、来源、有效期，冲突时回到代码/配置/运行系统这个事实源确认；失败要写回规格/测试/Harness 形成组织积累
- **人守分叉口**：从 in the loop 到 on the loop；按改动范围、可回滚性、数据影响分流，低风险自动推进，涉资金/权限/公开 API 必须人工确认

## 正文

见 [[Assets/2026/10/ai-coding-delivery-evolution.md|抓取正文]]。

## 来源

- [AI 写代码越来越快，研发交付系统该怎么演进？](https://mp.weixin.qq.com/s/cUvvE5eiIc2KlB3SZ-WQhg)

## 附件

- [[Assets/2026/10/ai-coding-delivery-evolution.md]]
