---
id: wiki-entity-gaode-qingzhou-agent
type: entity
title: 轻舟 Agent（高德现场篇研发工程化 Agent）
status: active
created: 2026-11-21
updated: 2026-11-21
confidence: medium
tags:
  - entity
  - ai-coding
  - agent
  - fde
  - real-device-verification
sources:
  - raw/sources/ai/2026-11-20-gaode-qingzhou-agent.md
related:
  - wiki/entities/gaode-ad-linglingqi.md
  - wiki/entities/gaode-search-linglingqi.md
  - wiki/entities/gaode-starship-10x.md
  - wiki/concepts/ai-native-sdlc.md
  - wiki/concepts/acceptance-agent.md
  - wiki/concepts/agent-sandboxing.md
  - wiki/concepts/agent-permission-model.md
  - wiki/concepts/ai-coding-delivery-four-stages.md
---
# 轻舟 Agent（高德现场篇研发工程化 Agent）

## Overview（概览）

高德搜索技术团队建设的面向产品与前端场景的 **AI 原生研发工程化 Agent**，是《信息业务 AI Native Builder》系列的现场篇核心对象。其核心思路是把 FDE（Forward Deployed Engineer，前沿部署工程师）模式从"部署工程师"转为"部署工程能力"——将版本、分支、代码、构建、实验、真机验证、发布整条研发链路部署到每个需求现场，让产品和设计同学不必逐个平台操作即可拿到可验证、可评审、可发布的交付。高德技术一手自述，单信源，置信度中。

## Identity（身份）

- **归属**：高德（Amap）搜索技术团队。
- **性质**：面向产品与前端场景的 AI 原生研发工程化 Agent / 现场篇交付平台。
- **系列定位**：《信息业务 AI Native Builder》系列现场篇（收官篇）；同系列含总纲篇、交付篇（[[gaode-starship-10x|星舰 10X]]、星舰 Cloud Agent）、数字员工篇（[[gaode-ad-linglingqi|广告凌凌漆]]、[[gaode-search-linglingqi|搜索凌凌漆]]）。
- **核心立场**：不是"人人可用、全部自动化"的结论，而是一套仍在补齐中的交付方式；**门槛下移不等于责任下移**，业务确认、验收判断、发布责任仍由人承担。

## Important Facts（重要事实）

- **FDE 模式的成本问题**：FDE（前沿部署工程师）把工程师放到离需求最近的地方贴业务直接交付，模式有效但昂贵——依赖较高人力投入，难以覆盖大量并发需求。轻舟部署的不是工程师而是工程能力，把整条研发链路部署到需求现场，压缩的是"人必须亲自跨平台操作"的部分，不是工程节点本身。
- **流程归并四主节点**：传统流程一个需求要经过 8 个节点、跨 12+ 类平台工具；轻舟将其归并为四个主节点——发起任务→Agent Teams 执行→按验证矩阵真机验证→发布上线。四个主节点是用户视角的流程归并，不是效率结论；复杂度没有消失，而是被 Agent 接住。
- **适用范围与保留门禁**：适用目标明确、变更边界可描述的需求（模块级样式交互、单页/单链路体验、配置逻辑排查）；不建议目标值未定义、跨团队架构调整、涉资金/权限/合规核心链路。保留门禁：需求确认（产品与业务负责人）、代码评审（仓库 owner）、测试验收（QA 产品走查）、灰度发布审批（按现有流程）。
- **权限互通**：代码权限由受控公共账号按 Group 集中承接（产品不必先申请 3-4 个 Group、十几到二十多个仓库）；其他平台经 NCS 鉴权无感串联。四条边界：只能推开发分支不推主干、合入前须研发 review、可触发构建但发布须人确认、提交与登录人绑定可查；任务/提交/构建/真机验证/对话记录留平台可回看。**解读**：凭证隔离是凭证层保护，不等于操作天然安全，配置/实验/灰度/发布仍须独立授权与审批。
- **Agent Teams 多实例架构**：任务拆为主会话、前端、后端、产品经理等职能角色，每个角色是独立 Claude Code 实例（由 Claude Opus 5.5 驱动，可切 Codex），实例间以"邮件"方式通信。选多实例而非主 Agent+subagent，因技能按需装配（各实例只整合本领域 Skill/知识）、生命周期与上下文更稳定。靠职责切分避开多 Agent 改同一文件（前端只改前端、后端只改服务端），任务结束 7 天自动回收。
- **Aone Sandbox 沙盒**：编码/构建/命令执行全跑在基于 runD 安全容器的内核级隔离沙盒，每个沙盒运行在独立内核空间，保护宿主与执行资源；环境独立可定制、热备资源池降等待。但 Agent 通过已授权接口对配置/实验/发布的影响仍由授权审批约束，不因跑在沙盒而免疫。详见 [[agent-sandboxing|Agent 沙箱隔离]]。
- **AuthX 双令牌无感鉴权**：Agent 同时代表工作负载身份与用户身份两层，以 AIT（回答"你是谁"，绑定两者）+ APT（回答"你确实持有对应私钥"，请求级持有证明与防重放）双令牌解决。关键是凭证隔离——长期凭证（私钥、Refresh Token）永不进 Agent 运行环境，由沙盒外 Egress Sidecar 完成签名注入，沙盒内代码出问题也拿不到用户长期凭证。详见 [[agent-permission-model|Agent 权限模型]]。
- **真机验证设备底座**：模拟器/桌面无法还原真实设备字体/分辨率/容器/权限弹窗/厂商定制，故建可认领可并发真实设备池——在用 127 台、另有 120+ 台在采购中（截至 2026-10-28），覆盖苹果/华为/小米/vivo/OPPO 等 Android/iOS/HarmonyOS 机型。每台预置高德测试账号，保证登录态/城市/历史/业务数据可重复准备。三种验证方式：Agent 自主验证、过程实时可见、手机扫码人工复核。
- **DOM 参数级核对**：多模态负责理解整体视觉语义，DOM 把视觉差异落到可比较参数（位置/尺寸/字号/行高/圆角/间距/颜色/容器嵌套/计算样式），经选择器/组件树/diff 映射到源码位置；逻辑像素（px/dp/pt）对齐并说明与物理像素换算。**参数一致≠视觉完全一致**，最终结论以真机截图对照与人工复核为准。验证矩阵按变更风险声明（影响面/系统能力依赖/机型差异/验收场景），非每个需求都验三端。
- **完整案例：108 模块样式升级**：108 个跨业务模块各自独立交付，现有四批 E2E 过程材料覆盖 96 个模块（基础推荐 16、行业推荐 43、交易广告营销 19、商家 18），每模块独立 result.json 与截图，108 模块已全部上线。result.json 从视觉差异下钻到工程原因（如相似货架横版卡片：模块标题 30px→28px、卡片标题 Medium→Bold，落到具体选择器与节点）。
- **搜索链路 UI 焕新**：覆盖搜索首页/列表/详情页，Agent 对照设计稿写代码还原、自上真机验证、人做最后验收提修改意见；已全部上线。热点承接页无设计稿，产品说清意图 Agent 先实现再依真机效果调整，验收靠截图对照与 DOM 参数对齐而非"看起来像就过"。

## Products / Projects（产品／项目）

- 轻舟 Agent（现场篇研发工程化 Agent）
- Agent Teams（多实例协作通信机制，轻舟自研）
- Aone Sandbox（基于 runD 的代码安全沙箱）
- AuthX（AIT+APT 双令牌无感鉴权）
- 云真机设备池（真实设备验证底座）

## Relationships（关系）

- **与星舰 10X**：同属高德 AI Native Builder 系列交付/现场两翼，[[gaode-starship-10x|星舰 10X]] 聚焦研发目标组织与跨仓交付，轻舟聚焦产品前端场景与真机验证，二者共用 Agent Teams 与云真机底座。
- **与凌凌漆系列**：[[gaode-ad-linglingqi|广告凌凌漆]]与[[gaode-search-linglingqi|搜索凌凌漆]]属数字员工篇（问题排查与经验迭代），轻舟属现场篇（产品交付与真机验证），三套 Agent 共用业务知识、工具接入、评测与云真机等支撑能力。
- **与验收 Agent**：真机验证的 DOM 参数核对、验证矩阵与人工复核，是 [[acceptance-agent|验收 Agent]] 在端侧/视觉验收的工程实例，与接口级验收互补。
- **与 Agent 沙箱**：Aone Sandbox 是 [[agent-sandboxing|Agent 沙箱隔离]] 在高德生产环境的落地（内核级容器隔离 + 热备资源池）。
- **与 Agent 权限模型**：AuthX 双令牌与凭证隔离是 [[agent-permission-model|Agent 权限模型]] 中"凭证归属与校验位置"思路的工程实现（长期凭证留沙盒外、按用户身份代执行）。
- **与 AI 原生 SDLC**：FDE→工程能力部署、四主节点归并、保留人工门禁，是 [[ai-native-sdlc|AI 原生 SDLC]] 在高德现场篇的落地。
- **与交付四环节**：四主节点归并对应 [[ai-coding-delivery-four-stages|AI Coding 交付四环节]] 的意图/上下文/评审/评估，真机验证与 DOM 核对补上评估侧的证据链。

## Timeline（时间线）

- 2026-10-28：云真机设备池快照（在用 127 台、采购中 120+）。
- 2026-11-20：信源文发布（现场篇收官）。
- 2026-11-21：首次立实体页。

## Current Understanding（当前认知）

轻舟的核心变化不是让 Agent 替人写更多代码，而是把"人必须跨平台操作"的那部分压缩掉，把整条研发链路作为工程能力部署到需求现场。**解读**：其价值在于让产品和设计同学能发起并跟进真实交付，但复杂度并未消失而是被 Agent 接住，人工门禁与责任不可下移——业务确认、代码评审、测试验收、发布审批四道门禁保留，验收结论以真机截图与人工复核为准而非参数一致。FDE 模式因 AI 而从"依赖人的数量"转为"部署工程能力"，这是对 FDE 昂贵性问题的工程回应，但仍属阶段性一站，成本与交付速度仍在优化。

## Evidence（证据）

- 信源：`raw/sources/ai/2026-11-20-gaode-qingzhou-agent.md`（专题导读、本篇导读、一至五章：交付难点与适用范围、Agent 协作与授权（四主节点/权限互通/Agent Teams/Aone Sandbox/AuthX）、真机验证（设备底座/三种验证/DOM 核对/验证矩阵）、108 模块完整案例、规模化结果与边界、系列总结）。
