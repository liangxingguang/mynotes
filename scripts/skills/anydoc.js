#!/usr/bin/env node
/**
 * anydoc：把 PDF / Word / PowerPoint / Excel / OpenDocument / RTF / EPUB / CSV 转成 Markdown
 *
 * 引擎：@firecrawl/anydoc（Rust NAPI，本地线程池执行，不出设备）
 *
 * 用法：
 *   node scripts/skills/anydoc.js <input-file> [output.md] [--archive] [--ocr reject|hosted]
 *
 *   --archive   归档模式：原件与转换稿写入 Assets/YYYY/MM/（默认只写到 output 或 .tmp/）
 *   --ocr       扫描版 PDF 策略：reject（默认，本地拒绝并回报页码）| hosted（上传 Firecrawl Parse，
 *               文档离开本机，未经用户明确同意禁止使用）
 *
 * 环境变量：
 *   VAULT_PATH       Vault 根（默认 process.cwd()），--archive 的 Assets 根
 *   ANYDOC_MAX_BYTES 输入大小上限（默认 50MB）
 *   ANYDOC_MAX_CHARS 输出 Markdown 字符上限（默认 1,000,000，截断时 truncated=true）
 *
 * 输出：JSON { file, name, ext, format, markdown_path, original_path?, chars, truncated, status, ... }
 * status: ok | needs_ocr | encrypted | malformed | unsupported | too_large | resourceLimit |
 *         missingPart | io | hosted | failed
 * 退出码：ok=0，其余=1（JSON 始终输出到 stdout）
 */
import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'

const VAULT = process.env.VAULT_PATH || process.cwd()
const MAX_BYTES = Number(process.env.ANYDOC_MAX_BYTES || 50 * 1024 * 1024)
const MAX_CHARS = Number(process.env.ANYDOC_MAX_CHARS || 1_000_000)

const argv = process.argv.slice(2)
const positional = []
let archive = false
let ocrMode = 'reject'
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--archive') archive = true
  else if (a.startsWith('--ocr=')) ocrMode = a.slice('--ocr='.length)
  else if (a === '--ocr') ocrMode = argv[++i]
  else if (!a.startsWith('--')) positional.push(a)
}

const input = positional[0]
const outputArg = positional[1]

const result = {
  file: input || '',
  name: input ? path.basename(input) : '',
  ext: input ? path.extname(input).toLowerCase() : '',
  format: null,
  markdown_path: outputArg || '',
  chars: 0,
  truncated: false,
  status: 'failed'
}

function finish(code = result.status === 'ok' ? 0 : 1) {
  console.log(JSON.stringify(result))
  process.exit(code)
}

if (!input) {
  result.reason = 'missing input file'
  finish(1)
}
if (!['reject', 'hosted'].includes(ocrMode)) {
  result.reason = `invalid --ocr: ${ocrMode}`
  finish(1)
}

// 与采集层 slug 风格一致：unicode 字母数字保留，其余压成连字符
function slugify(name) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'untitled'
  )
}

function monthDir() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return path.join(VAULT, 'Assets', `${d.getFullYear()}`, `${p(d.getMonth() + 1)}`)
}

let anydoc
try {
  anydoc = await import('@firecrawl/anydoc')
} catch (e) {
  result.reason = `engine unavailable: ${String(e.message || e).slice(0, 160)}`
  finish(1)
}

// 预检：存在性 / 目录 / 大小
let stat
try {
  stat = await fs.stat(input)
} catch (e) {
  result.status = 'io'
  result.reason = String(e.message || e).slice(0, 120)
  finish(1)
}
if (stat.isDirectory()) {
  result.status = 'unsupported'
  result.reason = 'input is a directory'
  finish(1)
}
if (stat.size > MAX_BYTES) {
  result.status = 'too_large'
  result.reason = `file size ${stat.size} exceeds limit ${MAX_BYTES}`
  result.size = stat.size
  result.limit = MAX_BYTES
  finish(1)
}

result.format = anydoc.formatFromPath(input)
result.size = stat.size

// 转换（默认 ocr:reject —— 全程本地；扫描版由调用方征求用户同意后才允许 hosted）
let md
try {
  md = await anydoc.toMarkdown(input, { ocr: ocrMode })
} catch (e) {
  const code = e.code || 'failed'
  result.status = [
    'needs_ocr', 'encrypted', 'malformed', 'unsupported',
    'resourceLimit', 'missingPart', 'io', 'hosted'
  ].includes(code)
    ? code
    : 'failed'
  result.reason = String(e.message || e).slice(0, 200)
  if (code === 'needs_ocr') {
    result.pages = e.pages || []
    result.page_count = e.pageCount ?? null
  }
  finish(1)
}

if (typeof md !== 'string' || md.trim().length < 1) {
  result.status = 'malformed'
  result.reason = 'converter produced empty markdown'
  finish(1)
}

if (md.length > MAX_CHARS) {
  md = md.slice(0, MAX_CHARS)
  result.truncated = true
}
result.chars = md.length

// 落盘路径：显式 output > --archive 的 Assets 路径 > .tmp
// 转换稿带格式后缀（report-docx.md），避免同名不同格式原件（report.docx / report.pdf）互相覆盖
const slug = slugify(path.basename(input))
const fmtTag = result.format || result.ext.replace(/^[.]/, '') || 'doc'
function uniqueMdPath(p, content) {
  // 已存在且内容一致：幂等复用；内容不同：-2/-3 避让
  if (fssync.existsSync(p)) {
    try {
      if (fssync.readFileSync(p, 'utf8') === content) return p
    } catch { /* 不可读则走避让 */ }
    for (let i = 2; i < 1000; i++) {
      const cand = p.replace(/[.]md$/i, `-${i}.md`)
      if (!fssync.existsSync(cand)) return cand
    }
  }
  return p
}
let mdPath
if (outputArg) {
  mdPath = path.resolve(VAULT, outputArg)
} else if (archive) {
  mdPath = uniqueMdPath(path.join(monthDir(), `${slug}-${fmtTag}.md`), md)
} else {
  mdPath = path.join(VAULT, '.tmp', `anydoc-${slug}-${fmtTag}.md`)
}

try {
  await fs.mkdir(path.dirname(mdPath), { recursive: true })
  await fs.writeFile(mdPath, md, 'utf8')
  result.markdown_path = (path.relative(VAULT, mdPath) || mdPath).split(path.sep).join('/')

  // 归档模式：原件（二进制）一并落 Assets/YYYY/MM；已在该目录或同名已存在则不覆盖
  if (archive) {
    const originalDest = path.join(monthDir(), path.basename(input))
    const srcReal = path.resolve(input)
    const destReal = path.resolve(originalDest)
    await fs.mkdir(path.dirname(originalDest), { recursive: true })
    if (srcReal.toLowerCase() !== destReal.toLowerCase()) {
      await fs.copyFile(input, originalDest, fssync.constants.COPYFILE_EXCL).catch((e) => {
        if (e.code === 'EEXIST') return // 同名原件已归档，保留既有文件
        throw e
      })
    }
    result.original_path = path.relative(VAULT, originalDest).split(path.sep).join('/')
  }

  result.status = 'ok'
  finish(0)
} catch (e) {
  result.status = 'failed'
  result.reason = `write failed: ${String(e.message || e).slice(0, 160)}`
  finish(1)
}
