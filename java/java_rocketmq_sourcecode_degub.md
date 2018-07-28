# RocketMQ源码调试环境搭建

---
RocketMQ是阿里开源的分布式消息系统,可以通过这个[地址](http://rocketmq.apache.org/)去查看其相关内容.以下是我基于源码搭建调试环境的笔记.

##具体步骤
* 源码下载.RocketMQ是用maven来进行工程管理,首先要先安装和配置好maven工作环境.然后新建一个项目工程。我是使用idea,直接选择了从github上面
构建.等待代码以及相关的依赖下载完成.
* 配置运行参数.根据官方的quick start文档,要将RocketMQ跑起来,要先启动Name Server,然后再启动Broker.为了方便进行代码debug,可以在idea配置
Name Server 和Broker的启动配置.这样就能方便在运行官方提供的例子来进行调试。
    >  点击run菜单项,在run/debug菜单配置窗口中添加一个名称叫broker的运行配置,指定以下参数：
    mainclass=org.apache.rocketmq.broker.BrokerStartup  
    运行参数 -n localhost:9889
    设置环境变量ROCKETMQ_HOME=/源码目录/distribution
    选择use class path of module = rocket-broker
    jvm参数可以根据自己的机器进行配置
    然后在新建一个name server的运行配置.  
    mainclass = org.apache.rocketmq.namesrv.NamesrvStartup  
    选择use class path of module = rocket-Namesrv
    设置环境变量ROCKETMQ_HOME=/源码目录/distribution
* 先运行Name server,然后在运行broker
* 然后就可以运行官方自带的例子了.
    
    
    