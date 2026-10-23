在上篇文章中，我们搭建了一个纯 Markdown Wiki，目标是验证知识编译与持续积累是否有效。本篇文章我们将对这个知识库升级，把这个纯 Markdown Wiki 升级成一个完整的 LLM Wiki 知识库系统——一个可被持续维护的知识库。

LLM Wiki 实现已经比较清楚地形成了一个共同模式：raw/ 保存不可变原始资料，wiki/ 保存 LLM 编译后的知识，AGENTS.md/Schema 定义规则；核心操作围绕 Ingest、Query、Lint 展开。

升级纯 Markdown Wiki，首先我们要把整个系统定死。一个完整的 LLM Wiki 知识库系统架构应该像这样：

```
                    ┌─────────────────────────┐
```

LLM Wiki 知识库系统架构的核心原则就四个：Raw 是证据；Wiki 是知识；Schema 是规则；Agent 是执行器。这个边界非常重要。

升级的第一步，是重构整个项目。

我建议直接使用下面这个结构来作为升级后的完整项目目录：

```
llm-wiki/
```

这个项目目录只是一个参考，你可以根据自己的实际使用要求调整，不一定照搬。

你可以手动创建整个项目，也可以把上面这个直接丢给编程工具，让它来创建整个项目。创建完成后就是下面这样：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这里我特意增加了 inbox/。因为 inbox ≠ raw，你刚丢进来的 PDF、网页、笔记、截图，先进入 inbox/；只有经过 Ingest 确认并标准化之后，才进入不可变的 raw/。这样比“直接把任何东西扔进 raw”更安全。

先解释一下为什么需要这么多 Wiki 类型。因为我们不要让 Agent 把所有东西都总结成：wiki/xxx.md，否则几个月后 Wiki 会变成一个巨大垃圾场。

这几个Wiki 类型的作用见下表：

类型

作用

`source`

某一份原始资料的知识化摘要

`concept`

一个稳定概念

`entity`

人、公司、产品、项目等实体

`topic`

某个主题的整体知识面

`decision`

一个重要判断/决策及其理由

`comparison`

两个或多个对象的系统比较

`synthesis`

跨多个来源形成的综合结论

`timeline`

一个主题随时间变化的知识

其中的 Source 是最基础的，其他 Wiki 页面都是在 Source 上逐渐编译出来的。

升级的第二步，是重写 AGENTS.md 文档。

```
# LLM Wiki 运行契约
```

这个 AGENTS.md 是整个项目的“宪法”。其中最重要的是这条：Agent 可以持续改 Wiki，但不能修改证据。这也是LLM Wiki 实现里非常核心的证据不变量：重要事实必须可以追溯到 raw/ 中的原始材料，Lint 再检查这一约束。

升级的第三步，是定义 Wiki 的页面架构。

这一步是定义“知识页面究竟长什么样”。我建议不要让每种页面自由发挥，而是先建立统一的页面结构。

在项目的 Schemas 文件夹下新建一份空白md文件，然后把下面的内容复制进去，将这个文件命名为：Wiki\_Page\_Schema.md

```
# Wiki 页面结构规范
```

升级的第四步，是建立三套 Agent Workflow。

这是整个系统真正开始“活起来”的地方。我建议不要让一个 Agent 同时拥有所有能力，而是明确拆成：

```
                    LLM Wiki
```

 Ingest/Query/Lint 分别是干什么的，前面已经介绍过，这里不做赘述，忘记了的可以去看前面的文章。

在建立这三个的 Agent Workflow 前，我们要首先明确三个 Agent 的边界。这个一定要在搭建工作流的时候固定下来。

能力

Ingest

Query

Lint

读取 Raw

✅

✅

✅

修改 Raw

❌

❌

❌

创建 Wiki

✅

❌

❌

修改 Wiki

✅

❌

仅安全修复

回答问题

可选

✅

❌

检测错误

✅

✅

✅

修改 Index

✅

❌

✅

修改 Log

✅

✅

✅

语义判断

✅

✅

✅

删除知识

❌

❌

❌

Archive

✅

❌

建议

边界固定下来，接下来就开始上手实操搭工作流了。

下篇文章，我们将用编程工具，一步步开始这三个Agent Workflow的搭建。

你如果喜欢这篇文章，就点关注，持续跟进 LLM Wiki 知识库的创建。