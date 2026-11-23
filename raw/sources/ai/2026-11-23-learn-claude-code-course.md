---
title: 8 万星的教学项目：手写一个 mini Claude Code
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/S9qKe-pMM3130Ha1hN_6UA
source_type: article
platform: 微信
captured: 2026-11-23
registered_at: 2026-11-23
inbox_ref: Inbox/2026-11-23-learn-claude-code-course.md
asset_ref: Assets/2026-11/weixin-s9qke-pmm3130ha1hn-6ua.md
---

`shareAI-lab/learn-claude-code` 是 GitHub 上一门 79.6k Star、12.7k Fork 的开源课，MIT 协议，62 位贡献者，主语言 Python，最后一次推送是 2026 年 10 月 27 日——一个还在长的项目，不是一份写完就归档的教程。它的副标题只有一句：**Bash is all you need**。

整门课的主张能压成三句。

**第一句：Agency 来自模型，不来自你的编排代码。** 模型是司机，你写的代码是车。把 LLM 调用串成 if-else 流程图、节点图、prompt 瀑布，产出的不是 agent，是一台绕来绕去的自动售货机。

**第二句：一个 Agent 产品 = 模型 + harness。** harness 是五样东西的集合——工具、知识、观察、动作接口、权限。这五样决定了模型有没有手、有没有眼睛、有没有边界。

**第三句：harness 的全部秘密，是一个 while True 的循环。** 后面 16 节课都在往这个循环周围挂东西，没人去改循环本身。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

这句话听着像口号，但它是全课的骨架。Claude Code 被它拆成十来个零件：一个循环、一堆工具、按需加载的技能、上下文压缩、子代理、带依赖图的任务系统、异步邮箱、任务绑定的 worktree、权限治理、hooks、记忆、MCP 路由。零件很多，但都在同一个循环外面。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

## 课程怎么编排

17 节课不是按难度排的，是按"一个 agent 从能干活，到能长期干活"这条能力线排的。README 给了七段学习路径，实际可以压成三段来读。

### 第一段 s01–s04：先让它能动

**讲什么。** s01 只有 shell 一个工具加一个循环，口号是 "One loop & Bash is all you need"。s02 把工具从 1 个扩到多个，靠一张 `TOOL_HANDLERS` 分发表，"Adding a tool means adding one handler"——加工具就是加分发项，循环一行不动。s03 加权限规则：什么能跑、什么必须停、什么要审批，用一条 `PermissionRule` 流水线做判定。s04 加 hooks，`PreToolUse` 和 `PostToolUse` 两个切点，"Hook around the loop, never rewrite the loop"。

**学到什么。** 工具是注册进去的，不是写死进去的。这一句能救掉大量烂掉的 agent 代码：一旦工具和循环耦合，每加一个能力就得改主干，最后没人敢动。而权限和 hooks 的顺序也值得记住——先划边界，再给自由。

**适合谁。** 写过一版 function calling demo、但代码一加工具就崩的人。这四节课上完，你会得到一个能自己决定敲哪条命令、并且敲之前会被拦一道的壳子。

### 第二段 s05–s09：让它扛住复杂任务

**讲什么。** s05 是 TodoWrite，先列计划再执行，"An agent without a plan drifts"。s06 是子代理：给子任务一份全新的 `messages[]`，它跑完只把最后一段文本当成一个工具结果交回来。s07 是技能按需加载，先给模型一份目录，真要用才展开正文，而不是一股脑塞进 system prompt。s08 是上下文压缩，四个动作依次收紧：`tool_result_budget` 先削工具输出，`snip_compact` 再剪、`micro_compact` 再压，实在还超才 `compact_history` 整段摘要。s09 是记忆，拆成选择、抽取、固化三个子系统，管的是"什么值得记、怎么记、旧账怎么合并"。

**学到什么。** 上下文是预算，不是垃圾桶。这一段的真正主题是"隔离"——子代理不是为了多一个模型，是为了让一段脏活拥有独立的消息列表，脏不回来。压缩也不是摘要，是一条从便宜到贵的四级阶梯，能截断就别摘要。

**适合谁。** 被 200k 上下文和"agent 跑到一半忘了自己在干嘛"折磨过的人。做过 RAG 的人读 s07 会特别有感觉：检索和加载是两件事，课程选的是加载。

### 第三段 s10–s17：让它跑长、跑久、跑成队

**讲什么。** s10 把任务图落到磁盘，`TaskRecord` 加 `blockedBy` 表达依赖，这是后面多 agent 协作的地基。s11 把慢操作丢进后台线程，完成时往通知队列塞一条消息，注入回循环。s12 是 cron，让任务按时间自己触发。s13 是最重的一节：常驻队友、原子认领任务、任务绑定的 worktree、类型化协议——四个东西凑齐才能让多个 agent 同时改一个仓库而不打架。s14 接 MCP，把外部工具装进同一个工具池，名字加命名空间区分。s15 把前面的机制装配成一个完整 runtime。s16 讲编排形状固定了就写进脚本，带生命周期事件和 journal 断点恢复。s17 是目标闸门：循环能不能停，交给一个独立评估器判断，目标不可达、已失败或超限就把控制权交回用户。

**学到什么。** 多 agent 的难点从来不在并发，在任务归属和上下文边界。谁认领了哪个任务、在哪个目录改、改完通过什么协议汇报——这三件事理顺了，并发只是顺带的。s17 则是另一层认知：让 agent 自己判断"我做完了"是最危险的一步，得有个外部裁判。

**适合谁。** 想把 demo 变成能挂一晚上的东西的人。只想写业务 agent 的话，s01 到 s09 就够用了。

## 一个 Agent harness 的最小骨架

如果这篇只留一节，就留这节。s01 的 `code.py` 只有一个循环、一个 bash 工具，把这四步跑通，后面所有机制都是给它加挂件。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第一步，模型调用。** 把 `messages`、`tools`、`system` 三样一起发出去。注意这里没有"当前在第几步""上一步成功了没"这类状态，只有对话历史和工具清单。

**第二步，判断要不要继续。** 看 `response.content` 里有没有 `tool_use` 块。没有，说明模型只想说话，直接 return——这就是"循环终止"的全部实现，四行代码，没有任何 `if 任务完成` 的判断。

**第三步，执行工具。** 拿 `block.name` 去 `TOOL_HANDLERS` 里查函数，`block.input` 直接当关键字参数。这里没有意图识别、没有路由、没有重试，模型说调什么就调什么。

**第四步，结果回灌。** assistant 那条回复原样 append 进历史，然后把工具结果打包成 `tool_result` 数组，**以 user 角色**追加回去，每条带 `tool_use_id` 和上一步的调用对账。回到第一步。

`def agent_loop(messages):       while True:              resp = client.messages.create(               model=MODEL, system=SYSTEM, messages=messages, tools=TOOLS)           messages.append({"role": "assistant", "content": resp.content})           calls = [b for b in resp.content if b.type == "tool_use"]           if not calls:               return           results = [{"type": "tool_result", "tool_use_id": b.id,                       "content": TOOL_HANDLERS[b.name](**b.input)} for b in calls]           messages.append({"role": "user", "content": results})`

这段代码值得盯着看三分钟，因为它回答了一个被问烂的问题：agent 的"自主性"写在哪一行？答案是不在哪一行。谁决定下一步、谁决定什么时候停，全是模型。代码只做搬运：把世界状态搬成 messages，把模型的意图搬成函数调用。

也正因为如此，这个循环才改不动、也不用改。加工具是改分发表；加知识是改 system 里那份目录；压缩是插在 append 之后；权限和 hooks 是包在"执行工具"外面；子代理是把第三步换成"起一份新 messages 再跑一遍这个循环"。s15 的题目叫 "Many mechanisms, one loop"，说的就是这个：挂件再多，主机只有一个。

## 快速开始

`git clone https://github.com/shareAI-lab/learn-claude-code   cd learn-claude-code   pip install -r requirements.txt   cp .env.example .env    # 填 ANTHROPIC_API_KEY      python s01_agent_loop/code.py          # 一个循环 + bash   python s08_context_compact/code.py     # 上下文压缩，最复杂的一节   python s17_goal_loop/code.py           # 跑到目标达成为止      cd web && npm install && npm run dev   # 可选：本地课程站`

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

几个实操细节。每章的 `code.py` 都是独立可跑的，不用按顺序装环境，但**建议按 s01 → s02 → s03 的顺序读**，因为后面章节默认你已经理解那个循环。每章目录里有三份 README：`README.md` 是英文正文，`README.zh.md` 是中文，`README.ja.md` 是日文，`code.py` 之外还有 `images/` 下的 SVG 图。课程站（learn.shareai.run）提供了 reading、source、simulator、architecture 四种视图，s16 和 s17 这两节的结构看得最清楚。

## 局限与取舍

**第一，它是教学实现，不是生产代码。** 为了"一节课只讲一个机制"，每章的 `code.py` 砍掉了重试、流式、超时、并发安全、provider 适配这些东西。README 自己也把边界写得很清楚：这是 0 到 1 的 harness 工程课。你要上线，作者给的下一站是同门的 Kode CLI 和 Kode Agent SDK，不是一个可以直接 `pip install` 的框架。

**第二，语言栈是 Python，且绑死了 Anthropic 的接口形态。** 仓库里 Python 约 94.5 万字节、TypeScript 约 39 万（课程站），没有 Go 也没有 Java 版本。`tool_use` / `tool_result` 这套消息结构是课程的地基，换一家 provider 就得先改协议层，s01 那 12 行也要跟着改。好在机制本身是语言无关的，照着翻译不费劲，只是得自己翻。

**第三，版本在迁移中，编号容易串。** 仓库没有 Release，只有 commit，51 个 open issue。课程从 12 节扩到 17 节，根目录的 `s01`–`s17` 是正典，`docs/` 和 `agents/` 里还留着旧的 12 节，两套编号并不对应——旧 s03 是新的 s05，旧 s06 是新的 s08。搜到旧文章按编号去对，一定会对错。读之前先确认自己看的是根目录那套。

**第四，跑课要真花钱。** 每节都要实际调模型，s13、s15 这种多 agent 的课一轮下来 token 不少。想省钱可以先只读 README 和 `code.py` ，理解机制了再挑两三节跑。

## 结尾判断

这 79.6k Star 不是给代码的，是给这套拆法的。绝大多数 agent 教程教你调 API，这门课教你"为什么这样搭"。它最大的贡献是把 Claude Code 从一个不可拆的黑盒，变成十七个可以单独拿出来复用的设计决定。

读法建议：别 clone 下来跑一遍就完。每节课读完问自己一句——"如果我要在自己的项目里加这个机制，最小改动是什么"，然后去改自己的代码，比抄它的 `code.py` 有用得多。s01 到 s04 所有人都该读，那是骨架；s05 到 s09 写业务 agent 的必读；s10 到 s17 只对要做多 agent 平台的人必要，但 s17 那节课的"目标闸门"思路，值得任何人抄走。

一句话：**循环不变，harness 万变。**

## 项目地址

仓库：https://github.com/shareAI-lab/learn-claude-code  
课程站：https://learn.shareai.run  
同门项目：Kode CLI（https://github.com/shareAI-lab/Kode-CLI）、Kode Agent SDK（https://github.com/shareAI-lab/kode-agent-sdk）

## 参考资料

*   • shareAI-lab/learn-claude-code 仓库 README（采集于 2026-10-30，Commit 7226f55）
    
*   • 仓库 `s01_agent_loop/` 至 `s17_goal_loop/` 各章 README.md 与 code.py
    
*   • 课程站 https://learn.shareai.run
    
*   • GitHub 仓库主页截图（图 1，https://github.com/shareAI-lab/learn-claude-code）
