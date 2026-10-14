---
name: git-backup
description: 把知识库变更提交并推送到 GitHub 私有仓库。任务收尾调用，串行执行（内部加锁），无变更则跳过。
---

## 用法
node scripts/skills/git-backup.js

## 行为
- 只提交 Inbox Archive Assets Index 四个目录（不使用 git add .）
- 无变更直接退出 0
- 获取 .tmp/backup.lock；拿不到锁则跳过（后续任务会补提交）
- push 失败重试 3 次

## 输出
JSON：{ ok, committed, skipped, reason }
