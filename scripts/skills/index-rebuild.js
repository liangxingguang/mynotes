#!/usr/bin/env node
/**
 * index-rebuild：重建 Index/index.json 与 Index/tags.json
 * - 全量扫描 Inbox/ Archive/ 下的 .md，解析 frontmatter
 * - 原子写（tmp + rename），并发安全
 * - 幂等，可重复执行
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const VAULT = process.env.VAULT_PATH || process.cwd()
const DIRS = ['Inbox', 'Archive']
const started = Date.now()

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const fm = {}
  let lastKey = ''
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/)
    if (item && lastKey) {
      // YAML 块级列表，如 tags: 下一行的 "- AI"，并入逗号串供 list() 解析
      const v = item[1].trim().replace(/^["']|["']$/g, '')
      fm[lastKey] = fm[lastKey] ? `${fm[lastKey]}, ${v}` : v
      continue
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/)
    if (!kv) continue
    lastKey = kv[1]
    let v = kv[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1)
    fm[kv[1]] = v
  }
  return fm
}

function list(v) {
  return String(v || '')
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

async function atomicWrite(file, data) {
  const tmp = `${file}.tmp`
  await fs.writeFile(tmp, data, 'utf8')
  await fs.rename(tmp, file)
}

async function readTags() {
  try {
    return JSON.parse(await fs.readFile(path.join(VAULT, 'Index/tags.json'), 'utf8'))
  } catch {
    return { updated_at: '', tags: [] }
  }
}

const notes = []
for (const dir of DIRS) {
  const abs = path.join(VAULT, dir)
  let files = []
  try {
    files = (await fs.readdir(abs)).filter((f) => f.endsWith('.md'))
  } catch {
    continue
  }
  for (const f of files) {
    const md = await fs.readFile(path.join(abs, f), 'utf8')
    const fm = parseFrontmatter(md)
    notes.push({
      id: fm.id || '',
      title: (md.match(/^#\s+(.+)$/m)?.[1] || f.replace(/\.md$/, '')).trim(),
      path: `${dir}/${f}`,
      created: fm.created || '',
      category: fm.category || '',
      tags: list(fm.tags),
      source: fm.source || '',
      source_url: fm.source_url || '',
      source_type: fm.source_type || '',
      platform: fm.platform || '',
      // 取第一条引用块作为摘要，兼容「> 摘要：xxx」与「> xxx」两种写法
      summary: (md.match(/^>\s*(?:摘要[：:]\s*)?(.+)$/m)?.[1] || '').trim(),
      summary_status: fm.summary_status || ''
    })
  }
}

// 统计标签 count 回写 tags.json
const tagsDoc = await readTags()
const counter = new Map()
for (const n of notes) for (const t of n.tags) counter.set(t, (counter.get(t) || 0) + 1)
for (const t of tagsDoc.tags) t.count = counter.get(t.name) || 0
tagsDoc.updated_at = new Date()
  .toLocaleString('sv-SE', { hour12: false })
  .slice(0, 16)

await fs.mkdir(path.join(VAULT, 'Index'), { recursive: true })
await atomicWrite(
  path.join(VAULT, 'Index/index.json'),
  JSON.stringify({ updated_at: tagsDoc.updated_at, notes }, null, 2)
)
await atomicWrite(path.join(VAULT, 'Index/tags.json'), JSON.stringify(tagsDoc, null, 2))

console.log(
  JSON.stringify({ ok: true, notes: notes.length, tags: tagsDoc.tags.length, elapsed_ms: Date.now() - started })
)
