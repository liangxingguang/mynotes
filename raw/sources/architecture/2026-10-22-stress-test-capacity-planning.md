---
title: 第二十课：高并发系统压测与容量规划
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/BhCRjKjsYNftqmQQP9pT-Q"
source_type: link
platform: wechat
captured: 2026-10-22
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-22-stress-test-capacity-planning.md
asset_ref: Assets/2026/10/stress-test-capacity-planning.md
---

# 第二十课：高并发系统压测与容量规划

# 第二十课：高并发系统压测与容量规划

> 原文：https://mp.weixin.qq.com/s/BhCRjKjsYNftqmQQP9pT-Q （架构师之路系列）
> 说明：文末推广与资料领取信息已略去。

🎯 本课目标

1. 分清"容量问题"与"性能问题"，学会用 日活×人均请求×集中系数 科学估算峰值 QPS
2. 掌握压测三板斧（单接口→链路→全链路）的演进路径，理解影子库/影子流量的数据隔离方案
3. 实操 JMeter 分布式压测、wrk2 恒定速率压测，理解 coordinated omission 为什么会让 wrk 高估性能
4. 学会解读性能曲线：吞吐量拐点、RT 陡增区、最佳工作负载区间，并从曲线反推瓶颈类型
5. 掌握容量规划公式（机器数 = 峰值QPS ÷ 单机容量 × 冗余系数）与 70%/80% 水位线管理，制定大促扩容与降级预案

## 一、问题背景：为什么系统总是"估不准"

### 两个真实场景，一次比一次疼

**场景一：大促崩了。** 某电商团队大促前开了评审会，运营说"今年流量大概翻一倍"，架构师按去年峰值乘 2 加了机器。结果活动开始 10 分钟，订单服务 RT 从 80ms 飙到 5s，数据库连接池打满，整条下单链路雪崩。事后复盘发现：今年新增了"凑单券"玩法，一个用户平均多发 4 次请求，请求量根本不是"翻一倍"能概括的。

**场景二：例行活动打挂了。** 另一家更冤：只是上线了一个"签到领积分"的例行活动，量级看着很小。结果签到接口查了一个没有索引的积分流水表，单次 RT 800ms，活动入口又是全站弹窗——瞬间全站首页被这一个接口拖垮。这就是典型的**容量水位没摸过**：谁也不知道这台库还能扛多少"慢查询"。

这两个场景指向同一个根因：**没有人真正测过系统的极限在哪**。所有的"扛得住"都是拍脑袋估出来的。限流熔断是给系统穿"防护服"；但防护服的尺码（限流阈值）本身也需要科学测量。

### 容量问题 ≠ 性能问题

| 维度 | 性能问题（Performance） | 容量问题（Capacity） |
| --- | --- | --- |
| **典型表现** | 单请求 RT 慢、CPU 高、GC 频繁 | 流量涨了系统整体扛不住 |
| **本质** | 处理"一个请求"要多久 | 单位时间能处理"多少请求" |
| **解决手段** | 代码优化、SQL 调优、缓存、异步 | 扩容、降级、流量调度、容量规划 |
| **度量指标** | RT、P99、CPU 利用率 | QPS/TPS 上限、机器数、水位线 |
| **谁来负责** | 开发同学日常优化 | 架构师做规划，容量必须"提前量" |

💡 **一句话区分：** 性能问题是"车跑得慢"，容量问题是"路太窄"。优化引擎（性能）解决不了路窄的问题。压测就是"量路宽"的动作，容量规划是"决定修几条道"的决策。

拍脑袋式流量估算的反面教材：

```java
// 去年大促峰值 QPS = 5000，今年说流量翻倍：
int peakQps = 5000 * 2;              // = 10000，看起来很合理？
// 问题1：没算新玩法。新增"凑单券"，人均请求从 6 次涨到 10 次
// 问题2：没算集中系数。0 点开抢，流量在 30 秒内集中释放
// 问题3：没算单机容量是否退化。今年代码加了 3 个新的远程调用
// 结果：真实峰值是 22000，系统上线 30 秒内被打挂 💥
```

### 估算的第一步：让监控数据说话

做容量规划前，先把去年的峰值曲线、日均曲线、请求放大关系都拉出来：

```promql
# 1) 去年大促当天的峰值 QPS（按小时聚合取最大）
max_over_time(sum(rate(http_server_requests_seconds_count[1m]))[24h:1m])
# 2) 日均 QPS（算集中系数的分母）
avg_over_time(sum(rate(http_server_requests_seconds_count[5m]))[30d:5m])
# 3) 各接口的请求占比（找请求放大点：一个页面触发几次请求）
topk(10, sum by (uri) (rate(http_server_requests_seconds_count[5m])))
# 4) 下单链路各服务的 TPS 比例（链路压测的场景建模依据）
sum by (service) (rate(order_service_requests_total[1m]))
```

这四个查询的产出，分别对应容量规划的四个输入：**峰值基准**、**日均基准**（算集中系数）、**接口占比**（算人均请求拆分）、**链路比例**（决定链路压测各环节的加压配比）。

## 二、压测方法论：目标、三板斧与数据隔离

### 先定目标：没有指标的压测都是"跑了寂寞"

压测第一件事不是启动 JMeter，而是把**压测目标**写成一份可验收的契约。目标至少包含五个指标：

| 指标 | 含义 | 常见目标示例 | 注意点 |
| --- | --- | --- | --- |
| **QPS / TPS** | 每秒查询数 / 每秒事务数 | 下单链路 TPS ≥ 3000 | TPS 的"事务"边界必须事先定义清楚 |
| **RT 均值** | 平均响应时间 | 均值 ≤ 200ms | 均值容易被长尾掩盖，不能只看它 |
| **P99** | 99% 请求的 RT 上限 | P99 ≤ 500ms | 用户体验的真实指标，长尾看它 |
| **错误率** | 非 2xx/业务失败占比 | ≤ 0.1% | 超时、5xx、业务失败都要计入 |
| **资源水位** | 压测达标时的 CPU/内存/IO | CPU ≤ 70% 水位 | 达标时的资源占用，就是容量规划的输入 |

压测目标卡示例：

```
场景: 大促下单主链路（购物车→订单→库存→支付）
目标TPS: 3000            # 从业务峰值 QPS 推导
RT要求: 均值 ≤ 200ms, P99 ≤ 500ms
错误率: ≤ 0.1%          # 含超时/5xx/业务失败
持续时长: 稳态压 30 分钟  # 短压5分钟只能发现性能问题，压不出容量问题
验收水位: 达标时 CPU ≤ 70%, DB 连接池 ≤ 60%, FullGC 不出现
数据隔离: 影子库表 + 压测流量标记
```

💡 **为什么必须压 30 分钟以上？** 连接池缓慢泄漏、老年代 GC 演变成 Full GC、缓存逐渐失效回源 DB 等问题在 5 分钟短压里根本暴露不出来。短压测出的是"性能"，长压测出的才是"容量"。稳态压测建议 30 分钟起步，大促场景建议 1~2 小时。

### 压测三板斧：单接口 → 链路 → 全链路

```
① 单接口压测（基准测试）
   JMeter/wrk2 ──▶ 网关 ──▶ 单个服务实例
   目标：摸清单接口的"裸容量"（单机最大QPS/最佳RT）
   产出：单机容量基准表（容量规划的分子）

② 链路压测（垂直链路）
   JMeter ──▶ 网关 ──▶ A ──▶ B ──▶ C
   目标：验证一条完整业务链路（如"下单链路"）
   发现：慢调用级联、连接池不足、缓存命中率下降

③ 全链路压测（生产影子流量）
   真实流量回放 ──▶ 生产网关 ──▶ 全部服务
              └── 压测标记透传（X-Load-Test: 1）
              └── 影子库 / 影子表 / 影子Topic
   目标：验证"整站"在峰值流量下的协同表现
   发现：跨链路资源争抢、共享组件(Redis/DB/MQ)瓶颈
   风险：最高！必须有数据隔离 + 限流兜底 + 应急预案

演进节奏：新服务先过①，核心链路季度过②，大促前全站过③
```

三板斧的顺序不能乱：**单接口没摸清就上全链路，出了问题你根本无法定位**是哪个环节的问题。

### 数据隔离：影子库与影子流量

全链路压测最大的风险是**压测数据污染生产库**。业界标准方案是**流量打标 + 影子存储**：

```java
// ① 压测流量打标：压测请求带上特殊 Header，网关处统一识别
// 压测工具请求头：X-Load-Test: 1

// ② 标记透传：用 Feign/RestTemplate 拦截器把标记沿调用链透传
public class LoadTestInterceptor implements ClientHttpRequestInterceptor {
    @Override
    public ClientHttpResponse intercept(HttpRequest request,
            byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String mark = RequestContext.get("load-test");
        if ("1".equals(mark)) {
            request.getHeaders().set("X-Load-Test", "1");
        }
        return execution.execute(request, body);
    }
}

// ③ 数据路由：压测标记的流量，写影子表（同库同实例，表名加 _shadow）
public String routeTableName(String originTable, String loadMark) {
    // 影子表方案：order 表 → order_shadow，同一 MySQL 实例
    // 影子库方案：独立一套低配 DB，隔离更彻底但成本高、易失真
    return "1".equals(loadMark)
        ? originTable + "_shadow"
        : originTable;
}

// ④ MQ 隔离：压测消息发往影子 Topic（order_pay vs order_pay_shadow）
// ⑤ Redis 隔离：压测 key 统一加前缀 shadow_，并设置短过期时间
```

| 隔离方案 | 实现方式 | 优点 | 缺点 | 适用 |
| --- | --- | --- | --- | --- |
| **影子表** | 同库加 _shadow 表 | 成本低，与生产同环境，失真小 | 需改造 DAO 层路由；表多时维护量大 | 大多数团队首选 |
| **影子库** | 独立一套 DB 实例 | 隔离彻底，压测再猛也不伤生产 | 低配影子库 IO 与生产不一致，易失真 | DB 压测占比高的核心链路 |
| **影子 Topic** | MQ 加 shadow 后缀 | 消息流量不影响生产消费 | 消费逻辑需双订阅或路由 | 全链路压测必备 |

**线上压测三道保险，缺一不可：** ① **限流兜底**——压测流量单独设限流阈值，压测失控时自动熔断压测流量；② **压测标记**——全链路透传，任何一环识别到标记就路由到影子资源，标记丢失比不压测更危险；③ **灰度单机压测**——优先把流量打到一台灰度实例上压，出问题只牺牲一台。此外压测窗口必须选业务低峰期，并提前通知全团队、准备一键停止压测的开关。

### 网关侧的压测标记识别与防护

```java
// 网关层压测标记过滤器（Spring Cloud Gateway GlobalFilter）
@Component
public class LoadTestMarkFilter implements GlobalFilter, Ordered {
    private static final String MARK_HEADER = "X-Load-Test";
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String mark = exchange.getRequest().getHeaders().getFirst(MARK_HEADER);
        if ("1".equals(mark)) {
            // 1) 校验压测白名单：不在白名单时间窗口/接口范围，直接拒绝
            if (!LoadTestWindow.isOpen()) {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }
            // 2) 压测流量单独限流：防止压测失控冲垮生产
            //    阈值 = 本次容量规划的目标QPS × 1.1（缓冲）
            // 3) 把标记写入 exchange 属性，供下游 filter/服务透传
            exchange.getAttributes().put("load-test", Boolean.TRUE);
            // 4) 打点：影子流量单独计数，实时观测压测流量占比
            Metrics.counter("loadtest.requests").increment();
        }
        return chain.filter(exchange);
    }
    @Override
    public int getOrder() {
        return -100;  // 最高优先级：先于路由/限流过滤器执行
    }
}
```

💡 **标记丢失比不压测更危险：** 如果某个服务在转发时把 `X-Load-Test` 头弄丢了，压测订单就会直接写进生产库。所以除了"有标记走影子"，还要在写入侧做**反向校验**——定时任务扫描"非压测流量写入影子表"和"疑似压测数据特征"（如固定 skuId、请求源 IP 为压力机），发现异常立即告警停压。

## 三、压测工具实战：JMeter、wrk2 与 Gatling

### JMeter：线程组、断言与监听器

JMeter GUI 只用来调试脚本，**真正压测必须用命令行**（GUI 本身会吃掉大量资源导致结果失真）：

```xml
<!-- 核心 jmx 片段（节选）：线程组 + HTTP请求 + 断言 -->
<ThreadGroup testname="下单压测">
  <stringProp name="ThreadGroup.num_threads">200</stringProp>  <!-- 200 个并发线程 -->
  <stringProp name="ThreadGroup.ramp_time">60</stringProp>     <!-- 60 秒内逐步加压 -->
  <stringProp name="ThreadGroup.duration">1800</stringProp>    <!-- 持续 30 分钟 -->
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
</ThreadGroup>
<!-- 响应断言：不只看 HTTP 200，还要校验业务 code -->
```

```bash
# 命令行执行压测（禁用 GUI 监听器，结果写 jtl）
jmeter -n -t order_test.jmx -l result.jtl -e -o ./report
# 分布式压测：1 台控制机 + N 台压力机（突破单机端口/带宽限制）
# 1) 每台压力机启动 agent：
jmeter-server -Djava.rmi.server.hostname=192.168.1.11
# 2) 控制机配置远程压力机并统一下发：
jmeter -n -t order_test.jmx -R 192.168.1.11,192.168.1.12,192.168.1.13 -l result.jtl -e -o ./report
```

**JMeter 断言的"隐藏坑"：** 只断言 HTTP 200 远远不够——被限流返回的 429、走降级返回的 200 兜底数据，都会被算成"成功"。必须在断言里校验业务 code（如 `code == 0`），否则压测报告的 TPS 高得漂亮，实际全是失败请求。

### CSV 参数化：别拿一个参数压出"假缓存命中率"

如果所有虚拟用户都用同一个 skuId 压测，Redis 里永远只有一条热点缓存——命中率 100%，DB 毫无压力，压出来的 TPS 完全虚高。正确做法是用 **CSV Data Set Config** 参数化，且数据分布贴近生产：

```xml
<CSVDataSet testname="sku参数化">
  <stringProp name="filename">./data/sku_hot_cold.csv</stringProp>
  <stringProp name="variableNames">skuId,stock</stringProp>
  <boolProp name="recycle">false</boolProp>   <!-- 数据不循环复用 -->
  <boolProp name="stopThread">true</boolProp> <!-- 数据用完即停线程 -->
  <stringProp name="shareMode">All threads</stringProp>
</CSVDataSet>
```

```python
# sku_hot_cold 数据集构造思路（模拟真实冷热分布）
# 热点商品 5% 承担 60% 请求，长尾商品 95% 承担 40%
import csv, random
with open("sku_hot_cold.csv", "w", newline="") as f:
    w = csv.writer(f)
    for i in range(50000):
        if random.random() < 0.6:
            sku = random.randint(1001, 1050)   # 50 个热点 sku
        else:
            sku = random.randint(10000, 20000)  # 长尾 sku
        w.writerow([sku, 100])
```

### 精准控压：吞吐量整形定时器

线程组控制的是"并发数"，但容量规划要的是"精确到目标 QPS"。JMeter 的 **Throughput Shaping Timer** 可以让压测严格按设定的 QPS 曲线走：

```xml
<ThroughputShapingTimer>
  <collectionProp name="load_profile">
    <!-- 0~2000 QPS：维持 300 秒（观察稳态 RT） -->
    <!-- 2000→3000 QPS：300 秒内线性爬坡（观察 RT 何时上翘） -->
    <!-- 每级爬 1000 QPS，直到 RT 失控或错误率超标，取上一级为拐点 -->
  </collectionProp>
</ThroughputShapingTimer>
```

### wrk2 与 coordinated omission：为什么 wrk 会高估性能

`wrk` 默认是**闭环压测（closed-loop）**：N 个线程各自维持"发请求→等响应→再发下一个"的循环。当服务变慢时，请求发出去的间隔被自动拉长，**实际发送速率会随服务变慢而下降**，高负载时的吞吐被系统性低估、RT 被系统性高估样本丢弃。这种压测器与服务"互相配合"导致的统计盲区，就叫 **coordinated omission（协调缺失）**。

举例：目标速率 1000 QPS，某秒服务卡了 500ms。闭环压测器这 500ms 内一个请求都没发（它在傻等响应），于是"最糟糕的那段体验"根本没被记录——P99 看起来岁月静好，真实用户却已经卡爆了。`wrk2` 的解法是**恒定速率压测（open-loop）**：严格按固定速率发请求，无论响应多慢都不减速，并把每个请求的"应发时刻 vs 实发时刻"计入统计。

```bash
# wrk 默认闭环压测：线程会"等响应再发"，负载随服务变慢而塌缩
wrk -t4 -c200 -d30s --latency http://api.example.com/order
# wrk2 恒定速率压测（-R 指定目标QPS，严格 open-loop）
wrk2 -t4 -c200 -d30s -R 2000 --latency http://api.example.com/order
# 带 Lua 脚本：POST 请求 + 压测标记
wrk2 -t4 -c200 -d30s -R 2000 -s order.lua http://api.example.com
# order.lua 内容：
wrk.method  = "POST"
wrk.headers["X-Load-Test"] = "1"
wrk.headers["Content-Type"] = "application/json"
wrk.body    = '{"skuId":1001,"count":1}'
```

💡 **怎么选：看你要测什么。** 测"系统极限容量"用闭环（wrk/JMeter 线程组）没问题；但测"指定流量下的 RT 表现"（尤其看 P99 长尾）必须用恒定速率（wrk2、Gatling 默认也是恒定速率模型）。大促是"流量多少就进来多少"的开环场景，所以**容量评估应以恒定速率压测为准**。

### Gatling：代码即压测脚本

Gatling 用 Scala DSL 写压测脚本，优势是**单机发压能力强、报告漂亮、脚本可进 Git 做版本管理**：

```scala
class OrderSimulation extends Simulation {
  val httpProtocol = http
    .baseUrl("http://api.example.com")
    .header("X-Load-Test", "1")              // 压测流量标记
    .contentType("application/json")
  val scn = scenario("下单压测")
    .exec(http("create-order")
      .post("/api/order")
      .body(StringBody("""{"skuId":1001,"count":1}"""))
      .check(status.is(200))
      .check(jsonPath("$.code").is("0")))    // 业务断言
  // 阶梯加压：每 20 秒增加 100 并发，直到 1000，共压 10 分钟
  setUp(
    scn.inject(
      rampUsersPerSec(100).to(1000).during(1200.seconds)
    ).protocols(httpProtocol)
  ).assertions(
    global.responseTime.percentile(99).lt(500),   // P99 < 500ms
    global.successfulRequests.percent.gt(99.9)     // 成功率 > 99.9%
  )
}
```

### 三大工具横向对比

| 维度 | JMeter | wrk2 | Gatling |
| --- | --- | --- | --- |
| **压测模型** | 闭环（线程组），可配阶梯加压 | 严格开环（恒定速率） | 开环（恒定速率注入） |
| **单机发压能力** | 一般（JVM 开销大，需分布式） | 极强（C + epoll） | 强（Akka 异步 IO） |
| **脚本方式** | GUI + jmx（XML） | 命令行 + Lua 脚本 | Scala DSL 代码 |
| **长尾统计** | 一般 | 准确（修正 coordinated omission） | 准确，分位数报告精细 |
| **协议支持** | HTTP/JDBC/MQTT 等极广 | 仅 HTTP/WebSocket | HTTP 为主，gRPC 需插件 |
| **CI 集成** | Maven 插件，可用 | 命令行，简单 | Maven/Gradle，原生友好 |
| **适用场景** | 复杂场景编排、多协议 | 快速摸底单接口真实水位 | 核心链路例行压测 + 阶梯加压 |

## 四、性能曲线解读：从拐点找到瓶颈

### 压测曲线的三个区

```
吞吐量                                    最佳工作负载区间
  ▲
  │                   ╭────────● 吞吐量（吞吐量持平，RT 可接受）
  │                 ╭──╯   ╲
  │              ╭──╯       ╲
  │           ╭──╯           ╲
  │        ╭──╯   拐点(饱和点) ╲___
  │      ╭──╯                  ╲ ╲___
  │   ╭──╯                      ╲   ╲____ 吞吐量下降
  │──╯──────────────────────────────────▶
  │                        ┃       并发/QPS
  │                     ●●●┃
  │                  ●●●   ┃ ●●●●●●●●●●●● ← RT 陡增区（排队效应）
  │              ●●●       ┃
  │          ●●●●  线性区   ┃
  │   ●●●●●                 ┃
  │─────────────────────────┸─────────────▶
  │                         系统极限
  │  ①线性区        ②拐点区       ③陡增区
  │  资源未饱和     吞吐量最大     轻微加压 RT 暴涨
  │  RT 稳定        RT 开始上翘   系统濒临崩溃

容量规划取"拐点区"左缘（吞吐量接近峰值且 RT 未失控），
再乘冗余系数——绝不能按"陡增区"的极限值做容量！
```

**① 线性区：** 资源未饱和，加压吞吐量线性上涨，RT 稳定。**② 拐点区：** 吞吐量到达峰值附近，但 RT 开始上翘——这是系统的"最佳工作负载区间"上限。**③ 陡增区：** 根据排队论，利用率接近 100% 时等待时间呈指数级上升（M/M/1 模型：RT = 服务时间 ÷ (1 - 利用率)），再加一点点压力 RT 就会失控、吞吐量不升反降。

**别把"极限 QPS"当"容量"：** 按 100% 利用率做容量，意味着任何一次流量抖动、一次 GC 停顿都会让系统滑进陡增区。工业界共识：生产水位控制在拐点左缘的 **70%~80%**。

### 从曲线形态反推瓶颈类型

压测时必须**同步采集服务器指标**：

```bash
# 压测期间同步采集系统指标（每 2 秒一轮）
while true; do
  date +%H:%M:%S
  top -bn1 | grep "Cpu(s)"                 # CPU 使用率/iowait
  free -m | grep Mem                       # 内存水位
  iostat -x 1 2 | grep -A1 "Device"        # 磁盘 util/await
  ss -s | grep "TCP"                       # 连接数统计
  echo "---"
  sleep 2
done
# JVM 应用补充：GC 情况（关注 FullGC 频率与耗时）
jstat -gcutil <pid> 2000
# 数据库瓶颈排查：压测中的慢 SQL 与连接数
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW GLOBAL STATUS LIKE 'Threads_running';"
```

| 曲线/监控特征 | 瓶颈类型 | 典型证据 | 优化方向 |
| --- | --- | --- | --- |
| CPU 打满后吞吐不再涨 | **CPU 瓶颈** | us% 接近 100%，线程栈大量 RUNNABLE | 算法优化、减少序列化、扩容 |
| iowait 高、RT 抖动剧烈 | **磁盘 IO 瓶颈** | %util 接近 100%，await 暴涨 | 换 SSD、加缓存、异步落盘 |
| 吞吐随并发不涨反跌 | **锁竞争** | 线程栈大量 BLOCKED/WAITING | 减小锁粒度、无锁化、分片 |
| 低并发 RT 就高、加压 RT 爆炸 | **连接池太小** | 线程栈大量等连接（park 在获取连接处） | 调大连接池 |
| Full GC 频繁、吞吐锯齿状 | **内存瓶颈** | jstat 老年代占用高、GC 耗时长 | 查内存泄漏、调堆、换 G1/ZGC |
| DB CPU/连接数先打满 | **下游数据库瓶颈** | Threads_running 飙升、慢 SQL 增多 | 加缓存、读写分离、分库分表 |

### 线程栈分析：锁竞争与等连接的"现场抓捕"

```bash
# 压测期间间隔抓取线程栈（每次间隔 5 秒，抓 5 份）
for i in $(seq 1 5); do
  jstack <pid> > jstack_$i.txt
  sleep 5
done
# 统计线程状态分布（BLOCKED 多 = 锁竞争；WAITING 在获取连接 = 池太小）
grep "java.lang.Thread.State" jstack_*.txt | sort | uniq -c
#   152 java.lang.Thread.State: RUNNABLE
#    89 java.lang.Thread.State: BLOCKED (on object monitor)   ← 锁竞争！
#    34 java.lang.Thread.State: WAITING (parking)             ← 需看 park 在哪
# BLOCKED 线程都在等哪把锁？看 "waiting to lock" 指向的地址
grep -A 2 "BLOCKED" jstack_1.txt | grep "waiting to lock" | sort | uniq -c
#    89 waiting to lock <0x000000076ab62208>  ← 89 个线程抢同一把锁
# 再搜 "locked <0x000000076ab62208>" 找到持锁线程的堆栈，定位到代码行
# WAITING 线程 park 在哪？若堆栈里出现连接池类名，就是等连接
grep -B 5 "parking to wait for" jstack_1.txt | grep -E "HikariPool|DruidDataSource"
# 命中 → 连接池不足，先修池再看真实容量
```

💡 **瓶颈是"水涨船高"的：** 修掉 CPU 瓶颈后，下一个瓶颈往往是 DB；修掉 DB 后，可能是 Redis 或连接池。所以压测不是一次性动作，而是"压测→定位→优化→复压"的循环，直到容量达标。

## 五、容量规划模型：从峰值 QPS 到机器数

### 第一步：估算峰值 QPS

峰值 QPS 的经典估算公式：**峰值 QPS = 日活 × 人均请求数 × 集中系数 ÷ 有效时段秒数**。关键是"集中系数"——流量从来不是均匀分布的：

```java
public class CapacityEstimator {
    public static void main(String[] args) {
        // 输入因子（来自运营数据 + 历史 monitor 曲线）
        long   dau           = 2_000_000;  // 日活用户 200 万
        double avgReqPerUser = 12;         // 人均请求数（含新玩法，看埋点）
        double concentration = 0.08;       // 集中系数：峰值时段占全天请求 8%
        int    peakSeconds   = 60;         // 峰值集中在 60 秒内释放
        // 全天总请求
        double totalReq = dau * avgReqPerUser;
        // = 2,000,000 × 12 = 24,000,000
        // 峰值时段请求量 ÷ 峰值持续秒数 = 峰值 QPS
        double peakQps = totalReq * concentration / peakSeconds;
        // = 24,000,000 × 0.08 ÷ 60 = 32,000 QPS
        System.out.println("峰值 QPS = " + peakQps);
        // 集中系数与峰值时长怎么定？看去年的监控曲线：
        // 峰值QPS ÷ 日均QPS 的倍数，就是流量的"尖峰系数"
    }
}
```

💡 **集中系数别拍脑袋，看历史曲线：** 从去年监控里取"峰值 QPS ÷ 日均 QPS"的倍数作为尖峰系数（电商大促常见 20~50 倍），再叠加今年新玩法的放大预估。宁可估高 20%，也不要赌"应该差不多"。

### 第二步：从单机容量算机器数

```java
// 容量水位计算：机器数 = 峰值QPS ÷ 单机容量 × 冗余系数
public class MachinePlanner {
    public static void main(String[] args) {
        double peakQps   = 32_000;  // 上一步算出的峰值
        double singleCap = 1_800;   // 单机容量：压测拐点左缘值（P99达标时）
        // 理论机器数（向上取整）
        int theoretical = (int) Math.ceil(peakQps / singleCap);
        // = 32000 ÷ 1800 ≈ 17.8 → 18 台
        // 冗余系数：预留流量估算误差 + 实例滚动发布的容量空窗
        // 一般 1.3~1.5：核心交易链路取 1.5，边缘读服务可取 1.3
        double redundancy = 1.5;
        int finalMachines = (int) Math.ceil(theoretical * redundancy);
        // = 18 × 1.5 = 27 台
        // 反验水位：峰值流量 ÷ (机器数 × 单机容量) = 峰值水位
        double waterLevel = peakQps / (finalMachines * singleCap);
        // = 32000 ÷ (27 × 1800) ≈ 65.8%，落在 70% 安全线内 ✓
        System.out.println("机器数 = " + finalMachines
            + "，峰值水位 = " + Math.round(waterLevel * 100) + "%");
    }
}
```

### 排队论视角：为什么 80% 水位就要紧张

M/M/1 模型下，平均等待时间 = 服务时间 × 利用率 ÷ (1 - 利用率)——利用率逼近 1 时，等待时间**不是线性增长，而是发散**：

```java
public class QueueingSimulator {
    public static void main(String[] args) {
        double serviceMs = 50;  // 单请求纯处理耗时 50ms
        // RT = 服务时间 ÷ (1 - 利用率)，只算排队放大的部分
        double[] levels = {0.5, 0.7, 0.8, 0.9, 0.95};
        for (double rho : levels) {
            double rt = serviceMs / (1 - rho);
            System.out.printf("利用率 %.0f%% → RT = %.0fms%n", rho * 100, rt);
        }
        // 利用率  50% → RT =  100ms（2 倍）
        // 利用率  70% → RT =  167ms（3.3 倍）
        // 利用率  80% → RT =  250ms（5 倍）
        // 利用率  90% → RT =  500ms（10 倍）
        // 利用率  95% → RT = 1000ms（20 倍！）← 任何抖动都是雪崩
    }
}
```

这正是性能曲线"陡增区"的数学本质，也是水位线表里 **80% 黄线触发告警、90% 红线立刻扩容降级** 的理论依据。

### 第三步：水位线管理与预案

| 水位线 | 含义 | 触发表现 | 响应动作 |
| --- | --- | --- | --- |
| **70%（绿线）** | 安全水位 | 日常运行的正常区间 | 正常服务；每日巡检水位趋势 |
| **80%（黄线）** | 告警水位 | 流量增长或部分实例异常 | 触发告警；扩容预案待命；评估降级开关 |
| **90%+（红线）** | 危险水位 | 接近压测拐点，RT 开始上翘 | 自动/手动扩容；启用降级预案（砍非核心功能） |
| **100%（极限）** | 压测极限 | 进入 RT 陡增区，随时雪崩 | 立即限流自保（令牌桶在此生效） |

### 大促扩容与降级预案：一份 checklist

1. **扩容清单：** 按服务列出"峰值水位 ÷ 当前水位"，算出各服务需临时扩容的实例数，K8s 环境直接配 HPA（CPU 水位触发）；
2. **依赖预热：** 提前预热缓存（热点商品提前加载）、预热连接池、开启 JVM 预热流量，避免冷启动；
3. **降级开关：** 非核心功能（推荐、评价、积分）提前配置降级开关，大促期间"一键关闭"，把容量让给交易主链路；
4. **限流兜底：** 网关层配置令牌桶限流，阈值 = 本次容量规划的单机安全水位 × 机器数，宁可拒绝也不雪崩；
5. **值班与回滚：** 压测报告、扩容 SOP、一键停止脚本放在值班文档第一位，定义好"什么情况触发什么动作"的决策树。

### 扩容与降级的落地配置

```yaml
# 大促 HPA 配置：基于 CPU 水位的自动扩容（扩容阈值取 60%）
# 阈值故意低于 70% 水位线：HPA 采集有延迟，留出反应时间
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 6      # 日常水位对应的最小副本
  maxReplicas: 27     # 第五章算出的大促机器数
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30   # 30 秒内快速扩容
    scaleDown:
      stabilizationWindowSeconds: 600  # 缩容慢，防抖动
```

```yaml
# 降级开关：配置中心（Nacos/Apollo）下发的功能开关
degrade:
  switches:
    recommend: on      # 推荐：off 时走"猜你喜欢"静态兜底
    review: off        # 评价：off 时详情页隐藏评价模块
    coupon-union: off  # 联合营销：off 时跳过跨域营销查询
```

```java
// 应用侧读取开关（本地缓存 5 秒，避免每次请求查配置中心）
public boolean isDegrade(String feature) {
    String val = configClient.get("degrade.switches." + feature,
                                  "off", 5, TimeUnit.SECONDS);
    return "on".equals(val);
}
```

**容量规划是"活文档"：** 每次大促后、每次大的架构变更（加远程调用、换缓存、升级 JVM）之后，都必须复压并更新单机容量与水位表。一年不更新的容量规划，比没有更危险——它给你虚假的安全感。

## 六、生产落地避坑指南：5 个让压测失真的真实坑

压测最怕的不是压不出问题，而是**压出一个"假水位"**——报告很好看，上线照样挂。

**坑 1：压测环境与生产配置不一致。** 压测环境是 4C8G 虚机、生产是 8C16G 物理机；压测环境的 DB 是共享低配实例、生产是独享高配。用低配压测环境算出的"单机容量"推生产容量，误差可达数倍。正确做法：有条件就**在生产做影子压测**；没条件也必须保证压测环境与生产的**机器规格、JVM 参数、依赖版本完全一致**，并按规格比例换算。

**坑 2：压测数据污染生产库。** 全链路压测没做影子表路由，压测订单写进了真实订单表——轻则报表数据错乱，重则真实的库存被压测扣光。对策：压测标记全链路透传 + DAO 层强制路由影子表 + 压测前用"写入后查不到"的用例**验证隔离是否生效**，隔离验证不通过，压测一律不许开跑。

**坑 3：连接池太小，压不出来。** 应用 DB 连接池默认 10，压测时 200 并发里 190 个在等连接，测出的 TPS 是"连接池的容量"而不是服务的容量。而且等待连接会撑大 RT，让你误判"系统到极限了"。对策：压测前检查**所有池化资源**（DB 连接池、HTTP 连接池、Redis 连接池、线程池）的配置与生产一致，观察"等连接的线程数"指标，确认它不是瓶颈后再采数。

**坑 4：缓存穿透导致压测失真。** 压测用的参数（如 skuId=1001）在缓存里恰好是热的，压出的 TPS 虚高；反过来压测首次冷压时缓存全空，请求全部打到 DB，TPS 虚低。对策：压测数据集要模拟真实分布（热点参数占比按生产比例），并区分"冷启动压测"和"稳态压测"分别采数——**容量规划以稳态数据为准，冷启动数据用于评估预热方案**。

**坑 5：JVM 未预热导致冷启动失真。** 压测一开始的几分钟，JIT 还没把热点代码编译成机器码、连接池还没填满，RT 会明显高于稳态。如果只压 5 分钟就采数，水位会悲观几十个百分点。对策：压测前先用**低流量预热 3~5 分钟**（或用 JMeter 的 ramp-up 自然预热），丢弃预热期的数据，再开始正式采数。

### 压测前自检清单：一键排除失真因素

```bash
#!/bin/bash
# precheck.sh — 压测前自检脚本（核心检查项示例）

# [坑5] JVM 预热检查：应用启动时间 > 10 分钟才开始压
uptime_sec=$(( $(date +%s) - $(stat -c %Y /app/app.jar) ))
[ $uptime_sec -lt 600 ] && echo "FAIL: JVM 刚启动，先预热" && exit 1

# [坑3] 连接池配置核对：必须与生产一致（这里是 DB 连接池）
hikari_max=$(curl -s localhost:8080/actuator/configprops | \
    grep -o '"maximumPoolSize":[0-9]*' | grep -o '[0-9]*')
[ "$hikari_max" != "50" ] && echo "FAIL: 连接池=$hikari_max 与生产(50)不一致" && exit 1

# [坑2] 隔离验证：发一条带标记的请求，确认落在影子表
curl -s -H "X-Load-Test: 1" -d '{"skuId":1001}' \
     http://api.example.com/api/order > /dev/null
found=$(mysql -N -e "SELECT COUNT(*) FROM order_shadow WHERE sku_id=1001;")
[ "$found" -lt 1 ] && echo "FAIL: 压测数据未进影子表，隔离失效！" && exit 1
mysql -N -e "SELECT COUNT(*) FROM \`order\` WHERE sku_id=1001;" | \
    grep -q "^0$" || { echo "FAIL: 生产表被污染！"; exit 1; }

# [坑1] 环境一致性：机器规格 + JVM 参数指纹比对
diff <(curl -s localhost:8080/actuator/env | grep "Xmx\|GC") \
     prod_jvm_fingerprint.txt > /dev/null || \
    { echo "FAIL: JVM 参数与生产不一致"; exit 1; }

# [坑4] 参数化检查：CSV 数据文件存在且行数达标
[ $(wc -l < ./data/sku_hot_cold.csv) -lt 50000 ] && \
    { echo "FAIL: 压测数据集不足"; exit 1; }

echo "ALL CHECKS PASSED — 允许开压"
```

### 失真场景速查表

| 失真场景 | 失真方向 | 根因 | 对策 |
| --- | --- | --- | --- |
| 压测环境规格低于生产 | 容量被低估 | 硬件配置不一致 | 同规格压测或按比例换算 |
| 压测数据写入真实库 | 事故（非失真） | 压测标记/影子表缺失 | 标记透传 + 隔离验证用例 |
| 连接池等池化资源过小 | 容量被低估 | 测的是池不是服务 | 池配置对齐生产 + 监控等待线程 |
| 压测参数全是热缓存 | 容量被高估 | 数据分布失真 | 按生产比例构造冷热数据集 |
| JIT 未预热就采数 | 容量被低估 | 冷启动噪声混入 | 预热 3~5 分钟后丢弃预热数据 |
| 闭环压测工具速率塌缩 | P99 被低估 | coordinated omission | 改用 wrk2/Gatling 恒定速率 |
| 只断言 HTTP 200 | 成功率虚高 | 降级/限流响应算成功 | 断言业务 code |

最后把五条串起来：压测的每一步——目标定义、三板斧推进、工具选择、曲线解读、容量计算——都是在回答同一个问题：**"系统的真实能力边界在哪里，我们离它还有多远？"** 限流熔断回答"超了怎么办"，本课回答"边界是多少"，两者合起来才是完整的稳定性工程。

## 本课小结

| 知识点 | 核心要义 |
| --- | --- |
| **容量 vs 性能** | 性能是"一个请求多快"，容量是"单位时间多少请求"；扩容解决不了代码慢，优化也解决不了路窄 |
| **峰值 QPS 估算** | 日活 × 人均请求 × 集中系数 ÷ 峰值秒数；集中系数看历史监控曲线，不拍脑袋 |
| **压测目标五指标** | TPS/QPS、RT 均值、P99、错误率、达标时资源水位；稳态压 30 分钟起步 |
| **压测三板斧** | 单接口(摸基准)→链路(验放大)→全链路(测协同)，逐级收敛，顺序不能乱 |
| **数据隔离** | 压测标记透传 + 影子表/影子库/影子Topic；隔离验证不通过不许开压 |
| **线上压测三保险** | 限流兜底、压测标记、灰度单机压测；低峰期压 + 一键停止开关 |
| **coordinated omission** | 闭环压测与服务"互相配合"漏掉最差样本；测长尾和容量必须用恒定速率(wrk2/Gatling) |
| **性能曲线三段** | 线性区→拐点区→陡增区；容量取拐点左缘，绝不按极限值做容量 |
| **瓶颈定位** | 曲线形态+资源指标：CPU/IO/锁/连接池/内存/DB，各对对症下药 |
| **容量公式** | 机器数 = 峰值QPS ÷ 单机容量(压测拐点) × 冗余系数(1.3~1.5) |
| **水位线管理** | 70% 绿(安全)、80% 黄(告警+扩容待命)、90% 红(扩容+降级)、100% 限流自保 |
| **五大失真坑** | 环境不一致、数据污染、连接池太小、缓存穿透、JVM 冷启动；一个失真，全盘皆错 |
