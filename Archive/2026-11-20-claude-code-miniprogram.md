---
id: inbox-2026-11-20-claude-code-miniprogram
title: 零代码，我用 Claude Code 做小程序（保姆级教学）
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/_9oQXXE13ppUVhdMyqfzDQ
source_type: web
platform: 微信
created: 2026-11-20
category: 技术
tags: [AI]
asset_ref: Assets/2026-11/wechat-_9oQXXE13ppUVhdMyqfzDQ.md
wiki_status: ingested
---

> **摘要**：保姆级实操教程：用 Claude Code 从零做一个微信小程序"保质期管家"（记录物品名称与到期日期，列表按到期排序、标注已过期/今天到期/剩余天数）。全流程：环境准备（安装 Claude Code、注册小程序拿 AppID、装微信开发者工具）→ 开发者工具创建 TS+Sass 基础模板 → 同一项目目录启动 Claude Code → 计划模式先出方案确认再开发 → 编译预览、真机调试、上传、提交审核、发布。核心方法论：先确认 AI 对需求的理解再动手，减少理解偏差返工。

## 核心要点

- **背景**：AI 编程一个功能来回改几轮仍不达预期，除模型能力外工具选择也重要；微信小程序成长计划让个人开发者也能获得云资源和流量支持，日常需求做成小程序已更易上手。
- **工具分工**：微信开发者工具负责创建基础项目、运行与手机预览；Claude Code 负责在项目里生成和修改代码。两者使用电脑里的同一个项目文件夹——Claude Code 改代码，开发者工具重编译看效果。
- **环境准备三步**：①安装 Claude Code（Mac `curl -fsSL https://claude.ai/install.sh | bash`，Windows `irm https://claude.ai/install.ps1 | iex`，`claude --version` 验证）；②微信公众平台注册小程序、获取 AppID（创建项目时必填）；③下载安装微信开发者工具并扫码登录（需为管理员或已添加为开发者的微信）。
- **项目创建**：项目名"保质期管家"、目录 expiry-manager，AppID 填后台复制的那串；本次数据存本地，不使用云服务；开发模式选小程序，初始化选 TS + Sass 基础模板；先跑默认项目确认能运行（Hello World）再交给 Claude Code。
- **启动 Claude Code**：在 expiry-manager 目录启动 `claude`，首次登录选订阅账号（Pro 或 Max）；出现文件夹信任确认时核对目录后选 "Yes, I trust this folder"。
- **计划模式是关键**：AI 编程返工多因没确认它对需求的理解就开写——用计划模式（Shift + Tab 切换至 plan mode on）先分析项目、出开发方案，方案定稿前逐项确认细节（如添加物品用独立添加页、模板演示代码清理掉），确认方案符合预期后再批准，退出计划模式以自动模式开发。
- **需求描述要点**：需求要写清功能边界（只做添加物品、到期提示、本地保存，不做登录/云开发/通知）、排序规则（按到期日期从早到晚）、状态判断（早于今天标红显示已过期天数；今天到期；剩 1-7 天标橙；超 7 天正常；颜色之外必须有文字说明）、本地存储（微信本地存储，重开保留，重进首页刷新剩余天数）、交互细节（空记录提示、日期可选过去日期）。
- **收尾流程**：微信开发者工具编译预览 → 真机调试扫码在手机上检查（电脑正常手机可能有问题，必不可少）→ 上传代码（填版本号与备注）→ 后台版本管理核对 → 设体验版加体验成员试用 → 完善名称/头像/简介/服务类目并完成备案 → 提交审核（未通过按原因修改后重新上传再审）→ 审核通过后点击发布，显示线上版本即正式上线。

## 正文

完整正文见 [[Assets/2026-11/wechat-_9oQXXE13ppUVhdMyqfzDQ.md]]。教程含需求描述完整模板（可直接照抄使用）与各步骤界面截图说明；上线后发现不顺手的地方，也可把问题和想调整的效果告诉 Claude Code 继续完善。

## 来源

- [零代码，我用 Claude Code 做小程序（保姆级教学）](https://mp.weixin.qq.com/s/_9oQXXE13ppUVhdMyqfzDQ)

## 附件

- [[Assets/2026-11/wechat-_9oQXXE13ppUVhdMyqfzDQ.md]]
