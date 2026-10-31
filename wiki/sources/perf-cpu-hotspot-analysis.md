---
id: wiki-source-perf-cpu-hotspot-analysis
type: source
title: 性能分析 02｜如何使用 perf 排查：定位系统的性能问题
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - performance
  - perf
  - linux
sources:
  - raw/sources/architecture/2026-10-31-perf-cpu-hotspot-analysis.md
related:
  - wiki/concepts/perf-cpu-sampling.md
---
# 性能分析 02｜如何使用 perf 排查：定位系统的性能问题

## Overview（概览）

《性能分析》系列第 2 篇（连载 n 篇，第 1 篇为"读懂系统负载"）。承接第 1 篇"分清系统忙在运行还是忙在等待"，本篇回答：已确认某业务线程持续占 CPU 后，它到底在执行哪段代码。全文给出用 Linux `perf` 做 CPU 采样排查的完整路径——四类前置准备 → `perf record` 采集 → `perf report` 看热点/追调用者，并用一个 demo 实测验证。火焰图生成留待第 3 篇。

## Key Facts（关键事实）

- `perf` 是 Linux 性能分析工具，此处用作 **CPU 采样**：周期性记录执行位置，条件允许时记录调用栈；给分布线索，不还原每一次调用。
- 最常用两步：`perf record`（采集写出 `perf.data`）→ `perf report`（看热点/调用关系/符号）；同一份数据可反复排序/筛选/展开，不必重跑业务。
- 采集命令（从头运行）：`perf record -e cpu-clock:u -F 199 --call-graph fp -o perf.data -- ./app`。
- 后台进程采集：`perf record -e cpu-clock:u -F 199 --call-graph fp -p 1234 -o perf.data -- sleep 10`；以 Linux 5.10 为例，`-p` 覆盖该进程已有线程并继承新派生线程/子进程，`-t TID` 只看单线程且默认不继承。
- demo 实测（ARM64 GCC）：`pixel_work` 循环 20 亿次、`log_work` 2 亿次，采集 **742 样本**、丢样本 0，热点 **90.84% / 9.16%**，程序输出 `checksum=962548993`。
- 编译选项：`-O2 -g -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer -fno-optimize-sibling-calls -static`（`-static` 仅本实验打包用）。

## Important Claims（重要论断）

### Claim 1：符号 ≠ 调用栈

有函数名不代表能还原调用者；编译加 `-g` 不等于自动保留帧指针。需 `-g -fno-omit-frame-pointer`；程序省略帧指针时可考虑 `--call-graph dwarf`（数据量更大）。

### Claim 2：采样占比不能替代调用次数

demo 中两函数各调用一次，90.84%/9.16% 与 10 倍循环量相符，但 10 倍循环量不保证每次采出精确 10∶1。

### Claim 3：别把入口的累计占比当成它自己的开销

`Self` 是自身贡献、`Children` 含调用链后代累计。demo 中 `process_frame` 累计 100%、自身 0%；不要把父子函数累计百分比相加。

### Claim 4：调用栈的意义是把热点连回业务路径

热点是 `memcpy` 时，要沿调用栈区分是图像处理、日志拼接还是网络发送在复制；上层重复拷贝往往比钻进 `memcpy` 实现更值得优化。

### Claim 5：优化后仍要验证

改代码后用相同输入和负载复测吞吐/延迟/每帧耗时；某函数占比下降可能只是其他路径变忙。

## Concepts Introduced（引入的概念）

- **perf CPU 采样排查法**：已编译为独立概念页 [[perf-cpu-sampling]]。
- 相关区分：`cpu-clock`（软件事件，纳秒计数）≠ CPU 主频；`cycles`（硬件事件，处理器周期）占比含义不同；`:u` 报告不含内核执行位置。
- `perf stat`（统计事件总量，回答"总共花多少"）与 `perf record`/`perf report`（找函数热点）用途不同。
- 火焰图（合并调用栈画成方块图，宽度=权重）：本篇仅预告，生成方法在第 3 篇（待采集）。

## Entities Mentioned（提及的实体）

- **Linux perf**（`tools/perf`，内核 `CONFIG_PERF_EVENTS`）：本篇工具主体。
- **GCC / ARM64**：demo 编译环境。

## Implications（影响／启示）

- 提供了一条可复用的"采集 → 看热点 → 追调用者"排查链路，`perf.data` 已含调用栈可直接复用于火焰图。
- 强调前置准备（工具/权限/符号/回溯）与读数纪律（先看大头、区分 Self/Children），避免误把入口累计当自身开销。

## Limitations（局限）

- 火焰图生成、浏览器打开、缩放/搜索具体路径留待第 3 篇，本信源未覆盖。
- demo 为教学用小程序（整数循环），真实业务的符号/回溯/样本波动更复杂；实测数字（742、90.84%、checksum）为本次 ARM64 环境值，复跑会波动。
- `-F 199` 为示例值，非通用最优；实际样本数受运行状态/权限/内核限制影响。

## Related Knowledge（相关知识）

- [[perf-cpu-sampling]]

## Source（信源）

- `raw/sources/architecture/2026-10-31-perf-cpu-hotspot-analysis.md`
