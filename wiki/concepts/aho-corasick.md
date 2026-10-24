---
id: wiki-concept-aho-corasick
type: concept
title: AC 自动机（Aho-Corasick）
status: active
created: 2026-10-24
updated: 2026-10-24
confidence: high
tags:
  - concept
  - 字符串匹配
  - 算法
sources:
  - raw/sources/architecture/2026-10-23-vivo-diting-sensitive-word-matching.md
related:
  - wiki/sources/vivo-diting-sensitive-word-matching.md
---
# AC 自动机（Aho-Corasick）

## Definition（定义）

多模式串匹配算法：把所有模式串建成 Trie 字典树，再为每个节点加 Fail 指针（指向包含相同前缀的其他分支，缺省指根）。匹配时逐字符沿 Trie 转移，失配则沿 Fail 指针续配，均摊近似线性时间复杂度，可同时命中全部模式串。

## Why It Matters（为什么重要）

敏感词过滤、全文检索预筛、入侵检测特征匹配等场景需要在一次扫描中对百万级模式串求全命中。AC 自动机的扫描代价与模式串数量无关，是此类场景的默认选型之一。

## Core Characteristics（核心特征）

1. 一次扫描命中所有模式串，复杂度近似 O(目标串长度)
2. 共享前缀的模式串合并子树，省匹配次数
3. Fail 指针保证失配后不漏掉跨分支的后缀命中（如 "shis" 在 "she" 分支失配后转移命中 "his"）
4. 代价：加载（建图）慢、内存占用大——适合词库稳定、加载不频繁的场景

## How It Works（运作方式）

1. 启动时把全部模式串插入 Trie，节点存字符，终结节点标记模式串结束
2. BFS 构建 Fail 指针
3. 匹配：从根出发按目标串字符转移，找不到则沿 Fail 回退；到达终结节点即命中

## Relationships（关系）

### Distinctions（区分）

- 与 **WM（Wu-Manber）**：WM 对模式串长度/前缀有要求，适合特征统一的大规模词库；政策驱动的敏感词库无统一特征时 AC 更合适（vivo 谛听的选型结论）
- 与单模式匹配（KMP 等）：AC 的 Fail 指针可看作 KMP next 数组在多模式 Trie 上的推广

## Evolution（演进）

vivo 谛听的两个业务化改造（单一信源）：

- **组合敏感词**：不动匹配内核——组合拆成单词入 Trie，维护词→组合映射，AC 跑完后置聚合，组合内词全命中才算组合命中
- **拼音敏感词**：动内核——Trie 节点 char→String 按音节匹配；多音字不做消歧，全部读音展开成二维"拼音图"；AC 由顺序遍历改为图上 DFS，DFS 栈同步保存图节点与 Trie 状态位（回溯同步回退）；终止条件为「图节点全部遍历 且 AC 匹配失败」；剪枝条件「下一节点已遍历 且 分支路径长度 B > Trie 节点深度 D」

## Open Questions（开放问题）

- 拼音图方案的内存与最坏耗时上界，信源未量化
- "非"逻辑与模糊命中为谛听规划方向，尚未落地

## Evidence（证据）

- Source: `raw/sources/architecture/2026-10-23-vivo-diting-sensitive-word-matching.md`（原理、选型对比、两项业务改造，vivo 一手实践：词库 100 万+、平均匹配 50ms）

## Related Knowledge（相关知识）

- [[vivo-diting-sensitive-word-matching|vivo谛听敏感词匹配系统技术实践]]
