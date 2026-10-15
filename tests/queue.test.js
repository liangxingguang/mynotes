import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseFrontmatter, setFrontmatterFields, isIngestStale } from '../scripts/skills/lib/frontmatter.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { claim, finish, failNote, queueStatus } from '../scripts/skills/queue-claim.js'

const pexec = promisify(execFile)
const CLAIM_JS = path.join(process.cwd(), 'scripts/skills/queue-claim.js')

async function makeVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'vault-queue-'))
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
  const r = await claim({ now, vault })
  assert.equal(r.claimed[0].path, 'Inbox/2026-10-15-x.md')
  const fm = await readFm(vault, 'Inbox/2026-10-15-x.md')
  assert.equal(fm.wiki_status, 'ingesting')
  assert.equal(fm.ingest_attempts, '2')
  assert.notEqual(fm.ingest_claim_id, 'dead')
})

test('fail：第 1、2 次回 pending，第 3 次转 failed', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 0 })
  let r = await failNote({ reason: 'boom', target: 'x', vault })
  assert.equal(r.status, 'pending'); assert.equal(r.attempts, 1)
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 1, ingest_error: 'boom' })
  r = await failNote({ reason: 'boom', target: 'x', vault })
  assert.equal(r.status, 'pending'); assert.equal(r.attempts, 2)
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_attempts: 2, ingest_error: 'boom' })
  r = await failNote({ reason: '致命：模型返回 #异常', target: 'x', vault })
  assert.equal(r.status, 'failed'); assert.equal(r.attempts, 3)
  const fm = await readFm(vault, 'Inbox/x.md')
  assert.equal(fm.ingest_error, '致命：模型返回 #异常')
  assert.equal(fm.ingest_claim_id, undefined)
})

test('claim --include-failed：排在 pending 之后且认领时 attempts 归零', async () => {
  const vault = await claimVaultSetup()
  const r = await claim({ includeFailed: true, n: 2, vault })
  assert.deepEqual(r.claimed.map((c) => c.file), ['p.md', 'f.md'])
  assert.equal((await readFm(vault, 'Inbox/f.md')).ingest_attempts, '0')
  // 默认不含 failed
  const vault2 = await makeVault()
  await writeInboxNote(vault2, 'f.md', { id: 'f', title: 'F', wiki_status: 'failed', ingest_attempts: 3 })
  assert.equal((await claim({ vault: vault2 })).claimed.length, 0)
})
async function claimVaultSetup() {
  const vault = await makeVault()
  await writeInboxNote(vault, 'f.md', { id: 'f', title: 'F', wiki_status: 'failed', ingest_attempts: 3 })
  await writeInboxNote(vault, 'p.md', { id: 'p', title: 'P', wiki_status: 'pending' })
  return vault
}

test('done：置 ingested、移入 Archive、同名冲突加 -2 后缀；claim-id 不符拒绝', async () => {
  const vault = await makeVault()
  await fs.mkdir(path.join(vault, 'Archive'), { recursive: true })
  await fs.writeFile(path.join(vault, 'Archive', 'x.md'), 'old')
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'ingesting', ingest_claim_id: 'abc' })
  await assert.rejects(() => finish({ claimId: 'wrong', target: 'x', vault }), /claim/)
  const r = await finish({ claimId: 'abc', target: 'Inbox/x.md', vault })
  assert.equal(r.archived, 'Archive/x-2.md')
  const moved = await fs.readFile(path.join(vault, 'Archive/x-2.md'), 'utf8')
  assert.equal(parseFrontmatter(moved).fm.wiki_status, 'ingested')
  assert.ok(moved.includes('# x.md'))
  await assert.rejects(fs.readFile(path.join(vault, 'Inbox/x.md'), 'utf8'))
})

test('done/fail：非 ingesting 状态干净报错', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'x.md', { id: 'x', title: 'X', wiki_status: 'pending' })
  await assert.rejects(() => finish({ target: 'x', vault }), /not ingesting/)
  await assert.rejects(() => failNote({ reason: 'e', target: 'x', vault }), /not ingesting/)
})

test('status：统计各状态含 stale', async () => {
  const vault = await makeVault()
  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  await writeInboxNote(vault, 'b.md', { id: 'b', title: 'B', wiki_status: 'skipped' })
  await writeInboxNote(vault, 'c.md', {
    id: 'c', title: 'C', wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T09:00:00Z'
  })
  const s = await queueStatus({ now: new Date('2026-10-15T10:00:00Z'), vault })
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

test('trigger：空队列不投递；冷却中不重复投递；有活且冷却过期→投递并写冷却；sender 抛错→no-socket 且不写冷却', async () => {
  const { trigger } = await import('../scripts/skills/queue-trigger.js')
  const now = new Date('2026-10-15T12:00:00Z')
  const vault = await makeVault()

  let r = await trigger({ now, sender: async () => { throw new Error('socket not found') }, vault })
  assert.equal(r.reason, 'empty')

  await writeInboxNote(vault, 'a.md', { id: 'a', title: 'A', wiki_status: 'pending' })
  const calls = []
  const sender = async () => { calls.push('sent') }
  r = await trigger({ now, sender, vault })
  assert.deepEqual(r, { reason: 'sent', triggered: true })
  assert.equal(calls.length, 1)

  r = await trigger({ now, sender, vault })
  assert.equal(r.reason, 'cooldown')
  assert.equal(calls.length, 1)

  // 冷却过期后可再次投递
  r = await trigger({ now: new Date('2026-10-15T12:15:00Z'), sender, vault })
  assert.equal(r.reason, 'sent')
  assert.equal(calls.length, 2)

  // stale ingesting 也算有活
  const vault2 = await makeVault()
  await writeInboxNote(vault2, 's.md', {
    id: 's', title: 'S', wiki_status: 'ingesting', ingest_claimed_at: '2026-10-15T11:00:00Z'
  })
  r = await trigger({ now, sender: async () => { throw new Error('down') }, vault: vault2 })
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

test('backfill：按 source_url/asset_ref 分类，已有状态不动，--apply 幂等', async () => {
  const { planBackfill, applyBackfill } = await import('../scripts/skills/queue-backfill.js')
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
  const { planBackfill } = await import('../scripts/skills/queue-backfill.js')
  const vault = await makeVault()
  await fs.mkdir(path.join(vault, 'Inbox'), { recursive: true })
  await fs.writeFile(path.join(vault, 'Inbox', 'broken.md'), '完全没有 frontmatter')
  const plan = await planBackfill({ vault })
  assert.deepEqual(plan.skipped, ['Inbox/broken.md'])
})

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
