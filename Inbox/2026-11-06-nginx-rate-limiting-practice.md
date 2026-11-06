---
id: 2026-11-06-nginx-rate-limiting-practice
title: 接口被刷爆？Nginx 限流四步实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/DF3wi-A4cML097iqfC1suQ
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [nginx]
asset_ref: Assets/2026-11/nginx-rate-limiting-practice.md
wiki_status: pending
---

# 接口被刷爆？Nginx 限流四步实战

> 半夜告警 QPS 从 50 冲到 3000、连接池打满、正常用户超时——十有八九是爬虫或失控客户端。别急着在后端加锁加缓存，先在 Nginx 层按住流量。四步落地：看日志辨特征 → limit_req 限平均速率 → limit_conn 控并发+白名单 → 压测验证灰度调参。

## 核心要点

1. 第一步先分析 access.log：awk 统计 IP 排行与 IP+URI 组合，看单 IP 请求数、URI 是否集中、排除拨测探针误伤
2. limit_req 核心两行：`limit_req_zone ... rate=10r/s` 必须放 http 层；location 里 `limit_req zone=... burst=20 nodelay`
3. 参数语义：rate 是平均速率（漏桶），burst 是突发容量桶，nodelay 让桶内请求立刻放行否则表现为接口"变慢"
4. limit_conn 控并发：对付长连接慢速拉取，如 `/download/` 单 IP 限 5 个并发连接
5. 白名单 geo+map 实现：key 置空串即不限流（内网 10.0.0.0/8、拨测源）
6. 验证：`nginx -t && nginx -s reload`；error.log grep 'limiting requests' 看命中；`ab -n 200 -c 20` 压测看 200/503 比例
7. 调参先松后紧：第一版 rate 放宽只观察日志不真拦，一周后收紧到"正常用户不受影响"的下限
8. 多层代理要先用 realip 模块还原 X-Real-IP/X-Forwarded-For，否则 $remote_addr 拿到的是 LB/CDN 的 IP，一限全站 503

## 正文

**第一步 看日志**：先搞清攻击特征再决定限什么、限多狠——单 IP 一分钟几千请求、只打登录/下单/验证码接口、固定 IP 的拨测健康检查，这三类要分清。

**第二步 限速率**：漏桶算法按住平均速率；`burst` 允许瞬间突发，`nodelay` 决定"拒绝还是排队"——不加 nodelay 时桶内请求排队慢慢放行，表现为"限流后接口反而更慢、超时更多"，这是最经典的坑。

**第三步 限并发**：`limit_conn_zone + limit_conn` 控制单 IP 并发连接数，应对"速率不高但长连接一直占着"的慢速拉取场景；内网与拨测源用 geo+map 置空 key 免限。

**第四步 验调参**：nginx -t 语法校验 + 平滑重载，error.log 看 `limiting requests`（excess 表示超出桶多少），ab 压测验证 200/503 比例。先松后紧：第一版只观察日志不真拦，一周后逐步收紧。

**避坑**：zone 必须 http 层（写错直接报错）；默认拒绝码 503 易被判为故障，应改 `limit_req_status 429`；key 用 `$binary_remote_addr` 省一半内存；多层代理先还原真实 IP 再谈限流；白名单漏探针会假红；上线别直接真拦。

## 来源

- 原文：https://mp.weixin.qq.com/s/DF3wi-A4cML097iqfC1suQ

## 附件

- [[Assets/2026-11/nginx-rate-limiting-practice.md]]
