---
id: wiki-concept-immutable-image-promotion
type: concept
title: 不可变镜像晋级链（编译一次、打包一次、同 digest 晋级）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - cicd
  - delivery
  - container
sources:
  - raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md
related:
  - wiki/concepts/delivery-time-metrics.md
  - wiki/concepts/release-manifest-recovery.md
  - wiki/concepts/blue-green-deployment.md
  - wiki/concepts/expand-migrate-contract.md
---
# 不可变镜像晋级链（编译一次、打包一次、同 digest 晋级）

## Definition（定义）

一条以唯一不可变镜像为交付中心的交付链：CI 只编译一次产出二进制 artifact，镜像 Job 只打包不编译，staging 与 production 部署同一 repository@digest，扫描、SBOM、签名全部针对同一 digest。版本身份靠编译期注入（CommitSHA/PipelineID）与 digest 固化，不靠可移动标签（latest/tag）。

## Why It Matters（为什么重要）

- 许多流水线先在 Go Job 编译一次、又在 Dockerfile 编译一次，造成两套工具链、缓存和版本注入逻辑——同一个"镜像"里可能藏着两个二进制（信源）。
- tag 可移动、digest 不可变：签名与部署必须针对 digest，否则"推送成功"与"部署内容"可能不是同一份（信源）。
- 预发布验证过的镜像与生产运行的镜像是同一份，验证结论才对生产有效。

## Core Characteristics（核心特征）

1. **编译一次、镜像只打包**：CI 编译产出 `dist/app` artifact；Dockerfile 仅 `COPY dist/app` + 非 root USER，不执行编译；Dockerfile 不能偷偷编译另一个二进制。
2. **版本身份编译期注入**：main 包声明 `CommitSHA`/`PipelineID` 变量，`-X` 注入；`/version` 读编译变量而非可独立变更的 ConfigMap；不注入动态构建时间以减少无谓二进制差异。严格可重现构建还依赖基础镜像、源码时间、工具链、依赖来源与完整构建参数。
3. **唯一 tag 检索 + digest 部署签名**：tag（如 commit-pipeline-job 组合）用于检索，digest 用于部署与签名；Buildx `--metadata-file` 产出 image-metadata.json，`jq -er` 读固定键并校验 `sha256:[a-f0-9]{64}` 格式；不得回退 latest。
4. **五个常见误区（正确性先于性能）**：race 测试须 CGO_ENABLED=1 不能与静态发布同设；coverage.out 摘要≠行级可视化（GitLab 正则只提总百分比）；`needs` 同时定义顺序与产物来源（显式声明下载哪些上游 artifacts，不假设 dotenv 自动传递）；RollingUpdate 不是蓝绿/灰度（蓝绿要两套独立版本+流量切换，灰度要权重+观察窗口+中止条件）；`when: manual` 不是审批制度（取决于受保护分支/环境/审批/权限）。
5. **缓存是加速器不是交付物**：净收益 = 避免的下载与编译时间 - 恢复时间 - 保存时间；删全部缓存后构建仍须成功；二进制、发布清单与镜像 digest 必须走 artifacts 或镜像仓库。四层缓存各司其职：GOMODCACHE（模块复用）、GOCACHE（编译结果复用）、GitLab cache（跨 Job 目录传递）、BuildKit cache（构建步骤复用）；缓存 key 体现信任边界/工具链/平台；受保护与非受保护缓存隔离。
6. **部署与验证持同一把锁**：部署、镜像核对、版本核对、业务 smoke 必须在同一 `resource_group` Job 内完成，防止下一条 Pipeline 覆盖共享环境后"看到的不一定是自己的版本"；`resource_group` 只解决并发互斥、不判断新旧，生产还需过时部署防护。
7. **分支权限边界**：MR 默认只跑检查/测试/编译，不接触生产凭据、不推受信任镜像；受保护默认分支才允许镜像发布、供应链门禁与部署。

## Structure（结构）

```
提交/MR → 静态检查 → 竞态与单元测试 → 发布二进制（一次编译）
        → 镜像打包（仅打包）→ 扫描/SBOM/签名（同一 digest）
        → staging 部署与业务验证 → 生产人工门禁 → production 部署与观察
        → 发布证据与恢复记录
```

## How It Works（如何运作）

1. lint（gofmt/go vet/govulncheck）→ race-test（CGO_ENABLED=1, `go test -race -covermode=atomic`）→ compile（CGO_ENABLED=0, `-mod=readonly -trimpath -buildvcs=false`, -ldflags 注入版本）三 Job 并行；image Job `needs` 三者。
2. 镜像 Job 用 DIND 服务 + buildx，产出 release.env/release.json/image-metadata.json 三个 artifacts；扫描、SBOM、签名为接口层 Job，可接 Harbor/Trivy/Grype/Syft/Cosign，三原则：针对同一 digest、扫描失败/超时/发现漏洞是不同结果、豁免记录负责人理由到期、禁止 `|| true` 吞失败。
3. staging 与 production 直接下载 image Job 的发布清单；production 额外依赖 staging 成功。
4. deploy-verify.sh 持锁执行：选 KUBECONFIG → trap 采集 helm history/pods/deployment 证据 → `helm upgrade --install --atomic --wait` → 核对实际部署镜像 == repository@digest → curl readyz/version → jq 校验 commit/pipeline 与发布一致 → 真实业务 smoke。
5. 若团队已用 Argo CD 等 GitOps：由 CI 提交验证过的目标 digest 到部署仓库，再由控制器同步；不要让 CI 与 GitOps 控制器同时直接改同一 K8s 资源。

## Relationships（关系）

### Related Concepts（相关概念）

- [[blue-green-deployment|蓝绿发布]]：本链默认 RollingUpdate；蓝绿/灰度需额外流量控制，改一个 values 字段不会自动获得（信源误区 4）。
- [[expand-migrate-contract|Expand/Migrate/Contract]]：镜像晋级不撤销数据与消息，Schema 演进须配合 EMC。
- [[delivery-time-metrics|交付时间口径]]：本链优化效果用四口径 + 实验协议证明。
- [[idempotency-design|幂等设计]]：smoke 与重试的前提。

### Distinctions（区分）

- 与"Dockerfile 多阶段编译"路线的区别：后者让 Dockerfile 成为唯一发布编译入口，CI 的 Go Job 只承担检查；本页路线是 CI 编译、镜像只打包，二者不可混用（信源）。
- 与 [[artifact-verification-delivery|产物核验与独立交付]]：后者面向 Agent 任务产物核验，本页面向软件交付链；"部署镜像 == 发布清单 digest"的核对思想相通（解读）。

## Evolution（演进）

- 2026-11-04：自立。单一信源（Go 微服务 GitLab CI/CD 工程实战），含完整 YAML/脚本参考骨架。工程实践类内容，置信度 medium，待其他信源印证。

## Open Questions（开放问题）

- 不可变镜像与不可重现构建（reproducible build）的张力：digest 固化 ≠ 构建可重现，信源只给方向未给完整方案。
- 多架构（linux/amd64 + arm64）下 digest 与签名矩阵的组织方式，信源仅提及 arm64 独立验证。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md`（§2 范围与决策、§3 五个误区、§4 交付架构、§5 缓存工程、§6 前置条件、§7 参考实现）

## Related Knowledge（相关知识）

- [[2026-11-03-go-gitlab-cicd-delivery|Go 微服务 GitLab CI/CD 工程实战（信源页）]]
- [[delivery-time-metrics|交付时间口径]]
- [[release-manifest-recovery|发布集合与恢复决策]]
