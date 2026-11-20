---
id: inbox-20261120-weibo-openmotion-ai-video-platform
title: 微博：OpenMotion——开源 AI 视频创作与剪辑平台
source: 微博
source_url: http://t.cn/AXTt6eQh
source_type: link
platform: 微博
created: 2026-11-20
category: 技术
tags: [AI, GitHub, Agent]
asset_ref: Assets/2026-11/openmotion-ai-video-platform.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-20T04:20:34.206Z"
ingest_claim_id: 36488-1795148434206-0
---

# 微博：OpenMotion——开源 AI 视频创作与剪辑平台

> 博主介绍的 OpenMotion：定位为"Claude Motion + 剪映（CapCut）"开源替代的全栈 AI 视频创作平台。上传参考视频或粘贴链接，Agent 即可用自有品牌素材与文案复刻，产出可编辑、可改文案/动效的 MP4。项目以 300+ 动效模板、152+ Brandkit 与 MOTION.md 制作规范沉淀专业经验，并通过 Motion Harness 把创作流程封装为可复用的 Agent 工作流。

## 核心要点

- **定位**：开源全栈 Agent 视频工作室，"Claude Motion + CapCut"替代方案；用 HTML/CSS/JS 描述场景与动效，同一项目可在 Studio 可视化编辑并渲染 MP4。
- **针对三大痛点**：① AI 难以稳定复刻商业视频的镜头语言与动效节奏；② 生成结果缺乏可编辑性，改文案/品牌元素常需重新生成；③ 专业制作经验难沉淀为 Agent 可复用知识。
- **经验沉淀**：以 100+ 公司宣传片为参考案例，整理出 300+ 动效模板与规范、152+ 品牌素材规范（Brandkit）；提出 **MOTION.md**（动效版 DESIGN.md），将镜头顺序、文字节奏、转场、声音设计结构化为 Agent 可理解的制作规范。
- **Motion Harness**：把优秀动效视频的创作流程与审美规则封装为可复用 Agent 工作流，降低对特定顶级模型的依赖。
- **BYOA + BYOK**：自带 Agent（支持 Claude Code、Codex、Cursor 等 22 款）与自有模型 Key；多模态生成接入 GPT Image 2.6、Seedance 2.5、Suno、Eleven v4/Kokoro 等，产出图片、视频、音乐与配音。
- **项目信息**：github.com/nexu-io/openmotion，Apache 2.0，Node.js 22.18+，截至 2026-11-09 约 9.5k stars；本地运行无订阅费，可导入 HyperFrames 项目继续编辑。

## 正文

微博原文（话题 #微博视频号续航计划#）：

> OpenMotion，一个开源的 AI 视频创作与剪辑平台，定位为 Claude Motion + 剪映（CapCut）的开源替代方案。项目地址：github.com/nexu-io/openmotion。它试图解决当前 AI 视频制作中的三个问题：一是 AI 难以稳定复刻高质量商业视频的镜头语言和动效节奏；二是生成结果通常缺乏可编辑性，修改文案、品牌元素或局部动画往往需要重新生成；三是专业视频制作经验难以沉淀为 Agent 可以复用的知识。为此，OpenMotion 将 100 多家公司的宣传片作为参考案例，整理出 300+ 动效模板与规范、152+ 品牌素材规范（Brandkit），并提出 MOTION.md——动效版 DESIGN.md，将镜头顺序、文字节奏、转场、声音设计等信息结构化为 Agent 可理解的制作规范。项目还引入 Motion Harness，把优秀动效视频的创作流程和审美规则封装为可复用的 Agent 工作流，降低对特定顶级模型的依赖。

仓库 README 补充要点：

- 创作流程四步：拆解参考片（在 Motion.md 记录镜头顺序、转场、声音提示）→ Agent 用品牌套件重建 HTML 场景并排入可编辑时间线 → 对比原片与复刻调整节奏 → 导出 MP4 并保留 HTML 源码与素材。
- Motion.md 的 Brand Kit 区记录品牌身份、文案与经批准的产品素材，Design 区可引用独立 DESIGN.md 视觉规范；另有 Motion Package v0.2 草案用于打包分享整套动效规范。
- 多模态模型网关：图片（Codex Image、Nano Banana、FLUX）、视频（Seedance、Wan、Kling）、音乐（Suno）、TTS（Kokoro、Eleven v4），密钥存于工作区、与视频项目分离。

## 来源

- 微博原文（t.cn 短链，指向微博视频号页面，正文页有登录墙）：http://t.cn/AXTt6eQh
- 项目仓库（原件已归档为 README 全文）：https://github.com/nexu-io/openmotion
- 模板库：https://open-design.ai/templates/

## 附件

[[Assets/2026-11/openmotion-ai-video-platform.md]]
