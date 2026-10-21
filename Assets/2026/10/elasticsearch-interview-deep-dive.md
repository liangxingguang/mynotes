# Elasticsearch 面试万字长文：倒排索引、集群、写入、查询、分词、深度分页、索引优化

> 来源：https://mp.weixin.qq.com/s/4K_8IJ8DFwPbO8Dwz_OSJg
> 抓取时间：2026-10-21（web-fetch，browser 级）

> 7 大核心模块 + 大量生产踩坑 + 面试加分点。一句话核心链路：**查什么词，直接翻词典，找到倒排列表取文档，需要排序再查列存。** 但背后的 FST、跳表、BM25、Doc Values、Segment、translog、search_after，才是真正拉开差距的地方。如果只能记住一句话：**主分片数量提前规划，副本按需动态调整，角色分离让控制面和数据面解耦。**

## 一、倒排索引原理

### 一句话核心定义

倒排索引是 ES 实现**全文检索**的核心数据结构，本质是"通过词条 (Term) 找文档 (Document)"，与传统数据库"通过文档找内容"的正排索引正好相反。

举个例子。假设有两条文档：文档1 `Elasticsearch is fast`、文档2 `Elasticsearch is powerful`。

| 词项 (Term) | 倒排列表 (Postings List) |
| --- | --- |
| elasticsearch | [1,2] |
| is | [1,2] |
| fast | [1] |
| powerful | [2] |

用户搜 "elasticsearch"，无需扫描所有文档，直接拿到文档 1、2，这就是 O(1) 级的查询提速。

**面试加分点**：正排索引适合按 ID 查内容，倒排索引适合按关键词查所有包含该词的文档，这就是 ES 做全文检索比 MySQL 快几个数量级的根本原因。

### ES 倒排索引的三大核心结构

1. **Term Dictionary（词条字典）**：存储所有文档分词后得到的不重复词条；按字典序排序，天然支持前缀匹配、模糊查询；本质是一个排序好的字符串数组。
2. **Posting List（倒排列表）**：存储包含某个词条的所有文档 ID；额外存储词频 (TF)、位置 (Position)、偏移量 (Offset) 元数据——这些元数据是相关性评分、高亮显示、短语精确查询的基础。
3. **Term Index（词条索引）**：**ES 独有的优化结构，90% 的面试者会漏掉**。是 Term Dictionary 的"索引的索引"，存储词条前缀和对应磁盘位置；采用 **FST（有限状态转换器）**，内存占用仅为哈希表的 1/10；将查询复杂度从 O(n) 降到 O(log n)。

### 构建与查询流程

构建（文档写入时）：文档经分词器拆成词条 → 在 Term Dictionary 查找/新增 → Posting List 添加文档 ID 和元数据 → 定期刷写磁盘生成不可变 Segment。

查询（用户搜索时）：查询词经相同分词器拆分 → Term Index 定位 Term Dictionary 位置 → 取 Posting List → BM25 相关性评分 → 返回 Top N。

用 JSON 思维看，一个 `text` 字段的倒排就像：

```json
"fast": {
  "postings": [
    {"docId": 1, "tf": 1, "positions": [2]}
  ]
}
```

### 为什么这么设计

1. **Segment 不可变**：Lucene 每收一批文档写成一个 Segment，一旦生成不再修改，不用加锁，多线程并发查询超快。
2. **近实时搜索**：默认 1s refresh，把内存的文档刷成新 Segment，让新数据可见。
3. **排序/聚合不怕**：倒排索引擅长找文档，不擅长"按价格排序"，所以 ES 额外维护 **Doc Values（正排列存）**作为排序和聚合的数据源。

### 进阶优化点（面试加分项）

- **跳表 (Skip List)**：Posting List 内部使用跳表，大幅提升多个 Posting List 合并（AND/OR 查询）的效率
- **FST 压缩**：百万级词条仅占用几 MB 内存
- **段合并 (Merge)**：定期将小 Segment 合并成大 Segment，减少磁盘 IO

一句话总结：**查什么词，直接翻词典，找到倒排列表取文档，需要排序再查列存**。这条链路让 ES 在 PB 级数据下仍能毫秒响应。

## 二、ES 集群架构：Node 角色、分片与副本

### Node 节点角色

| 角色 | 核心职责 | 配置方式 | 生产建议 |
| --- | --- | --- | --- |
| Master 节点 | 集群元数据管理（索引创建/删除、分片分配）、集群状态维护 | `node.roles: [master]` | 单独部署 3 个组成脑裂防护组，**奇数个** |
| Data 节点 | 存储索引数据、执行 CRUD/搜索/聚合 | `node.roles: [data]` | 水平扩展主力，SSD+大内存，冷热分层 |
| Coordinating 节点 | 接收客户端请求、路由、汇总结果返回 | `node.roles: []` | 大流量场景单独部署 |
| Ingest 节点 | 写入前预处理（管道、转换、过滤） | `node.roles: [ingest]` | 数据清洗复杂时单独部署 |

**关键点**：生产环境强烈建议**角色分离**，不要让一个节点同时承担 Master 和 Data 角色，避免数据节点压力过大导致 Master 不稳定，引发集群脑裂。

**踩过的坑**：3 节点集群没分离角色，所有节点 master+data。一个数据节点 GC 超时导致 Master 心跳丢失，触发重选，整个集群短暂不可用。后来拆成 3 个专用 Master + 若干 Data + 2 个 Coordinating，集群稳如老狗。

### 分片（Shard）

分片是 ES 数据存储的最小单元，本质是一个 Lucene 索引。

1. **水平扩展**：分片分散到多节点，突破单节点瓶颈
2. **并行计算**：搜索/聚合在多个分片同时执行，最后汇总
3. **主分片（Primary Shard）**：数据写入的唯一入口，每个文档只属于一个主分片
4. **分片数量一旦创建不可修改**（ES7+ 默认 1 个主分片，ES6 及以前默认 5 个）

**生产建议**：单个分片大小控制在 **10GB-50GB** 之间，过小增加元数据负担，过大影响恢复和迁移速度。

### 副本（Replica）

1. **高可用**：主分片所在节点宕机，副本自动提升为新主分片
2. **负载均衡**：读请求可路由到主分片或任意副本，提升查询吞吐
3. **数据可靠性**：多副本避免单点故障丢数据

关键点：

- 主分片和它的副本**绝对不能在同一个节点上**
- 副本数量可以动态修改，生产通常 **1-2 个副本**（3 副本以上性价比低）
- 写入只在主分片执行，成功后同步到所有副本

3 节点集群示例（3 主分片 + 1 副本）：

```
         Node 1            Node 2            Node 3
      ┌──────────┐     ┌──────────┐     ┌──────────┐
      │ P0       │     │ P1       │     │ P2       │
      │ R1       │     │ R2       │     │ R0       │
      └──────────┘     └──────────┘     └──────────┘
```

### 核心机制

1）**路由公式**：

```
shard_num = hash(_routing) % num_primary_shards
```

这也是**主分片数一旦设定就不能改**的原因——mod 的分母变了，所有文档的路由都会乱掉。要改只能重建索引 + Reindex。

2）**读写流程**：

- **写**：先写主分片，再同步副本。默认 `wait_for_active_shards=1`，生产可设 all 保证多数派写入
- **读**：协调节点轮询主/副分片，加副本能**线性提升读并发**

3）**副本的双刃剑**：✅ 高可用+读性能提升；❌ 降低写入速度、占更多磁盘内存。不是副本越多越好。

### 面试加分总结

1. 角色分离实现职责清晰：Master 管管理、Data 管存储、Coordinating 管路由
2. 分片解决水平扩展和并行计算，副本解决高可用和读负载均衡
3. 生产核心原则：Master 奇数个、角色分离、单分片 10-50GB、1-2 副本
4. 常见坑：分片数不合理、主副分片同节点、混合角色节点压力过大

## 三、写入流程：refresh、flush、translog

**核心逻辑**：写入先到内存 + 日志，再通过 refresh 实现可搜索，最后通过 flush 完成磁盘持久化。

### 三大核心机制对比

| 机制 | 触发时机 | 核心作用 | 数据持久化 | 性能影响 | 默认配置 |
| --- | --- | --- | --- | --- | --- |
| refresh | 定时/手动 | 让数据可搜索（近实时） | ❌ 仅生成内存 Segment | 中（生成倒排索引耗 CPU） | 1 秒 |
| translog | 每次写入/定时刷盘 | 防节点宕机数据丢失 | ✅ 先写内存，默认每次请求 fsync | 低（顺序写性能极高） | 每 5 秒刷盘，每次请求同步刷盘 |
| flush | translog 满/定时/手动 | 真正持久化到磁盘 | ✅ 内存 Segment+translog 全量刷盘 | 高（磁盘 IO 密集） | 30 分钟或 translog 达 512MB |

### 2.1 refresh：近实时搜索的核心

- ES 不是实时搜索，是**近实时（NRT）**，根源就是 refresh
- 内存缓冲区的原始数据不能直接搜索，必须生成倒排索引结构的 Segment
- refresh 只是把数据从 JVM 堆内存移到**操作系统文件缓存（OS Cache）**，并没有刷到物理磁盘
- 频繁 refresh 会产生大量小 Segment，合并压力暴增

### 2.2 translog：数据可靠性的保障

- 解决内存数据易失性：节点宕机时用 translog 恢复
- **先写 translog，再写内存缓冲区**，默认每次写入请求等待 translog fsync 后才返回成功
- 顺序写，对写入性能影响极小
- 可配置异步刷盘提升写入性能（牺牲少量可靠性）

### 2.3 flush：真正的磁盘持久化

- flush 做两件事：① 内存所有 Segment 刷到物理磁盘；② 清空对应 translog
- 重操作，ES 自动控制频率；translog 达 512MB 或 30 分钟未 flush 自动触发
- 手动 flush 一般只在重启节点、关闭索引、备份数据时使用

### 三者关系与常见误区

```
写入数据 → 内存缓冲区 + translog → refresh → 生成内存Segment（可搜索） → flush → Segment刷盘 + 清空translog
```

- refresh 不影响 translog，只有 flush 才清空 translog
- 宕机重启：先加载磁盘 Segment，再重放 translog 中未 flush 的操作

高频误区：

1. ❌ refresh 会把数据刷到磁盘 → 错，只到 OS Cache
2. ❌ translog 在 flush 之后才写入 → 错，写入时就同步写了
3. ❌ flush 和 refresh 是一回事 → 错，flush 负责持久化，refresh 负责可搜索

### 实战优化建议

- 非实时场景（日志分析）：refresh 间隔调大到 30s~1min，写入性能提升数倍
- 写入量大、可靠性要求稍低：`index.translog.durability: async`
- 避免手动频繁 flush
- 合理设置 `index.translog.flush_threshold_size`，避免恢复时间过长

**比喻**：写入像往银行存钱——translog 是小票凭证，refresh 是柜员把钞票放进柜台透明抽屉（能看到拿不走），flush 是下班后统一押运进金库。

## 四、查询流程：Query Then Fetch

ES 默认搜索类型 `query_then_fetch`，把搜索拆成**先筛选、后拉取**两阶段，核心目的是**用最小网络开销完成分布式排序与分页**。

### 阶段一：Query（海选）

- 协调节点广播请求到所有相关分片（主或副本）
- 每个分片本地执行搜索，生成优先级队列，只返回 `from + size` 个文档的 **ID** 和**排序所需字段**（如 _score）
- 协调节点收集所有分片结果，内存全局排序，截断出最终文档 ID 列表
- **关键**：查第 1000 页时，每个分片要返回 `1000 * pageSize` 条数据，这就是性能杀手

### 阶段二：Fetch（决赛圈）

- 协调节点按文档 ID 向所在分片发起 **Multi-Get**
- 各分片返回完整 `_source`、高亮、存储字段
- 协调节点拼装响应返回客户端

**超市买年货比喻**：Query 阶段=派店员只拿价签（ID+得分）回来比价排序挑出 10 件；Fetch 阶段=拿挑好的价签让店员把实物搬来。如果一开始就让店员把整箱货搬出来再挑，网络和体力直接崩。

### 核心关键点

1. Query 阶段只返回 `doc_id + 相关性评分`，大幅减少网络传输
2. 每个分片独立执行查询，分布式并行
3. 默认优先选副分片执行查询，分担主分片写压
4. **深度分页根源**：`from=10000, size=10` 时每个分片返回 10010 条，协调节点合并 `分片数 × 10010` 条，内存压力指数增长

### 常见误区

"Query 阶段分片是不是只给协调节点传 10 条？"——不是。`from=90, size=10` 每个分片必须回传 **100 条**，协调节点从 N×100 条里排序砍掉前 90 条。

### 与 Query And Fetch 的区别

- **Query And Fetch** 是单阶段：每个分片直接返回完整 top N 文档，协调节点只排序
- 优势：少一次网络往返更快；劣势：网络传输量极大，只适合 size 很小（<10）的场景

### 深度分页解法

1. `search_after`（游标实时滚动，推荐）
2. `scroll API`（一次性全量导出）
3. 不推荐：改 `index.max_result_window`，大幅增加集群内存风险

## 五、分词器与 IK 分词器配置

数据库 `like '%手机%'` 像拿尺子量整篇文章逐字对齐；分词器是把"我想买华为手机"切成"我/想/买/华为/手机"再建倒排，搜索"手机"直接命中，还能相关性算分。

### 分词器三组件（执行顺序严格）

| 组件 | 作用 | 常见例子 |
| --- | --- | --- |
| Character Filter（字符过滤器） | 预处理原始文本 | HTML 标签过滤、表情替换、大小写转换 |
| Tokenizer（分词器） | 切分成独立词项 | 标准分词器、空格分词器、IK 分词器 |
| Token Filter（词项过滤器） | 词项二次处理 | 小写转换、停用词、同义词扩展、词干提取 |

关键知识点：

- ES 内置分词器**对中文支持极差**（标准分词器把中文拆成单字）
- 分词发生在**索引时**和**搜索时**两个阶段，两者必须使用相同的分词器，否则会搜不到

### IK 分词器两种模式

- `ik_smart`：智能切分，粗粒度，适合搜索时
- `ik_max_word`：最细粒度切分，穷尽组合，适合索引时

例："我爱北京天安门"——ik_smart：`["我","爱","北京","天安门"]`；ik_max_word：`["我","爱","北京","天安门","天安","门"]`

### 索引级别配置

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_ik_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase", "my_stop_filter"]
        }
      },
      "filter": {
        "my_stop_filter": {
          "type": "stop",
          "stopwords_path": "stopwords.dic"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "analyzer": "my_ik_analyzer",
        "search_analyzer": "ik_smart"
      }
    }
  }
}
```

索引时用 `ik_max_word` 切得更全，搜索时用 `ik_smart` 避免过度匹配，查准率和查全率平衡。

### 热更新配置（生产必备）

在 `config/analysis-ik/IKAnalyzer.cfg.xml` 配置远程词典地址：

```xml
<entry key="remote_ext_dict">http://your-server/dict/custom.dic</entry>
<entry key="remote_ext_stopwords">http://your-server/dict/stopwords.dic</entry>
```

IK 每分钟自动检测远程词典的 `Last-Modified` 头，有变化自动重新加载。

插件安装：

```bash
cd /usr/share/elasticsearch/bin
./elasticsearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.17.10/elasticsearch-analysis-ik-7.17.10.zip
systemctl restart elasticsearch   # 滚动重启
```

验证：

```json
POST _analyze
{
  "analyzer": "ik_max_word",
  "text": "程序员面试必备宝典"
}
```

### 生产落地方案：IK + MySQL 远程词典

官方 IK 自带只能改文件重启，生产用**字典热更新**：配 HTTP 接口定时拉取词库，IK 内部线程默认**每 60 秒**请求接口，响应头 `Last-Modified`（或 MD5）有变化就自动重载，完全不用重启 ES。接口背后连 MySQL，运营后台加新词后一分钟内自动感知。需要秒级就得改 IK 源码轮询间隔或换文件监听方案。

### 踩过的坑

1. **索引和搜索分词器不一致**：文档里有内容却搜不到，最常见的坑
2. **没用自定义词典**：专业术语被错误切分（"小米手机"拆成"小/米/手机"）
3. **停用词配置不当**：重要词被过滤
4. **热更新不生效**：远程词典没正确设置 `Content-Type: text/plain` 和 `Last-Modified` 头
5. **版本不匹配**：IK 版本必须和 ES 完全一致，否则启动失败

### 排查"明明有数据但搜不出来"

九成跟分词结果有关。第一板斧 `_analyze` API 看切词：

```json
GET _analyze
{
  "analyzer": "ik_max_word",
  "text": "我想买最新款华为手机"
}
```

关键术语被切开=词典没覆盖；再看 mapping 确认 `analyzer`/`search_analyzer` 是否配错；最后 `_termvectors` 看文档真正词项，两头一对就定位。

## 六、深度分页：from+size、scroll、search_after

### 为什么有深度分页问题

分页查询时：协调节点向所有分片发请求 → 每个分片返回 `from + size` 条 → 协调节点合并全局排序取 size 条。`from=9990, size=10` 时每个分片返回 10000 条，10 个分片 10 万条，协调节点内存排序 10 万条取最后 10 条——**内存和 CPU 开销指数增长，极易 OOM**。

### 三种分页方案

**1. from+size（最常用但有硬限制）**

- 默认最多查前 10000 条（`index.max_result_window`），这是防恶意深度分页拖垮集群的安全机制
- ✅ 支持跳页、简单；❌ 深分页性能极差、OOM 风险
- 适用：**前 100 页的浅分页**
- 不推荐改 `index.max_result_window` 硬扛

**2. scroll（滚动查询，适合全量导出）**

- 第一次查询生成**数据快照**保存上下文，后续通过 scroll_id 分批取
- ✅ 无 10000 条限制；❌ 不支持跳页、快照看不到后续更新、占内存保存上下文
- 适用：全量导出、离线分析（**绝对不能用于用户实时分页**）

**3. search_after（官方推荐的深度分页方案）**

- 利用**上一页最后一条的排序值**作为下一页查询条件，每次只查 size 条
- 关键要求：必须使用**唯一且不可变的排序字段**（通常 _id 兜底）
- ✅ 无限制、性能始终稳定、实时、内存极低；❌ 不支持跳页
- 适用：大数据量实时分页（APP 无限滚动、下拉加载）

```json
GET /order/_search
{
  "size": 10,
  "sort": [
    { "order_id": "asc" }
  ],
  "search_after": [ 1024 ]
}
```

为什么能解决：每个分片只需取 `size` 条 `order_id > 1024` 的数据，不用拉取并丢弃大量无效数据；协调节点合并量始终是 `shards * size`，不随翻页深度膨胀。

### 核心指标对比

| 分页方式 | 最大查询量 | 跳页 | 实时性 | 性能 | 内存 | 场景 |
| --- | --- | --- | --- | --- | --- | --- |
| from+size | 默认 10000 | ✅ | ✅ 实时 | 浅快深极差 | 深分页极高 | 网站普通分页（前 100 页） |
| scroll | 无限制 | ❌ | ❌ 快照级 | 全量快 | 高 | 全量导出、离线分析 |
| search_after | 无限制 | ❌ | ✅ 实时 | 始终稳定 | 极低 | APP 无限滚动、实时分页 |

### 面试加分点

1. **为什么 search_after 比 scroll 好**：scroll 要保存整个查询上下文快照；search_after 每次独立查询不保存上下文，内存小且支持实时数据
2. **为什么必须唯一排序字段**：排序字段不唯一（只按时间）时，同一时间多条数据会导致下一页丢数据或重复，必须加 _id 作第二排序字段
3. **业务必须跳页怎么办**：限制跳页范围（最多第 100 页）；前端缓存前几页排序值实现有限跳页；超大数据量用滚动查询预生成分页数据

**总结**：浅分页用 from+size，全量导出用 scroll，实时大数据分页用 search_after——行业最佳实践。

## 七、索引优化（设计/写入/查询/运维四维）

### 设计阶段（最关键，决定 80% 性能）

1. **分片数规划**：每分片建议 20-40GB，分片数 = 节点数 × 1.5~3。❌ 误区：越多越好——过多分片增加 Master 元数据压力。示例：3 节点 100GB → 6 分片
2. **副本数**：写入密集型临时设 0，写完恢复；查询密集型 1-2，生产至少 1
3. **字段映射**：禁用 `_all`；不分词用 `keyword`，不索引设 `index: false`；大文本 `text+keyword` 双类型
4. **ILM 索引生命周期**：按时间分索引，冷热分离，过期自动删除/归档

Mapping 建模优化表：

| 优化点 | 错误做法 | 正确做法 | 收益 |
| --- | --- | --- | --- |
| 字段类型 | 字符串全用 text | 精确匹配 keyword，全文才 text | 省倒排和分词开销 |
| 动态映射 | 全开 dynamic:true | dynamic:strict，显式定义核心字段 | 避免字段爆炸和类型冲突 |
| 数值类型 | 全部 long | 够用选 byte/short/integer，金额用 scaled_float | 磁盘和缓存友好 |
| 不需要的字段 | _source 全存 | 大字段 `enabled:false`（谨慎） | 磁盘 IO 锐减 |

⚠️ 经典坑：订单状态枚举存成 text 还用 term 查，永远查不到——text 会分词成小写，term 查的是精确未分词 token。改 keyword 立马解决。

### 写入阶段优化

1. **批量写入**：Bulk API，每批 5-15MB，不超 1000 条/次
2. **刷新间隔**：写入密集型调大到 30s~60s，减少段合并压力
3. **段合并策略**：`LogByteSizeMergePolicy`，`max_merge_at_once=10`、`segments_per_tier=10`
4. **Translog**：`index.translog.durability: async`，`sync_interval: 30s`，牺牲少量可靠性换写入性能

### 查询阶段优化

1. **避免全表扫描**：必带过滤条件，禁止 `match_all` 查大量数据
2. **合理使用路由**：相同路由值数据同分片，查询只查一个分片（如商品按商家 ID 路由）
3. **分页**：浅 from+size / 深 search_after / 离线 scroll
4. **filter 优先**：`filter` 代替 `query`，不算分且缓存结果，性能提升 3-10 倍

### 运维阶段优化

1. **节点角色分离**：Master/Data/Ingest/Coordinating 分离
2. **堆内存**：物理内存一半，**绝对不超过 31GB**（超 32GB JVM 压缩指针失效，内存利用率骤降）
3. **磁盘**：必须 SSD，使用率不超 85%（超过 ES 自动禁写）
4. **监控告警**：分片状态、段合并次数、GC 频率、磁盘使用率、查询延迟

### 优化清单

| 场景 | 优化方向 | 关键参数/方法 |
| --- | --- | --- |
| 海量日志写入 | 牺牲实时可见性、批量写入 | refresh_interval=30s, async translog, bulk 10MB |
| 电商搜索查询 | 精确路由、预缓存、filter 缓存 | routing，filter bool，禁用脚本评分 |
| 磁盘紧张 | 压缩、减少 copy、清理旧数据 | codec: best_compression, force merge, 滚动删索引 |
| GC 频繁 | 控制分片大小、堆比例、段数量 | 分片<50GB，堆<30GB，段数<500 |

业务场景展开：

- 日志系统：按天分索引 + ILM 冷热分离 + forcemerge 只读索引
- 电商系统：商品索引路由优化 + 索引别名无缝切换
- 大数据场景：跨集群搜索 + 分片级负载均衡
