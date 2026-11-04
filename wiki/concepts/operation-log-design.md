---
id: wiki-concept-operation-log-design
type: concept
title: B端操作日志设计（审计、溯源、合规的基础设施）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - product
  - 日志
  - 审计
sources:
  - raw/sources/products/2026-11-03-weixin-bend-operation-log-27.md
related:
  - wiki/concepts/rbac-permission-system.md
  - wiki/concepts/permission-refactoring.md
  - wiki/concepts/legacy-system-rebuild.md
  - wiki/sources/bend-operation-log-27.md
---
# B端操作日志设计（审计、溯源、合规的基础设施）

## Definition（定义）

操作日志（Audit Log）是 B 端系统的「黑匣子」：对每一次业务动作留下「谁、在什么环境、对什么对象、做了什么、改前改后值、结果如何」的完整证据记录，是审计、溯源、合规的基础设施。其设计本质是回答三组问题（留痕三问）：主体身份与环境、操作对象与字段、动作内容与前后值。与仅记录登录行为的登录日志不同，操作日志的重心是业务动作的字段级前后变化。

## Why It Matters（为什么重要）

- 没有操作日志，报价被改、库存不对、权限被调整等事故都是一笔糊涂账——说不清谁改的、什么时候改的、改之前是什么值。
- 合规要求：金融行业监管要求操作日志存留至少 5 年；审计不合规的系统无法通过监管检查。
- 溯源追责：字段级 diff + 前后镜像 + 哈希链使事故还原无需口头沟通，越权与篡改行为可定位到人。
- 日志失效的典型病因：只记登录不记业务动作；只记动作不记前后值；日志可被修改或删除。

## Core Characteristics（核心特征）

1. **五维日志模型**：行为主体（用户ID/姓名/角色/租户）、行为环境（时间/IP/设备/UA/链路TraceID）、行为对象（模块/对象类型/对象ID/字段）、行为内容（动作/前值/后值/结果/错误码）、行为追溯（关联单号/审批流节点/规则版本）。
2. **表结构：一核三扩**：核心表 audit_log（动作主记录）+ 变更字段表 audit_log_field_diff（字段级前后值）+ 镜像表 audit_log_snapshot（修改前后对象完整快照）+ 登录日志表 login_log（登录行为单独成表）。
3. **记录范围分层**：必记（数据变更、权限调整、删除、导出、审批）、选记（查询、查看详情）、不记（静态资源）——按动作风险定记录义务。
4. **字段级 diff 颗粒度**：记录每个字段的改前值/改后值，支持字典翻译（如把状态码译回可读文案）。
5. **异步落库**：日志写入不阻塞业务主流程；关键动作（如审批、支付）可同步写入保证即时可查。
6. **防篡改**：日志表只允许插入，禁用 UPDATE/DELETE 权限；关键字段加哈希链，被篡改的条目可被追溯定位。
7. **敏感字段加密展示**：手机号、身份证、商户卡、金额等按角色加密展示（不同角色看到掩码或完整值）。
8. **冷热分层存储**：热数据放 ES/ClickHouse 供检索，冷数据归档 OSS；保留周期按行业合规要求（金融≥5 年）。

## Structure（结构）

```text
audit_log（核心表：主体/环境/对象/动作/结果/log_id）
├── audit_log_field_diff（变更字段表：字段名/前值/后值/字典翻译）
├── audit_log_snapshot（镜像表：修改前后对象完整快照，按 log_id 还原）
└── login_log（登录日志表：登录行为单独记录）
```

## How It Works（运作方式）

- **写入路径**：业务动作触发 → 组装五维日志字段 → 字段级 diff 计算 → 异步落库（不阻塞主流程；关键动作同步）→ 敏感字段按角色加密。
- **还原路径**：审计时按 log_id 拉取字段 diff 表 + 前后镜像，直接还原「谁在何时把哪个字段从什么改成什么」，无需口头沟通（ERP 案例：含税单价 100→98 按 log_id 还原）。
- **防篡改路径**：日志表权限收紧为 insert-only；关键字段哈希链使任何事后修改留下痕迹（车贷案例：逾期减免金额被篡改，经哈希链追溯到被修改条目）。
- **扩展动作类型**：除修改外，导出、下载、打印预览等高敏读行为也要记录（EHR 案例：记录 EXPORT 动作/文件名/条数定位私自导出薪资表的 HR）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[rbac-permission-system|RBAC 权限系统]]——审计日志是 RBAC 七大功能模块之一；权限调整属于必记动作。
- [[permission-refactoring|B端权限重构方法论]]——重构五步法第 5 步「审计、流程、文档」沉淀依赖操作日志能力。
- [[legacy-system-rebuild|存量B端系统重构方法论]]——Day1 权限门盘点中的越权风险清单验证依赖日志证据。

### Dependencies（依赖项）

- 依赖字段级 diff 与镜像表实现还原能力；依赖哈希链实现防篡改；依赖 ES/ClickHouse 实现热数据检索。

### Distinctions（区分）

- 与登录日志（login_log）的区分：登录日志是操作日志的子集/伴生表，只记录认证行为；操作日志重心是业务动作的字段级变化。
- 与权限审计日志的区分：权限变更日志是操作日志的「必记」动作类型之一；操作日志覆盖全部业务动作，权限审计只是子集。
- 与业务流水（如订单状态流水）的区分：业务流水面向业务语义，操作日志面向审计语义（含主体、环境、防篡改要求）。

## Evolution（演进）

- 从「记流水账」（只记谁做了）演进到「留证据」（记前后值、镜像、哈希链）——文章归纳的三类失效病因即演进动力。
- 哈希链防篡改是金融行业监管实践的外溢：从金融合规要求（存留≥5 年）推广为通用 B 端日志策略。

## Open Questions（开放问题）

- 哈希链在高 QPS 写入下的性能开销未在信源中量化。
- 必记/选记/不记的分层判定标准因行业而异，无统一阈值。
- ES 热存储的成本控制与保留周期（合规下限 vs 存储成本）的平衡策略未展开。

## Evidence（证据）

- Source: `raw/sources/products/2026-11-03-weixin-bend-operation-log-27.md`

## Related Knowledge（相关知识）

- [[bend-operation-log-27|信源：B端系统操作日志设计]]
- [[rbac-permission-system|RBAC 权限系统]]
- [[permission-refactoring|B端权限重构方法论]]
- [[legacy-system-rebuild|存量B端系统重构方法论]]
