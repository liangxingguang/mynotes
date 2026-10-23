---
title: Spring Boot 3.x 全局异常处理最佳实践：从入门到生产级方案
source: 微信公众号
source_url: "https://mp.weixin.qq.com/s/jmeVH93lmJBVRdjl-cqdTg"
source_type: link
platform: weixin
captured: 2026-10-23
registered_at: 2026-10-23
inbox_ref: Inbox/2026-10-23-springboot-global-exception-handling.md
asset_ref: Assets/2026/10/springboot-global-exception-handling.md
---

# Spring Boot 3.x 全局异常处理最佳实践：从入门到生产级方案

# Spring Boot 3.x 全局异常处理最佳实践：从入门到生产级方案

> 采集自微信公众号：https://mp.weixin.qq.com/s/jmeVH93lmJBVRdjl-cqdTg

## 前言

在日常的Java后端开发中，异常处理是我们绕不开的话题。很多新手开发者习惯在Controller层到处写try-catch，不仅代码冗余难看，而且异常响应格式五花八门，前端对接苦不堪言。

今天这篇文章就带你彻底搞懂Spring Boot 3.x下的全局异常处理方案，从基础用法到生产级封装，一步步写出优雅、统一、易维护的异常处理代码。

## 一、为什么需要全局异常处理？

先看看我们最常写的"烂代码"是什么样的：

```java
@GetMapping("/user/{id}")
public R getUser(@PathVariable Long id) {
    try {
        User user = userService.getById(id);
        return R.ok(user);
    } catch (Exception e) {
        log.error("查询用户失败", e);
        return R.fail("系统错误");
    }
}
```

这种写法的问题非常明显：

1. **代码冗余**：每个接口都要写重复的try-catch
2. **格式不统一**：不同人返回的错误格式可能不一样
3. **难以维护**：要改异常逻辑得改几百个地方
4. **无法捕获特殊异常**：比如参数校验异常、404异常等

而全局异常处理就能完美解决这些问题：**一处配置，全局生效，统一格式**。

## 二、基础版：@RestControllerAdvice 快速入门

Spring从3.2版本开始就提供了`@RestControllerAdvice`注解，这是我们做全局异常处理最核心的武器。

### 2.1 统一响应格式

首先我们先定义一个统一的响应实体类，这是所有接口返回的标准格式：

```java
import lombok.Data;

@Data
public class R<T> {
    private Integer code;
    private String msg;
    private T data;

    public static <T> R<T> ok(T data) {
        R<T> r = new R<>();
        r.setCode(200);
        r.setMsg("success");
        r.setData(data);
        return r;
    }

    public static <T> R<T> fail(Integer code, String msg) {
        R<T> r = new R<>();
        r.setCode(code);
        r.setMsg(msg);
        return r;
    }

    public static <T> R<T> fail(String msg) {
        return fail(500, msg);
    }
}
```

### 2.2 自定义业务异常

我们先自定义一个业务异常类，用来处理我们自己抛出的业务错误：

```java
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final Integer code;

    public BusinessException(String msg) {
        super(msg);
        this.code = 500;
    }

    public BusinessException(Integer code, String msg) {
        super(msg);
        this.code = code;
    }
}
```

### 2.3 全局异常处理器

接下来就是核心的全局异常处理类了：

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理自定义业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public R<Void> handleBusinessException(BusinessException e) {
        log.warn("业务异常：{}", e.getMessage());
        return R.fail(e.getCode(), e.getMessage());
    }

    /**
     * 处理所有未捕获的异常
     */
    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return R.fail("系统繁忙，请稍后再试");
    }
}
```

到这里，基础版的全局异常处理就已经完成了！你的Controller里再也不用写任何try-catch，有异常直接抛就行：

```java
@GetMapping("/user/{id}")
public R<User> getUser(@PathVariable Long id) {
    User user = userService.getById(id);
    if (user == null) {
        throw new BusinessException(404, "用户不存在");
    }
    return R.ok(user);
}
```

## 三、进阶版：常见异常场景一网打尽

基础版只能处理我们自己抛出的异常，实际开发中还有很多常见的异常场景需要我们特殊处理。

### 3.1 参数校验异常

Spring Boot集成JSR-380参数校验后，校验失败会抛出`MethodArgumentNotValidException`，我们需要把它的错误信息友好地返回给前端：

```java
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.stream.Collectors;

/**
 * 处理参数校验异常
 */
@ExceptionHandler(MethodArgumentNotValidException.class)
public R<Void> handleValidationException(MethodArgumentNotValidException e) {
    String msg = e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining("；"));
    log.warn("参数校验失败：{}", msg);
    return R.fail(400, msg);
}
```

### 3.2 请求参数缺失异常

如果接口路径参数或者请求参数缺失，会抛出`MissingServletRequestParameterException`：

```java
import org.springframework.web.bind.MissingServletRequestParameterException;

@ExceptionHandler(MissingServletRequestParameterException.class)
public R<Void> handleMissingParamException(MissingServletRequestParameterException e) {
    String msg = "参数缺失：" + e.getParameterName();
    log.warn(msg);
    return R.fail(400, msg);
}
```

### 3.3 请求方式不支持异常

比如接口是POST请求，你用GET访问了，会抛出`HttpRequestMethodNotSupportedException`：

```java
import org.springframework.web.HttpRequestMethodNotSupportedException;

@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
public R<Void> handleMethodNotSupportedException(HttpRequestMethodNotSupportedException e) {
    String msg = "请求方式不支持：" + e.getMethod();
    log.warn(msg);
    return R.fail(405, msg);
}
```

### 3.4 404资源不存在异常

Spring Boot默认情况下，找不到接口会返回默认的Whitelabel错误页面，我们需要把它也统一成JSON格式。

首先在application.yml中配置：

```yaml
spring:
  mvc:
    throw-exception-if-no-handler-found: true
  web:
    resources:
      add-mappings: false
```

然后添加异常处理：

```java
import org.springframework.web.servlet.NoHandlerFoundException;

@ExceptionHandler(NoHandlerFoundException.class)
public R<Void> handleNoHandlerFoundException(NoHandlerFoundException e) {
    String msg = "接口不存在：" + e.getRequestURL();
    log.warn(msg);
    return R.fail(404, msg);
}
```

## 四、生产级：异常码枚举 + 自定义断言

真正到了生产环境，我们不能到处写魔法值一样的异常码和异常信息，最好的方式是封装成异常码枚举，再配合断言让代码更简洁。

### 4.1 异常码枚举

```java
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ResultCode {
    SUCCESS(200, "操作成功"),
    PARAM_ERROR(400, "参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "没有权限访问"),
    NOT_FOUND(404, "资源不存在"),
    METHOD_NOT_ALLOWED(405, "请求方式不支持"),
    BUSINESS_ERROR(500, "业务处理失败"),
    SYSTEM_ERROR(500, "系统繁忙，请稍后再试");

    private final Integer code;
    private final String msg;
}
```

### 4.2 断言工具类

封装一个断言工具类，让抛出异常更优雅：

```java
public abstract class Assert {

    public static void notNull(Object obj, String msg) {
        if (obj == null) {
            throw new BusinessException(msg);
        }
    }

    public static void notNull(Object obj, ResultCode resultCode) {
        if (obj == null) {
            throw new BusinessException(resultCode.getCode(), resultCode.getMsg());
        }
    }

    public static void isTrue(boolean expression, String msg) {
        if (!expression) {
            throw new BusinessException(msg);
        }
    }

    public static void isTrue(boolean expression, ResultCode resultCode) {
        if (!expression) {
            throw new BusinessException(resultCode.getCode(), resultCode.getMsg());
        }
    }
}
```

使用起来非常简洁：

```java
@GetMapping("/user/{id}")
public R<User> getUser(@PathVariable Long id) {
    User user = userService.getById(id);
    Assert.notNull(user, "用户不存在");
    // 或者使用枚举
    // Assert.notNull(user, ResultCode.NOT_FOUND);
    return R.ok(user);
}
```

## 五、避坑指南：这些问题90%的人都踩过

### 5.1 注意@RestControllerAdvice的扫描范围

如果你的全局异常处理器和启动类不在同一个包或者子包下，Spring是扫描不到的！一定要确保启动类能扫描到这个类。

### 5.2 异常处理器的顺序问题

如果多个异常处理器都能匹配到同一个异常，**最具体的异常会优先匹配**。比如你同时有Exception和BusinessException的处理器，抛出BusinessException时一定会进入BusinessException的处理方法，这个不用担心。

### 5.3 不要在异常处理器中再抛出异常

这个很好理解，如果你的异常处理方法自己又抛出了异常，那这个异常就没人处理了，会直接返回500错误给前端。

### 5.4 生产环境一定要打印完整异常栈

很多人打日志的时候只打e.getMessage()，这样出了问题根本找不到异常是在哪一行抛出的。正确的做法是直接把异常对象作为参数传给log方法，这样会打印完整的异常栈信息。

```java
// 错误写法
log.error("系统异常：" + e.getMessage());

// 正确写法
log.error("系统异常", e);
```

### 5.5 不要捕获异常后吞掉异常

绝对不要写空的catch块！这会导致异常被静默吞掉，出了问题你根本不知道哪里错了：

```java
// 绝对禁止的写法！
try {
    // 业务代码
} catch (Exception e) {
    // 什么都不做
}
```

## 六、总结

核心要点回顾：

1. 使用`@RestControllerAdvice` + `@ExceptionHandler`实现全局异常拦截
2. 统一响应格式，所有接口返回标准结构
3. 自定义业务异常，配合断言工具类让代码更简洁
4. 覆盖参数校验、404、请求方式错误等常见场景
5. 生产环境注意异常栈打印和扫描范围问题
