---
id: 2026-10-23-vivo-diting-sensitive-word-matching
title: vivo谛听敏感词匹配系统技术实践：AC自动机 + 组合/拼音敏感词
source: SegmentFault（vivo互联网服务器团队）
source_url: https://segmentfault.com/a/1190000048315142
source_type: 文章
platform: SegmentFault
created: 2026-10-23
category: 技术
tags:
  - 工程实践
  - 分布式系统
asset_ref: Assets/2026/10/vivo-diting-sensitive-word-matching.md
wiki_status: pending
---

# vivo谛听敏感词匹配系统技术实践：AC自动机 + 组合/拼音敏感词

> vivo 内容审核平台"谛听"的敏感词匹配方案：词库百万级、平均匹配耗时 50ms。底层选型 AC 自动机（Trie+Fail 指针，近似线性复杂度）而非 WM——因敏感词长度/前缀无规律且加载不频繁、内存充足。两个业务增强：组合敏感词（拆成单词入 Trie，后置按映射聚合，全部命中才算组合命中）；拼音敏感词（对抗"啋票"类谐音规避——Trie 节点改存音节、多音字全读音展开成"拼音图"，AC 自动机改在图上 DFS 匹配，DFS 栈同步保存 Trie 状态位）。终止条件与剪枝是关键难点。

## 核心要点

- **选型**：AC 自动机 vs WM——WM 对模式串长度/前缀有要求，不适合政策驱动、无统一特征的敏感词库；AC 加载慢、占内存大但可接受
- **组合敏感词**：单词独现不违规、组合出现才违规 → 拆词入 Trie + 维护词→组合映射，AC 跑完后置聚合，组合内词全命中才算命中
- **拼音敏感词**：运营直接配拼音（如 CAI PIAO）命中所有同音变体；Trie 节点 char→String 按音节匹配；不依赖多音字消歧，把全部读音展开成二维"拼音图"逐路径匹配，宁可多算不漏杀
- **图上 DFS 匹配**：拼音图非一维数组 → AC 自动机顺序遍历改为 DFS，栈中同时保存图节点 + Trie 状态位（回溯时同步回退）
- **终止条件**：「拼音图所有节点均被遍历 且 AC 自动机匹配失败」——只满足前者会在分支回溯时漏掉尚未匹配完的模式串
- **剪枝**：多音字使路径数笛卡尔积膨胀；记录图节点分支路径长度 B 与 Trie 节点深度 D，当「下一节点已遍历 且 B > D」时跳过（模式串比当前分支路径短，与之无关）
- **规模与演进**：线上敏感词超 100 万条，覆盖普通/组合/拼音/拼音组合四类；未来做"非"逻辑排除 bad case 与模糊命中

## 正文

详见附件抓取正文（全文已收录，含 AC 自动机原理、匹配流程与剪枝推导）。

## 来源

- [IM全文检索技术(五)：vivo敏感词匹配系统的技术实践 - SegmentFault](https://segmentfault.com/a/1190000048315142)

## 附件

- [[Assets/2026/10/vivo-diting-sensitive-word-matching.md]]
