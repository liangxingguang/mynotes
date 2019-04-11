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


