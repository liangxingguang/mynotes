---
id: 2026-10-31-perf-cpu-hotspot-analysis
title: 性能分析 02｜如何使用 perf 排查：定位系统的性能问题
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/oddXrYU4WDJFAEbLUG10Gw
source_type: article
platform: 微信公众号
created: 2026-10-31
category: 技术
tags:
  - 工程实践
  - 工具
asset_ref: Assets/2026/10/perf-cpu-hotspot-analysis.md
wiki_status: pending
---

# 性能分析 02｜如何使用 perf 排查：定位系统的性能问题

> 摘要：本文是《性能分析》系列第 2 篇，讲解用 Linux perf 做 CPU 采样排查性能问题的完整路径：先确认工具、权限、符号与回溯方式四类前置条件，再以 `perf record`（cpu-clock:u、199Hz、帧指针）采集问题现场，用 `perf report` 交互界面先看大头热点、展开调用树把热点函数连回业务路径，最后给出 demo 复现命令与文本导出参数。火焰图留待下篇。

## 核心要点

- **perf 是 CPU 采样工具**：周期性记录执行位置与调用栈，给出分布线索而非全量调用记录；占 CPU 高的函数采样点更容易落入其中，形成热点。
- **常用两步**：`perf record` 采集写出 `perf.data` → `perf report` 查看热点、调用关系与符号。同一份数据可反复排序/筛选/展开，不必重新运行业务。
- **四类前置准备**：可运行的 perf 工具（架构/依赖适配）、内核 `CONFIG_PERF_EVENTS` 与采集权限、与运行版本一致的程序与符号文件、可用的调用栈回溯方式（帧指针 fp）。
- **符号 ≠ 调用栈**：有函数名不代表能还原调用者；`-g` 不等于保留帧指针，需 `-g -fno-omit-frame-pointer`；程序省略帧指针时可考虑 `--call-graph dwarf`。
- **采集时机关键**：业务要真处在待分析状态；程序可从头运行时 `perf record ... -- ./app`；后台进程用 `-p 1234 sleep 10` 限时采集，采集后业务继续运行。
- **常用参数**：`-e cpu-clock:u`（用户态软件时钟，先查业务代码）、`-F 199`（目标采样频率）、`--call-graph fp`、`-o perf.data`。
- **读数方法**：先看占比明显的路径（一个函数占九成就先查它）；`Self` 看自身贡献、`Children` 是累计贡献，别把入口函数累计占比当成它自己的开销，也不要把父子百分比相加。
- **调用栈的意义**：把热点函数连回业务路径——热点是 `memcpy` 时，要区分图像处理、日志拼接还是网络发送在复制，上层重复拷贝往往比钻进 `memcpy` 实现更值得优化。
- **demo 验证**：`pixel_work`（20 亿次循环）vs `log_work`（2 亿次），采样 742 样本，热点表 90.84% / 9.16% 与工作量相符；采样占比不能替代调用次数。
- **优化后仍要验证**：改代码后用相同输入和负载复测吞吐/延迟；某函数占比下降可能只是其他路径变忙。

## 正文

排查路径：确认业务线程持续占 CPU（上一篇已分清"忙在运行还是忙在等待"）→ perf 采问题现场 → 看热点 → 追调用者。

采集命令（从头运行）：`perf record -e cpu-clock:u -F 199 --call-graph fp -o perf.data -- ./app`。后台进程：`perf record -e cpu-clock:u -F 199 --call-graph fp -p 1234 -o perf.data -- sleep 10`（`-p` 覆盖该进程已有线程并继承新派生线程/子进程；只看单线程用 `-t TID`）。

查看：`perf report -i perf.data` 进交互界面先抓大头；板端无交互界面或脚本保存时用 `--stdio`。文本导出热点表：`perf report --stdio --no-children --sort symbol -F overhead,symbol -g none -i perf.data`；调用树：`-g graph,0.5,caller`。注意 `report -F` 是选显示字段，与 `record -F` 设采样频率是不同子命令的不同选项。

报告判读：`[.]` 表示用户态符号；`[unknown]` 或调用链中断先解决符号与二进制版本问题；`perf.data` 已含调用栈，可直接用于下篇的火焰图生成。

## 来源

- 原文：https://mp.weixin.qq.com/s/oddXrYU4WDJFAEbLUG10Gw
- 抓取方式：web-fetch（Playwright 渲染，6,954 字符；首次抓取遇微信验证墙，重试成功）

## 附件

- [[Assets/2026/10/perf-cpu-hotspot-analysis.md]]（抓取正文）
