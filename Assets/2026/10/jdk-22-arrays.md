> 深度剖析 java.util.Arrays 工具类，带你从源码层面理解排序、二分查找、并行前缀等核心方法的实现原理和最佳实践。

## JDK源码阅读 (23)：Arrays —— 被低估的瑞士军刀

## 一、写在前面

说实话，工作前几年我一直觉得 `Arrays` 就是个工具类，不就几个排序、查找、转 List 的静态方法嘛，有什么好看的。直到有一天被问到 "Arrays.sort 底层用了什么排序算法"，我支支吾吾说了个 "快排吧"，面试官追问 "那归并排序呢？什么时候用？"，人直接麻了。

后来翻了一遍源码，才发现这个类真的被低估了。它不只是"方便"，而是把 Java 开发团队几十年的算法调优经验浓缩在了一堆静态方法里。今天咱们就把 `Arrays` 扒个底朝天。

## 二、类的基本介绍

```
package java.util;public class Arrays {    // 私有无参构造器，禁止实例化    private Arrays() {}        // 核心方法分类：    // 1. 排序（sort / parallelSort）    // 2. 查找（binarySearch）    // 3. 比较（equals / deepEquals / compare / mismatch）    // 4. 填充（fill）    // 5. 复制（copyOf / copyOfRange）    // 6. 转换（asList / toString / deepToString）    // 7. 前缀操作（parallelPrefix）    // 8. 流式操作（stream）    // 9. 哈希（hashCode / deepHashCode）    // 10. 分段（spliterator）    // 11. 批量操作（setAll / parallelSetAll）}
```

**继承体系：** 没有继承，就是个 `Object` 的直接子类，纯工具类。私有构造器 + `final` 类，不能被实例化和继承。

**所在包：**`java.util`，从 JDK 1.2 就有了，后面每个大版本都在加新功能。

**核心作用：** 提供数组操作的静态方法，覆盖了排序、查找、填充、复制、比较、转换等几乎所有数组操作场景。

## 三、源码核心解析

### 3.1 sort —— 排序优化的集大成者

先看最常用的 `sort`，它其实是个**策略模式的典型应用**：

```
public static void sort(int[] a) {    DualPivotQuicksort.sort(a, 0, 0, a.length);}
```

我当时第一次看到 `DualPivotQuicksort` 这个类名也是一愣——双轴快排？后来查了才知道，这是 JDK 7 引入的改进，比传统单轴快排平均能减少约 20% 的比较次数。

继续往下翻，`sort` 对不同类型的数组采用了不同的策略：

```
// 对于对象数组 —— 用的是 TimSort（归并排序的变体）public static void sort(Object[] a) {    if (LegacyMergeSort.userRequested)        legacyMergeSort(a);    else        ComparableTimSort.sort(a, 0, a.length, null, 0, 0);}
```

**TimSort** 这个算法我得提一嘴。它是 2002 年 Tim Peters 为 Python 发明的，后来 Java 也拿过来用了。它的牛逼之处在于：

*   能识别数组中的**天然有序片段**（叫 "run"）
    
*   利用这些有序片段做归并，而不是傻乎乎从头排
    
*   对于近似有序的数据，时间复杂度接近 O(n)
    

简单说，如果你的数据本身就有一定顺序，TimSort 会快得多。

哦对了，对于 **int/long/float/double 等基本类型数组**，Java 其实走的是 DualPivotQuicksort，但当规模变小（< 47 个元素）时，它会退化到**插入排序**，因为小规模数组上插入排序的常数优势反而更大。这就是实战经验的体现。

```
// DualPivotQuickSort 内部（伪码示意）private static final int INSERTION_SORT_THRESHOLD = 47;static void sort(int[] a, int low, int high, ...) {    // 小数组用插入排序    if (high - low < INSERTION_SORT_THRESHOLD) {        insertionSort(a, low, high);        return;    }    // 中等规模用双轴快排    dualPivotQuicksort(a, low, high);}
```

### 3.2 binarySearch —— 二分查找的细节魔鬼

```
public static int binarySearch(int[] a, int key) {    return binarySearch0(a, 0, a.length, key);}// 真正的实现private static int binarySearch0(int[] a, int fromIndex, int toIndex, int key) {    int low = fromIndex;    int high = toIndex - 1;    while (low <= high) {        int mid = (low + high) >>> 1;  // 无符号右移，防溢出！        int midVal = a[mid];        if (midVal < key)            low = mid + 1;        else if (midVal > key)            high = mid - 1;        else            return mid; // key found    }    return -(low + 1);  // key not found，返回插入点}
```

你们注意到那个 `>>> 1` 了吗？这个写法其实相当讲究。

传统写法 `(low + high) / 2` 有个 bug：当 `low + high` 超过 `Integer.MAX_VALUE` 时会溢出成负数。虽然排序的数组长度一般不会到 20 亿，但作为 JDK 基础库，人家必须要考虑这种极端情况。

另外返回值 `-(low + 1)` 的设计也很巧妙：

*   如果返回 0，表示在位置 0 找到
    
*   如果返回 -1，表示没找到，应该插在位置 0
    
*   如果返回 -3，表示没找到，应该插在位置 2
    

**怎么还原？**`index = -ret - 1`，这个面试老常客了。

### 3.3 parallelPrefix —— 并行前缀，大杀器

这个很多人没用过，但真的强。它是 JDK 8 引入的，用于对数组做**累积运算**：

```
// 计算前缀和：a[0], a[0]+a[1], a[0]+a[1]+a[2], ...int[] arr = {1, 2, 3, 4, 5, 6, 7, 8};Arrays.parallelPrefix(arr, Integer::sum);// arr 变成 [1, 3, 6, 10, 15, 21, 28, 36]
```

它底层用的是 **ForkJoinPool** 做并行归约，对百万级以上的大数组速度提升非常明显。适合做累加、累积乘、最大值传播等场景。

```
public static <T> void parallelPrefix(T[] array, BinaryOperator<T> op) {    // 空数组直接返回    if (array.length > 0)        new ArrayPrefixHelpers.CumulateTask<>(null, op, array, 0, array.length)                .invoke();  // 调用 ForkJoin 框架}
```

关于 ForkJoinPool 我们在前面的文章里有专门讲过，这里就不展开了。

### 3.4 copyOf 与 copyOfRange —— 数组扩容的推荐方式

很多人还在用循环拷贝数组，其实 JDK 给你封装好了：

```
public static <T> T[] copyOf(T[] original, int newLength) {    return (T[]) copyOf(original, newLength, original.getClass());}public static <T,U> T[] copyOf(U[] original, int newLength, Class<? extends T[]> newType) {    @SuppressWarnings("unchecked")    T[] copy = ((Object)newType == (Object)Object[].class)        ? (T[]) new Object[newLength]        : (T[]) Array.newInstance(newType.getComponentType(), newLength);    System.arraycopy(original, 0, copy, 0,                     Math.min(original.length, newLength));    return copy;}
```

注意看那个 `System.arraycopy` —— 这是 **native 方法**，底层用 C/C++ 实现，用的是内存块拷贝（类似 memcpy），比 for 循环快一个数量级。

所以：

*   数组扩容 → 用 `Arrays.copyOf`
    
*   数组截取 → 用 `Arrays.copyOfRange`
    
*   别自己写循环复制
    

### 3.5 parallelSort —— 多核时代的排序

JDK 8 引入的并行排序，当数组足够大时自动使用 ForkJoinPool 并行处理：

```
public static void parallelSort(int[] a) {    int n = a.length, p = ForkJoinPool.getCommonPoolParallelism(),        sizeThreshold = (p > 1) ? (1 + n / (p << 2)) : n;    // 太小就不并行，否则分片处理    if (sizeThreshold <= 1 || p <= 1) {        sort(a);  // 退化到单线程排序    } else {        // ... 并行排序逻辑（分片排序 + 合并）    }}
```

对于千万级的大数组，parallelSort 的加速效果肉眼可见，但几十万以内就没什么必要了，线程调度的开销可能还倒贴。

### 3.6 几个容易被忽略的宝藏方法

**mismatch —— 找第一个不同的位置：**

```
// 返回两个数组第一个不同元素的位置int[] a = {1, 2, 3, 4};int[] b = {1, 2, 5, 4};int idx = Arrays.mismatch(a, b);  // 输出 2
```

JDK 11 引入，以前要自己写循环，现在一行搞定。

**setAll / parallelSetAll —— 批量初始化：**

```
int[] squares = new int[100];Arrays.setAll(squares, i -> i * i);  // 0, 1, 4, 9, 16...// 并行版，大数组用这个Arrays.parallelSetAll(squares, i -> i * i);
```

**spliterator —— 为 Stream API 提供拆分迭代器：**

```
Spliterator.OfInt sp = Arrays.spliterator(arr);// 支持 trySplit，Stream 底层的并行拆分就是靠它
```

## 四、完整使用示例

光说不练假把式，来一个实际组合拳：

```
import java.util.Arrays;public class ArraysDemo {    public static void main(String[] args) {        // 1. 基本排序与查找        int[] nums = {34, 7, 23, 32, 5, 62, 31, 4, 15, 89};        Arrays.sort(nums);        System.out.println("排序后：" + Arrays.toString(nums));        // [4, 5, 7, 15, 23, 31, 32, 34, 62, 89]                int idx = Arrays.binarySearch(nums, 32);        System.out.println("32 的位置：" + idx);                // 2. 数组复制 vs 填充        int[] copy = Arrays.copyOf(nums, 15);  // 扩容到 15        Arrays.fill(copy, nums.length, 15, -1); // 新位置填 -1        System.out.println("扩容填充后：" + Arrays.toString(copy));                // 3. 列表转换        String[] fruits = {"apple", "banana", "cherry"};        java.util.List<String> list = Arrays.asList(fruits);        // ⚠️ 注意：这是视图，改原数组 list 也会变        fruits[0] = "avocado";        System.out.println("list.get(0) = " + list.get(0)); // avocado                // 4. 并行前缀（累积运算）        int[] prefix = {1, 2, 3, 4, 5, 6, 7, 8};        Arrays.parallelPrefix(prefix, Integer::sum);        System.out.println("前缀和：" + Arrays.toString(prefix));        // [1, 3, 6, 10, 15, 21, 28, 36]                // 5. 比较两个数组        int[] a = {1, 2, 3};        int[] b = {1, 2, 3};        System.out.println("equals: " + Arrays.equals(a, b));  // true                // 6. mismathc 找不同        int[] c = {1, 2, 4};        int diff = Arrays.mismatch(a, c);        System.out.println("第一个不同位置：" + diff);  // 2                // 7. setAll 批量赋值        int[] cubes = new int[10];        Arrays.setAll(cubes, i -> i * i * i);        System.out.println("立方：" + Arrays.toString(cubes));                // 8. 数组 → Stream        long sum = Arrays.stream(nums).sum();        System.out.println("总和：" + sum);    }}
```

## 五、注意事项与常见坑

### 5.1 asList 返回的不是 ArrayList

这个讲过很多次了，但还是有人踩坑：

```
List<Integer> list = Arrays.asList(1, 2, 3);list.add(4);  // ❌ UnsupportedOperationExceptionlist.remove(0); // ❌ 也不行
```

`Arrays.asList` 返回的是 `java.util.Arrays` 内部类 `ArrayList`，不是 `java.util.ArrayList`。这是**固定大小的列表视图**，不支持增删操作。

**正确做法：**

```
List<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3));
```

### 5.2 多维数组比较

```
int[][] matrix1 = {{1, 2}, {3, 4}};int[][] matrix2 = {{1, 2}, {3, 4}};System.out.println(Arrays.equals(matrix1, matrix2));   // false ❌System.out.println(Arrays.deepEquals(matrix1, matrix2)); // true ✅
```

一维比较用 `equals`，多维比较用 `deepEquals`。`deepEquals` 会递归比较嵌套数组的每个元素。

`toString` 同理：

```
System.out.println(Arrays.toString(matrix1));     // 打印引用地址System.out.println(Arrays.deepToString(matrix1)); // [[1, 2], [3, 4]]
```

### 5.3 排序的性能选择

数组类型

排序算法

最佳场景

基本类型 (int/long等)

DualPivotQuickSort

大部分场景

对象类型

TimSort (默认) / LegacyMergeSort

近似有序数据更优

大数组 + 多核

parallelSort

百万级以上

**建议：**

*   日常用 `Arrays.sort()` 不纠结，它已经做了最优选择
    
*   只有在多核 + 大数据量（百万+）时才考虑 `parallelSort`
    
*   想研究排序算法的话，可以看看 `DualPivotQuicksort` 和 `ComparableTimSort` 的源码，比教科书上的基础版本多了很多工程优化
    

### 5.4 compare 和 compareUnsigned

JDK 11 引入的 `compare` 方法：

```
int[] a = {1, 2, 3};int[] b = {1, 2, 0};System.out.println(Arrays.compare(a, b)); // 1（a > b，按字典序）
```

按**字典顺序**比较两个数组，返回 -1 / 0 / 1。对于无符号比较场景（比如 byte\[\] 的 128~255 范围），还有个 `compareUnsigned`。做字节数组比较时很好用。

## 六、对比总结

方法

ArrayList (集合)

Arrays (工具类)

底层

动态数组（维护 size、容量、扩容）

纯静态方法操作原生数组

扩容

自动扩容（1.5倍）

需用 copyOf 手动扩

排序

Collections.sort(TimSort)

Arrays.sort(DualPivot/TimSort)

并行

Java 8 引入 parallelStream

独立 parallelSort/parallelPrefix

查找

contains/indexOf（遍历）

binarySearch（二分，要求已排序）

**另一个有趣的对比：**

面试经常问的 `Collections.sort()` 和 `Arrays.sort()` 有什么区别？

答案其实很简单：`Collections.sort` 内部把 List 转成数组，调用 `Arrays.sort`，最后再按排序后的数组重建 List。所以本质上 `Collections.sort` 最终也是调 `Arrays.sort`。

```
// Collections.sort 源码示意public static <T> void sort(List<T> list, Comparator<? super T> c) {    Object[] a = list.toArray();    Arrays.sort(a, (Comparator) c);    ListIterator<T> i = list.listIterator();    for (int j = 0; j < a.length; j++) {        i.next();        i.set((T) a[j]);    }}
```

## 七、一点感概

翻 `Arrays` 的源码是一件很有意思的事。它不像 HashMap 那样有复杂的数据结构，每个方法你基本都能看懂，但每个方法里都有工程师的小心思——那个 `>>> 1`、那个 threshold 阈值、那个 TimSort 如何识别自然有序片段。

这大概就是"基本功"的魅力吧。一个工具类，写了快 30 年，每个版本都有人在上面打磨，最终成就了 Java 工程界的一块基石。

下次面试官问你"Arrays.sort 用了什么算法"，你可以反问他："你说具体哪个重载？基本类型和对象类型不一样，数组大小不同也分策略……"

（别问我怎么知道的，面试被问过）

* * *

**参考：** OpenJDK 23 源码 `java.util.Arrays`、`java.util.DualPivotQuicksort`、`java.util.ComparableTimSort`