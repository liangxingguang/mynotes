# Netty源码分析(28) — Promise 与 自定义异步结果

## 背景与问题

上一期我们聊了 ChannelFuture，知道了 Netty 的所有 I/O 操作都是异步的——你调用 `connect()`、`write()`、`close()` 的时候，它们不会马上执行完毕，而是返回一个 ChannelFuture 对象，你可以在上面挂 listener，等操作完成再回调。

但是不知道你有没有想过一个问题：**你自己写代码的时候，怎么创建一个 Future？**

举个例子，你写了一个异步的服务调用：

```
public ChannelFuture doSomethingAsync(String input) {    // 这里怎么返回一个 ChannelFuture？}
```

你总不能真的去 new 一个 ChannelFuture 吧？它是接口。就算你用它的实现类 `DefaultChannelPromise`，它的构造方法还需要传 Channel 和 EventLoop，跟你这个场景八竿子打不着。

这就是 Netty 设计 `Promise` 的初衷。**Promise 就是 "可写的 Future"**——它继承自 Future，但多了 `setSuccess()`、`setFailure()`、`trySuccess()` 等方法，让你可以手动完成一个异步操作。

说白了：

*   **Future**：只读的，你只能查结果、加监听器
*   **Promise**：可写的，你可以在某个时刻主动把结果塞进去

这个模式在 Guava 里叫 `SettableFuture`，在 JDK 里叫 `CompletableFuture`，但在 Netty 里，它就叫 **Promise**。

## 核心源码

### 1\. Promise 接口

先看看 Promise 长什么样。打开 Netty 源码的 `io.netty.util.concurrent.Promise`：

```
// Promise.java — Netty 4.1public interface Promise<V> extends Future<V> {    // 标记成功，设置结果    Promise<V> setSuccess(V result);    // 标记成功，但只有当前未完成时才生效（不抛异常）    boolean trySuccess(V result);    // 标记失败，设置异常    Promise<V> setFailure(Throwable cause);    // 标记失败，只有当前未完成时才生效    boolean tryFailure(Throwable cause);    // 下面这些是从 Future 继承来的    // boolean isSuccess();    // V get();    // Promise<V> addListener(GenericFutureListener<? extends Future<? super V>> listener);    // Promise<V> sync() throws InterruptedException;    // ...}
```

看到没？关键就是多出来的那几个 `set/trySuccess/Failure`。

`setSuccess` 和 `trySuccess` 的区别：

*   **`setSuccess(result)`**：如果已经完成，抛 `IllegalStateException`
*   **`trySuccess(result)`**：如果已经完成，返回 false，不抛异常

现在你明白为什么叫 "Promise" 了吧？**我承诺将来会给你一个结果，我现在来兑现这个承诺。**

### 2\. DefaultPromise — 核心实现

最核心的实现类是 `DefaultPromise`，一口气干了好几件事：结果存储、监听器管理、线程同步、异常处理。

```
// DefaultPromise.java — 核心字段public class DefaultPromise<V> implements Promise<V> {    // 结果。用一个特殊的 AtomicReferenceFieldUpdater 做 CAS 更新    private volatile Object result;    // 所有的监听器，用一个链表串起来    private Object listeners;    // 等待结果的线程（用于 sync/await 阻塞唤醒）    private short waiters;    // 是否发生了通知（避免重复通知监听器）    private boolean notifyingListeners;    // 结果对象的特殊编码：    // 如果 result 是 SUCCESS，表示成功但结果为 null（Void 类型）    // 如果 result 是 UNCANCELLABLE，表示不允许取消    // 如果 result 是 Failure 实例，表示失败    // 否则就是正常的成功结果    private static final Object SUCCESS = new Object();    private static final Object UNCANCELLABLE = new Object();    // 用 AtomicReferenceFieldUpdater 做无锁更新 result    private static final AtomicReferenceFieldUpdater<DefaultPromise<V>, Object> RESULT_UPDATER =            AtomicReferenceFieldUpdater.newUpdater(DefaultPromise.class, Object.class, "result");}
```

这里有个很有意思的设计——**用 `AtomicReferenceFieldUpdater` 而不是直接给 result 加 volatile**。为什么？因为 `AtomicReferenceFieldUpdater` 本质上是 Unsafe 的封装，比 volatile 字段更灵活，可以做到 CAS 更新，而且不需要把整个类搞成 Atomic 的。这个是 Netty 的老传统了，能用 Unsafe 级别的就用。

看看 setSuccess 是怎么工作的：

```
// DefaultPromise.java — setSuccesspublic Promise<V> setSuccess(V result) {    // 尝试 CAS 设置结果    if (setSuccess0(result)) {        // 成功了！通知所有监听器        notifyListeners();        return this;    }    // 失败说明已经设置过了    throw new IllegalStateException("complete already: " + this);}private boolean setSuccess0(V result) {    // 用 CAS 把 result 从 null 改成成功结果    return casResult(result == null ? SUCCESS : result);}private boolean casResult(Object expected, Object newValue) {    return RESULT_UPDATER.compareAndSet(this, expected, newValue);}public boolean trySuccess(V result) {    // 和 setSuccess 一样，但失败了也不抛异常    if (setSuccess0(result)) {        notifyListeners();        return true;    }    return false;}
```

### 3\. 监听器通知机制

监听器的存储和通知是 DefaultPromise 最巧妙的设计之一，用一个 **对象** 同时存储单个和多个监听器：

```
// DefaultPromise.java — 监听器存储public Promise<V> addListener(GenericFutureListener<? extends Future<? super V>> listener) {    synchronized (this) {        addListener0(listener);    }    // 如果已经完成了，立即通知（防止丢失通知）    if (isDone()) {        notifyListeners();    }    return this;}private void addListener0(GenericFutureListener<? extends Future<? super V>> listener) {    if (listeners == null) {        // 首次添加，直接存单个        listeners = listener;    } else if (listeners instanceof DefaultFutureListeners) {        // 已经是数组了，追加        ((DefaultFutureListeners) listeners).add(listener);    } else {        // 当前是单个，升级成 DefaultFutureListeners        listeners = new DefaultFutureListeners(                (GenericFutureListener<?>) listeners, listener);    }}
```

这个设计挺有意思的。大多数 Promise 只会有 1 个监听器（框架内部用的场景），所以没必要一上来就开数组。等到真的加了第二个，才升级成数组——**懒加载的思想，性能抠到极致。**

再看通知过程：

```
// DefaultPromise.java — 通知监听器private void notifyListeners() {    // 用 EventExecutor 执行，确保在正确的线程里    EventExecutor executor = executor();    if (executor.inEventLoop()) {        // 已经在 EventLoop 里了，直接通知        notifyListenersNow();    } else {        // 不在 EventLoop 里，提交任务        safeExecute(executor, new Runnable() {            public void run() {                notifyListenersNow();            }        });    }}private void notifyListenersNow() {    synchronized (this) {        // 防止递归通知        if (notifyingListeners || listeners == null) {            return;        }        notifyingListeners = true;    }    try {        // 遍历所有监听器并调用 operationComplete        Object listeners = this.listeners;        if (listeners instanceof DefaultFutureListeners) {            // 批量通知            notifyListeners0((DefaultFutureListeners) listeners);        } else {            // 单个通知            ((GenericFutureListener<?>) listeners).operationComplete(this);        }    } finally {        // 清理        this.listeners = null;        notifyingListeners = false;    }}
```

注意到没？**如果已经完成了，addListener 时会立即检查 isDone()，然后触发通知**。这个细节特别重要——你异步调用的结果可能在添加监听器之前就已经返回了，如果不在 addListener 里检查一次，这个监听器永远等不到通知。

### 4\. await() 与 sync() 的阻塞机制

`sync()` 和 `await()` 都能阻塞当前线程直到 Promise 完成，区别在于：

*   **await()**：阻塞等待，中断了也不抛异常，只设置中断标志
*   **sync()**：阻塞等待，中断了直接抛 InterruptedException

```
// DefaultPromise.java — awaitpublic Promise<V> await() throws InterruptedException {    // 已经完成了，直接返回    if (isDone()) {        return this;    }    // 检查中断    if (Thread.interrupted()) {        throw new InterruptedException();    }    // 加锁等待    synchronized (this) {        while (!isDone()) {            incWaiters();  // waiters++            try {                wait();  // 调用 Object.wait() 阻塞            } finally {                decWaiters();  // waiters--            }        }    }    return this;}// DefaultPromise.java — syncpublic Promise<V> sync() throws InterruptedException {    await();    // 如果失败了，重新抛出异常（await 不会检查结果）    rethrowIfFailed();    return this;}
```

你看，`sync()` 内部调用了 `await()`，但多做了两件事：

1.  检查中断状态并抛 InterruptedException
2.  完成后检查结果，如果失败重新抛出异常

所以**日常开发建议用 sync() 而不是 await()**，因为 sync 会帮你把异常传播出来。

反过来，`setSuccess()` 里做了什么事来唤醒阻塞的线程？

```
private boolean setSuccess0(V result) {    return casResult(null, result == null ? SUCCESS : result);}
```

咦？里面并没有调用 `notify()` 啊？答案在 `notifyListeners()` 里：

```
private void notifyListeners() {    EventExecutor executor = executor();    if (executor.inEventLoop()) {        notifyListenersNow();    } else {        safeExecute(executor, new Runnable() {            public void run() {                notifyListenersNow();            }        });    }}// 但等等，notifyListenersNow 里也没有 notify() 啊？
```

确实，**setSuccess 本身不调用 notify()**。那等待的线程怎么醒过来？

答案是：**如果在 EventLoop 里调用 setSuccess，同一个 EventLoop 里不可能有线程在等待**（EventLoop 是单线程的，自己在处理任务怎么可能自己 wait 自己？）。如果是从外部线程设置结果，`notifyListeners()` 会通过 `safeExecute` 把通知任务提交到 EventLoop，而唤醒等待线程的 `notify()` 其实是...

我们再仔细看，`await()` 方法里用的是 `Object.wait()`，对应的 `Object.notify()` 在哪里呢？

```
// DefaultPromise 的某个地方...// 查！在 notifyListeners 的最终路径里？
```

我翻遍源码，发现一个很多人忽略的点：**DefaultPromise 的 setSuccess/trySuccess 路径上，通知监听器时不会 notify 等待线程。** 那线程怎么醒的？答案是 **listener 的 `operationComplete()` 已经被触发了，而如果你是通过 sync() 等待的，你的线程不在 EventLoop 里，不会自己醒——这就要靠 listener 内部的机制来唤醒**。

等等，这个说法不对。我再仔细确认一下。

实际上，正确的答案是：**`setSuccess0` 调用 `notifyListeners()`，而 `notifyListeners()` 会判断当前是否在 EventLoop 中。如果不在 EventLoop 中（比如从外部线程设置结果），它就直接在当前线程执行 `notifyListenersNow()`。而在 `notifyListenersNow()` 里，除了调用 listener 的 operationComplete 之外，还应该有一段唤醒逻辑。**

但我确实没找到显式的 `notify()` 调用。这就引出了 Netty 的一个设计选择：**DefaultPromise 的阻塞唤醒依赖的是 listener 机制本身。** 如果你用 `sync()`，它会在内部创建一个 listener，当 Promise 完成时，listener 会负责唤醒阻塞线程。

我们看 `sync()` 内部的实现路径：

```
// 实际上，sync() 是这样工作的// 在 DefaultPromise 中并没有为 sync() 创建特殊的 listener// 而是 await() 使用 Object.wait()，对应的 Object.notify() 在哪里？
```

我再仔细看看... 好吧，我坦白，Netty 4.1 的 DefaultPromise 中，`setSuccess0` / `setFailure0` 确实**会调用 `notifyAll()`**。它在 `notifyListeners()` 之前的某个路径里。让我找一下正确的代码：

实际上，在较新版本的 Netty 中，`notifyListeners()` 的调用之前，会有一个 `checkNotifyWaiters()` 或类似的唤醒逻辑。但在 4.1.x 中，这个逻辑藏在：

```
// DefaultPromise 中 — 唤醒等待线程的地方// 实际上是在 setSuccess0 和 setFailure0 内部private boolean setSuccess0(V result) {    return setValue0(result == null ? SUCCESS : result);}private boolean setValue0(Object objResult) {    if (RESULT_UPDATER.compareAndSet(this, null, objResult) ||        RESULT_UPDATER.compareAndSet(this, UNCANCELLABLE, objResult)) {        // CAS 成功后，检查是否有等待线程        if (checkNotifyWaiters()) {            // 唤醒            notifyListeners();        }        return true;    }    return false;}// 这里 checkNotifyWaiters 里做了 notifyAll()private boolean checkNotifyWaiters() {    // 没有 waiter，不需要 notify    if (waiters > 0) {        // 关键！notifyAll 在这里        notifyAll();    }    return listeners != null;}
```

**破案了！**`checkNotifyWaiters()` 在成功设置结果后，如果发现有线程在等待（`waiters > 0`），就调用 `notifyAll()` 唤醒所有等待线程。然后才去通知监听器。

这就完美了——**先唤醒 wait 的线程，再通知 listener。** 两个路径都能收到完成信号。

### 5\. 取消机制

Promise 支持取消，这个在 JDK 的 Future 里也有：

```
// DefaultPromise.java — 取消public boolean cancel(boolean mayInterruptIfRunning) {    // 尝试 CAS 把 result 设为 CANCELLABLE    if (RESULT_UPDATER.compareAndSet(this, null, CANCELLABLE)) {        // 检查是否有等待线程        if (checkNotifyWaiters()) {            notifyListeners();        }        return true;    }    return false;}public boolean isCancelled() {    return result == CANCELLABLE;}public boolean isDone() {    return result != null;}
```

这里有个有意思的地方。`isDone()` 的实现仅仅是判断 `result != null`，所以**一旦 Promise 被取消，`isDone()` 也返回 true**。这意味着你不能通过 `get()` 获取结果了，会抛 `CancellationException`。

## 原理分析

### 状态机

Promise 本质上是一个简单的三状态状态机：

```
                   ┌──────────┐         ┌─────────│  SUCCESS │ (result != null && isSuccess)         │         └──────────┘         │┌───────┴──┐     ┌──────────┐│  PENDING │ ───→│  FAILURE │ (result instanceof CauseHolder)│ (null)   │     └──────────┘└───────┬──┘         │         ┌────────────┐         └─────────│ CANCELLED  │ (result == CANCELLABLE)                   └────────────┘
```

*   **PENDING**：初始状态，result == null
*   **SUCCESS**：成功完成，result 是实际值或 SUCCESS 标志
*   **FAILURE**：失败，result 是 `CauseHolder` 包装的异常
*   **CANCELLED**：取消，result == CANCELLABLE

从 PENDING 出发，只能到达一个终点，**不可逆**。

### 设计模式

1.  **Promise 模式** — 本身就是一个经典异步编程模式，对应于 `SettableFuture` / `CompletableFuture`
2.  **观察者模式** — 监听器通过 `addListener` 注册，完成时统一通知
3.  **状态机模式** — 结果状态转换有严格的 CAS 控制
4.  **模板方法模式** — `setSuccess` 和 `trySuccess` 共用 `setSuccess0`

### 相对于 CompletableFuture

很多人会问：**JDK 8 的 CompletableFuture 不比你这个强多了？什么 thenApply、thenCompose、allOf 全都有，Netty 为什么还要自己搞一套？**

原因很简单：

1.  **EventLoop 亲和性** — Netty 的 Promise 知道 EventLoop，确保 listener 在正确的线程上执行
2.  **性能** — DefaultPromise 比 CompletableFuture 轻量得多，没有那些函数式编程的 overhead
3.  **Channel 关联** — Promise 可以关联 Channel，方便做 pipeline 传播
4.  **历史原因** — Netty 4 出来的时候 JDK 8 还没发布呢

## 使用示例

下面写一个完整的例子，展示怎么用 Promise 来自定义异步结果。

### 场景：模拟一个异步 RPC 调用

```
import io.netty.util.concurrent.DefaultPromise;import io.netty.util.concurrent.EventExecutor;import io.netty.util.concurrent.GlobalEventExecutor;import io.netty.util.concurrent.Promise;import java.util.concurrent.TimeUnit;/** * 模拟一个异步 RPC 调用的服务端 */public class AsyncRpcService {    private final EventExecutor executor;    public AsyncRpcService(EventExecutor executor) {        this.executor = executor;    }    /**     * 模拟异步 RPC 调用，返回 Promise     */    public Promise<String> call(String request) {        // 创建一个 Promise        Promise<String> promise = new DefaultPromise<>(executor);        // 模拟异步处理：1秒后返回结果        executor.schedule(() -> {            try {                // 模拟处理逻辑                String result = processRequest(request);                // 手动设置成功结果                promise.setSuccess(result);            } catch (Exception e) {                // 手动设置失败结果                promise.setFailure(e);            }        }, 1, TimeUnit.SECONDS);        return promise;    }    private String processRequest(String request) {        // 模拟：如果请求是 "error" 就抛异常        if ("error".equals(request)) {            throw new RuntimeException("模拟处理失败");        }        return "【响应】: " + request + " 处理完成";    }    // ----- 使用示例 -----    public static void main(String[] args) throws Exception {        AsyncRpcService service = new AsyncRpcService(GlobalEventExecutor.INSTANCE);        System.out.println("===== 方式1: sync 阻塞等待 =====");        Promise<String> p1 = service.call("hello");        // sync() 会阻塞直到完成，完成后再检查异常        p1.sync();        System.out.println("结果: " + p1.get());        System.out.println(" ===== 方式2: addListener 回调 =====");        Promise<String> p2 = service.call("world");        p2.addListener(future -> {            if (future.isSuccess()) {                System.out.println("回调成功: " + future.get());            } else {                System.out.println("回调失败: " + future.cause());            }        });        System.out.println(" ===== 方式3: trySuccess 不抛异常 =====");        Promise<String> p3 = service.call("test");        p3.addListener(future -> System.out.println("结果: " + future.getNow()));        // trySuccess 完成，即使已经有结果也不抛异常        boolean ok = p3.trySuccess("手动覆盖");        System.out.println("覆盖结果: " + ok); // false（因为真正的结果先到了）或 true        System.out.println(" ===== 方式4: 异常处理 =====");        Promise<String> p4 = service.call("error");        p4.addListener(future -> {            if (future.isSuccess()) {                System.out.println("成功: " + future.get());            } else {                System.out.println("捕获异常: " + future.cause().getMessage());            }        });        System.out.println(" ===== 方式5: 等待所有 Promise =====");        Promise<String> pa = service.call("A");        Promise<String> pb = service.call("B");        Promise<String> pc = service.call("C");        // 简单等待所有完成（没有 CompletableFuture.allOf 那样优雅，但够用）        pa.sync();        pb.sync();        pc.sync();        System.out.println("A: " + pa.get());        System.out.println("B: " + pb.get());        System.out.println("C: " + pc.get());        // 等待异步回调执行完毕（GlobalEventExecutor 的优雅关闭）        Thread.sleep(2000);    }}
```

### 更真实的场景：封装第三方异步库

```
import io.netty.channel.Channel;import io.netty.util.concurrent.DefaultPromise;import io.netty.util.concurrent.EventExecutor;import io.netty.util.concurrent.Promise;/** * 将基于回调的 API 包装成 Promise */public class CallbackToPromiseAdapter {    /**     * 假设我们有个第三方 SDK，调用方式是这样的：     * sdk.query("xxx", new Callback() {     *     void onSuccess(Result r) { }     *     void onFailure(Throwable t) { }     * });     *     * 我们希望改成 Promise 风格：     * Promise<Result> p = adapter.query("xxx");     * p.addListener(f -> handleResult(f.get()));     */    public static Promise<Result> query(ThirdPartySdk sdk, String input, EventExecutor executor) {        Promise<Result> promise = new DefaultPromise<>(executor);        sdk.query(input, new ThirdPartySdk.Callback() {            @Override            public void onSuccess(Result result) {                // SDK 的回调可能在任意线程，Promise 会确保 listener 在 executor 里执行                promise.setSuccess(result);            }            @Override            public void onFailure(Throwable cause) {                promise.setFailure(cause);            }        });        return promise;    }    // 模拟    static class Result {        String data;    }    static class ThirdPartySdk {        interface Callback {            void onSuccess(Result r);            void onFailure(Throwable t);        }        void query(String input, Callback cb) {            // 模拟异步            new Thread(() -> {                try {                    Thread.sleep(500);                    Result r = new Result();                    r.data = "data for " + input;                    cb.onSuccess(r);                } catch (Exception e) {                    cb.onFailure(e);                }            }).start();        }    }}
```

## 源码阅读心得

说实话，读 DefaultPromise 的源码给了我挺多想法的。

**第一，CAS + AtomicReferenceFieldUpdater 的组合在 Netty 里真的无处不在。** 它比 synchronized 粒度更细，比 AtomicReference 更节省对象头。Netty 在性能上的执念，从这个小小的字段更新器上就可见一斑。

**第二，监听器的懒加载设计很妙。** DefaultPromise 只用了一个 Object 字段来存监听器，首次是单个对象，二次才升级为数组。这种"能省则省"的设计哲学贯穿 Netty 始终——对比一下，很多 Java 开发者不管三七二十一上来先 new ArrayList，这种习惯在 Netty 源码里会被批得体无完肤（手动狗头）。

**第三，EventLoop 亲和性真的很重要。** 很多框架的 Future 在回调线程上执行 listener，结果用户在里面调了 Netty 的 API，就出并发问题了。DefaultPromise 在 notifyListeners 的时候会判断当前线程是不是 EventLoop，如果不是就提交到 EventLoop 执行——**这个守护让无数 Netty 使用者少踩了坑**，而且他们甚至没意识到这个机制的存在。

**第四，sync() 和 await() 的区别一定要记清楚。** sync() 会异常传播，await() 不会。我早期写 Netty 代码的时候在这上面吃过亏——await 完了以为成功了，结果 get() 直接来了个 ExecutionException，一脸懵逼。

## 注意事项

### 1\. 不要在 EventLoop 里调用 sync()/await()

```
// ❌ 错误！会导致死锁public void channelRead(ChannelHandlerContext ctx, Object msg) {    channel.write(msg).sync();  // EventLoop 自己阻塞自己}// ✅ 正确做法：用 listenerpublic void channelRead(ChannelHandlerContext ctx, Object msg) {    channel.write(msg).addListener(future -> {        if (future.isSuccess()) {            // 写成功了        }    });}
```

**原因**：EventLoop 是单线程的，你在里面调用 sync() 会让它把自己等死——setSuccess 需要 EventLoop 处理，但 EventLoop 在等你，你在等它完成，死锁！

### 2\. trySuccess 优先于 setSuccess

如果你不确定 Promise 是否已经被完成，用 `trySuccess` 而不是 `setSuccess`。`setSuccess` 抛异常，`trySuccess` 返回 false。

```
// 好的if (!promise.trySuccess(result)) {    // 已经被完成了，可能是超时取消了}// 不好的promise.setSuccess(result);  // 如果已经完成，抛异常
```

### 3\. 注意 Promise 的线程安全性

DefaultPromise 是线程安全的——它的 result 字段用 CAS 保证原子性，listener 操作有 synchronized 保护——但**它的 listener 回调执行在 EventLoop 里**。如果你在多个线程里同时 setSuccess，第一个 CAS 成功的线程会触发通知，后面的会失败。

### 4\. 取消可能引发的问题

```
Promise<String> p = new DefaultPromise<>(executor);p.cancel(false);p.addListener(f -> {    // 这个 listener 立刻被触发，因为 isDone() 已经为 true    // 但是 f.isSuccess() == false, f.isCancelled() == true});
```

取消后 `isDone()` 返回 true，所以 `addListener` 会立即触发通知，而不是等以后。这可能导致一些微妙的时序问题。

### 5\. 不要共享 Promise

Promise 不是设计成可以跨多个消费者共享的。如果你需要多个地方同时等待一个结果，应该在每个地方创建自己的 Promise，然后用一个共享的 `SettableFuture` 或类似机制去桥接。

### 6\. 性能考量

DefaultPromise 非常轻量：

*   **无锁路径**：读操作（isDone、isSuccess、getNow）全是 volatile 读，不阻塞
*   **写操作**：一次 CAS 搞定
*   **监听器**：单监听器场景没有数组分配，零 GC 压力

相比 `CompletableFuture`，它的性能优势很明显——如果你在做高吞吐、低延迟的网络编程，Netty 的 Promise 是更好的选择。

* * *

## 总结

Promise 是 Netty 异步编程的基石，它把"将来会完成的异步结果"这个抽象变成了可编程的工具。

| 特性 | Promise | CompletableFuture | JDK FutureTask |
| --- | --- | --- | --- |
| EventLoop 亲和性 | ✅ 原生支持 | ❌ 不支持 | ❌ 不支持 |
| 手动完成 | ✅ set/trySuccess | ✅ complete | ✅（通过 run 间接） |
| 监听器通知 | ✅ addListener | ✅ thenAccept | ❌ 无 |
| 阻塞等待 | ✅ sync/await | ✅ get | ✅ get |
| 异常传播 | ✅ sync 自动传播 | ✅ exceptionally | ❌ 手动处理 |
| GC 压力 | 极低 | 中等 | 中等 |

说实话，CompletableFuture 在功能丰富度上完胜，但是在 Netty 的世界里，Promise 就是王者——**轻、快、并且和 EventLoop 完美配合**。如果你在 Netty 里做异步编程，记住这句话：

> **Future 是只读的承诺，Promise 是可写的未来。**

下一篇我们会进入实战环节，把前面学的所有 Netty 知识串起来，实现一个简单的 RPC 框架，敬请期待！
