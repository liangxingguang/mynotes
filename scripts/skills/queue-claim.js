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
    if (note.fm.wiki_status !== 'ingesting') {
      throw new Error(`note not ingesting: ${note.rel} (${note.fm.wiki_status || 'none'})`)
    }
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
    if (note.fm.wiki_status !== 'ingesting') {
      throw new Error(`note not ingesting: ${note.rel} (${note.fm.wiki_status || 'none'})`)
    }
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

// 仅直接运行时执行 CLI；被测试 import 时只导出函数
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 200) }))
    process.exit(1)
  })
}
