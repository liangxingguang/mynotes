一个 AI Agent 从你敲下第一句提示词，到 GPU 上吐出最后一个 token，中间到底经过了哪些层？

哈佛今年秋季开了一门新课，CS2680 Modern AI Systems: Agents and System Optimizations，由 Juncheng Yang 主讲，哈佛 MaDSys（Measurement and Design of Systems）研究组支持。课程的设计思路很清楚：从头到尾只跟着一个 Agent 系统走，从应用层的 Agent Loop 一路往下，拆到推理服务和 GPU。

课程分成两部分。第一部分讲 LLM 和 Agent：先学会用 Claude Code，理解它怎么工作、怎么用多 Agent 协作，再讲上下文管理和工具设计、多 Agent 架构、记忆与可靠性、Agent 评测，以及成本和性能的权衡。第二部分讲支撑 Agent 的系统：批处理与调度、KV Cache 与前缀复用、路由与负载均衡、剪枝与量化、speculative decoding，最后落到 GPU 和 kernel。

我最欣赏的是它的作业设计。5 个作业都围绕同一个系统，名字统一叫 Mads（Modern Agent Design and Systems）：

1**Mads-Lens**：观察一个 Agent 怎么干活

2**Mads-Loop**：自己搭出 Agent Loop

3**Mads-Opt**：让每个 token 都物有所值

4**Mads-Serve**：接管推理引擎，在课程提供的 GPU 上自己部署开源权重模型

5**Mads-Stack**：对整条技术栈做端到端优化

作业之外有期末项目，没有考试。课程还设了一个有意思的加分项：每提交一个「当前 AI 解决不了的问题」，加 2 分。授课嘉宾来自 Snowflake 和 Meta，阅读清单从 ReAct、MemGPT 一直排到 vLLM、SGLang、EAGLE、GPTQ、AWQ，基本可以当成一份 Agent 和 AI Infra 的论文地图。

需要提醒的是，这门课门槛不低。先修要求是 CS61 加至少一门研究生级别的系统课，默认你熟悉 Python 和 PyTorch。课程主页也写得很直接：课上不会教完作业需要的所有知识，想拿 A，就得准备课后花大量时间自学和做实验。选课名额 80 人，已经满了；旁听可以，但没有算力分配。

如果你在做 Agent、Harness 或 AI Infra，即使不在哈佛，课程主页上的大纲、幻灯片和阅读清单也很值得收藏：https://cs2680.seas.harvard.edu/

来源：哈佛 CS2680 课程主页