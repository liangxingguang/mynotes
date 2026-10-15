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
import { pathToFileURL } from 'node:url'
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

export async function claim({ vault, n = 1, includeFailed = false, target = null, now = new Date() } = {}) {
  if (!Number.isInteger(n) || n < 1) throw new Error('claim N must be a positive integer')
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

    // 定向认领（手动 /ingest <笔记>）：只认领指定的一篇，状态必须可摄入
    if (target) {
      const note = resolveTarget(notes, target)
      const st = note.fm.wiki_status
      if (st === 'ingesting') {
        throw new Error(`note is held by another session: ${note.fm.ingest_claim_id || '?'}`)
      }
      if (st !== 'pending' && st !== 'failed') {
        throw new Error(`note not eligible for claim: ${note.rel} (${st || 'none'})`)
      }
      const claimId = `${process.pid}-${now.getTime()}-0`
      const fields = {
        wiki_status: 'ingesting',
        ingest_claimed_at: now.toISOString(),
        ingest_claim_id: claimId
      }
      // failed 定向重试：归零计数并清除旧错误
      if (st === 'failed') {
        fields.ingest_attempts = 0
        fields.ingest_error = null
      }
      await persist(note, fields)
      return { claimed: [{ file: note.file, path: note.rel, title: note.title, claim_id: claimId }] }
    }

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
      // 认领 failed（重试）：归零计数并清除旧错误
      if (note.fm.wiki_status === 'failed') {
        fields.ingest_attempts = 0
        fields.ingest_error = null
      }
      await persist(note, fields)
      claimed.push({ file: note.file, path: note.rel, title: note.title, claim_id: claimId })
    }
    return { claimed }
  })
}

function assertClaimHolder(note, claimId) {
  if (note.fm.wiki_status !== 'ingesting') {
    throw new Error(`note not ingesting: ${note.rel} (${note.fm.wiki_status || 'none'})`)
  }
  // fail-closed：claim 必写 ingest_claim_id；持 id 的笔记必须提供匹配的 --claim-id
  if (note.fm.ingest_claim_id && note.fm.ingest_claim_id !== claimId) {
    throw new Error(
      claimId
        ? `claim id mismatch: note held by ${note.fm.ingest_claim_id}`
        : `claim id required: note held by ${note.fm.ingest_claim_id}`
    )
  }
}

export async function finish({ vault, target, claimId } = {}) {
  if (!target) throw new Error('usage: done <path|id> --claim-id <id>')
  return withLock(vault, async () => {
    const note = resolveTarget(await listInboxNotes(vault), target)
    assertClaimHolder(note, claimId)
    const md = setFrontmatterFields(note.md, {
      wiki_status: 'ingested',
      ingest_claimed_at: null,
      ingest_claim_id: null,
      ingest_attempts: null,
      ingest_error: null
    })
    await fs.mkdir(path.join(vault, 'Archive'), { recursive: true })
    let dest = note.file
    if (await fs.access(path.join(vault, 'Archive', dest)).then(() => true, () => false)) {
      const base = note.file.replace(/\.md$/, '')
      let k = 2
      while (await fs.access(path.join(vault, 'Archive', `${base}-${k}.md`)).then(() => true, () => false)) k++
      dest = `${base}-${k}.md`
    }
    // 先原子改名移动（崩溃也不会在 Inbox 残留导致重复摄入），再在 Archive 内原子改写内容
    await fs.rename(note.abs, path.join(vault, 'Archive', dest))
    await writeNote(path.join(vault, 'Archive', dest), md)
    return { archived: `Archive/${dest}` }
  })
}

export async function failNote({ vault, target, reason = '', claimId } = {}) {
  if (!target) throw new Error('usage: fail <path|id> --reason <text> --claim-id <id>')
  return withLock(vault, async () => {
    const note = resolveTarget(await listInboxNotes(vault), target)
    assertClaimHolder(note, claimId)
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
    else if (a === '--target') flags.target = rest[++i]
    else if (a === '--reason') {
      // 收集到下一个 --flag 为止（引号内多词已由 shell 合并为单 token）
      const vals = []
      while (i + 1 < rest.length && !rest[i + 1].startsWith('--')) vals.push(rest[++i])
      flags.reason = vals.join(' ')
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
    let n = 1
    if (positional[0] !== undefined) {
      if (!/^\d+$/.test(positional[0]) || Number(positional[0]) < 1) {
        throw new Error(`claim N must be a positive integer, got: ${positional[0]}`)
      }
      n = Number(positional[0])
    }
    out = {
      ok: true,
      ...(await claim({ vault, n, includeFailed: !!flags.includeFailed, target: flags.target || null }))
    }
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

// 仅直接运行时执行 CLI；被测试 import 时只导出函数
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 200) }))
    process.exit(1)
  })
}
