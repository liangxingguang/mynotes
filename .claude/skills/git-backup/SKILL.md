---
name: git-backup
description: 把知识库变更提交并推送到 GitHub 私有仓库。任务收尾调用，串行执行（内部加锁），无变更则跳过。
---

## 用法
node scripts/skills/git-backup.js

## 行为
- 提交白名单：Inbox Archive Assets Index / raw wiki schemas config templates state / scripts .claude docs / AGENTS.md CLAUDE.md package.json package-lock.json .gitignore
- 不含密钥（config.toml / mcp.json / .env）与瞬时产物（reports / state/runs / .tmp / logs / node_modules）
- 只把「确有变更」的路径交给 git add（pathspec 不匹配会整体失败）
- 无变更直接退出 0
- 获取 .tmp/backup.lock；拿不到锁则跳过（后续任务会补提交）；锁超 120 秒视为 stale
- 提交当前分支，push origin 当前分支（可用 BACKUP_BRANCH 覆盖），失败重试 3 次

## 输出
JSON：{ ok, committed, skipped, reason }
