---
id: 2026-11-04-nginx-gateway-production
title: 从部署到上线：搭建生产可用的 Nginx 网关
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/jD5ecXWaruhDwST6AQ9tGQ
source_type: article
platform: 微信
created: 2026-11-04
category: 技术
tags: [nginx]
asset_ref: Assets/2026/11/nginx-gateway-production.md
wiki_status: ingested
---

> 摘要：一篇按"生产网关"而非"反向代理"标准写的 Nginx 长文（21 章）。核心主张：生产事故几乎都不是配置写错，而是默认值、日志、容量、变更流程没按生产标准设计。给出从环境准备、安装锁版本、配置骨架、upstream/TLS/限流/灰度、可观测到上线演练与故障排查的完整路径，环境为 Rocky Linux 9.4 + Nginx 1.30.6 + 双机 Keepalived。

## 核心要点

1. **四个危险默认值**：`worker_connections 1024`（连接打满）、`proxy_read_timeout 60s`（慢接口拖死）、`client_max_body_size 1m`（上传失败）、`proxy_buffer_size 4k`（大 Cookie 响应头超限 502）。每个参数都对应一个具体故障现象，调参要有依据。
2. **核心机制**：连接数上限 ≈ `worker_processes × worker_connections / 2`（反代场景）；reload 是优雅切换（内存短暂翻倍、配置错误不中断服务但必须验证生效）；upstream keepalive 的 `keepalive_timeout` 必须小于后端空闲超时，否则会 "upstream prematurely closed connection"；超时四件套（connect/send/read/client）计的是两次 IO 间隔而非总时长。
3. **upstream zone 必开**：不开则每个 worker 各自计数失败，`max_fails=3` 实际要失败 3×worker 数才摘除节点；开源版只有被动健康检查，且失败判定依赖 `proxy_next_upstream` 是否包含对应状态码。
4. **超时按接口分级**：普通 API 10s、报表 180s、上传 300s、SSE 3600s；SSE/大文件下载必须关 `proxy_buffering`，上传用 `proxy_request_buffering off`（一旦开始转发即不可重试）。
5. **TLS**：TLSv1.2/1.3、session cache（50m 约 20 万会话）、OCSP stapling 需配 resolver 与 `ssl_trusted_certificate`；HSTS 必须分步上线（300s→86400→一年），`preload` 不可逆。HTTP/2 在 1.25.1+ 用独立 `http2 on` 指令；HTTP/3 需 UDP 443 放通且 L4 LB 转发 UDP。
6. **限流先观测再拦截**：`limit_req_dry_run on` 观察 24h 的 excess 再定 burst；分层限流（IP + 域名 + 登录接口单独 5r/m）；429 响应带 `Retry-After`；后端整体不可用时用 error_page 返回静态兜底。
7. **可观测最小信息集**：结构化日志的 `$request_time`、`$upstream_response_time`、`$upstream_addr`、`$upstream_status` + stub_status 四数字；`requests/handled` 接近 1 说明 keepalive 没生效；stub_status 无状态码维度，5xx 告警要靠日志侧。
8. **变更流程比配置更重要**：配置进 Git、CI 跑 `nginx -t`（容器内跑以暴露路径问题）、双机灰度 reload（先一台观察 10 分钟）、带时间戳备份目录、回滚脚本演练过且 1 分钟内可回。
9. **故障排查**：按状态码 + error.log 文案分支定位——502 分四种文案（111 拒绝/110 超时/prematurely closed/too big header），504 看 `$upstream_response_time` 是否恰好等于超时阈值，499 突增是用户等不及（修后端不修 Nginx），413 注意前置 LB 也有 body 限制。
10. **版本要点**：1.30 stable（源自 1.29 主线）；1.29.7 起 `proxy_http_version` 默认 1.1 且 keepalive 默认开启；1.30.1/1.30.2 修复的两个 rewrite 堆溢出 CVE 被标注可能任意代码执行，1.28.x 且对外暴露的网关应最优先升级。

## 正文

全文见附件（21 章完整长文，含全部配置示例与上线检查清单）。

## 来源

- [从部署到上线：搭建生产可用的 Nginx 网关](https://mp.weixin.qq.com/s/jD5ecXWaruhDwST6AQ9tGQ)

## 附件

[[Assets/2026/11/nginx-gateway-production.md]]
