---
id: 2026-10-28-tcp-connection-full-lifecycle
title: 从SYN到FIN：一个TCP连接的完整过程是怎样的？
source: 微信公众号·dbaplus社群（原作者：知乎用户琳）
source_url: https://mp.weixin.qq.com/s/oU6Zmnh0j3VmBw6DzYbYRQ
source_type: 文章
platform: 微信公众号
created: 2026-10-28
category: 技术
tags: [计算机网络, 工程实践]
asset_ref: Assets/2026/10/tcp-connection-full-lifecycle.md
wiki_status: pending
---

# 从SYN到FIN：一个TCP连接的完整过程

> 跳出"三次握手四次挥手"八股，跟一个 TCP 连接从生到死走一遍：四大核心功能、握手挥手细节、RTO/快重传/滑动窗口/拥塞控制、状态机排障四场景与 Wireshark 实战。

## 核心要点

- **四大功能**：可靠交付（序列号+ACK+重传）、有序（缓冲区重组）、流量控制（rwnd 端到端）、拥塞控制（cwnd 全局）；发送窗口 = min(rwnd, cwnd)。
- **三次握手为何三次**：防失效 SYN 建多余连接 + 双方确认收发能力的最小次数；SYN/FIN 各耗一个序列号。
- **重传**：RTO = SRTT + 4×RTTVAR 动态算；3 个重复 ACK 触发快重传进快恢复（cwnd 不降 1），超时重传惩罚重（cwnd 归 1 重新慢启动）。
- **拥塞控制**：慢启动指数增 → ssthresh 后线性 AIMD；Linux 默认 CUBIC；`ss -ti` 看连接 RTT/RTO/cwnd。
- **TIME_WAIT 2MSL**：保最后一个 ACK 可达 + 旧报文消失；Linux 约 1 分钟。TIME_WAIT 多通常无碍，CLOSE_WAIT 多一定是应用 bug（没 close）。
- **状态机排障**：CLOSE_WAIT 堆积=应用没关连接；SYN_RECV 堆积=SYN 洪水；FIN_WAIT_2 堆积=对方 bug 或宕机；tcp_tw_recycle 已从 Linux 4.12 移除。
- **Wireshark**：`tcp.flags.syn==1` 过滤握手、`tcp.analysis.retransmission` 找重传。

## 正文

见 [[Assets/2026/10/tcp-connection-full-lifecycle.md|抓取正文]]，含 Jacobson 算法、快恢复步骤、四场景排查命令。

## 来源

- [从SYN到FIN：一个TCP连接的完整过程是怎样的？](https://mp.weixin.qq.com/s/oU6Zmnh0j3VmBw6DzYbYRQ)（微信公众号·dbaplus社群）

## 附件

- [[Assets/2026/10/tcp-connection-full-lifecycle.md]]
