---
id: wiki-source-wechat-minigame-android-cross-process-livestream
type: source
title: 微信小游戏直播在Android端的跨进程渲染推流实践
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - source
  - android
  - live-streaming
  - ipc
sources:
  - raw/sources/architecture/2026-10-23-wechat-minigame-android-cross-process-livestream.md
related:
  - wiki/concepts/cross-process-surface-rendering.md
---
# 微信小游戏直播在Android端的跨进程渲染推流实践

## Overview（概览）

微信开发团队（virwu）一手复盘：小游戏跑在独立进程、直播推流模块在主进程，音视频数据必须跨进程。视频侧用 [[cross-process-surface-rendering|Surface 跨进程渲染]] 替代 MediaProjection 录屏；音频侧放弃 Android 10 才有的 AudioPlaybackCapture、改自采集混音并经 LocalSocket 传输。另记录两个多进程深坑（glFinish 与后台 cgroup 限 CPU）的排查过程。

## Key Facts（关键事实）

- MediaProjection 录屏方案被否决的三条理由：系统授权弹窗；切出小游戏有隐私风险；最关键——主播评论挂件会被录进去暴露给观众。录屏对帧率影响本身在 10% 以内。
- 关键洞察：SurfaceView 的 Surface 由系统进程 SurfaceFlinger 合成、天然可跨进程，且 Surface 实现 Parcelable，可用 Binder 直接跨进程传递；官方文档明确支持，Chrome 与 Android O+ WebView 同款方案。
- 渲染架构收敛：录屏方案需 3 个 Renderer（小游戏进程 2 个 + 主进程 1 个）→ 跨进程方案把小游戏在屏 Surface 传到主进程，只留主进程 1 个 Renderer 兼任 OES→2D 纹理转换、推流、回写上屏。
- 兼容与性能：Android 5.x 机型跨进程渲染黑屏，其余 5.1+ 主流机型正常；WebGL 水族馆实测平均帧率影响约 15%，主进程 CPU 升高、小游戏进程 CPU 反降（原因未确认）。
- 音频：AudioPlaybackCapture 需 Android 10（api 29）版本要求过高 → 自采集混音；传输需求为 40ms 周期、16ms 约 8k 数据块、低延迟（否则音画不同步）。
- IPC 五方案实测（Binder/LocalSocket/MMKV/SharedMemory/Pipe，16ms 间隔发 3k/4M/10M 三挡）：LocalSocket 各挡延迟最优（ObjectStream 流式拷贝省一次反序列化拷贝），除三星 S6 平均 >10ms 外其余机型约 1ms。
- LocalSocket 无鉴权（Unix domain socket 任意应用可连）→ 防御：AppId+uin 算 md5 随机命名 + 连接后握手鉴权。
- 深坑一 glFinish：主进程 Renderer 的 glFinish 耗时 100+ms——GL 队列按线程隔离但 GPU 只有一个，小游戏进程大量 GL 指令拖慢主进程 glFinish；双缓冲下本不需要 glFinish，删两处后帧率拉齐。
- 深坑二后台进程优先级：编码只有 16 帧；chrt 改 SCHED_RR 后 25 帧、主进程浮窗前台化后 30 帧；setThreadPriority（renice）仅 16→18 帧——renice 对后台 cgroup 线程几乎无效（后台 cgroup 总 CPU 占比很小），正解是前台 Service。

## Important Claims（重要论断）

### 解决跨进程最好的方案是避免跨进程

曾考虑推流模块直接跑小游戏进程，因改造成本未选；跨进程方案是次优中的最优。多进程是双刃剑：隔离与性能优势伴着 IPC 难题。

### 对 glFinish 应当非常谨慎

glFinish 使双缓冲机制失效，性能影响巨大；且在多进程场景下会被另一进程的 GL 负载间接阻塞——Profile 出的耗时函数未必是本进程的问题。

## Concepts Introduced（引入的概念）

- [[cross-process-surface-rendering|Surface 跨进程渲染]]

## Entities Mentioned（提及的实体）

- 微信小游戏 / MagicBrush 渲染引擎 / 腾讯云直播 SDK（均未单独立页）

## Implications（影响／启示）

- 跨进程渲染模式可复用于"内存压力大或安全风险高、又需要 SurfaceView 绘制"的场景：逻辑放独立进程，画面跨进程绘制到主进程 View 上，兼得隔离与体验连续。
- 解读：两个深坑的共同教训是"多进程下性能归因不能只看本进程"——GPU 是全局唯一资源、CPU 调度受 cgroup 分组约束，都是跨进程不可见的共享约束。

## Limitations（局限）

- 单一信源、官方一手自述；帧率数字（15%、10%）为特定 Demo/机型实测，非通用指标。
- Android 5.x 黑屏的根因与修复未展开；小游戏进程 CPU 下降原因文中自承"未确认"。
- iOS 侧方案不在本文范围。

## Related Knowledge（相关知识）

- [[cross-process-surface-rendering|Surface 跨进程渲染]]

## Source（信源）

- `raw/sources/architecture/2026-10-23-wechat-minigame-android-cross-process-livestream.md`
