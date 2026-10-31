---
id: 2026-10-31-weixin-album-arthas-usage
title: 公众号图文专辑《arthas使用》目录（奇点智慧小助手 · 7 篇）
source: 微信公众号
source_url: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg4MjE2Nzk0NQ==&action=getalbum&album_id=4743203736426643461&subscene=169
source_type: album
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - 课程
asset_ref: Assets/2026-10/weixin-album-4743203736426643461.md
wiki_status: pending
---

# 公众号图文专辑《arthas使用》目录（奇点智慧小助手 · 7 篇）

> 摘要：这是公众号「奇点智慧小助手」的图文专辑《arthas使用》，共 7 篇 Arthas 线上问题排查系列，按正序编号 1–7。**7 篇正文与链接已全部采集完成**（见文末清单）：专辑页本体是 JS 动态渲染、正文拿不到，但给专辑链接加 `&f=json` 会直接返回含全部条目 URL 的 JSON，据此逐篇抓取成功。

## 核心要点

- **这是专辑页，不是单篇文章**：链接是 `mp.weixin.qq.com/mp/appmsgalbum?...album_id=4743203736426643461`，属公众号图文专辑容器。专辑元信息：公众号「奇点智慧小助手」、`username: gh_98c67bd16f15`、`article_count: 7`、`is_reverse: 1`（倒序展示）、`read_count: 153`。
- **专辑共 7 篇，正序编号**：① Arthas 上手：从 attach 到第一个结论，6 个命令够用；② AI + Arthas 排查线上问题：4 个环节，AI 该在哪一步上手；③ CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读；④ watch、trace、tt：把方法看透的三件套；⑤ 改了代码没生效？先 jad 一下，再谈热更新；⑥ 一张火焰图，看懂慢在哪；⑦ 什么时候不该用 Arthas。
- **内容脉络**：1 → 7 是从「入门 attach + 6 个命令」到「知道什么时候不该用」的完整进阶线；中间 2–6 覆盖三类能力——AI 协作（②）、线程/CPU 维度（③⑥）、方法调用链维度（④⑤）。
- **拿目录的两种姿势**：专辑页本体三级降级全部只拿到壳（HTTP 层约 12 万字符全是 1px SVG 占位符，无标题无正文无链接；`--browser` 强制渲染仍过短；jina 兜底只给目录清单且条目链接被丢弃）。**真正有效的是给专辑 URL 加 `&f=json`**，直接返回 JSON：`getalbum_resp.article_list[]` 里每条含 `pos_num` / `msgid` / `title` / `create_time` / `key` / `url`，一条不缺。
- **7 篇正文已全部采集**：把 `f=json` 返回的 `url`（`http://` 换成 `https://`、去掉 `#rd`）逐条交给 `web-fetch`，browser 级全部成功，正文完整可读。各篇笔记见「附件」区。
- **一处原文与专辑口径不符**：第 7 篇收尾写「八篇的分工其实是一条线」，但专辑 `article_count` 为 7。系列自称八篇，可能另有一篇未收入本专辑（或其中一篇被并入了别篇）。
- **顺带信息**：用户发来的原始链接带 `scenenote=` 参数，其中嵌的是第 7 篇《什么时候不该用 Arthas》本身的链接（`mid=2247483866`），不是无关跳板。

## 正文

> 采集说明：专辑页为 JS 动态渲染，`web-fetch` 三级降级全部只拿到壳——HTTP 层 12 万字符但内容是一批 1px SVG 占位符（无标题、无正文、无链接）；加 `--browser` 强制渲染后仍过短，jina 兜底成功拿到目录清单（fetch_level: jina，2287 字符），但条目链接被丢弃。**正文与条目链接的突破靠的是 `&f=json` 接口**（结果存 `Assets/2026-10/weixin-album-json-probe.md`，5395 字符，含全部 7 条 URL）。另存了一份专辑页 HTTP 层原始输出 `Assets/2026-10/weixin-album-4743203736426643461-raw.md`（纯占位图，无信息量，留作失败证据）。

**目录清单（正序，编号来自 JSON 的 `pos_num`）**：

| # | 标题 | msgid | create_time | 笔记 |
|---|------|-------|-------------|------|
| 1 | Arthas 上手：从 attach 到第一个结论，6 个命令够用 | 2247483859 | 1792309257 | [[2026-10-31-arthas-01-attach-first-conclusion]] |
| 2 | AI + Arthas 排查线上问题：4 个环节，AI 该在哪一步上手 | 2247483860 | 1792406943 | [[2026-10-31-arthas-02-ai-arthas]] |
| 3 | CPU 打满、接口卡住、线程池耗尽：thread 命令怎么读 | 2247483861 | 1792505947 | [[2026-10-31-arthas-03-thread-command]] |
| 4 | watch、trace、tt：把方法看透的三件套 | 2247483862 | 1792589616 | [[2026-10-31-arthas-04-watch-trace-tt]] |
| 5 | 改了代码没生效？先 jad 一下，再谈热更新 | 2247483863 | 1792681767 | [[2026-10-31-arthas-05-jad-hot-reload]] |
| 6 | 一张火焰图，看懂慢在哪 | 2247483865 | 1792836068 | [[2026-10-31-arthas-06-flame-graph]] |
| 7 | 什么时候不该用 Arthas | 2247483866 | 1792911559 | [[2026-10-31-arthas-07-when-not-to-use]] |

（时间戳为秒级 Unix 时间，换算后约在 2026 年 10 月中下旬。专辑默认按倒序展示，上表按编号正序重排。）

**下一步建议**：7 篇正文已全部采集完毕，无需再补单篇链接。7 篇笔记均落 `wiki_status: pending`，等待异步 `/ingest` 摄入 Wiki。

## 来源

- 专辑页（已去追踪参数）：<https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg4MjE2Nzk0NQ==&action=getalbum&album_id=4743203736426643461&subscene=169>
- 条目清单来源（同一 URL 加 `&f=json`）：<https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg4MjE2Nzk0NQ==&action=getalbum&album_id=4743203736426643461&f=json>
- 用户原始链接另带 `scenenote=` 参数，其中嵌的是第 7 篇本身

## 附件

- [[Assets/2026-10/weixin-album-4743203736426643461.md]]（专辑页正文稿，jina 级）
- [[Assets/2026-10/weixin-album-json-probe.md]]（`&f=json` 接口返回的条目 JSON）
- [[Assets/2026-10/weixin-album-4743203736426643461-raw.md]]（专辑页 HTTP 层失败证据，纯 1px SVG 占位图）
- 系列 7 篇：[[2026-10-31-arthas-01-attach-first-conclusion]]、[[2026-10-31-arthas-02-ai-arthas]]、[[2026-10-31-arthas-03-thread-command]]、[[2026-10-31-arthas-04-watch-trace-tt]]、[[2026-10-31-arthas-05-jad-hot-reload]]、[[2026-10-31-arthas-06-flame-graph]]、[[2026-10-31-arthas-07-when-not-to-use]]
