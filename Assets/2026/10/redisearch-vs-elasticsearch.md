# 换掉ES！Redis官方搜索引擎来了，性能炸裂！（RediSearch 介绍与实操）

> 原文：https://mp.weixin.qq.com/s/L5VrkgzkEGWrsWOgX9aCHA （公众号「Java基基」，2026-10-09）

## 1、介绍

RediSearch 是一个 Redis 模块，为 Redis 提供查询、二次索引和全文搜索。要使用 RediSearch，首先要在 Redis 数据上声明索引，然后可以使用查询语言来查询该数据。

RediSearch 使用压缩的反向索引进行快速索引，占用内存少，通过提供精确的短语匹配、模糊搜索和数字过滤等功能增强了查询能力。

## 2、实现特性

*   基于文档的多个字段全文索引
*   高性能增量索引
*   文档排序（由用户在索引时手动提供）
*   在子查询之间使用 AND 或 NOT 操作符的复杂布尔查询
*   可选的查询子句
*   基于前缀的搜索
*   支持字段权重设置
*   自动完成建议（带有模糊前缀建议）
*   精确的短语搜索
*   在许多语言中基于词干分析的查询扩展
*   支持用于查询扩展和评分的自定义函数
*   将搜索限制到特定的文档字段
*   数字过滤器和范围
*   使用 Redis 自己的地理命令进行地理过滤
*   Unicode 支持（需要 UTF-8 字符集）
*   检索完整的文档内容或只是 ID 的检索
*   支持文档删除和更新与索引垃圾收集
*   支持部分更新和条件文档更新

## 3、对比 Elasticsearch

RediSearch 构建索引的时间为 221 秒，而 Elasticsearch 为 349 秒，快了 58%。

## 4、索引构建测试

模拟一个多租户电子商务应用程序，每个租户代表一个产品类别并维护自己的索引。基准测试构建了 50K 个索引（或产品），每个索引最多存储 500 个文档（或项目），总共 2500 万个文档。

RediSearch 仅用了 201 秒就构建了索引，平均每秒运行 125K 个索引。然而，Elasticsearch 在 921 个索引后崩溃了，显然它不是为应对这种负载而设计的。

## 5、查询性能测试

数据集被索引后，使用在专用负载生成器服务器上运行的 32 个客户端启动两个单词的搜索查询。RediSearch 吞吐量达到了 12.5K 操作/秒，而 Elasticsearch 为 3.1K 操作/秒，速度提高了 4 倍。

此外，RediSearch 延迟稍好一些，平均为 8 毫秒，而 Elasticsearch 为 10 毫秒。

## 6、安装

安装目前分为源码和 docker 安装两种方式。

**源码安装**

```
git clone https://github.com/RediSearch/RediSearch.git
cd RediSearch # 进入模块目录
make setup
make install
```

**docker 安装**（原包编译较复杂，推荐 docker）

```
docker run -p 6379:6379 redislabs/redisearch:latest
```

**判断是否安装成功**

```
127.0.0.1:0>module list
1) 1) "name"
   2) "ReJSON"
   3) "ver"
   4) "20007"
2) 1) "name"
   2) "search"
   3) "ver"
   4) "20209"
```

返回数组存在 "ft" 或 "search"（不同版本），表明 RediSearch 模块已经成功加载。

## 7、命令行操作

### 1.1 创建索引

创建索引可类比创建表结构：索引名代表表名，字段代表字段，属性即表示属性。

```
ft.create "student" schema "name" text weight 5.0 "sex" text "desc" text "class" tag
"OK"
```

student 表示索引名，name、sex、desc 表示字段，text 表示类型；"weight" 为权重，默认值为 1.0。创建的索引原生 Redis 不认识（`type student` 返回 none），证明使用的是插件。

### 1.2 创建文档

注意字段名可以用双引号但必须是英文引号（中文引号会导致 `Fields must be specified in FIELD VALUE pairs` 错误）。

```
ft.add student 001 1.0 language "chinese" fields name "张三" sex "男" desc "这是一个学生" class "一班"
"OK"
```

其中 001 为文档 ID，"1.0" 为评分（缺少会报 `Could not parse document score`）；language 指明使用的语言，默认英文——没有此标记存储没问题，但不可以通过中文字符查询。

### 1.3 查询

**全量查询**

```
FT.SEARCH student * SORTBY sex desc RETURN 3 name sex desc
```

**匹配查询**（limit 用于分页；未设置 language chinese 时中文全量匹配结果为 0）

```
ft.search student "张三" limit 0 10 RETURN 3 name sex desc
```

**后置匹配（前缀模糊）**

```
ft.search student "李*" SORTBY sex desc RETURN 3 name sex desc
```

**模糊搜索**：全量模糊匹配基于 Levenshtein 距离（LD），在术语周围加 "%" 实现，最大 LD 为 3——本质是相似度查询，并非一般意义上的模糊搜索。

```
FT.SEARCH beers "%%张店%%"
```

RediSearch 对文本分词使用的是 friso（相比 ES 的 ik 弱一些，但对中文分词体积小、可移植性强）。可结合后置匹配：

```
FT.SEARCH idx "数*" LANGUAGE chinese HIGHLIGHT
```

或结合 Levenshtein 算法：

```
FT.SEARCH idx "%%单的树%%" LANGUAGE chinese HIGHLIGHT
```

**字段查询**

```
ft.search student '@phone:185* @name:豆豆'
```

### 1.4 删除

```
ft.del student 002      # 删除文档
ft.drop student         # 删除索引
```

### 1.5 查看

```
FT._LIST                    # 查看所有索引
ft.get student 001          # 获取单条数据
ft.mget student 001 002     # 获取多条数据
```

### 1.6 索引别名操作

```
FT.ALIASADD xs student      # 添加别名（一个索引可起多个别名）
FT.ALIASDEL xs              # 删除别名
```
