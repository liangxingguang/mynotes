---
id: wiki-source-enterprise-rag-platform-langgraph-mcp
type: source
title: Spring Boot 4 × LangGraph × MCP × Milvus：企业级 RAG 平台｜会记忆、能查业务、绝不瞎编，完整落地架构
status: active
created: 2026-11-02
updated: 2026-11-02
confidence: high
tags:
  - 工程实践
  - AI
  - RAG
sources:
  - raw/sources/ai/2026-11-01-enterprise-rag-platform-langgraph-mcp.md
---

# Spring Boot 4 × LangGraph × MCP × Milvus：企业级 RAG 平台｜会记忆、能查业务、绝不瞎编，完整落地架构

## Overview（概览）

微信公众号「AI技术达摩院」长文，给出企业级 RAG 平台的完整落地架构：5 个应用进程（Vue3 业务台/管理台 + Spring Cloud Gateway + Spring Boot 4 业务中台 + FastAPI/LangGraph 智能体中台）+ 6 类中间件（Nacos/RocketMQ/Milvus/ES/Redis/MySQL）。核心是把 Demo 变成企业可用产品的治理方案：多租户隔离、权限、限流、Token 对账、审计、异步导入、幻觉拒答、MCP 工具调用、五层记忆。全文约 858 行（采集稿标注），架构图/表格被微信排版压扁，属已知噪声；核心内容完整。

## Key Facts（关键事实）

- **规模定位**：5 个应用进程 + 6 类中间件，端到端可跑通，全部代码开源
- **六大设计原则**：①重活异步化（HTTP 不承载耗时任务）②治理能力默认影子模式（CASBIN_ENFORCE=false 等观察一周再强制）③增强能力全是旁路，失败自动降级不阻断主链路④多租户隔离靠 MyBatis-Plus TenantLineInnerInterceptor 框架兜底⑤跨语言契约字段逐字对齐（Pydantic 驼峰 = Java Record）⑥记忆必须可度量、可追溯、可恢复
- **文档导入链路**：上传→落库(PENDING)+发 MQ→立即返回 docId→Python 消费者解析/分块/向量化→回写 DONE，前端 2s 轮询。Java 用 Remoting 客户端、Python 用 5.x gRPC 客户端，同 Broker 同 Topic msgId 对齐。分块自动识别 QA 模式（问答对）/滑窗模式；chunk_id=sha1(doc_id:seq) 保证幂等
- **混合检索**：Milvus 向量 + ES BM25（须装 analysis-ik）双路各召回 20 条，用 RRF 融合（只依赖排名不依赖分数，避开归一化难题，K=60），再 gte-rerank-v2 精排取 top5。Rerank 挂了自动降级 RRF 排序
- **幻觉拒答底线**：grade 相关性裁判两层闸门——先算相关性地板（max<0.15 直接拒答省 LLM 调用），再 LLM 裁判；资料不足走 intent_route→MCP 工具→无工具则 refuse。拒答时必须清空引用列表。SSE 契约 refs/delta/done/error，refs 延迟到 generate 启动才下发
- **SSE 踩坑**：前端必须用 fetch 不用 EventSource（EventSource 只支持 GET 无法带 JWT）；网关必须 WebFlux 响应式版本才能不缓冲透传 text/event-stream
- **MCP 工具调用**：grade 判定资料不足先意图路由（动态拉 MCP 工具列表转 Function Calling），匹配工具则调业务接口查实时数据再生成。反直觉选型：意图路由用 qwen-plus 而非 qwen-turbo（后者易持续 429 限流，省的钱被延迟和失败率吃掉）。工具区分永久故障（403/不存在不重试）与瞬时故障（重试）差异化拒答
- **MCP 安全头号坑**：工具调用必须携带真实用户身份（uid/tid/role 5 分钟短时 JWT），绝不能用服务管理员身份，否则"查我的用量"变"查全公司"。用 contextExtractor 而非 ThreadLocal（SSE 长连接异步线程会丢上下文）。会话池化摊平 200ms 握手开销，代价是吊销最长 TTL(300s) 后失效
- **五层记忆模型**：工作记忆（请求内组装）/情景记忆（Redis 摘要+MySQL 跨会话）/语义记忆（Redis 热画像+Milvus 画像向量）/程序记忆（memory_rules）/归档记忆（MySQL 原文权威源+Milvus 向量副本只存 ID）。Milvus 只存向量+引用 ID，保证删除一致性
- **记忆关键机制**：L1 增量摘要合并（防覆盖式摘要丢早期主题，代码层保底沿用旧 goal）+画像语义去重（余弦≥0.9 跳过）；L2 问答异步写记忆向量库，检索按 score=sim×importance×exp(−λΔt) 召回注入（多召回 k*4 本地重打分）；L3 加权遗忘，importance≥2 豁免遗忘，淘汰按 score 不按时间；L4 PII 脱敏（手机号/身份证/银行卡/邮箱正则）+导出/删除/审计四接口
- **线上三坑**：①语义缓存命中路径也要触发压缩调度（曾导致对话窗口无限膨胀）；②压缩强依赖 LLM，429 限流会卡死压缩（摘要模型固定 qwen-plus）；③压缩失败必须埋点统计不能静默
- **版本矩阵**：JDK21、Spring Boot 4.0.8（默认 Jackson3 高频踩坑）、Spring Cloud 2025.1.3、MyBatis-Plus 3.5.17（须 Boot4 专属 Starter）、langchain/langgraph 锁 1.x（0.x API 不兼容）、pymilvus 3.x 兼容 2.5 服务端、模型用 DashScope qwen-plus + text-embedding-v3 + gte-rerank-v2

## Important Claims（重要论断）

### Claim 1：Demo 和企业可用产品隔着一道叫"治理"的墙

"过去两年，见过太多 RAG Demo。经典套路大同小异：Python 脚本读取文档 → 向量化存入向量库 → 检索片段拼接 Prompt → 调用大模型。短短几分钟就能跑通，演示效果看着很不错。但一旦想要落地到企业真实业务，一堆棘手问题会立刻浮出水面。"——列出七个问题：数据隔离、权限体系、限流保护、Token 对账、审计追溯、异步导入、幻觉拦截。"这些问题的解决方案，才是把 Demo 变成企业可用产品的核心门槛。"

### Claim 2：重活异步化——HTTP 请求不承载耗时脏活

"HTTP 接口只做文件登记、写入数据库、发送消息，立刻返回 docId，所有耗时任务交给 RocketMQ 消费者异步处理。前端通过轮询感知文档状态从 PENDING 流转到 DONE。"——这是六条设计原则的第一条，直接解决"200 页 PDF 让前端 HTTP 请求原地等待几十秒超时"的问题。

### Claim 3：治理能力默认影子模式，灰度验证后再强制收口

"所有强管控开关默认先进入观察态：CASBIN_ENFORCE=false、QUOTA_DRY_RUN=true、CONDITIONAL_ACCESS_DRY_RUN=true。并行观察一周，校验日志里本该拒绝的请求有没有误杀，确认无误后，再逐项开启强制拦截。如果直接上线强管控策略，一旦出现误伤，业务方会直接否定整套系统。"

### Claim 4：所有增强能力都是旁路，失败自动降级，绝不阻断主链路

"记忆检索失败 → 返回空列表，降级使用会话摘要注入上下文；记忆压缩失败 → 截断对话窗口至最近 6 轮，打点记录异常；语义缓存写入失败 → 仅打印日志，不打断流式问答；PII 脱敏失败 → 返回原文，不阻断问答流程；Rerank 重排失败 → 直接使用 RRF 融合分数排序，主链路正常运行。AI 系统的可用性上限，取决于它对薄弱环节故障的容忍能力。"

### Claim 5：RRF 融合排序只依赖排名不依赖分数

"余弦相似度区间 0~1，BM25 分数可以到 20+，两者量纲完全不一样，加权融合前必须做归一化，归一化参数很难调优。RRF 只依赖排名，不依赖原始分数，天然避开归一化难题。"——这是混合检索设计的核心论断。

### Claim 6：宁可说不知道，绝不编造答案

"这是严肃场景下 RAG 的底线设计。grade 节点调用 LLM 裁判，判断检索回来的片段，是否包含回答用户问题必需的信息；判定资料不足，直接走拒答分支。裁判重点拦截'主题沾边，但没有答案'的负例。比如知识库只提到模型名称，用户询问参数量，主题相关但是没有对应信息，这种场景最容易触发模型幻觉。"

### Claim 7：意图路由默认用 qwen-plus 而非 qwen-turbo

"qwen-turbo 在部分账号容易持续触发 429 限流，重试+降级会让工具类问题延迟 3~5s；qwen-plus 首请求成功率更高，路由稳定。省下的模型费用，会被 429 重试带来的延迟、失败率吞噬，属于典型局部最优，损害全局体验。"

### Claim 8：MCP 工具调用必须携带真实用户身份

"这是 MCP 落地企业系统的头号安全坑：工具绝对不能用服务管理员身份执行，否则'查询我的用量'会变成'查询全公司用量'。方案：每次工具调用，携带真实用户身份信息。智能体侧复用和网关一致的 JWT 密钥，签发 5 分钟短时 JWT，Claims 和用户访问 Token 保持一致（uid/tid/role）。"

### Claim 9：五层记忆模型对标认知科学记忆分类

"工作记忆（请求内组装）/情景记忆（Redis 摘要+MySQL 跨会话）/语义记忆（Redis 热画像+Milvus 画像向量）/程序记忆（memory_rules）/归档记忆（MySQL 原文权威源+Milvus 向量副本只存 ID）。存储职责边界清晰：Redis 存热记忆工作台、MySQL 存权威数据源、Milvus 只存向量+引用 ID。"

### Claim 10：记忆加权遗忘公式

"score(m) = relevance(m) × importance(m) × exp(−λ · Δt)，λ = 0.02 / 天。三个因子：相关性（检索时向量相似度实时计算）、重要性（用户标记重要、反复引用 → importance=2~3；默认 1；≥2 豁免遗忘）、新鲜度（指数时间衰减）。淘汰策略：对话窗口达到 Token 上限时，按照 score 从低到高淘汰，不是单纯淘汰最旧的。三个月前用户标记重要的信息，优先级高于昨天一句无关闲聊。"

### Claim 11：语义缓存命中路径也要触发压缩调度

"曾经的线上 Bug：语义缓存命中时，代码会补写记忆，维持上下文连续，但是压缩调度只挂载在真实 LLM 问答路径。用户反复问同一个缓存问题，对话窗口持续膨胀，永远不触发压缩收敛。"——修复：缓存命中也要补调度压缩。

### Claim 12：跨语言契约字段逐字对齐

"Python 侧 Pydantic 模型，统一使用驼峰命名（kbId / fileName / docId），和 Java 侧 Record 实体 IngestMessage(Long kbId, Long docId, String fileName, ...) 字段完全一致。不依赖 Jackson 自动命名策略转换，少一层配置，就少一层静默返回 null 的隐性 Bug。"

## Concepts Introduced（引入的概念）

- [[rag-production-guardrails|企业级 RAG 生产护栏]]（本信源为其第 3 信源，印证混合检索/幻觉拒答/异步导入/降级原则）
- RRF（Reciprocal Rank Fusion）融合排序——只依赖排名不依赖分数
- 相关性裁判（Relevance Judge）——两层闸门：相关性地板 + LLM 裁判，资料不足拒答
- 五层记忆模型（Working/Episodic/Semantic/Procedural/Archival）
- 加权遗忘公式（score = relevance × importance × exp(−λ·Δt)）
- 影子模式治理（治理开关默认观察态，灰度验证后强制）
- MCP 工具调用真实用户身份传递（contextExtractor 而非 ThreadLocal）
- SSE 事件契约（refs/delta/done/error，refs 延迟下发）
- 跨语言契约字段逐字对齐（Pydantic 驼峰 = Java Record）

## Entities Mentioned（提及的实体）

- AI技术达摩院（微信公众号，作者）
- LangGraph（工作流编排框架）
- MCP（Model Context Protocol，模型上下文协议）
- Milvus（向量数据库）
- Elasticsearch（BM25 全文检索）
- Spring Boot 4 / Spring Cloud Gateway / Spring Cloud Alibaba（Java 技术栈）
- FastAPI（Python Web 框架）
- Nacos（注册中心）
- RocketMQ（消息队列）
- DashScope（百炼，阿里云大模型服务）
- qwen-plus / qwen-turbo / text-embedding-v3 / gte-rerank-v2（模型）
- MyBatis-Plus（ORM 框架，TenantLineInnerInterceptor 多租户隔离）
- Casbin（权限管理）
- AES-GCM / KMS（密钥管理）

## Implications（影响／启示）

- 本信源是 [[rag-production-guardrails|企业级 RAG 生产护栏]] 的第 3 信源，从平台架构侧独立印证了混合检索/存储分层/异步离线链路/参数热调/最终一致等形态，同时新增 RRF 融合排序、相关性裁判拒答、五层记忆模型、MCP 工具调用、影子模式治理等本页未覆盖的工程细节
- 六大设计原则（重活异步化/影子模式/旁路降级/框架兜底/契约对齐/记忆可度量）可作为企业级 AI 平台设计的通用检查清单——每条原则对应一类常见事故（超时/误杀/阻断/泄露/null/失忆）
- RRF 融合排序的"只依赖排名不依赖分数"论断对混合检索设计有普遍适用性：任何双路召回（向量+关键词）都可套用，避免归一化调参
- 相关性裁判的"宁可说不知道，绝不编造"是严肃场景 RAG 的底线设计——与 [[llm-wiki|LLM Wiki]] 的"每条承重事实可追溯"理念同构
- MCP 工具调用的真实用户身份传递是企业落地的安全红线——任何"系统代查"类工具都必须携带调用者身份，否则造成越权
- 五层记忆模型与加权遗忘公式为 AI 对话系统的长期记忆设计提供了可度量、可追溯、可恢复的框架
- 线上三坑（缓存命中也要压缩/压缩依赖 LLM 限流/压缩失败必须埋点）是记忆系统从 Demo 到生产的典型陷阱——提醒我们在旁路降级设计时不能遗漏"缓存命中路径"

## Limitations（局限）

- 架构图/表格被微信排版压扁，部分代码块格式失真（属采集噪声，非原文问题）
- 全文约 858 行（采集稿标注），篇幅长但结构清晰；正文部分被截断在"七、稳定性底座：LLM 调用守卫三件套"处，后续内容未收录（采集稿仅到此）
- 文中所有容量数字、版本矩阵为作者实测环境，真实生产基线需自行压测
- MCP 工具调用的 7 个内置业务工具为作者平台实例，非通用标准
- 五层记忆模型为作者平台设计，与认知科学记忆分类的对应关系为作者类比，非严格学术对应

## Related Knowledge（相关知识）

- [[rag-production-guardrails|企业级 RAG 生产护栏（概念页）]]
- [[spring-ai-milvus-rag-production|Spring AI + Milvus 企业级 RAG 生产工程实践（信源页）]]
- [[agent-platform-architecture|高性能弹性扩展智能体中台架构实践（信源页）]]
- [[langchain4j-multimodal-rag|LangChain4j 多模态 RAG 实战]]
- [[knowledge-base-tech-evolution|知识库的技术演进]]
- [[llm-integration-engineering-hard-parts|大模型接进业务系统：工程难点在哪]]
- [[durable-execution|持久执行]]
- [[retry-governance|重试治理]]
- [[dead-letter-governance|死信治理]]

## Source（信源）

- `raw/sources/ai/2026-11-01-enterprise-rag-platform-langgraph-mcp.md`
- 原文：https://mp.weixin.qq.com/s/Hx-qH9Gd3yXEcUxmMrZdtw
- 采集稿：`Assets/2026-11/weixin-Hx-qH9Gd3yXEcUxmMrZdtw.md`
