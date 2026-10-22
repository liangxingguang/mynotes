---
title: 别再花几万块搭 Agent 了，[微软开源] 3500 行框架让 AI 自己练级（知乎想法）
source: 知乎想法
source_url: https://www.zhihu.com/pin/2083978910019204286
source_type: post
platform: 知乎
captured: 2026-10-14
registered_at: 2026-10-23
inbox_ref: Archive/2026-10-14-ms-agent-lightning-rl-framework.md
---

# 别再花几万块搭 Agent 了，[微软开源] 3500 行框架让 AI 自己练级（知乎想法）

🤣别再花几万块搭 Agent 了，\[微软开源\] 3500 行框架让 AI 自己练级 |

花几万块搭的 AI Agent 系统，写代码全是 bug，调工具顺序乱七八糟？微软 Research 最近开源的 Agent Lightning，就是干这事的——而且只用了 3500 行代码。

一句话说清楚 Agent Lightning 是微软研究院开源的一个轻量级强化学习框架，专门用来训练 AI Agent——不是在模拟环境里「打游戏」，而是让 Agent 直接在真实工具链、真实代码环境、真实浏览器里跑，然后用真实交互数据来训练模型变得更聪明。

你现有的 Agent 代码——用 LangChain 写的、用 AutoGen 写的、甚至手写的——一行都不用改；整个框架只有三个核心组件：Trainer、API Gateway、Rollout Controller。

项目提供了完整的 Coding Agent 训练案例：用 6K 训练样本，在 Qwen3.5-9B 上跑完端到端流程，SWE-bench Verified 分数从 41.8% 涨到 56.4%，提升 14.6 个百分点。

Agent Lightning 让我看到了 AI Agent 训练的一个趋势：从「造更好的模拟器」转向「在真实世界里训练」。

[别再花几万块搭 Agent 了，\[微软开源\] 3500 行框架让 AI 自己练级](https://zhuanlan.zhihu.com/p/2083976916214740856)

[#人工智能](https://www.zhihu.com/topic/19551275) [#AI编程开发](https://www.zhihu.com/topic/28322950) [#AI工具推荐](https://www.zhihu.com/topic/27828704) [#开源](https://www.zhihu.com/topic/19562746) [#训练](https://www.zhihu.com/topic/19554288)