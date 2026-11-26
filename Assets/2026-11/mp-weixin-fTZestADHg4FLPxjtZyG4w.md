百万并发是大型架构核心，下面我详解百万并发设计@mikechen

mikechen原创《**[30万字阿里架构师进阶从0到1全部合集](https://mp.weixin.qq.com/s?__biz=Mzg2NTg1NTQ2NQ==&mid=2247500275&idx=1&sn=3c4d7ae5f524e012f2fb44fd2259ff4d&chksm=ce513375f926ba63802e679bd2286b385f3709b62fadda6a1c3337d8dfc08e7e6eeb377a4156&scene=21&token=1498050498&lang=zh_CN#wechat_redirect)**》，请关注本公众号【mikechen的互联网架构】，后台回复：**资料**，即可领取。

**百万并发设计：lvs+keepalive**

在高并发场景下，单台应用服务器无论在CPU、内存、网络IO还是连接数方面都存在瓶颈。

为了实现百万级并发访问能力，必须采用分层架构：

![如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg== "如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen")

用户请求 → 负载均衡层（LVS） → 应用服务器集群（Nginx/Tomcat等） → 数据层

在这一体系中，LVS + Keepalived 是最常见、最稳定的四层负载均衡 + 高可用组合。

LVS（Linux Virtual Server） 负责流量分发，保证高性能和高并发。

Keepalived 负责主备切换，保证高可用（HA）。

这种组合方案被广泛应用于大型网站的前端网关层，如：电商、支付、直播、游戏后端等场景。

**LVS 四层负载均衡**

LVS（Linux Virtual Server）是一个运行在 Linux 内核层的负载均衡框架，由国人章文嵩博士主导开发。

它通过修改内核的 IP 层，将请求转发到后端真实服务器（Real Server, RS），属于四层（传输层）负载均衡。

LVS 仅在 TCP/UDP 传输层 (OSI 第四层) 工作，只根据数据包的目标 IP 和端口进行转发。

![如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E> "如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen")

不涉及应用层 (HTTP 报文、Cookie 等) 的内容解析，这大大简化了处理流程，提高了转发速度。

由于 LVS 只是简单地转发数据包，其本身几乎不占用 CPU 资源进行复杂的计算，因此抗负载能力极强，可以轻松支撑百万级的并发连接。

**Keepalived ：实现 LVS 节点的高可用**

LVS 提供了高性能的转发，但如果 LVS 服务器本身宕机，整个系统将崩溃。

Keepalived 就是为了解决 LVS 的单点故障问题而引入的。

它的核心作用有两点：

主备切换（HA）：主节点故障后，备用节点自动接管虚拟IP；

健康检查（Health Check）：实时检测后端服务器健康状态，自动移除故障节点。

整体架构，如下：

![如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E> "如何轻松支撑百万并发？LVS + Keepalived架构详解！-mikechen")

1.  ┌──────────────────────────┐
2.  │      VIP:10.0.0.10│
3.  │(Keepalived漂移IP)│
4.  └────────────┬────────────┘
5.  │
6.  ┌──────────────┴──────────────┐
7.  ││
8.  Master\-LVS                     Backup\-LVS
9.  (优先级100)(优先级90)
10.  ││
11.  └────────→RealServer集群←───┘

工作流程：

1.  Master节点绑定虚拟IP（VIP），对外提供服务；
    
2.  Keepalived周期性通过 VRRP 心跳检测 Master；
    
3.  若Master宕机，Backup自动接管VIP；
    
4.  整个切换过程自动完成、秒级生效；
    
5.  客户端仍访问VIP，不感知后端变化。
    

LVS 与 Keepalived 的组合，以其内核级转发性能与成熟的 VRRP 高可用机制。

为构建低成本、可扩展且高可用的负载均衡层提供了稳健方案。

以上

最后，看完有启发，记得点赞关注支持！

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)