---
title: 高并发场景下的 HttpClient 优化方案，QPS 大大提升！
source: 微信公众号转载（原始出处 CSDN blog.csdn.net/u010285974）
source_url: https://mp.weixin.qq.com/s/7JmAOJUCiXOzyzAE7y7VJg
source_type: article
platform: 微信公众号
captured: 2026-11-06
registered_at: 2026-11-06
inbox_ref: Inbox/2026-11-06-httpclient-optimization-high-concurrency.md
asset_ref: Assets/2026-11/httpclient-optimization-high-concurrency.md
---

# 高并发场景下的 HttpClient 优化方案，QPS 大大提升！

> 采集来源：微信公众号转载（原始出处 CSDN blog.csdn.net/u010285974）
> 原文链接：https://mp.weixin.qq.com/s/7JmAOJUCiXOzyzAE7y7VJg
> 采集时间：2026-11-06（已清理页内广告与占位符图片；正文代码块按原文折叠后重排）

## 1. 背景

有个业务会调用其他部门提供的一个基于 HTTP 的服务，日调用量在千万级别，使用 HttpClient 完成。之前因为 QPS 上不去，看了业务代码并做了一些优化。

前后对比：优化前平均执行时间 **250ms**；优化后平均执行时间 **80ms**，降低三分之二，容器不再动不动就报警线程耗尽。

## 2. 分析

原实现比较粗略：每次请求时初始化一个 HttpClient，生成 HttpPost 对象，执行，然后从返回结果取出 entity，保存成字符串，最后显式关闭 response 和 client。

### 2.1 HttpClient 反复创建开销

HttpClient 是线程安全的类，没有必要由每个线程在每次使用时创建，全局保留一个即可。

### 2.2 反复创建 TCP 连接的开销

TCP 三次握手与四次挥手，对于高频次请求消耗太大。试想每次请求花 5ms 用于协商，QPS 为 100 的单系统，1 秒就要花 500ms 用于握手挥手。改成 keep-alive 方式实现连接复用。

### 2.3 重复缓存 entity 的开销

原逻辑：

```java
HttpEntity entity = httpResponse.getEntity();
String response = EntityUtils.toString(entity);
```

相当于额外复制了一份 content 到字符串，而原本的 httpResponse 仍保留一份 content，需要被 consume 掉。高并发且 content 非常大时会消耗大量内存，还需要显式关闭连接。

## 3. 实现

主要做三件事：单例 client、缓存保活连接、更好地处理返回结果。提到连接缓存，很容易联想到数据库连接池，HttpClient4 提供了 `PoolingHttpClientConnectionManager` 作为连接池。

### 3.1 定义 keep-alive strategy

是否使用 keep-alive 要根据业务情况来定，并不是灵丹妙药；keep-alive 与 time_wait/close_wait 也有不少故事。本文业务场景相当于少数固定客户端长时间极高频次访问服务器，启用 keep-alive 非常合适。

注意：HTTP 的 keep-alive 和 TCP 的 KEEPALIVE 不是一个东西。

```java
ConnectionKeepAliveStrategy myStrategy = new ConnectionKeepAliveStrategy() {
    @Override
    public long getKeepAliveDuration(HttpResponse response, HttpContext context) {
        HeaderElementIterator it = new BasicHeaderElementIterator(
                response.headerIterator(HTTP.CONN_KEEP_ALIVE));
        while (it.hasNext()) {
            HeaderElement he = it.nextElement();
            String param = he.getName();
            String value = he.getValue();
            if (value != null && param.equalsIgnoreCase("timeout")) {
                return Long.parseLong(value) * 1000;
            }
        }
        return 60 * 1000; // 如果没有约定，默认定义时长为 60s
    }
};
```

### 3.2 配置 PoolingHttpClientConnectionManager

```java
PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
connectionManager.setMaxTotal(500);
connectionManager.setDefaultMaxPerRoute(50); // 默认每路由最高 50 并发，具体依据业务来定
```

也可以针对每个路由设置并发数。

### 3.3 生成 HttpClient

```java
httpClient = HttpClients.custom()
        .setConnectionManager(connectionManager)
        .setKeepAliveStrategy(kaStrategy)
        .setDefaultRequestConfig(RequestConfig.custom()
                .setStaleConnectionCheckEnabled(true).build())
        .build();
```

注意：使用 `setStaleConnectionCheckEnabled` 逐出已被关闭的链接不被推荐。更好的方式是手动启用一个线程，定时运行 `closeExpiredConnections` 和 `closeIdleConnections`：

```java
public static class IdleConnectionMonitorThread extends Thread {
    private final HttpClientConnectionManager connMgr;
    private volatile boolean shutdown;

    public IdleConnectionMonitorThread(HttpClientConnectionManager connMgr) {
        super();
        this.connMgr = connMgr;
    }

    @Override
    public void run() {
        try {
            while (!shutdown) {
                synchronized (this) {
                    wait(5000);
                    // Close expired connections
                    connMgr.closeExpiredConnections();
                    // Optionally, close connections that have been idle longer than 30 sec
                    connMgr.closeIdleConnections(30, TimeUnit.SECONDS);
                }
            }
        } catch (InterruptedException ex) {
            // terminate
        }
    }

    public void shutdown() {
        shutdown = true;
        synchronized (this) {
            notifyAll();
        }
    }
}
```

### 3.4 使用 HttpClient 执行 method 时降低开销

注意：不要关闭 connection。

一种可行的获取内容方式是把 entity里的东西复制一份：

```java
res = EntityUtils.toString(response.getEntity(), "UTF-8");
EntityUtils.consume(response.getEntity());
```

但更推荐定义 ResponseHandler，不再自己 catch 异常和关闭流。源码关键逻辑（`execute(HttpHost, HttpRequest, ResponseHandler, HttpContext)`）：

```java
final HttpResponse response = execute(target, request, context);
final T result;
try {
    result = responseHandler.handleResponse(response);
} catch (final Exception t) {
    final HttpEntity entity = response.getEntity();
    try {
        EntityUtils.consume(entity);
    } catch (final Exception t2) {
        this.log.warn("Error consuming content after an exception.", t2);
    }
    if (t instanceof RuntimeException) throw (RuntimeException) t;
    if (t instanceof IOException) throw (IOException) t;
    throw new UndeclaredThrowableException(t);
}
// Handling was successful: ensure the content has been fully consumed.
final HttpEntity entity = response.getEntity();
EntityUtils.consume(entity);
return result;
```

而 `EntityUtils.consume` 最终会关闭输入流：

```java
public static void consume(final HttpEntity entity) throws IOException {
    if (entity == null) return;
    if (entity.isStreaming()) {
        final InputStream instream = entity.getContent();
        if (instream != null) instream.close();
    }
}
```

## 4. 其他

### 4.1 HttpClient 的超时配置

CONNECTION_TIMEOUT 是连接超时（发起请求前的等待时间），SO_TIMEOUT 是 socket 超时（等待数据的超时时间），两者不同。CONN_MANAGER_TIMEOUT 是从连接池检索连接实例的超时，不设置时默认等于 CONNECTION_TIMEOUT。

```java
HttpParams params = new BasicHttpParams();
// 设置连接超时时间
Integer CONNECTION_TIMEOUT = 2 * 1000; // 请求超时 2 秒，根据业务调整
Integer SO_TIMEOUT = 2 * 1000;         // 等待数据超时 2 秒，根据业务调整
// 从 ClientConnectionManager 检索 ManagedClientConnection 实例的超时（毫秒）
Long CONN_MANAGER_TIMEOUT = 500L;

params.setIntParameter(CoreConnectionPNames.CONNECTION_TIMEOUT, CONNECTION_TIMEOUT);
params.setIntParameter(CoreConnectionPNames.SO_TIMEOUT, SO_TIMEOUT);
params.setLongParameter(ClientPNames.CONN_MANAGER_TIMEOUT, CONN_MANAGER_TIMEOUT);
// 提交请求之前测试连接是否可用
params.setBooleanParameter(CoreConnectionPNames.STALE_CONNECTION_CHECK, true);

// 重试次数默认 3 次；如果量级不大保持默认即可，否则禁用
httpClient.setHttpRequestRetryHandler(new DefaultHttpRequestRetryHandler(0, false));
```

### 4.2 如果配置了 nginx，也要设置面向两端的 keep-alive

现在的业务里没有 nginx 反而比较稀少。nginx 默认与 client 端打开长连接、与 server 端使用短连接。客户端注意 `keepalive_timeout` 与 `keepalive_requests` 参数，upstream 端注意 `keepalive` 设置。

## 5. 完整参考代码

JAR 依赖：

```xml
<!-- httpclient -->
<dependency>
    <groupId>org.apache.httpcomponents</groupId>
    <artifactId>httpclient</artifactId>
    <version>4.5.6</version>
</dependency>
```

Utility 类示例（Basic 认证 + 单例 client + 复用 HttpGet + ResponseHandler + 多种 JSON 解析）：

```java
// Basic 认证
private static final CredentialsProvider credsProvider = new BasicCredentialsProvider();
// httpClient
private static final CloseableHttpClient httpclient;
// httpGet 方法
private static final HttpGet httpget;
private static final RequestConfig reqestConfig;
// 响应处理器
private static final ResponseHandler<String> responseHandler;
// jackson 解析工具
private static final ObjectMapper mapper = new ObjectMapper();

static {
    System.setProperty("http.maxConnections", "50");
    System.setProperty("http.keepAlive", "true");
    // 设置 basic 校验
    credsProvider.setCredentials(
            new AuthScope(AuthScope.ANY_HOST, AuthScope.ANY_PORT, AuthScope.ANY_REALM),
            new UsernamePasswordCredentials("", ""));
    // 创建 http 客户端
    httpclient = HttpClients.custom()
            .useSystemProperties()
            .setRetryHandler(new DefaultHttpRequestRetryHandler(3, true))
            .setDefaultCredentialsProvider(credsProvider)
            .build();
    // 初始化 httpGet
    httpget = new HttpGet();
    // 初始化 HTTP 请求配置
    reqestConfig = RequestConfig.custom()
            .setContentCompressionEnabled(true)
            .setSocketTimeout(100)
            .setAuthenticationEnabled(true)
            .setConnectionRequestTimeout(100)
            .setConnectTimeout(100).build();
    httpget.setConfig(reqestConfig);
    // 初始化 response 解析器
    responseHandler = new BasicResponseHandler();
}

/* 功能：返回响应 */
public static String getResponse(String url) throws IOException {
    HttpGet get = new HttpGet(url);
    String response = httpclient.execute(get, responseHandler);
    return response;
}

/* 发送 http 请求，用 JSON 解析 */
public static JsonNode getUrl2(String url) {
    try {
        httpget.setURI(URI.create(url));
        String response = httpclient.execute(httpget, responseHandler);
        JsonNode node = mapper.readTree(response);
        return node;
    } catch (IOException e) {
        e.printStackTrace();
    }
    return null;
}
```

## 总结

HttpClient 优化思路：池化、长连接、HttpClient 与 HttpGet 复用、合理的配置参数（最大并发请求数、各种超时、重试次数）、异步、多读源码。通过以上设置，将每次请求 250ms 的耗时降低到 80ms 左右，QPS 显著提升。
