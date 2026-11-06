---
id: 2026-11-06-httpclient-optimization-high-concurrency
title: 高并发场景下的 HttpClient 优化方案，QPS 大大提升！
source: 微信公众号（原始出处 CSDN blog.csdn.net/u010285974）
source_url: https://mp.weixin.qq.com/s/7JmAOJUCiXOzyzAE7y7VJg
source_type: article
platform: 微信公众号
created: 2026-11-06
category: 技术
tags: [java]
asset_ref: Assets/2026-11/httpclient-optimization-high-concurrency.md
wiki_status: pending
---

# 高并发场景下的 HttpClient 优化方案，QPS 大大提升！

> 日调用千万级的 HTTP 接口调用，QPS 上不去：作者把 HttpClient 从"每次请求新建 client"改成**单例 + 连接池 + keep-alive + ResponseHandler**，平均耗时从 250ms 降到 80ms（降三分之二），容器线程耗尽报警消失。

## 核心要点

1. HttpClient 线程安全，全局单例即可，别每次请求新建
2. 反复 TCP 三次握手/四次挥手开销大，用 keep-alive 实现连接复用；注意 HTTP keep-alive ≠ TCP KEEPALIVE
3. `PoolingHttpClientConnectionManager` 池化连接：`setMaxTotal(500)`、`setDefaultMaxPerRoute(50)`
4. 自定义 `ConnectionKeepAliveStrategy`：解析响应 timeout 头，默认 60s
5. `setStaleConnectionCheckEnabled` 已不推荐，改用后台线程定时 `closeExpiredConnections()` + `closeIdleConnections()`
6. 用 `ResponseHandler` 而非手动 `EntityUtils.toString` 复制字符串：`execute()` 内部自动 `consume(entity)` 关闭流，避免双份内存占用
7. 区分三种超时：CONNECTION_TIMEOUT（建连）、SO_TIMEOUT（等数据）、CONN_MANAGER_TIMEOUT（池内取连接，不设则默认等于前者）
8. 重试次数默认 3 次，量级大可禁用；nginx 代理也要两端开 keep-alive（client 侧 keepalive_timeout/requests、upstream keepalive），否则上游仍是短连接

## 正文

背景是调用其他部门的 HTTP 服务，日调用千万级，原实现"每请求 new HttpClient → execute → 取 entity 存字符串 → 显式 close"。优化分三步：

**① 单例 client + 连接池保活**：`HttpClients.custom().setConnectionManager(connectionManager).setKeepAliveStrategy(kaStrategy).build()`，连接池上限 500、单路由 50。

**② 空闲连接监控线程**：每 5 秒 wait 后清理过期/空闲超 30s 的连接。

**③ 响应处理改 ResponseHandler**：源码证明 `execute(responseHandler)` 在成功或异常分支都会 `EntityUtils.consume(entity)`，最终关闭输入流，无需手动管理。

**超时与复用代码见附件**；文末给出完整工具类：单例 `CloseableHttpClient` + 复用 `HttpGet` + `RequestConfig`（connect/socket/connectionRequest timeout 均 100ms）+ `BasicResponseHandler` + Jackson 解析。

## 来源

- 原文：https://mp.weixin.qq.com/s/7JmAOJUCiXOzyzAE7y7VJg

## 附件

- [[Assets/2026-11/httpclient-optimization-high-concurrency.md]]
