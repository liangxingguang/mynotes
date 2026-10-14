统计今日采集情况。

步骤：
1. 读取 `Index/index.json`，筛选 `created` 日期等于今天的笔记
2. 输出：
   - 总数
   - 来源平台分布（feishu / telegram）
   - 采集类型分布（link / text / voice / document）
   - `category` 与 `tags` 分布
   - 异常条目（`summary_status = partial` 的笔记）
3. 再列出当天笔记：`序号. 《标题》 #分类 — 一句话摘要`
4. 结尾提示：用 `/read 笔记名` 查看全文
5. 当天无采集时回复"今日暂无采集"
