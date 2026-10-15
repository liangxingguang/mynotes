# 采集 → LLM Wiki 异步贯通与自动备份 · 设计文档

- 日期：2026-10-15
- 状态：待评审
- 范围：采集层（cc-connect / Inbox）、衔接队列、Wiki 摄入调度、自动备份

## 1. 背景与现状

Vault 已具备三层结构与运行契约（`CLAUDE.md` 采集层、`AGENTS.md` raw/wiki 层），但「采集 → 摄入」从未自动跑通：

| 环节 | 现状 | 问题 |
|---|---|---|
| 采集 | 飞书 → cc-connect → Claude 会话；新笔记写 `Inbox/`，含 `asset_ref` + `wiki_status: pending` | 2026-10-15 前的 **28 篇老笔记无 `wiki_status`**，对摄入队列不可见 |
| 摄入衔接 | 契约完备（AGENTS.md 附录 B.7）；`wiki-ingest` skill 存在 | `raw/` 0 篇信源、`state/manifest.json` entries 为空、wiki 仅 3 篇手写页；`/ingest` 全靠人工发起；无并发认领机制，两个会话可能消费同一篇 |
| 调度 | cc-connect 支持 cron（v1.5.0，`--prompt` 走 agent 新会话）；当前配置中**无任何 cron 任务** | 失败/崩溃/存量无兜底 |
| 备份 | `message.sent` 钩子已自动执行 `index-rebuild.js; git-backup.js`（async）；git-backup 白名单已覆盖 Inbox/Archive/Assets/Index/raw/wiki/schemas/config/templates/state/scripts/.claude + 契约文件 | 实际已自动化；git-backup 的 SKILL.md 文档过时（仍写"只备份 4 个目录"）；async 钩子失败无感知，无定时兜底 |

## 2. 目标与非目标

### 目标

1. 采集会话写完 Inbox 笔记后，**异步**触发摄入，不阻塞 IM 回复。
2. 队列消费具备**并发安全**的认领/完成/失败状态机，崩溃可恢复。
3. **每日定时兜底**：重试失败、消化存量，并汇报 failed 清单。
4. **手动 `/ingest` 入口完全保留**，行为与自动触发一致。
5. 摄入成果（raw/wiki/manifest/Archive/Index）随会话收尾**自动备份到 GitHub**（复用现有钩子，不新建备份机制）。
6. 28 篇存量笔记一次性、幂等地回填队列状态。

### 非目标

- 不改变 13 阶段摄入契约本身与 raw 不可变约束。
- 不做静态文件权限/deny 规则（遵循附录 B.4）。
- 不引入新依赖（仅 Node 内置模块）。
- 不自动做语义裁决（矛盾、合并、删除仍属人工权威，AGENTS.md 第 19 节）。

## 3. 总体架构

```
飞书消息（链接/文档/文字）
   └─ 采集会话：抓取→摘要→写 Inbox→回复 IM（不摄入，不阻塞）
        └─ message.sent 钩子（async，已有 + 新增一格）
             ├─ index-rebuild.js     （已有）
             ├─ git-backup.js        （已有，备份采集成果）
             └─ queue-trigger.js     【新增】
                    └─ 队列非空且冷却已过 → cc-connect send -p obsidian-knowledge "/ingest"
                           └─ 摄入会话（独立新会话）：
                                 claim → 13 阶段 → done/fail
                                    └─ 其 message.sent 钩子：
                                         index-rebuild + git-backup（备份摄入成果）
                                         + queue-trigger（队列仍有 → 10 分钟后继续，自消化存量）

每日 21:20 cron（新增）：新会话执行 /ingest 至多 3 篇（stale 回收 + failed 重试 + 存量），汇报结果
手动 /ingest [材料]：保留；无参数时同样先 claim，行为与自动触发完全一致
```

关键不变量：**采集会话与摄入会话永不在同一会话内**。异步边界 = cc-connect 的 `send` API（新排队消息）与 cron（新会话）。

## 4. 队列状态机

### 4.1 状态枚举（frontmatter `wiki_status`）

| 状态 | 含义 | 谁可置位 |
|---|---|---|
| `pending` | 待摄入（含失败回退） | 采集层、queue-claim fail、backfill |
| `ingesting` | 已被某会话认领（附 `ingest_claimed_at`、`ingest_claim_id`） | queue-claim claim |
| `ingested` | 摄入完成，笔记已移 Archive | queue-claim done（唯一置位者） |
| `failed` | 自动重试 3 次仍失败（附 `ingest_error`），暂停自动消费 | queue-claim fail |
| `skipped` | 闪念/不入 wiki | 采集层 |

frontmatter 附加字段：`ingest_attempts`（默认 0）、`ingest_claimed_at`（ISO）、`ingest_claim_id`（pid+时间戳）、`ingest_error`（最后失败原因，≤200 字）。

### 4.2 转换规则

```
pending ──claim──▶ ingesting
ingesting ──done──▶ ingested（移动 Inbox → Archive，manifest 的 inbox_ref 由摄入流程更新）
ingesting ──fail──▶ attempts<3 ? pending(attempts+1) : failed
ingesting ──崩溃/超时──▶ 超过 30 分钟无 done/fail → 下次 claim 回收为 pending（不计 attempts）
failed ──claim --include-failed──▶ ingesting（attempts 归零）
```

- 认领粒度：每次 claim **1 篇**（与 wiki-ingest「单轮默认 1 篇、至多 3 篇」的批量约束兼容；每日 cron 的 prompt 让会话内连续 claim 至多 3 次）。
- 普通 claim 的合格集 = `pending` + stale `ingesting`；`failed` 仅在显式 `--include-failed` 时合格（每日 cron prompt 与手动介入使用），认领时 attempts 归零重新计数。
- done 的移动目标 `Archive/` 同名冲突时追加 `-2`（与 Inbox 命名规则一致）。

### 4.3 并发安全

- claim 以 `.tmp/queue.lock`（`wx` 排他创建 + 120s stale 回收，与 git-backup 锁同型）串行化「读状态 → 改 frontmatter → 写回」。
- frontmatter 写回只改队列字段，保留其余内容；笔记正文不动。
- 锁、冷却文件均在 `.tmp/`（已 gitignore）。

## 5. 新增脚本

均位于 `scripts/skills/`，Node ESM，仅内置模块；`VAULT_PATH` 环境变量可注入（测试用临时目录）；输出单行 JSON；失败退出码非 0。

### 5.1 `queue-claim.js`（状态机执行器）

```
node scripts/skills/queue-claim.js claim [N] [--include-failed]
  → { ok, claimed: [{path, title, claim_id}] }  # N 默认 1；自动回收 stale ingesting；
                                         # --include-failed 时 failed 亦合格（按 pending→failed 排序，attempts 归零）
node scripts/skills/queue-claim.js done <path> [--claim-id <id>]
  → { ok, archived: "Archive/xx.md" }
node scripts/skills/queue-claim.js fail <path> --reason "<txt>" [--claim-id <id>]
  → { ok, status: "pending"|"failed", attempts }
node scripts/skills/queue-claim.js status
  → { ok, pending, ingesting, failed, stale, skipped }
```

- 选取顺序：`Index/index.json` 可能过期，直接**非递归扫描 `Inbox/*.md`**（遵循附录 B.6），按文件名（日期前缀）升序取最早。
- done/fail 校验文件当前 `ingest_claim_id` 与认领记录一致，防止迟到的会话改动他人状态。
- 解析/写回 frontmatter 复用 index-rebuild 的极简 YAML 子集写法，新字段追加在 `wiki_status` 附近。
- claim 时同时校验文件仍在 `Inbox/`（已被归档则跳过）。

### 5.2 `queue-trigger.js`（近实时异步触发器，message.sent 钩子调用）

```
node scripts/skills/queue-trigger.js
  → { ok, triggered: bool, reason: "empty"|"cooldown"|"no-socket"|"sent" }
```

行为：

1. 扫描 `Inbox/`：无 `pending` 且无 stale `ingesting` → 静默退出 0（`empty`）。
2. 冷却：`.tmp/ingest-cooldown` 存在且 mtime 距今 < 10 分钟 → 退出 0（`cooldown`）。
3. 投递：`cc-connect send -p obsidian-knowledge -m "/ingest"`；成功后写冷却文件。
   - cc-connect 未运行（api.sock 不存在）等投递失败 → 退出 0 并报 `no-socket`（钩子不能报错刷错误回执；每日 cron 兜底）。
4. 冷却的意义：并发 3 的采集会话、摄入会话自身的收尾钩子都会调用本脚本；10 分钟窗口把多次事件折叠为一次投递，且避免队列长串时消息洪泛。摄入会话通常持续数分钟，其收尾时冷却恰好接近过期，形成「每轮约 10 分钟消化 1 篇」的自节流链。

### 5.3 `queue-backfill.js`（存量一次性回填，手动）

```
node scripts/skills/queue-backfill.js           # dry-run，只输出分类报告
node scripts/skills/queue-backfill.js --apply   # 实际写 frontmatter
```

规则（幂等：已有 `wiki_status` 的笔记一律不动）：

- 有 `source_url` 或 `asset_ref` → 追加 `wiki_status: pending`；
- 两者皆无（纯闪念）→ `wiki_status: skipped`；
- 输出 { total, pending, skipped, untouched }。

回填后由 trigger/cron 自然消化，不追求一次清完。

## 6. cc-connect 配置变更（`config.toml`）

hooks 段在现有 index-rebuild + git-backup 之后追加一格（同 `message.sent`，async，timeout 15）：

```toml
[[hooks]]
event = "message.sent"
type = "command"
command = "node scripts/skills/queue-trigger.js"
async = true
timeout = 15
```

注册每日 cron（cc-connect 运行时一次性执行；当前开发机 cc-connect 未运行，部署时执行）：

```bash
cc-connect cron add -c "20 21 * * *" -p obsidian-knowledge \
  --session-mode new-per-run --silent --timeout-mins 30 \
  --prompt "执行 wiki-ingest：本轮总计至多 3 篇。先用普通 claim 消费 pending 与超时 ingesting；若不足 3 篇，用 claim --include-failed 对 failed 笔记各重试一次。队列完全为空则一句话汇报；结尾列出仍 failed 的清单与原因。"
```

- 21:20 避开整点；与现有 `daily-digest`（21:00，只读不写）错开。
- `--silent` + prompt 自带汇报：有成果/有 failed 时才产生有信息量的消息。

## 7. 备份链路（复用，不新建）

- 采集会话收尾：现有钩子备份 Inbox/Assets/Index。
- 摄入会话收尾：同一钩子备份 raw/wiki/state/manifest.json/Archive/Index/Inbox。
- 每日 cron 会话收尾：再兜底一次；push 失败有 git-backup 内置 3 次重试 + 锁，漏提交由下一会话补上。
- 文档修正：`.claude/skills/git-backup/SKILL.md` 更新为真实白名单与锁/重试行为。
- 新增 `docs/` 目录（放本设计文档），需加入 git-backup 白名单（`git-backup.js` / `git-auto-backup.sh` / `git-auto-backup.ps1` 三处 PATHS 同步追加 `docs`）。

## 8. 文档与契约变更（走 AGENTS.md 2.4 流程）

顺序：schema/契约 → 模板/skill → lint/验证 → log。

1. `AGENTS.md` 2.1：状态枚举扩为 pending/ingesting/failed/ingested/skipped，简述状态机；附录 B.7 补充 claim/done/fail 脚本化与 trigger/cron 衔接。
2. `CLAUDE.md`：写笔记规范的 `wiki_status` 枚举同步；决策顺序注明「采集不内联摄入，队列异步消费 + 每日兜底，手动 /ingest 保留」。
3. `.claude/skills/wiki-ingest/SKILL.md`：阶段 1 改为「先 `queue-claim.js claim` 拿清单（手动指定材料除外）」；阶段 12/13 用 done/fail 收尾，模型不再手写状态或自行 mv；其余 13 阶段不变。
4. `.claude/skills/git-backup/SKILL.md`：修正过时描述。
5. 新增 queue 三个脚本的简短说明（写在各自脚本头部注释；不在 CLAUDE.md 增加新 skill 条目——它们是被 wiki-ingest/钩子调用的执行器，不是调度 skill）。
6. 完成后执行 `wiki-lint.js`，并在 `wiki/log.md` 追加一条结构变更记录。

## 9. 测试

`tests/` 当前为空，新建 `tests/queue.test.js`（node:test，临时目录作 VAULT_PATH，无第三方依赖）：

1. claim：空队列返回空；两篇 pending 只认领最早的一篇并置 ingesting+时间戳。
2. 并发：两个 claim 调用（锁竞争）不会得到同一篇。
3. stale 回收：ingesting 且 claimed_at 超 30 分钟 → 被重新认领，attempts 不增加。
4. fail：第 1、2 次回 pending 且 attempts 递增；第 3 次转 failed 且写 error。
5. done：置 ingested、文件移到 Archive/、同名冲突加 -2。
6. trigger：空队列不投递；有 pending 且冷却过期 → 调用 send（用假 cc-connect 可执行文件注入 PATH 断言参数）并写冷却；冷却中不重复投递。
7. backfill：有/无 source_url 的分类正确；重复运行不改动已回填文件。
8. 回归：`index-rebuild.js` 能解析新字段（wiki_status 已支持，验证 ingesting/failed 正确入库 index.json）。

## 10. 上线步骤

1. 实现 queue-claim/trigger/backfill + 测试，`node --test tests/` 全绿。
2. 文档与契约按第 8 节更新（先于或同批代码提交）。
3. 白名单加 `docs`，提交设计文档与代码。
4. `queue-backfill.js` dry-run 给用户看分类结果，确认后 `--apply`。
5. 更新部署环境 `config.toml`（hook 格）并重启 cc-connect；注册 cron；用 `cron list` 核验。
6. 手动 `queue-trigger.js` 验证一次端到端投递 → 摄入 → 备份；检查 GitHub 收到 raw/wiki 提交。

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| 摄入会话失败循环刷消息 | 10 分钟冷却 + 3 次失败转 failed 退出自动循环；每日仅一次重试 |
| cc-connect 未运行时 trigger 失效 | 静默退出 + 每日 cron 兜底 + 手动 /ingest |
| 两个会话抢同一篇 | claim 文件锁 + claim_id；done/fail 校验当前 claim |
| 存量消化期 IM 收到约 28 条汇报 | 自节流约 10 分钟/条，约一天清完；已在评审中确认接受（备选"仅每日 cron"已否决） |
| 模型不按 skill 用脚本、手写状态 | 状态机只在脚本内，SKILL.md 明确 done/fail 是唯一收尾路径；lint/巡检可加"ingesting 残留"检查（本期不做，status 命令已可观测） |
| 第三方模型端点分钟级延迟 | 维持每会话 1 篇（cron prompt 至多 3 篇）、30 分钟超时、stale 30 分钟回收 |
