---
title: 告别云语音 API！Java 离线语音 SDK，一行 Maven 依赖，7 大音频能力本地运行
source: IT开源项目精选（微信公众号）
source_url: https://mp.weixin.qq.com/s/o0OBULKXFmZJCXA66Rzbg
source_type: article
platform: 微信公众号
captured: 2026-11-03
registered_at: 2026-11-04
inbox_ref: Inbox/2026-11-03-mica-voice-java-offline-speech-sdk.md
asset_ref: Assets/2026-11-03/weixin-article-o0ob.md
---

点击下方【**IT开源项目精选**】

「**关注**」、选择「**设为星标**」

每天三分钟、打卡阅读

最快获取全网学习干货、行业资讯

## 前言

大家好，这里是 IT开源项目精选！

Java 项目想做语音功能，过去基本两条路：要么调云厂商的 API（要联网、要密钥、按量计费，数据还得过别人的服务器），要么自己去啃 C++ 的推理库，光编译环境就能劝退一批人。

今天这个项目，给 Java 开发者第三条路：**一行 Maven 依赖，离线跑通语音识别、语音合成、声纹识别、VAD、说话人分离、降噪、关键词唤醒**——不联网、不花钱、JDK 8 老项目也能接。

本期拆解这个 Java 离线语音 SDK。

## 简介

**mica-voice**（gitee.com/dreamlu/mica-voice）是 Java 生态的**声音 AI 全家桶 SDK**：离线语音识别（ASR）、语音合成（TTS）、声纹识别、VAD 语音活动检测、说话人分离、音频降噪、关键词唤醒（KWS）七大能力，一套 API 统一封装。它基于 **sherpa-onnx**（k2-fsa 的 ONNX 推理引擎），配套的全平台 fat jar（mica-sherpa-onnx）已发布到 Maven Central，Java 侧零 native 折腾。截至 2026 年 10 月 28 日，Gitee **69 Star**、25 Fork，协议 **Apache-2.0**，2026 年 8 月 14 日创建，JDK 8+ 兼容，出品方"如梦技术"（lets-mica 生态，作者 dreamlu）。

核心能力一句话：**纯 Java 门面一行拿到服务，Spring Boot / Solon 自动装配 9 个 Service Bean，模型按需下载，完全离线本地推理**。

## 核心定位：把"语音 AI 全家桶"装进 Java 工程

mica-voice 想解决的是 Java 生态的痛点：语音 AI 能力很强，但要么在 Python 生态里，要么要调云 API。它把 sherpa-onnx 的能力用纯 Java 重新包装，做成"**引依赖 → 下模型 → 写两行代码**"的开箱体验，并且全离线——音频数据不出本地，特别适合内网部署、政务、工业、隐私敏感场景。

项目分成四个模块：核心 SDK（mica-voice-core，纯 Java 统一 API）、Spring Boot starter（mica.voice.\* 配置即开箱即用）、Solon 插件（同配置树一行接入，JDK 8~26）、示例聚合（console 纯 Java / spring-web / solon-web 三个真实场景示例）。

坐标: net.dreamlu:mica-voice-core（Maven Central）

生态: Spring Boot starter · Solon plugin（JDK 8 ~ 26）

推理: sherpa-onnx（k2-fsa）→ mica-sherpa-onnx 全平台 fat jar

运行: 完全离线 · 模型按需下载到 models/ 目录

示例: console / spring-web（WebSocket 流式 ASR）/ solon-web

## 核心能力：七大声音 AI 能力一把梭

**① 离线语音识别（ASR）。**支持 Paraformer、SenseVoice、Whisper、Moonshine、Zipformer、Nemo-CTC 多模型家族；中文模型 sherpa-onnx-paraformer-zh-small 开箱即用。SenseVoice 还支持中英日韩粤多语言与逆文本规范化（还原数字/标点）。

**② 在线流式 ASR。**X-ASR / Streaming Paraformer，浏览器麦克风 → WebSocket → 流式识别，边说话边出字；带句尾静音自动结束的端点规则（三档可调）。

**③ 语音合成（TTS）。**VITS / Matcha / Kokoro 模型家族；纯中文用 vits-icefall-zh-aishell3，中英混合用 vits-melo-tts-zh\_en；多说话人模型可指定 speaker-id，语速可调，支持回调式流式合成。

**④ 声纹识别。**eres2net / campplus 候选模型，cosine 相似度阈值判定（默认 0.5），可做声纹注册、验证、身份确认。

**⑤ VAD 语音活动检测。**silero\_vad / ten\_vad，静音/语音切分，最小静音、最大语音时长都可配——做"一句话说完自动停"或长音频分段。

**⑥ 说话人分离 + 转写。**pyannote segmentation + eres2net embedding，自动聚类区分"谁在说话"；配合 ASR 可做"分离 + 转写"组合——会议录音按人拆稿。

**⑦ 关键词唤醒（KWS）与降噪。**zipformer-wenetspeech KWS 模型配 keywords.txt 唤醒词表；GTCRN（轻量流式）/ DPDFNet（高质量离线）两种降噪模型，衰减强度可调。

全部能力走同一个 **MicaVoice 门面**（均实现 AutoCloseable，建议 try-with-resources）：asr / onlineAsr / tts / speaker / vad / diarization / kws / denoise / transcribe 一行拿到对应服务。

## 快速开始（3 步接入）

**第 1 步：加依赖。**

```xml
<dependency>
  <groupId>net.dreamlu</groupId>
  <artifactId>mica-voice-spring-boot-starter</artifactId>
  <version>${mica-voice.version}</version>
</dependency>
```

**第 2 步：下模型。**模型不随 jar 分发，按需下载到 models/ 目录：

bash models/scripts/download-models.sh asr # 按需换 tts / speaker / all

java -Dmica.voice.models-dir=E:/models -jar app.jar # 或用参数指定模型绝对路径

**第 3 步：注入即用。**Spring Boot 自动装配 9 个 Service Bean，直接注入调用：

```java
@RestController
public class AsrController {
    private final OfflineAsrService offlineAsrService;

    // 构造注入后直接：
    return offlineAsrService.recognize(wavFile).getText();
}
```

纯 Java（非 Spring/Solon）项目用 mica-voice-core + MicaVoice 门面，一行拿到 AsrService / TtsService / SpeakerService 等，用法一致。

## 实操要点

**模型按需下载，别一把梭。**下载脚本支持 asr / tts / speaker / asr-online / x-asr / all 等 target，先只下要用的小模型（如 paraformer-zh-small），跑通再加别的。

**VAD/分离/KWS/降噪模型要自己补。**这几类暂无下载脚本 target，需从 sherpa-onnx release 手动下载到 models/ 根目录，README 有明确说明。

**流式 ASR 默认关闭。**online.asr.enabled 默认 false，要做 WebSocket 流式识别需先下流式模型并打开开关。

**Bean 按具体类型注入。**ASR 两个 Bean 按 OfflineAsrService / OnlineAsrService 具体类型暴露，避免同接口多 Bean 注入歧义。

**资源要释放。**所有 Service 实现 AutoCloseable，用 try-with-resources；starter 容器关闭时统一释放 native 资源。

**离线不等于免费模型。**模型文件本身来自 sherpa-onnx 社区发布，商用前确认所用模型的许可与数据合规。

## 几句实在话：这些情况别指望它

**① 识别质量上限在模型。**小模型（paraformer-zh-small）离线跑得动，但嘈杂环境、方言口音的效果和大厂云 API 有差距；要质量得上更大的模型，吃内存和 CPU。

**② 纯 CPU 推理有性能门槛。**离线推理占 CPU，并发高、实时要求高的场景要评估线程数与硬件。

**③ 项目还年轻。**2026 年 8 月创建、69 Star，迭代快但生态和案例还在积累，深度使用注意看 CHANGELOG。

**④ 不是"零配置"魔法。**模型目录、模型家族（PARAFORMER/SENSE\_VOICE/WHISPER…）都要配对，配错了跑不起来，需要读 README 字段说明。

**⑤ 官方仓库没有界面截图。**这是 SDK 不是成品应用，没有现成 GUI 给你点，一切以代码接入为准。

**⑥ 数据安全自己把关。**涉及真实语音数据（尤其政务、医疗场景）时，遵守数据安全与个人信息保护法规。

## 适合谁

适合五类人：Java 后端想给项目加语音识别/合成、又不愿调云 API 的开发者；做内网部署或数据不出域的政务、工业、医疗系统；用 Spring Boot 想"引依赖即用"的团队；用 Solon 框架需要同款能力的开发者（JDK 8~26）；以及想做声纹身份验证、会议说话人分离、关键词唤醒等场景的产品。

**不适合：**要求高识别率、需要大厂级云服务的场景；非 Java 技术栈（可看上游 sherpa-onnx 的 Python/C++ 生态）；以及想要现成 GUI 应用的人。

## 更新进度

**100 期优质开源项目更新进度：064/100。**欢迎在留言区聊聊你的 Java 项目接了什么 AI 能力，或提名下一期想拆解的开源项目。

## 开源地址

Gitee：gitee.com/dreamlu/mica-voice

Maven Central：net.dreamlu:mica-voice-core（坐标发布在中央仓库）

协议：Apache-2.0 · 分支：main · JDK 8+

获取更多精彩内容和优质开源项目

请关注微信公众号「IT开源项目精选」

每天早上 5 分钟，看懂一个值得收藏的开源项目

## 免责声明

1、本文所分享的软件、代码或资源，均来自开源社区，遵循其原始许可证。本项目采用 Apache-2.0 许可证，仅供学习和研究使用。

2、本文数据（Star、Fork、创建时间）来自 Gitee 官方 API 与项目公开信息，采集时间为 2026 年 10 月 28 日，项目迭代迅速，实际数据可能已更新。

3、"七大能力""9 个 Service Bean""全平台 fat jar""JDK 8+ 兼容"等表述均引自项目官方 README，未经独立第三方验证。

4、官方仓库无产品界面截图，本文配图使用官方头像与代码示例，未使用伪造产品界面；识别/合成质量取决于所配置的模型与硬件。

5、mica-voice 基于 k2-fsa/sherpa-onnx 与 lets-mica/mica-sherpa-onnx，模型文件需按官方说明下载；商用前请确认所用模型的许可。

6、本文与项目作者无商业合作，所有观点基于公开资料得出；若您为相关资源的版权方并对内容有异议，请联系我们，我们将在第一时间处理。
