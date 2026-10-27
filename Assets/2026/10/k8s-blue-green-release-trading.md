# 从零构建 K8s 蓝绿发布：一个日千万级交易系统的渐进式交付实战

> 面向交易核心链路的完整实战版。以一个脱敏订单服务发布事件为主线，给出从 Preview、流量切换、SLO 门禁到数据对账的实现与决策逻辑。

很多蓝绿发布教程的终点是一条命令：修改 Service selector，让流量从 Blue 切到 Green。

但在交易系统里，这恰好是风险开始的地方。订单、支付、库存共用数据和消息通道；老连接仍可能留在 Blue；新版本的异常通常会在全量流量、缓存未热、连接池刚扩张时才出现。更麻烦的是，应用回退后，已经发生的扣款、库存预留和消息投递不会自动回到过去。

本文用一个脱敏案例把问题讲透：一次订单服务发布如何在约 3 分钟内发现异常、切回稳定版本，并在不丢订单、不重复扣款的前提下完成对账。文中的服务名、规模、阈值和时间均经脱敏与泛化；实现关系和判断边界可直接迁移到生产环境。

* * *

## 1\. 事故开场：一次"切流成功"为什么仍然失败

交易域包含网关、订单、支付、库存和通知服务。订单服务平时运行 8 个副本，单副本 requests 为 `500m CPU / 512Mi`；入口日常 3,000–5,000 QPS，大促峰值超过 12,000 QPS。内部调用使用 gRPC，外部还保持订单状态 WebSocket 连接。PostgreSQL 15 是订单事实数据源，MQ 用于投递"订单已创建"和"库存已预留"事件。

某次发布将订单风控字段从仅内存计算改为"写入订单扩展字段，并异步通知风控"。上线前的单元、集成和 Preview 冒烟都通过了。Green 切入生产后，新的风控客户端连接池在高并发下创建连接过快，导致下游 gRPC `DEADLINE_EXCEEDED` 增加；部分下单请求被业务层正确拒绝，却被网关转换为 5xx。

这个事件的关键不是"Green 有 bug"——任何系统都可能有 bug——而是发布系统是否能把影响限制在可恢复范围内：

```
Image digest
    |
    v
Green Preview --> smoke gate --> approval
                                   |
                                   v
Blue active ---- service switch ----> Green active
  ^                                   |
  |                                   v
  +--------- SLO failure <--- analysis window
                  |
                  v
       reconcile business effects
```

最终结果是：post-promotion AnalysisRun 在连续两次错误率失败后把 Active Service 回指 Blue；Green 在短暂暴露期间创建的订单都使用相同的幂等键、兼容 Schema 和 Outbox 记录。对账任务确认没有重复扣款或重复预留。这个结果并非来自"回滚命令很快"，而是来自下面四个前置设计。

1. Blue 在指标观察结束前始终保留，能成为真正的流量回退目标。
2. Green 写入的数据对 Blue 兼容，应用版本回退不会让旧代码无法写库。
3. 所有写操作有幂等语义，回退和客户端重试不会造成第二次业务执行。
4. 发布门禁同时看样本量、技术 SLI、依赖健康与业务指标，而不只看 Pod Ready。

* * *

## 2\. 先选对模型：BlueGreen、Canary 与流量镜像不是一回事

BlueGreen 的价值是：让完整的新版本先在 Preview 中就绪并验证，再将生产入口整体指向新版本。它适合需要快速退回上一稳定版本、且能承担双版本资源窗口的核心服务。

Canary 的价值是：先让少量真实生产流量进入新版本，以 1% → 5% → 25% → 50% → 100% 的方式控制爆炸半径。它适合必须由真实流量发现问题、但不希望一次切全量的服务。

流量镜像则只是将请求副本发送到另一个目标，响应不回传给用户。它只适用于读请求或拥有严格 shadow 隔离能力的请求；对下单、扣款、发券、发送消息等写请求直接 mirror，可能产生真实副作用，绝不是"零风险压测"。

本文选择 BlueGreen，但把它理解为 **Preview + 全量切换 + 自动观察回退**，而不是"两个版本永远各跑一套环境"。

| 问题 | BlueGreen | Canary | Mirror |
| --- | --- | --- | --- |
| 新版本何时接生产流量 | 切换后全量 | 分阶段少量到全量 | 副本请求到达，但响应丢弃 |
| 是否适合写请求 | 是，需幂等与数据兼容 | 是，需幂等与数据兼容 | 默认不适合 |
| 回退速度 | Blue 仍存活时很快 | 回退权重或稳定 Service | 不涉及用户响应 |
| 主要成本 | 双版本资源窗口 | 路由与分析策略复杂 | 下游容量与副作用隔离 |

不要在同一份 Argo Rollout 的 `strategy` 中同时配置 `blueGreen` 和 `canary`。如果服务需要两阶段验证，应在发布流程上串联：先用 BlueGreen Preview 验证兼容性，再使用独立的 Canary Rollout 做真实流量放量；或者明确选择其中一种策略。

* * *

## 3\. 流量到底怎么走：控制面、数据面与旧连接

本文只让 Argo Rollouts 管理 Active/Preview Service selector。Istio 负责 mTLS、指标与入口路由，不再同时承担版本选择，避免 Service selector 和 VirtualService 权重两个控制面互相打架。

**图：Active 与 Preview 的职责边界**

```
                 +------------------+
Client --------->| Ingress Gateway  |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 | Active Service   |
                 +--------+---------+
                          |
              hash selects Blue or Green
                          |
                          v
                   Order Pods

QA / test ------> Preview Service ------> Green Pods
```

一次 promote 中发生的主要状态变化如下：

1. Argo 创建 Green ReplicaSet，将 Preview Service selector 指向 Green 的 `rollouts-pod-template-hash`。
2. Green 达到 Preview 副本并通过 pre-promotion AnalysisRun 后，Rollout 暂停，等待批准。
3. 批准后 Argo 先把 Green 扩到 `spec.replicas`；全部 Available 后才把 Active Service selector 改为 Green 的 hash。
4. EndpointSlice Controller、kube-proxy 或 CNI 数据面分别收敛到新后端；不同节点不会在同一时刻完成。
5. post-promotion AnalysisRun 观察新流量；失败时 Active Service 回指上一稳定 ReplicaSet。

**图：一次 Promote 的时间线**

```
t0       t1          t2             t3              t4
|--------|-----------|--------------|---------------|
Green    Preview     approval       Active -> Green  analysis done
2 Ready  smoke pass  / promote      8 Ready          / rollback

                     Blue remains routable and scaled during the full analysis window
```

这里有三个容易误解的事实：

* Service selector 的一次对象更新，不代表节点规则与网格代理在一个瞬间同步完成；业务应容忍短暂的最终一致收敛。
* selector 切换主要影响**新建连接和新建请求**。已有的 TCP、gRPC stream、WebSocket 不会被"迁移"到 Green。
* Blue 在切换后仍要保留足够久。这个时间既是 AnalysisRun 的回退窗口，也是旧连接自然结束或按策略重连的缓冲期；它不是数据回滚窗口。

* * *

## 4\. 一套可执行的资源定义

以下示例省略了组织特定的 RBAC、NetworkPolicy、镜像签名校验和 Ingress 配置，但保留了会决定发布行为的字段。

### 4.1 Service：由 Argo 注入 revision hash

Service 初始只选择稳定的业务标签。Argo Rollouts 会将 `rollouts-pod-template-hash` 注入并更新 selector；不要为版本切换手工 patch Service，也不要自造 `version: blue`、`version: green` 作为控制字段。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service-active
  namespace: trade-prod
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: grpc
      port: 9090
      targetPort: grpc
---
apiVersion: v1
kind: Service
metadata:
  name: order-service-preview
  namespace: trade-prod
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: grpc
      port: 9090
      targetPort: grpc
```

发布者需要验证实际对象，而不是只相信发布平台上的绿色状态：

```bash
kubectl -n trade-prod get svc order-service-active order-service-preview \
  -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.spec.selector}{"\n"}{end}'
kubectl -n trade-prod get endpointslice \
  -l kubernetes.io/service-name=order-service-active
```

### 4.2 Rollout：分析时长决定 Blue 的最短保留期

post-promotion 门禁的每项指标先等待 2 分钟，再采样 10 次、间隔 30 秒；PromQL 同样使用 2 分钟回看窗口。这样首个判断窗口内只包含 Green 流量，不会被切流前的 Blue 指标稀释。加上指标写入和数据面收敛缓冲，旧版本至少应保留 8 分钟。这里选 `480` 秒；若服务的长连接、指标窗口或人工处置时间更长，数值应相应增大。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
  namespace: trade-prod
spec:
  replicas: 8
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 900
  progressDeadlineAbort: true
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      terminationGracePeriodSeconds: 75
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: order-service
      containers:
        - name: order-service
          image: registry.internal/trade/order-service@sha256:REPLACE_WITH_DIGEST
          ports:
            - {name: http, containerPort: 8080}
            - {name: grpc, containerPort: 9090}
          resources:
            requests: {cpu: 500m, memory: 512Mi}
            limits: {cpu: "2", memory: 1Gi}
          startupProbe:
            httpGet: {path: /health/startup, port: http}
            periodSeconds: 5
            failureThreshold: 24
          readinessProbe:
            httpGet: {path: /health/ready, port: http}
            periodSeconds: 3
            failureThreshold: 2
          livenessProbe:
            httpGet: {path: /health/live, port: http}
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              httpGet:
                path: /internal/drain
                port: http
  strategy:
    blueGreen:
      activeService: order-service-active
      previewService: order-service-preview
      previewReplicaCount: 2
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
          - templateName: order-preview-smoke
        args:
          - name: preview-host
            value: order-service-preview.trade-prod.svc.cluster.local
      postPromotionAnalysis:
        templates:
          - templateName: order-post-promotion
      scaleDownDelaySeconds: 480
      abortScaleDownDelaySeconds: 120
```

字段背后的工程含义：

* `previewReplicaCount: 2` 节约等待批准期间的资源，但这 2 个副本不能被用来证明全量容量。
* `autoPromotionEnabled: false` 是一个明确的人机交接点；前置验证自动化，交易核心链路的全量切换仍需有责任人的批准。
* `progressDeadlineAbort: true` 能避免 Green 长期卡在不可用状态后继续占用发布窗口；它不能替代依赖、容量和业务门禁。
* `topologySpreadConstraints` 防止 8 个 Green 副本集中在一个可用区或少数节点，造成"看起来 Ready，实际没有故障域冗余"。

### 4.3 Preview 冒烟：测试真实契约，不制造真实交易

冒烟任务访问 Preview Service，只走健康、版本、签名校验和 `dry-run` 业务校验。它不能调用真正的"创建订单"接口。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: order-preview-smoke
  namespace: trade-prod
spec:
  args:
    - name: preview-host
  metrics:
    - name: preview-smoke
      count: 1
      failureLimit: 0
      provider:
        job:
          spec:
            backoffLimit: 0
            template:
              spec:
                restartPolicy: Never
                containers:
                  - name: smoke
                    image: curlimages/curl:8.12.1
                    command: ["/bin/sh", "-ec"]
                    args:
                      - |
                        curl --fail --silent --show-error \
                          "http://{{args.preview-host}}/health/ready"
                        curl --fail --silent --show-error \
                          "http://{{args.preview-host}}/internal/version" \
                          | grep -F 'buildSha='
                        curl --fail --silent --show-error \
                          -H 'X-Dry-Run: true' \
                          -H 'X-Test-Tenant: release-gate' \
                          -X POST "http://{{args.preview-host}}/api/orders/validate"
```

`/internal/*` 应由 NetworkPolicy、mTLS 身份和专用测试租户共同保护，不能因为"仅供发布使用"就暴露在公网入口。`X-Dry-Run` 也不能只由客户端声明；服务端必须把它绑定到受信身份并确保不会写订单表、支付表或 Outbox。

* * *

## 5\. 门禁设计：先验证样本量，再判断成功率

交易系统的发布门禁至少分四层：

| 层级 | 问题 | 指标或验证 |
| --- | --- | --- |
| 基础设施 | Green 真能承载吗？ | Available、副本差额、重启、OOM、CPU throttling、节点余量 |
| 服务 SLI | 请求足够可靠和快吗？ | 请求量、5xx、P95/P99、吞吐量、饱和度 |
| 依赖 | 压力是否转移给下游？ | DB pool、慢 SQL、Redis、MQ backlog、下游 gRPC 错误 |
| 业务 | 用户是否完成正确交易？ | 下单成功率、支付幂等冲突、库存拒绝率、状态机非法跳转 |

在本案例中，错误率阈值为 `0.1%`，下单成功率阈值为 `99.9%`，但这不是通用答案。阈值应来自服务 SLO、过去 28 天相同时段基线、当前促销活动和剩余错误预算。

一个经常被忽略的规则是：**低流量或空结果不是健康。** 如果两个分钟内只有 3 个请求、没有 5xx，0% 错误率没有统计意义；必须先通过最小样本量门禁。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: order-post-promotion
  namespace: trade-prod
spec:
  metrics:
    - name: minimum-order-sample
      initialDelay: 2m
      interval: 30s
      count: 10
      failureLimit: 1
      successCondition: len(result) > 0 && result[0] >= 200
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(increase(order_create_total[2m]))
    - name: http-5xx-rate
      initialDelay: 2m
      interval: 30s
      count: 10
      failureLimit: 1
      successCondition: len(result) > 0 && result[0] < 0.001
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(istio_requests_total{
              reporter="destination",
              destination_workload="order-service",
              destination_workload_namespace="trade-prod",
              response_code=~"5.."
            }[2m]))
            /
            clamp_min(sum(rate(istio_requests_total{
              reporter="destination",
              destination_workload="order-service",
              destination_workload_namespace="trade-prod"
            }[2m])), 0.001)
    - name: order-success-rate
      initialDelay: 2m
      interval: 30s
      count: 10
      failureLimit: 1
      successCondition: len(result) > 0 && result[0] >= 0.999
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(order_create_total{result="success"}[2m]))
            /
            clamp_min(sum(rate(order_create_total[2m])), 0.001)
```

在把这些查询交给 AnalysisRun 前，必须在 Prometheus 或 Grafana Explore 验证四件事：指标标签存在；指标量纲一致；重试不会把分母放大；`order_create_total` 只统计用户可见的最终结果。建议将截图、查询链接或 recording rule revision 写入发布记录。

* * *

## 6\. 优雅退出：用状态机排空，而不是用 sleep 猜时间

Pod 终止时，Kubernetes 在执行 `preStop` 前就开始计算 `terminationGracePeriodSeconds`；`preStop` 完成后才向主进程发送 TERM。一个固定 `sleep 20` 既不保证 Endpoint 已摘除，也会侵蚀应用实际可用的排空时间。

正确做法是将 `/internal/drain` 设计成快速、幂等的状态切换：readiness 立即失败，应用停止接受新业务；主进程收到 TERM 后，再让 HTTP 和 gRPC 完成正在进行的请求。

**图：Pod termination 的关键状态转换**

```
Serving -- preStop --> Draining -- TERM --> ShuttingDown --> Exited
   |                    |                    |
   |                    +-- readiness=503    +-- wait inflight RPC
   |
   +-- accepts new work
```

```go
var draining atomic.Bool

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if draining.Load() || !dbPoolReady() || !configLoaded() {
        http.Error(w, "not ready", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
}

func drainHandler(w http.ResponseWriter, r *http.Request) {
    draining.Store(true) // handler must remain safe if invoked more than once
    w.WriteHeader(http.StatusNoContent)
}

func shutdown(httpServer *http.Server, grpcServer *grpc.Server) {
    draining.Store(true)
    ctx, cancel := context.WithTimeout(context.Background(), 55*time.Second)
    defer cancel()
    httpDone := make(chan struct{})
    go func() {
        _ = httpServer.Shutdown(ctx)
        close(httpDone)
    }()
    grpcDone := make(chan struct{})
    go func() {
        grpcServer.GracefulStop()
        close(grpcDone)
    }()
    select {
    case <-grpcDone:
    case <-ctx.Done():
        grpcServer.Stop()
    }
    select {
    case <-httpDone:
    case <-ctx.Done():
    }
}
```

这个实现还需要四个配套约束：

* HTTP/gRPC 必须设置符合业务上限的 deadline；没有 deadline 的流会无限占住排空预算。
* WebSocket 要有最大连接寿命、客户端重连和会话恢复令牌；它不能无限期依赖旧 Pod。
* 客户端重试使用有限 retry budget 和指数退避；对写请求带幂等键，不能因连接重置无脑重放。
* 若使用 service mesh，需演练 sidecar 与应用进程的终止顺序，确保代理不会比业务进程更早被关闭。

* * *

## 7\. 数据兼容：应用回退不等于业务回退

流量切回 Blue 只意味着新的请求再次进入旧应用。它不撤销 Green 已写入的数据、已提交的支付指令和已投递的消息。

**图：四种回退的边界**

```
Traffic rollback ----> Active Service points to Blue
Application rollback -> Blue image becomes desired revision
Data rollback -------> requires compatible schema or planned migration
Business rollback ---> requires reconciliation and compensation
```

因此 Schema 变更必须跨多个 release 实施，而不是和应用切流放在同一个不可逆动作中：

```
Release N     Expand: add compatible structure
Release N+1   Migrate: dual read/write and throttled backfill
Release N+2   Contract: remove legacy structure after rollback window closes
```

```sql
-- Release N: Blue and Green both accept a nullable column
ALTER TABLE orders ADD COLUMN risk_level VARCHAR(16);

-- Backfill in resumable, throttled key ranges
UPDATE orders
SET risk_level = 'NORMAL'
WHERE id > :last_id
  AND id <= :last_id + 5000
  AND risk_level IS NULL;

-- Release N+2 only: old code is gone and rollback window is closed
ALTER TABLE orders
ALTER COLUMN risk_level SET NOT NULL;
```

订单创建应将订单记录、幂等键和 Outbox 事件置于同一数据库事务中。下面是简化后的服务逻辑，实际项目还应处理唯一键冲突、事务隔离级别与可观测性字段：

```go
func CreateOrder(ctx context.Context, req CreateOrderRequest) (Order, error) {
    return inTransaction(ctx, func(tx Tx) (Order, error) {
        if order, found := tx.FindOrderByIdempotencyKey(req.IdempotencyKey); found {
            return order, nil
        }
        order := NewPendingOrder(req, "NORMAL") // Blue can read the nullable/default-compatible field
        if err := tx.InsertOrder(order); err != nil {
            return Order{}, err
        }
        if err := tx.InsertOutbox("OrderCreated", order.ID, order); err != nil {
            return Order{}, err
        }
        return order, nil
    })
}
```

消费者通过 Inbox 或去重表处理至少一次投递；支付、库存等动作以订单号、支付流水号、库存预留号作为对账键。发生回退时，补偿由业务状态机驱动，不能以"删除 Green 写入的数据"代替。

* * *

## 8\. 容量门禁：发布峰值按 requests 计算

BlueGreen 是用资源交换回退能力。稳态能运行，不代表同一命名空间、节点池和故障域能同时运行 Blue 与 Green。

本案例中：

```
Blue requests  = 8 x (500m CPU, 512Mi) = (4 CPU, 4Gi)
Green requests = 8 x (500m CPU, 512Mi) = (4 CPU, 4Gi)
Workload total = (8 CPU, 8Gi)
Required headroom >= Green requests + system reserve + failure-domain reserve
```

这里应按 requests 而非 limits 判断调度可行性；还要加上 DaemonSet、其他同期发布服务、节点维护或单 AZ 故障时的冗余。HPA 只能调 Pod 副本数，不能扩节点。节点容量不足时，应由 Cluster Autoscaler、Karpenter 或预先定义的节点池扩容流程处理。

Promote 前的检查不是简单地看"命名空间有没有 Pending Pod"，因为无关工作负载会产生噪声。应聚焦本次 revision：

```bash
# ResourceQuota 的 hard/used 与本次 Green requests 是否匹配
kubectl -n trade-prod describe resourcequota

# Rollout 是否已具备计划副本；同时查看 pause / analysis 状态
kubectl argo rollouts get rollout order-service -n trade-prod

# 识别本次调度、拉取镜像、挂载卷的失败原因
kubectl -n trade-prod get events --sort-by=.lastTimestamp

# 结合 15-30 分钟监控趋势判断节点与订单服务余量
kubectl top node
kubectl -n trade-prod top pod -l app=order-service
```

* * *

## 9\. 脱敏复盘：约 3 分钟发现，流量回退，业务继续对账

回到开头的风控客户端连接池事件。以下时间线展示的不是"理想流程"，而是线上值班人员真正需要看见的证据和动作。

| 时间 | 事件 | 系统判断与动作 |
| --- | --- | --- |
| 10:00 | Green Preview 的 2 个副本 Ready | 冒烟 Job 校验 build SHA、风控依赖和 dry-run 下单 |
| 10:05 | 发布负责人批准 promote | Green 扩至 8 个 Available；Active Service 指向 Green |
| 10:07:00 | 第一次纯 Green 指标窗口开始采样 | 样本量通过；风控 gRPC deadline 上升，但尚未达到失败次数 |
| 10:07:30 | 第二次采样仍异常 | 5xx 达 0.42%，下单成功率降至 99.41%，AnalysisRun 失败 |
| 10:07:35 | Argo 回指 Blue | 新请求回到 Blue；Green 保留 120 秒以采集连接池、goroutine、日志现场 |
| 10:08 起 | 业务对账 | 对比幂等键、Outbox、支付流水和库存预留；确认 12 笔 Green 订单均可由 Blue 读取且未重复执行 |
| 10:20 | 变更关闭 | 回退镜像 digest，修复连接池参数；Schema 不做 Contract，保留兼容窗口 |

这里有两个重要细节：

1. AnalysisRun 的失败让流量快速回到 Blue，但不自动判断那 12 笔订单是否需要补偿。发布平台应自动创建对账任务并附上 revision、时间窗和 trace/query 链接。
2. Blue 能够继续读取 Green 写入的数据，是因为 `risk_level` 在 Expand 阶段保持可空/默认兼容；若本次同时执行了破坏性 DDL，这次应用回退会扩大为数据库事故。

复盘的结论不是"阈值设得很敏感"，而是：将连接池上限、拨号超时、下游 deadline 和 retry budget 写入容量测试与 Preview 检查；将下游 gRPC 错误率纳入 post-promotion AnalysisTemplate，而不仅观察 HTTP 5xx。

* * *

## 10\. 可审计的发布流水线

生产发布不应依赖某人临时在集群中执行 selector patch。建议由 GitOps 或 CI/CD 控制器提交不可变镜像 digest，发布平台只在受控的批准节点提供 promote/abort 操作。

**图：发布证据链与决策点**

```
Commit -> image digest -> Preview evidence -> approval
   |                                         |
   v                                         v
schema migration --------------------> Promote
                                             |
                                             v
                              AnalysisRun + business SLI
                                       |                 |
                                       v                 v
                               rollback log       release record
```

一条可审计流水线应按下列顺序执行：

1. 构建、扫描、签名镜像，并只引用 digest。
2. 执行单元、集成、契约与安全测试。
3. 如需数据变更，先执行 Expand migration，并记录 migration ID；确认 Blue/Green 都兼容。
4. 提交 Rollout image digest，部署 Green Preview。
5. 通过 startup/readiness、依赖连通性、契约与 dry-run 冒烟。
6. 检查 Green 副本、资源配额、节点余量和拓扑分散。
7. 对订单、支付、库存等高风险服务进行人工批准。
8. promote，待 Green 达到生产副本并切换 Active Service。
9. 运行 post-promotion SLO、依赖和业务 SLI 分析。
10. 失败时自动回指 Blue、保留 Green 现场、创建对账任务；成功后在观察期结束缩容 Blue。
11. 在后续 release、回退窗口关闭后，才考虑 Contract migration。

常用命令如下。它们是已审批流程中的操作入口，不是绕开流水线的替代方案：

```bash
# 查看当前 revision、暂停位置、ReplicaSet 和 AnalysisRun
kubectl argo rollouts get rollout order-service -n trade-prod --watch
kubectl -n trade-prod get analysisrun

# 在 Preview 证据和人工批准完成后执行
kubectl argo rollouts promote order-service -n trade-prod

# 仅用于仍在进行中的异常发布；之后必须继续检查业务副作用
kubectl argo rollouts abort order-service -n trade-prod
```

每一次发布至少留存以下证据：Git commit、镜像 digest、Schema migration ID、Preview Job 结果、批准人、AnalysisRun 结果、Active Service hash、回退决定、对账任务编号及结论。这样审计才能回答"谁在何时以哪个版本改变了什么，以及它为何被接受或回退"。

* * *

## 11\. 上线前检查清单

### 应用与连接

* startup、readiness、liveness 的职责分离；readiness 能反映 drain 状态。
* `/internal/drain` 幂等、受保护且快速返回；终止预算覆盖 preStop、排空和 sidecar。
* HTTP/gRPC 有 deadline；WebSocket 有重连与会话恢复策略。
* 写操作具备幂等键；客户端实施 retry budget 和指数退避。

### Kubernetes 与交付

* Active/Preview Service 的 hash selector 与预期 ReplicaSet 一致。
* Green 已达计划副本数、全部 Ready，并满足拓扑分散。
* `scaleDownDelaySeconds` 覆盖完整 post-promotion 分析与收敛缓冲。
* ResourceQuota 和节点可分配 requests 覆盖 Blue、Green、系统和故障域冗余。
* 镜像使用 digest；发布、批准、AnalysisRun、回退均有记录。

### 数据与业务

* 当前 Schema 兼容 Blue/Green；本次不执行不可逆 Contract。
* 回填可限速、暂停和续跑；migration ID 可追踪。
* 订单、支付、库存有状态机、Outbox/Inbox、对账和补偿流程，并完成演练。
* 镜像流量仅覆盖无副作用或严格 shadow 隔离的请求。

### 可观测性

* 有最小样本量、5xx、P95/P99、资源饱和、下游错误和业务成功率门禁。
* PromQL 已验证真实标签、量纲、空结果和低流量行为。
* 告警和对账任务可关联 revision、镜像 digest、订单号和请求 trace。

* * *

## 结语

蓝绿发布的工程价值，不是让一次变更看起来像"无中断切换"，而是承认变更会失败，并提前把失败限制在可理解、可观测、可回退和可补偿的范围内。

对交易系统而言，真正可靠的答案永远包含四层：流量能否快速回到稳定版本，旧代码能否继续理解新数据，已发生的业务动作如何对账，以及整个判断过程能否被重复和审计。Argo Rollouts、Kubernetes、Istio 和 Prometheus 只是实现这些约束的工具；把它们放进正确的边界和流程，才是生产级渐进式交付。
