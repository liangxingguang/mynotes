---
id: wiki-source-nginx-gateway-production
type: source
title: 从部署到上线：搭建生产可用的 Nginx 网关（微信公众号）
status: active
created: 2026-11-05
updated: 2026-11-05
confidence: high
tags:
  - source
  - nginx
  - gateway
  - infrastructure
sources:
  - raw/sources/architecture/2026-11-04-nginx-gateway-production.md
related:
  - wiki/sources/nginx-websocket-load-balancing.md
  - wiki/sources/nginx-websocket-million-connections.md
---
# 从部署到上线：搭建生产可用的 Nginx 网关（微信公众号）

## Overview（概览）

一篇按「生产网关」而非「反向代理」标准写的 Nginx 长文（21 章），环境为 Rocky Linux 9.4 + Nginx 1.30.6 + 双机 Keepalived VIP。核心主张：生产事故几乎都不是配置写错，而是默认值、日志、容量、变更流程没按生产标准设计。给出从环境准备、安装锁版本、配置骨架、upstream/TLS/限流/灰度、可观测到上线演练与故障排查的完整路径。

## Key Facts（关键事实）

- **四个危险默认值**：`worker_connections 1024`（连接打满）、`proxy_read_timeout 60s`（慢接口拖死）、`client_max_body_size 1m`（上传失败）、`proxy_buffer_size 4k`（大 Cookie 响应头超限 502）。每个参数对应一个具体故障现象，调参要有依据。
- **连接数上限公式**：反代场景 ≈ `worker_processes × worker_connections / 2`（客户端侧 + upstream 侧各占一条连接）；纯静态服务不除 2。文件描述符三层都要改：系统级 `fs.file-max`、systemd `LimitNOFILE`、Nginx `worker_rlimit_nofile`。
- **reload 机制**：master 收 HUP → 校验配置 → 启新 worker → 旧 worker 优雅退出（停止接受新连接，处理完手上请求再退）。reload 期间内存短暂翻倍；配置错误时 reload 失败但服务不中断（继续用旧配置跑），但「reload 没报错」≠「新配置生效」，必须验证 worker 启动时间和特征值。
- **upstream keepalive 经典坑**：`keepalive_timeout` 必须小于后端空闲超时（如 Tomcat 20s 则 Nginx 设 12s），否则拿到已关闭连接发请求 → `upstream prematurely closed connection`。`proxy_next_upstream` 默认只含 error 和 timeout，不含 http_5xx，后端 500 不会被计入 `max_fails`。
- **超时四件套语义**：`proxy_connect_timeout`（TCP 握手）、`proxy_send_timeout`（两次写间隔）、`proxy_read_timeout`（两次读间隔）、`client_*` 系列管 Nginx↔客户端。send/read 计的是**两次 IO 间隔**而非总时长——大文件持续传输不会超时，但后端 90 秒才返回首字节、`proxy_read_timeout 60s` 一定超时。
- **超时按接口分级**：普通 API 10s、报表 180s、上传 300s、SSE 3600s。SSE/大文件下载必须关 `proxy_buffering`；上传用 `proxy_request_buffering off`（一旦开始转发即不可重试）。
- **upstream zone 必开**：不开则每个 worker 各自计数失败，`max_fails=3` 实际要失败 3×worker 数才摘除节点。开源版只有被动健康检查，无主动探测。
- **TLS**：TLSv1.2/1.3；`ssl_session_cache shared:SSL:50m`（1MB≈4000 会话，50m≈20 万）；OCSP stapling 需配 resolver 与 `ssl_trusted_certificate`；HSTS 必须分步上线（300s→86400→一年），`preload` 不可逆。双证书（RSA+ECDSA）Nginx 自动按客户端套件选择。
- **HTTP/2**：1.25.1 起 `listen ... http2` 废弃，改用独立 `http2 on` 指令。HTTP/3 需 UDP 443 放通 + L4 LB 转发 UDP + `Alt-Svc` 头 `always`。
- **限流先观测再拦截**：`limit_req_dry_run on` 观察 24h 的 excess 再定 burst；分层限流（IP + 域名 + 登录接口 5r/m）；429 响应带 `Retry-After`；后端整体不可用时 `error_page` 返回静态兜底。
- **可观测最小信息集**：结构化日志的 `$request_time`、`$upstream_response_time`、`$upstream_addr`、`$upstream_status` + stub_status 四数字（active/accepts/handled/requests）。`requests/handled` 接近 1 说明 keepalive 没生效。stub_status 无状态码维度，5xx 告警要靠日志侧。
- **变更流程五件事**：配置进 Git、CI 跑 `nginx -t`（容器内跑以暴露路径问题）、双机灰度 reload（先一台观察 10 分钟）、带时间戳备份目录、回滚脚本演练过且 1 分钟内可回。
- **故障排查决策表**：502 分四种文案（111 拒绝/110 超时/prematurely closed/too big header）；504 看 `$upstream_response_time` 是否恰好等于超时阈值；499 突增是用户等不及（修后端不修 Nginx）；413 注意前置 LB 也有 body 限制。
- **版本要点**：1.30 stable（源自 1.29 主线，2026-04 宣告）；1.29.7 起 `proxy_http_version` 默认 1.1 且 upstream keepalive 默认开启；1.30.1/1.30.2 修复的两个 rewrite 堆溢出 CVE 被标注可能任意代码执行；1.30.6 修复 `alias`+`rewrite` 缓冲区溢出（CVE-2026-15176）。1.28.x 且对外暴露的网关应最优先升级。
- **五层配置拆分**：`nginx.conf`（全局）→ `conf.d/`（upstreams/maps/limits/tls）→ `sites/`（每域名一个文件）→ `snippets/`（proxy-common/security-headers/static-cache）→ `certs/`（600 root）。
- **适用规模**：日请求千万到十亿级，单机 QPS 峰值 5000-50000；不适合 K8s Ingress 已覆盖需求、需按用户维度精细鉴权配额计费、需动态服务发现秒级热更新的场景。
- **不做的边界**：不做 WAF（开源版无规则引擎）、不做认证中心（`auth_request` 可接但完整登录态不在网关职责）、不覆盖多活、不涉及 Nginx Plus。

## Important Claims（重要论断）

### 网关 ≠ 反向代理

配置写法接近但职责边界不同：反向代理只管转发；生产网关是统一入口（路由、TLS 终止、限流、鉴权前置、灰度、可观测），配置即代码、版本控制、预发验证、灰度可回滚。

### 生产事故的根因不是配置写错

作者核心观点：大部分生产事故是默认值、日志、容量、变更流程没按生产标准设计。Nginx 默认配置追求「任何场景都能跑起来」，不是「任何场景都能扛住」。

### 工具和教程会过时，但底层原理相对稳定（解读）

文章结尾强调「花一个月读完一本书，比长期刷碎片化教程收获更大」，与 [[craft-of-selfteaching]] 的自学理念一致。

## Concepts Introduced（引入的概念）

- [[nginx-gateway-production-design]]

## Entities Mentioned（提及的实体）

- （Nginx 1.30.6、Rocky Linux 9.4、Keepalived、nginx-prometheus-exporter 等技术组件，单信源不足以立实体页）

## Implications（影响／启示）

按学习目标选读（解读）：搭建网关先看「核心知识」六机制（进程模型/reload/keepalive/超时/缓冲/变量），再看分章配置；故障排查先掌握决策表；变更流程五件事比具体配置更重要。与 [[nginx-websocket-load-balancing]]、[[nginx-websocket-million-connections]] 同属 Nginx 基础设施线，但本文是通用网关生产指南，另两篇是 WebSocket 专项。

## Limitations（局限）

- 单信源（微信公众号技术文），未经多信源交叉验证；Star/版本号为撰文时点口径。
- 环境假设特定（RHEL 9 系 + 官方 RPM + 双机主备），其他环境需调整。
- 部分配置建议（如限流阈值、超时分级）需按业务实际调整，不可照搬。

## Related Knowledge（相关知识）

- [[nginx-websocket-load-balancing|Nginx WebSocket 负载均衡（信源页）]]
- [[nginx-websocket-million-connections|Nginx WebSocket 百万连接（信源页）]]
- [[harness-engineering|Harness 工程能力（概念页）]]

## Source（信源）

- `raw/sources/architecture/2026-11-04-nginx-gateway-production.md`
