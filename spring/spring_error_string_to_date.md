## 解决：Failed to convert value of type 'java.lang.String' to required type 'java.util.Date' 问题

今天在项目开发的时候，新增一个接口测试有数据post的时候报404错误，没有进入对应的controller方法，如果没有带有数据来post，则可以进入对应的controller方法。刚开始出错时还以为自己接口哪里配置有问题，检查了一轮，没有发现有什么错误。控制台也没有抛出明显的异常报错信息，这个情况下，只能去debug代码了。最后发现，在进入对应的controller方法之前，报了如下的错误：

> Failed to convert value of type 'java.lang.String' to required type 'java.util.Date'

看了异常信息，可以知道是接收前台参数的时候转换出错。原来在前台有个字段是日期类型，格式为：yyyy-mm-dd HH:mm:ss。在bean对象定义中，将其定义为Date类型。在SpringMVC中，bean中定义了Date，double等类型，如果没有做任何处理的话，日期以及double都无法绑定。所以需要自己进行类型绑定。在进行类型绑定时，有三种方案。

#### 局部绑定

在对应的controller类通过@InitBinder注解方法来自定义绑定对应数据类型的格式。例如：

```java
@Controller
class Test {
    @RequestMapping(value="user/setBirthday")
	public String index(String username,Date birthday) {
        
    }
    
    //只需要加上下面这段即可，注意不能忘记注解
	@InitBinder
	public void initBinder(WebDataBinder binder,WebRequest request) {
		//日期格式
		DateFormat dateFormat=new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        //CustomDateEditor为自定义日期编辑器
		binder.registerCustomEditor(Date.class, new CustomDateEditor(dateFormat,true));
	}

}
```

这样就可以针对当前controller类对date类型的数据进行处理了。





#### 全局绑定

创建一个类，这个类需要实现接口WebBindingInitializer，然后再将这个类注入到AnnotationMethodHandlerAdapter bean中去。例如：

```java
public class TestDateBinder implements WebBindingInitializer{
 
	@Override
	public void initBinder(WebDataBinder binder, WebRequest request) {
		DateFormat dateFormat=new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		binder.registerCustomEditor(Date.class, new CustomDateEditor(dateFormat, true));
	}
}

```

注入到对应的AnnotationMethodHandlerAdapter 中去。可以在springmvc配置文件配置

```xml
<bean class="org.springframework.web.servlet.mvc.annotation.AnnotationMethodHandlerAdapter">
		<property name="webBindingInitializer">
			<bean class="com.test.TestDateBinder"/>
		</property>
	</bean>

```



#### 在Bean中指定对应类型的格式

可以在Java bean 中之间指定对应字段的类型，例如：

```java
class TestBean {
    
    @DateTimeFormat(pattern='yyyy-MM-dd HH:MM:ss')
    private Date birthDate;
}
```

