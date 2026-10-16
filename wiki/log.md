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
- 2026-10-16 23:30 | migration | raw 信源页改为收录原文全文（不再写摘要；缺失则重抓，抓不到 fail） | AGENTS.md 附录B.7, schemas/Source_Schema.md, .claude/skills/wiki-ingest/SKILL.md（人工决策：raw 应自含全文证据）
- 2026-10-16 23:35 | lint | raw 3 篇摘要版信源修正 | 人工授权破例：按 source_url 重抓原文全文替换 raw/sources/{ai,architecture,enterprise}/ 下 2026-10-13/14 三篇（a2a-multi-agent-langgraph / system-design-12-components / ai-native-rd-org-alibaba），manifest sha256 同步更新，wiki-lint 通过
- 2026-10-16 15:02 | ingest | raw/sources/ai/2026-10-13-a2a-multi-agent-langgraph.md | wiki/sources/a2a-multi-agent-langgraph.md, wiki/concepts/a2a-protocol.md, wiki/concepts/mcp.md, wiki/comparisons/a2a-vs-mcp.md
- 2026-10-16 15:02 | ingest | raw/sources/architecture/2026-10-13-system-design-12-components.md | wiki/sources/system-design-12-components.md, wiki/topics/system-design-core-components.md
- 2026-10-16 15:02 | ingest | raw/sources/enterprise/2026-10-14-ai-native-rd-org-alibaba.md | wiki/sources/ai-native-rd-org-forum.md, wiki/concepts/ai-native-organization.md
- 2026-10-16 15:02 | lint | wiki | findings=0 fixed=0 needs_human=0（骨架期，检查项未实现）
