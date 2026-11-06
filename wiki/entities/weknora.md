---
id: wiki-entity-weknora
type: entity
title: WeKnora
status: active
created: 2026-11-06
updated: 2026-11-06
confidence: medium
tags:
  - entity
  - AI
  - 知识库
sources:
  - raw/sources/ai/2026-11-06-weknora-dept-knowledge-base.md
related:
  - wiki/concepts/llm-wiki.md
  - wiki/concepts/knowledge-base-maintenance.md
  - wiki/sources/weknora-dept-knowledge-base.md
---

# WeKnora

## Overview（概览）

腾讯开源的企业级知识库系统。官方定位三种能力共用一个知识库：RAG 查资料、Agent 处理多步任务、Wiki 整理知识。技术来自微信对话平台沉淀，GitHub 3w+ star（信源转述，未独立核实）。在硬件研发部门场景中被 fork 二开，作为部门知识底座 HUB 使用；短板为只有检索链路、无在线编辑维护入口。

## Identity（身份信息）

- Type（类型）: 开源软件项目（企业级知识库系统）
- Organization（所属组织）: 腾讯（开源）；技术源自微信对话平台
- Role（角色）: 部门知识底座 HUB（资料/检索/权限统一管理），可 fork 二次开发
- Status（状态）: 活跃使用中（信源作者部门自部署）；上游发布节奏未知

## Important Facts（重要事实）

- GitHub star：3w+（信源转述，未独立核实）。
- 文档解析：PDF、Word、图片等常见格式，扫描件、图文混排支持。
- 混合检索：关键词 + 向量 + 知识图谱，回答带引用溯源。
- 部署：Docker 私有化（对原理图/测试报告不能上公有云的硬件部门是决定性卖点）；对外提供 API。
- 维护模式：知识更新=删除+重新上传，系统从头再处理；**无在线编辑入口**（信源核心痛点）。
- 作者部门用法：fork 源码二开，加"知识共建页"让同事先能存知识；规划 4 个子应用（SchematicForge 原理图评审、音频 MIC 分析、图像 IQ 对比、测试报告评审）互供经验。
- 作者理想形态：WeKnora + 腾讯在线文档拼接（检索+编辑）。

## Products / Projects（产品／项目）

- [[weknora-dept-knowledge-base|信源：部门知识库实战实录（hardvis）]]
- 子应用（作者部门自研，非 WeKnora 上游组件）：SchematicForge（原理图评审）、音频 MIC 分析工具、图像分析工具、测试报告评审工具

## Relationships（关系）

- [[llm-wiki|LLM Wiki]]——信源将 LLM Wiki 归为"框架类"方案（只给骨架），WeKnora 是"开箱能用还能改"的产品化落点；两者同为知识编译模式的不同成熟度形态（解读）。
- 对比 Obsidian+AI（个人知识库）：WeKnora 面向多用户部门场景（权限/共享/沉淀）。
- [[knowledge-base-maintenance|知识库维护]]——WeKnora 的维护缺口是该概念页的核心案例。

## Timeline（时间线）

- 未知 — 开源发布时间：信源未给出（仅称"前阵子刷到"）。
- 2026-11-06 — 信源采集日：hardvis《部门知识库实战实录》发布/采集，记录部署跑通、HUB 规划与"维护那半"短板。

## Current Understanding（当前认知）

对 WeKnora 的认知目前仅来自一篇硬件部门一手实践叙事：检索链路（解析/切片/向量化/混合检索）成熟可用，私有化部署门槛低（Docker），但知识维护能力缺位（只能删+重传），适合作为"需要私有部署的部门知识底座"候选，不适合"内容需要高频在线编辑更新"的场景。上游功能清单引自官方说法，star 数等未独立核实；性能、精度指标无公开数据。

## Evidence（证据）

- `raw/sources/ai/2026-11-06-weknora-dept-knowledge-base.md`（唯一信源，微信公众号硬件AI工坊/hardvis，转述官方说法）
