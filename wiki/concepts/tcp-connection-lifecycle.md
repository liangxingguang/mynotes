---
id: wiki-concept-tcp-connection-lifecycle
type: concept
title: TCP 连接生命周期与状态机
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - tcp
  - networking
sources:
  - raw/sources/architecture/2026-10-28-tcp-connection-full-lifecycle.md
related:
  - wiki/sources/tcp-retransmission-visualized.md
  - wiki/sources/tcp-connection-full-lifecycle.md
  - wiki/concepts/netty-flow-control.md
  - wiki/concepts/netty-reconnect.md
---
# TCP 连接生命周期与状态机

## Definition（定义）

TCP 连接生命周期指一个 TCP 连接从建立到关闭的完整过程，涵盖三大阶段（建立→传输→关闭）和十余个状态转换。核心机制包括四次功能保障（可靠交付、有序、流量控制、拥塞控制）、三次握手建连、四次挥手断连，以及基于有限状态机（FSM）的排障方法论。

## Why It Matters（为什么重要）

理解 TCP 连接生命周期是从"背八股"到"看全局"的升级：状态机让你从"记步骤"变为"看异常状态立刻知道卡在哪"。CLOSE_WAIT 堆积意味着应用没关连接，SYN_RECV 堆积意味着 SYN 洪水攻击——每个状态都有明确的工程含义。

## Core Characteristics（核心特征）

1. **四大功能保障**：可靠交付（序列号+ACK+重传）、有序性（缓冲区重组）、流量控制（rwnd 端到端）、拥塞控制（cwnd 全局）。发送窗口 = min(rwnd, cwnd)。
2. **三次握手**：客户端 SYN → 服务器 SYN+ACK → 客户端 ACK。三次是"各发一个 SYN、各收一个 ACK"的最小次数，同时防止失效 SYN 建多余连接。SYN 和 FIN 各消耗一个序列号。
3. **四次挥手**：全双工两个方向分别关闭，ACK 和 FIN 不能合并（服务器收到 FIN 时可能还有数据没发完）。客户端 FIN → FIN_WAIT_1；服务器 ACK → FIN_WAIT_2/CLOSE_WAIT；服务器 FIN → LAST_ACK；客户端 ACK → TIME_WAIT。
4. **TIME_WAIT 2MSL**：保证最后一个 ACK 能到达（丢了服务器会重发 FIN）+ 让旧报文在网络中消失（防同四元组新连接误收）。Linux 约 1 分钟。
5. **RTO 动态计算**：Jacobson 算法，SRTT = (1-α)×SRTT + α×RTT_sample（α=1/8），RTTVAR = (1-β)×RTTVAR + β×|SRTT-RTT_sample|（β=1/4），RTO = SRTT + 4×RTTVAR。
6. **快重传与快恢复**：3 个重复 ACK 触发快重传，进快恢复（ssthresh=cwnd/2，cwnd=ssthresh+3，每重复 ACK cwnd+1，新 ACK 后 cwnd=ssthresh 进拥塞避免），而非超时重传的 cwnd 归 1 重新慢启动。
7. **拥塞控制四算法**：慢启动（指数增长）→ 拥塞避免（线性 AIMD）→ 快重传 → 快恢复。Linux 默认 CUBIC（RFC 8312），三次曲线在高带宽长延迟网络优于经典 Reno。
8. **状态机排障**：CLOSE_WAIT 堆积=应用没 close()；SYN_RECV 堆积=SYN 洪水；FIN_WAIT_2 堆积=对方 bug 或宕机；TIME_WAIT 过多通常无碍。

## Structure（结构）

TCP 连接状态机（核心路径）：

```
LISTEN → SYN_SENT → SYN_RCVD → ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED
                                    ↓              ↓              ↑
                              (数据传输)    CLOSE_WAIT → LAST_ACK → CLOSED
```

三大阶段：
- **建立**：LISTEN → SYN_SENT → SYN_RCVD → ESTABLISHED（三次握手）
- **传输**：ESTABLISHED 状态下的可靠数据传输（序列号+ACK+窗口+重传）
- **关闭**：ESTABLISHED → FIN_WAIT_1/CLOSE_WAIT → FIN_WAIT_2/LAST_ACK → TIME_WAIT → CLOSED（四次挥手）

## How It Works（运作方式）

**建连**：客户端发送 SYN（seq=x）→ 服务器回复 SYN+ACK（seq=y, ack=x+1）→ 客户端发送 ACK（seq=x+1, ack=y+1）。第三次 ACK 可携带数据（HTTP/2 连接前言即在此发送）。

**数据传输**：发送窗口 = min(rwnd, cwnd)。rwnd 由接收方通过 ACK Window 字段告知；cwnd 由拥塞控制算法动态调整。超时重传惩罚重（ssthresh 降半、cwnd 归 1）；快重传惩罚轻（进快恢复，cwnd 不归 1）。

**断连**：主动关闭方发 FIN → FIN_WAIT_1；被动关闭方回 ACK → 主动方 FIN_WAIT_2、被动方 CLOSE_WAIT；被动方发完数据后发 FIN → LAST_ACK；主动方回 ACK → TIME_WAIT，等 2MSL 后 CLOSED。

**排障**：`ss -ant | awk '{print $1}' | sort | uniq -c` 查看各状态连接数；`ss -ti dst <ip>` 查看 RTT/RTO/cwnd；`tcp_tw_recycle` 已在 Linux 4.12 移除。

## Relationships（关系）

### Related Concepts（相关概念）

- [[netty-flow-control]]：Netty 的高/低水位背压机制是 TCP rwnd/cwnd 在应用层的对应物
- [[netty-reconnect]]：Netty 断线重连机制建立在 TCP 状态机之上
- [[tcp-retransmission-visualized]]：TCP 重传的可视化分析（信源页）

### Distinctions（区分）

- 与 UDP 的区别：TCP 在不可靠 IP 上通过序列号/确认/重传/窗口模拟"可靠管道"；UDP 只是薄封装（端口+校验和）
- 流量控制 vs 拥塞控制：rwnd 是端到端的（怕接收方扛不住），cwnd 是全局的（怕网络扛不住）

## Evolution（演进）

- 1981 — RFC 793 定义 TCP 基础（序列号+确认+重传+窗口）
- RFC 5681 — 拥塞控制经典算法（TCP Reno）
- RFC 8312 — CUBIC 成为 Linux 默认拥塞控制算法
- Linux 4.12 — 移除 tcp_tw_recycle（NAT 环境下导致连接失败）

## Open Questions（开放问题）

- TCP Fast Open (TFO) 的实际部署比例与兼容性问题：未知
- MPTCP（多路径 TCP）的应用场景与生态成熟度：未知
- CUBIC 在 QUIC 时代的替代方案：QUIC 使用自有拥塞控制，TCP CUBIC 的适用边界需重新评估

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-28-tcp-connection-full-lifecycle.md`（知乎用户琳，经 dbaplus 社群转载，一手技术长文，confidence=high）

## Related Knowledge（相关知识）

- [[tcp-connection-full-lifecycle|从SYN到FIN：一个TCP连接的完整过程]]
- [[tcp-retransmission-visualized|可视化 TCP 重传]]
- [[netty-flow-control|Netty 流量控制]]
- [[netty-reconnect|Netty 断线重连]]
