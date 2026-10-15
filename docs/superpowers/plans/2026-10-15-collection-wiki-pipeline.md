# 采集 → Wiki 异步贯通与自动备份 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增队列状态机（claim/done/fail）、近实时异步触发器、存量回填脚本，使采集后的笔记自动经独立会话摄入 Wiki，并由现有钩子自动备份 GitHub；手动 `/ingest` 与每日 cron 兜底保留。

**Architecture:** 三个仅依赖 Node 内置模块的 ESM 脚本 + 一个共享 frontmatter 库；状态以笔记 frontmatter 字段为准，`.tmp/queue.lock` 跨进程互斥；cc-connect `send` 作为采集会话→摄入会话的异步边界；备份复用现有 `message.sent` 钩子，不新建机制。

**Tech Stack:** Node.js（ESM，`node:fs` / `node:test` / `node:child_process`），无新依赖；cc-connect v1.5.0 cron/send。

**Spec:** `docs/superpowers/specs/2026-10-15-collection-wiki-pipeline-design.md`（计划与 spec 配套，执行者两份都读）

## Global Constraints

- 只写 `Inbox/`、`Archive/`、`scripts/`、`.claude/`、`docs/`、`wiki/log.md`（追加）、`AGENTS.md`、`CLAUDE.md`、`package.json`；**绝不修改 `raw/` 既有文件**。
- Node ESM（package.json 已声明 `"type": "module"`）；仅用内置模块，不安装依赖。
- 所有脚本以 `VAULT_PATH`（默认 `process.cwd()`）为 Vault 根，输出单行 JSON，错误 `{ok:false,...}` + 退出码 1；`queue-trigger.js` 例外（任何情况退出 0）。
- `Inbox/` 非递归扫描（AGENTS.md 附录 B.6）；锁与冷却文件只放 `.tmp/`（已 gitignore）。
- 常量：认领 1 篇/次；stale 回收 30 分钟；失败转 failed 阈值 3 次；trigger 冷却 10 分钟；锁等待 5 秒、锁 stale 120 秒。
- 提交信息结尾加 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- Windows（本机）与 Linux（云端 /opt/obsidian-knowledge）双端兼容：代码不使用 shell 语法、路径一律 `path.join`。

## Review Focus

1. **CRLF 与 frontmatter 往返**：真实笔记可能是 CRLF、含中文冒号；`setFrontmatterFields` 改写后正文一字不动、字段不重复、`ingest_error` 里的冒号/引号被正确转义。→ Task 1 测试。
2. **跨进程并发认领**：两个摄入会话同时 claim 绝不能拿到同一篇。→ Task 2 双进程测试。
3. **迟到会话防误改**：done/fail 带 `--claim-id` 不匹配时必须拒绝；对已归档/非 ingesting 笔记执行 done/fail 必须干净报错。→ Task 2 测试。
4. **trigger 永不致命**：cc-connect 不存在/socket 缺失时退出码必须为 0（async 钩子非零退出发错误回执）。→ Task 3 测试。
5. **回填幂等与兼容**：已有 `wiki_status` 的笔记绝不二次改动；无 frontmatter 的坏文件不能让脚本崩溃。→ Task 4 测试。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `scripts/skills/lib/frontmatter.js` | frontmatter 解析/字段写回（支持 null 删字段）、Inbox 列表、stale 判定、原子写 | 新建 |
| `scripts/skills/queue-claim.js` | 队列状态机 CLI + 可测函数：claim/done/fail/status | 新建 |
| `scripts/skills/queue-trigger.js` | 队列检查 + 冷却 + `cc-connect send` 异步触发 | 新建 |
| `scripts/skills/queue-backfill.js` | 存量笔记 dry-run/--apply 回填 | 新建 |
| `tests/queue.test.js` | 上述全部单元/CLI/并发测试 | 新建 |
| `package.json` | test 脚本改为 `node --test tests/` | 修改 |
| `AGENTS.md`、`CLAUDE.md`、`.claude/skills/wiki-ingest/SKILL.md`、`.claude/skills/git-backup/SKILL.md` | 契约与 skill 同步（AGENTS.md 2.4 流程） | 修改 |
| `scripts/skills/git-backup.js`、`scripts/git-auto-backup.sh`、`scripts/git-auto-backup.ps1` | 白名单追加 `docs` | 修改 |
| `wiki/log.md` | 追加一条 migration 记录 | 追加 |
| `config.toml`（gitignored，本机模板） | message.sent 追加 queue-trigger 钩子 | 修改（部署 Task 9） |

共享数据结构（Task 1 产出，后续任务依赖）：

```ts
type Note = {
  file: string            // '2026-10-15-x.md'
  rel: string             // 'Inbox/2026-10-15-x.md'
  abs: string             // 绝对路径
  fm: Record<string,string>  // 全部值为字符串
  md: string              // 文件原文
  title: string           // fm.title || 首个 # 标题 || 文件名
}
```

---

### Task 1: frontmatter 共享库

**Files:**
- Create: `scripts/skills/lib/frontmatter.js`
- Test: `tests/queue.test.js`（本任务建文件，后续任务追加用例）

**Interfaces:**
- Produces:
  - `parseFrontmatter(md): {fm, body, raw}`（无 frontmatter 时 `fm={}`）
  - `setFrontmatterFields(md, fields: Record<string,string|number|null>): string`（null = 删除该字段行；已有字段原地替换，新字段追加到块尾；无 frontmatter 时新建块）
  - `STALE_MS = 1_800_000`
  - `isIngestStale(fm, now=new Date()): boolean`（`wiki_status==='ingesting'` 且 `ingest_claimed_at` 可解析、超 30 分钟；时间不可解析返回 false）
  - `listInboxNotes(vault): Promise<Note[]>`（按文件名排序；Inbox 不存在返回 []；单文件读取失败抛错由调用方处理）
  - `writeNote(abs, md): Promise<void>`（`*.tmp` + rename 原子写）

- [ ] **Step 1: 写失败测试**

创建 `tests/queue.test.js`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseFrontmatter, setFrontmatterFields, isIngestStale } from '../scripts/skills/lib/frontmatter.js'

test('parse/set frontmatter：替换、新增、删除字段且正文不动（含 CRLF）', () => {
  const md = '---\r\nid: abc\r\nwiki_status: pending\r\n---\r\n\r\n# 标题\r\n正文：保留\r\n'
  const out = setFrontmatterFields(md, {
    wiki_status: 'ingesting',
    ingest_attempts: 0,
    ingest_error: '失败：原因含 "引号" 与 # 号',
    id: null
  })
  const { fm } = parseFrontmatter(out)
  assert.equal(fm.wiki_status, 'ingesting')
  assert.equal(fm.ingest_attempts, '0')
  assert.equal(fm.ingest_error, '失败：原因含 "引号" 与 # 号')
  assert.equal(fm.id, undefined)
  assert.ok(out.endsWith('# 标题\r\n正文：保留\r\n'))
  assert.equal((out.match(/^---/gm) || []).length >= 2, true)
})

test('setFrontmatterFields：无 frontmatter 时新建', () => {
  const out = setFrontmatterFields('# 裸笔记\n', { wiki_status: 'skipped' })
  assert.match(out, /^---\nwiki_status: skipped\n---\n/)
})

test('isIngestStale：仅 ingesting 且超 30 分钟才算 stale', () => {
  const now = new Date('2026-10-15T12:00:00Z')
  assert.equal(isIngestStale({ wiki_status: 'pending' }, now), false)
  assert.equal(isIngestStale({ wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T11:40:00Z' }, now), false)
  assert.equal(isIngestStale({ wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T11:20:00Z' }, now), true)
  assert.equal(isIngestStale({ wiki_status: 'ingesting', ingest_claimed_at: 'bad' }, now), false)
})
```

- [ ] **Step 2: 跑测试确认失败**

`node --test tests/queue.test.js` → FAIL（Cannot find module）。

- [ ] **Step 3: 实现 `scripts/skills/lib/frontmatter.js`**

```js
/**
 * frontmatter 共享库：极简 YAML 子集（仅单行标量），供队列脚本使用。
 * 不引入第三方依赖；写回只动 frontmatter 字段行，正文逐字节保留。
 */
import fs from 'node:fs/promises'
import path from 'node:path'

export const STALE_MS = 30 * 60 * 1000

export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { fm: {}, body: md, raw: null }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    fm[kv[1]] = v
  }
  return { fm, body: md, raw: m[1] }
}

function formatValue(v) {
  if (typeof v === 'number') return String(v)
  // 含 YAML 特殊字符或首尾空白时，按 JSON 双引号转义（中文标点不影响）
  if (/[:#\[\]{}&*!|>'"%@`,]/.test(v) || /^\s|\s$/.test(v)) return JSON.stringify(v)
  return v
}

export function setFrontmatterFields(md, fields) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) {
    const head =
      '---\n' +
      Object.entries(fields)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k}: ${formatValue(v)}`)
        .join('\n') +
      '\n---\n\n'
    return head + md
  }
  const lines = m[1].split(/\r?\n/)
  const seen = new Set()
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):/)
    if (kv && Object.prototype.hasOwnProperty.call(fields, kv[1])) {
      const v = fields[kv[1]]
      lines[i] = v === null ? null : `${kv[1]}: ${formatValue(v)}`
      seen.add(kv[1])
    }
  }
  const kept = lines.filter((l) => l !== null)
  for (const [k, v] of Object.entries(fields)) {
    if (!seen.has(k) && v !== null) kept.push(`${k}: ${formatValue(v)}`)
  }
  return md.slice(0, m.index) + '---\n' + kept.join('\n') + '\n---' + md.slice(m.index + m[0].length)
}

export function isIngestStale(fm, now = new Date()) {
  if (fm.wiki_status !== 'ingesting') return false
  const t = Date.parse(fm.ingest_claimed_at || '')
  return !Number.isNaN(t) && now.getTime() - t > STALE_MS
}

export async function listInboxNotes(vault) {
  const dir = path.join(vault, 'Inbox')
  let files = []
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')).sort()
  } catch {
    return []
  }
  const notes = []
  for (const f of files) {
    const abs = path.join(dir, f)
    const md = await fs.readFile(abs, 'utf8')
    const { fm } = parseFrontmatter(md)
    notes.push({
      file: f,
      rel: `Inbox/${f}`,
      abs,
      fm,
      md,
      title: fm.title || md.match(/^#\s+(.+)$/m)?.[1]?.trim() || f.replace(/\.md$/, '')
    })
  }
  return notes
}

export async function writeNote(abs, md) {
  const tmp = `${abs}.tmp`
  await fs.writeFile(tmp, md, 'utf8')
  await fs.rename(tmp, abs)
}
```

- [ ] **Step 4: 跑测试确认通过**

`node --test tests/queue.test.js` → 3 passed。

- [ ] **Step 5: 提交**

```bash
git add scripts/skills/lib/frontmatter.js tests/queue.test.js
git commit -m "feat: 队列脚本共享 frontmatter 库

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: queue-claim 队列状态机

**Files:**
- Create: `scripts/skills/queue-claim.js`
- Test: `tests/queue.test.js`（追加）

**Interfaces:**
- Consumes: Task 1 的 `parseFrontmatter/setFrontmatterFields/listInboxNotes/writeNote/isIngestStale/STALE_MS`。
- Produces（函数与 CLI 同名同义，后期任务/模型只通过 CLI 使用）：
  - CLI：`claim [N] [--include-failed]` → `{ok, claimed:[{path,title,claim_id}]}`
  - CLI：`done <path|id> [--claim-id <id>]` → `{ok, archived:"Archive/xx.md"}`
  - CLI：`fail <path|id> --reason <txt> [--claim-id <id>]` → `{ok, status:"pending"|"failed", attempts}`
  - CLI：`status` → `{ok, pending, ingesting, failed, stale, skipped}`
  - 导出函数：`claim({vault,n=1,includeFailed=false,now=new Date()})`、`finish({vault,target,claimId})`、`failNote({vault,target,reason,claimId})`、`queueStatus({vault,now})`

- [ ] **Step 1: 追加失败测试**

在 `tests/queue.test.js` 顶部 import 区追加：

```js
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const pexec = promisify(execFile)
import { claim, finish, failNote, queueStatus } from '../scripts/skills/queue-claim.js'

const CLAIM_JS = path.join(process.cwd(), 'scripts/skills/queue-claim.js')

async function makeVault() {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-queue-'))
  return vault
}
async function writeInboxNote(vault, name, fm, body = '正文') {
  await fs.mkdir(path.join(vault, 'Inbox'), { recursive: true })
  const fmText = Object.entries(fm)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  await fs.writeFile(path.join(vault, 'Inbox', name), `---\n${fmText}\n---\n\n# ${name}\n\n${body}\n`)
}
async function readFm(vault, rel) {
  const md = await fs.readFile(path.join(vault, rel), 'utf8')
  return parseFrontmatter(md).fm
}
```

追加用例：

```js
test('claim：认领最早的 pending 并写 ingesting 字段', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, '2026-10-14-b.md', { id: 'b', title: 'B', wiki_status: 'pending' })
  await writeInboxNote(vault, '2026-10-13-a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  const r = await claim({ vault })
  assert.equal(r.claimed.length, 1)
  assert.equal(r.claimed[0].path, 'Inbox/2026-10-13-a.md')
  assert.ok(r.claimed[0].claim_id)
  const fm = await readFm(vault, r.claimed[0].path)
  assert.equal(fm.wiki_status, 'ingesting')
  assert.ok(Date.parse(fm.ingest_claimed_at))
})

test('claim：stale ingesting 回收后可被重新认领（attempts 不增加）', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, '2026-10-15-x.md', {
    id: 'x', title: 'X', wiki_status: 'ingesting',
    ingest_claimed_at: '2026-10-15T09:00:00Z', ingest_claim_id: 'dead', ingest_attempts: 2
  })
  const now = new Date('2026-10-15T10:00:00Z')
  const r = await claim({ vault, now })
  assert.equal(r.claimed[0].path, 'Inbox/2026-10-15-x.md')
  const fm = await readFm(vault, 'Inbox/2026-10-15-x.md')
  assert.equal(fm.wiki_status, 'ingesting')
  assert.equal(fm.ingest_attempts, '2')
  assert.notEqual(fm.ingest_claim_id, 'dead')
})

test('fail：第 1、2 次回 pending，第 3 次转 failed', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 0 })
  let r = await failNote({ vault, target: 'x', reason: 'boom' })
  assert.equal(r.status, 'pending'); assert.equal(r.attempts, 1)
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 1, ingest_error: 'boom' })
  r = await failNote({ vault, target: 'x', reason: 'boom' })
  assert.equal(r.status, 'pending'); assert.equal(r.attempts, 2)
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 2, ingest_error: 'boom' })
  r = await failNote({ vault, target: 'x', reason: '致命：模型返回 #异常' })
  assert.equal(r.status, 'failed'); assert.equal(r.attempts, 3)
  const fm = await readFm(vault, 'Inbox/x.md')
  assert.equal(fm.ingest_error, '致命：模型返回 #异常')
  assert.equal(fm.ingest_claim_id, undefined)
})

test('claim --include-failed：排在 pending 之后且认领时 attempts 归零', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'f.md', { id: 'f', title: 'F', wiki_status: 'failed', ingest_attempts: 3 })
  await writeInboxNote(vault, 'p.md', { id: 'p', title: 'P', wiki_status: 'pending' })
  const r = await claim({ vault, n: 2, includeFailed: true })
  assert.deepEqual(r.claimed.map((c) => c.file), ['p.md', 'f.md'])
  assert.equal((await readFm(vault, 'Inbox/f.md')).ingest_attempts, '0')
  // 默认不含 failed
  const vault2 = await makeVault()
  await writeInboxNote(vault2, 'f.md', { id: 'f', title: 'F', wiki_status: 'failed', ingest_attempts: 3 })
  assert.equal((await claim({ vault: vault2 })).claimed.length, 0)
})

test('done：置 ingested、移入 Archive、同名冲突加 -2 后缀；claim-id 不符拒绝', async () => {
  const vault = await makeVault()
  await fs.mkdir(path.join(vault, 'Archive'), { recursive: true })
  await fs.writeFile(path.join(vault, 'Archive', 'x.md'), 'old')
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_claim_id: 'abc' })
  await assert.rejects(() => finish({ vault, target: 'x', claimId: 'wrong' }), /claim/)
  const r = await finish({ vault, target: 'Inbox/x.md', claimId: 'abc' })
  assert.equal(r.archived, 'Archive/x-2.md')
  const moved = await fs.readFile(path.join(vault, 'Archive/x-2.md'), 'utf8')
  assert.equal(parseFrontmatter(moved).fm.wiki_status, 'ingested')
  assert.ok(moved.includes('# x.md'))
  await assert.rejects(fs.readFile(path.join(vault, 'Inbox/x.md'), 'utf8'))
})

test('done/fail：非 ingesting 状态干净报错', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'pending' })
  await assert.rejects(() => finish({ vault, target: 'x' }), /not ingesting/)
  await assert.rejects(() => failNote({ vault, target: 'x', reason: 'e' }), /not ingesting/)
})

test('status：统计各状态含 stale', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  await writeInboxNote(vault, 'b.md', { id: 'b', title: 'B', wiki_status: 'skipped' })
  await writeInboxNote(vault, 'c.md', {
    id: 'c', title: 'C', wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T09:00:00Z'
  })
  const s = await queueStatus({ vault, now: new Date('2026-10-15T10:00:00Z') })
  assert.deepEqual(s, { pending: 1, ingesting: 1, failed: 0, stale: 1, skipped: 1 })
})

test('跨进程：两个 claim 进程并发不会认领同一篇', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  await writeInboxNote(vault, 'b.md', { id: 'b', title: 'B', wiki_status: 'pending' })
  const env = { ...process.env, VAULT_PATH: vault }
  const [r1, r2] = await Promise.all([
    pexec(process.execPath, [CLAIM_JS, 'claim'], { env }),
    pexec(process.execPath, [CLAIM_JS, 'claim'], { env })
  ])
  const p1 = JSON.parse(r1.stdout).claimed[0].path
  const p2 = JSON.parse(r2.stdout).claimed[0].path
  assert.notEqual(p1, p2)
})

test('CLI：空队列 claim 输出空数组且退出 0；done 不存在目标退出 1', async () => {
  const vault = await makeVault()
  const env = { ...process.env, VAULT_PATH: vault }
  const r = await pexec(process.execPath, [CLAIM_JS, 'claim'], { env })
  assert.deepEqual(JSON.parse(r.stdout).claimed, [])
  await assert.rejects(pexec(process.execPath, [CLAIM_JS, 'done', 'ghost'], { env }))
})
```

- [ ] **Step 2: 跑测试确认失败**

`node --test tests/queue.test.js` → FAIL（queue-claim 模块不存在）。

- [ ] **Step 3: 实现 `scripts/skills/queue-claim.js`**

```js
#!/usr/bin/env node
/**
 * queue-claim：Inbox 摄入队列状态机（AGENTS.md §2.1 / 附录 B.8）
 *   claim [N] [--include-failed]  认领最早 N 篇（默认 1），自动回收 stale ingesting
 *   done <path|id> [--claim-id]   置 ingested 并移入 Archive/
 *   fail <path|id> --reason ... [--claim-id]  回退 pending；第 3 次转 failed
 *   status                        各状态计数
 * 文件锁 .tmp/queue.lock 跨进程互斥；VAULT_PATH 可注入。
 */
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import {
  parseFrontmatter,
  setFrontmatterFields,
  listInboxNotes,
  writeNote,
  isIngestStale
} from './lib/frontmatter.js'

const LOCK_STALE_MS = 120_000
const LOCK_WAIT_MS = 5_000
export const MAX_ATTEMPTS = 3

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withLock(vault, fn) {
  const tmp = path.join(vault, '.tmp')
  await fs.mkdir(tmp, { recursive: true })
  const lock = path.join(tmp, 'queue.lock')
  const deadline = Date.now() + LOCK_WAIT_MS
  let fd
  for (;;) {
    try {
      fd = fssync.openSync(lock, 'wx')
      break
    } catch {
      try {
        if (Date.now() - fssync.statSync(lock).mtimeMs > LOCK_STALE_MS) {
          fssync.unlinkSync(lock)
          continue
        }
      } catch {
        /* 锁被他人释放，下轮重试 */
      }
      if (Date.now() > deadline) throw new Error('queue lock busy')
      await sleep(100)
    }
  }
  try {
    return await fn()
  } finally {
    try {
      fssync.closeSync(fd)
    } catch {
      /* noop */
    }
    fssync.unlinkSync(lock)
  }
}

function resolveTarget(notes, target) {
  const n =
    notes.find((x) => x.rel === target) ||
    notes.find((x) => x.file === target) ||
    notes.find((x) => x.fm.id === target) ||
    (target.endsWith('.md') ? notes.find((x) => x.file === path.basename(target)) : undefined)
  if (!n) throw new Error(`note not found: ${target}`)
  return n
}

async function persist(note, fields) {
  const md = setFrontmatterFields(note.md, fields)
  await writeNote(note.abs, md)
  note.md = md
  Object.assign(note.fm, parseFrontmatter(md).fm)
}

export async function claim({ vault, n = 1, includeFailed = false, now = new Date() } = {}) {
  return withLock(vault, async () => {
    let notes = await listInboxNotes(vault)
    for (const note of notes) {
      if (isIngestStale(note.fm, now)) {
        await persist(note, {
          wiki_status: 'pending',
          ingest_claimed_at: null,
          ingest_claim_id: null
        })
      }
    }
    notes = await listInboxNotes(vault)
    const pending = notes.filter((x) => x.fm.wiki_status === 'pending')
    const failed = includeFailed ? notes.filter((x) => x.fm.wiki_status === 'failed') : []
    const candidates = [...pending, ...failed].slice(0, n)
    const claimed = []
    let i = 0
    for (const note of candidates) {
      const claimId = `${process.pid}-${now.getTime()}-${i++}`
      const fields = {
        wiki_status: 'ingesting',
        ingest_claimed_at: now.toISOString(),
        ingest_claim_id: claimId
      }
      if (note.fm.wiki_status === 'failed') fields.ingest_attempts = 0
      await persist(note, fields)
      claimed.push({ file: note.file, path: note.rel, title: note.title, claim_id: claimId })
    }
    return { claimed }
  })
}

export async function finish({ vault, target, claimId } = {}) {
  return withLock(vault, async () => {
    const note = resolveTarget(await listInboxNotes(vault), target)
    if (note.fm.wiki_status !== 'ingesting') throw new Error(`note not ingesting: ${note.rel} (${note.fm.wiki_status || 'none'})`)
    if (claimId && note.fm.ingest_claim_id !== claimId) {
      throw new Error(`claim id mismatch: note held by ${note.fm.ingest_claim_id || '?'}`)
    }
    const md = setFrontmatterFields(note.md, {
      wiki_status: 'ingested',
      ingest_claimed_at: null,
      ingest_claim_id: null
    })
    await fs.mkdir(path.join(vault, 'Archive'), { recursive: true })
    let dest = note.file
    if (await fs.access(path.join(vault, 'Archive', dest)).then(() => true, () => false)) {
      const base = note.file.replace(/\.md$/, '')
      let k = 2
      while (await fs.access(path.join(vault, 'Archive', `${base}-${k}.md`)).then(() => true, () => false)) k++
      dest = `${base}-${k}.md`
    }
    await writeNote(path.join(vault, 'Archive', dest), md)
    await fs.unlink(note.abs)
    return { archived: `Archive/${dest}` }
  })
}

export async function failNote({ vault, target, reason = '', claimId } = {}) {
  return withLock(vault, async () => {
    const note = resolveTarget(await listInboxNotes(vault), target)
    if (note.fm.wiki_status !== 'ingesting') throw new Error(`note not ingesting: ${note.rel} (${note.fm.wiki_status || 'none'})`)
    if (claimId && note.fm.ingest_claim_id !== claimId) {
      throw new Error(`claim id mismatch: note held by ${note.fm.ingest_claim_id || '?'}`)
    }
    const attempts = (Number.parseInt(note.fm.ingest_attempts || '0', 10) || 0) + 1
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    await persist(note, {
      wiki_status: status,
      ingest_attempts: attempts,
      ingest_error: String(reason || '').slice(0, 200),
      ingest_claimed_at: null,
      ingest_claim_id: null
    })
    return { status, attempts }
  })
}

export async function queueStatus({ vault, now = new Date() } = {}) {
  const notes = await listInboxNotes(vault)
  const s = { pending: 0, ingesting: 0, failed: 0, stale: 0, skipped: 0 }
  for (const n of notes) {
    const st = n.fm.wiki_status || '(none)'
    if (st in s) s[st]++
    if (isIngestStale(n.fm, now)) s.stale++
  }
  return s
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv
  const flags = {}
  const positional = []
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--include-failed') flags.includeFailed = true
    else if (a === '--claim-id') flags.claimId = rest[++i]
    else if (a === '--reason') {
      flags.reason = rest.slice(i + 1).join(' ')
      i = rest.length
    } else if (a.startsWith('--reason=')) flags.reason = a.slice('--reason='.length)
    else positional.push(a)
  }
  return { cmd, flags, positional }
}

async function main() {
  const vault = process.env.VAULT_PATH || process.cwd()
  const { cmd, flags, positional } = parseArgs(process.argv.slice(2))
  let out
  if (cmd === 'claim') {
    out = { ok: true, ...(await claim({ vault, n: Number(positional[0]) || 1, includeFailed: !!flags.includeFailed })) }
  } else if (cmd === 'done') {
    out = { ok: true, ...(await finish({ vault, target: positional[0], claimId: flags.claimId })) }
  } else if (cmd === 'fail') {
    out = { ok: true, ...(await failNote({ vault, target: positional[0], reason: flags.reason, claimId: flags.claimId })) }
  } else if (cmd === 'status') {
    out = { ok: true, ...(await queueStatus({ vault })) }
  } else {
    throw new Error(`unknown command: ${cmd || '(none)'}，用法：claim|done|fail|status`)
  }
  console.log(JSON.stringify(out))
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 200) }))
  process.exit(1)
})
```

- [ ] **Step 4: 跑测试确认通过**

`node --test tests/queue.test.js` → 全部 passed（跨进程用例依赖 `.tmp/queue.lock`，在临时 VAULT 内）。

- [ ] **Step 5: 真实 Vault 冒烟（只读子命令）**

`node scripts/skills/queue-claim.js status` → 输出含 `pending: 2`（当前两篇），其余 0；不得改动任何文件。`git status --porcelain` 确认无变化。

- [ ] **Step 6: 提交**

```bash
git add scripts/skills/queue-claim.js tests/queue.test.js
git commit -m "feat: queue-claim 摄入队列状态机（claim/done/fail/status）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: queue-trigger 近实时异步触发器

**Files:**
- Create: `scripts/skills/queue-trigger.js`
- Test: `tests/queue.test.js`（追加）

**Interfaces:**
- Consumes: `listInboxNotes`、`isIngestStale`。
- Produces:
  - `evaluate({vault, now}): Promise<{hasWork, inCooldown}>`
  - `trigger({vault, now, sender}): Promise<{triggered, reason}>`，reason ∈ `empty|cooldown|sent|no-socket`
  - CLI 无参数，恒退出 0，输出 `{ok:true, triggered, reason}`。
- 外部命令：`cc-connect send -p <CC_PROJECT||obsidian-knowledge> -m "<INGEST_TRIGGER_MESSAGE||/ingest>"`；可用 `CC_CONNECT_BIN` 覆盖可执行文件（默认 `cc-connect`）。冷却文件 `.tmp/ingest-cooldown`，10 分钟。

- [ ] **Step 1: 追加失败测试**

```js
import { trigger } from '../scripts/skills/queue-trigger.js'

test('trigger：空队列不投递；冷却中不重复投递；有活且冷却过期→投递并写冷却；sender 抛错→no-socket 且不写冷却', async () => {
  const now = new Date('2026-10-15T12:00:00Z')
  const vault = await makeVault()

  let r = await trigger({ vault, now, sender: async () => { throw new Error('socket not found') } })
  assert.equal(r.reason, 'empty')

  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  const calls = []
  const sender = async () => { calls.push('sent') }
  r = await trigger({ vault, now, sender })
  assert.deepEqual(r, { triggered: true, reason: 'sent' })
  assert.equal(calls.length, 1)

  r = await trigger({ vault, now, sender })
  assert.equal(r.reason, 'cooldown')
  assert.equal(calls.length, 1)

  // 冷却过期后可再次投递
  r = await trigger({ vault, now: new Date('2026-10-15T12:15:00Z'), sender })
  assert.equal(r.reason, 'sent')
  assert.equal(calls.length, 2)

  // stale ingesting 也算有活
  const vault2 = await makeVault()
  await writeInboxNote(vault2, 's.md', {
    id: 's', title: 'S', wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T11:00:00Z'
  })
  r = await trigger({ vault: vault2, now, sender: async () => { throw new Error('down') } })
  assert.equal(r.triggered, false)
  assert.equal(r.reason, 'no-socket')
  await assert.rejects(fs.readFile(path.join(vault2, '.tmp', 'ingest-cooldown'), 'utf8'))
})

test('trigger CLI：cc-connect 不存在也退出 0（钩子不能报错）', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  const env = { ...process.env, VAULT_PATH: vault, CC_CONNECT_BIN: 'cc-connect-does-not-exist-xyz' }
  const r = await pexec(process.execPath, [path.join(process.cwd(), 'scripts/skills/queue-trigger.js')], { env })
  const out = JSON.parse(r.stdout)
  assert.equal(out.ok, true)
  assert.equal(out.triggered, false)
  assert.equal(out.reason, 'no-socket')
})
```

- [ ] **Step 2: 跑测试确认失败**

`node --test tests/queue.test.js` → FAIL（模块不存在）。

- [ ] **Step 3: 实现 `scripts/skills/queue-trigger.js`**

```js
#!/usr/bin/env node
/**
 * queue-trigger：采集→摄入的近实时异步触发器（message.sent 钩子调用）
 * 队列存在 pending 或 stale ingesting，且 10 分钟冷却已过
 *   → cc-connect send 异步发起新会话执行 /ingest
 * 任何投递失败都静默退出 0：钩子报错会向 IM 发错误回执，且每日 cron 会兜底。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { listInboxNotes, isIngestStale } from './lib/frontmatter.js'

const pexec = promisify(execFile)
const COOLDOWN_MS = 10 * 60 * 1000

export async function evaluate({ vault, now = new Date() } = {}) {
  const notes = await listInboxNotes(vault)
  const hasWork = notes.some(
    (n) => n.fm.wiki_status === 'pending' || isIngestStale(n.fm, now)
  )
  let inCooldown = false
  try {
    const st = await fs.stat(path.join(vault, '.tmp', 'ingest-cooldown'))
    inCooldown = now.getTime() - st.mtimeMs < COOLDOWN_MS
  } catch {
    /* 无冷却文件 */
  }
  return { hasWork, inCooldown }
}

export async function trigger({ vault, now = new Date(), sender } = {}) {
  const { hasWork, inCooldown } = await evaluate({ vault, now })
  if (!hasWork) return { triggered: false, reason: 'empty' }
  if (inCooldown) return { triggered: false, reason: 'cooldown' }
  const send =
    sender ||
    (async () => {
      const bin = process.env.CC_CONNECT_BIN || 'cc-connect'
      const project = process.env.CC_PROJECT || 'obsidian-knowledge'
      const message = process.env.INGEST_TRIGGER_MESSAGE || '/ingest'
      await pexec(bin, ['send', '-p', project, '-m', message])
    })
  try {
    await send()
  } catch (e) {
    return { triggered: false, reason: 'no-socket', error: String(e.message || e).slice(0, 120) }
  }
  await fs.mkdir(path.join(vault, '.tmp'), { recursive: true })
  await fs.writeFile(path.join(vault, '.tmp', 'ingest-cooldown'), String(Date.now()))
  return { triggered: true, reason: 'sent' }
}

const vault = process.env.VAULT_PATH || process.cwd()
trigger({ vault })
  .then((r) => console.log(JSON.stringify({ ok: true, ...r })))
  .catch((e) =>
    // 即使内部出现意外异常，钩子侧也必须是退出 0
    console.log(JSON.stringify({ ok: true, triggered: false, reason: 'no-socket', error: String(e.message || e).slice(0, 120) }))
  )
```

- [ ] **Step 4: 跑测试确认通过**

`node --test tests/queue.test.js` → 全部 passed。

- [ ] **Step 5: 真实 Vault 冒烟**

`node scripts/skills/queue-trigger.js`（本机 cc-connect daemon 未运行时）→ `{"ok":true,"triggered":false,"reason":"no-socket"...}`，退出码 0；`.tmp/ingest-cooldown` 不得被创建。

- [ ] **Step 6: 提交**

```bash
git add scripts/skills/queue-trigger.js tests/queue.test.js
git commit -m "feat: queue-trigger 采集后异步触发摄入（冷却+静默降级）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: queue-backfill 存量回填

**Files:**
- Create: `scripts/skills/queue-backfill.js`
- Test: `tests/queue.test.js`（追加）

**Interfaces:**
- Consumes: `listInboxNotes`、`setFrontmatterFields`、`writeNote`。
- Produces:
  - `planBackfill({vault}): Promise<{pending:string[], skipped:string[], untouched:string[]}>`（无 `wiki_status` 且有 `source_url|asset_ref` → pending；两者皆无 → skipped；已有状态 → untouched）
  - `applyBackfill({vault}): Promise<同一结构>`（写回，幂等）
  - CLI：默认 dry-run；`--apply` 写回；输出 `{ok, applied, total, pending, skipped, untouched}`（dry-run 时 applied:false）。

- [ ] **Step 1: 追加失败测试**

```js
import { planBackfill, applyBackfill } from '../scripts/skills/queue-backfill.js'

test('backfill：按 source_url/asset_ref 分类，已有状态不动，--apply 幂等', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'with-url.md', { id: 'u', title: 'U', source_url: 'https://example.com/a' })
  await writeInboxNote(vault, 'with-asset.md', { id: 'a', title: 'A', asset_ref: 'Assets/2026/10/a.md' })
  await writeInboxNote(vault, 'plain.md', { id: 'p', title: 'P' })
  await writeInboxNote(vault, 'done.md', { id: 'd', title: 'D', wiki_status: 'ingested' })

  const plan = await planBackfill({ vault })
  assert.deepEqual(plan.pending.sort(), ['Inbox/with-asset.md', 'Inbox/with-url.md'].sort())
  assert.deepEqual(plan.skipped, ['Inbox/plain.md'])
  assert.deepEqual(plan.untouched, ['Inbox/done.md'])

  const applied = await applyBackfill({ vault })
  assert.equal(applied.pending.length, 2)
  assert.equal((await readFm(vault, 'Inbox/with-url.md')).wiki_status, 'pending')
  assert.equal((await readFm(vault, 'Inbox/plain.md')).wiki_status, 'skipped')

  const again = await applyBackfill({ vault })
  assert.deepEqual(again, { pending: [], skipped: [], untouched: ['Inbox/done.md', 'Inbox/plain.md', 'Inbox/with-asset.md', 'Inbox/with-url.md'] })
})

test('backfill：无 frontmatter 的文件不崩溃且按 skipped 处理（无 url/asset）', async () => {
  const vault = await makeVault()
  await fs.mkdir(path.join(vault, 'Inbox'), { recursive: true })
  await fs.writeFile(path.join(vault, 'Inbox', 'broken.md'), '完全没有 frontmatter')
  const plan = await planBackfill({ vault })
  assert.deepEqual(plan.skipped, ['Inbox/broken.md'])
})
```

- [ ] **Step 2: 跑测试确认失败**

`node --test tests/queue.test.js` → FAIL（模块不存在）。

- [ ] **Step 3: 实现 `scripts/skills/queue-backfill.js`**

```js
#!/usr/bin/env node
/**
 * queue-backfill：存量 Inbox 笔记一次性回填 wiki_status（幂等）
 *   无状态且有 source_url/asset_ref → pending；否则 → skipped；已有状态不动
 *   默认 dry-run；--apply 才写回。
 */
import { listInboxNotes, setFrontmatterFields, writeNote } from './lib/frontmatter.js'

export async function planBackfill({ vault } = {}) {
  const plan = { pending: [], skipped: [], untouched: [] }
  for (const n of await listInboxNotes(vault)) {
    if (n.fm.wiki_status) plan.untouched.push(n.rel)
    else if (n.fm.source_url || n.fm.asset_ref) plan.pending.push(n.rel)
    else plan.skipped.push(n.rel)
  }
  return plan
}

export async function applyBackfill({ vault } = {}) {
  const plan = { pending: [], skipped: [], untouched: [] }
  for (const n of await listInboxNotes(vault)) {
    if (n.fm.wiki_status) {
      plan.untouched.push(n.rel)
      continue
    }
    const status = n.fm.source_url || n.fm.asset_ref ? 'pending' : 'skipped'
    await writeNote(n.abs, setFrontmatterFields(n.md, { wiki_status: status }))
    plan[status === 'pending' ? 'pending' : 'skipped'].push(n.rel)
  }
  return plan
}

const vault = process.env.VAULT_PATH || process.cwd()
const apply = process.argv.includes('--apply')
;(apply ? applyBackfill({ vault }) : planBackfill({ vault }))
  .then((plan) =>
    console.log(
      JSON.stringify({
        ok: true,
        applied: apply,
        total: plan.pending.length + plan.skipped.length + plan.untouched.length,
        pending: plan.pending.length,
        skipped: plan.skipped.length,
        untouched: plan.untouched.length,
        pending_files: apply ? undefined : plan.pending,
        skipped_files: apply ? undefined : plan.skipped
      })
    )
  )
  .catch((e) => {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 200) }))
    process.exit(1)
  })
```

- [ ] **Step 4: 跑测试确认通过**

`node --test tests/queue.test.js` → 全部 passed。

- [ ] **Step 5: 真实 Vault dry-run（不写）**

`node scripts/skills/queue-backfill.js` → 报告 `total: 30, pending: 28, skipped: 0, untouched: 2`（若个别老笔记缺 source_url，pending/skipped 以实际输出为准；skipped>0 时把文件清单报给用户确认）。**不得带 --apply**（回填在 Task 8 统一执行）。

- [ ] **Step 6: 提交**

```bash
git add scripts/skills/queue-backfill.js tests/queue.test.js
git commit -m "feat: queue-backfill 存量笔记队列状态回填（dry-run/apply 幂等）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 接入测试命令 + index-rebuild 回归

**Files:**
- Modify: `package.json`（`scripts.test`）
- Test: `tests/queue.test.js`（追加 1 条回归）

- [ ] **Step 1: 追加回归测试**

```js
test('回归：index-rebuild 能解析新队列字段并写入 index.json', async () => {
  const vault = await makeVault()
  await fs.mkdir(path.join(vault, 'Index'), { recursive: true })
  await writeInboxNote(vault, 'a.md', {
    id: 'a', title: 'A', wiki_status: 'ingesting',
    ingest_claimed_at: '2026-10-15T11:00:00Z', ingest_attempts: 1
  })
  await pexec(process.execPath, [path.join(process.cwd(), 'scripts/skills/index-rebuild.js')], {
    env: { ...process.env, VAULT_PATH: vault }
  })
  const idx = JSON.parse(await fs.readFile(path.join(vault, 'Index/index.json'), 'utf8'))
  assert.equal(idx.notes[0].wiki_status, 'ingesting')
  assert.equal(idx.notes[0].asset_ref, '')
})
```

- [ ] **Step 2: 修改 `package.json` 的 scripts**

把 `"test": "echo \"Error: no test specified\" && exit 1"` 改为：

```json
"test": "node --test tests/"
```

- [ ] **Step 3: 全量测试**

`npm test`（= `node --test tests/`）→ 全部 passed。

- [ ] **Step 4: 提交**

```bash
git add package.json tests/queue.test.js
git commit -m "test: 接入 node --test 并补 index-rebuild 队列字段回归

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 契约与 Skill 文档同步（AGENTS.md 2.4 流程）

**Files:**
- Modify: `AGENTS.md`（§2.1、附录 B 新增第 8 条）
- Modify: `CLAUDE.md`（决策顺序补异步说明、wiki_status 行）
- Modify: `.claude/skills/wiki-ingest/SKILL.md`（阶段 1、12、反原样复制段、台账段）
- Modify: `.claude/skills/git-backup/SKILL.md`（行为白名单修正）

- [ ] **Step 1: 改 `AGENTS.md` §2.1**

把：

```
采集层笔记以 frontmatter `wiki_status` 标记摄入队列状态：`pending`（待摄入）、`ingested`（已摄入，随后移入 `Archive/`）、`skipped`（闪念等不入 wiki）。`wiki-ingest` 默认消费最早的 pending 笔记。
```

替换为：

```
采集层笔记以 frontmatter `wiki_status` 标记摄入队列状态：`pending`（待摄入）、`ingesting`（已被摄入会话认领，附 `ingest_claim_id` / `ingest_claimed_at`）、`ingested`（已摄入，随后移入 `Archive/`）、`failed`（自动重试 3 次仍失败，仅每日 cron 或人工介入）、`skipped`（闪念等不入 wiki）。状态机由 `scripts/skills/queue-claim.js` 唯一执行（`claim` / `done` / `fail`；`ingesting` 超 30 分钟自动回收为 pending）。`wiki-ingest` 默认消费最早的 pending 笔记；近实时由 `queue-trigger.js` 经 `cc-connect send` 异步触发独立会话，每日 21:20 cron 兜底失败与存量。
```

- [ ] **Step 2: `AGENTS.md` 附录 B 追加第 8 条**（在第 7 条之后）

```
8. **队列异步消费**：采集会话不内联摄入。`message.sent` 钩子追加 `node scripts/skills/queue-trigger.js`——队列存在 pending/stale 且 10 分钟冷却过期时，经 `cc-connect send` 异步发起独立会话执行 `/ingest`；投递失败静默，由每日 21:20 cron 兜底。`wiki-ingest` 收尾必须用 `queue-claim` 的 `done`/`fail`（带 claim_id），不得手写 `wiki_status`、不得自行 mv 文件。存量笔记由 `scripts/skills/queue-backfill.js`（默认 dry-run，`--apply` 写回，幂等）一次性回填队列状态。手动 `/ingest` 入口始终保留，行为与自动触发一致。
```

- [ ] **Step 3: 改 `CLAUDE.md`**

(a) 在「决策顺序」列表 ⑦ 之后新增一段：

```
**异步衔接**：采集只写 Inbox/Assets（链接/文档落 `wiki_status: pending`），不在采集会话内摄入；`message.sent` 钩子的 `queue-trigger.js` 在冷却过期后异步发起独立 `/ingest` 会话（约 10 分钟一篇自节流），每日 21:20 cron 兜底失败与存量；手动 `/ingest` 始终保留。
```

(b) 把写笔记规范中的：

```
链接/文档类采集加 `asset_ref: Assets/YYYY/MM/<slug>.md`（采集态正文/原件）与 `wiki_status: pending`（进入待摄入队列）；闪念用 `skipped`；`ingested` 只由 wiki-ingest 收尾时置位
```

替换为：

```
链接/文档类采集加 `asset_ref: Assets/YYYY/MM/<slug>.md`（采集态正文/原件）与 `wiki_status: pending`（进入待摄入队列）；闪念用 `skipped`。队列五态（pending/ingesting/failed/ingested/skipped）由 `scripts/skills/queue-claim.js` 唯一维护：`ingested`/移动 Archive 只能经 `done`，失败经 `fail`（3 次转 failed），不要手写状态或自行 mv 文件
```

- [ ] **Step 4: 改 `.claude/skills/wiki-ingest/SKILL.md`**

(a) 「反原样复制（强制）」段中：

```
处理完一篇后，把笔记 frontmatter 的 `wiki_status` 置为 `ingested`，再将其移出（归档到 `Archive/`，`AGENTS.md` 2.1 允许摄入过程中移除），并把 manifest entry 的 `inbox_ref` 更新为 `Archive/` 新路径；不得与 `raw/` 中信源同名共存。
```

替换为：

```
处理完一篇后运行 `node scripts/skills/queue-claim.js done <path> --claim-id <id>` 收尾（脚本置 `ingested` 并移入 `Archive/`，返回 `Archive/` 新路径），并把 manifest entry 的 `inbox_ref` 更新为该路径；失败用 `fail <path> --claim-id <id> --reason <简述>`。不得手写 `wiki_status`、不得自行 mv、不得与 `raw/` 中信源同名共存。
```

(b) 阶段 1 替换为：

```
1. **接收（Intake）**：用户显式指定材料时处理该材料（指定的是 Inbox 笔记时仍先 claim 该篇）；否则运行 `node scripts/skills/queue-claim.js claim` 认领最早 1 篇，JSON 的 `claimed[]`（含 `path` 与 `claim_id`）即本轮对象；空队列则汇报"队列为空"并结束。每日兜底场景用 `claim --include-failed`（failed 排在 pending 之后、认领时 attempts 归零）。单轮至多 3 篇（每篇各 claim 一次）。
```

(c) 阶段 12 替换为：

```
12. **记录日志（Log）**：向 `wiki/log.md` **追加**一行（格式见该文件说明），不得改写历史条目。随后逐篇收尾：成功者 `queue-claim.js done <path> --claim-id <id>`（用返回的 `Archive/` 路径回填 manifest 的 `inbox_ref`）；失败者 `queue-claim.js fail <path> --claim-id <id> --reason <简述>`（回退 pending，第 3 次转 failed），并在汇报中列出。
```

（原阶段 13「汇报」保留，序号不变。）

- [ ] **Step 5: 改 `.claude/skills/git-backup/SKILL.md` 的「行为」段**

整段替换为：

```
## 行为
- 提交白名单：Inbox Archive Assets Index / raw wiki schemas config templates state / scripts .claude docs / AGENTS.md CLAUDE.md package.json package-lock.json .gitignore
- 不含密钥（config.toml / mcp.json / .env）与瞬时产物（reports / state/runs / .tmp / logs / node_modules）
- 只把「确有变更」的路径交给 git add（pathspec 不匹配会整体失败）
- 无变更直接退出 0
- 获取 .tmp/backup.lock；拿不到锁则跳过（后续任务会补提交）；锁超 120 秒视为 stale
- 提交当前分支，push origin 当前分支（可用 BACKUP_BRANCH 覆盖），失败重试 3 次
```

- [ ] **Step 6: 校验文档内命令存在性**

人工核对：`AGENTS.md`/`CLAUDE.md`/两个 SKILL.md 中出现的脚本名均为 `queue-claim.js`、`queue-trigger.js`、`queue-backfill.js`（已在 Task 2-4 创建）。运行 `node scripts/skills/wiki-lint.js` 确认无新增确定性错误（文档改动不应影响 lint；若有既有错误，记录但不在本任务修）。

- [ ] **Step 7: 提交**

```bash
git add AGENTS.md CLAUDE.md .claude/skills/wiki-ingest/SKILL.md .claude/skills/git-backup/SKILL.md
git commit -m "docs: 队列状态机与异步摄入接入运行契约及 skill 说明

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: 备份白名单加 docs + wiki 迁移日志

**Files:**
- Modify: `scripts/skills/git-backup.js:19-24`
- Modify: `scripts/git-auto-backup.sh:13`
- Modify: `scripts/git-auto-backup.ps1:9-13`
- Append: `wiki/log.md`

- [ ] **Step 1: 三处白名单追加 `docs`**

`git-backup.js` 的 PATHS 数组在 `'scripts', '.claude',` 之后加 `'docs',`：

```js
const PATHS = [
  'Inbox', 'Archive', 'Assets', 'Index',
  'raw', 'wiki', 'schemas', 'config', 'templates', 'state',
  'scripts', '.claude', 'docs',
  'AGENTS.md', 'CLAUDE.md', 'package.json', 'package-lock.json', '.gitignore'
]
```

`git-auto-backup.sh` 的 PATHS 行在 `scripts .claude` 后加 `docs`：

```bash
PATHS="Inbox Archive Assets Index raw wiki schemas config templates state scripts .claude docs AGENTS.md CLAUDE.md package.json package-lock.json .gitignore"
```

`git-auto-backup.ps1` 的 `$Paths` 数组在 `'scripts','.claude',` 后加 `'docs',`。

- [ ] **Step 2: 追加 `wiki/log.md`**

在文件末尾追加（时间取执行当时，格式 `YYYY-MM-DD HH:MM`）：

```
- 2026-10-15 21:00 | migration | 采集→wiki 异步贯通（队列状态机+queue-trigger/cron+存量回填） | AGENTS.md §2.1/附录B.8, CLAUDE.md, .claude/skills/wiki-ingest/SKILL.md, .claude/skills/git-backup/SKILL.md, scripts/skills/queue-claim.js, scripts/skills/queue-trigger.js, scripts/skills/queue-backfill.js, scripts/skills/lib/frontmatter.js
```

- [ ] **Step 3: 验证白名单生效**

`node scripts/skills/git-backup.js` → 应提交本任务改动并推送（若 push 失败，脚本退出 1 且输出 reason；等待下一次钩子补提交，不阻塞后续任务）。`git log --oneline -3` 确认提交存在；`git status --porcelain docs/` 应为空。

- [ ] **Step 4: 提交（若 Step 3 未自动提交成功）**

```bash
git add scripts/skills/git-backup.js scripts/git-auto-backup.sh scripts/git-auto-backup.ps1 wiki/log.md
git commit -m "chore: 备份白名单纳入 docs 并记录队列迁移日志

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 8: 真实 Vault 存量回填与端到端（本地部分）

**Files:**
- 仅由脚本改动 `Inbox/*.md`、`Index/index.json`、`Index/tags.json`（不动正文）

- [ ] **Step 1: 最终全量测试**

`npm test` → 全绿。

- [ ] **Step 2: dry-run 复核**

`node scripts/skills/queue-backfill.js`，保存 JSON 输出；确认 `untouched` = 2（两篇已是 pending 的新笔记），`pending+skipped+untouched=30`。若 `skipped > 0`，逐一查看这些文件确认确属无来源闪念（无 source_url/asset_ref），否则人工补 source_url 后重跑。

- [ ] **Step 3: 执行回填**

`node scripts/skills/queue-backfill.js --apply` → `applied: true`。

- [ ] **Step 4: 重建索引并核对**

`node scripts/skills/index-rebuild.js`，然后：

```bash
node -e "const d=require('./Index/index.json');const c={};for(const n of d.notes)c[n.wiki_status||'(none)']=(c[n.wiki_status||'(none)']||0)+1;console.log(c)"
```

预期：`{pending: 30, ...}`（28 回填 + 原有 2；若 Step 2 有 skipped 则相应分布）。

- [ ] **Step 5: 触发一次（预期 no-socket 或 sent）**

`node scripts/skills/queue-trigger.js`：本机 cc-connect daemon 未运行 → `reason:"no-socket"`，退出 0；若 daemon 在运行 → `reason:"sent"`，随后到飞书观察是否产生一条 `/ingest` 会话（若产生，确认其 claim 到最早一篇并正常 done；这是最好的端到端验证）。

- [ ] **Step 6: 备份**

`node scripts/skills/git-backup.js`；`git log --oneline -2` 确认 Inbox/Index 改动已提交。

---

### Task 9: cc-connect 接线与上线验证（需运行中的 daemon，用户协同）

**Files:**
- Modify: `config.toml`（gitignored；Vault 内为模板副本，daemon 实际读 `~/.cc-connect/config.toml` 或部署机 `/opt/obsidian-knowledge` 对应配置）

说明：本机当前 `cc-connect cron list` 报 socket 不存在，daemon 不在本用户会话运行；本任务的命令需在运行 cc-connect 的环境（本机服务或云端）执行。执行者不要伪造验证结果。

- [ ] **Step 1: Vault 内 `config.toml` 加钩子（留档模板）**

在现有第一个 `message.sent` hook（`command = "node scripts/skills/index-rebuild.js; node scripts/skills/git-backup.js"`）之后插入：

```toml
# ---------- 收尾钩子：采集后异步触发 Wiki 摄入（队列空/冷却中自动跳过） ----------
[[hooks]]
event = "message.sent"
type = "command"
command = "node scripts/skills/queue-trigger.js"
async = true
timeout = 15
```

- [ ] **Step 2: 在 daemon 环境同步配置并重启**

请用户在运行 cc-connect 的机器上：① 把同样的 hook 块加入其实际配置；② `git pull` 拉取新脚本（云端 VAULT_PATH=/opt/obsidian-knowledge）；③ 重启服务。Windows 本机可提示：`! cc-connect daemon restart`（或 `cc-connect --force` 前台启动）。

- [ ] **Step 3: 注册每日 cron**

在 daemon 所在机器执行（注意避开整点，21:20，与 21:00 daily-digest 错开）：

```bash
cc-connect cron add -c "20 21 * * *" -p obsidian-knowledge \
  --session-mode new-per-run --silent --timeout-mins 30 \
  --prompt "执行 wiki-ingest：本轮总计至多 3 篇。先用 queue-claim claim 消费 pending 与超时 ingesting；若不足 3 篇，再用 claim --include-failed 对 failed 笔记各重试一次。队列完全为空则一句话汇报；结尾列出仍 failed 的清单与原因。"
```

- [ ] **Step 4: 核验**

`cc-connect cron list` 看到 21:20 任务；在飞书发一条链接做真实采集，观察：① 收到采集摘要（主会话不摄入）；② 约 1 个冷却周期内出现独立摄入会话并产出 wiki/raw 变更；③ GitHub 收到含 `raw/`、`wiki/`、`state/manifest.json`、`Archive/` 的提交；④ `node scripts/skills/queue-claim.js status` 中对应笔记离开 Inbox（done 后在 Archive）。任一步不符则回报现象，不宣称上线成功。

- [ ] **Step 5: 手动入口回归**

飞书发送 `/ingest`（不带参数），确认手动入口行为不变：claim 最早一篇或回复"队列为空"。
