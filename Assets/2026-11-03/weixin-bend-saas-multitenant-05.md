很多 B 端产品经理在面试或项目里被问到“SaaS 多租户系统怎么做”，本能反应是画一个租户管理页面。但真正拉开差距的，是你能否讲清数据隔离、权限模型、计费配额和租户生命周期这四条线如何串成一套可执行方案。这篇文章围绕 B 端产品经理做 SaaS 多租户系统的高频场景，给出一套从架构选型到落地验收的完整框架，希望能帮助到你处理到工作上的难题。

### 一、起步：先定数据隔离架构，而不是先画页面

SaaS 多租户系统的底座是数据隔离。常见三种模式：

1.  独立数据库：每个租户单独一个库。隔离性强，运维与备份相对简单，但硬件与数据库实例开销较高，适合大客户或合规要求高的行业。
    
2.  共享数据库、独立 Schema：同一实例下每个租户一个 Schema。隔离性中等，资源利用率较好，但跨租户统计和数据库迁移较麻烦。
    
3.  共享数据库、共享表：所有租户数据放同一组表，用 tenant\_id 区分。资源利用率高、迭代快，但对索引、权限过滤、数据恢复要求较高。
    

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

选型不是越“高级”越好，而是看客户、客单价、数据规模与合规要求。中小客户大规模付费可选共享表；大客户定制或私有化可预留独立库。可在产品架构上做“混合模式”，按租户等级路由到不同存储策略。

### 二、租户识别：让 tenant\_id 贯穿请求链路

租户识别不能只放在前端请求头，建议从登录态 token 解析租户ID，放在上下文 Holder 中，后续服务、SQL 阻拦器、数据权限统一读取。前端传 tenant\_id 仅作展示，不能作为后端数据过滤依据。

落地时统一封装租户上下文工具，所有写库和读库都必须通过该工具拼上 tenant\_id。对共享表结构，建议在数据访问层做强制拦截，漏条件直接报错，避免串数据。

  
多租户系统的关键不是让不同租户“看到”同一条数据，而是让所有租户都“感觉”自己拥有一整套系统。

### 三、权限设计：RBAC 管功能，数据权限管范围

B端产品经理设计权限时，常把功能权限和数据权限混在一起。建议拆开：

*   功能权限：用 RBAC，用户、角色、菜单、按钮、接口。
    
*   数据权限：用“租户 + 组织 + 资源 Owner + 数据规则”的组合。共享表中每条数据要带 tenant\_id、org\_id、owner\_id，查询时按权限维度过滤。
    
*   复杂场景引入 ABAC：例如“仅允许查看本人所在部门且金额大于 10 万的合同”，可用属性规则引擎处理。
    

权限表至少包含：用户、角色、角色菜单关系、角色数据范围、租户、组织、资源类型。产品要画出“同一角色在不同租户下看到不同数据范围”的用例。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 四、计费配额：把资源拆成可配置项

SaaS 多租户系统必须把计费项落到配额中心，否则销售承诺与产品实现会脱节。配额维度可拆为：用户数、角色数、存储空间、API 调用次数、消息条数、报表任务数、导出行数等。

产品经理要定义配额的默认值、升级规则、超额策略。例如超额后先提醒，连续 3 天超额再限制新建数据。租户管理员可在后台查看用量，服务团队能按工单调整配额。注意计费展示要口径清晰，避免“企业版不限用户数但限制存储”这类模糊表达。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 五、租户生命周期：从尝试使用、开通到注销

SaaS 多租户系统要设计完整租户状态机：

尝试使用中 → 正式开通 → 续费/升配 → 欠费冻结 → 恢复 → 注销

每个状态切换要明确：数据保留策略、登录限制、通知方式、数据导出窗口。例如冻结后只允许登录和导出，不允许新建；注销后 15 天软删除，30 天物理清理。产品需要定义数据处置合规要求，尤其涉及财务等行业。销户阶段要支持用户提交数据导出申请，并由服务团队在后台生成任务，避免用户直接联络研发。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 六、配置化与扩展点：避免代码级定制

多租户系统能否规模化，取决于配置化能力。建议分层：

*   租户级配置：品牌 logo、登录页、域名、语言、时区。
    
*   业务级配置：字段启用/隐藏、校验规则、流程节点、审批规则。
    
*   个性化扩展：预留自定义字段、自定义对象、开放 API、Webhook。
    

产品经理要梳理哪些差异用配置，哪些用插件，哪些走二次开发。能用配置处理的，不建议改代码，否则版本升级时不同租户分叉严重。配置项要支持导入导出、版本管理和回滚。

### 七、性能、安防与运维要点

*   性能：共享表必须对 tenant\_id 建联合索引，避免全表扫描。大租户慢查询要能识别并隔离，必要时做数据归档。
    
*   安防：SQL 注入、越权访问、接口水平越权都要在验收时覆盖。审计日志记录谁在什么时间查看/导出了哪些租户数据。
    
*   运维：备份策略、恢复演练、跨租户数据误删除的恢复流程要提前设计。建议做租户级发布开关，灰度时只影响部分租户。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 八、B端产品经理落地 SOP

1.  调研：明确目标客户、部署要求、合规级别、计费模式。
    
2.  架构评审：与研发确定隔离模式、租户识别方式、数据权限方案。
    
3.  原型与 PRD：输出租户管理、角色权限、配额中心、租户生命周期四个模块。
    
4.  验收：逐项检查共享表是否带 tenant\_id、越权用例、配额超额、冻结恢复。
    
5.  上线与灰度：按租户白名单放量，收集性能指标与用户支持反馈。
    
6.  复盘：沉淀一套可复用的产品框架，写入项目复盘。SaaS 产品的护城河不是功能清单多长，而是多租户架构能否在规模化时保持数据边界清晰、扩展开销可控、运维动作标准。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

如果你正在面试 B 端产品经理，或者负责公司的 SaaS 多租户系统改造，这篇文章的框架可以参考，踩坑经验很宝贵。

下方回复【多租户】获取《SaaS多租户系统产品设计自查清单（MD版）》。也可把你想了解的具体模块告诉我，后续我会继续拆解 B端产品经理的权限模型、计费中心和AI产品面试题。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)