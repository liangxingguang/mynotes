把下列材料摄入为 LLM Wiki 知识：$ARGUMENTS

步骤（严格按 AGENTS.md 的 13 阶段契约执行，绝不修改既有 raw/）：
1. 先读 `AGENTS.md`、`schemas/Wiki_Page_Schema.md`、`schemas/Frontmatter_Schema.yaml`、`config/settings.yaml`
2. 加载 `wiki-ingest` skill 并按其 13 阶段执行；**不得跳过「已有知识分析」**
3. 完成后向 `wiki/log.md` 追加一行，并更新 `state/manifest.json`
4. 执行 `node scripts/skills/wiki-lint.js`，修掉确定性错误
5. 回复：新增/更新的页面清单（`[[链接]]`）、index/log 变更、需人工复核项；未指定材料时回复用法
