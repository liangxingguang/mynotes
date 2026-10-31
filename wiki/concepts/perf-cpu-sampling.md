---
id: wiki-concept-perf-cpu-sampling
type: concept
title: perf CPU 采样排查法
status: active
created: 2026-10-31
updated: 2026-10-31
confidence: high
tags:
  - concept
  - performance
  - perf
sources:
  - raw/sources/architecture/2026-10-31-perf-cpu-hotspot-analysis.md
related:
  - wiki/sources/perf-cpu-hotspot-analysis.md
---
# perf CPU 采样排查法

## Definition（定义）

用 Linux `perf` 对运行中的程序做 **CPU 采样**：周期性记录执行位置，条件允许时记录调用栈，把一段时间内的记录汇总成"值得优先检查的热点"分布线索。它不是逐行停住程序，也不要求先列出可疑函数，而是让占 CPU 高的函数因采样点更容易落入其中而显现。配套两步：`perf record` 采集写出 `perf.data`，`perf report` 查看热点、调用关系与符号。

## Why It Matters（为什么重要）

源码动辄几万行，凭感觉挑函数加计时不可靠。perf 采一段问题现场的运行数据，用开销集中在哪里来指导"先读哪部分源码"，把猜测变成有分布依据的排查。同一份 `perf.data` 可反复排序、筛选、展开调用栈，换查看方式通常不必重跑业务；采到的调用栈还能直接复用于火焰图。

## Core Characteristics（核心特征）

1. **采样给线索，非全量记录**：只覆盖部分时刻，给分布线索，不能还原每一次函数调用。
2. **两步走**：`perf record`（采集）→ `perf report`（看热点/调用关系/符号）；`perf stat` 统计事件总量（CPU 时间/指令数），回答"总共花多少"，非找热点必经。
3. **四类前置准备**：可运行的 perf 工具（架构/依赖适配目标根文件系统）、内核 `CONFIG_PERF_EVENTS` + 采集权限、与运行版本一致的程序与符号文件、可用的调用栈回溯方式（帧指针 fp）。
4. **符号 ≠ 调用栈**：有函数名不代表能还原调用者；`-g` 不等于保留帧指针，需 `-g -fno-omit-frame-pointer`；省略帧指针可 `--call-graph dwarf`（数据量更大）。
5. **采集时机关键**：业务得真处在待分析状态；程序一直空闲，录很多秒也回答不了"处理一帧为什么慢"。
6. **读数纪律**：先看占比明显的路径；`Self` 是自身贡献、`Children` 是累计贡献；别把入口累计占比当自身开销，别把父子百分比相加。

## Structure（结构）

排查链路（承接"读懂系统负载"后，已确认某业务线程持续占 CPU）：

```text
确认业务线程持续占 CPU
  → 准备（工具/权限/符号/回溯）
  → perf record 采问题现场（写出 perf.data）
  → perf report 看热点（先看大头）
  → 展开调用树，把热点函数连回业务路径
  → （改代码后）用相同输入/负载复测验证
```

## How It Works（运作方式）

### 采集

- **从头运行**：`perf record -e cpu-clock:u -F 199 --call-graph fp -o perf.data -- ./app`（采集随程序退出结束）。
- **后台进程**：`perf record -e cpu-clock:u -F 199 --call-graph fp -p 1234 -o perf.data -- sleep 10`（`-p` 指定被观察进程，`sleep 10` 限定时长，采集后业务继续运行）。
- 以 Linux 5.10 为例：`-p` 覆盖该进程当时已有线程，默认继承随后派生的新线程和子进程（不等于纳入附加前已存在的子进程）；只看单线程用 `-t TID`，默认不继承。

常用参数：

| 参数 | 作用 |
| --- | --- |
| `-e cpu-clock:u` | 按软件 CPU 时钟采样，先观察用户态代码，不依赖硬件周期计数器 |
| `-F 199` | 目标采样频率 199 Hz（示例值，非通用最优；实际样本数受运行状态/权限/内核限制影响） |
| `--call-graph fp` | 同时保存调用栈，用帧指针回溯 |
| `-o perf.data` | 把采集结果留给后续查看 |

注意：`cpu-clock`（软件事件，纳秒计数）≠ CPU 主频；`cycles`（硬件事件，处理器周期）占比含义不同；`:u` 报告不含内核执行位置；普通 CPU 热点采样不能完整解释线程睡眠等待时间。

### 查看与读数

- `perf report -i perf.data` 进交互界面先抓大头；板端无交互界面或脚本保存用 `--stdio`。
- 先看占比明显的路径：一个函数占九成就先查它，别从第一行读到最后一行。
- `[.]` 表示用户态符号；大量 `[unknown]` 或调用链中断，先解决符号/二进制版本/回溯问题（换火焰图也补不出没采到的调用关系）。
- 文本导出热点表：`perf report --stdio --no-children --sort symbol -F overhead,symbol -g none -i perf.data`；调用树：`-g graph,0.5,caller`。注意 `report -F` 选显示字段，与 `record -F` 设采样频率是不同子命令的不同选项。

### 调用栈的意义

把热点函数连回业务路径。热点是 `memcpy` 时，沿调用栈区分是图像处理、日志拼接还是网络发送在复制；上层反复拷贝同一份数据，先减少重复工作往往比钻进 `memcpy` 实现更值得。

### 验证

改代码后用相同输入和负载复测吞吐/请求延迟/每帧耗时；某函数占比下降可能只是其他路径变忙。

## Relationships（关系）

### Related Concepts（相关概念）

- 火焰图：合并调用栈画成方块图，上下连接表示调用层级、宽度表示权重；`perf.data` 已含调用栈可直接生成（生成方法在第 3 篇，待采集）。

### Dependencies（依赖项）

- 帧指针回溯（`-fno-omit-frame-pointer`）或 DWARF 回溯（`--call-graph dwarf`）。
- 内核 `CONFIG_PERF_EVENTS` 与采集权限（`/proc/sys/kernel/perf_event_paranoid`）。

### Distinctions（区分）

- **`perf record`/`perf report` vs `perf stat`**：前者找函数热点（采样分布），后者统计事件总量（"总共花多少"）。
- **`Self` vs `Children`**：自身贡献 vs 含调用链后代的累计贡献；入口函数累计高不等于自身耗时高。
- **采样占比 vs 调用次数**：占比反映 CPU 贡献分布，不能替代调用次数。

## Evolution（演进）

- 本篇（《性能分析》第 2 篇）走通"采集 → 看热点 → 追调用者"。
- 第 3 篇（待采集）将接着同一份 `perf.data` 讲火焰图生成、浏览器打开、悬停/缩放/搜索。

## Open Questions（开放问题）

- 火焰图生成与交互查看的具体命令/工具链待第 3 篇采集后补充。
- `-F` 采样频率、`cpu-clock` vs `cycles` 在不同负载下的最优选择，本信源未给量化结论。

## Evidence（证据）

- demo 实测（ARM64 GCC）：`pixel_work` 循环 20 亿次、`log_work` 2 亿次，采集 742 样本、丢样本 0，热点 90.84% / 9.16%，程序输出 `checksum=962548993`；编译选项 `-O2 -g -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer -fno-optimize-sibling-calls -static`（`-static` 仅实验打包用）。这些为本次实测值，复跑样本数与比例会波动。
- Source: `raw/sources/architecture/2026-10-31-perf-cpu-hotspot-analysis.md`

## Related Knowledge（相关知识）

- [[perf-cpu-hotspot-analysis]]
