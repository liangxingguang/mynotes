# Agent - 手写最小 agent（7）（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2095565673804083692>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 18371 字符）

---

​

目录

## 介绍

第 7 篇：手写一个“看得懂每行代码”的最小 agent

> 读完能理解：五阶段骨架怎么接上真 LLM 和两个工具；工具描述如何变成模型的 prompt；参数校验和四类错误路径怎么接；`reasoning_content`为什么必须回传；JSON mode与 function calling的分工。最后在终端跑起 M1。

## 本篇要回答的问题

1.   从骨架到成品，`agent/` 项目怎么组织？
2.   工具描述在哪一行变成 prompt？参数校验拦在哪？
3.   幻觉调用、空参坏参、工具异常、死循环，代码怎么兜？
4.   模型怎么表达“我调完了”？为什么必须回传 `reasoning_content`？
5.   JSON mode 与 function calling 的异同，什么时候用哪个？
6.   M1 怎么自检？

## 1｜拼装清单与目录

第 7 篇没有新理论，主要把前几篇的零件装起来：

| 原料 | 来自 | 本篇落点 |
| --- | --- | --- |
| 五阶段 loop + 终止条件 | 第 3 篇 | agent.py 的 run_agent |
| 消息协议 + 工具调用格式 | 第 6 篇 | tools 参数、tool_calls、role:"tool" 回填 |
| 模型接入 + key 管理 | 第 4 篇 | config.py +deepseek-flash |
| 工具注册表 + schema | 第 3 篇 | tools.py |
| 最大迭代数熔断 | 第 3 篇 | config.MAX_ITERATIONS |

两个演示工具选 `get_time` 和 `calculate`：零依赖、结果可验证，覆盖无参工具和多参带 enum 工具两种形态。真实后台 API 留到第 8 篇。

目录：

```
agent/
├── requirements.txt   # openai==3.31.0（Python 3.11+）
├── .gitignore         # .venv/ .env __pycache__/
├── config.py          # base_url / model / key / 超时 / 熔断上限
├── tools.py           # 工具实现 + schema + 最小校验
├── agent.py           # 五阶段主循环
└── json_mode_demo.py  # JSON mode 演示
```

安装：

```
cd agent
#  python3.12 -m venv .venv && source .venv/bin/activate  这里我用的miniconda 
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
export DEEPSEEK_API_KEY=sk-xxxxxxxx
```

`requirements.txt`：

`config.py` 把配置收敛到一处。`TIMEOUT` 和 `MAX_RETRIES` 显式收窄 SDK 默认值；`MAX_ITERATIONS` 是唯一不依赖模型自觉的终止保险。

```
# config.py — 全项目唯一配置点
import os

BASE_URL = "https://api.deepseek.com"
MODEL = "deepseek-flash"
TIMEOUT = 60.0
MAX_RETRIES = 2
MAX_ITERATIONS = 10

def api_key() -> str:
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise SystemExit(
            "[配置错误] 未找到环境变量 DEEPSEEK_API_KEY。\n"
            "  1. 到 https://platform.deepseek.com 申请 API key；\n"
            "  2. export DEEPSEEK_API_KEY=sk-xxxxxxxx   # 不进 git"
        )
    return key
```

## 2｜tools.py：schema、实现与校验

schema 是给模型看的说明书，实现是真正执行的函数。两者必须放在同一个文件里成对维护：改了实现忘改描述，模型会按旧描述调用。

```
# tools.py
import datetime

# ---------- 实现 ----------

def get_time() -> dict:
    return {"now": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

def calculate(a: float, b: float, op: str) -> dict:
    """op 由 schema enum 约束为 + - * /。
    b=0 且 op='/' 时抛 ZeroDivisionError，用于演示工具异常兜底。"""
    if op == "+":
        return {"result": a + b}
    if op == "-":
        return {"result": a - b}
    if op == "*":
        return {"result": a * b}
    return {"result": a / b}

# ---------- 给模型看的 schema ----------

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_time",
            "description": (
                "获取当前本地时间（年-月-日 时:分:秒）。"
                "任何涉及当前时刻或日期的问题都必须先调它，不要凭记忆猜。"
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": (
                "四则运算器：对 a、b 做一次 op 运算并返回 result。"
                "算术类请求必须用本工具，不要心算；"
                "需要多步计算时，把上一步的结果作为下一步的输入继续调用。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "第一个操作数"},
                    "b": {"type": "number", "description": "第二个操作数"},
                    "op": {
                        "type": "string",
                        "enum": ["+", "-", "*", "/"],
                        "description": "运算符，四选一",
                    },
                },
                "required": ["a", "b", "op"],
            },
        },
    },
]

TOOL_REGISTRY = {"get_time": get_time, "calculate": calculate}
SCHEMA_BY_NAME = {s["function"]["name"]: s["function"] for s in TOOL_SCHEMAS}

# ---------- 最小 schema 校验 ----------

def validate_args(function_schema: dict, args: dict):
    """查缺必填、类型不对、枚举外取值、schema 外参数。"""
    params = function_schema["parameters"]
    props = params.get("properties", {})

    for name in params.get("required", []):
        if name not in args:
            return False, f"缺少必填参数 {name!r}"

    checks = {
        "string": lambda v: isinstance(v, str),
        "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
        "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
        "boolean": lambda v: isinstance(v, bool),
    }

    for name, value in args.items():
        spec = props.get(name)
        if spec is None:
            return False, f"传入了 schema 未定义的参数 {name!r}"
        t = spec.get("type")
        if t in checks and not checks[t](value):
            return False, f"参数 {name!r} 应为 {t}，实际为 {type(value).__name__}"
        if "enum" in spec and value not in spec["enum"]:
            return False, f"参数 {name!r} 必须是 {spec['enum']} 之一，实际为 {value!r}"

    return True, ""
```

### 工具描述如何变成 prompt

常见误解是“把函数传给了模型”。实际传给模型的只有 `tools` 参数里的 JSON Schema。`TOOL_SCHEMAS` 经 JSON 序列化后就是请求体字段，没有翻译层。

模型能看到的是每个工具的 `name`、`description`、`parameters`；看不到 Python 函数体。官方 Tool Calls 文档明确说，模型本身不执行函数，只产出调用意图，执行发生在宿主代码里。

因此写 `description` 就是在写 prompt。`get_time` 的描述里写“必须调它，不要凭记忆猜”，是在抑制模型编时间；`calculate` 的描述里写“不要心算”和“多步计算继续调用”，是在支撑链式调用。`op` 用 `enum` 收窄取值范围，但非 strict 模式下 schema 只是软约束，执行前仍要校验。

如果工具设计成单参的 `calc(expression)`，不要用 `eval`。模型生成的表达式不受控制，`eval` 等于交出命令执行权。教学版可以用 `ast` 白名单，只放行数字、四则运算和括号：

```
import ast
import operator as op

_OPS = {
    ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul,
    ast.Div: op.truediv, ast.Mod: op.mod, ast.Pow: op.pow,
    ast.USub: op.neg,
}

def _eval_node(node):
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_node(node.operand))
    raise ValueError(f"不支持的表达式片段: {ast.dump(node)}")

def calc(expression):
    return _eval_node(ast.parse(expression, mode="eval"))
```

本篇主实现仍用 `calculate(a,b,op)`，因为它能同时演示多参、enum 和参数校验。`ast` 白名单留作表达式类工具的替代写法。

## 3｜agent.py：五阶段与错误兜底

```
# agent.py — 手写最小 agent（DeepSeek + openai SDK，里程碑 M1）
import argparse
import json

from openai import OpenAI

import config
import tools as toolset

SYSTEM_PROMPT = (
    "你是一个跑在终端里的最小 agent。规则：\n"
    "1. 事实性问题（当前时间、计算结果）必须调用工具获取，禁止凭记忆编造；\n"
    "2. 回答中引用的数值必须原样来自工具结果，不要自己改写或补全；\n"
    "3. 工具返回错误信息时，读懂错误、调整调用方式重试，不要原样重复同样的调用。"
)

PRESET_QUESTIONS = [
    "现在几点了？",
    "37 乘以 45 等于多少？",
    "先看看现在几点，再把当前的小时数乘以 7。",
    "用 calculate 算一下 1 除以 0，把工具返回的内容告诉我。",
]

def create_client() -> OpenAI:
    return OpenAI(
        api_key=config.api_key(),
        base_url=config.BASE_URL,
        timeout=config.TIMEOUT,
        max_retries=config.MAX_RETRIES,
    )

def call_llm(client: OpenAI, messages: list, think: bool = False):
    kwargs = dict(
        model=config.MODEL,
        messages=messages,
        tools=toolset.TOOL_SCHEMAS,
    )
    if think:
        kwargs["reasoning_effort"] = "high"
        kwargs["extra_body"] = {"thinking": {"type": "enabled"}}
    else:
        kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
    return client.chat.completions.create(**kwargs)

def to_assistant_dict(msg) -> dict:
    """回填 assistant 消息。带 tools 的请求必须完整回传 reasoning_content。"""
    out = {"role": "assistant", "content": msg.content}
    reasoning = getattr(msg, "reasoning_content", None)
    if reasoning:
        out["reasoning_content"] = reasoning
    if msg.tool_calls:
        out["tool_calls"] = [
            {
                "id": c.id,
                "type": "function",
                "function": {
                    "name": c.function.name,
                    "arguments": c.function.arguments,
                },
            }
            for c in msg.tool_calls
        ]
    return out

def execute_tool(call) -> str:
    """执行单个工具调用。所有失败都返回错误文本，不抛异常。"""
    name = call.function.name

    # 坑 1：幻觉调用
    if name not in toolset.TOOL_REGISTRY:
        return (
            f"错误：不存在名为 {name!r} 的工具。"
            f"可用工具：{sorted(toolset.TOOL_REGISTRY)}"
        )

    # 坑 2：坏 JSON / 空参
    try:
        args = json.loads(call.function.arguments) if call.function.arguments else {}
    except json.JSONDecodeError as e:
        return f"错误：arguments 不是合法 JSON（{e}）。请重新发起调用。"

    # 坑 3：schema 校验
    ok, err = toolset.validate_args(toolset.SCHEMA_BY_NAME[name], args)
    if not ok:
        want = json.dumps(
            toolset.SCHEMA_BY_NAME[name]["parameters"],
            ensure_ascii=False,
        )
        return f"错误：参数校验失败（{err}）。参数要求：{want}"

    # 坑 4：运行时异常
    try:
        result = toolset.TOOL_REGISTRY[name](**args)
    except Exception as e:
        return f"错误：工具 {name} 执行异常：{type(e).__name__}: {e}"

    return json.dumps(result, ensure_ascii=False)

def run_agent(client, user_input: str, think: bool = False) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_input},
    ]
    print(f"\n[用户] {user_input}")

    for i in range(1, config.MAX_ITERATIONS + 1):
        print(f"[loop] 第 {i} 轮 | 发送 {len(messages)} 条消息")
        resp = call_llm(client, messages, think=think)
        choice = resp.choices[0]
        msg, finish = choice.message, choice.finish_reason
        print(f"[loop] finish_reason={finish} | tool_calls={len(msg.tool_calls or [])} 个")
        if msg.content:
            print(f"[模型] {msg.content}")

        messages.append(to_assistant_dict(msg))

        # 终止条件一：没有 tool_calls 即模型宣告完成
        if not msg.tool_calls:
            if finish != "stop":
                print(f"[loop] 警告：finish_reason={finish}，回答可能不完整")
            print(f"[loop] 终止：共 {i} 轮")
            return msg.content

        for call in msg.tool_calls:
            print(f"[工具] {call.function.name}({call.function.arguments})")
            result = execute_tool(call)
            print(f"[工具→] {result}")
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

    # 终止条件二：最大迭代数熔断
    raise RuntimeError(f"[熔断] 达到最大迭代数 {config.MAX_ITERATIONS}，强制终止")

def run_safely(client, question: str, think: bool = False) -> str:
    try:
        return run_agent(client, question, think=think)
    except RuntimeError as e:
        return str(e)

def main():
    parser = argparse.ArgumentParser(description="手写最小 agent（第 7 篇，M1）")
    parser.add_argument("question", nargs="?", help="单次提问；不给则跑预置问题集")
    parser.add_argument("--chat", action="store_true", help="交互模式；每次输入都是全新会话")
    parser.add_argument("--think", action="store_true", help="开思考档")
    args = parser.parse_args()

    client = create_client()
    try:
        if args.chat:
            print("交互模式（输入 quit 退出）。每次输入都是全新会话。")
            while True:
                user_input = input("你> ").strip()
                if user_input.lower() in ("quit", "q", "exit"):
                    break
                if user_input:
                    print(f"[助手] {run_safely(client, user_input, think=args.think)}")
        elif args.question:
            print(f"[助手] {run_safely(client, args.question, think=args.think)}")
        else:
            for q in PRESET_QUESTIONS:
                print(f"[助手] {run_safely(client, q, think=args.think)}")
    except KeyboardInterrupt:
        print("\n[退出] 用户中断")

if __name__ == "__main__":
    main()
```

### 回填与 `reasoning_content`

`messages.append(to_assistant_dict(msg))` 是 loop 的记忆点。assistant 的调用意图和后续 `role:"tool"` 结果都进入历史，下一轮全量重发，模型才能看到上一轮发生了什么。

`to_assistant_dict` 显式构造 dict，有两个原因：一是能看清回填了哪些字段；二是 `reasoning_content` 不是 OpenAI 标准字段，旧版 SDK 可能没有类型声明，`getattr` 读取更安全。官方 thinking 模式示例直接 `messages.append(message)`，与显式构造 `role/content/reasoning_content/tool_calls` 等价。

关键规则：**带 `tools` 的请求，历史 assistant 消息里的 `reasoning_content` 必须完整回传，否则 API 返回 400。** 本篇默认非思考档，响应没有该字段，`if reasoning` 不成立，请求自然不带；开 `--think` 时该字段出现并回传。一套代码两档通用。

### 终止判定

终止判定读结构化信号：`if not msg.tool_calls`。模型在 `content` 里说“完成了”不算数，`tool_calls` 有无才是程序可判定的完成信号。`finish_reason` 做次级校验：不是 `stop` 时打警告，例如 `length` 可能表示回答被截断。

熔断在循环外：`for i in range(1, MAX_ITERATIONS + 1)` 跑满后 `raise RuntimeError`，`run_safely` 转成终端可见的 `[熔断]` 文本。官方示例常用 `while True`，工程代码不能省这个保险。

### 错误路径：回喂而不是崩掉

`execute_tool` 的四条出口里三条是错误，但都不抛异常，而是返回错误文本，由调用方作为 `role:"tool"` 消息回填。工具失败不会杀死整个任务，模型下一轮读到错误后可以换参数、换工具或向用户解释。系统提示词第 3 条要求模型读懂错误并调整调用，与这个兜底配对。

多个 `tool_calls` 要逐个执行、逐个配对回填。只处理 `tool_calls[0]` 会导致协议违约。教学版顺序执行即可；工具变成远程 HTTP 后再考虑并行。

## 4｜四坑与校验

`validate_args` 只查常见三类坏参数：缺必填、类型不对、枚举外取值，外加 schema 外参数。校验放在进函数之前，防止垃圾参数污染执行。注意 `bool` 是 `int` 子类，`number` / `integer` 检查要排除 `bool`。

生产上可以换 pydantic 做校验和 schema 生成，或用 DeepSeek strict 模式把约束推到服务端。strict 模式（Beta）需要把 `base_url` 换成 `https://api.deepseek.com/beta`，工具定义加 `"strict": true`，服务端会校验 JSON Schema 并强约束输出。代价是 schema 写法受限，例如 object 的所有 properties 必须全部 required、`additionalProperties: false`。strict 管“尽量别写错”，本地校验管“写错也进不了函数”，两层不互斥。

| 坑 | 现象 | 防护 |
| --- | --- | --- |
| 幻觉调用 | 调不存在的工具，或按旧描述调用 | 查注册表，查不到返回“工具不存在 + 可用清单”；schema 与实现同文件维护 |
| 空参 / 坏 JSON | arguments 空串、截断、非法 JSON | json.loads 包 try，空串按 {}；错误回填让模型重发 |
| 参数不合规 | 缺必填、类型错、枚举外取值 | validate_args 进函数前拦截，校验错误和参数要求一起回喂 |
| 工具异常 | 除零、断网、空指针 | try/except 包住执行，异常类型和信息回填 |
| 死循环 | 反复调同一工具不收尾 | MAX_ITERATIONS 熔断并明确报错；可加“连续相同工具错误必停” |

原则一致：错误要么回喂给模型，要么变成终端里明确的人话报错，不以崩掉为终点。demo 崩了可以重跑，线上 agent 崩一次会丢整个会话。

## 5｜JSON mode 与 function calling

function calling 是模型主动“点菜”，声明要调什么工具；JSON mode 是让模型按给定结构交作业，输出合法 JSON。两者都用 JSON Schema 表达结构，但控制流不同。

把 `response_format` 设为 `{"type": "json_object"}` 开启 JSON Output。官方要求：prompt 必须包含 `json` 字样并给出格式示例；合理设置 `max_tokens`；JSON Output 偶尔返回空 `content`，官方建议改 prompt 缓解。即使有“保证合法 JSON”的承诺，也要留一手。

|  | function calling | JSON mode |
| --- | --- | --- |
| 解决什么 | 模型决定下一步做什么 | 模型按结构输出数据 |
| 控制流 | 多轮循环，模型决定调不调、调几次 | 单轮请求-响应 |
| 输出 | tool_calls 调用意图，宿主执行后回填 | content 是合法 JSON 字符串 |
| 结构保证 | 参数受 schema 约束，strict 可加强 | 整体合法 JSON，字段结构靠 prompt 示例 |
| 典型场景 | agent loop、查库、写后台 | 信息提取、NL→固定字段、给下游代码消费 |

口诀：让模型做动作用 function calling，让模型按格式说话用 JSON mode。

`json_mode_demo.py`：

```
# json_mode_demo.py
import json

from openai import OpenAI

import config

client = OpenAI(
    api_key=config.api_key(),
    base_url=config.BASE_URL,
    timeout=config.TIMEOUT,
    max_retries=config.MAX_RETRIES,
)

resp = client.chat.completions.create(
    model=config.MODEL,
    messages=[
        {
            "role": "system",
            "content": (
                "从用户输入中提取姓名和城市，输出 json，格式示例："
                '{"name": "张三", "city": "杭州"}。只输出 json，不要输出其他内容。'
            ),
        },
        {
            "role": "user",
            "content": "我叫张三，下周去杭州出差，帮我看看那边的安排。",
        },
    ],
    response_format={"type": "json_object"},
)

data = json.loads(resp.choices[0].message.content)
print(json.dumps(data, ensure_ascii=False, indent=2))
```

预期输出：

```
{
  "name": "张三",
  "city": "杭州"
}
```

## 6｜里程碑 M1：终端跑起最小 agent

诚实说明：循环逻辑、四条错误兜底、多 `tool_calls` 配对、熔断、`reasoning_content` 回填已用桩模型实测；`[loop]` / `[工具]` 日志行格式与桩实测一致。对真实 DeepSeek 的调用 `<未实测，以官方文档为准>`，`[模型]` / `[助手]` 文本每次运行会浮动，验收看结构不看措辞。

```
python agent.py
python agent.py "37 乘以 45 等于多少？"
python agent.py --chat
python agent.py --think "37 乘以 45 等于多少？"
```

预置问题 1 的结构：

```
[用户] 现在几点了？
[loop] 第 1 轮 | 发送 2 条消息
[loop] finish_reason=tool_calls | tool_calls=1 个
[工具] get_time({})
[工具→] {"now": "2026-10-15 20:31:07"}
[loop] 第 2 轮 | 发送 4 条消息
[loop] finish_reason=stop | tool_calls=0 个
[模型] 现在是 2026-10-15 20:31:07。
[loop] 终止：共 2 轮
[助手] 现在是 2026-10-15 20:31:07。
```

预置问题 3 应出现两轮工具，`calculate` 的 `a` 等于上一轮 `get_time` 返回的小时数：

```
[工具] get_time({})
[工具→] {"now": "2026-10-15 20:31:19"}
[工具] calculate({"a": 20, "b": 7, "op": "*"})
[工具→] {"result": 140}
```

预置问题 4 的错误路径：

```
[工具] calculate({"a": 1, "b": 0, "op": "/"})
[工具→] 错误：工具 calculate 执行异常：ZeroDivisionError: division by zero
[loop] 第 2 轮 | 发送 4 条消息
[loop] finish_reason=stop | tool_calls=0 个
[模型] 工具返回了错误：除数不能为 0（ZeroDivisionError），所以 1 除以 0 没有结果。
```

![Image 1](https://pic1.zhimg.com/v2-f404e2ac3231c417c952bcbabf0c7794_1440w.jpg)

## 结论

1.   最小 agent = 五阶段 loop + 真实 LLM + 工具注册表 + 错误兜底。工具描述通过 `TOOL_SCHEMAS` 随 `tools` 参数发给模型，模型只出调用意图，执行和校验在宿主侧。
2.   循环正确性在三处：回填带 `reasoning_content`，终止读 `tool_calls` 和 `finish_reason`，熔断保底；四类工具错误统一回喂模型，循环不崩。
3.   function calling 用于让模型做动作，JSON mode 用于让模型按结构交数据；能约束就约束，但执行前仍要校验。

Part 2 到这里完整：loop 心智、模型选型、消息协议、能跑的最小 agent 都已具备。下一部分把工具从报时和算术换成真实后台 REST 接口，会立刻遇到 token 过期、4xx/5xx 回喂、写操作确认等问题。

* * *

## 参考

1.   DeepSeek API Docs — JSON Output — `response_format={'type':'json_object'}` 开启方式、”prompt 必须含 json 字样并给示例”、合理设 max_tokens、偶发空 content 的官方说明、官方 Python 示例（`model="deepseek-flash"`）。2026-10-15 curl 实测。
2.   DeepSeek API Docs — Tool Calls — “The model itself does not execute specific functions” 原文、`role:"tool"` + `tool_call_id` 回填官方示例、thinking 模式工具支持（V3.2 起）、Chat Completion API 不支持中途插入 tool calls、strict 模式（Beta：`/beta` base_url、`strict:true`、服务端校验 JSON Schema、支持类型清单）。2026-10-15 curl 实测。
3.   DeepSeek API Docs — Thinking Mode — **带 tools 请求必须完整回传历史 reasoning_content 否则 400** 的官方原文、`messages.append(message)` 与显式 dict 回填的官方等价写法、官方工具调用示例循环（`tool_calls is None` 判停）与示例输出。2026-10-15 curl 实测。
4.   DeepSeek API Docs — API Reference（create-chat-completion） — `response_format` 参数定义（取值 text/json_object、默认 text）与”不指令模型产 JSON 会输出无尽空白”的 Important 原文、`finish_reason="length"` 截断警告。2026-10-15 curl 实测。
5.   openai-python 官方仓库（PyPI`openai 3.31.0`） — `OpenAI()` 构造参数（api_key/base_url/timeout/max_retries）、`chat.completions.create` 的 `tools`/`response_format`/`reasoning_effort` 参数。版本号沿用第 5⁄6 篇 2026-10-15 PyPI 核验。
6.   系列前序：[第 3 篇](https://zhuanlan.zhihu.com/p/2095565673804083692/03-agent-loop%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87.md)（五阶段骨架、终止条件四类、工具注册六件套）、[第 4 篇](https://zhuanlan.zhihu.com/p/2095565673804083692/04-%E6%A8%A1%E5%9E%8B%E9%80%89%E5%9E%8B%E4%B8%8E%E6%8E%A8%E7%90%86.md)（thinking 开关与 reasoning_content 回传规则、非思考档默认）、[第 5 篇](https://zhuanlan.zhihu.com/p/2095565673804083692/05-Python%E9%80%89%E5%9E%8B%E5%9C%B0%E5%9B%BE.md)（venv 环境与 Python 3.11+ 约定）、[第 6 篇](https://zhuanlan.zhihu.com/p/2095565673804083692/06-%E8%B0%83%E7%94%A8LLM%E7%9A%84%E4%B8%89%E7%A7%8D%E5%A7%BF%E5%8A%BF.md)（消息四快照、tool_call_id 硬规则、finish_reason 全集、超时重试默认值）。

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
