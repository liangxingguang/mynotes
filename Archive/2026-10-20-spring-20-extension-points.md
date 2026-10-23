---
id: 2026-10-20-spring-20-extension-points
title: Spring 留了 20 个扩展点，你能按顺序说出几个？
source: 微信公众号
source_url: https://mp.weixin.qq.com/s/50HiCXoigRgyugQLAfmzHA
source_type: link
platform: 微信
created: 2026-10-20
category: 技术
tags: [Java, spring, 工程实践]
asset_ref: Assets/2026/10/spring-20-extension-points.md
wiki_status: ingested
---

# Spring 20 个扩展点：挂在容器启动时间轴上一次理清

> Spring 扩展点考的不是"有哪些"而是"什么时候被调"——把 20 个扩展点挂到五段时间轴：定义期（改图纸，①~⑧）、实例化期（造零件，⑨~⑭）、初始化期（组装，⑮~⑱）、就绪期（通电，⑲~⑳）、销毁期。三条记忆主线：图纸/零件/通电（BFPP 改 BeanDefinition、BPP 改实例、事件管就绪）、越业务越靠前（@PostConstruct→afterPropertiesSet→init-method）、代理是分水岭（postProcessAfterInitialization 生成 AOP 代理，this 调用失效皆源于此）。附 4 个顺序错位翻车场景与 20 问速答。

## 核心要点

- **定义期关键**：`BeanDefinitionRegistryPostProcessor` 加图纸（MyBatis Mapper 扫描）先于 `BeanFactoryPostProcessor` 改图纸（@Value 占位符解析在此）；`DeferredImportSelector` 延迟处理是 `@ConditionalOnMissingBean` 让位机制的基础
- **实例化期关键**：⑨ 可"截胡"短路全流程；⑪ 收集注入点缓存、⑬ `postProcessProperties` 才是 `@Autowired` 真正生效处——所以构造器里拿不到注入字段、@PostConstruct 里可以
- **Aware 顺序**：BeanName→ClassLoader→BeanFactory→Environment→ApplicationContext，"由近及远"
- **初始化三方法**：@PostConstruct → afterPropertiesSet → init-method（越业务越靠前）；@PostConstruct 由 CommonAnnotationBeanPostProcessor 在 ⑮ 触发
- **代理分水岭**：AOP 代理在 ⑱ postProcessAfterInitialization 生成，容器存代理——@Transactional/@Async/@Cacheable 的 this 调用失效共同根因
- **预热选型**：一律用 `ApplicationReadyEvent`，ContextRefreshedEvent 触发时内嵌 Web 端口还没监听
- **四大翻车**：BPP 注入普通 Bean→NPE（时序死结）；BPP 里做事务→代理未生成不生效；BFPP 里 getBean→过早实例化基于半成品图纸；ContextRefreshedEvent 预热→端口未监听失败

## 正文

全文（含时序总图、逐点详解、20 问速答、冲刺清单）见 [[Assets/2026/10/spring-20-extension-points]]。

## 来源

[Spring 留了 20 个扩展点，你能按顺序说出几个？](https://mp.weixin.qq.com/s/50HiCXoigRgyugQLAfmzHA)

## 附件

- [[Assets/2026/10/spring-20-extension-points]]
