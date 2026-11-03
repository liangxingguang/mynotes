---
id: 2026-11-03-mica-voice-java-offline-speech-sdk
title: 告别云语音 API！Java 离线语音 SDK，一行 Maven 依赖，7 大音频能力本地运行
source: IT开源项目精选（微信公众号）
source_url: https://mp.weixin.qq.com/s/o0OBULKXFmZEJCXA66Rzbg
source_type: article
platform: 微信公众号
created: 2026-11-03
category: 技术
tags: [Java, AI]
asset_ref: Assets/2026-11-03/weixin-article-o0ob.md
wiki_status: pending
---

# 告别云语音 API！Java 离线语音 SDK，一行 Maven 依赖，7 大音频能力本地运行

> 摘要：mica-voice 把 sherpa-onnx 用纯 Java 重包装成"声音 AI 全家桶"SDK：一行 Maven 依赖即可离线跑通 ASR、TTS、声纹识别、VAD、说话人分离、降噪、关键词唤醒七大能力，Spring Boot/Solon 自动装配，音频数据不出本地，适合内网与隐私敏感场景。

## 核心要点

1. 痛点：Java 做语音只有两条路——调云 API（联网/密钥/计费/数据过他人服务器）或啃 C++ 推理库；mica-voice 给出第三条路
2. 七大能力：离线 ASR、在线流式 ASR、TTS、声纹识别、VAD、说话人分离+转写、KWS 关键词唤醒与降噪
3. 底层：sherpa-onnx（k2-fsa ONNX 推理引擎）+ mica-sherpa-onnx 全平台 fat jar（Maven Central），Java 侧零 native 折腾
4. 模块：mica-voice-core 纯 Java 门面、Spring Boot starter、Solon 插件（JDK 8~26）、console/spring-web/solon-web 三示例
5. 3 步接入：加依赖 → 模型按需下载到 models/（不随 jar 分发）→ 注入即用（自动装配 9 个 Service Bean）
6. 统一门面 MicaVoice：asr/onlineAsr/tts/speaker/vad/diarization/kws/denoise/transcribe 一行拿服务，均 AutoCloseable 建议 try-with-resources
7. 模型家族：ASR 支持 Paraformer/SenseVoice/Whisper/Moonshine/Zipformer/Nemo-CTC；TTS 支持 VITS/Matcha/Kokoro；声纹 eres2net/campplus；降噪 GTCRN/DPDFNet
8. 注意：流式 ASR 默认关闭；VAD/分离/KWS/降噪模型需手动下载；小模型识别质量不及云 API；纯 CPU 推理有性能门槛；商用前确认模型许可
9. 项目状态：2026-08 创建、Gitee 69 Star、Apache-2.0、JDK 8+（数据截至 2026-10-28，迭代快需看 CHANGELOG）

## 正文

**背景**：Java 项目做语音功能，过去要么调云厂商 API（联网、密钥、按量计费、数据过他人服务器），要么啃 C++ 推理库。mica-voice（gitee.com/dreamlu/mica-voice）给出第三条路：一行 Maven 依赖，离线跑通语音识别、语音合成、声纹识别、VAD、说话人分离、降噪、关键词唤醒——不联网、不花钱、JDK 8 老项目也能接。出品方"如梦技术"（lets-mica 生态，作者 dreamlu）。

**核心定位**：把语音 AI 全家桶装进 Java 工程。纯 Java 重包装 sherpa-onnx，做成"引依赖 → 下模型 → 写两行代码"的开箱体验，完全离线（音频不出本地），适合内网部署、政务、工业、隐私敏感场景。四个模块：核心 SDK（mica-voice-core 统一 API）、Spring Boot starter（mica.voice.* 配置即用）、Solon 插件（JDK 8~26）、示例聚合（console / spring-web / solon-web）。

**七大能力**：
1. 离线 ASR：Paraformer、SenseVoice、Whisper、Moonshine、Zipformer、Nemo-CTC 多家族；中文小模型开箱即用；SenseVoice 支持中英日韩粤与逆文本规范化
2. 在线流式 ASR：X-ASR / Streaming Paraformer，麦克风→WebSocket→边说话边出字，句尾静音自动结束（三档可调）
3. TTS：VITS / Matcha / Kokoro；纯中文 vits-icefall-zh-aishell3，中英混合 vits-melo-tts-zh_en；可指定 speaker-id、语速可调、回调式流式合成
4. 声纹识别：eres2net / campplus，cosine 相似度阈值判定（默认 0.5），支持注册/验证/身份确认
5. VAD：silero_vad / ten_vad，静音/语音切分，最小静音与最大语音时长可配
6. 说话人分离+转写：pyannote segmentation + eres2net embedding 自动聚类，配合 ASR 做会议录音按人拆稿
7. KWS 与降噪：zipformer-wenetspeech KWS 配 keywords.txt 唤醒词表；GTCRN（轻量流式）/ DPDFNet（高质量离线）两种降噪

全部能力走统一 MicaVoice 门面（asr / onlineAsr / tts / speaker / vad / diarization / kws / denoise / transcribe），均实现 AutoCloseable。

**快速开始 3 步**：
1. 加依赖：net.dreamlu:mica-voice-spring-boot-starter
2. 下模型：`bash models/scripts/download-models.sh asr`（按需 tts/speaker/all），模型下载到 models/ 目录，不随 jar 分发
3. 注入即用：Spring Boot 自动装配 9 个 Service Bean，注入 OfflineAsrService 等直接调用；纯 Java 项目用 mica-voice-core + MicaVoice 门面，用法一致

**实操要点**：模型按需下载别一把梭；VAD/分离/KWS/降噪模型暂无脚本需手动从 sherpa-onnx release 下载；流式 ASR 默认关闭（online.asr.enabled=false）；ASR 两个 Bean 按具体类型注入避免歧义；资源要释放（try-with-resources，starter 容器关闭时统一释放 native）；离线不等于免费模型，商用前确认模型许可与数据合规。

**别指望它的情况**：识别质量上限在模型（小模型嘈杂/方言场景与云 API 有差距）；纯 CPU 推理有性能门槛（高并发实时场景需评估线程与硬件）；项目还年轻（69 Star，生态案例在积累）；不是零配置魔法（模型目录与家族配错跑不起来，需读 README）；没有现成 GUI；数据安全自己把关（政务/医疗场景遵守法规）。

**适合谁**：Java 后端想加语音又不愿调云 API 的开发者；内网/数据不出域的政务、工业、医疗系统；Spring Boot 团队；Solon 开发者；声纹验证、会议分离、KWS 场景产品。不适合：要求高识别率、非 Java 技术栈、想要现成 GUI 的人。

**开源地址**：Gitee dreamlu/mica-voice；Maven Central net.dreamlu:mica-voice-core；Apache-2.0；JDK 8+。

## 来源

[告别云语音 API！Java 离线语音 SDK，一行 Maven 依赖，7 大音频能力本地运行 - 微信公众号](https://mp.weixin.qq.com/s/o0OBULKXFmZEJCXA66Rzbg)

## 附件

[[Assets/2026-11-03/weixin-article-o0ob.md]]（抓取正文）
