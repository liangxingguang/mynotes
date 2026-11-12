---
title: 我给 pi 做了一个交接工具，后来它长成了一张网络
source: 知乎
source_url: https://zhuanlan.zhihu.com/p/2097748041361012308
source_type: article
platform: 知乎
captured: 2026-11-12
registered_at: 2026-11-12
inbox_ref: Inbox/2026-11-12-pi-xfer-handoff-network.md
asset_ref: Assets/2026/11/pi-xfer-handoff-network.md
---

# 我给 pi 做了一个交接工具，后来它长成了一张网络

[pi.dev](https://pi.dev/) 首页上挂着这句话：

> There are many agent harnesses but this one is yours.

我已经是深度沉迷使用 pi agent，在我上一篇文章中提到的 IndyDevDan 的 Pi-to-Pi 协议启发下，我实现并按照自己的使用场景扩展，逐渐变成了我日常使用频率很高的一个插件。

现在将其独立开源出来，这是我的 harness 方案，希望也是你要找的那个。

### 引子

现在已经不是 ChatGPT 刚出来那会儿了：我们从提示词工程，走到现在的 harness 工程乃至 loop/graph 工程，其中 agent 的上下文管理变得尤其重要。

本来一个窗口对应一个问题。聊着聊着，方案设计、实现、验证、中途冒出来的新问题，全挤进来。它不再是"一个问题的容器"，变成了"多个问题共用的一个池子"，这就出现了所谓的上下文腐坏（context rot）。

不同阶段的需求混在一起——早期为了探查写下的代码、后来被推翻的方案，即使你的模型上下文还撑得住，无关的信息也会一直留在那里干扰判断。

Agent 时代真正的瓶颈不是模型能力，是**上下文卫生**。

解决它的常规思路是压缩：summary、compaction、子代理，本质都是"把池子里的水重新澄清一遍"。但另一个思路是根本不让一个窗口变成池子——把不同阶段的任务交给不同的 agent，每个窗口保持干净。这要求 agent 之间能交接：不是把聊天记录复制粘贴过去，而是像人类同事一样，准备一份材料，做一个正式的交接。

pi-xfer 就是为这个做的：我想让 agent 之间可以沟通和接力。

### Quick Look

为了快速理解这个插件能做什么，我让 AI 画了一张图。

**图 1｜整体功能架构全景**

![Image 1](https://pica.zhimg.com/v2-251dae9b7f8ef8e14999884e99ee27da_1440w.jpg)

可以看到，我这个插件主要解决的就是让 Agent 之间可以沟通的问题，它不仅解决本地机器上 Agent 之间的沟通问题，它也能实现跨机通讯，并且我提供了一个入口，允许外部的 Agent 比如 Cursor 接入。

### 基本思想

可以类比一下我们工作之中的交接，一般交接并不只是你来我往的对话，而是会准备一些资料作为准备，再跟对方做一个交接的动作。

展开来看一份 handoff 内容。它就是一段 Markdown，但真正的交付物是两部分：投递时消息体里只带 header 字段（target / kind / summary），正文则落成一份文档写到接收方的 `$TMPDIR/pi-xfer-<msg_id>.md`，通知里附上这个路径。

拿一个真实场景感受一下——我在 A 会话（alpha）里调一个偶现的登录超时，排查到一半发现根因大概率在 B 会话（beta）昨天改过的那段 token 刷新逻辑里，于是让 alpha 给 beta 发了一份 handoff。beta 那边收到的通知长这样：

```
📨 [Xfer from **alpha**]

**Handoff**: `xf_01j...` — kind: task

**Request**: login 超时偶现，疑似与你昨天的 token 刷新改动有关，请确认

**Doc**: `/tmp/pi-xfer-xf_01j...md`
Read the doc and handle the request.

This handoff is a **Task**: it asks you for output. Send exactly one reverse
handoff to `alpha` once you have a conclusion...
```

这份通知里没有正文。beta 只拿到了三样东西：谁发来的、kind 是什么、一句话 summary，外加一份落在 `$TMPDIR` 里的文档路径。这和 skill 的渐进式加载是一个思路：按需加载——beta 先读协议文本判断要不要接，决定接了才打开那份文档展开读正文。

Doc 中的这份文本，才是交接的内容：

```
## Context
线上 login 接口 P99 从 800ms 涨到 4s，只有 token 即将过期的请求命中。
我这边已经排除了网关和 DB，复现脚本在 `fixtures/login-timeout.ts`。

## Problem
需要确认是不是 #482 那次 token 刷新重构引入的竞态。

## Requirements
1. 读一下复现脚本，跑通复现
2. 给出结论：是/不是这次改动引入，如果是，给出修复建议
3. 结论以 handoff 发回给 alpha
```

### xfer 网络

上面讲的是"一份交接的内容长什么样"。接下来换个视角：pi-xfer 本身也是一张网络，这张网络上可以有不同形态的参与方——一个本机的 pi 会话、一个跑在 Cursor 里的 agent、一个机器人、一个浏览器页面、甚至另一台机器上的 agent。它们各自用不同的方式接进来，但说的是同一套话。

> 顺便聊下插件名字的来源：**xfer 就是 transfer 的缩写**，去掉几个元音，剩下 xfer——插件传递就是意图化的文本 prompt

我们先从最基本的本地通讯说起。

### 本地 pi agent

最基准的形态，装上插件就有。pi 启动时在 `~/.pi/xfer/` 下挂一个 unix socket，文件名就是它的名字（`alpha.sock`）。这里没有发明什么新东西，用的就是 unix socket 本身的管道能力：往一个文件里写，另一端就读到了。所以装了这个插件之后，每一个启动的会话天然就能互相通信，不需要事先做任何连接动作。

我日常使用中常用两个命令：

*   `/xfer list` 看谁在线
*   `/xfer gc` 收拾掉死掉的 sock

**图 2｜本地通讯**

![Image 2](https://pica.zhimg.com/v2-251dae9b7f8ef8e14999884e99ee27da_1440w.jpg)

这是最简单、最直接的一层。后面都是在这个本地的基础上往外长出来的用法——换句话说，我在这个网络中塞入了其他的参与角色。

### 其他 Agent Host：adapterd

本地这一层目前只在 pi 之间用，不过呢，日常工作中还有 Cursor、codex 这些 code agent 要用，它们明明就在同一台机器上，却进不来这个 xfer 网络中，那我有时候需要进行信息交接，就挺麻烦的。于是得想个办法：让别的 agent 也能被"投递过去"。

我的做法是这样的——让其他 Agent 长得像一个 pi-xfer 本地节点就行了：

*   host（这里指的是接进来的不同 Agent，如 Cursor）起一个本地 daemon 进程，占住一个本地 socket，说的话和本地插件完全一样，对外它就是网络里一个正常的、可以被投递的成员。
*   消息进来之后沉到一个本地收件箱文件（inbox）里，这里 host 自己主动通过 skill 去收件。除了收件需要主动外，它在网络里的身份，跟一个 pi 会话没有任何区别。

这套东西后来被抽象成两件产物：一个 `xfer-adapterd` 的 daemon，配一份 skill 一起装进目标目录。结果是给一份安装文档，任何 agent 都能参与进来——把同一份安装指南给不同的 host，让他们自己去看怎么安装就行。

> 这里之所以增加一个收件箱的概念，是因为除了 pi agent 之外，这些 agent 缺乏主动响应外部消息的能力，所以需要一个概念，把别人发过来的消息存下来。

### 浏览器：Web Picker

既然其他的Agent接入进来了，我本职工作大量都是在页面上进行调试和开发，于是我又在琢磨怎么让页面上的信息更好地传递给 agent。

最开始的时候，我没有考虑接到我们这个 xfer 网络，我是通过 agent 启动一个 CDP Chrome 实例，然后在里面登录了我们的开发应用，然后在里面给出一些指令，让它去按要求调整页面，效果说实话非常不好。语言的精准度很大程度上制约了它的执行效果，如今我把它总结为：信息指向性差，这是 agent 用浏览器的根本问题所在。

所以那不如反过来：**以人为中心，由人来筛选**。不靠自然语言去指，而是用 CSS 选择器、XPath 这种精确的方式定位到具体元素——人主动往 agent 的上下文里灌数据，而不是让 agent 自己去长一双发现的眼睛。其实在 Cursor 的 agent view 中，有一个 Annotate 功能，思路是一样的。

**图 3｜Cursor 的 Annotate 功能**

![Image 3](https://pic3.zhimg.com/v2-69fabd600d075d9062b838492ffc0c2_1440w.jpg)

我先通过 Chrome 选取元素，手动地把这条路线跑通了，接下来就是把它用代码做成功能了：

> 机制是 Tampermonkey 脚本加一个本地 broker（负责把浏览器作为一方接入到我们这个网络中）。悬停选中元素、加一句自己的注释（Pick），或者开一段录制、记下操作过程（Record），提交之后 broker 把内容渲染成一份 handoff，投递给目标 xfer 节点背后的 agent 会话处理。

**图 4｜Web Picker：人把页面上的东西灌进 agent 的上下文**

![Image 4](https://pic2.zhimg.com/v2-68fc455af9dac63bd8815074add33b4d_1440w.jpg)

图里是两种 Marker 并行的两条路：

*   Pick 走空间，一个元素加一句你的注释，选择器就是它的坐标；Record 走时间，一段操作加同窗口的 console 与 network 切片，时间轴就是它的坐标。它们最后都由 broker 写成一份 handoff 文档，再投进目标的 xfer 节点，背后的 agent 它就会着手处理。
*   右下那条虚线是反方向的：目的是解决有些信息在单次传递中还是不够，Agent 可以自己着手去补充，agent 接手之后可以 `page.request` 让 broker 回到页面上按选择器精确回查。

### 另一台机器：从一条隧道到一个网络

我们前面的功能增强，全都假设参与方是同一台机器上的不同进程。随着使用的加深，确实会存在跨机器的场景，再加上现在 durable agent 的概念兴起，确实需要存在云上，甚至跨机场景的使用了，我需要考虑到怎么让不同机器的 agent 可以关联起来。

但是一旦跨机器，先不论用什么方式投递信息，首先会撞上一个很具体的麻烦：文档落在本机的 `$TMPDIR` 里，这个路径递过去，对方打不开。所以跨机传输时文档一律内联进消息帧，为此这里做了个取舍，取消了前面引用式的一套设计，让所有消息都在消息帧里完整展示。

目前支持了两种方式来支持跨机器的通讯，其中一个功能我称之为 **SSH Link**。

ssh 是我日常工作中高频使用的工具，本身就自带认证、加密和 socket 转发，于是可以把一个远程的 socket 映射到本地，那不就和本地通讯是基本上一样的吗：

*   `/xfer ssh in <host>` 起一个 ssh 进程，`-L` 把远端节点引进来，`-R` 把本机推出去，同一个进程、同一条命令，所以**一条 Link 天生双向**，只要是 ssh 可达的 unix 主机，工作起来很完美。

**图 5｜SSH Link：一条 ssh 进程，双向通路**

![Image 5](https://pic3.zhimg.com/v2-04ed2d113429966887c3801dd9740ca6_1440w.jpg)

理解起来也简单：把远程目标的 socket 链到本地、把本机的 socket 链到远端，一次转发就把两边接上了。

不过 SSH 这种方式，再怎么说也只能适用于 unix 类的机器，扩展性是有限的，于是我研究了一下 actor 架构和 rivetkit 框架，我发现，在 actor 架构设计中，actor 设计上就应该是各自独立，并且希望通过消息的方式互相通讯，不允许共享内存之类的设计。简直是天然适合我这套 xfer 网络，所以我加了一个新的远程功能 **Mesh**：

**Mesh** 是一台常驻引擎（RivetKit），每个会话在引擎上注册成一个 actor，名字唯一；发交接由引擎路由到对方，对方不在线就进他的持久队列，等他下次上线再接受和处理。

**图 6｜Mesh 通讯**

![Image 6](https://pic3.zhimg.com/v2-eeccd6a593f4d55a0dbc3903a4381b1e_1440w.jpg)

Mesh 的原理其实就是把我们的 xfer 节点，接入到了一个 actor 架构网络中，利用 rivetkit 本身就是一套 actor 架构实现，所以我在通过桥接这个技术，实现了更加具备泛用性的跨机通讯。

这套方法，因为泛用性非常强，其实并不限于 xfer 网络的节点，它也能加入会休眠的节点——目前我在研究 pi durable，在最小可行性上已经验证了，可以在 Cloudflare 上搭一个小的 serverless 节点，它同样能在这个网络中进行通讯。

### 其他

这个插件还有一些功能，会在日常生活中也有一定的作用。我在这里就简单罗列一下。

*   board：就是维护了一个本地全局的文件看板，通过遵循黑板模式的思路，让不同项目在同一个看板上记录下自己的一些 finding，我主要的使用场景是在跨项目多仓库中，最后由一个统一的引擎读完，给我一份跨项目的端到端总结。
*   admin：就是一套 Web 版本的管理界面，目前还比较粗糙和丑陋，主要用于一些日志、一些管理和快速查看的功能。
*   MCP client：这个其实是 adapterd 机制的一个微小的扩展，目前只是实现了，还没找到特别好的应用场景，就是允许任意 Agent 以 client 身份查询我们这个网络，并且发出指令，但是它本身并不是这个网络可反向到达的一个节点。

### 结语

说了这么多关于我这个插件的功能，如果你觉得也有用的话，欢迎试用和反馈。除了我这个工具之外，我也欢迎你去体验其他的一些工具。我在实现中尝试进行一些对比。如果你觉得我的不适合你，你也可以尝试这些工具：

*   [pi-intercom](https://github.com/nicobailon/pi-intercom)：pi-subagents 等众多 pi 知名扩展的作者，也是 pi 核心贡献者之一，他的这个工具是本地起一个 broker 让所有的 pi 进程都可以在其中进行通讯
*   [Reason Network](https://reasonmachines.com/network)：泛用性挺强的 agent 组网工具，它直接支持众多常用的 Code Agent 的工具，如果你日常使用的主要工具不是 pi，那可以试试这个。

感谢开发的 [archify](https://github.com/tt-a1i/archify)，本文及仓库中的精美的演示图都是依靠 archify 制作生成的。

### 相关链接

*   仓库：`https://github.com/azzgo/pi-xfer`
*   安装：`pi install npm:pi-xfer`
*   快速上手：`docs/guides/quickstart.md`
*   演示视频（76 秒，两个真实会话互发 handoff）：B 站[Intro： pi-xfer](https://www.bilibili.com/video/BV1oQWc6fEn9) / YouTube [Intro： pi-xfer](https://youtu.be/0mm2CirJMUo)
*   前作：《Pi Agent：一把你完全掌控的手术刀》`https://zhuanlan.zhihu.com/p/2059648027586045590`
*   handoff skill（设计参考）：`https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md`
*   BrowserSkill（Web picker 协议设计参考）：`https://github.com/Tencent/BrowserSkill`
*   安装指南（agent host 接入）：`https://github.com/azzgo/pi-xfer/blob/main/docs/guides/agent-host-setup.md`
