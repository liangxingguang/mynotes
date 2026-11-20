---
id: inbox-2026-11-20-agent-sandbox-mcp-k8s
title: 生产级 AI Agent 执行沙箱实战：从 MCP 授权到 Kubernetes 隔离的工程闭环
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/aIdeQfNmqi2HiVJr4OSsDA
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI, Agent]
asset_ref: Assets/2026-11/wechat-aIdeQfNmqi2HiVJr4OSsDA.md
wiki_status: pending
---

> **摘要**：以"订单报告"工具为贯穿案例，给出 AI Agent 执行沙箱的完整工程闭环：MCP 网关授权、能力票据、一次性 K8s Pod 隔离、双向网络默认拒绝、调度账本与故障演练。核心主张是各信任边界（模型→工具→数据→沙箱→网络）各自验证，任一层失误都不能升级为跨租户读取、凭据外传或集群故障。

## 核心要点

- **信任边界与原则**：用户→Agent、模型→工具、工具→数据、代码→凭据、沙箱→网络、沙箱→节点，每层独立校验；导出六条原则（授权由控制面决定、权限按次绑定、数据服务是最终授权点、网络按能力放行、实例一次性、可恢复状态优于进程内清理）。
- **两种 MCP 模型**：远程 MCP Server（注册审核、身份、schema/版本钉扎、逐次授权）与沙箱内 runner（任意代码、资源耗尽、逃逸风险）是不同安全边界，控制不同。
- **授权入口**：网关验证令牌、规范化参数、拒绝未知字段，生成不可变执行意图；租户只取可信 claims，不用模型参数；Rego 只管主体/工具/范围，不做 SQL 过滤。
- **能力票据**：每次执行签发短效票据（JWT 形式），数据/出口代理验证签名、期限、一次性、范围；runner 被攻破也只剩短时间、单租户、单工具的能力。
- **K8s 隔离基线**：RuntimeClass（gVisor/Kata 按实测选）、restricted Pod Security、资源配额、准入与供应链治理；注意关闭 ServiceAccount token 不等于无 API 访问，只读根文件系统不阻止挂载卷写入。
- **网络**：双向默认拒绝，runner 只可连出口代理；严格模式下不直连互联网，代理负责 DNS/TLS/路径/元数据地址拦截。
- **调度器**：账本持久化 + CAS 原子领取 + generation 防迟到调度器重执行；写操作需下游幂等键，结果丢失不能盲目重试。
- **验收**：用提示词注入、工具漂移、SSRF、DNS 绕过、资源耗尽、调度故障等攻击与故障演练验证，不预写性能数字；上线分试点→隔离验证→规模化→持续运营四阶段设门槛。

## 正文

完整正文见 [[Assets/2026-11/wechat-aIdeQfNmqi2HiVJr4OSsDA.md]]。文章含可落地的配置示例：网关授权伪代码、Rego 策略示例、能力票据结构、RuntimeClass + Pod YAML、Cilium 网络策略、调度器 CAS 领取 SQL 等。结论：gVisor、Kata、OPA、Cilium 都只是链路组件，可验证的边界组合比单个"最强组件"更重要；该设计降低注入/越权/凭据外传/资源耗尽的影响范围，但不能消除内核零日、出口代理失陷等风险。

## 来源

- [生产级 AI Agent 执行沙箱实战：从 MCP 授权到 Kubernetes 隔离的工程闭环](https://mp.weixin.qq.com/s/aIdeQfNmqi2HiVJr4OSsDA)

## 附件

- [[Assets/2026-11/wechat-aIdeQfNmqi2HiVJr4OSsDA.md]]
