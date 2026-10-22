---
title: 打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）
source: 京东云开发者（微信公众号）
source_url: https://mp.weixin.qq.com/s/9xTFLXnCZIzU6mdYy1VFng
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-22
inbox_ref: Archive/2026-10-14-high-perf-low-cpu-coding-tips-part2.md
---

# 打造高性能、低CPU消耗系统—36种编码实战技巧（下篇）

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

**本文导读**

本系列文章**基于黄流百万 QPS 高并发系统实战经验沉淀**，内容涵盖**36种**编码注意事项，**100+**种具体案例，聚焦高性能、低CPU消耗的代码编写，大家可逐一和自己系统代码进行对比，无论是日常开发还是系统调优，都能从中获得实用指导，可将其作为常备的参考手册，作为一部**百科全书**来使用。

本篇为系列下篇，介绍后18种编码，大家可先点赞、收藏并关注，后续慢慢阅读学习。

特殊说明：本文及本系列文章，适用于有性能痛点，追求高并发，高吞吐量，高性能的场景；若无这方面诉求，建议优先考虑系统和代码的可读性和可维护性。上篇链接[打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502917&idx=1&sn=f76ad9d10206f812387a57c83a8f377a&scene=21#wechat_redirect)

**

十九、避免**void/n****ull出参**

**

在公共方法、服务方法、RPC 接口、核心业务方法中，**禁止返回****void 无返回值**，**禁止返回****null 对象 / 集合**；统一返回**有意义的结果值、布尔值、空对象、空集合、统一响应体**，让调用方**无需判空、无需捕获异常**，实现**零冗余判断、零空指针、零异常开销**。

### **19.1 核心原理**

**（1）**void = 无状态反馈 → 必须抛异常 → CPU + GC 开销剧增****

*   **当使用void作为返参时，方法执行成功 / 失败无法显性传递，只能靠异常传递状态；但异常创建需要填充堆栈轨迹，是重量级 CPU 操作。**
    

**（2）null = 强制调用方判空 → 大量 if 分支 → CPU 分支预测失败**

*   **调用方必须写 if (obj != null)，分支过多会降低执行效率，极易出现NPE 空指针。**
    

**（3）null 不节省内存，只带来风险**

*   返回引用地址 4 字节照样占用，不会减少内存，只会增加判断与崩溃风险。
    

**（4）空集合 / 空对象是零开销安全方案**

*   Collections.emptyList()、new EmptyDTO() 是静态常量、单例、零 GC，完全无性能损耗。
    

**19.2 注意事项**

1\. 空集合是单例，无内存、无 GC，放心使用

2\. 禁止自己 new 空集合，用 JDK 静态常量：Collections.emptyList()

3\. 简单业务用 boolean，复杂接口用统一返回体

4\. RPC 接口严禁返回 null，必须返回标准结构

在这里我们解释下第二条：禁止自己 new 空集合，用 JDK 静态常量：Collections.emptyList()

**（1）emptyList () 是全局静态常量，只创建 1 次，0 GC！**

Collections.emptyList() 底层是：

```
staticfinalEmptyList<?>EMPTY_LIST=newEmptyList<>();
```

全局唯一单例！

*   整个 JVM 只创建1 次
    
*   调用 1 万次、100 万次，都是同一个对象
    
*   完全不产生 GC
    

**（2）你自己 new ArrayList<>()，每次都创建新对象！**

```
// 每次调用都创建新对象！！！returnnewArrayList<>();
```

*   调用 1 次 = 创建 1 个新对象、
    
*   调用 1000 次 = 创建 1000 个临时空集合
    
*   高并发下 → 大量短命对象 → YGC 频繁 → 接口卡顿
    

这就是性能浪费

**（3）emptyList () 占用内存极小，几乎为 0**

*   emptyList()：空对象，没有数组，不占内存
    
*   new ArrayList()：初始容量 10，创建空数组，占内存
    

空集合本来就不该占任何内存。

**19.3 落地经验**

**示例 1：反面 —— 返回 void + 抛异常（高危）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**优化 —— 返回 boolean，无异常、无 null**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 2：反面 —— 返回 null（NPE 重灾区）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**优化 —— 返回空对象（永不 null）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 3：反面 —— List 返回 null（高危）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**优化 —— 返回空集合（零开销）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

二十、避免多重否定

**

代码条件判断中，禁止连续出现多个否定语义：!、非、不存在、未完成、不允许叠加判断；统一使用正向语义、单层判断、肯定句式编写条件，简化分支逻辑。

（1）多重否定阅读成本极高，极易逻辑写反

*   !isNotFinish、!list.isEmpty() 这类双层否定，人脑反向理解，容易写出逻辑 BUG、边界遗漏。
    

（2）排查困难、维护成本高

*   复杂否定条件，线上问题排查、迭代改逻辑时，极易误改条件，引发隐性故障。
    

（3）语义直观化，贴合轻量化编码思想

*   正向判断主干清晰、逻辑单一，执行链路更短、代码更健壮。
    

20.1 实现方式

（1）布尔变量、状态字段，命名正向化

*   isFinish、isValid、isExist，杜绝 isNotFinish、invalid 反向命名。
    

（2）能用基本类型，不用包装类

*   !list.isEmpty() → list.isNotEmpty()  
    
*   !user.isNotVip() → user.isVip() 
    

### **20.2 注意事项**

**示例 1：错误 多重否定，逻辑绕、易出错**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化 正向单层判断：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

二十一、严禁深层代码

**

限制代码嵌套层级深度（常规规范：嵌套不超过 3 层），禁止多层 if/else、嵌套 for 循环、嵌套 try-catch、嵌套 lambda、嵌套内部代码块；通过提前 return、抽取方法、条件反转、拆分逻辑扁平化代码结构。

### **21.1 核心原理**

（1）嵌套层级越深，CPU 分支跳转越多

*   多层 if/for 嵌套会产生大量连续条件分支、循环跳转，破坏 CPU 流水线执行，分支预测命中率下降，整体执行耗时增加。
    

（2）深层代码 JIT 优化难度大幅上升

*   复杂嵌套、多层跳转、代码块挤压，编译器难以做循环展开、指令重排、逃逸分析等优化，运行期性能变差。
    

（3）深层嵌套极易产生边界 Bug、漏判、NPE

*   层级越深，逻辑耦合越紧，缩进混乱、上下文变量混杂，容易漏掉边界条件、异常场景。
    

（4）可读性、可维护性雪崩

*   多层嵌套代码逻辑缠绕，排查问题、迭代改需求、代码 Review 成本极高。
    

（5）嵌套循环会产生指数级性能损耗

*   多层 for 嵌套（二重 / 三重循环），时间复杂度从 O (n) 变成 O (n²)、O (n³)，高并发场景性能爆炸。
    

### **21.2 实现方式**

**（1）卫语句提前 return**

*   条件不满足直接返回 / 终止，砍掉 else，扁平化结构。
    

**（2）大逻辑拆分为多个小方法**

*   每层单一职责，长逻辑、嵌套逻辑抽取独立私有方法。
    

**（3）条件反转，减少嵌套**

*   把「满足条件再执行」改为「不满足直接 return」。
    

**（4）禁止三层及以上循环嵌套**

*   多维度遍历改用集合映射、Map 查找、数据预处理替代嵌套循环。
    

**（5）复杂业务分支使用策略模式、Map 条件分发**

*   替代多层 if-else 嵌套。
    

### **21.3 代码示例**

示例 1：反面 —— 深层 if 嵌套（层级过深）

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

优化：卫语句提前 return，完全扁平化

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 2：反面 —— 双层 / 三层 for 嵌套，性能极差**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**优化：Map 预映射，消灭嵌套循环**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 3**：反面 —— 多层 else 嵌套

```
if (status == 1) {
```

优化：else if / Map 分发，扁平化

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 4：反面 —— 嵌套 try-catch**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

优化：单层捕获，异常统一收敛

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

二十二、final和静态方法为什么性能最高，什么情况下适合用?

**

final 方法、静态方法，是 JVM 唯一可以在编译期 / 类加载期就确定调用目标的方法，完全不需要动态分派、多态查找、虚方法表搜索，性能是最高的。

### **22.1 核心原理**

### **22.1.1 普通方法、final方法、static方法三者的区别：**

**（1）普通方法=虚方法**

JVM 调用时必须做：

1.查虚方法表

2.找实际类型

3.做多态动态分派

4.确认调用哪个实现

→ 运行时开销、无法百分百内联、JIT 优化难度大

**（2）final 方法 = 不可重写**

*   编译期就确定唯一实现  
    
*   没有多态  
    
*   不需要查方法表  
    
*   JVM 直接定位方法、  
    
*   100% 安全内联
    

**（3）减少对象创建与 GC**

*   不依赖对象实例
    
*   编译期直接绑定
    
*   没有多态、没有继承、没有重写
    
*   调用时零开销
    
*   JVM 直接调用，不经过方法表
    

**（4）缩短接口 RT**

*   一次查询耗时 30ms，重复 3 次就变成 90ms，复用直接回到 30ms。
    

**（5）贴合 CPU 漏斗模型**

*   把重复、冗余、无效的计算在**方法内 / 上层**消化掉，不让下游承担多余压力
    

### **22.1.2 final / 静态方法 性能高的原因**

**（1）早绑定（静态绑定），没有动态分派开销**

*   普通方法：运行时确定
    
*   final/static：编译 / 类加载时确定
    

**（2）JIT 100% 可以内联（最重要）**

*   内联：把方法代码直接复制到调用处
    
*   作用：消灭方法调用开销，进一步优化变量、消除冗余
    
*   普通方法不敢随便内联（怕被子类重写）
    
*   final /static 100% 安全内联，性能非常好
    

**（3）不需要操作 this 对象**。

*   静态方法没有 this，少一个对象引用传递，少一层对象访问开销。
    

**（4）JVM无需做多态安全检查**

不用判断：

*   子类是否重写
    
*   实际类型是谁
    
*   方法表地址
    

CPU 指令更少，执行更快

### **22.1.3 适合用static/final的情况**

### **(1）适合用 static 方法**

    1.工具类方法（StringUtils、DateUtils、数字工具）

    2.无状态方法（不依赖成员变量，只处理入参）

    3.常量计算、转换、解析、校验

    4.底层通用公共逻辑

(2）适合用 final 方法

    1.不想被重写的核心业务方法

    2.高频调用、核心链路、循环内调用的方法

    3.模板方法、基础算法

    4.父类提供、子类不许改的标准逻

(3）不适合用

    1.需要多态、重写的业务方法

    2.接口方法（接口默认是 open 的）

    3.Spring AOP 代理方法（final 无法被代理）

方法类型

绑定时机

多态

方法表

内联

性能

**static 方法**

编译期

无

不查

100%

**最高**

**final 方法**

编译期

无

不查

100%

**最高**

普通方法

运行期

有

查

有限

一般

22.2 注意事项

1.static 方法不能访问非静态成员变量

2.static 方法不能被重写，没有多态

3.final 方法不能被重写

4.Spring AOP、事务、动态代理 不能作用于 final/static 方法→ 代理失效！

5.高频工具方法、循环内方法，优先 static + final

6.不要为了性能强行把所有方法 static，破坏设计

22.3 代码示例

示例 1：最优 —— 工具方法用 static（性能最高）

```
// 静态工具方法：无状态、无this、早绑定、百分百内联publicstaticbooleanisEmpty(String str){
```

示例 2：最优 —— 高频核心方法用 final

```
// 高频方法 + final = 禁止重写 + JVM极致优化
```

**示例 3：不推荐 —— 工具方法写成普通方法（多余开销）**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

示例 4：最佳案例 —— 静态常量 + 静态方法 + final 方法

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

二十三、字符优先用 `char`、字节优先用`byte`

**

在底层编码、文本处理、网络协议、IO 读写、数据解析等场景中，利用基本类型**零封装、零对象头、零 GC、访问效率极致**的特性，降低 CPU 与内存开销。**优先使用原生基本类型** `**char / byte**` **处理数据**，**禁止直接使用** `**String**` **封装类**进行底层操作；

23.1 核心原理 

（1）String 是对象，char/byte 是原生数值

*   String：占内存大（对象头 + 数组引用 + 数组内容），需要 GC  
    
*   char/byte：直接存储在栈 / 数组中，无任何对象开销
    

（2）String 底层也是 char \[\]/byte \[\]

*   所有字符串操作底层都会拆分为字符 / 字节数组，直接用原生类型少一层封装，减少方法调用与解包开销。
    

（3）CPU 指令效率天差地别

*   基本类型运算直接对应CPU 单指令，String 操作需要调用大量方法、判断边界、处理编码。
    

（4）装箱、无拆箱、无引用跳转

*   char/byte 是栈上 / 连续内存直接访问，速度比 String 快 5~50 倍。
    

（5）网络 / IO 天然传输字节流

*   底层协议、磁盘、网络只认 byte，不认 String；用 String 必须编解码，浪费双倍性能。 
    

操作方式

对象创建

内存占用

CPU 指令

GC 压力

性能

**char / byte**

无

极小（1~2 字节）

1~2 条

0

极致

**String**

有

大（对象 + 数组）

几十条

高

低效

23.2 实现方式

（1）底层文本解析、字符判断 → 用 char

*   禁止转成 String 做 equals、contains。
    

（2）网络数据、文件 IO、二进制协议 → 用 byte

*   直接操作字节流，禁止封装为 String 传输。
    

（3）高频字符比较 → 直接 == 比较数值

*   比 String.equals 快一个数量级。
    

（4）批量数据 → 使用 char\[\] / byte\[\] 数组

*   连续内存，访问速度最快，GC 最低。
    

（5）最终对外展示 → 最后再转 String

*   底层处理全程原生类型，出口统一封装。
    

23.3 注意事项

1.char 是 16 位无符号整型，直接参与数值运算，性能极高。

2.byte 是 8 位整型，对应网络 / 磁盘最小存储单元。

3.String 是只读容器，底层操作必须避开，避免频繁创建字符串对象。

4.字符集编码问题：byte 转 String 必须指定编码（UTF-8/GBK），禁止用平台默认编码。

5.数组操作注意下标越界，原生类型无安全校验。

### **23.4 代码示例**

**示例 1**：错误 —— 用 String 判断字符（高开销）

场景：判断文本首字符是否为 '{'

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

问题：

*   字符串对象创建开销
    
*   equals 方法内部循环判断
    
*   高并发下 GC 压力大
    

最优 —— 用 char 原生判断（极致性能）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优势：

*   无对象、无 GC
    
*   一条 CPU 指令完成比较
    
*   速度提升 10~30 倍
    

示例 2：错误 —— IO / 网络用 String（编解码浪费）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最优 —— 直接用 byte \[\] 操作（零转换）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优势：

*   零编解码、零字符串创建
    
*   完全贴合底层传输协议
    
*   高并发下 CPU 占用降低 50%+
    

示例 3：错误 —— 循环内拼接 String（GC 爆炸）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最优 —— 直接操作 char \[\] 数组

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

```
33d// 正确：原生数组操作，零GC
```

**

二十四、集合初始化指定预估容量

**

在创建 ArrayList、HashMap、HashSet 等常用集合时，提前传入预知的数据量大小，避免集合在添加元素时自动触发扩容机制。

24.1 核心原理

（1）集合默认容量很小，不够用就会扩容

我们先了解下所有集合默认初始容量的大小以及扩容机制： 

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

*   无数组结构集合（LinkedList、TreeSet、TreeMap）无扩容开销，不存在数组复制、内存迁移问题；
    
*   数组型集合（ArrayList/HashMap/ArrayDeque）是CPU、GC 性能重灾区，业务可预估元素数量时，必须手动指定初始容量；
    
*   HashMap/HashSet 初始化容量公式：初始容量 = 【预估数量 / 0.75】
    

（2）扩容是极其昂贵的操作

*   新建一个更大的数组（内存分配）
    
*   把旧数组所有元素复制到新数组（CPU 拷贝）
    
*   丢弃旧数组（产生 GC 垃圾）
    

（3）扩容次数越多，CPU + GC 开销爆炸

（4）指定容量 = 零扩容 = 一次分配 + 零拷贝

*   从根源上消灭扩容，性能达到极致。
    

24.2 实现方式

当我们新建一个list，如果不指定容量，会发生什么事？看看下面代码：

```
List<Integer> list = new ArrayList<>(); // 初始容量 10
```

当我们需要存放1000个元素时，就触发 **7次的扩容**，在这期间就需要进行 **7次数组的全量拷贝**，以及产生 **7次的废弃数组**，会给GC打开极大的压力。

若指定了容量，会发生什么？

```
List<Integer> list = new ArrayList<>(1000); // 直接给够空间
```

继续在上面的List中保存1000个元素，会触发 0次扩容、0次数组拷贝、0废弃数组，对GC是无压力的。

24.3 注意事项

（1）容量不要盲目超大估 

*   1000 就给 1000，别给 10000，浪费内存。
    

（2）HashMap 必须按公式计算，不能直接写数量

*   因为有负载因子 0.75，到达 75% 就扩容。
    

（3）不需要精准值，估算即

*   可估 100，实际 120，只扩一次，也能极大优化。
    

（4）使用addAll、putAll等操作需要额外注意

正常情况下：addAll等操作性能极高、开销很小，远优于循环 add（其只拷贝引用地址，无对象创建、无字段复制、无 GC 开销）；但如果触发了频繁扩容会造成巨大的开销。笔者之前团队就出现过addAll频繁扩容造成CPU严重抖动的问题。

### **24.4 代码示例**

**示例 1：错误 —— 不指定容量（会造成高频 GC）**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化 —— 指定容量（零扩容）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

示例 2：错误 —— HashMap 直接写 size

```
// 存100条数据，直接new HashMap(100)
```

优化 —— HashMap 正确公式

```
int count =100;
```

**示例 3**：最优 —— addAll 前指定容量

```
List<User> target =new ArrayList<>(listA.size()+ listB.size());
```

**

二十五、及时清空大合集、解除强引用

**

核心思想是：业务批量处理、定时任务、大数据遍历、临时缓存、方法链路执行完毕后：

1.超大集合、大数组、批量临时对象，主动执行clear() 清空；

clear () 是：提前「切断元素强引用」，让大量元素立刻变成垃圾，让JVM能够快速的进行回收。

2.手动置空引用、切断长生命周期容器对短期对象的强持有；

3.避免大对象 / 大集合长期滞留老年代，防止频繁 YGC、FGC、内存泄漏、内存溢出。

25.1 核心原理

（1）GC 回收规则：只回收「无强引用可达」的对象

*   只要大集合还存在引用，内部所有元素都会被强引用锁定，无法被 GC 回收；哪怕业务已经用完数据，内存也不会释放。
    

（2）大合集危害远大于普通对象

大集合底层是大容量数组，占用堆内存高。长期不释放带来的危害：

*   新生代放不下 → 提前升入老年代
    
*   老年代占用持续走高 → 触发 CMS/FGC
    
*   大对象碎片化、内存水位居高不下，高并发接口卡顿
    

（3）集合若不 clear，若被全局引用，会造成回收滞后

*   方法结束仅断开集合变量引用；但若集合被上层上下文、全局缓存、成员变量持有，元素永久滞留。
    

（4）解除强引用 = 快速断链 + 加速可达性分析

*   主动 clear() / list = null，快速切断引用链；JVM GC 即可快速回收，无需等待老年代回收。
    

25.2 实现方式

1.批量业务处理完毕：主动调用 collection.clear()

2.临时大集合、大数组：使用完毕手动引用 = null

3.减少对全局变量的使用，特别是需要修改全局变量列表的情况禁用；禁止用全局 Map/List 无限累积临时业务数据

4.嵌套结构：不仅清外层集合，嵌套子集合也要清空，具体用法下面案例将给出。

25.3 注意事项

1.只清空业务用完的临时集合，核心常驻缓存、长期复用容器，不可随意 clear。

2.clear() 只会清空元素引用，集合容器本身还在若容器本身也不需要，必须额外 list = null。

3.集合元素是自定义对象、DTO、实体，更要主动断引用这类对象体积大、成员多，滞留内存代价更高。

4.防止清空后二次复用，清空后置空，避免后续代码误操作已失效集合。

5.高并发链路中不要过度手动置空，只针对万级以上大集合、批量数据做优化，小集合无需过度处理。

小集合无需清理原因：

    a) 小集合占用内存微乎其微，释放的内存小到可以忽略不计

    b) 局部变量会自动失效，手动置空 是多此一举，完全没用

    c) 过度手动置空会增加 CPU 指令 + 破坏 JIT 优化

### **25.4 代码示例**

示例 1：错误写法 —— 大集合不清理，强引用滞留

下面代码中，业务执行结束，不做任何清理的话，bigDataList 仍持有上万对象强引用，全部无法回收；长期累积会造成老年代暴涨、FGC频繁

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

优化：用完主动 clear + 解除引用

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**示例 2：错误 —— 全局容器无限累积数据**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

强烈不建议对全局容器进行修改

示例 3：嵌套多层集合，逐层释放

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

上面代码中，内存结构是这样的：

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

若上面代码是某个方法内的代码段，中其实可以不执行dataMap.clear()， 只操作dataMap = null即可，当我们执行dataMap = null 时会发生什么？

1.顶层引用直接断开

2.HashMap 对象 变成不可达

3.HashMap 里的 table 数组 不可达

4.所有 List<ItemDTO>不可达

5.所有 ItemDTO不可达

整个引用链条全部断裂，GC 会一次性把整个结构全部回收。

有一种情况必须先 clear：集合是【成员变量 / 静态变量 / 会复用的池化对象】

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

下面这三句话大家要一定记着：

*   成员变量 = 和服务一起活着，永远不死；
    
*   成员变量 = 和服务一起活着，永远不死；
    
*   局部变量断引用，成员变量要清空。
    

### **25.5 答疑**

**问题1：接口内的，方法内局部变量执行完成后，JVM自己会进行垃圾回收，为什么还需要手动clear？**

**回答：在某些情况下，不是 GC 不会收，而是：等 GC 自己收，太晚、太慢、代价太高、风险太大。**

**（1）GC 回收的是「没人用的对象」，但大集合会让大量对象「被强引用锁死」，例如：一个 List<User> list = 1万条数据，它在内存里是这样的：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

只要 list 这个引用还存在，里面 1 万个对象 100% 不能被 GC 回收。

（2）并且GC回收的时机是不可控的，不知道什么时候会触发，业务处理完1s、5s、30s都可能不会被回收。在这些时间内可能会发生的现象是：

1 万个大对象 → 全部占着内存 → 挤新生代 → 进入老年代 → FGC 风险飙升

（3）大集合最可怕的不是占用内存，是把大量短命对象 → 提前压入老年代，这是 内存最致命的问题。

正常情况下：

*   临时小对象 → 出生在新生代 → YGC 轻松回收
    
*   老年代很干净 → 不触发 FGC
    

大集合不 clear：

*   临时对象被集合强引用持有
    
*   熬过几次 YGC
    
*   直接进入老年代
    
*   老年代瞬间爆炸
    
*   触发 Full GC → 整个服务停顿
    

而我们主动 clear：不让临时对象进入老年代 = 避免 FGC！

所以，主动 clear () 不是为了代替 GC，而是为了：立刻、马上、现在 释放内存，不让大对象霸占堆、不让短命对象进入老年代、不让下一批任务没内存。

再分享一个比喻：

我们大家吃完外卖

*   不主动扔 = 等保洁一周来收一次，会造成家里堆满垃圾，臭、占地方、没法住人
    
*   主动扔 = 吃完立刻丢家里干净、无异味、随时能住
    

clear () = 吃完立刻扔垃圾

GC = 一周才来一次的保洁

问题2：当clear的时候，不仅清外层集合，嵌套子集合也要清空

回答：如果是嵌套集合结构：Map<List<Bean>>、List<List<DTO>>、List<Map<...>>只调用外层 clear()没用，内层子集合依然存在强引用，元素无法释放；

必须：外层清空 + 每一个内层子集合逐个 clear，彻底斩断所有引用链。

底层原理：

*   外层clear()：只删除「外层容器保存的 子集合引用」
    
*   但子集合本身、子集合内部元素 还是互相强引用持有
    
*   大批量数据下，内层大量对象依然滞留堆内存、易晋升老年代、引发 FGC
    
*   只有内层逐个清空，才能让多层级对象全部变为「可回收状态」
    

例如下面的双层嵌套结构

```
// 外层Map，value 是内层大List
```

**如果只清外层，不清内层：**

```
outerMap.clear();
```

会存在以下问题：

1\. outerMap 里面存的 List 引用被删掉

2\. 那些 内层List对象、List里的OrderDTO 依然在堆内存中，存在游离强引用

3\. 大数据量：上万条DTO 依旧占用内存，回收延迟、堆水位居高不下

就好比：我们把通讯录里的人删掉了，但那些人本身还存在。

所以需要先清理内层，再清外场：

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**问题3：如果某个对象有多个属性，里面的属性也是对象；这种情况下是得从外到内都清除还是只清除最外侧的对象即可**

**回答：**

**1.常规业务普通对象、非大对象、非集合属性，只需要解除最外层对象引用 = 全部自动可回收，不用手动清空内部属性。**

**2.外层对象内部包含：大集合、大数组、批量嵌套 DTO / 容器必须先清空内部集合 / 容器属性，再释放外层对象；只清外层，内部大集合依然强引用锁死大量对象，内存泄漏、老年代堆积**

**例如，纯普通成员对象，内部无集合**

```
class A {
```

当我们把 `A a = null`时， `A` 引用断掉，A 持有的 `b、c` 全部**引用链断裂；**GC 连锁全部回收

再例如：属性中包含「集合 / 大容器」

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

这种情况下就需要将内部的**idList、dataMap也进行手动清除，它们是长生命周期容器**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**问题4：微服务中，普通接口的单次请求中的对象，需要手动清除吗？**

**回答：**

*   **微服务普通接口单次请求：不用手动 clear / 置空；**
    

*   **若接口内存在 万级大集合、批量数据、大对象、嵌套集合、长链路临时上下文 → 必须主动清理。**  
    

一般情况下，微服务接口对象具备天然的回收优势

1.接口所有业务对象、DTO、集合、参数，绝大部分是局部变量

2.一次请求一条独立线程，请求结束 → 线程栈帧销毁

3.栈上引用全部自动断开，所有临时对象快速变为 GC 可达回收

4.微服务接口是「短链路、快请求、瞬时对象」正常小对象、小集合：JVM 回收效率极高，完全不需要手动干预，过度清理反而降性能。

那么在哪些情况下需要手动clear呢？

（1）单次接口承载「万级以上批量数据」

*   批量导出、批量查询、批量组装数据
    
*   一次性查几千 / 几万条列表、组装大 List / Map
    
*   大数据汇总、报表接口
    

这些都必须：clear() + 必要时置空，如果只靠 GC 自动回收：大集合元素滞留、提前晋升老年代，接口并发高时频繁 YGC / 偶尔 FGC。

（2）对象内部嵌套大集合属性

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

只把 `context = null` 不够；**要先清空内部 List、Map，再释放上下文对象**。

**（3）接口长链路、多层方法透传大集合**

大集合在多个 Service / 方法层层传递，引用链复杂；GC 可达性分析变慢，回收延迟明显，高并发堆积内存。

**（4）定时任务 + 微服务常驻后台线程**

不是 HTTP 短请求，是常驻线程、循环跑批；常驻线程局部变量不会随请求销毁，**大集合极易内存累积泄漏**，必须强制 clear。

（5）全局 / 成员变量缓存临时业务数据

Controller/Service 成员变量、静态集合，存放接口临时数据；生命周期和容器一致，永远不会自动回收，必须手动清理。

问题5：如果都是方法内部的局部变量，即使是大对象，我通过调整JVM参数是不是也能解决进入老年代的问题？

回答：绝大部分场景可以解决，效果非常明显

1.万级 List、大 DTO 列表、批量临时数据

2.全部在新生代分配、新生代 YGC 快速回收

3.不会进驻老年代、不会堆积、不会造成老年代压力

但有 3 个硬限制（无法完美解决）：

限制 1：新生代内存有上限

我们的-Xmn不可能无限加大；

如果单次接口产生几百 MB 超巨型局部对象，新生代放不下，照样会被迫晋升老年代，JVM 会自动兜底保证内存可用。

限制 2：YGC 开销会上升

所有大对象都在新生代，YGC 复制、扫描、标记压力变大；新生代越大、对象越多，单次 YGC 耗时变长，高并发下接口抖动。

限制 3：无法解决「对象存活时间过长」

如果代码有长链路、同步耗时久、方法执行很慢，局部对象存活多轮 YGC，哪怕年龄设 15，最终还是会晋升。

**

二十六、只读合集使用不可变合集

**

Collections.unmodifiableList、List.of()

禁止修改，JIT 可深度优化、内存更紧凑。

如果业务明确只读取、不修改的场景（如返回常量列表、静态配置、枚举字典、接口只读返回值等），那么我们可以强制使用不可变集合替代 new ArrayList()、new HashMap()等，进而彻底禁止增、删、改操作，从代码结构上杜绝误操作。

26.1 核心原理

（1）不可变集合是绝对线程安全，且无锁

*   普通集合（ArrayList/HashMap）非线程安全，高并发读写必须加锁或用 Concurrent 容器
    
*   不可变集合没有写操作，天然线程安全，完全无锁竞争、无 CAS 开销、CPU 占用极低
    

（2）内存结构极致紧凑，无冗余空间

*   普通集合为了扩容，会预留**空闲数组位置**（浪费内存）
    
*   不可变集合创建时大小固定，内存 100% 利用率，无扩容、无空槽、无内存浪费
    

（3）JIT 编译器深度优化

*   不可变 = 数据永远不变
    
*   JVM 可以做常量折叠、激进优化、缓存命中优化
    
*   访问速度比普通 List 快 15%~35%
    

（4）杜绝意外修改，避免并发问题

*   防止业务代码误调用 add/remove/clear 导致数据错乱、并发异常  
    
*   防止返回的集合被外部篡改，保证数据安全
    

（5）降低 GC 风险

*   固定大小，永不扩容，无数组拷贝  
    
*   无中间临时对象，GC 压力极小
    

26.2 实现方式

JDK 原生推荐写法（JDK 9+）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

26.3 注意事项

（1）不可变集合，绝对不能增删改调用add()/remove()/clear() 会直接抛 UnsupportedOperationException

（2）JDK 的 Collections.unmodifiableList 只是「伪不可变」原集合变，它也变，不推荐用于高性能底层编码

（3）不可变集合禁止存放 nullList.of(null) 直接抛 NPE

（4）适合静态数据、配置数据、常量数据运行时频繁变化的数据不要用

（5）创建后大小固定，不能扩容一次性装载所有数据

### **26.4 示例代码**

示例 1：错误 —— 只读场景用可变集合（不安全、耗性能）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最优 —— 只读场景用不可变集合（安全、高性能）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**示例 2**：错误 —— 伪不可变（不推荐）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**示例 3**：最优 —— 不可变 Map（配置 / 字典专用）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

二十七、循环条件不要做复杂计算

**

循环for / while / do-while的判断条件、边界取值中，禁止放入复杂方法调用、集合取值、计算、数据库 / IO、正则、序列化等耗时逻辑；提前把结果缓存为局部变量，循环内只做简单比较判断，减少 CPU 重复运算。例如如下代码：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

27.1 核心原理

（1）for(初始化; 条件判断; 步进)

*   其中条件判断代码，每次循环迭代都会执行一次。如上面代码所示。
    

（2）复杂计算开销会被循环次数无限放大

*   单次计算开销很小，循环一万 / 十万次，CPU 损耗指数级放大，抢占时间片、升高 CPU 负载。
    

（3）避免重复 IO、重复反射、重复集合遍历、重复字符串操作

*   这类重型操作放在循环条件，会产生巨额冗余开销，同时伴随临时对象大量创建、GC 压力上升。
    

（4）利于 JIT 编译器优化

*   固定局部变量判断，可被 JIT 做循环展开、常量优化、寄存器缓存；动态计算条件无法被优化，始终走完整执行链路。
    

27.2 示例代码

**示例 1**：严重错误 —— 循环条件放复杂方法 / 查询

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

放到循环里面的远程调用、SQL 查询、复杂业务逻辑 无限次重复执行，CPU、网络、DB 直接打满。

改成如下方式：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**示例 2**：条件中嵌套多层取值 + 计算

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

二十八、包装类缓存范围外，手动缓存

**

包装类（Integer、Long、Short、Byte等）默认只缓存小范围常用值（如 Integer 缓存 -128 ~ 127）；超出这个范围的值，每次都会 new 新对象，造成频繁对象创建、GC 飙升、内存占用增加。在高并发、高频使用超出缓存范围的数值时，手动构建缓存池，重复使用对象实例，杜绝重复创建。

包装类默认缓存范围： 

包装类

默认缓存范围

Integer

**\-128 ~ 127**

Long

**\-128 ~ 127**

Short

**\-128 ~ 127**

Byte

全部（-128~127）

Character

0 ~ 127

28.1 核心原理

1.用 HashMap / ConcurrentHashMap 做缓存池

2.用 valueOf() 风格统一入口获取实例

3.不存在则创建，存在则直接返回

4.高并发用线程安全缓存

5.配合静态常量、枚举、单例缓存使用效果最佳 

28.2 注意事项

1.**只缓存高频使用的值**，不要缓存无限范围（避免内存暴涨）

2.高并发必须用**线程安全缓存**（`ConcurrentHashMap）`

3.不要手动 `new Integer()`，必须走缓存方法

28.3 代码示例

**示例 1**：错误 —— 高频使用超出缓存范围的值，疯狂创建对象

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化 —— 手动缓存包装类对象

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

使用方法：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

可以构建通用的缓存工具：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

二十九、复用异常对象，不要频繁 new Exception

**

不要在循环 / 高并发接口内频繁 `**new Exception()**`**、**`**new RuntimeException()**`；

提前全局初始化**单例异常对象**，全局复用，减少临时对象创建、降低新生代 GC 与内存开销。

29.1 核心原理

（1）每次 new 异常 = 新建对象 + 捕获堆栈信息

*   new Exception() 底层会主动执行：fillInStackTrace()  
    
*   遍历栈帧、收集方法调用链路  
    
*   产生大量临时栈信息对象  
    
*   内存分配、CPU 栈遍历开销极高
    

（2）异常属于不可变数据，天然可复用

*   固定错误码、固定描述的业务异常，字段不会动态修改，完全支持全局单例复用。
    

（3）高并发 + 循环下，new 异常会被无限放大

*   每秒上千次抛业务异常、参数校验异常，会疯狂创建短命异常对象，Eden 区迅速填满 → 频繁 YGC → CPU 抖动、接口 RT 升高。
    

（4）堆栈采集是性能元凶，影响非常大

*   90% 业务自定义异常、已知可预期异常，不需要完整堆栈日志，复用全局异常，可直接省去堆栈采集的昂贵开销。
    

29.2 实现方式

1.把**固定文案、固定错误码**的业务异常，声明为 `static final` 全局单例；

2.全局统一异常常量池，统一对外抛出；

3.可预期业务异常：关闭堆栈填充，进一步提效；

4.禁止在 for/while、if 分支、高频接口内部 `new 异常`。

29.3 注意事项

（1）系统未知崩溃异常（空指针、数组越界）不能复用这类异常必须每次 new，依赖堆栈定位问题；

（2）复用异常仅适用于：业务可预期异常、固定错误提示、码值异常；

### **29.4 示例代码**

****示例 1**：错误写法 —— 高频频繁 new 异常，单次开销小，QPS 上万时，瞬间生成成千上万个异常对象，GC 压力暴增。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**优化写法：全局仅 2 个异常实例，**零新建对象、零堆栈重复采集、无 GC 负担**。**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**推荐将业务异常的堆栈进行关闭，性能是最高的：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**

三十、关闭非必要堆栈打印

**

若需要打印日志，建议只需要打印**错误码 + 错误信息**即可，关闭 `printStackTrace()`、关闭 `fillInStackTrace()`、关闭日志全栈打印，从而**节省大量 CPU、减少 IO、降低 GC、提升接口性能。**

（1）打印堆栈的影响：极其消耗CPU操作，例如`e.printStackTrace()` 或日志打印 `error(e)` 底层会：

1.遍历整个**线程栈帧**

2.递归获取每一层方法名、行号、类名

3.拼接成巨大字符串

4.输出到控制台 / 磁盘文件

**这是重量级操作，比普通业务逻辑慢 10~100 倍！**

（2）异常创建时 fillInStackTrace () 开销巨大`new Exception()` 会默认调用：

```
public synchronized Throwable fillInStackTrace()
```

这个方法会**完整捕获当前线程栈**，高并发下非常耗 CPU。所以基于上面的案例，我们可以将业务异常的堆栈进行关闭，性能是最高的。

**

三十一、缩小 try-catch 范围

**

`try-catch` 代码块**只包裹真正可能抛出异常的代码**，**不要把大量无关业务逻辑、循环、赋值、计算逻辑包裹进去**。目的是让**异常边界清晰、JIT 优化更高效、减少栈监控范围、避免性能隐性损耗**。

31.1 核心原理

（1）JVM 对 try 块内代码优化受限

*   禁止部分寄存器优化
    
*   禁止部分指令重排
    
*   禁止部分方法内联
    
*   栈帧需要保留更多上下文信息
    

try 块越大 → 优化越少 → 代码运行越慢

（2）异常捕获范围越大，越容易 “吃掉” 未知异常

把大量代码放进一个大 try 里：

*   未知错误（空指针、数组越界）被误捕获
    
*   问题被隐藏
    
*   排查难度指数级上升
    

（3）try 块越大，异常发生时 JVM 需要遍历的栈信息越多。以及维护成本升高，不知道那行会抛出异常

31.2 示例代码

如下面所示， 超大 try 块，包住大量无关代码

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这会导致JIT 无法优化整个方法 → 性能下降，以及空指针、参数错误都会被误捕获 → 难以排查

优化后如下：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

三十二、位运算替代加减乘除取模

**

在**对 2 的整数次幂（2、4、8、16、32...）** 进行乘、除、取模（%）计算时，使用**位运算（<<、>>、>>>、&）** 直接操作二进制，替代传统的 `*、/、%`，从而**将 CPU 指令从数十个周期降到 1 个周期**，极致提升计算速度。

32.1 核心原理

CPU 天生只认识二进制

*   加减乘除是复杂运算，CPU 需要调用算术逻辑单元，多步骤转换，耗时10~30 个时钟周期。
    
*   位运算是电路级直接操作，直接移位、与或非，1 个时钟周期完成。
    
*   速度差距：10 ~ 30 倍！
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

三十三、正则 Pattern 全局静态化

**

Pattern.compile 预编译，不要循环内重复编译正则。

正则 Pattern 必须定义为 static final 全局静态常量，不能在方法内重复创建。

目的是避免高并发 / 循环场景下，反复编译正则表达式导致CPU 飙升、性能急剧下降。

每次new Pattern都做一次重型 CPU 运算，高并发下CPU会直接打满。

实现方式：

1.在类中定义 static final Pattern 常量

2.一次编译，全局使用

3.方法内只使用 pattern.matcher(str).matches()

示例 1：错误 —— 方法内重复 compile（性能非常差）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化为：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

三十四、减少内存对齐浪费

**

这个知识点是最近刚学的，之前也不清楚，很震惊竟然还有这种效果。

**在对下中，对象的多个成员字段排列顺序不合理，会产生大量无效填充字节**，造成内存空间浪费、堆占用变大、GC 扫描压力上升。**通过手动优化字段声明顺序，压缩对象整体大小，减少内存对齐冗余浪费。**

34.1 核心原理

（1）关键基础规则

1.JVM 默认开启压缩指针（JDK8 默认 -XX:+UseCompressedOops）

2.对象内存结构：对象头(12B) + 实例数据(字段) + 对齐填充Padding(补到8的整数倍)

3.内存对齐规则：基本类型、引用类型按自身字节数对齐；整个对象最终大小必须是 8 字节的整数倍，不足则自动补空白 Padding。

（2）各类型占用字节（压缩指针下）

类型

字节

long/double

8

int/float

4

short/char

1

byte/boolean

4

对象引用

2

（3）浪费资源

字段**乱序声明** → 小字段、大字段穿插排布 → 中间产生大量对齐空隙、末尾额外补位。

内存浪费 = 无效 Padding 变多 → 同等业务数据，占用堆更大。

（4）连锁负面影响

*   单个对象体积变大 → 整体堆水位升高
    
*   新生代容纳对象变少 → YGC 变频繁
    
*   GC 标记、遍历、复制成本升高。
    

高并发批量对象场景，内存放大效应明显

### **34.2 正确的排布顺序**

从大到小依次排列，同宽度类型连续扎堆

固定顺序：

1.long、double （8B）

2.int、float （4B）

3.引用类型（Object、DTO、集合 4B，引用类型）

4.short、char （2B）

5.byte、boolean （1B）

核心逻辑：大块在前、小块扎堆在后，减少交错空隙，最大限度消除填充占位。

34.3 实现方式

1.实体、DTO、BO、业务上下文对象，严格按「大→小」顺序声明字段；

2.同字节宽度字段连续写在一起，不要穿插混用；

3.禁止随意打乱字段顺序、零散定义小字段；

4.核心高频小对象、批量传输 DTO、缓存对象，优先做内存对齐优化；

5.可借助 `JOL` 工具查看对象实际占用，验证优化效果。

34.4 示例代码

**（1）场景：同一个实体，不同字段顺序，占用差距明显**

错误写法：乱序排布，大量内存填充浪费

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

大小字段交错，中间频繁触发对齐补位，末尾还要补全 8 倍数，**无效内存浪费严重**。

优化后：按「从大到小」规范排序

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

同宽度字段连续排布，空隙极少，末尾填充量降到最低，**单个对象内存显著缩小**。

**

三十五、判断时常量放前面

**

在 equals 比较中，常量（字面量）永远非空，将其置于判断前方，可安全调用方法；

即便后方变量为 null，方法也会返回 false 而非抛出空指针，实现防御性编程。

按照下面方式进行规范：

*   字符串比较："字面量".equals(变量)
    
*   枚举比较：枚举.常量.equals(变量)
    
*   常量比较：CONSTANT.equals(变量)
    
*   禁止：变量.equals(常量)
    

**

三十六、批量处理性能更优

**

**绝大多数场景下，批量处理性能远优于单个循环处理（例如List的move和moveAll）**；仅当数据量极小、批量封装开销大于执行开销时，两者差距可忽略。下面以List的move和moveAll举例**：**

**36.1 核心原理**

**1\. 性能差距的根本原因

性能瓶颈主要来自 IO 交互、锁竞争、方法调用开销、上下文切换、网络 / 数据库往返，批量处理正是从这几点优化：

（1）减少交互次数（最核心）

若操作依赖外部资源（数据库、缓存、文件、远程接口、队列）：

*   单个 move：每一条数据触发一次独立请求 / IO / 事务，多次往返带来巨大网络耗时、连接创建、协议解析、事务提交开销。
    
*   批量 moveAll：一次交互处理多条数据，把 N 次往返压缩为 1 次，几何级降低耗时。
    

（2）降低方法调用 & JVM 栈开销

循环调用单条 move 会产生大量方法入栈 / 出栈、参数拷贝；批量接口合并逻辑，减少高频小方法调用。

（3）锁与并发开销

资源通常加全局 / 分段锁：

*   单条执行：每条都要反复加锁、释放锁，高并发下锁竞争激烈。
    
*   批量执行：一次加锁，处理整批数据，锁竞争次数大幅减少。
    

**（4）内存 & 数据拷贝**

批量接口统一封装集合数据，减少零散对象创建、临时变量分配，提升内存利用率与 GC 效率。

**2\. 两种模式适用边界**** 

*   大数据量（百条 +）：moveAll 优势极其明显。
    
*   极小数据量（1~10 条）：批量需要封装集合、参数序列化，批量封装开销 > 交互节省开销，两者性能基本持平，甚至单条略快。
    
*   超大数据量（万条 +）：不能一次性全量批量，需分批批量（分片 + 批量结合）。——禁止超大批次：数据库、网络、序列化、内存都有上限。
    

**36.2 一些处理说明**

**1\. List 的 move、moveAll：

纯内存 List 操作：差距主要来自循环遍历、数组拷贝次数。ArrayList 底层是数组，单条移动会多次触发数组元素移位；批量移动可一次性计算偏移量、统一移位，减少底层数组操作次数。

2\. List 的add、addAll

单条 add 多次触发 System.arraycopy、扩容判断；addAll 一次性计算容量、一次扩容、一次数组拷贝，性能大幅提升。

3\. List的contains /containsAll

（1）仅使用原生 ArrayList 时：外部循环 contains 和 containsAll性能几乎无区别；

*   原生 AbstractCollection 的默认实现，内部依然是遍历入参集合，逐个调用本类 contains()。从代码看，基础版 containsAll 和外部循环调用 contains 逻辑完全一致，时间复杂度同样 O(M\*N)
    

（2）Set 系列、LinkedHashSet、HashSet 重写了 containsAll，性能发生质变：

*   HashSet.contains() 底层是哈希表，查询复杂度 O(1)；
    
*   因此 HashSet.containsAll 整体复杂度变为 O(M)。
    

若需要批量判断包含关系，可以先把原 List 转为 HashSet，再调用 containsAll

**

```
List<String> srcList = ...;
```

**具体是否需要转换还需要根据数据集合大小来判断，建议大家先测试验证。**

**4\. Map：单条操作（put）& 批量操作（putAll）

（1）循环调用 put ()

执行链路：

初始化空表 → 插入元素 → 达到阈值 → 第一次 resize（数组扩容 + 重哈希）→ 继续插入 → 再次达阈值 → 第二次 resize→ 反复多次扩容，直到容纳所有数据。

开销点：

*   多次 resize：数组新建、元素重新哈希、节点迁移（HashMap 重量级操作）；
    
*   频繁阈值判断，循环内分支判断增多。
    

（2）调用 putAll ()

执行链路：

统计总元素数 → 一次性扩容至合适容量 → 遍历写入所有元素 → 无中途扩容。

优化点：

*   仅 1 次扩容，彻底规避多次重哈希开销；
    
*   整体循环层级更少，方法调用栈更精简。
    

（3）时间复杂度

*   纯算法层面：两者均为 O (M)（M 为元素数量）；
    
*   实际运行耗时：putAll 远优于循环 put，核心差距就是 扩容次数。
    

**

**

结语

**

本文提到的内容较多，大家日常编码时的每行代码都可能会影响生产的性能和CPU消耗，敬畏每行代码。

希望本系列文章对大家有所帮助，也非常欢迎小伙伴能够随时沟通、相互交流学习。至此**「打造高性能、低CPU消耗系统——36种编码实战技巧**」系列全部完成。

推荐阅读

[打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502917&idx=1&sn=f76ad9d10206f812387a57c83a8f377a&scene=21#wechat_redirect)

[【大促备战】存储性能优化篇--从异构同步到链路解耦的 JES 治理实战](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502616&idx=1&sn=b59e359170c65256a3d3815bc98739ae&scene=21#wechat_redirect)

[从代码托管到 AI 能力底座：京东代码库的转型](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502469&idx=1&sn=f4f3a9ce97561612a1dbebe59ab3986a&scene=21#wechat_redirect)

[抽丝剥茧探穷境！一次数据库JSON字段的深度使用实践](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502251&idx=1&sn=7d547d3ad44b6a64ddf6393512e69f55&scene=21#wechat_redirect)

**关注我们**