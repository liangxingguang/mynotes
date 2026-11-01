---
id: wiki-source-xitongsiwei-03-8-difang-nengli
type: source
title: 架构师必须具备的 8 个底层能力
status: active
created: 2026-11-01
updated: 2026-11-01
confidence: high
tags:
  - source
  - architecture
  - methodology
  - systems-engineering
sources:
  - raw/sources/architecture/2026-10-31-xitongsiwei-03-8-difang-nengli.md
related:
  - wiki/concepts/architecture-design-capabilities.md
  - wiki/sources/system-thinking-album.md
---
# 架构师必须具备的 8 个底层能力

## Overview（概览）

公众号「Leo聊系统思维」《系统思维》专辑第 3 篇（pos_num 3，约 5000 字）。先区分「架构」（系统本身的基本概念与属性）与「架构描述 AD」（纸面上的视图/模型/文档/框图/矩阵，ISO/IEC/IEEE 42010：架构描述不是架构，就像地图不是疆域）。然后把架构能力拆成八个层层递进的底层动作——抽象、聚焦、分解、边界、契约、权衡、适配约束、可演化：前四个把系统看清楚、拆得开，后四个让它合得拢、活得久。

## Key Facts（关键事实）

- 架构 vs 架构描述：架构是系统本身那套基本概念与属性（由哪些元素组成、元素间什么关系、按什么原则设计与演化）；AD 是人为制品，用途只有表达、记录、沟通三件事。ISO/IEC/IEEE 42010:2011 明确「架构描述不是架构，就像地图不是疆域」，且架构可以只存在于人的脑子里、从未被写下，写下来的才叫描述。
- ① 抽象：不是「把东西画简单一点」，而是先回答「我要描述什么」，再把能决定这件事的属性抽出来，结果叫模型。判断标准是两句话：抽出来的属性够不够描述要解决的问题；没抽的那些会不会反过来影响结论。两种病——抽得不够（漏掉「电池温度过高」）和根本没抽（把传感器原始波形搬上屏幕）。
- ② 聚焦：急诊分诊比喻。核心动作是「明确这一版不做什么」；聚焦不是砍需求而是排序——先保证哪三条是红线，其余降级为「有余力再说」。「二十个指标，等于没有指标。」聚焦管「做不做」，不管「怎么分」。
- ③ 分解：Parnas 1972《On the Criteria To Be Used in Decomposing Systems into Modules》反直觉答案——不要按流程步骤拆，要按「哪些设计决策可能会变」来拆；这是信息隐藏的原始出处，后演变为封装、接口、微服务。判据：能不能独立交付、独立验证。抽象向上拔高、分解向下落地，须成对出现。
- ④ 边界：聚焦决定「哪些事要做」（取舍），边界决定「要做的事怎么分」（归属），不能互相替代。四条线：模块边界（按变化频率切，非按组织结构切）、职责边界（一个能力只有一个主人）、数据边界（归属方唯一）、系统边界（跨线按契约说话）。边界不清症状：改一处崩一片、出问题都说不归自己、做新功能先跟五个模块打招呼。
- ⑤ 契约：把「你怎么实现」和「你能给我什么」彻底分开，通常写四样：接口、协议、时序、数据格式。最常见翻车是隐式契约（文档没写但所有人默认）。「无契约，不架构」——敢换掉一个模块靠的是「我承诺的东西没变」。
- ⑥ 权衡：SUV 造不出跑车（非技术不行、是物理不允许）。真正的权衡不是取中间，而是明确排序并承担后果。「这一版先保上线，牺牲一部分扩展性」是合格权衡；「我尽量都兼顾一下」不是权衡。权衡结论最好写下来，是给半年后的自己看。
- ⑦ 适配约束 + ⑧ 可演化：约束清单至少含时间、成本、团队能力、既有技术栈、合规要求、使用场景；「最优架构」不存在，只有「在这组约束下的最优解」。好架构像乐高一样长出来；可演化不是独立技巧，是前面所有动作的复利。判据：接一个新需求要动几个地方——动一处好、动五处可接受、动十处说明各模块已长在一起。
- 数据来源：ISO/IEC/IEEE 42010:2011、Parnas(1972)、Brooks《The Mythical Man-Month》(1975)、Conway《How Do Committees Invent?》(1968)、Ousterhout《A Philosophy of Software Design》(2018)。

## Important Claims（重要论断）

- 「架构在系统里，描述在纸面上。图不是架构，图是对架构的一次拍照。」
- 「懂得放弃，才是架构能力的开始。」
- 「无契约，不架构。」
- 收尾：「架构不是画出来的，是想清楚的。图只是结果，判断才是本事。」八个动作是一条链：抽象和聚焦把系统看清楚；分解和边界把它拆得开；契约、权衡、适配约束让它合得拢；可演化让它活得久。

## Concepts Introduced（引入的概念）

- [[architecture-design-capabilities|架构设计能力（8 个底层动作）]]
- [[architecture-description-metamodel|架构描述 ≠ 架构（ISO 42010 概念关系）]]

## Entities Mentioned（提及的实体）

- ISO/IEC/IEEE 42010:2011（架构与架构描述区分）
- Parnas, D. L.（1972，信息隐藏与模块划分）
- Brooks, F. P.（1975，《The Mythical Man-Month》）
- Conway, M. E.（1968，《How Do Committees Invent?》）
- Ousterhout, J.（2018，《A Philosophy of Software Design》）
- 以上均为被引用文献，单一信源转述，暂不立实体页

## Implications（影响／启示）

- 「把架构理解成画图」是常见误区：图是可见的、判断是不可见的，真正决定系统命运的是那些看不见的判断（解读）。
- 「二十个指标等于没有指标」直接警示非功能需求铺陈而不排序的实践（解读）。

## Limitations（局限）

- 单一自媒体原创信源，标准/文献引用为文章转述（非原文直读），精确措辞需查原文核验。
- 八个动作是作者提出的框架，非标准化分类；各动作间边界与优先级未量化。
- 文中配图为采集时的 1px SVG 占位符，未下载原图。

## Related Knowledge（相关知识）

- [[system-thinking-album|《系统思维》专辑目录]]（本篇为第 3 篇）
- [[architecture-design-capabilities]]（本文产出的概念页）
- [[architecture-tradeoff-methodology|架构取舍方法论]]（权衡部分的互证）

## Source（信源）

- `raw/sources/architecture/2026-10-31-xitongsiwei-03-8-difang-nengli.md`
