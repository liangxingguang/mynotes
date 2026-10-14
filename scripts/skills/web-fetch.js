#!/usr/bin/env node
/**
 * web-fetch：网页正文抓取（两级策略）
 *   一级：HTTP GET + Readability + Turndown -> Markdown
 *   二级：正文过短判定为 SPA -> Playwright Chromium 渲染后重试
 * 用法：node scripts/skills/web-fetch.js <url> [输出.md]
 * 输出：JSON { url, title, markdown_path, fetch_level, chars, status }
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const url = process.argv[2]
if (!url) {
  console.log(JSON.stringify({ status: 'failed', reason: 'missing url' }))
  process.exit(1)
}

const VAULT = process.env.VAULT_PATH || process.cwd()
const OUT = process.argv[3] || path.join(VAULT, '.tmp/web.md')
const TIMEOUT = Number(process.env.WEB_TIMEOUT_MS || 30000)
const MIN_CHARS = Number(process.env.WEB_MIN_CHARS || 800)
const MAX_CHARS = Number(process.env.WEB_MAX_CHARS || 120000)
// --browser：跳过正文字数启发式，强制走 Playwright 渲染（用于返回大量反爬壳页面的站点）
const FORCE_BROWSER = process.argv.includes('--browser')

// ---------- 安全：禁止 file://、localhost、内网地址 ----------
function assertSafe(u) {
  let parsed
  try {
    parsed = new URL(u)
  } catch {
    throw new Error('invalid url')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol not allowed')
  const h = parsed.hostname.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) throw new Error('local address not allowed')
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) throw new Error('private address not allowed')
  const m = h.match(/^172\.(\d+)\./)
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) throw new Error('private address not allowed')
}

async function loadDeps() {
  const [{ JSDOM }, { Readability }, TurndownModule] = await Promise.all([
    import('jsdom'),
    import('@mozilla/readability'),
    import('turndown')
  ])
  const Turndown = TurndownModule.default || TurndownModule
  return { JSDOM, Readability, Turndown }
}

function toMarkdown(deps, html, url) {
  const { JSDOM, Readability, Turndown } = deps
  const dom = new JSDOM(html, { url })
  const article = new Readability(dom.window.document).parse()
  const body = article?.content || html
  const td = new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  return { title: article?.title || '', md: td.turndown(body) }
}

async function fetchHttp(target) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(target, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; obsidian-kb/1.0)' }
    })
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchBrowser(target) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route('**/*', (route) => {
      const t = route.request().resourceType()
      return ['image', 'font', 'media'].includes(t) ? route.abort() : route.continue()
    })
    await page.goto(target, { waitUntil: 'networkidle', timeout: TIMEOUT })
    return await page.content()
  } finally {
    await browser.close()
  }
}

const result = {
  url,
  title: '',
  markdown_path: OUT,
  fetch_level: FORCE_BROWSER ? 'browser' : 'http',
  chars: 0,
  status: 'ok'
}

try {
  assertSafe(url)
  const deps = await loadDeps()

  let html = FORCE_BROWSER ? await fetchBrowser(url) : await fetchHttp(url)
  let { title, md } = toMarkdown(deps, html, url)

  if (!FORCE_BROWSER && md.trim().length < MIN_CHARS) {
    try {
      html = await fetchBrowser(url)
      const rendered = toMarkdown(deps, html, url)
      if (rendered.md.trim().length > md.trim().length) {
        md = rendered.md
        title = rendered.title || title
        result.fetch_level = 'browser'
      }
    } catch {
      /* 浏览器不可用则保留 HTTP 结果 */
    }
  }

  if (md.trim().length < 1) {
    result.status = 'blocked'
  }

  md = md.slice(0, MAX_CHARS)
  result.title = title
  result.chars = md.length

  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, md, 'utf8')
} catch (e) {
  result.status = 'failed'
  result.reason = String(e.message || e).slice(0, 200)
}

console.log(JSON.stringify(result))
process.exit(result.status === 'ok' ? 0 : 1)
