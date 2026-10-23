---
id: wiki-source-jenkins-gitlab-cicd-pipeline
type: source
title: Jenkins + GitLab CI/CD 流水线落地实战（完整 Jenkinsfile + .gitlab-ci.yml）
status: active
created: 2026-10-23
updated: 2026-10-23
confidence: medium
tags:
  - source
  - cicd
  - jenkins
  - gitlab
sources:
  - raw/sources/architecture/2026-10-21-jenkins-gitlab-cicd-pipeline.md
related: []
---
# Jenkins + GitLab CI/CD 流水线落地实战（完整配置）

## Overview（概览）

教程文：同一 Python 服务分别用 Jenkins（Jenkinsfile）与 GitLab CI（.gitlab-ci.yml）实现完整流水线——push 触发 → lint → pytest → docker build/push → SSH 部署 + 健康检查 + 自动回滚 → 通知；附 deploy.sh 与六个常见坑。

## Key Facts（关键事实）

- 本质论断：CI/CD 不是省打字时间，而是把发布从**依赖人的操作**变成**依赖代码的流程**——可评审、可复现、可审计；手动 vs 流水线单次发版 20-40 分钟 → 5-10 分钟无人值守。
- 选型：Jenkins（独立服务、Groovy Jenkinsfile、插件极丰富、适合多代码平台/复杂编排/存量团队）vs GitLab CI（GitLab 自带、纯 YAML、上手低、代码已在 GitLab 就够）；两者流水线逻辑同构，"选型纠结超过半天本身就是浪费"。
- 阶段划分原则：**失败尽早暴露，越便宜的检查越靠前**（lint 5 秒就不必等 pytest 2 分钟）。
- 镜像 TAG 用 `commit 前8位+构建号` 而非 latest：可追溯、回滚=换 TAG。
- 凭据纪律：全部走 CI 凭据管理，代码里只出现凭据 ID；`--password-stdin` 避免密码进进程列表；"把密码写进 Jenkinsfile 提交 git = 向全公司广播密码"。
- `disableConcurrentBuilds` 不可省：两次部署同时 SSH 同机 docker compose 会互相干扰。
- deploy.sh 模式：releases/时间戳目录 + current 软链；compose 文件固化 TAG；健康检查最多 60 秒失败则 `docker compose down` 自动回滚（旧版本不动）；只保留最近 5 版。
- 六坑：Webhook 触发不灵、凭据被打进日志、构建越来越慢（Dockerfile 层缓存：依赖文件单独 COPY + CI pip 缓存）、分支部署互相覆盖、Runner 里 docker 不可用（dind vs 挂宿主机 docker.sock 的隔离取舍）、部署成功但 502（健康检查要查应用而非端口）。

## Important Claims（重要论断）

（无承重论断；工程教程。）

## Concepts Introduced（引入的概念）

（无）

## Entities Mentioned（提及的实体）

- Jenkins / GitLab CI（CI 平台，未立页）

## Implications（影响／启示）

- "失败尽早暴露+便宜检查靠前"的阶段排序原则适用于一切流水线与校验链设计（解读）。

## Limitations（局限）

- 面向中小团队单体服务部署；多环境晋升、金丝雀、GitOps 等进阶形态未涉及。

## Related Knowledge（相关知识）

（无）

## Source（信源）

- `raw/sources/architecture/2026-10-21-jenkins-gitlab-cicd-pipeline.md`
