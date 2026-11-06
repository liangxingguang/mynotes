---
id: wiki-concept-nginx-gateway-production-design
type: concept
title: 生产级 Nginx 网关设计
status: active
created: 2026-11-05
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - nginx
  - gateway
  - infrastructure
sources:
  - raw/sources/architecture/2026-11-04-nginx-gateway-production.md
  - raw/sources/architecture/2026-11-06-nginx-rate-limiting-practice.md
related:
  - wiki/sources/nginx-gateway-production.md
  - wiki/sources/nginx-websocket-load-balancing.md
  - wiki/concepts/nginx-rate-limiting.md
  - wiki/concepts/harness-engineering.md
---
# 生产级 Nginx 网关设计

## Definition（定义）

以「生产网关」标准而非「反向代理」标准设计 Nginx：不只是把请求转发到后端，而是作为统一流量入口，承担路由、TLS 终止、限流、鉴权前置、灰度、可观测职责，并以配置即代码、灰度变更、可回滚为运行约束。核心理念：生产事故的根因通常不是配置写错，而是默认值、日志、容量、变更流程没按生产标准设计。

## Why It Matters（为什么重要）

Nginx 的默认配置追求「任何场景都能跑起来」，不是「任何场景都能扛住」。四个危险默认值（`worker_connections 1024`、`proxy_read_timeout 60s`、`client_max_body_size 1m`、`proxy_buffer_size 4k`）分别对应连接数打满、慢接口拖死、上传失败、大 Cookie 502。理解每个默认值对应的故障现象，调参才有依据。

## Core Characteristics（核心特征）

1. **机制优先于配置**：先把六个核心机制搞明白（进程模型与连接数上限、reload 做了什么、upstream keepalive 与连接复用、超时四件套语义、缓冲何时该关、变量与阶段），后面所有配置都是它们的推论。
2. **默认值不可信**：每个关键参数都要对照其对应的故障现象理解，而不是抄一份「最佳实践」。
3. **变更流程 > 配置本身**：配置进 Git、CI 跑 `nginx -t`、双机灰度 reload、带时间戳备份、回滚脚本演练过——五件事做到，即使配置写错，影响也能控制在单台、几分钟内。
4. **可观测做在前面**：结构化日志（`$request_time`/`$upstream_response_time`/`$upstream_addr`/`$upstream_status`）+ stub_status 四数字构成排查最小信息集。没有这些，出故障只能猜。
5. **超时按接口分级**：不搞全局一套超时。普通 API 10s、报表 180s、上传 300s、SSE 3600s——超时需求由接口类型决定。
6. **限流先观测再拦截**：`limit_req_dry_run on` 观察 24h 的 excess 再定 burst，避免误伤正常用户或拦不住攻击。落地链路四步（第二信源）：看 access.log 辨攻击特征 → limit_req 限平均速率 → limit_conn 控并发+白名单 → 压测验证灰度收紧；细节见 [[nginx-rate-limiting]]。

## Structure（结构）

五层配置拆分，每层职责单一：

```
/etc/nginx/
├── nginx.conf           # 全局：进程、事件、日志格式、include
├── conf.d/              # 上游集群定义、变量映射、限流 zone、TLS 全局参数
├── sites/               # 每个域名一个文件 + _default.conf 兜底拒绝
├── snippets/            # 通用 proxy 头、安全响应头、静态缓存策略
└── certs/               # 证书目录（权限 600，属主 root）
```

## How It Works（运作方式）

### 连接数上限

反代场景：`worker_processes × worker_connections / 2`（客户端侧 + upstream 侧各占一条）。文件描述符三层都要改：系统级 `fs.file-max`、systemd `LimitNOFILE`、Nginx `worker_rlimit_nofile`。

### reload 语义

master 收 HUP → 校验配置 → 启新 worker → 旧 worker 优雅退出。reload 期间内存短暂翻倍；配置错误时 reload 失败但服务不中断（继续用旧配置）。「reload 没报错」≠「新配置生效」，必须验证 worker 启动时间和特征值。

### upstream keepalive

`keepalive_timeout` 必须小于后端空闲超时（如 Tomcat 20s 则 Nginx 设 12s）。`proxy_next_upstream` 默认只含 error/timeout，不含 http_5xx，后端 500 不计入 `max_fails`。

### 超时四件套

`proxy_connect_timeout`（TCP 握手）、`proxy_send_timeout`（两次写间隔）、`proxy_read_timeout`（两次读间隔）。send/read 计的是 IO 间隔而非总时长——大文件持续传输不会超时，但后端 90 秒才返回首字节、`proxy_read_timeout 60s` 一定超时。

### 缓冲开关

`proxy_buffer_size` 太小是 502 高频原因（大 Cookie/JWT 响应头超 4k）。SSE/大文件下载/流式响应必须关 `proxy_buffering`，否则客户端等到缓冲区满才收到数据。

## Relationships（关系）

### Related Concepts（相关概念）

- [[harness-engineering]]：Harness 工程能力是模型之外的竞争力，Nginx 网关的生产化设计同理——机制理解 + 变更流程 + 可观测 > 配置本身。
- [[nginx-gateway-production-design]] 与 [[nginx-websocket-load-balancing]]、[[nginx-websocket-million-connections]] 互补：本文是通用网关框架，另两篇是 WebSocket 专项。

### Dependencies（依赖项）

- 内核参数（`somaxconn`、`ip_local_port_range`、`tcp_tw_reuse` 等）是连接数和吞吐的硬约束。
- 文件描述符三层配置（系统级/systemd/Nginx）缺一不可。
- 上游后端的连接池大小和空闲超时决定 Nginx 侧 keepalive 参数的合理值。

### Distinctions（区分）

- **网关 vs 反向代理**：网关是统一入口（路由/TLS/限流/鉴权前置/灰度/可观测），配置即代码、灰度变更、可回滚；反向代理只管转发，手工改完 reload。
- **开源版 vs Nginx Plus**：开源版只有被动健康检查（请求失败才计数），无主动探测、无 active health check、无 keyval/API 动态配置。
- **Nginx 网关 vs K8s Ingress**：K8s 内已用 ingress-nginx/Higress/APISIX 且覆盖需求时，前面再加一层 Nginx 只会增加一跳和配置负担。

## Evolution（演进）

- 1.29.7 起 `proxy_http_version` 默认 1.1，upstream keepalive 默认开启——老文章里「必须手写 `proxy_http_version 1.1` 和 `proxy_set_header Connection ""`」在 1.30 上不是必需项，但显式写出仍更安全（环境未必是 1.30）。
- 1.25.1 起 `listen ... http2` 废弃，改用独立 `http2 on` 指令。
- 1.29.3+ 引入 `add_header_inherit merge`，解决 location 里 `add_header` 覆盖父级全部 `add_header` 的继承陷阱。
- 1.29.6+ 引入 `sticky` 指令（cookie 会话保持），比 `ip_hash` 准确。
- 1.27.3+ 支持 `resolve` 参数动态解析后端地址（需配 resolver + zone）。
- 1.30.1/1.30.2 修复 rewrite 堆溢出 CVE（标注可能任意代码执行）；1.30.6 修复 `alias`+`rewrite` 缓冲区溢出。

## Open Questions（开放问题）

- HTTP/3 在「后端与网关之间是内网 HTTP/1.1」的场景下收益有限，但具体量化收益需实测。
- `sticky` 指令跨版本兼容性需在实际构建上验证（1.29.6+ 引入，不同发行版打包可能有差异）。
- 镜像流量（`mirror`）对新版本的真实影响（数据库写入、消息发送重复执行）需以影子模式运行验证。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-04-nginx-gateway-production.md`（机制优先于配置、变更流程、版本要点）
- Source: `raw/sources/architecture/2026-11-06-nginx-rate-limiting-practice.md`（限流四步链路互证）

## Related Knowledge（相关知识）

- [[nginx-gateway-production|从部署到上线：搭建生产可用的 Nginx 网关（信源页）]]
- [[nginx-rate-limiting|Nginx 限流（limit_req / limit_conn）]]
- [[nginx-websocket-load-balancing|Nginx WebSocket 负载均衡（信源页）]]
- [[nginx-websocket-million-connections|Nginx WebSocket 百万连接（信源页）]]
- [[harness-engineering|Harness 工程能力（概念页）]]
