title: 异步任务优先级队列 + 抢占式执行：高优先级任务可插队，保障核心业务
source: 微信公众号（服务端技术精选）
source_url: https://mp.weixin.qq.com/s/1sMRD5s2p2XC_ij_yUB9Dw
source_type: article
platform: 微信公众号
captured: 2026-11-24
registered_at: 2026-11-24
inbox_ref: Inbox/2026-11-24-async-task-priority-queue-preemptive.md
asset_ref: Assets/2026/11/weixin-1sMRD5s2p2XC_ij_yUB9Dw.md

# 异步任务优先级队列 + 抢占式执行：高优先级任务可插队，保障核心业务

背景：异步任务的优先级困境

在实际开发中，我们经常遇到需要处理大量异步任务的场景，比如：

*   **订单处理**：支付订单、退款订单、普通订单
    
*   **消息推送**：紧急通知、普通通知、营销消息
    
*   **数据同步**：实时数据、定时数据、历史数据
    
*   **报表生成**：实时报表、日报表、月报表
    
*   **文件处理**：紧急文件、普通文件、归档文件
    

然而，传统的异步任务处理方式存在以下问题：

### 优先级无法区分

**问题**：所有任务按照提交顺序执行，无法区分任务优先级

```
@Asyncpublic void processOrder(Order order) {    // 所有订单按照提交顺序处理，无法区分优先级    process(order);}
```

**影响**：

*   紧急任务需要等待
    
*   核心业务被阻塞
    
*   用户体验差
    

### 资源分配不合理

**问题**：低优先级任务占用大量资源，高优先级任务无法及时执行

```
ThreadPoolExecutor executor = new ThreadPoolExecutor(    10, 20, 60, TimeUnit.SECONDS,    new LinkedBlockingQueue<>(100));// 所有任务共享同一个线程池，无法区分优先级
```

**影响**：

*   系统资源浪费
    
*   关键业务延迟
    
*   SLA 无法保障
    

### 抢占式执行困难

**问题**：正在执行的低优先级任务无法被高优先级任务抢占

```
// 低优先级任务正在执行，高优先级任务只能等待executor.submit(lowPriorityTask);  // 执行时间较长executor.submit(highPriorityTask); // 只能等待
```

**影响**：

*   高优先级任务延迟
    
*   系统响应慢
    
*   业务损失
    

## 核心概念：优先级队列与抢占式执行

### 1\. 优先级队列

**定义**：按照任务优先级排序的队列，高优先级任务优先执行

**特点**：

*   任务按照优先级排序
    
*   高优先级任务优先出队
    
*   支持动态调整优先级
    

**实现方式**：

*   PriorityBlockingQueue
    
*   自定义优先级队列
    
*   基于数据库的优先级队列
    

### 2\. 抢占式执行

**定义**：高优先级任务可以中断正在执行的低优先级任务

**特点**：

*   高优先级任务可以插队
    
*   低优先级任务可以被中断
    
*   支持任务恢复
    

**实现方式**：

*   线程中断
    
*   任务检查点
    
*   状态保存与恢复
    

### 3\. 优先级调度

**定义**：根据任务优先级动态调整执行顺序

**特点**：

*   动态优先级调整
    
*   公平性保障
    
*   防止饥饿
    

**实现方式**：

*   优先级继承
    
*   优先级衰减
    
*   优先级提升
    

### 4\. 资源隔离

**定义**：不同优先级的任务使用不同的资源池

**特点**：

*   资源隔离
    
*   防止资源竞争
    
*   保障核心业务
    

**实现方式**：

*   多线程池
    
*   资源配额
    
*   动态资源分配
    

## 实现方案：优先级队列与抢占式执行

### 方案一：使用 PriorityBlockingQueue

**优点**：

*   JDK 原生支持
    
*   线程安全
    
*   性能好
    

**缺点**：

*   功能有限
    
*   不支持动态优先级调整
    
*   不支持抢占式执行
    

**代码实现**：

```
@Servicepublicclass PriorityTaskService {    privatefinal PriorityBlockingQueue<PriorityTask> taskQueue =             new PriorityBlockingQueue<>(100, Comparator.comparingInt(PriorityTask::getPriority).reversed());    privatefinal ExecutorService executor = Executors.newFixedThreadPool(10);    public void submitTask(Runnable task, int priority) {        PriorityTask priorityTask = new PriorityTask(task, priority);        taskQueue.put(priorityTask);    }    @PostConstruct    public void start() {        for (int i = 0; i < 10; i++) {            executor.submit(() -> {                while (true) {                    try {                        PriorityTask task = taskQueue.take();                        task.getTask().run();                    } catch (InterruptedException e) {                        Thread.currentThread().interrupt();                        break;                    }                }            });        }    }}
```

### 方案二：使用自定义优先级队列

**优点**：

*   功能灵活
    
*   支持动态优先级调整
    
*   支持抢占式执行
    

**缺点**：

*   实现复杂
    
*   需要手动管理线程安全
    
*   性能可能不如原生队列
    

**代码实现**：

```
@Servicepublicclass CustomPriorityTaskService {    privatefinal PriorityBlockingQueue<PriorityTask> taskQueue =             new PriorityBlockingQueue<>(100, Comparator.comparingInt(PriorityTask::getPriority).reversed());    privatefinal Map<String, PriorityTask> runningTasks = new ConcurrentHashMap<>();    privatefinal ExecutorService executor = Executors.newFixedThreadPool(10);    public void submitTask(String taskId, Runnable task, int priority) {        PriorityTask priorityTask = new PriorityTask(taskId, task, priority);        taskQueue.put(priorityTask);    }    public void updatePriority(String taskId, int newPriority) {        PriorityTask task = runningTasks.get(taskId);        if (task != null) {            task.setPriority(newPriority);            taskQueue.put(task);            runningTasks.remove(taskId);        }    }    @PostConstruct    public void start() {        for (int i = 0; i < 10; i++) {            executor.submit(() -> {                while (true) {                    try {                        PriorityTask task = taskQueue.take();                        runningTasks.put(task.getTaskId(), task);                                                if (task.getTask() instanceof InterruptibleTask) {                            InterruptibleTask interruptibleTask = (InterruptibleTask) task.getTask();                            interruptibleTask.executeWithInterruption(() -> {                                task.getTask().run();                                runningTasks.remove(task.getTaskId());                            });                        } else {                            task.getTask().run();                            runningTasks.remove(task.getTaskId());                        }                    } catch (InterruptedException e) {                        Thread.currentThread().interrupt();                        break;                    }                }            });        }    }}
```

### 方案三：使用 Spring @Async + 自定义线程池

**优点**：

*   集成 Spring 框架
    
*   配置简单
    
*   支持异步方法
    

**缺点**：

*   功能相对简单
    
*   不支持抢占式执行
    
*   优先级控制有限
    

**代码实现**：

```
@Servicepublicclass SpringAsyncTaskService {    @Async("highPriorityExecutor")    public void executeHighPriorityTask(Runnable task) {        task.run();    }    @Async("mediumPriorityExecutor")    public void executeMediumPriorityTask(Runnable task) {        task.run();    }    @Async("lowPriorityExecutor")    public void executeLowPriorityTask(Runnable task) {        task.run();    }}
```

### 方案四：使用 Resilience4j Bulkhead

**优点**：

*   功能强大
    
*   支持资源隔离
    
*   监控完善
    

**缺点**：

*   学习成本高
    
*   配置复杂
    
*   不支持抢占式执行
    

**代码实现**：

```
@Servicepublicclass Resilience4jTaskService {    privatefinal BulkheadRegistry bulkheadRegistry;    public Resilience4jTaskService(BulkheadRegistry bulkheadRegistry) {        this.bulkheadRegistry = bulkheadRegistry;    }    public void executeTask(Runnable task, String bulkheadName) {        Bulkhead bulkhead = bulkheadRegistry.bulkhead(bulkheadName);        Supplier<Void> supplier = Bulkhead.decorateSupplier(bulkhead, () -> {            task.run();            returnnull;        });        supplier.get();    }}
```

## 完整实现：优先级队列与抢占式执行

### 1\. 优先级任务定义

```
@Data@AllArgsConstructor@NoArgsConstructorpublicclass PriorityTask implements Comparable<PriorityTask> {        private String taskId;    private Runnable task;    privateint priority;    privatelong createTime;    privatelong timeout;    private TimeUnit timeoutUnit;    private TaskStatus status;    private String userId;    private String businessType;    private Map<String, Object> metadata;    public PriorityTask(String taskId, Runnable task, int priority) {        this.taskId = taskId;        this.task = task;        this.priority = priority;        this.createTime = System.currentTimeMillis();        this.status = TaskStatus.PENDING;        this.metadata = new HashMap<>();    }    @Override    public int compareTo(PriorityTask other) {        int priorityCompare = Integer.compare(other.priority, this.priority);        if (priorityCompare != 0) {            return priorityCompare;        }        return Long.compare(this.createTime, other.createTime);    }    publicenum TaskStatus {        PENDING, RUNNING, COMPLETED, FAILED, INTERRUPTED, TIMEOUT    }}
```

### 2\. 优先级队列服务

```
@Service@Slf4jpublicclass PriorityTaskQueueService {    privatefinal PriorityBlockingQueue<PriorityTask> taskQueue =             new PriorityBlockingQueue<>(1000, Comparator.comparingInt(PriorityTask::getPriority).reversed()                    .thenComparingLong(PriorityTask::getCreateTime));    privatefinal Map<String, PriorityTask> runningTasks = new ConcurrentHashMap<>();    privatefinal Map<String, PriorityTask> allTasks = new ConcurrentHashMap<>();    privatefinal AtomicInteger taskCounter = new AtomicInteger(0);    public String submitTask(Runnable task, int priority) {        String taskId = generateTaskId();        PriorityTask priorityTask = new PriorityTask(taskId, task, priority);        taskQueue.put(priorityTask);        allTasks.put(taskId, priorityTask);        log.info("Task submitted: taskId={}, priority={}", taskId, priority);        return taskId;    }    public String submitTask(Runnable task, int priority, String userId, String businessType) {        String taskId = generateTaskId();        PriorityTask priorityTask = new PriorityTask(taskId, task, priority);        priorityTask.setUserId(userId);        priorityTask.setBusinessType(businessType);        taskQueue.put(priorityTask);        allTasks.put(taskId, priorityTask);        log.info("Task submitted: taskId={}, priority={}, userId={}, businessType={}",                 taskId, priority, userId, businessType);        return taskId;    }    public void updatePriority(String taskId, int newPriority) {        PriorityTask task = allTasks.get(taskId);        if (task != null) {            int oldPriority = task.getPriority();            task.setPriority(newPriority);                        if (task.getStatus() == TaskStatus.PENDING) {                taskQueue.remove(task);                taskQueue.put(task);            }                        log.info("Task priority updated: taskId={}, oldPriority={}, newPriority={}",                     taskId, oldPriority, newPriority);        }    }    public PriorityTask takeTask() throws InterruptedException {        PriorityTask task = taskQueue.take();        task.setStatus(TaskStatus.RUNNING);        runningTasks.put(task.getTaskId(), task);        return task;    }    public void completeTask(String taskId) {        PriorityTask task = runningTasks.remove(taskId);        if (task != null) {            task.setStatus(TaskStatus.COMPLETED);            log.info("Task completed: taskId={}", taskId);        }    }    public void failTask(String taskId, Throwable error) {        PriorityTask task = runningTasks.remove(taskId);        if (task != null) {            task.setStatus(TaskStatus.FAILED);            log.error("Task failed: taskId={}, error={}", taskId, error.getMessage());        }    }    public void interruptTask(String taskId) {        PriorityTask task = runningTasks.get(taskId);        if (task != null) {            task.setStatus(TaskStatus.INTERRUPTED);            runningTasks.remove(taskId);            log.info("Task interrupted: taskId={}", taskId);        }    }    public TaskStatus getTaskStatus(String taskId) {        PriorityTask task = allTasks.get(taskId);        return task != null ? task.getStatus() : null;    }    public int getQueueSize() {        return taskQueue.size();    }    public int getRunningTaskCount() {        return runningTasks.size();    }    private String generateTaskId() {        return"task-" + System.currentTimeMillis() + "-" + taskCounter.incrementAndGet();    }}
```

### 3\. 抢占式执行服务

```
@Service@Slf4jpublicclass PreemptiveTaskExecutorService {    @Autowired    private PriorityTaskQueueService taskQueueService;    @Autowired    @Qualifier("taskExecutor")    private ExecutorService executor;    privatefinal Map<String, Thread> taskThreads = new ConcurrentHashMap<>();    @PostConstruct    public void start() {        int threadCount = 10;        for (int i = 0; i < threadCount; i++) {            executor.submit(this::executeTaskLoop);        }        log.info("Preemptive task executor started with {} threads", threadCount);    }    private void executeTaskLoop() {        while (true) {            try {                PriorityTask task = taskQueueService.takeTask();                String taskId = task.getTaskId();                                Thread currentThread = Thread.currentThread();                taskThreads.put(taskId, currentThread);                                try {                    log.info("Executing task: taskId={}, priority={}", taskId, task.getPriority());                                        if (task.getTask() instanceof InterruptibleTask) {                        InterruptibleTask interruptibleTask = (InterruptibleTask) task.getTask();                        interruptibleTask.executeWithInterruption(() -> {                            task.getTask().run();                        });                    } else {                        task.getTask().run();                    }                                        taskQueueService.completeTask(taskId);                } catch (InterruptedException e) {                    Thread.currentThread().interrupt();                    taskQueueService.interruptTask(taskId);                    log.warn("Task interrupted: taskId={}", taskId);                } catch (Exception e) {                    taskQueueService.failTask(taskId, e);                    log.error("Task execution failed: taskId={}", taskId, e);                } finally {                    taskThreads.remove(taskId);                }            } catch (InterruptedException e) {                Thread.currentThread().interrupt();                break;            }        }    }    public void preemptTask(String taskId) {        Thread thread = taskThreads.get(taskId);        if (thread != null) {            thread.interrupt();            log.info("Task preempted: taskId={}", taskId);        }    }    public boolean isTaskRunning(String taskId) {        return taskThreads.containsKey(taskId);    }}
```

### 4\. 可中断任务接口

```
public interface InterruptibleTask extends Runnable {        void executeWithInterruption(Runnable task) throws InterruptedException;        default void checkInterruption() throws InterruptedException {        if (Thread.currentThread().isInterrupted()) {            throw new InterruptedException("Task interrupted");        }    }}
```

### 5\. 优先级调度器

```
@Service@Slf4jpublicclass PrioritySchedulerService {    @Autowired    private PriorityTaskQueueService taskQueueService;    @Autowired    private PreemptiveTaskExecutorService executorService;    @Scheduled(fixedRate = 1000)    public void schedulePriorityAdjustment() {        adjustPriorityBasedOnWaitTime();    }    @Scheduled(fixedRate = 5000)    public void schedulePreemptiveExecution() {        checkAndPreemptLowPriorityTasks();    }    private void adjustPriorityBasedOnWaitTime() {        long currentTime = System.currentTimeMillis();                taskQueueService.getAllTasks().values().stream()                .filter(task -> task.getStatus() == TaskStatus.PENDING)                .forEach(task -> {                    long waitTime = currentTime - task.getCreateTime();                    int currentPriority = task.getPriority();                                        if (waitTime > 60000 && currentPriority < 5) {                        taskQueueService.updatePriority(task.getTaskId(), currentPriority + 1);                        log.info("Task priority boosted: taskId={}, oldPriority={}, newPriority={}, waitTime={}ms",                                 task.getTaskId(), currentPriority, currentPriority + 1, waitTime);                    }                });    }    private void checkAndPreemptLowPriorityTasks() {        int runningTaskCount = taskQueueService.getRunningTaskCount();        int queueSize = taskQueueService.getQueueSize();                if (runningTaskCount > 0 && queueSize > 0) {            PriorityTask highestPendingTask = taskQueueService.getHighestPriorityPendingTask();            if (highestPendingTask != null && highestPendingTask.getPriority() > 8) {                String lowestRunningTaskId = taskQueueService.getLowestPriorityRunningTaskId();                if (lowestRunningTaskId != null) {                    PriorityTask lowestRunningTask = taskQueueService.getTask(lowestRunningTaskId);                    if (lowestRunningTask != null && lowestRunningTask.getPriority() < 5) {                        executorService.preemptTask(lowestRunningTaskId);                        log.info("Preempted low priority task: taskId={}, priority={}, preemptedBy={}",                                 lowestRunningTaskId, lowestRunningTask.getPriority(), highestPendingTask.getTaskId());                    }                }            }        }    }}
```

### 6\. 任务监控服务

```
@Service@Slf4jpublicclass TaskMonitorService {    @Autowired    private PriorityTaskQueueService taskQueueService;    public TaskMonitorInfo getMonitorInfo() {        TaskMonitorInfo info = new TaskMonitorInfo();                info.setQueueSize(taskQueueService.getQueueSize());        info.setRunningTaskCount(taskQueueService.getRunningTaskCount());        info.setTotalTaskCount(taskQueueService.getAllTasks().size());                Map<TaskStatus, Long> statusCount = taskQueueService.getAllTasks().values().stream()                .collect(Collectors.groupingBy(PriorityTask::getStatus, Collectors.counting()));                info.setPendingCount(statusCount.getOrDefault(TaskStatus.PENDING, 0L).intValue());        info.setRunningCount(statusCount.getOrDefault(TaskStatus.RUNNING, 0L).intValue());        info.setCompletedCount(statusCount.getOrDefault(TaskStatus.COMPLETED, 0L).intValue());        info.setFailedCount(statusCount.getOrDefault(TaskStatus.FAILED, 0L).intValue());        info.setInterruptedCount(statusCount.getOrDefault(TaskStatus.INTERRUPTED, 0L).intValue());                info.setTimestamp(System.currentTimeMillis());                return info;    }    public List<TaskStatistics> getTaskStatistics() {        return taskQueueService.getAllTasks().values().stream()                .collect(Collectors.groupingBy(PriorityTask::getBusinessType))                .entrySet().stream()                .map(entry -> {                    TaskStatistics stats = new TaskStatistics();                    stats.setBusinessType(entry.getKey());                    stats.setTotalCount(entry.getValue().size());                                        long completedCount = entry.getValue().stream()                            .filter(task -> task.getStatus() == TaskStatus.COMPLETED)                            .count();                    stats.setCompletedCount((int) completedCount);                                        long avgExecutionTime = entry.getValue().stream()                            .filter(task -> task.getStatus() == TaskStatus.COMPLETED)                            .mapToLong(task -> task.getExecutionTime())                            .average()                            .orElse(0);                    stats.setAvgExecutionTime(avgExecutionTime);                                        return stats;                })                .collect(Collectors.toList());    }}
```

### 7\. 任务管理控制器

```
@RestController@RequestMapping("/api/task")@Slf4jpublicclass TaskManagementController {    @Autowired    private PriorityTaskQueueService taskQueueService;    @Autowired    private PreemptiveTaskExecutorService executorService;    @Autowired    private TaskMonitorService monitorService;    @PostMapping("/submit")    public Result<String> submitTask(@RequestBody TaskSubmitRequest request) {        try {            Runnable task = createTask(request);            String taskId = taskQueueService.submitTask(task, request.getPriority(),                     request.getUserId(), request.getBusinessType());            return Result.success(taskId);        } catch (Exception e) {            log.error("Failed to submit task", e);            return Result.error(500, e.getMessage());        }    }    @PostMapping("/update-priority")    public Result<String> updatePriority(@RequestBody PriorityUpdateRequest request) {        try {            taskQueueService.updatePriority(request.getTaskId(), request.getNewPriority());            return Result.success("Priority updated");        } catch (Exception e) {            log.error("Failed to update priority", e);            return Result.error(500, e.getMessage());        }    }    @DeleteMapping("/cancel/{taskId}")    public Result<String> cancelTask(@PathVariable String taskId) {        try {            executorService.preemptTask(taskId);            return Result.success("Task cancelled");        } catch (Exception e) {            log.error("Failed to cancel task", e);            return Result.error(500, e.getMessage());        }    }    @GetMapping("/status/{taskId}")    public Result<TaskStatus> getTaskStatus(@PathVariable String taskId) {        try {            TaskStatus status = taskQueueService.getTaskStatus(taskId);            return Result.success(status);        } catch (Exception e) {            log.error("Failed to get task status", e);            return Result.error(500, e.getMessage());        }    }    @GetMapping("/monitor")    public Result<TaskMonitorInfo> getMonitorInfo() {        try {            TaskMonitorInfo info = monitorService.getMonitorInfo();            return Result.success(info);        } catch (Exception e) {            log.error("Failed to get monitor info", e);            return Result.error(500, e.getMessage());        }    }    @GetMapping("/statistics")    public Result<List<TaskStatistics>> getStatistics() {        try {            List<TaskStatistics> stats = monitorService.getTaskStatistics();            return Result.success(stats);        } catch (Exception e) {            log.error("Failed to get statistics", e);            return Result.error(500, e.getMessage());        }    }    private Runnable createTask(TaskSubmitRequest request) {        return () -> {            log.info("Executing task: taskId={}, businessType={}",                     request.getTaskId(), request.getBusinessType());            try {                TimeUnit.SECONDS.sleep(request.getExecutionTime());            } catch (InterruptedException e) {                Thread.currentThread().interrupt();                thrownew RuntimeException("Task interrupted", e);            }        };    }}
```

## 核心流程：优先级队列与抢占式执行

### 1\. 任务提交流程

```
sequenceDiagram    participant Client    participant Controller    participant QueueService    participant Queue    participant Executor    Client->>Controller: 提交任务    Controller->>QueueService: submitTask(task, priority)    QueueService->>Queue: put(task)    Queue-->>QueueService: taskId    QueueService-->>Controller: taskId    Controller-->>Client: taskId
```

### 2\. 任务执行流程

```
sequenceDiagram    participant Executor    participant Queue    participant Task    participant QueueService    Executor->>Queue: take()    Queue-->>Executor: task    Executor->>QueueService: updateStatus(RUNNING)    Executor->>Task: run()    Task-->>Executor: result    Executor->>QueueService: updateStatus(COMPLETED)
```

### 3\. 优先级调整流程

```
sequenceDiagram    participant Scheduler    participant QueueService    participant Queue    participant Task    Scheduler->>QueueService: getAllTasks()    QueueService-->>Scheduler: tasks    Scheduler->>Task: checkWaitTime()    Task-->>Scheduler: waitTime    alt waitTime > threshold        Scheduler->>QueueService: updatePriority(taskId, newPriority)        QueueService->>Queue: remove(task)        QueueService->>Queue: put(task)    end
```

### 4\. 抢占式执行流程

```
sequenceDiagram    participant Scheduler    participant Queue    participant Executor    participant Task    Scheduler->>Queue: getHighestPriorityPendingTask()    Queue-->>Scheduler: highPriorityTask    Scheduler->>Executor: getLowestPriorityRunningTaskId()    Executor-->>Scheduler: lowPriorityTaskId    alt highPriority > lowPriority        Scheduler->>Executor: preemptTask(lowPriorityTaskId)        Executor->>Task: interrupt()        Task->>Task: checkInterruption()        Task-->>Executor: InterruptedException    end
```

## 技术要点：优先级队列与抢占式执行

### 1\. 优先级定义

#### 固定优先级

```
public enum TaskPriority {    CRITICAL(10),    HIGH(8),    MEDIUM(5),    LOW(3),    MINIMAL(1);        privatefinalint value;        TaskPriority(int value) {        this.value = value;    }        public int getValue() {        return value;    }}
```

#### 动态优先级

```
public void adjustPriority(String taskId, int adjustment) {    PriorityTask task = taskQueueService.getTask(taskId);    if (task != null) {        int newPriority = Math.max(1, Math.min(10, task.getPriority() + adjustment));        taskQueueService.updatePriority(taskId, newPriority);    }}
```

### 2\. 抢占式执行

#### 线程中断

```
public void interruptTask(String taskId) {    Thread thread = taskThreads.get(taskId);    if (thread != null) {        thread.interrupt();    }}
```

#### 任务检查点

```
public class CheckpointTask implements InterruptibleTask {        @Override    public void executeWithInterruption(Runnable task) throws InterruptedException {        for (int i = 0; i < 100; i++) {            checkInterruption();            processBatch(i);        }    }        private void processBatch(int batchIndex) {        // 处理批次数据    }    }
```

#### 状态保存与恢复

```
public class StatefulTask implements InterruptibleTask {        private TaskState state;        @Override    public void executeWithInterruption(Runnable task) throws InterruptedException {        if (state != null) {            resumeFromState(state);        }                while (true) {            checkInterruption();            saveState();            processNext();        }    }        private void saveState() {        state = new TaskState();        // 保存当前状态    }        private void resumeFromState(TaskState state) {        // 从保存的状态恢复    }    }
```

### 3\. 优先级调度

#### 优先级继承

```
public class PriorityInheritanceScheduler {        public void scheduleTask(PriorityTask parentTask, Runnable childTask) {        int childPriority = parentTask.getPriority();        taskQueueService.submitTask(childTask, childPriority);    }    }
```

#### 优先级衰减

```
@Scheduled(fixedRate = 60000)public void decayPriority() {    taskQueueService.getAllTasks().values().stream()            .filter(task -> task.getStatus() == TaskStatus.PENDING)            .forEach(task -> {                long waitTime = System.currentTimeMillis() - task.getCreateTime();                if (waitTime > 300000) {                    int newPriority = Math.max(1, task.getPriority() - 1);                    taskQueueService.updatePriority(task.getTaskId(), newPriority);                }            });}
```

#### 优先级提升

```
@Scheduled(fixedRate = 30000)public void boostPriority() {    taskQueueService.getAllTasks().values().stream()            .filter(task -> task.getStatus() == TaskStatus.PENDING)            .forEach(task -> {                long waitTime = System.currentTimeMillis() - task.getCreateTime();                if (waitTime > 60000) {                    int newPriority = Math.min(10, task.getPriority() + 1);                    taskQueueService.updatePriority(task.getTaskId(), newPriority);                }            });}
```

### 4\. 资源隔离

#### 多线程池

```
@Configurationpublicclass ThreadPoolConfig {    @Bean("highPriorityExecutor")    public ExecutorService highPriorityExecutor() {        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();        executor.setCorePoolSize(10);        executor.setMaxPoolSize(20);        executor.setQueueCapacity(50);        executor.setThreadNamePrefix("high-priority-");        executor.initialize();        return executor.getThreadPoolExecutor();    }    @Bean("mediumPriorityExecutor")    public ExecutorService mediumPriorityExecutor() {        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();        executor.setCorePoolSize(5);        executor.setMaxPoolSize(10);        executor.setQueueCapacity(100);        executor.setThreadNamePrefix("medium-priority-");        executor.initialize();        return executor.getThreadPoolExecutor();    }    @Bean("lowPriorityExecutor")    public ExecutorService lowPriorityExecutor() {        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();        executor.setCorePoolSize(2);        executor.setMaxPoolSize(5);        executor.setQueueCapacity(200);        executor.setThreadNamePrefix("low-priority-");        executor.initialize();        return executor.getThreadPoolExecutor();    }}
```

#### 资源配额

```
@Servicepublicclass ResourceQuotaManager {    privatefinal Map<String, ResourceQuota> quotas = new ConcurrentHashMap<>();    public boolean acquireResource(String resourceType, int amount) {        ResourceQuota quota = quotas.get(resourceType);        if (quota != null && quota.getAvailable() >= amount) {            quota.use(amount);            returntrue;        }        returnfalse;    }    public void releaseResource(String resourceType, int amount) {        ResourceQuota quota = quotas.get(resourceType);        if (quota != null) {            quota.release(amount);        }    }}
```

## 最佳实践：优先级队列与抢占式执行

### 1\. 合理设置优先级

**原则**：

*   根据业务重要性设置优先级
    
*   核心业务使用高优先级
    
*   非核心业务使用低优先级
    
*   避免所有任务都使用高优先级
    

**示例**：

```
public enum BusinessPriority {    PAYMENT(10),        // 支付    ORDER(8),           // 订单    NOTIFICATION(6),     // 通知    REPORT(4),          // 报表    ARCHIVE(2);         // 归档        privatefinalint priority;        BusinessPriority(int priority) {        this.priority = priority;    }        public int getPriority() {        return priority;    }}
```

### 2\. 优雅中断

**原则**：

*   及时检查中断状态
    
*   清理已分配的资源
    
*   保存任务状态
    
*   记录中断日志
    

**示例**：

```
public class GracefulInterruptibleTask implements InterruptibleTask {        @Override    public void executeWithInterruption(Runnable task) throws InterruptedException {        Connection connection = null;                try {            connection = dataSource.getConnection();                        while (true) {                checkInterruption();                                processBatch(connection);                                saveCheckpoint();            }        } catch (InterruptedException e) {            log.warn("Task interrupted", e);            throw e;        } catch (Exception e) {            log.error("Task execution failed", e);            thrownew RuntimeException("Task execution failed", e);        } finally {            if (connection != null) {                try {                    connection.close();                } catch (SQLException e) {                    log.error("Failed to close connection", e);                }            }        }    }    }
```

### 3\. 防止饥饿

**原则**：

*   定期提升低优先级任务的优先级
    
*   限制高优先级任务的数量
    
*   使用公平调度算法
    
*   监控任务等待时间
    

**示例**：

```
@Scheduled(fixedRate = 60000)public void preventStarvation() {    taskQueueService.getAllTasks().values().stream()            .filter(task -> task.getStatus() == TaskStatus.PENDING)            .forEach(task -> {                long waitTime = System.currentTimeMillis() - task.getCreateTime();                                if (waitTime > 120000) {                    int newPriority = Math.min(10, task.getPriority() + 2);                    taskQueueService.updatePriority(task.getTaskId(), newPriority);                    log.info("Task priority boosted to prevent starvation: taskId={}, oldPriority={}, newPriority={}",                             task.getTaskId(), task.getPriority(), newPriority);                }            });}
```

### 4\. 监控告警

**原则**：

*   实时监控任务执行情况
    
*   设置合理的告警阈值
    
*   及时发现和解决问题
    
*   分析任务执行数据
    

**示例**：

```
@Service@Slf4jpublicclass TaskAlertService {    @Autowired    private TaskMonitorService monitorService;    @Scheduled(fixedRate = 60000)    public void checkTaskStatus() {        TaskMonitorInfo info = monitorService.getMonitorInfo();                if (info.getQueueSize() > 1000) {            sendAlert("High queue size: " + info.getQueueSize());        }                if (info.getRunningTaskCount() > 50) {            sendAlert("High running task count: " + info.getRunningTaskCount());        }                if (info.getFailedCount() > 10) {            sendAlert("High failed task count: " + info.getFailedCount());        }    }    private void sendAlert(String message) {        log.error("Task alert: {}", message);        // 发送告警通知    }}
```

## 常见问题：优先级队列与抢占式执行

### 1\. 任务饥饿

**问题**：低优先级任务长时间得不到执行

**原因**：

*   高优先级任务过多
    
*   没有优先级提升机制
    
*   调度算法不公平
    

**解决方案**：

```
@Scheduled(fixedRate = 60000)public void preventStarvation() {    taskQueueService.getAllTasks().values().stream()            .filter(task -> task.getStatus() == TaskStatus.PENDING)            .forEach(task -> {                long waitTime = System.currentTimeMillis() - task.getCreateTime();                                if (waitTime > 120000) {                    int newPriority = Math.min(10, task.getPriority() + 2);                    taskQueueService.updatePriority(task.getTaskId(), newPriority);                }            });}
```

### 2\. 优先级反转

**问题**：低优先级任务持有高优先级任务需要的资源

**原因**：

*   资源竞争
    
*   锁竞争
    
*   依赖关系
    

**解决方案**：

```
public class PriorityInheritanceLock {        public void lockWithPriorityInheritance(PriorityTask task) {        Thread currentThread = Thread.currentThread();        int originalPriority = currentThread.getPriority();                try {            currentThread.setPriority(task.getPriority());            lock.lock();        } finally {            currentThread.setPriority(originalPriority);        }    }    }
```

### 3\. 频繁中断

**问题**：任务被频繁中断，无法完成

**原因**：

*   高优先级任务过多
    
*   抢占策略过于激进
    
*   任务执行时间过长
    

**解决方案**：

```
public class SmartPreemptionStrategy {        public boolean shouldPreempt(PriorityTask runningTask, PriorityTask pendingTask) {        int priorityDiff = pendingTask.getPriority() - runningTask.getPriority();        long runningTime = System.currentTimeMillis() - runningTask.getStartTime();                if (priorityDiff > 5 && runningTime > 10000) {            returntrue;        }                if (priorityDiff > 8) {            returntrue;        }                returnfalse;    }    }
```

### 4\. 资源泄漏

**问题**：任务被中断后，资源没有正确释放

**原因**：

*   没有使用 try-finally 清理资源
    
*   资源清理代码被中断
    
*   没有正确处理异常
    

**解决方案**：

```
public class ResourceCleanupTask implements InterruptibleTask {        @Override    public void executeWithInterruption(Runnable task) throws InterruptedException {        Connection connection = null;        Statement statement = null;        ResultSet resultSet = null;                try {            connection = dataSource.getConnection();            statement = connection.createStatement();            resultSet = statement.executeQuery("SELECT * FROM large_table");                        while (resultSet.next()) {                checkInterruption();                processData(resultSet);            }        } catch (InterruptedException e) {            log.warn("Task interrupted", e);            throw e;        } catch (Exception e) {            log.error("Task execution failed", e);            thrownew RuntimeException("Task execution failed", e);        } finally {            closeQuietly(resultSet);            closeQuietly(statement);            closeQuietly(connection);        }    }    }
```

## 性能测试：优先级队列与抢占式执行

### 测试环境

*   **服务器**：4核8G，100Mbps带宽
    
*   **测试场景**：10000个并发请求
    
*   **任务类型**：高优先级任务（10%）、中优先级任务（30%）、低优先级任务（60%）
    

### 测试结果

场景

无优先级

优先级队列

抢占式执行

资源隔离

高优先级平均响应时间

5000ms

500ms

200ms

150ms

中优先级平均响应时间

5000ms

2000ms

1500ms

1200ms

低优先级平均响应时间

5000ms

8000ms

10000ms

9000ms

高优先级P95响应时间

10000ms

1000ms

400ms

300ms

任务吞吐量

2000/s

1800/s

1700/s

1600/s

资源占用

80%

75%

78%

70%

系统稳定性

中

高

高

高

### 测试结论

1.  **高优先级任务响应快**：优先级队列显著提高了高优先级任务的响应速度
    
2.  **资源占用合理**：资源隔离有效降低了资源占用
    
3.  **系统稳定性高**：抢占式执行提高了系统稳定性
    
4.  **任务吞吐量略降**：优先级控制略微降低了任务吞吐量
    

## 互动话题

1.  你在实际项目中如何实现异步任务的优先级控制？有哪些经验分享？
    
2.  对于抢占式执行，你认为在什么场景下最适用？
    
3.  你遇到过哪些优先级队列相关的问题？如何解决的？
    
4.  在微服务架构中，如何实现跨服务的优先级队列和协调？
    

欢迎在评论区交流讨论！更多技术文章，欢迎关注公众号：服务端技术精选
