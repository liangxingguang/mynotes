---
title: 接口被刷爆？Nginx 限流四步实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/DF3wi-A4cML097iqfC1suQ
source_type: article
platform: 微信公众号
captured: 2026-11-06
registered_at: 2026-11-06
inbox_ref: Inbox/2026-11-06-nginx-rate-limiting-practice.md
asset_ref: Assets/2026-11/nginx-rate-limiting-practice.md
---

半夜收到告警，某个接口 QPS 从 50 冲到 3000，后端连接池打满，正常用户也开始超时——十有八九是爬虫、刷子或者某个失控的客户端。这时候不该忙着在后端加锁加缓存，先在 Nginx 层把流量按住。四步，把限流从「背参数」变成「能落地」。

## 第一步：先看清是谁在刷

别一上来就抄配置。先看 access.log，搞清楚攻击特征，才能决定限什么、限多狠。

```bash
# 来源 IP 排行：谁请求量最大
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head

# IP + URI 组合：是不是集中打同一个接口
awk '{print $1, $7}' access.log | sort | uniq -c | sort -rn | head
```

重点看三件事：

1. **单 IP 请求数是否异常**：正常用户一分钟几十个请求，刷子一分钟几千个。
2. **URI 是否高度集中**：只打登录、下单、验证码这类高成本接口，是典型刷接口。
3. **有没有误伤对象**：监控拨测、网关健康检查也来自固定 IP，先排除，别把自己的探针限了。

## 第二步：limit_req 把平均速率按住

核心是两行配置。`limit_req_zone` 定义限流规则，必须放在 http 层；`limit_req` 在 location 里引用生效。

```nginx
# http{} 层：按来源 IP 限速，10m 共享内存约可跟踪 16 万个 IP
limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;

# location 里：超出速率的请求，允许 20 个突发，其余拒绝
location /api/ {
    limit_req zone=req_limit burst=20 nodelay;
}
```

三个参数的语义要说清：

1. `rate=10r/s` 是**平均速率**（漏桶算法），不是瞬时上限，突发靠 burst 兜。
2. `burst=20` 是突发容量桶：允许瞬间多来 20 个。
3. `nodelay` 让桶内的请求**立刻放行**；不加它，桶内请求会排队慢慢放，接口表现为「变慢」而不是「被拒」——很多「限流后反而更慢」的坑就在这一个词上。

## 第三步：limit_conn 控并发，白名单别误伤

限速率之外，还要限并发连接数：有人开着长连接慢速拉取，速率不高但连接一直占着。

```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
location /download/ {
    limit_conn conn_limit 5; # 单 IP 最多 5 个并发连接
}
```

对内网、拨测源做白名单，用 geo + map，key 为空串即不限流：

```nginx
geo $limit_key {
    default        $binary_remote_addr;
    10.0.0.0/8     "";              # 内网不限
    203.0.113.10   "";              # 拨测源不限
}

map $limit_key $req_key {
    default       $binary_remote_addr;
    ""            "";
}

limit_req_zone $req_key zone=req_limit:10m rate=10r/s;
```

## 第四步：验证与灰度调参

```bash
# 先测语法再平滑重载
nginx -t && nginx -s reload

# error.log 里观察限流命中：excess 表示超出桶多少
limit_req_log_level notice;
tail -F error.log | grep 'limiting requests'

# 压测验证：看 200 与 503 的比例
ab -n 200 -c 20 http://your-site/api/list
```

调参原则是**先松后紧**：第一版 rate 放宽、burst 给大，只看日志不真拦（命中量大说明有人在刷）；观察一周确认正常用户碰不到线，再逐步收紧到「正常用户不受影响」的下限。

另外注意：如果 Nginx 前面还有 LB 或 CDN，`$remote_addr` 拿到的是代理 IP，一限全站 503——先用 realip 模块根据 `X-Real-IP` / `X-Forwarded-For` 还原真实客户端 IP，再谈限流。

## 一图总结

1. **第一步 看日志**：awk 统计 IP 与 URI，确认特征、排除拨测误伤
2. **第二步 限速率**：limit_req_zone + burst + nodelay，拒绝码改 429
3. **第三步 限并发**：limit_conn 控单 IP 连接数，geo+map 配白名单
4. **第四步 验调参**：压测复现、日志观察、先松后紧灰度收紧

## 避坑要点

1. **zone 必须放 http 层**：limit_req_zone 写在 server/location 里直接报错，nginx -t 会拦下。
2. **burst 不加 nodelay**：请求被延迟排队，接口「变慢」，用户侧超时反而更多，除非你真想削峰。
3. **默认拒绝码是 503**：语义是服务不可用，容易被误判为故障；加 `limit_req_status 429` 更准确。
4. **多层代理后 $remote_addr 是代理 IP**：不还原真实 IP 就限流，等于把全站限死。
5. **key 用 $binary_remote_addr**：比 $remote_addr 每条省一半内存，IP 状态存得更多。
6. **白名单漏了自家探针**：拨测、网关健康检查被限后，监控告警一片假红。
7. **上线就真拦**：没有日志观察期，rate 定松了限不住、定紧了误伤，只能来回改配置。

## 小结

Nginx 限流的落地链路就四步：先用日志看清谁在刷，再用 limit_req 按住平均速率，用 limit_conn 控住并发连接，最后压测验证、灰度收紧。记住三件事：nodelay 决定「拒绝还是排队」，realip 决定「限的是谁」，白名单决定「会不会误伤」——这三个点想清楚，限流才算真正可控。
