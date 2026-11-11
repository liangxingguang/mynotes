# 抓取正文存档：40 张表、20 层 e2e：把一个开源 Agent 平台迁到 Spring Boot 4.1

- 原始 URL: https://mp.weixin.qq.com/s/2wzVaKGTnsnNGmx3WpAhmQ
- 抓取方式: browser（Playwright 渲染）
- 抓取时间: 2026-11-11

---

## 前段时间把 项目 的 spring-boot.version 从 3.5 改成了 4.1.1。改之前我以为是次例行升级，动起手来才发现，花时间的地方和版本号关系不大。

这个项目不算小：40 张 ai\_\* 表、34 个功能页、98 个按钮权限，前面挂着 20 层 HTTP 端到端和 18 条 UI 用例。升级这种事，能启动只是开始，难的是确认跑起来之后行为没变。

### 1、真正改的只有四类

Jackson 3、starter 拆分、JSpecify 空安全注解，还有几个第三方依赖的 Boot 4 专用坐标。剩下的时间都在验证。升大版本最贵的不是写代码，是证明没坏。

### 2、starter 改名，包名搬家

依赖上最直观：spring-boot-starter-json 换成 spring-boot-starter-jackson，spring-boot-starter-aop 改叫 spring-boot-starter-aspectj，Flyway 终于有了官方 starter，不用再自己对齐 flyway-core 和方言包的版本。

包名也跟着重排，Jackson 的自动配置从 boot.autoconfigure.jackson 搬到 boot.jackson.autoconfigure，Web 的搬到 boot.webmvc.autoconfigure。

这里有个坑得单独说：注解包没变。@JsonIgnore、@JsonProperty 还在 com.fasterxml.jackson.annotation 下面。用 IDE 全局替换时把注解包一起换了，编译会挂一片，报错还看不出问题在哪。我只替换 com.fasterxml.jackson.databind。

### 3、Jackson 3 才是大头

一是映射器。Jackson 2 的习惯是 new ObjectMapper() 再到处 configure，Jackson 3 推的是 builder 出来一个不可变实例。项目里的 JsonUtils 现在直接取容器里那个 JsonMapper，Web 线程、boundedElastic、定时任务共用一个，谁也没法在运行时改配置。

二是自定义序列化器。我们有个 Long 超过 JS 安全整数就转字符串的处理，Jackson 2 里重写 serialize(value, gen, provider) 就行，第三个参数是 SerializerProvider；到了 3.x，父类搬到 ser.jdk，参数变成 SerializationContext：

```
public void serialize(Number value, JsonGenerator gen, SerializationContext provider) {
```

说白了，编译期能抓到的都不算麻烦，麻烦的是重写了 serializeWithType、或者直接调 provider.defaultSerializeValue 的地方，得逐个对签名。

三是 Redis，最隐蔽。Redisson 4.x 才有 Jackson 3 的 TypedJsonJackson3Codec，选错不报错，读缓存时才抛类型转换异常。另外 activateDefaultTyping 现在必须显式给校验器，LaissezFaireSubTypeValidator 已经不对外开放了。

还有一个容易忽略的点：默认类型信息会把全类名写进缓存。这次所有类都搬了家，旧 key 反序列化就是 ClassNotFoundException，把 key 前缀换一版就行。

### 4、有些地方换不掉，也不该硬换

迁完我搜了一遍 com.fasterxml.jackson.databind，还剩五个文件。不是没改干净，是故意的。AgentScope 2.0.4 自己就 compile 依赖 Jackson 2，渠道扩展的入站映射器用的也是 Jackson 2 的 JsonNode，飞书长连接的回调签名就是 Consumer。硬换等于把框架的适配层重写一遍，不划算。

两套并存可以，但得划清边界：SDK 的 DTO 不交给全局 JsonMapper，边界处用字符串传，各自解析。判断标准也简单，注解包出现是正常的，com.fasterxml.jackson.databind 出现在业务代码里才是漏改。

### 5、Flyway：两套数据库，一条线

项目同时交付 PostgreSQL 14 和 MySQL 8.0。空数据卷仍由建库脚本初始化，应用启动时 Flyway 只登记 V1 基线，之后的增量走 V2、V3，两个方言各一套目录，靠 {vendor} 自动选。

MySQL 的 DDL 不支持事务，迁移失败没法回滚，所以 V2 建索引写成了幂等：先查 information\_schema.statistics，没有再动态执行。

### 6、LiteFlow 给了一个下马威

升级中遇到一次启动失败，和业务毫无关系。LiteFlow 2.16.2.1 的指标端点依赖 Actuator 反射提取参数名，而它的字节码没带 -parameters，在 Boot 4 下 PathMappedEndpoints 初始化直接失败。项目本来就没引入 micrometer，这个端点没用，把 liteflow.metrics.enabled 关掉就行。

能启动本身就是一道门禁。很多依赖问题不会在单测里暴露，只会在容器起来的那几秒里暴露。

### 7、20 层 e2e 是这次最值钱的资产

单测全打桩只能证明逻辑对，证明不了装配对，所以这次验证主要压在端到端上。

HTTP 这边 20 层，从登录、权限、对话、HITL 确认、渠道回调，到 MCP 出口、无人值守写入，每层都跑真实接口。L12 是结构化决策闸门，需要本地桩，不起桩会 SKIP。UI 那边 18 条 Playwright 用例，两套栈各跑一遍，PG 和 MySQL 都是 20/0/0，UI 18/18，最后再核对容器日志里的 ERROR 数量。

这套东西平时维护起来挺烦，升级的时候是真省事。

### 8、几个没写的取舍

虚拟线程仍然关着，spring.threads.virtual.enabled 默认 false，Jetty 的 threads.max 当并发任务数用；SSE 是长连接，会一直占任务槽位，这个数不能照抄。

spring-boot-starter-web 在 4.x 里已经标记弃用，官方建议换成 spring-boot-starter-webmvc。我没换，它现在还能工作，提前换只有风险没有收益。

### 9、最后

升完回头看，改代码大概占三成，剩下七成都在验证：序列化结果对不对、缓存能不能读、两套库结构是否一致、20 层 e2e 有没有退化。

如果你的项目还停在 3.x，我的建议是别等 Boot 5 再动。Jackson 2 的尾巴拖得越久，SDK 边界上扯不清的地方就越多。

* * *

### 关于 BizBuddy

BizBuddy 是一个全量开源（MIT）的企业级智能体平台，Spring Boot 4.1.1 + AgentScope Java Harness，前端 RuoYi-Vue-Plus，PostgreSQL 14 与 MySQL 8.0 双栈交付。

仓库地址：https://gitee.com/zl3624/biz-buddy

如果你也在做类似的升级，欢迎拿这套代码对照，发现问题直接提 issue。
