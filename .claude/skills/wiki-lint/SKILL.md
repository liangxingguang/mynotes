---
name: wiki-lint
description: Wiki 一致性巡检：确定性检查（链接/索引/证据/frontmatter/重复/日期/raw 完整性）+ 语义检查（矛盾/概念重复/可信度/覆盖缺口）；仅执行安全自动修复（index/backlinks/格式/统计），归档只建议、绝不删除、绝不改 raw。可重复执行（幂等）。
---

## 用法

```bash
node scripts/skills/wiki-lint.js                 # 只检查，输出报告（落 reports/lint/）
node scripts/skills/wiki-lint.js --check links    # 单检查项
node scripts/skills/wiki-lint.js --fix            # 追加执行安全自动修复
node scripts/skills/wiki-lint.js --help
```

## 第 0 步（强制前置）

先读取 `AGENTS.md` 第 13-15 节与附录 A 权限边界、`schemas/Wiki_Page_Schema.md`、`config/settings.yaml`。

## 确定性检查项（脚本执行）

| 检查项 | 内容 | 对应文章脚本 |
|--------|------|--------------|
| links | 失效链接（指向不存在页面）、单向链接 | check_links |
| index | `wiki/index.md` 是否覆盖全部 active 页面 | rebuild_index |
| evidence | 承重事实是否有 `sources`；`raw/` 是否被改动（对照 `state/manifest.json` 的 sha256） | check_evidence |
| frontmatter | 必填字段、合法 YAML、`type`/`confidence` 取值合法 | — |
| page_type | 是否出现未在 schema 中定义的页面类型 | — |
| duplicate_id / duplicate_slug | 重复 id、重复 slug | — |
| empty_page | 空白或占位页面 | — |
| dates | `created`/`updated` 非法日期、`created > updated` | — |
| metadata | 格式错误的元数据 | — |
| raw_integrity | `raw/` 只增不改（append-only 校验） | — |

## 语义检查项（模型判定，脚本只给候选）

无依据的事实断言；相互矛盾的页面（disputed）；重复的概念；过时的页面；缺失的交叉链接；证据薄弱的页面；异常宽泛的主题；应当拆分/合并的页面；缺少独立页面的重要概念。

## 安全自动修复白名单（`--fix`）

仅限：`index`（排序与补录）、`backlinks`（生成 `wiki/meta/backlinks.md`）、`format`（格式与相对路径规范化）、`stats` / `coverage`（生成 `wiki/meta/stats.md`、`wiki/meta/coverage.md`）。

对应文章脚本 `rebuild_index` 与 `rebuild_backlinks`。**除非被明确指示，绝不自动重写语义内容。**

## 需人工复核（只报不修）

归档建议；删除页面；概念合并；矛盾裁决；更改历史性结论或架构决策；降级 `confidence`。

## 输出

JSON：

```json
{ "ok": true, "phase": "deterministic", "findings": [], "fixed": [], "needs_human": [] }
```

报告同时落盘 `reports/lint/YYYYMMDD-HHMMSS.json`。

## 权限边界（Lint 行）

| 能力 | 是否允许 |
|------|------|
| 读取 Raw | ✅ |
| 修改 Raw | ❌ |
| 创建 Wiki | ❌ |
| 修改 Wiki | 仅安全修复 |
| 修改 Index | ✅ |
| 修改 Log | ✅（仅追加 lint 记录） |
| 语义判断 | ✅ |
| 删除知识 | ❌ |
| Archive | 建议（不执行） |

完整边界表见 `AGENTS.md` 附录 A。
