#!/usr/bin/env node
/**
 * wiki-lint：Wiki 一致性巡检（骨架）
 *
 * 契约见：AGENTS.md 第 13-15 节、.claude/skills/wiki-lint/SKILL.md
 *
 * 用法：
 *   node scripts/skills/wiki-lint.js                # 只检查，输出报告（落 reports/lint/）
 *   node scripts/skills/wiki-lint.js --check links  # 单检查项
 *   node scripts/skills/wiki-lint.js --fix          # 追加执行安全自动修复
 *   node scripts/skills/wiki-lint.js --help
 *
 * 当前状态：骨架。参数解析、路径解析与报告落盘已可用，findings 恒为空数组。
 * TODO（确定性检查，实现后应在 findings 中逐条给出 {check, path, message}）：
 *   - links：失效链接 / 单向链接
 *   - index：wiki/index.md 是否覆盖全部 active 页面
 *   - evidence：承重事实是否有 sources；raw 是否被改动（state/manifest.json 的 sha256 比对）
 *   - frontmatter：必填字段、YAML 合法性、type/confidence 取值
 *   - page_type：未在 schema 中定义的页面类型
 *   - duplicate_id / duplicate_slug / empty_page / dates / metadata
 * TODO（安全自动修复，仅 --fix 生效，白名单见 config/settings.yaml）：
 *   - index 排序与补录、backlinks、format、stats/coverage
 * TODO（需人工复核，只报不修）：归档建议、删除、概念合并、矛盾裁决、降级 confidence
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const VAULT = process.env.VAULT_PATH || process.cwd()
const WIKI_DIR = path.join(VAULT, 'wiki')
const REPORT_DIR = path.join(VAULT, 'reports', 'lint')

const DETERMINISTIC_CHECKS = [
  'links', 'index', 'evidence', 'frontmatter', 'page_type',
  'duplicate_id', 'duplicate_slug', 'empty_page', 'dates', 'metadata', 'raw_integrity',
]
const AUTOFIX_WHITELIST = ['index', 'backlinks', 'format', 'stats', 'coverage']

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const valueOf = (f) => {
  const i = argv.indexOf(f)
  return i >= 0 ? argv[i + 1] : undefined
}

if (has('--help') || has('-h')) {
  console.log(`wiki-lint（骨架）

用法：
  node scripts/skills/wiki-lint.js [--check <name>] [--fix] [--json]

确定性检查项：${DETERMINISTIC_CHECKS.join(', ')}
安全自动修复白名单（--fix）：${AUTOFIX_WHITELIST.join(', ')}

契约见 AGENTS.md 第 13-15 节。`)
  process.exit(0)
}

const check = valueOf('--check')
if (check && !DETERMINISTIC_CHECKS.includes(check)) {
  console.error(`未知检查项：${check}（可选：${DETERMINISTIC_CHECKS.join(', ')}）`)
  process.exit(2)
}
if (check && valueOf('--fix')) {
  console.error('--check 与 --fix 不可同时使用')
  process.exit(2)
}

async function exists(p) {
  try { await fs.access(p); return true } catch { return false }
}

const report = {
  ok: true,
  phase: 'deterministic',
  check: check || 'all',
  fix: has('--fix'),
  vault: VAULT,
  checks_planned: check ? [check] : DETERMINISTIC_CHECKS,
  findings: [],
  fixed: [],
  needs_human: [],
  skeleton: true,
}

if (!(await exists(WIKI_DIR))) {
  report.ok = false
  report.error = `未找到 wiki 目录：${WIKI_DIR}（请设置 VAULT_PATH 或先运行安装脚本）`
} else if (!(await exists(path.join(VAULT, 'AGENTS.md')))) {
  report.ok = false
  report.error = '未找到 AGENTS.md，请先在 Vault 根目录部署 LLM Wiki 骨架'
} else {
  // 骨架期：检查项尚未实现，仍落一份空报告，便于后续对比与 lint 记录。
  await fs.mkdir(REPORT_DIR, { recursive: true })
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14)
  const out = path.join(REPORT_DIR, `${ts}.json`)
  await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n')
  report.report_path = path.relative(VAULT, out).split(path.sep).join('/')
}

console.log(JSON.stringify(report))
process.exit(report.ok ? 0 : 1)
