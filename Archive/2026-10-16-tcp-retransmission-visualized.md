---
id: 2026-10-16-tcp-retransmission-visualized
title: 可视化 TCP 重传：终于有人将 TCP 传输讲明白了
source: 微信公众号（码农有道 coding）
source_url: https://mp.weixin.qq.com/s/DFUJU3mU2h4Znm7XvvqxLA
source_type: article
platform: mp.weixin.qq.com
created: 2026-10-16
category: 技术
tags: [分布式系统, 课程]
asset_ref: Assets/2026/10/tcp-retransmission-visualized.md
wiki_status: ingested
---

# 可视化 TCP 重传：终于有人将 TCP 传输讲明白了

> 图解 TCP 可靠传输四件套：MSS 分段（以太网 MTU 1500 − IP/TCP 头各 20 = 1460，三次握手协商 SMSS/RMSS，避免 IP 层分片）；超时重传以字节序列号编号（32 位回绕），时间戳选项解决回绕后新旧段歧义；快速重传规定接收方对乱序段反复回同一 ACK、发送方连续收到 3 个重复 ACK 即不等超时立即重传；SACK 选项携带非连续已收区间，让发送方只重传真正丢失的段。

## 核心要点

- **MSS=1460**：MTU 1500 减 IP/TCP 头部各 20；SYN/SYN-ACK 选项里协商收发双方 MSS，目标是满载且不触发 IP 分片。
- **超时重传 + 序列号**：每段按字节流编号独立计时，丢失只重传该段；32 位序号会回绕。
- **时间戳消歧**：新段时间戳必大于旧段（B>E），B≤E 判定为重传旧包，解决序号回绕歧义。
- **快速重传**：接收方收到乱序数据始终 ACK 同一个期望序号；发送方收齐 3 个重复 ACK 立即重传，跳过超时等待。
- **SACK**：ACK 选项额外声明已收到的区间（如 2872–3393），发送方精确补发缺口，避免重复发送。

## 正文

完整正文（含各机制图解流程的文字还原）见采集态原件：[[Assets/2026/10/tcp-retransmission-visualized.md]]

## 来源

- [可视化 TCP 重传！终于有人将 TCP 传输讲明白了 · 微信公众号](https://mp.weixin.qq.com/s/DFUJU3mU2h4Znm7XvvqxLA)

## 附件

- [[Assets/2026/10/tcp-retransmission-visualized.md]]（web-fetch 抓取正文，约 12,052 字符，fetch_level=browser；已去除追踪像素、空白 SVG 占位与文末推广内容；原文配图未随抓取获得）
