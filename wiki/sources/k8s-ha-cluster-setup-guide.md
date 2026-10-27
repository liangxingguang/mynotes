---
id: wiki-source-k8s-ha-cluster-setup-guide
type: source
title: K8s 从零搭建高可用集群：3 Master + 2 Worker 保姆级实战
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: high
tags:
  - source
  - kubernetes
  - high-availability
  - devops
sources:
  - raw/sources/architecture/2026-10-22-k8s-ha-cluster-setup-guide.md
related:
  - wiki/sources/database-high-availability.md
  - wiki/sources/raft-membership-log-barrier.md
---
# K8s 从零搭建高可用集群：3 Master + 2 Worker 保姆级实战

## Overview（概览）

从裸机到可"拔电源"演练的生产级 K8s 搭建教程：3 控制面堆叠 etcd（Raft 三成员）+ HAProxy/Keepalived 统一 VIP + Calico VXLAN 组网。全量脚本/YAML 可复制（K8s 1.30 实测组合），含国内镜像拉取失败四大场景解法与三个故障演练。

## Key Facts（关键事实）

- HA 原理分工：apiserver 无状态，靠 VIP+四层 LB 多活；controller-manager/scheduler 租锁选主（15s 接管）；etcd Raft 多数派——**成员数只选奇数**（3 节点容 1 挂，2 节点挂 1 即不可写）。
- 拓扑选型：90% 团队用堆叠 etcd（省机器、运维简单）；外部 etcd 独立 3 机仅超大规模/强合规需要。
- 四顺序不能乱：系统初始化（swap/内核/时间同步——证书签发、etcd Raft、选主都强依赖时间一致）→ containerd cgroup 驱动对齐 systemd（不一致 kubelet 启动失败）→ **先立 VIP 再 init 第一个 apiserver** → 最后装 CNI 节点才 Ready。
- kubeadm 要点：`controlPlaneEndpoint` 指 VIP:16443；certSANs 签全 VIP+各 Master；`--upload-certs` 免 scp 证书；imageRepository 走阿里云；kube-proxy 用 IPVS。
- Calico 定制：Pod CIDR 必须等于 podSubnet 且避开 192.168 网段（防路由黑洞）；VXLAN（UDP 4789）比 IPIP 兼容性好；镜像前缀 sed 换 daocloud。
- 国内镜像失败四场景解法：管控面→kubeadm imageRepository/手工 tag 回 k8s.io 名；业务镜像→containerd certs.d 加速端点（YAML 不改官方名）；pause 沙箱→查 sandboxImage；离线→`ctr -n k8s.io` 导出导入（别用 docker save/load）。
- 故障演练三板：挂 Master（VIP 2s 漂移、kubectl 可用、etcd 可写）、杀 apiserver（static pod 自愈）、关 Worker（Pod 驱逐重建）——**不演练等于没做 HA**。

## Important Claims（重要论断）

### Claim 1：不演练等于没做 HA

搭建完成只是起点，必须通过拔电源级故障演练验证 VIP 漂移、etcd 可写与 Pod 驱逐（信源收尾立场，与 [[database-high-availability]] 的 GitHub/阿里云反面案例互证）。

## Concepts Introduced（引入的概念）

（无——etcd Raft 多数派/奇数成员与 [[raft-membership-log-barrier]] 既有概念呼应，未立新页）

## Entities Mentioned（提及的实体）

- Kubernetes / etcd / HAProxy / Keepalived / Calico / containerd（单一信源，暂不立实体页）

## Implications（影响／启示）

- "奇数成员+多数派"的 etcd 设计与数据库半同步"不退化"配置同为用奇数/冗余换可用性的典型（解读）。
- 搭建顺序即依赖图：VIP 先于 apiserver init 是因为证书 SAN 与 endpoint 一旦定型难改——基础设施不可变决策前置（解读）。

## Limitations（局限）

- 单版本实测组合（K8s 1.30/Ubuntu），跨版本需重新验证；实验环境关防火墙，生产需按端口表精放。

## Related Knowledge（相关知识）

- [[database-high-availability|数据库高可用五层主线（信源页）]]（HA 方法论的另一层：DB 侧）
- [[raft-membership-log-barrier|Raft 成员变更（信源页）]]（etcd 成员数奇数规则的协议根基）
- [[k8s-blue-green-release-trading|K8s 蓝绿发布实战（信源页）]]（集群建好之后的交付层：渐进式发布与回退）

## Source（信源）

- `raw/sources/architecture/2026-10-22-k8s-ha-cluster-setup-guide.md`
