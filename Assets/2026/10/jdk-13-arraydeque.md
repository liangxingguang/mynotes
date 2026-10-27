## ArrayDeque 源码深度剖析：比 LinkedList 更快的双端队列

## 一、类的介绍

`ArrayDeque` 位于 `java.util` 包中，是 **可扩容数组实现的双端队列（Deque）**。

```
public class ArrayDeque<E> extends AbstractCollection<E>    implements Deque<E>, Cloneable, java.io.Serializable
```

继承关系很简单：

*   继承 `AbstractCollection`，获得了集合的骨架实现
    
*   实现 `Deque<E>` 接口，支持两端插入和删除
    
*   实现 `Cloneable` 和 `Serializable`，支持克隆和序列化
    

### 核心作用

ArrayDeque 是一个 **无界双端队列**（实际上受限于数组最大容量），既可以用作 **栈**（比 Stack 快），也可以用作 **队列**（比 LinkedList 快）。Oracle 官方甚至直接建议：

> "Deque implementations should generally be preferred over Stack." "ArrayDeque is likely to be faster than LinkedList when used as a queue."

我个人用了这么多年 JDK，发现一个现象：很多人在 LeetCode 刷题时还在用 `LinkedList` 做队列，实际上换成 `ArrayDeque` 性能能提升不少。面试问到「为什么不用 Stack」，答案就是「ArrayDeque 更快」。

* * *

## 二、核心源码分析

### 2.1 数据结构与字段

```
// 存储元素的数组。长度总是 2 的幂transient Object[] elements;// 队头索引transient int head;// 队尾索引：指向下一个要插入的位置transient int tail;// 最小初始容量private static final int MIN_INITIAL_CAPACITY = 8;
```

关键设计点：

**为什么容量是 2 的幂？** 因为后面利用 `&` 运算替代取模，效率高得多。例如 `(tail + 1) & (elements.length - 1)` 等价于 `(tail + 1) % elements.length`。

### 2.2 构造函数

```
// 默认容量 16public ArrayDeque() {    elements = new Object[16];}// 指定容量，会向上取整到 2 的幂public ArrayDeque(int numElements) {    allocateElements(numElements);}// 从已有集合初始化public ArrayDeque(Collection<? extends E> c) {    allocateElements(c.size());    addAll(c);}
```

`allocateElements` 方法很有意思：

```
private void allocateElements(int numElements) {    int initialCapacity = MIN_INITIAL_CAPACITY;    if (numElements >= initialCapacity) {        initialCapacity = numElements;        // 经典的"向上取整到 2 的幂"算法        initialCapacity |= (initialCapacity >>>  1);        initialCapacity |= (initialCapacity >>>  2);        initialCapacity |= (initialCapacity >>>  4);        initialCapacity |= (initialCapacity >>>  8);        initialCapacity |= (initialCapacity >>> 16);        initialCapacity++;        // 溢出处理        if (initialCapacity < 0)            initialCapacity >>>= 1;    }    elements = new Object[initialCapacity];}
```

这段代码我每次看到都要感叹一下——通过 **5 次无符号右移和异或**，把任意整数变成 2 的幂减 1，再加 1 就得到了大于等于原数的 2 的幂。这比循环乘 2 快多了，典型的位运算骚操作。

### 2.3 双端插入核心

```
// 头部插入public void addFirst(E e) {    if (e == null)        throw new NullPointerException();    // head = (head - 1) & (len - 1)，相当于环状前移    elements[head = (head - 1) & (elements.length - 1)] = e;    if (head == tail)        doubleCapacity(); // 扩容}// 尾部插入public void addLast(E e) {    if (e == null)        throw new NullPointerException();    elements[tail] = e;    tail = (tail + 1) & (elements.length - 1);    if (head == tail)        doubleCapacity();}
```

这里有个细节：`addFirst` 是先移动 head 再赋值，`addLast` 是先赋值再移动 tail。两者的 null 检查一样严格——Deque 接口明确不允许 null 元素，跟 `LinkedList` 不同。

**为什么不允许 null？**  
因为 `pollFirst()` 返回 null 表示队列为空，如果允许存 null 就无法区分「队列为空」和「取到了 null 值」。

### 2.4 双端删除

```
public E pollFirst() {    int h = head;    @SuppressWarnings("unchecked")    E result = (E) elements[h];    if (result == null)        return null;    elements[h] = null; // 让 GC 回收    head = (h + 1) & (elements.length - 1);    return result;}public E pollLast() {    int t = (tail - 1) & (elements.length - 1);    @SuppressWarnings("unchecked")    E result = (E) elements[t];    if (result == null)        return null;    elements[t] = null;    tail = t;    return result;}
```

`pollLast` 先通过 `(tail - 1) & (len - 1)` 定位到实际存的最后一个元素，取出后将 `tail` 回退。这块的逻辑很干净，而且删除后立即把数组槽位置 null，帮助 GC 回收。

### 2.5 扩容 —— doubleCapacity

```
private void doubleCapacity() {    // 只有 head == tail 时才会扩容，此时队列已满    int p = head;    int n = elements.length;    int r = n - p; // head 右边的元素个数    int newCapacity = n << 1; // 翻倍    if (newCapacity < 0)        throw new IllegalStateException("Sorry, deque too big");    Object[] a = new Object[newCapacity];    // 分两段拷贝：    // 第一段：从 head 到数组末尾    System.arraycopy(elements, p, a, 0, r);    // 第二段：从 0 到 head（环形部分）    System.arraycopy(elements, 0, a, r, p);    elements = a;    head = 0;    tail = n;}
```

扩容时机是 `head == tail`，说明数组真的满了（环形索引 head 追上了 tail）。扩容后把元素按 **逻辑顺序** 连续排列——head 之前的移到数组后面，head 之后的移到数组前面。这样 head 重置为 0，tail 设为 n，**之后的所有操作都变成顺序内存访问，缓存友好**。

这个「分两段拷贝」的设计是 ArrayDeque 的精髓之一，也很容易在面试中被问到。

### 2.6 作为栈的操作

```
// 压栈 —— 实际上就是 addFirstpublic void push(E e) {    addFirst(e);}// 弹栈 —— 实际上就是 pollFirstpublic E pop() {    return removeFirst(); // 队空时抛异常}// 看栈顶 —— 实际上是 peekFirstpublic E peek() {    return peekFirst();}
```

ArrayDeque 作为栈使用时，元素存在数组靠后的位置（因为 `push` = `addFirst`，从末尾往前放）。对比 `java.util.Stack`：

*   Stack 继承自 Vector，有 **锁同步** 开销
    
*   Stack 扩容机制没有 ArrayDeque 高效
    
*   官方明确说 ArrayDeque 是更好的栈实现
    

* * *

## 三、核心原理总结

### 数据结构

*   **循环数组**（Circular Array）：底层是一个数组，通过 head/tail 索引模拟环形缓冲区
    
*   容量永远是 **2 的幂**，利用 `&` 取模
    
*   head 和 tail 相等时表示空或满（通过扩容区分）
    

### 关键算法

操作

复杂度

说明

addFirst / addLast

O(1) 均摊

偶发扩容 O(n)

removeFirst / removeLast

O(1)

直接索引操作

getFirst / getLast

O(1)

直接索引

contains

O(n)

需要遍历

### 扩容策略

*   检测条件：`head == tail`
    
*   扩容倍数：**翻倍**（`n << 1`）
    
*   扩容后重排：将元素按逻辑顺序连续排列，保证后续顺序访问的缓存局部性
    

* * *

## 四、完整使用示例

下面是一个同时演示栈和队列功能的完整例子：

```
import java.util.ArrayDeque;import java.util.Deque;public class ArrayDequeDemo {    public static void main(String[] args) {        // ========== 作为队列（FIFO）使用 ==========        Deque<String> queue = new ArrayDeque<>();        queue.offer("A");        queue.offer("B");        queue.offer("C");        System.out.println("=== 队列 FIFO ===");        while (!queue.isEmpty()) {            System.out.print(queue.poll() + " "); // A B C        }        System.out.println();        // ========== 作为栈（LIFO）使用 ==========        Deque<String> stack = new ArrayDeque<>();        stack.push("A");        stack.push("B");        stack.push("C");        System.out.println("=== 栈 LIFO ===");        while (!stack.isEmpty()) {            System.out.print(stack.pop() + " "); // C B A        }        System.out.println();        // ========== 双端操作 ==========        Deque<Integer> deque = new ArrayDeque<>();        deque.addFirst(1);        deque.addLast(2);        deque.addFirst(0);        deque.addLast(3);        System.out.println("=== 双端操作 ===");        System.out.println("deque = " + deque); // [0, 1, 2, 3]        // ========== 实际场景：括号匹配 ==========        System.out.println("=== 括号匹配 ===");        String expr = "{[()]}";        System.out.println(expr + " -> " + isValidBrackets(expr)); // true        System.out.println("{[}]" + " -> " + isValidBrackets("{[}]")); // false        // ========== 实际场景：滑动窗口最大值 ==========        System.out.println("=== 滑动窗口最大值 ===");        int[] nums = {1, 3, -1, -3, 5, 3, 6, 7};        int k = 3;        int[] result = maxSlidingWindow(nums, k);        for (int v : result) {            System.out.print(v + " "); // 3 3 5 5 6 7        }        System.out.println();    }    // 括号匹配 —— 使用 ArrayDeque 作为栈    static boolean isValidBrackets(String s) {        Deque<Character> stack = new ArrayDeque<>();        for (char c : s.toCharArray()) {            if (c == '(' || c == '[' || c == '{') {                stack.push(c);            } else {                if (stack.isEmpty()) return false;                char top = stack.pop();                if ((c == ')' && top != '(') ||                    (c == ']' && top != '[') ||                    (c == '}' && top != '{')) {                    return false;                }            }        }        return stack.isEmpty();    }    // 滑动窗口最大值 —— 使用 ArrayDeque 作为双端队列    static int[] maxSlidingWindow(int[] nums, int k) {        if (nums == null || nums.length == 0) return new int[0];        int n = nums.length;        int[] result = new int[n - k + 1];        Deque<Integer> deque = new ArrayDeque<>(); // 存索引        for (int i = 0; i < n; i++) {            // 移除不在窗口内的            while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {                deque.pollFirst();            }            // 移除小于当前元素的（维护递减队列）            while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {                deque.pollLast();            }            deque.offerLast(i);            // 记录窗口最大值            if (i >= k - 1) {                result[i - k + 1] = nums[deque.peekFirst()];            }        }        return result;    }}
```

运行结果：

```
=== 队列 FIFO ===A B C === 栈 LIFO ===C B A === 双端操作 ===deque = [0, 1, 2, 3]=== 括号匹配 ==={[()]} -> true{[}] -> false=== 滑动窗口最大值 ===3 3 5 5 6 7 
```

* * *

## 五、注意事项

### 1\. 不允许 null 元素

```
ArrayDeque<String> deque = new ArrayDeque<>();deque.add(null); // ❌ NullPointerException！
```

### 2\. 非线程安全

ArrayDeque 没有任何同步机制，多线程环境下需要外部加锁，或者用 `ConcurrentLinkedDeque`。

### 3\. 迭代器是 fail-fast 的

如果在迭代过程中修改了结构，会抛 `ConcurrentModificationException`。不过 ArrayDeque 没有 `modCount` 字段？等等——实际上它确实没有显式的 modCount。来看源码：

```
public Iterator<E> iterator() {    return new DeqIterator();}
```

`DeqIterator` 中有一个 `fence` 字段在创建时记录 tail，遍历时检查 `cursor != fence`。如果遍历过程中发生结构修改，迭代器可能取到不一致的数据，但不会抛异常——这算是 ArrayDeque 的一个小特性，不是 bug。

### 4\. 内存占用

由于扩容策略是翻倍，且容量永远是 2 的幂，偶尔会有内存浪费。比如存 5000 个元素，底层数组长度是 8192。

### 5\. 序列化

`elements` 数组用 `transient` 修饰，自定义 `writeObject` / `readObject` 只序列化实际存储的元素，不是整个数组。

* * *

## 六、对比总结

特性

ArrayDeque

LinkedList

Stack

底层结构

循环数组

双向链表

Vector（数组+锁）

插入/删除头部

O(1)

O(1)

O(n)（需要搬移）

插入/删除尾部

O(1)

O(1)

O(1)

中间插入/删除

O(n)

O(n)

O(n)

随机访问

不支持

不支持

支持（但慢）

内存开销

较小，连续内存

较大，每个节点有前后指针

中等

缓存局部性

✅ 优秀

❌ 差

中等

null 元素

❌ 不允许

✅ 允许

✅ 允许

线程安全

❌ 不

❌ 不

✅ 有锁

作为栈性能

⭐ 最快

⭐⭐ 次之

⭐⭐ 最慢（有锁）

### 什么时候选 ArrayDeque？

*   需要 **栈** —— 替换 `Stack`，`ArrayDeque` 快 3~5 倍
    
*   需要 **队列或双端队列** —— 替换 `LinkedList`，没有链表节点开销
    
*   **高频读写** 场景 —— 顺序内存访问，CPU 缓存友好
    
*   刷 LeetCode —— 作为栈/队列/双端队列唯一推荐
    

### 什么时候不选？

*   需要中间位置插入/删除 —— 用 `LinkedList`
    
*   需要 **线程安全** —— 用 `ConcurrentLinkedDeque` 或加外部锁
    
*   需要存 null —— 只能用 `LinkedList`
    
*   不确定最大容量且对内存极度敏感 —— 链表的增量增长更灵活
    

* * *

### 小结

ArrayDeque 是一个被严重低估的集合类。很多人学了数据结构知道「循环数组」，但到了实际写代码还是习惯用 LinkedList 做队列、用 Stack 做栈。从 JDK 6 开始 ArrayDeque 就是官方推荐的替代方案，到现在 2026 年了，**是时候抛弃惯性，用 ArrayDeque 写出更高效的代码了**。

下一篇我们聊 `ThreadPoolExecutor`——Java 线程池的核心实现，敬请期待！

* * *

_图片来源：Java ArrayDeque 内部循环数组结构示意图（循环数组，head/tail 指针）_