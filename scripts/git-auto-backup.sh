#!/usr/bin/env bash
# 知识库自动备份（Linux/macOS）
# 只提交白名单目录（采集层 + LLM Wiki 层），不使用 git add .（避免密钥与 .tmp 入库）
set -uo pipefail

VAULT_PATH="${VAULT_PATH:-/opt/obsidian-knowledge}"
cd "$VAULT_PATH" || exit 1
# 与 Node 版 git-backup.js 对齐：默认推送当前分支，避免硬编码 main 与实际分支不一致
BRANCH="${BACKUP_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"

# git diff 只覆盖已跟踪文件，会漏掉新增的未跟踪笔记，故用 git status --porcelain
# 采集层 + LLM Wiki 四层（raw/wiki/schemas/config/templates/state/scripts/.claude）+ 运行契约与工程文件
PATHS="Inbox Archive Assets Index raw wiki schemas config templates state scripts .claude docs AGENTS.md CLAUDE.md package.json package-lock.json .gitignore"
if [ -z "$(git status --porcelain -- $PATHS)" ]; then
  echo "no changes, skip backup"
  exit 0
fi

# git add 的 pathspec 只要有一个不匹配（如目录尚未创建）就会整体失败，
# 故只把"确有变更"的目录交给 git add；git status 对不存在的路径是安全的
ADD=""
for d in $PATHS; do
  [ -n "$(git status --porcelain -- "$d")" ] && ADD="$ADD $d"
done
# shellcheck disable=SC2086
git add -- $ADD
if ! git commit -m "auto backup: $(date '+%Y-%m-%d %H:%M')"; then
  # 非交互环境可能缺少身份配置
  git config user.name "${GIT_USER_NAME:-cc-connect}"
  git config user.email "${GIT_USER_EMAIL:-cc-connect@local}"
  git commit -m "auto backup: $(date '+%Y-%m-%d %H:%M')" || exit 1
fi

for i in 1 2 3; do
  if git push origin "$BRANCH"; then
    echo "backup pushed"
    exit 0
  fi
  sleep 3
done

echo "backup push failed" >&2
exit 1
