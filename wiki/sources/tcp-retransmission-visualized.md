---
id: wiki-source-tcp-retransmission-visualized
type: source
title: 可视化 TCP 重传：终于有人将 TCP 传输讲明白了
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - networking
  - tcp
sources:
  - raw/sources/architecture/2026-10-16-tcp-retransmission-visualized.md
related:
  - wiki/sources/distributed-systems-introduction.md
---
# 可视化 TCP 重传：终于有人将 TCP 传输讲明白了

## Overview（概览）

公众号「码农有道 coding」图解 TCP 可靠传输四件套：MSS 分段、超时重传与时间戳消歧、快速重传、SACK 选择性确认。原文为可视化配图讲解（抓取稿无图，文字还原完整）。

## Key Facts（关键事实）

- MSS = MTU 1500 − IP 头 20 − TCP 头 20 = 1460 字节（纯数据）；三次握手经 SYN/SYN-ACK 选项协商 SMSS/RMSS；目标是满载且避免 IP 层分片（分片耗资源）。
- 序列号按字节流编号（32 位无符号，0~2³²−1 回绕）；每段独立计时，丢失只重传该段（相对停等协议的优化）。
- 序号回绕歧义用时间戳选项解决：新段时间戳 B 必大于上一正常包时间戳 E，B ≤ E 判定为迟到的旧重传（PAWS 思路）。
- 快速重传：接收方对乱序段反复回同一期望序号 ACK；发送方连续收到 3 个重复 ACK 立即重传，不等超时。遗留问题：发送方不确定后续段是否已收，由此引出 SACK。
- SACK：ACK 选项声明非连续已收区间（如 2872–3393），发送方只补发真正缺口。

## Important Claims（重要论断）

### Claim 1：TCP 可靠传输是四层递进的机制栈

MSS 避免分片 → 超时重传兜底 → 快速重传免等超时 → SACK 精确补发，每层解决上层的效率遗留问题（信源叙述结构）。

## Concepts Introduced（引入的概念）

- 快速重传（3 重复 ACK）与 SACK 的递进关系
- PAWS（时间戳防序号回绕，文中以"思路"提及）

## Entities Mentioned（提及的实体）

（无）

## Implications（影响／启示）

可与 [[distributed-systems-introduction|分布式系统概述]] 中"TCP 只给可靠流幻觉"的论断对照阅读：本信源讲 TCP 在传输层做了什么，彼文讲应用层为什么不能依赖它（解读）。

## Limitations（局限）

- 教学图解文，无抓包实验数据；原文配图未随抓取获得，部分细节依赖文字还原。

## Related Knowledge（相关知识）

- [[distributed-systems-introduction|第一章：分布式系统概述（codedump 教程）]]

## Source（信源）

- `raw/sources/architecture/2026-10-16-tcp-retransmission-visualized.md`
