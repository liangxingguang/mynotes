#!/usr/bin/env node
/**
 * notify-done：任务收尾后发送独立的「处理完成」回执
 * - 由 cc-connect 的 message.sent hook 调用
 * - 跨平台（Windows / Linux）：命令与文案都在 JS 内，避开 shell 引号与编码差异
 * - 会话键优先从 sessions 文件解析，避免依赖各平台 hook 环境变量命名差异
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const MESSAGE = '✅ 处理完成'
const DATA_DIR = process.env.CC_DATA_DIR || path.join(os.homedir(), '.cc-connect')
const PROJECT = process.env.CC_HOOK_PROJECT || ''

async function resolveSessionKey() {
  const dir = path.join(DATA_DIR, 'sessions')
  const files = await fs.readdir(dir).catch(() => [])
  for (const f of files) {
    if (PROJECT && !f.startsWith(PROJECT)) continue
    try {
      const j = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))
      const keys = Object.keys(j.active_session || {})
      if (keys.length) return keys[0]
    } catch {
      /* 忽略损坏/非 JSON 文件 */
    }
  }
  return process.env.CC_HOOK_SESSION_KEY || ''
}

const args = ['send', '--stdin']
if (PROJECT) args.push('-p', PROJECT)
const sessionKey = await resolveSessionKey()
if (sessionKey) args.push('-s', sessionKey)

// Windows 下 cc-connect 是 .cmd，需经 shell 调用；stderr 丢弃以屏蔽转义告警
const child = spawn('cc-connect', args, {
  stdio: ['pipe', 'inherit', 'ignore'],
  shell: process.platform === 'win32',
})
child.on('error', () => {})
child.stdin.on('error', () => {})
child.stdin.end(MESSAGE)
