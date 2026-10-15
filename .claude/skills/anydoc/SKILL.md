---
name: anydoc
description: 把 PDF / Word / PowerPoint / Excel / OpenDocument / RTF / EPUB / CSV 转成 Markdown（@firecrawl/anydoc 本地引擎，不出设备）。用户发送文档附件或要求转换/阅读文档时使用。
---

## 用法

```bash
# 纯转换（落 .tmp/，适合先试读）
node scripts/skills/anydoc.js <文件路径>

# 采集归档：原件 + 转换稿一起落 Assets/YYYY/MM/（采集链路用这个）
node scripts/skills/anydoc.js <文件路径> --archive

# 指定输出路径
node scripts/skills/anydoc.js <文件路径> .tmp/report.md
```

输出 JSON：`{ file, name, format, markdown_path, original_path?, chars, truncated, status, ... }`

## 支持格式

doc/docx/docm、ppt/pps/pot/pptx/pptm/ppsx、xls/xlsx/xlsm/xlsb、odt/ods/odp、rtf、epub、csv、pdf。格式按文件内容签名识别，扩展名仅作兜底。

## 硬约束

- **本地执行，不出设备**：默认 `--ocr reject`，所有转换在本机完成。
- **扫描版 PDF**：引擎不做 OCR，返回 `status: needs_ocr` 与 `pages` 页码。此时向用户说明"这是扫描件，本地无法提取文字"，询问是否同意上传 Firecrawl Parse 转换（`--ocr=hosted`，文档会离开本机）；**用户未明确同意前禁止使用 hosted**。
- 输入上限 50MB（`ANYDOC_MAX_BYTES`），输出上限 100 万字符（超出截断，JSON 中 `truncated: true`，按 doc-summary-style 分段阅读）。

## 采集链路（收到文档附件时）

1. 先推一次进度："正在解析文档…"（长任务反馈规则，全程最多 2 条）
2. 执行 `node scripts/skills/anydoc.js <文件> --archive`
3. 成功后自己通读转换稿并生成摘要（长文分段提炼，不调用外部摘要服务）
4. 写 Inbox 笔记：
   - frontmatter 加 `asset_ref: Assets/YYYY/MM/<slug>-<format>.md`（指向**转换稿**，如 `report-docx.md`）与 `wiki_status: pending`
   - 正文 `## 附件` 区用 `[[Assets/YYYY/MM/<slug>-<format>.md]]` 引用转换稿；原始文档名（`original_path`）在其后以纯文本注明
   - `source` 取文档名/发送渠道；IM 临时文件链接有时效，原件已归档，`source_url` 留空或注明"IM 附件（原件已归档）"
5. index-rebuild → git-backup，按标准采集收尾

## 失败 → 用户可读文案（禁止抛堆栈）

| status | 含义 | 给用户的话 |
|---|---|---|
| `needs_ocr` | 扫描版/图片型 PDF | 这是扫描件，本地无法提取文字；回复页码，询问是否同意云端 OCR |
| `encrypted` | 加密/密码保护 | 文档有密码保护，请解密后重发 |
| `malformed` | 内容损坏、提不出有效内容 | 文件可能已损坏，建议重新导出/下载后再发 |
| `unsupported` | 未知或不支持的格式 | 暂不支持该格式，支持 PDF/Office/OpenDocument/RTF/EPUB/CSV |
| `too_large` | 超过 50MB | 文件超过 50MB，请拆分或压缩后发送 |
| `io` / `failed` | 读取或转换失败 | 文档读取失败，请确认文件完整后重试；仍失败可换个导出格式 |
| `hosted` | 云端 OCR 通道不可用 | OCR 服务暂不可用，建议稍后再试或自行提供文字版 |

## 说明

- 转换稿是采集态证据（供日后 wiki-ingest 规范化登记 raw），不是 raw 信源副本；raw 登记规则见 AGENTS.md 附录 B 第 7 条。
- `--archive` 同名原件已存在时保留既有文件、不覆盖（幂等）。
- 文档内嵌图片在 Markdown 中保留 alt 文本，图片字节不单独导出。
