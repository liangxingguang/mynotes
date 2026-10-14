# 知识库自动备份（Windows，PowerShell 5.1+）
# 只提交白名单目录（采集层 + LLM Wiki 层），不使用 git add .

$VAULT_PATH = if ($env:VAULT_PATH) { $env:VAULT_PATH } else { 'C:\obsidian-knowledge' }
$BRANCH = if ($env:BACKUP_BRANCH) { $env:BACKUP_BRANCH } else { 'main' }
Set-Location $VAULT_PATH

# 采集层 + LLM Wiki 四层（raw/wiki/schemas/config/templates/state/scripts/.claude）+ 运行契约与工程文件
$Paths = @(
  'Inbox','Archive','Assets','Index',
  'raw','wiki','schemas','config','templates','state',
  'scripts','.claude',
  'AGENTS.md','CLAUDE.md','package.json','package-lock.json','.gitignore'
)
$status = git status --porcelain -- $Paths
if (-not $status) { Write-Host 'no changes, skip backup'; exit 0 }

# git add 的 pathspec 只要有一个不匹配（如目录尚未创建）就会整体失败，
# 故只把"确有变更"的目录交给 git add；git status 对不存在的路径是安全的
$add = @()
foreach ($d in $Paths) { if (git status --porcelain -- $d) { $add += $d } }
if ($add.Count -gt 0) { git add -- $add }
git commit -m "auto backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
if (-not $?) {
  if ($env:GIT_USER_NAME) { git config user.name $env:GIT_USER_NAME } else { git config user.name 'cc-connect' }
  if ($env:GIT_USER_EMAIL) { git config user.email $env:GIT_USER_EMAIL } else { git config user.email 'cc-connect@local' }
  git commit -m "auto backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  if (-not $?) { Write-Error 'commit failed'; exit 1 }
}

for ($i = 1; $i -le 3; $i++) {
  git push origin $BRANCH
  if ($?) { Write-Host 'backup pushed'; exit 0 }
  Start-Sleep -Seconds 3
}

Write-Error 'backup push failed'
exit 1

