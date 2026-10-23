---
title: 异步任务系统怎么设计？从提交、排队、执行到幂等和重试
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/AfZ-w5215Bbi4HS6v1fsFA"
source_type: link
platform: wechat
captured: 2026-10-22
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-22-async-task-system-design.md
asset_ref: Assets/2026/10/async-task-system-design.md
---

# 异步任务系统怎么设计？从提交、排队、执行到幂等和重试

# 异步任务系统怎么设计？从提交、排队、执行到幂等和重试

> 原文：https://mp.weixin.qq.com/s/AfZ-w5215Bbi4HS6v1fsFA
> 说明：原文代码块在网页渲染中换行丢失，已按语义还原格式。

**摘要：**把耗时操作扔进线程池并不等于拥有异步任务系统。一个可靠系统需要任务身份、持久化队列、状态机、租约、幂等、重试、取消和可观测性。本文以批量导入为例拆解完整架构，并给出 Java 任务领取与状态更新核心代码。

用户上传一份 10 万行 Excel，接口把任务提交线程池后立即返回“已开始”。服务发布重启，线程池中的任务全部丢失；用户既看不到失败，也不知道该不该重新上传。

线程池解决的是同一进程内怎样调度线程。异步任务系统解决的是：请求结束、进程重启和机器故障之后，任务仍能被找到、接管、去重和查询。

## 先把任务当成一条业务数据

一个任务至少需要：

```text
task_id
type
payload_location
status
progress
attempt
next_run_at
lease_owner
lease_expire_at
result_location
error_code
created_at / updated_at
```

大文件不要直接塞进消息体或任务表；先写对象存储，任务只保存受权限保护的位置和校验值。

## 状态机比一列 status 更重要

```text
PENDING → RUNNING → SUCCEEDED
             ↘ RETRY_WAIT → PENDING
             ↘ FAILED
             ↘ CANCELLED
```

必须规定谁能触发迁移、迁移前提和失败后的恢复动作。`RUNNING → PENDING` 不能随便发生，只有租约过期且确认执行者失联时才允许接管。

状态更新使用条件更新避免并发覆盖：

```sql
UPDATE async_task
SET status = 'RUNNING',
    lease_owner = ?,
    lease_expire_at = ?,
    attempt = attempt + 1
WHERE task_id = ?
  AND status = 'PENDING';
```

受影响行数为 1 才说明领取成功。两个实例同时抢同一任务，只有一个能获得执行权。

## 为什么需要租约

工作节点领取任务后崩溃，状态会永远停在 RUNNING。租约规定执行权只在一定时间内有效，工作节点定期续租；过期后其他节点可以重新领取。

租约时间必须大于正常心跳抖动，又不能长到故障恢复太慢。长任务应定期检查自己是否仍持有租约，避免旧节点恢复后与新节点同时提交结果。

可以在更新中带上 owner 和版本：

```java
boolean complete(String taskId, String owner, long version) {
    return repository.updateToSuccess(
            taskId, owner, version, resultLocation) == 1;
}
```

如果租约已被别人接管，旧执行者的完成更新受影响行数为 0，结果不能覆盖新执行者。

## “至少一次执行”要求任务幂等

消息重复、消费者重启、提交响应丢失，都可能让同一任务执行多次。

批量导入可使用 `(task_id, row_number)` 作为幂等键；生成报表可以把结果写到确定路径，最后原子切换完成状态；发送通知要记录通知 ID，避免重复发送。

不要把“状态已经 RUNNING”当作唯一幂等保护。租约过期后重复执行正是系统设计的一部分。

## 重试必须区分错误

网络短暂失败可以退避重试；Excel 列名错误不会因为重试 5 次变正确；磁盘已满需要运维动作。

任务错误至少分成：

```text
RETRYABLE：短暂网络、限流、依赖切换
PERMANENT：格式错误、权限不足、数据不合法
MANUAL：结果不确定，需要人工确认后恢复
```

重试使用指数退避和随机抖动，并设置最大次数与总生命周期。达到上限进入 FAILED 或死信队列，不能无限循环消耗资源。

## 进度为什么不能每行都更新

处理 10 万行，每行更新一次任务表，会把进度功能变成数据库瓶颈。可以每处理 500 行或每 2 秒更新一次，并记录 `processed/total`。

进度是近似观测，不应该参与正确性判断。任务是否完成应以最终业务提交和状态转换为准。

## 取消是一种协作协议

用户点击取消后，把状态改为 `CANCEL_REQUESTED`。工作节点在批次边界检查：

```java
for (List<Row> batch : batches) {
    if (repository.isCancelRequested(taskId)) {
        cleanupPartialResult();
        repository.markCancelled(taskId);
        return;
    }
    processIdempotently(batch);
}
```

强杀线程可能把事务、文件和外部调用留在未知状态。任务应拆成可提交、可恢复的小批次，在安全点响应取消。

## 队列和数据库分别负责什么

数据库保存任务真相与查询状态；消息队列负责高效通知和削峰。只依赖 MQ，用户难以查询完整生命周期；只轮询数据库，吞吐和实时性可能不足。

一种组合是：创建任务和 Outbox 事件同事务提交，事件投递 MQ，消费者领取数据库任务。MQ 重复没有关系，数据库条件更新决定真正执行权。

## 运营一个任务系统需要哪些指标

- 各状态任务数与最老任务年龄；
- 排队时间 P95/P99；
- 执行时间与成功率；
- 每种错误的重试次数；
- 租约过期和任务接管次数；
- 重复执行被幂等拦截次数；
- 取消响应时间；
- 单租户占用与公平性。

还要设置背压：队列积压超过水位时，限制新任务提交或降低非核心任务优先级。无限接单只会把“立即失败”变成“几小时后失败”。

可靠异步系统的核心不是异步，而是任务状态可追踪、执行权可过期、副作用可去重、失败可分类、积压可控制。线程池只是执行环节中的一个零件。
