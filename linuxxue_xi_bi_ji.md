
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









