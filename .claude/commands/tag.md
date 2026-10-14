按标签筛选笔记：$ARGUMENTS

步骤：
1. 读取 `Index/tags.json`，先按 `aliases` 把输入归一到 `name`
2. 读取 `Index/index.json`，筛选 `tags` 或 `category` 命中者
3. 最多返回 10 条：`序号. 《标题》 #分类 — 一句话摘要`
4. 标签不存在时，提示 3 个相近的 active 标签
5. 结尾提示：用 `/read 笔记名` 查看全文
