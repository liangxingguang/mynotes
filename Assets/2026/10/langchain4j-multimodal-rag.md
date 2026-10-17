# 13-Java RAG | LangChain4j：多模态图片+表格检索

> 来源：https://mp.weixin.qq.com/s/AJmVoaODjF5SAzPQnJF72Q
> 抓取时间：2026-10-17（fetch_level: browser）

产品手册 200 张图，RAG 只吃进文字，80% 的知识被扔掉了。

这不是夸张。笔者最近帮一家制造企业做知识库，他们的设备维护手册有 300 多页，其中**超过 40% 的内容是图片**：设备结构图、故障指示灯含义表、操作步骤截图、接线示意图。用传统的 RAG 管线处理完，这些图片全部被丢弃，只剩下纯文本段落。结果用户问 "这个指示灯闪红灯是什么意思"，系统答不上来 -- 因为答案在那张被丢掉的图片里。

企业文档从来不只有文字。产品规格表是表格，架构图是图片，流程图是示意图，现场照片是实物记录。如果你的 RAG 系统只能处理纯文本，那它只理解了文档的一小部分。

**多模态 RAG (Multimodal RAG)** 就是来解决这个问题的。它让 RAG 系统不仅能检索文字，还能检索图片、理解表格、甚至跨模态问答 -- 用户用文字提问，系统从图片中找到答案。本文将手把手带你用 **LangChain4j** 实现两种多模态 RAG 方案，并解决表格理解的工程难题。

## 一、多模态 RAG 的挑战：企业文档里到底有什么

在讨论方案之前，先搞清楚一个事实：企业文档的内容分布，远比我们想象的复杂。

### 1.1 企业文档的内容构成

笔者统计了 10 个真实企业文档项目的内容类型分布，发现图片、表格、示意图等非纯文本内容平均占比超过 40%，在技术手册和产品文档中甚至达到 60%。

| 文档类型 | 纯文本 | 图片/图表 | 表格 | 典型场景 |
|---|---|---|---|---|
| 产品手册 | 35% | 40% | 25% | 产品功能说明、操作截图、规格参数表 |
| 设备维护手册 | 30% | 45% | 25% | 结构图、故障排查表、接线示意图 |
| 技术白皮书 | 55% | 25% | 20% | 架构图、性能对比表、流程图 |
| 财务报告 | 25% | 15% | 60% | 财务报表、趋势图、审计数据表 |
| 培训材料 | 40% | 35% | 25% | 操作截图、流程图、考核表格 |

### 1.2 传统 RAG 管线的盲区

传统 RAG 管线的工作流程是：PDF/Word 解析 -> 文本分块 -> 文本 Embedding -> 向量存储 -> 文本检索 -> LLM 生成。这条管线有一个根本性的假设：**所有有价值的信息都以文本形式存在**。

当遇到图片时，大多数文档解析器直接跳过。当遇到表格时，解析器把表格 "拍平" 成纯文本，丢失了行列结构和表头信息。最终进入向量数据库的，只有那些 "恰好是纯文本段落" 的内容。

举个真实案例

企业的故障排查手册有一张表格：第一列是故障代码 (E01-E99)，第二列是故障描述，第三列是解决方案。这张表格包含了 99 个常见故障的完整排查指南。但经过传统 RAG 管线处理后，表格变成了 "E01 电机过热 检查冷却系统 E02 电压异常 检查电源..." 这样一串没有结构的文字，检索准确率从 95% 暴跌到 40%。

要解决这些问题，我们需要一条**多模态 RAG 管线**：它能处理图片、理解表格、并在统一的向量空间中检索所有模态的内容。

## 二、LangChain4j 多模态 Embedding 支持

LangChain4j 从 1.x 版本开始支持多模态 Embedding。所谓多模态 Embedding，是指同一个模型能将图片和文本映射到同一个向量空间，使得 "一张设备的照片" 和 "这台设备的文字描述" 在向量空间中的距离很近。

### 2.1 支持多模态 Embedding 的模型

| 模型 | 厂商 | 向量维度 | 图片支持 | 特点 |
|---|---|---|---|---|
| Cohere Embed v4 | Cohere | 1024 | JPEG/PNG/WEBP | 原生多模态，文本+图片同一向量空间，支持 128 种语言 |
| Voyage AI Multimodal | Voyage AI | 1024 | JPEG/PNG | 图片+文本混合检索，适合文档场景 |
| Gemini Embedding | Google | 3072 | JPEG/PNG/WEBP/GIF | 多模态原生支持，向量维度大，精度高 |

### 2.2 LangChain4j 中的 ImageContent

在 LangChain4j 中，图片内容通过 `ImageContent` 类表示。它支持 URL 引用和 Base64 编码两种方式。

```java
// ImageContent 的两种创建方式
// 方式 1：通过 URI 引用远程图片
ImageContent urlImage = ImageContent.from(
    URI.create("https://example.com/device-photo.jpg"));

// 方式 2：通过 Base64 编码嵌入本地图片
byte[] imageBytes = Files.readAllBytes(Path.of("device-photo.jpg"));
String base64 = Base64.getEncoder().encodeToString(imageBytes);
ImageContent base64Image = ImageContent.from(base64, "image/jpeg");

// 方式 3：通过 Path 创建
ImageContent streamImage = ImageContent.from(Path.of("product-manual-diagram.png"), "image/png");
```

有了 `ImageContent`，我们就可以把图片送入支持多模态的 Embedding 模型，得到和图片语义对应的向量。

## 三、方案一：图片描述法 (Image Captioning)

第一种方案思路简单直接：**用视觉语言模型 (VLM) 给每张图片生成一段文字描述，然后把描述文本当作普通文本进入 RAG 管线**。图片本身不需要进入向量数据库，它的 "文字替身" 就够了。

### 3.1 工作原理

图片描述法的核心流程分三步：

**Step 1：提取图片** -- 从 PDF/Word 文档中提取所有嵌入的图片。

**Step 2：生成描述** -- 用 GPT-4o / Qwen-VL 等 VLM 为每张图片生成一段详细的文字描述。

**Step 3：文本入链** -- 把描述文本和原始文档的文本段落一起分块、Embedding、存入向量数据库。

检索时，用户用文字提问，系统检索的是图片的描述文本。命中后，可以把原始图片作为上下文附件返回给 LLM。

### 3.2 用 LangChain4j 实现图片描述生成

LangChain4j 支持多种视觉语言模型。下面演示如何用 GPT-4o 为图片生成描述。

```java
// 图片描述生成器
public class ImageCaptioner {
    private final ChatModel vlm;

    public ImageCaptioner() {
        this.vlm = OpenAiChatModel.builder()
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .modelName("gpt-4o")
                .temperature(0.1)
                .build();
    }

    /**
     * 为图片生成详细的中文描述
     * 描述会作为图片在 RAG 管线中的 "文字替身"
     */
    public String captionize(ImageContent image, String context) {
        // 构建多模态 Prompt：文字指令 + 图片
        String prompt = """
            你是一个技术文档图片分析专家。请仔细观察这张图片，
            生成一段详细的中文描述，用于知识库检索。
            描述要求：
            1. 准确描述图片中的关键信息（物体、文字、数字、颜色）
            2. 如果是表格，描述表头和每行的关键数据
            3. 如果是图表，描述趋势和关键数据点
            4. 如果是示意图，描述各组件及其关系
            5. 控制在 200 字以内
            文档上下文：%s
            """.formatted(context);

        // 发送多模态请求：文本 + 图片
        return vlm.chat(
            List.of(
                UserMessage.from(
                    TextContent.from(prompt),
                    image
                )
            )
        ).aiMessage().text();
    }
}
```

### 3.3 将图片描述注入 RAG 管线

生成描述后，需要把它和原始文本段落一起送入 RAG 管线。关键是在 Metadata 中标记这是图片描述，并关联原始图片的文件路径。

```java
// 将图片描述注入 RAG 管线
public void ingestWithCaptions(
        List<Document> documents,
        EmbeddingStore<TextSegment> store,
        EmbeddingModel embeddingModel) {

    ImageCaptioner captioner = new ImageCaptioner();
    List<TextSegment> allSegments = new ArrayList<>();

    for (Document doc : documents) {
        // 1. 常规文本分块
        List<TextSegment> textSegments = DocumentSplitters
                .recursive(300, 50)
                .split(doc);
        allSegments.addAll(textSegments);

        // 2. 提取文档中的图片并生成描述
        List<ImageContent> images = extractImages(doc);
        for (int i = 0; i < images.size(); i++) {
            ImageContent image = images.get(i);

            // 用 VLM 生成图片描述
            String caption = captioner.captionize(
                image,
                doc.metadata().getString("filename")
            );

            // 创建带 Metadata 的 TextSegment
            TextSegment captionSegment = TextSegment.from(
                caption,
                Metadata.from("source", doc.metadata().getString("filename"))
                        .put("type", "image_caption")
                        .put("image_index", String.valueOf(i))
                        .put("image_path", saveImage(image))
            );
            allSegments.add(captionSegment);
        }
    }

    // 3. 统一 Embedding 并存储
    List<Embedding> embeddings = embeddingModel.embedAll(allSegments)
            .content();
    store.addAll(embeddings, allSegments);

    System.out.println("已入库 " + allSegments.size() + " 个片段" +
        " (含 " + allSegments.stream()
            .filter(s -> "image_caption".equals(s.metadata().getString("type")))
            .count() + " 个图片描述)");
}
```

这种方案的好处是**完全复用现有的文本 RAG 管线**，不需要更换 Embedding 模型或向量数据库。缺点是描述质量完全依赖 VLM 的能力 -- 如果 VLM "看走眼" 了，描述不准确，检索就会失败。

## 四、方案二：多模态向量法

第二种方案更激进：**直接把图片送入多模态 Embedding 模型，得到图片向量，和文本向量存在同一个向量空间里**。检索时，用户的文字查询和图片向量直接做相似度匹配，不需要任何中间描述。

### 4.1 工作原理

多模态向量法的核心在于使用一个**原生多模态 Embedding 模型**，如 Cohere Embed v4。这个模型同时接受文本和图片作为输入，输出的向量在同一个空间中。也就是说，"一台红色设备正面照" 的向量，和 "红色设备正面" 这段文字的向量，在空间中是相邻的。

### 4.2 用 Cohere Embed v4 实现多模态 Embedding

Cohere Embed v4 是目前最成熟的原生多模态 Embedding 模型之一。LangChain4j 通过 `langchain4j-cohere` 模块提供了开箱即用的支持。

```java
// Cohere Embed v4 多模态 Embedding
// 1. 创建多模态 Embedding 模型
EmbeddingModel cohereEmbed = CohereEmbeddingModel.builder()
        .apiKey(System.getenv("COHERE_API_KEY"))
        .modelName("embed-v4.0")    // Cohere Embed v4
        .build();

// 2. 文本 Embedding（和之前一样）
Embedding textEmbedding = cohereEmbed
        .embed("一台红色工业设备的正面照片，型号 XR-500")
        .content();

// 3. 图片 Embedding（通过 ImageContent 封装）
byte[] imageBytes = Files.readAllBytes(
        Path.of("device-photo.jpg"));
String base64 = Base64.getEncoder().encodeToString(imageBytes);
Embedding imageEmbedding = cohereEmbed.embed(
    List.of(ImageContent.from(base64, "image/jpeg"))
).content().get(0);

// 4. 文本和图片在同一向量空间
// 计算相似度：文字描述 vs 实际图片
import dev.langchain4j.store.embedding.CosineSimilarity;
double similarity = CosineSimilarity.between(textEmbedding, imageEmbedding);
System.out.println("文本-图片相似度: " + similarity);
// 输出: 文本-图片相似度: 0.87（语义相近，相似度很高）
```

### 4.3 多模态检索：文字问，图片答

把文本和图片的 Embedding 存入同一个向量数据库后，就可以实现跨模态检索了。用户输入文字问题，系统返回最匹配的图片。

```java
// 多模态入库：文本和图片混合存储
public void ingestMultimodal(
        EmbeddingStore<TextSegment> store,
        EmbeddingModel cohereEmbed) {

    List<TextSegment> segments = new ArrayList<>();
    List<Embedding> embeddings = new ArrayList<>();

    // 文本段落
    TextSegment textSeg = TextSegment.from(
        "XR-500 设备正面配有红色指示灯和散热格栅",
        Metadata.from("type", "text")
                .put("source", "product-manual.pdf")
    );
    segments.add(textSeg);
    embeddings.add(cohereEmbed.embed(textSeg.text()).content());

    // 图片（通过 ImageContent 封装后 Embedding）
    byte[] imageBytes = Files.readAllBytes(
            Path.of("xr500-front.jpg"));
    TextSegment imageSeg = TextSegment.from(
        "[图片] XR-500 设备正面照",
        Metadata.from("type", "image")
                .put("source", "product-manual.pdf")
                .put("image_path", "xr500-front.jpg")
    );
    segments.add(imageSeg);
    String imgBase64 = Base64.getEncoder().encodeToString(imageBytes);
    embeddings.add(cohereEmbed.embed(
        List.of(ImageContent.from(imgBase64, "image/jpeg"))
    ).content().get(0));

    // 统一存入向量数据库
    store.addAll(embeddings, segments);
}

// 跨模态检索：文字提问，返回图片
public List<TextSegment> searchMultimodal(String query) {
    Embedding queryEmbedding = cohereEmbed.embed(query).content();
    EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
            .queryEmbedding(queryEmbedding)
            .maxResults(5)
            .build();

    EmbeddingSearchResult<TextSegment> result = store.search(request);
    List<EmbeddingMatch<TextSegment>> results = result.matches();

    return results.stream()
            .map(match -> {
                String type = match.embedded().metadata().getString("type");
                if ("image".equals(type)) {
                    // 命中图片，返回原始图片路径
                    String imagePath = match.embedded().metadata()
                            .getString("image_path");
                    return TextSegment.from("找到匹配图片: " + imagePath,
                            match.embedded().metadata());
                }
                return match.embedded();
            })
            .toList();
}
```

这种方案的核心优势是**无损保留图片语义**。不需要 VLM "翻译" 图片，多模态 Embedding 模型直接理解图片内容。但代价是需要使用多模态 Embedding 模型，调用成本比纯文本模型高。

## 五、两种方案对比：怎么选

两种方案各有优劣，选择取决于你的具体场景。下面从 6 个维度做全面对比。

### 5.1 六维度全面对比

| 对比维度 | 图片描述法 | 多模态向量法 |
|---|---|---|
| Embedding 模型 | 任意文本模型 | 多模态模型 (Cohere v4) |
| 入库成本 | 高 (VLM 描述费用) | 中 (多模态 Embedding 费用) |
| 检索成本 | 低 (纯文本检索) | 低 (向量检索) |
| 信息保真度 | 中 (依赖 VLM 描述质量) | 高 (直接编码图片语义) |
| 可解释性 | 高 (描述可读可审) | 低 (向量不可读) |
| 适用场景 | 图片少、需人工审核描述 | 图片多、需高精度检索 |

### 5.2 选型建议

**图片描述法**适合图片数量少 (100 张以内)、需要人工审核描述质量的场景，比如法规文件中的签章图片。**多模态向量法**适合图片数量大、对检索精度要求高的场景，比如产品手册、设备维护手册。如果预算允许，**两种方案可以叠加使用**：用多模态向量做主检索，用图片描述做辅助过滤和可解释性补充。

## 六、表格理解：RAG 最容易翻车的环节

如果说图片是多模态 RAG 的 "高级挑战"，那表格就是 "基础挑战" -- 几乎所有 RAG 系统都会遇到表格，但绝大多数系统处理表格的方式都是错的。

### 6.1 表格处理的 3 个常见错误

错误 1：表格拍平为纯文本

把表格的每一行拼成一句 "表头1: 值1, 表头2: 值2"。问题是一旦表格跨页，表头信息丢失，后面的行就变成了无意义的数字堆砌。

错误 2：表格被当作文本段落分块

递归分块器不知道表格的边界，可能从表格中间切断。一个 10 行的表格被切成两个 chunk，第一个 chunk 有表头但没有数据，第二个 chunk 有数据但没有表头。

错误 3：Markdown 格式直接 Embedding

把表格转成 Markdown 格式 (| 列1 | 列2 |) 然后 Embedding。Markdown 的分隔符 (|、-) 会干扰 Embedding 模型的语义理解，检索效果不如结构化描述。

### 6.2 正确的表格处理策略

正确的做法是把表格当作一个独立的结构化单元来处理，保留表头和行列关系。下面是一个表格提取和分块的工具类。

```java
// 表格提取与分块工具类
public class TableChunker {

    /**
     * 将表格转为适合 Embedding 的文本片段
     * 关键：每个 chunk 都包含完整表头
     */
    public static List<TextSegment> chunkTable(
            String[][] table,
            Metadata tableMetadata) {

        if (table.length < 2) return List.of();

        // 第一行是表头
        String[] headers = table[0];
        List<TextSegment> chunks = new ArrayList<>();

        // 策略 1：整表描述（小表格 <= 10 行）
        if (table.length <= 11) {
            StringBuilder sb = new StringBuilder();
            sb.append("【表格】").append(
                tableMetadata.getString("table_title"))
              .append("\n");
            sb.append("列名：").append(String.join(" | ", headers))
              .append("\n");
            for (int i = 1; i < table.length; i++) {
                sb.append("第").append(i).append("行：");
                for (int j = 0; j < headers.length; j++) {
                    sb.append(headers[j]).append("=")
                      .append(table[i][j]).append("; ");
                }
                sb.append("\n");
            }
            chunks.add(TextSegment.from(sb.toString(),
                tableMetadata.put("chunk_type", "full_table")));
            return chunks;
        }

        // 策略 2：逐行描述（大表格）
        // 每个 chunk 包含表头 + 1 行数据
        for (int i = 1; i < table.length; i++) {
            StringBuilder sb = new StringBuilder();
            sb.append("【表格 ").append(
                tableMetadata.getString("table_title"))
              .append("】\n");
            sb.append("列名：").append(String.join(" | ", headers))
              .append("\n");
            sb.append("数据：");
            for (int j = 0; j < headers.length; j++) {
                sb.append(headers[j]).append("=")
                  .append(table[i][j]).append("; ");
            }
            chunks.add(TextSegment.from(sb.toString(),
                Metadata.from("chunk_type", "table_row")
                        .put("row_index", String.valueOf(i))
                        .putAll(tableMetadata)));
        }
        return chunks;
    }
}
```

### 6.3 表格 QA：结构化检索

表格 QA 的核心挑战是：用户的问题往往是 "哪个" "多少" 这类需要精确匹配的问题，而不是语义模糊的开放式问题。对于这类查询，向量检索的效果不如结构化查询。

推荐的策略是**双通道检索**：向量检索处理开放式问题 (如 "XR-500 有哪些常见故障")，结构化查询处理精确问题 (如 "故障代码 E03 的解决方案是什么")。LangChain4j 的 Metadata 过滤可以在表格 chunk 上实现精确的列值匹配。

表格处理最佳实践

1. 每个 chunk 都带上完整表头，防止切分后丢失上下文。
2. 用 "列名=值" 的格式描述每行数据，比 Markdown 表格更适合 Embedding。
3. 小表格 (10 行以内) 整表作为一个 chunk，大表格逐行分块。
4. 在 Metadata 中记录表格标题、行号、列名，支持精确过滤。

## 七、实战：产品手册多模态问答 Agent

下面我们把前面学到的所有技术整合起来，构建一个完整的产品手册多模态问答 Agent。它能同时处理文本、图片和表格，实现真正的多模态 RAG。

### 7.1 多模态文档处理管线

首先，我们需要一条能同时处理文本、图片和表格的文档处理管线。

### 7.2 完整的多模态问答 Agent

把文本处理、图片描述、表格提取三条管线整合在一起，再加上一个能理解多模态上下文的 LLM，就是一个完整的多模态问答 Agent。

```java
// 产品手册多模态问答 Agent
public class MultimodalProductManualAgent {

    private final EmbeddingStore<TextSegment> store;
    private final EmbeddingModel embeddingModel;
    private final ChatModel chatModel;

    public MultimodalProductManualAgent() {
        this.store = new InMemoryEmbeddingStore<>();
        this.embeddingModel = OpenAiEmbeddingModel.builder()
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .modelName("text-embedding-3-small")
                .build();
        this.chatModel = OpenAiChatModel.builder()
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .modelName("gpt-4o")
                .temperature(0.1)
                .build();
    }

    /**
     * 入链：处理产品手册中的所有模态内容
     */
    public void ingest(String pdfPath) throws Exception {
        // 1. 解析 PDF
        Document doc = new PdfDocumentLoader().load(pdfPath);

        // 2. 文本分块入链
        List<TextSegment> textSegs = DocumentSplitters
                .recursive(300, 50).split(doc);
        addWithMetadata(textSegs, "text");

        // 3. 图片描述入链
        ImageCaptioner captioner = new ImageCaptioner();
        List<ImageContent> images = extractImages(doc);
        for (int i = 0; i < images.size(); i++) {
            String caption = captioner.captionize(images.get(i),
                    "产品手册");
            TextSegment seg = TextSegment.from(caption,
                Metadata.from("type", "image_caption")
                        .put("image_index", String.valueOf(i))
                        .put("source", pdfPath));
            addWithMetadata(List.of(seg), "image");
        }

        // 4. 表格提取入链
        List<String[][]> tables = extractTables(doc);
        for (int i = 0; i < tables.size(); i++) {
            List<TextSegment> tableSegs = TableChunker.chunkTable(
                tables.get(i),
                Metadata.from("type", "table")
                        .put("table_index", String.valueOf(i))
                        .put("table_title", "产品规格表" + (i + 1))
                        .put("source", pdfPath));
            addWithMetadata(tableSegs, "table");
        }

        System.out.println("产品手册入链完成");
    }

    /**
     * 问答：用户用文字提问，Agent 检索所有模态的内容
     */
    public String ask(String question) {
        // 检索相关片段
        Embedding queryEmb = embeddingModel.embed(question).content();
        EmbeddingSearchRequest searchReq = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmb)
                .maxResults(8)
                .build();

        EmbeddingSearchResult<TextSegment> searchResult = store.search(searchReq);
        List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

        // 构建上下文
        StringBuilder context = new StringBuilder();
        for (var match : matches) {
            String type = match.embedded().metadata().getString("type");
            context.append("[").append(type).append("] ")
                   .append(match.embedded().text()).append("\n\n");
        }

        // LLM 生成回答
        String systemPrompt = """
            你是一个产品手册问答助手。根据以下检索到的信息回答用户问题。
            信息来源包括：文本段落、图片描述、表格数据。
            如果信息不足以回答，请明确说明。
            如果涉及图片中的信息，请描述图片内容。
            如果涉及表格数据，请用结构化格式呈现。
            """;

        return chatModel.chat(
            List.of(
                SystemMessage.from(systemPrompt),
                UserMessage.from("参考资料:\n" + context +
                    "\n用户问题: " + question)
            )
        ).aiMessage().text();
    }

    private void addWithMetadata(List<TextSegment> segs, String type) {
        List<Embedding> embs = embeddingModel.embedAll(segs).content();
        store.addAll(embs, segs);
    }

    // main 方法演示
    public static void main(String[] args) throws Exception {
        var agent = new MultimodalProductManualAgent();
        agent.ingest("product-manual.pdf");

        // 文本问答
        System.out.println(agent.ask("XR-500 的额定功率是多少？"));
        // 图片问答
        System.out.println(agent.ask("设备正面的指示灯有几个？"));
        // 表格问答
        System.out.println(agent.ask("故障代码 E05 怎么解决？"));
    }
}
```

### 7.3 运行效果

以一份 50 页的产品手册为例，其中包含 32 张图片和 8 个表格。经过多模态管线处理后，系统入库了 156 个文本片段、32 个图片描述、47 个表格行。

| 测试问题 | 命中类型 | 回答摘要 |
|---|---|---|
| XR-500 的额定功率是多少？ | 表格 | 从规格表中检索到：额定功率 1500W |
| 设备正面有几个指示灯？ | 图片 | 从图片描述中检索到：正面有 3 个指示灯 (红/黄/绿) |
| 故障代码 E05 怎么解决？ | 表格+文本 | 从故障排查表中检索到 E05 = 传感器异常，结合文本给出完整排查步骤 |
| 设备外观是什么样的？ | 图片 | 从图片描述中检索到设备外观描述，包括颜色、尺寸、接口位置 |

## 八、踩坑实录：多模态 RAG 的 4 个常见坑

### 8.1 多模态模型贵

GPT-4o 处理一张图片的成本大约是纯文本的 10-20 倍。如果你的产品手册有 500 张图片，光描述费用就可能上百美元。**解决方案**：先用轻量级模型 (GPT-4o-mini) 做初步描述，只对关键图片用高级模型。或者使用 Cohere Embed v4 的多模态向量法，省掉 VLM 描述的费用。

### 8.2 描述质量是关键瓶颈

VLM 生成的描述质量参差不齐。对于复杂的工程图、电路图，VLM 可能会 "幻觉" 出不存在的细节。**解决方案**：在 Prompt 中明确要求 "只描述图中实际可见的内容，不要推测"；对关键图片做人工审核；在 Metadata 中记录描述置信度。

### 8.3 表格切分丢表头

这是最常见的错误。递归分块器不知道表格的边界，从中间切断后，下半部分的行数据就失去了列名。**解决方案**：使用专门的 TableChunker (本文第 6 节)，确保每个 chunk 都带上完整表头。对于跨页表格，需要在解析阶段就合并。

### 8.4 上下文窗口限制

多模态内容比纯文本占用更多的上下文窗口。一张图片的 Base64 编码可能占 2000+ Token，如果检索结果中包含多张图片，很容易超出上下文限制。**解决方案**：检索结果中只包含图片描述文本，不传原始图片；或者限制图片类结果的数量 (最多 2 张)；使用 Token 预算管理器动态调整。
