---
title: 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/uZrIlXZMq8Rz8cYRN1J5sQ"
source_type: link
platform: 微信
captured: 2026-10-17
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-17-pi-custom-agent-setup.md
asset_ref: Assets/2026/10/pi-custom-agent-setup.md
---

# 用 Pi 搭一个自己的 Agent：Skills、Extensions、Subagents 和定时任务

Pi\[1\] 是 Mario Zechner 写的一个极简 coding agent，也是 OpenClaw 的内核。上一篇译文\[2\]讲了它为什么要保持简单，这篇动手搭一套自己用的配置。

Pi 默认只给你 `read`、`write`、`edit`、`bash` 四个工具和一套扩展 API。项目规范可以写成 skill，常用指令做成 prompt 模板；需要强制执行或新增工具时，再写 extension。任务多了，可以交给 subagent；想定时运行，则需要 Pi 扩展或操作系统的调度器。

重点不是把这些功能全部装上，而是知道一个需求应该放在哪一层。

## 先跑起来

按官方命令先安装 Pi

`npm install -g --ignore-scripts --min-release-age=0 @earendil-works/pi-coding-agent`

```
export ANTHROPIC_API_KEY=sk-ant-...
pi
# 或者用已有订阅：进 pi 后敲 /login，选 Anthropic / OpenAI / GitHub Copilot
```

进去你就在跟一个 coding agent 说话了，它默认能读写文件、跑 bash。几个常用命令：

| 命令 | 作用 |
|---|---|
| `/model` | 切模型 |
| `/tree` | 打开会话树，跳回任意历史节点 |
| `/fork` | 从某条历史消息分出新会话 |
| `/reload` | 热重载所有扩展、skill、prompt |
| `Ctrl+G` | 打开 `$EDITOR` 写长 prompt |

到这一步，你手上就是“一个装好的 Pi”，跟别人下个 Cursor、Codex 没什么两样。让它变成你的，是下面这几层。

搭建时能用轻量方案，就别上重的。一段知识写成 skill 就够了，不必做成 extension。工具和 skill 的成本结构不同：skill 按需加载，不用就不占上下文；工具的名字和描述会常驻 system prompt。注册一个工具，相当于给之后的每次请求都加了一点成本。

我只会把高频、性能敏感、需要结构化返回，或者需要在 TUI 里专门渲染的能力做成工具。剩下的写成 skill，或者做个 CLI 让 Pi 用 `bash` 调。

## Skills：把你的做事方式写下来

Skill 是最轻的一层，就是一个 Markdown 文件，遵循 Agent Skills 标准\[3\]，按需加载给模型。它不写代码、不加工具，只是把“做某件事时你希望它怎么想”记下来。

文件放到 `~/.pi/agent/skills/`（全局）或 `.pi/skills/`（项目），Pi 自动发现。模型会在合适的时候自己加载，你也可以 `/skill:name` 手动点它。

拿 git 提交规范举例。你要是有一套雷打不动的习惯，与其每次口头提醒，不如写成 skill：

```markdown
---
name: git-workflow
description: 本项目的 git 提交与分支规范。涉及 commit、开分支、提 PR 时加载。
---

# Git Workflow

## 提交信息
- 用 Conventional Commits：feat / fix / refactor / docs / chore
- 标题不超过 50 字，用祈使句（"add" 而不是 "added"）
- 正文说清楚为什么这么改，改了什么 diff 自己会讲

## 分支
- 从最新 main 切：git switch -c feat/xxx
- 一个分支只做一件事，别把重构和新功能混一起

## 提 PR 前
1. git diff --staged 通读一遍，别把调试代码和 console.log 带上去
2. 跑测试：npm test
3. PR 描述按"背景 / 改动 / 怎么验证"写
```

装上以后，你说一句“帮我把这些改动提交了”，它就照着你的规矩写 commit、开分支、自查，不用你每次重新交代。

code review 也一样，把你看代码的顺序固化下来：

```markdown
---
name: code-review
description: 代码评审清单。审 diff、review PR、检查改动质量时加载。
---

# Code Review 清单

从重到轻：

1. 正确性：边界条件、空值、并发、错误处理有没有漏
2. 测试：新逻辑有没有测试，有没有覆盖失败路径
3. 安全：硬编码密钥、SQL 拼接、没校验的外部输入
4. 复杂度：有没有过度抽象，能删的就删
5. 命名和可读性：三个月后你自己还看得懂吗

每条问题标上 [严重] / [建议] / [nit]，给文件和行号，说清楚为什么。
```

有了这两个 skill，你的 Pi 就不是个通用助手了，它按你的规矩提交、按你的清单审代码。

## Prompt 模板：把常说的话固化成命令

skill 管的是“它怎么想”，但有些活是你反复用同一套话去指挥它——“照着这个 issue 的验收标准写实现，先跑测试再提交”。每次敲一长串很烦，这种就适合固化成一个 prompt 模板：一个 Markdown 文件，用斜杠命令调出来。

文件放到 `~/.pi/agent/prompts/`（全局）或 `.pi/prompts/`（项目），文件名就是命令名。比如写一个 `implement.md`：

```markdown
---
description: 照着一个 issue 的验收标准实现，先测试后提交。
argument-hint: <issue-key>
---

读一下 $1 的描述和验收标准，然后：

1. 先写测试，覆盖验收标准里的每一条
2. 实现到测试全绿为止
3. 按 git-workflow skill 的规矩提交
4. 把这次改动对应验收标准的哪几条，逐条说清楚
```

之后在对话里敲 `/implement PROJ-123`，Pi 就把整段话展开、把 `$1` 换成 `PROJ-123` 发出去。参数替换是 bash 那套：`$1`、`$2` 是第 N 个参数，`$@` 或 `$ARGUMENTS` 是全部，`${1:-main}` 带默认值，`${@:2}` 从第二个参数取到底。

模板不加知识也不加工具，只是把你嘴上那套流程存下来，省得每次重打。它和 skill 一样轻——能用一句固化的命令解决，就别急着写代码。

不过 skill 和模板都有个共同的上限：它们只能影响模型怎么想、帮你少打字，没法保证某件事一定发生。你要是想要“每次写完代码都必定审一遍”，光靠它们不行——模型可能就忘了。这种时候得往上走一层。

## Extensions：给它你要的工具

Extension 是 TypeScript 模块，能加工具、加命令、挂事件钩子。上面那个“保证审一遍”的需求，靠的就是事件钩子。

一个 extension 就是个默认导出的函数，拿到 `ExtensionAPI`：

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerTool({ name: "deploy", /* ... */ });        // 给 LLM 用
  pi.registerCommand("stats", { /* ... */ });             // 给用户用
  pi.on("tool_call", async (event, ctx) => { /* ... */ }); // 挂钩子
}
```

放到 `~/.pi/agent/extensions/` 或 `.pi/extensions/`，Pi 启动时自动加载，改完 `/reload` 就生效。

接着上面的思路做个具体的：每当模型这一轮动过代码（调了 `write` 或 `edit`），等它忙完，就自动让它对着 code-review skill 自查一遍。skill 保证不了“必定”，extension 能。

这个 extension 需要监听两个事件：`tool_result` 用来记录本轮是否成功调用过 `write` 或 `edit`，`agent_settled` 则等自动重试、压缩和排队消息都处理完后触发评审。还要加一个状态位，避免评审过程中修代码又触发下一轮评审。

```typescript
// auto-review.ts
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

export default function (pi: ExtensionAPI) {
  let changedCode = false
  let reviewing = false

  pi.on('tool_result', (event) => {
    if (reviewing || event.isError) return
    if (event.toolName === 'write' || event.toolName === 'edit') {
      changedCode = true
    }
  })

  pi.on('agent_settled', (_event, ctx) => {
    if (ctx.mode !== 'tui') return

    if (reviewing) {
      reviewing = false
      return
    }

    if (!changedCode) return
    changedCode = false
    reviewing = true

    pi.sendUserMessage(
      '你刚改过代码。现在加载 code-review skill，对着清单检查这次改动。' +
      '列出 [严重] 和 [建议] 问题，能直接修的就修。',
      { deliverAs: 'followUp' },
    )
  })
}
```

这里没有检查 `git diff`。工作区可能在本轮开始前就有改动，只看 diff 会把旧改动也算进去；监听成功的 `write` 和 `edit` 更接近“这一轮动过代码”。`reviewing` 用来跳过评审本身产生的修改，否则它会审完再审。示例只在 TUI 模式运行，免得 headless 任务意外多跑一轮。

`sendUserMessage` 的 `deliverAs: 'followUp'` 不会打断当前响应，而是把评审指令排在本轮之后。

装上：

```bash
mkdir -p ~/.pi/agent/extensions
cp auto-review.ts ~/.pi/agent/extensions/
```

再让它写段代码试试。写完后，它会加载 code-review skill，按清单检查并处理问题。skill 提供评审方法，extension 负责触发。

这一层能干的不止这些。权限门（`rm -rf` 前弹个确认）、git 自动 checkpoint、禁止写 `.env`、自定义压缩，套路都一样：注册工具、挂事件、需要的话再画个 UI。真要写，最省事的办法是打开 Pi 直接说“帮我写个 extension 做某某”，它比你熟自己的 API。

### Extension 的状态放在哪里

直觉上会想找个文件存起来，但 Pi 已经提供了一个更合适的位置：tool result 的 `details` 字段。Pi 的会话是一棵树，每条消息都记着 `parentId`。你可以用 `/tree` 跳回任意历史节点，也可以用 `/fork` 从中间分出新分支。

状态存进 `details`，它就跟着会话树走。你在分支 A 里加的五条 todo，切到分支 B 会消失，跳回 A 又原样回来。重建状态时，从 `ctx.sessionManager` 读取当前分支的消息即可。

存文件就做不到这件事。文件是全局的，你在分支 A 写进去的东西，切到 B 还在那儿，跳回历史也回不去——状态和会话对不上，用着用着就乱了。官方的 `todo.ts` 示例就是把 to-do 藏在 `details` 里的，值得照着抄。

判断标准很简单：这个状态是不是"这条会话线的一部分"？to-do、上下文切换记录、压缩备忘，是，藏进会话。跨会话的持久数据（比如你的日志本、配置），不是，老老实实写文件。

## Subagents：让它分头干活

一个 agent 串着干总有瓶颈：上下文越堆越长，一个脑子也没法同时用三种角度审代码。Subagent 就是拿来解决这个的——主会话当调度，把活分给几个专注的子会话，各干各的，结果收回来。

Pi 内核不带，装社区的 pi-subagents\[4\]：

```bash
pi install npm:pi-subagents
```

装完不用配置也不用背命令，直接说人话就行。它通常会带上几个开箱即用的角色（具体名字和数量以你装到的版本为准）：摸代码的探子、给第二意见啃硬骨头的顾问、专审 diff 的评审、按方案执行的执行者、出实施计划的规划者。下面用这些角色名举例，你照着意思说人话即可。

我最常用的是并行审。写完一个功能，一句话派三个分身从不同角度同时看：

```
对当前 diff 起三个并行 reviewer，一个看正确性，一个看测试覆盖，
一个看有没有过度设计，分别汇报。
```

Pi 会同时开三个子会话，各带各的关注点去审，再把三份结果收拢给你。这比让一个 agent“面面俱到”靠谱，每个分身上下文干净、目标单一。

想更狠一点，可以让它审到没得改为止：

```
对这个改动跑一轮 review loop：reviewer 提问题，worker 修，再审，
最多三轮，直到没有值得改的为止。
```

或者串成一条线：

```
先用 scout 摸清 auth 流程，再让 planner 写成实施计划，
我确认后让 worker 去做，最后 reviewer 过一遍。
```

有个地方要留意：装了 pi-subagents 不会自动在后台塞个 reviewer 给你，它只是给了 Pi 一个“能委派”的本事，用不用、怎么用还是看你怎么说。把要求写进项目的 `AGENTS.md`，可以提醒 Pi 在实现后派 reviewer；如果要求每次都触发，仍然要用 extension 挂钩。这和前面的自动评审是同一个思路。

## 定时任务：你不在的时候也让它干

前面几层都还是你坐在电脑前跟 Pi 对话。真让它像个员工的，是它能在你不在的时候按点自己动。这有两条路，差别在于 Pi 需不需要正开着。

### 一、pi-schedule-prompt：会话开着时的调度

pi-schedule-prompt\[5\] 是个 extension，给 Pi 加了个自我排程的本事，能在当前会话里定时触发 prompt。

```bash
pi install npm:pi-schedule-prompt
```

然后说人话排程：

```
每小时跑一次"检查 build 状态，失败就总结原因"
30 分钟后提醒我 review 那个 PR
每天午夜"汇总今天的 commit，写一句话日报"
```

cron 表达式、interval（`5m`、`1h`）、一次性（`+10m`）、ISO 时间戳它都认，编辑器下面还有个 widget 实时显示所有活跃任务，`/schedule-prompt` 能打开面板增删。

但它有个硬边界你得清楚：这东西是 in-process 的，Pi 会话一关，调度就停。所以它适合“我今天开着 Pi 干活，让它每小时顺手帮我瞄一眼 CI”“过半小时提醒我一件事”这种陪你一起干活时的定时，它不是系统级的 cron。

### 二、launchctl 调 headless Pi：关着也能跑

你要是想要“不管我开没开 Pi，每天早上九点自动巡检一遍仓库再把结果发我”，那就得跳出 Pi，用系统的定时器。Pi 有个 headless 模式 `pi -p`，跑完一段 prompt 打印结果就退出，正好给 cron、launchctl 这类调度器调用。

macOS 上我更推荐 launchctl，它比 crontab 更被系统善待，休眠唤醒后会补跑。先写个 plist：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- ~/Library/LaunchAgents/com.example.pi-daily-audit.plist -->
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.example.pi-daily-audit</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd ~/projects/myapp &amp;&amp; pi -p "巡检这个仓库：跑测试、查依赖有没有高危漏洞，问题总结成三行" >> ~/pi-audit.log 2>&amp;1</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>9</integer>
    <key>Minute</key><integer>0</integer>
  </dict>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
```

装上并手动跑一次验证：

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.pi-daily-audit.plist
launchctl kickstart -k gui/$(id -u)/com.example.pi-daily-audit
tail -f ~/pi-audit.log
```

几个踩过的坑：

launchctl 跑的是个极简环境，PATH 和 `ANTHROPIC_API_KEY` 都可能读不到。上面的示例用 `zsh -lc` 启动登录 shell；更稳妥的做法是给 `pi` 写绝对路径，并让脚本从权限受控的配置文件或系统钥匙串读取密钥。不要把 API key 明文提交进 plist。

headless 的 `pi -p` 一样能用 subagent，让定时任务里的 Pi 自己派几个分身并行审，没问题。另外无人值守图个安全，可以用 `pi --tools read,bash -p "..."` 把工具收窄，别放开 `write`、`edit`，免得它半夜没人看着乱改文件。

两个方案怎么选：

| | pi-schedule-prompt | launchctl + `pi -p` |
|---|---|---|
| 前提 | Pi 会话开着 | Pi 关着也能跑 |
| 层级 | Pi 扩展 | 操作系统 |
| 适合 | 干活时搭把手的提醒和轮询 | 无人值守的巡检、日报 |
| 状态 | 活在当前会话里 | 每次全新进程，没记忆 |
| 触发 | 说人话 | 系统日历 |

想让它在你干活时帮衬一下，用第一个；想让它在你睡觉时也上班，用第二个。

## 打包：把攒好的东西分享出去

前面装 pi-subagents、pi-schedule-prompt，敲的都是 `pi install`。这不是什么特殊命令，你自己攒的 skill 和 extension 一样能这么打包、这么装。

最省事的形态就是加个 `package.json`，把你的 extension 声明进去：

```json
{
  "name": "pi-auto-review",
  "version": "0.1.0",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./auto-review.ts"]
  }
}
```

推到 GitHub 或者 npm，别人一行就能装上：

```bash
pi install git:github.com/你的用户名/pi-auto-review
# 或者发到 npm 之后
pi install npm:pi-auto-review
```

装完的东西用 `pi list` 看，`pi update --all` 一起更新，`pi remove` 卸掉。skill 也能塞进同一个包一起分发，别人装完你的 extension，连带着你那套 code-review 清单也一起到手。

打包不复杂：写好 `package.json`，推到 GitHub 或 npm，别人就能通过 `pi install` 安装。现成的包可以在 Pi 的包列表\[6\]里找。

对你自己也一样好使：换台电脑，`pi install` 把你散落各处的 skill 和 extension 一次拉齐，不用手动搬文件。

## 最后

Pi 的价值不在于开箱即用，而在于它没有替你预先决定工作流。这也给了你定制的自由：你可以把自己的做事方式写成 skill、把常用指令固化成 prompt 模板、把必须保证的行为写成 extension、把复杂任务交给 subagent、把无人值守的巡检交给系统调度器。

#### 引用链接

- \[1\] Pi: https://pi.dev
- \[2\] 译文: /2026/03/13/pi-openclaw-minimal-agent/
- \[3\] Agent Skills 标准: https://agentskills.io
- \[4\] pi-subagents: https://www.npmjs.com/package/pi-subagents
- \[5\] pi-schedule-prompt: https://www.npmjs.com/package/pi-schedule-prompt
- \[6\] 包列表: https://pi.dev/packages
