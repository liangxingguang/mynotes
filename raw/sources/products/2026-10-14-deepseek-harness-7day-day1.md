---
title: 7天学懂DeepSeek Harness 实操手册（2万字长文）· Day 1
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/NMvxgqUhH4vBaYyrdFLQgQ
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-20
inbox_ref: Inbox/2026-10-14-deepseek-harness-7day-day1.md
---

中秋到国庆我直接有了 13 天休息时间。

我的计划不休息，出品不少于 4 个专栏手册。

WorkBuddy、DeepSeek Harness、Codex 目前已经大部分完成了。

前两天我刚发布了`[WorkBuddy 7天入门级教程](https://mp.weixin.qq.com/s?__biz=MzcwMDQyNzUzNA==&mid=2247485056&idx=1&sn=b43379c59731170a6592706bfe3ff2ed&scene=21#wechat_redirect)`，反馈和数据都特别好。

![image](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

后台很多读者想让我继续出`DeepSeek Harness` 教程。

上一篇 `Harness` 教程发出去以后，后台被一个问题刷屏了。

[DeeSeek Harness最新教程，看完我奶奶都会用了！](https://mp.weixin.qq.com/s?__biz=MzcwMDQyNzUzNA==&mid=2247484654&idx=1&sn=afa76994ebce11d42997e2ca61a075e0&scene=21#wechat_redirect)

**装是装好了，然后呢？**

界面一打开，模型让你选，推理等级让你选，右上角还藏着四种模式。

好多朋友卡在第一小时，愣是没敢下手。

> 9.29 日DeepSeek Harness v0.2 预览版正式发布，并提供开箱即用的 macOS 和 Windows 桌面端安装包，下载安装后，跟随引导即可轻松上手。

![image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

我也熬夜爆肝了**24个小时**，把这份7天教程肝完了。

这篇专栏同样接近2万字左右，建议大家先收藏，后学习。

因为专栏内容多，为了方便大家学习，我分成了7篇文章。

这里是 7 天精通 `DeepSeek Harness` 手册的第1天。

> 第一天专门治卡壳：认界面、办钥匙、选模式，三件事走完你就能正常开工。

后面六天的路也提前预告下：派活、分身、排错、插件、换脑、造扳手，一天一关，`七天玩透 Harness`。

**Day1 | 装好之后的第一小时这么干**

## 一、先认识这张脸：五分钟界面动线

`Harness` 小白第一次看确实有点懵。

别慌，第一小时用不到全部按钮，跟着我从左到右走五站就行。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第一站，模型选择器。

模型这里有 `Flash` 和 `Pro` 两档可以选择。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

给小白的口径：日常任务选 `Flash` 就够了，重活再上 `Pro`。

推理等级管的是它答题前想多深，越深越烧 `token` 速度也越慢。

这档先保持默认，哪天发现它答得浅、错得多，再往上调一档；简单杂活别拉满，纯属烧钱。

第二站，中间的大输入框。

这是你派活的窗口，所有任务都从这里发出去。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第三站，工作区显示。

一般在左上角，显示的是它被允许干活的文件夹路径，也就是它的地皮，上一篇`Harness`教程讲过怎么划。

地皮路径不对，后面所有活都会落错地方，开工前扫一眼就行。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第四站，右上角的模式按钮。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这是我们今天的正主，第三节到时候也会细讲。

第五站，设置入口，一般是个齿轮图标。

等下填钥匙要用它，先混个脸熟。

## 二、办钥匙：注册 API 并填进去

`Harness` 本身只是工位，真正干活的大脑是 `DeepSeek` 的模型，调用模型要花一点钱，所以得办把钥匙。

这把钥匙叫 `API key`，办加填一共五步。

第一步，搜索 `DeepSeek` 开发平台。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

用手机号注册登录，或者微信扫码登录。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

看到这个就是 `DeepSeek` 的开放平台。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第二步，左侧菜单找到 `API keys`，点创建，随手起个名字（**这个名字也可以是你的昵称哦**），比如测试。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第三步，生成的 `key` 只显示这一次，立刻复制，存进你的备忘录。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**这一步手慢的代价是删了重来，别问我怎么知道的。**

顺手把三条血泪史记上：key 等于钱包密码，不发群、不截图、不外传，泄露了立刻回来重置一个。

第四步，在开放平台里充一点钱。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

按量计费，先充最小的额度试水，跑顺了再补。

第五步，回到 `Harness`，点开第一站认识的那个齿轮，找到填 `key` 的地方，把钥匙粘进去，保存。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

然后发条消息测试，它回话了，工位就正式通电了。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

（看到测试回复弹出来的那下，才算真装完，前面全是准备工作，哈哈）

## 三、四种模式，一张表选对

钥匙插上，再看右上角的模式按钮。

`Harness` 的四种模式，本质上不是四种功能，是四套出厂预设，官方管它们叫模板，方便你开箱即用。

![Image](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

我给你压成一张速查表，对着自己的处境抄：

```
【DeepSeek Harness 模式速查表】标准模式 → 新手无脑选，能力全配齐（文件编辑、Shell、搜索、计划、子 Agent、工作流）PTC 模式 → 一次跑一段程序省 token，调试难，用熟标准模式后再玩极简模式 → 只留命令行和文件编辑，测裸模型用的，日常别碰创造模式 → 它能检查自己、改造自己，给自己造插件造模式（第七天主讲）
```

逐个说两句人话。

> 标准模式是全能工位，文件读写、终端命令、网页搜索、列计划、派分身，全都配好了，你只管派活。

它就是新手的一切，日常整理文件、写文档、做小统计，全在这一档里完成。

`PTC` 模式有点硬核，它让模型写一段程序，把好几个工具调用打包一次跑完，来回对话少了，`token` 也省了。

什么时候会想开它？

大量重复的工具往返，比如几百个文件挨个检查改写，打包跑一遍能省不少。

对于新手来讲，调试门槛高，标准模式用满一个月再来碰它，信我。

极简模式是素颜状态，只留一把命令行一个文件编辑器，目的是给模型做裸测。

**我唯一用它的时候，是接入新模型，想先测测它裸装的本事。**

日常千万别停在这档，你会发现它笨得可爱，别慌，切回来就好。

创造模式是最特别的一个，它能检查自己身上有什么插件，缺什么就现场造一个装上。

这个玩法值得单独一天，第七天到时候我会详细讲。

（第一小时你就干一件事：确认自己停在标准模式，对，就是这么简单）

顺手把第一小时最容易栽的三个坑标出来：

> 1.工作区路径没扫一眼就派活，活全落错地方。 2.手滑切进极简模式，嫌模型笨，其实是你站错了档。 3.测试消息发出去没反应，先查 key 有没有粘错，再看平台余额够不够。

## 四、发第一条指令：让它自我介绍

选好模式，最后一步可选可不选，新手小白可以体验一下让它报个到，嘿嘿!

这条指令以后很有用，先给模板，把 \_\_\_\_ 换成你的项目文件夹名：

```
请报告你当前的工作状态：一、当前模式和模型；二、你身上有哪些能力和插件，按用途分组；三、当前工作区路径，确认是不是指向 ____ 这个文件夹。不确定的说不确定，不要猜。
```

它会老老实实报一遍自己在用什么模式、什么模型、装了哪些插件。

这份清单有两个用处。

日常用：派活之前扫一眼，知道它今天带没带某件工具。

进阶用：等第五天你装完插件，再跑一遍这条指令，前后一对比，多出来的就是新家当。

## Day1 小结

第一小时真正要紧的，是认全五个地方、插好一把钥匙、选对一个预设。

开工的仪式感不在多，在于每一件都到位。

**第一小时多花的那十分钟，后面六天都会给你省回来。**

最后，我把今天这篇教程压缩成三句话，你记得带走：

> 1.  界面五站：模型、输入框、工作区、模式、设置。 2. key 只显示一次，存好再关页，不发群不截图。 3. 四种模式是四套预设，新手无脑标准模式。
>     

手册第1天，就到这里了。

明天第2天，我们讲派活的艺术，先看计划，再放它干活。

`Harness` 系列教程大家点击下方**目录**继续学习。

如果觉得不错，随手点个赞、在看、转发三连吧，如果想第一时间收到推送，也可以给我个星标⭐～谢谢你看我的文章，我们，下次再见。
