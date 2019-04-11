## redis基础数据结构  
redis是目前比较流行的k-v内存，它支持以下五种基本的数据：string(字符串),list(列表),hash(哈希),set(集合),zset(有序集合)。下面介绍这五种基本数据类型
的基本用法。  
###string字符串  
string是Redis中最简单的数据结构。Redis所有的数据结构都是以唯一的key字符串作为名称，然后通过这个唯一key来获取对应的
value数据。在Redis中，string是可以修改的，内部结构类似于java中的ArrayList，采用预分配冗余空间的方式来减少内存的频繁
分配操作。当string长度小于1M是，扩容是加倍现有的空间；如果超过1M，扩容时一次只会多扩1M的空间。string最大的长度为512M.
#### 基本操作：
> set key1 aaa  
> get key1  
> exists key1  
> del key1  
> get name  
> set key2  
> set key3  
#### 批量操作  
> mget key1 key2 key3  
> mset key1 a key2 b key3 c key4 c  
> mget key1 key2 key3 key4  

#### 设置key过期
> set key1 abc  
> expire key1 10
> setex key2 10 abcd  
> setnx key5 abcde   

#### 计数  
如果value值是一个整数，可以对它进行自增操作，自增的范围为：singed long的最大和最小值。如果超出这个范围，Redis会报错。
> set count 20
> incr count 
> incrby count 5
> incrby count -10   

### list列表
list相当于java中的LinkedList,这意味着list的插入和删除操作非常快，时间复杂度为O(1),但是
索引定位很慢，时间复杂度为O(n)。当list弹出最后一个元素之后，该list自动被删除，内存被回收。list
常常被用于作为异步队列，将需要延后处理的任务结构体序列化成字符串塞进list中，另外一个线程从这个列表
中轮询数据进行处理。在底层，Redis是用quicklist(快速列表)来实现list数据结构。list常用操作如下：  
#### 右进左出  
> rpush list1 a b c d   
> llen list1  
> lpop  
#### 右进右出  
> rpush list1 a b c d  
> rpop list1  
#### 慢操作  
> rpush list1 a b c d   
> linex list1 1 #O(n)  
> lrang list1 0 -1 #获取所有元素, O(n)  
> ltrim list1 1 -1 # O(n)  

### hash(字典)  
hash 相当于java中的HashMap，内部采用数组+链表二维结构来实现。Redis中的hash的值只能是字符串。
在扩容的时候采用渐进式rehash的策略，这个和java中的HashMap不一样。渐进式rehash会在rehash同时
保留新旧两个hash结构，查询是会同时查询两个hash结构，然后在后续的定时任我中已经hash操作指令中，循序渐进
地将旧hash的内容迁移到新的hash结构中。和String一样，单个key可以进行计数。hash常用操作如下：  
> hset map key1 value1  
> hset map key2 value2  
> hgetall map  
> hlen  
> hget map key1   
> hmset map1 key1 value1 key2 value2  
> hincrby map key1 1  
### set(集合)  
set相当于java中的hashset。常用的操作如下：  
> sadd set a  
> sadd set b  
> smembers set  
> sismember set a  
> scard set    
> spop set  
### zset(有序集合)  
zset类似于java总的SortedSet和HashMap的结合体。它既像set一样，保证内部value的唯一性，它又能
可以给每一个value赋予score，代表这个value的排序权重，内部使用跳跃表来实现。常用操作有：  
> zadd set 1 "a"  
> zadd set 2 "b"  
> zrange set 0 -1  
> zrevrange books 0 -1  
> zcard set  
> zscore set "a"  
> zrank books "b"  
> zrangebyscore set -inf 1 withscores  
> zrem set "a"  

### 容器型数据结构的通用规则  
* create if not exists  
* drop is no elements
### 过期时间  
Redis 所有的数据结构都可以设置过期时间，时间到了，自动删除相应的对象。过期时间设置的单位是整个对象
不能对对象中某个key设置过期时间。如果string设置了过期时间后再对其进行set操作，过期时间会失效。  
