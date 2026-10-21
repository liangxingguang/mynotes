# 风控系统就该这么设计（万能通用），稳的一批！

> 来源：https://mp.weixin.qq.com/s/dbNxVwwHG9YxAE4oquGaSA（芋道源码，转载掘金）
> 抓取时间：2026-10-21（web-fetch，browser 级）

## 一、背景

### 1. 为什么要做风控？

目前业务使用到非常多的 AI 能力，如 OCR 识别、语音测评等，这些能力往往都比较费钱或者费资源，所以在产品层面也希望对用户的能力使用次数做一定的限制，因此风控是必须的。

### 2. 为什么要自己写风控？

业务风控与开源常见风控（普通风控）的区别：业务风控需要按业务维度（用户、事件）组合多种时间窗口计数，并支持实时调整限制值，开源的普通风控一般无法满足，所以选择自研。

### 3. 其它要求

支持实时调整限制——很多限制值首次设置时基本是拍定的值，后续需要调整的可能性比较大，因此可调整并实时生效是必须的。

## 二、思路

### 1. 风控规则的实现

**a. 需要实现的规则：**

*   自然日计数
*   自然小时计数
*   自然日+自然小时计数

自然日+自然小时计数并不能单纯地串联两个判断：如果自然日的判定通过，而自然小时的判定不通过，需要回退——自然日跟自然小时都不能计入本次调用。

**b. 计数方式的选择：**

| 方案 | 特点 |
| --- | --- |
| mysql + db 事务 | 持久化、记录可溯源、实现麻烦，稍微"重"了一点 |
| redis + lua | 实现简单，redis 可执行 lua 脚本的特性也能满足对"事务"的要求 |
| mysql/redis + 分布式事务 | 需要上锁，实现复杂，能做到比较精确的计数（真正等到代码块执行成功之后再操作计数） |

目前没有很精确计数的要求（代价太大），也没有持久化的需求，因此选用 redis+lua 即可。

### 2. 调用方式的实现

**a. 常见的做法**：先定义一个通用的入口

```kotlin
// 简化版代码
@Component
class DetectManager {
    fun matchExceptionally(eventId: String, content: String) {
        // 调用规则匹配
        val rt = ruleService.match(eventId, content)
        if (!rt) {
            throw BaseException(ErrorCode.OPERATION_TOO_FREQUENT)
        }
    }
}
```

在 service 中调用该方法：

```kotlin
// 简化版代码
@Service
class OcrServiceImpl : OcrService {
    @Autowired
    private lateinit var detectManager: DetectManager

    /**
     * 提交ocr任务
     * 需要根据用户id来做次数限制
     */
    override fun submitOcrTask(userId: String, imageUrl: String): String {
        detectManager.matchExceptionally("ocr", userId)
        // do ocr
    }
}
```

有没有更优雅一点的方法呢？用注解可能会更好一点（也比较有争议其实，这边先支持实现）。

由于传入的 content 是跟业务关联的，所以需要通过 SpEL 来将参数构成对应的 content。

## 三、具体实现

### 1. 风控计数规则实现

**a. 自然日/自然小时**

自然日/自然小时可以共用一套 lua 脚本，因为它们只有 key 不同，脚本如下：

```lua
local currentValue = redis.call('get', KEYS[1]);
if currentValue ~= false then
    if tonumber(currentValue) < tonumber(ARGV[1]) then
        return redis.call('INCR', KEYS[1]);
    else
        return tonumber(currentValue) + 1;
    end;
else
    redis.call('set', KEYS[1], 1, 'px', ARGV[2]);
    return 1;
end;
```

其中 `KEYS[1]` 是日/小时关联的 key，`ARGV[1]` 是上限值，`ARGV[2]` 是过期时间，返回值则是当前计数值+1 后的结果（如果已经达到上限，则实际上不会计数）。

**b. 自然日+自然小时**

如前文提到的，两个的结合实际上并不是单纯的拼凑，需要处理回退逻辑：

```lua
local dayValue = 0;
local hourValue = 0;
local dayPass = true;
local hourPass = true;

local dayCurrentValue = redis.call('get', KEYS[1]);
if dayCurrentValue ~= false then
    if tonumber(dayCurrentValue) < tonumber(ARGV[1]) then
        dayValue = redis.call('INCR', KEYS[1]);
    else
        dayPass = false;
        dayValue = tonumber(dayCurrentValue) + 1;
    end;
else
    redis.call('set', KEYS[1], 1, 'px', ARGV[3]);
    dayValue = 1;
end;

local hourCurrentValue = redis.call('get', KEYS[2]);
if hourCurrentValue ~= false then
    if tonumber(hourCurrentValue) < tonumber(ARGV[2]) then
        hourValue = redis.call('INCR', KEYS[2]);
    else
        hourPass = false;
        hourValue = tonumber(hourCurrentValue) + 1;
    end;
else
    redis.call('set', KEYS[2], 1, 'px', ARGV[4]);
    hourValue = 1;
end;

if (not dayPass) and hourPass then
    hourValue = redis.call('DECR', KEYS[2]);
end;

if dayPass and (not hourPass) then
    dayValue = redis.call('DECR', KEYS[1]);
end;

local pair = {};
pair[1] = dayValue;
pair[2] = hourValue;
return pair;
```

其中 `KEYS[1]` 是天关联生成的 key，`KEYS[2]` 是小时关联生成的 key，`ARGV[1]` 是天的上限值，`ARGV[2]` 是小时的上限值，`ARGV[3]` 是天的过期时间，`ARGV[4]` 是小时的过期时间，返回值同上。

这里给的是比较粗糙的写法，主要需要表达的就是：进行两个条件判断时，有其中一个不满足，另一个都需要进行回退。

### 2. 注解的实现

**a. 定义一个 @Detect 注解**

```kotlin
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.FUNCTION, AnnotationTarget.CLASS)
annotation class Detect(
    /**
     * 事件id
     */
    val eventId: String = "",

    /**
     * content的表达式
     */
    val contentSpel: String = ""
)
```

其中 `content` 是需要经过表达式解析出来的，所以接受的是个 `String`。

**b. 定义 @Detect 注解的处理类**

```kotlin
@Aspect
@Component
class DetectHandler {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Autowired
    private lateinit var detectManager: DetectManager

    @Resource(name = "detectSpelExpressionParser")
    private lateinit var spelExpressionParser: SpelExpressionParser

    @Bean(name = ["detectSpelExpressionParser"])
    fun detectSpelExpressionParser(): SpelExpressionParser {
        return SpelExpressionParser()
    }

    @Around(value = "@annotation(detect)")
    fun operatorAnnotation(joinPoint: ProceedingJoinPoint, detect: Detect): Any? {
        if (detect.eventId.isBlank() || detect.contentSpel.isBlank()) {
            throw illegalArgumentExp("@Detect config is not available!")
        }

        // 转换表达式
        val expression = spelExpressionParser.parseExpression(detect.contentSpel)
        val argMap = joinPoint.args.mapIndexed { index, any ->
            "arg${index+1}" to any
        }.toMap()

        // 构建上下文
        val context = StandardEvaluationContext().apply {
            if (argMap.isNotEmpty()) this.setVariables(argMap)
        }

        // 拿到结果
        val content = expression.getValue(context)

        detectManager.matchExceptionally(detect.eventId, content)
        return joinPoint.proceed()
    }
}
```

需要将参数放入到上下文中，并起名为 `arg1`、`arg2`....

## 四、测试一下

使用注解之后的写法：

```kotlin
// 简化版代码
@Service
class OcrServiceImpl : OcrService {
    @Autowired
    private lateinit var detectManager: DetectManager

    /**
     * 提交ocr任务
     * 需要根据用户id来做次数限制
     */
    @Detect(eventId = "ocr", contentSpel = "#arg1")
    override fun submitOcrTask(userId: String, imageUrl: String): String {
        // do ocr
    }
}
```

Debug 验证：注解值获取成功，表达式解析成功。
