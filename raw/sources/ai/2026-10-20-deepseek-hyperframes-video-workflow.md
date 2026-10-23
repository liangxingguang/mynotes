---
title: 用 DeepSeek + HyperFrames 做视频：AI 写网页、逐帧渲染成 MP4 的科普视频流水线
source: 知乎专栏
source_url: "https://zhuanlan.zhihu.com/p/2095222728152330716"
source_type: link
platform: 知乎
captured: 2026-10-20
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-20-deepseek-hyperframes-video-workflow.md
asset_ref: Assets/2026/10/deepseek-hyperframes-video-workflow.md
---

# 用 DeepSeek + HyperFrames 做视频：AI 写网页、逐帧渲染成 MP4 的科普视频流水线

# 用 DeepSeek + HyperFrames 做视频，效果惊艳！

> 来源：https://zhuanlan.zhihu.com/p/2095222728152330716 （知乎专栏，经 jina 抓取）
> 项目地址：https://github.com/heygen-com/hyperframes

昨天周六，[DeepSeek](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=DeepSeek&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJEZWVwU2VlayIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.BIlQ6Q-KxirPTbhD8HZ4hxChnuF0mxB1H9J133OK6mI&zhida_source=entity) 又趁着大家休息的时间发布新模型 V4.1-[Flash](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=Flash&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJGbGFzaCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.RbrFXZpX3vIAU9UkKy_2NssvVMDE5F_G8NqHuJ9nDkU&zhida_source=entity)-1017，这一次更新来头不小。

主打「[许愿式编程](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E8%AE%B8%E6%84%BF%E5%BC%8F%E7%BC%96%E7%A8%8B&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLorrjmhL_lvI_nvJbnqIsiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.QMNbxxJTbWfLsbP87J8NcBJPjCfs5foypVRTzarEYU4&zhida_source=entity)」，只要说清楚想要什么，模型就会自己规划、写代码、检查再修改，从零做出一个完整的项目。

在 11 项[基准测试](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E5%9F%BA%E5%87%86%E6%B5%8B%E8%AF%95&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLln7rlh4bmtYvor5UiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.amPVu4i3dcmHUG2IrJdA-683DUlEZyS-WynrxK1VQoc&zhida_source=entity)评分里，可以看出比上一版提升了不少，甚至有好几项超越 [Claude Opus](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=Claude+Opus&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJDbGF1ZGUgT3B1cyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.ILt-xlo7SOVFehVIkkw3O1dJ1f4JCQ3ypWbNsl6dbkg&zhida_source=entity) 5 和 [GPT 5.6-Sol](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=GPT+5.6-Sol&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJHUFQgNS42LVNvbCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.vEqgscpDscDc0RlKz4OdYN_y0moczgUEs1-QR4MW8Vg&zhida_source=entity)。

![Image 1](https://pic4.zhimg.com/v2-2c765d3f413653d5beead9d87f9ff243_1440w.jpg)

目前已经可以在网页端、App 和 API 上使用新模型，API 的调用方式和价格都没变，继续用 deepseek-flash 就能调到新模型。

而且这一次模型干活更快，但花的钱却更少了，拉到最高 max 档跑一个编程任务平均约 1.3 元，上一版要 3.3 元左右。

从官方给出故宫 3D [建模](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E5%BB%BA%E6%A8%A1&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLlu7rmqKEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.T0DDqH-BZ2E6eWKRDmDFthEOEA5zVoNvY74I-LAAEXc&zhida_source=entity)、网页赛车游戏、《传送门 2》复刻等演示案例来看，做视频效果相当惊艳。

尤其一段「Valley of Ages 3D 场景」 是我最喜欢的，同一片河谷从[史前](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E5%8F%B2%E5%89%8D&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLlj7LliY0iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.IaEB0WTD-EcCNksWGQ4MyzLTVcWlh4fy7T99sToFZtw&zhida_source=entity)一路演变到现代，看着就像一段动画短片。

![Image 2: 动图封面](https://pic3.zhimg.com/v2-45949b29f2d4c859a79ecfe2188b01da_b.jpg)

不过这些演示都是在浏览器里跑的网页，想变成一条能发的视频，还得自己录屏、配乐、对齐节奏。

于是我在 [GitHub](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=GitHub&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJHaXRIdWIiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.d2_g8S1-NnOSUnAc8kd7K-MxCSikJ55KO9qD-nzXHcM&zhida_source=entity) 上找到了一个[开源工具](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E5%BC%80%E6%BA%90%E5%B7%A5%E5%85%B7&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLlvIDmupDlt6XlhbciLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9._cktjVrW3i8UjyAIyu1koEAYMZh4uOC02PaPCebsz5g&zhida_source=entity)：**[HyperFrames](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=HyperFrames&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJIeXBlckZyYW1lcyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.6pU1Zrj6w9_3tFri6tOd2a0D735dzWHgUiFyTjktshk&zhida_source=entity)**，能让 DeepSeek 做出来的视频更加惊艳，补齐视频配乐的短板。

该工具是由做 AI 视频头部团队 [HeyGen](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=HeyGen&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJIZXlHZW4iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.hlfeBchcSV_H99Pm_q0TfCnXgZR53MTHvzPDx2PpYro&zhida_source=entity) 开源，专门给 AI Agent 使用，已狂揽了 6.6 万 [Star](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=Star&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJTdGFyIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjg1NjcwMzY5LCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.dHUtduYK2z7i78Ddh1siixu7BGHrOfFlsp0pSCiAOYA&zhida_source=entity)。

![Image 3](https://pic2.zhimg.com/v2-96f224fc0cea8dc1d20547af0b6df303_1440w.jpg)

在 HyperFrames 里，一条视频其实是一个网页文件，标题、图片、动画、背景音乐都写在里面。

每样东西什么时候出现、出现多久，在网页里使用的是标签标好。

写好之后在浏览器里就能实时预览，改一处刷新一下，马上就能看到效果。

渲染的时候，它会在后台打开浏览器，一帧一帧地截下来，再用 [FFmpeg](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=FFmpeg&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJGRm1wZWciLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.61EFKDcRVCK1YU1bgmjAGEAkckx-ZbrwqIdGMK8ljsM&zhida_source=entity) 合成 MP4。

因为是逐帧截取而不是录屏，不用担心卡顿[掉帧](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E6%8E%89%E5%B8%A7&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLmjonluKciLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.YW0bZgxRd-Wuw9TeQfW8fir3W7x4MgjX4MM0zyl_S_E&zhida_source=entity)，同一个文件渲染多少次，出来的视频都是一样。

![Image 4](https://pic1.zhimg.com/v2-f7fc9528e5b5b2676aaf2c7432e78656.jpg?source=25ab7b06)

Agent 上手更是没有门槛，为了让它做得更好，HyperFrames 还准备了 21 个 Skill。

装上之后，它会先跟我们确认需求，再按规划、写页面、加动画、配素材、检查、预览、渲染这一套流程走完。

同时 Skill 里内置了好几套现成的创作流程，会根据我们要做的东西自动挑一套来用。

比如给它一个产品网址，就能做一条宣传片，官方建议的长度在 30 到 90 秒之间。

丢一段文字过去，它能做成一条知识讲解视频，画面里的[文字排版](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E6%96%87%E5%AD%97%E6%8E%92%E7%89%88&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLmloflrZfmjpLniYgiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.Jm11HGHYeY2FSHYQP8tRcQHGyy9RksBoQqPzh78DvD0&zhida_source=entity)、示意图和图表，都由它自己来设计。

手上有一首歌的话，它还能按节拍做一条卡点视频，画面的节奏跟着音乐走。

已经拍好的口播视频也能交给它，加字幕、标题条和[数据标注](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=%E6%95%B0%E6%8D%AE%E6%A0%87%E6%B3%A8&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiLmlbDmja7moIfms6giLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.cKswMz9TIHzn_ykGBHnQO4TwismzBbVk_OLMOtQWMVk&zhida_source=entity)这些图文包装，原片不会被动到。

![Image 5](https://picx.zhimg.com/v2-64414bc5d49a21f88278d8e1e87c3aa7.jpg?source=25ab7b06)

光靠 Agent 自己从零写特效，效果难免参差不齐，所以 HyperFrames 还准备了一个组件库。

转场、动态图表、社交媒体关注浮层这些常用效果都是现成的，一行命令就能装上：

`npx hyperframes add flash-through-white`

内置了很多风格的模板，不同的配色、字体和排版都有，可以挑一个自己喜欢的让 Agent 照着做。

![Image 6](https://pic2.zhimg.com/v2-653ccb75f2933a7bbf7eafeaeeb9f95b_1440w.jpg)

接下来，介绍一下如何将 DeepSeek 新模型接入 [Codex](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=Codex&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJDb2RleCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.GqNPT8LE4ND_HpjewYp1sdF3RX6WrwWHhtw2BZS4Nok&zhida_source=entity)，并跟 HyperFrames 搭伙做视频。

DeepSeek 官方有提供 [Claude Code](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=Claude+Code&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJDbGF1ZGUgQ29kZSIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.51Bq9-zd4iDnQFaXiSnY7QmQ6EOLwTVgWbr2_RbUJOI&zhida_source=entity) 和 Codex 的一键配置脚本，这里我选择了 Codex。

发送的提示词如下截图，大家可根据自己选择使用的 Agent 工具，稍微改一下即可。

![Image 7](https://pic2.zhimg.com/v2-6506c9dcf861548a5ec0b3a96fa08d25_1440w.jpg)

关于 [API](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=3&q=API&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJBUEkiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NzAzNjksImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MywiemRfdG9rZW4iOm51bGx9.3i2FZwzIMDoGqsvuSAgMSJHXyes7QHjUm3jH3Es_r0w&zhida_source=entity) Key 的获取，大家自行到 DeepSeek 开放平台上创建，还需要往里面充值一点钱。

重新打开 Codex，看到模型用的是 [DeepSeek-Flash](https://zhida.zhihu.com/search?content_id=285670369&content_type=Article&match_order=1&q=DeepSeek-Flash&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2NjU5NjksInEiOiJEZWVwU2Vlay1GbGFzaCIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY3MDM2OSwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.-EfwRHyN-tFmtGu60Mo9YWLnfc0G0DsFGc5xq3ZKJ7k&zhida_source=entity)，就说明接好了。

接着装上 HyperFrames 的 Skill，电脑上要先有 Node.js 22 以上的版本和 FFmpeg：

`npx skills add heygen-com/hyperframes`

![Image 8](https://pica.zhimg.com/v2-bba171e55d976b35096a9b295d2c5806_1440w.jpg)

一切准备好，让 DeepSeek 用 HyperFrames 做一段讲解「降噪耳机怎么把噪音消掉」的科普视频。

结果有点出乎意料，整个生成过程用了 18 分钟，在开放平台上看到仅花了 1 块钱左右。

配音用的本地 Kokoro，支持中文普通话可自由更换男女声，不需要额外花钱。

![Image 9](https://pic2.zhimg.com/v2-b72a604230052a0fd74d9d83185b41e7_1440w.jpg)

最后看下视频效果，中文口播配音准确，讲解的知识点也干，一段 40 秒视频就把耳机降噪的工作原理讲清楚了。

![Image 10](https://picx.zhimg.com/v2-8932b637554bb5500d996bdcca153ba3.jpg?source=25ab7b06)

### **写在最后**

以前想做一条像这样带有动效的科普视频，要么花时间去学 AE、剪映这些软件，要么就得花钱找人来做。

现在把想要的效果说清楚，DeepSeek 负责写页面，HyperFrames 负责做好转场、字幕和配音，再渲染成视频。

而且 DeepSeek 新模型的价格的确也便宜，对视频哪里不满意，可以放心让它去多改几版，用不了多少钱也不心疼。

如果做这类科普视频流程跑通了，可以把它们发到各大短视频平台，直接起号涨粉。感兴趣的朋友，不妨先拿一条十几秒的小片子练练手。

GitHub 项目地址：[https://github.com/heygen-com/h yperframes](https://link.zhihu.com/?target=https%3A//github.com/heygen-com/hyperframes)

今天的分享到此结束，感谢大家抽空阅读，我们下期再见，Respect！
