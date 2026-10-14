---
name: index-rebuild
description: 重建 Index/index.json（检索与统计数据源），并统计标签写回 Index/tags.json 的 count。每次写入笔记后调用，可重复执行（全量、幂等）。
---

## 用法
node scripts/skills/index-rebuild.js

## 行为
- 扫描 Inbox/ 与 Archive/ 下所有 .md，解析 frontmatter 生成索引
- 采用「写临时文件 + 原子 rename」，并发安全
- 同时更新 tags.json 中各标签的 count 与 updated_at

## 输出
JSON：{ ok, notes, tags, elapsed_ms }
