# 多Agent 架构—任务看板（Team Agent）架构

## 一、引子

多智能体架构成为智能系统的主流架构，多智能体架构克服了单智能体架构的一些弊端：

*   **上下文污染问题：**Agent的聪明程度取决于大模型，大模型是有上下文长度限制，因此需通过**Agent维护上下文历史，便于随时调用大模型时将上下文信息传递给大模型，获取大模型正确反馈**。**模型知道什么，做什么样的决策，取决于它拿到了什么上下文**。面对复杂长时任务时，单智能体需维护一大堆混杂历史文本信息，将其送入 LLM 以期待靠模型聪明才智解决复杂任务。很显然模型的聪明程度还远远未达到这种程度。上下文污染问题导致模型分不清哪上下文信息是主要的该重点完成，哪些是中间结果该进行提炼压缩。这种上下文污染问题是基于单Agent架构的智能系统的瓶颈。
*   **模型上下文长度问题：**大模型上下文的限制在面度复杂长时任务时，由于大量的中间交互结果一起塞进模型上下文很容易将大模型上下文塞满，如果强行压缩或清楚又可能面临信息不足或任务丢失。
*   **协作问题：**多智能体之间可以进行协作交流，实现并行加速、互相协作，突破单智能体的能力上限。

基于多智能体架构的智能系统，在设计落地的过程中面临着**智能体拆分**和**架构选型**的问题。

## 二、多智能体系统设计

### 2.1 多智能体系统中智能体拆分原则

多智能体系统落地的第一步即是进行智能体拆分，然而如何进行智能体拆分？拆分的原则又是什么？很多人第一次接触多Agent，会自然地把它理解成一支"职业团队"，**按照角色进行拆分**。eg：数据库Agent、前端Agent、后端Agent，各自负责一个领域。

然而，**模型知道什么，首先取决于它拿到了什么上下文**；它能否给出高质量回答，也取决于上下文是否足够相关。因此，智能体的拆分原则为：**更有价值的切分方式不是给Agent贴职业标签，而是划分上下文边界和信息压缩边界**。

![Image 1](https://pica.zhimg.com/v2-ecab499272fd70788fcf26191956c9ca_1440w.jpg)

另外，多Agent的另一个现实收益，是可以把不同模型放在同一条协作链上。大模型通常更擅长长链路推理、复杂权衡和最终裁决，但代价是更高的延迟和调用成本；小模型响应很快，适合批量筛选、结构化提取和早期探索，却可能在开放式问题上失去细节。

**"大模型+小模型"混合原则**：一个更实际的组合是**让小模型负责"快"**：先扫描大量候选、提取字段、发现异常，把结果压缩成结构化线索；再**让大模型负责"深"**：基于这些线索补足上下文，比较方案，处理冲突，并对最终结果负责。模型之间不是简单的上下级替代关系，而是通过Agent边界把速度和质量组合起来。

当然，模型切换也会带来新的工程问题：小模型输出需要被校验，大模型需要知道结论的来源，预算和超时要有明确上限。只有把输出协议、证据引用和失败回退设计好，"大小模型协作"才不会变成一次不可解释的随机接力。

![Image 2](https://pic4.zhimg.com/v2-2dab7ed98c0dec65cae5c04691d560c1_1440w.jpg)

### 2.1 多智能体**架构**

多智能体系统另一个问题即是**采用何种架构**才能最大限度发挥多智能体之间的协同能力？

### **第一种：调度者-执行者（Orchestrator-Workers）架构**

让一个Master Agent负责理解用户意图，拆解任务，再将每一子任务路由给合适的Worker Agent。Worker Agent完成工作后把结果交回Master Agent，由Master Agent决定下一步并最终汇总。

调度者-执行者（Orchestrator-Workers）架构

![Image 3](https://pic1.zhimg.com/v2-960f5b550ddd9ae0ad4258ddfe51174e_1440w.jpg)

**调度者-执行者**架构优点在于：

*   **流程非常清楚**，谁先执行、谁后执行、哪些结果要传给下一个 Agent，都可以在一个地方观察和修改。权限、预算、超时和失败处理也更容易集中管理。对于流程固定、依赖明确的任务，这种确定性很有价值。

**调度者-执行者**问题：

*   任务变复杂后，Master Agent不仅要完成自己的推理，还要记住所有Worker Agent的状态、处理中间结果，并持续判断下一步应该路由给谁。久而久之，**Master Agent容易变成一个"超级Agent"**：既要理解业务，又要维护调度器、状态机和异常处理。
*   并行瓶颈：任务数量和并行度继续上升，让Master Agent逐个判断"下一步该叫谁"就会越来越沉重。

```
from typing import TypedDict, List, Annotated
from operator import add
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# ===================== 1. 定义状态结构 =====================
class SubTask(TypedDict):
    task_name: str
    task_prompt: str

class MasterState(TypedDict):
    user_query: str
    constraints: str
    subtasks: List[SubTask]
    worker_results: Annotated[List[dict], add]  # 累加所有worker返回结果
    finished: bool
    final_result: str

# Worker子任务单独状态
class WorkerState(TypedDict):
    task_name: str
    task_prompt: str
    user_origin_query: str

# ===================== 2. 初始化大模型 =====================
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ===================== 3. 定义各个Agent节点 =====================
def master_agent_node(state: MasterState):
    """
    Master Agent：理解用户请求、拆解任务；接收worker回传结果，决策回路
    对应图中【理解并拆解、分派目标、接收回传资料】
    """
    user_query = state["user_query"]
    constraints = state.get("constraints", "")
    worker_results = state.get("worker_results", [])

    if not worker_results:
        # 第一轮：拆解用户需求，生成要下发给3个worker的子任务
        prompt = f"""
        你是Master调度Agent，用户原始请求：{user_query}
        约束条件：{constraints}
        请拆分成3个子任务，分别交给：
        1. Research Agent：搜集相关资料、事实信息
        2. Analyst Agent：基于资料提炼核心观点、分析逻辑
        3. Writer Agent：负责最终文本结构、行文组织

        输出严格JSON格式，不要多余文字：
        [
          {{"task_name":"research","task_prompt":"xxx"}},
          {{"task_name":"analyst","task_prompt":"xxx"}},
          {{"task_name":"writer","task_prompt":"xxx"}}
        ]
        """
        resp = llm.invoke([HumanMessage(content=prompt)])
        import json
        subtasks = json.loads(resp.content)
        return {"subtasks": subtasks, "finished": False}
    else:
        # 收到worker回传资料 → 中心决策回路：判断是否足够，是否结束
        results_text = "\n".join([f"{r['agent']}: {r['content']}" for r in worker_results])
        judge_prompt = f"""
         【Master决策】
         用户请求：{user_query}
         已经收到所有worker返回结果：
         {results_text}

        判断：信息是否充足，可以直接汇总输出最终结果？
        如果充足，返回 YES；如果信息不足，需要继续补充调研返回 NO。
        只输出 YES / NO
        """
        judge = llm.invoke([HumanMessage(content=judge_prompt)]).content.strip()
        if judge == "YES":
            # 汇总校验，生成最终结果
            summary_prompt = f"""
             汇总下面所有Agent产出，输出一份完整、校验后的最终结果：
             {results_text}
              用户原始需求：{user_query}，约束：{constraints}
            """
            final = llm.invoke([HumanMessage(content=summary_prompt)]).content
            return {"finished": True, "final_result": final}
        else:
            # 信息不足，重新生成子任务再次派发（闭环回路，对应图上回传资料箭头）
            reprompt = f"""
             已有结果不足，重新生成补充子任务，同样3个agent分工：
             原始请求：{user_query}
             已有产出：{results_text}
             输出JSON数组，格式同上
           """
            import json
            new_subtasks = json.loads(llm.invoke([HumanMessage(content=reprompt)]).content)
            return {"subtasks": new_subtasks, "finished": False, "worker_results": []}

def route_to_workers(state: MasterState):
    """Master派发任务：并行Send到3个worker agent"""
    sends = []
    for st in state["subtasks"]:
        sends.append(Send(
            st["task_name"],
            WorkerState(
                task_name=st["task_name"],
                task_prompt=st["task_prompt"],
                user_origin_query=state["user_query"]
            )
        ))
    return sends

def research_agent(state: WorkerState):
    """Research Agent：搜集资料"""
    res = llm.invoke([
        SystemMessage(content="你是Research Agent，专注搜集事实、资料、背景信息。"),
        HumanMessage(content=state["task_prompt"])
    ])
    return {"worker_results": [{"agent": "research", "content": res.content}]}

def analyst_agent(state: WorkerState):
    """Analyst Agent：提炼观点、分析"""
    res = llm.invoke([
        SystemMessage(content="你是Analyst Agent，负责从信息中提炼观点、逻辑拆解、利弊分析。"),
        HumanMessage(content=state["task_prompt"])
    ])
    return {"worker_results": [{"agent": "analyst", "content": res.content}]}

def writer_agent(state: WorkerState):
    """Writer Agent：组织输出、润色成文"""
    res = llm.invoke([
        SystemMessage(content="你是Writer Agent，负责内容结构编排、语言组织、成文输出。"),
        HumanMessage(content=state["task_prompt"])
    ])
    return {"worker_results": [{"agent": "writer", "content": res.content}]}

# ===================== 4. 构建图，串联流程 =====================
builder = StateGraph(MasterState)
# 添加节点
builder.add_node("master", master_agent_node)
builder.add_node("research", research_agent)
builder.add_node("analyst", analyst_agent)
builder.add_node("writer", writer_agent)

# 入口先走master
builder.add_edge(START, "master")

# Master 动态分发到worker
builder.add_conditional_edges(
    "master",
    route_to_workers,
    ["research", "analyst", "writer"]
)

# 所有worker跑完，自动回到master（【回传资料】闭环！核心匹配流程图）
builder.add_edge(["research", "analyst", "writer"], "master")

# master判断完成则退出
def finish_router(state: MasterState):
    if state["finished"]:
        return END
    return "master"

builder.add_conditional_edges("master", finish_router)

graph = builder.compile()

# ===================== 5. 运行测试 =====================
if __name__ == "__main__":
    input_state = {
        "user_query": "写一份关于AI Agent在企业落地的简短调研报告",
        "constraints": "控制在800字以内，侧重落地难点",
        "subtasks": [],
        "worker_results": [],
        "finished": False,
        "final_result": ""
    }
    for step in graph.stream(input_state, stream_mode="values"):
        print("="*50)
        print(step)
    print("\n✅【最终结果】")
    print(step["final_result"])
```

### **第二种：任务看板架构（对应claude code中提出Agent team架构）**

**解决核心问题：任务看板解决的核心问题是任务如何分发给子Agent。**把"分配任务"这件事从Master Agent的内部推理中拿出来，放到一个所有Agent都能看到的任务看板上。看板记录待处理任务、负责人、依赖关系、执行状态和产出物。子Agent不再等待Master Agent点名，而是主动查看看板，领取自己有能力完成的任务。

**真正的难点在于协作协议**：两个Agent同时看到同一个任务时，谁能领取；领取任务的Agent崩溃后，任务怎样回收；一个任务完成后，怎样解除下游依赖；重复执行时，结果怎样保持幂等。

因此，看板通常需要配合任务状态机。任务可以从PENDING进入CLAIMED，再进入RUNNING，成功后变成SUCCEEDED，失败则进入FAILED或RETRYING。领取动作还需要锁或租约，状态变化需要留下历史记录，任务产出最好通过稳定的引用传递，而不是把所有内容塞进下一次提示词。

![Image 4](https://pic4.zhimg.com/v2-4653d3f1fda2dd394b71842e110de29d_1440w.jpg)

**优点：**

*   **智能体之间高度解耦**，Master 轻量化。
*   **增加并行能力和可靠性**：增加并行能力、弹性扩展和故障恢复能力；
*   **天然支持弹性、水平扩缩容（分布式友好）易于扩展**：新增一个Agent通常不需要改动一个巨大的路由器。
*   **任务状态中心化、可观测、可审计**：所有任务的状态、重试次数、依赖、产出、错误全部落在看板上。

这类架构更适合任务数量多、并行度高、执行时间长，或者需要断点恢复的系统，例如批量数据处理、代码仓库扫描、持续运行的研究任务和后台工作流。

**缺点：**

*   抢领逻辑带来竞态问题，必须处理租约（Lease）
*   轮询开销 + 延迟问题
*   调度是 "贪心抢单"，很难做全局最优调度
*   任务看板解决的是"工作怎样被领取"，但并不是每次协作都值得被建模成一项任务。有些时候，执行Agent已经知道该做什么，只是在关键判断上需要另一个视角。这就引出了第三种、更轻量的协作关系。

```
import uuid
from typing import TypedDict, List, Optional, Literal, Annotated
from operator import add
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# ===================== 1. 任务看板状态机定义（严格对齐你的图） =====================
TaskStatus = Literal["PENDING", "CLAIMED", "RUNNING", "SUCCEEDED", "RETRYING", "FAILED"]

class BoardTask(TypedDict):
    task_id: str
    name: str
    prompt: str
    capability: Literal["research", "analyst", "writer"]  # 谁能认领
    status: TaskStatus
    lease_owner: Optional[str]          # 租约持有者 agent name
    retry_count: int
    max_retry: int
    dependencies: List[str]             # 依赖其他task_id
    output: Optional[str]               # 产出物
    error: Optional[str]

class BoardState(TypedDict):
    user_request: str
    constraints: str
    task_board: List[BoardTask]
    finished_task_ids: Annotated[List[str], add]
    final_report: Optional[str]

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ===================== 2. Master Agent：只拆解、写看板，不分配（移除push派发） =====================
def master_planner(state: BoardState):
    """
    Master 不再点名派任务！
    职责：解析用户需求，拆成子任务，写入任务看板，状态全部初始 PENDING
    """
    if state["task_board"]:
        # 看板已经存在，master只做收尾校验：全部任务成功则汇总最终报告
        all_tasks = state["task_board"]
        all_done = all(t["status"] == "SUCCEEDED" for t in all_tasks)
        any_failed = any(t["status"] == "FAILED" for t in all_tasks)
        if all_done:
            contents = "\n".join([f"{t['name']}: {t['output']}" for t in all_tasks])
            final = llm.invoke([
                HumanMessage(f"""汇总下面所有任务产出，输出最终结果：
                用户请求：{state['user_request']}
                约束：{state['constraints']}
                任务产出：{contents}""")
            ]).content
            return {"final_report": final}
        if any_failed:
            return {"final_report": "任务执行失败，部分任务重试预算耗尽"}
        # 还有任务在跑，master原地，交给worker继续拉取看板
        return {}

    # 首次进入：拆解需求生成任务，写入看板
    prompt = f"""
用户请求：{state['user_request']}
约束：{state['constraints']}
拆分为3个子任务，分别对应能力标签：research / analyst / writer
research：搜集资料
analyst：提炼观点
writer：组织成文
输出JSON数组，字段：name, prompt, capability, max_retry(最大重试次数)
"""
    import json
    resp = llm.invoke([HumanMessage(content=prompt)])
    subtasks_raw = json.loads(resp.content)
    board_tasks: List[BoardTask] = []
    for item in subtasks_raw:
        board_tasks.append({
            "task_id": str(uuid.uuid4()),
            "name": item["name"],
            "prompt": item["prompt"],
            "capability": item["capability"],
            "status": "PENDING",
            "lease_owner": None,
            "retry_count": 0,
            "max_retry": item["max_retry"],
            "dependencies": [],
            "output": None,
            "error": None,
        })
    return {"task_board": board_tasks}

# ===================== 3. 公共看板工具函数：抢任务、更新状态机 =====================
def try_claim_task(board: List[BoardTask], agent_cap: str, agent_name: str) -> Optional[BoardTask]:
    """
    【认领逻辑】
    优先找：PENDING 或者 RETRYING，并且 capability匹配、无未完成依赖、无租约
    抢到后修改状态 → CLAIMED，打上租约持有者
    """
    for idx, t in enumerate(board):
        if t["capability"] != agent_cap:
            continue
        if t["status"] not in ("PENDING", "RETRYING"):
            continue
        # 依赖校验：所有依赖任务必须 SUCCEEDED
        deps_ok = all(
            any(bt["task_id"] == dep and bt["status"] == "SUCCEEDED" for bt in board)
            for dep in t["dependencies"]
        )
        if not deps_ok:
            continue
        # 抢到任务，更新状态 + 租约
        board[idx] = {
            **t,
            "status": "CLAIMED",
            "lease_owner": agent_name
        }
        return board[idx]
    return None

def update_task_status(board: List[BoardTask], task_id: str, new_status: TaskStatus,
                       output: str = None, error: str = None):
    for idx, t in enumerate(board):
        if t["task_id"] == task_id:
            updated = {**t, "status": new_status}
            if output is not None:
                updated["output"] = output
            if error is not None:
                updated["error"] = error
            if new_status == "RETRYING":
                updated["retry_count"] = t["retry_count"] + 1
                updated["lease_owner"] = None
                if updated["retry_count"] >= t["max_retry"]:
                    updated["status"] = "FAILED"
            board[idx] = updated
            break

# ===================== 4. Worker Agent（Pull模式：主动查看板认领任务） =====================
def research_worker(state: BoardState):
    """Research Agent：能力标签 research，主动拉看板抢任务"""
    board = state["task_board"]
    claimed = try_claim_task(board, agent_cap="research", agent_name="research")
    if not claimed:
        # 没有可认领任务 → 回到master，下一轮继续轮询看板
        return Command(goto="master_planner", update={"task_board": board})
    # 拿到租约，进入 RUNNING
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([
            SystemMessage(content="你是Research Agent，搜集事实资料。"),
            HumanMessage(content=claimed["prompt"])
        ])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        # 崩溃/超时 → RETRYING；重试次数超限自动变成 FAILED
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="master_planner", update={"task_board": board})

def analyst_worker(state: BoardState):
    """Analyst Agent：能力标签 analyst"""
    board = state["task_board"]
    claimed = try_claim_task(board, agent_cap="analyst", agent_name="analyst")
    if not claimed:
        return Command(goto="master_planner", update={"task_board": board})
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([
            SystemMessage(content="你是Analyst Agent，提炼观点、分析逻辑。"),
            HumanMessage(content=claimed["prompt"])
        ])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="master_planner", update={"task_board": board})

def writer_worker(state: BoardState):
    """Writer Agent：能力标签 writer"""
    board = state["task_board"]
    claimed = try_claim_task(board, agent_cap="writer", agent_name="writer")
    if not claimed:
        return Command(goto="master_planner", update={"task_board": board})
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([
            SystemMessage(content="你是Writer Agent，组织文本输出。"),
            HumanMessage(content=claimed["prompt"])
        ])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="master_planner", update={"task_board": board})

# ===================== 5. 构建 Pull 模式图（无预先Send推送！） =====================
builder = StateGraph(BoardState)
builder.add_node("master_planner", master_planner)
builder.add_node("research", research_worker)
builder.add_node("analyst", analyst_worker)
builder.add_node("writer", writer_worker)

builder.add_edge(START, "master_planner")

# Master 之后，三个worker并行轮询看板抢任务
builder.add_conditional_edges(
    "master_planner",
    lambda s: END if s.get("final_report") else ["research", "analyst", "writer"]
)

graph = builder.compile()

# ===================== 6. 测试运行 =====================
if __name__ == "__main__":
    input_state = {
        "user_request": "写一份AI Agent在企业落地调研报告",
        "constraints": "800字以内，重点落地痛点",
        "task_board": [],
        "finished_task_ids": [],
        "final_report": None
    }
    for step in graph.stream(input_state, stream_mode="values"):
        print("===== Step =====")
        print("看板任务列表：")
        for t in step["task_board"]:
            print(f"- {t['name']} | status={t['status']} | lease={t['lease_owner']} | retry={t['retry_count']}/{t['max_retry']}")
        if step.get("final_report"):
            print("\n✅【最终输出】")
            print(step["final_report"])
```

### 第三种：Advisor架构

Advisor架构解决问题是，Agent在执行过程中遇到高风险判断、专业盲区或方案分歧时，它主动向另一个 Agent 征求意见。与Agent内部的人在环路有一些相似之处，但也有区别。Advisor自动给出意见，不截断流程。

Advisor不负责接管任务，也不负责替执行Agent调用工具。它提供的是第二意见：可以是安全评估、架构审查、领域知识补充，也可以是对当前计划的反驳。最终是否采纳建议，仍然由执行Agent决定。

**Advisor模式的方向和Master Agent模式正好相反**。Master Agent是中心节点调用Worker Agent；Advisor是执行节点调用咨询者。这个变化看起来只是一次工具调用，**实际上改变了系统的责任边界：执行Agent保持完整上下文和主流程，Advisor只在局部决策上提供额外认知**。

比如Coding Agent正在修改支付模块，发现自己的方案可能影响幂等性和事务边界。它可以把当前设计、相关代码和具体疑问发给Architecture Advisor。Advisor给出风险提示和替代方案，Coding Agent再结合测试结果决定是否调整。Advisor不需要知道整个项目的所有历史，也不需要拥有直接改代码的权限。

![Image 5](https://pic2.zhimg.com/v2-1537006a67fe226295e318c97566bfef_1440w.jpg)

**这种模式感觉用处不大，不如claude code提出的生成器-验证器架构实用，因此不做过多论述。**

### 三次反转：控制权下沉

把三种架构放在一起，最清楚的不是组件数量，而是控制权的变化。

![Image 6](https://pic3.zhimg.com/v2-2a2d2d859e9bd490e513dd851df0d3e8_1440w.jpg)

可以把它们理解成三种不同的组织哲学。Master Agent会说："我告诉你做什么。"任务看板会说："你看看现在什么任务可以做。"Advisor则会说："你自己推进，需要时我给你建议。"

![Image 7](https://pic2.zhimg.com/v2-b9b83e1137fa3e3fc9c3958963678301_1440w.jpg)

## 三、案例

### Master Agent：意图与路由

入口Master Agent先提取用户要求的组件、时间窗口和关注点，再将任务交给对应的Inspector Agent。它只需要知道各Inspector Agent对外的能力描述、输入要求和调用入口；指标目录、目标发现、任务拆分和分析方法，都由Inspector Agent自己管理。

这里把入口的中心职责限定在组件级路由：Master Agent不逐个跟踪分析批次，组件内的规划、证据汇总和完整性检查由Inspector Agent承担。组件报告返回后，Master Agent保持各组件的事实边界，整理最终结果。下层指标、工具和分组策略的变化，都可以留在组件巡检单元内。

![Image 8](https://picx.zhimg.com/v2-b00ccae21ab02960a5e55c61125cd96d_1440w.jpg)

### 任务看板：并行与自愈

进入组件内部，Inspector Agent根据指标目录和完整目标集合，将工作拆成"指标＋目标批次＋时间窗口"的独立任务。在共享看板的演进方案中，Inspector Agent负责发布分析目标，多个Worker Agent根据能力和空闲容量并行领取任务，执行进度和结果都通过看板汇合。

Worker Agent调用确定性统计工具计算峰值、阈值超限和已观测持续时长，再提交精简证据：异常对象保留必要明细，正常对象压缩为汇总。原始时序留在工具层，Inspector Agent根据这些证据核对异常及覆盖范围。

假设一个Worker Agent在执行中途退出，已完成批次的证据仍保留在看板上。中断任务的租约到期后，由其他Worker Agent接手；配合有限重试和幂等提交，只补做未完成的批次。这样可以维持并行处理，并从局部中断中恢复，避免整轮重跑。

Inspector Agent最终核对任务覆盖范围，并区分当前异常、窗口内已恢复和数据不足。达到总体截止时间仍未完成的范围，会作为限制写进报告；**没有数据的目标也会明确标注，避免形成"没有发现异常，所以一切正常"的误判**。

![Image 9](https://pic1.zhimg.com/v2-4cff8bffe455bd8fb03a3986fcccf9b4_1440w.jpg)

### Advisor：按需咨询

汇总证据后，Inspector Agent先判断是否仍有待解释的问题。对于短时越线后已恢复、且证据足以支持结论的情况，可以直接说明状态和限制；当关联指标难以解释、可能原因存在分歧，或需要额外领域知识时，再向 根因分析顾问（RCA Advisor）提交具体疑问。

例如，Inspector Agent可以把同一窗口内的异常对象、峰值、持续情况和关联指标一起提交，询问流量变化是否足以解释资源压力。Advisor返回可能原因及验证方向："两者在时间上接近，建议结合对应时段的运行日志进一步验证，当前证据不足以确认具体根因。"

Inspector Agent负责核对和采纳建议，在报告中保留"可能""待验证"等不确定性。Advisor超时或失败时，仍输出已有证据支持的基础结论；能够自行解释的问题则直接成稿，控制咨询成本。

最终交到用户手里的仍是一份按组件归纳的报告：当前异常、恢复情况、数据限制和必要的排查建议。协作细节留在系统内部，报告中的每项结论都能回到对应的任务证据。

## 结语：匹配控制权

多Agent架构系统的架构模式逐渐丰富起来，构建可靠可信Agent架构仍然是目前做落地产品的难点。随着技术的进步，其核心架构已经由**调度者-执行者（Orchestrator-Workers）架构**过度到**任务看板架构（对应claude code中提出Agent team架构）。**主要目标是减轻Master Agent的压力。

之前还有有人提出过双Master架构，其本质依然是任务看板架构的改进。

**结论：任务看板架构已然成为工业落地中重要核心架构之一。**

**附录：双Master架构**

```
import uuid
from typing import TypedDict, List, Optional, Literal, Annotated
from operator import add
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

TaskStatus = Literal["PENDING", "CLAIMED", "RUNNING", "SUCCEEDED", "RETRYING", "FAILED"]

class BoardTask(TypedDict):
    task_id: str
    name: str
    prompt: str
    capability: Literal["research", "analyst", "writer"]
    status: TaskStatus
    lease_owner: Optional[str]
    lease_expire_at: Optional[int]  # 租约超时时间戳
    retry_count: int
    max_retry: int
    priority: int
    dependencies: List[str]
    output: Optional[str]
    error: Optional[str]

class BoardState(TypedDict):
    user_request: str
    constraints: str
    task_board: List[BoardTask]
    final_report: Optional[str]

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ===================== 1. Planner Master：规划Master，只拆解任务，不调度 =====================
def planner_master(state: BoardState):
    """
    Planner Master：
    职责：接收用户原始请求，拆解成子任务DAG，写入看板，状态PENDING
    禁止：回收租约、修改任务状态、判断流程结束
    只有看板为空的时候才执行拆解；看板已有任务直接放行
    """
    if state["task_board"]:
        # 已经存在任务，Planner不做任何操作，交给调度Master
        return {}

    prompt = f"""
用户需求：{state['user_request']}
约束：{state['constraints']}
拆分为3个子任务：research（搜集资料）、analyst（提炼观点）、writer（组织成文）
输出JSON数组，字段：name, prompt, capability, max_retry, priority(1-5越高越优先), dependencies=[]
"""
    import json
    resp = llm.invoke([HumanMessage(content=prompt)])
    subtasks_raw = json.loads(resp.content)
    board_tasks: List[BoardTask] = []
    for item in subtasks_raw:
        board_tasks.append({
            "task_id": str(uuid.uuid4()),
            "name": item["name"],
            "prompt": item["prompt"],
            "capability": item["capability"],
            "status": "PENDING",
            "lease_owner": None,
            "lease_expire_at": None,
            "retry_count": 0,
            "max_retry": item["max_retry"],
            "priority": item["priority"],
            "dependencies": item["dependencies"],
            "output": None,
            "error": None,
        })
    return {"task_board": board_tasks}

# ===================== 2. Scheduler Master：调度Master，只做全局调度&巡检，不拆任务 =====================
def scheduler_master(state: BoardState):
    """
    Scheduler Master【核心调度中枢】
    职责：
    1. 租约超时回收：卡在CLAIMED/RUNNING 超时 → 释放租约，退回RETRYING
    2. 依赖校验：只有上游全部SUCCEEDED，下游任务才保持可认领
    3. 重试熔断：retry_count >= max_retry 设置为 FAILED
    4. 全局进度判断：全部成功则汇总输出；存在失败则标记失败
    5. 优先级排序（可选：给Worker认领提供优先级顺序）
    禁止：创建新任务
    """
    import time
    now = int(time.time())
    board = state["task_board"]
    changed = False

    for idx, t in enumerate(board):
        # 规则1：租约超时回收（僵死任务释放）
        if t["status"] in ("CLAIMED", "RUNNING") and t["lease_expire_at"] and now > t["lease_expire_at"]:
            changed = True
            new_retry = t["retry_count"] + 1
            if new_retry >= t["max_retry"]:
                board[idx] = {**t, "status": "FAILED", "lease_owner": None}
            else:
                board[idx] = {
                    **t,
                    "status": "RETRYING",
                    "lease_owner": None,
                    "lease_expire_at": None,
                    "retry_count": new_retry,
                    "error": "租约超时释放"
                }

    # 判断全局终止条件
    all_succ = all(t["status"] == "SUCCEEDED" for t in board)
    any_fail = all(t["status"] == "FAILED" for t in board) or any(t["status"] == "FAILED" for t in board)

    if all_succ:
        contents = "\n".join([f"{t['name']}: {t['output']}" for t in board])
        final = llm.invoke([
            HumanMessage(f"""汇总结果：
用户请求：{state['user_request']}
约束：{state['constraints']}
各任务产出：{contents}""")
        ]).content
        return {"task_board": board, "final_report": final}
    if any_fail:
        return {"task_board": board, "final_report": "流程失败：部分任务重试预算耗尽"}

    if changed:
        return {"task_board": board}
    return {}

# ===================== 3. 看板工具函数：认领、更新状态 =====================
def try_claim_task(board: List[BoardTask], agent_cap: str, agent_name: str, lease_ttl=60) -> Optional[BoardTask]:
    import time
    now = int(time.time())
    # 优先高优先级任务
    candidates = sorted(
        [t for t in board if t["capability"] == agent_cap and t["status"] in ("PENDING", "RETRYING")],
        key=lambda x: -x["priority"]
    )
    for t in candidates:
        # 依赖校验
        deps_ok = all(
            any(bt["task_id"] == dep and bt["status"] == "SUCCEEDED" for bt in board)
            for dep in t["dependencies"]
        )
        if not deps_ok:
            continue
        # 抢到任务
        idx = board.index(t)
        board[idx] = {
            **t,
            "status": "CLAIMED",
            "lease_owner": agent_name,
            "lease_expire_at": now + lease_ttl
        }
        return board[idx]
    return None

def update_task_status(board: List[BoardTask], task_id: str, new_status: TaskStatus, output=None, error=None):
    for idx, t in enumerate(board):
        if t["task_id"] == task_id:
            up = {**t, "status": new_status, "lease_owner": None, "lease_expire_at": None}
            if output is not None:
                up["output"] = output
            if error is not None:
                up["error"] = error
            if new_status == "RETRYING":
                up["retry_count"] = t["retry_count"] + 1
                if up["retry_count"] >= t["max_retry"]:
                    up["status"] = "FAILED"
            board[idx] = up
            break

# ===================== 4. Worker Agent Pull 认领 =====================
def research_worker(state: BoardState):
    board = state["task_board"]
    claimed = try_claim_task(board, "research", "research")
    if not claimed:
        return Command(goto="scheduler_master", update={"task_board": board})
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([SystemMessage("你是Research Agent，搜集资料"), HumanMessage(claimed["prompt"])])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="scheduler_master", update={"task_board": board})

def analyst_worker(state: BoardState):
    board = state["task_board"]
    claimed = try_claim_task(board, "analyst", "analyst")
    if not claimed:
        return Command(goto="scheduler_master", update={"task_board": board})
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([SystemMessage("你是Analyst Agent，提炼观点"), HumanMessage(claimed["prompt"])])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="scheduler_master", update={"task_board": board})

def writer_worker(state: BoardState):
    board = state["task_board"]
    claimed = try_claim_task(board, "writer", "writer")
    if not claimed:
        return Command(goto="scheduler_master", update={"task_board": board})
    if not claimed:
        return Command(goto="scheduler_master", update={"task_board": board})
    update_task_status(board, claimed["task_id"], "RUNNING")
    try:
        res = llm.invoke([SystemMessage("你是Writer Agent，组织成文"), HumanMessage(claimed["prompt"])])
        update_task_status(board, claimed["task_id"], "SUCCEEDED", output=res.content)
    except Exception as e:
        update_task_status(board, claimed["task_id"], "RETRYING", error=str(e))
    return Command(goto="scheduler_master", update={"task_board": board})

# ===================== 5. 构建图链路：Planner → Scheduler → Workers =====================
builder = StateGraph(BoardState)
builder.add_node("planner_master", planner_master)
builder.add_node("scheduler_master", scheduler_master)
builder.add_node("research", research_worker)
builder.add_node("analyst", analyst_worker)
builder.add_node("writer", writer_worker)

builder.add_edge(START, "planner_master")
builder.add_edge("planner_master", "scheduler_master")

# Scheduler巡检完成，如果没有结束，并行拉起所有Worker抢任务
builder.add_conditional_edges(
    "scheduler_master",
    lambda s: END if s.get("final_report") else ["research", "analyst", "writer"]
)

graph = builder.compile()

# ===================== 测试运行 =====================
if __name__ == "__main__":
    input_state = {
        "user_request": "写一份AI Agent在企业落地调研报告",
        "constraints": "800字内，重点落地痛点",
        "task_board": [],
        "final_report": None
    }
    for step in graph.stream(input_state, stream_mode="values"):
        print("==== Step ====")
        for t in step["task_board"]:
            print(f"{t['name']} | status={t['status']} | lease={t['lease_owner']} | retry={t['retry_count']}/{t['max_retry']}")
        if step.get("final_report"):
            print("\n✅ Final:")
            print(step["final_report"])
```

## 参考文献

[多 Agent 架构的三次反转：从中心调度到自驱协作｜得物技术](https://zhuanlan.zhihu.com/p/2101327478371382109)

---

- 原文链接：https://zhuanlan.zhihu.com/p/2103331588243248111
- 抓取方式：web-fetch（jina 兜底），已还原 zhida 实体词链接
