# Wiki 页面结构规范（Wiki_Page_Schema.md）

## 1. 目的

本文档定义所有 Wiki 页面的规范结构。所有智能体**必须**遵循本规范。

---

## 2. 通用 Frontmatter

每一个 Wiki 页面**必须**以以下内容开头：

```yaml
---
id: wiki-<stable-id>
type: <page-type>
title: <title>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags:
  - tag-a
  - tag-b
sources:
  - raw/path/to/source.md
related:
  - wiki/path/to/page.md
---
```

### 必填字段

| 字段 | 是否必填 | 说明 |
|------|------|------|
| id | 是 | 稳定的页面标识 |
| type | 是 | 规范页面类型 |
| title | 是 | 人类可读的标题 |
| status | 是 | active/draft/deprecated/archived |
| created | 是 | 创建日期 |
| updated | 是 | 最近一次实质性更新日期 |
| confidence | 是 | 对已编译知识的可信度 |
| tags | 是 | 检索／分类标签 |
| sources | 是 | 支撑该页面的原始信源 |

`related` 为可选字段。

---

## 3. 页面类型：source（信源）

信源页面代表一个原始信源。

```markdown
---
id: wiki-source-<id>
type: source
title: <source title>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags: []
sources:
  - raw/sources/<path>.md
---
# <Source Title>
## Overview（概览）
这个信源讲的是什么。
## Key Facts（关键事实）
- Fact 1
- Fact 2
- Fact 3
## Important Claims（重要论断）
### Claim 1
...
### Claim 2
...
## Concepts Introduced（引入的概念）
- [[Concept A]]
- [[Concept B]]
## Entities Mentioned（提及的实体）
- [[Entity A]]
- [[Entity B]]
## Implications（影响／启示）
...
## Limitations（局限）
...
## Related Knowledge（相关知识）
- [[Related Page]]
## Source（信源）
- `raw/sources/...`
```

规则：

- 一个信源页面对应一个规范的原始信源。
- 不得把互不相关的原始信源合并进同一个信源页面。
- 信源页面做的是摘要，它不取代原始信源本身。

---

## 4. 页面类型：concept（概念）

概念页面描述一个可复用的思想。示例：Event Mesh（事件网格）、Retrieval-Augmented Generation（检索增强生成）、Knowledge Graph（知识图谱）、State Engine（状态引擎）。

```markdown
---
id: wiki-concept-<id>
type: concept
title: <Concept>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags:
  - concept
sources:
  - raw/sources/...
related:
  - wiki/concepts/...
---
# <Concept>
## Definition（定义）
规范定义。
## Why It Matters（为什么重要）
...
## Core Characteristics（核心特征）
1. ...
2. ...
3. ...
## Structure（结构）
...
## How It Works（运作方式）
...
## Relationships（关系）
### Related Concepts（相关概念）
- [[Concept A]]
- [[Concept B]]
### Dependencies（依赖项）
- [[Concept C]]
### Distinctions（区分）
- 与 [[Concept D]] 的不同之处在于 ...
## Evolution（演进）
...
## Open Questions（开放问题）
...
## Evidence（证据）
- Source: `raw/sources/...`
## Related Knowledge（相关知识）
- [[Topic]]
- [[Decision]]
- [[Comparison]]
```

---

## 5. 页面类型：entity（实体）

实体包括：人物；公司；产品；项目；组织；技术。

```markdown
---
id: wiki-entity-<id>
type: entity
title: <Entity>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags:
  - entity
sources:
  - raw/sources/...
---
# <Entity>
## Overview（概览）
...
## Identity（身份信息）
- Type（类型）:
- Organization（所属组织）:
- Role（角色）:
- Status（状态）:
## Important Facts（重要事实）
...
## Products / Projects（产品／项目）
- [[Product A]]
- [[Project B]]
## Relationships（关系）
- [[Entity A]]
- [[Entity B]]
## Timeline（时间线）
- YYYY-MM-DD — ...
## Current Understanding（当前认知）
...
## Evidence（证据）
- `raw/sources/...`
```

---

## 6. 页面类型：topic（主题）

主题页面是一个导航与综述页面。它**不应**沦为通用的内容堆放场。

```markdown
---
id: wiki-topic-<id>
type: topic
title: <Topic>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: medium
tags:
  - topic
sources:
  - raw/sources/...
---
# <Topic>
## Scope（范围）
哪些内容属于该主题。
## Current Understanding（当前认知）
...
## Key Concepts（关键概念）
- [[Concept A]]
- [[Concept B]]
## Key Entities（关键实体）
- [[Entity A]]
- [[Entity B]]
## Important Decisions（重要决策）
- [[Decision A]]
## Major Developments（重大进展）
...
## Disagreements（分歧）
...
## Open Questions（开放问题）
...
## Related Topics（相关主题）
- [[Topic A]]
- [[Topic B]]
```

---

## 7. 页面类型：decision（决策）

决策页面用于留存推理过程。

```markdown
---
id: wiki-decision-<id>
type: decision
title: <Decision>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags:
  - decision
sources:
  - raw/sources/...
related:
  - wiki/concepts/...
---
# <Decision>
## Decision（决策内容）
做出了什么决定。
## Context（背景）
为什么必须做出这个决定。
## Options Considered（考虑过的方案）
### Option A
...
### Option B
...
### Option C
...
## Rationale（理由）
被选中的方案凭什么胜出。
## Consequences（后果）
### Positive（正面）
...
### Negative（负面）
...
## Constraints（约束条件）
...
## Evidence（证据）
- `raw/sources/...`
## Reconsideration Criteria（重新评估条件）
在什么情况下应当重新审视该决策？
## Evolution（演进）
后续发展**必须**追加在此处，而不是重写历史。
```

---

## 8. 页面类型：comparison（对比）

对比页面用于比较多个实体或方案。

```markdown
---
id: wiki-comparison-<id>
type: comparison
title: <A> vs <B>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: medium
tags:
  - comparison
sources:
  - raw/sources/...
related:
  - wiki/entities/...
---
# <A> vs <B>
## Scope（范围）
...
## Comparison Matrix（对比矩阵）
| Dimension（维度） | A | B |
|---|---|---|
| Purpose（用途） | | |
| Architecture（架构） | | |
| Strengths（优势） | | |
| Weaknesses（劣势） | | |
| Cost（成本） | | |
| Complexity（复杂度） | | |
## Analysis（分析）
...
## Best Fit（适用场景）
### A is preferable when（以下情况 A 更合适）
...
### B is preferable when（以下情况 B 更合适）
...
## Important Caveats（重要提醒）
...
## Evidence（证据）
...
```

---

## 9. 页面类型：synthesis（综述）

综述页面是在多个信源之上形成的结论。这是风险最高的页面类型。它**必须**显式区分「信源事实」与「综述结论」。

```markdown
---
id: wiki-synthesis-<id>
type: synthesis
title: <Synthesis>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: medium
tags:
  - synthesis
sources:
  - raw/sources/source-a.md
  - raw/sources/source-b.md
  - raw/sources/source-c.md
---
# <Synthesis>
## Question（问题）
这篇综述回答的是什么问题？
## Source Findings（各家信源的发现）
### Source A
...
### Source B
...
### Source C
...
## Common Ground（共识）
...
## Differences（差异）
...
## Synthesis（综述）
编译后的解读是：
...
## Confidence（可信度）
High / Medium / Low（高／中／低）

Reason（理由）：
...
## Alternative Interpretations（其他可能的解读）
...
## Unresolved Issues（未解决的问题）
...
## Evidence（证据）
- `raw/sources/source-a.md`
- `raw/sources/source-b.md`
- `raw/sources/source-c.md`
```

---

## 10. 页面类型：timeline（时间线）

```markdown
---
id: wiki-timeline-<id>
type: timeline
title: <Timeline>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
tags:
  - timeline
sources:
  - raw/sources/...
---
# <Timeline>
## Timeline（时间线）
| Date（日期） | Event（事件） | Source（信源） |
|---|---|---|
| YYYY-MM-DD | Event | [[Source]] |
| YYYY-MM-DD | Event | [[Source]] |
## Phases（阶段）
### Phase 1
...
### Phase 2
...
## Turning Points（转折点）
...
## Current State（当前状态）
...
## Evidence（证据）
...
```

---

## 11. 证据规则

对于重要事实，智能体**应当**保留足够的信源信息，以便定位到原始证据。

Wiki 页面**绝对不得**成为无依据断言的产地。

当证据相互冲突时：

```markdown
## Contradictions（矛盾）
### Claim A（断言 A）
Source: ...
### Claim B（断言 B）
Source: ...
### Current Assessment（当前评估）
Disputed / A currently preferred / B currently preferred
（存疑 / 目前倾向 A / 目前倾向 B）
```

---

## 12. 可信度规则

### High（高）

有强有力的一手证据直接支撑。

### Medium（中）

由多个二次信源或强力的间接证据支撑。

### Low（低）

证据有限、间接、不确定或相互冲突。

### Unknown（未知）

Wiki 当前未能确立该断言。

---

## 13. 关系规则

链接应当表达有意义的语义关系。推荐的关系类型：

- related（相关）；
- depends-on（依赖于）；
- derived-from（派生自）；
- contradicts（与……矛盾）；
- supersedes（取代）；
- part-of（属于）；
- example-of（是……的实例）；
- alternative-to（是……的替代方案）。

避免过度链接。一个页面应当连接得足以在知识图谱中导航，但**不应**密集到每个页面都指向所有页面。

---

## 14. 页面生命周期

```text
draft（草稿）
  ↓
active（活跃）
  ↓
deprecated（已废弃）
  ↓
archived（已归档）
```

如果有新证据使其重新变得重要，页面可以回到 `active` 状态。

---

## 15. 最小页面规则

不应仅仅因为存在某个关键词就创建一个页面。

满足以下至少一条时，**应当**创建页面：

- 该概念被反复复用；
- 该实体具有重要性；
- 有多个信源讨论该主题；
- 该主题会影响某个决策；
- 未来的查询很可能需要它；
- 该主题连接了 Wiki 中的多个领域。

---

## 16. 质量规则

一个好的 Wiki 页面应当能回答：

1. 这是什么？
2. 为什么重要？
3. 我们知道什么？
4. 这些知识由什么支撑？
5. 与之相关的是什么？
6. 还有什么不确定？

如果一个页面无法回答这些问题，它很可能是不完整的，或者根本不必要存在。
