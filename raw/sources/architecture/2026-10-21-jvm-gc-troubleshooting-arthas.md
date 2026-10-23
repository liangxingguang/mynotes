---
title: JVM GC 排查实战（Arthas 版）
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/WCrdRXRWCWtYzRRyLVMj2A"
source_type: link
platform: 微信
captured: 2026-10-21
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-21-jvm-gc-troubleshooting-arthas.md
asset_ref: Assets/2026/10/jvm-gc-troubleshooting-arthas.md
---

# JVM GC 排查实战（Arthas 版）

# JVM GC 排查实战篇（Arthas 版）

> 来源：https://mp.weixin.qq.com/s/WCrdRXRWCWtYzRRyLVMj2A
> 抓取时间：2026-10-21（web-fetch，browser 级）

## 1. 常用排查工具

| 工具 | 用途 |
| --- | --- |
| `jps` | 查看 Java 进程 |
| `jstat -gc` | 查看 GC 情况 |
| `jstat -class` | 查看类加载/卸载 |
| `jmap -heap` | 查看堆配置和使用 |
| `jmap -dump` | 导出堆快照 |
| `jstack` | 查看线程堆栈、死锁 |
| `jcmd` | 综合诊断命令 |
| `MAT / JProfiler` | 堆 dump 分析 |

## 2. Full GC 频繁排查步骤（Arthas 版）

> 机器都装了 Arthas，优先用它排查，比 jstat/jmap 效率高一个量级。

### 第一步：dashboard 看清全局

```bash
# 连接 Arthas
java -jar arthas-boot.jar

# 1. 全景面板（一屏看完所有关键指标）
dashboard

# 重点关注：
# ┌─ Memory ──────────────────────────────────────┐
# │  heap       xxxM / xxxM   xx%                 │  ← 堆使用率
# │  eden_space xxxM / xxxM   xx%                 │  ← Eden 使用率
# │  cms_old    xxxM / xxxM   xx%                 │  ← 老年代使用率 ★
# │  metaspace  xxxM / xxxM   xx%                 │  ← 元空间使用率 ★
# │  code_cache xxxM / xxxM   xx%                 │
# └───────────────────────────────────────────────┘
# ┌─ GC ─────────────────────────────────────────┐
# │  ygc  xx  ygct  xxms  fgc  xx  fgct  xxms   │  ← GC 次数和耗时 ★
# └───────────────────────────────────────────────┘

# 刷新几次看趋势：
#   OU 是否持续上涨 → 内存泄漏
#   OU 每次 FGC 后降幅大 → 晋升过快
#   Metaspace 接近满 → 类加载问题
```

```bash
# 2. 查看 JVM 完整启动参数
jvm

# 重点看：
#   -Xmx / -Xms           → 堆大小
#   -Xmn / NewRatio       → 年轻代大小
#   SurvivorRatio         → Survivor 比例
#   MaxTenuringThreshold  → 晋升阈值
#   UseConcMarkSweepGC / UseG1GC / UseParallelGC → 收集器
#   MaxMetaspaceSize      → 元空间上限（-1 = 不限制）
```

```bash
# 3. 查看内存各区域详情
memory

# 关注：
#   metaspace: used / committed / max
#   cms_old_gen: used / committed / max
```

### 第二步：分析 FGC 根因（重点）

| dashboard 现象 | 可能原因 | 下一步 |
| --- | --- | --- |
| OU 每次 FGC 后降幅 > 50% | 短命对象提前晋升 | 查年轻代配置 → 第三步 |
| OU 持续涨，FGC 后几乎不降 | **内存泄漏** | dump → 第四步 |
| OU 不高但触发 FGC | CMS 碎片 / 大对象分配失败 | dump → 第四步 |
| Metaspace > 90%，FGC 显示 Metadata GCThreshold | **元空间不够 / 类泄漏** | 查类加载 → 第五步 |
| FGC 和 YGC 都很频繁 | 整体堆太小 / 流量太大 | 考虑扩容 |

### 第三步：晋升过快排查

```bash
# 看年轻代配置
jvm | grep -E "Xmn|NewRatio|SurvivorRatio|MaxTenuringThreshold"

# 常见问题：
#   -Xmn 太小（如 3GB 堆只给了 200M 年轻代）
#   MaxTenuringThreshold 太小（如 6，改到 15）
#   SurvivorRatio 太大（默认 8:1:1，可改 4:1:1）
```

### 第四步：堆 dump + 定位大对象

```bash
# 4. dump（--live 会先做一次 FGC，保留真正存活的对象）
heapdump --live /tmp/heap.hprof

# 5. MAT 打开 hprof 文件，三步定位：
#    ① Leak Suspects（泄漏嫌疑报告）→ 直接看 Top 嫌疑对象
#    ② Dominator Tree → 按 Retained Heap 降序 → 找前 20 大对象
#    ③ 选中可疑对象 → 右键 Path to GC Roots → exclude weak/soft/phantom refs
#       看谁在抓着这个对象不放

# 常见泄漏点：
#   - HashMap/HashSet 持续 add 不 remove
#   - ThreadLocal 用完后没 remove
#   - 缓存没上限（ConcurrentHashMap 当缓存用）
#   - 静态集合持有对象引用
#   - 监听器/回调注册后未取消
```

### 第五步：元空间 / 类加载器泄漏排查

```bash
# 6. 查看类加载器分布
classloader
# 重点看：
#   - numberOfInstances：同一个 ClassLoader 出现多份 → 泄漏
#   - loadedCountTotal：某个加载器加载类特别多 → 异常
#   - sun.reflect.DelegatingClassLoader 数量 > 几百 → 反射类多

# 7. 隔几分钟再执行，对比是否增长
classloader
# 对比：
#   不变 → 稳态，无泄漏
#   持续涨 → 有泄漏，继续查

# 8. 如果持续涨，定位谁在加载类
stack java.lang.ClassLoader loadClass -n 5

# 9. 看反射类是否过多
sc *CGLIB* -n 5       # CGLIB 动态代理
sc *Proxy* -n 5       # JDK 动态代理
sc *Lambda* -n 5      # Lambda 表达式类

# 10. 统计类总数
classloader | grep LaunchedURLClassLoader
# loadedCount：
#   < 5000     → 轻量
#   5000~20000 → Spring Boot 正常
#   > 20000    → 偏多，关注增长趋势
#   > 30000    → 依赖很多或有问题

# 正常 Spring Boot 应用 Metaspace：50~120MB
# 超过 200MB 就要排查原因
```

### 第六步：按根因处理

**场景 A：晋升过快**

```
现象：FGC 回收量大、YGC 频繁、OU 每次 FGC 后显著下降
解决：
  1. 增大年轻代：调大 -Xmn 或调小 NewRatio（如 NewRatio=1）
  2. 增大 Survivor：调小 SurvivorRatio（如 4）
  3. 提高晋升阈值：MaxTenuringThreshold 调大到 15
```

**场景 B：内存泄漏**

```
现象：OU 持续增长，FGC 回收量很小，最终 OOM
解决：
  1. MAT Dominator Tree 找到大对象
  2. GC Roots 追踪引用链
  3. 修复代码：加缓存上限、remove ThreadLocal、用 WeakHashMap
```

**场景 C：CMS 碎片**

```
现象：OU 不高但触发 FGC、有大对象分配失败日志
解决：换 G1（-XX:+UseG1GC）
```

**场景 D：元空间不够 / 类泄漏**

```
现象：Metaspace 持续涨、FGC 日志显示 Metadata GCThreshold
解决：
  1. 无泄漏 → 设 -XX:MaxMetaspaceSize=512M 兜底
  2. 有泄漏 → 修复代码（CGLIB 缓存、Groovy 脚本缓存、反射优化）
  3. 临时止血：调大 MaxMetaspaceSize
```

**场景 E：System.gc() 显式调用**

```
现象：GC 日志显示 System.gc()
解决：
  1. 搜代码去掉 System.gc()
  2. 或用 -XX:+DisableExplicitGC 屏蔽
```

### 第七步：验证修复

```bash
# 持续观察，确认 FGC 频率下降
dashboard
# 刷新几次对比修复前后：
#   YGC 频率    → 是否下降
#   FGC 频率    → 是否降到可接受水平
#   FGC 耗时    → 单次是否缩短
#   OU 趋势     → 是否不再持续上涨
#   Metaspace   → 是否稳定
```
