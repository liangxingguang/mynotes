# 游戏开发：服务器弹性伸缩

> 来源：https://zhuanlan.zhihu.com/p/2095121870475485746 （知乎专栏，经 jina 抓取）

作者最近被多次问到[服务器弹性伸缩](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%BC%B9%E6%80%A7%E4%BC%B8%E7%BC%A9&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLmnI3liqHlmajlvLnmgKfkvLjnvKkiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.xlScg6MVqvHF0SxeiuLpOfSOREWXbal1CgFBeDaOIwI&zhida_source=entity)相关的问题，便整理了一下思路和笔记，简单做个分享。

阅读提醒：本篇的内容更多是理论思考，而非具体实践经验，仅作参考。

## 服务器的[负载均衡](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E8%B4%9F%E8%BD%BD%E5%9D%87%E8%A1%A1&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLotJ_ovb3lnYfooaEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.rtu59aDOmbc8Hm6f31UTermDmbnn1wdcK3jr69MuOSE&zhida_source=entity)

在讨论弹性伸缩以前，我们需要先解决一下负载均衡的算法问题。

以玩家登录为例，登录服通常分配一个负载最小的Game服给玩家登录，那么此处有一个问题：如果开服瞬间，同时涌入大量的请求，怎么避免请求被压到同一个服务器？

![Image 1](https://pic4.zhimg.com/v2-e73b03209bc97b35bb623a2eca378393_1440w.jpg)

问题的成因：**信息滞后**。

由于Game服是定时，比如5S/次，将自己的负载上报给Login服（或是写入[Redis](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=Redis&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiJSZWRpcyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY1NjY4OCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.stRDpjoIc_j4hgTeyV8w_0ahcOsrlG7JBoRjlomc67w&zhida_source=entity)），因此Login感知到的负载信息通常是滞后的。

因此当Login服简单基于上报的数据进行负载均衡时，就可能将瞬间的所有请求转发给同一个Game服，导致负载均衡失效。

那如何解决该问题呢？

我的方案是：**[虚拟负载](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E8%99%9A%E6%8B%9F%E8%B4%9F%E8%BD%BD&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLomZrmi5_otJ_ovb0iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.taYZ_HieY0xAWFHgSZ4oNndexEzLprWFK_lA26SJsCE&zhida_source=entity)**。其核心逻辑是：

1.   每次分配给Game服请求以后，就增加该Game的虚拟负载
2.   虚拟负载需在玩家登录成功或超时后移除 - **每个虚拟负载独立生命周期**
3.   选择负载最低的服务器时，同时考虑真实负载和虚拟负载

```
class GameServerInfo {
    int sid;
    int rload; // 真实负载
    int vload; // 虚拟负载
}
```

了解到的方案：**[动态权重](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%8A%A8%E6%80%81%E6%9D%83%E9%87%8D&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliqjmgIHmnYPph40iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.xqoj-nvaTt27vj1D2fiketgaM_okwVrHL9gIc4E9_Ts&zhida_source=entity)**（[加权](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%8A%A0%E6%9D%83&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliqDmnYMiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.svcsicr_Uw0q3HlJAKpcDJ50mMCRNDobS_-ftCIjgm8&zhida_source=entity)）：

1.   每次分配给Game服请求以后，增加（或减少）该Game服的权重
2.   选择负载最低的服务器时，同时考虑真实负载和权重

```
// 乘除法都是可以的，取决于我们是增加还是减少权重
double score = rload / weight;
```

两种方案的底层思想是相似的，都是分配请求以后立即降低服务器被选中的概率，不过虚拟负载可能更更容易理解一些。

其它小技巧：

1.   将CPU、内存也纳入负载统计，不要只看玩家数
2.   为Game服分配添加[冷却时间](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%86%B7%E5%8D%B4%E6%97%B6%E9%97%B4&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLlhrfljbTml7bpl7QiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.C5G1Y_9yZniVqGf9E23wMiwoy2NFdsmMMIy7FfrH8QM&zhida_source=entity)，比如：10ms
3.   Game服每登录成功一个玩家，就加速上报（类似[TCP](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=TCP&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiJUQ1AiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.btQFy_Fqxftb4-xBoffLFTxfjlsU-EyG3sAzT6mT9Xk&zhida_source=entity)中的快速重传）

### 防炸服技巧

2026，仍然有中小厂的游戏开服炸服，因此分享一些简单的防炸服技巧。

炸服的原因不尽相同，以作者的经验来看，最危险的是：Game服[创角](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%88%9B%E8%A7%92&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliJvop5IiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.y7bMSC1j8QkNOOtoCcKNDOnNeBXFNjf0dK90CJE2DMg&zhida_source=entity)的DB操作。危险之处有二：

1.   大量的Player读/写操作 + Player对象本身也很大，导致DB长期处于高负载状态
2.   DB驱动可能只有同步写DB的接口，导致[逻辑线程](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E9%80%BB%E8%BE%91%E7%BA%BF%E7%A8%8B&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLpgLvovpHnur_nqIsiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.vI-bQvhM2Jlr-VVLsZvRtsYCuhpIlltxKN2wbz8uJx8&zhida_source=entity)频繁阻塞

绝大多数的项目，服务器的[纯CPU](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E7%BA%AFCPU&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLnuq9DUFUiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.SjZmtaKHImIbcKFLzF9etNK5jJdva7d0YTVJ--lZK8I&zhida_source=entity)运算通常是不多的，性能主要出在IO操作上；而运行时的IO操作主要是和玩家通信的Scoket读写和DB操作，因此能解决这两部分，通常就可以解决主要的性能问题。

回到登录，如何解决DB操作可能导致的性能问题呢？

我们需要做几件事：

1.   Game服设定最大在线玩家数，超过阈值时进行排队（需超时）或直接拒绝登录
2.   **Game服设定最大登录QPS**，比如：100人/S，即限制每秒登录的玩家数（落地为分帧）
3.   Game服高开销的IO操作迁移至辅助线程，避免阻塞[主线程](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E4%B8%BB%E7%BA%BF%E7%A8%8B&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLkuLvnur_nqIsiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.dr9kT0EyQyxYUwF0WQ-uoJ-JKIxeEk_x2-Z8T6MawF4&zhida_source=entity)（比如Scene网格文件解析）
4.   Login服引入更好的负载均衡算法，避免热点Game
5.   Login服也可以引入最大登录QPS，避免过多的并行请求，间接减少Game服压力

以上都是比较简单易实现的，背后的主要思想是削峰；更进一步的措施则是弹性伸缩，不过就有一定的实现难度。

PS：Game服的登录QPS通常不是问题，**真正的问题在稳定性**：大流量涌入期间，服务器不能出现卡顿和网络连接断开等问题。

* * *

## 服务器弹性伸缩

现在回到本文的主题：服务器的弹性伸缩。问题的描述是：

游戏的公会数据较多，因此被拆分在多个服务器上，且为了节省内存，是按需加载的；如何设计能支持[公会服](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%85%AC%E4%BC%9A%E6%9C%8D&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLlhazkvJrmnI0iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.OyfEB0JLANvVX4sW4gVGpfNjTbwdsB-qkExmOgwhIeo&zhida_source=entity)弹性伸缩，**且调整期间不影响玩家**。

![Image 2](https://pic4.zhimg.com/v2-ffbad379d78bf9122eae50085213fd65_1440w.jpg)

可能大部分读者都没有实际处理该问题的经验，作者也没有；不过基于业务经验，以及[MongoDB](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=MongoDB&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiJNb25nb0RCIiwiemhpZGFfc291cmNlIjoiZW50aXR5IiwiY29udGVudF9pZCI6Mjg1NjU2Njg4LCJjb250ZW50X3R5cGUiOiJBcnRpY2xlIiwibWF0Y2hfb3JkZXIiOjEsInpkX3Rva2VuIjpudWxsfQ.IpvDDAT4IauvYEQWtD5bYju6d94yHKxo1718y3gzW9s&zhida_source=entity)等分布式组件的知识，还是有一些想法。

### [路由服](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E8%B7%AF%E7%94%B1%E6%9C%8D&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLot6_nlLHmnI0iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.K15QxUxM-iwbrEN8pkr9gGRpcsBGhE_jCjrEjJhuwM8&zhida_source=entity)（代理服）

![Image 3](https://picx.zhimg.com/v2-06c72764988cf6a3e045df487b6f270b_1440w.jpg)

由于存在弹性伸缩，且公会服是有状态的；因此必须有一张**[路由表](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E8%B7%AF%E7%94%B1%E8%A1%A8&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLot6_nlLHooagiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.BWWH2EDpMYWmveg8Z0Y0KqYld1NMd3e9vKrbwd5G6EM&zhida_source=entity)**，记录每个公会的请求应该发往哪个服务器（类似MongoDB的**Mongos**服务器）。

理论上不引入路由服也是可以的，但Game服自行维护路由表复杂度较高 —— 需要协同解决冲突（路由一致性），还可能产生较多的广播，因此引入路由服是更好的选择。

1.   路由服不仅可以支持现在的公会服弹性伸缩的问题，还可以解决其它服务器的弹性伸缩问题
2.   **路由服可以是固定数量的**（不弹性伸缩），可以简化分布式协调逻辑，有效降低系统复杂度
3.   路由服还可以代替MQ实现服务器之间的通信，提供更加自定义的Key路由规则
4.   路由服还可以简化伸缩时的[数据迁移](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E6%95%B0%E6%8D%AE%E8%BF%81%E7%A7%BB&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLmlbDmja7ov4Hnp7siLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.PpnZvRmbsGniYK5UwAJJjk1a9qXiTwua1lq4AwFcxJo&zhida_source=entity)逻辑

Q：业务服务器如何使用Router服？

A：有两种选择：

1.   业务服务器 每次根据请求Key选择Router服，如Hash、取模
2.   业务服务器绑定到特定的Router服，该服务器的所有请求都由该Router服处理（收发）

两种方式各有优缺点，前者相对更为简单 —— 可以避免复杂的[分布式协调](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=2&q=%E5%88%86%E5%B8%83%E5%BC%8F%E5%8D%8F%E8%B0%83&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliIbluIPlvI_ljY_osIMiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MiwiemRfdG9rZW4iOm51bGx9.S7vn3Jd2BFEc2gxNkuKzQncOgDTm6lamNnRjZrIJOPY&zhida_source=entity)，负载均衡方面也会更好一些；而后者可以提供更好的[时序](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E6%97%B6%E5%BA%8F&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLml7bluo8iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.xfLNWlROkW_pdWkUP-Vt239cy8QvwXz7_DQQv_Kf8z4&zhida_source=entity)保证，更自由的路由规则，但Router服之间需要[组网](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E7%BB%84%E7%BD%91&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLnu4TnvZEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.4HeckePogr5yMmpFadznmKlolHQfiZ62z4UYC6_D48E&zhida_source=entity)，需要协调Key的路由更新，有更高的实现复杂度。

建议先采用方案一，如果不能满足需求，再选择Router组网。

### 一致性Hash

一致性Hash也是[分布式服务器](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%88%86%E5%B8%83%E5%BC%8F%E6%9C%8D%E5%8A%A1%E5%99%A8&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliIbluIPlvI_mnI3liqHlmagiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.FNopidPFIOeKVKgmdzS1sckIOlPodAL5iXYD_wjwX_Y&zhida_source=entity)中常用的技术，最经典的就是**Hash环，常见于[缓存服务器](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E7%BC%93%E5%AD%98%E6%9C%8D%E5%8A%A1%E5%99%A8&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLnvJPlrZjmnI3liqHlmagiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.HEqwBiSQu74Fw9_tBjQ4142R5q-C1GuG1xhEyYr7NTg&zhida_source=entity)或无状态服务器**，但像游戏这种有状态的服务器，简单通过一致性Hash处理伸缩是不够的 —— 可能导致数据双写，产生错误。

关于一致性Hash的实现，大家可以查询文章或询问AI；此处主要想分享的作者历史项目对一致性Hash的使用，也许能为大家在处理其它业务时提供一些灵感。

![Image 4](https://pica.zhimg.com/v2-4a3541d1e7dea2dc489c36f7e35336f4_1440w.jpg)

作者的第一个项目，有大量的[跨服](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E8%B7%A8%E6%9C%8D&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLot6jmnI0iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.7jBa-dYojG60yFCSTulijvZ3DdQ5Vy3WVE-l5mdQB04&zhida_source=entity)玩法，而跨服活动的匹配由Center服负责，匹配完成以后需要将所有的玩家传送到同一个Scene服。

由于**Center服并不感知Scene服**，那么Center服该怎么选择Scene服，使其对所有的Game服有效呢？

由于Center需感知Game服的状态，因此Game服会和Center保持连接，并上报部分信息；因此如果让那时的我来做，我可能会将Game服的当前连接的Scene服信息同步到Center，然后由Center选出这些Game服的交集，再随机分配。

不过，Leader的方案是引入一致性Hash；Center不直接分配Scene服，而是**生成一个Key给所有的Game服**，Game服自行根据Key选择场景服。

理论上，该方案可能分配到不是所有Game服都成功连接的Scene服，但实践中工作得很好（简单胜过完美）。

### 数据迁移

回到公会服的伸缩问题，如果只有新的公会（尚未存在于路由表的公会）的请求可以路由到新的服务器，那么只实现了动态扩容，而没有实现[动态负载均衡](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%8A%A8%E6%80%81%E8%B4%9F%E8%BD%BD%E5%9D%87%E8%A1%A1&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLliqjmgIHotJ_ovb3lnYfooaEiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.ZDUehIObJ09fLFEG55AX_w63vVoOKYlI6z91cS9aruk&zhida_source=entity)，怎么解决这个问题呢？

由于在服务器伸缩期间不能影响玩家的操作，所以**在服务器协调期间，旧的请求还是应该路由到旧服务器**，所以我的回答是：

1.   公会服需要感知新增了服务器这件事，并且在新增服务器以后尝试将部分负载转移到新服务器
2.   公会服需要先存档数据，不再处理该部分数据的读写请求，落地期间将请求压队列缓存下来
3.   在数据落地以后，卸载内存中的数据；然后将数据和请求都转发给新的服务器
4.   **Router服仍然将请求转发给旧服务器**，然后由旧服务器再转发给新服务器，以保证时序

![Image 5](https://pic3.zhimg.com/v2-010fad98a26071529d70ac71eee7928c_1440w.jpg)

然后又被问到：如果总是由旧服务器进行路由，**服务器在多次扩容以后**，岂不是可能产生多次路由？

如果运行时可能产生多次扩容，多次路由可能只是小问题，路由规则变得复杂可能才是重点，因此需要避免。我的回答是：

那公会服和Router都将请求直接发送给新服务器，**由目标服务器根据请求ID进行[队首阻塞](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E9%98%9F%E9%A6%96%E9%98%BB%E5%A1%9E&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLpmJ_pppbpmLvloZ4iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.Ra89T6If8ftFl0-xojDlCWcjqXZ1x4echRTutIhdW7g&zhida_source=entity)**；服务器接收到新的请求时，判断是不是下一个要处理的请求ID，如果不是则证明还存在发送给旧服务器的请求，则将请求压队列进行等待。（Router路由时需要携带转给旧服务的最后一个请求ID）

不过，由旧服务器直接将数据和请求路由给新服务器也有问题：

1.   服务器之间需要感知
2.   服务器自行处理队首阻塞的复杂度更高，请求ID的状态性强

所以我换了个方案：**旧工会服在卸载数据以后，将数据和积压的请求通过Router服转发给新的服务器**。

![Image 6](https://pic1.zhimg.com/v2-29f9650b070c9e89a1b451d1c596b2da_1440w.jpg)

该方案的优点的是：

1.   可以消除目标服务器的队首阻塞逻辑，消息一直有序流转
2.   Router服可以更好地感知路由切换过程
3.   可以由Router来控制负载转移的时机和过程

当收到旧服务器发来的负载转移请求时，就知道该Key开始进入[路由切换](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=2&q=%E8%B7%AF%E7%94%B1%E5%88%87%E6%8D%A2&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLot6_nlLHliIfmjaIiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MiwiemRfdG9rZW4iOm51bGx9.kyuhUb-rck-ki8WCjuLLeQ1V6N-MuW3eqVrUWwKu3V4&zhida_source=entity)状态；当收到旧服务器的转回的最后一个请求时，就知道已完成路由切换。

```
class Item {
    long key; // 路由Key（可以是结构化key或字符串）
    int sid; // 当前服务器id，旧请求全部转回时更新
    int nextSid; // 下一个服务器id，收到转发数据请求时更新
    long nextId; // 用于分配下一个请求id，可判断发出去的最后一个请求
}
```

### 路由Key选择

上面的例子中，路由Key可以是公会ID；但路由Key并不总是实体ID，我们需要明白路由Key的真正含义。

框架提供的保证是：同一个路由Key上的请求将保持有序执行（虚拟Channel），仅此而已。

所以，**Key不是数据的“身份”，而是时序的容器**；只是实体ID恰好常与时序边界重合，才被频繁用作Key。

所以，选择路由Key时应当先梳理哪些操作之间必须有序执行，然后才能决定选择哪个Key或者如何设计Key。

* * *

## 结语

作者近几年的主要精力在Gameplay上，[服务器管理](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%AE%A1%E7%90%86&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLmnI3liqHlmajnrqHnkIYiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.im1fo8XeSgEihgPb3HCAy5Ry9xmEHYyH7CytmPe9hNc&zhida_source=entity)相关的知识有所淡忘~

不过，随着[AI编程](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=AI%E7%BC%96%E7%A8%8B&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiJBSee8lueoiyIsInpoaWRhX3NvdXJjZSI6ImVudGl0eSIsImNvbnRlbnRfaWQiOjI4NTY1NjY4OCwiY29udGVudF90eXBlIjoiQXJ0aWNsZSIsIm1hdGNoX29yZGVyIjoxLCJ6ZF90b2tlbiI6bnVsbH0.qwLet1rMAMUlk9-0MGyWuvRHh_37GNcOEdBUZd2mrk8&zhida_source=entity)越来越强，面对复杂、突发的线上实战排障经验（如高并发、[内存泄漏](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E5%86%85%E5%AD%98%E6%B3%84%E6%BC%8F&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLlhoXlrZjms4TmvI8iLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.7HvA8wqOBS18H7ruA-31GCCo94GFGhO-B27XSwsZnjk&zhida_source=entity)、网络抖动等），因其[不可预测性](https://zhida.zhihu.com/search?content_id=285656688&content_type=Article&match_order=1&q=%E4%B8%8D%E5%8F%AF%E9%A2%84%E6%B5%8B%E6%80%A7&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3OTI2Njg4MjMsInEiOiLkuI3lj6_pooTmtYvmgKciLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoyODU2NTY2ODgsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.f3wGLUQnVTETpfRD_QE2jDchid9ebyOvl9xJKLn9ZV8&zhida_source=entity)和综合性，成为AI难以完全替代的核心竞争力。

因此，大家可以多了解一下这方面的知识，有机会实操的话更好。

PS：这么硬核的文章哪里还有呢？**稀罕作者、点赞和推荐**都可以增加作者的创作动力哦。
