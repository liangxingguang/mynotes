---
id: wiki-source-tcp-connection-full-lifecycle
type: source
title: 从SYN到FIN：一个TCP连接的完整过程是怎样的？
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - source
  - tcp
  - networking
sources:
  - raw/sources/architecture/2026-10-28-tcp-connection-full-lifecycle.md
related:
  - wiki/sources/tcp-retransmission-visualized.md
  - wiki/concepts/tcp-connection-lifecycle.md
---
# 从SYN到FIN：一个TCP连接的完整过程是怎样的？

## Overview（概览）

以一个 TCP 连接从生到死的完整故事线，串联四大核心功能、三次握手/四次挥手细节、RTO/快重传/滑动窗口/拥塞控制、状态机排障四场景与 Wireshark 实战。出自知乎用户琳，经 dbaplus 社群转载。

## Key Facts（关键事实）

- TCP 四大核心功能：可靠交付（序列号+ACK+重传）、有序性（缓冲区重组）、流量控制（rwnd 端到端）、拥塞控制（cwnd 全局）；发送窗口 = min(rwnd, cwnd)。
- 三次握手为何三次：防止失效 SYN 建多余连接 + 双方确认收发能力的最小次数；SYN/FIN 各耗一个序列号。
- 超时重传 RTO 按 Jacobson 算法动态计算：SRTT + 4×RTTVAR；超时惩罚重（ssthresh 降半、cwnd 归 1 重新慢启动）。
- 快速重传：3 个重复 ACK 触发，进快恢复（cwnd 不归 1）；Linux 默认拥塞控制算法为 CUBIC（RFC 8312）。
- TIME_WAIT 等 2MSL：保最后一个 ACK 可达 + 旧报文消失；Linux 约 1 分钟。CLOSE_WAIT 堆积一定是应用 bug（没 close）。
- 状态机排障四场景：CLOSE_WAIT（应用没关）、SYN_RECV（SYN 洪水）、FIN_WAIT_2（对方 bug/宕机）、TIME_WAIT（通常无碍）。
- tcp_tw_recycle 已从 Linux 4.12 移除。

## Important Claims（重要论断）

### Claim 1：TCP 的核心不是"握手挥手"，而是"在不可靠 IP 上构建可靠管道"

文章跳出八股式记忆，把 TCP 定位为"序列号 + 确认 + 重传 + 窗口"四大机制的组合，回答"如何在不可靠网络上构建可靠服务"。握手挥手只是手段，核心目标是可靠交付、有序、流量控制、拥塞控制四件事。

### Claim 2：流量控制是端到端的，拥塞控制是全局的——两者机制不同

rwnd（接收窗口）由接收方通过 ACK 的 Window 字段告知，是端到端的；cwnd（拥塞窗口）由发送方根据网络反馈动态调整，是全局的。实际发送窗口取两者最小值。

### Claim 3：TIME_WAIT 多通常不是问题，CLOSE_WAIT 多一定是应用 bug

文章明确区分两者：TIME_WAIT 是主动关闭方的正常状态，高并发短连接下几万个 TIME_WAIT 常见，可用 tcp_tw_reuse 优化；CLOSE_WAIT 是被动关闭方收到 FIN 回了 ACK 但没 close()，堆积说明应用层连接泄漏。

## Concepts Introduced（引入的概念）

- [[tcp-connection-lifecycle]]（新建概念页：TCP 连接生命周期与状态机）

## Entities Mentioned（提及的实体）

- Jacobson 算法（RTO 动态计算）
- CUBIC（Linux 默认拥塞控制算法，RFC 8312）
- Wireshark（抓包分析工具）

## Implications（影响／启示）

本文为 TCP 协议提供了从原理到排障的完整闭环：不仅讲"三次握手四次挥手"的步骤，更讲"为什么"（防止失效连接、双方能力确认、全双工关闭），并给出状态机排障四场景的实战命令。与已有 [[tcp-retransmission-visualized]] 互补——后者侧重重传可视化，本文侧重全生命周期。

## Limitations（局限）

- 文章为科普性质，部分机制（如 CUBIC 三次曲线细节、SACK 选项）未展开。
- Wireshark 实战部分基于单次 curl 抓包，未覆盖复杂网络场景。
- 未涉及 TCP Fast Open (TFO)、MPTCP 等扩展协议。

## Related Knowledge（相关知识）

- [[tcp-retransmission-visualized|可视化 TCP 重传]]
- [[tcp-connection-lifecycle]]
- [[netty-flow-control|Netty 流量控制]]
- [[netty-reconnect|Netty 断线重连]]

## Source（信源）

- `raw/sources/architecture/2026-10-28-tcp-connection-full-lifecycle.md`
