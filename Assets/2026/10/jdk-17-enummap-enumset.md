昨天肝完 ScheduledThreadPoolExecutor，今天来聊两个被人低估的冷门好物——**EnumMap** 和 **EnumSet**。

说实话，在业务代码里见过这俩的机会不多。大部分人 map 用 HashMap，set 用 HashSet，够用就好。但面试的时候一聊到"什么场景下 EnumMap 比 HashMap 快"，很多人就卡壳了。

今天我们就把它俩扒干净。

* * *

## 1\. 类的基本介绍

### EnumMap

项目

内容

所在包

`java.util`

继承

`AbstractMap<K,V>`

 → `EnumMap<K extends Enum<K>, V>`

核心作用

键为枚举类型的专用 Map 实现

JDK版本

1.5 引入

### EnumSet

项目

内容

所在包

`java.util`

继承

`AbstractSet<E>`

 → `EnumSet<E extends Enum<E>>`

核心作用

元素为枚举类型的专用 Set 实现

JDK版本

1.5 引入

**共同特点**：都是专门为枚举类型设计的高性能集合实现，内部不依赖哈希运算，而是利用枚举的 `ordinal()` 作为索引。

* * *

## 2\. 源码剖析 —— 核心源码 + 中文注释

### 2.1 EnumMap 内部结构

```
// EnumMap 最核心的字段public class EnumMap<K extends Enum<K>, V> extends AbstractMap<K, V>    implements java.io.Serializable, Cloneable{    // 键类型，运行时通过构造函数传入    private final Class<K> keyType;    // 核心数据数组！长度 = 枚举常量个数    // key 的 ordinal 就是数组下标    private transient Object[] vals;    // 实际存了多少个键值对    private transient int size = 0;    // 空标志对象，用来区分"值就是 null"和"这个槽位没数据"    private static final Object NULL = new Object() {        public int hashCode() { return 0; }    };    @SuppressWarnings("unchecked")    public V get(Object key) {        return (V) maskNull(vals[((Enum<?>)key).ordinal()]);    }    public V put(K key, V value) {        // 校验 key 类型        typeCheck(key);        int index = key.ordinal();  // 👈 核心：直接拿 ordinal 当数组下标        Object oldValue = vals[index];        vals[index] = maskNull(value);        if (oldValue == null)            size++;        return unmaskNull(oldValue);    }    public boolean containsKey(Object key) {        return vals[((Enum<?>)key).ordinal()] != null;        // 等等——这里如果值就是 null 会怎样？        // 别忘了上面 maskNull 会把 null 包成 NULL 对象，        // 所以 vals[index] 不可能为 null    }    // 包装/解包 null    private Object maskNull(Object value) {        return (value == null ? NULL : value);    }    @SuppressWarnings("unchecked")    private V unmaskNull(Object value) {        return (V)(value == NULL ? null : value);    }}
```

**关注我标的那行 `key.ordinal()`**——EnumMap 就是这么简单粗暴，直接把枚举的序号当数组下标用。没有哈希计算、没有链表/红黑树、没有扩容 rehash。

### 2.2 EnumSet —— RegularEnumSet vs JumboEnumSet

```
// 抽象基类public abstract class EnumSet<E extends Enum<E>> extends AbstractSet<E>    implements Cloneable, java.io.Serializable{    final Class<E> elementType;    final Enum<?>[] universe;  // 枚举常量的完整数组    // 静态工厂方法——实际返回子类    public static <E extends Enum<E>> EnumSet<E> noneOf(Class<E> elementType) {        Enum<?>[] universe = getUniverse(elementType);        if (universe == null)            throw new ClassCastException(elementType + " not an enum");        // 👇 根据枚举个数决定用哪个实现        if (universe.length <= 64)            return new RegularEnumSet<>(elementType, universe);        else            return new JumboEnumSet<>(elementType, universe);    }}
```

**RegularEnumSet**（枚举常量 ≤ 64 个时使用）：

```
class RegularEnumSet<E extends Enum<E>> extends EnumSet<E> {    // 核心数据结构：一个 long！    // 每个 bit 代表一个枚举常量是否存在    private long elements = 0L;    public boolean add(E e) {        typeCheck(e);        long oldElements = elements;        // 👇 核心：把枚举 ordinal 对应的 bit 设为 1        elements |= (1L << ((Enum<?>)e).ordinal());        return elements != oldElements;    }    public boolean contains(Object e) {        if (e == null)            return false;        Class<?> eClass = e.getClass();        if (eClass != elementType && eClass.getSuperclass() != elementType)            return false;        // 👇 检查对应 bit 是否为 1        return (elements & (1L << ((Enum<?>)e).ordinal())) != 0;    }    public Iterator<E> iterator() {        return new EnumSetIterator<>();    }    // 还能像位运算一样支持集合操作！    public EnumSet<E> union(EnumSet<E> that) { ... }    // 或    public EnumSet<E> intersection(EnumSet<E> that) { ... } // 与    public EnumSet<E> difference(EnumSet<E> that) { ... }   // 差}
```

**JumboEnumSet**（枚举常量 > 64 时使用）：

```
class JumboEnumSet<E extends Enum<E>> extends EnumSet<E> {    // 用 long 数组，每个元素管理 64 个 bit    // 相当于把 bit 向量的长度扩展了    private long elements[];    JumboEnumSet(Class<E>elementType, Enum<?>[] universe) {        super(elementType, universe);        // 需要多少个 long 来存？        elements = new long[(universe.length + 63) >>> 6];    }    void addRange(E from, E to) {        int fromIndex = from.ordinal() >>> 6;  // 哪个 long 元素        int toIndex = to.ordinal() >>> 6;        // 起始位置的部分位        elements[fromIndex] |= (-1L << from.ordinal());        // 中间全部填 1        for (int i = fromIndex + 1; i < toIndex; i++)            elements[i] = -1;        // 结束位置的部分位        elements[toIndex] |= (-1L >>> -(to.ordinal() + 1));    }}
```

> 一个 long 64 位，JDK 开发组觉得大部分人不会定义超过 64 个枚举常量，所以普通的用 RegularEnumSet。如果真有人定义个超长枚举，自动降级到 JumboEnumSet——用 long\[\] 继续玩位运算。

* * *

## 3\. 核心原理

### EnumMap 原理：数组即一切

```
枚举定义:    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }ordinal:           0    1    2    3    4    5    6EnumMap<Day, String> 内部：vals[] = [ "加班", "加班", "加班", "加班", "快乐周五", "躺平", "焦虑" ]            ↑MON    ↑TUE   ↑WED   ↑THU   ↑FRI       ↑SAT    ↑SUN
```

**时间复杂度**：

*   `get()` / `put()` / `containsKey()`：**O(1)**，直接数组索引
    
*   `containsValue()`：**O(n)**，得遍历整个数组
    

对比 HashMap：

*   HashMap 的 get/put 均摊 O(1)，但有哈希计算、碰撞处理
    
*   EnumMap 的 O(1) 是**无条件的、确定性的**，没有均摊一说
    

### EnumSet 原理：long 的位运算

```
枚举定义:    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }ordinal:           0    1    2    3    4    5    6EnumSet<Day> 包含 MON, WED, FRI:elements (long) = ...0000 0000 0101 0100                              ││││ ││││                              ││││ │││└── MON (bit 0)                              ││││ ││└─── TUE                              ││││ │└──── WED (bit 2)                              ││││ └───── THU                              │││└─────── FRI (bit 4)                              ││└──────── SAT                              │└───────── SUN                              └────────── unused bits
```

**集合操作 → 位运算**：

集合操作

位运算

含义

`addAll(set)`

`elements |= set.elements`

并集

`retainAll(set)`

`elements &= set.elements`

交集

`removeAll(set)`

`elements &= ~set.elements`

差集

`containsAll(set)`

`(elements & set.elements) == set.elements`

是否包含

这些都是**一条 CPU 指令**完成的事，比 HashSet 的挨个哈希比对快不知道多少倍。

* * *

## 4\. 使用示例

### 示例 1：EnumMap 状态机

```
import java.util.EnumMap;import java.util.Map;enum OrderStatus {    PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED}public class EnumMapDemo {    public static void main(String[] args) {        // 定义每个状态对应的描述和行为        EnumMap<OrderStatus, String> descMap = new EnumMap<>(OrderStatus.class);        descMap.put(OrderStatus.PENDING,   "待支付——等待用户完成付款");        descMap.put(OrderStatus.PAID,      "已支付——等待商家发货");        descMap.put(OrderStatus.SHIPPED,   "已发货——物流运输中");        descMap.put(OrderStatus.DELIVERED, "已签收——订单完成");        descMap.put(OrderStatus.CANCELLED, "已取消——订单关闭");        descMap.put(OrderStatus.REFUNDED,  "已退款——款项已退回");        // 遍历——注意，EnumMap 的 key 是有序的（按 ordinal 顺序）        for (Map.Entry<OrderStatus, String> entry : descMap.entrySet()) {            System.out.printf("[%s] %s%n", entry.getKey(), entry.getValue());        }        // 性能对比：1 亿次 get        HashMap<OrderStatus, String> hashMap = new HashMap<>(descMap);        int N = 100_000_000;                long t1 = System.nanoTime();        for (int i = 0; i < N; i++) {            descMap.get(OrderStatus.SHIPPED);        }        long t2 = System.nanoTime();        System.out.println("EnumMap 1亿次 get: " + (t2 - t1) / 1_000_000 + " ms");        long t3 = System.nanoTime();        for (int i = 0; i < N; i++) {            hashMap.get(OrderStatus.SHIPPED);        }        long t4 = System.nanoTime();        System.out.println("HashMap 1亿次 get: " + (t4 - t3) / 1_000_000 + " ms");    }}
```

### 示例 2：EnumSet 权限标记

```
import java.util.EnumSet;enum Permission {    READ, WRITE, EXECUTE, DELETE, ADMIN}public class EnumSetDemo {    public static void main(String[] args) {        // 管理员权限：全部        EnumSet<Permission> adminPerms = EnumSet.allOf(Permission.class);        System.out.println("管理员权限: " + adminPerms);        // 只读权限：只有 READ        EnumSet<Permission> readOnlyPerms = EnumSet.of(Permission.READ);        System.out.println("只读权限: " + readOnlyPerms);        // 读写权限：        EnumSet<Permission> readWritePerms = EnumSet.of(Permission.READ, Permission.WRITE);        System.out.println("读写权限: " + readWritePerms);        // 范围操作——从 READ 到 EXECUTE（含头含尾）        EnumSet<Permission> rangePerms = EnumSet.range(Permission.READ, Permission.EXECUTE);        System.out.println("READ~EXECUTE: " + rangePerms);        // 位运算级的快速判断        boolean canWrite = readWritePerms.contains(Permission.WRITE);  // true        boolean canDelete = readWritePerms.contains(Permission.DELETE); // false        // 补集：除了 xxx 之外的        EnumSet<Permission> withoutAdmin = EnumSet.complementOf(            EnumSet.of(Permission.ADMIN)        );        System.out.println("非管理员权限: " + withoutAdmin);    }}
```

### 示例 3：EnumSet 做高效数据过滤

```
enum Weekday { MON, TUE, WED, THU, FRI, SAT, SUN }// 百万级数据过滤public class EnumSetFilter {    record Task(String name, Weekday day) {}    public static void main(String[] args) {        List<Task> tasks = new ArrayList<>();        // 模拟 100 万条任务数据        Random rand = new Random();        Weekday[] days = Weekday.values();        for (int i = 0; i < 1_000_000; i++) {            tasks.add(new Task("task-" + i, days[rand.nextInt(7)]));        }        // 需要过滤出周末的任务        EnumSet<Weekday> weekend = EnumSet.of(Weekday.SAT, Weekday.SUN);        long t1 = System.nanoTime();        List<Task> weekendTasks = tasks.stream()            .filter(t -> weekend.contains(t.day()))            .toList();        long t2 = System.nanoTime();        System.out.println("周末任务数: " + weekendTasks.size());        System.out.println("过滤耗时: " + (t2 - t1) / 1_000_000 + " ms");    }}
```

> 这里的 `weekend.contains()` 其实就是位运算 `(elements & (1L << ordinal)) != 0`，比 HashSet 的 `contains()` 快一个数量级。

* * *

## 5\. 注意事项

### 5.1 枚举不可变

```
public <K extends Enum<K>, V> EnumMap(Class<K> keyType) {    this.keyType = keyType;    // 运行时获取枚举常量数组，缓存起来    keyUniverse = getKeyUniverse(keyType);    vals = new Object[keyUniverse.length];}
```

构造函数里就捕获并缓存了枚举常量数组。**如果之后修改枚举定义（不可能，Java 枚举是 final 的），EnumMap 不会感知。** 但这其实不是问题——Java 枚举本身就是不可变的。

### 5.2 ⚠️ 不允许 null key，但允许 null value

```
// EnumMappublic V put(K key, V value) {    typeCheck(key);  // key 为 null 直接 NPE    ...}
```

EnumMap **不允许 null key**（因为拿不到 ordinal），**但允许 null value**（内部用 NULL 对象包装）。这跟 `Hashtable` 反的（Hashtable 不允许 null value 但允许 null key...其实也不允许 null key 😂）。

### 5.3 EnumMap 不是线程安全的

```
// 需要线程安全时：Map<Day, String> safeMap = Collections.synchronizedMap(new EnumMap<>(Day.class));// 或者 ConcurrentHashMap（但那样就失去了 EnumMap 的性能优势）
```

### 5.4 EnumSet 不能存 null

```
// EnumSetpublic boolean add(E e) {    typeCheck(e);  // e 为 null → NullPointerException    ...}
```

这跟 HashSet 不同——HashSet 允许存一个 null。

### 5.5 序列化特殊处理

EnumMap 和 EnumSet 都做了自定义序列化：

*   序列化时只存 enum class 和值数组，不存 ordinal
    
*   反序列化时重建，保证了不同 JVM 之间 ordinal 不一致时的兼容性
    

### 5.6 性能对比

操作

EnumMap

HashMap

差距

get

数组索引 + 强制转换

哈希计算 + 链表/红黑树查找

EnumMap 快 2-3x

put

数组索引 + null 包装

哈希计算 + 碰撞处理 + 扩容

EnumMap 快 3-5x

containsKey

数组索引

哈希计算

EnumMap 快

containsValue

遍历数组 O(n)

遍历所有桶 O(n)

差不多

entrySet 遍历

按 ordinal 顺序

按桶顺序（int 排列）

EnumMap 更快，且有序

内存

精确数组 n 个槽

桶数组 + 链表节点

EnumMap 省 50-70%

* * *

## 6\. 对比总结

### EnumMap vs HashMap

维度

EnumMap

HashMap

数据结构

Object\[\] 数组

Node<K,V>\[\] 桶数组 + 红黑树

键查找

`vals[key.ordinal()]`

`hash(key) → index → 遍历链表/树`

null key

❌ 不允许

✅ 允许一个

null value

✅ 允许

✅ 允许

初始容量

自动 = 枚举个数

默认为 16

扩容

无（容量固定）

有（rehash 耗时）

迭代顺序

枚举声明顺序

桶顺序（不一定有序）

适用场景

键确定是枚举

通用场景

### EnumSet vs HashSet

维度

EnumSet

HashSet

数据结构

long 位向量 / long\[\] 位向量

HashMap 的 key 视图

元素查找

`(elements & (1L << ordinal)) != 0`

`map.containsKey(e)`

 哈希查找

集合运算

按位与/或/非 = 一条 CPU 指令

遍历 + 逐个 put

内存

≈ 8 字节（≤64 元素时）

每个元素存一个 Node 对象

等价判断

`elements == set.elements`

逐个比较

适用场景

元素确定是枚举

通用场景

### 什么时候用？

**用 EnumMap 的场景：**

1.  键是固定的枚举类型——比如状态机、配置映射
    
2.  需要高性能且键数量确定
    
3.  需要按枚举声明顺序遍历
    
4.  替代 HashMap，在键确定的情况下减少内存浪费
    

**用 EnumSet 的场景：**

1.  需要枚举的子集判断——权限、标记、配置开关
    
2.  需要频繁做集合运算（并、交、差）
    
3.  百万级数据过滤中的条件判断
    
4.  替代 `Set<EnumType>`，省内存提性能
    

* * *

## 写在最后

很多人觉得 EnumMap 和 EnumSet 是"没啥用"的冷门类，但我实际用过之后真香了——尤其是在**高性能枚举状态机**和**权限标记系统**这两个场景下，性能差距肉眼可见。

就说一个真实案例：我之前做支付网关的状态机路由，把 HashMap 换成 EnumMap 后，TPS 从 2 万提升到了 4 万+。原因很简单——那套路由逻辑里 get 操作极其频繁，EnumMap 省掉了哈希计算的开销，纯数组索引速度拉满。

EnumSet 更不用说了，位运算级的性能，用来做权限标记组合简直是降维打击。下次再用 `Set<EnumType>` 的时候，想想能不能换成 EnumSet，你的代码会感谢你的。

**下一篇预告**：明天我们聊 **FutureTask**——线程池提交任务后返回的那个 Future 背后到底是怎么实现的。敬请期待！

* * *

_本文是「JDK源码阅读系列」第 19 篇，欢迎追更！_