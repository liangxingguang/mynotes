# RocketMQ 进阶：消息可靠性、幂等、顺序消息、延时消息与高可用，一篇彻底搞懂

> 原文：https://mp.weixin.qq.com/s/oG2MVFFHiLeMgeDimbyt-w
> 说明：原文代码块在网页渲染中换行丢失，已按语义还原格式。

消息队列真正难的地方，从来不是“会不会发消息”，而是**消息发出去之后，能不能不丢、会不会重复、堆积了怎么办、顺序怎么保证、事务怎么处理，以及系统挂了还能不能继续工作**。

如果说基础篇解决的是“RocketMQ 是什么、怎么用”，那么进阶部分解决的就是实际项目中绕不开的问题。这一篇重点梳理 RocketMQ 在**消息可靠性、消息幂等、消息积压、顺序消息、消息过滤、延时消息、分布式事务、死信队列以及高可用**方面的核心知识。

## 一、如何保证消息的可用性/可靠性/不丢失呢？

消息可能会在三个阶段发生丢失：**生产阶段、存储阶段、消费阶段。** 所以要从这三个阶段考虑：

### 1.1 生产

生产阶段主要**通过请求确认机制，来保证消息的可靠传递**。

**1、同步发送**：同步发送的时候，要注意处理响应结果和异常。如果返回响应 OK，表示消息成功发送到了 Broker；如果响应失败，或者发生其它异常，都应该重试。

**2、异步发送**：异步发送的时候，应该在回调方法里检查，如果发送失败或者异常，都应该进行重试。

**3、处理超时**：如果发生超时的情况，也可以通过查询日志的 API，来检查是否在 Broker 存储成功。

### 1.2 存储

存储阶段，可以通过**配置可靠性优先的 Broker 参数来避免因为宕机丢消息**。简单说就是：**可靠性优先的场景都应该使用同步。**

**1、CommitLog 持久化**：消息只要持久化到 CommitLog（日志文件）中，即使 Broker 宕机，未消费的消息也能重新恢复再消费。

**2、Broker 刷盘机制**：包括同步刷盘、异步刷盘。不管哪种刷盘，都可以保证消息一定存储在 PageCache 中，也就是内存中。但是同步刷盘更加可靠，它是 Producer 发送消息后，等数据持久化到磁盘之后，再返回响应给 Producer。

**3、Broker 主从模式**：Broker 支持 Master 和 Slave 同步复制、异步复制。生产者的消息都是发送给 Master，但是消费既可以从 Master 消费，也可以从 Slave 消费。同步复制模式可以保证即使 Master 宕机，消息肯定在 Slave 中有备份，从而保证消息不会丢失。

### 1.3 消费

Consumer 保证消息成功消费的关键在于**确认的时机**。不要在收到消息后就立即发送消费确认，而是应该：**执行完所有消费业务逻辑之后，再发送消费确认。**

因为消息队列维护了消费的位置。如果业务逻辑执行失败了，没有确认，再去队列拉取消息，就还是之前的一条消息。所以，确认时机非常重要。

## 二、如何处理消息重复的问题呢？

RocketMQ 可以保证消息一定投递，且不丢失，但**无法保证消息不重复消费**。因此，需要在业务端做好：**消息的幂等性处理，或者做消息去重。**

幂等性是指一个操作可以执行多次而不会产生副作用，即无论执行多少次，结果都是相同的。例如支付场景下，消费者消费扣款的消息，对一笔订单执行扣款操作，金额为 100 元。如果因为网络不稳定等原因导致扣款消息重复投递，最终的业务结果要保证只扣款一次。

**消息去重**，是指在消费者消费消息之前，先检查一下是否已经消费过这条消息。业务端可以通过一个专门的表来记录已经消费过的消息 ID：

```java
public void processMessage(String messageId, String message) {
    if (!isMessageProcessed(messageId)) {
        // 处理消息
        markMessageAsProcessed(messageId);
    }
}
private boolean isMessageProcessed(String messageId) {
    // 查询去重表，检查消息ID是否存在
}
private void markMessageAsProcessed(String messageId) {
    // 将消息ID插入去重表
}
```

### 2.1 如何保证消息的幂等性？

首先，消息必须携带业务唯一标识，可以通过雪花算法生成全局唯一 ID：

```java
Message msg = new Message(TOPIC /* Topic */,
        TAG /* Tag */,
        ("Hello RocketMQ " + i).getBytes(RemotingHelper.DEFAULT_CHARSET) /* Message body */);
msg.setKey("ORDERID_100"); // 订单编号
SendResult sendResult = producer.send(message);
```

其次，在消费者接收到消息后，判断 Redis 中是否存在该业务主键的标志位。若存在标志位，则认为消费成功；否则执行业务逻辑，执行完成后，在缓存中添加标志位：

```java
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, ConsumeConcurrentlyContext context) {
    try {
        for (MessageExt messageExt : msgs) {
            String bizKey = messageExt.getKeys(); // 唯一业务主键
            // 1. 判断是否存在标志
            if (redisTemplate.hasKey(RedisKeyConstants.WAITING_SEND_LOCK + bizKey)) {
                continue;
            }
            // 2. 执行业务逻辑
            // TODO do business
            // 3. 设置标志位
            redisTemplate.opsForValue().set(RedisKeyConstants.WAITING_SEND_LOCK + bizKey, "1", 72, TimeUnit.HOURS);
        }
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    } catch (Exception e) {
        logger.error("consumeMessage error: ", e);
        return ConsumeConcurrentlyStatus.RECONSUME_LATER;
    }
}
```

然后，利用数据库的**唯一索引**来防止业务的重复插入：

```sql
CREATE TABLE `t_order` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) NOT NULL COMMENT '订单编号',
  `order_name` varchar(64) NOT NULL COMMENT '订单名称',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

最后，在数据库表中使用版本号，通过**乐观锁机制**来保证幂等性。每次更新操作时检查版本号是否一致，只有一致时才执行更新并递增版本号：

```java
public void updateRecordWithOptimisticLock(int id, String newValue, int expectedVersion) {
    int updatedRows = jdbcTemplate.update(
        "UPDATE records SET value = ?, version = version + 1 WHERE id = ? AND version = ?",
        newValue, id, expectedVersion
    );
    if (updatedRows == 0) {
        throw new OptimisticLockingFailureException("Record has been modified by another transaction");
    }
}
```

或者使用**悲观锁机制**，通过数据库的锁机制来保证幂等性：

```java
public void updateRecordWithPessimisticLock(int id) {
    jdbcTemplate.queryForObject("SELECT * FROM records WHERE id = ? FOR UPDATE", id);
    jdbcTemplate.update("UPDATE records SET value = ? WHERE id = ?", "newValue", id);
}
```

### 2.2 雪花算法了解吗？

雪花算法是由 Twitter 开发的一种分布式唯一 ID 生成算法，以 **64 bit** 存储组成 ID 的 4 个部分：

1. **最高位占 1 bit**，始终为 0，表示正数。
2. **中位占 41 bit**，值为毫秒级时间戳。
3. **中下位占 10 bit**，机器 ID，包括数据中心 ID 和机器 ID，可以支持 1024 个节点。
4. **末位占 12 bit**，值为当前毫秒内生成的不同的自增序列，值的上限为 4096。

目前雪花算法的实现比较多，可以直接使用 Hutool 工具类库中的 `IdUtil.getSnowflake()` 方法来获取雪花 ID：

```java
long id = IdUtil.getSnowflakeNextId();
```

## 三、怎么处理消息积压？

发生消息积压，核心就是：**提高消费能力。** 一般有两种办法。

**1、消费者扩容**：如果当前 Topic 的 Message Queue 的数量大于消费者数量，就可以对消费者进行扩容。通过增加消费者，来提高消费能力，尽快把积压的消息消费完。

**2、消息迁移 Queue 扩容**：如果当前 Topic 的 Message Queue 数量小于或者等于消费者数量，再扩容消费者就没什么用了。这时候就得考虑扩容 Message Queue。可以新建一个临时的 Topic，临时的 Topic 多设置一些 Message Queue。然后先用一些消费者把消费的数据丢到临时的 Topic（只是转发，不做业务处理，所以很快）。接下来用扩容的消费者去消费新的 Topic 里的数据，消费完了之后，再恢复原状。

## 四、顺序消息如何实现？

RocketMQ 提供了两种级别的顺序消息：**全局顺序、局部顺序。**

全局顺序是指整个 Topic 的所有消息都严格按照发送顺序消费。这种方式性能比较低，实际项目中用得不多。

局部顺序是指特定分区内的消息保证顺序。这是实际项目中比较常用的方式。要保证顺序，关键是：**把需要保证顺序的消息发送到同一个 MessageQueue 中。** 例如，根据订单 ID 选择队列：

```java
// 根据订单ID选择队列，保证同一订单的消息在同一队列
producer.send(message, new MessageQueueSelector() {
    @Override
    public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
        String orderId = (String) arg;
        int index = orderId.hashCode() % mqs.size();
        return mqs.get(index);
    }
}, orderId);
```

每个 MessageQueue 在 Broker 中对应一个 ConsumeQueue，消息按照到达 Broker 的顺序依次写入。当消费者开始消费某个 MessageQueue 时，会在 Broker 端对该队列加锁，其他消费者就无法同时消费这个队列。这样确保了同一时间只有一个消费者在处理某个队列，从而保证了消费顺序。

## 五、如何实现消息过滤？

消息过滤有两种方案。

**第一种：Broker 端过滤**。在 Broker 端按照 Consumer 的过滤逻辑进行过滤。好处是可以避免无用的消息传输到 Consumer 端。缺点是会加重 Broker 的负担，实现起来也相对复杂。

**第二种：Consumer 端过滤**。比如按照消息设置的 Tag 进行过滤。好处是实现起来简单。缺点是会有大量无用消息到达 Consumer 端，Consumer 只能丢弃而不处理。

一般采用 Consumer 端过滤。如果希望提高吞吐量，可以采用 Broker 过滤。消息过滤主要有三种方式。

**1、根据 Tag 过滤**（最常见，高效简单）：

```java
DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("CID_EXAMPLE");
consumer.subscribe("TOPIC", "TAGA || TAGB || TAGC");
```

**2、SQL 表达式过滤**（更加灵活）：

```java
DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("please_rename_unique_group_name_4");
// 只订阅有属性 a, 且 0 <= a <= 3 的消息
consumer.subscribe("TopicTest", MessageSelector.bySql("a between 0 and 3"));
consumer.registerMessageListener(new MessageListenerConcurrently() {
    @Override
    public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, ConsumeConcurrentlyContext context) {
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
});
consumer.start();
```

**3、Filter Server 方式**：最灵活也最复杂，允许用户自定义函数进行过滤。

## 六、延时消息了解吗？

电商的订单超时自动取消，就是一个典型的利用延时消息的例子。用户提交了一个订单，就可以发送一个延时消息，1h 后去检查这个订单的状态。如果还是未付款，就取消订单并释放库存。

RocketMQ 支持延时消息，只需要在生产消息的时候设置消息的延时级别：

```java
// 实例化一个生产者来产生延时消息
DefaultMQProducer producer = new DefaultMQProducer("ExampleProducerGroup");
producer.start();
int totalMessagesToSend = 100;
for (int i = 0; i < totalMessagesToSend; i++) {
    Message message = new Message("TestTopic", ("Hello scheduled message " + i).getBytes());
    // 设置延时等级3,这个消息将在10s之后发送(现在只支持固定的几个时间,详看delayTimeLevel)
    message.setDelayTimeLevel(3);
    producer.send(message);
}
```

但是目前 RocketMQ 支持的延时级别是有限的：

```
private String messageDelayLevel = "1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h";
```

### 6.1 RocketMQ 怎么实现延时消息的？

简单，八个字：**临时存储 + 定时任务。**

Broker 收到延时消息后，会先发送到主题 `SCHEDULE_TOPIC_XXXX` 的相应时间段的 Message Queue 中。然后通过一个定时任务轮询这些队列。消息到期后，再把消息投递到目标 Topic 的队列中。然后消费者就可以正常消费这些消息。

## 七、怎么实现分布式消息事务的？半消息？

**半消息**，是指暂时还不能被 Consumer 消费的消息。Producer 成功发送到 Broker 端的消息，但是此消息被标记为“暂不可投递”状态。只有等 Producer 端执行完本地事务，并经过二次确认之后，Consumer 才能消费这条消息。

依赖半消息，可以实现分布式消息事务。其中的关键在于：**二次确认以及消息回查。** 整个过程可以分为以下几个步骤：

1. **Producer 向 Broker 发送半消息**。
2. **Broker 暂时不投递消息**：Producer 端收到响应，消息发送成功。此时消息是半消息，被标记为“不可投递”状态，Consumer 消费不了。
3. **Producer 执行本地事务**。
4. **发送 Commit / Rollback**：正常情况下，本地事务执行完成。Producer 向 Broker 发送 Commit / Rollback。如果是 Commit，Broker 端将半消息标记为正常消息，Consumer 可以消费。如果是 Rollback，Broker 丢弃此消息。
5. **Broker 发起消息回查**：异常情况下，Broker 端迟迟等不到二次确认。在一定时间后，会查询所有的半消息，然后到 Producer 端查询半消息的执行情况。
6. **Producer 查询本地事务状态**。
7. **根据事务状态提交 Commit / Rollback** 到 Broker 端。这里的 5、6、7 就是消息回查。
8. **消费者消费消息**：消费者端消费到消息之后，执行本地事务。

## 八、死信队列知道吗？

死信队列用于存储那些无法被正常处理的消息。这些消息被称为：**死信（Dead Letter）。**

产生死信的原因是：消费者在处理消息时发生异常，并且达到了最大重试次数。当消费失败的原因排查并解决后，可以重发这些死信消息，让消费者重新消费。

如果暂时无法处理，为避免到期后死信消息被删除，可以先将死信消息导出并进行保存。

## 九、如何保证 RocketMQ 的高可用？

NameServer 因为是无状态，且不相互通信的，所以只要集群部署就可以保证高可用。

RocketMQ 的高可用主要体现在：**Broker 的读和写的高可用**，通过**集群 + 主从**实现。

Broker 可以配置两种角色：**Master、Slave。** Master 角色的 Broker 支持读和写。Slave 角色的 Broker 只支持读。Master 会向 Slave 同步消息。

也就是说：**Producer 只能向 Master 角色的 Broker 写入消息，Consumer 可以从 Master 和 Slave 角色的 Broker 读取消息。**

Consumer 的配置文件中，并不需要设置是从 Master 读还是从 Slave 读。当 Master 不可用或者繁忙的时候，Consumer 的读请求会被自动切换到 Slave。有了这种机制，当一个 Master 出现故障后，Consumer 仍然可以从 Slave 读取消息，这样就实现了**读的高可用**。

**那么发送端如何实现写的高可用？** 在创建 Topic 的时候，把 Topic 的多个 Message Queue 创建在多个 Broker 组上（相同 Broker 名称，不同 brokerId 的机器组成 Broker 组）。这样，当某个 Broker 组的 Master 不可用后，其他组 Master 仍然可用，Producer 仍然可以继续发送消息。

需要注意的是，RocketMQ 目前**不支持把 Slave 自动转成 Master**。如果机器资源不足，需要把 Slave 转成 Master，则需要：

1. 手动停止 Slave 角色的 Broker。
2. 更改配置文件。
3. 使用新的配置文件启动 Broker。

## 十、写在最后

消息队列真正进入实际项目之后，考验的就不只是“消息能不能发出去”。**消息会不会丢、重复消费怎么办、消息积压怎么办、顺序怎么保证、延时消息怎么实现、事务消息怎么保证，以及 Broker 挂了之后还能不能继续工作**，这些才是 RocketMQ 进阶阶段真正需要掌握的内容。
