今年办公 Agent 这个方向越来越热。WorkBuddy、豆包工作这类产品的思路很直观：让 AI 帮你找资料、调工具、处理文件，把一项办公任务从头到尾跑下来，最后交付一份能用的文档。体验确实不错。

但很多企业用着用着，会卡在同一个问题上：数据要交出去。

会议纪要、项目方案、客户资料、财务报表，这些都是企业的核心资产。用通用的办公 Agent 处理，意味着这些数据要经过别人的服务器，模型是别人的，知识库存在别人那里，权限也不在自己手里。对于金融、政务、制造这些对数据安全有硬性要求的行业，这一步就过不去。

所以真正的需求是：能不能在自己的服务器上部署一套属于企业专有的办公 Agent？模型自己选，知识库自己建，权限自己管，所有数据从头到尾不出企业的边界？

最近我找到了一个，BISHENG 3.0 做的就是这件事。它是 Dataelem 团队打造的开源企业级 Agent 平台，桌面端基于 DeepSeek Harness（DSH）开发，与 BISHENG 企业平台协同，提供一整套开源、可私有化部署、自主可控的方案。简单理解，你可以把它看作 WorkBuddy、豆包工作的开源替代，让企业把 AI 能力真正掌握在自己手中。代码在 GitHub 上公开，部署在你自己的机房或私有云，数据全程不出企业。

这次 3.0 更新之后，员工在桌面上可以直接使用企业准备好的模型、知识、工具和技能，完成日常办公任务，产出的 Word、Excel、PPT 可以继续修改，改到满意为止。

今天我们就一起用一个实际的办公任务来走一遍 BISHENG 3.0 的完整流程，让你看看它到底怎么用、能做到什么程度。

## BISHENG 3.0 长什么样

装好 BISHENG 之后，你面前会出现一个桌面客户端。整个产品由两部分组成：DSH Desktop 桌面端，加上后面的 BISHENG 企业平台。

说到 DSH，做 AI 的朋友应该不陌生。BISHENG 团队在 DSH 发布当晚就第一时间开源了桌面客户端（DSH Desktop by Dataelem），截至目前已经有 100 万+下载和 20.8K GitHub ⭐️。个人用户直接下载就能用，企业用户通过 BISHENG 客户端连接企业平台。登录企业账号之后，管理员给你配好的模型、知识库、工具、技能就都出现了。

桌面端有两种工作方式，分别是 Chat 和 Work 两种模式：

**Chat**，日常聊两句、查资料、整理内容都在这里。需要跑比较复杂的任务时，比如让它帮你写一份 Word 报告，系统会自动进入任务模式，服务端帮你处理。你可以在界面上看到它调了哪些工具、走到哪一步了，不用干等。

**Work**，更直接，就是处理你电脑上的文件。选一个本地目录，告诉它你要干什么，它就在本地环境里跑，生成的文件直接存在你的文件夹里。

我感觉Chat 偏云端，Work 偏本地。看你手头的任务是什么，选合适的就行。

## 实操：用 BISHENG 跑一份项目汇报

光说架构太抽象，我直接拿一个真实场景来跑一遍。假设你是一个项目经理，周五下午要交一份"智慧园区综合管理平台"的项目汇报。特别说明：下面用到的材料是我从网上搜的，从实际项目文档改编的（做了脱敏），这种场景在日常工作里太常见了。

比如，你手里有这周的会议记录、项目进度跟踪表、还有之前写的产品方案文档，散落在不同地方。以前的做法通常是打开 Word，对着这些材料一点一点整理，从会议记录里提炼进展，从进度表里抓关键数据，再翻方案文档确认项目背景，折腾大半天才能交出一份能看的报告。

现在用 BISHENG 来做这件事。

### 第一步：登录并确认可用资源

打开 DSH Desktop，用企业账号登录。登录后可以看到管理员已经配置好的资源：可用的模型、知识空间、工具和技能。

在技能列表里，你会看到企业预置的 Word 文档制作、Excel 表格制作、PPT 制作等技能，这些是管理员统一配置并授权给你的。

![image1.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 第二步：准备材料，发起任务

我这次要做的项目汇报需要用到三份材料：

1.

本周的项目例会纪要（Word 文档，记录了前端、后端、测试各方向的进展和讨论事项）

2.

项目进度跟踪表（Excel，包含里程碑进度、各模块完成度、风险登记和预算执行情况）

3.

企业知识空间里的产品方案文档（详细的系统架构、功能模块设计和实施计划）

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

顺便说一下上面截图中的知识空间。对于有私有化部署需求的企业来说，这个能力很关键：权限可以细到单个文件级别，按部门或用户组授权，员工检索时系统只返回他有权访问的内容。团队协同共享知识的同时，敏感信息不会越权流动。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

接下来，我选择在 Chat 的任务模式下进行。进入对话界面后，我上传了会议纪要和进度跟踪表，同时选择了企业知识空间里的产品方案作为参考资料，然后输入提示词：

> 请根据我提供的第 14 周项目例会纪要和项目进度跟踪表，结合产品方案文档中的项目背景和建设目标，生成一份项目汇报 Word 文档。要求包含以下内容：项目概述、本周进展（按模块分述）、关键里程碑完成情况、风险与问题（重点说明海康门禁对接和生产环境服务器两个风险点）、下一步计划。格式参照公司标准项目周报模板。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

发送之后，系统自动进入任务模式。可以在界面上看到任务的执行过程：它先从知识空间检索了产品方案中的项目背景和架构设计，然后分析了我提供的会议纪要和进度表，接着调用 Word 文档制作技能开始生成报告。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 第三步：拿到初稿，检查内容

任务完成后，系统交付了一份 Word 文档。下载打开后可以看到：

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

整体结构是按照我要求的五个部分组织的。项目概述从产品方案文档中提取了瑞景科技园的背景信息和建设目标，本周进展根据会议纪要按模块做了梳理，进度表里的里程碑数据和完成度百分比也整合到了关键里程碑部分。

不过初稿总会有需要调整的地方，很多时候，不可能一次就让 AI 直接产出满意的方案或者结果。所以，你可以在同一个任务会话里继续提修改要求，它会基于已有的上下文和文件做迭代。

这种持续修改的体验很关键。传统方式下，AI 生成的初稿往往是一次性的，你想改就得重新描述整个需求或者手动去改。在 BISHENG 里，整个过程像是在跟一个助手协作，你说哪里不对，它就去调整，上下文一直保持着。

### 第四步：打开文件，核对最终结果

当文档确定之后，最终的 Word 文件既可以直接下载到本地存档，也可以上传到知识空间，团队或部门成员登录后就能查阅和复用。一份汇报从材料整理到团队共享，整个闭环在 BISHENG 里就跑完了。是不是很方便，这才是企业级 Agent 该有的能力。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 换个任务试试：销售数据整理成 Excel

如果你的工作更偏数据，可以试试用 Work 模式做一份 Excel。

首先，我们切换到 Work 模式，选择一个本地授权目录，在目录中放入销售明细的原始数据文件（比如导出的 CSV）

然后，输入提示词：

> 请把这份销售明细整理成一份 Excel 工作簿，包含以下工作表：月度汇总（含合计行和环比计算公式）、区域分布、产品线拆分。请用 Excel 公式计算，不要写死数值。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

任务完成后，文件就直接保存在了你选定的本地目录中。我们可以打开 Excel 表格，检查公式是否正确，图表是否随数据联动

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

如果某项预算需要调整，可以继续在任务中说：

> 把华东区 Q4 的推广预算调整到 65 万，更新所有相关的合计和占比。

然后检查合计行和图表是否相应更新了。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 企业怎么管这些资源

前面演示的这些能力，对员工来说就是打开客户端、登录、开始干活。但如果你是企业的 IT 管理员，你关心的可能是另一个问题：这些模型、知识、工具，怎么管？谁能用什么，怎么控制？

这部分我也看了一下 BISHENG 企业平台的后台，核心是这几块：

**模型管理**：管理员决定接入哪些模型、哪些部门或角色的员工可以使用。Chat 和 Work 的企业模型调用共用当前用户的月度积分账本，管理员配置每个人的额度和不同模型的积分倍率。员工在客户端可以看到自己的余额和用量。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**技能与工具授权**：这里有个清晰的分工，工具管动作，技能管方法。管理员配置 API、MCP 等工具，把企业的业务接口接入任务；再把报告规范、处理步骤和办公模板组织成企业技能，授权给对应的员工或部门使用。技能依赖的工具仍然遵守各自的权限和审批条件。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**知识空间权限**：知识检索会同时检查知识空间和文件级别的权限。员工只能检索和使用自己有权限访问的内容。

**用量审计**：管理员可以查看企业内的模型调用记录、token 用量和积分消费情况，了解整体使用状态。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**内容安全**：企业可以配置敏感词管控，自动审查员工发送的内容和 AI 返回的结果。管理员还能查看桌面端发起的模型调用记录，让 AI 的使用有据可查。

这套管理机制让企业可以放心地把 AI 能力开放给员工使用，同时保持对模型、数据和用量的掌控。

## 不强制替换，你习惯的 Agent 也能接入

值得一提的是，BISHENG 并不要求企业把现有的工具全部换掉。如果员工已经习惯了 WorkBuddy、千问办公、Codex 等 Agent 产品，可以继续使用。通过安装 BISHENG 提供的知识检索技能并配置访问密钥，这些外部 Agent 也能检索企业平台上获授权的知识内容。

管理员可以统一设置是否允许外部 Agent 接入、密钥有效期以及知识访问范围。员工选择自己顺手的工具，企业知识仍然遵循统一的权限规则。

我感觉这个设计很人性化啊，与其强推一套全新工具让所有人重新适应，不如把企业的知识和资源能力开放出来，让各种 Agent 都能接得上。

## 员工写的小应用，也能上线给团队用

这个能力我觉得挺有意思。

现在 Vibe Coding 越来越火，很多不会写代码的人也开始用 AI 帮忙做一些小工具了，比如一个培训报名表、一个项目台账、一个部门数据看板。但问题是，这些东西跑在你自己电脑上没问题，要让整个团队都用上，就得有人帮你把它部署到服务器上。对大多数人来说，这一步就卡住了。

BISHENG 3.0 新增了应用托管功能，专门解决这个问题。员工在本地用自己习惯的工具（或者直接用 Coding Agent）把应用写好，然后提交到 BISHENG 平台。平台会自动跑一遍预检和密钥扫描，通过发布审批之后，管理员设置好使用范围，同事就可以从应用中心直接打开使用了。

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![image.png](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

托管上去的应用还能接入平台已有的资源，比如用户体系、模型、工具、知识库。相当于个人做的一个小工具，接上了企业的整套基础设施。

从"个人在电脑上跑一个小应用"到"团队都能用的业务工具"，中间这段路，BISHENG 也都帮大家铺好了。

## 开源意味着什么

我为什么要花这么大篇幅写 BISHENG？一个很重要的原因是：它是开源的。

代码在 GitHub 上公开，你可以看到它到底怎么运行的。如果团队有开发能力，可以在上面做定制，换 LOGO、改界面、加自定义技能，DSH Desktop 的客户端代码也是开源的。部署在自己的服务器上，数据从头到尾在自己手里。

说实话，市面上做办公 Agent 的产品不少，但能让企业把代码拉下来、部署在自己机房里跑的，选择不多。这对那些数据不能出企业边界的行业来说，几乎是唯一的路。

当然，开源和商业并不矛盾。BISHENG 基础功能开源可用，企业旗舰版在同一平台上增加了更多商业能力。目前它已经服务了中国气象局、汇丰银行、博世、中国移动、中粮集团、中金公司等众多行业头部组织和世界 500 强企业。

## 写在最后

过去两年，AI 在办公场景的能力进步得很快。但我跟几个做企业 IT 的朋友聊过，大家的感受很一致：工具好不好用是一回事，数据放在谁手里是另一回事。一个能帮员工省两小时的 Agent，如果意味着核心业务文档要过别人的服务器，这笔账在很多企业看来并不划算。

BISHENG 3.0 切中的就是这个 AI 时代的企业痛点，试图在解决：能不能让企业在自己的地盘上，也跑起来一套好用的办公 Agent？

从我实际跑下来的体验看，它已经能完成"材料丢进去，文档出来，不满意就继续改"这条完整的链路。再加上企业级的权限管理、知识空间、用量审计，确实是一个完整的方案。

说到底，AI 越强大，谁来控制它就越重要。对个人来说，这意味着选择尊重隐私的工具；对企业来说，这意味着在自己的基础设施上运行 AI，用自己的规则管理数据。这件事的价值，可能比任何一个具体功能都大。

如果你的团队也在纠结"想用 AI 提升效率，又不想把数据交出去"，可以去 GitHub 看看，或者直接部署试试。

GitHub：https://github.com/dataelement/bisheng

官网：https://www.bisheng.ai

DSH Desktop：https://dshdesktop.com