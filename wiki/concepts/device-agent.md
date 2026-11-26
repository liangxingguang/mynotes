---
id: wiki-concept-device-agent
type: concept
title: Device Agent（设备智能体与设备模型）
status: active
created: 2026-11-26
updated: 2026-11-26
confidence: medium
tags:
  - concept
  - ai
  - iot
sources:
  - raw/sources/products/2026-11-26-emq-device-agent-esp32.md
related:
  - wiki/concepts/agent-service.md
  - wiki/sources/esp32-dev-board-ai-trend.md
---
# Device Agent（设备智能体与设备模型）

## Definition（定义）

Device Agent 是 EMQ 提出的、把物理设备能力组织为智能体可调用接口的方案：将硬件能力建模为**属性（可写状态）、命令（可调用动作）、事件（上报数据）**三元组构成的设备模型，作为自然语言请求与真实设备操作之间的统一调用依据（信源定义；EMQ 官方表述，单信源）。设备本地（如 ESP32 固件）负责采集与执行，部署在电脑/服务器侧的 Device Agent 服务负责理解请求、读取设备数据并调用操作，形成「用户表达 → 平台状态 → 硬件动作」的闭环（信源）。

## Why It Matters（为什么重要）

- 让智能体通过自然语言调用真实硬件能力（改屏幕、亮灯、播放提示音、查询传感器数据），把 Agent 应用从纯软件延伸到物理设备（信源）。
- 设备模型提供统一语义描述，避免在不同交互入口（语音、文字）中重复定义设备能力；只要能力接口不变，调整表达方式或组合操作通常无需改固件（信源）。
- 复用已有 IoT 平台：存量设备可通过适配后的平台接口接入，复用原物模型与设备数据（信源）。

## Core Characteristics（核心特征）

1. **设备模型三要素**：属性（可写状态，如指示灯、屏幕文字）、命令（可调用动作，如播放提示音）、事件（上报数据，如位移、照度）。
2. **自然语言建模**：开发者用自然语言提示词描述设备，由 Device Agent 生成设备模型，人工检查确认后再接入（信源）。
3. **双链路接入**：MQTT 承载设备数据与控制消息；WebSocket 承载语音收发与会话控制；两条链路关联同一台设备（信源演示架构，属具体实现而非唯一形态）。
4. **固件职责分离**：采集、控制与屏幕刷新由固件完成，模型层提供统一语义，原有驱动得以复用（信源）。
5. **渐进验证**：支持先用模拟器验证交互，再接入真实硬件；建议先完成设备上线、状态上报、文字控制并验证硬件动作，再接语音（信源）。

## Structure（结构）

- 设备模型：属性 / 命令 / 事件（能力描述层）
- 设备侧：固件（采集、控制、刷新）+ MQTT 接入代码（导出适配）
- 服务侧：Device Agent 服务（理解请求、按模型选择操作、组织参数、结合结果反馈）
- 语音链路（可选）：麦克风/扬声器 → 16 kHz 单声道 16 bit PCM → WebSocket → 语音服务 → 会话

## How It Works（运作方式）

1. 开发阶段：以提示词生成设备模型，核对属性/命令/事件与硬件实现一致后创建设备智能体，导出 MQTT 接入代码适配固件。
2. 运行时：用户发出自然语言请求（如「把门口屏幕改成使用中，并点亮指示灯」），智能体按设备模型选择操作与参数，经 MQTT 下发属性更新/命令。
3. 设备执行后返回结果、上报实际状态；语音请求的识别结果进入会话，回复由扬声器播放。
4. 查询类请求需明确时间范围，判断类请求使用预先配置的阈值，保证结果可核对（信源）。

## Relationships（关系）

### Related Concepts（相关概念）

- [[agent-service]]：Device Agent 是「Agent 应用后端化」在物理设备方向的落地形态，服务端理解请求、设备端执行动作的分工与之同构。
- [[esp32-dev-board-ai-trend]]：ESP32 借 AI 出圈的行业背景，本文即以 ESP32-S3 为演示终端，印证该趋势下的一类落地路径。

### Dependencies（依赖项）

- MQTT：设备数据与控制消息通道（信源）。
- WebSocket：语音收发与会话控制通道（信源演示方案）。

### Distinctions（区分）

- 与 [[agent-tool-gateway]] 不同：后者是 Agent 与存量软件工具之间的统一流量入口（RPC/HTTP/MCP 工具治理），Device Agent 面向的是物理设备能力建模，解决的是自然语言到硬件动作的映射。

## Evolution（演进）

- 当前认知仅基于 EMQ 单信源产品方案（2026-11-26 采集），尚无独立实测或第二信源印证。

## Open Questions（开放问题）

- 设备模型与 IoT 平台物模型的映射规则、属性冲突与并发写策略，信源未展开（未知）。
- 语音链路是否必须 WebSocket、是否支持流式 ASR/TTS，信源仅给出演示实现（未知）。

## Evidence（证据）

- Source: `raw/sources/products/2026-11-26-emq-device-agent-esp32.md`（EMQ 微信公众号文章，共享仪器室 ESP32-S3 演示，单信源，置信度中）

## Related Knowledge（相关知识）

- [[agent-service]]
- [[esp32-dev-board-ai-trend]]
