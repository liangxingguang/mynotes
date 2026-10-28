---
id: 2026-10-28-semaphore-countdownlatch-practices
title: 并发编程"黑科技"：Semaphore和CountDownLatch的5个实战技巧
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/EQgBlIUavYhSAp6NN2cdUg
source_type: link
platform: wechat
created: 2026-10-28
category: 技术
tags: [Java, 工程实践]
asset_ref: Assets/2026/10/semaphore-countdownlatch-practices.md
wiki_status: pending
---

# 并发编程"黑科技"：Semaphore和CountDownLatch的5个实战技巧

> Java 并发工具类入门科普：用停车场闸机类比 Semaphore（acquire/release 控制并发度），用运动会开幕式类比 CountDownLatch（倒计时归零放行）。给出动态限流、tryAcquire 超时、批量任务超时控制、线程池优雅关闭等实战技巧，附常见踩坑与选型对比。

## 核心要点

- **Semaphore = 停车场闸机**：permits 即车位数；可按 CPU 核数 ×2 动态设置并发度做秒杀限流；`tryAcquire(timeout)` 实现非阻塞获取，失败返回友好提示。
- **CountDownLatch = 倒计时器**：等待所有子任务完成后放行；`await(timeout)` 避免无限阻塞便于降级；可配合实现线程池优雅关闭（全部任务 countDown 后再 shutdown）。
- **三个高频坑**：① Semaphore 的 release() 必须放 finally，否则异常时许可泄漏；② countDown() 调用次数必须与初始计数一致；③ 不要为每个任务 new Thread，应配合线程池。
- **选型对比**：Semaphore（限流/资源池，许可须释放）、CountDownLatch（等多任务完成，计数不可重置）、CyclicBarrier（多线程协同，可重复使用）、Phaser（复杂阶段任务，动态参与方但实现复杂）。
- **组合用法**：Semaphore + CountDownLatch 实现有限线程池批量任务执行；CyclicBarrier + Phaser 处理分阶段大数据计算。

## 正文

见 [[Assets/2026/10/semaphore-countdownlatch-practices.md]]（全文约 3.4 千字，含代码示例与选型对比表）。

## 来源

- [并发编程"黑科技"：Semaphore和CountDownLatch的5个实战技巧，学会秒杀面试！](https://mp.weixin.qq.com/s/EQgBlIUavYhSAp6NN2cdUg)

## 附件

- [[Assets/2026/10/semaphore-countdownlatch-practices.md]]
