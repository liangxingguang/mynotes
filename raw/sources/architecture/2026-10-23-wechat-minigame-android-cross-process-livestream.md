---
title: 直播系统聊天技术(五)：微信小游戏直播在Android端的跨进程渲染推流实践
source: 52im.net（微信开发团队·virwu）
source_url: http://www.52im.net/thread-3594-1-1.html
source_type: article
platform: 52im.net
captured: 2026-10-23
registered_at: 2026-10-24
inbox_ref: Inbox/2026-10-23-wechat-minigame-android-cross-process-livestream.md
asset_ref: Assets/2026/10/wechat-minigame-android-cross-process-livestream.md
---

# 直播系统聊天技术(五)：微信小游戏直播在Android端的跨进程渲染推流实践

本文由微信开发团队工程师"virwu"分享，发布于WeMobileDev公众号。

## 1、引言

近期，微信小游戏支持了视频号一键开播，打开腾讯系小游戏（如跳一跳、欢乐斗地主等），在右上角菜单就可以看到发起直播的按钮一键成为游戏主播了。

然而微信小游戏出于性能和安全等一系列考虑，运行在一个独立的进程中，在该环境中不会初始化视频号直播相关的模块。这就意味着小游戏的音视频数据必须跨进程传输到主进程进行推流，给我们实现小游戏直播带来了一系列挑战。

## 3、视频采集推流

### 3.1录屏采集？

小游戏直播本质上就是把主播手机屏幕上的内容展示给观众，自然而然地可以想到采用系统的录屏接口MediaProjection进行视频数据的采集。

**这种方案的优点：**

* 1）系统接口，实现简单，兼容性和稳定性有一定保证；
* 2）后期可以扩展成通用的录屏直播；
* 3）对游戏性能影响较小，经测试对帧率影响在10%以内；
* 4）可以直接在主进程进行数据处理及推流，不用处理小游戏跨进程的问题。

**但最终这个方案被否决了，主要出于以下考虑：**

* 1）需要展示系统授权弹窗；
* 2）需要谨慎处理切出小游戏后暂停画面推流的情况，否则可能录制到主播的其他界面，有隐私风险；
* 3）最关键的一点：产品设计上需要在小游戏上展示一个评论挂件，便于主播查看直播评论以及进行互动，录屏直播会让观众也看到这个组件，影响观看体验的同时会暴露一些只有主播才能看到的数据。

转念一想，既然小游戏的渲染完全是由我们控制的，为了更好的直播体验，能否将小游戏渲染的内容跨进程传输到主进程来进行推流呢？

### 3.2小游戏渲染架构

在前台的小游戏进程中，MagicBrush为小游戏渲染引擎，它接收来自于小游戏代码的渲染指令调用，将画面渲染到在屏的SurfaceView提供的Surface上。整个过程主进程在后台不参与。

### 3.3小游戏录屏时的情况

小游戏之前支持过游戏内容的录制，和直播原理上类似，都需要获取当前小游戏的画面内容。

**录屏启用时小游戏会切换渲染模式：**MagicBrush的输出目标不再是在屏的SurfaceView，而是Renderer产生的一个SurfaceTexture。

**Renderer的作用：**Renderer是一个独立的渲染模块，表示一个独立的GL环境，它可以创建SurfaceTexture作为输入，收到SurfaceTexture的onFrameAvailable回调后通过updateTexImage方法将图像数据转换为类型是GL_TEXTURE_EXTERNAL_OES的纹理参与后续的渲染过程，并可以将渲染结果输出到另一个Surface上。

**逐步过程：**

1）MagicBrush接收来自小游戏代码的渲染指令调用，将小游戏内容渲染到第一个Renderer所创建的SurfaceTexture上；

2）随后这个Renderer做了两件事情：
* 2.1）将得到的小游戏画面纹理再次渲染到了在屏的Surface上；
* 2.2）提供纹理ID给到第二个Renderer（两个Renderer通过共享GLContext来实现共享纹理）。

3）第二个Renderer将第一个Renderer提供的纹理渲染到mp4编码器提供的输入SurfaceTexture上，最终编码器编码产生mp4录屏文件。

### 3.4改造录屏方案？

录屏方案中通过一个Renderer负责将游戏内容上屏，另一个Renderer将同样的纹理渲染到编码器上的方式实现了录制游戏内容，直播其实类似，只要将编码器替换为直播的推流模块就可以了。

**但还缺少关键的一环：**推流模块运行在主进程，我们需要实现跨进程传输图像数据！

**说到跨进程：**第一反应是Binder、Socket、共享内存等传统IPC方法。但仔细一想，系统提供的SurfaceView是非常特殊的一个View组件，它不经过传统的View树来参与绘制，而是直接经由系统的SurfaceFlinger来合成到屏幕上，而SurfaceFlinger运行在系统进程上，我们绘制在SurfaceView所提供的Surface上的内容必然是可以跨进程进行传输的，而Surface跨进程的方法很简单——它本身就实现了Parcelable接口，这意味着我们可以用Binder直接跨进程传输Surface对象。

**初步方案：**不再是渲染到mp4编码器上，而是渲染到主进程跨进程传输过来的Surface上，主进程的这个Surface是通过一个Renderer创建的SurfaceTexture包装而来的，小游戏进程作为生产者向这个Surface渲染画面。当一帧渲染完毕后，主进程的SurfaceTexture收到onFrameAvailable回调，通过updateTexImage获取纹理数据，由于直播推流模块只支持GL_TEXTURE_2D类型的纹理，主进程Renderer会将GL_TEXTURE_EXTERNAL_OES转换为GL_TEXTURE_2D纹理后给到直播推流编码器，完成推流。

**但这不是最优：**上述方案中的Renderer过多了，小游戏进程中存在两个（渲染上屏、渲染到跨进程Surface），主进程中还存在一个用于转换纹理及调用推流模块。如果要同时支持录屏，还需要再起一个Renderer。过多的Renderer意味着过多的额外渲染开销，会影响小游戏运行性能。

### 3.5跨进程渲染方案

纵观整个流程，其实只有主进程的Renderer是必要的，小游戏所使用的额外Renderer无非就是想同时满足渲染上屏和跨进程传输。既然Surface本身就不受进程的约束，干脆把小游戏进程的在屏Surface传递到主进程进行渲染上屏！

最终大刀阔斧地砍掉了小游戏进程的两个冗余Renderer，MagicBrush直接渲染到了跨进程传递而来的Surface上，而主进程的Renderer在负责纹理类型转换的同时也负责将纹理渲染到跨进程传递而来的小游戏进程的在屏Surface上，实现画面的渲染上屏。

最终所需要的Renderer数量从原来的3个减少到了必要的1个，在架构更加清晰的同时提升了性能。

后续需要同时支持录屏时，只要稍作改动，将mp4编码器的输入SurfaceTexture也跨进程传递到主进程，再新增一个Renderer渲染纹理到它上面就行了。

### 3.6兼容性与性能

**官方文档说明可以跨进程进行绘制：**

SurfaceView combines a surface and a view. SurfaceView's view components are composited by SurfaceFlinger (and not the app), enabling rendering from a separate thread/process and isolation from app UI rendering.

并且Chrome以及Android O以后的系统WebView都有使用跨进程渲染的方案。

在兼容性测试中，覆盖了Android 5.1及以后的各个主流系统版本和机型，除了Android 5.x机型上出现了跨进程渲染黑屏的问题外，其余均可以正常渲染上屏和推流。

**性能方面：**使用WebGL水族馆Demo测试，平均帧率影响在15%左右，主进程CPU因渲染和推流有所升高，小游戏进程CPU开销却出现了一些下降（原因未确认，怀疑与上屏操作移到主进程相关）。

### 3.7小结一下

为了实现不录制主播端的评论挂件，我们从小游戏渲染流程入手，借助于Surface跨进程渲染和传输图像的能力，把小游戏渲染上屏的过程移到了主进程，并同时生成纹理进行推流，在兼容性和性能上达到了要求。

## 4、音频采集推流

### 4.1方案选择

在音频采集方案中，注意到Android 10及以上系统提供了AudioPlaybackCapture方案允许在一定限制内对系统音频进行采集。

**捕获方-进行捕获的条件：**

* 1）Android 10(api 29)及以上；
* 2）获取了RECORD_AUDIO权限；
* 3）通过MediaProjectionManager.createScreenCaptureIntent()进行MediaProjection权限的申请（和MediaProjection录屏共用）；
* 4）通过AudioPlaybackCaptureConfiguration.addMatchingUsage()/excludeUsage()添加/排除要捕获的MEDIA类型；
* 5）通过addMatchingUid()/excludeUid()添加/排除可以捕获的应用的UID。

**被捕获方-可以被捕获的条件：**

* 1）Player的AudioAttributes设置的Usage为USAGE_UNKNOWN、USAGE_GAME或USAGE_MEDIA；
* 2）应用的CapturePolicy被设置为ALLOW_CAPTURE_BY_ALL；
* 3）通过manifest.xml设置android:allowAudioPlaybackCapture="true"（TargetApi 29及以上默认为true）；
* 4）api 29及以上可通过setAllowedCapturePolicy运行时设置；
* 5）api 29及以上可通过AudioAttributes针对每一个Player单独设置。

**总的来说：**Android 10及以上可以使用AudioPlaybackCapture方案，但考虑到系统版本限制过高，最终选择了自己采集并混合小游戏内播放的所有音频。

### 4.2跨进程音频数据传输

**老问题又摆在眼前：**小游戏混合后的音频数据在小游戏进程，需要传输到主进程进行推流。

**与一般的IPC用于方法调用不同：**这个场景需要频繁地（40毫秒一次）传输较大的数据块（16毫秒内的数据量在8k左右），且延迟需要尽可能低，否则会出现音画不同步。

**为了达到目标：**对Binder、LocalSocket、MMKV、SharedMemory、Pipe这几种IPC方案进行了测试。在小游戏进程模拟真实音频传输，每隔16毫秒发送一次序列化后的数据对象（3k/4M/10M三挡），记录传输延迟。

**结果：**LocalSocket方案在各个情况下的传输延迟表现都极为优异（XIPCInvoker/Binder和MMKV在大数据量时耗时过长）。差异原因主要是裸二进制数据跨进程传输后仍需一次数据拷贝来反序列化，而LocalSocket可以借助ObjectStream和Serializable实现流式拷贝，相比一次性接收后再拷贝节约大量时间。

兼容性测试未出现不能传输或断开连接的情况，仅三星S6平均延迟超过10毫秒，其余机型延迟均在1毫秒左右。

### 4.3LocalSocket的安全性

LocalSocket作为Unix domain socket的封装，本身缺乏鉴权机制，任意应用都可以连接，从而截取数据或传递非法数据（参考论文《The Misuse of Android Unix Domain Sockets and Security Implications》）。

**防御方法：**

* 1）随机化LocalSocket命名，例如用小游戏AppId和用户uin等信息计算md5作为名字，使攻击者无法固定或穷举；
* 2）引入鉴权机制，连接成功后发送特定随机信息验证对方真实性，然后才启动真正的数据传输。

### 4.4小结一下

为了兼容Android 10以下的机型，选择自己处理小游戏音频采集，并通过对比评测选用LocalSocket作为跨进程音频传输方案，延迟满足直播需求，同时通过对抗措施规避安全风险。

## 5、多进程带来的问题

### 5.1glFinish造成渲染推流帧率严重下降

实现跨进程渲染推流后，部分中低端机型上帧率下降非常严重。复现后发现小游戏进程渲染帧率可以达到不开直播时的帧率，说明性能下降不是直播开销引起的小游戏代码执行效率下降，而是主进程上屏Renderer效率太低。

对主进程直播时运行效率Profile，发现耗时函数为glFinish，并且有两次调用：

* 1）Renderer将外部纹理转2D纹理时，耗时达100多毫秒；
* 2）腾讯云直播SDK内部，耗时10毫秒以内。

glFinish会阻塞直到之前调用的所有GL指令全部完成。GL指令队列按线程隔离，主进程Renderer线程指令很少，为何阻塞这么久？猜测：处理指令的GPU只有一个，小游戏进程的大量GL指令导致主进程glFinish阻塞过久。

**验证：**在性能下降严重的机型上运行低负载小游戏，glFinish耗时成功下降到10毫秒左右——确实是小游戏进程的大量GL指令阻塞了主进程glFinish。

**解决过程：**OpenGL的glFence同步机制无法跨进程使用；跨进程加锁不能保证指令已执行完；给小游戏进程加glFinish会使双缓冲机制失效，渲染帧率大幅下降。回到问题本质：双缓冲机制下本来就不需要glFinish等待。第一次纹理处理的调用直接去掉，第二次腾讯云SDK的调用（历史问题引入）在腾讯云同学帮助下去掉后，渲染帧率与小游戏输出帧率一致，兼容性和性能测试无问题。

**经验：**glFinish使得双缓冲机制失效带来的性能影响巨大，使用OpenGL渲染时对glFinish应当非常谨慎。

### 5.2后台进程优先级问题

测试发现无论以多少帧率向直播SDK发送画面，观众端看到的画面帧率始终只有16帧左右，原因是编码器编码帧率不足。同进程内编码可达30帧，说明是多进程问题——编码是重CPU操作，首先怀疑后台进程优先级。

**确认问题：**

* 1）root手机通过chrt命令提高编码线程优先级，观众端帧率立马上到25帧；
* 2）小游戏进程上显示主进程浮窗（使主进程具有前台优先级），帧率上到30帧。

但用android.os.Process.setThreadPriority设置后仅从16帧提高到18帧。原因：该方法设置的是renice的nice值，而之前chrt测试时缺省把调度策略从SCHED_OTHER改成了SCHED_RR（实时策略），导致调度优先级变得非常高。

**实际上：**renice设置的线程优先级对后台进程线程没有太大帮助。Android使用Linux cgroups创建前台/后台调度隔离：后台cgroup的线程总共只能占用很小比例的CPU时间。

**最终：**为了提高编码帧率并防止后台主进程被杀，直播时在主进程创建一个前台Service。

## 6、总结与展望

多进程是一把双刃剑，在带来隔离性和性能优势的同时也带来了跨进程通信难题，所幸借助系统Surface的能力和多种跨进程方案可以较好解决。解决跨进程问题最好的方案是避免跨进程（考虑过推流模块运行在小游戏进程，但出于改造成本未选择）。

这次SurfaceView跨进程渲染的实践对其他业务有参考价值——对于内存压力较大或安全风险较高、又需要进行SurfaceView渲染绘制的场景，可以把逻辑放到独立进程，再通过跨进程渲染绘制到主进程的View上，获得独立进程优势的同时避免进程间跳转的体验割裂。
