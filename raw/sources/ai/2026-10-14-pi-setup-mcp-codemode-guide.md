---
title: Pi Agent 入门指南：安装 + MCP + Codemode（从"只看别人刷屏"到"自己跑通"）
source: 宇辰AI编程（微信公众号）
source_url: https://mp.weixin.qq.com/s/k0SlcxzvHf0QMLd8Qa83Bw
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-14-pi-setup-mcp-codemode-guide.md
---

# Pi Agent 入门指南：安装 + MCP + Codemode（从"只看别人刷屏"到"自己跑通"）

Pi 这两个月刷屏，但说不清它和 Claude Code 比有什么不一样、自己该不该装？接了三四个 MCP，还没开始干活，工具说明就吃掉一大截上下文？刷屏的 Codemode 到底是什么，网上说要改 `settings.json`，真要改吗？

这篇先讲清 Pi 是什么、适合谁、怎么装，再拿我本机的 3 个 MCP 当例子，把 0.99 新加的 Codemode 从开关到选档讲一遍。我是宇辰，关注「宇辰AI编程」，跟着做完，你的 Pi 能接上 MCP，也知道每个 MCP 该用哪一档。

> 先说结论：
>
> **接了 MCP，Codemode 就自动开了**，不用改 `settings.json`。刷屏的 `"+codemode"` 只在没接 MCP、又想单独用 Codemode 时才需要。
>
> **它稳定省的是工具说明**：MCP 工具不再逐个塞进模型的工具列表，改成模型写脚本去调。我这 3 个 MCP、11 个工具，每次请求的固定开销从 12,878 降到 6,956 token。
>
> **单次任务省不省，看 MCP 的返回格式**：brave 搜索返回的是一堆 JSON 文本，模型得先猜结构。同一个任务，少的 2.1 万、多的 12.3 万 token。

## 目录

• 01｜Pi 是什么（4 个工具起步，适合谁）

• 02｜0.99 更新了什么（5 条）

• 03｜接 MCP（HTTP、npx、本地程序各一个）

• 04｜Codemode 是什么、怎么开（不用改配置）

• 05｜一个例子看懂 Codemode（猜了五次才写对）

• 06｜哪个 MCP 用哪一档（五档，按用法选）

• 07｜上手后的 5 个习惯（都是自带功能）

• 08｜踩坑

实测环境：macOS，Pi 0.99.1，模型用 GLM-5.3 和 GPT-5.5（都走 magpie 网关），MCP 是 context7、brave-search、magpie-image 三个。

* * *

## 01｜Pi 是什么（4 个工具起步，适合谁）

**Pi** 是一个极简、能自己加功能的终端 AI 编程 agent。作者 Mario Zechner（libGDX 游戏框架的作者），仓库 `earendil-works/pi`，MIT 协议，9 月 30 日 11.1 万星。

它和 Claude Code 最大的不同是默认给得少：工具只有 4 个，系统提示很短，其余全靠你装。几个基本件：

• **默认 4 个工具**：read、bash、edit、write。grep、find、ls 也有，默认不开，要在 `defaultTools` 里加。

• **五种用法**：交互模式、`pi -p` 打印模式、`--mode json` 事件流、`--mode rpc`、TypeScript SDK，底下是同一套 agent 和会话。

• **会话是一棵树**：每条消息都记着父节点，可以从任意一步分叉，也能 fork 成新会话。压缩只影响之后的请求，原记录还在。

• **扩展和包**：扩展是 TypeScript 模块，能加工具、命令、模型供应商。扩展、skill、提示词模板、主题都能打成 Pi 包，用 `pi install npm:<包名>` 装。

• **上下文文件**：全局读 `~/.pi/agent/AGENTS.md`，项目读当前目录和上级目录里的 `AGENTS.md`，`CLAUDE.md` 也认。

### 适合谁、不适合谁

适合三种人：

• **想自己拼 agent 的**：工具、命令、模型供应商都能用扩展加，不喜欢的也能关。我装了子 agent、定时循环这几个扩展，启动页里能看到。

• **在意上下文和 token 的**：会话树、`!!`、Codemode 管的都是"什么进上下文"，每一步花了多少看得清。

• **手里有好几家模型的**：一个会话里随时切，国产模型、中转站、本地模型都能接。

不适合两种人：

• **想开箱即用的**：Claude Code 里现成的子 agent、定时任务，在 Pi 里得自己挑扩展装。

• **要每一步都确认才放心的**：Pi 调工具前默认不问你，也没有内置沙箱，权限就是启动它的那个系统用户。官方文档的建议是放进容器或虚拟机里跑。

我自己是 Claude Code 当主力，Pi 挂在 magpie 上跑国产模型，两个一起用。已经在用 Claude Code 的，不用急着换，先把 Pi 当第二个 agent 装上试。

安装：

```
# macOS / Linux 一行装curl -fsSL https://pi.dev/install.sh | sh# 或者用 npm，要 Node 22.19 以上npm install -g --ignore-scripts \  @earendil-works/pi-coding-agent# 进项目目录启动，再 /login 接模型cd your-project && pi
```

我没走 `/login`：实测用的 GLM-5.3 和 GPT-5.5 都是通过 magpie 网关接进来的，做法见上一篇 magpie 实测。

0.99 起启动页换成了 Pi 的 logo 加版本号

* * *

## 02｜0.99 更新了什么（5 条）

9 月 30 日凌晨（北京时间），Pi 发了 v0.99.0，当天又补了 0.99.1。上一版是 0.87.1，中间的版本号直接跳过。更新日志里的 5 条新功能：

• **Codemode + 内置 MCP**：这篇的主角，03 到 06 节展开。

• **system 主题**：颜色跟着终端走，终端切明暗，Pi 自动重建配色。现在是默认主题。

• **用 ChatGPT 订阅登录**：`/login openai` 选 Sign in with ChatGPT，用订阅额度调 OpenAI 模型。

• **虚拟模型**：扩展可以按每次请求把活分给不同的真实模型，`/session` 里按真实模型分开记费用。

• **分类模型**：Codemode 脚本里能调分类模型（比如 Jev），做"这条消息属于哪一类"的判断。

Pi 以前明确不做 MCP，官网写着「No MCP」。作者去年 11 月写博客算过账：Playwright MCP 有 21 个工具，光工具说明就 1.37 万 token，每次请求都要带上。0.99 把 MCP 做进了核心，但换了个接法：MCP 工具默认不直接给模型，藏在 Codemode 后面。官网那行字现在被划掉了，后面跟着 Now with MCP+Codemode。

这个功能是 Armin Ronacher 提的 PR #10040。他是 Flask 的作者，Pi 仓库提交数第二多的人。

* * *

## 03｜接 MCP（HTTP、npx、本地程序各一个）

MCP 配置放 `~/.pi/agent/mcp.json`，格式和 Claude Code、Cursor 的 `mcpServers` 一样，那边写好的条目能直接复制过来。我接了三种最常见的：

• **context7**：查各种库的最新文档，远程 HTTP 地址。

• **brave-search**：Brave 搜索，用 `npx` 现拉现跑。

• **magpie-image**：magpie 自带的生图工具，本机一个可执行文件。

不想手写 JSON，用命令加：

```
# HTTP 服务：给个地址就行pi mcp add context7 \  --url https://mcp.context7.com/mcp# npx 起的服务：-- 后面是启动命令pi mcp add brave-search \  --env BRAVE_API_KEY='${BRAVE_API_KEY}' \  -- npx -y @brave/brave-search-mcp-server# 本地程序：写可执行文件的完整路径pi mcp add magpie-image -- \  /Applications/magpie.app/Contents/MacOS/magpie \  mcp image
```

key 用 `${BRAVE_API_KEY}` 引用环境变量，别把真 key 写进文件。加完只是写进了文件，跑一次 `pi mcp list`，它会把每个服务连一遍，打印状态和工具；已经开着的 Pi 会话要 `/reload` 才连得上新加的服务：

```
# 连一遍所有 MCP，打印状态和工具pi mcp list
```

```
context7: connected, 2 tools (codemode, global)magpie-image: connected, 1 tool (codemode, global)brave-search: connected, 8 tools (codemode, global)
```

真实输出每个服务下面还有地址和工具名，太长我删了。注意括号里的 `codemode`：三个服务全是这一档，这是 0.99 的默认值，下一节讲它是什么意思。

会话里敲 `/mcp` 是图形化的管理界面：每个服务的状态、工具数、接法，选中一个能直接改接法、停用、看工具列表，改完自动写回 `mcp.json`。

* * *

## 04｜Codemode 是什么、怎么开（不用改配置）

**Codemode**：模型不再一轮一轮地调工具，而是写一段 JavaScript，在沙箱里调 Pi 的工具（read、bash、MCP 都行），可以并行，结果在脚本里筛完，只把需要的部分交回模型。

容易和它搞混的是 context-mode 扩展，名字像，干的事也有重叠：

普通工具调用

Codemode

context-mode

谁编排

模型一轮调一个

模型写脚本调一串

模型在它的沙箱里跑代码

大结果去哪

整段进上下文

留在脚本里，筛完才进

存进本地索引，按需搜

要不要另装

不用

0.99 内置

`pi install npm:context-mode`

我建议 0.99 起先用内置的 Codemode，context-mode 为什么不急着装，08 节最后一条有实测。

### 怎么开：接了 MCP 就已经开了

网上流传的做法是往 `~/.pi/agent/settings.json` 里加一行 `"defaultTools": ["+codemode"]`。如果你已经接了 MCP，这行不用加。我的 `defaultTools` 里没有 codemode，但只要 MCP 连上，启动时的工具清单里就有它：

```
- read: Read file contents- bash: Execute bash commands ...- edit: Make precise file edits ...- write: Create or overwrite files...- codemode: Run JavaScript that calls  other tools (chains, loops,  Promise.all, filtering large results)
```

原因是 MCP 服务的默认接法就是 `codemode`，Pi 发现有这种服务连上，会自己把 `codemode` 工具打开。对应的做法：

```
// 没接 MCP、也想用：settings.json"defaultTools": ["+codemode"]// 接了 MCP 但不想要：mcp.json 顶层"autoEnableCodemode": false
```

只想这一次用，命令行 `pi --tools read,bash,edit,write,codemode`。`--tools` 是整个替换，要把 4 个默认工具一起列上。

### 两个设置

• **`codemode.mode`**：默认 `on`，内置工具照常直接给模型，只是每个直连工具的描述后面会附一份给脚本用的 TypeScript 声明，08 节第一个坑就出在这。设成 `only`，内置工具也不直接给模型了，全部走脚本调，这一档我没测。

• **`codemode.inlineBudget`**：默认 3000。Codemode 的说明里会列出能调的工具和它们的 TypeScript 声明，这是给这份清单的 token 预算。装不下的工具不列，脚本里用 `searchTools("关键词")` 找。

* * *

## 05｜一个例子看懂 Codemode（猜了五次才写对）

任务是一句话："用 brave 搜 pi coding agent codemode，要 20 条，挑出和 Pi 0.99 Codemode 最相关的 5 条。"

### 写对的脚本长这样

模型摸清 brave 的返回格式之后，写出的脚本是这样的（我加了注释、折了行，还删了一段去 HTML 标签的处理）：

```
// 调 brave，要 20 条const res = await tools  .mcp__brave_search__brave_web_search({    query: "pi coding agent codemode",    count: 20,    result_filter: ["web"],  });// 每个 text 块是一条结果的 JSON 字符串const all = [];for (const c of res.content || []) {try {    const o = JSON.parse(c.text);    // 只留标题、链接、摘要    if (o?.url) all.push({      title: o.title,      url: o.url,      desc: o.description,    });  } catch {}}// 只有这里输出的内容回到模型text(JSON.stringify(all, null, 1));
```

brave 原始返回是 2.7 万多字符，脚本筛完交回模型的是 7,722 字符。同样的搜索要是直接调，结果超过 20KB，Pi 会把中间截掉，模型还得再 `read` 一次临时文件才拿到全文。

### 同一个任务，五次试探

可模型第一次见 brave，不知道它返回什么。同一个任务我跑了几次，有一次 GLM-5.3 是这么走的：

1. `searchTools("brave web search")` 找工具

2\. 猜结果在 `structuredContent.web.results`，拿回空数组

3\. 打印返回对象有哪些键

4\. 再看 `structuredContent`，是空的

5\. 解析第一个 text 块，是一条结果，不是列表

6\. 把所有块逐个解析，数出 19 个块

7\. 这才写出上面那段脚本

7 个脚本、8 轮对话，累计输入 12.3 万 token。同一个任务 GLM-5.3 另外跑的两次，一次 3 个脚本、3.3 万，一次 1 个脚本、2.1 万，差了 6 倍，全看第一次猜得准不准。

原因是 brave 不给结构化字段，19 条结果是 19 段 JSON 文本，模型只能一步步试。多数 MCP 服务返回的都是这种文本，碰上它们，Codemode 省多少全看运气。

我在交互模式里重跑时也是这样，第一个脚本就猜错了：

第一个脚本到 structuredContent 里找结果，拿回 0 条；第二个只好把原始返回打印出来看结构

### 数字：稳定省的是固定开销

每次请求都要带上的工具说明，我用"只回复 OK"这一句话测了五种接法（GLM-5.3，3 个 MCP 共 11 个工具）：

接法

一句话的上下文

不接 MCP

1,453

`deferred`

1,780

`codemode-deferred`

4,170

`codemode`（默认）

6,956

`direct`

12,878

默认的 `codemode` 比全部直连省了将近一半。工具声明有 3000 token 左右的预算（`codemode.inlineBudget`），按这个设计，MCP 接得越多差距应该越大，这一条我没实测。

真实任务就不一定了。两个任务、两个模型，各跑 3 次取中位数，看累计输入：

任务

模型

直连

Codemode

差

brave 搜索

GLM-5.3

54,096

33,171

省 39%

brave 搜索

GPT-5.5

63,279

102,981

多 63%

context7 查文档

GLM-5.3

56,785

52,372

省 8%

context7 查文档

GPT-5.5

67,439

61,507

省 9%

GPT-5.5 每次都要写三四个脚本，brave 上反而更贵。单次任务花多少，看 MCP 的返回格式和模型第一次猜得准不准。

* * *

## 06｜哪个 MCP 用哪一档（五档，按用法选）

每个 MCP 服务可以单独设 `exposure`，五档：

• **`codemode`**（默认）：工具不直接给模型，列在 Codemode 说明里，脚本调。

• **`codemode-deferred`**：连说明里都不列，只写服务名和工具数，脚本用 `searchTools()` 找。

• **`deferred`**：不开 Codemode，模型用 `tool_search` 搜到了才加载，之后直接调。

• **`direct`**：和内置工具一样直接给模型。

• **`hidden`**：注册了但调不了。

还能用 `toolExposure` 给单个工具另设一档，覆盖服务的设置，比如整个服务设 `hidden`，只把要用的一两个工具打开。

我的建议：

• **工具多、常用的**：默认 `codemode`，不用动。

• **工具多、偶尔用的**：跟别的服务一起走 Codemode 的，用 `codemode-deferred`；只有它一个、不想开 Codemode 的，用 `deferred`，05 节那张表里它最省，但模型得先搜一轮才能调。

• **返回大段文档的**（context7）：Codemode 和直连只差 8% 到 9%，保持默认。

* * *

## 07｜上手后的 5 个习惯（都是自带功能）

下面这几个都是 Pi 自带的，装完就能用，管的都是上下文里该放什么：

**会话树**：一件事开一条会话，`/name` 起个以后搜得到的名字。聊着聊着走歪了，`/tree` 回到分叉点换一条枝，不用新开会话再把背景交代一遍；想把某一段拎出去单干，用 `/fork`。

**`!!` 和 `!`**：输入框里 `!git status` 会把命令输出交给模型，`!!git status` 只执行、输出不进上下文。跑构建、翻日志这种你自己看的，用 `!!`。

`!!` 跑过的命令还是会记进会话树（前面 `/tree` 那张图里两条 `[bash]` 都在），只是输出不发给模型。

**主动 `/compact`**：一个阶段做完就压缩，后面可以跟一句说明，比如 `/compact 保留目标、改过的文件、下一步`。别等快满了让它自动压，那时候摘要写什么你管不了。

**上下文文件四件套**：

文件

干什么

放哪

`AGENTS.md`

长期规则，追加

全局或项目目录

`AGENTS.override.md`

替换同目录的 `AGENTS.md`

同上

`SYSTEM.md`

替换 Pi 的系统提示

`~/.pi/agent/` 或 `.pi/`

`APPEND_SYSTEM.md`

往系统提示后面追加

同上

`AGENTS.md` 每次请求都带着，只放长期不变的规则，一次性的交代别往里写。

**流程做成 Skill**：Skill 平时只有名称和描述进上下文，用到才加载全文。反复做的流程，做完一次就让 Pi "把刚才这套整理成一个 Skill"。

* * *

## 08｜踩坑

**别把整个 brave 设成 `direct`。** Codemode 开着时，`direct` 的工具描述后面还会附一份给脚本用的 TypeScript 声明，brave 的声明比描述本身长得多。我把 brave 整个设成 direct，一句话的固定开销涨到 37,922：`brave_place_search` 的描述本来 1,390 个字符，加上声明成了 63,805。工具多的服务要直连，用 `toolExposure` 只放一两个。

**npx 起的 MCP 启动慢，工具会消失。** 会话的第一条消息最多等 MCP 连接 10 秒，没连上的服务，这一轮模型看不到。我有一次 brave 没赶上，模型不知道有 brave，自己去爬 Brave 网页被拦、换了 5 种浏览器指纹、再换 DuckDuckGo，20 轮、251 秒才交差。绕法：用之前 `pi mcp list` 看一眼都连上了没有。嫌 `npx -y` 每次现拉慢，可以把常用的 MCP 全局装好，`command` 直接写可执行文件，这样能快多少我没测。

**直接调 MCP，结果超过 20KB 会被截掉中间。** 模型拿到的是头尾加一个"截掉 N 个字符"的标记，全文存在临时文件里，要再 `read` 一次。Codemode 脚本里拿到的是完整结果。

**`--tools` 不认 `+codemode`。** `+` 和 `-` 只在 `settings.json` 的 `defaultTools` 里有效，命令行要把 read、bash、edit、write 一起列上。

**装过 `pi-mcp-adapter` 的，内置 MCP 不生效。** 这类扩展注册了 `/mcp` 命令，会接管 MCP，Pi 就不读 `mcp.json` 了。先删掉它。

**context-mode 别照它 README 里 Pi 那一节的第一步 `npm install -g`。** 它的安装脚本会往 `~/.claude/settings.json` 里写 `enabledPlugins`，你要是也在用 Claude Code，配置会被动到。给 Pi 用，我只跑了这一步：

```
# 只装进 Pi，不碰别的 agentpi install npm:context-mode
```

它一装，每次请求的固定开销多 8.4K token，和 3 个 MCP 一起开时多 10.7K。两个任务我各跑了一次，装上它之后累计输入全都更高：GLM-5.3 搜 brave 从 3.3 万到 7.4 万，GPT-5.5 从 10.3 万到 18.4 万（各只跑了一次，当个参考）。0.99 有了 Codemode，只图"在沙箱里跑脚本、大结果不进上下文"的话，不用再装它；它的跨会话记忆我这次没测。

* * *

我是宇辰，如果这篇对你有帮助，关注「宇辰AI编程」，我会继续更新同主题的实战教程。加我的 AI 编程交流群一起聊：后台回复「交流群」即可加入。
