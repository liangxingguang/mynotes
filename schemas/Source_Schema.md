# Source Schema（Source_Schema.md）

## 1. 目的

定义 `raw/` 层信源的登记规范。本文件只固化 `AGENTS.md` 与 `Wiki_Page_Schema.md` 已明确的约定，未明确的取值一律标注 `# TODO`，不得凭空发明。

---

## 2. raw 目录约定

```text
raw/
├── sources/            # 文本类原始信源（append-only）
│   ├── ai/
│   ├── architecture/
│   ├── enterprise/
│   ├── products/
│   ├── research/
│   └── misc/
└── assets/             # 二进制原始证据（append-only）
    ├── images/
    ├── pdf/
    └── attachments/
```

- 文件名：`YYYY-MM-DD-<slug>.md`（slug 为小写、连字符、稳定语义标识）。
- 一旦登记，内容**不可修改、不可删除**；实质变更须**新增**一个文件。
- 涉及多个信源时不得合并为一个文件。

---

## 3. 信源页必需的引用字段

Wiki 页面的 `sources` 字段**必须**指向 `raw/` 下真实存在的文件（见 `AGENTS.md` 第 7 节）：

```yaml
sources:
  - raw/sources/architecture/2026-09-12-event-mesh.md
```

---

## 4. 登记元数据（供 `state/manifest.json` 使用）

`state/manifest.json` 为每个已登记信源保存一条记录，`wiki-lint` 用它校验 raw 未被改动：

```json
{
  "path": "raw/sources/misc/2026-10-14-example.md",
  "sha256": "<文件内容的 sha256>",
  "registered_at": "YYYY-MM-DD",
  "inbox_ref": "Inbox/YYYY-MM-DD-slug.md",
  "pages": ["wiki/sources/example.md"],
  "source_url": "https://example.com/post",
  "asset_ref": "Assets/2026/10/example.md"
}
```

- `path` 为相对 Vault 根目录的路径。
- `sha256` 用于确定性检查 `raw` 是否被改动（`AGENTS.md` 13.1）。
- `source_url`：信源原始网址（规范化：去 utm/fragment、host 小写），供采集层跨层去重；非网络信源可省略。
- `asset_ref`：采集态正文/原件路径（`Assets/YYYY/MM/...`）；raw 信源页 frontmatter 用同名字段指回它，只引用不复制，避免二进制双份（附录 B 第 3、7 条）。
- 其余字段可扩展，新增字段须同步更新本文件。

---

## 5. 未明确项

```text
# TODO: 信源分级标记（一手/官方/二次等）的字段名与取值，以《LLM Wiki 知识库搭建深度教程——2. 进阶篇一》原文为准
# TODO: 采集来源平台的登记字段（现有采集层笔记使用 platform/source_type，是否并入 raw 尚未定义）
```
