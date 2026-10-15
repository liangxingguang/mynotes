# 操作日志（log.md）

> **仅可追加**（append-only）。每次完成的 ingest / query / lint / schema migration 必须在此追加一行，绝不重写历史条目。

格式：

```text
- YYYY-MM-DD HH:MM | <ingest|query|lint|migration> | <对象> | <产物>
```

<!-- 示例（勿删）：
- 2026-10-14 21:00 | ingest | raw/sources/misc/2026-10-14-example.md | wiki/sources/example.md, wiki/concepts/demo.md
- 2026-10-14 21:05 | lint | wiki | findings=2 fixed=1 needs_human=1
-->

- （暂无记录）
- 2026-10-15 08:10 | migration | 采集→wiki 衔接契约（留证+pending 队列+跨层去重） | AGENTS.md §2.1/附录B.7, schemas/Source_Schema.md, .claude/skills/wiki-ingest/SKILL.md, CLAUDE.md, scripts/skills/index-rebuild.js, scripts/skills/daily-digest.js
- 2026-10-15 23:37 | migration | 采集→wiki 异步贯通（队列状态机+queue-trigger/cron+存量回填） | AGENTS.md §2.1/附录B.8, CLAUDE.md, .claude/skills/wiki-ingest/SKILL.md, .claude/skills/git-backup/SKILL.md, scripts/skills/queue-claim.js, scripts/skills/queue-trigger.js, scripts/skills/queue-backfill.js, scripts/skills/lib/frontmatter.js
