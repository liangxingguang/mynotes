---
name: web-fetch
description: 抓取网页正文并输出 Markdown。HTTP 直取优先；当正文过短或页面为 SPA 时自动启用无头浏览器渲染后再抽取。用于收到链接类消息需要保存网页内容时。
---

## 用法
node scripts/skills/web-fetch.js <url> [输出.md]

## 策略
1. HTTP GET + Readability 抽正文 + Turndown 转 Markdown
2. 正文 < 800 字符（或判定为 SPA）→ Playwright Chromium 渲染（networkidle）后重试
3. 仍失败 → 由调用方降级使用 jina-reader MCP

## 输出
JSON：{ url, title, markdown_path, fetch_level(http|browser), chars, status }
status: ok | timeout | blocked | failed

## 安全
- 只抓传入的 URL，禁止 file://、localhost 与内网地址
- 超时 30s 强制中断并关闭浏览器
- 不加载图片/字体
