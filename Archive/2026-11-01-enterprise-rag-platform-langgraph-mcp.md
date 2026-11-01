---
id: inbox-2026-11-01-002
title: Spring Boot 4 × LangGraph × MCP × Milvus：企业级 RAG 平台｜会记忆、能查业务、绝不瞎编，完整落地架构
source: AI技术达摩院（微信公众号）
source_url: https://mp.weixin.qq.com/s/Hx-qH9Gd3yXEcUxmMrZdtw
source_type: web
platform: 微信公众号
created: 2026-11-01
category: 技术
tags: [工程实践, AI, RAG]
asset_ref: Assets/2026-11/weixin-Hx-qH9Gd3yXEcUxmMrZdtw.md
wiki_status: ingested
---

> 摘要：企业级 RAG 平台完整落地架构：5 个应用进程（Vue3 业务台/管理台 + Spring Cloud Gateway + Spring Boot 4 业务中台 + FastAPI/LangGraph 智能体中台）+ 6 类中间件（Nacos/RocketMQ/Milvus/ES/Redis/MySQL）。解决 Demo 到企业产品的核心门槛——多租户隔离、权限、限流、Token 对账、审计、异步导入、幻觉拒答。两大链路：文档导入走 RocketMQ 异步化（上传立即返回，解析分块向量化交给 Python 消费者）；问答走 LangGraph 工作流（混合检索 RRF 融合+gte-rerank、相关性裁判拒答、MCP 工具调用查实时业务数据、五层记忆+加权遗忘）。全部代码开源。

## 核心要点

1. **六条设计原则**：①重活异步化（HTTP 不承载耗时任务）；②治理能力默认影子模式（CASBIN_ENFORCE=false 等观察一周再强制）；③增强能力全是旁路，失败自动降级不阻断主链路；④多租户隔离靠 MyBatis-Plus TenantLineInnerInterceptor 框架兜底；⑤跨语言契约字段逐字对齐（Pydantic 驼峰 = Java Record）；⑥记忆必须可度量、可追溯、可恢复。
2. **文档导入链路**：上传→落库(PENDING)+发 MQ→立即返回 docId→Python 消费者解析/分块/向量化→回写 DONE，前端 2s 轮询。Java 用 Remoting 客户端、Python 用 5.x gRPC 客户端，同 Broker 同 Topic msgId 对齐。分块自动识别 QA 模式（问答对）/滑窗模式；chunk_id=sha1(doc_id:seq) 保证幂等。
3. **混合检索**：Milvus 向量 + ES BM25（须装 analysis-ik）双路各召回 20 条，用 RRF 融合（只依赖排名不依赖分数，避开归一化难题，K=60），再 gte-rerank-v2 精排取 top5。Rerank 挂了自动降级 RRF 排序。
4. **幻觉拒答底线**：grade 相关性裁判两层闸门——先算相关性地板（max<0.15 直接拒答省 LLM 调用），再 LLM 裁判；资料不足走 intent_route→MCP 工具→无工具则 refuse。拒答时必须清空引用列表。SSE 契约 refs/delta/done/error，refs 延迟到 generate 启动才下发。
5. **SSE 踩坑**：前端必须用 fetch 不用 EventSource（EventSource 只支持 GET 无法带 JWT）；网关必须 WebFlux 响应式版本才能不缓冲透传 text/event-stream。
6. **MCP 工具调用**：grade 判定资料不足先意图路由（动态拉 MCP 工具列表转 Function Calling），匹配工具则调业务接口查实时数据再生成。反直觉选型：意图路由用 qwen-plus 而非 qwen-turbo（后者易持续 429 限流，省的钱被延迟和失败率吃掉）。工具区分永久故障（403/不存在不重试）与瞬时故障（重试）差异化拒答。
7. **MCP 安全头号坑**：工具调用必须携带真实用户身份（uid/tid/role 5 分钟短时 JWT），绝不能用服务管理员身份，否则"查我的用量"变"查全公司"。用 contextExtractor 而非 ThreadLocal（SSE 长连接异步线程会丢上下文）。会话池化摊平 200ms 握手开销，代价是吊销最长 TTL(300s) 后失效。
8. **五层记忆模型**：工作记忆（请求内组装）/情景记忆（Redis 摘要+MySQL 跨会话）/语义记忆（Redis 热画像+Milvus 画像向量）/程序记忆（memory_rules）/归档记忆（MySQL 原文权威源+Milvus 向量副本只存 ID）。Milvus 只存向量+引用 ID，保证删除一致性。
9. **记忆关键机制**：L1 增量摘要合并（防覆盖式摘要丢早期主题，代码层保底沿用旧 goal）+画像语义去重（余弦≥0.9 跳过）；L2 问答异步写记忆向量库，检索按 score=sim×importance×exp(−λΔt) 召回注入（多召回 k*4 本地重打分）；L3 加权遗忘，importance≥2 豁免遗忘，淘汰按 score 不按时间；L4 PII 脱敏（手机号/身份证/银行卡/邮箱正则）+导出/删除/审计四接口。
10. **线上三坑**：①语义缓存命中路径也要触发压缩调度（曾导致对话窗口无限膨胀）；②压缩强依赖 LLM，429 限流会卡死压缩（摘要模型固定 qwen-plus）；③压缩失败必须埋点统计不能静默。
11. **版本矩阵**：JDK21、Spring Boot 4.0.8（默认 Jackson3 高频踩坑）、Spring Cloud 2025.1.3、MyBatis-Plus 3.5.17（须 Boot4 专属 Starter）、langchain/langgraph 锁 1.x（0.x API 不兼容）、pymilvus 3.x 兼容 2.5 服务端、模型用 DashScope qwen-plus + text-embedding-v3 + gte-rerank-v2。

## 正文

见 Assets 附件（公众号原文抓取，架构图/表格被微信排版压扁，属已知噪声；要点已完整提炼）。

## 来源

- 原文：https://mp.weixin.qq.com/s/Hx-qH9Gd3yXEcUxmMrZdtw
- 作者公众号：AI技术达摩院

## 附件

[[Assets/2026-11/weixin-Hx-qH9Gd3yXEcUxmMrZdtw.md]]
