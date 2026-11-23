# 用 Pi 实现极简 Super Agent

> Deekseek SuperAgent 的极简实现，基于Pi+tmux

DeepSeek 提出的 SuperAgent 把 Agent 拆成负责沟通调度的 Router 与负责执行的 Worker，配合事件触发、异步任务和外部监控，让工作从「等一条指令做一件事」变成「持续接收任务并推进」。

本文介绍的是一套组件尽量少的实现：用 Pi、tmux、Telegram、cron 和 VM 搭出核心架构，不追求复刻全部机制，只为把 Router、Worker、异步执行与 Watchdog 的协作跑通，并为后续扩展留出空间。

![Image 1](https://pic2.zhimg.com/v2-d4e9b45940ddb333ceeb9a0134415049_1440w.jpg)

**架构对比**

DeepSeek SuperAgent 的核心思路，是把持续交互、任务调度与并发执行分开，并围绕事件触发、任务上下文、状态管理和 Watchdog 构建更完整的系统。我们选的是更普通的工程组件，两者的对应关系如下。

![Image 2](https://pic1.zhimg.com/v2-f98063d190980aceaf31772d8253a248_1440w.jpg)

对照下来，这套方案落实的是几个基础动作：用一个常驻 Router 统一接收请求，把具体任务派发到独立 Worker，通过后台执行减少 Router 的阻塞，用定时事件监督长期任务，并把计划、日志和任务记录保存成文件。没有做到的同样清楚：完整的任务注册表、Thread 关联机制、精细化事件路由，以及独立的任务状态管理，目前都还缺位。

**整体架构**

这套实现只用了六个通用组件：Pi 常驻为 Router，负责接收指令、理解任务与调度；tmux 提供持久化的终端 Session，承载 Pi、Gateway 和各个 Coding CLI Worker；Telegram 是远程入口，任务从 Bot 提交、结果从 Bot 返回；Coding CLI 执行具体开发任务，当前接入的是 pi-coding-agent 与 Opencode CLI；cron 周期性触发检查，提醒 Pi 核对各 Worker 的状态；整套系统跑在 VM 里，Workspace 指向宿主机共享目录，便于直接访问已有项目文件，也是存算分离的极简实现。

![Image 3](https://picx.zhimg.com/v2-7b670103a8c47c7df615e4db50364bf5_1440w.jpg)

Pi 负责协调，Coding CLI 负责执行。收到任务后，Pi 把它派发到独立的 tmux Session 里后台运行，自身继续保持可交互。Pi 不必亲自完成每一次代码修改，长耗时的工具调用也就不会阻塞交互，不同任务的上下文不会混在一起。

**常驻 Router**

Pi 是整套系统的控制入口，运行在一个持久化的 tmux Session 中。它接收来自 Telegram 的消息，借助 system prompt 与 Telegram mirror extension 把用户消息转成任务，再启动对应的 Coding CLI。

Router 尽量不亲自承担具体的 Coding 工作。如果所有代码修改都压在 Pi 的主 Session 里，长时间的工具调用既会阻塞交互，也会让不同任务的上下文互相污染。把执行交给独立 Worker，Router 才能始终轻量。

**Worker 运行时**

tmux 承担的是任务运行时。每个任务对应一个独立 Session，命名上就能区分角色：pi 是 Router，pi-telegram-gateway 是网关，pi-coding-task-a 与 opencli-task-b 分别是两个 Worker。

Coding CLI 启动后就在自己的 Session 里运行，执行输出通过 tee 落到 .tmp 目录下的任务日志，例如 .tmp/pi-coding-task-a.log 与 .tmp/opencli-task-b.log。

由此带来的直接好处是，Router 不必等 Worker 结束，tmux ls 能随时列出运行中的任务，attach 到某个 Session 就能现场观察执行过程，日志则留作后续排查。需要说明的是，tmux 本身并不提供任务语义、状态管理或依赖关系，我们只借它的 Session 和日志作为可观察的执行载体。

**远程交互入口**

Telegram Bot 提供的是远程入口。用户消息经 Telegram Bot API 到达 Gateway，Gateway 通过 WebSocket 转给 Pi Router；Pi 处理任务、派发 Worker，结果与状态再沿原路同步回 Telegram。Gateway 负责 API 通信与消息转发，Pi 负责任务理解与调度，两者职责分开，便于各自维护。对极简原型而言，这条链路已覆盖远程提交任务、接收反馈和查看进度三项基本需求。

**外部监督**

一个长期运行的 Agent 不能只在用户发消息时工作，还需要定期检查后台任务。我们用 cron 每 20 分钟执行一次检查脚本：脚本记录 tmux 状态快照、确认 Pi 是否正在处理请求，再通过 Gateway Webhook 向 Pi 注入一条检查提醒。

Pi 收到提醒后逐个检查 Worker，判断任务是否异常，必要时重新派发，并更新每日任务记录。

这是一种简化的事件驱动，这个 Watchdog 依赖 Pi 的判断能力，属于轻量级监督，距离独立、确定性的任务监控还有一段距离。

**运行环境隔离**

整套 Agent 系统运行在 VM 中，Workspace 则映射到宿主机的共享目录。这个部署同时满足两件事：运行环境相对独立，便于安装工具、管理依赖和长期运行；Coding CLI 又能直接访问宿主机上的项目文件，不必频繁复制代码。

![Image 4](https://pic4.zhimg.com/v2-8f0a4f6eba227992a2b54b81f291cee1_1440w.jpg)

VM 隔离的是运行环境，而不是文件。由于 Workspace 是共享目录，Worker 对它的读写仍会直接影响宿主机文件，目录权限、挂载范围和 CLI 的工具权限都需要谨慎配置。

多个 Worker 同时改动同一个 Workspace 也可能产生文件冲突，当前实现保留了这种简单共享，后续可以借 Git Worktree 或任务级目录进一步隔离。

**扩展方向**

**任务状态管理**

当前任务状态主要依赖 tmux Session、日志文件和 Daily Task 文档判断。后续可以引入 SQLite 或其他轻量数据库建立 Task Registry，状态查询、异常恢复与每日汇总由此建立在结构化数据之上，不必完全依赖模型从日志中推断。

**工作区隔离**

多个 Worker 同时改动同一个共享目录，容易出现文件覆盖和代码冲突。可以为每个任务创建独立的 Git Worktree，在 Workspace 下分出 main、worktree-task-a、worktree-task-b 这样的分支目录，减少并发任务之间的相互影响，也为后续的合并与验证提供更清晰的流程。

**确定性检查前置**

当前检查流程由 cron 触发、再由 Pi 判断各个任务是否异常。后续可以先由脚本做确定性检查：tmux Session 是否存在，Worker 进程是否退出，任务是否超时，日志是否持续更新，退出码是否异常；然后只把异常情况交给 Pi 做语义判断与恢复决策。这样既减少无效的模型调用，也降低 Pi 忙碌时错过 Worker 异常的概率。

**任务结果协议**

Worker 完成任务后可以按照统一格式输出结果，包含 task_id、status、summary、changed_files、tests 和 exit_code 等字段。Router 据此统一汇总、通知用户并更新任务状态，不必再逐条解析各 Worker 的自由文本输出。

**并发控制与事件路由**

任务数量增加之后，可以逐步引入最大并发数、任务优先级、任务队列，以及同一任务后续消息的路由机制。这些能力彼此独立，不必在最初的实现里一次备齐。

这五个方向指向同一件事：把目前依赖模型判断和文件推断的部分，逐步换成结构化、确定性的机制，而 Router 与 Worker 的分工保持不变。

**结语**

SuperAgent 的价值在于把持续交互与具体执行解耦：一个常驻的 Router 管理多个独立 Worker，通过事件和监督机制推动任务持续运行。Pi、tmux、Telegram、cron 与 VM 这五个组件，足以搭出具备这些基本特征的系统，帮助我们理解 Router、Worker、异步执行和 Watchdog 的协作方式。

这套实现的目标，是以极简方式提供一个可理解、可运行、可扩展的参考，不追求完整复刻 DeepSeek SuperAgent，也不试图一次解决所有任务管理问题。

从最小可运行系统开始，再按实际使用中的瓶颈扩展架构，或许是探索 SuperAgent 最直接的方式。点击阅读原文查看对应的 github repo。

## 来源

- 原文：https://zhuanlan.zhihu.com/p/2104976960610906741
- 抓取方式：jina reader（知乎反爬壳，HTTP/浏览器级均失败后兜底）
- 抓取时间：2026-11-23
