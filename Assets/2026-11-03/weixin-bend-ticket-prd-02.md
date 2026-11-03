## 一、需求背景与目标

### 1.1 业务背景

企业内部 IT 报修、售后支持、服务升级等场景，如果没有统一工单入口，任务来源会散落在email、微信和口头沟通里，处理过程无记录、无时效管理，后续也无法统计效率。工单系统要处理的是“任务可追踪、流程可约束、结果可统计”。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 1.2 用户痛点

*   提交人：问题描述不规范，不知道进度，重复催办。
    
*   处理人：任务来源分散，缺少优先级和时效提醒。
    
*   管理员：看不到整体处理效率，难以定位瓶颈。
    

### 1.3 产品目标

建立统一的工单创建、分配、处理、关闭和统计闭环；缩短平均响应时长；让处理过程留痕、可追踪、可量化。PRD 目标与业务目标对齐，避免只写功能不写价值。

## 二、用户角色与权限矩阵

工单系统里角色先分成三类：

*   提交人：创建工单、查看进度、确认关闭、提交评价。
    
*   处理人：接单、转派、填写处理记录、申请关闭。
    
*   管理员：配置工单类型、设置 SLA、查看全量数据、批量处理、导出报表。
    

权限矩阵建议用表格写清“数据范围”和“执行动作”。例如：

角色

数据范围

核心执行动作

提交人

自己创建的工单

创建、查看、确认关闭、评价

处理人

分配给自己的工单

接单、转派、填写记录、申请关闭

管理员

全量工单

配置、转派、批量处理、导出

权限矩阵是开发容易遗漏的部分，PRD 里写清楚，测试才能按矩阵验权限。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 三、核心业务流程与状态流转

工单生命周期的状态流转是 PRD 的核心。建议用状态机而非纯文字描述，避免开发理解偏差。常见状态定义：

*   待受理：工单创建后等待处理人接单。
    
*   处理中：处理人已接单，正在处理。
    
*   已处理：处理人提交完成结果，等待提交人确认。
    
*   已关闭：提交人确认关闭或系统自动关闭。
    
*   已驳回：处理人认为问题描述不清或不属于本组，驳回给提交人。
    

流转表如下：

当前状态

触发动作

执行人

前置条件

下一状态

待受理

接单

处理人

工单未被其他处理人接单

处理中

待受理

驳回

处理人

需填写驳回原因

已驳回

待受理

转派

管理员

目标处理组非空

待受理

处理中

申请关闭

处理人

需填写处理记录

已处理

处理中

转派

处理人/管理员

目标处理组非空

处理中

已处理

确认关闭

提交人

提交人登录验证

已关闭

已处理

重新打开

提交人

问题未处理

处理中

已驳回

修改后重新提交

提交人

需补充描述或附件

待受理

注意：每个动作都要写触发条件、执行人、下一状态，形成闭环，避免陷入循环。管理员应保留“强制关闭”能力，用于处理无效工单。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 四、功能需求拆解

### 4.1 工单创建

创建入口包括门户网站、email、微信服务号、内部系统等。PRD 要写清各入口的字段差异和校验规则。

例如email创建时自动抓取主题为标题、正文为描述；服务号创建时允许上传图片。自动编号规则建议为“类型前缀+日期+顺序号”，如 GD20250601-001，避免重复。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.2 工单分配

分配方式分为自动分配、人工转派和接单。自动分配按工单类型、组织架构和处理人负载进行路由；人工转派由管理员或处理人发起；接单模式适合处理人池。PRD 需定义路由失败时的兜底策略，例如自动进入默认处理组并提醒管理员。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.3 工单处理

处理人填写处理记录，支持文本、附件和图片。PRD 要写清处理记录的必填规则，例如申请关闭时至少一条处理记录。SLA 时效提醒：根据优先级设定响应时限和处理时限，超时后通过站内信和email提醒处理人及其上级。常见问题可配置模板回复，减少重复输入。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.4 工单关闭

关闭由提交人确认，或系统在 X 天后自动关闭。PRD 需写明自动关闭的天数、触发条件及关闭前提醒策略。关闭后允许提交人评价，评价维度包括响应速度、处理质量、服务态度。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 4.5 工单查询与统计

查询条件包括编号、状态、类型、优先级、来源、时间范围。统计报表包括工单量、平均处理时长、SLA 达标率、满意度。报表权限仅开放给管理员和分配的负责人。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 五、字段设计

工单表关键字段如下，PRD 中要写明类型、必填、规则。

字段名

类型

必填

规则说明

工单编号

字符串

是

自动生成，规则 GD+日期+序列

标题

字符串

是

长度 5-80

描述

富文本

是

支持图片粘贴

类型

枚举

是

配置项：报修、询问、建议、投诉

优先级

枚举

是

高、中、低

状态

枚举

是

状态机状态

来源

枚举

是

门户、email、微信服务号、内部系统

关联对象

字符串

否

可关联设备编号、合同号等

提交人

用户ID

是

创建时自动写入

处理人

用户ID

否

接单后写入

处理组

组织ID

是

路由目标组

创建时间

时间

是

系统生成

更新时间

时间

是

每次流转更新

处理时间

时间

否

申请关闭时写入

关闭时间

时间

否

关闭时写入

SLA 时限

时长

是

按优先级配置

附件

文件列表

否

支持多文件

评价

对象

否

关闭后写入

字段设计要避免冗余，关联对象不直接存储名称，只存 ID 和类型，展示层再查询。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 六、非功能需求

*   性能：列表查询 P95 小于 2 秒，详情页小于 1 秒。
    
*   隐私：数据权限隔离，处理日志至少保留 12 个月。
    
*   可用性：支持移动端适配，工单流转在弱网下可提交。
    
*   日志：所有流转动作记录处理日志，包含执行人、动作、前后状态、时间。
    
*   埋点：创建成功、接单成功、申请关闭、确认关闭、提交评价五个核心事件。
    

## 七、验收标准

验收标准要可验证，避免“体验良好”这类笼统描述。示例：

*   功能验收：各入口均可创建工单，状态流转符合流转表。
    
*   权限验收：不同角色可见范围与执行动作符合权限矩阵。
    
*   数据验收：统计报表与工单明细核对一致。
    
*   性能验收：在 1000 条工单数据下，列表查询响应符合指标。
    
*   兼容验收：主流浏览器和移动端关键流程可用。
    

工单系统 PRD 的难点不是功能清单，而是状态、权限和规则是否清晰。把状态机、权限矩阵和验收标准写细，开发、测试和业务才能对齐。附上可直接套用的模板和 checklist，建议在评审前对照自检。

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)