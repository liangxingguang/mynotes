---
title: 代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/9MKGsp0NgxZZNeByCLCEbQ
source_type: article
platform: 微信
captured: 2026-11-20
registered_at: 2026-11-21
inbox_ref: Archive/2026-11-20-sdd-spec-driven-dev.md
asset_ref: Assets/2026-11/wechat-9MKGsp0NgxZZNeByCLCEbQ.md
---

# 代码都被AI写了，那规范是AI写，还是人来写？（SPEC与PPT可收藏）
**昨晚直播《AI驱动SDD企业级开发全流程》，今天发个纪要，文末把SPEC和PPT分享给大家。**

**本周直播AI编程个人10倍提效，欢迎预约。**

**《AI驱动SDD企业级开发全流程》纪要。**

【1】AI工具提效后，古法编程时代的软件研发流程，存在什么问题？

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

1\. AI编码效率极高；

2\. AI容易在缺乏约束的情况下自由发挥；

3\. 人与人之间的沟通，成为了项目的主要矛盾；

AI并不是能力不行，而是AI的知识太广，幻觉太多，如果不加以约束与规范，产出质量的“方差”将特别大。

**【2】以上问题，如何破解？**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

SDD，Specification-Driven Development，规范驱动开发：

1\. 流程上：从“人工驱动”，转向“规范驱动”；

2\. 执行上：从“人执行”，转向“人定规范，AI执行，人兜底”；

**【3】**SDD规范驱动开发，全流程大致分为几个阶段？****

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

全流程大致分为四个阶段：

1\. 需求约束（需求结构化）；

2\. 设计约束（原型相关）；

3\. 架构约束（技术相关，包含测试）；

4\. 计划与执行；

**【4】需要哪些基线规范？如何体现规范驱动呢？**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第一个基线，prd.md，PRD模板母版。

传统PRD不适合，那是给人评审用的，充满自然语言歧义。需求基线prd.md，是给AI看的，它是规定"公司内所有PRD应该怎么写"的模板。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第二个基线，design.md，设计约束规范。

因为AI没有设计直觉，它会过度设计，也会设计不足。

design.md就是对于特定产品，原型设计的"宪法"，它是可复用的公司级资产，对于同一个产品，设计约束规范应该是固定的，对于不同的产品，理论上设计约束规范应该是不一样的。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第三个基线，arch.md，架构约束规范。

**1\. 不同公司，不同产品，不同团队，不同技术栈，原则上约束不同；**

**2\. 相同公司，相同产品，相同团队，相同技术栈，原则上约束相同；**

这个规范约束，不会因为你做需求a还是需求b而不同，这个东西，就是架构约束spec。

******【5】****产品，设计，架构三个基线是“宪法”，具体到执行的时候，是如何完成“执法”，如何完成规范到实例的映射，如何规范驱动的呢？**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

如上图所示：

1\. 左侧是基线约束与规范；

2\. 中间是一个具体的需求；

3\. 右侧是针对这个需求，规范实例化后的实际产品需求、需求原型、需求架构；

假设我们要做需求A，实例化的过程如何呢？

**步骤一：需求实例化。**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**输入：prd.md模版 + 具体需求 + 人调优审核兜底**

**输出：prd-A.md，具体的需求文档。**

**有人会问，产品经理，设计师，架构师被蒸馏成基线之后，是不是就没用了？**

答案是否定的。AI不可能生成完全确定的prd-A，**必须人要在中间反复对话，调优，补充，审核，折衷，兜底。**

但这个过程，是人与AI的高效互动，而不是人与人之间的低效沟通与评审。

  
**步骤二：设计实例化。**  

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**输入：design.md（约束） + prd-A.md（需求） + 人调优审核兜底**

**输出：design-A.html，具体的设计原型。**

**如果有通用的设计实践，可以升级基线，公司与团队的基线，是需求与项目的底线，底线会在不断做需求，不断打磨项目的过程中逐步完善，底线逐步提升。**

  
**步骤三：技术架构实例化。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**输入：arch.md（约束） + prd-A.md（需求） +design-A.html（原型）+ 人调优审核兜底**

**输出：arch-A.md，具体的技术与架构设计。**

**步骤四：生成执行计划。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

进入PLAN模式，让AI读取【基线文档】【实例化文档】：

1\. 实例化文档告诉AI"需求是什么"；

2\. 约束基线文档告诉AI"边界在哪里"。

最后生成PLAN-A.md，包含对于这个具体需求的原子任务拆解、依赖管理、验收标准、风险回退。

注意，**PLAN-A.md也是需要人来调优审核兜底的，这个过程中可能涉及多次人与AI的对话互动。**

**步骤五：执行执行计划。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

接下来，进入CODE模式，真正把代码写出来。

当然，**最终得到的交付产品也是需要人来调优审核兜底的。毕竟，只有人能为结果负责。**

******【6】****SDD规范驱动开发，为什么能极大的提高产研效率？**

它极大地减少人与人之间的沟通与评审，要把沟通前置为规范沉淀。传统流程里，每个需求都要走一遍需求评审、设计评审、架构评审，这些沟通是重复的、低效的。

******【7】****SDD规范驱动开发，人的价值是什么？**岗位会消失么？

在企业级SDD开发流程过程中：

**1\. 人的角色从写代码，变成定规范、定约束、反馈、审核、决策、兜底；**

2\. 由于1，**仍然无法缺少产品经理，设计师，架构师等岗位**（除非，某一个岗位的判断力，能被另一个岗位吃下来，目前来看，最不可能被吃下来的，就是技术岗，因为产品和设计师根本无法做技术上的决策和判断）；

**【8】SDD，一幅图简单的总结？**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

SDD全流程，总结下来，就上面一张图：

**1\. 通用层三个基线：prd模板、design约束、arch约束；**

**2\. 实例化层三个产出：prd-A、design-A、arch-A；**

**3\. 执行层两个模式：PLAN和CODE。**

几句话核心要诀：规范先行、人类决策、AI执行、人类兜底。

**【9】对于没有建立SDD流程，没有建立基线的公司，要怎么做？**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**1\. 建立3个基线；**

**2\. 梳理并跑通流程；**

**3\. 做项目的过程中找到流程与基线的不足；**

**4\. 持续迭代与优化，不断提升公司AI能力上限；**

**【10】课后作业（发布在星球）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**【11】所有资料（发布在星球）**

**1\. 三大约束基线（来源真实企业，已脱敏）；**

**2\. 三大约束实例（**来源真实企业**，已脱敏****）；**

**3\. 直播PPT；**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**阅读原文获取。**

**\===全文完===**

**企业里真正的AI编程是什么样的？**

AI研发工作台，SDD全流程，祖传代码AI接手，Human On The Loop，端到端的自动化，垂直Agent多智能体的编排，FDE新模式解决业务问题...

做了一个新项目，2个月（12.1-1.31），实操企业级AI编程，欢迎来玩。详见：

[企业级AI编程（2个月集训）](https://mp.weixin.qq.com/s?__biz=MjM5ODYxMDA5OQ==&mid=2651981885&idx=1&sn=4521017d78661f3e9723924621cc67ec&scene=21#wechat_redirect)

**下次直播：AI编程个人10倍提效。**

欢迎预约，届时分享资料和PPT。