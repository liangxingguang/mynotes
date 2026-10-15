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
