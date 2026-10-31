大家好，我是咘噜鸭！

前段时间， Karpathy 提出了用 LLM 管理个人知识库的一个核心思路：

不要把 LLM 当搜索引擎用，而是让它像程序员写代码一样，帮你持续维护一个 Markdown 知识库。

你负责找资料、提好问题，LLM 负责所有的脏活累活：总结、交叉引用、分类整理、保持一致性。

你在 Obsidian 里浏览，LLM 在后台编辑，知识库就像滚雪球一样越滚越大。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

一个精心策划的知识存储，文档之间的关联和文档本身一样有价值。

但是，对于不懂技术的用户，用Obsidian+LLM搭建知识库是很困难的。

于是，我们可以在 WorkBuddy＋ima的基础上，加入 Wiki 的核心思路，搭建一套能让文档交叉索引，让知识复利增长的知识库。

WorkBuddy 负责读取资料、核对数据、分析问题、整理复盘和整合信息，ima 负责保存原始资料、经验档案和任务结果，Wiki 负责按主题给相关内容建立交叉索引。

整个流程其实就一句话：

资料归集 → 分析复盘 → 更新知识库 → 下一次调用 → 行动执行 → 记录反馈

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

电商直播、内容创作、客户服务、项目执行、个人学习等等，都可以按同一套思路搭建知识库。

接下来，我就用真实的电商直播场景，给大家展示具体搭建方法。

第一步：把 ima 接进 WorkBuddy

先打开 WorkBuddy，找到 ima 知识库入口。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

点击 ima，按界面提示完成授权。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

到这里，ima 和 WorkBuddy 就算彻底打通了。

第二步：在知识库中建好三个文件夹

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

打开 ima，新建一个知识库，可以叫《经验复用知识库》。已经有合适的知识库，也可以继续使用。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

然后在里面建三个文件夹：

```
01_原始资料
```

这三个文件夹各管一件事。

文件夹

放哪些文件

01\_原始资料

数据表、项目文档、会议纪要、过程记录、沟通反馈、阶段总结、规则与模板

02\_经验档案

背景画像、知识库导航、主题档案、方法页、常见问题、固定流程、指标口径

03\_任务结果

分析报告、阶段复盘、行动清单、周期总结、知识库检查报告

不同场景，只是装进去的内容不同：

使用场景

原始资料

沉淀的经验

电商直播

直播后台数据、投流记录、商品资料、现场记录

成交下滑怎么查、投流怎么复盘、讲解与链接如何衔接

内容创作

选题记录、内容数据、修改稿、读者反馈

哪类选题值得复用、修改了什么、后续表现怎样

客户服务

问题记录、处理过程、回访结果、规则说明

高频问题怎么处理、哪些方法适用于哪些情况

项目执行

任务表、会议纪要、排期、验收反馈

需求变更怎么查、延期怎么处理、协作如何衔接

个人学习

练习记录、错题、阶段测试、学习总结

哪类错误反复出现、什么方法有效、下一步怎么练

注意：这里 ima 虽然和 Workbuddy 连着，但是不能直接在 Workbuddy 里给 ima 建立文件夹。可以用下载 ima，用自带的Agent来创建，或者在ima中手动创建。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第三步：放进第一批能用起来的资料

第一次建库，别急着把所有文件全倒进去，先放入几个资料，把整个流程跑通再说。

可以直接打开 ima，点击选好知识库之后，点击右上角的加号导入内容。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

我们在看文章的时候，也可以顺手点击右上角的三个点，在“更多打开方式”中选择 ima，再点击“加入 ima 知识库”。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

第四步：让 WorkBuddy 初始化经验档案

现在，01\_原始资料里面已经有各种资料了。

但是，WorkBuddy 此时并不知道你是谁，主要做什么，这些资料跟你有什么关系，想要解决什么问题，有什么工作习惯。

回到 WorkBuddy，把刚才上传到《01\_原始资料》中的资料添加到对话任务。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

然后，把下面这段提示词发给它：

```
我正在搭建一个长期使用的经验知识库，希望以后分析数据、处理问题、复盘工作时，都能用上以前积累的资料和经验。
```

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

回答时不用写长篇介绍，把当前做的事和最头疼的问题说清楚就好。

收到文件后，看看AI 有没有正确理解目标。确定没问题了，点击更多→上传到云端→ ima, 把这三份文件放进《02\_经验档案》文件夹。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

《001\_背景画像.md》让 AI 了解你的情况，《002\_知识库导航.md》指引AI找到做事需要的资料，《003\_知识库维护约定.md》交代了知识库维护规则。

第五步：让知识库干一次活

初始化完成后，知识库有了雏形，接着就让它干一次活。只有真正用起来，才能把数据和经验变成持久的、可复利增长的资产。

于是，我把下面这段提示词发给 WorkBuddy：

```
我想复盘9月10日的直播情况，和9月3日那场做个对比。
```

这个时候， WorkBuddy 掌握了背景信息、运营数据、历史经验，给出的结果就不一样了。

它给出来的东西，不再是那种通用知识内容，而是针对性的、精准分析的回复内容。

第六步：把复盘结果更新进知识库

这一步，是持续、增量构建和维护知识库的关键步骤。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

要做的是，告诉 WorkBuddy，把验证过的经验更新进知识库，提示词是这样的：

```
请把复盘结果更新进知识库。
```

一个结构化的、互相链接的知识库就建立起来了。报告按任务保存，Wiki 按主题维护。

从《商品档案》，能找到《直播成交下滑怎么查》，也能回到9月10日那场复盘，看看当时为什么这样判断。

这种“能找到”不是靠 ima 自动交叉索引，而是靠《003\_知识库维护约定》里的规则维护出来的：页面互相写清《完整文件名》、导航里登记入口、双向引用两边都写。AI 不会自动帮你连，约定才让它连得上。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下一次执行新任务前，先调用知识库，并和 WorkBuddy 说清楚任务细节。

然后，照着 WorkBuddy 给出的建议执行新任务；

任务完成后，再把结果反馈给 WorkBuddy。

循环就这样滚动起来了。

第七步：定期给知识库做检查

资料越攒越多，重复、过期和遗漏也会变多。每月检查一次，就是给知识库做体检。

在《03\_任务结果》下，建一个《知识库体检》子文件夹。

然后，用 WorkBuddy设一个定时任务，提示词如下：

```
我想每月1日上午9点检查一次ima“经验复用知识库”。请帮我设置这个月度定时任务。
```

很快，定时任务就设置好了，每月1号上午9点定时自动执行知识库检查。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

到这里，这套 WorkBuddy＋ima+Wiki 搭建知识库的方法就介绍完了。

刚开始，它可能只是几个文件夹。

但是，半年、一年以后，里面装的就不只是资料了，还有你的判断、经验、踩过的坑，以及真正验证过的方法。

每一次探索，每一次提问，都能让知识库更懂你，积累的经验也更丰富。

散乱的信息被编译成结构化的知识网络，同时，这个网络又随着使用不断扩展。

这就是复利的力量。

以上，既然看到这里了，如果觉得不错，随手点个赞、推荐、转发三连吧，如果想第一时间收到推送，也可以给我个星标⭐～谢谢你看我的文章，我们，下次再见。