---
title: 一次讲清 12 个系统设计核心组件
source: 码农有道 coding
source_url: https://mp.weixin.qq.com/s/jdLNsvfW3Dvnchah90MO7g
source_type: article
platform: 微信公众号
captured: 2026-10-13
registered_at: 2026-10-16
inbox_ref: Archive/2026-10-13-system-design-12-components.md
---

个人其它平台技术文章：

*   小红书ID：码农有道
    
*   B站ID：码农有道
    
*   知乎ID：砖一块一块搬
    

注：本文对应视频详解版已同步更新在小红书、B站，统一搜索码农有道就能找到。

系统设计是软件开发过程中至关重要的一环，它不仅决定了系统的整体架构，还涉及各个组件之间如何协作与集成，最终影响系统的可扩展性、可靠性和运行效率。

那么，一个优秀的系统设计究竟需要考虑哪些关键问题？本文将从实际开发中最常见的场景出发，介绍每位开发人员和架构师都应该熟悉的 12 个系统设计核心要素。

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

### 分布式消息队列

分布式消息队列可以理解为系统各个组件之间传递消息的中间层。生产者将消息发送到消息队列，消费者再从队列中获取并处理这些消息。通过这种方式，系统的不同组件不必直接通信，从而降低彼此之间的耦合度，也让系统更容易扩展。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### DNS（域名系统）

我们平时访问网站时，通常输入的是域名，而不是 IP 地址。DNS，也就是域名系统，负责将域名（例如 www.example.com）解析为相应的 IP 地址，让计算机能够找到目标服务器。这样，浏览器才能将请求发送到正确的服务器，进而访问相应的 Web 服务。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 负载均衡器

当大量用户同时访问一个应用程序时，如果所有请求都由同一台服务器处理，就很容易造成服务器过载。负载均衡器就是为了解决这个问题而设计的。

负载均衡器会将接收到的网络请求分配到多台服务器上，避免单台服务器承担过多压力。这样不仅能提高系统的处理能力，还能在部分服务器发生故障时，将请求转发到其他可用服务器，从而提升系统的可靠性。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 分布式缓存

在应用程序中，有些数据会被频繁访问。如果每次请求都要查询数据库，不仅会增加数据库的负担，还会延长响应时间。

分布式缓存通过将这些热点数据存储在内存中，让应用程序能够更快地获取数据，减少对数据库的访问。这样既能缩短响应时间，也能减轻数据库的压力，让系统能够应对更高的并发请求。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 数据库

数据库是应用程序存储和管理数据的核心组件。根据数据的组织方式，常见的数据库可以分为关系型数据库和文档型数据库。

关系型数据库将数据组织成具有预定义结构的表，通过行和列来存储数据；文档型数据库则以类似 JSON 的文档形式存储数据，结构更加灵活。两者各有特点，应该根据数据的特点和应用程序的实际需求，选择合适的数据库。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 分布式任务调度器

在实际应用中，有些任务需要按照预定的时间执行，比如每天生成报表、定期清理数据，或者定时同步信息。当任务数量增多，或者需要在多台服务器上执行时，就需要分布式任务调度器来统一管理。

分布式任务调度器负责安排任务的执行时间，将任务分配到不同的服务器上，并协调任务的执行过程。即使某台服务器发生故障，也能通过相应的故障恢复机制，尽可能保证任务可靠地执行。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 可观测性

系统上线运行后，我们如何判断它是否正常工作？当出现性能下降或请求失败时，又该如何快速找到问题所在？这就需要可观测性。

通过收集和分析系统运行过程中产生的指标、日志和链路追踪数据，我们可以了解系统的运行状态，发现性能瓶颈，并追踪请求在各个组件之间的处理过程，从而更快地定位和解决问题。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 非结构化数据存储

应用程序需要存储的数据，并不只有数据库中的结构化记录。图片、视频、文档等文件，往往无法直接按照传统关系型数据库的表结构来组织和存储。针对这类数据，可以使用专门的非结构化数据存储方案，例如 BLOB 存储。它能够存储大量不同类型的文件，并支持按需扩展，为应用程序提供更灵活、经济的存储方式。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 扩展服务

随着用户数量和业务规模不断增长，应用程序需要处理的请求也会越来越多。如果现有的计算资源无法满足需求，就需要对系统进行扩展。

常见的扩展方式有两种：垂直扩展，也就是提升现有服务器的硬件性能；水平扩展，则是增加服务器的数量，将负载分散到多台服务器上。通过合理选择扩展方式，系统就能更好地应对不断增长的流量，在高负载下依然保持良好的响应速度和可靠性。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 发布-订阅模型（Pub-Sub）

在分布式系统中，不同服务之间经常需要交换消息。如果发送方必须知道接收方是谁，并直接与其通信，就会增加服务之间的耦合度。发布-订阅模型提供了另一种解决方案：发布者将消息发送到指定主题，而订阅者只需要订阅自己感兴趣的主题，就能接收相应的消息，无需知道具体是谁发布了这些消息。这样，各个服务就可以通过异步方式交换信息，减少彼此之间的依赖，让系统更灵活，也更容易扩展。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 唯一 ID 生成器

在一个应用程序中，每条订单、每个用户或每项任务，都需要有一个能够准确识别自身的 ID。当系统运行在多台服务器上时，如果各个服务器独立生成 ID，就可能出现重复，导致数据冲突。因此，分布式系统通常需要一套可靠的唯一 ID 生成机制，为不同的业务实体分配唯一标识。这样，无论数据分布在哪台服务器上，系统都能准确地区分和关联这些数据。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

### 限流

当某个客户端在短时间内发送大量请求时，服务器可能因为负载过高而无法正常处理其他用户的请求。限流机制就是为了解决这个问题而设计的。

它会限制客户端在一定时间内能够发起的请求数量，避免单个客户端占用过多系统资源。这样既能减少请求过载和恶意滥用带来的影响，也有助于保障其他用户的正常访问，让系统在高负载下保持稳定。![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

推荐阅读：

**[完全整理 | 365篇高质技术文章目录整理](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247486191&idx=1&sn=5ea5fd098a3e0da834d882cf53529977&scene=21#wechat_redirect)**

[一张图弄清楚缓存架构设计中的经典问题及解决方案](http://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247495958&idx=1&sn=e269b0536ff7d53086c172ec0ab6a1f7&chksm=9729206ca05ea97a32832d1ebfb1cbfa6a2ac36845095c961abb16eaaea31ce550fa96d8048b&scene=21#wechat_redirect)

[一张图总结系统设计中的33个黄金法则](http://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247495777&idx=1&sn=785a3cf0af167f69d212455f01e794cb&chksm=9729211ba05ea80de1851162d548cb51fa82f298712d2e302eb291925072dc9fc72941109eda&scene=21#wechat_redirect)

[主宰这个世界的10大算法](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247486907&idx=1&sn=637287dc924020e152dd528763dbab00&scene=21#wechat_redirect)  

[彻底理解cookie、session、token](https://mp.weixin.qq.com/s?__biz=MzIwNTc4NTEwOQ==&mid=2247486848&idx=1&sn=86582832f5f3a59c1ffefd415adc075a&scene=21#wechat_redirect)

**专注服务器后台技术栈知识总结分享**

**欢迎关注交流共同进步**

也可扫码添加个人微信交流技术，职场发展~

添加时请注明公司名（或学校名）+方向！！

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**码农有道 coding**

码农有道，和您聊技术，和您聊职场，和您聊互联网那些事！
