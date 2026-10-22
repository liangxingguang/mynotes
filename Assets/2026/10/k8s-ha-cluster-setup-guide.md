# K8s从零搭建高可用集群：保姆级图文实战教程（3 Master + 2 Worker，全量YAML开箱即用）

> 原文：https://mp.weixin.qq.com/s/_o_wiC0G8xaqdWWgMjbJLw

学 Kubernetes 最容易卡在第一步：照着单机教程搭出来的集群，Master 一挂全团灭，根本不敢叫"集群"。这篇从一台台裸机开始，带你搭出一套**真正高可用的生产级 K8s：3 个控制面 + 2 个工作节点，堆叠式 etcd（Raft 三成员），HAProxy + Keepalived 提供统一入口 VIP，Calico VXLAN 跨节点组网**。文中**所有初始化脚本、kubeadm 配置、HAProxy/Keepalived 配置、Calico 定制 YAML 均可直接复制**，并针对国内网络给出镜像拉取失败的全套解决方案（管控面镜像、业务镜像、离线导入）。跟着做，2 小时内得到一套可以随时演练"拔电源"的高可用集群。

## 一、先看懂：高可用集群到底"高可用"在哪

### 1.1 目标架构图

```
                          kubectl / kubelet / Pod
                                  │  https://VIP:16443
                                  ▼
                   ┌──────────────────────────────┐
                   │  VIP 192.168.56.100 :16443   │  ← Keepalived(VRRP) 漂移
                   │  HAProxy × 3（四层 TCP 代理）│     HAProxy 健康检查
                   └──────────────────────────────┘
            ┌────────────────┬────────────────┬────────────────┐
            ▼                ▼                ▼                │
      k8s-master01     k8s-master02     k8s-master03           │
      192.168.56.101   192.168.56.102   192.168.56.103         │
      ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
      │ kube-       │  │ kube-       │  │ kube-       │        │
      │ apiserver   │  │ apiserver   │  │ apiserver   │        │ 多活
      │ controller- │  │ controller- │  │ controller- │        │（无状态，
      │  manager    │  │  manager    │  │  manager    │        │ 选主）
      │ scheduler   │  │ scheduler   │  │ scheduler   │        │
      └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
             └────────────────┼────────────────┘               │
                              ▼                                │
                   ┌──────────────────────────┐                │
                   │  etcd × 3（堆叠在 Master）│  Raft 多数派： │
                   │  2380 互相同步 / 2379 客户端│  挂 1 个仍可用 │
                   └──────────────────────────┘                │
                                                               ▼
                   k8s-node01(111)          k8s-node02(112)  ← 业务 Pod
                   kubelet + kube-proxy     kubelet + kube-proxy
                   containerd（CRI）        containerd（CRI）
```

### 1.2 各组件如何做到高可用

| 组件 | 高可用方式 | 挂一台 Master 后 |
| --- | --- | --- |
| kube-apiserver | 无状态，前面加 VIP + 四层负载，多实例并行 | VIP 自动摘除故障节点，请求零中断（重连即可） |
| kube-controller-manager | 多副本通过**租锁（leader election）选主**，只有一个在干活 | 备副本 15 秒左右接管 |
| kube-scheduler | 同上，选主 | 同上 |
| etcd | Raft 协议，**3 成员容忍 1 台故障**（多数派 2/3） | 数据不丢、集群可写 |
| kubelet / 业务 Pod | 分布在 Worker 上，与控制面解耦 | 已运行业务不受影响 |

> 为什么是 3 个 Master 而不是 2 个？etcd 基于多数派（quorum）：3 节点容忍挂 1 个，5 节点容忍挂 2 个；而 2 节点集群挂 1 个就失去多数派、**直接不可写**，可用性还不如 1 节点（还多了脑裂风险）。生产环境记住：**etcd 成员数只选奇数（1/3/5）**。

### 1.3 两种高可用拓扑：堆叠 etcd vs 外部 etcd

* **堆叠 etcd（本文方案）**：etcd 和控制面组件跑在同一批 Master 上。省机器、运维简单，是 kubeadm 官方首推的入门拓扑；
* **外部 etcd 集群**：etcd 独立成 3 台专用机器。隔离性更好、故障域更小，但要多维护 3 台机器，适合超大规模或强合规场景。

90% 的团队用堆叠拓扑即可，本文全部命令围绕它展开。

## 二、实验环境规划（照着建虚拟机就行）

### 2.1 节点与网络规划

| 角色 | 主机名 | IP | 配置（最低/建议） | 安装组件 |
| --- | --- | --- | --- | --- |
| Master-1 | k8s-master01 | 192.168.56.101 | 2C2G / 2C4G，40G | apiserver/controller/scheduler/etcd + HAProxy + Keepalived(MASTER) |
| Master-2 | k8s-master02 | 192.168.56.102 | 同上 | 同上，Keepalived(BACKUP) |
| Master-3 | k8s-master03 | 192.168.56.103 | 同上 | 同上，Keepalived(BACKUP) |
| Worker-1 | k8s-node01 | 192.168.56.111 | 2C2G / 4C8G，40G | kubelet/kube-proxy/containerd |
| Worker-2 | k8s-node02 | 192.168.56.112 | 同上 | 同上 |
| 虚拟 IP | — | **192.168.56.100** | — | Keepalived 管理，不装在任何机器上 |

### 2.2 软件版本（全部为本文实测组合，版本号可整体升级，流程不变）

| 软件 | 版本 | 说明 |
| --- | --- | --- |
| 操作系统 | Ubuntu 22.04 LTS | 5 台最小化安装，能互通外网 |
| Kubernetes | **v1.30.4** | kubeadm/kubelet/kubectl 三件套版本必须一致 |
| 容器运行时 | containerd.io 1.7.x（Docker CE 源） | K8s 1.30 已彻底移除 dockershim，**不能再用 Docker Engine 当 CRI** |
| 网络插件 | Calico **v3.28.2** | VXLAN 封装，跨虚拟化网络最稳 |
| 负载均衡 | HAProxy 2.4 + Keepalived 2.2 | Ubuntu 22.04 apt 自带 |
| Pod 网段 | 10.244.0.0/16 | 故意避开 192.168.x.x，原因见第九节 |
| Service 网段 | 10.96.0.0/12 | kubeadm 默认 |

### 2.3 必须放通的端口（生产用防火墙时按此表开）

| 端口 | 组件 | 方向 |
| --- | --- | --- |
| 16443 | HAProxy 对 API Server 的 LB 端口 | 所有人 → Master |
| 6443 | kube-apiserver | Master 间、Worker → Master |
| 2379/2380 | etcd 客户端 / Raft 选举同步 | 仅 Master 间 |
| 10250/10257/10259 | kubelet / controller-manager / scheduler 健康端口 | Master/Worker 本机或节点间 |
| 4789/UDP | Calico VXLAN 封装 | 所有节点间 |
| 30000-32767 | NodePort | 按需 |
| 112 | VRRP 协议（不是 TCP/UDP 端口，Keepalived 依赖） | Master 间 |

实验环境为减少干扰直接关防火墙；生产环境请按上表精放。

## 三、五个节点统一初始化（一台都不能少）

以下命令**在全部 5 台机器上执行**。先逐台设置主机名（**每台不同，别复制错**）：

```bash
# 在 192.168.56.101 上执行
hostnamectl set-hostname k8s-master01
# 在 192.168.56.102 上执行
hostnamectl set-hostname k8s-master02
# 在 192.168.56.103 上执行
hostnamectl set-hostname k8s-master03
# 在 192.168.56.111 / .112 上分别执行
hostnamectl set-hostname k8s-node01
hostnamectl set-hostname k8s-node02
```

然后**所有节点**统一写入 hosts 解析（5 台内容完全相同）：

```bash
cat >> /etc/hosts <<'EOF'
192.168.56.100 k8s-vip
192.168.56.101 k8s-master01
192.168.56.102 k8s-master02
192.168.56.103 k8s-master03
192.168.56.111 k8s-node01
192.168.56.112 k8s-node02
EOF
```

### 3.1 一条脚本完成系统级准备（所有节点执行）

```bash
#!/usr/bin/env bash
set -e

# 1) 关闭防火墙（实验环境；生产改成按端口表放通）
ufw disable || true

# 2) 永久关闭 swap：K8s 1.8+ 强制要求，kubelet 检测到 swap 直接拒绝启动
swapoff -a
sed -ri 's/.*swap.*/#&/' /etc/fstab

# 3) 时间同步（证书签发、etcd Raft、选主都强依赖时间一致）
apt-get update && apt-get install -y chrony
sed -i 's/^pool .*/pool ntp.aliyun.com iburst/' /etc/chrony/chrony.conf
systemctl enable --now chrony

# 4) 加载容器网络所需内核模块（当前生效 + 开机自动加载）
cat > /etc/modules-load.d/k8s.conf <<'EOF'
overlay
br_netfilter
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF
modprobe overlay
modprobe br_netfilter
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
modprobe ip_vs_sh
modprobe nf_conntrack

# 5) 内核网络参数：让 iptables 正确看到桥接流量、开启转发
cat > /etc/sysctl.d/k8s.conf <<'EOF'
net.bridge.bridge-nf-call-iptables  =1
net.bridge.bridge-nf-call-ip6tables =1
net.ipv4.ip_forward                 =1
EOF
sysctl --system

# 6) 安装 kube-proxy IPVS 模式依赖与排查工具
apt-get install -y ipset ipvsadm conntrack socat

# 7) Ubuntu 默认无 SELinux；若你改用 CentOS/RHEL 系，必须追加：
#    setenforce 0 && sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config

echo "==== 基础初始化完成，swap 状态应为空： ===="
free -h | grep -i swap || echo "swap 已关闭"
```

> 踩坑提醒：云主机/虚拟机扩容后经常把云盘格式化成 swap 又写回 `/etc/fstab`。**重启后节点 NotReady，十有八九是 swap 复活了**，用 `swapon --show` 复查。

## 四、安装 containerd 容器运行时（所有节点执行）

K8s 从 1.24 起移除了 dockershim，本文采用 K8s 官方文档同款的 containerd。用 Docker CE 的阿里云镜像源安装，版本可控：

```bash
# 1) 添加 Docker CE 阿里云源（Ubuntu 自带的 containerd 版本偏旧，不建议）
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y containerd.io

# 2) 生成默认配置文件
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml

# 3) 两处必改：
#    ① cgroup 驱动改成 systemd（与 kubelet 对齐，不一致会导致 kubelet 启动失败）
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
#    ② pause 沙箱镜像改成阿里云地址，并锁定 3.9（与 K8s 1.30 匹配）
sed -i 's#registry.k8s.io/pause:.*#registry.aliyuncs.com/google_containers/pause:3.9#' \
  /etc/containerd/config.toml

systemctl daemon-reload
systemctl enable --now containerd
systemctl restart containerd
```

配置 crictl（K8s 排障时它直接对接 containerd，不装会报 `unix:///var/run/dockershim.sock` 找不到）：

```bash
cat > /etc/crictl.yaml <<'EOF'
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
EOF

# 验证运行时
crictl version
crictl info | grep -i systemd   # 能看到 "systemdCgroup": true 即正确
```

> 经典报错 `failed to create kubelet: misconfiguration: kubelet cgroup driver: "systemd" is different from docker cgroup driver: "cgroupfs"` —— 99% 是漏了 `SystemdCgroup = true` 或改完没重启 containerd。

## 五、安装 kubeadm / kubelet / kubectl（所有节点执行）

2024 年起 Kubernetes 启用了新的社区仓库结构（pkgs.k8s.io），老的 Google 源和部分阿里云旧教程路径已失效。以下为**当前有效的阿里云镜像源**写法：

```bash
# 1) 添加 K8s 1.30 专属仓库（路径里的 v1.30 决定小版本流）
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.30/deb/Release.key \
  | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.30/deb/ /' \
  > /etc/apt/sources.list.d/kubernetes.list

# 2) 安装三件套并锁版本（防止 apt upgrade 误升级导致节点漂移）
apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
systemctl enable kubelet    # 此时 kubelet 起不来属正常，它在等 kubeadm 生成配置

# 3) 验证
kubeadm version -o short   # 应输出 v1.30.x
```

> 想换 K8s 版本：把上面两处 `v1.30` 和后文 kubeadm 配置里的 `v1.30.4` 整体替换即可，其余步骤一字不改。Worker 与 Master 的小版本差不能超过 1 个次要版本，建议三件套全集群完全一致。

## 六、部署统一入口：HAProxy + Keepalived（仅 3 台 Master）

3 台 Master 各自部署一份 HAProxy + Keepalived：任何一台存活，VIP 就在，`192.168.56.100:16443` 始终能转发到健康的 apiserver。

### 6.1 三台都装

```bash
apt-get install -y haproxy keepalived
```

### 6.2 HAProxy 配置（三台完全相同）

```
cat > /etc/haproxy/haproxy.cfg <<'EOF'
global
    log /dev/log local0
    maxconn 4096
    daemon

defaults
    log global
    mode tcp
    option tcplog
    timeout connect 5s
    timeout client  1h
    timeout server  1h

# 对外暴露 16443（不能用 6443，会与本机 apiserver 冲突）
frontend k8s-api-front
    bind *:16443
    default_backend k8s-api-back

# 三个后端：apiserver 真正监听 6443，健康检查 2 秒一次
backend k8s-api-back
    option tcp-check
    balance roundrobin
    server k8s-master01 192.168.56.101:6443 check inter 2s fall 3 rise 2
    server k8s-master02 192.168.56.102:6443 check inter 2s fall 3 rise 2
    server k8s-master03 192.168.56.103:6443 check inter 2s fall 3 rise 2
EOF
```

### 6.3 Keepalived 健康检查脚本（三台相同）

```bash
cat > /etc/keepalived/check_haproxy.sh <<'EOF'
#!/bin/bash
# haproxy 进程挂了就尝试拉起，拉不起来则让出 VIP
if ! killall -0 haproxy; then
    systemctl restart haproxy
    sleep 1
    killall -0 haproxy || exit 1
fi
exit 0
EOF
chmod +x /etc/keepalived/check_haproxy.sh
```

### 6.4 Keepalived 配置（priority/state 三台不同）

```
# ===== master01（192.168.56.101）：MASTER，优先级最高 =====
cat > /etc/keepalived/keepalived.conf <<'EOF'
global_defs {
    router_id K8S_HA
}
vrrp_script check_haproxy {
    script "/etc/keepalived/check_haproxy.sh"
    interval 2
    weight -20
    fall 2
    rise 2
}
vrrp_instance VI_K8S {
    state MASTER
    interface enp0s8            # ← 改成你 192.168.56.x 所在网卡名，ip a 自查
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass K8sHa123
    }
    virtual_ipaddress {
        192.168.56.100/24
    }
    track_script { check_haproxy }
}
EOF

# ===== master02：state BACKUP，priority 90 =====
# ===== master03：state BACKUP，priority 80 =====
# 其余内容完全一致（virtual_router_id 必须都是 51）
```

三台启动并设置开机自启：

```bash
systemctl enable --now haproxy keepalived
systemctl restart haproxy keepalived
```

### 6.5 验证 VIP

```bash
# 在 master01 上应看到 VIP 绑在网卡上
ip -4 addr show enp0s8 | grep 192.168.56.100

# 任意节点测试 VIP 端口（此刻后端 apiserver 还没起，显示 Connected 后立即被关闭即说明转发链路通）
timeout 3 bash -c 'cat < /dev/null > /dev/tcp/192.168.56.100/16443' && echo "VIP 端口可达" || echo "apiserver 未就绪属预期，继续下一步"
```

> 现在 HAProxy 会把 3 个 apiserver 全部标记为 DOWN（红色），不用慌——apiserver 将在第七节拉起，健康检查会自动转绿。**初始化期间千万别先停 HAProxy**，否则第一个 apiserver 自举时会连不上 controlPlaneEndpoint。

## 七、初始化第一个 Master（仅在 master01 执行）

### 7.1 全量 kubeadm 配置文件

在 master01 上创建 `/root/kubeadm-config.yaml`：

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.56.101     # 本机内网 IP
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.30.4
controlPlaneEndpoint: "192.168.56.100:16443"   # 关键：所有节点统一连 VIP
imageRepository: registry.aliyuncs.com/google_containers   # 管控面镜像走阿里云
networking:
  podSubnet: 10.244.0.0/16          # 必须与第九节 Calico 的 CIDR 完全一致
  serviceSubnet: 10.96.0.0/12
  dnsDomain: cluster.local
apiServer:
  certSANs:                         # 证书要把 VIP 和各 Master 都签进去
    - 192.168.56.100
    - 192.168.56.101
    - 192.168.56.102
    - 192.168.56.103
    - 127.0.0.1
controllerManager:
  extraArgs:
    bind-address: 0.0.0.0            # 允许健康检查/跨节点访问
scheduler:
  extraArgs:
    bind-address: 0.0.0.0
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: ipvs                          # 比 iptables 模式大规模下性能更好，需第三节的 ip_vs 模块
```

### 7.2 预拉镜像（国内环境强烈建议先做，失败现象与解法见第十节）

```bash
# 查看将拉取哪些镜像（应全部显示 registry.aliyuncs.com/google_containers 前缀）
kubeadm config images list --config /root/kubeadm-config.yaml

# 拉取
kubeadm config images pull --config /root/kubeadm-config.yaml

# 确认镜像落在 containerd 的 k8s.io 命名空间
crictl images
```

### 7.3 执行初始化

```bash
kubeadm init --config=/root/kubeadm-config.yaml --upload-certs
```

参数解释：`--upload-certs` 会把控制面证书加密后存到集群 Secret 中，其他 Master 加入时凭一把 `certificate-key` 自动下载，**不用再手工 scp 证书目录**。

成功后结尾会打印**三段命令**，务必保存好（示例，以你屏幕实际输出为准）：

```
Your Kubernetes control-plane has initialized successfully!

# ① kubectl 授权配置（在 master01 执行）
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# ② 其他 Master 加入命令（带 --control-plane）
kubeadm join 192.168.56.100:16443 --token xxxx.yyyy \
        --discovery-token-ca-cert-hash sha256:zzzz \
        --control-plane --certificate-key aaaa-bbbb

# ③ Worker 加入命令
kubeadm join 192.168.56.100:16443 --token xxxx.yyyy \
        --discovery-token-ca-cert-hash sha256:zzzz
```

立即执行 kubectl 授权并验证：

```bash
mkdir -p $HOME/.kube
cp -f /etc/kubernetes/admin.conf $HOME/.kube/config

kubectl get nodes      # master01 是 NotReady —— 正常，CNI 还没装
kubectl get pods -n kube-system   # CoreDNS 也在 Pending —— 等网络插件
```

> 可选：装上 kubectl 自动补全，后面命令敲一半按 Tab 就行：`apt-get install -y bash-completion && kubectl completion bash | tee /etc/bash_completion.d/kubectl >/dev/null && source /etc/bash_completion.d/kubectl`

## 八、加入另外两台 Master 和两台 Worker

### 8.1 master02、master03 分别执行（用输出中的第 ② 段命令）

```bash
kubeadm join 192.168.56.100:16443 --token xxxx.yyyy \
  --discovery-token-ca-cert-hash sha256:zzzz \
  --control-plane --certificate-key aaaa-bbbb
```

加入后各自执行 kubectl 授权（与 7.3 的①相同）。

### 8.2 node01、node02 分别执行（用第 ③ 段命令）

```bash
kubeadm join 192.168.56.100:16443 --token xxxx.yyyy \
  --discovery-token-ca-cert-hash sha256:zzzz
```

### 8.3 Token 过期了怎么办（24 小时有效，证书 key 2 小时有效）

不用重置集群，在任一已就绪的 Master 上重新生成：

```bash
# Worker join 命令一把生成
kubeadm token create --print-join-command

# 新的 Master 证书 key（与上一条拼接，加上 --control-plane --certificate-key）
kubeadm init phase upload-certs --upload-certs
```

### 8.4 阶段性检查

```bash
# 在任一 Master 上：3 个 master 应出现（NotReady 是因为 CNI 未装）
kubectl get nodes
# VIP 后端此时应全部转绿：ss -lntp | grep 16443
```

## 九、安装 Calico 网络插件（CNI，关键章节）

没有 CNI，节点永远 NotReady、Pod 无法跨节点通信。本文用 **Calico v3.28.2 + VXLAN**，并对两处国内环境必踩的坑做了定制。

### 9.1 下载清单并定制

```bash
cd /root
curl -L https://raw.githubusercontent.com/projectcalico/calico/v3.28.2/manifests/calico.yaml -o calico.yaml
# 若 raw.githubusercontent.com 不通，用 ghproxy 或 jsdelivr 镜像：
# curl -L https://cdn.jsdelivr.net/gh/projectcalico/calico@v3.28.2/manifests/calico.yaml -o calico.yaml
```

**定制一：Pod CIDR 与 kubeadm 对齐，并避开 192.168 网段**

编辑 calico.yaml，找到 `DaemonSet/calico-node` 的环境变量段，取消注释并改成：

```yaml
            - name: CALICO_IPV4POOL_CIDR
              value: "10.244.0.0/16"      # 必须等于 kubeadm-config 的 podSubnet
            - name: CALICO_IPV4POOL_IPIP
              value: "Never"              # 关闭 IPIP
            - name: CALICO_IPV4POOL_VXLAN
              value: "Always"             # 用 VXLAN(UDP 4789) 封装
```

> 为什么不用 Calico 默认的 192.168.0.0/16？两个原因：① 它与 kubeadm 默认规划不一致；② 大量本地虚拟机/办公室网络本身就在 192.168.x.x（比如 VirtualBox host-only 网卡是 192.168.56.1），**Pod 网段与宿主网络重叠会导致路由黑洞、Pod 跨节点时通时不通，极其难排查**。统一用 10.244.0.0/16 一步到位。
>
> 为什么用 VXLAN 不用 IPIP？IPIP 依赖 IP 协议号 4，很多家用路由器、NAT 网络、云平台不放行；VXLAN 封在普通 UDP 4789 里，兼容性最好。同二层直通的物理机房可改成 BGP（`CALICO_IPV4POOL_IPIP=Never` 且不启用 VXLAN），性能最高。

**定制二：镜像地址改成国内可拉取的前缀**

```bash
# calico.yaml 里三个镜像（cni/node/kube-controllers）都在 docker.io 下
sed -i 's#docker.io/calico#docker.m.daocloud.io/calico#g' calico.yaml

# 确认替换结果（三个镜像均应显示 docker.m.daocloud.io/calico/ 前缀）
grep 'image:' calico.yaml
```

### 9.2 部署并观察

```bash
kubectl apply -f calico.yaml

# 盯着每个节点的 calico-node 起来（每节点 1 个 DaemonSet Pod）
kubectl get pods -n kube-system -o wide -w
# calico-node 全部 Running 后，CoreDNS 会自动从 Pending 变 Running
kubectl get nodes    # 5 个节点全部 Ready
```

### 9.3 验证跨节点组网

```bash
# 查看 IP 池
kubectl get ippools
# 在 node01 起一个 pod，node02 起一个 pod，互 ping
kubectl run test1 --image=docker.m.daocloud.io/busybox:1.36 --overrides='{"spec":{"nodeName":"k8s-node01"}}' -- sleep 1d
kubectl run test2 --image=docker.m.daocloud.io/busybox:1.36 --overrides='{"spec":{"nodeName":"k8s-node02"}}' -- sleep 1d
kubectl wait pod test2 --for=condition=Ready --timeout=60s
kubectl exec test1 -- ping -c2 $(kubectl get pod test2 -o jsonpath='{.status.podIP}')
```

通了，集群网络完成。

## 十、镜像拉取失败专题（国内环境最高频问题）

装好集群后最常见的现象就是 `ImagePullBackOff`。先记住通用排查三件套，再对症下药：

```bash
kubectl describe pod <pod名> -n <命名空间> | tail -20   # 看 Events 里的真实报错
crictl images                                         # 本机到底有哪些镜像
crictl pull <镜像地址>                                  # 绕过 K8s 直接测试拉取，错误信息最直接
```

### 10.1 场景一：管控面镜像拉不下来（init/join 阶段卡住）

`registry.k8s.io` 在国内不可达。本文第七节已在 kubeadm 配置里设置 `imageRepository: registry.aliyuncs.com/google_containers`，`kubeadm config images pull` 会直接从阿里云拉。若用的是旧教程没配这个字段，可事后补救：

```bash
# 手工按阿里云前缀逐个拉，然后打回 k8s.io 原名（镜像内容一致）
for img in kube-apiserver:v1.30.4 kube-controller-manager:v1.30.4 \
           kube-scheduler:v1.30.4 kube-proxy:v1.30.4 \
           pause:3.9 etcd:3.5.12-0 coredns:v1.11.1; do
  ctr -n k8s.io images pull registry.aliyuncs.com/google_containers/$img
  ctr -n k8s.io images tag registry.aliyuncs.com/google_containers/$img registry.k8s.io/$img
done
```

### 10.2 场景二：业务镜像拉不下来（Docker Hub 限流/不可达）

在**所有节点**给 containerd 配置镜像加速（containerd 1.7+ 推荐的 certs.d 新格式）：

```bash
# 1) 指定 hosts 配置目录
sed -i 's#config_path = ""#config_path = "/etc/containerd/certs.d"#' /etc/containerd/config.toml
systemctl restart containerd

# 2) 为 docker.io 配加速端点（可写多个，containerd 会按顺序回退）
mkdir -p /etc/containerd/certs.d/docker.io
cat > /etc/containerd/certs.d/docker.io/hosts.toml <<'EOF'
server = "https://registry-1.docker.io"

[host."https://docker.m.daocloud.io"]
  capabilities = ["pull", "resolve"]

[host."https://dockerproxy.net"]
  capabilities = ["pull", "resolve"]
EOF

# 3) 验证（不需要带任何前缀，直接拉官方短名即可走加速）
crictl pull nginx:1.27
```

常用镜像仓库的公益代理对照表（截至发文可用，公益服务可能随时调整，失效就换同类代理）：

| 原仓库 | 代理地址写法 | 典型镜像 |
| --- | --- | --- |
| docker.io | docker.m.daocloud.io | nginx、redis、busybox |
| registry.k8s.io | k8s.m.daocloud.io | pause、kube-proxy |
| gcr.io | gcr.m.daocloud.io | 部分 GCP 生态镜像 |
| ghcr.io | ghcr.m.daocloud.io | GitHub Container Registry |
| quay.io | quay.m.daocloud.io | Prometheus、RedHat 生态 |
| mcr.microsoft.com | mcr.m.daocloud.io | azure 相关镜像 |

> 注意：YAML 里写私有镜像前缀（如 `docker.m.daocloud.io/library/nginx:1.27`）也能拉，但**改了加速域名就要改所有清单**；配 certs.d 的好处是 YAML 里继续写官方名，换加速源只改节点配置。

### 10.3 场景三：pause 沙箱镜像不一致（Pod 卡在 ContainerCreating）

现象：业务镜像明明有，`describe` 却报 `failed to get sandbox image: rpc error ... timeout`。原因是节点上 containerd 的 `sandbox_image` 还是默认的 `registry.k8s.io/pause:3.x`。第四节已经改到阿里云 pause:3.9，可用下面命令复查：

```bash
crictl info | grep -A1 sandboxImage
# 期望：registry.aliyuncs.com/google_containers/pause:3.9
```

### 10.4 场景四：纯离线环境（一键导入）

在能联网的机器上导出，再拷贝到所有节点导入：

```bash
# 联网机：导出为 tar
ctr -n k8s.io images export k8s-images.tar \
  registry.aliyuncs.com/google_containers/kube-apiserver:v1.30.4 # …其余镜像逐个列

# 离线节点：导入到 k8s.io 命名空间（必须带 -n k8s.io，否则 kubelet 看不到）
ctr -n k8s.io images import k8s-images.tar
```

> 高频低级错误：用 `docker save/load` 导镜像到 containerd 节点，结果导入到了 docker 的命名空间，kubelet 仍然报找不到。**containerd 一律用 `ctr -n k8s.io` 或 `crictl` 操作。**

## 十一、高可用验证与故障演练（不演练等于没做 HA）

### 11.1 控制面静态检查

```bash
# 1) apiserver 注册了三个端点（ENDPOINTS 列有 3 个 IP）
kubectl get endpoints kubernetes -n default

# 2) 三个控制器/调度器只有一个 LEADER（选主正常）
kubectl get lease -n kube-system
kubectl -n kube-system get lease kube-controller-manager -o jsonpath='{.spec.holderName}'; echo
kubectl -n kube-system get lease kube-scheduler -o jsonpath='{.spec.holderName}'; echo

# 3) etcd 三成员健康（在任一 master 执行）
kubectl -n kube-system exec etcd-k8s-master01 -- sh -c '
ETCDCTL_API=3 etcdctl \
  --cacert /etc/kubernetes/pki/etcd/ca.crt \
  --cert /etc/kubernetes/pki/etcd/server.crt \
  --key  /etc/kubernetes/pki/etcd/server.key \
  endpoint health -w table'

kubectl -n kube-system exec etcd-k8s-master01 -- sh -c '
ETCDCTL_API=3 etcdctl \
  --cacert /etc/kubernetes/pki/etcd/ca.crt \
  --cert /etc/kubernetes/pki/etcd/server.crt \
  --key  /etc/kubernetes/pki/etcd/server.key \
  member list -w table'
```

期望看到 3 个 endpoint 全部 `healthy`、3 个 member 且 name 分别为三台 master。

### 11.2 部署一个真实业务，边演练边观察

```yaml
cat > nginx-demo.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
spec:
  replicas: 3
  selector:
    matchLabels: {app: nginx-demo}
  template:
    metadata:
      labels: {app: nginx-demo}
    spec:
      containers:
      - name: nginx
        image: docker.m.daocloud.io/nginx:1.27
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-demo
spec:
  type: NodePort
  selector: {app: nginx-demo}
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
EOF
kubectl apply -f nginx-demo.yaml
```

### 11.3 演练一：挂掉一个 Master（模拟最常见故障）

```bash
# 在 master01 上直接关机
init 0
```

观察并验证：

1. 约 2 秒后 VIP 漂到 master02：`ip -4 addr show enp0s8`（在 master02 上查）；
2. HAProxy 自动摘除 master01：`journalctl -u haproxy -f` 可见 health check DOWN；
3. **kubectl 完全可用**（在 master02 上继续操作）：`kubectl get nodes`；
4. 业务无感知：`curl http://192.168.56.111:30080` 照常返回 Nginx 欢迎页；
5. etcd 仍可写：`kubectl scale deploy nginx-demo --replicas=4` 能成功；
6. 把 master01 开机，kubelet 自动拉起组件，VIP 是否回切取决于优先级配置（本文 master01 优先级 100 且为抢占式，恢复后会接回 VIP，属正常）。

### 11.4 演练二：只杀 apiserver 进程（验证进程级自愈）

```bash
# 在 master02 上
pkill -9 kube-apiserver
# kubelet 的 static pod 机制会在十几秒内自动重建它
watch crictl ps | grep apiserver
```

### 11.5 演练三：Worker 故障（验证业务自愈）

```bash
# 关闭 node01，其上的 nginx Pod 会在 controller-manager 的 node-eviction 超时
# （默认 node-monitor-grace-period 40s + 驱逐速率）后被重建到 node02
init 0
kubectl get pods -o wide -w
```

三个演练全部通过，这套集群才算真正具备"高可用"的底气。

## 十二、常见报错速查表与节点重置

| 报错关键词 | 根因 | 解决 |
| --- | --- | --- |
| `swap is supported` / kubelet 起不来 | swap 没关干净 | `swapoff -a` 并检查 fstab、`swapon --show` |
| `cgroup driver ... different` | containerd 与 kubelet cgroup 驱动不一致 | config.toml 改 `SystemdCgroup=true` 后重启 containerd |
| join 时 `x509: certificate has SAN ...` | 证书没签 VIP/IP | kubeadm-config 的 certSANs 补全后重新 init（或重建 apiserver 签名证书） |
| 节点一直 NotReady | CNI 没装/没起来 | `kubectl get pods -n kube-system | calico` 查 calico-node 日志 |
| Pod 跨节点不通 | Pod CIDR 与宿主网络重叠/封装协议被拦 | 用 10.244.0.0/16 + VXLAN（见第九节） |
| `ImagePullBackOff` | 镜像不可达 | 第十节四种场景逐项排查 |
| `connection refused: VIP:16443` | HAProxy/Keepalived 未起或网卡名配错 | `systemctl status`、核对 interface 网卡名 |
| join token 过期 | token 24h、cert-key 2h | 8.3 节命令重新生成 |
| `detected that the sandbox image ... is not present` | pause 镜像缺失/前缀错误 | 10.3 节复查 sandboxImage |
| 两个节点同名/主机名大写 | 主机名规划错误 | 改主机名后 reset 重新 join |

某台节点需要推倒重来时，**在该节点**执行标准重置流程：

```bash
kubeadm reset -f
rm -rf /etc/cni/net.d ~/.kube /var/lib/etcd   # master 才需要删 etcd 目录
iptables -F && iptables -t nat -F && ipvsadm --clear
systemctl restart containerd
# 然后重新执行对应角色的 join 命令
```

> 如果是 Master 重置，先把它从 etcd 集群干净摘除（在存活的 Master 上）：`kubectl -n kube-system exec etcd-k8s-master01 -- etcdctl ... member remove <MEMBER_ID>`，证书路径参数同 11.1，否则残留成员会持续报 learner/peer 告警。

## 十三、写在最后

搭高可用 K8s 的难点从来不在命令多，而在**四个顺序不能乱**：先做系统初始化（swap/内核/时间）→ 装好 containerd 并对齐 cgroup 驱动 → 先立 VIP 与负载均衡再初始化第一个 apiserver → 最后装 CNI 让节点 Ready。配合国内网络把镜像源分成"管控面走 kubeadm imageRepository、业务镜像走 containerd certs.d、离线场景走 ctr 导入"三条路径，几乎所有 ImagePullBackOff 都有确定解法。

这套 3 Master + 2 Worker 的集群不仅是练手环境，也等价于绝大多数中小团队的生产起步形态：后续加 Worker 只需一条 join、加 Master 同理（etcd 成员保持奇数），再往上才需要考虑外部 etcd、分层审计与备份恢复。建议把文中的三个故障演练真的跑一遍——**亲眼看着 VIP 漂移、Pod 自愈、etcd 多数派照常写入，对"高可用"这三个字的理解会比看十篇架构图都深刻。**
