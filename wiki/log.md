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
- 2026-10-17 13:35 | ingest | raw/sources/ai/2026-10-14-anthropic-ai-native-sdlc-handbook.md | wiki/sources/ai-native-sdlc-playbook.md, wiki/concepts/ai-native-sdlc.md, wiki/concepts/ai-native-organization.md（更新交叉链接）
- 2026-10-17 13:35 | ingest | raw/sources/architecture/2026-10-14-archunit-java-architecture-guardrails.md | wiki/sources/archunit-java-architecture-guardrails.md, wiki/entities/archunit.md
- 2026-10-17 13:35 | ingest | raw/sources/ai/2026-10-14-arthas-mcp-ai-troubleshooting.md | wiki/sources/arthas-mcp-ai-troubleshooting.md, wiki/entities/arthas.md, wiki/concepts/mcp.md（更新）
- 2026-10-17 13:35 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-20 21:30 | ingest | raw/sources/products/2026-10-14-pi-6-extensions-from-claude-code.md | wiki/sources/pi-6-extensions.md, wiki/entities/pi.md, wiki/concepts/mcp.md（更新：MCP 生态个案）
- 2026-10-20 21:30 | ingest | raw/sources/products/2026-10-14-deepseek-harness-7day-day1.md | wiki/sources/deepseek-harness-7day-day1.md, wiki/entities/deepseek-harness.md
- 2026-10-20 21:30 | ingest-fail | Inbox/2026-10-14-drawio-skill-arch-diagram.md | 微博反爬（Sina Visitor System）重抓失败，回退 pending（attempts=1）
- 2026-10-20 21:30 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-21 13:32 | ingest | raw/sources/architecture/2026-10-14-drawio-skill-arch-diagram.md | wiki/sources/drawio-skill-arch-diagram.md, wiki/entities/drawio-skill.md, wiki/entities/archunit.md（更新交叉链接）
- 2026-10-21 13:32 | ingest | raw/sources/misc/2026-10-14-github-niche-usage-tips.md | wiki/sources/github-niche-usage-tips.md
- 2026-10-21 13:32 | ingest | raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part1.md | wiki/sources/java-perf-low-cpu-coding-tips-part1.md, wiki/concepts/cpu-funnel-coding.md
- 2026-10-21 13:32 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-22 13:32 | ingest | raw/sources/misc/2026-10-14-high-perf-low-cpu-coding-tips-part2.md | wiki/sources/java-perf-low-cpu-coding-tips-part2.md, wiki/concepts/cpu-funnel-coding.md（更新：下篇扩展）, wiki/sources/java-perf-low-cpu-coding-tips-part1.md（互链更新）
- 2026-10-22 13:32 | ingest | raw/sources/ai/2026-10-14-huolala-agent-eval-platform.md | wiki/sources/huolala-agent-eval-platform.md, wiki/concepts/agent-evaluation.md
- 2026-10-22 13:32 | ingest | raw/sources/ai/2026-10-14-jd-haibo-ai-knowledge-base.md | wiki/sources/jd-haibo-ai-knowledge-base.md, wiki/entities/jd-haibo.md, wiki/concepts/okf-knowledge-format.md
- 2026-10-22 13:32 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 09:10 | ingest | raw/sources/architecture/2026-10-14-system-design-notes-28-cases.md, raw/sources/architecture/2026-10-23-github-liquidslr-system-design-notes.md | wiki/sources/system-design-notes-28-cases.md, wiki/entities/system-design-notes.md
- 2026-10-23 09:12 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-22 14:45 | ingest | raw/sources/misc/2026-10-14-jvm-tuning-core-approach.md | wiki/sources/jvm-tuning-core-approach.md, wiki/concepts/evidence-first-jvm-tuning.md, wiki/concepts/cpu-funnel-coding.md（互链更新）
- 2026-10-22 14:43 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-22 15:50 | ingest | raw/sources/ai/2026-10-14-learn-pi-agent-01-llm-to-agent.md | wiki/sources/learn-pi-agent-01-llm-to-agent.md, wiki/concepts/agent-loop.md, wiki/entities/pi.md（更新：三包结构与 Harness 定位）
- 2026-10-22 15:51 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 16:50 | ingest | raw/sources/ai/2026-10-14-llm-from-scratch-primer.md | wiki/sources/llm-from-scratch-primer.md, wiki/concepts/next-token-prediction.md, wiki/concepts/agent-loop.md（更新交叉链接）
- 2026-10-23 16:50 | ingest | raw/sources/products/2026-10-14-ms-agent-lightning-rl-framework.md | wiki/sources/ms-agent-lightning-rl-framework.md, wiki/entities/agent-lightning.md
- 2026-10-23 16:50 | ingest-fail | Inbox/2026-10-14-llm-wiki-advanced-four-steps.md | 微信反爬致重抓正文不完整（浏览器渲染时代码块被截断、jina 兜底遇验证码），回退 pending
- 2026-10-23 17:20 | ingest-fail | Inbox/2026-10-14-llm-wiki-advanced-four-steps.md | 第2次失败：微信反爬重抓仍不完整（代码块仅渲染首行；jina 前次遇验证码；Wayback 无快照），回退 pending（attempts=2）
- 2026-10-23 16:50 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 03:30 | ingest-fail | Inbox/2026-10-14-llm-wiki-advanced-four-steps.md | 第3次失败转 failed：微信反爬重抓仍不完整（代码块仅渲染首行，jina MCP 不可用），需人工补全采集稿
- 2026-10-23 03:30 | ingest | raw/sources/ai/2026-10-14-pi-1-0-durable-mcp-update.md | wiki/sources/pi-1-0-durable-mcp-update.md, wiki/concepts/durable-execution.md, wiki/entities/pi.md（更新：1.0/Durable/Code Mode）, wiki/concepts/mcp.md（演进更新）
- 2026-10-23 03:30 | ingest | raw/sources/ai/2026-10-14-pi-sandbox-two-layer-isolation.md | wiki/sources/pi-sandbox-two-layer-isolation.md, wiki/concepts/agent-sandboxing.md, wiki/entities/pi.md（更新：安全姿态）
- 2026-10-23 03:30 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 19:40 | ingest | raw/sources/ai/2026-10-14-pi-school-agent-course.md | wiki/sources/pi-school-agent-course.md, wiki/entities/pi.md（更新：会话树设计/Pi School）
- 2026-10-23 19:40 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 22:35 | ingest | raw/sources/ai/2026-10-14-pi-secondary-dev-5-layers.md | wiki/sources/pi-secondary-dev-5-layers.md, wiki/concepts/pi-customization-layers.md（新建）, wiki/entities/pi.md（更新：作者/星数/四包/五层定制/Node 门槛）
- 2026-10-23 22:35 | ingest | raw/sources/ai/2026-10-14-pi-setup-mcp-codemode-guide.md | wiki/sources/pi-setup-mcp-codemode-guide.md, wiki/concepts/codemode.md（新建）, wiki/entities/pi.md（更新：0.99/MCP/exposure）, wiki/concepts/mcp.md（演进更新）
- 2026-10-23 22:35 | ingest | raw/sources/misc/2026-10-14-pm-director-4-decision-frameworks.md | wiki/sources/pm-director-4-decision-frameworks.md, wiki/concepts/pm-decision-frameworks.md（新建，confidence=low）
- 2026-10-23 22:35 | lint | wiki | findings=0 fixed=0 needs_human=0（skeleton 模式）
- 2026-10-23 07:28 | ingest | raw/sources/ai/2026-10-14-state-of-ai-report-2026.md | wiki/sources/state-of-ai-report-2026.md（新建，confidence=medium）
