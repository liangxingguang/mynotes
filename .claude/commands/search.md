在知识库中检索：$ARGUMENTS

步骤：
1. 读取 `Index/index.json`，按关键词匹配 `title`、`tags`、`category`、`summary`
2. 需要正文细节时，再按 `path` 读取对应单篇
3. 最多返回 10 条，格式：`序号. 《标题》 #分类 — 一句话摘要`
4. 结尾提示：用 `/read 笔记名` 查看全文
5. 无结果时回复"未找到相关笔记"
