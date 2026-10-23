---
title: Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/g2xStkIY7ap8EVAnJPlA1A"
source_type: link
platform: 微信
captured: 2026-10-21
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-21-kafka-ops-tools-five-essentials.md
asset_ref: Assets/2026/10/kafka-ops-tools-five-essentials.md
---

# Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍

# Kafka 运维必备工具清单：这 5 个工具让排障快 10 倍

> 来源：https://mp.weixin.qq.com/s/g2xStkIY7ap8EVAnJPlA1A
> 抓取时间：2026-10-21（web-fetch，browser 级）

引言

先还原一个真实的排障现场：

业务方反馈"消费有延迟"，你登录服务器：

*   先看 Broker 日志？几千行，没有明显报错
*   再看监控大盘？只有集群级指标，看不出哪个组慢了
*   想查 Lag，敲 `kafka-consumer-groups.sh --describe`？几十个消费组、几百个分区刷屏，肉眼比对到眼花

最后定位到根因只花 20 分钟，但**"找到该看什么"花了 2 小时**。

Kafka 排障的痛点从来不是"看不到问题"，而是**没有趁手的工具把问题呈现出来**。这篇文章把运维 Kafka 集群（3 副本、50+ Topic、日均 2 亿消息）沉淀下来的 5 个工具一次性讲清：

*   **Kafka UI**——开源 Web 管理界面，Topic/消费组/Lag 一目了然，日常排障主力
*   **kafka-topics.sh**——命令行建/删/改 Topic，一切自动化操作的基础
*   **Kafka Manager**——Yahoo 出品，集群级监控的鼻祖
*   **CMAK**——Kafka Manager 的社区延续版，现状与选型必知
*   **Burrow**——LinkedIn 出品，消费 Lag 的智能告警（不靠拍脑袋定阈值）

每个工具都给：**出身背景 → 安装方式 → 高频命令/配置 → 输出解读 → 适用场景**。文末有五工具对比表和组合拳建议。先说结论：**Kafka UI（日常看）+ kafka-topics.sh（动手改）+ Burrow（自动告警）是 2026 年的推荐组合，CMAK 了解即可，新集群不必再上。**

* * *

## 一、五个工具简介

### 1.1 Kafka UI

**出身**：Provectus Labs 开源（GitHub: provectuslabs/kafka-ui），目前社区最活跃的 Kafka Web UI。

**定位**：一站式可视化管理——Topic、消费组、消息、Schema Registry、ACL 全覆盖。

**特点**：

*   浏览消息无需登录服务器，支持按 key/分区过滤、时间戳跳转
*   消费组 Lag 可视化：分区级明细、增量重置 offset
*   支持 SASL/SSL、OAuth2 认证接入
*   只读模式可配置（`READ_ONLY=true`），生产环境安全兜底

**现状**：持续活跃迭代，KRaft 集群支持良好。

```bash
# Docker 一行启动
docker run -d --name kafka-ui \
  -p 8080:8080 \
  -e KAFKA_CLUSTERS_0_NAME=prod-cluster \
  -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=broker1:9092,broker2:9092 \
  -e KAFKA_CLUSTERS_0_PROPERTIES_SECURITY_PROTOCOL=SASL_PLAINTEXT \
  -e KAFKA_CLUSTERS_0_PROPERTIES_SASL_MECHANISM=PLAIN \
  -e DYNAMIC_CONFIG_ENABLED=true \
  provectuslabs/kafka-ui:latest
```

### 1.2 kafka-topics.sh

**出身**：Kafka 发行版自带（`$KAFKA_HOME/bin/`），零安装。

**定位**：Topic 生命周期管理的标准命令行，也是 CI/CD 与自动化脚本的基础。

**特点**：

*   建/删/改/查 Topic 一条命令搞定
*   参数体系稳定，Kafka 2.2+ 统一走 `--bootstrap-server`（不再用 `--zookeeper`）
*   配合 `--describe` 的过滤参数可一键发现风险分区（ISR 缩减、Leader 不均）

**现状**：随 Kafka 版本演进，永远值得放首位学透。

```bash
# 随 Kafka 发行版自带，无需安装
ls $KAFKA_HOME/bin/ | grep -E "topics|consumer-groups"
# kafka-topics.sh  kafka-consumer-groups.sh  kafka-configs.sh ...
```

### 1.3 Kafka Manager

**出身**：Yahoo 2015 年开源，Kafka 集群管理界面的鼻祖（Yahoo 开发 Kafka 的主力团队出品）。

**定位**：多集群管理与监控——Topic 分布、Broker 指标、副本均衡一览。

**特点**：

*   多集群纳管（一个界面管 N 个集群）
*   分区副本分布可视化、首选 Leader 重选举、副本再均衡
*   Broker 级指标：消息进出速率、分区数、Leader 数

**现状**：**已停止原版维护**。2019 年项目移交 LinkedIn 并更名 CMAK——这就是下一个工具。列在这里是因为大量老文章还在推荐它，链接已 404，别再踩。

### 1.4 CMAK

**出身**：Kafka Manager 的社区延续版（GitHub: linkedin/cmak，原名 Yahoo/CMAK）。2019 年 Yahoo 将项目移交 LinkedIn 组织并正式更名 **CMAK（Cluster Manager for Apache Kafka）**。

**定位**：多集群管理平台，Kafka Manager 的正统续作。

**特点**：

*   继承 Kafka Manager 全部能力：多集群纳管、分区均衡、Leader 重选举
*   基于 Play 框架，Java 11 运行，单 zip 部署
*   依赖 ZooKeeper 做集群发现——**这是它最大的时代局限**

**现状**：维护基本停滞，官方仓库更新极少。**对 KRaft 集群支持不完整（ZK 发现模式不适配），新集群选型需谨慎**；存量 ZK 集群仍可继续使用。

```bash
# 安装：下载 release zip + Java 11
wget https://github.com/linkedin/cmak/releases/download/3.0.0.6/cmak-3.0.0.6.zip
unzip cmak-3.0.0.6.zip && cd cmak-3.0.0.6
# 核心配置 conf/application.conf
cmak.zkhosts="zk1:2181,zk2:2181,zk3:2181"   # CMAK 自身的 ZK（也可设 /kafka-manager 路径）
basicAuthentication.enabled=true            # ★ 必须开基础认证，它默认裸奔
basicAuthentication.username="admin"
basicAuthentication.password="Admin_Pass_2026"
# 启动
bin/cmak -Dconfig.file=conf/application.conf -Dhttp.port=9000
```

### 1.5 Burrow

**出身**：LinkedIn 2016 年开源（GitHub: linkedin/Burrow），Go 编写，单二进制。

**定位**：消费组 Lag 专用监控——不是"监控面板"，而是"告警决策引擎"。

**特点**：

*   **不用拍脑袋定阈值**：基于滑动窗口统计每个消费组的 Lag 基线，按漂移/倾斜自动判定状态
*   直连 Broker 读取 `__consumer_offsets`，**不需要 ZooKeeper**
*   多种告警通道：HTTP webhook / email / TCP，天然对接企微/钉钉/飞书机器人
*   HTTP API 查询任意消费组状态，适合做自愈触发器

**现状**：近年更新放缓，选型前确认仓库现状；但其"统计基线判定 Lag"的设计仍是 Lag 监控的教科书，同类工具（如 Kafka Exporter）只能做静态阈值。

```bash
# 安装方式一：Docker
docker run -d --name burrow -p 8000:8000 \
  -v $(pwd)/burrow.toml:/etc/burrow/burrow.toml \
  linkedin/burrow:latest
# 安装方式二：Go 源码编译
go install github.com/linkedin/Burrow@latest
```

* * *

## 二、Kafka UI：日常排障的主力界面

### 2.1 完整部署（docker-compose）

```yaml
version: "3.8"
services:
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: prod
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: broker1:9092,broker2:9092,broker3:9092
      KAFKA_CLUSTERS_0_PROPERTIES_SECURITY_PROTOCOL: SASL_PLAINTEXT
      KAFKA_CLUSTERS_0_PROPERTIES_SASL_MECHANISM: PLAIN
      KAFKA_CLUSTERS_0_PROPERTIES_SASL_JAAS_CONFIG: >-
        org.apache.kafka.common.security.plain.PlainLoginModule
        required username="viewer" password="Viewer_Pass_2026";
      # 生产安全三件套
      AUTH_TYPE: "OAUTH2"            # 接入公司 SSO（简单场景用 LOGIN_FORM）
      READ_ONLY_MODE: "true"         # ★ 只读模式：只看不动，防误操作
      DYNAMIC_CONFIG_ENABLED: "false"
```

**部署建议**：给开发一个只读实例（`READ_ONLY_MODE=true`），给运维一个全功能实例——九成的"帮我删个 Topic"工单从此消失。

### 2.2 高频场景一：消费组 Lag 排查

进入 Consumers 页签选中目标消费组，能直接看到分区级明细：

```
Group: order-pay-consumer          State: Stable
─────────────────────────────────────────────────
Partition  Offset(latest)  Current  Lag      Consumer
p0         8812041         8811041  1000     c-1
p1         8820113         8819013  1100     c-2
p2         8819027         8819027  0        c-3
p3         8817650         8810100  7550     ← 只有 p3 积压：不是消费慢，是数据倾斜
p4         8819988         8819988  0        c-1
```

**解读**：

*   **全分区 Lag 均匀上升** → 消费能力不足（扩消费者/加分区/优化消费逻辑）
*   **个别分区 Lag 独高** → 数据倾斜（热点 key）或该分区的消费者卡住
*   **State=Empty 但 Lag 不降** → 消费者全下线（服务挂了）
*   **State=Rebalancing** → 消费者频繁上下线，查 rebalance 风暴场景

UI 里还支持**增量重置 offset**（Reset Offset），替代命令行的 `--reset-offsets`，但生产建议只给管理员实例开。

### 2.3 高频场景二：消息内容审查

Messages 页签直接浏览指定分区的消息：

*   按 key / value 子串过滤，按时间戳跳转（排查"某个订单号的消息到底发没发"）
*   查看 key/value/header 原文，配合 Schema Registry 自动反序列化 Avro
*   对比生产侧与消费侧的同一消息，验证乱序/重复问题

这把过去"写消费者读消息再删消费者"的麻烦事变成 30 秒的网页操作——也是它比 CMAK 更适合日常排障的核心原因：**CMAK 看集群，Kafka UI 看数据**。

### 2.4 高频场景三：Topic 配置巡检

Topics 页签一眼扫过：

| 检查项 | 健康标准 | 隐患 |
| --- | --- | --- |
| 副本数 | ≥3（核心 Topic） | 副本 1 的 Topic 挂一台 Broker 就丢数据 |
| min.insync.replicas | 副本数-1（如 3 副本配 2） | 配 1 时 ISR 缩到 1 也能写，有丢数据风险 |
| retention.ms | 与业务对账窗口对齐 | 配过小 → 消费停滞超过保留期后消息永久丢失 |
| 分区数 | 与消费者并行度匹配 | 分区 < 消费者实例数 → 多余消费者空转 |

* * *

## 三、kafka-topics.sh：命令行参数速查

### 3.1 Topic 管理四件套

```bash
BS="--bootstrap-server broker1:9092,broker2:9092"

# ① 建 Topic（核心参数全展示）
kafka-topics.sh $BS --create --topic order-pay \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2 \
  --config cleanup.policy=delete

# ② 查列表 / 查详情
kafka-topics.sh $BS --list
kafka-topics.sh $BS --describe --topic order-pay

# ③ 扩分区（★ 只能加不能减，加之前想清楚 key 的分区归属会乱序）
kafka-topics.sh $BS --alter --topic order-pay --partitions 24

# ④ 删 Topic（需要 broker 端 delete.topic.enable=true，否则只是标记）
kafka-topics.sh $BS --delete --topic order-pay
kafka-topics.sh $BS --list | grep order-pay    # 验证删除
```

### 3.2 --describe 输出逐行解读

```
Topic: order-pay   PartitionCount: 12   ReplicationFactor: 3   Configs: min.insync.replicas=2,retention.ms=604800000
Topic: order-pay  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
Topic: order-pay  Partition: 5  Leader: 2  Replicas: 2,3,1  Isr: 2,3    ← ★ 这行有问题
```

| 字段 | 含义 | 异常信号 |
| --- | --- | --- |
| Leader | 该分区当前主副本所在 Broker | 与 Replicas[0] 不一致 = 未使用首选 Leader（负载不均） |
| Replicas | 副本分布的 Broker 列表（[0] 是首选 Leader） | 全部集中在少数 Broker = 分区不均衡 |
| Isr | 与 Leader 保持同步的副本集合 | **Isr 比 Replicas 短 = 有副本掉队**（磁盘/网络/GC 问题） |

### 3.3 一键发现风险分区的三个过滤参数

```bash
# ISR 缩减的分区（最常用——Replicas 3 个 Isr 只有 2 个的全列出来）
kafka-topics.sh $BS --describe --at-min-isr-partitions

# 没有 Leader 的分区（分区不可读写，严重故障）
kafka-topics.sh $BS --describe --unavailable-partitions

# 副本未完全同步的分区（含 min.isr 不达标）
kafka-topics.sh $BS --describe --under-replicated-partitions
```

**运维纪律**：这三个过滤条件应做成巡检脚本每天跑，输出非空即告警——比等 UI 上的红点更早发现问题。

### 3.4 配置修改：kafka-configs.sh（好搭档）

```bash
# 动态改 Topic 保留期（不用重启，立即生效）
kafka-configs.sh $BS --alter --entity-type topics --entity-name order-pay \
  --add-config retention.ms=259200000

# 查看动态配置
kafka-configs.sh $BS --describe --entity-type topics --entity-name order-pay
```

* * *

## 四、CMAK（原 Kafka Manager）：集群级管理

### 4.1 集群纳管配置

CMAK 部署后先在 Web 界面添加集群（Cluster → Add Cluster）：

```
Cluster Name:      prod-cluster
Cluster Zookeeper: zk1:2181,zk2:2181,zk3:2181/kafka    ← 业务集群的 ZK（非 CMAK 自身）
Kafka Version:     2.8.1
勾选: JMX Enabled、Poll consumer information（拉取消费组数据）
```

**注意**：业务集群必须开启 JMX 端口（`JMX_PORT=9999` 写进 broker 启动脚本），否则 CMAK 看不到消息速率等核心指标——这是部署后"界面空白"的最常见原因。

### 4.2 高频功能三件

```
① Topic 分布巡检（Topic → List → Distribution）
   broker1: 48 分区  broker2: 51 分区  broker3: 47 分区
   → 分布基本均衡；若出现 90:10:5 的悬殊分布，磁盘/CPU 会单点过热

② 首选 Leader 重选举（Preferred Leader Election）
   大量分区 Leader 偏离首选副本（如 Broker 重启恢复后）→ 一键触发回迁

③ 副本再均衡（Reassign Partitions）
   扩容新 Broker 后，按建议生成分配方案并执行迁移
   → 建议直接用 kafka-reassign-partitions.sh 生成 JSON，CMAK 里只做可视化确认
```

### 4.3 它还值不值得部署

| 判断 | 结论 |
| --- | --- |
| 存量 ZooKeeper 集群 + 需要多集群统一视图 | 可以用，注意开认证 |
| KRaft 新集群 | **不推荐**（ZK 发现模式不适配），用 Kafka UI 或 Prometheus 体系 |
| 需要 Topic 均衡/重选举的可视化操作 | 有价值，但同能力可用 CLI 脚本替代 |

一句话：**CMAK 是 ZK 时代的遗产，能力已逐步被 Kafka UI + CLI 覆盖，了解它主要是为了看懂老架构和别人的老文章。**

* * *

## 五、Burrow：消费 Lag 的智能告警

### 5.1 为什么"阈值告警"不够用

最常见的 Lag 告警是 `lag > 10000 告警`。三个问题：

1.  **每个消费组处理能力不同**——日志类消费组 10 万 Lag 是常态，支付类 1 千就该报警
2.  **Lag 的瞬时波动正常**——上游批量导入时 Lag 尖峰，几分钟后回落，阈值告警全是噪音
3.  **最该告警的是"消费停滞"**——Lag 不涨但也不降、Offset 停止推进，静态阈值发现不了

Burrow 的思路：**不设全局阈值，按每个消费组自己的历史基线做统计判定**——Lag 基线漂移、Offset 停滞、消费速率骤降都会被捕捉。

### 5.2 核心配置

```toml
[burrow]
server="http://burrow:8000"

[clientprofile.prod]
client-id="burrow"
kafka-version="2.8.1"

[cluster.prod]
class-name="kafka"                                  # 直连 broker 模式，无需 ZK
servers=["broker1:9092","broker2:9092","broker3:9092"]
client-profile="prod"
topic-refresh=60
offset-refresh=30

[consumer.prod_order]
class-name="kafka"
servers=["broker1:9092","broker2:9092","broker3:9092"]   # 读 __consumer_offsets
cluster="prod"
start-latest=true

# 智能评估规则：滑窗 10 个检查点，最小 3 个样本
[lagcheck]
intervals=10
min-distance=3
```

### 5.3 HTTP API：五种状态语义

```bash
# 查询单个消费组状态
curl -s http://burrow:8000/v3/kafka/prod/consumer/order-pay-consumer/status | jq

# 返回核心字段
{
  "status": "WARN",          ← 关键字段
  "errorcode": 0,
  "maxlag": { "partition": 3, "topic": "order-pay", "lag": 7550 },
  "total_lag": 9650
}
```

| 状态 | 含义 | 处置 |
| --- | --- | --- |
| OK | 正常（含正常波动） | 无 |
| WARN | Lag 相对基线漂移、消费变慢 | 观察，通常自动恢复 |
| STOP | Offset 完全停止推进 | **消费停滞，立即介入**（消费者挂了/卡死） |
| ERR | 消费组不存在或已删除 | 核对是否服务下线 |
| NOTFOUND | 查询的消费组没注册 | 配置拼写检查 |

**STOP 是最有价值的状态**——静态阈值永远发现不了的"假活"（Lag 不增不减、消费组在线但 Offset 不动），Burrow 用基线判定直接命中。

### 5.4 告警通知：webhook 对接 IM 机器人

```toml
[notify.prod-im]
class-name="http"
url-open="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
url-close="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
open-template="/etc/burrow/wechat.tmpl"    # 模板渲染消费组/分区/Lag
close-template="/etc/burrow/wechat-resolve.tmpl"
```

状态变化（进入告警/恢复）各推一条，带恢复通知——比阈值告警干净得多。

* * *

## 六、五工具对比

### 6.1 多维评分

| 维度 | Kafka UI | kafka-topics.sh | Kafka Manager | CMAK | Burrow |
| --- | --- | --- | --- | --- | --- |
| 部署成本 | 低（Docker） | 零（自带） | —（已停维） | 中（Java11+zip） | 低（单二进制） |
| 可视化能力 | 🏆 | 无 | 强 | 强 | 弱（纯API） |
| 集群级管理 | 中 | 🏆（脚本化最强） | 强 | 强 | 无 |
| 消费 Lag 监控 | 中 | 中 | 弱 | 弱 | 🏆 |
| 告警能力 | 无 | 无 | 无 | 无 | 🏆 |
| 自动化友好 | 弱 | 🏆 | 弱 | 弱 | 中（API） |
| KRaft 支持 | ✅ | ✅ | ❌ | ⚠ 不完整 | ✅ |
| 维护活跃度 | 🏆 活跃 | 随版本更新 | 已停维 | 基本停滞 | 放缓 |

### 6.2 角色适配

| 你的角色 | 首选 | 次选 |
| --- | --- | --- |
| 业务开发（查消息/看 Lag） | Kafka UI | kafka-consumer-groups.sh |
| 平台运维（建删改 Topic/扩分区） | kafka-topics.sh 脚本化 | Kafka UI（手工场景） |
| SRE（值班/告警/巡检） | Burrow | 三个 --describe 过滤参数巡检 |
| 多集群治理（老 ZK 架构） | CMAK | — |

### 6.3 推荐组合拳

```
标准 Kafka 运维工具栈（2026）：
├── 看（可视化）      → Kafka UI（只读实例给开发，全功能实例给运维）
├── 改（操作）        → kafka-topics.sh + kafka-configs.sh（全部脚本化进 Git）
├── 告警（Lag）       → Burrow（webhook → IM 机器人）
├── 告警（集群级）    → Prometheus kafka_exporter + Grafana（ISR/UnderMinISR 指标）
└── 集群治理（遗留）  → CMAK（仅存量 ZK 集群，新集群不再引入）
```

* * *

## 七、常见问题

### 7.1 Kafka Manager 和 CMAK 到底什么关系？老文章里该用哪个名？

同一个项目：Yahoo 2015 年开源时叫 Kafka Manager，2019 年移交 LinkedIn 并更名 CMAK。老文章说"Kafka Manager"，链接指向的都是现在的 linkedin/cmak。**实际使用认 CMAK 仓库即可**，只是部署前确认你的集群形态（ZK 还是 KRaft）。

### 7.2 生产环境部署 Kafka UI 有什么安全要点？

三条：**认证**（接入 SSO/OAuth2，至少 LOGIN_FORM，绝不能裸奔暴露到公网）、**最小权限**（对开发环境用只读模式 `READ_ONLY_MODE=true`，Kafka 侧账号也用只读 ACL）、**网络隔离**（管理类 Web 界面只在内网/跳板机可达）。所有 Kafka Web 工具默认都不带完善鉴权体系，靠部署层兜底是共识。

### 7.3 扩分区后消息乱序了，怎么避免？

Kafka 只保证**分区内有序**。按业务 key（如 orderId）路由的消息，扩分区后同一 orderId 可能落到新分区，与新分区里"正在处理的旧消息"产生乱序（幂等设计此时就是救命的）。规避姿势：扩分区前评估业务是否依赖全局顺序；确实要扩，在幂等和消费端按 key 去重上做保障，并选低峰执行。

### 7.4 Burrow 显示 STOP 但消费者进程明明活着，查什么？

按顺序查四件事：① 消费者线程是否卡死（`jstack` 看是否 WAITING 在 poll 之外的逻辑，如数据库慢查询）；② 是否 rebalance 风暴（Burrow 的 partition info 能看到 owner 频繁变化）；③ `max.poll.interval.ms` 是否超时（单批处理时间超限被踢出组）；④ Offset 提交是否被业务条件跳过。Burrow 的 STOP 常是这类"应用活着但消费死了"的唯一线索。

### 7.5 用了 Kafka UI 还需要学 CLI 吗？

需要，且 CLI 优先级更高：① 自动化（CI/CD 建 Topic、巡检脚本）只能靠 CLI；② 应急场景（UI 挂了/网络不通）CLI 是最后手段；③ 面试与排障沟通中，`--describe` 的 ISR/Leader 语义是通用语言。合理分工：**CLI 定义事实，UI 降低门槛**。

### 7.6 Lag 监控用 Burrow 还是 Kafka Exporter + Grafana？

不是二选一：**Kafka Exporter 出面板（人看），Burrow 出决策（机器判）**。Kafka Exporter 的阈值告警简单但噪音大；Burrow 的基线判定准但只有状态没有可视化曲线。标准做法：Grafana 面板 + Burrow webhook 告警双通道，各自扬长避短。

* * *

## 八、总结

### 选型决策树

```
Kafka 运维工具怎么选：
├── 只想装一个          → Kafka UI（可视化全覆盖，KRaft 友好）
├── 脚本化/自动化优先   → kafka-topics.sh（自带、稳定、可 Git 管理）
├── Lag 自动告警        → Burrow（基线判定，STOP 状态抓"假活"）
├── 存量 ZK 多集群      → CMAK（能继续用，别为它保持 ZK）
└── 新集群集群级监控    → Prometheus kafka_exporter + Grafana
```

### 高频命令速查表

| 场景 | 命令/入口 |
| --- | --- |
| 建 Topic | `kafka-topics.sh --create --partitions N --replication-factor 3 --config min.insync.replicas=2` |
| 查 ISR 缩减 | `kafka-topics.sh --describe --at-min-isr-partitions` |
| 查无 Leader | `kafka-topics.sh --describe --unavailable-partitions` |
| 查 Lag | `kafka-consumer-groups.sh --describe --group xxx` / Kafka UI Consumers 页 |
| 改保留期 | `kafka-configs.sh --alter --add-config retention.ms=xxx` |
| 消费停滞 | Burrow STOP 状态 / `--describe` 看 CURRENT-OFFSET 是否推进 |
| 消息审查 | Kafka UI Messages 页（按 key/时间过滤） |

### 一句话

> **Kafka UI 负责把"看不见"变成"一眼看懂"，kafka-topics.sh 负责把"手工运维"变成"脚本资产"，Burrow 负责把"人盯 Lag"变成"机器判异常"——三件套覆盖 95% 的日常排障场景；Kafka Manager/CMAK 是 ZK 时代的集群管理遗产，看得懂即可，新集群不必再引入。工具的最大价值不是炫技，而是把排障中"找该看什么"的两小时压缩成五分钟。**
