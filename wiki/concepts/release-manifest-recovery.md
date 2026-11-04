---
id: wiki-concept-release-manifest-recovery
type: concept
title: 发布集合与恢复决策（Release Manifest & Recovery）
status: active
created: 2026-11-04
updated: 2026-11-04
confidence: medium
tags:
  - concept
  - cicd
  - delivery
  - recovery
sources:
  - raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md
related:
  - wiki/concepts/immutable-image-promotion.md
  - wiki/concepts/expand-migrate-contract.md
  - wiki/concepts/idempotency-design.md
  - wiki/concepts/retry-governance.md
  - wiki/concepts/blue-green-deployment.md
---
# 发布集合与恢复决策（Release Manifest & Recovery）

## Definition（定义）

一次业务发布是镜像 digest + Chart commit + 配置 revision + 迁移 revision + 验证证据的集合，单一镜像 digest 不足以完整描述发布；回滚不是一条命令，而是对发布集合的恢复决策——在核对当前 digest、配置 revision、迁移状态、消息兼容窗口与外部副作用后，选择 Helm 回滚到 known-good revision、配置恢复或修复前进与补偿三条路径之一。

## Why It Matters（为什么重要）

- 镜像 digest 不足以完整描述业务发布：配置、迁移、协议可能已变更，只回退镜像无法恢复业务状态（信源）。
- Helm 回滚不会撤销数据库数据或已发送的 Kafka 消息；支付恢复依赖幂等、状态机、对账与补偿，而不是"镜像回到上一版"（信源）。
- 默认"上一条历史"做回滚目标可能包含失败、重试或自动恢复的 revision，必须明确 known-good（信源）。

## Core Characteristics（核心特征）

1. **发布清单 JSON 字段**：service / source_commit / pipeline_id / image（repository@sha256:digest）/ chart_commit / config_revision / migration_revision / previous_release（known-good）/ verification（scan/signature/smoke 结果）。
2. **发布决策记录 JSON**：release_id / target_environment / artifact / source_commit / configuration_revision / migration_revision / quality_gates / approval（actor+at）/ decision / previous_known_good；不含凭据与敏感数据；目的是让审批、产物、配置、迁移、恢复入口可关联，而非替代审批制度。
3. **配置发布不是 Helm 事务**（Nacos 案例）：评审 → Schema 与业务约束校验 → 内容 hash → 发布到指定 namespace/group/dataId → 读回 hash → 验证实例接受 revision → 观察 → 记录可恢复版本。须明确 Git 是否唯一权威、控制台应急修改如何回写；无持续 reconciliation 时"CI 从 Git 推送配置"只是配置即代码发布而非完整 GitOps。
4. **热更新区分值更新与资源重建**：日志级别/限流/开关适合热更新；DSN/Kafka 连接/TLS 涉及客户端生命周期，不能仅替换结构体字段。`atomic.Pointer`/`atomic.Value` 只原子发布不可变快照，map/slice/指针不能并发修改；审计日志不打印完整配置或密钥。
5. **失败三阶段处置**：K8s 就绪前（拉镜像失败/启动崩溃/探针失败：Helm atomic 范围内恢复+保存证据）；就绪后业务验证（版本错误/断言失败/幂等异常：停止晋级、确认兼容性后恢复已知良好集合）；发布后观察（错误率/P95/消费积压/回调失败上升：停止扩大影响，按证据选择回滚/配置恢复/补偿）。`--atomic` 仅处理 Helm 升级失败范围内的恢复；就绪后业务验证失败不以统一 trap 无条件回滚，尤其支付系统不能忽略数据库兼容性、消息副作用与资金状态。
6. **已知良好回滚**：`helm history <release> -n <ns>` 定位 known-good revision 后 `helm rollback <release> <known-good-revision> --wait --timeout 8m`；恢复后重新核对部署镜像、配置 revision、业务接口与指标。迁移越过兼容窗口时优先修复前进，不机械回退二进制。
7. **观察信号按服务定制**：订单（创建成功率/状态迁移错误/延迟）、支付（验签/幂等冲突/渠道错误/待处理）、通知（Kafka lag/重试/死信/发送成功率）；阈值基于基线/SLO/样本量/时间窗口；监控后端不可用标记"证据不足"而非默认绿色；观察窗口长度按业务峰谷/流量/异步时延/SLO 定。
8. **重试原则**：网络拉取可有限重试；竞态检测、业务断言、Schema 校验失败不能靠重试洗成成功；部署重试前检查 Helm revision 与集群状态；创建订单、执行迁移、外部支付调用必须先保证幂等。
9. **三种恢复路径及边界**：Helm 回滚到已知 revision（适用：镜像配置均兼容、未跨迁移窗口；不适用：数据结构已收缩/协议不兼容/副作用不可逆）；配置恢复（适用：限流/开关/路由等可独立回退配置引起；不适用：新旧配置与应用版本不兼容或配置非根因）；修复前进与补偿（适用：数据已写入/消息已发/外部有副作用；不适用：有更安全、已演练且兼容的即时回退方案时）。所有恢复动作重跑镜像/版本/业务验证。
10. **八类故障定期演练**：镜像能拉但探针不过；Helm 成功但 /version 与清单不一致；smoke 失败且下一条 Pipeline 在等环境锁；扫描超时/签名不可用/验证失败；Nacos 配置更新但实例拒绝新 revision 或控制台漂移；迁移已执行旧二进制不能安全恢复；Kafka 重平衡时 SIGTERM 有处理中消息；指标后端不可用无观察证据。演练产物含时间线、决策依据、证据链接、恢复耗时、遗漏告警与改进项。

## Structure（结构）

```
发布集合 = 镜像 digest ∪ Chart commit ∪ 配置 revision ∪ 迁移 revision ∪ 验证证据
恢复决策 = f(当前 digest, 配置 revision, 迁移状态, 消息兼容窗口, 外部副作用)
  ├── 路径 A：Helm 回滚到 known-good（集合内可逆部分）
  ├── 路径 B：配置恢复（仅配置是根因时）
  └── 路径 C：修复前进 + 补偿（副作用已发生时）
```

## How It Works（如何运作）

1. 发布时由 image Job 产出 release.json（发布清单），deploy-verify.sh 采集部署证据（helm history/pods/deployment/readyz/version/smoke）。
2. 人工门禁基于发布清单 + staging 验证证据做批准决策；发布决策记录 JSON 归档供事后关联。
3. 故障发生时按三阶段定位：就绪前失败走 atomic 恢复；就绪后业务失败停止晋级、核对兼容性；观察期指标异常按证据选恢复路径。
4. 恢复动作完成后重跑镜像核对、版本核对与业务 smoke，确认回到已知良好状态。

## Relationships（关系）

### Related Concepts（相关概念）

- [[expand-migrate-contract|Expand/Migrate/Contract]]：迁移窗口决定"能否回滚"的结构性边界；越过兼容窗口只能修复前进（双信源互证）。
- [[idempotency-design|幂等设计]]：支付/订单恢复的地基；创建订单、迁移、支付调用重试前必须先幂等。
- [[retry-governance|重试治理]]：可重试失败（网络拉取）与不可重试失败（竞态/断言/Schema）的分流一致。
- [[blue-green-deployment|蓝绿发布]]：四种回退（流量/应用/数据/业务）边界与本页三恢复路径互补。
- [[immutable-image-promotion|不可变镜像晋级链]]：发布集合中镜像身份的来源。
- [[consumer-lag-governance|消费积压治理]]：通知服务观察的 Kafka lag 处置入口。

### Distinctions（区分）

- 与"回滚=helm rollback"的常见认知区别：回滚是对发布集合的恢复决策，默认上一条历史可能是失败 revision（信源）。
- 与 [[durable-execution|持久执行]]：后者面向 Agent 任务断点续跑，本页面向业务发布恢复；"恢复后重跑验证"思想相通（解读）。

## Evolution（演进）

- 2026-11-04：自立。单一信源（Go 微服务 GitLab CI/CD 工程实战），含发布清单/决策记录 JSON 模板与八类演练清单。工程实践类内容，置信度 medium，待其他信源印证。

## Open Questions（开放问题）

- 发布清单的跨系统对齐（CI/变更单/发布系统/Nacos）工程实现，信源只给字段未给集成方案。
- known-good revision 的自动判定（如何从历史中排除失败/重试 revision）信源未覆盖。

## Evidence（证据）

- Source: `raw/sources/architecture/2026-11-03-weixin-go-gitlab-cicd-delivery.md`（§10 供应链门禁、§11 发布是一个集合、§12 回滚观察与恢复、§16 运行手册模板）

## Related Knowledge（相关知识）

- [[2026-11-03-go-gitlab-cicd-delivery|Go 微服务 GitLab CI/CD 工程实战（信源页）]]
- [[immutable-image-promotion|不可变镜像晋级链]]
- [[expand-migrate-contract|Expand/Migrate/Contract]]
