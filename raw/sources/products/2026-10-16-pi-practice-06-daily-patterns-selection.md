---
title: Pi实战 06：日常实战 · 模式 · 选型篇
source: 微信公众号「九幺一铭 Ai修行手记」
source_url: "https://mp.weixin.qq.com/s/H5jMdYhJXR3QxdFBsy9QHA"
source_type: article
platform: mp.weixin.qq.com
captured: 2026-10-16
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-16-pi-practice-06-daily-patterns-selection.md
asset_ref: Assets/2026/10/pi-practice-06-daily-patterns-selection.md
---

# Pi实战 06：日常实战 · 模式 · 选型篇

# Pi实战 06：日常实战 · 模式 · 选型篇

> 来源：微信公众号「九幺一铭 Ai修行手记」 https://mp.weixin.qq.com/s/H5jMdYhJXR3QxdFBsy9QHA
> 抓取方式：web-fetch（fetch_level=browser，HTTP 直取仅得 16 字符反爬壳），约 5,858 字符

> 原文资料来源：deepakness、HN 讨论、Reddit r/PiCodingAgent、composio.dev（Pi vs OpenCode）、Context Studios / mcplato（Pi vs Claude Code）、petronellatech 评测。

前面五篇讲了"怎么配、怎么用、怎么扩展"。这一篇落地到**别人真实的一天**：他们怎么组合模型、怎么省 token、Pi 的四种运行模式、以及最现实的"我该不该从 Claude Code / OpenCode 迁过来"。

* * *

## 一、经验 1：别只用一个模型——按任务分工

deepakness（把 Pi 当日主力的开发者）的模型组合，很有代表性：

| 场景 | 工具/模型 | 原因 |
| --- | --- | --- |
| 日常大多数工作 | **Pi + DeepSeek** | 便宜够用，当 daily driver |
| 复杂任务 | **Grok Build** | 更强的推理 |
| 前端设计 / UI | **Claude Code** | 前端审美更好 |
| 联网搜索 | `pi-web-access` | （Exa，免 key）读文档、扒网页、看懂 YouTube |
| 图片 | `pi-vision-handoff` | 默认模型没视觉能力时转交 |

**核心策略**：便宜模型跑探索，硬骨头 `/model`（或 `Ctrl+L`）切强模型收尾；`Shift+Tab` 调思考等级。Reddit 上那个"怎么用 Pi 不烧钱"的热帖，答案几乎一致：**日常用便宜/本地模型，别啥都上最强模型。**

* * *

## 二、经验 2：省 token 是 Pi 的先天优势，再叠几招

**先天优势**：Pi 系统提示词 < 1000 tokens。composio.dev 引用 Systima 实测，每次请求固定开销：

| Harness | 每次请求固定开销 |
| --- | --- |
| Claude Code | ~32,800 tokens |
| OpenCode | ~6,900 tokens |
| **Pi** | **< 1,000 tokens** |

同样是干活，Pi 把更多上下文窗口留给了你的真实代码。

**后天再省几招**：

1. **`!!command` 跑 shell 但不把输出塞进上下文**（`!command` 会塞进去）。只想跑一下、不想污染上下文时用。
2. **大上下文模型务必在 `models.json` 显式列 `contextWindow`**，否则继承默认 128k，过早触发压缩。
3. **MCP 用 adapter**（~200 tokens vs 30k+），见第 05 篇。
4. **`/session` 随时看 token 和花费**——Pi 是少数把开销对你完全透明的 Agent，盯着它能直观感受到"切便宜模型""精简上下文"的真实节省。
5. **精简工具集**：`pi --tools read,grep,find,ls -p "Review the code"` 只读模式，或 `--exclude-tools xxx` 关掉用不到的工具，少一个工具少一段 system prompt。

* * *

## 三、经验 3：四种运行模式，不止交互式

Pi 有 **interactive / print(或 JSON) / RPC / SDK** 四种模式，别只知道开起来聊天。

| 模式 | 怎么用 | 场景 |
| --- | --- | --- |
| **interactive** | 直接 `pi` | 日常对话 |
| **print / JSON** | `pi -p "query"`，加 `--mode json` | 脚本、管道、结构化输出 |
| **RPC** | `--mode rpc`（或 `--rpc`），stdin/stdout JSON 协议 | 非 Node 程序集成 |
| **SDK** | 用 `@mariozechner/pi-coding-agent` embed | 把 Pi 嵌进你的 app（如 OpenClaw） |

**一次性/脚本模式示例**：

```
pi -p "Summarize this codebase"           # 一句话总结代码库
```

**只读审查**：

```
pi --tools read,grep,find,ls -p "Review the code"
```

**限制模型轮换**：

```
pi --models "claude-,gpt-4o" "Solve this complex problem"
```

**禁用某个工具但保留其余**：

```
pi --exclude-tools ask_question
```

**完全不加载内置工具、只用扩展工具**：

```
pi --no-builtin-tools -e ./my-extension.ts
```

* * *

## 四、经验 4：那些"用了就回不去"的小习惯

来自各博客/社区的高频技巧：

- **`@` 引用文件**：输入框打 `@` 模糊搜索项目文件；Tab 补全路径。
- **`!command` / `!!command`**：跑 shell，前者把输出喂模型，后者不喂。
- **图片**：`Ctrl+V` 粘贴（Windows `Alt+V`），或直接拖进终端。
- **多行输入**：`Shift+Enter`（Windows Terminal 上 `Ctrl+Enter`）。
- **复制上一条回复**：`Ctrl+X`。
- **切模型**：`/model` 或 `Ctrl+L`；`Ctrl+P` 循环收藏的模型。
- **调思考等级**：`Shift+Tab`（minimal / low / medium / high）。
- **会话树**：`/tree` 跳节点、`/fork` 分支、`/clone` 复制、`/resume` 继续。
- **热重载**：改了扩展/提示词/AGENTS.md，`/reload` 生效，不用重启。

* * *

## 五、经验 5：该不该迁过来？——诚实的选型对照

社区有个清醒共识：**别把 Pi、Claude Code、OpenCode、Codex 当成同一赛道的竞品**，它们回答的是不同问题（mcplato / Context Studios）。

| 维度 | Pi | Claude Code | OpenCode | Codex CLI |
| --- | --- | --- | --- | --- |
| 定位 | 极简、可高度 hack 的**骨架** | 集成度高的**Agent** | 开箱即用的 CC 替代品 | 托管式工作流 |
| 开源 | MIT，单仓库全开源 | 私有 | Apache-2.0 | Apache-2.0 |
| 模型 | **15+ 提供商 + 自建/本地** | 仅 Anthropic | 多模型 | 仅 OpenAI |
| 系统提示词开销 | **< 1,000 tokens** | ~32,800 | ~6,900 | — |
| 内置功能 | 少（子代理/plan mode/权限弹窗都靠你造） | 多（集成 review、编排） | 多（plan mode、权限、MCP、LSP、撤销重做） | 多 |
| 上手成本 | 高（要自己配/扩展） | 低 | 中 | 中 |
| 像什么 | **Emacs / Neovim** | 成品 IDE | 配置型产品 | 托管服务 |

**composio.dev 实测 100 小时后的结论（Pi vs OpenCode）：平局**，因为面向不同的人：

> "Pi 是你去**编程**的平台（像 Neovim，用 TS 自己造骨架）；OpenCode 是你去**配置**的产品（开箱即用，自带 plan mode、权限、MCP、撤销重做、LSP）。"

**Context Studios 总结得最精辟**：

> "Pi rewards engineers who treat the agent as a sharp instrument they keep their hands on. Claude Code rewards teams that want the agent to carry more of the process."
> （Pi 奖励那些把 Agent 当**锋利手术刀、始终握在自己手里**的工程师；Claude Code 奖励那些想让 Agent **替自己扛下更多流程**的团队。）

**一个冷静的提醒**（BenjaminWegener）：Pi 作为"开发者自主权"的概念验证很成功，但**除非你接受"用厂商维护的功能，换取自己动手搭建维护的代价"**，否则它不能直接替代商业 harness。它把能力给了你，也把责任给了你。

* * *

## 六、经验 6：HN / Reddit 社区的真实反馈

- **"Pi is the Emacs of coding AI agents."** —— HN 用户 `onetom`。极简内核 + 无限可扩展的精准概括。
- **树状会话广受好评**：HN `vorticalbox`："Sessions are stored as trees, that is actually really nice."
- **轻量架构值得学习**：HN `Richard_Jiang`："Pi is a great project, and the lightweight Agent development is really recommended to refer to Pi's implementation method."
- **还没迁移的主因**：HN item 46847274 里，有人觉得本地模型"要么慢、要么不够好"，"still a beat behind" Claude Code；也有人担心 Anthropic OAuth 可能被封。
- **Reddit 高频帖**："How do you use Pi without running out of usage?"（怎么省着用）、"Your pi coding setup"（晒配置）、"New to Pi, any tips?"。
- **一个反差点**：Pi 没有权限弹窗——有人爱它的"透明直接"，也有人因此更谨慎（自己加 permission-gate，见第 03 篇）。

* * *

## 七、给不同人的落地建议

**如果你是**：

- 享受自己打磨工具、看重透明/隐私/低成本/模型自由 → **Pi 是神器**，按 01→02→03 的顺序搭起来。
- 想要"装好就能跑、有人兜底、有客服和 MSA 合同" → 选 **Claude Code / Cursor** 更省心。
- 没有工程能力去配置、扩展、维护 → Pi 的"自由"会变成你的负担。
- 受监管行业（政府/金融/医疗），代码不能出内网 → Pi 的"无 SaaS 后端 + 可指本地端点 + 可审计"是**顶层优势**（petronellatech）。

* * *

## 八、一份"30 分钟上手"清单

1. 装 Pi（pi.dev 一行命令，Win/Linux/macOS 多终端可用）。
2. 登录模型提供商（订阅 OAuth 或 API key）。
3. 写 `~/.pi/agent/APPEND_SYSTEM.md`：放那 4 条全局行为规则（第 01 篇）。
4. 配 `settings.json`：`defaultModel` + `enabledModels` + 思考等级。
5. 跑 `pi --model sonnet:high "..."` 体验；`/session` 看花费。
6. 装 1–2 个技能（`impeccable` 做前端、`mattpocock/skills` 做 TDD）。
7. 需要新功能时，**先让 Pi 自己造**（第 03 篇），再造轮子或装第三方包。
8. 加 `permission-gate` 扩展拦危险命令（第 03 篇）。
9. 用 `/tree` 玩转会话树（第 04 篇）。
10. 想省钱/要隐私 → `models.json` 接本地模型（第 05 篇）。

* * *

## 结语

Pi 的野心不是"再做一个 AI 编程工具"，而是**把 Agent 的定义权交还给你**。它用 <1000 tokens 的系统提示词、15+ 模型提供商、树状会话、以及"侵略性地可扩展"的架构，换来透明、低成本、模型自由和无限定制——代价是把一部分"造功能"的活甩给了你。

用官网那句话收尾最贴切：**"Adapt Pi to your workflows, not the other way around."** 别想着让 Pi 适应它的默认样子，去把它改造成你的样子。这，才是用对 Pi 的方式。

* * *

> 系列索引：README.md
