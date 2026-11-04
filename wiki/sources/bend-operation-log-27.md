---
id: wiki-source-bend-operation-log-27
type: source
title: B端系统操作日志设计：审计、溯源、合规一次说透
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - 产品
  - 日志
  - 审计
sources:
  - raw/sources/products/2026-11-03-weixin-bend-operation-log-27.md
---
# B端系统操作日志设计：审计、溯源、合规一次说透

## Overview（概览）

B 端操作日志设计的方法论文章。主张操作日志是系统的「黑匣子」与审计/溯源/合规的基础设施，提出留痕三问与五维日志模型，给出「一张核心表 + 三张扩展表」的表结构、记录范围分层/字段级 diff/异步落库/哈希链防篡改/敏感字段加密/冷热分层存储六项策略，并附 ERP、EHR、车贷金融、OA、物流 WMS/TMS、CRM、财务中台 7 个行业落地案例。

## Key Facts（关键事实）

- **留痕三问**：谁在什么时间/网络环境/设备？对哪个对象/字段/单据？做了什么动作、改前值、改后值、结果是否成功？
- **五维日志模型**：行为主体（用户ID/姓名/角色/租户）、行为环境（时间/IP/设备/UA/链路TraceID）、行为对象（模块/对象类型/对象ID/字段）、行为内容（动作/前值/后值/结果/错误码）、行为追溯（关联单号/审批流节点/规则版本）。
- **表结构**：核心表 audit_log + 变更字段表 audit_log_field_diff + 镜像表 audit_log_snapshot + 登录日志表 login_log。
- **记录范围分层**：必记（数据变更、权限调整、删除、导出、审批）、选记（查询、查看详情）、不记（静态资源）。
- **策略六项**：字段级 diff（支持字典翻译）；异步落库不阻塞主流程、关键动作可同步；防篡改（只允许插入、禁用 UPDATE/DELETE、关键字段加哈希链）；敏感字段（手机号/身份证/商户卡/金额）按角色加密展示；热数据 ES/ClickHouse、冷数据归档 OSS；保留周期按行业合规要求。
- **合规数字**：金融行业监管要求操作日志存留至少 5 年。
- **行业案例**：ERP 含税单价 100→98 改价纠纷按 log_id 还原；EHR HR 私自导出薪资表因记录 EXPORT 动作/文件名/条数定位到人；车贷逾期减免金额被篡改经哈希链追溯到被修改条目；OA 付款申请撤销节点从「财务通过」回退到「部门经理」；物流运单改址确认发生在装车后避免司机背锅；CRM 客户归属变更留痕启动内审；财务中台日志与凭证号关联。

## Important Claims（重要论断）

### Claim 1：日志失效的三种典型病因

只记录登录不记录业务动作；只记录动作不记录前后值；日志可被修改或删除。三者叠加使日志在事故时完全无法还原。

### Claim 2：留痕不是应付审计，是给自己留证据

日志的核心价值是内部证据链而非对外合规姿态；字段级 diff + 前后镜像 + 哈希链构成可还原、可追溯、不可篡改的证据基础。

## Concepts Introduced（引入的概念）

- [[operation-log-design]]

## Entities Mentioned（提及的实体）

- ERP、EHR、车贷金融、OA、物流 WMS/TMS、CRM、财务中台（业务系统类型，非独立实体页面）
- ES、ClickHouse、OSS（存储组件）

## Implications（影响／启示）

操作日志是权限体系（[[rbac-permission-system]]）七大模块中审计日志模块的深化设计：把「要不要记审计」升级为「记什么、怎么记、怎么防篡改、怎么存」的完整工程方案。权限重构五步法（[[permission-refactoring]]）的第 5 步「审计、流程、文档」沉淀与本文互为印证。

## Limitations（局限）

自媒体评论性内容，无厂商背书；7 个案例均为匿名转述、无法独立核验；正文 SQL 建表语句在采集中丢失列定义（仅剩表头）；采集稿在财务中台案例处截断（「某企业调账导致报表」句子不完整）；表格在采集中被压平为逐行文本。

## Related Knowledge（相关知识）

- [[operation-log-design]]
- [[rbac-permission-system]]
- [[permission-refactoring]]

## Source（信源）

- `raw/sources/products/2026-11-03-weixin-bend-operation-log-27.md`
