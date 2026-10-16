#!/usr/bin/env node
/**
 * web-fetch：网页正文抓取（两级策略）
 *   一级：HTTP GET + Readability + Turndown -> Markdown
 *   二级：正文过短判定为 SPA -> Playwright Chromium 渲染后重试
 * 用法：node scripts/skills/web-fetch.js <url> [输出.md]
 * 输出：JSON { url, title, markdown_path, fetch_level(http|browser|jina), chars, status }
 * 三级策略：HTTP 直取 → Playwright 渲染 → r.jina.ai 阅读器（反爬兜底，JINA_API_KEY 可提额）
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

// ---------- 代理解析：环境变量优先，Windows 下回退读取系统代理 ----------
async function resolveProxy() {
  const env = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
  if (env) return env
  if (process.platform !== 'win32') return null
  try {
    const { execFileSync } = await import('node:child_process')
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    const en = execFileSync('reg', ['query', key, '/v', 'ProxyEnable'], { encoding: 'utf8', timeout: 3000 })
    if (!/ProxyEnable\s+REG_DWORD\s+0x1/i.test(en)) return null
    const out = execFileSync('reg', ['query', key, '/v', 'ProxyServer'], { encoding: 'utf8', timeout: 3000 })
    const m = out.match(/ProxyServer\s+REG_SZ\s+(\S+)/i)
    if (!m) return null
    let server = m[1]
    if (server.includes('=')) {
      const entry = server.split(';').map(s => s.trim()).find(s => s.startsWith('https=')) ||
                    server.split(';').map(s => s.trim()).find(s => s.startsWith('http='))
      if (!entry) return null
      server = entry.split('=')[1]
    }
    return /^[a-z]+:\/\//i.test(server) ? server : `http://${server}`
  } catch {
    return null
  }
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

async function fetchHttp(target, proxy) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const opts = {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; obsidian-kb/1.0)' }
    }
    if (proxy) {
      // 必须用同一个 undici 副本的 fetch + ProxyAgent（与 Node 内置 fetch 不兼容）
      const { fetch: undiciFetch, ProxyAgent } = await import('undici')
      const res = await undiciFetch(target, { ...opts, dispatcher: new ProxyAgent(proxy) })
      return await res.text()
    }
    const res = await fetch(target, opts)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchBrowser(target, proxy) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {})
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

// 第三级兜底：r.jina.ai 阅读器（返回现成 Markdown；对知乎等反爬站点有效）
// 免费档无需 key（限流 20rpm）；设 JINA_API_KEY 提额
let jinaTitle = ''
async function fetchJina(target, proxy) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 90000) // jina 渲染较慢，给足 90s
  try {
    const headers = {}
    if (process.env.JINA_API_KEY) headers['authorization'] = `Bearer ${process.env.JINA_API_KEY}`
    const jinaUrl = `https://r.jina.ai/${target}`
    let text
    if (proxy) {
      const { fetch: undiciFetch, ProxyAgent } = await import('undici')
      const res = await undiciFetch(jinaUrl, { signal: ctrl.signal, headers, dispatcher: new ProxyAgent(proxy) })
      if (!res.ok) throw new Error(`jina http ${res.status}`)
      text = await res.text()
    } else {
      const res = await fetch(jinaUrl, { signal: ctrl.signal, headers, redirect: 'follow' })
      if (!res.ok) throw new Error(`jina http ${res.status}`)
      text = await res.text()
    }
    // jina 输出格式：Title: ...\n\nURL Source: ...\n\nMarkdown Content:\n<正文>
    const m = text.match(/^Title:\s*(.+)\r?\n[\s\S]*?Markdown Content:\r?\n([\s\S]*)$/)
    if (m) {
      jinaTitle = m[1].trim()
      return m[2]
    }
    return text
  } finally {
    clearTimeout(timer)
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

  const proxy = await resolveProxy()

  // 直连失败且有可用代理时，经代理重试
  async function fetchWithFallback(fn) {
    try {
      return await fn(url, null)
    } catch (e) {
      if (!proxy) throw e
      return await fn(url, proxy)
    }
  }

  let html = FORCE_BROWSER ? await fetchWithFallback(fetchBrowser) : await fetchWithFallback(fetchHttp)
  let { title, md } = toMarkdown(deps, html, url)

  if (!FORCE_BROWSER && md.trim().length < MIN_CHARS) {
    try {
      html = await fetchWithFallback(fetchBrowser)
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

  // 仍过短（反爬壳/登录墙）→ jina 阅读器兜底（FORCE_BROWSER 模式同样生效）
  if (md.trim().length < MIN_CHARS) {
    try {
      const jmd = await fetchWithFallback(fetchJina)
      if (jmd && jmd.trim().length > md.trim().length) {
        md = jmd
        title = jinaTitle || title
        result.fetch_level = 'jina'
      }
    } catch {
      /* jina 不可用则保留现有结果 */
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
  result.reason = String(e.cause ? `${e.message} (${e.cause.code || e.cause.message || e.cause})` : (e.message || e)).slice(0, 200)
}

console.log(JSON.stringify(result))
process.exit(result.status === 'ok' ? 0 : 1)
