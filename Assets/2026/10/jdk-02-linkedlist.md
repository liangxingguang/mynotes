## JDK源码阅读(2) — LinkedList：双向链表，不只是个List

![Java](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "Java")

## 一、LinkedList 到底是何方神圣？

聊完 ArrayList，今天轮到它的老冤家 **LinkedList** 了。

先抛个问题：有多少人知道 LinkedList 其实**同时实现了 List 和 Deque 两个接口**？这意味着它既是列表，又是双端队列，还能当栈用。

`java.lang.Object     └── java.util.AbstractCollection<E>           └── java.util.AbstractList<E>                 └── java.util.AbstractSequentialList<E>                       └── java.util.LinkedList<E>                             implements List<E>, Deque<E>, Cloneable, java.io.Serializable   `

关键点来了：`AbstractSequentialList` 这个名字就暗示了它的特点——**顺序访问**。LinkedList 底层是一堆节点串起来的双向链表，靠着节点之间的引用链接来维护顺序。

## 二、源码解剖——核心数据结构

### 2.1 内部节点——三个字段说了算

`public class LinkedList<E>       extends AbstractSequentialList<E>       implements List<E>, Deque<E>, Cloneable, java.io.Serializable {      // 链表长度       transient int size = 0;      // 头节点指针       transient Node<E> first;      // 尾节点指针       transient Node<E> last;      // 内部节点类——核心中的核心       private static class Node<E> {           E item;          // 存的数据           Node<E> next;    // 指向下一个节点           Node<E> prev;    // 指向前一个节点          Node(Node<E> prev, E element, Node<E> next) {               this.item = element;               this.next = next;               this.prev = prev;           }       }   }  `

每个 `Node` 就是一个**三字段的小单元**：前驱指针 + 数据 + 后继指针。整个 LinkedList 就是把这些 Node 用双线串起来。

你对比一下 ArrayList 的 `Object[]` 底层——一个是一整块连续内存，一个是零零散散分布在堆上的小节点，这就是两种截然不同的数据组织方式。

### 2.2 头尾操作——O(1) 爽点

`// 在头部插入——链表空时需要同时维护 first 和 last   private void linkFirst(E e) {       final Node<E> f = first;       final Node<E> newNode = new Node<>(null, e, f);       first = newNode;       if (f == null)           last = newNode;   // 链表中原来没元素，头尾都指向新节点       else           f.prev = newNode; // 原来的头节点向前指       size++;       modCount++;   }  // 在尾部插入——最常用的 add() 底层就是这个   void linkLast(E e) {       final Node<E> l = last;       final Node<E> newNode = new Node<>(l, e, null);       last = newNode;       if (l == null)           first = newNode;  // 链表原来为空       else           l.next = newNode; // 原来的尾节点向后指       size++;       modCount++;   }  `

看到没？**头插和尾插都是 O(1)**。这一点比 ArrayList 强——ArrayList 在头部插入需要把后面所有元素挨个挪位，O(n) 的代价。LinkedList 只需要改几个指针引用，理论损耗只在新对象的分配上。

但话说回来——虽然时间复杂度是 O(1)，实际上的常量开销比 ArrayList 大不少，因为每次都要 new Node()，GC 压力也大。后面讲性能的时候细说。

### 2.3 按索引访问——遍历的代价

`public E get(int index) {       checkElementIndex(index);       return node(index).item;   }  // 核心查找——二分法决定从头还是从尾开始遍历   Node<E> node(int index) {       // 看 index 离头近还是离尾近，选最近的遍历       if (index < (size >> 1)) {      // index < size/2           Node<E> x = first;           for (int i = 0; i < index; i++)               x = x.next;             // 从头往后走           return x;       } else {                        // index >= size/2           Node<E> x = last;           for (int i = size - 1; i > index; i--)               x = x.prev;             // 从尾往前走           return x;       }   }  `

这里有个小细节挺有意思的——`node()` 方法做了**二分折半搜索**：如果 index 小于 size/2，从头往后找；否则从尾往前找。这样一来最差也是 O(n/2)，而不是傻傻地每次都从头开始。

但说到底，**按索引访问还是 O(n)**。这就是 LinkedList 和 ArrayList 最大的分野：ArrayList 的 `get(5000)` 是一次 O(1) 的内存偏移，LinkedList 要沿着指针跳 5000 次。差别就是这么快。

### 2.4 中间插入和删除

`// 在某个非空节点 succ 之前插入   void linkBefore(E e, Node<E> succ) {       // 拿到 succ 的前驱节点       final Node<E> pred = succ.prev;       // 新节点的 prev -> pred, next -> succ       final Node<E> newNode = new Node<>(pred, e, succ);       succ.prev = newNode;  // succ 的前驱指向新节点       if (pred == null)           first = newNode;  // 插入在头部       else           pred.next = newNode; // pred 的后继指向新节点       size++;       modCount++;   }   `

如果已经把 `node(index)` 的引用拿到了，那插入操作本身 **就是 O(1)**——只需要改 4 次指针引用。

但问题是：**你很难直接拿到中间节点的引用**。大多数情况下你得先调用 `node(index)` 去遍历找位置，这个过程是 O(n)。所以综合来看，**"在位置 i 插入" 这个整体操作是 O(n)**——遍历是瓶颈。

这就引出面试常问的一个题了："LinkedList 插入比 ArrayList 快吗？"——答案是 **分情况**：

*   头尾操作：LinkedList 更快 O(1) vs O(n)
    
*   中间位置且已知节点引用：LinkedList 更快
    
*   中间位置且按 index 插入：差不多，遍历的 O(n) 占了主导
    

## 三、LinkedList 的"兼职"——Deque 接口

LinkedList 实现了 `Deque<E>` 接口，所以它可以当队列用：

`// 队列操作   add(e)      → 尾插            // 其实就是 linkLast(e)   offer(e)    → 尾插，返回boolean   remove()    → 头删            // 其实就是 unlinkFirst(f)   poll()      → 头删，空队返回null   element()   → 取头元素不移除   peek()      → 取头元素不移除，空队返回null  // 双端队列操作   addFirst(e)  /  addLast(e)   offerFirst(e) / offerLast(e)   removeFirst()  /  removeLast()   pollFirst() / pollLast()   getFirst() / getLast()   peekFirst() / peekLast()  // 栈操作   push(e)    → 其实调的是 addFirst(e)   pop()      → 其实调的是 removeFirst()  `

所以你看，LinkedList = List + Deque + Stack，**一个类干了三份活**。但凡事都有两面——接口多了意味着 API 也杂，有的人写代码时 `add()` 和 `offer()` 混着用，看着有点乱。

## 四、LinkedList 的迭代器——ListIterator 的逆天能力

`public ListIterator<E> listIterator(int index) {       checkPositionIndex(index);       return new ListItr(index);   }  private class ListItr implements ListIterator<E> {       private Node<E> lastReturned;   // 最近一次返回的节点       private Node<E> next;           // 下一个节点       private int nextIndex;          // 下一个节点的索引       private int expectedModCount = modCount;      // 向前遍历       public E next() {           checkForComodification();           if (!hasNext())               throw new NoSuchElementException();           lastReturned = next;           next = next.next;           // 顺着 next 指针走           nextIndex++;           return lastReturned.item;       }      // 向后遍历       public E previous() {           checkForComodification();           if (!hasPrevious())               throw new NoSuchElementException();           lastReturned = next = (next == null) ? last : next.prev;           nextIndex--;           return lastReturned.item;       }      // 支持在遍历过程中添加元素——增强版迭代器       public void add(E e) {           checkForComodification();           lastReturned = null;           if (next == null)               linkLast(e);              // 添加到末尾           else               linkBefore(e, next);      // 插入到 next 之前           nextIndex++;           expectedModCount++;       }      // 支持在遍历过程中删除元素       public void remove() {           // ...           unlink(lastReturned);           // ...           expectedModCount++;       }      // 支持替换当前元素       public void set(E e) {           // ...           lastReturned.item = e;       }      // 快速失败机制       final void checkForComodification() {           if (modCount != expectedModCount)               throw new ConcurrentModificationException();       }   }  `

LinkedList 的 `ListItr` 比普通的 Iterator 强多了——**向前、向后、添加、删除、替换，无所不能**。尤其是在遍历中做插入的场景，LinkedList 的 ListIterator 效率爆炸——因为你已经持有了节点引用，插入就是 O(1)。

而如果用 ArrayList 的 ListIterator 在遍历中做插入——每次都要挨个挪元素，慢得很。

## 五、可运行示例

`import java.util.*;  public class LinkedListDemo {       public static void main(String[] args) {           // 1. 基本 List 操作           LinkedList<String> list = new LinkedList<>();           list.add("Java");           list.add("Python");           list.add("Go");           System.out.println("List 操作: " + list);                 // [Java, Python, Go]           System.out.println("get(1): " + list.get(1));             // Python          // 2. 队列操作（FIFO）           list.offer("Rust");         // 尾插           String head = list.poll();  // 头取           System.out.println("队列操作 - 弹出: " + head + ", 剩余: " + list);          // 3. 栈操作（LIFO）           LinkedList<String> stack = new LinkedList<>();           stack.push("第一层");           stack.push("第二层");           stack.push("第三层");           System.out.println("栈顶: " + stack.peek());             // 第三层           System.out.println("出栈: " + stack.pop());              // 第三层           System.out.println("栈剩余: " + stack);                  // [第二层, 第一层]          // 4. ListIterator 在遍历中插入——LinkedList 的拿手好戏           LinkedList<String> names = new LinkedList<>(               Arrays.asList("Alice", "Bob", "Charlie", "David")           );           ListIterator<String> it = names.listIterator();           while (it.hasNext()) {               String name = it.next();               if ("Bob".equals(name)) {                   it.add("Bob-替补");    // 在 Bob 后面插入——O(1)！               }           }           System.out.println("ListIterator 插入后: " + names);          // 5. 倒序遍历           System.out.print("倒序遍历: ");           Iterator<String> desc = names.descendingIterator();           while (desc.hasNext()) {               System.out.print(desc.next() + " ");           }           System.out.println();          // 6. 作为双端队列操作           LinkedList<Integer> deque = new LinkedList<>();           deque.addFirst(1);           deque.addLast(2);           deque.addFirst(0);           System.out.println("双端队列: " + deque);                // [0, 1, 2]           System.out.println("取首: " + deque.removeFirst());       // 0           System.out.println("取尾: " + deque.removeLast());        // 2       }   }  `

## 六、常见坑和性能分析

### 6.1 最大的坑：随机访问

`// ❌ 千万别这样写——O(n²) 级灾难   for (int i = 0; i < linkedList.size(); i++) {       System.out.println(linkedList.get(i));  // 每次 get() 都是 O(n) 遍历   }  // ✅ 应该用迭代器——O(n)   for (String s : linkedList) {   // 底层用的是 ListItr       System.out.println(s);   }  `

这个坑是我自己踩过的——刚学 Java 时用 LinkedList 存了几万条数据，然后用 for-i 循环去 get，结果卡得怀疑人生。后来换成 foreach，速度飞起。本质上就是 O(n²) 和 O(n) 的差别，数据量大了就是天壤之别。

### 6.2 内存占用

每个元素在 ArrayList 里就是一个引用（4 或 8 字节），但在 LinkedList 中是一个 Node 对象——**前驱指针 + 数据 + 后继指针 + 对象头**。JDK 8 开启指针压缩时，一个 Node 大概占用 32 字节（对象头 12 + item 4 + next 4 + prev 4 + 对齐填充 8），ArrayList 的一个引用才 4 字节。**整整 8 倍的内存差距**。

所以存储大量数据时，LinkedList 的内存开销会让你肉疼。

### 6.3 适用场景总结

场景

推荐

原因

频繁随机访问

❌ LinkedList

每次 O(n) 遍历

频繁头尾插入删除

✅ LinkedList

O(1)，不用扩容

频繁中间 index 插入

⚠️ 差不多

遍历的 O(n) 是瓶颈

需要 FIFO 队列

✅ LinkedList

实现了 Deque

需要 LIFO 栈

✅ LinkedList

push/pop 都 O(1)

大量数据存储

❌ LinkedList

内存开销大

遍历为主

✅ ArrayList

内存连续，CPU 缓存友好

## 七、和 ArrayList 的终极对比

`┌─────────────────┬───────────────────────┬──────────────────────────┐   │    对比维度      │      ArrayList        │       LinkedList         │   ├─────────────────┼───────────────────────┼──────────────────────────┤   │ 底层结构         │ Object[] 动态数组     │ 双向链表 (Node)          │   │ 随机访问 get(i)  │ O(1) — 内存偏移       │ O(n) — 遍历              │   │ 尾部插入 add(e)  │ O(1) 均摊             │ O(1)                     │   │ 头部插入         │ O(n) — 全部挪位       │ O(1) — 改指针            │   │ 中间插入         │ O(n) — 挪位           │ O(n) — 遍历 + O(1) 改指针│   │ 按值查找 indexOf │ O(n) — 遍历           │ O(n) — 遍历              │   │ 内存占用         │ 低（引用数组）        │ 高（Node 对象+指针）     │   │ CPU 缓存友好     │ ✅ 连续内存，预取友好  │ ❌ 分散节点，缓存命中低   │   │ 扩容代价         │ 有（1.5 倍扩容+拷贝）  │ 无（动态创建节点）       │   │ GC 压力         │ 低                     │ 高（节点多，GC 频繁）    │   │ 接口实现         │ List, RandomAccess    │ List, Deque, Queue      │   │ 序列化           │ 自定义（只序列化实际元素）│ 遍历节点逐个序列化       │   └─────────────────┴───────────────────────┴──────────────────────────┘   `

**最后说点个人感悟**：

LinkedList 在 JDK 早期版本（1.2）就和 ArrayList 一起就有了，这二十多年来底层实现基本没大变过。在真正的业务开发中，LinkedList 的使用率远低于 ArrayList —— 因为大多数场景就是用 List 做"集合容器"来遍历，ArrayList 的连续内存 + 缓存友好天然更适合。

但 LinkedList 的价值在于**它的多功能性**：当你需要一个同时支持 List 操作、队列操作、栈操作的容器时，LinkedList 一个类就够了，省得你引入 ArrayDeque 和 ArrayList 俩类。只不过 ArrayDeque 作为栈和队列其实性能更好（在后面文章里会详细对比），所以 LinkedList 的最佳定位还是**需要一个可以按索引访问（不太频繁）同时又需要频繁头尾操作的双端队列 + 列表**这种混合场景。

另外，面试的时候讲到 LinkedList，如果能提到**指针压缩对 Node 内存占用的影响**、**CPU 缓存行预取对遍历性能的影响**，那绝对是个加分项。这些不是光背八股文能知道的，得真正跑过 Benchmark 才有体会。

![Java](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E> "Java")