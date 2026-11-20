---
id: wiki-entity-tufazip
type: entity
title: tufazip
status: active
created: 2026-11-20
updated: 2026-11-20
confidence: high
tags:
  - entity
  - compression
  - transformer
  - open-source
sources:
  - raw/sources/ai/2026-11-20-tufazip-transformer-compression.md
related:
  - wiki/concepts/neural-lossless-compression.md
  - wiki/concepts/next-token-prediction.md
  - wiki/sources/2026-11-20-weibo-tufazip-transformer-compression.md
---
# tufazip

## Overview（概览）

tufazip 是一个以 **Transformer 作为唯一预测模型**的无损压缩工具，由 AI 研究者（Tufa Labs 支持）开发。项目在 Matt Mahoney 的 Large Text Compression Benchmark（LTCB，已运行 20+ 年）上以 10 亿字节 Wikipedia（enwik9）压缩至 105.39 MB 的成绩位列第 2（2026-09-07 提交时），是所有以神经网络为唯一预测模型的条目中的最佳者。其核心工程贡献是**免权重传输的在线学习**与可自付成本的**离线迁移（C2）方案**。

## Identity（身份信息）

- Type（类型）: 开源项目 / 无损压缩工具
- Organization（所属组织）: Tufa Labs（提供算力与容量）；作者为 AI 研究者，受 Jerome Sieber 指导
- Role（角色）: 神经网络唯一预测模型的无损压缩实现；「预测即压缩」路线的实例
- Status（状态）: 活跃；LTCB 第 2（提交时点 2026-09-07，名次随榜单变化）

## Important Facts（重要事实）

- **成绩**：enwik9（10 亿字节 Wikipedia）压缩至 **105,388,353 字节（105.39 MB）**，含离线训练权重与解码器；LTCB 第 2，神经网络唯一预测模型条目中最佳。
- **模型架构**：12 层、163M 参数 decoder-only Transformer（自注意力子层 + 前馈 MLP 子层），RoPE 位置编码、SwiGLU MLP、注意力与 MLP 前后 RMSNorm、Q/K 归一化；输出各下一 token 的概率。
- **在线学习（免权重传输）**：编码器与解码器从相同随机初始权重出发，循环执行「预测 → 编码/解码 → 学习」三步；权重更新与概率预测完全确定性，解码器随文本重建同步重建在线训练，权重无需传输。
- **在线基线配置**：4K 词表、192 token 上下文、35M token replay 窗口、0.25 replay dropout；payload 105.92 MB，含解码器 105.98 MB（0.848 bits/byte）。
- **离线迁移 C2（最终方案）**：先离线训练 34M 参数模型并量化至 4.33 MB；2 个共享 Transformer 块重复 12 层，拷贝后在线继续学习；payload 100.958 MB、解码器+权重 4.430 MB、总计 105.388 MB，净省 0.59 MB（0.56%）。
- **对照 L6**：六层先验 payload 更小（99.173 MB），但权重 10.945 MB，总计 110.118 MB，超出在线基线——预测质量更高不等于总体积更小。
- **离线迁移候选谱系**：全精度模型、稠密低比特量化、LoRA/QLoRA、紧凑共享块布局（Loop1、Cycle2/C3、Middle1/2、L3/L6/L9/L12）；enwik8 上全部未越过基线，enwik9 上 C2 越线。
- **消融结论**：replay 越大越好（15M→35M 省 1.30 MB/1.21%，FLOPs +40%）；词表越小越好（4K 最佳，专用 XML/wiki token 变差）；参数存在最优尺寸。
- **仓库**：github.com/Tufalabs/tufazip（信源正文给出）。

## Products / Projects（产品／项目）

- [[neural-lossless-compression]]（tufazip 是该概念的实例与最佳成绩载体）

## Relationships（关系）

- [[neural-lossless-compression]]：tufazip 实现的核心概念（Transformer 唯一预测 + 算术编码 + 在线学习）。
- [[next-token-prediction]]：tufazip 的预测目标即 next-token 预测，且「交叉熵之和 = 理想压缩比特数」是该项目的立论基础。
- 信源页：[[2026-11-20-weibo-tufazip-transformer-compression]]。
- 前作与对照（信源提及，本库暂无独立页面）：NNCP v2/v3.2（Bellard）、cmix（Byron Knoll）、PAQ 系、PPM。

## Timeline（时间线）

- 2026-09-07 — tufazip 提交 LTCB 并位列第 2（提交时点快照，作者自述）。
- 2026-11-20 — 经微博帖子采集，作者长文归档并摄入本库。

## Current Understanding（当前认知）

tufazip 证明了「一个简单 Transformer 作为唯一预测模型」在无损压缩上的上限：以在线学习免除权重传输、以共享块先验换取 0.56% 的净收益，并以 105.39 MB 的成绩成为纯神经网络预测路线的最佳条目。所有性能数字来自作者一手长文（单一信源、自报、未经独立复现）；LTCB 名次为时点快照，不构成持久事实。其价值更在方法：确定性在线学习、转移模型的成本记账、以及「压缩作为结构捕捉度量」的立论。

## Evidence（证据）

- `raw/sources/ai/2026-11-20-tufazip-transformer-compression.md`（作者技术长文全文，经微博帖子采集，2026-11-20）
