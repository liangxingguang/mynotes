#!/usr/bin/env node
// web-fetch 代理包装：强制经本地代理抓取（换出口 IP，绕开微信环境异常限流）
// 用法: node scripts/skills/web-fetch-proxy.js <url> [输出.md] [--browser]
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const proxy = process.env.PROXY_URL || 'http://127.0.0.1:7890'
const here = path.dirname(fileURLToPath(import.meta.url))
const args = [path.join(here, 'web-fetch.js'), ...process.argv.slice(2)]

const res = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env: { ...process.env, FORCE_PROXY: '1', HTTPS_PROXY: proxy, HTTP_PROXY: proxy, https_proxy: proxy, http_proxy: proxy },
})
process.exit(res.status === null ? 1 : res.status)
