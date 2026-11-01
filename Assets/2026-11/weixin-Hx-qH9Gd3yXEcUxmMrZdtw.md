> 全文所有技术栈版本均经过实测可跑通。方案以通用最佳实践为主，仅适配特定机器的变通方案会标注 **【仅本机】**。

## 写在前面：Demo 和企业可用产品，隔着一道叫「治理」的墙

过去两年，见过太多 RAG Demo。经典套路大同小异：Python 脚本读取文档 → 向量化存入向量库 → 检索片段拼接 Prompt → 调用大模型。短短几分钟就能跑通，演示效果看着很不错。

但一旦想要落地到企业真实业务，一堆棘手问题会立刻浮出水面：

*   财务部、研发部的知识库，如何做到数据隔离，互不可见？
    
*   谁有权查看、编辑、删除知识库？权限体系怎么设计？
    
*   如果有人高频刷接口，怎么做好限流保护，避免服务被打垮？
    
*   大模型调用消耗了多少 Token、折合多少成本，能不能清晰对账？
    
*   用户提问违规、管理员越权操作，有没有完整链路用于事后审计追溯？
    
*   用户上传 200 页 PDF，总不能让前端 HTTP 请求原地等待几十秒超时？
    
*   模型一本正经编造不存在的答案，有没有可靠机制拦截幻觉？
    

**这些问题的解决方案，才是把 Demo 变成企业可用产品的核心门槛。**

本文完整拆解这套企业级 RAG 平台的设计思路，整套系统由 **5 个应用进程 + 6 类中间件** 组成，端到端可跑通，全部代码开源。它不只是简单实现问答，而是把下面这些企业刚需能力全部落地：

*   **异步文档导入**
    
    ：文件上传立即返回，解析、分块、向量化重任务交给 RocketMQ，实现 Java 与 Python 跨语言协同
    
*   **混合检索能力**
    
    ：Milvus 向量检索 + ES BM25 全文检索双路召回，RRF 融合排序 + gte-rerank 重排精排
    
*   **幻觉拒答底线**
    
    ：相关性裁判判定资料不足时，优先回复「不知道」，从机制上杜绝强行编造答案
    
*   **MCP 工具调用**
    
    ：知识库无法回答的问题，自动调用业务接口查询实时数据再生成回答
    
*   **企业级五层记忆**
    
    ：加权遗忘策略、PII 脱敏、记忆导出 / 删除 / 审计闭环，告别金鱼式短时记忆
    
*   **完整治理体系**
    
    ：多租户行级隔离、Casbin 双层授权、JWT 令牌吊销、令牌桶限流、Token 计量成本核算、全链路审计
    

内容篇幅较长，建议先收藏。我会从全景架构逐层拆解到实现细节，不只讲方案怎么做，更讲选型理由、业务取舍以及踩过的线上深坑。

* * *

## 一、30 秒看懂全貌：5 进程 + 6 类中间件

先看整体架构，建立全局认知：

```
             ┌──────────── Nacos 3.2.4 —— 注册 / 心跳 / 服务发现 ────────────┐             └──▲───────────────────▲────────────────────▲──────────────────┘                │ 注册              │ 注册               │ 注册 + lb:// 发现   HTTP / SSE   │                   │                    │浏览器 ────────▶┌──┴──────────┐  ┌───┴───────────┐  ┌────┴────────────────┐:5173 业务台    │ ai-gateway  │─▶│ ai-business   │  │ ai-intel-platform   │:5174 管理台    │   :8888     │  │    :8081      │  │       :8001         │                │  WebFlux    │  │ Spring Boot 4 │  │ FastAPI + LangGraph │                └─────────────┘  └──────┬────────┘  └──┬───────────┬──────┘                                        │ 生产 MQ        │ 消费       │ 读写                              ┌─────────▼────────┐      │    ┌──────▼──────────┐                              │  RocketMQ 5.5.1  │◀─────┘    │ Milvus   2.5.x  │                              │  namesrv :9876   │           │ ES       8.12.2 │                              │  proxy   gRPC    │           │ Redis    8.10.1 │                              └──────────────────┘           │ MySQL    8.0.x  │                                                             └─────────────────┘
```

**数据流向说明**：Milvus 负责存储向量（知识库集合 + 记忆集合）、ES 承载全文索引做 BM25 检索、Redis 存放热记忆、缓存与限流令牌桶、MySQL 作为权威数据源，存放元数据、冷历史对话、计量账单。

### 1.1 五个进程各司其职

表格

进程

技术栈

端口

核心职责

**ai-frontend**

Vue3 + Vite5 + TS + Pinia + Element Plus

:5173

业务平台：面向租户普通用户，对话问答、用量查询

**ai-admin**

Vue3 + ECharts

:5174

后台管理平台：管理员看板、文档导入、用户 / 角色 / 租户 / 审计管理

**ai-gateway**

Spring Cloud Gateway（WebFlux 响应式）

:8888

统一入口：鉴权授权、限流、条件访问控制、SSE 流式透传

**ai-business-service**

Spring Boot 4 + MyBatis-Plus

:8081

业务中台：登录签发凭证、知识库 CRUD、文件落盘、消息发送、治理 API、MCP Server

**ai-intel-platform**

FastAPI + LangGraph

:8001

智能体中台：问答工作流编排、混合检索、记忆管理、MQ 消费者、MCP Client

这里有一个明确的架构取舍：**前端拆成两个独立工程，不合并打包**。 业务平台面向终端用户，只做问答交互；管理后台面向管理员，负责数据导入、权限管控。知识库的创建、文档导入能力统一归管理员操作，贴合企业「数据管理者、数据使用者分离」的管控诉求。两个工程独立维护登录态，Token 存储前缀隔离，甚至可以部署到不同子域名，互不干扰。

### 1.2 六类核心中间件

表格

中间件

实测版本

系统定位

**Nacos**

3.2.4

统一注册中心，Java、Python 跨语言服务发现枢纽，网关通过 lb:// 实现服务路由

**RocketMQ**

5.5.1

文档导入异步化，Java 业务侧生产消息，Python 智能体侧消费处理

**Milvus**

2.5.x

向量数据库：知识库向量集合 `ai_platform_kb` + 用户记忆向量集合 `ai_platform_memory`

**Elasticsearch**

8.12.2

BM25 关键词检索，必须安装 analysis-ik 分词插件，否则中文会退化成单字切分

**Redis**

8.10.1

热记忆工作台、语义检索缓存、令牌桶限流、Casbin 策略变更广播

**MySQL**

8.0.x

业务元数据、冷对话历史、记忆持久化、用量成本账单，一共 18 张业务表

### 1.3 可直接复刻的版本矩阵

表格

分层

组件

版本

备注

前端

Vue / Vite / TypeScript

3.5 / 5.4 / 5.6

采用 `<script setup>` 组合式写法

前端

Element Plus / Pinia / axios

2.8 / 2.2 / 1.7

组件库、状态管理、网络请求

网关 + 业务

JDK

21（最低兼容 17）

Spring Boot 4 最低要求 JDK17

网关 + 业务

Spring Boot

**4.0.8**

默认 Jackson3，是高频踩坑点

网关 + 业务

Spring Cloud

2025.1.3

网关 Starter 名称变更

网关 + 业务

Spring Cloud Alibaba

2025.1.0.0

内置 nacos-client 3.1.1

业务

MyBatis-Plus

**3.5.17**

必须使用 Boot4 专属 Starter

业务

nimbus-jose-jwt

10.9.1

Boot4 BOM 不再托管，需要手动锁定版本

业务

rocketmq-client

5.5.1

Java 原生 Remoting 客户端

智能体

Python

3.11+

运行环境

智能体

fastapi / uvicorn / pydantic

0.141 / 0.40 / 2.13

异步 Web 框架

智能体

langchain / langgraph

**1.x / 1.x**

锁定 1.x 大版本，0.x API 不兼容

智能体

pymilvus

3.0.1

3.x 客户端兼容 2.5.x 服务端，实测稳定互通

智能体

rocketmq-python-client

5.1.2

注意包名，容易装错

大模型

DashScope（百炼）

qwen-plus / text-embedding-v3 / gte-rerank-v2

OpenAI 兼容模式，重排使用原生 SDK

> 关于熔断说明：整套方案没有引入 Sentinel、Resilience4j。接口超时配置已经配齐，熔断属于可选增强。在 Boot4 环境下，引入熔断组件带来的兼容性风险大于收益，因此预留留白。但 LLM 调用链路单独手写了轻量防护守卫，**Java 业务层可以不做熔断，LLM 调用链路的熔断重试不能省**。

* * *

## 二、六条核心设计思想，所有方案都由此推导

在进入功能细节之前，先梳理贯穿整套系统的六条设计原则，后面每一处代码实现，都可以追溯到这里。

### ① 重活异步化：HTTP 请求不承载耗时脏活

文档上传的朴素写法，是同步完成解析、分块、向量化、入库，一份 200 页 PDF 很容易直接把 HTTP 请求拖到超时。 本方案思路：**HTTP 接口只做文件登记、写入数据库、发送消息，立刻返回 docId，所有耗时任务交给 RocketMQ 消费者异步处理**。前端通过轮询感知文档状态从 `PENDING` 流转到 `DONE`。

### ② 治理能力默认影子模式，灰度验证后再强制收口

这是治理功能能够平稳上线的核心。所有强管控开关默认先进入观察态：

```
CASBIN_ENFORCE        = false   # 授权：只记录日志，不拦截请求QUOTA_DRY_RUN         = true    # 配额管控：只统计审计，不拦截超限请求CONDITIONAL_ACCESS_DRY_RUN = true   # 条件访问：仅告警，不拒绝访问
```

**并行观察一周，校验日志里本该拒绝的请求有没有误杀，确认无误后，再逐项开启强制拦截。** 如果直接上线强管控策略，一旦出现误伤，业务方会直接否定整套系统。

### ③ 所有增强能力都是旁路，失败自动降级，绝不阻断主链路

这条原则在代码里落地非常严格：几乎所有旁路模块都包裹异常捕获 + 降级逻辑。

*   记忆检索失败 → 返回空列表，降级使用会话摘要注入上下文
    
*   记忆压缩失败 → 截断对话窗口至最近 6 轮，打点记录异常
    
*   语义缓存写入失败 → 仅打印日志，不打断流式问答
    
*   PII 脱敏失败 → 返回原文，不阻断问答流程
    
*   Rerank 重排失败 → 直接使用 RRF 融合分数排序，主链路正常运行
    

**AI 系统的可用性上限，取决于它对薄弱环节故障的容忍能力。**

### ④ 数据隔离靠框架兜底，不能依赖开发自觉

多租户场景最大风险：新开发 SQL 忘记拼接 `tenant_id`，造成跨租户数据泄露。 方案采用 MyBatis-Plus 的 `TenantLineInnerInterceptor`，**框架层自动注入租户条件**，从底层杜绝漏写租户 ID 的风险，不需要开发手动维护。

### ⑤ 跨语言契约字段逐字对齐，不依赖命名转换

Python 侧 Pydantic 模型，统一使用驼峰命名（`kbId` / `fileName` / `docId`），和 Java 侧 Record 实体 `IngestMessage(Long kbId, Long docId, String fileName, ...)` 字段完全一致。 不依赖 Jackson 自动命名策略转换，少一层配置，就少一层静默返回 null 的隐性 Bug。

### ⑥ 记忆模块必须可度量、可追溯、可恢复

这是记忆子系统的核心纲领：**不可度量的记忆等于没有记忆**：压缩次数、成功率、失败原因，全部埋点统计；**不可追溯的记忆不可信**：记忆新增、压缩、导出、删除全流程留审计日志；**不可恢复的记忆是技术负债**：支持一键导出、定向删除。

* * *

## 三、链路 A：文档导入 —— 上传请求不再被大文档拖死

### 3.1 完整链路

```
Vue前端上传multipart文件 / 内联文本  → 网关转发 /api/business/kb/{id}/documents/upload  → 业务中台：文件落盘 + 写入kb_document(status=PENDING) + 发送RocketMQ消息 → 立即返回docId  → Python消费者接收消息 → ingest_document()处理        文档解析 → 文本分块 → 向量化 → 写入Milvus + ES → 回写状态DONE、记录chunk数量  → Vue前端每2s轮询文档状态接口
```

核心收益：**上传接口响应时间，和文档体积彻底解耦**。

### 3.2 跨语言 RocketMQ：两套协议，同一个 Broker

这是这条链路很有意思的工程细节：

*   **Java 业务侧**
    
    ：经典 Remoting 客户端 `DefaultMQProducer`，连接 namesrv:9876
    
*   **Python 侧**
    
    ：5.x gRPC 客户端 `rocketmq-python-client`，连接 proxy 的 gRPC 端口
    

两套协议通路，最终落到同一个 Broker、同一个 Topic，实测两端 msgId 完全对齐：

```
业务侧日志：ingest message sent: msgId=AC15…  status=SEND_OKPython 日志：recv ingest msg id=AC15… → ingest done chunks=1
```

Python 消费端 `receive()` / `ack()` 是阻塞 API，内部自带 asyncio 事件循环，因此消费循环必须放在独立线程，再通过 `asyncio.run_coroutine_threadsafe` 回调回主事件循环：

```
# 消费循环独立线程，桥接回主事件循环def _consume_loop():    while True:        msgs = consumer.receive(...)   # 阻塞拉取，无消息返回空数组        for m in msgs:            asyncio.run_coroutine_threadsafe(                handle(m), main_loop)   # 回调主协程            consumer.ack(m)
```

### 3.3 分块策略：QA 模式、滑窗模式自动切换

分块质量直接决定召回效果，`rag/chunker.py` 实现自动识别切换：

*   语料是「问：… / 答：…」、空行分隔的问答格式 → **QA 模式**，一个问答对作为一个 Chunk。问题利于召回、答案用于生成，天然适配 RAG。示例 53 组问答，切分成 53 个 Chunk。
    
*   普通长文资料 → **滑窗模式**，`chunk_size`、`chunk_overlap` 从知识库配置表读取，每个知识库可以独立配置。
    

### 3.4 幂等导入：chunk\_id 设计，避免重复切片

重复导入同一份文档，不能生成重复向量切片，ID 方案如下：

```
chunk_id = sha1(f"{doc_id}:{seq}")[:32]
```

同一份文档、同一个序号，永远复用同一个 chunk\_id，重导之前先按 `(kb_id, doc_id)` 清理旧切片，防止残留脏数据。 Milvus 存储向量 + 元数据、ES 存储全文 + 元数据，两边 chunk\_id 严格对齐，这也是后续 RRF 融合排序的前提。

> 通用踩坑提示：Milvus2.5 存在有界一致性窗口，upsert/delete 成功后立刻检索，有可能读到旧数据。delete+upsert 之后马上 count，偶尔返回 0，大约 5 秒后数据稳定。导入自检要么增加等待，要么检索时指定 `consistency_level="Strong"`。ES bulk 默认 `refresh=False`，导入管线里主动刷新索引，保证新切片立刻可检索。

* * *

## 四、链路 B：问答 —— RAG 质量的四道关卡

### 4.1 完整问答链路

```
Vue发起提问  → 网关 /api/agent/qa/stream（POST + Bearer JWT）  → LangGraph工作流：     load_memory  (热窗口 + 摘要 + 用户画像 + 历史记忆向量检索注入)     → retrieve   (Milvus向量检索 + ES BM25 → RRF融合 → gte-rerank重排)     → grade      (相关性裁判)         ├─ 资料充分 → generate   (qwen流式输出，带上引用标记 [n])         └─ 资料不足 → intent_route → 判断是否匹配工具                              ├─ 匹配工具 → mcp_tool_call → combine_generate                              └─ 无可用工具 → refuse (固定拒答话术)     → save_memory (Redis + MySQL + PII脱敏 + 异步写入记忆向量索引)  → SSE事件流：refs → delta分片 → done，网关原样透传，前端逐字渲染
```

### 4.2 第一关：混合检索，RRF 融合 + Rerank 精排

单独向量检索容易丢失关键词精准匹配，单独 BM25 检索抓不住语义。方案两路并行召回，每路召回 `candidate_k=20` 条。

融合环节没有使用加权求和，而是选择 **RRF（Reciprocal Rank Fusion）**。 原因很简单：余弦相似度区间 0~1，BM25 分数可以到 20+，两者量纲完全不一样，加权融合前必须做归一化，归一化参数很难调优。**RRF 只依赖排名，不依赖原始分数，天然避开归一化难题**：

```
_RRF_K = 60  # 经验调优常数def _rrf_fuse(vec_hits, bm_hits):    """按chunk_id融合两路召回结果，累加 1/(k+rank)"""    fused = {}    def _absorb(hits, origin):        for rank, h in enumerate(hits, start=1):            cid = h.get("chunk_id")            if not cid:                continue            slot = fused.setdefault(cid, {...,"rrf": 0.0, "origins": []})            slot["rrf"] += 1.0 / (_RRF_K + rank)            if origin not in slot["origins"]:                slot["origins"].append(origin)    _absorb(vec_hits, "vector")    _absorb(bm_hits, "bm25")    return sorted(fused.values(), key=lambda d: d["rrf"], reverse=True)
```

两路检索使用 asyncio 并发执行，互不阻塞：

```
vec_hits, bm_hits = await asyncio.gather(    milvus_store.search(vec, kb_id=kb_id, tenant_id=tenant_id, limit=candidate_k),    es_store.search(query, kb_id=kb_id, tenant_id=tenant_id, limit=candidate_k),)
```

融合之后取 `max(top_k*2, 10)` 条送入 **gte-rerank-v2** 重排，最终选取 `top_k=5` 条进入上下文。

> Rerank 服务不可用或者调用异常时，自动降级为 RRF 分数排序，主链路持续可用，是旁路降级原则的典型落地。

额外实战优化：重排之后增加正文去重。同一文档多次导入，召回结果会大量重复，按照文本内容去重，相同正文只保留相关性最高的一条，避免前端展示一堆一模一样的引用卡片。

### 4.3 第二关：相关性裁判 —— 宁可说不知道，绝不编造答案

这是严肃场景下 RAG 的底线设计。`grade`节点调用 LLM 裁判，判断检索回来的片段，是否包含回答用户问题必需的信息；判定资料不足，直接走拒答分支。

这里设置两层闸门，第一层是成本闸门：

```
async def grade(state):    chunks = state.get("retrieved") or []    if not chunks:        return {"sufficient": False}    # ① 相关性地板：最高相关性达不到阈值，直接拒答，节省一次LLM调用    rels = [c.get("relevance") for c in chunks if c.get("relevance") is not None]    if rels and max(rels) < settings.REFUSE_SCORE_FLOOR:   # 默认阈值0.15        return {"sufficient": False}    # ② LLM裁判（可切换qwen-turbo降低成本）    resp = await llm_guard.acall(..., primary=settings.GRADE_MODEL)    if resp is None:                      # 守卫调用失败，降级为拒答        return {"sufficient": False}    return {"sufficient": (resp.content or "").strip().upper().startswith("YES")}
```

**裁判重点拦截「主题沾边，但没有答案」的负例**。比如知识库只提到模型名称，用户询问参数量，主题相关但是没有对应信息，这种场景最容易触发模型幻觉。

拒答时还有一个容易忽略的细节：**清空引用列表**。

```
async def refuse(state):    # 拒答场景，不存在知识库来源，同步清空引用，前端不再渲染引用卡片    return {"answer": prompts.REFUSAL_TEXT, "refused": True, "refs": []}
```

不然前端会出现矛盾展示：提示没有相关资料，下方却挂着 5 条引用卡片。

### 4.4 第三关：SSE 流式事件契约

前端要同时实现逐字输出、展示引用卡片，定义清晰的事件契约：

```
event: refs    data: {"type":"refs","refs":[{index,source,snippet,relevance,...}]}event: delta   data: {"type":"delta","text":"…"}                     （多条分片）event: done    data: {"type":"done","answer":"…","refused":false,"refs":[…]}event: error   data: {"message":"…"}
```

一个关键细节：**`refs`事件不在 retrieve 检索完成时下发，而是在 generate 节点启动时才推送**。

```
# 引用卡片延迟下发：只有确认走知识库生成分支，才推送引用if kind == "on_chain_start" and name == "generate":    refs = (data.get("input") or {}).get("refs") or []    if refs and not refs_sent:        yield {"type": "refs", "refs": refs}        refs_sent = True
```

因为检索完成时，还不知道相关性裁判最终判定结果。如果提前推送引用，后续触发拒答，前端已经渲染卡片，再撤回交互体验很差。

### 4.5 第四关：前端 SSE 必须用 fetch，不能用 EventSource

高频踩坑点：**EventSource 只支持 GET 请求，无法自定义 Authorization 请求头**，而问答接口是 POST，必须携带 JWT。axios 在浏览器端无法读取流式分块响应。

最终方案：手写 fetch 读取流，按照 `\n\n` 分割 SSE 帧解析：

```
const res = await fetch(`${base}/api/agent/qa/stream`, {  method: 'POST',  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },  body: JSON.stringify({ question, kbId, sessionId }),  signal,})const reader = res.body!.getReader()// 按 \n\n 切帧，逐帧JSON.parse
```

Token 原始凭证存放在 localStorage，拦截器和 SSE 请求统一读取注入，规避 Pinia 状态循环依赖问题。

> 网关必须是 WebFlux 响应式版本，不能用 Servlet 网关，响应式网关对 `text/event-stream` 天然透传、不做缓冲。

### 4.6 语义缓存：命中直接跳过整条 LLM 链路

相同 `(租户, 知识库, 用户问题)` 命中缓存，直接返回历史答案，跳过检索、裁判、生成整条链路。文档导入成功后，自动清空该知识库缓存，保证刚上传文档立刻提问不会命中旧答案。 这里曾经踩过一个线上 Bug：**缓存命中路径，同样需要触发记忆压缩调度**，第六节会展开说明。

* * *

## 五、让 RAG 长出手：MCP 双通道工具调用

到第四节为止，这套 RAG 还只能读取静态知识库。但企业里大量问题，知识库根本存不下：

*   「我本月消耗了多少 Token，还剩多少额度？」
    
*   「我昨天上传的文档处理完成了吗，切了多少分片？」
    
*   「最近有哪些登录失败审计记录？」
    

这类答案在业务数据库里，属于实时动态数据，不可能提前入库向量化。传统 RAG 遇到这类问题，要么胡编，要么直接拒答。**MCP（Model Context Protocol）就是用来解决这个场景，作为 RAG 的第二条能力通道。**

### 5.1 工作流升级：从线性流程变成条件分支图

```
START → load_memory → retrieve → grade                                  │        ┌─────────────────────────┴─────────────────────────┐        │ 资料充分                                   资料不足 │        ▼                                                    ▼    generate                                       intent_route        │                                                    │        │                              ┌─────────────────────┴──────────────┐        │                              │ 匹配工具                   无工具 │        │                              ▼                                    ▼        │                         mcp_tool_call                         refuse        │                              │                                    │        │                         combine_generate                            │        │                              │                                    │        └──────────────┬───────────────┴────────────────────────────────────┘                       ▼                  save_memory → END
```

核心改动：**grade 判定资料不足之后，不再直接拒答，先走意图路由，判断是否存在可用业务工具查询实时数据**。

### 5.2 意图路由：把 MCP 工具自动转换成 Function Calling

意图路由只做分类，不生成答案，动态拉取 MCP 工具列表，转换成 Function Calling 格式交给大模型：

```
async def intent_route(state):    if not _MCP_AVAILABLE or not settings.MCP_ENABLED:        return {"tool_name": None}    try:        tools = await _mcp.list_tools()          # 动态发现工具，60s缓存    except BaseException as exc:                  # 包含取消异常，降级无工具        return {"tool_name": None}    llm_tools = [{"type": "function", "function": {        "name": t.name, "description": t.description, "parameters": t.inputSchema}}        for t in tools]    resp = await llm_guard.acall(..., primary=settings.INTENT_ROUTE_MODEL, tools=llm_tools)    tool_calls = getattr(resp, "tool_calls", None) or []    if not tool_calls:        return {"tool_name": None}               # 模型判定不需要工具 → 拒答    tc = tool_calls[0]    return {"tool_name": tc["name"], "tool_args": tc.get("args") or {}}
```

优化点：会话上下文自动注入 kbId。用户问「这个知识库有哪些文档」时，经常不会显式携带 ID，模型缺少参数会反复追问；注入上下文后自动从会话读取。

反直觉选型：**意图路由默认使用 qwen-plus，而不是更便宜的 qwen-turbo**。 直觉上分类任务可以用小模型省钱，但是实测相反：

```
# 意图路由模型：仅做分类，不生成答案。默认qwen-plus。# qwen-turbo在部分账号容易持续触发429限流，重试+降级会让工具类问题延迟3~5s；# qwen-plus首请求成功率更高，路由稳定。# combine_generate依旧使用主对话模型保障回答质量，可通过环境变量覆盖。INTENT_ROUTE_MODEL = os.getenv("INTENT_ROUTE_MODEL", "qwen-plus")
```

省下的模型费用，会被 429 重试带来的延迟、失败率吞噬，属于典型局部最优，损害全局体验。

### 5.3 工具调用：区分永久故障、瞬时故障，差异化降级

```
async def mcp_tool_call(state):    try:        result = await _mcp.call_tool_for_user(uid, tid, role, name, args)        return {"tool_result": result, "tool_error": False}    except McpPermanentError as exc:      # 403无权限、工具不存在 → 不重试        return {"tool_error": True, "tool_error_type": "permanent"}    except BaseException as exc:          # 瞬时网络异常 → 上层重试        return {"tool_error": True, "tool_error_type": "transient"}
```

**两类故障必须区分话术**，不然用户会反复重试一个本身没有权限的操作：

```
# combine_generate内部差异化拒答if error_type == "permanent":    return {"answer": prompts.REFUSAL_TOOL_FORBIDDEN, ...}   # 无权限/工具不存在else:    return {"answer": prompts.REFUSAL_TOOL_UNAVAILABLE, ...} # 服务临时不可用
```

### 5.4 权限内建：以当前用户身份调用，不是服务超级账号

这是 MCP 落地企业系统的头号安全坑：工具绝对不能用服务管理员身份执行，否则「查询我的用量」会变成「查询全公司用量」。 方案：**每次工具调用，携带真实用户身份信息**。 智能体侧复用和网关一致的 JWT 密钥，签发 5 分钟短时 JWT，Claims 和用户访问 Token 保持一致（uid/tid/role）。 业务侧在 SSE 握手阶段校验 JWT，把身份存入 `McpTransportContext`

```
// 业务中台：SSE握手从请求头解析JWT.contextExtractor(request -> extractContextFromRequest(request, jwtService))private McpTransportContext extractContextFromRequest(HttpServletRequest request, JwtService jwtService) {    String auth = request.getHeader("Authorization");    if (auth == null || !auth.startsWith("Bearer ")) return McpTransportContext.EMPTY;    JWTClaimsSet claims = jwtService.verify(auth.substring(7), "access");    Map<String, Object> props = new HashMap<>();    props.put("uid", claims.getLongClaim("uid"));    props.put("tid", claims.getLongClaim("tid"));    props.put("role", claims.getStringClaim("role"));    return McpTransportContext.create(props);}
```

**为什么用 contextExtractor，而不是 ThreadLocal？**SSE 是长连接，工具 handler 运行在异步线程，原始请求线程早就结束，ThreadLocal 会丢失上下文，这是 Java MCP SDK 高频踩坑点。

工具内部再次鉴权、设置租户上下文，让 MyBatis-Plus 租户插件继续兜底隔离：

```
private McpSessionContext extractContext(McpSyncServerExchange exchange) {    McpTransportContext ctx = exchange.transportContext();    ...    TenantContext.set(tid);          // 租户插件自动过滤数据    return new McpSessionContext(uid, tid, role);}// 工具内部先鉴权，再执行业务逻辑if (!casbinAccess.allowKb(uid, tid, ctx.role(), kb, "read")) {    return errorResult("无权访问该知识库");}
```

### 5.5 会话池化：摊平单次 200ms 握手开销

每次工具调用新建 SSE 会话，握手 + JWT 校验大约 200ms，对问答链路延迟影响很大。 方案：基于身份维度 `(uid, tid, role)` 做连接池复用：

```
async def _acquire(self, key, uid, tid, role):    async with self._pool_lock:        cached = self._pool.get(key)        if cached is not None and self._fresh(cached, now):            cached.last_used_ts = now            return cached        ...    # 连接建立放在锁外，不阻塞其他身份的连接获取    session = await self._open_session(uid, tid, role)    async with self._pool_lock:        existing = self._pool.get(key)        if existing is not None:            # 并发同时新建会话：复用已经入池的连接，关闭自己新建的            await self._close_cached(session)            return existing        self._pool[key] = session    return session
```

这里是显式安全权衡：每次新建会话才校验吊销，池化复用之后，鉴权只在握手阶段执行一次。用户被禁用后，最长等待 TTL（300s，对齐 JWT 有效期）才会失效，用有限的新鲜度换取 200ms 延迟收益。

Python 侧隐藏深坑：

```
class _CachedSession:    """ctx是sse_client异步生成器：必须保持引用存活。如果函数返回后被GC回收，    CPython会在事件循环空闲时执行finalize，抛出GeneratorExit，    触发内部task group取消正在执行的任务，线上随机CancelledError根源就在这里。"""
```

SSE 上下文对象必须和会话一起缓存、一起关闭，否则会出现随机取消报错。

### 5.6 7 个内置业务工具清单

表格

工具名称

权限

能力说明

`get_usage`

本人

查询当月 Token 消耗、剩余额度

`get_document_status`

知识库读权限

查看文档导入状态、切片数量

`list_knowledge_bases`

本人可见

查询自己可以访问的知识库列表

`search_audit_logs`

管理员

检索登录、操作审计日志，查看失败登录记录

`grant_kb_share`

知识库管理权限

把知识库分享给其他用户

`get_access_policies`

管理员

查询 IP 访问、时段准入策略

`manage_user_status`

管理员

停用用户账号，自动吊销该用户全部令牌

> `manage_user_status` 联动安全逻辑：账号禁用时，同步吊销该用户所有登录凭证，是安全闭环的关键。

* * *

## 六、让 RAG 长出记忆：从金鱼式短时记忆，到企业五层记忆模型

MCP 让 RAG 具备调用外部能力，而记忆系统，让它记住你是谁、你们之前聊过什么。这也是整套系统里最有价值的设计。

### 6.1 传统记忆方案的六大痛点

先梳理实测发现的问题，才能理解方案设计的出发点：

表格

问题

现象

**近因效应、会话目标漂移**

覆盖式摘要，早期对话主题被后面几轮对话挤出，聊着聊着跑偏

**画像事实冗余累积**

用户偏好、事实不断重复写入，只做字面去重，语义重复越来越多

**归档记忆不可检索**

MySQL 保存的历史对话，无法参与检索，长会话翻旧账只能看最近窗口

**压缩无遗忘策略**

触发压缩直接覆盖，不区分重要信息、闲聊信息，同等对待

**压缩失败静默降级**

LLM 限流时，悄悄丢旧对话，没有告警、没有指标，无声丢失记忆

**缺少合规能力**

记忆包含手机号、邮箱等个人信息，无脱敏、导出、删除、审计能力

### 6.2 五层记忆模型

对标认知科学记忆分类，落地五层记忆：

表格

类型

存储载体

生命周期

**① 工作记忆 Working**

请求内组装：最近 N 轮原文 + 检索历史 + 画像关键事实

单次请求，不落盘

**② 情景记忆 Episodic**

Redis 会话摘要、MySQL 跨会话摘要

树状层级，独立失效

**③ 语义记忆 Semantic**

Redis 热画像、Milvus 画像向量索引

长期常驻

**④ 程序记忆 Procedural**

MySQL `memory_rules`

长期

**⑤ 归档记忆 Archival**

MySQL 原文（权威源）+ Milvus 记忆向量副本

永久归档

存储职责边界清晰：

```
Redis   → 热记忆工作台（TTL7天）：对话窗口、摘要、画像、缓存。不存大文本，不作为权威源MySQL   → 权威数据源（永久）：历史全文、跨会话摘要、程序记忆、审计日志。不直接塞进PromptMilvus  → 记忆向量索引（永久）：只存向量+引用ID，原文保存在MySQL
```

> Milvus 只存向量和引用 ID，不存原文。这个约定保证删除记忆时，多端数据一致性，避免两份数据不一致。

### 6.3 L1 压缩：增量摘要合并 + 画像语义去重

**L1 专门解决近因效应、会话目标漂移。**旧方案每次基于最新窗口，覆盖重写整份摘要，早期主题很容易丢失。改成**增量合并模式**：

```
_COMPRESS_USER_MERGE = (    "你手上有一份旧摘要和一段新增对话历史。请把两者合并成一份更新的摘要：\n"    "- goal：对话长期延续，旧goal如果仍然有效，必须保留；\n"    "- facts：旧事实依旧成立的保留，合并去重，新增事实追加；\n"    "- 不要丢失有效旧信息，禁止编造对话不存在的内容。")
```

只靠 Prompt 不够，模型合并依旧有可能漏掉旧信息，代码层增加保底保护：

```
# L1兜底：防止模型合并丢失目标if old_goal and not payload.get("goal"):    payload["goal"] = old_goal                       # 目标为空，沿用旧目标if old_facts:    payload["facts"] = _dedupe_literal(old_facts + payload["facts"])
```

**画像语义去重，解决冗余累积**：新增事实写入前，和已有画像向量比对，余弦相似度≥0.9 直接跳过，避免重复存储相同含义的偏好。

```
async def _semantic_dedup_facts(session_id, tenant_id, new_facts):    existing = _dedupe_literal((await redis_memory.profile_get(...)).get("facts") or [])    pending = [f for f in _dedupe_literal(new_facts) if f not in existing]   # 字面去重前置    emb_items = await redis_memory.profile_fact_emb_get(...)                 # 向量缓存    if not emb_items or len(emb_items) < len(existing):        vecs = await embed_texts(existing, scene="memory_profile_dedup")     # 缓存缺失才补向量        emb_items = [{"t": t, "v": v} for t, v in zip(existing, vecs)]    new_vecs = await embed_texts(pending, scene="memory_profile_dedup")      # 只对新事实调用Embedding    keep = []    for fact, vec in zip(pending, new_vecs):        sims = [_cosine_sim(vec, item["v"]) for item in emb_items]        if sims and max(sims) >= settings.MEMORY_PROFILE_SIM_THRESHOLD:      # 阈值0.9            continue                                                          # 语义重复，丢弃        keep.append(fact)    return keep
```

成本控制：已有事实向量缓存 Redis，只对新增事实调用 Embedding；任意环节异常，自动降级为字面去重，不阻断问答。

### 6.4 L2 可检索记忆：按需注入，替代全量塞入 Prompt

旧方案把最近 N 轮、全量摘要、全部画像一股脑塞进 Prompt，上下文 Token 随会话长度线性膨胀。 新方案：**问答记录异步写入 Milvus 记忆向量库，检索时按需召回注入**

```
# 每一轮问答结束，异步写入记忆向量索引，不阻塞响应def schedule_index_turn(session_id, question, answer, tenant_id):    async def _do():        texts = [f"用户：{question}", f"助手：{answer}"]        vecs = await _embed_batch(texts)        ...    _spawn(_do())          # 异步触发，fire-and-forget
```

提问前，基于打分公式召回记忆：

```
async def memory_retrieve(question, tenant_id, top_k=None):    vecs = await _embed_batch([question])    hits = await milvus.memory_search(vecs[0], tenant_id, limit=max(k*4, 20))  # 多召回，本地重打分    for h in hits:        sim  = float(h.get("distance") or 0.0)          # 向量相似度        imp  = int(h.get("importance") or 1)            # 重要性权重        decay = _decay_factor(int(h.get("created_at") or 0))   # 时间衰减        score = sim * imp * decay        if score <= 0.01:                                # 衰减到无价值，不注入            continue        scored.append({...})    scored.sort(key=lambda x: x["score"], reverse=True)    return scored[:k]
```

`k*4` 是调优细节：先多召回一批，再本地综合打分，避免单纯向量距离把「相似度高、但是很久之前的闲聊」排在「相似度略低、重要且新鲜」的记忆前面。 收益：上下文 Token 不再随会话无限膨胀，长会话具备翻旧账能力。

### 6.5 L3 加权遗忘：遗忘有明确计算依据

整套记忆系统最核心的公式：

```
score(m) = relevance(m) × importance(m) × exp(−λ · Δt)      λ = 0.02 / 天
```

```
def _decay_factor(created_at: int) -> float:    """时间衰减 exp(−λ·Δt)，Δt单位：天"""    days = max(0.0, (time.time() - created_at) / 86400.0)    return float(math.exp(-settings.MEMORY_DECAY_LAMBDA * days))
```

三个因子：

*   **相关性**
    
    ：检索时向量相似度实时计算
    
*   **重要性**
    
    ：用户标记重要、反复引用 → importance=2~3；默认 1；≥2 豁免遗忘
    
*   **新鲜度**
    
    ：指数时间衰减
    

淘汰策略：对话窗口达到 Token 上限时，按照 score 从低到高淘汰，**不是单纯淘汰最旧的**。 三个月前用户标记重要的信息，优先级高于昨天一句无关闲聊。 配套话题段摘要：每 20 轮对话切分一个话题段，单独压缩存储，独立 TTL，避免早期话题被会话摘要覆盖丢失。

### 6.6 L4 合规闭环：记忆脱敏、导出、删除、审计

**写入前 PII 脱敏是第一道闸门**

```
_PATTERNS = [    (re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"),      # 手机号     lambda m: m.group(0)[:3] + "****" + m.group(0)[-4:]),    (re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)"),     # 身份证     lambda m: m.group(0)[:4] + "**********" + m.group(0)[-4:]),    (re.compile(r"(?<!\d)\d{13,19}(?!\d)"),        # 银行卡     lambda m: m.group(0)[:4] + "****" + m.group(0)[-4:]),    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),   # 邮箱     lambda m: m.group(0).split("@")[0][:2] + "***@" + m.group(0).split("@")[1]),]def mask_text(text: str) -> str:    try:        out = text        for pat, repl in _PATTERNS:            out = pat.sub(repl, out)        return out    except Exception:        return text            # 脱敏异常返回原文，不阻断问答
```

热窗口、冷历史、向量索引三处统一脱敏，不留明文个人信息。

配套四个合规接口：

表格

接口

能力

`GET /api/agent/memory/export`

导出指定会话全部记忆（Redis+MySQL），JSON 下载

`DELETE /api/agent/memory`

级联删除：Redis+Milvus+MySQL，严格租户隔离

`POST /api/agent/memory/importance`

标记记忆重要等级（1~3，≥2 豁免遗忘）

`GET /api/agent/memory/audit`

记忆操作审计：新增 / 压缩 / 导出 / 删除 / 修改重要性

### 6.7 线上踩坑三点总结

**坑一：压缩调度放在出站旁路，缓存命中路径同样要触发**

```
# save_memory末尾：异步调度压缩，不阻塞当前响应schedule_compress(sid, tid, uid)
```

曾经的线上 Bug：语义缓存命中时，代码会补写记忆，维持上下文连续，但是压缩调度只挂载在真实 LLM 问答路径。用户反复问同一个缓存问题，对话窗口持续膨胀，永远不触发压缩收敛。

```
cached = await redis_memory.qa_cache_get(kb_id, question, tenant_id)if cached is not None:    await redis_memory.push(session_id, "user", question, tenant_id)    await redis_memory.push(session_id, "assistant", cached["answer"], tenant_id)    # 缓存命中也要补调度压缩，防止窗口无限膨胀    schedule_compress(session_id, tenant_id, uid or None)    return cached
```

**坑二：记忆压缩强依赖 LLM，限流会直接导致压缩失败**摘要合并、画像提取都需要调用大模型，429 限流的时候压缩卡住，现象是窗口一直膨胀、摘要不更新。压缩链路复用主链路 llm\_guard 守卫。

> 摘要模型固定 qwen-plus，不要用 qwen-turbo，实测后者更容易持续 429。

**坑三：压缩失败必须埋点统计，不能静默失败**

```
except Exception as exc:    await redis_memory.compress_fail_mark(        session_id, f"{type(exc).__name__}: {str(exc)[:120]}", tenant_id)    return False          # 调用方收到失败标记，执行降级裁剪
```

压缩次数、最近压缩时间、失败原因全部打点，前端管理页面可以展示压缩失败告警标签。

* * *

## 七、稳定性底座：LLM 调用守卫三件套

RAG 链路里 grade、generate、意图路由、记忆压缩全部依赖 LLM 调用。上游大模型服务抖动、超时

**更多 AI 工程实战干货，微信搜索公众号「AI技术达摩院」**