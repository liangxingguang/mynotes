巡检 LLM Wiki 一致性：$ARGUMENTS

步骤：
1. 先读 `AGENTS.md` 第 13-15 节（Lint 契约与自动修复白名单）
2. 执行 `node scripts/skills/wiki-lint.js`（需要选择检查项时用 `--check <name>`）
3. 确定性检查结果按检查项分组汇报；如需修复，仅在白名单内执行 `--fix`
4. 语义检查（矛盾/概念重复/可信度/覆盖缺口）由你自己审查，结论写入报告
5. 归档、删除、概念合并、矛盾裁决**只建议不执行**；可向 `wiki/log.md` 追加一行 lint 记录
