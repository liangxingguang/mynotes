#!/usr/bin/env node
/**
 * daily-digest：生成当日采集汇总
 * - 只读 Index/index.json，不写 Vault
 * - 默认输出到 stdout；加 --push 时调用 cc-connect send --message 推送
 * - 当天零采集则不推送
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const VAULT = process.env.VAULT_PATH || process.cwd()
const PUSH = process.argv.includes('--push')

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function countBy(arr, key) {
  return arr.reduce((m, x) => {
    const k = x[key] || '未知'
    m[k] = (m[k] || 0) + 1
    return m
  }, {})
}

function fmt(obj) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')
}

let index
try {
  index = JSON.parse(await fs.readFile(path.join(VAULT, 'Index/index.json'), 'utf8'))
} catch {
  console.log('index missing, skip digest')
  process.exit(0)
}

const today = todayStr()
const notes = (index.notes || []).filter((n) => String(n.created || '').slice(0, 10) === today)

if (notes.length === 0) {
  console.log('no collection today, skip digest')
  process.exit(0)
}

const tagCounter = {}
for (const n of notes) for (const t of n.tags || []) tagCounter[t] = (tagCounter[t] || 0) + 1

let backlog = 0
try {
  backlog = (await fs.readdir(path.join(VAULT, 'Inbox'))).filter((f) => f.endsWith('.md')).length
} catch {
  /* ignore */
}

const lines = [
  `📊 今日采集 ${today}：共 ${notes.length} 条`,
  `来源：${fmt(countBy(notes, 'platform'))}`,
  `类型：${fmt(countBy(notes, 'source_type'))}`,
  Object.keys(tagCounter).length ? `标签：${fmt(tagCounter)}` : '',
  `Inbox 待整理：${backlog} 篇`,
  '',
  ...notes.slice(0, 10).map((n, i) => `${i + 1}. 《${n.title}》${n.category ? '#' + n.category : ''} — ${n.summary || ''}`),
  '',
  '用 /today 随时查看，用 /read 笔记名查看全文'
].filter(Boolean)

const text = lines.join('\n')
console.log(text)

if (PUSH) {
  try {
    await exec('cc-connect', ['send', '--message', text], { cwd: VAULT })
  } catch (e) {
    console.error('push failed:', String(e.message || e).slice(0, 200))
    process.exit(1)
  }
}
