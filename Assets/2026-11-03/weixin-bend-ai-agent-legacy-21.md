![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

很多B端产品经理在推进AI Agent落地旧系统对接时，都会遇到相当常见的情况：旧系统没有标准接口、文档缺失、权限申请周期长，Agent像一个新员工被挡在数据门外。这篇文章从B端产品经理视角，给出一套可落地的旧系统对接框架，包含盘点、选型、映射、灰度、复盘五个步骤，并结合某连锁零售企业旧CRM与智能工单Agent的真实案例展开。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

如果你正在做B端产品或AI Agent相关项目，建议收藏本文，希望对你有帮助。

需要完整落地模板，👉👉💬后台发送【Agent对接】，自动领取《AI Agent对接旧系统落地模板》附件资料👈👈

## 一、为什么旧系统对接是Agent落地的首要关卡？

AI Agent要产生业务价值，必须连接到真实的业务数据与流程。B端旧系统往往运行多年，技术栈老、接口能力参差不齐。产品经理如果不提前做系统盘点，很容易出现三种结果：技术方案反复改、灰度范围失控、上线后数据质量不达标。因此，旧系统对接不应被当成纯技术执行，而应作为产品经理主导的一项落地工程。

## 二、先做系统盘点：别急着写方案

产品经理要拉上业务、研发、运维，一起完成旧系统盘点。建议使用以下字段：

*   系统名称与业务域
    
*   数据库类型与版本
    
*   是否提供API：REST/SOAP/WebService
    
*   认证方式：Token/OAuth/账户密码
    
*   数据实时性：实时/准实时/T+1
    
*   文档完整度：接口文档、数据字典、表结构说明
    
*   负责人与审批路径
    
*   变更频率与发版窗口
    
*   历史故障与性能瓶颈
    

产出物为《旧系统对接盘点表》，避免拍脑袋选方案。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 三、四类对接模式与选型逻辑

产品经理不需要写代码，但要能判断哪类模式更适合当前系统。

1.  API对接：当旧系统具备标准接口时优先采用。优点是稳定、可维护，适合高频读写。
    
2.  数据库只读+事件表：当系统无API，但能申请数据库只读权限时，可以读取业务数据，通过事件表或时间戳捕获增量。只读权限能降低写坏数据风险。
    
3.  RPA/UI自动化：当无API、无数据库权限，只能通过界面交互时，用RPA模拟人工查看、输入、提交。适合低频、规则固定的写动作，不适合高频实时场景。
    
4.  中间件/消息网关：当多个系统互相调用时，建设统一对接层。Agent只对接网关，由网关适配旧系统差异。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

选型要综合实时性、安全、开发投入、稳定性、可维护性五个维度打分。例如，某旧工单系统无API但数据库只读可开，方案采用“数据库只读+事件表+RPA写回”的混合模式。

## 四、落地SOP

*   步骤1：系统盘点。输出系统清单、接口能力、限制条件。
    
*   步骤2：方案选型。标出每个系统走哪种对接模式，以及开发投入估算。
    
*   步骤3：字段映射。把Agent需要的字段、动作与旧系统能力对齐，明确数据字典、状态流转、异常码、幂等键。
    
*   步骤4：灰度验证。先跑只读任务，再开放写动作。设置白名单、限流、人工确认开关。灰度范围建议从少量门店/少量单据开始。
    
*   步骤5：复盘总结。对照上线前定的指标，输出效果数据和遗留问题清单，决定是否扩量。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 五、真实案例：某连锁零售旧CRM + 智能工单Agent

背景

某连锁零售企业的用户支持部门，每天要人工录入、分派、回访大量工单。旧CRM建设超过10年，没有标准API，只有一套老旧的客户端和可只读访问的数据库。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

目标

让AI Agent自动识别用户意图、创建工单、分派到对应门店，并在夜间批量回写CRM。

对接方案

*   数据读取：通过数据库只读账户读取会员、订单、门店信息，采用事件表捕获新增数据。
    
*   写回动作：对必须在旧CRM界面执行的写回，用RPA按固定规则模拟人工录入，并设置失败重试与人工接管。
    
*   安全边界：Agent不直接写核心表，只写入中间表，由人工确认后同步。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

产品经理的关键动作

1.  提前2周申请数据库只读权限，避免权限申请拖慢排期。
    
2.  与业务方共同制定工单状态流转与分派规则，形成数据字典。
    
3.  设置灰度：先选1家门店跑2周，只跑只读与待确认写回；稳定后扩到10家门店。
    
4.  建立每日数据核对机制，重点查看字段准确率与漏单情况。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

效果

工单录入人力投入下降约40%，录入及时性从T+1提升到准实时，RPA写回成功率达到95%以上，剩余失败单由人工兜底处理。

## 六、常见问题与应对

1.  文档缺失：找供应商补文档，或通过数据库表结构、日志反推。
    
2.  权限申请慢：提前发起，先做只读权限，降低审批压力。
    
3.  数据质量差：在Agent入口加清洗层，设置脏数据拦截规则。
    
4.  写动作风险：禁止Agent直接写核心库，使用中间表+人工确认。
    
5.  跨系统一致性：使用幂等键和重试机制，避免重复写单。
    
6.  旧系统性能差：限制Agent查询频率，错峰执行批量任务。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 七、产品经理在对接中的三个核心动作

1.  把业务目标翻译成系统能力要求。例如“降低工单录入人力”翻译为“Agent需支持工单自动创建与分派”。
    
2.  用风险预案替代技术理想主义。上线前准备好降级、人工接管、回滚方案。
    
3.  用灰度数据说服业务方。不要一上线就全量，用少量门店数据证明稳定性和效果。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

👉👉💬后台发送【Agent对接】，自动领取《AI Agent对接旧系统落地模板》附件资料👈👈

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

推荐阅读：[AI产品经理如何设计Agent产品架构？一套可落地的需求设计框架](https://mp.weixin.qq.com/s?__biz=Mzk3NTEwMDA5OQ==&mid=2247484419&idx=1&sn=2853cc1564dd4c74b50086a253a33831&scene=21#wechat_redirect)