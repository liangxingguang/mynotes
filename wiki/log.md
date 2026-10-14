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
