#!/usr/bin/env node
/**
 * queue-backfill：存量 Inbox 笔记一次性回填 wiki_status（幂等）
 *   无状态且有 source_url/asset_ref → pending；否则 → skipped；已有状态不动
 *   默认 dry-run；--apply 才写回。
 */
import { pathToFileURL } from 'node:url'
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

// 仅直接运行时执行 CLI；被测试 import 时只导出函数
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
}
