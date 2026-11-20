---
id: inbox-2026-11-20-codex-sandbox
title: Codex Sandbox 完整公开，OpenAI 怎么在本机给 Agent 限权？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/DcqSSYb3JQgZqpJNBV_kFQ
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [Agent, 系统设计]
asset_ref: Assets/2026-11/wechat-DcqSSYb3JQgZqpJNBV_kFQ.md
wiki_status: pending
---

> **摘要**：OpenAI 工程师公开 Codex Sandbox 设计细节：模型决定运行什么，操作系统按启动时的规则限制它能访问什么。命令启动时限权（权限配置→本机沙箱规则，子进程继承约束）；本地 stdio MCP 服务默认不走 Shell 沙箱路径，需单独用 `codex sandbox --permission-profile` 限权；域名规则靠代理执行，需 OS 拦截直连+代理判断域名两层配合。macOS/Linux/Windows 三套实现（Seatbelt/bubblewrap+seccomp/MXC），并指出"文件不继承沙箱限制"的盲区。

## 核心要点

- **背景与动因**：Agent 权限越大，误操作波及面越大（Replit 删生产库、Antigravity 误删 D 盘均有公开案例）；沙箱拦不住"文件内改代码"的逻辑副作用，但能限制命令可接触的文件与网络。
- **命令启动时限权**：`exec_command` 把命令、工作目录、环境变量与权限选项交给统一执行器，Codex 将权限配置转为沙箱规则再启动命令，子进程继承约束；内置 `:workspace` 配置默认可写工作区与系统临时目录、禁止联网，`.git`/`.codex`/`.agents`/`.aws` 额外写保护；编译器读取范围宽（可能读到用户目录配置文件中的密钥），需文件权限单独收紧。
- **MCP 服务另设权限**：本地 stdio MCP 服务由 MCP 客户端直接启动，**默认不套用 Shell 沙箱配置**——同一会话里测试命令断网，文档服务可能照常访问内网；可用 `codex sandbox --permission-profile <name>` 单独限权（Beta，与旧 sandbox_mode 不叠加）；管理员可用 requirements.toml 约束哪些服务可启用，但"允许启动"不等于"启动后能访问什么"，后者仍取决于服务进程自身权限。
- **域名规则靠代理执行**：`network.enabled` 开网络只是第一步，`features.network_proxy` 启用代理才让域名表生效——只开网络不启代理，命令可直接联网；代理经 HTTP_PROXY 等变量传递，绕过代理的直连由操作系统拦截，两层配合才生效；代理先判准再解析域名，宽通配/白名单 DNS 仍可能留 DNS 外传空间。
- **三平台实现**：macOS 用 sandbox-exec + 内核 Seatbelt；Linux 用 bubblewrap 准备文件系统视图 + seccomp 约束系统调用 + no_new_privs 防 setuid 提权，网络走独立命名空间+回环中继转代理；Windows 向 Microsoft MXC 迁移（更细的路径规则覆盖、代理模式拦直连放行回环）。
- **关键盲区：文件不继承沙箱限制**：子进程继承沙箱约束，但沙箱内写出的文件（如 node_modules 中的恶意 Prettier）之后被沙箱外的编辑器进程加载时不受限制；Git 忽略的目录改动不会出现在 git status。
- **核对方法**：用小场景验证限制生效——Shell 与子进程写禁止目录、本地 MCP 服务默认启动 vs 包上 sandbox 对比、代理下允许/拒绝域名与绕过直连、编辑器从哪里加载格式化器；核心原则：允许的动作能完成只说明路通了，**明确禁止的动作确实被拦下**才能确认限制在起作用。

## 正文

完整正文见 [[Assets/2026-11/wechat-DcqSSYb3JQgZqpJNBV_kFQ.md]]。文章基于 Michael Bolin《Inside the Codex sandbox》（11 月 18 日）整理，含 Permission Profiles 配置示例（Memory MCP、project-dev 域名白名单）与完整参考资料链接，适合对照本机 Codex 配置核对权限。

## 来源

- [Codex Sandbox 完整公开，OpenAI 怎么在本机给 Agent 限权？](https://mp.weixin.qq.com/s/DcqSSYb3JQgZqpJNBV_kFQ)

## 附件

- [[Assets/2026-11/wechat-DcqSSYb3JQgZqpJNBV_kFQ.md]]
