---
name: wiki-ingest
description: 把原始材料摄入为结构化 Wiki 知识：按 AGENTS.md 的 13 阶段契约只读 raw、写 wiki/、更新 index/log/manifest 与交叉链接。绝不修改或删除既有 raw。用户说"摄入/整理进 wiki/沉淀为知识"时使用。
---

## 何时使用

- 用户要求把一条采集内容（Inbox 笔记、链接、文档）沉淀为 Wiki 知识
- 需要对已有 wiki 页面做增量编译（新信源印证/更新/矛盾已有知识）
- 用户说"摄入""整理进 wiki""编进知识库"

## 第 0 步（强制前置）

先读取以下文件并严格遵守：

1. `AGENTS.md`（运行契约，尤其第 3 节不变量、第 9-10 节摄入契约、附录 A 权限边界、附录 B 硬规则）
2. `schemas/Wiki_Page_Schema.md`（页面结构与 8 类页面骨架）
3. `schemas/Frontmatter_Schema.yaml` 与 `config/settings.yaml`（字段与取值）

`templates/<type>.md` **按阶段 4 分诊结果按需读取**——只读本轮确定要创建/更新的页面类型模板（通常 1–2 个），不要一次读全部模板。同一会话连续摄入多篇时，第 0 步文件只读一次。

## 批量约束（强制）

**单轮只处理 1–3 篇**（默认 1 篇）。待处理对象超过 3 篇时，只取最早的 1–3 篇；处理完成后如实报出剩余数量，由用户再次发起。**不得单轮跑完整个 `Inbox/`。**

原因：本仓库接入的模型端点单次响应可达分钟级，且客户端请求侧无超时；单轮串行几十次调用会长时间无响应，表现为「卡死」。

## 反原样复制（强制）

`raw/sources/<域>/<slug>.md` 必须是**按 `Source_Schema.md` 登记的信源**（登记 frontmatter + 原文全文），不是 `Inbox/` 笔记的字节副本；笔记的摘要/核心要点属于采集层产物，**不得**写入 raw 正文，raw 正文只能是原文全文（见阶段 3）。

- 禁止把 `Inbox/` 笔记原样复制进 `raw/`：既没有产生知识，又会在 Obsidian 全局 basename 解析下制造同名冲突（见 `AGENTS.md` 附录 B 第 3 条）。
- 处理完一篇后运行 `node scripts/skills/queue-claim.js done <path> --claim-id <id>` 收尾（脚本置 `ingested` 并移入 `Archive/`，返回 `Archive/` 新路径），并把 manifest entry 的 `inbox_ref` 更新为该路径；失败用 `fail <path> --claim-id <id> --reason <简述>`。不得手写 `wiki_status`、不得自行 mv、不得与 `raw/` 中信源同名共存。

## 13 阶段执行契约

1. **接收（Intake）**：用户显式指定 Inbox 笔记时，运行 `node scripts/skills/queue-claim.js claim --target <path|id>` 定向认领该篇（仅 pending/failed 可认领，failed 时 attempts 归零）；用户直接给链接/文档等新材料时，先按采集规范写入 Inbox（pending）再定向 claim。未指定时运行 `node scripts/skills/queue-claim.js claim` 认领最早 1 篇，JSON 的 `claimed[]`（含 `path` 与 `claim_id`）即本轮对象；空队列则汇报“队列为空”并结束。每日兜底场景用 `claim --include-failed`（failed 排在 pending 之后、认领时 attempts 归零）。单轮至多 3 篇（每篇各 claim 一次）。
2. **规范化（Normalize）**：转成 Markdown、统一换行与编码；不改变原始语义。
3. **登记原始信源（Register Raw Source）**：写入 `raw/sources/<域>/YYYY-MM-DD-<slug>.md`（域取 ai/architecture/enterprise/products/research/misc）；二进制证据放 `raw/assets/{images,pdf,attachments}`。**只新增，不修改既有文件**。raw 信源页 = 登记 frontmatter + **原文全文**（结构见 `Source_Schema.md` 第 2 节）：全文取笔记 frontmatter `asset_ref` 指向的 `Assets/` 采集稿**逐字复制**——不得压缩、改写、节选，只允许换行/编码规范化；无 `asset_ref` 或采集稿缺失时，按 `source_url` 用 web-fetch 重抓原文全文收录，重抓失败则该篇 `fail` 并说明，**禁止用 Inbox 笔记的摘要/正文浓缩稿充当全文**。frontmatter 写 `asset_ref` 指回 Assets 原件；二进制原件不重复归档、仍只存 `Assets/`（附录 B 第 3、7 条）。
4. **分诊（Triage）**：只依据笔记标题、frontmatter、摘要与「核心要点」判断值得编译哪些页面类型，给出候选清单；**此阶段不读 Assets 原文**。候选从严：没有承重证据支撑的概念/实体不开页面，不为「完整」凑页。
5. **证据抽取（Evidence Extraction）**：**此时才读** `asset_ref` 指向的 Assets 原文（无 `asset_ref` 时读笔记正文），抽出承重性事实（数字、日期、人名、引语、规格、决策等）并绑定到 `raw/` 路径。长原件按分诊候选只精读相关章节、分段提炼，不通读全文。
6. **已有知识分析（Existing Knowledge Analysis）**：**绝对不得跳过**。逐项判断新增/印证/更新/矛盾/重复，并列出涉及的实体与概念。先检索已有 `wiki/` 页面，命中则**更新**而非新建。
7. **变更规划（Change Planning）**：列出将要新建/更新的页面，以及 index/log/manifest 的变更点。
8. **Wiki 编译（Wiki Compilation）**：按 `Wiki_Page_Schema.md` 与 `templates/<type>.md` 写页面；frontmatter 必填字段齐全；解读必须显式标注为「解读」；证据不足则写「未知」，绝不编造。只写分诊清单内、且证据抽取阶段拿到承重事实的页面——一个信源不强求多页，可长期维护的少量页面优于一次性大而全。
9. **交叉链接（Cross-Linking）**：建立 `related`/`depends-on`/`derived-from`/`contradicts`/`supersedes`/`part-of` 等关系；`[[链接]]` 必须指向真实存在的页面。
10. **索引更新（Index Update）**：把新页面写入 `wiki/index.md` 对应分组；archived 页面移出活跃索引。
11. **检查（Lint）**：执行 `node scripts/skills/wiki-lint.js`，修掉确定性错误后再收尾。
12. **记录日志（Log）**：向 `wiki/log.md` **追加**一行（格式见该文件说明），不得改写历史条目。随后逐篇收尾：成功者 `queue-claim.js done <path> --claim-id <id>`（用返回的 `Archive/` 路径回填 manifest 的 `inbox_ref`）；失败者 `queue-claim.js fail <path> --claim-id <id> --reason <简述>`（回退 pending，第 3 次转 failed），并在汇报中列出。
13. **汇报（Report）**：输出写入清单、更新项、需人工复核项（IM 精简，≤10 条）。

## 台账

在 `state/manifest.json` 的 `entries` 追加记录（含 `path`、`sha256`、`registered_at`、`inbox_ref`、`pages`，以及 `source_url`（规范化 URL，供采集层跨层去重）与 `asset_ref`（采集态原件路径）），供 lint 校验 raw 未被改动。

## 写入边界（严禁）

- **不得修改、删除、覆盖 `raw/` 中既有文件**；信源实质变更只能新增文件
- 不得把互不相关的信源合并成一个文件
- 同名概念命中时更新已有页面，不得近乎重复地新建
- 不删除任何 Wiki 页面（归档按 AGENTS.md 第 15 节，只移动不删除）
- 不创建指向不存在页面的链接

## 输出

- 新增/更新的页面路径清单（`wikilink` 可点击）
- `wiki/index.md` / `wiki/log.md` / `state/manifest.json` 的变更摘要
- 需人工复核项（矛盾裁决、概念合并、重大重构）

## 权限边界（Ingest 行）

| 能力 | 是否允许 |
|------|------|
| 读取 Raw | ✅ |
| 修改 Raw | ❌ |
| 创建 Wiki | ✅ |
| 修改 Wiki | ✅ |
| 修改 Index | ✅ |
| 修改 Log | ✅ |
| 语义判断 | ✅ |
| 删除知识 | ❌ |
| Archive | ✅（移动，不删除） |

完整边界表见 `AGENTS.md` 附录 A。
