> 不用学 Python，不用碰 LangChain。Spring AI 让你用写 Service 的姿势写 AI 应用，这篇文章带你从 0 到 1 跑通整个链路。

说实话，作为一个写了六年 Java 的人，每次看到 AI 应用开发的教程清一色 Python，我心里是有点不是滋味的。

"想搞 AI？先学 Python 吧。" "LangChain 了解一下？" "Jupyter Notebook 装了吗？"

好家伙，我连 IDE 都还没换呢，你就让我先换个语言？

然后 Spring AI 出现了。

我第一次看到这个项目的时候，第一反应是：终于有人想起我们 Java 程序员了。第二反应是：这玩意靠谱吗？别又是个半吊子项目。

第三反应是：试试呗，反正 Spring 生态的东西，踩坑也踩了六年了，多一个不多。

试完之后我想说——**这东西真的可以。** 它的思路很 Spring：你不用关心底层模型是 OpenAI 还是 Anthropic 还是本地跑的开源模型，你只管用统一的 API 去调，切换模型改一行配置就行。

今天这篇文章，我带你从零开始，用 Spring AI 搭一个"私人助手"。不是那种"你好世界"级别的 Hello World，是一个**有记忆、能读你的笔记、能查你的日程、返回结构化数据**的完整应用。

一步一步来，每一步都能跑。

* * *

## Spring AI 到底是啥？

先花一分钟讲清楚这个东西的定位。

Spring AI 不是一个大模型。它不跟 OpenAI 竞争，也不跟通义千问竞争。**它是你的 Java 应用和 AI 模型之间的中间层。** 你可以理解为：Spring Data 帮你屏蔽了数据库差异，Spring AI 帮你屏蔽了模型差异。

用 OpenAI 写一套代码，换成通义千问或者本地跑的 Llama，业务代码一行不改，只改 `application.yml`。

如果你听说过 Python 圈的 LangChain，Spring AI 就是 Java 版的 LangChain——但它更 Spring。依赖注入、自动配置、`@Bean` 那一套，全是你熟悉的味道。

* * *

## 第一步：先让它说句话

别想那些花里胡哨的，第一步就是让 Spring AI 跟模型说句话，拿到回复。

### 加依赖

建一个 Spring Boot 项目（用 Spring Initializr 最快），加上 Spring AI 的 BOM 和 OpenAI starter：

```xml
<properties>
    <java.version>17</java.version>
    <spring-ai.version>2.0.2</spring-ai.version>
</properties>
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
</dependencies>
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

别忘了在 `<parent>` 里指定 Spring Boot 版本：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.2</version>
    <relativePath/>
</parent>
```

你可能会问：我没有 OpenAI 的 key 怎么办？

别慌。Spring AI 的 OpenAI starter 兼容所有 OpenAI 格式的 API，包括**通义千问、本地 LM Studio、Ollama** 等等。你只要改 `base-url` 就行。后面我会讲怎么配。

### 写配置

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY:local-model}
      base-url: ${OPENAI_BASE_URL:http://localhost:1234/v1}
      chat:
        model: ${OPENAI_MODEL:nvidia/nemotron-3-nano-4b}
```

三个配置项：

*   **api-key**：你的 API 密钥。本地模型随便填个 `local-model` 就行
*   **base-url**：模型服务的地址。本地 LM Studio 默认是 `http://localhost:1234/v1`
*   **model**：模型名称。看你本地跑的是什么模型

如果你有通义千问的 key（阿里云百炼），把 `base-url` 改成 `https://dashscope.aliyuncs.com/compatible-mode/v1`，`api-key` 填你的 DashScope key，也能直接用。

**这就是 Spring AI 最爽的地方：换模型不改代码。**

### 写 Controller

```java
@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatClient chatClient;
    public ChatController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }
    @PostMapping
    GenerationResponse chat(@RequestBody GenerationRequest request) {
        var reply = chatClient.prompt(request.userMessage())
                .call()
                .content();
        return new GenerationResponse(reply);
    }
}
record GenerationRequest(String userMessage) {}
record GenerationResponse(String modelContent) {}
```

就这些。一个完整的 AI 对话接口。

启动应用，用 curl 或者 Postman 发个 POST 请求：

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "你好，你是谁？"}'
```

模型回复了。

你盯着这段代码看几秒——没有 SDK 初始化，没有鉴权逻辑，没有 HTTP 调用。**Spring Boot 自动配置帮你把 `ChatClient.Builder` 注入进来了，你只管 `build()` 然后 `call()`。**

这种感觉熟悉吗？跟用 `RestClient`、`WebClient` 一模一样的套路。

* * *

## 第二步：给助手一个"人设"

好，现在它能说话了。但它的回复没有"性格"——有时候啰嗦，有时候冷淡，有时候用英文回你。

你需要给它一个 **System Prompt**——一段预设的指令，告诉它"你是谁、该怎么说话"。

```java
@Service
public class Assistant {
    private final ChatClient chatClient;
    Assistant(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultSystem("""
                        你是我的私人助手。
                        回答控制在两三句话以内，直接、友好。
                        不知道的事情就说不知道，别瞎编。
                        """)
                .build();
    }
    public String ask(String question) {
        return chatClient.prompt()
                .user(question)
                .call()
                .content();
    }
}
```

`defaultSystem` 是在构建 `ChatClient` 的时候设置的，**每次对话都会自动带上这段指令**。

你也可以在单次调用时临时覆盖：`.system("你现在是一个毒舌评论家")`。

别小看这个 System Prompt。"不知道就说不知道"这句话能帮你挡掉一大半幻觉。**没有这句话的 AI 就像一个永远不肯承认自己不懂的同事——什么都敢接，什么都敢编。**

* * *

## 第三步：让它记住你说的话

现在有个问题：助手没有记忆。

你问它"我今天有什么安排？"，它回答了。然后你说"把第一个推迟到下午五点"，它不知道"第一个"是什么。因为每一次对话对它来说都是全新的。

这就好比你每天去同一家咖啡店，店员每次都不认识你。你明明昨天才点过冰美式。

Spring AI 用 **Advisor** 机制解决这个问题。Advisor 是一个拦截器，在请求发给模型之前和收到回复之后，帮你做一些"横切"的事情。记忆功能就是一个 Advisor。

```java
@Service
public class Assistant {
    private final ChatClient chatClient;
    Assistant(ChatClient.Builder builder) {
        ChatMemory chatMemory = MessageWindowChatMemory.builder().build();
        this.chatClient = builder
                .defaultSystem("你是我的私人助手...")
                .defaultAdvisors(
                        MessageChatMemoryAdvisor.builder(chatMemory).build()
                )
                .build();
    }
    public String ask(String conversationId, String question) {
        return chatClient.prompt()
                .user(question)
                .advisors(a -> a.param(
                        ChatMemory.CONVERSATION_ID, conversationId))
                .call()
                .content();
    }
}
```

两个关键改动：

1.  构建时加了 `MessageChatMemoryAdvisor`——这个 Advisor 会自动把最近的对话历史塞进每次请求里
2.  每次调用传一个 `conversationId`——用来区分不同的对话。同一个 id 的对话共享记忆，不同 id 的互不干扰

`MessageWindowChatMemory` 默认保留最近 20 条消息。你不用担心上下文越来越长把 token 烧光——它会自动丢弃最旧的消息。

**但有个坑要注意**：`conversationId` 是必传的，不传直接报错。我第一次用的时候忘了传，debug 了半天。

* * *

## 第四步：让它读你的笔记（RAG）

助手现在能说话了，也能记住上下文了。但它对你的了解为零——它不知道你叫什么、喜欢什么、有什么习惯。

RAG（Retrieval-Augmented Generation，检索增强生成）就是干这个的。

简单说就是三步：

1.  **把你的笔记存成向量**——把文本转成一串数字（embedding），存进向量数据库
2.  **用户提问时，先去向量库里搜最相关的笔记**——比如问"我坐飞机喜欢什么座位"，搜出那条"我喜欢靠窗座位"
3.  **把搜出来的笔记塞进 Prompt 里**，让模型基于这些笔记回答

Spring AI 把 RAG 也做成了 Advisor：`QuestionAnswerAdvisor`。你只需要给它一个 `VectorStore`，剩下的它全包了。

### 配置向量数据库

这里用 PgVector（PostgreSQL 的向量扩展）。你需要一个跑着的 PostgreSQL，然后加依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-pgvector</artifactId>
</dependency>
```

配置：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/postgres
    username: postgres
    password: postgres
  ai:
    openai:
      embedding:
        api-key: ${DASHSCOPE_API_KEY}
        base-url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        model: text-embedding-v4
        dimensions: 1024
    vectorstore:
      pgvector:
        initialize-schema: true
```

`initialize-schema: true` 会在启动时自动建表，省得你手动建。

embedding 模型和聊天模型是分开的。聊天模型负责对话，embedding 模型负责把文本转成向量。如果你用 LM Studio，embedding 模型也跑在本地；如果用云端，可以走 OpenAI 的 `text-embedding-3-small` 或者通义的 `text-embedding-v4`。

### 灌数据

启动时把你的笔记灌进去：

```java
@Component
class NotesLoader {
    NotesLoader(VectorStore vectorStore) {
        vectorStore.add(List.of(
                new Document("我叫波特，也可以叫我potter"),
                new Document("早晨喜欢来一杯咖啡，没有我会打瞌睡"),
                new Document("坐飞机喜欢靠窗，能看云"),
                new Document("微信公众号是程序员波特，记得点个关注"),
                new Document("周一和周四去健身房")
        ));
    }
}
```

你不需要手动调 embedding 模型。`vectorStore.add()` 内部会自动用配置好的 `EmbeddingModel` 把每条笔记向量化并存进 PgVector。

**五行笔记，五条向量，就这么简单。**

### 接上 RAG

回到 `Assistant`，把 `QuestionAnswerAdvisor` 也加进 Advisors 里：

```java
Assistant(ChatClient.Builder builder, VectorStore vectorStore) {
    var chatMemory = MessageWindowChatMemory.builder().build();
    var memoryAdvisor = MessageChatMemoryAdvisor.builder(chatMemory).build();
    var ragAdvisor = QuestionAnswerAdvisor.builder(vectorStore).build();
    this.chatClient = builder
            .defaultSystem("你是我的私人助手...")
            .defaultAdvisors(memoryAdvisor, ragAdvisor)
            .build();
}
```

你甚至可以调 RAG 的搜索精度：

```java
QuestionAnswerAdvisor.builder(vectorStore)
    .searchRequest(SearchRequest.builder()
            .similarityThreshold(0.5) // 相似度低于 0.5 的直接丢弃
            .topK(4)                  // 最多取 4 条最相关的笔记
            .build())
    .build();
```

现在你问"下次坐飞机帮我选个座位"，助手会先搜你的笔记，找到"靠窗"那条，塞进 Prompt，然后基于你的偏好回答。

**它不是在猜，它是在你的数据里找到了答案。** 这就是 RAG 的价值。

* * *

## 第五步：让它查你的日程（Tool Calling）

RAG 能解决"静态知识"的问题。但有些东西是动态的——比如你今天有什么安排，现在几点了，天气怎么样。这些东西不在任何笔记里，它需要**实时去查**。

这就是 Tool Calling（也叫 Function Calling）。

原理是这样的：你写一个普通的 Java 方法，标上 `@Tool` 注解，告诉模型"你可以调用这个方法"。模型不会自己执行代码——它会在回复中说"我需要调用 xxx 方法"，Spring AI 帮你执行，然后把结果返回给模型，模型再组织语言回复你。

```java
@Component
class CalendarTools {
    @Tool(description = "查询指定日期的日程安排")
    public String getAgenda(
            @ToolParam(description = "日期，ISO 格式，如 2026-10-28") String day) {
        // 实际项目中这里会调日历 API
        return day + " 的日程：10:00 站会，16:00 看牙";
    }
    @Tool(description = "获取当前日期（ISO 格式）")
    public String getCurrentDate() {
        return LocalDate.now().toString();
    }
}
```

两个方法：一个查日程，一个获取今天日期。

注意 `@Tool` 和 `@ToolParam` 的 `description`——**这些描述是给模型看的**，模型靠这些描述来判断"什么时候该调哪个方法、参数该填什么"。描述写得越清楚，模型调用得越准确。

在调用时把 Tools 注册上去：

```java
public String ask(String conversationId, String question, CalendarTools calendarTools) {
    return chatClient.prompt()
            .user(question)
            .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
            .tools(calendarTools)
            .call()
            .content();
}
```

你问"我今天有什么安排？"，模型可能会：

1.  先调 `getCurrentDate()` 拿到今天的日期
2.  再用这个日期调 `getAgenda("2026-10-28")`
3.  拿到结果后组织成自然语言回复你

**整个过程你不用写任何调度逻辑。模型自己决定调什么、什么时候调。**

这个特性是真的好用。我给它接过天气 API、汇率 API、数据库查询，模型都能自己判断什么时候该调。

* * *

## 第六步：返回结构化数据

到目前为止，助手返回的都是字符串。对于聊天界面这没问题，但如果你的下游系统需要根据回复做判断——比如分类、标记是否需要跟进——解析一段自然语言是很脆弱的。

Spring AI 支持 **Structured Output**：直接让模型返回一个 Java 对象。

```java
record AssistantReply(
        String answer,
        String category,
        boolean needsFollowUp) {}
AssistantReply reply(String conversationId, String question, CalendarTools calendarTools) {
    return chatClient.prompt()
            .user(question)
            .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
            .tools(calendarTools)
            .call()
            .entity(AssistantReply.class);  // 注意这里：不是 .content()，是 .entity()
}
```

`.entity(AssistantReply.class)` 替代 `.content()`。Spring AI 会自动在请求里加上格式要求（"请按这个 JSON 结构返回"），然后把模型的 JSON 响应解析成你的 record。

你可以直接 `if (reply.needsFollowUp())` 做业务判断了。不用再写正则去解析"这段话是不是需要跟进"。

**同样的助手，给聊天窗口返回散文，给后端系统返回结构化对象。** 一套代码，两种输出。

* * *

## 第七步：把你的工具暴露给全世界（MCP）

MCP（Model Context Protocol）是最近很火的一个协议。简单说：**它让你的 Spring 应用变成一个"工具商店"，任何支持 MCP 的 AI 客户端都能来调用你的工具。**

你已经写了 `CalendarTools`，对吧？目前只有你自己的助手能调用它。如果加上 MCP Server，那 Claude Desktop、Cursor、其他 AI 应用都能直接调用你的日程查询——不用走你的 REST API。

加依赖：

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

配置：

```yaml
spring:
  ai:
    mcp:
      server:
        name: my-calendar-mcp
        version: 1.0.0
```

注册 Bean：

```java
@Configuration
public class McpConfig {
    @Bean
    public ToolCallbackProvider toolCallbackProvider(CalendarTools calendarTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(calendarTools)
                .build();
    }
}
```

**就这么几行代码，你之前写的 `@Tool` 方法现在同时服务两个调用方：**

*   你自己的助手通过 `.tools(...)` 调用
*   外部 AI 客户端通过 MCP 协议调用

同一个方法，不用写两遍。这就是 MCP 的意义——**让工具可复用、可共享、可被发现。**

如果你只用一个词来记住这篇文章，我希望是 MCP。这个协议正在成为 AI 应用之间的"USB 接口"。

* * *

写到这里，代码部分结束了。下面聊聊我的想法。

### Spring AI 适合什么人？

**适合 Java 程序员想做 AI 应用但不想换技术栈的。** 这话听着像废话，但确实就是这样。

如果你已经写 Spring Boot 了，你的项目里加一个 Spring AI 的依赖就能接入大模型。不用学 Python，不用搭一套新的基础设施，不用在 Java 应用里套一层 HTTP 去调 Python 服务。

### Spring AI 目前的问题

1.  **Spring AI 的 API 还在快速演进中。** 2.0 GA 之后大方向已经稳定，但 2.1 的 Milestone 已经在推了，部分高级用法（自定义 Advisor、Agent 支持）在后续版本可能会有变化。一定要看 官方文档 对应你用的版本。
2.  **文档还不够完善。** 有些高级用法（比如多个 Advisor 的优先级、自定义 Advisor 的写法）文档里语焉不详，得去看源码或者翻 GitHub Issue。
3.  **生态还在建设中。** Python 圈的 LangChain 有大量社区贡献的集成，Spring AI 目前官方支持的 provider 和工具已经够用了，但社区生态还没有那么丰富。

### 什么时候该用，什么时候别用

**该用的场景：** 你的主项目是 Spring Boot，想给应用加 AI 能力（智能客服、文档问答、数据分析助手），团队没有 Python 经验。

**别用的场景：** 你只是跑个脚本实验一下，Python + LangChain 的生态目前确实更成熟，社区资源更多。或者你的团队已经有一套 Python AI 基础设施了，没必要为了"统一语言"硬切 Java。

* * *

## 回顾一下本文说了什么

从一个 `ChatClient` 开始，一个 Advisor 一个 Advisor 地往上叠：

| 步骤 | 加了什么 | 解决了什么 |
| --- | --- | --- |
| 1 | `ChatClient` | 能跟模型说话 |
| 2 | System Prompt | 有人设，不乱说话 |
| 3 | `MessageChatMemoryAdvisor` | 有记忆，不会每次都是新对话 |
| 4 | `QuestionAnswerAdvisor` + PgVector | 能读你的笔记（RAG） |
| 5 | `@Tool` 方法 | 能查实时数据（日程、天气…） |
| 6 | `.entity()` | 返回结构化 Java 对象 |
| 7 | MCP Server | 把工具暴露给其他 AI 客户端 |

七步，从一句对话到一个完整的私人助手。每一步都是几行代码的事。
