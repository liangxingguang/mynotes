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
    if (v.startsWith('"') && v.endsWith('"')) {
      // formatValue 用 JSON 双引号转义，读回时需反转义；非法转义则仅去引号
      try {
        v = JSON.parse(v)
      } catch {
        v = v.slice(1, -1)
      }
    } else if (v.startsWith("'") && v.endsWith("'")) {
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
