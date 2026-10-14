在 LLM Wiki 中检索并回答：$ARGUMENTS

步骤：
1. 先读 `AGENTS.md` 第 11-12 节（查询与回答契约）
2. 加载 `wiki-query` skill，按检索顺序：`wiki/index.md` → 命中页 → 被链接页 → 覆盖不足才回退 `raw/`
3. 回答必须区分「已确立知识 / 综合归纳 / 推断 / 不确定性 / 矛盾 / 缺失信息」，承重事实给出 `raw/` 溯源
4. **Wiki 覆盖不足时必须显式说明**，并回退到 raw 给线索，绝不编造
5. 可向 `wiki/log.md` 追加一行 query 记录；不得创建或修改任何 wiki 页面
