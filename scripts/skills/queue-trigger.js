#!/usr/bin/env node
/**
 * queue-trigger：采集→摄入的近实时异步触发器（message.sent 钩子调用）
 * 队列存在 pending 或 stale ingesting，且 10 分钟冷却已过
 *   → cc-connect timer add 注册一次性定时器，到期由 daemon 以新会话执行 /ingest
 * 注意：不能用 cc-connect send —— 它只是把文本作为机器人消息发到 IM（出站），
 * 并不会让 agent 执行（2026-10-22 投递黑洞的根因）；timer/cron 的 prompt 才会真正跑 agent。
 * 任何投递失败都静默退出 0：钩子报错会向 IM 发错误回执，且每日 cron 会兜底。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile, exec } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { listInboxNotes, isIngestStale } from './lib/frontmatter.js'

const pexec = promisify(execFile)
const pexecShell = promisify(exec)
const COOLDOWN_MS = 10 * 60 * 1000

export function sanitizeMessage(s) {
  // cmd 双引号内仍会展开 %VAR%、" 可脱出引号、控制字符可断行；& 等在引号内为字面量
  return String(s).replace(/[%"]/g, '').replace(/[\x00-\x1f\x7f]/g, '')
}

export function buildTimerArgs() {
  const project = (process.env.CC_PROJECT || 'obsidian-knowledge').replace(/[^\w.-]/g, '')
  const prompt = sanitizeMessage(process.env.INGEST_TRIGGER_MESSAGE || '/ingest')
  const delay = (process.env.INGEST_TRIGGER_DELAY || '10s').replace(/[^\w.]/g, '')
  // new-per-run：连续自消化时不累积来源会话上下文（token 随篇数膨胀）
  const args = ['timer', 'add', '-p', project, '--delay', delay, '--prompt', prompt, '--session-mode', 'new-per-run']
  // hook 子进程注入 CC_SESSION_KEY：透传 -s 让 timer 结果路由回来源 IM 会话
  // 会话键真实格式含冒号（feishu:oc_...:ou_...），清洗必须保留 : 与 #，否则键被毁形匹配不到会话
  const rawKey = (process.env.CC_SESSION_KEY || '').replace(/[^\w.:#-]/g, '')
  // #cron:xxx 等 per-run 子会话随本轮结束即销毁，回路由会落空；剥掉后缀路由到基础 IM 会话
  const sessionKey = rawKey.replace(/#.*$/, '')
  if (sessionKey) args.push('-s', sessionKey)
  return args
}

export async function evaluate({ vault, now = new Date() } = {}) {
  const notes = await listInboxNotes(vault)
  const hasWork = notes.some(
    (n) => n.fm.wiki_status === 'pending' || isIngestStale(n.fm, now)
  )
  let inCooldown = false
  const cooldownFile = path.join(vault, '.tmp', 'ingest-cooldown')
  try {
    // 优先读文件内容里的时间戳（注入 now 时可确定性测试）；读不出再退回 mtime
    const raw = await fs.readFile(cooldownFile, 'utf8')
    const t = Number.parseInt(raw.trim(), 10)
    const at = Number.isNaN(t) ? (await fs.stat(cooldownFile)).mtimeMs : t
    inCooldown = now.getTime() - at < COOLDOWN_MS
  } catch {
    /* 无冷却文件 */
  }
  return { hasWork, inCooldown }
}

// 诊断日志：追加到 .tmp/queue-trigger.log（一次性 JSON 行），失败不影响主流程
async function logResult(vault, entry) {
  try {
    await fs.mkdir(path.join(vault, '.tmp'), { recursive: true })
    await fs.appendFile(
      path.join(vault, '.tmp', 'queue-trigger.log'),
      JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'
    )
  } catch {
    /* 诊断日志失败静默 */
  }
}

export async function trigger({ vault, now = new Date(), sender } = {}) {
  const { hasWork, inCooldown } = await evaluate({ vault, now })
  if (!hasWork) {
    await logResult(vault, { triggered: false, reason: 'empty' })
    return { triggered: false, reason: 'empty' }
  }
  if (inCooldown) {
    await logResult(vault, { triggered: false, reason: 'cooldown' })
    return { triggered: false, reason: 'cooldown' }
  }
  const send =
    sender ||
    (async () => {
      const bin = process.env.CC_CONNECT_BIN || 'cc-connect'
      const args = buildTimerArgs()
      if (process.platform === 'win32') {
        // cc-connect 在 Windows 是 .cmd shim，需经 shell；单字符串形式避免 DEP0190
        const quoted = args.map((a) => (/[\s\\]/.test(a) ? `"${a}"` : a)).join(' ')
        await pexecShell(`"${bin}" ${quoted}`)
      } else {
        await pexec(bin, args)
      }
    })
  try {
    await send()
  } catch (e) {
    const err = String(e.message || e).slice(0, 120)
    await logResult(vault, { triggered: false, reason: 'no-socket', error: err })
    return { triggered: false, reason: 'no-socket', error: err }
  }
  await fs.mkdir(path.join(vault, '.tmp'), { recursive: true })
  await fs.writeFile(path.join(vault, '.tmp', 'ingest-cooldown'), String(now.getTime()))
  await logResult(vault, { triggered: true, reason: 'sent', args: buildTimerArgs().slice(1) })
  return { triggered: true, reason: 'sent' }
}

// 仅直接运行时执行 CLI；被测试 import 时只导出函数
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vault = process.env.VAULT_PATH || process.cwd()
  trigger({ vault })
    .then((r) => console.log(JSON.stringify({ ok: true, ...r })))
    .catch((e) =>
      // 即使内部出现意外异常，钩子侧也必须是退出 0
      console.log(
        JSON.stringify({ ok: true, reason: 'no-socket', triggered: false, error: String(e.message || e).slice(0, 120) })
      )
    )
}
