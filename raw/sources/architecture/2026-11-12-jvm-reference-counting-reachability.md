---
title: 【JVM 底层修炼记】如何判断对象该不该回收？聊聊经典的引用计数法与可达性分析算法
source: 知乎
source_url: "https://zhuanlan.zhihu.com/p/2103769210321105002"
source_type: link
platform: 知乎
captured: 2026-11-12
registered_at: 2026-11-12
inbox_ref: Inbox/2026-11-12-jvm-reference-counting-reachability.md
asset_ref: Assets/2026/11/jvm-reference-counting-reachability.md
---

# 【JVM 底层修炼记】如何判断对象该不该回收？聊聊经典的引用计数法与可达性分析算法

来源：知乎专栏 · https://zhuanlan.zhihu.com/p/2103769210321105002

在前面的文章中，我们从类加载、内存结构、对象创建一直聊到了逃逸分析。

我们知道，Java 堆内存是有限的。当对象不断被创建，而一些对象已经失去使用价值时，就需要垃圾收集器（GC）识别并回收这些对象，释放内存空间。

那么问题来了：

**在浩瀚的堆内存中，JVM 究竟是如何判断一个对象是否还值得保留的？**

一个对象没有变量引用它，就一定会被回收吗？

两个对象互相引用，却没有其他地方能够访问它们，JVM 又该如何处理？

今天，我们就来聊聊垃圾回收（GC）世界里的生死判决机制：经典的引用计数法与现代 JVM 主流使用的可达性分析算法。

## 一、经典方案：引用计数法（Reference Counting）

引用计数法是一种比较直观的内存管理算法。

它的核心思想非常简单：

**为每个对象维护一个引用计数器，记录当前有多少个有效引用指向它。**

### 1. 核心原理

假设有一个对象：

`User user = new User();`

此时，假设对象的引用计数为 1。

如果又有一个变量指向它：

`User user2 = user;`

引用计数增加为 2。

如果其中一个引用失效：

`user = null;`

引用计数减少为 1。

当所有引用都失效，计数器变为 0 时，对象就可以被回收。

示意图：

```
创建对象
            |
            v
       +----------+
       | User 对象 |
       +----------+
            ^
            |
       user（引用）
            |
       引用计数 = 1

            |
            v

       user2 = user

            |
            v

       +----------+
       | User 对象 |
       +----------+
         ^      ^
         |      |
       user   user2

       引用计数 = 2

            |
            v

       user = null

            |
            v

       +----------+
       | User 对象 |
       +----------+
            ^
            |
          user2

       引用计数 = 1

            |
            v

       user2 = null

            |
            v

       引用计数 = 0

            |
            v

         可以回收
```

需要注意：

引用计数器只是算法层面的概念，并不意味着计数器必须存储在 Java 对象头中。不同语言和运行时可以采用不同的数据结构实现引用计数。

### 2. 引用计数法的优缺点

**优点：**

*   实现原理简单。
*   对象引用数量变化时，可以及时更新计数。
*   引用计数归零后，可以及时识别不再被引用的对象。
*   在某些实现中，可以较及时地释放对象资源。

**缺点：**

*   每次引用关系变化都需要维护计数器，会带来额外开销。
*   多线程环境下，计数器更新可能需要原子操作或其他同步机制。
*   最致命的问题：无法仅凭计数器归零的规则解决循环引用。

### 3. 循环引用灾难

来看一段经典代码：

```
public class ReferenceCountDemo {

    public Object instance = null;

    public static void main(String[] args) {

        ReferenceCountDemo objA =
                new ReferenceCountDemo();

        ReferenceCountDemo objB =
                new ReferenceCountDemo();

        objA.instance = objB;

        objB.instance = objA;

        objA = null;

        objB = null;
    }
}
```

我们用图来理解：

```
objA                    objB
         |                       |
         v                       v
    +----------+            +----------+
    |  对象 A  | ---------> |  对象 B  |
    +----------+            +----------+
         ^                       |
         |                       |
         +-----------------------+
```

现在执行：

```
objA = null;
objB = null;
```

外部变量已经不再引用这两个对象。

但是：

*   对象 A 仍然被对象 B 引用。
*   对象 B 仍然被对象 A 引用。

如果采用简单引用计数法：

```
对象 A：引用计数 = 1

对象 B：引用计数 = 1
```

两个对象的引用计数都不为 0。

于是，它们可能一直无法被回收。

这就是引用计数法在处理循环引用时的经典问题。

不过，这里需要补充一个重要知识点：

**循环引用本身并不一定造成内存泄漏，真正的问题是引用计数法无法判断这一组相互引用的对象是否已经整体不可达。**

例如，Python 等运行时采用引用计数与循环垃圾检测相结合的方式处理对象生命周期，并不是所有引用计数系统都完全无法处理循环引用。

而 Java HotSpot 的主流垃圾收集器并不依赖简单的对象引用计数作为主要的存活判定机制。

## 二、现代 JVM 的核心：可达性分析算法（Reachability Analysis）

既然引用计数法存在循环引用问题，那么 JVM 如何解决？

答案就是：

**可达性分析算法。**

这是 Java HotSpot 等采用追踪式垃圾回收机制的运行时中，判断对象是否存活的重要基础。

### 1. 核心原理

可达性分析的核心思想：

**以一组称为 GC Roots 的根对象或根引用作为起始点，从这些根出发，根据对象之间的引用关系向下搜索。**

能够从 GC Roots 到达的对象，属于可达对象。

无法从 GC Roots 到达的对象，则具备被垃圾回收的条件。

示意图：

```
GC Roots
                     |
            +--------+--------+
            |                 |
            v                 v
         对象 A             对象 D
            |                 |
            v                 v
         对象 B             对象 E
            |
            v
         对象 C

       对象 F <----------> 对象 G
          （相互引用，但整体不可达）
```

分析：

*   A、B、C：能够从 GC Roots 到达，属于可达对象。
*   D、E：能够从 GC Roots 到达，属于可达对象。
*   F、G：虽然互相引用，但没有任何路径能够从 GC Roots 到达它们。

因此，F 和 G 都具备被回收的条件。

这就是可达性分析相比简单引用计数法的重要优势：

**它关注的是对象能否从根集合到达，而不是对象被引用了多少次。**

### 2. Java 中究竟什么可以作为 GC Roots？

GC Roots 并不是一个普通的 Java 对象集合，而是垃圾收集器在进行可达性分析时使用的根引用集合。

在 HotSpot 等 JVM 实现中，典型的根引用来源包括：

**① 活动 Java 线程的栈引用**

例如：

```
public void test() {

    User user = new User();

    // user 仍然可能被后续代码使用

}
```

当前活动线程的栈帧中，如果存在仍然有效的对象引用，就可能成为 GC Roots 的来源。

包括：

*   方法参数。
*   局部变量。
*   其他仍然存活的栈引用。

注意：并不是方法中所有声明过的局部变量都会一直作为 GC Roots。JIT 优化后，已经不再需要的引用可能提前失效。

**② 类的静态字段引用**

例如：

```
public class UserManager {

    public static User user =
            new User();

}
```

只要对应的类及其定义类加载器仍然可达，静态字段引用的对象就可能保持可达。

**③ JNI 引用**

Native 方法通过 JNI 持有的对象引用，也需要被垃圾收集器识别。

主要包括：

*   JNI Local Reference。
*   JNI Global Reference。

例如，Native 代码创建的全局引用，在被显式释放之前，可以使对应 Java 对象保持可达。

**④ JVM 内部引用**

JVM 自身也会持有一些需要保留的对象引用。

例如：

*   虚拟机内部数据结构持有的引用。
*   某些活动线程及同步相关的引用。
*   JVM 运行时管理的其他内部引用。

需要注意：

GC Roots 的具体组成和扫描方式会受到 JVM 实现及垃圾收集器的影响，不能将某一份固定清单理解为所有 JVM 必须完全一致的实现。

另外，原来很多教程会把"方法区中的常量引用"单独列为 GC Roots。

这种说法过于简单。更准确的理解是：需要看对应引用是否属于 JVM 当前根集合或能够从根集合到达，而不是认为所有常量池中的引用都天然属于 GC Roots。

## 三、对象的生死审判：finalize() 与对象复活

很多人以为：

只要对象经过可达性分析，被判定为不可达，就会立刻被回收。

实际上并不完全如此。

这里涉及一个历史机制：

**对象终结（Finalization）。**

在早期 Java 中，开发者可以通过重写 `finalize()` 方法，在对象被最终回收之前执行一些清理操作。

### 1. 传统的两次标记过程

对于存在有效终结方法的对象，传统 HotSpot 垃圾回收教材通常会介绍一个"两次标记"的处理过程。

我们以传统的 Finalization 机制为例理解。

**第一次标记：发现对象不可达**

当垃圾收集器进行可达性分析时，如果发现某个对象无法从 GC Roots 到达，就会进一步检查它是否需要执行终结方法。

主要考虑：

*   是否存在需要执行的终结方法。
*   该对象是否已经执行过终结方法。

如果对象不需要执行终结方法，就不需要经历后续的终结处理流程。

如果对象需要执行终结方法，则会被安排进入终结处理流程。

**第二次处理：执行终结方法并重新判断可达性**

在传统 HotSpot 实现中，待终结对象会进入内部处理队列，由 JVM 的终结处理线程执行相应方法。

终结方法执行后，JVM 后续还需要重新判断对象是否可达。

如果对象仍然不可达，就可以在后续垃圾收集过程中回收。

如果对象重新建立了有效引用，则可以暂时保留。

流程示意：

```
GC Roots
              |
              v
         可达性分析
              |
              v
          对象不可达
              |
              v
        是否需要终结处理？
           /       \
         否         是
         |           |
         v           v
      可回收      安排终结处理
                     |
                     v
                执行 finalize()
                     |
                     v
                重新判断可达性
                     |
                +----+----+
                |         |
              重新可达   仍然不可达
                |         |
                v         v
             暂时保留   后续可回收
```

特别注意：

**两次标记是传统 Finalization 处理过程的教学性概括，并不是所有垃圾收集器都必须采用的固定算法。**

没有需要执行终结方法的普通对象，不需要为了等待 `finalize()` 而经历这套处理流程。

### 2. 对象复活：finalize() 的最后一次机会

这是 `finalize()` 最有意思的地方。

如果对象在执行 `finalize()` 时，重新把自己保存到一个外部可达的位置，那么它就可能重新变得可达。

例如：

```
public class Zombie {

    private static Zombie savedObject;

    @Override
    protected void finalize() throws Throwable {

        savedObject = this;

        System.out.println("对象复活了！");
    }
}
```

这里：

`savedObject = this;`

将当前对象重新保存到静态变量中。

由于静态字段引用能够从 GC Roots 所在的根集合出发被追踪到，因此对象可能重新变得可达。

注意：

`this` 不能作为赋值目标。真正实现对象复活的是将 `this` 保存到外部可达的引用位置，例如静态字段。

概念上：

```
第一次 GC：

GC Roots

    |

    X

Zombie 对象不可达

执行 finalize()

    |

    v

savedObject = this

第二次 GC：

GC Roots
    |
    v
savedObject
    |
    v
Zombie 对象

对象重新变得可达
```

### 3. 对象复活只能发生一次

这里还有一个非常重要的知识点：

**对于同一个对象，JVM 自动调用 `finalize()` 最多只有一次。**

例如：

第一次对象不可达：

`finalize()`

成功将自己保存到静态变量中，对象复活。

之后再执行：

`savedObject = null;`

对象再次变得不可达。

即使再次发生垃圾收集，JVM 也不会再次自动调用这个对象的 `finalize()` 方法。

因此：

```
第一次不可达
      |
      v
执行 finalize()
      |
      v
对象复活
      |
      v
再次不可达
      |
      v
不再执行 finalize()
      |
      v
后续可以被回收
```

这就是传统教材中经常提到的对象复活机制。

### 4. finalize() 为什么不推荐使用？

虽然 `finalize()` 可以让对象在最终回收前执行清理逻辑，但它存在很多问题：

**① 执行时间不可控**

对象变得不可达后，不代表 `finalize()` 会立即执行。

JVM 可能延迟执行，甚至在程序退出前都没有机会执行。

**② 执行顺序不可控**

Java 规范没有保证不同对象的 `finalize()` 执行顺序。

多个对象的终结方法甚至可能并发执行。

**③ 可能造成性能问题**

终结处理会增加额外的对象生命周期管理成本，也可能导致对象延迟回收。

**④ 可能导致对象复活**

开发者可能意外地重新建立对象引用，造成生命周期管理复杂化。

**⑤ 异常处理特殊**

`finalize()` 中未捕获的异常会被忽略，并终止该对象的终结处理。

因此，现代 Java 已经不推荐使用这种机制。

版本变化：

| JDK 版本 | 变化 |
| --- | --- |
| JDK 9 | Object.finalize() 被弃用 |
| JDK 18 | Finalization 被标记为待移除 |
| JDK 18 起 | 提供 --finalization=disabled，可以禁用终结机制 |
| JDK 25 | 规范允许 Java 实现禁用终结机制 |

所以，在现代 Java 开发中，不应该依赖 `finalize()` 来释放文件、数据库连接或其他外部资源。

## 四、补充知识：Java 中的四种引用

理解可达性分析之后，还需要了解 Java 中的四种引用类型。

因为并不是所有引用关系都具有相同的强度。

Java 提供了：

1.   强引用（Strong Reference）。
2.   软引用（Soft Reference）。
3.   弱引用（Weak Reference）。
4.   虚引用（Phantom Reference）。

### 1. 强引用（Strong Reference）

这是我们日常开发中最常见的引用方式。

例如：

`User user = new User();`

只要对象仍然可以通过强引用从 GC Roots 到达，垃圾收集器就不会因为内存不足而直接回收它。

### 2. 软引用（Soft Reference）

软引用通常用于实现内存敏感型缓存。

例如：

```
SoftReference<User> reference =
        new SoftReference<>(new User());
```

当对象只剩下软引用可达时，JVM 可以根据内存需求决定是否清除软引用。

但软引用并不保证对象一定能保留到某个固定时间，也不适合用来保证缓存数据长期存在。

### 3. 弱引用（Weak Reference）

弱引用比软引用更容易被回收。

例如：

```
WeakReference<User> reference =
        new WeakReference<>(new User());
```

当对象不再具有强引用或软引用可达性，只剩弱引用时，在垃圾收集器进行相应引用处理时，弱引用会被清除。

常见应用：

*   WeakHashMap。
*   某些缓存和对象关联场景。
*   避免某些对象关联关系阻止目标对象被回收。

### 4. 虚引用（Phantom Reference）

虚引用是最弱的一种引用形式。

例如：

```
PhantomReference<User> reference =
        new PhantomReference<>(
                new User(),
                referenceQueue
        );
```

虚引用无法通过 `get()` 获取被引用的对象。

它主要用于配合 `ReferenceQueue`，在对象达到虚可达状态后获得通知。

常见用途：

*   跟踪对象被回收的状态。
*   配合 Cleaner 执行资源清理操作。
*   管理某些堆外资源的生命周期。

四种引用的区别：

| 引用类型 | 主要特点 |
| --- | --- |
| 强引用 | 正常对象引用，强可达时不会被 GC 当作垃圾 |
| 软引用 | 内存不足时可能被清除 |
| 弱引用 | 不再强可达或软可达时，可在 GC 引用处理中被清除 |
| 虚引用 | 无法通过 get 获取对象，主要用于回收状态通知 |

这里需要特别注意：

软引用、弱引用和虚引用并不是简单地把对象从 GC Roots 中删除，而是由 JVM 按照不同的可达性级别和引用处理规则进行管理。

## 五、总结：JVM 究竟如何判断一个对象是否该回收？

今天我们了解了 Java 垃圾回收中最重要的两个概念：

**引用计数法与可达性分析算法。**

最后记住几个核心知识点：

**1. 引用计数法是什么？**

通过记录对象被引用的数量来判断对象是否可以回收。

优点是原理简单，缺点是无法单独解决循环引用问题。

**2. 可达性分析是什么？**

从 GC Roots 出发，根据引用关系向下搜索。

能够到达的对象属于可达对象，无法到达的对象则具备被回收的条件。

**3. 为什么循环引用不会阻止 Java GC 回收对象？**

因为可达性分析关注的是对象能否从 GC Roots 到达，而不是对象之间有多少条相互引用关系。

**4. finalize() 是什么？**

它是 Java 历史遗留的对象终结机制，可以在对象最终回收前执行一次终结方法，但执行时间和顺序都不可控。

**5. 对象复活是什么意思？**

对象在终结方法中重新建立外部可达引用，使自己重新变得可达。

但同一个对象的 `finalize()` 不会被 JVM 自动调用第二次。

**6. Java 有哪四种引用？**

强引用、软引用、弱引用和虚引用。

它们具有不同的可达性级别，GC 对它们的处理方式也不同。

最后记住一句话：

**JVM 判断对象是否可以回收，核心不是看它被引用了多少次，而是看它是否仍然能够从 GC Roots 到达，并按照不同引用类型和对象终结规则进行处理。**

### 参考资料

本文主要参考以下官方资料：

1.   [Java Language Specification — Chapter 12：Execution and Finalization](https://docs.oracle.com/javase/specs/jls/se25/html/jls-12.html)
2.   [Oracle HotSpot VM Garbage Collection Tuning Guide](https://docs.oracle.com/en/java/javase/25/gctuning/)
3.   [Oracle Java SE 25 — Object API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html)
4.   [Oracle Java SE 25 — Reference API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ref/package-summary.html)
5.   [JEP 421 — Deprecate Finalization for Removal](https://openjdk.org/jeps/421)

本文以 Java SE 规范和 HotSpot 的常见实现为基础进行讲解。具体垃圾回收算法、根集合扫描方式和对象终结处理流程可能因 JVM 实现及版本而有所不同。
