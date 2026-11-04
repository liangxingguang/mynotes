---
title: 从部署到上线：搭建生产可用的 Nginx 网关
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/jD5ecXWaruhDwST6AQ9tGQ
source_type: article
platform: 微信
captured: 2026-11-04
registered_at: 2026-11-05
inbox_ref: Inbox/2026-11-04-nginx-gateway-production.md
asset_ref: Assets/2026/11/nginx-gateway-production.md
---

## 从部署到上线：搭建生产可用的 Nginx 网关

## 一、问题背景

### 1.1 一个"装好了"的 Nginx 为什么不能上线

大部分团队装 Nginx 的过程是这样的：`yum install nginx` 或 `apt install nginx`，把配置文件里的 `server_name` 改成自己的域名，`proxy_pass` 指向后端，`systemctl start nginx`，浏览器打开能看到页面，就算"部署完成"。

这套流程在测试环境没问题，因为测试环境只有一个人在点。上了生产，问题会在两三天内陆续出现：

*   晚高峰 502 率从 0 涨到 1.5%，应用侧日志干干净净，一条错误都没有；
*   上传 50MB 的附件，进度条走到 100% 之后报错，用户以为传成功了；
*   某个接口被爬虫扫了，单 IP 每秒 800 次请求，后端连接池被打满，整个站点跟着挂；
*   扩容了后端实例，但新实例 CPU 一直是 3%，流量上不去；
*   证书续期之后忘了 reload，第二天凌晨全站 HTTPS 报错；
*   出故障要定位，`access.log` 里只有 `$remote_addr $request $status`，连耗时都没有，只能猜。

这些问题的共同点：**都不是 Nginx 装错了，而是默认值、日志、容量、变更流程没按生产标准设计**。Nginx 的默认配置追求的是"任何场景都能跑起来"，不是"任何场景都能扛住"。

### 1.2 网关和反向代理不是一回事

很多文章把"反向代理"和"网关"混着讲。两者配置写法接近，但职责边界不同：

维度

反向代理

生产网关

主要职责

把请求转发到后端

统一入口：路由、TLS 终止、限流、鉴权前置、灰度、可观测

配置规模

几个 server 块

多域名、多 upstream、include 拆分、配置即代码

变更方式

手工改完 reload

版本控制、预发验证、灰度、可回滚

观测要求

有 access log 即可

结构化日志 + 指标 + 告警 + 链路串联

容量要求

能跑

连接数、文件描述符、内核参数、上游连接池都要算过

故障要求

重启试试

明确的降级、摘除、回滚预案

这篇文章按"网关"的标准来写。目标不是给你一份能跑的配置，而是给你一套**从机器准备到上线观察的完整路径**，以及每一步的判断依据。

### 1.3 本文的环境假设

技术文章最怕不写版本。所有命令和配置都在下面这套环境里验证过，其他版本会有差异的地方我会单独标注。

项目

版本 / 取值

操作系统

Rocky Linux 9.4（RHEL 9 系通用），内核 5.14

Nginx

1.30.6（stable 分支，2026-10-14 发布，含 CVE-2026-15176 等修复）

安装方式

nginx.org 官方仓库 RPM

部署形态

两台网关 + Keepalived VIP（同机房），后端为 Kubernetes 外的 VM 应用集群

后端协议

HTTP/1.1，应用为 Java Spring Boot 3.x + Go 服务混合

TLS

公网证书，RSA 2048 + ECDSA P-256 双证书

监控

nginx-prometheus-exporter + Prometheus 3.15 + Grafana 13

Nginx 版本这块要多说一句。1.30 是 2026 年 4 月宣告的 stable 分支，功能来自 1.29 主线，其中几个变化会直接影响本文的配置写法：

*   从 1.29.7 起，`proxy_http_version` 默认值改为 `1.1`，代理请求默认不再发送 `Connection` 头，upstream 的 `keepalive` 默认开启。也就是说，老文章里"必须手写 `proxy_http_version 1.1` 和 `proxy_set_header Connection ""`"这两条，在 1.30 上已经不是必需项，但**显式写出来仍然更安全**，因为你的环境未必是 1.30。
*   1.30.1 和 1.30.2 修的两个 rewrite 模块堆溢出（CVE-2026-42945、CVE-2026-9256）被标注为可能任意代码执行。如果你的网关还停留在 1.28.x，且对外暴露、用了 rewrite，升级优先级要提到最高。
*   1.30.6 修了 `alias` + `rewrite` 组合下的缓冲区溢出（CVE-2026-15176），静态资源用 alias 映射的项目要特别注意。

## 二、适用场景与边界

### 2.1 什么规模适合自建 Nginx 网关

自建 Nginx 网关的合理区间：

*   日请求量在千万级到十亿级之间，单机 QPS 峰值 5000 到 50000；
*   后端是 VM、容器混合部署，需要一个统一入口做路由和 TLS 终止；
*   有明确的灰度、限流、审计需求，但还不到上 Service Mesh 的复杂度；
*   团队里有 1 到 2 个人能读懂 Nginx 配置和 error.log。

不适合的情况也要说清楚：

*   已经在 Kubernetes 里跑得很顺，Ingress Controller（ingress-nginx、Higress、APISIX）已经覆盖需求，再在前面加一层 Nginx 只会增加一跳和一份配置负担；
*   需要按用户维度做精细鉴权、配额、计费，这属于 API 网关的活，Nginx 开源版做起来很别扭；
*   需要动态服务发现、配置热更新秒级生效，Nginx 开源版的 reload 有连接抖动成本，APISIX、Envoy 更合适。

### 2.2 本文方案的边界

需要提前说清楚本文不覆盖的内容，避免读者误用：

*   **不做 WAF**。Nginx 开源版没有规则引擎，靠 `if` 拼正则做防护，维护成本高且容易绕过。要 WAF 就在前面挂 ModSecurity 或云 WAF。
*   **不做认证中心**。`auth_request` 可以接一个鉴权服务，但完整的登录态、令牌签发不在网关职责内。
*   **不覆盖多活**。本文是同机房双机主备，跨机房多活涉及 DNS、数据同步、会话一致性，是另一个话题。
*   **不涉及 Nginx Plus**。文中所有配置都基于开源版，Plus 专属的 active health check、keyval、API 动态配置不展开，遇到时只提一句替代方案。

## 三、核心知识：先把这几个机制搞明白

配置写错，八成是因为对机制的理解有偏差。这一节讲六个关键机制，后面所有配置都是它们的推论。

### 3.1 进程模型与连接数上限

Nginx 是 master + worker 模型。master 负责读配置、绑定端口、管理 worker；worker 是实际处理请求的进程，每个 worker 是单线程事件循环，不做阻塞 IO。

连接数上限的算法：

   text

`单机最大并发连接 ≈ worker_processes × worker_connections   单机最大并发客户端（反向代理场景）≈ worker_processes × worker_connections / 2   `

除以 2 的原因：一个客户端请求在 Nginx 内部占用两条连接，一条是 client 侧，一条是 upstream 侧。如果你的场景是纯静态文件服务，不走上游，则不需要除以 2。

举例：8 核机器，`worker_processes 8`，`worker_connections 10240`，理论连接数 81920，反代场景下大约能同时服务 40000 个客户端。这个数字看起来很大，但要注意两点：

1.  每个连接都要占一个文件描述符，`worker_rlimit_nofile` 必须大于 `worker_connections`，否则会看到 `too many open files`；
2.  系统级 `fs.file-max` 和 systemd 的 `LimitNOFILE` 是硬约束，Nginx 自己调不上去。

真实案例：某次上线后 error.log 出现大量

   text

`2026/03/11 20:14:02 [alert] 2311#0: *882133 open socket #1893 left in connection 1042   2026/03/11 20:14:02 [alert] 2311#0: aborting   `

`worker_connections` 设的 1024（默认值），`worker_rlimit_nofile` 没设，systemd 的 `LimitNOFILE` 是 1024。晚高峰连接数一过 500 就开始 `worker process exited on signal 6`。这类问题不看配置根本想不到。

### 3.2 reload 到底做了什么

`nginx -s reload` 不是重启，流程是：

1.  master 收到 HUP 信号，重新读取并校验配置；
2.  配置合法，master 启动新的 worker 进程（新配置），同时给旧 worker 发信号让它们"优雅退出"；
3.  旧 worker 停止接受新连接，把手上的请求处理完再退出；
4.  如果旧 worker 上有长连接（WebSocket、SSE、长轮询），它会一直等到连接关闭或 `worker_shutdown_timeout` 到期。

这带来三个生产上必须知道的事实：

*   **reload 期间内存会短暂翻倍**。新旧 worker 同时存在，连接缓冲区、缓存元数据都占两份。内存紧张的机器 reload 可能触发 OOM。
*   **reload 不会中断已完成握手的连接**，但会有极短的 listen socket 交接窗口。实践中 4 层负载均衡后面的 Nginx reload，偶尔能看到个位数连接被重置。
*   **配置错误时 reload 会失败但服务不中断**。master 校验不通过会打印错误并继续用旧配置跑。这是好事，但也意味着"reload 没报错"不等于"新配置生效了"，必须验证。

验证 reload 是否真的生效，不能只看 `systemctl reload nginx` 返回 0，要看 worker 的启动时间和配置里的特征值：

   bash

`# 看 worker 进程启动时间，reload 后应该是刚刚   ps -eo pid,lstart,cmd | grep "nginx: worker" | grep -v grep  # 看 master 加载的配置里某个特征值（比如新增的 header）   curl -sI https://api.example.com/healthz | grep -i x-gateway-version  `

### 3.3 upstream keepalive 与连接复用

默认情况下，Nginx 对每个客户端请求都新建一条到后端的 TCP 连接。高 QPS 下这意味着：

*   每秒几千次 TCP 三次握手，后端 `accept` 队列压力大；
*   大量 TIME\_WAIT 堆在 Nginx 侧；
*   TLS 到后端（如果后端也开 TLS）握手开销更大。

开启 upstream keepalive 后，Nginx 会维护一个到每个后端的空闲连接池，请求结束后连接归还池子，下次复用。

   nginx

`upstream backend_api {       server 10.20.1.11:8080;       server 10.20.1.12:8080;       keepalive 64;              # 每个 worker 保留的空闲连接数上限       keepalive_requests 1000;   # 单条连接最多处理多少个请求后关闭       keepalive_time 3600s;      # 单条连接最长存活时间       keepalive_timeout 60s;     # 空闲连接在池中的最长停留时间   }   `

四个参数容易混，用一个表说清楚：

参数

作用对象

默认值

调大的后果

`keepalive`

池容量（每 worker）

无（不开启）

占用更多后端连接和内存

`keepalive_requests`

单连接请求数上限

1000

连接复用更充分，但后端可能先关

`keepalive_time`

单连接总存活时长

1h

同上

`keepalive_timeout`

空闲连接保留时长

60s

空闲连接堆积，被后端超时踢掉

这里有个经典坑：**Nginx 的 `keepalive_timeout` 必须小于后端的空闲超时**。假设后端是 Tomcat，`connectionTimeout` 默认 20 秒（Spring Boot 内嵌 Tomcat 默认 `server.tomcat.keep-alive-timeout` 也是 20 秒左右），而 Nginx 池子里的连接要留 60 秒。Nginx 拿到一条已经被后端关闭的连接去发请求，就会得到：

   text

`2026/03/11 21:03:55 [error] 2411#0: *991234 upstream prematurely closed connection   while reading response header from upstream, client: 10.30.2.51,   server: api.example.com, request: "GET /api/v1/orders HTTP/1.1",   upstream: "http://10.20.1.11:8080/api/v1/orders"   `

处理办法有两个，建议都做：

1.  把 Nginx 的 `keepalive_timeout` 调到后端空闲超时的 60% 左右，比如后端 20 秒，这里设 12 秒；
2.  配置 `proxy_next_upstream` 把这类错误纳入重试（注意只对幂等请求）。

### 3.4 超时四件套：connect / send / read / client

`proxy_connect_timeout`、`proxy_send_timeout`、`proxy_read_timeout` 三个参数名字很像，语义完全不同：

参数

计时起点

计时终点

超时日志特征

`proxy_connect_timeout`

发起 TCP 连接

三次握手完成

`connect() timed out` / `Connection timed out`

`proxy_send_timeout`

开始写请求

两次写操作之间的间隔超时

`while sending request to upstream`

`proxy_read_timeout`

开始读响应

两次读操作之间的间隔超时

`while reading response header from upstream`

注意 `proxy_send_timeout` 和 `proxy_read_timeout` 都是**两次 IO 之间的间隔**，不是整个请求的总时长。一个上传大文件、持续有数据流动的请求，即使总时长 10 分钟，只要间隔没超过阈值就不会超时。反过来，后端处理 90 秒才返回第一个字节，`proxy_read_timeout 60s` 一定超时。

还有一个容易忽略的 `client_*` 系列，管的是 Nginx 和客户端之间：

*   `client_header_timeout`：读请求头的总时长，默认 60s，慢速攻击就靠这个防；
*   `client_body_timeout`：读请求体的两次读间隔，默认 60s；
*   `send_timeout`：向客户端写响应的两次写间隔，默认 60s。

生产建议值（供参考，必须按业务调整）：

   nginx

`proxy_connect_timeout 3s;   proxy_send_timeout 30s;   proxy_read_timeout 60s;   client_header_timeout 15s;   client_body_timeout 20s;   send_timeout 30s;   `

### 3.5 缓冲：什么时候该关

Nginx 默认会把后端响应读到内存缓冲区（`proxy_buffers`），读完了再慢慢发给客户端。好处是后端连接能尽早释放，坏处是响应特别大时会把内存吃光、或者落盘到 `proxy_temp_path`。

三个关键开关：

   nginx

`proxy_buffering on;          # 默认 on   proxy_buffer_size 16k;       # 响应头缓冲区，超过会 502   proxy_buffers 8 16k;         # 响应体缓冲区，8 个 16k   proxy_busy_buffers_size 32k; # 正在发送给客户端的缓冲区上限   `

`proxy_buffer_size` 太小是 502 的高频原因。后端返回的响应头里带一大堆 Cookie、或者 JWT 放在 header 里，响应头轻松超过 4k（默认值），error.log 会报：

   text

`2026/03/12 09:41:07 [error] 2511#0: *1203341 upstream sent too big header   while reading response header from upstream, client: 10.30.5.77,   server: api.example.com, request: "GET /api/v1/profile HTTP/1.1",   upstream: "http://10.20.1.13:8080/api/v1/profile"   `

这类 502 的特征是：**只在特定接口、特定用户（Cookie 特别大的）出现，且后端日志里请求是成功的**。看到"后端成功、网关 502、error.log 有 too big header"，直接调 `proxy_buffer_size 32k` 并同步调 `proxy_buffers`。

反过来，SSE（Server-Sent Events）、大文件下载、流式响应必须关掉缓冲，否则客户端会等到缓冲区满才收到数据：

   nginx

`location /api/stream/ {       proxy_buffering off;       proxy_cache off;       proxy_read_timeout 3600s;       proxy_set_header Connection "";       chunked_transfer_encoding on;   }   `

### 3.6 变量、阶段与日志能拿到什么

Nginx 处理一个请求要经过十几个阶段（post-read、server-rewrite、find-config、rewrite、post-rewrite、preaccess、access、post-access、precontent、content、log）。理解阶段的意义在于：**很多指令只能在特定阶段生效**，比如 `if` 在 rewrite 阶段，`limit_req` 在 preaccess 阶段。

日志阶段能拿到的变量是排查的核心资产：

变量

含义

排查用途

`$request_time`

从读到第一个字节到响应发完

客户端视角总耗时

`$upstream_response_time`

从连上后端到收到响应

后端处理耗时，重试时是逗号分隔的多个值

`$upstream_connect_time`

连接后端耗时

区分"后端慢"和"网络慢"

`$upstream_header_time`

收到响应头耗时

判断是后端计算慢还是传输慢

`$upstream_addr`

实际请求的后端地址

重试时能看出打了哪几台

`$upstream_status`

后端返回的状态码

与 `$status` 不同时说明发生了重试或转换

`$request_length`

请求总字节数

识别异常大请求

`$bytes_sent`

响应总字节数

识别大响应、带宽异常

`$connection_requests`

当前连接上的第几个请求

判断 keepalive 复用情况

`$ssl_protocol` / `$ssl_cipher`

TLS 版本与套件

排查老客户端握手失败

一个判断技巧：当 `$request_time` 明显大于 `$upstream_response_time`，问题在 Nginx 到客户端这一段（带宽、客户端慢、缓冲区阻塞）；两者接近，问题在后端。

## 四、整体思路

### 4.1 分层设计

把网关配置拆成五层，每层职责单一，改一层不影响其他层：

   text

`/etc/nginx/   ├── nginx.conf                    # 全局：进程、事件、日志格式、include   ├── conf.d/   │   ├── 00-upstreams.conf         # 上游集群定义（按业务分组）   │   ├── 10-maps.conf              # 变量映射：灰度、限流 key、路由标记   │   ├── 20-limits.conf            # 限流限连 zone 定义   │   └── 30-tls.conf               # TLS 全局参数   ├── sites/   │   ├── api.example.com.conf      # 每个域名一个文件   │   ├── www.example.com.conf   │   └── _default.conf             # 默认 server，兜底拒绝   ├── snippets/   │   ├── proxy-common.conf         # 通用 proxy 头、超时   │   ├── security-headers.conf     # 安全响应头   │   └── static-cache.conf         # 静态资源缓存策略   └── certs/                        # 证书目录（权限 600，属主 root）   `

这样拆的好处：

*   新增域名只加一个 `sites/*.conf`，review 时 diff 干净；
*   公共参数改一处生效全局，不用在 20 个 server 块里找；
*   出问题能快速定位是哪一层，`nginx -T` 输出也能按文件顺序看。

### 4.2 上线路径

从零到上线的完整路径，本文按这个顺序展开：

1.  机器与内核准备（文件描述符、内核参数、时间同步、端口）；
2.  安装与版本锁定（官方仓库、校验、避免与系统自带冲突）；
3.  基础配置骨架（全局、日志、默认 server）；
4.  上游与负载均衡（keepalive、健康检查、重试策略）；
5.  超时与缓冲（按业务接口分级）；
6.  TLS 与 HTTP/2、HTTP/3；
7.  限流限连与灰度；
8.  可观测（结构化日志、指标、告警）；
9.  上线演练（预发压测、灰度、观察）；
10.  故障排查手册与回滚预案。

### 4.3 变更原则

网关是所有流量的入口，它的变更风险高于任何业务服务。本文坚持四条原则：

*   **配置进 Git**。任何手工改生产配置的行为都不允许，改完必须回写到仓库，否则下次别人 reload 就把你的改动覆盖了。
*   **先 `nginx -t` 再 reload**。CI 里用容器跑 `nginx -t -c`，本地也要跑，不要指望"我改的肯定对"。
*   **灰度按域名/按流量比例**。双机部署时先 reload 一台，观察 10 分钟指标，再 reload 另一台。
*   **保留上一版配置**。`/etc/nginx.bak/20261020-1430/` 这种带时间戳的目录，回滚就是 `rsync` 回来再 reload，比从 Git 里翻 commit 快得多。

## 五、环境准备与前置检查

### 5.1 目的

在装 Nginx 之前，把操作系统层面会成为瓶颈的东西调好。这一步做完，后面 90% 的"莫名奇妙的上限"都不会出现。

### 5.2 系统信息确认

   bash

`# 发行版与内核   cat /etc/os-release   uname -r  # CPU 核数（决定 worker_processes）   nproc   lscpu | grep -E "^(CPU\(s\)|Model name|Thread|Core)"  # 内存   free -h  # 网卡与带宽   ip -br addr   ethtool eth0 | grep -E "Speed|Duplex"  `

预期输出示例：

   text

`NAME="Rocky Linux"   VERSION="9.4 (Blue Onyx)"   ...   8   Model name:          Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz   Thread(s) per core:  2   Core(s) per socket:  4   ...                  total        used        free      shared  buff/cache   available   Mem:            31Gi       2.1Gi        26Gi       0.2Gi       3.2Gi        28Gi   `

判断依据：

*   `nproc` 是 8，说明这是 4 核 8 线程。Nginx 的 `worker_processes auto` 会取 8。对 IO 密集型网关，按逻辑核数设没问题；如果开了 `reuseport` 且连接数极高，可以考虑按物理核设，减少上下文切换。
*   内存 32G，双机热备场景下足够。如果单机要扛 5 万并发，每个连接约占 10-20KB 内核缓冲区，光连接就要 1G 左右，加上缓存和缓冲区，建议 32G 起步。
*   网卡速率决定上限。1Gbps 网卡理论 125MB/s，一个 10MB 的下载请求就能吃掉 8% 带宽。出口带宽要和业务峰值算一遍。

### 5.3 文件描述符

这是最容易漏的一步。三个层次都要改：

   bash

`# 1. 系统级上限   sysctl -w fs.file-max=2097152   echo "fs.file-max = 2097152" > /etc/sysctl.d/90-nginx.conf  # 2. systemd 服务级（覆盖 nginx.service 的 LimitNOFILE）   mkdir -p /etc/systemd/system/nginx.service.d   cat > /etc/systemd/system/nginx.service.d/limits.conf <<'EOF'   [Service]   LimitNOFILE=1048576   LimitNPROC=65535   EOF   systemctl daemon-reload  # 3. Nginx 自身（worker 级）   # 写在 nginx.conf 的 main 段：worker_rlimit_nofile 1048576;  `

验证：

   bash

`# 看 master 进程的实际限制   pid=$(cat /run/nginx.pid)   grep "Max open files" /proc/$pid/limits  # 看某个 worker 的   wpid=$(pgrep -f "nginx: worker" | head -1)   grep "Max open files" /proc/$wpid/limits  `

预期：

   text

`Max open files            1048576              1048576              files   `

异常表现：如果这里显示 1024，说明 systemd 的 drop-in 没生效（常见原因是文件名不是 `.conf` 结尾，或者没执行 `daemon-reload`，或者 `nginx.service` 里显式写了 `LimitNOFILE=1024` 覆盖了你的 drop-in）。判断依据是 `systemctl show nginx -p LimitNOFILE`，这个命令看到的值才是最终生效值。

### 5.4 内核参数

   bash

`cat > /etc/sysctl.d/91-nginx-net.conf <<'EOF'   # 全连接队列上限，Nginx 的 backlog 不能超过它   net.core.somaxconn = 65535   # 半连接队列   net.ipv4.tcp_max_syn_backlog = 65535   # 可用本地端口范围，影响 Nginx 主动连后端的端口耗尽   net.ipv4.ip_local_port_range = 10240 65000   # TIME_WAIT 复用（仅对主动发起连接的场景有效）   net.ipv4.tcp_tw_reuse = 1   # TIME_WAIT 上限   net.ipv4.tcp_max_tw_buckets = 262144   # 加快 FIN 回收   net.ipv4.tcp_fin_timeout = 15   # SYN 重试次数，公网服务适当降低   net.ipv4.tcp_syn_retries = 3   net.ipv4.tcp_synack_retries = 2   # 连接跟踪表（有 iptables/nftables 规则时重要）   net.netfilter.nf_conntrack_max = 1048576   # 端口复用，多 worker 监听同一端口时减少惊群   net.ipv4.tcp_mem = 786432 1048576 1572864   net.core.rmem_max = 16777216   net.core.wmem_max = 16777216   net.ipv4.tcp_rmem = 4096 87380 16777216   net.ipv4.tcp_wmem = 4096 65536 16777216   EOF  sysctl --system  `

每一项的风险要说清楚：

*   `tcp_tw_reuse=1` 只影响**主动发起连接**的一方（Nginx 连后端），对被动接受的连接无效，所以不会导致客户端连不上。但它会让部分"延迟到达的旧包"被误认为新连接的一部分，理论上有一点点风险，在有 NAT 的环境里通常利大于弊。
*   `nf_conntrack_max` 调大要同步看 `nf_conntrack_buckets`，否则哈希桶太少，查找变慢。`conntrack -S` 能看到 `insert_failed`，非 0 说明表满了。
*   `somaxconn` 改大后，Nginx 的 `listen ... backlog=` 才有意义，两者取小值。

验证：

   bash

`sysctl net.core.somaxconn net.ipv4.ip_local_port_range   ss -lnt | grep :443   # Send-Q 列就是当前 listen backlog 的实际值   `

### 5.5 时间同步

日志时间戳错乱会让排查变成灾难。网关必须严格同步时间：

   bash

`timedatectl status   # 期望看到：System clock synchronized: yes / NTP service: active  chronyc tracking   # 期望：Leap status : Normal，System time 偏差在毫秒级  `

如果偏差超过 1 秒，先修时间再谈其他。跨机日志对比时，1 秒偏差足以让你得出"后端比网关慢"的错误结论。

### 5.6 端口与 SELinux

   bash

`# 端口占用检查   ss -lntup | grep -E ':(80|443|8080)\b'  # SELinux 状态   getenforce  `

如果 SELinux 是 Enforcing，Nginx 反代到非标准端口（比如 8080）会被拒绝，error.log 里是：

   text

`2026/03/12 10:02:11 [crit] 2611#0: *10 connect() to 10.20.1.11:8080 failed   (13: Permission denied) while connecting to upstream   `

这不是网络问题，是 SELinux 的 `httpd_t` 域不允许连 `http_port_t` 之外的端口。正确做法是加端口标签，而不是关 SELinux：

   bash

`semanage port -a -t http_port_t -p tcp 8080   # 或一次性允许 Nginx 连所有端口（不推荐，仅临时验证）   setsebool -P httpd_can_network_connect 1   `

同理，如果 Nginx 要反代到 Unix socket，需要 `httpd_can_network_connect`；要访问用户家目录下的静态文件，需要 `httpd_read_user_content`。

### 5.7 前置检查清单

上线前逐项打勾，任何一项不通过都不要继续：

检查项

命令

通过标准

时间同步

`chronyc tracking`

偏差 < 100ms

文件描述符

`grep "Max open files" /proc/$(cat /run/nginx.pid)/limits`

≥ 65535

端口空闲

`ss -lntup | grep :443`

无输出

SELinux 端口

`semanage port -l | grep 8080`

已添加或不需要

磁盘空间

`df -h /var/log /var/cache/nginx`

使用率 < 70%

到后端连通性

`curl -sv http://10.20.1.11:8080/healthz`

200

DNS 解析

`dig +short api.example.com`

返回预期 IP

## 六、安装与版本锁定

### 6.1 目标

装一个**可控版本**的 Nginx，而不是发行版仓库里那个两年前编译的包。原因很直接：

*   RHEL 9 AppStream 里的 nginx 版本停留在 1.20/1.22 系列，缺少 HTTP/3、`ssl_reject_handshake` 之外的若干修复，且 CVE 修复靠 backport，节奏比上游慢；
*   发行版包的编译参数不透明，`--with-http_v3_module`、`--with-http_realip_module` 有没有开，得 `nginx -V` 才知道；
*   出问题时无法对照上游 CHANGES 判断"这个 bug 是不是已经修了"。

### 6.2 安装步骤

   bash

`# 1. 先看系统是否已有 nginx module stream   dnf module list nginx  # 如果输出里有 nginx 1.20/1.22 之类的流且是 [d] 默认，先禁用，避免装成旧版本   # dnf module disable nginx -y  # 2. 添加官方仓库   cat > /etc/yum.repos.d/nginx.repo <<'EOF'   [nginx-stable]   name=nginx stable repo   baseurl=http://nginx.org/packages/centos/$releasever/$basearch/   gpgcheck=1   enabled=1   gpgkey=https://nginx.org/keys/nginx_signing.key   module_hotfixes=true  [nginx-mainline]   name=nginx mainline repo   baseurl=http://nginx.org/packages/mainline/centos/$releasever/$basearch/   gpgcheck=1   enabled=0   gpgkey=https://nginx.org/keys/nginx_signing.key   module_hotfixes=true   EOF  # 3. 导入签名并安装   rpm --import https://nginx.org/keys/nginx_signing.key   dnf install -y nginx  # 4. 锁定版本，防止被无人值守升级带到未验证的版本   dnf install -y 'dnf-command(versionlock)'   dnf versionlock add nginx  `

`module_hotfixes=true` 这行的作用：让这个仓库的包绕过 module 过滤，否则在 RHEL 9 上即使加了仓库，`dnf install nginx` 还是会去装 AppStream 的 module 版本。这个坑很多人踩过。

### 6.3 验证安装结果

   bash

`nginx -v   nginx -V 2>&1 | tr ' ' '\n' | grep -E "with-http|with-stream|prefix|conf-path"   `

预期输出（节选）：

   text

`nginx version: nginx/1.30.6   built by gcc 14.2.1 20240912 (Red Hat 14.2.1-3) (GCC)   built with OpenSSL 3.5.1 1 Jul 2025   TLS SNI support enabled   configure arguments: --prefix=/etc/nginx --sbin-path=/usr/sbin/nginx   --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf   --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log   --http-client-body-temp-path=/var/cache/nginx/client_temp   --with-http_ssl_module --with-http_v2_module --with-http_v3_module   --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module   --with-stream --with-stream_ssl_module --with-threads --with-compat   `

判断依据：

*   有 `--with-http_v3_module` 才能开 HTTP/3，官方 1.30 的包默认带；
*   有 `--with-http_realip_module` 才能用 `set_real_ip_from` 取真实客户端 IP，前面挂 L4 负载均衡时必须；
*   有 `--with-http_stub_status_module` 才能出 `stub_status` 指标；
*   有 `--with-stream` 才能做四层代理。

任何一项缺失，要么换包，要么自己编译。自己编译时把这些参数抄全，别漏 `--with-compat`（否则动态模块加载会报 “module is not binary compatible”）。

### 6.4 目录与权限

   bash

`# 配置目录   install -d -m 755 /etc/nginx/{conf.d,sites,snippets,certs}  # 日志目录（独立分区更好）   install -d -m 755 /var/log/nginx   chown nginx:adm /var/log/nginx  # 证书目录：只允许 root 读，Nginx master 以 root 启动后降权，worker 不需要读证书   install -d -m 700 /etc/nginx/certs   chown root:root /etc/nginx/certs  `

关于证书权限，有个常见误区：很多人为了"让 nginx 用户能读"把证书设成 644，等于把私钥暴露给机器上所有用户。正确做法是 600/root，因为 master 进程以 root 身份读取证书，worker 继承的是已经加载到内存的 SSL\_CTX，不需要再读文件。

### 6.5 systemd 单元调整

   bash

`cat > /etc/systemd/system/nginx.service.d/override.conf <<'EOF'   [Unit]   After=network-online.target   Wants=network-online.target  [Service]   Type=forking   PIDFile=/run/nginx.pid   ExecStartPre=/usr/sbin/nginx -t -q -g 'daemon on; master_process on;'   ExecStart=/usr/sbin/nginx -g 'daemon on; master_process on;'   ExecReload=/bin/kill -s HUP $MAINPID   ExecStop=/bin/kill -s QUIT $MAINPID   TimeoutStopSec=30   Restart=on-failure   RestartSec=3   LimitNOFILE=1048576   LimitNPROC=65535   PrivateTmp=true  [Install]   WantedBy=multi-user.target   EOF  systemctl daemon-reload   systemctl enable --now nginx  `

`ExecStartPre=nginx -t` 的意义：配置有语法错误时启动直接失败，而不是起一个半残的服务。`ExecReload` 用 HUP 而不是 `systemctl reload` 的默认行为，语义一致但更直观。

`Restart=on-failure` 要谨慎：如果 Nginx 因为端口被占用反复失败，systemd 会不断重启，日志刷屏。配合 `RestartSec=3` 和启动失败告警使用。

## 七、基础配置骨架

### 7.1 全局段

   nginx

`# /etc/nginx/nginx.conf   user  nginx;   worker_processes  auto;   worker_cpu_affinity auto;   worker_rlimit_nofile 1048576;  pid        /run/nginx.pid;   error_log  /var/log/nginx/error.log warn;  events {       worker_connections  10240;       multi_accept        on;       use                 epoll;   }  http {       include       /etc/nginx/mime.types;       default_type  application/octet-stream;      # 隐藏版本号，减少信息泄露       server_tokens off;      # 字符集       charset       utf-8;       source_charset utf-8;      # 高效传输       sendfile           on;       tcp_nopush         on;       tcp_nodelay        on;      # 连接保持       keepalive_timeout  65s;       keepalive_requests 1000;      # 请求体与头部       client_max_body_size      20m;       client_body_buffer_size   128k;       client_header_buffer_size 4k;       large_client_header_buffers 4 16k;       client_body_temp_path     /var/cache/nginx/client_temp 1 2;       client_body_timeout       20s;       client_header_timeout     15s;       send_timeout              30s;      # 文件缓存       open_file_cache          max=20000 inactive=60s;       open_file_cache_valid    30s;       open_file_cache_min_uses 2;       open_file_cache_errors   on;      # 压缩：只压文本类，注意 CPU 成本       gzip              on;       gzip_vary         on;       gzip_comp_level   5;       gzip_min_length   1024;       gzip_proxied      any;       gzip_types        text/plain text/css text/xml application/json                         application/javascript application/xml+rss                         application/vnd.api+json image/svg+xml;      # 日志格式       log_format main_json escape=json         '{"ts":"$time_iso8601",'         '"host":"$host",'         '"remote_addr":"$remote_addr",'         '"x_forwarded_for":"$http_x_forwarded_for",'         '"request_id":"$req_id",'         '"method":"$request_method",'         '"uri":"$request_uri",'         '"status":$status,'         '"body_bytes":$body_bytes_sent,'         '"request_time":$request_time,'         '"upstream_addr":"$upstream_addr",'         '"upstream_status":"$upstream_status",'         '"upstream_connect_time":"$upstream_connect_time",'         '"upstream_header_time":"$upstream_header_time",'         '"upstream_response_time":"$upstream_response_time",'         '"upstream_cache_status":"$upstream_cache_status",'         '"ssl_protocol":"$ssl_protocol",'         '"ssl_cipher":"$ssl_cipher",'         '"ua":"$http_user_agent"}';      access_log /var/log/nginx/access.log main_json buffer=64k flush=5s;      # 请求 ID：优先用上游传的，没有就生成       map $http_x_request_id $req_id {           default   $http_x_request_id;           ""        $request_id;       }      # 限流 zone 定义       limit_req_zone  $binary_remote_addr zone=perip:20m   rate=30r/s;       limit_req_zone  $server_name       zone=perserver:10m rate=2000r/s;       limit_conn_zone $binary_remote_addr zone=conn_perip:10m;       limit_req_status  429;       limit_conn_status 429;      include /etc/nginx/conf.d/*.conf;       include /etc/nginx/sites/*.conf;   }  `

几个参数的取舍说明：

*   `worker_connections 10240`：8 核机器上单 worker 1 万连接足够。不要一上来写 65535，那只是把上限抬到文件描述符允许的范围，实际内存和 CPU 先撑不住。
*   `multi_accept on`：一次 accept 多个连接，高并发下吞吐更好；低并发时略有浪费。网关场景建议开。
*   `access_log ... buffer=64k flush=5s`：日志先写内存再批量落盘，能把日志 IO 降低一个数量级。代价是进程崩溃时最多丢 5 秒日志。如果审计要求零丢失，去掉 buffer。
*   `client_max_body_size 20m`：全局给一个保守值，具体接口在 location 里单独放大。全局设 500m 会让攻击者轻松打满磁盘和带宽。
*   `gzip_comp_level 5`：压缩率和 CPU 的平衡点。9 级比 5 级只多压 2%-3%，CPU 却多一倍。
*   `limit_req_zone` 的 `20m`：官方文档说 1MB 约能存 16000 个 IP 状态，20m 约 32 万个。实际按 64 位系统每个节点 80 字节左右估算，留足余量。

### 7.2 默认 server：兜底拒绝

扫描器会直接用 IP 访问 80/443，或者用不存在的域名打过来。默认 server 负责把这些请求挡掉，同时避免"第一个 server 块成为默认 server"这种隐式行为。

   nginx

`# /etc/nginx/sites/_default.conf   server {       listen      80 default_server;       listen      [::]:80 default_server;       server_name _;      # 除了 ACME 验证，其他一律拒绝       location /.well-known/acme-challenge/ {           root /var/www/acme;       }      location / {           return 444;       }   }  server {       listen      443 ssl default_server;       listen      [::]:443 ssl default_server;       server_name _;      ssl_reject_handshake on;      # 没有证书也要能匹配到这个 server，用一个自签占位证书       ssl_certificate     /etc/nginx/certs/default.crt;       ssl_certificate_key /etc/nginx/certs/default.key;      location / {           return 444;       }   }  `

`return 444` 是 Nginx 特有的非标准状态码，作用是**直接关闭连接，不返回任何响应**。相比返回 403/404，它不给扫描器任何信息，也省掉一次响应传输。代价是排查时 `curl` 只会看到 `Empty reply from server`，需要知道这是预期行为。

`ssl_reject_handshake on`（1.19.4+）在 TLS 握手阶段就拒绝，比握手完成后再返回 444 更省资源，也避免用错证书导致浏览器报证书错误。

占位证书必须先生成，否则 `nginx -t` 会报 `cannot load certificate`，整个配置起不来：

   bash

`openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \     -subj "/CN=invalid" \     -keyout /etc/nginx/certs/default.key \     -out /etc/nginx/certs/default.crt   chmod 600 /etc/nginx/certs/default.key   `

因为配了 `ssl_reject_handshake on`，这张证书永远不会被发给客户端，只用于满足 Nginx "SSL server 必须有证书"的校验。

### 7.3 通用 proxy 片段

片段拆成两个，不是随意拆的，而是为了避开 Nginx 的一个硬规则：**同一条指令在同一个上下文里只能出现一次**。如果 `proxy_buffering` 写在片段里，location 里再写一次 `proxy_buffering off`，`nginx -t` 会直接报 `"proxy_buffering" directive is duplicate`。

所以片段的划分原则是：**"所有业务取值都一样的"放片段，"每个业务要单独调的"留给 location**。

   nginx

`# /etc/nginx/snippets/proxy-common.conf   # 只放与业务无关的部分：协议版本、请求头、请求 ID   proxy_http_version 1.1;   proxy_set_header Host              $host;   proxy_set_header X-Real-IP         $remote_addr;   proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;   proxy_set_header X-Forwarded-Proto $scheme;   proxy_set_header X-Forwarded-Port  $server_port;   proxy_set_header X-Request-ID      $req_id;   proxy_set_header Connection        "";   `

   nginx

`# /etc/nginx/snippets/proxy-buffer.conf   # 常规接口的缓冲与重试默认值，流式/大文件接口不要 include 这个文件   proxy_buffering          on;   proxy_buffer_size        16k;   proxy_buffers            8 16k;   proxy_busy_buffers_size  32k;   proxy_temp_path          /var/cache/nginx/proxy_temp 1 2;  proxy_next_upstream         error timeout http_502 http_503 http_504;   proxy_next_upstream_tries   2;   proxy_next_upstream_timeout 5s;  `

超时三件套（`proxy_connect_timeout`、`proxy_send_timeout`、`proxy_read_timeout`）故意不放进片段，因为它们必须按接口分级，放进片段反而会让 location 无法覆盖。

`proxy_set_header Connection ""` 在 1.30 上已经是默认行为，但显式写上兼容老版本，也让读配置的人一眼看到"这里要复用连接"。

`X-Forwarded-Proto $scheme` 必须传，否则后端生成的重定向链接会变成 http，导致混合内容或者登录跳转死循环。这个 bug 在"网关终止 TLS、后端是 http"的架构里几乎必然出现一次。

## 八、上游集群与负载均衡

### 8.1 upstream 定义

   nginx

`# /etc/nginx/conf.d/00-upstreams.conf   upstream api_backend {       zone api_backend 64k;       least_conn;      server 10.20.1.11:8080 max_fails=3 fail_timeout=10s;       server 10.20.1.12:8080 max_fails=3 fail_timeout=10s;       server 10.20.1.13:8080 max_fails=3 fail_timeout=10s;      keepalive 128;       keepalive_requests 1000;       keepalive_time 1800s;       keepalive_timeout 12s;   }  upstream web_backend {       zone web_backend 64k;       ip_hash;      server 10.20.2.11:8081 max_fails=3 fail_timeout=10s;       server 10.20.2.12:8081 max_fails=3 fail_timeout=10s;      keepalive 64;   }  `

`zone` 的作用是让 upstream 的共享内存状态在所有 worker 间共享。不开 zone 时，每个 worker 各自维护一份失败计数，8 个 worker 意味着 `max_fails=3` 实际要失败 24 次才会摘除节点。开了 zone，计数全局一致，健康判断准确得多。这是很多人不知道的细节。

### 8.2 算法选择

算法

适用

不适用

轮询（默认）

后端同构、请求耗时均匀

请求耗时差异大

`least_conn`

请求耗时差异大、有长请求

后端性能差异大

`ip_hash`

需要简单会话保持、无共享 session

客户端 IP 集中（NAT 后大量用户同一出口）

`hash $key consistent`

按用户/租户分片、缓存命中率要求高

key 分布不均

`random two least_conn`

后端数量多（>20）

后端少时收益不明显

默认轮询在长连接场景下有个陷阱：请求会被分配到"当前连接数最少"的节点，但轮询是按下标轮转的，不看负载。如果某个请求耗时 30 秒，它占着一条连接，后续请求仍然按顺序轮到它，导致该节点连接堆积。

`least_conn` 解决这个问题，但要注意它统计的是**活跃连接数**，不是 CPU 负载。后端如果有一个慢查询把 CPU 打满但连接数不多，`least_conn` 还是会往它身上派流量。

### 8.3 被动健康检查的真相

开源版只有被动检查：请求失败了才计数，`max_fails` 次失败后在 `fail_timeout` 内不再往这台派流量。三个必须理解的点：

1.  **失败判定依赖 `proxy_next_upstream`**。如果这个指令里没有 `http_500`，那后端返回 500 不会被计入 `max_fails`，节点永远不会被摘除。默认只包含 `error` 和 `timeout`。
2.  **`fail_timeout` 到期后会放一个请求过去试探**。这个请求如果成功，节点恢复；如果失败，重新计时。所以故障节点恢复后最多有一个请求受影响。
3.  **没有主动探测**。后端进程僵死但 TCP 端口还 listening 的情况，被动检查发现不了，只能靠请求超时慢慢摘。要主动检查，要么上 Nginx Plus，要么在前面挂一个健康检查代理，要么用 `proxy_next_upstream` + 短超时快速失败。

一个折中方案是用 `error_page` + `proxy_intercept_errors` 把 5xx 转成自定义页面，同时保证 `proxy_next_upstream` 覆盖到 5xx：

   nginx

`location /api/ {       include /etc/nginx/snippets/proxy-common.conf;       proxy_pass http://api_backend;      # 幂等请求才允许重试到下一台       proxy_next_upstream error timeout http_502 http_503 http_504;   }  `

`non_idempotent` 参数可以让 POST 也重试，但**强烈不建议**：POST 在后端可能已经执行成功，只是响应丢了，重试会导致重复下单、重复扣款。除非后端有幂等键，否则不要开。

### 8.4 动态解析后端地址

后端如果是云上按域名暴露的服务，IP 会变。传统做法是改配置 reload，1.27.3 之后可以用 `resolve` 参数让 Nginx 自己解析：

   nginx

`http {       resolver 10.20.0.2 valid=10s ipv6=off;      upstream cloud_backend {           zone cloud_backend 64k;           server api.internal.example.com:8080 resolve;           keepalive 64;       }   }  `

注意三点：

*   `resolver` 必须配，否则 `resolve` 参数不生效，配置检查会直接报错；
*   必须配 `zone`，否则多个 worker 各自解析，可能拿到不同 IP；
*   `valid=10s` 控制缓存时间，太短会打爆 DNS，太长切换不及时。

### 8.5 会话保持的三种做法

按优先级推荐：

1.  **无状态化**（首选）。会话数据放 Redis，后端不存 session，网关随便轮询。这是唯一能水平扩展的方案。
2.  **`ip_hash`**（简单但脆）。NAT 环境下大量用户共享出口 IP，流量会严重倾斜；后端扩容时一半会话失效。
3.  **`sticky` 指令**（1.29.6+ 引入，1.30 可用）。基于 cookie 的会话保持，比 `ip_hash` 准确。使用前务必在你自己的构建上验证：

   nginx

`upstream app_backend {       zone app_backend 64k;       sticky cookie srv_id expires=1h httponly secure path=/;       server 10.20.3.11:8080;       server 10.20.3.12:8080;   }   `

如果你的版本不支持 `sticky`，又必须做会话保持，最稳的办法是在应用层做（Spring Session + Redis），不要在网关层硬扛。

## 九、超时与缓冲：按接口分级

### 9.1 为什么不能全局一套超时

一个网关后面通常有三类接口，超时需求完全不同：

接口类型

典型耗时

合理 `proxy_read_timeout`

理由

普通查询 API

50-300ms

10s

超过 10 秒基本是故障，早点失败早点重试

报表/导出

10-120s

180s

后端确实在算，不能掐断

文件上传

取决于文件大小

300s

传输本身就要时间

SSE/WebSocket

长时间保持

3600s 或不限

连接是长活的

回调通知

5-30s

30s

对方系统可能慢，但不能无限等

全局 `proxy_read_timeout 60s` 的问题：普通 API 出故障时要等 60 秒才返回 504，用户早就走了，连接也一直被占着；而报表接口 60 秒又不够，必然失败。

### 9.2 分级配置示例

   nginx

`server {       listen 443 ssl;       http2 on;       server_name api.example.com;      ssl_certificate     /etc/nginx/certs/api.example.com.fullchain.pem;       ssl_certificate_key /etc/nginx/certs/api.example.com.key;       include /etc/nginx/snippets/tls-common.conf;       include /etc/nginx/snippets/security-headers.conf;      access_log /var/log/nginx/api.access.log main_json buffer=64k flush=5s;      # 普通查询接口       location /api/v1/ {           include /etc/nginx/snippets/proxy-common.conf;           include /etc/nginx/snippets/proxy-buffer.conf;           proxy_pass http://api_backend;          proxy_connect_timeout 2s;           proxy_send_timeout    10s;           proxy_read_timeout    10s;          limit_req zone=perip burst=60 nodelay;           limit_conn conn_perip 50;       }      # 报表导出：长耗时，不重试       location /api/v1/reports/ {           include /etc/nginx/snippets/proxy-common.conf;           proxy_pass http://api_backend;          proxy_connect_timeout 3s;           proxy_send_timeout    30s;           proxy_read_timeout    180s;           proxy_next_upstream off;          # 报表响应可能很大，关掉缓冲直接透传           proxy_buffering off;           proxy_max_temp_file_size 0;          limit_conn conn_perip 5;       }      # 文件上传：流式转发，不落 Nginx 临时文件       location /api/v1/upload/ {           include /etc/nginx/snippets/proxy-common.conf;           proxy_pass http://api_backend;          client_max_body_size 500m;           client_body_timeout   60s;           proxy_request_buffering off;           proxy_read_timeout    300s;           proxy_send_timeout    300s;          # 请求体已经开始转发，重试没有意义，显式关掉避免误解           proxy_next_upstream off;          limit_conn conn_perip 3;       }      # SSE 流式响应       location /api/v1/stream/ {           include /etc/nginx/snippets/proxy-common.conf;           proxy_pass http://api_backend;          proxy_buffering off;           proxy_cache off;           proxy_read_timeout 3600s;           proxy_send_timeout 3600s;           chunked_transfer_encoding on;          # 告诉中间层不要缓冲           add_header X-Accel-Buffering no always;       }      location = /healthz {           access_log off;           add_header Content-Type text/plain;           return 200 "ok\n";       }   }  `

### 9.3 每个参数的影响范围

`proxy_request_buffering off` 是一个高风险开关，必须说清楚：

*   **作用**：Nginx 边收客户端数据边转发给后端，不在本地缓存整个请求体。
*   **好处**：大文件上传省磁盘、省内存，首字节到后端更快。
*   **风险**：后端处理慢时，Nginx 会一直占着连接等后端；如果客户端上传速度远大于后端消费速度，压力全给到后端。另外**一旦开始转发就不能重试到下一台**，因为请求体已经消费掉了。
*   **适用**：上传接口、大 body 的 API。**不适用**：需要重试的幂等接口、body 很小但后端很慢的接口。

`proxy_max_temp_file_size 0` 表示禁用临时文件。默认值 1024m，响应超过缓冲区就写磁盘。报表接口返回 200MB 的 Excel，写磁盘会让 `proxy_temp` 分区瞬间打满，进而所有请求 500。禁用后，Nginx 会等客户端消费，用时间换空间。

### 9.4 缓冲参数怎么算

假设后端响应头有 8KB（含 Cookie、JWT），响应体平均 50KB：

   nginx

`proxy_buffer_size     16k;   # 头部缓冲，必须大于最大响应头   proxy_buffers         8 16k; # 8×16k=128k，能装下 50KB 响应体   proxy_busy_buffers_size 32k; # 通常是 proxy_buffers 单个大小的 2 倍   `

判断当前配置够不够，看 error.log 里有没有：

   text

`upstream sent too big header while reading response header from upstream   `

有就说明 `proxy_buffer_size` 小了。注意 `proxy_busy_buffers_size` 必须小于 `proxy_buffers` 总量的一半，否则 `nginx -t` 会报：

   text

`nginx: [emerg] "proxy_busy_buffers_size" must be equal to or greater than   the size of one buffer and less than the size of two buffers   `

## 十、TLS 配置

### 10.1 全局 TLS 参数

   nginx

`# /etc/nginx/snippets/tls-common.conf   ssl_protocols             TLSv1.2 TLSv1.3;   ssl_ciphers               ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;   ssl_prefer_server_ciphers off;  ssl_session_cache   shared:SSL:50m;   ssl_session_timeout 1d;   ssl_session_tickets off;  ssl_stapling        on;   ssl_stapling_verify on;   # OCSP 响应签名校验需要完整信任链，缺了这行 ssl_stapling_verify 实际不生效   ssl_trusted_certificate /etc/nginx/certs/ca-chain.pem;   # 生产环境建议换成内网 DNS，公网 DNS 抖动会拖慢 stapling 刷新   resolver            223.5.5.5 119.29.29.29 valid=300s;   resolver_timeout    5s;  add_header Strict-Transport-Security "max-age=31536000" always;  `

逐项说明：

*   `ssl_protocols TLSv1.2 TLSv1.3`：TLS 1.0/1.1 已被主流浏览器废弃，2020 年后就不该再开。如果还有老旧客户端（某些工控设备、老 Android），单独开一个 server 块降级，不要全局放开。
*   `ssl_ciphers`：只列 TLS 1.2 的套件，TLS 1.3 的套件由 OpenSSL 固定，不能用这个指令控制（要用 `ssl_conf_command Ciphersuites`，且需要 OpenSSL 1.1.1+）。
*   `ssl_prefer_server_ciphers off`：现代客户端选套件比服务端更合理（考虑硬件加速），官方推荐 off。
*   `ssl_session_cache shared:SSL:50m`：1MB 约 4000 个会话，50m 约 20 万个，够 8 个 worker 共享。这个必须开，否则每次连接都完整握手，CPU 直接翻倍。
*   `ssl_session_tickets off`：ticket 的密钥在 worker 间不同步（除非配 `ssl_session_ticket_key`），且影响前向保密。关掉后靠 session cache 做复用，代价是重启后会话全部失效。如果 QPS 极高、握手成本明显，可以开启并配置固定的 ticket key 文件。
*   OCSP stapling：让 Nginx 自己去 CA 拉 OCSP 响应并随握手发给客户端，省掉客户端的一次外网请求。必须配 `resolver`，否则拿不到。

### 10.2 双证书（RSA + ECDSA）

同一域名同时配置 RSA 和 ECDSA 证书，Nginx 会根据客户端支持的套件自动选择：

   nginx

`ssl_certificate     /etc/nginx/certs/api.example.com.ecdsa.fullchain.pem;   ssl_certificate_key /etc/nginx/certs/api.example.com.ecdsa.key;   ssl_certificate     /etc/nginx/certs/api.example.com.rsa.fullchain.pem;   ssl_certificate_key /etc/nginx/certs/api.example.com.rsa.key;   `

ECDSA 证书握手更快、签名更短，现代客户端优先用它；老客户端（Windows 7、老 Java）只支持 RSA，作为兜底。两张证书的域名必须完全一致，否则 SNI 匹配会出问题。

### 10.3 验证 TLS 配置

   bash

`# 协议与套件   openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \     | grep -E "Protocol|Cipher"  # 期望   # Protocol: TLSv1.3   # Cipher: TLS_AES_256_GCM_SHA384  # 确认 TLS 1.1 被拒绝   openssl s_client -connect api.example.com:443 -servername api.example.com -tls1_1 </dev/null 2>&1 \     | grep -E "alert|handshake failure"  # OCSP stapling 是否生效   openssl s_client -connect api.example.com:443 -servername api.example.com -status </dev/null 2>/dev/null \     | grep -A2 "OCSP Response Status"  # 证书链是否完整   openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null 2>/dev/null \     | grep -E "s:|i:"  `

`OCSP Response Status: successful (0x0)` 表示 stapling 生效。如果显示 `no response sent`，检查 `resolver` 是否可达、证书是否带 OCSP URL、`ssl_trusted_certificate` 是否配置了完整链。

### 10.4 证书轮换流程

证书过期是网关最常见的事故之一，而且完全可以避免。标准流程：

   bash

`# 1. 续期（以 certbot 为例，DNS-01 方式，不需要 80 端口）   certbot certonly --dns-aliyun -d api.example.com --deploy-hook "/usr/local/bin/nginx-cert-reload.sh"  # 2. 部署脚本：先校验，再 reload，失败自动回滚   cat > /usr/local/bin/nginx-cert-reload.sh <<'EOF'   #!/usr/bin/env bash   set -euo pipefail  CERT_DIR="/etc/letsencrypt/live/api.example.com"   TARGET_DIR="/etc/nginx/certs"   STAMP="$(date +%Y%m%d-%H%M%S)"   BACKUP_DIR="/etc/nginx/certs.bak/${STAMP}"  log() { printf '%s [cert-reload] %s\n' "$(date '+%F %T')" "$*"; }  # 前置检查：证书文件存在且未过期   for f in fullchain.pem privkey.pem; do     [[ -r "${CERT_DIR}/${f}" ]] || { log "missing ${CERT_DIR}/${f}"; exit 1; }   done  if ! openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -checkend 86400 >/dev/null; then     log "certificate expires within 24h, abort"     exit 1   fi  mkdir -p "${BACKUP_DIR}"   cp -a "${TARGET_DIR}/." "${BACKUP_DIR}/" 2>/dev/null || true  install -m 600 "${CERT_DIR}/privkey.pem"   "${TARGET_DIR}/api.example.com.key"   install -m 644 "${CERT_DIR}/fullchain.pem" "${TARGET_DIR}/api.example.com.fullchain.pem"  if ! nginx -t 2>/tmp/nginx-t.err; then     log "nginx -t failed, rolling back"     cp -a "${BACKUP_DIR}/." "${TARGET_DIR}/"     exit 1   fi  systemctl reload nginx   log "reload done, backup at ${BACKUP_DIR}"   EOF   chmod 750 /usr/local/bin/nginx-cert-reload.sh  `

脚本里几个细节值得说：

*   `set -euo pipefail`：任何命令失败立即退出，未定义变量报错，管道中任一环节失败也算失败。运维脚本没有这三件套，出问题时会在错误的状态下继续执行。
*   `openssl x509 -checkend 86400`：续期后如果证书还是快过期（比如 CA 返回了旧证书），直接中止，不要把坏证书推上去。
*   备份目录带时间戳：回滚时不用猜哪个是上一版。
*   `install -m 600`：私钥权限一步到位，避免先 cp 再 chmod 之间的窗口期。

### 10.5 HSTS 的风险

`Strict-Transport-Security: max-age=31536000` 一旦下发，浏览器在一年内只会用 HTTPS 访问这个域名，而且**用户无法跳过警告**。如果证书出问题，站点直接不可访问。

上线顺序必须是：

1.  先上 `max-age=300`，观察一周；
2.  确认无异常后改 `max-age=86400`，再观察一周；
3.  最后上 `max-age=31536000`。

不要一上来就加 `includeSubDomains` 和 `preload`。`preload` 会写进浏览器内置列表，移除需要几个月，属于不可逆操作。

## 十一、HTTP/2 与 HTTP/3

### 11.1 HTTP/2 的正确写法

Nginx 1.25.1 之前，HTTP/2 是写在 `listen` 的参数里：

   nginx

`listen 443 ssl http2;   # 1.25.1 之前   `

1.25.1 之后 `http2` 参数被废弃，改成独立指令：

   nginx

`listen 443 ssl;   http2  on;              # 1.25.1 及以后   `

在 1.30 上如果还用老写法，`nginx -t` 会给警告：

   text

`nginx: [warn] the "listen ... http2" directive is deprecated,   use the "http2" directive instead in /etc/nginx/sites/api.example.com.conf:8   `

警告不影响运行，但会在每次 reload 时刷日志，且未来版本会移除，应该改掉。

HTTP/2 的两个参数值得调整：

   nginx

`http2_max_concurrent_streams 128;   # 单连接最大并发流，默认 128   http2_body_preread_size       64k;  # 预读请求体大小，默认 64k   `

`http2_max_concurrent_streams` 调小的场景：后端连接池很小，一个 HTTP/2 连接上并发 128 个流会瞬间打满后端。调大则相反，前端页面资源多、希望一个连接全拉完。

### 11.2 HTTP/3 的启用条件

HTTP/3 走 QUIC（UDP），需要同时满足：

1.  Nginx 编译时带 `--with-http_v3_module`（官方 1.30 包带）；
2.  防火墙放通 UDP 443；
3.  客户端支持（Chrome 88+、Safari 14+、curl 8.x 带 HTTP/3 支持）。

配置：

   nginx

`server {       listen 443 ssl;       listen 443 quic reuseport;       listen [::]:443 ssl;       listen [::]:443 quic reuseport;      http2 on;       http3 on;       quic_retry on;      server_name www.example.com;      ssl_certificate     /etc/nginx/certs/www.example.com.fullchain.pem;       ssl_certificate_key /etc/nginx/certs/www.example.com.key;       include /etc/nginx/snippets/tls-common.conf;      # 告诉客户端"我支持 h3，你可以下次用"       add_header Alt-Svc 'h3=":443"; ma=86400' always;      location / {           root /var/www/www;           index index.html;       }   }  `

几个坑：

*   `reuseport` 对同一个 `地址:端口` 只能出现一次。多个 server 块都监听 443 时，如果每个都写 `reuseport`，`nginx -t` 会报 `duplicate listen options`。IPv4 和 IPv6 是两个不同的 socket，各写一次是允许的（官方 HTTP/3 示例就是这么写的）。
*   `Alt-Svc` 头必须 `always`，否则 304、404 响应里没有这个头，客户端学不到 h3 能力。
*   首次访问一定走 HTTP/2 或 HTTP/1.1，浏览器看到 `Alt-Svc` 后**下一次**才尝试 h3。所以"配完立刻测 h3"是测不出来的，要么用 `curl --http3` 强制，要么清缓存重开。
*   中间有 L4 负载均衡时，UDP 443 必须一起转发，否则 h3 握手直接超时，浏览器降级回 h2，日志里看不出问题，只是 h3 一直不生效。

验证：

   bash

`# 需要 curl 8.x 且编译了 HTTP/3 支持   curl --http3 -sI https://www.example.com/ | head -3  # 检查 Alt-Svc 头   curl -sI https://www.example.com/ | grep -i alt-svc  # 检查 UDP 监听   ss -lunp | grep :443  `

如果 `curl --http3` 报 `HTTP/3 support is not available in this build`，是 curl 的问题，不是 Nginx 的。用 `curl -V` 看 Features 里有没有 `HTTP3`。

### 11.3 什么时候不该开 HTTP/3

*   后端和网关之间是内网 HTTP/1.1，开 h3 只优化了最后一公里，收益有限但复杂度增加；
*   有基于 IP 的访问控制或限流，QUIC 的连接迁移会让源 IP 变化，策略失效；
*   团队没有 UDP 监控能力，h3 出问题时排查手段少（tcpdump 看 QUIC 需要解密）。

务实建议：先开 HTTP/2，把 TLS 会话复用、`sendfile`、缓冲调好，收益比上 h3 大得多。h3 适合面向公网、用户分布广、丢包率高的站点。

## 十二、限流、限连与过载保护

### 12.1 漏桶模型

`limit_req` 用的是漏桶算法：

*   `rate=30r/s`：桶的漏水速度，即平均速率；
*   `burst=60`：桶的容量，允许瞬时堆积 60 个请求；
*   `nodelay`：堆积的请求立即处理，不排队延迟。

不加 `nodelay` 时，超出 rate 的请求会排队，每个请求延迟 `1/rate` 秒。`burst=60 rate=30r/s` 意味着第 61 个请求要等 2 秒。对用户来说，2 秒的额外延迟比直接返回 429 更难受，所以 API 场景通常加 `nodelay`，把"限速"变成"限并发突发"。

   nginx

`# 单 IP 30 r/s，允许 60 个突发，突发立即处理   limit_req zone=perip burst=60 nodelay;  # 单 IP 30 r/s，允许 60 个突发，超出部分排队（适合下载、导出）   limit_req zone=perip burst=60;  `

### 12.2 分层限流

只按 IP 限流不够。攻击者用 1000 个 IP，每个 20 r/s，总流量 20000 r/s，单 IP 限流完全拦不住。要加一层按域名的总限流：

   nginx

`# 全站保护：单域名 2000 r/s   limit_req zone=perserver burst=4000 nodelay;  # 单 IP 保护   limit_req zone=perip burst=60 nodelay;  # 登录接口单独更严：5 r/s   limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;  `

注意 `rate` 的单位可以是 `r/s` 或 `r/m`。登录接口用 `5r/m` 表示每分钟 5 次，配合 `burst=3` 允许少量重试。

### 12.3 限连

`limit_conn` 限制单个 key 的并发连接数，防的是"一个客户端开一万个连接慢慢读"：

   nginx

`limit_conn_zone $binary_remote_addr zone=conn_perip:10m;  server {       limit_conn conn_perip 50;       limit_conn_status 429;   }  `

`limit_conn` 和 `limit_req` 的区别：前者管**同时**，后者管**速率**。下载站被单 IP 开 500 个连接拖垮带宽，属于前者；接口被刷，属于后者。两个都要配。

### 12.4 先观测再拦截

限流阈值配错的后果很严重：把正常用户拦掉，或者根本拦不住。上线前先用 dry-run 模式观察：

   nginx

`limit_req_dry_run on;   limit_conn_dry_run on;   `

dry-run 模式下超限请求**照常处理**，但会在 error.log 记录：

   text

`2026/03/13 14:22:01 [error] 2711#0: *1500231 limiting requests, dry run,   excess: 12.340 by zone "perip", client: 10.30.7.88, server: api.example.com,   request: "GET /api/v1/products?page=3 HTTP/1.1"   `

`excess` 是超出速率的请求数（按 rate 归一化），这个值能告诉你：如果真开限流，会有多少请求被拦。观察 24 小时，看 P99 的 excess，再决定 burst 设多少。

一个真实数据：某 API 单 IP 正常峰值 18 r/s，但页面首屏会并发拉 40 个接口。如果按平均 18 设 `rate=20r/s burst=0`，首屏必然被拦。正确做法是 `rate=30r/s burst=80 nodelay`，既挡住持续刷接口的，又不影响正常首屏。

### 12.5 过载时的降级策略

限流返回 429 只是第一步，还要告诉客户端什么时候重试：

   nginx

`limit_req_status 429;   limit_conn_status 429;  error_page 429 = @too_many;   location @too_many {       add_header Retry-After 2 always;       add_header Content-Type application/json always;       return 429 '{"code":"RATE_LIMITED","message":"too many requests, retry later"}';   }  `

后端整体不可用时，网关要能返回一个静态兜底页而不是干等超时：

   nginx

`upstream api_backend {       server 10.20.1.11:8080 max_fails=3 fail_timeout=10s;       server 10.20.1.12:8080 max_fails=3 fail_timeout=10s;   }  location /api/ {       include /etc/nginx/snippets/proxy-common.conf;       proxy_pass http://api_backend;       proxy_next_upstream error timeout http_502 http_503 http_504;       proxy_intercept_errors on;       error_page 502 503 504 = @fallback;   }  location @fallback {       internal;       default_type application/json;       add_header Retry-After 30 always;       return 503 '{"code":"SERVICE_UNAVAILABLE","message":"service temporarily unavailable"}';   }  `

`proxy_intercept_errors on` 会让后端返回的 5xx 也走 `error_page`。这有个副作用：后端真实的错误页面被替换成统一格式，排查时看不到原始信息。折中方案是只在网关自己产生的 5xx 上拦截（不加 `proxy_intercept_errors`），让后端的 5xx 原样透传，靠日志区分。

## 十三、灰度与流量切分

### 13.1 按权重灰度

最简单的灰度：新旧两组 upstream，按权重分流量。

   nginx

`upstream api_stable {       zone api_stable 64k;       least_conn;       server 10.20.1.11:8080;       server 10.20.1.12:8080;       keepalive 128;   }  upstream api_canary {       zone api_canary 64k;       least_conn;       server 10.20.1.21:8080;       keepalive 32;   }  # 5% 流量走灰度   split_clients "${remote_addr}${http_user_agent}" $api_pool {       5%      api_canary;       *       api_stable;   }  server {       location /api/ {           include /etc/nginx/snippets/proxy-common.conf;           proxy_pass http://$api_pool;       }   }  `

`split_clients` 的 key 决定了灰度的稳定性：用 `$remote_addr` 意味着同一个 IP 始终命中同一组，用户体验一致；用 `$request_id` 则每个请求随机，适合无状态接口。混合 `$remote_addr$http_user_agent` 是为了避免同一 NAT 出口的所有用户都被划到灰度组。

注意 `proxy_pass http://$api_pool;` 这种带变量的写法：变量在运行时才求值，Nginx 会先在已定义的 upstream 组里按名字查找，找不到才走 `resolver` 做 DNS 解析。不同版本对这个行为的处理有差异，跨版本升级时容易踩坑，所以更稳妥的写法是用 `map` 把变量映射成完整的 URL：

   nginx

`map $api_pool $api_upstream {       api_canary  "http://api_canary";       default     "http://api_stable";   }  location /api/ {       proxy_pass $api_upstream;   }  `

带变量的 `proxy_pass` 有一个副作用：**URI 不会被自动重写**。`proxy_pass http://backend/api/` 会把 `/api/xxx` 转成 `/api/xxx`（替换 location 前缀），而 `proxy_pass $var` 会原样传递 `$request_uri`。如果 location 是 `/api/` 而后端期望去掉前缀，必须显式 `rewrite`。

### 13.2 按请求头/ Cookie 灰度

内部测试用这种方式，指定用户走灰度：

   nginx

`map $http_x_canary $use_canary {       "true"   1;       default  0;   }  map $cookie_canary $cookie_canary_flag {       "1"      1;       default  0;   }  map "$use_canary$cookie_canary_flag" $target_pool {       "~1"     api_canary;       default  api_stable;   }  `

测试时带上 `-H "X-Canary: true"` 就能命中灰度，不用改权重。上线验证阶段特别有用：先用 header 让测试同学验证功能，确认没问题再按权重放量。

### 13.3 镜像流量

需要"用真实流量验证新版本但不影响用户"时，用 `mirror`：

   nginx

`location /api/ {       include /etc/nginx/snippets/proxy-common.conf;       proxy_pass http://api_stable;      mirror /mirror_api;       mirror_request_body on;   }  location = /mirror_api {       internal;       proxy_pass http://api_canary$request_uri;       proxy_set_header Host $host;       proxy_set_header X-Mirror "1";      # 镜像请求的响应直接丢弃，不返回给客户端       proxy_read_timeout 5s;   }  `

`mirror` 的请求是**异步**的，主请求不等镜像响应，所以不影响用户延迟。但要注意：

*   镜像流量是真实流量的 100%，新版本的数据库写入、消息发送会真的执行，必须让新版本以只读/影子模式运行，否则会重复下单；
*   `mirror_request_body on` 会缓存请求体，大文件上传场景慎用；
*   镜像请求失败不影响主请求，但会占用后端连接，QPS 高时要评估新版本能不能扛住。

## 十四、日志与指标

### 14.1 结构化日志的字段设计

上一节的 `main_json` 已经包含核心字段。这里说几个容易漏的：

字段

为什么需要

`request_id`

串联网关日志和后端日志，后端要把这个 header 打进自己的日志

`upstream_addr`

定位是哪台后端出的问题，重试时能看到 `10.20.1.11:8080, 10.20.1.12:8080`

`upstream_status`

与 `status` 不一致时说明发生了重试或 error\_page 转换

`upstream_connect_time`

区分"连不上"和"处理慢"

`request_length`

识别异常大的请求体（攻击或客户端 bug）

`ssl_protocol`

统计还有多少客户端在用 TLS 1.2，决定何时能只留 1.3

`host`

多域名共用一个日志文件时区分业务

`$request_id` 是 Nginx 1.11.0 引入的内置变量，32 位十六进制随机串。它的值在请求生命周期内固定，可以直接作为 trace id 使用。

后端接入方式（Spring Boot 示例，仅示意取值逻辑）：

   java

`// 伪代码：从请求头取 request id，放进 MDC，日志模板里输出   String rid = request.getHeader("X-Request-ID");   if (rid == null || rid.isBlank()) {       rid = UUID.randomUUID().toString().replace("-", "");   }   MDC.put("requestId", rid);   `

### 14.2 日志切割

Nginx 自己不管切割，靠 logrotate：

   bash

`cat > /etc/logrotate.d/nginx <<'EOF'   /var/log/nginx/*.log {       daily       rotate 14       missingok       notifempty       compress       delaycompress       dateext       dateformat -%Y%m%d       sharedscripts       postrotate           [ -f /run/nginx.pid ] && kill -USR1 $(cat /run/nginx.pid)       endscript   }   EOF   `

`kill -USR1` 让 Nginx 重新打开日志文件，这是唯一正确的切割方式。用 `copytruncate` 会丢日志（copy 和 truncate 之间的写入丢失），而且大文件 copy 很慢。

验证：

   bash

`logrotate -d /etc/logrotate.d/nginx    # dry-run 看逻辑   logrotate -f /etc/logrotate.d/nginx    # 强制执行一次   ls -lh /var/log/nginx/   `

### 14.3 stub\_status 与 Prometheus 指标

   nginx

`server {       listen 127.0.0.1:8080;       server_name _;       access_log off;      location /stub_status {           stub_status;           allow 127.0.0.1;           deny all;       }   }  `

   bash

`curl -s http://127.0.0.1:8080/stub_status   `

输出：

   text

`Active connections: 291   server accepts handled requests    16630948 16630948 31070465   Reading: 6 Writing: 179 Waiting: 106   `

四个数字的含义：

*   `Active connections`：当前活跃连接数，包含 Reading + Writing + Waiting；
*   `accepts`：累计接受的连接数；
*   `handled`：累计处理的连接数。**如果 accepts 大于 handled，说明有连接被丢弃**，通常是 `worker_connections` 不够或文件描述符耗尽；
*   `requests`：累计请求数。`requests / handled` 就是平均每条连接处理了几个请求，这个值接近 1 说明 keepalive 没生效。

`Reading` 是正在读请求头的连接数，`Writing` 是正在写响应的，`Waiting` 是 keepalive 空闲连接。`Waiting` 持续很高而 `Writing` 很低，说明连接都闲着，是正常的；`Reading` 异常高（几百上千）说明有慢速攻击（slowloris），要靠 `client_header_timeout` 挡。

接入 Prometheus：

   bash

`# 以 systemd 方式运行 exporter   cat > /etc/systemd/system/nginx-exporter.service <<'EOF'   [Unit]   Description=NGINX Prometheus Exporter   After=network-online.target  [Service]   User=nginx   Group=nginx   ExecStart=/usr/local/bin/nginx-prometheus-exporter \     --nginx.scrape-uri=http://127.0.0.1:8080/stub_status \     --web.listen-address=:9113   Restart=on-failure   RestartSec=5  [Install]   WantedBy=multi-user.target   EOF  systemctl daemon-reload   systemctl enable --now nginx-exporter   curl -s http://127.0.0.1:9113/metrics | grep -E "^nginx_" | head -20  `

导出的指标（以 exporter 1.x 为准）：

指标

含义

用途

`nginx_up`

能否抓到 stub\_status

网关存活告警

`nginx_connections_active`

活跃连接

容量水位

`nginx_connections_reading`

读请求头中

慢速攻击检测

`nginx_connections_writing`

写响应中

后端慢导致堆积

`nginx_connections_waiting`

keepalive 空闲

判断连接复用

`nginx_http_requests_total`

累计请求数

QPS = rate()

注意 `stub_status` 只提供全局数字，**没有按域名、按状态码的维度**。要按维度分析，必须解析 access log。两条路：

1.  日志走 Filebeat/Vector → Loki/ES，用日志查询做分析；
2.  用 `nginx-prometheus-exporter` 的 Plus 模式（需要 Nginx Plus 的 `/api` 端点）拿到分 upstream 的指标。

开源版的现实做法是"指标看趋势，日志看细节"。

### 14.4 告警阈值怎么定

阈值不能拍脑袋，要基于基线。下面这套是某中等流量网关（峰值 8000 QPS）的实际配置，供参考：

告警

表达式

阈值

说明

网关存活

`nginx_up == 0`

持续 1m

抓不到 stub\_status，可能进程挂了或端口不通

5xx 比例

`sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) / sum(rate(nginx_http_requests_total[5m]))`

\> 0.5% 持续 5m

需要日志侧提供带 status 标签的指标，stub\_status 没有

活跃连接水位

`nginx_connections_active / (worker_processes * worker_connections / 2)`

\> 0.7 持续 10m

接近上限前扩容

丢弃连接

`increase(nginx_connections_accepted[5m]) - increase(nginx_connections_handled[5m])`

\> 0

有连接被丢，立即查

读头连接堆积

`nginx_connections_reading`

\> 200 持续 5m

疑似 slowloris 或客户端异常

上游超时

日志侧 \`count\_over\_time({job=“nginx”}

\= “upstream timed out” \[5m\])\`

\> 10

`stub_status` 没有 status 维度，所以 5xx 比例的告警要基于日志（Loki/ES）或 access log 转指标（mtail、vector 的 prometheus exporter）。这一点很多文章不讲，直接给一个 `nginx_http_requests_total{status="500"}` 的表达式，实际根本查不到数据。

## 十五、上线流程

### 15.1 预发验证

生产变更前，先在预发环境用生产配置跑一遍：

   bash

`# 1. 配置语法   nginx -t -c /etc/nginx/nginx.conf  # 2. 用生产配置启动一个临时实例（不同端口），验证能否正常加载   nginx -t -c /etc/nginx/nginx.conf -g "pid /tmp/nginx-test.pid;"  # 3. 容器里跑一遍，确保配置不依赖宿主机特有条件   docker run --rm -v /etc/nginx:/etc/nginx:ro nginx:1.30.6 nginx -t  `

第 3 步的意义：有些配置依赖宿主机路径（证书、日志目录），容器里 `nginx -t` 会暴露路径不存在的问题，比上线后才发现好。

### 15.2 压测

压测的目的不是刷一个漂亮的 QPS 数字，而是找出**第一个瓶颈**。步骤：

   bash

`# 静态文件基线：排除后端影响   wrk -t8 -c400 -d60s --latency https://gateway.example.com/static/1k.html  # 动态接口：走后端   wrk -t8 -c200 -d60s --latency -H "Host: api.example.com" https://gateway.example.com/api/v1/products  # 带 TLS 握手压力的短连接测试   wrk -t4 -c100 -d30s --latency -H "Connection: close" https://gateway.example.com/api/v1/products  `

看结果时关注四个数：

   text

`Running 1m test @ https://gateway.example.com/api/v1/products     8 threads and 200 connections     Thread Stats   Avg      Stdev     Max   +/- Stdev       Latency    38.42ms   12.11ms 412.00ms   91.23%       Req/Sec     1.31k    187.44     2.10k    78.12%     Latency Distribution        50%   35.11ms        75%   42.30ms        90%   51.02ms        99%  102.44ms     623451 requests in 60.05s, 1.21GB read     Socket errors: connect 0, read 0, write 0, timeout 12   Requests/sec:  10382.11   Transfer/sec:     20.63MB   `

判断依据：

*   `Socket errors: connect` 非 0，说明 backlog 或文件描述符不够；
*   `timeout` 非 0，说明有请求超过了压测工具的默认超时，要去 error.log 找 `upstream timed out`；
*   P99 是 P50 的 3 倍以上，说明有长尾，通常是后端 GC 或慢 SQL；
*   `Requests/sec` 上不去但 CPU 没满，看是不是带宽打满（`Transfer/sec` 接近网卡上限）或后端先到瓶颈。

压测必须在**预发**做，不要在生产直接压。生产压测的风险：真实用户受影响、触发限流误伤、打挂后端。如果一定要在生产验证，用单台实例摘流量的方式，压完立刻恢复。

### 15.3 灰度上线

双机网关的标准流程：

   bash

`# 前置：配置已进 Git，CI 已跑过 nginx -t   # 步骤 1：备份当前配置   ssh gw01 "cp -a /etc/nginx /etc/nginx.bak/$(date +%Y%m%d-%H%M%S)"  # 步骤 2：同步新配置到 gw01   rsync -av --delete nginx-conf/ gw01:/etc/nginx/  # 步骤 3：校验   ssh gw01 "nginx -t"  # 步骤 4：reload（不是 restart）   ssh gw01 "systemctl reload nginx"  # 步骤 5：验证 worker 已换新   ssh gw01 "ps -eo pid,lstart,cmd | grep 'nginx: worker' | grep -v grep"  # 步骤 6：观察 10 分钟指标与错误日志   ssh gw01 "tail -f /var/log/nginx/error.log | grep -E 'emerg|alert|crit'"  `

观察项：

指标

观察窗口

正常范围

5xx 比例

10 分钟

与变更前持平，波动 < 0.1%

P99 延迟

10 分钟

变化 < 10%

error.log 新增 error

10 分钟

无新的 `upstream` 类错误

活跃连接数

10 分钟

与另一台持平

gw01 稳定后再操作 gw02。两台都完成后，VIP 上的流量已经全部走新配置（Keepalived 不感知 Nginx 配置，只做 VIP 漂移，所以两台都要改）。

### 15.4 回滚

回滚要能在 1 分钟内完成：

   bash

`# 方式一：从备份目录恢复（最快）   ssh gw01 "rsync -a --delete /etc/nginx.bak/20261020-1430/ /etc/nginx/ && nginx -t && systemctl reload nginx"  # 方式二：从 Git 回退（可追溯）   cd /opt/nginx-conf && git revert --no-edit HEAD && \     rsync -av --delete ./ gw01:/etc/nginx/ && ssh gw01 "nginx -t && systemctl reload nginx"  # 方式三：版本回退（配置没问题但二进制有 bug）   dnf downgrade nginx-1.30.5-1.el9.ngx   systemctl restart nginx  `

回滚的注意事项：

*   **reload 回滚不会恢复已断的连接**，但新连接立刻用旧配置；
*   如果新配置改了 `listen` 端口或删了 server 块，reload 后旧 worker 还在处理旧连接，最多持续 `worker_shutdown_timeout`（默认不限制，建议显式设 30s）；
*   二进制降级必须 `restart`，因为已加载的模块不会卸载。restart 会断开所有连接，要在低峰做。

`worker_shutdown_timeout` 建议在 `main` 段配置：

   nginx

`worker_shutdown_timeout 30s;   `

它的作用是：reload 或 stop 时，旧 worker 最多等 30 秒就强制退出，避免长连接把旧 worker 拖住导致内存不释放。

## 十六、故障排查：按状态码和日志定位

### 16.1 排查的通用起点

拿到"网关有问题"这个模糊描述后，先做三件事，不要直接改配置：

   bash

`# 1. 看错误日志的分布（不是逐行看，是看聚合）   grep -oE '\[(emerg|alert|crit|error)\]' /var/log/nginx/error.log | sort | uniq -c | sort -rn  # 2. 看 access log 的状态码分布（最近 10 分钟）   jq -r 'select(.ts > "2026-03-14T10:00:00") | .status' /var/log/nginx/api.access.log \     | sort | uniq -c | sort -rn  # 3. 看当前连接状态   curl -s http://127.0.0.1:8080/stub_status   ss -s  `

第 1 步的聚合能立刻区分"是 502 多还是超时多"，第 2 步能看出是集中在某个接口还是全局，第 3 步能看出是不是连接数打满。

### 16.2 502 Bad Gateway

502 意味着 Nginx 从上游拿不到合法响应。按 error.log 的具体文案分支：

**分支 A：连接被拒绝**

   text

`connect() failed (111: Connection refused) while connecting to upstream   `

原因：后端进程没起来、端口错了、被防火墙拦了、SELinux 拒绝。

   bash

`# 从网关机器直接验证   curl -sv --connect-timeout 2 http://10.20.1.11:8080/healthz   nc -zv 10.20.1.11 8080   # 检查后端是否真的在听   ssh 10.20.1.11 "ss -lntp | grep 8080"   `

如果 `curl` 通但 Nginx 报 111，看 SELinux：`ausearch -m avc -ts recent | grep nginx`。

**分支 B：连接超时**

   text

`upstream timed out (110: Connection timed out) while connecting to upstream   `

这是 `proxy_connect_timeout` 到期，TCP 三次握手没完成。和 111 的区别：111 是对方明确拒绝（端口没开），110 是包发出去没回应（网络不通、被丢包、后端 accept 队列满）。

判断依据：

   bash

`# 看是否有丢包   ping -c 20 10.20.1.11   mtr -rwc 20 10.20.1.11  # 看后端 accept 队列是否溢出（在后端机器上）   nstat -az | grep -E "ListenOverflows|ListenDrops"  `

`TcpExtListenOverflows` 增长说明全连接队列满了，要调 `somaxconn` 和应用的 backlog。

**分支 C：上游提前关闭**

   text

`upstream prematurely closed connection while reading response header from upstream   `

最常见的原因是 keepalive 连接被后端关掉了（见 3.3 节）。也可能是后端进程崩溃、OOM Killer、被发布重启。

判断依据：看 `$upstream_addr` 是否集中在某台，看后端日志时间点是否有重启记录：

   bash

`ssh 10.20.1.11 "journalctl -u app --since '10 min ago' | grep -iE 'start|stop|killed'"   dmesg -T | grep -i "killed process"   `

**分支 D：响应头过大**

   text

`upstream sent too big header while reading response header from upstream   `

调 `proxy_buffer_size`，见 3.5 节。

### 16.3 504 Gateway Timeout

504 是 `proxy_read_timeout` 到期，Nginx 等后端响应等到超时。

排查路径：

   bash

`# 1. 从 access log 找出 504 的接口和耗时分布   jq -r 'select(.status==504) | "\(.uri) \(.upstream_addr) \(.upstream_response_time)"' \     /var/log/nginx/api.access.log | sort | uniq -c | sort -rn | head  # 2. 看这些请求打到了哪台后端   # 输出示例：   #   412 /api/v1/reports/export 10.20.1.12:8080 60.001   #   388 /api/v1/reports/export 10.20.1.13:8080 60.002   #    12 /api/v1/orders          10.20.1.11:8080 60.000  `

如果 `upstream_response_time` 恰好等于 `proxy_read_timeout`，说明后端确实没在超时时间内返回。接着去后端看：

   bash

`# 后端线程栈（Java）   jstack <pid> | grep -A 20 "http-nio" | head -60  # 后端慢查询（MySQL）   mysql -e "SELECT id, time, state, LEFT(info,120) FROM information_schema.processlist             WHERE time > 10 ORDER BY time DESC LIMIT 10;"  `

如果 `upstream_response_time` 明显小于超时时间但仍是 504，说明超时发生在读响应体的过程中（`proxy_read_timeout` 也管两次读之间的间隔），后端在流式返回时卡住了。

还有一种隐蔽情况：**后端返回了 200 但一直不结束响应**（比如 SSE 没发心跳）。这时 `$upstream_header_time` 很小，`$upstream_response_time` 等于超时值，`$status` 是 504。处理方式是给这类接口单独调大超时并加心跳。

### 16.4 499 Client Closed Request

499 是 Nginx 自定义状态码，含义是"客户端在 Nginx 返回响应前关闭了连接"。它**不是错误**，但数量突增说明用户等不及了。

   bash

`jq -r 'select(.status==499) | .uri' /var/log/nginx/api.access.log | sort | uniq -c | sort -rn | head   `

典型原因：

*   后端慢，用户主动取消（前端有 30 秒超时，后端要 45 秒）；
*   页面跳转导致请求被取消（正常现象，量小可忽略）；
*   客户端网络差，连接断了。

判断依据：如果 499 集中在某几个接口，且这些接口的 P99 接近前端超时时间，就是"后端太慢导致用户放弃"。修后端，不是修 Nginx。

### 16.5 413 Request Entity Too Large

`client_max_body_size` 限制。这个错误的坑在于：**Nginx 在读完请求头就返回 413，客户端可能还在传 body**，用户看到的是"上传失败"但不知道原因。

   bash

`# 确认是哪个 location 的限制   nginx -T | grep -n "client_max_body_size"   `

处理时要注意分层：全局 20m，上传接口 500m，但**中间还有一层**——如果有 L4/L7 负载均衡在前面，它也有 body 限制，改了 Nginx 还是 413。阿里云 SLB、AWS ALB 都有默认限制，要一起改。

### 16.6 429 与限流误伤

429 是自己配的限流生效了。排查是不是误伤：

   bash

`# 看被限流的 IP 分布   grep "limiting requests" /var/log/nginx/error.log | \     awk -F'client: ' '{print $2}' | awk -F',' '{print $1}' | sort | uniq -c | sort -rn | head  # 看某个 IP 的请求模式   jq -r 'select(.remote_addr=="10.30.7.88") | "\(.ts) \(.uri) \(.status)"' \     /var/log/nginx/api.access.log | tail -50  `

如果被限流的是正常用户（比如公司出口 IP 后面几百人），说明按 IP 限流不适用，要改成按用户 ID（从 header 或 cookie 取）：

   nginx

`map $http_authorization $limit_key {       ""      $binary_remote_addr;       default $http_authorization;   }  limit_req_zone $limit_key zone=peruser:20m rate=20r/s;  `

注意：用 `$http_authorization` 做 key 会把 token 存进共享内存，有泄露风险（`nginx -T` 或者 core dump 能看到）。更安全的做法是后端在响应头里返回一个用户 ID，网关用 `auth_request` 拿到后作为 key，或者干脆把限流下移到应用层。

### 16.7 too many open files

   text

`2026/03/14 11:02:33 [alert] 2811#0: *2011223 socket() failed (24: Too many open files)   `

按 5.3 节的三层配置检查。特别注意：**改完 systemd 的 LimitNOFILE 必须 restart，不是 reload**。reload 只重启 worker，master 的限制不变，而 socket 是 worker 创建的，worker 继承 master 的限制。

验证方式：

   bash

`cat /proc/$(cat /run/nginx.pid)/limits | grep "open files"   cat /proc/$(pgrep -f "nginx: worker" | head -1)/limits | grep "open files"   `

两个都要是目标值。

### 16.8 排查决策表

现象

首先看

关键证据

常见根因

502 突增

error.log 文案

`Connection refused` / `timed out` / `prematurely closed`

后端挂、网络不通、keepalive 不匹配

504 突增

`$upstream_response_time`

等于超时阈值

后端慢查询、锁等待、GC

499 突增

接口分布

集中在慢接口

前端超时短于后端耗时

413

`nginx -T`

body 限制值

上传大小配置、前置 LB 限制

429

error.log `limiting`

被限 IP/用户

阈值过低、共享出口 IP

连接数打满

stub\_status

`active` 接近上限

慢请求堆积、连接泄漏

吞吐上不去

`ss -s`、`nstat`

TIME\_WAIT 多、重传多

keepalive 未开、内核参数

间歇性 502

`$upstream_addr`

集中在单台

单台后端异常、被摘除又恢复

## 十七、性能调优

### 17.1 先测量，再调参

调优的顺序必须是：**压测找瓶颈 → 定位瓶颈类型 → 只调对应参数 → 复测**。不测量就调参，等于蒙。

三类瓶颈的判断方法：

   bash

`# CPU 瓶颈：us 高，sy 低   top -b -n1 | head -5  # 上下文切换瓶颈：cs 高，sy 高   vmstat 1 5  # 网络瓶颈：带宽打满，重传增加   sar -n DEV 1 5   nstat -az | grep -E "Retrans|Drop"  `

如果 `us` 高，是 Nginx 在做压缩、TLS、正则；如果 `sy` 高，是系统调用多（连接数太多、小包太多）；如果 `wa` 高，是日志或临时文件写磁盘。

### 17.2 关键参数与取舍

   nginx

`# worker 数量：等于逻辑核数，或略少   worker_processes auto;  # 绑定 CPU，减少缓存失效（容器里慎用，cpuset 可能对不上）   worker_cpu_affinity auto;  events {       # 单 worker 连接上限，按内存和业务定       worker_connections 10240;       multi_accept on;       use epoll;   }  http {       # 静态文件       sendfile on;       tcp_nopush on;      # 配合 sendfile，攒满一个包再发       tcp_nodelay on;     # 对 keepalive 连接禁用 Nagle      # 连接复用       keepalive_timeout 65s;       keepalive_requests 1000;      # 文件描述符缓存       open_file_cache max=20000 inactive=60s;       open_file_cache_valid 30s;       open_file_cache_min_uses 2;   }  `

`tcp_nopush` 和 `tcp_nodelay` 看似矛盾，实际是配合使用：`tcp_nopush` 只在 `sendfile on` 时生效，作用是把响应头和文件开头凑成一个包发出去；`tcp_nodelay` 对 keepalive 连接生效，避免小包被 Nagle 算法拖延。两个都开是官方推荐。

### 17.3 不要开的优化

有些"优化"在网上流传很广，但实际有害：

*   **`worker_processes` 设成核数的 2 倍**。多进程不会提升吞吐，只会增加上下文切换和内存占用。Nginx 是事件驱动，一个 worker 能吃满一个核。
*   **`gzip_comp_level 9`**。CPU 成本翻倍，压缩率只提升 2%-3%。对高 QPS 网关是净亏损。
*   **`proxy_buffering off` 全局开**。会让后端连接一直占着，吞吐下降。只在流式接口开。
*   **`access_log off`**。省的那点 IO 远不如排查时没有日志的代价。
*   **`worker_connections 65535`**。数字大不等于能力强，内存和文件描述符先撑不住。

### 17.4 静态资源优化

   nginx

`location /static/ {       root /var/www;       # 用 add_header 直接给完整的 Cache-Control，避免与 expires 重复下发两个头       add_header Cache-Control "public, max-age=2592000, immutable" always;       access_log off;      # 预压缩文件优先       gzip_static on;      # 大文件下载用 sendfile       sendfile on;       sendfile_max_chunk 512k;   }  `

`gzip_static on` 需要预先用 `gzip -9` 生成 `.gz` 文件，Nginx 直接返回压缩好的文件，省掉实时压缩的 CPU。对 JS/CSS 这类不常变的文件，这是最划算的优化。

`sendfile_max_chunk 512k` 限制单次 `sendfile` 调用的大小，避免一个大文件下载独占 worker 太久，影响其他请求。

### 17.5 上游连接池容量

`keepalive 128` 是每个 worker 的空闲连接上限。8 个 worker 就是 1024 条到后端的连接。这个数字要和后端的连接池匹配：

*   后端 Tomcat `maxThreads=200`，3 台共 600 个处理线程；
*   Nginx 侧 1024 条连接，超过后端处理能力，多出来的会在后端 accept 队列排队；
*   合理值：`keepalive` ≈ 后端单台处理能力 × 1.2 / worker 数。

如果后端连接数不够，会出现"连接建立了但请求排队"，表现为 `$upstream_connect_time` 很小、`$upstream_header_time` 很大。这时候加 Nginx 的 keepalive 没用，要加后端线程数或实例。

## 十八、安全加固

### 18.1 基础项

   nginx

`# 隐藏版本   server_tokens off;  # 限制请求方法（按接口实际需要）   if ($request_method !~ ^(GET|POST|PUT|DELETE|HEAD|OPTIONS)$) {       return 405;   }  # 拒绝可疑 User-Agent（只挡明显的扫描器，不要做复杂的 UA 黑名单）   if ($http_user_agent ~* (sqlmap|nikto|nmap|masscan|zgrab)) {       return 403;   }  `

`if` 在 location 里用有"if is evil"的说法，但在 `return` 场景是安全的（属于 rewrite 阶段的合法用法）。不要在 `if` 里写 `proxy_pass`，那会产生难以预料的行为。

### 18.2 请求体与头部校验

   nginx

`# 限制请求头大小，防 header 炸弹   large_client_header_buffers 4 16k;  # 限制 URL 长度（默认 8k，超长 URL 通常是攻击）   # 这个没有直接指令，靠 client_header_buffer_size 和 large_client_header_buffers 间接限制  # 拒绝空 Host   if ($host = "") {       return 444;   }  # 只允许特定 Host（防止 Host 头攻击）   server {       listen 443 ssl;       server_name api.example.com;       if ($host !~ ^(api\.example\.com)$) {           return 444;       }       # ...   }  `

Host 头攻击的危害：如果后端用 Host 生成绝对 URL（比如密码重置链接），攻击者伪造 Host 就能让链接指向自己的域名。网关层做白名单是最省事的防御。

### 18.3 真实客户端 IP

网关前面有 L4 负载均衡（SLB、F5、LVS）时，`$remote_addr` 是 LB 的 IP，所有客户端看起来是同一个 IP，限流会误伤全站。

   nginx

`# 只信任来自 LB 网段的 X-Forwarded-For   set_real_ip_from 10.20.0.0/24;   set_real_ip_from 100.64.0.0/10;   real_ip_header X-Forwarded-For;   real_ip_recursive on;   `

三个参数的作用：

*   `set_real_ip_from`：信任哪些代理。**必须精确到网段**，写 `0.0.0.0/0` 等于允许任何人伪造 IP，限流和审计全部失效。
*   `real_ip_header`：从哪个头取真实 IP。LB 通常用 `X-Forwarded-For`，Cloudflare 用 `CF-Connecting-IP`。
*   `real_ip_recursive on`：从右往左找第一个不在信任列表里的 IP。不开的话取最右边的值，那个值可能是攻击者伪造的。

验证：

   bash

`curl -s -H "X-Forwarded-For: 1.2.3.4" https://api.example.com/whoami   # 期望返回 1.2.3.4（如果 1.2.3.4 不在信任网段）   # 如果返回 1.2.3.4 但你的 LB 不在 10.20.0.0/24，说明配置没生效或信任范围写错   `

### 18.4 响应头

   nginx

`# /etc/nginx/snippets/security-headers.conf   add_header X-Content-Type-Options "nosniff" always;   add_header X-Frame-Options "SAMEORIGIN" always;   add_header Referrer-Policy "strict-origin-when-cross-origin" always;   add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;   add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self'" always;   `

`X-Frame-Options` 和 CSP 的 `frame-ancestors` 功能重叠，现代浏览器优先看 CSP。两个都配是为了兼容老浏览器。

CSP 是最容易配错的一项：写太严会导致页面白屏（内联脚本被拦），写太松等于没写。上线前用 `Content-Security-Policy-Report-Only` 观察一周，收集违规报告再收紧。

`add_header` 有个继承陷阱：**location 里只要出现任何 `add_header`，父级的 `add_header` 全部失效**。所以 `security-headers.conf` 要在每个 location 里 include，或者用 1.29.3+ 的 `add_header_inherit merge`：

   nginx

`add_header_inherit merge;   # 1.29.3+   `

### 18.5 拒绝目录穿越

   nginx

`# 静态资源目录禁止执行脚本、禁止列目录   location /static/ {       root /var/www;       autoindex off;       location ~* \.(php|jsp|asp|sh|py)$ {           return 403;       }   }  # 禁止访问隐藏文件   location ~ /\.(?!well-known) {       deny all;       access_log off;       log_not_found off;   }  `

`location ~ /\.(?!well-known)` 这个正则用了负向预查，放行 `.well-known`（ACME 验证需要），拒绝其他所有点开头的路径。如果写成 `location ~ /\.` 会把 `.well-known` 也挡掉，导致证书续期失败。

`alias` 的路径拼接是目录穿越的高发点。`location /img/ { alias /data/images/; }` 在请求 `/img../etc/passwd` 时，如果没做规范化，可能读到 `/data/etc/passwd`。Nginx 内部会做 URI 规范化，但配合 `rewrite` 时仍出过 CVE（1.30.6 修的 CVE-2026-15176 就是这类）。用 `root` 代替 `alias` 能规避大部分问题。

## 十九、生产注意事项

### 19.1 变更窗口与权限

*   网关配置变更安排在业务低峰（通常是凌晨 2:00-5:00），但**不是所有变更都需要窗口**：加一个 location、调一个超时，可以在白天灰度；改 TLS 协议版本、改限流阈值、改 upstream，必须走窗口。
*   生产配置目录的写权限只给运维账号，且必须有 sudo 审计日志。`/etc/nginx` 的属主是 root，权限 755，配置文件 644。
*   禁止在网关机器上用 `vim` 直接改配置。流程是：本地改 → Git 提交 → CI 校验 → 发布系统推送。手工改的配置在下一次发布时会被覆盖，这是设计意图。

### 19.2 配置即代码

   text

`repo/   ├── nginx/   │   ├── nginx.conf   │   ├── conf.d/   │   ├── sites/   │   └── snippets/   ├── tests/   │   ├── syntax.sh          # nginx -t   │   └── smoke.sh           # 起容器，curl 关键路径   └── .gitlab-ci.yml   `

CI 的关键步骤：

   bash

`#!/usr/bin/env bash   # tests/syntax.sh   set -euo pipefail  IMAGE="nginx:1.30.6"   CONF_DIR="$(cd "$(dirname "$0")/../nginx" && pwd)"  docker run --rm \     -v "${CONF_DIR}:/etc/nginx:ro" \     "${IMAGE}" nginx -t  `

注意：容器里 `nginx -t` 会因为证书文件不存在而失败。解决办法是在 CI 里生成自签证书挂进去，或者把证书路径做成变量。不要在 CI 里跳过 `nginx -t`，那是最后一道防线。

### 19.3 双机一致性

两台网关的配置必须完全一致，否则 VIP 漂移后行为不同。保障手段：

   bash

`# 定时比对（放在监控里，不一致就告警）   for f in $(cd /etc/nginx && find . -name "*.conf" | sort); do     a=$(ssh gw01 "sha256sum /etc/nginx/$f" | awk '{print $1}')     b=$(ssh gw02 "sha256sum /etc/nginx/$f" | awk '{print $1}')     [[ "$a" == "$b" ]] || echo "DIFF: $f"   done   `

更彻底的做法是用配置管理工具（Ansible）保证幂等，或者把配置打进镜像，用容器跑 Nginx。容器化的代价是：reload 需要通过信号或 `nginx -s reload` 在容器内执行，且证书挂载要用 volume。

### 19.4 容量规划

按峰值算，不要按均值：

   text

`峰值 QPS × 平均响应时间 = 需要的并发连接数（Little's Law）   `

举例：峰值 8000 QPS，平均响应 80ms，则并发 ≈ 640。加上 keepalive 空闲连接（通常是活跃的 2-3 倍），单机需要约 2000 个连接。8 核 × 10240 = 81920 的连接上限，余量充足。

真正的瓶颈通常在别处：

*   出口带宽：8000 QPS × 平均响应 20KB = 160MB/s，1Gbps 网卡刚好打满；
*   后端连接数：640 并发 × 每请求 1 条 upstream 连接 = 640 条，后端 3 台每台 214 条，要看后端线程池够不够；
*   TLS 握手：短连接场景下每秒 8000 次握手，单核约能处理 1000-2000 次/秒（RSA 2048），8 核勉强够，必须靠 session 复用降低。

### 19.5 日志保留与合规

*   access log 保留 14 天，压缩后每天约 200MB（8000 QPS 的 JSON 日志），14 天约 3GB；
*   error log 保留 30 天，量小但排查价值高；
*   含个人信息的字段（`$remote_addr`、`$http_user_agent`、URL 里的手机号）要考虑合规要求，必要时脱敏；
*   日志写入独立分区，避免把根分区写满导致 Nginx 无法写日志而拒绝服务。

`access_log` 写失败时 Nginx 的行为：默认会继续服务，但 error.log 里刷 `write() failed (28: No space left on device)`。如果 error.log 也写不了，worker 会退出。所以两个日志目录都要监控磁盘。

## 二十、上线检查清单

### 20.1 配置层

项

检查方式

通过标准

语法

`nginx -t`

无 error，warning 已知且可接受

版本

`nginx -v`

与预期一致，无已知高危 CVE

默认 server

`curl -I http://<ip>/`

返回 444 或 403，不泄露信息

版本号隐藏

`curl -I https://domain/`

Server 头无版本号

TLS 协议

`openssl s_client -tls1_1`

握手失败

证书链

`openssl s_client -showcerts`

完整，含中间证书

HSTS

`curl -I`

有 Strict-Transport-Security

真实 IP

带 XFF 请求

`$remote_addr` 是客户端 IP

限流 dry-run

压测观察 error.log

excess 在预期范围

### 20.2 运行层

项

检查方式

通过标准

文件描述符

`/proc/<pid>/limits`

≥ 65535

worker 数

`ps`

等于 CPU 核数

连接数水位

`stub_status`

active < 上限 50%

连接丢弃

accepts vs handled

相等

error.log

最近 10 分钟

无 emerg/alert/crit

上游健康

`$upstream_status` 分布

无集中 5xx

日志切割

`ls /var/log/nginx`

有历史文件，无超大单文件

监控

Prometheus targets

`nginx` job 为 UP

### 20.3 业务层

项

检查方式

通过标准

核心接口

冒烟脚本

全部 200，耗时在基线内

上传

传一个 100MB 文件

成功，`$request_time` 合理

下载

下载 500MB 文件

成功，无 504

长连接

WebSocket 连接保持 10 分钟

不断开

流式

SSE 首字节时间

< 1s，持续输出

灰度

带 canary header 请求

命中新版本

回滚

执行一次回滚演练

1 分钟内恢复

## 二十一、总结

搭建生产可用的 Nginx 网关，难点不在配置语法，而在三件事：

**第一，知道每个默认值为什么不适合生产。**`worker_connections 1024`、`proxy_read_timeout 60s`、`client_max_body_size 1m`、`proxy_buffer_size 4k`，这四个默认值分别对应连接数打满、慢接口拖死、上传失败、大 Cookie 502。文章里每个参数都给了它对应的故障现象，就是为了让调参有依据，而不是抄一份"最佳实践"。

**第二，把可观测性做在前面。** 结构化日志里的 `$request_time`、`$upstream_response_time`、`$upstream_addr`、`$upstream_status`，加上 `stub_status` 的四个数字，构成了排查的最小信息集。没有这些，出故障只能猜；有了这些，502 和 504 的区分、单台后端异常、keepalive 失效都能在几分钟内定位。

**第三，变更流程比配置本身更重要。** 配置进 Git、CI 跑 `nginx -t`、双机灰度 reload、备份目录带时间戳、回滚脚本演练过。这五件事做到，即使配置写错了，影响也能控制在单台、几分钟内。

最后给一份最小可用的落地顺序，适合从零开始的团队：

1.  装官方源 1.30.6，锁版本，配好 `LimitNOFILE`；
2.  按第七节的骨架搭 `nginx.conf`，先只服务一个域名；
3.  加 `main_json` 日志和 `stub_status`，接上 Prometheus；
4.  配 upstream keepalive，把 `keepalive_timeout` 调到小于后端空闲超时；
5.  按接口分级超时（普通 API 10s、报表 180s、上传 300s、SSE 3600s）；
6.  TLS 上 1.2/1.3，开 session cache，配 OCSP stapling；
7.  限流先 dry-run 观察 24 小时，再开；
8.  压测找瓶颈，只调对应参数；
9.  写回滚脚本，演练一次；
10.  把这九步写进团队的上线清单。

这套流程走完，网关才算"可上线"，而不是"能访问"。