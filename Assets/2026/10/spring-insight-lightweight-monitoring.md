# 轻量级 Spring 监测工具——Spring Insight 正式发布

> 来源：https://mp.weixin.qq.com/s/ULrVnGzWaGv-Ypx3ROyGAQ
> 抓取时间：2026-10-21（web-fetch，browser 级）

> **项目地址**：https://github.com/iweidujiang/spring-insight
> **当前版本**：`0.1.0`（Maven Central）· 监测中心镜像 `ghcr.io/iweidujiang/spring-insight-server:0.1.0`

## 一、它是什么、不是什么

做微服务久了，大概都碰到过这种情况：

> 下单接口变慢了。网关 → 订单 → 用户 → 积分，到底慢在哪一跳？日志翻了半小时，还在猜。

业界答案很多：SkyWalking、OpenTelemetry + Jaeger、老一点的 Sleuth + Zipkin……都很强，也都很「重」——协议、采样、存储、鉴权、部署手册一摞。很多中小项目、课程作业、本地联调，其实只想先回答三件事：

1. **谁调用了谁**
2. **这条请求耗时卡在哪**
3. **哪里报错了**

Spring Insight 就是冲着这个缺口写的：**业务侧加一个 Starter，旁边用 Docker 起一个轻量监测中心，打开浏览器就能看拓扑和链路。**

它**不是**可观测性平台，也**不打算**替代 SkyWalking / OTel。能力有边界，界面也还朴素——但 **0.1.0 已经发到 Maven Central，Server 镜像已经上 GHCR**，今天就可以装上试试。

## 二、两步跑起来

### 第一步：Docker 起监测中心

```bash
docker run --rm -p 9966:9966 \
  -e SPRING_INSIGHT_SERVER_STORAGE_MODE=file \
  -e SPRING_INSIGHT_SERVER_STORAGE_FILE_PATH=/data/spans.json \
  -v spring-insight-data:/data \
  ghcr.io/iweidujiang/spring-insight-server:0.1.0
```

浏览器打开：http://localhost:9966/

默认把 Span 落到数据卷里，容器重启数据还在；不想落盘就把 `STORAGE_MODE` 改成 `memory`。仓库根目录也有 `compose.yaml`，一条 `docker compose up -d` 等效。

### 第二步：业务服务加依赖

**Spring Boot 3 / JDK 21：**

```xml
<dependency>
  <groupId>io.github.iweidujiang</groupId>
  <artifactId>spring-insight-agent-starter</artifactId>
  <version>0.1.0</version>
</dependency>
```

```yaml
spring:
  application:
    name: order-service
  insight:
    server-url: http://localhost:9966
```

还在 **Boot 2.7 / Java 8**？换成兼容线坐标即可：

```xml
<dependency>
  <groupId>io.github.iweidujiang</groupId>
  <artifactId>spring-insight-agent-starter-boot2</artifactId>
  <version>0.1.0-boot2</version>
</dependency>
```

造几笔跨服务调用，等几秒（异步批量上报），刷新控制台——拓扑边和 Trace 列表应该就出来了。

## 三、跑起来之后能看见什么

- **仪表盘**：慢调用、错误调用的摘要入口，方便从「现象」点进「某条链路」。
- **服务拓扑**：谁调了谁、边上看调用次数；点节点或边可以下钻到相关 Trace。
- **链路追踪**：列表按 Trace 聚合，支持筛选；详情里是瀑布时间线，以及 Span 的 tags / 错误信息。
- **错误分析**：有失败调用时，可以先从错误侧收口，再回链路上定位。

Agent 侧目前覆盖得比较实用：Servlet MVC、OpenFeign、WebFlux / WebClient、Spring Cloud Gateway，以及线程池 Trace 透传；可选导出 `spring.insight.*` 给 Micrometer / Prometheus。

## 四、架构为什么要「独立 Server」

有人会问：能不能只引依赖、不另起进程？

技术上可以做进程内嵌入，但**跨服务拓扑**需要一个大家共用的汇聚点。Sleuth + Zipkin 其实也是同一思路：库负责埋点，Zipkin 负责存和看。

```
业务微服务 × N  ──Starter──►  埋点、异步批量上报
独立进程 × 1    ──Docker──►  insight-server :9966
```

和 Prometheus 也可以分工：链路 / 拓扑看 Insight，JVM / 连接池 / QPS 继续交给 Actuator + Micrometer。

## 五、当前还没有但后续要做的

- 存储是轻量的（内存或 JSON 文件），不是一上来就上数据库集群
- 没有开箱即用的告警规则、完善鉴权、多租户
- ...

## 六、坐标与链接（收藏向）

| 用途 | 地址 |
| --- | --- |
| 源码 | https://github.com/iweidujiang/spring-insight |
| Boot3 Starter | `io.github.iweidujiang:spring-insight-agent-starter:0.1.0` |
| Boot2 Starter | `io.github.iweidujiang:spring-insight-agent-starter-boot2:0.1.0-boot2` |
| Server 镜像 | `ghcr.io/iweidujiang/spring-insight-server:0.1.0` |
| Central（Starter） | https://central.sonatype.com/artifact/io.github.iweidujiang/spring-insight-agent-starter/0.1.0 |
| SCA 演示工程 | https://github.com/iweidujiang/spring-insight-sca-demo |

## 七、写在最后

这个项目最早只是一篇「还没写代码」的画饼——《一个还没写代码的开源项目，我先来"画个饼"：Spring Insight》。从画饼到 `0.1.0` 真正能装、能跑、能看见调用链，中间改过不少需求，也踩过一堆土坑：GPG 签名、PowerShell 拆坏 Maven 参数、Docker 镜像上传等……有些坑后来都写进了文档，算是给后来者交的学费。

今天它仍然很轻：你只需要用 Central 上的 Starter 和 GHCR 上的镜像，在自己的 Spring 微服务里试一把「谁调了谁、慢在哪、错在哪」。
