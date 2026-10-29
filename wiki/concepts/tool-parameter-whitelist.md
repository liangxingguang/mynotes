---
id: wiki-concept-tool-parameter-whitelist
type: concept
title: 参数层白名单防线
status: active
created: 2026-10-30
updated: 2026-10-30
confidence: high
tags:
  - concept
  - ai-agent
  - security
sources:
  - raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md
related:
  - wiki/concepts/tool-schema-as-prompt.md
  - wiki/concepts/prompt-injection.md
---
# 参数层白名单防线

## Definition（定义）

把工具调用的安全校验前移到「参数生成之后、出网/执行之前」的参数层，且一律用白名单（只说「什么可以进」，其余一律拒绝）而非黑名单的防线设计。校验分两段：先 schema 查形状（缺必填/类型/枚举），后语义白名单查值可不可信。

## Why It Matters（为什么重要）

- 黑名单枚举不完坏写法（编码变体、Unicode 零宽字符、未见过的花样），每补一条都在和全世界攻击者赛跑且跑不赢；白名单一句规则说完整个合法世界（如 user_id 合法形态 = `^u-\d{4,6}$`），补集再大也无关。
- [[prompt-injection|提示词注入]]在第①环（模型读到坏内容）已完成，确认闸门在第③环管不了参数本身；参数层是「哪怕模型想错了，坏参数也死在出网前」的最后可工程化拦截点。
- schema 校验只查形状管不了值：`{"user_id": "../../u-1001"}` 形状合法但值不可信（实测：恶意参数被拦时不发 HTTP、不触发闸门、不写审计）。

## Core Characteristics（核心特征）

1. **校验强度跟着参数的熵走**：只有「合法形态能一句话说清」的低熵参数（标识符、枚举）才上格式/取值白名单；自由文本参数不硬做格式校验，防误杀。
2. **白名单事实来源是服务端**：取值集合（如角色编码）以服务端声明为准、登录成功即刷新，客户端不写死。
3. **拒绝即自纠教材**：拒绝信息写清「什么是对的、去哪拿」，原样回喂模型下一轮自纠；被拒绝的调用不是死胡同。
4. **校验失败返回错误结果而非抛异常**：「被喂了不该喂的输入」是正常业务结果，回喂模型；审计记 `error:rejected`，与运行时异常兜底（`error:raw` 类）语义分开——能预先判定的走校验层，跑起来才知道的走异常兜底。
5. **挂在必经之路**：两段式校验进 validate_args，签名不变，agent 主循环一行不改。
6. **附带收益**：标识符格式锁死顺带把路径穿越载荷（`../../etc/passwd`）挡在参数层。

## Structure（结构）

代码执行类工具的三道闸（eval_expr 微缩样本）：

1. **字符白名单**（如 `^[0-9+\-*/().%\s]+$`）：字母/引号/下划线进不来，`__import__('os')` 第一关就死；
2. **语法树白名单**（ast.parse 逐节点检查，只放行数字常量与四则运算节点）：拦「合法字符组成的坏东西」如 `2**999999` 资源炸弹；全程不用 eval()，手写递归求值器只认白名单节点；
3. **长度上限**（如 200 字符）：限制本身就是输入校验的一部分。

真实产品中代码执行需求应进沙箱（容器/微虚拟机，如 E2B），沙箱是代码执行工具上线的底线——三道闸是把防护思路讲清楚的教学微缩。

## How It Works（运作方式）

```
模型产出 tool_call → execute_tool → validate_args 两段式：
  ① schema 校验（形状：缺必填/类型/枚举外）→ 不过则回喂
  ② EXTRA_VALIDATORS[工具名]（语义值：格式白名单 + 取值白名单）→ 不过则回喂
→ 全过才执行函数 → 结果/错误 dict 回喂；校验层拦截不发 HTTP、不触发闸门、不写审计
```

## Relationships（关系）

### Related Concepts（相关概念）

- [[tool-schema-as-prompt|Tool Schema as Prompt]]：schema 是软约束须执行前校验——本概念把它从形状层推进到语义值层；描述里写明参数约束还能让模型生成时就收敛，减少被拒次数。
- [[prompt-injection|提示词注入]]：本防线是其工程应对（第②环拦截）。

### Dependencies（依赖项）

- 错误回喂机制（见 [[agent-loop|Agent Loop]]）：拒绝信息作为 tool 结果回喂是模型自纠的前提。

### Distinctions（区分）

- 与**确认闸门**：闸门管「做不做」（第③环），白名单管「参数可不可信」（第②环）；畸形参数到不了闸门。
- 与**黑名单**：白名单说合法世界、黑名单追非法世界，后者枚举不完。
- 与 [[agent-sandboxing|沙箱]]：白名单拦在执行前，沙箱压缩执行后的影响范围；代码执行类两者都要。

## Evolution（演进）

- 2026-10-30 — 由信源 `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md` 建立（selfcheck_p10.py 29 项断言实测全过）。

## Open Questions（开放问题）

- 自由文本/富结构参数（SQL 片段、URL、代码块）的白名单化边界：当前信源明确这类参数不硬做格式校验，更细的防线未展开。
- 多工具组合风险（单参数各自合法、组合起来有害）：未覆盖。

## Evidence（证据）

- Source: `raw/sources/ai/2026-10-28-agent-tool-security-whitelist.md`

## Related Knowledge（相关知识）

- [[agent-tool-security-whitelist|Agent - 工具全谱系与安全边界（10）（信源页）]]
