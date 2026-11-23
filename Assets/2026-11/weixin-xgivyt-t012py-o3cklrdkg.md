### RAG技术实现全流程

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

01文档解析

常见文档类型与特点： 

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

Word VS PDF

word一般是会把doc转换为docx进行解析，pdf就会比较复杂些。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

问答对解析： 

在RAG（检索增强生成）系统的文档处理流程中，常规的方法其实就是对文档内容分段分割成文本块即可，但很多产品中经常会有另一个选项，就是对文档进行问答对的提取；

问答对 = 结构化的 (question, answer) 键值对，用于把文档中明确的 Q→A 映射提取出来，作为可检索的知识单元。

*   普通文本块：拆分后是连续的文本片段（如“章节片段”“语义段落”），属于非结构化数据，存储和检索时需基于整体文本的语义进行匹配。
    
*   问答对：拆分后是明确的(question, answer)键值对，属于结构化数据，存储和检索时可针对性地对“问题”和“答案”分别处理。
    

问答对解析 vs 文档解析

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

Deepdoc

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

DeepDoc是RAGFlow的视觉+语义文档解析引擎，整合OCR、版面分析、表格结构识别与多格式解析器，将“绘制指令/图像”还原为语义化、可检索的文档单元（chunks/HTML表格/图片）。支持PDF、DOCX、EXCEL、PPT、TXT、MD、JSON、EML、HTML、IMAGE等多种文档类型。

功能优势

*   混合策略：模型+工程规则——模型负责复杂判断，规则修边界（垃圾文本过滤、合并阈值等）。
    
*   模块化Parser——同一套视觉输出可驱动不同解析器（PDF / Word / Excel / PPT）。
    
*   可视化校验——每个 chunk 保留截图并在前端高亮，便于人工审阅与回溯。
    
*   工程细节：使用onnx推理、batch处理、scale factor 缩放、XGBoost/规则融合用于box 合并决策。
    

MinerU

deepdoc是对每一个文档类型进行处理，MinerU是把所有格式都转成md/json格式。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

MinerU vs Deepdoc 

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

文档解析工具对比： 

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

表格解析：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

三大视觉任务的解析：

*   OCR：提取图片或扫描件中的文字内容
    
*   DLR：分析文档结构布局（标题、段落、图像等）
    
*   TSR：识别表格行列、合并单元格并结构化输出
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

图片解析

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

02知识库构建（分块）

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

分块的核心问题

*   LLM与嵌入器有上下文窗口限制：单条输入超过token上限会被截断，导致关键信息丢失，检索命中降低。
    
*   未经处理的长文档在检索时会引入大量无关信息（噪声），降低召回与精确率。
    
*   分块同时影响下游生成：不完整的上下文会让LLM产生“虚构”或不完整的答案。
    

一些场景

*   场景1（法律条文）：若按固定token截断，一条法条被拆为两半，问答模型可能无法定位条款责任范围。
    
*   场景2（会议纪要）：对话轮次应保留发言人上下文，否则对话问答会丢失因果关系。
    

衡量一个好的Chunk

*   可独立理解：人读该chunk能回答关于该主题的若干问题；
    
*   信息密集但不冗余：包含足够证据以支持检索与生成，但不包含大量无关内容；
    
*   索引/检索友好：易于建立元数据（文档ID、页码、标题）以便溯源与引用。
    

常见分块策略 

1.固定大小切块（Fixed-size/Fixed Window Chunking）：

场景使用：面对“一锅粥”式的原始、混乱文本数据时，比如从PDF中OCR（光学字符识别）出来的、没有标点符号或格式的文本，或者大型的日志文件、数据流。当你对文本结构一无所知，又需要快速将数据拆分成固定大小的片段以适应模型输入时，这是最直接的选择。

优点：

*   简单且快速： 实现起来也很简单，切割效率高。
    
*   易于管理： 每个块的大小固定，便于批量处理和模型输入管理，尤其是在LLM有严格token限制时。
    
*   兜底策略： 在其他结构化切块方法都失效时，可以作为一种普适的兜底方案。
    

缺点：

*   上下文被截断： 最大的缺点是它会毫不留情地在任何位置切开文本，常常会把句子、段落甚至完整的想法截断，导致语义不完整或上下文信息流失严重。
    
*   信息冗余： 在处理结构化文本时，一个块可能包含多余的信息，或与下一个块的内容高度重叠。
    

2.滑动窗口切块（Sliding Window Chunking）：

场景使用： 当你的文本内容上下文关联紧密、信息连续性强时，比如小说、叙事性报告、详细的技术文档、自由流动的随笔等。它能有效缓解固定大小切块中上下文被截断的问题，尤其适用于LLM需要更广阔语境才能准确理解和生成回答的场景。

优点：

*   保持上下文： 通过块之间的重叠，能有效保留跨块的上下文信息，降低LLM理解时出现“断层”的风险。
    
*   提高检索精度： 检索时，即使查询命中一个重叠部分，也能带回包含更完整上下文的块。
    
*   适用于无结构文本： 对没有明确标题、段落分隔的文本也能较好地处理。
    

缺点：

*   冗余度增加： 重叠部分会增加存储和处理的冗余，导致向量数据库更大，嵌入和检索成本增加。
    
*   计算开销： 更多的块意味着更多的嵌入计算和检索操作。
    
*   参数调优：chunk\_size和 overlap的比例需要根据实际数据和LLM的特性进行仔细调优，否则可能效果不佳。
    

3.基于句子切块（Sentence-based Chunking）：

场景使用： 最适合语法结构完整、句子独立承载完整语义的文本，如新闻报道、博客文章、产品说明书、法律条文、论文摘要、结构化的文档或纯文本数据。它可以作为更复杂切块策略的“第一步”，得到粒度最小的语义单元。

优点：

*   语义完整性高： 每个切块都是一个完整的句子，通常能保证最小的语义单元不被破坏。
    
*   粒度精细： 提供了最细粒度的信息，便于后续的重排、过滤或更复杂的组合操作。
    
*   易于理解：LLM处理完整句子时，理解成本更低。
    

缺点：

*   上下文不足：单个句子可能缺乏足够的上下文来完全理解其含义，尤其是在上下文分散于多个句子的复杂概念中。
    
*   数量庞大：对于长文档，句子切块会生成大量小块，增加存储和检索的负担。
    
*   标点依赖：严重依赖文本中的标点符号来识别句子边界，如果文本质量差（如OCR错误、缺乏标点），效果会大打折扣。
    

4.递归切块（Recursive Chunking）：

场景使用：对于长度不确定、结构不规则的文本，如采访记录、自由形式的写作、用户评论、非结构化文档等。当你想确保每个切块都满足LLM的最大token限制，同时尽可能保持语义完整性时，递归切块是一个非常强大的通用解决方案。它会优先使用大的语义分隔符，如果仍超出限制，则尝试更小的分隔符，直至满足要求。

优点：

*   灵活性高：能够处理各种长度和结构的文本，适应性强。
    
*   平衡完整性与粒度：优先保留较大的语义单元（如段落），在必要时才进一步细分到句子或单词，尽量减少上下文破坏。
    
*   通用性强：适合作为大多数RAG系统的通用切块策略。
    

缺点：

*   实现略复杂：相较于简单切块逻辑更复杂，需要定义分隔符优先级。
    
*   分隔符依赖：分隔符的选择和顺序会影响切块质量，需要一定的经验和实验。
    
*   可能仍然截断：在极端情况下，如果所有分隔符都用完仍无法满足长度要求，最终可能还是会强制截断文本。
    

## 5.页面/结构化切块（Page-based/Structured Chunking）

## 场景使用：主要针对具有明确分页结构/明确内部结构的文档，以文档的物理或格式结构为第一阶切分单元，包括页面（PDF/PPT页）、Markdown/HTML标题、表格、代码块、章节等。将页面切块与结构化切块合并可保留排版与引用信息（如页码、标题），便于溯源与向用户展示证据位置。

## 原理：依赖文本的**结构性标记**，这些标记可能是显式的（如HTML标签、Markdown标题、PDF章节标题），也可能是隐式的（如表格、代码块、列表的格式）。它不依赖通用分隔符，而是根据文档特定格式元素来解析文档。 例如：

*   Markdown：按标题（#, ##）拆分以捕获章节或小节。
    
*   HTML：通过标签（<p>, <div>）拆分以保留逻辑内容块。
    
*   PDF：经过预处理（例如OCR或转换为Markdown）后，按标题、段落、表格或其他结构元素进行拆分。
    
*   编程代码：按函数或类（例如def在Python中）拆分以维护代码的逻辑单元。
    

## 优点：

*   保留原始布局信息：每个切块对应一个物理页面，能完整保留该页面的所有信息和布局，方便在原始文档中定位。
    
*   易于引用：直接关联页码，便于用户或LLM引用原始出处。
    
*   简化处理：对于已分页的文档，省去了复杂的语义分析。
    
*   语义完整性强：每个切块都对应数据中的一个逻辑单元，语义上高度完整和聚焦。
    
*   准确性高：不依赖模糊的文本特征，而是基于确定的结构规则，切块准确率高。
    
*   便于信息抽取：切块后可以直接提取结构化信息，方便后续的知识图谱构建或特定字段检索。
    

## 缺点：

*   依赖文档格式：需要文档有明确的标题或章节标记，对于非结构化文本无效。
    
*   解析复杂：需要更智能的解析器来识别不同级别的标题和其对应的内容。
    
*   若概念跨页或跨章节出现，页面切块可能截断语义；
    
*   需对超长页面 / 章节二次细分（建议与递归或语义策略结合）。
    

## 工程建议：先按页面/标题做宏观切分，保留页码/标题元数据；对超长块应用二次切分策略（见混合分块）。

## 6.语义切块（Semantic Chunking）

## 场景使用：当你的文档主题连贯但缺乏明确结构，或者不同主题的句子交织在一起时，如访谈记录、会议纪要的自由转录、长篇小说中人物情感的起伏、对某个复杂概念的多角度阐述。这种方法通过识别句子或段落的语义相似性，将真正“谈论同一件事” 的内容聚合在一起。先理解语义，在话题变化处切。

## 原理：语义分块从传统的基于规则的拆分转变为基于含义的分段。这种更先进的技术不再依赖于字符数或文档结构，而是根据文本的语义相似性进行划分，该过程包括：

*   句子分割：将文本分解成单独的句子
    
*   嵌入生成：将每个句子转换为向量嵌入
    
*   相似性分析：计算每对相邻句子的差异（距离/相似度）→根据选定的方法（百分位/标准差/IQR），设定阈值
    
*   块形成：遍历相邻差异，如果某处差异>阈值→在这些断点之间创建新的块
    

## 优点：

*   高语义纯度：确保每个切块中的内容在语义上高度相关，减少无关信息的干扰。
    
*   应对无结构文本：在没有明确结构的情况下，也能找到自然的语义边界。
    
*   提升检索质量：用户查询某个概念时，能召回所有语义上相关的片段，即使它们在原文中不相邻。
    

## 缺点

*   实现复杂：使用句子嵌入模型（如Sentence Transformers），并进行向量计算和聚类分析。
    
*   计算开销：嵌入生成和相似度计算会增加处理时间。
    
*   阈值敏感：相似度阈值的设置非常关键，过高可能导致块过小，过低可能导致块过大并包含多个主题。
    
*   模型依赖：效果取决于所选嵌入模型的语义理解能力。
    

7.Small2Big（上下文补全窗口）

碎片化的检索结果缺失大段上下文，导致大模型拼图失败。

*   Chunk越小：分块会把连贯语义切成“小片”，检索命中最多只给出部分证据；
    
*   Chunk越大：单纯增大chunk或盲目提高TopK会引入噪声、增加成本与prompt长度。
    

SmalltoBig上下文补全窗口，它不属于切块，但是它属于切块里的一部分。碎片化的检索缺少上下文，比如内容里有12345点，只拿回来123点，没有45点，这样的话有可能回答不了，比较片面，这是第一种情况。第二种情况就是检索回来了，但是他们在分块上分在不同片段上。

解决方法就是上下文补全窗口。

块越小语义切分越小，检索命中就容易给出更多的证据，检索的更准。块越大，就越会引入噪声。

**检索的时候用小块，生成的时候用大块，这样能保持小块检索的精度，命中之后再向外扩展上下文**，检索到2、3这两个块，可以用补全的方式把它们补回来，合并后去重剪裁，保证提示词是连贯的且不过长， 大模型就能根据12345直接回答。比如检索回3，就补相邻的2和4块， 再把重叠overlap部分进行剪裁。

还有一种，当知道这篇文章的结构，知道小标题之后，那父块进行回溯。找到小块之后，找大块，直接拿回大块的一个段落用于生成。

所以这是两种方式，第一种邻域补全，可能没有父块概念，只能补充上下文。 第二种有父块概念，检索小块，那就回溯它的大块。但它俩不冲突，再考虑重复的部分，因为切块是自带重叠区域的，需要把衔接处重叠部分进行剪裁，避免上下文中两个一样的句子，返回给大模型更完整有连贯的一个句子，所以**解决问题的核心就是块大小****的****一个衡量。**确认好切块大小之后，就能保证精度，再获取上下文。

核心思想：检索用小块，生成用大块

*   保持“小粒度检索”的精准性→命中后再“向外扩展”上下文（邻居或父块）；
    
*   合并后去重/裁剪，保证prompt连贯且不过长。
    

具体流程：

*   按正常方式对文档切块chunk\_size\=400，chunk\_overlap\=200。
    
*   给每个chunk编上顺序号（chunk\_idx）。
    
*   全文&向量检索得到TopK chunk。
    
*   邻居补全（Context Enrichment Window）：命中chunk后带上左右num\_neighbors个邻居并合并（裁掉重叠）。实现简单，提升显著。
    
*   父块回溯（Parent/Document Retriever）：小片检索命中后回溯关联的大块（段落/章），用于生成。更连贯，便于引用位置。
    
*   考虑重复部分：因为chunk自带重叠区域，需要把衔接处“重叠token”裁剪，避免上下文里出现“两遍一样的句子”。
    
*   返回给LLM的prompt就是一份更厚实、更连贯的上下文。
    

解决的核心问题：块大小的权衡（精度 vs 上下文）

分块策略的优缺点

递归切块无论处理何种文本，这都是最稳妥的起点。它在通用性、简单性喝效果之间取得了很好的平衡。首先使用它建立一个性能基线。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最佳分块策略：

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

语义分块的切分点： 

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

寻找语义切分点的三种计算方法：

方法

公式

适用场景

`percentile分位数`

`threshold=第N百分位数`

知道大概要切多少段

`standard_deviation标准差`

`threshold=mean- N×σ`

找明显偏离常规的异常低点

`interquartile四分位距IQR`

`threshold=Q1- 1.5×IQR`

经典箱线图异常检测

1.百分位法：找“最离谱”的错误

通俗理解：把所有句子的“语义差异”排个队，只挑排在最前面、差异最大的几个当切分点。比如只看全班作业里“错误最严重的5%”，这些就是要重点标记的地方。

例子：假设我们要切分一篇混合了“校园新闻”和“动物科普”的文章：

*   句子1-3：讲学校运动会（差异小，像作业里的小错别字）
    
*   句子3-4：突然跳到“熊猫的饮食习惯”（差异超大，像作业里整道题全错）
    
*   句子4-6：讲熊猫的生活环境（差异小）
    

用“95百分位法”（只看前5%的大差异）时，只有“句子3-4”的差异能入选，所以我们就在这里切分，把文章分成“校园新闻”和“动物科普”两段。总结起来就是只认“最极端”的差异（全班最错的5人）。

2.标准差法：找“远超平均水平”的错误

通俗理解：先算全班作业的“平均错误大小”，再定一个标准（比如“平均错误+3倍的错误波动”），只要某个句子的差异超过这个标准，就当切分点。相当于只抓“错误大到离谱，远超全班正常水平”的情况。

例子：切分一篇“日常日记”，大部分内容很连贯，但突然插入一段“紧急事件”：

*   句子1-5：记录早餐、上学（差异小，平均错误1分，波动0.5分）
    
*   句子5-6：“路上遇到车祸，救护车呼啸而过”（差异超大，错误5分）
    
*   句子6-10：继续记录到学校后的事（差异小）
    

按“平均值+3倍标准差”算：1+3×0.5=2.5分。只有句子5-6的差异（5分）超过2.5分，所以这里切分，把“车祸事件”单独分成一段。总结：认“远超平均水平”的差异（错得比全班大部分人都多很多）。

3.四分位距法：找“比大多数人错得多”的错误

通俗理解：把所有差异分成四组（就像全班成绩按25%、50%、75%分档），只抓那些“比75%的句子差异都大很多”的点。适合找“虽然不是最离谱，但比大部分情况都突出”的差异，尤其适合内容本身很严谨、差异普遍小的文本（比如法律条文、课本知识点）。

例子：切分一篇“数学课本的知识点讲解”，大部分句子都是连续的公式推导，只有个别地方切换了知识点：

*   句子1-8：讲“一元一次方程”（差异很小，像作业里的笔误）
    
*   句子8-9：突然跳到“二元一次方程的定义”（差异比75%的句子都大）
    
*   句子9-15：讲二元一次方程解法（差异小）
    

用四分位距法时，会先算出“75%的句子差异都不超过0.8分”，再定标准 “0.8+1.5倍的四分距”（比如1.5分）。句子8-9的差异（1.2分）超过1.5 分，所以在这里切分，把两个方程知识点分开。总结：认“比75% 的情况都突出” 的差异（错得比班上中等偏上的人都多）。

分块策略优化： 

1.小块（≈128–256 tokens）

*   优点：检索精度（Precision）通常高，能更精确匹配用户查询中的关键词或局部事实；检索延迟低，向量库增长速度快但单次检索成本低。
    
*   缺点：上下文信息可能不足，导致生成时证据缺失或上下文相关问题无法回答（Recall 受限）；过度碎片化易引入更多检索结果但无法提供完整证据链。
    
*   典型适用：FAQ、短问答、代码片段、日志条目。
    

2.中等块（≈256–512 tokens）

*   优点：在精度与上下文完整性之间取得较好平衡；通常能提供足够的证据支持生成，同时保持合理的索引规模与嵌入成本。
    
*   缺点：需调优 overlap 与 chunk\_size配合，对于主题跳跃频繁的文档仍需语义方法辅助。
    
*   典型适用：产品文档、博客、技术手册。
    

3.大块（≈512–1024 tokens）

*   优点：块内语义连贯，生成时上下文完整性好，能减少需要从多个块聚合证据的情况。
    
*   缺点：检索精度（Precision）可能下降（因为块包含更多无关信息），嵌入与存储成本显著上升；在检索时更容易召回冗余数据，且增加 LLM 处理成本。
    
*   典型适用：需要整段上下文的复杂推理（例如长篇法规段落、章节级内容），但成本高，慎用。
    

4.Overlap（重叠）的影响

*   适度重叠（10%–25%）可以显著降低边界截断导致的信息丢失，提升跨块连贯性与召回率。
    
*   过高重叠会导致向量库中重复信息急剧增加，检索返回冗余结果并推高成本；评估时注意IoU与重复命中率。
    

03知识库构建（索引）

1.通过文本分词和Embedding将片段文本转化为分词列表和向量

2.将片段文本和分词列表、向量存入（向量）数据库中

文本分词与倒排索引： 

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

向量检索算法：Flat、IVF、HNSW

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

向量数据库

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

04知识库构建（知识增强）

①上下文增强索引

我们可以对一个切块进行知识增强，第一种知识增强就是上下文的增强，

## 存在问题：检索通常只返回孤立文本块、缺乏前后文联系导致两类问题：

*   1)检索和排序缺少上下文信息进而数据块丢失。检索不回来怎么办，一种方式是采用overlap增加重叠的部分，但是不能无限的增加（10%-25%）。另外一种方式是保留语义上下文信息。这两种方式可以进行融合。
    
*   2)LLM回答的时候断章、信息不完整并且难以追溯引用来源。通过small to big进行回溯可以解决这类问题。
    

## 采用“上下文增强检索”，核心思想是先找出最相关的文本块，然后同时返回它的前一个和后一个文本块，帮助LLM更好地理解上下文，从而生成更准确、更完整的回答。目标是在构建检索块时，同时保存“原始块”与其前后上下文（overlap），避免断句或丢失语义。

## 流程要点

*   从PDF提取原文→清洗与标准化。
    
*   切分为原始块（原始顺序），并为每个原始块构造前后重叠上下文（句 /段/字符级）。
    
*   每个检索单元包含：原始块ID、原始块文本、前文上下文、后文上下文、metadata（页码、位置信息）。
    

## 设计建议

*   overlap可按任务调参：例如前/后各50–200字或1–2句；对学术/ 法律文本可更长。
    
*   同时保留原始块（不被合并），便于后续精确回溯与Small2Big补全。
    

## 优点

*   ## 减少断章、提高检索命中后上下文完整度；检索到任意块即可拿到局部背景。
    

②添加上下文“块标题”—Contextual Chunk Headers

RAG通过外部知识检索提升语言模型事实性，但传统分块方法容易丢失上下文。导致检索相关性不足，甚至生成脱离上下文的回答。

overlap有50个字可能也不能包括更多信息，检索的时候可能缺少一些上下文信息，这个上下文信息是它这个章节的一些上下文信息。

       ——检索增强，给chunk加标题提升检索命中率。

第一种解决方案就是把原文的文档标题和章节标题这种信息放到块的前面进行嵌入和检索。

另外一种方案就是块标题，它的上下文是更完整的。每一个块都自带文档的层级信息，检索更精准。增强块和query之间的语义相关性，减少一些误判，避免模型断章取义生成一些错误答案。比如文档里平铺直叙，没有结构化信息，缺少标题段落，可以利用大模型生成一些简洁的小标题，这个方式就是CCH。

## 核心思想是在切分文本时，将文档标题、章节标题等高级上下文信息附加到每个文本块前部，再进行嵌入与检索。

## 实现方式

*   自动检测文档中的章节/小节标题。
    
*   将对应标题拼接到段落文本块开头。
    
*   将“带标题块”作为检索单元进行向量化和检索。
    

## 示例：#第三章：人工智能的基本技术

人工智能的核心方法包括机器学习、深度学习和自然语言处理…

## 优点

*   上下文更完整：每个块自带其文档层级信息。
    
*   检索更精准：增强块与query的语义相关性。
    
*   减少误判：避免模型因断章取义生成错误答案。
    

## 进一步优化

*   除了章节标题，还可将文章标题添加到块中，进一步区分不同文档来源。
    
*   对于缺少清晰标题的段落，可利用大模型生成简洁小标题作为CCH。
    

③引入问题生成—QuestionGeneration

传统RAG仅依赖文本块向量化→检索粒度有限。当用户问题表述与原文差异较大时，检索可能不命中或命中不准。

问答的时候需要切块，问答对也是一种方式。

片段比较单一的，而且用户的问题其实和你的块是，其实是差异比较大的，这个叫什么？叫不对称性？用户问的问题是我要听周杰伦的歌，后边是写介绍周杰伦的歌，你这样的话它俩块是不一样的，一是长度不一样，二是它的那个语义也不太一样， 就算是现在模型上做了这方面的训练了，其实它也可能也会存在一种这种内容的缺失， 而且它块的表达可能跟你用户的问题就是不一样，那这种时候你这种不确定性你其实就会检索不到， 或者说会受到别的干扰，那我们就要需要引入一种方式，就是叫那个引入问题生成，核心思想就是在文档处理的时候，我们除了对文本块进行那个嵌入之外，我们还要对每一个块形成一个相关问题进行一起并入，这个嵌入就是说当完了，当用户进行那个提问的时候，我们就可以直接匹配这个问题了。

其实就是这个方案我们其实也可以有两种，第一种就是说我们把这问题作为一个向量，进行一个只是检索问题，这是第一种。第二种就是说我们把问题和块，这就是比较简单的把问题和块合在一，变成一个块。把问题拼在前头了，这样的话就保证的是我们把问题信息也在前面表示出来了，这也是可以的。

*   **核心思想：在文档处理阶段，除嵌入文本块外，还为每个块生成若干相关问题一并嵌入。**
*   **原理：用户提问时，系统可匹配到由LLM自动生成问题，从而更精准地找到对应文本块。**

## 流程要点

1.  文本分块（Chunking）
    

*   将文档切分为200~300字左右的小块。
    

3.  问题生成（Question Generation）
    

*   使用大模型（LLM）为每个文本块生成 2~5 个相关问题。
    
*   示例：文本块主题：机器学习、
    
           自动生成问题：“什么是机器学习？”、“机器学习有哪些常见算法？”、“机器学习和人工智能有什么关系？”
    

6.  嵌入与存储
    

*   将文本块和生成问题一同向量化，存入向量数据库。
    

8.  检索与回答
    

*   用户提问→命中相关问题或块→返回块文本→LLM生成答案。
    

## 优点

*   提升检索召回率：问题生成扩展了query匹配入口。
    
*   增强语义对齐：缩小用户问题与文档原文之间的语义差距。
    
*   提高回答质量：帮助LLM找到更相关的上下文。
    

大模型Rag系列文章：

[Rag是什么，Rag的整体技术架构](https://mp.weixin.qq.com/s?__biz=MzUzMjAxNDA5OQ==&mid=2247488433&idx=1&sn=fbad0756a33374c6b45e3a043c6d3b5c&scene=21#wechat_redirect)