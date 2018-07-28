# IDEA 常用Tips记录

---

##内存优化

---
>/iead安装目录/bin/*.vmoptions 文件  
-Xms64m 
-Xmx256m  
-XX:MaxPermSize=92m  
-ea  
-server  
-Dsun.awt.keepWorkingSetOnMinimize=true  


##快捷键整理
### 1.查询快捷键
> CTRL+N           查找类  
  CTRL+SHIFT+N     查找文件  
  CTRL+SHIFT+ALT+N 查找类中的方法或变量  
  CIRL+B           找变量的来源  
  CTRL+ALT+B       找所有的子类  
  CTRL+SHIFT+B     找变量的类  
  CTRL+G           定位行  
  CTRL+F           在当前窗口查找文本  
  CTRL+SHIFT+F     在指定窗口查找文本  
  CTRL+R           在当前窗口替换文本  
  CTRL+SHIFT+R     在指定窗口替换文本  
  ALT+SHIFT+C      查找修改的文件  
  CTRL+E           最近打开的文件  
  F3               向下查找关键字出现位置  
  SHIFT+F3         向上一个关键字出现位置  
  F4               查找变量来源  
  CTRL+ALT+F7      选中的字符查找工程出现的地方  
  CTRL+SHIFT+O     弹出显示查找内容  

### 2.自动代码
>  ALT+ENTER        导入包,自动修正  
   CTRL+ALT+L       格式化代码  
   CTRL+ALT+I       自动缩进  
   CTRL+ALT+O       优化导入的类和包  
   ALT+INSERT       生成代码(如GET,SET方法,构造函数等)  
   CTRL+E           最近更改的代码  
   ALT+SHIFT+C      最近更改的代码  
   CTRL+SHIFT+SPACE 自动补全代码  
   CTRL+空格        代码提示  
   CTRL+ALT+SPACE   类名或接口名提示  
   CTRL+P           方法参数提示  
   CTRL+J           自动代码  
   CTRL+ALT+T       把选中的代码放在 TRY{} IF{} ELSE{} 里 
   
   
### 3.复制快捷方式
>  F5            拷贝文件快捷方式  
   CTRL+D        复制行  
   CTRL+X        剪切,删除行  
   CTRL+SHIFT+V  可以复制多个文本 


### 4.高亮
>   * CTRL+F         选中的文字,高亮显示 上下跳到下一个或者上一个  
    * F2或SHIFT+F2   高亮错误或警告快速定位  
    * CTRL+SHIFT+F7  高亮显示多个关键字.  



### 5.其他快捷方式
>   CIRL+U            大小写切换  
    CTRL+Z            倒退  
    CTRL+SHIFT+Z      向前  
    CTRL+ALT+F12      资源管理器打开文件夹  
    ALT+F1            查找文件所在目录位置  
    SHIFT+ALT+INSERT  竖编辑模式  
    CTRL+/            注释//   
    CTRL+SHIFT+/      注释/*...*/  
    CTRL+W            选中代码，连续按会 有其他效果  
    CTRL+B            快速打开光标处的类或方法  
    ALT+ ←/→          切换代码视图  
    CTRL+ALT ←/→      返回上次编辑的位置  
    ALT+ ↑/↓          在方法间快速移动定位  
    SHIFT+F6          重构-重命名  
    CTRL+H            显示类结构图  
    CTRL+Q            显示注释文档  
    ALT+1             快速打开或隐藏工程面板  
    CTRL+SHIFT+UP/DOWN 代码 向上/下移动。  
    CTRL+UP/DOWN      光标跳转到第一行或最后一行下  
    ESC               光标返回编辑框  
    SHIFT+ESC         光标返回编辑框,关闭无用的窗口  
    F1                帮助千万别按,很卡!  
    CTRL+F4           非常重要下班都用  

---

## 2.重要的设置
>   不编译某个MODULES的方法，但在视图上还是有显示  
    SETTINGS -> COMPILER -> EXCLUDES ->  
    不编译某个MODULES，并且不显示在视图上  
    MODULES SETTINGS -> (选择你的MODULE) -> SOURCES -> EXCLUDED -> 整个工程文件夹  


## 3.IDEA编码设置3步曲
>   FILE -> SETTINGS -> FILE ENCODINGS -> IDE ENCODING  
    FILE -> SETTINGS -> FILE ENCODINGS -> DEFAULT ENCODING FOR PROPERTIES FILES  
    FILE -> SETTINGS -> COMPILER -> JAVA COMPILER -> ADDITIONAL COMMAND LINE PARAMETERS加上参数 -ENCODING UTF-8 编译GROOVY文件的时候如果不加，STRING S = "中文"; 这样的GROOVY文件编译不过去.


## 4.编译中添加其他类型文件比如 *.TXT *.INI
>   FILE -> SETTINGS -> RESOURCE PATTERNS  
    改变编辑文本字体大小  
    FILE -> SETTINGS -> EDITOR COLORS & FONTS -> FONT -> SIZE  


## 5.修改智能提示快捷键
> FILE -> SETTINGS -> KEYMAP -> MAIN MENU -> CODE -> COMPLETE CODE -> BASIC


## 6.显示文件过滤
>   FILE -> SETTINGS -> FILE TYPES -> IGNORE FILES...  
    下边是我过滤的类型,区分大小写的  
    CVS;SCCS;RCS;rcs;.DS_Store;.svn;.pyc;.pyo;*.pyc;*.pyo;.git;*.hprof;_svn;.sbas;.IJI.*;vssver.scc;vssver2.scc;.*;*.iml;*.ipr;*.iws;*.ids


## 7.在PROJECT窗口中快速定位,编辑窗口中的文件 
>在编辑的所选文件按ALT+F1, 然后选择PROJECT VIEW 


## 8.使用技巧

>   * 写代码时用 Alt-Insert （ Code|Generate… ）可以创建类里面任何字段的 getter 与 setter 方法。  
>   * 右键点击断点标记（在文本的左边栏里）激活速查菜单，你可以快速设置 enable/disable 断点或者条件它的属性。
>   * CodeCompletion （代码完成）属性里的一个特殊的变量是，激活 Ctrl-Alt-Space 可以完成在或不在当前文件里的类名。如果类没有引入则 import 标志会自动创建。  
>   * 使用 Ctrl-Shift-V 快捷键可以将最近使用的剪贴板内容选择插入到文本。使用时系统会弹出一个含有剪贴内容的对话框，从中你可以选择你要粘贴的部分。   
>   * 利用 CodeCompletion （代码完成）属性可以快速地在代码中完成各种不同地语句，方法是先键入一个类名地前几个字母然后再用 Ctrl-Space 完成全称。如果有多个选项，它们会列在速查列表里。   
>   * 用 Ctrl-/ 与 Ctrl-Shift-/ 来注释 / 反注释代码行与代码块。  
>   * -/ 用单行注释标记（“ //… ”）来注释 / 反注释当前行或者选择地代码块。而 Ctrl-Shift-/ 则可以用块注释标记（“ /*…*/ ”）把所选块包围起来。要反注释一个代码块就在块中任何一个地方按 Ctrl-Shift-/ 即可。
>   * 按 Alt-Q （ View|Context Info ）可以不需要移动代码就能查看当前方法地声明。连续按两次会显示当前所编辑的类名。 
>   * 使用 Refactor|Copy Class… 可以创建一个所选择的类的“副本”。这一点很有用，比如，在你想要创建一个大部分内容都和已存在类相同的类时。 
>   * 在编辑器里 Ctrl-D 可以复制选择的块或者没有所选块是的当前行。
>   * Ctrl-W （选择字）在编辑器里的功能是先选择脱字符处的单词，然后选择源代码的扩展区域。举例来说，先选择一个方法名，然后是调用这个方法的表达式，然后是整个语句，然后包容块，等等。
>   * 如果你不想让指示事件细节的“亮球”图标在编辑器上显示，通过按 Alt-Enter 组合键打开所有事件列表然后用鼠标点击它就可以把这个事件文本附件的亮球置成非活动状态。这样以后就不会有指示特殊事件的亮球出现了，但是你仍然可以用 Alt-Enter 快捷键使用它。
>   * 在使用 CodeCompletion 时，可以用逗点（ . ）字符，逗号（，）分号（；），空格和其它字符输入弹出列表里的当前高亮部分。选择的名字会随着输入的字符自动输入到编辑器里。 
>   * 在任何工具窗口里使用 Escape 键都可以把焦点移到编辑器上。 Shift-Escape 不仅可以把焦点移到编辑器上而且还可以隐藏当前（或最后活动的）工具窗口。 F12 键把焦点从编辑器移到最近使用的工具窗口。 
>   * 在调试程序时查看任何表达式值的一个容易的方法就是在编辑器中选择文本（可以按几次 Ctrl-W 组合键更有效地执行这个操作）然后按 Alt-F8 。 
>   * 要打开编辑器脱字符处使用的类或者方法 Java 文档的浏览器，就按 Shift-F1 （右键菜单的 External JavaDoc ）。 
要使用这个功能须要把加入浏览器的路径，在“ General ”选项中设置（ Options | IDE Settings ），另外还要把创建的 Java 文档加入到工程中（ File | Project Properties ）。 
>   * 用 Ctrl-F12 （ View | File Structure Popup ）键你可以在当前编辑的文件中快速导航。 
这时它会显示当前类的成员列表。选中一个要导航的元素然后按 Enter 键或 F4 键。要轻松地定位到列表中的一个条目，只需键入它的名字即可。 
>   * 在代码中把光标置于标记符或者它的检查点上再按 Alt-F7 （右键菜单中的 Find Usages… ）会很快地查找到在整个工程中使用地某一个类、方法或者变量的位置。
>   * 按 Ctrl-N （ Go to | Class… ）再键入类的名字可以快速地在编辑器里打开任何一个类。从显示出来的下拉列表里选择类。 
同样的方法你可以通过使用 Ctrl-Shift-N （ Go to | File… ）打开工程中的非 Java 文件。
>   * 要导航代码中一些地方使用到的类、方法或者变量的声明，把光标放在查看项上再按 Ctrl-B 即可。也可以通过按 Ctrl 键的同时在查看点上单击鼠标键调转到声明处。 
>   * 把光标放到查看点上再按 Ctrl-Alt-B 可以导航到一个抽象方法的实现代码。
>   * 要看一个所选择的类的继承层次，按 Ctrl-H （ Browse Type Hierarchy ）即可。也可以激活编辑器中的继承关系视图查看当前编辑类的继承关系。22 、使用 Ctrl-Shift-F7 （ Search | Highlight Usages in File ）可以快速高亮显示当前文件中某一变量的使用地方。按 Escape 清除高亮显示。 
>   * 用 Alt-F3 （ Search | Incremental Search ）在编辑器中实现快速查查找功能。 
在“ Search for: ”提示工具里输入字符，使用箭头键朝前和朝后搜索。按 Escape 退出。
>   * 按 Ctrl-J 组合键来执行一些你记不起来的 Live Template 缩写。比如，键“ it ”然后按 Ctrl-J 看看有什么发生。
>   *  Introduce Variable 整合帮助你简化代码中复杂的声明。举个例子，在下面的代码片断里，在代码中选择一个表达式：然后按 Ctrl-Alt-V 。
>   *  Ctrl-Shift-J 快捷键把两行合成一行并把不必要的空格去掉以匹配你的代码格式。
>   *  Ctrl-Shift-Backspace （ Go to | Last Edit Location ）让你调转到代码中所做改变的最后一个地方。 
多按几次 Ctrl-Shift-Backspace 查看更深的修改历史。 
>   * 用 Tools | Reformat Code… 根据你的代码样式参考（查看 Options | IDE Setting | Code Style ）格式化代码。
使用 Tools | Optimize Imports… 可以根据设置（查看 Options | IDE Setting | Code Style | Imports ）自动“优化” imports （清除无用的 imports 等）。
>   * 使用 IDEA 的 Live Templates | Live Templates 让你在眨眼间创建许多典型代码。比如，在一个方法里键入 
再按 Tab 键看有什么事情发生了。 
用 Tab 键在不同的模板域内移动。查看 Options | Live Templates 获取更多的细节。
>   * 要查看一个文件中修改的本地历史，激活右键菜单里的 Local VCS | Show History… 。也许你可以导航不同的文件版本，看看它们的不同之处再回滚到以前的任何一个版本吧。 
使用同样的右键菜单条目还可以看到一个目录里修改的历史。有了这个特性你就不会丢失任何代码了。
>   * 如果要了解主菜单里每一个条目的用途，把鼠标指针移到菜单条目上再应用程序框架的底部的状态栏里就会显示它们的一些简短描述，也许会对你有帮助。 
>   * 要在编辑器里显示方法间的分隔线，打开 Options | IDE Settings | Editor ，选中“ Show method separators ”检查盒（ checkbox ）。 
>   * 用 Alt-Up 和 Alt-Down 键可以在编辑器里不同的方法之间快速移动。 
>   * 用 F2/Shift-F2 键在高亮显示的语法错误间跳转。 
用 Ctrl-Alt-Down/Ctrl-Alt-Up 快捷键则可以在编译器错误信息或者查找操作结果间跳转。
>   * 通过按 Ctrl-O （ Code | Override Methods… ）可以很容易地重载基本类地方法。 
要完成当前类 implements 的（或者抽象基本类的）接口的方法，就使用 Ctrl-I （ Code | Implement Methods… ）。 
>   * 如果光标置于一个方法调用的括号间，按 Ctrl-P 会显示一个可用参数的列表。
>   * 要快速查看编辑器脱字符处使用的类或方法的 Java 文档，按 Ctrl-Q （在弹出菜单的 Show Quick JavaDoc 里）即可。 
>   * 像 Ctrl-Q （ Show Quick JavaDoc 显示简洁 Java 文档）， Ctrl-P （ Show Parameter Info 显示参数信息）， Ctrl-B （ Go to Declaration 跳转到声明）， Shift-F1 （ External JavaDoc 外部 Java 文档）以及其它一些快捷键不仅可以在编辑器里使用，也可以应用在代码完成右键列表里。 
>   *  Ctrl-E （ View | Recent Files ）弹出最近访问的文件右键列表。选中文件按 Enter 键打开。 
>   * 在 IDEA 中可以很容易地对你的类，方法以及变量进行重命名并在所有使用到它们的地方自动更正。 
试一下，把编辑器脱字符置于任何一个变量名字上然后按 Shift-F6 （ Refactor | Rename… ）。在对话框里键入要显示地新名字再按 Enter 。你会浏览到使用这个变量地所有地方然后按“ Do Refactor ”按钮结束重命名操作。
>   * 要在任何视图（ Project View 工程视图， Structure View 结构视图或者其它视图）里快速 
选择当前编辑地部分（类，文件，方法或者字段），按 Alt-F1 （ View | Select in… ）。 
>   * 在“ new ”字符后实例化一个已知类型对象时也许你会用到 SmartType 代码完成这个特性。比如，键入 
再按 Ctrl-Shift-Space ：
>   * 通过使用 SmartType 代码完成，在 IDEA 中创建接口的整个匿名 implementation 也是非常容易的，比如，对于一些 listener （监听器），可以键入 
Component component; 
component.addMouseListener( 
  new <caret is here>   
); 
然后再按 Ctrl-Shift-Space 看看有什么发生了。 
>   * 在你需要设置一个已知类型的表达式的值时用 SmartType 代码完成也很有帮助。比如，键入 
String s = ( <caret is here>   
再按 Ctrl-Shift-Space 看看会有什么出现。 
>   * 在所有视图里都提供了速查功能：在树里只需键入字符就可以快速定位到一个条目。 
>   * 当你想用代码片断捕捉异常时，在编辑器里选中这个片断，按 Ctrl-Alt-T （ Code | Surround with… ）然后选择“ try/catch ”。它会自动产生代码片断中抛出的所有异常的捕捉块。在 Options | File Templates | Code tab 中你还可以自己定制产生捕捉块的模板。 用列表中的其它项可以包围别的一些结构。 
>   * 在使用代码完成时，用 Tab 键可以输入弹出列表里的高亮显示部分。 不像用 Enter 键接受输入，这个选中的名字会覆盖掉脱字符右边名字的其它部分。这一点在用一个方法或者变量名替换另一个时特别有用。 
>   * 在声明一个变量时代码完成特性会给你显示一个建议名。比如，开始键入“ private FileOutputStream ”然后按 Ctrl-Space 
