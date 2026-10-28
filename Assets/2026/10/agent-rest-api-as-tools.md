# Agent - 后台API变成工具（8）（采集稿）

- 原文：<https://zhuanlan.zhihu.com/p/2095575551146718898>
- 来源：知乎专栏《Agent》
- 抓取方式：jina（清理后 37996 字符）

---

​

目录

## 介绍

第 8 篇：把后台 API 变成 Agent 的工具 — 第一个闭环

> Part 2 的 agent 只会玩两个演示工具；从本篇起主线落地——工具换成「登录 → 查用户 → 查角色 → 分配角色」的真实 REST 接口，里程碑 **M2**在本篇收口。行文顺序：先跑通（§1 起一个百行假后台，实践节一句话闭环），再拆解（§2 工具设计模式、§3 loop 复用）。前情：agent loop 五阶段（第 3 篇）、HTTP裸写法与 key 管理（第 6 篇）、`agent/`项目最小版（第 7 篇）。

## 本篇要回答的问题

1.   「最小目标服务」是什么？为什么是百行 Python 脚手架，而不是现在就去连真实 Go 后台？
2.   REST 接口怎么变成工具？与第 7 篇的本地函数工具相比，什么变了，什么必须不变？
3.   认证怎么设计？登录为什么本身就该是一个工具、token 存在哪、谁负责把 `Authorization` 头带上？
4.   模型怎么自己学会先登录？用户一句话里没提登录，agent 为什么知道第一轮先调 `login`？
5.   动手实践（**里程碑 M2**）：一句话「把张三提升为管理员」，agent 自动完成 登录→查用户→查角色→分配→答复，结果可核对。

## 1｜最小目标服务：给 agent 一个能打的真实 HTTP 后台

### 1.1 定位：练手靶子，不是落地成品

最小目标服务是一个真 HTTP 服务器，但数据在内存里、代码百来行，专门给 agent 练手用。不直接连真实 Go 后台，原因有三个：

1.   真实后台还在建，教学要求每步可跑，等不起；
2.   内存数据重启即清空，张三永远从“查看者”开始，错误场景随时重演——共享真后台上做不到；
3.   接谁都不影响 agent。agent 只通过 HTTP 看后端，后端是 Go 还是 Python，它一无所知。所以用 Python 脚手架验证 agent，将来接 Go 后台理论上只改 `BASE_URL` 一行。这是本篇工具设计最重要的性质，§2 展开。

对照“成熟方案三条路线”（SDK 直连 REST / MCP Server 包装 / 企业平台，第 15/21 篇详述），本脚手架对应路线 ① 的前置验证：工具层包一层 HTTP client，不动老系统，最快验证 agent 本身。

```
项目根/
├── agent/            ← 第 7 篇建的 agent（本篇往里加后台工具）
└── mock_backend/     ← 本篇新建：模拟“现有后台”的临时目标服务

┌──────────────┐   HTTP（普通 REST 调用）      ┌──────────────────────┐
│ agent/        │ ───────────────────────────▶ │ mock_backend/         │
│ 直连版 agent  │ ◀─────────────────────────── │ FastAPI 模拟“现有后台” │
└──────────────┘                              └──────────────────────┘
     AI 侧（我们写的）                            “现有系统”侧（临时的替身）
```

### 1.2 接口设计：主线四接口

路径前缀 `/api/v1`。`user_id` 不放进 path，统一走 query 或 body。主线四接口：

| 接口 | 方法 | 参数 | 作用 |
| --- | --- | --- | --- |
| /api/v1/auth/login | POST | body: username, password | 登录，返回 token 和可分配角色清单 assignable_roles |
| /api/v1/users | GET | query: keyword, page, page_size | 按用户名搜人，返回 user_id |
| /api/v1/users/roles | GET | query: user_id | 查该用户当前角色 |
| /api/v1/users/roles | POST | body: user_id, role_id | 修改该用户角色（覆盖式） |

agent 完成“把张三提升为管理员”，就是按顺序调这四个接口：

1.   调登录接口，拿到 token（后续请求都带它）和可分配角色清单；
2.   调查用户接口，`keyword=张三` 搜到 `user_id=u-1001`；
3.   调查角色接口，`user_id=u-1001` 看张三当前是什么角色；
4.   调改角色接口，`user_id=u-1001` + `role_id=r-admin` 完成分配。

两点设计说明：

*   **登录响应带 `assignable_roles`**：agent 不用额外调“列角色”接口就能拿到 `role_id`，四个工具正好够闭环。
*   **改角色是覆盖式**（把用户角色整体替换为指定的这一个，不是追加）：所以第 3 步“先查现状”是必要的，写操作也有明确的破坏性，第 9 篇的确认闸门拿它当教材。

另外，401 的错误文案写成“缺少访问令牌：请先调 POST /api/v1/auth/login 登录”。错误文本是写给模型读的，第 9 篇的自动重登就靠它。

### 1.3 完整代码：mock_backend/main.py（主线四接口）

```
# mock_backend/main.py — 第 8 篇：最小目标服务（FastAPI 脚手架，约 100 行）
# 定位：给 agent 练手的“假后台”，数据在内存、重启即重置，只是验证 agent 用的临时目标，
#       真实 Go 后台落地在 P5·15 / P7。
# 四接口：登录(JWT) / 按用户名搜人 / 查用户角色 / 修改用户角色。
# user_id 走 query 或 body，不放进 path。
# 依赖+启动：pip install fastapi uvicorn pyjwt；python -m uvicorn mock_backend.main:app --port 8000
# 已在本机实测：起服务 + 四接口 curl 全过，输出见 §1.4。
import time

import jwt
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="最小目标服务（教学脚手架）")

# ---------- 内存数据：重启即重置。示例数据全部用通用名 ----------

ROLES = {
    "r-admin": {"role_id": "r-admin", "role_name": "管理员"},
    "r-editor": {"role_id": "r-editor", "role_name": "编辑者"},
    "r-viewer": {"role_id": "r-viewer", "role_name": "查看者"},
}
USERS = {  # 张三初始是查看者，给 M2 的“提升为管理员”留出可核对的变化
    "u-1001": {"user_id": "u-1001", "username": "张三", "status": "active", "role_ids": ["r-viewer"]},
    "u-1002": {"user_id": "u-1002", "username": "李四", "status": "active", "role_ids": ["r-viewer"]},
    "u-1003": {"user_id": "u-1003", "username": "王五", "status": "disabled", "role_ids": []},
}
ACCOUNTS = {"admin": "admin123"}  # 演示专用；生产严禁明文写死，见 P7·20 密钥管理

SECRET_KEY = "teaching-secret"  # 教学写死；生产必须走环境变量/密钥管理，P7·20

class LoginBody(BaseModel):
    username: str
    password: str

class AssignRoleBody(BaseModel):
    user_id: str
    role_id: str

def sign_token(username: str) -> str:
    """签发 JWT：RFC 7519 三段式 header.payload.signature，HS256 签名，有效期 1 小时。"""
    return jwt.encode({"sub": username, "exp": int(time.time()) + 3600},
                      SECRET_KEY, algorithm="HS256")

def check_auth(authorization: str) -> None:
    """校验 Authorization 头，不合格一律 401。agent 侧把 401 文本喂回模型；
    token 过期自动重登是第 9 篇的主题，本篇只把错误如实报出去。"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少访问令牌：请先调 POST /api/v1/auth/login 登录")
    try:
        jwt.decode(authorization[7:], SECRET_KEY, algorithms=["HS256"])  # PyJWT 自动校验 exp
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="令牌已过期，请重新登录")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="令牌无效，请重新登录")

@app.post("/api/v1/auth/login")
def login(body: LoginBody):
    """登录：用户名+密码换 JWT。响应带 assignable_roles，agent 分配角色时从这里拿 role_id。"""
    if ACCOUNTS.get(body.username) != body.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"access_token": sign_token(body.username), "token_type": "Bearer",
            "expires_in": 3600, "assignable_roles": list(ROLES.values())}

@app.get("/api/v1/users")
def list_users(page: int = 1, page_size: int = 20, keyword: str = "",
               authorization: str = Header(default="")):
    """按用户名搜人（分页）。keyword 模糊过滤，agent 找“张三”的 user_id 就靠它。"""
    check_auth(authorization)
    hit = [u for u in USERS.values() if keyword in u["username"]]
    start = (page - 1) * page_size
    return {"total": len(hit), "page": page, "page_size": page_size,
            "users": hit[start:start + page_size]}

@app.get("/api/v1/users/roles")
def get_user_roles(user_id: str = "", authorization: str = Header(default="")):
    """查指定用户当前拥有的角色。user_id 走 query，从搜人接口的结果里来。"""
    check_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=400, detail="缺少 user_id")
    user = USERS.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"用户不存在：{user_id}")
    return {"user_id": user_id, "username": user["username"],
            "roles": [ROLES[r] for r in user["role_ids"]]}

@app.post("/api/v1/users/roles")
def assign_role(body: AssignRoleBody, authorization: str = Header(default="")):
    """修改用户角色：覆盖式，把该用户角色设置为 role_id 这一个。本系统唯一的写接口。"""
    check_auth(authorization)
    user, role = USERS.get(body.user_id), ROLES.get(body.role_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"用户不存在：{body.user_id}")
    if role is None:
        raise HTTPException(status_code=404, detail=f"角色不存在：{body.role_id}")
    user["role_ids"] = [body.role_id]
    return {"user_id": body.user_id, "username": user["username"],
            "roles": [ROLES[r] for r in user["role_ids"]]}
```

代码里用到 4 个 FastAPI 概念：`@app.get/@app.post` 路由装饰器、`BaseModel` 请求体、`Header` 读请求头（参数名按请求头名匹配、大小写不敏感，含下划线的参数名自动转连字符，官方 header-params 文档的约定）、`HTTPException` 抛错误响应。`get_user_roles` 的 `user_id` 是普通函数参数，FastAPI 默认把它当 query 参数；`assign_role` 的 `user_id` 和 `role_id` 放进 `AssignRoleBody`，走 body。PyJWT 只用两个函数：`jwt.encode(payload, key, algorithm="HS256")` 签发、`jwt.decode(token, key, algorithms=[...])` 校验，`exp` 过期时间是它自动校验的，过期抛 `ExpiredSignatureError`。

![Image 1](https://pic2.zhimg.com/v2-778b59d656aacac9b270367b72209adb_1440w.jpg)

### 1.4 不花 token 的接口自测

起服务后用 curl 把接口打一遍。以下输出为实测原文。

```
# 密码错误：401 + 可读的 detail（这行文本马上会被 agent 当提示读）
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}'
# {"detail":"用户名或密码错误"}

# 登录成功
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

登录成功响应（实测；`access_token` 每次运行都不同，这里截断）：

`{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc5MjA3Mjc2Nn0.ALlh...（省略）","token_type":"Bearer","expires_in":3600,"assignable_roles":[{"role_id":"r-admin","role_name":"管理员"},{"role_id":"r-editor","role_name":"编辑者"},{"role_id":"r-viewer","role_name":"查看者"}]}`

JWT 长什么样（RFC 7519 三段式 `header.payload.signature`，前两段是 Base64URL 编码的 JSON，可直接解开；第三段是 HS256 签名，改任一字符都会校验失败）：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9        → {"alg":"HS256","typ":"JWT"}            ← header
.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc5MjA3Mjc2Nn0 → {"sub":"admin","exp":1792072766}      ← payload
.ALlhHU5yW5LjKeQL2bwGFfasUFN-cCKEWOfR52LMNEY                                          ← signature
```

`exp` 是 1 小时后的时间戳，第 9 篇“token 过期自动重登”讲的就是它到期之后的事。

受保护接口的行为（实测；`$TOK` 换成上一步拿到的 access_token，`%E5%BC%A0%E4%B8%89` 是“张三”的 URL 编码）：

```
# 不带令牌：401，detail 告诉你该做什么
curl -s http://127.0.0.1:8000/api/v1/users
# {"detail":"缺少访问令牌：请先调 POST /api/v1/auth/login 登录"}

# 带令牌搜人（query 传 keyword）
curl -s "http://127.0.0.1:8000/api/v1/users?keyword=%E5%BC%A0%E4%B8%89" -H "Authorization: Bearer $TOK"
# {"total":1,"page":1,"page_size":20,"users":[{"user_id":"u-1001","username":"张三","status":"active","role_ids":["r-viewer"]}]}

# 查角色（query 传 user_id）
curl -s "http://127.0.0.1:8000/api/v1/users/roles?user_id=u-1001" -H "Authorization: Bearer $TOK"
# {"user_id":"u-1001","username":"张三","roles":[{"role_id":"r-viewer","role_name":"查看者"}]}

# 修改角色（body 传 user_id + role_id）
curl -s -X POST http://127.0.0.1:8000/api/v1/users/roles \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"user_id":"u-1001","role_id":"r-admin"}'
# {"user_id":"u-1001","username":"张三","roles":[{"role_id":"r-admin","role_name":"管理员"}]}

# 给不存在的角色赋权：404
curl -s -w " [%{http_code}]" -X POST http://127.0.0.1:8000/api/v1/users/roles \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"user_id":"u-1001","role_id":"r-god"}'
# {"detail":"角色不存在：r-god"} [404]
```

一个实测踩到的坑：`curl ".../users?keyword=张三"`（中文不编码）不会返回 401，而是被服务器直接拒掉：`Invalid HTTP request received.` + HTTP 400。中文 query 必须 URL 编码（`--data-urlencode`，或图省事用 ASCII 的 `keyword=zhangsan`）。Python 的 `urllib.parse.urlencode` / `requests` 会自动做编码，没有这个问题。

## 2｜工具设计模式：REST 接口怎么变成模型能用的工具

### 2.1 变了什么，没变什么

第 7 篇的工具是纯本地函数（`get_time` 读时钟、`calculate` 算四则）；本篇的工具函数体变成一次 HTTP 请求的封装。变化清单：

|  | 第 7 篇演示工具 | 第 8 篇后台工具 |
| --- | --- | --- |
| 函数体 | 纯计算 / 本地读数 | 拼 URL + 发请求 + 解析响应 |
| 失败来源 | Python 异常（除零等） | HTTP 状态码 + 错误响应体（401/404/…） |
| 状态 | 无状态 | 有认证态（token 持有与注入） |

但对 loop 而言工具形状完全没变，仍是“名字 + JSON Schema + 一个返回 dict 的普通函数”，§3 展开。后端类比：这层工具函数就是你 Go 后台里的 client 层，把远端 API 包成方法签名，调用方（loop）不感知 HTTP 细节。循环眼里没有“远程”，只有函数。

## 2.2 认证：四件事

后台接口需要登录才能调。工具层要解决四个问题：登录怎么做、token 放哪、请求怎么带 token、模型怎么知道要先登录。

### 登录做成工具，不预登录

把 `login` 和一个普通工具一样放进 schema，由模型自己调用。这样登录失败时模型能读到错误、换参数重试；token 过期它能再登一次；每次登录都出现在日志里，能查。

如果框架在启动时预先登录，模型看不到登录过程。登录挂了，你还得另外想办法把错误告诉它。

**token 存进程内存**

登录成功后，把 token 存到模块级变量`_token`。不放 prompt，不打日志。

模型不需要看到 token，因为请求会自动带上（见下一条）。token 是易变状态，放上下文里可能被复述出去，过期后模型手里还是一个旧值。这和第 6 篇的 key 管理原则一样：凭证只在代码里，不进模型上下文。

**请求自动带 Authorization**

四个工具都通过 `_call()` 发请求。`_call()` 检查 `_token`，有值就加 `Authorization: Bearer <token>` 头。业务工具（`get_users`、`assign_role` 等）内部不写任何认证代码。

**描述写清要先登录**

工具描述就是模型看到的 prompt。`login` 的描述写“调用任何其他后台工具前必须先成功登录一次”，并附演示账号。`assign_role` 的描述写清它是覆盖式写操作、`role_id` 从 `login` 返回的 `assignable_roles` 里选、执行前先调 `get_user_roles` 看现状并复述变更。模型按描述排步骤，用户不需要说“先登录”。

你期望模型执行的顺序（登录→搜人→查现状→分配），就写成描述里的顺序。

**凭证从哪来**

演示时账号直接写在 `login` 描述里，让 agent 能自己完成登录。生产环境不应该把密码写进任何 prompt，凭证从环境变量或配置来：

```
SYSTEM = f"""你是“后台管理助手”，负责帮用户查询和调整后台用户角色。规则：
1. 调用任何后台工具前，先用 login 登录（用户名 {os.environ.get('TARGET_USERNAME', 'admin')}，密码 {os.environ.get('TARGET_PASSWORD', 'admin123')}）。
2. 用户提到人名（如“张三”）时，先用 list_users 查到 user_id，不要凭空猜。
3. 用户提到角色名（如“运营”）时，先用 list_roles 查到 role_id，不要凭空猜。
4. 写操作执行后如实汇报结果；其余按工具返回的内容处理。
"""
```

`.env` 里加 `TARGET_USERNAME=admin` 和 `TARGET_PASSWORD=admin123`。演示两种方式都能跑，但真实系统里在对话里传密码会被日志和记忆留下记录，这是 P3·10 的反模式。

**token 不进日志**

`agent.py` 会打印每个工具的结果（`[工具→]` 行）。如果 `login` 直接把接口响应返回，token 就会出现在终端里。所以 `login` 在返回前把 `access_token` 摘掉：

```
if "access_token" in result:             # 成功：摘走 token 再返回（不进 prompt / 不进日志）
    _token = result.pop("access_token")
    result["status"] = "ok"
return result
```

模型和终端看到的是 `{"token_type": ..., "expires_in": 3600, "assignable_roles": [...], "status": "ok"}`，“登录成功”这个事实回喂给模型，令牌本体留在进程内存。这个细节值得直接抄进你自己的项目。

## 2.3 工具设计模式表

| 工具 | 描述要点（写给模型看） | 认证处理 | 风险级 |
| --- | --- | --- | --- |
| login | “调任何其他后台工具前必须先登录”；附演示账号；令牌自动保管、不必向用户提及 | 自己调登录接口；token 存进程内存并从返回值摘除 | 低（演示凭证；生产凭证管理见 P7·20） |
| get_users | 返回 users 含 user_id；keyword 按用户名模糊搜人 | _call 自动注入 Bearer | 低（只读） |
| list_roles（五接口变体） | 查角色目录；把角色名翻译成 role_id，别让模型猜 | 同上 | 低（只读） |
| get_user_roles | user_id 从 get_users 来；“改角色前先看一眼现状” | 同上 | 低（只读） |
| assign_role | 覆盖式/追加式语义写明；role_id 来源写清；执行前先查现状+复述变更 | 同上 | 中高（写操作；第 9 篇上二次确认闸门） |

* * *

## 2.4 HTTP 调用统一封装

四个工具都通过 `_call()` 发请求（完整代码见 §2.5）。`_call()` 除了拼 URL 和带 token，还要处理三类失败。

**HTTP 错误（4xx/5xx）**

`urllib` 对非 2xx 响应抛 `urllib.error.HTTPError`，异常对象里有完整响应体。读出来，拆掉 FastAPI 的 `{"detail": ...}` 外层，返回结构化 dict：

```
except urllib.error.HTTPError as e:      # 4xx/5xx：urllib 把非 2xx 当异常，正文里有 detail
    raw = e.read().decode("utf-8", "replace")
    try:                                 # FastAPI 的错误信封是 {"detail": "..."}，拆出人话再回喂
        detail = json.loads(raw).get("detail", raw)
    except json.JSONDecodeError:
        detail = raw
    return {"error": True, "status": e.code, "detail": detail}
```

返回 `{"error": true, "status": 401, "detail": "用户名或密码错误"}`。不直接返回一段文字，是因为模型需要看 `status` 判断下一步：401 可能要重登，404 可能要换 ID。这和第 7 篇 §2.4 的原则一致：错误不抛出，回喂给模型，只是错误源从 Python 异常换成了 HTTP 层。

**连接失败**

后台没起或端口不对时抛 `urllib.error.URLError`。返回一句可操作的话：

```
return {"error": True, "status": None,
        "detail": f"无法连接后台（{e.reason}）——确认 mock_backend 已启动"}
```

实践节有实验复现。

**系统代理劫持本地回环**

如果 shell 设置了 `http_proxy`，`urllib` 会把 `127.0.0.1` 的请求也发给代理，本地回环必须直连。建一个不用代理的 opener：

`_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))`

之后用 `_opener.open(...)` 发请求，代替 `urllib.request.urlopen(...)`。实测踩过这个坑：代理开着时表现为连接失败，关掉就好。

### 2.5 完整代码：admin_tools.py

```
# admin_tools.py — 第 8 篇：后台管理工具集（login / get_users / get_user_roles / assign_role）
# 与第 7 篇 tools.py 的本质区别：工具不再是本地函数，而是对远程 REST 接口的 HTTP 调用。
# 与 tools.py 暴露同一组注册件接口（TOOL_SCHEMAS / TOOL_REGISTRY / SCHEMA_BY_NAME /
# validate_args），所以 agent.py 的 loop 代码一行核心逻辑都不用改（本篇 §3.1）。
# 工具层签名：get_user_roles(user_id) / assign_role(user_id, role_id)。
# 内部 HTTP 走 query/body，不把 user_id 放进 path。
# 已在本机对 mock_backend 实测跑通 M2 闭环与错误路径（见实践节）。
import json
import urllib.error
import urllib.parse
import urllib.request

import tools  # 复用第 7 篇的最小 schema 校验：工具换了，参数闸门不换

BASE_URL = "http://127.0.0.1:8000"  # 本地脚手架基址；接真实后台时只改这一行（P5·15 / P7）
TIMEOUT = 10.0  # 工具自己的超时，与 LLM 调用的 60 秒（config.TIMEOUT）各管各的

# 不走系统代理：若 shell 设了 http_proxy，urllib 会把 127.0.0.1 的请求也交给代理，
# 本地回环地址必须直连（实测踩过的坑，代理开着时表现为“连接失败”）。
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

# ---------- 认证状态：token 只活在进程内存里 ----------
# token 不进 messages、不进日志（终端会打印工具结果，所以 login 在返回前把 token 摘走）；
# 进程重启即失效，重登一次就好。
_token: str | None = None

# ---------- 统一 HTTP 出口：四个工具共用的一根水管 ----------
def _call(method: str, path: str, body: dict | None = None) -> dict:
    """拼 URL、发请求、自动注入 Authorization；任何失败都不抛出，
    把状态码+错误文本装进 dict 返回，由 loop 当作普通工具结果回喂模型（第 7 篇 §2.4 同一哲学）。"""
    headers = {"Content-Type": "application/json"}
    if _token:  # 已登录则自动带令牌，其余工具从此“感觉不到”认证的存在
        headers["Authorization"] = f"Bearer {_token}"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(BASE_URL + path, data=data, headers=headers, method=method)
    try:
        with _opener.open(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:      # 4xx/5xx：urllib 把非 2xx 当异常，正文里有 detail
        raw = e.read().decode("utf-8", "replace")
        try:                                 # FastAPI 的错误信封是 {"detail": "..."}，拆出人话再回喂
            detail = json.loads(raw).get("detail", raw)
        except json.JSONDecodeError:
            detail = raw
        return {"error": True, "status": e.code, "detail": detail}
    except urllib.error.URLError as e:       # 连接层失败：典型是后台服务没起
        return {"error": True, "status": None,
                "detail": f"无法连接后台（{e.reason}）——确认 mock_backend 已启动"}

# ---------- 四个工具：普通 Python 函数，返回 dict（会经 json.dumps 变成 tool 结果） ----------

def login(username: str, password: str) -> dict:
    """登录工具：成功后把 token 存进进程内存；返回给模型/终端的只有“登录成功”的元信息。"""
    global _token
    result = _call("POST", "/api/v1/auth/login", {"username": username, "password": password})
    if "access_token" in result:             # 成功：摘走 token 再返回（不进 prompt / 不进日志）
        _token = result.pop("access_token")
        result["status"] = "ok"
    return result

def get_users(page: int = 1, page_size: int = 20, keyword: str = "") -> dict:
    qs = urllib.parse.urlencode({"page": page, "page_size": page_size, "keyword": keyword})
    return _call("GET", f"/api/v1/users?{qs}")

def get_user_roles(user_id: str) -> dict:
    """查用户当前角色。user_id 走 query，从 get_users 的结果里来。"""
    qs = urllib.parse.urlencode({"user_id": user_id})
    return _call("GET", f"/api/v1/users/roles?{qs}")

def assign_role(user_id: str, role_id: str) -> dict:
    """修改用户角色（覆盖式）。user_id 和 role_id 走 body。"""
    return _call("POST", "/api/v1/users/roles", {"user_id": user_id, "role_id": role_id})

# ---------- 工具清单：随请求发给模型的 JSON Schema（与第 7 篇同一 wire 格式） ----------
# 描述就是 prompt（第 7 篇 §1.4）：谁先谁后、参数从哪来、哪个是写操作，全写在描述里。
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "login",
            "description": (
                "登录后台管理系统，获取访问令牌。在调用任何其他后台工具之前必须先成功登录一次。"
                "演示账号：用户名 admin，密码 admin123。登录成功后令牌由系统自动保管并在后续"
                "调用中自动携带，你无需向用户提及令牌，也不要询问密码以外的任何凭证信息。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "登录用户名"},
                    "password": {"type": "string", "description": "登录密码"},
                },
                "required": ["username", "password"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_users",
            "description": (
                "按用户名搜索后台用户（分页），返回 users（每人含 user_id、username、status）与 total。"
                "keyword 按用户名模糊搜索——不知道 user_id 时，先用它把人搜出来。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {"type": "integer", "description": "页码，从 1 开始，默认 1"},
                    "page_size": {"type": "integer", "description": "每页条数，默认 20"},
                    "keyword": {"type": "string", "description": "按用户名模糊过滤，可为空串"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_roles",
            "description": (
                "查询指定用户当前拥有的角色列表。user_id 从 get_users 的结果里来。"
                "在给用户改角色之前，先调它看一眼现状。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "用户 ID，来自 get_users"},
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "assign_role",
            "description": (
                "把指定用户的角色设置为 role_id 对应的角色。这是写操作，且是覆盖式：该用户"
                "原有的角色会被整体替换，role_id 从 login 返回的 assignable_roles 里选；"
                "执行前先调 get_user_roles 确认现状，并向用户复述一遍将发生的变更。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "用户 ID，来自 get_users"},
                    "role_id": {"type": "string", "description": "角色 ID，来自 login 返回的 assignable_roles"},
                },
                "required": ["user_id", "role_id"],
            },
        },
    },
]

TOOL_REGISTRY = {"login": login, "get_users": get_users,
                 "get_user_roles": get_user_roles, "assign_role": assign_role}

SCHEMA_BY_NAME = {s["function"]["name"]: s["function"] for s in TOOL_SCHEMAS}

validate_args = tools.validate_args  # 校验闸门原样复用（第 7 篇 §3.1），接口同形
```

若采用五接口变体，在 `TOOL_REGISTRY` / `TOOL_SCHEMAS` 里加一个 `list_roles`，函数体是一行 `_call("GET", "/api/v1/roles")`；`assign_role` 的描述改成“追加式、幂等”。映射规则不变：一个接口一个工具，描述写清语义和先后。

## 3｜loop 的复用：换工具集，不换循环

### 3.1 改动清单与完整代码

第 7 篇的循环结构原封不动，改动全部在“外围配置”：

| 改动 | 内容 |
| --- | --- |
| 导入与选择 | import admin_tools；模块级 toolset = admin_tools（主线切换到后台工具集） |
| 提示词 | 新增后台助手的 SYSTEM_PROMPT（含“先 login”“写操作先复述”两条行为规则）；原提示词保留为 DEMO_SYSTEM_PROMPT |
| 预置问题 | 换成 3 条后台问题（--demo 时换回原 4 条） |
| 命令行 | 新增 --demo 旗标：工具集、系统提示词、预置问题三者整组切回演示工具集 |
| 迭代上限 | MAX_ITERATIONS 建议 10~12（M2 主路径 5 轮余量充足） |

循环能零改动，是因为两个工具集模块暴露同一组注册件接口（`TOOL_SCHEMAS` / `TOOL_REGISTRY` / `SCHEMA_BY_NAME` / `validate_args`）。第 3 篇 §2.3 说“工具注册件是形状”，现在兑现：换的是注册表的内容，不是循环的结构。`registry.update(...)` + `TOOLS_SCHEMA += [...]` 也是同一思想的另一种写法。

`requirements.txt` 更新如下，新增 `fastapi` / `uvicorn` / `pyjwt`，只服务脚手架，agent 侧零新增依赖：

```
# agent/ 项目依赖（Python 3.11+，系列约定见第 5 篇）
openai==3.31.0
# 第 8 篇新增：只服务于 mock_backend 脚手架（agent 侧工具走标准库 urllib，零新增依赖）。
fastapi==0.143.1
uvicorn==0.54.0
pyjwt==2.15.1
```

```
# agent.py — 手写最小 agent（第 7 篇 M1 建立；第 8 篇起主线切后台管理工具集，M2）
# 依赖：pip install -r requirements.txt（openai 3.31.0；Python 3.11+，第 5 篇）
# 运行：
#   终端 1：python -m uvicorn mock_backend.main:app --port 8000   # 先起后台脚手架
#   终端 2：
#   export DEEPSEEK_API_KEY=sk-xxx && python agent.py "把张三提升为管理员"   # M2 主线路径
#   python agent.py                            # 跑后台预置问题集
#   python agent.py --demo                     # 切回第 7 篇演示工具集（M1 复验）
#   python agent.py --chat                     # 交互模式
#   python agent.py --think                    # 思考档（第 4 篇 §1.5）
# 诚实声明：loop 逻辑（含四条错误兜底路径与熔断）已用桩模型本地实测；
#           M2 闭环已对本地 mock_backend 实测（桩 LLM + 真实 HTTP，见实践节）；
#           对真实 DeepSeek 的调用 <未实测，以官方文档为准>
import argparse
import json

from openai import OpenAI

import admin_tools
import config
import tools as demo_tools   # 演示工具集：--demo 复验 M1 时使用

# 第 8 篇主线切换：工具集从演示工具换成后台管理工具。两个模块暴露同一组注册件接口，
# 所以下面的 loop 代码一行核心逻辑都不用改：换的是注册表内容，不是循环结构。
toolset = admin_tools

# 系统提示词随工具集绑定切换（main 里 --demo 时三者一起换）。它们与工具描述同属
# “给模型看的说明书”（第 7 篇 §1.4），改工具不改说明，模型立刻按旧世界观干活。
SYSTEM_PROMPT = (
    "你是一个后台管理助手，通过工具操作用户管理系统。规则：\n"
    "1. 涉及用户、角色的事实必须调用工具获取，禁止编造 user_id / role_id；\n"
    "2. 调用其他后台工具前必须先 login（演示账号写在工具说明里）；令牌由系统自动保管，"
    "不必向用户提及，也不要在回复里复述任何令牌；\n"
    "3. 回答里引用的 ID、角色名必须原样来自工具结果，不要改写或补全；\n"
    "4. 工具返回错误时读懂错误、调整后重试；assign_role 是写操作，执行前先把要做的事"
    "向用户复述一遍。"
)

PRESET_QUESTIONS = [
    "把张三提升为管理员",            # M2 验收主路径：登录→搜人→查角色→分配（写操作）
    "李四现在是什么角色？",           # 只读路径：登录→搜人→查角色
    "系统里现在有哪些用户？",         # 只读路径：登录→分页列表
]

# 第 7 篇演示工具集的原提示词与原预置问题：--demo 复验 M1 时整组换回。
DEMO_SYSTEM_PROMPT = (
    "你是一个跑在终端里的最小 agent。规则：\n"
    "1. 事实性问题（当前时间、计算结果）必须调用工具获取，禁止凭记忆编造；\n"
    "2. 回答中引用的数值必须原样来自工具结果，不要自己改写或补全；\n"
    "3. 工具返回错误信息时，读懂错误、调整调用方式重试，不要原样重复同样的调用。"
)

DEMO_PRESET_QUESTIONS = [
    "现在几点了？",
    "37 乘以 45 等于多少？",
    "先看看现在几点，再把当前的小时数乘以 7。",
    "用 calculate 算一下 1 除以 0，把工具返回的内容告诉我。",
]

def create_client() -> OpenAI:
    """姿势二（第 6 篇 §2）：官方 SDK。三个字符串全部来自 config 唯一配置点。"""
    return OpenAI(api_key=config.api_key(), base_url=config.BASE_URL,
                  timeout=config.TIMEOUT, max_retries=config.MAX_RETRIES)

def call_llm(client: OpenAI, messages: list, think: bool = False):
    """阶段② 调 LLM：全部 messages + 工具清单一起发（第 3 篇：每轮全量重发）。"""
    kwargs = dict(model=config.MODEL, messages=messages, tools=toolset.TOOL_SCHEMAS)
    if think:   # 思考档（第 4 篇 §1.3）。默认不开：循环内普通调用用非思考档（第 4 篇 §4.4）
        kwargs["reasoning_effort"] = "high"      # SDK 原生参数，不走 extra_body（第 6 篇 §2.1）
        kwargs["extra_body"] = {"thinking": {"type": "enabled"}}
    else:
        kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
    return client.chat.completions.create(**kwargs)

def to_assistant_dict(msg) -> dict:
    """把 SDK 返回的 assistant 消息固化成 dict（阶段⑤ 前半：回填模型意图）。
    显式构造是为了看清回填了哪些字段，特别是 reasoning_content：带 tools 的请求必须
    完整回传它，否则 API 返回 400（第 4 篇 §1.5 官方原文）。getattr 防御性读取，
    旧版 SDK 类型可能未声明该字段。"""
    out = {"role": "assistant", "content": msg.content}
    reasoning = getattr(msg, "reasoning_content", None)
    if reasoning:
        out["reasoning_content"] = reasoning     # 非 thinking 档没有该字段，自然不带
    if msg.tool_calls:
        out["tool_calls"] = [
            {"id": c.id, "type": "function",
             "function": {"name": c.function.name, "arguments": c.function.arguments}}
            for c in msg.tool_calls
        ]
    return out

def execute_tool(call) -> str:
    """阶段④ 执行单个工具调用。总原则：任何失败都不抛出，把错误文本当作工具结果
    回填给模型（它下一轮读到后自行纠正），循环永远不因工具问题崩掉。"""
    name = call.function.name
    if name not in toolset.TOOL_REGISTRY:        # 坑 1：幻觉调用，调了不存在的工具
        return (f"错误：不存在名为 {name!r} 的工具。"
                f"可用工具：{sorted(toolset.TOOL_REGISTRY)}")
    try:                                         # 坑 2：坏 JSON / 空参，arguments 是 JSON 字符串
        args = json.loads(call.function.arguments) if call.function.arguments else {}
    except json.JSONDecodeError as e:
        return f"错误：arguments 不是合法 JSON（{e}）。请重新发起调用。"
    ok, err = toolset.validate_args(toolset.SCHEMA_BY_NAME[name], args)   # 坑 3：schema 校验
    if not ok:
        want = json.dumps(toolset.SCHEMA_BY_NAME[name]["parameters"], ensure_ascii=False)
        return f"错误：参数校验失败（{err}）。参数要求：{want}"
    try:                                         # 坑 4：运行时异常，如除零
        result = toolset.TOOL_REGISTRY[name](**args)
    except Exception as e:   # 教学版从宽捕获；生产要按异常类型分级处理（第 9 篇展开）
        return f"错误：工具 {name} 执行异常：{type(e).__name__}: {e}"
    return json.dumps(result, ensure_ascii=False)

def run_agent(client, user_input: str, think: bool = False) -> str:
    """一轮完整的 agent loop：第 3 篇五阶段的实体化。返回最终答复文本。"""
    # 阶段① 获取输入：system 纪律 + user 问题，agent 初始的内部状态
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_input}]
    print(f"\n[用户] {user_input}")
    for i in range(1, config.MAX_ITERATIONS + 1):
        # 阶段② 调 LLM
        print(f"[loop] 第 {i} 轮 | 发送 {len(messages)} 条消息")
        resp = call_llm(client, messages, think=think)
        choice = resp.choices[0]
        msg, finish = choice.message, choice.finish_reason
        print(f"[loop] finish_reason={finish} | tool_calls={len(msg.tool_calls or [])} 个")
        if msg.content:
            print(f"[模型] {msg.content}")
        # 阶段⑤（前半）：先回填模型意图，工具结果才能与 tool_call_id 配对（第 6 篇硬规则 1）
        messages.append(to_assistant_dict(msg))
        # 阶段③ 终止判定：assistant 消息上没有 tool_calls，即模型宣告完成。
        # 读结构化信号，不读文本，模型嘴上说“完成了”不算数（第 3 篇 §4.2）。
        if not msg.tool_calls:
            if finish != "stop":   # stop 之外的收尾（length=截断等，全集见第 6 篇 §1.3）
                print(f"[loop] 警告：finish_reason={finish}，回答可能不完整")
            print(f"[loop] 终止：共 {i} 轮")
            return msg.content
        # 阶段④ + ⑤（后半）：执行每一个工具调用、逐个配对回填。
        # 同一条消息里有多个 tool_calls 时也是这里逐个处理；教学版顺序执行，
        # 同消息多工具并行发送属于时延优化项，本系列不做（M2 每轮通常只来一个调用）。
        for call in msg.tool_calls:
            print(f"[工具] {call.function.name}({call.function.arguments})")
            result = execute_tool(call)
            print(f"[工具→] {result}")
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
    # 终止条件二：最大迭代数熔断，熔断后必须有明确行为，而不是静默返回空（第 3 篇 §4.2）
    raise RuntimeError(f"[熔断] 达到最大迭代数 {config.MAX_ITERATIONS}，强制终止")

def run_safely(client, question: str, think: bool = False) -> str:
    """熔断等 RuntimeError 转成可见的答复文本，明确报错，不静默、不崩终端。"""
    try:
        return run_agent(client, question, think=think)
    except RuntimeError as e:
        return str(e)

def main():
    global toolset, SYSTEM_PROMPT, PRESET_QUESTIONS   # --demo 时在函数内给模块级变量重新赋值
    parser = argparse.ArgumentParser(description="手写最小 agent（第 7 篇 M1 → 第 8 篇 M2）")
    parser.add_argument("question", nargs="?", help="单次提问；不给则跑预置问题集")
    parser.add_argument("--chat", action="store_true", help="交互模式；每行输入一次全新会话")
    parser.add_argument("--think", action="store_true", help="开思考档（第 4 篇 §1.5）")
    parser.add_argument("--demo", action="store_true",
                        help="切回第 7 篇演示工具集 get_time/calculate（M1 复验用）")
    args = parser.parse_args()
    if args.demo:   # 工具集、系统提示词、预置问题三者整组切换
        toolset, SYSTEM_PROMPT, PRESET_QUESTIONS = demo_tools, DEMO_SYSTEM_PROMPT, DEMO_PRESET_QUESTIONS
    client = create_client()
    try:
        if args.chat:
            print("交互模式（输入 quit 退出）。注意：每次输入都是一次全新会话，"
                  "它为什么记不住上一句？P4·11 记忆篇回答。")
            while True:
                user_input = input("你> ").strip()
                if user_input.lower() in ("quit", "q", "exit"):
                    break
                if user_input:
                    print(f"[助手] {run_safely(client, user_input, think=args.think)}")
        elif args.question:
            print(f"[助手] {run_safely(client, args.question, think=args.think)}")
        else:                                # 预置问题集：M2 验收路径（--demo 时为 M1 复验）
            for q in PRESET_QUESTIONS:
                print(f"[助手] {run_safely(client, q, think=args.think)}")
    except KeyboardInterrupt:
        print("\n[退出] 用户中断（第 3 篇终止条件之四：用户确认/打断）")

if __name__ == "__main__":
    main()
```

### 3.2 四条兜底路径在新场景下的表现

工具从本地换到远程，第 7 篇的四条防护一条没动，逐条对账：

| 坑（第 7 篇 §3.2） | 本篇场景下的表现 | 防护位置 |
| --- | --- | --- |
| 幻觉调用 | 模型调了不存在的工具，注册表查不到，错误文本回喂 | execute_tool（未改） |
| 坏 JSON/空参 | 同左，与工具远近无关 | execute_tool（未改） |
| 参数不合规 | schema 校验原样复用（admin_tools.validate_args = tools.validate_args）；实测里它真拦下过一次 user_id: null 的坏参数 | validate_args（复用） |
| 运行时异常 | HTTP 层的失败在 _call 内就被装成 error dict 返回，到不了 execute_tool 的 except，两层防线 | _call（新）+ execute_tool（未改） |

熔断依然在：M2 主路径 5 轮收尾，`MAX_ITERATIONS=10` 余量充足，设 12 也可以。系统提示词的规则 4（“`assign_role` 是写操作，执行前先复述”）是给确认闸门铺的行为预期，真正的闸门（代码级强制，不靠模型自觉）在第 9 篇。

还有一条实战能力值得单独验证：错误喂回自愈。用户说“别登录，先直接帮我查张三有哪些角色”，agent 先吃到 401（工具结果里是结构化错误），随后自己补一次 `login` 再查。行为会随模型和提示词浮动，但 401 回喂不崩、能调整，是这套结构必须守住的能力。

## 动手实践：里程碑 M2——一句话完成「查用户、分配角色」

目标：用户只说一句话「把张三提升为管理员」，agent 自动完成 登录→查用户→查角色→分配→答复，全程无需人工中途接手，结果可核对。做完会验证本篇四个设计决策：描述即流程（没提“登录”它自己登录了）、token 不出进程内存、错误即信息（401/404 回喂不崩）、loop 零改动。

诚实声明：本实践的 `[loop]`/`[工具]`/`[工具→]` 日志行已用“桩 LLM + 真实 mock_backend（真实 HTTP）”实测并逐字记录（方法同第 7 篇：只把模型响应换成照剧本出牌的桩，loop、工具层、HTTP 全部走真实代码）；`[模型]`/`[助手]` 的自然语言文本随模型浮动，为结构示意。对真实 DeepSeek 的调用 `<未实测，以官方文档为准>`。验收看结构（工具序列、轮数、结果字段），不看措辞。

```
cd agent
# python3.11 -m venv .venv && source .venv/bin/activate   # 这里用的miniconda
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
export DEEPSEEK_API_KEY=sk-xxxxxxxx
```

### 第 1 步：终端 1——起脚手架并自测接口（不花 token）

`python -m uvicorn mock_backend.main:app --port 8000`

预期输出（实测）：

```
INFO:     Started server process [56990]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 第 2 步：零 token 工具层冒烟

先绕过 LLM 直接验证工具层。新建 `agent/tools_smoke.py`（主线四接口版）：

```
"""tools_smoke.py — 绕过 LLM 直接验证工具层（跑它时确保目标服务已启动）"""
from admin_tools import login, get_users, get_user_roles, assign_role

print("1. 未登录就查:", get_user_roles("u-1001"))
print("2. 密码错登录:", login("admin", "wrong"))
print("3. 正确登录:", login("admin", "admin123"))
print("4. 查张三:", get_users(keyword="张三"))
print("5. 张三现有角色:", get_user_roles("u-1001"))
print("6. 分配给张三管理员:", assign_role("u-1001", "r-admin"))
print("7. 复查:", get_user_roles("u-1001"))
print("8. 不存在用户:", get_user_roles("u-9999"))
```

预期输出（主线结构，token 不打印）：

```
1. 未登录就查: {'error': True, 'status': 401, 'detail': '缺少访问令牌：请先调 POST /api/v1/auth/login 登录'}
2. 密码错登录: {'error': True, 'status': 401, 'detail': '用户名或密码错误'}
3. 正确登录: {'token_type': 'Bearer', 'expires_in': 3600, 'assignable_roles': [...], 'status': 'ok'}
4. 查张三: {'total': 1, 'page': 1, 'page_size': 20, 'users': [{'user_id': 'u-1001', ...}]}
5. 张三现有角色: {'user_id': 'u-1001', 'username': '张三', 'roles': [{'role_id': 'r-viewer', 'role_name': '查看者'}]}
6. 分配给张三管理员: {'user_id': 'u-1001', 'username': '张三', 'roles': [{'role_id': 'r-admin', 'role_name': '管理员'}]}
7. 复查: ... 'roles': [{'role_id': 'r-admin', 'role_name': '管理员'}]
8. 不存在用户: {'error': True, 'status': 404, 'detail': '用户不存在：u-9999'}
```

![Image 2](https://pica.zhimg.com/v2-b229cec46467fae9e07b7ccb7f4e8f1e_1440w.jpg)

若采用五接口变体，把 `list_roles()` 加进冒烟，并测“追加式幂等再分配”一项。

### 第 3 步：终端 2——一句话跑闭环（M2 验收路径）

`python agent.py "把张三提升为管理员"`

预期输出（实测转写；诚实声明见节首）：

```
[用户] 把张三提升为管理员
[loop] 第 1 轮 | 发送 2 条消息
[loop] finish_reason=tool_calls | tool_calls=1 个
[工具] login({"username": "admin", "password": "admin123"})
[工具→] {"token_type": "Bearer", "expires_in": 3600, "assignable_roles": [{"role_id": "r-admin", "role_name": "管理员"}, {"role_id": "r-editor", "role_name": "编辑者"}, {"role_id": "r-viewer", "role_name": "查看者"}], "status": "ok"}
[loop] 第 2 轮 | 发送 4 条消息
[loop] finish_reason=tool_calls | tool_calls=1 个
[工具] get_users({"keyword": "张三"})
[工具→] {"total": 1, "page": 1, "page_size": 20, "users": [{"user_id": "u-1001", "username": "张三", "status": "active", "role_ids": ["r-viewer"]}]}
[loop] 第 3 轮 | 发送 6 条消息
[loop] finish_reason=tool_calls | tool_calls=1 个
[工具] get_user_roles({"user_id": "u-1001"})
[工具→] {"user_id": "u-1001", "username": "张三", "roles": [{"role_id": "r-viewer", "role_name": "查看者"}]}
[loop] 第 4 轮 | 发送 8 条消息
[loop] finish_reason=tool_calls | tool_calls=1 个
[工具] assign_role({"role_id": "r-admin", "user_id": "u-1001"})
[工具→] {"user_id": "u-1001", "username": "张三", "roles": [{"role_id": "r-admin", "role_name": "管理员"}]}
[loop] 第 5 轮 | 发送 10 条消息
[loop] finish_reason=stop | tool_calls=0 个

[模型] 已完成：张三（u-1001）的角色已从 查看者 变更为 管理员。
[loop] 终止：共 5 轮

[助手] 已完成：张三（u-1001）的角色已从 查看者 变更为 管理员。
```

![Image 3](https://picx.zhimg.com/v2-a47e3caa49966b1753b3ccaa861652d9_1440w.jpg)

真实请求会进行询问，这是

**要修的话,最小改动是消除歧义**

把"复述"从"执行前的阻塞"改成"不阻塞"——最贴近文档自己演示过的行为(第 5 轮总结时复述):

把 agent.py:35-36 的规则 4 和 admin_tools.py:145 的描述改成类似:

> 规则 4:`assign_role 是写操作(覆盖式)。执行它,在执行完成后的答复里复述变更前后;不要在调用前停下来向用户征求确认。`描述:`执行前先调 get_user_roles 确认现状;执行完成后在答复里说明变更前后。`

![Image 4](https://pic2.zhimg.com/v2-e3479b4465a80bc5f90674a30358b7d7_1440w.jpg)

然后这样就对了

![Image 5](https://pic1.zhimg.com/v2-272d0353626ff10a7f8392e7691b5056_1440w.jpg)

### 日志拆解

五轮各做了一件事，对应闭环的五步：

*   **第 1 轮 login**：用户消息里没有“登录”两个字，第一个工具却是 `login`，这是描述教的（§2.2 决定四）。`[工具→]` 的结果里没有 `access_token`，token 被摘进进程内存；但 `assignable_roles` 进了上下文，第 4 轮能填对 `role_id` 全靠它。
*   **第 2 轮搜人**：`keyword=张三` 是模型自己想到的（描述写了“不知道 user_id 时先用它搜人”），`user_id=u-1001` 从这一步的结果里来。
*   **第 3 轮查现状**：不是多余动作。“改角色前先看一眼现状”写在 `assign_role` 的描述里（读-改-写），也让第 5 轮的答复能说出“从 查看者 变更为 管理员”。
*   **第 4 轮写操作**：覆盖式分配后返回新角色清单，闭环完成。
*   **第 5 轮收尾**：无 `tool_calls` + `finish_reason=stop`，loop 的结构化终止判定与工具远近无关（第 7 篇 §2.3 原样生效）。

时序全景（agent 的 5 轮与后台的 4 次 HTTP 交互）：

```
用户         agent loop（终端 2）                        mock_backend（终端 1）
 │                │                                          │
 │ "把张三提升为    │ 第 1 轮：调 LLM（随请求发 4 个工具 schema）  │
 │  管理员"        │ ───────────> DeepSeek                     │
 ├───────────────>│ <───────────── login(admin/admin123)      │
 │                │   execute_tool → POST /api/v1/auth/login  │
 │                │ ─────────────────────────────────────────>│ 校验账号、签发 JWT
 │                │ <───────────────── {access_token, roles} ─│
 │                │   token 存进程内存；结果摘掉 token 再回填     │
 │                │ 第 2 轮：调 LLM（带上 login 结果）            │
 │                │ <───────────── get_users(keyword=张三)     │
 │                │   GET /api/v1/users?keyword=…（自动带 Bearer）│
 │                │ ─────────────────────────────────────────>│ 分页 + 模糊过滤
 │                │ <──────────── {users:[{user_id:u-1001}]} ─│
 │                │ 第 3 轮：… get_user_roles(u-1001)          │
 │                │   GET /api/v1/users/roles?user_id=…        │
 │                │ ─────────────────────────────────────────>│
 │                │ <──────────────────────── {roles:[查看者]} ─│
 │                │ 第 4 轮：… assign_role(u-1001, r-admin)     │
 │                │   POST /api/v1/users/roles（body 带 id）    │
 │                │ ─────────────────────────────────────────>│ 覆盖式写入
 │                │ <──────────────────────── {roles:[管理员]} ─│
 │                │ 第 5 轮：调 LLM → 无 tool_calls，stop       │
 │ "已完成：张三…   │                                           │
 │  管理员"        │                                           │
 │<───────────────┤                                           │
```

## 本篇结论

*   **最小目标服务**是百行 FastAPI 脚手架（内存数据、登录/搜用户/查角色/改角色四接口，`user_id` 走 query 或 body），是成熟方案路线 ① 的验证靶子。agent 只通过 HTTP 看后端、与后端语言解耦，真实 Go 后台落地在 P5·15 / P7，届时理论上只改 `BASE_URL`。真实系统若采用五接口（独立 `GET /roles`）或追加式幂等，映射规则不变：一个接口一个工具，描述写清语义与先后。
*   **工具设计模式**：登录即工具、token 只活进程内存（`login` 返回前摘除，不进 prompt 不进日志）、其余工具由统一 HTTP 出口 `_call` 自动注入 `Authorization`、描述即流程（“必须先登录”“覆盖式写操作”写在描述里，模型照着自己排步骤）。凭证纪律：演示账号可写描述，生产凭证从环境变量/密钥管理来。
*   **loop 一行核心逻辑未改**（注册件同形接口），四条错误兜底原样生效；`MAX_ITERATIONS` 建议 10~12，M2 主路径 5 轮余量充足。
*   **里程碑 M2 达成**：一句话闭环 `login → get_users → get_user_roles → assign_role → 答复`；401/404/连接失败三种边界都已被“结构化错误回喂”兜住。下一站第 9 篇：token 过期自动重登、4xx/5xx 分级、写操作二次确认。

## 参考

1.   FastAPI 官方文档 — First Steps / Body / Header Parameters — `FastAPI()`、`@app.get/@app.post` 路由装饰器、`BaseModel` 请求体、`Header` 参数声明（下划线自动转连字符）与非 Annotated 写法；Body 见 https://fastapi.tiangolo.com/tu torial/body/ ，Header 见 https://fastapi.tiangolo.com/tu torial/header-params/ 。
2.   FastAPI Tutorial — Security First Steps — 生产认证方向（OAuth2PasswordBearer / Security 依赖）；本篇脚手架用简化 Header 方案换取概念密度最低。
3.   PyJWT 官方文档 — Usage Examples — `jwt.encode(payload, key, algorithm="HS256")` / `jwt.decode(token, key, algorithms=[...])` 官方签名、`exp` 过期自动校验并抛 `jwt.ExpiredSignatureError` 的原文示例。
4.   RFC 7519 — JSON Web Token (JWT) — 三段式 `header.payload.signature` 结构、HS256、`exp`/`sub` 等 registered claims。
5.   Python 标准库 urllib.request — `Request`/`urlopen`、`HTTPError` 读响应体、`ProxyHandler` 与 opener 机制（§2.4 代理坑的修复依据）。
6.   uvicorn（PyPI） — `uvicorn main:app` 启动格式另见 FastAPI 部署文档 https://fastapi.tiangolo.com/de ployment/manually/ 。
7.   系列前序：第 1 篇（三方分工）、第 3 篇（五阶段、工具注册件、终止条件）、第 6 篇（urllib 裸 HTTP 写法、key 管理、超时重试）、第 7 篇（`agent/` 项目、schema 即 prompt、四条错误兜底）。

PS: 觉得不错的请关注，点赞，收藏吧！！ (ง・̀_・́)ง
