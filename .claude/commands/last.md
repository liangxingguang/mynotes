列出最近新增的笔记：$ARGUMENTS

$ARGUMENTS 为空时默认 5 条。

步骤：
1. 读取 `Index/index.json`，按 `created` 倒序取前 N 条
2. 格式：`序号. 《标题》 #分类 · 类型 · 来源平台 — created 时间`
3. 结尾提示：用 `/read 笔记名` 查看全文
