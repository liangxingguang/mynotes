---
title: 高性能弹性扩展智能体中台架构：FastAPI+Nacos+RocketMQ+LangGraph+Milvus+ES+Redis+MySQL 实践
source: 微信公众号「AI技术达摩院」
source_url: https://mp.weixin.qq.com/s/3vZDwVLMVSpVk2_LOYrwGg
source_type: article
platform: 微信公众号
captured: 2026-10-27
registered_at: 2026-10-27
inbox_ref: Inbox/2026-10-27-agent-platform-architecture.md
asset_ref: Assets/2026/10/agent-platform-architecture.md
---

# 高性能弹性扩展智能体中台架构：FastAPI+Nacos+RocketMQ+LangGraph+Milvus+ES+Redis+MySQL 实践

定位：企业级多 Agent 中台，支持业务智能体编排、RAG 知识库、异步任务、向量检索、全量检索、状态持久化、配置与服务发现，具备弹性扩缩容、可观测、高可用能力。

## 技术栈清单 & 选型思考

> 选型对比：为什么选它、备选方案、不选备选的理由

| 组件 | 选型思考 | 备选方案 | 不选备选的原因 |
| --- | --- | --- | --- |
| FastAPI | 中台 HTTP 服务载体。Python 异步原生，适配大模型 IO 密集特征；Pydantic 强类型校验、OpenAPI 自动文档；原生兼容 OpenAI 接口协议。拆为**在线服务（同步对话）+ Worker 消费服务（异步任务）**两套无状态服务，方便 K8s 独立扩缩容 | Starlette、Tornado、Gin(Go) | Starlette 缺少开箱即用的参数校验、依赖注入；Tornado 生态老旧；Gin 性能更高，但 LangGraph/Embedding/RAG 的 Python 生态成熟度远高于 Go，跨语言序列化、状态传递复杂度上升 |
| Nacos | **服务注册发现 + 动态配置中心 + 命名空间隔离**二合一，减少中间件数量。核心诉求：热更新 Agent 提示词、召回参数、向量库连接配置；namespace 隔离 dev/test/prod，group 区分业务线；支持权重灰度 | Apollo、Consul、etcd | Apollo 配置强但服务发现弱，需额外注册中心；Consul/etcd 缺可视化配置界面与权限管理，企业运维不友好 |
| RocketMQ | 异步解耦核心，承载文档解析、长耗时 Agent 任务、事件通知。集群消费、顺序消息、死信队列；堆积告警、重试完善；消息轨迹便于排查 | Kafka、RabbitMQ | Kafka 适合高吞吐日志流，重试/死信/事务消息弱于 RocketMQ；RabbitMQ 海量堆积下稳定性差，不适合大批量文档分块向量化 |
| LangGraph | Agent 编排状态机核心。原生支持循环、分支、多节点工具调用、状态持久化 Checkpointer；支持多智能体协作（规划/检索/校验/总结）；状态可序列化，适配 Redis+MySQL 混合持久化 | LlamaIndex Workflow、自定义状态机 | 自研状态机成本极高（持久化、断点续跑、循环分支、并发保护）；LlamaIndex Workflow 偏单 RAG 应用，多 Agent 复杂协作弱 |
| Milvus | 向量数据库，RAG 向量检索核心。多索引（FLAT/IVF/HNSW）按规模切换；集群部署、动态扩容；向量过滤；成熟监控与迁移方案 | Chroma、FAISS、Qdrant | Chroma 适合原型、生产稳定性差；FAISS 本地库无分布式，做不了多租户中台；Qdrant 国内社区与企业支持少于 Milvus |
| Elasticsearch | 全文检索，与 Milvus 构成混合检索。存文档块原文、元数据；关键词检索、多维过滤；分词解决向量检索对专有名词/编号匹配弱的痛点 | OpenSearch | 能力接近，但国内运维案例、中文分词插件生态 ES 更成熟 |
| Redis | 缓存底座：会话缓存、LangGraph RedisSaver、分布式锁、限流、消息幂等、布隆过滤器。单组件承载多种分布式能力 | Redis Cluster（形态）、Memcached | Memcached 只支持简单 KV，无持久化与 Lua，无法实现分布式锁、布隆过滤器 |
| MySQL | 结构化业务元数据持久化：Agent 定义、知识库元信息、用户权限、任务主表、审计日志；事务保障一致性 | PostgreSQL | pgvector 可兼任向量库但大规模场景弱于 Milvus；纯元数据场景 MySQL 生态与运维储备更普遍 |

* * *

## 一、整体架构分层

```
┌─────────────────────────────────────────────────────┐
│ 接入层：前端/第三方系统、OpenAI兼容接口、SDK调用        │
└───────────────────────────┬─────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────┐
│ API网关层：FastAPI集群（Nacos注册）                    │
│  - 鉴权、限流、参数校验、路由分发、接口版本管理          │
│  - Agent会话接口、知识库管理接口、任务提交接口           │
└───┬───────────────┬────────────────────┬────────────┘
    │               │                    │
┌───▼───┐      ┌────▼─────┐        ┌─────▼─────┐
│同步Agent│      │异步任务生产者│       │配置&服务发现│
│LangGraph│      │RocketMQ   │        │ Nacos     │
└───┬───┘      └────┬─────┘        └───────────┘
    │               │
┌───▼───┐      ┌────▼─────┐
│Agent服务集群   RocketMQ消费服务集群（FastAPI Worker）│
│LangGraph执行器 │文档解析、Agent后台任务、工具回调     │
└───┬───┘      └────┬─────┘
    │               │
┌───▼───────────────▼─────────────────────────┐
│ 存储层                                        │
│ Redis：会话缓存、分布式锁、限流、去重            │
│ MySQL：智能体定义、知识库、任务记录、权限         │
│ Milvus：向量库（Embedding）                    │
│ ES：全文检索（原始文档）                         │
└─────────────────────────────────────────────┘
```

> 架构选型思路：**在线链路与异步任务物理隔离**，避免长耗时文档解析任务抢占实时对话资源；所有服务无状态，依托 Nacos 服务发现，K8s 弹性扩缩；存储分层各司其职，不把所有数据塞到一个存储。

## 二、各组件职责详解 & 补充选型思考

### 1\. FastAPI

中台核心 HTTP 服务载体，异步特性适配大模型 IO 密集场景。对外提供 RESTful API，兼容 OpenAI 接口格式。拆分为两类服务：

* **在线服务**：对话、Agent 实时推理、知识库检索（同步链路）
* **Worker 服务**：RocketMQ 消费者，处理文档解析、长耗时 Agent 任务、批量向量入库（异步链路）

选型思考：选 Python+FastAPI 核心是 **LLM 生态优先**。LangGraph、Embedding、RAG 工具绝大多数原生 Python；选 Go 需大量跨语言调用。代价是 GIL 限制 CPU 密集计算，所以 Embedding、文档解析 heavy 任务剥离到独立异步 Worker。

所有实例注册到 Nacos。中间件：请求日志、链路追踪、全局异常捕获、鉴权、Redis 限流。

### 2\. Nacos

核心价值：动态配置 + 微服务注册发现 + 环境隔离

* 服务注册发现：FastAPI 实例注册，软负载均衡
* 配置中心：模型地址、Embedding 参数、Milvus/ES/Redis 连接、Agent 提示词模板、RAG 召回参数、限流阈值，热更新不重启
* 命名空间隔离 dev/test/prod，Group 区分业务线，权重灰度

选型思考：中台大量参数需**热更新**（召回 topk、prompt 模板、相似度阈值）。Nacos 注册+配置二合一。业务量极大时可 Nacos+Apollo 组合，但绝大多数企业中台 Nacos 足够。

### 3\. RocketMQ

异步解耦核心，解决 Agent 长耗时任务阻塞在线接口问题。Topic 规划示例：

* `agent-task-topic`：异步 Agent 任务（长时间推理、多轮复杂工作流）
* `doc-parse-topic`：知识库文档上传后的解析、分块、向量化
* `agent-event-topic`：Agent 生命周期事件（开始/结束/失败，审计通知）

使用要点：消息幂等（Redis 去重 + MySQL 唯一索引）、死信队列人工重试、集群消费水平扩容、顺序消息（文档分片入库）。

选型思考：文档解析需要重试、失败告警、死信人工处理，不是单纯日志流。Kafka 高吞吐但重试弱；RabbitMQ 堆积稳定性差。

> 边界：纯日志采集场景优先 Kafka；业务任务事件优先 RocketMQ。

### 4\. LangGraph

智能体编排引擎，状态机驱动多 Agent 协作。管理对话历史、工具返回、中间推理结果；支持循环分支，自主调用工具（RAG 检索、数据库查询、API 调用）。

状态持久化：临时状态 Redis（会话级过期清理）；持久状态 MySQL（完整工作流快照，断点续跑）。

多 Agent 模式：单 Agent+工具；多 Agent 协作（规划/检索/校验/总结）。LangGraph graph 作为服务内部实例可多实例并发，Graph 可序列化存储。

选型思考：不自研状态机（序列化、断点续跑、并发锁、分支循环工程量巨大易有隐藏 bug）。LlamaIndex Workflow 偏单应用 RAG，多 Agent 多层级协作弱。LangGraph 短板：原生非分布式，必须搭配 RedisSaver，多实例同会话操作加分布式锁规避状态覆盖。

> 核心取舍：LangGraph 解决编排能力，分布式能力由外部存储（Redis+MySQL）补齐。

### 5\. Milvus

向量数据库。存文档分片 Embedding；TopK 召回；FLAT/IVF/HNSW 按数据量选择；按知识库隔离 Collection；向量维度、索引参数、召回 TopK、距离度量经 Nacos 热更新。

混合检索：query → embedding → Milvus 向量召回 + ES 全文召回 → 重排。

选型思考：FAISS 只适合单机原型；Chroma 生产稳定性差；pgvector 可轻量备选小知识库。取舍：Milvus 只负责向量不存原文，原文交给 ES。

### 6\. Elasticsearch

全文检索，弥补向量检索关键词匹配不足。存原始文档块与元信息；关键词+过滤检索；与向量结果重排提升 RAG 准确度；文档生命周期管理。

> Milvus+ES 混合检索是企业 RAG 中台标配。边界：文档体量巨大时 ES 存储成本偏高，可只存摘要元数据，原始文件放对象存储。

### 7\. Redis

中台缓存 & 分布式能力底座：Agent 会话缓存、LangGraph Checkpointer 轻量状态、分布式锁（防同一文档并发解析）、接口限流、消息幂等去重、热点数据缓存、布隆过滤器。

风险点：会话存储做好过期策略；关键业务状态不能只依赖 Redis，MySQL 兜底。

### 8\. MySQL

业务元数据持久层：用户/应用/权限/API Key、智能体定义（graph 配置、工具列表、提示词模板 ID）、知识库元数据、Agent 任务主表、审计日志。

选型思考：只存结构化元数据，不存大文本（ES）、向量（Milvus）。

## 三、核心业务流程示例：RAG 智能体对话

### 同步链路（用户实时对话）

用户请求 → FastAPI 在线服务鉴权限流 → 加载 Agent 配置（Nacos）初始化 LangGraph 状态 → Query Embedding → Milvus 向量召回 + ES 全文检索 → 组装 Prompt 送 LLM → LangGraph 推理按需循环调用检索/工具 → 流式返回 → 会话状态写 Redis，日志写 MySQL

> 同步链路追求低延迟；heavy 计算全部剥离到异步链路。

### 异步链路（知识库文档上传）

上传文档 → FastAPI 写 MySQL（状态=待解析）→ 发 `doc-parse-topic` → Worker 消费：加载→分块→Embedding → 向量写 Milvus、文本块写 ES → 更新 MySQL 状态完成；发 `agent-event-topic` → 失败进死信告警

> 文档解析、Embedding 属 CPU 密集，**绝对不能放在在线 API 链路**。

## 四、高可用 & 弹性扩展设计

* 服务无状态水平扩容，Nacos 自动发现
* 存储高可用：MySQL 主从/MGR；Redis 哨兵/Cluster；Milvus 集群（coordinator+data node）；ES 多节点；RocketMQ NameServer 集群+Broker 主从
* 熔断降级：Redis 熔断标记，向量库/大模型不可用返回兜底；Nacos 开关动态关闭 Agent 能力
* 可观测性：OpenTelemetry 全链路（FastAPI→LangGraph→Milvus/ES/MySQL）；Prometheus+Grafana（QPS、耗时、MQ 堆积、向量检索耗时）；Loki/ELK 日志；堆积/下线/异常/失败告警

> 可观测组件单独一套，不与业务中间件耦合；OpenTelemetry 优先统一埋点。

## 五、关键风险点与生产避坑

1. **LangGraph 并发与状态**：原生非分布式，Checkpointer 必须 RedisSaver；多实例同会话 ID 加分布式锁防状态错乱
2. **Embedding 性能瓶颈**：CPU 密集，独立部署+缓存；大批量走 RocketMQ 异步，不走同步接口；Embedding 服务单独扩缩容不混部
3. **Milvus 容量与索引**：大数据量不用 FLAT；分 Collection 隔离知识库；定期清理过期向量（测试 FLAT，生产 HNSW）
4. **RocketMQ 消息堆积**：监控堆积量自动扩 Worker；消息体只传任务 ID，文档内容不进 MQ
5. **混合检索调优**：召回数量、重排策略经 Nacos 动态配置，不重启调参
6. **事务一致性**：MySQL/Milvus/ES 多写无法强一致，采用最终一致性；消费失败重试+定时任务校对补偿，放弃分布式事务降复杂度

## 六、推荐项目目录结构（Python）

```
agent-platform/
├── app/
│   ├── main.py                # FastAPI入口
│   ├── api/                   # 路由：agent、knowledge、task
│   ├── agent_graph/           # LangGraph 智能体定义、节点、状态
│   │   ├── graphs/
│   │   ├── tools/             # Agent工具：RAG检索、数据库查询
│   │   └── checkpointer.py    # RedisSaver
│   ├── nacos_client.py        # Nacos配置&服务注册
│   ├── mq/                    # RocketMQ生产者、消费者
│   ├── storage/
│   │   ├── mysql/
│   │   ├── redis/
│   │   ├── milvus_client.py
│   │   └── es_client.py
│   ├── schemas/               # Pydantic模型
│   ├── middleware/            # 鉴权、限流、链路追踪
│   │   └── utils/
├── worker/                    # RocketMQ消费服务（独立进程/容器）
├── config/
├── requirements.txt
└── docker-compose.yml         # 本地开发环境
```

## 七、部署形态

推荐 Docker + K8s：在线服务、Worker 独立 Deployment + 独立 HPA（文档解析暴涨只扩 Worker，不影响在线对话）；中间件用 K8s Operator；配置统一 Nacos，环境变量极少；开发环境 docker-compose 一键拉起。

来源公众号：AI技术达摩院
