# 百万 WebSocket 长连接背后的 Nginx 架构设计与踩坑实录

> 原文：https://mp.weixin.qq.com/s/b-WPvJdAEI6fsxyN9hQysA
> 主题：Nginx WebSocket 反向代理，从基础配置到生产级架构实践

很多团队第一次做 WebSocket 时，目标通常很朴素：让浏览器和服务端建立一条长连接，能实时推消息就行。可一旦业务从 Demo 进入生产，问题很快就不再是"能不能连上"，而是"几十万连接为什么会抖""为什么发布一次就掉一片""为什么 Nginx 看起来没报错，但客户端一直重连""为什么明明 CPU 不高，连接数却上不去"。

这篇文章不是只讲一段 `location /ws` 配置，而是把 WebSocket 在生产环境中真正会遇到的链路、架构、容量、调优、发布、观测和故障处理完整串起来。我们重点聚焦 Nginx 作为 WebSocket 反向代理这一层，讲清楚它在整体架构里到底承担什么、不该承担什么，以及怎样把它从"能转发"升级到"能扛住业务增长"。

* * *

## 1. 先说结论：生产环境里的 Nginx WebSocket，不是加两个 Header 就结束了

WebSocket 代理要跑稳，至少要同时满足下面五件事：

1.  握手能成功：HTTP/1.1、`Upgrade`、`Connection` 头必须正确透传。
2.  长连接能存活：超时、心跳、代理缓冲、内核参数要匹配。
3.  连接能扩展：负载均衡策略、会话路由、状态外部化要设计清楚。
4.  发布能平滑：旧连接摘流、新连接切换、后端优雅退出要配合。
5.  故障能定位：连接数、握手成功率、断连原因、消息延迟必须可观测。

很多线上事故不是某一个点做错，而是这五件事里只做了第一件。

* * *

## 2. 典型业务场景：为什么你需要的是"连接架构"，不是"单台服务"

先看几个典型场景：

*   直播弹幕：连接量极大，消息广播密集，瞬时峰值明显。
*   IM 或企业通知：在线用户分布稳定，空闲连接多，消息扇出模式复杂。
*   协同编辑：连接数未必最高，但对低延迟、顺序性、会话一致性要求更高。
*   实时行情：连接多、推送频繁、订阅关系复杂，对网关层资源消耗明显。
*   IoT 设备通道：空闲周期长，断线重连频繁，需要更强的连接治理能力。

这些场景有一个共同点：真正消耗资源的不是"每秒请求数"，而是"连接存量 + 心跳频率 + 广播扇出 + 重连风暴"。

也就是说，WebSocket 架构不是传统 HTTP 网关架构的简单平移。HTTP 更像"短事务吞吐"，而 WebSocket 更像"连接资产运营"。

* * *

## 3. WebSocket 与 Nginx 的底层原理

### 3.1 WebSocket 握手到底发生了什么

WebSocket 并不是一个独立于 HTTP 的新建连协议，它的建立过程依赖一次 HTTP/1.1 Upgrade：

1.  客户端发起 HTTP 请求，请求头中带上：`Upgrade: websocket`、`Connection: Upgrade`、`Sec-WebSocket-Key`、`Sec-WebSocket-Version`
2.  Nginx 把这次请求转发给上游服务。
3.  上游返回 `101 Switching Protocols`。
4.  从这一刻起，这条连接从"HTTP 请求响应"切换为"全双工 TCP 隧道"。

这里最关键的一点是：握手成功之后，Nginx 不再按普通 HTTP Body 去理解后续数据，而是进入字节流转发状态。所以 WebSocket 的很多问题，本质上不是"接口问题"，而是"长连接代理问题"。

### 3.2 为什么默认配置下 WebSocket 经常不工作

因为 Nginx 默认更擅长处理短连接 HTTP 流量，而 WebSocket 需要显式满足几个条件：

*   必须使用 `proxy_http_version 1.1`
*   必须透传 `Upgrade` 和 `Connection`
*   必须合理设置 `proxy_read_timeout`
*   通常需要关闭 `proxy_buffering`
*   上游服务也必须真的支持 Upgrade

少任何一个点，都可能出现下面这些现象：

*   浏览器报 `WebSocket connection failed`
*   Nginx 返回 `400`、`426`、`502`
*   握手成功，但 60 秒后稳定断开
*   连接不断重建，客户端看起来像"偶发抖动"

### 3.3 Nginx 在这条链路中的真正角色

从职责上看，Nginx 在 WebSocket 架构里主要负责：

*   TLS 终结
*   反向代理和路由转发
*   负载均衡
*   基础访问控制和限流
*   接入日志和部分链路指标暴露

它不适合承担：

*   大规模会话状态存储
*   复杂订阅关系管理
*   跨节点广播总线
*   业务级消息 ACK、重试、补偿

这四件事如果混到 Nginx 层，会让架构维护成本和排障复杂度直线上升。

* * *

## 4. 一张生产级架构图看全链路

```
Client / App / Browser
        |
        v
+---------------------------+
|  SLB / CLB / Ingress VIP  |
+---------------------------+
        |
        v
+---------------------------+
|      Nginx Cluster        |
| TLS / LB / Rate Limit     |
| Upgrade / Access Log      |
+---------------------------+
        |
        v
+---------------------------+
|   WebSocket Gateway Pods  |
| Conn Mgmt / Auth / Route  |
+---------------------------+
        |
   +----+----+
   |         |
   v         v
 Redis      Kafka / NATS
 Presence   Broadcast / Event Bus
   |
   v
Business Services / User Service / Doc Service / IM Service
```

这个架构里有几个工程上很重要的分层原则：

*   Nginx 只管接入和转发，不管业务订阅状态。
*   WebSocket Gateway 负责连接生命周期、认证、房间关系、心跳和消息入口治理。
*   广播和事件分发通过 Redis、Kafka、NATS 之类的中间件做跨节点协同。
*   业务系统只处理业务事件，不直接维护每一条客户端连接。

这套拆分能让系统从单体长连接服务演进到可扩展的网关化架构。

* * *

## 5. 基础可用配置：最小正确版本

先给一份最小可用的 Nginx WebSocket 配置：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream websocket_backend {
    least_conn;
    server 10.0.0.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl;
    server_name ws.example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;

        proxy_buffering off;
        proxy_cache off;
    }
}
```

这份配置解决的是"能稳定握手并保持基本可用"，但离生产级还差很远。

* * *

## 6. 从可用到生产级：Nginx 的关键配置项逐个讲透

### 6.1 `worker_processes` 与 `worker_connections`

```nginx
worker_processes auto;

events {
    use epoll;
    worker_connections 65535;
    multi_accept on;
}
```

解释要点：

*   `worker_processes auto` 通常让 Nginx 以 CPU 核数启动 worker。
*   `worker_connections` 不是"最大客户端连接数"的精确值，它是每个 worker 可打开连接的上限。
*   一个 WebSocket 代理连接，通常会占用两侧 fd：客户端到 Nginx 一个连接，Nginx 到上游一个连接。

因此理论上最大连接量不能直接按 `worker_processes * worker_connections` 粗暴计算，而要考虑：每个 WebSocket 请求两端连接占用、访问日志/临时文件/监听套接字也占 fd、Keepalive 与普通 HTTP 流量也会占用连接资源。

### 6.2 `worker_rlimit_nofile` 与系统 `ulimit`

```nginx
worker_rlimit_nofile 200000;
```

如果 Nginx 配了很大的 `worker_connections`，但系统进程级文件描述符上限没放开，最终还是会报 `too many open files`。因此至少要同时检查：

*   `nginx.conf` 中的 `worker_rlimit_nofile`
*   systemd service 的 `LimitNOFILE`
*   用户级 `ulimit -n`
*   内核级 `fs.file-max`

很多团队把 Nginx 参数调大了，却漏了 systemd 限制，结果压测时连接上不去。

### 6.3 `proxy_read_timeout` 不是越大越好

常见写法是 `proxy_read_timeout 3600s;`，这能减少空闲断连，但它并不是"治本"。治本方式是：服务端明确发 Ping、客户端回 Pong、Nginx 的超时要略大于心跳间隔。

举个常见生产组合：服务端每 25 秒发一次 Ping，客户端收到后自动 Pong，Nginx `proxy_read_timeout` 设为 75 秒。这样才能兼顾中间链路保活、半开连接及时清理、避免僵尸连接长期占资源。

### 6.4 `proxy_buffering off` 为什么重要

WebSocket 是实时双向流。若缓冲没关闭，Nginx 在某些场景下会倾向于按普通代理响应来处理缓存和发送，可能导致消息推送延迟、小包实时性下降、业务误以为"后端变慢"。WebSocket 代理通常建议关闭：

```nginx
proxy_buffering off;
proxy_request_buffering off;
```

### 6.5 访问日志要能看见握手与上游耗时

```nginx
log_format ws_access '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     'rt=$request_time urt=$upstream_response_time '
                     'ua="$upstream_addr" ustatus="$upstream_status" '
                     'upgrade="$http_upgrade" conn="$connection"';
```

这类日志至少能帮助你回答三个关键问题：握手到底成功没成功；请求路由到了哪个上游；失败主要发生在客户端侧、Nginx 侧还是上游侧。

* * *

## 7. 生产级 Nginx 完整示例

```nginx
user nginx;
worker_processes auto;
worker_rlimit_nofile 200000;

events {
    use epoll;
    worker_connections 65535;
    multi_accept on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    tcp_nopush    on;
    tcp_nodelay   on;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    log_format ws_access '$remote_addr [$time_local] '
                         '"$request" $status '
                         'rt=$request_time urt=$upstream_response_time '
                         'ua="$upstream_addr" us="$upstream_status" '
                         'xff="$http_x_forwarded_for" '
                         'upgrade="$http_upgrade"';

    access_log /var/log/nginx/ws-access.log ws_access;
    error_log  /var/log/nginx/ws-error.log warn;

    limit_conn_zone $binary_remote_addr zone=ws_conn_zone:20m;
    limit_req_zone  $binary_remote_addr zone=ws_req_zone:20m rate=30r/s;

    upstream websocket_gateway {
        least_conn;
        server 10.0.1.21:8080 max_fails=3 fail_timeout=10s;
        server 10.0.1.22:8080 max_fails=3 fail_timeout=10s;
        server 10.0.1.23:8080 max_fails=3 fail_timeout=10s;
        keepalive 256;
    }

    server {
        listen 443 ssl;
        server_name ws.example.com;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_session_cache   shared:SSL:50m;
        ssl_session_timeout 1d;
        ssl_protocols       TLSv1.2 TLSv1.3;

        location /healthz {
            return 200 'ok';
            add_header Content-Type text/plain;
        }

        location /ws/ {
            limit_conn ws_conn_zone 5;
            limit_req zone=ws_req_zone burst=60 nodelay;

            proxy_pass http://websocket_gateway;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-Id $request_id;

            proxy_connect_timeout 3s;
            proxy_read_timeout 75s;
            proxy_send_timeout 75s;

            proxy_buffering off;
            proxy_request_buffering off;
            proxy_cache off;

            # 当上游已被摘流或不可用时，避免无意义重试打乱连接语义
            proxy_next_upstream off;
        }
    }
}
```

生产经验值得特别强调：

*   `limit_conn` 限的是并发连接，不是每秒请求。
*   `limit_req` 更适合限制握手风暴和恶意重连。
*   `proxy_next_upstream off` 对 WebSocket 很重要，避免 Upgrade 过程中发生不透明重试。
*   `keepalive` 作用于 Nginx 到上游的空闲连接池，对普通 HTTP 更明显；WebSocket 场景中价值有限，但混合流量场景仍有帮助。

* * *

## 8. 后端服务如何设计，才能真正支撑高并发

很多文章把重点全压在 Nginx 上，这会让人产生误解，仿佛 Nginx 配好了就能扛住百万连接。其实 WebSocket 架构能否放大，关键在后端网关层。

### 8.1 后端服务的职责边界

一个生产级 WebSocket Gateway，建议至少承担：握手鉴权（Token、签名、租户校验、设备校验）、连接注册（用户 ID、连接 ID、节点 ID 建立映射）、心跳保活（Ping/Pong 与空闲连接清理）、订阅关系维护（房间、频道、主题）、消息入口治理（限频、去重、黑名单、长度校验）、广播分发（跨节点消息推送）、优雅下线（摘流、拒绝新连接、等待旧连接自然回收）。

不建议它直接做：大量阻塞型数据库操作、重度业务编排、复杂 AI 推理或同步外部调用——这些操作一旦阻塞事件循环或连接读写线程，连接质量就会劣化。

### 8.2 会话状态尽量外部化

如果所有用户连接状态都只放本机内存，会遇到三个问题：扩容后新节点拿不到已有状态；故障切换后会话映射丢失；想做一致性路由时迁移成本极高。

生产中更推荐的做法是：

*   本地内存保留热状态：`connId -> socket`、`userId -> localConnSet`
*   Redis 保留全局索引：`userId -> gatewayNodeId`、`roomId -> memberSummary`
*   Kafka 或 NATS 承担跨节点广播和事件分发

这就是"连接本地化、状态外部化、广播总线化"。

* * *

## 9. 生产级代码示例：Go WebSocket Gateway

下面给出一个比 Demo 更接近生产的 Go 示例，重点体现：握手鉴权、连接注册与清理、心跳管理、优雅下线、跨节点广播入口。

```go
package main

import (
    "context"
    "encoding/json"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "sync/atomic"
    "syscall"
    "time"

    "github.com/gorilla/websocket"
)

type Envelope struct {
    Type      string          `json:"type"`
    RequestID string          `json:"requestId,omitempty"`
    Body      json.RawMessage `json:"body,omitempty"`
}

type Client struct {
    UserID   string
    ConnID   string
    Conn     *websocket.Conn
    SendCh   chan []byte
    LastSeen atomic.Int64
}

type Hub struct {
    mu         sync.RWMutex
    clients    map[string]*Client
    closing    atomic.Bool
    activeConn atomic.Int64
}

func NewHub() *Hub {
    return &Hub{
        clients: make(map[string]*Client),
    }
}

func (h *Hub) Register(c *Client) error {
    if h.closing.Load() {
        return errors.New("gateway is shutting down")
    }
    h.mu.Lock()
    defer h.mu.Unlock()
    h.clients[c.ConnID] = c
    h.activeConn.Add(1)
    return nil
}

func (h *Hub) Unregister(connID string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    if c, ok := h.clients[connID]; ok {
        delete(h.clients, connID)
        close(c.SendCh)
        h.activeConn.Add(-1)
    }
}

func (h *Hub) Shutdown() {
    h.closing.Store(true)
}

func validateToken(r *http.Request) (string, error) {
    token := r.URL.Query().Get("token")
    if token == "" {
        return "", errors.New("missing token")
    }
    // 生产环境这里应接入 JWT / Session / SSO 校验
    return "user-" + token, nil
}

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        return origin == "https://app.example.com"
    },
    ReadBufferSize:  4096,
    WriteBufferSize: 4096,
}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
    if hub.closing.Load() {
        http.Error(w, "server draining", http.StatusServiceUnavailable)
        return
    }
    userID, err := validateToken(r)
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("upgrade failed: %v", err)
        return
    }
    client := &Client{
        UserID: userID,
        ConnID: userID + "-" + time.Now().Format("20060102150405.000000000"),
        Conn:   conn,
        SendCh: make(chan []byte, 256),
    }
    client.LastSeen.Store(time.Now().Unix())
    if err := hub.Register(client); err != nil {
        _ = conn.WriteControl(
            websocket.CloseMessage,
            websocket.FormatCloseMessage(websocket.CloseGoingAway, "server draining"),
            time.Now().Add(3*time.Second),
        )
        _ = conn.Close()
        return
    }
    defer func() {
        _ = conn.Close()
        hub.Unregister(client.ConnID)
    }()
    conn.SetReadLimit(64 * 1024)
    _ = conn.SetReadDeadline(time.Now().Add(75 * time.Second))
    conn.SetPongHandler(func(appData string) error {
        client.LastSeen.Store(time.Now().Unix())
        return conn.SetReadDeadline(time.Now().Add(75 * time.Second))
    })
    go writePump(client)
    readPump(client)
}

func readPump(c *Client) {
    for {
        _, payload, err := c.Conn.ReadMessage()
        if err != nil {
            return
        }
        c.LastSeen.Store(time.Now().Unix())
        var env Envelope
        if err := json.Unmarshal(payload, &env); err != nil {
            continue
        }
        // 生产环境中这里通常不是直接回写，而是投递到业务总线
        if env.Type == "ping" {
            resp, _ := json.Marshal(map[string]any{
                "type": "pong",
                "ts":   time.Now().UnixMilli(),
            })
            select {
            case c.SendCh <- resp:
            default:
                return
            }
        }
    }
}

func writePump(c *Client) {
    ticker := time.NewTicker(25 * time.Second)
    defer ticker.Stop()
    for {
        select {
        case msg, ok := <-c.SendCh:
            if !ok {
                _ = c.Conn.WriteControl(
                    websocket.CloseMessage,
                    websocket.FormatCloseMessage(websocket.CloseNormalClosure, "closed"),
                    time.Now().Add(3*time.Second),
                )
                return
            }
            _ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                return
            }
        case <-ticker.C:
            _ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

func main() {
    hub := NewHub()
    mux := http.NewServeMux()
    mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWS(hub, w, r)
    })
    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok"))
    })
    mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
        if hub.closing.Load() {
            w.WriteHeader(http.StatusServiceUnavailable)
            _, _ = w.Write([]byte("draining"))
            return
        }
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ready"))
    })
    srv := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 5 * time.Second,
    }
    go func() {
        log.Printf("ws gateway started on :8080")
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("listen failed: %v", err)
        }
    }()
    stopCh := make(chan os.Signal, 1)
    signal.Notify(stopCh, syscall.SIGTERM, syscall.SIGINT)
    <-stopCh
    hub.Shutdown()
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := srv.Shutdown(ctx); err != nil {
        log.Printf("shutdown failed: %v", err)
    }
}
```

这段代码仍然是示例，但已经体现了几个生产级要点：

*   连接读写分离，避免互相阻塞。
*   `SendCh` 必须有限长，防止慢连接无限堆积。
*   `SetReadLimit` 必须有，避免超大消息拖垮连接线程。
*   关闭前先进入 `draining` 状态，拒绝新连接。
*   健康检查要区分 `liveness` 和 `readiness`。

* * *

## 10. 高并发设计：真正决定上限的不是语法，而是容量模型

### 10.1 百万连接先算资源账

假设目标是 100 万在线连接，不要先问"能不能上"，先算账：每条连接平均占用多少内存；每条连接平均心跳频率是多少；每秒消息量是多少；峰值重连时每秒会涌入多少握手请求。

一个粗粒度容量模型通常要覆盖：Nginx 连接内存、后端网关连接对象内存、心跳消息 QPS、广播消息扇出成本、Redis/Kafka 的消息吞吐、上游机器网络带宽。

示意估算：假设单连接综合占用 8 KB 到 20 KB，100 万连接的内存占用就可能在 8 GB 到 20 GB 级别；如果每 25 秒一次心跳，100 万连接约等于每秒 4 万次心跳事件。这还没算真实业务消息。

因此"百万连接"从来不是单台 Nginx 调大参数就能解决的问题，而是整条链路的容量工程。

### 10.2 连接多不等于消息多，消息多也不等于 CPU 高

WebSocket 系统的容量瓶颈通常有四类：

*   fd 不够：连接数上不去
*   内存不够：连接建得起来但很快 OOM 或频繁抖动
*   网卡带宽不够：广播时出口被打满
*   事件循环被阻塞：CPU 不高，但延迟明显上升

这也是为什么很多系统监控只看 CPU 和内存会误判。WebSocket 要重点看：当前连接数、建连速率、断连速率、平均心跳 RTT、慢连接数量、广播队列积压、单节点出入带宽。

* * *

## 11. 负载均衡策略：该不该做会话粘性

### 11.1 `least_conn` 适合大多数无状态网关

如果连接状态已经外部化，推荐优先考虑 `least_conn`：连接分布更均匀、节点扩容后更容易承接新连接、不依赖客户端 IP 稳定性。

### 11.2 `ip_hash` 只适合非常克制的场景

`ip_hash` 的问题在于：NAT 出口会让大量用户落到同一节点；移动网络切换后 IP 容易变化；用户侧分布不可控，容易造成热点。它可以临时解决"同用户总是打到同一台"的问题，但不是长期最优解。

### 11.3 一致性哈希适合按业务 ID 路由

```nginx
upstream websocket_gateway {
    hash $arg_userId consistent;
    server 10.0.1.21:8080;
    server 10.0.1.22:8080;
    server 10.0.1.23:8080;
}
```

但这通常意味着：你还没完全做到状态外部化；节点缩扩容时会有部分路由重分布；热门用户或租户会带来局部热点。

所以架构顺序通常应该是：先做状态外部化，再做均衡分发，最后才考虑局部业务粘性优化。

* * *

## 12. 工程化升级：发布、扩缩容与故障切换

### 12.1 为什么滚动发布经常把长连接搞崩

传统 HTTP 服务的滚动发布比较简单，因为请求短。WebSocket 不一样，连接可能持续数小时。若直接杀 Pod，会出现：客户端瞬时断开、大量并发重连、Nginx 和上游同时承受握手洪峰、Redis/认证系统/用户服务也被连带打爆。这就是典型的"重连风暴"。

### 12.2 正确的优雅下线流程

1.  Pod 进入 `draining` 状态。
2.  `readiness probe` 失败，从服务发现或负载均衡中摘流。
3.  Nginx 不再把新连接转发到该节点。
4.  老连接继续服务一段缓冲时间。
5.  服务端主动发送"即将重连"通知，指导客户端抖动退避重连。
6.  超时后关闭剩余连接，进程退出。

关键点在于"先摘新流量，再回收旧连接"，而不是直接重启。

### 12.3 Kubernetes 中的落地建议

建议至少配套：`readinessProbe`（控制是否接收新连接）、`livenessProbe`（判断进程是否健康）、`preStop`（给服务进入摘流状态的时间）、`terminationGracePeriodSeconds`（给老连接回收窗口）。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-gateway
spec:
  replicas: 6
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: ws-gateway
          image: example/ws-gateway:1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 20"]
```

如果你用的是 Ingress Nginx 或云厂商 LB，还要确认连接摘流的生效时延，否则 Pod readiness 失败了，但外层 LB 还在转发。

* * *

## 13. 内核与系统层调优：很多瓶颈其实不在 Nginx 配置文件里

### 13.1 文件句柄与监听队列

```
fs.file-max = 1000000
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
```

作用分别是：提高系统级文件句柄上限、增大监听队列、提高半连接队列容量。如果握手高峰期排队能力不足，就会出现建连慢、SYN backlog overflow、客户端不断超时重试。

### 13.2 端口与 TIME_WAIT

WebSocket 是长连接，通常不是 `TIME_WAIT` 最敏感的业务，但在下面场景里仍可能被击中：大量短时连接异常断开、服务发布导致重连洪峰、上游链路频繁重建。要重点关注：上游连接端口耗尽、NAT 或 SLB 侧连接追踪表爆满、某一层 idle timeout 小于业务心跳间隔。

### 13.3 TCP Keepalive 与应用心跳不要混淆

TCP Keepalive 是内核层保活机制，默认周期通常很长，适合清理死连接，但不适合做业务级在线判定。应用层心跳才应该承担：在线状态判断、延迟感知、连接质量评估、空闲连接淘汰。

生产实践中一般是：TCP Keepalive 开启做底线兜底，WebSocket Ping/Pong 做主保活机制。

* * *

## 14. 可观测性建设：不观测，就谈不上稳定

### 14.1 必须有的核心指标

接入层 Nginx：当前活跃连接数、每秒握手请求数、`101` 成功率、`4xx`/`5xx` 比例、上游连接失败数、限流命中数。

网关层：当前在线连接数、每节点连接分布、建连速率/断连速率、Ping RTT、消息收发 QPS、广播延迟、单连接发送队列积压、鉴权失败数、主动踢断数。

中间件层：Redis 命中率/订阅通道数/网络带宽、Kafka topic lag/生产消费速率、消息堆积时长。

### 14.2 日志要回答哪些问题

一套有用的日志体系，至少应该回答：某个用户为什么断线；某次握手失败发生在哪一层；某条消息卡在了接入层、网关层还是广播总线；某个节点为什么连接明显偏高。

因此建议给每次握手、每条连接、每次消息都打上：`requestId`、`connId`、`userId`、`nodeId`、`tenantId`。这些标识不齐，排障会非常痛苦。

* * *

## 15. 踩坑实录：线上最常见的 10 类问题

### 15.1 `426 Upgrade Required`

根因通常是：忘了 `proxy_http_version 1.1`；`Upgrade`/`Connection` 头没透传；上游根本不是 WebSocket 服务。

### 15.2 稳定 60 秒断连

根因通常是：`proxy_read_timeout` 默认值太小；服务端没有发 Ping；外层 LB 的空闲超时更短。

### 15.3 明明服务没挂，客户端却疯狂重连

常见原因：发布时直接杀进程、客户端无退避重试、Nginx 或上游短暂抖动触发雪崩重连。解决方向：服务端优雅下线、客户端指数退避、握手限流。

### 15.4 单机 CPU 不高，但延迟升高明显

常见原因：慢连接堆积、广播扇出阻塞、单线程事件循环被业务逻辑卡住、下游 Redis/Kafka 有抖动。这类问题最容易误判，因为 CPU 指标看起来"很健康"。

### 15.5 连接分布严重不均

常见原因：`ip_hash` 导致 NAT 热点、某些客户端网络出口集中、一致性哈希 key 分布不均。

### 15.6 压测能扛，线上却扛不住

因为很多压测只模拟建连、发几条消息、立刻断开；但真实线上还有长时间空闲连接、心跳周期重叠、发布引发重连风暴、热门房间广播、恶意刷连接。WebSocket 的压测一定要接近真实连接生命周期。

### 15.7 浏览器能连，App 经常断

常见是移动网络特性导致：基站切换、NAT 空闲回收更激进、弱网抖动导致半开连接。移动端必须设计更强的重连与会话恢复机制。

### 15.8 TLS 一开，性能突然掉很多

原因通常不是 WebSocket 本身，而是：TLS 握手成本上升、证书链配置不合理、会话复用没开、CPU 被加解密拖住。在大规模接入场景里，TLS 成本必须单独评估。

### 15.9 Redis Pub/Sub 小规模没问题，大规模广播抖动

因为 Redis Pub/Sub 简单但不擅长：大规模持久化消费、多消费组追赶、广播消息回放、峰值扇出缓冲。当业务进入大规模广播阶段，通常要评估 Kafka 或 NATS。

### 15.10 以为"百万连接"就是目标，最后被"百万空连接"拖垮

真正危险的是无效连接：已离线但未及时清理的半开连接、机器人刷上来的空闲连接、没订阅任何主题却长期驻留的连接。所以连接治理和无效连接清理，和扩容同样重要。

* * *

## 16. 从 Redis Pub/Sub 到 Kafka：什么时候该升级消息总线

### 16.1 Redis Pub/Sub 适合什么阶段

适合：中小规模实时推送、简单聊天室、房间广播量不大、不要求消息持久化和回放。优点是简单、接入快、延迟低。

### 16.2 Kafka 更适合什么阶段

适合：高吞吐消息广播、消息需要持久化、多消费组订阅、消费补偿与回放、业务事件与连接推送解耦。但 Kafka 的复杂度也更高：分区设计、消费者再均衡、顺序与幂等处理、监控告警成本。

因此更现实的演进路径往往是：单机内存广播 → Redis Pub/Sub → Redis + 连接状态外部化 → Kafka/NATS 作为事件总线。

* * *

## 17. 面向真实业务的案例：在线协同编辑系统如何落地

以"多人在线文档协同编辑"为例：

### 17.1 连接接入

*   客户端用 JWT 建立 `wss://doc.example.com/ws`
*   Nginx 完成 TLS 终结并转发到网关集群
*   网关校验用户、租户、文档权限

### 17.2 会话绑定

*   `userId -> gatewayNodeId` 写入 Redis
*   `docId -> local subscribers` 保存在网关本地内存
*   全局 `docId` 成员摘要保存在 Redis

### 17.3 编辑事件广播

*   用户输入变更先进入文档写入服务
*   写入成功后生成编辑事件
*   事件写入 Kafka
*   所有订阅该 `docId` 的网关节点消费后向本地连接扇出

### 17.4 冲突与顺序保证

*   文档服务负责版本号和 OT/CRDT 逻辑
*   WebSocket 网关只负责实时分发，不负责最终一致性计算

这是一个很重要的分层原则：实时通道负责"快"，文档核心服务负责"准"。

* * *

## 18. 一套更像生产环境的压测与验收方法

不要只做"能连上"的测试，建议分四类验收：

*   **握手压测**：峰值建连能力、TLS 握手成本、限流与黑名单策略
*   **长稳压测**：数十分钟到数小时的连接稳定性、空闲连接内存曲线、心跳超时与僵尸连接回收
*   **广播压测**：热点房间扇出能力、单节点发送队列积压情况、Redis/Kafka 的广播吞吐极限
*   **故障压测**：单节点重启、某节点网络抖动、Redis 短时不可用、发布过程摘流与重连风暴

真正上线前，最有价值的不是"极限 QPS 数字"，而是"系统在异常情况下是否仍可控"。

* * *

## 19. 文章最后的工程建议清单

如果你准备把 Nginx WebSocket 代理真正上线，建议按下面顺序落地：

1.  先把基础握手配置做正确。
2.  明确服务端心跳机制，再设 Nginx 超时。
3.  放开 fd、监听队列和系统资源限制。
4.  连接状态外部化，不要把扩展性赌在会话粘性上。
5.  为发布设计 `draining` 机制，避免重连风暴。
6.  接入连接数、握手成功率、断连率、广播延迟等指标。
7.  用接近真实业务生命周期的方式压测，而不是只测建连。
8.  当广播和订阅规模上来后，再评估从 Redis Pub/Sub 升级到 Kafka 或 NATS。

* * *

## 20. 总结

Nginx 在 WebSocket 架构里非常重要，但它的重要性并不等于"它能解决全部问题"。它真正擅长的是接入层治理，而不是业务状态管理。很多团队之所以在 WebSocket 项目里越做越重，核心原因不是 Nginx 不够强，而是没有把连接、状态、广播、业务职责分清。

从基础配置看，WebSocket 代理只需要几行参数；但从生产工程看，它背后其实是一整套长连接系统设计：接入层、网关层、状态层、消息总线、内核参数、发布机制、可观测性和容量模型，缺一不可。

如果只想把 WebSocket 跑起来，Nginx 配好 `Upgrade` 就够了；如果想把它跑到几十万、上百万连接且还能稳定发布、平滑扩容、快速排障，那就必须把它当作一项完整的实时通信基础设施工程来设计。
