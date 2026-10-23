---
title: Nginx生产级WebSocket实时长连接负载均衡，一文搞定
source: SegmentFault（银河技术）
source_url: https://segmentfault.com/a/1190000048281968
source_type: article
platform: SegmentFault
captured: 2026-10-23
registered_at: 2026-10-24
inbox_ref: Inbox/2026-10-23-nginx-websocket-load-balancing.md
asset_ref: Assets/2026/10/nginx-websocket-load-balancing.md
---

# Nginx生产级WebSocket实时长连接负载均衡，一文搞定

本文作者银河技术，有修订和改动。

## 1、引言

WebSocket 是基于 HTTP/1.1 Upgrade 机制实现的全双工长连接通信协议，广泛应用于 IM即时通讯、实时通知、协同编辑、行情推送、游戏服务等场景。由于 WebSocket 是长连接 + 状态敏感的协议，在 Nginx 中做反向代理时，需要特别注意一些细节。

这些细节主要是：

* 1）协议升级（Upgrade）；
* 2）连接保持；
* 3）超时控制；
* 4）负载均衡策略；
* 5）云环境 / K8s 场景下的断连问题。

本文从基础配置、生产配置、Docker / K8s、安全、排障、性能调优，系统性讲清 WebSocket 在 Nginx 中的正确打开方式。

## 2、WebSocket如何建立长连接

WebSocket 通过 HTTP/1.1 完成握手：

```
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
```

一旦升级成功，连接将不再遵循 HTTP 请求-响应模型，而是长期保持的双向 TCP 通道。

PS：这也是为什么 WebSocket 对 Nginx 超时 / FD / 内核参数 / LB 极度敏感。

## 3、基础WebSocket反向代理配置

```
http {
    # 基础 WebSocket 代理配置
    upstream websocket_backend {
        server 192.168.1.100:8080;
        server 192.168.1.101:8080;
        # 支持长连接
        keepalive 10;
    }

    server {
        listen 80;
        server_name ws.example.com;

        location /ws/ {
            # 核心 WebSocket 配置
            proxy_pass http://websocket_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # 重要：传递原始主机头和客户端 IP
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 长连接超时设置
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
            proxy_connect_timeout 30s;

            # 禁用缓冲，确保实时性
            proxy_buffering off;
            proxy_cache off;
        }
    }
}
```

补充说明：
1）proxy_http_version 1.1：WebSocket 必须；
2）Upgrade / Connection：完成协议升级；
3）proxy_buffering off：防止消息延迟；
4）proxy_read_timeout：防止 Nginx 主动断连。

## 4、生产环境必须补充的 Upgrade 头处理（关键）

注意：这是原始配置中最容易踩坑、但极其重要的一点。

推荐写法：

```
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# 然后在 location 中：
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
```

为什么这样更安全？

* 1）非 WebSocket 请求 → Connection: close；
* 2）WebSocket 请求 → Connection: upgrade。

PS：避免普通 HTTP 请求被错误升级。

## 5、完整生产级WebSocket配置

```
http {
    upstream websocket_cluster {
        ip_hash;

        server 10.0.1.10:8080 weight=3;
        server 10.0.1.11:8080 weight=2;
        server 10.0.1.12:8080 backup;

        # 以下健康检查依赖 nginx_upstream_check_module（非官方）
        check interval=3000 rise=2 fall=3 timeout=1000 type=http;
        check_http_send "GET /health HTTP/1.0\r\n\r\n";
        check_http_expect_alive http_2xx http_3xx;
    }

    server {
        listen 443 ssl http2;
        server_name ws.example.com;

        ssl_certificate /etc/nginx/ssl/example.com.crt;
        ssl_certificate_key /etc/nginx/ssl/example.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        location /chat/ {
            proxy_pass http://websocket_cluster;

            # WebSocket 升级
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;

            # 原始请求信息
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # ⚠️ 长连接超时
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;

            # 实时性
            proxy_buffering off;

            # 连接限制
            limit_conn ws_conn 1000;
        }
    }
}

limit_conn_zone $binary_remote_addr zone=ws_conn:10m;
```

## 6、HTTP/2 与 WebSocket 的现实情况

基本配置：
`listen 443 ssl http2;`

重要认知：

* 1）浏览器 WebSocket 仍使用 HTTP/1.1；
* 2）HTTP/2 WebSocket（RFC 8441）：浏览器支持有限、Nginx 支持不完整。

PS：这是正常现象，不是配置错误。

```
WebSocket location 必须显式：
proxy_http_version 1.1;
```

## 7、Docker / K8s 场景

```
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;

    location /ws/ {
        proxy_pass http://websocket-service:8080;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_read_timeout 7d;
        proxy_send_timeout 7d;

        proxy_buffering off;
    }
}
```

K8s / 云环境的隐藏断连点：云 LB 空闲超时、NAT 会话老化、防火墙空闲断连。

PS：Nginx 再怎么配都没用，必须应用层心跳

## 8、WebSocket心跳保活（生产必做）

推荐 20~30 秒一次：
`{ "type": "ping" }`

否则云 LB、防火墙、NAT，都会主动断你连接。

## 9、负载均衡策略的选择

```
upstream websocket_backend {
    ip_hash;
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
}
```

实战建议：ip_hash 做基础亲和，但会话状态尽量放在共享存储（Redis）而非依赖 LB 粘性。

PS：WebSocket 本质上 不适合强依赖 LB 算法做会话保持

## 10、优雅下线与灰度发布（生产增强）

K8s 必配：
`terminationGracePeriodSeconds: 60`

后端逻辑：

* 1）收到 SIGTERM；
* 2）停止新 WS；
* 3）通知客户端重连；
* 4）平滑下线。

## 11、Nginx及Linux内核参数（高并发必调）

Nginx配置如下：

```
worker_processes auto;
worker_rlimit_nofile 200000;

events {
    worker_connections 65535;
    use epoll;
}
```

Linux操作系统的配置：

```
net.core.somaxconn = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
```

## 12、写在最后

指令如下：

```
wscat -c ws://domain/ws
ss -an | grep ESTAB | wc -l
```

（本文同步发布于：http://www.52im.net/thread-4921-1-1.html）
