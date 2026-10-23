---
id: 2026-10-14-unyra-local-first-ai-learning-app
title: 归一 Unyra：本地优先的探索式学习 AI 桌面应用（Electron + React）
source: GitHub（maplexrain/unyra README）
source_url: https://github.com/maplexrain/unyra
source_type: article
platform: GitHub
created: 2026-10-14
category: 技术
tags: [AI, 工具, github]
wiki_status: ingested
---

# 归一 Unyra：本地优先的探索式学习 AI 桌面应用（Electron + React）

> 个人开源项目（v0.6.1，仅 Windows 安装包）：把学习从线性聊天做成一张知识 DAG——从一个想弄懂的目标出发逐层拆成节点，每个节点带一份教学文档和多份笔记，由"超级导师"模型通过 JS 沙箱 api 直接改写文档来教学。数据全部本机存储（`%APPDATA%\unyra`，干净 Markdown 可脱离应用读写），AI 请求主进程直发用户自配服务商（默认 DeepSeek，兼容 OpenAI/Anthropic/Responses 协议，内置 Kimi/GLM/通义/豆包/SiliconFlow 等）。

## 核心要点

- **探索式知识图**：目标→节点 DAG，选词可"学习/了解/注解/询问"（数字键触发），概念不重复创建、可被多节点引用
- **超级导师**：一个目标共用一段上下文（切节点不作废前缀缓存）；导师先思考再写 JS 交沙箱执行，讲解直接落进文档；三种人格用隐藏指令切换不重发历史；70% 上下文自动压缩为交接摘要
- **文档工作区**：一节点一文档+任意多份笔记文件，跨文档跳转带行号锚点，页签可分割排序，暂存区+Ctrl+S 落盘，可导出 Markdown/HTML/PDF
- **考试与状态追踪**：独立考试窗口（客观题本地判、主观题 AI 判）、主动回忆、自评/掌握度/错误记忆时间线；有效阅读时长卡"前台+主位+未静坐+看教学文档"，打卡题只能出自当天真读过的节
- **可执行文档**：```plot 画函数图、TextMate 40 语言高亮、代码块经导师"编译"成 JS 在一次性沙箱运行；围栏语法走插件接口可扩展
- **技术栈**：Electron 44 / React 19 / TypeScript / Vite / Tailwind 4 / KaTeX，electron-updater 走 GitHub Releases；语音输入 SenseVoiceSmall 本地识别不出本机

## 正文

项目由作者一人维护（代码、文档、安装包、答疑），README 末尾附外包/兼职/技术咨询合作意向与联系方式。完整设计文档在仓库 `docs/` 目录（学习模型、沙箱 api、桌面架构、AI 提供商、数据隐私等 16 篇）。入口：发布页下载安装包或免安装 zip，填 API Key 后新建学习目标即可用；macOS/Linux 需自行从源码构建。

## 来源

- GitHub 仓库：https://github.com/maplexrain/unyra
- 原始分享为知乎跳转链接（link.zhihu.com，含飞书 utm 参数），实际指向上述仓库，已按规范化 URL 归档

## 附件

无
