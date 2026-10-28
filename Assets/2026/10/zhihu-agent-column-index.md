# 知乎专栏《Agent》系列索引（采集稿）

- 专栏：<https://www.zhihu.com/column/c_2094113198626686177>
- 抓取方式：jina（首次触发知乎安全验证，等待后重试成功）
- 内容：LLM Agent 系列教程，从理论到手写 harness 到工具工程与安全边界

## 文章列表（新 → 旧）

10. [Agent - 工具全谱系与安全边界（10）](https://zhuanlan.zhihu.com/p/2095930576318551219) — 工具不只有 REST：几类工具的风险判断；工具参数为什么是"脏的"（注入原理），确认闸门为什么拦不住；防线外移
9. Agent - 真实世界的工具工程设计（9）— token 过期自动重登、错误分层喂回、危险操作二次确认与审计；把"裸奔版" M2 闭环补成工程做法
8. [Agent - 后台API变成工具（8）](https://zhuanlan.zhihu.com/p/2095575551146718898) — 把真实 REST 接口（登录→查用户→查角色→分配角色）变成 Agent 工具，里程碑 M2 收口
7. [Agent - 手写最小 agent（7）](https://zhuanlan.zhihu.com/p/2095565673804083692) — 五阶段骨架接真 LLM 和两个工具；工具描述变 prompt；参数校验与四类错误路径；reasoning_content 回传；JSON mode 与 function calling 分工
6. [Agent - 调用 LLM 的三种姿势（6）](https://zhuanlan.zhihu.com/p/2095551564815644272) — 同一端点的三种调用方式、共享工程四件套
5. [Agent - harness 框架怎么选（5）](https://zhuanlan.zhihu.com/p/2095515233271951377) — 面向"维护既有系统"需求的 harness 选型结论：能接不同大模型、多 agent/多 skill/多运行模式、能上生产
4. [Agent - 模型选型与推理能力（4）](https://zhuanlan.zhihu.com/p/2095469418528651019) — 通用模型 vs 推理模型、提示词能买到多少"推理"、国内三家与本地私有化接入；utility-based ≈ 模型路由
3. [Agent - agent loop与上下文管理（3）](https://zhuanlan.zhihu.com/p/2094456858648100884) — loop 五阶段、harness 基础设施、agent 为什么"忘事"、loop 何时停、手写最小 loop
2. [Agent - 经典智能体理论（2）](https://zhuanlan.zhihu.com/p/2094449859252197165) — 经典 AI 五类智能体、LLM Agent 对应哪一档、PMTA 四要素坐标系
1. [Agent - 全景与学习路线地图（1）](https://zhuanlan.zhihu.com/p/2094116344245625249) — Agent 是什么、一次工具调用长什么样、为什么需要编排层、学习路线

（第 9 篇链接未在抓取结果中单独列出，位于专栏列表中第 10 篇与第 8 篇之间）
