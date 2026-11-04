---
id: wiki-source-mica-voice
type: source
title: 告别云语音 API！Java 离线语音 SDK，一行 Maven 依赖，7 大音频能力本地运行（mica-voice）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - source
  - java
  - 离线语音
sources:
  - raw/sources/architecture/2026-11-03-mica-voice-java-offline-speech-sdk.md
---

# 告别云语音 API！Java 离线语音 SDK（mica-voice）

## Overview（概览）

公众号「IT开源项目精选」第 64 期开源项目拆解（2026-11-03 采集）。介绍 mica-voice（gitee.com/dreamlu/mica-voice）：把 sherpa-onnx（k2-fsa 的 ONNX 推理引擎）用纯 Java 重包装的「声音 AI 全家桶」SDK，一行 Maven 依赖离线跑通 ASR、TTS、声纹识别、VAD、说话人分离、降噪、关键词唤醒七大能力，面向内网部署与隐私敏感场景。

## Key Facts（关键事实）

- 七大能力：离线 ASR、在线流式 ASR、TTS、声纹识别、VAD、说话人分离+转写、KWS 关键词唤醒与降噪，统一走 MicaVoice 门面（asr/onlineAsr/tts/speaker/vad/diarization/kws/denoise/transcribe，均实现 AutoCloseable）。
- 底层：sherpa-onnx（k2-fsa）+ mica-sherpa-onnx 全平台 fat jar（Maven Central），Java 侧零 native 折腾；坐标 net.dreamlu:mica-voice-core。
- 四个模块：mica-voice-core（纯 Java 门面）、Spring Boot starter（mica.voice.* 配置即用，自动装配 9 个 Service Bean）、Solon 插件（JDK 8~26）、示例聚合（console/spring-web/solon-web）。
- 快速开始 3 步：加依赖 → 模型按需下载到 models/（不随 jar 分发，download-models.sh 支持 asr/tts/speaker/asr-online/x-asr/all）→ 注入即用。
- 模型家族：ASR 支持 Paraformer/SenseVoice/Whisper/Moonshine/Zipformer/Nemo-CTC；TTS 支持 VITS/Matcha/Kokoro；声纹 eres2net/campplus（cosine 阈值默认 0.5）；降噪 GTCRN/DPDFNet。
- 项目状态：2026-08-14 创建，截至 2026-10-28 Gitee 69 Star、25 Fork，Apache-2.0，JDK 8+，出品方「如梦技术」（lets-mica 生态，作者 dreamlu）。
- 实操注意：流式 ASR 默认关闭（online.asr.enabled=false）；VAD/分离/KWS/降噪模型无下载脚本需手动从 sherpa-onnx release 下载；ASR 两个 Bean 按具体类型注入避免歧义。

## Important Claims（重要论断）

### Claim 1：Java 做语音的「第三条路」

过去 Java 项目做语音只有两条路——调云 API（联网、密钥、按量计费、数据过他人服务器）或啃 C++ 推理库；mica-voice 给出第三条路：不联网、不花钱、JDK 8 老项目也能接。音频数据不出本地，适合内网部署、政务、工业、隐私敏感场景。

### Claim 2：识别质量上限在模型，不在 SDK

小模型（paraformer-zh-small）离线跑得动，但嘈杂环境、方言口音效果与大厂云 API 有差距；纯 CPU 推理有性能门槛，高并发实时场景需评估线程与硬件。离线不等于免费模型——模型文件来自 sherpa-onnx 社区发布，商用前须确认模型许可与数据合规。

### Claim 3：项目还年轻，不是零配置魔法

2026 年 8 月创建、69 Star，生态与案例在积累；模型目录与模型家族必须配对，配错跑不起来；官方仓库无 GUI，一切以代码接入为准。

## Concepts Introduced（引入的概念）

- 离线 ASR / 流式 ASR（sherpa-onnx 模型家族：Paraformer、SenseVoice、Whisper 等）
- VAD 语音活动检测（silero_vad / ten_vad）
- 说话人分离（pyannote segmentation + eres2net embedding 聚类）
- 关键词唤醒 KWS（zipformer-wenetspeech + keywords.txt）

## Entities Mentioned（提及的实体）

- mica-voice（开源项目，dreamlu / 如梦技术，Gitee）
- sherpa-onnx（k2-fsa 的 ONNX 推理引擎）
- mica-sherpa-onnx（全平台 fat jar 包装）

## Implications（影响／启示）

适合 Java 后端想加语音又不愿调云 API 的开发者、内网/数据不出域的政务工业医疗系统、Spring Boot/Solon 团队、声纹验证/会议分离/KWS 场景产品。不适合要求高识别率、非 Java 技术栈、想要现成 GUI 的场景（非 Java 可看上游 sherpa-onnx 的 Python/C++ 生态）。

## Limitations（局限）

- 单一信源（公众号项目推介文），Star/Fork/创建时间等数据为文章自报的 2026-10-28 快照，文章免责声明已声明「引自项目官方 README，未经独立第三方验证」，项目迭代快需以 CHANGELOG 与 Gitee 实时数据为准。
- 无实测数据：识别质量、性能门槛均为定性描述。

## Related Knowledge（相关知识）

- [[spring-ai]]（Java 生态接入 AI 的另一路径：模型中间层）
- [[agent-tool-security-whitelist]]（工具/能力接入的安全边界思路）

## Source（信源）

- `raw/sources/architecture/2026-11-03-mica-voice-java-offline-speech-sdk.md`
