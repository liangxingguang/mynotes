#!/usr/bin/env node
/**
 * git-backup：提交并推送知识库变更（串行、加锁）
 * - 只提交白名单目录（采集层 + LLM Wiki 层）
 * - 无变更跳过；拿不到锁跳过（后续任务补提交）
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const VAULT = process.env.VAULT_PATH || process.cwd()
const LOCK = path.join(VAULT, '.tmp/backup.lock')
const STALE_MS = 120000
// 提交白名单：采集层 + LLM Wiki 四层（证据 raw / 知识 wiki / 规则 schemas·config·AGENTS.md·
// CLAUDE.md / 执行器 scripts·.claude）+ 工程文件（package.json 声明 type:module 属硬约束）
// 不含密钥（config.toml / mcp.json / .env）与瞬时产物（reports / state/runs / .tmp / logs / node_modules）
const PATHS = [
  'Inbox', 'Archive', 'Assets', 'Index',
  'raw', 'wiki', 'schemas', 'config', 'templates', 'state',
  'scripts', '.claude', 'docs',
  'AGENTS.md', 'CLAUDE.md', 'package.json', 'package-lock.json', '.gitignore'
]

// git add 的 pathspec 只要有一个不匹配（如目录尚未创建）就会整体失败（fatal: pathspec），
// 因此只把"确有变更"的目录交给 git add；git status 对不存在的路径是安全的（输出为空、退出 0）
async function changedPaths() {
  const changed = []
  for (const p of PATHS) {
    if (await git('status', '--porcelain', '--', p)) changed.push(p)
  }
  return changed
}

async function git(...args) {
  const { stdout } = await exec('git', args, { cwd: VAULT })
  return stdout.toString().trim()
}

async function acquireLock() {
  await fs.mkdir(path.join(VAULT, '.tmp'), { recursive: true })
  try {
    const st = await fs.stat(LOCK)
    if (Date.now() - st.mtimeMs > STALE_MS) await fs.unlink(LOCK).catch(() => {})
    else return false
  } catch {
    /* 锁不存在，继续 */
  }
  try {
    await fs.writeFile(LOCK, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    return false
  }
}

async function releaseLock() {
  await fs.unlink(LOCK).catch(() => {})
}

const result = { ok: true, committed: false, skipped: false, reason: '' }

if (!(await acquireLock())) {
  result.skipped = true
  result.reason = 'locked by another task'
  console.log(JSON.stringify(result))
  process.exit(0)
}

try {
  const changed = await changedPaths()
  if (!changed.length) {
    result.skipped = true
    result.reason = 'no changes'
    console.log(JSON.stringify(result))
    process.exit(0)
  }

  await git('add', '--', ...changed)
  const msg = `auto backup: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  try {
    await git('commit', '-m', msg)
  } catch {
    await git('config', 'user.name', process.env.GIT_USER_NAME || 'cc-connect')
    await git('config', 'user.email', process.env.GIT_USER_EMAIL || 'cc-connect@local')
    await git('commit', '-m', msg)
  }
  result.committed = true

  // 推送当前分支（可用 BACKUP_BRANCH 覆盖），避免硬编码 main 与实际分支不一致
  const branch = process.env.BACKUP_BRANCH || (await git('rev-parse', '--abbrev-ref', 'HEAD'))
  let pushed = false
  for (let i = 1; i <= 3 && !pushed; i++) {
    try {
      await git('push', 'origin', branch)
      pushed = true
    } catch {
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  if (!pushed) {
    result.ok = false
    result.reason = 'push failed after 3 retries'
  }
} catch (e) {
  result.ok = false
  result.reason = String(e.message || e).slice(0, 200)
} finally {
  await releaseLock()
}

console.log(JSON.stringify(result))
process.exit(result.ok ? 0 : 1)
