---
id: 2026-10-31-weixin-album-system-thinking
title: 公众号图文专辑《系统思维》目录（Leo聊系统思维 · 6 篇）
source: 微信公众号
source_url: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzk2NDg1NzQ2NQ==&action=getalbum&album_id=4732715055413035015&subscene=169
source_type: album
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - 课程
asset_ref: Assets/2026-10/weixin-album-4732715055413035015-json.md
wiki_status: pending
---

# 公众号图文专辑《系统思维》目录（Leo聊系统思维 · 6 篇）

> 摘要：这是公众号「Leo聊系统思维」的图文专辑《系统思维》，共 6 篇，主题是系统架构设计与系统底层思维。6 篇的条目链接已全部拿到（靠专辑 URL 加 `&f=json`），但**正文尚未采集**——本次只落了专辑目录，单篇正文需要逐篇抓取，说一声就抓。

## 核心要点

- **这是专辑页，不是单篇文章**：链接是 `mp.weixin.qq.com/mp/appmsgalbum?...album_id=4732715055413035015`，属公众号图文专辑容器，页面本身不含正文。
- **专辑元信息**：公众号「Leo聊系统思维」（`username: gh_aaee8292b4d3`），专辑名《系统思维》，简介「系统架构设计，系统底层思维」，`article_count: 6`，`is_reverse: 1`（倒序展示），`read_count: 4813`，同标签下共 1868 篇内容。
- **专辑共 6 篇，正序编号**：① 架构最高的成本：不是技术选错，是同一个概念，大家理解不一致；② 同一个报文，一半是数据流，一半是控制流；③ 架构师必须具备的 8 个底层能力；④ 手把手教你如何做系统概念设计；⑤ 系统工程师必须掌握的架构概念关系图；⑥ 用不好 workbuddy 智能体？你需要掌握这三个管理工具。
- **内容脉络**：6 篇是一条"概念 → 能力 → 方法"的线——① 先立论（架构最大的成本是概念理解不一致），②③ 讲底层能力与思维框架，④⑤ 落到系统概念设计的具体方法与概念关系图，⑥ 是工具向的补充（WorkBuddy 智能体管理）。
- **条目链接这次一次就拿全了**：专辑页本体是 JS 动态渲染、HTTP 层只返回约 12 万字符的 1px SVG 占位符（无标题、无正文、无链接），但给专辑 URL 加 `&f=json` 后直接返回 JSON，`getalbum_resp.article_list[]` 里每条含 `pos_num` / `msgid` / `title` / `create_time` / `url`，6 条一条不缺（结果存 `Assets/2026-10/weixin-album-4732715055413035015-json.md`，4939 字符）。
- **正文尚未采集**：6 篇的正文需要把 `url`（`http://` 换 `https://`、去掉 `#rd`）逐条交给 `web-fetch` 抓取。本次只落了目录。
- **顺带信息**：用户发来的原始链接带 `scenenote=` 参数，解码后是第 3 篇《架构师必须具备的 8 个底层能力》本身的链接（`mid=2247483912`），不是无关跳板。

## 正文

> 采集说明：专辑页为 JS 动态渲染，HTTP 层直接返回约 12 万字符、内容全是 1px SVG 占位符（无标题、无正文、无链接）——因为字符数超过 800 阈值，脚本没有继续降级到浏览器/jina，直接以 http 级返回，**所以这个文件里没有任何目录信息**（存为 `Assets/2026-10/weixin-album-4732715055413035015.md`，留作失败证据）。真正有效的是同一 URL 加 `&f=json` 的接口，返回 4939 字符的 JSON，含全部 6 条条目 URL 与完整专辑元信息。

**目录清单（正序，编号来自 JSON 的 `pos_num`；链接已去 `#rd`、`http://` 换 `https://`）**：

| # | 标题 | msgid | create_time | 链接 |
|---|------|-------|-------------|------|
| 1 | 架构最高的成本：不是技术选错，是同一个概念，大家理解不一致 | 2247483871 | 1791675000 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247483871&idx=1&sn=6cbf4dd499608f1cd338ac26ae1a1a6d&chksm=c46c5ac9f31bd3df8c44da74f78580251f8001856104a59c88c7133075462c29ec1bad184300> |
| 2 | 同一个报文，一半是数据流，一半是控制流 | 2247483902 | 1791930600 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247483902&idx=1&sn=2acae563f7917c769d937ce31a2b2e3c&chksm=c46c5ae8f31bd3fe111089fda20d0901e51a42c6a95545d9acf64e2e6d8a9e2d28f175ed2c9f> |
| 3 | 架构师必须具备的 8 个底层能力 | 2247483912 | 1792364400 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247483912&idx=1&sn=a7aea77a98d098b78340384567fcc883&chksm=c46c591ef31bd0080b53063ccbaa274ee666a9b18dfdc79933ce6cd0db0381959eebcb9d46f8> |
| 4 | 手把手教你如何做系统概念设计 | 2247483942 | 1792537200 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247483942&idx=1&sn=cd1b761bf8cf7ac338cfde71747553b9&chksm=c46c5930f31bd0261ffa81c73718795eb1c2294af7ab938b3d9183e7205f2fafb71958b9b21b> |
| 5 | 系统工程师必须掌握的架构概念关系图 | 2247484017 | 1792794600 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247484017&idx=1&sn=e12e2a2f113c00ee1a67449f1764d067&chksm=c46c5967f31bd0710443d434fa4bb45dfeeb4d6309eaa5c420ccab4172fb17c9935dd0d29060> |
| 6 | 用不好 workbuddy 智能体？你需要掌握这三个管理工具 | 2247484036 | 1792908000 | <https://mp.weixin.qq.com/s?__biz=Mzk2NDg1NzQ2NQ==&mid=2247484036&idx=1&sn=4847913a39b975d248eab34473dbaea3&chksm=c46c5992f31bd0843a390729e98216c6844deef55f6589b2035292b33f8367ad2213fef71921> |

（时间戳为秒级 Unix 时间，换算后约在 2026 年 10 月中下旬。专辑默认按倒序展示，上表按编号正序重排。）

**下一步建议**：6 篇正文说一声就抓——每篇会落 1 个 Assets 原件 + 1 篇 Inbox 笔记（CLAUDE.md 限制单次任务写入不超过 3 个文件，所以整系列需要分批做）。

## 来源

- 专辑页（已去追踪参数）：<https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzk2NDg1NzQ2NQ==&action=getalbum&album_id=4732715055413035015&subscene=169>
- 条目清单来源（同一 URL 加 `&f=json`）：<https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzk2NDg1NzQ2NQ==&action=getalbum&album_id=4732715055413035015&f=json>
- 用户原始链接另带 `scenenote=` 参数，其中嵌的是第 3 篇本身

## 附件

- [[Assets/2026-10/weixin-album-4732715055413035015-json.md]]（`&f=json` 接口返回的条目 JSON，含全部 6 条 URL）
- [[Assets/2026-10/weixin-album-4732715055413035015.md]]（专辑页 HTTP 层失败证据，约 12 万字符纯 1px SVG 占位符，无信息量）
