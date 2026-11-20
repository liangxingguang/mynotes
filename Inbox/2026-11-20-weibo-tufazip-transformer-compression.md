---
id: inbox-20261120-weibo-tufazip-transformer-compression
title: 微博：tufazip——用 Transformer 实现的无损压缩算法
source: 微博
source_url: http://t.cn/AXTtWFnP
source_type: link
platform: 微博
created: 2026-11-20
category: 技术
tags: [AI, GitHub]
asset_ref: Assets/2026-11/tufazip-transformer-compression.md
wiki_status: ingesting
ingest_claimed_at: "2026-11-20T04:20:41.800Z"
ingest_claim_id: 4388-1795148441800-0
---

# 微博：tufazip——用 Transformer 实现的无损压缩算法

> 博主分享的 tufazip：以 Transformer 作为唯一预测模型的无损压缩工具，在运行 20 余年的 Large Text Compression Benchmark 上排名第 2（2026-09-07 提交时），是纯神经网络预测模型中的最佳条目。它将 1GB Wikipedia 文本（enwik9）压缩到 105.39 MB，且该成绩尚未到最高——榜首是一个叫 ex-girlfriend 2.0 的条目。文章详解了"预测即压缩"的原理、免权重传输的在线学习机制与消融实验。

## 核心要点

- **成绩**：10 亿字节 enwik9 压缩至 105,388,353 字节（105.39 MB），含离线训练权重与解码器；LTCB 榜单第 2，是"神经网络作为唯一预测模型"的最佳条目。
- **架构**：12 层、163M 参数的 decoder-only Transformer（RoPE、SwiGLU、RMSNorm），4K 词表、192 token 上下文、35M token replay 窗口。
- **核心机制（免传输权重）**：编码器与解码器从相同初始权重出发，按"预测 → 编码/解码 → 学习"循环执行同一套确定性学习过程，在线学到的权重无需传输即可在解码端复现。
- **离线迁移（C2 方案）**：先离线训练 34M 参数模型并量化为 4.33 MB，用 2 个共享 Transformer 块重复 12 层，拷贝后在线继续学习；payload 省 4.97 MB、解码器成本 +4.38 MB，净提升 0.59 MB（0.56%）。
- **消融结论**：replay 窗口越大越好（15M→35M 省 1.3 MB）；词表越小越好（4K 最佳，专用 XML/wiki token 反而变差）；参数并非越多越好，存在最优模型尺寸。
- **理论背景**：对固定分词，next-token 预测与压缩目标等价——交叉熵之和恰为理想压缩比特数，算术编码把预测概率变成压缩流；这也是 Hutter Prize 与"压缩即智能"视角的依据。

## 正文

微博原文：

> 使用 Transformer 实现的无损压缩算法：tufazip。压缩和智能等效的一个例子。用它可以将 1 GB 的 Wikipedia 文本无损压缩到 105.39 MB（但还不是压缩率最高的，最高的是一个叫 ex-girlfriend 2.0 的。）

所附长文《tufazip: Learning to Compress a Billion Bytes of Wikipedia》要点：

- 项目在 Matt Mahoney 的 Large Text Compression Benchmark（LTCB，已运行 20+ 年）提交时位列第 2，是所有以神经网络为唯一预测模型的条目中表现最佳者。
- 预测模型为 12 层 163M 参数 decoder-only Transformer，由离线训练的 34M 参数模型（量化后 4.33 MB）初始化：2 个离线训练层拷贝到 12 个独立层后继续随压缩过程在线学习，解码器重复同样学习过程，完整模型的权重无需传输。
- 在线流程三步骤：编码器与解码器各自基于已知文本产出相同的 next-token 概率；编码器用算术编码写入实际 token、解码器从压缩流恢复；双方获知 token 后执行同一训练更新。权重更新与概率预测必须完全确定性，才能保证无损。
- 离线迁移探索了全精度模型、稠密低比特量化、LoRA/QLoRA、多种紧凑共享块布局（Loop1、Cycle2/C3、Middle1/2、L3/L6/L9/L12）；最终选定 Cycle2（C2）：两共享块重复 12 层，总体积 105.388 MB，比纯在线基线 105.979 MB 净省 0.59 MB。
- 作者讨论了"压缩即智能"的度量价值与 Goodhart 风险：把单文件压缩分数当作智能代理指标时，自动研究循环可能只刷分而不产生可复用的洞见。

## 来源

- 微博原文（含长文链接）：http://t.cn/AXTtWFnP
- 项目仓库：https://github.com/Tufalabs/tufazip
- 榜单：https://www.mattmahoney.net/dc/text.html

## 附件

[[Assets/2026-11/tufazip-transformer-compression.md]]
