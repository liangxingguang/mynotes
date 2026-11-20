周末参加线下活动，分组讨论时，听到同组的人聊起用 AI 编程，有时生成的代码一运行就报错。

一个功能来回改了好几轮，还是没达到预期。

我觉得，使用 AI 编程时，除了模型能力，工具的选择也很重要。

**Claude Code** 是目前使用比较广泛的 AI 编程工具之一，能根据我们的描述，直接在项目里生成和修改代码。

微信今年推出了小程序成长计划，个人开发者也有机会获得云资源和流量支持。

加上 AI 编程工具越来越好用，现在把一个日常需求做成小程序，已经更容易上手了。

今天手把手带大家实操一遍：用 Claude Code 从零做一个微信小程序。

```
需求概述：家里的食品、日用品一多，哪些快过期了，很容易记不清，想确认时又要一件件翻包装。我们就做一个保质期管家，把物品名称和包装上的到期日期记进去，打开列表，就能看到哪些物品应该先用、还剩多少天。先看一下做出来的效果：点击添加物品，填写名称、选择到期日期，保存后就会回到列表。列表按到期日期排列，并显示已过期、今天到期或还剩多少天，方便我们判断哪些物品要先用。
```

效果演示：

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

#### 一、环境准备

开始之前，我们先准备好两款工具：**微信开发者工具** 负责创建基础项目、运行小程序和手机预览。

**Claude Code** 负责在这个项目里生成和修改代码。

**第一步：安装 Claude Code**

**Mac 电脑**按下 Command + 空格，搜索并打开**终端**。复制下面这行命令，粘贴进去，按回车执行：

```
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows 电脑**在开始菜单中搜索并打开 **PowerShell**，复制下面这行命令，粘贴后按回车：

```
irm https://claude.ai/install.ps1 | iex
```

两种安装方法按自己的电脑选择一种即可。安装结束后，关闭终端或 PowerShell，再重新打开，输入下面的命令：

```
claude --version
```

看到 Claude Code 的版本号，就说明程序已经安装好。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第二步：注册微信小程序，获取 AppID**

小程序账号用于管理我们开发的小程序。

**AppID** 是这个小程序的身份标识，在微信开发者工具中创建项目时需要填写。

在浏览器中打开微信公众平台： https://mp.weixin.qq.com

已有小程序账号，可以直接登录自己的后台。还没有的话，点击首页右上方的**立即注册**。

在账号类型选择页面中选择**小程序，**按照页面提示完成邮箱验证、主体信息填写和管理员绑定。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

登录小程序后台后，点击左下角的小程序头像，进入**账号设置，**在**开发管理中**，找到并 **AppID（小程序 ID）。**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

后续在微信开发者工具中创建项目时，要把这个 AppID 填进去。

**第三步：安装微信开发者工具**

我们先用微信开发者工具创建一个基础项目，确认能够正常运行，再让 Claude Code 在这个项目上开发功能，后面也在这里查看界面、测试按钮，并放到手机上预览。

在浏览器中访问： https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

再根据自己的电脑系统下载对应安装包。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

下载完成后按提示安装。

打开软件，使用微信扫码登录。这里使用的微信需要是刚才注册小程序时绑定的管理员，或已经被管理员添加为开发者的微信。

#### 二、实战开发

**第一步：在微信开发者工具中创建项目**

打开微信开发者工具，进入**小程序**项目界面，点击新建项目入口，来到创建小程序的页面。

我们先让工具生成一套基础项目文件，再交给 Claude Code 开发具体功能。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

项目名称填写**保质期管家**。目录是项目文件在电脑上的保存位置，可以新建一个名为 **expiry-manager** 的文件夹，后面启动 Claude Code 时也使用这个目录。

AppID 填写前面从小程序后台复制的那一串。

本次演示把物品记录保存在本地，后端服务选择**不使用云服务**。

开发模式选择**小程序**，初始化选择**模板**，保持默认选中的 **TS + Sass-基础模板**，点击**创建**即可。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第二步：先运行默认项目**

项目创建成功后，会进入下面的开发界面。左侧是项目文件，右侧是小程序模拟器。

右侧能显示默认的头像、昵称输入框和 Hello World 页面，说明基础项目已经能运行。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**微信开发者工具和 Claude Code，用的是电脑里的同一个项目文件夹。**

claude Code 负责修改代码，微信开发者工具负责运行和查看效果。

我们只要在这个项目目录中启动 Claude Code，等它修改完成，再回到开发者工具重新编译，就能在右侧模拟器中看到变化。

左侧文件区中可以看到 **project.config.json**，这是识别项目目录的一个依据。

记住它所在的文件夹，后面在终端中进入的就是这里。

**第三步：在这个项目中启动 Claude Code**

先在电脑中找到刚才的 **expiry-manager** 文件夹。

接下来就在这个目录中启动 Claude Code，让它读取微信开发者工具已经创建好的项目，沿着现有结构继续开发。

输入 **claude** ，按回车启动 Claude Code。

首次启动时，按照终端提示选择 Claude 订阅账号，通过浏览器完成登录。

这里需要使用有 Claude Code 使用权限的账号，个人订阅可以使用 **Pro 或 Max**。

启动过程中，如果出现下面的文件夹信任确认界面，先确认上方显示的是刚才创建的 **expiry-manager** 项目目录，再选择 **Yes， I trust this folder**，按回车继续，允许 Claude Code 在这个项目中开展后续操作。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第四步：进入计划模式，先看开发方案**

前面提到，用 AI 编程时，一个功能可能来回改了好几轮，还是不符合预期。

其中一个原因，是我们还没确认 AI 对需求的理解，就让它开始写代码了。

我们先让它出一份方案，看看功能怎么安排、准备怎么实现。有偏差就先调整，确认它理解的和我们想做的是一回事，再开始开发，能减少后面因为理解偏差造成的返工。

在 Claude Code 中，我们可以用**计划模式（Plan Mode）**完成这一步：先分析项目、给出方案，确认后再开始修改代码。

在终端中按 **Shift + Tab** 切换模式，直到输入区下方显示 **plan mode on**。切换次数可能随当前模式不同而变化，以界面显示为准。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

确认已经进入计划模式后，把下面这段需求复制到输入区并发送：

```
我已经用微信开发者工具的默认 TS + Sass 基础模板创建了项目。请先读取当前项目结构，为一个名为保质期管家的微信小程序制定开发方案。沿用现有的模板，不另外创建项目或引入框架。首页展示已添加的物品。每条记录显示物品名称、到期日期和剩余天数，按到期日期从早到晚排序。没有记录时，显示添加物品的提示。提供添加物品的入口，可以输入物品名称、选择到期日期，点击保存后回到列表。名称或日期未填写时提示补全，不保存空记录。日期选择器允许选择过去的日期，方便记录已经过期的物品。剩余天数按本地自然日计算。到期日期早于今天时，标红并显示已过期多少天；日期是今天时显示今天到期；还剩 1 至 7 天时标橙并显示还剩多少天；超过 7 天时正常显示。今天到期和已过期不能只靠颜色区分，还要有文字说明。使用微信本地存储保存记录，关闭后重新打开仍然保留，重新进入首页时刷新剩余天数。界面简洁，适合手机阅读，输入框和按钮要方便点击。这次只做添加物品、到期提示和本地保存，不增加账号登录、云开发、微信消息通知等功能。请先只输出开发方案，说明页面如何安排、物品信息怎样保存在本地，以及准备分几步实现。先不要修改项目代码，等我确认方案后再开始开发。
```

发送需求后，Claude Code 会先读取现有项目。

从返回的模板分析中，可以看到它找到了项目中已有的页面和文件。

在方案定稿前，它还会把需要我们决定的细节列出来，逐项确认。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

比如这里，它询问添加物品要用哪种交互形式。

根据这次需求，选择默认推荐的**独立添加页**即可。

第二个问题是如何处理模板自带的演示代码。

这里选择推荐的**清理掉**，移除与保质期管家无关的日志演示页和登录示例，保留 TS + Sass 模板及必要配置。

完成两项选择后，切到顶部的 **Submit**，会看到下面的答案汇总页面，核对这两项是否分别选中了**独立添加页**和**清理掉**。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

确认无误后，保持选中 **Submit answers**，按回车提交。Claude Code 会根据这些回答继续整理开发方案，接下来再查看它给出的完整方案。

方案出来后，先看它准备怎样安排页面、怎样添加和保存物品，以及是否包含到期状态的判断。

我们这次只做添加物品、页面内的到期提示和本地保存，确认方案围绕这些功能展开即可。

如果方案中有不符合预期的地方，直接在当前对话里说明需要怎样调整，让 Claude Code 修改方案。

涉及代码的细节看不懂时，也可以请它用中文解释清楚。

**第五步：确认方案，再开始开发**

完成前面的细节确认后，Claude Code 会整理开发方案，等待我们确认是否开始执行。

先读一遍方案，看看它是否跟我们想做的方案一致，再决定继续。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

确认方案符合预期后，按回车批准方案，Claude Code 会退出计划模式，以自动模式开始开发，减少中途的常规确认提示。

这一轮开发结束后，Claude Code 会给出完成摘要，说明修改了哪些文件、实现了哪些功能。

下面这次回复中，它列出了物品列表页、添加页面，以及本地保存和到期状态计算等改动。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

看到完成回复后，就可以回到微信开发者工具，际检查页面功能是否符合我们的预期。

**第六步：预览效果**

回到刚才的微信开发者工具，就能看到开发完成的小程序功能。

点击首页的**添加物品**，进入添加页面，填写物品名称，再选择包装上的到期日期。

我们先添加一件麦片，填写后的页面如下。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

点击**保存**后，页面会返回物品列表。陆续添加几件物品，就能看到它们按到期日期从早到晚排列。

下面这张图中，牛奶已经过期，面包当天到期，酸奶还剩 1 天，麦片还剩 31 天，打开列表就能分清哪些应该先用。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**第七步：在手机上预览和调试**

电脑上看过效果后，点击开发者工具顶部的**真机调试**，等待生成二维码。

有时候电脑上测试没问题，在手机上测试就会发现问题，真机调试这一步必不可少。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

使用已添加为小程序管理员或开发者的微信扫码，就能在手机上打开当前版本，检查页面功能是否符合预期。

**第八步：上传代码**

确认页面和主要功能正常后，就可以把代码上传到小程序后台，点击微信开发者工具顶部的**上传**。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

在弹出的窗口中填写版本号和项目备注，填写后确认上传，等待工具提示上传成功。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

接着登录微信公众平台，进入这个小程序的**版本管理**，在**开发版本**中找到刚上传的版本，核对版本号和备注。

代码上传成功后，还需要继续提交审核，才能走到正式发布这一步。

下面是上传后的后台页面，右侧可以看到**提交审核**入口。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图中的**体验版**，是正式发布前供指定人员试用的版本。

我们可以把上传的开发版本设为体验版，在后台添加体验成员，再让他们扫码试用，帮忙检查功能和使用体验。

体验版只面向有权限的人员，正式对外使用还需要完成审核和发布。

**第九步：提交审核，审核通过后发布**

首次发布前，先在后台完善小程序名称、头像、简介和服务类目等信息，并按后台提示完成小程序备案**。**

在对应的开发版本旁点击**提交审核**，按照页面要求填写功能说明、选择功能页面，并检查信息是否完整。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

提交后，可以在后台查看审核进度。如果审核未通过，就根据后台给出的具体原因补充资料或修改功能。

涉及代码的修改完成后，需要重新上传版本，再提交审核。

审核通过后，回到**版本管理**，找到通过审核的版本，点击**发布**，按页面提示完成确认，等后台显示为**线上版本**后，小程序才完成正式上线。

小程序做出来后，如果使用时发现有些地方不够顺手，也可以把具体问题和想调整的效果告诉 Claude Code，让它继续完善。

这次用 Claude Code 开发微信小程序的案例教程，就到这里。

如果你也想尝试 AI 编程，可以从一个自己用得上的小需求开始，试着做出一个属于自己的微信小程序。