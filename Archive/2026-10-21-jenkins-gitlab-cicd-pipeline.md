---
id: 2026-10-21-jenkins-gitlab-cicd-pipeline
title: Jenkins + GitLab CI/CD 流水线落地实战（完整配置）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/OkT4w402xVI9RJjf3E_8vA
source_type: link
platform: 微信
created: 2026-10-21
category: 技术
tags: [CI/CD, 工程实践, 工具]
asset_ref: Assets/2026/10/jenkins-gitlab-cicd-pipeline.md
wiki_status: ingested
---

# Jenkins + GitLab CI/CD 流水线落地实战

> 两套可直接落地的完整流水线：声明式 Jenkinsfile（约 130 行）与 .gitlab-ci.yml（约 90 行），覆盖 push 触发→lint→pytest→docker build/push→SSH 部署→健康检查失败自动回滚全链路，配 deploy.sh（releases/current 软链模式，保留最近 5 版）与 6 个避坑点。三个核心认知：流水线是代码（进仓库走评审）、失败要早要自动（lint 5 秒能拦的别等半夜报警）、一切可追溯（TAG=commit 前 8 位+构建号，不用 latest）。版本基准 Jenkins 2.452 LTS / GitLab 16.10 / Docker 27。

## 核心要点

- **阶段顺序=失败尽早暴露**：lint→test→build→push→deploy，越便宜的检查越靠前；任一环节失败全链路停止
- **镜像 TAG**：`commit前8位-构建号`，可追溯、回滚即换 TAG；禁用 latest
- **凭据零明文**：Jenkins Credentials / GitLab Variables（File/Masked 类型），`--password-stdin` 防进程列表泄露；密码进 Jenkinsfile = 向全公司广播
- **并发部署防护**：Jenkins 用 disableConcurrentBuilds，跨任务/分支用部署脚本 flock 文件锁 + 环境隔离
- **deploy.sh 设计**：新版本独立目录起容器→/health 探测 60s→失败 compose down 回滚（旧版本无感）→成功才切 current 软链→保留 5 版
- **GitLab CI 要点**：extends 隐藏模板消灭重复；cache（跨流水线，不可靠）vs artifacts（流水线内传递+报告归档）是两回事；staging 自动、production `when: manual` 保留人工决策点
- **避坑**：GitLab 16.x 默认禁 Webhook 请求内网（需开 Outbound requests）；Runner 里 docker 用 dind（隔离好）或挂 docker.sock（简单）；健康检查必须探测真实依赖（DB ping）而非静态 JSON；配置放服务器 .env 不进镜像

## 正文

全文（含完整 Jenkinsfile / .gitlab-ci.yml / deploy.sh 代码与生产检查清单）见 [[Assets/2026/10/jenkins-gitlab-cicd-pipeline]]。

## 来源

[告别手动！Jenkins+GitLab CI/CD 流水线落地实战（完整 Jenkinsfile + .gitlab-ci.yml，提交即构建、测试、部署）](https://mp.weixin.qq.com/s/OkT4w402xVI9RJjf3E_8vA)

## 附件

- [[Assets/2026/10/jenkins-gitlab-cicd-pipeline]]
