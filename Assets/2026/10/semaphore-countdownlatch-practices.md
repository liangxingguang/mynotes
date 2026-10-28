# 并发编程"黑科技"：Semaphore和CountDownLatch的5个实战技巧，学会秒杀面试！

> 来源：https://mp.weixin.qq.com/s/EQgBlIUavYhSAp6NN2cdUg

## 一、面试官最爱问的并发工具类，你真的会用吗？

Java 并发包里的"瑞士军刀"：Semaphore 和 CountDownLatch。这些工具就像厨房里的专用刀具，用对了事半功倍，用错了可能还不如一把菜刀来得实在。

## 二、Semaphore：不止是"线程计数器"

**1. 停车场思维理解信号量**

Semaphore 就像停车场的闸机，permits 参数就是车位数量。线程获取许可（acquire()）相当于开车进停车场，释放许可（release()）就像开车离开。

```java
// 创建5个车位的停车场
Semaphore semaphore = new Semaphore(5);

// 开车进停车场（获取许可）
semaphore.acquire();
try {
    // 执行业务逻辑
} finally {
    // 开车离开（释放许可）
    semaphore.release();
}
```

**2. 实战技巧：动态调整系统并发度**

秒杀系统中可以用 Semaphore 控制同时处理的订单数量：

```java
// 根据服务器CPU核心数动态调整许可数量
int permits = Runtime.getRuntime().availableProcessors() * 2;
Semaphore orderSemaphore = new Semaphore(permits);

// 秒杀接口中
orderSemaphore.acquire();
try {
    // 处理订单逻辑
} finally {
    orderSemaphore.release();
}
```

**3. 高级操作：tryAcquire 实现非阻塞获取**

```java
// 尝试获取许可，500毫秒超时
if (semaphore.tryAcquire(500, TimeUnit.MILLISECONDS)) {
    try {
        // 成功获取许可
    } finally {
        semaphore.release();
    }
} else {
    // 获取失败，返回友好提示
}
```

## 三、CountDownLatch：线程协作的"倒计时器"

**1. 运动会开幕式理解闭锁**

想象运动会开幕式需要等待所有方阵入场才能开始。每个方阵到达后倒计时减1，当倒计时归零时，主持人宣布开幕。

```java
// 创建倒计时器，初始计数为10（10个方阵）
CountDownLatch latch = new CountDownLatch(10);

// 每个方阵线程
new Thread(() -> {
    try {
        // 方阵入场
    } finally {
        // 计数减1
        latch.countDown();
    }
}).start();

// 等待所有方阵入场（阻塞直到计数为0）
latch.await();
// 宣布开幕
```

**2. 实战技巧：批量接口的超时控制**

```java
// 最多等待3秒，避免无限阻塞
if (latch.await(3, TimeUnit.SECONDS)) {
    // 所有任务完成
} else {
    // 部分任务超时，做降级处理
}
```

**3. 高级用法：实现线程池的优雅关闭**

```java
// 等待所有任务完成再关闭线程池
CountDownLatch latch = new CountDownLatch(taskCount);

executorService.submit(() -> {
    try {
        // 任务逻辑
    } finally {
        latch.countDown();
    }
});

latch.await();
executorService.shutdown();
```

## 四、90%的人都会踩的3个坑

1. **Semaphore 忘记释放许可**

```java
// 错误示范
if (condition) {
    semaphore.acquire();
    // 业务逻辑
    semaphore.release(); // 若业务逻辑抛异常，这里不会执行
}
```

✅ 正确做法：必须在 finally 中释放

2. **CountDownLatch 计数设置错误**

```java
// 错误示范：创建时计数为5，却调用了6次countDown()
CountDownLatch latch = new CountDownLatch(5);
for (int i = 0; i < 6; i++) {
    new Thread(latch::countDown).start();
}
```

✅ 正确做法：确保 countDown() 调用次数与初始计数一致

3. **滥用 CountDownLatch 代替线程池**：不要为每个任务创建新线程，应该配合线程池使用

## 五、并发工具类的选型指南

| 工具类 | 典型场景 | 核心优势 | 注意事项 |
|---|---|---|---|
| Semaphore | 限流、资源池 | 可动态调整许可数 | 必须释放许可 |
| CountDownLatch | 等待多任务完成 | 简单直观 | 计数不可重置 |
| CyclicBarrier | 多线程协同工作 | 可重复使用 | parties 必须一致 |
| Phaser | 复杂阶段任务 | 动态调整参与方 | 实现复杂 |

## 六、写在最后

并发工具类就像乐高积木，单独使用功能有限，组合起来却能搭建复杂系统。比如：

- Semaphore + CountDownLatch：实现有限线程池的批量任务执行
- CyclicBarrier + Phaser：处理分阶段的大数据计算

思考题：如何用 Semaphore 实现一个简单的限流器？

**推荐阅读：**《Java并发编程的艺术》；阿里技术团队《Java并发容器最佳实践》；美团技术博客《高并发场景下的限流策略》
