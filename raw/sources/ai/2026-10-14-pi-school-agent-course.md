---
title: 这门免费课表面在教 Pi，其实在教你 Agent 到底怎么工作
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/D6stDyVwJJXG4j4LI-x0Og
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-14-pi-school-agent-course.md
---

# 这门免费课表面在教 Pi，其实在教你 Agent 到底怎么工作

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

最近看到一门挺特别的 Agent 课程。

一共 15 节，免费。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

最有意思的不是内容，是上课方式：第一节你把 Pi 装好，从第二节开始，老师就是 Pi 自己。

网站每节课只给你一段提示。复制给 Pi，后面的讲解和操作，都由它带着你走。

你不是先学会 Agent 再去用，而是在用的过程中，把它学会的。

我看完以后，反而觉得它更像一门 Agent 入门课，只不过 Pi 被拿来当了教材。

## 一、 为什么 Pi 适合拿来学 Agent

因为它足够简单。

Pi 默认只给模型几个最基本的能力：读文件、改文件、跑命令。

东西越少，你越容易看清哪一步是模型在判断、哪一步是 Agent 在执行。

Pi 最近吸引人，可能跟这份简单也有关系。我身边就有几个朋友，放弃 OpenClaw 和 Hermes Agent 之后，转到了 Pi。

## 二、 我把 15 节课压成了三个问题

## 2.1 Agent 怎么真正进入工作环境？

Agent 不是接上模型就完了。

真放进工作里，还要解决几件事：用什么模型、在哪个项目干活、守哪些规则、能给多大权限。

我挺喜欢一个细节：课程连某些登录方式可能违反服务条款、有封号风险，都会提前提醒。

它教的是怎么把 Agent 放进工作里，连上只是第一步。

## 2.2 Agent 为什么聊久了反而会跑偏？

这是全课我觉得最值得看的部分。

很多人都遇到过：Agent 刚开始挺聪明，聊久了开始跑偏。

多半不是模型突然变笨，是它眼前那堆上下文乱了。

Agent 看到的不只是你输入的话。它读过的文件、命令输出、工具结果、自己之前的回复，全都堆在里面。

东西越堆越多，系统就会把前面的内容压成摘要。摘要毕竟不是原文，压得多了，细节就容易丢。

课程给的建议很朴素：任务换了就开新会话，别动不动就压缩。真要压，就告诉它什么信息最重要。

Pi 还有一个我很喜欢的设计：它把一段对话看成一棵树，不是一条直线。

走错了，可以退回某个节点重新走一条路，而且原来的尝试还在。

对程序员来说，有点像版本控制。普通用户可以简单理解成：给一段对话留了几个存档点。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

课程里还有一句建议，我非常认同。当 Agent 进入这种循环：

```
犯错 → 你纠正 → 它更错
```

别再继续补 prompt 了。开个新会话，或者退回问题发生之前，往往更有效。

## 2.3 Agent 的能力，为什么要最后再加？

前面都跑顺以后，课程才开始给 Agent 加"外挂"。

Skill 像给 Agent 一份 SOP，MCP 是给它接外部系统，Extension 则是直接改它自己。这些名词不用急着记。

该记住的是顺序：先把系统做简单，真的需要时，再增加复杂度。

## 三、 我最喜欢的，是它在纠正一个习惯

整门课一直在提醒你：少告诉 Agent 怎么做，多告诉它你到底要什么。

比如你想让 Agent 熟悉一个新项目，不需要先去找什么"初始化命令"。

直接跟它说：先看看这个项目，帮我整理一份项目说明。

它自己想办法。

这事看着小，背后的变化不小。我自己最近用 Claude Code、Codex，也越来越有这个感觉。

过去学软件，先记按钮在哪；Agent 时代，更要紧的是把目标说清楚。

## 四、 不用 Pi，这几件事也一样值得学

课程后面还有 11 个练习，做网站、控制浏览器、整理邮件、处理图片视频都有。

所以我更愿意把它看成一门"让 Agent 在电脑上干活"的入门课，而不只是 Coding Agent 教程。

如果完全不习惯终端，开始会有一点门槛。但不用为了打卡学完 15 节，前半段讲模型、上下文、会话和分支的部分，已经很值。

Claude Code、Codex、Pi，Agent 工具以后肯定还会换。

真正值得学的，是上下文怎么管、工具什么时候加、走错以后怎么退回来，以及什么时候该放手让 Agent 自己解决。

这门课表面上教 Pi，其实是在教你 Agent 到底怎么工作。

教程：https://pi-school.ziki.boo/
