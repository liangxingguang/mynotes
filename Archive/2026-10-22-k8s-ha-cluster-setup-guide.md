---
id: 2026-10-22-k8s-ha-cluster-setup-guide
title: K8s从零搭建高可用集群：3 Master + 2 Worker 保姆级实战
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/_o_wiC0G8xaqdWWgMjbJLw
source_type: link
platform: wechat
created: 2026-10-22
category: 技术
tags:
  - Kubernetes
  - 课程
  - 工程实践
asset_ref: Assets/2026/10/k8s-ha-cluster-setup-guide.md
wiki_status: ingested
---

# K8s从零搭建高可用集群：保姆级图文实战教程（3 Master + 2 Worker）

> 从裸机到可"拔电源"演练的生产级 K8s：3 控制面堆叠 etcd（Raft 三成员）+ HAProxy/Keepalived 统一 VIP + Calico VXLAN 组网。全量脚本/YAML 可复制，含国内镜像拉取失败四大场景解法与三个故障演练。

## 核心要点

- **HA 原理**：apiserver 无状态靠 VIP+四层 LB 多活；controller-manager/scheduler 租锁选主（15s 接管）；etcd Raft 多数派 3 节点容 1 挂——**成员数只选奇数**，2 节点挂 1 即不可写
- **拓扑选型**：90% 团队用堆叠 etcd（省机器、运维简单）；外部 etcd 独立 3 机仅超大规模/强合规需要
- **四顺序不能乱**：系统初始化（swap/内核/时间同步）→ containerd 对齐 systemd cgroup 驱动 → **先立 VIP 再 init 第一个 apiserver** → 最后装 CNI 节点才 Ready
- **kubeadm 要点**：controlPlaneEndpoint 指 VIP:16443、certSANs 签全 VIP+各 Master、`--upload-certs` 免 scp 证书、imageRepository 走阿里云、kube-proxy 用 IPVS
- **Calico 定制**：Pod CIDR 必须等于 podSubnet 且避开 192.168 网段（防路由黑洞）；VXLAN(UDP 4789) 比 IPIP 兼容性好；镜像前缀 sed 换 daocloud
- **镜像失败四场景**：管控面→kubeadm imageRepository/手工 tag 回 k8s.io 名；业务镜像→containerd certs.d 加速端点（YAML 不改官方名）；pause 沙箱→查 sandboxImage；离线→`ctr -n k8s.io` 导出导入（别用 docker save/load）
- **故障演练**：挂 Master（VIP 2s 漂移、kubectl 可用、etcd 可写）、杀 apiserver（static pod 自愈）、关 Worker（Pod 驱逐重建）——不演练等于没做 HA

## 正文

完整架构图、端口表、初始化脚本、kubeadm/HAProxy/Keepalived/Calico 全量配置、报错速查表与节点重置流程见 [[Assets/2026/10/k8s-ha-cluster-setup-guide.md]]。

## 来源

- [K8s从零搭建高可用集群：保姆级图文实战教程（3 Master + 2 Worker，全量YAML开箱即用）](https://mp.weixin.qq.com/s/_o_wiC0G8xaqdWWgMjbJLw)

## 附件

- [[Assets/2026/10/k8s-ha-cluster-setup-guide.md]]
