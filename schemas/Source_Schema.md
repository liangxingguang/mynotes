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

### raw 信源页结构

```markdown
---
title: <原文标题>
source: <出处/作者>
source_url: <原始网址，规范化>
source_type: <article/doc/post 等>
platform: <来源平台>
captured: <采集日期 YYYY-MM-DD>
registered_at: <登记日期 YYYY-MM-DD>
inbox_ref: <Archive/ 或 Inbox/ 笔记路径>
asset_ref: <Assets/YYYY/MM/ 采集稿路径；无采集稿（重抓补登）可省略>
---

# <原文标题>

<原文全文：自 Assets 采集稿逐字复制，或按 source_url 重抓的原文；不得压缩、改写、节选>
```

- **正文必须是原文全文**，不是摘要/提炼稿（2026-10-16 契约变更，见 wiki/log.md）；LLM 对正文的唯一处理是规范化（换行/编码），不得改变语义。
- 采集稿缺失且重抓失败时，该篇摄入 fail 并说明，禁止用笔记摘要充当全文。

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
- `asset_ref`：采集态正文/原件路径（`Assets/YYYY/MM/...`）；raw 信源页 frontmatter 用同名字段指回它。文本全文在 raw 信源页正文原样收录（逐字复制，不属"同名副本"）；二进制原件仍只存 Assets、不重复归档（附录 B 第 3、7 条）。
- 其余字段可扩展，新增字段须同步更新本文件。

---

## 5. 未明确项

```text
# TODO: 信源分级标记（一手/官方/二次等）的字段名与取值，以《LLM Wiki 知识库搭建深度教程——2. 进阶篇一》原文为准
# TODO: 采集来源平台的登记字段（现有采集层笔记使用 platform/source_type，是否并入 raw 尚未定义）
```
