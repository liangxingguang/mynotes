---
title: 从 Claude Code 搬到 Pi：我装了这 6 个扩展，把熟悉的体验补了回来
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/hniMbQDpHgbzuNQGTYJ3rA
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-20
inbox_ref: Inbox/2026-10-14-claude-code-to-pi-6-extensions.md
---

从 Claude Code 搬到 Pi

我装了这 6 个扩展，把熟悉的体验补了回来

一个 Claude Code 老用户的三周迁移实录。  
高傲C厂不让用，那我就用他 PI。

![封面](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

我用了半年多的 Claude Code，说实话的确好用，人狠话不多，干活嘎嘎猛。我MCP 配置攒了七八个 server，TodoWrite 的待办清单每天开着，子代理审查代码是我的固定动作。无奈反复注册反复封！只能另寻他路。

当第一次打开 Pi 的时候，我差点直接退出。

read、write、edit、bash——工具列表只有四行，没有 MCP，没有子代理，没有待办，什么都没有。

但用了三周之后，我把日常工作流整体搬了过来。原因很简单：**Pi 是毛坯房，但它的扩展目录里躺着 5000+ 个包**，Claude Code 里让我最舒服的那些能力，几乎都能一个命令装回来——而且配置还能直接搬。

这篇文章按我迁移的顺序，讲清这 6 个扩展分别把 Claude Code 里的哪个习惯补了回来。

每一条都附安装命令，Claude Code 老用户可以直接抄作业。

· · ·

01pi-mcp-adapter

我的 MCP 配置，原封不动搬了过来

![pi-mcp-adapter](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的原生 MCP + .mcp.json

我在 Claude Code 里第一步永远是配 MCP。装完 pi-mcp-adapter 跑一句 `/mcp setup`，它把我在 Claude Code 里攒的 MCP 配置**一键导入**——`.mcp.json` 本身也是直接读的，零迁移成本。

而且它比原版更省：用一个约 200 token 的代理工具替代成百上千个工具定义，server 只在真正被调用时才启动。

以前在 Claude Code 里连几个 server，上下文先烧掉几万 token；现在这个问题没了。

$ pi install npm:pi-mcp-adapter

**一句话总结：**月下载约 76 万，全生态第一。Claude Code 老用户迁移的第一步，装它就对了。

· · ·

02pi-web-access

WebSearch + WebFetch，一次装齐还加了量

![pi-web-access](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的 WebSearch / WebFetch

这两个是我原来用得最多的工具，查报错、翻文档全靠它们。

pi-web-access 不但补齐了，还加了量：Web 搜索支持 20+ 服务商（内置 Exa 免 API key 起步），URL 抓取、GitHub 克隆、PDF 提取用法和 WebFetch 几乎一样。

最惊喜的是 **YouTube 视频和本地录屏也能理解**——这是 Claude Code 里没有的。

$ pi install npm:pi-web-access

**我的真实用法：**把一篇几十页的框架文档链接丢给它，一句「提炼实现要点，对比我项目里的用法」，和原来在 Claude Code 里的工作流完全一致。月下载约 40 万。

· · ·

03pi-subagents

Task 子代理回来了，还是熟悉的大白话派活

![pi-subagents](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的 Task 子代理与并行任务

在 Claude Code 里，「派个 reviewer 审 diff」是我的肌肉记忆。

Pi 为了极简砍掉了子代理，而 pi-subagents 用最自然的方式装了回来——直接说 **“Use reviewer to review this diff.”**，或者 **“Ask oracle for a second opinion on my current plan.”** 让它挑战我的方案。

前台实时流式输出，后台跑完再取结果；还能一句话并行三个角色：查正确性、查测试、查过度设计。

$ pi install npm:pi-subagents

**一句话总结：**月下载约 36 万。装上它的那一刻，Claude Code 的多代理工作流就完整回来了。

· · ·

04rpiv-ask-user-question

那个选项式提问，也搬过来了

![rpiv-ask-user-question](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的 AskUserQuestion

Claude Code 里我最欣赏的设计之一，是需求不清时它先弹出选项让我确认，而不是硬猜。

pi 上的这个扩展做到了同款体验：选择、确认、输入都是类型化选项，回答成本极低。它先花 10 秒把关键决策问清楚，再动手干活。

$ pi install npm:@juicesharp/rpiv-ask-user-question

**体感变化：**这是六个扩展里体感最接近原生的——装上之后 Pi「靠谱」了很多，返工明显变少。月下载约 12 万。

· · ·

05rpiv-todo

TodoWrite 的待办清单，还更抗造了

![rpiv-todo](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的 TodoWrite / TodoRead

我原来每天开着那份待办清单看进度。

rpiv-todo 做到了同款：模型维护的待办以实时浮层常驻终端，干了什么、还剩几步一目了然。

甚至比原版更抗造——`/reload` 和上下文压缩之后它**依然存活**，长任务跑一半也不会丢进度。

$ pi install npm:@juicesharp/rpiv-todo

**一句话总结：**月下载约 10 万。多步骤重构、迁移、写系列文章，全靠它兜底。

· · ·

06pi-lens

写完就查的即时反馈，接上了

![pi-lens](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

≈ Claude Code 的内置诊断与写完自检

在 Claude Code 里写完代码，错误很快就能暴露，这一点我习惯了。

pi-lens 把它接住了：每次写入 / 编辑之后，自动跑 LSP 诊断、lint、类型检查和格式化，有问题当场反馈，还能 autofix。

基于 ast-grep / tree-sitter 的结构性规则能抓安全隐患。`/lens-map` 能生成交互式 HTML 依赖图，诊断结果可标记误报 / 忽略 / 延期，跨会话生效。

$ pi install npm:pi-lens

**一句话总结：**月下载约 6 万。TypeScript、Python、Go 等强类型项目的日常开发，装它基本无感切换。

· · ·

迁移速查：配置怎么搬、命令怎么敲

![命令速查](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

给 Claude Code 老用户划三个重点：

**搬 MCP**  
装好 pi-mcp-adapter 后跑 `/mcp setup`，Claude Code 里的 MCP 配置一键导入。

**搬资产**  
开源的 pi-cc-plugins 能把 Claude Code 插件仓里的 skills、agents、MCP 配置扫描并转换成 Pi 原生格式（agents 会转成 pi-subagents 可识别的角色）。

**日常四条命令**  
`pi install` 安装 · `pi -e` 临时试用不落盘 · `pi list` 查看 · `pi remove` 卸载；`pi update --all` 批量更新，装完 `/restart` 生效。

**三条原则**（比在 Claude Code 里更重要，因为 Pi 的生态是自装的）：

01**按需安装**——扩展越多，上下文负担和安全隐患越多，装完就忘了它存在才是好扩展。

02**只信可信源**——扩展以你的完整系统权限运行，装之前扫一眼源码，项目级扩展要在信任项目后才加载。

03**善用 `pi -e` 试用**——不确定要不要留？临时跑一次，不落盘，用完即弃。

迁移三周后的结论：**Pi 没有想取代 Claude Code，它只是把「能力清单」这个决定权交还给了你。**

而这 6 个扩展装完，我原来在 Claude Code 里的肌肉记忆，一个都没有丢。

参考：Pi 官方文档（pi.dev/docs）、npm 官方仓库各扩展 README；下载量为 2026 年 8 月 npm 月度数据。
