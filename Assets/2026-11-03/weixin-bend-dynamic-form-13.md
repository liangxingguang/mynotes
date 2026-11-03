![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

对B 端产品经理而言，动态表单引擎是 ERP、CRM、OA 等系统中绕不开的基础能力。它不只是拖拽生成字段，而是将校验、字段联动、版本管理融合成一套可复用的规则系统。

本文结合一个 ERP 采购申请表单的真实落地案例，拆解动态表单引擎的设计思路、关键模型与版本策略。

想获取完整附件资料，包括字段配置 JSON、校验规则示例、联动规则示例、版本管理流程与需求自检清单，可在公众号后台💬【表单引擎】解锁。

* * *

## 一、为什么表单引擎是 B 端产品经理的硬技能

B 端系统中，采购、报销、入库、客户信息收集等场景都依赖表单。不同企业的字段、流程差异极大，如果每个表单都写死，开发和维护投入会持续上升。表单引擎通过配置化把业务人员从重复开发中释放出来。

表单引擎的能力可以归纳为四层：

1.  动态表单：字段、布局、展示类型可配置。
    
2.  校验：前端校验与后端校验分离。
    
3.  联动：字段之间的显隐、赋值、选项变更。
    
4.  版本管理：发布、回滚、存量数据兼容。
    

这四项能力，是 B 端产品经理在面试和方案设计中容易拉开差距的方向。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

* * *

## 二、动态表单设计：用 Schema 描述一切

动态表单的核心是把页面结构抽象为一份 JSON Schema。字段不写死，而是通过配置生成。

一个标准字段配置可包含：

*   `key：字段标识`
*   `label：显示名称`
*   `type：文本、数字、日期、下拉、附件、表格等`
*   `required：是否必填`
*   `validations：校验规则列表`
*   `events：联动触发事件`
*   `defaultValue：默认值`

示例：

```
{
```

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

* * *

## 三、校验引擎设计：规则不只是必填

校验引擎需要支持多种规则类型：

*   必填校验
    
*   格式校验：email、联络号、身份号
    
*   范围校验：数字区间、日期区间
    
*   正则校验：自定义表达式
    
*   远程校验：调用接口判断数据是否已存在
    
*   自定义函数：复杂业务逻辑
    

规则触发时机通常有三种：

1.  字段失焦时
    
2.  字段值变化时
    
3.  提交前统一校验
    

实际案例中，采购申请表单的“预算金额”字段需要远程校验，不能超过当前项目剩余预算。提交前统一校验时，如果金额大于 5000，会触发特殊审批流。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

* * *

## 四、字段联动设计：让表单“活”起来

字段联动处理的是表单动态响应问题。常见联动类型：

*   显隐：某个字段满足条件后显示/隐藏
    
*   只读：满足条件后置灰
    
*   赋值：字段自动带出，例如选择供应商后带出税率、账期
    
*   选项变化：选择省份后，城市选项联动刷新
    
*   校验变化：不同条件下校验规则不同
    

联动规则可配置为：

```
         
```

同时必须配置防循环机制，例如设置联动层级上限为 5 层，预防 A→B→A 触发死循环。

* * *

## 五、版本管理设计：兼容存量数据

表单配置变更频繁，版本管理需要回答三个问题：

1.  新表单发布后，旧数据如何展示？
    
2.  字段调整后，旧数据是否需要迁移？
    
3.  配置错误时如何快速回滚？
    

推荐策略：

*   每次发布生成不可变版本号，如 v1.0、v1.1。
    
*   旧数据保存 `schema_version` 字段，按对应版本渲染。
    
*   字段删除不物理删除，只做停用，避免历史数据无法解析。
    
*   提供版本差异对比，让发布者清楚本次变更影响范围。
    
*   回滚时直接切换上一版本，配置改动不污染存量数据。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

* * *

## 六、真实案例：ERP 采购申请表单引擎落地

某企业服务公司为制造业客户交付 ERP 系统，不同客户采购申请流程差异较大。传统方式下，每新增一个客户需求，都要开发人员修改代码，交付周期约 5 个工作日。

产品团队将采购申请表单抽象为“模板 + 字段库 + 规则库 + 版本管理”。以某制造企业为例：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

场景

办公用品采购与生产物料采购流程不同。

*   办公用品：显示“领用部门”，无需填写项目编码。
    
*   生产物料：显示“项目编码”“核算中心”，需绑定项目预算。
    
*   金额大于 5000：触发特殊审批，需财务审核。
    
*   选择供应商：自动带出税率、账期。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

配置方式

*   字段“采购类型”配置为下拉选项。
    
*   联动规则：当采购类型为生产物料时，显示项目编码、核算中心。
    
*   校验规则：金额大于 5000 时，提交前触发特殊审批。
    
*   版本：v1.0 上线后，增加“紧急采购”字段发布 v1.1，旧单据仍按 v1.0 展示，新单据可填写紧急采购。
    

落地结果

表单需求交付周期从 5 个工作日缩短到 1 个工作日，开发投入下降约 60%，私有化交付效率明显提升。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

> “表单引擎不是拖拽工具，而是一套可演进的业务规则系统。”

> “B 端产品经理要学会把高频变更的表单抽象成稳定框架。”

如果你身边有正在找工作的产品朋友，欢迎把这篇内容转发给 TA。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)