专题导读

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

AI Coding 的普及，正在降低编码门槛，也让我们重新思考研发工作的组织方式。真实业务的交付，需要理解业务问题、形成明确需求，协调多个角色与系统完成实现，并验证结果是否符合预期。我们的 AI Native 探索围绕这些工作展开：让 Agent 承担更完整的任务，让人的经验、判断与实践反馈成为团队能够持续复用和改进的共同能力。

本系列分享高德搜索、推荐、广告技术团队围绕 Agent Teams 开展的工程实践。凌凌漆通过问题排查、主动走查和数据分析形成需求洞察，并持续跟进；星舰 10X 围绕研发目标组织多 Agent 协作，推进跨仓实现与交付核验；轻舟面向产品与前端场景，让更多角色参与产品构建。业务知识、工具接入、评测和云真机等能力，为这些工作提供共同支撑。

我们希望逐步贯通问题发现、需求形成、工程实现和结果验证，让人集中精力判断业务价值与关键取舍，让 Agent 持续推进执行与协同，使个人提效转化为团队可持续的业务交付能力。

本系列将按以下四个主题展开：

总纲篇：从真实任务出发，介绍 Agent Teams 的协作方式，以及支撑团队交付的工程机制[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21&token=1515272922&lang=zh_CN#wechat_redirect)  

交付篇：星舰 10X 展开复杂研发任务的协同推进、跨仓交付与知识复用；星舰 Cloud Agent 介绍云端任务的执行管理与产物交付[高德星舰10X：如何连接Agent能力与业务交付](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=1&sn=a330991923d9d7e0d343d1cb8dedb55e&scene=21#wechat_redirect)；[星舰Cloud Agent：一项研发任务如何在云端运行](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=2&sn=b0c77d24d7cfeb22d41df7a8b2700463&scene=21#wechat_redirect)

数字员工篇：结合搜索与广告凌凌漆的实践，介绍问题排查、业务分析、需求洞察和主动跟进，以及经验如何经过审核进入后续任务[高德广告凌凌漆：研发任务的持续执行与可信验收](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492867&idx=1&sn=e702e014680c4d100966af3d9e5e1569&scene=21#wechat_redirect)；[高德搜索凌凌漆：搜索问题归因与经验迭代实践](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492867&idx=2&sn=6c8abe212726d67376892576fbff6ebf&scene=21#wechat_redirect)

现场篇：以轻舟为例，介绍产品、设计等角色如何借助 Agent 参与产品与前端构建，并结合云真机等能力检查实际体验。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

本篇导读

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

FDE（Forward Deployed Engineer，前沿部署工程师）是最近又被讨论起来的一个概念：把工程师放到离需求最近的地方，贴着业务直接交付。这个模式有效，但昂贵——这一模式依赖较高的人力投入，难以覆盖大量并发需求。

高德搜索正在做另一种尝试：前沿部署的不是工程师，而是工程能力。通过自研 Agent 体系，把版本、分支、代码、构建、实验、真机验证、发布这一整条研发链路，部署到每一个需求现场——产品和设计同学不必再逐个平台操作，就能拿到一段可以继续验证、评审和发布的交付结果。

这篇文章是这场探索的阶段性总结。文中会依次说明：交付难在哪里、Agent 凭什么能替人执行、真机验证怎么留下证据、一个完整案例走到哪一步，以及这套方式目前的规模、口径和边界。**它不是"人人可用、全部自动化"的结论，而是一套仍在补齐中的交付方式。**

一、交付难点：个体变强了，团队链路没有变  

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

传统流程里，一个需求从需求文档、各方拉齐、评审、排期，到 QA、产品走查和发布，要经过 8 个节点。继续把"等待开发与联调"展开，还要跨越 12 类以上的平台和工具，版本、分支、权限、配置、实验和验证结果不断在系统之间传递。

AI 时代，编码本身可能很快；真正耗费时间的，是把代码送进生产流程，再完成联调、验证和发布。**轻舟要压缩的是"人必须亲自跨平台操作"的那部分，不是工程节点本身。**

### 适用范围与门禁：压缩的是流程，不是工程节点

对目标明确、风险可控的需求，平台减少重复沟通与人工操作；必要的需求确认、代码评审、测试和发布门禁仍然保留。

说明

**适用**

目标明确、变更边界可描述的需求：模块级样式与交互改造、单页面/单链路体验优化、配置与逻辑排查等

**不建议**

目标值本身未定义、需跨团队架构调整、涉及资金/权限/合规的核心链路的改动

**保留的门禁**

需求确认（产品与业务负责人）、代码评审（对应仓库 owner）、测试与验收（QA、产品走查）、灰度与发布审批（按现有流程由对应角色执行）

四个主节点是**用户视角的流程归并**，不是效率结论：交付效率要看具体案例的规模、周期与最终交付状态，不能由节点数量直接推导。

二、Agent 协作与授权：把工程能力接到需求现场  

### 一条任务走完四个主节点

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

_流程变短了，真实工程节点并没有被省略，研发执行由 Agent 接住。_

同一个需求，从提出到交付归并为四个主节点：发起任务、Agent Teams 执行、按验证矩阵完成真机验证、发布上线。在这个结构下，研发不再逐个平台操作：Agent 会建立工程环境，完成版本、分支、代码、服务、配置、实验与构建，再把产物推到可操作的云真机上，按本次任务声明的验证矩阵进入目标页面并执行真机验证，发现问题后继续定位和修正，再经人工确认与既有审批流程推进灰度和发布。

对话是统一入口，专业平台继续承担工程能力、权限与治理。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Agent 会围绕同一个任务持续工作：理解需求、选择工程路径、准备环境、完成修改、上真机验证，再根据结果继续修正。目标、分支、构建产物、设备状态和验证结论始终属于同一个任务：能继续就继续，证据不足就明确阻塞，发现问题就回到工程里修正。

**复杂度没有消失，而是被 Agent 接住了。** 用户看到的是一个持续推进的任务，底层仍然产出真实代码、真实构建、真实设备结果和可复核证据。

### 权限互通：代码权限集中承接，平台权限仍按人授权

代码权限由受控公共账号承接：它持有搜索业务下全部代码仓库的权限，产品同学因此不需要先申请 3—4 个 Group、十几到二十多个仓库，才能让一个需求动起来；其他平台通过 NCS 鉴权，在登录用户和各个平台之间完成无感串联。

这里要说准一点：这套设计改变的是**代码仓库的授权方式**，不是把所有权限都放开。代码读写由公共账号统一承接，因此 Agent 的代码能力不以个人是否申请过 Group 为限；而实验、灰度、发布这类平台动作，仍按用户自身的授权执行，Agent 只是代执行。

正因为仓库权限被集中承接，下面四项边界必须写清楚，公共账号才不是一张通行证：

•**仓库范围**：按 Group 授权，搜索业务下各 Group 的仓库都在范围内，只要需求不超出 Group 边界，就不需要重复授权；新增仓库时由人手动把权限补给公共账号。

•**操作限制**：只能推开发分支，不能直接推主干；合入主干前必须由研发 review；可以触发构建，发布必须由人确认；

•**任务归属**：提交与当前登录人绑定，这次改动由谁发起可以查到；

•**审计方式**：任务、提交、构建、真机验证与对话记录都留在轻舟平台上，可以按任务回看。

同时需要说清楚边界：_凭证隔离是凭证层的保护，不等于所有操作天然安全。_配置修改、UI 实验、灰度与发布仍然需要独立的授权与审批，Agent 不能绕过公共账号的操作限制和平台审批。

任务开始前，系统会检查所需能力，明确缺少的是仓库、平台登录还是设备授权；补齐以后，Agent 从原任务上下文继续推进。

### Agent Teams：多实例协作架构

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

轻舟自研了一套 Agent Teams 通信机制：一个任务被拆成主会话、前端、后端、产品经理等职能角色，每个职能都是一个独立的 Claude Code 实例，由 Claude Opus 5.5 驱动，也可以按需灵活切换为 Codex。

实例之间通过一套自研的内置工具以「邮件」的方式往来通信：主会话下发任务、前后端协商接口协议、各角色同步进展与结论。

为什么选择多实例，而不是「主 Agent + subagent」？

•**技能按需装配**：每个实例只整合自己领域所需的 Skill 与知识，不需要把前端、服务端、实验、发布等所有领域知识一股脑塞给同一个实例；

•**生命周期与上下文更稳定**：在当前使用方式下，独立常驻的实例更便于保留角色上下文并持续响应协作消息，而不是任务一结束就失去响应。

多实例协作最容易出问题的是"多个 Agent 改同一份文件"。这里靠职责切分避开：前端实例只改前端文件，后端实例只改服务端文件，两端不会落到同一个文件上；确实需要变更接口协议时，两个实例直接发起沟通对齐，而不是靠人在中间传话。

实例也不会一直占着资源：任务结束后 7 天自动回收。这个时长是按过去需求的交付周期倒推出来的——足够覆盖中途等待、返工和二次确认，又不会让实例无限堆积。

### 沙盒：Aone Sandbox

Agent 的编码、构建与命令执行，全部运行在 Aone Sandbox 中——这是一个面向 AI 应用的代码安全沙箱，基于 `runD` 安全容器实现内核级隔离，每个沙盒运行在独立的内核空间，与宿主机和其他容器相互隔离。**这层隔离保护的是宿主与执行资源**：Agent 通过已授权接口对配置、实验或发布产生的影响，仍由上面说的授权与审批来约束，不会因为"跑在沙盒里"而免疫。

•**环境独立可定制**：支持自定义镜像与多容器编排，任务之间互不干扰；

•**热备资源池**：通过热备资源池降低环境获取等待；冷启动时间会随镜像大小和编排方式变化。

### 沙盒内无感鉴权：AuthX

Agent 要替用户操作各个内部平台，身份认证是绕不开的核心问题：Agent 同时代表两个实体——它自身的工作负载身份，以及它背后的用户身份，传统单一身份模型无法同时表达这两层含义。

轻舟通过 AuthX 的 AIT + APT 双令牌架构解决：AIT 回答「你是谁」，把工作负载身份与委托用户身份绑定在同一个令牌里；APT 回答「你确实持有对应的私钥」，提供请求级的持有证明与防重放保护。

更关键的是**凭证隔离**：长期凭证（私钥、Refresh Token）永远不进入 Agent 运行环境，而是由沙盒外的 Egress Sidecar 完成签名注入。即使沙盒内执行的代码出现问题，也拿不到用户的长期凭证。对用户而言这一切是「无感」的：不需要在每个平台重复登录授权，同时保留了原有的权限边界，即： 对实验、灰度、发布等以用户身份执行的平台动作，不扩大用户原有权限；代码仓库访问则由受控公共账号按 Group 范围集中承接，并受到分支限制、人工 Review 和任务审计约束。

三、真机验证：设备底座 + 可复核的证据链  

### 为什么必须是真实设备

所有 C 端研发链路，可以没有自研 Agent，但不能没有真实设备验证这一环——云真机就是承接这一环的底座。

模拟器和桌面环境无法还原真实设备上的系统字体、分辨率、容器行为、权限弹窗与厂商定制，而这些差异都可能改变最终结果。因此我们建设了一个可认领、可并发的真实设备池：**在用设备 127 台；另有 120+ 台在采购中**（截止 2026 年 10 月 28 日）。设备型号覆盖苹果、华为、小米、vivo、OPPO 等主流厂商的 Android / iOS / HarmonyOS 机型，包含各厂商中高档旗舰与折叠形态机型，目的是更好地适配不同厂商的机型差异。Agent 可以直接在设备上执行安装、操作与验证。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

每台设备都预置高德测试账号，使登录态、城市、历史行为与业务数据可以重复准备，让不同任务和不同机型从稳定、可复现的状态开始验证。

### 三种验证方式：自主执行、过程可见、结果可复核

构建完成后，通过三种方式确认效果：

Agent 自主验证

过程实时可见

手机扫码复核

Agent 安装产物、进入业务、操作页面，发现问题后继续定位和修改

Agent 的真机操作过程和页面结果实时可见

用自己的手机扫码，在真实设备上亲自确认效果

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Agent 会把产物从独立环境推到云真机，进入真实业务状态，完成操作、抓取证据，并根据验证结果继续修改。稳定入口优先一键直达，新的页面路径和动态状态由 Agent 自主探索。无论怎样到达目标页面，最终都要用 DOM、截图、日志与运行状态证明结果；人也可以同步在右侧的真机预览看到效果，人和agent看到的画面始终是一样的。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### DOM：从「看起来接近」到参数级核对与差异定位

多模态负责理解整体视觉和页面语义；DOM 负责把视觉差异落到可比较的参数上：它能读到元素的位置、尺寸、字号、行高、圆角、间距、颜色、容器嵌套与计算样式，再通过选择器、组件树与提交 diff 映射到具体源码位置。字号、间距一类参数以逻辑像素（px / dp / pt）对齐，并说明与真机物理像素的换算关系，设计稿、真机运行结构和代码位置由此形成同一条可验证链路。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

_页面结构负责精度，多模态负责理解，真实设备负责证明结果。_

需要强调的是，**参数一致不等于视觉完全一致**：字体渲染、图片素材、阴影与模糊、合成层和系统级差异都可能造成肉眼可见的差别。因此参数核对是定位手段，最终结论仍以真机截图对照与人工复核为准。

### 验证矩阵的范围：设备池覆盖三端，不等于每个需求都验三端

设备池覆盖三端，是为了让每个需求都能选到匹配的机型；单个需求验证哪些设备、哪些系统状态，由变更风险决定：影响面大小、是否依赖系统能力、是否涉及机型差异、是否有明确的验收场景。矩阵在任务开始时声明，验证结果按矩阵逐项回填。

本节说明验证矩阵的选择原则。设备池的覆盖范围不代表本文案例的实际验证范围，单个案例的验证结论仅限于实际执行并留存证据的设备、系统和页面状态。

四、一个完整交付案例：108 个跨业务模块样式升级  

统一的样式标准落在 108 个跨业务模块上，就是 108 次独立交付：入口、数据、真实渲染组件和验收条件都可能不同，每个模块都必须单独找到、修改和验证。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

_整体业务任务覆盖 108 个模块；不同入口、数据条件和实际渲染组件必须分别验证。_

108 个模块

96 份 `result.json`

795 张过程图

完整业务范围，覆盖不同业务与不同页面状态

现有四批 E2E 过程材料，一模块一份可下钻结果

保留搜索、结果、详情、定位、实际效果与返回路径

108 是完整业务范围；现有四批过程材料覆盖其中 96 个模块：基础内容与推荐 16 个、行业推荐 43 个、交易与广告营销 19 个、商家 18 个。每个模块都有独立 `result.json` 和对应截图，不能用同一页面上相邻模块的结果互相替代。其余 12 个模块也已完成，**108 个模块已全部上线**。

### Agent 自己走完正式业务入口

Agent 沿正式业务入口输入搜索词、选择 POI、进入详情并滚动定位模块。搜索词、账号态、数据、页面位置和目标组件全部成立以后，截图与 DOM 断言才有业务意义；深链只用于诊断，不替代正式入口。

### 一份 `result.json` 如何从视觉差异下钻到工程原因

以"相似货架—横版卡片"为例，Agent 不只记录"字体不对"，还会保留选择器、节点、计算样式、运行分支、Commit 映射与真实渲染组件。

断言

设计目标 → 实际参数

结构证据

模块标题

30px / Medium → 28px / Medium

`.c3-normal-header_title`

 · node 29885

卡片标题

Medium → Bold

`.strategy-atom-title`

 · node 30565

"团"标识

Medium → Bold

`.omni-text-icon_text`

 · node 32955

Agent可以结构化拆解页面dom元素，借此将视觉差异收敛到具体节点、样式与运行分支，为后续根因确认和修复提供证据。

五、规模化结果与边界  

### 搜索链路 UI 焕新：一条连续变化的链路

2026 年，高德全站推进视觉升级：拥抱 iOS 液态玻璃（Liquid Glass）的设计语言，几乎覆盖地图的全部核心页面。搜索链路上的焕新由轻舟承担，覆盖搜索首页、搜索列表和搜索详情页——真正要交付的不是三张页面，而是一条连续变化的搜索链路。

**先讲清分工**：Agent 对照设计稿写代码还原，自己上真机验证；人做最后验收，并提出修改意见。设计稿本身也不等于最终版本——产品需要看屏效、看关键入口的转化率，判断这次改动会不会影响转化，所以必须由人来看；而且即使有设计稿，实际还原也很难做到 100%。这类视觉焕新因此更像「Agent 负责执行与自证，人负责判断与拍板」。

**当前状态**：已全部上线。

搜索入口层级、图标语义、留白、背景和内容密度需要一起变化；输入长度、历史记录、建议词、结果文案、定位与隐私状态又会持续改变页面。Agent 先识别三类页面共享的设计语言，再进入每个真实状态逐一处理。

详情页焕新在 iPhone 真机上验证。Agent 将构建产物推送到设备，进入指定点位和页面状态，按同一尺度对照设计稿与真机截图，再把差异放大到返回按钮、头图区、焦点卡、模块衔接和底部功能 Bar。开发过程中，验证材料、判断和结果回传到「文档」Tab；仓库分支与 CR 链接同步回传到「仓库」Tab，供研发直接进入评审。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

验证从整屏同尺度对照开始，再逐步下钻到尺寸、圆角、材质、间距和衔接位置。底 Bar 的穿透效果则同时比较整屏状态、局部细节和逐行数据，让设计选择有真实设备上的完整证据。

### 热点承接页：没有设计稿，从对话到可运行模块

产品直接在搜索列表新增了一个热点承接活动模块。这个案例没有设计稿，也没有预先定义完整样式；产品说清楚想做什么，Agent 先实现一版，再根据真机效果继续调整。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

容器圆角、主副标题间距、描边、透明度和按钮样式，都是产品看过实际效果后继续告诉 Agent 怎么改。每轮对话都直接落到代码和真机结果。

**当前状态与验收口径**：这个模块已经上线到真实的搜索列表；验收标准由产品在真机上逐轮确认，依据是截图对照与 DOM 参数对齐，而不是"看起来像就过"。

### 写在最后：合理控制对 AI 的预期

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

FDE 的价值在于让工程能力贴近需求，AI 的价值在于让这种贴近不再受限于人的数量。对目标明确、风险可控且已接入平台能力的需求，Agent 可以在授权范围内持续执行，并为交付过程留下可复核证据。这让更多产品和设计同学能够发起并跟进工程交付，但业务确认、代码评审、验收判断和发布责任仍由相应角色承担。

但门槛下移不等于责任下移：业务确认、验收判断和发布责任，仍然由人承担。这不是终点，只是高德搜索 AI Native 化的阶段性一站。接下来我们会在成本、交付速度上继续优化，也会继续分析还有哪些必须由人参与的节点可以被 AI 化——以及哪些节点不应该被 AI 化。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

系列总结

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

本系列至此收官。后续我们会通过真实任务检验这些方法，持续观察交付周期、返工和人工接续的变化，判断改进是否带来了实际收益。

有效做法将在新的需求中继续复验，失效的经验与规则及时修正。每一次调整，都应能回到具体问题，并由执行记录和验证结果说明效果。

往期推荐

[AI Coding之后：搜广推团队的研发工程化探索](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492726&idx=1&sn=3cc81746dc6c3352610147bc5418f15f&scene=21#wechat_redirect)

[高德星舰10X：如何连接Agent能力与业务交付](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=1&sn=a330991923d9d7e0d343d1cb8dedb55e&scene=21#wechat_redirect)

[星舰Cloud Agent：一项研发任务如何在云端运行](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492800&idx=2&sn=b0c77d24d7cfeb22d41df7a8b2700463&scene=21#wechat_redirect)

[高德广告凌凌漆：研发任务的持续执行与可信验收](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492867&idx=1&sn=e702e014680c4d100966af3d9e5e1569&scene=21#wechat_redirect)

[高德搜索凌凌漆：搜索问题归因与经验迭代实践](https://mp.weixin.qq.com/s?__biz=MzE5ODQ3MDM4Mw==&mid=2247492867&idx=2&sn=6c8abe212726d67376892576fbff6ebf&scene=21#wechat_redirect)

#高德 #高德技术 #AI Native #轻舟Agent #真机验证

_**END**_