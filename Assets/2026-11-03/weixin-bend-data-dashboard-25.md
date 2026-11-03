![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

B端数据看板更常见的坑，不是交互不流畅，也不是UI不够深色科技感，而是把“数据陈列”当成了“决策看板”老板真正想要的，从来不是一块炫酷大屏，而是打开短时间能回答三个问题：目标有没有达成？哪里出了异常？谁在负责处理？

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

如果这三个问题回答不了，图表再多、动效再炫，也只是“数据坟场”。

👉👉本文整理了大屏设计方法，可在本文下方💬【看板】，领取《B端数据看板指标树模板+PRD清单+检查清单》。👈👈

## 一、先拆老板的“决策问句”，而不是先选图表

很多B端PM做看板，拿到需求就列图表：折线、柱状、饼图、地图。但老板看不懂，因为他脑子里不是图表，是问句。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

落地方法：访谈业务负责人和老板，收集高频问句。比如：

*   这个月回款达成怎么样？
    
*   哪个大区掉得厉害？
    
*   谁在跟进高风险客户？
    

把问句转成指标和维度，再决定图表。这个叫“问句驱动指标树”。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例

某车贷业务看板老板每周只问三句：放款达成多少、逾期为什么涨、哪些渠道进件质量差。于是首屏只保留三张结论卡，其余全部收进下钻页。上线后老板打开看板的频次明显提升，因为不需要再追问“所以呢”。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 二、指标树三层：结果层—过程层—执行层

> 指标树不是指标清单，是一条从“老板问结果”到“一线做动作”的责任链。

*   结果层：回答“生意好不好”。如回款达成率、毛利达成率、准时交付率。面向老板/决策层。
    
*   过程层：回答“为什么好/差”。如商机转化周期、报价审批时长、工单齐套率、末端派送达成率。面向管理岗。
    
*   执行层：回答“谁在做什么”。如销售日均外呼量、实施任务及时完成率、司机接单及时率。面向一线。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

每个指标必须挂责任岗位和预警阈值，否则指标树只是“树”，没有“责任人”。

案例：CRM看板

*   结果层：季度签约额达成率
    
*   过程层：有效商机数、方案报价达成率、合同审批时长
    
*   执行层：销售新建商机数、Demo演示完成数、外呼量
    

案例：ERP生产交付看板

*   结果层：订单准时交付率
    
*   过程层：工单齐套率、设备OEE、质检一次达成率
    
*   执行层：车间报工及时率、缺料预警响应时长
    

这样老板看到交付率下滑，可以直接下钻到缺料、质检，再定位到哪个车间、哪个工单。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 三、老板看得懂的看板布局：先给结论，再给归因，后给明细

老板的阅读动线不是探索，而是确认。所以首屏布局要有严格层级：

1.  顶部结论卡：目标完成率、异动说明、待办风险。每张卡一行标题，标题本身就是结论，如“本周回款达成率82%，低于目标8个点”。
    
2.  中部趋势：只放和异动相关的趋势图，不做全量趋势墙。
    
3.  下部清单：异常明细、责任人、承诺闭环时间。
    

> 看板不是给老板看数据，而是给老板递一个“已经找到答案”的入口。

案例：

EHR看板CEO首屏放：人效达成率、关键岗位空缺率、主动离职率异动。不要放组织架构图、全员分布地图。HRVP下钻查看过程数据：各事业部离职率、招聘漏斗转化、培训覆盖率。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 四、指标口径与指标字典：没有口径的看板，上线就会被挑战

看板上线后大量时间在处理“这个数和财务对不上”“离职率口径不一样”。于是指标字典必须先行。

指标字典字段建议：

*   指标名称
    
*   业务口径（公式）
    
*   数据源表/接口
    
*   统计周期/刷新频率
    
*   责任岗位
    
*   预警阈值
    
*   下钻路径
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例一：

财务中台“回款达成率”分母是“开票金额”还是“应收金额”，是否含预收款，口径不写清楚，老板和各区总看到两个数，看板信任直接崩掉。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

案例二：

用户中心“注册转化率”要明确分母是UV还是访问设备，是否排除内部员工。

## 五、落地流程与PRD要点

B端PM推动数据看板落地，建议5步：

1.  采集决策问句：访谈老板和核心业务负责人，每人写3-5个高频问句。
    
2.  绘制指标树：结果层→过程层→执行层，每层挂责任人。
    
3.  确认口径与数据源：和数仓/业务系统owner确认每项指标来源、刷新频率。
    
4.  先做灰模验证：用Excel/HTML做静态原型，拿真实数据回放，让老板体验下钻路径。
    
5.  分阶段上线：先上结果层和异动预警，再补过程层，收尾接执行层待办。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

PRD必须包含：

*   指标树图（文字版或脑图）
    
*   首屏卡片字段、口径、阈值、交互说明
    
*   异常状态视觉规范（颜色只用于异常，不用于装饰）
    
*   下钻层级与权限策略
    
*   数据刷新机制和空态/延迟策略
    

案例：OA审批效率看板

*   CEO层看：平均审批时长、超时单据占比
    
*   部门总层看：本部门超时单据、超时环节
    
*   员工层看：我的待办、催办提醒
    

权限策略：同一指标树，不同角色只看自己层。

案例：业务中台商品中心看板

*   结果层：GMV达成率
    
*   过程层：动销率、缺货率、价格带分布
    
*   执行层：上新及时率、补货及时率
    

案例：规则引擎风控看板

*   结果层：资损率、逾期率
    
*   过程层：规则击中率、人工复核率
    
*   执行层：规则发布时效、黑名单更新时效
    

> 一块好看板的标准不是“页面多丰富”，而是“老板少问几个为什么”。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

我是大皮，建议把本号设为星标，后续持续更新B端实战产品搭建方法。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)