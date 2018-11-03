
# linux学习笔记


---


## ubuntu系统主要目录结构  
/ 根目录  
/boot 启动文件。所有与系统启动相关的文件都保存在这个目录  
/boo/grub/Grup 引导器相关的文件  
/dev/ 设备相关信息保存目录  
/proc/ 内核与进程镜像  
/mnt/ 临时挂载目录。例如可以windows盘符挂载到这个目录下面  
/media/ 挂载媒体设备  
/root root用户的$HOME目录  
/home 普通用户的$HOME目录.例如：k用户目录为/home/k/  
/bin 系统可执行文件,例如一些二进制文件和脚本文件  
/sbin/管理员系统程序.其中s就是super的意思  
/lib 系统程序库文件  
/etc 系统程序和大部分应用程序的全局配置文件  
/etc/init.d/ SystemV风格的启动脚本  
/etc/rcX.d/ 启动脚本的链接,定义运行级别  
/etc/network/ 网络配置文件  
/etc/x11/ 图形界面配置文件  

/usr/bin/ 应用程序  
/usr/sbin/ 管理员应用程序  
/usr/bin 应用程序库文件  
/usr/share 应用程序资源文件  
/usr/src 应用程序源代码    
/usr/local/soft/　用户程序   
/usr/X11R6/ 图像界面系统    

/var 动态数据 
/temp/ 临时文件    
/lostfound/磁盘修复文件   


## 设置去掉linux在终端中显示当前目录的绝对路径
在默认情况下，在linux终端中是显示目录的绝对路径，当目录太深的时候会导致显示不好看.那么可以通过设置PS1全局变量的值来自定义显示方式。
#### PS1格式解析:
> \u 显示当前用户帐号  
> \h 显示当前主机名称  
> \W 只显示当前路径最后一个目录  
> \w 显示当前绝对路径(当前用户目录会以~代替)  
> $PWD显示当前全路径  
> \$ 显示命令行'$'或者'#'符号  
例子如下:  
PS1='[\u@\h \W]\$'  
可以通过设置~/.bashrc或者/etc/profile文件中的PS1来改变终端的显示方式



##设置ubuntu开机自动挂载window的盘符  


在装有ubuntu和windows双系统的机器上面，ubuntu在系统启动的时候默认是没有挂载windows的盘符的，例如C盘。在图形界面的可以手动选择加载的
默认是挂载在/media/当前用户名的目录下面，而且挂载的目录默认是该分区的UUID，这个给我们在命令行选择目录带来很多不便。为此，我们可以手动
设置这些盘符的加载目录，并且在系统启动的时候就进行挂载，省得每次要手动的挂载。具体的步骤如下：
  * 在要挂载的目录下面建立对应的目录。如建立/media/C目录，就是将windows下面的c盘挂载到/media/C这个目录下面，这样我们就可以用cd /media/C
  来访问windows C 盘下面的内容了。
  * 运行sudo blkid 来查看磁盘类型。一般linux分区为ext4,windows分区为ntfs.所以找出类型为ntfs对应的uuid,要是不知道哪个uuid对应哪个盘符。
    可以先在图形界面中手动挂载对应的盘符，然后到/media/用户/ 这个目录下面去看对应的目录名称。默认windows的盘符挂载到ubuntu的目录下面都是以
    uuid 作为挂载目录的名称.记录好对应的uuid和windows下面盘符名称的对应关系。
  * 修改配置文件。打开/etc/fstab这个文件文件。配置文件包含一下几项：   
    <file system> <mount point> <type> <options> <dump> <pass>    
    * <file system> 分区定位, 可以给盘符号，UUID或者LABEL
    * <mount point> 具体挂载点的位置,如 /media/C
    * <type> 挂载磁盘类型,linux分区一般为ext4,windows 一般为ntfs
    * <options> 挂载参数, 一般为defaults
    * <dump> 磁盘备份 默认为0, 不备份
    * <pass> 磁盘检查， 默认为0, 不检查
    然后在配置文件后面加上对应的配置项。最好是copy现有的配置来修改。
  * 保存配置之后，执行sudo mount -a.这个命令会将配置文件中的所有项都加载。如果有错，则根据错误信息来修改就行了  
  


  
##解决 “无法获得锁 /var/lib/dpkg/lock - open”问题  


在运行命令 sudo apt upgrade 进行系统更新的时候，会经常遇到“无法获得锁 /var/lib/dpkg/lock - open”的问题，这个是由于有另外进程在运行更新
操作或者上次的更新操作没有成功，导致锁没有被释放。解决的办法就是将对应的锁记录文件删掉。命令如下:  
* sudo rm /var/cache/apt/archives/lock  
* sudo rm /var/lib/dpkg/lock  






