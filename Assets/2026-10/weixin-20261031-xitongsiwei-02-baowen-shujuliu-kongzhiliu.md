深度长文 ｜ 全文约 2500 字 · 阅读约 6 分钟

一段报文里，哪个字段该画进 DFD，哪个不该画？判断的依据不是数据格式，而是它的用途。

**01**

**一段真实的支付报文**

先看一段报文。这是客户端发给支付网关的请求：

{   "action": "create\_payment",   "timeout": 300,   "order\_no": "ORD20261012001",   "user\_id": "U10086",   "amount": 99.00,   "goods\_name": "技术书籍" }

六个字段，都是合法的 JSON，格式上没有任何区别。

但它们并不属于同一类。

action是“创建支付单”这个动作的指令，timeout是超时控制参数。这两个字段的作用，是指挥支付网关做什么、怎么做。

而 order\_no、user\_id、amount、goods\_name是订单编号、用户、金额、商品名称——这些是业务本身的信息。

字段

内容

属于哪一类

action

create\_payment

控制数据（控制流）

timeout

300

控制数据（控制流）

order\_no

ORD20261012001

业务数据（数据流）

user\_id

U10086

业务数据（数据流）

amount

99.00

业务数据（数据流）

goods\_name

技术书籍

业务数据（数据流）

返回报文也是同样的道理。code字段是成功或失败的执行反馈，属于控制数据；order\_no和 pay\_time是业务结果，属于业务数据。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**02**

**判断原则：看用途，不看载体**

这里有一条关键原则：区分数据流和控制流，看的是信息的语义用途，不是它的传输载体。

不管是 JSON、文本还是二进制，载体形态都不决定分类。

所以完全可能出现这种情况：同一个报文里，一半是控制数据，一半是业务数据。建模时，需要把它们拆开来看。

两条定义值得记住。

数据流承载业务或领域实体内容，是系统需要加工、处理、生成的原材料、半成品和业务产出。它的目的是承载业务信息、完成业务任务。

控制流承载调度、协调、管理组件执行行为的指令与信号，用来决定模块做不做、何时做、做哪一个动作，它本身不承载业务主体信息。

一句话概括：数据流是系统要加工的内容；控制流是指挥系统怎么干活的命令。

**03**

**标准 DFD 长什么样**

搞清了两者的区别，就能回答一个很具体的工程问题：画 DFD 时，哪些该画、哪些不该画。

DFD（数据流图）的设计目标很明确——描述业务数据从哪里来、到哪里去、被哪个加工处理。它不关心执行时序，不关心分支，也不关心调用命令。

标准 DFD 里的元素只有四类：外部实体、加工、数据存储、数据流。

这里有三个容易画错的地方。

第一，加工要写"对数据做什么"，不要写系统名。"支付网关"是一个系统，不是一次加工；写成"创建支付单""查询支付结果"才对——它描述的是对业务数据的一次操作。

第二，数据流要标清楚读还是写。同一份"支付记录"，写进去和读出来是两条不同的流，都要画出来。

第三，不要漏掉返回流。数据出去要有结果回来，只画单向的图是不完整的。

回到前面的支付例子，0 层 DFD 大致是这样：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图里的两个加工，正好对应了数据操作里最常见的两类：创建（写）和查询（读）。

而 action、timeout、success这类控制命令，不会出现在 DFD 上。它们属于控制流，该用另外的图表来表达。

**04**

**控制流该用什么图**

控制流有三类常用图表，各自解决不同的问题。

时序图描述多个组件之间，按时间先后顺序传递控制指令和反馈信号，适合表达模块之间的调用与请求应答交互。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

活动图描述执行步骤、分支判断和循环逻辑，关注的是流程走向——满足条件 A 就走分支一，否则走分支二。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

状态机图描述一个对象在不同外部控制信号下，状态如何切换。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

放回支付例子里，三者的分工就很清楚了。

· 客户端调用支付网关、下发创建指令、网关返回成功或失败 → 用\*\*时序图\*\*

· 校验参数 → 发起支付 → 判断结果 → 成功写记录、失败返回错误 → 用\*\*活动图\*\*

· 支付单的状态流转：待创建 → 处理中 → 支付成功 / 支付失败 → 用\*\*状态机图\*\*

这里要强调一句：DFD 不用于表达控制流。它只描述业务数据的来源、加工、存储和去向。

**05**

**一张表看清边界**

分类

包含内容

核心用途

DFD 是否绘制

适用图表

业务数据（数据流）

订单号、用户 ID、金额、商品、支付时间、交易记录

业务实体信息，系统加工处理的对象

绘制

DFD 数据流图

控制数据（控制流）

action 指令、timeout 超时、success/error 返回码、启停信号、分支判断、重试指令

调度与指挥：组件何时执行、执行什么动作

不绘制

时序图、活动图、状态机图

**收尾**

回到开头那段报文。

它的每个字段都是合法 JSON，格式上没有区别。但它们的用途完全不同——一半在告诉系统“做什么业务”，另一半在告诉系统“现在开始干活、超时就停”。

建模的第一件事，不是选择图表，而是先分清信息属于哪一类。

分清了，该画进 DFD 的自然会画，不该画的也不会硬塞进去。

两句话记住：

业务数据，是系统要加工处理的内容。

控制数据，是指挥系统如何干活的命令。

区分数据流和控制流，看的不是传输载体，而是信息的用途。同一个 JSON 报文可以同时携带两类信息，建模时得把它拆开看。

**互动时刻**

你画 DFD 的时候，有没有被评审指出过“这个不该画”？

或者反过来——有没有把该画的业务数据漏掉？

欢迎在评论区聊聊。

数据来源

· DeMarco, T.（1978），《Structured Analysis and System Specification》，Yourdon Press（DFD 的经典来源，确立了数据流、加工、数据存储、外部实体四类元素）

· Gane, C. & Sarson, T.（1979），《Structured Systems Analysis: Tools and Techniques》（另一套 DFD 表示法）

· OMG，《Unified Modeling Language (UML) Specification》（时序图、活动图、状态机图的定义）

本文为原创内容，欢迎转发分享。转载请联系作者获取授权。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

长按，识别二维码，加关注