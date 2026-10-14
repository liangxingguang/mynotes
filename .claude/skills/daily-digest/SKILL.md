---
name: daily-digest
description: 生成当日采集汇总并推送到 IM。由定时任务（每日 21:00）触发，只读 Index/index.json，不写 Vault、不消耗 AI 额度。
---

## 用法
node scripts/skills/daily-digest.js          # 输出汇总文本到 stdout
node scripts/skills/daily-digest.js --push   # 额外调用 cc-connect send --message 推送

## 行为
- 统计今天（按 created 日期）采集的笔记：总数、来源平台、类型、标签分布、异常条目
- 附带 Inbox 待整理积压数
- 当天零采集则不推送（skip_if_empty）

## 依赖
推送依赖 cc-connect send 命令可用
