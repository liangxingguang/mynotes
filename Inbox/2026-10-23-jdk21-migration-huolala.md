---
id: 2026-10-23-jdk21-migration-huolala
title: JDK 21 规模化落地实践（货拉拉）
source: 微信公众号（货拉拉技术中心）
source_url: https://mp.weixin.qq.com/s/O85Y7lNSCJF5ciFmFrpyJw
source_type: 文章
platform: 微信公众号
created: 2026-10-23
category: 技术
tags:
  - Java
  - 工程实践
  - spring
asset_ref: Assets/2026/10/jdk21-migration-huolala.md
wiki_status: ingesting
ingest_claimed_at: "2026-10-23T10:38:41.982Z"
ingest_claim_id: 40968-1792751921982-0
---

# JDK 21 规模化落地实践（货拉拉）

> 货拉拉上千个 Java 服务从 JDK 8 升级 JDK 21 的完整复盘：框架（JAF/Hermes/Monitor）先把兼容成本扛下来、BOM 收口版本、AI 批量改 javax→jakarta，业务工程只需切 parent 按检查单收尾。实测 CPU 降 10%、内存降 50%。

## 核心要点

- **升级策略**：底座先动、业务后动。框架按大版本分代（2.x=JDK8+Boot2，3.x=JDK21+Boot3.5+Jakarta），Hermes 与 JAF 版本强绑定，两线并行维护；业务侧收敛为 5 项检查单
- **典型坑**：spring.factories 换成 AutoConfiguration.imports（旧 Starter 静默失效）；httpcore5 5.4 的 tcpNoDelay 失效致大包 RPC +40ms（升 5.4.2 修复）；编译全绿但语义已变的问题只能靠回归覆盖，附 7 条回归检查单
- **虚拟线程**：适合 IO 等待型同步代码，CPU 密集/框架自管线程池场景不用；跨任务需 Helper 传递 Trace 与 ThreadLocal；热路径避免 synchronized 阻塞 IO（钉住），JDK 24 JEP 491 后缓解
- **GC 与容器**：默认 G1（MaxRAMPercentage 70~75），大堆低延迟评估分代 ZGC（65~70）；JDK 21 能读容器配额，不写死 -Xmx；System.gc() 用 ExplicitGCInvokesConcurrent 而非直接禁用；堆外内存须显式 MaxDirectMemorySize
- **观测换代**：虚拟线程十万级，thread dump 失效，排障顺序改为 GC 日志 → JFR → 钉住跟踪 → 聚合指标

## 正文

详见附件抓取正文（含依赖版本对照表、虚拟线程/动态线程池/模式匹配/Record 代码示例、G1 与 ZGC 启动参数模板）。

## 来源

- [JDK 21 规模化落地实践](https://mp.weixin.qq.com/s/O85Y7lNSCJF5ciFmFrpyJw)

## 附件

- [[Assets/2026/10/jdk21-migration-huolala.md]]
