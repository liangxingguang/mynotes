## JDK源码阅读(10) — HashSet & LinkedHashSet：说好的"不重复"是怎么做到的？

大家好呀！今天我们轻松一下，聊个老熟人——**HashSet**。

说实话，HashSet 是我最早学会的集合类之一，用了这么久，真到看源码才发现……"哦，原来你只是套了个 HashMap 的壳？"

对，就是这么回事。今天我们把 HashSet 和 LinkedHashSet 的底裤扒干净。

* * *

## 一、继承体系：就这？

```
java.lang.Object  ↳ java.util.AbstractCollection<E>      ↳ java.util.AbstractSet<E>          ↳ java.util.HashSet<E>              ↳ java.util.LinkedHashSet<E>
```

HashSet 继承 AbstractSet，而 AbstractSet 又继承 AbstractCollection。从名字就能看出来，AbstractSet 把 Set 接口中那些基于 `equals` 去重的基础逻辑实现了（比如 `containsAll` 之类的）。

而 HashSet 自己……几乎没写几行核心代码。

* * *

## 二、源码解剖：真相只有一个——HashMap 壳子

### 2.1 全局变量

```
public class HashSet<E>    extends AbstractSet<E>    implements Set<E>, Cloneable, java.io.Serializable{    // 核心！底层就是一个 HashMap    private transient HashMap<E,Object> map;    // 所有 key 共享的同一个虚值    private static final Object PRESENT = new Object();    // ...}
```

看到没？**HashSet 内部有一个 HashMap**，所有添加的元素都是这个 HashMap 的 **key**，而 value 统一用 `PRESENT` 这个静态占位对象。

我当年看到这行代码笑了——原来去重的真相就是 HashMap 的 key 不能重复啊！

### 2.2 构造方法

```
// 无参构造：默认容量16，负载因子0.75public HashSet() {    map = new HashMap<>();}// 指定初始容量public HashSet(int initialCapacity) {    map = new HashMap<>(initialCapacity);}// 指定容量和负载因子public HashSet(int initialCapacity, float loadFactor) {    map = new HashMap<>(initialCapacity, loadFactor);}// 从已有集合构造public HashSet(Collection<? extends E> c) {    map = new HashMap<>(Math.max((int) (c.size()/.75f) + 1, 16));    addAll(c);}// 包级私有构造：支持 LinkedHashSet// 关键！dummy 参数只是用来区分方法签名HashSet(int initialCapacity, float loadFactor, boolean dummy) {    map = new LinkedHashMap<>(initialCapacity, loadFactor);}
```

最后一个带 `dummy` 的构造方法很有意思。它是包级私有的，专门给 **LinkedHashSet** 用的。`dummy` 这个参数没有任何实际作用，纯粹是为了让方法签名区别于前一个构造方法。LinkedHashSet 就是靠这个方法让底层变成 **LinkedHashMap**，从而保留插入顺序。

我觉得 Java 设计者这里可以做得更优雅一点，比如用一个枚举参数或者 Builder 模式，但……二十多年前的代码，能跑就行 😂

### 2.3 add 方法

```
public boolean add(E e) {    return map.put(e, PRESENT) == null;}
```

就一行。

*   调用 `map.put(e, PRESENT)`
    
*   如果 e 之前不存在于 map 中，`put` 返回 null → `null == null` → `true`，表示添加成功
    
*   如果 e 已经存在，`put` 返回被覆盖的旧 value（也就是 `PRESENT`） → `PRESENT == null` → `false`，表示添加失败
    

巧妙的 null 判断。既有语义（"没有旧值说明是新元素"），又做了去重。

### 2.4 remove / contains / size

```
public boolean remove(Object o) {    return map.remove(o) == PRESENT;}public boolean contains(Object o) {    return map.containsKey(o);}public int size() {    return map.size();}public boolean isEmpty() {    return map.isEmpty();}
```

全是委派给 HashMap 的。可以说是最纯粹的"组合优于继承"实践了——虽然 HashSet 本身继承自 AbstractSet，但核心功能全凭组合。

### 2.5 迭代器

```
public Iterator<E> iterator() {    return map.keySet().iterator();}
```

返回的是 HashMap 的 `keySet` 迭代器。所以 HashSet 的遍历顺序……就是 HashMap 的遍历顺序：

*   正常情况下：**无序**（取决于 hash 桶的分布）
    
*   如果底层是 LinkedHashMap（LinkedHashSet）：**插入顺序**
    

这里有个点值得注意：HashMap 的 keySet 迭代器是 **fast-fail** 的，所以 HashSet 在遍历期间也不能修改结构（会抛 ConcurrentModificationException）。

### 2.6 clone 和序列化

```
@SuppressWarnings("unchecked")public Object clone() {    try {        HashSet<E> newSet = (HashSet<E>) super.clone();        newSet.map = (HashMap<E,Object>) map.clone();        return newSet;    } catch (CloneNotSupportedException e) {        throw new InternalError(e);    }}// 序列化：只写 capacity、loadFactor、size 和元素@java.io.Serialprivate void writeObject(java.io.ObjectOutputStream s)    throws java.io.IOException {    s.defaultWriteObject();    s.writeInt(map.capacity());    s.writeFloat(map.loadFactor());    s.writeInt(map.size());    for (E e : map.keySet())        s.writeObject(e);}
```

注意 `writeObject`：它没有直接序列化 HashMap 对象，而是自己写 capacity、loadFactor、size 和 keySet 元素。为什么？因为 HashMap 的序列化格式有可能在不同 JDK 版本间变化，HashSet 选择自己掌控序列化格式——这是对兼容性的考量，值得学习。

* * *

## 三、HashSet 的「不重复」到底是咋实现的？

很多新手会困惑：为什么 HashSet 里的元素不能重复？看完了源码应该明白了：

1.  你调用 `add(e)`
    
2.  它调用 `map.put(e, PRESENT)`
    
3.  HashMap 的 `put` 用 `hash(e)` 算 hash 值，定位到桶
    
4.  如果桶里已经有元素，用 `equals` 比较 key
    
5.  如果 equals 返回 true → key 已存在 → 覆盖旧 value（返回旧 value）→ add 返回 false
    
6.  如果 equals 返回 false → hash 碰撞 → 拉链/红黑树 → 新增节点 → add 返回 true
    

所以 HashSet 的去重依赖：

*   **hashCode()**：决定入哪个桶
    
*   **equals()**：决定桶里有没有重复
    

**当你往 HashSet 放自定义对象时，务必重写 hashCode 和 equals！**

* * *

## 四、LinkedHashSet：HashSet + 保持顺序

```
public class LinkedHashSet<E>    extends HashSet<E>    implements Set<E>, Cloneable, java.io.Serializable {    public LinkedHashSet(int initialCapacity, float loadFactor) {        super(initialCapacity, loadFactor, true);  // 调用包级私有构造    }    public LinkedHashSet(int initialCapacity) {        super(initialCapacity, .75f, true);    }    public LinkedHashSet() {        super(16, .75f, true);    }    public LinkedHashSet(Collection<? extends E> c) {        super(Math.max((int) (c.size()/.75f) + 1, 16), .75f, true);        addAll(c);    }    @java.io.Serial    private void readObject(java.io.ObjectInputStream s)        throws java.io.IOException, ClassNotFoundException {        s.defaultReadObject();        int capacity = s.readInt();        float loadFactor = s.readFloat();        int size = s.readInt();        // 重新构造 LinkedHashMap        map = new LinkedHashMap<>(capacity, loadFactor);        for (int i = 0; i < size; i++) {            @SuppressWarnings("unchecked")            E e = (E) s.readObject();            map.put(e, PRESENT);        }    }}
```

LinkedHashSet 的代码量比 HashSet 还少，因为所有逻辑都继承自 HashSet。唯一的变化就是：

*   通过 `super(initialCapacity, loadFactor, true)` 调用了那个包级私有构造
    
*   这个构造用 `LinkedHashMap` 替换了 `HashMap`
    
*   反序列化时也主动构造 `LinkedHashMap` 而不是 `HashMap`
    

结果是：**LinkedHashSet = HashSet + 插入顺序维护**。性能几乎和 HashSet 一样（多了双向链表的维护开销，约 5-10% 的性能损失），但多了一个可预测的遍历顺序。

**使用场景：** 需要去重 + 保持元素的插入顺序。比如：去重后的访问日志、按添加顺序排队的唯一任务集合。

* * *

## 五、完整示例

```
import java.util.*;public class HashSetLinkedHashSetDemo {        public static void main(String[] args) {        System.out.println("===== HashSet vs LinkedHashSet 顺序对比 =====");                // 准备数据        String[] data = {"郑州", "北京", "上海", "广州", "深圳", "杭州", "成都", "郑州", "北京"};                // HashSet — 无序        Set<String> hashSet = new HashSet<>();        for (String s : data) {            hashSet.add(s);        }        System.out.println("HashSet:      " + hashSet);                // LinkedHashSet — 保持插入顺序        Set<String> linkedHashSet = new LinkedHashSet<>();        for (String s : data) {            linkedHashSet.add(s);        }        System.out.println("LinkedHashSet: " + linkedHashSet);                // 两者都不包含重复的"郑州"和"北京"        System.out.println("
HashSet size: " + hashSet.size() + " (原数据有" + data.length + "条)");                // 自定义对象测试 — 必须重写 hashCode 和 equals        System.out.println("
===== 自定义对象去重测试 =====");        Set<Person> people = new HashSet<>();        people.add(new Person("张三", 25));        people.add(new Person("李四", 30));        people.add(new Person("张三", 25)); // 重复        people.add(new Person("王五", 28));                System.out.println("人数: " + people.size() + " (去掉了重复的张三)");        people.forEach(System.out::println);    }        static class Person {        String name;        int age;                Person(String name, int age) {            this.name = name;            this.age = age;        }                @Override        public boolean equals(Object o) {            if (this == o) return true;            if (o == null || getClass() != o.getClass()) return false;            Person person = (Person) o;            return age == person.age && Objects.equals(name, person.name);        }                @Override        public int hashCode() {            return Objects.hash(name, age);        }                @Override        public String toString() {            return name + "(" + age + "岁)";        }    }}
```

**运行输出：**

```
===== HashSet vs LinkedHashSet 顺序对比 =====HashSet:      [广州, 上海, 北京, 深圳, 杭州, 郑州, 成都]LinkedHashSet: [郑州, 北京, 上海, 广州, 深圳, 杭州, 成都]HashSet size: 7 (原数据有9条)===== 自定义对象去重测试 =====人数: 3 (去掉了重复的张三)张三(25岁)王五(28岁)李四(30岁)
```

看到区别了吗？同一组数据，HashSet 的顺序是乱的（按 hash 桶分布），LinkedHashSet 保持了"郑州、北京、上海……"的插入顺序。而且两者都去掉了重复的"郑州"和"北京"。

* * *

## 六、注意事项（能救命）

### 1\. hashCode 和 equals 是上帝

```
// 这是一个 BUG！没有重写 hashCodeSet<PersonWrong> set = new HashSet<>();set.add(new PersonWrong("张三", 25));set.add(new PersonWrong("张三", 25));System.out.println(set.size());  // 输出 2！！！！
```

如果不重写 `hashCode`，两个属性完全相同的对象会被放入不同的 hash 桶，HashSet 认为它们不重复。这是最常见的 HashSet BUG，没有之一。

**规则：重写 equals 就必须重写 hashCode，反之亦然。**

### 2\. 扩容开销

HashSet 底层是 HashMap，扩容时也要进行 rehash（重新计算所有元素的桶位置）。如果事先知道数据量，建议指定初始容量：

```
// 预估有 1000 个元素，避免频繁扩容Set<String> set = new HashSet<>(1500);  // /0.75 向上取整
```

### 3\. 可变对象陷阱

```
Person p = new Person("张三", 25);Set<Person> set = new HashSet<>();set.add(p);p.setAge(26);  // 修改了对象的属性// 此时 set.contains(p) 可能返回 false！// 因为 age 变了，hashCode 也变了，但它在桶里还是在原来的位置System.out.println(set.contains(p));  // 可能是 false
```

**一旦对象被放入 HashSet 后，不要修改其参与 hashCode 计算的字段！** 否则你再也找不到它了，这会导致内存泄漏。

### 4\. 迭代顺序不可预测

如果业务逻辑依赖于元素的遍历顺序（比如分页、展示），别用 HashSet。用 LinkedHashSet（保持插入顺序）或者 TreeSet（排序）。

### 5\. 线程安全

HashSet 和 LinkedHashSet 都不是线程安全的。多线程环境用：

```
Set<String> syncSet = Collections.synchronizedSet(new HashSet<>());// 或者 Java 9+：Set<String> copyOnWriteSet = new ConcurrentHashMap<>().newKeySet();
```

* * *

## 七、对比总结

特性

HashSet

LinkedHashSet

TreeSet

底层实现

HashMap

LinkedHashMap

TreeMap (红黑树)

是否有序

无序

插入顺序

排序顺序

排序依据

—

插入顺序

Comparator / Comparable

允许 null

允许一个

允许一个

不允许

时间复杂度

O(1) 平均

O(1) 平均

O(log n)

额外内存

低

中（双向链表）

高（红黑树节点）

适用场景

纯去重

去重+保序

去重+排序

* * *

## 八、面试题精选

**Q：HashSet 的 add 方法返回值和 HashMap 的 put 方法返回值有什么关系？**

A：HashSet.add(e) 返回 `map.put(e, PRESENT) == null`。HashMap.put 在 key 不存在时返回 null（此时 add 返回 true），在 key 已存在时返回被覆盖的旧 value（此时 add 返回 false）。

**Q：为什么 LinkedHashSet 这么少的代码就能实现功能？**

A：因为 LinkedHashSet 只通过包级私有构造 `HashSet(int initialCapacity, float loadFactor, boolean dummy)` 将底层 Map 切换为 LinkedHashMap，所有业务逻辑都继承自 HashSet，而 HashSet 本身又委托给 HashMap。这就是"组合 + 继承"的精妙结合。

**Q：HashSet 和 HashMap 有什么关系？**

A：HashSet 内部持有一个 HashMap 实例，所有元素作为 HashMap 的 key 存储，value 统一为一个虚值对象 PRESENT。所以 HashSet 本质上是 HashMap 的一个 **key 集合视图**。

* * *

好了，今天的内容就到这里。HashSet 就像我常说的一样——**"你以为学了个新类，其实学的还是 HashMap"** 😂

下一篇预告：**CountDownLatch — 让线程学会等待的艺术**，我们进入 JUC 包，看看这个"倒数计数器"到底是怎么控制线程协作的。

明天的文章见！