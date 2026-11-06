---
id: wiki-concept-nginx-rate-limiting
type: concept
title: Nginx 限流（limit_req / limit_conn）
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - concept
  - nginx
  - traffic-control
sources:
  - raw/sources/architecture/2026-11-06-nginx-rate-limiting-practice.md
  - raw/sources/architecture/2026-11-04-nginx-gateway-production.md
related:
  - wiki/concepts/nginx-gateway-production-design.md
  - wiki/sources/nginx-gateway-production.md
  - wiki/concepts/traffic-control-layering.md
---
# Nginx 限流（limit_req / limit_conn）

## Definition（定义）

在 Nginx 网关层用共享内存 zone 按 key（通常 `$binary_remote_addr`）对客户端限平均速率（漏桶）与并发连接数，把突发流量挡在后端之前。四步落地链路：**看日志辨特征 → limit_req 限平均速率 → limit_conn 控并发 + 白名单 → 压测验证灰度收紧**。

## Why It Matters（为什么重要）

半夜告警 QPS 从 50 冲到 3000、连接池打满、正常用户超时——十有八九是爬虫或失控客户端。此时首要动作不是后端加锁加缓存，而是在 Nginx 层按住流量：限流在边缘拦截的成本远低于打穿后端。

## Core Characteristics（核心特征）

1. **第一步先看 access.log 再定策略**：`awk '{print $1}' access.log | sort | uniq -c | sort -rn | head` 看 IP 排行；`awk '{print $1, $7}' access.log | sort | uniq -c | sort -rn | head` 看 IP+URI 组合。重点三件事：单 IP 请求数异常（刷子一分钟几千 vs 正常用户几十）/ URI 是否高度集中（只打登录、下单、验证码即典型刷接口）/ 是否有拨测、健康检查等固定 IP 需排除，别把自己的探针限了。
2. **limit_req 限平均速率（漏桶）**：核心两行——`limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;`（**必须放 http 层**，写错直接报错）；location 里 `limit_req zone=req_limit burst=20 nodelay;`。三个参数语义：`rate=10r/s` 是平均速率不是瞬时上限；`burst=20` 是突发容量桶，允许瞬间多来 20 个；`nodelay` 让桶内请求**立刻放行**——不加它桶内请求排队慢慢放，表现为「限流后接口反而更慢、超时更多」，是最经典的坑。
3. **limit_conn 控并发**：`limit_conn_zone $binary_remote_addr zone=conn_limit:10m;` + `limit_conn conn_limit 5;`，对付速率不高但长连接一直占着的慢速拉取（如 `/download/` 单 IP 限 5 并发）。
4. **白名单用 geo + map**：`geo $limit_key { default $binary_remote_addr; 10.0.0.0/8 ""; }` + `map $limit_key $req_key { default $binary_remote_addr; "" ""; }`——**key 置空串即不限流**，用于内网、拨测源。白名单漏配置会假红告警。
5. **拒绝码与 key 细节**：默认拒绝码是 503（语义是"服务不可用"，易被误判为故障），应改 `limit_req_status 429`；key 用 `$binary_remote_addr` 比 `$remote_addr` 每条省一半内存，10m zone 约可跟踪 16 万 IP。

## How It Works（运作方式）

请求进入 location 时，Nginx 按 key 在共享内存 zone 中查漏桶：未超平均速率直接放行；超速率时若有 burst 余量则入桶——有 `nodelay` 立即放行消耗桶余量，无 `nodelay` 则排队按速率渐次放行；无余量则按 `limit_req_status` 返回拒绝码。并发维度由 `limit_conn` 独立计数同 key 连接数。

## Relationships（关系）

### Related Concepts（相关概念）

- [[nginx-gateway-production-design|生产级 Nginx 网关设计]]：限流只是网关职责之一；其「先观测再拦截」（`limit_req_dry_run on` 观察 24h 再定 burst）与本文「先松后紧一周观察」是同一方法论。
- 网关层限流只兜住"挡不住打穿后端"这类问题，后端仍需自我保护；与后端限流组件（如基于时间轮的滑动窗口限流）的分层协同边界，本文未涉及。

### Dependencies（依赖项）

- 多层代理（LB/CDN）前置时，**必须先用 realip 模块按 `X-Real-IP`/`X-Forwarded-For` 还原真实客户端 IP**——否则 `$remote_addr` 拿到的是代理 IP，一限全站 503。
- 排障观察依赖 error.log：`tail -F error.log | grep 'limiting requests'`，`excess` 字段表示超出桶多少。

## Evolution（演进）

（新建页。待后续 Nginx 限流信源补充：Lua/OpenResty 动态限流、Full GC 无关的弹性伸缩协同。）

## Open Questions（开放问题）

- 各参数推荐值（rate/burst/并发数）依赖业务流量特征，本文未给通用公式；落地须按自身 access.log 基线定。
- 与 [[netty-hashed-wheel-timer|Netty 时间轮]] 等后端限流组件的分层协同边界，第二信源未涉及。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-06-nginx-rate-limiting-practice.md`（四步链路、参数语义、白名单、避坑）
- Source: `raw/sources/architecture/2026-11-04-nginx-gateway-production.md`（先观测再拦截互证，第二信源）

## Related Knowledge（相关知识）

- [[nginx-gateway-production|从部署到上线：搭建生产可用的 Nginx 网关（信源页）]]
