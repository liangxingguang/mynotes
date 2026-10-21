---
title: 打造高性能、低CPU消耗系统—36种编码实战技巧（上篇）
source: 京东云开发者（微信公众号）
source_url: https://mp.weixin.qq.com/s/B-IPbwcQr3yp8_BJMKvdbA
source_type: article
platform: 微信公众号
captured: 2026-10-14
registered_at: 2026-10-21
inbox_ref: Archive/2026-10-14-high-perf-low-cpu-coding-tips-part1.md
---

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

**本文导读**

本系列文章**基于黄流百万 QPS 高并发系统实战经验沉淀**，内容涵盖**36种**编码注意事项，**100+**种具体案例，聚焦高性能、低CPU消耗的代码编写，大家可逐一和自己系统代码进行对比，无论是日常开发还是系统调优，都能从中获得实用指导，可将其作为常备的参考手册，作为一部**百科全书**来使用。

本篇为系列上篇，介绍前18种编码，大家可先点赞、收藏并关注，后续慢慢阅读学习。

特殊说明：本文及本系列文章，适用于有性能痛点，追求高并发，高吞吐量，高性能的场景；若无这方面诉求，建议优先考虑系统和代码的可读性和可维护性。

**

一、减少**数据类型转换**

**

在底层编码、接口传输、数据存储、逻辑计算过程中，**尽量保持数据类型统一、一致、不变更**，避免频繁在「数字↔字符串↔字节↔对象↔枚举」之间互相转换，降低无效 CPU 消耗、内存拷贝、GC 压力与解析错误。

减少数据类型转换，是通过**统一全链路数据类型、禁止无意义格式化、禁止循环内转换、使用原生类型计算**，从编码底层减少 CPU 解析、内存拷贝、GC 与异常风险，是高并发系统**最轻量化、最直接、最有效**的性能优化手段。

### **1.1 核心原理**

**（1）减少 CPU 指令开销**

类型转换本质是**内存解析、格式重算、字节重组**，每一次转换都消耗 CPU；越少转换，计算越快。

**（2）减少内存对象创建**

字符串转数字、数字转对象、字节转结构体，都会**创建临时对象**，引发频繁 GC，高并发下直接卡顿。

**（3）统一数据模型**

传输、存储、计算使用**同一套数据类型**，避免跨层、跨服务、跨组件重复转换。

**（4）降低错误率**

类型转换是**空指针、格式异常、精度丢失、溢出、乱码**的高发区，减少转换 = 减少故障。

**（5）贴合 CPU 漏斗模型**

把不必要的解析、转换、格式化全部砍掉，让底层计算轻量化，是**编码级别降低 CPU**的核心

**1.2 实现方式**

**（1）全链路统一数据类型**

*   **接口传输、数据库存储、内存计算、缓存存储 使用同一种类型**
    
*   **例如：ID 统一用 Long，不混用 String + Long**
    
*   **状态统一用 Integer / 枚举，不混用字符串**
    

**（2）禁止无意义格式化与转换**

*   **禁止数字转字符串只为打印、拼接、日志**
    
*   **禁止字符串转数字只为判断大小**
    
*   **禁止字节数组反复转字符串**
    

**（3）底层计算使用原生类型**

*   **计算密集逻辑使用 long、int、double 等基本类型，不使用包装类反复拆箱装箱**
    
*   **禁止循环内做类型转换（高耗 CPU）**
    

**（4）缓存 / 存储直接存原始类型**

*   **Redis 直接存数字、哈希、二进制，不序列化为 JSON 字符串再反复解析**
    
*   **本地缓存存对象，不转字符串再转回对象**
    

**（5）序列化 / 反序列化只做一次**

*   **接口入口只做一次 DTO 解析**
    
*   **内部传递使用原始对象 / 原始类型，不层层转换**
    

**（6）枚举 / 状态机使用数字类型，不使用字符串**

*   **状态判断、逻辑分支使用 int 类型，速度远高于字符串比对**
    

**1.3 注意事项**

**（1）禁止在循环、高频调用的方法内做类型转换**

*   **循环里的String→Long Long→String 是CPU 杀手，高并发下直接打满。**
    

**（2）避免隐式转换带来的精度丢失**

*   **long → int double → long会出现溢出、精度丢失，必须统一类型。**
    

**（3）RPC 接口必须明确类型，不使用泛型混用**

*   **跨服务类型不统一，会导致大量 parseLong、valueOf转换。**
    

**（4）符串类型是 “转换之王”，尽量少用**

*   **字符串参与计算、判断、比对，都必须先转类型，虽然最方便，但是能不用就不用。**
    

**（5）高并发场景禁用包装类自动拆装箱**

*   **Long num = 100L; if(num > 0) 会隐式转换，产生临时对象，增加 GC。**
    

**（6）兼容老系统时做一层统一适配，不内部层层转换**

*   **对外兼容类型转换，对内保持纯净类型，避免内部逻辑污染。**
    

### ****1.4 落地经验****

****案例一：ID 类型统一****

**不好的写法：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

****问题**：String → Long → String 来回转换，造成CPU压力增大**

**应该改成：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**这种方式可以减少2次类型转换**

****案例二：状态 / 枚举类型****

**不好的写法：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**问题：每次都用字符串判断，逻辑复杂且速度慢**

**应该改成**

```
int status = 1;
```

**数字比对比字符串快 10~100 倍。**

****案例三：循环内禁止类型转换****

**不好的写法：**

```
for(String idStr : idList){
```

**问题：循环内进行类型转换，极大的浪费CPU以及空间，产生大量垃圾**

**应该改成：**

```
List<Long> idList = getIds(); // 统一转一次
```

****案例四：缓存减少无意义转换****

**不好的写法：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**问题：将对象和字符串来回转换，造成垃圾及CPU消耗**

**可以改成（将上面两次的序列化转变成1次）**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**或者采用更好的序列化方式，例如Kryo/Protobuf；真实场景使用哪种方式，还需要大家自行压测验证，例如下面是笔者团队小伙伴验证结果：**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

**案例五：基本类型计算，避免拆箱装箱**

不好的写法：

```
Long amount = 100L;
```

问题：拆箱装箱过程也会产生垃圾和消耗CPU

应该改成

```
long amount = 100L;
```

**

二、越简单的类型越好

**

在底层编码、数据传输、内存存储、逻辑计算中，优先使用最简单、最底层、最原生的数据类型（数字、布尔、字节），尽量不用复杂类型（对象、集合、长字符串、嵌套结构）来承载简单业务含义。简单类型具备更好的性能，更低的CPU消耗，更小的GC垃圾，以及具备更好的稳定性。

越简单的类型越好，是底层编码高性能的核心原则：优先使用原生数字、布尔、固定长度类型，拒绝字符串、复杂对象、动态结构、嵌套集合；用最小内存、最少 CPU 指令、最低 GC 成本完成业务逻辑，从编码根源实现轻量化、高效率。2.1、核心原理

（1）简单类型内存占用极小

*   数字、布尔是固定大小、连续内存，对象 / 字符串需要额外头部、引用、扩容空间。
    

（2）简单类型计算效率最高

*   CPU 原生支持数字运算，无需解析、无需拆箱、无需遍历、无需寻址，指令数极少。
    

（3）简单类型无 GC 压力

*   基本类型（int/long/boolean）直接存在栈上，不产生垃圾，高并发下最稳定。
    

（4）简单类型传输 / 存储成本最低

*   数字比字符串、JSON 小几倍到几十倍，网络 IO 与存储 IO 大幅减少。
    

（5）符合 CPU 漏斗核心思想

*   用最简单的计算结构完成业务，砍掉一切多余封装、多余结构、多余解析，让 CPU 只做核心运算。
    

2.2 实现方式

（1）能用数字，不用字符串

*   状态、类型、开关、ID、枚举 全部用 int/long，拒绝用 String 表示。
    

（2）能用基本类型，不用包装类

*   计算、判断、循环内部 优先使用 long/int/boolean，避免包装类（Long/Integer）拆箱、装箱、空指针。
    

（3）能用单个变量，不用集合

*   单个状态不用 List/Map，单个值不用 JSON 对象。
    

（4）能用布尔，不用数字 / 字符串

*   真假判断直接用 true/false，不用 1/0、Y/N、on/off。
    

（5）能用固定类型，不用动态 / 泛型

*   固定结构数据，不使用复杂对象、嵌套对象、动态属性。
    

（6）能用常量，不用变量 / 配置

*   固定不变的状态值，直接用常量，不做动态加载。
    

### **2.3 注意事项**

**（1）简单类型必须配套注释 / 枚举**

*   数字无业务语义，必须用枚举管理，避免魔法值，提升可读性。
    

**（2）禁止过度简化导致业务模糊**

*   简化类型≠简化业务，复杂业务结构仍需对象，但**关键字段必须简单化**。
    

**（3）高并发核心链路强制简单化**

*   秒杀、下单、扣款核心方法内，**禁止任何复杂类型、复杂结构**。
    

**（4）跨服务接口保持类型简单**

*   RPC/HTTP 接口尽量传数字、简单 DTO，**不传大对象、复杂集合**。
    

**（5）字符串是 “复杂类型重灾区”**

*   字符串解析、截取、匹配、格式化都极耗 CPU，**能不用就不用**。
    

**（6）兼容场景做外层适配，内部保持极简**

*   对外兼容字符串 / 复杂结构，对内服务全部转为极简类型。
    

### **2.4 落地经验**

**案例一：状态判断**

不好的写法：

```
String status = "WAIT_PAY";       // 字符串
```

**问题**：复杂类型，耗CPU、耗内存

应该改成：

```
int status = 1;                   // 数字（最简单）
```

采用极简类型，简单，且高性能

或者改成：

```
int status = OrderStatus.WAIT_PAY; // 枚举数字
```

这种方式兼顾简单和可读性高

**案例二：开关判断**

不好的写法：

```
String flag = "Y";
```

**问题**：判断尽量减少使用字符串

应该改成：

```
boolean flag = true;
```

判断语句采用boolean最合适

**案例三：用户ID号**

不好的写法：

```
String userId = "1001";
```

**问题**：存在类型转换，消耗CPU高

应该改成：

```
long userId = 1001; // 直接原生数字
```

**案例四：缓存存储**

不好的写法：

```
redis.set("key", "{\"status\":1,\"userId\":1001}"); // JSON字符串
```

**问题**：过于复杂，占用空间大，性能差

应该改成：

```
redis.set("key", 1); // 只存最简单数字
```

采用最简单的类型即可。可以使用数字和字符串进行映射。

**案例五：核心方法计算**

不好的写法：

```
public Result calc(UserDTO dto){
```

```
问题
```

应该改成：

```
public Result calc(long userId, int status){
```

```
采用最简单的类型，性能快，无GC
```

**

三、减少字符串拼接

**

在底层编码、日志打印、接口返回、缓存构建中，避免大量使用 +、+= 进行字符串拼接，改用高性能拼接工具，同时从业务上减少不必要的字符串组装，降低 CPU 消耗、内存拷贝与 GC 压力。

减少字符串拼接，可以利用**String 不可变导致拼接产生大量临时对象**的特性，通过**StringBuilder、日志占位符、避免循环拼接**等方式，降低内存拷贝、CPU 消耗与 GC 频率，从底层编码层面提升高并发场景下的系统稳定性与运行效率。

### **3.1 落地经验**

（1）字符串不可变性

*   String是不可变对象，每次 + 拼接都会创建新字符串对象，产生大量临时垃圾，触发频繁 GC。
    

（2）减少内存拷贝

*   普通拼接会多次复制字符数组，StringBuilder仅一次扩容、一次拷贝，效率提升百倍。
    

（3）降低 CPU 指令开销

*   拼接、扩容、复制都是 CPU 密集操作，高并发下极易打满 CPU。
    

（4）贴合 CPU 漏斗模型

*   字符串操作是高耗 CPU、低业务价值的运算，必须在上层 / 编码层减少、优化，不让无效拼接占用核心业务 CPU 资源。
    

### **3.2 实现方式**

**（1）禁止在循环内使用 + 拼接字符串**

*   循环中  **+**  会创建大量临时对象，是**CPU/GC 第一杀手**。
    

**（2）批量 / 复杂拼接统一使用StringBuilder**

*   非循环、简单拼接可 +，但**多行、多变量、循环、高频方法**必须用`StringBuilder`。
    

**（3）日志打印采用占位符，避免拼接**

*   使用 **{}占位符**，日志关闭时不会执行拼接，无性能损耗。
    

**（4）尽量直接返回原始类型，不组装字符串**

*   能返回 Long/int 就不返回String，能不拼接就不拼接。
    

**（5）静态文本直接定义常量**

*   固定字符串直接用`final static`，不运行时拼接。
    

**（6）大文本、模板使用组件化拼接**

*   如 JSON、报文，使用专门工具，避免手写拼接。
    

### **3.3 注意事项**

**（1）循环内绝对禁止 + 拼接**

*   这是高并发系统最常见的性能死穴。一定要额外注意。
    

**（2）StringBuilder初始化指定容量**

*   不指定会自动扩容，多次内存拷贝，损耗性能。
    

**（3）日志打印严禁提前拼接**

*   错误写法：`logger.debug("user:" + userId)`; 尽量采用占位符的方式。
    

**（4）高并发方法、核心入口方法严控拼接**

*   秒杀、下单、扣款核心方法**零字符串拼接**。
    

**（5）多线程下不要共享StringBuilder**

*   线程不安全，必须方法内局部使用。
    

**（6）不要过度优化**

*   简单单行拼接"a"+"b"无需优化，JVM 会自动优化。
    

### **3.4 落地经验**

**案例一：循环内拼接**

不好的写法：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**问题**：极大的消耗CPU，以及GC会爆增

应该改成：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**案例二：日志打印**

不好的写法：

```
log.debug("用户ID：" + userId + "，订单ID：" + orderId);
```

**问题**：这种方式，无论日志的级别是什么，都会拼接字符串

应该改成：

```
log.debug("用户ID：{}，订单ID：{}", userId, orderId);
```

只有日志生效时才会拼接

**案例三：高频字符串拼接**

不好的写法：

```
public String getKey(Long userId) {
```

**问题**：高频调用下损耗较大

应该改成：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

字符串拼接采用StringBuilder，并设置好初始容量值大小

**案例四：多变量复杂拼接**

不好的写法：

```
String key = type + ":" + id + ":" + status;
```

应该写成：

```
String key = new StringBuilder()
```

**案例五：静态常量不需要拼接**

不好的写法：

```
public static final String KEY = "user" + ":" + "info";
```

应该改成：

```
public static final String KEY = "user:info";
```

**

四、减少相同数据多次调用

**

在**同一请求、同一方法、同一周期内**，对**完全一样的数据 / 查询结果 / 返回值**，只获取一次、缓存复用、多处使用，**禁止重复查库、重复调 RPC、重复计算、重复解析**，是从根源降低 IO、网络、CPU 与内存开销。

通过**局部变量、请求缓存、本地缓存、批量查询、结果缓存**等方式，让**同一份数据只获取一次**，消除重复查询、重复调用、重复计算带来的 CPU、IO、GC 浪费，是底层编码最直接、最有效的性能优化手段。

### **4.1 核心原理**

**（1）消除重复无效计算**

*   同一份数据多次获取 = 多次 IO、多次网络、多次序列化，属于纯浪费。
    

**（2）降低下游压力**

*   重复 DB、RPC 调用会放大下游负载，高并发下极易造成雪崩。
    

**（3）减少对象创建与 GC**

*   每次调用都会新建结果对象、集合、DTO，大量临时对象拉高 GC。
    

**（4）缩短接口 RT**

*   一次查询耗时 30ms，重复 3 次就变成 90ms，复用直接回到 30ms。
    

**（5）贴合 CPU 漏斗模型**

*   把重复、冗余、无效的计算在**方法内 / 上层**消化掉，不让下游承担多余压力
    

### **4.2 实现方式**

**（1）方法内复用：局部变量缓存（最常用）**

*   同一方法内多次使用的数据，**只调用一次，存局部变量**，后续直接用。
    

**（2）请求级别复用：**`ThreadLocal / RequestContext` **缓存**

*   同一个用户请求内，跨方法、跨类需要的数据，在请求入口查一次，全链路复用。
    

PS：其实笔者非常不建议使用**ThreadLocal**，反而建议大家使用全局Context

**（3）本地缓存复用（Caffeine/K-V Map）**

*   一段时间内不变的数据（配置、字典、用户基础信息），**内存缓存，过期刷新**。
    

**（4）分布式缓存复用**

*   跨服务、跨实例共享的数据，查缓存，不查 DB。
    

**（5）批量查询替代循环单查**

*   循环里禁止 N 次单条查询，改为**一次批量查询**，内存中匹配复用。
    

### **4.3 注意事项**

**（1）必须保证复用的数据是一致的**

*   同一请求内允许复用；跨请求、跨周期必须注意**数据时效性**。
    

**（2）禁止在多线程下无控制复用**

*   线程间数据隔离，必须用 ThreadLocal 或线程安全容器。
    

**（3）不能复用已被修改 / 过期的数据**

*   更新数据后必须**清除本地缓存**，否则出现脏数据。
    

**（4）循环内严禁重复调用**

*   循环里查库、调 RPC 是高并发第一性能杀手。尽量减少该类操作。
    

**（5）区分 “相同数据” 与 “不同场景数据”**

*   只有**入参完全一样、结果一样**才能复用。其余场景需要额外注意。
    

**（6）本地缓存设置大小与过期**

*   防止内存暴涨、数据陈旧。
    

### **4.4 落地经验**

**案例一：**方法内多次查询——局部变量复用

不好的写法：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**问题**：多次调用，浪费性能

应该改成：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一次查询，多处复用

**案例二：**循环内多次单查 → 批量一次查询 + 内存复用

不好的写法：

```
for(Long orderId : orderIdList){
```

**问题**：循环 N 次 DB 查询

应该改成：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

一次批量查询，内存复用

**

五、多次判断拆分，快速失败

**

多次判断拆分，快速失败是将复杂校验拆分为有序、独立、前置的条件判断，让非法请求、错误参数、异常场景尽早终止执行，减少无效运算、降低资源浪费、提升代码可读性与系统吞吐量，是底层编码高性能、高健壮性的很好的手段。

5.1 核心原理

（1）减少无效代码执行

*   不符合条件的请求，越早终止，浪费越少，避免执行无用的参数封装、RPC、查询、计算。
    

（2）降低资源占用

*   快速失败能提前释放线程、连接、内存、句柄，不让非法请求占用系统资源。
    

（3）逻辑更清晰，维护更简单

*   拆分判断，代码扁平化，无深层嵌套，可读性、稳定性大幅提升。
    

（4）提升系统吞吐量

*   无效请求快速失败，减少 CPU 浪费，让资源集中处理有效请求。
    

（5）贴合 CPU 漏斗模型

*   把校验、拦截、判断全部放在方法最前端，无效请求不进入核心计算，从源头减负。
    

5.2 实现方式

（1）校验逻辑提前，按「轻→重」顺序判断

*   先做空判断、格式判断、简单判断；后做业务判断、查询判断、RPC 判断。
    

（2）每个判断独立一行，不嵌套

*   禁止多层 if/else 嵌套，一个条件一个拦截。
    

（3）不满足条件立即 return /throw

*   不继续执行后续任何逻辑，快速退出。
    

（4）合法流程走主干，异常流程走边界

*   正常逻辑写在最外层，无缩进、无嵌套。
    

（5）禁止 “包裹式大 if”

*   严禁把所有逻辑包在一个大 if 里，造成深度嵌套。
    

（6）公共校验抽离，但仍保持快速失败

*   工具类校验失败直接抛出异常，不回返状态值。
    

5.3 注意事项

（1）判断顺序必须：先简单、后复杂

*   先做空值、格式、范围判断；最后再做 DB/RPC 校验。
    

（2）禁止把正常逻辑嵌套在 if 里

*   代码越扁平，性能越好、可读性越强。
    

（3）快速失败必须返回明确异常 / 提示

*   便于问题定位。
    

（4）多线程环境

*   多线程越早退出，越能减少锁竞争与上下文切换。
    

（5）判断不要过度拆分

*   语义相关的判断可合并，保持代码简洁不零散。
    

### **5.4 落地经验**

**案例一：**深层嵌套、效率低、难维护

不好的写法：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

应该改成：拆分判断、快速失败

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**案例二：**高并发接口，应当业务校验快速失败，而不是先RPC，后判断

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**案例三：**循环内部快速失败

```
public boolean check(List<Item> list) {
```

**

六、多次判断拆分，快速失败

**

高并发场景下数组遍历依靠连续内存、CPU 缓存命中率高、O (1) 随机访问、无迭代器开销、零 GC等特性，比链表、迭代器遍历快10~100 倍，是底层编码降低 CPU 消耗、提升循环效率的最优实践。

在底层编码、高并发核心链路、循环密集型逻辑中，优先使用数组（Array） 及基于数组实现的集合（ArrayList） 进行遍历，尽量避免使用链表（LinkedList）、迭代器、复杂集合遍历；利用数组连续内存、随机访问、无额外开销特性，提升遍历速度、降低 CPU 消耗、减少 GC 压力。

6.1 核心原理

（1）连续内存空间，CPU 缓存命中率极高

*   数组是连续内存布局，CPU 会预加载整块数据到缓存，遍历几乎不访问主内存；链表是分散内存，缓存频繁失效，速度极慢。
    

（2）O (1) 随机访问，无寻址开销

*   数组下标直接定位元素，遍历无额外计算、无指针跳转、无节点遍历；链表需要逐个节点跳转，CPU 指令数大幅增加。
    

（3）无额外对象创建，零 GC

*   数组遍历不创建迭代器对象、无包装对象、无指针开销，高并发下无 GC 压力；迭代器、链表遍历会产生临时对象，引发频繁 GC。
    

（4）遍历效率：数组 > ArrayList > LinkedList

*   高并发场景下，遍历性能差距可达10~100 倍。能直接使用数组，就尽量使用数组。
    

（5）贴合 CPU 漏斗模型

*   用最低 CPU 开销完成遍历循环，减少无效计算与缓存失效，让核心业务占用最优资源。
    

6.2 实现方式

（1）优先使用数组存储遍历数据

*   基础类型、固定长度数据，直接使用  \[ \] 数组，性能最优。
    

（2）高频遍历使用 ArrayList，禁止使用 LinkedList

*   ArrayList 底层是数组，遍历速度快；LinkedList 底层是链表，遍历极慢。
    

（3）使用普通 for 循环遍历，禁止使用迭代器 / 增强 for

*   数组、ArrayList 用下标 for 循环，不创建 Iterator 对象，无额外开销。
    

（4）遍历前确保集合是数组类型

*   非数组集合（如 LinkedList）先转为数组，再遍历。
    

（5）基础类型使用原生数组，避免包装类开销

*   long\[\] > Long\[\] > List<Long>，原生类型无拆箱、无对象头。
    

（6）高并发核心链路：遍历逻辑轻量化

*   核心接口（秒杀、下单、查询）必须使用数组遍历，禁止任何复杂集合遍历。
    

6.3 注意事项

（1）数组遍历只适合读，不适合频繁增删

*   数组 / ArrayList 插入删除性能差，只用于读多写少、高频遍历场景。
    

（2）普通 for 循环必须用常量缓存集合长度

*   循环内不要调用 list.size() ，避免重复计算。
    

（3）高并发下必须线程安全

*   数组 / ArrayList 非线程安全，遍历时禁止修改，或加锁、使用副本。
    

（4）禁止在遍历中增删元素

*   导致数组下标越界、数据异常，快速失败。
    

（5）大数据量遍历优先数组

*   万级、十万级数据量，数组遍历性能优势极其明显。
    

（6）不要为了遍历强行数组化

*   写多读少场景，使用合适集合，不盲目追求数组。数组扩展性，可维护性不如集合。
    

### **6.4 落地经验**

**举例 1**：数组 + 普通 for 循环（性能最高）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**举例 2**：ArrayList + 普通 for 循环

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例 3： LinkedList + 迭代器（**高并发禁止使用**）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例 4：高并发秒杀库存遍历

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例 5：大数据量批量匹配（数组遍历比链表快 50 倍）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**举例6：**

这里大家可能有疑问，那“ArrayList + 迭代器 性能怎样，开销如何；和ArrayList + 普通 for 循环 相比呢？”哪个性能更好：

（1）ArrayList + 普通 for 循环（下标遍历）

*   性能：最优
    
*   开销：几乎为 0
    
*   高并发核心链路：推荐使用
    

（2）ArrayList + 迭代器 / 增强 for 循环

*   性能：较好，但有额外开销
    
*   开销：创建迭代器对象 + 方法调用 + 边界检查
    
*   高并发核心链路：不推荐
    

（3）性能差距

*   普通 for 比 迭代器 快 10%~30%
    
*   循环越密集、并发越高，差距越大。
    

ArrayList 底层结构 transient Object\[\] elementData;本质就是数组 → 连续内存 → CPU 缓存友好

两种遍历方式底层执行过程

ArrayList + 普通 for 循环

```
int size = list.size();
```

**底层执行：**

1.直接访问数组下标：`elementData[i]`

2.**O (1) 随机访问**，无任何计算

3.无对象创建、无迭代器

4.JVM 可**彻底优化为原生指令**

5.几乎**无 CPU 开销、无内存开销、无 GC**

ArrayList + 迭代器 / 增强 for 循环

```
for (Object item : list) {
```

**底层执行：**

1.**创建迭代器对象**：new Itr()

2.每次循环调用：

•`hasNext()`

•`next()`

1.每次都做**边界检查、范围判断**

2.产生**迭代器临时对象**，带来 GC 压力

3.方法调用次数多，CPU 指令更多

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

七、**高并发下能用for就别使用**

**forEach、Lambda 表达式、Stream 流式遍历**

**

在高并发核心链路、循环密集型场景中，优先使用原生普通 for 循环，禁止使用集合 forEach、Lambda 表达式、Stream 流式遍历；通过减少额外对象创建、方法回调、虚拟调用、语法糖开销，最大化降低 CPU 消耗与 GC 压力。

7.1 核心原理

（1）无额外对象创建

*   原生for循环不创建任何对象；forEach + Lambda会生成函数式接口实例、迭代器、Consumer 对象，高并发下产生大量临时对象，触发频繁 GC。
    

（2）无虚拟方法调用

*   Lambda 底层是函数回调 + 动态调用，JVM 无法极致优化；普通 for 是本地指令、直接寻址，可被 JIT 完全编译为最优机器码。
    

（3）CPU 缓存与连续访问最优

*   普通 for 基于数组下标连续访问，CPU 缓存命中率 100%；forEach/Lambda 存在指针跳转、方法入栈出栈，缓存命中率大幅下降。
    

（4）无迭代器、无边界检查冗余

*   普通 for 仅一次长度计算；forEach/Lambda 自带迭代器、并发修改检查、hasNext/next 冗余调用。
    

（5）贴合 CPU 漏斗模型

*   砍掉所有语法糖带来的无效 CPU 开销，让核心计算占用最少指令周期。
    

7.2 实现方式

（1）高并发核心链路强制使用普通 for 循环

*   秒杀、下单、扣款、库存扣减、热点查询等核心方法，禁止出现 forEach、Lambda、Stream。
    

（2）禁止使用以下三种遍历（高并发禁用）

*   list.forEach(...)
    

*   list.stream().forEach(...)
    

*   for(Obj item : list)（增强 for = 迭代器）
    

（3）循环长度提前计算缓存

*   禁止在 for 条件中写list.size()，避免重复计算。
    

（4）基础数据类型优先使用原生数组

*   long\[\]、int\[\]性能远高于List<Long> + Lambda。
    

（5）批量逻辑、大数据量遍历必须用原生 for

*   十万级、百万级循环遍历，Lambda 性能损耗可达 300%~1000%。
    

7.3 注意事项

（1）高并发 ≠ 普通业务

*   普通后台接口可用 Lambda；高并发核心接口严禁使用。
    

（2）Lambda 无法被 JIT 彻底优化

*   高并发场景下，Lambda 的方法回调、动态调用是 CPU 隐形杀手。
    

（3）Lambda 会创建对象，带来 GC 压力

*   每秒 10 万 QPS，Lambda 会产生大量临时对象，引发 YGC/FullGC。
    

（4）普通 for 性能最稳，但可读性略低

*   核心性能链路优先性能；非核心链路可兼顾可读性。
    

（5）禁止在循环内使用 Lambda/forEach

*   嵌套循环 + Lambda，CPU 会直接打满。
    

（6）不要迷信 Stream 并行

*   并行 Stream 开销极大，高并发同步链路禁用。
    

### **7.4 落地经验**

**举例 1**：严禁写法 —— `forEach + Lambda`（高并发禁止）

```
// 高并发下CPU爆炸、GC飙升
```

**举例 2**：严禁写法 —— Stream + Lambda（更慢）

```
// 性能最差，高并发绝对禁用
```

**举例 3**：高并发库存校验（原生 for 实战）

#### ![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

八、减少字符串分割操作

**

在底层编码、高频循环、高并发核心链路中，尽量避免频繁使用 split()、字符串截取、正则分割、多段拆分等操作；能用下标匹配、固定截取、预先拆分、结构替代文本拆分的场景，杜绝运行时动态分割，降低 CPU 运算、内存分配、临时对象创建与 GC 开销。

8.1 核心原理

（1）分割属于高 CPU 消耗操作

*   split 底层涉及字符遍历、匹配规则校验、数组拆分、条件判断，包含大量循环与逻辑比对，计算开销远高于普通判断。
    

（2）产生大量临时对象

*   字符串分割会新建 String\[\] 数组、多个子字符串对象，高并发 + 循环场景下频繁创建短生命周期对象，加重 YGC 压力。
    

（3）正则分割开销极高

*   无参或带正则分隔符的 split，会编译正则表达式、执行规则匹配，指令复杂、耗时严重。
    

（4）破坏内存连续性，降低 CPU 缓存效率

*   拆分后生成离散子串，失去原连续内存优势，内存寻址开销增加。
    

（5）贴合 CPU 漏斗思想

*   在上层编码阶段削减低效、高耗的文本解析逻辑，不让无效字符串运算占用核心线程 CPU，保障有效业务优先执行。
    

8.2 实现方式

（1）固定格式数据，使用下标截取替代分割

*   格式固定、分隔位固定的字符串，用 substring(index) 按下标直接截取，替代 split。
    

（2）提前结构化存储，从源头避免拆分

*   原本需要拼接拆分的业务字段，改用独立字段、实体属性、数组存储，以结构代替字符串拼接拆分。
    

（3）禁止在循环、高频方法内使用 split

*   批量遍历、定时任务、热点接口循环中，完全禁用字符串分割。
    

（4）限定分隔符使用快速分割工具

*   必须拆分时，使用轻量级字符匹配工具，拒绝正则型 split。
    

（5）数据下发、缓存存储优先结构化

*   接口入参、配置项，尽量用 JSON、对象、多字段传递，不使用拼接字符串传递多参数。
    

（6）单次拆分全局复用

*   同一请求内只需拆分一次的数据，拆分后存入局部变量，多处复用，不重复分割。
    

8.3 注意事项

（1）区分普通字符分割与正则分割

*   .\*| 等特殊字符，split 默认按正则解析，开销成倍增加，必须转义或改用非正则方案。
    

（2）防止下标越界、格式非法

*   下标截取替代分割时，提前做长度、格式校验，避免字符串索引异常。
    

（3）杜绝嵌套分割、多次连续分割

*   多层拆分、反复切割字符串，会叠加 CPU 与对象开销，性能损耗放大。
    

（4）高并发核心接口严格限制文本处理

*   下单、秒杀、营销、库存等链路，尽量不含任何字符串切割、解析逻辑。
    

（5）兼顾可读性与性能

*   非高频、低 QPS 后台任务，可正常使用 split；核心性能链路必须强制优化。
    

（6）空字符串、异常格式兜底

*   拆分或截取后做空值判断，避免业务报错与空指针。
    

### **8.4 落地经验**

**举例 1**：高并发禁用 —— 频繁 split 分割（反面）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**举例 2**：优化方案 —— 固定下标截取替代分割（正向）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**举例 3**：循环内禁止 split（高危场景）

反面：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

方案：提前解析成结构化对象（最推荐、性能最高）

循环前统一解析一次，循环内直接用，不再解析

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

或者采用循环内使用 `indexOf + substring`（无 split、性能高）；如果不想建对象，就用这个：完全替代 split，无正则、无数组创建

```
for (String str : dataList) {
```

#### **举例 4**：特殊字符正则分割陷阱

```
// 反面：. 属于正则元字符，底层正则编译，极慢
```

#### **举例 5**：源头优化，用结构完全替代字符串拆分

```
// 反面：靠拼接字符串传输，后续必须分割解析
```

**

九、优化日期解析

**

日期解析、获取系统当前时间、时间加减计算均属于高频 CPU 消耗操作；

通过复用格式化器、规避重型时间对象、减少系统调用、避免频繁时区计算、复用不可变时间实例，减少内核态切换、临时对象创建、日历重计算、锁竞争，最终降低 CPU、减少 GC、压低接口 RT。

9.1 核心原理

（1）系统时间调用开销大

*   new Date()、LocalDateTime.now() 会发起系统内核调用，高频循环内反复获取，上下文切换损耗严重。
    

（2）时间格式化开销大

*   SimpleDateFormat / DateTimeFormatter  包含规则解析、日历模型、时区缓存，频繁 new 会大量占用 CPU。
    

（3）时间类线程不安全、锁开销大

*   SimpleDateFormat、Date 组合并发下错乱、加锁排队，高并发性能极差。
    

（4）时间加减本质是日历运算

*   传统 Calendar 加减需要重置年月日、闰年、大小月计算，属于重运算；JDK8 新时间 API 基于不可变结构体，纯内存轻量计算。
    

（5）贴合 CPU 漏斗模型

*   把高频、重复、重型的时间操作全局初始化、一次性计算、结果复用，不让低效时间运算挤占核心业务 CPU。
    

9.2 实现方式

场景 1：高性能日期解析（字符串→时间）

9.2.1 最优方案

*   废弃：SimpleDateFormat（线程不安全、性能差）
    
*   推荐：JDK8+ DateTimeFormatter 全局静态常量复用（线程安全、轻量、无锁）
    
*   原则：循环外解析、禁止循环内 parse、固定格式、固定时区
    

### 9.2.2 实现

```
// 全局唯一、静态、常量、线程安全
```

### 9.2.3 正反示例

错误（循环内创建、高 CPU、高 GC）

问题：

*   每一次循环都 new 格式化对象
    
*   每一条数据都在循环内执行 parse 解析
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

正确（全局复用、只解析一次）

*   格式化器全局只 new 一次，全局复用
    
*   日期解析统一放在 循环外部批次完成
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

场景 2：高性能获取当前时间

9.2.4 性能排序（由快到慢）

*   System.currentTimeMillis() 【最快，无对象、无时区、无内核重载】
    
*   Instant.now()
    
*   LocalDateTime.now()
    
*   new Date() 【最慢、创建对象、重日历初始化】
    

9.2.5 核心原理

*   System.currentTimeMillis()：直接读取系统时间戳，纯原生方法、无对象、无时区计算、开销最低；
    
*   Instant.now() 同样调用系统内核时间，但是会创建 Instant 不可变对象、封装秒 + 纳秒、携带时间戳结构，有轻微对象开销，比时间戳慢，但远优于 LocalDateTime.now()。
    
*   LocalDateTime.now()：需要绑定时区、地区、日历实例，封装对象多；
    
*   循环内频繁 now() = 频繁系统调用 + 对象创建，GC 暴涨。
    

9.2.6 最优实践

*   高并发 / 循环内，优先用时间戳 long
    
*   单次请求只获取一次当前时间，全局复用
    
*   禁止循环内反复new Date() 和 LocalDateTime.now()
    

9.2.7 代码示例

最优代码

```
// 一次获取，全链路复用
```

### 错误

```
for (XXX item : list) {
```

场景 3：高性能时间加减（加小时 / 天 / 分钟）

9.2.8 最优方案

*   废弃：Calendar 重量级加减、频繁 set/get
    
*   推荐：
    

1.时间戳 long 直接加减（性能天花板）

2.其次：LocalDateTime / LocalDate 自带 plus/minus 方法（不可变、轻量）

9.2.9 核心原理

*   时间戳是毫秒数值，加减只是纯数学运算，CPU 开销极低；
    
*   JDK8 时间类不可变，加减不会修改原对象，无并发竞争、无锁；
    
*   Calendar 可变对象，加减需要刷新日历字段、闰年校验、月份重置，计算极重。
    

9.2.10 代码示例

### **方式 1：时间戳加减（性能最强，高并发首选）**

```
long now = System.currentTimeMillis();
```

**方式 2：JDK8 时间对象加减（业务可读性强）**

```
LocalDateTime nowTime = LocalDateTime.now(SHANGHAI_ZONE);
```

老旧低效写法（禁止）

```
Calendar calendar = Calendar.getInstance();
```

### 9.3 注意事项

（1）格式化器必须全局 static fina

*   禁止方法内、循环内 new DateTimeFormatter、new SimpleDateFormat。
    

（2）统一全局时区

*   全部固定 Asia/Shanghai，禁止代码内动态切换时区，减少时区换算开销。
    

（3）循环内禁止获取当前时间

*   一次请求、一次循环批次，只取一次时间戳，复用到底。
    

（4）能使用时间戳绝不使用时间对象

*   存储、比较、过期判断，优先 long 时间戳，性能碾压所有时间对象。
    

（5）避免时间反复互转

*   时间戳→字符串→时间对象 多次转换，叠加解析开销。
    

（6）禁用 SimpleDateFormat、Calendar

*   高并发下一律使用 xx.time 新时间 API。
    

（7）时间加减优先数值运算

*   简单过期、有效期判断，直接毫秒加减，不创建时间对象。
    

### **9.4 落地经验**

下面提供一个工具类，大家可直接使用：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

十、减少异常处理开销

**

在高并发、循环、核心链路中，避免滥用 try-catch、频繁抛出异常、业务逻辑靠异常兜底、循环内捕获异常；通过事前参数校验、快速失败、预判合法条件、正常流程走主干，从源头减少异常触发，降低 JVM 异常创建、栈追踪、上下文切换带来的高额 CPU 与内存开销。

在笔者团队，经常会看到两三行的主逻辑代码，但是担心出现空指针，就增加了各种判断，以及加上try-catch，导致最终整个方法有几十行，看起来十分臃肿。最终我们还是要在源头来消灭异常。

10.1 核心原理

（1）异常创建成本极高

*   new Exception() / 主动抛异常时，JVM 需要生成完整调用栈轨迹、栈帧快照、堆栈遍历，属于重量级 CPU 操作，耗时远大于普通逻辑判断。
    

（2）try-catch 本身有轻微指令开销

*   大量嵌套 try-catch、循环内 try-catch，会增加字节码分支、异常表注册，影响 JIT 编译器优化，降低代码执行效率。
    

（3）异常是用来处理「意外」，不能用来做「业务分支」

*   用异常替代 if 判断做逻辑分流，会在正常流程频繁触发异常，把异常降级为高频逻辑，严重拖垮性能。
    

（4）栈回溯与对象开销

*   异常对象包含堆栈信息、消息、异常链，属于大对象，频繁产生会加重 GC 压力。
    

（5）贴合 CPU 漏斗模型

*   前置预判、快速失败，用轻量条件判断替代异常机制，不让异常的高耗运算占用核心业务 CPU  
    

10.2 实现方式

（1）事前预判，能判则判，杜绝靠异常兜底

*   空值、范围、格式、边界条件，提前 if 校验，合法再执行，不合法直接返回。例如对请求参数最好校验，获取完RPC结果之后，对RPC的结果做好校验，业务逻辑部分就放心大胆的使用即可。
    

（2）禁止循环内 try-catch

*   批量遍历、高频循环，不在循环体内部捕获异常；统一外层兜底。有一种特殊情况是需要再循环内处理的，例如批量查询10个用户的结果，当一个用户出现异常时及时try-catch，不要影响其余用户。
    

（3）业务异常自定义精简，关闭堆栈追踪

*   自定义业务异常，关闭不必要的栈信息打印，减少栈遍历开销。
    

（4）正常逻辑主干化，异常逻辑边缘化

*   主干代码无 try-catch，只在最外层统一全局捕获、统一处理。尽量减少到处的try-catch。
    

（5）少主动 throw，禁止高频抛出异常

*   查询、解析、参数校验场景，优先返回枚举 / 布尔值，而非抛异常。
    

（6）避免异常嵌套、多层异常捕获

*   减少多层 try-catch 嵌套，简化字节码结构，利于 JIT 优化。
    

10.3 注意事项

（1）区分 系统异常 & 业务异常

*   空指针、IO 错误等系统异常必须捕获；参数非法、业务规则拦截，优先用判断拦截。
    

（2）绝对禁止「异常代替 if 判断」

*   例如：捕获数字转换异常来判断字符串是否为数字，高并发严重降级。
    

（3）循环异常不要逐条吞掉

*   循环内单条异常不要单独 try-catch，防止性能雪崩；可批量过滤或外层统一处理。
    

（4）异常日志精简打印

*   高频异常禁止全量打印堆栈，只保留错误信息，减少 IO 与字符串序列化开销。
    

（5）高并发核心链路精简异常体系

*   秒杀、下单、库存扣减等核心代码，尽量零主动抛异常、零内层捕获。
    

（6）不要过度省略异常捕获

*   性能优化前提保证稳定性，外层统一兜底，防止服务雪崩。
    

10.3 注意事项

（1）区分 系统异常 & 业务异常

*   空指针、IO 错误等系统异常必须捕获；参数非法、业务规则拦截，优先用判断拦截。
    

（2）绝对禁止「异常代替 if 判断」

*   例如：捕获数字转换异常来判断字符串是否为数字，高并发严重降级。
    

（3）循环异常不要逐条吞掉

*   循环内单条异常不要单独 try-catch，防止性能雪崩；可批量过滤或外层统一处理。
    

（4）异常日志精简打印

*   高频异常禁止全量打印堆栈，只保留错误信息，减少 IO 与字符串序列化开销。
    

（5）高并发核心链路精简异常体系

*   秒杀、下单、库存扣减等核心代码，尽量零主动抛异常、零内层捕获。
    

（6）不要过度省略异常捕获

*   性能优化前提保证稳定性，外层统一兜底，防止服务雪崩。  
    

10.4 落地经验

举例 1：错误写法 —— 靠异常做业务判断，开销巨大

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

正确写法 —— 前置预判，快速失败，零异常

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例 2：错误 —— 循环内 try-catch（高并发高危）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

正确 —— 循环外统一兜底，内部纯业务

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例 3：错误 —— 高频主动抛业务异常

```
public void checkUser(Long userId) {
```

正确 —— 反向判断、快速失败、返回结果

```
public boolean checkUser(Long userId) {
```

**举例 4**：高性能自定义业务异常（关闭堆栈，减少开销）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

除了上面大家经常犯得错误以外，还有一种情况：

**RPC查询**：错误写法（到处判断、到处 try-catch）：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

上面的代码中，每写一个 RPC，**上面这些代码就要重复一遍**。

正确优秀的写法：统一 RPC 模板

业务代码（只写这一行）

```
public UserDTO getUser(Long userId) {
```

统一模版（全局只写一次）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这样写带来以下好处：

**（1）消除【重复代码带来的 CPU 膨胀】**

**错误写法（到处复制粘贴）**

```
if (result == null) return null;
```

每一个 RPC 方法，都要**加载这段代码、编译这段代码、执行分支跳转**。

代码越多，**CPU 指令越多**，**JIT 优化越难**。

**统一模板写法**

```
public static <T> T invoke(...) {
```

**只有这一份代码！**

*   **JIT 会把它编译为最优机器码**
    
*   **指令缓存命中率极高**
    
*   **分支预测极准→ 执行速度比分散的快 30%~50%**
    

**（2）消除【分散的** `try-catch` **巨大开销】**

这是**最关键、最值钱**的优化！

错误写法：每个 RPC 方法都写：

```
try {
```

每一个 try-catch 都会让 JVM 生成：

*   异常表（Exception Table）
    
*   栈帧记录
    
*   分支跳转
    
*   抑制 JIT 优化
    

10 个 RPC = 10 份异常开销

统一模板，整个系统只有 1 个 try-catch

（3）避免【代码冗余带来的 GC 与对象创建】

错误写法（每个 RPC 都要创建）

```
UserRPCResult result = ...
```

每次调用都创建**临时变量、临时栈帧、临时对象**。

**统一模板内部只创建一次结构**，所有 RPC 复用同一套内存布局、同一套指令。

*   GC更低
    
*   内存访问更快
    
*   CPU缓存命中率更高
    

**（4）代码主干极干净，业务逻辑无干扰**

**错误写法：**业务代码 = 一堆判断 + 一堆 try-catch，CPU 要跑很多**无效指令**。

**统一模板的好处：**业务代码 = **纯业务**，无别的内容，干净，整洁

```
return RPCUtils.invoke(() -> userRPC.getUser(userId));
```

指令最少、跳转最少、CPU最轻松。

**

十一、避免重复代码

**

日常工作中大家需要养成一个良好的习惯：不写完全相同 / 高度相似的逻辑片段，将公共判断、公共计算、公共赋值、公共异常处理、公共 RPC 校验抽成公共方法 / 工具类 / 统一模板，实现只写一次、全局复用。

11.1 核心原理

（1）重复代码 = 重复 CPU 指令 = 重复开销

*   相同逻辑写 N 遍，CPU 就要执行 N 遍相同运算，浪费资源。
    

（2）重复代码无法被 JIT 深度优化

*   分散的重复逻辑，JVM 无法缓存、无法编译成最优机器码。
    

*   抽成公共方法 → JIT 极容易优化 → 执行速度提升 30%~200%。
    

（3）重复创建对象 = GC 压力飙升

*   重复代码里经常重复创建临时对象、工具对象、异常对象，加重内存开销。
    

（4）重复判断 = 无效分支预测失败

*   到处 if/else、try/catch，会让 CPU 分支预测失效，性能急剧下降。
    

（5）公共方法 = 指令缓存命中率 100%

*   公共方法被频繁调用，会常驻 CPU 缓存，执行极快。  
    

11.2 实现方式

（1）公共判断抽成工具方法

*   空值、状态、参数校验，只写一次。
    

（2）公共计算抽成静态方法

*   数学计算、字符串处理、时间格式化，统一复用。
    

（3）RPC 调用统一封装

*   所有 RPC 的空判断、code 判断、异常处理，只写一次。
    

（4）循环内重复逻辑外提

*   循环里不变的代码，提到循环外。
    

（5）重复对象创建改为单例 / 静态复用

*   格式化、工具类、配置类，全局只创建一次。
    

（6）异常处理统一收敛

*   不写遍地 try-catch，统一外层处理。
    

11.3 注意事项

（1）公共方法必须无状态、线程安全

*   不能有成员变量，避免并发问题。
    

（2）不要过度抽取

*   语义不相关不要硬抽，避免方法碎片化。
    

（3）静态方法优先，性能最高

*   静态方法调用比实例方法更快，无创建开销。
    

（4）并发核心链路必须抽取

*   秒杀、下单、库存、热点查询，强制抽取公共逻辑。
    

（5）循环内禁止重复计算

*   不变量一定外提。
    

（6）工具类必须 final，构造私有

*   性能最优、最安全。
    

### **11.4 落地经验**

**例子 1：重复代码**

反面 —— 高并发禁止：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

存在以下问题：

*   同样的判断写 3 遍
    
*   JIT 无法集中优化
    
*   代码膨胀、CPU 执行冗余指令
    
*   维护成本极高
    

优化为下面代码：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

代码好处：

*   代码只存在一份
    
*   JIT 深度优化，缓存命中极高
    
*   无冗余指令
    
*   维护极简单
    

例子 2：循环内重复代码外提

反面（循环内重复创建、重复计算）

```
for (String s : list) {
```

**正面（外提，只执行一次）**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**

十二、使用Set.contains替**代链式equals**

**

日常大家开发中，若业务中多值固定匹配、白名单 / 黑名单、多条件枚举判断场景，禁止书写多层、链式、大量  obj.equals("A") || obj.equals("B")  硬编码判断；

预先将固定集合存入 HashSet，通过  set.contains()  单次匹配替代多分支等值判断，提升执行效率、简化代码、减少分支开销。

12.1 核心原理

（1）HashSet 底层哈希表寻址，查询为 O (1)

*   HashSet.contains()  依靠 hash 码定位数组下标，单次寻址匹配；链式 equals 是顺序遍历匹配 O (n)，越多选项，判断越慢。
    

（2）减少大量分支跳转，提升 CPU 分支预测命中率

*   多个 || 链式判断会产生大量条件分支、跳转指令，CPU 分支预测失效，CPU 开销高；contains() 仅一次判断，分支极少，JIT 更容易优化。
    

（3）避免重复 equals 方法调用

*   链式写法会依次调用  equals()、逐个比对字符 / 属性；Set 模式只做 hash 比对 + 一次 equals，大幅减少方法调用开销。
    

（4）固定数据全局缓存复用

*   白名单、字典码、状态码等固定值，Set 可定义为 static final 全局唯一，只初始化一次，无重复创建开销。  
    

12.2 实现方式

（1）固定白名单 / 状态集合，全局静态初始化

*   将需要匹配的固定字符串、状态码、枚举值，放入 static final HashSet，项目启动只加载一次。
    

（2）多值匹配统一使用 contains ()替代 

*   eq1 || eq2 || eq3 || eq4 链式写法。
    

（3）优先使用 HashSet，不使用 List

*   List.contains 仍是遍历 O (n)，无性能提升；必须用哈希集合。
    

（4）基础数据、固定字典、业务状态统一收拢

*   避免业务代码散落大量硬编码等值判断。
    

（5）频繁判断场景强制改造

*   字典类型、订单状态、审批状态、渠道编码等高频判断，全部改为集合匹配。
    

12.3 注意事项

（1）必须使用 HashSet，不能用 ArrayList

*   List 的 c
    

*   ontains 底层遍历比对，和链式 equals 性能一致，无优化效果。
    

（2）集合定义为 static final，避免重复初始化

*   禁止在方法内、循环内 new HashSet，防止频繁创建对象、GC 压力。
    

（3）保证元素不可变

*   存入 Set 的字符串、编码、状态值为固定常量，避免运行时修改导致哈希错乱。
    

（4）空值提前快速失败

*   判断前先做非空校验，防止 contains 空指针异常。
    

（5）不宜超大规模集合

*   少量固定选项（5～20 个）优化收益最大；超大集合无明显优势。
    

（6）equals 重写规范

*   自定义对象存入 Set，必须正确重写 hashCode() 与 equals()，否则匹配失效。
    

12.4 落地经验

举例 1：

反面写法 —— 链式 equals 硬编码（低效、多分支）

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

缺点：

*   多次调用 equals
    
*   顺序匹配，命中靠后时判断次数更多
    
*   大量逻辑分支，不利于 JIT 优化
    
*   新增状态必须改代码、加判断
    

正向最优写法 —— 全局静态 Set + contains

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优势：

*   无论多少个状态，只一次匹配
    
*   无链式分支、无多次 equals
    
*   全局集合复用，无重复创建
    
*   新增状态只需要修改静态初始化块，易维护
    

举例 2：数字状态码场景判断

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

举例3：用List，毫无提升

```
// 错误：List.contains 底层for循环遍历，和链式equals性能一致
```

**

十三、将多层if-else**转换为O(1)的Map查找**

**

在高并发、高频调用、策略路由场景中，经常会出现多层if判断的场景，本篇主要目的是让大家废除多层嵌套 / 链式 if-else，改用初始化构建 Map（key = 条件，value = 处理逻辑 / 结果），运行时直接通过 map.get(key)O (1) 查找替代顺序判断，实现零分支、高性能、易维护，以及代码可读性更好。

13.1 核心原理

（1）if-else 是顺序判断 O (n)，Map 是哈希查找 O (1)

*   if-else：必须从上到下逐一判断，命中越靠后越慢
    
*   Map：一次哈希定位，不管多少条件，速度完全一致
    

（2）消除大量 CPU 分支预测失败

*   多层 if-else 会让 CPU 频繁分支预测失效，导致流水线停顿、性能暴跌；
    
*   Map 无分支、无跳转，执行效率稳定、极快。
    

（3）JIT 最优优化Map 

*   查找是简单数组寻址，无复杂分支，JVM 可直接编译为最优底层指令。
    

（4）静态 Map 全局一次初始化，无运行时开销

*   把 “判断逻辑” 放到程序启动时构建，运行时只做纯查找，CPU 消耗最低。
    

（5）代码无冗余、无硬编码，高并发更稳定

方式

时间复杂度

CPU 分支

性能

高并发

多层 if-else

O(n)

极多

低

不稳定

Map 查找

O(1)

0

极高

非常稳定

条件越多，Map优势越大！

13.2 实现方式

（1）静态 Map 全局初始化（最关键）

*   使用 static final Map，类加载时构建一次，运行时只读，无锁、无创建、无 GC。
    

*   当无法使用静态map时，尽量让方法的返参为map，没必要专门为了使用map而new 一个出来。
    

（2）key = 你的判断条件

*   状态码、类型、字符串、枚举都可以做 key。
    

（3）value = 你要返回的结果 / 处理策略

*   简单场景：直接存目标值
    
*   复杂场景：存函数接口（Lambda / 策略）
    

（4）运行时直接 get，零 if 判断

*   一行代码完成分发。
    

（5）高并发优先使用 HashMap（只读安全）

*   只读场景下 HashMap 比 ConcurrentHashMap快 5~10 倍。
    

13.3 注意事项

（1）简单 1~2 层 if 没必要改

*   3 层以上、多分支、高频调用，优化收益最大。
    

（2）HashMap 在读场景下性能最高

*   不加锁、无额外开销，高并发首选。
    

（3）null key /null value 提前处理

*   防止空指针，减少多处的空判断提高稳定性
    

13.4 落地经验

例子 1：反面 —— 多层 if-else（高并发高危）

订单状态匹配：多层、多分支、顺序判断

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

问题

*   每次都要从上到下判断
    
*   分支极多，CPU 流水线频繁失败
    
*   代码臃肿、难维护
    
*   高并发下 CPU 消耗明显偏高
    

最优方案 —— static final Map 查找（零 if-else）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优势

*   无任何 if-else 分支
    
*   一次哈希查找，O (1) 固定耗时
    
*   CPU 无预测失败，执行速度提升 50%~200%
    
*   代码极简、易维护
    
*   高并发下最稳定
    

**

十四、将多层if-else**转换为O(1)的Map查找避免不必要的对象创建**

**

绝大多数开发人员都有一个误区，当系统的GC非常频繁且耗时较大时，大家可能会想着怎么调整JVM的参数，让JVM能够更快、更好、更稳定；其实这是一个误区，现在的JDK在某种程度上已经做的非常好了，特别是最新的JDK25，在GC方面更是提升了很大。那么当系统出现上述问题时该怎么处理呢？本篇将为大家揭晓答案。

我们先抛出一个问题：都哪些情况下会产生新的对象？先为大家解答这个问题。

都哪些情况下会产生新的对象：

（1）显式 new 创建

*   new Object()、new ArrayList<>()、new 自定义类()、new Date()
    

（2）字符串相关

*   new String("abc")
    
*   字符串拼接 a + b（编译为 StringBuilder 临时对象）
    
*   split() / substring() / trim() /toUpperCase()/toLowerCase() 都会生成新字符串
    
*   文本解析、格式化返回新 String
    
*   toString()：通常会返回一个新的字符串对象（\`String\`），而\`String\`在Java中是不可变对象，每次拼接、格式化都会产生新对象。比如：\`String a = obj.toString();\`，每次调用都返回新对象，尤其是在循环或日志打印中频繁调用时，容易产生大量临时字符串对象，加重GC压力。
    
*   String.concat() 也会返回新对象
    

（3）自动装箱 / 拆箱

*   基本类型赋值给包装类：Integer a = 1; Long l = 100L;
    

*   集合泛型为包装类：List<Integer>
    

（4）集合与数组

*   new ArrayList/HashMap/HashSet
    
*   集合扩容：底层新建数组、拷贝旧数据
    
*   Arrays.asList() 内部生成新集合对象
    
*   数组的复制/切片：Arrays.copyOf()、Arrays.copyOfRange() 都会产生新的数组对象
    

（5）日期、时间类

*   new Date()
    
*   LocalDateTime.now()、Instant.now() 每次返回新对象
    
*   SimpleDateFormat、日历工具实例新建
    

（6）异常对象

*   new Exception()、new RuntimeException()
    
*   主动 throw 异常，会生成堆栈快照与异常实例
    

（7）迭代器 & 增强 for

*   增强 for 循环底层创建 Iterator 迭代器对象
    

*   list.iterator() 手动获取迭代器
    

（8）Lambda / 函数式 / Stream

*   每次 Lambda 调用生成函数式接口实例
    

*   stream()、filter、map 流式操作大量中间临时对象
    

（9）RPC / 序列化

*   JSON 反序列化、RPC 返回结果解析，自动 new 实体 DTO
    

（10）正则相关

*   Pattern.compile() 新建正则对象、matcher() 生成匹配器对象
    

（11）基本包装类静态方法

*   Integer.valueOf()、Long.valueOf() 缓存外都会新建对象
    
*   知晓了哪些情况会产生对象，我们再来继续本篇的内容，从核心原理开始讲起：
    

14.1 核心原理

（1）对象创建是重型操作

*   Java 对象创建需要：类加载检查、内存分配、对象头初始化、零值填充、引用绑定，整个过程中CPU 指令多。
    

（2）频繁小对象 → YGC 频繁

*   大量短命临时对象快速填满新生代，触发频繁 Minor GC，产生STW 停顿、拷贝存活对象、内存清扫，严重影响接口耗时。
    

（3）每个对象都有额外内存开销

*   对象头、对齐填充、元数据引用，即使空对象也占用额外内存，放大内存消耗。
    

（4）可复用对象重复销毁重建，浪费资源

*   工具类、格式化器、集合、配置、常量等，只需初始化一次，反复 new 会造成无意义销毁与重建。
    

（5）基础类型比包装类更轻量

*   包装类是对象、存在拆装箱、对象开销；基本类型直接在栈 / 寄存器运算，无堆分配。
    

14.2 实现方式

（1）高频工具类全局 static final 单例复用

*   日期格式化器、正则 Pattern、固定集合、字典 Map、白名单 Set，类加载只初始化一次。
    

（2）循环内对象外提

*   循环内部不变的集合、字符串、工具实例，提到循环外部创建。
    

（3）优先使用基本数据类型

*   int/long/double 替代 Integer/Long/Double，减少拆装箱与对象创建。
    

（4）字符串硬编码常量化

*   固定文本、提示文案、状态码字符串，定义为常量，避免运行时新建字符串。
    

（5）集合复用、清空复用，不反复 new

*   批量处理复用同一个 List/Map，使用 clear() 清空复用，而非每次 new 新集合。
    

（6）减少自动装箱、自动拆箱

*   数值运算、条件判断优先基本类型，杜绝循环内频繁装箱。
    

（7）禁止循环内 split、substring、格式化解析

*   文本、日期解析前置批量处理，避免循环产生大量字符串临时对象。
    

14.3 注意事项

（1）静态复用对象保证线程安全

*   DateTimeFormatter 线程安全可全局复用；SimpleDateFormat 非线程安全禁止静态共用。
    

（2）警惕隐形自动创建对象

*   自动装箱、空字符串拼接、Lambda、迭代器、集合遍历都会隐形生成对象。
    

### **14.4 落地经验**

**示例 1：循环内频繁创建对象（错误写法）**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化：对象外提，只创建一次

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**示例 2：频繁包装类装箱，产生对象**

错误写法：

```
// 循环内频繁自动装箱，产生大量 Long 对象
```

优化：全程使用基本类型

```
for (long i = 0; i < 1000; i++) {
```

**示例 3：重复创建固定字典集合**

错误写法：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优化：全局静态常量集合

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**示例 4：字符串拼接产生新对象**

错误写法：

```
// 循环内字符串拼接，每次生成新 String 对象
```

优化：常量+格式化复用

```
private static final String MSG_PREFIX = "编号：";
```

**

十五、使用更高效的数据结构

**

日常开发中，我们使用java原生集合类、包装类是最多的，例如HashMap、HashSet等；但这些原生的集合类在存储占用空间以及性能方面并非最优，当我们想尽可能的提升代码执行效率，降低内存开销时，就需要新的类型。

15.1 核心原理

（1）JDK 默认容器（HashMap/ArrayList）的巨大缺陷

*   存储包装类：Integer/Long → 都是对象，占内存巨大
    
*   存在对象头：8 字节 + 8 字节 = 16 字节开销
    
*   存在哈希冲突、链表 / 红黑树、扩容、负载因子
    
*   大量空指针、装箱、拆箱消耗
    
*   内存利用率极低，大量内存碎片
    

（2）高性能原生类型容器的优势

*   直接存储原生类型：int/long/byte不存对象，完全无包装、无对象头
    
*   底层是纯数组，无哈希、无链表、无红黑树
    
*   内存减少 50%~90%
    
*   速度提升 3~15 倍
    
*   无 GC、无对象创建
    
*   CPU 缓存命中率 100%
    

15.2 实现方式

世界最快的原生类型集合库：fastutil

你要的更小、更快、无对象集合，全部来自这个库：

Maven 依赖

```
<dependency>
```

它提供的最强类

*   TIntArrayList → 替代 List<Integer>
    
*   TLongArrayList → 替代 List<Long>
    
*   TIntHashSet → 替代 Set<Integer>
    
*   TLongHashSet → 替代 Set<Long>
    
*   TIntObjectHashMap → 替代 HashMap<Integer, ?>
    
*   TLongObjectHashMap → 替代 HashMap<Long, ?>
    
*   TObjectIntHashMap → 替代 HashMap<?, Integer>
    

下面解释具体原因：

**（1）替换：HashMap<Integer, T>**

最优选择：`TIntObjectHashMap`**它是 Java 世界里，key 为 int 类型时，速度最快、占用内存最小的 Map。**

```
// 旧：占空间大、慢、装箱
```

优势

*   无 Integer 对象
    
*   底层直接存 int
    
*   内存 = 1/2 ~ 1/4
    
*   速度 = 3~10 倍
    

（2）替换：HashMap<Long, T>

最优选择：TObjectLongHashMap

```
// 旧HashMap
```

**（3）替换：Integer / Long**

最优：直接用原生类型 **int / long**

```
// 旧（对象，占16字节+内存）
```

**（4）替换：Set<Integer>**

最优：**TIntHashSet**

```
// 旧
```

内存减少 **70%+**

**（5）替换：List<Integer>**

最优：**TIntArrayList**

```
// 旧
```

**（6）替换：普通 Map（枚举 KEY）**

最优：**EnumMap**（JDK 官方最快 Map）

```
// 速度 = HashMap 的 10~20 倍
```

**纯数组实现，无哈希算法！**

**

十六、减少null字段

**

我们先看一句话，想必会让绝大多数人感到意外：我把属性设为 null，是不是能省内存？**错。**

对象属性是 null，也一定会占用固定内存空间，而且该占多少，就占多少，一点都不会少。

```
Integer a = null;
```

16.1 核心原理

对象里的引用类型字段（不管是不是 null），本质都是「指针 / 地址」

*   32 位 JVM：占 4 字节
    
*   64 位 JVM（默认开启压缩指针）：占 4 字节
    
*   64 位 JVM（关闭压缩）：占 8 字节
    

null 仅仅表示这个引用「不指向任何对象」，但引用本身的位置、空间必须保留！

就像：你有一个信封（引用），里面有没有信纸（对象）无所谓，信封本身一定要占位置。

除此之外，减少null 还有很多好处：

1.不用写无数个 if (obj != null)

2.避免空指针异常（NPE）

3.减少 CPU 分支预测失败

4.让 JIT 更好优化代码

5.集合、字符串可以直接使用，不用判空

### **16.2 示例**

**场景一** 我们先看一些代码：

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

这个 User 对象占用多少内存？

*   对象头：12 字节
    
*   name：4 字节
    
*   age：4 字节
    
*   list：4 字节
    
*   对齐填充：4 字节
    

总共：28 字节；哪怕所有字段都是 null，空间一点都不会少。

```
String s = null;   //占 4 字节
```

**场景二** 但如果某个对象就是null，会怎样呢？

```
User user = null;
```

user 只是一个引用指针：64 位压缩指针下固定占 4 字节，堆中完全没有 User 实例：没有对象头、没有各个属性字段、没有对齐填充。

举例来说，就好比引用只是一根「绳子」，user = null =绳子上空空如也，没有挂任何箱子；

箱子（User 对象 + 所有属性）根本不存在，自然不占仓库（堆）空间。

场景三 对象已 new、内部字段全为 null

```
User user = new User(); 
```

1.堆里实实在在创建了一个 User 对象

2.必须占用：对象头 + 所有字段引用 + 内存对齐

3.哪怕所有属性全是 null，实例内存全额占用

16.3 总结

*   单个属性为 null：对象实例存在，字段引用内存照常占用，无法节省空间；
    
*   整个对象为 null：堆中无实例、无任何属性内存，仅保留少量引用指针开销，是真正节省内存的方式。
    

**

十七、循环Map优先取keySet

避免entrySet对象开销**，提升性能**

**

在只需要 KEY、不需要 VALUE 的遍历场景中，禁止使用 entrySet()，改用 keySet() 遍历。

因为 entrySet() 会为每一个键值对创建 Entry 对象，产生大量临时对象、增加 GC、拉高 CPU 开销。

17.1 核心原理

（1）entrySet () 会创建大量 Entry 对象

*   entrySet() 遍历，每循环一次，都会 new 一个 Node/Entry 对象封装 key+value。
    
*   循环 10000 次 → 创建 10000 个临时 Entry 对象，会造成 GC 压力巨大。
    

（2）keySet () 无额外对象创建

*   keySet() 只返回 key 集合，遍历直接取 key，不创建任何 Entry 对象，零额外开销。
    

（3）Entry 对象是内存浪费

*   如果你只需要 key，却创建完整 Entry（key+value），属于无效内存分配 + 无效 CPU 运算。
    

（3）JIT 对 keySet 遍历优化更友好

*   无对象创建、无封装，CPU 执行更快、更稳定。
    

17.2 实现方式

（1）只需要 KEY → 必须用 keySet ()

（2）必须用 KEY + VALUE → 才用 entrySet ()

（3）绝对不要：先遍历 key，再 map.get (key) 查 value；这是 O(n) → O(n²) 性能灾难。

```
// 错误！遍历 key 再 get，等于查两次 Map，性能暴跌
```

因为它做了 2 次哈希查找，时间复杂度从 O (n) 变成 O (n × 1) = 等价 O (n²)

他的底层逻辑：

1.keySet() 遍历：循环拿到 key

2.map.get(id)：再重新走一遍完整哈希查找

HashMap 的 get(key) 到底做了哪些事？

1.计算 key 的 hashCode()

2.取模定位数组下标

3.判断链表 / 红黑树

4.循环对比 equals

5.找到返回，找不到返回 null

这是一整套完整的、重量级的查找流程！

而采用entrySet 时只做 0 次额外查找：

```
for (Entry e : map.entrySet()) {
```

因为 **entry 内部已经持有 value 的引用**，**不需要再查哈希表。**

**17.3 代码示例**

**例子 1：反面 —— 只需要 KEY，却用 entrySet（创建大量对象）**

**场景：只需要遍历所有用户 ID，不需要用户信息**

**![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)**

问题

*   每一次循环创建 Map.Entry 实例
    
*   内存占用高、GC 频繁
    
*   做了无用的 value 封装、读取
    

最优 —— 只需要 KEY，使用 keySet（零对象开销）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

优势

*   无任何临时对象创建
    
*   无 GC 压力
    
*   遍历速度提升 30%~100%
    
*   CPU 指令更少、更轻量化
    

例子 2：正确场景 —— 需要 key+value，才用 entrySet

```
// 必须同时用 key 和 value，只能用 entrySet
```

**例子 3**：极度错误 —— keySet + 重复 get（性能爆炸）

```
// 严禁！！！
```

**

十八、减少使用json字符串进行**参数传递**

**

日常开发中，经常出现微服务之间使用json进行参数传递，下面我们讲解下使用json进行参数传递和使用实体类的区别: 

方式

本质

序列化

传输内容

跨语言

性能

**JSON 字符串**

文本协议

对象 → JSON 字符串

明文字符串

极强

一般

**实体对象传输**

二进制协议

对象 → 字节流

紧凑二进制

弱

极高

1.json只是更加通用，但性能不如字节流；不要为了方便就滥用json。

2.采用json传输时，接收方收到参数还必须进行反序列化成对象，这又会造成极大的CPU开销:

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

 这种方式对服务调用端和提供端来说，都是致命的问题：

*   1 次序列化（遍历字段 + 拼接字符串）
    
*   1 次反序列化（分词 + 构建对象）
    
*   创建 1 个大长度 String 对象（占内存、GC）
    
*   总开销 = 直接传对象的 50~100 倍
    

3.绝对禁止在同一服务内，A 方法调用 B 方法，用 JSON 传用户对象。

* * *

剩余18种编码实战技巧，将在下篇分享，敬请关注。

推荐阅读

[AI 使用心得：B 端产品工作中的方法、边界与实践](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502909&idx=1&sn=b838661a6ad2be1e2d767424cc0f9d24&scene=21#wechat_redirect)

[全栈 AI Agent 从 0 到 1 ：智能播客平台开发全记录](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502584&idx=1&sn=af0eb966b148a5413443c9d6eabf5b63&scene=21#wechat_redirect)

[从代码托管到 AI 能力底座：京东代码库的转型](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502469&idx=1&sn=f4f3a9ce97561612a1dbebe59ab3986a&scene=21#wechat_redirect)

[抽丝剥茧探穷境！一次数据库JSON字段的深度使用实践](https://mp.weixin.qq.com/s?__biz=MzU1MzE2NzIzMg==&mid=2247502251&idx=1&sn=7d547d3ad44b6a64ddf6393512e69f55&scene=21#wechat_redirect)

**关注我们**